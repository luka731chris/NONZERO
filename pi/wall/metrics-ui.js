(() => {
  'use strict';
  const host = document.getElementById('nzMetrics');
  if (!host) return;
  const local = location.pathname.includes('analytics.html');
  let rides = [],
    profile = {},
    health = [],
    selected = null,
    range = 30;
  let weightState = {};
  function journeyState() {
    if (!local) return state;
    try {
      const saved = JSON.parse(localStorage.getItem('nz.weightJourney.v1') || 'null');
      const binding =
        (localStorage.getItem('nz.endpoint') || '') +
        '|' +
        (localStorage.getItem('nz.wallToken') || '');
      return saved?.binding === binding ? saved.state : {};
    } catch {
      return {};
    }
  }
  function renderJourney() {
    weightState = journeyState();
    const target = host.querySelector('#mWeightJourney');
    target.innerHTML =
      (local && !weightState.bodyMeasurements
        ? '<p class="mSub">Open the paired wall once to load its synced weight history on this device.</p>'
        : '') +
      NonZeroWeightJourney.panel(weightState, NonZeroWeightJourney.date(Date.now()), range);
    const v = visible();
    host.querySelector('#mWeightPerformance').innerHTML =
      '<h3>Weight alongside performance</h3><p class="mSub">Dated weight uses the most recent reading on or before each ride, up to 7 days old. W/kg here uses that weight; original PM5 analytics remain preserved. These trends do not establish cause and effect.</p>' +
      v
        .slice(-10)
        .reverse()
        .map((r) => {
          const w = NonZeroWeightJourney.rideWeight(weightState, r.start);
          return (
            '<div class="mRow"><div>' +
            esc(new Date(r.start).toLocaleDateString()) +
            '<br><span>' +
            fmt(r.analytics.avgWatts) +
            ' W</span></div><div>' +
            (w
              ? fmt(w.weightLb, 1) + ' lb<br><span>' + w.date + '</span>'
              : '—<br><span>No dated weight</span>') +
            '</div><div>' +
            (w && Number.isFinite(r.analytics.avgWatts)
              ? fmt(r.analytics.avgWatts / (w.weightLb * 0.45359237), 2) + ' W/kg'
              : '—') +
            '</div></div>'
          );
        })
        .join('');
  }
  const esc = (x) =>
    String(x ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const fmt = (n, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : '—');
  const tile = (name, n, unit = '', d = 0) =>
    `<div class="mTile"><strong>${fmt(n, d)} <small>${unit}</small></strong><small>${name}</small></div>`;
  function status(x) {
    host.querySelector('.mStatus').textContent = x;
  }
  function persist() {
    if (!local) {
      const previous = state.pm5Analytics;
      const next = { schemaVersion: 1, profile, rides, health, updatedAt: Date.now() };
      if (
        previous &&
        JSON.stringify({ ...previous, updatedAt: 0 }) === JSON.stringify({ ...next, updatedAt: 0 })
      )
        return;
      state.pm5Analytics = next;
      try {
        save();
      } catch (e) {
        state.pm5Analytics = previous;
        throw Error('Device storage is full. Export a backup before importing more records.');
      }
      window.dispatchEvent(new Event('suite-state-changed'));
    }
  }
  async function rawStore(ride) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('NONZERO-Metrics', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('rides', { keyPath: 'id' });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result,
          tx = db.transaction('rides', 'readwrite');
        tx.objectStore('rides').put(ride);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
    });
  }
  async function rawRead(id) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('NONZERO-Metrics', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('rides', { keyPath: 'id' });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result,
          tx = db.transaction('rides'),
          q = tx.objectStore('rides').get(id);
        q.onsuccess = () => resolve(q.result);
        q.onerror = () => reject(q.error);
        tx.oncomplete = () => db.close();
      };
    });
  }
  function download(name, data, type = 'application/json') {
    const blob = new Blob([data], { type }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function visible() {
    const after = range ? Date.now() - range * 86400000 : 0;
    return rides
      .filter((x) => x.start >= after && x.status === 'complete')
      .sort((a, b) => a.start - b.start);
  }
  function trend(canvas, values, color, label) {
    const context = canvas.getContext('2d'),
      width = canvas.clientWidth || 500,
      height = 190,
      dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.scale(dpr, dpr);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#9aa9bd';
    context.font = '11px system-ui';
    context.fillText(label, 12, 20);
    const valid = values.map((v, i) => ({ v, i })).filter((x) => Number.isFinite(x.v));
    if (!valid.length) {
      context.fillText('Record rides to see your trend', 12, 100);
      return;
    }
    const min = Math.min(...valid.map((x) => x.v)),
      max = Math.max(...valid.map((x) => x.v)),
      span = max - min || Math.max(1, max * 0.1);
    context.strokeStyle = '#243347';
    for (let i = 0; i < 3; i++) {
      const y = 40 + i * 58;
      context.beginPath();
      context.moveTo(40, y);
      context.lineTo(width - 12, y);
      context.stroke();
      context.fillText(fmt(max - ((max - min) * i) / 2, 0), 5, y);
    }
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.beginPath();
    let pen = false;
    values.forEach((v, i) => {
      if (!Number.isFinite(v)) {
        pen = false;
        return;
      }
      const px = 42 + (i * (width - 62)) / Math.max(1, values.length - 1),
        py = 155 - ((v - min) / span) * 112;
      pen ? context.lineTo(px, py) : context.moveTo(px, py);
      pen = true;
    });
    context.stroke();
    context.fillStyle = color;
    for (const x of valid) {
      context.beginPath();
      context.arc(
        42 + (x.i * (width - 62)) / Math.max(1, values.length - 1),
        155 - ((x.v - min) / span) * 112,
        3,
        0,
        7
      );
      context.fill();
    }
    context.fillStyle = '#9aa9bd';
    context.fillText('Oldest ride → newest ride', width - 175, 180);
  }
  host.innerHTML = `<div class="mHead"><div><span class="mBadge">NONZERO · PERFORMANCE INTELLIGENCE</span><h2>Every ride. Measurable progress.</h2></div><select id="mRange" aria-label="Analytics date range" style="width:110px"><option value="7">7 days</option><option value="30" selected>30 days</option><option value="90">90 days</option><option value="365">1 year</option><option value="0">All time</option></select></div><p class="mSub">PM5 readings, calculated performance, and imported health data. Missing readings stay missing.</p><div class="mTools"><button id="mRefresh">Refresh</button><button id="mBackup">Export backup</button><button id="mCSV">Export CSV</button>${local ? '<a href="/api/metrics/capture/export" download="NONZERO-PM5-Raw.ndjson">Export raw PM5 archive</a>' : ''}${local ? '' : '<label>Import PM5 backup<input id="mImport" type="file" accept=".json"></label>'}${local ? '' : '<label>Import Apple Health XML<input id="mHealth" type="file" accept=".xml"></label>'}</div><div class="mStatus" role="status" aria-live="polite"></div><div id="mWeightJourney"></div><div id="mWeightPerformance"></div><div id="mTotals" class="mGrid"></div><div class="mTrend"><div><canvas id="mPower" class="mChart" aria-label="Average power per ride"></canvas><p>Average power · compare similar ride durations and workout types.</p></div><div><canvas id="mEfficiency" class="mChart" aria-label="Power to heart rate ratio per ride"></canvas><p>Watts / BPM · descriptive ratio, affected by heat, fatigue, hydration, and ride intensity.</p></div></div><div id="mHealthSummary"></div><div id="mRides"></div><div id="mDetail" class="mDetail" hidden></div><details><summary>Personal thresholds &amp; metric definitions</summary><p class="mSub">Enter established values. No age-based maximum HR or automatic FTP guesses. Calculations use the current profile; exports preserve the profile used.</p><div class="mFields">${[
    ['weightKg', 'Body mass · kg'],
    ['ftpWatts', 'FTP · watts'],
    ['restingHr', 'Resting heart rate · BPM'],
    ['maxHr', 'Maximum heart rate · BPM'],
    ['cadenceMin', 'Target cadence minimum'],
    ['cadenceMax', 'Target cadence maximum']
  ]
    .map(([k, n]) => `<label>${n}<input data-profile="${k}" type="number" step="0.1"></label>`)
    .join(
      ''
    )}</div><button id="mSaveProfile">Save thresholds</button><p class="mSub">Work = power integrated over observed seconds. Best efforts require an uninterrupted full window. Power/cadence variation is coefficient of variation. HR zones use 60/70/80/90% heart-rate reserve; power zones use 55/75/90/105/120/150% FTP. Load is a descriptive estimate using fourth-power mean of rolling 30-second power and FTP, not Apple's training-load score. Aerobic decoupling requires 20 minutes of HR, ≥90% HR coverage, and half-ride average power within 10%; compare steady rides only. PM5 calories remain a monitor estimate and are not automatically labeled Apple active energy. HR recovery requires valid readings near stop and 60 seconds later.</p></details><details><summary>Apple Health &amp; cardio fitness</summary><p class="mSub">For Apple Watch heart rate: install ErgData on iPhone and Watch, enable its Health permissions, then open ErgData and connect to the PM5 before riding. Verify heart rate appears in NONZERO; missing PM5 HR is explicitly reported in ride coverage. ErgData is the supported Apple Health bridge for workouts. This web app cannot read or write HealthKit directly. Import the unzipped export.xml from Apple Health → profile → Export All Health Data to mirror resting HR, HRV (SDNN), cardio fitness (VO₂ max), and body mass. Imported values retain units, timestamp, and source. HRV cannot be calculated from ordinary PM5 BPM readings. Indoor PM5 rides do not produce Apple's cardio-fitness estimate. TCX and JSON exports are for compatible apps; Apple Health does not directly import these files.</p></details>`;
  function render() {
    renderJourney();
    const v = visible(),
      a = v.map((x) => x.analytics),
      minutes = a.reduce((n, x) => n + (x.movingSeconds || 0) / 60, 0),
      work = a.reduce((n, x) => n + (x.workKj || 0), 0),
      distance = a.reduce((n, x) => n + (x.distanceMetersObserved || 0) / 1000, 0),
      seconds = a.reduce((n, x) => n + (x.observedSeconds || 0), 0),
      avg = seconds
        ? a.reduce((n, x) => n + (x.avgWatts || 0) * (x.observedSeconds || 0), 0) / seconds
        : null;
    host.querySelector('#mTotals').innerHTML =
      tile('Completed rides', v.length) +
      tile('Moving time', minutes, 'min') +
      tile('Mechanical work', work, 'kJ') +
      tile('Observed distance', distance, 'km', 1) +
      tile('Weighted average power', avg, 'W') +
      tile(
        'Best sustained 5 minutes',
        a.some((x) => x.bestPowerWatts?.['300'] != null)
          ? Math.max(...a.map((x) => x.bestPowerWatts?.['300'] || 0))
          : null,
        'W'
      );
    trend(
      host.querySelector('#mPower'),
      a.map((x) => x.avgWatts),
      '#d6b961',
      'AVERAGE POWER · W'
    );
    trend(
      host.querySelector('#mEfficiency'),
      a.map((x) => x.wattsPerBeatPerMinute),
      '#60c7e0',
      'OUTPUT / HEART RATE · W/BPM'
    );
    host.querySelector('#mRides').innerHTML = v.length
      ? v
          .slice()
          .reverse()
          .map(
            (x) =>
              `<button class="mRow" data-ride="${esc(x.id)}"><div><b>${esc(new Date(x.start).toLocaleDateString())}</b><br><span>${fmt(x.analytics.movingSeconds / 60, 1)} min · ${esc(x.machine)}</span></div><div>${fmt(x.analytics.avgWatts)} W<br><span>${fmt(x.analytics.avgHr)} BPM</span></div><div>${fmt(x.analytics.coveragePercent)}%<br><span>data coverage</span></div></button>`
          )
          .join('')
      : '<p class="mSub">No completed rides in this range. Pedal with the PM5 connected; the recorder saves the ride after five minutes without motion. A monitor reset starts a new ride.</p>';
    host.querySelectorAll('[data-profile]').forEach((x) => {
      if (document.activeElement !== x) x.value = profile[x.dataset.profile] ?? '';
    });
    const latest = (type) => health.filter((x) => x.type === type).sort((a, b) => b.at - a.at)[0];
    host.querySelector('#mHealthSummary').innerHTML = health.length
      ? '<h3>Imported Apple Health</h3><div class="mGrid">' +
        [
          ['HKQuantityTypeIdentifierVO2Max', 'Cardio fitness', 'mL/kg/min'],
          ['HKQuantityTypeIdentifierRestingHeartRate', 'Resting HR', 'BPM'],
          ['HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'HRV · SDNN', 'ms'],
          ['HKQuantityTypeIdentifierBodyMass', 'Body mass', 'kg']
        ]
          .map(([type, label, unit]) => {
            const x = latest(type);
            return tile(label, x?.value, unit, 1).replace(
              '</div>',
              x
                ? '<p class="mSub">' +
                    esc(new Date(x.at).toLocaleDateString()) +
                    ' · ' +
                    esc(x.source) +
                    '</p></div>'
                : '</div>'
            );
          })
          .join('') +
        '</div><p class="mSub">Latest imported values · source and full dated history included in backups. This is an import, not live HealthKit synchronization.</p><div class="mTrend"><canvas id="mVO2" class="mChart" aria-label="Imported cardio fitness trend"></canvas><canvas id="mRHR" class="mChart" aria-label="Imported resting heart rate trend"></canvas></div>'
      : '';
    if (health.length) {
      const htype = (t) =>
        health
          .filter((x) => x.type === t && (!range || x.at >= Date.now() - range * 86400000))
          .sort((a, b) => a.at - b.at)
          .map((x) => x.value);
      trend(
        host.querySelector('#mVO2'),
        htype('HKQuantityTypeIdentifierVO2Max'),
        '#67c28a',
        'IMPORTED CARDIO FITNESS · ML/KG/MIN'
      );
      trend(
        host.querySelector('#mRHR'),
        htype('HKQuantityTypeIdentifierRestingHeartRate'),
        '#60c7e0',
        'IMPORTED RESTING HEART RATE · BPM'
      );
    }
  }
  async function refresh() {
    try {
      if (local) {
        let offset = 0,
          all = [],
          d;
        do {
          const res = await fetch('/api/metrics/rides?limit=100&offset=' + offset);
          if (!res.ok) throw Error('Recorder unavailable');
          d = await res.json();
          all.push(...d.rides);
          offset += d.rides.length;
          if (!d.rides.length) break;
        } while (offset < d.total);
        rides = all;
        profile = d.profile;
        const q = d.recorder;
        status(
          q?.captureError
            ? 'PM5 archive warning: ' + q.captureError
            : q?.error
              ? 'Recording fault: ' + q.error
              : q?.live
                ? q.recording
                  ? 'Recorder connected · ' +
                    (q.captureStored ? 'raw archive saving · ' : 'raw archive not confirmed · ') +
                    (q.heartRate >= 25
                      ? 'heart rate reaching NONZERO'
                      : 'no heart rate supplied by PM5')
                  : 'PM5 connected · recorder not ready'
                : 'Waiting for live PM5 telemetry · saved rides remain available.'
        );
      } else {
        const stored = state.pm5Analytics || {};
        rides = stored.rides || [];
        profile = stored.profile || {};
        health = stored.health || [];
        if (cloudReady()) {
          try {
            const res = await fetch(cloudConfig.endpoint + '/metrics/rides', {
              headers: { 'X-NONZERO-Key': cloudConfig.syncKey }
            });
            if (res.ok) {
              let d = await res.json();
              const map = new Map(rides.map((x) => [x.id, x]));
              for (;;) {
                for (const x of d.rides || [])
                  if (!map.has(x.id) || (map.get(x.id).updatedAt || 0) <= (x.updatedAt || 0))
                    map.set(x.id, x);
                if (!d.nextCursor) break;
                const page = await fetch(
                  cloudConfig.endpoint +
                    '/metrics/rides?cursor=' +
                    encodeURIComponent(d.nextCursor),
                  { headers: { 'X-NONZERO-Key': cloudConfig.syncKey } }
                );
                if (!page.ok) throw Error('Cloud pagination failed');
                d = await page.json();
              }
              rides = [...map.values()];
              persist();
              status('Cloud ride summaries updated. Raw readings remain on the Pi.');
            } else
              status(
                'Using saved analytics. Automatic Pi sync needs the included metrics Worker update; backup import works now.'
              );
          } catch {
            status('Offline · showing saved analytics.');
          }
        } else status('Import a Pi backup to view recorded rides here.');
      }
      render();
    } catch (e) {
      status(e.message);
    }
  }
  async function detail(id) {
    selected = rides.find((x) => x.id === id);
    if (!selected) return;
    const a = selected.analytics,
      d = host.querySelector('#mDetail');
    d.hidden = false;
    d.innerHTML = `<h3>${esc(new Date(selected.start).toLocaleString())}</h3><div class="mTools"><button id="mTCX">Export ride TCX</button><button id="mRideJSON">Export full ride JSON</button><button id="mContract">Export HealthKit mapping</button></div><div class="mGrid">${
      tile('Average power', a.avgWatts, 'W') +
      tile('Peak sample power', a.maxWatts, 'W') +
      tile('Watts per kg', a.wattsPerKg, 'W/kg', 2) +
      tile('Average cadence', a.avgCadence, 'RPM', 1) +
      tile('Average heart rate', a.avgHr, 'BPM') +
      tile('Heart-rate coverage', a.hrCoveragePercent, '%', 1) +
      tile('Power variation', a.powerCVPercent, '%', 1) +
      tile('Cadence in target', a.cadenceTargetPercent, '%', 1) +
      tile('Mechanical work', a.workKj, 'kJ', 1) +
      tile('Power load estimate', a.powerLoadEstimate, '', 1) +
      tile('Aerobic decoupling', a.aerobicDecouplingPercent, '%', 1) +
      tile('60s HR recovery', a.hrRecovery60sBpm, 'BPM') +
      Object.entries(a.bestPowerWatts || {})
        .map(([n, w]) => tile('Best ' + (n >= 60 ? n / 60 + ' min' : n + ' sec'), w, 'W'))
        .join('')
    }</div><canvas class="mChart" id="mTrace" aria-label="Ride power trace"></canvas><p id="mTraceStatus" class="mSub"></p><p class="mSub">${fmt(a.coveragePercent, 1)}% observed · ${a.gaps} transport gaps · PM5 calories: ${fmt(a.monitorCalories)} (monitor estimate). Missing intervals are excluded from calculated work and distance. VO₂ max: unavailable from PM5 alone.</p>${a.hrZoneSeconds ? '<b>Heart-rate zones · 1–5</b><div class="mZones">' + a.hrZoneSeconds.map((v, i) => `<span title="Zone ${i + 1}: ${fmt(v / 60, 1)} min" style="flex:${v};background:${['#697f9b', '#55b5d2', '#67c28a', '#d6b961', '#d87878'][i]}"></span>`).join('') + '</div><p class="mSub">' + a.hrZoneSeconds.map((v, i) => 'Z' + (i + 1) + ': ' + fmt(v / 60, 1) + ' min').join(' · ') + '</p>' : ''}<p class="mSub">Intervals: ${esc(
      Object.entries(a.intervals || {})
        .map(([n, v]) => `${n}: ${fmt(v.seconds / 60, 1)} min / ${fmt(v.avgWatts)} W`)
        .join(' · ')
    )}</p>`;
    let full = null;
    try {
      full = local
        ? await (await fetch('/api/metrics/ride?id=' + encodeURIComponent(id))).json()
        : await rawRead(id);
      if (full?.samples)
        trend(
          d.querySelector('#mTrace'),
          full.samples.map((x, i) =>
            x.fresh !== false &&
            !x.recovering &&
            (!i || x.updatedAt - full.samples[i - 1].updatedAt <= 2500)
              ? x.watts
              : null
          ),
          '#d6b961',
          'POWER TRACE · W'
        );
      d.querySelector('#mTraceStatus').textContent = full?.samples
        ? 'Recorded power, sample order · full timestamped data in ride exports.'
        : 'Detailed readings are on the Pi. Import a full backup to view and export them here.';
    } catch {
      d.querySelector('#mTraceStatus').textContent =
        'Detailed readings unavailable on this device.';
    }
    d.querySelector('#mRideJSON').onclick = () =>
      download(id + '.json', JSON.stringify(full || selected, null, 2));
    d.querySelector('#mTCX').onclick = () => {
      if (!full?.samples) {
        status('Import the full Pi backup first to export a TCX trace.');
        return;
      }
      download(id + '.tcx', tcx(full), 'application/xml');
    };
    d.querySelector('#mContract').onclick = () =>
      download(id + '-healthkit-mapping.json', JSON.stringify(contract(full || selected), null, 2));
    d.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function tcx(r) {
    const points = (r.samples || [])
      .filter((x) => x.updatedAt <= (r.end || r.last_motion))
      .map(
        (x) =>
          `<Trackpoint><Time>${new Date(x.updatedAt).toISOString()}</Time><DistanceMeters>${Math.max(0, x.distanceMeters - (r.samples[0].distanceMeters || 0))}</DistanceMeters>${x.heartRate >= 25 && x.heartRate <= 240 ? `<HeartRateBpm><Value>${Math.round(x.heartRate)}</Value></HeartRateBpm>` : ''}<Cadence>${Math.round(x.cadence || 0)}</Cadence><Extensions><ns3:TPX><ns3:Watts>${Math.round(x.watts || 0)}</ns3:Watts></ns3:TPX></Extensions></Trackpoint>`
      )
      .join('');
    return `<?xml version="1.0" encoding="UTF-8"?><TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><Activities><Activity Sport="Biking"><Id>${new Date(r.start).toISOString()}</Id><Lap StartTime="${new Date(r.start).toISOString()}"><TotalTimeSeconds>${r.analytics.elapsedSeconds}</TotalTimeSeconds><DistanceMeters>${r.analytics.distanceMetersObserved}</DistanceMeters><Calories>${Math.round(r.analytics.monitorCalories || 0)}</Calories><Intensity>Active</Intensity><TriggerMethod>Manual</TriggerMethod><Track>${points}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`;
  }
  function contract(r) {
    return {
      schema: 'nonzero.healthkit.mapping.v1',
      syncIdentifier: r.id,
      syncVersion: 1,
      workout: {
        activity: 'cycling',
        indoor: true,
        start: new Date(r.start).toISOString(),
        end: new Date(r.end || r.last_motion).toISOString()
      },
      quantities: (r.samples || [])
        .filter((x) => x.updatedAt <= (r.end || r.last_motion))
        .flatMap((x) =>
          [
            ['HKQuantityTypeIdentifierHeartRate', x.heartRate, 'count/min', 25, 240],
            ['HKQuantityTypeIdentifierCyclingPower', x.watts, 'W', 0, 3000],
            ['HKQuantityTypeIdentifierCyclingCadence', x.cadence, 'count/min', 0, 250]
          ]
            .filter(([, v, , lo, hi]) => Number.isFinite(v) && v >= lo && v <= hi)
            .map(([identifier, value, unit]) => ({
              identifier,
              value,
              unit,
              at: new Date(x.updatedAt).toISOString(),
              source: 'Concept2 PM5 USB'
            }))
        ),
      excluded: {
        activeEnergyBurned: 'PM5 calories do not establish Apple active energy',
        vo2Max: 'Not measured',
        heartRateVariabilitySDNN: 'RR intervals unavailable'
      },
      requires:
        'Native iOS HealthKit app with user authorization; JSON is not directly importable by Apple Health'
    };
  }
  async function importBackup(file) {
    if (file.size > 150 * 1024 * 1024) throw Error('Backup exceeds 150 MB; use per-ride exports.');
    const d = JSON.parse(await file.text());
    if (d.schemaVersion !== 1 || !Array.isArray(d.rides))
      throw Error('Choose a NONZERO metrics backup.');
    const map = new Map(rides.map((x) => [x.id, x]));
    for (const x of d.rides) {
      if (
        !/^pm5-[a-zA-Z0-9-]{1,80}$/.test(x.id) ||
        !Number.isFinite(x.start) ||
        !Number.isFinite(x.last_motion) ||
        !Number.isFinite(x.updatedAt) ||
        !['complete', 'recording'].includes(x.status) ||
        !x.analytics
      )
        throw Error('Invalid ride record');
      if (x.samples) {
        if (
          !Array.isArray(x.samples) ||
          x.samples.some(
            (v, i) =>
              !Number.isFinite(v.updatedAt) || (i && v.updatedAt <= x.samples[i - 1].updatedAt)
          )
        )
          throw Error('Invalid sample timestamps');
        await rawStore(x);
      }
      const summary = { ...x };
      delete summary.samples;
      if (!map.has(x.id) || (map.get(x.id).updatedAt || 0) <= (summary.updatedAt || 0))
        map.set(x.id, summary);
    }
    rides = [...map.values()];
    if (!local && Array.isArray(d.bodyMeasurements)) {
      const valid = NonZeroWeightJourney.rows(
        { bodyMeasurements: d.bodyMeasurements },
        NonZeroWeightJourney.date(Date.now())
      );
      const wm = new Map(
        (state.bodyMeasurements || []).map((x) => [x.id || x.date + '|' + x.at, x])
      );
      for (const r of valid) {
        const id = r.id || r.date + '|' + r.at;
        if (!wm.has(id) || Number(wm.get(id).at || 0) <= Number(r.at || 0)) wm.set(id, r);
      }
      state.bodyMeasurements = [...wm.values()];
      if (d.weightJourney && !state.surgeryPlan?.weightJourney) {
        const p = d.weightJourney;
        if (
          Number(p.baseline) >= 75 &&
          Number(p.baseline) <= 700 &&
          Number.isFinite(NonZeroWeightJourney.day(p.startDate))
        )
          state.surgeryPlan = {
            ...(state.surgeryPlan || {}),
            weightJourney: { baseline: Number(p.baseline), startDate: p.startDate, loss: 25 }
          };
      }
    }
    if (!Object.keys(profile).length) profile = d.profile || {};
    if (Array.isArray(d.health)) {
      const hm = new Map(health.map((x) => [x.id, x]));
      for (const x of d.health)
        if (typeof x.id === 'string' && Number.isFinite(x.at) && Number.isFinite(x.value))
          hm.set(x.id, x);
      health = [...hm.values()];
    }
    persist();
    render();
    status(
      'Imported ' +
        d.rides.length +
        ' rides. Duplicate ride IDs were merged. Detailed samples saved on this device.'
    );
  }
  async function importHealth(file) {
    if (file.size > 100 * 1024 * 1024)
      throw Error(
        'For exports over 100 MB, use a smaller XML export; this device import is bounded.'
      );
    const doc = new DOMParser().parseFromString(await file.text(), 'application/xml');
    if (doc.querySelector('parsererror')) throw Error('Invalid Apple Health XML');
    const wanted = new Set([
        'HKQuantityTypeIdentifierVO2Max',
        'HKQuantityTypeIdentifierRestingHeartRate',
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        'HKQuantityTypeIdentifierBodyMass'
      ]),
      map = new Map(health.map((x) => [x.id, x]));
    let count = 0;
    for (const node of doc.querySelectorAll('Record')) {
      const type = node.getAttribute('type');
      if (!wanted.has(type)) continue;
      const at = Date.parse(node.getAttribute('startDate')),
        raw = Number(node.getAttribute('value')),
        source = node.getAttribute('sourceName') || 'Apple Health',
        unit = node.getAttribute('unit');
      if (!Number.isFinite(raw) || !Number.isFinite(at)) continue;
      let value = raw;
      if (type.endsWith('BodyMass')) {
        if (unit === 'lb') value = raw * 0.45359237;
        else if (unit !== 'kg') continue;
      } else if (type.endsWith('HeartRateVariabilitySDNN')) {
        if (unit === 's') value = raw * 1000;
        else if (unit !== 'ms') continue;
      } else if (type.endsWith('VO2Max')) {
        if (unit !== 'mL/min·kg' && unit !== 'ml/kg/min' && unit !== 'mL/kg/min') continue;
      } else if (unit !== 'count/min') continue;
      if (value <= 0) continue;
      const id = [type, at, source, unit, raw].join('|');
      map.set(id, {
        id,
        type,
        at,
        value,
        unit: type.endsWith('BodyMass')
          ? 'kg'
          : type.endsWith('HeartRateVariabilitySDNN')
            ? 'ms'
            : type.endsWith('VO2Max')
              ? 'mL/kg/min'
              : 'count/min',
        source,
        originalValue: raw,
        originalUnit: unit
      });
      count++;
    }
    health = [...map.values()];
    persist();
    render();
    status(
      'Imported ' +
        count +
        ' matching health records; duplicates merged. Values retain source and date.'
    );
  }
  host.querySelector('#mRange').onchange = (e) => {
    range = Number(e.target.value);
    render();
  };
  host.querySelector('#mRefresh').onclick = refresh;
  host.querySelector('#mRides').onclick = (e) => {
    const b = e.target.closest('[data-ride]');
    if (b) detail(b.dataset.ride);
  };
  if (host.querySelector('#mImport'))
    host.querySelector('#mImport').onchange = async (e) => {
      try {
        await importBackup(e.target.files[0]);
      } catch (x) {
        status(x.message);
      } finally {
        e.target.value = '';
      }
    };
  if (host.querySelector('#mHealth'))
    host.querySelector('#mHealth').onchange = async (e) => {
      try {
        await importHealth(e.target.files[0]);
      } catch (x) {
        status(x.message);
      } finally {
        e.target.value = '';
      }
    };
  host.querySelector('#mSaveProfile').onclick = async () => {
    try {
      const p = {};
      host.querySelectorAll('[data-profile]').forEach((x) => {
        if (x.value !== '') p[x.dataset.profile] = Number(x.value);
      });
      const bounds = {
        weightKg: [25, 350],
        ftpWatts: [20, 1000],
        restingHr: [25, 120],
        maxHr: [80, 240],
        cadenceMin: [10, 200],
        cadenceMax: [10, 220]
      };
      for (const [k, v] of Object.entries(p))
        if (!Number.isFinite(v) || v < bounds[k][0] || v > bounds[k][1]) throw Error('Check ' + k);
      if (p.maxHr <= p.restingHr || p.cadenceMax < p.cadenceMin)
        throw Error('Check threshold ordering');
      if (local) {
        const res = await fetch('/api/metrics/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p)
        });
        if (!res.ok) throw Error('Invalid thresholds');
        profile = await res.json();
        await refresh();
      } else {
        profile = p;
        persist();
        render();
      }
      status(
        local
          ? 'Thresholds saved; ride calculations refreshed.'
          : 'Profile saved. Set the same profile on the Pi to recalculate PM5 rides; imported summaries preserve their original profile.'
      );
    } catch (e) {
      status(e.message);
    }
  };
  host.querySelector('#mBackup').onclick = async () => {
    try {
      if (local) {
        const res = await fetch('/api/metrics/backup');
        if (!res.ok) throw Error('Backup failed');
        const data = await res.json();
        const w = journeyState();
        download(
          'NONZERO-Metrics-Backup.json',
          JSON.stringify({
            ...data,
            bodyMeasurements: w.bodyMeasurements || [],
            weightJourney: NonZeroWeightJourney.plan(w)
          })
        );
      } else {
        const all = [];
        for (const x of rides) all.push((await rawRead(x.id)) || x);
        download(
          'NONZERO-Metrics-Backup.json',
          JSON.stringify({
            schemaVersion: 1,
            exportedAt: Date.now(),
            profile,
            rides: all,
            health,
            bodyMeasurements: state.bodyMeasurements || [],
            weightJourney: NonZeroWeightJourney.plan(state)
          })
        );
      }
      status('Backup exported. Keep it with your ride history.');
    } catch (e) {
      status(e.message);
    }
  };
  host.querySelector('#mCSV').onclick = () => {
    const columns = [
      'start',
      'id',
      'status',
      'avgWatts',
      'maxWatts',
      'avgCadence',
      'avgHr',
      'maxHr',
      'movingSeconds',
      'distanceMetersObserved',
      'workKj',
      'wattsPerKg',
      'coveragePercent',
      'hrCoveragePercent',
      'powerCVPercent',
      'powerLoadEstimate',
      'aerobicDecouplingPercent',
      'hrRecovery60sBpm',
      'datedWeightLb',
      'weightReadingDate',
      'datedWattsPerKg'
    ];
    const quote = (x) => '"' + String(x ?? '').replaceAll('"', '""') + '"';
    download(
      'NONZERO-Ride-Summaries.csv',
      [
        columns.join(','),
        ...visible().map((r) =>
          columns
            .map((k) =>
              quote(
                k === 'start'
                  ? new Date(r.start).toISOString()
                  : k === 'datedWeightLb'
                    ? NonZeroWeightJourney.rideWeight(journeyState(), r.start)?.weightLb
                    : k === 'weightReadingDate'
                      ? NonZeroWeightJourney.rideWeight(journeyState(), r.start)?.date
                      : k === 'datedWattsPerKg'
                        ? (() => {
                            const w = NonZeroWeightJourney.rideWeight(journeyState(), r.start);
                            return w && Number.isFinite(r.analytics.avgWatts)
                              ? r.analytics.avgWatts / (w.weightLb * 0.45359237)
                              : null;
                          })()
                        : (r[k] ?? r.analytics[k])
              )
            )
            .join(',')
        )
      ].join('\n'),
      'text/csv'
    );
  };
  window.addEventListener('suite-state-changed', renderJourney);
  window.addEventListener('storage', (e) => {
    if (e.key === 'nz.weightJourney.v1') renderJourney();
  });
  window.NONZEROMetrics = { tcx, contract, importHealth, importBackup, refresh };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-tab="History"]')) refresh();
  });
  if (local) setInterval(refresh, 30000);
  refresh();
})();
