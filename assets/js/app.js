// Browse / search page controller.

(async function () {
  const state = {
    all: [],
    filtered: [],
    category: 'All',
    query: '',
    sort: 'newest',
    view: localStorage.getItem('recipe-view-mode') || 'grid',
    counts: new Map(),
    favoritesOnly: false,
  };

  const grid = document.getElementById('recipe-grid');
  const emptyState = document.getElementById('empty-state');
  const searchInput = document.getElementById('search-input');
  const categoryBar = document.getElementById('category-bar');
  const sortSelect = document.getElementById('sort-select');
  const viewToggle = document.getElementById('view-toggle');
  const resultCount = document.getElementById('result-count');
  const favoritesToggle = document.getElementById('favorites-toggle');
  const emptyHeading = document.getElementById('empty-state-heading');
  const emptyText = document.getElementById('empty-state-text');

  let fuse = null;

  try {
    state.all = await RecipeData.loadIndex();
  } catch (e) {
    state.all = [];
  }

  buildCategoryBar();
  applyViewMode();
  render();

  searchInput.addEventListener('input', () => {
    state.query = searchInput.value.trim();
    render();
  });

  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    render();
  });

  viewToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    state.view = btn.dataset.view;
    localStorage.setItem('recipe-view-mode', state.view);
    applyViewMode();
  });

  favoritesToggle.addEventListener('click', () => {
    state.favoritesOnly = !state.favoritesOnly;
    favoritesToggle.classList.toggle('active', state.favoritesOnly);
    favoritesToggle.setAttribute('aria-pressed', String(state.favoritesOnly));
    favoritesToggle.querySelector('use').setAttribute('href', state.favoritesOnly ? '#icon-heart' : '#icon-heart-outline');
    render();
  });

  function applyViewMode() {
    grid.classList.toggle('list-mode', state.view === 'list');
    viewToggle.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === state.view);
    });
  }

  function buildCategoryBar() {
    const categories = ['All', ...new Set(state.all.map((r) => r.category).filter(Boolean))].sort(
      (a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b))
    );
    categoryBar.innerHTML = '';
    for (const cat of categories) {
      const chip = document.createElement('button');
      chip.className = 'chip' + (cat === state.category ? ' active' : '');
      chip.innerHTML = icon(cat === 'All' ? 'icon-grid' : categoryIcon(cat)) + `<span>${cat}</span>`;
      chip.addEventListener('click', () => {
        state.category = cat;
        categoryBar.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        render();
      });
      categoryBar.appendChild(chip);
    }
  }

  function getFuse() {
    if (!fuse || fuse._docs !== state.all) {
      fuse = new Fuse(state.all, {
        keys: ['name', 'tags', 'category', 'source_name'],
        threshold: 0.35,
        ignoreLocation: true,
      });
      fuse._docs = state.all;
    }
    return fuse;
  }

  async function render() {
    let list = state.all;

    if (state.category !== 'All') {
      list = list.filter((r) => r.category === state.category);
    }

    if (state.favoritesOnly) {
      const favs = Prefs.getFavorites();
      list = list.filter((r) => favs.has(r.slug));
    }

    if (state.query) {
      const results = getFuse().search(state.query).map((r) => r.item);
      const inCategory = new Set(list.map((r) => r.slug));
      list = results.filter((r) => inCategory.has(r.slug));
    }

    if (state.sort === 'popular' || state.sort === 'least-popular') {
      const slugs = list.map((r) => r.slug);
      state.counts = await ViewTracker.getCounts(slugs);
    }

    list = sortList(list, state.sort, state.counts);

    resultCount.textContent = `${list.length} recipe${list.length === 1 ? '' : 's'}`;
    grid.innerHTML = '';
    emptyState.hidden = list.length !== 0;
    if (list.length === 0 && state.favoritesOnly) {
      emptyHeading.textContent = 'No favorites yet';
      emptyText.innerHTML = 'Tap the heart on a recipe to save it here.';
    } else {
      emptyHeading.textContent = 'Nothing here yet';
      emptyText.innerHTML = 'Nothing matches your search, or the box is still empty. <a href="request.html">Request a recipe</a> to get started.';
    }

    for (const recipe of list) {
      grid.appendChild(renderCard(recipe));
    }
  }

  function sortList(list, sort, counts) {
    const copy = [...list];
    switch (sort) {
      case 'name':
        return copy.sort((a, b) => a.name.localeCompare(b.name));
      case 'quickest':
        return copy.sort((a, b) => (a.total_time_minutes || Infinity) - (b.total_time_minutes || Infinity));
      case 'popular':
        return copy.sort((a, b) => (counts.get(b.slug) || 0) - (counts.get(a.slug) || 0));
      case 'least-popular':
        return copy.sort((a, b) => (counts.get(a.slug) || 0) - (counts.get(b.slug) || 0));
      case 'newest':
      default:
        return copy.sort((a, b) => (b.date_added || '').localeCompare(a.date_added || ''));
    }
  }

  function renderCard(recipe) {
    return renderRecipeCard(recipe, (isFav) => {
      if (state.favoritesOnly && !isFav) render();
    });
  }
})();
