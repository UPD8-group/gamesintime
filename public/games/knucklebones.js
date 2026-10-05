/* Knucklebones (fivestones, jacks) for Games in Time.

   Five sheep knucklebones on a chalked step. Throw one bone up (the jack), scoop bones off the ground while it is in
   the air, then catch the jack as it drops back into your hand. Ones, Twos, Threes, Fours, then Backs: all five up,
   onto the back of the hand, and back into the palm. Each level is a whole game; the next level throws faster.

   History followed: Alice Bertha Gomme, The Traditional Games of England, Scotland and Ireland, vol. 1 (1894),
   entry "Fivestones", pp. 122 to 129. A newspaper boy at Richmond Station showed her the order of play: four stones
   on the ground, "the fifth was thrown up, one stone being picked up from the ground, and the descending fifth stone
   caught in the same hand"; then "two were picked up together in the same manner twice, then one, then three, then
   all four at once"; then "all five were then thrown up and caught on the back of the hand, and then thrown from the
   back and caught in the palm". In South Notts the same tricks were One-ers, Two-ers, Three-ers and Four-ers, and
   "every failure means 'out'". In Wakefield the doorstep was "made ready by drawing a ring upon it".

   Timing: every throw has a known flight time. A catch counts if it comes within `early` ms before or `late` ms after
   the bone reaches your palm (all measured with performance.now(); game time stops while paused). The canvas carries
   read-only data-* attributes (phase, catch time, windows) so the automated test can play. */
