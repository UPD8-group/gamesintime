/* Noughts and Crosses. The game is ancient; the English name was first printed in 1858.
   Plays the computer (easy: random; hard: perfect play, so it never loses) or two players on one device.
   It sits on a school slate: the grid and the marks are drawn in chalk, and three in a row is struck
   through with a thick gold line that can be seen from the back of a classroom.
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  /* The eight ways to get three in a row: three rows, three columns, two diagonals.
     Squares are numbered 0 to 8, left to right, top to bottom. */
  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

  function winnerOf(board) {
    for (var i = 0; i < LINES.length; i++) {
      var a = LINES[i][0], b = LINES[i][1], c = LINES[i][2];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return { who: board[a], line: LINES[i] };
    }
    return null;
  }
  function emptyCells(board) {
    var out = [];
    for (var i = 0; i < 9; i++) if (!board[i]) out.push(i);
    return out;
  }

  /* The computer's "hard" brain: minimax.
     It tries every empty square, imagines the whole rest of the game for each one,
     and gives it a score: +10 if the computer ends up winning, -10 if it loses, 0 for a draw.
     Wins that come sooner score a little higher, so it finishes games instead of dawdling. */
  function minimax(board, me, player, depth) {
    var w = winnerOf(board);
    if (w) return w.who === me ? 10 - depth : depth - 10;
    var empties = emptyCells(board);
    if (!empties.length) return 0;
    var best = player === me ? -Infinity : Infinity;
    for (var i = 0; i < empties.length; i++) {
      board[empties[i]] = player;
      var score = minimax(board, me, player === 'X' ? 'O' : 'X', depth + 1);
      board[empties[i]] = '';
      if (player === me) best = Math.max(best, score); else best = Math.min(best, score);
    }
    return best;
  }
  function bestMove(board, me, random) {
    var empties = emptyCells(board), bestScore = -Infinity, bestCells = [];
    for (var i = 0; i < empties.length; i++) {
      board[empties[i]] = me;
      var score = minimax(board, me, me === 'X' ? 'O' : 'X', 1);
      board[empties[i]] = '';
      if (score > bestScore) { bestScore = score; bestCells = [empties[i]]; }
      else if (score === bestScore) bestCells.push(empties[i]);
    }
    return bestCells[Math.floor(random() * bestCells.length)];
  }

  /* ----- chalk drawings -----
     Everything is drawn with SVG strokes, so it looks the same with or without the web fonts. */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, String(attrs[k])); });
    for (var i = 2; i < arguments.length; i++) el.appendChild(arguments[i]);
    return el;
  }
  /* Each mark lives in a 100 by 100 box. The strokes wobble a little, like a hand holding chalk. */
  var MARK_PATHS = {
    X: ['M22 21 C 40 39, 61 61, 79 80', 'M79 21 C 61 40, 41 60, 21 80'],
    O: ['M53 19 C 71 20, 81 33, 81 50 C 81 69, 68 81, 50 81 C 31 81, 19 68, 19 50 C 19 32, 32 19, 47 21']
  };
  /* The grid: two lines down and two across, in a 300 by 300 box, each a little uneven. */
  var GRID_PATHS = ['M100 7 C 101 90, 99 200, 101 293', 'M200 6 C 198 100, 202 190, 199 294', 'M7 100 C 90 99, 200 102, 293 100', 'M6 200 C 100 202, 190 198, 294 201'];

  /* Chalk grain: two fine hatchings punch tiny gaps in a stroke, the same trick as the other slate games. */
  var HATCH = 'repeating-linear-gradient(118deg, var(--ink) 0 2px, color-mix(in srgb, var(--ink) 62%, transparent) 2px 3px), repeating-linear-gradient(28deg, var(--ink) 0 3px, color-mix(in srgb, var(--ink) 74%, transparent) 3px 4px)';
  var CHALK = '-webkit-mask-image: ' + HATCH + '; -webkit-mask-composite: source-in; mask-image: ' + HATCH + '; mask-composite: intersect;';

  var P = '.game-noughts-and-crosses ';
  var CSS = [
    /* X is white chalk and O is pink chalk; both read well on the slate's grey-green. */
    '.game-noughts-and-crosses { container-type: inline-size; --nc-x: var(--ink); --nc-o: color-mix(in srgb, var(--rose) 70%, var(--ink)); --nc-chalk: color-mix(in srgb, var(--ink) 80%, transparent); }',
    P + '.nc-wrap { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }',
    P + '.nc-tools { margin: 0; }',
    /* ----- the board: nine see-through buttons over a chalk grid ----- */
    P + '.board { position: relative; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); width: min(100%, 360px); margin: 0 auto; overflow: hidden; border-radius: 10px; }',
    P + '.nc-grid, ' + P + '.nc-strike { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }',
    P + '.nc-grid { ' + CHALK + ' }',
    P + '.nc-grid path { fill: none; stroke: var(--nc-chalk); stroke-width: 6px; stroke-linecap: round; vector-effect: non-scaling-stroke; }',
    P + '.cell { position: relative; aspect-ratio: 1; min-width: 0; min-height: 44px; margin: 0; padding: 0; border: 0; border-radius: 12px; background: transparent; color: var(--ink); cursor: pointer; display: grid; place-items: center; -webkit-tap-highlight-color: transparent; transition: background-color .15s; }',
    P + '.cell:hover:not([aria-disabled="true"]):not(:disabled) { background: color-mix(in srgb, var(--ink) 10%, transparent); }',
    /* the keyboard focus is a dashed ring inside the square, so it never looks like the gold winning line */
    P + '.cell:focus-visible { outline: 3px dashed var(--focus); outline-offset: -7px; }',
    P + '.cell[aria-disabled="true"], ' + P + '.cell:disabled { cursor: default; opacity: 1; }',
    P + '.board.is-thinking .cell:not([aria-disabled="true"]) { cursor: progress; }',
    P + '.cell.x { color: var(--nc-x); }',
    P + '.cell.o { color: var(--nc-o); }',
    P + '.nc-mark { width: 74%; height: 74%; overflow: visible; transition: opacity .35s; ' + CHALK + ' }',
    P + '.nc-mark path { fill: none; stroke: currentColor; stroke-width: 10; stroke-linecap: round; stroke-linejoin: round; }',
    /* a new mark is drawn in, stroke by stroke (pathLength is 1, so a dash of 1 is the whole stroke) */
    P + '.nc-mark.is-new path { stroke-dasharray: 1 1; animation: nc-draw .17s ease-out both; }',
    P + '.nc-mark.is-new path + path { animation-delay: .15s; }',
    P + '.cell.o .nc-mark.is-new path { animation-duration: .32s; }',
    '@keyframes nc-draw { 0% { stroke-dashoffset: 1; opacity: 0; } 1% { opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 1; } }',
    /* ----- three in a row: a solid gold line, gold squares, and the other marks fade back ----- */
    P + '.board.is-won .cell:not(.win) .nc-mark { opacity: .3; }',
    P + '.cell.win { background: color-mix(in srgb, var(--gold) 24%, transparent); }',
    P + '.cell.win .nc-mark { animation: nc-pop .5s cubic-bezier(.3, 1.6, .5, 1) var(--nc-delay, 0s) both; }',
    '@keyframes nc-pop { 0% { transform: none; } 45% { transform: scale(1.18) rotate(-4deg); } 100% { transform: none; } }',
    P + '.nc-strike { overflow: visible; }',
    P + '.nc-strike path { fill: none; stroke-linecap: round; }',
    P + '.nc-strike .nc-under { stroke: var(--gold-shadow); stroke-width: 22; }',
    P + '.nc-strike .nc-over { stroke: var(--gold); stroke-width: 14; }',
    P + '.nc-strike.is-new path { stroke-dasharray: 1 1; animation: nc-draw .38s ease-in-out .3s both; }',
    /* a tap on a square that is already taken */
    P + '.cell.is-shake { animation: nc-shake .32s ease; }',
    '@keyframes nc-shake { 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }',
    /* New game: a cloth wipes across the slate */
    P + '.board::after { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0; background: linear-gradient(100deg, transparent 22%, color-mix(in srgb, var(--ink) 22%, transparent) 50%, transparent 78%); }',
    P + '.board.is-wiping::after { animation: nc-wipe .45s ease-in-out; }',
    '@keyframes nc-wipe { 0% { opacity: 1; transform: translateX(-100%); } 100% { opacity: 1; transform: translateX(100%); } }',
    /* ----- the score: three chalk boxes, and the number that changes jumps ----- */
    P + '.nc-scorebox { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem .75rem; }',
    P + '.nc-score { list-style: none; margin: 0; padding: 0; display: flex; gap: .5rem; flex: 1 1 15rem; font-weight: 400; }',
    P + '.nc-score li { margin: 0; flex: 1 1 0; min-width: 0; display: grid; justify-items: center; align-content: start; gap: .15rem; padding: .35rem .3rem .45rem; border: 2px dashed var(--line); border-radius: 12px; text-align: center; }',
    P + '.nc-lbl { font-family: var(--font-mono); font-size: .76rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-muted); line-height: 1.2; }',
    P + '.nc-num { font-family: var(--font-poster); font-weight: 400; font-size: 2.1rem; line-height: 1; color: var(--ink); }',
    P + '.nc-num.is-bump { color: var(--gold); animation: nc-bump .55s cubic-bezier(.3, 1.6, .5, 1); }',
    '@keyframes nc-bump { 0% { transform: scale(1.8); } 100% { transform: none; } }',
    P + '.nc-reset { margin-left: auto; }',
    P + '.settings { display: grid; gap: .6rem; }',
    P + '.settings .game-toolbar { margin: 0; }',
    P + '.seg button { min-height: 44px; }',
    P + '.game-note { margin: 0; }',
    /* Wide screens: the board on the left, everything else beside it, so it all fits without scrolling. */
    '@container (min-width: 640px) {',
    P + '.nc-wrap { grid-template-columns: auto minmax(0, 1fr); grid-template-rows: auto auto auto 1fr; grid-template-areas: "board tools" "board score" "board settings" "board note"; column-gap: clamp(1.5rem, 5cqi, 3.5rem); row-gap: 1.1rem; align-items: start; }',
    P + '.nc-tools { grid-area: tools; }',
    P + '.board { grid-area: board; width: min(440px, 50cqi); }',
    P + '.nc-scorebox { grid-area: score; }',
    P + '.settings { grid-area: settings; }',
    P + '.game-note { grid-area: note; }',
    '}',
    /* Classroom mode (for projecting): the board grows to fill the screen. */
    '.classroom ' + P + '.board { width: min(100%, 60vh, 600px); }',
    '@container (min-width: 640px) { .classroom ' + P + '.board { width: min(60cqi, 62vh, 600px); } }',
    '@media (prefers-reduced-motion: reduce) { ' + P + '.cell, ' + P + '.nc-mark, ' + P + '.nc-mark path, ' + P + '.nc-strike path, ' + P + '.nc-num, ' + P + '.board::after { animation: none !important; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'noughts-and-crosses',
    frame: 'slate',   /* chalk on a school slate */
    mount: function (root, api) {
      var h = api.h;
      var RM = !!api.reducedMotion;
      /* Saved settings are checked against the allowed choices too, so an odd saved value
         falls back to the normal choice instead of breaking the game. */
      function pick(key, allowed) {
        var v = api.store.get(key, allowed[0]);
        return allowed.indexOf(v) >= 0 ? v : allowed[0];
      }
      var settings = {
        mode: pick('mode', ['computer', 'two']),   // play the computer, or two players on one device
        level: pick('level', ['hard', 'easy']),     // how clever the computer is
        human: pick('human', ['X', 'O'])            // which mark the human plays against the computer
      };
      /* Two separate tallies, one per mode, so games against the computer and games between two
         people do not get mixed up. Against the computer we count people (you, computer) rather
         than marks, so the numbers stay honest when you switch from playing X to playing O. */
      var scores = loadScores();
      /* Reads the saved tallies and fills in anything missing. The saved value might be from an
         older version of this game, or half written, so every number is checked rather than trusted.
         That way a strange value in storage can never stop the game from starting. */
      function loadScores() {
        var saved = api.store.get('scores', null);
        if (!saved || typeof saved !== 'object') saved = {};
        return { computer: tidy(saved.computer, ['you', 'computer', 'draw']), two: tidy(saved.two, ['X', 'O', 'draw']) };
      }
      function tidy(part, keys) {   // keeps only the whole numbers we expect; anything else becomes 0
        var out = {};
        if (!part || typeof part !== 'object') part = {};
        keys.forEach(function (k) { var n = Number(part[k]); out[k] = isFinite(n) && n >= 0 ? Math.floor(n) : 0; });
        return out;
      }
      var state, timer = null, wipeTimer = null;
      var cells = [];
      var shown = [];    // the mark drawn in each square right now, so only a changed square is redrawn
      var tabCell = 0;   // the one square that Tab lands on (a "roving tabindex"); arrow keys move it

      root.appendChild(h('style', null, CSS));

      /* ----- controls -----
         On a phone, top to bottom: New game, the board, the score, then the settings. On a wide screen the
         board sits on the left and the rest stands beside it. Either way the board is right under the status
         line, so "Your turn" and "You win" are next to the squares. */
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { api.sound('whoosh'); wipe(); newGame(); } }, 'New game');
      var tools = h('div', { class: 'game-toolbar nc-tools' }, newBtn);

      /* The board: nine plain buttons in a CSS grid, over a chalk grid drawn in SVG. Each button has an
         aria-label saying where it is and what is on it. Only one button is in the Tab order at a time;
         the arrow keys move between all nine (see onKey). */
      var board = h('div', { class: 'board', role: 'group', 'aria-label': 'Noughts and crosses board, three by three' });
      var grid = svgEl('svg', { class: 'nc-grid', viewBox: '0 0 300 300', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' });
      GRID_PATHS.forEach(function (d) { grid.appendChild(svgEl('path', { d: d })); });
      board.appendChild(grid);
      for (var i = 0; i < 9; i++) {
        (function (i) {
          var cell = h('button', { class: 'cell', type: 'button', tabindex: i === 0 ? '0' : '-1',
            onclick: function () { humanMove(i); },
            onfocus: function () { setTabCell(i); },
            onanimationend: function (ev) { if (ev.target === cell) cell.classList.remove('is-shake'); } });
          cells.push(cell); shown.push(''); board.appendChild(cell);
        })(i);
      }
      /* The winning line goes on top of the squares; it is only drawn when someone gets three in a row. */
      var strikeUnder = svgEl('path', { class: 'nc-under', pathLength: 1 });
      var strikeOver = svgEl('path', { class: 'nc-over', pathLength: 1 });
      var strike = svgEl('svg', { class: 'nc-strike', viewBox: '0 0 300 300', 'aria-hidden': 'true', focusable: 'false' }, strikeUnder, strikeOver);
      board.appendChild(strike);
      board.addEventListener('keydown', onKey);

      /* The score is a list, so a screen reader reads "You: 2", "Computer: 1", "Draws: 3" as separate items. */
      var scoreList = h('ul', { class: 'scoreboard nc-score', 'aria-label': 'Score' });
      var resetBtn = h('button', { class: 'btn btn-ghost nc-reset', type: 'button', onclick: function () {
        scores[settings.mode] = settings.mode === 'computer' ? { you: 0, computer: 0, draw: 0 } : { X: 0, O: 0, draw: 0 };
        api.store.set('scores', scores); renderScore(); api.sound('click'); api.announce('Score reset');
      } }, 'Reset score');
      var scoreBox = h('div', { class: 'nc-scorebox' }, scoreList, resetBtn);

      var modeSeg = seg('Opponent', [['computer', 'Play the computer'], ['two', 'Two players']], settings.mode, function (v) { settings.mode = v; api.store.set('mode', v); newGame(); });
      var levelSeg = seg('Computer level', [['easy', 'Easy'], ['hard', 'Hard']], settings.level, function (v) { settings.level = v; api.store.set('level', v); newGame(); });
      var humanSeg = seg('Your mark', [['X', 'You are X, first'], ['O', 'You are O, second']], settings.human, function (v) { settings.human = v; api.store.set('human', v); newGame(); });
      var computerRow = h('div', { class: 'game-toolbar' }, levelSeg, humanSeg);
      var settingsEl = h('div', { class: 'settings', role: 'group', 'aria-label': 'Game settings' },
        h('div', { class: 'game-toolbar' }, modeSeg),
        computerRow);
      var tip = h('p', { class: 'game-note' }, 'Tip: use the arrow keys to move around the board and Enter or Space to play.');
      root.appendChild(h('div', { class: 'nc-wrap' }, tools, board, scoreBox, settingsEl, tip));

      /* A row of buttons where one is pressed at a time, with a name for screen readers ("Opponent").
         Clicking the one that is already pressed does nothing, so a game in progress is not wiped by accident. */
      function seg(name, options, value, onChange) {
        var current = value;
        var el = h('div', { class: 'seg', role: 'group', 'aria-label': name });
        var buttons = options.map(function (o) {
          return h('button', { type: 'button', 'aria-pressed': String(o[0] === value), onclick: function () {
            if (o[0] === current) return;
            current = o[0];
            buttons.forEach(function (b, k) { b.setAttribute('aria-pressed', String(options[k][0] === o[0])); });
            api.sound('click');
            onChange(o[0]);
          } }, o[1]);
        });
        buttons.forEach(function (b) { el.appendChild(b); });
        return el;
      }

      /* ----- keyboard ----- */
      function setTabCell(j) {
        cells[tabCell].tabIndex = -1;
        cells[j].tabIndex = 0;
        tabCell = j;
      }
      function focusCell(j) { setTabCell(j); cells[j].focus(); }
      function focusIsOnBoard() { return cells.indexOf(document.activeElement) >= 0; }
      /* Arrow keys step across every square, filled or not, and wrap around the edges. */
      function onKey(ev) {
        var i = cells.indexOf(document.activeElement);
        if (i < 0) return;
        var j = i;
        if (ev.key === 'ArrowRight') j = i % 3 === 2 ? i - 2 : i + 1;
        else if (ev.key === 'ArrowLeft') j = i % 3 === 0 ? i + 2 : i - 1;
        else if (ev.key === 'ArrowDown') j = (i + 3) % 9;
        else if (ev.key === 'ArrowUp') j = (i + 6) % 9;
        else return;
        ev.preventDefault(); focusCell(j);
      }
      /* After a move, keep the keyboard on the board: if the focused square has just been filled,
         slide focus along to the next empty one, so the next Enter plays straight away. */
      function keepFocusUseful(from) {
        if (!focusIsOnBoard()) return;
        var i = cells.indexOf(document.activeElement);
        if (!state.board[i]) return;
        for (var step = 1; step < 9; step++) {
          var j = (from + step) % 9;
          if (!state.board[j]) { focusCell(j); return; }
        }
      }

      /* ----- words ----- */
      function label(mark) {
        if (settings.mode === 'two') return (mark === 'X' ? 'Player 1' : 'Player 2') + ' (' + mark + ')';
        return mark === settings.human ? 'You (' + mark + ')' : 'Computer (' + mark + ')';
      }
      /* A loss gets a kind word and something to try next. */
      function winText(mark) {
        if (settings.mode === 'two') return label(mark) + ' wins!';
        if (mark !== settings.human) return 'Computer (' + mark + ') wins this time. ' + (settings.level === 'hard' ? 'Can you hold it to a draw?' : 'Have another go!');
        return 'You win! Well played.';
      }
      function drawText() {
        var t = 'A draw. All nine squares are full.';
        if (settings.mode === 'computer' && settings.level === 'hard') t += ' Nobody can win when both sides play well.';
        return t;
      }

      /* ----- drawing ----- */
      function markSvg(mark, fresh) {
        var s = svgEl('svg', { class: 'nc-mark' + (fresh ? ' is-new' : ''), viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' });
        MARK_PATHS[mark].forEach(function (d) { s.appendChild(svgEl('path', { d: d, pathLength: 1 })); });
        return s;
      }
      /* The scoreboard names who won, not which mark: against the computer the tally follows the
         people, so it stays right even after you switch from playing X to playing O.
         `bump` names the number that has just gone up, so it can jump. */
      function renderScore(bump) {
        var sc = scores[settings.mode];
        var rows = settings.mode === 'two'
          ? [['X', 'Player 1 (X)'], ['O', 'Player 2 (O)'], ['draw', 'Draws']]
          : [['you', 'You'], ['computer', 'Computer'], ['draw', 'Draws']];
        scoreList.replaceChildren.apply(scoreList, rows.map(function (r) {
          return h('li', null, h('span', { class: 'nc-lbl' }, r[1]), h('span', { class: 'visually-hidden' }, ': '),
            h('b', { class: 'nc-num' + (r[0] === bump && !RM ? ' is-bump' : '') }, String(sc[r[0]])));
        }));
      }
      /* `fresh` is the square that has just been played: its mark is drawn in with chalk. */
      function renderBoard(fresh) {
        board.classList.toggle('is-won', !!state.line);
        for (var i = 0; i < 9; i++) {
          var v = state.board[i];
          if (v !== shown[i]) {
            /* The hidden letter keeps the square's text honest (X, O or nothing); the SVG is the chalk. */
            cells[i].replaceChildren();
            if (v) { cells[i].appendChild(h('span', { class: 'visually-hidden' }, v)); cells[i].appendChild(markSvg(v, i === fresh && !RM)); }
            shown[i] = v;
          }
          var win = state.line && state.line.indexOf(i) >= 0;
          cells[i].className = 'cell' + (v ? ' ' + v.toLowerCase() : '') + (win ? ' win' : '');
          if (win) cells[i].style.setProperty('--nc-delay', (0.62 + 0.09 * state.line.indexOf(i)).toFixed(2) + 's'); else cells[i].style.removeProperty('--nc-delay');
          /* A filled square is marked aria-disabled, not disabled, so it stays focusable and the arrow keys
             can still step across it. Once the game is over the whole board is really switched off. */
          if (v) cells[i].setAttribute('aria-disabled', 'true'); else cells[i].removeAttribute('aria-disabled');
          cells[i].disabled = state.over;
          cells[i].setAttribute('aria-label', 'Row ' + (Math.floor(i / 3) + 1) + ', column ' + (i % 3 + 1) + ', ' + (v ? v : 'empty') + (win ? ', part of the winning line' : ''));
        }
        drawStrike(state.line, fresh >= 0 && !RM);
      }
      function centre(i) { return [50 + 100 * (i % 3), 50 + 100 * Math.floor(i / 3)]; }
      /* The gold line runs from the first square of the three to the last, and a little beyond. */
      function drawStrike(line, animate) {
        if (!line) { strike.style.display = 'none'; strike.classList.remove('is-new'); return; }
        var a = centre(line[0]), b = centre(line[2]);
        var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
        var ex = dx / len * 30, ey = dy / len * 30;
        var d = 'M' + (a[0] - ex).toFixed(1) + ' ' + (a[1] - ey).toFixed(1) + ' L' + (b[0] + ex).toFixed(1) + ' ' + (b[1] + ey).toFixed(1);
        strikeUnder.setAttribute('d', d); strikeOver.setAttribute('d', d);
        strike.classList.toggle('is-new', !!animate);
        strike.style.display = '';
      }
      /* New game wipes the slate with a cloth (not with reduced motion). */
      function wipe() {
        if (RM) return;
        board.classList.remove('is-wiping'); void board.offsetWidth; board.classList.add('is-wiping');
        clearTimeout(wipeTimer); wipeTimer = setTimeout(function () { board.classList.remove('is-wiping'); }, 500);
      }
      /* A tap on a square that is already taken: a buzz and a shake, and nothing changes. */
      function refuse(i) {
        api.sound('wrong');
        if (RM) return;
        cells[i].classList.remove('is-shake'); void cells[i].offsetWidth; cells[i].classList.add('is-shake');
      }
      function isComputerTurn() { return settings.mode === 'computer' && state.turn !== settings.human && !state.over; }

      /* ----- play ----- */
      function newGame() {
        if (timer) { clearTimeout(timer); timer = null; }
        board.classList.remove('is-thinking');
        state = { board: ['', '', '', '', '', '', '', '', ''], turn: 'X', over: false, line: null };
        computerRow.hidden = settings.mode !== 'computer';
        setTabCell(0);
        renderBoard(-1); renderScore();
        if (isComputerTurn()) computerTurn(); else api.status(label(state.turn) + ' to play');
      }
      function endGame(fresh, bump, statusText) {
        state.over = true;
        api.store.set('scores', scores);
        /* The squares are about to be switched off, so move the keyboard to New game first
           rather than letting focus fall off the page. */
        if (focusIsOnBoard()) newBtn.focus();
        renderBoard(fresh); renderScore(bump);
        api.status(statusText);
      }
      function play(i) {
        state.board[i] = state.turn;
        api.sound('chalk');
        var w = winnerOf(state.board);
        if (w) {
          state.line = w.line;
          var key = settings.mode === 'two' ? w.who : (w.who === settings.human ? 'you' : 'computer');
          scores[settings.mode][key]++;
          endGame(i, key, winText(w.who));
          /* Every win by a person gets the fanfare, confetti and a star on the ticket, in two-player games too. */
          if (settings.mode === 'two') api.celebrate(label(w.who) + ' wins!');
          else if (w.who === settings.human) api.celebrate('You beat the computer!');
          else api.sound('lose');
          return;
        }
        if (!emptyCells(state.board).length) {
          scores[settings.mode].draw++;
          endGame(i, 'draw', drawText());
          api.sound('thud');
          return;
        }
        state.turn = state.turn === 'X' ? 'O' : 'X';
        renderBoard(i);
        keepFocusUseful(i);
        if (isComputerTurn()) computerTurn(); else api.status(label(state.turn) + ' to play');
      }
      function humanMove(i) {
        if (state.over || isComputerTurn()) return;
        if (state.board[i]) { refuse(i); return; }
        play(i);
      }
      /* The computer waits a moment before moving so you can see what happened.
         The board stays switched on while it thinks; humanMove simply ignores clicks until it is your turn. */
      function computerTurn() {
        api.status('Computer is thinking');
        board.classList.add('is-thinking');
        timer = setTimeout(function () {
          timer = null;
          board.classList.remove('is-thinking');
          var move = settings.level === 'easy'
            ? emptyCells(state.board)[Math.floor(api.random() * emptyCells(state.board).length)]
            : bestMove(state.board.slice(), state.turn, api.random);
          play(move);
        }, RM ? 0 : 350);
      }

      newGame();
      return { destroy: function () { if (timer) clearTimeout(timer); clearTimeout(wipeTimer); } };
    }
  });
})();
