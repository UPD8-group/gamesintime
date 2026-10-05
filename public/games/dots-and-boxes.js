/* Dots and Boxes for Games in Time.
   Published in 1889 by the French mathematician Édouard Lucas as "La Pipopipette".

   How the file is organised:
     Part 1  The rules. A tiny "state" object holds which lines are drawn and who owns each box.
             These functions never touch the screen, so the computer can copy a state and
             imagine how a game might finish without changing the real board.
     Part 2  The computer player. Easy and Hard, with the strategy explained in plain words.
     Part 3  The screen. The board is a CSS grid of real <button> elements for the lines,
             so it works with a finger, a mouse or a keyboard.

   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  var SIZES = { small: 3, even: 4, medium: 5, large: 7 };   /* boxes per side; 4 by 4 has an even number of boxes, so it can end in a draw */
  var THINK_MS = 350;                                /* the computer's pause before it moves */
  var HUMAN = 1, COMPUTER = 2;                       /* in two-player mode these are Player 1 and Player 2 */

  /* =====================================================================
     PART 1: THE RULES
     A board with n boxes per side has (n + 1) rows of dots.
     Horizontal lines: n + 1 rows, each with n lines.   id = r * n + c
     Vertical lines:   n rows, each with n + 1 lines.    id = hCount + r * (n + 1) + c
     Boxes: n rows of n.                                 id = r * n + c
     ===================================================================== */
  function newState(n) {
    var hCount = (n + 1) * n;
    var vCount = n * (n + 1);
    return {
      n: n,
      hCount: hCount,
      total: hCount + vCount,
      drawn: new Uint8Array(hCount + vCount), /* 1 when that line has been drawn */
      owner: new Uint8Array(n * n),           /* 0 nobody, 1 player one, 2 player two */
      score: [0, 0, 0],                        /* score[1] and score[2]; index 0 is unused */
      left: hCount + vCount                    /* lines still to draw */
    };
  }
  function cloneState(s) {
    return { n: s.n, hCount: s.hCount, total: s.total, drawn: new Uint8Array(s.drawn), owner: new Uint8Array(s.owner), score: s.score.slice(), left: s.left };
  }
  function hId(s, r, c) { return r * s.n + c; }
  function vId(s, r, c) { return s.hCount + r * (s.n + 1) + c; }

  /* Where a line sits: its kind, its row and column, and the two dots it joins. */
  function lineInfo(s, id) {
    if (id < s.hCount) {
      var r = Math.floor(id / s.n), c = id % s.n;
      return { kind: 'h', r: r, c: c, from: [r, c], to: [r, c + 1] };
    }
    var k = id - s.hCount, r2 = Math.floor(k / (s.n + 1)), c2 = k % (s.n + 1);
    return { kind: 'v', r: r2, c: c2, from: [r2, c2], to: [r2 + 1, c2] };
  }

  /* The one or two boxes that a line is a side of. Edge lines belong to only one box. */
  function boxesOfLine(s, id) {
    var L = lineInfo(s, id), n = s.n, out = [];
    if (L.kind === 'h') {
      if (L.r > 0) out.push((L.r - 1) * n + L.c);   /* the box above */
      if (L.r < n) out.push(L.r * n + L.c);         /* the box below */
    } else {
      if (L.c > 0) out.push(L.r * n + L.c - 1);     /* the box to the left */
      if (L.c < n) out.push(L.r * n + L.c);         /* the box to the right */
    }
    return out;
  }

  /* The four sides of a box: top, bottom, left, right. */
  function boxLines(s, b) {
    var r = Math.floor(b / s.n), c = b % s.n;
    return [hId(s, r, c), hId(s, r + 1, c), vId(s, r, c), vId(s, r, c + 1)];
  }
  function sides(s, b) {
    var ls = boxLines(s, b), k = 0;
    for (var i = 0; i < 4; i++) if (s.drawn[ls[i]]) k++;
    return k;
  }
  /* The one side of a box that is still missing (only meaningful when sides(s, b) is 3). */
  function openLine(s, b) {
    var ls = boxLines(s, b);
    for (var i = 0; i < 4; i++) if (!s.drawn[ls[i]]) return ls[i];
    return -1;
  }

  /* Draw a line for a player. Returns how many boxes that closed (0, 1 or 2).
     Closing a box gives it to the player, and by the rules they must move again. */
  function drawLine(s, id, player) {
    if (s.drawn[id]) return 0;
    s.drawn[id] = 1;
    s.left--;
    var closed = 0, bs = boxesOfLine(s, id);
    for (var i = 0; i < bs.length; i++) {
      if (sides(s, bs[i]) === 4) { s.owner[bs[i]] = player; s.score[player]++; closed++; }
    }
    return closed;
  }

  /* What drawing a line would do:
       'take'  it is the fourth side of a box, so it wins that box
       'gives' it is the third side of a box, so the other player can take that box next
       'safe'  neither; it does not hand anything over */
  function kindOfLine(s, id) {
    var bs = boxesOfLine(s, id), result = 'safe';
    for (var i = 0; i < bs.length; i++) {
      var k = sides(s, bs[i]);
      if (k === 3) return 'take';
      if (k === 2) result = 'gives';
    }
    return result;
  }
  function sortLines(s) {
    var out = { take: [], gives: [], safe: [] };
    for (var id = 0; id < s.total; id++) if (!s.drawn[id]) out[kindOfLine(s, id)].push(id);
    return out;
  }

  /* =====================================================================
     PART 2: THE COMPUTER
     Both levels follow the same first two habits that a good human player learns:
       1. If you can close a box, close it (you get another go).
       2. Otherwise draw a line that does not give the other player a box.
     When every spare line is gone and you must give something away, Easy picks at random.
     Hard thinks about chains.
     ===================================================================== */
  function pick(list, random) { return list[Math.floor(random() * list.length)]; }

  /* Take every box that can be taken right now, one after another (as the rules allow),
     and return how many that was. Used to imagine what the other player would grab. */
  function takeEverything(s, player) {
    var taken = 0, found = true;
    while (found) {
      found = false;
      for (var b = 0; b < s.n * s.n; b++) {
        if (!s.owner[b] && sides(s, b) === 3) { taken += drawLine(s, openLine(s, b), player); found = true; }
      }
    }
    return taken;
  }

  /* A "chain" is a row of boxes that each have two sides drawn. Once you draw the third side
     of any box in a chain, your opponent can run along the whole chain and take every box.
     This counts how many boxes drawing this line would hand over. */
  function boxesGivenBy(s, id) {
    var t = cloneState(s);
    drawLine(t, id, 1);
    return takeEverything(t, 2);
  }

  /* Of all the lines that give something away, choose the one that gives away the fewest boxes:
     the SHORTEST chain. When several are equally short, Hard mode imagines playing each one out. */
  function shortestChainLine(s, candidates, random, deep) {
    var best = [], bestCount = Infinity;
    for (var i = 0; i < candidates.length; i++) {
      var k = boxesGivenBy(s, candidates[i]);
      if (k < bestCount) { bestCount = k; best = [candidates[i]]; }
      else if (k === bestCount) best.push(candidates[i]);
    }
    if (!deep || best.length === 1) return pick(best, random);
    /* Tie-break by imagining the rest of the game (at most six candidates, to stay quick). */
    var tried = best.slice(0, 6), bestId = tried[0], bestScore = -1;
    for (var j = 0; j < tried.length; j++) {
      var t = cloneState(s);
      drawLine(t, tried[j], COMPUTER);
      var score = playOut(t, HUMAN, random)[COMPUTER];
      if (score > bestScore) { bestScore = score; bestId = tried[j]; }
    }
    return bestId;
  }

  /* The simple habits, used when the computer imagines the rest of a game:
     take what you can, else play safe, else give away the shortest chain. */
  function simpleMove(s, random) {
    var lines = sortLines(s);
    if (lines.take.length) return lines.take[0];
    if (lines.safe.length) return pick(lines.safe, random);
    return shortestChainLine(s, lines.gives, random, false);
  }

  /* Play a copy of the game to the end with both sides using the simple habits.
     Returns the final score so two ideas can be compared. */
  function playOut(s, player, random) {
    var t = cloneState(s);
    while (t.left > 0) {
      var id = simpleMove(t, random);
      if (drawLine(t, id, player) === 0) player = 3 - player;   /* no box closed, so the turn passes */
    }
    return t.score;
  }

  /* EASY: take a box if you can. Otherwise draw a safe line. If there are none, pick any line. */
  function easyMove(s, random) {
    var lines = sortLines(s);
    if (lines.take.length) return pick(lines.take, random);
    if (lines.safe.length) return pick(lines.safe, random);
    return pick(lines.gives, random);
  }

  /* The double-cross, the cleverest trick in Dots and Boxes.
     Late in the game every line gives something away. Whoever is forced to open a chain loses it,
     and the player who eats the chain then has to open the next one. So "having to move" is bad.
     The trick: when you are eating a chain and only two boxes of it are left, do not take them.
     Instead draw the line at the far end of the chain. Your opponent takes those two boxes with
     one line (a "double-cross"), and then THEY must open the next chain for you.
     You give up two boxes to win a whole chain.

     This looks for that moment: exactly one box can be closed (b1), the box beyond it (b2) has
     two sides, and the chain stops there. Returns the far line to draw as the gift, or null. */
  function doubleCrossGift(s) {
    var threes = [];
    for (var b = 0; b < s.n * s.n; b++) if (!s.owner[b] && sides(s, b) === 3) threes.push(b);
    if (threes.length !== 1) return null;
    var b1 = threes[0], l1 = openLine(s, b1);
    var next = boxesOfLine(s, l1).filter(function (b) { return b !== b1; });
    if (!next.length) return null;                       /* l1 is on the edge: b1 is the last box */
    var b2 = next[0];
    if (sides(s, b2) !== 2) return null;                 /* b2 is not the second-last box */
    var l2 = boxLines(s, b2).filter(function (l) { return !s.drawn[l] && l !== l1; })[0];
    var beyond = boxesOfLine(s, l2).filter(function (b) { return b !== b2; });
    if (beyond.length && sides(s, beyond[0]) >= 2) return null;   /* the chain carries on past b2 */
    return { take: l1, gift: l2 };
  }

  /* HARD: the same habits as Easy, plus chain sense. */
  function hardMove(s, random) {
    var lines = sortLines(s);
    if (lines.take.length) {
      /* Imagine eating everything on offer. If a safe line would still be left afterwards,
         there is no danger, so just eat. */
      var after = cloneState(s);
      takeEverything(after, COMPUTER);
      if (sortLines(after).safe.length) return pick(lines.take, random);
      /* Otherwise eating it all would force us to open the next chain. Is a double-cross on? */
      var gift = doubleCrossGift(s);
      if (gift) {
        /* Compare two futures: eat the lot and then open a chain, or give two boxes and keep control. */
        var eatScore = playOut(s, COMPUTER, random)[COMPUTER];
        var t = cloneState(s);
        drawLine(t, gift.gift, COMPUTER);
        var giftScore = playOut(t, HUMAN, random)[COMPUTER];
        if (giftScore > eatScore) return gift.gift;
      }
      return pick(lines.take, random);
    }
    if (lines.safe.length) return pick(lines.safe, random);
    /* Forced to give something away: give the shortest chain. */
    return shortestChainLine(s, lines.gives, random, true);
  }


  /* =====================================================================
     PART 3: THE SCREEN
     ===================================================================== */
  var MIN_UNIT = 22, MAX_UNIT = 48;   /* how wide one grid track may be, in px */
  var HIT = 36;                       /* every line button is at least this big, so it is easy to tap */

  GamesInTime.register({
    id: 'dots-and-boxes',
    mount: function (root, api) {
      var h = api.h;

      /* ---- settings, remembered for next time ---- */
      var sizeKey = api.store.get('size', 'small');
      if (!SIZES[sizeKey]) sizeKey = 'small';
      var mode = api.store.get('mode', 'computer') === 'two' ? 'two' : 'computer';
      var level = api.store.get('level', 'easy') === 'hard' ? 'hard' : 'easy';
      var starter = api.store.get('starter', 'you') === 'computer' ? 'computer' : 'you';   /* who moves first against the computer */

      /* ---- game state ---- */
      var state = null;          /* the rules object from Part 1 */
      var current = HUMAN;       /* whose turn it is: 1 or 2 */
      var over = false;
      var lastLine = -1;         /* the most recent line, highlighted so a kid can see what happened */
      var timer = null;          /* the computer's thinking timer */
      var generation = 0;        /* goes up on every New game, so an old timer can be ignored */
      var lineButtons = [];      /* every line <button>, in board order */
      var buttonById = {};       /* line id -> its button */
      var boxEls = [];           /* every box element, by box id */

      root.appendChild(h('style', null,
        /* Player colours. In light mode Player 1 is the site's teal. In dark mode that teal is nearly
           the same shade as the panel behind it, so Player 1 switches to the light teal (--link)
           with dark numerals, which stands out and still looks nothing like Player 2's red. */
        '.game-dots-and-boxes { --dab-p1: var(--brand); --dab-p1-ink: var(--on-brand); }' +
        ':root[data-theme="dark"] .game-dots-and-boxes { --dab-p1: var(--link); --dab-p1-ink: var(--bg); }' +
        '@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .game-dots-and-boxes { --dab-p1: var(--link); --dab-p1-ink: var(--bg); } }' +
        /* the board has no side padding, so the grid can use the full width before it needs to scroll */
        '.game-dots-and-boxes .board { overflow-x: auto; overflow-y: hidden; padding: 6px 0; margin-bottom: .5rem; }' +
        '.game-dots-and-boxes .grid { --unit: 44px; --hit: max(var(--unit), ' + HIT + 'px); --pad: calc((var(--hit) - var(--unit)) / 2); display: grid; grid-template-columns: repeat(var(--tracks), var(--unit)); grid-auto-rows: var(--unit); width: max-content; margin: 0 auto; padding: var(--pad); }' +
        /* dots sit on top of everything, but taps pass straight through them to the line buttons beneath */
        '.game-dots-and-boxes .dot { position: relative; z-index: 3; pointer-events: none; }' +
        '.game-dots-and-boxes .dot::before { content: ""; position: absolute; left: 50%; top: 50%; width: max(8px, calc(var(--unit) * .32)); height: max(8px, calc(var(--unit) * .32)); border-radius: 50%; background: var(--ink); transform: translate(-50%, -50%); }' +
        /* Every line is a button. On a small screen the grid tracks can shrink below the tap size, so the
           button is always at least HIT px square and is centred on its track with negative margins.
           --pad (set on the grid) is how far it pokes out past the track on each side: zero on a big screen.
           The visible bar is drawn with ::before, inside the track. */
        '.game-dots-and-boxes .line { position: relative; z-index: 1; display: block; width: var(--hit); height: var(--hit); margin: calc(0px - var(--pad)); padding: 0; border: 0; background: transparent; border-radius: 8px; cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }' +
        '.game-dots-and-boxes .line::before { content: ""; position: absolute; border-radius: 999px; background: var(--line); pointer-events: none; transition: background-color .12s, left .12s, right .12s, top .12s, bottom .12s; }' +
        '.game-dots-and-boxes .line-h::before { top: 50%; height: max(4px, calc(var(--unit) * .18)); left: calc(var(--pad) + var(--unit) * .1); right: calc(var(--pad) + var(--unit) * .1); transform: translateY(-50%); }' +
        '.game-dots-and-boxes .line-v::before { left: 50%; width: max(4px, calc(var(--unit) * .18)); top: calc(var(--pad) + var(--unit) * .1); bottom: calc(var(--pad) + var(--unit) * .1); transform: translateX(-50%); }' +
        '.game-dots-and-boxes .line:hover::before, .game-dots-and-boxes .line:focus-visible::before { background: var(--ink-muted); }' +
        '.game-dots-and-boxes .line:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; z-index: 2; }' +
        /* a drawn line reaches the centre of each dot; the dots are painted over the top */
        '.game-dots-and-boxes .line.is-drawn { cursor: default; }' +
        '.game-dots-and-boxes .line.is-drawn::before, .game-dots-and-boxes .line.is-drawn:hover::before { background: var(--ink); }' +
        '.game-dots-and-boxes .line-h.is-drawn::before { left: calc(var(--pad) - var(--unit) * .5); right: calc(var(--pad) - var(--unit) * .5); }' +
        '.game-dots-and-boxes .line-v.is-drawn::before { top: calc(var(--pad) - var(--unit) * .5); bottom: calc(var(--pad) - var(--unit) * .5); }' +
        '.game-dots-and-boxes .line.is-last::before { box-shadow: 0 0 0 3px var(--brass-bright); }' +
        /* boxes: the box cell is one track wide, so a claimed box grows (negative margins) to fill the whole square
           between its four dots; it is painted beneath the lines and dots because they are positioned with a z-index */
        '.game-dots-and-boxes .box { display: flex; align-items: center; justify-content: center; margin: calc(var(--unit) * -.5 + 4px); border-radius: 6px; font-family: var(--font-display); font-size: calc(var(--unit) * .8); line-height: 1; }' +
        '.game-dots-and-boxes .box.is-p1 { background: var(--dab-p1); color: var(--dab-p1-ink); }' +
        '.game-dots-and-boxes .box.is-p2 { background: var(--red); color: var(--surface); }' +
        '.game-dots-and-boxes .box.is-new { animation: game-dots-and-boxes-pop .3s ease-out; }' +
        '@keyframes game-dots-and-boxes-pop { from { transform: scale(.4); } to { transform: scale(1); } }' +
        /* scoreboard */
        '.game-dots-and-boxes .score { padding: .1rem .35rem; border-radius: 6px; border: 2px solid transparent; }' +
        '.game-dots-and-boxes .score.is-active { border-color: var(--brass); }' +
        '.game-dots-and-boxes .swatch { display: inline-block; width: 1em; height: 1em; border-radius: 3px; }' +
        '.game-dots-and-boxes .swatch-p1 { background: var(--dab-p1); }' +
        '.game-dots-and-boxes .swatch-p2 { background: var(--red); }' +
        '.game-dots-and-boxes .lines-left { color: var(--ink-muted); font-weight: 400; }' +
        '.game-dots-and-boxes .scroll-note { margin: -.25rem 0 .5rem; text-align: center; }'));

      /* ---- toolbar ---- */
      var modeComputer = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setMode('computer'); } }, 'Play the computer');
      var modeTwo = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setMode('two'); } }, 'Two players');
      var levelEasy = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setLevel('easy'); } }, 'Easy');
      var levelHard = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setLevel('hard'); } }, 'Hard');
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' }, levelEasy, levelHard);
      var startYou = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setStarter('you'); } }, 'You first');
      var startComputer = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setStarter('computer'); } }, 'Computer first');
      var starterSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Who starts' }, startYou, startComputer);
      /* The 4 by 4 board is the only one with an even number of boxes, so it is the only one where a draw can happen. */
      var sizeSelect = h('select', { id: 'dab-size', onchange: function () { setSize(sizeSelect.value); } },
        h('option', { value: 'small' }, 'Small, 3 by 3'),
        h('option', { value: 'even' }, 'Even, 4 by 4'),
        h('option', { value: 'medium' }, 'Medium, 5 by 5'),
        h('option', { value: 'large' }, 'Large, 7 by 7'));
      var newGameBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: newGame }, 'New game');
      var toolbar = h('div', { class: 'game-toolbar' },
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Who plays' }, modeComputer, modeTwo),
        levelSeg,
        starterSeg,
        h('label', { class: 'field', for: 'dab-size' }, 'Board', sizeSelect),
        newGameBtn);

      /* ---- scoreboard ---- */
      var score1 = h('b', null, '0'), score2 = h('b', null, '0');
      var name1 = h('span', null, ''), name2 = h('span', null, '');
      var scoreP1 = h('span', { class: 'score score-p1' }, h('i', { class: 'swatch swatch-p1', 'aria-hidden': 'true' }), name1, score1);
      var scoreP2 = h('span', { class: 'score score-p2' }, h('i', { class: 'swatch swatch-p2', 'aria-hidden': 'true' }), name2, score2);
      var linesLeft = h('span', { class: 'lines-left' }, '');
      var scoreboard = h('div', { class: 'scoreboard', role: 'group', 'aria-label': 'Boxes won' }, scoreP1, scoreP2, linesLeft);

      /* ---- board ---- */
      var grid = h('div', { class: 'grid', role: 'group', onkeydown: onGridKey });
      var board = h('div', { class: 'board' }, grid);
      /* shown only when the board is wider than the screen, which can happen with the big boards on a phone */
      var scrollNote = h('p', { class: 'game-note scroll-note', hidden: true }, 'Scroll sideways to see the whole board.');

      root.appendChild(toolbar);
      root.appendChild(scoreboard);
      root.appendChild(board);
      root.appendChild(scrollNote);
      root.appendChild(h('p', { class: 'game-note' }, 'Close a box and you go again. Tip: try not to draw the third side of a box, because that hands it to the other player. The 4 by 4 board is the only one where a draw is possible.'));
      root.appendChild(h('p', { class: 'game-note' }, 'Keyboard: the arrow keys move along the lines, Shift with an arrow key turns a corner, Tab visits every line, and Enter draws.'));

      /* ---- names and words ---- */
      function nameOf(p) { return mode === 'computer' ? (p === HUMAN ? 'You' : 'Computer') : 'Player ' + p; }
      function initialOf(p) { return mode === 'computer' ? (p === HUMAN ? 'Y' : 'C') : String(p); }
      function turnText() {
        if (mode === 'computer') return current === HUMAN ? 'Your turn' : 'Computer is thinking';
        return 'Player ' + current + "'s turn";
      }
      function closedText(p, count) {
        var what = count === 2 ? 'closed two boxes' : 'closed a box';
        if (mode === 'computer' && p === COMPUTER) return 'Computer ' + what + ' and goes again';
        return nameOf(p) + ' ' + what + ', go again';
      }
      function resultText() {
        var a = state.score[1], b = state.score[2];
        if (a === b) return "It's a draw, " + a + ' boxes each';
        var winner = a > b ? 1 : 2, hi = Math.max(a, b), lo = Math.min(a, b);
        var who = mode === 'computer' ? (winner === HUMAN ? 'You win' : 'Computer wins') : 'Player ' + winner + ' wins';
        return who + ', ' + hi + ' boxes to ' + lo;
      }
      function dotName(d) { return 'dot row ' + (d[0] + 1) + ' column ' + (d[1] + 1); }
      function lineLabel(id) {
        var L = lineInfo(state, id);
        return 'Line between ' + dotName(L.from) + ' and ' + dotName(L.to) + (state.drawn[id] ? ', drawn' : '');
      }

      /* ---- settings handlers ---- */
      function setMode(m) {
        mode = m;
        api.store.set('mode', m);
        modeComputer.setAttribute('aria-pressed', String(m === 'computer'));
        modeTwo.setAttribute('aria-pressed', String(m === 'two'));
        levelSeg.hidden = m !== 'computer';
        starterSeg.hidden = m !== 'computer';
        newGame();
      }
      function setLevel(l) {
        level = l;
        api.store.set('level', l);
        levelEasy.setAttribute('aria-pressed', String(l === 'easy'));
        levelHard.setAttribute('aria-pressed', String(l === 'hard'));
        /* no reset: the new level simply applies from the computer's next move */
      }
      function setStarter(s) {
        starter = s;
        api.store.set('starter', s);
        startYou.setAttribute('aria-pressed', String(s === 'you'));
        startComputer.setAttribute('aria-pressed', String(s === 'computer'));
        newGame();
      }
      function setSize(k) {
        if (!SIZES[k]) return;
        sizeKey = k;
        api.store.set('size', k);
        newGame();
      }

      /* ---- sizing: fit the board to the space available ----
         Each track is MIN_UNIT to MAX_UNIT px. The line buttons stay at least HIT px even when the
         tracks are smaller (see the CSS), so a 5 by 5 board fits a phone without sideways scrolling.
         A 7 by 7 board on a narrow phone still will not fit, so then the scroll note is shown. */
      function fitBoard() {
        if (!state) return;
        var tracks = 2 * state.n + 1;
        var avail = root.clientWidth || 320;
        var unit = Math.floor(avail / tracks);
        /* below HIT px the end buttons poke out past the grid by (HIT - unit) / 2 on each side,
           so the whole board is unit * (tracks - 1) + HIT wide: solve that for unit instead */
        if (unit < HIT) unit = Math.floor((avail - HIT) / (tracks - 1));
        unit = Math.max(MIN_UNIT, Math.min(MAX_UNIT, unit));
        grid.style.setProperty('--unit', unit + 'px');
        scrollNote.hidden = board.scrollWidth <= board.clientWidth;
      }
      var observer = null;
      if (typeof ResizeObserver === 'function') { observer = new ResizeObserver(fitBoard); observer.observe(root); }
      else window.addEventListener('resize', fitBoard);

      /* ---- building the board ----
         The grid has (2n + 1) by (2n + 1) cells. Even row and even column: a dot. Even row, odd column:
         a horizontal line. Odd row, even column: a vertical line. Odd row and odd column: a box. */
      function buildGrid() {
        var n = state.n, tracks = 2 * n + 1;
        lineButtons = []; buttonById = {}; boxEls = [];
        grid.replaceChildren();
        grid.style.setProperty('--tracks', String(tracks));
        grid.setAttribute('aria-label', 'Dots and Boxes board, ' + n + ' by ' + n + ' boxes');
        for (var i = 0; i < tracks; i++) {
          for (var j = 0; j < tracks; j++) {
            var el;
            if (i % 2 === 0 && j % 2 === 0) {
              el = h('span', { class: 'dot', 'aria-hidden': 'true' });
            } else if (i % 2 === 0) {
              el = makeLine(hId(state, i / 2, (j - 1) / 2), 'line-h', i, j);
            } else if (j % 2 === 0) {
              el = makeLine(vId(state, (i - 1) / 2, j / 2), 'line-v', i, j);
            } else {
              var b = ((i - 1) / 2) * n + (j - 1) / 2;
              el = h('div', { class: 'box', 'aria-hidden': 'true' });
              boxEls[b] = el;
            }
            grid.appendChild(el);
          }
        }
        fitBoard();
      }
      function makeLine(id, kindClass, i, j) {
        var btn = h('button', { type: 'button', class: 'line ' + kindClass, 'data-id': String(id), 'data-row': String(i), 'data-col': String(j), 'aria-label': lineLabel(id) });
        btn.addEventListener('click', function () { humanPlays(id, btn); });
        lineButtons.push(btn);
        buttonById[id] = btn;
        return btn;
      }
      function rowOf(btn) { return Number(btn.getAttribute('data-row')); }
      function colOf(btn) { return Number(btn.getAttribute('data-col')); }

      /* ---- keeping keyboard focus somewhere useful ----
         A disabled button cannot hold focus: the browser quietly drops focus to the page, and a keyboard
         user would have to Tab all the way back from the top. So before a focused line is disabled
         (whether the player or the computer drew it) focus is handed to the nearest line that can still
         be drawn, or to New game when the board is full. */
      function nearestUndrawn(from) {
        var i = rowOf(from), j = colOf(from), best = null, bestDist = Infinity;
        for (var k = 0; k < lineButtons.length; k++) {
          var b = lineButtons[k];
          if (b === from || b.disabled) continue;
          var dist = Math.abs(rowOf(b) - i) + Math.abs(colOf(b) - j);
          if (dist < bestDist) { bestDist = dist; best = b; }
        }
        return best;
      }
      function keepFocusOff(btn) {
        if (document.activeElement !== btn) return;
        var next = nearestUndrawn(btn) || newGameBtn;
        next.focus({ preventScroll: true });
      }

      /* ---- rendering changes ---- */
      function renderLine(id) {
        var btn = buttonById[id];
        keepFocusOff(btn);
        btn.classList.add('is-drawn');
        btn.disabled = true;
        btn.setAttribute('aria-label', lineLabel(id));
        if (lastLine >= 0) buttonById[lastLine].classList.remove('is-last');
        btn.classList.add('is-last');
        lastLine = id;
      }
      function renderBoxes(ids) {
        for (var i = 0; i < ids.length; i++) {
          var b = ids[i], p = state.owner[b], el = boxEls[b];
          if (!p || el.classList.contains('is-p' + p)) continue;
          el.classList.add('is-p' + p);
          if (!api.reducedMotion) el.classList.add('is-new');
          el.textContent = initialOf(p);
        }
      }
      function renderScore() {
        name1.textContent = nameOf(1) + ': ';
        name2.textContent = nameOf(2) + ': ';
        score1.textContent = String(state.score[1]);
        score2.textContent = String(state.score[2]);
        scoreP1.classList.toggle('is-active', !over && current === 1);
        scoreP2.classList.toggle('is-active', !over && current === 2);
        linesLeft.textContent = state.left === 1 ? '1 line left' : state.left + ' lines left';
      }

      /* ---- playing ---- */
      function newGame() {
        generation++;
        if (timer) { clearTimeout(timer); timer = null; }
        state = newState(SIZES[sizeKey]);
        /* Player 1 always starts a two-player game; against the computer the player chooses who starts */
        current = (mode === 'computer' && starter === 'computer') ? COMPUTER : HUMAN;
        over = false;
        lastLine = -1;
        buildGrid();
        renderScore();
        api.status(turnText());
        if (mode === 'computer' && current === COMPUTER) scheduleComputer();
      }

      /* Apply one move to the real board. Returns how many boxes it closed. */
      function applyMove(id) {
        var closed = drawLine(state, id, current);
        renderLine(id);
        renderBoxes(boxesOfLine(state, id));
        return closed;
      }

      /* After any move: finish the game, let the same player go again, or pass the turn. */
      function afterMove(closed) {
        if (state.left === 0) {
          over = true;
          renderScore();
          api.status(resultText());
          api.announce(resultText());
          return;
        }
        if (closed) {
          api.status(closedText(current, closed));
        } else {
          current = 3 - current;
          api.status(turnText());
        }
        renderScore();
        if (mode === 'computer' && current === COMPUTER) scheduleComputer();
      }

      function humanPlays(id) {
        if (over || state.drawn[id]) return;
        if (mode === 'computer' && current === COMPUTER) return;   /* wait for the computer */
        var closed = applyMove(id);
        afterMove(closed);
      }

      function scheduleComputer() {
        var gen = generation;
        var wait = api.reducedMotion ? 0 : THINK_MS;
        timer = setTimeout(function () {
          timer = null;
          if (gen !== generation || over) return;   /* a new game started while we were thinking */
          computerPlays();
        }, wait);
      }
      function computerPlays() {
        var id = level === 'hard' ? hardMove(state, api.random) : easyMove(state, api.random);
        var L = lineInfo(state, id);
        var closed = applyMove(id);
        api.announce('Computer drew the line between ' + dotName(L.from) + ' and ' + dotName(L.to) + (closed ? ' and closed a box' : ''));
        afterMove(closed);
      }

      /* ---- arrow keys ----
         An arrow key moves focus to the nearest undrawn line in that direction. A line straight ahead
         wins, which keeps you on lines of the same kind (along a row of horizontals, say). When nothing
         lies straight ahead, or when Shift is held, the nearest line off to one side is chosen instead:
         that is how you turn a corner from a horizontal line onto a vertical one. Tab still visits
         every undrawn line in reading order. */
      function onGridKey(ev) {
        var t = ev.target;
        if (!t || !t.classList || !t.classList.contains('line')) return;
        var di = 0, dj = 0;
        if (ev.key === 'ArrowUp') di = -1; else if (ev.key === 'ArrowDown') di = 1;
        else if (ev.key === 'ArrowLeft') dj = -1; else if (ev.key === 'ArrowRight') dj = 1;
        else return;
        ev.preventDefault();
        var target = lineInDirection(t, di, dj, ev.shiftKey);
        if (target) target.focus();
      }
      function lineInDirection(from, di, dj, turn) {
        var i = rowOf(from), j = colOf(from), best = null, bestScore = Infinity;
        for (var k = 0; k < lineButtons.length; k++) {
          var b = lineButtons[k];
          if (b === from || b.disabled) continue;
          var bi = rowOf(b), bj = colOf(b);
          var ahead = di ? (bi - i) * di : (bj - j) * dj;          /* cells forward in the arrow's direction */
          var aside = di ? Math.abs(bj - j) : Math.abs(bi - i);     /* cells off to the side */
          if (ahead <= 0) continue;                                 /* behind us or level with us */
          if (turn && aside === 0) continue;                        /* Shift: skip anything straight ahead */
          var score = ahead + aside + (aside === 0 ? 0 : 1000);     /* straight ahead beats anything off to the side */
          if (score < bestScore) { bestScore = score; best = b; }
        }
        return best;
      }

      /* ---- start ---- */
      modeComputer.setAttribute('aria-pressed', String(mode === 'computer'));
      modeTwo.setAttribute('aria-pressed', String(mode === 'two'));
      levelSeg.hidden = mode !== 'computer';
      starterSeg.hidden = mode !== 'computer';
      levelEasy.setAttribute('aria-pressed', String(level === 'easy'));
      levelHard.setAttribute('aria-pressed', String(level === 'hard'));
      startYou.setAttribute('aria-pressed', String(starter === 'you'));
      startComputer.setAttribute('aria-pressed', String(starter === 'computer'));
      sizeSelect.value = sizeKey;
      newGame();

      return {
        destroy: function () {
          generation++;
          if (timer) { clearTimeout(timer); timer = null; }
          if (observer) observer.disconnect();
          else window.removeEventListener('resize', fitBoard);
        }
      };
    }
  });
})();
