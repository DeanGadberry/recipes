# Gadberry Recipes

A searchable, static family recipe box. Plain HTML/CSS/JS, hosted on GitHub Pages
at deangadberry.com/recipes. No server, no build step, no database.

Every recipe keeps only what matters: the name, ingredients (with quantities
you can scale), the steps, and a link back to the source at the bottom. All
the blog-post story gets stripped out before it ever reaches the site.

## How it works

- `index.html` -- browse, search, filter by category, sort (newest, name,
  quickest, most/least cooked), grid or list view.
- `recipe.html` -- one recipe, with a servings scaler (1x/2x/3x presets or a
  custom number of servings/people) that recalculates every ingredient
  quantity live, plus a print button.
- `request.html` -- a "Request a recipe" page for anyone (e.g. your wife) to
  submit a URL, no GitHub account workflow knowledge required.
- `data/recipes/*.json` -- one file per recipe, the source of truth.
- `data/index.json` -- a generated lightweight listing used by the browse
  page; rebuilt automatically whenever a recipe is added.

## Adding recipes

**Three ways in, same result:**

1. **GitHub app (or github.com).** Open the repo, go to Issues, tap New --
   it opens straight into the "Recipe request" form (it's the only template;
   blank issues are disabled). Paste the URL, submit. A GitHub Actions
   workflow (`.github/workflows/add-recipe.yml`) picks it up within a
   minute or two: scrapes the page, commits the new recipe, comments on the
   issue, and closes it. If the site isn't supported it comments explaining
   why instead of failing silently. `request.html` on the site links straight
   there. The URL just needs to appear somewhere in the issue -- the workflow
   falls back to grabbing the first link in the title/body if the form
   field itself doesn't come through cleanly (some clients mangle it).
2. **Ask Claude.** Paste a recipe URL into a chat on this project and ask for
   it to be added -- it'll scrape it, clean it up, and commit it.
3. **Run the scraper yourself:**
   ```
   pip install -r scripts/requirements.txt
   python scripts/scrape_recipe.py "https://example.com/some-recipe" \
       --category "Dinner" --tags "quick,freezer-friendly"
   ```
   This writes `data/recipes/<slug>.json` and regenerates `data/index.json`.

All three paths use [`recipe-scrapers`](https://github.com/hhursev/recipe-scrapers),
a well-maintained open-source library that reads a recipe page's structured
data (the same schema.org markup Google uses for recipe rich results) --
which is *why* the story text never makes it in: only the name, ingredients,
instructions, yield, time, and image are part of that structured data.

Sites `recipe-scrapers` has a purpose-built parser for use that; everything
else falls back to generic schema.org Recipe parsing, which covers most
WordPress recipe plugins even without a dedicated scraper -- so most sites
work either way. If a site truly has no structured recipe data at all,
scraping fails cleanly (an error, not garbage data) -- add that recipe by
hand as a JSON file instead, following the schema of any file already in
`data/recipes/`.

## Ingredient scaling

Each ingredient is stored structured (`{"quantity": 1.5, "unit": "cup",
"item": "flour, sifted"}`) rather than as one string, so the frontend can
multiply the quantity and re-render it (`assets/js/scale.js`), formatting
back into clean fractions (1/2, 1/3, 2/3, etc.) instead of ugly decimals.
Ingredients with no parseable quantity (e.g. "Salt, to taste") are left as-is.

## View counts / "most cooked"

There's no backend, so cross-visitor view counts come from
[countapi.xyz](https://countapi.xyz), a free, no-signup hit-counter service
(`assets/js/views.js`). It's good enough for a family site and requires zero
setup, but it's an external dependency and not guaranteed to be permanent.
To swap it for something else (self-hosted, GoatCounter, Cloudflare Workers
KV, etc.), everything lives behind the `ViewTracker` interface in that one
file -- `recordView(slug)` and `getCounts(slugs)` are the only two calls the
rest of the site makes. Set `CONFIG.backend = 'local'` there to fall back to
a purely per-browser count with no network calls at all.

## Quality-of-life features

All per-browser (`localStorage`), no backend, no account -- everything lives
in `assets/js/prefs.js`:

- **Favorites**: heart a recipe from its card or its own page; filter the
  browse page to just favorites with the heart toggle next to Sort.
- **Tap-to-check**: click/tap an ingredient or instruction step to cross it
  off while cooking. Persists per recipe, so leaving and coming back keeps
  your progress.
- **Keep screen on**: a "Keep screen on" button on the recipe page (Screen
  Wake Lock API) so your phone doesn't sleep mid-recipe. Only shown when the
  browser supports it.
- **Copy ingredients / copy link**: copies the *currently scaled* ingredient
  list as plain text (handy for a grocery-list app), or the recipe's URL, to
  the clipboard.
- **Related recipes**: "More from the box" at the bottom of a recipe page --
  other recipes sharing its category, computed client-side from
  `data/index.json`.
- **Light/dark toggle**: the moon/sun button in the header overrides the
  system `prefers-color-scheme` default; also file-backed in `prefs.js`.

## Design system

Modern-farmhouse: warm cream/ivory surfaces, sage green and terracotta
accents, a serif display face over a clean sans body, and hand-drawn
botanical line art for texture. No background is ever black, including
dark mode (a deep warm olive, not near-black) -- see `:root` and
`:root[data-theme="dark"]` / `prefers-color-scheme: dark` at the top of
`assets/css/style.css` for every color as a named custom property.

- **Fonts**: [Playfair Display](https://fonts.google.com/specimen/Playfair+Display)
  for headings (`--font-display`), [Jost](https://fonts.google.com/specimen/Jost)
  for body text (`--font-body`), both loaded from Google Fonts in each page's
  `<head>`.
- **Icons and illustrations**: one shared sprite, `assets/img/icons.svg` --
  functional line icons (clock, servings, search, print, ...), a small set of
  per-category icons, and two illustrated greenery accents (`deco-sprig`,
  `deco-divider`). `assets/js/icons.js` fetches and injects that sprite once
  per page load, so every page references icons with a two-line
  `<svg class="icon"><use href="#icon-name"></use></svg>` instead of
  duplicating markup -- add a new `<symbol>` to that one file and it's
  available everywhere immediately.
- **Category icons are automatic, not manual.** `CATEGORY_ICONS` in
  `icons.js` maps common category names (breakfast, dinner, dessert,
  slow cooker, ...) to an icon; anything not in that map quietly falls back
  to a plain leaf rather than needing per-recipe icon assignment. Extend the
  map as new categories show up.
- **Categories** themselves aren't a fixed list either -- whatever `category`
  values exist across `data/recipes/*.json` show up automatically as filter
  chips.
- **Search**: [Fuse.js](https://www.fusejs.io/) (loaded from a CDN, no build
  step) does fuzzy matching across name/tags/category/source in `app.js`.
- **Grid vs. list view**: toggle in the top-right of the browse page, remembered
  per-browser.

## Local preview

```
python3 -m http.server 8000
```
then open http://localhost:8000/.

## Deploying

In the repo's GitHub Settings -> Pages, set the source to deploy from the
`main` branch, root folder. If deangadberry.com is already the custom domain
on your GitHub *user* Pages site, this project site inherits it automatically
at `deangadberry.com/recipes` once Pages is enabled here -- no separate CNAME
needed in this repo.
