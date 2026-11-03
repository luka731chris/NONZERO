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
    // Retain prior measurements when a partial cloud snapshot omits history.
    for (const x of base?.bodyMeasurements || [])
      if (x?.id && !weights.has(x.id)) weights.set(x.id, clone(x));
    out.bodyMeasurements = [...weights.values()];
    // An empty agenda shell must not erase a previously valid published plan.
    const validAgenda = (ag) => ag && (Array.isArray(ag.days) ? ag.days.length > 0 : Boolean(ag.date));
    if (!validAgenda(out.autopilotAgenda))
      out.autopilotAgenda = validAgenda(local?.autopilotAgenda)
        ? clone(local.autopilotAgenda)
        : validAgenda(base?.autopilotAgenda) ? clone(base.autopilotAgenda) : out.autopilotAgenda;
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

'use strict';
(()=>{
const DEFAULT_ENDPOINT = 'https://nonzero-sync.luka731chris.workers.dev';
const FALLBACK_QUOTES = [
  { id: 'f1', text: 'YOUR ONLY OBLIGATION IS TO START.', author: 'NONZERO', concept: 'start' },
  {
    id: 'f2',
    text: 'Well done is better than well said.',
    author: 'BENJAMIN FRANKLIN',
    concept: 'action'
  },
  {
    id: 'f3',
    text: 'Energy and persistence conquer all things.',
    author: 'BENJAMIN FRANKLIN',
    concept: 'persistence'
  },
  {
    id: 'f4',
    text: 'The impediment to action advances action.',
    author: 'MARCUS AURELIUS',
    concept: 'obstacle'
  },
  {
    id: 'f5',
    text: 'No man is free who is not master of himself.',
    author: 'EPICTETUS',
    concept: 'discipline'
  },
  {
    id: 'f6',
    text: 'Great things are done by a series of small things brought together.',
    author: 'VINCENT VAN GOGH',
    concept: 'consistency'
  },
  {
    id: 'f7',
    text: 'Do what you can, with what you have, where you are.',
    author: 'THEODORE ROOSEVELT',
    concept: 'action'
  },
  {
    id: 'f8',
    text: 'It always seems impossible until it is done.',
    author: 'NELSON MANDELA',
    concept: 'resilience'
  },
  {
    id: 'f9',
    text: 'The only easy day was yesterday.',
    author: 'U.S. NAVY SEALS',
    concept: 'discipline'
  },
  {
    id: 'f10',
    text: 'Keep the appointment with yourself.',
    author: 'NONZERO',
    concept: 'discipline'
  }
];
const PROGRAMS = {
  0: {
    name: 'Recovery',
    why: 'Keep the habit while giving the hip a low-stress day.',
    full: [
      ['BikeErg', '10–15 min very easy'],
      ['Hip abduction', '1–2 × 8 each side'],
      ['Band row', '2 × 12'],
      ['Breathing', '2 min relaxed']
    ],
    minimum: [
      ['BikeErg', '5–10 min very easy'],
      ['Upper-body band work', 'Easy until 10:00']
    ]
  },
  1: {
    name: 'Strength A — Upper + Hinge',
    why: 'Build strength without forcing deep hip flexion.',
    full: [
      ['BikeErg warm-up', '4 min easy'],
      ['Elevated KB deadlift', '53 lb — 3 × 8'],
      ['Push-ups', '3 × 8–12'],
      ['Supported KB row', '35 lb — 3 × 10 each'],
      ['Farmer carry', '2 × 35 lb — 3 × 30 sec']
    ],
    minimum: [
      ['BikeErg', '2 min easy'],
      ['Elevated KB deadlift', '2 × 8'],
      ['Push-ups', '2 × 8–12'],
      ['KB row', '2 × 8 each'],
      ['BikeErg', 'Easy until 10:00']
    ]
  },
  2: {
    name: 'BikeErg — Aerobic',
    why: 'Build cardiovascular fitness with minimal impact.',
    full: [
      ['Easy spin', '5 min'],
      ['Steady aerobic ride', '15–20 min'],
      ['Easy spin', '5 min']
    ],
    minimum: [['BikeErg', '10 min continuous']]
  },
  3: {
    name: 'Strength B — Prehab + Upper',
    why: 'Maintain strength and train tolerable hip-supporting musculature.',
    full: [
      ['BikeErg warm-up', '4 min easy'],
      ['High sit-to-stand', '3 × 10'],
      ['Pull-ups', '3 × 2–3'],
      ['KB floor press', '3 × 8–10'],
      ['Pallof press', '2 × 10 each']
    ],
    minimum: [
      ['BikeErg', '2 min'],
      ['High sit-to-stand', '2 × 8'],
      ['Pull-ups', '2 × 2'],
      ['KB floor press', '2 × 8'],
      ['Pallof press', '2 × 8']
    ]
  },
  4: {
    name: 'BikeErg — Aerobic',
    why: 'Add aerobic volume without accumulating painful walking mileage.',
    full: [
      ['Easy spin', '5 min'],
      ['Steady aerobic ride', '20–25 min'],
      ['Easy spin', '5 min']
    ],
    minimum: [['BikeErg', '10 min easy/moderate']]
  },
  5: {
    name: 'Strength — Alternating',
    why: 'Third weekly strength exposure while keeping workload manageable.',
    full: [
      ['BikeErg warm-up', '4 min'],
      ['Elevated KB deadlift', '2 × 8'],
      ['Push-ups', '2 × 10–15'],
      ['Pull-ups', '2 × 2–3'],
      ['Farmer carry', '3 × 30 sec']
    ],
    minimum: [
      ['BikeErg', '2 min'],
      ['Push-ups', '2 × 10'],
      ['KB row', '2 × 8 each'],
      ['Farmer carry', '2 × 30 sec'],
      ['BikeErg', 'Until 10:00']
    ]
  },
  6: {
    name: 'Long BikeErg',
    why: 'Your main low-impact endurance builder.',
    full: [
      ['Easy spin', '5 min'],
      ['Steady BikeErg', '30–35 min'],
      ['Easy spin', '5 min'],
      ['Optional', 'Add 5 min if hip feels good']
    ],
    minimum: [['BikeErg', '10 min easy/moderate']]
  }
};
const FLARE = [
  ['BikeErg', '5–10 min very easy if comfortable'],
  ['Upper body', 'Easy push-ups, rows or floor press'],
  ['Avoid today', 'Loaded lower-body work / deep flexion'],
  ['Win condition', '10 calm minutes and stop']
];
const $ = (id) => document.getElementById(id);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
let endpoint = localStorage.getItem('nz.endpoint') || DEFAULT_ENDPOINT;
let wallToken = localStorage.getItem('nz.wallToken') || '';
let deviceId = localStorage.getItem('nz.deviceId') || 'pi-' + cryptoRandom(16);
localStorage.setItem('nz.deviceId', deviceId);
let lastCloudPayloadAt = 0;
let state = null,
  lastRevision = -1,
  lastStateAt = 0,
  lastRenderAt = 0,
  pollErrors = 0,
  manualMode = readManualMode(),
  currentMode = 'ambient',
  lastCommandNonce = localStorage.getItem('nz.lastCommandNonce') || '';
const AGENDA_CACHE_KEY = 'nz.autopilotAgenda.cache.v3';
const QUOTE_MEMORY_KEY = 'nz.quoteMemory.v2';
const QUOTE_MEMORY_MAX = 320;
function quoteKey(q) {
  return String(q?.id || q?.text || '').trim();
}
function quoteAuthor(q) {
  return String(q?.author || 'UNKNOWN')
    .trim()
    .toUpperCase();
}
function quoteConcept(q) {
  return NonZeroQuoteRotation.concept(q);
}
function loadQuoteMemory() {
  try {
    const x = JSON.parse(localStorage.getItem(QUOTE_MEMORY_KEY) || '[]');
    return Array.isArray(x) ? x.filter((r) => r && r.id).slice(-QUOTE_MEMORY_MAX) : [];
  } catch {
    return [];
  }
}
let quoteMemory = loadQuoteMemory();
const quoteRotation = NonZeroQuoteRotation.create(
  localStorage,
  [...(window.NonZeroQuoteCatalog || FALLBACK_QUOTES), ...NonZeroDayMood.originals],
  quoteMemory
);
let quotes = quoteRotation.catalog,
  quoteIndex = -1,
  shown = quoteMemory.map((r) => r.id).slice(-120),
  shownBatch = [],
  quoteTimer = null,
  quotePaints = 0,
  carouselStep = 0,
  lastQuotePaint = 0,
  quoteFeedAt = 0,
  lastQuoteHistoryFlush = Number(localStorage.getItem('nz.quoteHistoryFlushAt') || Date.now());
const RELEASE_VERSION = '7.17.17';
const CLOUD_ACTIVE_POLL_MS = 2000,
  CLOUD_IDLE_POLL_MS = 5000,
  CLOUD_RETRY_POLL_MS = 3000,
  CLOUD_FETCH_TIMEOUT_MS = 7000;
const AGENDA_PAGE_SIZE = 6,
  AGENDA_ROTATE_MS = 12000;
let renderCount = 0,
  bootAt = Date.now(),
  lastCloudHeartbeat = 0,
  lastCloudHeartbeatSignature = '',
  statePollTimer = null,
  watchdogReloads = Number(sessionStorage.getItem('nz.reloads') || 0),
  lastError = '',
  framePulse = 0,
  lastRafAt = Date.now();
let cloudPollFailures = 0;
let lastActiveFingerprint = '',
  cloudTransitionCount = 0,
  lastCloudTransitionAt = 0,
  lastCloudModeReason = 'schedule',
  lastFetchSucceeded = true;
let stateFetchPending = false,
  lastAgendaFingerprint = '';
let agendaPage = 0,
  agendaSignature = '';
let ergPhase = false,
  localPm5 = null,
  lastPm5At = 0,
  pm5Errors = 0,
  lastPm5Sequence = -1;
let telemetryHistory = [],
  lastChartSequence = -1;
let autoPm5 = {
  active: false,
  motionTicks: 0,
  startedAt: 0,
  baselineElapsed: 0,
  elapsedSeconds: 0,
  lastMotionAt: 0,
  endedAt: 0,
  sessionId: null
};
let resumeWorkoutCache = readResumeWorkout(),
  lastResumeWriteAt = 0,
  lastResumeSignature = '';
let analytics = {
  samples: 0,
  sumPower: 0,
  sumPowerSq: 0,
  maxPower: 0,
  sumCadence: 0,
  sumCadenceSq: 0,
  maxCadence: 0,
  sumHr: 0,
  hrSamples: 0,
  maxHr: 0,
  workKj: 0,
  movingSeconds: 0,
  startDistance: null,
  lastDistance: null,
  lastAt: 0,
  speedMps: 0,
  peak5: 0,
  peak30: 0,
  peak60: 0,
  powerWindow: [],
  zones: [0, 0, 0, 0, 0],
  lastSeq: -1
};
let wallSchedule = readCachedWallSchedule();
try {
  const c = JSON.parse(localStorage.getItem('nz.cloudClock.v1') || 'null');
  if (c?.binding === endpoint + '|' + wallToken) {
    lastRevision = Number(c.revision) || 0;
    lastCloudPayloadAt = Number(c.at) || 0;
  }
} catch {}
function readCachedWallSchedule() {
  try {
    const value = JSON.parse(localStorage.getItem('nz.wallSchedule.v1') || 'null');
    if (
      value?.binding === endpoint + '|' + wallToken &&
      value.schedule &&
      typeof value.schedule === 'object' &&
      !Array.isArray(value.schedule)
    )
      return normalizeSchedule(value.schedule);
  } catch {}
  return { enabled: true, ambient: '06:00', night: '20:30', deep: '01:00' };
}
function cryptoRandom(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return [...a]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, n);
}
function localDate(d = new Date()) {
  return NonZeroSuite.dateKey(d);
}

function dateAdd(k, days) {
  return NonZeroSuite.dateAdd(k, days);
}
function formatClock(d = new Date()) {
  return d
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    })
    .toUpperCase();
}
function formatDate(d = new Date()) {
  return d
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
      timeZone: 'America/New_York'
    })
    .toUpperCase();
}
function formatTrayDate(d = new Date()) {
  return d.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    timeZone: 'America/New_York'
  });
}
function setText(id, v) {
  const e = $(id);
  if (e) e.textContent = v == null ? '' : String(v);
}
function scheduleMode() {
  if (!wallSchedule?.enabled) return 'ambient';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const o = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const now = Number(o.hour) * 60 + Number(o.minute);
  const mins = (t) => {
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + m;
  };
  const ago = (t) => {
    let x = now - mins(t);
    if (x < 0) x += 1440;
    return x;
  };
  const a = ago(wallSchedule.ambient),
    n = ago(wallSchedule.night),
    d = ago(wallSchedule.deep);
  return a <= n && a <= d ? 'ambient' : n <= a && n <= d ? 'night' : 'deep';
}
function readManualMode() {
  localStorage.removeItem('nz.manualMode');
  return '';
}
let manualModeUntil = 0;
function setManualMode(m) {
  manualMode = ['ambient', 'performance', 'night', 'deep'].includes(m) ? m : '';
  manualModeUntil = manualMode ? Date.now() + 60000 : 0;
  localStorage.removeItem('nz.manualMode');
}
function desiredMode() {
  if (performanceWorkout()) return 'performance';
  if (manualMode && Date.now() < manualModeUntil) return manualMode;
  return scheduleMode();
}
function setMode(m) {
  if (!['ambient', 'performance', 'night', 'deep'].includes(m)) m = 'ambient';
  const modeChanged = m !== currentMode;
  if (modeChanged) {
    cloudTransitionCount++;
    lastCloudTransitionAt = Date.now();
  }
  currentMode = m;
  try {
    window.NonZeroRide?.setMode(m);
  } catch (e) {
    lastError = 'Ride ' + String(e);
  }
  ['ambient', 'performance', 'night', 'deep'].forEach((x) =>
    $(x).classList.toggle('active', x === m)
  );
  resetQuoteTimer();
  if (m === 'ambient') requestAnimationFrame(reflowQuote);
  if (modeChanged) window.NonZeroConnected?.modeChanged();
}
function activeStatus(a) {
  const s = String(a?.status || '')
    .trim()
    .toLowerCase();
  return (
    [
      'active',
      'running',
      'paused',
      'started',
      'resumed',
      'live',
      'in_progress',
      'in-progress'
    ].includes(s) ||
    (a?.timer?.running === true &&
      ![
        'complete',
        'completed',
        'finished',
        'reset',
        'ready',
        'stale',
        'cancelled',
        'canceled'
      ].includes(s))
  );
}
function cloudActiveFrom(x) {
  const a = NonZeroWorkoutPolicy.active(x);
  if (a && NonZeroWorkoutPolicy.automated(a) && autoSuppressedSession === a.sessionId) return null;
  return a;
}
let autoSuppressedSession = '',
  pm5AwaitIdle = false,
  pm5RestartEvidence = 0;
