(() => {
  let busy = false,
    next = 0;
  let lastReconcile = 0;
  async function sync() {
    if (busy || Date.now() < next) return;
    const endpoint = localStorage.getItem('nz.endpoint'),
      token = localStorage.getItem('nz.wallToken');
    if (!endpoint || !token) return;
    busy = true;
    next = Date.now() + 60000;
    try {
      let offset = 0,
        all = [],
        d;
      do {
        const res = await fetch('/api/metrics/rides?limit=100&offset=' + offset);
        if (!res.ok) throw Error('recorder unavailable');
        d = await res.json();
        all.push(...d.rides);
        offset += d.rides.length;
        if (!d.rides.length) break;
      } while (offset < d.total);
      const acknowledged = JSON.parse(localStorage.getItem('nz.metricsAcknowledged') || '{}');
      const signature = (r) =>
        JSON.stringify([
          r.end,
          r.updatedAt,
          r.analytics.calculationVersion,
          r.analytics.profileUsed
        ]);
      const pending = all.filter(
        (r) => r.status === 'complete' && acknowledged[r.id] !== signature(r)
      );
      for (let offset = 0; offset < pending.length; offset += 10) {
        const batch = pending.slice(offset, offset + 10),
          controller = new AbortController(),
          timer = setTimeout(() => controller.abort(), 12000);
        try {
          const res = await fetch(endpoint.replace(/\/$/, '') + '/wall/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-NONZERO-Wall': token },
            body: JSON.stringify({ schemaVersion: 1, rides: batch }),
            signal: controller.signal
          });
          if (!res.ok) {
            next = Date.now() + 15 * 60000;
            return;
          }
          const data = await res.json();
          for (const id of data.accepted || []) {
            const r = batch.find((r) => r.id === id);
            if (r) acknowledged[id] = signature(r);
          }
          localStorage.setItem('nz.metricsAcknowledged', JSON.stringify(acknowledged));
        } finally {
          clearTimeout(timer);
        }
      }
      if (pending.length > 0 || Date.now() - lastReconcile > 15 * 60000) {
        const ids = all
          .filter((r) => r.status === 'complete' && Date.now() - r.end < 7 * 86400000)
          .map((r) => r.id)
          .slice(0, 100);
        if (ids.length) {
          const r = await fetch(endpoint.replace(/\/$/, '') + '/wall/pm5/reconcile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-NONZERO-Wall': token },
            body: JSON.stringify({ mode: 'auto', ids }),
            signal: AbortSignal.timeout(12000)
          });
          if (r.ok) lastReconcile = Date.now();
        }
      }
    } catch {
      next = Date.now() + 5 * 60000;
    } finally {
      busy = false;
    }
  }
  setInterval(sync, 60000);
  setTimeout(sync, 15000);
})();
