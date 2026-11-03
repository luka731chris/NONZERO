(function (root) {
  'use strict';
  const PROFILE = JSON.parse('{"edition":"personal","primaryName":"Chris","partnerName":"Sam","partnerAge":16,"surgeryDate":"2026-11-20","recoveryLabel":"RIGHT HIP","preSurgeryTargetLb":220,"goalWeightLb":185,"baselineWeightLb":227.1,"baselineDate":"2026-10-17","seedMeasurements":[{"id":"reported-withings-2026-10-17","date":"2026-10-17","weightLb":227.1,"source":"withings-reported","at":1792195200000}]}');
  const DAY = 86400000;
  function day(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return NaN;
    const n = Date.parse(s + 'T00:00:00Z');
    return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === s ? n / DAY : NaN;
  }
  function date(at) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(at));
  }
  function rows(state, today) {
    const map = new Map();
    const health = (Array.isArray(state?.pm5Analytics?.health) ? state.pm5Analytics.health : [])
      .filter((x) => x?.type === 'HKQuantityTypeIdentifierBodyMass' && Number.isFinite(x.at))
      .map((x) => ({
        date: date(x.at),
        weightLb: x.unit === 'kg' ? x.value / 0.45359237 : x.unit === 'lb' ? x.value : null,
        at: x.at,
        source: 'health-import'
      }));
    [...health, ...(Array.isArray(state?.bodyMeasurements) ? state.bodyMeasurements : [])]
      .filter(
        (x) =>
          x &&
          Number.isFinite(day(x.date)) &&
          x.date <= today &&
          Number.isFinite(Number(x.weightLb)) &&
          Number(x.weightLb) >= 50 &&
          Number(x.weightLb) <= 700
      )
      .sort((a, b) => Number(a.at || 0) - Number(b.at || 0))
      .forEach((x) => map.set(x.date, { ...x, weightLb: Number(x.weightLb) }));
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  function plan(state) {
    const p = state?.surgeryPlan?.weightJourney || {},
      baseline =
        Number(p.baseline) >= 75 && Number(p.baseline) <= 700
          ? Number(p.baseline)
          : PROFILE.baselineWeightLb;
    return {
      baseline,
      startDate: Number.isFinite(day(p.startDate)) ? p.startDate : PROFILE.baselineDate,
      goalWeightLb: PROFILE.goalWeightLb,
      loss: Math.max(0, baseline - PROFILE.goalWeightLb)
    };
  }
  function model(state, today, range = 90) {
    const p = plan(state),
      all = rows(state, today),
      valid = all.filter((r) => r.date >= p.startDate),
      latest = all.at(-1),
      mean = (a) => (a.length ? a.reduce((n, r) => n + r.weightLb, 0) / a.length : null);
    const recent = valid.filter((r) => day(today) - day(r.date) < 7),
      prior = valid.filter((r) => day(today) - day(r.date) >= 7 && day(today) - day(r.date) < 14),
      avg = mean(recent),
      previous = mean(prior),
      basis = avg,
      goal = p.goalWeightLb,
      loss = basis == null ? null : p.baseline - basis;
    const milestones = Array.from(
        { length: Math.max(0, Math.ceil((p.baseline - PROFILE.goalWeightLb) / 5)) },
        (_, i) => Math.ceil(p.baseline / 5) * 5 - (i + 1) * 5
      )
        .filter((w) => w >= PROFILE.goalWeightLb)
        .map((w) => ({ loss: p.baseline - w, weight: w, met: basis != null && basis <= w })),
      next = milestones.find((m) => !m.met),
      shown = all
        .filter((r) => !range || day(today) - day(r.date) < range)
        .map((r) => ({
          ...r,
          average: mean(
            all.filter((x) => day(r.date) - day(x.date) >= 0 && day(r.date) - day(x.date) < 7)
          )
        }));
    return {
      p,
      all,
      latest,
      avg,
      previous,
      weekly: avg != null && previous != null ? avg - previous : null,
      coverage: recent.length,
      stale: !!latest && day(today) - day(latest.date) > 7,
      goal,
      loss,
      percent: loss == null ? 0 : Math.max(0, Math.min(100, (loss / Math.max(1, p.loss)) * 100)),
      milestones,
      next,
      shown
    };
  }
  const fmt = (n) => (n == null ? '—' : Number(n).toFixed(1)),
    signed = (n) => (n == null ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(1));
  function chart(m, today, range) {
    const rr = m.shown,
      lo = Math.min(m.goal - 1, ...rr.map((x) => x.weightLb - 1)),
      hi = Math.max(m.p.baseline + 1, ...rr.map((x) => x.weightLb + 1)),
      start = range
        ? day(today) - range + 1
        : Math.min(day(today) - 1, ...rr.map((x) => day(x.date))),
      end = day(today),
      x = (d) => 48 + ((day(d) - start) / Math.max(1, end - start)) * 470,
      y = (v) => 18 + ((hi - v) / (hi - lo)) * 158;
    let svg =
      '<svg viewBox="0 0 580 210" role="img" aria-label="Daily weight and seven-day average with five-pound target zones">';
    m.milestones.forEach((v, i) => {
      const top = y(v.weight + 5),
        bottom = y(v.weight);
      svg +=
        '<rect x="48" y="' +
        top +
        '" width="470" height="' +
        (bottom - top) +
        '" fill="' +
        (m.next === v ? '#d6b961' : '#67c28a') +
        '" opacity="' +
        (m.next === v ? '.18' : '.05') +
        '"/><path d="M48 ' +
        bottom +
        ' H518" stroke="#567080" stroke-dasharray="4 4"/><text x="524" y="' +
        (bottom + 4) +
        '">' +
        fmt(v.weight) +
        '</text>';
    });
    if (PROFILE.preSurgeryTargetLb >= lo && PROFILE.preSurgeryTargetLb <= hi)
      svg +=
        '<path d="M48 ' +
        y(PROFILE.preSurgeryTargetLb) +
        ' H518" stroke="#60c7e0" stroke-dasharray="6 3"/><text x="52" y="' +
        (y(PROFILE.preSurgeryTargetLb) - 4) +
        '" style="fill:#60c7e0">PRE-SURGERY 220</text>';
    const path = (key) =>
      rr
        .map((r, i) => (i ? 'L' : 'M') + x(r.date).toFixed(2) + ' ' + y(r[key]).toFixed(2))
        .join(' ');
    if (rr.length) {
      svg +=
        '<path d="' +
        path('weightLb') +
        '" fill="none" stroke="#8b9eb4" stroke-width="1.5"/><path d="' +
        path('average') +
        '" fill="none" stroke="#d6b961" stroke-width="3"/>';
      rr.forEach((r) => {
        svg += '<circle cx="' + x(r.date) + '" cy="' + y(r.weightLb) + '" r="3" fill="#8b9eb4"/>';
      });
    } else svg += '<text x="70" y="92">Add a dated weight to start your trend</text>';
    svg +=
      '<text x="5" y="16">LB</text><text x="48" y="201">' +
      new Date(start * DAY).toISOString().slice(0, 10) +
      '</text><text x="440" y="201">' +
      today +
      '</text></svg>';
    return svg;
  }
  function panel(state, today, range = 90, compact = false) {
    const m = model(state, today, range),
      n = m.next,
      zone = n ? fmt(n.weight) + '–' + fmt(n.weight + 5) + ' lb' : 'Goal reached';
    if (compact)
      return (
        '<div class="wj-compact"><b>ROAD TO 185 LB · ' +
        Math.round(m.percent) +
        '%</b><span>' +
        (m.avg == null ? 'Need a recent weight' : '7D AVG ' + fmt(m.avg) + ' LB') +
        ' · NEXT ' +
        (n ? fmt(n.weight) + ' LB' : 'MAINTAIN') +
        '</span><div class="wj-track"><i style="width:' +
        m.percent +
        '%"></i></div><small>' +
        (m.loss == null
          ? 'Add a weight in the phone app'
          : signed(m.loss) + ' lb lost · target zone ' + zone) +
        '</small>' +
        (compact === 'live'
          ? ''
          : chart(m, today, 30).replace(
              '<svg ',
              '<svg preserveAspectRatio="none" style="display:block;width:100%;height:52px" '
            )) +
        '</div>'
      );
    return (
      '<div class="wj-panel"><div class="wj-heading"><div><small>BODY WEIGHT · ROAD TO 185 LB</small><h3>' +
      fmt(m.p.baseline) +
      ' → ' +
      fmt(m.goal) +
      ' lb</h3></div><b>' +
      Math.round(m.percent) +
      '%</b></div><div class="wj-stats">' +
      [
        ['Latest', fmt(m.latest?.weightLb) + ' lb'],
        ['7-day average', fmt(m.avg) + ' lb'],
        ['Lost from baseline', signed(m.loss) + ' lb'],
        ['Weekly change', signed(m.weekly) + ' lb']
      ]
        .map(([a, b]) => '<div><strong>' + b + '</strong><small>' + a + '</small></div>')
        .join('') +
      '</div><div class="wj-track"><i style="width:' +
      m.percent +
      '%"></i></div><div class="wj-milestones">' +
      m.milestones
        .map(
          (v) =>
            '<div class="' +
            (v.met ? 'met' : v === n ? 'next' : '') +
            '"><b>' +
            fmt(v.weight) +
            '</b><small>−' +
            fmt(v.loss) +
            ' lb' +
            (v.met ? ' · met' : v === n ? ' · next' : '') +
            '</small></div>'
        )
        .join('') +
      '</div><p class="wj-note">' +
      (n
        ? 'Current target zone: ' +
          zone +
          ' · ' +
          (m.avg == null
            ? 'Add a recent reading'
            : fmt(Math.max(0, m.avg - n.weight)) + ' lb to next milestone')
        : 'All milestones met on your current average.') +
      '</p>' +
      chart(m, today, range) +
      '<p class="wj-note">Gold: rolling 7-day average · gray: daily reading · shaded gold: next 5 lb zone. Milestones use your current 7-day average (' +
      m.coverage +
      '/7 days recorded). ' +
      (m.latest
        ? 'Latest: ' + m.latest.date + (m.stale ? ' · stale — add a fresh reading' : '')
        : 'No weight readings yet.') +
      '</p><p class="wj-note">Baseline ' +
      fmt(m.p.baseline) +
      ' lb · ' +
      m.p.startDate +
      ' · personal long-term goal. Pre-surgery goal remains below 220 lb. Weekly change compares the current and previous 7-day windows; missing days are not filled.</p></div>'
    );
  }
  function rideWeight(state, at) {
    const ds = date(at),
      r = rows(state, ds)
        .filter((x) => day(ds) - day(x.date) <= 7)
        .at(-1);
    return r ? { weightLb: r.weightLb, date: r.date } : null;
  }
  root.NonZeroWeightJourney = { day, date, rows, plan, model, panel, rideWeight };
  if (typeof module !== 'undefined') module.exports = root.NonZeroWeightJourney;
})(typeof globalThis !== 'undefined' ? globalThis : this);
