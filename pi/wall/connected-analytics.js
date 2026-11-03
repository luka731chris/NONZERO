(() => {
  'use strict';
  const $ = (id) => document.getElementById(id),
    finite = (x) => typeof x === 'number' && Number.isFinite(x),
    fmt = (v, n = 0) => (finite(v) ? v.toFixed(n) : '—');
  let data = null,
    received = 0,
    busy = false,
    context = {},
    error = '',
    profileWarning = '',
    timer;
  try {
    const saved = JSON.parse(localStorage.getItem('nz.connectedAnalytics.v1') || 'null');
    if (saved?.schemaVersion === 1) data = saved;
  } catch {}
  const signed = (v, n = 0) =>
    finite(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(n) : '—';
  function text(id, value) {
    const el = $(id);
    if (el && el.textContent !== String(value)) el.textContent = value;
  }
  function fresh() {
    return data && Date.now() - received < 8000;
  }
  function current(l) {
    return !!(l?.fresh && Date.now() - l.sampleAt >= -1000 && Date.now() - l.sampleAt < 4000);
  }
  function state() {
    return context.getState?.() || {};
  }
  function weight() {
    try {
      const s = state();
      return NonZeroWeightJourney.rideWeight(s, Date.now());
    } catch {
      return null;
    }
  }
  function wkg(live) {
    const w = weight(),
      value = live?.analytics?.avgWatts;
    if (w && finite(value))
      return { value: value / (w.weightLb * 0.45359237), label: 'W/kg · weight ' + w.date };
    const p = live?.analytics?.profileUsed?.weightKg;
    return finite(p) && p > 0 && finite(value)
      ? { value: value / p, label: 'W/kg · profile weight' }
      : null;
  }
  function duration(n) {
    return n >= 60 ? n / 60 + ' MIN' : n + ' SEC';
  }
  function selectedProgress() {
    const key = data?.live?.machine?.toLowerCase() || '';
    return (
      data?.progress?.[
        key.includes('bike')
          ? 'bike'
          : key.includes('ski')
            ? 'ski'
            : key.includes('row')
              ? 'row'
              : key
      ] || Object.values(data?.progress || {})[0]
    );
  }
  function paintRibbon() {
    if (!fresh() || !data.live) return false;
    const l = data.live,
      a = l.analytics,
      elapsed = Date.now() - l.computedAt,
      page = Math.floor(Date.now() / 10000) % 3;
    // Completed old rides belong in Ambient/history, not in a new workout's live ribbon.
    if (l.status !== 'recording' || Date.now() - l.sampleAt > 15000) return false;
    const perKg = wkg(l),
      sets =
        page === 0
          ? [
              ['AVG POWER', fmt(a.avgWatts) + ' W'],
              ['BEST 30 SEC', fmt(a.bestPowerWatts?.['30']) + ' W'],
              ['WORK', fmt(a.workKj, 1) + ' kJ'],
              [
                'AVG CADENCE',
                fmt(a.avgCadence) +
                  (String(l.machine).toLowerCase().includes('bike') ? ' RPM' : ' SPM')
              ],
              ['POWER VARIATION', fmt(a.powerCVPercent, 1) + '%']
            ]
          : page === 1
            ? [
                ['BEST 5 MIN', fmt(a.bestPowerWatts?.['300']) + ' W'],
                ['BEST 20 MIN', fmt(a.bestPowerWatts?.['1200']) + ' W'],
                ['POWER / WEIGHT', perKg ? fmt(perKg.value, 2) + ' W/kg' : 'WEIGHT NEEDED'],
                [
                  'POWER / HEART RATE',
                  finite(a.wattsPerBeatPerMinute)
                    ? fmt(a.wattsPerBeatPerMinute, 2) + ' W/BPM'
                    : 'HR NEEDED'
                ],
                [
                  'HR DRIFT',
                  finite(a.aerobicDecouplingPercent)
                    ? fmt(a.aerobicDecouplingPercent, 1) + '%'
                    : '20+ MIN NEEDED'
                ]
              ]
            : [
                [
                  'POWER INDEX¹',
                  finite(a.rollingPower30sFourthMeanWatts)
                    ? fmt(a.rollingPower30sFourthMeanWatts) + ' W'
                    : '30+ SEC NEEDED'
                ],
                [
                  'INTENSITY EST.¹',
                  finite(a.intensityFactorEstimate)
                    ? fmt(a.intensityFactorEstimate, 2)
                    : 'FTP NEEDED'
                ],
                [
                  'LOAD ESTIMATE¹',
                  finite(a.powerLoadEstimate) ? fmt(a.powerLoadEstimate) : 'FTP NEEDED'
                ],
                [
                  'CADENCE ON TARGET',
                  finite(a.cadenceTargetPercent)
                    ? fmt(a.cadenceTargetPercent) + '%'
                    : 'TARGET NEEDED'
                ],
                ['SAMPLE COVERAGE', fmt(a.coveragePercent) + '%']
              ];
    sets.forEach(([label, value], i) => {
      text('metricLabel' + (i + 1), label);
      text('metricValue' + (i + 1), value);
    });
    text(
      'analyticsPage',
      page === 0 ? 'RECORDED SESSION' : page === 1 ? 'SUSTAINED PERFORMANCE' : 'WORKLOAD & QUALITY'
    );
    const available = !current(l) ? ' · PM5 DATA STALE' : '';
    text(
      'sessionInsight',
      a.sampleCount.toLocaleString() +
        ' SAMPLES · ' +
        fmt(a.coveragePercent) +
        '% COVERAGE · ' +
        a.gaps +
        ' GAPS' +
        available +
        (elapsed > 15000 ? ' · ANALYSIS DELAYED' : '') +
        (page === 2 ? ' · ¹ESTIMATES, FTP REQUIRED FOR INTENSITY/LOAD' : '')
    );
    return true;
  }
  function sparkline(points) {
    const el = $('ambientRideSpark');
    if (!el) return;
    if (points.length < 2) {
      el.setAttribute('points', '');
      return;
    }
    const ys = points.map((p) => p.avgWatts),
      lo = Math.min(...ys) - 5,
      hi = Math.max(...ys) + 5;
    el.setAttribute(
      'points',
      ys
        .map(
          (v, i) =>
            ((i / (ys.length - 1)) * 130).toFixed(1) +
            ',' +
            (30 - ((v - lo) / (hi - lo)) * 26).toFixed(1)
        )
        .join(' ')
    );
  }
  function paint() {
    const panel = $('connectedCockpit');
    if (!panel) return;
    const l = fresh() ? data.live : null,
      a = l?.analytics,
      quality = l?.quality;
    panel.dataset.state = current(l) ? 'live' : error ? 'error' : 'waiting';
    text(
      'connectedStatus',
      error
        ? 'RECORDER UNAVAILABLE'
        : !data
          ? 'CONNECTING TO RECORDER'
          : current(l)
            ? 'RECORDER CONNECTED'
            : data?.historyCount
              ? 'SAVED RIDE HISTORY'
              : 'WAITING FOR FIRST RIDE'
    );
    text(
      'connectedQuality',
      quality
        ? quality.samples.toLocaleString() +
            ' samples · ' +
            fmt(quality.coverage) +
            '% coverage' +
            (profileWarning ? ' · PROFILE UPDATE FAILED' : '')
        : 'Records and comparisons appear after sufficient riding.'
    );
    const comp = l?.comparison;
    text('connectedCompare', comp ? signed(comp.deltaWatts) + ' W' : 'BUILD YOUR BASELINE');
    text(
      'connectedCompareContext',
      comp
        ? 'vs ' +
            new Date(comp.at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              timeZone: 'America/New_York'
            }) +
            ' · ' +
            fmt(comp.minutes) +
            ' min on the same machine'
        : 'A comparison needs ≥5 min and a prior ride within 20% duration.'
    );
    const earned = l?.records?.find((r) => r.seconds >= 300) || l?.records?.[0],
      b = l?.priorBests?.['300'];
    text(
      'connectedRecord',
      earned
        ? 'NEW ' + duration(earned.seconds) + ' BEST'
        : b
          ? fmt(b.watts) + ' W'
          : 'NO PRIOR BENCHMARK'
    );
    text(
      'connectedRecordContext',
      earned
        ? fmt(earned.watts) +
            ' W · ' +
            signed(earned.watts - earned.previousWatts) +
            ' W over previous best'
        : b
          ? 'Your previous best sustained 5-minute power'
          : 'Personal records require a prior qualifying ride.'
    );
    const kg = l ? wkg(l) : null;
    text(
      'connectedEfficiency',
      a && finite(a.wattsPerBeatPerMinute)
        ? fmt(a.wattsPerBeatPerMinute, 2) + ' W/BPM'
        : kg
          ? fmt(kg.value, 2) + ' W/kg'
          : 'HR OR WEIGHT NEEDED'
    );
    text(
      'connectedEfficiencyContext',
      a && finite(a.wattsPerBeatPerMinute)
        ? 'Descriptive power / HR · ' + fmt(a.hrCoveragePercent) + '% HR coverage'
        : kg
          ? kg.label
          : 'No efficiency score is inferred from missing readings.'
    );
    text('connectedEfficiencyLabel', 'EFFICIENCY');
    const intervals = l?.intervals || [],
      interval = intervals.at(-1),
      priorInterval = intervals.at(-2);
    if (intervals.length > 1 && Math.floor(Date.now() / 10000) % 2 === 1) {
      text('connectedEfficiencyLabel', 'CURRENT RECORDED INTERVAL');
      text(
        'connectedEfficiency',
        fmt(interval.avgWatts) + ' W · ' + fmt(interval.seconds / 60, 1) + ' MIN'
      );
      text(
        'connectedEfficiencyContext',
        priorInterval
          ? 'Previous interval ' +
              fmt(priorInterval.avgWatts) +
              ' W · ' +
              signed(interval.avgWatts - priorInterval.avgWatts) +
              ' W'
          : 'Building interval history'
      );
    }
    let pacing = 'PACE PROJECTIONS NEED LIVE DATA';
    try {
      const targets = context.getTargets?.(),
        goal = targets?.goal;
      if (goal && current(l)) {
        if (targets.goalReached) pacing = 'PM5 CALORIE GOAL REACHED';
        else if (goal.mode === 'calories')
          pacing = finite(targets.projectedCalories)
            ? 'PROJECTED ' +
              fmt(targets.projectedCalories) +
              ' / ' +
              fmt(goal.calories) +
              ' PM5 KCAL'
            : 'CALIBRATING PM5 CALORIE PACE';
        else
          pacing =
            Math.max(0, Math.ceil((goal.durationMinutes * 60 - (a.elapsedSeconds || 0)) / 60)) +
            ' MIN TO SESSION TIME GOAL';
      }
    } catch {}
    text('connectedPacing', pacing);
    const zones = a?.powerZoneSeconds,
      zoneHost = $('connectedZones');
    if (zoneHost) {
      const sum = zones?.reduce((x, y) => x + y, 0) || 0;
      Array.from(zoneHost.children).forEach((el, i) => {
        el.style.flex = String(sum ? zones[i] : 1);
        el.style.opacity = sum ? '1' : '.18';
      });
      zoneHost.setAttribute(
        'aria-label',
        sum
          ? 'Time in power zones: ' +
              zones.map((v, i) => 'Z' + (i + 1) + ' ' + fmt(v / 60, 1) + ' minutes').join(', ')
          : 'Set an established FTP to enable power zones'
      );
    }
    text(
      'connectedZonesContext',
      zones
        ? 'POWER ZONES 1–7 · FTP ' + fmt(a.profileUsed?.ftpWatts) + ' W'
        : 'POWER ZONES · SET YOUR FTP IN ANALYTICS'
    );
    const weekly = data?.weekly,
      p = selectedProgress(),
      latest = p?.latest,
      cmp = latest?.comparison;
    text('ambientRideMinutes', weekly ? fmt(weekly.movingMinutes) + ' MIN' : '—');
    text(
      'ambientRideContext',
      weekly
        ? weekly.rideDays +
            ' riding days · ' +
            signed(weekly.movingMinutes - weekly.prior.movingMinutes) +
            ' min vs last week'
        : 'RECORDED RIDING THIS WEEK'
    );
    const linking =
      typeof NonZeroConnectedCore !== 'undefined'
        ? NonZeroConnectedCore.merge(state().sessions || [], data?.activities || [])
        : { ambiguous: 0 };
    if (linking.ambiguous)
      text(
        'ambientRideContext',
        linking.ambiguous + ' untimed rides awaiting match · raw riding total'
      );
    text(
      'ambientRideProgress',
      cmp
        ? signed(cmp.deltaWatts) + ' W'
        : p?.bests?.['300']
          ? fmt(p.bests['300'].watts) + ' W'
          : 'BUILDING HISTORY'
    );
    text('ambientRideProgressLabel', cmp ? 'LATEST SIMILAR RIDE' : 'BEST RECORDED 5 MIN');
    const lastRecord = latest?.records?.find((r) => r.seconds >= 300) || latest?.records?.[0];
    if (lastRecord && Math.floor(Date.now() / 15000) % 2 === 0) {
      text('ambientRideProgress', fmt(lastRecord.watts) + ' W');
      text('ambientRideProgressLabel', 'LAST RIDE · NEW ' + duration(lastRecord.seconds) + ' BEST');
    }
    sparkline(p?.recent || []);
    let goal = null;
    try {
      goal = NonZeroWeightJourney.model(state(), NonZeroWeightJourney.date(Date.now()), 30);
    } catch {}
    const w = weight(),
      plan =
        typeof NonZeroWeightJourney !== 'undefined' ? NonZeroWeightJourney.plan(state()) : null;
    if (w && plan) {
      const avg = goal?.avg ?? w.weightLb,
        next = [5, 10, 15, 20, 25].map((n) => plan.baseline - n).find((n) => avg > n);
      text('ambientWeightTarget', next ? fmt(next, 1) + ' LB' : 'GOAL REACHED');
      text(
        'ambientWeightContext',
        next
          ? fmt(avg - next, 1) +
              ' lb to next milestone' +
              (goal?.avg != null ? ' · 7-day avg' : ' · latest weight')
          : '25-lb journey complete'
      );
    } else {
      text('ambientWeightTarget', 'ADD WEIGHT');
      text('ambientWeightContext', 'Milestones appear with a recent reading');
    }
    const stale = !fresh();
    if ($('connectedAmbient')) $('connectedAmbient').dataset.stale = String(stale);
    if (stale && data) {
      text('ambientRideContext', 'Saved snapshot · recorder connection unavailable');
      text('connectedQuality', 'Live recorder data unavailable · values are not current');
    }
    paintRibbon();
    // Carry one useful observation into immersive Ride without replacing its scenery or coaching.
    text(
      'rideProgressInsight',
      comp
        ? signed(comp.deltaWatts) +
            ' W vs similar ride · ' +
            fmt(a?.coveragePercent) +
            '% sample coverage'
        : earned
          ? 'NEW ' + duration(earned.seconds) + ' BEST · ' + fmt(earned.watts) + ' W'
          : a
            ? fmt(a.workKj, 1) + ' kJ recorded · ' + a.sampleCount.toLocaleString() + ' samples'
            : 'Recorder insights appear as you ride.'
    );
  }
  async function syncExplicitProfile(value, signal) {
    const explicit = state().rideTargetProfile;
    if (!explicit || typeof explicit !== 'object') return;
    const wanted = { ...(value.profile || {}) },
      bounds = {
        ftpWatts: [20, 1000],
        restingHr: [25, 120],
        maxHr: [80, 240],
        cadenceMin: [10, 200],
        cadenceMax: [10, 220]
      };
    for (const [key, [low, high]] of Object.entries(bounds))
      if (Object.prototype.hasOwnProperty.call(explicit, key)) {
        const raw = explicit[key],
          n = Number(raw);
        if (raw == null || raw === '' || n === 0) delete wanted[key];
        else if (Number.isFinite(n) && n >= low && n <= high) wanted[key] = n;
      }
    const keys = new Set([...Object.keys(wanted), ...Object.keys(value.profile || {})]);
    if ([...keys].every((k) => wanted[k] === value.profile?.[k])) return;
    const response = await fetch('/api/metrics/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wanted),
      signal
    });
    if (!response.ok) throw Error('Recorder profile update failed');
  }
  async function poll() {
    if (busy) return;
    busy = true;
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/api/metrics/cockpit', {
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw Error('Recorder ' + response.status);
      const value = await response.json();
      if (value.schemaVersion !== 1 || !value.weekly) throw Error('Recorder response incomplete');
      try {
        await syncExplicitProfile(value, controller.signal);
        profileWarning = '';
      } catch (e) {
        profileWarning = String(e);
      }
      data = value;
      received = Date.now();
      error = '';
      try {
        localStorage.setItem(
          'nz.connectedAnalytics.v1',
          JSON.stringify({
            schemaVersion: 1,
            generatedAt: data.generatedAt,
            progress: data.progress,
            weekly: data.weekly,
            historyCount: data.historyCount,
            activities: data.activities
          })
        );
      } catch {}
      paint();
      context.onData?.();
    } catch (e) {
      error = String(e);
      paint();
    } finally {
      busy = false;
      clearTimeout(timeout);
      clearTimeout(timer);
      timer = setTimeout(poll, context.getMode?.() === 'performance' ? 1500 : 15000);
    }
  }
  window.NonZeroConnected = {
    attach(options) {
      context = options || {};
      void poll();
    },
    paintRibbon,
    render: paint,
    getTrace() {
      return fresh() && data.live?.status === 'recording' ? data.live.trace : null;
    },
    snapshot: () => data,
    modeChanged() {
      if (context.getMode) {
        clearTimeout(timer);
        void poll();
      }
    },
    mergeSessions(base) {
      return NonZeroConnectedCore.merge(base, data?.activities || []);
    }
  };
})();
