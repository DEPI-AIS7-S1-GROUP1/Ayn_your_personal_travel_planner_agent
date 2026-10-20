"""Restaurant names in plans: one Tavily search per trip, shared by every tier."""

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from agent import main
from agent.fallbacks import direct_groq
from agent.fallbacks.mock_builder import build_mock_plan
from agent.tools import restaurant_search, tavily_tool
from agent.tools.restaurant_search import (
    build_query,
    restaurant_names,
    restaurant_rule_block,
    search_restaurants,
)

ROOT = Path(__file__).resolve().parents[1]

# Shortened from real Tavily results for "best restaurants in Dahab/Luxor Egypt halal".
SNIPPETS = [
    "#### King Chicken King Chicken is Dahab’s most popular Egyptian food place. Location: El Mashraba Street",
    "## 6. Al Sharkawy, Assalah Square opposite Ghazala supermarket A great local place for a quick lunch.",
    "### Cafe del Sur I think this is the hands-down best coffee in Dahab. ### Tim’s Munch [...] "
    "### Seaduction For a nice sit-down restaurant in Dahab,",
    "Halal Restaurants in Luxor · 1. El Tarboush. 4.9. 4.9 of 5 bubbles · 2. Metro Restaurant. 5.0. 5 of 5",
    "include: Al Sahaby Lane Restaurant | Sofra Restaurant & Cafè | Restaurant El-Kababgy Luxor | el Tarboush.",
    "6 Darwish Seafood – For amazing seafood, there is also Darwish Seafood.",
    "Tripadvisor ## Halal Restaurants in Dahab # Best Halal Restaurants in Dahab, South Sinai",
]


def _evidence(texts=SNIPPETS):
    return [{"title": f"Source {i}", "url": f"https://example.com/{i}", "content": t[:350], "full_content": t}
            for i, t in enumerate(texts)]


def _inputs(language="en"):
    profile = json.loads((ROOT / "mock-data" / "profile.json").read_text(encoding="utf-8"))
    trip = json.loads((ROOT / "mock-data" / "trip-request.json").read_text(encoding="utf-8"))
    trip["language"] = language
    return profile, trip


class RestaurantNameTests(unittest.TestCase):
    def test_names_are_read_from_common_page_layouts(self):
        names = restaurant_names(_evidence(), "Dahab")
        for expected in ("King Chicken", "Al Sharkawy", "Cafe del Sur", "Tim’s Munch", "Seaduction",
                         "El Tarboush", "Metro Restaurant", "Al Sahaby Lane Restaurant",
                         "Sofra Restaurant & Cafè", "Darwish Seafood"):
            self.assertIn(expected, names)

    def test_page_headings_are_not_names(self):
        names = [n.casefold() for n in restaurant_names(_evidence(), "Dahab")]
        for junk in ("halal restaurants", "tripadvisor", "best halal restaurants in dahab", "dahab"):
            self.assertNotIn(junk, names)
        self.assertEqual(len(names), len(set(names)))  # "el Tarboush" twice -> once

    def test_no_bars_for_a_halal_profile(self):
        names = ["King Chicken", "Yalla Bar Dahab", "Blue Beach Pub", "Al Sharkawy"]
        self.assertEqual(restaurant_search.suitable_names(names, {"dietary_limits": ["halal"]}),
                         ["King Chicken", "Al Sharkawy"])
        self.assertEqual(restaurant_search.suitable_names(names, {"dietary_limits": []}), names)

    def test_query_carries_city_and_dietary_limits_only(self):
        query = build_query({"destination": {"city": "Dahab"}},
                            {"dietary_limits": ["halal", "gluten-free"], "food_likes": ["seafood"]})
        self.assertEqual(query, "best restaurants in Dahab Egypt halal gluten free")


class RuleBlockTests(unittest.TestCase):
    def test_no_evidence_leaves_the_prompt_unchanged(self):
        self.assertEqual(restaurant_rule_block([], {"destination": {"city": "Dahab"}}), "")

    def test_block_lists_names_sources_and_the_rule(self):
        block = restaurant_rule_block(_evidence(), {"destination": {"city": "Dahab"}})
        self.assertIn("King Chicken", block)
        self.assertIn("[1] Source 0:", block)
        self.assertIn('every activity with category "food" MUST name one specific restaurant', block)
        self.assertIn("Never invent a restaurant name", block)
        # Only the short snippet goes into the prompt, not the whole page.
        long = _evidence(["x" * 2000])
        self.assertLess(len(restaurant_rule_block(long, {"destination": {"city": "Dahab"}})), 1500)


