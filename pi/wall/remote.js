(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const showOnOpen = new URLSearchParams(location.search).get('show') === '1';
  let key = location.hash.slice(1),
    pending = null,
    busy = false,
    connected = false;
  try {
    key = key || sessionStorage.getItem('nz.remote.key') || '';
  } catch {}
  history.replaceState(null, '', location.pathname);
  window.addEventListener('hashchange', () => {
    if (!location.hash) return;
    key = location.hash.slice(1);
    connected = false;
    history.replaceState(null, '', location.pathname);
    void poll();
  });
  async function request(path, body) {
    const abort = new AbortController(),
      timeout = setTimeout(() => abort.abort(), 8000);
    try {
      const r = await fetch(path, {
        signal: abort.signal,
        cache: 'no-store',
        headers: {
          'X-NONZERO-Remote': key,
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body ? { method: 'POST', body: JSON.stringify(body) } : {})
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Connection failed');
      return d;
    } finally {
      clearTimeout(timeout);
    }
  }
  async function poll() {
    if (!key || busy) return;
    busy = true;
    try {
      const d = await request('/status');
      if (!connected) {
        await request('/connected', {});
        connected = true;
      }
      try {
        sessionStorage.setItem('nz.remote.key', key);
      } catch {}
      $('access').hidden = true;
      $('controls').hidden = false;
      $('status').textContent = d.wallOnline
        ? `Wall connected · ${d.status.mode || 'starting'} · Pi ${d.status.version || ''} · ${d.status.cloud || 'checking cloud'}`
        : 'Pi reachable; Wall browser is not responding. Controls expire after 30 seconds.';
      if (pending && d.receipt?.id === pending) {
        $('receipt').textContent =
          d.receipt.message || (d.receipt.ok ? 'Applied on Wall.' : 'Could not apply control.');
        pending = null;
      }
      document
        .querySelectorAll('[data-action],#pair button')
        .forEach((b) => (b.disabled = !!d.pending));
    } catch (e) {
      $('status').textContent = e.message;
      $('access').hidden = false;
      $('controls').hidden = true;
    } finally {
      busy = false;
    }
  }
  async function send(body) {
    try {
      const d = await request('/control', body);
      pending = d.id;
      $('receipt').textContent = 'Sent · waiting for the Wall…';
      if (body.action === 'pair') $('code').value = '';
      await poll();
    } catch (e) {
      $('receipt').textContent = e.message;
    }
  }
  async function showAccess() {
    try {
      const r = await fetch('/show-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      const d = await r.json();
      $('accessMessage').textContent = d.message || d.error;
    } catch {
      $('accessMessage').textContent = 'Pi unreachable. Check the same Wi-Fi connection.';
    }
  }
  $('showAccess').onclick = showAccess;
  if (showOnOpen) void showAccess();
  $('access').onsubmit = (e) => {
    e.preventDefault();
    key = $('key').value.trim();
    connected = false;
    $('key').value = '';
    void poll();
  };
  $('pair').onsubmit = (e) => {
    e.preventDefault();
    void send({ action: 'pair', code: $('code').value.trim() });
  };
  document
    .querySelectorAll('[data-action]')
    .forEach((b) => (b.onclick = () => send({ action: b.dataset.action })));
  $('forget').onclick = () => {
    key = '';
    connected = false;
    try {
      sessionStorage.removeItem('nz.remote.key');
    } catch {}
    $('access').hidden = false;
    $('controls').hidden = true;
    $('status').textContent = 'Disconnected. Scan the TV code to reconnect.';
  };
  if (!key) $('status').textContent = 'Scan the QR on your TV, or enter the TV access code.';
  void poll();
  setInterval(() => {
    if (!document.hidden) void poll();
  }, 2000);
})();
