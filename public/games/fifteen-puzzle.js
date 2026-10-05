/* The Fifteen Puzzle, the craze of 1880. Slide the tiles into order.
   Every puzzle the computer gives you is solvable, because it shuffles by making real moves from the solved
   position. There is also a button for the famous impossible version, with 14 and 15 swapped.
   The tray sits on a wooden games table: ivory tiles in a brass-rimmed box, and they slide with a clack.
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  var P = '.game-fifteen-puzzle ';
  var CSS = [
    /* Four local colour names: the dark tray, the ivory tile face, its number, and its shadowed edge. They are
       made from the frame's own colours, so the tiles read the same on every classroom screen. */
    '.game-fifteen-puzzle { container-type: inline-size; --fp-tray: color-mix(in srgb, var(--surface) 50%, black); --fp-face: var(--ink); --fp-num: var(--surface); --fp-edge: color-mix(in srgb, var(--ink) 60%, var(--surface)); }',
    P + '.fp-wrap { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }',
    P + '.fp-tools, ' + P + '.fp-extra { margin: 0; }',
    /* ----- the tray and the tiles ----- */
    P + '.board { display: grid; gap: 6px; width: min(100%, 400px); margin: 0 auto; padding: 10px; background: var(--fp-tray); border: 3px solid var(--brass); border-radius: 14px; box-shadow: inset 0 4px 14px rgba(0, 0, 0, .55), 0 3px 0 color-mix(in srgb, var(--brass) 35%, transparent); }',
    P + '.tile { position: relative; aspect-ratio: 1; min-width: 0; min-height: 44px; margin: 0; padding: 0; border: 2px solid transparent; border-radius: 9px; background: linear-gradient(160deg, var(--fp-face) 55%, color-mix(in srgb, var(--fp-face) 84%, var(--surface))); color: var(--fp-num); font-family: var(--font-poster); font-weight: 400; font-size: clamp(1.5rem, 10cqi, 2.8rem); line-height: 1; box-shadow: inset 0 -5px 0 var(--fp-edge), 0 3px 6px rgba(0, 0, 0, .35); display: grid; place-items: center; cursor: default; -webkit-tap-highlight-color: transparent; }',
    P + '.board.is-3 .tile { font-size: clamp(2rem, 13cqi, 3.8rem); }',
    P + '.tile:focus-visible { outline-offset: 2px; }',
    /* Tiles that can slide always wear a gold edge, not only on hover, so a kid can see which ones move. */
    P + '.tile.can { border-color: var(--gold); box-shadow: inset 0 -5px 0 var(--gold-shadow), 0 3px 6px rgba(0, 0, 0, .35); cursor: pointer; }',
    '@media (hover: hover) { ' + P + '.tile.can:hover { transform: translateY(-2px); box-shadow: inset 0 -5px 0 var(--gold-shadow), 0 6px 10px rgba(0, 0, 0, .4); } }',
    /* The gap is a hole in the tray with a pale dashed outline, easy to find on a projector. */
    P + '.tile.gap { background: transparent; border: 2px dashed color-mix(in srgb, var(--ink) 38%, transparent); box-shadow: inset 0 3px 10px rgba(0, 0, 0, .5); }',
    P + '.tile:disabled { opacity: 1; cursor: default; }',
    /* In impossible mode the two swapped tiles, 14 and 15, are painted vermilion and underlined, so the mark
       does not rely on colour alone. The tile you slide is never marked: you did nothing wrong. */
    P + '.tile.swapped { background: var(--vermilion); color: var(--ink); --fp-edge: color-mix(in srgb, var(--vermilion) 60%, black); text-decoration: underline; text-decoration-thickness: 3px; text-underline-offset: 5px; }',
    P + '.tile.swapped.can { box-shadow: inset 0 -5px 0 var(--fp-edge), 0 3px 6px rgba(0, 0, 0, .35); }',
    /* Solved: the tiles turn gold one after another (each tile's --fp-d is its delay). The gap stays a hole. */
    P + '.board.solved .tile:not(.gap) { background: var(--gold); color: var(--on-era); border-color: var(--gold); box-shadow: inset 0 -5px 0 var(--gold-shadow), 0 0 16px color-mix(in srgb, var(--gold) 45%, transparent); transition: background-color .25s ease var(--fp-d, 0s), color .25s ease var(--fp-d, 0s), box-shadow .25s ease var(--fp-d, 0s); }',
    /* ----- the score: three brass plaques ----- */
    P + '.fp-score { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem; margin: 0; font-weight: 400; }',
    P + '.fp-score > span { display: grid; justify-items: center; align-content: start; gap: .1rem; padding: .35rem .3rem .45rem; border-radius: 12px; background: var(--surface-2); border: 2px solid color-mix(in srgb, var(--brass) 55%, transparent); text-align: center; min-width: 0; }',
    P + '.fp-lbl { font-family: var(--font-mono); font-size: .74rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--gold); }',
    P + '.fp-num { font-family: var(--font-display); font-weight: 400; font-size: 1.75rem; line-height: 1.05; color: var(--ink); font-variant-numeric: tabular-nums; }',
    P + '.fp-best { display: grid; justify-items: center; }',
    P + '.fp-unit, ' + P + '.fp-none { font-size: .82rem; font-weight: 700; color: var(--ink-muted); line-height: 1.2; }',
    P + '.fp-none { padding-top: .45rem; }',
    P + '.fp-num.is-bump { color: var(--gold); animation: fp-bump .55s cubic-bezier(.3, 1.6, .5, 1); }',
    '@keyframes fp-bump { 0% { transform: scale(1.7); } 100% { transform: none; } }',
    /* The Size menu may wrap under its label on a narrow phone, and never runs past the frame. */
    P + '.field { max-width: 100%; flex-wrap: wrap; }',
    P + '.field select { max-width: 100%; min-width: 0; }',
    P + '.game-note { margin: 0; }',
    P + '.why summary { cursor: pointer; font-weight: 700; min-height: 44px; display: flex; align-items: center; color: var(--link); }',
    P + '.why .prose { display: grid; gap: .6rem; padding-top: .2rem; }',
    /* Wide screens: the tray on the left, the score and buttons beside it. */
    '@container (min-width: 700px) {',
    P + '.fp-wrap { grid-template-columns: auto minmax(0, 1fr); grid-template-rows: auto auto auto auto 1fr; grid-template-areas: "board tools" "board score" "board extra" "board note" "board why"; column-gap: clamp(1.5rem, 5cqi, 3.5rem); row-gap: 1.1rem; align-items: start; }',
    P + '.fp-tools { grid-area: tools; }',
    P + '.fp-score { grid-area: score; max-width: 26rem; }',
    P + '.board { grid-area: board; width: min(460px, 50cqi); }',
    P + '.fp-extra { grid-area: extra; }',
    P + '.game-note { grid-area: note; }',
    P + '.why { grid-area: why; }',
    '}',
    /* Classroom mode (for projecting): the tray grows to fill the screen. */
    '.classroom ' + P + '.board { width: min(100%, 64vh, 640px); }',
    '@container (min-width: 700px) { .classroom ' + P + '.board { width: min(58cqi, 66vh, 640px); } }',
    '@media (prefers-reduced-motion: reduce) { ' + P + '.tile, ' + P + '.fp-num { transition: none !important; animation: none !important; } ' + P + '.tile.can:hover { transform: none; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'fifteen-puzzle',
    frame: 'table',   /* a wooden games table */
    mount: function (root, api) {
      var h = api.h;
      var RM = !!api.reducedMotion;
      var size = api.store.get('size', 4) === 3 ? 3 : 4;
      var best = api.store.get('best', {});
      if (!best || typeof best !== 'object') best = {};
      var tiles = [], moves = 0, seconds = 0, ticking = null, started = false, solved = false, impossible = false, buttons = [];
      var shown = ''; /* the last status line we set, so we do not repeat ourselves to screen readers */
      var bumpBest = false; /* true for one redraw after a new best, so that number can jump */

      root.appendChild(h('style', null, CSS));

      /* ----- controls -----
         On a phone, top to bottom: New game, the score, the tray, then the size and the 14-15 puzzle, so the
         tray sits close to the status line. On a wide screen the tray is on the left and the rest beside it. */
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { api.sound('shuffle'); newGame(true); } }, 'New game', h('span', { class: 'visually-hidden' }, ' (shuffle the tiles)'));
      var sizeSelect = h('select', { onchange: function (e) { size = Number(e.target.value) === 3 ? 3 : 4; api.store.set('size', size); api.sound('shuffle'); newGame(true); } },
        h('option', { value: '3', selected: size === 3 }, 'Eight (3 by 3)'),
        h('option', { value: '4', selected: size === 4 }, 'Fifteen (4 by 4)'));
      var sizeField = h('label', { class: 'field' }, 'Size ', sizeSelect);
      var impossibleBtn = h('button', { class: 'btn', type: 'button', onclick: function () { api.sound('shuffle'); setImpossible(); } }, 'Try the impossible 14-15 puzzle');

      /* The score: moves, time and the best for this size. Each label is followed by a hidden ": " so the
         plaques read "Moves: 12" to a screen reader. */
      var movesEl = h('b', { class: 'fp-num' }), timeEl = h('b', { class: 'fp-num' }), bestEl = h('span', { class: 'fp-best' });
      function plaque(name, valueEl) { return h('span', null, h('span', { class: 'fp-lbl' }, name), h('span', { class: 'visually-hidden' }, ': '), valueEl); }
      var scoreEl = h('div', { class: 'scoreboard fp-score', role: 'group', 'aria-label': 'Progress' }, plaque('Moves', movesEl), plaque('Time', timeEl), plaque('Best', bestEl));

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
      /* The How to play tab says "tap a tile next to the gap". That is the basic move, so the note starts with it
         and then adds the shortcut, so the two never disagree. */
      var note = h('p', { class: 'game-note' }, 'Tap or click a tile next to the gap to slide it. Shortcut: tap a tile further along the same row or column and every tile between it and the gap moves one space. Arrow keys work too.');
      var why = h('details', { class: 'why', hidden: true },
        h('summary', null, 'Why can nobody solve the 14-15 puzzle?'),
        h('div', { class: 'prose' },
          h('p', null, 'Every slide swaps the gap with one tile. Count how many pairs of tiles are out of order, and which row the gap is in. Each slide changes that combination in a fixed way, so some arrangements can never turn into the finished puzzle, no matter how many moves you make.'),
          h('p', null, 'Swapping 14 and 15 is one of those. During the 1880 craze people offered prizes of up to a thousand dollars to anyone who could fix it, and years later the American puzzle writer Sam Loyd repeated the offer, knowing nobody could win. The maths is certain: the puzzle is impossible. Half of all possible arrangements are like that, which is why this game shuffles by sliding tiles rather than scattering them at random.')));
      root.appendChild(h('div', { class: 'fp-wrap' },
        h('div', { class: 'game-toolbar fp-tools' }, newBtn),
        scoreEl, board,
        h('div', { class: 'game-toolbar fp-extra' }, sizeField, impossibleBtn),
        note, why));

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
        var g = tiles.indexOf(0), from = g;
        var step = Math.floor(i / size) === Math.floor(g / size) ? (i > g ? 1 : -1) : (i > g ? size : -size);
        while (g !== i) { tiles[g] = tiles[g + step]; g += step; }
        tiles[i] = 0;
        if (!silent) {
          moves++;
          if (!started) { started = true; startClock(); }
          api.sound('clack');
          if (isSolved()) finish(); else say(goalStatus());
          render();
          slideIn(from, i, step);
          if (solved) goldWave();
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

      /* ----- movement -----
         The tiles' buttons stay put and their numbers change, so each moved tile is drawn starting one square
         back and glides into place. None of this runs with reduced motion. */
      function canAnimate() { return !RM && buttons.length && typeof buttons[0].animate === 'function'; }
      function slideIn(from, to, step) {
        if (!canAnimate()) return;
        var a = buttons[0].getBoundingClientRect(), b = buttons[1].getBoundingClientRect(), c = buttons[size].getBoundingClientRect();
        var dx = step === 1 ? b.left - a.left : step === -1 ? a.left - b.left : 0;
        var dy = step === size ? c.top - a.top : step === -size ? a.top - c.top : 0;
        for (var k = from; k !== to; k += step) {
          buttons[k].animate([{ transform: 'translate(' + dx + 'px, ' + dy + 'px)' }, { transform: 'none' }], { duration: 120, easing: 'cubic-bezier(.25, .9, .35, 1)' });
        }
      }
      /* A shuffle: the tiles drop into the tray one after another. */
      function shuffleIn() {
        if (!canAnimate()) return;
        buttons.forEach(function (b, k) {
          if (tiles[k]) b.animate([{ transform: 'translateY(-14px) rotate(' + (k % 2 ? 5 : -5) + 'deg)', opacity: 0.25 }, { transform: 'none', opacity: 1 }], { duration: 280, delay: k * 16, easing: 'cubic-bezier(.3, 1.4, .5, 1)', fill: 'backwards' });
        });
      }
      /* Solved: a wave runs across the tiles as they turn gold. */
      function goldWave() {
        if (!canAnimate()) return;
        buttons.forEach(function (b, k) {
          if (tiles[k]) b.animate([{ transform: 'none' }, { transform: 'translateY(-9px) scale(1.07)' }, { transform: 'none' }], { duration: 420, delay: 150 + k * 45, easing: 'ease-out' });
        });
      }
      /* A tap on a tile that cannot move: a buzz and a little shake. */
      function refuse(k) {
        api.sound('wrong');
        if (!canAnimate()) return;
        buttons[k].animate([{ transform: 'none' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 260 });
      }

      /* ----- the clock ----- */
      function startClock() {
        stopClock();
        ticking = setInterval(function () {
          if (!root.isConnected) { stopClock(); return; }   /* belt and braces: destroy() normally stops it first */
          seconds++; renderScore();
        }, 1000);
      }
      function stopClock() {
        if (ticking) { clearInterval(ticking); ticking = null; }
      }
      function finish() {
        solved = true; stopClock();
        var key = String(size);
        var record = bestFor(size);
        var newBest = !record || moves < record.moves;
        if (newBest) { best[key] = { moves: moves, seconds: seconds }; api.store.set('best', best); }
        say('Solved in ' + moves + ' moves and ' + clock(seconds) + '!' + (newBest ? ' A new best.' : ''));
        /* Every solve is a win: fanfare, confetti, and a star on the ticket. */
        api.celebrate('Solved in ' + moves + ' moves!' + (newBest ? ' A new best!' : ''));
        bumpBest = newBest;
      }
      /* The saved best for a size, or null. A saved value is checked rather than trusted, so an odd one from an
         older version (or a half-written one) simply counts as no best yet. */
      function bestFor(n) {
        var r = best[String(n)];
        return r && typeof r === 'object' && typeof r.moves === 'number' && isFinite(r.moves) && r.moves > 0 ? r : null;
      }
      function clock(s) { var m = Math.floor(s / 60); return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
      function renderScore() {
        movesEl.textContent = String(moves);
        timeEl.textContent = clock(seconds);
        var record = bestFor(size);
        if (record) bestEl.replaceChildren(h('b', { class: 'fp-num' + (bumpBest && !RM ? ' is-bump' : '') }, String(record.moves)), h('span', { class: 'fp-unit' }, ' moves'));
        else bestEl.replaceChildren(h('span', { class: 'fp-none' }, 'none yet'));
        bumpBest = false;
      }
      function render() {
        board.style.gridTemplateColumns = 'repeat(' + size + ', minmax(0, 1fr))';
        board.classList.toggle('is-3', size === 3);
        board.classList.toggle('solved', solved);
        if (buttons.length !== tiles.length) {
          buttons = []; board.replaceChildren();
          tiles.forEach(function (_, i) {
            var b = h('button', { class: 'tile', type: 'button', onclick: function () {
              if (!slide(i) && !solved && tiles[i]) { say('That tile cannot move. Pick one in the same row or column as the gap.'); refuse(i); }
            } });
            b.style.setProperty('--fp-d', (i * 0.045).toFixed(3) + 's');
            buttons.push(b); board.appendChild(b);
          });
        }
        tiles.forEach(function (v, i) {
          var b = buttons[i], r = Math.floor(i / size) + 1, c = i % size + 1;
          /* In impossible mode only the swapped pair, 14 and 15, are marked, wherever they have been slid to. */
          var swapped = impossible && (v === 14 || v === 15);
          var can = v && canSlide(i) && !solved;
          b.textContent = v ? String(v) : '';
          b.className = 'tile' + (v ? '' : ' gap') + (can ? ' can' : '') + (swapped ? ' swapped' : '');
          b.disabled = !v || solved;
          b.setAttribute('aria-label', (v ? 'Tile ' + v : 'Empty space') + ', row ' + r + ', column ' + c + (swapped ? ', one of the swapped pair' : '') + (can ? ', can slide' : ''));
        });
        renderScore();
      }
      function reset() {
        stopClock(); moves = 0; seconds = 0; started = false; solved = false; impossible = false; why.hidden = true;
        tiles = []; for (var i = 1; i < size * size; i++) tiles.push(i); tiles.push(0);
        buttons = [];
      }
      /* `animate` is true when a person pressed something, so the tiles drop in (not on page load). */
      function newGame(animate) {
        reset();
        /* Shuffle by sliding: 60 random moves per tile, never undoing the previous move, so the result is always solvable. */
        var last = -1, n = size * size * 60;
        while (n > 0) {
          var g = tiles.indexOf(0), options = [];
          [g - 1, g + 1, g - size, g + size].forEach(function (i) { if (i >= 0 && i < tiles.length && i !== last && canSlide(i)) options.push(i); });
          var pick = options[Math.floor(api.random() * options.length)];
          last = tiles.indexOf(0); slide(pick, true); n--;
        }
        if (isSolved()) { newGame(animate); return; }
        render(); say(goalStatus());
        if (animate) shuffleIn();
      }
      function setImpossible() {
        reset();
        /* The 14-15 puzzle is always 4 by 4, so remember that size the same way the Size menu does. */
        size = 4; api.store.set('size', 4); sizeSelect.value = '4';
        tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 14, 0];
        impossible = true; why.hidden = false;
        render();
        say(goalStatus());
        shuffleIn();
      }

      newGame(false);
      return { destroy: function () { stopClock(); } };
    }
  });
})();
