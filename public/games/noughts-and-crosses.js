/* Noughts and Crosses. The name was first recorded in 1864; the game is far older.
   Plays the computer (easy: random; hard: perfect play, so it never loses) or two players on one device.
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

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
      var score = api.store.get('score', { X: 0, O: 0, draw: 0 });
      var state, timer = null, cells = [];

      root.appendChild(h('style', null,
        '.game-noughts-and-crosses .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: min(92vw, 360px); }' +
        '.game-noughts-and-crosses .cell { aspect-ratio: 1; min-width: 0; min-height: 44px; border: 2px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--ink); font-family: var(--font-display); font-size: clamp(2.2rem, 12vw, 4.4rem); line-height: 1; display: flex; align-items: center; justify-content: center; transition: background .15s; }' +
        '.game-noughts-and-crosses .cell:hover:not(:disabled) { background: var(--surface-2); }' +
        '.game-noughts-and-crosses .cell.x { color: var(--link); }' +
        '.game-noughts-and-crosses .cell.o { color: var(--red); }' +
        '.game-noughts-and-crosses .cell.win { background: var(--surface-2); box-shadow: inset 0 0 0 3px var(--brass); }' +
        '.game-noughts-and-crosses .cell:disabled { cursor: default; background: var(--surface); opacity: 1; }' +
        '.game-noughts-and-crosses .cell:disabled:not(.x):not(.o) { border-style: dashed; }' +
        '.game-noughts-and-crosses .controls { display: grid; gap: .6rem; margin-bottom: 1rem; }'));

      /* controls */
      var modeSeg = seg([['computer', 'Play the computer'], ['two', 'Two players']], settings.mode, function (v) { settings.mode = v; api.store.set('mode', v); newGame(); });
      var levelSeg = seg([['easy', 'Easy'], ['hard', 'Hard']], settings.level, function (v) { settings.level = v; api.store.set('level', v); newGame(); });
      var humanSeg = seg([['X', 'You are X, first'], ['O', 'You are O, second']], settings.human, function (v) { settings.human = v; api.store.set('human', v); newGame(); });
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: newGame }, 'New game');
      var resetBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { score = { X: 0, O: 0, draw: 0 }; api.store.set('score', score); renderScore(); api.announce('Score reset'); } }, 'Reset score');
      var computerRow = h('div', { class: 'game-toolbar' }, levelSeg.el, humanSeg.el);
      root.appendChild(h('div', { class: 'controls' },
        h('div', { class: 'game-toolbar', style: { marginBottom: 0 } }, modeSeg.el, newBtn, resetBtn),
        computerRow));

      var scoreEl = h('div', { class: 'scoreboard', 'aria-label': 'Score' });
      root.appendChild(scoreEl);

      var board = h('div', { class: 'board', role: 'grid', 'aria-label': 'Noughts and crosses board, three by three' });
      for (var r = 0; r < 3; r++) {
        var row = h('div', { role: 'row', style: { display: 'contents' } });
        for (var c = 0; c < 3; c++) {
          (function (i) {
            var cell = h('button', { class: 'cell', type: 'button', role: 'gridcell', onclick: function () { humanMove(i); } });
            cells.push(cell); row.appendChild(cell);
          })(r * 3 + c);
        }
        board.appendChild(row);
      }
      board.addEventListener('keydown', function (ev) {
        var i = cells.indexOf(document.activeElement);
        if (i < 0) return;
        var j = i;
        if (ev.key === 'ArrowRight') j = i % 3 === 2 ? i - 2 : i + 1;
        else if (ev.key === 'ArrowLeft') j = i % 3 === 0 ? i + 2 : i - 1;
        else if (ev.key === 'ArrowDown') j = (i + 3) % 9;
        else if (ev.key === 'ArrowUp') j = (i + 6) % 9;
        else return;
        ev.preventDefault(); cells[j].focus();
      });
      root.appendChild(board);
      root.appendChild(h('p', { class: 'game-note' }, 'Tip: use the arrow keys to move around the board and Enter to play.'));

      function seg(options, value, onChange) {
        var el = h('div', { class: 'seg', role: 'group' });
        var buttons = options.map(function (o) {
          return h('button', { type: 'button', 'aria-pressed': String(o[0] === value), onclick: function () {
            buttons.forEach(function (b, k) { b.setAttribute('aria-pressed', String(options[k][0] === o[0])); });
            onChange(o[0]);
          } }, o[1]);
        });
        buttons.forEach(function (b) { el.appendChild(b); });
        return { el: el };
      }

      function label(mark) {
        if (settings.mode === 'two') return (mark === 'X' ? 'Player 1' : 'Player 2') + ' (' + mark + ')';
        return mark === settings.human ? 'You (' + mark + ')' : 'Computer (' + mark + ')';
      }
      function renderScore() {
        scoreEl.replaceChildren(
          h('span', null, 'X wins: ' + score.X),
          h('span', null, 'O wins: ' + score.O),
          h('span', null, 'Draws: ' + score.draw));
      }
      function renderBoard() {
        for (var i = 0; i < 9; i++) {
          var v = state.board[i];
          cells[i].textContent = v;
          cells[i].className = 'cell' + (v ? ' ' + v.toLowerCase() : '') + (state.line && state.line.indexOf(i) >= 0 ? ' win' : '');
          cells[i].disabled = !!v || state.over;
          cells[i].setAttribute('aria-label', 'Row ' + (Math.floor(i / 3) + 1) + ', column ' + (i % 3 + 1) + ', ' + (v ? v : 'empty'));
        }
      }
      function isComputerTurn() { return settings.mode === 'computer' && state.turn !== settings.human && !state.over; }

      function newGame() {
        if (timer) { clearTimeout(timer); timer = null; }
        state = { board: ['', '', '', '', '', '', '', '', ''], turn: 'X', over: false, line: null };
        computerRow.hidden = settings.mode !== 'computer';
        renderBoard(); renderScore();
        if (isComputerTurn()) computerTurn(); else api.status(label(state.turn) + ' to play');
      }
      function play(i) {
        state.board[i] = state.turn;
        var w = winnerOf(state.board);
        if (w) {
          state.over = true; state.line = w.line; score[w.who]++; api.store.set('score', score);
          renderBoard(); renderScore();
          api.status(label(w.who) + (settings.mode === 'computer' && w.who === settings.human ? ' wins! Well played.' : ' wins!'));
          return;
        }
        if (!emptyCells(state.board).length) {
          state.over = true; score.draw++; api.store.set('score', score);
          renderBoard(); renderScore();
          api.status('A draw. Nobody can win when both sides play well.');
          return;
        }
        state.turn = state.turn === 'X' ? 'O' : 'X';
        renderBoard();
        if (isComputerTurn()) computerTurn(); else api.status(label(state.turn) + ' to play');
      }
      function humanMove(i) {
        if (state.over || state.board[i] || isComputerTurn()) return;
        play(i);
      }
      function computerTurn() {
        api.status('Computer is thinking');
        cells.forEach(function (c) { c.disabled = true; });
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