function cloudActive() {
  return cloudActiveFrom(state);
}
function activeFingerprint(x) {
  const a = cloudActiveFrom(x);
  return a
    ? JSON.stringify([
        a.sessionId || '',
        a.date || '',
        String(a.status || '').toLowerCase(),
        a.programSnapshot?.source || '',
        a.programSnapshot?.name || a.name || '',
        Number(a.updatedAt || 0),
        Number(a.statusUpdatedAt || 0),
        Number(a.timerUpdatedAt || 0),
        a.timer?.running === true,
        Number(a.timer?.startedAt || 0)
      ])
    : 'none';
}
const RESUME_WORKOUT_KEY = 'nz.workoutResume.v1';
function readResumeWorkout() {
  try {
    const saved = JSON.parse(localStorage.getItem('nz.workoutResume.v1') || 'null'),
      value = saved?.binding === endpoint + '|' + wallToken ? saved.workout : null;
    return NonZeroWorkoutPolicy.active({ activeWorkout: value }) ? value : null;
  } catch {
    return null;
  }
}
function clearResumeWorkout() {
  resumeWorkoutCache = null;
  lastResumeSignature = '';
  try {
    localStorage.removeItem(RESUME_WORKOUT_KEY);
  } catch {}
}
function persistResumeWorkout(a, force = false) {
  if (!a || !NonZeroWorkoutPolicy.active({ activeWorkout: a })) return;
  resumeWorkoutCache = JSON.parse(JSON.stringify(a));
  const sig = JSON.stringify([a.sessionId, a.status, NonZeroWorkoutPolicy.activityAt(a)]);
  if (!force && (sig === lastResumeSignature || Date.now() - lastResumeWriteAt < 5000)) return;
  try {
    localStorage.setItem(
      RESUME_WORKOUT_KEY,
      JSON.stringify({ binding: endpoint + '|' + wallToken, workout: resumeWorkoutCache })
    );
    lastResumeWriteAt = Date.now();
    lastResumeSignature = sig;
  } catch (e) {
    lastError = 'Workout recovery save: ' + String(e);
  }
}
function reconcileResumeWorkout(remote) {
  const a = NonZeroWorkoutPolicy.active(remote),
    id = resumeWorkoutCache?.sessionId;
  if (a) {
    persistResumeWorkout(a);
    return;
  }
  const raw = remote?.activeWorkout,
    done = id && (remote?.sessions || []).some((s) => s.sessionId === id && s.completed === true);
  if (
    done ||
    (raw &&
      raw.sessionId === id &&
      ['complete', 'completed', 'finished', 'cancelled', 'canceled', 'stale'].includes(
        String(raw.status || '').toLowerCase()
      ))
  ) {
    if (autoPm5.active && (done || raw?.sessionId === autoPm5.sessionId)) {
      autoPm5.active = false;
      pm5AwaitIdle = true;
      $('performance')?.classList.remove('auto-pm5');
    }
    clearResumeWorkout();
  }
}
function validActive() {
  return (
    cloudActive() ||
    autoWorkout() ||
    NonZeroWorkoutPolicy.active({ activeWorkout: resumeWorkoutCache })
  );
}
function autoWorkout() {
  return autoPm5.active
    ? {
        autoPm5: true,
        status: 'active',
        source: /bluetooth|ble/i.test(String(localPm5?.source || '')) ? 'pm5-ble' : 'pm5-usb',
        date: localDate(new Date(autoPm5.startedAt)),
        sessionId: autoPm5.sessionId,
        updatedAt: autoPm5.lastMotionAt,
        pm5Motion: { startedAt: autoPm5.startedAt, lastActivityAt: autoPm5.lastMotionAt },
        timer: { running: true, startedAt: autoPm5.startedAt, elapsedMs: 0 }
      }
    : null;
}
function performanceWorkout() {
  return validActive();
}
function resetAnalytics() {
  analytics = {
    samples: 0,
    sampleSeconds: 0,
    sumPower: 0,
    sumPowerSq: 0,
    maxPower: 0,
    sumCadence: 0,
    sumCadenceSq: 0,
    maxCadence: 0,
    sumHr: 0,
    hrSamples: 0,
    hrSeconds: 0,
    maxHr: 0,
    workKj: 0,
    movingSeconds: 0,
    startDistance: null,
    lastDistance: null,
    lastAt: 0,
    speedMps: 0,
    peak5: 0,
    peak30: 0,
    peak60: 0,
    powerWindow: [],
    zones: [0, 0, 0, 0, 0],
    lastSeq: null
  };
  telemetryHistory = [];
  lastChartSequence = -1;
  lastGoodTelemetry = null;
  lastGoodTelemetryAt = 0;
  coachSamples = [];
  lastCoachAt = 0;
  renderAnalytics({});
}
let analyticsSessionKey = '';
function syncAnalyticsSession() {
  const a = performanceWorkout(),
    key = a ? a.sessionId || a.date + '|' + String(a.timer?.startedAt || a.startedAt || '') : '';
  if (key !== analyticsSessionKey) {
    analyticsSessionKey = key;
    resetAnalytics();
  }
}
function telemetryFresh(t, now = Date.now()) {
  const stamp = Number(t?.updatedAt);
  return !!(
    t &&
    t.connected === true &&
    t.fresh !== false &&
    !t.recovering &&
    Number.isFinite(stamp) &&
    stamp > 0 &&
    now - stamp >= -1000 &&
    now - stamp < 2500
  );
}
function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
}
function normalizeSchedule(x) {
  if (!x || typeof x !== 'object') return wallSchedule;
  return {
    enabled: x.enabled !== false,
    ambient: /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x.ambient || '') ? x.ambient : '06:00',
    night: /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x.night || '') ? x.night : '20:30',
    deep: /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x.deep || '') ? x.deep : '01:00'
  };
}
async function fetchState() {
  if (stateFetchPending) return false;
  if (!wallToken) {
    setCloud('unpaired', 'PAIR WALL');
    return false;
  }
  stateFetchPending = true;
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), CLOUD_FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(endpoint.replace(/\/$/, '') + '/state?wallPoll=' + Date.now(), {
      headers: { 'X-NONZERO-Wall': wallToken, Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal
    });
    if (!r.ok)
      throw new Error(
        r.status === 401 || r.status === 403
          ? 'pairing rejected · pair wall again'
          : 'state ' + r.status
      );
    const data = await r.json();
    window.NonZeroCoachingBackend = data.coachStatus || 'setup_required';
    if (data.error) throw new Error(data.error);
    if (!data.state) throw new Error('no state');
    const incomingRev = Number(data.revision ?? data.state?._meta?.revision ?? 0),
      incomingAt = Number(data.updatedAt ?? data.state?._meta?.updatedAt ?? 0);
    applyWallCommand(data.state.wallCommand);
    if (
      incomingRev < lastRevision ||
      (incomingRev === lastRevision && incomingAt < lastCloudPayloadAt)
    ) {
      lastError = 'Waiting for current cloud revision';
      lastFetchSucceeded = true;
      return true;
    }
    try {
      if (window.NonZeroRide?.applyControl(data.rideControl)) {
        lastCloudHeartbeatSignature = '';
        void heartbeat();
      }
    } catch (e) {
      lastError = 'Ride control ' + String(e);
    }
    lastError = '';
    lastStateAt = Date.now();
    pollErrors = 0;
    lastFetchSucceeded = true;
    setCloud('online', 'CLOUD · CONNECTED');
    try {
      const ag = data.state?.autopilotAgenda || data.state?.autoPilotAgenda || data.state?.agenda;
      if (ag && (Array.isArray(ag.days) ? ag.days.length > 0 : Boolean(ag.date)))
        localStorage.setItem(AGENDA_CACHE_KEY, JSON.stringify(normalizeAgendaRootData(ag)));
    } catch {}
    const agendaFingerprint = JSON.stringify(
        data.state.autopilotAgenda || data.state.autoPilotAgenda || data.state.agenda || null
      ),
      agendaChanged = agendaFingerprint !== lastAgendaFingerprint;
    lastAgendaFingerprint = agendaFingerprint;
    const rev = incomingRev,
      priorRev = lastRevision,
      hadState = !!state,
      fingerprint = activeFingerprint(data.state),
      semanticChange = fingerprint !== lastActiveFingerprint,
      wasCloudActive = !!cloudActive();
    lastRevision = rev;
    lastCloudPayloadAt = incomingAt;
    try {
      localStorage.setItem(
        'nz.cloudClock.v1',
        JSON.stringify({ binding: endpoint + '|' + wallToken, revision: rev, at: incomingAt })
      );
    } catch {}
    state = data.state;
    // Restore display-only history from the last valid cache if a cloud response is incomplete.
    // Do not fabricate measurements or write the fallback into the cloud automatically.
    try {
      const prior = JSON.parse(localStorage.getItem('nz.weightJourney.v1') || 'null');
      if (prior?.binding === endpoint + '|' + wallToken && prior.state) {
        const map = new Map();
        for (const x of prior.state.bodyMeasurements || []) if (x?.id) map.set(x.id, x);
        for (const x of state.bodyMeasurements || []) if (x?.id) map.set(x.id, x);
        state.bodyMeasurements = [...map.values()];
        if (!state.pm5Analytics?.health?.length && prior.state.pm5Analytics?.health?.length)
          state.pm5Analytics = {...(state.pm5Analytics || {}), health: prior.state.pm5Analytics.health};
      }
    } catch (e) { console.warn('Weight history fallback unavailable', e); }
    reconcileResumeWorkout(state);
    lastActiveFingerprint = fingerprint;
    const isCloudActive = !!cloudActive();
    if (wasCloudActive && !isCloudActive) {
      pm5AwaitIdle = true;
      if (manualMode === 'performance') setManualMode('');
    }
    if (isCloudActive) {
      lastCloudModeReason = 'cloud activeWorkout';
      if (autoPm5.active && state.activeWorkout?.sessionId !== autoPm5.sessionId) {
        autoPm5.active = false;
        $('performance')?.classList.remove('auto-pm5');
      }
    } else if (autoPm5.active) lastCloudModeReason = 'PM5 motion';
    else lastCloudModeReason = 'schedule';
    if (
      !hadState ||
      semanticChange ||
      agendaChanged ||
      rev !== priorRev ||
      (state.wallCommand?.nonce && String(state.wallCommand.nonce) !== lastCommandNonce)
    ) {
      applyState();
    } else {
      updatePerformanceClock();
      const wanted = desiredMode();
      if (wanted !== currentMode) setMode(wanted);
    }
    return true;
  } catch (e) {
    pollErrors++;
    lastFetchSucceeded = false;
    lastError = e?.name === 'AbortError' ? 'cloud state timeout' : String(e);
    setCloud(
      'offline',
      /pairing rejected/.test(lastError) ? 'CLOUD · REPAIR PAIRING' : 'CLOUD · OFFLINE · RETRYING'
    );
    if (Date.now() - lastAgendaRenderAt > 60000) {
      renderAgenda();
      lastAgendaRenderAt = Date.now();
    }
    return false;
  } finally {
    stateFetchPending = false;
    clearTimeout(timeout);
  }
}
async function statePollLoop() {
  const ok = await fetchState();
  cloudPollFailures = ok ? 0 : Math.min(7, cloudPollFailures + 1);
  const delay = !ok
    ? Math.min(120000, CLOUD_RETRY_POLL_MS * 2 ** (cloudPollFailures - 1))
    : performanceWorkout() || currentMode === 'performance'
      ? CLOUD_ACTIVE_POLL_MS
      : currentMode === 'deep' ? 20000 : currentMode === 'night' ? 12000 : CLOUD_IDLE_POLL_MS;
  clearTimeout(statePollTimer);
  statePollTimer = setTimeout(statePollLoop, delay);
}
function setCloud(status, text) {
  status = status === true ? 'online' : status === false ? 'unpaired' : status;
  const ok = status === 'online';
  ['cloudStatus', 'perfCloud'].forEach((id) => {
    const e = $(id);
    if (e) {
      e.textContent = text;
      e.style.color = ok ? 'var(--green)' : 'var(--gold)';
    }
  });
  ['wifi', 'perfWifi'].forEach((id) => {
    const e = $(id);
    if (e) e.className = `wifi-indicator ${status}`;
  });
}
function applyWallCommand(c) {
  let commandChanged = false;
  if (c?.nonce && String(c.nonce) !== lastCommandNonce) {
    const action =
      Number(c.at) > 0 && Date.now() - Number(c.at) >= -30000 && Date.now() - Number(c.at) < 60000
        ? String(c.action || '').toLowerCase()
        : '';
    if (action === 'quote-next') nextQuote();
    else if (['ambient', 'performance', 'night', 'deep'].includes(action)) {
      setManualMode(action);
      lastCloudModeReason = 'manual ' + action;
      if (action === 'performance') {
        setMode('performance');
        openSetup(false);
        openHealth(false);
      }
    }
    lastCommandNonce = String(c.nonce);
    localStorage.setItem('nz.lastCommandNonce', lastCommandNonce);
    commandChanged = true;
  }
  return commandChanged;
}

function applyState() {
  renderCount++;
  lastRenderAt = Date.now();
  if (state.wallSchedule) {
    wallSchedule = normalizeSchedule(state.wallSchedule);
    try {
      localStorage.setItem(
        'nz.wallSchedule.v1',
        JSON.stringify({ binding: endpoint + '|' + wallToken, schedule: wallSchedule })
      );
    } catch {}
  }
  const commandChanged = applyWallCommand(state.wallCommand);
  // Apply the mode before painting optional panels so a rendering defect cannot
  // prevent a valid command from reaching the display.
  setMode(desiredMode());
  try {
    renderAll();
  } catch (e) {
    lastError = 'Render: ' + String(e);
  }
  if (commandChanged) {
    lastCloudHeartbeatSignature = '';
    heartbeat();
  }
}
function sessions() {
  const cloud = Array.isArray(state?.sessions) ? state.sessions : [];
  let local = [];
  try {
    local = JSON.parse(localStorage.getItem('nz.pm5Sessions') || '[]');
  } catch {}
  const ids = new Set(cloud.map((x) => x.sessionId));
  const combined = cloud.concat(
    Array.isArray(local) ? local.filter((x) => !ids.has(x.sessionId)) : []
  );
  return window.NonZeroConnected?.mergeSessions(combined)?.sessions || combined;
}
function getCurrentRecord() {
  return validActive() || NonZeroSuite.currentRecord(sessions());
}
function programAndItems() {
  const recovery = window.NonZeroGoalCoachUI?.snapshot();
  if (recovery && recovery.phase !== 'prepare' && !recovery.trainingAllowed) {
    const p = {
      name: 'Recovery · care-team plan',
      type: 'recovery',
      source: 'recovery',
      why: 'Record approved activity. Your clinical PT plan sets the dose.',
      full: [
        ['Prescribed PT', 'Use the exercises and dose from your team'],
        ['Approved walking', 'Follow your team’s assistance and limits'],
        ['Recovery nutrition', 'Follow your individual food and protein plan']
      ]
    };
    return {
      p,
      mode: 'recovery',
      items: p.full,
      rec: validActive() || {},
      joint: false,
      partner: null,
      partnerItems: []
    };
  }
  if (autoPm5.active && !cloudActive()?.programSnapshot) {
    const p = {
      name: 'PM5 · AUTO SESSION',
      type: 'aerobic',
      full: [['LIVE ERG SESSION', 'Follow your cadence target and live coaching.']]
    };
    return {
      p,
      mode: 'full',
      items: p.full,
      rec: autoWorkout(),
      joint: false,
      partner: null,
      partnerItems: []
    };
  }
  const rec = getCurrentRecord(),
    custom = state?.customToday?.date === localDate() ? state.customToday : null,
    p =
      rec?.programSnapshot ||
      custom ||
      (state?.todayPrescription?.date === localDate() ? state.todayPrescription.program : null) ||
      window.NonZeroPm5Reconcile?.week(PROGRAMS, state, localDate())[localDate()] ||
      PROGRAMS[new Date(NonZeroSuite.dateKey() + 'T12:00:00Z').getUTCDay()] ||
      PROGRAMS[0],
    mode = String(rec?.mode || 'full').toLowerCase(),
    jointToday = state?.jointToday?.date === localDate() && state.jointToday?.enabled === true,
    joint = jointToday || rec?.jointEnabled === true || rec?.jointWithSam === true,
    partner = rec?.partnerProgramSnapshot || (jointToday ? state?.jointToday?.samProgram : null),
    items = mode === 'flare' ? FLARE : mode === 'minimum' ? p.minimum || p.full : p.full || [],
    partnerItems = partner
      ? mode === 'flare'
        ? partner.flare || partner.full
        : mode === 'minimum'
          ? partner.minimum || partner.full
          : partner.full
      : [];
  return { p, mode, items, rec, joint, partner, partnerItems };
}
let ambientDayWon = false,
  ambientMoodKey = '',
  victoryBurstTimer = null;
