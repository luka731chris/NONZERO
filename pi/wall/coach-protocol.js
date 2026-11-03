(function (root) {
  'use strict';
  const object = (x) => !!x && typeof x === 'object' && !Array.isArray(x),
    clone = (x) => JSON.parse(JSON.stringify(x)),
    eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const fields = {
    preferences: [
      'maintenanceCalories',
      'weeklyRate',
      'nutritionCleared',
      'trainingCleared',
      'maintenanceForRecovery',
      'clearanceDate',
      'strengthStatus'
    ],
    day: [
      'date',
      'mealPlanned',
      'proteinMeals',
      'movement',
      'intakeCalories',
      'intakeSource',
      'intakeComplete',
      'barrier',
      'feedback',
      'focusDone'
    ],
    behavior: ['mealTracker', 'focus', 'anchor', 'why', 'fallback', 'reward'],
    strength: [
      'date',
      'movement',
      'variation',
      'mode',
      'loadLb',
      'reps',
      'rpe',
      'pain',
      'notes',
      'deleted'
    ],
    review: ['date', 'proposalId', 'maintenanceCalories', 'decision']
  };
  function iso(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T00:00:00Z');
    return Number.isFinite(+d) && d.toISOString().slice(0, 10) === s;
  }
  function date(now = Date.now()) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(now));
  }
  function empty() {
    return { schemaVersion: 2, revision: 0, records: {}, applied: [], updatedAt: 0 };
  }
  function validate(op, now = Date.now()) {
    if (
      !object(op) ||
      !fields[op.kind] ||
      !/^[A-Za-z0-9_-]{8,100}$/.test(op.id || '') ||
      !object(op.patch) ||
      !object(op.bases) ||
      !Object.keys(op.patch).length ||
      Object.keys(op.patch).length > 15
    )
      throw Error('Invalid coaching change');
    if (
      op.key !==
      (op.kind === 'preferences' || op.kind === 'behavior'
        ? op.kind
        : op.kind +
          ':' +
          (op.kind === 'day' || op.kind === 'review'
            ? op.patch.date
            : String(op.key || '')
                .split(':')
                .slice(1)
                .join(':')))
    )
      throw Error('Invalid record key');
    if (op.kind === 'strength' && !/^strength:[A-Za-z0-9_-]{1,100}$/.test(op.key))
      throw Error('Invalid strength record key');
    if (!/^[A-Za-z0-9:_-]{1,120}$/.test(op.key)) throw Error('Invalid record key');
    for (const [k, v] of Object.entries(op.patch)) {
      if (!fields[op.kind].includes(k) || !Number.isSafeInteger(op.bases[k]) || op.bases[k] < 0)
        throw Error('Invalid field version');
      if (
        [
          'nutritionCleared',
          'trainingCleared',
          'maintenanceForRecovery',
          'mealPlanned',
          'proteinMeals',
          'movement',
          'intakeComplete',
          'focusDone',
          'deleted'
        ].includes(k) &&
        !(k === 'movement' && op.kind === 'strength')
      ) {
        if (typeof v !== 'boolean') throw Error('Expected a checkmark');
        continue;
      }
      if (k === 'date' || k === 'clearanceDate') {
        if (k === 'clearanceDate' && v === null) continue;
        if (!iso(v) || v > date(now)) throw Error('Choose a valid date on or before today');
        continue;
      }
      if (
        [
          'maintenanceCalories',
          'intakeCalories',
          'weeklyRate',
          'loadLb',
          'reps',
          'rpe',
          'pain'
        ].includes(k)
      ) {
        if (v === null && ['maintenanceCalories', 'intakeCalories'].includes(k)) continue;
        const [lo, hi] = {
          maintenanceCalories: [1800, 5000],
          intakeCalories: [0, 6000],
          weeklyRate: [0.5, 1.5],
          loadLb: [0, 1000],
          reps: [1, 30],
          rpe: [1, 10],
          pain: [0, 10]
        }[k];
        if (
          typeof v !== 'number' ||
          !Number.isFinite(v) ||
          v < lo ||
          v > hi ||
          (k === 'reps' && !Number.isInteger(v))
        )
          throw Error('Check ' + k);
        continue;
      }
      const enums = {
        intakeSource: ['noom', 'manual', 'other'],
        mealTracker: ['noom', 'other', 'none'],
        strengthStatus: ['unknown', 'stable', 'improving', 'declining'],
        focus: ['meal', 'protein', 'movement'],
        anchor: ['breakfast', 'lunch', 'dinner', 'calendar'],
        barrier: ['none', 'time', 'pain', 'forgot'],
        feedback: ['useful', 'too_much', 'change_cue'],
        mode: ['external', 'bodyweight'],
        decision: ['accepted', 'dismissed']
      };
      if (enums[k]) {
        if (!enums[k].includes(v)) throw Error('Invalid ' + k);
      } else if (
        typeof v !== 'string' ||
        v.length > (k === 'notes' ? 240 : 160) ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)
      )
        throw Error('Check ' + k);
    }
    if (['day', 'strength', 'review'].includes(op.kind) && !iso(op.patch.date))
      throw Error('A dated record is required');
    if (
      op.kind === 'strength' &&
      (!op.patch.movement ||
        !op.patch.variation ||
        !op.patch.mode ||
        !['loadLb', 'reps', 'rpe', 'pain'].every((k) => k in op.patch))
    )
      throw Error('Complete the strength set');
    return op;
  }
  function document(value) {
    if (!object(value) || value.schemaVersion !== 2 || !object(value.records)) return empty();
    return clone(value);
  }
  function apply(input, operations, now = Date.now(), optimistic = false) {
    let doc = document(input);
    if (!Array.isArray(operations) || operations.length > 100) throw Error('Too many changes');
    for (const op of operations) {
      validate(op, now);
      if (doc.applied.includes(op.id)) continue;
      const prior = doc.records[op.key] || { value: {}, versions: {}, updatedAt: 0 },
        conflicts = [];
      for (const [k, v] of Object.entries(op.patch)) {
        if ((prior.versions[k] || 0) !== op.bases[k] && !eq(prior.value[k], v))
          conflicts.push(op.key + '.' + k);
      }
      if (conflicts.length && !optimistic) {
        const e = Error('Changes conflict. Review pending changes.');
        e.code = 'coach_conflict';
        e.fields = conflicts;
        throw e;
      }
      const rec = clone(prior);
      for (const [k, v] of Object.entries(op.patch)) {
        if (!eq(rec.value[k], v)) {
          rec.value[k] = v;
          rec.versions[k] = (rec.versions[k] || 0) + 1;
        }
      }
      if (
        op.kind === 'preferences' &&
        (rec.value.nutritionCleared || rec.value.trainingCleared) &&
        !rec.value.clearanceDate
      )
        throw Error('Record the date of care-team clearance');
      rec.updatedAt = now;
      doc.records[op.key] = rec;
      doc.applied = [...doc.applied, op.id].slice(-512);
      doc.revision++;
      doc.updatedAt = now;
    }
    // History is never silently pruned; the backend enforces an explicit payload limit.

    return doc;
  }
  function view(doc) {
    doc = document(doc);
    const rows = (prefix) =>
      Object.entries(doc.records)
        .filter(([k]) => k.startsWith(prefix))
        .map(([key, r]) => ({ ...r.value, id: key, updatedAt: r.updatedAt }));
    return {
      preferences: doc.records.preferences?.value || {},
      behavior: doc.records.behavior?.value || {},
      logs: rows('day:').sort((a, b) => b.date.localeCompare(a.date)),
      strength: rows('strength:').filter((x) => !x.deleted),
      reviews: rows('review:'),
      doc
    };
  }
  function operation(doc, kind, key, patch, id) {
    doc = document(doc);
    const prior = doc.records[key] || { value: {}, versions: {} };
    const clean = {};
    for (const [k, v] of Object.entries(patch))
      if (!eq(v, prior.value[k]) || k === 'date' || kind === 'strength') clean[k] = v;
    return {
      id:
        id ||
        'op_' +
          (root.crypto?.randomUUID?.() ||
            Date.now().toString(36) + '_' + Math.random().toString(36).slice(2)),
      kind,
      key,
      patch: clean,
      bases: Object.fromEntries(Object.keys(clean).map((k) => [k, prior.versions[k] || 0]))
    };
  }
  function rebase(doc, ops) {
    let d = document(doc);
    const out = [];
    for (const op of ops) {
      const next = operation(d, op.kind, op.key, op.patch);
      if (Object.keys(next.patch).length) {
        out.push(next);
        d = apply(d, [next], Date.now(), true);
      }
    }
    return out;
  }
  root.NonZeroCoachProtocol = {
    empty,
    document,
    apply,
    view,
    operation,
    rebase,
    validate,
    date,
    iso,
    clone
  };
  if (typeof module !== 'undefined') module.exports = root.NonZeroCoachProtocol;
})(typeof globalThis !== 'undefined' ? globalThis : this);
