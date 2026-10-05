/* Noughts and Crosses. The game is ancient; the English name was first printed in 1858.
   Plays the computer (easy: random; hard: perfect play, so it never loses) or two players on one device.
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

  GamesInTime.register({
    id: 'noughts-and-crosses',
    mount: function (root, api) {
      var h = api.h;
      var settings = {
        mode: api.store.get('mode', 'computer'),   // 'computer' or 'two'
        level: api.store.get('level', 'hard'),      // 'easy' or 'hard'
        human: api.store.get('human', 'X')          // which mark the human plays against the computer
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
      var state, timer = null, cells = [];
      var tabCell = 0;   // the one square that Tab lands on (a "roving tabindex"); arrow keys move it

      root.appendChild(h('style', null,
        '.game-noughts-and-crosses .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: min(92vw, 360px); }' +
        '.game-noughts-and-crosses .cell { aspect-ratio: 1; min-width: 0; min-height: 44px; border: 3px solid var(--ink-muted); border-radius: 12px; background: var(--surface); color: var(--ink); font-family: var(--font-display); font-size: clamp(2.2rem, 12vw, 4.4rem); line-height: 1; display: flex; align-items: center; justify-content: center; transition: background .15s; cursor: pointer; }' +
        '.game-noughts-and-crosses .cell:hover:not([aria-disabled="true"]):not(:disabled) { background: var(--surface-2); }' +
        '.game-noughts-and-crosses .cell.x { color: var(--link); }' +
        '.game-noughts-and-crosses .cell.o { color: var(--red); }' +
        '.game-noughts-and-crosses .cell.win { background: var(--surface-2); box-shadow: inset 0 0 0 3px var(--brass); }' +
        '.game-noughts-and-crosses .cell[aria-disabled="true"], .game-noughts-and-crosses .cell:disabled { cursor: default; background: var(--surface); opacity: 1; }' +
        '.game-noughts-and-crosses .cell.win:disabled { background: var(--surface-2); }' +
        '.game-noughts-and-crosses .seg button { min-height: 44px; }' +
        '.game-noughts-and-crosses .scoreboard { margin-top: .9rem; }' +
        '.game-noughts-and-crosses .settings { display: grid; gap: .6rem; margin-top: .25rem; }' +
        '.game-noughts-and-crosses .settings .game-toolbar { margin-bottom: 0; }' +
        /* Classroom mode (for projecting): the board grows to fill the screen and the marks grow with it. */
        '.classroom .game-noughts-and-crosses .board { width: min(92vw, 60vh, 600px); }' +
        '.classroom .game-noughts-and-crosses .cell { font-size: min(18vw, 12vh, 7.5rem); }'));

      /* ----- controls -----
         Layout, top to bottom: New game row, the board, the score, then the settings.
         The board sits right under the status line so "Your turn" and "You win" are next to the squares,
         even on a phone. The settings are used less often, so they go underneath. */
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: newGame }, 'New game');
      var resetBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: function () {
        scores[settings.mode] = settings.mode === 'computer' ? { you: 0, computer: 0, draw: 0 } : { X: 0, O: 0, draw: 0 };
        api.store.set('scores', scores); renderScore(); api.announce('Score reset');
      } }, 'Reset score');
      root.appendChild(h('div', { class: 'game-toolbar' }, newBtn, resetBtn));

      /* The board: nine plain buttons in a CSS grid. Each has an aria-label saying where it is and what is on it.
         Only one button is in the Tab order at a time; the arrow keys move between all nine (see onKey). */
      var board = h('div', { class: 'board', role: 'group', 'aria-label': 'Noughts and crosses board, three by three' });
      for (var i = 0; i < 9; i++) {
        (function (i) {
          var cell = h('button', { class: 'cell', type: 'button', tabindex: i === 0 ? '0' : '-1',
            onclick: function () { humanMove(i); },
            onfocus: function () { setTabCell(i); } });
          cells.push(cell); board.appendChild(cell);
        })(i);
      }
      board.addEventListener('keydown', onKey);
      root.appendChild(board);

      var scoreEl = h('div', { class: 'scoreboard', 'aria-label': 'Score' });
      root.appendChild(scoreEl);

      var modeSeg = seg([['computer', 'Play the computer'], ['two', 'Two players']], settings.mode, function (v) { settings.mode = v; api.store.set('mode', v); newGame(); });
      var levelSeg = seg([['easy', 'Easy'], ['hard', 'Hard']], settings.level, function (v) { settings.level = v; api.store.set('level', v); newGame(); });
      var humanSeg = seg([['X', 'You are X, first'], ['O', 'You are O, second']], settings.human, function (v) { settings.human = v; api.store.set('human', v); newGame(); });
      var computerRow = h('div', { class: 'game-toolbar' }, levelSeg.el, humanSeg.el);
      root.appendChild(h('div', { class: 'settings', role: 'group', 'aria-label': 'Game settings' },
        h('div', { class: 'game-toolbar' }, modeSeg.el),
        computerRow));
      root.appendChild(h('p', { class: 'game-note' }, 'Tip: use the arrow keys to move around the board and Enter or Space to play.'));

      /* A row of buttons where one is pressed at a time. Clicking the one that is already pressed
         does nothing, so a game in progress is not wiped by accident. */
      function seg(options, value, onChange) {
        var current = value;
        var el = h('div', { class: 'seg', role: 'group' });
        var buttons = options.map(function (o) {
          return h('button', { type: 'button', 'aria-pressed': String(o[0] === value), onclick: function () {
            if (o[0] === current) return;
            current = o[0];
            buttons.forEach(function (b, k) { b.setAttribute('aria-pressed', String(options[k][0] === o[0])); });
            onChange(o[0]);
          } }, o[1]);
        });
        buttons.forEach(function (b) { el.appendChild(b); });
        return { el: el };
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
      function winText(mark) {
        if (settings.mode === 'two') return label(mark) + ' wins!';
        if (mark !== settings.human) return 'Computer (' + mark + ') wins!';
        return 'You win! Well played.';
      }
      function drawText() {
        var t = 'A draw. All nine squares are full.';
        if (settings.mode === 'computer' && settings.level === 'hard') t += ' Nobody can win when both sides play well.';
        return t;
      }

      /* ----- drawing ----- */
      /* The scoreboard names who won, not which mark: against the computer the tally follows the
         people, so it stays right even after you switch from playing X to playing O. */
      function renderScore() {
        var sc = scores[settings.mode];
        var rows = settings.mode === 'two'
          ? [['Player 1 (X)', sc.X], ['Player 2 (O)', sc.O], ['Draws', sc.draw]]
          : [['You', sc.you], ['Computer', sc.computer], ['Draws', sc.draw]];
        scoreEl.replaceChildren.apply(scoreEl, rows.map(function (r) { return h('span', null, r[0] + ': ' + r[1]); }));
      }
      function renderBoard() {
        for (var i = 0; i < 9; i++) {
          var v = state.board[i];
          cells[i].textContent = v;
          cells[i].className = 'cell' + (v ? ' ' + v.toLowerCase() : '') + (state.line && state.line.indexOf(i) >= 0 ? ' win' : '');
          /* A filled square is marked aria-disabled, not disabled, so it stays focusable and the arrow keys
             can still step across it. Once the game is over the whole board is really switched off. */
          if (v) cells[i].setAttribute('aria-disabled', 'true'); else cells[i].removeAttribute('aria-disabled');
          cells[i].disabled = state.over;
          cells[i].setAttribute('aria-label', 'Row ' + (Math.floor(i / 3) + 1) + ', column ' + (i % 3 + 1) + ', ' + (v ? v : 'empty'));
        }
      }
      function isComputerTurn() { return settings.mode === 'computer' && state.turn !== settings.human && !state.over; }

      /* ----- play ----- */
      function newGame() {
        if (timer) { clearTimeout(timer); timer = null; }
        state = { board: ['', '', '', '', '', '', '', '', ''], turn: 'X', over: false, line: null };
        computerRow.hidden = settings.mode !== 'computer';
        setTabCell(0);
        renderBoard(); renderScore();
        if (isComputerTurn()) computerTurn(); else api.status(label(state.turn) + ' to play');
      }
      function endGame(statusText) {
        state.over = true;
        api.store.set('scores', scores);
        /* The squares are about to be switched off, so move the keyboard to New game first
           rather than letting focus fall off the page. */
        if (focusIsOnBoard()) newBtn.focus();
        renderBoard(); renderScore();
        api.status(statusText);
      }
      function play(i) {
        state.board[i] = state.turn;
        var w = winnerOf(state.board);
        if (w) {
          state.line = w.line;
          var sc = scores[settings.mode];
          if (settings.mode === 'two') sc[w.who]++;
          else if (w.who === settings.human) sc.you++;
          else sc.computer++;
          endGame(winText(w.who));
          return;
        }
        if (!emptyCells(state.board).length) {
          scores[settings.mode].draw++;
          endGame(drawText());
          return;
        }
        state.turn = state.turn === 'X' ? 'O' : 'X';
        renderBoard();
        keepFocusUseful(i);
        if (isComputerTurn()) computerTurn(); else api.status(label(state.turn) + ' to play');
      }
      function humanMove(i) {
        if (state.over || state.board[i] || isComputerTurn()) return;
        play(i);
      }
      /* The computer waits a moment before moving so you can see what happened.
         The board stays switched on while it thinks; humanMove simply ignores clicks until it is your turn. */
      function computerTurn() {
        api.status('Computer is thinking');
        timer = setTimeout(function () {
          timer = null;
          var move = settings.level === 'easy'
            ? emptyCells(state.board)[Math.floor(api.random() * emptyCells(state.board).length)]
            : bestMove(state.board.slice(), state.turn, api.random);
          play(move);
        }, api.reducedMotion ? 0 : 450);
      }

      newGame();
      return { destroy: function () { if (timer) clearTimeout(timer); } };
    }
  });
})();