function dayMood() {
  return ambientDayWon ? 'victory' : 'action';
}
function moodEyebrow() {
  return ambientDayWon
    ? 'VICTORY LAP · CARRY THE MOMENTUM'
    : 'NONZERO MINDSET · ACTION & DISCIPLINE';
}
function renderDayMood() {
  const today = localDate(),
    result = NonZeroDayMood.completion(sessions(), state?.activeWorkout, today);
  let cached = '';
  try {
    cached = localStorage.getItem('nz.completedDay') || '';
  } catch {}
  const won = result.won || (!state && cached === today),
    key = today + '|' + won,
    changed = key !== ambientMoodKey;
  ambientDayWon = won;
  ambientMoodKey = key;
  try {
    if (result.won) localStorage.setItem('nz.completedDay', today);
    else if (state && cached === today) localStorage.removeItem('nz.completedDay');
  } catch {}
  const ambient = $('ambient');
  ambient?.classList.toggle('day-victory', won);
  setText('ambientModePill', won ? '✓ TODAY WON' : 'AMBIENT WALL');
  if (!$('mindset')?.classList.contains('agenda-active')) setText('mindsetEyebrow', moodEyebrow());
  if (won) {
    setText('workoutStatus', '✓ COMPLETE');
    setText('todayTitle', 'TODAY · VICTORY LAP');
    const minutes = result.records.reduce((n, r) => n + Math.max(0, Number(r.duration) || 0), 0);
    setText(
      'todayDetail',
      minutes
        ? Math.round(minutes) + ' MIN COMPLETED · PROMISE KEPT · CARRY THE MOMENTUM'
        : 'WORKOUT COMPLETE · PROMISE KEPT · CARRY THE MOMENTUM'
    );
    const week = $('weekContext');
    if (week) week.textContent = week.textContent.replace('TODAY OPEN', 'TODAY WON');
  }
  if (!won) {
    ambient?.classList.remove('victory-arrival');
    clearTimeout(victoryBurstTimer);
    if (changed) {
      renderKpis();
      renderToday();
    }
  }
  if (won && currentMode === 'ambient') {
    let celebrated = '';
    try {
      celebrated = localStorage.getItem('nz.victoryCelebratedDay') || '';
    } catch {}
    if (celebrated !== today) {
      try {
        localStorage.setItem('nz.victoryCelebratedDay', today);
      } catch {}
      ambient?.classList.add('victory-arrival');
      clearTimeout(victoryBurstTimer);
      victoryBurstTimer = setTimeout(() => ambient?.classList.remove('victory-arrival'), 6500);
    }
  }
  if (changed && quoteFullText && currentMode === 'ambient') nextQuote();
}
function kpis() {
  return NonZeroSuite.metrics(sessions());
}
function renderKpis() {
  const x = kpis(),
    weeklyTarget = 160,
    visualCeiling = 200,
    goalPct = clamp((x.weekMinutes / weeklyTarget) * 100, 0, 999),
    railPct = clamp((x.weekMinutes / visualCeiling) * 100, 0, 100),
    remaining = Math.max(0, weeklyTarget - x.weekMinutes);
  setText('kpiStreak', x.streak);
  $('streakBar').style.width = `${clamp((x.streak / 7) * 100, 0, 100)}%`;
  setText(
    'streakContext',
    x.streak === 0
      ? 'DAILY STREAK · NO ACTIVE CHAIN'
      : x.streak === 1
        ? '1 CONSECUTIVE DAY · PROTECT IT'
        : `${x.streak} CONSECUTIVE DAYS`
  );
  setText('kpiWeek', `${x.weekCount}/7`);
  setText(
    'weekContext',
    `DAY ${x.opportunity} · ${x.adherence}% SO FAR · ${x.missed ? x.missed + ' MISSED' : 'ON PACE'} · TODAY OPEN`
  );
  const seg = $('weekSegments');
  seg.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const e = document.createElement('i');
    if (x.completed.has(x.keys[i]) || x.started.has(x.keys[i])) e.className = 'done';
    else if (i < new Date().getDay()) e.className = 'missed';
    seg.appendChild(e);
  }
  setText('kpiMinutes', `${Math.round(x.weekMinutes)} / ${weeklyTarget}`);
  $('minutesBar').style.width = `${railPct}%`;
  setText(
    'minutesContext',
    remaining
      ? `${Math.ceil(remaining)} MIN TO GO · ${Math.round(goalPct)}% OF WEEKLY GOAL`
      : `GOAL HIT · +${Math.max(0, Math.round(x.weekMinutes - weeklyTarget))} MIN ABOVE TARGET`
  );
  setText('kpi30', `${x.momentumDays} ${x.momentumDays === 1 ? 'DAY' : 'DAYS'}`);
  $('completionBar').style.width = `${clamp((x.momentumDays / 12) * 100, 0, 100)}%`;
  const trend =
    x.momentumDelta > 0
      ? `+${x.momentumDelta} VS PRIOR 28 DAYS`
      : x.momentumDelta < 0
        ? `${x.momentumDelta} VS PRIOR 28 DAYS`
        : 'MATCHING PRIOR 28 DAYS';
  setText(
    'completionContext',
    `${(x.momentumDays / 4).toFixed(1)} TRAINING DAYS / WEEK · ${trend}`
  );
}
function workoutCategory(p, mode, items = []) {
  if (mode === 'flare') return 'RECOVER';
  const type = String(p?.type || p?.trainingType || p?.category || '').toLowerCase(),
    name = String(p?.name || '').toLowerCase(),
    moves = items
      .map((it) => String(it?.[0] || ''))
      .join(' ')
      .toLowerCase(),
    text = `${type} ${name} ${moves}`;
  if (
    p?.source === 'anchor-built' ||
    /strength|lift|deadlift|squat|press|pull-up|push-up|carry/.test(text)
  )
    return 'STRENGTH';
  if (/aerobic|cardio|endurance|bike|erg|row|run|ride/.test(text)) return 'AEROBIC';
  if (/recover|recovery|mobility|rest|restore|breath/.test(text)) return 'RECOVER';
  return 'WORKOUT';
}
function workoutDetail(p, mode, joint, partner) {
  const source = p?.source === 'anchor-built' ? 'AD HOC WORKOUT' : 'WORKOUT PLAN',
    effort = mode === 'minimum' ? 'MINIMUM' : mode === 'flare' ? 'RECOVERY' : 'FULL';
  return `${source} · ${effort}${joint ? ' · WITH SAM' : ''}${joint && partner?.progression?.label ? ' · ' + partner.progression.label : ''}`.toUpperCase();
}
function renderToday() {
  const { p, mode, items, rec, joint, partner, partnerItems } = programAndItems();
  const effort = mode === 'minimum' ? 'MINIMUM' : mode === 'flare' ? 'RECOVERY' : 'FULL';
  setText('todayTitle', `TODAY · ${workoutCategory(p, mode, items)}`);
  setText('workoutStatus', !state ? 'WAITING' : `${effort}${joint ? ' · DUO' : ''}`);
  const todayRows = sessions().filter((x) => x.date === localDate()),
    logged = todayRows
      .filter(NonZeroSuite.external)
      .reduce((n, x) => n + Number(x.duration || 0), 0),
    window = NonZeroSuite.opportunity(agendaRoot());
  setText(
    'todayDetail',
    workoutDetail(p, mode, joint, partner) +
      (logged ? ' · ' + Math.round(logged) + ' MIN OTHER ACTIVITY' : '') +
      (window.known && window.minutes >= 10 ? ' · ' + window.label.toUpperCase() : '')
  );
  const checks = Array.isArray(rec?.checks) ? rec.checks : [],
    sets = Array.isArray(rec?.sets) ? rec.sets : [];
  const partnerChecks = Array.isArray(rec?.partnerChecks) ? rec.partnerChecks : [],
    partnerSets = Array.isArray(rec?.partnerSets) ? rec.partnerSets : [];
  const box = $('todayChecks'),
    shownItems = items.slice(0, 6),
    contentLength = shownItems.reduce(
      (n, it) => n + String(it?.[0] || '').length + String(it?.[1] || '').length,
      0
    );
  box.innerHTML = '';
  box.className =
    `today-checks rows-${shownItems.length}` +
    (shownItems.length >= 6 || contentLength > 235 ? ' is-dense' : '');
  box.style.setProperty('--workout-rows', Math.max(1, shownItems.length));
  shownItems.forEach((it, i) => {
    let done = !!checks[i],
      samDone = !!partnerChecks[i];
    if (Array.isArray(sets[i]) && sets[i].length && sets[i].every(Boolean)) done = true;
    if (Array.isArray(partnerSets[i]) && partnerSets[i].length && partnerSets[i].every(Boolean))
      samDone = true;
    const d = document.createElement('div'),
      marker = joint ? (done && samDone ? '✓' : '○') : done ? '✓' : '○';
    d.className = 'check';
    d.innerHTML = joint
      ? `<span class="check-marker">${marker}</span><div class="check-copy"><strong>CHRIS · ${escapeHtml(it[0])}</strong><span>${escapeHtml(it[1] || '')} · SAM · ${escapeHtml(partnerItems[i]?.[0] || 'Transition')}${partnerItems[i]?.[1] ? ' · ' + escapeHtml(partnerItems[i][1]) : ''}</span></div>`
      : `<span class="check-marker">${marker}</span><div class="check-copy"><strong>${escapeHtml(it[0])}</strong><span>${escapeHtml(it[1] || '')}</span></div>`;
    box.appendChild(d);
  });
}
function cachedAgendaRoot() {
  try {
    return normalizeAgendaRootData(JSON.parse(localStorage.getItem(AGENDA_CACHE_KEY) || 'null'));
  } catch {
    return null;
  }
}
function agendaRoot() {
  return (
    [state?.autopilotAgenda, state?.autoPilotAgenda, state?.agenda, cachedAgendaRoot()].find(
      (ag) => ag && (Array.isArray(ag.days) ? ag.days.length > 0 : Boolean(ag.date))
    ) || null
  );
}
function normalizeAgendaItem(item) {
  if (!item || typeof item !== 'object') return item;
  const fields = [
      item.title,
      item.meta,
      item.type,
      item.activity,
      item.event,
      item.name,
      item.child,
      item.who,
      item.person,
      item.owner,
      item.assignee
    ].map((v) => String(v || '')),
    gymnastics = fields.some((v) => /gymnast/i.test(v));
  if (!gymnastics) return { ...item };
  const replaceWill = (v) => String(v || '').replace(/\bwill\b/gi, 'Whitney'),
    fixed = { ...item, title: 'Whitney · Gymnastics', meta: replaceWill(item.meta) };
  ['child', 'who', 'person', 'owner', 'assignee'].forEach((k) => {
    if (k in fixed) fixed[k] = 'Whitney';
  });
  return fixed;
}
function normalizeAgendaDay(day, meta = {}) {
  return {
    ...day,
    ...meta,
    items: Array.isArray(day?.items)
      ? day.items.filter((item) => item?.showOnWall !== false).map(normalizeAgendaItem)
      : []
  };
}
function normalizeAgendaRootData(root) {
  if (!root || typeof root !== 'object') return root;
  if (Array.isArray(root.days))
    return { ...root, days: root.days.map((day) => normalizeAgendaDay(day)) };
  return normalizeAgendaDay(root);
}
function agendaData(date = localDate()) {
  const root = agendaRoot();
  if (!root) return null;
  if (Array.isArray(root.days)) {
    const day = root.days.find((d) => d && d.date === date);
    if (!day) return null;
    return normalizeAgendaDay(day, {
      updatedAt: Number(root.updatedAt || day.updatedAt || 0),
      scheduleUpdatedAt: Number(root.updatedAt || 0),
      schema: Number(root.schema || 2)
    });
  }
  if (root.date && root.date !== date) return null;
  return normalizeAgendaDay(root);
}
function agendaAgeLabel(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const h = Math.floor(ms / 3600000);
  if (h < 2) return 'FRESH';
  if (h < 48) return `${h}H OLD`;
  return `${Math.floor(h / 24)}D OLD`;
}
function renderAgenda(advance = false) {
  const root = agendaRoot(),
    a = agendaData(),
    head = $('agendaStatus'),
    box = $('agendaRows');
  box.innerHTML = '';
  box.style.setProperty('--agenda-rows', 1);
  if (!root) {
    head.textContent = 'READY';
    head.style.color = 'var(--dim)';
    box.innerHTML =
      '<div class="agenda-row agenda-empty"><div></div><div><div class="agenda-title">TODAY\'S FAMILY AGENDA</div><div class="agenda-meta">Waiting for the current AutoPilot schedule.</div></div></div>';
    return;
  }
  const rootAge = Number(root.updatedAt || 0) > 0 ? Date.now() - Number(root.updatedAt) : Infinity,
    ageLabel = agendaAgeLabel(rootAge),
    veryOld = rootAge > 7 * 86400000;
  if (!a) {
    head.textContent = veryOld ? 'STALE' : `CACHED${ageLabel ? ' · ' + ageLabel : ''}`;
    head.style.color = 'var(--gold)';
    box.innerHTML =
      '<div class="agenda-row agenda-empty"><div></div><div><div class="agenda-title">SCHEDULE UNAVAILABLE FOR TODAY</div><div class="agenda-meta">' +
      escapeHtml(
        !lastFetchSucceeded
          ? /pairing rejected/.test(lastError)
            ? 'Wall pairing was rejected. Pair again in wall setup.'
            : 'Cloud connection unavailable. Retrying automatically. Last saved schedule does not include today.'
          : 'Open AutoPilot and sync the current plan; the saved schedule does not include today.'
      ) +
      '</div></div></div>';
    return;
  }
  const attention = String(a.status || '').toLowerCase() === 'attention';
  head.textContent = !lastFetchSucceeded
    ? `OFFLINE · ${ageLabel || 'CACHED'}`
    : veryOld
      ? `STALE · ${ageLabel || 'UNKNOWN AGE'}`
      : attention
        ? 'PLAN · ATTENTION'
        : 'PLAN · CURRENT';
  head.style.color = attention || !lastFetchSucceeded || veryOld ? 'var(--gold)' : 'var(--green)';
  const items = (Array.isArray(a.items) ? a.items : []).filter((i) => i.showOnWall !== false),
    signature = JSON.stringify(
      items.map((it) => [
        it?.time || '',
        it?.title || '',
        it?.meta || '',
        it?.status || '',
        it?.completed === true
      ])
    );
  if (!items.length) {
    box.innerHTML = `<div class="agenda-row agenda-empty"><div></div><div><div class="agenda-title">NO COMMITMENTS TODAY</div><div class="agenda-meta">${veryOld ? 'Using an older last-known-good cache · open AutoPilot when convenient.' : "Nothing is scheduled in today's cached family agenda."}</div></div></div>`;
    return;
  }
  const rows = items.map((it) => {
    const r = document.createElement('div');
    r.className = 'agenda-row';
    r.innerHTML = `<div class="agenda-time">${escapeHtml(it.time || (NonZeroSuite.clockMinutes(it.start24) != null && NonZeroSuite.clock(NonZeroSuite.clockMinutes(it.start24))) || '')}</div><div><div class="agenda-title">${escapeHtml(NonZeroAgendaLabels.title(it))}</div><div class="agenda-meta">${escapeHtml(NonZeroAgendaLabels.rides(it))}</div></div>`;
    box.appendChild(r);
    return r;
  });
  const gap = parseFloat(getComputedStyle(box).rowGap) || 0,
    available = box.clientHeight;
  const pages = [];
  let page = [],
    height = 0;
  rows.forEach((r) => {
    const h = r.getBoundingClientRect().height;
    if (
      page.length &&
      (page.length >= AGENDA_PAGE_SIZE || (available > 0 && height + gap + h > available))
    ) {
      pages.push(page);
      page = [];
      height = 0;
    }
    height += (page.length ? gap : 0) + h;
    page.push(r);
  });
  if (page.length) pages.push(page);
  if (signature !== agendaSignature) {
    agendaSignature = signature;
    agendaPage = 0;
  } else if (advance && pages.length > 1) agendaPage = (agendaPage + 1) % pages.length;
  agendaPage = Math.min(agendaPage, pages.length - 1);
  const selected = pages[agendaPage] || [];
  box.replaceChildren(...selected);
  box.style.setProperty('--agenda-rows', Math.max(1, selected.length));
  if (pages.length > 1) {
    const start = pages.slice(0, agendaPage).reduce((n, p) => n + p.length, 0);
    head.textContent += ` · ${start + 1}–${start + selected.length}/${items.length}`;
  }
}
function renderPerformance() {
  syncAnalyticsSession();
  ergPhase = detectErgPhase();
  const a = validActive(),
    { p, mode, items, rec, joint, partnerItems } = programAndItems(),
    record = a || rec || {};
  const checks = Array.isArray(record.checks) ? record.checks : [],
    sets = Array.isArray(record.sets) ? record.sets : [];
  let done = 0,
    current = -1;
  const list = [];
  items.slice(0, 6).forEach((it, i) => {
    let yes = !!checks[i],
      st = '';
    if (Array.isArray(sets[i]) && sets[i].length) {
      const n = sets[i].filter(Boolean).length;
      st = ` · ${n}/${sets[i].length} SETS`;
      if (n === sets[i].length) yes = true;
    }
    if (yes) done++;
    else if (current < 0) current = i;
    list.push({ it, yes, st, sam: partnerItems[i] });
  });
  const pct = items.length ? Math.round((done * 100) / items.length) : 0;
  setText(
    'perfSession',
    (p.name + (joint ? ' · CHRIS + SAM' : '')).toUpperCase()
  );
  setText(
    'perfWhy',
    `${mode.toUpperCase()} · ${pct}% COMPLETE${joint ? ' · TWO-ATHLETE STATIONS' : ''}`
  );
  let status = String(a?.status || 'READY').toUpperCase();
  if (a) {
    status =
      status === 'PAUSED'
        ? 'PAUSED'
        : current < 0
          ? 'FINISH'
          : current === 0 && /warm|easy spin/i.test(items[0]?.[0] || '')
            ? 'WARM-UP'
            : 'WORK';
  }
  setText('perfBadge', status);
  if (current >= 0) {
    setText(
      'currentMove',
      (joint ? 'CHRIS · ' : '') + items[current][0].toUpperCase()
    );
    setText(
      'currentDetail',
      joint
        ? `${items[current][1]}  |  SAM · ${partnerItems[current]?.[0] || 'Transition'} · ${partnerItems[current]?.[1] || 'reset and coach'}`
        : items[current][1]
    );
    setText(
      'nextMove',
      current + 1 < items.length
        ? (joint ? 'CHRIS · ' : '') + items[current + 1][0].toUpperCase()
        : 'FINISH & SAVE'
    );
  } else {
    setText('currentMove', a ? 'FINISH STRONG' : (items[0]?.[0] || 'READY TO START').toUpperCase());
    setText(
      'currentDetail',
      a
        ? 'All programmed movements are checked.'
        : items[0]?.[1] || 'Your only obligation is to start.'
    );
    setText('nextMove', a ? 'SAVE THE WIN' : items[1]?.[0]?.toUpperCase() || '—');
  }
  const ag = $('perfAgenda');
  ag.innerHTML = '';
  list.forEach((x, i) => {
    const d = document.createElement('div');
    d.className = 'step ' + (x.yes ? 'done' : i === current ? 'current-step' : '');
    d.textContent = `${x.yes ? '✓' : i === current ? '●' : '○'}  ${joint ? 'C ' + x.it[0] + '  |  S ' + (x.sam?.[0] || 'Transition') : x.it[0]}${x.st}`;
    ag.appendChild(d);
  });
  $('perfProgress').style.width = `${pct}%`;
  setText(
    'motivation',
    a?.prCue || (joint ? 'TRAIN TOGETHER · COMPETE WITH THE STANDARD' : 'KEEP PUSHING')
  );
  renderRest(a, current, items);
  renderTelemetry(a);
  updatePerformanceClock();
}
function timerMs(a) {
  if (!a) return 0;
  if (a.autoPm5) return Math.max(0, Date.now() - autoPm5.startedAt);
  const t = a.timer || {};
  let ms = Number(t.elapsedMs || 0);
  const running =
    t.running === true ||
    String(a.status || '').toLowerCase() === 'active' ||
    String(a.status || '').toLowerCase() === 'running';
  const started = Number(t.startedAt || 0);
  if (running && started > 0) ms += Math.max(0, Date.now() - started);
  return ms;
}
function fmtMs(ms) {
  let s = Math.floor(Math.max(0, ms) / 1000),
    h = Math.floor(s / 3600);
  s %= 3600;
  let m = Math.floor(s / 60),
    sec = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
function updatePerformanceClock() {
  const clock = fmtMs(timerMs(performanceWorkout()));
  setText('liveTimer', clock);
  setText('rideElapsed', clock);
}
function renderRest(a, current, items) {
  const r = a?.restTimer,
    el = $('rest');
  if (r?.running === true && Number(r.endsAt) > Date.now()) {
    el.classList.add('active');
    setText('restClock', fmtMs(Number(r.endsAt) - Date.now()));
    setText('restNext', current >= 0 ? `NEXT · ${items[current][0].toUpperCase()}` : 'NEXT UP');
  } else el.classList.remove('active');
}

function detectErgPhase() {
  const a = performanceWorkout();
  if (!a) return false;
  if (a.autoPm5) return true;
  const { p, items, rec } = programAndItems();
  const current = items.find(
    (_, i) =>
      !rec?.checks?.[i] &&
      !(Array.isArray(rec?.sets?.[i]) && rec.sets[i].length && rec.sets[i].every(Boolean))
  );
  const text = [p?.type, a?.type, ...(current || [])].join(' ');
  return /aerobic|bike\s*erg|row\s*erg|ski\s*erg|easy spin|steady.*ride|cycling|rowing/i.test(text);
}
function paceText(seconds) {
  const total = Math.round(safeNumber(seconds));
  return total >= 1 ? `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}` : '—';
}
function zoneClass(el, name) {
  if (!el) return;
  el.classList.remove('zone-endurance', 'zone-tempo', 'zone-push');
  if (name) el.classList.add(name);
}
function setRail(id, value) {
  const e = $(id);
  if (e) e.style.width = `${clamp(value, 0, 100)}%`;
}
const PM5_START_KEY = 'nz.pm5PendingStart.v1';
let pm5StartPending = false,
  pm5StartRetryAt = 0,
  pm5StartRetryMs = 2000;
function queuePm5Start(event) {
  try {
    localStorage.setItem(
      PM5_START_KEY,
      JSON.stringify({
        ...event,
        deviceId,
        transport: /bluetooth|ble/i.test(String(localPm5?.source || '')) ? 'ble' : 'usb',
        machine: localPm5?.machine || 'BikeErg'
      })
    );
    pm5StartRetryAt = 0;
  } catch (e) {
    lastError = 'Motion sync queue: ' + String(e);
  }
}
async function flushPm5Start() {
  if (pm5StartPending || Date.now() < pm5StartRetryAt || !endpoint || !wallToken) return;
  let event;
  try {
    event = JSON.parse(localStorage.getItem(PM5_START_KEY) || 'null');
  } catch {
    localStorage.removeItem(PM5_START_KEY);
    return;
  }
  if (!event) return;
  const held =
    autoPm5.active && autoPm5.sessionId === event.eventId
      ? autoWorkout()
      : resumeWorkoutCache?.sessionId === event.eventId
        ? resumeWorkoutCache
        : null;
  if (
    !held ||
    !NonZeroWorkoutPolicy.active({ activeWorkout: held }) ||
    Date.now() - Number(event.startedAt) > NonZeroWorkoutPolicy.IDLE_MS
  ) {
    localStorage.removeItem(PM5_START_KEY);
    return;
  }
  // A mixed workout remains valid after the erg warmup has stopped.
  event.lastActivityAt = NonZeroWorkoutPolicy.activityAt(held);
  pm5StartPending = true;
  try {
    const r = await fetch(endpoint.replace(/\/$/, '') + '/wall/workout/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NONZERO-Wall': wallToken },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000)
    });
    const result = await r.json();
    if (!r.ok || !result.ok)
      throw Error(
        'Motion start ' +
          r.status +
          (r.status === 401 ? ' · pair wall again' : r.status === 404 ? ' · deploy Worker 5.6' : '')
      );
    if (JSON.parse(localStorage.getItem(PM5_START_KEY) || 'null')?.eventId === event.eventId)
      localStorage.removeItem(PM5_START_KEY);
    pm5StartRetryMs = 2000;
    pm5StartRetryAt = 0;
    void fetchState();
  } catch (e) {
    lastError = String(e);
    pm5StartRetryAt = Date.now() + pm5StartRetryMs;
    pm5StartRetryMs = Math.min(30000, pm5StartRetryMs * 2);
  } finally {
    pm5StartPending = false;
  }
}
const PM5_STOP_KEY = 'nz.pm5PendingStop.v1';
let pm5LifecyclePending = false,
  lastPm5LeaseAt = 0,
  previousMotionTelemetry = null;
