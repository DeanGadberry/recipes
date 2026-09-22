// Ingredient-quantity formatting and scaling helpers.

const NICE_FRACTIONS = [
  [0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'],
  [3 / 8, '⅜'], [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'],
  [3 / 4, '¾'], [7 / 8, '⅞'], [1, ''],
];

function formatQty(n) {
  if (n === null || n === undefined) return '';
  if (n <= 0) return '0';

  const whole = Math.floor(n);
  const frac = n - whole;

  let best = NICE_FRACTIONS[0];
  let bestDiff = Infinity;
  for (const pair of NICE_FRACTIONS) {
    const diff = Math.abs(frac - pair[0]);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = pair;
    }
  }

  if (bestDiff > 0.05) {
    // Not close to a clean cooking fraction; fall back to a rounded decimal.
    const rounded = Math.round(n * 100) / 100;
    return String(rounded);
  }

  let w = whole;
  let symbol = best[1];
  if (best[0] === 1) {
    w += 1;
    symbol = '';
  }

  if (w === 0 && symbol) return symbol;
  if (symbol) return `${w} ${symbol}`;
  return String(w);
}

function scaleIngredient(ingredient, factor) {
  if (ingredient.quantity === null || ingredient.quantity === undefined) {
    return ingredient.raw;
  }
  const scaled = ingredient.quantity * factor;
  const parts = [formatQty(scaled)];
  if (ingredient.unit) parts.push(ingredient.unit + (scaled !== 1 && !ingredient.unit.endsWith('s') && isPluralizable(ingredient.unit) ? 's' : ''));
  parts.push(ingredient.item);
  return parts.filter(Boolean).join(' ');
}

const PLURALIZABLE_UNITS = new Set([
  'cup', 'quart', 'pint', 'gallon',
  'clove', 'can', 'package', 'stick', 'slice', 'pinch', 'dash', 'bunch', 'head',
]);

function isPluralizable(unit) {
  return PLURALIZABLE_UNITS.has(unit);
}

const SERVING_PRESETS = [0.5, 1, 2, 3, 4];
