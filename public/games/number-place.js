/* Number Place (Sudoku) for Games in Time, in the 2000s hall.

   Fill the grid so every row, every column and every box holds each number once.
   The puzzle was first printed as "Number Place" by Dell Magazines in New York in 1979 (made by Howard Garns),
   named Sudoku by Nikoli in Japan in 1984, and became a world craze in 2004 and 2005 after The Times in London
   started printing Wayne Gould's puzzles. Here it sits on a newspaper puzzle page that we draw ourselves.

   The computer makes every puzzle fresh:
   - It fills an empty grid with a random answer, by trying numbers and backing up when it gets stuck.
   - It takes clues away one at a time, and only keeps a clue away if the puzzle still has exactly one answer
     (it counts answers and stops at two) and a person could still solve it with the techniques for that level.
   - It grades the puzzle by the hardest technique a person needs:
       Easy:   naked singles only (a square that can only be one number).
       Medium: hidden singles (a number that only fits in one square of a row, column or box).
       Hard:   pointing, claiming and pairs (numbers locked into one line, or two squares sharing two numbers).
   Junior sizes: 4 by 4 (always Easy: every 4 by 4 puzzle can be solved with naked singles alone) and 6 by 6
   (Easy or Medium).

   The page look is ours: newsprint, a serif masthead and black rules, like a 2005 puzzle page. frame: 'none'
   because the newspaper sheet is the frame. The grid carries data-puzzle, data-n and data-level so the
   automated check can count the answers of every puzzle it is given.
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  /* ======================= THE PUZZLE ENGINE =======================
     Everything here works on plain arrays, so it is easy to test.
     A grid is an array with one number per square, read row by row: 0 means empty.
     Candidates (the numbers a square could still be) are kept as "bitmasks": one bit per number.
     Bit 0 stands for 1, bit 1 for 2, and so on. So the mask 0b000010101 means "1, 3 or 5".
     Computers can combine bitmasks very quickly, which is why fast solvers use them. */

  /* BITS[m] is how many numbers are in mask m. DIGIT[m] is the number when m holds exactly one. */
  var BITS = [], DIGIT = [];
  (function () {
    for (var m = 0; m < 512; m++) {
      var c = 0, d = 0;
      for (var b = 0; b < 9; b++) if (m & (1 << b)) { c++; d = b + 1; }
      BITS[m] = c; DIGIT[m] = c === 1 ? d : 0;
    }
  })();

  /* A "shape" describes one size of puzzle: the rows, columns and boxes ("units") and which units each square is in.
     9 by 9 has 3 by 3 boxes. The junior 6 by 6 has boxes 2 rows tall and 3 columns wide. 4 by 4 has 2 by 2 boxes. */
  var SHAPES = {};
  function shape(n) {
    if (SHAPES[n]) return SHAPES[n];
    var br = n === 9 ? 3 : 2, bc = n === 4 ? 2 : 3;
    var S = { n: n, br: br, bc: bc, size: n * n, all: (1 << n) - 1, rowOf: [], colOf: [], boxOf: [], units: [], peers: [] };
    var i, r, c, u;
    for (i = 0; i < n * 3; i++) S.units.push({ kind: i < n ? 'row' : i < 2 * n ? 'column' : 'box', index: i % n, cells: [] });
    for (i = 0; i < S.size; i++) {
      r = Math.floor(i / n); c = i % n;
      var b = Math.floor(r / br) * (n / bc) + Math.floor(c / bc);
      S.rowOf[i] = r; S.colOf[i] = c; S.boxOf[i] = b;
      S.units[r].cells.push(i); S.units[n + c].cells.push(i); S.units[2 * n + b].cells.push(i);
    }
    for (i = 0; i < S.size; i++) {
      var seen = {}, list = [];
      [S.units[S.rowOf[i]], S.units[n + S.colOf[i]], S.units[2 * n + S.boxOf[i]]].forEach(function (unit) {
        unit.cells.forEach(function (j) { if (j !== i && !seen[j]) { seen[j] = true; list.push(j); } });
      });
      S.peers[i] = list;
    }
    /* Boxes first: "the only place a 7 fits in this box" is the easiest thing for a person to spot. */
    S.searchOrder = [];
    for (u = 2 * n; u < 3 * n; u++) S.searchOrder.push(u);
    for (u = 0; u < 2 * n; u++) S.searchOrder.push(u);
    SHAPES[n] = S;
    return S;
  }

  /* The backtracking solver. It fills the emptiest-looking square first (the one with the fewest choices),
     tries each choice in turn, and backs up when it gets stuck, like trying paths in a maze.
     countSolutions stops as soon as it finds `limit` answers: to know a puzzle has exactly one answer
     we only need to know there are not two. */
  function search(grid, S, limit, rand) {
    var g = grid.slice(), n = S.n, rowM = [], colM = [], boxM = [], i, count = 0, found = null;
    for (i = 0; i < n; i++) { rowM[i] = 0; colM[i] = 0; boxM[i] = 0; }
    for (i = 0; i < S.size; i++) {
      if (!g[i]) continue;
      var bit = 1 << (g[i] - 1);
      if ((rowM[S.rowOf[i]] | colM[S.colOf[i]] | boxM[S.boxOf[i]]) & bit) return { count: 0, grid: null }; /* the clues already clash */
      rowM[S.rowOf[i]] |= bit; colM[S.colOf[i]] |= bit; boxM[S.boxOf[i]] |= bit;
    }
    function step() {
      var best = -1, bestMask = 0, bestCount = 99;
      for (var k = 0; k < S.size; k++) {
        if (g[k]) continue;
        var m = S.all & ~(rowM[S.rowOf[k]] | colM[S.colOf[k]] | boxM[S.boxOf[k]]);
        if (BITS[m] < bestCount) { best = k; bestMask = m; bestCount = BITS[m]; if (bestCount < 2) break; }
      }
      if (best < 0) { count++; if (!found) found = g.slice(); return count >= limit; }
      if (!bestCount) return false;
      var options = [];
      for (var d = 1; d <= n; d++) if (bestMask & (1 << (d - 1))) options.push(d);
      if (rand) shuffle(options, rand);
      for (var o = 0; o < options.length; o++) {
        var b = 1 << (options[o] - 1), r = S.rowOf[best], c = S.colOf[best], x = S.boxOf[best];
        g[best] = options[o]; rowM[r] |= b; colM[c] |= b; boxM[x] |= b;
        if (step()) return true;
        g[best] = 0; rowM[r] &= ~b; colM[c] &= ~b; boxM[x] &= ~b;
      }
      return false;
    }
    step();
    return { count: count, grid: found };
  }
  function countSolutions(grid, S, limit) { return search(grid, S, limit || 2, null).count; }
  function zeros(count) { var a = []; for (var i = 0; i < count; i++) a.push(0); return a; }
  function shuffle(a, rand) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* ---------- the logic solver: solves like a person, one technique at a time ----------
     Level 1 techniques: naked single (a square with only one number left).
     Level 2: hidden single (a number with only one square left in a row, column or box).
     Level 3: pointing and claiming (a number locked into one line of a box, or one box of a line),
              naked pairs and hidden pairs (two squares that must share two numbers).
     The solver always uses the easiest technique that works, so the hardest one it needed tells us how hard
     the puzzle is for a person. */
  var TECH = { naked: 1, hidden: 2, pointing: 3, claiming: 3, nakedPair: 3, hiddenPair: 3 };

  function State(grid, S) {
    this.S = S; this.g = grid.slice(); this.cand = [];
    for (var i = 0; i < S.size; i++) this.cand[i] = 0;
    for (i = 0; i < S.size; i++) {
      if (this.g[i]) continue;
      var m = S.all, p = S.peers[i];
      for (var k = 0; k < p.length; k++) if (this.g[p[k]]) m &= ~(1 << (this.g[p[k]] - 1));
      this.cand[i] = m;
    }
  }
  State.prototype.place = function (i, d) {
    var bit = 1 << (d - 1), p = this.S.peers[i];
    this.g[i] = d; this.cand[i] = 0;
    for (var k = 0; k < p.length; k++) this.cand[p[k]] &= ~bit;
  };
  State.prototype.empty = function () { var c = 0; for (var i = 0; i < this.S.size; i++) if (!this.g[i]) c++; return c; };
  State.prototype.broken = function () { for (var i = 0; i < this.S.size; i++) if (!this.g[i] && !this.cand[i]) return true; return false; };

  function findNakedSingle(st) {
    for (var i = 0; i < st.S.size; i++) if (!st.g[i] && BITS[st.cand[i]] === 1) return { tech: 'naked', cell: i, digit: DIGIT[st.cand[i]] };
    return null;
  }
  function findHiddenSingle(st) {
    var S = st.S;
    for (var o = 0; o < S.searchOrder.length; o++) {
      var unit = S.units[S.searchOrder[o]];
      for (var d = 1; d <= S.n; d++) {
        var bit = 1 << (d - 1), where = -1, count = 0, k;
        for (k = 0; k < unit.cells.length; k++) {
          var c = unit.cells[k];
          if (st.g[c] === d) { count = -1; break; }
          if (st.cand[c] & bit) { count++; where = c; }
        }
        if (count === 1) return { tech: 'hidden', cell: where, digit: d, unit: unit };
      }
    }
    return null;
  }
  /* Removes `bit` from every listed square except the ones in `keep`. Returns the squares it changed. */
  function eliminate(st, cells, bit, keep) {
    var changed = [];
    for (var k = 0; k < cells.length; k++) {
      var c = cells[k];
      if (keep.indexOf(c) >= 0 || st.g[c]) continue;
      if (st.cand[c] & bit) { st.cand[c] &= ~bit; changed.push(c); }
    }
    return changed;
  }
  /* Pointing: inside one box, every square that could hold d is in the same row (or column).
     Then d must go in that line inside this box, so the rest of that line cannot have d.
     Claiming is the mirror image: inside one row (or column), d only fits in one box, so the rest of that box cannot. */
  function findLocked(st) {
    var S = st.S, n = S.n, u, d, k;
    for (u = 2 * n; u < 3 * n; u++) {
      var box = S.units[u];
      for (d = 1; d <= n; d++) {
        var bit = 1 << (d - 1), spots = [];
        for (k = 0; k < box.cells.length; k++) if (!st.g[box.cells[k]] && (st.cand[box.cells[k]] & bit)) spots.push(box.cells[k]);
        if (spots.length < 2) continue;
        var line = sameLine(S, spots);
        if (line) {
          var changed = eliminate(st, line.cells, bit, spots);
          if (changed.length) return { tech: 'pointing', digit: d, cells: spots, box: box, line: line, removed: changed };
        }
      }
    }
    for (u = 0; u < 2 * n; u++) {
      var ln = S.units[u];
      for (d = 1; d <= n; d++) {
        var bit2 = 1 << (d - 1), spots2 = [];
        for (k = 0; k < ln.cells.length; k++) if (!st.g[ln.cells[k]] && (st.cand[ln.cells[k]] & bit2)) spots2.push(ln.cells[k]);
        if (spots2.length < 2) continue;
        var b = S.boxOf[spots2[0]], all = true;
        for (k = 1; k < spots2.length; k++) if (S.boxOf[spots2[k]] !== b) all = false;
        if (!all) continue;
        var bx = S.units[2 * n + b], changed2 = eliminate(st, bx.cells, bit2, spots2);
        if (changed2.length) return { tech: 'claiming', digit: d, cells: spots2, box: bx, line: ln, removed: changed2 };
      }
    }
    return null;
  }
  function sameLine(S, cells) {
    var r = S.rowOf[cells[0]], c = S.colOf[cells[0]], sameR = true, sameC = true;
    for (var k = 1; k < cells.length; k++) { if (S.rowOf[cells[k]] !== r) sameR = false; if (S.colOf[cells[k]] !== c) sameC = false; }
    if (sameR) return S.units[r];
    if (sameC) return S.units[S.n + c];
    return null;
  }
  /* Naked pair: two squares in a unit that can only be the same two numbers, say 3 or 8. One gets the 3 and the
     other gets the 8, so no other square in that unit can be 3 or 8.
     Hidden pair: two numbers that only fit in the same two squares of a unit. Those squares must hold them,
     so any other number pencilled in those two squares can go. */
  function findPair(st) {
    var S = st.S, n = S.n, o, u, k, j;
    for (o = 0; o < S.searchOrder.length; o++) {
      u = S.units[S.searchOrder[o]];
      for (k = 0; k < u.cells.length; k++) {
        var a = u.cells[k];
        if (st.g[a] || BITS[st.cand[a]] !== 2) continue;
        for (j = k + 1; j < u.cells.length; j++) {
          var b = u.cells[j];
          if (st.g[b] || st.cand[b] !== st.cand[a]) continue;
          var mask = st.cand[a], changed = [];
          for (var q = 0; q < u.cells.length; q++) {
            var c = u.cells[q];
            if (c === a || c === b || st.g[c]) continue;
            if (st.cand[c] & mask) { st.cand[c] &= ~mask; changed.push(c); }
          }
          if (changed.length) return { tech: 'nakedPair', cells: [a, b], digits: digitsOf(mask), unit: u, removed: changed };
        }
      }
    }
    for (o = 0; o < S.searchOrder.length; o++) {
      u = S.units[S.searchOrder[o]];
      var where = [];
      for (var d = 1; d <= n; d++) {
        var bit = 1 << (d - 1), spots = [];
        for (k = 0; k < u.cells.length; k++) {
          if (st.g[u.cells[k]] === d) { spots = null; break; }
          if (!st.g[u.cells[k]] && (st.cand[u.cells[k]] & bit)) spots.push(u.cells[k]);
        }
        where[d] = spots;
      }
      for (var d1 = 1; d1 <= n; d1++) {
        if (!where[d1] || where[d1].length !== 2) continue;
        for (var d2 = d1 + 1; d2 <= n; d2++) {
          if (!where[d2] || where[d2].length !== 2 || where[d2][0] !== where[d1][0] || where[d2][1] !== where[d1][1]) continue;
          var keep = (1 << (d1 - 1)) | (1 << (d2 - 1)), ch = [];
          for (k = 0; k < 2; k++) {
            var cell = where[d1][k];
            if (st.cand[cell] & ~keep) { st.cand[cell] &= keep; ch.push(cell); }
          }
          if (ch.length) return { tech: 'hiddenPair', cells: where[d1].slice(), digits: [d1, d2], unit: u, removed: ch };
        }
      }
    }
    return null;
  }
  function digitsOf(mask) { var out = []; for (var d = 1; d <= 9; d++) if (mask & (1 << (d - 1))) out.push(d); return out; }

  /* One step of person-style solving, using techniques up to maxLevel. Returns what it did, or null if stuck. */
  function logicStep(st, maxLevel) {
    var s = findNakedSingle(st);
    if (s) { st.place(s.cell, s.digit); return s; }
    if (maxLevel < 2) return null;
    s = findHiddenSingle(st);
    if (s) { st.place(s.cell, s.digit); return s; }
    if (maxLevel < 3) return null;
    return findLocked(st) || findPair(st);
  }
  /* Solves as far as it can. Returns the hardest level it needed (1, 2 or 3), or 0 if it got stuck. */
  function grade(grid, S, maxLevel) {
    var st = new State(grid, S), hardest = 1;
    while (st.empty()) {
      if (st.broken()) return 0;
      var step = logicStep(st, maxLevel);
      if (!step) return 0;
      if (TECH[step.tech] > hardest) hardest = TECH[step.tech];
    }
    return hardest;
  }

  /* ---------- making a puzzle ----------
     1. Fill an empty grid with a random complete answer, using the backtracking solver with shuffled choices.
     2. Visit the squares in a random order and try taking each clue away. Keep it away only if
        (a) the puzzle still has exactly one answer (the solver stops counting at 2), and
        (b) a person could still solve it with the techniques allowed for this level.
     3. Grade the result. Keep it if it really needs the level's hardest technique, otherwise try again. */
  var FLOOR = { 4: [0, 7], 6: [0, 18, 13], 9: [0, 36, 28, 22] };  /* the fewest clues to leave, by size and level */
  function generate(n, level, rand) {
    var S = shape(n), bestTry = null;
    for (var attempt = 0; attempt < 120; attempt++) {
      var solution = search(zeros(S.size), S, 1, rand).grid;
      var puzzle = solution.slice(), order = [], clues = S.size, i;
      for (i = 0; i < S.size; i++) order.push(i);
      shuffle(order, rand);
      for (var k = 0; k < order.length && clues > FLOOR[n][level]; k++) {
        i = order[k];
        var keep = puzzle[i];
        puzzle[i] = 0;
        if (countSolutions(puzzle, S, 2) !== 1 || !grade(puzzle, S, level)) puzzle[i] = keep;
        else clues--;
      }
      var got = grade(puzzle, S, 3);
      if (got === level) return { n: n, level: level, puzzle: puzzle, solution: solution, clues: clues, attempts: attempt + 1 };
      if (!bestTry || Math.abs(got - level) < Math.abs(bestTry.level - level)) bestTry = { n: n, level: got, puzzle: puzzle, solution: solution, clues: clues, attempts: attempt + 1 };
    }
    return bestTry;
  }
  /* ===================== END OF THE PUZZLE ENGINE ===================== */

  /* ---------- words for the levels and the hints ---------- */
  var LEVELS = [null,
    { name: 'Easy', stars: '★☆☆', about: 'Easy: every square can be found by looking at what is already in its row, column and box.' },
    { name: 'Medium', stars: '★★☆', about: 'Medium: some numbers only fit in one square of a row, column or box. Look for them.' },
    { name: 'Hard', stars: '★★★', about: 'Hard: you will need pencil notes, and to spot numbers locked into one line or pairs of squares.' }];
  var MAX_LEVEL = { 4: 1, 6: 2, 9: 3 };
  var SIZE_NAME = { 4: 'Junior 4 by 4', 6: 'Junior 6 by 6', 9: '9 by 9' };

  function fmt(secs) { secs = Math.max(0, Math.floor(secs)); var m = Math.floor(secs / 60), s = secs % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function boxName(S, b) {
    var across = S.n / S.bc, down = S.n / S.br, r = Math.floor(b / across), c = b % across;
    var rn = down === 3 ? ['top', 'middle', 'bottom'][r] : ['top', 'bottom'][r];
    var cn = across === 3 ? ['left', 'middle', 'right'][c] : ['left', 'right'][c];
    return rn === 'middle' && cn === 'middle' ? 'centre box' : rn + ' ' + cn + ' box';
  }
  function unitName(S, u) { return u.kind === 'box' ? 'the ' + boxName(S, u.index) : u.kind + ' ' + (u.index + 1); }
  function an(d) { return (d === 8 ? 'an ' : 'a ') + d; }
  /* afterCrossing: true when the hint needed a crossing-out step first, so the reason has to mention it */
  function singleText(S, s, lead, afterCrossing) {
    if (s.tech === 'naked') return lead + ' can only be ' + an(s.digit) + '. Every other number is already in its row, its column or its box' + (afterCrossing ? ', or has just been crossed out.' : '.');
    var where = s.unit.kind === 'box' ? 'this box' : 'this ' + s.unit.kind;
    return lead + ' is the only place ' + an(s.digit) + ' fits in ' + where + '. Every other empty square in ' + where + (afterCrossing ? ' can already see ' + an(s.digit) + ', or has just had it crossed out.' : ' can already see ' + an(s.digit) + '.');
  }
  function elimText(S, e) {
    if (e.tech === 'pointing') return 'In the ' + boxName(S, e.box.index) + ', the ' + e.digit + ' can only go in ' + unitName(S, e.line) + '. So no other square in ' + unitName(S, e.line) + ' can be ' + an(e.digit) + '.';
    if (e.tech === 'claiming') return 'In ' + unitName(S, e.line) + ', the ' + e.digit + ' can only go inside the ' + boxName(S, e.box.index) + '. So no other square in that box can be ' + an(e.digit) + '.';
    var a = e.digits[0], b = e.digits[1], where = unitName(S, e.unit);
    if (e.tech === 'nakedPair') return 'Two squares in ' + where + ' can only be ' + a + ' or ' + b + '. One must be the ' + a + ' and the other the ' + b + ', so no other square in ' + where + ' can be ' + a + ' or ' + b + '.';
    return 'In ' + where + ', the ' + a + ' and the ' + b + ' only fit in the same two squares. Those two squares must hold the ' + a + ' and the ' + b + ', so nothing else can go in them.';
  }
  /* A made-up puzzle number for the masthead, worked out from the puzzle itself, like "No. 4821". */
  function puzzleNumber(p) { var x = 7; for (var i = 0; i < p.length; i++) x = (x * 31 + p[i] + i) % 9973; return 1000 + (x % 9000); }

  var P = '.game-number-place ';
  var CSS = [
    '.game-number-place { container-type: inline-size; --np-paper: #f3efe5; --np-paper-2: #e7e1d2; --np-white: #fffdf7; --np-ink: #1b1a17; --np-soft: #59544a; --np-thin: #a29c8e;' +
    ' --np-pen: #1f4e9c; --np-hint: #12733d; --np-clash: #c0282d; --np-sel: #ffe27a; --np-peer: #e9e3d4; --np-same: #c8dbf4; --np-why: #d3efdb;' +
    ' --np-sans: "Franklin Gothic Medium", "Arial Narrow", "Helvetica Neue", Arial, sans-serif; --np-serif: Georgia, "Times New Roman", Times, serif; }',
    /* The newspaper sheet. The site's shared button and pill colours are re-pointed at newspaper ink here, so .btn and .seg look printed. */
    P + '.np-sheet { --ink: var(--np-ink); --ink-muted: var(--np-soft); --line: #b4ad9d; --surface: var(--np-paper); --surface-2: var(--np-paper-2); --gold: var(--np-ink); --gold-shadow: #000; --on-era: var(--np-white); --link: var(--np-pen); --focus: #c26a00; --brand-text: var(--np-ink);' +
    ' position: relative; color: var(--np-ink); font-family: var(--np-serif); border-radius: 4px; padding: clamp(8px, 2.6cqi, 28px);' +
    ' background: radial-gradient(rgba(0, 0, 0, .035) 1px, transparent 1.2px) 0 0 / 4px 4px, linear-gradient(180deg, #f6f2e9, var(--np-paper) 40%, #ece6d8); box-shadow: 0 2px 0 #d8d1c0, 0 18px 40px rgba(0, 0, 0, .45); }',
    P + '.np-sheet .btn { font-family: var(--np-sans); border-color: var(--np-ink); background: var(--np-white); color: var(--np-ink); border-radius: 8px; }',
    P + '.np-sheet .btn-primary { background: var(--np-ink); color: var(--np-white); box-shadow: 0 3px 0 #000; }',
    P + '.np-sheet .seg { border-color: var(--np-ink); background: var(--np-white); border-radius: 8px; }',
    P + '.np-sheet .seg button { font-family: var(--np-sans); color: var(--np-ink); padding: .4rem .8rem; }',
    P + '.np-sheet .seg button + button { border-left-color: var(--np-ink); }',
    P + '.np-sheet .seg button[aria-pressed="true"] { background: var(--np-ink); color: var(--np-white); }',
    P + '.np-sheet .seg button:disabled { color: var(--np-thin); cursor: not-allowed; text-decoration: line-through; }',
    /* masthead */
    P + '.np-kicker { display: flex; justify-content: space-between; gap: .5rem; font: 700 .74rem/1.2 var(--np-sans); letter-spacing: .16em; text-transform: uppercase; border-bottom: 1px solid var(--np-ink); padding-bottom: .3rem; }',
    P + '.np-title { font: 700 clamp(2rem, 1.2rem + 4cqi, 3.4rem)/1 var(--np-serif); letter-spacing: -.015em; text-align: center; margin: .45rem 0 .15rem; }',
    P + '.np-dek { text-align: center; font-style: italic; color: var(--np-soft); font-size: clamp(.9rem, .85rem + .3cqi, 1.05rem); line-height: 1.35; }',
    P + '.np-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .2rem .9rem; margin: .55rem 0 .8rem; padding: .3rem 0; border-top: 3px double var(--np-ink); border-bottom: 1px solid var(--np-ink); font: 700 .8rem/1.3 var(--np-sans); letter-spacing: .08em; text-transform: uppercase; font-variant-numeric: tabular-nums; }',
    P + '.np-meta b { font-size: 1.05em; }',
    /* layout: the grid on top on a phone, beside the keypad on a wide screen */
    P + '.np-body { display: grid; gap: .9rem; }',
    '@container (min-width: 700px) { ' + P + '.np-body { grid-template-columns: minmax(0, 1fr) minmax(260px, 310px); align-items: start; gap: 1.4rem; } ' + P + '.np-pad { --np-pc: 3 !important; } ' + P + '.np-key { min-height: 58px; } }',
    P + '.np-boardwrap { display: grid; position: relative; }',
    P + '.np-boardwrap > * { grid-area: 1 / 1; }',
    /* the grid: thin lines between squares, thick black lines around each box */
    P + '.np-grid { width: 100%; max-width: 580px; margin: 0 auto; aspect-ratio: 1; align-self: start; container-type: inline-size; display: grid; grid-template-rows: repeat(var(--n), minmax(0, 1fr)); border: 3px solid var(--np-ink); background: var(--np-white); user-select: none; -webkit-user-select: none; }',
    P + '.np-row { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); min-height: 0; }',
    P + '.np-cell { position: relative; display: grid; place-items: center; min-width: 0; min-height: 0; border-right: 1px solid var(--np-thin); border-bottom: 1px solid var(--np-thin); cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; background-color: var(--np-white); }',
    P + '.np-cell.bx-r { border-right: 3px solid var(--np-ink); }',
    P + '.np-cell.bx-b { border-bottom: 3px solid var(--np-ink); }',
    P + '.np-cell.end-c { border-right: 0; }',
    P + '.np-cell.end-r { border-bottom: 0; }',
    P + '.np-cell:focus { outline: none; }',
    P + '.np-cell:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; z-index: 1; }',
    P + '.np-v { font-size: calc(100cqi / var(--n) * .6); line-height: 1; font-family: var(--np-serif); }',
    P + '.np-notes { position: absolute; inset: 1px; display: grid; grid-template-columns: repeat(var(--nc), 1fr); grid-template-rows: repeat(var(--nr), 1fr); pointer-events: none; font: 700 calc(100cqi / var(--n) * .25)/1 var(--np-sans); color: var(--np-soft); }',
    P + '.np-notes span { display: grid; place-items: center; }',
    P + '.np-cell.is-peer { background-color: var(--np-peer); }',
    P + '.np-cell.is-same { background-color: var(--np-same); }',
    P + '.np-cell.is-why { background-color: var(--np-why); box-shadow: inset 0 0 0 2px var(--np-hint); }',
    P + '.np-cell.is-sel { background-color: var(--np-sel); box-shadow: inset 0 0 0 3px var(--np-ink); }',
    P + '.np-cell.is-given .np-v { font-weight: 700; color: var(--np-ink); }',
    P + '.np-cell.is-user .np-v { font-weight: 400; color: var(--np-pen); }',
    /* A hinted number is green with a small green corner, so it is not shown by colour alone. */
    P + '.np-cell.is-hinted .np-v { color: var(--np-hint); }',
    P + '.np-cell.is-hinted::after { content: ""; position: absolute; top: 0; right: 0; border: 5px solid transparent; border-top-color: var(--np-hint); border-right-color: var(--np-hint); }',
    /* A clash is red, wavy-underlined and striped. */
    P + '.np-cell.is-clash { background-image: repeating-linear-gradient(135deg, rgba(192, 40, 45, .16) 0 4px, transparent 4px 8px); }',
    P + '.np-cell.is-clash .np-v { color: var(--np-clash); text-decoration: underline wavy var(--np-clash); text-decoration-thickness: 2px; text-underline-offset: 4px; }',
    P + '.np-cell.is-wrong { box-shadow: inset 0 0 0 3px var(--np-clash); }',
    P + '.np-v.pop { animation: np-pop .2s ease-out; }',
    '@keyframes np-pop { 0% { transform: scale(1.45); } 100% { transform: none; } }',
    /* the start card sits over the grid */
    P + '.np-overlay { z-index: 2; display: grid; place-items: center; padding: 8px; background: rgba(243, 239, 229, .86); }',
    P + '.np-card { width: min(100%, 26rem); display: grid; gap: .55rem; justify-items: center; text-align: center; padding: .9rem .9rem 1rem; background: var(--np-paper); border: 2px solid var(--np-ink); box-shadow: 5px 5px 0 var(--np-ink); }',
    P + '.np-card-title { font: 700 clamp(1.4rem, 1.1rem + 2cqi, 1.9rem)/1.1 var(--np-serif); }',
    P + '.np-card-msg { font-size: 1rem; line-height: 1.35; }',
    P + '.np-card-msg:empty { display: none; }',
    P + '.np-card-label { font: 700 .72rem/1 var(--np-sans); letter-spacing: .14em; text-transform: uppercase; color: var(--np-soft); margin-top: .15rem; }',
    P + '.np-card-about { font-size: .92rem; line-height: 1.35; color: var(--np-soft); font-style: italic; }',
    P + '.np-card-best { font: 700 .85rem/1.3 var(--np-sans); }',
    P + '.np-card-buttons { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }',
    P + '.np-big { min-height: 52px; font-size: 1.15rem; padding-inline: 1.6rem; }',
    /* keypad and tools */
    P + '.np-side { display: grid; gap: .75rem; align-content: start; }',
    P + '.np-pad { display: grid; grid-template-columns: repeat(var(--np-pc), minmax(0, 1fr)); gap: 6px; }',
    P + '.np-key { position: relative; min-height: 48px; min-width: 0; padding: 0; border: 2px solid var(--np-ink); border-radius: 8px; background: var(--np-white); color: var(--np-ink); font: 700 1.55rem/1 var(--np-serif); display: grid; place-items: center; touch-action: manipulation; -webkit-tap-highlight-color: transparent; box-shadow: 0 3px 0 var(--np-ink); }',
    P + '.np-key:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--np-ink); background: var(--np-sel); }',
    P + '.np-key.is-done { color: var(--np-thin); border-color: var(--np-thin); box-shadow: 0 3px 0 var(--np-thin); }',
    P + '.np-key.is-done::after { content: "✓"; position: absolute; top: 3px; right: 5px; font: 700 .75rem/1 var(--np-sans); color: var(--np-hint); }',
    P + '.np-key.np-erase { font: 700 .82rem/1.1 var(--np-sans); letter-spacing: .06em; text-transform: uppercase; }',
    P + '.np-pad.is-notes .np-key:not(.np-erase) { font: 700 1rem/1 var(--np-sans); color: var(--np-soft); place-items: start; padding: 5px 7px; }',
    P + '.np-tools { display: flex; flex-wrap: wrap; gap: .45rem; }',
    P + '.np-tools .btn { flex: 1 1 auto; padding-inline: .7rem; min-height: 44px; }',
    P + '.np-tools .btn[aria-pressed="true"] { background: var(--np-ink); color: var(--np-white); }',
    P + '.np-hint { padding: .55rem .75rem; border: 1px solid var(--np-ink); border-left: 6px solid var(--np-hint); background: var(--np-white); font-size: .98rem; line-height: 1.4; }',
    P + '.np-hint:empty { display: none; }',
    P + '.np-hint b { font-family: var(--np-sans); text-transform: uppercase; letter-spacing: .08em; font-size: .8rem; margin-right: .3rem; }',
    P + '.np-foot { margin-top: .9rem; padding-top: .45rem; border-top: 1px solid var(--np-ink); font-size: .9rem; color: var(--np-soft); line-height: 1.4; }',
    '.classroom ' + P + '.np-grid { max-width: min(100%, 72vh); }',
    '@media (max-width: 420px) { ' + P + '.np-sheet .seg button { padding-inline: .55rem; } ' + P + '.np-tools .btn { padding-inline: .5rem; font-size: .95rem; } }',
    '@media (prefers-reduced-motion: reduce) { ' + P + '.np-v.pop { animation: none; } ' + P + '.np-key:active { transform: none; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'number-place',
    frame: 'none',
    mount: function (root, api) {
      var h = api.h;
      var RM = !!api.reducedMotion;
      var destroyed = false;
      var timers = [];

      /* ---------- remembered settings ---------- */
      var settings = { n: Number(api.store.get('size', 9)), level: Number(api.store.get('level', 1)), check: api.store.get('check', true) !== false };
      if (!MAX_LEVEL[settings.n]) settings.n = 9;
      if (!(settings.level >= 1 && settings.level <= MAX_LEVEL[settings.n])) settings.level = 1;
      var best = api.store.get('best', {});
      if (!best || typeof best !== 'object') best = {};

      /* ---------- the game in progress ---------- */
      var game = null;        // { n, level, puzzle, solution, values, notes, hinted, elapsed, hints, number, done }
      var S = null;           // the shape of the current puzzle
      var sel = -1;           // the selected square
      var notesMode = false;
      var undoStack = [];
      var why = { cells: [], wrong: -1 };   // squares a hint wants you to look at
      var popCell = -1;
      var runningSince = 0, running = false, tick = 0, whyTimer = 0;

      root.appendChild(h('style', null, CSS));

      /* ---------- the page ---------- */
      var numberEl = h('span', null, 'No. ----');
      var levelEl = h('span', null, 'Choose a puzzle');
      var timeEl = h('b', null, '0:00');
      var bestEl = h('span', null, '');
      var masthead = h('div', { class: 'np-mast' },
        h('div', { class: 'np-kicker' }, h('span', null, 'The puzzle page'), numberEl),
        h('div', { class: 'np-title' }, 'Number Place'),
        h('p', { class: 'np-dek' }, 'Fill every row, every column and every box with each number once.'),
        h('div', { class: 'np-meta' }, levelEl, h('span', null, 'Time ', timeEl), bestEl));

      var grid = h('div', { class: 'np-grid', role: 'grid', 'aria-label': 'Number Place grid' });
      var cells = [], valueEls = [], noteEls = [], baseCls = [];   /* baseCls: each square's own lines (box edges) */

      var cardTitle = h('p', { class: 'np-card-title' }, 'Choose your puzzle');
      var cardMsg = h('p', { class: 'np-card-msg' });
      var sizeBtns = {}, levelBtns = {};
      var sizeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Size' }, [4, 6, 9].map(function (n) {
        sizeBtns[n] = h('button', { type: 'button', 'aria-label': SIZE_NAME[n], onclick: function () { chooseSize(n); } }, n + '×' + n);
        return sizeBtns[n];
      }));
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Level' }, [1, 2, 3].map(function (lv) {
        levelBtns[lv] = h('button', { type: 'button', onclick: function () { chooseLevel(lv); } }, LEVELS[lv].name);
        return levelBtns[lv];
      }));
      var aboutEl = h('p', { class: 'np-card-about' });
      var cardBest = h('p', { class: 'np-card-best' });
      var startBtn = h('button', { class: 'btn btn-primary np-big', type: 'button', onclick: function () { startNew(); } }, 'Start puzzle');
      var resumeBtn = h('button', { class: 'btn np-big', type: 'button', hidden: true, onclick: function () { resume(); } }, 'Back to my puzzle');
      var card = h('div', { class: 'np-card', role: 'group', 'aria-label': 'Choose your puzzle' },
        cardTitle, cardMsg,
        h('p', { class: 'np-card-label' }, 'Size'), sizeSeg,
        h('p', { class: 'np-card-label' }, 'Level'), levelSeg,
        aboutEl, cardBest,
        h('div', { class: 'np-card-buttons' }, startBtn, resumeBtn));
      var overlay = h('div', { class: 'np-overlay' }, card);
      var boardWrap = h('div', { class: 'np-boardwrap' }, grid, overlay);

      var pad = h('div', { class: 'np-pad', role: 'group', 'aria-label': 'Number keys' });
      var padKeys = [];
      var notesBtn = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false', onclick: function () { setNotes(!notesMode); } }, 'Notes');
      var undoBtn = h('button', { class: 'btn', type: 'button', onclick: function () { undo(); } }, 'Undo');
      var hintBtn = h('button', { class: 'btn', type: 'button', onclick: function () { hint(); } }, 'Hint');
      var checkBtn = h('button', { class: 'btn', type: 'button', 'aria-pressed': String(settings.check), title: 'Show numbers that clash', onclick: function () { setCheck(!settings.check); } }, 'Clashes');
      var newBtn = h('button', { class: 'btn', type: 'button', onclick: function () { openCard('new'); } }, 'New puzzle');
      var hintEl = h('p', { class: 'np-hint' });
      var side = h('div', { class: 'np-side' }, pad, h('div', { class: 'np-tools' }, notesBtn, undoBtn, hintBtn, checkBtn, newBtn), hintEl);
      var foot = h('p', { class: 'np-foot' }, 'Tap a square, then a number. Keyboard: arrows move, 1 to 9 write, Backspace rubs out, N switches notes on and off, Shift and a number writes a note, U undoes, H gives a hint.');

      var sheet = h('div', { class: 'np-sheet' }, masthead, h('div', { class: 'np-body' }, boardWrap, side), foot);
      root.appendChild(sheet);

      /* ---------- small helpers ---------- */
      function later(fn, ms) { var t = setTimeout(function () { timers.splice(timers.indexOf(t), 1); if (!destroyed) fn(); }, ms); timers.push(t); return t; }
      var lastStatus = '';
      function say(text) { if (text !== lastStatus) { lastStatus = text; api.status(text); } }
      function elapsed() { return game ? game.elapsed + (running ? performance.now() - runningSince : 0) : 0; }
      function startClock() {
        if (running || !game || game.done) return;
        running = true; runningSince = performance.now();
        clearInterval(tick); tick = setInterval(showTime, 500);
      }
      function stopClock() {
        if (!running) return;
        game.elapsed += performance.now() - runningSince; running = false;
        clearInterval(tick); tick = 0; showTime();
      }
      function showTime() { timeEl.textContent = fmt(elapsed() / 1000); }
      function bestKey(n, lv) { return n + '-' + lv; }
      function bestText(n, lv) { var b = best[bestKey(n, lv)]; return b ? 'Best ' + fmt(b) : 'No best time yet'; }
      function emptyCount() { var c = 0; for (var i = 0; i < game.values.length; i++) if (!game.values[i]) c++; return c; }
      function progressText() { var left = emptyCount(); return LEVELS[game.level].name + ' ' + SIZE_NAME[game.n] + ' · ' + (left === 1 ? '1 square to go' : left + ' squares to go'); }

      /* ---------- building the grid and the keypad for a size ---------- */
      function build(n) {
        S = shape(n);
        grid.style.setProperty('--n', n);
        grid.style.setProperty('--nc', n === 4 ? 2 : 3);
        grid.style.setProperty('--nr', n === 9 ? 3 : 2);
        grid.replaceChildren();
        cells = []; valueEls = []; noteEls = []; baseCls = [];
        for (var r = 0; r < n; r++) {
          var row = h('div', { class: 'np-row', role: 'row' });
          for (var c = 0; c < n; c++) {
            var i = r * n + c, cls = 'np-cell';
            if (c === n - 1) cls += ' end-c'; else if ((c + 1) % S.bc === 0) cls += ' bx-r';
            if (r === n - 1) cls += ' end-r'; else if ((r + 1) % S.br === 0) cls += ' bx-b';
            var v = h('span', { class: 'np-v', 'aria-hidden': 'true' });
            var notes = h('span', { class: 'np-notes', 'aria-hidden': 'true' });
            for (var d = 1; d <= n; d++) notes.appendChild(h('span'));
            var cell = h('div', { class: cls, role: 'gridcell', tabindex: '-1', 'data-i': String(i) }, v, notes);
            cells.push(cell); valueEls.push(v); noteEls.push(notes); baseCls.push(cls);
            row.appendChild(cell);
          }
          grid.appendChild(row);
        }
        pad.replaceChildren();
        padKeys = [];
        pad.style.setProperty('--np-pc', Math.ceil((n + 1) / 2));
        for (var k = 1; k <= n; k++) {
          (function (d) {
            var key = h('button', { class: 'np-key', type: 'button', onclick: function () { enter(d, false); } }, String(d));
            padKeys.push(key); pad.appendChild(key);
          })(k);
        }
        pad.appendChild(h('button', { class: 'np-key np-erase', type: 'button', 'aria-label': 'Rub out', onclick: function () { erase(); } }, 'Rub out'));
      }

      grid.addEventListener('click', function (e) {
        var cell = e.target.closest ? e.target.closest('.np-cell') : null;
        if (!cell || !game) return;
        select(Number(cell.getAttribute('data-i')), true);
        api.sound('tick');
      });

      /* ---------- drawing the state onto the grid ---------- */
      function clashes() {
        var out = [];
        for (var i = 0; i < S.size; i++) {
          out[i] = false;
          if (!game.values[i]) continue;
          var p = S.peers[i];
          for (var k = 0; k < p.length; k++) if (game.values[p[k]] === game.values[i]) { out[i] = true; break; }
        }
        return out;
      }
      function render() {
        if (!game) return;
        var n = game.n, selV = sel >= 0 ? game.values[sel] : 0;
        var clash = settings.check ? clashes() : null;
        var counts = [];
        for (var d = 0; d <= n; d++) counts[d] = 0;
        for (var i = 0; i < S.size; i++) {
          var v = game.values[i], cell = cells[i], cls = baseCls[i];
          counts[v]++;
          if (game.puzzle[i]) cls += ' is-given'; else if (v) cls += ' is-user';
          if (v && game.hinted[i]) cls += ' is-hinted';
          if (i === sel) cls += ' is-sel';
          else if (selV && v === selV) cls += ' is-same';
          else if (why.cells.indexOf(i) >= 0) cls += ' is-why';
          else if (sel >= 0 && (S.rowOf[i] === S.rowOf[sel] || S.colOf[i] === S.colOf[sel] || S.boxOf[i] === S.boxOf[sel])) cls += ' is-peer';
          if (clash && clash[i]) cls += ' is-clash';
          if (i === why.wrong) cls += ' is-wrong';
          if (cell.className !== cls) cell.className = cls;
          valueEls[i].textContent = v ? String(v) : '';
          if (i === popCell && !RM) { valueEls[i].classList.remove('pop'); void valueEls[i].offsetWidth; valueEls[i].classList.add('pop'); }
          var spans = noteEls[i].children, m = v ? 0 : game.notes[i];
          for (var k = 0; k < n; k++) spans[k].textContent = (m & (1 << k)) ? String(k + 1) : '';
          var label = 'Row ' + (S.rowOf[i] + 1) + ', column ' + (S.colOf[i] + 1) + ': ';
          if (game.puzzle[i]) label += v + ', printed';
          else if (v) label += v + (game.hinted[i] ? ', from a hint' : '') + (clash && clash[i] ? ', clashes' : '');
          else if (m) label += 'empty, notes ' + digitsOf(m).join(' ');
          else label += 'empty';
          cell.setAttribute('aria-label', label);
          cell.setAttribute('aria-selected', String(i === sel));
          cell.tabIndex = i === (sel >= 0 ? sel : 0) ? 0 : -1;
        }
        popCell = -1;
        for (var q = 0; q < padKeys.length; q++) {
          var done = counts[q + 1] >= n;
          padKeys[q].classList.toggle('is-done', done);
          padKeys[q].setAttribute('aria-label', (notesMode ? 'Note ' : 'Write ') + (q + 1) + (done ? ', all placed' : ''));
        }
        pad.classList.toggle('is-notes', notesMode);
        undoBtn.disabled = !undoStack.length || game.done;
        hintBtn.disabled = game.done;
        grid.setAttribute('data-puzzle', game.puzzle.join(''));
        grid.setAttribute('data-n', String(game.n));
        grid.setAttribute('data-level', String(game.level));
        grid.setAttribute('aria-label', 'Number Place, ' + LEVELS[game.level].name + ' ' + SIZE_NAME[game.n] + '. ' + emptyCount() + ' empty squares.');
      }

      function select(i, focus) {
        if (!game || i < 0 || i >= S.size) return;
        sel = i;
        render();
        if (focus) cells[i].focus({ preventScroll: true });
      }
      function setNotes(on) {
        notesMode = on;
        notesBtn.setAttribute('aria-pressed', String(on));
        notesBtn.textContent = on ? 'Notes: on' : 'Notes';
        api.sound('click');
        if (game) { render(); say(on ? 'Notes on. Numbers you type are pencilled in small.' : progressText()); }
      }
      function setCheck(on) {
        settings.check = on;
        api.store.set('check', on);
        checkBtn.setAttribute('aria-pressed', String(on));
        api.sound('click');
        if (game) { render(); say(on ? 'Clashing numbers are now shown in red with a wavy line.' : 'Clashes are hidden. You are on your own.'); }
      }
      function clearWhy() { why.cells = []; why.wrong = -1; clearTimeout(whyTimer); }

      /* ---------- undo: a snapshot of the numbers and notes before each change ---------- */
      function snapshot() {
        undoStack.push({ values: game.values.slice(), notes: game.notes.slice(), hinted: game.hinted.slice() });
        if (undoStack.length > 300) undoStack.shift();
      }
      function undo() {
        if (!game || game.done || !undoStack.length) return;
        var s = undoStack.pop();
        game.values = s.values; game.notes = s.notes; game.hinted = s.hinted;
        clearWhy();
        api.sound('flip');
        render(); save();
        say('Undone. ' + progressText());
      }

      /* ---------- writing numbers ---------- */
      function enter(d, asNote) {
        if (!game || game.done) return;
        if (sel < 0) { say('Pick a square first.'); return; }
        if (game.puzzle[sel]) { api.sound('tick'); say('That ' + game.puzzle[sel] + ' was printed in the puzzle, so it stays.'); return; }
        clearWhy();
        if (asNote || notesMode) {
          if (game.values[sel]) { say('Rub out the number first, then pencil in notes.'); api.sound('tick'); return; }
          snapshot();
          game.notes[sel] ^= 1 << (d - 1);
          api.sound('chalk');
          render(); save();
          return;
        }
        if (game.values[sel] === d) return;
        snapshot();
        game.values[sel] = d; game.notes[sel] = 0; game.hinted[sel] = 0;
        /* tidy up: the same number cannot be a note anywhere else in this row, column or box */
        var p = S.peers[sel];
        for (var k = 0; k < p.length; k++) game.notes[p[k]] &= ~(1 << (d - 1));
        popCell = sel;
        render(); save();
        var clash = settings.check ? clashWith(sel) : '';
        if (clash) { api.sound('wrong'); say('That ' + d + ' clashes with another ' + d + ' in the same ' + clash + '.'); }
        else { api.sound('click'); say(progressText()); }
        checkFinished();
      }
      function clashWith(i) {
        var v = game.values[i];
        for (var u = 0; u < 3; u++) {
          var unit = S.units[[S.rowOf[i], S.n + S.colOf[i], 2 * S.n + S.boxOf[i]][u]];
          for (var k = 0; k < unit.cells.length; k++) if (unit.cells[k] !== i && game.values[unit.cells[k]] === v) return unit.kind;
        }
        return '';
      }
      function erase() {
        if (!game || game.done || sel < 0) return;
        if (game.puzzle[sel]) { api.sound('tick'); say('Printed numbers cannot be rubbed out.'); return; }
        if (!game.values[sel] && !game.notes[sel]) return;
        snapshot();
        if (game.values[sel]) { game.values[sel] = 0; game.hinted[sel] = 0; } else game.notes[sel] = 0;
        clearWhy();
        api.sound('chalk');
        render(); save();
        say(progressText());
      }
      function checkFinished() {
        if (emptyCount()) return;
        for (var i = 0; i < S.size; i++) {
          if (game.values[i] !== game.solution[i]) {
            say('Every square is full, but some numbers are not right yet. ' + (settings.check ? 'Look for red clashes, or ask for a hint.' : 'Switch on Clashes, or ask for a hint.'));
            return;
          }
        }
        win();
      }

      /* ---------- hints: the computer finds the easiest next step a person could take, and explains it ---------- */
      function hint() {
        if (!game || game.done) return;
        clearWhy();
        game.hints++;
        /* First, any number that is not right gets pointed out, because every later step depends on it. */
        for (var i = 0; i < S.size; i++) {
          if (!game.puzzle[i] && game.values[i] && game.values[i] !== game.solution[i]) {
            why.wrong = i;
            sel = i;
            showHint('This ' + game.values[i] + ' is not right. Rub it out and think again.');   /* "This 8" reads fine, so no "an" here */
            api.sound('wrong');
            render(); save();
            cells[i].focus({ preventScroll: true });
            whyTimer = later(function () { why.wrong = -1; render(); }, 6000);
            return;
          }
        }
        var st = new State(game.values, S), before = [], single = findNakedSingle(st) || findHiddenSingle(st);
        while (!single && before.length < 40) {
          var e = findLocked(st) || findPair(st);
          if (!e) break;
          before.push(e);
          single = findNakedSingle(st) || findHiddenSingle(st);
        }
        var text;
        if (single) {
          var last = before[before.length - 1];
          text = before.length ? 'Tricky one. ' + (before.length > 1 ? 'You need to cross a few numbers out first. Here is the key one. ' : '') + elimText(S, last) + ' ' + singleText(S, single, 'That means this square', true) : singleText(S, single, 'This square', false);
          why.cells = single.unit ? single.unit.cells.slice() : [];
          if (last) why.cells = why.cells.concat(last.cells);
          place(single.cell, single.digit);
        } else {
          /* Should never happen with our puzzles, but just in case: fill the selected (or first) empty square. */
          var j = sel >= 0 && !game.values[sel] ? sel : game.values.indexOf(0);
          text = 'Here is a number to get you going.';
          place(j, game.solution[j]);
        }
        showHint(text);
        api.sound('bell');
        whyTimer = later(function () { why.cells = []; render(); }, 7000);
        checkFinished();
      }
      function place(i, d) {
        snapshot();
        game.values[i] = d; game.notes[i] = 0; game.hinted[i] = 1;
        var p = S.peers[i];
        for (var k = 0; k < p.length; k++) game.notes[p[k]] &= ~(1 << (d - 1));
        sel = i; popCell = i;
        render(); save();
        cells[i].focus({ preventScroll: true });
      }
      function showHint(text) {
        hintEl.replaceChildren(h('b', null, 'Hint'), text);
        say('Hint: ' + text);
      }

      /* ---------- starting, pausing and finishing ---------- */
      function updateCard() {
        [4, 6, 9].forEach(function (n) { sizeBtns[n].setAttribute('aria-pressed', String(n === settings.n)); });
        [1, 2, 3].forEach(function (lv) {
          var ok = lv <= MAX_LEVEL[settings.n];
          levelBtns[lv].disabled = !ok;
          levelBtns[lv].setAttribute('aria-pressed', String(lv === settings.level));
          levelBtns[lv].title = ok ? '' : SIZE_NAME[settings.n] + ' puzzles only go up to ' + LEVELS[MAX_LEVEL[settings.n]].name;
        });
        aboutEl.textContent = LEVELS[settings.level].about + (settings.n === 4 ? ' Every 4 by 4 puzzle is Easy.' : settings.n === 6 && settings.level === 2 ? ' 6 by 6 goes up to Medium.' : '');
        var b = best[bestKey(settings.n, settings.level)];
        cardBest.textContent = SIZE_NAME[settings.n] + ', ' + LEVELS[settings.level].name + ': ' + (b ? 'best time ' + fmt(b) : 'no best time yet');
      }
      function chooseSize(n) {
        settings.n = n;
        if (settings.level > MAX_LEVEL[n]) settings.level = MAX_LEVEL[n];
        api.store.set('size', n); api.store.set('level', settings.level);
        api.sound('click');
        updateCard();
      }
      function chooseLevel(lv) {
        if (lv > MAX_LEVEL[settings.n]) return;
        settings.level = lv;
        api.store.set('level', lv);
        api.sound('click');
        updateCard();
      }
      function openCard(mode, title, msg) {
        if (game && !game.done) stopClock();
        cardTitle.textContent = title || (mode === 'new' ? 'A new puzzle?' : 'Choose your puzzle');
        cardMsg.textContent = msg || '';
        resumeBtn.hidden = !(game && !game.done);
        resumeBtn.textContent = mode === 'saved' ? 'Carry on with my puzzle' : 'Back to my puzzle';
        startBtn.textContent = game && game.done ? 'Next puzzle' : 'Start puzzle';
        startBtn.disabled = false;
        overlay.hidden = false;
        updateCard();
        if (mode !== 'first') (resumeBtn.hidden ? startBtn : resumeBtn).focus({ preventScroll: true });
        if (game && !game.done) say('Paused. Carry on with your puzzle, or start a new one.');
        else if (!game) say('Choose a size and a level, then press Start puzzle.');
      }
      function resume() {
        if (!game || game.done) return;
        overlay.hidden = true;
        api.sound('flip');
        startClock();
        render();
        select(sel >= 0 ? sel : Math.max(0, game.values.indexOf(0)), true);
        say(progressText());
      }
      function startNew() {
        startBtn.disabled = true;
        say('Setting your puzzle...');
        api.sound('shuffle');
        /* a short wait so the message shows before the computer gets busy */
        later(function () {
          var p = generate(settings.n, settings.level, api.random);
          var S2 = shape(settings.n);
          while (countSolutions(p.puzzle, S2, 2) !== 1) p = generate(settings.n, settings.level, api.random);   /* belt and braces */
          stopClock();
          game = {
            n: p.n, level: p.level, puzzle: p.puzzle, solution: p.solution, values: p.puzzle.slice(),
            notes: zeros(S2.size), hinted: zeros(S2.size), elapsed: 0, hints: 0, number: puzzleNumber(p.puzzle), done: false
          };
          begin();
          api.sound('flip');
          say('New ' + LEVELS[game.level].name + ' puzzle. ' + progressText().split(' · ')[1] + '.');
        }, 40);
      }
      /* Shows a game (new or saved) on the grid and starts the clock. */
      function begin() {
        build(game.n);
        undoStack = [];
        clearWhy();
        hintEl.replaceChildren();
        notesMode = false; notesBtn.setAttribute('aria-pressed', 'false'); notesBtn.textContent = 'Notes';
        numberEl.textContent = 'No. ' + game.number;
        levelEl.textContent = LEVELS[game.level].name + ' ' + LEVELS[game.level].stars;
        bestEl.textContent = bestText(game.n, game.level);
        overlay.hidden = true;
        sel = game.values.indexOf(0);
        save();
        startClock();
        showTime();
        select(sel, true);
      }
      function win() {
        stopClock();
        game.done = true;
        var secs = Math.round(game.elapsed / 1000), key = bestKey(game.n, game.level), prev = best[key], newBest = false;
        if (!game.hints && (!prev || secs < prev)) { best[key] = secs; api.store.set('best', best); newBest = true; }
        api.store.set('current', null);
        bestEl.textContent = bestText(game.n, game.level);
        sel = -1; clearWhy();
        hintEl.replaceChildren();
        render();
        var msg = 'Solved in ' + fmt(secs) + (game.hints ? ' with ' + game.hints + (game.hints === 1 ? ' hint' : ' hints') + '. Solve one with no hints to set a best time.' : newBest ? '. That is your new best time!' : '. Your best is ' + fmt(prev) + '.');
        api.celebrate(newBest ? 'New best time: ' + fmt(secs) : 'Solved in ' + fmt(secs) + '!');
        say('Solved! ' + msg);
        later(function () { openCard('done', 'Solved!', msg); }, RM ? 600 : 1600);
      }
      function save() {
        if (!game || game.done) return;
        api.store.set('current', { n: game.n, level: game.level, puzzle: game.puzzle, solution: game.solution, values: game.values, notes: game.notes, hinted: game.hinted, elapsed: Math.round(elapsed()), hints: game.hints, number: game.number });
      }
      function loadSaved() {
        var s = api.store.get('current', null);
        if (!s || !MAX_LEVEL[s.n] || !s.puzzle || s.puzzle.length !== s.n * s.n || !s.solution || s.solution.length !== s.n * s.n) return null;
        var size = s.n * s.n;
        function arr(a) { return a && a.length === size ? a.map(function (x) { return Number(x) || 0; }) : zeros(size); }
        return { n: s.n, level: s.level, puzzle: arr(s.puzzle), solution: arr(s.solution), values: arr(s.values), notes: arr(s.notes), hinted: arr(s.hinted), elapsed: Number(s.elapsed) || 0, hints: Number(s.hints) || 0, number: s.number || puzzleNumber(s.puzzle), done: false };
      }

      /* ---------- keyboard ---------- */
      root.addEventListener('keydown', function (e) {
        if (!game || game.done || !overlay.hidden) return;
        var key = e.key, inGrid = grid.contains(e.target);
        if ((e.ctrlKey || e.metaKey) && (key === 'z' || key === 'Z')) { e.preventDefault(); undo(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        var r = sel >= 0 ? S.rowOf[sel] : 0, c = sel >= 0 ? S.colOf[sel] : 0, n = game.n;
        if (/^Arrow/.test(key) && inGrid) {
          e.preventDefault();
          if (key === 'ArrowUp') r = Math.max(0, r - 1);
          else if (key === 'ArrowDown') r = Math.min(n - 1, r + 1);
          else if (key === 'ArrowLeft') c = Math.max(0, c - 1);
          else if (key === 'ArrowRight') c = Math.min(n - 1, c + 1);
          select(r * n + c, true);
          return;
        }
        var m = /^(Digit|Numpad)([1-9])$/.exec(e.code || '');
        var d = m ? Number(m[2]) : /^[1-9]$/.test(key) ? Number(key) : 0;
        if (d && d <= n) { e.preventDefault(); enter(d, e.shiftKey); return; }
        if (key === 'Backspace' || key === 'Delete' || key === '0') { e.preventDefault(); erase(); return; }
        if (key === 'n' || key === 'N') { e.preventDefault(); setNotes(!notesMode); return; }
        if (key === 'u' || key === 'U') { e.preventDefault(); undo(); return; }
        if (key === 'h' || key === 'H') { e.preventDefault(); hint(); return; }
      });

      /* ---------- the tab being hidden pauses the clock ---------- */
      function onVisibility() {
        if (!game || game.done) return;
        if (document.hidden) { stopClock(); save(); }
        else if (overlay.hidden) startClock();
      }
      document.addEventListener('visibilitychange', onVisibility);

      /* ---------- first paint ---------- */
      var saved = loadSaved();
      if (saved) {
        game = saved;
        build(game.n);
        numberEl.textContent = 'No. ' + game.number;
        levelEl.textContent = LEVELS[game.level].name + ' ' + LEVELS[game.level].stars;
        bestEl.textContent = bestText(game.n, game.level);
        sel = game.values.indexOf(0);
        render(); showTime();
        openCard('saved', 'Welcome back', 'Your ' + LEVELS[game.level].name + ' ' + SIZE_NAME[game.n] + ' puzzle is waiting, ' + fmt(game.elapsed / 1000) + ' on the clock.');
        say('Your puzzle is waiting. Carry on, or start a new one.');
      } else {
        /* An empty grid of the chosen size waits under the start card. */
        build(settings.n);
        openCard('first');
      }

      return {
        destroy: function () {
          destroyed = true;
          if (game && !game.done) { stopClock(); save(); }
          clearInterval(tick);
          timers.forEach(clearTimeout); timers = [];
          clearTimeout(whyTimer);
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }
  });
})();