async function syncPm5Lifecycle() {
  if (pm5LifecyclePending || !wallToken || !endpoint) return;
  let stop;
  try {
    stop = JSON.parse(localStorage.getItem(PM5_STOP_KEY) || 'null');
  } catch {
    localStorage.removeItem(PM5_STOP_KEY);
  }
  if (stop && stop.reason !== 'extended-inactivity') {
    localStorage.removeItem(PM5_STOP_KEY);
    stop = null;
  }
  const now = Date.now(),
    active = autoPm5.active && now - autoPm5.lastMotionAt < 10000;
  if (!stop && (!active || now - lastPm5LeaseAt < 60000)) return;
  pm5LifecyclePending = true;
  try {
    const event = stop || { eventId: autoPm5.sessionId, lastActivityAt: autoPm5.lastMotionAt };
    const res = await fetch(
      endpoint.replace(/\/$/, '') + '/wall/workout/' + (stop ? 'stop' : 'activity'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-NONZERO-Wall': wallToken },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(5000)
      }
    );
    if (!res.ok) throw Error('PM5 lifecycle ' + res.status + ' · Worker 5.11 required');
    if (stop) {
      if (JSON.parse(localStorage.getItem(PM5_STOP_KEY) || 'null')?.eventId === stop.eventId)
        localStorage.removeItem(PM5_STOP_KEY);
      void fetchState();
    } else lastPm5LeaseAt = now;
  } catch (e) {
    lastError = String(e);
    lastPm5LeaseAt = now - 50000;
  } finally {
    pm5LifecyclePending = false;
  }
}
function finishAutoPm5(now = Date.now()) {
  if (!autoPm5.active) return;
  const summary = {
    sessionId: autoPm5.sessionId,
    date: localDate(new Date(autoPm5.startedAt)),
    type: 'aerobic',
    source: /bluetooth|ble/i.test(String(localPm5?.source || '')) ? 'pm5-ble' : 'pm5-usb',
    completed: false,
    status: 'abandoned',
    duration: Math.max(0, (autoPm5.lastMotionAt - autoPm5.startedAt) / 60000),
    startedAt: autoPm5.startedAt,
    endedAt: autoPm5.lastMotionAt,
    analytics: { ...analytics, powerWindow: [] }
  };
  try {
    const saved = JSON.parse(localStorage.getItem('nz.pm5Sessions') || '[]');
    if (!saved.some((s) => s.sessionId === summary.sessionId)) saved.push(summary);
    localStorage.setItem('nz.pm5Sessions', JSON.stringify(saved.slice(-365)));
    localStorage.setItem(
      PM5_STOP_KEY,
      JSON.stringify({
        eventId: summary.sessionId,
        endedAt: summary.endedAt,
        reason: 'extended-inactivity',
        summary
      })
    );
  } catch (e) {
    lastError = 'PM5 summary save: ' + String(e);
  }
  clearResumeWorkout();
  autoSuppressedSession = autoPm5.sessionId;
  autoPm5.active = false;
  autoPm5.endedAt = now;
  autoPm5.sessionId = null;
  lastCloudModeReason = 'schedule';
  $('performance')?.classList.remove('auto-pm5');
  setManualMode('');
  setMode(desiredMode());
  renderKpis();
  void syncPm5Lifecycle();
}
let lastMotionSample = '';
function observePm5Auto(t) {
  const now = Date.now(),
    stamp = Number(t?.updatedAt || 0),
    key = String(t?.readSequence) + '|' + stamp;
  const newSample = telemetryFresh(t) && key !== lastMotionSample;
  const moving = newSample && NonZeroWorkoutPolicy.motion(t, previousMotionTelemetry, now);
  if (newSample) {
    lastMotionSample = key;
    previousMotionTelemetry = t;
  }
  const raw = state?.activeWorkout,
    cloud = cloudActive();
  // Explicit finish on the phone wins over a local session; require fresh progress to restart.
  if (autoPm5.active && raw?.sessionId === autoPm5.sessionId && !activeStatus(raw)) {
    clearResumeWorkout();
    autoPm5.active = false;
    autoSuppressedSession = raw.sessionId;
    pm5AwaitIdle = true;
    setManualMode('');
    setMode(desiredMode());
    return;
  }
  if (cloud && !NonZeroWorkoutPolicy.automated(cloud)) {
    if (autoPm5.active) {
      autoPm5.active = false;
      $('performance')?.classList.remove('auto-pm5');
    }
    setMode('performance');
    return;
  }
  if (!autoPm5.active && pm5AwaitIdle) {
    if (!telemetryFresh(t) || (Number((t.cadence ?? t.rpm) || 0) < 3 && Number(t.watts || 0) < 5)) {
      pm5AwaitIdle = false;
      pm5RestartEvidence = 0;
    } else if (moving) {
      if (!pm5RestartEvidence) pm5RestartEvidence = now;
      if (now - pm5RestartEvidence >= 3000) {
        pm5AwaitIdle = false;
        pm5RestartEvidence = 0;
      } else return;
    } else {
      pm5RestartEvidence = 0;
      return;
    }
  }
  if (!autoPm5.active && moving) {
    autoPm5.active = true;
    autoPm5.sessionId = cloud?.sessionId || 'pm5-' + now.toString(36);
    autoPm5.startedAt = Number(cloud?.pm5Motion?.startedAt || now);
    autoPm5.baselineElapsed = Number(t?.elapsedSeconds || 0);
    autoPm5.elapsedSeconds = 0;
    autoPm5.lastMotionAt = now;
    autoSuppressedSession = '';
    lastPm5LeaseAt = 0;
    setManualMode('');
    lastCloudModeReason = 'PM5 motion';
    setMode('performance');
    $('performance')?.classList.add('auto-pm5');
    try {
      openSetup(false);
      openHealth(false);
      resetAnalytics();
      coachSamples = [];
      lastCoachAt = 0;
      renderPerformance();
    } catch (e) {
      lastError = 'PM5 display ' + String(e);
    }
    persistResumeWorkout(autoWorkout(), true);
    if (!cloud) queuePm5Start({ eventId: autoPm5.sessionId, startedAt: now });
  }
  if (!autoPm5.active) return;
  if (moving) autoPm5.lastMotionAt = now;
  if (!cloud) persistResumeWorkout(autoWorkout());
  autoPm5.elapsedSeconds = Math.max(0, (now - autoPm5.startedAt) / 1000);
  const related = raw?.sessionId === autoPm5.sessionId ? NonZeroWorkoutPolicy.activityAt(raw) : 0;
  if (now - Math.max(autoPm5.lastMotionAt, related) >= NonZeroWorkoutPolicy.IDLE_MS) {
    finishAutoPm5(now);
    return;
  }
  if (currentMode !== 'performance') setMode('performance');
  void syncPm5Lifecycle();
}
function avgWindow(a, n) {
  let remaining = n,
    work = 0,
    seconds = 0;
  for (let i = a.length - 1; i >= 0 && remaining > 0; i--) {
    const dt = Math.min(remaining, a[i].dt);
    work += a[i].watts * dt;
    seconds += dt;
    remaining -= dt;
  }
  return seconds >= n - 1e-6 ? work / seconds : 0;
}
function ingestAnalytics(t) {
  if (
    !performanceWorkout() ||
    !telemetryFresh(t) ||
    !Number.isFinite(Number(t.watts)) ||
    !Number.isFinite(Number(t.cadence ?? t.rpm)) ||
    String(performanceWorkout()?.status).toLowerCase() === 'paused'
  )
    return;
  syncAnalyticsSession();
  const seq = String(t.readSequence ?? '') + '|' + Number(t.updatedAt);
  if (seq === analytics.lastSeq) return;
  const at = Number(t.updatedAt),
    elapsed = analytics.lastAt ? (at - analytics.lastAt) / 1000 : 0;
  if (elapsed < 0) return;
  analytics.lastSeq = seq;
  const watts = safeNumber(t.watts),
    cad = safeNumber(t.cadence ?? t.rpm),
    hr = safeNumber(t.heartRate),
    distance = safeNumber(t.distanceMeters);
  const dt = elapsed > 0 && elapsed <= 2.5 ? elapsed : 0;
  if (elapsed > 2.5) analytics.powerWindow = [];
  analytics.lastAt = at;
  analytics.maxPower = Math.max(analytics.maxPower, watts);
  analytics.maxCadence = Math.max(analytics.maxCadence, cad);
  analytics.maxHr = Math.max(analytics.maxHr, hr);
  if (dt) {
    analytics.samples++;
    analytics.sampleSeconds += dt;
    analytics.sumPower += watts * dt;
    analytics.sumPowerSq += watts * watts * dt;
    analytics.sumCadence += cad * dt;
    analytics.sumCadenceSq += cad * cad * dt;
    analytics.workKj += (watts * dt) / 1000;
    if (watts >= 5 || cad >= 3) analytics.movingSeconds += dt;
    if (hr > 0) {
      analytics.sumHr += hr * dt;
      analytics.hrSeconds += dt;
      analytics.hrSamples++;
    }
    analytics.powerWindow.push({ watts, dt });
    let seconds = analytics.powerWindow.reduce((n, p) => n + p.dt, 0);
    while (analytics.powerWindow.length > 1 && seconds - analytics.powerWindow[0].dt >= 60)
      seconds -= analytics.powerWindow.shift().dt;
    for (const [key, seconds] of [
      ['peak5', 5],
      ['peak30', 30],
      ['peak60', 60]
    ])
      analytics[key] = Math.max(analytics[key], avgWindow(analytics.powerWindow, seconds));
  }
  if (analytics.startDistance == null) analytics.startDistance = distance;
  if (analytics.lastDistance != null && distance < analytics.lastDistance)
    analytics.startDistance = distance;
  analytics.speedMps =
    dt && distance >= analytics.lastDistance ? (distance - analytics.lastDistance) / dt : 0;
  analytics.lastDistance = distance;
  renderAnalytics(t);
}
function metric(id, label, value) {
  setText('metricLabel' + id, label);
  setText('metricValue' + id, value);
}
function renderAnalytics(t) {
  if (window.NonZeroConnected?.paintRibbon()) return;
  const seconds = analytics.sampleSeconds || 0,
    avgPower = seconds ? analytics.sumPower / seconds : 0,
    avgCad = seconds ? analytics.sumCadence / seconds : 0,
    powerVar = seconds ? Math.max(0, analytics.sumPowerSq / seconds - avgPower * avgPower) : 0,
    powerCv = avgPower ? (Math.sqrt(powerVar) / avgPower) * 100 : 0;
  const goalTargets = coachTargets();
  if (goalTargets.goal) {
    const progress =
      goalTargets.goal.mode === 'calories' && goalTargets.caloriesObserved != null
        ? ` · ${Math.round(goalTargets.caloriesObserved)}/${goalTargets.goal.calories} PM5 KCAL`
        : '';
    setText('sessionInsight', goalTargets.note + progress);
  }
  metric(1, 'AVG POWER', seconds ? `${Math.round(avgPower)} W` : '—');
  metric(2, 'BEST 30s', analytics.peak30 ? `${Math.round(analytics.peak30)} W` : '—');
  metric(3, 'WORK', seconds ? `${analytics.workKj.toFixed(1)} kJ` : '—');
  metric(4, 'MAX POWER', analytics.maxPower ? `${Math.round(analytics.maxPower)} W` : '—');
  metric(
    5,
    'AVG CADENCE',
    seconds ? `${Math.round(avgCad)} ${/row|ski/i.test(t?.machine || '') ? 'SPM' : 'RPM'}` : '—'
  );
  if (!goalTargets.goal)
    setText(
      'sessionInsight',
      seconds < 10
        ? 'BUILDING SESSION BASELINE'
        : powerCv <= 12
          ? `STEADY OUTPUT · ${Math.round(avgPower)} W AVERAGE · ${powerCv.toFixed(1)}% POWER VARIATION`
          : `VARIABLE OUTPUT · ${powerCv.toFixed(1)}% POWER VARIATION`
    );
  if (window.NonZeroConnected)
    setText(
      'sessionInsight',
      'DISPLAY-SAMPLE ESTIMATE · ' + ($('sessionInsight')?.textContent || '')
    );
}
let coachSamples = [],
  lastCoachAt = 0,
  lastCoachFresh = null;
