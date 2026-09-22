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

NUM_RE = re.compile(
    r"""^\s*
    (?P<whole>\d+)?\s*
    (?P<frac>(\d+/\d+)|[""" + "".join(VULGAR_FRACTIONS.keys()) + r"""])?
    """,
    re.VERBOSE,
)


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

    m = NUM_RE.match(text)
    if not m or (not m.group("whole") and not m.group("frac")):
        # Try a lone vulgar fraction at the start, e.g. "½ cup"
        if text[0] in VULGAR_FRACTIONS:
            return VULGAR_FRACTIONS[text[0]], text[1:].strip()
        return None, text

    whole = int(m.group("whole")) if m.group("whole") else 0
    frac_val = 0.0
    frac = m.group("frac")
    if frac:
        if frac in VULGAR_FRACTIONS:
            frac_val = VULGAR_FRACTIONS[frac]
        elif "/" in frac:
            num, den = frac.split("/")
            frac_val = float(num) / float(den)

    qty = whole + frac_val
    rest = text[m.end():].strip()
    return qty, rest


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
