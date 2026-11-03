/* AutoPilot + NonZero shared rules. Embedded into standalone clients at release time. */
(function (root) {
  'use strict';
  const VERSION = '2026.10.1',
    TIME_ZONE = 'America/New_York';
  function dateKey(now = new Date()) {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
        .formatToParts(now)
        .map((x) => [x.type, x.value])
    );
    return `${p.year}-${p.month}-${p.day}`;
  }
  function dateAdd(key, n) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return '';
    const d = new Date(key + 'T12:00:00Z');
    if (!Number.isFinite(d.getTime())) return '';
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function minute(now = new Date()) {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      })
        .formatToParts(now)
        .map((x) => [x.type, x.value])
    );
    return +p.hour * 60 + +p.minute;
  }
  function clockMinutes(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const m = String(value || '')
      .trim()
      .match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (!m || +m[2] > 59 || (!m[3] && +m[1] > 23) || (m[3] && (+m[1] < 1 || +m[1] > 12)))
      return null;
    return (m[3] ? (+m[1] % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0) : +m[1]) * 60 + +m[2];
  }
  function clock(m) {
    if (m == null) return '';
    m = ((Math.round(m) % 1440) + 1440) % 1440;
    return `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')} ${m >= 720 ? 'PM' : 'AM'}`;
  }
  function external(s) {
    return (
      ['manual', 'apple-health'].includes(s?.completionSource) ||
      ['manual', 'apple-health'].includes(s?.programSource)
    );
  }
  function currentRecord(sessions, today = dateKey()) {
    return (
      (sessions || [])
        .filter((s) => s?.date === today && !external(s))
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))[0] || null
    );
  }
  function metrics(sessions, now = new Date()) {
    const today = dateKey(now),
      dow = new Date(today + 'T12:00:00Z').getUTCDay(),
      start = dateAdd(today, -dow),
      keys = Array.from({ length: 7 }, (_, i) => dateAdd(start, i)),
      started = new Set(),
      completed = new Set(),
      allCompleted = new Set(),
      mins = Array(7).fill(0);
    let weekMinutes = 0;
    const current = new Set(),
      prior = new Set();
    // Count finalized workouts only, once per stable recording/session identity.
    // Scheduled and in-progress durations must never inflate completed minutes.
    const seenWorkoutIds = new Set();
    for (const s of sessions || []) {
      const isCompleted = s?.completed === true || s?.status === 'complete' || s?.status === 'completed';
      if (!isCompleted) continue;
      const workoutId = String(s.sessionId || s.recordingId || s.id || '').trim();
      if (workoutId && seenWorkoutIds.has(workoutId)) continue;
      if (workoutId) seenWorkoutIds.add(workoutId);
      const k = s?.date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k || '') || k > today) continue;
      if (isCompleted) allCompleted.add(k);
      if (k >= start) {
        started.add(k);
        if (isCompleted) completed.add(k);
        const rawDuration = Number(s.duration);
        const dur = Number.isFinite(rawDuration) ? Math.max(0, rawDuration) : 0;
        weekMinutes += dur;
        mins[keys.indexOf(k)] += dur;
      }
      if (k >= dateAdd(today, -27)) current.add(k);
      else if (k >= dateAdd(today, -55)) prior.add(k);
    }
    let cursor = allCompleted.has(today) ? today : dateAdd(today, -1),
      streak = 0;
    while (allCompleted.has(cursor) && streak < 3660) {
      streak++;
      cursor = dateAdd(cursor, -1);
    }
    const weekCount = started.size,
      opportunity = dow + 1,
      adherence = Math.round((weekCount * 100) / opportunity);
    return {
      today,
      start,
      end: keys[6],
      keys,
      started,
      completed,
      mins,
      weekCount,
      weekMinutes,
      streak,
      opportunity,
      adherence,
      missed: keys.slice(0, dow).filter((k) => !started.has(k)).length,
      momentumDays: current.size,
      priorMomentumDays: prior.size,
      momentumDelta: current.size - prior.size,
      score: Math.round(
        Math.min(
          100,
          45 +
            Math.min(25, streak * 3) +
            Math.min(20, adherence * 0.2) +
            Math.min(10, (current.size / 28) * 10)
        )
      )
    };
  }
  function activeDay(agenda, now = new Date()) {
    const key = dateKey(now);
    return (
      (agenda?.days || []).find((d) => d.date === key) || (agenda?.date === key ? agenda : null)
    );
  }
  function timeline(agenda, now = new Date(), includeHidden = true) {
    const today = dateKey(now),
      n = minute(now),
      day = activeDay(agenda, now);
    const rows = [];
    for (const d of agenda?.days?.length ? agenda.days : agenda?.date ? [agenda] : []) {
      if (d.date < today) continue;
      for (const item of d.items || []) {
        if (!item || (!includeHidden && item.showOnWall === false)) continue;
        const m = clockMinutes(item.start24 || item.time);
        if (m == null) continue;
        let end = clockMinutes(item.end24);
        if (end != null && end < m) end += 1440;
        rows.push({
          ...item,
          _m: m,
          _end: end ?? m + 5,
          _date: d.date,
          _tomorrow: d.date === dateAdd(today, 1),
          _future: d.date !== today
        });
      }
    }
    rows.sort((a, b) => a._date.localeCompare(b._date) || a._m - b._m);
    const out = rows.filter((x) => x._date === today),
      current = [...out].reverse().find((x) => x._m <= n && x._end >= n) || null,
      future = rows.filter((x) => x._date > today || x._m > n);
    return {
      day,
      out,
      current,
      now: current,
      next: future[0] || null,
      later: future[1] || null,
      count: out.length,
      n
    };
  }
  function eventLabel(x, empty = '') {
    return x
      ? `${x._future ? (x._tomorrow ? 'Tomorrow' : x._date) + ' · ' : ''}${x.time || clock(x._m)} · ${x.title || 'Commitment'}`
      : empty;
  }
  function opportunity(agenda, now = new Date()) {
    const day = activeDay(agenda, now),
      n = minute(now);
    if (!day) return { known: false, minutes: null, label: 'Choose the session that fits today' };
    const blocked = (day.busyIntervals || [])
      .map((x) => ({ start: clockMinutes(x.start), end: clockMinutes(x.end) }))
      .filter((x) => x.start != null && x.end != null && x.end > x.start);
    for (const x of timeline(agenda, now).out)
      blocked.push({ start: Math.max(0, x._m - 15), end: x._end + 10 });
    blocked.sort((a, b) => a.start - b.start);
    let cursor = Math.max(n, 360);
    for (const b of blocked) {
      if (b.end <= cursor) continue;
      if (b.start - cursor >= 10) break;
      cursor = Math.max(cursor, b.end);
    }
    const next = blocked.find((x) => x.start >= cursor),
      minutes = Math.max(0, Math.floor(Math.min(next?.start ?? 1320, 1320) - cursor));
    return {
      known: true,
      start: cursor,
      minutes,
      mode: minutes < 30 ? 'minimum' : 'full',
      label:
        minutes >= 10
          ? `${Math.min(minutes, 45)} minutes ${cursor > n ? 'from ' + clock(cursor) : 'available now'}`
          : 'No clear 10-minute window left today',
      suggestion:
        minutes < 10
          ? 'Log activity you already did'
          : minutes < 30
            ? 'Minimum session fits this window'
            : 'Full or minimum session'
    };
  }
  function key(s) {
    return s?.id || s?.sessionId || s?.date;
  }
  const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x))),
    equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  // Rebase edits made locally since the last acknowledged snapshot onto a fresh cloud state.
  function rebase(base, local, remote) {
    const out = clone(remote || {});
    for (const k of Object.keys(local || {})) {
      if (
        [
          '_meta',
          'sessions',
          'autopilotAgenda',
          'suitePreferences',
          'healthImport',
          'activeWorkout',
          'pm5Analytics',
          'bodyMeasurements',
          'weightSync'
        ].includes(k)
      )
        continue;
      if (!equal(local[k], base?.[k])) out[k] = clone(local[k]);
    }
    if (!equal(local?.activeWorkout, base?.activeWorkout)) {
      const l = local?.activeWorkout,
        b = base?.activeWorkout,
        r = remote?.activeWorkout;
      if (l && b && r && l.sessionId === b.sessionId && l.sessionId === r.sessionId) {
        out.activeWorkout = clone(r);
        for (const k of Object.keys(l)) if (!equal(l[k], b[k])) out.activeWorkout[k] = clone(l[k]);
      } else out.activeWorkout = clone(l);
    }
    const b = new Map((base?.sessions || []).map((x) => [key(x), x])),
      l = new Map((local?.sessions || []).map((x) => [key(x), x])),
      r = new Map((remote?.sessions || []).map((x) => [key(x), x]));
    for (const [id] of b) if (!l.has(id)) r.delete(id);
    for (const [id, x] of l) if (!equal(x, b.get(id))) r.set(id, clone(x));
    out.sessions = [...r.values()];
    const bm = base?.pm5Analytics || {},
      lm = local?.pm5Analytics || {},
      rm = remote?.pm5Analytics || {};
    if (!equal(bm, lm)) {
      const rides = new Map((rm.rides || []).map((x) => [x.id, x]));
      for (const x of lm.rides || [])
        if (!rides.has(x.id) || Number(x.updatedAt || 0) >= Number(rides.get(x.id).updatedAt || 0))
          rides.set(x.id, clone(x));
      const health = new Map((rm.health || []).map((x) => [x.id, x]));
      for (const x of lm.health || []) health.set(x.id, clone(x));
      out.pm5Analytics = {
        ...clone(rm),
        ...clone(lm),
        rides: [...rides.values()],
        health: [...health.values()],
        profile: !equal(lm.profile, bm.profile) ? clone(lm.profile) : clone(rm.profile || {}),
        updatedAt: Math.max(Number(lm.updatedAt || 0), Number(rm.updatedAt || 0))
      };
    }
    const bh = base?.healthImport || {},
      lh = local?.healthImport || {},
      rh = remote?.healthImport || {};
    if (!equal(bh, lh)) {
      const decisions = { ...(rh.decisions || {}) };
      for (const id of Object.keys(bh.decisions || {}))
        if (!(id in (lh.decisions || {})) && equal(decisions[id], bh.decisions[id]))
          delete decisions[id];
      for (const [id, d] of Object.entries(lh.decisions || {}))
        if (!equal(d, bh.decisions?.[id]) && Number(d.at || 0) >= Number(decisions[id]?.at || 0))
          decisions[id] = d;
      const review = { ...(rh.review || {}) };
      for (const [id, v] of Object.entries(lh.review || {}))
        if (!equal(v, bh.review?.[id])) review[id] = v;
      for (const id of Object.keys(decisions)) delete review[id];
      out.healthImport = { ...clone(rh), decisions, review };
      out.sessions = out.sessions.filter(
        (x) =>
          !x.healthKit ||
          !['user-deleted', 'health-deleted'].includes(decisions[x.healthKit.uuid]?.action)
      );
    }
    const weights = new Map((remote?.bodyMeasurements || []).map((x) => [x.id, x]));
    const baseWeights = new Map((base?.bodyMeasurements || []).map((x) => [x.id, x]));
    for (const x of local?.bodyMeasurements || [])
      if (!equal(x, baseWeights.get(x.id))) weights.set(x.id, clone(x));
    out.bodyMeasurements = [...weights.values()];
    return out;
  }
  root.NonZeroSuite = {
    VERSION,
    TIME_ZONE,
    dateKey,
    dateAdd,
    minute,
    clockMinutes,
    clock,
    external,
    currentRecord,
    metrics,
    activeDay,
    timeline,
    eventLabel,
    opportunity,
    rebase
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
