/* Tangram, the craze of 1817. Copy the silhouette from the puzzle book using all seven pieces.
   Every silhouette below was built from a known placement of the seven pieces and checked by a small solver
   (right shapes, no overlaps, all seven used), so every puzzle can be solved exactly. Pieces snap to a quarter-unit
   grid, to 45 degree turns and to the corners of the picture, so an exact fit is always reachable by mouse, finger
   or keyboard. A solution is checked by sampling the board: the pieces must cover the shape, not overlap and not
   stick out. See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  /* Piece shapes with one corner at the origin. Units: the whole square is 4 by 4. */
  var LOCAL = {
    L: [[0, 0], [4, 0], [2, 2]],
    M: [[0, 0], [2, 0], [0, 2]],
    S: [[0, 0], [2, 0], [1, 1]],
    Q: [[0, 0], [1, 1], [0, 2], [-1, 1]],
    P: [[0, 0], [2, 0], [3, 1], [1, 1]]
  };
  /* The puzzle book, easiest first. Each piece: [type, turn in 45 degree steps clockwise, flipped, centre x, centre y]. */
  var FIGS = [
    { id: 'arrow', name: 'The Arrow', p: [['L', 1, 0, 3.771236, 1.885618], ['L', 3, 0, 3.771236, 3.771236], ['M', 7, 0, 2.357023, 2.828427], ['P', 3, 0, 1.414214, 2.12132], ['S', 1, 0, 1.885618, 3.771236], ['S', 3, 0, 0.471405, 1.885618], ['Q', 1, 0, 0.707107, 3.535534]] },
    { id: 'table', name: 'The Table', p: [['L', 3, 0, 0.942809, 0.942809], ['M', 1, 0, 2.828427, 0.942809], ['L', 5, 0, 4.714045, 0.942809], ['P', 3, 1, 0.707107, 2.828427], ['S', 1, 0, 4.714045, 2.357023], ['S', 7, 0, 0.942809, 3.771236], ['Q', 1, 0, 4.949747, 3.535534]] },
    { id: 'letter-t', name: 'Letter T', p: [['L', 5, 0, 1.885618, 0.942809], ['S', 1, 0, 0.471405, 0.942809], ['S', 3, 0, 3.299832, 0.471405], ['M', 7, 0, 3.771236, 1.414214], ['Q', 1, 0, 4.949747, 0.707107], ['L', 1, 0, 2.357023, 3.299832], ['P', 1, 0, 3.535534, 2.828427]] },
    { id: 'letter-l', name: 'Letter L', p: [['S', 3, 0, 0.471405, 0.471405], ['M', 7, 0, 0.942809, 1.414214], ['P', 1, 0, 0.707107, 2.828427], ['S', 1, 0, 0.471405, 3.771236], ['L', 3, 0, 0.942809, 5.18545], ['L', 7, 0, 1.885618, 6.128259], ['Q', 1, 0, 3.535534, 6.363961]] },
    { id: 'letter-e', name: 'Letter E', p: [['L', 3, 0, 0.942809, 0.942809], ['S', 7, 0, 2.357023, 0.942809], ['M', 7, 0, 0.942809, 2.828427], ['P', 1, 0, 0.707107, 4.242641], ['Q', 1, 0, 2.12132, 3.535534], ['L', 1, 0, 0.942809, 6.128259], ['S', 5, 0, 2.357023, 6.128259]] },
    { id: 'chair', name: 'The Chair', p: [['S', 3, 0, 0.471405, 0.471405], ['M', 7, 0, 0.942809, 1.414214], ['P', 1, 0, 0.707107, 2.828427], ['L', 1, 0, 0.942809, 4.714045], ['L', 5, 0, 3.299832, 5.18545], ['Q', 1, 0, 0.707107, 6.363961], ['S', 1, 0, 3.299832, 6.599663]] },
    { id: 'key', name: 'The Key', p: [['L', 3, 0, 0.942809, 0.942809], ['L', 7, 0, 1.885618, 1.885618], ['M', 5, 0, 4.242641, 0.471405], ['S', 1, 0, 3.299832, 0.942809], ['P', 3, 0, 5.656854, 0.707107], ['S', 7, 0, 6.599663, 0.942809], ['Q', 1, 0, 6.363961, 2.12132]] },
    { id: 'cottage', name: 'The Cottage', p: [['P', 2, 1, 3.5, 1.5], ['L', 2, 0, 1.333333, 3], ['L', 6, 0, 2.666667, 3], ['M', 6, 0, 0.666667, 4.333333], ['Q', 0, 0, 4, 4], ['S', 4, 0, 3, 4.666667], ['S', 4, 0, 5, 4.666667]] },
    { id: 'candle', name: 'The Candle', p: [['Q', 0, 0, 2, 1], ['M', 0, 0, 1.666667, 2.666667], ['L', 2, 0, 2.333333, 4], ['S', 6, 0, 1.333333, 5], ['S', 4, 0, 2, 5.666667], ['L', 0, 0, 2, 6.666667], ['P', 0, 1, 4.5, 6.5]] },
    { id: 'boat', name: 'The Sailing Boat', p: [['P', 2, 1, 3.5, 1.5], ['L', 6, 0, 3.666667, 4], ['M', 4, 0, 2.333333, 5.333333], ['L', 0, 0, 2, 6.666667], ['Q', 0, 0, 4, 7], ['S', 0, 0, 5, 6.333333], ['S', 4, 0, 3, 7.666667]] },
    { id: 'fish', name: 'The Fish', p: [['L', 2, 0, 1.333333, 2], ['L', 6, 0, 2.666667, 2], ['P', 0, 0, 3.5, 0.5], ['Q', 0, 0, 3, 4], ['M', 4, 0, 5.333333, 1.333333], ['S', 0, 0, 5, 2.333333], ['S', 2, 0, 5.666667, 3]] },
    { id: 'teapot', name: 'The Teapot', p: [['L', 3, 0, 2.357023, 2.357023], ['L', 7, 0, 3.299832, 3.299832], ['M', 1, 0, 2.828427, 0.942809], ['P', 1, 0, 0.707107, 2.828427], ['S', 1, 0, 4.714045, 2.357023], ['S', 3, 0, 4.714045, 3.299832], ['Q', 1, 0, 2.828427, 4.949747]] },
    { id: 'cat', name: 'The Cat', p: [['S', 6, 0, 1.333333, 1], ['S', 2, 0, 2.666667, 1], ['Q', 0, 0, 2, 2], ['L', 6, 0, 2.666667, 5], ['L', 4, 0, 4, 6.333333], ['P', 2, 1, 5.5, 5.5], ['M', 4, 0, 1.333333, 6.333333]] },
    { id: 'rabbit', name: 'The Rabbit', p: [['L', 2, 0, 3.333333, 6], ['L', 4, 0, 2, 7.333333], ['Q', 0, 0, 4, 3], ['P', 2, 0, 3.5, 1.5], ['S', 2, 0, 4.666667, 2], ['S', 6, 0, 0.333333, 7], ['M', 6, 0, 4.666667, 7.333333]] },
    { id: 'swan', name: 'The Swan', p: [['L', 4, 0, 3, 4.333333], ['L', 0, 0, 5, 3.666667], ['Q', 0, 0, 2, 3], ['P', 2, 0, 1.5, 1.5], ['S', 0, 0, 1, 0.333333], ['M', 4, 0, 6.333333, 2.333333], ['S', 6, 0, 7.333333, 2]] },
    { id: 'runner', name: 'The Runner', p: [['L', 4, 0, 3, 4.333333], ['L', 2, 0, 4.333333, 3], ['Q', 0, 0, 4, 1], ['P', 0, 1, 6.5, 0.5], ['S', 6, 0, 0.333333, 5], ['M', 6, 0, 5.666667, 6.333333], ['S', 0, 0, 3, 5.333333]] },
    { id: 'waving', name: 'The Waving Man', p: [['L', 5, 0, 3.299832, 2.357023], ['L', 3, 0, 5.18545, 2.357023], ['Q', 1, 0, 4.242641, 0.707107], ['S', 5, 0, 0.942809, 1.885618], ['S', 7, 0, 8.013877, 0.942809], ['M', 4, 0, 3.575974, 5.575974], ['P', 2, 1, 4.742641, 5.742641]] },
    { id: 'square', name: 'The Square', p: [['L', 0, 0, 2, 0.666667], ['L', 6, 0, 0.666667, 2], ['P', 2, 0, 3.5, 1.5], ['S', 2, 0, 2.666667, 2], ['Q', 0, 0, 2, 3], ['M', 4, 0, 3.333333, 3.333333], ['S', 4, 0, 1, 3.666667]] }
  ];
  var KINDS = ['L', 'L', 'M', 'Q', 'P', 'S', 'S'];
  var COLOURS = ['--vermilion', '--cobalt', '--peacock', '--gold', '--rose', '--leaf', '--brass-bright'];
  var LABELS = ['red large triangle', 'blue large triangle', 'teal medium triangle', 'gold square', 'pink parallelogram', 'green small triangle', 'orange small triangle'];
  var GRID = 0.25;          /* free placement snaps a corner to this grid */
  var STEP = 0.25;          /* one arrow-key press */
  var TITLE_H = 1.2;        /* the printed title band at the top of the page */

  /* Shapes centred on their middle, so turning happens in place. */
  var LC = {};
  Object.keys(LOCAL).forEach(function (t) {
    var v = LOCAL[t], cx = 0, cy = 0;
    v.forEach(function (p) { cx += p[0]; cy += p[1]; });
    cx /= v.length; cy /= v.length;
    LC[t] = v.map(function (p) { return [p[0] - cx, p[1] - cy]; });
  });
  function shape(t, k, f, cx, cy) {
    var loc = LC[t], a = k * Math.PI / 4, co = Math.cos(a), si = Math.sin(a), out = [];
    for (var i = 0; i < loc.length; i++) {
      var dx = f ? -loc[i][0] : loc[i][0], dy = loc[i][1];
      out.push([cx + dx * co - dy * si, cy + dx * si + dy * co]);
    }
    return out;
  }
  function inPoly(poly, x, y) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  }
  function polyDist(poly, x, y) {
    if (inPoly(poly, x, y)) return 0;
    var d = Infinity;
    for (var i = 0; i < poly.length; i++) { var a = poly[i], b = poly[(i + 1) % poly.length]; d = Math.min(d, segDist(x, y, a[0], a[1], b[0], b[1])); }
    return d;
  }
  function bounds(polys) {
    var b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    polys.forEach(function (poly) { poly.forEach(function (p) { b.x0 = Math.min(b.x0, p[0]); b.y0 = Math.min(b.y0, p[1]); b.x1 = Math.max(b.x1, p[0]); b.y1 = Math.max(b.y1, p[1]); }); });
    return b;
  }
  function sameShape(a, b, tol) {
    if (a.length !== b.length) return false;
    return a.every(function (p) { return b.some(function (q) { return Math.abs(p[0] - q[0]) < tol && Math.abs(p[1] - q[1]) < tol; }); });
  }
  /* Colours come from the CSS variables; these helpers only add transparency or blend two of them. */
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
  function rgba(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }
  function mix(c1, c2, t) { return [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t]; }
  function clock(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function goalName(f) { return f.name.indexOf('The ') === 0 ? 'the ' + f.name.slice(4).toLowerCase() : 'the ' + f.name.replace('Letter', 'letter'); }

  GamesInTime.register({
    id: 'tangram',
    frame: 'paper',
    mount: function (root, api) {
      var h = api.h;
      var SVGNS = 'http://www.w3.org/2000/svg';
      root.appendChild(h('style', null,
        '.game-tangram .tg-stage { position: relative; display: flex; justify-content: center; }' +
        '.game-tangram .tg-canvas { display: block; max-width: 100%; touch-action: pan-y; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; border-radius: 10px; cursor: grab; }' +
        '.game-tangram .tg-canvas.is-dragging { cursor: grabbing; }' +
        '.game-tangram .tg-canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }' +
        '.game-tangram .game-toolbar { justify-content: center; }' +
        '.game-tangram .tg-icon { min-width: 44px; padding-inline: .7rem; font-size: 1.25rem; }' +
        '.game-tangram .tg-next[hidden] { display: none; }' +
        '.game-tangram .scoreboard { justify-content: center; align-items: center; font-family: var(--font-mono); font-size: 1rem; }' +
        '.game-tangram .tg-pager { gap: .5rem; }' +
        '.game-tangram .tg-pager .btn { min-height: 40px; min-width: 40px; padding: 0 .6rem; }' +
        '.game-tangram .tg-piecebar { margin: .8rem 0 0; }' +
        '.game-tangram .tg-piecebar .btn { min-width: 64px; }' +
        '.game-tangram .tg-stars { color: var(--brass-bright); letter-spacing: .1em; }' +
        '.game-tangram .tg-book-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .3rem 1rem; margin: 1.2rem 0 .6rem; }' +
        '.game-tangram .tg-book-head h3 { font-family: var(--font-display); font-weight: 400; font-size: 1.35rem; letter-spacing: .02em; }' +
        '.game-tangram .tg-book { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: .5rem; }' +
        '.game-tangram .tg-book li { margin: 0; }' +
        '.game-tangram .tg-pick { position: relative; width: 100%; min-height: 76px; display: grid; grid-template-rows: 1fr auto; justify-items: center; align-items: center; gap: 2px; padding: 6px 4px 4px; border: 2px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--ink); font: 700 .74rem/1.1 var(--font-head); }' +
        '.game-tangram .tg-pick svg { width: 46px; height: 46px; display: block; }' +
        '.game-tangram .tg-pick:hover { border-color: var(--brand); }' +
        '.game-tangram .tg-pick[aria-current="true"] { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand); background: var(--surface-2); }' +
        '.game-tangram .tg-pick .tg-badge { position: absolute; top: 3px; right: 4px; font-size: .78rem; color: var(--green); font-weight: 800; }' +
        '.game-tangram .tg-pick .tg-num { position: absolute; top: 3px; left: 6px; font-family: var(--font-mono); font-size: .72rem; color: var(--ink-muted); }' +
        '.game-tangram .tg-pick.done svg { color: var(--brand); }'));

      var cs = getComputedStyle(root);
      function cssVar(name, fallback) { var s = cs.getPropertyValue(name).trim(); return s || fallback; }
      var C = {}, FONT_DISPLAY = cssVar('--font-display', 'Georgia, serif'), FONT_MONO = cssVar('--font-mono', 'monospace'), FONT_HEAD = cssVar('--font-head', 'sans-serif');
      function readColours() {
        ['--ink', '--ink-muted', '--surface', '--surface-2', '--line', '--brand', '--brass', '--brass-bright', '--red', '--gold', '--vermilion', '--focus', '--green']
          .forEach(function (n) { C[n] = parseColour(cssVar(n, '#888')); });
        C.pieces = COLOURS.map(function (n) { return parseColour(cssVar(n, '#999')); });
      }
      readColours();

      /* ---------- state ---------- */
      var progress = api.store.get('progress', {});      /* figure id -> { stars, best } */
      var figIndex = Math.max(0, Math.min(FIGS.length - 1, api.store.get('puzzle', 0) | 0));
      var fig = null, figOff = { x: 0, y: 0 }, slots = [], magnetsFig = [], silBox = null;
      var pieces = KINDS.map(function (t, i) { return { i: i, t: t, k: 0, f: 0, x: 0, y: 0, hx: 0, hy: 0, tw: null }; });
      var order = [0, 1, 2, 3, 4, 5, 6];
      var sel = -1, drag = null, lastTap = { i: -1, t: 0 };
      var solved = false, hints = 0, hintSlot = -1, hintUntil = 0, stamp = 0, sparkles = [], finalSecs = 0, later = [];
      var started = false, elapsed = 0, runFrom = 0, ticker = null;
      var lay = null, scale = 30, dpr = 1, raf = 0, destroyed = false, shownStatus = '';

      /* ---------- DOM ---------- */
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(true); } }, 'New game');
      var prevBtn = h('button', { class: 'btn tg-icon', type: 'button', 'aria-label': 'Previous puzzle', title: 'Previous puzzle', onclick: function () { choose(figIndex - 1); } }, '‹');
      var nextBtn = h('button', { class: 'btn tg-icon', type: 'button', 'aria-label': 'Next puzzle', title: 'Next puzzle', onclick: function () { choose(figIndex + 1); } }, '›');
      var leftBtn = h('button', { class: 'btn tg-icon', type: 'button', 'aria-label': 'Turn the piece left', title: 'Turn left (Shift R)', onclick: function () { turnSelected(-1); } }, '↺');
      var rightBtn = h('button', { class: 'btn tg-icon', type: 'button', 'aria-label': 'Turn the piece right', title: 'Turn right (R)', onclick: function () { turnSelected(1); } }, '↻');
      var flipBtn = h('button', { class: 'btn', type: 'button', title: 'Flip the parallelogram (F)', onclick: flipParallelogram }, 'Flip');
      var hintBtn = h('button', { class: 'btn', type: 'button', title: 'Show where one piece goes (H)', onclick: hint }, 'Hint');
      var goNextBtn = h('button', { class: 'btn btn-primary tg-next', type: 'button', hidden: true, onclick: function () { choose(figIndex + 1); } }, 'Next puzzle ›');
      root.appendChild(h('div', { class: 'game-toolbar' }, newBtn, hintBtn, goNextBtn));
      var numEl = h('span', { class: 'tg-num-label' }), timeEl = h('span'), hintEl = h('span'), bestEl = h('span');
      root.appendChild(h('div', { class: 'scoreboard', role: 'group', 'aria-label': 'Progress' }, h('span', { class: 'tg-pager' }, prevBtn, numEl, nextBtn), timeEl, hintEl, bestEl));
      var canvas = h('canvas', { class: 'tg-canvas', tabindex: '0', role: 'img', 'aria-describedby': 'tg-help' });
      var ctx = canvas.getContext('2d');
      root.appendChild(h('div', { class: 'tg-stage' }, canvas));
      root.appendChild(h('div', { class: 'game-toolbar tg-piecebar', role: 'group', 'aria-label': 'Turn or flip the selected piece' }, leftBtn, rightBtn, flipBtn));
      root.appendChild(h('p', { class: 'game-note', id: 'tg-help' },
        'Drag a piece onto the black shape. Double-tap a piece, or use ↺ and ↻, to turn it. Flip turns the parallelogram over. ',
        'Keyboard: Tab picks a piece, arrows move it, R turns it (Shift R the other way), F flips, Enter drops it into place, H gives a hint. ',
        'Three stars for no hints, two for one hint.'));
      var bookList = h('ul', { class: 'tg-book', 'aria-label': 'Puzzle book' });
      var bookCount = h('span', { class: 'muted' });
      root.appendChild(h('div', { class: 'tg-book-head' }, h('h3', null, 'The puzzle book'), bookCount));
      root.appendChild(bookList);
      var pickBtns = FIGS.map(function (f, i) {
        var svg = document.createElementNS(SVGNS, 'svg');
        var polys = f.p.map(function (q) { return shape(q[0], q[1], q[2], q[3], q[4]); });
        var b = bounds(polys), pad = 0.35, w = Math.max(b.x1 - b.x0, b.y1 - b.y0) + pad * 2;
        svg.setAttribute('viewBox', (b.x0 + (b.x1 - b.x0) / 2 - w / 2) + ' ' + (b.y0 + (b.y1 - b.y0) / 2 - w / 2) + ' ' + w + ' ' + w);
        svg.setAttribute('aria-hidden', 'true');
        polys.forEach(function (poly) {
          var pg = document.createElementNS(SVGNS, 'polygon');
          pg.setAttribute('points', poly.map(function (p) { return p[0].toFixed(3) + ',' + p[1].toFixed(3); }).join(' '));
          pg.setAttribute('fill', 'currentColor'); pg.setAttribute('stroke', 'currentColor'); pg.setAttribute('stroke-width', '0.09'); pg.setAttribute('stroke-linejoin', 'round');
          svg.appendChild(pg);
        });
        var btn = h('button', { class: 'tg-pick', type: 'button', onclick: function () { choose(i); } },
          h('span', { class: 'tg-num', 'aria-hidden': 'true' }, String(i + 1)), svg, h('span', null, f.name.replace('The ', '')), h('span', { class: 'tg-badge', 'aria-hidden': 'true' }));
        bookList.appendChild(h('li', null, btn));
        return btn;
      });

      /* ---------- layout ---------- */
      /* Two layouts: wide (page on the left, box of pieces on the right) and tall (page on top, box below).
         The page is the same 11 by 10 area in both, so a piece on the page never moves when the layout changes. */
      function computeLayout() {
        var w = Math.max(240, root.clientWidth || 0);
        var availH = Math.max(320, (window.innerHeight || 800) - 150);
        var sW = Math.min(w / 22, availH / 10), sT = Math.min(w / 11, availH / 17.5);
        var mode = sW >= sT ? 'wide' : 'tall';
        var next = mode === 'wide'
          ? { mode: mode, W: 22, H: 10, page: { x: 0, y: 0, w: 11, h: 10 }, tray: { x: 11, y: 0, w: 11, h: 10 }, box: { x: 11, y: 1.25, w: 11, h: 7.5 } }
          : { mode: mode, W: 11, H: 17.5, page: { x: 0, y: 0, w: 11, h: 10 }, tray: { x: 0, y: 10, w: 11, h: 7.5 }, box: { x: 0, y: 10, w: 11, h: 7.5 } };
        if (lay && lay.mode !== mode) {
          pieces.forEach(function (p) {
            if (p.x >= lay.tray.x && p.y >= lay.tray.y) { p.x += next.box.x - lay.box.x; p.y += next.box.y - lay.box.y; }
            p.hx += next.box.x - lay.box.x; p.hy += next.box.y - lay.box.y;
            keepInside(p, next);
          });
        }
        lay = next;
        scale = mode === 'wide' ? sW : sT;
        var cssW = Math.floor(lay.W * scale), cssH = Math.floor(lay.H * scale);
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
        canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
        render();
      }
      function keepInside(p, L) {
        L = L || lay;
        var b = bounds([vertsOf(p)]), m = 0.05;
        if (b.x0 < m) p.x += m - b.x0; if (b.x1 > L.W - m) p.x -= b.x1 - (L.W - m);
        if (b.y0 < m) p.y += m - b.y0; if (b.y1 > L.H - m) p.y -= b.y1 - (L.H - m);
      }
      function vertsOf(p) { return shape(p.t, p.k, p.f, p.x, p.y); }

      /* ---------- the puzzle ---------- */
      function loadFigure() {
        fig = FIGS[figIndex];
        var polys = fig.p.map(function (q) { return shape(q[0], q[1], q[2], q[3], q[4]); });
        var b = bounds(polys);
        figOff.x = Math.round(((11 - (b.x1 - b.x0)) / 2 - b.x0) / GRID) * GRID;
        figOff.y = Math.round((TITLE_H + (10 - TITLE_H - (b.y1 - b.y0)) / 2 - b.y0) / GRID) * GRID;
        slots = fig.p.map(function (q) {
          return { t: q[0], k: q[1], f: q[2], x: q[3] + figOff.x, y: q[4] + figOff.y, poly: shape(q[0], q[1], q[2], q[3] + figOff.x, q[4] + figOff.y) };
        });
        magnetsFig = [];
        slots.forEach(function (s) { s.poly.forEach(function (v) { if (!magnetsFig.some(function (m) { return Math.abs(m[0] - v[0]) < 1e-6 && Math.abs(m[1] - v[1]) < 1e-6; })) magnetsFig.push(v); }); });
        silBox = bounds(slots.map(function (s) { return s.poly; }));
      }
      /* Tip the pieces out into the box: each at a random right-angle turn, nowhere touching. */
      function tipOut(animate) {
        var box = lay.box, rnd = api.random, ok = false;
        for (var attempt = 0; attempt < 80 && !ok; attempt++) {
          ok = true;
          var placed = [], idx = [0, 1, 2, 3, 4, 5, 6].sort(function () { return rnd() - 0.5; });
          for (var n = 0; n < idx.length && ok; n++) {
            var p = pieces[idx[n]];
            p.k = [0, 2, 4, 6][Math.floor(rnd() * 4)];
            p.f = p.t === 'P' && rnd() < 0.5 ? 1 : 0;
            var b = bounds([shape(p.t, p.k, p.f, 0, 0)]), found = false;
            for (var tries = 0; tries < 160 && !found; tries++) {
              var cx = box.x + 0.5 - b.x0 + rnd() * (box.w - 1 - (b.x1 - b.x0));
              var cy = box.y + 0.5 - b.y0 + rnd() * (box.h - 1 - (b.y1 - b.y0));
              var r = { x0: cx + b.x0 - 0.25, y0: cy + b.y0 - 0.25, x1: cx + b.x1 + 0.25, y1: cy + b.y1 + 0.25 };
              if (!placed.some(function (q) { return r.x0 < q.x1 && q.x0 < r.x1 && r.y0 < q.y1 && q.y0 < r.y1; })) { placed.push(r); found = true; p.nx = cx; p.ny = cy; }
            }
            if (!found) ok = false;
          }
        }
        pieces.forEach(function (p, i) {
          var ox = p.x, oy = p.y;
          if (!ok) { p.k = 0; p.f = 0; p.nx = lay.box.x + 1.3 + (i % 4) * 2.7; p.ny = lay.box.y + 1.3 + Math.floor(i / 4) * 3.2; }
          p.x = p.nx; p.y = p.ny;
          gridSnap(p);
          p.hx = p.x; p.hy = p.y;
          if (animate && !api.reducedMotion) startTween(p, ox - p.x, oy - p.y, 0, 1, 420 + i * 40);
          else p.tw = null;
        });
      }

      /* ---------- snapping ---------- */
      function gridSnap(p) {
        var v0 = vertsOf(p)[0];
        p.x += Math.round(v0[0] / GRID) * GRID - v0[0];
        p.y += Math.round(v0[1] / GRID) * GRID - v0[1];
      }
      /* Pull the piece so one of its corners sits exactly on a corner of the picture or of another piece. */
      function magnetSnap(p, thr) {
        var vs = vertsOf(p), best = null;
        var cands = magnetsFig.slice();
        pieces.forEach(function (q) { if (q !== p) vertsOf(q).forEach(function (v) { cands.push(v); }); });
        vs.forEach(function (v) {
          cands.forEach(function (c) {
            var d = Math.hypot(c[0] - v[0], c[1] - v[1]);
            if (d < thr && (!best || d < best.d)) best = { d: d, dx: c[0] - v[0], dy: c[1] - v[1] };
          });
        });
        if (best) { p.x += best.dx; p.y += best.dy; return true; }
        return false;
      }
      function settleCore(p, thr) { if (!magnetSnap(p, thr)) gridSnap(p); keepInside(p); }
      function settle(p, thr) {
        var bx = p.x, by = p.y;
        settleCore(p, thr);
        if (!api.reducedMotion && (p.x !== bx || p.y !== by)) startTween(p, bx - p.x, by - p.y, 0, 1, 90);
      }
      function slotOf(p) {
        var vs = vertsOf(p);
        for (var i = 0; i < slots.length; i++) if (slots[i].t === p.t && sameShape(vs, slots[i].poly, 0.02)) return i;
        return -1;
      }

      /* ---------- checking ---------- */
      /* Sample the board on a fine grid. Solved when the pieces cover at least 98 per cent of the shape,
         with (almost) no overlap and nothing outside. */
      function coverage() {
        var st = 0.1, ox = 0.0371, oy = 0.0613, nSil = 0, cov = 0, over = 0, out = 0;
        var x0 = silBox.x0 - 0.6, x1 = silBox.x1 + 0.6, y0 = silBox.y0 - 0.6, y1 = silBox.y1 + 0.6;
        var vs = pieces.map(vertsOf);
        for (var y = y0 + oy; y < y1; y += st) for (var x = x0 + ox; x < x1; x += st) {
          var inS = false;
          for (var s = 0; s < slots.length && !inS; s++) if (inPoly(slots[s].poly, x, y)) inS = true;
          var c = 0;
          for (var i = 0; i < vs.length; i++) if (inPoly(vs[i], x, y)) c++;
          if (inS) { nSil++; if (c) cov++; } else if (c) out++;
          if (c > 1) over++;
        }
        return { cover: cov / nSil, overlap: over / nSil, outside: out / nSil };
      }
      function onShape(p) { for (var s = 0; s < slots.length; s++) if (inPoly(slots[s].poly, p.x, p.y)) return true; return false; }
      function check() {
        if (solved) return;
        var c = coverage();
        if (c.cover >= 0.98 && c.overlap <= 0.01 && c.outside <= 0.01) { finish(); return; }
        var on = pieces.filter(onShape).length;
        if (on === 7) say('All seven pieces are on, but some overlap or stick out. Nudge them until the shape is filled exactly.');
        else if (on === 0) say(goalText());
        else say(on + ' of 7 pieces on ' + goalName(fig) + '. Keep going!');
      }
      function goalText() { return 'Puzzle ' + (figIndex + 1) + ': make ' + goalName(fig) + ' with all seven pieces.'; }
      function say(t) { if (t !== shownStatus) { shownStatus = t; api.status(t); } }

      /* ---------- the clock ---------- */
      function seconds() { return (elapsed + (runFrom ? performance.now() - runFrom : 0)) / 1000; }
      function startClock() {
        if (started || solved) return;
        started = true; runFrom = performance.now();
        ticker = setInterval(renderTime, 500);
      }
      function renderTime() { timeEl.textContent = 'Time ' + clock(solved ? finalSecs : seconds()); }
      function stopClock() {
        if (runFrom) { elapsed += performance.now() - runFrom; runFrom = 0; }
        if (ticker) { clearInterval(ticker); ticker = null; }
      }
      function onVisibility() {
        if (document.hidden) { if (runFrom) { elapsed += performance.now() - runFrom; runFrom = 0; } if (ticker) { clearInterval(ticker); ticker = null; } }
        else if (started && !solved && !runFrom) { runFrom = performance.now(); ticker = setInterval(renderTime, 500); render(); }
      }
      function renderScore() {
        numEl.textContent = 'Puzzle ' + (figIndex + 1) + ' of ' + FIGS.length;
        renderTime();
        hintEl.textContent = 'Hints ' + hints;
        var rec = progress[fig.id];
        bestEl.replaceChildren(rec ? h('span', null, 'Best ' + clock(rec.best) + ' ', h('span', { class: 'tg-stars', 'aria-label': rec.stars + ' stars' }, '★★★'.slice(0, rec.stars))) : 'Best: not yet');
      }
      function renderBook() {
        var done = 0;
        pickBtns.forEach(function (b, i) {
          var rec = progress[FIGS[i].id];
          if (rec) done++;
          b.classList.toggle('done', !!rec);
          b.setAttribute('aria-current', String(i === figIndex));
          b.querySelector('.tg-badge').textContent = rec ? '✓' + '★★★'.slice(0, rec.stars) : '';
          b.setAttribute('aria-label', 'Puzzle ' + (i + 1) + ', ' + FIGS[i].name + (rec ? ', solved with ' + rec.stars + ' star' + (rec.stars > 1 ? 's' : '') : ', not solved yet'));
        });
        bookCount.textContent = done + ' of ' + FIGS.length + ' solved';
      }

      /* ---------- actions ---------- */
      function select(i) {
        sel = i;
        if (i >= 0) { order = order.filter(function (j) { return j !== i; }); order.push(i); }
        flipBtn.disabled = solved;
        describe();
        render();
      }
      function describe() {
        var onCount = pieces.filter(onShape).length;
        canvas.setAttribute('aria-label', 'Tangram board. ' + fig.name + ' is printed as a black shape on the page. ' + onCount + ' of 7 pieces are on it.' +
          (sel >= 0 ? ' Selected: ' + LABELS[sel] + '.' : ' No piece selected.'));
      }
      function turn(i, dir) {
        if (i < 0 || solved) return;
        var p = pieces[i];
        startClock();
        var bx = p.x, by = p.y;
        p.k = (p.k + dir + 8) % 8;
        settleCore(p, 0.3);
        if (!api.reducedMotion) startTween(p, bx - p.x, by - p.y, -dir * Math.PI / 4, 1, 150);
        api.sound('tick');
        afterMove(p);
      }
      function turnSelected(dir) {
        if (solved) return;
        if (sel < 0) { say('Pick a piece first, then turn it.'); return; }
        turn(sel, dir);
      }
      function flipParallelogram() {
        if (solved) return;
        var p = pieces[4];
        select(4); startClock();
        var bx = p.x, by = p.y;
        p.f = 1 - p.f;
        settleCore(p, 0.3);
        if (!api.reducedMotion) startTween(p, bx - p.x, by - p.y, 0, -1, 220);
        api.sound('flip');
        afterMove(p);
      }
      function afterMove(p) {
        var s = slotOf(p);
        if (s >= 0 && p.lastSlot !== s) { sparkle(slots[s].poly); api.sound('pop'); }
        p.lastSlot = s;
        if (hintSlot >= 0 && s === hintSlot) hintSlot = -1;
        check(); describe(); render();
      }
      /* Hint: one piece glides to its place. Anything sitting in that place goes back to the box. */
      function hint() {
        if (solved) return;
        var taken = pieces.map(slotOf);
        var target = -1;
        for (var s = 0; s < slots.length; s++) if (taken.indexOf(s) < 0) { target = s; break; }
        if (target < 0) { say('Every piece is already in a right place. Check for overlaps.'); return; }
        var slot = slots[target];
        var cand = pieces.filter(function (p) { return p.t === slot.t && taken[p.i] < 0; })[0] || pieces.filter(function (p) { return p.t === slot.t; })[0];
        startClock();
        hints++;
        var ox = cand.x, oy = cand.y, ok = cand.k;
        cand.k = slot.k; cand.f = slot.f; cand.x = slot.x; cand.y = slot.y;
        if (!api.reducedMotion) startTween(cand, ox - cand.x, oy - cand.y, ((ok - cand.k + 12) % 8 - 4) * Math.PI / 4, 1, 520);
        order = order.filter(function (j) { return j !== cand.i; }); order.push(cand.i);
        /* bump anything in the way back to its spot in the box */
        pieces.forEach(function (q) {
          if (q === cand || slotOf(q) >= 0) return;
          var qv = vertsOf(q), hit = inPoly(slot.poly, q.x, q.y) || qv.some(function (v) { var cx = (v[0] * 3 + q.x) / 4, cy = (v[1] * 3 + q.y) / 4; return inPoly(slot.poly, cx, cy); });
          if (hit) { var bx = q.x, by = q.y; q.x = q.hx; q.y = q.hy; if (!api.reducedMotion) startTween(q, bx - q.x, by - q.y, 0, 1, 380); }
        });
        hintSlot = target; hintUntil = performance.now() + 2600;
        cand.lastSlot = target;
        api.sound('whoosh');
        select(cand.i);
        renderScore();
        check();
        if (!solved) say('Hint: the ' + LABELS[cand.i] + ' goes there. ' + (hints === 1 ? 'That costs one star.' : 'Hints used: ' + hints + '.'));
      }
      function finish() {
        solved = true; stopClock();
        var secs = Math.max(1, Math.floor(seconds()));
        var stars = Math.max(1, 3 - hints);
        finalSecs = secs;
        var rec = progress[fig.id];
        var newBest = !rec || secs < rec.best;
        progress[fig.id] = { stars: Math.max(stars, rec ? rec.stars : 0), best: rec ? Math.min(rec.best, secs) : secs };
        api.store.set('progress', progress);
        sel = -1; hintSlot = -1;
        stamp = performance.now();
        pieces.forEach(function (p, i) { later.push(setTimeout(function () { if (!destroyed && solved) sparkle(vertsOf(p)); }, api.reducedMotion ? 0 : i * 70)); });
        for (var n = 0; n < stars; n++) later.push(setTimeout(function () { if (!destroyed && solved) api.sound('coin'); }, 700 + n * 260));
        var starWord = stars === 3 ? 'Three stars!' : stars === 2 ? 'Two stars.' : 'One star.';
        say('Solved ' + goalName(fig) + ' in ' + clock(secs) + '. ' + starWord + (hints ? '' : ' No hints.') + (newBest && rec ? ' A new best time.' : ''));
        api.celebrate('You made ' + goalName(fig) + '! ' + '★★★'.slice(0, stars));
        goNextBtn.hidden = false;
        [leftBtn, rightBtn, flipBtn, hintBtn].forEach(function (b) { b.disabled = true; });
        renderScore(); renderBook(); describe(); render();
      }
      function newGame(sound) {
        later.forEach(clearTimeout); later = [];
        solved = false; hints = 0; hintSlot = -1; stamp = 0; sparkles = []; sel = -1; drag = null;
        started = false; elapsed = 0; runFrom = 0; stopClock();
        goNextBtn.hidden = true;
        [leftBtn, rightBtn, flipBtn, hintBtn].forEach(function (b) { b.disabled = false; });
        pieces.forEach(function (p) { p.lastSlot = -1; });
        tipOut(!!sound);
        if (sound) api.sound('shuffle');
        shownStatus = '';
        say(goalText());
        renderScore(); renderBook(); describe(); render();
      }
      function choose(i) {
        figIndex = (i + FIGS.length) % FIGS.length;
        api.store.set('puzzle', figIndex);
        loadFigure();
        newGame(true);
        api.sound('flip');
      }

      /* ---------- animation ---------- */
      function ease(t) { return 1 - Math.pow(1 - t, 3); }
      function startTween(p, ox, oy, oa, sx, dur) {
        p.tw = { ox: ox, oy: oy, oa: oa, sx: sx, t0: performance.now(), dur: dur };
      }
      function sparkle(poly) {
        if (api.reducedMotion) return;
        var now = performance.now();
        poly.forEach(function (v) {
          for (var n = 0; n < 3; n++) {
            var a = api.random() * Math.PI * 2, sp = 0.6 + api.random() * 1.6;
            sparkles.push({ x: v[0], y: v[1], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t0: now, life: 420 + api.random() * 300, c: Math.floor(api.random() * 3) });
          }
        });
        render();
      }
      function render() {
        if (raf || destroyed) return;
        raf = requestAnimationFrame(frame);
      }
      function frame(now) {
        raf = 0;
        if (destroyed || !lay) return;
        var busy = false;
        pieces.forEach(function (p) { if (p.tw) { if (now - p.tw.t0 >= p.tw.dur) p.tw = null; else busy = true; } });
        sparkles = sparkles.filter(function (s) { return now - s.t0 < s.life; });
        if (sparkles.length) busy = true;
        if (hintSlot >= 0 && now < hintUntil) busy = true;
        if (stamp && now - stamp < 1500) busy = true;
        draw(now);
        if (busy && !document.hidden) render();
      }

      /* ---------- drawing ---------- */
      function path(poly) {
        ctx.beginPath();
        poly.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
        ctx.closePath();
      }
      function displayPoly(p, now) {
        var vs = vertsOf(p);
        if (!p.tw) return vs;
        var t = ease(Math.min(1, (now - p.tw.t0) / p.tw.dur)), r = 1 - t;
        var a = p.tw.oa * r, sx = p.tw.sx === 1 ? 1 : p.tw.sx + (1 - p.tw.sx) * t, co = Math.cos(a), si = Math.sin(a);
        var cx = p.x + p.tw.ox * r, cy = p.y + p.tw.oy * r;
        return vs.map(function (v) { var dx = (v[0] - p.x) * sx, dy = v[1] - p.y; return [cx + dx * co - dy * si, cy + dx * si + dy * co]; });
      }
      function draw(now) {
        var W = lay.W, H = lay.H, u = 1 / scale;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
        drawPage(u);
        drawBox(u);
        /* the printed silhouette */
        ctx.fillStyle = rgba(C['--ink'], 1); ctx.strokeStyle = rgba(C['--ink'], 1); ctx.lineWidth = 0.03; ctx.lineJoin = 'round';
        slots.forEach(function (s) { path(s.poly); ctx.fill(); ctx.stroke(); });
        /* hint outline */
        if (hintSlot >= 0) {
          var pulse = now < hintUntil ? 0.55 + 0.45 * Math.sin((now - hintUntil) / 140) : 1;
          ctx.save(); ctx.setLineDash([0.18, 0.12]); ctx.lineWidth = 0.09;
          ctx.strokeStyle = rgba(C['--gold'], pulse); path(slots[hintSlot].poly); ctx.stroke(); ctx.restore();
        }
        /* pieces, bottom to top; the dragged one is lifted */
        order.forEach(function (i) { drawPiece(pieces[i], now, u); });
        /* sparkles */
        sparkles.forEach(function (s) {
          var t = (now - s.t0) / s.life, x = s.x + s.vx * t, y = s.y + s.vy * t, r = 0.16 * (1 - t);
          ctx.fillStyle = rgba(s.c === 0 ? C['--gold'] : s.c === 1 ? C['--surface'] : C['--vermilion'], 1 - t);
          ctx.beginPath(); ctx.moveTo(x, y - r * 2); ctx.lineTo(x + r * 0.5, y - r * 0.5); ctx.lineTo(x + r * 2, y); ctx.lineTo(x + r * 0.5, y + r * 0.5);
          ctx.lineTo(x, y + r * 2); ctx.lineTo(x - r * 0.5, y + r * 0.5); ctx.lineTo(x - r * 2, y); ctx.lineTo(x - r * 0.5, y - r * 0.5); ctx.closePath(); ctx.fill();
        });
        if (solved) drawStamp(now);
      }
      function drawPage(u) {
        var P = lay.page, inset = 0.18;
        ctx.fillStyle = rgba(C['--surface'], 1);
        roundRect(P.x + inset, P.y + inset, P.w - inset * 2, P.h - inset * 2, 0.25); ctx.fill();
        ctx.strokeStyle = rgba(C['--ink'], 0.55); ctx.lineWidth = 2 * u;
        roundRect(P.x + inset + 0.14, P.y + inset + 0.14, P.w - inset * 2 - 0.28, P.h - inset * 2 - 0.28, 0.16); ctx.stroke();
        ctx.lineWidth = 1 * u;
        roundRect(P.x + inset + 0.24, P.y + inset + 0.24, P.w - inset * 2 - 0.48, P.h - inset * 2 - 0.48, 0.12); ctx.stroke();
        /* little printer's diamonds in the corners and beside the title rule */
        ctx.fillStyle = rgba(C['--ink'], 0.6);
        [[P.x + 0.75, P.y + 0.75], [P.x + P.w - 0.75, P.y + 0.75], [P.x + 0.75, P.y + P.h - 0.75], [P.x + P.w - 0.75, P.y + P.h - 0.75]].forEach(function (c) {
          ctx.beginPath(); ctx.moveTo(c[0], c[1] - 0.16); ctx.lineTo(c[0] + 0.1, c[1]); ctx.lineTo(c[0], c[1] + 0.16); ctx.lineTo(c[0] - 0.1, c[1]); ctx.closePath(); ctx.fill();
        });
        ctx.strokeStyle = rgba(C['--ink'], 0.35); ctx.lineWidth = 1 * u;
        ctx.beginPath(); ctx.moveTo(P.x + 2.2, P.y + 1.45); ctx.lineTo(P.x + P.w - 2.2, P.y + 1.45); ctx.stroke();
        /* the title, printed like a puzzle-book plate */
        label('No. ' + (figIndex + 1) + '.  ' + fig.name.toUpperCase() + '.', P.x + P.w / 2, P.y + 0.92, 0.62, FONT_DISPLAY, rgba(C['--ink'], 1), P.w - 1);
      }
      /* Text is drawn in screen pixels, so it stays crisp at any size. */
      function label(str, x, y, size, font, colour, maxW) {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var px = size * scale;
        ctx.font = px + 'px ' + font;
        if (maxW) { var w = ctx.measureText(str).width; if (w > maxW * scale) { px *= maxW * scale / w; ctx.font = px + 'px ' + font; } }
        ctx.fillStyle = colour; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(str, x * scale, y * scale);
        ctx.restore();
      }
      function drawBox(u) {
        var T = lay.tray, inset = 0.18;
        var wood = mix(C['--brass'], C['--ink'], 0.55), light = mix(C['--brass'], C['--ink'], 0.3);
        var g = ctx.createLinearGradient(T.x, T.y, T.x + T.w, T.y + T.h);
        g.addColorStop(0, rgba(light, 1)); g.addColorStop(1, rgba(wood, 1));
        ctx.fillStyle = g;
        roundRect(T.x + inset, T.y + inset, T.w - inset * 2, T.h - inset * 2, 0.3); ctx.fill();
        /* wood grain */
        ctx.save(); roundRect(T.x + inset, T.y + inset, T.w - inset * 2, T.h - inset * 2, 0.3); ctx.clip();
        ctx.strokeStyle = rgba(C['--brass-bright'], 0.13); ctx.lineWidth = 1.2 * u;
        for (var y = T.y + 0.5; y < T.y + T.h; y += 0.42) {
          ctx.beginPath();
          for (var x = T.x; x <= T.x + T.w + 0.2; x += 0.5) ctx.lineTo(x, y + Math.sin(x * 0.9 + y * 2.3) * 0.08);
          ctx.stroke();
        }
        /* inner shadow */
        ctx.strokeStyle = rgba(C['--ink'], 0.45); ctx.lineWidth = 0.22;
        roundRect(T.x + inset, T.y + inset, T.w - inset * 2, T.h - inset * 2, 0.3); ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = rgba(C['--gold'], 0.55); ctx.lineWidth = 1.5 * u;
        roundRect(T.x + inset + 0.08, T.y + inset + 0.08, T.w - inset * 2 - 0.16, T.h - inset * 2 - 0.16, 0.24); ctx.stroke();
      }
      function drawPiece(p, now, u) {
        var poly = displayPoly(p, now), col = C.pieces[p.i];
        var lifted = drag && drag.i === p.i && drag.moved;
        ctx.save();
        if (lifted) {
          ctx.shadowColor = rgba(C['--ink'], 0.4); ctx.shadowBlur = 14 * dpr; ctx.shadowOffsetX = 3 * dpr; ctx.shadowOffsetY = 5 * dpr;
        }
        path(poly); ctx.fillStyle = rgba(col, 1); ctx.fill();
        ctx.restore();
        /* lacquer: light from the top left */
        var b = bounds([poly]);
        var g = ctx.createLinearGradient(b.x0, b.y0, b.x1, b.y1);
        g.addColorStop(0, rgba(C['--surface'], 0.32)); g.addColorStop(0.55, rgba(C['--surface'], 0)); g.addColorStop(1, rgba(C['--ink'], 0.16));
        path(poly); ctx.fillStyle = g; ctx.fill();
        ctx.lineJoin = 'round';
        ctx.strokeStyle = rgba(mix(col, C['--ink'], 0.55), 1); ctx.lineWidth = 1.5 * u; ctx.stroke();
        if (p.i === sel && !solved) {
          ctx.save();
          ctx.strokeStyle = rgba(C['--ink'], 1); ctx.lineWidth = 3.5 * u; path(poly); ctx.stroke();
          ctx.strokeStyle = rgba(C['--surface'], 1); ctx.lineWidth = 1.5 * u;
          if (document.activeElement === canvas) ctx.setLineDash([5 * u, 3 * u]);
          path(poly); ctx.stroke();
          ctx.restore();
        }
      }
      /* The win: a prize ticket stamped into the empty box, stars arriving one by one. */
      function drawStamp(now) {
        var t = api.reducedMotion ? 1 : Math.min(1, (now - stamp) / 420), s = 1 + (1 - ease(t)) * 0.7;
        var T = lay.tray, cx = T.x + T.w / 2, cy = T.y + T.h / 2, bw = 6.4, bh = 3.7;
        var stars = Math.max(1, 3 - hints), shown = api.reducedMotion ? stars : Math.max(0, Math.min(stars, Math.floor((now - stamp - 380) / 260) + 1));
        ctx.save();
        ctx.globalAlpha = Math.min(1, t * 1.6);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(cx * scale, cy * scale); ctx.rotate(-0.07); ctx.scale(s * scale, s * scale);
        ctx.fillStyle = rgba(C['--surface'], 0.97);
        roundRect(-bw / 2, -bh / 2, bw, bh, 0.3); ctx.fill();
        ctx.strokeStyle = rgba(C['--red'], 1); ctx.lineWidth = 0.1;
        roundRect(-bw / 2 + 0.16, -bh / 2 + 0.16, bw - 0.32, bh - 0.32, 0.22); ctx.stroke();
        ctx.lineWidth = 0.04;
        roundRect(-bw / 2 + 0.32, -bh / 2 + 0.32, bw - 0.64, bh - 0.64, 0.16); ctx.stroke();
        ctx.scale(1 / scale, 1 / scale);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(C['--red'], 1);
        fitFont('SOLVED', 1.15, FONT_DISPLAY, bw - 1.2);
        ctx.fillText('SOLVED', 0, -0.68 * scale);
        ctx.font = (0.9 * scale) + 'px ' + FONT_HEAD;
        ctx.fillStyle = rgba(C['--brass-bright'], 1);
        ctx.fillText('★★★'.slice(0, shown) + '☆☆☆'.slice(0, 3 - shown), 0, 0.4 * scale);
        ctx.fillStyle = rgba(C['--ink'], 1);
        fitFont('IN ' + clock(finalSecs) + (hints ? ' WITH ' + hints + (hints > 1 ? ' HINTS' : ' HINT') : ' WITH NO HINTS'), 0.32, FONT_MONO, bw - 1);
        ctx.fillText('IN ' + clock(finalSecs) + (hints ? ' WITH ' + hints + (hints > 1 ? ' HINTS' : ' HINT') : ' WITH NO HINTS'), 0, 1.18 * scale);
        ctx.restore();
      }
      function fitFont(str, size, font, maxW) {
        var px = size * scale;
        ctx.font = px + 'px ' + font;
        var w = ctx.measureText(str).width;
        if (w > maxW * scale) ctx.font = (px * maxW * scale / w) + 'px ' + font;
      }
      function roundRect(x, y, w, hh, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + hh - r); ctx.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh);
        ctx.lineTo(x + r, y + hh); ctx.quadraticCurveTo(x, y + hh, x, y + hh - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      }

      /* ---------- pointer and touch ---------- */
      function toBoard(clientX, clientY) {
        var r = canvas.getBoundingClientRect();
        return { x: (clientX - r.left) / r.width * lay.W, y: (clientY - r.top) / r.height * lay.H };
      }
      function pick(pt) {
        for (var n = order.length - 1; n >= 0; n--) if (inPoly(vertsOf(pieces[order[n]]), pt.x, pt.y)) return order[n];
        /* fingers are fat: accept a near miss */
        var best = -1, bd = 14 / scale;
        for (n = order.length - 1; n >= 0; n--) { var d = polyDist(vertsOf(pieces[order[n]]), pt.x, pt.y); if (d < bd) { bd = d; best = order[n]; } }
        return best;
      }
      var pointerFocus = false;
      function onDown(ev) {
        pointerFocus = true; setTimeout(function () { pointerFocus = false; }, 0);
        if (ev.button > 0 || drag) return;
        var pt = toBoard(ev.clientX, ev.clientY);
        if (solved) return;
        var i = pick(pt);
        if (i < 0) { if (sel >= 0) select(-1); return; }
        ev.preventDefault();
        if (document.activeElement !== canvas) canvas.focus({ preventScroll: true });
        select(i);
        var p = pieces[i];
        drag = { i: i, id: ev.pointerId, sx: pt.x, sy: pt.y, px: p.x, py: p.y, moved: false };
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
        api.sound('click');
      }
      function onMove(ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        var pt = toBoard(ev.clientX, ev.clientY), p = pieces[drag.i];
        var dx = pt.x - drag.sx, dy = pt.y - drag.sy;
        if (!drag.moved && Math.hypot(dx, dy) * scale > 5) { drag.moved = true; canvas.classList.add('is-dragging'); startClock(); }
        if (!drag.moved) return;
        p.x = drag.px + dx; p.y = drag.py + dy; p.tw = null;
        keepInside(p);
        render();
      }
      function onUp(ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        var d = drag, p = pieces[d.i];
        drag = null;
        canvas.classList.remove('is-dragging');
        try { canvas.releasePointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
        if (d.moved) {
          settle(p, Math.max(0.4, 16 / scale));
          api.sound('clack');
          afterMove(p);
          lastTap = { i: -1, t: 0 };
        } else {
          var now = performance.now();
          if (lastTap.i === d.i && now - lastTap.t < 420) { lastTap = { i: -1, t: 0 }; turn(d.i, 1); }
          else lastTap = { i: d.i, t: now };
          render();
        }
      }
      function onCancel(ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        var p = pieces[drag.i], moved = drag.moved;
        drag = null; canvas.classList.remove('is-dragging');
        if (moved) { settle(p, 0.3); afterMove(p); }
        render();
      }
      /* Let the page scroll when a finger lands on empty paper, but not when it lands on a piece. */
      function onTouchStart(ev) {
        if (solved || ev.touches.length !== 1) return;
        var t = ev.touches[0];
        if (pick(toBoard(t.clientX, t.clientY)) >= 0) ev.preventDefault();
      }
      function onTouchMove(ev) { if (drag) ev.preventDefault(); }

      /* ---------- keyboard ---------- */
      function onKey(ev) {
        if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
        var k = ev.key;
        if (k === 'Tab') {
          if (solved) return;
          if (!ev.shiftKey && sel < 6) { ev.preventDefault(); select(sel + 1); api.sound('tick'); return; }
          if (ev.shiftKey && sel > 0) { ev.preventDefault(); select(sel - 1); api.sound('tick'); return; }
          select(-1); return;
        }
        if (solved) { if (k === 'Enter') { ev.preventDefault(); choose(figIndex + 1); } return; }
        if (/^[1-7]$/.test(k)) { ev.preventDefault(); select(Number(k) - 1); return; }
        if (k === 'Escape') { if (sel >= 0) { ev.preventDefault(); select(-1); } return; }
        if (k === 'h' || k === 'H') { ev.preventDefault(); hint(); return; }
        if (k === 'f' || k === 'F') { ev.preventDefault(); flipParallelogram(); return; }
        if (sel < 0 && (/^Arrow/.test(k) || k === 'r' || k === 'R' || k === 'Enter' || k === ' ')) { ev.preventDefault(); select(0); return; }
        var p = pieces[sel];
        if (k === 'r' || k === 'R') { ev.preventDefault(); turn(sel, ev.shiftKey ? -1 : 1); return; }
        if (k === 'e' || k === 'E') { ev.preventDefault(); turn(sel, -1); return; }
        if (k === 'Enter' || k === ' ') { ev.preventDefault(); settle(p, 0.45); api.sound('clack'); afterMove(p); return; }
        var step = ev.shiftKey ? 1 : STEP, dx = 0, dy = 0;
        if (k === 'ArrowLeft') dx = -step; else if (k === 'ArrowRight') dx = step; else if (k === 'ArrowUp') dy = -step; else if (k === 'ArrowDown') dy = step; else return;
        ev.preventDefault();
        startClock();
        p.x += dx; p.y += dy; p.tw = null;
        magnetSnap(p, 0.2);
        keepInside(p);
        afterMove(p);
      }

      /* ---------- wiring ---------- */
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onCancel);
      canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      canvas.addEventListener('keydown', onKey);
      canvas.addEventListener('focus', function () { if (sel < 0 && !solved && !pointerFocus) select(0); else render(); });
      canvas.addEventListener('blur', function () { render(); });
      document.addEventListener('visibilitychange', onVisibility);
      var resizeQueued = 0;
      function queueResize() { if (resizeQueued || destroyed) return; resizeQueued = requestAnimationFrame(function () { resizeQueued = 0; computeLayout(); }); }
      var ro = window.ResizeObserver ? new ResizeObserver(queueResize) : null;
      if (ro) ro.observe(root);
      window.addEventListener('resize', queueResize);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!destroyed) render(); });

      /* For the automated play-test only: read-only facts about the board. Changes nothing. */
      canvas.gitTest = {
        info: function () {
          return {
            figId: fig.id, solved: solved, hints: hints, scale: scale, W: lay.W, H: lay.H, mode: lay.mode,
            pieces: pieces.map(function (p) { return { i: p.i, t: p.t, k: p.k, f: p.f, x: p.x, y: p.y, slot: slotOf(p) }; }),
            slots: slots.map(function (s) { return { t: s.t, k: s.k, f: s.f, x: s.x, y: s.y }; })
          };
        }
      };

      loadFigure();
      computeLayout();
      newGame(false);

      return {
        destroy: function () {
          destroyed = true;
          stopClock();
          later.forEach(clearTimeout);
          if (raf) cancelAnimationFrame(raf);
          if (resizeQueued) cancelAnimationFrame(resizeQueued);
          if (ro) ro.disconnect();
          window.removeEventListener('resize', queueResize);
          document.removeEventListener('visibilitychange', onVisibility);
          canvas.gitTest = null;
        }
      };
    }
  });
})();
