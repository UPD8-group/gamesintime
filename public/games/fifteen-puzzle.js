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
      var shown = ''; /* the last status line we set, so we do not repeat ourselves to screen readers */

      /* Looks. The tray is teal, the tiles are little raised blocks with a visible edge, and the empty space is a
         dark hole with a dashed outline, so it is easy to find in both themes and on a projector.
         Three local colour names (tray, face, base) are set once per theme, then every rule below uses them. */
      root.appendChild(h('style', null,
        '.game-fifteen-puzzle { --tray: var(--brand); --face: var(--surface); --base: var(--surface-2); }' +
        /* Dark theme: the tray goes darker than the tiles, so the tiles look raised instead of sunken. The site's
           own stylesheet switches themes with these two selectors, so we copy them (still prefixed, so nothing leaks). */
        ':root[data-theme="dark"] .game-fifteen-puzzle { --tray: var(--bg); --face: var(--surface-2); --base: var(--line); }' +
        '@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .game-fifteen-puzzle { --tray: var(--bg); --face: var(--surface-2); --base: var(--line); } }' +
        '.game-fifteen-puzzle .board { display: grid; gap: 6px; width: min(92vw, 420px); padding: 8px; background: var(--tray); border: 2px solid var(--line); border-radius: 12px; }' +
        '.game-fifteen-puzzle .tile { aspect-ratio: 1; min-width: 0; min-height: 44px; border: 2px solid var(--line); border-radius: 8px; background: var(--face); color: var(--ink); font-family: var(--font-display); font-size: clamp(1.4rem, 7vw, 2.4rem); line-height: 1; box-shadow: inset 0 -4px 0 var(--base); }' +
        /* Tiles that can slide always wear a brass edge and a brass base, not only on hover, so a kid can see which ones move. */
        '.game-fifteen-puzzle .tile.can { border-color: var(--brass); box-shadow: inset 0 -4px 0 var(--brass); cursor: pointer; }' +
        '.game-fifteen-puzzle .tile.can:hover { background: var(--surface-2); }' +
        /* The gap is a hole: a dark see-through layer over the tray with a pale dashed outline. Both colours are
           translucent, so they darken whatever the tray colour is and read in both themes. */
        '.game-fifteen-puzzle .tile.gap { background: rgba(0, 0, 0, .38); border: 2px dashed rgba(255, 255, 255, .45); box-shadow: inset 0 3px 8px rgba(0, 0, 0, .45); cursor: default; }' +
        /* In impossible mode the two swapped tiles, 14 and 15, are red with a brass underline, so the mark does not
           rely on colour alone. The tile you slide is never marked: you did nothing wrong. */
        '.game-fifteen-puzzle .tile.swapped { color: var(--red); text-decoration: underline; text-decoration-color: var(--brass); text-decoration-thickness: 3px; text-underline-offset: 4px; }' +
        /* When solved the tiles turn brass, but the empty space stays empty so the gap is still a gap. */
        '.game-fifteen-puzzle .board.solved .tile:not(.gap) { background: var(--brass-bright); border-color: var(--brass-bright); color: #1b2a2a; box-shadow: none; }' +
        '.game-fifteen-puzzle .why { margin-top: .75rem; }' +
        '.game-fifteen-puzzle .why summary { cursor: pointer; font-weight: 700; min-height: 44px; display: flex; align-items: center; }'));

      var sizeField = h('label', { class: 'field' }, 'Size ',
        h('select', { onchange: function (e) { size = Number(e.target.value); api.store.set('size', size); newGame(); } },
          h('option', { value: '3', selected: size === 3 }, 'Eight puzzle, 3 by 3'),
          h('option', { value: '4', selected: size === 4 }, 'Fifteen puzzle, 4 by 4')));
      /* The New game button shuffles the tiles. The hidden words tell screen readers that too. */
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: newGame }, 'New game', h('span', { class: 'visually-hidden' }, ' (shuffle the tiles)'));
      var impossibleBtn = h('button', { class: 'btn', type: 'button', onclick: setImpossible }, 'Try the impossible 14-15 puzzle');
      root.appendChild(h('div', { class: 'game-toolbar' }, newBtn, sizeField, impossibleBtn));

      var movesEl = h('span', null), timeEl = h('span', null), bestEl = h('span', null);
      root.appendChild(h('div', { class: 'scoreboard', role: 'group', 'aria-label': 'Progress' }, movesEl, timeEl, bestEl));

      /* The board is a plain group of buttons. Each button says what it is in its own aria-label, so we do not
         need the grid role (which would also promise screen readers that arrow keys move between cells). */
      var board = h('div', { class: 'board', role: 'group', 'aria-label': 'Sliding puzzle' });
      board.addEventListener('keydown', function (ev) {
        /* Arrow keys slide the tile on that side of the gap into the gap, so ArrowLeft moves a tile leftwards.
           Any arrow key is swallowed first, even one that cannot move anything, so the page never scrolls mid-puzzle. */
        if (!/^Arrow(Left|Right|Up|Down)$/.test(ev.key)) return;
        ev.preventDefault();
        var g = tiles.indexOf(0), r = Math.floor(g / size), c = g % size, from = -1;
        if (ev.key === 'ArrowLeft' && c < size - 1) from = g + 1;
        else if (ev.key === 'ArrowRight' && c > 0) from = g - 1;
        else if (ev.key === 'ArrowUp' && r < size - 1) from = g + size;
        else if (ev.key === 'ArrowDown' && r > 0) from = g - size;
        if (from >= 0) slide(from);
      });
      root.appendChild(board);
      var note = h('p', { class: 'game-note' }, 'Tap or click a tile in the same row or column as the gap to slide it; every tile between it and the gap moves one space. Arrow keys work too.');
      root.appendChild(note);
      var why = h('details', { class: 'why', hidden: true },
        h('summary', null, 'Why can nobody solve the 14-15 puzzle?'),
        h('div', { class: 'prose' },
          h('p', null, 'Every slide swaps the gap with one tile. Count how many pairs of tiles are out of order, and which row the gap is in. Each slide changes that combination in a fixed way, so some arrangements can never turn into the finished picture, no matter how many moves you make.'),
          h('p', null, 'Swapping just 14 and 15 is one of those. During the 1880 craze people offered prizes of up to a thousand dollars to anyone who could swap just 14 and 15 and finish, and years later the American puzzle writer Sam Loyd repeated the offer, knowing nobody could win. The maths is certain: the puzzle is impossible. Half of all possible arrangements are like that, which is why this game shuffles by sliding tiles rather than scattering them at random.')));
      root.appendChild(why);

      /* Sets the status line, but only when the words change, so screen readers do not hear the same thing twice. */
      function say(text) {
        if (text !== shown) { shown = text; api.status(text); }
      }
      /* The normal status for this board: the goal, or the warning in impossible mode. */
      function goalStatus() {
        return impossible ? '14 and 15 are swapped. Try to fix it. (Spoiler: nobody can.)'
          : 'Slide the tiles into order, 1 to ' + (size * size - 1) + '.';
      }
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
        /* Remember which numbered tile has keyboard focus, so focus can follow it to its new square. */
        var focusedAt = buttons.indexOf(document.activeElement);
        var focusedTile = focusedAt >= 0 ? tiles[focusedAt] : 0;
        var g = tiles.indexOf(0);
        var step = Math.floor(i / size) === Math.floor(g / size) ? (i > g ? 1 : -1) : (i > g ? size : -size);
        while (g !== i) { tiles[g] = tiles[g + step]; g += step; }
        tiles[i] = 0;
        if (!silent) {
          moves++;
          if (!started) { started = true; startClock(); }
          if (isSolved()) finish(); else say(goalStatus());
          render();
          keepFocus(focusedTile);
        }
        return true;
      }
      /* After a slide the tile that had focus has moved, and the square it left is now the disabled gap.
         Put focus back on that tile. When the puzzle is finished every tile is disabled, so go to New game. */
      function keepFocus(tileNumber) {
        if (!tileNumber) return;
        if (solved) { newBtn.focus(); return; }
        var b = buttons[tiles.indexOf(tileNumber)];
        if (b) b.focus();
      }
      function startClock() {
        stopClock();
        ticking = setInterval(function () {
          /* If the page has moved on and our board is no longer in the document, stop ticking and tidy up. */
          if (!root.isConnected) { stopClock(); return; }
          seconds++; renderScore();
        }, 1000);
        /* While the clock runs, also watch for the visitor leaving the page, so it stops straight away. */
        window.addEventListener('hashchange', onLeave);
      }
      function stopClock() {
        if (ticking) { clearInterval(ticking); ticking = null; }
        window.removeEventListener('hashchange', onLeave);
      }
      /* The address changed, so the shell is swapping pages. Wait one tick for it to finish, then if our board
         has gone from the document, stop the clock (which also removes this listener). */
      function onLeave() {
        setTimeout(function () { if (!root.isConnected) stopClock(); }, 0);
      }
      function finish() {
        solved = true; stopClock();
        var key = String(size);
        var record = best[key];
        if (!record || moves < record.moves) { best[key] = { moves: moves, seconds: seconds }; api.store.set('best', best); }
        say('Solved in ' + moves + ' moves and ' + clock(seconds) + '!' + (!record || moves < record.moves ? ' A new best.' : ''));
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
            var b = h('button', { class: 'tile', type: 'button', onclick: function () {
              if (!slide(i) && !solved) say('That tile cannot move. Pick one in the same row or column as the gap.');
            } });
            buttons.push(b); board.appendChild(b);
          });
        }
        tiles.forEach(function (v, i) {
          var b = buttons[i], r = Math.floor(i / size) + 1, c = i % size + 1;
          /* In impossible mode only the swapped pair, 14 and 15, are marked, wherever they have been slid to. */
          var swapped = impossible && (v === 14 || v === 15);
          b.textContent = v ? String(v) : '';
          b.className = 'tile' + (v ? '' : ' gap') + (v && canSlide(i) && !solved ? ' can' : '') + (swapped ? ' swapped' : '');
          b.disabled = !v || solved;
          b.setAttribute('aria-label', (v ? 'Tile ' + v : 'Empty space') + ', row ' + r + ', column ' + c + (swapped ? ', one of the swapped pair' : '') + (v && canSlide(i) ? ', can slide' : ''));
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
        if (isSolved()) newGame(); else { render(); say(goalStatus()); }
      }
      function setImpossible() {
        reset();
        /* The 14-15 puzzle is always 4 by 4, so remember that size the same way the Size menu does. */
        size = 4; api.store.set('size', 4); sizeField.querySelector('select').value = '4';
        tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 14, 0];
        impossible = true; why.hidden = false;
        render();
        say(goalStatus());
      }

      newGame();
      return { destroy: function () { stopClock(); } };
    }
  });
})();
