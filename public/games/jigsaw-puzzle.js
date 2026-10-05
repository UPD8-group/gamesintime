/* Jigsaw puzzle, the craze of 1908 (and John Spilsbury's dissected maps of the 1760s).
   The picture is cut into classic tab-and-blank pieces with bezier curves. Each shared edge is made once, so
   neighbours always fit exactly. Every piece is drawn once into its own small canvas; while you drag, the rest of
   the table is kept as one cached picture, so only the pieces in your hand are redrawn each frame.
   Pieces that join in the right way stick together and move as one. A piece dropped near its true place locks
   with a clack. If the site has no pictures, or one will not load, the computer paints a picture instead.
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  var SIZES = { 12: [4, 3], 24: [6, 4], 48: [8, 6], 96: [12, 8] };
  var M = 0.3;            /* room around each piece for its tabs, in piece widths */
  var SNAP = 0.28;        /* how close (in piece widths) counts as "near its place" */
  var PATTERNS = [
    { key: 'pattern:tiles', name: 'Art Nouveau tiles', caption: 'Art Nouveau tiles in the colours of 1900 to 1919', credit: 'Painted by the computer for this game', alt: 'twelve painted tiles, each with a different flower' },
    { key: 'pattern:seaside', name: 'Seaside poster', caption: 'A day by the sea, in the style of a 1908 poster', credit: 'Painted by the computer for this game', alt: 'a sunny seaside with a sailing boat, a lighthouse and bathing boxes' }
  ];

  function parseColour(s) {
    s = (s || '').trim();
    var m;
    if (s.charAt(0) === '#') {
      var hx = s.slice(1);
      if (hx.length === 3) hx = hx.split('').map(function (c) { return c + c; }).join('');
      var n = parseInt(hx.slice(0, 6), 16);
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    }
    if ((m = s.match(/rgba?\(([^)]+)\)/))) { var p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2]]; }
    return [128, 128, 128];
  }
  function rgba(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')'; }
  function mix(c1, c2, t) { return [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t]; }
  function clock(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---------- the computer's own pictures, in the colours of the hall ---------- */
  function paintTiles(g, W, H, C) {
    var across = W >= H ? 4 : 3, down = W >= H ? 3 : 4, pad = Math.min(W, H) * 0.04;
    var tw = (W - 2 * pad) / across, th = (H - 2 * pad) / down;
    g.fillStyle = rgba(mix(C.gold, C.ink, 0.55)); g.fillRect(0, 0, W, H);
    var sets = [[C.peacock, C.rose], [C.rose, C.leaf], [C.leaf, C.vermilion], [C.cobalt, C.gold], [C.vermilion, C.leaf], [C.gold, C.cobalt],
      [C.brand, C.rose], [C.peacock, C.gold], [C.rose, C.cobalt], [C.leaf, C.rose], [C.cobalt, C.vermilion], [C.vermilion, C.gold]];
    for (var r = 0; r < down; r++) for (var c = 0; c < across; c++) {
      var i = r * across + c, x = pad + c * tw, y = pad + r * th, set = sets[i % sets.length];
      var gr = g.createLinearGradient(x, y, x, y + th);
      gr.addColorStop(0, rgba(mix(set[0], C.surface, 0.35))); gr.addColorStop(1, rgba(mix(set[0], C.ink, 0.15)));
      g.fillStyle = gr; g.fillRect(x + 2, y + 2, tw - 4, th - 4);
      /* an arched window behind each flower */
      g.fillStyle = rgba(mix(set[0], C.surface, 0.6), 0.75);
      g.beginPath(); g.moveTo(x + tw * 0.18, y + th * 0.92); g.lineTo(x + tw * 0.18, y + th * 0.42);
      g.arc(x + tw / 2, y + th * 0.42, tw * 0.32, Math.PI, 0); g.lineTo(x + tw * 0.82, y + th * 0.92); g.closePath(); g.fill();
      flower(g, x + tw / 2, y + th * 0.5, Math.min(tw, th), i % 5, set[1], C);
      /* gold frame with corner studs */
      g.strokeStyle = rgba(C.gold); g.lineWidth = Math.max(2, pad * 0.22); g.strokeRect(x + 3, y + 3, tw - 6, th - 6);
      g.fillStyle = rgba(C.gold);
      [[x + 6, y + 6], [x + tw - 6, y + 6], [x + 6, y + th - 6], [x + tw - 6, y + th - 6]].forEach(function (q) { g.beginPath(); g.arc(q[0], q[1], pad * 0.28, 0, Math.PI * 2); g.fill(); });
    }
  }
  function flower(g, cx, cy, s, kind, col, C) {
    var stem = rgba(mix(C.green, C.ink, 0.2)), leaf = rgba(mix(C.leaf, C.green, 0.45));
    g.lineCap = 'round';
    /* whiplash stem and two leaves */
    g.strokeStyle = stem; g.lineWidth = s * 0.035;
    g.beginPath(); g.moveTo(cx - s * 0.05, cy + s * 0.42); g.bezierCurveTo(cx + s * 0.22, cy + s * 0.25, cx - s * 0.2, cy + s * 0.1, cx, cy - s * 0.05); g.stroke();
    g.fillStyle = leaf;
    [[-1, 0.28], [1, 0.18]].forEach(function (l) {
      var lx = cx + l[0] * s * 0.02, ly = cy + s * l[1];
      g.beginPath(); g.moveTo(lx, ly);
      g.quadraticCurveTo(lx + l[0] * s * 0.2, ly - s * 0.16, lx + l[0] * s * 0.3, ly - s * 0.02);
      g.quadraticCurveTo(lx + l[0] * s * 0.14, ly + s * 0.04, lx, ly); g.fill();
    });
    var hx = cx, hy = cy - s * 0.12, R = s * 0.16, c1 = rgba(col), c2 = rgba(mix(col, C.surface, 0.45)), k;
    g.fillStyle = c1;
    if (kind === 0) { /* tulip */
      for (k = -1; k <= 1; k++) { g.beginPath(); g.ellipse(hx + k * R * 0.55, hy, R * 0.45, R * 1.05, k * 0.35, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = c2; g.beginPath(); g.ellipse(hx, hy + R * 0.1, R * 0.32, R * 0.85, 0, 0, Math.PI * 2); g.fill();
    } else if (kind === 1) { /* daisy */
      for (k = 0; k < 10; k++) { g.save(); g.translate(hx, hy); g.rotate(k * Math.PI / 5); g.beginPath(); g.ellipse(0, -R * 0.75, R * 0.22, R * 0.6, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
      g.fillStyle = rgba(C.gold); g.beginPath(); g.arc(hx, hy, R * 0.34, 0, Math.PI * 2); g.fill();
    } else if (kind === 2) { /* rose */
      for (k = 4; k >= 1; k--) { g.fillStyle = k % 2 ? c1 : c2; g.beginPath(); g.arc(hx + (k % 2) * R * 0.08, hy, R * k / 3.6, 0, Math.PI * 2); g.fill(); }
    } else if (kind === 3) { /* lily: five pointed petals */
      for (k = 0; k < 5; k++) {
        g.save(); g.translate(hx, hy); g.rotate(k * Math.PI * 2 / 5);
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(R * 0.5, -R * 0.6, 0, -R * 1.25); g.quadraticCurveTo(-R * 0.5, -R * 0.6, 0, 0); g.fill(); g.restore();
      }
      g.fillStyle = rgba(C.gold); g.beginPath(); g.arc(hx, hy, R * 0.18, 0, Math.PI * 2); g.fill();
    } else { /* poppy */
      for (k = 0; k < 4; k++) { g.beginPath(); g.arc(hx + Math.cos(k * Math.PI / 2) * R * 0.5, hy + Math.sin(k * Math.PI / 2) * R * 0.5, R * 0.62, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = rgba(C.ink); g.beginPath(); g.arc(hx, hy, R * 0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = c2; for (k = 0; k < 6; k++) { g.beginPath(); g.arc(hx + Math.cos(k) * R * 0.18, hy + Math.sin(k) * R * 0.18, R * 0.05, 0, Math.PI * 2); g.fill(); }
    }
  }
  function paintSeaside(g, W, H, C, posterFont) {
    var hz = H * 0.56, k;
    var sky = g.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, rgba(mix(C.cobalt, C.surface, 0.2))); sky.addColorStop(0.55, rgba(mix(C.rose, C.surface, 0.35))); sky.addColorStop(1, rgba(mix(C.gold, C.surface, 0.25)));
    g.fillStyle = sky; g.fillRect(0, 0, W, hz);
    /* the sun and its rays */
    var sx = W * 0.6, sr = Math.min(W, H) * 0.17;
    g.save(); g.translate(sx, hz);
    for (k = 0; k < 18; k++) { g.fillStyle = rgba(k % 2 ? C.gold : mix(C.gold, C.surface, 0.5), 0.45); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, W, Math.PI + k * Math.PI / 18, Math.PI + (k + 1) * Math.PI / 18); g.closePath(); g.fill(); }
    g.fillStyle = rgba(C.vermilion); g.beginPath(); g.arc(0, 0, sr, Math.PI, 0); g.fill();
    g.fillStyle = rgba(mix(C.vermilion, C.gold, 0.5)); g.beginPath(); g.arc(0, 0, sr * 0.72, Math.PI, 0); g.fill();
    g.restore();
    /* clouds */
    g.fillStyle = rgba(C.surface, 0.92);
    [[0.16, 0.24, 1], [0.42, 0.17, 0.8], [0.86, 0.3, 1.1]].forEach(function (c) {
      var x = W * c[0], y = H * c[1], r = Math.min(W, H) * 0.045 * c[2];
      [[0, 0, 1], [1.1, -0.35, 1.25], [2.3, 0, 1], [1.2, 0.3, 1.1]].forEach(function (b) { g.beginPath(); g.arc(x + b[0] * r, y + b[1] * r, r * b[2], 0, Math.PI * 2); g.fill(); });
    });
    /* the sea */
    var sea = g.createLinearGradient(0, hz, 0, H * 0.84);
    sea.addColorStop(0, rgba(C.peacock)); sea.addColorStop(1, rgba(mix(C.cobalt, C.ink, 0.25)));
    g.fillStyle = sea; g.fillRect(0, hz, W, H * 0.3);
    g.strokeStyle = rgba(C.surface, 0.5); g.lineWidth = Math.max(1.5, H * 0.004);
    for (var row = 0; row < 7; row++) {
      var y = hz + H * 0.03 + row * H * 0.035;
      g.beginPath();
      for (var x = -10; x < W + 20; x += W / 40) g.lineTo(x, y + Math.sin(x / W * 30 + row * 1.7) * H * 0.006);
      g.stroke();
    }
    g.fillStyle = rgba(C.gold, 0.55);
    for (k = 0; k < 6; k++) g.fillRect(sx - sr * (0.7 - k * 0.04), hz + H * (0.015 + k * 0.036), sr * (1.4 - k * 0.08), H * 0.008);
    /* a sailing boat */
    var bx = W * 0.22, by = hz + H * 0.12, bs = Math.min(W, H) * 0.12;
    g.fillStyle = rgba(C.brand); g.beginPath(); g.moveTo(bx - bs, by); g.lineTo(bx + bs, by); g.lineTo(bx + bs * 0.7, by + bs * 0.35); g.lineTo(bx - bs * 0.75, by + bs * 0.35); g.closePath(); g.fill();
    g.strokeStyle = rgba(C.ink); g.lineWidth = Math.max(2, bs * 0.05); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - bs * 1.6); g.stroke();
    g.fillStyle = rgba(C.surface); g.beginPath(); g.moveTo(bx + bs * 0.06, by - bs * 1.55); g.lineTo(bx + bs * 0.95, by - bs * 0.1); g.lineTo(bx + bs * 0.06, by - bs * 0.1); g.closePath(); g.fill();
    g.fillStyle = rgba(C.vermilion); g.beginPath(); g.moveTo(bx - bs * 0.06, by - bs * 1.3); g.lineTo(bx - bs * 0.8, by - bs * 0.1); g.lineTo(bx - bs * 0.06, by - bs * 0.1); g.closePath(); g.fill();
    /* lighthouse on a rock */
    var lx = W * 0.88, ly = hz + H * 0.06, lw = Math.min(W, H) * 0.06;
    g.fillStyle = rgba(mix(C.ink, C.leaf, 0.3)); g.beginPath(); g.moveTo(lx - lw * 2.2, ly + lw * 1.4); g.quadraticCurveTo(lx, ly - lw * 0.6, lx + lw * 2.4, ly + lw * 1.4); g.closePath(); g.fill();
    for (k = 0; k < 5; k++) {
      var t0 = k / 5, t1 = (k + 1) / 5, top = ly - lw * 4.2, bot = ly + lw * 0.3, wTop = lw * 0.55, wBot = lw * 0.85;
      var y0 = top + (bot - top) * t0, y1 = top + (bot - top) * t1, w0 = wTop + (wBot - wTop) * t0, w1 = wTop + (wBot - wTop) * t1;
      g.fillStyle = rgba(k % 2 ? C.surface : C.red); g.beginPath(); g.moveTo(lx - w0, y0); g.lineTo(lx + w0, y0); g.lineTo(lx + w1, y1); g.lineTo(lx - w1, y1); g.closePath(); g.fill();
    }
    g.fillStyle = rgba(C.gold); g.fillRect(lx - lw * 0.45, ly - lw * 4.9, lw * 0.9, lw * 0.7);
    g.fillStyle = rgba(C.ink); g.beginPath(); g.moveTo(lx - lw * 0.7, ly - lw * 4.9); g.lineTo(lx, ly - lw * 5.6); g.lineTo(lx + lw * 0.7, ly - lw * 4.9); g.closePath(); g.fill();
    /* the beach with a row of bathing boxes */
    var sand = H * 0.84;
    g.fillStyle = rgba(mix(C.gold, C.surface, 0.45)); g.fillRect(0, sand, W, H - sand);
    g.fillStyle = rgba(mix(C.gold, C.ink, 0.15), 0.35);
    for (k = 0; k < 40; k++) g.fillRect((k * 97) % W, sand + ((k * 53) % 100) / 100 * (H - sand), 3, 3);
    var boxes = [C.vermilion, C.cobalt, C.leaf, C.rose, C.gold, C.peacock], bw = W * 0.07, bh = H * 0.1;
    for (k = 0; k < 6; k++) {
      var x0 = W * 0.42 + k * bw * 1.25, yb = sand - bh * 0.35;
      g.fillStyle = rgba(boxes[k]); g.fillRect(x0, yb, bw, bh);
      g.fillStyle = rgba(C.surface, 0.55); for (var st = 1; st < 4; st += 2) g.fillRect(x0 + st * bw / 4, yb, bw / 4, bh);
      g.fillStyle = rgba(mix(boxes[k], C.ink, 0.4)); g.beginPath(); g.moveTo(x0 - bw * 0.1, yb); g.lineTo(x0 + bw / 2, yb - bh * 0.42); g.lineTo(x0 + bw * 1.1, yb); g.closePath(); g.fill();
      g.fillStyle = rgba(C.ink, 0.7); g.fillRect(x0 + bw * 0.35, yb + bh * 0.45, bw * 0.3, bh * 0.55);
    }
    /* gulls */
    g.strokeStyle = rgba(C.ink, 0.8); g.lineWidth = Math.max(1.5, W * 0.0025);
    [[0.3, 0.36], [0.36, 0.32], [0.72, 0.22]].forEach(function (b) {
      var x = W * b[0], y = H * b[1], s = W * 0.018;
      g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x - s * 0.5, y - s * 0.6, x, y); g.quadraticCurveTo(x + s * 0.5, y - s * 0.6, x + s, y); g.stroke();
    });
    /* poster lettering */
    var fs = Math.min(W * 0.085, H * 0.11);
    g.fillStyle = rgba(C.rose, 0.92); g.fillRect(0, H * 0.035, W, fs * 1.35);
    g.fillStyle = rgba(C.ink); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = fs + 'px ' + posterFont;
    g.fillText('BY THE SEA', W / 2, H * 0.035 + fs * 0.7);
    g.font = (fs * 0.5) + 'px ' + posterFont;
    g.fillText('SUMMER 1908', W * 0.17, H * 0.93);
  }

  GamesInTime.register({
    id: 'jigsaw-puzzle',
    frame: 'paper',
    mount: function (root, api) {
      var h = api.h;
      root.appendChild(h('style', null,
        '.game-jigsaw-puzzle .game-toolbar { justify-content: center; }' +
        '.game-jigsaw-puzzle .scoreboard { justify-content: center; font-family: var(--font-mono); font-size: 1rem; }' +
        '.game-jigsaw-puzzle .jg-stage { position: relative; }' +
        '.game-jigsaw-puzzle .jg-canvas { display: block; width: 100%; touch-action: pan-y; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; cursor: grab; border-radius: 10px; }' +
        '.game-jigsaw-puzzle .jg-canvas.is-dragging { cursor: grabbing; }' +
        '.game-jigsaw-puzzle .jg-canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }' +
        '.game-jigsaw-puzzle .jg-toggle[aria-pressed="true"] { background: var(--brand); border-color: var(--brand); color: var(--on-brand); }' +
        '.game-jigsaw-puzzle .jg-caption { margin-top: .7rem; font-size: .95rem; color: var(--ink-muted); text-align: center; }' +
        '.game-jigsaw-puzzle .jg-caption strong { color: var(--ink); }' +
        '.game-jigsaw-puzzle .jg-pics-head { font-family: var(--font-display); font-size: 1.3rem; margin: 1.1rem 0 .5rem; }' +
        '.game-jigsaw-puzzle .jg-pics { display: flex; gap: .5rem; overflow-x: auto; padding: 4px 2px 8px; max-width: 100%; scrollbar-width: thin; }' +
        '.game-jigsaw-puzzle .jg-pic { flex: none; width: 96px; height: 72px; padding: 0; border: 3px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--surface-2); }' +
        '.game-jigsaw-puzzle .jg-pic img, .game-jigsaw-puzzle .jg-pic canvas { width: 100%; height: 100%; object-fit: cover; display: block; }' +
        '.game-jigsaw-puzzle .jg-pic[aria-pressed="true"] { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand); }' +
        '.game-jigsaw-puzzle .seg button { min-width: 44px; padding: .45rem .55rem; }' +
        '.game-jigsaw-puzzle .jg-toggle { padding-inline: .8rem; }' +
        '.game-jigsaw-puzzle .jg-under { margin: .8rem 0 0; }' +
        '.game-jigsaw-puzzle .field { gap: .35rem; }'));

      var cs = getComputedStyle(root);
      function cssVar(n, fb) { var s = cs.getPropertyValue(n).trim(); return s || fb; }
      var C = {};
      [['ink', '--ink'], ['muted', '--ink-muted'], ['surface', '--surface'], ['surface2', '--surface-2'], ['line', '--line'], ['brand', '--brand'], ['gold', '--gold'],
        ['vermilion', '--vermilion'], ['peacock', '--peacock'], ['cobalt', '--cobalt'], ['rose', '--rose'], ['leaf', '--leaf'], ['red', '--red'], ['green', '--green'], ['brass', '--brass'], ['focus', '--focus']]
        .forEach(function (x) { C[x[0]] = parseColour(cssVar(x[1], '#888')); });
      var FONT_POSTER = cssVar('--font-poster', 'Georgia, serif');

      /* ---------- settings and state ---------- */
      var size = [12, 24, 48, 96].indexOf(api.store.get('size', 12)) >= 0 ? api.store.get('size', 12) : 12;
      var best = api.store.get('best', {});
      var guideOn = !!api.store.get('guide', false), edgesOnly = false;
      var images = (api.images ? api.images() : []).slice();
      var own = images.filter(function (im) { return /jigsaw/.test(im.hero); });
      images = own.concat(images.filter(function (im) { return own.indexOf(im) < 0; }));
      var pictures = images.map(function (im) { return { key: im.hero, name: im.caption || im.alt || 'Picture', caption: im.caption || '', credit: im.credit || '', alt: im.alt || im.caption || 'a historical picture', image: im }; }).concat(PATTERNS);
      var picKey = api.store.get('picture', null);
      if (!pictures.some(function (x) { return x.key === picKey; })) picKey = pictures[0].key;
      var pic = null, source = null, sourceW = 0, sourceH = 0, loadToken = 0;
      var cols = 4, rows = 3, N = 12, HE = null, VE = null;
      var pieces = [], groups = {}, nextGroup = 1, zorder = [];
      var p = 40, bx = 0, by = 0, cw = 300, ch = 300, dpr = 1, mode = '';
      var picCanvas = document.createElement('canvas'), baseCanvas = document.createElement('canvas'), dragCache = document.createElement('canvas');
      var hitCtx = document.createElement('canvas').getContext('2d');
      var drag = null, selGroup = 0, placedCount = 0, done = false, borderDone = false, ready = false;
      var started = false, elapsed = 0, runFrom = 0, ticker = null, raf = 0, destroyed = false, scatterAnim = null, winAt = 0, flashes = [], finalSecs = 0;
      var shown = '';

      /* ---------- DOM ---------- */
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(); } }, 'New game');
      var sizeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Number of pieces' });
      [12, 24, 48, 96].forEach(function (n) {
        sizeSeg.appendChild(h('button', { type: 'button', 'aria-pressed': String(n === size), 'data-n': n, 'aria-label': n + ' pieces', onclick: function () { size = n; api.store.set('size', n); syncSeg(); newGame(); } }, String(n)));
      });
      var edgeBtn = h('button', { class: 'btn jg-toggle', type: 'button', 'aria-pressed': 'false', title: 'Show only the pieces with a straight edge (E)', onclick: function () { setEdges(!edgesOnly); } }, 'Edges only');
      var guideBtn = h('button', { class: 'btn jg-toggle', type: 'button', 'aria-pressed': String(guideOn), title: 'Show a faint copy of the picture on the board (G)', onclick: function () { setGuide(!guideOn); } }, 'Guide picture');
      root.appendChild(h('div', { class: 'game-toolbar' }, newBtn, h('span', { class: 'field' }, h('span', { 'aria-hidden': 'true' }, 'Pieces'), sizeSeg)));
      var placedEl = h('span'), timeEl = h('span'), bestEl = h('span');
      root.appendChild(h('div', { class: 'scoreboard', role: 'group', 'aria-label': 'Progress' }, placedEl, timeEl, bestEl));
      var canvas = h('canvas', { class: 'jg-canvas', tabindex: '0', role: 'img', 'aria-describedby': 'jg-help' });
      var ctx = canvas.getContext('2d');
      root.appendChild(h('div', { class: 'jg-stage' }, canvas));
      root.appendChild(h('div', { class: 'game-toolbar jg-under' }, edgeBtn, guideBtn));
      var captionEl = h('p', { class: 'jg-caption' });
      root.appendChild(captionEl);
      root.appendChild(h('p', { class: 'game-note', id: 'jg-help' },
        'Drag pieces onto the board. A piece dropped near its place clicks in. Pieces that fit together stick and move as one. ',
        'Keyboard: Tab picks a piece, arrows move it (Shift for big steps), Enter drops it, G shows the guide picture, E shows edge pieces only.'));
      root.appendChild(h('p', { class: 'jg-pics-head' }, 'Choose a picture'));
      var picStrip = h('div', { class: 'jg-pics', role: 'group', 'aria-label': 'Pictures' });
      root.appendChild(picStrip);
      var picBtns = pictures.map(function (pc) {
        var inner;
        if (pc.image) inner = h('img', { src: pc.image.card || pc.image.hero, alt: '', loading: 'lazy', decoding: 'async' });
        else {
          inner = document.createElement('canvas'); inner.width = 192; inner.height = 144;
          var g = inner.getContext('2d');
          if (pc.key === 'pattern:tiles') paintTiles(g, 192, 144, C); else paintSeaside(g, 192, 144, C, FONT_POSTER);
        }
        var b = h('button', { class: 'jg-pic', type: 'button', 'aria-pressed': 'false', 'aria-label': 'Picture: ' + pc.name, title: pc.name, onclick: function () { picKey = pc.key; api.store.set('picture', picKey); syncPics(); newGame(); } }, inner);
        picStrip.appendChild(b);
        return b;
      });
      function syncSeg() { Array.prototype.forEach.call(sizeSeg.children, function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-n')) === size)); }); }
      function syncPics() { picBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(pictures[i].key === picKey)); }); }
      function say(t) { if (t !== shown) { shown = t; api.status(t); } }

      /* ---------- cutting the picture ---------- */
      function cut() {
        var grid = SIZES[size];
        var portrait = sourceW && sourceH && sourceH > sourceW * 1.1;
        cols = portrait ? grid[1] : grid[0]; rows = portrait ? grid[0] : grid[1]; N = cols * rows;
        var rnd = api.random;
        /* One curve per shared edge: a neck and a round knob, nudged a little at random so no two are alike. */
        function curve(ax, ay, ux, uy, nx, ny) {
          var sgn = rnd() < 0.5 ? -1 : 1;
          var t = 0.085 + (rnd() - 0.5) * 0.02, b = (rnd() - 0.5) * 0.08, c = (rnd() - 0.5) * 0.06, d = (rnd() - 0.5) * 0.06, e = (rnd() - 0.5) * 0.05;
          var pts = [[0, 0], [0.2, e], [0.5 + b + d, -c + e], [0.5 - t + b, t + e], [0.5 - 2 * t + b - d, 3 * t + e], [0.5 + 2 * t + b - d, 3 * t + e], [0.5 + t + b, t + e], [0.5 + b + d, -c + e], [0.8, e], [1, 0]];
          return pts.map(function (q) { return [ax + q[0] * ux + q[1] * nx * sgn, ay + q[0] * uy + q[1] * ny * sgn]; });
        }
        HE = []; VE = [];
        for (var r = 0; r <= rows; r++) { HE[r] = []; VE[r] = []; }
        for (r = 1; r < rows; r++) for (var c = 0; c < cols; c++) HE[r][c] = curve(c, r, 1, 0, 0, 1);
        for (r = 0; r < rows; r++) for (c = 1; c < cols; c++) VE[r][c] = curve(c, r, 0, 1, 1, 0);
        pieces = []; groups = {}; nextGroup = 1; zorder = [];
        for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
          var pc = { i: pieces.length, r: r, c: c, x: c, y: r, locked: false, g: nextGroup, edge: r === 0 || c === 0 || r === rows - 1 || c === cols - 1, cv: null, path: null };
          groups[nextGroup++] = [pc.i];
          pc.path = new Path2D(); trace(pc.path, r, c);
          pieces.push(pc); zorder.push(pc.i);
        }
      }
      function trace(g, r, c) {
        g.moveTo(0, 0);
        if (r === 0) g.lineTo(1, 0); else seg(g, HE[r][c], false, r, c);
        if (c === cols - 1) g.lineTo(1, 1); else seg(g, VE[r][c + 1], false, r, c);
        if (r === rows - 1) g.lineTo(0, 1); else seg(g, HE[r + 1][c], true, r, c);
        if (c === 0) g.lineTo(0, 0); else seg(g, VE[r][c], true, r, c);
        g.closePath();
      }
      function seg(g, pts, rev, r, c) {
        var a = rev ? pts.slice().reverse() : pts;
        for (var i = 1; i < a.length; i += 3) g.bezierCurveTo(a[i][0] - c, a[i][1] - r, a[i + 1][0] - c, a[i + 1][1] - r, a[i + 2][0] - c, a[i + 2][1] - r);
      }

      /* ---------- layout ---------- */
      /* Wide screens: the board in the middle, pieces all round it. Narrow screens: the board on top, pieces below. */
      function bands() {
        var bw = cols * p, bh = rows * p, m = 0.32 * p, out = [];
        if (mode === 'wide') {
          out.push([m, m, bx - 8 - 0.1 * p, ch - m]);
          out.push([bx + bw + 8 + 0.1 * p, m, cw - m, ch - m]);
          out.push([bx - 8, m, bx + bw + 8, by - 8 - 0.1 * p]);
          out.push([bx - 8, by + bh + 8 + 0.1 * p, bx + bw + 8, ch - m]);
        } else out.push([m, by + bh + 8 + 0.2 * p, cw - m, ch - m]);
        return out;
      }
      function slotSize() { return (mode === 'wide' ? 1.22 : 1.15) * p; }
      function slots(s) {
        var out = [];
        bands().forEach(function (b) {
          var w = b[2] - b[0], hh = b[3] - b[1];
          if (w < s * 0.85 || hh < s * 0.85) return;
          var nx = Math.max(1, Math.floor(w / s)), ny = Math.max(1, Math.floor(hh / s)), sx = w / nx, sy = hh / ny;
          for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) out.push([b[0] + (i + 0.5) * sx, b[1] + (j + 0.5) * sy]);
        });
        return out;
      }
      function layout() {
        var w = Math.max(260, Math.floor(root.clientWidth || 300));
        var availH = Math.max(360, (window.innerHeight || 800) - 170);
        var newMode = w >= 620 ? 'wide' : 'tall', oldMode = mode;
        var op = p, ocw = cw, och = ch;
        mode = newMode; cw = w;
        if (mode === 'wide') {
          /* start big, then shrink the board until the table round it really holds every piece */
          var pMax = Math.floor(Math.min(0.56 * w / cols, (availH - 30) / (rows + 1.5))), pMin = Math.max(18, Math.floor(0.34 * w / cols));
          for (p = pMax; ; p = Math.max(pMin, Math.floor(p * 0.95))) {
            var bw = cols * p, bh = rows * p;
            bx = Math.round((w - bw) / 2); ch = Math.ceil(bh + 1.6 * p);
            for (;;) { by = Math.round((ch - bh) / 2); if (slots(slotSize()).length >= N || ch >= availH) break; ch += 10; }
            if (slots(slotSize()).length >= N || p <= pMin) break;
          }
        } else {
          p = Math.floor((w - 16) / cols);
          var s = slotSize(), per = Math.max(1, Math.floor((w - 0.64 * p) / s));
          bx = Math.round((w - cols * p) / 2); by = Math.round(0.36 * p);
          ch = Math.ceil(by + rows * p + 8 + 0.2 * p + Math.ceil(N / per) * s + 0.32 * p + 4);
        }
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.style.height = ch + 'px';
        canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
        [baseCanvas, dragCache].forEach(function (cv) { cv.width = canvas.width; cv.height = canvas.height; });
        if (ready && oldMode && oldMode !== mode) scatter(false);
        if (ready) clampAll();
        return p !== op || cw !== ocw || ch !== och;
      }
      function paintPicture() {
        var k = p * dpr;
        picCanvas.width = Math.round(cols * k); picCanvas.height = Math.round(rows * k);
        var g = picCanvas.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0);
        if (pic && pic.image && source) {
          /* crop the picture to the board's shape, around its focus point */
          var want = cols / rows, sw = sourceW, sh = sourceH;
          if (sw / sh > want) sw = sh * want; else sh = sw / want;
          var fx = 0.5, fy = 0.4, f = (pic.image.focus || '').match(/([\d.]+)%\s+([\d.]+)%/);
          if (f) { fx = Number(f[1]) / 100; fy = Number(f[2]) / 100; }
          var sx = Math.max(0, Math.min(sourceW - sw, sourceW * fx - sw / 2)), sy = Math.max(0, Math.min(sourceH - sh, sourceH * fy - sh / 2));
          g.imageSmoothingQuality = 'high';
          g.drawImage(source, sx, sy, sw, sh, 0, 0, picCanvas.width, picCanvas.height);
        } else if (pic && pic.key === 'pattern:seaside') paintSeaside(g, picCanvas.width, picCanvas.height, C, FONT_POSTER);
        else paintTiles(g, picCanvas.width, picCanvas.height, C);
      }
      /* Each piece is drawn once, into its own small canvas, with a light bevel round its edge. */
      function renderPieces() {
        var k = p * dpr, S = Math.ceil((1 + 2 * M) * k), off = M * k, lw = 1 / p;
        pieces.forEach(function (pc) {
          var cv = pc.cv || (pc.cv = document.createElement('canvas'));
          cv.width = S; cv.height = S;
          var g = cv.getContext('2d');
          g.save();
          g.setTransform(k, 0, 0, k, off, off);
          g.beginPath(); trace(g, pc.r, pc.c); g.clip();
          g.setTransform(1, 0, 0, 1, 0, 0);
          var sx = (pc.c - M) * k, sy = (pc.r - M) * k, x0 = Math.max(0, sx), y0 = Math.max(0, sy), x1 = Math.min(picCanvas.width, sx + S), y1 = Math.min(picCanvas.height, sy + S);
          if (x1 > x0 && y1 > y0) g.drawImage(picCanvas, x0, y0, x1 - x0, y1 - y0, x0 - sx, y0 - sy, x1 - x0, y1 - y0);
          g.setTransform(k, 0, 0, k, off, off);
          g.lineWidth = 3 * lw;
          g.translate(1.2 * lw, 1.2 * lw); g.strokeStyle = rgba(C.surface, 0.55); g.beginPath(); trace(g, pc.r, pc.c); g.stroke();
          g.translate(-2.4 * lw, -2.4 * lw); g.strokeStyle = rgba(C.ink, 0.4); g.beginPath(); trace(g, pc.r, pc.c); g.stroke();
          g.restore();
          g.setTransform(k, 0, 0, k, off, off);
          g.lineWidth = 1 * lw; g.strokeStyle = rgba(C.ink, 0.55); g.beginPath(); trace(g, pc.r, pc.c); g.stroke();
        });
      }
      /* The table: the board with its frame, the guide picture if wanted, and every locked piece. */
      function renderBase() {
        var g = baseCanvas.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        var bw = cols * p, bh = rows * p;
        g.fillStyle = rgba(mix(C.surface2, C.ink, 0.1)); g.fillRect(bx - 7, by - 7, bw + 14, bh + 14);
        g.strokeStyle = rgba(C.brass, 0.9); g.lineWidth = 3; g.strokeRect(bx - 6, by - 6, bw + 12, bh + 12);
        g.fillStyle = rgba(mix(C.surface2, C.ink, 0.2)); g.fillRect(bx, by, bw, bh);
        if (guideOn) { g.globalAlpha = 0.3; g.drawImage(picCanvas, bx, by, bw, bh); g.globalAlpha = 1; }
        else {
          g.strokeStyle = rgba(C.ink, 0.12); g.lineWidth = 1;
          for (var c = 1; c < cols; c++) { g.beginPath(); g.moveTo(bx + c * p, by); g.lineTo(bx + c * p, by + bh); g.stroke(); }
          for (var r = 1; r < rows; r++) { g.beginPath(); g.moveTo(bx, by + r * p); g.lineTo(bx + bw, by + r * p); g.stroke(); }
        }
        g.setTransform(1, 0, 0, 1, 0, 0);
        pieces.forEach(function (pc) { if (pc.locked) blit(g, pc, pc.c, pc.r); });
        if (done) { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.drawImage(picCanvas, bx, by, bw, bh); g.setTransform(1, 0, 0, 1, 0, 0); }
      }
      function blit(g, pc, x, y) {
        g.drawImage(pc.cv, Math.round((bx + (x - M) * p) * dpr), Math.round((by + (y - M) * p) * dpr));
      }
      function rebuild() { paintPicture(); renderPieces(); renderBase(); render(); }

      /* ---------- scatter ---------- */
      function scatter(animate) {
        var loose = [];
        Object.keys(groups).forEach(function (id) { var m = groups[id]; if (m.length && !pieces[m[0]].locked) loose.push(Number(id)); });
        if (!loose.length) return;
        var s = slotSize(), sl = slots(s);
        while (sl.length < loose.length && s > 0.5 * p) { s *= 0.92; sl = slots(s); }
        sl.sort(function () { return api.random() - 0.5; });
        loose.forEach(function (id, n) {
          var m = groups[id], lead = pieces[m[0]], slot = sl[n % Math.max(1, sl.length)] || [cw / 2, ch - p];
          var tx = (slot[0] + (api.random() - 0.5) * 0.16 * s - bx) / p - 0.5, ty = (slot[1] + (api.random() - 0.5) * 0.16 * s - by) / p - 0.5;
          var dx = tx - lead.x, dy = ty - lead.y;
          m.forEach(function (i) { var q = pieces[i]; q.fromX = q.x; q.fromY = q.y; q.x += dx; q.y += dy; });
        });
        clampAll();
        scatterAnim = animate && !api.reducedMotion ? { t0: performance.now(), dur: 800 } : null;
      }
      function clampAll() { Object.keys(groups).forEach(function (id) { var m = groups[id]; if (m.length && !pieces[m[0]].locked) clampGroup(m); }); }
      function clampGroup(m) {
        var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        m.forEach(function (i) { var q = pieces[i]; x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x + 1); y1 = Math.max(y1, q.y + 1); });
        var e = 0.3, minX = -bx / p + e, maxX = (cw - bx) / p - e, minY = -by / p + e, maxY = (ch - by) / p - e, dx = 0, dy = 0;
        if (x1 - x0 > maxX - minX || x0 < minX) dx = minX - x0; else if (x1 > maxX) dx = maxX - x1;
        if (y1 - y0 > maxY - minY || y0 < minY) dy = minY - y0; else if (y1 > maxY) dy = maxY - y1;
        if (dx || dy) m.forEach(function (i) { pieces[i].x += dx; pieces[i].y += dy; });
      }

      /* ---------- the clock ---------- */
      function seconds() { return (elapsed + (runFrom ? performance.now() - runFrom : 0)) / 1000; }
      function startClock() { if (started || done) return; started = true; runFrom = performance.now(); ticker = setInterval(renderTime, 500); }
      function stopClock() { if (runFrom) { elapsed += performance.now() - runFrom; runFrom = 0; } if (ticker) { clearInterval(ticker); ticker = null; } }
      function onVisibility() {
        if (document.hidden) { if (runFrom) { elapsed += performance.now() - runFrom; runFrom = 0; } if (ticker) { clearInterval(ticker); ticker = null; } }
        else { if (started && !done && !runFrom) { runFrom = performance.now(); ticker = setInterval(renderTime, 500); } render(); }
      }
      function renderTime() { timeEl.textContent = 'Time ' + clock(done ? finalSecs : seconds()); }
      function renderScore() {
        placedEl.textContent = placedCount + ' of ' + N + ' placed';
        renderTime();
        bestEl.textContent = best[size] ? 'Best for ' + size + ': ' + clock(best[size]) : 'Best for ' + size + ': not yet';
      }
      function progressText() {
        if (!placedCount) return 'Put the picture back together: drag the ' + N + ' pieces onto the board.';
        return placedCount + ' of ' + N + ' pieces in place.' + (borderDone ? ' The border is finished!' : '');
      }
      function describe() {
        canvas.setAttribute('aria-label', 'Jigsaw puzzle of ' + (pic ? pic.alt : 'a picture') + ', cut into ' + N + ' pieces. ' + placedCount + ' of ' + N + ' are in place.' + (selGroup ? ' A piece is picked up.' : ''));
      }

      /* ---------- moving, joining and locking ---------- */
      function visible(pc) { return pc.locked || !edgesOnly || pc.edge; }
      function toTop(m) { zorder = zorder.filter(function (i) { return m.indexOf(i) < 0; }).concat(m); }
      function pickAt(x, y) {
        for (var n = zorder.length - 1; n >= 0; n--) {
          var pc = pieces[zorder[n]];
          if (pc.locked || !visible(pc)) continue;
          var lx = (x - bx) / p - pc.x, ly = (y - by) / p - pc.y;
          if (lx < -M || ly < -M || lx > 1 + M || ly > 1 + M) continue;
          if (hitCtx.isPointInPath(pc.path, lx, ly)) return pc;
        }
        return null;
      }
      function lockGroup(m) {
        var now = performance.now();
        m.forEach(function (i) { var pc = pieces[i]; pc.x = pc.c; pc.y = pc.r; pc.locked = true; pc.g = 0; flashes.push({ i: i, t0: now }); });
        Object.keys(groups).forEach(function (id) { if (groups[id] === m) delete groups[id]; });
        zorder = zorder.filter(function (i) { return !pieces[i].locked; });
        placedCount = pieces.filter(function (q) { return q.locked; }).length;
        var g = baseCanvas.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0);
        m.forEach(function (i) { blit(g, pieces[i], pieces[i].c, pieces[i].r); });
        api.sound('clack');
        if (!borderDone && pieces.every(function (q) { return !q.edge || q.locked; })) {
          borderDone = true;
          if (placedCount < N) { api.sound('bell'); api.announce('The border is finished.'); }
          if (edgesOnly) setEdges(false, true);
        }
      }
      function drop(m) {
        var thr = Math.max(SNAP, 10 / p), n;
        for (n = 0; n < m.length; n++) {
          var pc = pieces[m[n]];
          if (Math.hypot(pc.x - pc.c, pc.y - pc.r) < thr) { lockGroup(m); afterDrop(); return; }
        }
        var joined = false, again = true, guard = 0, NB = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        while (again && guard++ < N) {
          again = false;
          for (n = 0; n < m.length && !again; n++) {
            var a = pieces[m[n]];
            for (var k = 0; k < 4 && !again; k++) {
              var rr = a.r + NB[k][1], cc = a.c + NB[k][0];
              if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
              var b = pieces[rr * cols + cc];
              if (b.locked || b.g === a.g || !visible(b)) continue;
              var dx = (b.x - a.x) - (b.c - a.c), dy = (b.y - a.y) - (b.r - a.r);
              if (Math.hypot(dx, dy) < thr) {
                m.forEach(function (i) { pieces[i].x += dx; pieces[i].y += dy; });
                var other = groups[b.g], gid = a.g;
                delete groups[b.g];
                other.forEach(function (i) { pieces[i].g = gid; m.push(i); });
                groups[gid] = m;
                toTop(m);
                joined = again = true;
              }
            }
          }
        }
        if (joined) { api.sound('tick'); flashes.push({ i: m[0], t0: performance.now(), join: true }); }
        else api.sound('thud');
        clampGroup(m);
        afterDrop();
      }
      function afterDrop() {
        renderScore(); describe();
        if (placedCount === N) win(); else say(progressText());
        render();
      }
      function win() {
        done = true; stopClock();
        finalSecs = Math.max(1, Math.floor(seconds()));
        var old = best[size], newBest = !old || finalSecs < old;
        if (newBest) { best[size] = finalSecs; api.store.set('best', best); }
        winAt = performance.now(); selGroup = 0;
        renderBase(); renderScore();
        say('Finished in ' + clock(finalSecs) + '!' + (newBest && old ? ' A new best for ' + size + ' pieces.' : newBest ? ' Your first time for ' + size + ' pieces.' : ' Your best for ' + size + ' is ' + clock(old) + '.'));
        api.celebrate('Puzzle finished in ' + clock(finalSecs) + '!' + (newBest && old ? ' New best!' : ''));
        render();
      }
      function setEdges(on, auto) {
        edgesOnly = on;
        edgeBtn.setAttribute('aria-pressed', String(on));
        api.sound('flip');
        if (selGroup && groups[selGroup] && !visible(pieces[groups[selGroup][0]])) selGroup = 0;
        if (auto) say('All the edge pieces are in. Showing every piece again.');
        else if (on) say('Showing edge pieces only. Build the border first!');
        else say(progressText());
        render();
      }
      function setGuide(on) {
        guideOn = on; api.store.set('guide', on);
        guideBtn.setAttribute('aria-pressed', String(on));
        api.sound('flip');
        if (ready) { renderBase(); render(); }
      }

      /* ---------- drawing ---------- */
      function render() { if (!raf && !destroyed) raf = requestAnimationFrame(frame); }
      function frame(now) {
        raf = 0;
        if (destroyed || !ready) return;
        var busy = false;
        if (scatterAnim) { if (now - scatterAnim.t0 >= scatterAnim.dur + 160) scatterAnim = null; else busy = true; }
        flashes = flashes.filter(function (f) { return now - f.t0 < 450; });
        if (flashes.length) busy = true;
        if (done && now - winAt < 1800) busy = true;
        draw(now);
        if (busy && !document.hidden) render();
      }
      function piecePos(pc, now) {
        if (!scatterAnim || pc.fromX == null) return [pc.x, pc.y];
        var t = ease(Math.min(1, Math.max(0, (now - scatterAnim.t0 - (pc.i % 16) * 10) / scatterAnim.dur)));
        return [pc.fromX + (pc.x - pc.fromX) * t, pc.fromY + (pc.y - pc.fromY) * t];
      }
      function draw(now) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (drag && drag.cache) {
          ctx.drawImage(dragCache, 0, 0);
          drawLifted(groups[drag.g] || []);
        } else {
          ctx.drawImage(baseCanvas, 0, 0);
          zorder.forEach(function (i) { var pc = pieces[i]; if (visible(pc)) { var q = piecePos(pc, now); blit(ctx, pc, q[0], q[1]); } });
          if (selGroup && groups[selGroup]) outlineGroup(groups[selGroup]);
        }
        flashes.forEach(function (f) {
          var pc = pieces[f.i], t = (now - f.t0) / 450;
          ctx.setTransform(dpr * p, 0, 0, dpr * p, (bx + pc.x * p) * dpr, (by + pc.y * p) * dpr);
          ctx.globalAlpha = (1 - t) * 0.7; ctx.fillStyle = rgba(f.join ? C.gold : C.surface);
          ctx.fill(pc.path); ctx.globalAlpha = 1;
        });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (done) drawShine(now);
      }
      function drawLifted(m) {
        var shadow = m.length <= 8;
        m.forEach(function (i) {
          var pc = pieces[i];
          if (shadow) { ctx.save(); ctx.shadowColor = rgba(C.ink, 0.45); ctx.shadowBlur = 12 * dpr; ctx.shadowOffsetX = 3 * dpr; ctx.shadowOffsetY = 6 * dpr; blit(ctx, pc, pc.x, pc.y); ctx.restore(); }
          else blit(ctx, pc, pc.x, pc.y);
        });
      }
      function outlineGroup(m) {
        ctx.save();
        m.forEach(function (i) {
          var pc = pieces[i];
          ctx.setTransform(dpr * p, 0, 0, dpr * p, (bx + pc.x * p) * dpr, (by + pc.y * p) * dpr);
          ctx.lineWidth = 4 / p; ctx.strokeStyle = rgba(C.ink); ctx.stroke(pc.path);
          ctx.lineWidth = 2 / p; ctx.strokeStyle = rgba(C.gold); ctx.setLineDash([6 / p, 4 / p]); ctx.stroke(pc.path); ctx.setLineDash([]);
        });
        ctx.restore();
      }
      function drawShine(now) {
        var t = api.reducedMotion ? 1 : Math.min(1, (now - winAt) / 1600);
        if (t >= 1) return;
        var bw = cols * p, bh = rows * p, x = bx - bw * 0.4 + bw * 1.8 * t;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
        var g = ctx.createLinearGradient(x - bw * 0.25, by, x + bw * 0.25, by + bh);
        g.addColorStop(0, rgba(C.surface, 0)); g.addColorStop(0.5, rgba(C.surface, 0.55)); g.addColorStop(1, rgba(C.surface, 0));
        ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh);
        ctx.restore();
      }

      /* ---------- pointer and touch ---------- */
      function local(ev) { var r = canvas.getBoundingClientRect(); return { x: (ev.clientX - r.left) * cw / r.width, y: (ev.clientY - r.top) * ch / r.height }; }
      function buildCache() {
        var g = dragCache.getContext('2d'), m = groups[drag.g];
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, dragCache.width, dragCache.height);
        g.drawImage(baseCanvas, 0, 0);
        zorder.forEach(function (i) { var pc = pieces[i]; if (m.indexOf(i) < 0 && visible(pc)) blit(g, pc, pc.x, pc.y); });
        drag.cache = true;
      }
      var pointerFocus = false;
      function onDown(ev) {
        pointerFocus = true; setTimeout(function () { pointerFocus = false; }, 0);
        if (ev.button > 0 || drag || !ready || done || scatterAnim) return;
        var pt = local(ev), pc = pickAt(pt.x, pt.y);
        if (!pc) { if (selGroup) { selGroup = 0; render(); } return; }
        ev.preventDefault();
        if (document.activeElement !== canvas) canvas.focus({ preventScroll: true });
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
        var m = groups[pc.g];
        toTop(m); selGroup = pc.g;
        drag = { g: pc.g, id: ev.pointerId, sx: pt.x, sy: pt.y, start: m.map(function (i) { return [pieces[i].x, pieces[i].y]; }), moved: false, cache: false };
        startClock();
        api.sound('click');
        render();
      }
      function onMove(ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        var pt = local(ev), dx = (pt.x - drag.sx) / p, dy = (pt.y - drag.sy) / p, m = groups[drag.g];
        if (!m) return;
        if (!drag.moved && Math.hypot(dx, dy) * p > 4) { drag.moved = true; canvas.classList.add('is-dragging'); buildCache(); }
        if (!drag.moved) return;
        m.forEach(function (i, n) { pieces[i].x = drag.start[n][0] + dx; pieces[i].y = drag.start[n][1] + dy; });
        clampGroup(m);
        render();
      }
      function onUp(ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        var d = drag, m = groups[d.g];
        drag = null;
        canvas.classList.remove('is-dragging');
        try { canvas.releasePointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
        if (d.moved && m) drop(m); else render();
      }
      function onCancel(ev) { if (drag && ev.pointerId === drag.id) onUp(ev); }
      /* Let the page scroll when a finger lands on the table, but not when it lands on a piece. */
      function onTouchStart(ev) {
        if (!ready || done || ev.touches.length !== 1) return;
        var r = canvas.getBoundingClientRect(), t = ev.touches[0];
        if (pickAt((t.clientX - r.left) * cw / r.width, (t.clientY - r.top) * ch / r.height)) ev.preventDefault();
      }
      function onTouchMove(ev) { if (drag) ev.preventDefault(); }

      /* ---------- keyboard ---------- */
      function looseGroups() {
        var ids = [];
        pieces.forEach(function (pc) { if (!pc.locked && visible(pc) && ids.indexOf(pc.g) < 0) ids.push(pc.g); });
        return ids;
      }
      function selectGroup(id) { selGroup = id; if (groups[id]) toTop(groups[id]); api.sound('tick'); describe(); render(); }
      function onKey(ev) {
        if (ev.altKey || ev.ctrlKey || ev.metaKey || !ready) return;
        var k = ev.key;
        if (k === 'g' || k === 'G') { ev.preventDefault(); setGuide(!guideOn); return; }
        if (done) return;
        if (k === 'e' || k === 'E') { ev.preventDefault(); setEdges(!edgesOnly); return; }
        var ids = looseGroups(), at = ids.indexOf(selGroup);
        if (k === 'Tab') {
          if (!ev.shiftKey && at < ids.length - 1) { ev.preventDefault(); selectGroup(ids[at + 1]); return; }
          if (ev.shiftKey && at > 0) { ev.preventDefault(); selectGroup(ids[at - 1]); return; }
          selGroup = 0; render(); return;
        }
        if (k === 'Escape') { if (selGroup) { ev.preventDefault(); selGroup = 0; render(); } return; }
        if (!selGroup || !groups[selGroup]) { if (/^Arrow|^Enter$|^ $/.test(k) && ids.length) { ev.preventDefault(); selectGroup(ids[0]); } return; }
        var m = groups[selGroup];
        if (k === 'Enter' || k === ' ') {
          ev.preventDefault();
          drop(m);
          if (!done) { selGroup = pieces[m[0]].locked ? (looseGroups()[0] || 0) : pieces[m[0]].g; if (selGroup && groups[selGroup]) toTop(groups[selGroup]); }
          render(); return;
        }
        var st = ev.shiftKey ? 1 : 0.25, dx = 0, dy = 0;
        if (k === 'ArrowLeft') dx = -st; else if (k === 'ArrowRight') dx = st; else if (k === 'ArrowUp') dy = -st; else if (k === 'ArrowDown') dy = st; else return;
        ev.preventDefault();
        startClock();
        m.forEach(function (i) { pieces[i].x += dx; pieces[i].y += dy; });
        clampGroup(m);
        render();
      }

      /* ---------- games ---------- */
      function loadPicture(then) {
        pic = pictures.filter(function (x) { return x.key === picKey; })[0] || PATTERNS[0];
        var token = ++loadToken;
        if (!pic.image) { source = null; sourceW = 0; sourceH = 0; then(); return; }
        say('Fetching the picture…');
        var img = new Image();
        img.decoding = 'async';
        img.onload = function () {
          if (token !== loadToken || destroyed) return;
          source = img; sourceW = img.naturalWidth; sourceH = img.naturalHeight;
          then();
        };
        img.onerror = function () {
          if (token !== loadToken || destroyed) return;
          pic = PATTERNS[0]; source = null; sourceW = 0; sourceH = 0;
          then('That picture would not load, so the computer painted one instead. Put it back together!');
        };
        img.src = pic.image.hero;
      }
      function newGame() {
        ready = false; done = false; borderDone = false; placedCount = 0; selGroup = 0; drag = null; flashes = []; winAt = 0; scatterAnim = null;
        started = false; elapsed = 0; runFrom = 0; stopClock();
        canvas.classList.remove('is-dragging');
        if (edgesOnly) { edgesOnly = false; edgeBtn.setAttribute('aria-pressed', 'false'); }
        syncSeg(); syncPics();
        loadPicture(function (note) {
          if (destroyed) return;
          cut();
          layout();
          paintPicture(); renderPieces();
          pieces.forEach(function (pc) { pc.x = pc.c; pc.y = pc.r; });
          ready = true;
          scatter(true);
          renderBase();
          captionEl.replaceChildren(h('strong', null, 'Picture: '), (pic.caption ? pic.caption + '. ' : '') + (pic.credit ? pic.credit + '.' : ''));
          renderScore(); describe();
          api.sound('shuffle');
          say(note || progressText());
          render();
        });
      }

      /* ---------- wiring ---------- */
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onCancel);
      canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      canvas.addEventListener('keydown', onKey);
      canvas.addEventListener('focus', function () { if (!pointerFocus && !selGroup && ready && !done) { var ids = looseGroups(); if (ids.length) selectGroup(ids[0]); } });
      canvas.addEventListener('blur', function () { render(); });
      document.addEventListener('visibilitychange', onVisibility);
      var queued = 0;
      function onResize() {
        if (queued || destroyed) return;
        queued = requestAnimationFrame(function () {
          queued = 0;
          if (!ready || drag) return;
          var w = Math.max(260, Math.floor(root.clientWidth || 0));
          var dprNow = Math.min(2, window.devicePixelRatio || 1);
          if (w === cw && dprNow === dpr && canvas.width === Math.round(cw * dpr)) return;
          if (layout()) rebuild(); else { renderBase(); render(); }
        });
      }
      var ro = window.ResizeObserver ? new ResizeObserver(onResize) : null;
      if (ro) ro.observe(root);
      window.addEventListener('resize', onResize);

      /* For the automated play-test only: read-only facts about the table, in CSS pixels. Changes nothing. */
      canvas.gitTest = {
        info: function () {
          return {
            ready: ready, done: done, cols: cols, rows: rows, p: p, placed: placedCount, edgesOnly: edgesOnly, animating: !!scatterAnim, picture: pic ? pic.key : '',
            pieces: pieces.map(function (pc) { return { i: pc.i, r: pc.r, c: pc.c, x: bx + (pc.x + 0.5) * p, y: by + (pc.y + 0.5) * p, hx: bx + (pc.c + 0.5) * p, hy: by + (pc.r + 0.5) * p, locked: pc.locked, g: pc.g, edge: pc.edge, z: zorder.indexOf(pc.i) }; })
          };
        }
      };

      newGame();
      /* the painted seaside poster uses the hall's poster font; paint it again once the font has arrived */
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
        if (destroyed || !ready || drag || !pic || pic.key !== 'pattern:seaside') return;
        rebuild();
      });

      return {
        destroy: function () {
          destroyed = true;
          stopClock();
          if (raf) cancelAnimationFrame(raf);
          if (queued) cancelAnimationFrame(queued);
          if (ro) ro.disconnect();
          window.removeEventListener('resize', onResize);
          document.removeEventListener('visibilitychange', onVisibility);
          canvas.gitTest = null;
          pieces.forEach(function (pc) { if (pc.cv) { pc.cv.width = 0; pc.cv.height = 0; } });
          [picCanvas, baseCanvas, dragCache].forEach(function (cv) { cv.width = 0; cv.height = 0; });
        }
      };
    }
  });
})();
