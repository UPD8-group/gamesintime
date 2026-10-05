/* Cup and Ball (bilboquet) for Games in Time.
   The real toy: a turned wooden cup on a handle with a pointed spike at the other end, and a wooden ball tied to the
   handle by a string. Jerk the handle up to toss the ball, then catch it in the cup, or (the expert's catch) turn
   the toy over and land the ball's hole on the spike.

   How the file is organised:
     1. Settings: difficulty, sizes (world units; the play area is 520 units tall) and the tricks to unlock.
     2. The screen: score bar, canvas, overlay with the big gold Start button, Toss and Flip pads, the tricks list.
     3. Physics, on a fixed 1/120 second step timed from performance.now():
          the handle follows your finger, mouse or the arrow keys on a stiff spring;
          the ball flies under gravity and the string stops it going further than its length (a tether);
          the string you see is a Verlet rope that sags when slack and snaps straight when taut;
          the ball's hole points away from the string while it is pulled, and keeps spinning when it flies free.
     4. Catching: in the cup when the ball drops through the rim, or on the spike when the hole lines up.
     5. Drawing: the chalkboard, the toy, the ball, the string, chalk dust and the score.
   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  var ID = 'cup-and-ball';
  var STEP = 1 / 120;
  var TAU = Math.PI * 2;
  var WORLD_H = 500;           /* world units from top to bottom of the play area */
  var MIN_W = 300;             /* the play area is at least this wide */
  var L = 180;                 /* string length: long, as on a real bilboquet, so the ball can float above the cup */
  var BR = 24;                 /* ball radius */
  var RIM = 74;                /* from the string knot (the middle of the handle) up to the cup's rim */
  var SPIKE = 78;              /* from the knot down to the spike's point */
  var SEAT = 4;                /* a ball resting in the cup sits this far below the rim line */
  var STRETCH = 0.1;           /* a string snapping taut gives the ball a little extra */
  var ROUND = 60;              /* seconds in a round */
  var N = 14;                  /* points in the drawn rope */

  /* cup is how much wider than the ball the cup's mouth is; spikeX and spikeA are how close the ball must be
     to the point, and how well its hole must face the point, for a spike catch. */
  var DIFFS = {
    easy:   { label: 'Easy',   g: 1150, cup: 13, spikeX: 13, spikeA: 0.85 },
    medium: { label: 'Medium', g: 1300, cup: 9,  spikeX: 10, spikeA: 0.7 },
    hard:   { label: 'Hard',   g: 1450, cup: 5,  spikeX: 7,  spikeA: 0.55 }
  };
  var ORDER = ['easy', 'medium', 'hard'];
  var TRICKS = [
    { id: 'cup', name: 'Cup catch', how: 'Toss the ball up and catch it in the cup.' },
    { id: 'hat', name: 'Hat-trick', how: 'Catch three in a row without a miss.' },
    { id: 'spike', name: 'Spike catch', how: 'Press Flip to turn the toy over, toss straight up and land the hole on the point.' },
    { id: 'sky', name: 'Sky high', how: 'Toss the ball right off the top of the board and still catch it.' },
    { id: 'loop', name: 'Round the world', how: 'Swing the ball in a full loop round the cup, then catch it.' },
    { id: 'ten', name: 'Ten in a row', how: 'Ten catches without a miss.' },
    { id: 'flip', name: 'Flip catch', how: 'Toss from the cup, flip the toy while the ball is up, and catch it on the spike.' },
    { id: 'austen', name: "Jane Austen's point", how: 'Three spike catches in a row. She was said to manage a hundred!' }
  ];

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function wrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function seeded(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var CSS =
    '.game-cup-and-ball { display: grid; gap: .65rem; }' +
    '.game-cup-and-ball .cb-bar { margin: 0; justify-content: space-between; }' +
    '.game-cup-and-ball .cb-score { margin: 0; gap: .2rem 1.1rem; font-family: var(--font-mono); font-weight: 700; color: var(--ink-muted); align-items: baseline; }' +
    '.game-cup-and-ball .cb-score span { align-items: baseline; }' +
    '.game-cup-and-ball .cb-score b { font-family: var(--font-display); font-weight: 400; font-size: 1.5rem; color: var(--gold); }' +
    '.game-cup-and-ball .cb-btns { display: flex; gap: .4rem; margin-left: auto; }' +
    '.game-cup-and-ball .cb-btns .btn { padding: .5rem .85rem; }' +
    '@media (max-width: 440px) { .game-cup-and-ball .cb-now { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; } }' +
    '.game-cup-and-ball .cb-stage { position: relative; border-radius: 14px; overflow: hidden; background: var(--bg); box-shadow: 0 0 0 2px var(--line); }' +
    '.game-cup-and-ball canvas { display: block; width: 100%; height: 360px; touch-action: manipulation; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }' +
    '.game-cup-and-ball .is-playing canvas { touch-action: none; cursor: grab; }' +
    '.game-cup-and-ball .is-dragging canvas { cursor: grabbing; }' +
    '.game-cup-and-ball canvas:focus { outline: none; }' +
    '.game-cup-and-ball canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }' +
    '.game-cup-and-ball .cb-ov { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .5rem; padding: .8rem; text-align: center; color: var(--ink);' +
    '  background: radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--bg) 62%, transparent), color-mix(in srgb, var(--bg) 90%, transparent)); }' +
    '.game-cup-and-ball .cb-ov[hidden] { display: none; }' +
    '.game-cup-and-ball .cb-kicker { margin: 0; font-family: var(--font-mono); font-weight: 700; font-size: .82rem; letter-spacing: .14em; text-transform: uppercase; color: var(--era); }' +
    '.game-cup-and-ball .cb-title { margin: 0; font-family: var(--font-poster); font-weight: 700; font-size: clamp(2rem, 1.3rem + 3.4vw, 3.8rem); line-height: 1; color: var(--gold); text-shadow: 3px 3px 0 color-mix(in srgb, var(--vermilion) 75%, transparent); }' +
    '.game-cup-and-ball .cb-msg { margin: 0; max-width: 34rem; font-weight: 600; font-size: clamp(.95rem, .85rem + .5vw, 1.2rem); line-height: 1.35; }' +
    '.game-cup-and-ball .cb-big { margin: 0; font-family: var(--font-display); font-size: clamp(2.4rem, 1.5rem + 4vw, 4.6rem); line-height: 1; color: var(--ink); }' +
    '.game-cup-and-ball .cb-big small { font-size: .42em; color: var(--ink-muted); margin-left: .2em; }' +
    '.game-cup-and-ball .cb-best { margin: 0; font-family: var(--font-mono); font-weight: 700; color: var(--ink-muted); }' +
    '.game-cup-and-ball .cb-ribbon { display: inline-block; margin: 0; padding: .25rem .95rem; border-radius: 999px; background: var(--gold); color: var(--on-era); font-weight: 800; }' +
    '.game-cup-and-ball .cb-go { min-height: 58px; padding: .7rem 2.4rem; font-size: clamp(1.2rem, 1rem + 1vw, 1.6rem); font-weight: 800; }' +
    '.game-cup-and-ball .cb-pad { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }' +
    '.game-cup-and-ball .cb-pad .btn { min-height: 54px; font-size: 1.1rem; touch-action: manipulation; -webkit-user-select: none; user-select: none; }' +
    '.game-cup-and-ball .cb-pad kbd { font-family: var(--font-mono); font-size: .8rem; color: var(--ink-muted); border: 1px solid var(--line); border-radius: 6px; padding: 0 .35rem; }' +
    '.game-cup-and-ball .cb-tricks { margin: 0; }' +
    '.game-cup-and-ball .cb-tricks h3 { margin: 0 0 .45rem; font-family: var(--font-mono); font-size: .82rem; letter-spacing: .14em; text-transform: uppercase; color: var(--era); }' +
    '.game-cup-and-ball .cb-tricks ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .4rem; }' +
    '.game-cup-and-ball .cb-tricks li { margin: 0; display: inline-flex; align-items: center; gap: .35rem; min-height: 36px; padding: .3rem .75rem; border-radius: 999px; border: 2px dashed var(--line); color: var(--ink-muted); font-weight: 700; font-size: .92rem; }' +
    '.game-cup-and-ball .cb-tricks li.on { border: 2px solid var(--gold); color: var(--ink); background: color-mix(in srgb, var(--gold) 16%, transparent); }' +
    '.game-cup-and-ball .cb-tricks li.on::before { content: "\\2713"; color: var(--gold); }' +
    '.game-cup-and-ball .cb-tricks li.new { animation: cb-pop .6s ease-out; }' +
    '@keyframes cb-pop { 0% { transform: scale(1.25); } 100% { transform: scale(1); } }' +
    '.game-cup-and-ball .cb-next { margin: .5rem 0 0; color: var(--ink-muted); font-size: .95rem; }' +
    '.game-cup-and-ball .game-note { margin: 0; }' +
    '.game-cup-and-ball .cb-compact .cb-msg2 { display: none; }' +
    '.game-cup-and-ball .cb-compact .cb-ov { gap: .35rem; padding: .5rem; }' +
    '.game-cup-and-ball .cb-compact .cb-go { min-height: 50px; padding: .55rem 1.8rem; }' +
    '.game-cup-and-ball .cb-compact .seg button { min-height: 40px; padding: .35rem .8rem; }';

  GamesInTime.register({
    id: ID,
    frame: 'stage',
    mount: function (root, api) {
      var h = api.h;
      var destroyed = false;
      var reduced = !!api.reducedMotion;
      var diff = api.store.get('difficulty', 'medium');
      if (!DIFFS[diff]) diff = 'medium';
      var D = DIFFS[diff];
      var bests = api.store.get('best', {});
      if (!bests || typeof bests !== 'object') bests = {};
      var tricks = api.store.get('tricks', {});
      if (!tricks || typeof tricks !== 'object') tricks = {};
      function bestFor(d) { var b = Number(bests[d]); return isFinite(b) && b > 0 ? Math.floor(b) : 0; }
      var runRand = api.random || Math.random;

      /* ---------- the screen ---------- */
      root.appendChild(h('style', null, CSS));
      var scoreEl = h('b', null, '0');
      var bestEl = h('b', null, String(bestFor(diff)));
      var pauseBtn = h('button', { class: 'btn btn-ghost', type: 'button', disabled: true, onclick: function () { if (phase === 'paused') resume(); else pause(); } }, 'Pause');
      var stopBtn = h('button', { class: 'btn btn-ghost', type: 'button', disabled: true, onclick: function () { stopRound(); } }, 'Stop');
      var bar = h('div', { class: 'game-toolbar cb-bar' },
        h('div', { class: 'scoreboard cb-score' }, h('span', { class: 'cb-now' }, 'Score ', scoreEl), h('span', null, 'Best ', bestEl)),
        h('div', { class: 'cb-btns' }, pauseBtn, stopBtn));
      var canvas = h('canvas', { tabindex: '0', role: 'img',
        'aria-label': 'A school chalkboard. A wooden cup and ball toy: a cup on a handle with a spike at the bottom, and a ball with red rings tied on by a string.' });
      var ov = h('div', { class: 'cb-ov' });
      var stage = h('div', { class: 'cb-stage' }, canvas, ov);
      var tossBtn = h('button', { class: 'btn', type: 'button', disabled: true, 'aria-label': 'Toss the ball' }, 'Toss ', h('kbd', null, 'Space'));
      var flipBtn = h('button', { class: 'btn', type: 'button', disabled: true, 'aria-label': 'Flip the toy over' }, 'Flip ', h('kbd', null, 'F'));
      var pad = h('div', { class: 'cb-pad' }, tossBtn, flipBtn);
      var trickList = h('ul', null);
      var nextEl = h('p', { class: 'cb-next' });
      var tricksBox = h('div', { class: 'cb-tricks' }, h('h3', null, 'Tricks to unlock'), trickList, nextEl);
      var note = h('p', { class: 'game-note' }, 'Drag the cup with a finger or the mouse and flick it up to toss. Keys: Left and Right move, Up or Space tosses, F or Down flips, P pauses.');
      root.appendChild(bar);
      root.appendChild(stage);
      root.appendChild(pad);
      root.appendChild(tricksBox);
      root.appendChild(note);
      var ctx = canvas.getContext('2d', { alpha: false });   /* every frame paints the whole picture */

      /* ---------- colours and fonts from the hall's CSS variables ---------- */
      var probe = document.createElement('canvas').getContext('2d');
      var P = {}, F = {};
      function parseColour(str) {
        probe.fillStyle = '#000';
        if (str) probe.fillStyle = str;
        var s = String(probe.fillStyle);
        if (s.charAt(0) === '#') return { r: parseInt(s.slice(1, 3), 16), g: parseInt(s.slice(3, 5), 16), b: parseInt(s.slice(5, 7), 16) };
        var m = s.match(/[\d.]+/g) || [0, 0, 0];
        return { r: +m[0], g: +m[1], b: +m[2] };
      }
      (function readTheme() {
        var cs = getComputedStyle(root);
        function v(name, alt) { return cs.getPropertyValue(name).trim() || (alt ? cs.getPropertyValue(alt).trim() : ''); }
        ['bg', 'surface', 'surface-2', 'ink', 'ink-muted', 'ink-faint', 'gold', 'gold-shadow', 'vermilion', 'peacock', 'cobalt', 'rose', 'leaf', 'brand', 'era'].forEach(function (n) {
          P[n.replace(/-(\w)/g, function (a, c) { return c.toUpperCase(); })] = parseColour(v('--' + n, '--ink'));
        });
        F.display = v('--font-display') || 'serif';
        F.poster = v('--font-poster', '--font-display') || 'serif';
        F.mono = v('--font-mono') || 'monospace';
        F.head = v('--font-head') || 'sans-serif';
      })();
      function css(c, a) { return 'rgba(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ',' + (a == null ? 1 : a) + ')'; }
      function mix(a, b, t) { return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) }; }
      var WOOD = mix(P.gold, P.goldShadow, 0.35), WOOD_D = mix(P.gold, P.bg, 0.55), WOOD_L = mix(P.gold, P.ink, 0.35);
      var BALL = mix(P.gold, P.vermilion, 0.18), BALL_D = mix(BALL, P.bg, 0.45);

      /* ---------- sizes ---------- */
      var cssW = 0, cssH = 0, dpr = 1, scale = 1, worldW = MIN_W, worldH = WORLD_H;
      var board = null;
      function heightFor(w) {
        var vh = window.innerHeight || 800;
        var hh = w < 560 ? w * 1.5 : w * 0.58;
        hh = Math.min(hh, vh * 0.78, 720);
        return Math.round(Math.max(320, hh));
      }
      function resize(force) {
        if (destroyed) return;
        var w = Math.floor(stage.clientWidth || root.clientWidth || 0);
        if (!w || (w === cssW && !force)) return;
        cssW = w;
        cssH = heightFor(w);
        canvas.style.height = cssH + 'px';
        /* cap the backing store at about 2.2 million pixels so big projector screens stay smooth */
        dpr = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(2.2e6 / (cssW * cssH)));
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        scale = Math.min(cssH / WORLD_H, cssW / MIN_W);
        worldW = cssW / scale;
        worldH = cssH / scale;
        stage.classList.toggle('cb-compact', cssH < 400 || cssW < 420);
        if (phase === 'title' || !rope.length) resetToy(); else clampToy();
        board = paintBoard();
        render();
      }

      /* ---------- the chalkboard, painted once per size ---------- */
      function paintBoard() {
        var cv = document.createElement('canvas');
        cv.width = canvas.width; cv.height = canvas.height;
        var c = cv.getContext('2d', { alpha: false }), s = scale * dpr, r = seeded(1880);
        c.fillStyle = css(P.bg); c.fillRect(0, 0, cv.width, cv.height);
        c.setTransform(s, 0, 0, s, 0, 0);
        var g = c.createRadialGradient(worldW * 0.5, worldH * 0.4, 20, worldW * 0.5, worldH * 0.4, Math.max(worldW, worldH) * 0.75);
        g.addColorStop(0, css(mix(P.bg, P.ink, 0.07)));
        g.addColorStop(1, css(P.bg));
        c.fillStyle = g; c.fillRect(0, 0, worldW, worldH);
        /* old rubbings from the duster */
        for (var i = 0; i < 6; i++) {
          c.fillStyle = css(P.ink, 0.014 + r() * 0.012);
          c.beginPath(); c.ellipse(r() * worldW, r() * worldH * 0.85, 80 + r() * 140, 8 + r() * 12, (r() - 0.5) * 0.2, 0, TAU); c.fill();
        }
        /* chalk notes in the corners */
        c.textBaseline = 'alphabetic';
        function note(text, x, y, size, alpha, align, rot) {
          c.save(); c.translate(x, y); c.rotate(rot || 0);
          c.font = '700 ' + size + 'px ' + F.poster;
          c.textAlign = align || 'left';
          c.fillStyle = css(P.ink, alpha);
          c.fillText(text, 0, 0);
          c.restore();
        }
        var wide = worldW > 560;
        note('Bilboquet', 16, worldH - 46, 30, 0.15, 'left', -0.04);
        if (wide) {
          note('Henri III played it in public, c. 1580s', 22, worldH * 0.3, 16, 0.17, 'left', -0.03);
          note('Jane Austen: 100 on the point!', worldW - 22, worldH * 0.42, 16, 0.17, 'right', 0.03);
          note('Bilbocatch, 1808', worldW - 22, worldH - 50, 18, 0.14, 'right', 0.03);
        }
        /* tally marks, as if someone has been counting catches */
        c.strokeStyle = css(P.ink, 0.15); c.lineWidth = 2.4; c.lineCap = 'round';
        var tx = wide ? worldW - 150 : worldW - 96, ty = wide ? worldH * 0.52 : worldH - 120;
        for (var gI = 0; gI < (wide ? 3 : 2); gI++) {
          for (var k = 0; k < 4; k++) { c.beginPath(); c.moveTo(tx + gI * 34 + k * 6, ty); c.lineTo(tx + gI * 34 + k * 6 + 1, ty + 22); c.stroke(); }
          c.beginPath(); c.moveTo(tx + gI * 34 - 4, ty + 17); c.lineTo(tx + gI * 34 + 24, ty + 4); c.stroke();
        }
        /* stars */
        c.fillStyle = css(P.ink, 0.16);
        for (var sI = 0; sI < 10; sI++) { var sx = r() * worldW, sy = r() * worldH * 0.7; c.fillRect(sx - 3, sy - 0.6, 6, 1.2); c.fillRect(sx - 0.6, sy - 3, 1.2, 6); }
        /* the chalk ledge along the bottom */
        var ly = worldH - 16;
        c.fillStyle = css(mix(P.gold, P.bg, 0.6)); c.fillRect(0, ly, worldW, 16);
        c.fillStyle = css(mix(P.gold, P.bg, 0.45)); c.fillRect(0, ly, worldW, 4);
        c.fillStyle = css(P.ink, 0.85); c.fillRect(worldW * 0.18, ly - 5, 26, 6);
        c.fillStyle = css(P.rose, 0.8); c.fillRect(worldW * 0.18 + 34, ly - 5, 18, 6);
        c.fillStyle = css(mix(P.bg, P.ink, 0.35)); c.fillRect(worldW * 0.74, ly - 12, 46, 12);
        c.fillStyle = css(mix(P.gold, P.bg, 0.35)); c.fillRect(worldW * 0.74, ly - 15, 46, 5);
        /* chalk grain */
        c.setTransform(1, 0, 0, 1, 0, 0);
        var n = document.createElement('canvas'); n.width = n.height = 96;
        var nc = n.getContext('2d'), nr = seeded(77);
        nc.fillStyle = css(P.ink);
        for (var q = 0; q < 700; q++) { nc.globalAlpha = nr() * 0.06; nc.fillRect(Math.floor(nr() * 96), Math.floor(nr() * 96), 1, 1); }
        c.fillStyle = c.createPattern(n, 'repeat');
        c.fillRect(0, 0, cv.width, cv.height);
        return cv;
      }

      /* ---------- game state ---------- */
      var phase = 'title';                /* title, playing, paused, over */
      var ball = 'hang';                  /* hang, air, cup, spike */
      var A = { x: 0, y: 0 }, Av = { x: 0, y: 0 }, AvPrev = { x: 0, y: 0 }, T = { x: 0, y: 0 };
      var B = { x: 0, y: 0 }, Bv = { x: 0, y: 0 }, Bprev = { x: 0, y: 0 };
      var Cprev = { x: 0, y: 0 }, Sprev = { x: 0, y: 0 };
      var theta = 0, flipped = false, flipAnim = null;
      var holeA = Math.PI / 2, holeW = 0;
      var loopAcc = 0, lastAng = Math.PI / 2;
      var maxH = 0, tossFrom = 'hang', flippedInAir = false, offTop = false;
      var score = 0, streak = 0, bestStreak = 0, catches = 0, spikeStreak = 0, timeLeft = ROUND;
      var roundTricks = {};
      var keys = { left: false, right: false };
      var jerk = null, drag = null;
      var rope = [];
      var dip = 0, dipV = 0, sway = 0;
      var particles = [], floaters = [], banners = [], shake = 0;
      var clock = 0, frameNo = 0, lastTickSec = 99, hintTime = 0, firstRun = true, readyAt = 0;
      var lastResult = null, scorePop = 0, spikeReady = 0;

      function rimCentre(ax, ay, th) { return { x: ax + Math.sin(th) * RIM, y: ay - Math.cos(th) * RIM }; }
      function spikeTip(ax, ay, th) { return { x: ax - Math.sin(th) * SPIKE, y: ay + Math.cos(th) * SPIKE }; }
      function cw() { return BR + D.cup; }
      function bounds() {
        return { x0: cw() + 26, x1: worldW - cw() - 26, y0: RIM + 50, y1: Math.max(RIM + 70, worldH - L - BR - 24) };
      }
      function clampToy() {
        var b = bounds();
        T.x = clamp(T.x, b.x0, b.x1); T.y = clamp(T.y, b.y0, b.y1);
        A.x = clamp(A.x, b.x0, b.x1); A.y = clamp(A.y, b.y0, b.y1);
        B.x = clamp(B.x, BR, worldW - BR); B.y = clamp(B.y, -400, worldH - BR - 16);
      }
      function resetToy() {
        var b = bounds();
        A.x = T.x = worldW / 2; A.y = T.y = Math.max(b.y0, b.y1 - 6);
        Av.x = Av.y = AvPrev.x = AvPrev.y = 0;
        B.x = A.x; B.y = A.y + L; Bv.x = Bv.y = 0; Bprev.x = B.x; Bprev.y = B.y;
        theta = 0; flipped = false; flipAnim = null;
        holeA = Math.PI / 2; holeW = 0; loopAcc = 0; lastAng = Math.PI / 2;
        ball = 'hang'; jerk = null; dip = 0; dipV = 0; sway = 0;
        var c = rimCentre(A.x, A.y, 0), s = spikeTip(A.x, A.y, 0);
        Cprev.x = c.x; Cprev.y = c.y; Sprev.x = s.x; Sprev.y = s.y;
        rope = [];
        for (var i = 0; i <= N; i++) { var y = A.y + (L - BR) * i / N; rope.push({ x: A.x, y: y, px: A.x, py: y }); }
      }

      /* ---------- effects ---------- */
      function dust(x, y, n, col, spread) {
        for (var i = 0; i < n && particles.length < 120; i++) {
          var a = runRand() * TAU, sp = (0.3 + runRand() * 0.7) * (spread || 160);
          particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0, max: 0.4 + runRand() * 0.35, r: 2 + runRand() * 2.5, c: col });
        }
      }
      function floater(x, y, text, col, size) { floaters.push({ x: x, y: y, text: text, c: col, life: 0, max: 1.1, size: size || 20 }); if (floaters.length > 8) floaters.shift(); }
      function banner(text, col, pri) {
        if (banners.length && banners[0].pri > (pri || 0) && banners[0].life < 0.8) return;
        banners = [{ text: text, c: col || P.gold, life: 0, max: 1.7, pri: pri || 0 }];
      }

      /* ---------- the round ---------- */
      function start() {
        if (destroyed) return;
        resetToy();
        score = 0; streak = 0; bestStreak = 0; catches = 0; spikeStreak = 0; timeLeft = ROUND; roundTricks = {};
        particles = []; floaters = []; banners = []; shake = 0; lastTickSec = 99; scorePop = 0;
        hintTime = firstRun ? 8 : 0; firstRun = false;
        phase = 'playing';
        ov.hidden = true;
        stage.classList.add('is-playing');
        setButtons();
        scoreEl.textContent = '0';
        api.sound('bell');
        banner('Go!', P.gold);
        setStatus('Flick the cup up to toss the ball, then catch it. 60 seconds!');
        try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        startLoop();
      }
      function pause() {
        if (phase !== 'playing') return;
        phase = 'paused';
        stopLoop();
        drag = null; keys.left = keys.right = false;
        stage.classList.remove('is-playing', 'is-dragging');
        setButtons();
        showOverlay('paused');
        setStatus('Paused with ' + Math.ceil(timeLeft) + ' seconds left. Press Resume to carry on.');
      }
      function resume() {
        if (phase !== 'paused') return;
        phase = 'playing';
        ov.hidden = true;
        stage.classList.add('is-playing');
        setButtons();
        setStatus('Score ' + score + '. Keep catching!');
        try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        startLoop();
      }
      function stopRound() { if (phase === 'playing' || phase === 'paused') endRound(true); }
      function endRound(stopped) {
        stopLoop();
        phase = 'over';
        drag = null; keys.left = keys.right = false;
        stage.classList.remove('is-playing', 'is-dragging');
        setButtons();
        var prevBest = bestFor(diff);
        var isBest = score > prevBest && score >= 10;
        if (score > prevBest) { bests[diff] = score; api.store.set('best', bests); }
        bestEl.textContent = String(bestFor(diff));
        scoreEl.textContent = String(score);
        lastResult = { score: score, catches: catches, bestStreak: bestStreak, isBest: isBest, stopped: !!stopped, tricks: Object.keys(roundTricks) };
        if (!stopped && !isBest) api.sound('bell');
        showOverlay('over');
        var msg = (stopped ? 'Stopped. ' : 'Time! ') + 'You scored ' + score + ' with ' + catches + (catches === 1 ? ' catch' : ' catches') + '. ';
        if (isBest) { msg += 'A new best on ' + D.label + '!'; api.celebrate('New best: ' + score + ' points!'); }
        else msg += 'Best on ' + D.label + ': ' + bestFor(diff) + '. Press Play again.';
        setStatus(msg);
        readyAt = performance.now() + 800;
        render();
      }

      /* ---------- controls ---------- */
      function toss() {
        if (phase !== 'playing' || jerk) return;
        var seated = ball === 'cup' || ball === 'spike';
        jerk = { t: 0, amp: (seated ? 38 : 80) * Math.sqrt(D.g / 1300), dx: (runRand() - 0.5) * 12 };
        hintTime = Math.min(hintTime, 0);
      }
      function flip() {
        if (phase !== 'playing' || flipAnim) return;
        flipped = !flipped;
        flipAnim = { t: 0, from: theta, to: flipped ? Math.PI : 0 };
        if (ball === 'cup' || ball === 'spike') release();
        if (ball === 'air' && tossFrom === 'cup') flippedInAir = true;
        api.sound('flip');
        setStatus(flipped ? 'Spike up! Toss straight up and land the hole on the point.' : 'Cup up. Toss and catch it in the cup.');
      }

      /* ---------- physics ---------- */
      function step(dt) {
        clock += dt;
        if (phase === 'playing') {
          timeLeft -= dt;
          if (hintTime > 0) hintTime -= dt;
          var sec = Math.ceil(timeLeft);
          if (sec <= 5 && sec < lastTickSec && sec > 0) { lastTickSec = sec; api.sound('tick'); }
          if (sec === 10 && lastTickSec > 10) { lastTickSec = 10; setStatus('10 seconds left! Score ' + score + '.'); }
          if (timeLeft <= 0) { timeLeft = 0; endRound(false); return; }
        }
        moveToy(dt);
        moveBall(dt);
        moveRope(dt);
        for (var i = particles.length - 1; i >= 0; i--) {
          var p = particles[i]; p.life += dt;
          if (p.life >= p.max) { particles.splice(i, 1); continue; }
          p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        }
        for (var j = floaters.length - 1; j >= 0; j--) { floaters[j].life += dt; if (floaters[j].life >= floaters[j].max) floaters.splice(j, 1); }
        for (var k = banners.length - 1; k >= 0; k--) { banners[k].life += dt; if (banners[k].life >= banners[k].max) banners.splice(k, 1); }
        if (shake > 0) shake = Math.max(0, shake - dt);
        if (scorePop > 0) scorePop = Math.max(0, scorePop - dt);
      }

      function moveToy(dt) {
        var b = bounds();
        var kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        if (kx) T.x += kx * 560 * dt;
        T.x = clamp(T.x, b.x0, b.x1); T.y = clamp(T.y, b.y0, b.y1);
        var jx = 0, jy = 0;
        if (jerk) {
          jerk.t += dt;
          var u = jerk.t;
          if (u < 0.08) { jy = -jerk.amp * smooth(u / 0.08); jx = jerk.dx * smooth(u / 0.08); }
          else if (u < 0.32) { jy = -jerk.amp * (1 - smooth((u - 0.08) / 0.24)); jx = jerk.dx; }
          else { jerk = null; }
        }
        var tx = clamp(T.x + jx, b.x0, b.x1), ty = clamp(T.y + jy, b.y0 - 60, b.y1);
        var w = 38;
        AvPrev.x = Av.x; AvPrev.y = Av.y;
        Av.x += (w * w * (tx - A.x) - 2 * w * Av.x) * dt;
        Av.y += (w * w * (ty - A.y) - 2 * w * Av.y) * dt;
        var sp = Math.sqrt(Av.x * Av.x + Av.y * Av.y);
        if (sp > 1700) { Av.x *= 1700 / sp; Av.y *= 1700 / sp; }
        A.x += Av.x * dt; A.y += Av.y * dt;
        if (flipAnim) {
          flipAnim.t += dt;
          var k = clamp(flipAnim.t / 0.26, 0, 1);
          theta = lerp(flipAnim.from, flipAnim.to, smooth(k));
          if (k >= 1) { theta = flipAnim.to; flipAnim = null; }
        }
        dipV += (-260 * dip - 18 * dipV) * dt; dip += dipV * dt;
        sway = lerp(sway, clamp(Av.x / 2600, -0.22, 0.22), Math.min(1, dt * 12));
      }

      function seatPos(kind) {
        if (kind === 'cup') { var c = rimCentre(A.x, A.y, theta); return { x: c.x, y: c.y + SEAT }; }
        var s = spikeTip(A.x, A.y, theta); return { x: s.x, y: s.y - (BR - 13) };
      }
      function release() {
        tossFrom = ball;
        ball = 'air';
        maxH = 0; offTop = false; flippedInAir = false;
        Bv.x = AvPrev.x; Bv.y = AvPrev.y;
        holeW = (runRand() - 0.5) * 0.6;
        loopAcc = 0; lastAng = Math.atan2(B.y - A.y, B.x - A.x);
      }

      function moveBall(dt) {
        var g = D.g;
        Bprev.x = B.x; Bprev.y = B.y;
        var C = rimCentre(A.x, A.y, theta), S = spikeTip(A.x, A.y, theta);
        var settled = !flipAnim;
        if (ball === 'cup' || ball === 'spike') {
          /* the ball leaves the cup when the cup stops rising faster than gravity can slow the ball: a toss.
             (Moving the cup down never throws the ball out, which keeps dragging with a finger fair.) */
          var ay = (Av.y - AvPrev.y) / dt;
          if ((ay > g * 1.02 && AvPrev.y < -80) || !settled) release();
          else {
            var seat = seatPos(ball);
            B.x = seat.x; B.y = seat.y; Bv.x = Av.x; Bv.y = Av.y;
            if (ball === 'spike') holeA = Math.atan2(S.y - B.y, S.x - B.x);
            Cprev.x = C.x; Cprev.y = C.y; Sprev.x = S.x; Sprev.y = S.y;
            return;
          }
        }
        Bv.y += g * dt;
        Bv.x *= (1 - 0.12 * dt); Bv.y *= (1 - 0.04 * dt);
        B.x += Bv.x * dt; B.y += Bv.y * dt;
        /* the string: the ball can never be further than L from the knot */
        var dx = B.x - A.x, dy = B.y - A.y, d = Math.sqrt(dx * dx + dy * dy), snap = 0, taut = false;
        if (d > L) {
          var nx = dx / d, ny = dy / d;
          B.x = A.x + nx * L; B.y = A.y + ny * L;
          var vr = (Bv.x - Av.x) * nx + (Bv.y - Av.y) * ny;
          if (vr > 0) { Bv.x -= nx * vr * (1 + STRETCH); Bv.y -= ny * vr * (1 + STRETCH); snap = vr; }
          taut = true; d = L;
        }
        if (B.x < BR) { B.x = BR; if (Bv.x < 0) Bv.x *= -0.5; }
        if (B.x > worldW - BR) { B.x = worldW - BR; if (Bv.x > 0) Bv.x *= -0.5; }
        if (B.y > worldH - 16 - BR) { B.y = worldH - 16 - BR; if (Bv.y > 0) Bv.y *= -0.3; }
        /* the hole faces away from the string while it pulls; otherwise the ball keeps spinning */
        var ang = Math.atan2(B.y - A.y, B.x - A.x);
        if (taut || d > L - 1.5) { holeW = clamp(wrap(ang - holeA) * 22, -30, 30); holeA = wrap(holeA + holeW * dt); }
        else { holeA = wrap(holeA + holeW * dt); holeW *= (1 - 0.3 * dt); }
        loopAcc += wrap(ang - lastAng); lastAng = ang;
        var rvx = Bv.x - Av.x, rvy = Bv.y - Av.y, rel = Math.sqrt(rvx * rvx + rvy * rvy);
        if (ball === 'hang' && taut && B.y > A.y) {
          /* string friction: a swinging ball settles in a couple of seconds */
          var tx = -(B.y - A.y) / L, ty = (B.x - A.x) / L, vt = rvx * tx + rvy * ty, damp = Math.min(1, 1.1 * dt);
          Bv.x -= tx * vt * damp; Bv.y -= ty * vt * damp;
        }
        if (ball === 'hang') {
          var above = flipped ? (B.y < S.y - BR) : (B.y < C.y - BR);
          if (above && settled) { ball = 'air'; tossFrom = 'hang'; maxH = 0; offTop = false; flippedInAir = false; }
          else if (rel < 60 && taut) loopAcc = 0;
        }
        if (ball === 'air') {
          var surf = flipped ? S.y : C.y;
          maxH = Math.max(maxH, surf - B.y);
          if (B.y < -BR) offTop = true;
          if (settled && rvy > 0) {
            if (!flipped) checkCup(C); else checkSpike(S);
          }
          if (flipped && ball === 'air' && B.y < S.y) {
            var aligned = Math.abs(B.x - S.x) <= D.spikeX * 1.5 && Math.abs(wrap(holeA - Math.atan2(S.y - B.y, S.x - B.x))) <= D.spikeA;
            spikeReady = aligned ? Math.min(1, spikeReady + dt * 8) : Math.max(0, spikeReady - dt * 8);
          } else spikeReady = Math.max(0, spikeReady - dt * 8);
          if (ball === 'air') {
            if ((snap > 140 && B.y > A.y) || (B.y > A.y + 0.75 * L && rel < 260)) missed(snap);
          }
        }
        Cprev.x = C.x; Cprev.y = C.y; Sprev.x = S.x; Sprev.y = S.y;
      }

      function bounceOff(px, py, e) {
        var dx = B.x - px, dy = B.y - py, d = Math.sqrt(dx * dx + dy * dy);
        if (d >= BR || d < 0.001) return false;
        var nx = dx / d, ny = dy / d;
        B.x = px + nx * BR; B.y = py + ny * BR;
        var rvx = Bv.x - Av.x, rvy = Bv.y - Av.y, vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          Bv.x -= nx * vn * (1 + e); Bv.y -= ny * vn * (1 + e);
          holeW += (rvx * ny - rvy * nx) / BR * 0.5;
          if (-vn > 60) { api.sound('tick'); dust(px, py, 3, P.ink, 90); }
        }
        return true;
      }
      /* The cup's mouth: a ball dropping through the rim line inside it is caught; outside it, it hits the rim. */
      function checkCup(C) {
        var lx = B.x - C.x, ly = B.y - C.y, lyPrev = Bprev.y - Cprev.y, half = cw(), gate = -BR * 0.3;
        var inMouth = Math.abs(lx) <= half - BR * 0.3;
        /* dropping through the rim, or settling back into the cup after a little hop */
        if (inMouth && ly >= gate && (lyPrev < gate || ly <= SEAT + 14)) { catchBall('cup'); return; }
        if (!inMouth || ly > 0) { if (!bounceOff(C.x - half - 3, C.y, 0.45)) bounceOff(C.x + half + 3, C.y, 0.45); }
      }
      /* The spike: the ball must come down onto the point, close to centre, with its hole facing the point. */
      function checkSpike(S) {
        var lx = B.x - S.x, bottom = B.y + BR, bottomPrev = Bprev.y + BR;
        if (Math.abs(lx) <= D.spikeX && bottom >= S.y - 1 && (bottomPrev <= Sprev.y + 4 || bottom <= S.y + 16)) {
          var need = Math.atan2(S.y - B.y, S.x - B.x);
          if (Math.abs(wrap(holeA - need)) <= D.spikeA) { catchBall('spike'); return; }
        }
        bounceOff(S.x, S.y, 0.5);
      }

      function catchBall(kind) {
        ball = kind;
        var seat = seatPos(kind);
        B.x = seat.x; B.y = seat.y; Bv.x = Av.x; Bv.y = Av.y;
        dipV += kind === 'spike' ? 110 : 150;
        var counts = tossFrom === 'hang' || maxH >= BR + 16;
        if (phase !== 'playing') { loopAcc = 0; return; }
        if (!counts) { api.sound('tick'); loopAcc = 0; return; }
        streak++; catches++;
        if (streak > bestStreak) bestStreak = streak;
        spikeStreak = kind === 'spike' ? spikeStreak + 1 : 0;
        var mult = Math.min(5, 1 + Math.floor((streak - 1) / 2));
        var base = kind === 'spike' ? 50 : 10;
        var bonus = Math.floor(Math.max(0, maxH - BR) / 60) * 2;
        var done = [kind];
        var loop = Math.abs(loopAcc) >= TAU * 0.92;
        if (loop) { done.push('loop'); bonus += 40; }
        if (offTop) { done.push('sky'); bonus += 10; }
        if (streak >= 3) done.push('hat');
        if (streak >= 10) done.push('ten');
        if (spikeStreak >= 3) done.push('austen');
        if (kind === 'spike' && tossFrom === 'cup' && flippedInAir) done.push('flip');
        var pts = (base + bonus) * mult;
        score += pts;
        scorePop = 0.35;
        api.sound('clack');
        if (kind === 'spike') api.sound('coin');
        dust(B.x, B.y - BR * 0.6, kind === 'spike' ? 16 : 10, kind === 'spike' ? P.gold : P.ink, 170);
        if (!reduced) shake = kind === 'spike' ? 0.2 : 0.1;
        floater(B.x, B.y - BR - 26, '+' + pts, kind === 'spike' ? P.gold : P.ink, kind === 'spike' ? 28 : 22);
        if (mult > 1) floater(B.x + 34, B.y - BR - 4, '×' + mult, P.leaf, 18);
        if (kind === 'spike') banner('On the spike!', P.gold);
        else if (loop) banner('Round the world!', P.peacock);
        else if (streak === 3) banner('Hat-trick!', P.leaf);
        else if (streak === 10) banner('Ten in a row!', P.leaf);
        done.forEach(function (id) {
          roundTricks[id] = true;
          if (!tricks[id]) {
            tricks[id] = true;
            api.store.set('tricks', tricks);
            var t = TRICKS.filter(function (x) { return x.id === id; })[0];
            if (t) { banner('New trick: ' + t.name, P.gold, 2); api.sound('bell'); api.announce('New trick unlocked: ' + t.name); }
            renderTricks(id);
          }
        });
        loopAcc = 0;
        scoreEl.textContent = String(score);
        setStatus('Score ' + score + '. ' + (streak > 1 ? streak + ' in a row' + (mult > 1 ? ', points times ' + mult : '') + '!' : 'Nice catch!'));
      }
      function missed(snap) {
        ball = 'hang';
        loopAcc = 0;
        if (phase !== 'playing') return;
        if (snap > 140 || streak) api.sound('tick');
        if (streak >= 2) { floater(B.x, B.y - 30, 'Missed!', P.vermilion, 20); setStatus('Missed! The run of ' + streak + ' is over. Toss again.'); }
        streak = 0; spikeStreak = 0;
      }

      /* The rope you see: Verlet points pinned to the knot and the ball. They sag when the string is slack. */
      function moveRope(dt) {
        var seg = L / N, g = D.g * dt * dt;
        var ax = B.x - Math.cos(holeA) * BR, ay = B.y - Math.sin(holeA) * BR;
        for (var i = 1; i < N; i++) {
          var p = rope[i];
          var vx = (p.x - p.px) * 0.97, vy = (p.y - p.py) * 0.97;
          p.px = p.x; p.py = p.y;
          p.x += vx; p.y += vy + g;
        }
        rope[0].x = A.x; rope[0].y = A.y; rope[N].x = ax; rope[N].y = ay;
        for (var it = 0; it < 10; it++) {
          for (var j = 0; j < N; j++) {
            var a = rope[j], b = rope[j + 1];
            var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d <= seg || d < 0.0001) continue;
            var diffD = (d - seg) / d;
            var wa = j === 0 ? 0 : 0.5, wb = j + 1 === N ? 0 : 0.5;
            if (wa + wb === 0) continue;
            var k = diffD / (wa + wb);
            a.x += dx * k * wa; a.y += dy * k * wa;
            b.x -= dx * k * wb; b.y -= dy * k * wb;
          }
          rope[0].x = A.x; rope[0].y = A.y; rope[N].x = ax; rope[N].y = ay;
        }
      }

      /* ---------- the loop: fixed steps timed with performance.now() ---------- */
      var raf = 0, last = 0, acc = 0;
      function frame() {
        raf = 0;
        if (destroyed || phase !== 'playing') return;
        var now = performance.now();
        var dt = (now - last) / 1000;
        last = now;
        if (dt > 0.25) dt = 0.25;
        if (dt < 0) dt = 0;
        acc += dt;
        var n = 0;
        while (acc >= STEP && n < 40) { step(STEP); acc -= STEP; n++; if (phase !== 'playing') break; }
        if (phase !== 'playing' || destroyed) return;
        render();
        raf = requestAnimationFrame(frame);
      }
      function startLoop() { if (raf || destroyed) return; last = performance.now(); acc = 0; raf = requestAnimationFrame(frame); }
      function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

      /* ---------- drawing ---------- */
      function render() {
        if (!cssW || !board || destroyed) return;
        var s = scale * dpr, shx = 0, shy = 0;
        if (shake > 0 && !reduced) { shx = (Math.random() - 0.5) * shake * 30 * dpr; shy = (Math.random() - 0.5) * shake * 30 * dpr; }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(board, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.setTransform(s, 0, 0, s, shx, shy);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        /* shadow of the toy on the ledge */
        ctx.fillStyle = css(P.bg, 0.45);
        ctx.beginPath(); ctx.ellipse(A.x, worldH - 14, 34, 4, 0, 0, TAU); ctx.fill();
        var seated = ball === 'cup' || ball === 'spike';
        drawRope();
        if (seated && ball === 'cup') { drawToy(true); drawBall(B.x, B.y + dip); drawCupFront(); }
        else { drawToy(false); drawBall(B.x, B.y + (seated ? dip : 0)); }
        drawParticles();
        drawFloaters();
        if (B.y < -BR * 0.5) drawOffTop();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawHud();
        frameNo++;
        publishState();
      }

      function drawRope() {
        ctx.strokeStyle = css(P.ink, 0.92); ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(rope[0].x, rope[0].y + dip);
        for (var i = 1; i < N; i++) {
          var mx = (rope[i].x + rope[i + 1].x) / 2, my = (rope[i].y + rope[i + 1].y) / 2;
          ctx.quadraticCurveTo(rope[i].x, rope[i].y, mx, my);
        }
        ctx.lineTo(rope[N].x, rope[N].y);
        ctx.stroke();
      }

      /* The toy, drawn in its own frame: the knot is at (0, 0), the cup is up (negative y) and the spike down. */
      function toyFrame() {
        ctx.translate(A.x, A.y + dip);
        ctx.rotate(theta + sway * (flipped ? -1 : 1) * 0.6);
      }
      function cupBodyPath(half) {
        ctx.beginPath();
        ctx.moveTo(-half - 7, -RIM);
        ctx.bezierCurveTo(-half - 7, -RIM + 22, -14, -RIM + 26, -9, -RIM + 31);
        ctx.lineTo(9, -RIM + 31);
        ctx.bezierCurveTo(14, -RIM + 26, half + 7, -RIM + 22, half + 7, -RIM);
        ctx.closePath();
      }
      /* Turned wood: lighter where the light catches the curve, darker round the back. */
      function woodGrad(x0, x1) {
        var g = ctx.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, css(WOOD_D));
        g.addColorStop(0.3, css(WOOD_L));
        g.addColorStop(0.6, css(WOOD));
        g.addColorStop(1, css(WOOD_D));
        return g;
      }
      function cupBand(half) {
        ctx.strokeStyle = css(P.vermilion); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-half - 5, -RIM + 9); ctx.quadraticCurveTo(0, -RIM + 15, half + 5, -RIM + 9); ctx.stroke();
      }
      function drawToy() {
        var half = cw();
        ctx.save();
        toyFrame();
        var chalk = css(P.ink, 0.7);
        ctx.lineWidth = 1.5; ctx.strokeStyle = chalk;
        /* handle with two painted rings */
        ctx.fillStyle = woodGrad(-8, 8);
        roundRect(-8, -RIM + 26, 16, RIM - 26 + 44, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = css(P.vermilion);
        [-26, 6].forEach(function (y) { ctx.fillRect(-8.5, y, 17, 5); });
        /* spike: a collar, then the point */
        ctx.fillStyle = woodGrad(-12, 12);
        roundRect(-12, 42, 24, 9, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = woodGrad(-7, 7);
        ctx.beginPath(); ctx.moveTo(-7, 51); ctx.lineTo(7, 51); ctx.lineTo(1.3, SPIKE - 2); ctx.lineTo(-1.3, SPIKE - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = css(WOOD_D); ctx.beginPath(); ctx.arc(0, SPIKE - 2, 1.8, 0, TAU); ctx.fill();
        if (spikeReady > 0) {
          ctx.fillStyle = css(P.gold, 0.35 * spikeReady); ctx.beginPath(); ctx.arc(0, SPIKE - 2, 10 + 6 * spikeReady, 0, TAU); ctx.fill();
          ctx.fillStyle = css(P.gold, spikeReady); ctx.beginPath(); ctx.arc(0, SPIKE - 2, 3.4, 0, TAU); ctx.fill();
        }
        /* cup: a turned goblet with a dark mouth */
        cupBodyPath(half);
        ctx.fillStyle = woodGrad(-half - 7, half + 7); ctx.fill(); ctx.strokeStyle = chalk; ctx.stroke();
        ctx.fillStyle = css(mix(P.bg, P.goldShadow, 0.35));
        ctx.beginPath(); ctx.ellipse(0, -RIM, half + 5, 7, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = css(WOOD_L); ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.ellipse(0, -RIM, half + 6, 7.5, 0, 0, TAU); ctx.stroke();
        cupBand(half);
        /* the knot where the string is tied */
        ctx.fillStyle = css(P.ink); ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, TAU); ctx.fill();
        /* a hand gripping the handle, with a cuff */
        ctx.fillStyle = css(mix(P.ink, P.rose, 0.2)); ctx.strokeStyle = css(P.bg, 0.55); ctx.lineWidth = 1.3;
        roundRect(-13, 12, 27, 20, 9); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, 17); ctx.lineTo(13, 17); ctx.moveTo(8, 22); ctx.lineTo(13.5, 22); ctx.moveTo(8, 27); ctx.lineTo(13, 27); ctx.stroke();
        ctx.fillStyle = css(P.cobalt); roundRect(-14, 31, 29, 10, 3); ctx.fill();
        ctx.restore();
      }
      /* With the ball sitting in the cup, draw the front of the cup again over it so it looks inside. */
      function drawCupFront() {
        var half = cw();
        ctx.save();
        toyFrame();
        ctx.beginPath(); ctx.rect(-half - 12, -RIM, half * 2 + 24, 40); ctx.clip();
        cupBodyPath(half);
        ctx.fillStyle = woodGrad(-half - 7, half + 7); ctx.fill();
        ctx.strokeStyle = css(P.ink, 0.7); ctx.lineWidth = 1.5; ctx.stroke();
        cupBand(half);
        ctx.strokeStyle = css(WOOD_L); ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.ellipse(0, -RIM, half + 6, 7.5, 0, 0, Math.PI); ctx.stroke();
        ctx.restore();
      }
      function drawBall(x, y) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = css(BALL); ctx.strokeStyle = css(P.ink, 0.8); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 0, BR, 0, TAU); ctx.fill();
        ctx.save();
        ctx.clip();
        /* painted red rings, at right angles to the hole */
        ctx.rotate(holeA);
        ctx.fillStyle = css(P.vermilion);
        ctx.fillRect(-BR * 0.18, -BR, BR * 0.16, BR * 2);
        ctx.fillRect(BR * 0.22, -BR, BR * 0.12, BR * 2);
        ctx.fillStyle = css(BALL_D, 0.55);
        ctx.beginPath(); ctx.arc(-BR * 0.2, BR * 0.2, BR, 0, TAU); ctx.arc(-BR * 0.2, BR * 0.2, BR * 1.6, 0, TAU, true); ctx.fill();
        /* the hole for the spike */
        ctx.fillStyle = css(P.bg);
        ctx.beginPath(); ctx.ellipse(BR * 0.66, 0, BR * 0.17, BR * 0.3, 0, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.stroke();
        ctx.fillStyle = css(P.ink, 0.55);
        ctx.beginPath(); ctx.ellipse(-BR * 0.38, -BR * 0.42, BR * 0.22, BR * 0.12, -0.7, 0, TAU); ctx.fill();
        ctx.restore();
      }
      function drawParticles() {
        for (var i = 0; i < particles.length; i++) {
          var p = particles[i], k = 1 - p.life / p.max;
          ctx.fillStyle = css(p.c, 0.9 * k);
          ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
        }
      }
      function drawFloaters() {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (var i = 0; i < floaters.length; i++) {
          var f = floaters[i], k = f.life / f.max;
          ctx.font = '700 ' + f.size + 'px ' + F.poster;
          ctx.fillStyle = css(P.bg, 0.7 * (1 - k));
          ctx.fillText(f.text, f.x + 2, f.y - k * 40 + 2);
          ctx.fillStyle = css(f.c, 1 - k * k);
          ctx.fillText(f.text, f.x, f.y - k * 40);
        }
      }
      function drawOffTop() {
        var x = clamp(B.x, 20, worldW - 20);
        ctx.fillStyle = css(P.gold);
        ctx.beginPath(); ctx.moveTo(x, 6); ctx.lineTo(x - 11, 22); ctx.lineTo(x + 11, 22); ctx.closePath(); ctx.fill();
        ctx.font = '700 15px ' + F.mono; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('ball', x, 26);
      }
      function roundRect(x, y, w, hh, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + hh - r); ctx.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh);
        ctx.lineTo(x + r, y + hh); ctx.quadraticCurveTo(x, y + hh, x, y + hh - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      }
      function drawHud() {
        if (phase !== 'playing') return;
        var big = Math.round(clamp(cssH * 0.085, 26, 48));
        var small = Math.round(clamp(big * 0.32, 11, 15));
        /* time, top left */
        var secs = Math.ceil(timeLeft), tText = Math.floor(secs / 60) + ':' + (secs % 60 < 10 ? '0' : '') + (secs % 60);
        ctx.font = '400 ' + big + 'px ' + F.display;
        var tw = ctx.measureText(tText).width;
        ctx.fillStyle = css(P.bg, 0.72); roundRect(8, 8, tw + 24, big * 1.5 + 6, 12); ctx.fill();
        var hurry = secs <= 10;
        ctx.fillStyle = css(hurry ? P.vermilion : P.ink);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(tText, 20, 8 + big);
        ctx.font = '700 ' + small + 'px ' + F.mono; ctx.fillStyle = css(P.inkMuted);
        ctx.fillText('TIME', 20, 12 + big * 1.38);
        /* score, top right */
        var sText = String(score);
        var pop = reduced ? 1 : 1 + scorePop * 0.6;
        ctx.font = '400 ' + Math.round(big * pop) + 'px ' + F.display;
        var sw = ctx.measureText(sText).width;
        ctx.font = '700 ' + small + 'px ' + F.mono;
        var sub = 'BEST ' + bestFor(diff);
        var bw = Math.max(sw, ctx.measureText(sub).width) + 24;
        ctx.fillStyle = css(P.bg, 0.72); roundRect(cssW - 8 - bw, 8, bw, big * 1.5 + 6, 12); ctx.fill();
        ctx.textAlign = 'right';
        ctx.font = '400 ' + Math.round(big * pop) + 'px ' + F.display; ctx.fillStyle = css(P.gold);
        ctx.fillText(sText, cssW - 20, 8 + big);
        ctx.font = '700 ' + small + 'px ' + F.mono; ctx.fillStyle = css(P.inkMuted);
        ctx.fillText(sub, cssW - 20, 12 + big * 1.38);
        /* combo */
        if (streak >= 2) {
          var mult = Math.min(5, 1 + Math.floor((streak - 1) / 2));
          var cText = streak + ' in a row' + (mult > 1 ? '  ×' + mult : '');
          ctx.font = '700 ' + Math.round(small * 1.15) + 'px ' + F.head;
          var cw2 = ctx.measureText(cText).width + 22;
          ctx.fillStyle = css(mult > 1 ? P.leaf : P.surface2, 0.92); roundRect(cssW - 8 - cw2, 16 + big * 1.5, cw2, small * 2.1, small * 1.05); ctx.fill();
          ctx.fillStyle = css(mult > 1 ? P.bg : P.ink); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(cText, cssW - 8 - cw2 / 2, 16 + big * 1.5 + small * 1.05);
        }
        /* flipped badge */
        if (flipped) {
          ctx.font = '700 ' + small + 'px ' + F.mono;
          var fText = 'SPIKE UP';
          var fw = ctx.measureText(fText).width + 18;
          ctx.fillStyle = css(P.gold, 0.9); roundRect(8, 16 + big * 1.5, fw, small * 2, small); ctx.fill();
          ctx.fillStyle = css(P.bg); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(fText, 8 + fw / 2, 16 + big * 1.5 + small);
        }
        /* banners */
        for (var i = 0; i < banners.length; i++) {
          var b = banners[i], k = b.life / b.max;
          var size = Math.round(clamp(cssH * 0.06, 18, 38) * (reduced ? 1 : (k < 0.12 ? 0.7 + 2.5 * k : 1)));
          ctx.font = '700 ' + size + 'px ' + F.poster;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          var maxW = cssW - 24, mw = ctx.measureText(b.text).width;
          if (mw > maxW) { size = Math.floor(size * maxW / mw); ctx.font = '700 ' + size + 'px ' + F.poster; }
          var y = Math.max(cssH * 0.2, 30 + big * 1.9) + i * size * 1.15;
          ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
          ctx.fillStyle = css(P.bg, 0.85); ctx.fillText(b.text, cssW / 2 + 3, y + 3);
          ctx.fillStyle = css(b.c); ctx.fillText(b.text, cssW / 2, y);
          ctx.globalAlpha = 1;
        }
        if (hintTime > 0) {
          var hint = hintTime > 4 ? 'Drag the cup, flick it up to toss' : 'Keys: arrows move, Space tosses';
          ctx.font = '700 ' + Math.round(clamp(cssH * 0.042, 13, 19)) + 'px ' + F.head;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          var hw = ctx.measureText(hint).width + 24, hy = cssH - 16 * scale - 26;
          ctx.fillStyle = css(P.bg, 0.8); roundRect(cssW / 2 - hw / 2, hy - 16, hw, 32, 16); ctx.fill();
          ctx.fillStyle = css(P.ink); ctx.fillText(hint, cssW / 2, hy + 1);
        }
      }

      function publishState(force) {
        if (!force && frameNo % 2 && phase === 'playing') return;
        var C = rimCentre(A.x, A.y, theta), S = spikeTip(A.x, A.y, theta);
        function px(p) { return { x: Math.round(p.x * scale), y: Math.round(p.y * scale) }; }
        canvas.setAttribute('data-state', JSON.stringify({
          phase: phase, ball: ball, flipped: flipped, b: px(B), bv: { x: Math.round(Bv.x * scale), y: Math.round(Bv.y * scale) },
          cup: px(C), spike: px(S), anchor: px(A), hole: +holeA.toFixed(2), score: score, streak: streak, catches: catches,
          time: Math.ceil(timeLeft), tricks: Object.keys(tricks).length, roundTricks: Object.keys(roundTricks), frame: frameNo,
          best: bestFor(diff), difficulty: diff, maxH: Math.round(maxH)
        }));
      }

      /* ---------- overlay, buttons, tricks and status ---------- */
      var lastStatus = '';
      function setStatus(t) { if (t !== lastStatus) { lastStatus = t; api.status(t); } }
      function setButtons() {
        var live = phase === 'playing' || phase === 'paused';
        pauseBtn.disabled = !live;
        stopBtn.disabled = !live;
        pauseBtn.textContent = phase === 'paused' ? 'Resume' : 'Pause';
        tossBtn.disabled = phase !== 'playing';
        flipBtn.disabled = phase !== 'playing';
        publishState(true);
      }
      function renderTricks(fresh) {
        trickList.replaceChildren.apply(trickList, TRICKS.map(function (t) {
          return h('li', { class: (tricks[t.id] ? 'on' : '') + (t.id === fresh && !reduced ? ' new' : ''), title: t.how }, t.name);
        }));
        var next = TRICKS.filter(function (t) { return !tricks[t.id]; })[0];
        var got = TRICKS.filter(function (t) { return tricks[t.id]; }).length;
        nextEl.textContent = next ? got + ' of ' + TRICKS.length + ' unlocked. Next to try: ' + next.name + '. ' + next.how : 'All ' + TRICKS.length + ' tricks unlocked. Jane Austen would be proud!';
      }
      function diffSeg() {
        return h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' }, ORDER.map(function (k) {
          return h('button', { type: 'button', 'aria-pressed': String(k === diff), onclick: function () { setDiff(k); } }, DIFFS[k].label);
        }));
      }
      function setDiff(k) {
        if (!DIFFS[k] || phase === 'playing') return;
        diff = k; D = DIFFS[k];
        api.store.set('difficulty', diff);
        api.sound('click');
        bestEl.textContent = String(bestFor(diff));
        clampToy();
        showOverlay(phase === 'over' ? 'over' : 'title');
        var b = ov.querySelector('.seg button[aria-pressed="true"]');
        if (b) { try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
        render();
      }
      function goButton(label) {
        return h('button', { class: 'btn btn-primary cb-go', type: 'button', onclick: function () { if (performance.now() < readyAt) return; api.sound('click'); start(); } }, label);
      }
      function showOverlay(kind) {
        var kids = [];
        if (kind === 'title') {
          kids.push(h('p', { class: 'cb-kicker' }, 'The Schoolyard', h('span', { class: 'cb-msg2' }, ' · bilboquet')));
          kids.push(h('h3', { class: 'cb-title' }, 'Cup and Ball'));
          kids.push(h('p', { class: 'cb-msg' }, 'A 60-second round: flick the ball up and catch it in the cup.'));
          kids.push(h('p', { class: 'cb-msg cb-msg2' }, 'Catches in a row multiply your points. Flip the toy to try the spike.'));
          kids.push(goButton('▶ Start'));
          kids.push(diffSeg());
          kids.push(h('p', { class: 'cb-best' }, 'Best on ' + D.label + ': ' + bestFor(diff) + ' points'));
        } else if (kind === 'paused') {
          kids.push(h('h3', { class: 'cb-title' }, 'Paused'));
          kids.push(h('p', { class: 'cb-big' }, String(score), h('small', null, 'points')));
          kids.push(h('div', { class: 'cb-row', style: { display: 'flex', flexWrap: 'wrap', gap: '.6rem', justifyContent: 'center' } },
            h('button', { class: 'btn btn-primary cb-go', type: 'button', onclick: function () { api.sound('click'); resume(); } }, '▶ Resume'),
            h('button', { class: 'btn', type: 'button', onclick: function () { stopRound(); } }, 'Stop')));
        } else {
          var r = lastResult || { score: 0, catches: 0, bestStreak: 0, isBest: false, stopped: true, tricks: [] };
          kids.push(h('p', { class: 'cb-kicker' }, r.catches + (r.catches === 1 ? ' catch' : ' catches') + ' · best run ' + r.bestStreak));
          kids.push(h('h3', { class: 'cb-title' }, r.stopped ? 'Stopped' : 'Time!'));
          kids.push(h('p', { class: 'cb-big' }, String(r.score), h('small', null, r.score === 1 ? 'point' : 'points')));
          kids.push(r.isBest ? h('p', { class: 'cb-ribbon' }, 'New best!') : h('p', { class: 'cb-best' }, 'Best on ' + D.label + ': ' + bestFor(diff)));
          kids.push(goButton('▶ Play again'));
          kids.push(diffSeg());
        }
        ov.replaceChildren.apply(ov, kids);
        ov.hidden = false;
        if (kind !== 'title') {
          var b = ov.querySelector('.cb-go');
          if (b) { try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
        }
      }

      /* ---------- input ---------- */
      function toWorld(e) {
        var r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
      }
      function onDown(e) {
        if (phase !== 'playing') return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        try { canvas.focus({ preventScroll: true }); } catch (err2) { /* ignore */ }
        var p = toWorld(e);
        drag = { id: e.pointerId, ox: T.x - p.x, oy: T.y - p.y };
        stage.classList.add('is-dragging');
        if (hintTime > 4) hintTime = 4;
      }
      function onMove(e) {
        if (!drag || e.pointerId !== drag.id || phase !== 'playing') return;
        var p = toWorld(e);
        var b = bounds();
        T.x = clamp(p.x + drag.ox, b.x0, b.x1);
        T.y = clamp(p.y + drag.oy, b.y0, b.y1);
        /* keep the grip under the finger at the edges */
        drag.ox = T.x - p.x; drag.oy = T.y - p.y;
      }
      function onUp(e) { if (drag && e.pointerId === drag.id) { drag = null; stage.classList.remove('is-dragging'); } }
      function onContext(e) { if (phase === 'playing') e.preventDefault(); }
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('contextmenu', onContext);
      function padPress(fn) {
        return function (e) {
          if (e.type === 'pointerdown') { if (e.pointerType === 'mouse' && e.button !== 0) return; e.preventDefault(); fn(); }
          else if (e.type === 'click' && e.detail === 0) fn();
        };
      }
      tossBtn.addEventListener('pointerdown', padPress(toss));
      tossBtn.addEventListener('click', padPress(toss));
      flipBtn.addEventListener('pointerdown', padPress(flip));
      flipBtn.addEventListener('click', padPress(flip));

      function gameKeyTarget(e) {
        var t = e.target, tag = t && t.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return false;
        if (t && t !== document.body && t !== document.documentElement && !root.contains(t)) return false;
        return tag !== 'BUTTON' && tag !== 'A';
      }
      function onKey(e) {
        if (destroyed) return;
        var k = e.key;
        if (!gameKeyTarget(e)) return;
        if (phase === 'playing') {
          if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); keys.left = true; }
          else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); keys.right = true; }
          else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ' || k === 'Spacebar') { e.preventDefault(); if (!e.repeat) toss(); }
          else if (k === 'ArrowDown' || k === 's' || k === 'S' || k === 'f' || k === 'F') { e.preventDefault(); if (!e.repeat) flip(); }
          else if (k === 'p' || k === 'P' || k === 'Escape') { e.preventDefault(); pause(); }
        } else if (phase === 'paused') {
          if (k === 'p' || k === 'P') { e.preventDefault(); resume(); }
        } else if ((phase === 'title' || phase === 'over') && e.target === canvas && (k === ' ' || k === 'Enter')) {
          e.preventDefault();
          if (performance.now() >= readyAt) start();
        }
      }
      function onKeyUp(e) {
        var k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
      }
      function onBlur() { keys.left = keys.right = false; }
      document.addEventListener('keydown', onKey);
      document.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', onBlur);
      function onVisibility() { if (document.hidden && phase === 'playing') pause(); }
      document.addEventListener('visibilitychange', onVisibility);

      var ro = null;
      if (typeof ResizeObserver === 'function') {
        ro = new ResizeObserver(function () { resize(false); });
        ro.observe(root);
      }
      renderTricks();
      showOverlay('title');
      resize(true);
      setButtons();
      render();
      setStatus('Press Start for a 60-second round. Flick the cup up to toss the ball, then catch it.');
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { if (!destroyed && cssW) { board = paintBoard(); if (!raf) render(); } }).catch(function () { /* fonts are optional */ });
      }

      return {
        destroy: function () {
          destroyed = true;
          stopLoop();
          if (ro) ro.disconnect();
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('keyup', onKeyUp);
          window.removeEventListener('blur', onBlur);
          document.removeEventListener('visibilitychange', onVisibility);
          board = null;
        }
      };
    }
  });
})();