let adaptiveGoalController = null;
function coachTargets() {
  if (typeof NonZeroGoals !== 'undefined') {
    if (!adaptiveGoalController) adaptiveGoalController = NonZeroGoals.create();
    const a = performanceWorkout();
    let cached = {};
    try {
      cached = JSON.parse(localStorage.getItem('nz.automaticRideGoal') || '{}');
    } catch {}
    const recordedProfile =
      window.NonZeroConnected?.snapshot()?.profile ||
      window.NonZeroConnected?.snapshot()?.live?.analytics?.profileUsed ||
      {};
    const data = state?.rideGoal
      ? {
          goal: state.rideGoal,
          profile: NonZeroGoals.profile(
            {
              ...recordedProfile,
              ...(state.rideTargetProfile || state.pm5Analytics?.profile || {})
            },
            state.pm5Analytics?.health || []
          )
        }
      : {
          ...cached,
          profile: NonZeroGoals.profile(
            {
              ...recordedProfile,
              ...(state?.rideTargetProfile || state?.pm5Analytics?.profile || cached.profile || {})
            },
            state?.pm5Analytics?.health || []
          )
        };
    if (state?.rideGoal) {
      const serialized = JSON.stringify(data);
      if (serialized !== localStorage.getItem('nz.automaticRideGoal'))
        try {
          localStorage.setItem('nz.automaticRideGoal', serialized);
        } catch {}
    }
    const program = programAndItems().p,
      mode = programAndItems().mode,
      defaultIntensity =
        mode === 'flare' || /recovery/i.test(program?.type || '') ? 'easy' : 'steady';
    const goal = a?.rideGoal ||
      data.goal || { mode: 'intensity', intensity: defaultIntensity, durationMinutes: 30 };
    const historical = (state?.pm5Analytics?.rides || [])
      .filter(
        (x) =>
          x.status === 'complete' &&
          x.analytics?.observedSeconds >= 600 &&
          Number(x.analytics?.avgWatts) > 20
      )
      .sort((x, y) => y.start - x.start)[0]?.analytics?.avgWatts;
    return adaptiveGoalController.update({
      goal,
      profile: data.profile || {},
      health: data.health || [],
      telemetry: localPm5 || a?.telemetry || {},
      now: Date.now(),
      sessionId: localPm5?.recordingId || a?.sessionId || 'standby',
      referenceWatts: historical,
      paused: String(a?.status).toLowerCase() === 'paused'
    });
  }
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('nz.coachTargets') || '{}');
  } catch {}
  const { p, items } = programAndItems(),
    a = performanceWorkout(),
    prescribed =
      state?.todayPrescription?.date === localDate() ? state.todayPrescription.program : null,
    planned = state?.customToday?.date === localDate() ? state.customToday : prescribed,
    target = a?.targets || p?.targets || planned?.targets || {},
    text = JSON.stringify(autoPm5.active && planned?.full ? planned.full : items),
    range = text.match(/(\d{2,3})\s*[–-]\s*(\d{2,3})\s*rpm/i);
  const numeric = (v, f) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : f);
  return {
    cadenceMin: numeric(
      target.cadenceMin,
      range ? Number(range[1]) : numeric(saved.cadenceMin, 65)
    ),
    cadenceMax: numeric(
      target.cadenceMax,
      range ? Number(range[2]) : numeric(saved.cadenceMax, 90)
    ),
    hrMin: numeric(target.hrMin, numeric(saved.hrMin, 0)),
    hrMax: numeric(target.hrMax, numeric(saved.hrMax, 0)),
    powerMin: numeric(
      target.powerMin,
      numeric(target.powerWatts, numeric(target.targetWatts, numeric(saved.powerMin, 0)))
    ),
    powerMax: numeric(
      target.powerMax,
      numeric(target.powerWatts, numeric(target.targetWatts, numeric(saved.powerMax, 0)))
    )
  };
}
function liveCoachCue(t, targets, rising = false) {
  const rpm = Number(t?.cadence ?? t?.rpm ?? 0),
    hr = Number(t?.heartRate || 0);
  if (t?.fresh === false || t?.recovering || !t?.connected)
    return 'RECONNECTING · HOLD YOUR COMFORTABLE PACE';
  if (rpm < 3 && Number(t?.watts || 0) < 5) return 'RECOVER · RESUME WHEN READY';
  if (hr && targets.hrMax && hr > targets.hrMax)
    return 'EASE YOUR EFFORT · HEART RATE ABOVE TARGET';
  if (hr && targets.hrMax && rising && hr >= targets.hrMax - 5)
    return 'HEART RATE RISING · HOLD OR EASE YOUR EFFORT';
  if (hr && !targets.hrMax && rising)
    return 'HEART RATE RISING · HOLD YOUR PACE AND CHECK YOUR BREATHING';
  if (rpm < targets.cadenceMin)
    return `SMOOTHLY BUILD CADENCE · TARGET ${targets.cadenceMin}–${targets.cadenceMax} RPM`;
  if (rpm > targets.cadenceMax)
    return `SETTLE YOUR CADENCE · TARGET ${targets.cadenceMin}–${targets.cadenceMax} RPM`;
  if (hr && targets.hrMin && hr < targets.hrMin)
    return 'CADENCE ON TARGET · BUILD EFFORT GRADUALLY IF COMFORTABLE';
  return hr && targets.hrMax
    ? 'CADENCE + HEART RATE ON TARGET · KEEP IT STEADY'
    : 'CADENCE ON TARGET · KEEP YOUR BREATHING CONTROLLED';
}
function renderLiveCoach(t) {
  const now = Date.now();
  coachSamples.push({ at: now, hr: Number(t?.heartRate || 0) });
  coachSamples = coachSamples.filter((x) => now - x.at <= 20000);
  const targets = coachTargets(),
    past = coachSamples.find((x) => now - x.at >= 10000 && x.hr > 0),
    rising = !!(past && Number(t?.heartRate) > past.hr + 5),
    urgent = targets.hrMax && Number(t?.heartRate) > targets.hrMax;
  const fresh = telemetryFresh(t),
    changed = fresh !== lastCoachFresh;
  lastCoachFresh = fresh;
  if (fresh && !urgent && !changed && now - lastCoachAt < 4000) return;
  lastCoachAt = now;
  setText(
    'coachCue',
    targets.hrLimited
      ? targets.note
      : targets.goalReached || targets.pace === 'extend'
        ? targets.note
        : liveCoachCue(t, targets, rising)
  );
  $('coachStrip').dataset.alert = urgent ? 'above' : '';
  if (autoPm5.active && ergPhase) {
    setText(
      'currentMove',
      targets.goal ? targets.note : `TARGET · ${targets.cadenceMin}–${targets.cadenceMax} RPM`
    );
    setText(
      'currentDetail',
      targets.hrMax
        ? `HEART RATE · ${targets.hrMin ? targets.hrMin + '–' : ''}${targets.hrMax} BPM`
        : 'HEART RATE · LIVE MONITORING'
    );
  }
  if (autoPm5.active && ergPhase) {
    setText('perfWhy', 'AUTO START · PM5 · LIVE COACHING');
    setText('nextMove', 'KEEP A SMOOTH, CONTROLLED EFFORT');
    setText('perfBadge', 'LIVE');
  }
}
function renderCockpit(t, connected) {
  const watts = connected ? safeNumber(t?.watts) : 0,
    rpm = connected ? safeNumber(t?.cadence ?? t?.rpm) : 0,
    pace = connected ? safeNumber(t?.paceSeconds) : 0,
    distance = connected ? safeNumber(t?.distanceMeters) : 0,
    calories = connected ? safeNumber(t?.calories) : 0,
    hr = connected ? safeNumber(t?.heartRate) : 0;
  const powerPct = clamp((watts / 500) * 100, 0, 100),
    rpmPct = clamp((rpm / 120) * 100, 0, 100);
  if ($('powerGauge')) $('powerGauge').style.strokeDasharray = `${powerPct} 100`;
  if ($('cadenceGauge')) $('cadenceGauge').style.strokeDasharray = `${rpmPct} 100`;
  const targets = coachTargets();
  const pZone = goalStatus(watts, goalRange(targets, 'power'), connected);
  const cZone =
    rpm < 1
      ? 'READY'
      : rpm < targets.cadenceMin
        ? 'BELOW TARGET'
        : rpm <= targets.cadenceMax
          ? 'ON TARGET'
          : 'ABOVE TARGET';
  setText(
    'labHrTarget',
    targets.hrMax
      ? targets.hrMin
        ? `GOAL ${targets.hrMin}–${targets.hrMax} BPM`
        : `CEILING ${targets.hrMax} BPM`
      : 'GOAL NOT SET'
  );
  setText('powerZone', pZone);
  setText('cadenceZone', cZone);
  zoneClass(
    document.querySelector('.power-dial'),
    watts < 1 ? '' : watts < 150 ? 'zone-endurance' : watts < 250 ? 'zone-tempo' : 'zone-push'
  );
  zoneClass(
    document.querySelector('.cadence-dial'),
    rpm < 1 ? '' : rpm < 65 ? 'zone-endurance' : rpm <= 90 ? 'zone-tempo' : 'zone-push'
  );
  setRail('paceRail', pace ? clamp((300 - pace) / 1.8, 0, 100) : 0);
  setRail('distanceRail', (distance / 5000) * 100);
  setRail('caloriesRail', (calories / 500) * 100);
  const hrBox = document.querySelector('.hr-metric');
  if (hrBox) {
    hrBox.classList.remove('z1', 'z2', 'z3', 'z4', 'z5');
    if (hr > 0)
      hrBox.classList.add(
        hr < 105 ? 'z1' : hr < 122 ? 'z2' : hr < 140 ? 'z3' : hr < 157 ? 'z4' : 'z5'
      );
  }
  renderLabTrace(
    t,
    connected && !document.getElementById('telemetry').classList.contains('recovering')
  );
  const max = Number($('powerScaleTop')?.textContent.split(' ')[0]) || 500;
  setText('powerZone', goalStatus(watts, goalRange(targets, 'power'), connected));
  if ($('powerGauge'))
    $('powerGauge').style.strokeDasharray = `${clamp((watts / max) * 100, 0, 100)} 100`;
  const cmax = Number($('cadenceScaleTop')?.textContent.split(' ')[0]) || 120;
  if ($('cadenceGauge'))
    $('cadenceGauge').style.strokeDasharray = `${clamp((rpm / cmax) * 100, 0, 100)} 100`;
  hrBox?.classList.toggle('hr-above', !!(hr && targets.hrMax && hr > targets.hrMax));
}

let lastGoodTelemetry = null,
  lastGoodTelemetryAt = 0;
function rememberTelemetry(t) {
  if (telemetryFresh(t)) {
    lastGoodTelemetry = { ...t };
    lastGoodTelemetryAt = Date.now();
  }
}
function renderTelemetry(a) {
  const cloud = a?.telemetry || a?.pm5Telemetry || state?.pm5Telemetry || state?.telemetry || null,
    localUsable = telemetryFresh(localPm5),
    cloudUsable = telemetryFresh(cloud),
    active = currentMode === 'performance' || ergPhase;
  const fresh = localUsable ? localPm5 : cloudUsable ? cloud : null;
  if (active && fresh) rememberTelemetry(fresh);
  const hold = active && !fresh && lastGoodTelemetry && Date.now() - lastGoodTelemetryAt < 3000,
    t = fresh || (hold ? lastGoodTelemetry : {}),
    connected = !!(active && (fresh || hold)),
    el = $('telemetry'),
    status = $('pm5Status');
  el.classList.toggle('live', !!(active && fresh));
  el.classList.toggle('flowing', !!(active && fresh));
  el.classList.toggle('recovering', !!hold);
  el.classList.toggle('fault', !!(active && !fresh && localPm5?.error));
  el.dataset.state = fresh ? 'live' : hold ? 'held' : 'waiting';
  status.className = 'pm5-status ' + (fresh ? 'live' : 'waiting');
  status.textContent = !active
    ? 'PM5 · STANDBY'
    : hold
      ? 'LAST SAMPLE · RECONNECTING'
      : localUsable
        ? 'PM5 · ' + (/Bluetooth/i.test(String(localPm5?.source)) ? 'BLUETOOTH' : 'USB') + ' · LIVE'
        : cloudUsable
          ? 'PM5 · CLOUD · LIVE'
          : localPm5?.error
            ? 'PM5 · RECONNECTING'
            : 'PM5 · WAITING FOR DATA';
  status.title = localPm5?.error || '';
  const reading = (key) =>
    connected && t[key] != null && Number.isFinite(Number(t[key]))
      ? Math.round(safeNumber(t[key]))
      : '—';
  setText('watts', reading('watts'));
  setText(
    'rpm',
    connected && Number.isFinite(Number(t.cadence ?? t.rpm))
      ? Math.round(safeNumber(t.cadence ?? t.rpm))
      : '—'
  );
  setText('pace', connected ? paceText(t.paceSeconds) : '—');
  setText('paceUnit', 'AVG /1KM');
  setText('distance', reading('distanceMeters'));
  setText('calories', reading('calories'));
  setText(
    'heartRate',
    connected && safeNumber(t.heartRate) > 0 ? Math.round(safeNumber(t.heartRate)) : '—'
  );
  setText('cadenceUnit', /row|ski/i.test(t.machine || '') ? 'SPM' : 'RPM');
  renderCockpit(t, !!(active && fresh));
  if (active) updatePerformanceClock();
  if (active && fresh && ergPhase) ingestAnalytics(fresh);
  if (ergPhase) renderLiveCoach(fresh || { connected: false, fresh: false });
  try {
    window.NonZeroRide?.update(fresh, {
      active: currentMode === 'performance',
      erg: ergPhase,
      paused: String(a?.status || '').toLowerCase() === 'paused',
      session: a?.sessionId || null,
      coach: $('coachCue')?.textContent,
      targets: ergPhase ? coachTargets() : {}
    });
  } catch (e) {
    lastError = 'Ride ' + String(e);
  }
}
let pm5PollPending = false,
  lastPm5ArmAt = 0;
