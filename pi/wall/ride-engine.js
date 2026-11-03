/* NONZERO Ride · original procedural scenery and cadence-responsive score. */
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)),
    finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const LEGACY_THEMES = [
    {
      name: 'PACIFIC COAST',
      sky: ['#071f3d', '#296785', '#f4b78f'],
      sea: '#347e96',
      land: '#183c39',
      road: '#283c47',
      accent: '#8ef0e7',
      landmarks: ['LIGHTHOUSE POINT', 'THE COASTAL BRIDGE', 'SUNSET OVERLOOK', 'HARBOR LIGHTS']
    },
    {
      name: 'ALPINE PASS',
      sky: ['#102b52', '#487c9a', '#d4e6df'],
      sea: '#427b82',
      land: '#244242',
      road: '#303f48',
      accent: '#dbefd5',
      landmarks: ['GLACIER LAKE', 'PINE RIDGE', 'THE HIGH PASS', 'SUMMIT VISTA']
    },
    {
      name: 'MIDNIGHT CITY',
      sky: ['#090b25', '#231c4b', '#654a68'],
      sea: '#1b2850',
      land: '#1b1d3a',
      road: '#1a2436',
      accent: '#6ee9ff',
      landmarks: ['RIVER WALK', 'THE SKYLINE', 'NEON DISTRICT', 'NORTH BRIDGE']
    }
  ];
  const THEMES = root.NonZeroScenery?.THEMES || LEGACY_THEMES;
  function musicTarget(rpm) {
    const r = clamp(finite(rpm), 0, 180);
    return { bpm: clamp(r * 1.55, 84, 156), energy: clamp((r - 40) / 65, 0, 1) };
  }
  // Musical palettes are original arrangements, selected by landscape.
  const SOUND_THEMES = {
    pittsburgh: {
      name: 'North Shore pulse',
      roots: [55, 65.41, 49, 43.65],
      notes: [0, 7, 12, 14, 19, 14, 12, 7],
      wave: 'triangle',
      lift: 1,
      hat: 1
    },
    'west-virginia': {
      name: 'Country road acoustic',
      roots: [49, 65.41, 55, 43.65],
      notes: [0, 4, 7, 12, 16, 12, 7, 4],
      wave: 'triangle',
      lift: 0.75,
      hat: 0.55
    },
    'mountain-bike': {
      name: 'Trail drive',
      roots: [41.2, 49, 55, 36.71],
      notes: [0, 3, 7, 10, 12, 10, 7, 3],
      wave: 'sawtooth',
      lift: 1.1,
      hat: 1.1
    },
    beach: {
      name: 'Coastal flow',
      roots: [65.41, 55, 73.42, 49],
      notes: [0, 4, 7, 11, 14, 11, 7, 4],
      wave: 'sine',
      lift: 0.7,
      hat: 0.45
    },
    'salt-flats': {
      name: 'Open horizon ambient',
      roots: [43.65, 49, 65.41, 55],
      notes: [0, 7, 14, 19, 24, 19, 14, 7],
      wave: 'sine',
      lift: 0.55,
      hat: 0.25
    },
    rockies: {
      name: 'Alpine ascent',
      roots: [36.71, 49, 43.65, 55],
      notes: [0, 7, 10, 14, 17, 14, 10, 7],
      wave: 'triangle',
      lift: 0.9,
      hat: 0.7
    },
    france: {
      name: 'Grand tour momentum',
      roots: [55, 73.42, 65.41, 49],
      notes: [0, 4, 7, 12, 14, 16, 19, 12],
      wave: 'triangle',
      lift: 1.05,
      hat: 0.9
    }
  };
  function soundTheme(id) {
    return SOUND_THEMES[id] || SOUND_THEMES.pittsburgh;
  }
  class RideCoach {
    constructor() {
      this.reset();
    }
    reset() {
      this.session = null;
      this.candidate = '';
      this.since = 0;
      this.current = null;
    }
    update(t, o = {}, now = Date.now()) {
      if (o.session !== this.session) {
        this.reset();
        this.session = o.session;
      }
      const g = o.targets || {},
        rpm = finite(t?.cadence ?? t?.rpm),
        hr = finite(t?.heartRate),
        watts = finite(t?.watts);
      let key = 'steady',
        cue = '',
        urgent = false;
      if (o.paused) {
        key = 'paused';
        cue = 'Workout paused · resume when you are ready.';
        urgent = true;
      } else if (!fresh(t, now)) {
        key = 'waiting';
        cue = 'Waiting for live PM5 data · ride at your comfortable pace.';
        urgent = true;
      } else if (g.hrMax > 0 && hr > g.hrMax) {
        key = 'hr-high';
        cue = 'Ease your effort · heart rate is above your target.';
        urgent = true;
      } else if (hr > 0 && /HEART RATE RISING/i.test(o.coach || '')) {
        key = 'hr-rising';
        cue = 'Heart rate rising · hold or ease your effort, and check your breathing.';
        urgent = true;
      } else if (rpm < 3 && watts < 5) {
        key = 'rest';
        cue = 'Take your recovery · start smoothly when ready.';
        urgent = true;
      } else if (g.goalReached) {
        key = 'complete';
        cue = 'Goal reached. You showed up · finish with an easy cooldown.';
        urgent = true;
      } else if (g.pace === 'extend') {
        key = 'extend';
        cue = 'Keep a sustainable effort · allow more time for your goal.';
        urgent = true;
      } else if (g.phase === 'warmup') {
        key = 'warmup';
        cue = 'Build gradually · relaxed shoulders, smooth pedal strokes.';
      } else if (g.phase === 'cooldown') {
        key = 'cooldown';
        cue = 'Ease down gradually · let your breathing settle.';
      } else if (g.cadenceMin > 0 && rpm < g.cadenceMin) {
        key = 'cadence-low';
        cue = `If comfortable, build smoothly toward ${g.cadenceMin}–${g.cadenceMax} RPM.`;
      } else if (g.cadenceMax > 0 && rpm > g.cadenceMax) {
        key = 'cadence-high';
        cue = `Settle into ${g.cadenceMin}–${g.cadenceMax} RPM · stay controlled.`;
      } else if (g.powerMax > 0 && watts > g.powerMax) {
        key = 'power-high';
        cue = 'Soften your effort · bring power back inside your target.';
      } else {
        const cues = [
          'Find a repeatable rhythm · consistency builds your next milestone.',
          'Relax your grip and shoulders · keep every stroke smooth.',
          'Stay with this minute · controlled effort is progress.',
          'Check your breathing · choose a pace you can sustain.'
        ];
        cue = cues[Math.floor(now / 15000) % cues.length];
        if (g.powerMin > 0 && watts < g.powerMin) {
          key = 'power-low';
          cue = 'If comfortable, build power gradually toward your target.';
        } else if (g.calibration) {
          key = 'calibrating';
          cue = 'Ride comfortably · learning your pace before refining targets.';
        }
      }
      if (key !== this.candidate) {
        this.candidate = key;
        this.since = now;
      }
      if (urgent || !this.current || key === this.current.key || now - this.since >= 4000)
        this.current = { key, cue, alert: key === 'hr-high' };
      return { ...this.current, phase: g.phase || 'live ride' };
    }
  }
  function fresh(t, now = Date.now()) {
    const at = finite(t?.updatedAt);
    return !!(
      t?.connected === true &&
      t?.fresh !== false &&
      !t?.recovering &&
      at > 0 &&
      now - at >= -1000 &&
      now - at < 2500
    );
  }
  function resolution(w, h, dpr = 1, scale = 1) {
    const ratio = Math.min(2, finite(dpr, 1)),
      cap = Math.min(1, Math.sqrt(8294400 / Math.max(1, w * h * ratio * ratio)));
    return {
      width: Math.max(1, Math.round(w * ratio * cap * scale)),
      height: Math.max(1, Math.round(h * ratio * cap * scale))
    };
  }
  class RideState {
    constructor() {
      this.bpm = 100;
      this.energy = 0;
      this.speed = 0;
      this.distance = 0;
      this.visualDistance = 0;
      this.lastStamp = '';
      this.lastDistance = null;
      this.session = null;
      this.validUntil = 0;
      this.rpm = 0;
      this.active = false;
      this.paused = false;
      this.now = 0;
      this.lastTick = 0;
      this.measuredSpeed = null;
      this.lastSampleAt = 0;
    }
    ingest(t, o = {}, now = Date.now()) {
      if (o.session && o.session !== this.session) {
        this.session = o.session;
        this.distance = 0;
        this.visualDistance = 0;
        this.lastDistance = null;
        this.lastStamp = '';
        this.now = 0;
        this.speed = 0;
        this.measuredSpeed = null;
        this.lastSampleAt = 0;
      }
      this.active = !!o.active;
      this.paused = !!o.paused;
      const valid = fresh(t, now) && !this.paused,
        key = String(t?.readSequence) + '|' + String(t?.updatedAt);
      this.validUntil = valid ? finite(t.updatedAt) + 2500 : 0;
      this.rpm = valid ? clamp(finite(t.cadence ?? t.rpm), 0, 180) : 0;
      if (valid && key !== this.lastStamp) {
        const d = finite(t.distanceMeters, -1);
        const sampleAt = finite(t.updatedAt),
          gap = (sampleAt - this.lastSampleAt) / 1000;
        const directSpeed = Number(t.speedMps);
        if (
          t.speedMps != null &&
          Number.isFinite(directSpeed) &&
          directSpeed >= 0 &&
          directSpeed <= 30
        )
          this.measuredSpeed = directSpeed;
        else if (gap > 0 && gap < 3 && this.lastDistance !== null && d >= this.lastDistance)
          this.measuredSpeed = clamp((d - this.lastDistance) / gap, 0, 30);
        else this.measuredSpeed = null;
        this.lastSampleAt = sampleAt;
        if (d >= 0) {
          if (this.lastDistance !== null && d >= this.lastDistance)
            this.distance += d - this.lastDistance;
          this.lastDistance = d;
        }
        this.lastStamp = key;
      }
    }
    step(dt, now = Date.now()) {
      dt = clamp(finite(dt), 0, 0.1);
      const live = this.active && !this.paused && now < this.validUntil,
        rpm = live ? this.rpm : 0,
        target = musicTarget(rpm),
        ease = 1 - Math.exp(-dt / 3);
      this.bpm += (target.bpm - this.bpm) * ease;
      this.energy += ((live && rpm >= 3 ? target.energy : 0) - this.energy) * ease;
      // Visual motion is an illustrative cadence-controlled ride, not measured speed.
      const speed = live && rpm >= 3 ? (this.measuredSpeed ?? clamp(rpm * 0.1, 0, 18)) : 0;
      this.speed = live ? this.speed + (speed - this.speed) * (1 - Math.exp(-dt * 3)) : 0;
      this.now += this.speed * dt;
      this.visualDistance += (this.distance - this.visualDistance) * (1 - Math.exp(-dt * 5));
      return {
        live: live && rpm >= 3,
        bpm: this.bpm,
        energy: this.energy,
        speed: this.speed,
        distance: this.visualDistance,
        position: this.now
      };
    }
  }
  class Score {
    constructor(win) {
      this.win = win;
      this.ctx = null;
      this.master = null;
      this.next = 0;
      this.step = 0;
      this.bpm = 100;
      this.energy = 0;
      this.volume = 0.28;
      this.enabled = true;
      this.live = false;
      this.unlocking = false;
      this.state = 'ready';
      this.noise = null;
      this.started = false;
      this.theme = 'pittsburgh';
    }
    async unlock() {
      if (this.unlocking) return;
      this.unlocking = true;
      try {
        const Audio = this.win.AudioContext || this.win.webkitAudioContext;
        if (!Audio) {
          this.state = 'unavailable';
          return;
        }
        if (!this.ctx) {
          this.ctx = new Audio();
          this.master = this.ctx.createGain();
          this.master.gain.value = 0;
          const limiter = this.ctx.createDynamicsCompressor();
          limiter.threshold.value = -14;
          limiter.ratio.value = 8;
          this.master.connect(limiter);
          limiter.connect(this.ctx.destination);
          this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.22, this.ctx.sampleRate);
          const data = this.noise.getChannelData(0);
          for (let i = 0; i < data.length; i++)
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
        }
        if (this.ctx.state !== 'running') {
          let timeout;
          try {
            await Promise.race([
              this.ctx.resume(),
              new Promise((_, reject) => {
                timeout = setTimeout(() => reject(new Error('audio resume timeout')), 2000);
              })
            ]);
          } finally {
            clearTimeout(timeout);
          }
        }
        this.state = this.ctx.state === 'running' ? 'running' : 'blocked';
        this.next = Math.max(this.next, this.ctx.currentTime + 0.05);
      } catch {
        this.state = 'blocked';
      } finally {
        this.unlocking = false;
      }
    }
    tone(freq, at, duration, gain, type = 'sine') {
      const c = this.ctx,
        o = c.createOscillator(),
        g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, at);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      o.connect(g);
      g.connect(this.master);
      o.start(at);
      o.stop(at + duration + 0.03);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
      return o;
    }
    hat(at, gain) {
      const n = this.ctx.createBufferSource(),
        f = this.ctx.createBiquadFilter(),
        g = this.ctx.createGain();
      n.buffer = this.noise;
      f.type = 'highpass';
      f.frequency.value = 6500;
      g.gain.setValueAtTime(gain, at);
      n.connect(f);
      f.connect(g);
      g.connect(this.master);
      n.start(at);
      n.stop(at + 0.13);
      n.onended = () => {
        n.disconnect();
        f.disconnect();
        g.disconnect();
      };
    }
    schedule(state) {
      this.theme = SOUND_THEMES[state.theme] ? state.theme : this.theme;
      const palette = soundTheme(this.theme);
      this.bpm = clamp(finite(state.bpm, 100), 84, 156);
      this.energy = state.energy;
      this.live = state.live;
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime,
        audible = this.enabled && state.live;
      this.master.gain.setTargetAtTime(audible ? this.volume : 0, now, audible ? 0.5 : 0.3);
      if (!audible) {
        this.next = now + 0.05;
        return;
      }
      if (this.next < now) this.next = now + 0.04;
      let count = 0;
      while (this.next < now + 0.14 && count++ < 8) {
        const beat = this.step % 16,
          bar = Math.floor(this.step / 16),
          roots = palette.roots,
          bass = roots[Math.floor(bar / 2) % 4],
          at = this.next;
        if (beat % 4 === 0) {
          const kick = this.tone(125, at, 0.24, 0.62);
          kick.frequency.exponentialRampToValueAtTime(42, at + 0.18);
          this.tone(bass, at, 0.32, 0.18 * palette.lift, palette.wave);
        }
        if (beat === 4 || beat === 12) this.hat(at, 0.18 * palette.hat);
        if (beat % 2 === 0 && this.energy > 0.18)
          this.hat(at, (0.06 + this.energy * 0.045) * palette.hat);
        const notes = palette.notes,
          note = notes[(Math.floor(beat / 2) + bar) % notes.length];
        if (beat % 2 === 0)
          this.tone(
            bass * 4 * Math.pow(2, note / 12),
            at,
            0.35,
            (0.075 + this.energy * 0.035) * palette.lift,
            palette.wave
          );
        if (beat === 0) {
          [0, 7, 12].forEach((n) =>
            this.tone(bass * 2 * Math.pow(2, n / 12), at, 2.8, 0.045, 'triangle')
          );
        }
        if (this.energy > 0.65 && beat % 2 === 1) this.tone(bass * 8, at, 0.13, 0.035);
        this.step++;
        this.next += 60 / this.bpm / 4;
      }
    }
    mute() {
      if (this.master) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      this.live = false;
    }
  }
  root.NonZeroRideCore = {
    RideState,
    Score,
    RideCoach,
    musicTarget,
    soundTheme,
    SOUND_THEMES,
    fresh,
    resolution,
    THEMES
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.NonZeroRideCore;
})(typeof window !== 'undefined' ? window : globalThis);

