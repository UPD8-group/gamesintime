/* Cave Copter for Games in Time (the 2000s hall).

   One button. Hold it and your little sky-pod's rotor lifts you up; let go and you sink. Fly as far as you can
   through an endless cave whose roof and floor wander up and down, and slip past the shiny blocks that hang in
   the middle. Distance is your score, and the cave slowly gets faster and narrower.

   This is the mechanic of the one-button Flash web games of the early 2000s that were played in school computer rooms
   everywhere. The craft, the cave, the colours and the name are our own.

   How the computer builds the cave (see also the 'computer' note):
   - The cave is made of thin columns, each 16 units wide. Each column has a roof height and a floor height.
   - A "centre line" wanders: every so often the computer picks a new target height and the centre line glides
     towards it, but never steeper than the level allows, so the cave is always flyable.
   - The gap between roof and floor starts wide and shrinks as you go. A little random wobble makes the rock rough.
   - Every few hundred units a block is placed inside the gap, always leaving at least one side wide enough to fly
     through.
   - Only the columns you can see are kept, in a ring of 128 slots that is reused as the cave scrolls by.

   Units: the cave is always 400 units tall. The canvas turns units into pixels, so the game plays the same at any
   size. Physics runs in fixed steps of 1/120 of a second so a busy computer and a fast one feel the same. */
