#!/usr/bin/env python3
"""Scrape a recipe URL into this site's static JSON format.

Uses the `recipe-scrapers` library (https://github.com/hhursev/recipe-scrapers),
which reads a page's structured Recipe data (schema.org/JSON-LD), so blog
narrative/story text is never pulled in -- only name, ingredients, instructions,
timing, yield and image. Sites the library has a purpose-built scraper for
use that; anything else falls back to generic schema.org Recipe parsing
(`supported_only=False`), which covers most WordPress recipe plugins even
without a dedicated scraper.

Usage:
    python scripts/scrape_recipe.py <url> [--category CATEGORY] [--tags a,b,c]

Writes data/recipes/<slug>.json and regenerates data/index.json.
"""
import argparse
import datetime
import json
import re
import sys
from pathlib import Path

from urllib.request import urlopen, Request

from recipe_scrapers import HEADERS, NoSchemaFoundInWildMode, scrape_html

sys.path.insert(0, str(Path(__file__).parent))
from ingredient_parser import parse_ingredient
from build_index import build_index

ROOT = Path(__file__).parent.parent
RECIPES_DIR = ROOT / "data" / "recipes"


def slugify(text):
    text = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return re.sub(r"-+", "-", text)


def clean_instructions(raw_instructions):
    """recipe-scrapers returns instructions as newline-joined text; split into steps
    and strip leading numbering / bullets recipe sites sometimes leave in."""
    steps = [s.strip() for s in raw_instructions.split("\n") if s.strip()]
    cleaned = []
    for step in steps:
        step = re.sub(r"^\s*(step\s*)?\d+[\.\):]?\s*", "", step, flags=re.IGNORECASE)
        step = re.sub(r"^[\-\*•]\s*", "", step)
        if step:
            cleaned.append(step)
    return cleaned


def _first_value(csv_value):
    """schema.org recipeCategory/recipeCuisine can be a comma-joined string
    of several values; take the first as the primary one."""
    if not csv_value:
        return None
    parts = [p.strip() for p in csv_value.split(",") if p.strip()]
    return parts[0] if parts else None


def _discover_category_and_tags(scraper, recipe_name):
    """Pull category/tags from the page's own schema.org Recipe data
    (recipeCategory, recipeCuisine, keywords) instead of requiring a human
    to type them in. Works for both dedicated and generic/wild-mode
    scrapers -- recipe-scrapers fills these from schema.org whenever a
    site-specific scraper doesn't implement them itself."""
    try:
        category = _first_value(scraper.category())
    except Exception:
        category = None

    try:
        cuisine = _first_value(scraper.cuisine())
    except Exception:
        cuisine = None

    try:
        keywords = scraper.keywords() or []
    except Exception:
        keywords = []

    tags = []
    seen = set()
    for tag in [*keywords, cuisine]:
        if not tag:
            continue
        tag = tag.strip().lower()
        if tag and tag != recipe_name.strip().lower() and tag not in seen:
            seen.add(tag)
            tags.append(tag)

    return category, tags


def scrape(url, category=None, tags=None):
    html = urlopen(Request(url, headers=HEADERS)).read().decode("utf-8")
    # supported_only=False: use recipe-scrapers' purpose-built parser for
    # sites it knows, but fall back to generic schema.org/JSON-LD Recipe
    # parsing for everything else -- most recipe plugins/themes emit that
    # markup even when the site has no dedicated scraper class.
    try:
        scraper = scrape_html(html, org_url=url, supported_only=False)
    except NoSchemaFoundInWildMode:
        raise RuntimeError(
            f"No recipe data (schema.org markup) found on {url}. "
            "This page likely needs to be added by hand."
        )

    name = scraper.title()
    slug = slugify(name)

    try:
        servings_raw = scraper.yields()
    except Exception:
        servings_raw = None

    try:
        total_time = scraper.total_time()
    except Exception:
        total_time = None

    try:
        image = scraper.image()
    except Exception:
        image = None

    try:
        host = scraper.host()
    except Exception:
        host = re.sub(r"^https?://(www\.)?", "", url).split("/")[0]

    discovered_category, discovered_tags = _discover_category_and_tags(scraper, name)

    ingredients = [parse_ingredient(line) for line in scraper.ingredients()]
    instructions = clean_instructions(scraper.instructions())

    servings_match = re.search(r"\d+", servings_raw or "")
    servings_number = int(servings_match.group()) if servings_match else None

    recipe = {
        "slug": slug,
        "name": name,
        "category": category or discovered_category or "Uncategorized",
        "tags": tags or discovered_tags,
        "servings": servings_number,
        "servings_label": servings_raw,
        "total_time_minutes": total_time or None,
        "image": image,
        "ingredients": ingredients,
        "instructions": instructions,
        "source_url": url,
        "source_name": host,
        "date_added": datetime.date.today().isoformat(),
    }
    return recipe


def save(recipe):
    RECIPES_DIR.mkdir(parents=True, exist_ok=True)
    path = RECIPES_DIR / f"{recipe['slug']}.json"
    with open(path, "w") as f:
        json.dump(recipe, f, indent=2)
        f.write("\n")
    build_index()
    return path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("--category", default=None)
    parser.add_argument("--tags", default=None, help="comma-separated")
    args = parser.parse_args()

    tags = [t.strip() for t in args.tags.split(",")] if args.tags else []
    recipe = scrape(args.url, category=args.category, tags=tags)
    path = save(recipe)
    print(f"Saved {recipe['name']!r} -> {path}")


if __name__ == "__main__":
    main()
