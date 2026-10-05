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

  /* Boxes per side. The keys are only names the game remembers, so they never change; the labels a
     player sees are in the Board menu (Small, Medium, Big, Huge). 4 by 4 has an even number of boxes,
     so it is the only board that can end in a draw. */
  var SIZES = { small: 3, even: 4, medium: 5, large: 7 };
  var THINK_MS = 350;                                /* the computer's pause before it moves */
  var THINK_AGAIN_MS = 150;                          /* a shorter pause between boxes while the computer eats a chain */
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
     The game sits on the site's puzzle page (frame: 'paper'): cream paper, dark ink and a navy
     brand colour, all set by the frame's colour variables.
     ===================================================================== */
  /* The board is a grid of "tracks" (columns and rows), one track for each dot, line or box.
     A track is MIN_UNIT to MAX_UNIT px wide, chosen to fit the space (see fitBoard). */
  var MIN_UNIT = 14, MAX_UNIT = 72;
  var HIT = 36;            /* line buttons are at least this big wherever the board has room */
  var MIN_HIT = 30;        /* and never smaller than this: the contract's size for board cells that would not otherwise fit */
  /* On wider screens the board is also kept short enough to sit on screen with the status line above it.
     These are the parts of the window height that are not board: the site header, the status line, the
     frame's padding and a little space below (on the page), or the buttons under the frame (classroom mode). */
  var PAGE_RESERVE = 210, CLASSROOM_RESERVE = 330;

  var CSS =
    /* Player colours on the puzzle page: Player 1 (You) is the page's navy ink and Player 2 (the
       Computer) is the page's red. Navy and red differ in brightness (about 1.6 to 1) and sit far apart
       in hue, so they stay distinct for colour-blind players and on a washed-out projector, and every
       box also carries its owner's letter. Both take cream letters (10 to 1 and 6 to 1). */
    '.game-dots-and-boxes { --dab-p1: var(--brand); --dab-p1-ink: var(--on-brand); --dab-p2: var(--red); --dab-p2-ink: var(--surface); }' +
    /* the board has no side padding, so the grid can use the full width before it needs to scroll */
    '.game-dots-and-boxes .board { overflow-x: auto; overflow-y: hidden; padding: 6px 0; margin-bottom: .5rem; }' +
    /* On phones the board also borrows 10px of the page's padding on each side (the frame keeps at least
       12px there, so nothing reaches the edge that clips it). That is what lets the 7 by 7 board keep
       36px line buttons at 360px. Only the invisible outer halves of the outer line buttons use it. */
    '@media (max-width: 480px) { .game-dots-and-boxes .board { max-width: none; margin-inline: -10px; } }' +
    /* "Board" and its drop-down wrap onto two lines on the narrowest phones, never past the frame. */
    '.game-dots-and-boxes .field { flex-wrap: wrap; max-width: 100%; }' +
    '.game-dots-and-boxes .field select { max-width: 100%; min-width: 0; }' +
    /* --unit is the width of one track, set by fitBoard(). --hit is the size of a line button: two tracks,
       but never less than MIN_HIT px. --pad is how far a line button pokes out past its own track on each
       side; the grid has that much padding so the outer line buttons still fit inside the board. */
    '.game-dots-and-boxes .grid { --unit: 44px; --hit: max(calc(var(--unit) * 2), ' + MIN_HIT + 'px); --pad: calc((var(--hit) - var(--unit)) / 2); display: grid; grid-template-columns: repeat(var(--tracks), var(--unit)); grid-auto-rows: var(--unit); width: max-content; margin: 0 auto; padding: var(--pad); }' +
    /* dots sit on top of everything, but taps pass straight through them to the line buttons beneath */
    '.game-dots-and-boxes .dot { position: relative; z-index: 3; pointer-events: none; }' +
    '.game-dots-and-boxes .dot::before { content: ""; position: absolute; left: 50%; top: 50%; width: max(8px, calc(var(--unit) * .32)); height: max(8px, calc(var(--unit) * .32)); border-radius: 50%; background: var(--ink); transform: translate(-50%, -50%); }' +
    /* Every line is a button shaped like a diamond (a square turned on its corner). The diamond's four
       corners are the line's two dots and the middles of the boxes on either side of it, so the diamonds
       fit together like floor tiles with no gaps and no overlaps: wherever you tap, you get the line
       that is closest to your finger. Each button is --hit px square, centred on its own track with
       negative margins, and clip-path cuts it to the diamond. fitBoard() keeps --hit at exactly two
       tracks on every phone, so the tiles never overlap; only on a screen narrower than any phone would
       the MIN_HIT floor make them overlap. The visible bar is drawn with ::before. */
    '.game-dots-and-boxes .line { position: relative; z-index: 1; display: block; width: var(--hit); height: var(--hit); margin: calc(0px - var(--pad)); padding: 0; border: 0; background: transparent; border-radius: 50%; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }' +
    /* An undrawn line is the ink colour at a little over half strength: about 3.7:1 against the paper
       (--line is too faint to see on a projector), and still clearly lighter than a drawn line. */
    '.game-dots-and-boxes .line::before { content: ""; position: absolute; border-radius: 999px; background: var(--ink); opacity: .55; pointer-events: none; transition: background-color .12s, opacity .12s, left .12s, right .12s, top .12s, bottom .12s; }' +
    '.game-dots-and-boxes .line-h::before { top: 50%; height: max(4px, calc(var(--unit) * .18)); left: calc(var(--pad) + var(--unit) * .1); right: calc(var(--pad) + var(--unit) * .1); transform: translateY(-50%); }' +
    '.game-dots-and-boxes .line-v::before { left: 50%; width: max(4px, calc(var(--unit) * .18)); top: calc(var(--pad) + var(--unit) * .1); bottom: calc(var(--pad) + var(--unit) * .1); transform: translateX(-50%); }' +
    '.game-dots-and-boxes .line:hover::before, .game-dots-and-boxes .line:focus-visible::before { background: var(--ink-muted); opacity: 1; }' +
    /* The diamond would cut off a normal focus outline, so the outline is pulled inwards (a negative
       offset) until it is a circle around the line that fits inside the diamond. */
    '.game-dots-and-boxes .line:focus-visible { outline: 3px solid var(--focus); outline-offset: calc(var(--unit) * .65 - var(--hit) / 2); z-index: 2; }' +
    /* A drawn line reaches the centre of each dot; the dots are painted over the top. Taps fall through a
       drawn line to the grid behind it, which buzzes: that line is already taken. */
    '.game-dots-and-boxes .line.is-drawn { cursor: default; pointer-events: none; }' +
    '.game-dots-and-boxes .line.is-drawn::before, .game-dots-and-boxes .line.is-drawn:hover::before { background: var(--ink); opacity: 1; }' +
    '.game-dots-and-boxes .line-h.is-drawn::before { left: calc(var(--pad) - var(--unit) * .5); right: calc(var(--pad) - var(--unit) * .5); }' +
    '.game-dots-and-boxes .line-v.is-drawn::before { top: calc(var(--pad) - var(--unit) * .5); bottom: calc(var(--pad) - var(--unit) * .5); }' +
    /* The newest line is drawn in, like a pencil stroke, in the colour of whoever drew it, with a glow. */
    '.game-dots-and-boxes .line-h.is-new::before { transform-origin: left center; animation: game-dots-and-boxes-draw-h .22s ease-out; }' +
    '.game-dots-and-boxes .line-v.is-new::before { transform-origin: center top; animation: game-dots-and-boxes-draw-v .22s ease-out; }' +
    '@keyframes game-dots-and-boxes-draw-h { from { scale: 0 1; } to { scale: 1 1; } }' +
    '@keyframes game-dots-and-boxes-draw-v { from { scale: 1 0; } to { scale: 1 1; } }' +
    '.game-dots-and-boxes .line.is-last::before { box-shadow: 0 0 0 3px var(--brass-bright); }' +
    '.game-dots-and-boxes .line.is-last.by-p1::before { background: var(--dab-p1); }' +
    '.game-dots-and-boxes .line.is-last.by-p2::before { background: var(--dab-p2); }' +
    /* boxes: the box cell is one track wide, so a claimed box grows (negative margins) to fill the whole square
       between its four dots; it is painted beneath the lines and dots because they are positioned with a z-index */
    '.game-dots-and-boxes .box { display: flex; align-items: center; justify-content: center; margin: calc(var(--unit) * -.5 + 4px); border-radius: 6px; font-family: var(--font-display); font-size: calc(var(--unit) * .8); line-height: 1; }' +
    '.game-dots-and-boxes .box.is-p1 { background: var(--dab-p1); color: var(--dab-p1-ink); }' +
    '.game-dots-and-boxes .box.is-p2 { background: var(--dab-p2); color: var(--dab-p2-ink); }' +
    /* A claimed box lands like a rubber stamp; at the end the winner's boxes bounce in turn. */
    '.game-dots-and-boxes .box.is-new { animation: game-dots-and-boxes-stamp .34s cubic-bezier(.3, 1.5, .5, 1); }' +
    '@keyframes game-dots-and-boxes-stamp { 0% { scale: .3; rotate: -14deg; } 100% { scale: 1; rotate: 0deg; } }' +
    '.game-dots-and-boxes .box.is-cheer { animation: game-dots-and-boxes-cheer .5s ease-in-out both; }' +
    '@keyframes game-dots-and-boxes-cheer { 0%, 100% { scale: 1; rotate: 0deg; } 45% { scale: 1.16; rotate: -5deg; } }' +
    /* scoreboard: the number hops when it goes up */
    '.game-dots-and-boxes .score { padding: .1rem .35rem; border-radius: 6px; border: 2px solid transparent; }' +
    '.game-dots-and-boxes .score.is-active { border-color: var(--brass); }' +
    '.game-dots-and-boxes .score b { display: inline-block; min-width: 1ch; }' +
    '.game-dots-and-boxes .score b.is-bump { animation: game-dots-and-boxes-bump .32s ease-out; }' +
    '@keyframes game-dots-and-boxes-bump { 40% { scale: 1.35; } }' +
    '.game-dots-and-boxes .swatch { display: inline-block; width: 1em; height: 1em; border-radius: 3px; }' +
    '.game-dots-and-boxes .swatch-p1 { background: var(--dab-p1); }' +
    '.game-dots-and-boxes .swatch-p2 { background: var(--dab-p2); }' +
    '.game-dots-and-boxes .lines-left { color: var(--ink-muted); font-weight: 400; }' +
    '.game-dots-and-boxes .scroll-note { margin: -.25rem 0 .5rem; text-align: center; }' +
    /* On a phone the settings push the status line far above the board, so a short copy of
       "whose turn" sits right above the board. Bigger screens do not need it. */
    '.game-dots-and-boxes .turn-line { display: none; align-items: center; gap: .4rem; margin: 0 0 .4rem; font-weight: 700; }' +
    '@media (max-width: 600px) {' +
      '.game-dots-and-boxes .turn-line { display: flex; }' +
      /* a tighter toolbar, so more of it fits on each row */
      '.game-dots-and-boxes .game-toolbar { gap: .45rem .5rem; margin-bottom: .75rem; }' +
      '.game-dots-and-boxes .game-toolbar .seg button { padding: .4rem .5rem; font-size: .95rem; line-height: 1.3; }' +
      '.game-dots-and-boxes .scoreboard { gap: .35rem .9rem; margin-bottom: .5rem; }' +
    '}' +
    /* Classroom mode on a projector: a bigger score, and the notes give their room to the board. */
    '.classroom .game-dots-and-boxes .scoreboard { font-size: 1.45rem; justify-content: center; }' +
    '.classroom .game-dots-and-boxes .game-note:not(.scroll-note) { display: none; }';

  GamesInTime.register({
    id: 'dots-and-boxes',
    frame: 'paper',
    mount: function (root, api) {
      var h = api.h;
      var RM = !!api.reducedMotion;

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
      var generation = 0;        /* goes up on every New game, so an old timer can be ignored */
      var lineButtons = [];      /* every line <button>, in board order */
      var buttonById = {};       /* line id -> its button */
      var boxEls = [];           /* every box element, by box id */

      /* ---- timers: every pending timeout is kept, so New game and destroy() can cancel them ---- */
      var timers = [], destroyed = false;
      function later(fn, ms) {
        var id = setTimeout(function () {
          var k = timers.indexOf(id);
          if (k >= 0) timers.splice(k, 1);
          if (!destroyed) fn();
        }, ms);
        timers.push(id);
        return id;
      }
      function clearTimers() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers = []; }

      root.appendChild(h('style', null, CSS));

      /* ---- toolbar ---- */
      var modeComputer = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { api.sound('click'); setMode('computer'); } }, 'Play the computer');
      var modeTwo = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { api.sound('click'); setMode('two'); } }, 'Two players');
      var levelEasy = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { api.sound('click'); setLevel('easy'); } }, 'Easy');
      var levelHard = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { api.sound('click'); setLevel('hard'); } }, 'Hard');
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' }, levelEasy, levelHard);
      var startYou = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { api.sound('click'); setStarter('you'); } }, 'You first');
      var startComputer = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { api.sound('click'); setStarter('computer'); } }, 'Computer first');
      var starterSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Who starts' }, startYou, startComputer);
      /* The option values are the SIZES keys from the top of the file; the words are what a player sees. */
      var sizeSelect = h('select', { id: 'dab-size', onchange: function () { api.sound('click'); setSize(sizeSelect.value); } },
        h('option', { value: 'small' }, 'Small, 3 by 3'),
        h('option', { value: 'even' }, 'Medium, 4 by 4'),
        h('option', { value: 'medium' }, 'Big, 5 by 5'),
        h('option', { value: 'large' }, 'Huge, 7 by 7'));
      /* New game turns over to a fresh sheet of paper. */
      var newGameBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { api.sound('flip'); newGame(); } }, 'New game');
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
      /* the short "whose turn" line for phones; hidden from screen readers, which already hear the status line */
      var turnSwatch = h('i', { class: 'swatch' });
      var turnWords = h('span', null, '');
      var turnLine = h('p', { class: 'turn-line', 'aria-hidden': 'true' }, turnSwatch, turnWords);

      /* ---- board ---- */
      var grid = h('div', { class: 'grid', role: 'group', onkeydown: onGridKey, onclick: onGridClick });
      var board = h('div', { class: 'board' }, grid);
      /* shown only when the board is wider than the screen, which can only happen on a screen narrower than any phone */
      var scrollNote = h('p', { class: 'game-note scroll-note', hidden: true }, 'Scroll sideways to see the whole board.');

      root.appendChild(toolbar);
      root.appendChild(scoreboard);
      root.appendChild(turnLine);
      root.appendChild(board);
      root.appendChild(scrollNote);
      root.appendChild(h('p', { class: 'game-note' }, 'Close a box and you go again. Tip: try not to draw the third side of a box, because that hands it to the other player. The Medium board, 4 by 4, is the only one where a draw is possible.'));
      root.appendChild(h('p', { class: 'game-note' }, 'Keyboard: the arrow keys move along the lines, Shift with an arrow key turns a corner, Tab visits every line, and Enter draws.'));

      /* ---- names and words ---- */
      function nameOf(p) { return mode === 'computer' ? (p === HUMAN ? 'You' : 'Computer') : 'Player ' + p; }
      function initialOf(p) { return mode === 'computer' ? (p === HUMAN ? 'Y' : 'C') : String(p); }
      function shortTurnText() {
        if (mode === 'computer') return current === HUMAN ? 'Your turn' : "Computer's turn";
        return 'Player ' + current + "'s turn";
      }
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
        if (a === b) return "It's a draw, " + a + ' boxes each. Well matched!';
        var winner = a > b ? 1 : 2, score = Math.max(a, b) + ' boxes to ' + Math.min(a, b);
        if (mode !== 'computer') return 'Player ' + winner + ' wins, ' + score + '. Well played!';
        if (winner === HUMAN) return 'You win, ' + score + '! You beat the computer.';
        return 'Computer wins, ' + score + '. Good game! Have another go, and try not to draw the third side of a box.';
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
         Each track is MIN_UNIT to MAX_UNIT px. The whole grid is (tracks - 1) tracks plus one line button
         wide, because the outer line buttons poke out past the outer dots by half a button. While a button
         is two tracks wide that is (tracks + 1) tracks, and the diamonds tile with no overlap. That holds on
         every phone: at 360px the 7 by 7 board has 18px tracks and 36px buttons, and at 320px it has 16px
         tracks and 32px buttons (the contract allows board cells down to 30px when a board would not
         otherwise fit). Only below MIN_HIT does a button stay MIN_HIT px and overlap its neighbours.
         On wider screens, where the copy of the status line beside the board is hidden, the track size is
         also capped by the window height, so the status line, the controls and the whole board fit on
         screen together (but never below HIT / 2, so the buttons stay 36px). In classroom mode the cap uses
         the whole projector screen. If the board is ever wider than the space, the scroll note is shown and
         the board starts scrolled to the middle. */
      function fitBoard() {
        if (!state) return;
        var tracks = 2 * state.n + 1;
        var avail = board.clientWidth || root.clientWidth || 320;
        var unit = Math.floor(avail / (tracks + 1));
        if (unit * 2 < MIN_HIT) unit = Math.floor((avail - MIN_HIT) / (tracks - 1));
        if ((window.innerWidth || 0) > 600 && window.innerHeight) {
          var classroom = document.documentElement.classList.contains('classroom');
          var above = board.getBoundingClientRect().top - root.getBoundingClientRect().top;
          var byHeight = Math.floor((window.innerHeight - (classroom ? CLASSROOM_RESERVE : PAGE_RESERVE) - above) / (tracks + 1));
          unit = Math.min(unit, Math.max(byHeight, HIT / 2));
        }
        unit = Math.max(MIN_UNIT, Math.min(MAX_UNIT, unit));
        grid.style.setProperty('--unit', unit + 'px');
        var spare = board.scrollWidth - board.clientWidth;
        scrollNote.hidden = spare <= 0;
        if (spare > 0) board.scrollLeft = spare / 2;
      }
      var observer = null;
      if (typeof ResizeObserver === 'function') { observer = new ResizeObserver(fitBoard); observer.observe(root); }
      /* The window's height matters too (and the observer does not see it change), so listen for resizes. */
      window.addEventListener('resize', fitBoard);

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
        btn.addEventListener('click', function () { humanPlays(id); });
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
        btn.classList.add('is-drawn', 'by-p' + current);
        if (!RM) btn.classList.add('is-new');
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
          if (!RM) el.classList.add('is-new');
          el.textContent = initialOf(p);
        }
      }
      /* Replays a short CSS animation: the class comes off, the browser lays the page out (reading
         offsetWidth forces that), and the class goes back on. */
      function bump(el) {
        if (RM) return;
        el.classList.remove('is-bump');
        void el.offsetWidth;
        el.classList.add('is-bump');
      }
      function renderScore() {
        name1.textContent = nameOf(1) + ': ';
        name2.textContent = nameOf(2) + ': ';
        if (score1.textContent !== String(state.score[1])) { score1.textContent = String(state.score[1]); if (state.score[1]) bump(score1); }
        if (score2.textContent !== String(state.score[2])) { score2.textContent = String(state.score[2]); if (state.score[2]) bump(score2); }
        scoreP1.classList.toggle('is-active', !over && current === 1);
        scoreP2.classList.toggle('is-active', !over && current === 2);
        linesLeft.textContent = state.left === 1 ? '1 line left' : state.left + ' lines left';
        /* the phone turn line: a colour square for the player whose turn it is, then the words */
        turnSwatch.className = 'swatch swatch-p' + current;
        turnSwatch.hidden = over;
        turnWords.textContent = over ? resultText() : shortTurnText();
      }

      /* ---- playing ---- */
      function newGame() {
        generation++;
        clearTimers();
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

      /* Apply one move to the real board. Returns how many boxes it closed. The pencil scratches, and
         each box it closes gives a pop. */
      function applyMove(id) {
        var closed = drawLine(state, id, current);
        renderLine(id);
        renderBoxes(boxesOfLine(state, id));
        api.sound('chalk');
        for (var k = 0; k < closed; k++) later(function () { api.sound('pop'); }, (RM ? 0 : 120) + k * 110);
        return closed;
      }

      /* After any move: finish the game, let the same player go again, or pass the turn. */
      function afterMove(closed) {
        if (state.left === 0) {
          over = true;
          renderScore();
          api.status(resultText());   /* the status line is read out by screen readers, so no extra announcement */
          endOfGame();
          return;
        }
        if (closed) {
          api.status(closedText(current, closed));
        } else {
          current = 3 - current;
          api.status(turnText());
        }
        renderScore();
        /* If the computer has just closed a box it goes again, and only needs a short pause,
           so eating a long chain does not keep the player waiting for ages. */
        if (mode === 'computer' && current === COMPUTER) scheduleComputer(closed > 0);
      }

      /* A win gets the site's celebration (confetti, a fanfare, a toast and a star on the ticket), and the
         winner's boxes bounce in turn. A loss to the computer gets a gentle "lose" tune and a kind word on
         the status line; a draw rings the bell. */
      function endOfGame() {
        var a = state.score[1], b = state.score[2];
        if (a === b) { api.sound('bell'); return; }
        var winner = a > b ? 1 : 2, score = Math.max(a, b) + ' boxes to ' + Math.min(a, b);
        if (mode === 'computer' && winner === COMPUTER) api.sound('lose');
        else api.celebrate(mode === 'computer' ? 'You beat the computer, ' + score + '!' : 'Player ' + winner + ' wins, ' + score + '!');
        if (RM) return;
        for (var k = 0, n = 0; k < boxEls.length; k++) {
          if (state.owner[k] !== winner) continue;
          boxEls[k].classList.remove('is-new');
          boxEls[k].style.animationDelay = (250 + n * 60) + 'ms';
          boxEls[k].classList.add('is-cheer');
          n++;
        }
      }

      function humanPlays(id) {
        if (over || state.drawn[id]) return;
        if (mode === 'computer' && current === COMPUTER) { api.sound('wrong'); return; }   /* wait for the computer */
        var closed = applyMove(id);
        afterMove(closed);
      }

      /* A tap that misses every line that can still be drawn lands on a drawn line (drawn lines let taps
         fall through to the grid) or on a claimed box. That is not a move, so it just buzzes. Taps in the
         grid's outer padding, beyond the dots, are ignored. */
      function onGridClick(ev) {
        var t = ev.target;
        if (over || !t || !t.closest || t.closest('.line')) return;
        var r = grid.getBoundingClientRect(), pad = parseFloat(getComputedStyle(grid).paddingLeft) || 0;
        if (ev.clientX < r.left + pad || ev.clientX > r.right - pad || ev.clientY < r.top + pad || ev.clientY > r.bottom - pad) return;
        api.sound('wrong');
      }

      /* goAgain is true when the computer has just closed a box and is moving again in the same turn */
      function scheduleComputer(goAgain) {
        var gen = generation;
        var wait = RM ? 0 : (goAgain ? THINK_AGAIN_MS : THINK_MS);
        later(function () {
          if (gen !== generation || over) return;   /* a new game started while we were thinking */
          computerPlays();
        }, wait);
      }
      function computerPlays() {
        var id = level === 'hard' ? hardMove(state, api.random) : easyMove(state, api.random);
        var L = lineInfo(state, id);
        var closed = applyMove(id);
        var boxWords = closed === 2 ? ' and closed two boxes' : closed === 1 ? ' and closed a box' : '';
        api.announce('Computer drew the line between ' + dotName(L.from) + ' and ' + dotName(L.to) + boxWords);
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
          destroyed = true;
          generation++;
          clearTimers();
          if (observer) observer.disconnect();
          window.removeEventListener('resize', fitBoard);
        }
      };
    }
  });
})();
