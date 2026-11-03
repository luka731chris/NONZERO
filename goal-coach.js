(() => {
  'use strict';
  const $ = (id) => document.getElementById(id),
    fmt = (v, n = 0) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(n) : '—');
  let context = {},
    store = { preferences: {}, logs: [] },
    lastSummary = '',
    lastSummaryAt = 0,
    busy = false,
    currentModel = null,
    apiReady = false;
  function text(id, value) {
    const el = $(id);
    if (el && el.textContent !== String(value)) el.textContent = String(value);
  }
  function render() {
    const state = context.getState?.() || {},
      today = NonZeroGoalCoach.date(),
      base = NonZeroGoalCoach.model(state, store.preferences, store.logs, today),
      m = window.NonZeroCoachInsights
        ? NonZeroCoachInsights.enrich(state, store, base, today)
        : base;
    currentModel = m;
    const box = $('goalCoach');
    if (!box) return;
    box.dataset.phase = m.phase;
    const pre = m.phase === 'prepare',
      heal = m.phase === 'heal';
    text(
      'goalCoachPhase',
      pre
        ? 'PERSONAL GOAL · UNDER 220 BY ' +
            new Date(m.surgeryDate + 'T12:00:00Z')
              .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
              .toUpperCase()
        : heal
          ? 'RECOVERY FIRST · ROAD TO 185'
          : 'NEXT MILESTONE · ROAD TO 185'
    );
    text('goalCoachIdentity', m.identity);
    text(
      'goalGapValue',
      heal
        ? 'HEAL'
        : m.goalMet
          ? 'GOAL MET'
          : m.remaining == null
            ? 'WEIGH IN'
            : fmt(m.remaining, 1) + ' LB'
    );
    text(
      'goalGapLabel',
      heal
        ? 'CARE-TEAM PLAN LEADS'
        : pre
          ? 'TO YOUR SUB-220 TARGET'
          : 'TO ' + fmt(m.next) + ' LB · THEN THE NEXT FIVE'
    );
    text(
      'goalGapContext',
      heal
        ? 'Food, prescribed PT and recovery are the targets now.'
        : !m.fresh
          ? 'A fresh weight unlocks your trajectory.'
          : (m.confirmed
              ? '7-day avg '
              : 'Provisional · ' +
                m.coverage +
                ' reading' +
                (m.coverage === 1 ? '' : 's') +
                ' · ') +
            fmt(m.basis, 1) +
            ' lb' +
            (pre ? ' · ' + m.days + ' days remaining' : '')
    );
    let budget, caption, note;
    if (heal) {
      budget = 'FUEL HEALING';
      caption = 'DEFICIT PROMPTS PAUSED';
      note = 'Resume only after care-team clearance is recorded.';
    } else if (m.goalMet) {
      budget = pre ? 'HOLD STEADY' : 'MAINTAIN';
      caption = pre
        ? 'TARGET REACHED · STAY NOURISHED'
        : '185 · PROTECT YOUR STRENGTH';
      note = 'Do not keep cutting to chase a lower number.';
    } else if (!m.fresh) {
      budget = 'FRESH DATA';
      caption = 'CURRENT WEIGHT NEEDED';
      note = 'Old readings do not produce a calorie target.';
    } else if (m.basis <= (pre ? m.preGoal : m.finalGoal)) {
      budget = 'CONFIRM TREND';
      caption = 'TARGET RANGE · BUILD THE TREND';
      note = 'Record weight on three separate days to confirm the milestone.';
    } else if (m.lowFuel) {
      budget = 'REVIEW FUELING';
      caption = 'LOGGED INTAKE BELOW APP GUARDRAIL';
      note = 'No deeper deficit is suggested. Review intake, recovery and your clinician’s plan.';
    } else if (m.fast) {
      budget = 'REVIEW PACE';
      caption = 'RECENT LOSS >2 LB / WEEK';
      note = 'Protect fueling and recovery; no automatic deeper cut.';
    } else if (m.deadlineTooFast) {
      budget = m.plannedDeficit != null ? '~' + fmt(m.plannedDeficit) + ' KCAL' : 'STEADY PACE';
      caption = 'APP PLANNING CAP · ALLOW MORE TIME';
      note =
        'The deadline pace is outside guardrails. Review the personal surgery goal with your team.';
    } else if (m.intakeTarget != null) {
      budget = fmt(m.intakeTarget) + ' KCAL';
      caption = 'DAILY INTAKE PLANNING TARGET';
      note =
        'Maintenance estimate ' +
        fmt(m.preferences.maintenanceCalories) +
        ' − ' +
        fmt(m.plannedDeficit) +
        ' kcal. No PM5 food credit.';
    } else {
      budget = '~' + fmt(m.plannedDeficit) + ' KCAL';
      caption = 'DAILY DEFICIT · PLANNING ESTIMATE';
      note = 'Set/review maintenance in the QR check-in to show an intake target.';
    }
    if (m.avgIntake != null && m.intakeTarget != null)
      note =
        'Logged avg ' +
        fmt(m.avgIntake) +
        ' kcal · ' +
        m.loggedIntakeDays +
        '/7 days. Modeled gap ~' +
        fmt(m.estimatedLoggedGap) +
        ' kcal/day; not measured.';
    if (m.limited && !m.deadlineTooFast && m.plannedDeficit != null)
      note =
        'Current guardrails limit the estimate. Allow more time; do not compensate with extra exercise.';
    text('goalCalorieValue', budget);
    text('goalCalorieLabel', caption);
    text('goalCalorieNote', note);
    const protectedCue = heal || !m.fresh || m.fast || m.lowFuel || m.declining || m.goalMet;
    text('goalNextAction', !protectedCue && m.behaviorPlan ? m.behaviorPlan.cue : m.cue);
    text('goalActionWhy', !protectedCue && m.behaviorPlan ? m.behaviorPlan.why : m.detail);
    if (m.milestoneMet != null && m.phase === 'rebuild' && !m.fast && !m.lowFuel && !m.declining) {
      text('goalCoachIdentity', fmt(m.milestoneMet) + ' LB MILESTONE · KEEP BUILDING');
      text(
        'goalActionWhy',
        (m.behaviorPlan?.reward || 'Mark the milestone with a nonfood reward') +
          '. Then repeat the process for ' +
          fmt(m.next) +
          ' lb.'
      );
    }
    text(
      'goalActionProgress',
      m.completedActions + '/3 ACTIONS LOGGED TODAY · ' + m.loggedDays + ' DAYS LOGGED / LAST 7'
    );
    text('goalCoachReset', m.reset);
    text(
      'goalStrengthSignal',
      heal
        ? 'NOURISH · REHAB · RECOVER'
        : m.declining
          ? 'STRENGTH REPORTED DOWN · DEFICIT REDUCED'
          : m.preferences.strengthStatus === 'improving'
            ? 'STRENGTH REPORTED UP · KEEP THE PROCESS'
            : m.preferences.strengthStatus === 'stable'
              ? 'STRENGTH REPORTED STABLE'
              : 'TRACK STRENGTH · SCALE LOSS ≠ MUSCLE GAIN'
    );
    if (Math.floor(Date.now() / 15000) % 3 === 2) text('goalStrengthSignal', m.reset);
    if (m.strengthTrend?.status !== 'unknown' && m.strengthTrend?.trends?.length) {
      const tr = m.strengthTrend.trends[0];
      text(
        'goalStrengthSignal',
        'COMPARABLE STRENGTH ' +
          (tr.deltaPercent >= 0 ? '+' : '') +
          fmt(tr.deltaPercent, 1) +
          '% · ' +
          tr.movement.toUpperCase()
      );
    }
    if (m.calibration?.forecastWeeks)
      text(
        'goalGapContext',
        fmt(m.basis, 1) +
          ' LB AVG · OBSERVED NEXT TARGET ~' +
          m.calibration.forecastWeeks.join('–') +
          ' WEEKS'
      );
    text(
      'goalLongTerm',
      heal
        ? 'After clearance: five-pound milestones to 185'
        : m.phase === 'rebuild' && m.goalWeeks
          ? '185: about ' +
            m.goalWeeks[0] +
            '–' +
            m.goalWeeks[1] +
            ' weeks after clearance; slower near goal and if strength falls.'
          : 'Now: arrive nourished. Later: five-pound milestones to 185.'
    );
    const rail = $('goalRoadFill');
    if (rail) rail.style.width = m.progress + '%';
    text('goalRoadLabel', fmt(m.progress) + '% OF THE ROAD TO 185');
    const pills = $('goalActionDots');
    if (pills)
      Array.from(pills.children).forEach((el, i) => {
        el.dataset.done = String(m.actions[i]);
        el.textContent =
          (m.actions[i] ? '✓ ' : '○ ') +
          ['PLAN THE MEAL', 'PROTEIN AT MEALS', heal ? 'PRESCRIBED PT' : 'SAFE MOVEMENT'][i];
      });
    if ($('coachApiStatus'))
      text(
        'coachApiStatus',
        apiReady ? 'SCAN FOR A 20-SECOND CHECK-IN' : 'CHECK-IN CONNECTION UNAVAILABLE'
      );
    if (context.onModel) context.onModel(m);
    if (apiReady) {
      const summary = {
        date: today,
        phase: m.phase,
        surgeryDate: m.surgeryDate,
        days: m.days,
        basis: m.basis,
        confirmed: m.confirmed,
        next: m.next,
        remaining: m.remaining,
        finalGoal: m.finalGoal,
        plannedDeficit: m.plannedDeficit,
        intakeTarget: m.intakeTarget,
        cue: m.cue,
        identity: m.identity,
        coverage: m.coverage,
        fresh: m.fresh,
        strength: m.preferences.strengthStatus,
        avgIntake: m.avgIntake,
        loggedIntakeDays: m.loggedIntakeDays,
        estimatedLoggedGap: m.estimatedLoggedGap
      };
      const signature = JSON.stringify(summary);
      if (signature !== lastSummary || Date.now() - lastSummaryAt >= 60000) {
        lastSummary = signature;
        lastSummaryAt = Date.now();
        fetch('/api/coaching', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'context', value: { ...summary, generatedAt: Date.now() } })
        })
          .then((r) => {
            if (!r.ok) lastSummary = '';
          })
          .catch(() => {
            lastSummary = '';
          });
      }
    }
  }
  async function refresh() {
    if (busy) return;
    busy = true;
    try {
      const r = await fetch('/api/coaching', {
        cache: 'no-store',
        signal: AbortSignal.timeout(4000)
      });
      if (!r.ok) throw Error('Coach ' + r.status);
      store = await r.json();
      apiReady = true;
      render();
    } catch {
      apiReady = false;
      render();
    } finally {
      busy = false;
    }
  }
  window.NonZeroGoalCoachUI = {
    attach(value) {
      context = value || {};
      void refresh();
      setInterval(refresh, 5000);
      render();
      fetch('/api/coaching/link')
        .then((r) => r.json())
        .then((x) => {
          const link = $('goalCoachOpen');
          if (link && x.url) {
            link.href = x.url;
            link.title = x.url;
          }
        })
        .catch(() => {});
    },
    render,
    snapshot: () => currentModel
  };
})();