async function pollPm5() {
  if (pm5PollPending) return;
  pm5PollPending = true;
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 2000);
  try {
    if (Date.now() - lastPm5ArmAt > 3000) {
      lastPm5ArmAt = Date.now();
      fetch('/api/erg/arm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          armed: ergPhase,
          workoutActive: !!performanceWorkout(),
          phase: ergPhase ? 'erg-session' : 'watching'
        }),
        signal: controller.signal
      }).catch(() => {});
    }
    const r = await fetch('/api/erg/telemetry', { cache: 'no-store', signal: controller.signal });
    if (!r.ok) throw new Error('PM5 ' + r.status);
    localPm5 = await r.json();
    window.NonZeroRide?.ingestTelemetry?.(localPm5);
    window.NonZeroCoachBridge?.retry(localPm5.connectionRetry);
    lastPm5At = Number(localPm5.updatedAt || 0);
    const seq = String(localPm5.readSequence) + '|' + lastPm5At;
    if (seq !== lastPm5Sequence) {
      lastPm5Sequence = seq;
    }
    observePm5Auto(localPm5);
    void flushPm5Start();
    void syncPm5Lifecycle();
    ergPhase = detectErgPhase();

    pm5Errors = localPm5.error ? pm5Errors + 1 : 0;
    if (localPm5.error) lastError = 'PM5 ' + localPm5.error;
    renderTelemetry(performanceWorkout());
  } catch (e) {
    pm5Errors++;
    lastError = String(e);
    observePm5Auto(null);
    void syncPm5Lifecycle();
    renderTelemetry(performanceWorkout());
  } finally {
    clearTimeout(timeout);
    pm5PollPending = false;
  }
}
// Mode-aware render budget. Expensive panels are recomputed on cloud changes,
// not on every wall-clock tick. Analytics/quotes remain foreground in Ambient.
let lastReadinessRenderAt = 0;
let lastMoodRenderAt = 0;
let lastAgendaRenderAt = 0;
let lastAgendaKey = '';
function renderAll() {
  window.NonZeroGoalCoachUI?.render();
  window.NonZeroConnected?.render();
  renderSurgeryReadiness();
  lastReadinessRenderAt = Date.now();
  renderKpis();
  renderToday();
  renderAgenda();
  lastAgendaRenderAt = Date.now();
  renderPerformance();
  renderDayMood();
  renderCommandCenterSafely();
}
function escapeHtml(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

function showQuoteStage() {
  const m = $('mindset');
  if (m) m.classList.remove('agenda-active');
  setText('mindsetEyebrow', moodEyebrow());
}
let quoteFetchPending = false;
async function fetchQuotes() {
  if (quoteFetchPending) return false;
  quoteFetchPending = true;
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const u =
      endpoint.replace(/\/$/, '') + `/quotes/feed?device=${encodeURIComponent(deviceId)}&limit=240`;
    const r = await fetch(u, { cache: 'no-store', signal: controller.signal });
    if (!r.ok) throw new Error('quote ' + r.status);
    const d = await r.json(),
      arr = Array.isArray(d) ? d : Array.isArray(d.quotes) ? d.quotes : [];
    if (arr.length) {
      quotes = quoteRotation.merge(arr);
      quoteFeedAt = Date.now();
      return true;
    }
  } catch (e) {
    lastError = String(e);
  } finally {
    clearTimeout(timeout);
    quoteFetchPending = false;
  }
  return false;
}
function quoteCadence() {
  return currentMode === 'night' ? 45000 : currentMode === 'performance' ? 18000 : 13000;
}
function resetQuoteTimer() {
  clearInterval(quoteTimer);
  quoteTimer = setInterval(nextQuote, quoteCadence());
}
function resetQuoteTypography() {
  ['ambientQuote', 'nightQuote'].forEach((id) => {
    const n = $(id);
    if (!n) return;
    n.style.removeProperty('font-size');
    n.style.removeProperty('--quote-scale');
    n.style.removeProperty('transform');
    n.style.removeProperty('zoom');
    n.removeAttribute('data-quote-length');
    n.removeAttribute('data-size');
  });
}
function persistQuoteMemory() {
  try {
    localStorage.setItem(QUOTE_MEMORY_KEY, JSON.stringify(quoteMemory.slice(-QUOTE_MEMORY_MAX)));
  } catch {}
}
function rememberQuote(q) {
  const rec = { id: quoteKey(q), author: quoteAuthor(q), concept: quoteConcept(q), ts: Date.now() };
  quoteMemory.push(rec);
  if (quoteMemory.length > QUOTE_MEMORY_MAX)
    quoteMemory.splice(0, quoteMemory.length - QUOTE_MEMORY_MAX);
  persistQuoteMemory();
}
let quoteFullText = '';
function ambientQuoteFits() {
  const box = $('ambientQuote'),
    text = box?.firstElementChild;
  if (!box || !text || !box.clientHeight) return false;
  const style = getComputedStyle(box),
    height =
      box.clientHeight -
      parseFloat(style.paddingTop || 0) -
      parseFloat(style.paddingBottom || 0) -
      2;
  return text.getBoundingClientRect().height <= height && text.scrollWidth <= text.clientWidth + 1;
}
function paintQuote() {
  const box = $('ambientQuote');
  if (box) {
    const text = document.createElement('span');
    text.textContent = quoteFullText;
    box.replaceChildren(text);
  }
  setText('mindsetEyebrow', moodEyebrow());
  lastQuotePaint = Date.now();
}
const quoteFitCache = new Map();
function pickDisplayQuote() {
  if (currentMode !== 'ambient')
    return quoteRotation.pick(Math.random, {
      context: dayMood(),
      score: (q) => NonZeroDayMood.score(q, dayMood())
    });
  const previous = quoteFullText,
    author = $('ambientAuthor')?.textContent || '';
  const accept = (candidate) => {
    const box = $('ambientQuote'),
      style = box ? getComputedStyle(box) : {},
      key = [
        box?.clientWidth,
        box?.clientHeight,
        style.fontSize,
        candidate.text,
        candidate.author
      ].join('|');
    if (quoteFitCache.get(key) === false) return false;
    quoteFullText = candidate.text;
    setText('ambientAuthor', '— ' + candidate.author);
    paintQuote();
    const fits = ambientQuoteFits();
    if (quoteFitCache.size > 3000) quoteFitCache.clear();
    quoteFitCache.set(key, fits);
    return fits;
  };
  // Keep the current optical size. Only complete quotes that fit are eligible.
  for (let i = 0; i < quoteRotation.catalog.length; i++) {
    const candidate = quoteRotation.pick(Math.random, {
      context: dayMood(),
      score: (q) => NonZeroDayMood.score(q, dayMood()),
      accept
    });
    if (!candidate) break;
    quoteFullText = candidate.text;
    setText('ambientAuthor', '— ' + candidate.author);
    paintQuote();
    if (ambientQuoteFits()) return candidate;
  }
  quoteFullText = previous;
  setText('ambientAuthor', author);
  paintQuote();
  return null;
}
function reflowQuote() {
  if (currentMode !== 'ambient' || !quoteFullText) return;
  paintQuote();
  if (!ambientQuoteFits()) nextQuote();
}
window.addEventListener('resize', () => {
  quoteFitCache.clear();
  requestAnimationFrame(reflowQuote);
});
if (document.fonts)
  document.fonts.ready.then(() => {
    quoteFitCache.clear();
    requestAnimationFrame(reflowQuote);
  });
