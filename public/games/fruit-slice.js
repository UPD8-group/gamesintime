/* Fruit Slice for Games in Time (the 2010s hall).

   Fruit is tossed up from the bottom of the screen. Swipe through it with a finger (or drag the mouse) to slice it
   in two, with a splash of juice. Slice three or more in one swipe for a combo. Never slice the grumpy cloud: it
   rumbles and ends the round. In Classic, three fruit that fall unsliced end the round; Arcade gives you 60
   seconds to slice as much as you can.

   Keyboard players get letter keys: every fruit wears a big letter, and pressing that letter slices it. Turn it on
   with the Letter keys button, or just start typing during a round.

   This is the mechanic of the 2010 touchscreen swipe games; the fruit, the cloud, the look and the name are ours.

   How the swipe works: every time the finger or mouse moves, the browser tells us where it went. We join the old
   point to the new one with a straight line and ask, for each fruit, "is the middle of this fruit closer to that
   line than the fruit's radius?" If yes, the line went through the fruit, so it is sliced, and the slice angle
   follows the swipe. Fast fingers on an iPad report up to 120 points a second, and we use every one of them
   (getCoalescedEvents), so even a quick flick cannot skip over a fruit.

   How the computer throws (see also the 'computer' note): fruit comes in waves. Each wave picks a size (1 to 6
   pieces), a pattern (all together, one after another, or from both sides) and maybe a cloud. Every throw is
   worked out with real physics: to reach a chosen height h against gravity g, the computer throws upwards at
   speed sqrt(2gh), and picks a sideways speed so the fruit peaks inside the screen. As your score grows (or the
   clock runs down in Arcade) waves get bigger, come quicker and bring more clouds. */
