/* Diabolo for Games in Time.
   The real toy: two cones joined at the waist, spun on a string tied between two hand sticks. Pull one stick up
   and then the other, again and again, and the string rolls the diabolo faster and faster. Spinning fast it stays
   level; spinning slowly it tips and falls off. Pull the sticks apart to toss it high, then catch it on the string.
   This is the craze of 1907, when Gustave Philippart's diabolo filled the Bois de Boulogne in Paris.

   How the file is organised:
     1. Settings: difficulty, sizes (world units; the play area is 520 units tall; 12 units make a foot).
     2. The screen: score bar, canvas, overlay with the big gold Start button, the Left, Toss and Right pads, tricks.
     3. The promenade: sky, chestnut trees, a bandstand, a far tower, gravel and railings, painted once per size.
     4. Physics on a fixed 1/120 second step timed from performance.now():
          spin rises with steady, alternating pulls and fades with time;
          tilt is pushed by uneven pulls and grows on its own when the spin is low, and spin pulls it level;
          the diabolo rests at the lowest point of the string (an ellipse round the two stick tips);
          a toss is a throw under gravity, and the string catches it if it drops between the sticks.
     5. Drawing: the diabolo in lacquered colours, sticks, string, sleeves and the score.
   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  var ID = 'diabolo';
  var STEP = 1 / 120;
  var TAU = Math.PI * 2;
  var WORLD_H = 520;
  var MIN_W = 340;
  var FT = 12;                 /* world units in a foot */
  var GROUND = 470;            /* the gravel path */
  var HL = 38, RR = 32, WR = 6;  /* diabolo: half its length, rim radius, waist radius */
  var DROP_TILT = 0.78;        /* about 45 degrees of tilt and it slides off the string */

  var DIFFS = {
    easy:   { label: 'Easy',   decay: 0.75, wobble: 0.7, zone: 0.06, drift: 0.6, g: 1250 },
    medium: { label: 'Medium', decay: 1,    wobble: 1,   zone: 0.1,  drift: 1,   g: 1400 },
    hard:   { label: 'Hard',   decay: 1.25, wobble: 1.3, zone: 0.16, drift: 1.4, g: 1550 }
  };
  var ORDER = ['easy', 'medium', 'hard'];
  var TRICKS = [
    { id: 'spin', name: 'Full spin', how: 'Fill the spin meter right to the top with quick, steady pulls.' },
    { id: 'catch', name: 'First catch', how: 'Toss the diabolo and catch it on the string.' },
    { id: 'clean', name: 'Clean catch', how: 'Catch it level, right in the middle of the string.' },
    { id: 'high', name: 'High toss', how: 'Catch a toss of 20 feet or more.' },
    { id: 'double', name: 'Double toss', how: 'Toss again within a second of a catch, and catch that too.' },
    { id: 'run', name: 'Catch on the run', how: 'Catch it while your sticks are moving fast.' },
    { id: 'sky', name: 'Sky high', how: 'Catch a toss of 30 feet or more.' },
    { id: 'bois', name: 'Bois de Boulogne', how: 'Five catches in one go, like the crowd-pleasers in Paris in 1907.' }
  ];

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
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
    '.game-diabolo { display: grid; gap: .65rem; }' +
    '.game-diabolo .db-bar { margin: 0; justify-content: space-between; }' +
    '.game-diabolo .db-score { margin: 0; gap: .2rem 1.1rem; font-family: var(--font-mono); font-weight: 700; color: var(--ink-muted); align-items: baseline; }' +
    '.game-diabolo .db-score span { align-items: baseline; }' +
    '.game-diabolo .db-score b { font-family: var(--font-display); font-weight: 400; font-size: 1.5rem; color: var(--gold); }' +
    '.game-diabolo .db-btns { display: flex; gap: .4rem; margin-left: auto; }' +
    '.game-diabolo .db-btns .btn { padding: .5rem .85rem; }' +
    '@media (max-width: 440px) { .game-diabolo .db-now { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; } }' +
    '.game-diabolo .db-stage { position: relative; border-radius: 14px; overflow: hidden; background: var(--bg); box-shadow: 0 0 0 2px var(--line); }' +
    '.game-diabolo canvas { display: block; width: 100%; height: 360px; touch-action: manipulation; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }' +
    '.game-diabolo .is-playing canvas { touch-action: none; cursor: pointer; }' +
    '.game-diabolo canvas:focus { outline: none; }' +
    '.game-diabolo canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }' +
    '.game-diabolo .db-ov { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .5rem; padding: .8rem; text-align: center; color: var(--ink);' +
    '  background: radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--bg) 60%, transparent), color-mix(in srgb, var(--bg) 90%, transparent)); }' +
    '.game-diabolo .db-ov[hidden] { display: none; }' +
    '.game-diabolo .db-kicker { margin: 0; font-family: var(--font-mono); font-weight: 700; font-size: .82rem; letter-spacing: .14em; text-transform: uppercase; color: var(--era); }' +
    '.game-diabolo .db-title { margin: 0; font-family: var(--font-poster); font-weight: 400; font-size: clamp(2.3rem, 1.5rem + 3.6vw, 4.2rem); line-height: 1; color: var(--gold); text-shadow: 3px 3px 0 color-mix(in srgb, var(--rose) 70%, transparent); }' +
    '.game-diabolo .db-msg { margin: 0; max-width: 34rem; font-weight: 600; font-size: clamp(.95rem, .85rem + .5vw, 1.2rem); line-height: 1.35; }' +
    '.game-diabolo .db-big { margin: 0; font-family: var(--font-display); font-size: clamp(2.4rem, 1.5rem + 4vw, 4.6rem); line-height: 1; color: var(--ink); }' +
    '.game-diabolo .db-big small { font-size: .42em; color: var(--ink-muted); margin-left: .2em; }' +
    '.game-diabolo .db-best { margin: 0; font-family: var(--font-mono); font-weight: 700; color: var(--ink-muted); }' +
    '.game-diabolo .db-ribbon { display: inline-block; margin: 0; padding: .25rem .95rem; border-radius: 999px; background: var(--gold); color: var(--on-era); font-weight: 800; }' +
    '.game-diabolo .db-go { min-height: 58px; padding: .7rem 2.4rem; font-size: clamp(1.2rem, 1rem + 1vw, 1.6rem); font-weight: 800; }' +
    '.game-diabolo .db-row { display: flex; flex-wrap: wrap; gap: .5rem .7rem; justify-content: center; align-items: center; }' +
    '.game-diabolo .db-pad { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: .5rem; }' +
    '.game-diabolo .db-pad .btn { min-height: 56px; padding: .4rem .5rem; font-size: 1.05rem; white-space: nowrap; touch-action: manipulation; -webkit-user-select: none; user-select: none; }' +
    '.game-diabolo .db-pad kbd { font-family: var(--font-mono); font-size: .78rem; color: var(--ink-muted); border: 1px solid var(--line); border-radius: 6px; padding: 0 .3rem; }' +
    '@media (max-width: 440px) { .game-diabolo .db-pad kbd { display: none; } }' +
    '.game-diabolo .db-tricks h3 { margin: 0 0 .45rem; font-family: var(--font-mono); font-size: .82rem; letter-spacing: .14em; text-transform: uppercase; color: var(--era); }' +
    '.game-diabolo .db-tricks ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .4rem; }' +
    '.game-diabolo .db-tricks li { margin: 0; display: inline-flex; align-items: center; gap: .35rem; min-height: 36px; padding: .3rem .75rem; border-radius: 999px; border: 2px dashed var(--line); color: var(--ink-muted); font-weight: 700; font-size: .92rem; }' +
    '.game-diabolo .db-tricks li.on { border: 2px solid var(--gold); color: var(--ink); background: color-mix(in srgb, var(--gold) 16%, transparent); }' +
    '.game-diabolo .db-tricks li.on::before { content: "\\2713"; color: var(--gold); }' +
    '.game-diabolo .db-tricks li.new { animation: db-pop .6s ease-out; }' +
    '@keyframes db-pop { 0% { transform: scale(1.25); } 100% { transform: scale(1); } }' +
    '.game-diabolo .db-next { margin: .5rem 0 0; color: var(--ink-muted); font-size: .95rem; }' +
    '.game-diabolo .game-note { margin: 0; }' +
    '.game-diabolo .db-compact .db-msg2 { display: none; }' +
    '.game-diabolo .db-compact .db-ov { gap: .35rem; padding: .5rem; }' +
    '.game-diabolo .db-compact .db-go { min-height: 50px; padding: .55rem 1.8rem; }' +
    '.game-diabolo .db-compact .seg button { min-height: 40px; padding: .35rem .8rem; }';

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
      function tone(f, d, type, vol) { if (typeof api.tone === 'function') { try { api.tone(f, d, type, vol); } catch (e) { /* sound is optional */ } } }
      var runRand = api.random || Math.random;

      /* ---------- the screen ---------- */
      root.appendChild(h('style', null, CSS));
      var scoreEl = h('b', null, '0');
      var bestEl = h('b', null, String(bestFor(diff)));
      var pauseBtn = h('button', { class: 'btn btn-ghost', type: 'button', disabled: true, onclick: function () { if (phase === 'paused') resume(); else pause(); } }, 'Pause');
      var stopBtn = h('button', { class: 'btn btn-ghost', type: 'button', disabled: true, onclick: function () { stopRun(); } }, 'Stop');
      var bar = h('div', { class: 'game-toolbar db-bar' },
        h('div', { class: 'scoreboard db-score' }, h('span', { class: 'db-now' }, 'Score ', scoreEl), h('span', null, 'Best ', bestEl)),
        h('div', { class: 'db-btns' }, pauseBtn, stopBtn));
      var canvas = h('canvas', { tabindex: '0', role: 'img',
        'aria-label': 'An Edwardian park promenade at dusk with chestnut trees and a bandstand. Two hands hold diabolo sticks, with a red lacquered diabolo spinning on the string between them.' });
      var ov = h('div', { class: 'db-ov' });
      var stage = h('div', { class: 'db-stage' }, canvas, ov);
      var leftBtn = h('button', { class: 'btn', type: 'button', disabled: true, 'aria-label': 'Pull the left stick' }, '◀ Left ', h('kbd', null, 'A'));
      var tossBtn = h('button', { class: 'btn', type: 'button', disabled: true, 'aria-label': 'Toss the diabolo' }, 'Toss ▲ ', h('kbd', null, 'Space'));
      var rightBtn = h('button', { class: 'btn', type: 'button', disabled: true, 'aria-label': 'Pull the right stick' }, 'Right ▶ ', h('kbd', null, 'D'));
      var pad = h('div', { class: 'db-pad' }, leftBtn, tossBtn, rightBtn);
      var trickList = h('ul', null);
      var nextEl = h('p', { class: 'db-next' });
      var tricksBox = h('div', { class: 'db-tricks' }, h('h3', null, 'Tricks to unlock'), trickList, nextEl);
      var note = h('p', { class: 'game-note' }, 'Spin it up: tap the left and right halves of the picture in turn, or press A and D (or Left and Right) in a steady beat. Toss with Space, Up or a swipe up, then move the sticks under it with the mouse, a finger or the arrow keys. P pauses.');
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
      var LACQ = P.vermilion, LACQ_D = mix(P.vermilion, P.bg, 0.45), LACQ_L = mix(P.vermilion, P.ink, 0.35);
      var STICK = mix(P.goldShadow, P.bg, 0.35);

      /* ---------- sizes ---------- */
      var cssW = 0, cssH = 0, dpr = 1, scale = 1, worldW = MIN_W, worldH = WORLD_H, rigK = 1;
      var scene = null;
      function heightFor(w) {
        var vh = window.innerHeight || 800;
        var hh = w < 560 ? w * 1.55 : w * 0.56;
        hh = Math.min(hh, vh * 0.76, 680);
        return Math.round(Math.max(330, hh));
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
        rigK = clamp((worldW - 36) / 480, 0.66, 1);
        stage.classList.toggle('db-compact', cssH < 400 || cssW < 420);
        if (phase === 'title') resetRig(); else clampRig();
        scene = paintScene();
        render();
      }

      /* ---------- the promenade, painted once per size ---------- */
      function paintScene() {
        var cv = document.createElement('canvas');
        cv.width = canvas.width; cv.height = canvas.height;
        var c = cv.getContext('2d', { alpha: false }), s = scale * dpr, r = seeded(1907);
        c.setTransform(s, 0, 0, s, 0, 0);
        var top = worldH - WORLD_H;   /* extra sky when the canvas is taller than the world */
        var g = c.createLinearGradient(0, 0, 0, GROUND + top);
        g.addColorStop(0, css(P.bg));
        g.addColorStop(0.45, css(mix(P.bg, P.cobalt, 0.16)));
        g.addColorStop(0.75, css(mix(P.bg, P.rose, 0.3)));
        g.addColorStop(1, css(mix(P.bg, P.gold, 0.32)));
        c.fillStyle = g; c.fillRect(0, 0, worldW, worldH);
        c.translate(0, top);
        /* a few early stars and a low sun's glow */
        c.fillStyle = css(P.ink, 0.5);
        for (var i = 0; i < 18; i++) c.fillRect(r() * worldW, r() * 160 - top * r(), 1.6, 1.6);
        var sg = c.createRadialGradient(worldW * 0.3, GROUND - 120, 10, worldW * 0.3, GROUND - 120, 260);
        sg.addColorStop(0, css(P.gold, 0.28)); sg.addColorStop(1, css(P.gold, 0));
        c.fillStyle = sg; c.fillRect(0, GROUND - 400, worldW, 400);
        /* a far iron tower on the skyline */
        var tx = worldW * 0.8, tb = GROUND - 120, tt = GROUND - 330;
        c.strokeStyle = css(mix(P.bg, P.rose, 0.45)); c.lineWidth = 2;
        c.beginPath();
        c.moveTo(tx - 34, tb); c.quadraticCurveTo(tx - 10, tb - 90, tx - 3, tt);
        c.moveTo(tx + 34, tb); c.quadraticCurveTo(tx + 10, tb - 90, tx + 3, tt);
        c.moveTo(tx - 24, tb - 50); c.lineTo(tx + 24, tb - 50);
        c.moveTo(tx - 12, tb - 120); c.lineTo(tx + 12, tb - 120);
        c.moveTo(tx, tt); c.lineTo(tx, tt - 16);
        c.stroke();
        c.beginPath(); c.arc(tx, tb, 16, Math.PI, TAU); c.stroke();
        /* chestnut trees in sage and peacock, drawn in the round Art Nouveau way */
        function tree(x, y, rad, col) {
          c.fillStyle = css(mix(P.bg, P.goldShadow, 0.3)); c.fillRect(x - rad * 0.08, y - rad * 0.4, rad * 0.16, rad * 1.1);
          c.fillStyle = css(col);
          c.strokeStyle = css(mix(col, P.bg, 0.4)); c.lineWidth = 2;
          for (var k = 0; k < 5; k++) {
            var a = (k / 5) * TAU + 0.4, ox = Math.cos(a) * rad * 0.42, oy = Math.sin(a) * rad * 0.3 - rad * 0.65;
            c.beginPath(); c.arc(x + ox, y + oy, rad * 0.5, 0, TAU); c.fill(); c.stroke();
          }
          c.beginPath(); c.arc(x, y - rad * 0.7, rad * 0.55, 0, TAU); c.fill();
          c.fillStyle = css(P.ink, 0.12);
          for (var f = 0; f < 6; f++) { c.beginPath(); c.arc(x + (r() - 0.5) * rad, y - rad * 0.4 - r() * rad * 0.8, 2 + r() * 2, 0, TAU); c.fill(); }
        }
        var n = Math.ceil(worldW / 150) + 1;
        for (var t = 0; t < n; t++) {
          var x = t * 150 + (r() - 0.5) * 50;
          tree(x, GROUND - 60, 70 + r() * 30, mix(P.bg, t % 2 ? P.leaf : P.peacock, 0.32));
        }
        /* a bandstand: an iron roof on slim columns */
        var bx = worldW * 0.22, by = GROUND - 52;
        c.fillStyle = css(mix(P.bg, P.peacock, 0.45)); c.strokeStyle = css(P.gold, 0.6); c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(bx - 66, by - 70); c.quadraticCurveTo(bx, by - 120, bx + 66, by - 70); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(bx, by - 112); c.lineTo(bx, by - 128); c.stroke();
        c.fillStyle = css(P.gold, 0.7); c.beginPath(); c.arc(bx, by - 130, 3, 0, TAU); c.fill();
        c.strokeStyle = css(mix(P.bg, P.ink, 0.45)); c.lineWidth = 2.2;
        [-54, -27, 0, 27, 54].forEach(function (o) { c.beginPath(); c.moveTo(bx + o, by - 70); c.lineTo(bx + o, by - 8); c.stroke(); });
        c.fillStyle = css(mix(P.bg, P.ink, 0.25)); c.fillRect(bx - 72, by - 10, 144, 10);
        /* the lawn, then the gravel promenade */
        c.fillStyle = css(mix(P.bg, P.leaf, 0.42)); c.fillRect(0, GROUND - 56, worldW, 30);
        c.fillStyle = css(mix(P.bg, P.gold, 0.3)); c.fillRect(0, GROUND - 26, worldW, WORLD_H);
        c.fillStyle = css(P.ink, 0.07);
        for (var q = 0; q < worldW * 0.6; q++) c.fillRect(r() * worldW, GROUND - 24 + r() * (WORLD_H - GROUND + 30), 1.5 + r() * 2, 1.2);
        /* an iron railing with whiplash curls */
        c.strokeStyle = css(mix(P.bg, P.peacock, 0.6)); c.lineWidth = 2.4;
        c.beginPath(); c.moveTo(0, GROUND - 60); c.lineTo(worldW, GROUND - 60); c.moveTo(0, GROUND - 30); c.lineTo(worldW, GROUND - 30); c.stroke();
        c.lineWidth = 1.6;
        for (var px = 10; px < worldW; px += 22) {
          c.beginPath(); c.moveTo(px, GROUND - 30); c.lineTo(px, GROUND - 64); c.stroke();
          c.beginPath(); c.moveTo(px, GROUND - 44); c.bezierCurveTo(px + 6, GROUND - 56, px + 14, GROUND - 52, px + 11, GROUND - 44); c.stroke();
        }
        /* an Art Nouveau frame: gold lines with curled corners */
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        var W = cssW, Hh = cssH, m = 8;
        c.strokeStyle = css(P.gold, 0.55); c.lineWidth = 1.5;
        c.strokeRect(m, m, W - m * 2, Hh - m * 2);
        c.lineWidth = 2;
        [[m, m, 1, 1], [W - m, m, -1, 1], [m, Hh - m, 1, -1], [W - m, Hh - m, -1, -1]].forEach(function (k) {
          var x0 = k[0], y0 = k[1], sx = k[2], sy = k[3];
          c.beginPath();
          c.moveTo(x0, y0 + sy * 34);
          c.bezierCurveTo(x0 + sx * 4, y0 + sy * 12, x0 + sx * 12, y0 + sy * 4, x0 + sx * 34, y0);
          c.moveTo(x0 + sx * 10, y0 + sy * 10);
          c.bezierCurveTo(x0 + sx * 26, y0 + sy * 6, x0 + sx * 18, y0 + sy * 24, x0 + sx * 14, y0 + sy * 16);
          c.stroke();
        });
        return cv;
      }

      /* ---------- game state ---------- */
      var phase = 'title';            /* title, playing, paused, dropping, over */
      var dstate = 'string';          /* string, air, falling, ground */
      var hands = { x: 0, y: 0, vx: 0, vy: 0 }, handT = { x: 0, y: 0 };
      var spread = 0;                 /* 0 relaxed, 1 sticks pulled apart (string straight) */
      var pullL = 0, pullR = 0;       /* how far each stick is yanked up, 0 to 1 */
      var dia = { x: 0, y: 0, vx: 0, vy: 0, tilt: 0, tiltV: 0, spin: 0.3, phase: 0, rot: 0 };
      var lastSide = 0, lastPullT = -9, lastGap = 0, pendingPull = null;
      var toss = null;                /* {fromY, peak, t, double} */
      var lastCatchT = -9;
      var score = 0, catches = 0, bestToss = 0, runTricks = {}, reason = '';
      var keys = { left: false, right: false };
      var particles = [], floaters = [], banners = [];
      var shake = 0, twang = 0, clock = 0, frameNo = 0, hintTime = 0, firstRun = true, readyAt = 0, scorePop = 0, dropT = 0;
      var lastResult = null, lastLine = null;

      function hy0() { return GROUND - 205; }
      function clampRig() {
        handT.x = clamp(handT.x, worldW * 0.2, worldW * 0.8);
        hands.x = clamp(hands.x, worldW * 0.2, worldW * 0.8);
      }
      function resetRig() {
        hands.x = handT.x = worldW / 2; hands.y = handT.y = hy0(); hands.vx = hands.vy = 0;
        spread = 0; pullL = pullR = 0;
        var rest = restPoint();
        dia.x = rest.x; dia.y = rest.y; dia.vx = dia.vy = 0; dia.tilt = 0; dia.tiltV = 0; dia.spin = 0.32; dia.phase = 0; dia.rot = 0;
        dstate = 'string';
      }
      /* Where the stick tips are. Pulling a stick yanks its tip up; a toss spreads the sticks apart. */
      function tips() {
        var k = rigK, tx = lerp(215, 240, spread) * k, hx = lerp(110, 132, spread) * k, ty = 70 + 16 * spread;
        return {
          lx: hands.x - tx, ly: hands.y - ty - pullL * 46,
          rx: hands.x + tx, ry: hands.y - ty - pullR * 46,
          hlx: hands.x - hx, hly: hands.y - pullL * 28,
          hrx: hands.x + hx, hry: hands.y - pullR * 28
        };
      }
      function stringLen() { return 600 * rigK; }
      /* The lowest point of the string: an ellipse with the two tips as its foci. */
      function restPoint() {
        var T = tips(), S = stringLen();
        var cx = (T.lx + T.rx) / 2, cy = (T.ly + T.ry) / 2;
        var dx = T.rx - T.lx, dy = T.ry - T.ly, f = Math.sqrt(dx * dx + dy * dy) / 2;
        var a = S / 2, b = Math.sqrt(Math.max(1, a * a - f * f)), phi = Math.atan2(dy, dx);
        var t = Math.atan2(b * Math.cos(phi), a * Math.sin(phi));
        var best = null;
        [t, t + Math.PI].forEach(function (tt) {
          var px = cx + a * Math.cos(tt) * Math.cos(phi) - b * Math.sin(tt) * Math.sin(phi);
          var py = cy + a * Math.cos(tt) * Math.sin(phi) + b * Math.sin(tt) * Math.cos(phi);
          if (!best || py > best.y) best = { x: px, y: py };
        });
        return { x: best.x, y: best.y - WR - 1 };
      }

      /* ---------- effects ---------- */
      function sparks(x, y, n, col, spread0) {
        for (var i = 0; i < n && particles.length < 120; i++) {
          var a = runRand() * TAU, sp = (0.3 + runRand() * 0.7) * (spread0 || 200);
          particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0, max: 0.45 + runRand() * 0.4, r: 2 + runRand() * 2.5, c: col });
        }
      }
      function floater(x, y, text, col, size) { floaters.push({ x: x, y: y, text: text, c: col, life: 0, max: 1, size: size || 18 }); if (floaters.length > 8) floaters.shift(); }
      function banner(text, col, pri) {
        if (banners.length && banners[0].pri > (pri || 0) && banners[0].life < 0.8) return;
        banners = [{ text: text, c: col || P.gold, life: 0, max: 1.7, pri: pri || 0 }];
      }

      /* ---------- the run ---------- */
      function start() {
        if (destroyed) return;
        resetRig();
        score = 0; catches = 0; bestToss = 0; runTricks = {}; reason = '';
        lastSide = 0; lastPullT = -9; lastGap = 0; pendingPull = null; toss = null; lastCatchT = -9;
        particles = []; floaters = []; banners = []; shake = 0; twang = 0; scorePop = 0; dropT = 0;
        hintTime = firstRun ? 9 : 0; firstRun = false;
        phase = 'playing';
        ov.hidden = true;
        stage.classList.add('is-playing');
        setButtons();
        scoreEl.textContent = '0';
        api.sound('whoosh');
        banner('Spin it up!', P.gold);
        setStatus('Pull left, right, left, right in a steady beat to fill the spin meter.');
        try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        startLoop();
      }
      function pause() {
        if (phase !== 'playing') return;
        phase = 'paused';
        stopLoop();
        keys.left = keys.right = false;
        stage.classList.remove('is-playing');
        setButtons();
        showOverlay('paused');
        setStatus('Paused. Press Resume to carry on.');
      }
      function resume() {
        if (phase !== 'paused') return;
        phase = 'playing';
        ov.hidden = true;
        stage.classList.add('is-playing');
        setButtons();
        setStatus(dstate === 'air' ? 'Move the sticks under it and catch it!' : 'Keep it spinning with steady pulls.');
        try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        startLoop();
      }
      function stopRun() {
        if (phase === 'playing' || phase === 'paused' || phase === 'dropping') { if (phase !== 'dropping') reason = 'stopped'; finishRun(); }
      }
      function drop(why) {
        if (phase !== 'playing') return;
        phase = 'dropping';
        reason = why;
        dstate = 'falling';
        dropT = 0;
        keys.left = keys.right = false;
        stage.classList.remove('is-playing');
        setButtons();
        if (why === 'tilt') { dia.vx = (dia.tilt > 0 ? 1 : -1) * 120; dia.vy = -60; }
        else if (why === 'slow') { dia.vx = (runRand() - 0.5) * 80; dia.vy = -30; }
        api.sound('whoosh');
        banner(why === 'miss' ? 'Missed!' : 'Dropped!', P.vermilion, 3);
        setStatus(why === 'miss' ? 'Missed! It fell past the string.' : why === 'tilt' ? 'It tipped over and slid off the string.' : 'It slowed down and fell off.');
      }
      function finishRun() {
        stopLoop();
        phase = 'over';
        keys.left = keys.right = false;
        stage.classList.remove('is-playing');
        setButtons();
        var prevBest = bestFor(diff);
        var isBest = score > prevBest && score >= 10;
        if (score > prevBest) { bests[diff] = score; api.store.set('best', bests); }
        bestEl.textContent = String(bestFor(diff));
        scoreEl.textContent = String(score);
        lastResult = { score: score, catches: catches, bestToss: bestToss, isBest: isBest, reason: reason || 'stopped' };
        if (lastResult.reason !== 'stopped' && !isBest) api.sound('lose');
        showOverlay('over');
        var msg = { miss: 'Missed the catch!', tilt: 'It tipped off the string!', slow: 'It slowed down and fell!', stopped: 'You stopped.' }[lastResult.reason] || 'Run over.';
        msg += ' ' + score + ' points from ' + catches + (catches === 1 ? ' catch' : ' catches') + '. ';
        if (isBest) { msg += 'A new best on ' + D.label + '!'; api.celebrate('New best: ' + score + ' points!'); }
        else msg += 'Best on ' + D.label + ': ' + bestFor(diff) + '. Press Play again.';
        setStatus(msg);
        readyAt = performance.now() + 800;
        render();
      }

      /* ---------- the player's moves ---------- */
      function pull(side) {
        if (phase !== 'playing' || dstate !== 'string') return;
        var now = clock, gap = now - lastPullT, word, col;
        var before = { spin: dia.spin, tiltV: dia.tiltV };
        var q;
        if (side === lastSide) {
          q = 0.15;
          dia.tiltV += side * 0.6 * D.wobble;
          word = 'Same side!'; col = P.vermilion;
          api.sound('wrong');
        } else if (gap > 0.9 || lastGap <= 0) {
          q = 0.6; word = 'Pull!'; col = P.ink;
        } else if (gap < 0.12) {
          q = 0.3; dia.tiltV += (runRand() - 0.5) * 1.0 * D.wobble;
          word = 'Too fast!'; col = P.vermilion;
        } else {
          var steady = clamp(1 - Math.abs(gap - lastGap) / lastGap * 2.2, 0, 1);
          q = 0.45 + 0.55 * steady;
          if (steady < 0.4) { dia.tiltV += (runRand() - 0.5) * (0.4 - steady) * 3 * D.wobble; word = 'Uneven!'; col = P.vermilion; }
          else if (steady > 0.75) { word = 'Steady!'; col = P.gold; }
          else { word = 'Good'; col = P.ink; }
        }
        dia.spin = clamp(dia.spin + 0.075 * q * (1 - 0.55 * dia.spin), 0, 1);
        lastGap = (side !== lastSide && gap <= 0.9) ? gap : 0;
        if (side === lastSide) lastGap = 0;
        lastSide = side; lastPullT = now;
        if (side < 0) pullL = 1; else pullR = 1;
        dia.vx += side * -18;
        var T = tips();
        floater(side < 0 ? T.lx + 10 : T.rx - 10, (side < 0 ? T.ly : T.ry) - 28, word, col, 16);
        tone(150 + 330 * dia.spin, 0.08, 'triangle', 0.06);
        api.sound('tick');
        pendingPull = { t: now, before: before, spinAfter: dia.spin };
        if (dia.spin >= 0.98 && !runTricks.spin) unlock('spin');
        if (dia.spin >= 0.45 && before.spin < 0.45 && !catches) setStatus('Good spin! Toss it with Space, Up or a swipe up, or keep pulling to send it higher.');
      }
      function tossIt() {
        if (phase !== 'playing' || dstate !== 'string') return;
        if (dia.spin < 0.3) {
          api.sound('wrong');
          floater(dia.x, dia.y - 50, 'Spin it faster first!', P.vermilion, 16);
          setStatus('Spin it faster before you toss: fill the spin meter past the line.');
          return;
        }
        /* a pull that was only the start of a swipe should not count */
        if (pendingPull && clock - pendingPull.t < 0.25) { dia.tiltV = pendingPull.before.tiltV; }
        pendingPull = null;
        var feet = 4 + 28 * dia.spin + (runRand() - 0.5) * 3;
        var H = feet * FT;
        dstate = 'air';
        spread = 1;
        var T0 = tips(), lineY = (T0.ly + T0.ry) / 2 - WR - 1;
        var rise = H + Math.max(0, dia.y - lineY);
        dia.vy = -Math.sqrt(2 * D.g * rise);
        var flight = Math.sqrt(2 * rise / D.g) + Math.sqrt(2 * H / D.g);
        var vx = (dia.tilt * 240 + (runRand() - 0.5) * 70 * (1 - 0.5 * dia.spin)) * D.drift;
        var land = dia.x + vx * flight;
        if (land < 90 || land > worldW - 90) vx = (clamp(land, 90, worldW - 90) - dia.x) / flight;
        dia.vx = vx;
        toss = { fromY: lineY, peak: dia.y, double: clock - lastCatchT < 1.0 };
        lastLine = null;
        pullL = pullR = 0;
        api.sound('whoosh');
        tone(260 + 300 * dia.spin, 0.18, 'triangle', 0.06);
        sparks(dia.x, dia.y + 10, 8, P.ink, 120);
        setStatus('Up it goes! Move the sticks under it and catch it on the string.');
        if (hintTime > 0) hintTime = Math.min(hintTime, 3);
      }
      function unlock(id) {
        runTricks[id] = true;
        if (tricks[id]) return false;
        tricks[id] = true;
        api.store.set('tricks', tricks);
        var t = TRICKS.filter(function (x) { return x.id === id; })[0];
        if (t) { banner('New trick: ' + t.name, P.gold, 2); api.sound('bell'); api.announce('New trick unlocked: ' + t.name); }
        renderTricks(id);
        return true;
      }

      /* ---------- physics ---------- */
      function step(dt) {
        clock += dt;
        if (hintTime > 0 && phase === 'playing') hintTime -= dt;
        moveHands(dt);
        if (dstate === 'string') stepString(dt);
        else if (dstate === 'air') stepAir(dt);
        else stepFalling(dt);
        dia.phase += dia.spin * 34 * dt;
        for (var i = particles.length - 1; i >= 0; i--) {
          var p = particles[i]; p.life += dt;
          if (p.life >= p.max) { particles.splice(i, 1); continue; }
          p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        }
        for (var j = floaters.length - 1; j >= 0; j--) { floaters[j].life += dt; if (floaters[j].life >= floaters[j].max) floaters.splice(j, 1); }
        for (var k = banners.length - 1; k >= 0; k--) { banners[k].life += dt; if (banners[k].life >= banners[k].max) banners.splice(k, 1); }
        if (shake > 0) shake = Math.max(0, shake - dt);
        if (twang > 0) twang = Math.max(0, twang - dt);
        if (scorePop > 0) scorePop = Math.max(0, scorePop - dt);
      }
      function moveHands(dt) {
        if (phase === 'playing' && dstate === 'air') {
          var kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
          if (kx) handT.x += kx * 640 * dt;
        } else if (dstate === 'string') {
          handT.x = lerp(handT.x, worldW / 2, Math.min(1, dt * 0.6));
          handT.y = lerp(handT.y, hy0(), Math.min(1, dt * 2));
        }
        handT.x = clamp(handT.x, worldW * 0.2, worldW * 0.8);
        handT.y = clamp(handT.y, hy0() - 70, hy0() + 30);
        var w = 30;
        hands.vx += (w * w * (handT.x - hands.x) - 2 * w * hands.vx) * dt;
        hands.vy += (w * w * (handT.y - hands.y) - 2 * w * hands.vy) * dt;
        hands.x += hands.vx * dt; hands.y += hands.vy * dt;
        pullL = Math.max(0, pullL - dt * 5.5); pullR = Math.max(0, pullR - dt * 5.5);
        if (dstate !== 'air') spread = Math.max(0, spread - dt * 2.5);
      }
      function stepString(dt) {
        var rest = restPoint();
        /* a spinning diabolo rides the string like a weight on a pulley: springy, a little lag */
        dia.vx += (220 * (rest.x - dia.x) - 9 * dia.vx) * dt;
        dia.vy += (420 * (rest.y - dia.y) - 14 * dia.vy) * dt;
        dia.x += dia.vx * dt; dia.y += dia.vy * dt;
        if (phase !== 'playing') return;
        /* spin fades; low spin makes the tilt grow, high spin pulls it level */
        var s = dia.spin;
        dia.spin = Math.max(0, s - (0.05 + 0.07 * s) * D.decay * dt);
        var unstable = 2.6 * (1 - s) * (1 - s) * D.wobble, restore = 5 * s;
        var noise = (runRand() - 0.5) * 2.4 * (1 - s) * (1 - s) * D.wobble;
        dia.tiltV += ((unstable - restore) * dia.tilt - 1.6 * dia.tiltV + noise) * dt;
        dia.tilt += dia.tiltV * dt;
        if (Math.abs(dia.tilt) > DROP_TILT) { drop('tilt'); return; }
        if (dia.spin < 0.04) { drop('slow'); return; }
      }
      function stepAir(dt) {
        dia.vy += D.g * dt;
        dia.x += dia.vx * dt; dia.y += dia.vy * dt;
        if (dia.x < 40) { dia.x = 40; dia.vx = Math.abs(dia.vx) * 0.5; }
        if (dia.x > worldW - 40) { dia.x = worldW - 40; dia.vx = -Math.abs(dia.vx) * 0.5; }
        dia.spin = Math.max(0, dia.spin - (0.05 + 0.07 * dia.spin) * D.decay * 1.3 * dt);
        dia.tilt += dia.tiltV * 0.2 * dt;
        if (toss && dia.y < toss.peak) toss.peak = dia.y;
        if (phase !== 'playing') return;
        /* the catch: the waist drops through the straight string between the tips */
        var T = tips();
        var lineNow = null;
        if (dia.x > T.lx && dia.x < T.rx) {
          var u = (dia.x - T.lx) / (T.rx - T.lx);
          lineNow = lerp(T.ly, T.ry, u) - WR - 1;
          var prevY = dia.y - dia.vy * dt, prevLine = lastLine == null ? lineNow : lastLine;
          if (dia.vy > 0 && prevY <= prevLine + 2 && dia.y >= lineNow) {
            if (u >= D.zone && u <= 1 - D.zone) { lastLine = null; caught(u, T); return; }
          }
        }
        lastLine = lineNow;
        if (dia.y > GROUND - RR) drop('miss');
      }
      function stepFalling(dt) {
        dropT += dt;
        dia.vy += D.g * dt;
        dia.x += dia.vx * dt; dia.y += dia.vy * dt;
        dia.tilt += dia.vx * dt / 60;
        var floor = GROUND + 8 - RR * Math.abs(Math.cos(dia.tilt)) * 0.7;
        if (dia.y > floor) {
          dia.y = floor;
          if (dia.vy > 120) { api.sound(dropT < 0.6 ? 'thud' : 'tick'); sparks(dia.x, GROUND, 5, P.goldShadow, 100); }
          dia.vy = -dia.vy * 0.35; dia.vx *= 0.75;
          if (Math.abs(dia.vy) < 40) dia.vy = 0;
        }
        dia.spin = Math.max(0, dia.spin - dt * 0.8);
        if (phase === 'dropping' && dropT > 1.5) finishRun();
      }
      function caught(u, T) {
        dstate = 'string';
        var feet = Math.max(1, Math.round((toss.fromY - toss.peak) / FT));
        var handsFast = Math.abs(hands.vx) > 260;
        var clean = Math.abs(u - 0.5) < 0.16 && Math.abs(dia.tilt) < 0.15;
        catches++;
        if (feet > bestToss) bestToss = feet;
        var mult = Math.min(3, 1 + 0.25 * (catches - 1));
        var pts = Math.round(feet * 10 * (clean ? 1.5 : 1) * mult);
        score += pts;
        scorePop = 0.35;
        lastCatchT = clock;
        twang = 0.5;
        dia.vy *= 0.25; dia.vx = (dia.vx + hands.vx) * 0.3;
        api.sound('clack');
        if (clean) api.sound('coin');
        tone(330 + 200 * dia.spin, 0.12, 'triangle', 0.06);
        sparks(dia.x, dia.y + 8, clean ? 18 : 10, clean ? P.gold : P.ink, 200);
        if (!reduced) shake = 0.12;
        floater(dia.x, dia.y - 54, '+' + pts, clean ? P.gold : P.ink, clean ? 26 : 22);
        floater(dia.x, dia.y - 30, feet + ' ft' + (clean ? ', clean!' : ''), P.ink, 15);
        var unlocked = [];
        if (unlock('catch')) unlocked.push('catch');
        if (clean && unlock('clean')) unlocked.push('clean');
        if (feet >= 20 && unlock('high')) unlocked.push('high');
        if (feet >= 30 && unlock('sky')) unlocked.push('sky');
        if (toss.double && unlock('double')) unlocked.push('double');
        if (handsFast && unlock('run')) unlocked.push('run');
        if (catches >= 5 && unlock('bois')) unlocked.push('bois');
        if (!unlocked.length) {
          if (toss.double) banner('Double toss!', P.peacock);
          else if (handsFast) banner('Catch on the run!', P.peacock);
          else if (clean) banner('Clean catch!', P.gold);
          else if (feet >= 20) banner(feet + ' feet!', P.gold);
        }
        toss = null;
        scoreEl.textContent = String(score);
        setStatus('Caught! ' + feet + ' feet for ' + pts + ' points. Keep it spinning and toss again.');
      }

      /* ---------- the loop: fixed steps timed with performance.now() ---------- */
      var raf = 0, last = 0, acc = 0;
      function running() { return phase === 'playing' || phase === 'dropping'; }
      function frame() {
        raf = 0;
        if (destroyed || !running()) return;
        var now = performance.now();
        var dt = (now - last) / 1000;
        last = now;
        if (dt > 0.25) dt = 0.25;
        if (dt < 0) dt = 0;
        acc += dt;
        var n = 0;
        while (acc >= STEP && n < 40) { step(STEP); acc -= STEP; n++; if (!running()) break; }
        if (!running() || destroyed) return;
        render();
        raf = requestAnimationFrame(frame);
      }
      function startLoop() { if (raf || destroyed) return; last = performance.now(); acc = 0; raf = requestAnimationFrame(frame); }
      function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

      /* ---------- drawing ---------- */
      function render() {
        if (!cssW || !scene || destroyed) return;
        var s = scale * dpr, shx = 0, shy = 0;
        if (shake > 0 && !reduced) { shx = (Math.random() - 0.5) * shake * 26 * dpr; shy = (Math.random() - 0.5) * shake * 26 * dpr; }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(scene, 0, 0);
        ctx.imageSmoothingEnabled = true;
        var top = worldH - WORLD_H;
        ctx.setTransform(s, 0, 0, s, shx, top * s + shy);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        var T = tips();
        /* shadow on the gravel */
        var hgt = clamp((GROUND - dia.y) / 500, 0, 1);
        ctx.fillStyle = css(P.bg, 0.35 * (1 - hgt * 0.6));
        ctx.beginPath(); ctx.ellipse(dia.x, GROUND + 6, RR * (1.4 - hgt * 0.6), 5, 0, 0, TAU); ctx.fill();
        drawArms(T);
        drawString(T);
        drawSticks(T);
        drawDiabolo(dia.x, dia.y, dia.tilt + (dstate === 'string' && dia.spin < 0.35 && !reduced ? Math.sin(clock * 9) * 0.05 * (1 - dia.spin / 0.35) : 0));
        drawParticles();
        drawFloaters();
        if (dstate === 'air' && dia.y + top < 0) drawOffTop(top);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawHud();
        frameNo++;
        publishState();
      }
      function drawArms(T) {
        var by = worldH - (worldH - WORLD_H) + 40;
        ctx.strokeStyle = css(mix(P.rose, P.bg, 0.2)); ctx.lineWidth = 26 * rigK;
        ctx.beginPath(); ctx.moveTo(hands.x - 250 * rigK, by); ctx.quadraticCurveTo(T.hlx - 70 * rigK, T.hly + 90, T.hlx, T.hly + 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hands.x + 250 * rigK, by); ctx.quadraticCurveTo(T.hrx + 70 * rigK, T.hry + 90, T.hrx, T.hry + 6); ctx.stroke();
        ctx.strokeStyle = css(P.ink); ctx.lineWidth = 10 * rigK;
        [[T.hlx, T.hly], [T.hrx, T.hry]].forEach(function (p) { ctx.beginPath(); ctx.moveTo(p[0] - 9, p[1] + 16); ctx.lineTo(p[0] + 9, p[1] + 16); ctx.stroke(); });
      }
      function drawSticks(T) {
        [[T.hlx, T.hly, T.lx, T.ly], [T.hrx, T.hry, T.rx, T.ry]].forEach(function (k) {
          ctx.strokeStyle = css(mix(STICK, P.bg, 0.35)); ctx.lineWidth = 8;
          ctx.beginPath(); ctx.moveTo(k[0], k[1] + 8); ctx.lineTo(k[2], k[3]); ctx.stroke();
          ctx.strokeStyle = css(mix(STICK, P.ink, 0.25)); ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(k[0], k[1] + 6); ctx.lineTo(k[2], k[3]); ctx.stroke();
          ctx.fillStyle = css(P.gold); ctx.beginPath(); ctx.arc(k[2], k[3], 4.5, 0, TAU); ctx.fill();
          /* the hand round the handle */
          ctx.fillStyle = css(mix(P.ink, P.rose, 0.22)); ctx.strokeStyle = css(P.bg, 0.5); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.ellipse(k[0], k[1] + 4, 12, 10, 0, 0, TAU); ctx.fill(); ctx.stroke();
        });
      }
      function drawString(T) {
        ctx.strokeStyle = css(P.ink, 0.95); ctx.lineWidth = 2;
        ctx.beginPath();
        if (dstate === 'string' || (dstate === 'falling' && dropT < 0.05)) {
          var cx = dia.x, cy = dia.y + WR + 1;
          ctx.moveTo(T.lx, T.ly); ctx.lineTo(cx - 3, cy); ctx.lineTo(cx + 3, cy); ctx.lineTo(T.rx, T.ry);
        } else {
          /* pulled straight while the diabolo flies; it twangs after a catch */
          var wob = twang > 0 && !reduced ? Math.sin(clock * 60) * twang * 10 : 0;
          var sag = dstate === 'air' ? 0 : 60 * rigK;
          ctx.moveTo(T.lx, T.ly);
          ctx.quadraticCurveTo((T.lx + T.rx) / 2, (T.ly + T.ry) / 2 + sag + wob, T.rx, T.ry);
        }
        ctx.stroke();
      }
      function drawDiabolo(x, y, tilt) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        var ph = dia.phase;
        [-1, 1].forEach(function (side) {
          /* one cup: a cone from the waist out to a rim */
          var rimX = side * HL;
          var grad = ctx.createLinearGradient(0, -RR, 0, RR);
          grad.addColorStop(0, css(LACQ_L)); grad.addColorStop(0.35, css(LACQ)); grad.addColorStop(1, css(LACQ_D));
          ctx.fillStyle = grad; ctx.strokeStyle = css(P.bg, 0.6); ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(side * 2, -WR);
          ctx.quadraticCurveTo(rimX * 0.55, -WR - 4, rimX, -RR);
          ctx.lineTo(rimX, RR);
          ctx.quadraticCurveTo(rimX * 0.55, WR + 4, side * 2, WR);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          /* painted stripes running round the cone: they sweep past as it spins */
          ctx.save(); ctx.clip();
          var fast = dia.spin > 0.75 && !reduced;
          for (var k = 0; k < 3; k++) {
            var a = ph * side + k * TAU / 3, c = Math.cos(a), sn = Math.sin(a);
            if (c < 0) continue;
            ctx.strokeStyle = css(P.gold, fast ? 0.35 : 0.9); ctx.lineWidth = fast ? 5 : 3;
            ctx.beginPath(); ctx.moveTo(side * 4, sn * WR); ctx.lineTo(rimX, sn * RR); ctx.stroke();
          }
          if (fast) { ctx.fillStyle = css(P.gold, 0.18); ctx.fillRect(Math.min(0, rimX), -RR, Math.abs(rimX), RR * 2); }
          ctx.fillStyle = css(P.ink, 0.32);
          ctx.beginPath(); ctx.ellipse(rimX * 0.62, -RR * 0.5, Math.abs(rimX) * 0.3, 3, side * -0.25, 0, TAU); ctx.fill();
          ctx.restore();
          /* the rim: a gold band and the open end of the cup */
          ctx.fillStyle = css(mix(P.bg, LACQ, 0.4));
          ctx.beginPath(); ctx.ellipse(rimX, 0, 8, RR, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = css(P.gold); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(rimX, 0, 8, RR, 0, 0, TAU); ctx.stroke();
          ctx.strokeStyle = css(P.peacock); ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(rimX - side * 8, -RR * 0.86); ctx.lineTo(rimX - side * 8, RR * 0.86); ctx.stroke();
        });
        /* the axle at the waist */
        ctx.fillStyle = css(P.gold); ctx.strokeStyle = css(P.bg, 0.6); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, 0, 4, WR + 1, 0, 0, TAU); ctx.fill(); ctx.stroke();
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
          ctx.font = '700 ' + f.size + 'px ' + F.head;
          var half = ctx.measureText(f.text).width / 2 + 10, fx = clamp(f.x, half, worldW - half);
          ctx.fillStyle = css(P.bg, 0.75 * (1 - k));
          ctx.fillText(f.text, fx + 1.5, f.y - k * 32 + 1.5);
          ctx.fillStyle = css(f.c, 1 - k * k);
          ctx.fillText(f.text, fx, f.y - k * 32);
        }
      }
      function drawOffTop(top) {
        var x = clamp(dia.x, 24, worldW - 24), y = -top + 8;
        var feet = Math.round(((toss ? toss.fromY : GROUND) - dia.y) / FT);
        ctx.fillStyle = css(P.gold);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 12, y + 16); ctx.lineTo(x + 12, y + 16); ctx.closePath(); ctx.fill();
        ctx.font = '700 15px ' + F.mono; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(feet + ' ft', x, y + 20);
      }
      function narrow() { return cssW < 560; }
      function roundRect(x, y, w, hh, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + hh - r); ctx.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh);
        ctx.lineTo(x + r, y + hh); ctx.quadraticCurveTo(x, y + hh, x, y + hh - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      }
      function drawHud() {
        if (phase !== 'playing' && phase !== 'dropping') return;
        var big = Math.round(clamp(cssH * 0.085, 26, 48)), small = Math.round(clamp(big * 0.32, 11, 15));
        /* the spin meter, down the left side */
        var col = dia.spin < 0.3 ? P.vermilion : dia.spin < 0.7 ? P.gold : P.leaf;
        if (narrow()) {
          var bwd = cssW * 0.62, bx = (cssW - bwd) / 2 + 18, bh = 14, byy = cssH - 30;
          ctx.fillStyle = css(P.bg, 0.78); roundRect(bx - 50, byy - 8, bwd + 58, bh + 16, 12); ctx.fill();
          ctx.font = '700 ' + small + 'px ' + F.mono; ctx.fillStyle = css(P.ink); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          ctx.fillText('SPIN', bx - 7, byy + bh / 2 + 1);
          ctx.fillStyle = css(P.surface2); roundRect(bx, byy, bwd, bh, bh / 2); ctx.fill();
          ctx.fillStyle = css(col); roundRect(bx, byy, Math.max(0.1, clamp(dia.spin, 0, 1) * bwd), bh, bh / 2); ctx.fill();
          ctx.strokeStyle = css(P.ink, 0.85); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(bx + bwd * 0.3, byy - 3); ctx.lineTo(bx + bwd * 0.3, byy + bh + 3); ctx.stroke();
        } else {
          var mx = 22, mt = 26, mh = clamp(cssH * 0.42, 110, 260), mw = clamp(cssW * 0.02, 14, 22);
          ctx.fillStyle = css(P.bg, 0.72); roundRect(mx - 6, mt - 6, mw + 12, mh + 34, 10); ctx.fill();
          ctx.fillStyle = css(P.surface2); roundRect(mx, mt, mw, mh, mw / 2); ctx.fill();
          var fill = clamp(dia.spin, 0, 1) * mh;
          ctx.fillStyle = css(col); roundRect(mx, mt + mh - fill, mw, Math.max(fill, 0.1), mw / 2); ctx.fill();
          ctx.strokeStyle = css(P.ink, 0.85); ctx.lineWidth = 2;
          var ly = mt + mh * 0.7;   /* the toss line: 30 per cent spin */
          ctx.beginPath(); ctx.moveTo(mx - 4, ly); ctx.lineTo(mx + mw + 4, ly); ctx.stroke();
          ctx.font = '700 ' + small + 'px ' + F.mono; ctx.fillStyle = css(P.ink); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText('SPIN', mx + mw / 2, mt + mh + 6);
        }
        /* score, top right */
        var sText = String(score), pop = reduced ? 1 : 1 + scorePop * 0.6;
        ctx.font = '400 ' + Math.round(big * pop) + 'px ' + F.display;
        var sw = ctx.measureText(sText).width;
        ctx.font = '700 ' + small + 'px ' + F.mono;
        var sub = 'BEST ' + bestFor(diff);
        var bw = Math.max(sw, ctx.measureText(sub).width) + 24;
        ctx.fillStyle = css(P.bg, 0.72); roundRect(cssW - 14 - bw, 14, bw, big * 1.5 + 6, 12); ctx.fill();
        ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
        ctx.font = '400 ' + Math.round(big * pop) + 'px ' + F.display; ctx.fillStyle = css(P.gold);
        ctx.fillText(sText, cssW - 26, 14 + big);
        ctx.font = '700 ' + small + 'px ' + F.mono; ctx.fillStyle = css(P.inkMuted);
        ctx.fillText(sub, cssW - 26, 18 + big * 1.38);
        if (catches >= 2) {
          var mult = Math.min(3, 1 + 0.25 * (catches - 1));
          var cText = catches + ' caught  ×' + mult;
          ctx.font = '700 ' + Math.round(small * 1.1) + 'px ' + F.head;
          var cw = ctx.measureText(cText).width + 20;
          ctx.fillStyle = css(P.leaf, 0.92); roundRect(cssW - 14 - cw, 22 + big * 1.5, cw, small * 2.1, small); ctx.fill();
          ctx.fillStyle = css(P.bg); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(cText, cssW - 14 - cw / 2, 22 + big * 1.5 + small * 1.05);
        }
        /* tilt warning */
        if (dstate === 'string' && Math.abs(dia.tilt) > 0.4 && phase === 'playing') {
          ctx.font = '700 ' + Math.round(clamp(cssH * 0.05, 15, 24)) + 'px ' + F.head;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          var warn = dia.spin < 0.3 ? 'Wobbling! Spin it faster' : 'Tipping! Keep the beat steady';
          ctx.fillStyle = css(P.bg, 0.8); ctx.fillText(warn, cssW / 2 + 2, cssH * 0.5 + 2);
          ctx.fillStyle = css(P.vermilion); ctx.fillText(warn, cssW / 2, cssH * 0.5);
        }
        /* banners */
        for (var i = 0; i < banners.length; i++) {
          var b = banners[i], k = b.life / b.max;
          var size = Math.round(clamp(cssH * 0.07, 20, 44) * (reduced ? 1 : (k < 0.12 ? 0.7 + 2.5 * k : 1)));
          ctx.font = '400 ' + size + 'px ' + F.poster;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          var maxW = cssW - 120, mw2 = ctx.measureText(b.text).width;
          if (mw2 > maxW) { size = Math.floor(size * maxW / mw2); ctx.font = '400 ' + size + 'px ' + F.poster; }
          var y = Math.max(cssH * 0.18, 40 + big);
          ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
          ctx.fillStyle = css(P.bg, 0.85); ctx.fillText(b.text, cssW / 2 + 3, y + 3);
          ctx.fillStyle = css(b.c); ctx.fillText(b.text, cssW / 2, y);
          ctx.globalAlpha = 1;
        }
        /* first-run coaching: show the two tap halves */
        if (hintTime > 0 && phase === 'playing' && dstate === 'string') {
          var a = Math.min(1, hintTime) * 0.9;
          ctx.font = '700 ' + Math.round(clamp(cssH * 0.045, 13, 20)) + 'px ' + F.head;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          var yy = narrow() ? cssH - 62 : cssH - 26;
          (narrow() ? [['◀ Tap left', cssW * 0.25], ['Tap right ▶', cssW * 0.75]] : [['◀ Tap left or A', cssW * 0.27], ['Tap right or D ▶', cssW * 0.73]]).forEach(function (k2) {
            var hw = ctx.measureText(k2[0]).width + 20;
            ctx.fillStyle = css(P.bg, 0.8 * a); roundRect(k2[1] - hw / 2, yy - 15, hw, 30, 15); ctx.fill();
            ctx.fillStyle = css(P.ink, a); ctx.fillText(k2[0], k2[1], yy + 1);
          });
          ctx.strokeStyle = css(P.ink, 0.25 * a); ctx.setLineDash([6, 8]); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(cssW / 2, cssH * 0.55); ctx.lineTo(cssW / 2, cssH - 8); ctx.stroke(); ctx.setLineDash([]);
        }
      }

      function publishState(force) {
        if (!force && frameNo % 2 && phase === 'playing') return;
        var T = tips(), top = worldH - WORLD_H;
        function px(x, y) { return { x: Math.round(x * scale), y: Math.round((y + top) * scale) }; }
        canvas.setAttribute('data-state', JSON.stringify({
          phase: phase, dstate: dstate, spin: +dia.spin.toFixed(3), tilt: +dia.tilt.toFixed(3), d: px(dia.x, dia.y),
          dv: { x: Math.round(dia.vx * scale), y: Math.round(dia.vy * scale) }, hands: px(hands.x, hands.y), lt: px(T.lx, T.ly), rt: px(T.rx, T.ry),
          score: score, catches: catches, bestToss: bestToss, reason: reason, frame: frameNo, best: bestFor(diff), difficulty: diff,
          tricks: Object.keys(tricks), runTricks: Object.keys(runTricks)
        }));
      }

      /* ---------- overlay, buttons, tricks and status ---------- */
      var lastStatus = '';
      function setStatus(t) { if (t !== lastStatus) { lastStatus = t; api.status(t); } }
      function setButtons() {
        var live = phase === 'playing' || phase === 'paused';
        pauseBtn.disabled = !live;
        stopBtn.disabled = !(live || phase === 'dropping');
        pauseBtn.textContent = phase === 'paused' ? 'Resume' : 'Pause';
        leftBtn.disabled = rightBtn.disabled = tossBtn.disabled = phase !== 'playing';
        publishState(true);
      }
      function renderTricks(fresh) {
        trickList.replaceChildren.apply(trickList, TRICKS.map(function (t) {
          return h('li', { class: (tricks[t.id] ? 'on' : '') + (t.id === fresh && !reduced ? ' new' : ''), title: t.how }, t.name);
        }));
        var next = TRICKS.filter(function (t) { return !tricks[t.id]; })[0];
        var got = TRICKS.filter(function (t) { return tricks[t.id]; }).length;
        nextEl.textContent = next ? got + ' of ' + TRICKS.length + ' unlocked. Next to try: ' + next.name + '. ' + next.how : 'All ' + TRICKS.length + ' tricks unlocked. Paris, 1907, would cheer!';
      }
      function diffSeg() {
        return h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' }, ORDER.map(function (k) {
          return h('button', { type: 'button', 'aria-pressed': String(k === diff), onclick: function () { setDiff(k); } }, DIFFS[k].label);
        }));
      }
      function setDiff(k) {
        if (!DIFFS[k] || phase === 'playing' || phase === 'dropping') return;
        diff = k; D = DIFFS[k];
        api.store.set('difficulty', diff);
        api.sound('click');
        bestEl.textContent = String(bestFor(diff));
        showOverlay(phase === 'over' ? 'over' : 'title');
        var b = ov.querySelector('.seg button[aria-pressed="true"]');
        if (b) { try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
        render();
      }
      function goButton(label) {
        return h('button', { class: 'btn btn-primary db-go', type: 'button', onclick: function () { if (performance.now() < readyAt) return; api.sound('click'); start(); } }, label);
      }
      function showOverlay(kind) {
        var kids = [];
        if (kind === 'title') {
          kids.push(h('p', { class: 'db-kicker' }, 'The New Century', h('span', { class: 'db-msg2' }, ' · Paris, 1907')));
          kids.push(h('h3', { class: 'db-title' }, 'Diabolo'));
          kids.push(h('p', { class: 'db-msg' }, 'Pull left, right, left, right to spin it up.'));
          kids.push(h('p', { class: 'db-msg db-msg2' }, 'Then toss it high and catch it on the string. Higher tosses score more.'));
          kids.push(goButton('▶ Start'));
          kids.push(diffSeg());
          kids.push(h('p', { class: 'db-best' }, 'Best on ' + D.label + ': ' + bestFor(diff) + ' points'));
        } else if (kind === 'paused') {
          kids.push(h('h3', { class: 'db-title' }, 'Paused'));
          kids.push(h('p', { class: 'db-big' }, String(score), h('small', null, 'points')));
          kids.push(h('div', { class: 'db-row' },
            h('button', { class: 'btn btn-primary db-go', type: 'button', onclick: function () { api.sound('click'); resume(); } }, '▶ Resume'),
            h('button', { class: 'btn', type: 'button', onclick: function () { stopRun(); } }, 'Stop')));
        } else {
          var r = lastResult || { score: 0, catches: 0, bestToss: 0, isBest: false, reason: 'stopped' };
          var head = { miss: 'Missed!', tilt: 'Tipped off!', slow: 'It stopped!', stopped: 'Stopped' }[r.reason] || 'Dropped!';
          kids.push(h('p', { class: 'db-kicker' }, r.catches + (r.catches === 1 ? ' catch' : ' catches') + (r.bestToss ? ' · best toss ' + r.bestToss + ' ft' : '')));
          kids.push(h('h3', { class: 'db-title' }, head));
          kids.push(h('p', { class: 'db-big' }, String(r.score), h('small', null, r.score === 1 ? 'point' : 'points')));
          kids.push(r.isBest ? h('p', { class: 'db-ribbon' }, 'New best!') : h('p', { class: 'db-best' }, 'Best on ' + D.label + ': ' + bestFor(diff)));
          kids.push(goButton('▶ Play again'));
          kids.push(diffSeg());
        }
        ov.replaceChildren.apply(ov, kids);
        ov.hidden = false;
        if (kind !== 'title') {
          var b = ov.querySelector('.db-go');
          if (b) { try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
        }
      }

      /* ---------- input ---------- */
      var ptr = null;
      function toWorld(e) {
        var r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale - (worldH - WORLD_H), cx: e.clientX - r.left, w: r.width };
      }
      function followPointer(p) {
        handT.x = p.x;
        handT.y = p.y + 20;
      }
      function onDown(e) {
        if (phase !== 'playing') return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        try { canvas.focus({ preventScroll: true }); } catch (err2) { /* ignore */ }
        var p = toWorld(e);
        ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, swiped: false };
        if (dstate === 'string') pull(p.cx < p.w / 2 ? -1 : 1);
        else if (dstate === 'air') followPointer(p);
      }
      function onMove(e) {
        if (phase !== 'playing') return;
        var p = toWorld(e);
        if (dstate === 'air' && (e.pointerType === 'mouse' || (ptr && e.pointerId === ptr.id))) followPointer(p);
        if (!ptr || e.pointerId !== ptr.id || ptr.swiped) return;
        var dy = ptr.y - e.clientY, dx = Math.abs(e.clientX - ptr.x);
        if (dy > 30 && dy > dx) { ptr.swiped = true; tossIt(); }
      }
      function onUp(e) { if (ptr && e.pointerId === ptr.id) ptr = null; }
      function onContext(e) { if (phase === 'playing') e.preventDefault(); }
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('contextmenu', onContext);
      /* The three pads: Left and Right pull while it spins, and steer the sticks while it flies. */
      function padSide(side) {
        return function (e) {
          if (e.type === 'pointerdown') {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            e.preventDefault();
            if (dstate === 'air') { if (side < 0) keys.left = true; else keys.right = true; }
            else pull(side);
          } else if (e.type === 'click' && e.detail === 0) { if (dstate === 'air') handT.x += side * 60; else pull(side); }
          else if (e.type === 'pointerup' || e.type === 'pointerleave' || e.type === 'pointercancel') { if (side < 0) keys.left = false; else keys.right = false; }
        };
      }
      ['pointerdown', 'click', 'pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
        leftBtn.addEventListener(ev, padSide(-1));
        rightBtn.addEventListener(ev, padSide(1));
      });
      tossBtn.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button !== 0) return; e.preventDefault(); tossIt(); });
      tossBtn.addEventListener('click', function (e) { if (e.detail === 0) tossIt(); });

      function gameKeyTarget(e) {
        var t = e.target, tag = t && t.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return false;
        if (t && t !== document.body && t !== document.documentElement && !root.contains(t)) return false;
        return tag !== 'BUTTON' && tag !== 'A';
      }
      function onKey(e) {
        if (destroyed || !gameKeyTarget(e)) return;
        var k = e.key;
        if (phase === 'playing') {
          var left = k === 'ArrowLeft' || k === 'a' || k === 'A', right = k === 'ArrowRight' || k === 'd' || k === 'D';
          if (left || right) {
            e.preventDefault();
            if (dstate === 'air') { if (left) keys.left = true; else keys.right = true; }
            else if (!e.repeat) pull(left ? -1 : 1);
          } else if (k === ' ' || k === 'Spacebar' || k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); if (!e.repeat) tossIt(); }
          else if (k === 'p' || k === 'P' || k === 'Escape') { e.preventDefault(); pause(); }
          else if (k === 'ArrowDown') e.preventDefault();
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
      function onVisibility() {
        if (document.hidden) { if (phase === 'playing') pause(); else if (phase === 'dropping') stopLoop(); }
        else if (phase === 'dropping') startLoop();
      }
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
      setStatus('Press Start. Then pull left, right, left, right in a steady beat to spin the diabolo up.');
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { if (!destroyed && cssW) { scene = paintScene(); if (!raf) render(); } }).catch(function () { /* fonts are optional */ });
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
          scene = null;
        }
      };
    }
  });
})();
