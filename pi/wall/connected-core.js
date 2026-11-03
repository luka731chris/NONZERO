(function (root) {
  'use strict';
  function stamp(x) {
    return typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : null;
  }
  function start(r) {
    const direct = stamp(r.startedAt) || stamp(r.pm5Motion?.startedAt) || stamp(r.timer?.startedAt);
    if (direct) return direct;
    const match = /^(?:nz|pm5)-([0-9a-z]+)$/.exec(r.sessionId || '');
    if (match) {
      const n = parseInt(match[1], 36);
      if (Number.isFinite(n) && n > 1262304000000 && n < Date.now() + 60000) return n;
    }
    return null;
  }
  function bounds(r) {
    const s = start(r),
      end =
        stamp(r.endedAt) ||
        stamp(r.completedAt) ||
        stamp(r.victoryStartedAt) ||
        (s && Number(r.duration) > 0 ? s + Number(r.duration) * 60000 : null);
    return s && end && end >= s ? [s, end] : null;
  }
  function compatible(r, activity) {
    const type = String(r.type || r.programSnapshot?.type || '').toLowerCase();
    if (/walk|run|swim/.test(type)) return false;
    if (/row|ski/.test(type) && /bike/i.test(activity.machine)) return false;
    if (/bike|cycling/.test(type) && /row|ski/i.test(activity.machine)) return false;
    return true;
  }
  function merge(base, activities) {
    const rows = Array.isArray(base) ? base : [],
      out = rows.slice();
    let ambiguous = 0,
      added = 0;
    for (const a of activities || []) {
      if (!(a.movingMinutes >= 5) || !a.id || !a.date) continue;
      const possible = rows.filter((r) => r.date === a.date && compatible(r, a));
      const matched = possible.some(
        (r) =>
          (r.recordingIds || []).includes(a.id) ||
          r.sessionId === a.id ||
          r.id === a.id ||
          r.recordingId === a.id ||
          (() => {
            const b = bounds(r);
            if (!b) return false;
            const overlap = Math.max(0, Math.min(b[1], a.end) - Math.max(b[0], a.start));
            return overlap >= Math.min(60000, (a.end - a.start) * 0.5);
          })()
      );
      if (matched) continue;
      // Untimed same-day activities cannot be safely added twice. Preserve their
      // canonical totals and expose the unmatched recorder history separately.
      if (possible.some((r) => !bounds(r))) {
        ambiguous++;
        continue;
      }
      out.push({
        id: a.id,
        sessionId: a.id,
        date: a.date,
        startedAt: a.start,
        endedAt: a.end,
        duration: a.movingMinutes,
        completed: a.status === 'complete',
        status: a.status === 'complete' ? 'complete' : 'active',
        type: /bike/i.test(a.machine) ? 'bike' : /ski/i.test(a.machine) ? 'ski' : 'row',
        name: a.machine + ' · Recorded activity',
        completionSource: 'pm5-recorded',
        programSource: 'recorded-activity',
        programCredit: false,
        updatedAt: a.end
      });
      added++;
    }
    return { sessions: out, ambiguous, added };
  }
  root.NonZeroConnectedCore = { merge, start, bounds };
  if (typeof module !== 'undefined') module.exports = root.NonZeroConnectedCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
