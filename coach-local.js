(() => {
  'use strict';
  let data = {
      ...NonZeroCoachProtocol.view(NonZeroCoachProtocol.empty()),
      pending: [],
      optimisticDoc: NonZeroCoachProtocol.empty(),
      mirror: {}
    },
    ui;
  async function request(body) {
    const r = await fetch(
        '/api/coaching',
        body
          ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...body, scope: data.scope }),
              signal: AbortSignal.timeout(6000)
            }
          : { cache: 'no-store', signal: AbortSignal.timeout(6000) }
      ),
      x = await r.json();
    if (!r.ok) {
      if (x.snapshot) data = x.snapshot;
      throw Error(x.error || 'The Pi could not save this change');
    }
    data = x;
    return x;
  }
  async function refresh() {
    try {
      await request();
      ui?.render();
    } catch (e) {
      data.syncError = e.message;
      ui?.render();
    }
  }
  const adapter = {
    snapshot: () => data,
    getState: () => data.mirror || {},
    ready: () => data.backendStatus === 'ready' && !data.syncError,
    save: async (kind, key, patch, base) => {
      const op = NonZeroCoachProtocol.operation(base || data.optimisticDoc, kind, key, patch);
      if (Object.keys(op.patch).length) await request({ kind: 'operations', operations: [op] });
      return data;
    },
    enqueue: async (operations) => request({ kind: 'operations', operations }),
    resolve: async (value) => request({ kind: 'resolve', value }),
    connection: async () => {
      const r = await fetch('/api/connection', { signal: AbortSignal.timeout(5000) }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      return d;
    },
    retry: async () => {
      await fetch('/api/connection/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(5000)
      });
      await refresh();
    },
    export: async () => {
      const r = await fetch('/api/connection/export', { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw Error('Diagnosis unavailable');
      return r.json();
    }
  };
  void request()
    .then(() => {
      ui = NonZeroCoachUI.mount(document.getElementById('coachApp'), adapter);
    })
    .catch((e) => {
      document.getElementById('coachApp').textContent =
        e.message + ' · Use home WiFi and reopen this page.';
    });
  setInterval(refresh, 5000);
  window.addEventListener('online', refresh);
  window.addEventListener('pageshow', refresh);
})();
