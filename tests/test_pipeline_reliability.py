"""Focused regression tests for provider selection, search caching, and fallback."""

import json
import os
import tempfile
import time
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from agent import main
from agent.agents.context_agent import create_context_agent
from agent.agents.planner_agent import create_planner_agent
from agent.agents.search_agent import create_search_agent
from agent.fallbacks import direct_groq
from agent.fallbacks.mock_builder import build_mock_plan
from agent.tools import tavily_tool

ROOT = Path(__file__).resolve().parents[1]


def _slow_operation():
    time.sleep(10)


def _inputs():
    return (
        json.loads((ROOT / "mock-data" / "profile.json").read_text(encoding="utf-8")),
        json.loads((ROOT / "mock-data" / "trip-request.json").read_text(encoding="utf-8")),
    )


class PipelineReliabilityTests(unittest.TestCase):
    def test_all_crewai_agents_receive_gemini_llm(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key", "GEMINI_MODEL": "gemini-3.8-flash"}):
            for factory in (create_context_agent, create_search_agent, create_planner_agent):
                llm = factory().llm
                # CrewAI versions differ: some keep the litellm "gemini/" prefix, some strip it.
                self.assertEqual(llm.model.removeprefix("gemini/"), "gemini-3.8-flash")
                self.assertIn("gemini", f"{type(llm).__module__} {llm.model}")

    def test_crewai_pipeline_remains_sequential(self):
        profile, trip = _inputs()
        expected = build_mock_plan(profile, trip).model_dump(mode="json", by_alias=True)
        captured = {}

        class FakeCrew:
            def __init__(self, **kwargs):
                captured.update(kwargs)

            def kickoff(self):
                return SimpleNamespace(json_dict=expected, raw="")

        replacements = {
            "Crew": FakeCrew,
            "create_context_agent": lambda: "context",
            "create_search_agent": lambda: "search",
            "create_planner_agent": lambda: "planner",
            "create_context_task": lambda *args: "context_task",
            "create_search_task": lambda *args: "search_task",
            "create_planner_task": lambda *args: "planner_task",
            "reset_search_counter": lambda: None,
        }
        with patch.multiple(main, **replacements):
            result = main.run_crewai_pipeline(profile, trip)
        self.assertEqual(result.total_budget, trip["total_budget"])
        self.assertIs(captured["process"], main.Process.sequential)
        self.assertEqual(captured["tasks"], ["context_task", "search_task", "planner_task"])

    def test_cache_hit_preserves_sources_and_does_not_consume_allowance(self):
        calls = []

        class FakeTavily:
            def __init__(self, **kwargs):
                pass

            def search(self, **kwargs):
                calls.append(kwargs)
                return {"results": [
                    {"title": "Museum", "url": "https://example.test/museum",
                     "content": "Useful details " * 150, "published_date": "2026-10-01"},
                    {"title": "Duplicate", "url": "https://example.test/museum/",
                     "content": "Duplicate content"},
                ]}

        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {"TAVILY_API_KEY": "test-key"}), \
                patch.object(tavily_tool, "CACHE_DIR", Path(directory)), \
                patch.object(tavily_tool, "_search_counter", 0), \
                patch.object(tavily_tool, "TavilyClient", FakeTavily):
            first = json.loads(tavily_tool.execute_tavily_search("  Cairo   museums "))
            second = json.loads(tavily_tool.execute_tavily_search("cairo museums"))
            self.assertEqual(first["results"][0]["url"], "https://example.test/museum")
            self.assertEqual(len(first["results"]), 1)
            self.assertEqual(len(first["results"][0]["content"]), tavily_tool.MAX_CONTENT_CHARS)
            self.assertTrue(second["cached"])
            self.assertEqual(len(calls), 1)
            self.assertEqual(tavily_tool._search_counter, 1)

    def test_expired_cache_is_not_returned_as_fresh(self):
        class FakeTavily:
            def __init__(self, **kwargs):
                pass

            def search(self, **kwargs):
                return {"results": [{"title": "Fresh", "url": "https://example.test/fresh", "content": "Fresh evidence"}]}

        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {"TAVILY_API_KEY": "test-key"}), \
                patch.object(tavily_tool, "CACHE_DIR", Path(directory)), \
                patch.object(tavily_tool, "_search_counter", 0), \
                patch.object(tavily_tool, "TavilyClient", FakeTavily):
            query = "old search"
            old = datetime.now(timezone.utc) - timedelta(hours=tavily_tool.CACHE_TTL_HOURS + 1)
            tavily_tool._cache_path(query).write_text(json.dumps({
                "status": "ok", "retrieved_at": old.isoformat(), "results": [{"title": "Stale"}],
            }), encoding="utf-8")
            result = json.loads(tavily_tool.execute_tavily_search(query))
            self.assertEqual(result["results"][0]["title"], "Fresh")
            self.assertFalse(result["cached"])

    def test_search_api_failure_is_explicit(self):
        class BrokenTavily:
            def __init__(self, **kwargs):
                pass

            def search(self, **kwargs):
                raise TimeoutError("network timed out")

        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {"TAVILY_API_KEY": "test-key"}), \
                patch.object(tavily_tool, "CACHE_DIR", Path(directory)), \
                patch.object(tavily_tool, "_search_counter", 0), \
                patch.object(tavily_tool, "TavilyClient", BrokenTavily):
            result = json.loads(tavily_tool.execute_tavily_search("network test"))
            self.assertEqual(result["status"], "error")
            self.assertEqual(result["error_type"], "timeout")

    def test_quota_failure_is_explicit(self):
        class QuotaTavily:
            def __init__(self, **kwargs):
                pass

            def search(self, **kwargs):
                raise RuntimeError("HTTP 429 quota limit")

        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {"TAVILY_API_KEY": "test-key"}), \
                patch.object(tavily_tool, "CACHE_DIR", Path(directory)), \
                patch.object(tavily_tool, "_search_counter", 0), \
                patch.object(tavily_tool, "TavilyClient", QuotaTavily):
            result = json.loads(tavily_tool.execute_tavily_search("quota test"))
            self.assertEqual(result["status"], "error")
            self.assertEqual(result["error_type"], "quota")

    def test_gemini_failure_transitions_to_groq_without_duplicate_gemini(self):
        profile, trip = _inputs()
        calls = []

        def fake_run(fn, *args, **kwargs):
            calls.append(fn)
            if fn is main.run_crewai_pipeline:
                raise RuntimeError("provider error")
            return build_mock_plan(*args)

        with patch.object(main, "CREWAI_AVAILABLE", True), patch.object(main, "_run_tier_with_timeout", fake_run):
            plan = main.generate_plan_from_dict(profile, trip)
        self.assertEqual(calls, [main.run_crewai_pipeline, direct_groq.run_direct_groq_fallback])
        self.assertEqual(plan.search_context, "groq_unverified")

    def test_malformed_json_and_schema_errors_transition_to_groq(self):
        profile, trip = _inputs()
        for marker, expected_reason in (("JSONDecodeError", "malformed_json"),
                                        ("ValidationError", "schema_validation")):
            with self.subTest(marker=marker):
                calls = []

                def fake_run(fn, *args, **kwargs):
                    calls.append(fn)
                    if fn is main.run_crewai_pipeline:
                        raise RuntimeError(marker)
                    return build_mock_plan(*args)

                with patch.object(main, "CREWAI_AVAILABLE", True), \
                        patch.object(main, "_run_tier_with_timeout", fake_run), \
                        self.assertLogs(main.logger, level="WARNING") as logs:
                    plan = main.generate_plan_from_dict(profile, trip)
                self.assertEqual(plan.search_context, "groq_unverified")
                self.assertEqual(calls, [main.run_crewai_pipeline, direct_groq.run_direct_groq_fallback])
                self.assertTrue(any(expected_reason in line for line in logs.output))

    def test_mock_is_last_resort_and_marked_unverified(self):
        profile, trip = _inputs()

        def fail_provider(fn, *args, **kwargs):
            raise RuntimeError("provider unavailable")

        with patch.object(main, "CREWAI_AVAILABLE", True), patch.object(main, "_run_tier_with_timeout", fail_provider):
            plan = main.generate_plan_from_dict(profile, trip)
        self.assertEqual(plan.search_context, "mock_unverified")

    def test_timeout_terminates_worker_before_long_operation_finishes(self):
        started = time.monotonic()
        with self.assertRaisesRegex(TimeoutError, "worker process terminated"):
            main._run_tier_with_timeout(_slow_operation, timeout_s=1)
        self.assertLess(time.monotonic() - started, 5)


if __name__ == "__main__":
    unittest.main()
