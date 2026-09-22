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
  if (recipe.total_time_minutes) {
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

  const baseServings = recipe.servings || 1;
  let factor = 1;

  el.servingsInput.value = baseServings;
  el.servingsInput.min = 1;

  function renderIngredients() {
    el.ingredients.innerHTML = '';
    for (const ing of recipe.ingredients) {
      const li = document.createElement('li');
      li.textContent = scaleIngredient(ing, factor);
      el.ingredients.appendChild(li);
    }
    const scaledServings = Math.round(baseServings * factor * 100) / 100;
    el.servingsLabel.textContent = recipe.servings
      ? `Makes about ${scaledServings} serving${scaledServings === 1 ? '' : 's'}`
      : '';
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

  el.instructions.innerHTML = '';
  recipe.instructions.forEach((step) => {
    const li = document.createElement('li');
    li.textContent = step;
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

  function showNotFound() {
    el.main.hidden = true;
    el.notFound.hidden = false;
  }
})();
