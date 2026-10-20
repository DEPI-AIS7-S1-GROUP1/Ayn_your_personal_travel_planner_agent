"""Arabic plans: written in English, then translated.

Asked to write Arabic directly, the planning models produced stiff, word-for-word Arabic,
while their English plans were good. So an Arabic trip is planned in English and the text
fields are translated by allam-2-7b, Groq's Arabic model (its own quota, separate from the
planner's). Names never go through the model: each restaurant, hotel and airline name is
swapped for a placeholder ([[N1]]) and put back afterwards, so "King Chicken" cannot become
"الملك الدجاج".

translate_plan_to_arabic() changes the plan in place and never raises: an item the model
drops or garbles keeps its English text, and the log says how many were translated.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time

from agent.arabic import CITY_NAMES_AR, contains_arabic

logger = logging.getLogger(__name__)

TRANSLATION_MODEL = os.getenv("GROQ_TRANSLATION_MODEL", "allam-2-7b")
BACKUP_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
CHUNK_ITEMS = 14  # allam-2-7b has a 4,096-token context: input + Arabic output must fit

SYSTEM_PROMPT = (
    "Translate the English travel-plan text in each item to natural Modern Standard Arabic, as a "
    "native Egyptian travel writer would: fluent and idiomatic, never word-for-word.\n"
    "- Copy every placeholder like [[N1]] or [[G1]] exactly as it is; it stands for a name or a word.\n"
    "- Glossary: halal = حلال, vegetarian = نباتي, vegan = نباتي صرف, gluten-free = خالٍ من الغلوتين, "
    "snorkeling = سنوركلينج, diving = غوص, check-in = تسجيل الوصول, check-out = تسجيل المغادرة, "
    "transfer = انتقال, felucca = فلوكة, koshari = كشري, Blue Hole = البلو هول, souq = سوق.\n"
    'Return JSON {"items": [...]} with the same ids and the same keys, values translated.'
)

_PLACEHOLDER = re.compile(r"\[\[([NG])(\d+)\]\]")

# Words the model still got wrong with the glossary in the prompt ("halal" -> "حلل"), so they
# never reach it: like names, they become placeholders, and the Arabic is put back here.
FIXED_TERMS = [
    (re.compile(r"\bhalal\b", re.IGNORECASE), "حلال"),
    (re.compile(r"\bkosh(?:a|e)ri\b", re.IGNORECASE), "كشري"),
    (re.compile(r"\bta'?amey?a\b", re.IGNORECASE), "طعمية"),
    (re.compile(r"\bfalafel\b", re.IGNORECASE), "فلافل"),
    (re.compile(r"\bfelucca\b", re.IGNORECASE), "فلوكة"),
    (re.compile(r"\bfo?ul medames\b", re.IGNORECASE), "فول مدمس"),
]


def _protect(text: str, names: list[str]) -> str:
    for i, name in enumerate(names, start=1):
        text = text.replace(name, f"[[N{i}]]")
    for i, (pattern, _) in enumerate(FIXED_TERMS, start=1):
        text = pattern.sub(f"[[G{i}]]", text)
    return text


def _restore(text: str, names: list[str]) -> str:
    def put_back(match):
        kind, number = match.group(1), int(match.group(2))
        if kind == "G" and number <= len(FIXED_TERMS):
            return FIXED_TERMS[number - 1][1]
        if kind == "N" and number <= len(names):
            return names[number - 1]
        return match.group(0)
    return _PLACEHOLDER.sub(put_back, text)


def _arabic_punctuation(text: str) -> str:
    """The model often keeps Latin "," and ";" in Arabic sentences; "1,500" is left alone."""
    return re.sub(r",(?=\s|$)", "،", text).replace(";", "؛").replace("?", "؟")


def _call(model: str, items: list[dict]) -> dict[str, dict]:
    from groq import Groq

    client = Groq(api_key=os.getenv("GROQ_API_KEY", "").strip(), max_retries=0,
                  timeout=float(os.getenv("GROQ_REQUEST_TIMEOUT_S", "25")))
    extra = {"reasoning_effort": "low"} if model.startswith("openai/gpt-oss") else {}
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": SYSTEM_PROMPT},
                  {"role": "user", "content": json.dumps({"items": items}, ensure_ascii=False)}],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=2500,
        **extra,
    )
    returned = json.loads(response.choices[0].message.content).get("items") or []
    return {str(item.get("id")): item for item in returned if isinstance(item, dict)}


MAX_RATE_WAIT_S = 8.0


def _call_with_wait(model: str, items: list[dict]) -> dict[str, dict]:
    """One retry after a tokens-per-minute 429 ("try again in 4.2s"), when the wait is short:
    a long trip's later chunks reach allam's 6,000 tokens per minute."""
    try:
        return _call(model, items)
    except Exception as exc:
        wait = re.search(r"try again in ([\d.]+)s", str(exc))
        if "429" not in str(exc) or not wait or float(wait.group(1)) > MAX_RATE_WAIT_S:
            raise
        time.sleep(float(wait.group(1)) + 0.5)
        return _call(model, items)


def _translate_chunk(items: list[dict], names: list[str]) -> dict[str, dict]:
    """{id: {field: arabic}} for the items both translated and intact; tries the backup model
    for whatever the first one dropped."""
    done: dict[str, dict] = {}
    pending = items
    for model in dict.fromkeys((TRANSLATION_MODEL, BACKUP_MODEL)):
        if not pending:
            break
        try:
            answers = _call_with_wait(model, pending)
        except Exception as exc:
            logger.warning("Translation with %s failed (%s): %s", model, type(exc).__name__, str(exc)[:200])
            continue
        still = []
        for item in pending:
            answer = answers.get(item["id"], {})
            fields = {}
            for key, english in item.items():
                if key == "id":
                    continue
                arabic = str(answer.get(key) or "")
                # Every name must come back, and the text must really be Arabic.
                if (contains_arabic(arabic)
                        and set(_PLACEHOLDER.findall(arabic)) == set(_PLACEHOLDER.findall(english))):
                    fields[key] = _restore(_arabic_punctuation(arabic), names)
            if len(fields) == len(item) - 1:
                done[item["id"]] = fields
            else:
                still.append(item)
        pending = still
    return done


def translate_plan_to_arabic(plan, protected_names: list[str] | None = None) -> tuple[int, int]:
    """Translate activity titles/descriptions, hotel areas/details and flight details in place.

    protected_names: restaurant names found by the search; hotel and airline names are added.
    Returns (items translated, items in the plan).
    """
    if not os.getenv("GROQ_API_KEY", "").strip():
        logger.warning("No GROQ_API_KEY: the Arabic plan keeps its English text")
        return 0, 0

    names = [n for n in (protected_names or []) if n]
    names += [h.name for h in plan.options.hotels] + [f.airline for f in plan.options.flights]
    # City names are translated by the model; everything else that is a name is protected.
    names = sorted({n for n in names if n and n not in CITY_NAMES_AR}, key=len, reverse=True)

    targets: list[tuple[object, dict]] = []
    for day in plan.itinerary:
        for activity in day.activities:
            targets.append((activity, {"title": activity.title, "description": activity.description}))
    for hotel in plan.options.hotels:
        targets.append((hotel, {"area": hotel.area, "details": hotel.details}))
    for flight in plan.options.flights:
        targets.append((flight, {"details": flight.details}))

    items = []
    for i, (_, fields) in enumerate(targets):
        item = {"id": f"t{i}"}
        item.update({k: _protect(v, names) for k, v in fields.items() if v})
        items.append(item)

    translated = 0
    for start in range(0, len(items), CHUNK_ITEMS):
        chunk = [item for item in items[start:start + CHUNK_ITEMS] if len(item) > 1]
        for item_id, fields in _translate_chunk(chunk, names).items():
            obj, _ = targets[int(item_id[1:])]
            for key, value in fields.items():
                setattr(obj, key, value)
            translated += 1
    logger.info("Arabic translation: %d of %d items", translated, len(items))
    return translated, len(items)