(function () {
  'use strict';

  /* Tricks in the order the Richmond boy played them. groups: how the four bones on the ground are picked up. */
  var TRICKS = [
    { id: 'ones', name: 'Ones', groups: [1, 1, 1, 1], tell: 'Throw the jack, scoop up one bone, catch the jack.' },
    { id: 'twos', name: 'Twos', groups: [2, 2], tell: 'Scoop up two bones at a time.' },
    { id: 'threes', name: 'Threes', groups: [1, 3], tell: 'Scoop up one bone, then the other three together.' },
    { id: 'fours', name: 'Fours', groups: [4], tell: 'Scoop up all four bones in one go.' },
    { id: 'backs', name: 'Backs', groups: [], tell: 'Throw all five, catch them on the back of your hand, then back in your palm.' }
  ];
  /* Difficulty. air: flight time of the first level in ms; floor: the shortest it gets; early/late: catch window. */
  var LEVELS = {
    easy: { label: 'Easy', air: 1750, floor: 950, early: 170, late: 130, perfect: 60 },
    normal: { label: 'Normal', air: 1450, floor: 820, early: 130, late: 100, perfect: 45 },
    hard: { label: 'Hard', air: 1250, floor: 720, early: 100, late: 75, perfect: 35 }
  };
  var LEVEL_KEYS = ['easy', 'normal', 'hard'];
  var SCOOP_MS = 260;               /* the hand's trip down to the bones and back */
  var SCATTER_MS = 420;
  var GRACE = 60;                   /* a drop is only called this long after the window, so a press already on its way still counts */

  /* ---------- colour helpers: every colour is read from the page's CSS variables ---------- */
  function parseColour(s) {
    s = String(s || '').trim();
    var m;
    if (s.charAt(0) === '#') {
      var x = s.slice(1);
      if (x.length === 3 || x.length === 4) x = x.split('').map(function (c) { return c + c; }).join('');
      if (x.length === 6 || x.length === 8) return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16), x.length === 8 ? parseInt(x.slice(6, 8), 16) / 255 : 1];
    }
    if ((m = s.match(/^rgba?\(([^)]+)\)$/i))) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      if (p.length >= 3) return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    return null;
  }
  function rgba(s, a) { var c = parseColour(s); if (!c) return s; return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? c[3] : a * c[3]).toFixed(3) + ')'; }
  function mix(s1, s2, t) {
    var a = parseColour(s1), b = parseColour(s2);
    if (!a || !b) return s1;
    return 'rgba(' + [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }).join(',') + ',' + (a[3] + (b[3] - a[3]) * t).toFixed(3) + ')';
  }
  function seeded(seed) {
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
  function chalkStack(cs) {
    var head = cs.getPropertyValue('--font-head').trim() || 'sans-serif';
    var parts = (cs.getPropertyValue('--font-poster').trim() || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x && !/^(cursive|fantasy)$/i.test(x); });
    return parts.concat([head]).join(', ');
  }

  GamesInTime.register({
    id: 'knucklebones',
    frame: 'stage',
    mount: function (root, api) {
      var h = api.h;
      var destroyed = false;
      var reduced = !!api.reducedMotion;
      var levelKey = api.store.get('level', 'easy');
      if (!LEVELS[levelKey]) levelKey = 'easy';
      var L = LEVELS[levelKey];
      var best = {};
      LEVEL_KEYS.forEach(function (k) { best[k] = Number(api.store.get('best-' + k, 0)) || 0; });

      /* ---------- DOM ---------- */
      root.appendChild(h('style', null,
        '.game-knucklebones .kb-toolbar { justify-content: space-between; margin-bottom: .6rem; }' +
        '.game-knucklebones .kb-settings { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }' +
        '.game-knucklebones .kb-group { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }' +
        '.game-knucklebones .kb-score { margin: 0; gap: .3rem .9rem; font-size: clamp(1rem, .9rem + .5vw, 1.25rem); }' +
        '.game-knucklebones .kb-score strong { color: var(--gold); font-family: var(--kb-chalk, var(--font-poster)); font-size: 1.3em; display: inline-block; min-width: 1.4ch; }' +
        '.game-knucklebones .kb-tricks { display: flex; flex-wrap: wrap; gap: .35rem; list-style: none; margin: 0 0 .6rem; padding: 0; }' +
        '.game-knucklebones .kb-tricks li { margin: 0; padding: .15rem .6rem; border-radius: 999px; border: 2px solid var(--line); color: var(--ink-muted); font-weight: 700; font-size: .92rem; }' +
        '.game-knucklebones .kb-tricks li.done { color: var(--ink); border-color: var(--leaf); }' +
        '.game-knucklebones .kb-tricks li.done::before { content: "\\2713"; color: var(--leaf); margin-right: .2em; }' +
        '.game-knucklebones .kb-tricks li.now { color: var(--on-era); background: var(--gold); border-color: var(--gold); }' +
        '.game-knucklebones .kb-stage { position: relative; border-radius: 14px; overflow: hidden; background: var(--bg-2); }' +
        '.game-knucklebones .kb-canvas { display: block; width: 100%; height: 320px; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: pointer; }' +
        '.game-knucklebones .kb-canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }' +
        '.game-knucklebones .kb-overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: 10px; background: color-mix(in srgb, var(--bg) 30%, transparent); }' +
        '.game-knucklebones .kb-card { background: color-mix(in srgb, var(--surface) 92%, transparent); border: 2px solid var(--line); border-radius: 18px; padding: .8rem 1.1rem .9rem; text-align: center; max-width: 27rem; max-height: 100%; overflow: auto; display: grid; gap: .5rem; justify-items: center; box-shadow: var(--shadow); }' +
        '.game-knucklebones .kb-title { font-family: var(--kb-chalk, var(--font-poster)); font-weight: 700; font-size: clamp(1.7rem, 1.2rem + 2.6vw, 2.8rem); line-height: 1; color: var(--ink); margin: 0; }' +
        '.game-knucklebones .kb-msg { margin: 0; color: var(--ink); font-weight: 600; line-height: 1.35; }' +
        '.game-knucklebones .kb-sub { margin: 0; color: var(--ink-muted); font-size: .92rem; }' +
        '.game-knucklebones .kb-sub:empty { display: none; }' +
        '.game-knucklebones .kb-big { min-height: 56px; font-size: 1.25rem; padding: .55rem 1.9rem; }' +
        '.game-knucklebones .kb-pad { display: flex; justify-content: center; gap: .6rem; margin-top: .7rem; }' +
        '.game-knucklebones .kb-act { min-height: 60px; width: min(100%, 18rem); font-size: 1.3rem; border-color: var(--gold); touch-action: manipulation; user-select: none; -webkit-user-select: none; }' +
        '.game-knucklebones .kb-act:active { background: var(--gold); color: var(--on-era); }' +
        '@media (max-width: 420px) { .game-knucklebones .kb-overlay { padding: 6px; } .game-knucklebones .kb-card { padding: .55rem .6rem .65rem; gap: .4rem; } .game-knucklebones .kb-title { font-size: 1.5rem; } .game-knucklebones .kb-msg { font-size: .9rem; line-height: 1.3; } .game-knucklebones .kb-big { min-height: 48px; font-size: 1.1rem; padding-inline: 1.3rem; } .game-knucklebones .kb-card .seg button { padding-inline: .5rem; min-height: 40px; } .game-knucklebones .kb-toolbar .btn { padding-inline: .8rem; } .game-knucklebones .seg button { padding-inline: .7rem; } .game-knucklebones .kb-tricks { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .25rem; } .game-knucklebones .kb-tricks li { font-size: .76rem; padding-inline: .1rem; text-align: center; } .game-knucklebones .kb-tricks li.done { color: var(--leaf); } .game-knucklebones .kb-tricks li.done::before { content: none; } }'));

      var pauseBtn = h('button', { class: 'btn', type: 'button', disabled: true, onclick: function () { togglePause(); focusGame(); } }, 'Pause');
      var newBtn = h('button', { class: 'btn', type: 'button', onclick: function () { newGame(true); focusGame(); } }, 'New game');
      var levelBtns = {};
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Level' }, LEVEL_KEYS.map(function (k) {
        levelBtns[k] = h('button', { type: 'button', 'aria-pressed': String(k === levelKey), onclick: function () { setLevel(k); } }, LEVELS[k].label);
        return levelBtns[k];
      }));
      var scoreEl = h('strong', null, '0'), roundEl = h('strong', null, '1'), bestEl = h('strong', null, String(best[levelKey]));
      var board = h('div', { class: 'scoreboard kb-score' }, h('span', null, 'Score ', scoreEl), h('span', null, 'Level ', roundEl), h('span', null, 'Best ', bestEl));
      var toolbar = h('div', { class: 'game-toolbar kb-toolbar' }, h('div', { class: 'kb-group' }, pauseBtn, newBtn), board);
      var trickEls = TRICKS.map(function (tr) { return h('li', null, tr.name); });
      var trickList = h('ul', { class: 'kb-tricks', 'aria-label': 'Tricks in this game' }, trickEls);
      var canvas = h('canvas', { class: 'kb-canvas', role: 'img', tabindex: '0', 'aria-label': 'Five white sheep knucklebones on a chalked stone step, with your hand ready to throw.' });
      var ovTitle = h('p', { class: 'kb-title' }, 'Knucklebones');
      var ovMsg = h('p', { class: 'kb-msg' }, '');
      var ovSub = h('p', { class: 'kb-sub' }, '');
      var ovBtn = h('button', { class: 'btn btn-primary kb-big', type: 'button', onclick: function () { overlayAction(); } }, '▶ Start');
      var overlay = h('div', { class: 'kb-overlay' }, h('div', { class: 'kb-card' }, ovTitle, ovMsg, h('div', { class: 'kb-settings' }, levelSeg), ovBtn, ovSub));
      var stage = h('div', { class: 'kb-stage' }, canvas, overlay);
      var actBtn = h('button', { class: 'btn kb-act', type: 'button' }, 'Throw');
      var pad = h('div', { class: 'kb-pad' }, actBtn);
      var note = h('p', { class: 'game-note' }, 'Keyboard: Space throws and catches, the arrow keys choose a bone, Enter scoops it up. P pauses. On a touch screen, tap a bone to scoop it and tap your hand or the button to throw and catch.');
      root.appendChild(toolbar);
      root.appendChild(trickList);
      root.appendChild(stage);
      root.appendChild(pad);
      root.appendChild(note);

      var ctx = canvas.getContext('2d'), ctxMain = ctx;
      var bgCanvas = document.createElement('canvas'), groundCanvas = document.createElement('canvas'), groundKey = '';
      var W = 300, H = 300, dpr = 1;
      var C = {}, FONT = 'sans-serif';
      function readColours() {
        var cs = getComputedStyle(root);
        function v(n, fb) { var s = cs.getPropertyValue(n).trim(); return s || fb; }
        C.bg = v('--bg', 'black'); C.bg2 = v('--bg-2', C.bg); C.surface = v('--surface', C.bg2); C.surface2 = v('--surface-2', C.surface);
        C.ink = v('--ink', 'white'); C.inkMuted = v('--ink-muted', C.ink); C.inkFaint = v('--ink-faint', C.inkMuted);
        C.gold = v('--gold', C.ink); C.vermilion = v('--vermilion', C.gold); C.peacock = v('--peacock', C.ink); C.cobalt = v('--cobalt', C.peacock);
        C.rose = v('--rose', C.vermilion); C.leaf = v('--leaf', C.peacock); C.red = v('--red', C.vermilion); C.green = v('--green', C.leaf);
        C.onEra = v('--on-era', C.bg);
        C.bone = mix(C.ink, C.gold, 0.14);
        C.boneShade = mix(C.ink, C.bg, 0.42);
        C.boneLine = mix(C.bg, C.ink, 0.3);
        C.skin = mix(C.ink, C.rose, 0.32);
        C.skinShade = mix(C.rose, C.bg, 0.35);
        C.sleeve = mix(C.peacock, C.bg, 0.55);
        C.sleeveLight = mix(C.peacock, C.bg, 0.35);
        C.stone = mix(C.bg2, C.ink, 0.1);
        FONT = chalkStack(cs);
        root.style.setProperty('--kb-chalk', FONT);
      }

      /* ---------- game clock: game time stops while paused ---------- */
      var clockBase = performance.now(), pausedAt = null;
      function gnow() { return (pausedAt != null ? pausedAt : performance.now()) - clockBase; }
      function holdClock() { if (pausedAt == null) pausedAt = performance.now(); }
      function releaseClock() { if (pausedAt != null) { clockBase += performance.now() - pausedAt; pausedAt = null; } }
      function realOf(gt) { return gt + clockBase; }
      /* When an input really happened, in game time: the event's own timestamp (same clock as performance.now(), so a
         busy frame does not make a well-timed press late), or now if the browser gives something odd. */
      function evTime(e) {
        var now = performance.now(), ts = e && e.timeStamp;
        if (pausedAt == null && ts && ts <= now + 1 && ts > now - 250) return ts - clockBase;
        return gnow();
      }

      /* ---------- state ---------- */
      var state = 'idle';            /* idle | playing | paused | over */
      var phase = 'rest';            /* rest | scatter | ready | flight | caught | backs1 | onback | backs2 | levelup | miss */
      var phaseAt = 0;
      var level = 1, trickIdx = 0, score = 0, newBest = false, missWhy = '', missCount = 1;
      var groups = [];               /* {bones:[{x,y,rot,seed}], done:false} positions in ring units */
      var selected = 0;
      var throwAt = 0, air = 1500, scooped = false, scoopAt = -1e9, scoopGroup = -1;
      var inHand = 0;                /* bones held in the hand besides the jack */
      var catchAt = 0;               /* game time when the falling bone reaches the palm */
      var resumeAt = 0, rafId = 0;
      var fx = [], floaters = [], shakeUntil = 0, overAt = 0;
      var rnd = seeded(5);

      function airFor(lv) { return Math.max(L.floor, L.air * Math.pow(0.9, lv - 1)); }
      function trick() { return TRICKS[trickIdx]; }

      /* ---------- layout ---------- */
      var G = {};
      function layout() {
        G.handS = clamp(Math.min(W * 0.34, H * 0.34), 80, 175);
        G.palmX = W / 2; G.palmY = H - G.handS * 0.66;
        G.ringX = W / 2; G.ringY = H * 0.35;
        G.rx = Math.min(W * 0.42, H * 0.55); G.ry = G.rx * 0.4;
        G.ringY = Math.min(G.ringY, G.palmY - G.handS * 0.72 - G.ry);
        G.bone = clamp(Math.min(W, H * 1.4) * 0.075, 28, 60);
        G.peak = H * 0.06;
      }
      function resize() {
        var w = Math.max(200, Math.round(stage.clientWidth || root.clientWidth || 300));
        var vh = window.innerHeight || 700;
        var hh = w < 480 ? Math.round(clamp(w * 1.12, 300, Math.max(300, vh * 0.56))) : Math.round(clamp(Math.min(w * 0.56, vh * 0.6), 340, 580));
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = w; H = hh;
        canvas.style.height = hh + 'px';
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr);
        readColours();
        layout();
        buildBackground();
        draw();
        if (!overlay.hidden) fitCard();
      }

      /* ---------- background: worn flagstones with a chalk ring ---------- */
      function buildBackground() {
        buildShadow();
        groundKey = '';
        bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;
        var b = bgCanvas.getContext('2d');
        b.setTransform(dpr, 0, 0, dpr, 0, 0);
        var r = seeded(1894);
        b.fillStyle = C.bg2; b.fillRect(0, 0, W, H);
        /* flagstones */
        var fw = clamp(W / 3.2, 110, 260), fh = fw * 0.55, row = 0, x, y;
        for (y = -fh * 0.3; y < H; y += fh, row++) {
          for (x = row % 2 ? -fw * 0.45 : 0; x < W; x += fw) {
            b.fillStyle = mix(C.stone, C.bg, 0.15 + r() * 0.25);
            b.fillRect(x + 3, y + 3, fw - 6, fh - 6);
          }
        }
        for (var i = 0; i < W * H / 260; i++) {
          b.fillStyle = rgba(r() < 0.5 ? C.ink : C.bg, 0.05 + r() * 0.08);
          b.fillRect(r() * W, r() * H, 1.5, 1.5);
        }
        /* the chalk ring, drawn twice for a rough chalky line */
        for (var k = 0; k < 3; k++) {
          b.strokeStyle = rgba(C.ink, 0.22 + k * 0.08); b.lineWidth = 3.2 - k;
          b.beginPath(); b.ellipse(G.ringX + (r() - 0.5) * 2, G.ringY + (r() - 0.5) * 2, G.rx + (r() - 0.5) * 3, G.ry + (r() - 0.5) * 2, (r() - 0.5) * 0.02, 0, Math.PI * 2); b.stroke();
        }
        /* chalked tally of old games in the corner */
        if (W >= 480) {
          b.strokeStyle = rgba(C.ink, 0.25); b.lineWidth = 2;
          var tx = 20, ty = H * 0.86;
          for (i = 0; i < 4; i++) { b.beginPath(); b.moveTo(tx + i * 7, ty); b.lineTo(tx + i * 7 + 1, ty + 20); b.stroke(); }
          b.beginPath(); b.moveTo(tx - 4, ty + 14); b.lineTo(tx + 26, ty + 4); b.stroke();
        }
      }

      /* ---------- drawing helpers ---------- */
      function chalkText(text, x, y, size, colour, align, alpha, on) {
        var ctx = on || ctxMain;
        ctx.save();
        ctx.font = '700 ' + Math.round(size) + 'px ' + FONT;
        ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = rgba(C.bg, 0.8); ctx.lineWidth = Math.max(3, size * 0.16);
        ctx.strokeText(text, x, y);
        ctx.fillStyle = colour; ctx.fillText(text, x, y);
        ctx.restore();
      }
      /* A sheep's knucklebone (astragalus) seen from above: a knobbly waisted block with a groove and a dimple. */
      function drawBone(x, y, len, rot, lift, seed, on) {
        var ctx = on || ctxMain;
        var w = len, hh = len * 0.6;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-w * 0.32, -hh * 0.5);
        ctx.bezierCurveTo(-w * 0.1, -hh * 0.62, w * 0.1, -hh * 0.36, w * 0.3, -hh * 0.52);
        ctx.bezierCurveTo(w * 0.52, -hh * 0.62, w * 0.56, -hh * 0.05, w * 0.5, hh * 0.12);
        ctx.bezierCurveTo(w * 0.56, hh * 0.45, w * 0.36, hh * 0.62, w * 0.18, hh * 0.5);
        ctx.bezierCurveTo(w * 0.04, hh * 0.42, -w * 0.06, hh * 0.62, -w * 0.24, hh * 0.54);
        ctx.bezierCurveTo(-w * 0.5, hh * 0.6, -w * 0.56, hh * 0.25, -w * 0.5, 0);
        ctx.bezierCurveTo(-w * 0.56, -hh * 0.3, -w * 0.48, -hh * 0.52, -w * 0.32, -hh * 0.5);
        ctx.closePath();
        ctx.fillStyle = C.bone; ctx.fill();
        ctx.strokeStyle = C.boneLine; ctx.lineWidth = Math.max(1.4, len * 0.05); ctx.stroke();
        /* shading on the lower side and the central groove */
        ctx.save(); ctx.clip();
        ctx.fillStyle = rgba(C.bg, 0.16); ctx.beginPath(); ctx.ellipse(w * 0.05, hh * 0.45, w * 0.6, hh * 0.32, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = C.boneShade; ctx.lineWidth = Math.max(1.2, len * 0.045); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-w * 0.12, -hh * 0.3); ctx.bezierCurveTo(0, -hh * 0.05, -w * 0.05, hh * 0.1, w * 0.08, hh * 0.3); ctx.stroke();
        ctx.fillStyle = C.boneShade; ctx.beginPath(); ctx.ellipse(w * 0.27, -hh * 0.08, w * 0.07, hh * 0.1, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(C.ink, 0.75); ctx.beginPath(); ctx.ellipse(-w * 0.3, -hh * 0.22, w * 0.08, hh * 0.08, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      /* The chalked labels: the trick, how many bones are left, and on wide screens the score. */
      function drawLabels(on) {
        chalkText(trick().name, 14, 26, clamp(H * 0.07, 18, 34), C.ink, 'left', 0.9, on);
        if (W >= 640 && state !== 'idle') {
          chalkText(String(score), W - 18, H * 0.16, clamp(H * 0.13, 30, 70), C.gold, 'right', 1, on);
          chalkText('points', W - 18, H * 0.16 + clamp(H * 0.09, 24, 46), clamp(H * 0.05, 14, 24), C.ink, 'right', 0.8, on);
        }
        if (trick().groups.length && state !== 'idle') {
          var left = groups.filter(function (g) { return !g.done; }).length;
          chalkText(left + ' to go', 14, 26 + clamp(H * 0.065, 18, 30), clamp(H * 0.045, 13, 20), C.inkMuted, 'left', 1, on);
        }
      }
      /* A label to the left of the hand, kept inside the canvas on narrow screens. */
      function sideLabel(text, colour, alpha) {
        var size = clamp(G.handS * 0.24, 15, 30);
        ctx.font = '700 ' + Math.round(size) + 'px ' + FONT;
        var w = ctx.measureText(text).width;
        if (w + 10 > G.palmX - G.handS * 0.4) { size *= (G.palmX - G.handS * 0.4 - 10) / w; ctx.font = '700 ' + Math.round(size) + 'px ' + FONT; w = ctx.measureText(text).width; }
        var x = Math.max(G.palmX - G.handS * 0.42, w + 8);
        chalkText(text, x, G.palmY + G.handS * 0.1, size, colour, 'right', alpha);
      }
      /* A soft round shadow, drawn once and stretched where it is needed. */
      var shadowSprite = document.createElement('canvas');
      function buildShadow() {
        shadowSprite.width = 128; shadowSprite.height = 128;
        var c = shadowSprite.getContext('2d');
        var g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, rgba(C.bg, 1)); g.addColorStop(0.65, rgba(C.bg, 0.7)); g.addColorStop(1, rgba(C.bg, 0));
        c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      }
      function boneShadow(x, y, len, a, on) {
        var c = on || ctxMain, r = len * 0.55;
        c.globalAlpha = a;
        c.drawImage(shadowSprite, x + len * 0.08 - r, y + len * 0.22 - r * 0.45, r * 2, r * 0.9);
        c.globalAlpha = 1;
      }

      /* Your right hand seen from above, fingers pointing away from you, coming out of a buttoned wool jacket sleeve
         with a white shirt cuff. pose: open (palm up, thumb on the right), grab (fingers half curled), fist (closed
         round a caught bone), back (palm down, so it is the back of the hand with knuckles and nails). */
      function drawHand(hx, hy, pose, held) {
        var s = G.handS;
        var ax = G.palmX + s * 0.45, ay = H + s * 0.35;
        var wx = hx + s * 0.02, wy = hy + s * 0.42;
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        /* sleeve and cuff */
        ctx.strokeStyle = rgba(C.bg, 0.45); ctx.lineWidth = s * 0.66;
        ctx.beginPath(); ctx.moveTo(ax + 6, ay + 6); ctx.lineTo(wx + 6, wy + s * 0.28); ctx.stroke();
        ctx.strokeStyle = C.sleeve; ctx.lineWidth = s * 0.6;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(wx, wy + s * 0.25); ctx.stroke();
        ctx.strokeStyle = C.sleeveLight; ctx.lineWidth = s * 0.07;
        ctx.beginPath(); ctx.moveTo(ax - s * 0.2, ay); ctx.lineTo(wx - s * 0.2, wy + s * 0.3); ctx.stroke();
        var ang = Math.atan2(wy - ay, wx - ax);
        ctx.save();
        ctx.translate(wx, wy + s * 0.12); ctx.rotate(ang + Math.PI / 2);
        ctx.fillStyle = mix(C.ink, C.bg, 0.06);
        ctx.beginPath(); ctx.ellipse(0, 0, s * 0.3, s * 0.11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = rgba(C.bg, 0.35); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(s * 0.19, s * 0.01, s * 0.035, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        /* the hand itself */
        ctx.translate(hx, hy);
        if (pose === 'back') ctx.scale(-1, 1);
        var curl = pose === 'fist' ? 1 : pose === 'grab' ? 0.55 : 0;
        var skin = pose === 'back' ? mix(C.skin, C.rose, 0.18) : C.skin;
        var line = C.skinShade, lw = Math.max(2, s * 0.03);
        var fingers = [
          { x: -0.2, len: 0.25, w: 0.105, a: -0.16 },
          { x: -0.07, len: 0.33, w: 0.115, a: -0.05 },
          { x: 0.065, len: 0.36, w: 0.12, a: 0.03 },
          { x: 0.195, len: 0.32, w: 0.115, a: 0.12 }
        ];
        function fingerTip(f) { var l = f.len * (1 - 0.62 * curl); return { x: (f.x + Math.sin(f.a) * l) * s, y: (-0.1 - Math.cos(f.a) * l) * s }; }
        function palmPath() {
          ctx.beginPath();
          ctx.moveTo(-0.2 * s, 0.4 * s);
          ctx.quadraticCurveTo(-0.29 * s, 0.2 * s, -0.27 * s, -0.08 * s);
          ctx.quadraticCurveTo(0, -0.16 * s, 0.26 * s, -0.08 * s);
          ctx.quadraticCurveTo(0.31 * s, 0.12 * s, 0.25 * s, 0.3 * s);
          ctx.quadraticCurveTo(0.2 * s, 0.43 * s, 0.05 * s, 0.44 * s);
          ctx.closePath();
        }
        var thumb = curl > 0.9 ? { x1: 0.2, y1: 0.2, x2: 0.05, y2: 0.0 } : { x1: 0.22, y1: 0.22, x2: 0.42 - curl * 0.12, y2: -0.02 + curl * 0.06 };
        /* outlines first, then fills, so the hand reads as one shape */
        ctx.strokeStyle = line;
        fingers.forEach(function (f) { var tp = fingerTip(f); ctx.lineWidth = f.w * s + lw * 2; ctx.beginPath(); ctx.moveTo(f.x * s, -0.05 * s); ctx.lineTo(tp.x, tp.y); ctx.stroke(); });
        ctx.lineWidth = 0.13 * s + lw * 2; ctx.beginPath(); ctx.moveTo(thumb.x1 * s, thumb.y1 * s); ctx.lineTo(thumb.x2 * s, thumb.y2 * s); ctx.stroke();
        palmPath(); ctx.lineWidth = lw * 2; ctx.stroke();
        ctx.strokeStyle = skin; ctx.fillStyle = skin;
        fingers.forEach(function (f) { var tp = fingerTip(f); ctx.lineWidth = f.w * s; ctx.beginPath(); ctx.moveTo(f.x * s, -0.05 * s); ctx.lineTo(tp.x, tp.y); ctx.stroke(); });
        ctx.lineWidth = 0.13 * s; ctx.beginPath(); ctx.moveTo(thumb.x1 * s, thumb.y1 * s); ctx.lineTo(thumb.x2 * s, thumb.y2 * s); ctx.stroke();
        palmPath(); ctx.fill();
        if (pose === 'back') {
          /* knuckles and fingernails */
          ctx.strokeStyle = rgba(line, 0.8); ctx.lineWidth = 1.5;
          fingers.forEach(function (f) {
            ctx.beginPath(); ctx.arc(f.x * s, -0.1 * s, f.w * s * 0.32, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
            var tp = fingerTip(f);
            ctx.fillStyle = mix(C.ink, C.rose, 0.15); ctx.beginPath(); ctx.ellipse(tp.x, tp.y + f.w * s * 0.15, f.w * s * 0.3, f.w * s * 0.36, f.a, 0, Math.PI * 2); ctx.fill();
          });
        } else if (pose === 'fist') {
          /* fingers folded over a caught bone */
          ctx.fillStyle = skin; ctx.strokeStyle = line; ctx.lineWidth = lw;
          ctx.beginPath(); ctx.ellipse(0, 0.0, 0.27 * s, 0.13 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          for (var k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo((-0.27 + k * 0.135) * s, -0.1 * s); ctx.lineTo((-0.27 + k * 0.135) * s, 0.06 * s); ctx.stroke(); }
        } else {
          /* palm creases */
          ctx.strokeStyle = rgba(line, 0.55); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(-0.24 * s, 0.02 * s); ctx.quadraticCurveTo(0, 0.08 * s, 0.2 * s, -0.02 * s); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0.16 * s, 0.38 * s); ctx.quadraticCurveTo(0.06 * s, 0.2 * s, 0.14 * s, 0.05 * s); ctx.stroke();
        }
        /* bones already held */
        if (held > 0 && pose !== 'back' && pose !== 'fist') {
          for (var i = 0; i < Math.min(held, 4); i++) drawBone((-0.1 + (i % 2) * 0.17) * s, (0.2 - Math.floor(i / 2) * 0.12) * s, G.bone * 0.78, 0.4 + i * 0.9);
        }
        ctx.restore();
      }

      /* ---------- placing the bones on the ground ---------- */
      function ringPoint(u, v) { return { x: G.ringX + u * G.rx, y: G.ringY + v * G.ry }; }
      function layoutGroups(sizes) {
        var out = [], spots = [];
        var tries = 0;
        sizes.forEach(function (n, gi) {
          var u, v, ok = false;
          while (!ok && tries++ < 400) {
            u = (rnd() * 2 - 1) * 0.68; v = (rnd() * 2 - 1) * 0.55;
            if (u * u / 0.5 + v * v / 0.35 > 1) continue;
            ok = Math.abs(u * G.rx) > G.bone * (n > 2 ? 1.9 : 1.5) && spots.every(function (p) { return Math.hypot((p.u - u) * G.rx, (p.v - v) * G.ry) > G.bone * 2.6; });
          }
          if (!ok) { u = -0.6 + gi * 0.4; v = gi % 2 ? 0.2 : -0.2; }
          spots.push({ u: u, v: v });
          var bones = [];
          for (var i = 0; i < n; i++) {
            var a = i / n * Math.PI * 2 + rnd(), d = n === 1 ? 0 : 0.46;
            bones.push({ du: Math.cos(a) * d, dv: Math.sin(a) * d * 0.8, rot: rnd() * Math.PI * 2, from: null });
          }
          out.push({ u: u, v: v, n: n, bones: bones, done: false });
        });
        return out;
      }
      function groupBonePos(g, b) { var p = ringPoint(g.u, g.v); return { x: p.x + b.du * G.bone, y: p.y + b.dv * G.bone }; }
      function groupCentre(g) { return ringPoint(g.u, g.v); }

      /* ---------- the frame ---------- */
      function handPos(t) {
        var p = { x: G.palmX, y: G.palmY };
        if (scoopGroup >= 0 && t >= scoopAt && t <= scoopAt + SCOOP_MS) {
          var k = (t - scoopAt) / SCOOP_MS, e = Math.sin(k * Math.PI);
          var c = groupCentre(groups[scoopGroup]);
          p.x += (c.x - G.palmX) * e; p.y += (c.y + G.handS * 0.1 - G.palmY) * e;
        }
        return p;
      }
      function handAway(t) { return scoopGroup >= 0 && t >= scoopAt && t < scoopAt + SCOOP_MS; }
      /* Height of a thrown bone above the palm at time t for a throw at t0 lasting T. */
      function heightAt(t, t0, T, peak) { var k = (t - t0) / T; return peak * 4 * k * (1 - k); }
      /* Copy a cached layer pixel for pixel (its backing store matches the canvas), keeping any shake. */
      function blit(layer) {
        var m = ctx.getTransform ? ctx.getTransform() : null;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, m ? Math.round(m.e) : 0, m ? Math.round(m.f) : 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(layer, 0, 0);
        ctx.restore();
      }
      function draw() {
        if (destroyed || !W) return;
        var t = gnow(), now = performance.now();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.save();
        if (!reduced && now < shakeUntil) { var sk = (shakeUntil - now) / 350; ctx.translate(Math.sin(now * 0.1) * 6 * sk, Math.cos(now * 0.13) * 3 * sk); }
        var peak = G.palmY - G.peak;
        /* bones on the ground: drawn into a cached layer with the step, except while they scatter in from the hand */
        var scatterK = phase === 'scatter' ? clamp((t - phaseAt) / SCATTER_MS, 0, 1) : 1;
        if (scatterK < 1) {
          blit(bgCanvas);
          drawLabels(ctx);
          groups.forEach(function (g, gi) {
            g.bones.forEach(function (b, bi) {
              var p = groupBonePos(g, b);
              var k = clamp(scatterK * 1.25 - bi * 0.08 - gi * 0.05, 0, 1), e = ease(k);
              var x = G.palmX + (p.x - G.palmX) * e, y = G.palmY + (p.y - G.palmY) * e, lift = Math.sin(k * Math.PI) * G.bone * 1.4;
              boneShadow(x, y, G.bone, 0.35);
              drawBone(x, y - lift, G.bone, b.rot + (reduced ? 0 : (1 - scatterK) * 3), lift, bi);
            });
          });
        } else {
          var key = W + 'x' + H + ':' + dpr + ':' + trickIdx + ':' + score + ':' + state + ':' + groups.map(function (g) { return g.done ? '-' : g.u.toFixed(3); }).join(',');
          if (key !== groundKey) {
            groundKey = key;
            groundCanvas.width = canvas.width; groundCanvas.height = canvas.height;
            var gc = groundCanvas.getContext('2d');
            gc.setTransform(dpr, 0, 0, dpr, 0, 0);
            gc.drawImage(bgCanvas, 0, 0, W, H);
            groups.forEach(function (g) {
              if (g.done) return;
              g.bones.forEach(function (b, bi) { var p = groupBonePos(g, b); boneShadow(p.x, p.y, G.bone, 0.35, gc); drawBone(p.x, p.y, G.bone, b.rot, 0, bi, gc); });
            });
            drawLabels(gc);
          }
          blit(groundCanvas);
        }
        groups.forEach(function (g, gi) {
          if (g.done) return;
          if (state === 'playing' && (phase === 'flight' || phase === 'ready') && trick().groups.length) {
            var c = groupCentre(g), r = G.bone * (g.n === 1 ? 0.95 : 1.45);
            var sel = gi === selected;
            if (sel || (phase === 'flight' && !scooped)) {
              ctx.save();
              ctx.setLineDash(sel ? [8, 6] : [4, 6]);
              ctx.strokeStyle = sel ? C.gold : rgba(C.ink, 0.45); ctx.lineWidth = sel ? 3 : 2;
              ctx.beginPath(); ctx.ellipse(c.x, c.y, r * 1.15, r * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
              ctx.restore();
            }
          }
        });
        /* the hand */
        var hp = handPos(t);
        var pose = 'open';
        if (phase === 'backs1' || phase === 'onback') pose = (phase === 'backs1' && t - phaseAt < 200) ? 'open' : 'back';
        if (phase === 'caught' && t - phaseAt < 260) pose = 'fist';
        if (handAway(t)) pose = 'grab';
        /* catch zone, approach ring and the falling bone's shadow */
        var flying = phase === 'flight' || phase === 'backs1' || phase === 'backs2';
        if (state === 'playing' && flying) {
          var toCatch = catchAt - t;
          var inWin = toCatch <= L.early && toCatch >= -L.late;
          ctx.save();
          ctx.fillStyle = rgba(C.gold, inWin ? 0.28 : 0.1);
          ctx.strokeStyle = rgba(C.gold, inWin ? 1 : 0.7); ctx.lineWidth = inWin ? 4 : 2.5; ctx.setLineDash([9, 7]);
          ctx.beginPath(); ctx.ellipse(G.palmX, G.palmY - G.handS * 0.05, G.handS * 0.62, G.handS * 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.restore();
          /* approach ring closes on the zone exactly when the bone arrives */
          var span = phase === 'backs2' ? air * 0.6 : air;
          var ak = clamp(toCatch / (span * 0.6), 0, 1);
          if (ak > 0) {
            ctx.strokeStyle = rgba(C.gold, 0.35 + 0.5 * (1 - ak)); ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.ellipse(G.palmX, G.palmY - G.handS * 0.05, G.handS * 0.62 * (1 + ak * 1.1), G.handS * 0.45 * (1 + ak * 1.1), 0, 0, Math.PI * 2); ctx.stroke();
          }
          sideLabel(inWin ? 'CATCH!' : (phase === 'flight' && !scooped && trick().groups.length ? 'SCOOP!' : 'CATCH'), inWin ? C.gold : C.ink, inWin ? 1 : 0.8);
        }
        drawHand(hp.x, hp.y, pose, phase === 'backs1' || phase === 'onback' || phase === 'backs2' ? 0 : inHand);
        /* bones in the air */
        if (flying || phase === 'onback' || phase === 'miss') {
          var count = phase === 'flight' ? 1 : phase === 'miss' ? missCount : 5;
          var t0 = throwAt, T = phase === 'backs2' ? air * 0.6 : air;
          var hgt = 0;
          if (phase === 'onback') hgt = G.handS * 0.12;
          else if (phase === 'miss') {
            var mk = clamp((t - phaseAt) / 500, 0, 1);
            hgt = -mk * G.handS * 0.9 + Math.sin(mk * Math.PI) * G.handS * 0.4;
          } else hgt = Math.max(-G.handS * 0.2, heightAt(t, t0, T, phase === 'backs2' ? peak * 0.45 : peak));
          var shadowA = clamp(0.5 - hgt / peak * 0.4, 0.08, 0.5);
          if (phase !== 'onback') boneShadow(G.palmX, G.palmY + G.handS * 0.05, G.bone * (count > 1 ? 2.4 : 1.2) * (0.7 + 0.3 * (1 - hgt / peak)), shadowA * (count > 1 ? 0.6 : 1));
          for (var i = 0; i < count; i++) {
            var off = count === 1 ? 0 : (i - 2) * G.bone * 0.55;
            var bx = G.palmX + off * (phase === 'onback' ? 0.6 : 1), by = G.palmY - G.handS * 0.08 - hgt;
            if (phase === 'miss') bx += (t - phaseAt) * 0.12 * (count === 1 ? 1 : (i - 2) * 0.6);
            var scale = 1 + clamp(hgt / peak, 0, 1) * 0.25;
            if (phase === 'flight' || phase === 'backs1' || phase === 'backs2') {
              /* the jack glows gold so it never gets lost over the bones on the ground, with a short trail */
              if (!reduced) {
                var hPrev = heightAt(t - 45, t0, T, phase === 'backs2' ? peak * 0.45 : peak);
                ctx.globalAlpha = 0.22; drawBone(bx, G.palmY - G.handS * 0.08 - hPrev, G.bone * scale, t * 0.006 + i * 1.3 - 0.25); ctx.globalAlpha = 1;
              }
              ctx.fillStyle = rgba(C.gold, 0.28); ctx.beginPath(); ctx.arc(bx, by, G.bone * scale * 0.72, 0, Math.PI * 2); ctx.fill();
            }
            drawBone(bx, by, G.bone * scale, (reduced ? 0.3 : t * 0.006) + i * 1.3, hgt, i);
          }
        }
        /* level banner */
        if (phase === 'levelup') {
          var lk = clamp((t - phaseAt) / 1400, 0, 1);
          chalkText('Level ' + level + '!', W / 2, H * 0.3, clamp(H * 0.14, 34, 80), C.gold, 'center', 1 - lk * lk);
          chalkText('Faster throws', W / 2, H * 0.3 + clamp(H * 0.11, 28, 60), clamp(H * 0.06, 16, 30), C.ink, 'center', 1 - lk * lk);
        }
        /* prompt for the next move */
        if (state === 'playing' && phase === 'ready') {
          sideLabel(trick().id === 'backs' ? 'Throw all five!' : 'Throw!', C.gold, 1);
        }
        floaters.forEach(function (f) {
          var fk = clamp((now - f.born) / f.life, 0, 1);
          chalkText(f.text, f.x, f.y - (reduced ? 0 : fk * 30), f.size, f.colour, 'center', 1 - fk * fk);
        });
        fx.forEach(function (p) {
          var pk = clamp((now - p.born) / p.life, 0, 1);
          ctx.fillStyle = rgba(p.c || C.ink, 0.55 * (1 - pk));
          ctx.beginPath(); ctx.arc(p.x + p.vx * pk, p.y + p.vy * pk, p.r * (1 + pk), 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
        if (resumeAt) {
          var cd = Math.ceil((resumeAt - now) / ((reduced ? 600 : 1200) / 3));
          ctx.fillStyle = rgba(C.bg, 0.45); ctx.fillRect(0, 0, W, H);
          chalkText(String(clamp(cd, 1, 3)), W / 2, H / 2, clamp(H * 0.3, 60, 140), C.gold);
        }
      }
      function puff(x, y, n, c) {
        var now = performance.now();
        for (var i = 0; i < (reduced ? Math.min(3, n) : n); i++) fx.push({ x: x, y: y, c: c, vx: (api.random() - 0.5) * G.handS * 0.9, vy: (api.random() - 0.7) * G.handS * 0.5, r: 2 + api.random() * 3, born: now, life: 380 + api.random() * 260 });
      }
      function floatText(text, colour, x, y, size) {
        floaters.push({ text: text, colour: colour, x: x == null ? G.palmX : x, y: y == null ? G.palmY - G.handS * 0.9 : y, size: size || clamp(G.handS * 0.3, 16, 30), born: performance.now(), life: 750 });
        if (floaters.length > 3) floaters.shift();
      }

      /* ---------- the loop ---------- */
      function frame() {
        rafId = 0;
        if (destroyed) return;
        var now = performance.now();
        if (resumeAt && now >= resumeAt) { resumeAt = 0; releaseClock(); syncData(); prompt(); }
        if (state === 'playing' && !resumeAt) step(gnow());
        fx = fx.filter(function (p) { return now - p.born < p.life; });
        floaters = floaters.filter(function (f) { return now - f.born < f.life; });
        if (state === 'over' && overAt && now >= overAt) { overAt = 0; showOver(); }
        draw();
        if (wantLoop()) rafId = window.requestAnimationFrame(frame);
      }
      function wantLoop() { return !destroyed && !document.hidden && (state === 'playing' || overAt > 0 || fx.length > 0 || floaters.length > 0); }
      function startLoop() { if (!rafId && !destroyed && !document.hidden) rafId = window.requestAnimationFrame(frame); }
      function stopLoop() { if (rafId) window.cancelAnimationFrame(rafId); rafId = 0; }

      function setPhase(p, t) { phase = p; phaseAt = t; syncData(); updateButton(); }
      function step(t) {
        if (phase === 'scatter' && t - phaseAt >= SCATTER_MS) { api.sound('dice'); setPhase('ready', t); prompt(); }
        else if (phase === 'flight' || phase === 'backs1' || phase === 'backs2') {
          if (scoopGroup >= 0 && !scooped && t >= scoopAt + SCOOP_MS / 2) {
            scooped = true; groups[scoopGroup].done = true; inHand += groups[scoopGroup].n;
            api.sound('clack');
            var c = groupCentre(groups[scoopGroup]); puff(c.x, c.y, 6);
            selectNext();
            syncData();
          }
          if (t > catchAt + L.late + GRACE) miss(scoopGroup >= 0 && scoopAt + SCOOP_MS > catchAt ? 'slow' : phase === 'flight' && !scooped && trick().groups.length ? 'noscoop' : 'drop', t);
        } else if (phase === 'caught' && t - phaseAt >= 300) afterCatch(t);
        else if (phase === 'onback' && t - phaseAt >= 420) {
          throwAt = t; catchAt = t + air * 0.6; setPhase('backs2', t);
          api.sound('whoosh');
          api.status('Now catch them in your palm!');
        } else if (phase === 'levelup' && t - phaseAt >= 1400) startTrick(0, t);
        else if (phase === 'miss' && t - phaseAt >= 900) finish();
      }
      function prompt() {
        if (state !== 'playing') return;
        var tr = trick();
        if (phase === 'ready') api.status('Level ' + level + ', ' + tr.name + ': ' + tr.tell);
      }

      /* ---------- actions ---------- */
      function throwOrCatch(t) {
        if (state !== 'playing' || resumeAt) return;
        if (t == null) t = gnow();
        if (phase === 'ready') { doThrow(t); return; }
        if (phase === 'flight' || phase === 'backs1' || phase === 'backs2') tryCatch(t);
      }
      function doThrow(t) {
        air = airFor(level);
        throwAt = t;
        scooped = false; scoopGroup = -1; scoopAt = -1e9;
        if (trick().id === 'backs') {
          catchAt = t + air;
          inHand = 0;
          setPhase('backs1', t);
          api.status('All five are up! Catch them on the back of your hand.');
        } else {
          catchAt = t + air;
          setPhase('flight', t);
        }
        api.sound('whoosh');
      }
      function scoop(gi, t) {
        if (state !== 'playing' || resumeAt || phase !== 'flight') return;
        var g = groups[gi];
        if (!g || g.done || scooped || scoopGroup >= 0) return;
        if (t == null) t = gnow();
        selected = gi;
        scoopGroup = gi; scoopAt = t;
        api.sound('click');
        syncData();
      }
      function tryCatch(t) {
        if (handAway(t)) return;                     /* your hand is still down on the ground */
        var d = t - catchAt;
        var needScoop = phase === 'flight' && trick().groups.length > 0;
        if (d < -L.early) { miss('early', t); return; }
        if (needScoop && !scooped) { miss('noscoop', t); return; }
        if (d > L.late) { miss('drop', t); return; }
        var perfect = Math.abs(d) <= L.perfect;
        if (phase === 'flight') {
          var pts = 10 * groups[scoopGroup].n * level + (perfect ? 5 * level : 0);
          addScore(pts, perfect);
          api.sound('pop');
          setPhase('caught', t);
        } else if (phase === 'backs1') {
          addScore(25 * level + (perfect ? 5 * level : 0), perfect);
          api.sound('pop');
          setPhase('onback', t);
          api.status('On the back of your hand! Get ready to catch them in your palm.');
        } else {
          addScore(25 * level + (perfect ? 5 * level : 0), perfect);
          api.sound('pop');
          levelDone(t);
        }
      }
      function addScore(pts, perfect) {
        score += pts;
        scoreEl.textContent = String(score);
        floatText((perfect ? 'Perfect! ' : '') + '+' + pts, perfect ? C.gold : C.ink);
        if (perfect) puff(G.palmX, G.palmY - G.handS * 0.2, 8, C.gold);
        syncData();
      }
      function afterCatch(t) {
        if (groups.some(function (g) { return !g.done; })) { setPhase('ready', t); return; }
        /* trick complete */
        api.sound('bell');
        floatText(trick().name + ' done!', C.leaf, W / 2, H * 0.3, clamp(H * 0.07, 20, 40));
        startTrick(trickIdx + 1, t);
      }
      function levelDone(t) {
        var bonus = 50 * level;
        score += bonus; scoreEl.textContent = String(score);
        api.sound('coin');
        floatText('Game won! +' + bonus, C.gold, W / 2, H * 0.55, clamp(H * 0.07, 20, 40));
        api.announce('Level ' + level + ' complete');
        level++;
        roundEl.textContent = String(level);
        inHand = 0;
        setPhase('levelup', t);
        api.status('You played a whole game of fivestones! Level ' + level + ': the throws get faster.');
        trickIdx = 0; renderTricks();
        groups = [];
      }
      function startTrick(i, t) {
        trickIdx = i;
        inHand = 0; scooped = false; scoopGroup = -1;
        groups = layoutGroups(trick().groups);
        selected = 0;
        renderTricks();
        if (groups.length) setPhase('scatter', t);
        else { setPhase('ready', t); prompt(); }
      }
      function selectNext() {
        for (var k = 0; k < groups.length; k++) { var j = (selected + k) % groups.length; if (!groups[j].done) { selected = j; return; } }
      }
      function moveSelection(dir) {
        if (!groups.length) return;
        /* order groups left to right so the arrows feel natural */
        var order = groups.map(function (g, i) { return i; }).filter(function (i) { return !groups[i].done; }).sort(function (a, b) { return groups[a].u - groups[b].u; });
        if (!order.length) return;
        var pos = order.indexOf(selected);
        selected = order[(pos + dir + order.length) % order.length];
        api.sound('tick');
        syncData();
        if (!rafId) draw();
      }
      function miss(why, t) {
        if (phase === 'miss') return;
        missWhy = why;
        missCount = phase === 'flight' ? 1 : 5;
        setPhase('miss', t);
        api.sound('thud'); api.sound('wrong');
        if (!reduced) shakeUntil = performance.now() + 350;
        puff(G.palmX, G.palmY + G.handS * 0.3, 10);
        var msg = why === 'early' ? 'Too early! The bone bounced off your fingers.' : why === 'noscoop' ? 'Out! You have to scoop up a bone before you catch.' : why === 'slow' ? 'Too slow! Your hand was still scooping when the bone came down.' : 'Dropped it! Catch the bone as it lands in your hand.';
        floatText(why === 'early' ? 'Too early!' : why === 'noscoop' ? 'No scoop!' : why === 'slow' ? 'Too slow!' : 'Dropped!', C.red);
        api.status(msg);
      }
      function finish() {
        state = 'over';
        overAt = performance.now() + 300;
        newBest = score > best[levelKey];
        if (newBest) { best[levelKey] = score; api.store.set('best-' + levelKey, score); bestEl.textContent = String(score); }
        pauseBtn.disabled = true;
        setTouchAction(false);
        if (!newBest) api.sound('lose');
        api.status('Out! You scored ' + score + (newBest ? ', a new best!' : '. Best: ' + best[levelKey] + '.') + ' Press Play again.');
        if (newBest) api.celebrate('New best: ' + score + ' points!');
        updateButton();
        syncData();
      }
      function showOver() {
        ovTitle.textContent = newBest ? 'New best!' : 'Out!';
        ovMsg.textContent = score + ' points, reaching level ' + level + ', ' + trick().name + '.';
        ovSub.textContent = 'Best on ' + L.label + ': ' + best[levelKey] + ' points';
        ovBtn.textContent = '▶ Play again';
        overlay.hidden = false;
        fitCard();
      }

      /* ---------- flow ---------- */
      function renderTricks() {
        trickEls.forEach(function (el, i) { el.className = i < trickIdx ? 'done' : i === trickIdx && state !== 'idle' ? 'now' : ''; });
      }
      function updateButton() {
        var label = 'Throw';
        if (state === 'playing') {
          if (phase === 'flight' || phase === 'backs1' || phase === 'backs2') label = 'Catch';
          else if (phase === 'ready' && trick().id === 'backs') label = 'Throw all five';
        } else if (state === 'idle' || state === 'over') label = state === 'over' ? 'Play again' : 'Start';
        else if (state === 'paused') label = 'Resume';
        if (actBtn.textContent !== label) actBtn.textContent = label;
      }
      function resetRun() {
        level = 1; trickIdx = 0; score = 0; newBest = false; missWhy = ''; inHand = 0;
        scooped = false; scoopGroup = -1; scoopAt = -1e9; fx = []; floaters = []; overAt = 0;
        rnd = seeded(Math.floor(api.random() * 1e9));
        groups = layoutGroups(TRICKS[0].groups);
        scoreEl.textContent = '0'; roundEl.textContent = '1';
      }
      function newGame(autoStart) {
        stopLoop();
        resumeAt = 0; pausedAt = null; clockBase = performance.now();
        resetRun();
        state = 'idle'; phase = 'rest';
        pauseBtn.disabled = true; pauseBtn.textContent = 'Pause'; pauseBtn.setAttribute('aria-pressed', 'false');
        setTouchAction(false);
        renderTricks();
        if (autoStart) { start(); return; }
        ovTitle.textContent = 'Knucklebones';
        ovMsg.textContent = 'Throw the jack up, scoop bones off the ground, and catch the jack before it lands.';
        ovSub.textContent = 'Best on ' + L.label + ': ' + best[levelKey] + ' points';
        ovBtn.textContent = '▶ Start';
        overlay.hidden = false;
        fitCard();
        updateButton();
        api.status('Press Start. Throw, scoop up a bone, then catch the falling one.');
        syncData();
        draw();
      }
      function start() {
        stopLoop();
        resetRun();
        clockBase = performance.now(); pausedAt = null; resumeAt = 0;
        state = 'playing';
        overlay.hidden = true;
        pauseBtn.disabled = false; pauseBtn.textContent = 'Pause'; pauseBtn.setAttribute('aria-pressed', 'false');
        setTouchAction(true);
        api.sound('shuffle');
        startTrick(0, 0);
        api.status('Level 1, Ones: ' + TRICKS[0].tell);
        startLoop();
      }
      function overlayAction() { if (state === 'paused') resume(); else start(); focusGame(); }
      function togglePause() { if (state === 'playing') pause(); else if (state === 'paused') resume(); }
      function pause() {
        if (state !== 'playing') return;
        state = 'paused';
        holdClock(); resumeAt = 0;
        stopLoop();
        pauseBtn.textContent = 'Resume'; pauseBtn.setAttribute('aria-pressed', 'true');
        ovTitle.textContent = 'Paused';
        ovMsg.textContent = 'The bones will wait for you.';
        ovSub.textContent = 'Score so far: ' + score;
        ovBtn.textContent = '▶ Resume';
        overlay.hidden = false;
        fitCard();
        updateButton();
        api.status('Paused. Press Resume to carry on.');
        syncData();
        draw();
      }
      function resume() {
        if (state !== 'paused') return;
        state = 'playing';
        overlay.hidden = true;
        pauseBtn.textContent = 'Pause'; pauseBtn.setAttribute('aria-pressed', 'false');
        resumeAt = performance.now() + (reduced ? 600 : 1200);
        api.status('Get ready…');
        updateButton();
        startLoop();
      }
      function setLevel(k) {
        if (!LEVELS[k] || (k === levelKey && state === 'idle')) return;
        levelKey = k; L = LEVELS[k];
        api.store.set('level', k);
        LEVEL_KEYS.forEach(function (x) { levelBtns[x].setAttribute('aria-pressed', String(x === k)); });
        bestEl.textContent = String(best[k]);
        newGame(false);
      }
      /* If the card is taller than the picture on a small screen, drop the message line (the status line above
         says the same thing). */
      function fitCard() {
        ovMsg.hidden = false;
        var card = ovMsg.parentNode;
        if (card && card.scrollHeight > card.clientHeight + 1) ovMsg.hidden = true;
      }
      /* Taps only, never drags, so the canvas keeps touch-action: manipulation (no double-tap zoom) the whole time. */
      function setTouchAction() { canvas.style.touchAction = 'manipulation'; }
      function focusGame() { try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }

      /* Read-only numbers for the automated test. */
      function syncData() {
        var d = canvas.dataset;
        d.state = state; d.phase = phase; d.trick = trick().id; d.level = String(level); d.score = String(score);
        d.catchAt = String(Math.round(realOf(catchAt))); d.throwAt = String(Math.round(realOf(throwAt)));
        d.early = String(L.early); d.late = String(L.late); d.scoop = String(SCOOP_MS);
        d.scooped = String(scooped); d.left = String(groups.filter(function (g) { return !g.done; }).length); d.selected = String(selected);
      }

      /* ---------- input ---------- */
      function onKey(e) {
        if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
        var k = e.key, tgt = e.target;
        if (tgt && tgt.closest && tgt.closest('input, select, textarea')) return;
        var inRoot = !!(tgt && root.contains(tgt));
        if (k === 'p' || k === 'P') { if (state === 'playing' || state === 'paused') { e.preventDefault(); togglePause(); } return; }
        var game = k === ' ' || k === 'Spacebar' || k === 'Enter' || k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown';
        if (!game) return;
        if (state === 'playing') {
          if (!inRoot && tgt && tgt !== document.body && tgt.closest && tgt.closest('a, button, summary')) return;
          e.preventDefault();
          if (e.repeat) return;
          if (k === ' ' || k === 'Spacebar') throwOrCatch(evTime(e));
          else if (k === 'Enter') scoop(selected, evTime(e));
          else if (k === 'ArrowLeft' || k === 'ArrowUp') moveSelection(-1);
          else moveSelection(1);
        } else if (tgt === canvas && (k === ' ' || k === 'Enter')) {
          e.preventDefault();
          if (state === 'paused') resume(); else start();
        }
      }
      function onPointer(e) {
        if (e.button > 0 || state !== 'playing') return;
        e.preventDefault();
        var r = canvas.getBoundingClientRect();
        var x = (e.clientX - r.left) * (W / r.width), y = (e.clientY - r.top) * (H / r.height);
        /* a bone on the ground? (generous target) */
        var bestG = -1, bestD = Infinity;
        groups.forEach(function (g, gi) {
          if (g.done) return;
          g.bones.forEach(function (b) { var p = groupBonePos(g, b); var d = Math.hypot(p.x - x, p.y - y); if (d < bestD) { bestD = d; bestG = gi; } });
        });
        if (bestG >= 0 && bestD < Math.max(36, G.bone * 1.2) && y < G.palmY - G.handS * 0.7) { if (phase === 'flight') scoop(bestG, evTime(e)); else { selected = bestG; syncData(); } return; }
        /* the hand and the lower part of the step throw and catch */
        if (y > G.ringY + G.ry * 0.9) throwOrCatch(evTime(e));
      }
      function onActBtn(e) {
        if (e.button > 0) return;
        e.preventDefault();
        if (state === 'playing') throwOrCatch(evTime(e));
        else if (state === 'paused') resume();
        else start();
      }
      function onVisibility() {
        if (document.hidden) { if (state === 'playing') pause(); stopLoop(); }
        else draw();
      }
      function noMenu(e) { e.preventDefault(); }
      document.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onVisibility);
      canvas.addEventListener('pointerdown', onPointer);
      canvas.addEventListener('contextmenu', noMenu);
      actBtn.addEventListener('pointerdown', onActBtn);
      actBtn.addEventListener('contextmenu', noMenu);

      var lastW = 0, lastDpr = 0;
      function maybeResize() {
        var w = Math.round(stage.clientWidth), r = Math.min(2, window.devicePixelRatio || 1);
        if (w && (w !== lastW || r !== lastDpr)) { lastW = w; lastDpr = r; resize(); }
      }
      var ro = new ResizeObserver(maybeResize);
      ro.observe(stage);
      window.addEventListener('resize', maybeResize);
      if (document.fonts && document.fonts.load) {
        document.fonts.load('700 30px "Cabin Sketch"').then(function () { if (!destroyed) draw(); }, function () {});
      }

      resize();
      newGame(false);

      return {
        destroy: function () {
          destroyed = true;
          stopLoop();
          ro.disconnect();
          window.removeEventListener('resize', maybeResize);
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }
  });
})();
