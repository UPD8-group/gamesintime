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
   computer player and the styles. */
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
        var bestReply = 0;
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

  /* ---------- the game on the page ---------- */

  GamesInTime.register({
    id: 'reversi',
    mount: function (root, api) {
      var h = api.h;

      root.appendChild(h('style', null, [
        /* Disc colours. In the light theme the Dark disc is ink and the Light disc is the
           on-brand cream. In the dark theme ink turns cream, so the discs swap to the page
           background (very dark) and ink (cream). The grid lines (--rv-grid) also change:
           --line is a clear cream in the light theme, but in the dark theme it is nearly
           the same teal as the squares, so there we use --ink-muted. Every colour is a theme token. */
        '.game-reversi { --rv-dark: var(--ink); --rv-light: var(--on-brand); --rv-dark-rim: var(--surface-2); --rv-light-rim: var(--line); --rv-grid: var(--line); }',
        '@media (prefers-color-scheme: dark) { .game-reversi:where(:root:not([data-theme="light"]) *) { --rv-dark: var(--bg); --rv-light: var(--ink); --rv-dark-rim: var(--ink-muted); --rv-light-rim: var(--surface-2); --rv-grid: var(--ink-muted); } }',
        '.game-reversi:where(:root[data-theme="dark"] *) { --rv-dark: var(--bg); --rv-light: var(--ink); --rv-dark-rim: var(--ink-muted); --rv-light-rim: var(--surface-2); --rv-grid: var(--ink-muted); }',
        /* The board: a teal grid with thin lines, like the baize boards of the 1880s. There are no
           gaps between the cells (gaps would steal width from the 8 columns on a phone); each cell
           draws its own thin line along its right and bottom edge instead. */
        '.game-reversi .rv-board { display: grid; grid-template-columns: repeat(8, 1fr); gap: 0; width: min(92vw, 520px); max-width: 100%; padding: 0; overflow: hidden; background: var(--brand); border: 4px solid var(--brass); border-radius: 8px; box-shadow: var(--shadow); }',
        '.game-reversi .rv-cell { position: relative; display: block; min-width: 0; padding: 0; margin: 0; border: 0; border-radius: 0; background: var(--brand); box-shadow: inset -1px -1px 0 var(--rv-grid); cursor: pointer; -webkit-appearance: none; appearance: none; }',
        '.game-reversi .rv-cell::before { content: ""; display: block; padding-top: 100%; }',
        /* Two different rings so a keyboard player can tell them apart: the focused cell gets a
           cream ring, the last move played gets a brass ring. */
        '.game-reversi .rv-cell:focus-visible { outline: 3px solid var(--on-brand); outline-offset: -3px; z-index: 1; }',
        '.game-reversi .rv-cell.is-legal:hover { background: var(--brand-2); }',
        '.game-reversi .rv-cell.is-last { box-shadow: inset 0 0 0 3px var(--brass-bright), inset -1px -1px 0 var(--rv-grid); }',
        /* Discs: big circles with a subtle rim and a soft shadow so they look like real counters. */
        '.game-reversi .rv-disc { position: absolute; left: 11%; top: 11%; width: 78%; height: 78%; border-radius: 50%; box-shadow: 0 2px 4px rgba(0, 0, 0, .45); }',
        '.game-reversi .rv-disc.is-dark { background: var(--rv-dark); border: 2px solid var(--rv-dark-rim); }',
        '.game-reversi .rv-disc.is-light { background: var(--rv-light); border: 2px solid var(--rv-light-rim); }',
        '.game-reversi .rv-disc.is-flipping { animation: game-reversi-flip .4s ease-in-out; }',
        '@keyframes game-reversi-flip { 0% { transform: scaleX(1); } 50% { transform: scaleX(0.05); } 100% { transform: scaleX(1); } }',
        /* The small dot that marks a legal move. */
        '.game-reversi .rv-hint { position: absolute; left: 38%; top: 38%; width: 24%; height: 24%; border-radius: 50%; background: var(--brass-bright); opacity: .85; }',
        /* Little discs in the scoreboard. */
        '.game-reversi .rv-mini { display: inline-block; width: 1.1em; height: 1.1em; border-radius: 50%; }',
        '.game-reversi .rv-mini.is-dark { background: var(--rv-dark); border: 2px solid var(--ink-muted); }',
        '.game-reversi .rv-mini.is-light { background: var(--rv-light); border: 2px solid var(--ink-muted); }',
        '.game-reversi .scoreboard .is-turn { text-decoration: underline; text-decoration-color: var(--brass); text-decoration-thickness: 3px; text-underline-offset: .25em; }',
        '.game-reversi .rv-check { display: inline-flex; align-items: center; gap: .45rem; min-height: 44px; font-weight: 700; cursor: pointer; }',
        '.game-reversi .rv-check input { width: 1.25rem; height: 1.25rem; accent-color: var(--brand-2); margin: 0; }',
        '.game-reversi .rv-wrap { display: flex; flex-direction: column; align-items: center; }',
        /* A copy of the status line that sits right above the board. It only shows on small
           screens, where the controls push the board a whole screen below the real status line. */
        '.game-reversi .rv-status-mirror { display: none; margin: 0 0 .5rem; padding-inline: 1rem; font-weight: 700; text-align: center; text-wrap: balance; }',
        '@media (max-width: 600px) { .game-reversi .rv-status-mirror { display: block; } }',
        /* On phones the board runs from screen edge to screen edge so each of the 8 cells is at
           least 44px wide at 360px (and as big as it can be at 320px). The negative margin undoes
           the page gutter and the game panel's padding and border. Of the two ways of working that
           out, max() picks the smaller pull, so the board can never poke past the screen edge. */
        '@media (max-width: 480px) { .game-reversi .rv-wrap { margin-inline: max(calc(50% - 50vw), calc(-1 * (var(--gutter) + 1px + clamp(.8rem, 2.5vw, 1.5rem)))); } .game-reversi .rv-board { width: 100%; border-width: 3px; border-radius: 6px; } }',
        /* Classroom mode on a projector: let the board grow to fill most of the screen height. */
        '.classroom .game-reversi .rv-board { width: min(92vw, 68vh, 800px); }'
      ].join('\n')));

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
      var board, turn, over, lastIndex, timer = null;
      var cells = [];
      var tabStop = 0; // the one cell the Tab key lands on; the arrow keys move around from there

      /* ----- controls ----- */
      var modeButtons = {}, levelButtons = {};
      var modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Who plays' },
        modeButtons.computer = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setMode('computer'); } }, 'Play the computer'),
        modeButtons.two = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setMode('two'); } }, 'Two players'));
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' },
        levelButtons.easy = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setLevel('easy'); } }, 'Easy'),
        levelButtons.hard = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setLevel('hard'); } }, 'Hard'));
      var colourSelect = h('select', { id: 'rv-colour', onchange: function () { setHumanColour(Number(colourSelect.value)); } },
        h('option', { value: String(DARK) }, 'Dark (moves first)'),
        h('option', { value: String(LIGHT) }, 'Light'));
      var colourField = h('label', { class: 'field', for: 'rv-colour' }, 'Your colour', colourSelect);
      var hintBox = h('input', { type: 'checkbox', id: 'rv-hints', onchange: function () { showHints = hintBox.checked; api.store.set('hints', showHints); renderHints(); } });
      var hintLabel = h('label', { class: 'rv-check', for: 'rv-hints' }, hintBox, 'Show legal moves');
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(); } }, 'New game');

      var toolbar = h('div', { class: 'game-toolbar' }, modeSeg, levelSeg, colourField, newBtn);
      var toolbar2 = h('div', { class: 'game-toolbar' }, hintLabel);

      var darkScore = h('span', null, h('span', { class: 'rv-mini is-dark', 'aria-hidden': 'true' }), h('span', { class: 'rv-score-text' }));
      var lightScore = h('span', null, h('span', { class: 'rv-mini is-light', 'aria-hidden': 'true' }), h('span', { class: 'rv-score-text' }));
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
      root.appendChild(toolbar2);
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
        return who(colour) === 'You' ? 'You have no legal move and pass. ' : who(colour) + ' has no legal move and passes. ';
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
        clearTimeout(timer); timer = null;
        board = [];
        for (var i = 0; i < SIZE * SIZE; i++) board.push(EMPTY);
        turn = DARK; over = false; lastIndex = -1;
        setTabStop(0);
        updateControls();
        render(null);
        say('New game. ' + promptText());
        maybeComputerMove();
      }

      function finish() {
        over = true;
        var d = count(board, DARK), l = count(board, LIGHT), text;
        if (d === l) {
          text = 'It is a draw, ' + d + ' discs each.';
        } else {
          var winner = d > l ? DARK : LIGHT;
          var hi = Math.max(d, l), lo = Math.min(d, l);
          text = colourName(winner) + ' wins, ' + hi + ' discs to ' + lo + '.';
          if (mode === 'computer') text = (winner === humanColour ? 'You win! ' : 'The computer wins. ') + text;
        }
        render(null);
        say(text);
        api.announce(text);
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
          render(move.flips);
          finish();
          return;
        }
        if (nextCanMove) {
          turn = next;
        } else {
          said += passText(next);
          turn = colour;
        }
        render(move.flips);
        say(said + promptText());
        maybeComputerMove();
      }

      function onCellClick(ev) {
        tryHumanMove(Number(ev.currentTarget.getAttribute('data-index')));
      }

      function tryHumanMove(index) {
        if (over || isComputer(turn)) return;
        if (board[index] !== EMPTY) { api.announce('That square is taken.'); return; }
        if (isOpening(board)) {
          if (CENTRE.indexOf(index) < 0) { api.announce('The first four discs go in the centre four squares.'); return; }
          makeMove({ index: index, flips: [] }, turn);
          return;
        }
        var flips = flipsFor(board, index, turn);
        if (!flips.length) {
          api.announce('Not a legal move. You must trap at least one ' + colourName(other(turn)) + ' disc.');
          return;
        }
        makeMove({ index: index, flips: flips }, turn);
      }

      /* The computer waits a moment so a person can see what just happened. */
      function maybeComputerMove() {
        if (over || !isComputer(turn)) return;
        clearTimeout(timer);
        timer = setTimeout(function () {
          timer = null;
          if (over || !isComputer(turn)) return;
          var move = level === 'hard' ? chooseHard(board, turn, api.random) : chooseEasy(board, turn, api.random);
          if (move) makeMove(move, turn);
        }, api.reducedMotion ? 0 : 350);
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
      function render(flips) {
        var flipping = {}, toFlip = [];
        if (flips && !api.reducedMotion) for (var f = 0; f < flips.length; f++) flipping[flips[f]] = true;
        for (var i = 0; i < cells.length; i++) {
          var cell = cells[i], v = board[i];
          var disc = cell.querySelector('.rv-disc');
          if (v === EMPTY) {
            if (disc) disc.remove();
          } else {
            if (!disc) { disc = h('span', { class: 'rv-disc', 'aria-hidden': 'true' }); cell.appendChild(disc); }
            // Set the colour without the animation class; it goes back on below.
            disc.className = 'rv-disc ' + (v === DARK ? 'is-dark' : 'is-light');
            if (flipping[i]) toFlip.push(disc);
          }
          cell.classList.toggle('is-last', i === lastIndex);
        }
        /* A CSS animation only plays again if its class comes off, the browser lays the page out,
           and the class goes back on. Reading offsetWidth forces that layout, so a disc that is
           flipped on two moves in a row animates both times instead of silently changing colour. */
        if (toFlip.length) {
          void boardEl.offsetWidth;
          for (var t = 0; t < toFlip.length; t++) toFlip[t].classList.add('is-flipping');
        }
        renderHints();
        var d = count(board, DARK), l = count(board, LIGHT);
        darkScore.querySelector('.rv-score-text').textContent = 'Dark ' + d;
        lightScore.querySelector('.rv-score-text').textContent = 'Light ' + l;
        darkScore.classList.toggle('is-turn', !over && turn === DARK);
        lightScore.classList.toggle('is-turn', !over && turn === LIGHT);
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
          if (isLegal && showHints) { if (!hint) cell.appendChild(h('span', { class: 'rv-hint', 'aria-hidden': 'true' })); }
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
          clearTimeout(timer); timer = null;
          over = true;
        }
      };
    }
  });
})();
