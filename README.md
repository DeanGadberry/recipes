# Recipes

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

1. **Ask Claude.** Paste a recipe URL into a chat on this project and ask for
   it to be added -- it'll scrape it, clean it up, and commit it.
2. **Request form.** Anyone visits `request.html` and opens a "Recipe
   request" GitHub issue with the URL. A GitHub Actions workflow
   (`.github/workflows/add-recipe.yml`) picks it up automatically: it scrapes
   the page, commits the new recipe, comments on the issue, and closes it. If
   the site isn't supported it leaves a comment saying so instead of failing
   silently.
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

If a site isn't on `recipe-scrapers`' supported list, scraping will fail
cleanly (an error, not garbage data) -- add that recipe by hand as a JSON
file instead, following the schema in `data/recipes/basic-pancakes.json`
(the placeholder example -- delete it once you have real recipes).

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

## Customizing

- **Colors/fonts/layout**: CSS custom properties at the top of
  `assets/css/style.css` (`:root`), with a dark-mode variant already wired up.
- **Categories**: not a fixed list -- whatever `category` values exist across
  `data/recipes/*.json` show up automatically as filter chips.
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