(function () {
  'use strict';

  var VH = 400;                  /* the cave is always 400 units tall */
  var COL = 16;                  /* width of one cave column, in units */
  var NCOL = 160;                /* how many columns we remember (a ring that is reused) */
  var STEP = 1 / 120;            /* one physics step, in seconds */
  var GRAV = 1150;               /* how hard you sink when you let go (units per second, per second) */
  var LIFT = 1300;               /* how hard the rotor pulls you up while you hold */
  var UP_MAX = 330, DOWN_MAX = 390;
  var HIT_W = 13, HIT_H = 8;     /* half the size of the crash box: smaller than the drawing, to be kind */
  var START_FREE = 900;          /* no blocks in the first stretch */
  var RAMP = 9000;               /* the cave reaches top speed and its narrowest after this many units */
  var LEVELS = {
    easy:   { label: 'Easy',   speed: 185, maxSpeed: 300, gap: 280, minGap: 190, every: 580, blockH: 70, clear: 105, slope: 0.30 },
    normal: { label: 'Normal', speed: 225, maxSpeed: 365, gap: 235, minGap: 152, every: 450, blockH: 84, clear: 86,  slope: 0.38 },
    hard:   { label: 'Hard',   speed: 265, maxSpeed: 430, gap: 205, minGap: 128, every: 360, blockH: 92, clear: 72,  slope: 0.46 }
  };
  var LEVEL_KEYS = ['easy', 'normal', 'hard'];
  var NSMOKE = 48, NBURST = 28, NFLOAT = 4, NBLOCK = 10;

  /* ---------- colour helpers: every colour comes from the hall's CSS variables ---------- */
  function parseColour(s) {
    s = String(s || '').trim();
    var m;
    if (s.charAt(0) === '#') {
      var x = s.slice(1);
      if (x.length === 3) x = x.split('').map(function (c) { return c + c; }).join('');
      if (x.length >= 6) return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
    }
    if ((m = s.match(/^rgba?\(([^)]+)\)$/i))) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      if (p.length >= 3) return [p[0], p[1], p[2]];
    }
    return [128, 128, 128];
  }
  function rgba(s, a) { var c = parseColour(s); return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }
  function mix(s1, s2, t) {
    var a = parseColour(s1), b = parseColour(s2);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  /* A small seeded random so the background bubbles stay in the same place every time. */
  function seeded(seed) {
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  var CSS =
    '.game-cave-copter { --cc-chrome-hi: color-mix(in srgb, var(--ink) 92%, var(--gold)); --cc-chrome-lo: color-mix(in srgb, var(--ink-faint) 80%, var(--bg)); }' +
    '.game-cave-copter .cc-shell { max-width: 1040px; margin: 0 auto; border-radius: 24px; padding: 8px; ' +
      'background: linear-gradient(180deg, var(--cc-chrome-hi) 0%, color-mix(in srgb, var(--ink-faint) 60%, var(--ink)) 48%, var(--cc-chrome-lo) 52%, color-mix(in srgb, var(--ink-faint) 50%, var(--ink)) 100%); ' +
      'box-shadow: 0 0 0 1px color-mix(in srgb, var(--gold) 45%, transparent), 0 0 34px color-mix(in srgb, var(--gold) 28%, transparent), 0 22px 50px rgba(0, 0, 0, .5); }' +
    '.game-cave-copter .cc-title { display: flex; align-items: center; gap: 10px; padding: 4px 12px 8px; color: var(--on-era); }' +
    '.game-cave-copter .cc-orbs { display: flex; gap: 6px; }' +
    '.game-cave-copter .cc-orb { width: 14px; height: 14px; border-radius: 50%; box-shadow: inset 0 -3px 4px rgba(0, 0, 0, .25), inset 0 2px 2px rgba(255, 255, 255, .8), 0 1px 2px rgba(0, 0, 0, .3); }' +
    '.game-cave-copter .cc-orb:nth-child(1) { background: var(--rose); } .game-cave-copter .cc-orb:nth-child(2) { background: var(--leaf); } .game-cave-copter .cc-orb:nth-child(3) { background: var(--gold); }' +
    '.game-cave-copter .cc-name { font-family: var(--font-poster); font-weight: 900; letter-spacing: .14em; text-transform: uppercase; font-size: .95rem; text-shadow: 0 1px 0 rgba(255, 255, 255, .7); margin: 0; flex: 1; text-align: center; }' +
    '.game-cave-copter .cc-url { font-family: var(--font-mono); font-size: .72rem; opacity: .7; white-space: nowrap; }' +
    '.game-cave-copter .cc-stage { position: relative; border-radius: 14px; overflow: hidden; background: var(--bg); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--bg) 70%, var(--gold)), inset 0 4px 16px rgba(0, 0, 0, .6); }' +
    '.game-cave-copter .cc-canvas { display: block; width: 100%; height: 300px; touch-action: auto; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; cursor: pointer; }' +
    '.game-cave-copter .is-flying .cc-canvas { touch-action: none; }' +
    '.game-cave-copter .cc-canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }' +
    '.game-cave-copter .cc-overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: 10px; background: color-mix(in srgb, var(--bg) 35%, transparent); }' +
    '.game-cave-copter .cc-overlay[hidden] { display: none; }' +
    '.game-cave-copter .cc-card { position: relative; overflow: hidden; text-align: center; display: grid; gap: .55rem; justify-items: center; max-width: 28rem; max-height: 100%; overflow-y: auto; padding: .9rem 1.2rem 1rem; border-radius: 20px; color: var(--ink); ' +
      'background: linear-gradient(180deg, color-mix(in srgb, var(--surface-2) 92%, var(--gold)) 0%, var(--surface) 55%, color-mix(in srgb, var(--surface) 80%, var(--bg)) 100%); border: 1px solid color-mix(in srgb, var(--gold) 55%, transparent); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .25), 0 12px 30px rgba(0, 0, 0, .5); }' +
    '.game-cave-copter .cc-card::before { content: ""; position: absolute; left: 8px; right: 8px; top: 4px; height: 38%; border-radius: 16px 16px 40% 40%; background: linear-gradient(180deg, rgba(255, 255, 255, .16), rgba(255, 255, 255, 0)); pointer-events: none; }' +
    '.game-cave-copter .cc-card-title { margin: 0; font-family: var(--font-poster); font-weight: 900; text-transform: uppercase; letter-spacing: .08em; font-size: clamp(1.5rem, 1.1rem + 2vw, 2.4rem); line-height: 1; color: var(--gold); text-shadow: 0 2px 0 var(--gold-shadow), 0 0 18px color-mix(in srgb, var(--gold) 50%, transparent); }' +
    '.game-cave-copter .cc-msg { margin: 0; font-weight: 600; line-height: 1.35; }' +
    '.game-cave-copter .cc-sub { margin: 0; color: var(--ink-muted); font-size: .92rem; }' +
    '.game-cave-copter .cc-sub:empty { display: none; }' +
    '.game-cave-copter .cc-btn { position: relative; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; gap: .4rem; min-height: 44px; padding: .45rem 1.2rem; border-radius: 999px; cursor: pointer; ' +
      'font-family: var(--font-head); font-weight: 800; font-size: 1rem; color: var(--on-era); border: 1px solid color-mix(in srgb, var(--peacock) 70%, var(--bg)); ' +
      'background: linear-gradient(180deg, color-mix(in srgb, var(--gold) 45%, var(--ink)) 0%, var(--gold) 50%, color-mix(in srgb, var(--gold) 70%, var(--peacock)) 51%, var(--gold) 100%); ' +
      'box-shadow: inset 0 1px 0 rgba(255, 255, 255, .8), inset 0 -2px 4px rgba(0, 0, 0, .2), 0 2px 6px rgba(0, 0, 0, .35); touch-action: manipulation; transition: filter .12s, transform .12s; }' +
    '.game-cave-copter .cc-btn:hover { filter: brightness(1.08); }' +
    '.game-cave-copter .cc-btn:active { transform: translateY(1px); filter: brightness(.95); }' +
    '.game-cave-copter .cc-btn:disabled { opacity: .5; cursor: not-allowed; filter: grayscale(.4); }' +
    '.game-cave-copter .cc-btn:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }' +
    '.game-cave-copter .cc-go { min-height: 54px; font-size: 1.2rem; padding-inline: 1.8rem; border-color: color-mix(in srgb, var(--leaf) 60%, var(--bg)); ' +
      'background: linear-gradient(180deg, color-mix(in srgb, var(--leaf) 45%, var(--ink)) 0%, var(--leaf) 50%, color-mix(in srgb, var(--leaf) 78%, var(--bg)) 51%, var(--leaf) 100%); }' +
    '.game-cave-copter .cc-seg { display: inline-flex; border-radius: 999px; padding: 3px; gap: 3px; background: color-mix(in srgb, var(--bg) 70%, var(--surface)); box-shadow: inset 0 2px 4px rgba(0, 0, 0, .5); }' +
    '.game-cave-copter .cc-seg[hidden] { display: none; }' +
    '.game-cave-copter .cc-seg button { min-height: 40px; min-width: 44px; padding: .3rem .9rem; border: 0; border-radius: 999px; background: transparent; color: var(--ink-muted); font: 700 .95rem var(--font-head); cursor: pointer; }' +
    '.game-cave-copter .cc-seg button[aria-pressed="true"] { color: var(--on-era); background: linear-gradient(180deg, color-mix(in srgb, var(--gold) 45%, var(--ink)) 0%, var(--gold) 50%, color-mix(in srgb, var(--gold) 70%, var(--peacock)) 51%, var(--gold) 100%); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .7), 0 1px 3px rgba(0, 0, 0, .4); }' +
    '.game-cave-copter .cc-seg button:focus-visible { outline: 3px solid var(--focus); outline-offset: 1px; }' +
    '.game-cave-copter .cc-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem .8rem; padding: 8px 6px 2px; color: var(--on-era); }' +
    '.game-cave-copter .cc-tools { display: flex; flex-wrap: wrap; gap: .5rem; }' +
    '.game-cave-copter .cc-score { display: flex; flex-wrap: wrap; gap: .3rem 1rem; font-weight: 800; font-variant-numeric: tabular-nums; }' +
    '.game-cave-copter .cc-score span { display: inline-flex; align-items: baseline; gap: .35rem; }' +
    '.game-cave-copter .cc-score strong { font-family: var(--font-poster); font-size: 1.15rem; }' +
    '.game-cave-copter .game-note { text-align: center; }' +
    '@media (max-width: 480px) { .game-cave-copter .cc-shell { padding: 5px; border-radius: 18px; } .game-cave-copter .cc-url { display: none; } .game-cave-copter .cc-card { padding: .6rem .7rem .7rem; gap: .4rem; } .game-cave-copter .cc-msg { font-size: .9rem; } .game-cave-copter .cc-go { min-height: 48px; font-size: 1.05rem; } .game-cave-copter .cc-seg button { padding-inline: .6rem; } .game-cave-copter .cc-btn { padding-inline: .9rem; } }';

  GamesInTime.register({
    id: 'cave-copter',
    frame: 'none',
    mount: function (root, api) {
      var h = api.h;
      var destroyed = false;
      var reduced = !!api.reducedMotion;
      var levelKey = api.store.get('level', 'normal');
      if (!LEVELS[levelKey]) levelKey = 'normal';
      var L = LEVELS[levelKey];
      var best = {};
      LEVEL_KEYS.forEach(function (k) { best[k] = Number(api.store.get('best-' + k, 0)) || 0; });

      /* ---------- the page parts ---------- */
      root.appendChild(h('style', null, CSS));
      var levelBtns = {};
      var levelSeg = h('div', { class: 'cc-seg', role: 'group', 'aria-label': 'Level' }, LEVEL_KEYS.map(function (k) {
        levelBtns[k] = h('button', { type: 'button', 'aria-pressed': String(k === levelKey), onclick: function () { setLevel(k); } }, LEVELS[k].label);
        return levelBtns[k];
      }));
      var canvas = h('canvas', { class: 'cc-canvas', role: 'img', tabindex: '0', 'aria-label': 'A little flying pod waits at the mouth of a glowing cave.' });
      var ovTitle = h('p', { class: 'cc-card-title' }, 'Cave Copter');
      var ovMsg = h('p', { class: 'cc-msg' }, '');
      var ovSub = h('p', { class: 'cc-sub' }, '');
      var ovBtn = h('button', { class: 'cc-btn cc-go', type: 'button', onclick: function () { overlayAction(); } }, '▶ Play');
      var overlay = h('div', { class: 'cc-overlay' }, h('div', { class: 'cc-card' }, ovTitle, ovMsg, levelSeg, ovBtn, ovSub));
      var stage = h('div', { class: 'cc-stage' }, canvas, overlay);
      var pauseBtn = h('button', { class: 'cc-btn', type: 'button', disabled: true, onclick: function () { togglePause(); } }, 'Pause');
      var newBtn = h('button', { class: 'cc-btn', type: 'button', onclick: function () { newGame(); } }, 'New game');
      var distEl = h('strong', null, '0 m'), bestEl = h('strong', null, best[levelKey] + ' m');
      var shell = h('div', { class: 'cc-shell' },
        h('div', { class: 'cc-title' },
          h('span', { class: 'cc-orbs', 'aria-hidden': 'true' }, h('span', { class: 'cc-orb' }), h('span', { class: 'cc-orb' }), h('span', { class: 'cc-orb' })),
          h('p', { class: 'cc-name' }, 'Cave Copter'),
          h('span', { class: 'cc-url', 'aria-hidden': 'true' }, 'games.htm')),
        stage,
        h('div', { class: 'cc-bar' },
          h('div', { class: 'cc-tools' }, pauseBtn, newBtn),
          h('div', { class: 'cc-score' }, h('span', null, 'Distance ', distEl), h('span', null, 'Best ', bestEl))));
      var note = h('p', { class: 'game-note' }, 'Hold to rise, let go to fall. Mouse: hold the button. Touch: hold a finger on the cave. Keyboard: hold Space or the Up arrow. P pauses.');
      root.appendChild(shell);
      root.appendChild(note);

      var ctx = canvas.getContext('2d');
      var bg = document.createElement('canvas');
      var W = 600, H = 300, dpr = 1, S = 1, VW = 800, craftX = 180;   /* VW: how wide the view is, in units */
      var C = {}, FONT = 'sans-serif';
      var roofGrad = null, floorGrad = null;

      function readColours() {
        var cs = getComputedStyle(root);
        function v(n, fb) { var s = cs.getPropertyValue(n).trim(); return s || fb; }
        C.bg = v('--bg', '#061423'); C.bg2 = v('--bg-2', C.bg); C.surface = v('--surface', C.bg2); C.surface2 = v('--surface-2', C.surface);
        C.ink = v('--ink', '#eef7ff'); C.muted = v('--ink-muted', C.ink); C.faint = v('--ink-faint', C.muted);
        C.gold = v('--gold', '#3fd0ff'); C.peacock = v('--peacock', '#0095b6'); C.cobalt = v('--cobalt', '#5b8cff');
        C.rose = v('--rose', '#ff6ec7'); C.leaf = v('--leaf', '#b4f000'); C.onEra = v('--on-era', '#031422');
        C.wallDeep = mix(C.bg, C.peacock, 0.5);
        C.wallMid = mix(C.peacock, C.gold, 0.3);
        C.wallEdge = mix(C.leaf, C.ink, 0.15);
        C.wallShine = rgba(C.ink, 0.3);
        C.wallShadow = rgba(C.bg, 0.4);
        C.glint = rgba(mix(C.gold, C.ink, 0.5), 0.4);
        C.far = rgba(mix(C.cobalt, C.bg, 0.62), 0.9);
        C.farRim = rgba(C.cobalt, 0.35);
        C.mid = rgba(mix(C.gold, C.ink, 0.4), 0.4);
        C.block = C.rose; C.blockDark = mix(C.rose, C.bg, 0.45); C.blockShine = rgba(C.ink, 0.45);
        C.smoke = mix(C.ink, C.gold, 0.15);
        FONT = (cs.getPropertyValue('--font-poster').trim() || "'Arial Black', sans-serif");
      }

      /* ---------- game state ---------- */
      var state = 'idle';     /* idle | ready | playing | paused | crashed | over */
      var fresh = true;       /* true when the next press starts a brand new flight */
      var cy = VH / 2, vy = 0, dist = 0, speed = 0, acc = 0, lastT = 0, clock = 0;
      var rotor = 0, chopT = 0, smokeT = 0, crashT = 0, shakeT = 0, lastMilestone = 0, passedBest = false, statusStep = -1, shownM = -1;
      var holdPointers = 0, keyHeld = false, pointerIds = {};
      var rafId = 0;
      var hudDist = '0 m', hudBest = '';

      /* the cave: roof and floor heights at each column edge, in a reused ring */
      var roof = new Float32Array(NCOL), floor = new Float32Array(NCOL);
      var genUpTo = -1;
      var gen = { centre: VH / 2, target: VH / 2, leg: 0, rj: 0, fj: 0, nextBlock: START_FREE };
      /* blocks, smoke puffs, crash bits and floating words live in fixed pools so nothing is created while flying */
      var blocks = []; for (var bi = 0; bi < NBLOCK; bi++) blocks.push({ on: false, x: 0, y: 0, w: 26, h: 60 });
      var smoke = []; for (var si = 0; si < NSMOKE; si++) smoke.push({ on: false, x: 0, y: 0, r: 4, age: 0, life: 1 });
      var bits = []; for (var pi = 0; pi < NBURST; pi++) bits.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, star: false, r: 3 });
      var floats = []; for (var fi = 0; fi < NFLOAT; fi++) floats.push({ on: false, text: '', x: 0, y: 0, age: 0, colour: '' });
      var smokeNext = 0, bitNext = 0, floatNext = 0;

      function rnd() { return api.random(); }
      /* api.tone plays one synthesised note; older copies of the site may not have it */
      function tone(f, d, t, v) { if (typeof api.tone === 'function') api.tone(f, d, t, v); }

      /* ---------- building the cave ---------- */
      function resetCave() {
        genUpTo = -1;
        gen.centre = VH / 2; gen.target = VH / 2; gen.leg = 0; gen.rj = 0; gen.fj = 0; gen.nextBlock = START_FREE;
        for (var i = 0; i < NBLOCK; i++) blocks[i].on = false;
        ensureCave();
      }
      /* Make sure every column edge from the craft's left to just past the right of the screen exists. */
      function ensureCave() {
        var need = Math.floor((dist + VW) / COL) + 3;
        while (genUpTo < need) { genUpTo++; genVertex(genUpTo); }
      }
      function gapAt(x) { var p = Math.min(1, x / RAMP); return L.gap - (L.gap - L.minGap) * p; }
      function genVertex(i) {
        var x = i * COL, slot = i % NCOL;
        var p = Math.min(1, x / RAMP);
        var gap = gapAt(x);
        var lo = gap / 2 + 12, hi = VH - gap / 2 - 12;
        if (x < 480) { gen.target = VH / 2; }
        else if (--gen.leg <= 0) {
          /* pick a new height for the middle of the cave to glide towards */
          gen.target = lo + rnd() * (hi - lo);
          gen.leg = 10 + Math.floor(rnd() * 26);
        }
        gen.target = clamp(gen.target, lo, hi);
        /* glide towards the target, never steeper than the level's slope (so it is always flyable) */
        var maxStep = L.slope * COL * (0.65 + 0.35 * p);
        gen.centre += clamp((gen.target - gen.centre) * 0.14, -maxStep, maxStep);
        gen.centre = clamp(gen.centre, lo, hi);
        /* rough rock: a small wobble that wanders on its own */
        var rough = x < 480 ? 3 : 9;
        gen.rj = clamp(gen.rj + (rnd() - 0.5) * 7, -rough, rough);
        gen.fj = clamp(gen.fj + (rnd() - 0.5) * 7, -rough, rough);
        var top = gen.centre - gap / 2 + gen.rj, bot = gen.centre + gap / 2 + gen.fj;
        roof[slot] = clamp(top, 6, VH - 40);
        floor[slot] = clamp(bot, roof[slot] + gap - 14, VH - 6);
        if (x >= gen.nextBlock) placeBlock(x + COL, roof[slot], floor[slot]);
      }
      function placeBlock(x, top, bot) {
        var room = bot - top;
        var bh = Math.min(L.blockH, room - L.clear - 18);
        gen.nextBlock = x + L.every * (0.7 + rnd() * 0.6) * (1 - 0.22 * Math.min(1, x / RAMP));
        if (bh < 28) return;
        var b = null;
        for (var i = 0; i < NBLOCK; i++) if (!blocks[i].on) { b = blocks[i]; break; }
        if (!b) return;
        /* the block hangs somewhere in the gap, always leaving at least one side as wide as "clear" */
        var slack = room - bh - L.clear - 9;
        var y = rnd() < 0.5 ? top + L.clear + rnd() * slack : bot - L.clear - bh - rnd() * slack;
        b.on = true; b.x = x; b.w = 26; b.h = bh; b.y = clamp(y, top + 4, bot - bh - 4);
      }
      function edge(arr, x) {
        var f = x / COL, i = Math.floor(f), t = f - i;
        var a = arr[((i % NCOL) + NCOL) % NCOL], b = arr[(((i + 1) % NCOL) + NCOL) % NCOL];
        return a + (b - a) * t;
      }

      /* ---------- layout ---------- */
      function resize() {
        var w = Math.max(240, Math.round(stage.clientWidth || 600));
        var vh = window.innerHeight || 800;
        var hh = w < 520 ? Math.round(clamp(w * 0.95, 240, Math.max(240, vh * 0.62))) : Math.round(clamp(w * 0.5, 300, Math.max(300, Math.min(580, vh * 0.68))));
        if (w / hh > 3) hh = Math.round(w / 3);
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = w; H = hh; S = H / VH; VW = W / S;
        /* the craft keeps its place in the cave if the screen turns mid-flight */
        if (state === 'idle' || state === 'over') craftX = clamp(VW * 0.24, 100, 200);
        else craftX = Math.min(craftX, VW * 0.45);
        canvas.style.height = hh + 'px';
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr);
        readColours();
        buildBackground();
        roofGrad = ctx.createLinearGradient(0, 0, 0, VH * 0.42);
        roofGrad.addColorStop(0, C.wallDeep); roofGrad.addColorStop(1, C.wallMid);
        floorGrad = ctx.createLinearGradient(0, VH, 0, VH * 0.58);
        floorGrad.addColorStop(0, C.wallDeep); floorGrad.addColorStop(1, C.wallMid);
        ensureCave();
        draw(performance.now());
        if (!overlay.hidden) fitCard();
      }
      /* The sky behind the cave: a deep blue glow, a faint grid and big soft bubbles, drawn once. */
      function buildBackground() {
        bg.width = canvas.width; bg.height = canvas.height;
        var b = bg.getContext('2d');
        b.setTransform(dpr, 0, 0, dpr, 0, 0);
        var g = b.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, mix(C.bg, C.cobalt, 0.22)); g.addColorStop(0.55, C.bg); g.addColorStop(1, mix(C.bg, C.peacock, 0.3));
        b.fillStyle = g; b.fillRect(0, 0, W, H);
        b.strokeStyle = rgba(C.gold, 0.07); b.lineWidth = 1;
        var step = Math.max(24, H / 10), x, y;
        for (x = 0; x < W; x += step) { b.beginPath(); b.moveTo(x + 0.5, 0); b.lineTo(x + 0.5, H); b.stroke(); }
        for (y = 0; y < H; y += step) { b.beginPath(); b.moveTo(0, y + 0.5); b.lineTo(W, y + 0.5); b.stroke(); }
        var r = seeded(2004);
        for (var i = 0; i < 9; i++) {
          var bx = r() * W, by = r() * H, br = (0.06 + r() * 0.14) * H;
          var rg = b.createRadialGradient(bx - br * 0.3, by - br * 0.3, br * 0.1, bx, by, br);
          rg.addColorStop(0, rgba(i % 2 ? C.gold : C.rose, 0.16)); rg.addColorStop(1, rgba(C.bg, 0));
          b.fillStyle = rg; b.beginPath(); b.arc(bx, by, br, 0, Math.PI * 2); b.fill();
        }
      }

      /* ---------- drawing ---------- */
      function rr(x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
      /* far-away rock spires: a wavy shape that scrolls at a third of the speed (parallax) */
      function farHeight(x, top) { return (top ? 46 : 40) + Math.sin(x * 0.011 + (top ? 1.3 : 0)) * 22 + Math.sin(x * 0.027 + (top ? 0 : 2.1)) * 12 + Math.sin(x * 0.061) * 5; }
      function drawFar() {
        var off = dist * 0.33, stepU = 12, x;
        ctx.fillStyle = C.far;
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (x = 0; x <= VW + stepU; x += stepU) ctx.lineTo(x, farHeight(x + off, true));
        ctx.lineTo(VW + stepU, 0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, VH);
        for (x = 0; x <= VW + stepU; x += stepU) ctx.lineTo(x, VH - farHeight(x + off, false));
        ctx.lineTo(VW + stepU, VH); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = C.farRim; ctx.lineWidth = 2;
        ctx.beginPath();
        for (x = 0; x <= VW + stepU; x += stepU) { if (x === 0) ctx.moveTo(x, farHeight(x + off, true)); else ctx.lineTo(x, farHeight(x + off, true)); }
        for (x = 0; x <= VW + stepU; x += stepU) { if (x === 0) ctx.moveTo(x, VH - farHeight(x + off, false)); else ctx.lineTo(x, VH - farHeight(x + off, false)); }
        ctx.stroke();
      }
      /* floating sparkles between the far rocks and the cave: they slide past at 60% speed (more parallax) */
      function drawMid() {
        var off = dist * 0.6, loop = 1800;
        ctx.fillStyle = C.mid;
        for (var i = 0; i < 22; i++) {
          var x = ((hash(i, 7) * loop - off) % loop + loop) % loop - 20;
          if (x > VW + 10) continue;
          diamond(x, 30 + hash(i, 8) * (VH - 60), 2 + hash(i, 9) * 3.5);
        }
      }
      /* the same column always gets the same sparkle, so the rock does not flicker */
      function hash(i, s) { var x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); }
      function drawCave() {
        var first = Math.floor(dist / COL), last = Math.ceil((dist + VW) / COL) + 1, i, sx;
        if (last > genUpTo) last = genUpTo;
        /* roof */
        ctx.fillStyle = roofGrad;
        ctx.beginPath(); ctx.moveTo(first * COL - dist, -2);
        for (i = first; i <= last; i++) ctx.lineTo(i * COL - dist, roof[i % NCOL]);
        ctx.lineTo(last * COL - dist, -2); ctx.closePath(); ctx.fill();
        /* floor */
        ctx.fillStyle = floorGrad;
        ctx.beginPath(); ctx.moveTo(first * COL - dist, VH + 2);
        for (i = first; i <= last; i++) ctx.lineTo(i * COL - dist, floor[i % NCOL]);
        ctx.lineTo(last * COL - dist, VH + 2); ctx.closePath(); ctx.fill();
        /* crystal glints in the rock */
        ctx.fillStyle = C.glint;
        for (i = first; i <= last; i++) {
          sx = i * COL - dist;
          if (hash(i, 1) < 0.3) { var gy = roof[i % NCOL] - 16 - hash(i, 2) * 80, gs = 3 + hash(i, 3) * 5; if (gy > gs) diamond(sx, gy, gs); }
          if (hash(i, 4) < 0.3) { var fy = floor[i % NCOL] + 16 + hash(i, 5) * 80, fs = 3 + hash(i, 6) * 5; if (fy < VH - fs) diamond(sx, fy, fs); }
        }
        /* a soft shadow just inside the cave, so the rock stands out */
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.strokeStyle = C.wallShadow; ctx.lineWidth = 9;
        ctx.beginPath();
        for (i = first; i <= last; i++) { sx = i * COL - dist; if (i === first) ctx.moveTo(sx, roof[i % NCOL] + 5); else ctx.lineTo(sx, roof[i % NCOL] + 5); }
        for (i = first; i <= last; i++) { sx = i * COL - dist; if (i === first) ctx.moveTo(sx, floor[i % NCOL] - 5); else ctx.lineTo(sx, floor[i % NCOL] - 5); }
        ctx.stroke();
        /* glossy rims: a bright lime edge with a soft shine just inside the rock */
        ctx.strokeStyle = C.wallShine; ctx.lineWidth = 3;
        ctx.beginPath();
        for (i = first; i <= last; i++) { sx = i * COL - dist; if (i === first) ctx.moveTo(sx, roof[i % NCOL] - 6); else ctx.lineTo(sx, roof[i % NCOL] - 6); }
        for (i = first; i <= last; i++) { sx = i * COL - dist; if (i === first) ctx.moveTo(sx, floor[i % NCOL] + 6); else ctx.lineTo(sx, floor[i % NCOL] + 6); }
        ctx.stroke();
        ctx.strokeStyle = C.wallEdge; ctx.lineWidth = 3.2;
        ctx.beginPath();
        for (i = first; i <= last; i++) { sx = i * COL - dist; if (i === first) ctx.moveTo(sx, roof[i % NCOL]); else ctx.lineTo(sx, roof[i % NCOL]); }
        for (i = first; i <= last; i++) { sx = i * COL - dist; if (i === first) ctx.moveTo(sx, floor[i % NCOL]); else ctx.lineTo(sx, floor[i % NCOL]); }
        ctx.stroke();
      }
      function diamond(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.6, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.6, y); ctx.closePath(); ctx.fill(); }
      function drawBlocks() {
        for (var i = 0; i < NBLOCK; i++) {
          var b = blocks[i];
          if (!b.on) continue;
          var sx = b.x - dist;
          if (sx + b.w < -40) { b.on = false; continue; }
          if (sx > VW + 10) continue;
          ctx.fillStyle = C.blockDark; rr(sx, b.y + 3, b.w, b.h, 8); ctx.fill();
          ctx.fillStyle = C.block; rr(sx, b.y, b.w, b.h - 2, 8); ctx.fill();
          ctx.fillStyle = C.blockShine; rr(sx + 4, b.y + 4, b.w * 0.34, b.h - 14, 5); ctx.fill();
          ctx.strokeStyle = rgba(C.ink, 0.6); ctx.lineWidth = 1.5; rr(sx, b.y, b.w, b.h - 2, 8); ctx.stroke();
        }
      }
      function drawBestFlag() {
        var bu = best[levelKey] * 10;
        if (bu < 200) return;
        var sx = bu + craftX - dist;
        if (sx < -20 || sx > VW + 20) return;
        var top = edge(roof, bu + craftX), bot = edge(floor, bu + craftX);
        ctx.strokeStyle = rgba(C.leaf, 0.75); ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(sx, top); ctx.lineTo(sx, bot); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = '900 11px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        var fw = ctx.measureText('BEST').width + 16;
        ctx.fillStyle = C.leaf;
        ctx.beginPath(); ctx.moveTo(sx, top + 4); ctx.lineTo(sx + fw, top + 4); ctx.lineTo(sx + fw - 6, top + 13); ctx.lineTo(sx + fw, top + 22); ctx.lineTo(sx, top + 22); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C.onEra;
        ctx.fillText('BEST', sx + 4, top + 13.5);
      }
      function drawSmoke() {
        for (var i = 0; i < NSMOKE; i++) {
          var p = smoke[i];
          if (!p.on) continue;
          var k = p.age / p.life;
          ctx.globalAlpha = 0.42 * (1 - k);
          ctx.fillStyle = C.smoke;
          ctx.beginPath(); ctx.arc(p.x - dist, p.y, p.r * (1 + k * 1.6), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      function drawBits() {
        for (var i = 0; i < NBURST; i++) {
          var p = bits[i];
          if (!p.on) continue;
          var k = p.age / p.life;
          ctx.globalAlpha = 1 - k;
          if (p.star) {
            ctx.fillStyle = i % 3 === 0 ? C.leaf : i % 3 === 1 ? C.gold : C.rose;
            star(p.x - dist, p.y, p.r, p.age * 6);
          } else {
            ctx.fillStyle = C.smoke;
            ctx.beginPath(); ctx.arc(p.x - dist, p.y, p.r * (1 + k), 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }
      function star(x, y, r, a) {
        ctx.beginPath();
        for (var i = 0; i < 10; i++) {
          var rad = i % 2 ? r * 0.45 : r, ang = a + i * Math.PI / 5;
          if (i === 0) ctx.moveTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad); else ctx.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad);
        }
        ctx.closePath(); ctx.fill();
      }
      /* The sky-pod: a round glassy body, a tail boom with a fin, skids, and a rotor that blurs as it spins. */
      function drawCraft(x, y, tilt, crashed) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        /* tail boom and fin */
        ctx.fillStyle = mix(C.gold, C.bg, 0.25);
        ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-30, -2); ctx.lineTo(-30, 2); ctx.lineTo(-8, 5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C.rose;
        ctx.beginPath(); ctx.moveTo(-26, -1); ctx.lineTo(-33, -11); ctx.lineTo(-28, -11); ctx.lineTo(-21, -1); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(-31, 1, 3.2, 0, Math.PI * 2); ctx.fill();
        /* skids */
        ctx.strokeStyle = mix(C.ink, C.faint, 0.4); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-9, 10); ctx.lineTo(-6, 15); ctx.moveTo(7, 10); ctx.lineTo(5, 15); ctx.moveTo(-14, 15); ctx.lineTo(13, 15); ctx.stroke();
        /* body */
        ctx.fillStyle = C.gold;
        ctx.beginPath(); ctx.ellipse(0, 0, 16, 12.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = mix(C.gold, C.peacock, 0.55);
        ctx.beginPath(); ctx.ellipse(0, 4, 15, 8, 0, 0, Math.PI); ctx.fill();
        /* window */
        ctx.fillStyle = mix(C.bg, C.cobalt, 0.35);
        ctx.beginPath(); ctx.ellipse(6, -2.5, 7.5, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(C.ink, 0.85);
        ctx.beginPath(); ctx.ellipse(8.5, -5, 2.6, 1.6, -0.4, 0, Math.PI * 2); ctx.fill();
        /* gloss */
        ctx.fillStyle = rgba(C.ink, 0.45);
        ctx.beginPath(); ctx.ellipse(-5, -7, 6, 2.6, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = rgba(C.bg, 0.55); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(0, 0, 16, 12.5, 0, 0, Math.PI * 2); ctx.stroke();
        /* rotor mast and blades */
        ctx.fillStyle = mix(C.ink, C.faint, 0.4);
        ctx.fillRect(-1.5, -17, 3, 5.5);
        if (!crashed) {
          var span = 25 * Math.abs(Math.cos(rotor));
          ctx.strokeStyle = rgba(C.ink, 0.9); ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.moveTo(-span, -17); ctx.lineTo(span, -17); ctx.stroke();
          ctx.strokeStyle = rgba(C.ink, 0.22); ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(-25, -17); ctx.lineTo(25, -17); ctx.stroke();
        } else {
          ctx.strokeStyle = rgba(C.ink, 0.9); ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.moveTo(-14, -21); ctx.lineTo(16, -14); ctx.stroke();
        }
        ctx.fillStyle = C.leaf; ctx.beginPath(); ctx.arc(0, -17.5, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      function pill(x, y, w, hh, fill) {
        ctx.fillStyle = fill; rr(x, y, w, hh, hh / 2); ctx.fill();
        ctx.fillStyle = rgba(C.ink, 0.12); rr(x + 4, y + 2, w - 8, hh * 0.4, hh * 0.2); ctx.fill();
      }
      /* The distance and best, drawn in screen pixels so they stay readable on a small phone. */
      function drawHud(ox, oy) {
        ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
        var big = W < 520 ? 16 : 19, small = W < 520 ? 12 : 14;
        ctx.textBaseline = 'middle';
        ctx.font = '900 ' + big + 'px ' + FONT;
        var tw = ctx.measureText(hudDist).width;
        pill(8, 8, tw + 24, big + 14, rgba(C.bg, 0.75));
        ctx.fillStyle = C.gold; ctx.textAlign = 'left'; ctx.fillText(hudDist, 20, 8 + (big + 14) / 2 + 1);
        if (hudBest) {
          ctx.font = '800 ' + small + 'px ' + FONT;
          var bw = ctx.measureText(hudBest).width;
          pill(W - bw - 30, 10, bw + 22, small + 12, rgba(C.bg, 0.75));
          ctx.fillStyle = C.leaf; ctx.textAlign = 'right'; ctx.fillText(hudBest, W - 19, 10 + (small + 12) / 2 + 1);
        }
        ctx.setTransform(dpr * S, 0, 0, dpr * S, ox * dpr, oy * dpr);
      }
      function drawFloats() {
        for (var i = 0; i < NFLOAT; i++) {
          var f = floats[i];
          if (!f.on) continue;
          var k = f.age / 1.1;
          ctx.globalAlpha = 1 - k * k;
          ctx.font = '900 18px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 4; ctx.strokeStyle = rgba(C.bg, 0.8); ctx.strokeText(f.text, f.x, f.y - (reduced ? 0 : k * 24));
          ctx.fillStyle = f.colour; ctx.fillText(f.text, f.x, f.y - (reduced ? 0 : k * 24));
        }
        ctx.globalAlpha = 1;
      }
      /* The early-2000s web-game start screen, drawn on the canvas: "Click and hold". */
      function drawPrompt(now) {
        var pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(now / 260);
        var bw = Math.min(VW - 40, 330), bh = 108, bx = (VW - bw) / 2 + Math.min(60, VW * 0.08), by = VH / 2 - bh / 2 - 20;
        ctx.fillStyle = rgba(C.bg, 0.78); rr(bx, by, bw, bh, 22); ctx.fill();
        ctx.strokeStyle = rgba(C.gold, 0.7); ctx.lineWidth = 2; rr(bx, by, bw, bh, 22); ctx.stroke();
        ctx.fillStyle = rgba(C.ink, 0.1); rr(bx + 6, by + 5, bw - 12, bh * 0.4, 18); ctx.fill();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '900 ' + (VW < 520 ? 24 : 28) + 'px ' + FONT;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = C.gold; ctx.fillText(fresh ? 'CLICK AND HOLD' : 'HOLD TO CARRY ON', bx + bw / 2, by + 40);
        ctx.globalAlpha = 1;
        ctx.font = '700 13px ' + FONT; ctx.fillStyle = C.ink;
        ctx.fillText('or touch and hold · or hold Space', bx + bw / 2, by + 72);
        ctx.fillStyle = C.muted; ctx.font = '700 11px ' + FONT;
        ctx.fillText('let go to fall', bx + bw / 2, by + 92);
      }
      function blitBg() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(bg, 0, 0);
      }
      function draw(now) {
        if (destroyed || !W) return;
        blitBg();
        var k = dpr * S, ox = 0, oy = 0;
        if (!reduced && shakeT > 0) { ox = Math.sin(now * 0.09) * 6 * shakeT; oy = Math.cos(now * 0.13) * 4 * shakeT; }
        ctx.setTransform(k, 0, 0, k, ox * dpr, oy * dpr);
        drawFar();
        drawMid();
        drawSmoke();
        drawCave();
        drawBlocks();
        drawBestFlag();
        var bob = (state === 'ready' || state === 'idle') && !reduced ? Math.sin(now / 300) * 4 : 0;
        if (state !== 'crashed' && state !== 'over') drawCraft(craftX, cy + bob, clamp(vy / 900, -0.32, 0.4), false);
        else drawCraft(craftX, cy, crashSpin, true);
        drawBits();
        drawFloats();
        drawHud(ox, oy);
        if (state === 'ready') drawPrompt(now);
        if (state === 'paused') {
          ctx.fillStyle = rgba(C.bg, 0.4); ctx.fillRect(0, 0, VW, VH);
        }
      }

      /* ---------- effects ---------- */
      function puff(x, y) {
        var p = smoke[smokeNext]; smokeNext = (smokeNext + 1) % NSMOKE;
        p.on = true; p.x = x; p.y = y; p.r = 3 + rnd() * 2.5; p.age = 0; p.life = 0.7 + rnd() * 0.4;
      }
      function burst(x, y) {
        for (var i = 0; i < (reduced ? 10 : NBURST); i++) {
          var p = bits[bitNext]; bitNext = (bitNext + 1) % NBURST;
          var a = rnd() * Math.PI * 2, sp = 60 + rnd() * 220;
          p.on = true; p.x = x; p.y = y; p.vx = Math.cos(a) * sp + speed * 0.3; p.vy = Math.sin(a) * sp - 40; p.age = 0; p.life = 0.6 + rnd() * 0.6;
          p.star = i % 2 === 0; p.r = p.star ? 5 + rnd() * 4 : 6 + rnd() * 8;
        }
      }
      function floatText(text, colour, x, y) {
        var f = floats[floatNext]; floatNext = (floatNext + 1) % NFLOAT;
        f.on = true; f.text = text; f.colour = colour; f.x = x; f.y = y; f.age = 0;
      }
      function updateFx(dt) {
        var i;
        for (i = 0; i < NSMOKE; i++) { var p = smoke[i]; if (!p.on) continue; p.age += dt; p.y -= 6 * dt; if (p.age >= p.life) p.on = false; }
        for (i = 0; i < NBURST; i++) { var b = bits[i]; if (!b.on) continue; b.age += dt; b.vy += 420 * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.age >= b.life) b.on = false; }
        for (i = 0; i < NFLOAT; i++) { var f = floats[i]; if (!f.on) continue; f.age += dt; if (f.age >= 1.1) f.on = false; }
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt * 3);
      }
      function anyFx() {
        var i;
        for (i = 0; i < NSMOKE; i++) if (smoke[i].on) return true;
        for (i = 0; i < NBURST; i++) if (bits[i].on) return true;
        for (i = 0; i < NFLOAT; i++) if (floats[i].on) return true;
        return shakeT > 0;
      }

      /* ---------- one physics step ---------- */
      function holding() { return holdPointers > 0 || keyHeld; }
      function step(dt) {
        clock += dt;
        var p = Math.min(1, dist / RAMP);
        speed = L.speed + (L.maxSpeed - L.speed) * p;
        var up = holding();
        vy += (up ? -LIFT : GRAV) * dt;
        vy = clamp(vy, -UP_MAX, DOWN_MAX);
        cy += vy * dt;
        dist += speed * dt;
        rotor += dt * (up ? 34 : 22);
        ensureCave();
        /* smoke from the tail, and a soft chop sound while the rotor pulls */
        smokeT -= dt;
        if (smokeT <= 0) { smokeT = up ? 0.035 : 0.06; puff(dist + craftX - 30, cy + 1); }
        if (up) { chopT -= dt; if (chopT <= 0) { chopT = 0.13; tone(110 + speed * 0.12, 0.05, 'triangle', 0.035); } } else chopT = 0;
        if (hit()) { crash(); return; }
        var m = Math.floor(dist / 10);
        if (m >= lastMilestone + 100) {
          lastMilestone = m - (m % 100);
          api.sound('coin');
          floatText(lastMilestone + ' m!', C.gold, craftX + 30, cy - 30);
        }
        if (!passedBest && best[levelKey] > 20 && m > best[levelKey]) {
          passedBest = true;
          api.sound('bell');
          floatText('New best!', C.leaf, craftX + 20, cy - 52);
          api.announce('New best distance!');
        }
      }
      /* Did the crash box touch the rock or a block? We test the front, middle and back of the craft. */
      function hit() {
        var wx = dist + craftX;
        for (var s = -1; s <= 1; s++) {
          var x = wx + s * HIT_W, hh = s === 0 ? HIT_H : HIT_H * 0.65;
          if (cy - hh < edge(roof, x) || cy + hh > edge(floor, x)) return true;
        }
        for (var i = 0; i < NBLOCK; i++) {
          var b = blocks[i];
          if (!b.on) continue;
          if (wx + HIT_W > b.x + 2 && wx - HIT_W < b.x + b.w - 2 && cy + HIT_H > b.y + 2 && cy - HIT_H < b.y + b.h - 4) return true;
        }
        return false;
      }
      function crash() {
        state = 'crashed';
        crashT = 0; crashVy = Math.max(-120, vy * 0.3); crashSpin = 0.4;
        shakeT = reduced ? 0 : 1;
        burst(dist + craftX, cy);
        api.sound('thud');
        api.sound('lose');
        setFlying(false);
        var m = metres();
        var isBest = m > best[levelKey];
        if (isBest) { best[levelKey] = m; api.store.set('best-' + levelKey, m); }
        lastResult = { m: m, isBest: isBest };
        bestEl.textContent = best[levelKey] + ' m';
        hudBest = 'BEST ' + best[levelKey] + ' m';
        distEl.textContent = m + ' m';
        api.status('Bump! You flew ' + m + ' metres.' + (isBest ? ' A new best!' : ' Best on ' + L.label + ': ' + best[levelKey] + ' m.'));
        canvas.setAttribute('aria-label', 'The sky-pod bumped the cave after ' + m + ' metres.');
        if (isBest && m >= 25) api.celebrate('New best: ' + m + ' metres!');
        syncData();
      }
      var lastResult = null, crashVy = 0, crashSpin = 0;
      function metres() { return Math.floor(dist / 10); }

      /* ---------- the loop ---------- */
      function frame(now) {
        rafId = 0;
        if (destroyed) return;
        var dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
        lastT = now;
        if (state === 'playing') {
          acc += dt;
          while (acc >= STEP && state === 'playing') { step(STEP); acc -= STEP; }
          var m = metres();
          if (m !== shownM) {
            shownM = m; hudDist = m + ' m';
            if (m % 5 === 0) distEl.textContent = hudDist;
            var st = Math.floor(m / 50);
            if (st !== statusStep) { statusStep = st; api.status('Flying · ' + m + ' m' + (best[levelKey] ? ' · best ' + best[levelKey] + ' m' : '')); }
          }
          if (++dataTick % 2 === 0) syncData();
        } else if (state === 'crashed') {
          crashT += dt;
          /* the pod tumbles gently to the cave floor */
          var fl = edge(floor, dist + craftX) - 12;
          if (cy < fl) { crashVy += 900 * dt; cy = Math.min(fl, cy + crashVy * dt); if (!reduced) crashSpin += dt * 5; }
          if (crashT > 0.9) showOver();
        } else if (state === 'ready') {
          rotor += dt * 22;
        }
        updateFx(dt);
        draw(now);
        if (wantLoop()) rafId = requestAnimationFrame(frame);
      }
      var dataTick = 0;
      function wantLoop() { return !destroyed && !document.hidden && (state === 'playing' || state === 'ready' || state === 'crashed' || anyFx()); }
      function startLoop() { if (!rafId && !destroyed && !document.hidden) { lastT = performance.now(); rafId = requestAnimationFrame(frame); } }
      function stopLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

      /* ---------- game flow ---------- */
      function resetFlight() {
        dist = 0; cy = VH / 2; vy = 0; acc = 0; clock = 0; speed = L.speed; lastMilestone = 0; passedBest = false; statusStep = -1; shownM = -1;
        smokeT = 0; chopT = 0; crashT = 0; shakeT = 0;
        var i;
        for (i = 0; i < NSMOKE; i++) smoke[i].on = false;
        for (i = 0; i < NBURST; i++) bits[i].on = false;
        for (i = 0; i < NFLOAT; i++) floats[i].on = false;
        hudDist = '0 m'; hudBest = best[levelKey] ? 'BEST ' + best[levelKey] + ' m' : '';
        distEl.textContent = '0 m';
        resetCave();
      }
      function newGame() {
        stopLoop();
        releaseAll();
        resetFlight();
        state = 'idle'; fresh = true;
        setFlying(false);
        pauseBtn.disabled = true; pauseBtn.textContent = 'Pause';
        levelSeg.hidden = false;
        ovTitle.textContent = 'Cave Copter';
        ovMsg.textContent = 'Fly your sky-pod through the cave. Hold to rise, let go to fall. Do not bump the rock!';
        ovSub.textContent = best[levelKey] ? 'Best on ' + L.label + ': ' + best[levelKey] + ' m' : 'Pick a level, then press Play.';
        ovBtn.textContent = '▶ Play';
        overlay.hidden = false;
        fitCard();
        api.status('Press Play, then click and hold to fly.');
        canvas.setAttribute('aria-label', 'A little flying pod waits at the mouth of a glowing cave.');
        syncData();
        draw(performance.now());
      }
      /* Play, Play again and Resume all lead to the "Click and hold" screen; the first press then flies. */
      function toReady(isFresh) {
        api.unlockSound();
        if (isFresh) resetFlight();
        fresh = isFresh;
        state = 'ready';
        overlay.hidden = true;
        pauseBtn.disabled = false; pauseBtn.textContent = 'Pause';
        setFlying(true);
        api.sound('click');
        api.status(isFresh ? 'Click and hold to rise, let go to fall. Hold Space on a keyboard.' : 'Hold to carry on flying.');
        canvas.setAttribute('aria-label', 'The sky-pod hovers in the cave, ready. Hold to fly.');
        syncData();
        focusGame();
        startLoop();
      }
      function takeOff() {
        if (state !== 'ready') return;
        state = 'playing';
        if (fresh) { api.sound('whoosh'); fresh = false; }
        vy = Math.min(vy, 0);
        acc = 0; lastT = performance.now();
        api.status('Flying · ' + metres() + ' m');
        canvas.setAttribute('aria-label', 'The sky-pod flies through a winding cave. Hold to rise, let go to fall.');
        syncData();
        startLoop();
      }
      function showOver() {
        state = 'over';
        pauseBtn.disabled = true;
        var r = lastResult || { m: metres(), isBest: false };
        levelSeg.hidden = false;
        ovTitle.textContent = r.isBest && r.m > 0 ? 'New best!' : 'Bump!';
        ovMsg.textContent = 'You flew ' + r.m + ' metres. ' + (r.isBest ? 'That is your longest flight on ' + L.label + '.' : kindWords(r.m));
        ovSub.textContent = 'Best on ' + L.label + ': ' + best[levelKey] + ' m';
        ovBtn.textContent = '▶ Play again';
        overlay.hidden = false;
        fitCard();
        api.status('You flew ' + r.m + ' m. Best on ' + L.label + ': ' + best[levelKey] + ' m. Press Play again.');
        syncData();
      }
      function kindWords(m) {
        var b = best[levelKey] || 1;
        if (m >= b * 0.85) return 'So close to your best!';
        if (m < 40) return 'Short hops help: tap, tap, tap to stay level.';
        return 'Nice flying. Small taps keep you steady.';
      }
      function overlayAction() {
        if (state === 'paused') toReady(false);
        else toReady(true);
      }
      function togglePause() {
        if (state === 'playing' || state === 'ready') pause();
        else if (state === 'paused') toReady(false);
      }
      function pause() {
        if (state !== 'playing' && state !== 'ready') return;
        if (state === 'ready' && fresh) { newGame(); return; }
        state = 'paused';
        releaseAll();
        stopLoop();
        setFlying(false);
        pauseBtn.textContent = 'Resume';
        distEl.textContent = metres() + ' m';
        levelSeg.hidden = true;   /* changing level would end this flight, so the level buttons wait until it is over */
        ovTitle.textContent = 'Paused';
        ovMsg.textContent = 'Your sky-pod is hovering safely at ' + metres() + ' m.';
        ovSub.textContent = '';
        ovBtn.textContent = '▶ Resume';
        overlay.hidden = false;
        fitCard();
        api.status('Paused at ' + metres() + ' m. Press Resume.');
        syncData();
        draw(performance.now());
      }
      function setLevel(k) {
        if (!LEVELS[k] || (state !== 'idle' && state !== 'over')) return;
        levelKey = k; L = LEVELS[k];
        api.store.set('level', k);
        LEVEL_KEYS.forEach(function (x) { levelBtns[x].setAttribute('aria-pressed', String(x === k)); });
        bestEl.textContent = best[k] + ' m';
        api.sound('click');
        newGame();
      }
      function fitCard() {
        ovMsg.hidden = false;
        var card = ovMsg.parentNode;
        if (card && card.scrollHeight > card.clientHeight + 1) ovMsg.hidden = true;
      }
      function setFlying(on) { shell.classList.toggle('is-flying', !!on); }
      function focusGame() { try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      function syncData() {
        var d = canvas.dataset;
        d.state = state; d.dist = String(metres()); d.y = cy.toFixed(1); d.vy = vy.toFixed(0);
        var ax = dist + craftX + 60;
        d.roof = edge(roof, ax).toFixed(1); d.floor = edge(floor, ax).toFixed(1);
        var bt = '', bb = '';
        for (var i = 0; i < NBLOCK; i++) {
          var b = blocks[i];
          if (b.on && b.x + b.w > dist + craftX - HIT_W && b.x < dist + craftX + 150) { bt = b.y.toFixed(0); bb = (b.y + b.h).toFixed(0); break; }
        }
        d.blockTop = bt; d.blockBot = bb;
      }

      /* ---------- input ---------- */
      function press() {
        if (state === 'ready') takeOff();
      }
      function releaseAll() { holdPointers = 0; keyHeld = false; pointerIds = {}; }
      function onPointerDown(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (state === 'ready' || state === 'playing') {
          e.preventDefault();
          api.unlockSound();
          if (!pointerIds[e.pointerId]) { pointerIds[e.pointerId] = true; holdPointers++; }
          try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          press();
        }
      }
      function onPointerUp(e) {
        if (pointerIds[e.pointerId]) { delete pointerIds[e.pointerId]; holdPointers = Math.max(0, holdPointers - 1); }
      }
      function isHoldKey(k) { return k === ' ' || k === 'Spacebar' || k === 'ArrowUp' || k === 'w' || k === 'W'; }
      function onKeyDown(e) {
        if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
        var tgt = e.target, k = e.key;
        if (tgt && tgt.closest && tgt.closest('input, select, textarea')) return;
        var onControl = tgt && tgt !== canvas && tgt.closest && tgt.closest('a, button, summary');
        if ((k === 'p' || k === 'P') && (state === 'playing' || state === 'ready' || state === 'paused')) { e.preventDefault(); togglePause(); return; }
        if (!isHoldKey(k)) return;
        if (state === 'ready' || state === 'playing') {
          if (onControl && !root.contains(tgt)) return;
          e.preventDefault();
          keyHeld = true;
          press();
        } else if ((state === 'idle' || state === 'over') && (tgt === canvas || tgt === document.body) && (k === ' ' || k === 'Spacebar')) {
          e.preventDefault();
          if (state === 'idle' || crashT > 0.9) toReady(true);
        }
      }
      function onKeyUp(e) { if (isHoldKey(e.key)) keyHeld = false; }
      function onBlur() { releaseAll(); }
      function onVisibility() {
        if (document.hidden) { if (state === 'playing' || state === 'ready') pause(); stopLoop(); }
        else draw(performance.now());
      }
      function noMenu(e) { e.preventDefault(); }
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerUp);
      canvas.addEventListener('lostpointercapture', onPointerUp);
      canvas.addEventListener('contextmenu', noMenu);
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('blur', onBlur);

      var lastW = 0, lastDpr = 0, lastVh = 0;
      function maybeResize() {
        var w = Math.round(stage.clientWidth), r = Math.min(2, window.devicePixelRatio || 1), vh = window.innerHeight;
        if (w && (w !== lastW || r !== lastDpr || Math.abs(vh - lastVh) > 80)) { lastW = w; lastDpr = r; lastVh = vh; resize(); }
      }
      var ro = typeof ResizeObserver === 'function' ? new ResizeObserver(maybeResize) : null;
      if (ro) ro.observe(stage);
      window.addEventListener('resize', maybeResize);

      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!destroyed && W) { readColours(); draw(performance.now()); } }, function () {});
      readColours();
      resetFlight();
      maybeResize();
      newGame();

      return {
        destroy: function () {
          destroyed = true;
          stopLoop();
          if (ro) ro.disconnect();
          window.removeEventListener('resize', maybeResize);
          window.removeEventListener('blur', onBlur);
          document.removeEventListener('keydown', onKeyDown);
          document.removeEventListener('keyup', onKeyUp);
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }
  });
})();
