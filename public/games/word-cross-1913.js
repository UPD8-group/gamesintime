/* Word-Cross: the first crossword, by Arthur Wynne, New York World, 21 December 1913.
   The puzzle data (grid, printed labels, clues) lives in content.js under wordCross. Clues are labelled the 1913 way,
   with the numbers at both ends of the word, like "2-3", "F-7".
   The puzzle sits on the site's puzzle page (frame: 'paper'): cream paper, dark ink, navy for the printed letters.
   Every letter ticks into place, a finished word gives a little glint and a coin, and a real solve (no Reveal) gets
   the site's celebration, once.
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  GamesInTime.register({
    id: 'word-cross-1913',
    frame: 'paper',
    mount: function (root, api) {
      var h = api.h;
      var RM = !!api.reducedMotion;
      var data = api.site.wordCross;
      if (!data || !data.grid || !data.clues) {
        root.appendChild(h('p', { class: 'notice' }, 'The puzzle data is not loaded yet.'));
        api.status('Puzzle not available');
        return { destroy: function () {} };
      }
      var rows = data.grid.length, cols = data.grid[0].length;
      var cells = {}, inputs = {}, keys = [], clueButtons = [], active = -1, checked = false;
      /* Did the player use "Reveal" since the last New game? Then a full grid is not a real win, so no fanfare.
         Remembered with the letters so a reload does not forget it. */
      var revealed = !!api.store.get('revealed', false);
      /* Was the grid solved last time we counted? null until the first count, so a grid that loads already solved
         does not set off the fanfare again. */
      var wasSolved = null;
      /* Has this puzzle been celebrated since the last New game? Remembered, so changing a letter and putting it back
         (or leaving and coming back) can never set off the fanfare a second time. Only New game clears it. */
      var celebrated = !!api.store.get('celebrated', false);
      /* Which words were right at the last count, so a word that has just been finished can give its glint. */
      var wasRight = {};
      /* Every pending timeout, so New game and destroy() can cancel them. */
      var timers = [];
      function later(fn, ms) {
        var id = setTimeout(function () { var k = timers.indexOf(id); if (k >= 0) timers.splice(k, 1); fn(); }, ms);
        timers.push(id);
        return id;
      }
      function clearTimers() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers = []; }
      /* The last cell the player tapped or clicked themselves. A second tap on that same cell swaps to the crossing word.
         It is wiped whenever the game moves the cursor itself (auto-advance, arrow keys, picking a clue). */
      var lastTapped = null;
      /* When the cursor hops over printed letters (the U in RULE), we remember them here. If the very next key is that
         printed letter, the player was spelling the whole word, so the key is used up instead of landing in the wrong cell. */
      var hopped = { key: null, letters: '' };
      /* Only one grid cell is a Tab stop (tabStop). Tab from the toolbar lands in the grid once, not 100 times. */
      var tabStop = null;
      /* What the player has typed so far, remembered between visits. Anything odd in storage is cleaned up on load:
         one letter per cell, capital, nothing else. */
      var saved = {};
      var stored = api.store.get('fill', {});
      if (stored && typeof stored === 'object') {
        Object.keys(stored).forEach(function (k) { saved[k] = String(stored[k] || '').replace(/[^a-z]/gi, '').toUpperCase().slice(0, 1); });
      }
      var labelAt = {};
      (data.labels || []).forEach(function (l) { labelAt[l.row + ',' + l.col] = l.label; });
      var prefilled = {};
      data.clues.forEach(function (c) { if (c.prefilled) c.cells.forEach(function (rc, i) { prefilled[rc[0] + ',' + rc[1]] = c.answer[i]; }); });

      /* Cell sizes: never smaller than MIN so a finger can hit them, never bigger than MAX so the diamond stays tidy.
         When the diamond is wider than the space (a phone), the grid slides sideways inside .grid-wrap instead of shrinking.
         On wider screens the cells are also kept short enough for the whole diamond (and the clue under it) to fit in the
         window: PAGE_RESERVE is the window height kept for the site header and the clue line; in classroom mode
         CLASSROOM_RESERVE keeps room for the status line, the frame and the buttons under it as well. */
      var MIN = 44, MAX = 56, GAP = 1, PAGE_RESERVE = 200, CLASSROOM_RESERVE = 330;

      root.appendChild(h('style', null,
        '.game-word-cross-1913 .layout { display: grid; grid-template-columns: 1fr; gap: 1rem; align-items: start; }' +
        '.game-word-cross-1913 .grid-wrap { overflow-x: auto; max-width: 100%; padding-bottom: 4px; }' +
        '.game-word-cross-1913 .grid { --gap: ' + GAP + 'px; --cell: 44px; display: grid; grid-template-columns: repeat(' + cols + ', var(--cell)); grid-auto-rows: var(--cell); gap: var(--gap); margin-inline: auto; width: max-content; }' +
        '.game-word-cross-1913 .blank { }' +
        '.game-word-cross-1913 .cell { position: relative; }' +
        '.game-word-cross-1913 .cell input { width: var(--cell); height: var(--cell); padding: 0; text-align: center; text-transform: uppercase; font-family: var(--font-display); font-size: max(16px, calc(var(--cell) * .5)); border: 2px solid var(--ink); background: var(--surface); color: var(--ink); border-radius: 3px; caret-color: transparent; }' +
        /* The letter is selected whenever a cell gets focus (so typing replaces it); the focus ring is the cue, not a blue highlight. */
        '.game-word-cross-1913 .cell input::selection { background: transparent; color: inherit; }' +
        '.game-word-cross-1913 .cell input:focus { outline: 3px solid var(--brass); outline-offset: -2px; }' +
        '.game-word-cross-1913 .cell.active input { background: var(--surface-2); }' +
        '.game-word-cross-1913 .cell input[readonly] { background: var(--brand); color: var(--on-brand); border-color: var(--brand); }' +
        /* After "Check answers": a wrong letter turns red with a red bar underneath. A right letter keeps the normal ink
           colour (green text is too faint on the highlighted word) and gets a green border and bar instead. */
        '.game-word-cross-1913 .cell.wrong input { color: var(--red); border-color: var(--red); box-shadow: inset 0 -5px 0 var(--red); }' +
        '.game-word-cross-1913 .cell.right input:not([readonly]) { color: var(--ink); border-color: var(--green); box-shadow: inset 0 -5px 0 var(--green); }' +
        '.game-word-cross-1913 .cell .lab { position: absolute; left: 2px; top: 0; font-size: max(10px, calc(var(--cell) * .28)); line-height: 1.2; font-weight: 700; color: var(--ink-muted); pointer-events: none; }' +
        '.game-word-cross-1913 .cell input[readonly] + .lab { color: var(--on-brand); }' +
        '.game-word-cross-1913 .now { font-weight: 700; min-height: 1.6em; }' +
        '.game-word-cross-1913 .now .num { font-variant-numeric: tabular-nums; margin-right: .3rem; }' +
        '.game-word-cross-1913 .now .dir { font-weight: 400; color: var(--ink-muted); margin-right: .3rem; }' +
        '.game-word-cross-1913 .slide-hint { font-size: .9rem; color: var(--ink-muted); margin: 0; }' +
        '.game-word-cross-1913 .clues { list-style: none; margin: 0; padding: 0; columns: 2; column-gap: 1rem; font-size: .95rem; }' +
        '@media (max-width: 480px) { .game-word-cross-1913 .clues { columns: 1; } }' +
        '.game-word-cross-1913 .clues li { break-inside: avoid; margin: 0; }' +
        '.game-word-cross-1913 .clues button { display: block; width: 100%; text-align: left; background: transparent; border: 0; border-radius: 6px; padding: .35rem .5rem; min-height: 36px; color: var(--ink); line-height: 1.3; }' +
        '.game-word-cross-1913 .clues button:hover { background: var(--surface-2); }' +
        '.game-word-cross-1913 .clues button[aria-current="true"] { background: var(--surface-2); box-shadow: inset 3px 0 0 var(--brass); }' +
        '.game-word-cross-1913 .clues button.done { color: var(--ink-muted); text-decoration: line-through; }' +
        '.game-word-cross-1913 .clues .num { font-weight: 700; margin-right: .3rem; font-variant-numeric: tabular-nums; }' +
        '.game-word-cross-1913 .masthead { font-family: var(--font-display); font-size: 1.25rem; margin-bottom: .5rem; }' +
        /* "Reveal all" is a quieter button than the others, but still a button: it keeps an outline on the paper. */
        '.game-word-cross-1913 .game-toolbar .btn-ghost { border-color: var(--line); }' +
        /* On phones the four buttons sit in two rows of two instead of four rows. */
        '@media (max-width: 480px) { .game-word-cross-1913 .game-toolbar { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; align-items: stretch; } .game-word-cross-1913 .game-toolbar .btn { padding-inline: .5rem; font-size: .95rem; line-height: 1.15; } }' +
        /* Fun: a typed letter is stamped in; a finished word glints green, one cell after another; a wrong letter
           shakes after Check answers; a solved puzzle sends a wave across the whole diamond. None of these play with
           reduced motion (the game does not add the classes then). */
        '.game-word-cross-1913 .cell.is-typed input { animation: game-word-cross-1913-stamp .22s ease-out; }' +
        '@keyframes game-word-cross-1913-stamp { 0% { scale: 1.3; } 100% { scale: 1; } }' +
        '.game-word-cross-1913 .cell.is-glint input { animation: game-word-cross-1913-glint .6s ease-in-out both; }' +
        '@keyframes game-word-cross-1913-glint { 0%, 100% { scale: 1; } 40% { scale: 1.12; background-color: color-mix(in srgb, var(--green) 28%, var(--surface)); border-color: var(--green); } }' +
        '.game-word-cross-1913 .cell.wrong.is-shake input { animation: game-word-cross-1913-shake .36s ease-in-out; }' +
        '@keyframes game-word-cross-1913-shake { 0%, 100% { translate: 0 0; } 20% { translate: -4px 0; } 40% { translate: 3px 0; } 60% { translate: -2px 0; } 80% { translate: 1px 0; } }' +
        /* Classroom mode on a big projector screen: the clues sit beside the diamond, so the whole puzzle and every
           clue fit on one screen. The notes give their room to the puzzle. */
        '.classroom .game-word-cross-1913 > .game-note { display: none; }' +
        '@media (min-width: 1500px) { .classroom .game-word-cross-1913 .layout { grid-template-columns: auto minmax(0, 1fr); grid-template-areas: "grid now" "grid clues" "hint clues"; grid-template-rows: auto 1fr auto; column-gap: 2.5rem; } .classroom .game-word-cross-1913 .grid-wrap { grid-area: grid; } .classroom .game-word-cross-1913 .slide-hint { grid-area: hint; } .classroom .game-word-cross-1913 .now { grid-area: now; font-size: 1.35rem; } .classroom .game-word-cross-1913 .clue-box { grid-area: clues; } .classroom .game-word-cross-1913 .clues { font-size: 1.05rem; } }'));

      var checkBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: check }, 'Check answers');
      var revealBtn = h('button', { class: 'btn', type: 'button', onclick: revealActive }, 'Reveal this word');
      var revealAllBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: revealAll }, 'Reveal all');
      /* "New game" is what every game on the site calls its reset. The spoken name adds what it does here (clears the grid). */
      var newBtn = h('button', { class: 'btn', type: 'button', 'aria-label': 'New game: clear the grid', onclick: newGame }, 'New game');
      root.appendChild(h('div', { class: 'game-toolbar' }, checkBtn, revealBtn, revealAllBtn, newBtn));
      root.appendChild(h('p', { class: 'masthead' }, 'Word-Cross · New York World, 21 December 1913'));

      var grid = h('div', { class: 'grid', role: 'group', 'aria-label': 'Crossword grid' });
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var ch = data.grid[r].charAt(c);
        if (ch === '#' || ch === ' ') { grid.appendChild(h('div', { class: 'blank', 'aria-hidden': 'true' })); continue; }
        (function (r, c) {
          var key = r + ',' + c, pre = prefilled[key];
          /* No maxlength: typing over a letter is allowed, and onInput keeps only the newest letter. */
          /* tabindex -1: not a Tab stop. setTabStop() turns one cell into the grid's single Tab stop. */
          var input = h('input', { type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', tabindex: '-1',
            'aria-label': 'Row ' + (r + 1) + ', column ' + (c + 1), value: pre || (saved[key] || ''), readonly: !!pre });
          /* Was this cell already focused before the mouse or finger went down? The focus event fires before click,
             so the click handler cannot tell on its own. */
          var wasFocused = false;
          function remember() { wasFocused = (document.activeElement === input); }
          input.addEventListener('pointerdown', remember);
          input.addEventListener('mousedown', remember);
          input.addEventListener('focus', function () {
            setTabStop(key);
            if (hopped.key !== key) hopped = { key: null, letters: '' };
            setActiveFor(r, c, false); selectAll(input);
          });
          input.addEventListener('click', function () {
            /* Swap words only on a second tap: the cell had focus already AND the player's last tap was on this cell.
               A cell the game moved the cursor to does not count, so the first tap there never flips the word. */
            var swap = wasFocused && lastTapped === key;
            lastTapped = key; hopped = { key: null, letters: '' };
            setActiveFor(r, c, swap); selectAll(input);
            /* A tap on a printed letter (F, U or N) moves straight on to the next cell you can type in, remembering
               the printed letter as hopped. Phones and tablets often give no keyboard (iPad) or no usable keys
               (Android) on a read-only cell, so waiting there would be a dead end. */
            if (pre) {
              var s = step(r, c, 1);
              if (s) goTo(s.key, pre + s.jumped);
            }
          });
          input.addEventListener('input', function (ev) { onInput(ev, r, c); });
          input.addEventListener('keydown', function (ev) { onKey(ev, r, c); });
          var cell = h('div', { class: 'cell' }, input, labelAt[key] ? h('span', { class: 'lab', 'aria-hidden': 'true' }, labelAt[key]) : null);
          cells[key] = cell; inputs[key] = input; keys.push(key);
          grid.appendChild(cell);
        })(r, c);
      }
      var clueList = h('ol', { class: 'clues', 'aria-label': 'Clues' });
      data.clues.forEach(function (cl, i) {
        var b = h('button', { type: 'button', onclick: function () { setActive(i); focusFirstEmpty(i); } }, h('span', { class: 'num' }, cl.label + ' '), cl.clue);
        clueButtons.push(b);
        /* The pre-printed FUN has no real clue, so it stays out of the printed list. */
        if (!cl.prefilled) clueList.appendChild(h('li', null, b));
      });
      var wrap = h('div', { class: 'grid-wrap' }, grid);
      /* The clue you are working on, shown right under the grid so a phone never has to scroll down to the list. */
      var now = h('p', { class: 'now' });
      var slideHint = h('p', { class: 'slide-hint', hidden: true }, 'Slide the grid sideways to see the whole diamond.');
      root.appendChild(h('div', { class: 'layout' }, wrap, slideHint, now, h('div', { class: 'clue-box' }, h('h3', { style: { marginBottom: '.4rem' } }, 'Clues'), clueList)));

      /* Size the cells to the space available, between MIN and MAX. If even MIN cells are too wide for the space,
         the wrapper scrolls sideways and starts centred so the middle of the diamond is in view. */
      function fit() {
        var w = wrap.clientWidth || 300;
        var size = Math.min(MAX, Math.floor((w - (cols - 1) * GAP) / cols));
        if ((window.innerWidth || 0) > 600 && window.innerHeight) {
          var classroom = document.documentElement.classList.contains('classroom');
          var above = classroom ? wrap.getBoundingClientRect().top - root.getBoundingClientRect().top : 0;
          size = Math.min(size, Math.floor((window.innerHeight - (classroom ? CLASSROOM_RESERVE : PAGE_RESERVE) - above - (rows - 1) * GAP) / rows));
        }
        var cell = Math.max(MIN, size);
        grid.style.setProperty('--cell', cell + 'px');
        var over = wrap.scrollWidth - wrap.clientWidth;
        slideHint.hidden = over <= 1;
        if (over > 1 && !wrap.dataset.centred) { wrap.scrollLeft = Math.round(over / 2); wrap.dataset.centred = '1'; }
      }
      var observer = null;
      if (window.ResizeObserver) { observer = new ResizeObserver(fit); observer.observe(wrap); }
      /* The window's height matters too (and the observer does not see it change), so listen for resizes. */
      window.addEventListener('resize', fit);
      fit();
      setTabStop(keys[0]);
      root.appendChild(h('p', { class: 'game-note' }, 'Each clue gives two labels: the word runs from the first cell to the second. Type a letter and the cursor moves along the word, hopping over the printed F, U and N. Tap a cell again, or press Enter, to swap to the word that crosses it. Arrow keys move around the grid. Tab steps along the word, then on to the clues. The clues are printed exactly as Wynne wrote them in 1913, American spelling and all.'));

      /* Which real clues (not the pre-printed FUN) run through this cell? */
      function cluesThrough(r, c) {
        var out = [];
        data.clues.forEach(function (cl, i) {
          if (cl.prefilled) return;
          if (cl.cells.some(function (rc) { return rc[0] === r && rc[1] === c; })) out.push(i);
        });
        return out;
      }
      function direction(i) {
        var cl = data.clues[i];
        return cl.cells.length > 1 && cl.cells[0][0] === cl.cells[1][0] ? 'across' : 'down';
      }
      /* Select the letter in a cell so the next key replaces it. Wrapped because some browsers refuse on readonly inputs. */
      function selectAll(inp) { try { inp.select(); } catch (e) {} }
      /* What a screen reader says for a cell: where it is, its printed number, which words it belongs to, and the active clue. */
      function labelFor(r, c) {
        var key = r + ',' + c, lab = labelAt[key];
        var text = 'Row ' + (r + 1) + ', column ' + (c + 1);
        if (lab) text += ', ' + (/^\d+$/.test(lab) ? 'number ' : 'marked ') + lab;
        var through = cluesThrough(r, c);
        var parts = through.map(function (i) {
          var cl = data.clues[i], first = cl.cells[0], last = cl.cells[cl.cells.length - 1];
          var where = (first[0] === r && first[1] === c) ? 'start of ' : (last[0] === r && last[1] === c) ? 'end of ' : 'in ';
          return where + cl.label + ' ' + direction(i);
        });
        if (parts.length) text += ', ' + parts.join(' and ');
        if (active >= 0 && through.indexOf(active) >= 0) text += '. Clue ' + data.clues[active].label + ' ' + direction(active) + ': ' + data.clues[active].clue;
        return text;
      }
      function updateLabels() {
        Object.keys(inputs).forEach(function (k) { var rc = k.split(','); inputs[k].setAttribute('aria-label', labelFor(Number(rc[0]), Number(rc[1]))); });
      }
      function setActive(i) {
        active = i;
        Object.keys(cells).forEach(function (k) { cells[k].classList.remove('active'); });
        clueButtons.forEach(function (b, k) { b.setAttribute('aria-current', String(k === i)); });
        while (now.firstChild) now.removeChild(now.firstChild);
        if (i >= 0) {
          data.clues[i].cells.forEach(function (rc) { var cell = cells[rc[0] + ',' + rc[1]]; if (cell) cell.classList.add('active'); });
          now.appendChild(h('span', { class: 'num' }, data.clues[i].label + ' '));
          now.appendChild(h('span', { class: 'dir' }, direction(i) + ': '));
          now.appendChild(document.createTextNode(data.clues[i].clue));
        }
        /* No scrollIntoView here: picking a cell must never throw the page down to the clue list. */
        updateLabels();
      }
      /* Make a clue through this cell active. With swap on, and the cell already active, move to the crossing word. */
      function setActiveFor(r, c, swap) {
        var list = cluesThrough(r, c);
        if (!list.length) return;
        if (swap && list.length > 1 && list.indexOf(active) >= 0) setActive(list[(list.indexOf(active) + 1) % list.length]);
        else if (list.indexOf(active) < 0) setActive(list[0]);
      }
      /* Make this cell the grid's only Tab stop. Called whenever a cell gets focus, so Tab comes back to where you were. */
      function setTabStop(key) {
        if (tabStop && inputs[tabStop]) inputs[tabStop].tabIndex = -1;
        tabStop = key;
        if (inputs[key]) inputs[key].tabIndex = 0;
      }
      /* The game moves the cursor (not a tap). `letters` is any printed letters it hopped over to get here. */
      function goTo(key, letters) {
        var inp = inputs[key];
        if (!inp) return;
        lastTapped = null;
        inp.focus();
        hopped = { key: key, letters: letters || '' };
      }
      /* Where is cell (r, c) in clue i? -1 if it is not in that word. */
      function indexIn(i, r, c) {
        var list = data.clues[i].cells;
        for (var k = 0; k < list.length; k++) if (list[k][0] === r && list[k][1] === c) return k;
        return -1;
      }
      /* Walk one cell along the active word from (r, c): dir 1 is forward, -1 is back. Printed cells (F, U, N) cannot
         be typed in, so the walk hops over them. Gives back the cell it reaches and the printed letters it hopped,
         or null at the end of the word. */
      function step(r, c, dir) {
        if (active < 0) return null;
        var list = data.clues[active].cells, k = indexIn(active, r, c);
        if (k < 0) return null;
        var jumped = '';
        for (var j = k + dir; j >= 0 && j < list.length; j += dir) {
          var key = list[j][0] + ',' + list[j][1];
          if (!prefilled[key]) return { key: key, jumped: jumped };
          jumped += prefilled[key];
        }
        return null;
      }
      function moveAlong(r, c, dir) {
        var s = step(r, c, dir);
        if (s) goTo(s.key, dir > 0 ? s.jumped : '');
      }
      /* Picking a clue puts the cursor in its first empty cell you can type in (or its first typeable cell when the word
         is full). If the word starts with a printed letter (F-7 starts on F), that letter is remembered as hopped. */
      function focusFirstEmpty(i) {
        var list = data.clues[i].cells, target = -1, firstOpen = -1;
        for (var k = 0; k < list.length; k++) {
          var key = list[k][0] + ',' + list[k][1];
          if (prefilled[key]) continue;
          if (firstOpen < 0) firstOpen = k;
          if (!inputs[key].value) { target = k; break; }
        }
        if (target < 0) target = firstOpen;
        if (target < 0) return;
        var jumped = '';
        for (var b = target - 1; b >= 0 && prefilled[list[b][0] + ',' + list[b][1]]; b--) jumped = prefilled[list[b][0] + ',' + list[b][1]] + jumped;
        goTo(list[target][0] + ',' + list[target][1], jumped);
      }
      function setLetter(r, c, v) {
        inputs[r + ',' + c].value = v;
        saved[r + ',' + c] = v; api.store.set('fill', saved);
        clearMarks();
      }
      /* Put a letter in a cell, give a little tick (and a stamp), and move on along the word. */
      function enterLetter(r, c, v) {
        setLetter(r, c, v);
        api.sound('tick');
        if (!RM) replay(cells[r + ',' + c], 'is-typed', 260);
        moveAlong(r, c, 1);
        progress(true);
      }
      /* Replays a short CSS animation: the class comes off, the browser lays the page out (reading offsetWidth forces
         that), and the class goes back on. It comes off again after `ms`, so it can never replay by itself later. */
      function replay(el, cls, ms) {
        el.classList.remove(cls);
        void el.offsetWidth;
        el.classList.add(cls);
        later(function () { el.classList.remove(cls); }, ms);
      }
      function onInput(ev, r, c) {
        var key = r + ',' + c, inp = inputs[key];
        if (inp.readOnly) { inp.value = prefilled[key]; return; }
        var old = saved[key] || '';
        var raw = inp.value || '';
        var letters = raw.replace(/[^a-z]/gi, '').toUpperCase();
        var v = letters.slice(-1);
        /* If the old letter was not selected the cell now holds two characters: keep the one just typed (it sits
           right before the caret), unless it was not a letter, in which case the old letter stays. */
        if (raw.length > 1) {
          var pos = typeof inp.selectionStart === 'number' ? inp.selectionStart : raw.length;
          var typed = raw.charAt(Math.max(0, pos - 1)).toUpperCase();
          v = /[A-Z]/.test(typed) ? typed : letters.charAt(0);
        }
        var deleting = ev && typeof ev.inputType === 'string' && ev.inputType.indexOf('delete') === 0;
        /* A number, a symbol or a space (phone keyboards send these here, not as keys): keep the old letter, and buzz,
           because a crossword only takes letters. */
        if (!v && !deleting) { inp.value = old; selectAll(inp); api.sound('wrong'); return; }
        /* The player is spelling the whole word, including the printed letter we just hopped (R-U-L-E): use up the U. */
        if (v && hopped.key === key && v === hopped.letters.charAt(0)) {
          hopped.letters = hopped.letters.slice(1);
          inp.value = old; selectAll(inp);
          return;
        }
        hopped = { key: null, letters: '' };
        if (v) enterLetter(r, c, v);
        else { setLetter(r, c, ''); selectAll(inp); progress(); }
      }
      function onKey(ev, r, c) {
        var key = r + ',' + c, inp = inputs[key];
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;  /* leave browser shortcuts alone */
        var moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
        if (moves[ev.key]) {
          ev.preventDefault();
          var d = moves[ev.key], nr = r + d[0], nc = c + d[1];
          while (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (inputs[nr + ',' + nc]) { goTo(nr + ',' + nc, ''); return; }
            nr += d[0]; nc += d[1];
          }
        } else if (ev.key === 'Enter') {
          /* Keyboard way to swap between the words that cross here. */
          ev.preventDefault();
          setActiveFor(r, c, true);
        } else if (ev.key === 'Tab') {
          /* Tab and Shift+Tab step along the word. At either end the browser takes over and Tab leaves the grid. */
          var s = step(r, c, ev.shiftKey ? -1 : 1);
          if (s) { ev.preventDefault(); goTo(s.key, ''); }
        } else if (ev.key === 'Backspace') {
          /* A letter here: rub it out and stay. An empty or printed cell: step back along the word. */
          ev.preventDefault();
          hopped = { key: null, letters: '' };
          if (!inp.readOnly && inp.value) { setLetter(r, c, ''); progress(); }
          else moveAlong(r, c, -1);
        } else if (ev.key === 'Delete') {
          ev.preventDefault();
          if (!inp.readOnly && inp.value) { setLetter(r, c, ''); progress(); }
        } else if (ev.key.length === 1 && /[a-z]/i.test(ev.key)) {
          /* A printed cell (F, U, N) never takes a letter, and the browser sends no input event for it, so we handle the
             key here. Typing the printed letter just moves on. Any other letter goes into the next cell of the word,
             because the player has skipped the printed one (R-L-E for RULE). */
          if (!inp.readOnly) return;
          ev.preventDefault();
          var L = ev.key.toUpperCase();
          if (L === prefilled[key]) { moveAlong(r, c, 1); return; }
          var next = step(r, c, 1);
          if (next) { var rc = next.key.split(','); enterLetter(Number(rc[0]), Number(rc[1]), L); }
        } else if (ev.key.length === 1) {
          /* A number, a symbol or Space: crosswords only hold letters, so the key just buzzes (and the letter stays). */
          ev.preventDefault();
          api.sound('wrong');
        }
      }
      function wordState(i) {
        var cl = data.clues[i], full = true, right = true;
        cl.cells.forEach(function (rc, k) {
          var v = (inputs[rc[0] + ',' + rc[1]] || {}).value || '';
          if (!v) full = false;
          if (v !== cl.answer.charAt(k)) right = false;
        });
        return { full: full, right: right };
      }
      /* Counts the right words, strikes them off the clue list and updates the status line. `typed` is true when the
         player has just typed a letter: then a word that has just come right glints and gives a coin, and the last word
         of a real solve sets off the celebration instead. */
      function progress(typed) {
        var done = 0, total = 0, fresh = [];
        data.clues.forEach(function (cl, i) {
          if (cl.prefilled) return;
          total++;
          var s = wordState(i); clueButtons[i].classList.toggle('done', s.right); if (s.right) done++;
          if (s.right && !wasRight[i]) fresh.push(i);
          wasRight[i] = s.right;
        });
        var solved = done === total;
        if (solved && revealed) api.status('Solved with help from Reveal. ' + done + ' of ' + total + ' words.');
        else if (solved) api.status('You solved the first crossword ever printed. ' + done + ' of ' + total + ' words.');
        else api.status(done + ' of ' + total + ' words correct.');
        /* A grid that loads already solved (from an earlier visit) was celebrated back then. */
        if (wasSolved === null && solved && !revealed) setCelebrated();
        if (solved && !revealed && !celebrated && wasSolved === false) {
          /* Fanfare only for a real solve: just now (not on load), with no help from Reveal, and only once. */
          setCelebrated();
          api.celebrate('You solved Arthur Wynne\'s 1913 Word-Cross!');
          wave();
        } else if (typed && fresh.length) {
          api.sound('coin');
          fresh.forEach(glint);
        }
        wasSolved = solved;
      }
      function setCelebrated() { celebrated = true; api.store.set('celebrated', true); }
      /* A finished word glints, one cell after another. */
      function glint(i) {
        if (RM) return;
        data.clues[i].cells.forEach(function (rc, k) { flash(cells[rc[0] + ',' + rc[1]], k * 70); });
      }
      /* For a real solve the whole diamond glints in a wave from the top. */
      function wave() {
        if (RM) return;
        keys.forEach(function (key) { var rc = key.split(','); flash(cells[key], Number(rc[0]) * 80 + Math.abs(Number(rc[1]) - 6) * 30); });
      }
      /* One cell glints after `delay` ms. */
      function flash(cell, delay) {
        if (!cell) return;
        var inp = cell.querySelector('input');
        cell.classList.remove('is-typed');
        inp.style.animationDelay = delay + 'ms';
        replay(cell, 'is-glint', delay + 650);
        later(function () { inp.style.animationDelay = ''; }, delay + 650);
      }
      function clearMarks() {
        if (!checked) return;
        checked = false;
        Object.keys(cells).forEach(function (k) { cells[k].classList.remove('wrong', 'right', 'is-shake'); });
      }
      function check() {
        checked = true;
        var wrong = 0;
        Object.keys(inputs).forEach(function (k) {
          var rc = k.split(','), r = Number(rc[0]), c = Number(rc[1]), v = inputs[k].value, want = data.grid[r].charAt(c);
          cells[k].classList.remove('wrong'); cells[k].classList.remove('right');
          if (!v || inputs[k].readOnly) return;  /* the pre-printed FUN keeps its own colours */
          if (v === want) cells[k].classList.add('right'); else { cells[k].classList.add('wrong'); wrong++; }
        });
        progress();
        api.sound(wrong ? 'wrong' : 'bell');
        /* The status line is read out by screen readers, so only the "no wrong letters" news needs announcing. */
        if (wrong) api.status(wrong === 1 ? '1 letter is wrong. It is shown in red.' : wrong + ' letters are wrong. They are shown in red.');
        else api.announce('No wrong letters so far.');
        if (wrong && !RM) Object.keys(cells).forEach(function (k) { if (cells[k].classList.contains('wrong')) replay(cells[k], 'is-shake', 400); });
      }
      function revealActive() {
        if (active < 0) { api.status('Pick a clue first, then press Reveal this word.'); return; }
        var cl = data.clues[active];
        var changed = false;
        cl.cells.forEach(function (rc, k) {
          var inp = inputs[rc[0] + ',' + rc[1]], want = cl.answer.charAt(k);
          if (inp && !inp.readOnly && inp.value !== want) { inp.value = want; saved[rc[0] + ',' + rc[1]] = want; changed = true; }
        });
        if (changed) markRevealed();
        api.store.set('fill', saved); clearMarks(); progress();
        api.sound('whoosh');
        api.announce(cl.label + ' is ' + cl.answer);
      }
      function revealAll() {
        var changed = false;
        Object.keys(inputs).forEach(function (k) {
          var rc = k.split(','), want = data.grid[Number(rc[0])].charAt(Number(rc[1]));
          if (!inputs[k].readOnly && inputs[k].value !== want) { inputs[k].value = want; saved[k] = want; changed = true; }
        });
        if (changed) markRevealed();
        api.store.set('fill', saved); clearMarks(); progress();
        api.sound('whoosh');
      }
      function markRevealed() {
        revealed = true;
        api.store.set('revealed', true);
      }
      function firstClue() { return data.clues.findIndex(function (c) { return !c.prefilled; }); }
      /* Wipe every typed letter and go back to the first clue. */
      function newGame() {
        Object.keys(inputs).forEach(function (k) { if (!inputs[k].readOnly) { inputs[k].value = ''; saved[k] = ''; } });
        api.store.set('fill', saved); clearMarks();
        revealed = false; api.store.set('revealed', false); wasSolved = false;
        celebrated = false; api.store.set('celebrated', false);
        clearTimers();
        Object.keys(cells).forEach(function (k) { cells[k].classList.remove('is-glint', 'is-typed', 'is-shake'); cells[k].querySelector('input').style.animationDelay = ''; });
        hopped = { key: null, letters: '' }; lastTapped = null;
        setTabStop(keys[0]);  /* Tab into the grid starts at the top of the diamond again */
        setActive(firstClue());
        progress();
        api.sound('shuffle');
        api.announce('Grid cleared. New game.');
      }

      setActive(firstClue());
      progress();
      return { destroy: function () { clearTimers(); if (observer) observer.disconnect(); window.removeEventListener('resize', fit); } };
    }
  });
})();
