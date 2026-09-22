// Injects the shared SVG icon/illustration sprite once per page so any
// element can reference it with <svg><use href="#icon-name"></use></svg>
// without every HTML file duplicating the markup.
(function () {
  fetch('assets/img/icons.svg')
    .then((r) => r.text())
    .then((svg) => {
      const wrap = document.createElement('div');
      wrap.hidden = true;
      wrap.innerHTML = svg;
      document.body.prepend(wrap);
    })
    .catch(() => {});
})();

function icon(name, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}" aria-hidden="true"><use href="#${name}"></use></svg>`;
}

const CATEGORY_ICONS = {
  breakfast: 'cat-breakfast',
  brunch: 'cat-breakfast',
  lunch: 'cat-lunch',
  sandwich: 'cat-lunch',
  dinner: 'cat-dinner',
  'main course': 'cat-dinner',
  main: 'cat-dinner',
  entree: 'cat-dinner',
  dessert: 'cat-dessert',
  sweets: 'cat-dessert',
  baking: 'cat-bread',
  bread: 'cat-bread',
  drink: 'cat-drink',
  beverage: 'cat-drink',
  cocktail: 'cat-drink',
  'slow cooker': 'cat-pot',
  'crock pot': 'cat-pot',
  soup: 'cat-pot',
  stew: 'cat-pot',
  salad: 'cat-salad',
  side: 'cat-salad',
};

function categoryIcon(category) {
  const key = (category || '').trim().toLowerCase();
  return CATEGORY_ICONS[key] || 'icon-leaf';
}
