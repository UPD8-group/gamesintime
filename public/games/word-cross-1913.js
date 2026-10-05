/* Word-Cross: the first crossword, by Arthur Wynne, New York World, 21 December 1913.
   The puzzle data (grid, printed labels, clues) lives in content.js under wordCross. Clues are labelled the 1913 way,
   with the numbers at both ends of the word, like "2-3", "F-7".
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  GamesInTime.register({
    id: 'word-cross-1913',
    mount: function (root, api) {
      var h = api.h;
      var data = api.site.wordCross;
      if (!data || !data.grid || !data.clues) {
        root.appendChild(h('p', { class: 'notice' }, 'The puzzle data is not loaded yet.'));
        api.status('Puzzle not available');
        return { destroy: function () {} };
      }
      var rows = data.grid.length, cols = data.grid[0].length;
      var cells = {}, inputs = {}, clueButtons = [], active = -1, checked = false;
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
         When the diamond is wider than the space (a phone), the grid slides sideways inside .grid-wrap instead of shrinking. */
      var MIN = 40, MAX = 56, GAP = 1;

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
        '.game-word-cross-1913 .cell.wrong input { color: var(--red); border-color: var(--red); }' +
        '.game-word-cross-1913 .cell.right input:not([readonly]) { color: var(--green); }' +
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
        '.game-word-cross-1913 .masthead { font-family: var(--font-display); font-size: 1.25rem; margin-bottom: .5rem; }'));

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
          var input = h('input', { type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false',
            'aria-label': 'Row ' + (r + 1) + ', column ' + (c + 1), value: pre || (saved[key] || ''), readonly: !!pre });
          /* Was this cell already focused before the mouse or finger went down? The focus event fires before click,
             so the click handler cannot tell on its own. A second tap on the same cell swaps to the crossing word. */
          var wasFocused = false;
          function remember() { wasFocused = (document.activeElement === input); }
          input.addEventListener('pointerdown', remember);
          input.addEventListener('mousedown', remember);
          input.addEventListener('focus', function () { setActiveFor(r, c, false); selectAll(input); });
          input.addEventListener('click', function () { setActiveFor(r, c, wasFocused); wasFocused = true; selectAll(input); });
          input.addEventListener('input', function () { onInput(r, c); });
          input.addEventListener('keydown', function (ev) { onKey(ev, r, c); });
          var cell = h('div', { class: 'cell' }, input, labelAt[key] ? h('span', { class: 'lab', 'aria-hidden': 'true' }, labelAt[key]) : null);
          cells[key] = cell; inputs[key] = input;
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
      root.appendChild(h('div', { class: 'layout' }, wrap, slideHint, now, h('div', null, h('h3', { style: { marginBottom: '.4rem' } }, 'Clues'), clueList)));

      /* Size the cells to the space available, between MIN and MAX. If even MIN cells are too wide for the space,
         the wrapper scrolls sideways and starts centred so the middle of the diamond is in view. */
      function fit() {
        var w = wrap.clientWidth || 300;
        var cell = Math.max(MIN, Math.min(MAX, Math.floor((w - (cols - 1) * GAP) / cols)));
        grid.style.setProperty('--cell', cell + 'px');
        var over = wrap.scrollWidth - wrap.clientWidth;
        slideHint.hidden = over <= 1;
        if (over > 1 && !wrap.dataset.centred) { wrap.scrollLeft = Math.round(over / 2); wrap.dataset.centred = '1'; }
      }
      var observer = null;
      if (window.ResizeObserver) { observer = new ResizeObserver(fit); observer.observe(wrap); }
      else window.addEventListener('resize', fit);
      fit();
      root.appendChild(h('p', { class: 'game-note' }, 'Each clue gives two labels: the word runs from the first cell to the second. Type a letter and the cursor moves along the word. Tap a cell again, or press Enter, to swap to the word that crosses it. Arrow keys move around the grid. The clues are printed exactly as Wynne wrote them in 1913, American spelling and all.'));

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
      function focusFirstEmpty(i) {
        var cl = data.clues[i];
        for (var k = 0; k < cl.cells.length; k++) {
          var inp = inputs[cl.cells[k][0] + ',' + cl.cells[k][1]];
          if (inp && !inp.value && !inp.readOnly) { inp.focus(); return; }
        }
        var first = inputs[cl.cells[0][0] + ',' + cl.cells[0][1]]; if (first) first.focus();
      }
      function moveAlong(r, c, dir) {
        if (active < 0) return;
        var cl = data.clues[active];
        for (var k = 0; k < cl.cells.length; k++) {
          if (cl.cells[k][0] === r && cl.cells[k][1] === c) {
            var next = cl.cells[k + dir];
            if (next) { var inp = inputs[next[0] + ',' + next[1]]; if (inp) inp.focus(); }
            return;
          }
        }
      }
      function setLetter(r, c, v) {
        inputs[r + ',' + c].value = v;
        saved[r + ',' + c] = v; api.store.set('fill', saved);
        clearMarks();
      }
      function onInput(r, c) {
        var inp = inputs[r + ',' + c];
        if (inp.readOnly) { inp.value = prefilled[r + ',' + c]; return; }
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
        setLetter(r, c, v);
        if (v) moveAlong(r, c, 1); else selectAll(inp);
        progress();
      }
      function onKey(ev, r, c) {
        var inp = inputs[r + ',' + c];
        var moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
        if (moves[ev.key]) {
          ev.preventDefault();
          var d = moves[ev.key], nr = r + d[0], nc = c + d[1];
          while (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (inputs[nr + ',' + nc]) { inputs[nr + ',' + nc].focus(); return; }
            nr += d[0]; nc += d[1];
          }
        } else if (ev.key === 'Enter') {
          /* Keyboard way to swap between the words that cross here. */
          ev.preventDefault();
          setActiveFor(r, c, true);
        } else if (ev.key === 'Backspace' && !inp.readOnly) {
          ev.preventDefault();
          if (inp.value) { setLetter(r, c, ''); progress(); }
          else moveAlong(r, c, -1);
        } else if (ev.key === 'Delete' && !inp.readOnly) {
          ev.preventDefault();
          setLetter(r, c, ''); progress();
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
      function progress() {
        var done = 0, total = 0;
        data.clues.forEach(function (cl, i) {
          if (cl.prefilled) return;
          total++;
          var s = wordState(i); clueButtons[i].classList.toggle('done', s.right); if (s.right) done++;
        });
        if (done === total) api.status('You solved the first crossword ever printed. ' + done + ' of ' + total + ' words.');
        else api.status(done + ' of ' + total + ' words correct.');
      }
      function clearMarks() {
        if (!checked) return;
        checked = false;
        Object.keys(cells).forEach(function (k) { cells[k].classList.remove('wrong'); cells[k].classList.remove('right'); });
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
        api.announce(wrong ? wrong + ' letters are wrong and shown in red.' : 'No wrong letters so far.');
        if (wrong) api.status(wrong + (wrong === 1 ? ' letter is' : ' letters are') + ' wrong. They are shown in red.');
      }
      function revealActive() {
        if (active < 0) { api.status('Pick a clue first, then press Reveal this word.'); return; }
        var cl = data.clues[active];
        cl.cells.forEach(function (rc, k) { var inp = inputs[rc[0] + ',' + rc[1]]; if (inp && !inp.readOnly) { inp.value = cl.answer.charAt(k); saved[rc[0] + ',' + rc[1]] = inp.value; } });
        api.store.set('fill', saved); clearMarks(); progress();
        api.announce(cl.label + ' is ' + cl.answer);
      }
      function revealAll() {
        Object.keys(inputs).forEach(function (k) { var rc = k.split(','); if (!inputs[k].readOnly) { inputs[k].value = data.grid[Number(rc[0])].charAt(Number(rc[1])); saved[k] = inputs[k].value; } });
        api.store.set('fill', saved); clearMarks(); progress();
      }
      function firstClue() { return data.clues.findIndex(function (c) { return !c.prefilled; }); }
      /* Wipe every typed letter and go back to the first clue. */
      function newGame() {
        Object.keys(inputs).forEach(function (k) { if (!inputs[k].readOnly) { inputs[k].value = ''; saved[k] = ''; } });
        api.store.set('fill', saved); clearMarks();
        setActive(firstClue());
        progress();
        api.announce('Grid cleared. New game.');
      }

      setActive(firstClue());
      progress();
      return { destroy: function () { if (observer) observer.disconnect(); else window.removeEventListener('resize', fit); } };
    }
  });
})();
