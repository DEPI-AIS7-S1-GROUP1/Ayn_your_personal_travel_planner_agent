"""Arabic plans: planned in English, then translated with names protected (model faked)."""

import json
import os
import unittest
from pathlib import Path
from unittest.mock import patch

from agent import main, translation
from agent.fallbacks import direct_groq
from agent.fallbacks.mock_builder import build_mock_plan
from agent.translation import translate_plan_to_arabic

ROOT = Path(__file__).resolve().parents[1]
ARABIC = {"Lunch": "غداء", "Dinner": "عشاء", "at": "في"}


def _inputs(language="en"):
    profile = json.loads((ROOT / "mock-data" / "profile.json").read_text(encoding="utf-8"))
    trip = json.loads((ROOT / "mock-data" / "trip-request.json").read_text(encoding="utf-8"))
    trip["language"] = language
    return profile, trip


def fake_translator(model, items):
    """Arabic for every field, keeping placeholders, the way the real model is asked to."""
    return {item["id"]: {k: f"نص عربي, {v}" if "[[" in v else "نص عربي" for k, v in item.items() if k != "id"}
            for item in items}


def english_plan(names=("King Chicken",)):
    profile, trip = _inputs()
    return build_mock_plan(profile, trip, list(names))


class TranslationTests(unittest.TestCase):
    def setUp(self):
        p = patch.dict(os.environ, {"GROQ_API_KEY": "test-key"})
        p.start()
        self.addCleanup(p.stop)

    def test_every_text_field_is_translated_and_names_survive(self):
        plan = english_plan()
        sent = []

        def spy(model, items):
            sent.extend(items)
            return fake_translator(model, items)

        with patch.object(translation, "_call", side_effect=spy):
            done, total = translate_plan_to_arabic(plan, ["King Chicken"])
        self.assertEqual(done, total)
        # The model never saw the names, only placeholders.
        blob = json.dumps(sent, ensure_ascii=False)
        self.assertNotIn("King Chicken", blob)
        self.assertIn("[[N", blob)
        for hotel in plan.options.hotels:
            self.assertNotIn(hotel.name, blob)
        meals = [a.title for d in plan.itinerary for a in d.activities if a.category == "food"]
        self.assertTrue(all("King Chicken" in t and "نص عربي" in t for t in meals), meals)
        # Latin comma in Arabic text becomes the Arabic one.
        self.assertTrue(all("،" in t for t in meals), meals)
        self.assertTrue(all("نص عربي" in h.details for h in plan.options.hotels))

    def test_fixed_words_never_reach_the_model(self):
        # The model wrote "حلل" for "halal": such words are put back by the code, not translated.
        plan = english_plan()
        first = plan.itinerary[0].activities[0]
        first.description = "Halal koshari and ta'ameya at King Chicken."
        sent = []

        def spy(model, items):
            sent.extend(items)
            return fake_translator(model, items)

        with patch.object(translation, "_call", side_effect=spy):
            translate_plan_to_arabic(plan, ["King Chicken"])
        blob = json.dumps(sent, ensure_ascii=False).casefold()
        for word in ("halal", "koshari", "ta'ameya"):
            self.assertNotIn(word, blob)
        for arabic in ("حلال", "كشري", "طعمية", "King Chicken"):
            self.assertIn(arabic, first.description)

    def test_a_dropped_or_garbled_item_keeps_its_english(self):
        plan = english_plan()
        first = plan.itinerary[0].activities[0]
        original = first.title

        def drops_first(model, items):
            answers = fake_translator(model, items)
            answers.pop("t0", None)  # dropped
            if "t1" in answers:
                answers["t1"]["title"] = "still English"  # not Arabic
            return answers

        with patch.object(translation, "_call", side_effect=drops_first):
            done, total = translate_plan_to_arabic(plan, ["King Chicken"])
        self.assertEqual(done, total - 2)
        self.assertEqual(first.title, original)

    def test_a_lost_name_placeholder_rejects_the_item(self):
        plan = english_plan()

        def loses_names(model, items):
            return {i["id"]: {k: "نص عربي" for k in i if k != "id"} for i in items}

        with patch.object(translation, "_call", side_effect=loses_names):
            translate_plan_to_arabic(plan, ["King Chicken"])
        meals = [a.title for d in plan.itinerary for a in d.activities if a.category == "food"]
        self.assertTrue(all("King Chicken" in t for t in meals), meals)  # kept in English, name intact

    def test_backup_model_takes_what_the_first_one_failed(self):
        plan = english_plan()
        models = []

        def first_fails(model, items):
            models.append(model)
            if model == translation.TRANSLATION_MODEL:
                raise RuntimeError("500")
            return fake_translator(model, items)

        with patch.object(translation, "_call", side_effect=first_fails):
            done, total = translate_plan_to_arabic(plan, ["King Chicken"])
        self.assertEqual(done, total)
        self.assertIn(translation.BACKUP_MODEL, models)

    def test_long_trips_are_sent_in_chunks(self):
        profile, trip = _inputs()
        trip["end_date"] = "2026-11-23"  # 14 days
        plan = build_mock_plan(profile, trip)
        sizes = []

        def count(model, items):
            sizes.append(len(items))
            return fake_translator(model, items)

        with patch.object(translation, "_call", side_effect=count):
            translate_plan_to_arabic(plan)
        self.assertGreater(len(sizes), 1)
        self.assertTrue(all(n <= translation.CHUNK_ITEMS for n in sizes))

    def test_without_a_key_nothing_is_sent(self):
        with patch.dict(os.environ, {"GROQ_API_KEY": ""}), patch.object(translation, "_call") as call:
            self.assertEqual(translate_plan_to_arabic(english_plan()), (0, 0))
        call.assert_not_called()


