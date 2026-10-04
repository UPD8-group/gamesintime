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
        api.status('');
        return { destroy: function () {} };
      }
      var rows = data.grid.length, cols = data.grid[0].length;
      var cells = {}, inputs = {}, clueButtons = [], active = -1, checked = false, saved = api.store.get('fill', {});
      var labelAt = {};
      (data.labels || []).forEach(function (l) { labelAt[l.row + ',' + l.col] = l.label; });
      var prefilled = {};
      data.clues.forEach(function (c) { if (c.prefilled) c.cells.forEach(function (rc, i) { prefilled[rc[0] + ',' + rc[1]] = c.answer[i]; }); });

      root.appendChild(h('style', null,
        '.game-word-cross-1913 .layout { display: grid; grid-template-columns: minmax(0, auto) minmax(14rem, 1fr); gap: 1.25rem; align-items: start; }' +
        '@media (max-width: 760px) { .game-word-cross-1913 .layout { grid-template-columns: 1fr; } }' +
        '.game-word-cross-1913 .grid-wrap { overflow-x: auto; max-width: 100%; padding-bottom: 4px; }' +
        '.game-word-cross-1913 .grid { --cell: min(44px, calc((100vw - 64px) / ' + cols + ')); display: grid; grid-template-columns: repeat(' + cols + ', var(--cell)); grid-auto-rows: var(--cell); gap: 2px; margin-inline: auto; width: max-content; }' +
        '.game-word-cross-1913 .blank { }' +
        '.game-word-cross-1913 .cell { position: relative; }' +
        '.game-word-cross-1913 .cell input { width: var(--cell); height: var(--cell); padding: 0; text-align: center; text-transform: uppercase; font-family: var(--font-display); font-size: calc(var(--cell) * .5); border: 2px solid var(--ink); background: var(--surface); color: var(--ink); border-radius: 3px; caret-color: transparent; }' +
        '.game-word-cross-1913 .cell input:focus { outline: 3px solid var(--brass); outline-offset: -2px; }' +
        '.game-word-cross-1913 .cell.active input { background: var(--surface-2); }' +
        '.game-word-cross-1913 .cell input[readonly] { background: var(--brand); color: var(--on-brand); border-color: var(--brand); }' +
        '.game-word-cross-1913 .cell.wrong input { color: var(--red); border-color: var(--red); }' +
        '.game-word-cross-1913 .cell.right input { color: var(--green); }' +
        '.game-word-cross-1913 .cell .lab { position: absolute; left: 2px; top: 0; font-size: calc(var(--cell) * .28); line-height: 1.2; font-weight: 700; color: var(--ink-muted); pointer-events: none; }' +
        '.game-word-cross-1913 .cell input[readonly] + .lab { color: var(--on-brand); }' +
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
      var clearBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: clearAll }, 'Clear');
      root.appendChild(h('div', { class: 'game-toolbar' }, checkBtn, revealBtn, revealAllBtn, clearBtn));
      root.appendChild(h('p', { class: 'masthead' }, (data.title || 'Word-Cross') + ' · ' + (data.publication || 'New York World') + ', ' + (data.date || '21 December 1913')));

      var grid = h('div', { class: 'grid', role: 'group', 'aria-label': 'Crossword grid' });
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var ch = data.grid[r].charAt(c);
        if (ch === '#' || ch === ' ') { grid.appendChild(h('div', { class: 'blank', 'aria-hidden': 'true' })); continue; }
        (function (r, c) {
          var key = r + ',' + c, pre = prefilled[key];
          var input = h('input', { type: 'text', maxlength: '1', inputmode: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false',
            'aria-label': 'Row ' + (r + 1) + ', column ' + (c + 1) + (labelAt[key] ? ', ' + labelAt[key] : ''), value: pre || (saved[key] || ''), readonly: !!pre });
          input.addEventListener('focus', function () { setActiveFor(r, c); });
          input.addEventListener('input', function () { onInput(r, c); });
          input.addEventListener('keydown', function (ev) { onKey(ev, r, c); });
          input.addEventListener('click', function () { if (document.activeElement === input) setActiveFor(r, c, true); });
          var cell = h('div', { class: 'cell' }, input, labelAt[key] ? h('span', { class: 'lab' }, labelAt[key]) : null);
          cells[key] = cell; inputs[key] = input;
          grid.appendChild(cell);
        })(r, c);
      }
      var clueList = h('ol', { class: 'clues', 'aria-label': 'Clues' });
      data.clues.forEach(function (cl, i) {
        var b = h('button', { type: 'button', onclick: function () { setActive(i); focusFirstEmpty(i); } }, h('span', { class: 'num' }, cl.label + ' '), cl.clue);
        clueButtons.push(b);
        clueList.appendChild(h('li', null, b));
      });
      root.appendChild(h('div', { class: 'layout' }, h('div', { class: 'grid-wrap' }, grid), h('div', null, h('h3', { style: { marginBottom: '.4rem' } }, 'Clues'), clueList)));
      root.appendChild(h('p', { class: 'game-note' }, 'Each clue gives two labels: the word runs from the first cell to the second. Type a letter and the cursor moves along the word. Arrow keys move around the grid.'));

      function cluesThrough(r, c) {
        var out = [];
        data.clues.forEach(function (cl, i) { if (cl.cells.some(function (rc) { return rc[0] === r && rc[1] === c; })) out.push(i); });
        return out;
      }
      function setActive(i) {
        active = i;
        Object.keys(cells).forEach(function (k) { cells[k].classList.remove('active'); });
        clueButtons.forEach(function (b, k) { b.setAttribute('aria-current', String(k === i)); });
        if (i < 0) return;
        data.clues[i].cells.forEach(function (rc) { var cell = cells[rc[0] + ',' + rc[1]]; if (cell) cell.classList.add('active'); });
        var b = clueButtons[i]; if (b && b.scrollIntoView && !api.reducedMotion) { try { b.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
      }
      /* Clicking a cell that already has focus switches between the clues that cross there. */
      function setActiveFor(r, c, toggle) {
        var list = cluesThrough(r, c);
        if (!list.length) return;
        if (toggle && list.length > 1 && list.indexOf(active) >= 0) setActive(list[(list.indexOf(active) + 1) % list.length]);
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
            if (next) { var inp = inputs[next[0] + ',' + next[1]]; if (inp) { inp.focus(); inp.select && inp.select(); } }
            return;
          }
        }
      }
      function onInput(r, c) {
        var inp = inputs[r + ',' + c];
        var v = (inp.value || '').replace(/[^a-z]/gi, '').toUpperCase().slice(-1);
        inp.value = v;
        saved[r + ',' + c] = v; api.store.set('fill', saved);
        clearMarks();
        if (v) moveAlong(r, c, 1);
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
        } else if (ev.key === 'Backspace' && !inp.readOnly) {
          ev.preventDefault();
          if (inp.value) { inp.value = ''; saved[r + ',' + c] = ''; api.store.set('fill', saved); clearMarks(); progress(); }
          else moveAlong(r, c, -1);
        } else if (ev.key === 'Delete' && !inp.readOnly) {
          inp.value = ''; saved[r + ',' + c] = ''; api.store.set('fill', saved); clearMarks(); progress();
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
        var done = 0;
        data.clues.forEach(function (cl, i) { var s = wordState(i); clueButtons[i].classList.toggle('done', s.right); if (s.right) done++; });
        if (done === data.clues.length) api.status('You solved the first crossword ever printed. ' + done + ' of ' + done + ' words.');
        else api.status(done + ' of ' + data.clues.length + ' words correct.');
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
          if (!v) return;
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
      function clearAll() {
        Object.keys(inputs).forEach(function (k) { if (!inputs[k].readOnly) { inputs[k].value = ''; saved[k] = ''; } });
        api.store.set('fill', saved); clearMarks(); progress();
        api.announce('Grid cleared');
      }

      setActive(data.clues.findIndex(function (c) { return !c.prefilled; }));
      progress();
      return { destroy: function () {} };
    }
  });
})();