class SearchTests(unittest.TestCase):
    def _search(self, client, key="test-key"):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {"TAVILY_API_KEY": key}), \
                patch.object(tavily_tool, "CACHE_DIR", Path(directory)), \
                patch.object(tavily_tool, "_search_counter", tavily_tool.MAX_SEARCH_QUERIES), \
                patch.object(tavily_tool, "TavilyClient", client):
            evidence = search_restaurants({"destination": {"city": "Dahab"}}, {"dietary_limits": ["halal"]})
            return evidence, tavily_tool._search_counter

    def test_search_ignores_the_crewai_allowance_and_does_not_use_it(self):
        class FakeTavily:
            def __init__(self, **kwargs):
                pass

            def search(self, **kwargs):
                return {"results": [{"title": "Eat in Dahab", "url": "https://a.example", "content": SNIPPETS[0]}]}

        evidence, counter = self._search(FakeTavily)
        self.assertEqual(len(evidence), 1)
        self.assertIn("King Chicken", evidence[0]["full_content"])
        self.assertEqual(counter, tavily_tool.MAX_SEARCH_QUERIES)  # allowance already used up, untouched

    def test_failures_give_no_evidence_instead_of_an_error(self):
        class BrokenTavily:
            def __init__(self, **kwargs):
                pass

            def search(self, **kwargs):
                raise RuntimeError("429 quota exceeded")

        self.assertEqual(self._search(BrokenTavily)[0], [])
        self.assertEqual(self._search(BrokenTavily, key="")[0], [])  # no key configured


class TierTests(unittest.TestCase):
    def test_templates_name_a_restaurant_for_every_meal(self):
        for language, meal in (("en", "Lunch at "), ("ar", "غداء في ")):
            with self.subTest(language=language):
                profile, trip = _inputs(language)
                plan = build_mock_plan(profile, trip, ["King Chicken", "Al Sharkawy"])
                meals = [a.title for d in plan.itinerary for a in d.activities if a.category == "food"]
                self.assertTrue(meals)
                self.assertTrue(all("King Chicken" in t or "Al Sharkawy" in t for t in meals), meals)
                self.assertTrue(any(t.startswith(meal) for t in meals), meals)

    def test_templates_without_names_are_unchanged(self):
        profile, trip = _inputs()
        meals = [a.title for d in build_mock_plan(profile, trip).itinerary for a in d.activities
                 if a.category == "food"]
        self.assertTrue(all(t.endswith(f"in {trip['destination']['city']}") for t in meals), meals)

    def test_every_tier_receives_the_same_search_once(self):
        profile, trip = _inputs()
        evidence = _evidence()
        calls = []

        def fake_run(fn, *args, **kwargs):
            calls.append((fn, args[2]))
            raise RuntimeError("provider unavailable")

        # Keys set so no tier is skipped for a missing key; fake_run means nothing is called.
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key", "GROQ_API_KEY": "test-key"}), \
                patch.object(main, "CREWAI_AVAILABLE", True), patch.object(main, "_run_tier_with_timeout", fake_run), \
                patch.object(main, "search_restaurants", return_value=evidence) as search:
            plan = main.generate_plan_from_dict(profile, trip)
        search.assert_called_once()
        self.assertEqual([fn for fn, _ in calls], [main.run_crewai_pipeline, direct_groq.run_direct_groq_fallback])
        self.assertTrue(all(passed is evidence for _, passed in calls))
        # Tier 3 got the names: its meals are at real restaurants.
        meals = [a.title for d in plan.itinerary for a in d.activities if a.category == "food"]
        self.assertTrue(any("King Chicken" in t for t in meals), meals)

    def test_groq_prompt_carries_the_restaurant_rule(self):
        profile, trip = _inputs()
        sent = {}

        class FakeCompletions:
            def create(self, **kwargs):
                sent.update(kwargs)
                raise RuntimeError("stop after the request is built")

        class FakeGroq:
            def __init__(self, **kwargs):
                self.chat = type("Chat", (), {"completions": FakeCompletions()})()

        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}), patch.object(direct_groq, "Groq", FakeGroq):
            with self.assertRaisesRegex(RuntimeError, "stop after"):
                direct_groq.run_direct_groq_fallback(profile, trip, _evidence())
        prompt = sent["messages"][1]["content"]
        self.assertIn("RESTAURANT RULE", prompt)
        self.assertIn("King Chicken", prompt)
        # Prompt + output stay under Groq's 8,000 tokens per minute.
        self.assertLessEqual(sent["max_tokens"] + len(prompt) // 3, 8000)


if __name__ == "__main__":
    unittest.main()