(function () {
  'use strict';

  var WH = 600;                  /* the play area is always 600 units tall; the canvas turns units into pixels */
  var G = 980;                   /* gravity, units per second per second */
  var NFRUIT = 16, NHALF = 36, NDROP = 180, NSPLAT = 12, NFLOAT = 8, NTRAIL = 3, TRAIL_LEN = 28, NQUEUE = 14;
  var TRAIL_MS = 170;            /* how long the blade trail glows */
  var COMBO_GAP = 0.3;           /* seconds: slices closer together than this in one swipe make a combo */
  var KEY_COMBO_GAP = 0.55;      /* letter keys get a little longer */
  var ARCADE_TIME = 60;
  var LETTERS = 'ASDFGHJKLQWERTYUZXCVBNM';   /* no I or O (they look like numbers) and no P (P pauses) */
  var MODES = { classic: 'Classic', arcade: 'Arcade' };
  var MODE_KEYS = ['classic', 'arcade'];

  /* The fruit. r is the radius in units; juice is the colour of the splash. */
  var TYPES = [
    { id: 'watermelon', name: 'watermelon', r: 58, juice: '#ff4d5e' },
    { id: 'orange', name: 'orange', r: 46, juice: '#ffa31a' },
    { id: 'apple', name: 'apple', r: 44, juice: '#ffe9a8' },
    { id: 'lemon', name: 'lemon', r: 42, juice: '#ffe14d' },
    { id: 'kiwi', name: 'kiwi fruit', r: 40, juice: '#8fd14f' },
    { id: 'peach', name: 'peach', r: 44, juice: '#ffb36b' },
    { id: 'coconut', name: 'coconut', r: 46, juice: '#f4f1e8' },
    { id: 'dragon', name: 'dragon fruit', r: 46, juice: '#ff4fa3' }
  ];
  var CLOUD_R = 50;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seeded(seed) {
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
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

  /* ---------- drawing the fruit (each one drawn at the origin with radius r) ---------- */
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }
  function shine(c, r) {
    c.fillStyle = 'rgba(255,255,255,0.32)';
    c.beginPath(); c.ellipse(-r * 0.38, -r * 0.42, r * 0.26, r * 0.14, -0.7, 0, Math.PI * 2); c.fill();
  }
  function shade(c, r, col) {
    c.save(); circle(c, 0, 0, r); c.clip();
    c.fillStyle = col; circle(c, r * 0.32, r * 0.36, r); c.globalAlpha = 0.22; c.fill(); c.globalAlpha = 1;
    c.restore();
  }
  function leaf(c, x, y, s, a, col) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillStyle = col || '#3fae49';
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 0.6, -s * 0.55, s * 1.2, 0); c.quadraticCurveTo(s * 0.6, s * 0.4, 0, 0); c.fill();
    c.restore();
  }
  function stem(c, x, y, len, a) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.strokeStyle = '#6b4a2b'; c.lineWidth = Math.max(2, len * 0.22); c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.2, -len * 0.6, len * 0.1, -len); c.stroke();
    c.restore();
  }
  function seedsRing(c, rand, n, rr, len, col, jitter) {
    c.fillStyle = col;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + rand() * jitter, d = rr * (0.85 + rand() * 0.3);
      c.save(); c.translate(Math.cos(a) * d, Math.sin(a) * d); c.rotate(a + Math.PI / 2);
      c.beginPath(); c.ellipse(0, 0, len * 0.38, len, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }
  var WHOLE = {
    watermelon: function (c, r, rand) {
      c.fillStyle = '#2f9a45'; circle(c, 0, 0, r); c.fill();
      c.save(); circle(c, 0, 0, r); c.clip();
      c.strokeStyle = '#1d6b2e'; c.lineWidth = r * 0.16;
      for (var i = -2; i <= 2; i++) {
        c.beginPath(); c.moveTo(i * r * 0.42, -r * 1.1);
        c.bezierCurveTo(i * r * 0.42 + r * 0.16, -r * 0.4, i * r * 0.42 - r * 0.16, r * 0.3, i * r * 0.42, r * 1.1); c.stroke();
      }
      c.restore();
      shade(c, r, '#0d3b17'); shine(c, r);
    },
    orange: function (c, r, rand) {
      c.fillStyle = '#ff9418'; circle(c, 0, 0, r); c.fill();
      c.fillStyle = 'rgba(190,90,0,0.35)';
      for (var i = 0; i < 16; i++) { var a = rand() * 6.28, d = rand() * r * 0.85; circle(c, Math.cos(a) * d, Math.sin(a) * d, r * 0.035); c.fill(); }
      shade(c, r, '#a04a00'); shine(c, r);
      c.fillStyle = '#5a7d1f'; circle(c, r * 0.05, -r * 0.9, r * 0.09); c.fill();
      leaf(c, r * 0.08, -r * 0.92, r * 0.45, -0.5);
    },
    apple: function (c, r, rand) {
      c.fillStyle = '#e8343c';
      c.beginPath();
      c.moveTo(0, -r * 0.72);
      c.bezierCurveTo(r * 0.55, -r * 1.12, r * 1.12, -r * 0.62, r * 0.98, r * 0.08);
      c.bezierCurveTo(r * 0.9, r * 0.7, r * 0.45, r * 1.02, 0, r * 0.88);
      c.bezierCurveTo(-r * 0.45, r * 1.02, -r * 0.9, r * 0.7, -r * 0.98, r * 0.08);
      c.bezierCurveTo(-r * 1.12, -r * 0.62, -r * 0.55, -r * 1.12, 0, -r * 0.72);
      c.fill();
      c.fillStyle = 'rgba(120,0,10,0.25)'; c.beginPath(); c.ellipse(r * 0.3, r * 0.35, r * 0.55, r * 0.45, 0.3, 0, Math.PI * 2); c.fill();
      shine(c, r);
      stem(c, 0, -r * 0.7, r * 0.42, 0.15);
      leaf(c, r * 0.06, -r * 0.85, r * 0.5, -0.4);
    },
    lemon: function (c, r, rand) {
      c.fillStyle = '#ffd52e';
      c.beginPath(); c.ellipse(0, 0, r * 1.02, r * 0.8, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(r * 1.0, 0, r * 0.18, r * 0.13, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(-r * 1.0, 0, r * 0.15, r * 0.11, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(160,110,0,0.25)';
      for (var i = 0; i < 12; i++) { var a = rand() * 6.28, d = rand() * r * 0.7; circle(c, Math.cos(a) * d, Math.sin(a) * d * 0.8, r * 0.03); c.fill(); }
      c.fillStyle = 'rgba(150,100,0,0.2)'; c.beginPath(); c.ellipse(r * 0.25, r * 0.3, r * 0.7, r * 0.42, 0, 0, Math.PI * 2); c.fill();
      shine(c, r);
    },
    kiwi: function (c, r, rand) {
      c.fillStyle = '#8a5a2b'; c.beginPath(); c.ellipse(0, 0, r * 1.05, r * 0.92, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(210,170,110,0.45)'; c.lineWidth = Math.max(1, r * 0.03);
      for (var i = 0; i < 40; i++) { var a = rand() * 6.28, d = rand() * r * 0.85; var x = Math.cos(a) * d, y = Math.sin(a) * d * 0.88; c.beginPath(); c.moveTo(x, y); c.lineTo(x + r * 0.06, y + r * 0.05); c.stroke(); }
      shade(c, r, '#3a2410'); shine(c, r);
    },
    peach: function (c, r, rand) {
      c.fillStyle = '#ffb27a'; circle(c, 0, 0, r); c.fill();
      c.fillStyle = 'rgba(255,90,90,0.55)'; c.beginPath(); c.ellipse(r * 0.28, r * 0.15, r * 0.62, r * 0.7, 0.3, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(190,80,60,0.6)'; c.lineWidth = r * 0.06; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-r * 0.05, -r * 0.85); c.quadraticCurveTo(-r * 0.4, 0, -r * 0.1, r * 0.75); c.stroke();
      shine(c, r);
      leaf(c, -r * 0.02, -r * 0.92, r * 0.5, -0.3, '#4caf50');
    },
    coconut: function (c, r, rand) {
      c.fillStyle = '#6b4226'; circle(c, 0, 0, r); c.fill();
      c.strokeStyle = 'rgba(170,120,70,0.55)'; c.lineWidth = Math.max(1, r * 0.035); c.lineCap = 'round';
      for (var i = 0; i < 46; i++) { var a = rand() * 6.28, d = rand() * r * 0.9, x = Math.cos(a) * d, y = Math.sin(a) * d, b = rand() * 6.28; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(b) * r * 0.14, y + Math.sin(b) * r * 0.14); c.stroke(); }
      c.fillStyle = '#2e1a0c';
      circle(c, -r * 0.2, -r * 0.35, r * 0.09); c.fill(); circle(c, r * 0.12, -r * 0.42, r * 0.09); c.fill(); circle(c, -r * 0.02, -r * 0.14, r * 0.09); c.fill();
      shade(c, r, '#1f1007'); shine(c, r);
    },
    dragon: function (c, r, rand) {
      c.fillStyle = '#e93c86'; c.beginPath(); c.ellipse(0, 0, r * 0.9, r, 0, 0, Math.PI * 2); c.fill();
      for (var i = 0; i < 9; i++) {
        var a = -Math.PI / 2 + (i - 4) * 0.62, x = Math.cos(a) * r * 0.7, y = Math.sin(a) * r * 0.75 + r * 0.1;
        c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2);
        c.fillStyle = '#e93c86'; c.beginPath(); c.moveTo(-r * 0.16, 0); c.quadraticCurveTo(0, -r * 0.5, r * 0.12, -r * 0.42); c.quadraticCurveTo(r * 0.05, -r * 0.1, r * 0.16, 0); c.fill();
        c.fillStyle = '#7ccf3a'; c.beginPath(); c.moveTo(r * 0.02, -r * 0.3); c.quadraticCurveTo(r * 0.06, -r * 0.48, r * 0.12, -r * 0.42); c.quadraticCurveTo(r * 0.1, -r * 0.33, r * 0.02, -r * 0.3); c.fill();
        c.restore();
      }
      shade(c, r, '#7a0a3a'); shine(c, r);
    }
  };
  /* A half, seen from the cut side, drawn above the cut line (y < 0). */
  var HALF = {
    watermelon: function (c, r, rand) {
      c.fillStyle = '#1d6b2e'; circle(c, 0, 0, r); c.fill();
      c.fillStyle = '#c9f0b0'; circle(c, 0, 0, r * 0.9); c.fill();
      c.fillStyle = '#ff4d5e'; circle(c, 0, 0, r * 0.82); c.fill();
      seedsRing(c, rand, 9, r * 0.5, r * 0.07, '#2b1a1a', 0.3);
    },
    orange: function (c, r, rand) {
      c.fillStyle = '#ff9418'; circle(c, 0, 0, r); c.fill();
      c.fillStyle = '#fff1d6'; circle(c, 0, 0, r * 0.9); c.fill();
      c.fillStyle = '#ffb63d'; circle(c, 0, 0, r * 0.82); c.fill();
      c.strokeStyle = '#fff1d6'; c.lineWidth = r * 0.05;
      for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82); c.stroke(); }
      c.fillStyle = '#fff1d6'; circle(c, 0, 0, r * 0.1); c.fill();
    },
    apple: function (c, r, rand) {
      c.fillStyle = '#e8343c'; circle(c, 0, 0, r); c.fill();
      c.fillStyle = '#fff3cc'; circle(c, 0, 0, r * 0.92); c.fill();
      c.strokeStyle = 'rgba(200,170,90,0.6)'; c.lineWidth = r * 0.04;
      c.beginPath(); c.ellipse(0, 0, r * 0.3, r * 0.42, 0, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#6b3a17';
      c.beginPath(); c.ellipse(-r * 0.1, -r * 0.12, r * 0.06, r * 0.12, 0.3, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(r * 0.1, -r * 0.12, r * 0.06, r * 0.12, -0.3, 0, Math.PI * 2); c.fill();
    },
    lemon: function (c, r, rand) {
      c.fillStyle = '#ffd52e'; circle(c, 0, 0, r); c.fill();
      c.fillStyle = '#fffbe0'; circle(c, 0, 0, r * 0.9); c.fill();
      c.fillStyle = '#fff07a'; circle(c, 0, 0, r * 0.82); c.fill();
      c.strokeStyle = '#fffbe0'; c.lineWidth = r * 0.05;
      for (var i = 0; i < 9; i++) { var a = i / 9 * Math.PI * 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82); c.stroke(); }
    },
    kiwi: function (c, r, rand) {
      c.fillStyle = '#8a5a2b'; circle(c, 0, 0, r); c.fill();
      c.fillStyle = '#6cc04a'; circle(c, 0, 0, r * 0.94); c.fill();
      c.fillStyle = '#a5dc6e'; circle(c, 0, 0, r * 0.62); c.fill();
      c.fillStyle = '#f3f6d8'; c.beginPath(); c.ellipse(0, 0, r * 0.28, r * 0.22, 0, 0, Math.PI * 2); c.fill();
      seedsRing(c, rand, 16, r * 0.38, r * 0.05, '#1e1a10', 0.15);
    },
    peach: function (c, r, rand) {
      c.fillStyle = '#ffb27a'; circle(c, 0, 0, r); c.fill();
      c.fillStyle = '#ffc94f'; circle(c, 0, 0, r * 0.93); c.fill();
      c.fillStyle = 'rgba(230,80,60,0.55)'; c.beginPath(); c.ellipse(0, 0, r * 0.42, r * 0.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8a4a22'; c.beginPath(); c.ellipse(0, 0, r * 0.3, r * 0.38, 0, 0, Math.PI * 2); c.fill();
    },
    coconut: function (c, r, rand) {
      c.fillStyle = '#6b4226'; circle(c, 0, 0, r); c.fill();
      c.fillStyle = '#3d2412'; circle(c, 0, 0, r * 0.92); c.fill();
      c.fillStyle = '#fbf8ef'; circle(c, 0, 0, r * 0.85); c.fill();
      c.fillStyle = '#e8eef0'; circle(c, 0, 0, r * 0.6); c.fill();
    },
    dragon: function (c, r, rand) {
      c.fillStyle = '#e93c86'; circle(c, 0, 0, r); c.fill();
      c.fillStyle = '#fbf6f2'; circle(c, 0, 0, r * 0.88); c.fill();
      c.fillStyle = '#1e1a1a';
      for (var i = 0; i < 60; i++) { var a = rand() * 6.28, d = Math.sqrt(rand()) * r * 0.8; circle(c, Math.cos(a) * d, Math.sin(a) * d, r * 0.025); c.fill(); }
    }
  };
  /* The grumpy cloud: puffs of grey with a cross face and a little zigzag of lightning. */
  function drawCloud(c, r) {
    c.fillStyle = '#ffd23f';
    c.beginPath(); c.moveTo(-r * 0.05, r * 0.55); c.lineTo(r * 0.22, r * 0.55); c.lineTo(r * 0.02, r * 0.9); c.lineTo(r * 0.3, r * 0.88); c.lineTo(-r * 0.15, r * 1.32); c.lineTo(-r * 0.02, r * 0.98); c.lineTo(-r * 0.26, r * 1.0); c.closePath(); c.fill();
    var puffs = [[-0.55, 0.12, 0.45], [-0.2, -0.22, 0.52], [0.3, -0.18, 0.5], [0.62, 0.16, 0.4], [0.05, 0.22, 0.55]];
    c.fillStyle = '#5c6275';
    for (var i = 0; i < puffs.length; i++) { circle(c, puffs[i][0] * r, puffs[i][1] * r + r * 0.06, puffs[i][2] * r); c.fill(); }
    c.fillStyle = '#8b91a6';
    for (i = 0; i < puffs.length; i++) { circle(c, puffs[i][0] * r, puffs[i][1] * r, puffs[i][2] * r); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.18)'; circle(c, -r * 0.3, -r * 0.35, r * 0.25); c.fill();
    /* the grumpy face */
    c.fillStyle = '#fff'; circle(c, -r * 0.2, r * 0.02, r * 0.12); c.fill(); circle(c, r * 0.2, r * 0.02, r * 0.12); c.fill();
    c.fillStyle = '#23252e'; circle(c, -r * 0.18, r * 0.05, r * 0.06); c.fill(); circle(c, r * 0.18, r * 0.05, r * 0.06); c.fill();
    c.strokeStyle = '#23252e'; c.lineWidth = r * 0.08; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-r * 0.34, -r * 0.16); c.lineTo(-r * 0.08, -r * 0.06); c.moveTo(r * 0.34, -r * 0.16); c.lineTo(r * 0.08, -r * 0.06); c.stroke();
    c.beginPath(); c.arc(0, r * 0.34, r * 0.14, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  }

  GamesInTime.register({
    id: 'fruit-slice',
    frame: 'none',
    mount: function (root, api) {
      var h = api.h;
      var destroyed = false;
      var reduced = !!api.reducedMotion;
      var mode = api.store.get('mode', 'classic');
      if (!MODES[mode]) mode = 'classic';
      var letters = !!api.store.get('letters', false);
      function bestKey() { return 'best-' + mode + (letters ? '-keys' : ''); }
      function bestNow() { return Number(api.store.get(bestKey(), 0)) || 0; }
      function bestLabel() { return MODES[mode] + (letters ? ', letter keys' : ''); }

      /* ---------- the page parts ---------- */
      root.appendChild(h('style', null,
        '.game-fruit-slice .fs-device { max-width: 1060px; margin: 0 auto; padding: 14px; border-radius: 34px; background: linear-gradient(160deg, color-mix(in srgb, var(--surface-2) 80%, var(--ink)) 0%, var(--surface) 30%, color-mix(in srgb, var(--bg) 70%, var(--surface)) 100%); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--ink) 12%, transparent), 0 20px 46px rgba(0, 0, 0, .5); position: relative; }' +
        '.game-fruit-slice .fs-cam { position: absolute; top: 5px; left: 50%; width: 6px; height: 6px; margin-left: -3px; border-radius: 50%; background: color-mix(in srgb, var(--bg) 60%, var(--cobalt)); }' +
        '.game-fruit-slice .fs-stage { position: relative; border-radius: 16px; overflow: hidden; background: var(--bg); }' +
        '.game-fruit-slice .fs-canvas { display: block; width: 100%; height: 420px; touch-action: auto; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }' +
        '.game-fruit-slice .is-slicing .fs-canvas { touch-action: none; cursor: crosshair; }' +
        '.game-fruit-slice .fs-canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }' +
        '.game-fruit-slice .fs-overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: 12px; background: color-mix(in srgb, var(--bg) 45%, transparent); }' +
        '.game-fruit-slice .fs-overlay[hidden] { display: none; }' +
        '.game-fruit-slice .fs-card { display: grid; gap: .6rem; justify-items: center; text-align: center; max-width: 27rem; max-height: 100%; overflow-y: auto; padding: 1rem 1.2rem 1.1rem; border-radius: 22px; background: var(--surface); color: var(--ink); box-shadow: 0 10px 0 color-mix(in srgb, var(--bg) 60%, transparent); }' +
        '.game-fruit-slice .fs-title { margin: 0; font-family: var(--font-poster); font-weight: 700; font-size: clamp(1.8rem, 1.3rem + 2.4vw, 2.9rem); line-height: 1; color: var(--vermilion); letter-spacing: .01em; }' +
        '.game-fruit-slice .fs-title span { color: var(--gold); }' +
        '.game-fruit-slice .fs-msg { margin: 0; font-weight: 600; line-height: 1.35; }' +
        '.game-fruit-slice .fs-sub { margin: 0; color: var(--ink-muted); font-size: .92rem; }' +
        '.game-fruit-slice .fs-sub:empty { display: none; }' +
        '.game-fruit-slice .fs-btn { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; min-height: 44px; padding: .45rem 1.15rem; border: 0; border-radius: 14px; cursor: pointer; font: 700 1rem var(--font-head); color: var(--ink); background: var(--surface-2); box-shadow: 0 4px 0 color-mix(in srgb, var(--bg) 70%, var(--surface-2)); touch-action: manipulation; transition: transform .1s, box-shadow .1s; }' +
        '.game-fruit-slice .fs-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 color-mix(in srgb, var(--bg) 70%, var(--surface-2)); }' +
        '.game-fruit-slice .fs-btn:disabled { opacity: .45; cursor: not-allowed; }' +
        '.game-fruit-slice .fs-btn:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }' +
        '.game-fruit-slice .fs-go { background: var(--vermilion); color: var(--ink); min-height: 54px; font-size: 1.2rem; padding-inline: 1.8rem; box-shadow: 0 5px 0 color-mix(in srgb, var(--vermilion) 55%, var(--bg)); }' +
        '.game-fruit-slice .fs-go:active { box-shadow: 0 2px 0 color-mix(in srgb, var(--vermilion) 55%, var(--bg)); }' +
        '.game-fruit-slice .fs-keys[aria-pressed="true"] { background: var(--peacock); color: var(--on-era); box-shadow: 0 4px 0 color-mix(in srgb, var(--peacock) 50%, var(--bg)); }' +
        '.game-fruit-slice .fs-keys .fs-tick { display: inline-grid; place-items: center; width: 1.2em; height: 1.2em; border-radius: 6px; border: 2px solid currentColor; font-size: .85em; line-height: 1; }' +
        '.game-fruit-slice .fs-seg { display: inline-flex; padding: 4px; gap: 4px; border-radius: 16px; background: var(--bg-2); }' +
        '.game-fruit-slice .fs-seg[hidden] { display: none; }' +
        '.game-fruit-slice .fs-seg button { min-height: 42px; min-width: 44px; padding: .3rem 1rem; border: 0; border-radius: 12px; background: transparent; color: var(--ink-muted); font: 700 1rem var(--font-head); cursor: pointer; }' +
        '.game-fruit-slice .fs-seg button[aria-pressed="true"] { background: var(--gold); color: var(--on-era); }' +
        '.game-fruit-slice .fs-seg button:focus-visible { outline: 3px solid var(--focus); outline-offset: 1px; }' +
        '.game-fruit-slice .fs-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .6rem .8rem; margin-top: .8rem; }' +
        '.game-fruit-slice .fs-tools { display: flex; flex-wrap: wrap; gap: .5rem; }' +
        '.game-fruit-slice .fs-score { display: flex; flex-wrap: wrap; gap: .3rem 1rem; font-weight: 800; font-variant-numeric: tabular-nums; }' +
        '.game-fruit-slice .fs-score strong { font-family: var(--font-poster); font-size: 1.2rem; color: var(--gold); }' +
        '@media (max-width: 480px) { .game-fruit-slice .fs-device { padding: 8px; border-radius: 24px; } .game-fruit-slice .fs-cam { top: 1px; width: 5px; height: 5px; } .game-fruit-slice .fs-card { padding: .7rem .8rem .8rem; gap: .45rem; } .game-fruit-slice .fs-msg { font-size: .92rem; } .game-fruit-slice .fs-go { min-height: 48px; } .game-fruit-slice .fs-btn { padding-inline: .8rem; } }'));

      var modeBtns = {};
      var modeSeg = h('div', { class: 'fs-seg', role: 'group', 'aria-label': 'Mode' }, MODE_KEYS.map(function (k) {
        modeBtns[k] = h('button', { type: 'button', 'aria-pressed': String(k === mode), onclick: function () { setMode(k); } }, MODES[k]);
        return modeBtns[k];
      }));
      function keysButton() {
        return h('button', { class: 'fs-btn fs-keys', type: 'button', 'aria-pressed': String(letters), onclick: function () { setLetters(!letters, true); } },
          h('span', { class: 'fs-tick', 'aria-hidden': 'true' }, letters ? '✓' : ''), 'Letter keys');
      }
      var keysCard = keysButton(), keysBar = keysButton();
      var canvas = h('canvas', { class: 'fs-canvas', role: 'img', tabindex: '0', 'aria-label': 'Fruit Slice. Fruit will be tossed up from the bottom of the screen.' });
      var ovTitle = h('p', { class: 'fs-title' }, 'Fruit ', h('span', null, 'Slice'));
      var ovMsg = h('p', { class: 'fs-msg' }, '');
      var ovSub = h('p', { class: 'fs-sub' }, '');
      var ovBtn = h('button', { class: 'fs-btn fs-go', type: 'button', onclick: function () { overlayAction(); } }, '▶ Start');
      var overlay = h('div', { class: 'fs-overlay' }, h('div', { class: 'fs-card' }, ovTitle, ovMsg, modeSeg, keysCard, ovBtn, ovSub));
      var stage = h('div', { class: 'fs-stage' }, canvas, overlay);
      var device = h('div', { class: 'fs-device' }, h('span', { class: 'fs-cam', 'aria-hidden': 'true' }), stage);
      var pauseBtn = h('button', { class: 'fs-btn', type: 'button', disabled: true, onclick: function () { togglePause(); } }, 'Pause');
      var newBtn = h('button', { class: 'fs-btn', type: 'button', onclick: function () { newGame(); } }, 'New game');
      var scoreEl = h('strong', null, '0'), bestEl = h('strong', null, String(bestNow())), thirdLabel = h('span', null, 'Misses'), thirdEl = h('strong', null, '0 of 3');
      var bar = h('div', { class: 'fs-bar' },
        h('div', { class: 'fs-tools' }, pauseBtn, newBtn, keysBar),
        h('div', { class: 'fs-score' }, h('span', null, 'Score ', scoreEl), h('span', null, thirdLabel, ' ', thirdEl), h('span', null, 'Best ', bestEl)));
      var note = h('p', { class: 'game-note' }, 'Swipe through fruit with a finger, or hold the mouse button and drag. Keyboard: turn on Letter keys (or just start typing) and press the letter on a fruit. P or Escape pauses.');
      root.appendChild(device);
      root.appendChild(bar);
      root.appendChild(note);

      var ctx = canvas.getContext('2d');
      var bgCanvas = document.createElement('canvas');
      var W = 600, H = 420, dpr = 1, S = 1, WW = 860;
      var C = {}, FONT = 'sans-serif';
      var wholeSprites = [], halfSprites = [], splatSprites = [], cloudSprite = null;

      function readColours() {
        var cs = getComputedStyle(root);
        function v(n, fb) { var s = cs.getPropertyValue(n).trim(); return s || fb; }
        C.bg = v('--bg', '#15171c'); C.bg2 = v('--bg-2', C.bg); C.surface = v('--surface', '#23272f'); C.surface2 = v('--surface-2', C.surface);
        C.ink = v('--ink', '#ffffff'); C.muted = v('--ink-muted', C.ink);
        C.gold = v('--gold', '#ffc233'); C.vermilion = v('--vermilion', '#ff5a5f'); C.peacock = v('--peacock', '#00c9a7'); C.cobalt = v('--cobalt', '#3d8bff');
        C.red = v('--red', '#ff5a5f'); C.onEra = v('--on-era', '#00241e');
        FONT = (cs.getPropertyValue('--font-poster').trim() || 'system-ui, sans-serif');
      }

      /* ---------- pools: everything on screen lives in fixed lists that are reused ---------- */
      var fruits = [], halves = [], drops = [], splats = [], floats = [], trails = [], queue = [];
      var i0;
      for (i0 = 0; i0 < NFRUIT; i0++) fruits.push({ on: false, type: 0, cloud: false, x: 0, y: 0, vx: 0, vy: 0, r: 40, rot: 0, vrot: 0, letter: '' });
      for (i0 = 0; i0 < NHALF; i0++) halves.push({ on: false, type: 0, x: 0, y: 0, vx: 0, vy: 0, r: 40, rot: 0, vrot: 0 });
      for (i0 = 0; i0 < NDROP; i0++) drops.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 3, age: 0, life: 1, col: '' });
      for (i0 = 0; i0 < NSPLAT; i0++) splats.push({ on: false, type: 0, x: 0, y: 0, rot: 0, s: 1, age: 0 });
      for (i0 = 0; i0 < NFLOAT; i0++) floats.push({ on: false, text: '', x: 0, y: 0, age: 0, life: 0.8, size: 24, col: '' });
      for (i0 = 0; i0 < NTRAIL; i0++) {
        trails.push({ id: null, down: false, n: 0, head: 0, xs: new Float32Array(TRAIL_LEN), ys: new Float32Array(TRAIL_LEN), ts: new Float64Array(TRAIL_LEN), hits: 0, lastHit: 0, lastX: 0, lastY: 0, whooshed: false, comboX: 0, comboY: 0 });
      }
      for (i0 = 0; i0 < NQUEUE; i0++) queue.push({ on: false, at: 0, cloud: false, x0: 0, apexX: 0, apexY: 0 });
      var dropNext = 0, splatNext = 0, floatNext = 0, halfNext = 0;

      /* ---------- game state ---------- */
      var state = 'idle';        /* idle | playing | paused | ending | over */
      var score = 0, misses = 0, elapsed = 0, waves = 0, nextWaveAt = 0, endAt = 0, endReason = '', flashT = 0, shakeT = 0, readyT = 0;
      var keyCombo = { hits: 0, last: -9, x: 0, y: 0 };
      var statusDirty = false, rafId = 0, lastT = 0, statusAt = 0, lastTick = -1, dataTick = 0, lastBest = false;
      function rnd() { return api.random(); }
      /* api.tone plays one synthesised note; older copies of the site may not have it */
      function tone(f, d, t, v) { if (typeof api.tone === 'function') api.tone(f, d, t, v); }
      function timeScale() { return letters ? 0.78 : 1; }

      /* ---------- layout and sprites ---------- */
      function resize() {
        var w = Math.max(240, Math.round(stage.clientWidth || 600));
        var vh = window.innerHeight || 800;
        var hh = w < 520 ? Math.round(clamp(w * 1.25, 340, Math.max(340, vh * 0.68))) : Math.round(clamp(w * 0.56, 380, Math.max(380, Math.min(640, vh * 0.72))));
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = w; H = hh; S = H / WH; WW = W / S;
        canvas.style.height = hh + 'px';
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr);
        readColours();
        buildBackground();
        buildSprites();
        draw(performance.now());
        if (!overlay.hidden) fitCard();
      }
      /* Each fruit is painted once into its own little canvas (a sprite) at the right size, so every frame only
         has to copy pictures, which is quick even on an old Chromebook. */
      function makeSprite(r, painter, halfOnly) {
        var k = S * dpr, pad = 6, size = Math.ceil((r * 2 + pad * 2) * k);
        var cv = document.createElement('canvas');
        cv.width = size; cv.height = size;
        var c = cv.getContext('2d');
        c.setTransform(k, 0, 0, k, size / 2, size / 2);
        if (halfOnly) { c.beginPath(); c.rect(-r - pad, -r - pad, (r + pad) * 2, r + pad); c.clip(); }
        painter(c, r);
        if (halfOnly) {
          /* a thin bright edge along the cut, so the half reads as freshly sliced */
          c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 2.2; c.lineCap = 'round';
          c.beginPath(); c.moveTo(-r * 0.9, -1); c.lineTo(r * 0.9, -1); c.stroke();
        }
        return { cv: cv, u: size / k };
      }
      function buildSprites() {
        wholeSprites = []; halfSprites = []; splatSprites = [];
        TYPES.forEach(function (t, i) {
          wholeSprites.push(makeSprite(t.r, function (c, r) { WHOLE[t.id](c, r, seeded(11 + i)); }, false));
          halfSprites.push(makeSprite(t.r, function (c, r) { HALF[t.id](c, r, seeded(91 + i)); }, true));
          splatSprites.push(makeSprite(70, function (c, r) {
            var rand = seeded(300 + i);
            c.fillStyle = t.juice;
            circle(c, 0, 0, r * 0.45); c.fill();
            for (var j = 0; j < 9; j++) { var a = rand() * 6.28, d = r * (0.35 + rand() * 0.45); circle(c, Math.cos(a) * d, Math.sin(a) * d, r * (0.08 + rand() * 0.16)); c.fill(); }
            for (j = 0; j < 7; j++) { var b = rand() * 6.28, e = r * (0.55 + rand() * 0.4); circle(c, Math.cos(b) * e, Math.sin(b) * e, r * 0.05); c.fill(); }
          }, false));
        });
        cloudSprite = makeSprite(CLOUD_R * 1.4, function (c) { drawCloud(c, CLOUD_R); }, false);
      }
      /* The backdrop: a calm charcoal wall with a few flat 2010s shapes in the hall's colours, drawn once. */
      function buildBackground() {
        bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;
        var b = bgCanvas.getContext('2d');
        b.setTransform(dpr, 0, 0, dpr, 0, 0);
        var g = b.createRadialGradient(W * 0.5, H * 0.35, 0, W * 0.5, H * 0.35, Math.max(W, H) * 0.75);
        g.addColorStop(0, C.surface2); g.addColorStop(1, C.bg);
        b.fillStyle = g; b.fillRect(0, 0, W, H);
        var rand = seeded(2010), cols = [C.peacock, C.vermilion, C.gold, C.cobalt], i;
        for (i = 0; i < 4; i++) {
          b.fillStyle = rgba(cols[i % 4], 0.045);
          b.beginPath(); b.arc(rand() * W, rand() * H, (0.15 + rand() * 0.2) * Math.max(W, H), 0, Math.PI * 2); b.fill();
        }
        /* soft diagonal stripes, like a 2010s app wallpaper */
        b.strokeStyle = rgba(C.ink, 0.02); b.lineWidth = 18;
        for (var x = -H; x < W; x += 56) { b.beginPath(); b.moveTo(x, H); b.lineTo(x + H, 0); b.stroke(); }
        /* flat confetti: dots, rings and triangles */
        var n = Math.round(W * H / 9000);
        for (i = 0; i < n; i++) {
          var cx = rand() * W, cy = rand() * H, sz = 3 + rand() * 6, kind = i % 3;
          b.fillStyle = b.strokeStyle = rgba(cols[(i * 7) % 4], 0.16 + rand() * 0.1);
          b.lineWidth = 2;
          if (kind === 0) { b.beginPath(); b.arc(cx, cy, sz * 0.6, 0, Math.PI * 2); b.fill(); }
          else if (kind === 1) { b.beginPath(); b.arc(cx, cy, sz, 0, Math.PI * 2); b.stroke(); }
          else { var a = rand() * 6.28; b.beginPath(); for (var k = 0; k < 3; k++) { var aa = a + k * 2.094; if (k) b.lineTo(cx + Math.cos(aa) * sz, cy + Math.sin(aa) * sz); else b.moveTo(cx + Math.cos(aa) * sz, cy + Math.sin(aa) * sz); } b.closePath(); b.fill(); }
        }
        var v = b.createLinearGradient(0, H * 0.7, 0, H);
        v.addColorStop(0, rgba(C.bg, 0)); v.addColorStop(1, rgba(C.bg, 0.6));
        b.fillStyle = v; b.fillRect(0, H * 0.7, W, H * 0.3);
      }

      /* ---------- throwing ---------- */
      function difficulty() {
        if (mode === 'arcade') return clamp(elapsed / 50, 0, 1);
        return clamp(score / 100, 0, 1);
      }
      /* Plan the next wave: how many, in what pattern, and whether a cloud comes too. */
      function planWave(now) {
        var d = difficulty();
        var n = 1 + Math.floor(rnd() * (2.2 + d * 3.4));
        if (mode === 'arcade') n += 1;
        if (waves < 2) n = Math.min(n, 2);
        if (letters) n = Math.min(n, 2 + Math.floor(d * 2.5));
        n = Math.min(n, 6);
        var clouds = 0;
        if (waves >= 2 && rnd() < 0.1 + 0.28 * d) clouds = d > 0.7 && rnd() < 0.3 ? 2 : 1;
        var pattern = rnd(), t = now + 0.15, gap = letters ? 0.42 : 0.2 + rnd() * 0.12;
        var total = n + clouds, ltr = waves % 2 === 0;
        for (var i = 0; i < total; i++) {
          var q = freeQueue(); if (!q) break;
          q.on = true; q.cloud = i >= n;
          var f = total === 1 ? 0.5 : i / (total - 1);
          if (pattern < 0.4) {                          /* all together, in a fan from the bottom */
            q.at = t + rnd() * 0.08;
            q.x0 = WW * (0.3 + rnd() * 0.4);
            q.apexX = WW * (0.14 + 0.72 * f);
          } else if (pattern < 0.75) {                  /* one after another, left to right or right to left */
            q.at = t + i * gap;
            q.x0 = WW * (ltr ? 0.15 + 0.7 * f : 0.85 - 0.7 * f);
            q.apexX = q.x0 + (rnd() - 0.5) * WW * 0.15;
          } else {                                      /* from both sides, crossing in the middle */
            var left = i % 2 === 0;
            q.at = t + Math.floor(i / 2) * gap * 1.4;
            q.x0 = WW * (left ? 0.06 + rnd() * 0.1 : 0.84 + rnd() * 0.1);
            q.apexX = WW * (left ? 0.55 + rnd() * 0.25 : 0.2 + rnd() * 0.25);
          }
          q.apexY = WH * (letters ? 0.1 + rnd() * 0.22 : 0.1 + rnd() * 0.3);
        }
        waves++;
        var last = t + (pattern < 0.4 ? 0.1 : (total - 1) * gap * (pattern < 0.75 ? 1 : 0.7));
        nextWaveAt = last + (letters ? 2.7 : mode === 'arcade' ? 1.5 : 2.0) - 0.8 * d + rnd() * 0.4;
      }
      function freeQueue() { for (var i = 0; i < NQUEUE; i++) if (!queue[i].on) return queue[i]; return null; }
      function freeFruit() { for (var i = 0; i < NFRUIT; i++) if (!fruits[i].on) return fruits[i]; return null; }
      /* One throw: from below the screen, upwards fast enough to peak at apexY (speed = square root of 2 g h). */
      function launch(q) {
        var f = freeFruit(); if (!f) return;
        f.on = true; f.cloud = q.cloud;
        f.type = Math.floor(rnd() * TYPES.length);
        f.r = f.cloud ? CLOUD_R : TYPES[f.type].r;
        f.x = clamp(q.x0, f.r, WW - f.r); f.y = WH + f.r + 4;
        var rise = f.y - q.apexY;
        f.vy = -Math.sqrt(2 * G * rise);
        var tUp = -f.vy / G;
        f.vx = clamp((clamp(q.apexX, f.r * 1.2, WW - f.r * 1.2) - f.x) / tUp, -WW * 0.4 / tUp, WW * 0.4 / tUp);
        f.rot = rnd() * 6.28; f.vrot = (rnd() - 0.5) * (f.cloud ? 0.6 : 4);
        f.letter = letters ? pickLetter() : '';
        if (f.cloud) tone(98, 0.25, 'sawtooth', 0.03); else tone(260 + rnd() * 80, 0.06, 'triangle', 0.035);
      }
      function pickLetter() {
        for (var tries = 0; tries < 40; tries++) {
          var l = LETTERS.charAt(Math.floor(rnd() * LETTERS.length)), used = false;
          for (var i = 0; i < NFRUIT; i++) if (fruits[i].on && fruits[i].letter === l) { used = true; break; }
          if (!used) return l;
        }
        return LETTERS.charAt(0);
      }

      /* ---------- slicing ---------- */
      /* Does the line from (x1,y1) to (x2,y2) pass within r of the point (cx,cy)? Find the point on the line nearest
         the centre, then compare its distance with r (squared, to skip the square root). */
      function segHits(x1, y1, x2, y2, cx, cy, r) {
        var dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
        var t = len2 > 0 ? ((cx - x1) * dx + (cy - y1) * dy) / len2 : 0;
        t = clamp(t, 0, 1);
        var px = x1 + dx * t - cx, py = y1 + dy * t - cy;
        return px * px + py * py <= r * r;
      }
      function sliceAlong(tr, x1, y1, x2, y2, now) {
        if (state !== 'playing' || readyT > 0) return;
        var dx = x2 - x1, dy = y2 - y1;
        if (dx * dx + dy * dy < 1) return;
        for (var i = 0; i < NFRUIT; i++) {
          var f = fruits[i];
          if (!f.on || !segHits(x1, y1, x2, y2, f.x, f.y, f.r + 6)) continue;
          if (f.cloud) { hitCloud(f); return; }
          slice(f, Math.atan2(dy, dx), dx, dy);
          if (tr) { tr.hits++; tr.lastHit = now; tr.comboX = f.x; tr.comboY = f.y; comboTone(tr.hits); }
        }
      }
      function comboTone(n) { tone(420 + Math.min(n, 8) * 70, 0.07, 'sine', 0.07); }
      function slice(f, angle, dx, dy) {
        f.on = false;
        var t = TYPES[f.type], len = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / len, uy = dy / len;
        var nx = -uy, ny = ux;   /* the direction across the cut */
        for (var s = 0; s < 2; s++) {
          var hf = halves[halfNext]; halfNext = (halfNext + 1) % NHALF;
          var side = s === 0 ? 1 : -1;
          hf.on = true; hf.type = f.type; hf.r = f.r;
          hf.x = f.x - nx * side * 3; hf.y = f.y - ny * side * 3;
          hf.vx = f.vx * 0.6 + ux * 70 - nx * side * 120; hf.vy = Math.min(f.vy * 0.5, 80) + uy * 70 - ny * side * 120;
          /* each half is drawn as the part above its own cut line; turning one by half a circle gives the other */
          hf.rot = angle + (s === 0 ? 0 : Math.PI);
          hf.vrot = side * (1.5 + rnd() * 2);
        }
        juice(f.x, f.y, ux, uy, t.juice, reduced ? 8 : 18);
        var sp = splats[splatNext]; splatNext = (splatNext + 1) % NSPLAT;
        sp.on = true; sp.type = f.type; sp.x = f.x; sp.y = f.y; sp.rot = rnd() * 6.28; sp.s = 0.7 + rnd() * 0.35; sp.age = 0;
        score++;
        addFloat('+1', f.x, f.y - f.r * 0.6, 26, C.ink, 0.6);
        api.sound('pop');
        scoreChanged();
      }
      function juice(x, y, ux, uy, col, n) {
        for (var i = 0; i < n; i++) {
          var d = drops[dropNext]; dropNext = (dropNext + 1) % NDROP;
          var a = Math.atan2(uy, ux) + (rnd() - 0.5) * 2.2, sp = 120 + rnd() * 420;
          d.on = true; d.x = x; d.y = y; d.vx = Math.cos(a) * sp; d.vy = Math.sin(a) * sp - 120; d.r = 2.5 + rnd() * 5; d.age = 0; d.life = 0.45 + rnd() * 0.5; d.col = col;
        }
      }
      function addFloat(text, x, y, size, col, life) {
        var f = floats[floatNext]; floatNext = (floatNext + 1) % NFLOAT;
        ctx.font = '800 ' + size + 'px ' + FONT;
        var half = ctx.measureText(text).width * 0.6 + 12;
        f.on = true; f.text = text; f.x = clamp(x, half, Math.max(half, WW - half)); f.y = clamp(y, 50, WH - 30); f.age = 0; f.life = life; f.size = size; f.col = col;
      }
      function finishCombo(hits, x, y) {
        if (hits < 3) return;
        score += hits;
        addFloat('Combo ×' + hits + '  +' + hits, x, y - 50, 34, C.gold, 1.1);
        api.sound('coin');
        api.announce('Combo of ' + hits + '! Plus ' + hits + ' points.');
        scoreChanged();
      }
      function hitCloud(f) {
        f.on = false;
        api.sound('thud'); api.sound('wrong');
        tone(70, 0.6, 'sawtooth', 0.07);
        if (!reduced) { flashT = 0.35; shakeT = 0.5; }
        for (var i = 0; i < (reduced ? 10 : 30); i++) {
          var d = drops[dropNext]; dropNext = (dropNext + 1) % NDROP;
          d.on = true; d.x = f.x + (rnd() - 0.5) * f.r * 2; d.y = f.y + rnd() * f.r * 0.5; d.vx = (rnd() - 0.5) * 60; d.vy = 200 + rnd() * 300; d.r = 2 + rnd() * 2.5; d.age = 0; d.life = 0.8 + rnd() * 0.5; d.col = C.cobalt;
        }
        addFloat('Grumpy cloud!', f.x, f.y, 34, C.cobalt, 1.3);
        endRound('cloud');
      }

      /* ---------- the loop ---------- */
      function frame(now) {
        rafId = 0;
        if (destroyed) return;
        var dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
        lastT = now;
        if (state === 'playing') update(dt, now);
        else if (state === 'ending') { updateFx(dt * timeScale()); updateFruit(dt * timeScale() * 0.35, false); if (now >= endAt) showOver(); }
        else updateFx(dt);
        draw(now);
        if (wantLoop()) rafId = requestAnimationFrame(frame);
      }
      function update(dt, now) {
        if (readyT > 0) { readyT -= dt; return; }
        var gdt = dt * timeScale();
        elapsed += dt;
        if (mode === 'arcade') {
          var left = Math.ceil(ARCADE_TIME - elapsed);
          if (left !== lastTick) {
            lastTick = left;
            thirdEl.textContent = Math.max(0, left) + ' s';
            if (left <= 5 && left > 0) api.sound('tick');
            if (left === 30 || left === 10) api.status('Score ' + score + ' · ' + left + ' seconds left');
          }
          if (elapsed >= ARCADE_TIME) { endRound('time'); return; }
        }
        /* throw what is due */
        if (elapsed >= nextWaveAt) planWave(elapsed);
        for (var i = 0; i < NQUEUE; i++) { var q = queue[i]; if (q.on && elapsed >= q.at) { q.on = false; launch(q); } }
        updateFruit(gdt, true);
        if (state !== 'playing') return;
        updateFx(gdt);
        /* combos end when a swipe pauses */
        for (i = 0; i < NTRAIL; i++) {
          var tr = trails[i];
          if (tr.hits > 0 && (now - tr.lastHit) / 1000 > COMBO_GAP) { finishCombo(tr.hits, tr.comboX, tr.comboY); tr.hits = 0; }
        }
        if (keyCombo.hits > 0 && elapsed - keyCombo.last > KEY_COMBO_GAP) { finishCombo(keyCombo.hits, keyCombo.x, keyCombo.y); keyCombo.hits = 0; }
        if (statusDirty) flushStatus();
        if (++dataTick % 3 === 0) syncData();
      }
      function updateFruit(dt, live) {
        for (var i = 0; i < NFRUIT; i++) {
          var f = fruits[i];
          if (!f.on) continue;
          f.vy += G * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vrot * dt;
          if (f.vy > 0 && f.y > WH + f.r + 12) {
            f.on = false;
            if (live && !f.cloud && mode === 'classic' && state === 'playing') miss(f);
          }
        }
      }
      function updateFx(dt) {
        var i;
        for (i = 0; i < NHALF; i++) { var hf = halves[i]; if (!hf.on) continue; hf.vy += G * dt; hf.x += hf.vx * dt; hf.y += hf.vy * dt; hf.rot += hf.vrot * dt; if (hf.y > WH + hf.r * 2) hf.on = false; }
        for (i = 0; i < NDROP; i++) { var d = drops[i]; if (!d.on) continue; d.age += dt; d.vy += G * 0.8 * dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.age >= d.life) d.on = false; }
        for (i = 0; i < NSPLAT; i++) { var s = splats[i]; if (!s.on) continue; s.age += dt; if (s.age > 2.2) s.on = false; }
        for (i = 0; i < NFLOAT; i++) { var f = floats[i]; if (!f.on) continue; f.age += dt; if (f.age >= f.life) f.on = false; }
        if (flashT > 0) flashT = Math.max(0, flashT - dt);
        if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
      }
      function miss(f) {
        misses++;
        thirdEl.textContent = misses + ' of 3';
        api.sound('wrong');
        addFloat('Missed!', f.x, WH - 40, 26, C.red, 0.9);
        api.status(misses >= 3 ? 'Three fruit got away!' : 'Missed one! Score ' + score + ' · missed ' + misses + ' of 3');
        if (misses >= 3) endRound('misses');
      }
      function anyFx() {
        var i;
        for (i = 0; i < NHALF; i++) if (halves[i].on) return true;
        for (i = 0; i < NDROP; i++) if (drops[i].on) return true;
        for (i = 0; i < NFLOAT; i++) if (floats[i].on) return true;
        for (i = 0; i < NSPLAT; i++) if (splats[i].on) return true;
        return flashT > 0 || shakeT > 0;
      }
      function trailsLive() {
        var now = performance.now();
        for (var i = 0; i < NTRAIL; i++) if (trails[i].n && now - trails[i].ts[(trails[i].head + TRAIL_LEN - 1) % TRAIL_LEN] < TRAIL_MS) return true;
        return false;
      }
      function wantLoop() { return !destroyed && !document.hidden && (state === 'playing' || state === 'ending' || trailsLive() || anyFx()); }
      function startLoop() { if (!rafId && !destroyed && !document.hidden) { lastT = performance.now(); rafId = requestAnimationFrame(frame); } }
      function stopLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

      /* ---------- drawing ---------- */
      function sprite(sp, x, y, rot, alpha, scale) {
        ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
        if (alpha != null) ctx.globalAlpha = alpha;
        var u = sp.u * (scale || 1);
        ctx.drawImage(sp.cv, -u / 2, -u / 2, u, u);
        ctx.restore();
      }
      function draw(now) {
        if (destroyed || !W) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(bgCanvas, 0, 0);
        var ox = 0, oy = 0;
        if (shakeT > 0 && !reduced) { ox = Math.sin(now * 0.08) * 8 * shakeT; oy = Math.cos(now * 0.11) * 6 * shakeT; }
        ctx.setTransform(S * dpr, 0, 0, S * dpr, ox * dpr, oy * dpr);
        var i;
        for (i = 0; i < NSPLAT; i++) { var s = splats[i]; if (s.on) sprite(splatSprites[s.type], s.x, s.y, s.rot, 0.45 * (1 - s.age / 2.2), s.s); }
        for (i = 0; i < NHALF; i++) { var hf = halves[i]; if (hf.on) sprite(halfSprites[hf.type], hf.x, hf.y, hf.rot); }
        for (i = 0; i < NFRUIT; i++) { var f = fruits[i]; if (f.on) sprite(f.cloud ? cloudSprite : wholeSprites[f.type], f.x, f.y, f.cloud ? Math.sin(f.rot) * 0.15 : f.rot); }
        for (i = 0; i < NDROP; i++) {
          var d = drops[i]; if (!d.on) continue;
          ctx.globalAlpha = 1 - d.age / d.life; ctx.fillStyle = d.col;
          ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (letters) drawLetters();
        drawTrails(now);
        drawFloats();
        drawHud();
        if (readyT > 0 && state === 'playing') bigText('Ready…', WW / 2, WH / 2, 52, C.gold);
        if (flashT > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = rgba(C.ink, Math.min(0.5, flashT * 1.4)); ctx.fillRect(0, 0, canvas.width, canvas.height); }
      }
      function drawLetters() {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '800 26px ' + FONT;
        for (var i = 0; i < NFRUIT; i++) {
          var f = fruits[i];
          if (!f.on || !f.letter) continue;
          ctx.fillStyle = f.cloud ? '#23252e' : '#ffffff';
          ctx.beginPath(); ctx.arc(f.x, f.y, 21, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = f.cloud ? '#ffd23f' : '#23252e'; ctx.stroke();
          ctx.fillStyle = f.cloud ? '#ffd23f' : '#23252e';
          ctx.fillText(f.letter, f.x, f.y + 1);
        }
      }
      /* The blade: a glowing ribbon that is thick at the finger and thin at the tail, fading fast. */
      function drawTrails(now) {
        for (var t = 0; t < NTRAIL; t++) {
          var tr = trails[t];
          if (tr.n < 2) continue;
          var count = 0;
          for (var k = 0; k < tr.n; k++) { if (now - tr.ts[(tr.head - 1 - k + TRAIL_LEN * 2) % TRAIL_LEN] > TRAIL_MS) break; count++; }
          if (count < 2) continue;
          ribbon(tr, count, now, 22, rgba(C.peacock, 0.4));
          ribbon(tr, count, now, 9, C.ink);
        }
      }
      function at(tr, k) { return (tr.head - 1 - k + TRAIL_LEN * 2) % TRAIL_LEN; }
      function ribbon(tr, count, now, maxW, col) {
        ctx.fillStyle = col;
        ctx.beginPath();
        /* down one side from the newest point to the oldest, then back up the other side */
        for (var side = 1; side >= -1; side -= 2) {
          for (var j = 0; j < count; j++) {
            var k = side === 1 ? j : count - 1 - j;
            var idx = at(tr, k), a = at(tr, Math.max(k - 1, 0)), b = at(tr, Math.min(k + 1, count - 1));
            var nx = -(tr.ys[a] - tr.ys[b]), ny = tr.xs[a] - tr.xs[b];
            var l = Math.sqrt(nx * nx + ny * ny) || 1;
            var age = clamp((now - tr.ts[idx]) / TRAIL_MS, 0, 1);
            var w = maxW * (1 - k / count) * (1 - age * 0.5) / 2;
            var x = tr.xs[idx] + nx / l * w * side, y = tr.ys[idx] + ny / l * w * side;
            if (side === 1 && j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
        }
        ctx.closePath(); ctx.fill();
        /* a round tip at the finger */
        var hi = at(tr, 0);
        ctx.beginPath(); ctx.arc(tr.xs[hi], tr.ys[hi], maxW / 2 * (1 - clamp((now - tr.ts[hi]) / TRAIL_MS, 0, 1) * 0.5), 0, Math.PI * 2); ctx.fill();
      }
      function bigText(text, x, y, size, col, alpha) {
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.font = '800 ' + size + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.2; ctx.strokeStyle = rgba(C.bg, 0.85); ctx.strokeText(text, x, y);
        ctx.fillStyle = col; ctx.fillText(text, x, y);
        ctx.globalAlpha = 1;
      }
      function drawFloats() {
        for (var i = 0; i < NFLOAT; i++) {
          var f = floats[i];
          if (!f.on) continue;
          var k = f.age / f.life;
          bigText(f.text, f.x, f.y - (reduced ? 0 : k * 40), f.size * (reduced ? 1 : 1 + 0.15 * (1 - k)), f.col, 1 - k * k);
        }
      }
      var hudScore = '0', hudBest = 'Best 0';
      var timeLabels = [];
      for (var tl = 0; tl <= ARCADE_TIME; tl++) timeLabels.push('0:' + (tl < 10 ? '0' : '') + tl);
      timeLabels[60] = '1:00';
      function drawHud() {
        /* the score, top left */
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = '800 56px ' + FONT;
        ctx.lineJoin = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = rgba(C.bg, 0.8);
        ctx.strokeText(hudScore, 22, 66); ctx.fillStyle = C.gold; ctx.fillText(hudScore, 22, 66);
        ctx.font = '700 22px ' + FONT; ctx.lineWidth = 6;
        ctx.strokeText(hudBest, 24, 96); ctx.fillStyle = C.muted; ctx.fillText(hudBest, 24, 96);
        if (state === 'idle') return;
        if (mode === 'classic') {
          /* three crosses, top right: faint until a fruit is missed, then big and red */
          ctx.lineCap = 'round';
          for (var i = 0; i < 3; i++) {
            var cx = WW - 34 - (2 - i) * 44, cy = 44, used = i < misses, s = used ? 15 : 12;
            ctx.strokeStyle = rgba(C.bg, 0.8); ctx.lineWidth = used ? 15 : 11;
            ctx.beginPath(); ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s); ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s); ctx.stroke();
            ctx.strokeStyle = used ? C.red : rgba(C.ink, 0.35); ctx.lineWidth = used ? 8 : 5;
            ctx.beginPath(); ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s); ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s); ctx.stroke();
          }
        } else {
          var left = clamp(Math.ceil(ARCADE_TIME - elapsed), 0, ARCADE_TIME);
          ctx.textAlign = 'right';
          ctx.font = '800 44px ' + FONT; ctx.lineWidth = 8; ctx.strokeStyle = rgba(C.bg, 0.8);
          ctx.strokeText(timeLabels[left], WW - 22, 60); ctx.fillStyle = left <= 5 ? C.red : C.ink; ctx.fillText(timeLabels[left], WW - 22, 60);
        }
      }

      /* ---------- game flow ---------- */
      function clearAll() {
        var i;
        for (i = 0; i < NFRUIT; i++) fruits[i].on = false;
        for (i = 0; i < NHALF; i++) halves[i].on = false;
        for (i = 0; i < NDROP; i++) drops[i].on = false;
        for (i = 0; i < NSPLAT; i++) splats[i].on = false;
        for (i = 0; i < NFLOAT; i++) floats[i].on = false;
        for (i = 0; i < NQUEUE; i++) queue[i].on = false;
        for (i = 0; i < NTRAIL; i++) { trails[i].n = 0; trails[i].hits = 0; trails[i].id = null; trails[i].down = false; }
        keyCombo.hits = 0;
      }
      function scoreChanged() {
        hudScore = String(score);
        scoreEl.textContent = hudScore;
        statusDirty = true;
        flushStatus();
      }
      /* The status line is read aloud, so it changes at most about once a second; the last change is never lost. */
      function flushStatus() {
        var now = performance.now();
        if (statusDirty && now - statusAt > 900) { statusAt = now; statusDirty = false; api.status(statusLine()); }
      }
      function statusLine() {
        if (mode === 'arcade') return 'Score ' + score + ' · ' + Math.max(0, Math.ceil(ARCADE_TIME - elapsed)) + ' seconds left';
        return 'Score ' + score + ' · missed ' + misses + ' of 3';
      }
      function refreshBest() { var b = bestNow(); bestEl.textContent = String(b); hudBest = 'Best ' + b; }
      function resetCounters() {
        score = 0; misses = 0; elapsed = 0; waves = 0; nextWaveAt = 0.6; lastTick = -1; flashT = 0; shakeT = 0; readyT = 0; statusDirty = false;
        hudScore = '0'; scoreEl.textContent = '0';
        refreshBest();
        thirdLabel.textContent = mode === 'arcade' ? 'Time' : 'Misses';
        thirdEl.textContent = mode === 'arcade' ? ARCADE_TIME + ' s' : '0 of 3';
      }
      function newGame() {
        stopLoop();
        clearAll();
        resetCounters();
        state = 'idle';
        setSlicing(false);
        pauseBtn.disabled = true; pauseBtn.textContent = 'Pause';
        modeSeg.hidden = false;
        ovTitle.replaceChildren('Fruit ', h('span', null, 'Slice'));
        ovMsg.textContent = mode === 'arcade'
          ? 'Slice as much fruit as you can in 60 seconds. Never slice the grumpy cloud!'
          : 'Swipe through the fruit to slice it. Do not let three fall, and never slice the grumpy cloud!';
        ovSub.textContent = 'Best (' + bestLabel() + '): ' + bestNow();
        ovBtn.textContent = '▶ Start';
        overlay.hidden = false;
        fitCard();
        api.status('Press Start. Swipe through the fruit to slice it.');
        canvas.setAttribute('aria-label', 'Fruit Slice. Fruit will be tossed up from the bottom of the screen.');
        syncData();
        draw(performance.now());
      }
      function start() {
        api.unlockSound();
        stopLoop();
        clearAll();
        resetCounters();
        state = 'playing';
        overlay.hidden = true;
        pauseBtn.disabled = false; pauseBtn.textContent = 'Pause';
        setSlicing(true);
        api.sound('whoosh');
        api.status(letters ? 'Press the letter on each fruit to slice it.' : 'Swipe through the fruit to slice it!');
        canvas.setAttribute('aria-label', 'Fruit is flying up the screen.' + (letters ? ' Each fruit wears a letter: press it to slice.' : ' Swipe through it to slice.'));
        focusGame();
        syncData();
        startLoop();
      }
      function endRound(reason) {
        if (state !== 'playing') return;
        /* a combo still in the air counts, unless the cloud ended it */
        for (var i = 0; i < NTRAIL; i++) { if (trails[i].hits > 0 && reason !== 'cloud') finishCombo(trails[i].hits, trails[i].comboX, trails[i].comboY); trails[i].hits = 0; }
        if (keyCombo.hits > 0 && reason !== 'cloud') finishCombo(keyCombo.hits, keyCombo.x, keyCombo.y);
        keyCombo.hits = 0;
        endReason = reason;
        state = 'ending';
        endAt = performance.now() + (reason === 'cloud' ? 1300 : 900);
        pauseBtn.disabled = true;
        setSlicing(false);
        if (reason === 'time') { api.sound('bell'); addFloat('Time!', WW / 2, WH / 2, 64, C.gold, 1.2); }
        else if (reason === 'misses') addFloat('Round over', WW / 2, WH / 2, 56, C.ink, 1.2);
        var isBest = score > bestNow();
        if (isBest) api.store.set(bestKey(), score);
        lastBest = isBest;
        refreshBest();
        api.status(reasonText(reason) + ' Score ' + score + '.' + (isBest ? ' A new best!' : ' Best: ' + bestNow() + '.'));
        if (isBest) api.celebrate('New best: ' + score + '!'); else api.sound('lose');
        syncData();
      }
      function reasonText(r) { return r === 'cloud' ? 'You sliced the grumpy cloud!' : r === 'time' ? 'Time is up!' : 'Three fruit got away!'; }
      function showOver() {
        state = 'over';
        modeSeg.hidden = false;
        ovTitle.textContent = lastBest ? 'New best!' : endReason === 'time' ? 'Time!' : 'Round over';
        ovMsg.textContent = reasonText(endReason) + ' You scored ' + score + '. ' + (lastBest ? 'That is your best yet!' : kind());
        ovSub.textContent = 'Best (' + bestLabel() + '): ' + bestNow();
        ovBtn.textContent = '▶ Play again';
        overlay.hidden = false;
        fitCard();
        api.status(reasonText(endReason) + ' Score ' + score + '. Press Play again.');
        canvas.setAttribute('aria-label', 'The round is over. You scored ' + score + '.');
        syncData();
        if (document.activeElement === canvas) { try { ovBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      }
      function kind() {
        if (endReason === 'cloud') return 'Watch for the cloud’s grumpy face.';
        if (score > 0 && score >= bestNow() * 0.8) return 'So close to your best!';
        return 'Long, fast swipes slice more at once.';
      }
      function overlayAction() { if (state === 'paused') resume(); else start(); }
      function togglePause() { if (state === 'playing') pause(); else if (state === 'paused') resume(); }
      function pause() {
        if (state !== 'playing') return;
        state = 'paused';
        stopLoop();
        setSlicing(false);
        endStrokes();
        pauseBtn.textContent = 'Resume';
        modeSeg.hidden = true;   /* the mode can change once this round is over */
        ovTitle.textContent = 'Paused';
        ovMsg.textContent = 'The fruit will wait in the air for you.';
        ovSub.textContent = 'Score so far: ' + score;
        ovBtn.textContent = '▶ Resume';
        overlay.hidden = false;
        fitCard();
        api.status('Paused. Score ' + score + '. Press Resume.');
        syncData();
        draw(performance.now());
      }
      function resume() {
        if (state !== 'paused') return;
        state = 'playing';
        readyT = 0.7;
        overlay.hidden = true;
        pauseBtn.textContent = 'Pause';
        setSlicing(true);
        api.status(statusLine());
        focusGame();
        syncData();
        startLoop();
      }
      function setMode(k) {
        if (!MODES[k] || (state !== 'idle' && state !== 'over')) return;
        mode = k; api.store.set('mode', k);
        MODE_KEYS.forEach(function (x) { modeBtns[x].setAttribute('aria-pressed', String(x === k)); });
        api.sound('click');
        if (state === 'idle' || state === 'over') newGame();
      }
      function setLetters(on, fromButton) {
        letters = !!on;
        api.store.set('letters', letters);
        [keysCard, keysBar].forEach(function (b) { b.setAttribute('aria-pressed', String(letters)); b.firstChild.textContent = letters ? '✓' : ''; });
        for (var i = 0; i < NFRUIT; i++) fruits[i].letter = '';
        if (letters) for (var j = 0; j < NFRUIT; j++) if (fruits[j].on) fruits[j].letter = pickLetter();
        if (fromButton) api.sound('click');
        api.announce(letters ? 'Letter keys on. Press the letter on a fruit to slice it.' : 'Letter keys off. Swipe to slice.');
        if (state === 'idle' || state === 'over') { refreshBest(); ovSub.textContent = 'Best (' + bestLabel() + '): ' + bestNow(); }
        if (state === 'playing') canvas.setAttribute('aria-label', 'Fruit is flying up the screen.' + (letters ? ' Each fruit wears a letter: press it to slice.' : ' Swipe through it to slice.'));
        syncData();
        draw(performance.now());
      }
      function fitCard() {
        ovMsg.hidden = false;
        var card = ovMsg.parentNode;
        if (card && card.scrollHeight > card.clientHeight + 1) ovMsg.hidden = true;
      }
      function setSlicing(on) { device.classList.toggle('is-slicing', !!on); }
      function focusGame() { try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      /* Read-only numbers for the automated test: fruit positions in CSS pixels. */
      function syncData() {
        var d = canvas.dataset, list = '';
        for (var i = 0; i < NFRUIT; i++) {
          var f = fruits[i];
          if (!f.on) continue;
          list += (list ? ';' : '') + Math.round(f.x * S) + ',' + Math.round(f.y * S) + ',' + Math.round(f.r * S) + ',' + (f.letter || '-') + ',' + (f.cloud ? 1 : 0);
        }
        d.state = state; d.score = String(score); d.misses = String(misses); d.fruit = list; d.mode = mode; d.letters = String(letters);
        d.time = mode === 'arcade' ? String(Math.max(0, Math.ceil(ARCADE_TIME - elapsed))) : '';
      }

      /* ---------- input: swipes ---------- */
      var rect = { left: 0, top: 0 };
      function trailFor(id) { for (var i = 0; i < NTRAIL - 1; i++) if (trails[i].down && trails[i].id === id) return trails[i]; return null; }
      function addPoint(tr, x, y, t) {
        tr.xs[tr.head] = x; tr.ys[tr.head] = y; tr.ts[tr.head] = t;
        tr.head = (tr.head + 1) % TRAIL_LEN; if (tr.n < TRAIL_LEN) tr.n++;
        tr.lastX = x; tr.lastY = y;
      }
      function onDown(e) {
        if (state !== 'playing') return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        api.unlockSound();
        var r = canvas.getBoundingClientRect(); rect.left = r.left; rect.top = r.top;
        var tr = null;
        for (var i = 0; i < NTRAIL - 1; i++) if (!trails[i].down) { tr = trails[i]; break; }
        if (!tr) return;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        tr.down = true; tr.id = e.pointerId; tr.n = 0; tr.hits = 0; tr.whooshed = false;
        addPoint(tr, (e.clientX - rect.left) / S, (e.clientY - rect.top) / S, performance.now());
      }
      function onMove(e) {
        var tr = trailFor(e.pointerId);
        if (!tr) return;
        e.preventDefault();
        var list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
        if (!list || !list.length) list = [e];
        var now = performance.now();
        for (var i = 0; i < list.length; i++) {
          var x = (list[i].clientX - rect.left) / S, y = (list[i].clientY - rect.top) / S, x1 = tr.lastX, y1 = tr.lastY;
          sliceAlong(tr, x1, y1, x, y, now);
          if (!tr.whooshed && (x - x1) * (x - x1) + (y - y1) * (y - y1) > 900) { tr.whooshed = true; api.sound('whoosh'); }
          addPoint(tr, x, y, now);
        }
        startLoop();
      }
      function onUp(e) {
        var tr = trailFor(e.pointerId);
        if (!tr) return;
        tr.down = false; tr.id = null;
        if (tr.hits > 0) { finishCombo(tr.hits, tr.comboX, tr.comboY); tr.hits = 0; }
      }
      function endStrokes() { for (var i = 0; i < NTRAIL; i++) { if (trails[i].hits > 0) finishCombo(trails[i].hits, trails[i].comboX, trails[i].comboY); trails[i].hits = 0; trails[i].down = false; trails[i].id = null; } }

      /* ---------- input: letter keys ---------- */
      function sliceByLetter(l) {
        for (var i = 0; i < NFRUIT; i++) {
          var f = fruits[i];
          if (!f.on || f.letter !== l) continue;
          /* draw a quick blade stroke across it, then slice along that stroke */
          var a = -0.9 + rnd() * 1.8 + (rnd() < 0.5 ? 0 : Math.PI), tr = trails[NTRAIL - 1], now = performance.now();
          var ux = Math.cos(a), uy = Math.sin(a), len = f.r * 1.6;
          tr.n = 0;
          for (var k = 0; k <= 8; k++) addPoint(tr, f.x - ux * len + ux * 2 * len * k / 8, f.y - uy * len + uy * 2 * len * k / 8, now - (8 - k) * 9);
          api.sound('whoosh');
          if (f.cloud) { hitCloud(f); return true; }
          slice(f, a, ux, uy);
          keyCombo.hits++; keyCombo.last = elapsed; keyCombo.x = f.x; keyCombo.y = f.y;
          comboTone(keyCombo.hits);
          startLoop();
          return true;
        }
        return false;
      }
      function onKey(e) {
        if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
        var tgt = e.target, k = e.key || '';
        if (tgt && tgt.closest && tgt.closest('input, select, textarea')) return;
        if ((k === 'p' || k === 'P' || k === 'Escape') && (state === 'playing' || state === 'paused')) { e.preventDefault(); togglePause(); return; }
        if (state !== 'playing' || k.length !== 1) return;
        var l = k.toUpperCase();
        if (LETTERS.indexOf(l) < 0) return;
        e.preventDefault();
        if (!letters) { setLetters(true, false); api.status('Letter keys on: press the letter on a fruit to slice it.'); return; }
        if (readyT > 0 || e.repeat) return;
        sliceByLetter(l);
      }
      function onVisibility() {
        if (document.hidden) { if (state === 'playing') pause(); stopLoop(); }
        else draw(performance.now());
      }
      function noMenu(e) { e.preventDefault(); }
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('lostpointercapture', onUp);
      canvas.addEventListener('contextmenu', noMenu);
      document.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onVisibility);

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
      maybeResize();
      newGame();

      return {
        destroy: function () {
          destroyed = true;
          stopLoop();
          if (ro) ro.disconnect();
          window.removeEventListener('resize', maybeResize);
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }
  });
})();
