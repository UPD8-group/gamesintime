/* The Memory Handset, ported from the original 1973 arcade source (UPD8-group/1973, src/components/MemoryHandset.jsx).
   Repeat a growing tone-and-light sequence on four burnt-palette squares. One wrong square ends the run.
   The handset, its timings, tones and copy are the arcade's own. The only change to how it plays is a fix for
   two very quick taps at the end of a sequence, which used to skip a round (see docs/game-notes/memory-handset.json).
   Contract: docs/ADDING-A-GAME.md */
(function () {
  'use strict';

  var TILES = [
    { id: 'ember', freq: 392 },
    { id: 'teal', freq: 330 },
    { id: 'olive', freq: 262 },
    { id: 'plum', freq: 196 }
  ];

  var START_STEP = 620;
  var STEP_SHRINK = 18;
  var STEP_FLOOR = 220;

  /* Every rule the handset uses from the arcade's src/styles.css, values unchanged, each selector prefixed with
     .game-memory-handset. The arcade's .btn, .btn-solid and .btn-outline are renamed .m-btn, .m-btn-solid and
     .m-btn-outline because Games in Time has its own global .btn. The first four rules carry over what the arcade
     set on body, button, :focus-visible and every element, so the handset sets its type exactly as in the original. */
  var CSS = [
    '.game-memory-handset { font: 17px/1.65 var(--font-body); color: var(--ink); -webkit-font-smoothing: antialiased; }',
    '.game-memory-handset *, .game-memory-handset *::before, .game-memory-handset *::after { box-sizing: border-box; }',
    '.game-memory-handset button { font: inherit; cursor: pointer; }',
    '.game-memory-handset :focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }',
    '.game-memory-handset .m-btn { display: inline-block; font-family: var(--font-mono); font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; border-radius: 8px; padding: 13px 24px; transition: filter 0.2s, background 0.2s, color 0.2s; }',
    '.game-memory-handset .m-btn-solid { background: var(--amber); color: var(--ground); border: 1px solid var(--amber); }',
    '.game-memory-handset .m-btn-solid:hover { filter: brightness(1.12); }',
    '.game-memory-handset .m-btn-outline { background: transparent; color: var(--ink); border: 1px solid var(--line); }',
    '.game-memory-handset .m-btn-outline:hover { border-color: var(--amber); color: var(--amber); }',
    '.game-memory-handset .m-btn:disabled { opacity: 0.4; pointer-events: none; }',
    '.game-memory-handset .machine-stage { display: flex; justify-content: center; }',
    '.game-memory-handset .machine-note { font-family: var(--font-mono); font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; text-align: center; color: var(--ink-dim); margin: 22px auto 0; max-width: 60ch; }',
    '.game-memory-handset .handset { width: min(340px, 100%); border-radius: 34px; padding: 26px 22px 22px; background: linear-gradient(172deg, #261b10, #171008 55%, #100a05); border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 24px 60px rgba(0, 0, 0, 0.5); }',
    '.game-memory-handset .handset-speaker { width: 92px; height: 7px; margin: 0 auto 20px; border-radius: 999px; background: #0a0602; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.9), 0 1px 0 rgba(255, 255, 255, 0.05); }',
    '.game-memory-handset .handset-display { background: #0d0704; border-radius: 14px; padding: 14px 16px 12px; box-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.85); }',
    '.game-memory-handset .led-row { display: flex; align-items: baseline; justify-content: space-between; }',
    '.game-memory-handset .led-readout { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 42px; font-weight: 700; color: #ff5a3c; text-shadow: 0 0 12px rgba(255, 90, 60, 0.6); }',
    '.game-memory-handset .led-best { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; color: rgba(255, 90, 60, 0.55); }',
    '.game-memory-handset .handset-status { font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-dim); margin: 8px 0 0; }',
    '.game-memory-handset .handset-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }',
    '.game-memory-handset .handset-tile { aspect-ratio: 1; border: 1px solid rgba(0, 0, 0, 0.45); border-radius: 16px; padding: 0; transition: background 0.1s, box-shadow 0.1s, filter 0.1s; touch-action: manipulation; }',
    '.game-memory-handset .handset-tile:active { filter: brightness(1.15); }',
    '.game-memory-handset .tile-ember { background: #8a3a1c; }',
    '.game-memory-handset .tile-ember.lit { background: #ff6a33; box-shadow: 0 0 30px rgba(255, 106, 51, 0.6); }',
    '.game-memory-handset .tile-teal { background: #2c5464; }',
    '.game-memory-handset .tile-teal.lit { background: #5fb3cf; box-shadow: 0 0 30px rgba(95, 179, 207, 0.6); }',
    '.game-memory-handset .tile-olive { background: #55663a; }',
    '.game-memory-handset .tile-olive.lit { background: #a2c95f; box-shadow: 0 0 30px rgba(162, 201, 95, 0.6); }',
    '.game-memory-handset .tile-plum { background: #742d43; }',
    '.game-memory-handset .tile-plum.lit { background: #d95c85; box-shadow: 0 0 30px rgba(217, 92, 133, 0.6); }',
    '.game-memory-handset .handset-buttons { display: flex; gap: 10px; margin-top: 18px; }',
    '.game-memory-handset .handset-buttons .m-btn { flex: 1; padding-left: 12px; padding-right: 12px; text-align: center; }',
    '.game-memory-handset .handset-etch { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.22em; text-align: center; color: var(--ink-faint); margin: 14px 0 0; }'
  ].join('\n');

  GamesInTime.register({
    id: 'memory-handset',
    frame: 'none',
    mount: function (root, api) {
      var h = api.h;

      /* The arcade's React state and refs, as plain variables. */
      var phase = 'idle'; /* idle | watch | turn | over */
      var lit = -1;
      var round = 0;
      var best = readBest();
      var seq = [];
      var pos = 0;
      var gen = 0; /* bumped to cancel a running sequence, exactly as the arcade does */
      var bestBefore = best; /* the best that stood when this run began, for the new-best celebration */
      var timers = new Set();
      var shown = ''; /* the last line sent to the site's status, so screen readers do not hear repeats */

      function readBest() {
        return Number(api.store.get('best', 0)) || 0;
      }

      function saveBest(n) {
        if (n <= best) return;
        best = n;
        api.store.set('best', n);
      }

      function sleep(ms) {
        return new Promise(function (resolve) {
          var id = setTimeout(function () { timers.delete(id); resolve(); }, ms);
          timers.add(id);
        });
      }

      function stepTime() {
        return Math.max(STEP_FLOOR, START_STEP - STEP_SHRINK * (seq.length - 1));
      }

      /* ---------- the handset ---------- */
      root.appendChild(h('style', null, CSS));
      var readout = h('span', { class: 'led-readout' });
      var bestEl = h('span', { class: 'led-best' });
      var statusEl = h('p', { class: 'handset-status', role: 'status' });
      var tiles = TILES.map(function (t, i) {
        return h('button', {
          type: 'button',
          class: 'handset-tile tile-' + t.id,
          'aria-label': t.id + ' square',
          onpointerdown: function () { press(i); }
        });
      });
      /* The play and stop symbols are hidden from screen readers, which read just Start, Restart and Stop. */
      var startBtn = h('button', { type: 'button', class: 'm-btn m-btn-solid', onclick: function () { start(); } });
      var stopBtn = h('button', { type: 'button', class: 'm-btn m-btn-outline', onclick: function () { stop(); } },
        h('span', { 'aria-hidden': 'true' }, '■'), ' Stop');

      root.appendChild(h('div', { class: 'machine-stage' },
        h('div', { class: 'handset' },
          h('div', { class: 'handset-speaker', 'aria-hidden': 'true' }),
          h('div', { class: 'handset-display' },
            h('div', { class: 'led-row' }, readout, bestEl),
            statusEl),
          h('div', { class: 'handset-grid' }, tiles),
          h('div', { class: 'handset-buttons' }, startBtn, stopBtn),
          h('p', { class: 'handset-etch' }, 'memory handset · model mcmlxxiii'))));
      root.appendChild(h('p', { class: 'machine-note' }, 'ember · teal · olive · plum · one wrong square ends the run'));

      function setText(el, text) {
        if (el.textContent !== text) el.textContent = text;
      }
      function pad2(n) {
        return String(n).padStart(2, '0');
      }

      /* What React rendered from the state, done by hand after every change. */
      function render() {
        setText(readout, pad2(round));
        setText(bestEl, 'BEST ' + pad2(best));
        setText(statusEl,
          phase === 'idle' ? 'press start'
            : phase === 'watch' ? 'watch…'
              : phase === 'turn' ? 'your turn'
                : 'game over · ' + round + ' round' + (round === 1 ? '' : 's'));
        tiles.forEach(function (b, i) { b.classList.toggle('lit', lit === i); });
        var label = phase === 'idle' ? 'Start' : 'Restart';
        if (phase === 'idle' || phase === 'over') {
          if (startBtn.textContent !== '▶ ' + label) startBtn.replaceChildren(h('span', { 'aria-hidden': 'true' }, '▶'), ' ' + label);
        } else setText(startBtn, label);
        stopBtn.disabled = phase === 'idle' || phase === 'over';

        /* The site's status line above the game. The watch line has no round number, so the short pause between
           rounds (still showing the old round) and the new round's playback read as one line, announced once. */
        var line = phase === 'idle' ? 'Press Start'
          : phase === 'watch' ? 'Watch and listen'
            : phase === 'turn' ? 'Round ' + round + '. Your turn'
              : 'Game over. Score ' + round + ', best ' + best;
        if (line !== shown) { shown = line; api.status(line); }
      }

      async function playRound(g) {
        seq.push(Math.floor(api.random() * 4));
        round = seq.length;
        pos = 0;
        phase = 'watch';
        render();
        var step = stepTime();
        await sleep(480);
        for (var i of seq) {
          if (gen !== g) return;
          lit = i;
          render();
          api.tone(TILES[i].freq, (step * 0.62) / 1000);
          await sleep(step * 0.62);
          if (gen !== g) return;
          lit = -1;
          render();
          await sleep(step * 0.38);
        }
        if (gen !== g) return;
        phase = 'turn';
        render();
      }

      function start() {
        api.unlockSound();
        var g = ++gen;
        seq = [];
        bestBefore = best;
        playRound(g);
      }

      function stop() {
        gen++;
        seq = [];
        lit = -1;
        round = 0;
        phase = 'idle';
        render();
      }

      async function press(i) {
        if (phase !== 'turn') return;
        api.unlockSound();
        var g = gen;

        if (i !== seq[pos]) {
          var completed = seq.length - 1;
          gen++;
          api.tone(62, 0.5, 'sawtooth', 0.14);
          lit = -1;
          round = completed;
          saveBest(completed);
          phase = 'over';
          render();
          if (completed > bestBefore) api.celebrate('New best! ' + completed + ' round' + (completed === 1 ? '' : 's'));
          return;
        }

        api.tone(TILES[i].freq, 0.18);
        lit = i;
        pos++;
        /* Only the tap that finishes the sequence moves on to the next round. (In the original, two taps less than
           180 ms apart both moved it on, which skipped a round and played two sequences over each other.) */
        var finished = pos === seq.length;
        render();
        await sleep(180);
        if (gen !== g) return;
        lit = -1;
        render();

        if (finished) {
          saveBest(seq.length);
          phase = 'watch';
          render();
          await sleep(520);
          if (gen !== g) return;
          playRound(g);
        }
      }

      render();

      return {
        destroy: function () {
          gen++;
          timers.forEach(function (id) { clearTimeout(id); });
          timers.clear();
        }
      };
    }
  });
})();
