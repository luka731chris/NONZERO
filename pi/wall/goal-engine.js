(function (root) {
  'use strict';
  const finite = (x, lo = 0, hi = 1e10) =>
    typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi ? x : null;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const median = (a) => {
    const v = a.filter(Number.isFinite).sort((x, y) => x - y);
    return v.length ? v[Math.floor(v.length / 2)] : null;
  };
  function normalize(goal = {}) {
    return {
      mode: goal.mode === 'calories' ? 'calories' : 'intensity',
      intensity: ['easy', 'steady', 'challenging'].includes(goal.intensity)
        ? goal.intensity
        : 'steady',
      calories: finite(Number(goal.calories), 10, 3000) || 300,
      durationMinutes: finite(Number(goal.durationMinutes), 5, 180) || 30,
      updatedAt: finite(goal.updatedAt, 0, 1e16) || 0
    };
  }
  function profile(p = {}, health = []) {
    const out = {};
    for (const [k, lo, hi] of [
      ['ftpWatts', 20, 1000],
      ['restingHr', 25, 120],
      ['maxHr', 80, 240]
    ])
      if (finite(Number(p[k]), lo, hi) != null) out[k] = Number(p[k]);
    if (!out.restingHr) {
      const record = health
        .filter(
          (x) =>
            x.type === 'HKQuantityTypeIdentifierRestingHeartRate' &&
            finite(x.value, 25, 120) &&
            finite(x.at, 0, 1e16)
        )
        .sort((a, b) => b.at - a.at)[0];
      if (record) out.restingHr = record.value;
    }
    if (out.maxHr && out.restingHr >= out.maxHr) delete out.maxHr;
    return out;
  }
  function create() {
    let session = null,
      rows = [],
      lastKey = '',
      start = 0,
      baseCalories = null,
      previous = null,
      lastAdjust = 0,
      currentPower = null,
      rideSeconds = 0,
      frozenBaseline = null,
      lastResult = null;
    return {
      reset() {
        session = null;
        rows = [];
        lastKey = '';
        start = 0;
        baseCalories = null;
        previous = null;
        lastAdjust = 0;
        currentPower = null;
        rideSeconds = 0;
        frozenBaseline = null;
        lastResult = null;
      },
      update(input = {}) {
        const goal = normalize(input.goal),
          p = profile(input.profile, input.health),
          t = input.telemetry || {},
          now = finite(input.now, 0, 1e16) || Date.now(),
          id = input.sessionId || t.recordingId || 'standby';
        if (id !== session) {
          this.reset();
          session = id;
        }
        const stamp = finite(t.updatedAt, 0, 1e16),
          live = !!(
            t.connected &&
            t.fresh !== false &&
            !t.recovering &&
            stamp &&
            now - stamp >= -1000 &&
            now - stamp < 2500 &&
            !input.paused
          );
        const key = String(t.readSequence ?? '') + '|' + stamp;
        if (live && key !== lastKey) {
          lastKey = key;
          const w = finite(t.watts, 0, 3000),
            rpm = finite(t.cadence ?? t.rpm, 0, 250),
            cal = finite(t.calories, 0, 100000),
            elapsed = finite(t.elapsedSeconds);
          if (
            previous &&
            ((cal != null && previous.cal != null && cal < previous.cal) ||
              (elapsed != null && previous.elapsed != null && elapsed + 2 < previous.elapsed))
          ) {
            this.reset();
            session = id;
            lastKey = key;
          }
          if (w != null && rpm != null) {
            if (previous) {
              const dt = (stamp - previous.at) / 1000;
              if (dt > 0 && dt <= 2.5) rideSeconds += dt;
            }
            const moving = w >= 5 || rpm >= 3;
            if (!start && moving) {
              start = stamp;
              baseCalories = cal;
            }
            rows.push({
              at: stamp,
              w,
              rpm,
              cal,
              elapsed,
              hr: finite(t.heartRate, 25, 240),
              drag: finite(t.dragFactor, 1, 250),
              moving
            });
            rows = rows.filter((x) => stamp - x.at <= 90000);
            previous = rows.at(-1);
          }
        }
        if (!live && lastResult)
          return {
            ...lastResult,
            live: false,
            note: input.paused ? 'PAUSED · TARGETS HELD' : 'WAITING FOR LIVE DATA · TARGETS HELD'
          };
        const effort = goal.intensity,
          ftp = p.ftpWatts || null,
          valid = rows.filter((x) => x.moving && x.w >= 20 && x.rpm >= 40),
          recent = valid.filter((x) => now - x.at <= 30000),
          baseline = frozenBaseline || median(valid.map((x) => x.w)),
          cadencePresets = { easy: [60, 75], steady: [65, 90], challenging: [75, 95] },
          powerFractions = { easy: [0.45, 0.6], steady: [0.6, 0.75], challenging: [0.8, 0.9] },
          hrFractions = { easy: [0.45, 0.6], steady: [0.6, 0.7], challenging: [0.7, 0.8] },
          cf = powerFractions[effort],
          hf = hrFractions[effort];
        if (!frozenBaseline && rideSeconds >= 30 && valid.length >= 10 && baseline)
          frozenBaseline = baseline;
        let reference =
            ftp ||
            (finite(input.referenceWatts, 20, 1000)
              ? input.referenceWatts / 0.675
              : baseline
                ? baseline / 0.675
                : null),
          middle = reference ? ((cf[0] + cf[1]) / 2) * reference : null;
        const elapsed = rideSeconds,
          latest = rows.at(-1),
          burned =
            baseCalories != null && latest?.cal != null
              ? Math.max(0, latest.cal - baseCalories)
              : null,
          remaining = goal.durationMinutes * 60 - elapsed;
        let phase =
            elapsed < Math.min(120, goal.durationMinutes * 60 * 0.15)
              ? 'warmup'
              : remaining < Math.min(120, goal.durationMinutes * 60 * 0.15)
                ? 'cooldown'
                : 'work',
          pace = 'intensity',
          desired = middle,
          calibration = false,
          achieved = false,
          projected = null,
          required = null;
        if (goal.mode === 'calories') {
          achieved = burned != null && burned >= goal.calories;
          const usable = rows.filter((x) => x.cal != null),
            first = usable[0],
            last = usable.at(-1),
            span = first && last ? (last.at - first.at) / 1000 : 0;
          const continuous =
            usable.length > 1 && usable.every((x, i) => !i || x.at - usable[i - 1].at <= 2500);
          const dc = first && last ? last.cal - first.cal : 0,
            average = median(usable.filter((x) => x.moving).map((x) => x.w));
          if (continuous && span >= 30 && dc >= 3 && average >= 20) {
            const rate = dc / span;
            projected = burned + rate * Math.max(0, remaining);
            required =
              remaining > 0 && burned != null
                ? (average * Math.max(0, goal.calories - burned)) / remaining / rate
                : null;
            if (required != null) {
              const anchor = middle || average,
                ceiling = reference ? reference * cf[1] : anchor * 1.15;
              desired = clamp(required, Math.max(20, anchor * 0.55), Math.max(20, ceiling));
              pace =
                required > ceiling
                  ? 'extend'
                  : projected >= goal.calories * 0.95
                    ? 'on-pace'
                    : 'adjusting';
            }
          } else {
            calibration = true;
            pace = 'calibrating';
          }
          if (achieved) {
            phase = 'goal-reached';
            pace = 'goal-reached';
            desired = reference ? reference * 0.45 : baseline ? baseline * 0.65 : null;
          } else if (remaining <= 0) {
            phase = 'time-complete';
            pace = 'extend';
            desired = middle;
          }
        }
        if (!achieved && phase === 'warmup' && desired != null)
          desired *=
            0.7 +
            Math.min(1, elapsed / Math.max(30, Math.min(120, goal.durationMinutes * 60 * 0.15))) *
              0.2;
        if (!achieved && phase === 'cooldown' && desired != null)
          desired = Math.min(desired, middle ? middle * 0.7 : desired);
        let hrMin = 0,
          hrMax = 0;
        if (p.maxHr && p.restingHr) {
          const reserve = p.maxHr - p.restingHr;
          const f =
            phase === 'warmup' || phase === 'cooldown' || phase === 'goal-reached'
              ? [0.4, 0.55]
              : hf;
          hrMin = Math.round(p.restingHr + reserve * f[0]);
          hrMax = Math.round(p.restingHr + reserve * f[1]);
        } else if (p.maxHr) {
          const f =
            phase === 'warmup' || phase === 'cooldown' || phase === 'goal-reached'
              ? [0.55, 0.65]
              : effort === 'easy'
                ? [0.6, 0.7]
                : effort === 'challenging'
                  ? [0.75, 0.85]
                  : [0.65, 0.75];
          hrMin = Math.round(p.maxHr * f[0]);
          hrMax = Math.round(p.maxHr * f[1]);
        }
        // A calorie deadline never raises the heart-rate range. Above its ceiling, lower output guidance.
        const latestHr = live ? finite(t.heartRate, 25, 240) : null,
          hrLimited = !!(latestHr && hrMax && latestHr > hrMax);
        if (hrLimited && desired != null)
          desired = Math.min(desired, (currentPower || desired) * 0.85);
        if (desired != null) {
          if (currentPower == null) currentPower = desired;
          else if (live && now - lastAdjust >= 5000) {
            const step = Math.min(10, ((now - lastAdjust) / 1000) * 2);
            currentPower += clamp(desired - currentPower, -step, step);
          }
          currentPower = clamp(currentPower, 10, 3000);
          if (live && now - lastAdjust >= 5000) lastAdjust = now;
        }
        const powerMin =
            currentPower == null
              ? 0
              : Math.min(3000, Math.max(10, Math.round(currentPower * 0.92))),
          powerMax = currentPower == null ? 0 : Math.min(3000, Math.round(currentPower * 1.08));
        let [cadenceMin, cadenceMax] = cadencePresets[effort];
        if (['warmup', 'cooldown', 'goal-reached'].includes(phase)) {
          cadenceMin = 60;
          cadenceMax = 75;
        }
        // Local cadence estimate is calibrated at the current drag; never treat a change of gearing as cadence drift.
        const latestDrag = recent.at(-1)?.drag,
          calibrated = recent.filter(
            (x) => latestDrag == null || x.drag == null || Math.abs(x.drag - latestDrag) <= 3
          ),
          constant = median(calibrated.map((x) => x.w / Math.pow(x.rpm, 3)));
        if (
          live &&
          calibrated.length >= 10 &&
          calibrated.at(-1).at - calibrated[0].at >= 10000 &&
          currentPower &&
          constant > 0
        ) {
          const rpm = Math.pow(currentPower / constant, 1 / 3);
          cadenceMin = Math.round(clamp(rpm - 5, 50, 100));
          cadenceMax = Math.round(clamp(rpm + 5, cadenceMin + 1, 110));
        }
        const result = {
          schemaVersion: 1,
          elapsedSeconds: elapsed,
          goal,
          source:
            goal.mode === 'calories'
              ? 'calorie-pacing'
              : ftp
                ? 'intensity-ftp'
                : reference
                  ? 'intensity-observed'
                  : 'intensity-calibrating',
          phase,
          powerMin,
          powerMax,
          hrMin,
          hrMax,
          cadenceMin,
          cadenceMax,
          live,
          hrLimited,
          calibration: calibration || !reference,
          caloriesObserved: burned,
          projectedCalories: projected,
          requiredWatts: required,
          pace,
          goalReached: achieved,
          profileNeeded: !p.maxHr,
          powerBasis: ftp ? 'FTP' : input.referenceWatts ? 'previous ride' : 'observed effort',
          note: hrLimited
            ? 'HEART RATE ABOVE RANGE · EASE EFFORT'
            : pace === 'extend'
              ? 'KEEP THE INTENSITY · ALLOW MORE TIME'
              : pace === 'goal-reached'
                ? 'CALORIE GOAL REACHED · EASY FINISH'
                : pace === 'calibrating'
                  ? 'LEARNING YOUR PM5 CALORIE PACE'
                  : !reference
                    ? 'PEDAL COMFORTABLY · CALIBRATING POWER'
                    : phase === 'warmup'
                      ? 'WARM UP · TARGETS RISE GRADUALLY'
                      : phase === 'cooldown'
                        ? 'EASY FINISH · TARGETS LOWER'
                        : goal.mode === 'calories'
                          ? 'CALORIE PACE · SMOOTH ADJUSTMENTS'
                          : effort.toUpperCase() + ' INTENSITY · HOLD YOUR RHYTHM'
        };
        lastResult = result;
        return result;
      }
    };
  }
  root.NonZeroGoals = { normalize, profile, create };
  if (typeof module !== 'undefined') module.exports = root.NonZeroGoals;
})(typeof globalThis !== 'undefined' ? globalThis : this);
