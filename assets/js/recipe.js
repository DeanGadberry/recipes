// Recipe detail page controller.

(async function () {
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug');

  const el = {
    title: document.getElementById('recipe-title'),
    meta: document.getElementById('recipe-meta'),
    image: document.getElementById('recipe-image'),
    ingredients: document.getElementById('ingredient-list'),
    instructions: document.getElementById('instruction-list'),
    source: document.getElementById('recipe-source'),
    servingsLabel: document.getElementById('servings-label'),
    servingsInput: document.getElementById('servings-input'),
    presets: document.getElementById('scale-presets'),
    notFound: document.getElementById('not-found'),
    main: document.getElementById('recipe-main'),
    viewCount: document.getElementById('view-count'),
    favoriteBtn: document.getElementById('favorite-btn'),
    wakeLockBtn: document.getElementById('wake-lock-btn'),
    copyLinkBtn: document.getElementById('copy-link-btn'),
    copyIngredientsBtn: document.getElementById('copy-ingredients-btn'),
    relatedSection: document.getElementById('related-recipes'),
    relatedGrid: document.getElementById('related-grid'),
  };

  if (!slug) {
    showNotFound();
    return;
  }

  let recipe;
  try {
    recipe = await RecipeData.loadRecipe(slug);
  } catch (e) {
    showNotFound();
    return;
  }

  document.title = `${recipe.name} — Gadberry Recipes`;
  el.title.textContent = recipe.name;

  const metaBits = [];
  if (recipe.category) {
    metaBits.push(`<span class="category-badge">${icon(categoryIcon(recipe.category))}${recipe.category}</span>`);
  }
  if (recipe.prep_time_minutes && recipe.cook_time_minutes) {
    metaBits.push(`<span>${icon('icon-clock')}Prep ${recipe.prep_time_minutes} min &middot; Cook ${recipe.cook_time_minutes} min</span>`);
  } else if (recipe.total_time_minutes) {
    metaBits.push(`<span>${icon('icon-clock')}${recipe.total_time_minutes} min</span>`);
  }
  el.meta.innerHTML = metaBits.join('');

  if (recipe.tags && recipe.tags.length) {
    const tagWrap = document.createElement('div');
    tagWrap.className = 'tag-list';
    for (const tag of recipe.tags) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tag;
      tagWrap.appendChild(span);
    }
    el.meta.after(tagWrap);
  }

  if (recipe.image) {
    el.image.style.backgroundImage = `url("${recipe.image}")`;
    el.image.hidden = false;
  }

  // ---- Favorite ----
  function applyFavoriteState() {
    const isFav = Prefs.isFavorite(slug);
    el.favoriteBtn.classList.toggle('active', isFav);
    el.favoriteBtn.setAttribute('aria-pressed', String(isFav));
    el.favoriteBtn.querySelector('use').setAttribute('href', isFav ? '#icon-heart' : '#icon-heart-outline');
  }
  el.favoriteBtn.addEventListener('click', () => {
    Prefs.toggleFavorite(slug);
    applyFavoriteState();
  });
  applyFavoriteState();

  // ---- Keep screen awake while cooking ----
  if ('wakeLock' in navigator) {
    el.wakeLockBtn.hidden = false;
    let wakeLock = null;

    async function enableWakeLock() {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          el.wakeLockBtn.classList.remove('active');
        });
        el.wakeLockBtn.classList.add('active');
      } catch (e) {
        // permission denied or unsupported in this context -- fail quietly
      }
    }

    el.wakeLockBtn.addEventListener('click', async () => {
      if (wakeLock) {
        await wakeLock.release();
        wakeLock = null;
        el.wakeLockBtn.classList.remove('active');
      } else {
        await enableWakeLock();
      }
    });

    document.addEventListener('visibilitychange', async () => {
      if (wakeLock && document.visibilityState === 'visible') {
        await enableWakeLock();
      }
    });
  }

  // ---- Copy link ----
  el.copyLinkBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      flashButton(el.copyLinkBtn, 'Copied!');
    } catch (e) {
      // clipboard unavailable -- ignore
    }
  });

  function flashButton(btn, message) {
    const original = btn.innerHTML;
    btn.innerHTML = `${icon('icon-check')}${message}`;
    setTimeout(() => { btn.innerHTML = original; }, 1600);
  }

  // ---- Servings scaling + checkable ingredients ----
  const baseServings = recipe.servings || 1;
  let factor = 1;

  el.servingsInput.value = baseServings;
  el.servingsInput.min = 1;

  const checked = Prefs.getChecked(slug);

  function renderIngredients() {
    el.ingredients.innerHTML = '';
    recipe.ingredients.forEach((ing, index) => {
      const li = document.createElement('li');
      li.textContent = scaleIngredient(ing, factor);
      li.tabIndex = 0;
      if (checked.has('i' + index)) li.classList.add('checked');
      li.addEventListener('click', () => toggleCheck(li, 'i' + index));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCheck(li, 'i' + index); }
      });
      el.ingredients.appendChild(li);
    });
    const scaledServings = Math.round(baseServings * factor * 100) / 100;
    el.servingsLabel.textContent = recipe.servings
      ? `Makes about ${scaledServings} serving${scaledServings === 1 ? '' : 's'}`
      : '';
  }

  function toggleCheck(li, key) {
    const isChecked = Prefs.toggleChecked(slug, key);
    li.classList.toggle('checked', isChecked);
  }

  function setFactor(f) {
    factor = f;
    el.servingsInput.value = Math.round(baseServings * factor * 100) / 100;
    el.presets.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', Number(b.dataset.factor) === f);
    });
    renderIngredients();
  }

  for (const preset of SERVING_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.factor = preset;
    btn.textContent = preset === 1 ? '1x' : `${preset}x`;
    btn.className = 'chip' + (preset === 1 ? ' active' : '');
    btn.addEventListener('click', () => setFactor(preset));
    el.presets.appendChild(btn);
  }

  el.servingsInput.addEventListener('change', () => {
    const desired = Number(el.servingsInput.value);
    if (!desired || desired <= 0) return;
    factor = desired / baseServings;
    el.presets.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', Number(b.dataset.factor) === factor);
    });
    renderIngredients();
  });

  renderIngredients();

  el.copyIngredientsBtn.addEventListener('click', async () => {
    const lines = recipe.ingredients.map((ing) => `- ${scaleIngredient(ing, factor)}`);
    const text = `${recipe.name}\n\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      el.copyIngredientsBtn.querySelector('use').setAttribute('href', '#icon-check');
      setTimeout(() => el.copyIngredientsBtn.querySelector('use').setAttribute('href', '#icon-clipboard'), 1600);
    } catch (e) {
      // clipboard unavailable -- ignore
    }
  });

  // ---- Checkable instructions ----
  el.instructions.innerHTML = '';
  recipe.instructions.forEach((step, index) => {
    const li = document.createElement('li');
    li.textContent = step;
    li.tabIndex = 0;
    if (checked.has('s' + index)) li.classList.add('checked');
    li.addEventListener('click', () => toggleCheck(li, 's' + index));
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCheck(li, 's' + index); }
    });
    el.instructions.appendChild(li);
  });

  if (recipe.source_url || recipe.source_name) {
    el.source.innerHTML = icon('icon-external');
    if (recipe.source_url) {
      const link = document.createElement('a');
      link.href = recipe.source_url;
      link.textContent = recipe.source_name || recipe.source_url;
      link.rel = 'noopener';
      link.target = '_blank';
      el.source.append('Source: ', link);
    } else {
      el.source.append('Source: ' + recipe.source_name);
    }
  }

  document.getElementById('print-btn').addEventListener('click', () => window.print());

  ViewTracker.recordView(slug).then((count) => {
    if (count && el.viewCount) {
      el.viewCount.innerHTML = `${icon('icon-eye')}${count} view${count === 1 ? '' : 's'}`;
    }
  });

  // ---- Related recipes (same category) ----
  try {
    const index = await RecipeData.loadIndex();
    const related = index
      .filter((r) => r.slug !== slug && r.category === recipe.category)
      .slice(0, 3);
    if (related.length) {
      el.relatedGrid.innerHTML = '';
      related.forEach((r) => el.relatedGrid.appendChild(renderRecipeCard(r)));
      el.relatedSection.hidden = false;
    }
  } catch (e) {
    // index unavailable -- skip related section
  }

  function showNotFound() {
    el.main.hidden = true;
    el.notFound.hidden = false;
  }
})();
