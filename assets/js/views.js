// Pluggable view-count tracking.
//
// Default backend: countapi.xyz, a free, no-signup hit-counter service --
// good enough for a personal recipe site with no server of its own.
// Swap CONFIG.backend to 'local' to disable the network call entirely and
// fall back to a per-browser count (stored in localStorage), or point
// CONFIG.namespace at your own counter service by editing the fetch URLs
// below.

const ViewTracker = (() => {
  const CONFIG = {
    backend: 'countapi', // 'countapi' | 'local'
    namespace: 'deangadberry-recipes',
  };

  const LOCAL_KEY = 'recipe-view-counts';

  function readLocal() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeLocal(counts) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(counts));
    } catch (e) {
      // storage unavailable (private browsing etc.) -- ignore
    }
  }

  function bumpLocal(slug) {
    const counts = readLocal();
    counts[slug] = (counts[slug] || 0) + 1;
    writeLocal(counts);
    return counts[slug];
  }

  // Record a view of `slug`. Returns a Promise<number|null> of the new count.
  async function recordView(slug) {
    const localCount = bumpLocal(slug);
    if (CONFIG.backend !== 'countapi') return localCount;
    try {
      const res = await fetch(`https://api.countapi.xyz/hit/${CONFIG.namespace}/${encodeURIComponent(slug)}`);
      if (!res.ok) return localCount;
      const data = await res.json();
      return typeof data.value === 'number' ? data.value : localCount;
    } catch (e) {
      return localCount;
    }
  }

  // Fetch (without incrementing) view counts for a list of slugs.
  // Returns Promise<Map<slug, count>>.
  async function getCounts(slugs) {
    const local = readLocal();
    if (CONFIG.backend !== 'countapi') {
      return new Map(slugs.map((s) => [s, local[s] || 0]));
    }
    const entries = await Promise.all(
      slugs.map(async (slug) => {
        try {
          const res = await fetch(`https://api.countapi.xyz/get/${CONFIG.namespace}/${encodeURIComponent(slug)}`);
          if (!res.ok) return [slug, local[slug] || 0];
          const data = await res.json();
          return [slug, typeof data.value === 'number' ? data.value : (local[slug] || 0)];
        } catch (e) {
          return [slug, local[slug] || 0];
        }
      })
    );
    return new Map(entries);
  }

  return { recordView, getCounts, CONFIG };
})();
