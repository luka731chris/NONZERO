(function (root) {
  'use strict';
  const PROFILE = JSON.parse('{"edition":"personal","primaryName":"Chris","partnerName":"Sam","partnerAge":16,"surgeryDate":"2026-11-20","recoveryLabel":"RIGHT HIP","preSurgeryTargetLb":220,"goalWeightLb":185,"baselineWeightLb":227.1,"baselineDate":"2026-10-17","seedMeasurements":[{"id":"reported-withings-2026-10-17","date":"2026-10-17","weightLb":227.1,"source":"withings-reported","at":1792195200000}]}');
  const DAY = 86400000,
    finite = (x) => typeof x === 'number' && Number.isFinite(x),
    clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function day(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return NaN;
    const d = new Date(s + 'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s
      ? d.getTime() / DAY
      : NaN;
  }
  function date(now = Date.now()) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(now));
  }
  function mean(rows) {
    return rows.length ? rows.reduce((s, r) => s + r.weightLb, 0) / rows.length : null;
  }
  function weights(state, today) {
    const map = new Map(),
      health = (Array.isArray(state?.pm5Analytics?.health) ? state.pm5Analytics.health : [])
        .filter((x) => x?.type === 'HKQuantityTypeIdentifierBodyMass' && finite(x.at))
        .map((x) => ({
          date: date(x.at),
          weightLb: x.unit === 'kg' ? x.value / 0.45359237 : x.unit === 'lb' ? x.value : null,
          at: x.at
        }));
    for (const r of [
      ...health,
      ...(Array.isArray(state?.bodyMeasurements) ? state.bodyMeasurements : [])
    ]
      .filter(
        (r) =>
          r &&
          finite(day(r.date)) &&
          r.date <= today &&
          finite(Number(r.weightLb)) &&
          Number(r.weightLb) >= 50 &&
          Number(r.weightLb) <= 700
      )
      .sort((a, b) => Number(a.at || 0) - Number(b.at || 0)))
      map.set(r.date, { ...r, weightLb: Number(r.weightLb) });
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  function config(input = {}) {
    const maintenance = Number(input.maintenanceCalories);
    return {
      maintenanceForRecovery: input.maintenanceForRecovery === true,
      maintenanceCalories:
        finite(maintenance) && maintenance >= 1800 && maintenance <= 5000 ? maintenance : null,
      weeklyRate: clamp(Number(input.weeklyRate) || 1, 0.5, 1.5),
      nutritionCleared: input.nutritionCleared === true,
      trainingCleared: input.trainingCleared === true,
      clearanceDate: finite(day(input.clearanceDate)) ? input.clearanceDate : null,
      strengthStatus: ['stable', 'improving', 'declining', 'unknown'].includes(input.strengthStatus)
        ? input.strengthStatus
        : 'unknown'
    };
  }
  function model(state = {}, preferences = {}, logs = [], today = date(), now = Date.now()) {
    state = state && typeof state === 'object' ? state : {};
    preferences = preferences && typeof preferences === 'object' ? preferences : {};
    logs = Array.isArray(logs) ? logs : [];
    const p = config(preferences),
      surgeryDate = finite(day(state.surgeryPlan?.date))
        ? state.surgeryPlan.date
        : PROFILE.surgeryDate,
      days = day(surgeryDate) - day(today),
      post = days <= 0,
      clear =
        post &&
        p.nutritionCleared &&
        p.clearanceDate &&
        day(p.clearanceDate) >= day(surgeryDate) &&
        p.clearanceDate <= today,
      since = post ? (clear ? p.clearanceDate : surgeryDate) : null,
      all = weights(state, today).filter((r) => !since || r.date >= since),
      latest = all.at(-1),
      recent = all.filter((r) => day(today) - day(r.date) < 7),
      prior = all.filter((r) => day(today) - day(r.date) >= 7 && day(today) - day(r.date) < 14),
      avg = mean(recent),
      old = mean(prior),
      age = latest ? day(today) - day(latest.date) : null,
      fresh = age != null && age <= 3,
      confirmed = fresh && recent.length >= 3,
      basis = fresh ? (avg ?? latest.weightLb) : null;
    const trainingAllowed =
      post &&
      p.trainingCleared &&
      p.clearanceDate &&
      day(p.clearanceDate) >= day(surgeryDate) &&
      p.clearanceDate <= today;
    if (post && !p.maintenanceForRecovery) p.maintenanceCalories = null;
    const phase = post ? (clear ? 'rebuild' : 'heal') : 'prepare',
      finalGoal = PROFILE.goalWeightLb,
      preGoal = 219.9,
      target = phase === 'prepare' ? preGoal : finalGoal,
      goalMet = confirmed && basis <= target;
    const milestones = [
        225,
        PROFILE.preSurgeryTargetLb,
        215,
        210,
        205,
        200,
        195,
        190,
        PROFILE.goalWeightLb
      ],
      next = basis == null ? null : (milestones.find((v) => basis > v) ?? PROFILE.goalWeightLb),
      remaining =
        basis == null ? null : Math.max(0, basis - (phase === 'prepare' ? preGoal : next)),
      totalRemaining = basis == null ? null : Math.max(0, basis - finalGoal);
    const baseline = Number(state.surgeryPlan?.weightJourney?.baseline) || PROFILE.baselineWeightLb,
      progress =
        basis == null
          ? 0
          : clamp(((baseline - basis) / Math.max(1, baseline - finalGoal)) * 100, 0, 100);
    const observedLoss = confirmed && prior.length >= 3 ? old - avg : null,
      fast = observedLoss != null && observedLoss > 2,
      declining = p.strengthStatus === 'declining',
      slow = observedLoss != null && observedLoss < 0.25;
    let rate = p.weeklyRate;
    if (basis != null && basis < 200) rate = Math.min(rate, 1);
    if (declining || fast) rate = Math.min(rate, 0.5);
    const requiredRate =
        phase === 'prepare' && basis != null && days > 0 ? (remaining * 7) / days : null,
      requiredDeficit = requiredRate == null ? null : requiredRate * 500;
    if (phase === 'prepare' && requiredRate != null && !declining && !fast)
      rate = clamp(requiredRate, 0.5, 1.5);
    const loggedIntakes = logs.filter(
        (l) =>
          (l?.intakeSource !== 'noom' || l.intakeComplete === true) &&
          l?.intakeComplete !== false &&
          day(today) - day(l?.date) >= 0 &&
          day(today) - day(l.date) < 7 &&
          finite(l.intakeCalories) &&
          l.intakeCalories >= 0 &&
          l.intakeCalories <= 6000
      ),
      avgIntake =
        loggedIntakes.length >= 4
          ? loggedIntakes.reduce((n, l) => n + l.intakeCalories, 0) / loggedIntakes.length
          : null;
    const lowFuel = avgIntake != null && avgIntake < 1800 && phase !== 'heal';
    const allowed = phase !== 'heal' && basis != null && basis > target && !fast && !lowFuel;
    let plannedDeficit = allowed ? Math.round(clamp(rate * 500, 250, 750) / 25) * 25 : null;
    if (plannedDeficit != null && p.maintenanceCalories != null)
      plannedDeficit = Math.max(0, Math.min(plannedDeficit, p.maintenanceCalories - 1800));
    const intakeTarget =
      plannedDeficit != null && p.maintenanceCalories != null
        ? p.maintenanceCalories - plannedDeficit
        : null;
    const deadlineTooFast = requiredDeficit != null && requiredDeficit > 750,
      limited =
        requiredDeficit != null && plannedDeficit != null && requiredDeficit > plannedDeficit + 25;
    const todayLog = logs.find((l) => l?.date === today) || {},
      done = [
        todayLog.mealPlanned === true,
        todayLog.proteinMeals === true,
        todayLog.movement === true
      ];
    const sessions = (Array.isArray(state.sessions) ? state.sessions : []).filter(
        (s) =>
          s?.date === today &&
          (s.completed === true || ['complete', 'completed'].includes(s.status))
      ),
      trained = sessions.length > 0,
      hadMovement = trained || done[2];
    if (trained) done[2] = true;
    const hour = Number(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          hourCycle: 'h23'
        }).format(new Date(now))
      ),
      loggedDays = new Set(
        logs
          .filter(
            (l) =>
              day(today) - day(l?.date) >= 0 &&
              day(today) - day(l.date) < 7 &&
              (l.mealPlanned || l.proteinMeals || l.movement)
          )
          .map((l) => l.date)
      ).size;
    let cue, detail, identity;
    if (phase === 'heal') {
      identity = 'HEAL WELL. THE NEXT MILESTONE CAN WAIT.';
      cue = !done[1]
        ? 'Include a protein source in your next meal.'
        : !hadMovement
          ? 'Follow today’s prescribed PT and walking dose.'
          : 'Protect recovery. Prepare your next nourishing meal.';
      detail =
        'Follow your surgical nutrition plan. Fluid shifts can move the scale; recovery actions are today’s win.';
    } else if (goalMet) {
      identity =
        phase === 'prepare'
          ? 'YOUR PERSONAL TARGET IS MET. ARRIVE NOURISHED.'
          : '185 REACHED. MAINTAIN AND BUILD STRENGTH.';
      cue = 'Keep regular meals and your approved training or recovery routine.';
      detail = 'Maintain the trend. Extra restriction is not needed to earn progress.';
    } else if (!fresh) {
      identity = 'A CURRENT READING MAKES THE PLAN USEFUL.';
      cue = 'Add a fresh weight in the NONZERO phone app.';
      detail = 'No calorie or deadline target is calculated from an outdated weight.';
    } else if (fast) {
      identity = 'PROTECT THE MUSCLE YOU ARE BUILDING.';
      cue = 'Review the recent pace before tightening food further.';
      detail =
        'Your recorded average is falling over 2 lb/week. Check fueling, recovery and your clinician’s plan.';
    } else if (lowFuel) {
      identity = 'FUEL THE PERSON YOU ARE BUILDING.';
      cue = 'Review your logged intake and recovery before cutting further.';
      detail =
        'The logged average is below this app’s planning guardrail. Discuss your nutrition target with your care team.';
    } else if (declining) {
      identity = 'A STRONGER BODY IS PART OF THE GOAL.';
      cue = 'Keep protein at meals and protect your planned recovery.';
      detail =
        'Strength was reported down. The planning deficit is reduced; review fatigue and training with your care team.';
    } else if (!done[0]) {
      identity =
        phase === 'prepare'
          ? 'ARRIVE READY. WIN THE NEXT DECISION.'
          : '185 IS BUILT FIVE POUNDS AT A TIME.';
      cue =
        hour < 12
          ? 'Before lunch, choose the meal and portion.'
          : 'Before your next meal, decide the serving and plate it.';
      detail = 'Make the decision before hunger gets the vote. Put the remaining food away.';
    } else if (!done[1]) {
      identity = 'FUEL THE STRENGTH YOU WANT TO KEEP.';
      cue = 'Include a protein source in your next planned meal.';
      detail =
        'A meal plan and adequate protein support consistency. Ask your care team for an individual protein target.';
    } else if (!hadMovement) {
      identity = 'SMALL ACTIONS. REPEATED ON PURPOSE.';
      cue =
        phase === 'prepare'
          ? 'After a meal: 5–10 minutes of easy BikeErg, if comfortable.'
          : 'Use your approved movement plan today.';
      detail =
        phase === 'prepare'
          ? 'Stay within your hip tolerance and existing restrictions. This is a cue, not a calorie debt to repay.'
          : trainingAllowed
            ? 'Keep the next planned strength session; no make-up workouts.'
            : 'Resistance training still needs its own care-team clearance.';
    } else {
      identity = 'YOU FOLLOWED THROUGH. MAKE TOMORROW EASIER.';
      cue = 'Prepare tomorrow’s first meal choice and protect bedtime.';
      detail =
        'Today’s actions count. Extra restriction or exercise is not needed to earn the win.';
    }
    return {
      schemaVersion: 1,
      date: today,
      phase,
      surgeryDate,
      days,
      trainingAllowed: !!trainingAllowed,
      preferences: p,
      baseline,
      finalGoal,
      preGoal,
      next,
      remaining,
      totalRemaining,
      basis,
      latest,
      avg,
      coverage: recent.length,
      age,
      fresh,
      confirmed,
      goalMet,
      progress,
      observedLoss,
      fast,
      slow,
      declining,
      lowFuel,
      requiredRate,
      requiredDeficit,
      deadlineTooFast,
      limited,
      plannedDeficit,
      intakeTarget,
      avgIntake,
      loggedIntakeDays: loggedIntakes.length,
      estimatedLoggedGap:
        avgIntake != null && p.maintenanceCalories != null && phase !== 'heal'
          ? p.maintenanceCalories - avgIntake
          : null,
      completedActions: done.filter(Boolean).length,
      actions: done,
      loggedDays,
      cue,
      detail,
      identity,
      milestoneMet:
        confirmed && prior.length >= 3
          ? (milestones.find((v) => old > v && avg <= v) ?? null)
          : null,
      miniWeeks:
        remaining == null || phase === 'heal'
          ? null
          : [Math.ceil(remaining / Math.min(1.5, rate || 1)), Math.ceil(remaining / 0.5)],
      goalWeeks:
        totalRemaining == null || phase === 'heal'
          ? null
          : [
              Math.ceil(
                Math.max(0, basis - 200) / 1.5 +
                  Math.max(0, Math.min(basis, 200) - PROFILE.goalWeightLb)
              ),
              Math.ceil(totalRemaining / 0.5)
            ],
      reset:
        'Missed a choice? Resume at the next meal. No punishment, skipped meals or make-up exercise.',
      calorieNote:
        'Planning estimate, not measured deficit. PM5 calories are not added as food credit.'
    };
  }
  root.NonZeroGoalCoach = { model, config, weights, date, day };
  if (typeof module !== 'undefined') module.exports = root.NonZeroGoalCoach;
})(typeof globalThis !== 'undefined' ? globalThis : this);
