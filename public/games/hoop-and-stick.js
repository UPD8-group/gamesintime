/* Hoop and Stick for Games in Time.
   The real toy: a big wooden hoop bowled along the street with a short stick. Children ran behind it, tapping the
   back of the hoop to keep it rolling. Too slow and it wobbles and falls over; too fast and it gets away from you.

   How the file is organised:
     1. Settings: difficulty levels, sizes and speeds. The street is measured in world units: 60 units make a yard.
     2. The screen: score bar, the canvas, the overlay with the big gold Start button, and the Strike and Jump pads.
     3. Scenery: the sky, the far skyline, the shops and houses, and the footpath with gas lamps and cobbles are
        painted once into offscreen canvases, then slid past at different speeds for parallax.
     4. Physics: a fixed 1/120 second step timed from performance.now(), so the hoop behaves the same on any screen.
     5. Drawing: obstacles, the child, the hoop, chalk dust, and the speed gauge with its green sweet zone.
   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  var ID = 'hoop-and-stick';
  var STEP = 1 / 120;          /* physics step in seconds */
  var YARD = 60;               /* world units in a yard */
  var R = 30;                  /* hoop radius */
  var GRAV = 1700;             /* gravity for jumps, units per second squared */
  var JUMP_V = 520;            /* launch speed of a jump */
  var IDEAL_GAP = 80;          /* where the hoop's centre runs, ahead of the child's hips */
  var REACH = 42;              /* how much further ahead the stick can still reach */
  var VIEW_H = 330;            /* world units that must fit from top to bottom */
  var VIEW_W = 360;            /* world units that must fit from side to side (look-ahead on phones) */
  var ROAD = 60;               /* cobbled road shown below the rolling line */
  var SWING_HIT = 0.07;        /* the stick reaches the hoop this long after a tap */
  var SWING_END = 0.2;
  var TAU = Math.PI * 2;

  /* lo and hi bound the green sweet zone, in world units per second (300 is 5 yards a second).
     a0 and a1 are rolling resistance; boost is what one strike adds; gap is yards between obstacles;
     runaway is how far ahead the hoop may get before it escapes; wob is how fast a slow hoop starts to wobble. */
  var DIFFS = {
    easy:   { label: 'Easy',   lo: 180, hi: 400, a0: 18, a1: 0.10, boost: 58, gap: [15, 25], runaway: 200, wob: 0.42, rut: 0.34, puddle: [58, 92] },
    medium: { label: 'Medium', lo: 205, hi: 372, a0: 22, a1: 0.11, boost: 56, gap: [11, 19], runaway: 155, wob: 0.52, rut: 0.44, puddle: [64, 102] },
    hard:   { label: 'Hard',   lo: 232, hi: 348, a0: 26, a1: 0.12, boost: 54, gap: [8, 15],  runaway: 120, wob: 0.62, rut: 0.54, puddle: [70, 110] }
  };
  var ORDER = ['easy', 'medium', 'hard'];
  var SHOPS = ['TOYS', 'BAKER', 'GROCER', 'DRAPER', 'SWEETS', 'CHEMIST', 'BOOKS', 'BUTCHER', 'TEA ROOM', 'HATTER', 'CYCLES'];

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  /* A small seeded random generator, so the street looks the same every time it is painted. */
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
    '.game-hoop-and-stick { display: grid; gap: .65rem; }' +
    '.game-hoop-and-stick .hs-bar { margin: 0; justify-content: space-between; }' +
    '.game-hoop-and-stick .hs-score { margin: 0; gap: .2rem 1.1rem; font-family: var(--font-mono); font-weight: 700; color: var(--ink-muted); align-items: baseline; }' +
    '.game-hoop-and-stick .hs-score span { align-items: baseline; }' +
    '.game-hoop-and-stick .hs-score b { font-family: var(--font-display); font-weight: 400; font-size: 1.5rem; color: var(--gold); letter-spacing: .02em; }' +
    '.game-hoop-and-stick .hs-btns { display: flex; gap: .4rem; margin-left: auto; }' +
    '.game-hoop-and-stick .hs-btns .btn { padding: .5rem .85rem; }' +
    '@media (max-width: 440px) { .game-hoop-and-stick .hs-dist, .game-hoop-and-stick .hs-unit { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; } }' +
    '.game-hoop-and-stick .hs-stage { position: relative; border-radius: 14px; overflow: hidden; background: var(--bg); box-shadow: 0 0 0 2px var(--line); }' +
    '.game-hoop-and-stick canvas { display: block; width: 100%; height: 300px; touch-action: manipulation; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }' +
    '.game-hoop-and-stick .is-playing canvas { touch-action: none; cursor: pointer; }' +
    '.game-hoop-and-stick canvas:focus { outline: none; }' +
    '.game-hoop-and-stick canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }' +
    '.game-hoop-and-stick .hs-ov { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .5rem; padding: .8rem; text-align: center; color: var(--ink);' +
    '  background: radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--bg) 62%, transparent), color-mix(in srgb, var(--bg) 90%, transparent)); }' +
    '.game-hoop-and-stick .hs-ov[hidden] { display: none; }' +
    '.game-hoop-and-stick .hs-kicker { margin: 0; font-family: var(--font-mono); font-weight: 700; font-size: .82rem; letter-spacing: .14em; text-transform: uppercase; color: var(--era); }' +
    '.game-hoop-and-stick .hs-title { margin: 0; font-family: var(--font-poster); font-weight: 700; font-size: clamp(2rem, 1.3rem + 3.4vw, 3.8rem); line-height: 1; color: var(--gold); text-shadow: 3px 3px 0 color-mix(in srgb, var(--vermilion) 75%, transparent); }' +
    '.game-hoop-and-stick .hs-msg { margin: 0; max-width: 34rem; font-weight: 600; font-size: clamp(.95rem, .85rem + .5vw, 1.2rem); line-height: 1.35; }' +
    '.game-hoop-and-stick .hs-big { margin: 0; font-family: var(--font-display); font-size: clamp(2.4rem, 1.5rem + 4vw, 4.6rem); line-height: 1; color: var(--ink); }' +
    '.game-hoop-and-stick .hs-big small { font-size: .42em; color: var(--ink-muted); margin-left: .2em; }' +
    '.game-hoop-and-stick .hs-best { margin: 0; font-family: var(--font-mono); font-weight: 700; color: var(--ink-muted); }' +
    '.game-hoop-and-stick .hs-ribbon { display: inline-block; margin: 0; padding: .25rem .95rem; border-radius: 999px; background: var(--gold); color: var(--on-era); font-weight: 800; }' +
    '.game-hoop-and-stick .hs-go { min-height: 58px; padding: .7rem 2.4rem; font-size: clamp(1.2rem, 1rem + 1vw, 1.6rem); font-weight: 800; }' +
    '.game-hoop-and-stick .hs-row { display: flex; flex-wrap: wrap; gap: .5rem .7rem; justify-content: center; align-items: center; }' +
    '.game-hoop-and-stick .hs-pad { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }' +
    '.game-hoop-and-stick .hs-pad .btn { min-height: 54px; font-size: 1.1rem; touch-action: manipulation; -webkit-user-select: none; user-select: none; }' +
    '.game-hoop-and-stick .hs-pad kbd { font-family: var(--font-mono); font-size: .8rem; color: var(--ink-muted); border: 1px solid var(--line); border-radius: 6px; padding: 0 .35rem; }' +
    '.game-hoop-and-stick .game-note { margin: 0; }' +
    '.game-hoop-and-stick .hs-compact .hs-msg2 { display: none; }' +
    '.game-hoop-and-stick .hs-compact .hs-ov { gap: .35rem; padding: .5rem; }' +
    '.game-hoop-and-stick .hs-compact .hs-go { min-height: 50px; padding: .55rem 1.8rem; }' +
    '.game-hoop-and-stick .hs-compact .seg button { min-height: 40px; padding: .35rem .8rem; }';

  GamesInTime.register({
    id: ID,
    frame: 'stage',
    mount: function (root, api) {
      var h = api.h;
      var destroyed = false;
      var reduced = !!api.reducedMotion;
      var diff = api.store.get('difficulty', 'medium');
      if (!DIFFS[diff]) diff = 'medium';
      var bests = api.store.get('best', {});
      if (!bests || typeof bests !== 'object') bests = {};
      function bestFor(d) { var b = Number(bests[d]); return isFinite(b) && b > 0 ? Math.floor(b) : 0; }
      function tone(f, d, type, vol) { if (typeof api.tone === 'function') { try { api.tone(f, d, type, vol); } catch (e) { /* sound is optional */ } } }

      /* ---------- the screen ---------- */
      root.appendChild(h('style', null, CSS));
      var distEl = h('b', null, '0');
      var bestEl = h('b', null, String(bestFor(diff)));
      var pauseBtn = h('button', { class: 'btn btn-ghost', type: 'button', disabled: true, onclick: function () { if (phase === 'paused') resume(); else pause(); } }, 'Pause');
      var stopBtn = h('button', { class: 'btn btn-ghost', type: 'button', disabled: true, onclick: function () { stopRun(); } }, 'Stop');
      var bar = h('div', { class: 'game-toolbar hs-bar' },
        h('div', { class: 'scoreboard hs-score' }, h('span', { class: 'hs-dist' }, 'Distance ', distEl, ' yd'), h('span', null, 'Best ', bestEl, h('span', { class: 'hs-unit' }, ' yd'))),
        h('div', { class: 'hs-btns' }, pauseBtn, stopBtn));
      var canvas = h('canvas', { class: 'hs-canvas', tabindex: '0', role: 'img',
        'aria-label': 'A Victorian street at dusk with gas lamps, shops and cobbles. A child runs behind a wooden hoop, ready to strike it with a stick.' });
      var ov = h('div', { class: 'hs-ov' });
      var stage = h('div', { class: 'hs-stage' }, canvas, ov);
      var strikeBtn = h('button', { class: 'btn', type: 'button', disabled: true, 'aria-label': 'Strike the hoop' }, 'Strike ', h('kbd', null, 'Space'));
      var jumpBtn = h('button', { class: 'btn', type: 'button', disabled: true, 'aria-label': 'Jump' }, 'Jump ', h('kbd', null, 'Up'));
      var pad = h('div', { class: 'hs-pad' }, strikeBtn, jumpBtn);
      var note = h('p', { class: 'game-note' }, 'Tap the street, click or press Space to strike. Swipe up, press Up or W to jump. P pauses.');
      root.appendChild(bar);
      root.appendChild(stage);
      root.appendChild(pad);
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
      function readTheme() {
        var cs = getComputedStyle(root);
        function v(name, alt) { return cs.getPropertyValue(name).trim() || (alt ? cs.getPropertyValue(alt).trim() : ''); }
        ['bg', 'surface', 'surface-2', 'ink', 'ink-muted', 'ink-faint', 'gold', 'gold-shadow', 'vermilion', 'peacock', 'cobalt', 'rose', 'leaf', 'brand', 'era', 'red', 'green'].forEach(function (n) {
          P[n.replace(/-(\w)/g, function (a, c) { return c.toUpperCase(); })] = parseColour(v('--' + n, '--ink'));
        });
        F.display = v('--font-display') || 'serif';
        F.poster = v('--font-poster', '--font-display') || 'serif';
        F.mono = v('--font-mono') || 'monospace';
        F.head = v('--font-head') || 'sans-serif';
      }
      function css(c, a) { return 'rgba(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ',' + (a == null ? 1 : a) + ')'; }
      function mix(a, b, t) { return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) }; }
      readTheme();

      /* ---------- sizes ---------- */
      var cssW = 0, cssH = 0, dpr = 1, scale = 1, viewW = VIEW_W, groundY = 0;
      var layers = null;

      function heightFor(w) {
        var vh = window.innerHeight || 800;
        var hh = w < 560 ? w * 1.0 : w * 0.5;
        hh = Math.min(hh, vh * 0.72, 640);
        return Math.round(Math.max(280, hh));
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
        scale = Math.min(cssH / VIEW_H, cssW / VIEW_W);
        viewW = cssW / scale;
        groundY = cssH - ROAD * scale;
        stage.classList.toggle('hs-compact', cssH < 380 || cssW < 420);
        buildLayers();
        render(1);
      }

      /* ---------- scenery, painted once per size ---------- */
      var noise = {};
      function noisePattern(c, col) {
        var key = col ? 'tint' : 'ink';
        if (!noise[key]) {
          var nc = document.createElement('canvas');
          nc.width = nc.height = 96;
          var n = nc.getContext('2d'), r = seeded(4242);
          n.fillStyle = css(col || P.ink, 1);
          for (var i = 0; i < 900; i++) { n.globalAlpha = 0.25 + r() * 0.75; n.fillRect(Math.floor(r() * 96), Math.floor(r() * 96), 1 + (r() < 0.2 ? 1 : 0), 1); }
          noise[key] = nc;
        }
        return c.createPattern(noise[key], 'repeat');
      }
      /* Rub chalk: erase specks so painted areas look like chalk on slate. An opaque strip gets darker specks
         instead, so nothing behind it ever shows through. */
      function chalkify(cv, amount, opaque) {
        var c = cv.getContext('2d');
        c.save();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = opaque ? 'source-atop' : 'destination-out';
        c.globalAlpha = amount;
        c.fillStyle = noisePattern(c, opaque ? P.bg : null);
        c.fillRect(0, 0, cv.width, cv.height);
        c.restore();
      }
      /* A strip of scenery that repeats every tileU world units. It only covers the rows between topU and botU
         (world units above the rolling line are negative), so less has to be copied to the screen each frame. */
      function makeLayer(tileU, topU, botU, opaque) {
        var s = scale * dpr, gy = groundY * dpr;
        var px = Math.max(Math.ceil(tileU * s), canvas.width + 2);
        var y0 = topU == null ? 0 : clamp(Math.floor(gy + topU * s), 0, canvas.height - 1);
        var y1 = botU == null ? canvas.height : clamp(Math.ceil(gy + botU * s), y0 + 1, canvas.height);
        var cv = document.createElement('canvas');
        cv.width = px; cv.height = y1 - y0;
        var c = cv.getContext('2d', opaque ? { alpha: false } : undefined);
        var sx = px / tileU;
        c.setTransform(sx, 0, 0, s, 0, gy - y0);
        c.lineCap = 'round'; c.lineJoin = 'round';
        return { cv: cv, c: c, tileU: tileU, px: px, sx: sx, y0: y0 };
      }
      function buildLayers() {
        if (!cssW) return;
        layers = { far: paintFar(), moon: paintMoon(), mid: paintMid(), near: paintNear(), lamp: paintLamp(), box: paintPillarBox() };
      }

      function skyGradient(c, h) {
        var g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, css(P.bg));
        g.addColorStop(0.5, css(mix(P.bg, P.peacock, 0.1)));
        g.addColorStop(0.85, css(mix(P.bg, P.gold, 0.16)));
        g.addColorStop(1, css(mix(P.bg, P.vermilion, 0.14)));
        return g;
      }
      /* The moon stays put in the sky while the street slides past. */
      function paintMoon() {
        var gy = groundY * dpr, mr = Math.max(10, Math.min(canvas.width, canvas.height) * 0.045);
        var size = Math.ceil(mr * 8), cv = document.createElement('canvas');
        cv.width = cv.height = size;
        var c = cv.getContext('2d'), m = size / 2;
        var glow = c.createRadialGradient(m, m, mr * 0.5, m, m, mr * 4);
        glow.addColorStop(0, css(P.gold, 0.22));
        glow.addColorStop(1, css(P.gold, 0));
        c.fillStyle = glow; c.fillRect(0, 0, size, size);
        c.fillStyle = css(P.gold, 0.92);
        c.beginPath(); c.arc(m, m, mr, 0, TAU); c.fill();
        c.globalCompositeOperation = 'destination-out';
        c.beginPath(); c.arc(m + mr * 0.45, m - mr * 0.18, mr * 0.88, 0, TAU); c.fill();
        return { cv: cv, x: Math.round(canvas.width * 0.6 - m), y: Math.round(gy * 0.2 + mr - m) };
      }

      /* The far skyline: rooftops, chimneys, a spire, a dome and a mill chimney. */
      function paintFar() {
        var L = makeLayer(1200, null, -36, true), Sk = makeLayer(1200, null, -36), c = Sk.c, r = seeded(31), x = 0, parts = [];
        while (x < L.tileU) { var w = 50 + r() * 80; parts.push({ x: x, w: w }); x += w; }
        var k = L.tileU / x;
        parts.forEach(function (p) { p.x *= k; p.w *= k; });
        var fill = css(mix(P.bg, P.ink, 0.075)), line = css(P.ink, 0.2);
        c.lineWidth = 1.6;
        parts.forEach(function (p, i) {
          var top = -40 - (130 + r() * 110);
          c.fillStyle = fill; c.strokeStyle = line;
          c.beginPath();
          c.moveTo(p.x, -30); c.lineTo(p.x, top);
          if (r() < 0.5) { c.lineTo(p.x + p.w / 2, top - 20 - r() * 14); c.lineTo(p.x + p.w, top); }
          else c.lineTo(p.x + p.w, top);
          c.lineTo(p.x + p.w, -30); c.closePath(); c.fill(); c.stroke();
          var n = 1 + Math.floor(r() * 3);
          for (var j = 0; j < n; j++) {
            var cx = p.x + 8 + r() * (p.w - 24), ch = 14 + r() * 16;
            c.fillRect(cx, top - ch, 12, ch + 2); c.strokeRect(cx, top - ch, 12, ch);
            c.fillRect(cx + 2, top - ch - 6, 3, 6); c.fillRect(cx + 7, top - ch - 5, 3, 5);
          }
          if (i % 7 === 2) {      /* a church spire */
            var sx = p.x + p.w / 2;
            c.beginPath(); c.moveTo(sx - 16, top); c.lineTo(sx - 16, top - 50); c.lineTo(sx, top - 130); c.lineTo(sx + 16, top - 50); c.lineTo(sx + 16, top); c.closePath(); c.fill(); c.stroke();
            c.beginPath(); c.moveTo(sx, top - 130); c.lineTo(sx, top - 146); c.moveTo(sx - 6, top - 140); c.lineTo(sx + 6, top - 140); c.stroke();
          } else if (i % 7 === 5) {   /* a dome */
            var dx = p.x + p.w / 2;
            c.beginPath(); c.moveTo(dx - 30, top); c.arc(dx, top, 30, Math.PI, TAU); c.closePath(); c.fill(); c.stroke();
            c.fillRect(dx - 5, top - 46, 10, 16); c.strokeRect(dx - 5, top - 46, 10, 16);
          } else if (i % 11 === 8) {  /* a mill chimney with smoke */
            var mx = p.x + p.w * 0.3;
            c.beginPath(); c.moveTo(mx - 9, top); c.lineTo(mx - 6, top - 120); c.lineTo(mx + 6, top - 120); c.lineTo(mx + 9, top); c.closePath(); c.fill(); c.stroke();
            c.strokeStyle = css(P.ink, 0.14); c.lineWidth = 5;
            c.beginPath(); c.moveTo(mx, top - 126);
            c.bezierCurveTo(mx + 20, top - 150, mx + 50, top - 140, mx + 70, top - 165);
            c.bezierCurveTo(mx + 90, top - 185, mx + 120, top - 175, mx + 150, top - 190);
            c.stroke(); c.lineWidth = 1.6;
          }
        });
        chalkify(Sk.cv, 0.35);
        /* the dusk sky goes in the same strip, so the sky and skyline are one copy per frame instead of two */
        var k2 = L.c;
        k2.save();
        k2.setTransform(1, 0, 0, 1, 0, 0);
        k2.fillStyle = skyGradient(k2, groundY * dpr - L.y0);
        k2.fillRect(0, 0, L.cv.width, L.cv.height);
        var sr = seeded(99), skyH = Math.max(1, groundY * dpr * 0.55);
        for (var st = 0; st < 46 * L.cv.width / canvas.width; st++) {
          var stx = sr() * L.cv.width, sty = sr() * skyH, sz = (1 + sr() * 1.6) * dpr;
          k2.fillStyle = css(P.ink, 0.25 + sr() * 0.45);
          k2.fillRect(stx, sty, sz, sz);
          if (sr() < 0.2) { k2.fillRect(stx - sz * 1.5, sty + sz * 0.35, sz * 4, sz * 0.3); k2.fillRect(stx + sz * 0.35, sty - sz * 1.5, sz * 0.3, sz * 4); }
        }
        k2.drawImage(Sk.cv, 0, 0);
        k2.restore();
        return L;
      }

      /* Terrace houses and shop fronts with lit windows, painted doors and gold-lettered fascia boards. */
      function paintMid() {
        var L = makeLayer(1500, -320, -36), c = L.c, r = seeded(777), x = 0, parts = [];
        while (x < L.tileU) { var w = 128 + r() * 64; parts.push({ x: x, w: w }); x += w; }
        var k = L.tileU / x;
        parts.forEach(function (p) { p.x *= k; p.w *= k; });
        var chalk = css(P.ink, 0.62), chalkSoft = css(P.ink, 0.26);
        var doors = [P.peacock, P.vermilion, P.cobalt, P.rose, P.leaf];
        var shopIx = 0;
        parts.forEach(function (p, i) {
          var shop = i % 3 !== 1;
          var hgt = shop ? 175 + r() * 45 : 150 + r() * 40;
          var base = -40, top = base - hgt, x0 = p.x + 2, x1 = p.x + p.w - 2, w = x1 - x0;
          var face = [mix(P.bg, P.vermilion, 0.24), mix(P.bg, P.ink, 0.13), mix(P.bg, P.leaf, 0.14), mix(P.bg, P.gold, 0.16)][Math.floor(r() * 4)];
          /* roof and chimneys */
          c.fillStyle = css(mix(P.bg, P.cobalt, 0.1));
          c.beginPath(); c.moveTo(x0 + 6, top); c.lineTo(x0 + 22, top - 18); c.lineTo(x1 - 22, top - 18); c.lineTo(x1 - 6, top); c.closePath(); c.fill();
          c.strokeStyle = chalkSoft; c.lineWidth = 1.5; c.stroke();
          var chx = r() < 0.5 ? x0 + 14 : x1 - 40;
          c.fillStyle = css(face); c.fillRect(chx, top - 40, 26, 24); c.strokeStyle = chalk; c.strokeRect(chx, top - 40, 26, 24);
          c.fillStyle = css(mix(P.bg, P.vermilion, 0.45));
          c.fillRect(chx + 3, top - 48, 7, 9); c.fillRect(chx + 15, top - 47, 7, 8);
          /* the front */
          c.fillStyle = css(face); c.fillRect(x0, top, w, hgt);
          /* brick courses */
          c.strokeStyle = css(P.ink, 0.06); c.lineWidth = 1;
          c.beginPath();
          for (var by = top + 8, row = 0; by < base; by += 8, row++) {
            c.moveTo(x0, by); c.lineTo(x1, by);
            for (var bx = x0 + (row % 2 ? 10 : 0); bx < x1; bx += 20) { c.moveTo(bx, by - 8); c.lineTo(bx, by); }
          }
          c.stroke();
          c.strokeStyle = chalk; c.lineWidth = 2;
          c.strokeRect(x0, top, w, hgt);
          c.beginPath(); c.moveTo(x0 - 3, top + 6); c.lineTo(x1 + 3, top + 6); c.stroke();
          /* upper windows */
          var floors = hgt > 190 ? 2 : 1, cols = w > 160 ? 3 : 2;
          for (var f = 0; f < floors; f++) {
            var wy = top + 18 + f * 56;
            for (var cI = 0; cI < cols; cI++) {
              var ww = 20, wx = x0 + (w / cols) * (cI + 0.5) - ww / 2, lit = r() < 0.55;
              c.fillStyle = lit ? css(mix(P.gold, P.bg, 0.2), 0.95) : css(mix(P.bg, P.cobalt, 0.3));
              c.fillRect(wx, wy, ww, 32);
              c.strokeStyle = chalk; c.lineWidth = 1.6; c.strokeRect(wx, wy, ww, 32);
              c.beginPath(); c.moveTo(wx, wy + 16); c.lineTo(wx + ww, wy + 16); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + 32); c.stroke();
              c.beginPath(); c.moveTo(wx - 3, wy + 34); c.lineTo(wx + ww + 3, wy + 34); c.stroke();
            }
          }
          if (shop) {
            var name = SHOPS[shopIx++ % SHOPS.length];
            var fy = base - 78;
            c.fillStyle = css(mix(P.brand, P.bg, 0.15)); c.fillRect(x0 + 2, fy, w - 4, 18);
            c.strokeStyle = css(P.gold, 0.8); c.lineWidth = 1.5; c.strokeRect(x0 + 4, fy + 2, w - 8, 14);
            c.fillStyle = css(P.gold);
            var fs = 13;
            c.font = '700 ' + fs + 'px ' + F.poster;
            var tw = c.measureText(name).width;
            if (tw > w - 16) { fs = fs * (w - 16) / tw; c.font = '700 ' + fs + 'px ' + F.poster; }
            c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillText(name, x0 + w / 2, fy + 9.5);
            /* the display window, warm and lit */
            var dwx = x0 + 8, dww = w - 44, dwy = fy + 24, dwh = 46;
            var glow = c.createLinearGradient(0, dwy, 0, dwy + dwh);
            glow.addColorStop(0, css(mix(P.gold, P.bg, 0.15), 0.95));
            glow.addColorStop(1, css(mix(P.gold, P.vermilion, 0.35), 0.75));
            c.fillStyle = glow; c.fillRect(dwx, dwy, dww, dwh);
            c.strokeStyle = chalk; c.lineWidth = 1.8; c.strokeRect(dwx, dwy, dww, dwh);
            c.beginPath();
            for (var m = 1; m < 3; m++) { c.moveTo(dwx + dww * m / 3, dwy); c.lineTo(dwx + dww * m / 3, dwy + dwh); }
            c.stroke();
            /* goods in the window */
            c.fillStyle = css(mix(P.bg, P.vermilion, 0.4), 0.85);
            for (var gI = 0; gI < 4; gI++) {
              var gx = dwx + 8 + gI * (dww - 16) / 4, gh = 8 + r() * 12;
              if (r() < 0.5) { c.beginPath(); c.arc(gx + 6, dwy + dwh - gh / 2 - 2, gh / 2, 0, TAU); c.fill(); }
              else c.fillRect(gx, dwy + dwh - gh - 2, 12, gh);
            }
            /* shop door */
            var dcol = doors[i % doors.length];
            c.fillStyle = css(mix(dcol, P.bg, 0.35)); c.fillRect(x1 - 30, fy + 24, 22, 54);
            c.strokeStyle = chalk; c.strokeRect(x1 - 30, fy + 24, 22, 54);
            if (r() < 0.6) {   /* a striped awning */
              for (var a = 0; a < 8; a++) {
                c.fillStyle = a % 2 ? css(P.ink, 0.75) : css(mix(P.vermilion, P.bg, 0.15), 0.9);
                c.beginPath();
                var ax = x0 + 2 + a * (w - 4) / 8, aw = (w - 4) / 8;
                c.moveTo(ax, fy + 18); c.lineTo(ax + aw, fy + 18); c.lineTo(ax + aw + 3, fy + 32); c.lineTo(ax + 3, fy + 32); c.closePath(); c.fill();
              }
            }
          } else {
            /* a house door with a fanlight and two ground-floor windows */
            var dc = doors[(i + 2) % doors.length], dx = x0 + w * 0.5 - 12;
            c.fillStyle = css(mix(P.gold, P.bg, 0.25), 0.9);
            c.beginPath(); c.arc(dx + 12, base - 56, 12, Math.PI, TAU); c.fill();
            c.fillStyle = css(mix(dc, P.bg, 0.3)); c.fillRect(dx, base - 56, 24, 52);
            c.strokeStyle = chalk; c.lineWidth = 1.8; c.strokeRect(dx, base - 56, 24, 52);
            c.beginPath(); c.arc(dx + 12, base - 56, 12, Math.PI, TAU); c.stroke();
            c.fillStyle = css(P.gold); c.beginPath(); c.arc(dx + 18, base - 30, 1.8, 0, TAU); c.fill();
            [x0 + 12, x1 - 34].forEach(function (wx) {
              var lit = r() < 0.5;
              c.fillStyle = lit ? css(mix(P.gold, P.bg, 0.2), 0.95) : css(mix(P.bg, P.cobalt, 0.3));
              c.fillRect(wx, base - 62, 22, 36);
              c.strokeStyle = chalk; c.strokeRect(wx, base - 62, 22, 36);
              c.beginPath(); c.moveTo(wx, base - 44); c.lineTo(wx + 22, base - 44); c.stroke();
            });
            c.fillStyle = css(mix(P.bg, P.ink, 0.3)); c.fillRect(dx - 4, base - 4, 32, 4);
          }
        });
        chalkify(L.cv, 0.28);
        return L;
      }

      /* Footpath, kerb, gas lamps, a pillar box and cobbled setts. */
      function paintNear() {
        var L = makeLayer(1680, -42, ROAD + 12), c = L.c, r = seeded(2024), T = L.tileU;
        c.fillStyle = css(mix(P.bg, P.ink, 0.16)); c.fillRect(0, -40, T, 17);
        c.strokeStyle = css(P.ink, 0.22); c.lineWidth = 1.2;
        c.beginPath();
        for (var fx = 0; fx < T; fx += 56) { c.moveTo(fx, -40); c.lineTo(fx - 8, -23); }
        c.moveTo(0, -31.5); c.lineTo(T, -31.5);
        c.stroke();
        c.fillStyle = css(mix(P.bg, P.ink, 0.34)); c.fillRect(0, -23, T, 9);
        c.strokeStyle = css(P.ink, 0.5); c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(0, -23); c.lineTo(T, -23); c.stroke();
        c.strokeStyle = css(P.bg, 0.6); c.lineWidth = 1.2;
        c.beginPath();
        for (var kx = 30; kx < T; kx += 70) { c.moveTo(kx, -23); c.lineTo(kx, -14); }
        c.stroke();
        c.fillStyle = css(mix(P.bg, P.ink, 0.05)); c.fillRect(0, -14, T, ROAD + 40);
        /* setts get bigger as they come towards you */
        var rowsH = [6, 7, 8, 9, 10, 11, 12, 14, 15], y = -14;
        rowsH.forEach(function (rh, ri) {
          var sx = (ri % 2) * rh * 1.1 - rh;
          while (sx < T) {
            var sw = rh * (1.7 + r() * 0.7);
            var tint = mix(P.bg, P.ink, 0.09 + r() * 0.07);
            [0, -T].forEach(function (off) {
              c.fillStyle = css(tint);
              c.beginPath();
              var x0 = sx + off + 1, y0 = y + 1, w = sw - 2, hh = rh - 2, rr = Math.min(3, rh / 3);
              c.moveTo(x0 + rr, y0); c.lineTo(x0 + w - rr, y0); c.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + rr);
              c.lineTo(x0 + w, y0 + hh - rr); c.quadraticCurveTo(x0 + w, y0 + hh, x0 + w - rr, y0 + hh);
              c.lineTo(x0 + rr, y0 + hh); c.quadraticCurveTo(x0, y0 + hh, x0, y0 + hh - rr);
              c.lineTo(x0, y0 + rr); c.quadraticCurveTo(x0, y0, x0 + rr, y0); c.closePath();
              c.fill();
            });
            sx += sw;
          }
          y += rh;
        });
        /* the worn track where wheels and hoops roll */
        c.fillStyle = css(P.ink, 0.04); c.fillRect(0, -3, T, 7);
        chalkify(L.cv, 0.3, true);
        return L;
      }
      /* Sprites drawn where they stand on the footpath: a gas lamp with its glow, and a red pillar box. */
      function sprite(x0, y0, x1, y1, paint, rub) {
        var s = scale * dpr, cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.ceil((x1 - x0) * s)); cv.height = Math.max(1, Math.ceil((y1 - y0) * s));
        var c = cv.getContext('2d');
        c.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
        c.lineCap = 'round'; c.lineJoin = 'round';
        paint(c);
        if (rub) chalkify(cv, rub);
        return { cv: cv, x0: x0, y0: y0 };
      }
      function paintLamp() {
        return sprite(-96, -272, 96, -18, function (c) {
          var glow = c.createRadialGradient(0, -176, 4, 0, -176, 95);
          glow.addColorStop(0, css(P.gold, 0.38));
          glow.addColorStop(1, css(P.gold, 0));
          c.fillStyle = glow; c.fillRect(-95, -271, 190, 190);
          c.fillStyle = css(P.gold, 0.08);
          c.beginPath(); c.ellipse(0, -30, 70, 9, 0, 0, TAU); c.fill();
          c.fillStyle = css(mix(P.bg, P.ink, 0.12)); c.strokeStyle = css(P.ink, 0.7); c.lineWidth = 1.8;
          c.beginPath(); c.moveTo(-9, -20); c.lineTo(-6, -34); c.lineTo(-3.5, -160); c.lineTo(3.5, -160); c.lineTo(6, -34); c.lineTo(9, -20); c.closePath(); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(-16, -152); c.lineTo(16, -152); c.stroke();
          c.fillStyle = css(mix(P.gold, P.ink, 0.25));
          c.beginPath(); c.moveTo(-9, -166); c.lineTo(-12, -186); c.lineTo(12, -186); c.lineTo(9, -166); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = css(mix(P.bg, P.ink, 0.12));
          c.beginPath(); c.moveTo(-15, -186); c.lineTo(0, -198); c.lineTo(15, -186); c.closePath(); c.fill(); c.stroke();
          c.fillRect(-4, -166, 8, 6);
        }, 0.18);
      }
      function paintPillarBox() {
        return sprite(-15, -88, 15, -18, function (c) {
          c.fillStyle = css(P.vermilion); c.strokeStyle = css(P.ink, 0.7); c.lineWidth = 1.6;
          c.beginPath(); c.moveTo(-11, -22); c.lineTo(-11, -72); c.quadraticCurveTo(0, -84, 11, -72); c.lineTo(11, -22); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = css(P.bg, 0.8); c.fillRect(-6, -62, 12, 2.5);
          c.fillStyle = css(mix(P.vermilion, P.bg, 0.4)); c.fillRect(-13, -26, 26, 5);
        }, 0.15);
      }

      /* ---------- game state ---------- */
      var phase = 'title';           /* title, playing, paused, falling, over */
      var Lp = null;                 /* settings for the current level */
      var level = 0;
      var hoopX = 0, hoopY = 0, vy = 0, speed = 0, rot = 0, onGround = true, wobble = 0, wobPh = 0;
      var kidX = 0, kidV = 0, kidY = 0, kidVy = 0, kidPh = 0;
      var startX = 0, yards = 0, lastMile = 0, passedBest = false;
      var obstacles = [], nextSpawn = 0, spawnCount = 0;
      var swing = { on: false, t: 0, hit: false, queued: false };
      var jumpBuf = 0;
      var particles = [], floaters = [], banners = [];
      var fall = null, reason = '';
      var shake = 0, hitGlow = 0, clock = 0, frameNo = 0;
      var soundQ = [];
      var prev = { hoopX: 0, hoopY: 0, kidX: 0, kidY: 0, speed: 0 };
      var stats = { jumps: 0, cleared: 0, strikes: 0 };
      var runRand = Math.random;
      var lastResult = null;
      var hintTime = 0, firstRun = true, readyAt = 0;
      var lastDom = 0;

      function makeLevel(d, k) {
        k = Math.min(k, 8);
        var lo = d.lo + 10 * k, hi = d.hi + 4 * k;
        if (hi - lo < 95) hi = lo + 95;
        return { lo: lo, hi: hi, a0: d.a0 + 2.5 * k, a1: d.a1, boost: d.boost + 2 * k, gapMin: Math.max(6, d.gap[0] * (1 - 0.07 * k)),
          gapMax: Math.max(9, d.gap[1] * (1 - 0.07 * k)), runaway: d.runaway, wob: d.wob + 0.03 * k, rut: d.rut, puddle: d.puddle };
      }

      function resetWorld() {
        Lp = makeLevel(DIFFS[diff], 0);
        level = 0;
        startX = 0;
        hoopX = startX; hoopY = 0; vy = 0; speed = 0; rot = 0; onGround = true; wobble = 0; wobPh = 0;
        kidX = hoopX - IDEAL_GAP; kidV = 0; kidY = 0; kidVy = 0; kidPh = 0;
        yards = 0; lastMile = 0; passedBest = false;
        obstacles = []; nextSpawn = startX + 16 * YARD; spawnCount = 0;
        swing = { on: false, t: 0, hit: false, queued: false };
        jumpBuf = 0; particles = []; floaters = []; banners = []; fall = null; reason = ''; shake = 0; hitGlow = 0;
        soundQ = [];
        stats = { jumps: 0, cleared: 0, strikes: 0 };
        savePrev();
      }
      function savePrev() { prev.hoopX = hoopX; prev.hoopY = hoopY; prev.kidX = kidX; prev.kidY = kidY; prev.speed = speed; }

      /* ---------- obstacles ---------- */
      function spawnObstacles() {
        while (nextSpawn < hoopX + viewW + 700) {
          var kind;
          if (spawnCount === 0) kind = 'puddle';
          else if (spawnCount === 1) kind = 'parcel';
          else {
            var pool = level < 1 ? ['puddle', 'parcel', 'dog', 'puddle', 'parcel', 'ruts'] : ['puddle', 'parcel', 'dog', 'ruts', 'dog', 'parcel'];
            kind = pool[Math.floor(runRand() * pool.length)];
          }
          var o = { kind: kind, x: nextSpawn, w: 40, h: 0, solid: false, hit: false, done: false, kidHop: false, t: runRand() * 10, awake: 0, kx: 0, kr: 0, kv: 0 };
          if (kind === 'puddle') { o.w = lerp(Lp.puddle[0], Lp.puddle[1], runRand()); }
          else if (kind === 'ruts') { o.w = 48 + runRand() * 14; }
          else if (kind === 'parcel') { o.w = 34 + runRand() * 8; o.h = 26 + runRand() * 6; o.solid = true; }
          else { o.w = 58 + runRand() * 8; o.h = 21; o.solid = true; }
          obstacles.push(o);
          spawnCount++;
          var gapYd = lerp(Lp.gapMin, Lp.gapMax, runRand());
          nextSpawn += o.w + gapYd * YARD;
        }
        while (obstacles.length && obstacles[0].x + obstacles[0].w < kidX - viewW) obstacles.shift();
      }
      function hitsSolid(o) {
        var cx = hoopX, cy = hoopY - R;
        var nx = clamp(cx, o.x + 3, o.x + o.w - 3), ny = clamp(cy, -o.h + 3, 0);
        var dx = cx - nx, dy = cy - ny;
        return dx * dx + dy * dy < (R - 2) * (R - 2);
      }
      function nextObstacle() {
        for (var i = 0; i < obstacles.length; i++) { var o = obstacles[i]; if (o.x + o.w > hoopX - R && !o.done) return o; }
        return null;
      }

      /* ---------- effects ---------- */
      function dust(x, y, n, col, spread, up) {
        for (var i = 0; i < n && particles.length < 140; i++) {
          particles.push({ x: x, y: y, vx: (runRand() - 0.5) * (spread || 160), vy: -runRand() * (up || 140) - 20, life: 0, max: 0.35 + runRand() * 0.35, r: 1.5 + runRand() * 2.5, c: col, g: 500 });
        }
      }
      function floater(x, y, text, col, size) { floaters.push({ x: x, y: y, text: text, c: col, life: 0, max: 1.1, size: size || 18 }); if (floaters.length > 8) floaters.shift(); }
      function banner(text, col) { banners.push({ text: text, c: col || P.gold, life: 0, max: 1.6 }); if (banners.length > 2) banners.shift(); }
      function queueSound(delay, name, f) { soundQ.push({ at: clock + delay, name: name, f: f }); }
      function bark() { tone(560, 0.07, 'square', 0.1); queueSound(0.13, null, function () { tone(470, 0.1, 'square', 0.1); }); }

      /* ---------- the run ---------- */
      function start() {
        if (destroyed) return;
        resetWorld();
        runRand = api.random || Math.random;
        phase = 'playing';
        speed = (Lp.lo + Lp.hi) / 2;
        kidV = speed;
        hintTime = firstRun ? 7 : 0;
        firstRun = false;
        spawnObstacles();
        ov.hidden = true;
        stage.classList.add('is-playing');
        setButtons();
        distEl.textContent = '0';
        api.sound('whoosh');
        banner('Go!', P.gold);
        setStatus('Strike the hoop to keep the needle in the green. Jump with Up or a swipe up.');
        try { canvas.focus({ preventScroll: true }); } catch (e) { /* old browsers */ }
        startLoop();
      }
      function pause() {
        if (phase !== 'playing') return;
        phase = 'paused';
        stopLoop();
        stage.classList.remove('is-playing');
        setButtons();
        showOverlay('paused');
        setStatus('Paused at ' + yards + ' yards. Press Resume to carry on.');
      }
      function resume() {
        if (phase !== 'paused') return;
        phase = 'playing';
        ov.hidden = true;
        stage.classList.add('is-playing');
        setButtons();
        setStatus('Strike the hoop to keep the needle in the green.');
        try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        startLoop();
      }
      function stopRun() {
        if (phase === 'playing' || phase === 'paused' || phase === 'falling') { if (phase !== 'falling') reason = 'stopped'; finishRun(); }
      }
      function strike() {
        if (phase !== 'playing') return;
        if (swing.on) { swing.queued = true; return; }
        swing.on = true; swing.t = 0; swing.hit = false; swing.queued = false;
      }
      function contact() {
        var gap = hoopX - kidX;
        if (gap <= IDEAL_GAP + REACH) {
          speed += Lp.boost;
          wobble = Math.max(0, wobble - 0.1);
          stats.strikes++;
          hitGlow = 0.14;
          dust(hoopX - R, hoopY - R, 7, P.ink, 120, 90);
          api.sound('tick');
          tone(220 + speed * 0.75, 0.07, 'triangle', 0.07);
        } else {
          api.sound('whoosh');
          floater(kidX + 40, kidY - 92, 'Too far!', P.vermilion, 15);
        }
      }
      function tryJump() {
        if (phase !== 'playing') return;
        if (onGround) doJump(); else jumpBuf = 0.14;
      }
      function doJump() {
        onGround = false; jumpBuf = 0; vy = -JUMP_V; hoopY = -0.01;
        stats.jumps++;
        api.sound('pop');
        dust(hoopX, 0, 6, P.ink, 140, 60);
      }
      function land() {
        hoopY = 0; vy = 0; onGround = true;
        api.sound('tick');
        dust(hoopX, 0, 5, P.ink, 160, 50);
        if (jumpBuf > 0) doJump();
      }
      function crash(why, o) {
        if (phase !== 'playing') return;
        phase = 'falling';
        reason = why;
        stage.classList.remove('is-playing');
        setButtons();
        fall = { t: 0, th0: Math.min(0.5, wobble * 0.5), theta: 0, phi: 0, p: 0, slaps: 0 };
        if (!reduced) shake = 0.45;
        if (why === 'dog' && o) { o.awake = 0.001; bark(); speed = -60; api.sound('thud'); }
        else if (why === 'parcel' && o) { o.kv = Math.max(140, speed * 0.6); o.kr = 0; speed = -50; api.sound('thud'); }
        else if (why === 'fast') { api.sound('whoosh'); }
        if (why !== 'slow' && why !== 'fast') dust(hoopX + R * 0.6, -R, 10, P.ink, 220, 160);
        swing.on = false;
        banner({ slow: 'Too slow!', fast: 'Too fast!', dog: 'Woof!', parcel: 'Crash!' }[why] || 'Crash!', P.vermilion);
        setStatus(why === 'fast' ? 'Too fast! The hoop got away from you.' : why === 'slow' ? 'Too slow! The hoop is falling over.' : why === 'dog' ? 'Woof! You woke a sleeping dog.' : 'Crash! You hit a dropped parcel.');
      }
      function finishRun() {
        stopLoop();
        phase = 'over';
        stage.classList.remove('is-playing');
        setButtons();
        var dist = Math.max(0, Math.floor(yards));
        var prevBest = bestFor(diff);
        var isBest = dist > prevBest && dist >= 10;
        if (dist > prevBest) { bests[diff] = dist; api.store.set('best', bests); }
        lastResult = { yards: dist, reason: reason || 'stopped', isBest: isBest, prevBest: prevBest };
        bestEl.textContent = String(bestFor(diff));
        distEl.textContent = String(dist);
        if (lastResult.reason !== 'stopped' && !isBest) api.sound('lose');
        showOverlay('over');
        var msg = reasonText(lastResult.reason) + ' ' + dist + (dist === 1 ? ' yard. ' : ' yards. ');
        if (isBest) { msg += 'A new best on ' + DIFFS[diff].label + '!'; api.celebrate('New best: ' + dist + ' yards!'); }
        else msg += 'Best on ' + DIFFS[diff].label + ': ' + bestFor(diff) + ' yards. Press Play again.';
        setStatus(msg);
        readyAt = performance.now() + 800;
        render(1);
      }
      function reasonText(r) {
        return { slow: 'Too slow: your hoop wobbled and fell over after', fast: 'Too fast: the hoop ran away from you after', dog: 'Woof! You woke a sleeping dog after',
          parcel: 'Crash! You hit a dropped parcel after', stopped: 'You stopped after' }[r] || 'Your run ended after';
      }

      /* ---------- physics: one fixed step ---------- */
      function step(dt) {
        clock += dt;
        for (var i = soundQ.length - 1; i >= 0; i--) {
          if (clock >= soundQ[i].at) { var q = soundQ.splice(i, 1)[0]; if (q.f) q.f(); else if (q.name) api.sound(q.name); }
        }
        if (phase === 'playing') stepPlay(dt);
        else if (phase === 'falling') stepFall(dt);
        stepEffects(dt);
      }

      function stepPlay(dt) {
        if (hintTime > 0) hintTime -= dt;
        if (swing.on) {
          swing.t += dt;
          if (!swing.hit && swing.t >= SWING_HIT) { swing.hit = true; contact(); }
          if (swing.t >= SWING_END) { swing.on = false; if (swing.queued) { swing.queued = false; strike(); } }
        }
        if (jumpBuf > 0) jumpBuf -= dt;
        /* rolling resistance slows the hoop; there is a little less drag in the air */
        var decel = (Lp.a0 + Lp.a1 * speed) * (onGround ? 1 : 0.35);
        speed = Math.max(0, speed - decel * dt);
        hoopX += speed * dt;
        rot += speed * dt / R;
        if (!onGround) {
          vy += GRAV * dt; hoopY += vy * dt;
          if (hoopY >= 0) land();
        }
        /* below the sweet zone the hoop starts to wobble; a wobble that reaches 1 topples it */
        if (speed < Lp.lo) wobble += Lp.wob * (1 + 2.2 * (Lp.lo - speed) / Lp.lo) * dt;
        else wobble -= 0.5 * dt;
        wobble = clamp(wobble, 0, 1.05);
        wobPh += dt * (5 + 7 * wobble);
        if (wobble >= 1 || speed < 30) { crash('slow'); return; }
        /* the child runs to stay just behind the hoop, but cannot run faster than the top of the sweet zone */
        var gap = hoopX - kidX;
        kidV = clamp(speed + (gap - IDEAL_GAP) * 5, 0, Lp.hi + 8);
        kidX += kidV * dt;
        kidPh += kidV * dt / 30;
        if (kidY < 0 || kidVy < 0) { kidVy += GRAV * dt; kidY += kidVy * dt; if (kidY >= 0) { kidY = 0; kidVy = 0; } }
        gap = hoopX - kidX;
        if (gap > IDEAL_GAP + Lp.runaway) { crash('fast'); return; }
        spawnObstacles();
        for (var i = 0; i < obstacles.length; i++) {
          var o = obstacles[i];
          o.t += dt;
          if (!o.kidHop && kidX + 22 > o.x - 10 && kidX < o.x + o.w) { o.kidHop = true; if (kidY >= 0) kidVy = -Math.sqrt(2 * GRAV * 26); kidY = Math.min(kidY, -0.01); }
          if (o.done) continue;
          if (o.solid) {
            if (hitsSolid(o)) { o.hit = true; o.done = true; crash(o.kind, o); return; }
          } else if (onGround && hoopX > o.x + 4 && hoopX < o.x + o.w - 4) {
            o.hit = true; o.done = true;
            if (o.kind === 'puddle') {
              speed *= 0.62; wobble = Math.min(0.95, wobble + 0.25);
              api.sound('flip');
              for (var s = 0; s < 14 && particles.length < 140; s++) particles.push({ x: hoopX, y: -2, vx: (runRand() - 0.3) * 260, vy: -80 - runRand() * 220, life: 0, max: 0.5 + runRand() * 0.3, r: 2 + runRand() * 2.5, c: P.peacock, g: 900 });
              floater(hoopX, -80, 'Splash!', P.peacock);
            } else {
              speed *= 0.86; wobble = Math.min(0.97, wobble + Lp.rut);
              vy = -150; onGround = false; hoopY = -0.01;
              api.sound('thud');
              floater(hoopX, -80, 'Bump!', P.gold);
            }
          }
          if (!o.done && hoopX - R > o.x + o.w) {
            o.done = true; stats.cleared++;
            if (o.solid || o.kind === 'puddle') { floater(o.x + o.w / 2, -o.h - 52, 'Clear!', P.leaf, 16); api.sound('click'); }
          }
        }
        /* distance, milestones and levels */
        yards = Math.max(0, Math.floor((hoopX - startX) / YARD));
        if (yards >= lastMile + 50) {
          lastMile += 50;
          api.sound('coin');
          floater(hoopX, -96, lastMile + ' yards', P.gold, 20);
        }
        var nl = Math.floor(yards / 100);
        if (nl > level) {
          level = nl; Lp = makeLevel(DIFFS[diff], level);
          api.sound('bell');
          banner('Level ' + (level + 1) + '!', P.gold);
          setStatus(yards + ' yards! Level ' + (level + 1) + ': the street is getting busier.');
        }
        var b = bestFor(diff);
        if (!passedBest && b >= 10 && yards > b) {
          passedBest = true;
          api.sound('bell');
          banner('New best!', P.leaf);
          setStatus('New best! Keep it rolling.');
        }
      }

      function stepFall(dt) {
        var f = fall;
        f.t += dt;
        speed = speed > 0 ? Math.max(0, speed - 520 * dt) : Math.min(0, speed + 260 * dt);
        hoopX += speed * dt;
        if (!onGround) { vy += GRAV * dt; hoopY += vy * dt; if (hoopY >= 0) { hoopY = 0; vy = 0; onGround = true; } }
        kidV = Math.max(0, kidV - 700 * dt);
        if (kidX > hoopX - IDEAL_GAP + 10) kidV = 0;
        kidX += kidV * dt; kidPh += kidV * dt / 30;
        if (kidY < 0 || kidVy < 0) { kidVy += GRAV * dt; kidY += kidVy * dt; if (kidY >= 0) { kidY = 0; kidVy = 0; } }
        obstacles.forEach(function (o) {
          if (o.kv) { o.kx += o.kv * dt; o.kr += o.kv * dt / 40; o.kv = Math.max(0, o.kv - 500 * dt); }
          if (o.awake) o.awake += dt;
          o.t += dt;
        });
        /* the hoop topples, then clatters like a spinning coin as it settles flat */
        var half = Math.PI / 2;
        if (f.t < 0.42) {
          var u = f.t / 0.42;
          f.theta = f.th0 + (half - 0.2 - f.th0) * u * u;
        } else {
          var u2 = f.t - 0.42;
          var before = Math.floor(f.p / TAU);
          f.p += TAU * (3 + 11 * u2) * dt;
          var amp = 0.2 * Math.exp(-3 * u2);
          f.theta = half - amp * Math.abs(Math.sin(f.p / 2));
          if (f.slaps === 0) { f.slaps = 1; api.sound('clack'); dust(hoopX, 0, 6, P.ink, 200, 60); }
          else if (Math.floor(f.p / TAU) > before && amp > 0.03 && f.slaps < 8) { f.slaps++; api.sound('clack'); }
        }
        f.phi += dt * (2 + 22 * Math.pow(f.theta / half, 4)) * (1 - clamp((f.t - 1.2) / 0.4, 0, 1));
        if (f.t >= 1.75) finishRun();
      }

      function stepEffects(dt) {
        for (var i = particles.length - 1; i >= 0; i--) {
          var p = particles[i];
          p.life += dt;
          if (p.life >= p.max) { particles.splice(i, 1); continue; }
          p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.y > 4) { p.y = 4; p.vy *= -0.3; p.vx *= 0.6; }
        }
        for (var j = floaters.length - 1; j >= 0; j--) { floaters[j].life += dt; if (floaters[j].life >= floaters[j].max) floaters.splice(j, 1); }
        for (var k = banners.length - 1; k >= 0; k--) { banners[k].life += dt; if (banners[k].life >= banners[k].max) banners.splice(k, 1); }
        if (shake > 0) shake = Math.max(0, shake - dt);
        if (hitGlow > 0) hitGlow = Math.max(0, hitGlow - dt);
      }

      /* ---------- the loop: fixed steps timed with performance.now() ---------- */
      var raf = 0, last = 0, acc = 0;
      function frame() {
        raf = 0;
        if (destroyed || (phase !== 'playing' && phase !== 'falling')) return;
        var now = performance.now();
        var dt = (now - last) / 1000;
        last = now;
        if (dt > 0.25) dt = 0.25;
        if (dt < 0) dt = 0;
        acc += dt;
        var n = 0;
        while (acc >= STEP && n < 40) {
          savePrev();
          step(STEP);
          acc -= STEP; n++;
          if (phase !== 'playing' && phase !== 'falling') break;
        }
        if (phase === 'over' || phase === 'paused' || destroyed) return;
        render(acc / STEP);
        if (now - lastDom > 100) { lastDom = now; distEl.textContent = String(yards); }
        if (phase === 'playing' || phase === 'falling') raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        if (raf || destroyed) return;
        last = performance.now(); acc = 0;
        raf = requestAnimationFrame(frame);
      }
      function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

      /* ---------- drawing ---------- */
      function render(alpha) {
        if (!cssW || !layers || destroyed) return;
        var a = phase === 'playing' || phase === 'falling' ? clamp(alpha, 0, 1) : 1;
        var hx = lerp(prev.hoopX, hoopX, a), hy = lerp(prev.hoopY, hoopY, a);
        var kx = lerp(prev.kidX, kidX, a), ky = lerp(prev.kidY, kidY, a);
        var sp = lerp(prev.speed, speed, a);
        var camX = kx - viewW * 0.1 - 14;
        var s = scale * dpr;
        var shx = 0, shy = 0;
        if (shake > 0 && !reduced) { var m = shake * 14 * dpr; shx = (Math.random() - 0.5) * m; shy = (Math.random() - 0.5) * m * 0.6; }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        if (shx || shy) { ctx.fillStyle = css(P.bg); ctx.fillRect(0, 0, canvas.width, canvas.height); }
        drawLayer(layers.far, camX * 0.18, shx, shy);
        ctx.drawImage(layers.moon.cv, layers.moon.x + shx, layers.moon.y + shy);
        drawLayer(layers.mid, camX * 0.5, shx, shy);
        drawLayer(layers.near, camX, shx, shy);
        drawSprites(layers.lamp, 420, 210, camX, shx, shy);
        drawSprites(layers.box, 1680, 840, camX, shx, shy);
        ctx.imageSmoothingEnabled = true;
        ctx.setTransform(s, 0, 0, s, -camX * s + shx, groundY * dpr + shy);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (var i = 0; i < obstacles.length; i++) {
          var o = obstacles[i];
          if (o.x + o.w + 60 < camX || o.x - 60 > camX + viewW) continue;
          drawObstacle(o);
        }
        drawShadow(kx + 4, 22);
        drawShadow(hx, R * 0.9 * (1 - clamp(-hy / 160, 0, 0.6)));
        drawKid(kx, ky, hx, hy);
        var theta, phi;
        if (fall && (phase === 'falling' || phase === 'over')) { theta = fall.theta; phi = fall.phi; }
        else { theta = wobble * 0.62 * Math.sin(wobPh); phi = wobble * 0.35 * Math.sin(wobPh * 0.5 + 1); }
        drawHoop(hx, hy, theta, phi, rot);
        drawParticles();
        drawFloaters();
        if (phase === 'playing') drawIncoming(camX);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawHud(sp);
        frameNo++;
        publishState(hx, sp);
      }
      function drawLayer(L, off, shx, shy) {
        var x = Math.round(-((((off * L.sx) % L.px) + L.px) % L.px) + shx), y = Math.round(L.y0 + shy);
        while (x < canvas.width) { ctx.drawImage(L.cv, x, y); x += L.px; }
      }
      function drawSprites(sp, every, first, camX, shx, shy) {
        var s = scale * dpr, k = Math.floor((camX - first + sp.x0) / every);
        for (var x = first + k * every; x + sp.x0 < camX + viewW; x += every) {
          ctx.drawImage(sp.cv, Math.round((x + sp.x0 - camX) * s + shx), Math.round(groundY * dpr + sp.y0 * s + shy));
        }
      }
      function drawShadow(x, w) {
        ctx.fillStyle = css(P.bg, 0.5);
        ctx.beginPath(); ctx.ellipse(x, 2, w, 4.5, 0, 0, TAU); ctx.fill();
      }

      function drawHoop(x, y, theta, phi, angle) {
        var cy = y - R * Math.cos(theta);
        var px = Math.cos(theta) * Math.sin(phi), py = -Math.sin(theta), pz = Math.cos(theta) * Math.cos(phi);
        var ry = Math.max(0.6, R * Math.abs(pz));
        var rotE = (Math.abs(px) + Math.abs(py) < 1e-5) ? 0 : Math.atan2(px, -py);
        var dark = mix(P.gold, P.bg, 0.55);
        if (hitGlow > 0 && !reduced) { ctx.strokeStyle = css(P.ink, hitGlow * 3); ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(x, cy, R, ry, rotE, 0, TAU); ctx.stroke(); }
        ctx.lineWidth = 6.5; ctx.strokeStyle = css(P.gold);
        ctx.beginPath(); ctx.ellipse(x, cy, R, ry, rotE, 0, TAU); ctx.stroke();
        ctx.lineWidth = 1.6; ctx.strokeStyle = css(dark);
        ctx.beginPath(); ctx.ellipse(x, cy, R - 3.3, Math.max(0.4, ry - 3.3 * ry / R), rotE, 0, TAU); ctx.stroke();
        ctx.strokeStyle = css(P.ink, 0.55); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(x, cy, R + 3.1, ry + 3.1 * ry / R, rotE, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
        /* tin rattles nailed inside the hoop: they show it turning */
        var cr = Math.cos(rotE), sr = Math.sin(rotE);
        ctx.fillStyle = css(mix(P.ink, P.bg, 0.25));
        for (var k = 0; k < 4; k++) {
          var t = angle + k * Math.PI / 2;
          var lx = Math.cos(t) * (R - 7), ly = Math.sin(t) * (R - 7) * (ry / R);
          var qx = x + lx * cr - ly * sr, qy = cy + lx * sr + ly * cr;
          ctx.fillRect(qx - 2.6, qy - 2.6, 5.2, 5.2);
        }
      }

      function limb(x1, y1, x2, y2, x3, y3) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); if (x3 != null) ctx.lineTo(x3, y3); ctx.stroke(); }
      function drawKid(x, y, hx, hy) {
        var running = (phase === 'playing' || phase === 'falling') && kidV > 5;
        var ph = kidPh;
        var bob = running ? Math.abs(Math.sin(ph)) * 3 : 0;
        var hipX = x, hipY = y - 46 - bob;
        var lean = running ? 7 : 2;
        var nkX = x + lean, nkY = y - 76 - bob;
        var hdX = x + lean + 3, hdY = y - 88 - bob;
        var chalk = css(P.ink), far = css(mix(P.ink, P.bg, 0.4));
        function leg(side, col) {
          var a = running ? Math.sin(ph + side * Math.PI) * 0.72 : (side ? -0.12 : 0.1);
          var kneeX = hipX + Math.sin(a) * 23, kneeY = hipY + Math.cos(a) * 23;
          var bend = running ? Math.max(0, Math.sin(ph + side * Math.PI + 1.3)) * 1.25 : 0.05;
          var sa = a - bend;
          var fX = kneeX + Math.sin(sa) * 23, fY = kneeY + Math.cos(sa) * 23;
          ctx.strokeStyle = col; ctx.lineWidth = 5.5;
          limb(hipX, hipY, kneeX, kneeY, fX, fY);
          ctx.fillStyle = css(mix(P.bg, P.ink, 0.15)); ctx.strokeStyle = col; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.ellipse(fX + 3, fY - 1, 6.5, 3.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
        }
        /* far arm, far leg */
        var shX = nkX - 1, shY = nkY + 5;
        var aa = running ? -Math.sin(ph) * 0.9 : 0.15;
        ctx.strokeStyle = far; ctx.lineWidth = 4.5;
        var elX = shX + Math.sin(aa) * 14, elY = shY + Math.cos(aa) * 14;
        limb(shX, shY, elX, elY, elX + Math.sin(aa + 0.9) * 12, elY + Math.cos(aa + 0.9) * 12);
        leg(1, far);
        /* scarf streaming behind */
        var flap = running ? Math.sin(clock * 14) * 4 : 0;
        ctx.strokeStyle = css(P.gold); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(nkX, nkY + 2);
        ctx.quadraticCurveTo(nkX - 12, nkY + 2 + flap, nkX - 22 - (running ? 6 : 0), nkY + 8 - flap);
        ctx.stroke();
        /* jacket */
        ctx.fillStyle = css(P.vermilion); ctx.strokeStyle = chalk; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(nkX - 7, nkY + 1); ctx.lineTo(nkX + 7, nkY + 1); ctx.lineTo(hipX + 9, hipY + 4); ctx.lineTo(hipX - 9, hipY + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = css(P.gold); ctx.beginPath(); ctx.arc(nkX + 2, nkY + 10, 1.4, 0, TAU); ctx.arc(nkX + 1, nkY + 17, 1.4, 0, TAU); ctx.fill();
        leg(0, chalk);
        /* head and cap */
        ctx.fillStyle = css(mix(P.ink, P.rose, 0.12)); ctx.strokeStyle = chalk; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(hdX, hdY, 9.5, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = css(P.bg); ctx.beginPath(); ctx.arc(hdX + 4.5, hdY - 1, 1.3, 0, TAU); ctx.fill();
        ctx.fillStyle = css(P.cobalt);
        ctx.beginPath(); ctx.moveTo(hdX - 10, hdY - 3); ctx.quadraticCurveTo(hdX - 6, hdY - 15, hdX + 4, hdY - 12); ctx.lineTo(hdX + 15, hdY - 5); ctx.lineTo(hdX + 2, hdY - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
        /* near arm with the stick */
        var sw = 0;
        if (swing.on) { var st = swing.t / SWING_END; sw = st < 0.35 ? st / 0.35 : 1 - (st - 0.35) / 0.65; }
        var hX = shX + 13 + sw * 15, hY = shY + 20 - sw * 3;
        ctx.strokeStyle = chalk; ctx.lineWidth = 4.5;
        limb(shX, shY, shX + 6 + sw * 8, shY + 12, hX, hY);
        var tx = hx - R - 1, ty = hy - R * 0.95;
        var dx = tx - hX, dy = ty - hY, dl = Math.sqrt(dx * dx + dy * dy) || 1;
        var len = clamp(dl - 3 + sw * 5, 22, 52);
        if (phase === 'title' || (phase === 'over' && reason === 'stopped')) { dx = 0.75; dy = 0.66; dl = 1; len = 44; }
        ctx.strokeStyle = css(mix(P.gold, P.bg, 0.4)); ctx.lineWidth = 3.4;
        limb(hX, hY, hX + dx / dl * len, hY + dy / dl * len);
        ctx.fillStyle = css(mix(P.ink, P.rose, 0.12));
        ctx.beginPath(); ctx.arc(hX, hY, 3.4, 0, TAU); ctx.fill();
      }

      function drawObstacle(o) {
        var x = o.x, w = o.w, cx = x + w / 2;
        var chalk = css(P.ink, 0.85);
        ctx.lineWidth = 1.8;
        if (o.kind === 'puddle') {
          ctx.fillStyle = css(mix(P.peacock, P.bg, 0.25), 0.85);
          ctx.beginPath(); ctx.ellipse(cx, 3, w / 2, 7.5, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = css(P.ink, 0.55); ctx.stroke();
          ctx.strokeStyle = css(P.ink, 0.45); ctx.lineWidth = 1.4;
          var rip = (o.t * 0.6) % 1;
          ctx.beginPath(); ctx.ellipse(cx - w * 0.12, 3, w * 0.18 * (0.4 + rip), 3 * (0.4 + rip), 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx + w * 0.12, 1); ctx.lineTo(cx + w * 0.3, 1); ctx.stroke();
          ctx.strokeStyle = css(P.gold, 0.5);
          ctx.beginPath(); ctx.moveTo(cx - w * 0.3, 5); ctx.lineTo(cx - w * 0.16, 5); ctx.stroke();
        } else if (o.kind === 'ruts') {
          ctx.fillStyle = css(mix(P.bg, P.goldShadow, 0.45), 0.9);
          ctx.beginPath(); ctx.ellipse(cx, 2, w / 2 + 6, 7, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = css(P.bg, 0.95); ctx.lineWidth = 5;
          limb(x + w * 0.22, -5, x + w * 0.1, 9);
          limb(x + w * 0.72, -5, x + w * 0.6, 9);
          ctx.strokeStyle = css(P.ink, 0.5); ctx.lineWidth = 1.3;
          limb(x + w * 0.3, -5, x + w * 0.18, 9);
          limb(x + w * 0.8, -5, x + w * 0.68, 9);
        } else if (o.kind === 'parcel') {
          ctx.save();
          ctx.translate(cx + o.kx, 0);
          if (o.kr) { ctx.translate(0, -o.h / 2); ctx.rotate(o.kr); ctx.translate(0, o.h / 2); }
          ctx.fillStyle = css(mix(P.gold, P.bg, 0.5)); ctx.strokeStyle = chalk;
          ctx.beginPath(); ctx.rect(-w / 2, -o.h, w, o.h); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = css(P.vermilion); ctx.lineWidth = 2;
          limb(0, -o.h, 0, 0);
          limb(-w / 2, -o.h / 2, w / 2, -o.h / 2);
          ctx.beginPath(); ctx.ellipse(-5, -o.h - 4, 5, 3.2, -0.4, 0, TAU); ctx.ellipse(5, -o.h - 4, 5, 3.2, 0.4, 0, TAU); ctx.stroke();
          ctx.restore();
        } else {
          drawDog(o);
        }
      }
      function drawDog(o) {
        var x = o.x, w = o.w, chalk = css(P.ink, 0.9);
        var coat = css(mix(P.ink, P.goldShadow, 0.35)), patch = css(mix(P.goldShadow, P.bg, 0.25));
        ctx.lineWidth = 1.8; ctx.strokeStyle = chalk;
        if (!o.awake) {
          var breathe = Math.sin(o.t * 2.4) * 1.2;
          ctx.fillStyle = coat;
          ctx.beginPath(); ctx.ellipse(x + w * 0.56, -o.h * 0.5, w * 0.42, o.h * 0.5 + breathe * 0.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = patch; ctx.beginPath(); ctx.ellipse(x + w * 0.62, -o.h * 0.72, w * 0.16, o.h * 0.2, 0.2, 0, TAU); ctx.fill();
          ctx.fillStyle = coat;
          ctx.beginPath(); ctx.arc(x + w * 0.17, -o.h * 0.42, o.h * 0.42, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = patch; ctx.beginPath(); ctx.ellipse(x + w * 0.22, -o.h * 0.62, 4, 7, 0.6, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = css(P.bg); ctx.lineWidth = 1.4;
          limb(x + w * 0.08, -o.h * 0.45, x + w * 0.13, -o.h * 0.43);
          ctx.strokeStyle = chalk; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(x + w * 0.97, -o.h * 0.4); ctx.quadraticCurveTo(x + w * 1.08, -o.h * 0.9, x + w * 0.95, -o.h * 0.95); ctx.stroke();
          var zt = (o.t * 0.8) % 1;
          ctx.fillStyle = css(P.ink, 0.7);
          ctx.font = '700 ' + Math.round(9 + 3 * zt) + 'px ' + F.poster;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.globalAlpha = 1 - zt;
          ctx.fillText('z', x + w * 0.25 + zt * 8, -o.h - 6 - zt * 18);
          ctx.globalAlpha = 1;
          ctx.fillText('z', x + w * 0.38, -o.h - 22);
        } else {
          var j = Math.min(1, o.awake * 5), hop = Math.abs(Math.sin(o.awake * 12)) * 5 * (1 - Math.min(1, o.awake));
          var by = -o.h * 0.6 - 10 * j - hop;
          ctx.fillStyle = coat;
          ctx.lineWidth = 3; ctx.strokeStyle = chalk;
          limb(x + w * 0.35, by + 6, x + w * 0.32, 0); limb(x + w * 0.75, by + 6, x + w * 0.78, 0);
          ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.ellipse(x + w * 0.56, by, w * 0.36, o.h * 0.42, 0, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(x + w * 0.16, by - 12, o.h * 0.42, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = patch; ctx.beginPath(); ctx.ellipse(x + w * 0.22, by - 22, 4, 8, 0.3, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = css(P.bg); ctx.beginPath(); ctx.arc(x + w * 0.1, by - 14, 1.6, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(x + w * 0.02, by - 7, 4, 2.5, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = chalk; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(x + w * 0.9, by - 4); ctx.quadraticCurveTo(x + w * 1.05, by - 18 + Math.sin(o.awake * 30) * 5, x + w * 1.0, by - 24); ctx.stroke();
          if (o.awake < 1.6) {
            ctx.fillStyle = css(P.gold);
            ctx.font = '700 16px ' + F.poster;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('WOOF!', x - 8, by - 42 - o.awake * 10);
          }
        }
      }

      function drawParticles() {
        for (var i = 0; i < particles.length; i++) {
          var p = particles[i], k = 1 - p.life / p.max;
          ctx.fillStyle = css(p.c, 0.85 * k);
          ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
        }
      }
      function drawFloaters() {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (var i = 0; i < floaters.length; i++) {
          var f = floaters[i], k = f.life / f.max;
          ctx.font = '700 ' + f.size + 'px ' + F.poster;
          ctx.fillStyle = css(P.bg, 0.65 * (1 - k));
          ctx.fillText(f.text, f.x + 1.5, f.y - k * 34 + 1.5);
          ctx.fillStyle = css(f.c, 1 - k * k);
          ctx.fillText(f.text, f.x, f.y - k * 34);
        }
      }
      /* A chalk arrow at the right edge warns of an obstacle that is about to come into view. */
      function drawIncoming(camX) {
        var edge = camX + viewW;
        for (var i = 0; i < obstacles.length; i++) {
          var o = obstacles[i];
          if (o.x > edge && o.x < edge + 260) {
            var k = 1 - (o.x - edge) / 260, x = edge - 16;
            ctx.fillStyle = css(P.vermilion, 0.35 + 0.6 * k);
            ctx.beginPath(); ctx.moveTo(x + 10, -24); ctx.lineTo(x - 4, -34); ctx.lineTo(x - 4, -14); ctx.closePath(); ctx.fill();
            ctx.font = '700 18px ' + F.poster; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('!', x - 14, -24);
            break;
          }
        }
      }

      function roundRect(x, y, w, hh, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + hh - r); ctx.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh);
        ctx.lineTo(x + r, y + hh); ctx.quadraticCurveTo(x, y + hh, x, y + hh - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      }
      function drawHud(sp) {
        if (phase === 'title' || phase === 'over' || phase === 'paused') return;
        var playing = true;
        var gr = clamp(cssH * 0.1, 26, 54);
        var cx = 12 + gr + 8, cy = 12 + gr + 6;
        if (phase === 'playing') {
          ctx.fillStyle = css(P.bg, 0.72);
          roundRect(cx - gr - 10, cy - gr - 8, gr * 2 + 20, gr + 8 + gr * 0.62, 12); ctx.fill();
          var vmax = Lp.hi + 170;
          var ang = function (vv) { return Math.PI + Math.PI * clamp(vv / vmax, 0, 1); };
          ctx.lineWidth = gr * 0.26; ctx.lineCap = 'butt';
          ctx.strokeStyle = css(P.vermilion, 0.9); ctx.beginPath(); ctx.arc(cx, cy, gr * 0.82, Math.PI, ang(Lp.lo)); ctx.stroke();
          ctx.strokeStyle = css(P.leaf); ctx.beginPath(); ctx.arc(cx, cy, gr * 0.82, ang(Lp.lo), ang(Lp.hi)); ctx.stroke();
          ctx.strokeStyle = css(P.vermilion, 0.9); ctx.beginPath(); ctx.arc(cx, cy, gr * 0.82, ang(Lp.hi), TAU); ctx.stroke();
          ctx.lineCap = 'round';
          var na = ang(sp) + (wobble > 0.3 && !reduced ? Math.sin(clock * 40) * 0.04 * wobble : 0);
          ctx.strokeStyle = css(P.ink); ctx.lineWidth = Math.max(2.5, gr * 0.08);
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(na) * gr * 0.95, cy + Math.sin(na) * gr * 0.95); ctx.stroke();
          ctx.fillStyle = css(P.gold); ctx.beginPath(); ctx.arc(cx, cy, gr * 0.13, 0, TAU); ctx.fill();
          var word, col;
          var gap = hoopX - kidX;
          if (sp < Lp.lo) { word = wobble > 0.35 ? 'WOBBLY!' : 'TOO SLOW'; col = P.vermilion; }
          else if (sp > Lp.hi + 8 || gap > IDEAL_GAP + REACH) { word = 'TOO FAST'; col = P.vermilion; }
          else { word = 'JUST RIGHT'; col = P.leaf; }
          ctx.font = '700 ' + Math.round(clamp(gr * 0.3, 11, 16)) + 'px ' + F.mono;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = css(col);
          ctx.fillText(word, cx, cy + gr * 0.36);
        }
        /* distance, top right */
        var big = Math.round(clamp(cssH * 0.1, 26, 50));
        var tx = cssW - 14;
        ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
        ctx.font = '400 ' + big + 'px ' + F.display;
        var num = String(phase === 'title' ? 0 : yards);
        var nw = ctx.measureText(num).width;
        ctx.font = '700 ' + Math.round(big * 0.42) + 'px ' + F.mono;
        var uw = ctx.measureText(' yd').width;
        var sub = 'BEST ' + bestFor(diff) + (playing ? '  LV ' + (level + 1) : '');
        ctx.font = '700 ' + Math.round(clamp(big * 0.34, 11, 15)) + 'px ' + F.mono;
        var sw = ctx.measureText(sub).width;
        var boxW = Math.max(nw + uw, sw) + 22;
        ctx.fillStyle = css(P.bg, 0.72);
        roundRect(tx - boxW + 8, 8, boxW, big * 1.55 + 4, 12); ctx.fill();
        ctx.font = '700 ' + Math.round(big * 0.42) + 'px ' + F.mono;
        ctx.fillStyle = css(P.inkMuted);
        ctx.fillText(' yd', tx, 10 + big);
        ctx.font = '400 ' + big + 'px ' + F.display;
        ctx.fillStyle = css(P.gold);
        ctx.fillText(num, tx - uw, 10 + big);
        ctx.font = '700 ' + Math.round(clamp(big * 0.34, 11, 15)) + 'px ' + F.mono;
        ctx.fillStyle = css(P.inkMuted);
        ctx.fillText(sub, tx, 12 + big * 1.45);
        /* banners */
        for (var i = 0; i < banners.length; i++) {
          var b = banners[i], k = b.life / b.max;
          var size = Math.round(clamp(cssH * 0.11, 24, 56) * (reduced ? 1 : (k < 0.15 ? 0.7 + 2 * k : 1)));
          ctx.font = '700 ' + size + 'px ' + F.poster;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          var y = cssH * 0.36 - i * size * 1.1;
          ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
          ctx.fillStyle = css(P.bg, 0.8); ctx.fillText(b.text, cssW / 2 + 3, y + 3);
          ctx.fillStyle = css(b.c); ctx.fillText(b.text, cssW / 2, y);
          ctx.globalAlpha = 1;
        }
        /* coaching for the first run */
        if (phase === 'playing' && hintTime > 0) {
          var hint = hintTime > 3.5 ? 'Tap, click or Space: strike' : 'Swipe up or Up: jump';
          ctx.font = '700 ' + Math.round(clamp(cssH * 0.05, 13, 20)) + 'px ' + F.head;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          var hw = ctx.measureText(hint).width + 24, hy = cssH - Math.max(22, ROAD * scale * 0.5);
          ctx.fillStyle = css(P.bg, 0.78); roundRect(cssW / 2 - hw / 2, hy - 16, hw, 32, 16); ctx.fill();
          ctx.fillStyle = css(P.ink); ctx.fillText(hint, cssW / 2, hy + 1);
        }
        if (phase === 'playing' && speed < Lp.lo && (reduced || Math.sin(clock * 12) > -0.2)) {
          ctx.font = '700 ' + Math.round(clamp(cssH * 0.06, 14, 24)) + 'px ' + F.poster;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = css(P.bg, 0.8);
          var warn = wobble > 0.35 ? 'Strike! It is wobbling' : 'Strike!';
          ctx.fillText(warn, cssW / 2 + 2, cssH * 0.2 + 2);
          ctx.fillStyle = css(P.vermilion);
          ctx.fillText(warn, cssW / 2, cssH * 0.2);
        }
      }

      function publishState(hx, sp, force) {
        if (!force && frameNo % 2 && phase === 'playing') return;
        var o = nextObstacle();
        canvas.setAttribute('data-state', JSON.stringify({
          phase: phase, yards: yards, speed: Math.round(sp), lo: Lp ? Lp.lo : 0, hi: Lp ? Lp.hi : 0, wobble: +wobble.toFixed(2),
          gap: Math.round(hoopX - kidX), reach: IDEAL_GAP + REACH, onGround: onGround, level: level + 1, difficulty: diff,
          next: o ? { kind: o.kind, d: Math.round(o.x - hx), w: Math.round(o.w), h: Math.round(o.h) } : null,
          reason: reason, frame: frameNo, best: bestFor(diff), cleared: stats.cleared, jumps: stats.jumps
        }));
      }

      /* ---------- overlay, buttons and status ---------- */
      var lastStatus = '';
      function setStatus(t) { if (t !== lastStatus) { lastStatus = t; api.status(t); } }
      function setButtons() {
        var live = phase === 'playing' || phase === 'paused';
        pauseBtn.disabled = !live;
        stopBtn.disabled = !(live || phase === 'falling');
        pauseBtn.textContent = phase === 'paused' ? 'Resume' : 'Pause';
        strikeBtn.disabled = phase !== 'playing';
        jumpBtn.disabled = phase !== 'playing';
        if (Lp) publishState(hoopX, speed, true);
      }
      function diffSeg() {
        return h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' }, ORDER.map(function (k) {
          return h('button', { type: 'button', 'aria-pressed': String(k === diff), onclick: function () { setDiff(k); } }, DIFFS[k].label);
        }));
      }
      function setDiff(k) {
        if (!DIFFS[k] || phase === 'playing' || phase === 'falling') return;
        diff = k;
        api.store.set('difficulty', diff);
        api.sound('click');
        bestEl.textContent = String(bestFor(diff));
        Lp = makeLevel(DIFFS[diff], 0);
        showOverlay(phase === 'over' ? 'over' : 'title');
        var b = ov.querySelector('.seg button[aria-pressed="true"]');
        if (b) { try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
        render(1);
      }
      function goButton(label) {
        return h('button', { class: 'btn btn-primary hs-go', type: 'button', onclick: function () { if (performance.now() < readyAt) return; api.sound('click'); start(); } }, label);
      }
      function showOverlay(kind) {
        var kids = [];
        if (kind === 'title') {
          kids.push(h('p', { class: 'hs-kicker' }, 'The Schoolyard', h('span', { class: 'hs-msg2' }, ' · a Victorian street')));
          kids.push(h('h3', { class: 'hs-title' }, (api.content && api.content.title) || 'Hoop and Stick'));
          kids.push(h('p', { class: 'hs-msg' }, 'Strike the hoop to keep the needle in the green.'));
          kids.push(h('p', { class: 'hs-msg hs-msg2' }, 'Jump the puddles, parcels, sleeping dogs and cart ruts.'));
          kids.push(goButton('▶ Start'));
          kids.push(diffSeg());
          kids.push(h('p', { class: 'hs-best' }, 'Best on ' + DIFFS[diff].label + ': ' + bestFor(diff) + ' yards'));
        } else if (kind === 'paused') {
          kids.push(h('h3', { class: 'hs-title' }, 'Paused'));
          kids.push(h('p', { class: 'hs-big' }, String(yards), h('small', null, 'yards')));
          kids.push(h('div', { class: 'hs-row' },
            h('button', { class: 'btn btn-primary hs-go', type: 'button', onclick: function () { api.sound('click'); resume(); } }, '▶ Resume'),
            h('button', { class: 'btn', type: 'button', onclick: function () { stopRun(); } }, 'Stop')));
        } else {
          var r = lastResult || { yards: 0, reason: 'stopped', isBest: false };
          var head = { slow: 'It fell over!', fast: 'It ran away!', dog: 'Woof!', parcel: 'Crash!', stopped: 'Stopped' }[r.reason] || 'Run over';
          var why = { slow: 'Too slow: it wobbled and toppled', fast: 'Too fast: it got away from you', dog: 'You woke a sleeping dog', parcel: 'You hit a dropped parcel', stopped: 'You stopped the run' }[r.reason] || '';
          kids.push(h('p', { class: 'hs-kicker' }, why));
          kids.push(h('h3', { class: 'hs-title' }, head));
          kids.push(h('p', { class: 'hs-big' }, String(r.yards), h('small', null, r.yards === 1 ? 'yard' : 'yards')));
          kids.push(r.isBest ? h('p', { class: 'hs-ribbon' }, 'New best!') : h('p', { class: 'hs-best' }, 'Best on ' + DIFFS[diff].label + ': ' + bestFor(diff) + ' yards'));
          kids.push(goButton('▶ Play again'));
          kids.push(diffSeg());
        }
        ov.replaceChildren.apply(ov, kids);
        ov.hidden = false;
        if (kind !== 'title') {
          var b = ov.querySelector('.hs-go');
          if (b) { try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
        }
      }

      /* ---------- input ---------- */
      var ptr = null;
      function onDown(e) {
        if (phase !== 'playing') return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        try { canvas.focus({ preventScroll: true }); } catch (err2) { /* ignore */ }
        ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, swiped: false };
        strike();
      }
      function onMove(e) {
        if (!ptr || e.pointerId !== ptr.id || ptr.swiped) return;
        var dy = ptr.y - e.clientY, dx = Math.abs(e.clientX - ptr.x);
        if (dy > 24 && dy > dx) {
          ptr.swiped = true;
          if (swing.on && !swing.hit) { swing.on = false; swing.queued = false; }
          tryJump();
        }
      }
      function onUp(e) { if (ptr && e.pointerId === ptr.id) ptr = null; }
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
      strikeBtn.addEventListener('pointerdown', padPress(strike));
      strikeBtn.addEventListener('click', padPress(strike));
      jumpBtn.addEventListener('pointerdown', padPress(tryJump));
      jumpBtn.addEventListener('click', padPress(tryJump));

      function onKey(e) {
        if (destroyed) return;
        var t = e.target, tag = t && t.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
        if (t && t !== document.body && t !== document.documentElement && !root.contains(t)) return;
        if (tag === 'BUTTON' || tag === 'A') return;
        var k = e.key;
        if (phase === 'playing') {
          if (k === ' ' || k === 'Spacebar' || k === 'ArrowRight' || k === 'd' || k === 'D' || k === 'Enter') { e.preventDefault(); if (!e.repeat) strike(); }
          else if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); if (!e.repeat) tryJump(); }
          else if (k === 'p' || k === 'P' || k === 'Escape') { e.preventDefault(); pause(); }
          else if (k === 'ArrowDown') e.preventDefault();
        } else if (phase === 'paused') {
          if (k === 'p' || k === 'P') { e.preventDefault(); resume(); }
        } else if ((phase === 'title' || phase === 'over') && t === canvas && (k === ' ' || k === 'Enter')) {
          e.preventDefault();
          if (performance.now() >= readyAt) start();
        }
      }
      document.addEventListener('keydown', onKey);
      function onVisibility() {
        if (document.hidden) { if (phase === 'playing') pause(); else if (phase === 'falling') stopLoop(); }
        else if (phase === 'falling') startLoop();
      }
      document.addEventListener('visibilitychange', onVisibility);

      var ro = null;
      if (typeof ResizeObserver === 'function') {
        ro = new ResizeObserver(function () { resize(false); });
        ro.observe(root);
      }
      resetWorld();
      showOverlay('title');
      setButtons();
      resize(true);
      setStatus('Press Start. Then tap or press Space to strike the hoop, and swipe up or press Up to jump.');
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { if (!destroyed && cssW) { buildLayers(); if (!raf) render(1); } }).catch(function () { /* fonts are optional */ });
      }

      return {
        destroy: function () {
          destroyed = true;
          stopLoop();
          if (ro) ro.disconnect();
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('visibilitychange', onVisibility);
          layers = null;
        }
      };
    }
  });
})();
