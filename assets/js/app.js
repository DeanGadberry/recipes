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
  };

  const grid = document.getElementById('recipe-grid');
  const emptyState = document.getElementById('empty-state');
  const searchInput = document.getElementById('search-input');
  const categoryBar = document.getElementById('category-bar');
  const sortSelect = document.getElementById('sort-select');
  const viewToggle = document.getElementById('view-toggle');
  const resultCount = document.getElementById('result-count');

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
      chip.textContent = cat;
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
    const a = document.createElement('a');
    a.href = `recipe.html?slug=${encodeURIComponent(recipe.slug)}`;
    a.className = 'card';

    const thumb = document.createElement('div');
    thumb.className = 'card-thumb';
    if (recipe.image) {
      thumb.style.backgroundImage = `url("${recipe.image}")`;
    } else {
      thumb.classList.add('no-image');
      thumb.textContent = recipe.name.slice(0, 1).toUpperCase();
    }
    a.appendChild(thumb);

    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('h3');
    title.textContent = recipe.name;
    body.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const bits = [];
    if (recipe.category) bits.push(recipe.category);
    if (recipe.total_time_minutes) bits.push(`${recipe.total_time_minutes} min`);
    if (recipe.servings_label) bits.push(recipe.servings_label);
    meta.textContent = bits.join(' · ');
    body.appendChild(meta);

    a.appendChild(body);
    return a;
  }
})();