(function (root) {
  'use strict';
  const { RideState, Score, RideCoach, musicTarget, soundTheme, fresh, resolution, THEMES } =
    root.NonZeroRideCore;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)),
    finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  function mount() {
    const canvas = document.getElementById('rideCanvas'),
      panel = document.getElementById('performance');
    if (!canvas || !panel) return null;
    let ctx;
    try {
      ctx = canvas.getContext('2d', { alpha: false });
    } catch {}
    if (!ctx) return null;
    const state = new RideState(),
      score = new Score(root),
      coach = new RideCoach(),
      prefs = (() => {
        try {
          return JSON.parse(localStorage.getItem('nz.ridePreferences') || '{}');
        } catch {
          return {};
        }
      })();
    let controlNonce = '';
    let enabled = prefs.enabled !== false,
      theme = clamp(finite(prefs.theme), 0, THEMES.length - 1),
      muted = prefs.muted !== false,
      quality = 1,
      last = 0,
      lastDraw = 0,
      paintCost = 0,
      frames = 0,
      active = false,
      eligible = false,
      forceRide = false;
    const reduced = root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
    const el = (id) => document.getElementById(id),
      text = (id, v) => {
        const e = el(id);
        if (e && e.textContent !== String(v)) e.textContent = String(v);
      },
      save = () => {
        try {
          localStorage.setItem(
            'nz.ridePreferences',
            JSON.stringify({ enabled, theme, muted, volume: score.volume })
          );
        } catch {}
      };
    score.enabled = !muted;
    score.volume = clamp(finite(prefs.volume, 0.28), 0, 0.7);
    const scenery = root.NonZeroScenery?.create(canvas);
    // GPU work is never started while Ambient or cockpit-only mode is displayed.
    // The worker is isolated from the UI thread; do not fall back to main-thread WebGL.
    let immersive = null;
    let idleSeconds = clamp(finite(localStorage.getItem('nz.rideIdleSeconds'), 20), 5, 180);
    let motionSeen = false, lastMovingAt = 0, rideError = '', lastSession = null;
    function stopGraphics() {
      if (immersive) {
        try { immersive.dispose(); } catch (e) { rideError = String(e); }
        immersive = null;
      }
      const fallback = document.getElementById('rideCanvas');
      if (fallback) fallback.style.visibility = '';
    }
    function endRide(reason = 'manual') {
      enabled = false;
      forceRide = false;
      motionSeen = false;
      lastMovingAt = 0;
      rideError = reason === 'graphics-failed' ? 'Graphics worker stopped safely' : '';
      state.active = false;
      setVisible(false);
      save();
    }
    function ensureGraphics() {
      return; // Stability hotfix: never allocate a GPU/worker renderer.
      if (!active || immersive || !root.NonZeroImmersiveWorker) return;
      try { immersive = root.NonZeroImmersiveWorker.create(canvas); }
      catch (e) { rideError = String(e); immersive = null; }
    }
    let lastTelemetry = null,
      lastMotion = 0,
      sceneryError = '',
      coachOptions = {},
      audioAt = 0,
      audioBpm = 100,
      audioEnergy = 0;
    function updateRideMetrics(t) {
      if (
        t &&
        fresh(t) &&
        (!lastTelemetry || Number(t.updatedAt) >= Number(lastTelemetry.updatedAt))
      )
        lastTelemetry = { ...t };
      if (t?.connected === false) lastTelemetry = null;
      const live = fresh(lastTelemetry);
      const sample = live ? lastTelemetry : null;
      text('rideWatts', sample?.watts != null ? Math.round(finite(sample.watts)) : '—');
      text(
        'rideCadence',
        sample && (sample.cadence ?? sample.rpm) != null
          ? Math.round(finite(sample.cadence ?? sample.rpm))
          : '—'
      );
      text(
        'rideHeart',
        sample && finite(sample.heartRate) > 0 ? Math.round(sample.heartRate) : '—'
      );
      text('rideDataState', live ? 'PM5 · LIVE' : 'PM5 · WAITING FOR DATA');
      return live ? lastTelemetry : null;
    }
    function updateCoach() {
      const result = coach.update(lastTelemetry, coachOptions);
      text('rideCoach', result.cue);
      const strip = el('rideCoach');
      if (strip) strip.setAttribute('data-alert', String(result.alert));
      const g = coachOptions.targets || {};
      const range = (a, b, unit) =>
        a > 0 && b >= a
          ? `TARGET ${Math.round(a)}–${Math.round(b)} ${unit}`
          : 'TARGET · CALIBRATING';
      text('ridePowerTarget', range(g.powerMin, g.powerMax, 'W'));
      text('rideCadenceTarget', range(g.cadenceMin, g.cadenceMax, 'RPM'));
      text(
        'rideHeartTarget',
        g.hrMax > 0 ? range(g.hrMin || g.hrMax, g.hrMax, 'BPM') : 'HEART RATE · MONITORING'
      );
      text(
        'rideCoachPhase',
        String(g.phase || 'LIVE COACH')
          .replaceAll('-', ' ')
          .toUpperCase()
      );
    }
    function updateSoundtrack() {
      const now = Date.now(),
        dt = Math.min(0.5, Math.max(0, (now - audioAt) / 1000));
      audioAt = now;
      const live =
        eligible &&
        !coachOptions.paused &&
        !document.hidden &&
        fresh(lastTelemetry) &&
        finite(lastTelemetry?.cadence ?? lastTelemetry?.rpm) >= 3;
      const target = musicTarget(live ? (lastTelemetry.cadence ?? lastTelemetry.rpm) : 0),
        ease = 1 - Math.exp(-dt / 3);
      audioBpm += (target.bpm - audioBpm) * ease;
      audioEnergy += (target.energy - audioEnergy) * ease;
      score.schedule({ live, bpm: audioBpm, energy: audioEnergy, theme: THEMES[theme].id });
      text('rideBpm', Math.round(audioBpm) + ' BPM');
      text('rideSoundTheme', soundTheme(THEMES[theme].id).name);
      musicStatus();
    }
    const background = document.createElement('canvas'),
      bg = background.getContext('2d', { alpha: false });
    if (!bg) return null;
    function polygon(c, points, color) {
      c.fillStyle = color;
      c.beginPath();
      points.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p)));
      c.closePath();
      c.fill();
    }
    function buildBackground() {
      if (immersive) return;
      if (scenery) {
        scenery.build(theme);
        return;
      }
      const { width: w, height: h } = canvas;
      background.width = w;
      background.height = h;
      const T = THEMES[theme],
        g = bg.createLinearGradient(0, 0, 0, h * 0.7);
      T.sky.forEach((c, i) => g.addColorStop(i / 2, c));
      bg.fillStyle = g;
      bg.fillRect(0, 0, w, h);
      const halo = bg.createRadialGradient(w * 0.73, h * 0.31, 0, w * 0.73, h * 0.31, h * 0.38);
      halo.addColorStop(0, theme === 2 ? '#8c76db30' : '#ffe6bc66');
      halo.addColorStop(1, '#fff0');
      bg.fillStyle = halo;
      bg.fillRect(0, 0, w, h);
      bg.fillStyle = theme === 2 ? '#d8dfff' : '#ffe8ca';
      bg.beginPath();
      bg.arc(w * 0.73, h * 0.29, h * 0.035, 0, Math.PI * 2);
      bg.fill();
      if (theme === 2) {
        for (let i = 0; i < 180; i++) {
          bg.fillStyle = `rgba(219,229,255,${0.15 + (i % 7) / 12})`;
          bg.fillRect(
            (Math.sin(i * 92.1) * 0.5 + 0.5) * w,
            (Math.sin(i * 19.7) * 0.5 + 0.5) * h * 0.4,
            Math.max(1, w / 1900),
            Math.max(1, w / 1900)
          );
        }
      }
      for (let layer = 0; layer < 4; layer++) {
        const points = [[0, h * 0.61]];
        for (let x = 0; x <= 64; x++) {
          const v = Math.sin(x * 0.43 + layer) * 0.027 + Math.sin(x * 0.18 + layer * 2) * 0.045;
          points.push([(x / 64) * w, h * (0.43 + layer * 0.035 + v)]);
        }
        points.push([w, h * 0.69]);
        polygon(bg, points, ['#254457', '#254e60', '#245666', '#235263'][layer]);
      }
      const water = bg.createLinearGradient(0, h * 0.51, 0, h);
      water.addColorStop(0, T.sea);
      water.addColorStop(1, theme === 2 ? '#101d37' : '#0c3549');
      bg.fillStyle = water;
      bg.fillRect(0, h * 0.57, w, h * 0.43);
      for (let i = 0; i < 60; i++) {
        const y = h * (0.575 + (i / 60) ** 2 * 0.42);
        bg.fillStyle = `rgba(189,232,238,${0.02 + (i % 5) * 0.007})`;
        bg.fillRect(0, y, w, h * 0.001);
      }
      if (theme === 2) {
        for (let i = 0; i < 35; i++) {
          const x = (i * w) / 35,
            bh = h * (0.08 + ((Math.sin(i * 67) + 1) / 2) * 0.18),
            bw = w * 0.025;
          bg.fillStyle = i % 2 ? '#142239' : '#1d2845';
          bg.fillRect(x, h * 0.57 - bh, bw, bh);
          bg.fillStyle = '#d5bbee66';
          for (let a = 0; a < 4; a++)
            for (let b = 0; b < 8; b++)
              if ((a + b + i) % 3)
                bg.fillRect(x + (a * bw) / 5, h * 0.57 - bh + (b * bh) / 9, bw / 15, bh / 30);
        }
      }
    }
    function resize() {
      const r = resolution(root.innerWidth, root.innerHeight, root.devicePixelRatio || 1, quality);
      if (canvas.width !== r.width || canvas.height !== r.height) {
        canvas.width = r.width;
        canvas.height = r.height;
        buildBackground();
      }
      immersive?.resize(r.width, r.height);
      text('rideResolution', `${r.width} × ${r.height}`);
    }
    function draw(position) {
      if (immersive?.draw(theme, position)) return;
      if (scenery) {
        scenery.draw(theme, position, root.performance.now());
        return;
      }
      const w = canvas.width,
        h = canvas.height,
        T = THEMES[theme];
      ctx.drawImage(background, 0, 0);
      const horizon = h * 0.48,
        camera = position * 0.001;
      // A winding elevated road, sampled in perspective: smooth 3D motion without raster assets.
      const rows = [];
      for (let i = 0; i <= 96; i++) {
        const p = i / 96,
          depth = p * p,
          y = horizon + (h - horizon) * depth,
          half = w * (0.004 + depth * 0.49),
          bend =
            (Math.sin(camera + p * 1.6) * 0.09 + Math.sin(camera * 0.57 + p * 3) * 0.055) *
            w *
            (1 - p);
        rows.push({ y, half, center: w * 0.51 + bend, depth, p });
      }
      polygon(
        ctx,
        [[0, h], ...[...rows].reverse().map((r) => [r.center - r.half * 1.62, r.y]), [0, horizon]],
        T.land
      );
      for (let i = 0; i < rows.length - 1; i++) {
        const a = rows[i],
          b = rows[i + 1],
          stripe = Math.floor((position + i * i * 0.15) / 12) % 2;
        polygon(
          ctx,
          [
            [a.center - a.half, a.y],
            [a.center + a.half, a.y],
            [b.center + b.half, b.y],
            [b.center - b.half, b.y]
          ],
          stripe ? T.road : theme === 2 ? '#1e293a' : '#2c414c'
        );
        const edge = Math.max(w * 0.0007, a.half * 0.016);
        for (const sign of [-1, 1])
          polygon(
            ctx,
            [
              [a.center + sign * a.half - edge, a.y],
              [a.center + sign * a.half + edge, a.y],
              [b.center + sign * b.half + edge, b.y],
              [b.center + sign * b.half - edge, b.y]
            ],
            T.accent
          );
        if (stripe)
          polygon(
            ctx,
            [
              [a.center - a.half * 0.008, a.y],
              [a.center + a.half * 0.008, a.y],
              [b.center + b.half * 0.009, b.y],
              [b.center - b.half * 0.009, b.y]
            ],
            '#f1d8a4a8'
          );
      }
      for (let i = 0; i < 22; i++) {
        const cycle = (i / 22 + position / 900) % 1,
          p = cycle * cycle,
          r = rows[Math.min(95, Math.floor(cycle * 96))],
          size = h * (0.002 + p * 0.11),
          x = r.center - r.half * 1.3;
        if (theme === 1) {
          ctx.fillStyle = '#142f2c';
          polygon(
            ctx,
            [
              [x, r.y - size],
              [x - size * 0.32, r.y],
              [x + size * 0.32, r.y]
            ],
            '#183d32'
          );
          polygon(
            ctx,
            [
              [x, r.y - size * 0.72],
              [x - size * 0.4, r.y + size * 0.14],
              [x + size * 0.4, r.y + size * 0.14]
            ],
            '#214b3e'
          );
        } else {
          ctx.strokeStyle = theme === 2 ? '#5db5ca66' : '#ccd9d066';
          ctx.lineWidth = Math.max(1, size * 0.035);
          ctx.beginPath();
          ctx.moveTo(r.center + r.half * 1.05, r.y);
          ctx.lineTo(r.center + r.half * 1.05, r.y - size);
          ctx.lineTo(r.center + r.half * 0.9, r.y - size);
          ctx.stroke();
          if (theme === 2) {
            ctx.fillStyle = '#a1ecff';
            ctx.fillRect(r.center + r.half * 0.89, r.y - size, size * 0.13, size * 0.035);
          }
        }
      }
      // Landmark lighthouse gives the horizon a recognizable destination.
      if (theme === 0) {
        const x = w * 0.8,
          y = h * 0.56,
          s = h * 0.1;
        ctx.fillStyle = '#d4ddd6';
        ctx.fillRect(x, y - s, w * 0.009, s);
        polygon(
          ctx,
          [
            [x - w * 0.003, y - s],
            [x + w * 0.012, y - s],
            [x + w * 0.0045, y - s - h * 0.02]
          ],
          '#273945'
        );
        ctx.fillStyle = '#ffe7b8';
        ctx.fillRect(x, y - s + h * 0.012, w * 0.009, h * 0.008);
      }
      const shade = ctx.createLinearGradient(0, h * 0.65, 0, h);
      shade.addColorStop(0, '#00101b00');
      shade.addColorStop(1, '#00101b80');
      ctx.fillStyle = shade;
      ctx.fillRect(0, h * 0.65, w, h * 0.35);
    }
    function musicStatus() {
      text(
        'rideMusicState',
        muted
          ? 'LOCAL SCORE · OFF'
          : score.state === 'running'
            ? score.live
              ? 'LOCAL ADAPTIVE SCORE'
              : 'LOCAL SCORE · RESTING'
            : score.state === 'unavailable'
              ? 'AUDIO UNAVAILABLE'
              : 'LOCAL SCORE · CLICK TO ENABLE'
      );
      el('rideMusicButton')?.setAttribute('aria-pressed', String(!muted));
      text(
        'rideMusicButton',
        muted
          ? 'ENABLE LOCAL SCORE'
          : score.state === 'running'
            ? 'MUTE LOCAL SCORE'
            : 'RETRY LOCAL SCORE'
      );
    }
    function setVisible(value) {
      if (!value) stopGraphics();
      active = value;
      if (value) ensureGraphics();
      panel.classList.toggle('ride-enabled', value);
      el('rideViewButton')?.setAttribute('aria-pressed', String(value));
      text('rideViewButton', value ? 'METRICS VIEW' : 'RIDE SCENES');
      if (!eligible) score.mute();
      else if (!muted && score.state === 'ready') score.unlock().then(musicStatus);
    }
    function toggle() {
      // Stability hotfix: immersive ride activation is deliberately disabled.
      endRide('stability-safe-mode');
      return false;
      if (active) { endRide('manual'); return false; }
      enabled = true;
      motionSeen = false;
      lastMovingAt = 0;
      forceRide = enabled;
      save();
      state.active = enabled && eligible;
      setVisible(state.active);
      return enabled;
    }
    const api = {
      update(t, o = {}) {
        if (o.session && lastSession && o.session !== lastSession && active) endRide('session-changed');
        if (o.session) lastSession = o.session;
        if (active && o.erg === false && o.session) endRide('exercise-changed');
        eligible = !!o.active;
        const reading = updateRideMetrics(t);
        checkMotion(reading, o);
        const visible = false; // Stability hotfix: cockpit-only; retain telemetry ingestion.
        state.ingest(reading, { ...o, active: visible });
        setVisible(visible);

        coachOptions = o;
        updateCoach();
        updateSoundtrack();
      },
      ingestTelemetry(t) {
        const reading = updateRideMetrics(t);
        checkMotion(reading, { paused: state.paused });
        updateCoach();
        state.ingest(reading, {
          active: state.active,
          paused: state.paused,
          session: state.session
        });
      },
      setMode(mode) {
        eligible = mode === 'performance';
        if (!eligible) {
          if (active) endRide('mode-changed');
          else { forceRide = false; state.active = false; setVisible(false); }
        }
      },
      toggle,
      endRide,
      setIdleSeconds(seconds) {
        const n = clamp(finite(seconds, 20), 5, 180);
        idleSeconds = n;
        localStorage.setItem('nz.rideIdleSeconds', String(n));
        return n;
      },
      applyControl(control) {
        if (!control?.nonce || control.nonce === controlNonce) return false;
        controlNonce = control.nonce;
        if (typeof control.scene === 'string') {
          const index = THEMES.findIndex((t) => t.id === control.scene);
          if (index >= 0) {
            theme = index;
            buildBackground();
            text('rideWorld', THEMES[theme].name);
          }
        }
        if (control.view === 'ride' || control.view === 'lab') {
          if (control.view === 'lab') endRide('remote');
          else { motionSeen = false; lastMovingAt = 0; }
          enabled = control.view === 'ride';
          forceRide = enabled;
          state.active = enabled && eligible;
          setVisible(state.active);
        }
        if (typeof control.wallMusic === 'boolean') {
          muted = !control.wallMusic;
          score.enabled = !muted;
          if (!muted) void score.unlock().then(updateSoundtrack);
          else score.mute();
        }
        if (Number.isFinite(control.volume)) score.volume = clamp(control.volume, 0, 0.7);
        save();
        musicStatus();
        return true;
      },
      snapshot: () => ({
        enabled,
        active,
        theme,
        scene: THEMES[theme].id || String(theme),
        controlNonce,
        muted,
        quality,
        bpm: state.bpm,
        distance: state.distance,
        audioState: score.state,
        audioLive: score.live,
        soundTheme: soundTheme(THEMES[theme].id).name,
        coach: coach.current,
        motion: lastMotion,
        graphics: immersive?.snapshot() || { renderer: 'canvas', workerRunning: false },
        idleSeconds, motionSeen, lastMovingAt, rideError,
        sceneryError
      })
    };
    function checkMotion(t, o = {}) {
      if (!active) return;
      const cadence = finite(t?.cadence ?? t?.rpm);
      const moving = fresh(t) && cadence >= 3 && !o.paused;
      if (moving) { motionSeen = true; lastMovingAt = Date.now(); }
      else if (motionSeen && Date.now() - lastMovingAt >= idleSeconds * 1000) endRide('pm5-idle');
    }
    el('rideViewButton')?.addEventListener('click', toggle);
    el('rideEndNow')?.addEventListener('click', () => endRide('manual'));
    el('rideMusicButton')?.addEventListener('click', async () => {
      if (score.state !== 'running' && !muted) {
        await score.unlock();
      } else {
        muted = !muted;
        score.enabled = !muted;
        if (!muted) await score.unlock();
      }
      save();
      musicStatus();
    });
    el('rideSceneButton')?.addEventListener('click', () => {
      theme = (theme + 1) % THEMES.length;
      save();
      buildBackground();
      text('rideWorld', THEMES[theme].name);
    });
    el('rideVolume')?.addEventListener('input', (e) => {
      score.volume = clamp(finite(e.target.value) / 100, 0, 0.7);
      save();
    });
    if (el('rideVolume')) el('rideVolume').value = score.volume * 100;
    function toggleClock() {
      panel.classList.toggle('ride-show-clock');
      const on = panel.classList.contains('ride-show-clock');
      el('rideClockButton')?.setAttribute('aria-pressed', String(on));
      text('rideClockButton', on ? 'HIDE CLOCK' : 'SHOW CLOCK');
    }
    el('rideClockButton')?.addEventListener('click', toggleClock);
    document.addEventListener('keydown', async (e) => {
      if (
        !eligible ||
        el('setupOverlay')?.classList.contains('open') ||
        el('healthOverlay')?.classList.contains('open')
      )
        return;
      if (
        e.target?.tagName === 'INPUT' ||
        e.target?.tagName === 'TEXTAREA' ||
        e.target?.tagName === 'SELECT'
      )
        return;
      const k = e.key.toLowerCase();
      if (k === 'r') {
        el('rideViewButton')?.click();
      } else if (k === 'm') {
        el('rideMusicButton')?.click();
      } else if (k === 't') {
        toggleClock();
      } else if (k === 'c') {
        el('rideSceneButton')?.click();
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        score.mute();
        state.validUntil = 0;
      }
    });
    root.addEventListener('resize', resize);
    root.addEventListener('pagehide', () => {
      score.mute();
      stopGraphics();
    });
    el('rideViewButton').hidden = false;
    resize();
    text('rideWorld', THEMES[theme].name);
    musicStatus();
    function frame(time) {
      // Ambient mode has no 60fps animation loop; reduce idle CPU pressure.
      if (!active) root.setTimeout(() => frame(root.performance.now()), 1000);
      else root.requestAnimationFrame(frame);
      updateSoundtrack();
      if (active && immersive?.snapshot()?.failed) endRide('graphics-failed');
      if (active && motionSeen && Date.now() - lastMovingAt >= idleSeconds * 1000) endRide('pm5-idle');
      if (!active || document.hidden) {
        last = time;
        return;
      }
      const dt = last ? Math.min(0.1, (time - last) / 1000) : 0;
      last = time;
      const s = state.step(dt);
      updateRideMetrics(null);
      updateCoach();
      lastMotion = s.position;
      if (time - lastDraw >= 1000 / (reduced ? 15 : 30)) {
        const start = root.performance.now();
        try {
          draw(s.position);
        } catch (e) {
          sceneryError = String(e.message || e);
        }
        lastDraw = time;
        paintCost = paintCost * 0.95 + (root.performance.now() - start) * 0.05;
        if (
          ++frames > 120 &&
          paintCost > 26 &&
          !immersive &&
          quality > Math.min(1, 1920 / root.innerWidth)
        ) {
          quality = Math.max(Math.min(1, 1920 / root.innerWidth), quality * 0.9);
          resize();
          frames = 0;
        }
      }
      const route = root.NonZeroRoutes?.progress(THEMES[theme].id, state.distance);
      text(
        'rideLandmark',
        route ? (route.finished ? 'ROUTE COMPLETE' : route.next.name) : THEMES[theme].landmarks[0]
      );
      text(
        'rideLandmarkDetail',
        route
          ? state.lastDistance === null
            ? 'PEDAL TO EXPLORE'
            : route.finished
              ? 'END OF ROUTE · CHOOSE ANOTHER SCENE'
              : Math.ceil(route.remaining / 10) * 10 +
                ' M · ' +
                Math.round(route.elevation) +
                ' M ELEVATION · ROUTE WAYPOINTS'
          : 'PEDAL TO EXPLORE'
      );
      text('ridePhotoCredit', 'CONTINUOUS RIDE · RENDERED GEOGRAPHY');
    }
    const audioTimer = root.setInterval?.(updateSoundtrack, 150);
    root.addEventListener('pagehide', () => root.clearInterval?.(audioTimer));
    root.requestAnimationFrame(frame);
    return api;
  }
  if (root.document) {
    try { localStorage.setItem('nz.rideEnabled', 'false'); } catch (_) {}
    root.NonZeroRide = mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