function nextQuote() {
  if (document.hidden || !['ambient', 'night'].includes(currentMode)) return;
  carouselStep++;
  showQuoteStage();
  resetQuoteTypography();
  const q = pickDisplayQuote();
  if (!q) return;
  quotes = quoteRotation.catalog;
  quoteIndex = quotes.indexOf(q);
  const id = quoteKey(q);
  rememberQuote(q);
  shown.push(id);
  if (shown.length > 160) shown.splice(0, shown.length - 160);
  shownBatch.push(id);
  if (shownBatch.length > 240) shownBatch.splice(0, shownBatch.length - 240);
  quotePaints++;
  lastQuotePaint = Date.now();
  quoteFullText = q.text;
  setText('ambientAuthor', '— ' + q.author);
  paintQuote();
  setText('nightQuote', q.text);
  setText('nightAuthor', '— ' + q.author);
  if (Date.now() - lastQuoteHistoryFlush >= 21600000) flushHistory([...shownBatch]);
  if (quotePaints % 60 === 0) fetchQuotes();
}
async function flushHistory(ids) {
  if (!ids.length) return;
  try {
    const r = await fetch(endpoint.replace(/\/$/, '') + '/quotes/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device: deviceId, ids: [...new Set(ids)] })
    });
    if (r.ok) {
      shownBatch = [];
      lastQuoteHistoryFlush = Date.now();
      localStorage.setItem('nz.quoteHistoryFlushAt', String(lastQuoteHistoryFlush));
    }
  } catch {}
}
async function feedback(action) {
  const q = quotes[quoteIndex];
  if (!q) return;
  if (action === 'next') {
    nextQuote();
    return;
  }
  try {
    await fetch(endpoint.replace(/\/$/, '') + '/quotes/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device: deviceId, id: q.id, action })
    });
  } catch {}
}
async function pair() {
  const code = $('pairCode').value.trim(),
    ep = $('endpointInput').value.trim().replace(/\/$/, '');
  if (!/^\d{6}$/.test(code)) {
    setText('setupStatus', 'Enter a six-digit code.');
    return;
  }
  const pairingAbort = new AbortController();
  const pairingTimeout = setTimeout(() => pairingAbort.abort(), 15000);
  try {
    setText('setupStatus', 'Pairing…');
    const r = await fetch(ep + '/pair/claim', {
      signal: pairingAbort.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ code })
    });
    const d = await r.json();
    if (!r.ok || !d.wallToken) throw new Error(d.error || 'pairing failed');
    endpoint = ep;
    wallToken = d.wallToken;
    localStorage.setItem('nz.endpoint', endpoint);
    localStorage.setItem('nz.wallToken', wallToken);
    setText('setupStatus', 'PAIRED · cloud state will load now.');
    await fetchState();
    setTimeout(() => openSetup(false), 800);
    return true;
  } catch (e) {
    setText('setupStatus', 'Pairing failed · ' + e.message);
    return false;
  } finally {
    clearTimeout(pairingTimeout);
  }
}
function openSetup(on = true, automatic = false) {
  $('setupOverlay').classList.toggle('open', on);
  $('endpointInput').value = endpoint;
  setText('setupStatus', wallToken ? 'Paired token present.' : 'Not paired yet.');
  if (on) $('pairCode').focus();
}
function health() {
  const a = validActive();
  return [
    `NONZERO Pi v${RELEASE_VERSION}`,
    `UPTIME: ${fmtMs(Date.now() - bootAt)}`,
    `MODE: ${currentMode} · REASON: ${lastCloudModeReason} · SCHEDULE: ${scheduleMode()} · MANUAL: ${manualMode || 'none'}`,
    `STATE REV: ${lastRevision} · LAST FETCH AGE: ${lastStateAt ? Math.round((Date.now() - lastStateAt) / 1000) + 's' : '—'} · DATA AGE: ${state?._meta?.updatedAt ? Math.round((Date.now() - Number(state._meta.updatedAt)) / 60000) + 'm' : 'UNKNOWN'} · AGENDA AGE: ${agendaRoot()?.updatedAt ? Math.round((Date.now() - Number(agendaRoot().updatedAt)) / 60000) + 'm' : 'UNKNOWN'} · POLL ERRORS: ${pollErrors} · LAST FETCH: ${lastFetchSucceeded ? 'OK' : 'FAILED'}`,
    `CLOUD POLL: ${performanceWorkout() ? CLOUD_ACTIVE_POLL_MS : CLOUD_IDLE_POLL_MS}ms · TRANSITIONS: ${cloudTransitionCount} · LAST: ${lastCloudTransitionAt ? Math.round((Date.now() - lastCloudTransitionAt) / 1000) + 's ago' : '—'}`,
    `RENDERS: ${renderCount} · LAST RENDER AGE: ${lastRenderAt ? Math.round((Date.now() - lastRenderAt) / 1000) + 's' : '—'}`,
    `PAINT PULSE: ${framePulse} · RAF AGE: ${Math.round((Date.now() - lastRafAt) / 1000)}s`,
    `QUOTES: ${quotePaints} · CATALOG ${quoteRotation.stats.size} · UNSEEN ${quoteRotation.stats.remaining} · CYCLE ${quoteRotation.stats.cycle} · LAST PAINT AGE: ${lastQuotePaint ? Math.round((Date.now() - lastQuotePaint) / 1000) + 's' : '—'} · FEED AGE: ${quoteFeedAt ? Math.round((Date.now() - quoteFeedAt) / 1000) + 's' : '—'}`,
    `KV GUARD: CLOUD HEARTBEAT ${lastCloudHeartbeat ? Math.round((Date.now() - lastCloudHeartbeat) / 1000) + 's AGO' : 'PENDING'} · READ-ONLY POLL 2s · ONE KV KEY`,
    `ACTIVE WORKOUT: ${a ? 'YES' : 'NO'} · SOURCE: ${a?.autoPm5 ? 'PM5 MOTION' : a ? 'CLOUD' : 'NONE'} · TIMER: ${fmtMs(timerMs(a))}`,
    `PM5: ${localPm5?.connected ? (/Bluetooth/i.test(String(localPm5.source)) ? 'BLUETOOTH CONNECTED' : 'USB CONNECTED') : localPm5?.error ? 'CONNECTION ERROR' : 'WAITING'} · BRIDGE: ${localPm5?.bridgeState || 'unknown'} · AGE: ${lastPm5At ? Math.round((Date.now() - lastPm5At) / 1000) + 's' : '—'} · ERRORS: ${pm5Errors}`,
    `PM5 ARCHIVE: ${localPm5?.captureStored ? 'SAVING RECEIVED DATA' : 'NOT CONFIRMED'} · TARGET: ${localPm5?.captureTargetHz || 'BLE notification'} Hz · ERROR: ${localPm5?.captureError || 'none'}`,
    `DEVICE: ${deviceId} · PAIRED: ${wallToken ? 'YES' : 'NO'}`,
    `WATCHDOG BROWSER RELOADS: ${watchdogReloads}`,
    `LAST ERROR: ${lastError || 'none'}`
  ].join('\n');
}
function openHealth(on = true) {
  $('healthOverlay').classList.toggle('open', on);
  if (on) setText('healthText', health());
}
let heartbeatInFlight = false;
async function heartbeat() {
  if (heartbeatInFlight) return;
  heartbeatInFlight = true;
  try { await heartbeatBody(); } finally { heartbeatInFlight = false; }
}
async function heartbeatBody() {
  const a = validActive(),
    pm5Fresh = !!(localPm5?.updatedAt && Date.now() - Number(localPm5.updatedAt) < 3000),
    payload = {
      connection: window.NonZeroCoachBridge?.proof(),
      ts: Date.now(),
      mode: currentMode,
      modeReason: lastCloudModeReason,
      lastStateAt,
      lastQuotePaint,
      renderCount,
      revision: lastRevision,
      framePulse,
      lastRafAt,
      clockText: $('footerClock')?.textContent || '',
      commandNonce: lastCommandNonce,
      activeWorkout: !!a,
      activeSource: a?.autoPm5 ? 'pm5-motion' : a ? 'cloud' : null,
      activeSessionId: a?.sessionId || null,
      uptimeSeconds: Math.round((Date.now() - bootAt) / 1000),
      version: RELEASE_VERSION,
      deviceId,
      ride: window.NonZeroRide?.snapshot(),
      pm5: {
        connected: Boolean(localPm5?.connected && pm5Fresh),
        fresh: pm5Fresh,
        captureStored: localPm5?.captureStored === true,
        captureError: localPm5?.captureError || null,
        captureTargetHz: localPm5?.captureTargetHz || null,
        bridgeState: String(localPm5?.bridgeState || 'unknown'),
        error: localPm5?.error || null,
        updatedAt: Number(localPm5?.updatedAt || 0),
        cadence: telemetryFresh(localPm5) ? Number(localPm5.cadence ?? localPm5.rpm) || 0 : 0,
        watts: telemetryFresh(localPm5) ? Number(localPm5.watts) || 0 : 0,
        machine: String(localPm5?.machine || 'Concept2')
      },
      services: { pm5Bridge: Boolean(localPm5) }
    };
  try {
    await fetch('/api/heartbeat', {
      signal: AbortSignal.timeout(2000),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch {}
  const signature = JSON.stringify([
    payload.mode,
    payload.commandNonce,
    payload.activeSessionId || '',
    payload.pm5.connected,
    payload.pm5.bridgeState,
    payload.pm5.error || '',
    payload.services.pm5Bridge,
    payload.ride?.controlNonce || '',
    payload.ride?.audioState,
    payload.ride?.scene,
    payload.ride?.muted
  ]);
  const cloudDue =
    Date.now() - lastCloudHeartbeat >= 15000 /* keep Wall presence fresh in Ambient and Performance */ ||
    signature !== lastCloudHeartbeatSignature;
  try {
    if (cloudDue && endpoint && wallToken) {
      const r = await fetch(endpoint.replace(/\/$/, '') + '/wall/heartbeat', {
        signal: AbortSignal.timeout(5000),
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-NONZERO-Wall': wallToken },
        body: JSON.stringify(payload)
      });
      if (r.ok) {
        try {
          const ack = await r.json();
          void window.NonZeroCoachBridge?.acceptConnectionAck(ack.phoneAck);
        } catch {}
        lastCloudHeartbeat = Date.now();
        lastCloudHeartbeatSignature = signature;
      } else {
        lastError =
          'Cloud heartbeat ' + r.status + (r.status === 401 ? ' · pair wall again' : ' · retrying');
      }
    }
  } catch {}
}
function paintPulse() {
  framePulse = (framePulse + 1) % 1000000000;
  lastRafAt = Date.now();
  // Probe compositor once per second outside Performance; no idle 60fps loop.
  setTimeout(() => requestAnimationFrame(paintPulse),
    currentMode === 'performance' ? 100 : 1000);
}
function tick() {
  const wanted = desiredMode();
  if (wanted !== currentMode) setMode(wanted);
  const d = new Date(),
    clock = formatClock(d),
    date = formatDate(d),
    trayDate = formatTrayDate(d);
  ['footerClock', 'perfFooterClock'].forEach((id) => setText(id, clock));
  ['footerDate', 'perfFooterDate'].forEach((id) => setText(id, trayDate));
  setText('nightClock', clock);
  setText('nightDate', date);
  setText('deepClock', clock);
  setText('deepDate', date);
  if (currentMode === 'performance') updatePerformanceClock();
  try {
    const now = Date.now();
    // Ambient: refresh analytics every minute; Night: 5m; Deep: 15m.
    // Performance: 10s; telemetry/coach are updated separately on PM5 reads.
    const analyticsInterval = currentMode === 'performance' ? 10000 :
      currentMode === 'ambient' ? 60000 : currentMode === 'night' ? 300000 : 900000;
    if (now - lastReadinessRenderAt >= analyticsInterval) {
      renderSurgeryReadiness();
      lastReadinessRenderAt = now;
    }
    if (now - lastMoodRenderAt >= (currentMode === 'performance' ? 5000 : 30000)) {
      renderDayMood();
      lastMoodRenderAt = now;
    }
  } catch (e) {
    lastError = 'Optional panels: ' + String(e);
  }
  if ($('healthOverlay').classList.contains('open')) setText('healthText', health());
}
function installHandlers() {
  $('saveCoachTargets').onclick = () => {
    const values = {};
    ['cadenceMin', 'cadenceMax', 'hrMin', 'hrMax', 'powerMin', 'powerMax'].forEach(
      (k) => (values[k] = Number($(k).value || 0))
    );
    if (
      Object.values(values).some((v) => !Number.isFinite(v)) ||
      values.powerMin < 0 ||
      values.powerMax > 3000 ||
      (values.powerMin && !values.powerMax) ||
      (values.powerMax && values.powerMax < values.powerMin) ||
      values.cadenceMin < 3 ||
      values.cadenceMax < values.cadenceMin ||
      values.cadenceMax > 200 ||
      (values.hrMin && !values.hrMax) ||
      (values.hrMax && values.hrMax < values.hrMin) ||
      values.hrMin < 0 ||
      values.hrMax > 240
    ) {
      setText(
        'setupStatus',
        'Enter a valid cadence range and optional power/heart-rate ranges. Leave both power or heart-rate fields blank to disable that goal.'
      );
      return;
    }
    localStorage.setItem('nz.coachTargets', JSON.stringify(values));
    lastCoachAt = 0;
    setText('setupStatus', 'Coaching targets saved.');
  };
  const target = coachTargets();
  ['cadenceMin', 'cadenceMax', 'hrMin', 'hrMax', 'powerMin', 'powerMax'].forEach(
    (k) => ($(k).value = target[k] || '')
  );
  $('pairButton').onclick = pair;
  $('closeSetup').onclick = () => openSetup(false);
  $('clearPair').onclick = () => {
    localStorage.removeItem('nz.wallToken');
    wallToken = '';
    setText('setupStatus', 'Pairing cleared.');
    setCloud(false, 'PAIR WALL');
  };
  $('closeHealth').onclick = () => openHealth(false);
  document.addEventListener('keydown', (e) => {
    if ($('setupOverlay').classList.contains('open')) {
      if (e.key === 'Escape') openSetup(false);
      return;
    }
    if ($('healthOverlay').classList.contains('open')) {
      if (e.key === 'Escape' || e.key === 'F1') openHealth(false);
      return;
    }
    const k = e.key.toLowerCase();
    if (e.key === 'F2' || k === 's') {
      openSetup(true);
      e.preventDefault();
    } else if (e.key === 'F1' || k === 'h') {
      openHealth(true);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      feedback('more');
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      feedback('less');
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      feedback('next');
      e.preventDefault();
    } else if (k === 'a') {
      setManualMode('ambient');
      setMode('ambient');
    } else if (k === 'p') {
      setManualMode('performance');
      setMode('performance');
    } else if (k === 'n') {
      setManualMode('night');
      setMode('night');
    } else if (k === 'd') {
      setManualMode('deep');
      setMode('deep');
    } else if (e.key === 'Escape') {
      setManualMode('');
      setMode(desiredMode());
    }
  });
  window.addEventListener('error', (e) => {
    lastError = `JS ${e.message} @${e.lineno}`;
  });
  window.addEventListener('unhandledrejection', (e) => {
    lastError = 'Promise ' + String(e.reason);
  });
}

function retryCloud() {
  if (stateFetchPending) return;
  clearTimeout(statePollTimer);
  statePollLoop();
}
window.addEventListener('pagehide', () => {
  try {
    persistResumeWorkout(cloudActive() || autoWorkout() || resumeWorkoutCache, true);
  } catch {}
});
window.addEventListener('online', retryCloud);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) retryCloud();
});
async function boot() {
  window.NonZeroCoachBridge?.attach({
    getState: () => state,
    getConfig: () => ({ endpoint, wallToken, coachStatus: window.NonZeroCoachingBackend }),
    retry: () => {
      void flushPm5Start();
      void fetchState();
      void heartbeat();
    }
  });
  window.NonZeroGoalCoachUI?.attach({
    getState: () => state,
    onModel: (m) => {
      const key = m.phase + '|' + m.trainingAllowed;
      if (window.__nzRecoveryPhase !== key) {
        window.__nzRecoveryPhase = key;
        try {
          renderToday();
        } catch {}
      }
    }
  });
  window.NonZeroConnected?.attach({
    getState: () => state,
    getMode: () => currentMode,
    getTargets: () => coachTargets(),
    onData: () => {
      try {
        renderTelemetry(performanceWorkout());
        renderKpis();
        renderDayMood();
      } catch (e) {
        lastError = 'Recorder display: ' + String(e);
      }
    }
  });
  setInterval(() => {
    try {
      tick();
    } catch (e) {
      lastError = 'Clock: ' + String(e);
    }
  }, 1000);
  // One PM5 poll at a time, with a mode-specific cadence. Always retain
  // low-frequency PM5 motion detection to wake the Wall automatically.
  function schedulePm5Poll() {
    const interval = currentMode === 'performance' ? 500 :
      currentMode === 'ambient' ? 2000 : currentMode === 'night' ? 4000 : 5000;
    setTimeout(async () => {
      try { await pollPm5(); } finally { schedulePm5Poll(); }
    }, interval);
  }
  schedulePm5Poll();
  setInterval(heartbeat, 5000);
  void pollLocalControls();
  // Local phone controls remain responsive in every mode.
  setInterval(pollLocalControls, 1000);
  pollPm5();
  statePollLoop();
  heartbeat();
  try {
    installHandlers();
  } catch (e) {
    lastError = 'Controls: ' + String(e);
  }
  requestAnimationFrame(paintPulse);
  setMode(desiredMode());
  try {
    renderAll();
    tick();
    nextQuote();
  } catch (e) {
    lastError = 'Optional startup panels: ' + String(e);
  }
  fetchQuotes();
  setInterval(() => {
    if (currentMode === 'ambient' && !document.hidden) {
      renderAgenda(true);
      lastAgendaRenderAt = Date.now();
    }
  }, AGENDA_ROTATE_MS);
  setInterval(() => {
    if (
      ['ambient', 'night'].includes(currentMode) &&
      lastQuotePaint &&
      Date.now() - lastQuotePaint > Math.max(120000, quoteCadence() * 3)
    ) {
      lastError = 'quote watchdog recovered stale quote cadence';
      nextQuote();
      resetQuoteTimer();
    }
  }, 15000);
  setInterval(() => {
    if (document.hidden) return;
    if (
      lastRenderAt &&
      lastStateAt &&
      Date.now() - lastRenderAt > 300000 &&
      Date.now() - lastStateAt < 45000
    ) {
      renderAll();
      lastRenderAt = Date.now();
    }
  }, 30000);
  if (!wallToken)
    setTimeout(() => {
      if (!performanceWorkout()) openSetup(true, true);
    }, 1200);
}
function renderSurgeryReadiness() {
  try {
    if (state) {
      const value = JSON.stringify({
        binding: endpoint + '|' + wallToken,
        state: {
          bodyMeasurements: state.bodyMeasurements || [],
          surgeryPlan: state.surgeryPlan || {},
          pm5Analytics: { health: state.pm5Analytics?.health || [] }
        }
      });
      if (localStorage.getItem('nz.weightJourney.v1') !== value)
        localStorage.setItem('nz.weightJourney.v1', value);
    }
  } catch {}
  const live = document.getElementById('wallLiveWeight');
  if (live) {
    const markup = NonZeroWeightJourney.panel(state, localDate(), 30, 'live');
    if (live.__weightMarkup !== markup) {
      live.innerHTML = markup;
      live.__weightMarkup = markup;
    }
  }

  const x = NonZeroReadiness.summary(state, localDate());
  const wm = NonZeroWeightJourney.model(state, localDate(), 30),
    basis = wm.avg ?? wm.latest?.weightLb,
    loss = basis == null ? null : wm.p.baseline - basis,
    pct = loss == null ? 0 : Math.max(0, Math.min(100, (loss / Math.max(1, wm.p.loss)) * 100)),
    nextWeight = basis == null ? null : wm.milestones.map((m) => m.weight).find((n) => basis > n);
  setText('weightKpiValue', basis == null ? '—' : Number(basis).toFixed(1));
  setText(
    'weightKpiBasis',
    wm.avg != null
      ? '7-DAY AVG · LB'
      : wm.latest
        ? 'LATEST · ' + wm.latest.date
        : 'RECENT WEIGHT NEEDED'
  );
  setText(
    'weightLostContext',
    loss == null
      ? 'ADD A DATED WEIGHT'
      : loss >= 0
        ? loss.toFixed(1) + ' / ' + wm.p.loss.toFixed(1) + ' LB LOST'
        : Math.abs(loss).toFixed(1) + ' LB ABOVE BASELINE'
  );
  setText(
    'weightNextContext',
    loss == null
      ? 'ROAD TO 185'
      : Math.round(pct) +
          '% · ' +
          (nextWeight != null ? 'NEXT ' + nextWeight.toFixed(1) + ' LB' : 'GOAL REACHED')
  );
  const rail = $('weightProgressRail'),
    fill = $('weightProgressFill');
  if (fill) fill.style.width = pct + '%';
  if (rail) {
    rail.setAttribute('aria-valuemax', String(wm.p.loss));
    rail.setAttribute('aria-valuenow', String(Math.max(0, Math.min(wm.p.loss, loss || 0))));
    rail.setAttribute(
      'aria-valuetext',
      loss == null
        ? 'Add a dated weight to measure progress'
        : (wm.avg == null ? 'Latest weight; ' : 'Seven-day average; ') +
            Math.round(pct) +
            ' percent of the road to 185 pounds'
    );
  }

  const trend = document.getElementById('wallWeightTrend');
  if (trend && !trend.hidden) {
    const markup = NonZeroWeightJourney.panel(state, localDate(), 30, true);
    if (trend.__weightMarkup !== markup) {
      trend.innerHTML = markup;
      trend.__weightMarkup = markup;
    }
  }
  setText(
    'surgeryLabel',
    'SURGERY' +
      (x.date
        ? ' · ' +
          new Date(x.date + 'T12:00:00Z')
            .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
            .toUpperCase()
        : '')
  );
  const goalPhase = typeof window !== 'undefined' ? window.NonZeroGoalCoachUI?.snapshot() : null;
  setText(
    'weightSurgeryGoal',
    goalPhase?.phase === 'heal'
      ? 'RECOVERY · GOAL 185 LB'
      : goalPhase?.phase === 'rebuild'
        ? 'NEXT ' + (nextWeight ?? wm.goal).toFixed(0) + ' LB · GOAL 185'
        : 'GOAL · BELOW ' + x.target + ' LB'
  );
  setText(
    'surgeryDays',
    Number.isFinite(x.days)
      ? x.days > 0
        ? x.days + ' DAYS'
        : x.days === 0
          ? 'TODAY'
          : Math.abs(x.days) + ' POST-OP'
      : 'DATE TBD'
  );
  const dayEl = $('surgeryDays');
  if (dayEl && Number.isFinite(x.days) && x.days !== 0) {
    dayEl.innerHTML =
      String(Math.abs(x.days)) +
      '<span class="surgery-day-unit">' +
      (x.days > 0 ? 'DAYS' : 'POST-OP') +
      '</span>';
  }
  setText(
    'surgeryWeight',
    x.latest
      ? Number(x.latest.weightLb).toFixed(1) + ' LB · GOAL < ' + x.target
      : 'PERSONAL GOAL · BELOW ' + x.target + ' LB'
  );
  setText(
    'surgeryContext',
    x.days < 0
      ? 'FOLLOW YOUR RECOVERY PLAN'
      : !x.latest
        ? 'ADD A CURRENT WEIGHT IN THE PHONE APP'
        : x.stale
          ? 'WEIGHT OUT OF DATE · ' + x.latest.date
          : x.goalMet
            ? 'BELOW GOAL · KEEP BUILDING READINESS'
            : '7-DAY AVG ' +
              (x.average == null ? '—' : x.average.toFixed(1) + ' LB') +
              ' · ' +
              x.latest.date +
              (x.latest.source === 'apple-health' ? ' · HEALTH' : '')
  );
}
if (globalThis.__NONZERO_TEST__) {
  globalThis.__NONZERO_WALL_TEST__ = {
    nextQuote,
    applyWallCommand,
    setManualMode,
    activeStatus,
    cloudActiveFrom,
    activeFingerprint,
    renderAll,
    renderPerformance,
    renderTelemetry,
    renderCockpit,
    renderLabTrace,
    resetAnalytics,
    ingestAnalytics,
    renderAnalytics,
    renderLiveCoach,
    liveCoachCue,
    coachTargets,
    goalRange,
    goalStatus,
    drawGoal,
    telemetryFresh,
    detectErgPhase,
    observePm5Auto,
    timerMs,
    fmtMs,
    paceText,
    setMode,
    snapshot: () => ({ mode: currentMode, analytics, autoPm5, telemetryHistory, lastError }),
    setPm5ForTest: (t) => {
      localPm5 = t;
      lastPm5At = Number(t?.updatedAt || 0);
    },

    setStateForTest: (value) => {
      state = value;
    },
    desiredMode,
    programAndItems,
    workoutCategory,
    workoutDetail,
    normalizeAgendaItem,
    normalizeAgendaDay,
    normalizeAgendaRootData
  };
} else
  queueMicrotask(() =>
    boot().catch((e) => {
      lastError = 'Startup: ' + String(e);
    })
  );
