/* Recorded PM5 activity is evidence, not proof of unlogged strength work. */
(function (root) {
  'use strict';
  const QUIET = 3 * 60 * 60 * 1000,
    clone = (x) => (x == null ? null : JSON.parse(JSON.stringify(x))),
    day = (t) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(t));
  const key = (r) => r?.id || r?.sessionId || r?.date;
  function strengthEvidence(r) {
    if (Array.isArray(r?.laps) && r.laps.length > 0) return true;
    return (
      [r?.sets, r?.partnerSets].some(
        (a) => Array.isArray(a) && a.some((x) => Array.isArray(x) && x.some(Boolean))
      ) || [r?.checks, r?.partnerChecks].some((a) => Array.isArray(a) && a.some(Boolean))
    );
  }
  function candidates(rides) {
    const groups = {};
    for (const r of rides || []) {
      const a = r?.analytics;
      if (
        r?.status !== 'complete' ||
        !/bike/i.test(r.machine || '') ||
        !a ||
        !Number.isFinite(r.start) ||
        !Number.isFinite(r.end) ||
        r.end <= r.start
      )
        continue;
      const seconds = Number(a.elapsedSeconds || a.observedSeconds || 0);
      if (!(seconds >= 60 && seconds <= 86400) || !(Number(a.movingSeconds) > 0)) continue;
      const date = day(r.start);

      const g =
        groups[date] ||
        (groups[date] = {
          date,
          rideIds: [],
          start: r.start,
          end: r.end,
          seconds: 0,
          segments: [],
          overlap: false,
          distance: 0,
          calories: 0
        });
      if (g.rideIds.includes(r.id)) continue;
      if (g.segments.some((s) => r.start < s.end - 2500 && r.end > s.start + 2500))
        g.overlap = true;
      g.segments.push({ start: r.start, end: r.end });
      g.rideIds.push(r.id);
      g.start = Math.min(g.start, r.start);
      g.end = Math.max(g.end, r.end);
      g.seconds += seconds;
      g.distance += Math.max(0, Number(a.distanceMetersObserved) || 0);
      g.calories += Math.max(0, Number(a.monitorCalories) || 0);
    }
    return Object.values(groups)
      .filter((g) => g.seconds >= 300)
      .map((g) => ({ ...g, rideIds: g.rideIds.sort(), duration: Math.round(g.seconds / 6) / 10 }));
  }
  function assess(state, g, now = Date.now()) {
    if (g.overlap) return 'overlap';
    const prior = state.pm5Replacements?.[g.date];
    if (prior) return 'replaced';
    if (state.pm5Decisions?.[g.date] === 'keep') return 'kept';
    const records = (state.sessions || []).filter((r) => r.date === g.date),
      a = state.activeWorkout;
    if (a?.date !== g.date && ['active', 'running', 'paused'].includes(a?.status))
      return 'in-progress';
    if (
      (state.eventLog || []).some(
        (e) => e.type === 'set_toggle' && Number.isFinite(e.at) && day(e.at) === g.date
      )
    )
      return 'mixed';
    if (records.some(strengthEvidence) || (a?.date === g.date && strengthEvidence(a)))
      return 'mixed';
    if (
      records.some(
        (r) =>
          !(r.pm5Motion || /^pm5/.test(r.completionSource || '') || r.recordingId) &&
          !(r.recordingIds || []).some((id) => g.rideIds.includes(id))
      )
    )
      return 'review';
    if (a?.date === g.date && ['active', 'running', 'paused'].includes(a.status)) {
      if (!/^pm5/.test(a.source || '')) return 'in-progress';
      const last = Math.max(
        Number(a.pm5Motion?.lastActivityAt) || 0,
        Number(a.lastInteractionAt) || 0
      );
      if (last > g.end && now - last < QUIET) return 'in-progress';
    }
    return now - g.end < QUIET ? 'waiting' : 'ready';
  }
  function apply(input, g, { now = Date.now(), manual = false, replaceId = null } = {}) {
    if (manual && g.overlap)
      throw Error(
        'Overlapping PM5 recordings cannot be combined safely. Review the recorder history first.'
      );
    const state = clone(input),
      status = assess(state, g, now);
    if (!manual && status !== 'ready') return { state, changed: false, status };
    if (state.pm5Replacements?.[g.date]) return { state, changed: false, status: 'replaced' };
    const a = state.activeWorkout;
    const same = (state.sessions || []).filter((r) => r.date === g.date),
      target = replaceId ? same.find((r) => key(r) === replaceId) : null;
    if (replaceId && !target && !(a?.date === g.date && key(a) === replaceId))
      throw Error('Saved workout changed. Reopen the review.');
    if (!manual && same.length > 1) return { state, changed: false, status: 'review' };
    const replaced = target || (!manual ? same[0] : null);
    if (
      same.some(
        (r) =>
          r !== replaced && (r.recordingIds || [r.recordingId]).some((id) => g.rideIds.includes(id))
      )
    )
      throw Error(
        'These PM5 recordings are already linked to another saved workout. Keep that workout or undo its replacement first.'
      );
    const observed = replaced?.programSnapshot || (a?.date === g.date ? a.programSnapshot : null);
    const scheduled =
      state.weeklyTemplate?.[new Date(g.date + 'T12:00:00Z').getUTCDay()] ||
      (state.todayPrescription?.date === g.date ? state.todayPrescription.program : null);
    const displaced = clone(
      observed?.source === 'pm5-live' || observed?.type === 'bike'
        ? scheduled || observed
        : observed || scheduled || (state.customToday?.date === g.date ? state.customToday : null)
    );
    const id = replaced
      ? key(replaced)
      : a?.date === g.date && (manual || /^pm5/.test(a.source || ''))
        ? a.sessionId
        : 'pm5-day-' + g.date;
    const program = {
      name: 'BikeErg · ' + g.duration + ' minutes',
      type: 'bike',
      source: 'pm5-recorded',
      why: 'Completed PM5 ride · actual activity replaces the planned session',
      full: [['BikeErg', g.duration + ' minutes · PM5 recorded']],
      minimum: [['BikeErg', g.duration + ' minutes · PM5 recorded']]
    };
    const record = {
      id,
      sessionId: replaced?.sessionId || id,
      date: g.date,
      name: program.name,
      type: 'bike',
      mode: 'full',
      status: 'complete',
      completed: true,
      programCredit: false,
      programSource: 'recorded-activity',
      completionSource: 'pm5-recorded',
      recordingIds: g.rideIds,
      startedAt: g.start,
      endedAt: g.end,
      duration: g.duration,
      timerMs: g.seconds * 1000,
      programSnapshot: program,
      exerciseNames: ['BikeErg'],
      sets: [[true]],
      checks: [true],
      setCount: 1,
      postMetrics: { duration: g.duration, distance: g.distance, calories: g.calories },
      pm5Recorded: { rideIds: g.rideIds, elapsedSeconds: g.seconds },
      updatedAt: now
    };
    state.sessions = (state.sessions || []).filter((r) => !replaced || key(r) !== key(replaced));
    state.sessions.push(record);
    state.pm5Replacements = {
      ...(state.pm5Replacements || {}),
      [g.date]: {
        recordId: id,
        rideIds: g.rideIds,
        displacedProgram: displaced,
        previousRecord: replaced || null,
        previousActive: a?.date === g.date ? clone(a) : null,
        at: now,
        method: manual ? 'manual' : 'three-hour-quiet'
      }
    };
    if (
      a?.date === g.date &&
      (manual || !['active', 'running', 'paused'].includes(a.status) || /^pm5/.test(a.source || ''))
    )
      state.activeWorkout = {
        ...clone(record),
        timer: { elapsedMs: g.seconds * 1000, running: false, startedAt: null }
      };
    return { state, changed: true, status: 'replaced' };
  }
  function undo(input, date) {
    const state = clone(input),
      r = state.pm5Replacements?.[date];
    if (!r) return state;
    state.sessions = (state.sessions || []).filter((x) => key(x) !== r.recordId);
    if (r.previousRecord) state.sessions.push(r.previousRecord);
    if (key(state.activeWorkout) === r.recordId) state.activeWorkout = r.previousActive || null;
    delete state.pm5Replacements[date];
    state.pm5Decisions = { ...(state.pm5Decisions || {}), [date]: 'keep' };
    return state;
  }
  function week(programs, state, today = day(Date.now())) {
    state = state || {};
    const start = new Date(today + 'T12:00:00Z');
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setUTCDate(d.getUTCDate() + i);
        return d.toISOString().slice(0, 10);
      }),
      plan = Object.fromEntries(
        dates.map((d, i) => [d, clone(state.weeklyTemplate?.[i] || programs[i])])
      );
    const strength = (p) => p?.type === 'strength' || /^Strength/i.test(p?.name || ''),
      recovery = (p) => p?.type === 'recovery' || /Recovery|Clinical|Post-op/i.test(p?.name || '');
    if (state.surgeryPlan?.date && today >= state.surgeryPlan.date) return plan;
    for (const date of dates) {
      const r = state.pm5Replacements?.[date];
      const missed = strength(r?.displacedProgram)
        ? r.displacedProgram
        : state.weeklyTemplate?.[new Date(date + 'T12:00:00Z').getUTCDay()];
      if (plan[date]?.pm5Replanned && !strength(plan[date])) continue;
      if (
        !r ||
        !strength(missed) ||
        (state.sessions || []).some(
          (x) =>
            x.date === date && x.completed && x.type === 'strength' && x.programCredit !== false
        )
      )
        continue;
      const index = dates.indexOf(date),
        tail = dates.slice(index + 1);
      if (
        !tail.length ||
        tail.some(
          (d) =>
            d < today ||
            (state.sessions || []).some((x) => x.date === d && x.completed) ||
            recovery(plan[d])
        ) ||
        strength(plan[tail.at(-1)])
      )
        continue;
      const before = clone(plan);
      let carry = {
        ...clone(missed),
        pm5SourceDay: new Date(date + 'T12:00:00Z').getUTCDay()
      };
      for (const d of tail) {
        const old = plan[d];
        plan[d] = {
          ...carry,
          why: (carry.why || '') + ' · Rebalanced after recorded BikeErg ride on ' + date,
          pm5Replanned: true
        };
        carry = {
          ...old,
          pm5SourceDay: old.pm5SourceDay ?? new Date(d + 'T12:00:00Z').getUTCDay()
        };
      }
      const strengthDates = dates.filter(
        (d) => d >= today && !state.pm5Replacements?.[d] && strength(plan[d])
      );
      for (const x of state.sessions || [])
        if (x.completed && x.type === 'strength' && x.date < today) strengthDates.push(x.date);
      const orderedStrengthDates = [...new Set(strengthDates)].sort();
      if (
        orderedStrengthDates.some(
          (d, i) =>
            i > 0 &&
            d >= today &&
            Date.parse(d) - Date.parse(orderedStrengthDates[i - 1]) < 2 * 86400000
        )
      )
        Object.assign(plan, before);
    }
    return plan;
  }
  root.NonZeroPm5Reconcile = { QUIET, candidates, assess, apply, undo, week, strengthEvidence };
  if (typeof module !== 'undefined') module.exports = root.NonZeroPm5Reconcile;
})(typeof globalThis !== 'undefined' ? globalThis : this);
