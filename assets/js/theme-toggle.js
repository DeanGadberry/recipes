// Wires up the header's dark-mode toggle button, if present on this page.
(function () {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const useIcon = btn.querySelector('use');

  function isDark() {
    const explicit = Prefs.getTheme();
    if (explicit === 'dark') return true;
    if (explicit === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function updateIcon() {
    useIcon.setAttribute('href', isDark() ? '#icon-sun' : '#icon-moon');
  }

  btn.addEventListener('click', () => {
    Prefs.setTheme(isDark() ? 'light' : 'dark');
    updateIcon();
  });

  updateIcon();
})();
