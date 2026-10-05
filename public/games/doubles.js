/* Doubles for Games in Time, in the 2010s hall.

   Slide every tile on the board at once: left, right, up or down. When two tiles with the same number bump into
   each other they join into one tile worth double. After every move a new 2 (or sometimes a 4) appears in an empty
   square. Make the goal tile to win, then keep going if you like. When the board is full and nothing can join,
   the game is over.

   The mechanic is the sliding number puzzle that went round the world in 2014 (Gabriele Cirulli's free web game 2048,
   written in a weekend in Italy, which built on Threes! by Asher Vollmer and Greg Wohlwend). The name, colours and
   look here are our own: flat 2010s app colours, with a teaching switch that shows every tile as a power of two.

   Boards: 3 by 3 (small and quick, goal 128), 4 by 4 (the classic, goal 2048) and 5 by 5 (lots of room, goal 2048).

   The one rule that matters most: in each move, a tile can join only once. So a row of 2, 2, 2, 2 slid left
   becomes 4, 4 and not 8. The tiles nearest the wall you slide towards join first.

   The board is plain HTML: each tile is a box that CSS slides to its square. The board carries data-cells and
   data-new so the automated check can read it. See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  var SIZES = {
    3: { goal: 128, about: 'Small and quick. Make a 128 tile to win.' },
    4: { goal: 2048, about: 'The classic. Make a 2048 tile to win.' },
    5: { goal: 2048, about: 'Lots of room. A gentler road to 2048.' }
  };
  var SIZE_KEYS = [3, 4, 5];
  var DIRS = { left: { dr: 0, dc: -1 }, right: { dr: 0, dc: 1 }, up: { dr: -1, dc: 0 }, down: { dr: 1, dc: 0 } };
  var KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down' };
  var SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  /* the notes merges play, one step up a pentatonic scale for each power of two */
  var NOTES = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349];

  function power(v) { var e = 0; while (v > 1) { v /= 2; e++; } return e; }
  function sup(e) { return String(e).split('').map(function (d) { return SUP[Number(d)]; }).join(''); }
  function fmt(n) { return Math.round(n).toLocaleString('en-AU'); }

  /* ======================= THE RULES (plain arrays, no drawing) =======================
     slideLine takes one line of numbers in the order the tiles travel towards the wall (the first number is the one
     against the wall), and returns where each tile ends up. Each tile can join only once per move:
     [2, 2, 2, 2] gives [4, 4, 0, 0], [2, 2, 4, 0] gives [4, 4, 0, 0], and [4, 4, 8, 8] gives [8, 16, 0, 0]. */
  function slideLine(line) {
    var out = [], from = [], joined = [], gained = 0;
    for (var i = 0; i < line.length; i++) {
      if (!line[i]) continue;
      var last = out.length - 1;
      if (last >= 0 && out[last] === line[i] && !joined[last]) {
        out[last] *= 2; joined[last] = true; gained += out[last];
        from[i] = last;                /* this tile slides on top of the one ahead of it */
      } else {
        out.push(line[i]); joined.push(false);
        from[i] = out.length - 1;
      }
    }
    var result = [];
    for (i = 0; i < line.length; i++) result.push(i < out.length ? out[i] : 0);
    return { cells: result, to: from, joined: joined, gained: gained };
  }
  /* The squares of every line on the board for a direction, each list starting at the wall the tiles move towards. */
  function lines(n, dir) {
    var out = [];
    for (var a = 0; a < n; a++) {
      var line = [];
      for (var b = 0; b < n; b++) {
        var r, c;
        if (dir === 'left') { r = a; c = b; } else if (dir === 'right') { r = a; c = n - 1 - b; }
        else if (dir === 'up') { r = b; c = a; } else { r = n - 1 - b; c = a; }
        line.push(r * n + c);
      }
      out.push(line);
    }
    return out;
  }
  function canMove(cells, n) {
    for (var i = 0; i < cells.length; i++) {
      if (!cells[i]) return true;
      if (i % n < n - 1 && cells[i] === cells[i + 1]) return true;
      if (i + n < cells.length && cells[i] === cells[i + n]) return true;
    }
    return false;
  }

  var P = '.game-doubles ';
  var CSS = [
    '.game-doubles { --db-panel: #23272f; --db-well: #2c313a; --db-slot: #3a404b; --db-ink: #ffffff; --db-soft: #b7bec9; --db-coral: #ff5a5f; --db-mint: #00c9a7; --db-sun: #ffc233; --db-blue: #3d8bff;' +
    ' --db-round: var(--font-poster, "Fredoka", "Arial Rounded MT Bold", system-ui, sans-serif); container-type: inline-size; color: var(--db-ink); }',
    P + '.db-app { width: min(100%, 540px); margin: 0 auto; padding: clamp(12px, 3.5cqi, 24px); border-radius: 28px; background: var(--db-panel); box-shadow: 0 1px 0 rgba(255, 255, 255, .06) inset, 0 20px 50px rgba(0, 0, 0, .45); }',
    P + '.db-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .6rem; margin-bottom: .8rem; }',
    P + '.db-title { margin: 0; font: 700 clamp(2rem, 1.4rem + 3cqi, 2.8rem)/1 var(--db-round); letter-spacing: -.01em; color: var(--db-ink); }',
    P + '.db-title span { color: var(--db-mint); }',
    P + '.db-goal { display: block; font: 600 .82rem/1.2 var(--font-body); color: var(--db-soft); letter-spacing: .02em; margin-top: .25rem; }',
    P + '.db-scores { display: flex; gap: .45rem; }',
    P + '.db-score { position: relative; min-width: 5.2rem; padding: .3rem .7rem .35rem; border-radius: 14px; text-align: center; color: #fff; }',
    P + '.db-score.is-now { background: var(--db-coral); }',
    P + '.db-score.is-best { background: var(--db-blue); }',
    P + '.db-score span { display: block; font: 700 .68rem/1.2 var(--font-body); letter-spacing: .12em; text-transform: uppercase; opacity: .92; }',
    P + '.db-score b { display: block; font: 700 1.35rem/1.15 var(--db-round); font-variant-numeric: tabular-nums; }',
    P + '.db-plus { position: absolute; left: 0; right: 0; top: 0; font: 700 1.1rem/1 var(--db-round); color: var(--db-mint); pointer-events: none; animation: db-rise .7s ease-out forwards; }',
    '@keyframes db-rise { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-34px); opacity: 0; } }',
    P + '.db-tools { display: flex; flex-wrap: wrap; gap: .45rem; margin-bottom: .8rem; }',
    P + '.db-btn { display: inline-flex; align-items: center; justify-content: center; gap: .35rem; min-height: 44px; padding: .45rem 1rem; border: 0; border-radius: 12px; background: var(--db-slot); color: var(--db-ink); font: 600 1rem/1.1 var(--font-head); touch-action: manipulation; }',
    P + '.db-btn:hover { background: #4a515e; }',
    P + '.db-btn:active { transform: translateY(1px); }',
    P + '.db-btn:disabled { opacity: .45; cursor: not-allowed; }',
    P + '.db-btn[aria-pressed="true"] { background: var(--db-mint); color: #00241e; }',
    P + '.db-go { min-height: 52px; padding-inline: 1.8rem; font-size: 1.15rem; background: var(--db-mint); color: #00241e; }',
    P + '.db-go:hover { background: #2fe0c0; }',
    /* the board: grey slots, with tiles that slide over them */
    P + '.db-stack { display: grid; }',
    P + '.db-stack > * { grid-area: 1 / 1; }',
    /* the board is its own size container, so the numbers on the tiles grow and shrink with it */
    P + '.db-board { --gap: clamp(6px, 2.2cqi, 12px); container-type: inline-size; position: relative; align-self: start; width: 100%; aspect-ratio: 1; border-radius: 18px; background: var(--db-well); touch-action: manipulation; user-select: none; -webkit-user-select: none; outline: none; }',
    P + '.db-board.is-playing { touch-action: none; }',
    P + '.db-board:focus-visible { box-shadow: 0 0 0 3px var(--focus, var(--db-sun)); }',
    P + '.db-slot, ' + P + '.db-tile { position: absolute; left: var(--gap); top: var(--gap); width: calc((100% - var(--gap) * (var(--n) + 1)) / var(--n)); height: calc((100% - var(--gap) * (var(--n) + 1)) / var(--n));' +
    ' transform: translate(calc(var(--c) * (100% + var(--gap))), calc(var(--r) * (100% + var(--gap)))); border-radius: 12px; }',
    P + '.db-slot { background: var(--db-slot); }',
    P + '.db-tile { display: block; z-index: 1; transition: transform 110ms ease-in-out; font-family: var(--db-round); font-weight: 700; line-height: 1; }',
    P + '.db-tile.is-going { z-index: 0; }',
    P + '.db-tile i { font-style: normal; font-size: calc(100cqi / var(--n) * .36); }',
    P + '.db-tile.d3 i { font-size: calc(100cqi / var(--n) * .3); }',
    P + '.db-tile.d4 i { font-size: calc(100cqi / var(--n) * .24); }',
    P + '.db-tile.d5 i { font-size: calc(100cqi / var(--n) * .19); }',
    P + '.db-tile.d6 i { font-size: calc(100cqi / var(--n) * .16); }',
    P + '.db-tile small { display: none; margin-top: .18em; font: 700 calc(100cqi / var(--n) * .17)/1 var(--font-body); opacity: .85; }',
    P + '.db-board.is-teach .db-tile small { display: block; }',
    P + '.db-face { width: 100%; height: 100%; min-height: 0; overflow: hidden; display: grid; place-items: center; align-content: center; border-radius: inherit; }',
    P + '.db-tile.is-new .db-face { animation: db-appear .16s ease-out; }',
    P + '.db-tile.is-pop .db-face { animation: db-pop .18s ease-out; }',
    '@keyframes db-appear { from { transform: scale(0); } to { transform: scale(1); } }',
    '@keyframes db-pop { 0% { transform: scale(1); } 50% { transform: scale(1.18); } 100% { transform: scale(1); } }',
    /* a ring of light when a join makes 64 or more */
    P + '.db-tile.is-glow .db-face { animation: db-pop .18s ease-out, db-glow .55s ease-out; }',
    '@keyframes db-glow { 0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, .85); } 100% { box-shadow: 0 0 0 16px rgba(255, 255, 255, 0); } }',
    /* our own flat tile colours: mint and teal, through blues and purples, to coral, orange and sunshine */
    P + '.v2 .db-face { background: #eef4f2; color: #23303a; }',
    P + '.v4 .db-face { background: #c9eee3; color: #173b33; }',
    P + '.v8 .db-face { background: #5fd4b8; color: #0b2a24; }',
    P + '.v16 .db-face { background: #33b8e6; color: #062330; }',
    P + '.v32 .db-face { background: #3d7bf0; color: #fff; }',
    P + '.v64 .db-face { background: #6c5ce7; color: #fff; }',
    P + '.v128 .db-face { background: #9b51e0; color: #fff; }',
    P + '.v256 .db-face { background: #d63d78; color: #fff; }',
    P + '.v512 .db-face { background: #f0503a; color: #fff; }',
    P + '.v1024 .db-face { background: #ff9f1c; color: #2a1700; }',
    P + '.v2048 .db-face { background: #ffd23f; color: #2a1d00; box-shadow: 0 0 0 3px #fff3c4 inset, 0 0 22px rgba(255, 210, 63, .7); }',
    P + '.vbig .db-face { background: #111318; color: #ffd23f; box-shadow: 0 0 0 3px #ffd23f inset; }',
    /* the card over the board */
    P + '.db-overlay { position: relative; z-index: 3; display: grid; place-items: center; padding: 10px; border-radius: 18px; background: rgba(21, 23, 28, .78); }',
    P + '.db-card { width: min(100%, 24rem); display: grid; gap: .6rem; justify-items: center; text-align: center; padding: 1rem; border-radius: 20px; background: var(--db-panel); box-shadow: 0 10px 30px rgba(0, 0, 0, .45); }',
    P + '.db-card-title { margin: 0; font: 700 clamp(1.5rem, 1.2rem + 2cqi, 2.1rem)/1.05 var(--db-round); }',
    P + '.db-card-msg { margin: 0; font-weight: 600; line-height: 1.35; }',
    P + '.db-card-msg:empty { display: none; }',
    P + '.db-card-sub { margin: 0; font-size: .92rem; line-height: 1.35; color: var(--db-soft); }',
    P + '.db-card .seg { border-color: var(--db-slot); background: var(--db-well); }',
    P + '.db-card .seg button { color: var(--db-ink); padding-inline: .9rem; }',
    P + '.db-card .seg button + button { border-left-color: var(--db-slot); }',
    P + '.db-card .seg button[aria-pressed="true"] { background: var(--db-mint); color: #00241e; }',
    P + '.db-card-buttons { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }',
    /* arrow buttons under the board, for whiteboards and anyone who prefers buttons */
    P + '.db-pad { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .45rem; margin-top: .8rem; }',
    P + '.db-pad .db-btn { min-height: 48px; font-size: 1.3rem; }',
    P + '.db-learn { margin: .8rem 0 0; padding: .7rem .85rem; border-radius: 14px; background: var(--db-well); color: var(--db-soft); font-size: .95rem; line-height: 1.4; }',
    P + '.db-learn b { color: var(--db-ink); }',
    P + '.game-note { text-align: center; max-width: 40rem; margin: .9rem auto 0; }',
    '.classroom ' + P + '.db-app { width: min(100%, 72vh, 760px); }',
    '@media (max-width: 420px) { ' + P + '.db-score { min-width: 4.4rem; padding-inline: .5rem; } ' + P + '.db-btn { padding-inline: .75rem; } ' + P + '.db-card { padding: .8rem .7rem; } }',
    '@media (prefers-reduced-motion: reduce) { ' + P + '.db-tile { transition: none !important; } ' + P + '.db-face, ' + P + '.db-plus { animation: none !important; } ' + P + '.db-plus { display: none; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'doubles',
    frame: 'none',
    mount: function (root, api) {
      var h = api.h;
      var RM = !!api.reducedMotion;
      var destroyed = false;
      var SLIDE_MS = RM ? 0 : 115;

      var n = Number(api.store.get('size', 4));
      if (!SIZES[n]) n = 4;
      var teach = api.store.get('teach', false) === true;
      var best = api.store.get('best', {});
      if (!best || typeof best !== 'object') best = {};

      /* ---------- the page ---------- */
      root.appendChild(h('style', null, CSS));
      var goalEl = h('span', { class: 'db-goal' });
      var scoreEl = h('b', null, '0'), bestEl = h('b', null, '0');
      var scoreBox = h('div', { class: 'db-score is-now' }, h('span', null, 'Score'), scoreEl);
      var head = h('div', { class: 'db-head' },
        h('div', null, h('p', { class: 'db-title', 'aria-hidden': 'true' }, 'Doubles', h('span', null, '.')), goalEl),
        h('div', { class: 'db-scores' }, scoreBox, h('div', { class: 'db-score is-best' }, h('span', null, 'Best'), bestEl)));
      var newBtn = h('button', { class: 'db-btn', type: 'button', onclick: function () { openCard('menu'); } }, 'New game');
      var undoBtn = h('button', { class: 'db-btn', type: 'button', disabled: true, onclick: function () { undo(); } }, 'Undo');
      var teachBtn = h('button', { class: 'db-btn', type: 'button', 'aria-pressed': String(teach), title: 'Show every tile as a power of two', onclick: function () { setTeach(!teach); } }, 'Powers of 2');
      var tools = h('div', { class: 'db-tools' }, newBtn, undoBtn, teachBtn);
      var board = h('div', { class: 'db-board', role: 'img', tabindex: '0', 'aria-label': 'Doubles board' });
      var cardTitle = h('p', { class: 'db-card-title' }, 'Doubles');
      var cardMsg = h('p', { class: 'db-card-msg' });
      var sizeBtns = {};
      var sizeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Board size' }, SIZE_KEYS.map(function (s) {
        sizeBtns[s] = h('button', { type: 'button', 'aria-label': s + ' by ' + s, onclick: function () { chooseSize(s); } }, s + '×' + s);
        return sizeBtns[s];
      }));
      var cardSub = h('p', { class: 'db-card-sub' });
      var goBtn = h('button', { class: 'db-btn db-go', type: 'button', onclick: function () { cardGo(); } }, 'Start');
      var altBtn = h('button', { class: 'db-btn', type: 'button', hidden: true, onclick: function () { cardAlt(); } }, 'New game');
      var card = h('div', { class: 'db-card' }, cardTitle, cardMsg, sizeSeg, cardSub, h('div', { class: 'db-card-buttons' }, goBtn, altBtn));
      var overlay = h('div', { class: 'db-overlay' }, card);
      var stack = h('div', { class: 'db-stack' }, board, overlay);
      function padBtn(dir, label, glyph) { return h('button', { class: 'db-btn', type: 'button', 'aria-label': label, onclick: function () { move(dir); } }, h('span', { 'aria-hidden': 'true' }, glyph)); }
      var pad = h('div', { class: 'db-pad', role: 'group', 'aria-label': 'Slide buttons' }, padBtn('left', 'Slide left', '◀'), padBtn('up', 'Slide up', '▲'), padBtn('down', 'Slide down', '▼'), padBtn('right', 'Slide right', '▶'));
      var learn = h('p', { class: 'db-learn', hidden: true });
      var app = h('div', { class: 'db-app' }, head, tools, stack, pad, learn);
      var note = h('p', { class: 'game-note' }, 'Swipe on the board, use the arrow keys (or W, A, S, D), or tap the arrow buttons. Two tiles with the same number join into one worth double.');
      root.appendChild(app);
      root.appendChild(note);

      /* ---------- the game state ---------- */
      var cells = [];        /* one tile object (or null) per square */
      var tiles = [];        /* every tile on the board, including ones sliding away after a join */
      var nextId = 1, score = 0, playing = false, won = false, keepGoing = false, newAt = -1;
      var undoState = null, finishTimer = 0, pendingSettle = null, timers = [];
      var bestBefore = 0;    /* the best score before this game began, to tell if this game beat it */

      function later(fn, ms) { var id = setTimeout(function () { timers.splice(timers.indexOf(id), 1); if (!destroyed) fn(); }, ms); timers.push(id); return id; }
      var lastStatus = '';
      function say(text) { if (text !== lastStatus) { lastStatus = text; api.status(text); } }

      /* ---------- building tiles ---------- */
      function layout() {
        board.style.setProperty('--n', n);
        board.replaceChildren();
        for (var i = 0; i < n * n; i++) board.appendChild(h('div', { class: 'db-slot', style: { '--r': Math.floor(i / n), '--c': i % n } }));
      }
      function makeTile(v, i, isNew) {
        var t = { id: nextId++, v: v, i: i, el: null, going: false };
        t.el = h('div', { class: 'db-tile' }, h('div', { class: 'db-face' }, h('i'), h('small')));
        paint(t);
        place(t);
        if (isNew && !RM) t.el.classList.add('is-new');
        board.appendChild(t.el);
        tiles.push(t);
        cells[i] = t;
        return t;
      }
      function paint(t) {
        var e = power(t.v), digits = String(t.v).length;
        t.el.className = 'db-tile ' + (t.v <= 2048 ? 'v' + t.v : 'vbig') + ' d' + Math.max(2, digits) + (t.going ? ' is-going' : '');
        var face = t.el.firstChild;
        face.firstChild.textContent = String(t.v);
        face.lastChild.textContent = '2' + sup(e);
      }
      function place(t) { t.el.style.setProperty('--r', Math.floor(t.i / n)); t.el.style.setProperty('--c', t.i % n); }
      function values() { var out = []; for (var i = 0; i < n * n; i++) out.push(cells[i] ? cells[i].v : 0); return out; }
      function emptySquares() { var out = []; for (var i = 0; i < n * n; i++) if (!cells[i]) out.push(i); return out; }
      function biggest() { var b = 0; for (var i = 0; i < n * n; i++) if (cells[i] && cells[i].v > b) b = cells[i].v; return b; }
      function addRandom() {
        var free = emptySquares();
        if (!free.length) return -1;
        var i = free[Math.floor(api.random() * free.length)];
        makeTile(api.random() < 0.9 ? 2 : 4, i, true);
        return i;
      }
      /* Puts a list of values on the board with no animation (a new game, a saved game, or undo). */
      function setBoard(vals) {
        finishNow();
        layout();
        tiles = []; cells = [];
        for (var i = 0; i < n * n; i++) { cells[i] = null; if (vals[i]) makeTile(vals[i], i, false); }
      }

      /* ---------- moving ---------- */
      /* Ends the last slide at once (when a new move comes in quickly): the joined tiles double and the new tile
         appears straight away, so the next move always sees the true board. */
      function finishNow() {
        clearTimeout(finishTimer); finishTimer = 0;
        if (pendingSettle) { var f = pendingSettle; pendingSettle = null; f(); }
      }
      function move(dir) {
        if (!playing || !overlay.hidden) return;
        api.unlockSound();
        finishNow();
        if (!playing || !overlay.hidden) return;      /* the last move may have just ended the game */
        var before = values(), gained = 0, joinedAt = [], moved = false;
        var ls = lines(n, dir), next = [];
        for (var i = 0; i < n * n; i++) next[i] = null;
        ls.forEach(function (line) {
          var vals = line.map(function (sq) { return cells[sq] ? cells[sq].v : 0; });
          var res = slideLine(vals);
          gained += res.gained;
          /* move each tile to its new square; a tile that joins another slides onto it, then disappears */
          var survivors = [];
          for (var k = 0; k < line.length; k++) {
            var t = cells[line[k]];
            if (!t) continue;
            var dest = line[res.to[k]];
            if (dest !== line[k]) moved = true;
            if (survivors[res.to[k]]) { t.going = true; t.i = dest; place(t); paint(t); moved = true; }
            else { survivors[res.to[k]] = t; t.i = dest; place(t); next[dest] = t; }
          }
          res.joined.forEach(function (j, idx) { if (j) joinedAt.push(line[idx]); });
        });
        if (!moved) { api.sound('tick'); say('Nothing can slide ' + dir + '. Try another way.'); return; }
        undoState = { vals: before, score: score, won: won, keepGoing: keepGoing };
        undoBtn.disabled = false;
        cells = next;
        score += gained;
        var biggestJoin = 0;
        /* after the slide: the joined tiles double and pop, and a new tile appears */
        function settle() {
          finishTimer = 0; pendingSettle = null;
          for (var k = tiles.length - 1; k >= 0; k--) if (tiles[k].going) { tiles[k].el.remove(); tiles.splice(k, 1); }
          joinedAt.forEach(function (sq) {
            var t = cells[sq];
            t.v *= 2;
            if (t.v > biggestJoin) biggestJoin = t.v;
            paint(t);
            if (!RM) { void t.el.offsetWidth; t.el.classList.add('is-pop'); if (t.v >= 64) t.el.classList.add('is-glow'); }
          });
          newAt = addRandom();
          afterMove(gained, biggestJoin);
        }
        api.tone(330, 0.04, 'sine', 0.04);
        if (SLIDE_MS) {
          tiles.forEach(function (t) { if (!t.going) t.el.classList.remove('is-new', 'is-pop', 'is-glow'); });
          pendingSettle = settle;
          finishTimer = later(finishNow, SLIDE_MS);
        } else settle();
      }
      function afterMove(gained, biggestJoin) {
        showScores(gained);
        publish();
        save();
        if (biggestJoin) {
          var e = power(biggestJoin);
          api.tone(NOTES[Math.min(NOTES.length - 1, e - 1)], 0.14, 'triangle', 0.09);
          if (biggestJoin >= 64) api.tone(NOTES[Math.min(NOTES.length - 1, e + 1)], 0.18, 'sine', 0.05);
        }
        if (!won && biggest() >= SIZES[n].goal) {
          won = true;
          api.celebrate('You made ' + SIZES[n].goal + '!');
          say('You made ' + SIZES[n].goal + '! Keep going, or start a new game.');
          later(function () { openCard('won'); }, RM ? 100 : 500);
          return;
        }
        if (!canMove(values(), n)) { gameOver(); return; }
        say('Score ' + fmt(score) + ' · biggest tile ' + biggest() + (biggestJoin >= 128 && biggestJoin === biggest() ? '. You made a ' + biggestJoin + '!' : ''));
      }
      function showScores(gained) {
        scoreEl.textContent = fmt(score);
        if (score > (best[n] || 0)) { best[n] = score; api.store.set('best', best); }
        bestEl.textContent = fmt(best[n] || 0);
        if (gained && !RM) {
          var plus = h('span', { class: 'db-plus', 'aria-hidden': 'true' }, '+' + gained);
          scoreBox.appendChild(plus);
          later(function () { plus.remove(); }, 700);
        }
        if (teach) explain();
      }
      /* Teaching mode: explains the biggest tile as a power of two. */
      var WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen'];
      function explain() {
        var b = biggest();
        if (!b) { learn.hidden = true; return; }
        var e = power(b), twos = [];
        for (var i = 0; i < e; i++) twos.push('2');
        learn.hidden = false;
        learn.replaceChildren('Every tile is a power of two. Your biggest tile, ', h('b', null, String(b)), ', is ', h('b', null, '2' + sup(e)), ': ',
          (WORDS[e] || String(e)) + (e === 1 ? ' 2' : ' 2s multiplied together') + (e > 1 && e <= 11 ? ' (' + twos.join(' × ') + ')' : '') + '. Join two ' + b + 's to make ' + fmt(b * 2) + ', which is 2' + sup(e + 1) + '.');
      }
      /* The board as text for screen readers (the label) and for the automated check (data-cells). */
      function publish() {
        var v = values(), rows = [];
        for (var r = 0; r < n; r++) {
          var row = [];
          for (var c = 0; c < n; c++) { var x = v[r * n + c]; row.push(x ? (teach ? x + ' (2 to the power of ' + power(x) + ')' : String(x)) : 'empty'); }
          rows.push('Row ' + (r + 1) + ': ' + row.join(', '));
        }
        board.setAttribute('aria-label', 'Doubles board, ' + n + ' by ' + n + '. ' + rows.join('. ') + '.');
        board.setAttribute('data-cells', v.join(','));
        board.setAttribute('data-new', String(newAt));
      }

      /* ---------- undo (one step) ---------- */
      function undo() {
        if (!undoState || !playing) return;
        var u = undoState;
        undoState = null; undoBtn.disabled = true;
        setBoard(u.vals);
        score = u.score; won = u.won; keepGoing = u.keepGoing; newAt = -1;
        scoreEl.textContent = fmt(score);
        if (teach) explain();
        publish(); save();
        api.sound('flip');
        say('Undone. Score ' + fmt(score) + '. You can undo one move at a time.');
        board.focus({ preventScroll: true });
      }

      /* ---------- starting and ending ---------- */
      function chooseSize(s) {
        if (s === n && playing) return updateCard();
        api.sound('click');
        if (s !== n) { n = s; api.store.set('size', n); }
        updateCard();
      }
      function updateCard() {
        SIZE_KEYS.forEach(function (s) { sizeBtns[s].setAttribute('aria-pressed', String(s === n)); });
        cardSub.textContent = SIZES[n].about + (best[n] ? ' Your best: ' + fmt(best[n]) + '.' : '');
        goalEl.textContent = 'Join the tiles to make ' + SIZES[n].goal + '.';
        bestEl.textContent = fmt(best[n] || 0);
      }
      var cardMode = 'menu';
      function openCard(mode) {
        cardMode = mode;
        var saved = mode === 'menu' && playing;
        sizeSeg.hidden = mode === 'won';
        cardSub.hidden = mode === 'won';
        altBtn.hidden = !(saved || mode === 'won');
        if (mode === 'menu') {
          cardTitle.textContent = saved ? 'New game?' : 'Doubles';
          cardMsg.textContent = saved ? 'Choose a board and start again, or carry on.' : 'Slide the tiles. Two the same join into one worth double.';
          goBtn.textContent = 'Start';
          altBtn.textContent = 'Carry on';
          if (saved) say('Paused. Start a new game or carry on.');
        } else if (mode === 'won') {
          cardTitle.textContent = 'You made ' + SIZES[n].goal + '!';
          cardMsg.textContent = 'Score ' + fmt(score) + '. Keep going for a bigger tile, or start again.';
          goBtn.textContent = 'Keep going';
          altBtn.textContent = 'New game';
        } else {
          cardTitle.textContent = 'No more moves';
          goBtn.textContent = 'Play again';
        }
        updateCard();
        overlay.hidden = false;
        board.classList.remove('is-playing');
        goBtn.focus({ preventScroll: true });
      }
      function cardGo() {
        api.unlockSound();
        if (cardMode === 'won') { keepGoing = true; closeCard(); say('Keep going! Score ' + fmt(score) + '.'); return; }
        newGame();
      }
      function cardAlt() {
        api.unlockSound();
        if (cardMode === 'won') { keepGoing = true; openCard('menu'); return; }
        closeCard();
        say('Score ' + fmt(score) + ' · biggest tile ' + biggest());
      }
      function closeCard() {
        overlay.hidden = true;
        playing = true;
        board.classList.add('is-playing');
        board.focus({ preventScroll: true });
      }
      function newGame() {
        api.sound('shuffle');
        score = 0; won = false; keepGoing = false; undoState = null; undoBtn.disabled = true; newAt = -1;
        bestBefore = best[n] || 0;
        setBoard([]);
        addRandom(); addRandom();
        newAt = -1;
        scoreEl.textContent = '0';
        updateCard();
        publish(); save();
        closeCard();
        if (teach) explain(); else learn.hidden = true;
        say('New ' + n + ' by ' + n + ' game. Slide the tiles to join pairs. Goal: ' + SIZES[n].goal + '.');
      }
      function gameOver() {
        playing = false;
        undoState = null; undoBtn.disabled = true;
        api.store.set('game', null);
        var isBest = score > bestBefore;
        var msg = 'Score ' + fmt(score) + ', biggest tile ' + biggest() + '. ' + (isBest ? 'That is a new best!' : 'Good thinking. Your best is ' + fmt(best[n] || 0) + '. Have another go?');
        say('No more moves. ' + msg);
        if (isBest) api.celebrate('New best: ' + fmt(score));
        else api.sound('lose');
        later(function () { openCard('over'); cardMsg.textContent = msg; }, RM ? 100 : 700);
      }
      function setTeach(on) {
        teach = on;
        api.store.set('teach', on);
        teachBtn.setAttribute('aria-pressed', String(on));
        board.classList.toggle('is-teach', on);
        api.sound('click');
        if (on) explain(); else learn.hidden = true;
        publish();
        say(on ? 'Powers of two on: every tile also shows how many 2s are multiplied to make it.' : 'Powers of two off.');
      }

      /* ---------- saving the game, so it survives a page reload ---------- */
      function save() { if (playing) api.store.set('game', { n: n, cells: values(), score: score, won: won, keepGoing: keepGoing, bestBefore: bestBefore }); }
      function loadSaved() {
        var g = api.store.get('game', null);
        if (!g || !SIZES[g.n] || !g.cells || g.cells.length !== g.n * g.n) return false;
        var ok = g.cells.every(function (v) { return v === 0 || (v >= 2 && (v & (v - 1)) === 0); });
        if (!ok || !canMove(g.cells, g.n)) return false;
        n = g.n; score = Number(g.score) || 0; won = !!g.won; keepGoing = !!g.keepGoing;
        bestBefore = g.bestBefore == null ? best[n] || 0 : Math.min(Number(g.bestBefore) || 0, best[n] || 0);
        setBoard(g.cells);
        return true;
      }

      /* ---------- input: keys, swipes ---------- */
      root.addEventListener('keydown', function (e) {
        if (!playing || !overlay.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
        var dir = KEYS[e.key];
        if (dir) { e.preventDefault(); move(dir); return; }
        if ((e.key === 'u' || e.key === 'U') && !undoBtn.disabled) { e.preventDefault(); undo(); }
      });
      var swipe = null;
      board.addEventListener('pointerdown', function (e) {
        if (!playing) return;
        swipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
        try { board.setPointerCapture(e.pointerId); } catch (err) { /* fine without it */ }
      });
      board.addEventListener('pointerup', function (e) {
        if (!swipe || e.pointerId !== swipe.id) return;
        var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
        swipe = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left'); else move(dy > 0 ? 'down' : 'up');
      });
      board.addEventListener('pointercancel', function () { swipe = null; });

      /* ---------- first paint ---------- */
      board.classList.toggle('is-teach', teach);
      if (loadSaved()) {
        scoreEl.textContent = fmt(score);
        updateCard();
        publish();
        playing = true;
        openCard('menu');
        cardTitle.textContent = 'Welcome back';
        cardMsg.textContent = 'Your ' + n + ' by ' + n + ' game is waiting, with ' + fmt(score) + ' points.';
        say('Your game is waiting. Carry on, or start a new one.');
      } else {
        layout();
        setBoard([]);
        updateCard();
        publish();
        openCard('menu');
        say('Press Start');
      }
      if (teach) explain();

      return {
        destroy: function () {
          destroyed = true;
          playing = false;
          clearTimeout(finishTimer);
          timers.forEach(clearTimeout); timers = [];
        }
      };
    }
  });
})();
