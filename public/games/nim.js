/* Nim, named and solved by Charles L. Bouton of Harvard in 1901.
   Take as many matches as you like from one row. Take the last match and you win (Bouton's rules).
   Misere option: take the last match and you lose. "Show the secret" explains the binary trick the computer uses.
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  function nimSum(heaps) { return heaps.reduce(function (a, b) { return a ^ b; }, 0); }

  /* The computer's brain. Write every row's count in binary and add the columns without carrying (exclusive or).
     That total is the Nim-sum. If it is zero on your turn, you are losing against perfect play.
     The winning move is always to leave the Nim-sum at zero. Bouton proved this in 1901. */
  function perfectMove(heaps, misere, random) {
    var bigRows = heaps.filter(function (n) { return n > 1; }).length;
    if (misere && bigRows <= 1) {
      /* Endgame of the misere version: leave an ODD number of single matches so the other player takes the last one. */
      var ones = heaps.filter(function (n) { return n === 1; }).length;
      var i = heaps.findIndex(function (n) { return n > 1; });
      if (i >= 0) return { row: i, take: ones % 2 === 0 ? heaps[i] - 1 : heaps[i] };
      var j = heaps.findIndex(function (n) { return n === 1; });
      return { row: j, take: 1 };
    }
    var s = nimSum(heaps);
    if (s !== 0) {
      for (var r = 0; r < heaps.length; r++) {
        var target = heaps[r] ^ s;
        if (target < heaps[r]) return { row: r, take: heaps[r] - target };
      }
    }
    /* Already losing: take one match from the biggest row and hope the other player slips. */
    var biggest = 0;
    heaps.forEach(function (n, k) { if (n > heaps[biggest]) biggest = k; });
    return { row: biggest, take: 1 };
  }
  function randomMove(heaps, random) {
    var rows = []; heaps.forEach(function (n, k) { if (n > 0) rows.push(k); });
    var row = rows[Math.floor(random() * rows.length)];
    return { row: row, take: 1 + Math.floor(random() * heaps[row]) };
  }

  GamesInTime.register({
    id: 'nim',
    mount: function (root, api) {
      var h = api.h;
      var settings = {
        mode: api.store.get('mode', 'computer'),
        level: api.store.get('level', 'perfect'),
        misere: api.store.get('misere', false),
        layout: api.store.get('layout', '3-5-7'),
        secret: api.store.get('secret', false)
      };
      var heaps = [], turn = 0, over = false, selected = { row: -1, count: 0 }, timer = null;
      /* One entry per row: the row element and its match buttons. The buttons are made once per game and
         only updated after that, so a keyboard user's focus is never thrown away. */
      var rows = [];

      root.appendChild(h('style', null,
        '.game-nim .rows { display: grid; gap: 10px; margin: .5rem 0 1rem; }' +
        /* Each row is a grid: the label, then up to seven 44 px columns. The columns shrink to 32 px if the panel is narrow. */
        '.game-nim .row { display: grid; grid-template-columns: 4.2rem repeat(7, minmax(32px, 44px)); gap: 4px; align-items: center; }' +
        '.game-nim .row-label { font-weight: 700; color: var(--ink-muted); }' +
        '.game-nim .match { width: 44px; height: 72px; padding: 0; border: 2px solid transparent; border-radius: 8px; background: transparent; position: relative; }' +
        '.game-nim .match::before { content: ""; position: absolute; left: 50%; top: 18px; bottom: 6px; width: 8px; margin-left: -4px; background: var(--brass); border-radius: 3px; }' +
        '.game-nim .match::after { content: ""; position: absolute; left: 50%; top: 6px; width: 16px; height: 18px; margin-left: -8px; background: var(--red); border-radius: 50% 50% 45% 45%; }' +
        '.game-nim .match:hover:not(:disabled) { background: var(--surface-2); }' +
        '.game-nim .match[aria-pressed="true"] { border-color: var(--link); background: var(--surface-2); transform: translateY(-6px); }' +
        '.game-nim .match:disabled { cursor: default; opacity: .9; }' +
        /* On phones the label sits above its matches and the seven columns share the width, so a row never wraps. */
        '@media (max-width: 480px) {' +
        '  .game-nim .row { grid-template-columns: repeat(7, minmax(0, 1fr)); }' +
        '  .game-nim .row-label { grid-column: 1 / -1; }' +
        '  .game-nim .match { width: auto; min-width: 0; }' +
        '}' +
        '.game-nim .seg button { min-height: 44px; }' +
        '.game-nim .field input[type="checkbox"] { width: 22px; height: 22px; margin: 0; accent-color: var(--link); }' +
        '.game-nim .take { margin-top: .25rem; }' +
        '.game-nim .secret { margin-top: 1rem; padding: .9rem 1rem; background: var(--surface-2); border-radius: 8px; font-variant-numeric: tabular-nums; }' +
        '.game-nim .secret table { width: auto; font-family: ui-monospace, Menlo, Consolas, monospace; }' +
        '.game-nim .secret td, .game-nim .secret th { padding: .15rem .6rem; border: 0; }' +
        '.game-nim .secret tr.total td { border-top: 2px solid var(--line); font-weight: 700; }' +
        '@media (prefers-reduced-motion: reduce) { .game-nim .match[aria-pressed="true"] { transform: none; } }'));

      function seg(options, value, onChange) {
        var el = h('div', { class: 'seg', role: 'group' });
        var buttons = options.map(function (o) {
          return h('button', { type: 'button', 'aria-pressed': String(o[0] === value), onclick: function () {
            buttons.forEach(function (b, k) { b.setAttribute('aria-pressed', String(options[k][0] === o[0])); });
            onChange(o[0]);
          } }, o[1]);
        });
        buttons.forEach(function (b) { el.appendChild(b); });
        return el;
      }
      var modeSeg = seg([['computer', 'Play the computer'], ['two', 'Two players']], settings.mode, function (v) { settings.mode = v; api.store.set('mode', v); newGame(); });
      var levelSeg = seg([['perfect', 'Perfect'], ['easy', 'Easy']], settings.level, function (v) { settings.level = v; api.store.set('level', v); newGame(); });
      var layoutField = h('label', { class: 'field' }, 'Rows ',
        h('select', { onchange: function (e) { settings.layout = e.target.value; api.store.set('layout', settings.layout); newGame(); } },
          h('option', { value: '3-5-7', selected: settings.layout === '3-5-7' }, '3, 5, 7'),
          h('option', { value: '1-3-5-7', selected: settings.layout === '1-3-5-7' }, '1, 3, 5, 7'),
          h('option', { value: 'random', selected: settings.layout === 'random' }, 'Random')));
      var misereBox = h('input', { type: 'checkbox', checked: settings.misere, onchange: function (e) { settings.misere = e.target.checked; api.store.set('misere', settings.misere); newGame(); } });
      var secretBox = h('input', { type: 'checkbox', checked: settings.secret, onchange: function (e) { settings.secret = e.target.checked; api.store.set('secret', settings.secret); renderSecret(); } });
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: newGame }, 'New game');
      root.appendChild(h('div', { class: 'game-toolbar' }, modeSeg, levelSeg, layoutField, newBtn));
      root.appendChild(h('div', { class: 'game-toolbar' },
        h('label', { class: 'field' }, misereBox, ' Last match loses (misère)'),
        h('label', { class: 'field' }, secretBox, ' Show the secret')));

      /* tabindex -1 lets us park keyboard focus on the rows while the computer thinks, so it is not lost. */
      var rowsEl = h('div', { class: 'rows', role: 'group', 'aria-label': 'Rows of matches', tabindex: '-1' });
      root.appendChild(rowsEl);
      var takeBtn = h('button', { class: 'btn btn-primary take', type: 'button', onclick: takeSelected, disabled: true }, 'Take');
      root.appendChild(h('div', { class: 'game-toolbar' }, takeBtn, h('span', { class: 'game-note', style: { marginTop: 0 } }, 'Tap matches in one row to choose them, then press Take.')));
      var secretEl = h('div', { class: 'secret', hidden: true, 'aria-live': 'off' });
      root.appendChild(secretEl);

      function playerName(t) {
        if (settings.mode === 'two') return t === 0 ? 'Player 1' : 'Player 2';
        return t === 0 ? 'You' : 'Computer';
      }
      /* "Your turn." reads better than "You, your turn." when it is said aloud. */
      function turnText(t) { return playerName(t) === 'You' ? 'Your turn.' : playerName(t) + ' to play.'; }
      function isComputerTurn() { return settings.mode === 'computer' && turn === 1 && !over; }

      /* ---- focus helpers ---- */
      /* True when keyboard focus is inside the game, or has been dropped on the page body (which happens when
         a focused button is disabled or removed). In both cases the game should put focus somewhere useful. */
      function focusInGame() {
        var a = document.activeElement;
        return !a || a === document.body || root.contains(a);
      }
      function firstMatch() { return rowsEl.querySelector('button.match:not(:disabled)'); }
      function focusAfterMove(wanted) {
        if (!wanted || !focusInGame()) return;
        if (over) newBtn.focus();                 /* the only thing left to do is start again */
        else if (isComputerTurn()) rowsEl.focus(); /* park here until the computer has moved */
        else { var b = firstMatch(); if (b) b.focus(); }
      }
      /* Arrow keys move between matches: left and right along a row, up and down between rows. */
      function onMatchKey(ev, r, idx) {
        var dr = 0, di = 0;
        if (ev.key === 'ArrowLeft') di = -1; else if (ev.key === 'ArrowRight') di = 1;
        else if (ev.key === 'ArrowUp') dr = -1; else if (ev.key === 'ArrowDown') dr = 1;
        else return;
        ev.preventDefault();
        var target = null;
        if (di) target = rows[r].buttons[idx + di];
        else {
          var nr = r + dr;
          while (nr >= 0 && nr < rows.length && !rows[nr].buttons.length) nr += dr; /* skip empty rows */
          if (nr >= 0 && nr < rows.length) target = rows[nr].buttons[Math.min(idx, rows[nr].buttons.length - 1)];
        }
        if (target) target.focus();
      }

      /* ---- the rows ---- */
      /* Builds the row elements and all their match buttons. Called once per game. */
      function buildRows() {
        rowsEl.replaceChildren(); rows = [];
        heaps.forEach(function (n, r) {
          var row = { el: h('div', { class: 'row' }, h('span', { class: 'row-label' }, 'Row ' + (r + 1))), buttons: [] };
          for (var m = 0; m < n; m++) {
            (function (idx) {
              var btn = h('button', { class: 'match', type: 'button', 'aria-pressed': 'false',
                /* Picking a match selects it and everything to its right, so the count is obvious. */
                onclick: function () { pick(r, heaps[r] - idx); },
                onkeydown: function (ev) { onMatchKey(ev, r, idx); } });
              row.buttons.push(btn);
              row.el.appendChild(btn);
            })(m);
          }
          rowsEl.appendChild(row.el); rows.push(row);
        });
        updateRows();
      }
      /* Updates the buttons that already exist: pressed state, enabled state and labels. Matches that have been
         taken are removed from the right-hand end. Nothing else is rebuilt, so focus stays where it was. */
      function updateRows() {
        heaps.forEach(function (n, r) {
          var row = rows[r];
          while (row.buttons.length > n) row.el.removeChild(row.buttons.pop());
          row.buttons.forEach(function (btn, idx) {
            btn.setAttribute('aria-pressed', String(selected.row === r && idx >= n - selected.count));
            btn.disabled = over || isComputerTurn();
            btn.setAttribute('aria-label', 'Row ' + (r + 1) + ', match ' + (idx + 1) + ' of ' + n);
          });
          if (!n && !row.el.querySelector('.muted')) row.el.appendChild(h('span', { class: 'muted' }, 'empty'));
        });
        takeBtn.disabled = selected.count === 0 || over || isComputerTurn();
        takeBtn.textContent = selected.count ? 'Take ' + selected.count + (selected.count === 1 ? ' match' : ' matches') + ' from row ' + (selected.row + 1) : 'Take';
        renderSecret();
      }
      function pick(r, count) {
        if (over || isComputerTurn()) return;
        if (selected.row === r && selected.count === count) selected = { row: -1, count: 0 };
        else selected = { row: r, count: count };
        updateRows();
        if (selected.count) api.announce(selected.count + ' selected from row ' + (r + 1));
      }
      function takeSelected() {
        if (!selected.count) return;
        /* Remember whether the keyboard was being used in the game, so focus can follow the play. */
        apply(selected.row, selected.count, focusInGame());
      }
      /* Makes a move for whoever's turn it is. keepFocus says whether to move keyboard focus along afterwards. */
      function apply(row, take, keepFocus) {
        heaps[row] -= take;
        var who = playerName(turn);
        selected = { row: -1, count: 0 };
        if (heaps.every(function (n) { return n === 0; })) {
          over = true;
          var winner = settings.misere ? playerName(1 - turn) : who;
          updateRows();
          api.status(who + ' took the last match. ' + winner + (winner === 'You' ? ' win!' : ' wins!') + (settings.misere ? ' (Last match loses.)' : ''));
          focusAfterMove(keepFocus);
          return;
        }
        turn = 1 - turn;
        updateRows();
        focusAfterMove(keepFocus);
        if (isComputerTurn()) computerTurn(who + ' took ' + take + ' from row ' + (row + 1) + '. ', keepFocus);
        else api.status(who + ' took ' + take + ' from row ' + (row + 1) + '. ' + turnText(turn));
      }
      function computerTurn(prefix, keepFocus) {
        api.status((prefix || '') + 'Computer is thinking...');
        timer = setTimeout(function () {
          timer = null;
          var mv = settings.level === 'perfect' ? perfectMove(heaps, settings.misere, api.random) : randomMove(heaps, api.random);
          apply(mv.row, mv.take, keepFocus);
        }, api.reducedMotion ? 0 : 600);
      }
      function renderSecret() {
        secretEl.hidden = !settings.secret;
        if (!settings.secret) return;
        var width = Math.max.apply(null, heaps.concat([1])).toString(2).length;
        var table = h('table', null, h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, 'Row'), h('th', { scope: 'col' }, 'Matches'), h('th', { scope: 'col' }, 'In binary'))));
        var body = h('tbody', null);
        heaps.forEach(function (n, r) {
          body.appendChild(h('tr', null, h('td', null, String(r + 1)), h('td', null, String(n)), h('td', null, pad(n.toString(2), width))));
        });
        var s = nimSum(heaps);
        body.appendChild(h('tr', { class: 'total' }, h('td', null, 'Nim-sum'), h('td', null, String(s)), h('td', null, pad(s.toString(2), width))));
        table.appendChild(body);
        secretEl.replaceChildren(
          h('p', null, h('strong', null, 'The secret: '), 'write each row in binary and add the columns without carrying. An even number of 1s in a column gives 0, an odd number gives 1. The total is called the Nim-sum.'),
          table,
          h('p', null, s === 0 ? 'The Nim-sum is 0. Whoever has to move now is losing against perfect play.' : 'The Nim-sum is not 0. The player to move can win by making it 0.'));
      }
      function pad(str, w) { while (str.length < w) str = '0' + str; return str; }
      function newGame() {
        if (timer) { clearTimeout(timer); timer = null; }
        over = false; turn = 0; selected = { row: -1, count: 0 };
        /* The difficulty choice only matters when the computer is playing. */
        levelSeg.hidden = settings.mode === 'two';
        if (settings.layout === '1-3-5-7') heaps = [1, 3, 5, 7];
        else if (settings.layout === 'random') { heaps = []; var count = 3 + Math.floor(api.random() * 2); for (var i = 0; i < count; i++) heaps.push(1 + Math.floor(api.random() * 7)); }
        else heaps = [3, 5, 7];
        buildRows();
        api.status(turnText(0) + ' Take any number of matches from one row.' + (settings.misere ? ' Last match loses.' : ' Last match wins.'));
      }

      newGame();
      return { destroy: function () { if (timer) clearTimeout(timer); } };
    }
  });
})();
