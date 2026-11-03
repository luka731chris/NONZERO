(function (root) {
  'use strict';
  const finite = (x) => typeof x === 'number' && Number.isFinite(x),
    median = (a) => {
      a = [...a].sort((x, y) => x - y);
      return a.length
        ? (a[Math.floor((a.length - 1) / 2)] + a[Math.ceil((a.length - 1) / 2)]) / 2
        : null;
    },
    day = (s) => NonZeroGoalCoach.day(s),
    clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function strength(rows, today) {
    const groups = new Map();
    for (const r of Array.isArray(rows) ? rows : []) {
      if (
        !r ||
        r.deleted ||
        !Number.isFinite(day(r.date)) ||
        r.date > today ||
        day(today) - day(r.date) > 90 ||
        !r.movement ||
        !r.variation ||
        !['external', 'bodyweight'].includes(r.mode) ||
        !finite(r.reps) ||
        !finite(r.rpe) ||
        !finite(r.pain) ||
        r.pain > 3 ||
        r.rpe < 7 ||
        r.rpe > 9 ||
        r.reps < 1 ||
        r.reps > 12 ||
        (r.mode === 'external' && !(r.loadLb > 0))
      )
        continue;
      const key = [r.movement.trim().toLowerCase(), r.variation.trim().toLowerCase(), r.mode].join(
        '|'
      );
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    const trends = [];
    for (const [key, all] of groups) {
      const dates = new Map();
      for (const r of all.sort((a, b) => Number(a.updatedAt || 0) - Number(b.updatedAt || 0)))
        dates.set(r.date, r);
      const rr = [...dates.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-4);
      if (
        rr.length < 4 ||
        day(rr.at(-1).date) - day(rr[0].date) < 14 ||
        day(today) - day(rr.at(-1).date) > 14
      )
        continue;
      const old = rr.slice(0, 2),
        recent = rr.slice(2);
      if (Math.abs(median(old.map((x) => x.rpe)) - median(recent.map((x) => x.rpe))) > 1) continue;
      const metric = (r) => (r.mode === 'bodyweight' ? r.reps : r.loadLb * (1 + r.reps / 30)),
        before = median(old.map(metric)),
        after = median(recent.map(metric)),
        delta = (after / before - 1) * 100;
      trends.push({
        key,
        movement: rr[0].movement,
        variation: rr[0].variation,
        mode: rr[0].mode,
        deltaPercent: delta,
        before,
        after,
        date: rr.at(-1).date,
        count: rr.length,
        status: delta <= -5 ? 'declining' : delta >= 3 ? 'improving' : 'stable'
      });
    }
    return {
      status: trends.some((x) => x.status === 'declining')
        ? 'declining'
        : trends.some((x) => x.status === 'improving')
          ? 'improving'
          : trends.length
            ? 'stable'
            : 'unknown',
      trends,
      note: 'Comparable set index, not muscle mass. Four separate dates over ≥14 days; RPE 7–9, pain ≤3, matching variation. Bodyweight repetitions remain separate.'
    };
  }
  function calibration(state, store, m, today) {
    const weights = NonZeroGoalCoach.weights(state, today).filter(
        (r) =>
          day(today) - day(r.date) < 42 &&
          (m.phase === 'prepare' || r.date >= (m.preferences.clearanceDate || today))
      ),
      logs = (store.logs || []).filter(
        (r) =>
          r &&
          (r.intakeSource !== 'noom' || r.intakeComplete === true) &&
          r.intakeComplete !== false &&
          Number.isFinite(day(r.date)) &&
          r.date <= today &&
          day(today) - day(r.date) < 42 &&
          finite(r.intakeCalories) &&
          r.intakeCalories >= 0 &&
          r.intakeCalories <= 6000 &&
          (m.phase === 'prepare' || r.date >= (m.preferences.clearanceDate || today))
      ),
      byDate = new Map(logs.map((x) => [x.date, x]));
    const span = weights.length ? day(weights.at(-1).date) - day(weights[0].date) : 0,
      reason =
        m.phase === 'heal'
          ? 'Recovery nutrition leads. Trend adjustments are paused.'
          : !m.fresh
            ? 'Add a fresh weight before reviewing a plan.'
            : weights.length < 12 || span < 21 || byDate.size < 14
              ? 'Build ≥21 days with 12 weights and 14 known daily intake totals.'
              : m.fast || m.lowFuel || m.declining
                ? 'Review fueling and strength with your care team before changing the plan.'
                : null;
    if (reason)
      return { eligible: false, reason, weightDays: weights.length, intakeDays: byDate.size, span };
    // Require intake and weight coverage across the period, not 14 days from a different month.
    const start = day(weights[0].date),
      end = day(weights.at(-1).date),
      windowLogs = [...byDate.values()].filter((r) => day(r.date) >= start && day(r.date) <= end),
      early = windowLogs.filter((r) => day(r.date) < start + 7),
      late = windowLogs.filter((r) => day(r.date) > end - 7);
    if (windowLogs.length < 14 || early.length < 4 || late.length < 4)
      return {
        eligible: false,
        reason: 'Log known intake across both ends of the weight-trend period.',
        weightDays: weights.length,
        intakeDays: windowLogs.length,
        span
      };
    const slopes = [];
    for (let i = 0; i < weights.length; i++)
      for (let j = i + 1; j < weights.length; j++) {
        const days = day(weights[j].date) - day(weights[i].date);
        if (days >= 7) slopes.push(((weights[i].weightLb - weights[j].weightLb) * 7) / days);
      }
    slopes.sort((a, b) => a - b);
    const loss = median(slopes),
      uncertainty = Math.max(
        0.2,
        (slopes[Math.floor(slopes.length * 0.8)] - slopes[Math.floor(slopes.length * 0.2)]) / 2
      ),
      range = [loss - uncertainty, loss + uncertainty];
    if (windowLogs.some((l) => l.intakeCalories < 1800))
      return {
        eligible: false,
        reason:
          'Review lower logged intake and data completeness with your care team before a trend-based adjustment.',
        weightDays: weights.length,
        intakeDays: windowLogs.length,
        span
      };
    const avgIntake = windowLogs.reduce((n, l) => n + l.intakeCalories, 0) / windowLogs.length,
      estimate = avgIntake + loss * 500,
      maintenance = m.preferences.maintenanceCalories,
      proposed =
        maintenance == null
          ? null
          : Math.round((maintenance + clamp(estimate - maintenance, -100, 100)) / 25) * 25;
    const recentReview = (store.reviews || []).some(
        (r) => r && day(today) - day(r.date) >= 0 && day(today) - day(r.date) < 7
      ),
      stable = range[0] > 0.1 && loss <= 2,
      remaining =
        m.phase === 'prepare' ? Math.max(0, m.basis - m.preGoal) : Math.max(0, m.basis - m.next),
      forecast = stable ? [Math.ceil(remaining / range[1]), Math.ceil(remaining / range[0])] : null;
    const eligible =
      estimate >= 1800 &&
      estimate <= 5000 &&
      Math.abs(loss) <= 2 &&
      !recentReview &&
      maintenance != null &&
      proposed >= 1800 &&
      proposed <= 5000;
    const id =
      'review_' +
      today +
      '_' +
      Math.round(estimate) +
      '_' +
      windowLogs.length +
      '_' +
      weights.length;
    return {
      eligible,
      reason: recentReview
        ? 'A plan review was recorded in the last seven days.'
        : maintenance == null
          ? 'Set an individual maintenance estimate first; the observed range is not a prescription.'
          : !eligible
            ? 'The trend is outside review guardrails. Check data and your care-team plan.'
            : 'Review this estimate; nothing changes until you apply it.',
      weightDays: weights.length,
      intakeDays: windowLogs.length,
      span,
      lossPerWeek: loss,
      range,
      forecastWeeks: forecast,
      observedMaintenance: estimate,
      proposedMaintenance: eligible ? proposed : null,
      proposalId: id,
      note: 'Empirical planning range, not a confidence interval or metabolic measurement. Logged intake and scale changes can be biased; the 3,500-kcal conversion is approximate. Changes are limited to 100 kcal/day per weekly review.'
    };
  }
  function behavior(store, m, state, today) {
    const p = store.behavior || {},
      focus = ['meal', 'protein', 'movement'].includes(p.focus) ? p.focus : 'meal',
      anchor = ['breakfast', 'lunch', 'dinner', 'calendar'].includes(p.anchor)
        ? p.anchor
        : 'dinner',
      row = (store.logs || []).find((x) => x?.date === today) || {},
      label = {
        meal: 'plan and plate the next meal',
        protein: 'include a protein source at your next meal',
        movement:
          m.phase === 'heal'
            ? 'follow your prescribed PT dose'
            : 'follow your comfortable, approved movement plan'
      }[focus],
      days = (store.logs || []).filter(
        (x) => x && day(today) - day(x.date) >= 0 && day(today) - day(x.date) < 7
      ),
      key = { meal: 'mealPlanned', protein: 'proteinMeals', movement: 'movement' }[focus],
      done = days.filter((x) => x[key] || x.focusDone).length;
    let cue = 'After ' + anchor + ', ' + label + '.';
    if (anchor === 'calendar') {
      let opportunity = null;
      try {
        opportunity = root.NonZeroSuite?.opportunity?.(state?.autopilotAgenda);
      } catch {}
      cue =
        (opportunity?.known && opportunity.minutes >= 10
          ? 'In your available ' +
            Math.min(45, Math.round(opportunity.minutes)) +
            '-minute calendar window, '
          : 'At your next planned break, ') +
        label +
        '.';
    }
    const fallback =
      typeof p.fallback === 'string' && p.fallback.trim()
        ? p.fallback
        : 'Prepare one small next step; resume at the next meal or approved activity window.';
    if (row.barrier === 'pain')
      cue =
        'Follow your care-team restrictions today. Choose the food-planning commitment instead of adding movement.';
    else if (row.barrier === 'time' || row.feedback === 'too_much')
      cue = 'Busy-day fallback: ' + fallback;
    else if (row.barrier === 'forgot' || row.feedback === 'change_cue')
      cue =
        'Put the cue where you will see it before ' +
        (anchor === 'calendar' ? 'your next break' : anchor) +
        '. Then ' +
        label +
        '.';
    return {
      focus,
      anchor,
      cue,
      why:
        p.why || 'Arrive prepared for surgery, then build a stronger road to 185.',
      fallback,
      reward: p.reward || 'Choose a meaningful nonfood reward for your next confirmed milestone.',
      completedDays: done,
      loggedDays: days.length,
      trend:
        done >= 5
          ? 'Your chosen action is becoming consistent.'
          : days.length >= 3
            ? 'Keep the next step small enough to repeat.'
            : 'Build a record of follow-through, one day at a time.'
    };
  }
  function enrich(state, store, m, today) {
    const phaseRows =
      m.phase === 'prepare'
        ? store.strength
        : (store.strength || []).filter(
            (x) => x?.date >= (m.preferences.clearanceDate || m.surgeryDate)
          );
    const s = strength(phaseRows, today);
    if (m.phase !== 'prepare')
      s.note += ' Current-phase comparisons restart after surgery; older sets remain in history.';
    if (s.status === 'declining' && !m.declining)
      m = NonZeroGoalCoach.model(
        state,
        { ...store.preferences, strengthStatus: 'declining' },
        store.logs,
        today
      );
    return {
      ...m,
      strengthTrend: s,
      calibration: calibration(state, store, m, today),
      behaviorPlan: behavior(store, m, state, today)
    };
  }
  root.NonZeroCoachInsights = { strength, calibration, behavior, enrich };
  if (typeof module !== 'undefined') module.exports = root.NonZeroCoachInsights;
})(typeof globalThis !== 'undefined' ? globalThis : this);
