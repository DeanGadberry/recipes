#!/usr/bin/env python3
"""Regenerate data/index.json from data/recipes/*.json.

The index is a lightweight listing used by the browse/search page so it
doesn't have to fetch every full recipe file just to render cards.
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
RECIPES_DIR = ROOT / "data" / "recipes"
INDEX_PATH = ROOT / "data" / "index.json"


def build_index():
    entries = []
    for path in sorted(RECIPES_DIR.glob("*.json")):
        with open(path) as f:
            r = json.load(f)
        entries.append({
            "slug": r["slug"],
            "name": r["name"],
            "category": r.get("category", "Uncategorized"),
            "tags": r.get("tags", []),
            "servings_label": r.get("servings_label"),
            "total_time_minutes": r.get("total_time_minutes"),
            "image": r.get("image"),
            "source_name": r.get("source_name"),
            "date_added": r.get("date_added"),
        })
    entries.sort(key=lambda e: e.get("date_added") or "", reverse=True)
    with open(INDEX_PATH, "w") as f:
        json.dump(entries, f, indent=2)
        f.write("\n")
    return entries


if __name__ == "__main__":
    entries = build_index()
    print(f"Indexed {len(entries)} recipe(s) -> {INDEX_PATH}")
