/* Gem Swap for Games in Time, in the 2000s hall.

   Swap two gems that sit side by side to make a line of three or more of the same gem. The line vanishes, the gems
   above fall down, new gems drop in from the top, and any new lines they make vanish too: a cascade, worth more
   points each time. A line of four (or an L or T shape) makes a bomb gem that blows up its eight neighbours when it
   is matched. A line of five makes a prism gem: swap it with any gem and every gem of that colour vanishes.

   The mechanic is the match-three game from 2001 (PopCap Games' Bejeweled, which began on the web as Diamond Mine).
   The gems, the names, the look and the sounds here are our own: seven shapes that each have their own colour AND
   their own outline (square, hexagon, star, diamond, circle, triangle, heart), so you can play without telling
   colours apart. The glossy aqua case is a nod to the see-through plastic computers of 1998 to 2001.

   Modes: Classic (play until there are no swaps left), Timed (90 seconds) and Calm (no clock, no game over).
   If the board runs out of swaps in Timed or Calm, it shuffles. A new or shuffled board never has a ready-made line,
   and always has at least one swap.

   How it is built: the board is two small arrays (which gem, and what kind), drawn on one canvas. Gem pictures are
   drawn once into small hidden canvases ("sprites") whenever the board changes size, so each frame only copies
   pictures. Particles live in fixed-size typed arrays, so nothing new is created while the board animates.
   The canvas carries data-board, data-kinds, data-moves and data-phase for the automated check.
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  var N = 8, CELLS = 64, COLOURS = 7, PRISM_TYPE = 7;
  var NORMAL = 0, BOMB = 1, PRISM = 2;
  var HINT_AFTER = 8000;           /* show a hint after 8 seconds of doing nothing */
  var TIMED_MS = 90000;

  /* The seven gems. Each has its own shape as well as its own colour. */
  var GEMS = [
    { name: 'red square', fill: '#ff3a5e', dark: '#9e0f2b', light: '#ffc7d1', shape: 'square' },
    { name: 'orange hexagon', fill: '#ff9a1a', dark: '#a85500', light: '#ffe0ae', shape: 'hexagon' },
    { name: 'yellow star', fill: '#ffe033', dark: '#a88a00', light: '#fff8c2', shape: 'star' },
    { name: 'green diamond', fill: '#2fe07a', dark: '#0d7f39', light: '#c4ffd8', shape: 'diamond' },
    { name: 'blue circle', fill: '#33a6ff', dark: '#0a55a3', light: '#c8e8ff', shape: 'circle' },
    { name: 'purple triangle', fill: '#b35cff', dark: '#5f1aa8', light: '#ead1ff', shape: 'triangle' },
    { name: 'white heart', fill: '#e9f0ff', dark: '#7d8db0', light: '#ffffff', shape: 'heart' }
  ];
  var MODES = {
    classic: { name: 'Classic', about: 'Play until there are no swaps left. Fill the bar to go up a level.' },
    timed: { name: 'Timed', about: '90 seconds on the clock. Score as much as you can. No swaps left? The board shuffles.' },
    calm: { name: 'Calm', about: 'No clock and no game over. No swaps left? The board shuffles. Just swap and relax.' }
  };
  var MODE_KEYS = ['classic', 'timed', 'calm'];
  /* the notes the cascades play: a major pentatonic scale that climbs with every cascade */
  var SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];
  /* the board's two background colours for each Classic level */
  var LEVEL_TINTS = [['#0b2346', '#0e2b55'], ['#123a4a', '#16485a'], ['#2a1f4f', '#33275f'], ['#123d2e', '#174a39'], ['#3d1838', '#4a1e44'], ['#3a2c10', '#463614']];

  function rc(i) { return { r: Math.floor(i / N), c: i % N }; }
  function fmtScore(n) { return Math.round(n).toLocaleString('en-AU'); }

  /* ======================= THE RULES (plain arrays, no drawing) ======================= */

  /* How long the line of matching gems through square i is, across (dr 0, dc 1) or down (dr 1, dc 0). */
  function lineLength(t, i, dr, dc) {
    var ty = t[i];
    if (ty < 0 || ty >= COLOURS) return 0;
    var r = Math.floor(i / N), c = i % N, len = 1, rr, cc;
    for (rr = r + dr, cc = c + dc; rr < N && cc < N && t[rr * N + cc] === ty; rr += dr, cc += dc) len++;
    for (rr = r - dr, cc = c - dc; rr >= 0 && cc >= 0 && t[rr * N + cc] === ty; rr -= dr, cc -= dc) len++;
    return len;
  }
  function makesLine(t, i) { return lineLength(t, i, 0, 1) >= 3 || lineLength(t, i, 1, 0) >= 3; }
  function anyLine(t) { for (var i = 0; i < CELLS; i++) if (makesLine(t, i)) return true; return false; }
  function swapIn(t, k, a, b) { var x = t[a]; t[a] = t[b]; t[b] = x; x = k[a]; k[a] = k[b]; k[b] = x; }
  /* A swap is allowed if it makes a line, or if one of the two gems is a prism. To check, the computer makes the
     swap, looks for a line through either square, and swaps back. */
  function swapWorks(t, k, a, b) {
    if (t[a] < 0 || t[b] < 0) return false;
    if (k[a] === PRISM || k[b] === PRISM) return true;
    swapIn(t, k, a, b);
    var ok = makesLine(t, a) || makesLine(t, b);
    swapIn(t, k, a, b);
    return ok;
  }
  /* Every swap that works, as pairs [a, b]. Only right and down neighbours are tried, so each pair appears once. */
  function findMoves(t, k) {
    var out = [];
    for (var i = 0; i < CELLS; i++) {
      if (i % N < N - 1 && swapWorks(t, k, i, i + 1)) out.push([i, i + 1]);
      if (i < CELLS - N && swapWorks(t, k, i, i + N)) out.push([i, i + N]);
    }
    return out;
  }
  /* Every straight line of 3 or more, as {cells, colour, across}. Pass 0 reads the rows, pass 1 the columns. */
  function findRuns(t) {
    var runs = [];
    for (var pass = 0; pass < 2; pass++) {
      for (var a = 0; a < N; a++) {
        var b = 0;
        while (b < N) {
          var ty = t[pass ? b * N + a : a * N + b], len = 1;
          if (ty >= 0 && ty < COLOURS) {
            while (b + len < N && t[pass ? (b + len) * N + a : a * N + b + len] === ty) len++;
            if (len >= 3) {
              var cells = [];
              for (var j = 0; j < len; j++) cells.push(pass ? (b + j) * N + a : a * N + b + j);
              runs.push({ cells: cells, colour: ty, across: !pass });
            }
          }
          b += len;
        }
      }
    }
    return runs;
  }
  /* Fills the empty squares (type -1) with random gems, one by one, never picking a gem that would finish a line of
     three. Then it checks the whole board has no line and at least one swap; if not, it starts again. Special gems
     already on the board are kept where they are. */
  function fillFresh(t, k, rand) {
    var keep = [], i;
    for (i = 0; i < CELLS; i++) keep[i] = t[i] >= 0 && k[i] !== NORMAL;
    for (var tries = 0; tries < 500; tries++) {
      for (i = 0; i < CELLS; i++) if (!keep[i]) { t[i] = -1; k[i] = NORMAL; }
      var failed = false;
      for (i = 0; i < CELLS && !failed; i++) {
        if (t[i] >= 0) continue;
        var start = Math.floor(rand() * COLOURS), placed = false;
        for (var s = 0; s < COLOURS; s++) {
          t[i] = (start + s) % COLOURS;
          if (!makesLine(t, i)) { placed = true; break; }
        }
        if (!placed) failed = true;
      }
      if (!failed && !anyLine(t) && findMoves(t, k).length) return true;
    }
    return false;
  }

  /* ======================= DRAWING THE GEMS ======================= */
  /* s is the gem's radius. Every path is centred on 0, 0. */
  function shapePath(c, shape, s) {
    c.beginPath();
    if (shape === 'circle') { c.arc(0, 0, s * 0.92, 0, Math.PI * 2); return; }
    if (shape === 'heart') {
      c.moveTo(0, s * 0.9);
      c.bezierCurveTo(-s * 1.15, s * 0.05, -s * 0.85, -s * 0.95, 0, -s * 0.42);
      c.bezierCurveTo(s * 0.85, -s * 0.95, s * 1.15, s * 0.05, 0, s * 0.9);
      c.closePath();
      return;
    }
    var pts = polygon(shape, s);
    for (var i = 0; i < pts.length; i += 2) { if (i) c.lineTo(pts[i], pts[i + 1]); else c.moveTo(pts[i], pts[i + 1]); }
    c.closePath();
  }
  function polygon(shape, s) {
    var p = [], i, a;
    if (shape === 'square') { var q = s * 0.8; return [-q, -q, q, -q, q, q, -q, q]; }
    if (shape === 'diamond') return [0, -s, s * 0.78, 0, 0, s, -s * 0.78, 0];
    if (shape === 'triangle') return [0, -s * 0.95, s * 0.98, s * 0.75, -s * 0.98, s * 0.75];
    if (shape === 'hexagon') { for (i = 0; i < 6; i++) { a = Math.PI / 3 * i; p.push(Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95); } return p; }
    if (shape === 'star') { for (i = 0; i < 10; i++) { a = -Math.PI / 2 + Math.PI / 5 * i; var rr = i % 2 ? s * 0.48 : s * 1.02; p.push(Math.cos(a) * rr, Math.sin(a) * rr + s * 0.06); } return p; }
    return p;
  }
  /* Draws one glossy gem into a sprite canvas px pixels wide. */
  function drawGem(c, g, px, kind) {
    var s = px * 0.4, i;
    c.save();
    c.translate(px / 2, px / 2);
    if (kind === BOMB) {
      /* a glowing halo behind the gem */
      var halo = c.createRadialGradient(0, 0, s * 0.4, 0, 0, px * 0.5);
      halo.addColorStop(0, 'rgba(255, 255, 255, .95)'); halo.addColorStop(0.55, g.fill); halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
      c.fillStyle = halo; c.beginPath(); c.arc(0, 0, px * 0.5, 0, Math.PI * 2); c.fill();
      s *= 0.86;
    }
    var grad = c.createLinearGradient(-s, -s, s, s);
    grad.addColorStop(0, g.light); grad.addColorStop(0.45, g.fill); grad.addColorStop(1, g.dark);
    shapePath(c, g.shape, s);
    c.fillStyle = grad; c.fill();
    c.lineWidth = Math.max(1, px * 0.03); c.strokeStyle = g.dark; c.stroke();
    /* facets: a smaller copy of the shape in the middle (the "table" of a cut gem), joined to the corners */
    c.save();
    c.scale(0.52, 0.52);
    shapePath(c, g.shape, s);
    var inner = c.createLinearGradient(-s, -s, s, s);
    inner.addColorStop(0, g.light); inner.addColorStop(1, g.fill);
    c.fillStyle = inner; c.globalAlpha = 0.85; c.fill();
    c.restore();
    c.beginPath();
    if (g.shape === 'circle') {
      for (i = 0; i < 8; i++) { var a = Math.PI / 4 * i; c.moveTo(Math.cos(a) * s * 0.48, Math.sin(a) * s * 0.48); c.lineTo(Math.cos(a) * s * 0.9, Math.sin(a) * s * 0.9); }
    } else if (g.shape !== 'heart') {
      var outer = polygon(g.shape, s);
      for (i = 0; i < outer.length; i += 2) { c.moveTo(outer[i], outer[i + 1]); c.lineTo(outer[i] * 0.52, outer[i + 1] * 0.52); }
    }
    c.strokeStyle = 'rgba(255, 255, 255, .45)'; c.lineWidth = Math.max(1, px * 0.016); c.stroke();
    /* the Y2K gloss: a white shine across the top, and a bright dot */
    c.save();
    shapePath(c, g.shape, s);
    c.clip();
    var gloss = c.createLinearGradient(0, -s, 0, 0);
    gloss.addColorStop(0, 'rgba(255, 255, 255, .75)'); gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = gloss;
    c.beginPath(); c.ellipse(-s * 0.1, -s * 0.55, s * 0.95, s * 0.5, -0.3, 0, Math.PI * 2); c.fill();
    c.restore();
    c.fillStyle = 'rgba(255, 255, 255, .95)';
    c.beginPath(); c.arc(-s * 0.38, -s * 0.42, Math.max(1, s * 0.1), 0, Math.PI * 2); c.fill();
    /* a white four-point spark marks a bomb, so a bomb never relies on its glow alone */
    if (kind === BOMB) sparkle(c, 0, 0, s * 0.42, '#ffffff', g.dark);
    c.restore();
  }
  function sparkle(c, x, y, r, fill, line) {
    c.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = -Math.PI / 2 + Math.PI / 4 * i, rr = i % 2 ? r * 0.3 : r;
      if (i) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
    c.fillStyle = fill; c.fill();
    if (line) { c.lineWidth = Math.max(1, r * 0.12); c.strokeStyle = line; c.stroke(); }
  }
  /* The prism gem: a ball with all seven colours, a dark outline and a white spark. */
  function drawPrism(c, px) {
    var s = px * 0.4;
    c.save();
    c.translate(px / 2, px / 2);
    for (var i = 0; i < COLOURS; i++) {
      c.beginPath(); c.moveTo(0, 0);
      c.arc(0, 0, s, -Math.PI / 2 + i * Math.PI * 2 / COLOURS, -Math.PI / 2 + (i + 1) * Math.PI * 2 / COLOURS);
      c.closePath(); c.fillStyle = GEMS[i].fill; c.fill();
    }
    var shade = c.createRadialGradient(-s * 0.3, -s * 0.35, s * 0.1, 0, 0, s);
    shade.addColorStop(0, 'rgba(255, 255, 255, .7)'); shade.addColorStop(0.5, 'rgba(255, 255, 255, .05)'); shade.addColorStop(1, 'rgba(0, 0, 40, .45)');
    c.beginPath(); c.arc(0, 0, s, 0, Math.PI * 2); c.fillStyle = shade; c.fill();
    c.lineWidth = Math.max(1.5, px * 0.04); c.strokeStyle = '#0a1630'; c.stroke();
    sparkle(c, 0, 0, s * 0.55, '#ffffff', '#0a1630');
    c.restore();
  }

  var CSS = [
    '.game-gem-swap { --gs-aqua: #3fd0ff; --gs-deep: #04182c; --gs-lime: #b4f000; --gs-pink: #ff6ec7; --gs-chrome: linear-gradient(180deg, #ffffff, #d4dde6 48%, #b4c2cf 52%, #e6edf3); color: var(--ink); }',
    /* the see-through aqua case */
    '.game-gem-swap .gs-shell { position: relative; width: min(100%, 640px); margin: 0 auto; padding: clamp(10px, 2.5vw, 20px); border-radius: 30px; isolation: isolate;' +
    ' background: linear-gradient(160deg, rgba(120, 225, 255, .55), rgba(0, 149, 182, .45) 45%, rgba(10, 90, 140, .6)); border: 1px solid rgba(255, 255, 255, .55);' +
    ' box-shadow: inset 0 2px 0 rgba(255, 255, 255, .7), inset 0 -10px 30px rgba(0, 40, 80, .35), 0 24px 60px rgba(0, 0, 0, .5), 0 0 0 1px rgba(0, 0, 0, .25); }',
    '.game-gem-swap .gs-shell::before { content: ""; position: absolute; inset: 4px 10% auto 10%; height: 42px; border-radius: 0 0 50% 50% / 0 0 100% 100%; background: linear-gradient(180deg, rgba(255, 255, 255, .55), rgba(255, 255, 255, 0)); pointer-events: none; z-index: -1; }',
    '.game-gem-swap .gs-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem .8rem; margin-bottom: .6rem; }',
    '.game-gem-swap .gs-logo { margin: 0; font-family: var(--font-poster, "Arial Black", sans-serif); font-weight: 900; font-size: clamp(1.35rem, 1rem + 2vw, 2rem); letter-spacing: .06em; line-height: 1; color: #fff;' +
    ' background: linear-gradient(180deg, #ffffff 0%, #dff6ff 45%, #7fe0ff 55%, #ffffff 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 2px 0 rgba(0, 50, 90, .8)); }',
    '.game-gem-swap .gs-hud { display: flex; gap: .4rem; margin: 0; }',
    '.game-gem-swap .gs-lcd { display: grid; justify-items: end; min-width: 4.6rem; padding: .2rem .55rem .25rem; border-radius: 10px; background: var(--gs-deep); box-shadow: inset 0 2px 6px rgba(0, 0, 0, .8), 0 1px 0 rgba(255, 255, 255, .45); }',
    '.game-gem-swap .gs-lcd span { font: 700 .62rem/1.2 var(--font-body); letter-spacing: .14em; text-transform: uppercase; color: #8fdcff; }',
    '.game-gem-swap .gs-lcd b { font: 700 1.15rem/1.1 var(--font-poster, ui-monospace, monospace); color: var(--gs-aqua); font-variant-numeric: tabular-nums; text-shadow: 0 0 8px rgba(63, 208, 255, .6); }',
    '.game-gem-swap .gs-lcd.is-bump b { color: var(--gs-lime); }',
    '.game-gem-swap .gs-bar { position: relative; height: 18px; margin: 0 0 .6rem; border-radius: 999px; background: var(--gs-deep); box-shadow: inset 0 2px 5px rgba(0, 0, 0, .8), 0 1px 0 rgba(255, 255, 255, .45); overflow: hidden; }',
    '.game-gem-swap .gs-bar i { position: absolute; inset: 2px auto 2px 2px; width: 0; border-radius: 999px; background: linear-gradient(180deg, #e9ffb0, var(--gs-lime) 50%, #6fa000); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .8); transition: width .3s ease; }',
    '.game-gem-swap .gs-bar.is-clock i { transition: width 1s linear; }',
    '.game-gem-swap .gs-bar.is-low i { background: linear-gradient(180deg, #ffd0ea, var(--gs-pink) 50%, #b0287a); }',
    '.game-gem-swap .gs-bar em { position: absolute; inset: 0; display: grid; place-items: center; font: 700 .68rem/1 var(--font-body); letter-spacing: .12em; text-transform: uppercase; font-style: normal; color: #fff; text-shadow: 0 1px 2px #000, 0 0 4px #000; }',
    /* the board and the card are stacked in one grid cell, so a tall card on a small phone makes the screen grow rather than get cut off */
    '.game-gem-swap .gs-screen { position: relative; display: grid; border-radius: 16px; overflow: hidden; background: var(--gs-deep); box-shadow: inset 0 0 0 2px rgba(0, 0, 0, .45), 0 0 0 3px rgba(255, 255, 255, .35); }',
    '.game-gem-swap .gs-screen > * { grid-area: 1 / 1; }',
    '.game-gem-swap .gs-canvas { display: block; align-self: start; width: 100%; aspect-ratio: 1; touch-action: auto; cursor: pointer; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }',
    /* the board only holds the page still while a game is running, so a phone can scroll past it otherwise */
    '.game-gem-swap .is-running .gs-canvas { touch-action: none; }',
    '.game-gem-swap .gs-canvas:focus { outline: none; }',
    '.game-gem-swap .gs-canvas:focus-visible { outline: 3px solid var(--gs-lime); outline-offset: -3px; }',
    '.game-gem-swap .gs-overlay { position: relative; z-index: 1; display: grid; place-items: center; padding: 10px; background: rgba(2, 14, 30, .62); }',
    '.game-gem-swap .gs-card { width: min(100%, 25rem); display: grid; gap: .55rem; justify-items: center; text-align: center; padding: .9rem 1rem 1rem; border-radius: 22px; color: #eef7ff;' +
    ' background: linear-gradient(170deg, rgba(40, 120, 170, .94), rgba(8, 40, 75, .96)); border: 1px solid rgba(255, 255, 255, .5); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .6), 0 12px 30px rgba(0, 0, 0, .5); }',
    '.game-gem-swap .gs-card-title { margin: 0; font-family: var(--font-poster, "Arial Black", sans-serif); font-weight: 900; font-size: clamp(1.4rem, 1.1rem + 1.6vw, 2rem); letter-spacing: .05em; line-height: 1.05; }',
    '.game-gem-swap .gs-card-msg { margin: 0; font-weight: 600; line-height: 1.35; }',
    '.game-gem-swap .gs-card-msg:empty { display: none; }',
    '.game-gem-swap .gs-card-sub { margin: 0; font-size: .92rem; color: #b9dcf2; line-height: 1.35; }',
    '.game-gem-swap .gs-card .seg { background: rgba(0, 20, 40, .6); border-color: rgba(255, 255, 255, .45); }',
    '.game-gem-swap .gs-card .seg button { color: #dff3ff; padding-inline: .75rem; }',
    '.game-gem-swap .gs-card .seg button + button { border-left-color: rgba(255, 255, 255, .35); }',
    '.game-gem-swap .gs-card .seg button[aria-pressed="true"] { background: var(--gs-lime); color: #0d1a00; }',
    /* chrome pill buttons */
    '.game-gem-swap .gs-btn { display: inline-flex; align-items: center; justify-content: center; gap: .35rem; min-height: 44px; padding: .45rem 1.1rem; border-radius: 999px; border: 1px solid #7d8fa0; background: var(--gs-chrome); color: #0b2238; font: 700 1rem/1.1 var(--font-head); box-shadow: inset 0 1px 0 #fff, 0 3px 0 #50657a, 0 5px 10px rgba(0, 0, 0, .3); touch-action: manipulation; }',
    '.game-gem-swap .gs-btn:hover { filter: brightness(1.05); }',
    '.game-gem-swap .gs-btn:active { transform: translateY(2px); box-shadow: inset 0 1px 0 #fff, 0 1px 0 #50657a; }',
    '.game-gem-swap .gs-btn:disabled { opacity: .5; cursor: not-allowed; }',
    '.game-gem-swap .gs-go { min-height: 54px; font-size: 1.2rem; padding-inline: 2rem; border-color: #6c9a00; background: linear-gradient(180deg, #f2ffc8, #c8f53a 48%, #a6d600 52%, #d9ff6e); color: #142000; box-shadow: inset 0 1px 0 #fff, 0 4px 0 #557a00, 0 6px 14px rgba(0, 0, 0, .35); }',
    '.game-gem-swap .gs-controls { display: flex; flex-wrap: wrap; justify-content: center; gap: .5rem; margin-top: .75rem; }',
    '.game-gem-swap .game-note { text-align: center; max-width: 40rem; margin: .9rem auto 0; }',
    '@media (max-width: 420px) { .game-gem-swap .gs-lcd { min-width: 3.9rem; padding-inline: .4rem; } .game-gem-swap .gs-lcd b { font-size: 1rem; } .game-gem-swap .gs-btn { padding-inline: .8rem; }' +
    ' .game-gem-swap .gs-overlay { padding: 6px; } .game-gem-swap .gs-card { padding: .7rem .6rem .8rem; gap: .45rem; border-radius: 16px; } .game-gem-swap .gs-card-msg { font-size: .92rem; } .game-gem-swap .gs-card-sub { font-size: .85rem; } .game-gem-swap .gs-card .seg button { padding-inline: .6rem; } .game-gem-swap .gs-go { min-height: 48px; } }',
    '.classroom .game-gem-swap .gs-shell { width: min(100%, 78vh, 900px); }',
    '@media (prefers-reduced-motion: reduce) { .game-gem-swap .gs-bar i { transition: none !important; } .game-gem-swap .gs-btn:active { transform: none; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'gem-swap',
    frame: 'none',
    mount: function (root, api) {
      var h = api.h;
      var RM = !!api.reducedMotion;
      var destroyed = false;
      var rand = api.random;

      var mode = api.store.get('mode', 'classic');
      if (!MODES[mode]) mode = 'classic';
      var best = api.store.get('best', {});
      if (!best || typeof best !== 'object') best = {};

      /* ---------- the page ---------- */
      root.appendChild(h('style', null, CSS));
      var scoreEl = h('b', null, '0'), bestEl = h('b', null, '0'), thirdLbl = h('span', null, 'Level'), thirdEl = h('b', null, '1');
      var scoreBox = h('div', { class: 'gs-lcd' }, h('span', null, 'Score'), scoreEl);
      var hud = h('div', { class: 'gs-hud' }, scoreBox, h('div', { class: 'gs-lcd' }, h('span', null, 'Best'), bestEl), h('div', { class: 'gs-lcd' }, thirdLbl, thirdEl));
      var barFill = h('i'), barText = h('em');
      var bar = h('div', { class: 'gs-bar', 'aria-hidden': 'true' }, barFill, barText);
      var canvas = h('canvas', { class: 'gs-canvas', role: 'img', tabindex: '0', 'aria-label': 'Gem Swap board, 8 by 8 gems. Press Start to play.' });
      var cardTitle = h('p', { class: 'gs-card-title' }, 'GEM SWAP');
      var cardMsg = h('p', { class: 'gs-card-msg' });
      var modeBtns = {};
      var modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Mode' }, MODE_KEYS.map(function (m) {
        modeBtns[m] = h('button', { type: 'button', 'aria-pressed': String(m === mode), onclick: function () { chooseMode(m); } }, MODES[m].name);
        return modeBtns[m];
      }));
      var cardSub = h('p', { class: 'gs-card-sub' });
      var goBtn = h('button', { class: 'gs-btn gs-go', type: 'button', onclick: function () { overlayGo(); } });
      var card = h('div', { class: 'gs-card' }, cardTitle, cardMsg, modeSeg, cardSub, goBtn);
      var overlay = h('div', { class: 'gs-overlay' }, card);
      var screen = h('div', { class: 'gs-screen' }, canvas, overlay);
      var pauseBtn = h('button', { class: 'gs-btn', type: 'button', disabled: true, onclick: function () { togglePause(); } }, 'Pause');
      var hintBtn = h('button', { class: 'gs-btn', type: 'button', disabled: true, onclick: function () { showHint(true); canvas.focus({ preventScroll: true }); } }, 'Hint');
      var newBtn = h('button', { class: 'gs-btn', type: 'button', onclick: function () { endToMenu(); } }, 'New game');
      var shell = h('div', { class: 'gs-shell' },
        h('div', { class: 'gs-top' }, h('p', { class: 'gs-logo', 'aria-hidden': 'true' }, 'GEM SWAP'), hud),
        bar, screen,
        h('div', { class: 'gs-controls' }, pauseBtn, hintBtn, newBtn));
      var note = h('p', { class: 'game-note' }, 'Tap a gem, then a gem beside it, or drag a gem onto its neighbour. Keyboard: arrows move the cursor, Space picks a gem up, then an arrow swaps it. H shows a hint, P pauses.');
      root.appendChild(shell);
      root.appendChild(note);

      /* ---------- the board and the game state ---------- */
      var t = new Int8Array(CELLS), k = new Uint8Array(CELLS);         /* t: which gem (-1 empty, 7 prism); k: normal, bomb or prism */
      var offY = new Float32Array(CELLS), vy = new Float32Array(CELLS);  /* how far above its square a falling gem is, and its speed */
      var clearing = new Uint8Array(CELLS);
      var phase = 'menu';        /* menu, idle, swap, unswap, clear, fall, shuffle, over */
      var phaseT = 0, phaseDur = 0;
      var swapA = -1, swapB = -1, cascade = 0, pending = null;
      var selected = -1, cursor = 27, picked = false, kbUsed = false;
      var score = 0, level = 1, levelStart = 0, timeLeft = TIMED_MS, timeUp = false, shownSecs = -1, lastStatusSecs = -1;
      var paused = false, running = false;
      var hint = null, idleMs = 0;
      var shake = 0;

      /* ---------- canvas size and sprites ---------- */
      var ctx = canvas.getContext('2d');
      var W = 0, cell = 40, dpr = 1, fontSmall = '', fontBig = '', DASH = [6, 4], NO_DASH = [];
      var POSTER = getComputedStyle(root).getPropertyValue('--font-poster').trim() || '"Arial Black", system-ui, sans-serif';
      var sprites = [], bgCanvas = document.createElement('canvas');
      function resize() {
        var w = Math.max(200, Math.round(canvas.clientWidth || screen.clientWidth || 320));
        var d = Math.min(2, window.devicePixelRatio || 1);
        if (w === W && d === dpr && sprites.length) return;
        var oldCell = cell;
        W = w; dpr = d; cell = W / N;
        if (oldCell && oldCell !== cell) for (var i = 0; i < CELLS; i++) offY[i] *= cell / oldCell;
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(W * dpr);
        fontSmall = '900 ' + Math.round(cell * 0.42) + 'px ' + POSTER;
        fontBig = '900 ' + Math.round(cell * 0.6) + 'px ' + POSTER;
        DASH = [cell * 0.14, cell * 0.08];
        buildSprites();
        buildBackground();
        draw();
      }
      function buildSprites() {
        var px = Math.ceil(cell * dpr);
        sprites = [];
        for (var ty = 0; ty < COLOURS; ty++) {
          sprites[ty] = [];
          for (var kind = 0; kind < 2; kind++) {
            var sc = document.createElement('canvas');
            sc.width = sc.height = px;
            drawGem(sc.getContext('2d'), GEMS[ty], px, kind);
            sprites[ty][kind] = sc;
          }
        }
        var pc = document.createElement('canvas');
        pc.width = pc.height = px;
        drawPrism(pc.getContext('2d'), px);
        sprites[PRISM_TYPE] = [pc, pc, pc];
      }
      function buildBackground() {
        var tint = LEVEL_TINTS[(level - 1) % LEVEL_TINTS.length];
        bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;
        var b = bgCanvas.getContext('2d'), s = cell * dpr;
        b.fillStyle = tint[0]; b.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
        b.fillStyle = tint[1];
        for (var i = 0; i < CELLS; i++) if ((Math.floor(i / N) + i % N) % 2) b.fillRect((i % N) * s, Math.floor(i / N) * s, s, s);
        var gl = b.createLinearGradient(0, 0, 0, bgCanvas.height);
        gl.addColorStop(0, 'rgba(255, 255, 255, .10)'); gl.addColorStop(0.5, 'rgba(255, 255, 255, 0)'); gl.addColorStop(1, 'rgba(0, 0, 0, .18)');
        b.fillStyle = gl; b.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      }

      /* ---------- particles, rings and floating scores: fixed pools, so nothing is created while animating ---------- */
      var PMAX = 260, pNext = 0;
      var px = new Float32Array(PMAX), py = new Float32Array(PMAX), pvx = new Float32Array(PMAX), pvy = new Float32Array(PMAX), plife = new Float32Array(PMAX), pcol = new Uint8Array(PMAX);
      function burst(i, ty) {
        if (RM) return;
        var x = (i % N + 0.5) * cell, y = (Math.floor(i / N) + 0.5) * cell;
        for (var n = 0; n < 7; n++) {
          var j = pNext; pNext = (pNext + 1) % PMAX;
          var a = rand() * Math.PI * 2, sp = cell * (0.004 + rand() * 0.006);
          px[j] = x; py[j] = y; pvx[j] = Math.cos(a) * sp; pvy[j] = Math.sin(a) * sp - cell * 0.003; plife[j] = 450 + rand() * 300; pcol[j] = ty >= 0 && ty < COLOURS ? ty : Math.floor(rand() * COLOURS);
        }
      }
      var FMAX = 6, floats = [], fNext = 0, f0;
      for (f0 = 0; f0 < FMAX; f0++) floats.push({ text: '', x: 0, y: 0, life: 0, big: false });
      function floatText(text, x, y, big) {
        var f = floats[fNext]; fNext = (fNext + 1) % FMAX;
        f.text = text; f.x = x; f.y = y; f.life = 900; f.big = !!big;
      }
      var RMAX = 4, rings = [], rNext = 0;
      for (f0 = 0; f0 < RMAX; f0++) rings.push({ x: 0, y: 0, life: 0 });
      function ring(i) {
        if (RM) return;
        var o = rings[rNext]; rNext = (rNext + 1) % RMAX;
        o.x = (i % N + 0.5) * cell; o.y = (Math.floor(i / N) + 0.5) * cell; o.life = 420;
      }

      /* ---------- drawing ---------- */
      function gemAt(i, x, y, scale) {
        var ty = t[i];
        if (ty < 0) return;
        var sp = sprites[ty][ty === PRISM_TYPE ? 0 : k[i]], s = cell * scale;
        ctx.drawImage(sp, x + (cell - s) / 2, y + (cell - s) / 2, s, s);
      }
      function draw() {
        if (!sprites.length) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, W);
        ctx.save();
        if (shake > 0) ctx.translate((rand() - 0.5) * shake, (rand() - 0.5) * shake);
        ctx.drawImage(bgCanvas, 0, 0, W, W);
        ctx.beginPath(); ctx.rect(0, 0, W, W); ctx.clip();
        var p = phaseDur ? Math.min(1, phaseT / phaseDur) : 1;
        var ease = p * p * (3 - 2 * p);
        var now = performance.now(), i;
        for (i = 0; i < CELLS; i++) {
          if (t[i] < 0) continue;
          var x = (i % N) * cell, y = Math.floor(i / N) * cell - offY[i], scale = 1;
          if ((phase === 'swap' || phase === 'unswap') && (i === swapA || i === swapB)) {
            var other = i === swapA ? swapB : swapA, q = phase === 'swap' ? ease : 1 - ease;
            x += ((other % N) - (i % N)) * cell * q;
            y += (Math.floor(other / N) - Math.floor(i / N)) * cell * q;
          }
          if (phase === 'clear' && clearing[i]) scale = 1 - ease;
          if (phase === 'shuffle') scale = p < 0.5 ? 1 - p * 2 : (p - 0.5) * 2;
          if (i === selected && !RM && phase === 'idle') scale *= 1.06 + Math.sin(now / 140) * 0.04;
          if (scale > 0.02) gemAt(i, x, y, scale);
        }
        /* bombs breathe with a soft white ring (the spark on the gem marks them with reduced motion too) */
        if (!RM) {
          ctx.lineWidth = Math.max(1.5, cell * 0.05);
          ctx.strokeStyle = '#ffffff';
          for (i = 0; i < CELLS; i++) {
            if (t[i] < 0 || k[i] !== BOMB || (phase === 'clear' && clearing[i])) continue;
            ctx.globalAlpha = 0.35 + Math.sin(now / 180 + i) * 0.25;
            ctx.beginPath(); ctx.arc((i % N + 0.5) * cell, (Math.floor(i / N) + 0.5) * cell - offY[i], cell * 0.46, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        /* selection, keyboard cursor and hint */
        if (selected >= 0 && phase !== 'menu') box(selected, '#ffffff', 3, false);
        if (kbUsed && running) box(cursor, picked ? '#b4f000' : '#3fd0ff', picked ? 4 : 2.5, !picked);
        if (hint && phase === 'idle') {
          ctx.globalAlpha = RM ? 1 : 0.55 + Math.sin(now / 160) * 0.45;
          box(hint[0], '#b4f000', 4, false);
          arrow(hint[0], hint[1]);
          ctx.globalAlpha = 1;
        }
        /* particles */
        var sz = cell * 0.09;
        for (i = 0; i < PMAX; i++) {
          if (plife[i] <= 0) continue;
          ctx.globalAlpha = Math.min(1, plife[i] / 400);
          ctx.fillStyle = GEMS[pcol[i]].fill;
          ctx.fillRect(px[i] - sz / 2, py[i] - sz / 2, sz, sz);
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        for (i = 0; i < RMAX; i++) {
          var o = rings[i];
          if (o.life <= 0) continue;
          var rp = 1 - o.life / 420;
          ctx.globalAlpha = 1 - rp;
          ctx.lineWidth = cell * 0.12 * (1 - rp) + 1;
          ctx.beginPath(); ctx.arc(o.x, o.y, cell * (0.5 + rp * 1.4), 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        /* floating scores */
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(2, cell * 0.08); ctx.strokeStyle = '#04182c';
        for (i = 0; i < FMAX; i++) {
          var f = floats[i];
          if (f.life <= 0) continue;
          ctx.globalAlpha = Math.min(1, f.life / 300);
          ctx.font = f.big ? fontBig : fontSmall;
          var fy = f.y - (RM ? 0 : (1 - f.life / 900) * cell * 0.8);
          ctx.strokeText(f.text, f.x, fy);
          ctx.fillStyle = f.big ? '#b4f000' : '#ffffff';
          ctx.fillText(f.text, f.x, fy);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      function box(i, colour, lw, dashed) {
        var x = (i % N) * cell, y = Math.floor(i / N) * cell, m = cell * 0.06;
        ctx.lineWidth = lw; ctx.strokeStyle = colour;
        if (dashed) ctx.setLineDash(DASH);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x + m, y + m, cell - 2 * m, cell - 2 * m, cell * 0.18); else ctx.rect(x + m, y + m, cell - 2 * m, cell - 2 * m);
        ctx.stroke();
        if (dashed) ctx.setLineDash(NO_DASH);
      }
      function arrow(a, b) {
        var ax = (a % N + 0.5) * cell, ay = (Math.floor(a / N) + 0.5) * cell;
        var dx = (b % N) - (a % N), dy = Math.floor(b / N) - Math.floor(a / N);
        var mx = ax + dx * cell * 0.5, my = ay + dy * cell * 0.5, s = cell * 0.2;
        ctx.fillStyle = '#b4f000'; ctx.strokeStyle = '#04182c'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx + dx * s, my + dy * s);
        ctx.lineTo(mx - dx * s * 0.6 - dy * s, my - dy * s * 0.6 + dx * s);
        ctx.lineTo(mx - dx * s * 0.6 + dy * s, my - dy * s * 0.6 - dx * s);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }

      /* ---------- the animation loop: runs only while something moves or a game is on ---------- */
      var raf = 0, lastT = 0;
      function loop(now) {
        raf = 0;
        if (destroyed) return;
        var dt = lastT ? Math.min(50, now - lastT) : 16;
        lastT = now;
        update(dt);
        draw();
        if (needsFrames()) raf = requestAnimationFrame(loop);
        else lastT = 0;
      }
      function needsFrames() {
        if (document.hidden || paused) return false;
        if (running) return true;
        for (var j = 0; j < PMAX; j++) if (plife[j] > 0) return true;
        for (j = 0; j < FMAX; j++) if (floats[j].life > 0) return true;
        return false;
      }
      function kick() { if (!raf && !destroyed && !document.hidden) { lastT = 0; raf = requestAnimationFrame(loop); } }

      function update(dt) {
        var i;
        for (i = 0; i < PMAX; i++) {
          if (plife[i] <= 0) continue;
          plife[i] -= dt; pvy[i] += cell * 0.000018 * dt; px[i] += pvx[i] * dt; py[i] += pvy[i] * dt;
        }
        for (i = 0; i < RMAX; i++) if (rings[i].life > 0) rings[i].life -= dt;
        for (i = 0; i < FMAX; i++) if (floats[i].life > 0) floats[i].life -= dt;
        if (shake > 0) shake = Math.max(0, shake - dt * 0.03);
        if (!running) return;
        /* the clock in Timed mode */
        if (mode === 'timed' && !timeUp) {
          timeLeft -= dt;
          if (timeLeft <= 0) { timeLeft = 0; timeUp = true; api.sound('bell'); }
          if (Math.ceil(timeLeft / 1000) !== shownSecs) showHud();
        }
        phaseT += dt;
        if (phase === 'idle') {
          if (timeUp) { gameOver('time'); return; }
          idleMs += dt;
          if (!hint && idleMs > HINT_AFTER) showHint(false);
          return;
        }
        if (phase === 'fall') {
          /* gravity: each falling gem speeds up until it lands in its square */
          var g = cell * 0.00014, moving = false;
          for (i = 0; i < CELLS; i++) {
            if (offY[i] <= 0) continue;
            vy[i] += g * dt; offY[i] -= vy[i] * dt;
            if (offY[i] <= 0) { offY[i] = 0; vy[i] = 0; } else moving = true;
          }
          if (!moving) afterFall();
          return;
        }
        if (phaseT < phaseDur) return;
        if (phase === 'swap') afterSwap();
        else if (phase === 'unswap') { setPhase('idle', 0); swapA = swapB = -1; }
        else if (phase === 'clear') afterClear();
        else if (phase === 'shuffle') settle();
      }
      function setPhase(p, dur) { phase = p; phaseT = 0; phaseDur = dur; canvas.setAttribute('data-phase', p); }

      /* ---------- swapping ---------- */
      function adjacent(a, b) { return (Math.abs(a - b) === 1 && Math.floor(a / N) === Math.floor(b / N)) || Math.abs(a - b) === N; }
      function trySwap(a, b) {
        if (phase !== 'idle' || !running || paused || timeUp || a < 0 || b < 0 || !adjacent(a, b)) return;
        selected = -1; picked = false; hint = null; idleMs = 0;
        swapA = a; swapB = b;
        api.sound('click');
        pending = swapWorks(t, k, a, b) ? null : 'bad';
        setPhase('swap', RM ? 60 : 160);
        kick();
      }
      function afterSwap() {
        if (pending === 'bad') {
          pending = null;
          api.sound('wrong');
          say('No line there, so the gems swap back.');
          setPhase('unswap', RM ? 60 : 150);
          return;
        }
        swapIn(t, k, swapA, swapB);
        cascade = 0;
        /* a prism swapped with any gem clears every gem of that colour; two prisms clear the whole board */
        var prismAt = k[swapA] === PRISM ? swapA : k[swapB] === PRISM ? swapB : -1;
        if (prismAt >= 0) {
          var other = prismAt === swapA ? swapB : swapA, mask = new Uint8Array(CELLS), i;
          cascade = 1;
          if (k[other] === PRISM) {
            for (i = 0; i < CELLS; i++) if (t[i] >= 0) mask[i] = 1;
            k[other] = NORMAL;
            floatText('BOARD WIPE!', W / 2, W / 2, true);
          } else {
            var colour = t[other];
            for (i = 0; i < CELLS; i++) if (t[i] === colour) mask[i] = 1;
            mask[prismAt] = 1;
            floatText('PRISM!', (prismAt % N + 0.5) * cell, (Math.floor(prismAt / N) + 0.5) * cell, true);
          }
          k[prismAt] = NORMAL;      /* this prism is used up, so it does not go off a second time */
          [523, 659, 784, 1047, 1319].forEach(function (f, n) { setTimer(function () { api.tone(f, 0.16, 'triangle', 0.09); }, n * 45); });
          startClear(mask, [], 100);
          return;
        }
        resolve();
      }

      /* ---------- matching, special gems and cascades ---------- */
      function resolve() {
        var runs = findRuns(t);
        if (!runs.length) { settle(); return; }
        cascade++;
        var mask = new Uint8Array(CELLS), made = [], bonus = 0, used = {}, i;
        var inAcross = new Uint8Array(CELLS), inDown = new Uint8Array(CELLS);
        runs.forEach(function (run) { run.cells.forEach(function (c) { mask[c] = 1; if (run.across) inAcross[c] = 1; else inDown[c] = 1; }); });
        /* A line of 5 makes a prism and a line of 4 a bomb. It appears where you swapped, if that square is in the
           line, otherwise in the middle of the line. */
        runs.forEach(function (run) {
          if (run.cells.length < 4) return;
          var at = cascade === 1 && run.cells.indexOf(swapA) >= 0 ? swapA : cascade === 1 && run.cells.indexOf(swapB) >= 0 ? swapB : run.cells[Math.floor(run.cells.length / 2)];
          if (k[at] !== NORMAL) at = run.cells.filter(function (c) { return k[c] === NORMAL; })[0];
          if (at == null || used[at]) return;
          used[at] = true;
          made.push({ at: at, kind: run.cells.length >= 5 ? PRISM : BOMB, colour: run.colour });
          bonus += run.cells.length >= 5 ? 100 : 50;
        });
        /* An L or T shape (a line across and a line down that share a gem) makes a bomb where they cross. */
        for (i = 0; i < CELLS; i++) {
          if (inAcross[i] && inDown[i] && !used[i] && k[i] === NORMAL) { used[i] = true; made.push({ at: i, kind: BOMB, colour: t[i] }); bonus += 50; }
        }
        startClear(mask, made, bonus);
      }
      /* Bombs and prisms caught in a clear go off too: a bomb clears its 8 neighbours, a prism clears the most
         common colour. Anything they catch can set off more. Returns how many went off. */
      function chainReactions(mask, made) {
        var keep = {}, queue = [], seen = new Uint8Array(CELLS), blasts = 0, i;
        made.forEach(function (m) { keep[m.at] = true; });
        for (i = 0; i < CELLS; i++) if (mask[i] && k[i] !== NORMAL && !keep[i]) queue.push(i);
        while (queue.length) {
          var c = queue.shift(), add = [];
          if (seen[c]) continue;
          seen[c] = 1;
          if (k[c] === BOMB) {
            blasts++; ring(c);
            var r = Math.floor(c / N), cc = c % N;
            for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
              var rr = r + dr, c2 = cc + dc;
              if (rr >= 0 && rr < N && c2 >= 0 && c2 < N) add.push(rr * N + c2);
            }
          } else if (k[c] === PRISM) {
            blasts++;
            var counts = [0, 0, 0, 0, 0, 0, 0], top = 0;
            for (i = 0; i < CELLS; i++) if (t[i] >= 0 && t[i] < COLOURS && !mask[i]) counts[t[i]]++;
            for (i = 1; i < COLOURS; i++) if (counts[i] > counts[top]) top = i;
            for (i = 0; i < CELLS; i++) if (t[i] === top) add.push(i);
          }
          add.forEach(function (a) {
            if (keep[a] || t[a] < 0 || mask[a]) return;
            mask[a] = 1;
            if (k[a] !== NORMAL) queue.push(a);
          });
        }
        return blasts;
      }
      function startClear(mask, made, bonus) {
        var blasts = chainReactions(mask, made), count = 0, sx = 0, sy = 0, i;
        made.forEach(function (m) { mask[m.at] = 0; });
        for (i = 0; i < CELLS; i++) {
          clearing[i] = mask[i];
          if (!mask[i]) continue;
          count++; sx += (i % N + 0.5) * cell; sy += (Math.floor(i / N) + 0.5) * cell;
          burst(i, t[i]);
        }
        pending = made;
        var points = count * 10 * cascade + bonus + blasts * 50;
        addScore(points);
        if (count) floatText('+' + points, sx / count, sy / count, false);
        if (cascade > 1) floatText('CASCADE ×' + cascade, W / 2, W * 0.18, true);
        /* sound: a two-note chime that climbs the scale with every cascade */
        var note = SCALE[Math.min(SCALE.length - 1, cascade - 1)];
        api.tone(note, 0.12, 'triangle', 0.1);
        setTimer(function () { api.tone(note * 1.5, 0.14, 'sine', 0.07); }, 60);
        if (blasts) { api.sound('thud'); if (!RM) shake = Math.min(14, 6 + blasts * 3); }
        if (made.length) setTimer(function () { api.sound(made.some(function (m) { return m.kind === PRISM; }) ? 'coin' : 'pop'); }, 120);
        if (cascade > 1) say('Cascade ×' + cascade + '! ' + statusText());
        setPhase('clear', RM ? 120 : 230);
      }
      function afterClear() {
        var made = pending || [], i;
        pending = null;
        for (i = 0; i < CELLS; i++) if (clearing[i]) { t[i] = -1; k[i] = NORMAL; clearing[i] = 0; }
        made.forEach(function (m) { t[m.at] = m.kind === PRISM ? PRISM_TYPE : m.colour; k[m.at] = m.kind; });
        collapse();
        setPhase('fall', 0);
        if (RM) { for (i = 0; i < CELLS; i++) { offY[i] = 0; vy[i] = 0; } afterFall(); }
      }
      /* Gems fall down each column into the gaps, and new random gems drop in from above the board. */
      function collapse() {
        for (var c = 0; c < N; c++) {
          var write = N - 1, r;
          for (r = N - 1; r >= 0; r--) {
            var i = r * N + c;
            if (t[i] < 0) continue;
            if (r !== write) {
              var j = write * N + c;
              t[j] = t[i]; k[j] = k[i]; t[i] = -1; k[i] = NORMAL;
              offY[j] = (write - r) * cell + offY[i]; vy[j] = 0; offY[i] = 0;
            }
            write--;
          }
          var fresh = write + 1;
          for (r = write; r >= 0; r--) {
            var n = r * N + c;
            t[n] = Math.floor(rand() * COLOURS); k[n] = NORMAL;
            offY[n] = fresh * cell + cell * 0.3; vy[n] = 0;
          }
        }
      }
      function afterFall() {
        if (findRuns(t).length) { resolve(); return; }
        settle();
      }
      /* The board has stopped moving. Make sure there is still a swap to make. */
      function settle() {
        setPhase('idle', 0);
        swapA = swapB = -1;
        idleMs = 0;
        var moves = findMoves(t, k).length;
        publish(moves);
        if (timeUp) { gameOver('time'); return; }
        if (!moves) {
          if (mode === 'classic') { gameOver('stuck'); return; }
          api.sound('shuffle');
          say('No swaps left, so the board shuffles.');
          floatText('SHUFFLE!', W / 2, W / 2, true);
          fillFresh(t, k, rand);
          publish(findMoves(t, k).length);
          setPhase('shuffle', RM ? 80 : 520);
          return;
        }
        if (cascade) say(statusText());
        cascade = 0;
      }
      /* The board as text for the automated check: one character per square (0 to 6 a gem, 7 a prism). */
      function publish(moves) {
        var s = '', kinds = '';
        for (var i = 0; i < CELLS; i++) { s += t[i] < 0 ? '.' : String(t[i]); kinds += String(k[i]); }
        canvas.setAttribute('data-board', s);
        canvas.setAttribute('data-kinds', kinds);
        canvas.setAttribute('data-moves', String(moves));
        describe();
      }

      /* ---------- score, levels, status ---------- */
      function levelGoal(lv) { return 1000 + (lv - 1) * 500; }
      function addScore(n) {
        score += n;
        if (mode === 'classic') {
          while (score - levelStart >= levelGoal(level)) {
            levelStart += levelGoal(level); level++;
            buildBackground();
            floatText('LEVEL ' + level + '!', W / 2, W * 0.42, true);
            setTimer(function () { api.sound('bell'); }, 200);
            say('Level ' + level + '! ' + statusText());
          }
        }
        scoreBox.classList.add('is-bump');
        setTimer(function () { scoreBox.classList.remove('is-bump'); }, 250);
        showHud();
      }
      function statusText() {
        if (mode === 'classic') return 'Score ' + fmtScore(score) + ' · Level ' + level;
        if (mode === 'timed') return 'Score ' + fmtScore(score) + ' · ' + Math.ceil(timeLeft / 1000) + ' seconds left';
        return 'Score ' + fmtScore(score) + ' · Calm';
      }
      var lastStatus = '';
      function say(text) { if (text !== lastStatus) { lastStatus = text; api.status(text); } }
      function showHud() {
        scoreEl.textContent = fmtScore(score);
        bestEl.textContent = mode === 'calm' ? '·' : fmtScore(best[mode] || 0);
        bar.classList.toggle('is-clock', mode === 'timed');
        if (mode === 'classic') {
          thirdLbl.textContent = 'Level'; thirdEl.textContent = String(level);
          var pct = Math.min(1, (score - levelStart) / levelGoal(level));
          barFill.style.width = 'calc(' + (pct * 100).toFixed(1) + '% - 4px)';
          barText.textContent = 'Level ' + level + ' · ' + fmtScore(levelGoal(level) - (score - levelStart)) + ' to go';
          bar.classList.remove('is-low');
        } else if (mode === 'timed') {
          var secs = Math.ceil(timeLeft / 1000);
          shownSecs = secs;
          thirdLbl.textContent = 'Time'; thirdEl.textContent = String(secs);
          barFill.style.width = 'calc(' + Math.max(0, (timeLeft - 1000) / TIMED_MS * 100).toFixed(1) + '% - 4px)';
          barText.textContent = secs + (secs === 1 ? ' second' : ' seconds');
          bar.classList.toggle('is-low', secs <= 10);
          /* the status line hears the clock every 15 seconds, and each of the last 5 */
          if (running && secs !== lastStatusSecs && (secs % 15 === 0 || secs <= 5) && secs < 90) { lastStatusSecs = secs; say(statusText()); if (secs <= 5 && secs > 0) api.sound('tick'); }
        } else {
          thirdLbl.textContent = 'Mode'; thirdEl.textContent = 'Calm';
          barFill.style.width = 'calc(100% - 4px)';
          barText.textContent = 'Calm · no clock';
          bar.classList.remove('is-low');
        }
      }
      function describe() {
        var cr = rc(cursor), g = t[cursor];
        var what = g < 0 ? 'empty' : g === PRISM_TYPE ? 'a prism gem' : (k[cursor] === BOMB ? 'a bomb ' : 'a ') + GEMS[g].name;
        canvas.setAttribute('aria-label', 'Gem Swap board, 8 by 8 gems. ' + (running ? 'Cursor on row ' + (cr.r + 1) + ', column ' + (cr.c + 1) + ': ' + what + (picked ? ', picked up. Press an arrow to swap it.' : '. Press Space to pick it up.') : 'Press Start to play.'));
      }

      /* ---------- hints ---------- */
      function showHint(asked) {
        if (!running || phase !== 'idle' || paused) return;
        var moves = findMoves(t, k);
        if (!moves.length) return;
        hint = moves[Math.floor(rand() * moves.length)];
        if (rand() < 0.5) hint = [hint[1], hint[0]];
        api.sound('tick');
        var a = rc(hint[0]), b = rc(hint[1]);
        if (asked || kbUsed) say('Hint: swap row ' + (a.r + 1) + ', column ' + (a.c + 1) + ' with row ' + (b.r + 1) + ', column ' + (b.c + 1) + '.');
        kick();
      }

      /* ---------- starting, pausing and ending ---------- */
      function modeText() { return MODES[mode].about + (mode === 'calm' ? '' : best[mode] ? ' Your best: ' + fmtScore(best[mode]) + '.' : ' No best score yet.'); }
      function chooseMode(m) {
        mode = m;
        api.store.set('mode', m);
        MODE_KEYS.forEach(function (x) { modeBtns[x].setAttribute('aria-pressed', String(x === m)); });
        cardSub.textContent = modeText();
        api.sound('click');
        showHud();
      }
      function overlayGo() {
        api.unlockSound();
        if (paused) { togglePause(); return; }
        start();
      }
      function start() {
        var i;
        score = 0; level = 1; levelStart = 0; timeLeft = TIMED_MS; timeUp = false; lastStatusSecs = -1;
        selected = -1; picked = false; hint = null; idleMs = 0; cascade = 0; pending = null; swapA = swapB = -1;
        for (i = 0; i < CELLS; i++) { t[i] = -1; k[i] = NORMAL; offY[i] = 0; vy[i] = 0; clearing[i] = 0; }
        fillFresh(t, k, rand);
        /* the new board drops in from above, bottom rows first */
        if (!RM) for (i = 0; i < CELLS; i++) offY[i] = (N + 1) * cell + (N - Math.floor(i / N)) * cell * 0.35 + (i % N) * cell * 0.12;
        buildBackground();
        running = true; paused = false;
        shell.classList.add('is-running');
        overlay.hidden = true;
        pauseBtn.disabled = false; hintBtn.disabled = false; pauseBtn.textContent = 'Pause';
        api.sound('whoosh');
        setPhase('fall', 0);
        publish(findMoves(t, k).length);
        showHud();
        say(MODES[mode].name + '. ' + statusText());
        canvas.focus({ preventScroll: true });
        kick();
      }
      function togglePause() {
        if (!running) return;
        paused = !paused;
        pauseBtn.textContent = paused ? 'Resume' : 'Pause';
        if (paused) {
          showCard('Paused', 'Take a break. The clock has stopped.', 'Resume', false);
          say('Paused. ' + statusText());
        } else {
          overlay.hidden = true;
          say(statusText());
          canvas.focus({ preventScroll: true });
          kick();
        }
      }
      function showCard(title, msg, go, withModes) {
        cardTitle.textContent = title;
        cardMsg.textContent = msg;
        modeSeg.hidden = !withModes;
        cardSub.hidden = !withModes;
        goBtn.replaceChildren(h('span', { 'aria-hidden': 'true' }, '▶'), ' ' + go);
        overlay.hidden = false;
        if (withModes) {
          MODE_KEYS.forEach(function (x) { modeBtns[x].setAttribute('aria-pressed', String(x === mode)); });
          cardSub.textContent = modeText();
        }
      }
      function gameOver(why) {
        running = false; paused = false;
        shell.classList.remove('is-running');
        pauseBtn.disabled = true; hintBtn.disabled = true; pauseBtn.textContent = 'Pause';
        selected = -1; hint = null; picked = false;
        setPhase('over', 0);
        var prev = best[mode] || 0, isBest = score > prev && mode !== 'calm';
        if (isBest) { best[mode] = score; api.store.set('best', best); }
        showHud();
        var head = why === 'time' ? 'Time!' : why === 'quit' ? 'Game over' : 'No swaps left!';
        var msg = 'You scored ' + fmtScore(score) + (mode === 'classic' ? ' and reached level ' + level : '') + '. ' +
          (isBest ? 'That is a new best!' : prev ? 'Your best is ' + fmtScore(prev) + '. Nice swapping. Have another go?' : 'Nice swapping. Have another go?');
        say(head + ' ' + msg);
        if (isBest) api.celebrate('New best: ' + fmtScore(score));
        else api.sound(why === 'stuck' ? 'lose' : 'bell');
        setTimer(function () { showCard(head, msg, 'Play again', true); goBtn.focus({ preventScroll: true }); }, RM ? 200 : 800);
        draw();
      }
      /* New game: back to the start card. A game with a new best score is counted first. */
      function endToMenu() {
        api.sound('click');
        if (running && mode !== 'calm' && score > (best[mode] || 0)) { gameOver('quit'); return; }
        running = false; paused = false;
        shell.classList.remove('is-running');
        pauseBtn.disabled = true; hintBtn.disabled = true; pauseBtn.textContent = 'Pause';
        setPhase('menu', 0);
        selected = -1; hint = null; picked = false;
        showCard('GEM SWAP', 'Choose a mode and press Start.', 'Start', true);
        say('Press Start');
        draw();
        goBtn.focus({ preventScroll: true });
      }

      /* ---------- timers that destroy() can clear ---------- */
      var timers = [];
      function setTimer(fn, ms) { var id = setTimeout(function () { timers.splice(timers.indexOf(id), 1); if (!destroyed) fn(); }, ms); timers.push(id); }

      /* ---------- pointer: tap a gem then its neighbour, or drag a gem onto its neighbour ---------- */
      var drag = null;
      function cellAt(e) {
        var r = canvas.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width * N, y = (e.clientY - r.top) / r.height * N;
        if (x < 0 || y < 0 || x >= N || y >= N) return -1;
        return Math.floor(y) * N + Math.floor(x);
      }
      canvas.addEventListener('pointerdown', function (e) {
        if (!running || paused || phase !== 'idle') return;
        var i = cellAt(e);
        if (i < 0) return;
        api.unlockSound();
        kbUsed = false; picked = false; cursor = i;
        idleMs = 0; hint = null;
        if (selected >= 0 && adjacent(selected, i)) { var s = selected; selected = -1; describe(); trySwap(s, i); return; }
        selected = selected === i ? -1 : i;
        if (selected >= 0) api.tone(880, 0.05, 'sine', 0.06);
        drag = { cell: i, x: e.clientX, y: e.clientY, id: e.pointerId };
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* some browsers refuse; dragging still works inside the board */ }
        describe();
        kick();
      });
      canvas.addEventListener('pointermove', function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var r = canvas.getBoundingClientRect(), size = r.width / N;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < size * 0.35) return;
        var from = drag.cell, c = from % N, row = Math.floor(from / N), to;
        if (Math.abs(dx) > Math.abs(dy)) to = dx > 0 ? (c < N - 1 ? from + 1 : -1) : (c > 0 ? from - 1 : -1);
        else to = dy > 0 ? (row < N - 1 ? from + N : -1) : (row > 0 ? from - N : -1);
        drag = null;
        if (to >= 0) trySwap(from, to);
      });
      function endDrag() { drag = null; }
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);

      /* ---------- keyboard ---------- */
      canvas.addEventListener('keydown', function (e) {
        if (!running) return;
        var key = e.key;
        if (key === 'p' || key === 'P') { e.preventDefault(); togglePause(); return; }
        if (paused) return;
        if (key === 'h' || key === 'H') { e.preventDefault(); showHint(true); return; }
        var dir = key === 'ArrowUp' ? -N : key === 'ArrowDown' ? N : key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0;
        if (dir) {
          e.preventDefault();
          kbUsed = true; idleMs = 0;
          var c = cursor % N, to = cursor + dir;
          if ((dir === -1 && c === 0) || (dir === 1 && c === N - 1) || to < 0 || to >= CELLS) { api.sound('tick'); kick(); return; }
          if (picked) { var from = cursor; picked = false; selected = -1; cursor = to; trySwap(from, to); }
          else { cursor = to; describe(); }
          kick();
          return;
        }
        if (key === ' ' || key === 'Enter') {
          e.preventDefault();
          kbUsed = true; idleMs = 0;
          if (phase !== 'idle') return;
          picked = !picked;
          selected = picked ? cursor : -1;
          api.tone(picked ? 880 : 660, 0.05, 'sine', 0.06);
          describe();
          kick();
          return;
        }
        if (key === 'Escape' && picked) { picked = false; selected = -1; describe(); kick(); }
      });

      /* ---------- the tab being hidden pauses the game ---------- */
      function onVisibility() {
        if (document.hidden) { if (running && !paused) togglePause(); if (raf) { cancelAnimationFrame(raf); raf = 0; } }
        else kick();
      }
      document.addEventListener('visibilitychange', onVisibility);

      var ro = null;
      if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(function () { resize(); }); ro.observe(screen); }

      /* ---------- first paint: a fresh board waits behind the start card ---------- */
      resize();
      fillFresh(t, k, rand);
      publish(findMoves(t, k).length);
      setPhase('menu', 0);
      showCard('GEM SWAP', 'Swap two gems side by side to make a line of three or more.', 'Start', true);
      showHud();
      draw();
      api.status('Press Start');

      return {
        destroy: function () {
          destroyed = true;
          running = false;
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          timers.forEach(clearTimeout); timers = [];
          if (ro) ro.disconnect();
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }
  });
})();
