// Small per-browser preferences: favorites, theme, and checked-off
// ingredients/steps. Everything here is localStorage-only (no server),
// consistent with the rest of the site's zero-backend approach.

const Prefs = (() => {
  const FAVORITES_KEY = 'recipe-favorites';
  const THEME_KEY = 'recipe-theme';
  const CHECKED_PREFIX = 'recipe-checked-';

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // storage unavailable (private browsing etc.) -- ignore
    }
  }

  // ---- Favorites ----
  function getFavorites() {
    return new Set(readJSON(FAVORITES_KEY, []));
  }

  function isFavorite(slug) {
    return getFavorites().has(slug);
  }

  function toggleFavorite(slug) {
    const favs = getFavorites();
    if (favs.has(slug)) {
      favs.delete(slug);
    } else {
      favs.add(slug);
    }
    writeJSON(FAVORITES_KEY, [...favs]);
    return favs.has(slug);
  }

  // ---- Theme ----
  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'auto';
  }

  function setTheme(theme) {
    try {
      if (theme === 'auto') {
        localStorage.removeItem(THEME_KEY);
        document.documentElement.removeAttribute('data-theme');
      } else {
        localStorage.setItem(THEME_KEY, theme);
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch (e) {
      // ignore
    }
  }

  function applyStoredTheme() {
    const theme = getTheme();
    if (theme !== 'auto') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  // ---- Checked-off ingredients/steps ----
  function getChecked(slug) {
    return new Set(readJSON(CHECKED_PREFIX + slug, []));
  }

  function toggleChecked(slug, itemKey) {
    const checked = getChecked(slug);
    if (checked.has(itemKey)) {
      checked.delete(itemKey);
    } else {
      checked.add(itemKey);
    }
    writeJSON(CHECKED_PREFIX + slug, [...checked]);
    return checked.has(itemKey);
  }

  applyStoredTheme();

  return {
    getFavorites, isFavorite, toggleFavorite,
    getTheme, setTheme,
    getChecked, toggleChecked,
  };
})();
