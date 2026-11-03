(function (root) {
  'use strict';
  const PROFILE = JSON.parse('{"edition":"personal","primaryName":"Chris","partnerName":"Sam","partnerAge":16,"surgeryDate":"2026-11-20","recoveryLabel":"RIGHT HIP","preSurgeryTargetLb":220,"goalWeightLb":185,"baselineWeightLb":227.1,"baselineDate":"2026-10-17","seedMeasurements":[{"id":"reported-withings-2026-10-17","date":"2026-10-17","weightLb":227.1,"source":"withings-reported","at":1792195200000}]}'),
    DEFAULT_DATE = PROFILE.surgeryDate,
    TARGET = PROFILE.preSurgeryTargetLb;
  function dayNumber(key) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return NaN;
    const n = Date.parse(key + 'T00:00:00Z');
    return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === key
      ? n / 86400000
      : NaN;
  }
  function initialize(state) {
    let seeded = false;
    if (!state.readinessBaselineRecorded) {
      state.bodyMeasurements = Array.isArray(state.bodyMeasurements) ? state.bodyMeasurements : [];
      for (const sample of PROFILE.seedMeasurements || []) {
        if (
          !state.bodyMeasurements.some(
            (x) =>
              x.id === sample.id ||
              (x.date === sample.date && Number(x.weightLb) === sample.weightLb)
          )
        )
          state.bodyMeasurements.push({ ...sample });
      }
      state.readinessBaselineRecorded = true;
      seeded = true;
    }
    if (state?.surgeryPlan?.readinessVersion === 1) return seeded;
    state.surgeryPlan = {
      ...(state.surgeryPlan || {}),
      date: DEFAULT_DATE,
      label: PROFILE.recoveryLabel,
      targetWeightLb: TARGET,
      targetSource: 'personal',
      readinessVersion: 1
    };
    return true;
  }
  function summary(state, today) {
    const p =
      state?.surgeryPlan?.readinessVersion === 1
        ? state.surgeryPlan
        : { date: DEFAULT_DATE, targetWeightLb: TARGET };
    const days = dayNumber(p.date) - dayNumber(today),
      target = Number(p.targetWeightLb) || TARGET;
    const rows = (state?.bodyMeasurements || [])
      .filter(
        (x) =>
          Number.isFinite(Number(x.weightLb)) &&
          Number(x.weightLb) > 0 &&
          Number.isFinite(dayNumber(x.date)) &&
          x.date <= today
      )
      .sort((a, b) => a.date.localeCompare(b.date) || Number(a.at || 0) - Number(b.at || 0));
    // A daily trend gets one vote per day, independent of how often the scale is used.
    const daily = new Map();
    rows.forEach((x) => daily.set(x.date, x));
    const unique = [...daily.values()],
      latest = unique.at(-1) || null,
      recent = unique.filter((x) => dayNumber(today) - dayNumber(x.date) < 7);
    const avg = recent.length
      ? recent.reduce((n, x) => n + Number(x.weightLb), 0) / recent.length
      : null;
    const age = latest ? dayNumber(today) - dayNumber(latest.date) : null,
      stale = age != null && age > 7;
    return {
      date: p.date,
      days,
      target,
      latest,
      average: avg,
      trendDays: recent.length,
      age,
      stale,
      goalMet: !!latest && !stale && Number(latest.weightLb) < target
    };
  }

  function weightSparkline(state, today) {
    const end = dayNumber(today),
      daily = new Map();
    (Array.isArray(state?.bodyMeasurements) ? state.bodyMeasurements : [])
      .filter(
        (r) =>
          r &&
          Number.isFinite(dayNumber(r.date)) &&
          dayNumber(r.date) <= end &&
          dayNumber(r.date) >= end - 29 &&
          Number.isFinite(Number(r.weightLb)) &&
          Number(r.weightLb) > 0
      )
      .sort((a, b) => Number(a.at || 0) - Number(b.at || 0))
      .forEach((r) => daily.set(r.date, r));
    const rows = [...daily.values()].sort((a, b) => a.date.localeCompare(b.date));
    if (!rows.length)
      return '<div class="weight-trend-note">30-day weight trend · Add a weight to begin</div>';
    const values = rows.map((r) => Number(r.weightLb)),
      low = Math.min(...values) - 0.5,
      high = Math.max(...values) + 0.5;
    const points = rows.map((r, i) => [
      8 + ((dayNumber(r.date) - (end - 29)) / 29) * 304,
      60 - ((values[i] - low) / (high - low)) * 48
    ]);
    const delta = values.at(-1) - values[0],
      change =
        rows.length < 2
          ? 'Add another day to see your trend'
          : (Math.abs(delta) < 0.05
              ? 'No change'
              : (delta > 0 ? '+' : '−') + Math.abs(delta).toFixed(1) + ' lb') +
            ' · ' +
            rows.length +
            ' days recorded';
    const path = points
        .map((p, i) => (i ? 'L' : 'M') + p.map((n) => n.toFixed(2)).join(' '))
        .join(' '),
      last = points.at(-1);
    return (
      '<div class="weight-trend-note">30-DAY WEIGHT TREND</div><svg viewBox="0 0 320 72" role="img" aria-label="Weight trend: ' +
      change +
      '" style="display:block;width:100%;height:64px;overflow:visible"><path d="' +
      path +
      '" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' +
      last[0] +
      '" cy="' +
      last[1] +
      '" r="4" fill="currentColor"/></svg><div class="weight-trend-note">' +
      change +
      '</div>'
    );
  }
  root.NonZeroReadiness = { initialize, summary, dayNumber, weightSparkline };
  if (typeof module !== 'undefined') module.exports = root.NonZeroReadiness;
})(typeof globalThis !== 'undefined' ? globalThis : this);
