/* Reversi, England 1883. See docs/ADDING-A-GAME.md for the contract this file follows.

   These are the 1883 rules, not modern Othello:
   - The board starts completely empty. The first four moves place discs in the
     centre four squares, Dark first, in any arrangement the players choose.
   - After that, a move must trap at least one enemy disc in a straight line
     (any of eight directions) between the new disc and one of your own.
     Every trapped disc flips to your colour.
   - If you cannot move, you pass. The game ends when neither player can move
     or the board is full. The player with more discs wins; equal is a draw.

   Everything the game needs is in this one file: the board, the rules, the
   computer player and the styles. The board sits on the site's wooden games
   table (frame: 'table'), so every colour comes from the hall's and the
   table's colour variables. */
(function () {
  'use strict';

  var SIZE = 8;                  // the board is 8 by 8
  var EMPTY = 0, DARK = 1, LIGHT = 2;
  var CENTRE = [27, 28, 35, 36]; // the four centre squares (rows 4 and 5, columns 4 and 5)

  /* The eight directions you can look in from a square: up, down, left, right
     and the four diagonals. Each is [row change, column change]. */
  var DIRECTIONS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

  /* How much the Hard computer likes each square, before it counts flips.
     Corners (100) can never be flipped, so they are gold. The squares next to
     a corner are dangerous (-25 beside it, -50 diagonally): if you sit there,
     you often hand the corner to your opponent. Edges (10) are strong because
     they can only be attacked along the edge. The middle is worth little
     either way, because middle discs flip back and forth all game. */
  var WEIGHTS = [
    100, -25,  10,   5,   5,  10, -25, 100,
    -25, -50,  -2,  -2,  -2,  -2, -50, -25,
     10,  -2,   5,   1,   1,   5,  -2,  10,
      5,  -2,   1,   0,   0,   1,  -2,   5,
      5,  -2,   1,   0,   0,   1,  -2,   5,
     10,  -2,   5,   1,   1,   5,  -2,  10,
    -25, -50,  -2,  -2,  -2,  -2, -50, -25,
    100, -25,  10,   5,   5,  10, -25, 100
  ];

  /* For each dangerous square, which corner it sits next to. Once that corner
     is already yours, the square stops being dangerous. */
  var NEAR_CORNER = { 1: 0, 8: 0, 9: 0, 6: 7, 14: 7, 15: 7, 48: 56, 49: 56, 57: 56, 54: 63, 55: 63, 62: 63 };

  /* ---------- pure rules: these functions only look at a board array ---------- */

  function other(colour) { return colour === DARK ? LIGHT : DARK; }

  function isOpening(board) {
    // The opening lasts until all four centre squares hold a disc.
    for (var i = 0; i < CENTRE.length; i++) if (board[CENTRE[i]] === EMPTY) return true;
    return false;
  }

  /* Returns the list of enemy discs that would flip if `colour` played at
     `index`. An empty list means the move is not legal (after the opening). */
  function flipsFor(board, index, colour) {
    if (board[index] !== EMPTY) return [];
    var row = Math.floor(index / SIZE), col = index % SIZE, enemy = other(colour), flips = [];
    for (var d = 0; d < DIRECTIONS.length; d++) {
      var dr = DIRECTIONS[d][0], dc = DIRECTIONS[d][1];
      var r = row + dr, c = col + dc, line = [];
      // Walk in this direction while we keep seeing enemy discs.
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === enemy) {
        line.push(r * SIZE + c);
        r += dr; c += dc;
      }
      // The line only counts if it ends on one of our own discs.
      if (line.length && r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === colour) {
        flips = flips.concat(line);
      }
    }
    return flips;
  }

  /* Every legal move for `colour`, as [{index, flips}]. During the opening the
     legal moves are simply the empty centre squares, and nothing flips. */
  function legalMoves(board, colour) {
    var moves = [], i;
    if (isOpening(board)) {
      for (i = 0; i < CENTRE.length; i++) if (board[CENTRE[i]] === EMPTY) moves.push({ index: CENTRE[i], flips: [] });
      return moves;
    }
    for (i = 0; i < board.length; i++) {
      var f = flipsFor(board, i, colour);
      if (f.length) moves.push({ index: i, flips: f });
    }
    return moves;
  }

  /* Plays a move on a copy of the board and returns the new board. */
  function play(board, move, colour) {
    var next = board.slice();
    next[move.index] = colour;
    for (var i = 0; i < move.flips.length; i++) next[move.flips[i]] = colour;
    return next;
  }

  function count(board, colour) {
    var n = 0;
    for (var i = 0; i < board.length; i++) if (board[i] === colour) n++;
    return n;
  }

  /* ---------- the computer player ---------- */

  /* How good is a square for `colour`, given what is already on the board? */
  function squareValue(board, index, colour) {
    var corner = NEAR_CORNER[index];
    // A square next to a corner is only dangerous while that corner is not ours.
    if (corner !== undefined && board[corner] === colour) return 10;
    return WEIGHTS[index];
  }

  /* Scores one move with no look-ahead: the square it takes, plus the discs it flips. */
  function quickScore(board, move, colour) {
    return squareValue(board, move.index, colour) + 2 * move.flips.length;
  }

  /* Hard: for every legal move, add up
       1. the value of the square it lands on (see WEIGHTS above),
       2. two points for every disc it flips,
       3. minus three points for every move it leaves the opponent
          (fewer choices for them is better for us), and
       4. minus the best reply the opponent could make, scored the same way.
          That last step is the "two-ply look-ahead": we think one move ahead
          for us and one move ahead for them.
     Near the end of the game, when only a few empty squares are left, nothing
     matters except how many discs you end with, so it just counts flips. */
  function chooseHard(board, colour, random) {
    var moves = legalMoves(board, colour);
    var enemy = other(colour);
    var empties = board.length - count(board, DARK) - count(board, LIGHT);
    var endgame = empties <= 8;
    var best = null, bestScore = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var move = moves[i];
      var after = play(board, move, colour);
      var score;
      if (endgame) {
        score = move.flips.length;
      } else {
        score = quickScore(board, move, colour);
        var replies = legalMoves(after, enemy);
        score -= 3 * replies.length;
        /* The best reply starts at minus infinity, not at 0. When every reply the opponent has is
           bad for them (all of them next to an empty corner, say), the best of those bad replies
           is still a negative number, and taking it away rewards the move that forces them there.
           With no reply at all they must pass, which counts as 0. */
        var bestReply = replies.length ? -Infinity : 0;
        for (var j = 0; j < replies.length; j++) {
          bestReply = Math.max(bestReply, quickScore(after, replies[j], enemy));
        }
        score -= bestReply;
      }
      score += random() * 0.5; // a tiny shuffle so the computer does not always play the same game
      if (score > bestScore) { bestScore = score; best = move; }
    }
    return best;
  }

  /* Easy: any legal move at all. During the opening both levels just take an
     empty centre square, which is all the 1883 rules allow. */
  function chooseEasy(board, colour, random) {
    var moves = legalMoves(board, colour);
    return moves[Math.floor(random() * moves.length)] || null;
  }

  /* ---------- the look ---------- */

  var CSS = [
    /* The site has one committed dark theme, so the disc colours are fixed: the Dark disc is the
       hall's night ground (made darker still by a see-through black layer) with a pale rim, and
       the Light disc is the hall's cream ink. Against the teal baize that is about 17 to 1 between
       the two discs. The grid lines use the muted ink, which reads clearly on the teal. */
    '.game-reversi { --rv-dark: var(--bg); --rv-light: var(--ink); --rv-dark-rim: var(--ink-muted); --rv-light-rim: var(--surface-2); --rv-grid: var(--ink-muted); }',
    /* The shared segmented buttons and drop-down are 42px tall; this game makes its own copies 44px. */
    '.game-reversi .seg button, .game-reversi .field select { min-height: 44px; }',
    /* "Your colour" and its drop-down wrap onto two lines on the narrowest phones, never past the frame. */
    '.game-reversi .field { flex-wrap: wrap; max-width: 100%; }',
    '.game-reversi .field select { max-width: 100%; min-width: 0; }',
    /* "Show legal moves": a big 36px tick box drawn by the game, so it is as easy to hit as a button. */
    '.game-reversi .rv-check { display: inline-flex; align-items: center; gap: .55rem; min-height: 44px; font-weight: 700; cursor: pointer; }',
    '.game-reversi .rv-check input { position: relative; flex: none; width: 36px; height: 36px; margin: 0; border: 2px solid var(--ink-muted); border-radius: 10px; background: var(--surface-2); cursor: pointer; -webkit-appearance: none; appearance: none; }',
    '.game-reversi .rv-check input:checked { background: var(--gold); border-color: var(--gold); }',
    '.game-reversi .rv-check input::after { content: ""; position: absolute; left: 11px; top: 4px; width: 9px; height: 17px; border: solid var(--on-era); border-width: 0 4px 4px 0; transform: rotate(45deg); opacity: 0; }',
    '.game-reversi .rv-check input:checked::after { opacity: 1; }',
    '.game-reversi .rv-check:hover input { border-color: var(--link); }',
    /* The board: teal baize lit from above, in a brass rim. There are no gaps between the cells (gaps
       would steal width from the 8 columns on a phone); each cell draws its own thin line along its
       right and bottom edge instead. */
    '.game-reversi .rv-wrap { display: flex; flex-direction: column; align-items: center; }',
    '.game-reversi .rv-board { position: relative; display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 0; width: min(100%, 540px); padding: 0; overflow: hidden; background: radial-gradient(circle at 50% 36%, var(--brand-2), var(--brand) 74%) var(--brand); border: 4px solid var(--brass); border-radius: 8px; box-shadow: var(--shadow); }',
    '.game-reversi .rv-cell { position: relative; display: block; min-width: 0; padding: 0; margin: 0; border: 0; border-radius: 0; background: transparent; box-shadow: inset -1px -1px 0 var(--rv-grid); cursor: pointer; perspective: 360px; color: inherit; -webkit-appearance: none; appearance: none; }',
    '.game-reversi .rv-cell::before { content: ""; display: block; padding-top: 100%; }',
    /* Two different rings so a keyboard player can tell them apart: the focused cell gets a cream
       ring, the last move played gets a brass ring. */
    '.game-reversi .rv-cell:focus-visible { outline: 3px solid var(--on-brand); outline-offset: -3px; z-index: 1; }',
    '.game-reversi .rv-cell.is-legal:hover { background: color-mix(in srgb, var(--brand-2) 70%, var(--on-brand)); }',
    '.game-reversi .rv-cell.is-last { box-shadow: inset 0 0 0 3px var(--brass-bright), inset -1px -1px 0 var(--rv-grid); }',
    /* A disc is a real two-sided counter: a Dark face and a Light face back to back. Turning it over
       (rotateY 180 degrees) shows the other face, so a flip is a disc spinning over, not a colour
       swap. The Dark face also gets a see-through black layer and a thicker pale rim, so on a washed-
       out projector the two kinds of disc differ in shape as well as in shade. */
    '.game-reversi .rv-disc { position: absolute; left: 11%; top: 11%; width: 78%; height: 78%; transform-style: preserve-3d; transition: transform .44s cubic-bezier(.45, .05, .3, 1); pointer-events: none; }',
    '.game-reversi .rv-disc.is-light { transform: rotateY(180deg); }',
    '.game-reversi .rv-face { position: absolute; inset: 0; border-radius: 50%; -webkit-backface-visibility: hidden; backface-visibility: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, .45); }',
    '.game-reversi .rv-face-d { background-color: var(--rv-dark); background-image: radial-gradient(circle at 34% 30%, rgba(255, 255, 255, .34) 0, rgba(255, 255, 255, .1) 24%, rgba(255, 255, 255, 0) 46%), linear-gradient(rgba(0, 0, 0, .5), rgba(0, 0, 0, .5)); border: 3px solid var(--rv-dark-rim); }',
    '.game-reversi .rv-face-l { transform: rotateY(180deg); background-color: var(--rv-light); background-image: radial-gradient(circle at 34% 30%, rgba(255, 255, 255, .5) 0, rgba(255, 255, 255, 0) 40%); border: 2px solid var(--rv-light-rim); }',
    /* A disc just put down drops onto the board; at the end the winner\'s discs do a Mexican wave. */
    '.game-reversi .rv-disc.is-new { animation: game-reversi-drop .3s cubic-bezier(.3, 1.4, .5, 1); }',
    '@keyframes game-reversi-drop { 0% { scale: 1.5; translate: 0 -12%; } 100% { scale: 1; translate: 0 0; } }',
    '.game-reversi .rv-disc.is-cheer { animation: game-reversi-cheer .5s ease-in-out both; }',
    '@keyframes game-reversi-cheer { 0%, 100% { translate: 0 0; } 45% { translate: 0 -18%; } }',
    /* The small dot that marks a legal move. */
    '.game-reversi .rv-hint { position: absolute; left: 38%; top: 38%; width: 24%; height: 24%; border-radius: 50%; background: var(--brass-bright); opacity: .85; pointer-events: none; }',
    '.game-reversi .rv-hint.is-pop { animation: game-reversi-hint .25s ease-out; }',
    '@keyframes game-reversi-hint { from { scale: 0; } to { scale: 1; } }',
    /* A refused tap: a red ring on the square, with a little shake unless motion is reduced. */
    '.game-reversi .rv-cell.is-bad::after { content: ""; position: absolute; inset: 8%; z-index: 2; border-radius: 50%; border: 3px solid var(--red); pointer-events: none; }',
    '.game-reversi .rv-cell.is-bad.is-shake::after { animation: game-reversi-shake .36s ease-in-out; }',
    '@keyframes game-reversi-shake { 0%, 100% { translate: 0 0; } 20% { translate: -14% 0; } 40% { translate: 11% 0; } 60% { translate: -7% 0; } 80% { translate: 4% 0; } }',
    /* Little discs in the scoreboard; the number gives a hop when it changes. */
    '.game-reversi .scoreboard { justify-content: center; font-size: 1.15rem; }',
    '.game-reversi .rv-mini { display: inline-block; width: 1.1em; height: 1.1em; border-radius: 50%; }',
    '.game-reversi .rv-mini.is-dark { background: var(--rv-dark); border: 2px solid var(--ink-muted); }',
    '.game-reversi .rv-mini.is-light { background: var(--rv-light); border: 2px solid var(--ink-muted); }',
    '.game-reversi .scoreboard .is-turn { text-decoration: underline; text-decoration-color: var(--brass); text-decoration-thickness: 3px; text-underline-offset: .25em; }',
    '.game-reversi .rv-score-text.is-bump { animation: game-reversi-bump .32s ease-out; }',
    '@keyframes game-reversi-bump { 40% { scale: 1.25; } }',
    /* A copy of the status line that sits right above the board. It only shows on small screens,
       where the controls push the board a whole screen below the real status line. */
    '.game-reversi .rv-status-mirror { display: none; margin: 0 0 .6rem; padding-inline: .25rem; font-weight: 700; text-align: center; text-wrap: balance; }',
    '@media (max-width: 600px) { .game-reversi .rv-status-mirror { display: block; } }',
    /* On phones the board borrows 10px of the table\'s padding on each side. The table keeps at least
       12px there, so the board never reaches the edge that clips it. Each cell is then about 36.75px
       wide at 360px, 38px at 375px and 40px at 390px. */
    '@media (max-width: 480px) { .game-reversi .rv-board { width: calc(100% + 20px); max-width: none; margin-inline: -10px; border-width: 3px; border-radius: 6px; } }',
    /* On the very narrowest phones (320px) the brass rim stops being a border (which takes width away
       from the cells) and is drawn on top of the outer cells\' edges instead, by a see-through layer
       (::after) that taps pass straight through. Each cell is then 33px, as big as 8 cells can be. */
    '@media (max-width: 340px) { .game-reversi .rv-board { border: 0; } .game-reversi .rv-board::after { content: ""; position: absolute; inset: 0; z-index: 3; border: 3px solid var(--brass); border-radius: inherit; pointer-events: none; } }',
    /* Classroom mode on a projector: the board fills most of the screen height, the rules note is
       hidden (the page has the rules), and on a wide screen the score and a big copy of the status
       line move to the left of the board, where the class can read them from the back of the room. */
    '.classroom .game-reversi .rv-board { width: min(92vw, 62vh, 800px); }',
    '.classroom .game-reversi .game-note { display: none; }',
    '@media (min-width: 1000px) and (min-aspect-ratio: 5/4) {',
    '  .classroom .game-reversi .rv-wrap { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); grid-template-areas: "score board ." "status board ."; grid-template-rows: auto 1fr; column-gap: 2.5rem; align-items: start; }',
    '  .classroom .game-reversi .scoreboard { grid-area: score; justify-self: end; flex-direction: column; align-items: flex-end; font-size: 1.7rem; margin: 0 0 1.25rem; }',
    '  .classroom .game-reversi .rv-status-mirror { grid-area: status; display: block; justify-self: end; max-width: 15em; margin: 0; padding: 0; font-size: 1.6rem; line-height: 1.3; text-align: right; }',
    '  .classroom .game-reversi .rv-board { grid-area: board; }',
    '}'
  ].join('\n');

  /* ---------- the game on the page ---------- */

  GamesInTime.register({
    id: 'reversi',
    frame: 'table',
    mount: function (root, api) {
      var h = api.h;
      var RM = !!api.reducedMotion;
      root.appendChild(h('style', null, CSS));

      /* ----- timers: every pending timeout is kept, so New game and destroy() can cancel them ----- */
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

      /* ----- settings, remembered between visits ----- */
      var mode = api.store.get('mode', 'computer');   // 'computer' or 'two'
      var level = api.store.get('level', 'easy');      // 'easy' or 'hard'
      var humanColour = api.store.get('colour', DARK); // which colour the person plays against the computer
      var showHints = api.store.get('hints', true);
      if (mode !== 'two') mode = 'computer';
      if (level !== 'hard') level = 'easy';
      if (humanColour !== LIGHT) humanColour = DARK;
      showHints = showHints !== false;

      /* ----- game state ----- */
      var board, turn, over, lastIndex;
      /* How many times in a row the person has had to pass while playing the computer. While it
         is more than 0, the computer is taking extra turns, and the status line says why. */
      var passStreak = 0;
      /* How long a "You have no legal move" message stays up before the computer moves again. The
         first one is long, so a kid can read why the computer is moving twice; when the person has to
         pass again and again, each repeat is a little shorter (they know what is happening by then,
         and the board shows every extra move). Kept even with reduced motion: it is reading time. */
      var PASS_PAUSES = [1600, 900, 600, 450, 350];
      var THINK_MS = RM ? 0 : 350;  // the computer's pause before it moves
      var RING_MS = 60;             // flipped discs turn over in rings spreading out from the new disc
      var FLIP_MS = 440;            // how long one disc takes to turn over (matches the CSS transition)
      var cells = [];
      var tabStop = 0; // the one cell the Tab key lands on; the arrow keys move around from there
      var lastScore = [0, 0, 0];

      /* ----- controls ----- */
      var modeButtons = {}, levelButtons = {};
      var modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Who plays' },
        modeButtons.computer = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { api.sound('click'); setMode('computer'); } }, 'Play the computer'),
        modeButtons.two = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { api.sound('click'); setMode('two'); } }, 'Two players'));
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' },
        levelButtons.easy = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { api.sound('click'); setLevel('easy'); } }, 'Easy'),
        levelButtons.hard = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { api.sound('click'); setLevel('hard'); } }, 'Hard'));
      var colourSelect = h('select', { id: 'rv-colour', onchange: function () { api.sound('click'); setHumanColour(Number(colourSelect.value)); } },
        h('option', { value: String(DARK) }, 'Dark (moves first)'),
        h('option', { value: String(LIGHT) }, 'Light'));
      var colourField = h('label', { class: 'field', for: 'rv-colour' }, 'Your colour', colourSelect);
      var hintBox = h('input', { type: 'checkbox', id: 'rv-hints', onchange: function () { showHints = hintBox.checked; api.store.set('hints', showHints); api.sound('click'); renderHints(); } });
      var hintLabel = h('label', { class: 'rv-check', for: 'rv-hints' }, hintBox, 'Show legal moves');
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { api.sound('whoosh'); newGame(); } }, 'New game');

      /* One row of controls (it wraps on small screens). The tick box comes last, so Tab goes from it
         straight onto the board. */
      var toolbar = h('div', { class: 'game-toolbar' }, modeSeg, levelSeg, colourField, newBtn, hintLabel);

      var darkText = h('span', { class: 'rv-score-text' }), lightText = h('span', { class: 'rv-score-text' });
      var darkScore = h('span', null, h('span', { class: 'rv-mini is-dark', 'aria-hidden': 'true' }), darkText);
      var lightScore = h('span', null, h('span', { class: 'rv-mini is-light', 'aria-hidden': 'true' }), lightText);
      var scoreboard = h('div', { class: 'scoreboard', 'aria-label': 'Score' }, darkScore, lightScore);

      /* Only one cell is a Tab stop at a time (tabindex 0); the rest have tabindex -1, so the
         Tab key passes the board in one press instead of 64. See setTabStop below. */
      var boardEl = h('div', { class: 'board rv-board', role: 'group', 'aria-label': 'Reversi board, 8 rows by 8 columns', onkeydown: onBoardKey, onfocusin: onBoardFocus });
      for (var i = 0; i < SIZE * SIZE; i++) {
        var cell = h('button', { class: 'rv-cell', type: 'button', 'data-index': String(i), tabindex: '-1', onclick: onCellClick });
        cells.push(cell);
        boardEl.appendChild(cell);
      }

      root.appendChild(toolbar);
      var mirror = h('p', { class: 'rv-status-mirror', 'aria-hidden': 'true' });
      root.appendChild(h('div', { class: 'rv-wrap' }, scoreboard, mirror, boardEl));
      root.appendChild(h('p', { class: 'game-note' }, 'The 1883 rules: the centre starts empty and the first four discs go there, one at a time. After that, trap enemy discs in a straight line to flip them. Easy picks any legal move. Hard prefers corners and edges and looks one reply ahead.'));

      /* The shell's status line sits above the controls. On a phone that can be a whole screen
         above the board, so the same words also go into the mirror just above the board. The
         mirror is hidden from screen readers, which already hear the real status line. */
      function say(text) {
        api.status(text);
        mirror.textContent = text;
      }

      /* ----- names used in the status line ----- */
      function colourName(colour) { return colour === DARK ? 'Dark' : 'Light'; }
      function isComputer(colour) { return mode === 'computer' && colour !== humanColour; }
      function who(colour) {
        // "You" and "Computer" against the computer; "Dark" and "Light" between two people.
        if (mode === 'computer') return colour === humanColour ? 'You' : 'Computer';
        return colourName(colour);
      }
      function flippedText(colour, n) {
        return who(colour) + ' flipped ' + n + (n === 1 ? ' disc. ' : ' discs. ');
      }
      function passText(colour) {
        return who(colour) + ' has no legal move and passes. ';
      }
      /* Put at the start of the status after the computer's extra turns, so the reason it
         moved more than once stays on screen while the person works out their move. */
      function passRecap(times) {
        if (times === 1) return 'You had no legal move, so the computer moved again. ';
        return 'You had no legal move ' + times + ' times in a row, so the computer moved ' + times + ' extra times. ';
      }
      function promptText() {
        if (isComputer(turn)) return 'Computer is thinking';
        if (isOpening(board)) return 'Place a disc in the centre. Your turn, ' + colourName(turn);
        return 'Your turn, ' + colourName(turn);
      }
      function squareName(index) { return 'row ' + (Math.floor(index / SIZE) + 1) + ', column ' + (index % SIZE + 1); }

      /* ----- settings changes ----- */
      function setMode(m) { mode = m; api.store.set('mode', m); newGame(); }
      function setLevel(l) { level = l; api.store.set('level', l); updateControls(); }
      function setHumanColour(c) { humanColour = c; api.store.set('colour', c); newGame(); }
      function updateControls() {
        modeButtons.computer.setAttribute('aria-pressed', String(mode === 'computer'));
        modeButtons.two.setAttribute('aria-pressed', String(mode === 'two'));
        levelButtons.easy.setAttribute('aria-pressed', String(level === 'easy'));
        levelButtons.hard.setAttribute('aria-pressed', String(level === 'hard'));
        levelSeg.hidden = mode !== 'computer';
        colourField.hidden = mode !== 'computer';
        colourSelect.value = String(humanColour);
        hintBox.checked = showHints;
      }

      /* ----- starting and ending ----- */
      function newGame() {
        clearTimers();
        board = [];
        for (var i = 0; i < SIZE * SIZE; i++) board.push(EMPTY);
        turn = DARK; over = false; lastIndex = -1; passStreak = 0;
        for (var c = 0; c < cells.length; c++) cells[c].classList.remove('is-bad', 'is-shake');
        setTabStop(0);
        updateControls();
        render(null, -1);
        say('New game. ' + promptText());
        maybeComputerMove();
      }

      /* `wave` is how long the last move's flips take to finish, so the fanfare and the winner's
         wave come once the board has settled. */
      function finish(wave) {
        over = true;
        var d = count(board, DARK), l = count(board, LIGHT), text, winner = 0, hi = Math.max(d, l), lo = Math.min(d, l);
        if (d === l) {
          text = 'It is a draw, ' + d + ' discs each. Well matched!';
        } else {
          winner = d > l ? DARK : LIGHT;
          var result = colourName(winner) + ' wins, ' + hi + ' discs to ' + lo + '.';
          if (mode !== 'computer') text = result + ' Well played, ' + colourName(winner) + '!';
          else if (winner === humanColour) text = 'You win! ' + result + ' Well played!';
          else text = 'The computer wins, ' + hi + ' discs to ' + lo + '. Good game! Corner discs can never be flipped, so try to grab one next time.';
        }
        /* If the computer's extra turns ended the game, say so first. */
        if (mode === 'computer' && passStreak > 0) text = passRecap(passStreak) + text;
        render(null, -1);
        say(text);
        var delay = RM ? 0 : Math.min(wave || 0, 700);
        later(function () {
          if (!winner) api.sound('bell');
          else if (mode === 'computer' && winner !== humanColour) api.sound('lose');
          else api.celebrate(mode === 'computer' ? 'You beat the computer, ' + hi + ' discs to ' + lo + '!' : colourName(winner) + ' wins, ' + hi + ' discs to ' + lo + '!');
          if (winner) cheer(winner);
        }, delay);
      }

      /* The winner's discs bob up and down in a wave from the top left corner. */
      function cheer(winner) {
        if (RM) return;
        for (var i = 0; i < cells.length; i++) {
          if (board[i] !== winner) continue;
          var disc = cells[i].querySelector('.rv-disc');
          if (!disc) continue;
          disc.style.animationDelay = ((Math.floor(i / SIZE) + i % SIZE) * 45) + 'ms';
          disc.classList.remove('is-new');
          disc.classList.add('is-cheer');
        }
      }

      /* ----- making a move ----- */
      function makeMove(move, colour) {
        board = play(board, move, colour);
        lastIndex = move.index;
        var said = '';
        if (isComputer(colour)) said += 'Computer placed a disc at ' + squareName(move.index) + '. ';
        if (move.flips.length) said += flippedText(colour, move.flips.length);

        // Whose turn next? The other player, unless they have to pass.
        var next = other(colour);
        var nextCanMove = legalMoves(board, next).length > 0;
        var sameCanMove = legalMoves(board, colour).length > 0;
        var full = count(board, DARK) + count(board, LIGHT) === board.length;
        if (full || (!nextCanMove && !sameCanMove)) {
          finish(render(move.flips, move.index));
          return;
        }
        var wait; // how long before the computer moves (undefined means the usual short pause)
        var passed = false;
        if (nextCanMove) {
          turn = next;
          // The person gets a turn after the computer's extra turns: remind them why.
          if (isComputer(colour) && passStreak > 0) said = passRecap(passStreak) + said;
          passStreak = 0;
        } else if (isComputer(colour)) {
          /* The person has no legal move, so the computer goes again. Every one of these messages
             gets its own reading pause; otherwise the computer's next move would wipe it off the
             screen before anyone could read it. */
          passStreak++;
          turn = colour;
          said += passStreak === 1 ? 'You have no legal move and pass. The computer moves again. ' : 'You still have no legal move and pass again. ';
          wait = PASS_PAUSES[Math.min(passStreak, PASS_PAUSES.length) - 1];
          passed = true;
        } else {
          // Against the computer, the computer is passing; with two players, one of them is.
          said += passText(next);
          turn = colour;
          passed = true;
        }
        var wave = render(move.flips, move.index);
        say(said + promptText());
        if (passed) later(function () { api.sound('thud'); }, RM ? 0 : wave);
        /* The computer waits until the discs have finished turning over, then its usual pause. */
        if (wait === undefined && !RM) wait = THINK_MS + Math.max(0, wave - FLIP_MS);
        maybeComputerMove(wait);
      }

      function onCellClick(ev) {
        tryHumanMove(Number(ev.currentTarget.getAttribute('data-index')));
      }

      /* A tap that is not a legal move: a buzz, a red ring on the square, and the reason on the
         status line (with whose turn it is, so the line still says what to do). */
      function refuse(index, reason, prompt) {
        api.sound('wrong');
        say(reason + ' ' + (prompt || promptText()));
        var cell = cells[index];
        cell.classList.remove('is-bad', 'is-shake');
        void cell.offsetWidth; // so the shake plays again on a second tap
        cell.classList.add('is-bad');
        if (!RM) cell.classList.add('is-shake');
        later(function () { cell.classList.remove('is-bad', 'is-shake'); }, 700);
      }

      function tryHumanMove(index) {
        if (over || isComputer(turn)) return;
        if (board[index] !== EMPTY) { refuse(index, 'That square is taken.'); return; }
        if (isOpening(board)) {
          if (CENTRE.indexOf(index) < 0) { refuse(index, 'The first four discs go in the four centre squares.', 'Your turn, ' + colourName(turn)); return; }
          makeMove({ index: index, flips: [] }, turn);
          return;
        }
        var flips = flipsFor(board, index, turn);
        if (!flips.length) {
          refuse(index, 'Not a legal move: a new disc must trap at least one ' + colourName(other(turn)) + ' disc.');
          return;
        }
        makeMove({ index: index, flips: flips }, turn);
      }

      /* The computer waits a moment so a person can see what just happened: about a third of
         a second (none with reduced motion), or `wait` milliseconds when that is given. */
      function maybeComputerMove(wait) {
        if (over || !isComputer(turn)) return;
        if (wait === undefined) wait = THINK_MS;
        later(function () {
          if (over || !isComputer(turn)) return;
          var move = level === 'hard' ? chooseHard(board, turn, api.random) : chooseEasy(board, turn, api.random);
          if (move) makeMove(move, turn);
        }, wait);
      }

      /* ----- keyboard: arrow keys move around the board, Enter or Space plays ----- */

      /* Makes `index` the cell the Tab key stops on. Whichever cell last had focus (by click,
         arrow key or Tab) keeps that job, so Shift+Tab back into the board returns you there. */
      function setTabStop(index) {
        cells[tabStop].setAttribute('tabindex', '-1');
        cells[index].setAttribute('tabindex', '0');
        tabStop = index;
      }

      function onBoardFocus(ev) {
        var target = ev.target;
        if (!target || !target.classList || !target.classList.contains('rv-cell')) return;
        setTabStop(Number(target.getAttribute('data-index')));
      }

      function onBoardKey(ev) {
        var target = ev.target;
        if (!target || !target.classList || !target.classList.contains('rv-cell')) return;
        var index = Number(target.getAttribute('data-index'));
        var row = Math.floor(index / SIZE), col = index % SIZE;
        if (ev.key === 'ArrowUp') row = Math.max(0, row - 1);
        else if (ev.key === 'ArrowDown') row = Math.min(SIZE - 1, row + 1);
        else if (ev.key === 'ArrowLeft') col = Math.max(0, col - 1);
        else if (ev.key === 'ArrowRight') col = Math.min(SIZE - 1, col + 1);
        else if (ev.key === 'Home') col = 0;
        else if (ev.key === 'End') col = SIZE - 1;
        else return;
        ev.preventDefault();
        cells[row * SIZE + col].focus();
      }

      /* ----- drawing ----- */
      function makeDisc(v) {
        return h('span', { class: 'rv-disc ' + (v === DARK ? 'is-dark' : 'is-light'), 'aria-hidden': 'true' },
          h('span', { class: 'rv-face rv-face-d' }), h('span', { class: 'rv-face rv-face-l' }));
      }

      /* Draws the board. `flips` are the discs the last move turned over and `placed` is the square it
         was played on. The flipped discs turn over in rings: the ones next to the new disc first, then
         the next ring out, each with its own flip sound. Returns how long that takes, in ms. */
      function render(flips, placed) {
        var ring = {}, wave = 0, i;
        if (flips && flips.length) {
          var pr = Math.floor(placed / SIZE), pc = placed % SIZE;
          for (i = 0; i < flips.length; i++) {
            var dist = Math.max(Math.abs(Math.floor(flips[i] / SIZE) - pr), Math.abs(flips[i] % SIZE - pc));
            ring[flips[i]] = dist - 1;
          }
        }
        var turning = [];
        for (i = 0; i < cells.length; i++) {
          var cell = cells[i], v = board[i];
          var disc = cell.querySelector('.rv-disc');
          if (v === EMPTY) {
            if (disc) disc.remove();
          } else if (!disc) {
            disc = makeDisc(v);
            if (!RM && i === placed) disc.classList.add('is-new');
            cell.appendChild(disc);
          } else {
            if (placed >= 0) disc.classList.remove('is-new'); // only the newest disc drops in
            if (disc.classList.contains('is-dark') !== (v === DARK)) turning.push({ disc: disc, dark: v === DARK, ring: ring[i] || 0 });
          }
          cell.classList.toggle('is-last', i === lastIndex);
        }
        if (turning.length) {
          /* A disc can be turned over again while it is still turning (two quick moves in a row). Its
             old turn is finished at once first, so the new one always turns the disc fully over. */
          for (i = 0; i < turning.length; i++) turning[i].disc.style.transition = 'none';
          void boardEl.offsetWidth;
          for (i = 0; i < turning.length; i++) {
            var t = turning[i];
            t.disc.style.transition = '';
            t.disc.style.transitionDelay = RM ? '' : (t.ring * RING_MS) + 'ms';
            t.disc.classList.toggle('is-dark', t.dark);
            t.disc.classList.toggle('is-light', !t.dark);
            wave = Math.max(wave, t.ring * RING_MS + FLIP_MS);
            later(function () { api.sound('flip'); }, RM ? i * 45 : t.ring * RING_MS + 150);
          }
        }
        if (placed >= 0) api.sound('clack');
        renderHints();
        var d = count(board, DARK), l = count(board, LIGHT);
        darkText.textContent = 'Dark ' + d;
        lightText.textContent = 'Light ' + l;
        if (!RM && placed >= 0) { if (d !== lastScore[DARK]) bump(darkText); if (l !== lastScore[LIGHT]) bump(lightText); }
        lastScore[DARK] = d; lastScore[LIGHT] = l;
        darkScore.classList.toggle('is-turn', !over && turn === DARK);
        lightScore.classList.toggle('is-turn', !over && turn === LIGHT);
        return wave;
      }

      /* Replays a short CSS animation: the class comes off, the browser lays the page out (reading
         offsetWidth forces that), and the class goes back on. */
      function bump(el) {
        el.classList.remove('is-bump');
        void el.offsetWidth;
        el.classList.add('is-bump');
      }

      /* Marks legal squares with a dot and refreshes every cell's label. */
      function renderHints() {
        var legal = {};
        if (!over && !isComputer(turn)) {
          var moves = legalMoves(board, turn);
          for (var m = 0; m < moves.length; m++) legal[moves[m].index] = true;
        }
        for (var i = 0; i < cells.length; i++) {
          var cell = cells[i], hint = cell.querySelector('.rv-hint');
          var isLegal = !!legal[i];
          cell.classList.toggle('is-legal', isLegal);
          if (isLegal && showHints) { if (!hint) cell.appendChild(h('span', { class: 'rv-hint' + (RM ? '' : ' is-pop'), 'aria-hidden': 'true' })); }
          else if (hint) hint.remove();
          var label = 'Row ' + (Math.floor(i / SIZE) + 1) + ', column ' + (i % SIZE + 1) + ', ';
          if (board[i] === EMPTY) label += 'empty' + (isLegal ? ', legal move' : '');
          else label += colourName(board[i]);
          cell.setAttribute('aria-label', label);
        }
      }

      newGame();

      return {
        destroy: function () {
          destroyed = true;
          clearTimers();
          over = true;
        }
      };
    }
  });
})();
