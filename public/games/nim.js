/* Nim, named and solved by Charles L. Bouton of Harvard in 1901.
   Take as many matches as you like from one row. Take the last match and you win (Bouton's rules).
   Misère option: take the last match and you lose. "Show the secret" explains the binary trick the computer uses.
   The matches lie on a wooden games table; taken matches lift away and leave a faint outline behind.
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
      /* Endgame of the misère version: leave an ODD number of single matches so the other player takes the last one. */
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

  var P = '.game-nim ';
  /* The narrow layout: the label sits above its matches, and the seven columns share the whole width with
     no gap between them, so each match is as wide as it can be and a row never wraps. */
  var NARROW_ROWS =
    P + '.rows { gap: 4px; margin: .25rem 0 .75rem; }' +
    P + '.row { grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px 0; }' +
    P + '.row-label { grid-column: 1 / -1; font-size: .9rem; line-height: 1.1; }' +
    P + '.row-label .muted { display: inline; font-size: 1em; }' +
    P + '.row { min-height: 0; }' +
    P + '.match, ' + P + '.ghost { width: 100%; max-width: none; min-width: 0; border-radius: 6px; }';
  /* The wide layout, for projecting: bigger matches that a kid at the back can count. */
  var WIDE_ROWS =
    P + '.row { grid-template-columns: 5.5rem repeat(7, 60px); gap: 8px; min-height: 100px; }' +
    P + '.row-label { font-size: 1.15rem; }' +
    P + '.match, ' + P + '.ghost { max-width: 60px; height: 100px; border-radius: 10px; }' +
    P + '.match::before, ' + P + '.ghost::before, ' + P + '.lift::before { top: 25px; bottom: 8px; width: 12px; margin-left: -6px; border-radius: 4px; }' +
    P + '.match::after, ' + P + '.ghost::after, ' + P + '.lift::after { top: 8px; width: 24px; height: 26px; margin-left: -12px; }';
  var CSS = [
    /* The game and its rows are both "containers", so each part can size itself from its own width. */
    '.game-nim { container: nim / inline-size; }',
    P + '.nim-wrap { display: grid; grid-template-columns: minmax(0, 1fr); }',
    P + '.nim-tools { margin-bottom: .5rem; }',
    P + '.rows { display: grid; gap: 10px; margin: .5rem 0 1rem; container: nimrows / inline-size; }',
    P + '.rows.is-thinking { cursor: progress; }',
    /* Each row is a grid: the label, then up to seven 44 px columns. */
    P + '.row { display: grid; grid-template-columns: 5rem repeat(7, minmax(32px, 44px)); gap: 4px; align-items: center; min-height: 72px; }',
    P + '.row-label { font-weight: 700; color: var(--ink-muted); line-height: 1.15; }',
    /* "(empty)" goes on its own line under "Row 1", so the label never squeezes into an awkward wrap. */
    P + '.row-label .muted { display: block; font-size: .82em; font-weight: 600; }',
    P + '.match, ' + P + '.ghost { box-sizing: border-box; width: 100%; max-width: 44px; height: 72px; padding: 0; border: 2px solid transparent; border-radius: 8px; background: transparent; position: relative; transition: transform .15s ease, background-color .15s ease; -webkit-tap-highlight-color: transparent; }',
    /* Each match is drawn with two shapes: ::before is the wooden stick, ::after is the red head.
       A lifting match (.lift) is drawn the same way. */
    P + '.match::before, ' + P + '.ghost::before, ' + P + '.lift::before { content: ""; position: absolute; left: 50%; top: 18px; bottom: 6px; width: 8px; margin-left: -4px; border-radius: 3px; background: linear-gradient(90deg, color-mix(in srgb, var(--brass) 72%, white), var(--brass) 45%, color-mix(in srgb, var(--brass) 72%, black)); }',
    P + '.match::after, ' + P + '.ghost::after, ' + P + '.lift::after { content: ""; position: absolute; left: 50%; top: 6px; width: 16px; height: 18px; margin-left: -8px; border-radius: 50% 50% 45% 45%; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--red) 55%, white), var(--red) 55%, color-mix(in srgb, var(--red) 70%, black)); }',
    /* A ghost is a faded outline where a match was taken on the last move, so you can see what just happened
       right on the board, even when the status line has scrolled off a phone screen. */
    P + '.ghost { border: 2px dashed var(--line); }',
    P + '.ghost::before, ' + P + '.ghost::after { opacity: .22; }',
    P + '.ghost.is-fresh { animation: game-nim-gone .6s ease-out both; }',
    '@keyframes game-nim-gone { from { border-color: transparent; } to { border-color: var(--line); } }',
    /* A taken match lifts off the table and fades away. */
    P + '.lift { position: absolute; inset: 0; pointer-events: none; animation: game-nim-lift .7s cubic-bezier(.3, .1, .6, 1) both; }',
    '@keyframes game-nim-lift { 0% { transform: none; opacity: 1; } 35% { transform: translateY(-20px) rotate(-6deg); opacity: 1; } 100% { transform: translateY(-62px) rotate(-16deg); opacity: 0; } }',
    /* Hovering over a match lights it up AND every match to its right, because that is what a tap will choose.
       (hover: hover) means only on a mouse, so a tap on a phone does not leave matches lit up. */
    '@media (hover: hover) { ' + P + '.match:hover:not(:disabled), ' + P + '.match:hover:not(:disabled) ~ .match { background: var(--surface-2); border-color: color-mix(in srgb, var(--gold) 40%, transparent); } }',
    /* Chosen matches are lifted, filled with gold and outlined in solid gold. The keyboard focus is a dashed
       ring instead, so a focused match never looks chosen. */
    P + '.match[aria-pressed="true"] { border-color: var(--gold); background: color-mix(in srgb, var(--gold) 28%, transparent); transform: translateY(-8px); box-shadow: 0 8px 12px rgba(0, 0, 0, .3); }',
    P + '.match:focus-visible { outline: 3px dashed var(--focus); outline-offset: 2px; }',
    P + '.match:disabled { cursor: default; opacity: .9; }',
    /* A label plus seven 44 px matches needs 5rem + 7 x 48 px, about 416 px. When the rows are narrower than
       that, switch to the narrow layout. The @media rule is a back-up for older browsers. */
    '@container nimrows (max-width: 420px) {' + NARROW_ROWS + '}',
    '@media (max-width: 480px) {' + NARROW_ROWS + '}',
    '@container nimrows (min-width: 580px) {' + WIDE_ROWS + '}',
    /* The end of a game: a big poster-type banner where the matches were, readable from the back of a room. */
    P + '.nim-result { justify-self: start; width: fit-content; max-width: 100%; transform-origin: 0 100%; margin: 0 0 .9rem; font-family: var(--font-poster); font-weight: 400; font-size: clamp(2.2rem, 1.5rem + 3.2vw, 3.6rem); line-height: 1; color: var(--gold); text-shadow: 3px 3px 0 var(--gold-shadow); }',
    P + '.nim-result.is-loss { color: var(--ink-muted); text-shadow: none; }',
    P + '.nim-result small { display: block; margin-top: .35rem; font-family: var(--font-head); font-size: 1rem; font-weight: 700; color: var(--ink-muted); text-shadow: none; }',
    P + '.nim-result.is-new { animation: game-nim-stamp .55s cubic-bezier(.3, 1.6, .5, 1) both; }',
    '@keyframes game-nim-stamp { 0% { transform: translateY(-18px) rotate(-3deg); opacity: 0; } 60% { opacity: 1; } 100% { transform: none; opacity: 1; } }',
    P + '.seg button { min-height: 44px; }',
    P + '.field input[type="checkbox"] { width: 22px; height: 22px; margin: 0; accent-color: var(--gold); }',
    P + '.nim-take { margin-bottom: 0; }',
    P + '.take { margin-top: .25rem; }',
    /* The settings live below the board, so on a phone the status line, the matches and Take fit on one screen. */
    P + '.settings { margin-top: 1.25rem; padding-top: 1rem; border-top: 2px solid var(--line); }',
    P + '.settings .game-toolbar { margin-bottom: .6rem; }',
    P + '.settings-label { margin: 0 0 .6rem; font-family: var(--font-mono); font-size: .82rem; letter-spacing: .14em; text-transform: uppercase; font-weight: 700; color: var(--gold); }',
    P + '.settings .game-note { margin: 0 0 .6rem; }',
    P + '.secret { margin-top: 1rem; padding: .9rem 1rem; background: var(--surface-2); border-radius: 10px; border: 1px solid var(--line); font-variant-numeric: tabular-nums; }',
    P + '.secret p + p { margin-top: .6rem; }',
    P + '.secret { container-type: inline-size; }',
    P + '.secret table { width: auto; margin: .6rem 0; font-family: var(--font-mono); }',
    P + '.secret td, ' + P + '.secret th { padding: .15rem .5rem; border: 0; white-space: nowrap; }',
    /* On the narrowest phones the table shrinks a little rather than wrapping "Nim-sum" in two. */
    '@container (max-width: 260px) { ' + P + '.secret table { font-size: .84em; } ' + P + '.secret td, ' + P + '.secret th { padding: .15rem .3rem; } }',
    P + '.secret tr.total td { border-top: 2px solid var(--line); font-weight: 700; color: var(--gold); }',
    /* Wide screens: the matches on the left, the settings and the secret beside them. */
    '@container nim (min-width: 860px) {',
    P + '.nim-wrap { grid-template-columns: minmax(0, 1fr) minmax(0, 23rem); grid-template-rows: auto auto auto auto 1fr; grid-template-areas: "tools side" "rows side" "result side" "take side" ". side"; column-gap: 2rem; align-items: start; }',
    P + '.nim-tools { grid-area: tools; } ' + P + '.rows { grid-area: rows; } ' + P + '.nim-result { grid-area: result; } ' + P + '.nim-take { grid-area: take; }',
    P + '.nim-side { grid-area: side; border-left: 2px solid var(--line); padding-left: 1.5rem; }',
    P + '.settings { margin-top: 0; padding-top: 0; border-top: 0; }',
    '}',
    '@media (prefers-reduced-motion: reduce) { ' + P + '.match[aria-pressed="true"] { transform: none; } ' + P + '.ghost, ' + P + '.ghost.is-fresh, ' + P + '.nim-result.is-new { animation: none; } ' + P + '.lift { display: none; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'nim',
    frame: 'table',   /* matches laid out on a wooden games table */
    mount: function (root, api) {
      var h = api.h;
      var RM = !!api.reducedMotion;
      /* Saved settings are checked against the allowed choices, so an odd saved value falls back to the normal one. */
      function pickSetting(key, allowed) { var v = api.store.get(key, allowed[0]); return allowed.indexOf(v) >= 0 ? v : allowed[0]; }
      var settings = {
        mode: pickSetting('mode', ['computer', 'two']),
        level: pickSetting('level', ['perfect', 'easy']),
        misere: api.store.get('misere', false) === true,
        layout: pickSetting('layout', ['3-5-7', '1-3-5-7', 'random']),
        secret: api.store.get('secret', false) === true
      };
      var heaps = [], turn = 0, over = false, selected = { row: -1, count: 0 }, timer = null;
      /* One entry per row: the row element and its match buttons. The buttons are made once per game and
         only updated after that, so a keyboard user's focus is never thrown away. */
      var rows = [];
      /* The one match that the Tab key stops on (a "roving" tab stop). The arrow keys move between the
         other matches, so a single Tab press takes you from the board to the Take button. */
      var rover = { row: 0, idx: 0 };
      /* The last move ({ row, take }), shown on the board as ghost matches. null at the start of a game. */
      var lastMove = null;
      /* True for the one redraw right after a move, so the taken matches lift away once (not on every redraw). */
      var freshMove = false;

      root.appendChild(h('style', null, CSS));

      /* A pill of buttons where only one is pressed. The label is read out by screen readers ("Difficulty"). */
      function seg(label, options, value, onChange) {
        var el = h('div', { class: 'seg', role: 'group', 'aria-label': label });
        var buttons = options.map(function (o) {
          return h('button', { type: 'button', 'aria-pressed': String(o[0] === value), onclick: function () {
            buttons.forEach(function (b, k) { b.setAttribute('aria-pressed', String(options[k][0] === o[0])); });
            api.sound('click');
            onChange(o[0]);
          } }, o[1]);
        });
        buttons.forEach(function (b) { el.appendChild(b); });
        return el;
      }
      var modeSeg = seg('Opponent', [['computer', 'Play the computer'], ['two', 'Two players']], settings.mode, function (v) { settings.mode = v; api.store.set('mode', v); newGame(); });
      var levelSeg = seg('Difficulty', [['perfect', 'Perfect'], ['easy', 'Easy']], settings.level, function (v) { settings.level = v; api.store.set('level', v); newGame(); });
      var layoutField = h('label', { class: 'field' }, 'Rows ',
        h('select', { onchange: function (e) { settings.layout = e.target.value; api.store.set('layout', settings.layout); api.sound('click'); newGame(); } },
          h('option', { value: '3-5-7', selected: settings.layout === '3-5-7' }, '3, 5, 7'),
          h('option', { value: '1-3-5-7', selected: settings.layout === '1-3-5-7' }, '1, 3, 5, 7'),
          h('option', { value: 'random', selected: settings.layout === 'random' }, 'Random')));
      var misereBox = h('input', { type: 'checkbox', checked: settings.misere, 'aria-describedby': 'nim-misere-note', onchange: function (e) { settings.misere = e.target.checked; api.store.set('misere', settings.misere); api.sound('click'); newGame(); } });
      var secretBox = h('input', { type: 'checkbox', checked: settings.secret, onchange: function (e) { settings.secret = e.target.checked; api.store.set('secret', settings.secret); api.sound('click'); renderSecret(); } });
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { api.sound('shuffle'); newGame(); } }, 'New game');

      /* Top to bottom on a phone: New game, the board, Take, then the settings and the secret.
         On a wide screen the settings and the secret stand beside the board. */
      /* tabindex -1 lets us park keyboard focus on the rows while the computer thinks, so it is not lost. */
      var rowsEl = h('div', { class: 'rows', role: 'group', 'aria-label': 'Rows of matches', tabindex: '-1' });
      var takeBtn = h('button', { class: 'btn btn-primary take', type: 'button', onclick: takeSelected, disabled: true }, 'Take');
      var secretEl = h('div', { class: 'secret', hidden: true, 'aria-live': 'off' });
      /* The status line already says who won; the banner repeats it in big letters, so screen readers skip it. */
      var resultEl = h('p', { class: 'nim-result', hidden: true, 'aria-hidden': 'true' });
      root.appendChild(h('div', { class: 'nim-wrap' },
        h('div', { class: 'game-toolbar nim-tools' }, newBtn),
        rowsEl,
        resultEl,
        h('div', { class: 'game-toolbar nim-take' }, takeBtn,
          h('span', { class: 'game-note', style: { marginTop: 0 } }, 'Tap a match to choose it and every match to its right, then press Take.')),
        h('div', { class: 'nim-side' },
          h('div', { class: 'settings', role: 'group', 'aria-label': 'Game settings' },
            h('p', { class: 'settings-label' }, 'Settings'),
            h('div', { class: 'game-toolbar' }, modeSeg, levelSeg, layoutField),
            h('div', { class: 'game-toolbar' },
              h('label', { class: 'field' }, misereBox, ' Last match loses (misère)'),
              h('label', { class: 'field' }, secretBox, ' Show the secret')),
            h('p', { class: 'game-note', id: 'nim-misere-note' }, 'Misère is the opposite way to play: whoever takes the last match loses.')),
          secretEl)));

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
        rover = { row: 0, idx: 0 };
        heaps.forEach(function (n, r) {
          var row = { el: h('div', { class: 'row' }, h('span', { class: 'row-label' }, 'Row ' + (r + 1))), buttons: [], ghosts: [] };
          for (var m = 0; m < n; m++) {
            (function (idx) {
              var btn = h('button', { class: 'match', type: 'button', 'aria-pressed': 'false',
                /* Picking a match selects it and everything to its right, so the count is obvious. */
                onclick: function () { pick(r, heaps[r] - idx); },
                onkeydown: function (ev) { onMatchKey(ev, r, idx); },
                /* Whichever match has focus becomes the Tab stop, so Shift+Tab from Take comes straight back here. */
                onfocus: function () { rover = { row: r, idx: idx }; setTabStop(); } });
              row.buttons.push(btn);
              row.el.appendChild(btn);
            })(m);
          }
          rowsEl.appendChild(row.el); rows.push(row);
        });
        updateRows();
      }
      /* Gives tabindex 0 to one match (the rover) and -1 to all the others. If the rover's match has been
         taken, the last match left in that row is used, or else the first match on the board. */
      function setTabStop() {
        var stop = null, row = rows[rover.row];
        if (row && row.buttons.length) stop = row.buttons[Math.min(rover.idx, row.buttons.length - 1)];
        if (!stop) stop = rowsEl.querySelector('button.match');
        rows.forEach(function (rw) {
          rw.buttons.forEach(function (btn) { btn.tabIndex = btn === stop ? 0 : -1; });
        });
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
            /* Say how many matches a press will choose, for example "Row 3, match 1 of 7. Chooses 7 matches". */
            var count = n - idx;
            btn.setAttribute('aria-label', 'Row ' + (r + 1) + ', match ' + (idx + 1) + ' of ' + n + '. Chooses ' + count + (count === 1 ? ' match' : ' matches'));
          });
          /* An empty row says so next to its label. */
          if (!n && !row.el.querySelector('.muted')) row.el.firstChild.appendChild(h('span', { class: 'muted' }, ' (empty)'));
        });
        /* Draw one ghost for each match taken on the last move, after the matches left in that row. Each row keeps
           its ghost elements and only shows or hides them, so nothing on the board is thrown away between moves.
           Straight after a move each ghost also holds a match that lifts off the table and fades. */
        var lifting = freshMove && !RM;
        rows.forEach(function (row, r) {
          var want = lastMove && lastMove.row === r ? lastMove.take : 0;
          while (row.ghosts.length < want) { var g = h('span', { 'aria-hidden': 'true' }); row.ghosts.push(g); row.el.appendChild(g); }
          row.ghosts.forEach(function (g, k) {
            var on = k < want;
            g.hidden = !on;
            g.replaceChildren();
            g.className = on ? 'ghost' : 'ghost-slot';
            if (on && lifting) {
              void g.offsetWidth;   /* restart the outline's fade-in, even if this ghost was showing already */
              g.className = 'ghost is-fresh';
              var lift = h('span', { class: 'lift', onanimationend: function (ev) { ev.currentTarget.remove(); } });
              lift.style.animationDelay = (k * 55) + 'ms';
              g.appendChild(lift);
            }
          });
        });
        freshMove = false;
        setTabStop();
        takeBtn.disabled = selected.count === 0 || over || isComputerTurn();
        takeBtn.textContent = selected.count ? 'Take ' + selected.count + (selected.count === 1 ? ' match' : ' matches') + ' from row ' + (selected.row + 1) : 'Take';
        renderSecret();
      }
      function pick(r, count) {
        if (over || isComputerTurn()) return;
        if (selected.row === r && selected.count === count) selected = { row: -1, count: 0 };
        else selected = { row: r, count: count };
        api.sound('tick');
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
        lastMove = { row: row, take: take };
        freshMove = true;
        api.sound('thud');
        var who = playerName(turn);
        selected = { row: -1, count: 0 };
        if (heaps.every(function (n) { return n === 0; })) {
          over = true;
          var winnerTurn = settings.misere ? 1 - turn : turn;
          var winner = playerName(winnerTurn);
          var computerWon = settings.mode === 'computer' && winnerTurn === 1;
          updateRows();
          /* A loss gets a kind word and a pointer to the secret. */
          api.status(who + ' took the last match. ' + winner + (winner === 'You' ? ' win!' : ' wins!') + (settings.misere ? ' (Last match loses.)' : '') +
            (computerWon ? (settings.secret ? ' Good try! Use the secret table to plan your next game.' : ' Good try! Tick "Show the secret" to learn its trick.') : ''));
          focusAfterMove(keepFocus);
          resultEl.replaceChildren(computerWon ? 'Computer wins' : winner + (winner === 'You' ? ' win!' : ' wins!'),
            h('small', null, computerWon ? 'Good try! Press New game for another go.' : who + ' took the last match.' + (settings.misere ? ' Last match loses.' : '')));
          resultEl.className = 'nim-result' + (computerWon ? ' is-loss' : '') + (RM ? '' : ' is-new');
          resultEl.hidden = false;
          /* Every win by a person gets the fanfare, confetti and a star on the ticket, in two-player games too. */
          if (computerWon) api.sound('lose');
          else api.celebrate(settings.mode === 'two' ? winner + ' wins at Nim!' : 'You beat the computer at Nim!');
          return;
        }
        turn = 1 - turn;
        updateRows();
        focusAfterMove(keepFocus);
        if (isComputerTurn()) computerTurn(who + ' took ' + take + ' from row ' + (row + 1) + '. ', keepFocus);
        else api.status(who + ' took ' + take + ' from row ' + (row + 1) + '. ' + turnText(turn));
      }
      /* The computer waits a moment before moving so you can see what you just did. */
      function computerTurn(prefix, keepFocus) {
        api.status((prefix || '') + 'Computer is thinking...');
        rowsEl.classList.add('is-thinking');
        timer = setTimeout(function () {
          timer = null;
          rowsEl.classList.remove('is-thinking');
          var mv = settings.level === 'perfect' ? perfectMove(heaps, settings.misere, api.random) : randomMove(heaps, api.random);
          apply(mv.row, mv.take, keepFocus);
        }, RM ? 0 : 350);
      }
      function renderSecret() {
        secretEl.hidden = !settings.secret;
        if (!settings.secret) return;
        var width = Math.max.apply(null, heaps.concat([1])).toString(2).length;
        var table = h('table', null, h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, 'Row'), h('th', { scope: 'col' }, 'Matches'), h('th', { scope: 'col' }, 'Binary'))));
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
          h('p', null, secretAdvice(s)));
        if (settings.misere) secretEl.appendChild(h('p', null, 'In the misère game the computer plays the same way until only one row has more than one match. Then it changes plan and leaves an odd number of single matches, so you have to take the last one.'));
      }
      /* What the Nim-sum means for the player whose turn it is. In the misère game the rule changes once
         every row is down to one match or less (or only one big row is left). */
      function secretAdvice(s) {
        if (over) return 'The game is over. Press New game to play again.';
        var big = heaps.filter(function (n) { return n > 1; }).length;
        var ones = heaps.filter(function (n) { return n === 1; }).length;
        if (settings.misere && big === 1) return 'Only one row has more than one match. The player to move can win: leave an odd number of single matches.';
        if (settings.misere && big === 0) return ones % 2 ?
          'Only single matches are left, and an odd number of them. The player to move will be left with the last match, so they are losing.' :
          'Only single matches are left, and an even number of them. The player to move can win.';
        return s === 0 ? 'The Nim-sum is 0. Whoever has to move now is losing against perfect play.' : 'The Nim-sum is not 0. The player to move can win by making it 0.';
      }
      function pad(str, w) { while (str.length < w) str = '0' + str; return str; }
      function newGame() {
        if (timer) { clearTimeout(timer); timer = null; }
        rowsEl.classList.remove('is-thinking');
        over = false; turn = 0; selected = { row: -1, count: 0 }; lastMove = null; freshMove = false;
        resultEl.hidden = true;
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