const MILESTONE_STORAGE_KEY = 'nz.v720.milestone';
function renderCommandCenterSafely() {
  try {
    renderCommandCenter();
  } catch (e) {
    lastError = 'Command center: ' + String(e);
  }
}
function commandPhase() {
  const p = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date()),
    o = Object.fromEntries(p.map((x) => [x.type, x.value])),
    m = Number(o.hour) * 60 + Number(o.minute);
  if (m < 360) return 'night';
  if (m < 570) return 'morning';
  if (m < 930) return 'workday';
  if (m < 1110) return 'arrival';
  if (m < 1290) return 'evening';
  return 'night';
}
function commandMinutes(v) {
  if (typeof v === 'number') return v;
  const text = String(v || '').trim(),
    h = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (h) return ((Number(h[1]) % 12) + (h[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(h[2]);
  const m = text.match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function commandAgenda() {
  const root = agendaRoot(),
    today = localDate(),
    days = Array.isArray(root?.days) ? root.days : [],
    day = days.find((d) => String(d?.date || d?.dateStr || '').slice(0, 10) === today) || root;
  return (Array.isArray(day?.items) ? day.items : [])
    .filter((x) => x?.showOnWall !== false)
    .map((x) => ({ ...x, _m: commandMinutes(x.start || x.time) }))
    .filter((x) => x._m != null)
    .sort((a, b) => a._m - b._m);
}
function commandClock(m) {
  if (m == null) return '';
  const d = new Date(2000, 0, 1, Math.floor(m / 60) % 24, m % 60);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toUpperCase();
}
function commandTimeline() {
  const t = NonZeroSuite.timeline(agendaRoot(), new Date(), false);
  return { active: t.current, next: t.next, later: t.later };
}
function commandEventLabel(x, fallback) {
  return NonZeroSuite.eventLabel(x ? { ...x, title: NonZeroAgendaLabels.title(x) } : x, fallback);
}
function commandScore() {
  return NonZeroSuite.metrics(sessions()).score;
}
function commandTrainingCue() {
  const { p, mode, items, rec } = programAndItems(),
    ss = sessions().filter((x) => x?.completed === true && x !== rec),
    same = ss
      .filter(
        (x) =>
          String(x.type || x.programSnapshot?.type || '').toLowerCase() ===
          String(p?.type || '').toLowerCase()
      )
      .slice(-4),
    last = same.at(-1),
    currentDur = Number(rec?.duration || 0);
  if (mode === 'flare') return 'Recovery counts. Keep today deliberately easy.';
  if (last && currentDur && Number(last.duration) > 0) {
    const d = Math.round(((currentDur - Number(last.duration)) / Number(last.duration)) * 100);
    if (d >= 10) return `Volume is up ${d}% vs the last comparable session. Keep quality high.`;
    if (d <= -15) return `Shorter session today. Protect intensity and finish clean.`;
  }
  if (p?.progression?.label) return p.progression.label;
  return items.length > 4
    ? 'Own the current station. Do not rush the transition.'
    : 'Quality first. Stack another clean start.';
}
function commandFinishProjection() {
  const a = performanceWorkout(),
    elapsed = Math.round(timerMs(a) / 60000),
    { items, rec } = programAndItems(),
    checks = Array.isArray(rec?.checks) ? rec.checks : [],
    done = checks.filter(Boolean).length,
    pct = items.length ? done / items.length : 0;
  if (!a || !elapsed || pct <= 0.08) return '';
  const total = Math.round(elapsed / Math.max(0.12, pct)),
    left = Math.max(1, total - elapsed);
  return `~${left} MIN REMAINING`;
}
function commandClosure() {
  const k = kpis(),
    a = commandAgenda(),
    nowm = new Date().getHours() * 60 + new Date().getMinutes(),
    remaining = a.filter((x) => x._m > nowm).length,
    tom = dateAdd(localDate(), 1),
    root = agendaRoot(),
    days = Array.isArray(root?.days) ? root.days : [],
    td = days.find((d) => String(d?.date || d?.dateStr || '').slice(0, 10) === tom),
    first = (Array.isArray(td?.items) ? td.items : [])
      .map((x) => ({ ...x, _m: commandMinutes(x.start || x.time) }))
      .filter((x) => x._m != null)
      .sort((x, y) => x._m - y._m)[0];
  return `${k.weekCount}/7 starts this week · ${remaining ? remaining + ' commitment' + (remaining === 1 ? '' : 's') + ' still today' : 'today landed'}${first ? ' · Tomorrow first: ' + commandEventLabel(first, '') : ''}`;
}
function renderCommandCenter() {
  const ph = commandPhase(),
    wall = $('wall');
  if (wall) {
    [...wall.classList]
      .filter((x) => x.startsWith('phase-'))
      .forEach((x) => wall.classList.remove(x));
    wall.classList.add('phase-' + ph);
  }
  const n = commandTimeline();
  setText(
    'commandNow',
    commandEventLabel(n.active, ph === 'morning' ? 'Morning launch' : 'No active commitment')
  );
  setText(
    'commandNowSub',
    n.active?.location ||
      {
        morning: 'FRAME THE DAY',
        arrival: 'RESET FOR THE EVENING',
        workday: 'STAY ON THE PLAN',
        evening: 'LAND THE DAY',
        night: 'RECOVER'
      }[ph] ||
      ''
  );
  setText('commandNext', commandEventLabel(n.next, 'No upcoming commitment'));
  setText('commandNextSub', n.next?.meta || n.next?.location || '');
  setText(
    'commandLater',
    commandEventLabel(n.later, ph === 'morning' ? 'Evening is clear' : 'Nothing else queued')
  );
  const dinner = NonZeroSuite.activeDay(agendaRoot())?.dinner;
  setText(
    'commandLaterSub',
    dinner ? 'DINNER · ' + dinner.name : n.later?.meta || n.later?.location || ''
  );
  const agendaAge = Date.now() - Number(agendaRoot()?.updatedAt || 0);
  if ((ph === 'morning' || ph === 'arrival') && n.next && agendaAge >= 0 && agendaAge < 86400000)
    setText('agendaStatus', 'NEXT · ' + commandClock(n.next._m));
  const score = commandScore();
  setText('nonzeroScore', score);
  const w = NonZeroWeightJourney.model(state, localDate(), 30);
  setText(
    'scoreTrend',
    w.loss == null
      ? 'ADD A DATED WEIGHT'
      : `${w.loss.toFixed(1)} LB LOST · ${Math.round(w.percent)}% OF THE ROAD TO 185`
  );
  if (!ergPhase) setText('coachCue', commandTrainingCue());
  setText('finishProjection', commandFinishProjection());
  setText('dayClosure', commandClosure());
  celebrateMilestone(score);
}
function celebrateMilestone(score) {
  const k = kpis(),
    marks = [];
  if ([7, 14, 30, 60, 100].includes(k.streak)) marks.push(`${k.streak}-DAY START STREAK`);
  if ([25, 50, 100, 150, 200].includes(sessions().filter((x) => x.completed === true).length))
    marks.push(`${sessions().filter((x) => x.completed === true).length} SESSIONS COMPLETED`);
  if (score >= 90) marks.push('NONZERO SCORE · 90+');
  if (!marks.length) return;
  const key = marks[0] + '|' + localDate();
  if (localStorage.getItem(MILESTONE_STORAGE_KEY) === key) return;
  localStorage.setItem(MILESTONE_STORAGE_KEY, key);
  const e = $('milestoneToast');
  if (!e) return;
  e.textContent = marks[0];
  e.classList.add('on');
  setTimeout(() => e.classList.remove('on'), 6500);
}
setInterval(renderCommandCenterSafely, 15000);
setTimeout(renderCommandCenterSafely, 400);
function goalRange(targets, kind) {
  const names =
    kind === 'heart'
      ? ['hrMin', 'hrMax']
      : kind === 'power'
        ? ['powerMin', 'powerMax']
        : ['cadenceMin', 'cadenceMax'];
  const limit = kind === 'power' ? 3000 : kind === 'heart' ? 240 : 250;
  const low = Number(targets[names[0]] || 0),
    high = Number(targets[names[1]] || 0);
  return Number.isFinite(low) &&
    Number.isFinite(high) &&
    low >= 0 &&
    high > 0 &&
    low <= high &&
    high <= limit
    ? { low, high }
    : null;
}
function goalStatus(value, range, live) {
  if (!live || value == null || !Number.isFinite(value)) return 'WAITING FOR DATA';
  if (!range) return 'GOAL NOT SET';
  return value < range.low ? 'BELOW TARGET' : value > range.high ? 'ABOVE TARGET' : 'ON TARGET';
}
function drawGoal(kind, range, max, value, live, unit) {
  const y = (v) => 145 - clamp(v / max, 0, 1) * 135;
  const band = $(kind + 'TargetBand'),
    low = $(kind + 'TargetLow'),
    high = $(kind + 'TargetHigh');
  if (band) {
    band.setAttribute('y', range ? y(range.high) : 145);
    band.setAttribute('height', range ? Math.max(0, y(range.low) - y(range.high)) : 0);
  }
  if (low) low.setAttribute('d', range && range.low > 0 ? `M0 ${y(range.low).toFixed(2)}H800` : '');
  if (high) high.setAttribute('d', range ? `M0 ${y(range.high).toFixed(2)}H800` : '');
  const label = !range
    ? 'GOAL NOT SET'
    : range.low === range.high
      ? `GOAL ${range.high} ${unit}`
      : range.low > 0
        ? `GOAL ${range.low}–${range.high} ${unit}`
        : `CEILING ${range.high} ${unit}`;
  setText(kind + 'GoalLabel', label);
  const status = goalStatus(value, range, live);
  setText(
    kind + 'GoalStatus',
    kind === 'heart' && live && value == null ? 'NO HEART-RATE SIGNAL' : status
  );
  const chart = $(kind + 'TargetChart');
  if (chart?.dataset)
    chart.dataset.goalState =
      status === 'ON TARGET'
        ? 'on'
        : status === 'ABOVE TARGET'
          ? 'above'
          : status === 'BELOW TARGET'
            ? 'below'
            : 'waiting';
  const graph = $(kind === 'power' ? 'effortGraph' : kind + 'Graph');
  if (graph) graph.setAttribute('aria-label', `${kind} · ${label} · ${status} · last 60 seconds`);
  // Visible, labeled target arc and endpoint ticks follow the exact same adaptive scale as the dial.
  if (kind !== 'heart') {
    const point = (v, r) => {
      const angle = Math.PI * (1 - clamp(v / max, 0, 1));
      return [120 + r * Math.cos(angle), 140 - r * Math.sin(angle)];
    };
    const coord = (p) => p.map((v) => v.toFixed(2)).join(' '),
      arc = $(kind + 'GoalArc'),
      ticks = $(kind + 'GoalTicks');
    if (arc) {
      const a = range ? point(range.low, 100) : null,
        b = range ? point(range.high, 100) : null;
      arc.setAttribute(
        'd',
        range && range.low !== range.high ? `M${coord(a)} A100 100 0 0 1 ${coord(b)}` : ''
      );
    }
    if (ticks)
      ticks.setAttribute(
        'd',
        range
          ? [...new Set([range.low, range.high])]
              .map((v) => `M${coord(point(v, 93))} L${coord(point(v, 106))}`)
              .join(' ')
          : ''
      );
  }
}
function renderLabTrace(t, live) {
  const now = Date.now(),
    key = String(t.readSequence ?? '') + '|' + String(t.updatedAt ?? ''),
    recorded = window.NonZeroConnected?.getTrace();
  if (recorded) telemetryHistory = recorded.filter((p) => p.watts != null && p.rpm != null);
  if (
    !recorded &&
    live &&
    t.watts != null &&
    Number.isFinite(Number(t.watts)) &&
    Number.isFinite(Number(t.cadence ?? t.rpm)) &&
    key !== lastChartSequence &&
    (t.readSequence != null || t.updatedAt != null)
  ) {
    lastChartSequence = key;
    const hr = Number(t.heartRate);
    telemetryHistory.push({
      at: now,
      watts: safeNumber(t.watts),
      rpm: safeNumber(t.cadence ?? t.rpm),
      hr: Number.isFinite(hr) && hr >= 25 && hr <= 240 ? hr : null
    });
  }
  telemetryHistory = telemetryHistory.filter((p) => now - p.at <= 60000);
  const targets = coachTargets(),
    row = /row|ski/i.test(t.machine || ''),
    unit = row ? 'SPM' : 'RPM',
    pg = goalRange(targets, 'power'),
    cg = goalRange(targets, 'cadence'),
    hg = goalRange(targets, 'heart');
  const powerMax = Math.max(
      500,
      Math.ceil(
        Math.max(0, ...telemetryHistory.map((p) => p.watts), (pg?.high || 0) * 1.15) / 250
      ) * 250
    ),
    cadMax = Math.max(
      row ? 60 : 120,
      Math.ceil(Math.max(0, ...telemetryHistory.map((p) => p.rpm), (cg?.high || 0) * 1.1) / 20) * 20
    ),
    heartMax = Math.max(
      180,
      Math.ceil(
        Math.max(0, ...telemetryHistory.map((p) => p.hr || 0), (hg?.high || 0) * 1.1) / 20
      ) * 20
    );
  setText('powerScaleTop', powerMax + ' W');
  setText('powerScaleMid', powerMax / 2);
  setText('cadenceScaleTop', cadMax + ' ' + unit);
  setText('cadenceScaleMid', cadMax / 2);
  setText('heartScaleTop', heartMax + ' BPM');
  setText('heartScaleMid', heartMax / 2);
  setText('traceCadenceUnit', unit);
  const groups = (k) => {
    const result = [];
    let prior = null;
    telemetryHistory.forEach((p) => {
      if (p[k] == null) {
        prior = null;
        return;
      }
      if (!prior || p.at - prior.at > 2500) result.push([]);
      result.at(-1).push(p);
      prior = p;
    });
    return result;
  };
  const xy = (p, k, max) =>
    `${((1 - (now - p.at) / 60000) * 800).toFixed(2)},${(145 - clamp(p[k] / max, 0, 1) * 135).toFixed(2)}`;
  const line = (k, max) =>
    groups(k)
      .map((g) => g.map((p, i) => (i ? 'L' : 'M') + xy(p, k, max)).join(' '))
      .join(' ');
  $('powerTrace').setAttribute('d', line('watts', powerMax));
  $('cadenceTrace').setAttribute('d', line('rpm', cadMax));
  if ($('heartTrace')) $('heartTrace').setAttribute('d', line('hr', heartMax));
  $('powerArea').setAttribute(
    'd',
    groups('watts')
      .filter((g) => g.length > 1)
      .map(
        (g) =>
          `M${xy(g[0], 'watts', powerMax).split(',')[0]},145 ` +
          g.map((p) => 'L' + xy(p, 'watts', powerMax)).join(' ') +
          ` L${xy(g.at(-1), 'watts', powerMax).split(',')[0]},145 Z`
      )
      .join(' ')
  );
  const hr = Number(t.heartRate),
    validHr = Number.isFinite(hr) && hr >= 25 && hr <= 240 ? hr : null;
  for (const [kind, range, max, value, u] of [
    ['power', pg, powerMax, t.watts == null ? null : Number(t.watts), 'W'],
    ['cadence', cg, cadMax, Number(t.cadence ?? t.rpm), unit],
    ['heart', hg, heartMax, validHr, 'BPM']
  ]) {
    drawGoal(kind, range, max, value, live, u);
    if (!range && targets.goal) {
      setText(kind + 'GoalLabel', kind === 'heart' ? 'ADD MAX HR ON PHONE' : 'CALIBRATING POWER');
    }
    const dot = $(kind + 'LiveDot');
    if (dot) {
      const newest = telemetryHistory.at(-1),
        field = kind === 'power' ? 'watts' : kind === 'cadence' ? 'rpm' : 'hr';
      const show = live && newest && now - newest.at <= 2500 && newest[field] != null;
      dot.setAttribute('visibility', show ? 'visible' : 'hidden');
      if (show) {
        dot.setAttribute('cx', ((1 - (now - newest.at) / 60000) * 800).toFixed(2));
        dot.setAttribute('cy', (145 - clamp(newest[field] / max, 0, 1) * 135).toFixed(2));
      }
    }
  }
}

let localControlBusy = false;
let localControlLast = null;
async function pollLocalControls() {
  if (localControlBusy) return;
  localControlBusy = true;
  let result = {};
  try {
    const r = await fetch('/api/wall-control', { cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json(),
      c = d.command;
    const panel = document.getElementById('phoneRemote');
    if (panel) panel.hidden = !d.showAccess;
    if (panel && (panel.dataset.url !== d.url || panel.dataset.code !== d.code)) {
      document.getElementById('phoneRemoteURL').textContent = d.url;
      document.getElementById('phoneRemoteCode').textContent = d.code;
      document.getElementById('phoneRemoteQR').src =
        '/api/wall-control/qr.svg?refresh=' + Date.now();
      panel.dataset.url = d.url;
      panel.dataset.code = d.code;
    }
    if (c && c.id !== localControlLast) {
      result = { id: c.id, ok: true, message: 'Applied on Wall.' };
      try {
        if (['ambient', 'performance', 'night', 'deep'].includes(c.action)) {
          setManualMode(c.action);
          setMode(c.action);
          openSetup(false);
          openHealth(false);
        } else if (c.action === 'schedule') {
          setManualMode('');
          setMode(desiredMode());
          openSetup(false);
          openHealth(false);
        } else if (c.action === 'quote-next') nextQuote();
        else if (c.action === 'setup') openSetup(true);
        else if (c.action === 'health') openHealth(true);
        else if (c.action === 'close') {
          openSetup(false);
          openHealth(false);
        } else if (c.action === 'retry') {
          retryCloud();
          result.message = 'Cloud retry requested.';
        } else if (c.action === 'pair') {
          $('pairCode').value = c.code;
          $('endpointInput').value = endpoint;
          const paired = await pair();
          result.ok = paired === true;
          result.message = result.ok
            ? 'Wall paired. Check cloud status above.'
            : $('setupStatus').textContent;
          $('pairCode').value = '';
        }
      } catch (e) {
        result.ok = false;
        result.message = String(e.message || e);
      }
      localControlLast = c.id;
    }
    await fetch('/api/wall-control/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...result,
        mode: currentMode,
        version: RELEASE_VERSION,
        paired: !!wallToken,
        cloud: !wallToken
          ? 'Pairing needed'
          : lastFetchSucceeded
            ? 'Cloud online'
            : lastError || 'Cloud reconnecting'
      })
    });
  } catch {
  } finally {
    localControlBusy = false;
  }
}

})();
