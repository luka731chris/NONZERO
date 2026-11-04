(() => {
  'use strict';
  let context = {},
    busy = false,
    scope = '',
    mirrorSignature = '',
    lastAccepted = -1,
    lastProof = null,
    retryAt = 0,
    delay = 2000,
    timer,
    apiError = '',
    lastRetry = '';
  async function local(body) {
    const r = await fetch(
      '/api/coaching',
      body
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, ...(body.kind !== 'binding' ? { scope } : {}) }),
            signal: AbortSignal.timeout(5000)
          }
        : { cache: 'no-store', signal: AbortSignal.timeout(5000) }
    );
    const d = await r.json();
    if (!r.ok) throw Error(d.error || 'Pi coaching storage unavailable');
    return d;
  }
  async function bind() {
    const c = context.getConfig?.() || {},
      token = c.wallToken || '',
      account = token.startsWith('nz2.') ? token.split('.')[1] : token,
      raw = (c.endpoint || '') + '|' + account;
    if (!account) return false;
    const hash = [
      ...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)))
    ]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('');
    if (scope !== hash) {
      scope = hash;
      mirrorSignature = '';
      lastAccepted = -1;
      await local({ kind: 'binding', value: hash });
    }
    return true;
  }
  async function sync() {
    if (busy) return;
    busy = true;
    try {
      const bound = await bind(),
        state = context.getState?.() || {};
      let s = await local();
      const backend = context.getConfig?.().coachStatus;
      if (bound && backend && backend !== s.backendStatus) {
        s = await local({
          kind: 'accept',
          value: {
            doc: s.doc,
            backendStatus: backend,
            error:
              backend === 'ready'
                ? null
                : backend === 'setup_required'
                  ? 'Deploy Worker 5.14 and bind NONZERO_COACH. Existing local records are retained.'
                  : 'Shared coaching is unavailable. Local records are retained.'
          }
        });
      }
      if (
        bound &&
        state.coachDoc &&
        state.coachDoc.revision >= s.doc.revision &&
        (state.coachDoc.revision !== lastAccepted ||
          s.pending.some((op) => state.coachDoc.applied?.includes(op.id)))
      ) {
        s = await local({ kind: 'accept', value: { doc: state.coachDoc } });
        lastAccepted = state.coachDoc.revision;
      }
      const mirror = {
        surgeryPlan: state.surgeryPlan || {},
        bodyMeasurements: state.bodyMeasurements || [],
        pm5Analytics: {
          health: (state.pm5Analytics?.health || []).filter(
            (x) => x?.type === 'HKQuantityTypeIdentifierBodyMass'
          )
        },
        sessions: (state.sessions || []).slice(-365).map((x) => ({
          date: x.date,
          completed: x.completed,
          status: x.status,
          duration: x.duration
        })),
        autopilotAgenda: state.autopilotAgenda || {}
      };
      const signature = JSON.stringify(mirror);
      if (signature !== mirrorSignature) {
        await local({ kind: 'mirror', value: mirror });
        mirrorSignature = signature;
      }
      if (bound && s.pending.length && !s.conflict && Date.now() >= retryAt) {
        const c = context.getConfig(),
          binding = scope;
        try {
          const r = await fetch(c.endpoint.replace(/\/$/, '') + '/coach', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-NONZERO-Wall': c.wallToken },
              body: JSON.stringify({ operations: s.pending.slice(0, 20) }),
              signal: AbortSignal.timeout(7000)
            }),
            d = await r.json();
          if (binding !== scope) return;
          if (r.ok) {
            await local({ kind: 'accept', value: { doc: d.doc, conflict: null, error: null } });
            delay = 2000;
            retryAt = 0;
            apiError = '';
          } else {
            apiError = d.error || 'Shared sync unavailable';
            if (d.doc)
              await local({
                kind: 'accept',
                value: {
                  doc: d.doc,
                  conflict: r.status === 409 ? { fields: d.fields, message: apiError } : null,
                  error: apiError
                }
              });
            else
              await local({
                kind: 'accept',
                value: {
                  doc: s.doc,
                  conflict: [400, 413].includes(r.status)
                    ? { message: apiError, fields: [] }
                    : null,
                  error:
                    r.status === 404
                      ? 'Deploy Worker 5.14 and bind NONZERO_COACH for shared sync.'
                      : apiError
                }
              });
            retryAt = Date.now() + delay;
            delay = Math.min(30000, delay * 2);
          }
        } catch (e) {
          apiError = e.message;
          retryAt = Date.now() + delay;
          delay = Math.min(30000, delay * 2);
        }
      }
      const proof = await fetch('/api/connection', {
        cache: 'no-store',
        signal: AbortSignal.timeout(4000)
      });
      if (proof.ok) lastProof = await proof.json();
      window.NonZeroGoalCoachUI?.render();
      decoratePerformance();
    } catch (e) {
      apiError = e.message;
    } finally {
      busy = false;
    }
  }
  function decoratePerformance() {
    const el = document.getElementById('coachPerformance');
    if (!el) return;
    const m = window.NonZeroGoalCoachUI?.snapshot();
    if (!m?.strengthTrend) {
      el.textContent = 'Strength history appears after comparable sets are logged.';
      return;
    }
    const t = m.strengthTrend.trends?.[0];
    el.textContent = t
      ? t.movement +
        ' · ' +
        (t.deltaPercent >= 0 ? '+' : '') +
        t.deltaPercent.toFixed(1) +
        '% COMPARABLE SET INDEX · ' +
        m.basis?.toFixed(1) +
        ' LB TREND'
      : 'STRENGTH + WEIGHT · Log comparable sets in your phone coach.';
  }
  window.NonZeroCoachBridge = {
    attach(value) {
      context = value;
      clearInterval(timer);
      timer = setInterval(sync, 5000);
      void sync();
    },
    sync,
    proof: () => lastProof,
    decoratePerformance,
    async acceptConnectionAck(ack) {
      if (ack)
        try {
          await fetch('/api/connection/ack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ack),
            signal: AbortSignal.timeout(2000)
          });
        } catch {}
    },
    retry(nonce) {
      if (nonce && nonce !== lastRetry) {
        lastRetry = nonce;
        context.retry?.();
        retryAt = 0;
        void sync();
      }
    },
    status: () => ({ error: apiError, scope })
  };
})();
