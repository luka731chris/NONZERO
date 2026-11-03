(function (root) {
  'use strict';
  const P = root.NonZeroCoachProtocol,
    G = root.NonZeroGoalCoach,
    I = root.NonZeroCoachInsights;
  function mount(host, adapter, { prefix = '' } = {}) {
    if (!host) return;
    const id = (x) => prefix + x,
      $ = (x) => document.getElementById(id(x)),
      fmt = (n, d = 0) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(d) : '—');
    let shownDay = '',
      prefsDirty = false,
      behaviorDirty = false,
      prefsBase = null,
      behaviorBase = null,
      initial = true,
      model = null,
      disposed = false,
      connectionBusy = false,
      intakeBase = null;
    host.classList.add('coach-app');
    const field = (name, html) => html.replaceAll('$id', id(name));
    host.innerHTML = `<section class="cc-card cc-hero"><div id="${id('phase')}" class="cc-kicker">YOUR CONNECTED GOAL</div><strong id="${id('goal')}">UNDER 220 → RECOVER → 185</strong><p id="${id('cue')}"></p><div class="cc-grid"><div><small>WEIGHT TREND</small><strong id="${id('weight')}">—</strong></div><div><small>CALORIE PLANNING</small><strong id="${id('calories')}">—</strong></div></div><p id="${id('calorieNote')}" class="cc-note"></p><p id="${id('sync')}" class="cc-status" role="status"></p></section>
 <section id="${id('conflict')}" class="cc-card cc-conflict" hidden><h3>Review pending changes</h3><p id="${id('conflictText')}"></p><p>Keep your pending edits, or discard them and use the synced values. Neither choice changes workouts or weight readings.</p><div class="cc-row"><button id="${id('keepMine')}">Keep pending edits</button><button id="${id('useRemote')}">Discard pending edits</button></div></section>
 <section class="cc-card"><h2>Today’s commitments</h2><p id="${id('personalWhy')}"></p>${field('meal', '<label class="cc-check"><input id="$id" type="checkbox"><span>Plan the next meal and portion before eating.</span></label>')}${field('protein', '<label class="cc-check"><input id="$id" type="checkbox"><span>Include protein sources in meals, following your nutrition plan.</span></label>')}${field('movement', '<label class="cc-check"><input id="$id" type="checkbox"><span>Follow comfortable approved activity or prescribed PT.</span></label>')}${field('intake', '<label>Known daily intake · kcal, optional<input id="$id" type="number" min="0" max="6000" placeholder="Leave unknown intake blank"></label>')}<label>Meal-total source<select id="${id('intakeSource')}"><option value="noom">Noom</option><option value="manual">Manual daily total</option><option value="other">Another food log</option></select></label>${field('intakeComplete', '<label class="cc-check"><input id="$id" type="checkbox"><span>This is my complete day’s food-calorie total.</span></label>')}<p id="${id('noomNote')}" class="cc-note"></p><p id="${id('habitProgress')}" class="cc-note"></p><p id="${id('dayStatus')}" class="cc-status" role="status"></p><label>What got in the way?<select id="${id('barrier')}"><option value="none">No barrier recorded</option><option value="time">Time / busy day</option><option value="pain">Pain / restrictions</option><option value="forgot">Forgot the cue</option></select></label><div class="cc-row"><button data-feedback="useful">Useful cue</button><button data-feedback="too_much">Make it smaller</button><button data-feedback="change_cue">Change the cue</button></div><p class="cc-note">An unmarked action means not logged. Missed a choice? Resume at the next meal; no skipped meals or make-up exercise.</p></section>
 <details class="cc-card"><summary>Your behavior plan</summary><form id="${id('behaviorForm')}"><label>Your meal log<select id="${id('mealTracker')}"><option value="noom">Noom</option><option value="other">Another food log</option><option value="none">No meal logging</option></select></label><label>One primary commitment<select id="${id('focus')}"><option value="meal">Meal planning</option><option value="protein">Protein at meals</option><option value="movement">Approved movement / PT</option></select></label><label>Attach it to<select id="${id('anchor')}"><option value="breakfast">After breakfast</option><option value="lunch">After lunch</option><option value="dinner">After dinner</option><option value="calendar">An available AutoPilot calendar window</option></select></label>${field('why', '<label>Why this matters to you<textarea id="$id" maxlength="160" rows="2" placeholder="What will a stronger, healthier life let you do?"></textarea></label>')}${field('fallback', '<label>Your busy-day fallback<textarea id="$id" maxlength="160" rows="2" placeholder="One smaller, safe action you can repeat"></textarea></label>')}${field('reward', '<label>Nonfood reward for the next milestone<input id="$id" maxlength="160" placeholder="Choose something meaningful"></label>')}<button class="primary">Save behavior plan</button><p id="${id('behaviorStatus')}" class="cc-status" role="status"></p></form></details>
 <section class="cc-card"><h2>Strength alongside weight</h2><strong id="${id('strengthHeadline')}">Build a comparable record</strong><p id="${id('strengthNote')}" class="cc-note"></p><div id="${id('strengthTrends')}"></div><details><summary>Log a strength set</summary><form id="${id('strengthForm')}"><p class="cc-note">Record work you actually completed within your care-team restrictions. This form does not prescribe an exercise.</p>${field('strengthDate', '<label>Date<input id="$id" type="date" required></label>')}${field('exercise', '<label>Movement<input id="$id" required maxlength="80" placeholder="e.g. Elevated kettlebell deadlift"></label>')}${field('variation', '<label>Same variation / setup<input id="$id" required maxlength="80" placeholder="e.g. 12-inch blocks, two hands"></label>')}<label>Comparison type<select id="${id('strengthMode')}"><option value="external">External load</option><option value="bodyweight">Bodyweight repetitions</option></select></label><div class="cc-row">${field('load', '<label>External load · lb<input id="$id" type="number" min="0" max="1000" step="0.1" value="0" required></label>')}${field('reps', '<label>Repetitions<input id="$id" type="number" min="1" max="30" value="8" required></label>')}</div><div class="cc-row">${field('rpe', '<label>Effort · RPE 1–10<input id="$id" type="number" min="1" max="10" step="0.5" value="8" required></label>')}${field('pain', '<label>Pain · 0–10<input id="$id" type="number" min="0" max="10" value="0" required></label>')}</div>${field('strengthNotes', '<label>Recovery / technique notes<textarea id="$id" maxlength="240" rows="2"></textarea></label>')}<button class="primary">Save completed set</button><p id="${id('strengthStatus')}" class="cc-status" role="status"></p></form></details><ul id="${id('strengthHistory')}" class="cc-history"></ul></section>
 <section class="cc-card"><h2>Your weekly plan review</h2><p id="${id('reviewStatus')}"></p><div id="${id('reviewNumbers')}" class="cc-grid"></div><p id="${id('forecast')}" class="cc-note"></p><p id="${id('reviewNote')}" class="cc-note"></p><div class="cc-row"><button id="${id('applyReview')}" class="primary" hidden>Apply reviewed estimate</button><button id="${id('dismissReview')}" hidden>Keep current estimate</button></div><p id="${id('reviewFeedback')}" class="cc-status" role="status"></p></section>
 <details class="cc-card"><summary>Plan and recovery settings</summary><form id="${id('preferences')}">${field('maintenance', '<label>Daily maintenance estimate · kcal<input id="$id" type="number" min="1800" max="5000" placeholder="Optional clinician/dietitian estimate"></label>')}<p class="cc-note">Maintenance includes usual activity. PM5 calories are not added as food credit. No intake target is calculated without this estimate. The 1,800-kcal app guardrail is not a universal medical minimum.</p><label>Planning pace after clearance<select id="${id('rate')}"><option value="0.5">0.5 lb/week</option><option value="1">1 lb/week · starting plan</option><option value="1.5">1.5 lb/week · app upper range</option></select></label><label>Your strength report<select id="${id('strength')}"><option value="unknown">Not tracked / unsure</option><option value="improving">Improving</option><option value="stable">Stable</option><option value="declining">Declining / recovery suffering</option></select></label><h3>After surgery</h3>${field('maintenanceRecovery', '<label class="cc-check"><input id="$id" type="checkbox"><span>I reviewed maintenance for current recovery activity.</span></label>')}${field('nutrition', '<label class="cc-check"><input id="$id" type="checkbox"><span>My care team cleared resuming a calorie deficit.</span></label>')}${field('training', '<label class="cc-check"><input id="$id" type="checkbox"><span>My care team separately cleared resistance training, within its restrictions.</span></label>')}${field('clearance', '<label>Date of care-team clearance<input id="$id" type="date"></label>')}<button id="${id('savePreferences')}" class="primary">Save plan settings</button><p id="${id('preferenceStatus')}" class="cc-status" role="status"></p></form><p class="cc-note">Early recovery prioritizes food, prescribed PT and healing. Weight-loss prompts do not restart on a fixed timetable. <a href="https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner" target="_blank" rel="noopener">NIH Body Weight Planner</a></p></details>
 <details id="${id('connectionDetails')}" class="cc-card"><summary>Start and capture confirmation</summary><p id="${id('connectionSummary')}">Open to check the connection chain.</p><div id="${id('connectionSteps')}"></div><p id="${id('connectionNumbers')}" class="cc-note"></p><div class="cc-row"><button id="${id('retry')}">Refresh and retry sync</button><button id="${id('export')}">Export diagnosis</button><button id="${id('exportCoach')}">Export coach history</button></div><p class="cc-note">A held workout can have no current PM5 movement. A live display is not proof of durable recording; this report checks storage separately.</p></details>`;
    const text = (x, v) => {
        if ($(x)) $(x).textContent = v;
      },
      status = (x, v) => text(x, v),
      store = () => adapter.snapshot(),
      state = () => adapter.getState?.() || {};
    function fillDay(s, today) {
      const row = s.logs.find((x) => x.date === today) || {};
      for (const [ui, k] of [
        ['meal', 'mealPlanned'],
        ['protein', 'proteinMeals'],
        ['movement', 'movement']
      ])
        $(ui).checked = row[k] === true;
      if (document.activeElement !== $('intake') || shownDay !== today)
        $('intake').value = row.intakeCalories ?? '';
      $('barrier').value = row.barrier || 'none';
      $('intakeSource').value =
        row.intakeSource ||
        (row.intakeCalories != null ? 'manual' : s.behavior?.mealTracker || 'noom');
      $('intakeComplete').checked =
        row.intakeComplete === true ||
        (row.intakeCalories != null && row.intakeSource !== 'noom' && row.intakeComplete !== false);
      text(
        'noomNote',
        $('intakeSource').value === 'noom'
          ? 'Keep meal details in Noom. Copy food calories consumed, not the remaining budget or exercise-adjusted allowance. Noom totals count toward plan review only after you mark the day complete.'
          : 'Partial totals stay recorded but do not drive calorie-plan reviews. Unlogged days remain unknown.'
      );
      if (shownDay !== today) {
        $('strengthDate').value = today;
        status('dayStatus', '');
      }
      shownDay = today;
    }
    function fillPreferences(s) {
      const p = s.preferences || {};
      prefsBase = P.clone(s.optimisticDoc);
      $('maintenance').value = p.maintenanceCalories ?? '';
      $('rate').value = p.weeklyRate || 1;
      $('strength').value = p.strengthStatus || 'unknown';
      $('maintenanceRecovery').checked = !!p.maintenanceForRecovery;
      $('nutrition').checked = !!p.nutritionCleared;
      $('training').checked = !!p.trainingCleared;
      $('clearance').value = p.clearanceDate || '';
    }
    function fillBehavior(s) {
      const p = s.behavior || {};
      behaviorBase = P.clone(s.optimisticDoc);
      $('mealTracker').value = p.mealTracker || 'noom';
      $('focus').value = p.focus || 'meal';
      $('anchor').value = p.anchor || 'dinner';
      $('why').value = p.why || '';
      $('fallback').value = p.fallback || '';
      $('reward').value = p.reward || '';
    }
    function render() {
      if (disposed) return;
      const s = store(),
        today = G.date();
      model = I.enrich(state(), s, G.model(state(), s.preferences, s.logs, today), today);
      const m = model;
      if (shownDay !== today || initial) fillDay(s, today);
      else fillDay(s, today);
      if (!prefsDirty) fillPreferences(s);
      if (!behaviorDirty) fillBehavior(s);
      initial = false;
      text(
        'phase',
        m.phase === 'prepare'
          ? 'PRE-SURGERY · ' + m.surgeryDate
          : m.phase === 'heal'
            ? 'RECOVERY · FUEL HEALING'
            : 'REBUILD · FIVE POUNDS AT A TIME'
      );
      text(
        'goal',
        m.phase === 'heal'
          ? 'HEAL FIRST · THEN 185'
          : m.goalMet
            ? m.phase === 'prepare'
              ? 'SUB-220 TARGET MET'
              : '185 · MAINTAIN & BUILD'
            : m.remaining == null
              ? 'A FRESH WEIGHT IS NEEDED'
              : fmt(m.remaining, 1) +
                ' LB TO ' +
                (m.phase === 'prepare' ? 'SUB-220' : m.next + ' LB')
      );
      const guard = m.phase === 'heal' || !m.fresh || m.fast || m.lowFuel || m.declining;
      text('cue', guard ? m.cue : m.behaviorPlan.cue);
      text(
        'weight',
        m.basis == null
          ? 'FRESH DATA NEEDED'
          : fmt(m.basis, 1) + ' LB · ' + (m.confirmed ? '7D AVG' : 'PROVISIONAL')
      );
      text(
        'calories',
        m.phase === 'heal'
          ? 'FUEL HEALING'
          : m.goalMet
            ? 'HOLD STEADY'
            : m.fast || m.lowFuel
              ? 'REVIEW FUELING'
              : !m.fresh
                ? 'FRESH DATA NEEDED'
                : m.intakeTarget != null
                  ? fmt(m.intakeTarget) + ' KCAL'
                  : m.plannedDeficit != null
                    ? '~' + fmt(m.plannedDeficit) + ' KCAL DEFICIT'
                    : 'CONFIRM TREND'
      );
      text(
        'calorieNote',
        m.intakeTarget != null
          ? 'Maintenance ' +
              fmt(m.preferences.maintenanceCalories) +
              ' − ' +
              fmt(m.plannedDeficit) +
              ' kcal. Planning estimate, not measured deficit.'
          : m.calorieNote
      );
      const pending = s.pending?.length || 0;
      const sync = s.conflict
        ? 'Review conflicting edits below.'
        : s.error || s.syncError || pending
          ? (s.error || s.syncError || 'Saved locally') +
            ' · ' +
            pending +
            ' change(s) pending shared sync.'
          : adapter.ready?.() === false
            ? 'Local coaching · connect shared sync to use it across devices.'
            : 'Saved · shared coaching up to date.';
      text('sync', sync);
      $('sync').dataset.pending = String(!!pending || !!s.conflict || !!s.error);
      $('conflict').hidden = !s.conflict;
      text('conflictText', s.conflict?.message || 'The same field changed on another device.');
      text('personalWhy', m.behaviorPlan.why);
      text(
        'habitProgress',
        m.behaviorPlan.completedDays +
          ' days followed through / last 7 · ' +
          m.behaviorPlan.trend +
          (m.milestoneMet != null ? ' Reward: ' + m.behaviorPlan.reward : '')
      );
      const strength = m.strengthTrend;
      text(
        'strengthHeadline',
        strength.status === 'unknown'
          ? 'Build a comparable record'
          : strength.status.toUpperCase() + ' · COMPARABLE SET INDEX'
      );
      text('strengthNote', strength.note);
      $('strengthTrends').replaceChildren();
      for (const tr of strength.trends) {
        const p = document.createElement('p');
        p.textContent =
          tr.movement +
          ' · ' +
          tr.variation +
          ' · ' +
          (tr.deltaPercent >= 0 ? '+' : '') +
          fmt(tr.deltaPercent, 1) +
          '% vs earlier comparable sets';
        $('strengthTrends').append(p);
      }
      $('strengthHistory').replaceChildren();
      for (const row of [...s.strength]
        .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt)
        .slice(0, 8)) {
        const li = document.createElement('li'),
          button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Remove';
        button.onclick = () =>
          save(
            'strength',
            row.id,
            {
              ...Object.fromEntries(
                Object.entries(row).filter(([k]) =>
                  [
                    'date',
                    'movement',
                    'variation',
                    'mode',
                    'loadLb',
                    'reps',
                    'rpe',
                    'pain',
                    'notes'
                  ].includes(k)
                )
              ),
              deleted: true
            },
            'strengthStatus'
          );
        li.textContent =
          row.date +
          ' · ' +
          row.movement +
          ' · ' +
          row.variation +
          ' · ' +
          (row.mode === 'external' ? row.loadLb + ' lb × ' : 'bodyweight × ') +
          row.reps +
          ' · RPE ' +
          row.rpe +
          ' · pain ' +
          row.pain;
        li.append(button);
        $('strengthHistory').append(li);
      }
      const c = m.calibration;
      text('reviewStatus', c.reason);
      $('reviewNumbers').replaceChildren();
      if (c.lossPerWeek != null) {
        for (const [label, value] of [
          ['Observed loss / week', fmt(c.lossPerWeek, 2) + ' lb'],
          ['Empirical trend range', fmt(c.range[0], 2) + '–' + fmt(c.range[1], 2) + ' lb/week'],
          ['Current maintenance estimate', fmt(m.preferences.maintenanceCalories) + ' kcal'],
          [
            'Review suggestion',
            c.proposedMaintenance != null
              ? fmt(c.proposedMaintenance) + ' kcal'
              : 'No adjustment suggested'
          ]
        ]) {
          const div = document.createElement('div'),
            small = document.createElement('small'),
            strong = document.createElement('strong');
          small.textContent = label;
          strong.textContent = value;
          div.append(small, strong);
          $('reviewNumbers').append(div);
        }
      }
      text(
        'forecast',
        c.forecastWeeks
          ? 'At the recent observed range: about ' +
              c.forecastWeeks[0] +
              '–' +
              c.forecastWeeks[1] +
              ' weeks to the next target. This is not a deadline or guarantee.'
          : 'No reliable milestone forecast yet. Weight and intake coverage: ' +
              c.weightDays +
              ' / ' +
              c.intakeDays +
              ' days.'
      );
      text(
        'reviewNote',
        c.note ||
          'No plan changes occur automatically. Build a consistent record; perioperative and low-fueling periods do not generate calorie cuts.'
      );
      $('applyReview').hidden = !c.eligible;
      $('dismissReview').hidden = !c.eligible;
    }
    async function save(kind, key, patch, output, base) {
      try {
        await adapter.save(kind, key, patch, base);
        status(output, 'Saved locally. Shared sync status appears above.');
        render();
        return true;
      } catch (e) {
        status(output, e.message);
        return false;
      }
    }
    function ensureDay() {
      if (shownDay !== G.date()) {
        fillDay(store(), G.date());
        status('dayStatus', 'A new day started. Review today’s actions before checking them off.');
        return false;
      }
      return true;
    }
    for (const [ui, k] of [
      ['meal', 'mealPlanned'],
      ['protein', 'proteinMeals'],
      ['movement', 'movement']
    ])
      $(ui).addEventListener('change', () => {
        if (ensureDay())
          void save('day', 'day:' + shownDay, { date: shownDay, [k]: $(ui).checked }, 'dayStatus');
      });
    $('intake').addEventListener('focus', () => {
      intakeBase = P.clone(store().optimisticDoc);
    });
    $('intake').addEventListener('change', () => {
      if (ensureDay())
        void save(
          'day',
          'day:' + shownDay,
          {
            date: shownDay,
            intakeCalories: $('intake').value === '' ? null : Number($('intake').value),
            intakeSource: $('intakeSource').value,
            intakeComplete: $('intakeComplete').checked
          },
          'dayStatus',
          intakeBase
        );
      intakeBase = null;
    });
    $('intakeSource').addEventListener('change', () => {
      if (ensureDay())
        void save(
          'day',
          'day:' + shownDay,
          { date: shownDay, intakeSource: $('intakeSource').value, intakeComplete: false },
          'dayStatus'
        );
    });
    $('intakeComplete').addEventListener('change', () => {
      if (ensureDay())
        void save(
          'day',
          'day:' + shownDay,
          {
            date: shownDay,
            intakeSource: $('intakeSource').value,
            intakeComplete: $('intakeComplete').checked
          },
          'dayStatus'
        );
    });
    $('barrier').addEventListener('change', () => {
      if (ensureDay())
        void save(
          'day',
          'day:' + shownDay,
          { date: shownDay, barrier: $('barrier').value },
          'dayStatus'
        );
    });
    for (const button of host.querySelectorAll('[data-feedback]'))
      button.onclick = () => {
        if (ensureDay())
          void save(
            'day',
            'day:' + shownDay,
            { date: shownDay, feedback: button.dataset.feedback },
            'dayStatus'
          );
      };
    $('preferences').oninput = () => {
      prefsDirty = true;
    };
    $('behaviorForm').oninput = () => {
      behaviorDirty = true;
    };
    $('preferences').onsubmit = async (e) => {
      e.preventDefault();
      const button = $('savePreferences');
      button.disabled = true;
      const p = {
        maintenanceCalories: $('maintenance').value === '' ? null : Number($('maintenance').value),
        weeklyRate: Number($('rate').value),
        strengthStatus: $('strength').value,
        maintenanceForRecovery: $('maintenanceRecovery').checked,
        nutritionCleared: $('nutrition').checked,
        trainingCleared: $('training').checked,
        clearanceDate: $('clearance').value || null
      };
      if (await save('preferences', 'preferences', p, 'preferenceStatus', prefsBase)) {
        prefsDirty = false;
        render();
      }
      button.disabled = false;
    };
    $('behaviorForm').onsubmit = async (e) => {
      e.preventDefault();
      if (
        await save(
          'behavior',
          'behavior',
          {
            mealTracker: $('mealTracker').value,
            focus: $('focus').value,
            anchor: $('anchor').value,
            why: $('why').value.trim(),
            fallback: $('fallback').value.trim(),
            reward: $('reward').value.trim()
          },
          'behaviorStatus',
          behaviorBase
        )
      ) {
        behaviorDirty = false;
        render();
      }
    };
    $('strengthForm').onsubmit = async (e) => {
      e.preventDefault();
      const value = {
        date: $('strengthDate').value,
        movement: $('exercise').value.trim(),
        variation: $('variation').value.trim(),
        mode: $('strengthMode').value,
        loadLb: Number($('load').value),
        reps: Number($('reps').value),
        rpe: Number($('rpe').value),
        pain: Number($('pain').value),
        notes: $('strengthNotes').value.trim()
      };
      await save('strength', 'strength:' + ('set_' + crypto.randomUUID()), value, 'strengthStatus');
    };
    async function review(decision) {
      const s = store(),
        today = G.date(),
        m = I.enrich(state(), s, G.model(state(), s.preferences, s.logs, today), today),
        c = m.calibration;
      if (!c.eligible) {
        status('reviewFeedback', 'The data or review window changed. Refresh and review again.');
        return;
      }
      let doc = s.optimisticDoc,
        ops = [];
      if (decision === 'accepted') {
        const op = P.operation(doc, 'preferences', 'preferences', {
          maintenanceCalories: c.proposedMaintenance
        });
        if (Object.keys(op.patch).length) {
          ops.push(op);
          doc = P.apply(doc, [op]);
        }
      }
      ops.push(
        P.operation(doc, 'review', 'review:' + today, {
          date: today,
          proposalId: c.proposalId,
          maintenanceCalories:
            decision === 'accepted' ? c.proposedMaintenance : m.preferences.maintenanceCalories,
          decision
        })
      );
      try {
        await adapter.enqueue(ops);
        status(
          'reviewFeedback',
          decision === 'accepted'
            ? 'Reviewed estimate applied locally; sync status appears above.'
            : 'Current estimate retained. Review recorded.'
        );
        render();
      } catch (e) {
        status('reviewFeedback', e.message);
      }
    }
    $('applyReview').onclick = () => review('accepted');
    $('dismissReview').onclick = () => review('dismissed');
    $('keepMine').onclick = async () => {
      try {
        await adapter.resolve('mine');
        render();
      } catch (e) {
        text('conflictText', e.message);
      }
    };
    $('useRemote').onclick = async () => {
      try {
        await adapter.resolve('remote');
        render();
      } catch (e) {
        text('conflictText', e.message);
      }
    };
    async function connection() {
      if (connectionBusy || !adapter.connection) return;
      connectionBusy = true;
      try {
        const d = await adapter.connection();
        text('connectionSummary', d.status || 'Connection report');
        $('connectionSteps').replaceChildren();
        for (const step of d.steps || []) {
          const div = document.createElement('div'),
            label = document.createElement('span'),
            value = document.createElement('b');
          div.className = 'cc-step';
          label.textContent = step.name;
          value.textContent = step.ok ? 'Confirmed' : 'Not confirmed';
          div.append(label, value);
          $('connectionSteps').append(div);
        }
        const proof = d.proof || d;
        text(
          'connectionNumbers',
          'Wall ' +
            (d.version || d.wallVersion || 'unknown') +
            ' · stored samples/s ' +
            fmt(proof.observedHz, 1) +
            ' · ' +
            (proof.sampleCount || 0) +
            ' samples in 10s. As of ' +
            new Date(d.generatedAt || Date.now()).toLocaleTimeString() +
            '. ' +
            (d.note || '')
        );
      } catch (e) {
        text('connectionSummary', e.message);
      } finally {
        connectionBusy = false;
      }
    }
    $('connectionDetails').ontoggle = () => {
      if ($('connectionDetails').open) void connection();
    };
    $('retry').onclick = async () => {
      try {
        await adapter.retry?.();
        await connection();
        render();
      } catch (e) {
        text('connectionSummary', e.message);
      }
    };
    $('export').onclick = async () => {
      try {
        const report = await adapter.export?.();
        const url = URL.createObjectURL(
            new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
          ),
          a = document.createElement('a');
        a.href = url;
        a.download = 'NONZERO-Connection-Report.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        text('connectionSummary', e.message);
      }
    };
    $('exportCoach').onclick = () => {
      try {
        const s = store(),
          url = URL.createObjectURL(
            new Blob(
              [
                JSON.stringify(
                  { schemaVersion: 2, exportedAt: Date.now(), doc: s.doc, pending: s.pending },
                  null,
                  2
                )
              ],
              { type: 'application/json' }
            )
          ),
          a = document.createElement('a');
        a.href = url;
        a.download = 'NONZERO-Coach-History.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        text('connectionSummary', e.message);
      }
    };
    const timer = setInterval(() => {
      render();
      if ($('connectionDetails').open && !document.hidden) void connection();
    }, 15000);
    render();
    return {
      render,
      model: () => model,
      dispose() {
        disposed = true;
        clearInterval(timer);
      }
    };
  }
  root.NonZeroCoachUI = { mount };
})(typeof globalThis !== 'undefined' ? globalThis : this);
