/* The Fifteen Puzzle, the craze of 1880. Slide the tiles into order.
   Every puzzle the computer gives you is solvable, because it shuffles by making real moves from the solved
   position. There is also a button for the famous impossible version, with 14 and 15 swapped.
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  GamesInTime.register({
    id: 'fifteen-puzzle',
    mount: function (root, api) {
      var h = api.h;
      var size = api.store.get('size', 4);
      var best = api.store.get('best', {});
      var tiles = [], moves = 0, seconds = 0, ticking = null, started = false, solved = false, impossible = false, buttons = [];

      root.appendChild(h('style', null,
        '.game-fifteen-puzzle .board { display: grid; gap: 6px; width: min(92vw, 420px); padding: 8px; background: var(--brand); border-radius: 12px; }' +
        '.game-fifteen-puzzle .tile { aspect-ratio: 1; min-width: 0; min-height: 44px; border: 0; border-radius: 8px; background: var(--surface); color: var(--ink); font-family: var(--font-display); font-size: clamp(1.4rem, 7vw, 2.4rem); line-height: 1; box-shadow: inset 0 -4px 0 var(--surface-2); }' +
        '.game-fifteen-puzzle .tile.can:hover { background: var(--surface-2); }' +
        '.game-fifteen-puzzle .tile.gap { background: transparent; box-shadow: none; cursor: default; }' +
        '.game-fifteen-puzzle .tile.wrong { color: var(--red); }' +
        '.game-fifteen-puzzle .board.solved .tile { background: var(--brass-bright); color: #1b2a2a; box-shadow: none; }' +
        '.game-fifteen-puzzle .why { margin-top: .75rem; }' +
        '.game-fifteen-puzzle .why summary { cursor: pointer; font-weight: 700; min-height: 44px; display: flex; align-items: center; }'));

      var sizeField = h('label', { class: 'field' }, 'Size ',
        h('select', { onchange: function (e) { size = Number(e.target.value); api.store.set('size', size); newGame(); } },
          h('option', { value: '3', selected: size === 3 }, 'Eight puzzle, 3 by 3'),
          h('option', { value: '4', selected: size === 4 }, 'Fifteen puzzle, 4 by 4')));
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: newGame }, 'Shuffle');
      var impossibleBtn = h('button', { class: 'btn', type: 'button', onclick: setImpossible }, 'Try the impossible 14-15 puzzle');
      root.appendChild(h('div', { class: 'game-toolbar' }, newBtn, sizeField, impossibleBtn));

      var movesEl = h('span', null), timeEl = h('span', null), bestEl = h('span', null);
      root.appendChild(h('div', { class: 'scoreboard', 'aria-label': 'Progress' }, movesEl, timeEl, bestEl));

      var board = h('div', { class: 'board', role: 'grid', 'aria-label': 'Sliding puzzle' });
      board.addEventListener('keydown', function (ev) {
        /* Arrow keys slide the tile on that side of the gap into the gap, so ArrowLeft moves a tile leftwards. */
        var g = tiles.indexOf(0), r = Math.floor(g / size), c = g % size, from = -1;
        if (ev.key === 'ArrowLeft' && c < size - 1) from = g + 1;
        else if (ev.key === 'ArrowRight' && c > 0) from = g - 1;
        else if (ev.key === 'ArrowUp' && r < size - 1) from = g + size;
        else if (ev.key === 'ArrowDown' && r > 0) from = g - size;
        else return;
        ev.preventDefault(); slide(from);
        if (buttons[from]) buttons[from].focus();
      });
      root.appendChild(board);
      var note = h('p', { class: 'game-note' }, 'Tap a tile in the same row or column as the gap to slide it. Arrow keys work too.');
      root.appendChild(note);
      var why = h('details', { class: 'why', hidden: true },
        h('summary', null, 'Why can nobody solve the 14-15 puzzle?'),
        h('div', { class: 'prose' },
          h('p', null, 'Every slide swaps the gap with one tile. Count how many pairs of tiles are out of order, and which row the gap is in. Each slide changes that combination in a fixed way, so some arrangements can never turn into the finished picture, no matter how many moves you make.'),
          h('p', null, 'Swapping just 14 and 15 is one of those. In the 1890s a famous puzzle maker offered a thousand dollars to anyone who could solve it. Nobody collected, because it is impossible. Half of all possible arrangements are like that, which is why this game shuffles by sliding tiles rather than scattering them at random.')));
      root.appendChild(why);

      function isSolved() {
        for (var i = 0; i < tiles.length - 1; i++) if (tiles[i] !== i + 1) return false;
        return tiles[tiles.length - 1] === 0;
      }
      function canSlide(i) {
        var g = tiles.indexOf(0);
        return i !== g && (Math.floor(i / size) === Math.floor(g / size) || i % size === g % size);
      }
      /* Slides every tile between the clicked tile and the gap, one step towards the gap. */
      function slide(i, silent) {
        if (solved || i < 0 || i >= tiles.length || !canSlide(i)) return false;
        var g = tiles.indexOf(0);
        var step = Math.floor(i / size) === Math.floor(g / size) ? (i > g ? 1 : -1) : (i > g ? size : -size);
        while (g !== i) { tiles[g] = tiles[g + step]; g += step; }
        tiles[i] = 0;
        if (!silent) {
          moves++;
          if (!started) { started = true; startClock(); }
          if (isSolved()) finish();
          render();
        }
        return true;
      }
      function startClock() {
        stopClock();
        ticking = setInterval(function () { seconds++; renderScore(); }, 1000);
      }
      function stopClock() { if (ticking) { clearInterval(ticking); ticking = null; } }
      function finish() {
        solved = true; stopClock();
        var key = String(size);
        var record = best[key];
        if (!record || moves < record.moves) { best[key] = { moves: moves, seconds: seconds }; api.store.set('best', best); }
        api.status('Solved in ' + moves + ' moves and ' + clock(seconds) + '!' + (!record || moves < record.moves ? ' A new best.' : ''));
      }
      function clock(s) { var m = Math.floor(s / 60); return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
      function renderScore() {
        movesEl.textContent = 'Moves: ' + moves;
        timeEl.textContent = 'Time: ' + clock(seconds);
        var record = best[String(size)];
        bestEl.textContent = record ? 'Best: ' + record.moves + ' moves' : 'Best: none yet';
      }
      function render() {
        board.style.gridTemplateColumns = 'repeat(' + size + ', 1fr)';
        board.classList.toggle('solved', solved);
        if (buttons.length !== tiles.length) {
          buttons = []; board.replaceChildren();
          tiles.forEach(function (_, i) {
            var b = h('button', { class: 'tile', type: 'button', role: 'gridcell', onclick: function () {
              if (!slide(i) && !solved) api.status('That tile cannot move. Pick one in the same row or column as the gap.');
            } });
            buttons.push(b); board.appendChild(b);
          });
        }
        tiles.forEach(function (v, i) {
          var b = buttons[i], r = Math.floor(i / size) + 1, c = i % size + 1;
          b.textContent = v ? String(v) : '';
          b.className = 'tile' + (v ? '' : ' gap') + (v && canSlide(i) && !solved ? ' can' : '') + (impossible && v && v !== i + 1 ? ' wrong' : '');
          b.disabled = !v || solved;
          b.setAttribute('aria-label', (v ? 'Tile ' + v : 'Empty space') + ', row ' + r + ', column ' + c + (v && canSlide(i) ? ', can slide' : ''));
        });
        renderScore();
      }
      function reset() {
        stopClock(); moves = 0; seconds = 0; started = false; solved = false; impossible = false; why.hidden = true;
        tiles = []; for (var i = 1; i < size * size; i++) tiles.push(i); tiles.push(0);
        buttons = [];
      }
      function newGame() {
        reset();
        /* Shuffle by sliding: 60 random moves per tile, never undoing the previous move, so the result is always solvable. */
        var last = -1, n = size * size * 60;
        while (n > 0) {
          var g = tiles.indexOf(0), options = [];
          [g - 1, g + 1, g - size, g + size].forEach(function (i) { if (i >= 0 && i < tiles.length && i !== last && canSlide(i)) options.push(i); });
          var pick = options[Math.floor(api.random() * options.length)];
          last = tiles.indexOf(0); slide(pick, true); n--;
        }
        if (isSolved()) newGame(); else { render(); api.status('Slide the tiles into order, 1 to ' + (size * size - 1) + '.'); }
      }
      function setImpossible() {
        reset();
        size = 4; sizeField.querySelector('select').value = '4';
        tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 14, 0];
        impossible = true; why.hidden = false;
        render();
        api.status('14 and 15 are swapped. Try to fix it. (Spoiler: nobody can.)');
      }

      newGame();
      return { destroy: function () { stopClock(); } };
    }
  });
})();
