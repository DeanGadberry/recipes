// Shared recipe-card renderer, used by the browse grid (app.js) and the
// "More from the box" related-recipes strip (recipe.js) so both stay in
// sync automatically instead of maintaining two copies of the markup.

function renderRecipeCard(recipe, onFavoriteChange) {
  const a = document.createElement('a');
  a.href = `recipe.html?slug=${encodeURIComponent(recipe.slug)}`;
  a.className = 'card';

  const thumb = document.createElement('div');
  thumb.className = 'card-thumb';
  if (recipe.image) {
    thumb.style.backgroundImage = `url("${recipe.image}")`;
  } else {
    thumb.classList.add('no-image');
    thumb.innerHTML = icon(categoryIcon(recipe.category));
  }

  const favBtn = document.createElement('button');
  favBtn.type = 'button';
  favBtn.className = 'card-fav icon-btn' + (Prefs.isFavorite(recipe.slug) ? ' active' : '');
  favBtn.setAttribute('aria-label', 'Toggle favorite');
  favBtn.innerHTML = icon(Prefs.isFavorite(recipe.slug) ? 'icon-heart' : 'icon-heart-outline');
  favBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isFav = Prefs.toggleFavorite(recipe.slug);
    favBtn.classList.toggle('active', isFav);
    favBtn.querySelector('use').setAttribute('href', isFav ? '#icon-heart' : '#icon-heart-outline');
    if (onFavoriteChange) onFavoriteChange(isFav, recipe.slug);
  });
  thumb.appendChild(favBtn);
  a.appendChild(thumb);

  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('h3');
  title.textContent = recipe.name;
  body.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  const bits = [];
  if (recipe.category) bits.push(`<span>${icon(categoryIcon(recipe.category))}${recipe.category}</span>`);
  if (recipe.total_time_minutes) bits.push(`<span>${icon('icon-clock')}${recipe.total_time_minutes} min</span>`);
  if (recipe.servings_label) bits.push(`<span>${icon('icon-servings')}${recipe.servings_label}</span>`);
  meta.innerHTML = bits.join('');
  body.appendChild(meta);

  a.appendChild(body);
  return a;
}