class PipelineTests(unittest.TestCase):
    def test_arabic_trip_is_planned_in_english_then_translated(self):
        profile, trip = _inputs("ar")
        seen = {}

        def fake_run(fn, *args, **kwargs):
            seen["language"] = args[1].get("language")
            return build_mock_plan(*args[:2])

        with patch.dict(os.environ, {"GEMINI_API_KEY": "", "GROQ_API_KEY": "test-key"}), \
                patch.object(main, "_run_tier_with_timeout", fake_run), \
                patch.object(main, "search_restaurants", return_value=[]), \
                patch.object(main, "translate_plan_to_arabic", return_value=(1, 1)) as translate:
            plan = main.generate_plan_from_dict(profile, trip)
        self.assertEqual(seen["language"], "en")
        translate.assert_called_once()
        self.assertEqual(plan.search_context, "groq_unverified")

    def test_english_trip_is_not_translated(self):
        profile, trip = _inputs("en")
        with patch.dict(os.environ, {"GEMINI_API_KEY": "", "GROQ_API_KEY": "test-key"}), \
                patch.object(main, "_run_tier_with_timeout", lambda fn, *a, **k: build_mock_plan(*a[:2])), \
                patch.object(main, "search_restaurants", return_value=[]), \
                patch.object(main, "translate_plan_to_arabic") as translate:
            main.generate_plan_from_dict(profile, trip)
        translate.assert_not_called()

    def test_arabic_templates_are_not_translated_again(self):
        profile, trip = _inputs("ar")
        with patch.dict(os.environ, {"GEMINI_API_KEY": "", "GROQ_API_KEY": ""}), \
                patch.object(main, "search_restaurants", return_value=[]), \
                patch.object(main, "translate_plan_to_arabic") as translate:
            plan = main.generate_plan_from_dict(profile, trip)
        translate.assert_not_called()
        self.assertEqual(plan.search_context, "mock_unverified")
        city_ar = "شرم الشيخ" if trip["destination"]["city"] == "Sharm El Sheikh" else None
        if city_ar:
            titles = " ".join(a.title for d in plan.itinerary for a in d.activities)
            self.assertIn(city_ar, titles)
            self.assertNotIn("Sharm El Sheikh", titles)


if __name__ == "__main__":
    unittest.main()
