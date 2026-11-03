/* NONZERO Wall pairing recovery: independent of app.js boot and optional modules. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const status = message => { const el = $('setupStatus'); if (el) el.textContent = message; };
  let busy = false;
  async function claim(event) {
    const button = event.target && event.target.closest && event.target.closest('#pairButton');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (busy) return;
    const code = ($('pairCode')?.value || '').trim();
    const endpoint = ($('endpointInput')?.value || localStorage.getItem('nz.endpoint') || '').trim().replace(/\/+$/, '');
    if (!/^\d{6}$/.test(code)) return status('Enter the six-digit pairing code.');
    let url;
    try {
      url = new URL(endpoint);
      if (url.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(url.hostname)) throw Error('HTTPS required');
    } catch { return status('Enter the full HTTPS Cloudflare Worker URL.'); }
    busy = true;
    button.disabled = true;
    status('Pairing with Cloudflare…');
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 15000);
    try {
      const response = await fetch(endpoint + '/pair/claim', {
        method: 'POST', signal: abort.signal,
        headers: {'Content-Type':'application/json', 'Accept':'application/json'},
        body: JSON.stringify({code})
      });
      let body;
      try { body = await response.json(); } catch { throw Error('Worker returned a non-JSON response'); }
      if (!response.ok || !body?.wallToken) throw Error(body?.error || 'Worker rejected pairing (' + response.status + ')');
      localStorage.setItem('nz.endpoint', endpoint);
      localStorage.setItem('nz.wallToken', body.wallToken);
      status('PAIRED · restarting Wall to load cloud state…');
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      status('Pairing failed: ' + (e.name === 'AbortError' ? 'Worker request timed out' : e.message));
      busy = false;
      button.disabled = false;
    } finally { clearTimeout(timer); }
  }
  // Capturing phase runs before any app.js button handler and survives app boot errors.
  document.addEventListener('click', claim, true);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (document.activeElement?.id !== 'pairButton') return;
    // Native button activation generates a click; do not submit twice.
  }, true);
  window.__nonzeroPairingRecovery = '1.0';
})();
