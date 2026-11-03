/* Persistent local rotation: content identity survives feed changes and restarts. */
(function (root) {
  'use strict';
  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const key = (q) => norm(q.text);
  const author = (q) => norm(q.author).replace(/^nonzero\b.*$/, 'nonzero');
  const concept = (q) =>
    q.concept && q.concept !== q.id ? 'concept:' + norm(q.concept) : 'text:' + key(q);
  const theme = (q) => norm(q.tags?.[0] || q.category || q.domain || 'general');
  function clean(rows) {
    const texts = new Set(),
      concepts = new Set();
    return (rows || []).filter((q) => {
      if (!q || typeof q.text !== 'string' || !q.text.trim() || !q.author) return false;
      const k = key(q),
        c = concept(q);
      if (!k || texts.has(k) || concepts.has(c)) return false;
      texts.add(k);
      concepts.add(c);
      return true;
    });
  }
  function create(storage, seed, legacy = []) {
    const stateKey = 'nz.quoteRotation.v3',
      cacheKey = 'nz.quoteCatalog.v3';
    let cached = [],
      state = { seen: [], recent: [], cycle: 1 };
    try {
      cached = JSON.parse(storage.getItem(cacheKey) || '[]');
      if (!Array.isArray(cached)) cached = [];
    } catch {}
    let catalog = clean([...(seed || []), ...cached]);
    try {
      const saved = JSON.parse(storage.getItem(stateKey) || 'null');
      if (saved && Array.isArray(saved.seen) && Array.isArray(saved.recent))
        state = {
          seen: saved.seen.filter((x) => typeof x === 'string'),
          recent: saved.recent.slice(-80),
          cycle: Number(saved.cycle) || 1,
          moods: saved.moods || {}
        };
      else
        state.seen = catalog
          .filter((q) => legacy.some((r) => r.id === q.id || r.id === q.text))
          .map(concept);
    } catch {}
    let seen = new Set(state.seen);
    function persist() {
      try {
        storage.setItem(stateKey, JSON.stringify({ ...state, seen: [...seen] }));
      } catch {}
    }
    function merge(rows) {
      catalog = clean([...catalog, ...rows]).slice(0, 2000);
      try {
        storage.setItem(cacheKey, JSON.stringify(catalog));
      } catch {}
      return catalog;
    }
    function pick(random = Math.random, options = {}) {
      if (!catalog.length) return null;
      let moodSeen = null;
      const named = catalog.filter((q) => author(q) !== 'nonzero'),
        branded = catalog.filter((q) => author(q) === 'nonzero');
      let candidates;
      if (named.length) {
        const brandAllowed =
          state.recent.length >= 19 && !state.recent.slice(-19).some((r) => r.author === 'nonzero');
        const brandTheme =
          typeof options.score === 'function'
            ? branded.filter((q) => options.score(q) > 0)
            : branded;
        candidates = brandAllowed && brandTheme.length && random() < 0.5 ? brandTheme : named;
      } else {
        const eligible =
          typeof options.score === 'function'
            ? catalog.filter((q) => options.score(q) > 0)
            : catalog;
        candidates = eligible.length ? eligible : catalog;
        if (options.context) {
          state.moods = state.moods || {};
          moodSeen = new Set(state.moods[options.context] || []);
        }
      }
      let available = candidates.filter((q) => !(moodSeen || seen).has(concept(q)));
      if (!available.length) {
        if (moodSeen) moodSeen.clear();
        else {
          for (const q of candidates) seen.delete(concept(q));
          state.cycle++;
        }
        available = candidates.slice();
      }
      // Mood is a preference among available named quotations, never a reason to
      // replace a broad author catalog with branded templates.
      if (named.length && candidates === named && typeof options.score === 'function') {
        const themed = available.filter((q) => options.score(q) > 0);
        if (themed.length >= 6 && random() < 0.8) available = themed;
      }
      const recent = state.recent,
        authors = new Set(recent.slice(-5).map((r) => r.author)),
        themes = new Set(recent.slice(-2).map((r) => r.theme)),
        last = recent.at(-1),
        brandUsed = recent.slice(-12).some((r) => r.author === 'nonzero');
      // Diversity relaxes only inside the remaining unseen pool. It never reintroduces a seen quote.
      const filters = [
        (q) =>
          !authors.has(author(q)) &&
          !themes.has(theme(q)) &&
          !(brandUsed && author(q) === 'nonzero'),
        (q) => !authors.has(author(q)) && !(brandUsed && author(q) === 'nonzero'),
        (q) => author(q) !== last?.author && concept(q) !== last?.concept,
        (q) => concept(q) !== last?.concept,
        () => true
      ];
      let q = null,
        remaining = available.slice();
      for (let attempt = 0; attempt < 3 && !q; attempt++) {
        if (attempt === 1)
          remaining = candidates.filter(
            (value) => !(moodSeen || seen).has(concept(value)) && !available.includes(value)
          );
        if (attempt === 2)
          remaining = candidates.filter((value) => (moodSeen || seen).has(concept(value)));
        while (remaining.length) {
          let pool = [];
          for (const f of filters) {
            pool = remaining.filter(f);
            if (pool.length) break;
          }
          const groups = new Map();
          for (const candidate of pool) {
            const a = author(candidate);
            if (!groups.has(a)) groups.set(a, []);
            groups.get(a).push(candidate);
          }
          const buckets = [...groups.values()],
            bucket = buckets[Math.min(buckets.length - 1, Math.floor(random() * buckets.length))],
            candidate = bucket[Math.min(bucket.length - 1, Math.floor(random() * bucket.length))];
          remaining = remaining.filter((value) => value !== candidate);
          if (typeof options.accept !== 'function' || options.accept(candidate)) {
            q = candidate;
            break;
          }
        }
        if (q && attempt === 2) {
          if (moodSeen) moodSeen.clear();
          else {
            for (const value of candidates) seen.delete(concept(value));
            state.cycle++;
          }
        }
      }
      if (!q) return null;
      seen.add(concept(q));
      if (moodSeen) {
        moodSeen.add(concept(q));
        state.moods[options.context] = [...moodSeen];
      }
      state.recent.push({ key: key(q), concept: concept(q), author: author(q), theme: theme(q) });
      state.recent = state.recent.slice(-80);
      persist();
      return q;
    }
    return {
      merge,
      pick,
      get catalog() {
        return catalog;
      },
      get stats() {
        return {
          size: catalog.length,
          remaining: catalog.filter((q) => !seen.has(concept(q))).length,
          cycle: state.cycle
        };
      }
    };
  }
  root.NonZeroQuoteRotation = { create, clean, key, concept, author, theme };
})(typeof globalThis !== 'undefined' ? globalThis : this);
