/* Shared workout lease and motion policy. Wall accepts advancing elapsed counters alongside distance; phone/cloud use distance/strokes first. */
(function (root) {
  'use strict';
  function create({ counterMode = 'conservative' } = {}) {
    const IDLE_MS = 4 * 60 * 60 * 1000,
      LEASE_MS = IDLE_MS,
      PHONE_MS = IDLE_MS;
    const live = new Set([
      'active',
      'running',
      'paused',
      'started',
      'resumed',
      'live',
      'in_progress',
      'in-progress'
    ]);
    function automated(a) {
      return !!a?.pm5Motion || /^pm5-(usb|ble|bluetooth)$/.test(String(a?.source || ''));
    }
    function activityAt(a, now = Date.now()) {
      const values = [
        a?.pm5Motion?.lastActivityAt,
        a?.pm5Motion?.startedAt,
        a?.updatedAt,
        a?.timerUpdatedAt,
        a?.statusUpdatedAt,
        a?.timer?.startedAt
      ]
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0 && n <= now + 30000);
      return values.length ? Math.min(now, Math.max(...values)) : 0;
    }
    function active(state, now = Date.now()) {
      const a = state?.activeWorkout;
      if (!a || !live.has(String(a.status || '').toLowerCase())) return null;
      if (
        a.sessionId &&
        (state.sessions || []).some((s) => s.completed === true && s.sessionId === a.sessionId)
      )
        return null;
      const stamp = activityAt(a, now);
      return stamp > 0 && stamp <= now + 1000 && now - stamp < (automated(a) ? LEASE_MS : PHONE_MS)
        ? a
        : null;
    }
    function motion(t, previous, now = Date.now()) {
      if (!(
        t?.connected === true &&
        t.fresh !== false &&
        !t.recovering &&
        now - Number(t.updatedAt) >= -1000 &&
        now - Number(t.updatedAt) < 2500
      ))
        return false;
      if (!(
        (Number.isFinite(Number(t.watts)) && Number(t.watts) >= 5) ||
        (Number.isFinite(Number(t.cadence ?? t.rpm)) && Number(t.cadence ?? t.rpm) >= 3)
      ))
        return false;
      // Poll timestamps are not movement. Frozen end-of-workout values must age out.
      const keys =
        counterMode === 'wall'
          ? ['distanceMeters', 'strokeCount', 'elapsedSeconds']
          : ['distanceMeters', 'strokeCount'];
      let shared = keys.filter((k) => Number.isFinite(t[k]) && Number.isFinite(previous?.[k]));
      if (
        counterMode !== 'wall' &&
        !shared.length &&
        Number.isFinite(t.elapsedSeconds) &&
        Number.isFinite(previous?.elapsedSeconds)
      )
        shared = ['elapsedSeconds'];
      return !shared.length || shared.some((k) => t[k] !== previous[k]);
    }
    return { IDLE_MS, LEASE_MS, PHONE_MS, active, activityAt, automated, motion };
  }
  root.NonZeroWorkoutPolicy = { ...create(), create };
  if (typeof module !== 'undefined') module.exports = root.NonZeroWorkoutPolicy;
})(typeof globalThis !== 'undefined' ? globalThis : this);

globalThis.NonZeroWorkoutPolicy=globalThis.NonZeroWorkoutPolicy.create({counterMode:'wall'});
if(typeof module!=='undefined')module.exports=globalThis.NonZeroWorkoutPolicy;
