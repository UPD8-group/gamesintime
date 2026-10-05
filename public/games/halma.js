/* Halma for Games in Time. Invented by George Howard Monks in Boston, 1883 to 1884.

   The rules played here are the original two-player rules:
   - The 1884 board is 16 by 16. Each player has 19 men in a corner "yard" (rows of 5, 5, 4, 3 and 2
     squares from the corner). The two yards are in opposite corners.
   - On your turn you move one man, in one of two ways (never both in one turn):
       a STEP to an empty square next to it, in any of the eight directions, or
       a HOP over a man next to it (yours or your rival's) onto the empty square straight beyond it.
       After a hop you may hop again with the same man, as often as you can and like. That is a chain.
   - Nothing is ever captured. Jumped men stay where they are.
   - Once a man has reached the far yard, it may not leave it again (it can still move inside). This one
     comes from modern summaries of the rules; the old rule books we found do not mention it either way.
   - The first player to fill every square of the far yard wins.
   - Site rule, no blocking (ours): men your rival leaves in their own starting yard cannot stop you.
     If every square of your far yard is full and at least one of the men there is yours, you win.
     Without this, a player could leave one man at home forever and nobody could ever win.
   - The quick board is ours too: 10 by 10, with 15 men in a triangle (rows of 5, 4, 3, 2 and 1), for
     small screens and short lessons. Every other rule is the same.

   How this file is organised:
     Part 1  The rules: boards, yards, every legal step and chain of hops, and the win check.
     Part 2  The computer player, explained in plain words.
     Part 3  The screen: the board, the men, dotted landing spots, hop-by-hop animation, sounds, keyboard.

   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  /* =====================================================================
     PART 1: THE RULES
     A board is an array of n * n numbers, row by row from the top: 0 empty, 1 Red, 2 Blue.
     Red starts in the bottom left yard and heads for the top right. Blue does the opposite.
     A move is { from, to, path: [every square it lands on], hops }.
     ===================================================================== */

  var EMPTY = 0, RED = 1, BLUE = 2;
  var DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

  /* a = rows from the corner, b = columns from the corner. */
  var BOARDS = {
    16: { n: 16, men: 19, yard: function (a, b) { return a <= 4 && b <= 4 && a + b <= 5; }, small: function (a, b) { return a <= 3 && b <= 3 && a + b <= 4; } },
    10: { n: 10, men: 15, yard: function (a, b) { return a + b <= 4; }, small: null }
  };

  function other(p) { return p === RED ? BLUE : RED; }

  /* Works out, for one board size, which squares belong to each yard. */
  function geometry(n) {
    var cfg = BOARDS[n], size = n * n, home = {}, small = [];
    home[RED] = []; home[BLUE] = [];
    for (var s = 0; s < size; s++) {
      var r = Math.floor(s / n), c = s % n;
      home[RED][s] = cfg.yard(n - 1 - r, c);
      home[BLUE][s] = cfg.yard(r, n - 1 - c);
      /* Printed Halma boards also mark a smaller 13-square yard in all four corners, for the four-player game. */
      small[s] = !!cfg.small && (cfg.small(r, c) || cfg.small(n - 1 - r, n - 1 - c) || cfg.small(n - 1 - r, c) || cfg.small(r, n - 1 - c));
    }
    var target = {};
    target[RED] = home[BLUE];
    target[BLUE] = home[RED];
    return { n: n, size: size, men: cfg.men, home: home, target: target, small: small };
  }

  function startBoard(g) {
    var b = [];
    for (var s = 0; s < g.size; s++) b.push(g.home[RED][s] ? RED : (g.home[BLUE][s] ? BLUE : EMPTY));
    return b;
  }

  /* Every legal move for the man on `from`: steps, then every square a chain of hops can reach.
     The chain search is a "breadth-first search": first every square one hop away, then every square
     two hops away, and so on, so each landing square comes with the shortest chain that reaches it. */
  function movesFrom(g, b, from) {
    var n = g.n, p = b[from], out = [], inTarget = g.target[p][from];
    var r0 = Math.floor(from / n), c0 = from % n, d, r, c, t;
    for (d = 0; d < 8; d++) {
      r = r0 + DIRS[d][0]; c = c0 + DIRS[d][1];
      if (r < 0 || r >= n || c < 0 || c >= n) continue;
      t = r * n + c;
      if (b[t] !== EMPTY) continue;
      if (inTarget && !g.target[p][t]) continue; /* a man in the far yard may not leave it */
      out.push({ from: from, to: t, path: [t], hops: 0 });
    }
    b[from] = EMPTY; /* the man is lifted while it hops, so it cannot hop over its own starting square */
    var parent = {}, queue = [from], order = [];
    parent[from] = -1;
    while (queue.length) {
      var at = queue.shift(), ra = Math.floor(at / n), ca = at % n;
      for (d = 0; d < 8; d++) {
        var rm = ra + DIRS[d][0], cm = ca + DIRS[d][1], rl = ra + 2 * DIRS[d][0], cl = ca + 2 * DIRS[d][1];
        if (rl < 0 || rl >= n || cl < 0 || cl >= n) continue;
        var land = rl * n + cl;
        if (b[rm * n + cm] === EMPTY || b[land] !== EMPTY || parent[land] !== undefined) continue;
        parent[land] = at;
        queue.push(land);
        order.push(land);
      }
    }
    b[from] = p;
    for (var i = 0; i < order.length; i++) {
      t = order[i];
      if (inTarget && !g.target[p][t]) continue;
      if (Math.abs(Math.floor(t / n) - r0) <= 1 && Math.abs(t % n - c0) <= 1) continue; /* a plain step does that */
      var path = [], x = t;
      while (x !== from) { path.unshift(x); x = parent[x]; }
      out.push({ from: from, to: t, path: path, hops: path.length });
    }
    return out;
  }

  function allMoves(g, b, p) {
    var out = [];
    for (var s = 0; s < g.size; s++) if (b[s] === p) out = out.concat(movesFrom(g, b, s));
    return out;
  }

  function play(b, m) {
    var nb = b.slice();
    nb[m.to] = nb[m.from];
    nb[m.from] = EMPTY;
    return nb;
  }

  /* The win check, with the site's no-blocking rule: the far yard is completely full and at least one
     man in it is yours. When your rival has left nobody behind, that simply means "all yours". */
  function hasWon(g, b, p) {
    var t = g.target[p], mine = 0;
    for (var s = 0; s < g.size; s++) {
      if (!t[s]) continue;
      if (b[s] === EMPTY) return false;
      if (b[s] === p) mine++;
    }
    return mine > 0;
  }

  function homeCount(g, b, p) {
    var k = 0;
    for (var s = 0; s < g.size; s++) if (g.target[p][s] && b[s] === p) k++;
    return k;
  }

  /* =====================================================================
     PART 2: THE COMPUTER PLAYER

     How the computer chooses a move, in plain words:

     1. It measures how far each of its men still has to go: the number of rows plus the number of
        columns between the man and the far corner. A man outside the far yard counts 2 extra, so
        getting inside the yard is worth something even when it does not get any closer to the corner.
        Add those up for every man and you get the total distance. Smaller is better.
     2. It lists every legal move: every step, and every square that a chain of hops can reach.
     3. It gives each move points for how much it shrinks the total distance. A chain of hops that
        jumps 9 squares across the board gets 9 points; a step backwards loses points.
     4. Bonus points:
        - for long chains of hops (they are what Halma is all about),
        - for moving a straggler, a man that is further behind than the others on average, so no man
          gets left behind,
        - for moving a man out of its own starting yard, so it never blocks you by accident.
     5. Hard looks one reply ahead. For its best few moves it imagines your best answer, scored the
        same way, and subtracts part of it. So it avoids building a ladder of men that you could hop
        along, and it notices when a move would let you finish.
     6. Easy works out the same scores, then picks one of its four best moves at random, so it
        sometimes misses a great chain.
     ===================================================================== */

  function dist(g, p, s) {
    var r = Math.floor(s / g.n), c = s % g.n;
    return p === RED ? r + (g.n - 1 - c) : (g.n - 1 - r) + c;
  }
  function value(g, p, s) { return dist(g, p, s) + (g.target[p][s] ? 0 : 2); }

  function averageValue(g, b, p) {
    var sum = 0, k = 0;
    for (var s = 0; s < g.size; s++) if (b[s] === p) { sum += value(g, p, s); k++; }
    return k ? sum / k : 0;
  }

  function scoreMove(g, p, m, avg) {
    var before = value(g, p, m.from), gain = before - value(g, p, m.to);
    var score = gain + 0.12 * m.hops;
    if (gain > 0) score += 0.25 * Math.max(0, before - avg);                       /* bring up the stragglers */
    if (g.home[p][m.from] && !g.home[p][m.to]) score += 0.8;                      /* leave your starting yard */
    if (g.target[p][m.from] && gain <= 0) score -= 0.5;                            /* no pointless shuffling at home */
    return score;
  }

  /* `last` is this player's previous move, so the computer does not just undo it. */
  function chooseMove(g, b, p, level, random, last) {
    var moves = allMoves(g, b, p);
    if (!moves.length) return null;
    var avg = averageValue(g, b, p), i;
    for (i = 0; i < moves.length; i++) {
      var m = moves[i];
      m.score = scoreMove(g, p, m, avg) + random() * 0.05;
      if (last && m.from === last.to && m.to === last.from) m.score -= 1.5;
      if (g.target[p][m.to] && !g.target[p][m.from] && hasWon(g, play(b, m), p)) m.score += 1000;
    }
    moves.sort(function (x, y) { return y.score - x.score; });
    if (level !== 'hard') {
      var pick = Math.min(4, moves.length);
      if (moves[0].score >= 1000) pick = 1; /* even Easy will not miss a winning move */
      return moves[Math.floor(random() * pick)];
    }
    var q = other(p), best = moves[0], bestTotal = -Infinity;
    var cands = moves.slice(0, 24);
    for (i = 0; i < cands.length; i++) {
      var mv = cands[i], total = mv.score;
      if (mv.score < 900) {
        var after = play(b, mv), replies = allMoves(g, after, q), qAvg = averageValue(g, after, q), worst = 0;
        for (var j = 0; j < replies.length; j++) {
          var rs = scoreMove(g, q, replies[j], qAvg);
          if (g.target[q][replies[j].to] && !g.target[q][replies[j].from] && hasWon(g, play(after, replies[j]), q)) rs = 1000;
          if (rs > worst) worst = rs;
        }
        total -= 0.6 * worst;
      }
      if (total > bestTotal) { bestTotal = total; best = mv; }
    }
    return best;
  }

  /* =====================================================================
     PART 3: THE SCREEN
     ===================================================================== */

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, String(attrs[k])); });
    return el;
  }

  var CSS = [
    /* A cream chromolithograph board with the 1880s hall's aniline colours: vermilion and ultramarine men. */
    '.game-halma { --hm-light: color-mix(in srgb, var(--ink) 95%, var(--gold)); --hm-dark: color-mix(in srgb, var(--ink) 84%, var(--gold));',
    '  --hm-line: color-mix(in srgb, var(--bg) 20%, transparent); --hm-heavy: var(--bg); --hm-mark: var(--bg);',
    '  --hm-red: var(--vermilion); --hm-red-dark: color-mix(in srgb, var(--vermilion) 55%, var(--bg)); --hm-red-head: color-mix(in srgb, var(--vermilion) 72%, var(--ink));',
    '  --hm-blue: var(--cobalt); --hm-blue-dark: color-mix(in srgb, var(--cobalt) 50%, var(--bg)); --hm-blue-head: color-mix(in srgb, var(--cobalt) 70%, var(--ink));',
    '  --hm-red-yard: color-mix(in srgb, var(--vermilion) 24%, var(--ink)); --hm-blue-yard: color-mix(in srgb, var(--cobalt) 26%, var(--ink));',
    '  --hm-shadow: color-mix(in srgb, var(--bg) 55%, transparent); --hm-shine: color-mix(in srgb, var(--ink) 65%, transparent); }',
    '.game-halma .seg button { padding-inline: .8rem; }',
    '.game-halma .hm-mirror { display: none; margin: 0 0 .5rem; text-align: center; font-family: var(--font-head); font-weight: 800; font-size: 1.05rem; line-height: 1.3; min-height: 2.6em; text-wrap: balance; }',
    '@media (max-width: 600px) { .game-halma .hm-mirror { display: block; } }',
    '.game-halma .hm-score { display: flex; flex-wrap: wrap; justify-content: center; gap: .5rem; margin: 0 0 .7rem; }',
    '.game-halma .hm-chip { display: inline-flex; align-items: center; gap: .45rem; padding: .3rem .8rem .3rem .4rem; border-radius: 999px; border: 2px solid var(--line); font-weight: 800; font-variant-numeric: tabular-nums; }',
    '.game-halma .hm-chip.is-turn { border-color: var(--gold); background: color-mix(in srgb, var(--gold) 14%, transparent); }',
    '.game-halma .hm-chip-man { width: 24px; height: 24px; position: relative; flex: none; }',
    '.game-halma .hm-chip-man .hm-base { inset: 0; }',
    '@media (max-width: 480px) { .game-halma .hm-chip { font-size: .92rem; } }',
    '.game-halma .hm-wrap { position: relative; width: min(100%, var(--hm-w, 640px)); margin-inline: auto; }',
    '.game-halma .hm-board { position: relative; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); grid-template-rows: repeat(var(--n), minmax(0, 1fr)); aspect-ratio: 1 / 1; max-width: none;',
    '  border: 6px solid var(--hm-heavy); border-radius: 6px; box-shadow: 0 0 0 2px var(--gold), 0 12px 28px var(--hm-shadow); background: var(--hm-light); user-select: none; -webkit-user-select: none; touch-action: manipulation; }',
    '.game-halma .hm-cell { position: relative; min-width: 0; background: var(--hm-light); box-shadow: inset -1px -1px 0 var(--hm-line); cursor: pointer; outline: none; }',
    '.game-halma .hm-cell.is-alt { background: var(--hm-dark); }',
    '.game-halma .hm-cell.is-red-yard { background: var(--hm-red-yard); }',
    '.game-halma .hm-cell.is-blue-yard { background: var(--hm-blue-yard); }',
    '.game-halma .hm-cell.is-red-yard.is-alt { background: color-mix(in srgb, var(--hm-red-yard) 88%, var(--vermilion)); }',
    '.game-halma .hm-cell.is-blue-yard.is-alt { background: color-mix(in srgb, var(--hm-blue-yard) 88%, var(--cobalt)); }',
    '.game-halma .hm-cell.is-last { box-shadow: inset 0 0 0 2px var(--hm-mark), inset -1px -1px 0 var(--hm-line); }',
    '.game-halma .hm-cell:focus-visible { box-shadow: inset 0 0 0 3px var(--hm-mark), inset 0 0 0 6px var(--gold); z-index: 3; }',
    /* Landing spots: a solid dot for a step, a dotted ring for the end of a chain of hops. */
    '.game-halma .hm-cell.is-step::after, .game-halma .hm-cell.is-hop::after { content: ""; position: absolute; border-radius: 50%; pointer-events: none; z-index: 4; }',
    '.game-halma .hm-cell.is-step::after { inset: 33%; background: var(--hm-mark); box-shadow: 0 0 0 2px var(--gold); }',
    '.game-halma .hm-cell.is-hop::after { inset: 16%; border: 3px dotted var(--hm-mark); background: color-mix(in srgb, var(--gold) 45%, transparent); animation: hm-beckon 1.2s ease-in-out infinite; }',
    '.game-halma .hm-cell.is-hop.is-preview::after { background: var(--gold); }',
    '@keyframes hm-beckon { 50% { transform: scale(1.14); } }',
    '.game-halma .hm-lines { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; overflow: visible; }',
    '.game-halma .hm-yard-line { stroke: var(--hm-heavy); stroke-linecap: square; fill: none; }',
    '.game-halma .hm-path { fill: none; stroke: var(--hm-mark); stroke-linecap: round; stroke-linejoin: round; }',
    '.game-halma .hm-path-spot { fill: var(--hm-light); stroke: var(--hm-mark); }',
    '.game-halma .hm-trail { fill: none; stroke-linecap: round; stroke-linejoin: round; opacity: .55; }',
    '.game-halma .hm-trail.is-red { stroke: var(--hm-red-dark); } .game-halma .hm-trail.is-blue { stroke: var(--hm-blue-dark); }',
    '.game-halma .hm-layer { position: absolute; inset: 0; pointer-events: none; z-index: 2; }',
    '.game-halma .hm-man { position: absolute; left: 0; top: 0; width: calc(100% / var(--n)); height: calc(100% / var(--n)); }',
    '.game-halma .hm-man.is-moving { z-index: 5; }',
    /* A Halma man seen from above: a round base with a raised head in the middle, and a shine. */
    '.game-halma .hm-base { position: absolute; inset: 10%; border-radius: 50%; transition: transform .15s ease; }',
    '.game-halma .is-red .hm-base { background: radial-gradient(circle at 50% 50%, var(--hm-red-head) 0 27%, var(--hm-red-dark) 29% 34%, transparent 36%), radial-gradient(circle at 34% 28%, var(--hm-shine) 0, transparent 46%), var(--hm-red); border: 2px solid var(--hm-red-dark); box-shadow: 0 2px 3px var(--hm-shadow); }',
    '.game-halma .is-blue .hm-base { background: radial-gradient(circle at 50% 50%, var(--hm-blue-head) 0 27%, var(--hm-blue-dark) 29% 34%, transparent 36%), radial-gradient(circle at 34% 28%, var(--hm-shine) 0, transparent 46%), var(--hm-blue); border: 2px solid var(--hm-blue-dark); box-shadow: 0 2px 3px var(--hm-shadow); }',
    '.game-halma .hm-man.is-sel .hm-base { transform: translateY(-9%) scale(1.12); outline: 3px solid var(--hm-mark); outline-offset: 1px; box-shadow: 0 0 0 5px var(--gold), 0 6px 8px var(--hm-shadow); }',
    '.game-halma .hm-man.is-done .hm-base::after { content: ""; position: absolute; inset: 38%; border-radius: 50%; background: var(--gold); }',
    /* On phones the board borrows the panel padding, so the quick board's squares stay about 30 px wide at 360 px. */
    '@media (max-width: 480px) { .game-halma .hm-wrap { width: calc(100% + 2 * clamp(12px, 2.6vw, 26px)); margin-inline: calc(-1 * clamp(12px, 2.6vw, 26px)); } .game-halma .hm-board { border-width: 2px; border-radius: 4px; } }',
    '.game-halma .hm-banner { position: absolute; inset: 0; z-index: 8; display: grid; place-items: center; pointer-events: none; }',
    '.game-halma .hm-banner-card { pointer-events: auto; text-align: center; padding: 1rem 1.4rem 1.2rem; border-radius: 18px; background: color-mix(in srgb, var(--surface) 94%, transparent); color: var(--ink); border: 2px solid var(--gold); box-shadow: 0 14px 40px var(--hm-shadow); max-width: 86%; animation: hm-banner .45s cubic-bezier(.2, 1.4, .4, 1) both; }',
    '.game-halma .hm-banner-title { font-family: var(--font-poster); font-size: clamp(1.9rem, 1.2rem + 3vw, 3rem); line-height: 1.05; color: var(--gold); margin: 0 0 .4rem; }',
    '.game-halma .hm-banner-text { margin: 0 0 .8rem; font-weight: 600; }',
    '@keyframes hm-banner { 0% { transform: scale(.6); opacity: 0; } 100% { transform: none; opacity: 1; } }',
    '.game-halma .hm-foot { display: flex; flex-wrap: wrap; justify-content: center; gap: .3rem 1.2rem; margin-top: .9rem; font-size: .95rem; color: var(--ink-muted); text-align: center; }',
    '.game-halma .hm-foot strong { color: var(--ink); }',
    '.classroom .game-halma .hm-wrap { width: min(100%, 76vh); }',
    '@media (prefers-reduced-motion: reduce) { .game-halma .hm-cell.is-hop::after, .game-halma .hm-banner-card { animation: none; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'halma',
    frame: 'table',
    mount: function (root, api) {
      var h = api.h;
      root.appendChild(h('style', null, CSS));

      var destroyed = false, timers = [];
      function later(fn, ms) {
        var id = setTimeout(function () {
          var k = timers.indexOf(id);
          if (k >= 0) timers.splice(k, 1);
          if (!destroyed) fn();
        }, ms);
        timers.push(id);
        return id;
      }
      function stopTimers() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers = []; }

      var RM = !!api.reducedMotion;
      var THINK_MS = RM ? 0 : 350, STEP_MS = RM ? 0 : 220, HOP_MS = RM ? 0 : 250;

      /* ----- settings, remembered between visits ----- */
      var mode = api.store.get('mode', 'computer') === 'two' ? 'two' : 'computer';
      var level = api.store.get('level', 'easy') === 'hard' ? 'hard' : 'easy';
      /* The 16 by 16 board needs about 520 px to keep its squares at least 30 px wide. If nobody has
         chosen yet, wide screens get the 1884 board and narrow screens the quick board. */
      var size = api.store.get('board', 0);
      if (size !== 16 && size !== 10) size = (root.clientWidth || window.innerWidth) >= 520 ? 16 : 10;
      var best = api.store.get('best', null);
      if (!best || typeof best !== 'object') best = {};

      /* ----- game state ----- */
      var g, board, turn, over, sel = -1, busy = false, moves = [], lastMove = null, lastBy = {}, turns, cursor = 0, preview = null;
      var manEls = {};

      /* ----- controls ----- */
      var modeBtns = {}, levelBtns = {};
      var modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Who plays' },
        modeBtns.computer = h('button', { type: 'button', onclick: function () { setMode('computer'); } }, 'vs computer'),
        modeBtns.two = h('button', { type: 'button', onclick: function () { setMode('two'); } }, '2 players'));
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' },
        levelBtns.easy = h('button', { type: 'button', onclick: function () { setLevel('easy'); } }, 'Easy'),
        levelBtns.hard = h('button', { type: 'button', onclick: function () { setLevel('hard'); } }, 'Hard'));
      var sizeSel = h('select', { id: 'hm-board', onchange: function () { setSize(Number(sizeSel.value)); } },
        h('option', { value: '10' }, 'Quick, 10 by 10'),
        h('option', { value: '16' }, '1884, 16 by 16'));
      var sizeField = h('label', { class: 'field', for: 'hm-board' }, 'Board', sizeSel);
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(); } }, 'New game');
      root.appendChild(h('div', { class: 'game-toolbar' }, modeSeg, levelSeg, sizeField, newBtn));

      var mirror = h('p', { class: 'hm-mirror', 'aria-hidden': 'true' });
      root.appendChild(mirror);
      var chips = {};
      function chip(p) {
        var c = { text: h('span') };
        c.el = h('span', { class: 'hm-chip' }, h('span', { class: 'hm-chip-man ' + (p === RED ? 'is-red' : 'is-blue'), 'aria-hidden': 'true' }, h('span', { class: 'hm-base' })), c.text);
        return c;
      }
      chips[RED] = chip(RED); chips[BLUE] = chip(BLUE);
      root.appendChild(h('div', { class: 'hm-score', 'aria-live': 'off' }, chips[RED].el, chips[BLUE].el));

      var boardEl = h('div', { class: 'hm-board board', role: 'group', onkeydown: onKey, onclick: onBoardClick, onpointerover: onHover, onpointerleave: function () { setPreview(null); } });
      var lines = svg('svg', { class: 'hm-lines', 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'none' });
      var layer = h('div', { class: 'hm-layer', 'aria-hidden': 'true' });
      var banner = h('div', { class: 'hm-banner', hidden: true });
      var wrap = h('div', { class: 'hm-wrap' }, boardEl, banner);
      root.appendChild(wrap);
      var footEl = h('p', { class: 'hm-foot' });
      root.appendChild(footEl);
      var note = h('p', { class: 'game-note' });
      root.appendChild(note);
      var cells = [];

      /* ----- words ----- */
      function colourName(p) { return p === RED ? 'Red' : 'Blue'; }
      function isComputer(p) { return mode === 'computer' && p === BLUE; }
      function say(text) { api.status(text); mirror.textContent = text; }
      function promptText() {
        var who = mode === 'computer' ? 'Your turn (Red).' : colourName(turn) + "'s turn.";
        return who + ' Pick a ' + colourName(turn).toLowerCase() + ' man, then where it goes.';
      }

      /* ----- settings ----- */
      function setMode(m) { mode = m; api.store.set('mode', m); api.sound('click'); newGame(); }
      function setLevel(l) { level = l; api.store.set('level', l); api.sound('click'); updateControls(); }
      function setSize(n) { size = n; api.store.set('board', n); api.sound('click'); newGame(); }
      function updateControls() {
        modeBtns.computer.setAttribute('aria-pressed', String(mode === 'computer'));
        modeBtns.two.setAttribute('aria-pressed', String(mode === 'two'));
        levelBtns.easy.setAttribute('aria-pressed', String(level === 'easy'));
        levelBtns.hard.setAttribute('aria-pressed', String(level === 'hard'));
        sizeSel.value = String(size);
        levelSeg.hidden = mode !== 'computer';
        note.textContent = (size === 16 ? 'The 1884 board: 16 by 16, 19 men each.' : 'The quick board: 10 by 10, 15 men each (the 1884 board is 16 by 16 with 19 men).') +
          ' Step one square any way, or hop over any man, again and again. Nothing is captured, and a man in the far yard must stay inside it. Site rule, no blocking: men left in their own starting yard count for the other player, so fill every other square of your far yard and you win.';
      }

      /* ----- building the board ----- */
      function buildBoard() {
        var n = g.n;
        boardEl.style.setProperty('--n', String(n));
        wrap.style.setProperty('--hm-w', n === 16 ? '640px' : '520px');
        boardEl.setAttribute('aria-label', 'Halma board, ' + n + ' by ' + n + '. Arrow keys move around; Enter picks up a man and puts it down.');
        boardEl.replaceChildren();
        cells = [];
        for (var s = 0; s < g.size; s++) {
          var r = Math.floor(s / n), c = s % n;
          var cls = 'hm-cell' + ((r + c) % 2 ? ' is-alt' : '') + (g.home[RED][s] ? ' is-red-yard' : '') + (g.home[BLUE][s] ? ' is-blue-yard' : '');
          var cell = h('div', { class: cls, role: 'button', tabindex: '-1', 'data-sq': String(s) });
          cells.push(cell);
          boardEl.appendChild(cell);
        }
        /* Heavy lines round the yards, as on the printed boards. */
        lines.replaceChildren();
        lines.setAttribute('viewBox', '0 0 ' + n + ' ' + n);
        var yardPath = '', smallPath = '';
        function edges(test) {
          var d = '';
          for (var s = 0; s < g.size; s++) {
            if (!test(s)) continue;
            var r = Math.floor(s / n), c = s % n;
            if (r > 0 && !test(s - n)) d += 'M' + c + ' ' + r + 'h1';
            if (r < n - 1 && !test(s + n)) d += 'M' + c + ' ' + (r + 1) + 'h1';
            if (c > 0 && !test(s - 1)) d += 'M' + c + ' ' + r + 'v1';
            if (c < n - 1 && !test(s + 1)) d += 'M' + (c + 1) + ' ' + r + 'v1';
          }
          return d;
        }
        yardPath = edges(function (s) { return g.home[RED][s] || g.home[BLUE][s]; });
        smallPath = edges(function (s) { return g.small[s]; });
        if (smallPath) lines.appendChild(svg('path', { d: smallPath, class: 'hm-yard-line', 'stroke-width': '0.05' }));
        lines.appendChild(svg('path', { d: yardPath, class: 'hm-yard-line', 'stroke-width': '0.1' }));
        trailEl = svg('path', { class: 'hm-trail', 'stroke-width': '0.12', 'stroke-dasharray': '0.05 0.25' });
        pathEl = svg('path', { class: 'hm-path', 'stroke-width': '0.09', 'stroke-dasharray': '0.04 0.2' });
        spotsEl = svg('g');
        lines.appendChild(trailEl);
        lines.appendChild(pathEl);
        lines.appendChild(spotsEl);
        boardEl.appendChild(lines);
        boardEl.appendChild(layer);
        cursor = (n - 3) * n + 2; /* the keyboard cursor starts on a red man at the edge of its yard */
        cells[cursor].setAttribute('tabindex', '0');
      }
      var trailEl, pathEl, spotsEl;

      function centre(s) { return { x: s % g.n + 0.5, y: Math.floor(s / g.n) + 0.5 }; }
      function pathD(from, path) {
        var pts = [from].concat(path), d = '';
        pts.forEach(function (s, i) { var p = centre(s); d += (i ? 'L' : 'M') + p.x + ' ' + p.y; });
        return d;
      }
      /* Shows the whole chain to a landing spot: a dotted line with a small dotted ring on every hop. */
      function setPreview(m) {
        preview = m;
        spotsEl.replaceChildren();
        cells.forEach(function (c) { c.classList.remove('is-preview'); });
        if (!m || !m.hops) { pathEl.setAttribute('d', ''); return; }
        pathEl.setAttribute('d', pathD(m.from, m.path));
        m.path.forEach(function (s, i) {
          var p = centre(s);
          if (i < m.path.length - 1) spotsEl.appendChild(svg('circle', { cx: p.x, cy: p.y, r: 0.2, class: 'hm-path-spot', 'stroke-width': '0.06', 'stroke-dasharray': '0.06 0.06' }));
        });
        cells[m.to].classList.add('is-preview');
      }

      /* ----- the men ----- */
      function place(s, extra) { var c = s % g.n, r = Math.floor(s / g.n); return 'translate(' + (c * 100) + '%, ' + (r * 100) + '%)' + (extra || ''); }
      function animate(el, frames, opts) {
        if (RM || !el.animate) return;
        try { el.animate(frames, opts); } catch (e) { /* no animation */ }
      }
      function rebuildMen(fresh) {
        layer.replaceChildren();
        manEls = {};
        for (var s = 0; s < g.size; s++) {
          if (!board[s]) continue;
          var base = h('div', { class: 'hm-base' });
          var el = h('div', { class: 'hm-man ' + (board[s] === RED ? 'is-red' : 'is-blue') }, base);
          el.style.transform = place(s);
          layer.appendChild(el);
          manEls[s] = el;
          if (fresh) animate(base, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 300, delay: (dist(g, board[s], s) * 22), easing: 'ease-out', fill: 'backwards' });
        }
      }
      /* Moves a man along its path: one slide for a step, one arc per hop, with a clack on every landing. */
      function animateMove(m, done) {
        var el = manEls[m.from], at = m.from, k = 0;
        delete manEls[m.from];
        manEls[m.to] = el;
        if (el) el.classList.add('is-moving');
        (function next() {
          if (k >= m.path.length) {
            if (el) el.classList.remove('is-moving');
            done();
            return;
          }
          /* Long chains hop a little faster, so even a 9-hop chain is over in about a second and a half. */
          var to = m.path[k], ms = m.hops ? Math.round(Math.max(Math.min(HOP_MS, 1400 / m.hops), RM ? 0 : 140)) : STEP_MS;
          if (el) {
            if (m.hops) {
              var a = centre(at), b = centre(to);
              var mid = ((a.y + b.y) / 2 - 0.5) * g.n + ((a.x + b.x) / 2 - 0.5);
              animate(el, [{ transform: place(at) }, { transform: place(mid, ' translateY(-45%) scale(1.3)'), offset: 0.5 }, { transform: place(to) }], { duration: ms, easing: 'ease-in-out' });
            } else {
              animate(el, [{ transform: place(at) }, { transform: place(to) }], { duration: ms, easing: 'ease-out' });
            }
            el.style.transform = place(to);
          }
          at = to;
          k++;
          later(function () { api.sound('clack'); next(); }, ms);
        })();
      }

      /* ----- drawing the state ----- */
      function destMap() {
        var map = {};
        if (sel < 0) return map;
        moves.forEach(function (m) { if (m.from === sel && !map[m.to]) map[m.to] = m; });
        return map;
      }
      function render() {
        var humanTurn = !over && !busy && !isComputer(turn);
        var dm = humanTurn ? destMap() : {};
        for (var s = 0; s < g.size; s++) {
          var m = dm[s], cell = cells[s];
          cell.classList.toggle('is-step', !!m && !m.hops);
          cell.classList.toggle('is-hop', !!m && m.hops > 0);
          cell.classList.toggle('is-last', !!lastMove && (s === lastMove.from || s === lastMove.to));
          cell.setAttribute('aria-label', cellLabel(s, m));
        }
        Object.keys(manEls).forEach(function (k) {
          var s = Number(k), el = manEls[k];
          el.classList.toggle('is-sel', s === sel && !over);
          el.classList.toggle('is-done', !!board[s] && g.target[board[s]][s]);
        });
        if (preview && (!dm[preview.to] || dm[preview.to] !== preview)) setPreview(null);
        trailEl.setAttribute('d', lastMove && lastMove.hops ? pathD(lastMove.from, lastMove.path) : '');
        trailEl.setAttribute('class', 'hm-trail ' + (lastMove && board[lastMove.to] === BLUE ? 'is-blue' : 'is-red'));
        [RED, BLUE].forEach(function (p) {
          var who = mode === 'computer' ? (p === RED ? 'You' : 'Computer') : colourName(p);
          chips[p].text.textContent = who + ' ' + homeCount(g, board, p) + ' of ' + g.men + ' home';
          chips[p].el.classList.toggle('is-turn', !over && turn === p);
        });
        var b = best[g.n];
        var foot = [h('span', null, h('strong', null, over ? 'Turns played: ' : 'Turn: '), String(over ? Math.ceil(turns / 2) : Math.floor(turns / 2) + 1))];
        if (mode === 'computer') foot.push(h('span', null, h('strong', null, 'Your best win: '), b ? b + ' turns' : 'none yet'));
        footEl.replaceChildren.apply(footEl, foot);
      }
      function cellLabel(s, m) {
        var n = g.n, text = 'Row ' + (Math.floor(s / n) + 1) + ', column ' + (s % n + 1) + ', ';
        text += board[s] ? colourName(board[s]) + ' man' : 'empty';
        if (g.home[RED][s]) text += ', red yard';
        else if (g.home[BLUE][s]) text += ', blue yard';
        if (s === sel) text += ', picked up';
        if (m) text += m.hops ? ', hop here in ' + m.hops + (m.hops === 1 ? ' hop' : ' hops') : ', step here';
        return text;
      }

      /* ----- the flow of a game ----- */
      function resetTo(b, side) {
        stopTimers();
        g = geometry(size);
        board = b || startBoard(g);
        turn = side || RED; over = false; sel = -1; busy = false; lastMove = null; lastBy = {}; turns = 0; preview = null;
        banner.hidden = true; banner.replaceChildren();
        updateControls();
        buildBoard();
      }
      function newGame() {
        resetTo(null, RED);
        rebuildMen(true);
        api.sound('shuffle');
        startTurn('New game. ');
      }
      function startTurn(prefix) {
        moves = allMoves(g, board, turn);
        sel = -1;
        if (!moves.length) {
          /* Almost impossible in Halma, but if a player is completely boxed in, they pass. */
          if (!allMoves(g, board, other(turn)).length) { finish(0); return; }
          prefix = (prefix || '') + colourName(turn) + ' cannot move and passes. ';
          turn = other(turn);
          moves = allMoves(g, board, turn);
        }
        if (isComputer(turn)) {
          say((prefix || '') + 'Computer is thinking...');
          render();
          later(computerMove, THINK_MS);
          return;
        }
        say((prefix || '') + promptText());
        render();
      }
      function activate(s) {
        if (over || busy || isComputer(turn)) return;
        var dm = destMap();
        if (dm[s]) { playMove(dm[s]); return; }
        if (board[s] === turn) {
          var mine = moves.filter(function (m) { return m.from === s; });
          if (!mine.length) { api.sound('wrong'); say('That man is boxed in. Try another one.'); return; }
          api.sound('click');
          if (sel === s) { sel = -1; say(promptText()); render(); return; }
          sel = s;
          var hops = mine.filter(function (m) { return m.hops; }).length;
          say(hops ? 'Dots are steps. Dotted rings are hops: the man jumps from man to man to get there.' : 'Pick a dot to step to.');
          render();
          return;
        }
        if (board[s] && board[s] !== turn) { api.sound('wrong'); say('That is not your man. ' + promptText()); return; }
        if (sel >= 0) { sel = -1; say(promptText()); render(); }
      }
      function playMove(m) {
        var mover = turn;
        busy = true;
        sel = -1;
        setPreview(null);
        render();
        animateMove(m, function () {
          board = play(board, m);
          lastMove = m;
          lastBy[mover] = m;
          busy = false;
          turns++;
          var words = '';
          if (m.hops >= 2) words = (isComputer(mover) ? 'The computer' : (mode === 'computer' ? 'You' : colourName(mover))) + ' hopped ' + m.hops + ' times! ';
          if (m.hops >= 4) api.sound('coin');
          if (g.target[mover][m.to] && !g.target[mover][m.from]) { words += (mode === 'computer' ? (isComputer(mover) ? 'A computer man got home. ' : 'One more man home! ') : 'A ' + colourName(mover).toLowerCase() + ' man got home. '); api.sound('pop'); }
          if (hasWon(g, board, mover)) { finish(mover); return; }
          if (hasWon(g, board, other(mover))) { finish(other(mover)); return; }
          turn = other(mover);
          startTurn(words);
        });
      }
      function computerMove() {
        if (over || !isComputer(turn)) return;
        var m = chooseMove(g, board, turn, level, api.random, lastBy[turn]);
        if (!m) return;
        playMove(m);
      }
      function finish(winner) {
        over = true; busy = false; sel = -1;
        var title, text, yours = Math.ceil(turns / 2);
        if (!winner) {
          title = 'Stuck!';
          text = 'Nobody can move, so it is a draw.';
          api.sound('chalk');
        } else if (mode === 'computer') {
          if (winner === RED) {
            title = 'You win!';
            text = 'Every square of the far yard is filled, in ' + yours + ' turns.';
            if (!best[g.n] || yours < best[g.n]) { best[g.n] = yours; api.store.set('best', best); text += ' Your best yet!'; }
            api.celebrate('You won Halma in ' + yours + ' turns!');
          } else {
            title = 'Computer wins';
            text = 'It filled your corner first. Good game! Try Easy, or look for long chains of hops.';
            api.sound('lose');
          }
        } else {
          title = colourName(winner) + ' wins!';
          text = colourName(winner) + ' filled the far yard first. Well played!';
          api.celebrate(colourName(winner) + ' wins at Halma!');
        }
        say(title + ' ' + text);
        render();
        banner.replaceChildren(h('div', { class: 'hm-banner-card' },
          h('p', { class: 'hm-banner-title' }, title),
          h('p', { class: 'hm-banner-text' }, text),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(); } }, 'Play again')));
        banner.hidden = false;
      }

      /* ----- pointer and keyboard ----- */
      function cellFrom(ev) {
        var cell = ev.target && ev.target.closest ? ev.target.closest('.hm-cell') : null;
        return cell && boardEl.contains(cell) ? Number(cell.getAttribute('data-sq')) : -1;
      }
      function onBoardClick(ev) {
        var s = cellFrom(ev);
        if (s < 0) return;
        setCursor(s, false);
        activate(s);
      }
      function onHover(ev) {
        if (ev.pointerType && ev.pointerType !== 'mouse') return;
        var s = cellFrom(ev);
        var m = s >= 0 && !busy ? destMap()[s] : null;
        if (m !== preview) setPreview(m && m.hops ? m : null);
      }
      function setCursor(s, focus) {
        if (cells[cursor]) cells[cursor].setAttribute('tabindex', '-1');
        cursor = s;
        cells[cursor].setAttribute('tabindex', '0');
        if (focus) cells[cursor].focus();
        if (focus) { var m = destMap()[s]; setPreview(m && m.hops && !busy ? m : null); }
      }
      function onKey(ev) {
        var n = g.n, r = Math.floor(cursor / n), c = cursor % n, k = ev.key;
        if (k === 'ArrowUp') r = Math.max(0, r - 1);
        else if (k === 'ArrowDown') r = Math.min(n - 1, r + 1);
        else if (k === 'ArrowLeft') c = Math.max(0, c - 1);
        else if (k === 'ArrowRight') c = Math.min(n - 1, c + 1);
        else if (k === 'Home') c = 0;
        else if (k === 'End') c = n - 1;
        else if (k === 'Enter' || k === ' ' || k === 'Spacebar') { ev.preventDefault(); activate(cursor); return; }
        else if (k === 'Escape') { if (sel >= 0 && !busy) { sel = -1; say(promptText()); render(); } return; }
        else return;
        ev.preventDefault();
        setCursor(r * n + c, true);
      }

      /* ----- a small hook for the play-test script: load a position and read the state ----- */
      root.__test = {
        load: function (spec) {
          if (spec.size) size = spec.size;
          var gg = geometry(size), b = [];
          for (var s = 0; s < gg.size; s++) b.push(EMPTY);
          (spec.red || []).forEach(function (s) { b[s] = RED; });
          (spec.blue || []).forEach(function (s) { b[s] = BLUE; });
          resetTo(b, spec.turn === 'blue' ? BLUE : RED);
          rebuildMen(false);
          startTurn('');
        },
        state: function () {
          var red = [], blue = [];
          board.forEach(function (v, s) { if (v === RED) red.push(s); else if (v === BLUE) blue.push(s); });
          return { n: g.n, red: red, blue: blue, turn: turn === RED ? 'red' : 'blue', over: over, busy: busy, sel: sel, cursor: cursor,
            dests: Object.keys(destMap()).map(Number), last: lastMove ? { from: lastMove.from, to: lastMove.to, hops: lastMove.hops } : null,
            redHome: homeCount(g, board, RED), blueHome: homeCount(g, board, BLUE) };
        },
        yard: function (who) { var gg = geometry(size), out = []; for (var s = 0; s < gg.size; s++) if (gg.home[who === 'red' ? RED : BLUE][s]) out.push(s); return out; }
      };

      newGame();

      return {
        destroy: function () {
          destroyed = true;
          stopTimers();
          delete root.__test;
        }
      };
    }
  });
})();
