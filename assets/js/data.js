// Loading recipe data. All paths are relative so the site works whether it's
// served at the domain root or from a GitHub Pages project subpath.

const RecipeData = (() => {
  let indexPromise = null;
  const recipeCache = new Map();

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch('data/index.json').then((r) => r.json());
    }
    return indexPromise;
  }

  function loadRecipe(slug) {
    if (!recipeCache.has(slug)) {
      recipeCache.set(slug, fetch(`data/recipes/${slug}.json`).then((r) => {
        if (!r.ok) throw new Error(`Recipe "${slug}" not found`);
        return r.json();
      }));
    }
    return recipeCache.get(slug);
  }

  return { loadIndex, loadRecipe };
})();
