"""Parse a raw ingredient line into a structured, scalable form.

Splits a string like "1 1/2 cups flour, sifted" into:
    {"quantity": 1.5, "unit": "cup", "item": "flour, sifted", "raw": "1 1/2 cups flour, sifted"}

quantity is None when no leading number is found (e.g. "Salt, to taste"),
in which case the frontend leaves the line unscaled.
"""
import re

VULGAR_FRACTIONS = {
    "¼": 0.25, "½": 0.5, "¾": 0.75,
    "⅐": 0.1111111111, "⅑": 0.1111111111, "⅒": 0.1,
    "⅓": 0.3333333333, "⅔": 0.6666666667,
    "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
    "⅙": 0.1666666667, "⅚": 0.8333333333,
    "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
}

# Longest units first so "tablespoon" matches before "t".
UNIT_ALIASES = [
    ("tablespoons", "tbsp"), ("tablespoon", "tbsp"), ("tbsp.", "tbsp"), ("tbsp", "tbsp"), ("tbs", "tbsp"),
    ("teaspoons", "tsp"), ("teaspoon", "tsp"), ("tsp.", "tsp"), ("tsp", "tsp"),
    ("cups", "cup"), ("cup", "cup"),
    ("pounds", "lb"), ("pound", "lb"), ("lbs", "lb"), ("lb.", "lb"), ("lb", "lb"),
    ("ounces", "oz"), ("ounce", "oz"), ("oz.", "oz"), ("oz", "oz"),
    ("grams", "g"), ("gram", "g"), ("g.", "g"),
    ("kilograms", "kg"), ("kilogram", "kg"), ("kg", "kg"),
    ("milliliters", "ml"), ("milliliter", "ml"), ("ml", "ml"),
    ("liters", "l"), ("liter", "l"), ("litre", "l"), ("litres", "l"),
    ("quarts", "qt"), ("quart", "qt"), ("qt", "qt"),
    ("pints", "pt"), ("pint", "pt"), ("pt", "pt"),
    ("gallons", "gal"), ("gallon", "gal"),
    ("cloves", "clove"), ("clove", "clove"),
    ("cans", "can"), ("can", "can"),
    ("packages", "package"), ("package", "package"), ("pkg", "package"),
    ("sticks", "stick"), ("stick", "stick"),
    ("slices", "slice"), ("slice", "slice"),
    ("pinches", "pinch"), ("pinch", "pinch"),
    ("dashes", "dash"), ("dash", "dash"),
    ("bunches", "bunch"), ("bunch", "bunch"),
    ("heads", "head"), ("head", "head"),
    ("large", "large"), ("medium", "medium"), ("small", "small"),
]

# Tried in order -- most specific first, so "1/2" isn't consumed as a bare
# "1" before the fraction pattern gets a chance to match it.
MIXED_NUMBER_RE = re.compile(r"^(\d+)\s+(\d+)/(\d+)\b")
SIMPLE_FRACTION_RE = re.compile(r"^(\d+)/(\d+)\b")
DECIMAL_OR_WHOLE_RE = re.compile(r"^(\d+(?:\.\d+)?)\b")
VULGAR_RE = re.compile("^[" + "".join(VULGAR_FRACTIONS.keys()) + "]")


def _parse_number_prefix(text):
    """Return (quantity, rest_of_string) or (None, text) if no leading number."""
    text = text.strip()
    if not text:
        return None, text

    # Range like "2-3" or "2 to 3": use the first number, keep full text as item context.
    range_match = re.match(r"^(\d+(?:\.\d+)?)\s*(?:-|to)\s*\d+(?:\.\d+)?\b", text)
    if range_match:
        qty = float(range_match.group(1))
        rest = text[range_match.end():].strip()
        return qty, rest

    m = MIXED_NUMBER_RE.match(text)
    if m:
        qty = int(m.group(1)) + float(m.group(2)) / float(m.group(3))
        return qty, text[m.end():].strip()

    m = SIMPLE_FRACTION_RE.match(text)
    if m:
        qty = float(m.group(1)) / float(m.group(2))
        return qty, text[m.end():].strip()

    m = VULGAR_RE.match(text)
    if m:
        return VULGAR_FRACTIONS[m.group(0)], text[m.end():].strip()

    m = DECIMAL_OR_WHOLE_RE.match(text)
    if m:
        return float(m.group(1)), text[m.end():].strip()

    return None, text


def _parse_unit_prefix(text):
    lower = text.lower()
    for alias, canonical in UNIT_ALIASES:
        if lower.startswith(alias + " ") or lower == alias:
            return canonical, text[len(alias):].strip(" .")
    return None, text


def parse_ingredient(raw):
    raw = raw.strip()
    quantity, rest = _parse_number_prefix(raw)
    unit = None
    if quantity is not None:
        unit, rest = _parse_unit_prefix(rest)
    return {
        "quantity": quantity,
        "unit": unit,
        "item": rest if rest else raw,
        "raw": raw,
    }


if __name__ == "__main__":
    samples = [
        "1 1/2 cups flour, sifted",
        "½ cup sugar",
        "2 tbsp olive oil",
        "Salt, to taste",
        "3-4 cloves garlic, minced",
        "1 large egg",
        "2 (15 oz) cans black beans, drained",
    ]
    for s in samples:
        print(s, "->", parse_ingredient(s))
