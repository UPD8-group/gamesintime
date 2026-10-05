/* Minefield for Games in Time.

   The logic grid from the 1990s desktop, in a 90s-style window of our own: hidden squares, number clues and mines.
   Every number tells you how many mines touch that square (up, down, sideways and corners). Open every square
   that is not a mine to win. Flag the squares you think hide mines.

   What this file does:
   - Draws the window (title bar, LED counters, a little miner face that restarts the game) with HTML and CSS,
     and the board on one canvas, every picture drawn by code.
   - The first square you dig is always safe and always opens an area, because the mines are only placed after
     your first click, and never on that square or the eight around it.
   - "No-guess boards": the computer keeps making boards until its own logic solver can finish the board from your
     first click without ever guessing. The solver only uses three rules a person can use too (see solve() below).
   - Hint: the same solver looks at the squares you can see and points to one it can prove is safe.

   Controls: click or tap to dig, right click or long-press (or Flag mode) to flag, click a number whose flags are
   all placed to open the rest of its neighbours. Keyboard: arrows move, Space digs, F flags, H hint, N new board.

   The canvas carries read-only data-* attributes (phase, what the player can see) so the automated test can play. */
(function () {
  'use strict';

  /* ---------- levels ---------- */
  var LEVELS = {
    beginner: { label: 'Beginner', cols: 9, rows: 9, mines: 10 },
    intermediate: { label: 'Intermediate', cols: 16, rows: 16, mines: 40 },
    expert: { label: 'Expert', cols: 30, rows: 16, mines: 99 }
  };
  var LEVEL_KEYS = ['beginner', 'intermediate', 'expert'];
  var HINT_COST = 10;           /* seconds added to the clock for each hint */
  var LONG_PRESS = 380;         /* ms a finger must stay still to place a flag */

  /* ---------- colours of the window and the board (a period object, like an arcade cabinet) ---------- */
  var COL = {
    face: '#c4c8cc', light: '#ffffff', shadow: '#7c8186', dark: '#3d4246',
    open: '#d3d7da', grid: '#9aa0a5', ink: '#16181a',
    flag: '#ff3d9a', flagDark: '#b0175f', pole: '#26292c',
    mine: '#1b1d22', boom: '#ff6f8f', wrong: '#d6243a', hint: '#1fc8b9', cursor: '#ffd23f'
  };
  /* Number colours: each number has its own colour, but the digit itself is always drawn too. */
  var NUM_COL = ['', '#1747c9', '#1c7a2e', '#d01f3c', '#3b1d99', '#8a1717', '#0d7b82', '#1d1d1d', '#62676b'];

  /* Pixel digits (5 wide, 7 tall), drawn square by square so they look like 1990s screen type and need no font. */
  var GLYPHS = {
    1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
    7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.']
  };
  /* Seven-segment LED digits: which of the segments a to g light up. */
  var SEGS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '' };

  /* =====================================================================================
     The board and the logic solver. These are plain functions with no drawing, so they are
     easy to test on their own (the automated test calls them through GamesInTime.get('minefield').logic).
     ===================================================================================== */

  /* For every square, the list of squares touching it (up to 8). Made once per board size. */
  var NB_CACHE = {};
  function neighbourTable(rows, cols) {
    var key = rows + 'x' + cols;
    if (NB_CACHE[key]) return NB_CACHE[key];
    var nb = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var list = [];
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            var rr = r + dr, cc = c + dc;
            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) list.push(rr * cols + cc);
          }
        }
        nb.push(list);
      }
    }
    NB_CACHE[key] = nb;
    return nb;
  }

  /* Hide `count` mines, but never on the first square or the eight around it. That is why the first dig is
     always safe and always opens an area. (A shuffle that stops after `count` picks.) */
  function placeMines(rows, cols, count, first, rand) {
    var n = rows * cols, mine = new Uint8Array(n), nb = neighbourTable(rows, cols), banned = new Uint8Array(n), pool = [], i;
    banned[first] = 1;
    for (i = 0; i < nb[first].length; i++) banned[nb[first][i]] = 1;
    for (i = 0; i < n; i++) if (!banned[i]) pool.push(i);
    count = Math.min(count, pool.length);
    for (var k = 0; k < count; k++) {
      var pick = k + Math.floor(rand() * (pool.length - k));
      var t = pool[k]; pool[k] = pool[pick]; pool[pick] = t;
      mine[pool[k]] = 1;
    }
    return mine;
  }

  /* The number on each safe square: how many of its neighbours hide a mine. Mines get -1. */
  function numbersFor(mine, rows, cols) {
    var nb = neighbourTable(rows, cols), num = new Int8Array(mine.length);
    for (var i = 0; i < mine.length; i++) {
      if (mine[i]) { num[i] = -1; continue; }
      var s = 0;
      for (var k = 0; k < nb[i].length; k++) s += mine[nb[i][k]];
      num[i] = s;
    }
    return num;
  }

  /* What the solver knows about each square: */
  var UNKNOWN = -1;   /* not worked out yet */
  var MINE = 9;       /* certainly a mine */
  var SAFE = 10;      /* certainly safe, but we cannot see its number yet */
  /* 0 to 8 means "open, and this is its number". */

  /* The logic solver. It only uses three rules, the same ones a careful player uses:
       1. Single square: look at one number. If it already touches that many certain mines, every other hidden
          square around it is safe. If its hidden squares are exactly as many as the mines it still needs, they
          are all mines.
       2. Subset: compare two numbers that are close together. If every hidden square around the first is also
          around the second, then the squares only the second one touches must hold the difference between the
          two numbers. If the difference is 0 they are all safe; if it equals how many squares there are, they are
          all mines.
       3. Counting: if the mines still missing are 0, every hidden square is safe; if they equal the number of
          hidden squares, every hidden square is a mine.
     It keeps applying the rules until none of them finds anything new.
     o.know is changed in place. If o.truth (the real numbers) is given, a square proved safe is opened and its
     number becomes known, like a player digging it (used to check a new board). Without o.truth it only marks
     squares SAFE (used for hints, so it never peeks at hidden numbers). o.stopAtSafe stops at the first safe find. */
  function solve(o) {
    var rows = o.rows, cols = o.cols, n = rows * cols, nb = neighbourTable(rows, cols), know = o.know;
    var steps = [], found = 0, tmp = [];

    function openFrom(j) {
      /* opening a 0 opens everything around it, just like in the game */
      var stack = [j];
      know[j] = o.truth[j];
      while (stack.length) {
        var x = stack.pop();
        if (know[x] !== 0) continue;
        for (var k = 0; k < nb[x].length; k++) {
          var y = nb[x][k];
          if (know[y] === UNKNOWN || know[y] === SAFE) { know[y] = o.truth[y]; stack.push(y); }
        }
      }
    }
    function markSafe(j, rule, from) {
      if (know[j] !== UNKNOWN) return;
      if (o.truth) openFrom(j); else know[j] = SAFE;
      steps.push({ i: j, mine: false, rule: rule, from: from });
      found++;
    }
    function markMine(j, rule, from) {
      if (know[j] !== UNKNOWN) return;
      know[j] = MINE;
      steps.push({ i: j, mine: true, rule: rule, from: from });
    }
    /* Fills `out` with the unknown squares around i and returns how many mines i still needs. */
    function hiddenAround(i, out) {
      out.length = 0;
      var certain = 0, list = nb[i];
      for (var k = 0; k < list.length; k++) {
        var v = know[list[k]];
        if (v === UNKNOWN) out.push(list[k]);
        else if (v === MINE) certain++;
      }
      return know[i] - certain;
    }
    function contains(list, x) { for (var k = 0; k < list.length; k++) if (list[k] === x) return true; return false; }

    for (;;) {
      var before = steps.length, i, k;

      /* Rule 1: one number at a time */
      for (i = 0; i < n; i++) {
        if (know[i] < 0 || know[i] > 8) continue;
        var need = hiddenAround(i, tmp);
        if (!tmp.length) continue;
        var group = tmp.slice();
        if (need === 0) for (k = 0; k < group.length; k++) markSafe(group[k], 'single', [i]);
        else if (need === group.length) for (k = 0; k < group.length; k++) markMine(group[k], 'single', [i]);
        if (o.stopAtSafe && found) return result();
      }
      if (steps.length > before) continue;

      /* Rule 2: pairs of numbers (only numbers up to two squares apart can share hidden squares) */
      var cons = [];
      for (i = 0; i < n; i++) {
        cons.push(null);
        if (know[i] < 0 || know[i] > 8) continue;
        var u = [], nd = hiddenAround(i, u);
        if (u.length) cons[i] = { cells: u, need: nd };
      }
      search:
      for (var a = 0; a < n; a++) {
        var A = cons[a];
        if (!A) continue;
        var ra = (a / cols) | 0, ca = a % cols;
        for (var dr = -2; dr <= 2; dr++) {
          for (var dc = -2; dc <= 2; dc++) {
            var rb = ra + dr, cb = ca + dc;
            if ((!dr && !dc) || rb < 0 || rb >= rows || cb < 0 || cb >= cols) continue;
            var b = rb * cols + cb, B = cons[b];
            if (!B || B.cells.length <= A.cells.length) continue;
            var inside = true;
            for (k = 0; k < A.cells.length && inside; k++) if (!contains(B.cells, A.cells[k])) inside = false;
            if (!inside) continue;
            var extra = [];
            for (k = 0; k < B.cells.length; k++) if (!contains(A.cells, B.cells[k])) extra.push(B.cells[k]);
            var diff = B.need - A.need;
            if (diff === 0) { for (k = 0; k < extra.length; k++) markSafe(extra[k], 'subset', [a, b]); break search; }
            if (diff === extra.length) { for (k = 0; k < extra.length; k++) markMine(extra[k], 'subset', [a, b]); break search; }
          }
        }
      }
      if (o.stopAtSafe && found) return result();
      if (steps.length > before) continue;

      /* Rule 3: counting the mines that are left */
      var unknown = [], mines = 0;
      for (i = 0; i < n; i++) { if (know[i] === UNKNOWN) unknown.push(i); else if (know[i] === MINE) mines++; }
      if (unknown.length) {
        var left = o.total - mines;
        if (left === 0) for (k = 0; k < unknown.length; k++) markSafe(unknown[k], 'count', []);
        else if (left === unknown.length) for (k = 0; k < unknown.length; k++) markMine(unknown[k], 'count', []);
      }
      if (steps.length === before) break;
    }
    return result();

    function result() {
      var hidden = 0;
      for (var q = 0; q < n; q++) if (know[q] === UNKNOWN) hidden++;
      return { steps: steps, solved: hidden === 0 };
    }
  }

  /* Can the solver finish this board from the first square without guessing? */
  function logicSolves(mine, rows, cols, total, first) {
    var truth = numbersFor(mine, rows, cols), know = new Int8Array(rows * cols);
    for (var i = 0; i < know.length; i++) know[i] = UNKNOWN;
    var o = { rows: rows, cols: cols, know: know, truth: truth, total: total };
    var nb = neighbourTable(rows, cols), stack = [first];
    know[first] = truth[first];
    while (stack.length) {
      var x = stack.pop();
      if (know[x] !== 0) continue;
      for (var k = 0; k < nb[x].length; k++) { var y = nb[x][k]; if (know[y] === UNKNOWN) { know[y] = truth[y]; stack.push(y); } }
    }
    return solve(o).solved;
  }

  /* ---------- small helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fmtTime(ms) { return (Math.round(ms / 100) / 10).toFixed(1) + ' s'; }

  GamesInTime.register({
    id: 'minefield',
    frame: 'none',
    logic: { neighbourTable: neighbourTable, placeMines: placeMines, numbersFor: numbersFor, solve: solve, logicSolves: logicSolves, UNKNOWN: UNKNOWN, MINE: MINE, SAFE: SAFE },
    mount: function (root, api) {
      var h = api.h;
      var reduced = !!api.reducedMotion;
      var destroyed = false;
      var timers = [];

      /* ---------- settings and best times ---------- */
      var levelKey = api.store.get('level', 'beginner');
      if (!LEVELS[levelKey]) levelKey = 'beginner';
      var noGuess = !!api.store.get('noguess', false);
      var bigCells = !!api.store.get('big', false);
      var bests = api.store.get('bests', {}) || {};
      var flagMode = false;

      /* ---------- styles, scoped to this game ---------- */
      root.appendChild(h('style', null,
        '.game-minefield { color: #16181a; }' +
        '.game-minefield .mf-desk { display: flex; justify-content: center; padding: clamp(14px, 3.5vw, 36px); border-radius: 20px;' +
        '  background: radial-gradient(120% 90% at 20% 0%, rgba(255,255,255,.08), transparent 60%), repeating-linear-gradient(45deg, rgba(0,0,0,.07) 0 2px, transparent 2px 6px), #0f6f6c;' +
        '  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), 0 18px 40px rgba(0,0,0,.35); }' +
        '@media (max-width: 560px) { .game-minefield .mf-desk { padding: 0; background: none; box-shadow: none; } }' +
        '.game-minefield .mf-win { width: 100%; max-width: 100%; min-width: 0; background: ' + COL.face + '; padding: 3px; border: 2px solid; border-color: #e9ecee #2b2f33 #2b2f33 #e9ecee;' +
        '  box-shadow: inset -2px -2px 0 ' + COL.shadow + ', inset 2px 2px 0 #fff, 0 16px 34px rgba(0,0,0,.45); font: 600 15px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }' +
        '.game-minefield .mf-title { display: flex; align-items: center; gap: 8px; min-height: 30px; padding: 3px 8px; color: #fff; font-weight: 800; letter-spacing: .02em;' +
        '  background: linear-gradient(90deg, #4b1fa8, #7b3fe0 35%, #1fc8b9); text-shadow: 0 1px 0 rgba(0,0,0,.4); }' +
        '.game-minefield .mf-title-icon { width: 18px; height: 18px; flex: none; }' +
        '.game-minefield .mf-title-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
        '.game-minefield .mf-title-level { font-weight: 600; opacity: .9; font-size: 13px; white-space: nowrap; }' +
        '.game-minefield .mf-tools { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px 4px; align-items: stretch; }' +
        '.game-minefield .mf-levels { display: flex; gap: 0; flex: 1 1 100%; }' +
        '.game-minefield .mf-tools > .mf-btn { flex: 1 1 auto; }' +
        '.game-minefield .mf-btn { min-height: 40px; min-width: 40px; padding: 4px 10px; border-radius: 0; color: #16181a; background: ' + COL.face + ';' +
        '  border: 2px solid; border-color: #fff #2b2f33 #2b2f33 #fff; box-shadow: inset -1px -1px 0 ' + COL.shadow + ', inset 1px 1px 0 #e4e7ea;' +
        '  font: 700 14px/1.1 system-ui, -apple-system, "Segoe UI", sans-serif; display: inline-flex; align-items: center; justify-content: center; gap: 6px; touch-action: manipulation; }' +
        '.game-minefield .mf-btn small { display: block; font-weight: 600; font-size: 11px; opacity: .75; }' +
        '.game-minefield .mf-levels .mf-btn { flex: 1 1 0; flex-direction: column; gap: 1px; padding: 4px 6px; }' +
        '.game-minefield .mf-btn[aria-pressed="true"], .game-minefield .mf-btn:active { border-color: #2b2f33 #fff #fff #2b2f33; box-shadow: inset 1px 1px 0 ' + COL.shadow + '; background: #b9bdc1; }' +
        '.game-minefield .mf-btn[aria-pressed="true"] { background: #fff4c7; }' +
        '.game-minefield .mf-btn:focus-visible { outline: 3px solid #ffd23f; outline-offset: 1px; }' +
        '.game-minefield .mf-btn[disabled] { color: #7c8186; }' +
        '.game-minefield .mf-check { width: 16px; height: 16px; background: #fff; border: 2px solid; border-color: #2b2f33 #fff #fff #2b2f33; display: inline-grid; place-items: center; font-size: 13px; line-height: 1; font-weight: 900; }' +
        '.game-minefield .mf-sunk { border: 3px solid; border-color: ' + COL.shadow + ' #fff #fff ' + COL.shadow + '; }' +
        '.game-minefield .mf-panel { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; margin: 0 4px 6px; }' +
        '.game-minefield .mf-led { display: block; background: #120202; border: 1px solid; border-color: ' + COL.shadow + ' #fff #fff ' + COL.shadow + '; }' +
        '.game-minefield .mf-face { width: 52px; height: 52px; padding: 0; min-width: 52px; }' +
        '.game-minefield .mf-face canvas { width: 40px; height: 40px; display: block; pointer-events: none; }' +
        '.game-minefield .mf-boardwrap { margin: 0 4px 4px; overflow-x: auto; overflow-y: hidden; max-width: calc(100% - 8px); -webkit-overflow-scrolling: touch; background: ' + COL.shadow + '; }' +
        '.game-minefield .mf-canvas { display: block; margin: 0 auto; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: default; }' +
        '.game-minefield .mf-canvas:focus { outline: none; }' +
        '.game-minefield .mf-canvas:focus-visible { outline: 3px solid #ffd23f; outline-offset: -3px; }' +
        '.game-minefield .mf-statusbar { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 12px; margin: 0 4px 2px; padding: 3px 8px; border: 2px solid; border-color: ' + COL.shadow + ' #fff #fff ' + COL.shadow + '; font-size: 13px; font-weight: 600; }' +
        '.game-minefield .mf-help { color: var(--ink-muted); font-size: .95rem; margin-top: .9rem; text-align: center; }' +
        '.game-minefield .mf-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }' +
        '@media (max-width: 420px) { .game-minefield .mf-win { font-size: 14px; } .game-minefield .mf-levels .mf-btn { font-size: 12.5px; } .game-minefield .mf-btn { padding-inline: 7px; } .game-minefield .mf-title-level { display: none; } }'));

      /* ---------- the window ---------- */
      var titleIcon = h('canvas', { class: 'mf-title-icon', width: 36, height: 36, 'aria-hidden': 'true' });
      var titleLevel = h('span', { class: 'mf-title-level' }, '');
      var levelBtns = {};
      var levelRow = h('div', { class: 'mf-levels', role: 'group', 'aria-label': 'Level' }, LEVEL_KEYS.map(function (k) {
        var L = LEVELS[k];
        levelBtns[k] = h('button', { type: 'button', class: 'mf-btn', 'aria-pressed': String(k === levelKey), onclick: function () { setLevel(k); } },
          L.label, h('small', null, L.mines + ' mines'));
        return levelBtns[k];
      }));
      var ngCheck = h('span', { class: 'mf-check', 'aria-hidden': 'true' });
      var ngBtn = h('button', { type: 'button', class: 'mf-btn', 'aria-pressed': String(noGuess), title: 'Boards you can always finish with logic', onclick: function () { setNoGuess(!noGuess); } }, ngCheck, 'No-guess');
      var flagIcon = h('canvas', { width: 44, height: 44, 'aria-hidden': 'true', style: { width: '22px', height: '22px' } });
      var flagBtn = h('button', { type: 'button', class: 'mf-btn', 'aria-pressed': 'false', onclick: function () { setFlagMode(!flagMode); } }, flagIcon, 'Flag mode');
      var hintBtn = h('button', { type: 'button', class: 'mf-btn', onclick: function () { hint(); } }, 'Hint +' + HINT_COST + ' s');
      var zoomBtn = h('button', { type: 'button', class: 'mf-btn', 'aria-pressed': String(bigCells), onclick: function () { bigCells = !bigCells; api.store.set('big', bigCells); zoomBtn.setAttribute('aria-pressed', String(bigCells)); api.sound('click'); layout(); } }, 'Big squares');
      var tools = h('div', { class: 'mf-tools' }, levelRow, ngBtn, flagBtn, hintBtn, zoomBtn);

      var minesLed = h('canvas', { class: 'mf-led', role: 'img', 'aria-label': 'Mines left' });
      var timeLed = h('canvas', { class: 'mf-led', role: 'img', 'aria-label': 'Seconds' });
      var faceCanvas = h('canvas', { width: 80, height: 80, 'aria-hidden': 'true' });
      var faceBtn = h('button', { type: 'button', class: 'mf-btn mf-face', 'aria-label': 'New board', onclick: function () { api.sound('click'); newGame(); focusBoard(); } }, faceCanvas);
      var panel = h('div', { class: 'mf-panel mf-sunk' }, minesLed, faceBtn, timeLed);

      var canvas = h('canvas', { class: 'mf-canvas', role: 'img', tabindex: '0', 'aria-label': '' });
      var boardWrap = h('div', { class: 'mf-boardwrap mf-sunk' }, canvas);
      var sbLeft = h('span', null, ''), sbRight = h('span', null, '');
      var statusBar = h('div', { class: 'mf-statusbar' }, sbLeft, sbRight);
      var win = h('div', { class: 'mf-win' },
        h('div', { class: 'mf-title' }, titleIcon, h('span', { class: 'mf-title-text' }, 'Minefield'), titleLevel),
        tools, panel, boardWrap, statusBar);
      var desk = h('div', { class: 'mf-desk' }, win);
      var help = h('p', { class: 'mf-help' }, 'Click or tap to dig. Right click, long-press or Flag mode to plant a flag. Click a number whose flags are all placed to open the rest of its squares. Keyboard: arrows move, Space digs, F flags, H gives a hint, N starts a new board.');
      root.appendChild(desk);
      root.appendChild(help);

      var ctx = canvas.getContext('2d');

      /* ---------- game state ---------- */
      var rows = 9, cols = 9, total = 10, n = 81, nb = null;
      var mine = null, num = null;       /* the hidden truth (null until the first dig) */
      var cell = null;                   /* 0 hidden, 1 open, 2 flagged */
      var openAt = null;                 /* when each square's opening animation starts (ms, performance clock) */
      var phase = 'ready';               /* ready | making | playing | won | lost */
      var opened = 0, flags = 0, boomAt = -1, mineShowAt = null;
      var clockStart = 0, clockStore = 0, clockRunning = false, penalty = 0;
      var cursor = 0, showCursor = false;
      var pressed = [], faceMood = 'smile', hintCell = -1, hintUntil = 0, usedHints = 0;
      var genToken = 0, attempts = 0;
      var CS = 30, dpr = 1, rafId = 0, secTimer = 0;
      var sprites = {};
      var winShine = 0;

      function L() { return LEVELS[levelKey]; }
      function narrow() { return (desk.clientWidth || root.clientWidth || 800) < 600; }

      /* ---------- the game clock (stops while the tab is hidden) ---------- */
      function elapsed() { return clockStore + (clockRunning ? performance.now() - clockStart : 0) + penalty * 1000; }
      function clockGo() { if (!clockRunning) { clockRunning = true; clockStart = performance.now(); } }
      function clockStop() { if (clockRunning) { clockStore += performance.now() - clockStart; clockRunning = false; } }

      /* ---------- new game ---------- */
      function newGame() {
        genToken++;
        var lv = L();
        /* Expert is wide (30 across, 16 down). On a phone it turns on its side: 16 across, 30 down. */
        if (levelKey === 'expert' && narrow()) { cols = 16; rows = 30; } else { cols = lv.cols; rows = lv.rows; }
        total = lv.mines; n = rows * cols; nb = neighbourTable(rows, cols);
        mine = null; num = null;
        cell = new Uint8Array(n); openAt = new Float64Array(n); mineShowAt = new Float64Array(n);
        phase = 'ready'; opened = 0; flags = 0; boomAt = -1;
        clockStore = 0; clockRunning = false; penalty = 0; usedHints = 0;
        cursor = Math.floor(rows / 2) * cols + Math.floor(cols / 2);
        pressed = []; faceMood = 'smile'; hintCell = -1; winShine = 0;
        titleLevel.textContent = lv.label + ' · ' + cols + ' × ' + rows;
        hintBtn.disabled = true;
        layout();
        drawLeds(); drawFace();
        updateBar();
        canvas.setAttribute('aria-label', 'Minefield board, ' + cols + ' squares across and ' + rows + ' down, with ' + total + ' hidden mines. Arrow keys move, Space digs, F flags.');
        status((isTouch() ? 'Tap' : 'Click') + ' any square to start. Your first square is always safe.' + (noGuess ? ' No-guess board: you can solve it all with logic.' : ''));
        syncData();
      }
      function status(t) { api.status(t); }
      function isTouch() { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); }

      /* The first dig: now the mines are hidden, never on this square or around it. */
      function firstDig(i) {
        var lv = L();
        if (!noGuess) {
          mine = placeMines(rows, cols, total, i, api.random);
          startPlaying(i);
          return;
        }
        /* No-guess: keep making boards until the solver can finish one from this square without guessing.
           Boards are tried in small batches so the page never freezes. */
        phase = 'making'; faceMood = 'think'; drawFace(); attempts = 0;
        status('Building a board you can solve with logic…');
        var token = ++genToken;
        function batch() {
          if (destroyed || token !== genToken) return;
          var t0 = performance.now();
          while (performance.now() - t0 < 12) {
            attempts++;
            var m = placeMines(rows, cols, lv.mines, i, api.random);
            if (logicSolves(m, rows, cols, lv.mines, i)) { mine = m; startPlaying(i); return; }
          }
          later(batch, 0);
        }
        batch();
      }
      function startPlaying(i) {
        num = numbersFor(mine, rows, cols);
        phase = 'playing'; faceMood = 'smile';
        clockGo();
        hintBtn.disabled = false;
        startSecondTimer();
        dig(i);
        if (noGuess) api.announce('This board was the ' + ordinal(attempts) + ' one the computer tried. Its solver finished it with logic alone.');
      }
      function ordinal(k) { var s = ['th', 'st', 'nd', 'rd'], v = k % 100; return k + (s[(v - 20) % 10] || s[v] || s[0]); }

      /* ---------- digging, flagging and chording ---------- */
      function dig(i, silent) {
        if (phase === 'ready') { firstDig(i); return; }
        if (phase !== 'playing' || cell[i] !== 0) return;
        clearHint();
        if (mine[i]) { lose(i); return; }
        /* Open this square. If it is a 0, open its neighbours too, and theirs, spreading out like a ripple. */
        var now = performance.now(), queue = [i], dist = {}, head = 0, maxD = 0, count = 0;
        dist[i] = 0; cell[i] = 1; opened++; count++;
        while (head < queue.length) {
          var x = queue[head++];
          openAt[x] = now + (reduced ? 0 : dist[x]);
          if (num[x] !== 0) continue;
          for (var k = 0; k < nb[x].length; k++) {
            var y = nb[x][k];
            if (cell[y] !== 0 || mine[y]) continue;
            cell[y] = 1; opened++; count++;
            dist[y] = dist[x] + 1; if (dist[y] > maxD) maxD = dist[y];
            queue.push(y);
          }
        }
        /* the ripple takes at most about 0.4 seconds, however big it is */
        if (!reduced && maxD) { var stepMs = Math.min(26, 400 / maxD); for (var q = 0; q < queue.length; q++) openAt[queue[q]] = now + dist[queue[q]] * stepMs; }
        if (!silent) { if (count > 1) rippleSound(maxD); else api.sound('tick'); }
        afterMove();
      }
      function toggleFlag(i) {
        if (phase === 'ready') { status('Dig your first square before planting flags. The first one is always safe.'); api.sound('wrong'); return; }
        if (phase !== 'playing' || cell[i] === 1) return;
        clearHint();
        if (cell[i] === 2) { cell[i] = 0; flags--; api.sound('tick'); }
        else { cell[i] = 2; flags++; api.sound('clack'); if (!reduced) openAt[i] = performance.now(); }
        if (navigator.vibrate && isTouch()) { try { navigator.vibrate(12); } catch (e) { /* ignore */ } }
        afterMove();
      }
      /* Chording: on an open number whose flags are all placed, open every other square around it at once. */
      function chord(i) {
        if (phase !== 'playing' || cell[i] !== 1 || num[i] <= 0) return false;
        var f = 0, hidden = [], k;
        for (k = 0; k < nb[i].length; k++) { var y = nb[i][k]; if (cell[y] === 2) f++; else if (cell[y] === 0) hidden.push(y); }
        if (!hidden.length) return false;
        if (f !== num[i]) { status('That ' + num[i] + ' needs ' + num[i] + ' flag' + (num[i] === 1 ? '' : 's') + ' around it before it can open the rest. It has ' + f + '.'); api.sound('wrong'); return true; }
        for (k = 0; k < hidden.length; k++) { if (mine[hidden[k]]) { lose(hidden[k]); return true; } }
        api.sound('pop');
        for (k = 0; k < hidden.length; k++) if (cell[hidden[k]] === 0) dig(hidden[k], true);
        return true;
      }
      function afterMove() {
        drawLeds();
        if (phase === 'playing' && opened === n - total) { winGame(); return; }
        if (phase === 'playing') status(playingText());
        kick();
        syncData();
      }
      function playingText() {
        var left = total - flags;
        return (left >= 0 ? left + ' mine' + (left === 1 ? '' : 's') + ' left to flag' : 'Too many flags: ' + flags + ' flags for ' + total + ' mines') + ' · ' + (n - total - opened) + ' safe square' + (n - total - opened === 1 ? '' : 's') + ' still to open.';
      }

      /* ---------- winning and losing ---------- */
      function winGame() {
        phase = 'won'; clockStop(); stopSecondTimer();
        faceMood = 'win';
        for (var i = 0; i < n; i++) if (mine[i] && cell[i] !== 2) { cell[i] = 2; flags++; openAt[i] = performance.now() + (reduced ? 0 : 60 + (i % 7) * 30); }
        winShine = reduced ? 0 : performance.now();
        hintBtn.disabled = true;
        var t = elapsed(), key = levelKey + (noGuess ? '-ng' : ''), old = bests[key];
        var isBest = !old || t < old;
        if (isBest) { bests[key] = Math.round(t); api.store.set('bests', bests); }
        var msg = 'Cleared in ' + fmtTime(t) + '!' + (usedHints ? ' (' + usedHints + ' hint' + (usedHints === 1 ? '' : 's') + ' included.)' : '') + (isBest ? ' A new best for ' + L().label + (noGuess ? ' no-guess' : '') + '.' : ' Your best is ' + fmtTime(old) + '.');
        status(msg);
        api.celebrate(isBest ? 'New best: ' + fmtTime(t) + '!' : 'Board cleared!');
        drawLeds(); drawFace(); updateBar(); kick(); syncData();
      }
      var KIND = ['Oops, that one was a mine. Every mine is shown now, so you can see how close you were.', 'Bad luck! The mines are all showing now. Press the face to try a fresh board.', 'So close! Here is where every mine was hiding. Have another go.'];
      function lose(i) {
        phase = 'lost'; clockStop(); stopSecondTimer();
        boomAt = i; faceMood = 'lose'; hintBtn.disabled = true;
        cell[i] = 1;
        /* Show the mines one by one, nearest first, with a soft pop (all at once with reduced motion). */
        var now = performance.now(), list = [], ri = (i / cols) | 0, ci = i % cols, k;
        for (k = 0; k < n; k++) if (mine[k] && k !== i && cell[k] !== 2) list.push(k);
        list.sort(function (a, b) { return dist2(a) - dist2(b); });
        function dist2(a) { var dr = ((a / cols) | 0) - ri, dc = (a % cols) - ci; return dr * dr + dc * dc; }
        var gap = reduced ? 0 : Math.min(60, 1100 / Math.max(1, list.length));
        mineShowAt[i] = now;
        for (k = 0; k < list.length; k++) mineShowAt[list[k]] = now + 250 + k * gap;
        api.sound('thud');
        if (!reduced) for (k = 0; k < Math.min(list.length, 10); k++) later(popTone(k), 250 + k * gap);
        later(function () { api.sound('lose'); }, reduced ? 50 : 350);
        var wrongFlags = 0; for (k = 0; k < n; k++) if (cell[k] === 2 && !mine[k]) wrongFlags++;
        status(KIND[Math.floor(api.random() * KIND.length)] + (wrongFlags ? ' Crossed-out flags were on safe squares.' : ''));
        drawLeds(); drawFace(); updateBar(); kick(); syncData();
      }
      function popTone(k) { return function () { api.tone(520 - k * 22, 0.07, 'square', 0.035); }; }
      function rippleSound(maxD) {
        api.sound('pop');
        var notes = [523, 659, 784, 1047], steps = Math.min(notes.length, 1 + Math.floor(maxD / 2));
        for (var k = 1; k < steps; k++) later(toneFn(notes[k]), k * 55);
      }
      function toneFn(f) { return function () { api.tone(f, 0.06, 'square', 0.04); }; }

      /* ---------- hints: the solver looks only at what you can see ---------- */
      function hint() {
        if (phase !== 'playing') return;
        /* The solver gets only the open numbers. Your flags are ignored, in case one of them is wrong. */
        var know = new Int8Array(n);
        for (var i = 0; i < n; i++) know[i] = cell[i] === 1 ? num[i] : UNKNOWN;
        var res = solve({ rows: rows, cols: cols, know: know, total: total });
        var pick = null, wrongFlag = null, s;
        for (s = 0; s < res.steps.length && !pick; s++) {
          var st = res.steps[s];
          if (!st.mine && cell[st.i] === 0) pick = st;
          else if (!st.mine && cell[st.i] === 2 && !wrongFlag) wrongFlag = st;
        }
        if (!pick && wrongFlag) pick = wrongFlag;
        for (s = 0; s < res.steps.length && !pick; s++) if (res.steps[s].mine && cell[res.steps[s].i] === 0) pick = res.steps[s];
        if (!pick) {
          status('The solver cannot prove any square safe right now. This is a spot where even a computer has to guess.');
          api.sound('wrong');
          return;
        }
        usedHints++; penalty += HINT_COST;
        hintCell = pick.i; hintUntil = performance.now() + 5000;
        cursor = pick.i;
        var what = pick.mine ? 'must hide a mine' : cell[pick.i] === 2 ? 'has a flag on it, but it is safe' : 'is safe';
        status('Hint: the glowing square ' + what + ', because ' + reason(pick) + ' (+' + HINT_COST + ' s)');
        api.sound('bell');
        drawLeds(); kick();
      }
      /* Explains a solver step in words. "Needs" means mines still missing once certain mines are counted. */
      function reason(st) {
        function at(i) { return 'the ' + num[i] + ' at row ' + ((i / cols | 0) + 1) + ', column ' + (i % cols + 1); }
        if (st.rule === 'single') return st.mine ? at(st.from[0]) + ' has just enough hidden squares left for its mines.' : at(st.from[0]) + ' already has all of its mines worked out.';
        if (st.rule === 'subset') return 'every hidden square next to ' + at(st.from[0]) + ' also touches ' + at(st.from[1]) + (st.mine ? '. The second number needs more mines than the first, and only these squares are left to hold them.' : '. They need the same number of mines, so the second number\u2019s other squares are empty.');
        return 'counting the mines that are left proves it.';
      }
      function clearHint() { hintCell = -1; }

      /* ---------- layout: square size follows the space we have ---------- */
      function layout() {
        var cs = getComputedStyle(desk);
        var avail = Math.max(150, (desk.clientWidth || root.clientWidth || 320) - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0) - 26);
        var fit = Math.floor(avail / cols);
        /* on a wide screen the whole board should also fit in the window's height */
        if (!narrow()) fit = Math.min(fit, Math.max(24, Math.floor(((window.innerHeight || 800) - 250) / rows)));
        var big = fit < 30;
        zoomBtn.hidden = !big;
        CS = clamp(fit, 16, 46);
        if (big && bigCells) CS = 36;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(cols * CS * dpr); canvas.height = Math.round(rows * CS * dpr);
        canvas.style.width = cols * CS + 'px'; canvas.style.height = rows * CS + 'px';
        /* the window hugs the board, but is never narrower than its buttons need */
        var inner = (desk.clientWidth || 320) - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
        var winW = Math.max(cols * CS + 24, 310);
        win.style.width = winW >= inner ? '100%' : winW + 'px';
        buildSprites();
        drawBoard(performance.now());
        drawIcons();
      }

      /* ---------- sprites: each kind of square is drawn once, then stamped onto the board ---------- */
      function makeSprite(fn) {
        var c = document.createElement('canvas'), s = Math.round(CS * dpr);
        c.width = s; c.height = s;
        var g = c.getContext('2d');
        g.scale(s / CS, s / CS);
        fn(g, CS);
        return c;
      }
      function bevel(g, s, up) {
        var b = Math.max(2, Math.round(s / 11));
        g.fillStyle = COL.face; g.fillRect(0, 0, s, s);
        g.fillStyle = up ? COL.light : COL.shadow;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(s, 0); g.lineTo(s - b, b); g.lineTo(b, b); g.lineTo(b, s - b); g.lineTo(0, s); g.closePath(); g.fill();
        g.fillStyle = up ? COL.shadow : COL.light;
        g.beginPath(); g.moveTo(s, s); g.lineTo(0, s); g.lineTo(b, s - b); g.lineTo(s - b, s - b); g.lineTo(s - b, b); g.lineTo(s, 0); g.closePath(); g.fill();
      }
      function openTile(g, s, bg) {
        g.fillStyle = bg || COL.open; g.fillRect(0, 0, s, s);
        g.fillStyle = COL.grid; g.fillRect(0, 0, s, 1); g.fillRect(0, 0, 1, s);
      }
      function drawGlyph(g, s, d) {
        var rowsG = GLYPHS[d], px = Math.max(1, Math.floor(s * 0.6 * dpr / 7)) / dpr;
        var w = 5 * px, hh = 7 * px, x0 = Math.round((s - w - px * 0.5) / 2 * dpr) / dpr, y0 = Math.round((s - hh) / 2 * dpr) / dpr + 0.5;
        g.fillStyle = NUM_COL[d];
        for (var r = 0; r < 7; r++) for (var c = 0; c < 5; c++) if (rowsG[r].charAt(c) === '#') g.fillRect(x0 + c * px, y0 + r * px, px * 1.5, px);
      }
      function drawFlag(g, s) {
        var x = s * 0.52;
        g.fillStyle = COL.pole; g.fillRect(x - s * 0.04, s * 0.2, s * 0.08, s * 0.52);
        g.fillRect(s * 0.3, s * 0.7, s * 0.44, s * 0.07); g.fillRect(s * 0.38, s * 0.64, s * 0.28, s * 0.07);
        g.fillStyle = COL.flag;
        g.beginPath(); g.moveTo(x + s * 0.04, s * 0.15); g.lineTo(x + s * 0.04, s * 0.5); g.lineTo(x - s * 0.34, s * 0.325); g.closePath(); g.fill();
        g.fillStyle = COL.flagDark;
        g.beginPath(); g.moveTo(x + s * 0.04, s * 0.325); g.lineTo(x + s * 0.04, s * 0.5); g.lineTo(x - s * 0.34, s * 0.325); g.closePath(); g.fill();
      }
      function drawMine(g, s) {
        var cx = s / 2, cy = s / 2, r = s * 0.22;
        g.strokeStyle = COL.mine; g.lineWidth = Math.max(1.5, s * 0.07); g.lineCap = 'round';
        for (var a = 0; a < 8; a++) {
          var ang = a * Math.PI / 4, len = a % 2 ? r * 1.35 : r * 1.6;
          g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len); g.stroke();
        }
        g.fillStyle = COL.mine; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx - r * 0.35, cy - r * 0.35, r * 0.28, 0, Math.PI * 2); g.fill();
      }
      function buildSprites() {
        sprites.hidden = makeSprite(function (g, s) { bevel(g, s, true); });
        sprites.pressed = makeSprite(function (g, s) { openTile(g, s, '#c8ccd0'); });
        sprites.open = makeSprite(function (g, s) { openTile(g, s); });
        sprites.flag = makeSprite(function (g, s) { bevel(g, s, true); drawFlag(g, s); });
        sprites.mine = makeSprite(function (g, s) { openTile(g, s); drawMine(g, s); });
        sprites.boom = makeSprite(function (g, s) { openTile(g, s, COL.boom); drawMine(g, s); });
        sprites.wrong = makeSprite(function (g, s) {
          bevel(g, s, true); drawFlag(g, s);
          g.strokeStyle = COL.wrong; g.lineWidth = Math.max(2, s * 0.1); g.lineCap = 'round';
          g.beginPath(); g.moveTo(s * 0.2, s * 0.2); g.lineTo(s * 0.8, s * 0.8); g.moveTo(s * 0.8, s * 0.2); g.lineTo(s * 0.2, s * 0.8); g.stroke();
        });
        sprites.num = [];
        for (var d = 1; d <= 8; d++) sprites.num[d] = makeSprite((function (dd) { return function (g, s) { openTile(g, s); drawGlyph(g, s, dd); }; })(d));
      }

      /* ---------- drawing the board ---------- */
      function drawBoard(now) {
        var animating = false;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        var S = CS * dpr;
        for (var i = 0; i < n; i++) {
          var x = (i % cols) * S, y = ((i / cols) | 0) * S, sp = null, scale = 1, st = cell[i];
          if (phase === 'lost' && mine[i] && st !== 2) {
            if (now >= mineShowAt[i]) { sp = i === boomAt ? sprites.boom : sprites.mine; scale = popScale(now - mineShowAt[i]); if (scale < 1) animating = true; }
            else { sp = sprites.hidden; animating = true; }
          } else if (phase === 'lost' && st === 2 && !mine[i]) sp = sprites.wrong;
          else if (st === 1) {
            if (now < openAt[i]) { sp = sprites.hidden; animating = true; }
            else { sp = num[i] > 0 ? sprites.num[num[i]] : sprites.open; scale = popScale(now - openAt[i]); if (scale < 1) animating = true; }
          } else if (st === 2) {
            if (now < openAt[i]) { sp = sprites.hidden; animating = true; }
            else { sp = sprites.flag; scale = popScale(now - openAt[i]); if (scale < 1) animating = true; }
          } else sp = pressed.indexOf(i) >= 0 ? sprites.pressed : sprites.hidden;
          if (scale < 1) {
            /* a square that has just opened grows into place: open background first, then the content */
            ctx.drawImage(st === 2 ? sprites.hidden : sprites.open, x, y);
            var off = S * (1 - scale) / 2;
            ctx.drawImage(sp, x + off, y + off, S * scale, S * scale);
          } else ctx.drawImage(sp, x, y);
        }
        /* a shine sweeps across the board when you win */
        if (winShine) {
          var t = (now - winShine) / 900;
          if (t < 1) {
            animating = true;
            var W = cols * S, Hh = rows * S, px = -W * 0.4 + t * (W + Hh) * 1.2;
            var gr = ctx.createLinearGradient(px - Hh, 0, px, Hh);
            gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gr; ctx.fillRect(0, 0, W, Hh);
          } else winShine = 0;
        }
        /* the hint ring */
        if (hintCell >= 0) {
          if (now > hintUntil) hintCell = -1;
          else {
            animating = true;
            var hx = (hintCell % cols) * S, hy = ((hintCell / cols) | 0) * S, pulse = reduced ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(now / 220));
            ctx.lineWidth = Math.max(3, S * 0.12);
            ctx.strokeStyle = 'rgba(31,200,185,' + pulse.toFixed(2) + ')';
            ctx.strokeRect(hx + ctx.lineWidth / 2, hy + ctx.lineWidth / 2, S - ctx.lineWidth, S - ctx.lineWidth);
          }
        }
        /* the keyboard cursor: yellow with a dark edge so it shows on every square */
        if (showCursor && document.activeElement === canvas) {
          var cx = (cursor % cols) * S, cy = ((cursor / cols) | 0) * S, lw = Math.max(2, Math.round(S * 0.08));
          ctx.lineWidth = lw + 2 * dpr; ctx.strokeStyle = COL.ink; ctx.strokeRect(cx + lw / 2, cy + lw / 2, S - lw, S - lw);
          ctx.lineWidth = lw; ctx.strokeStyle = COL.cursor; ctx.strokeRect(cx + lw / 2, cy + lw / 2, S - lw, S - lw);
        }
        return animating;
      }
      function popScale(t) { if (reduced || t >= 140) return 1; var k = t / 140; return 0.55 + 0.45 * (1 - (1 - k) * (1 - k)) + Math.sin(k * Math.PI) * 0.08; }

      /* Animation runs only while something is moving, then stops. */
      function kick() { if (!rafId && !destroyed) rafId = requestAnimationFrame(frame); }
      function frame(now) {
        rafId = 0;
        if (destroyed) return;
        var more = drawBoard(now);
        if (more && !document.hidden) rafId = requestAnimationFrame(frame);
      }

      /* ---------- LED counters and the face ---------- */
      function drawLed(cv, text) {
        var dw = 15, dh = 27, gapX = 3, pad = 3, w = text.length * (dw + gapX) - gapX + pad * 2, hh = dh + pad * 2;
        if (cv.width !== w * 2) { cv.width = w * 2; cv.height = hh * 2; cv.style.width = w + 'px'; cv.style.height = hh + 'px'; }
        var g = cv.getContext('2d');
        g.setTransform(2, 0, 0, 2, 0, 0);
        g.fillStyle = '#140303'; g.fillRect(0, 0, w, hh);
        for (var k = 0; k < text.length; k++) seg(g, pad + k * (dw + gapX), pad, dw, dh, SEGS[text.charAt(k)] || '');
      }
      /* One seven-segment digit. Each segment is a little six-sided bar with a gap at each end, like a real LED. */
      function seg(g, x, y, w, hh, on) {
        var t = 3.4, m = hh / 2, e = 1.3, half = t / 2;
        function bar(x1, y1, x2, y2, lit) {
          /* a bar from (x1,y1) to (x2,y2), pointed at both ends */
          g.fillStyle = lit ? '#ff3030' : '#3a0909';
          g.beginPath();
          if (y1 === y2) { g.moveTo(x1 + e, y1); g.lineTo(x1 + e + half, y1 - half); g.lineTo(x2 - e - half, y1 - half); g.lineTo(x2 - e, y1); g.lineTo(x2 - e - half, y1 + half); g.lineTo(x1 + e + half, y1 + half); }
          else { g.moveTo(x1, y1 + e); g.lineTo(x1 + half, y1 + e + half); g.lineTo(x1 + half, y2 - e - half); g.lineTo(x1, y2 - e); g.lineTo(x1 - half, y2 - e - half); g.lineTo(x1 - half, y1 + e + half); }
          g.closePath(); g.fill();
        }
        var L = x + half, R = x + w - half, T = y + half, B = y + hh - half, M = y + m;
        bar(L, T, R, T, on.indexOf('a') >= 0);
        bar(R, T, R, M, on.indexOf('b') >= 0);
        bar(R, M, R, B, on.indexOf('c') >= 0);
        bar(L, B, R, B, on.indexOf('d') >= 0);
        bar(L, M, L, B, on.indexOf('e') >= 0);
        bar(L, T, L, M, on.indexOf('f') >= 0);
        bar(L, M, R, M, on.indexOf('g') >= 0);
      }
      function led3(v) {
        v = Math.round(v);
        if (v < 0) return '-' + ('0' + Math.min(99, -v)).slice(-2);
        return ('00' + Math.min(999, v)).slice(-3);
      }
      function drawLeds() {
        var left = total - flags, secs = Math.floor(elapsed() / 1000);
        drawLed(minesLed, led3(left));
        drawLed(timeLed, led3(secs));
        minesLed.setAttribute('aria-label', left + ' mines left to flag');
        timeLed.setAttribute('aria-label', secs + ' seconds');
      }
      function startSecondTimer() { stopSecondTimer(); secTimer = setInterval(function () { if (phase === 'playing' && !document.hidden) drawLeds(); }, 250); }
      function stopSecondTimer() { if (secTimer) clearInterval(secTimer); secTimer = 0; }

      /* The face: a round little miner in a hard hat with a lamp. Our own design. */
      function drawFace() {
        var g = faceCanvas.getContext('2d'), s = 80;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, s, s);
        var cx = 40, cy = 44, r = 25;
        var mood = faceMood;
        /* face */
        g.fillStyle = '#ffd23f'; g.strokeStyle = '#1b1d22'; g.lineWidth = 3;
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.stroke();
        /* cheeks */
        g.fillStyle = 'rgba(255,61,154,.35)';
        g.beginPath(); g.arc(cx - 15, cy + 7, 4.5, 0, Math.PI * 2); g.arc(cx + 15, cy + 7, 4.5, 0, Math.PI * 2); g.fill();
        /* hard hat with a lamp (tilted when the mine goes pop) */
        g.save();
        if (mood === 'lose') { g.translate(cx, cy - 12); g.rotate(-0.28); g.translate(-cx, -(cy - 12)); }
        g.fillStyle = '#1fc8b9'; g.strokeStyle = '#1b1d22'; g.lineWidth = 3;
        g.beginPath(); g.arc(cx, cy - 10, 22, Math.PI, 0); g.lineTo(cx + 27, cy - 10); g.lineTo(cx + 27, cy - 6); g.lineTo(cx - 27, cy - 6); g.lineTo(cx - 27, cy - 10); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = mood === 'win' ? '#fffbe0' : '#fff4a8';
        g.beginPath(); g.arc(cx, cy - 22, 6, 0, Math.PI * 2); g.fill(); g.stroke();
        if (mood === 'win') {
          g.strokeStyle = '#fff4a8'; g.lineWidth = 2.5;
          for (var a = -2; a <= 2; a++) { var an = -Math.PI / 2 + a * 0.45; g.beginPath(); g.moveTo(cx + Math.cos(an) * 9, cy - 22 + Math.sin(an) * 9); g.lineTo(cx + Math.cos(an) * 15, cy - 22 + Math.sin(an) * 15); g.stroke(); }
        }
        g.restore();
        g.fillStyle = '#1b1d22'; g.strokeStyle = '#1b1d22'; g.lineWidth = 2.6; g.lineCap = 'round';
        var ey = cy + 1;
        if (mood === 'lose') {
          /* dizzy swirls */
          [-9, 9].forEach(function (dx) { g.beginPath(); for (var t = 0; t < 9; t++) { var an2 = t * 0.85, rr = 0.7 + t * 0.55; g.lineTo(cx + dx + Math.cos(an2) * rr, ey + Math.sin(an2) * rr); } g.stroke(); });
          g.beginPath(); g.moveTo(cx - 9, cy + 13); g.quadraticCurveTo(cx - 4.5, cy + 9, cx, cy + 13); g.quadraticCurveTo(cx + 4.5, cy + 17, cx + 9, cy + 13); g.stroke();
        } else if (mood === 'win') {
          /* happy closed eyes and a big grin */
          [-9, 9].forEach(function (dx) { g.beginPath(); g.arc(cx + dx, ey + 2, 4.5, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); });
          g.beginPath(); g.moveTo(cx - 11, cy + 9); g.quadraticCurveTo(cx, cy + 22, cx + 11, cy + 9); g.closePath(); g.fill();
        } else if (mood === 'oh') {
          [-9, 9].forEach(function (dx) { g.beginPath(); g.arc(cx + dx, ey, 3.6, 0, Math.PI * 2); g.fill(); });
          g.beginPath(); g.arc(cx, cy + 13, 4.2, 0, Math.PI * 2); g.stroke();
        } else if (mood === 'think') {
          [-9, 9].forEach(function (dx) { g.beginPath(); g.arc(cx + dx + 2, ey - 2, 2.8, 0, Math.PI * 2); g.fill(); });
          g.beginPath(); g.moveTo(cx - 6, cy + 13); g.lineTo(cx + 6, cy + 12); g.stroke();
        } else {
          [-9, 9].forEach(function (dx) { g.beginPath(); g.arc(cx + dx, ey, 3, 0, Math.PI * 2); g.fill(); });
          g.beginPath(); g.arc(cx, cy + 6, 9, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
        }
      }
      /* the little icons on the title bar and the Flag mode button */
      function drawIcons() {
        var g = titleIcon.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 36, 36);
        g.save(); g.translate(-1, 0); drawMineIcon(g); g.restore();
        var f = flagIcon.getContext('2d');
        f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, 44, 44);
        f.translate(2, 0); drawFlag(f, 44);
      }
      function drawMineIcon(g) {
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(18, 18, 15, 0, Math.PI * 2); g.fill();
        drawMine(g, 36);
      }

      /* ---------- the status bar inside the window ---------- */
      function updateBar() {
        var key = levelKey + (noGuess ? '-ng' : '');
        sbLeft.textContent = 'Best on ' + L().label + (noGuess ? ' (no-guess)' : '') + ': ' + (bests[key] ? fmtTime(bests[key]) : 'none yet');
        sbRight.textContent = noGuess ? 'No-guess board' : 'Classic board';
      }

      /* ---------- settings ---------- */
      function setLevel(k) {
        if (!LEVELS[k]) return;
        levelKey = k; api.store.set('level', k);
        LEVEL_KEYS.forEach(function (x) { levelBtns[x].setAttribute('aria-pressed', String(x === k)); });
        api.sound('click');
        newGame();
      }
      function setNoGuess(v) {
        noGuess = v; api.store.set('noguess', v);
        ngBtn.setAttribute('aria-pressed', String(v));
        ngCheck.textContent = v ? '✓' : '';
        api.sound('click');
        newGame();
      }
      function setFlagMode(v) {
        flagMode = v;
        flagBtn.setAttribute('aria-pressed', String(v));
        api.sound(v ? 'clack' : 'click');
        if (phase === 'playing') status(v ? 'Flag mode is on: taps plant flags. Tap Flag mode again to dig.' : 'Flag mode is off: taps dig.');
      }

      /* ---------- pointer input: mouse, finger and pen ---------- */
      var ptr = null;   /* the press in progress */
      function cellAt(e) {
        var r = canvas.getBoundingClientRect();
        var c = Math.floor((e.clientX - r.left) / (r.width / cols)), rr = Math.floor((e.clientY - r.top) / (r.height / rows));
        if (c < 0 || c >= cols || rr < 0 || rr >= rows) return -1;
        return rr * cols + c;
      }
      function pressLook(i, isChord) {
        pressed = [];
        if (i < 0 || (phase !== 'playing' && phase !== 'ready')) return;
        if (cell[i] === 0) pressed.push(i);
        if (isChord || cell[i] === 1) for (var k = 0; k < nb[i].length; k++) if (cell[nb[i][k]] === 0) pressed.push(nb[i][k]);
      }
      function onDown(e) {
        if (destroyed) return;
        api.unlockSound();
        var i = cellAt(e);
        if (i < 0) return;
        showCursor = false;
        if (phase === 'won' || phase === 'lost' || phase === 'making') return;
        var mouse = e.pointerType === 'mouse';
        if (mouse && e.button === 2) { e.preventDefault(); toggleFlag(i); return; }
        if (mouse && e.button !== 0 && e.button !== 1) return;
        ptr = { id: e.pointerId, i: i, x: e.clientX, y: e.clientY, mouse: mouse, chord: e.button === 1, done: false, timer: 0 };
        if (mouse) { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } canvas.focus({ preventScroll: true, focusVisible: false }); }
        else {
          /* a finger held still on a square plants a flag */
          ptr.timer = setTimeout(function () {
            if (!ptr || ptr.done) return;
            ptr.done = true; pressed = [];
            if (cell[ptr.i] === 1) chord(ptr.i); else toggleFlag(ptr.i);
            drawBoard(performance.now());
          }, LONG_PRESS);
        }
        faceMood = 'oh'; drawFace();
        pressLook(i, ptr.chord);
        drawBoard(performance.now());
      }
      function onMove(e) {
        if (!ptr || ptr.id !== e.pointerId) return;
        if (!ptr.mouse) {
          if (Math.abs(e.clientX - ptr.x) > 10 || Math.abs(e.clientY - ptr.y) > 10) cancelPress();  /* it is a scroll, not a tap */
          return;
        }
        var i = cellAt(e);
        if (i !== ptr.i) { ptr.i = i; pressLook(i, ptr.chord); drawBoard(performance.now()); }
      }
      function onUp(e) {
        if (!ptr || ptr.id !== e.pointerId) return;
        var p = ptr; ptr = null;
        clearTimeout(p.timer);
        pressed = [];
        if (phase === 'playing' || phase === 'ready') faceMood = 'smile';
        if (!p.done && p.i >= 0) {
          var i = p.i;
          if (p.chord) chord(i);
          else if (cell[i] === 1) chord(i);
          else if (flagMode) toggleFlag(i);
          else if (cell[i] === 0) dig(i);
        }
        drawFace();
        drawBoard(performance.now());
        kick();
      }
      function cancelPress() {
        if (!ptr) return;
        clearTimeout(ptr.timer); ptr = null; pressed = [];
        if (phase === 'playing' || phase === 'ready') faceMood = 'smile';
        drawFace(); drawBoard(performance.now());
      }
      function noMenu(e) { e.preventDefault(); }

      /* ---------- keyboard: arrows move a cursor ---------- */
      function onKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        var k = e.key, r = (cursor / cols) | 0, c = cursor % cols, moved = false;
        if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') {
          e.preventDefault();
          if (!showCursor) { showCursor = true; }
          else {
            if (k === 'ArrowUp') r = Math.max(0, r - 1);
            if (k === 'ArrowDown') r = Math.min(rows - 1, r + 1);
            if (k === 'ArrowLeft') c = Math.max(0, c - 1);
            if (k === 'ArrowRight') c = Math.min(cols - 1, c + 1);
            cursor = r * cols + c;
          }
          moved = true;
        } else if (k === ' ' || k === 'Enter') {
          e.preventDefault(); showCursor = true;
          if (phase === 'won' || phase === 'lost') { newGame(); }
          else if (cell[cursor] === 1) chord(cursor);
          else if (flagMode) toggleFlag(cursor);
          else if (cell[cursor] === 0) dig(cursor);
        } else if (k === 'f' || k === 'F') { e.preventDefault(); showCursor = true; toggleFlag(cursor); }
        else if (k === 'h' || k === 'H' || k === '?') { e.preventDefault(); hint(); }
        else if (k === 'n' || k === 'N' || k === 'F2') { e.preventDefault(); api.sound('click'); newGame(); }
        else return;
        if (moved) { api.announce(describe(cursor)); scrollCursorIntoView(); }
        drawBoard(performance.now()); kick();
      }
      function describe(i) {
        var where = 'Row ' + ((i / cols | 0) + 1) + ', column ' + (i % cols + 1) + ': ';
        if (cell[i] === 2) return where + 'flagged';
        if (cell[i] === 0) return where + 'hidden';
        return where + (num[i] === 0 ? 'empty' : num[i]);
      }
      function scrollCursorIntoView() {
        if (boardWrap.scrollWidth <= boardWrap.clientWidth) return;
        var x = (cursor % cols) * CS;
        if (x < boardWrap.scrollLeft) boardWrap.scrollLeft = x - CS;
        else if (x + CS > boardWrap.scrollLeft + boardWrap.clientWidth) boardWrap.scrollLeft = x + 2 * CS - boardWrap.clientWidth;
      }
      function focusBoard() { try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      function onFocus() {
        /* arriving with the Tab key shows the square cursor straight away */
        try { if (document.activeElement === canvas && canvas.matches(':focus-visible')) showCursor = true; } catch (e) { /* ignore */ }
        drawBoard(performance.now());
      }

      /* ---------- read-only data for the automated test: only what a player can see ---------- */
      function syncData() {
        var d = canvas.dataset, s = '';
        for (var i = 0; i < n; i++) {
          if (i && i % cols === 0) s += '/';
          var st = cell[i];
          if (phase === 'lost' && mine && mine[i]) s += '*';
          else s += st === 2 ? 'F' : st === 0 ? '#' : String(num[i]);
        }
        d.phase = phase; d.rows = String(rows); d.cols = String(cols); d.mines = String(total); d.view = s;
        d.noguess = noGuess ? '1' : '0'; d.attempts = String(attempts); d.cell = String(CS);
      }

      function later(fn, ms) { var id = setTimeout(function () { timers.splice(timers.indexOf(id), 1); if (!destroyed) fn(); }, ms); timers.push(id); return id; }

      /* ---------- pause the clock while the tab is hidden ---------- */
      function onVisibility() {
        if (document.hidden) { if (phase === 'playing') clockStop(); }
        else if (phase === 'playing') { clockGo(); drawLeds(); kick(); }
      }

      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', cancelPress);
      canvas.addEventListener('contextmenu', noMenu);
      canvas.addEventListener('keydown', onKey);
      canvas.addEventListener('focus', onFocus);
      canvas.addEventListener('blur', onFocus);
      document.addEventListener('visibilitychange', onVisibility);

      var lastW = 0;
      var ro = new ResizeObserver(function () {
        var w = desk.clientWidth;
        if (!w || w === lastW) return;
        var shapeChanged = (lastW < 600) !== (w < 600);
        lastW = w;
        /* a phone turned sideways: an expert board that has not started yet picks its new shape */
        if (levelKey === 'expert' && phase === 'ready' && shapeChanged) newGame(); else layout();
      });
      ro.observe(desk);

      ngCheck.textContent = noGuess ? '✓' : '';
      lastW = desk.clientWidth;
      newGame();

      return {
        destroy: function () {
          destroyed = true;
          genToken++;
          if (rafId) cancelAnimationFrame(rafId);
          stopSecondTimer();
          timers.forEach(clearTimeout); timers = [];
          if (ptr) clearTimeout(ptr.timer);
          ro.disconnect();
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }
  });
})();
