/* Completion-aware ambient mood. All added quotations are original NONZERO copy. */
(function (root) {
  'use strict';
  const originals = [
    {
      id: 'nz-victory-1',
      text: 'YOU KEPT THE PROMISE. LET THAT WIN TRAVEL WITH YOU.',
      author: 'NONZERO',
      concept: 'day-victory-1',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-2',
      text: 'TODAY HAS PROOF: YOU FOLLOW THROUGH.',
      author: 'NONZERO',
      concept: 'day-victory-2',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-3',
      text: 'THE WORK IS DONE. THE CONFIDENCE IS YOURS.',
      author: 'NONZERO',
      concept: 'day-victory-3',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-4',
      text: 'TAKE THE WIN. CARRY THE MOMENTUM.',
      author: 'NONZERO',
      concept: 'day-victory-4',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-5',
      text: 'YOU TURNED INTENTION INTO EVIDENCE.',
      author: 'NONZERO',
      concept: 'day-victory-5',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-6',
      text: 'ONE MORE SESSION. ONE STRONGER STANDARD.',
      author: 'NONZERO',
      concept: 'day-victory-6',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-7',
      text: 'THIS IS WHAT KEEPING YOUR WORD LOOKS LIKE.',
      author: 'NONZERO',
      concept: 'day-victory-7',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-8',
      text: 'YOU EARNED THIS FINISH. ENJOY IT.',
      author: 'NONZERO',
      concept: 'day-victory-8',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-9',
      text: 'THE FINISH LINE IS A PLACE TO CELEBRATE.',
      author: 'NONZERO',
      concept: 'day-victory-9',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-10',
      text: "TODAY'S EFFORT IS TOMORROW'S FOUNDATION.",
      author: 'NONZERO',
      concept: 'day-victory-10',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-11',
      text: 'LET THE WIN BUILD CONFIDENCE, NOT PRESSURE.',
      author: 'NONZERO',
      concept: 'day-victory-11',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-12',
      text: 'THE SESSION ENDS. THE MOMENTUM CONTINUES.',
      author: 'NONZERO',
      concept: 'day-victory-12',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-13',
      text: 'YOU SHOWED UP. YOU DID THE WORK. THAT COUNTS.',
      author: 'NONZERO',
      concept: 'day-victory-13',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-14',
      text: 'PROGRESS HAS A RECEIPT. YOU JUST EARNED ONE.',
      author: 'NONZERO',
      concept: 'day-victory-14',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-15',
      text: 'CARRY THIS CONFIDENCE INTO THE REST OF YOUR DAY.',
      author: 'NONZERO',
      concept: 'day-victory-15',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-16',
      text: 'A PROMISE KEPT IS STRENGTH YOU CAN USE ANYWHERE.',
      author: 'NONZERO',
      concept: 'day-victory-16',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-17',
      text: 'YOUR NEXT CHALLENGE GETS A MORE CONFIDENT YOU.',
      author: 'NONZERO',
      concept: 'day-victory-17',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-18',
      text: "TODAY'S WIN BELONGS TO THE PERSON WHO STARTED.",
      author: 'NONZERO',
      concept: 'day-victory-18',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-19',
      text: 'CELEBRATE THE EFFORT. RESPECT THE RECOVERY.',
      author: 'NONZERO',
      concept: 'day-victory-19',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-20',
      text: 'YOU BUILT MOMENTUM. LET IT WORK FOR YOU.',
      author: 'NONZERO',
      concept: 'day-victory-20',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-21',
      text: 'CONSISTENCY IS BECOMING SOMETHING YOU CAN SEE.',
      author: 'NONZERO',
      concept: 'day-victory-21',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-22',
      text: 'ANOTHER DAY WITH EVIDENCE OF YOUR COMMITMENT.',
      author: 'NONZERO',
      concept: 'day-victory-22',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-23',
      text: 'BE PROUD OF THE FOLLOW-THROUGH.',
      author: 'NONZERO',
      concept: 'day-victory-23',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-24',
      text: 'YOU MADE ROOM FOR THE WORK. NOW MAKE ROOM FOR THE WIN.',
      author: 'NONZERO',
      concept: 'day-victory-24',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-25',
      text: 'THE STANDARD YOU PRACTICED TODAY IS YOURS TO KEEP.',
      author: 'NONZERO',
      concept: 'day-victory-25',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-26',
      text: 'THE WORKOUT IS COMPLETE. THE GOOD DAY IS STILL UNFOLDING.',
      author: 'NONZERO',
      concept: 'day-victory-26',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-27',
      text: 'YOU FINISHED WHAT YOU STARTED. REMEMBER THAT FEELING.',
      author: 'NONZERO',
      concept: 'day-victory-27',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-28',
      text: 'A CLEAN FINISH. A STRONGER FOUNDATION.',
      author: 'NONZERO',
      concept: 'day-victory-28',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-29',
      text: 'YOU HAVE SOMETHING TO BUILD ON NOW.',
      author: 'NONZERO',
      concept: 'day-victory-29',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-30',
      text: "LET TODAY'S SUCCESS MAKE TOMORROW'S START FEEL POSSIBLE.",
      author: 'NONZERO',
      concept: 'day-victory-30',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-31',
      text: 'YOUR EFFORT MATTERED BEFORE ANYONE ELSE SAW IT.',
      author: 'NONZERO',
      concept: 'day-victory-31',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-victory-32',
      text: 'THIS WIN IS REAL. YOU DID THE WORK.',
      author: 'NONZERO',
      concept: 'day-victory-32',
      tags: ['victory'],
      dayContext: 'victory'
    },
    {
      id: 'nz-action-1',
      text: 'GIVE THE NEXT TEN MINUTES A PURPOSE.',
      author: 'NONZERO',
      concept: 'day-action-1',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-2',
      text: 'THE NEXT REP NEEDS YOUR ATTENTION, NOT YOUR DOUBT.',
      author: 'NONZERO',
      concept: 'day-action-2',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-3',
      text: 'CHOOSE THE FIRST STEP. LET THE SECOND FOLLOW.',
      author: 'NONZERO',
      concept: 'day-action-3',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-4',
      text: 'MAKE THE START SMALL. MAKE THE ATTENTION COMPLETE.',
      author: 'NONZERO',
      concept: 'day-action-4',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-5',
      text: 'YOUR PLAN BECOMES REAL WHEN YOU MOVE.',
      author: 'NONZERO',
      concept: 'day-action-5',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-6',
      text: 'DISCIPLINE BEGINS WITH THE NEXT DECISION.',
      author: 'NONZERO',
      concept: 'day-action-6',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-7',
      text: 'ONE TASK. FULL ATTENTION. THEN THE NEXT.',
      author: 'NONZERO',
      concept: 'day-action-7',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-8',
      text: 'MAKE SPACE FOR WHAT YOU SAID MATTERED.',
      author: 'NONZERO',
      concept: 'day-action-8',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-9',
      text: 'KEEP THE APPOINTMENT YOU MADE WITH YOURSELF.',
      author: 'NONZERO',
      concept: 'day-action-9',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-10',
      text: 'A QUIET START STILL CHANGES THE DAY.',
      author: 'NONZERO',
      concept: 'day-action-10',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-11',
      text: 'LET THE ROUTINE CARRY WHAT MOTIVATION CANNOT.',
      author: 'NONZERO',
      concept: 'day-action-11',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-12',
      text: 'PRACTICE FOLLOW-THROUGH ONE SET AT A TIME.',
      author: 'NONZERO',
      concept: 'day-action-12',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-13',
      text: 'THE NEXT USEFUL ACTION IS CLOSE ENOUGH TO TAKE.',
      author: 'NONZERO',
      concept: 'day-action-13',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-14',
      text: 'LESS NEGOTIATION. ONE CLEAR NEXT STEP.',
      author: 'NONZERO',
      concept: 'day-action-14',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-15',
      text: 'PROTECT THE TIME. DO THE WORK THAT FITS.',
      author: 'NONZERO',
      concept: 'day-action-15',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-16',
      text: 'THE STANDARD IS BUILT IN ORDINARY MOMENTS.',
      author: 'NONZERO',
      concept: 'day-action-16',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-17',
      text: 'RETURN YOUR ATTENTION TO THE REP IN FRONT OF YOU.',
      author: 'NONZERO',
      concept: 'day-action-17',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-18',
      text: 'START WITH WHAT YOU HAVE. STAY WITH WHAT YOU CHOOSE.',
      author: 'NONZERO',
      concept: 'day-action-18',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-19',
      text: 'YOU DO NOT NEED A PERFECT WINDOW TO MAKE A START.',
      author: 'NONZERO',
      concept: 'day-action-19',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-20',
      text: 'FOCUS IS A CHOICE YOU CAN MAKE AGAIN.',
      author: 'NONZERO',
      concept: 'day-action-20',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-21',
      text: 'LET YOUR ACTIONS GIVE THE DAY ITS DIRECTION.',
      author: 'NONZERO',
      concept: 'day-action-21',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-22',
      text: 'A SMALL SESSION IS STILL A KEPT APPOINTMENT.',
      author: 'NONZERO',
      concept: 'day-action-22',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-23',
      text: 'MAKE YOUR NEXT ACTION MATCH YOUR INTENTION.',
      author: 'NONZERO',
      concept: 'day-action-23',
      tags: ['action'],
      dayContext: 'action'
    },
    {
      id: 'nz-action-24',
      text: 'THE WORK GETS CLEARER WHEN YOU BEGIN.',
      author: 'NONZERO',
      concept: 'day-action-24',
      tags: ['action'],
      dayContext: 'action'
    }
  ];
  function completion(rows, active, today) {
    const records = [...(Array.isArray(rows) ? rows : []), active].filter(
      (x) =>
        x &&
        x.date === today &&
        (x.completed === true ||
          ['complete', 'completed', 'finished'].includes(String(x.status || '').toLowerCase()))
    );
    const unique = [
      ...new Map(records.map((r, i) => [r.sessionId || r.id || `record-${i}`, r])).values()
    ];
    return { won: unique.length > 0, records: unique };
  }
  function score(q, context) {
    if (q.dayContext) return q.dayContext === context ? 10 : 0;
    const meta = [...(q.tags || []), q.concept, q.domain, q.category].join(' ').toLowerCase(),
      text = String(q.text || '').toLowerCase();
    const victory =
      /victory|achievement|accomplish|success|triumph|momentum|progress|persever|resilien|consisten|growth/;
    const action =
      /action|discipline|focus|start|practice|effort|commit|purpose|attention|habit|work|consisten/;
    return (context === 'victory' ? victory : action).test(meta)
      ? 4
      : (context === 'victory'
            ? /achiev|accomplish|victor|success|progress|proud|keep going|keep moving|persever/
            : /begin|start|discipline|focus|action|practice|attention|effort|do the work/
          ).test(text)
        ? 2
        : 0;
  }
  root.NonZeroDayMood = { originals, completion, score };
})(typeof globalThis !== 'undefined' ? globalThis : this);
