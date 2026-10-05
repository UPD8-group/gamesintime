/* Trail: the green-phosphor grid snake from the original 1973 arcade source (UPD8-group/1973, src/components/Trail.jsx), ported as it is.
   A 17 by 17 grid on a 340 px canvas. The trail steps every 160 ms, 4 ms quicker for each pickup, never faster than
   70 ms. Walls and your own trail are fatal. Same tones, colours, d-pad and copy as the original; the handheld is
   its own frame, so it registers with frame: 'none'. See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  var GRID = 17;
  var CANVAS = 340;
  var CELL = CANVAS / GRID;
  var START_TICK = 160;
  var TICK_SHRINK = 4;
  var TICK_FLOOR = 70;

  var DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  var KEYMAP = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    s: 'down',
    a: 'left',
    d: 'right',
    W: 'up',
    S: 'down',
    A: 'left',
    D: 'right'
  };

  /* Every rule the handheld uses in the original arcade, copied from its styles.css with each selector prefixed .game-trail.
     The source's .btn, .btn-solid and .btn-outline are renamed .m-btn, .m-btn-solid and .m-btn-outline because
     this site has its own .btn. The 1970s hall defines the source's colour and font variables, so they read the same.
     The first four rules are the page context the source's controls inherit (its body, box-sizing, button and
     focus rules). */
  var CSS = [
    '.game-trail { font: 17px/1.65 var(--font-body); color: var(--ink); -webkit-font-smoothing: antialiased; }',
    '.game-trail *, .game-trail *::before, .game-trail *::after { box-sizing: border-box; }',
    '.game-trail button { font: inherit; cursor: pointer; }',
    '.game-trail :focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }',
    '.game-trail .m-btn { display: inline-block; font-family: var(--font-mono); font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; border-radius: 8px; padding: 13px 24px; transition: filter 0.2s, background 0.2s, color 0.2s; }',
    '.game-trail .m-btn-solid { background: var(--amber); color: var(--ground); border: 1px solid var(--amber); }',
    '.game-trail .m-btn-solid:hover { filter: brightness(1.12); }',
    '.game-trail .m-btn-outline { background: transparent; color: var(--ink); border: 1px solid var(--line); }',
    '.game-trail .m-btn-outline:hover { border-color: var(--amber); color: var(--amber); }',
    '.game-trail .m-btn:disabled { opacity: 0.4; pointer-events: none; }',
    '.game-trail .machine-stage { display: flex; justify-content: center; }',
    '.game-trail .machine-note { font-family: var(--font-mono); font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; text-align: center; color: var(--ink-dim); margin: 22px auto 0; max-width: 60ch; }',
    '.game-trail .machine-controls { display: flex; justify-content: center; gap: 12px; margin-top: 18px; }',
    '.game-trail .scanlines { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: repeating-linear-gradient(rgba(0, 0, 0, 0.22) 0px, rgba(0, 0, 0, 0.22) 1px, transparent 1px, transparent 3px); z-index: 6; }',
    '.game-trail .trail-canvas { display: block; width: 100%; height: auto; touch-action: none; }',
    '/* Block page scrolling over the screen only while a game runs, so a finger can still scroll past an idle machine on a phone. */ .game-trail:not(.is-running) .trail-canvas { touch-action: auto; }',
    '.game-trail .phosphor-cabinet { width: min(420px, 100%); border-radius: 20px; padding: 20px; background: linear-gradient(168deg, #3a423b, #232922 70%); border: 1px solid rgba(255, 255, 255, 0.07); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 26px 60px rgba(0, 0, 0, 0.5); }',
    '.game-trail .phosphor-screen { position: relative; border-radius: 12px; overflow: hidden; box-shadow: inset 0 0 36px rgba(0, 0, 0, 0.7); }',
    '.game-trail .dpad { display: grid; grid-template-columns: repeat(3, 58px); gap: 8px; justify-content: center; margin-top: 18px; }',
    '.game-trail .dpad-btn { height: 46px; font-family: var(--font-mono); font-size: 13px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #c9ffdb; background: rgba(6, 17, 10, 0.85); border: 1px solid rgba(127, 240, 160, 0.35); border-radius: 9px; touch-action: manipulation; transition: background 0.15s; }',
    '.game-trail .dpad-btn:active { background: rgba(127, 240, 160, 0.25); }',
    '.game-trail .dpad-start { font-size: 10px; letter-spacing: 0.1em; color: #06110a; background: #7ff0a0; border-color: #7ff0a0; }'
  ].join('\n');

  GamesInTime.register({
    id: 'trail',
    frame: 'none',
    mount: function (root, api) {
      var h = api.h;
      root.appendChild(h('style', null, CSS));

      /* The source's refs and state, as plain variables. Bumping gen ends whichever loop is running. */
      var gen = 0;
      var game = null;
      var running = false;
      var score = 0;
      var best = readBest();
      var dead = false;
      var timer = null;
      var parked = null; /* the next tick, held while the page is hidden */

      function readBest() {
        return Number(api.store.get('best', 0)) || 0;
      }

      /* ---------- the handheld ---------- */
      var canvas = h('canvas', {
        width: CANVAS,
        height: CANVAS,
        class: 'trail-canvas',
        role: 'img',
        'aria-label': 'Trail grid. Steer with the arrow keys, W A S D, or the direction pad below.'
      });
      function padButton(dir, label, glyph) {
        return h('button', { type: 'button', class: 'dpad-btn', 'aria-label': label, onclick: function () { steer(dir); } }, glyph);
      }
      var padStart = h('button', { type: 'button', class: 'dpad-btn dpad-start', onclick: start }, 'start');
      root.appendChild(h('div', { class: 'machine-stage' },
        h('div', { class: 'phosphor-cabinet' },
          h('div', { class: 'phosphor-screen' }, canvas, h('div', { class: 'scanlines', 'aria-hidden': 'true' })),
          h('div', { class: 'dpad', role: 'group', 'aria-label': 'Direction pad' },
            h('span'), padButton('up', 'Steer up', '▲'), h('span'),
            padButton('left', 'Steer left', '◀'), padStart, padButton('right', 'Steer right', '▶'),
            h('span'), padButton('down', 'Steer down', '▼'), h('span')))));

      var noteEl = h('p', { class: 'machine-note', role: 'status' });
      root.appendChild(noteEl);
      var startBtn = h('button', { type: 'button', class: 'm-btn m-btn-solid', onclick: start });
      var stopBtn = h('button', { type: 'button', class: 'm-btn m-btn-outline', onclick: stop, disabled: true },
        h('span', { 'aria-hidden': 'true' }, '■'), ' Stop');
      root.appendChild(h('div', { class: 'machine-controls' }, startBtn, stopBtn));

      function setText(el, text) {
        if (el.textContent !== text) el.textContent = text;
      }
      /* What React rendered from state: button labels, the Stop button's disabled state and the caption. */
      function render() {
        setText(padStart, running ? 'reset' : 'start');
        if (running) setText(startBtn, 'Restart');
        else if (startBtn.textContent !== '▶ Start') startBtn.replaceChildren(h('span', { 'aria-hidden': 'true' }, '▶'), ' Start');
        stopBtn.disabled = !running;
        setText(noteEl, dead ? 'the trail ends · ' + score + ' · press start' : 'best · ' + best + ' · walls are fatal');
      }

      /* ---------- keyboard: listening only while a game runs, as in the source ---------- */
      function onKey(e) {
        if (!Object.prototype.hasOwnProperty.call(KEYMAP, e.key)) return;
        e.preventDefault();
        steer(KEYMAP[e.key]);
      }
      function setRunning(v) {
        if (v === running) return;
        running = v;
        root.classList.toggle('is-running', !!v);
        if (v) window.addEventListener('keydown', onKey);
        else window.removeEventListener('keydown', onKey);
      }

      /* ---------- the game ---------- */
      function freshGame() {
        var mid = Math.floor(GRID / 2);
        var st = {
          trail: [
            { x: mid - 2, y: mid },
            { x: mid - 1, y: mid },
            { x: mid, y: mid }
          ],
          dir: 'right',
          nextDir: 'right',
          score: 0,
          pickup: null
        };
        st.pickup = placePickup(st);
        return st;
      }

      function placePickup(st) {
        while (true) {
          var p = { x: Math.floor(api.random() * GRID), y: Math.floor(api.random() * GRID) };
          if (!st.trail.some(function (c) { return c.x === p.x && c.y === p.y; })) return p;
        }
      }

      function steer(dir) {
        var st = game;
        if (!st) return;
        var cur = DIRS[st.dir];
        var next = DIRS[dir];
        if (cur.x + next.x === 0 && cur.y + next.y === 0) return; /* no reversing */
        st.nextDir = dir;
      }

      function tickDelay(st) {
        return Math.max(TICK_FLOOR, START_TICK - TICK_SHRINK * st.score);
      }

      function start() {
        api.unlockSound();
        var g = ++gen;
        var st = freshGame();
        game = st;
        clearTimeout(timer);
        parked = null;
        score = 0;
        dead = false;
        setRunning(true);
        render();
        api.status('Score 0');
        drawFrame(st);
        var tick = function () {
          timer = null;
          if (gen !== g) return;
          /* This site pauses games while the page is hidden: hold the step until the visitor comes back. */
          if (document.hidden) {
            parked = { tick: tick, wait: tickDelay(st) };
            return;
          }
          step(st);
          if (gen !== g) return;
          drawFrame(st);
          timer = setTimeout(tick, tickDelay(st));
        };
        timer = setTimeout(tick, START_TICK);
      }

      function onVisibility() {
        if (document.hidden || !parked) return;
        var p = parked;
        parked = null;
        timer = setTimeout(p.tick, p.wait);
      }
      document.addEventListener('visibilitychange', onVisibility);

      function stop() {
        gen++;
        clearTimeout(timer);
        timer = null;
        parked = null;
        game = null;
        setRunning(false);
        dead = false;
        score = 0;
        render();
        api.status('Press Start');
        drawFrame(freshGame());
      }

      function die(st) {
        gen++;
        api.tone(70, 0.5, 'sawtooth', 0.14);
        setRunning(false);
        dead = true;
        var newBest = st.score > best;
        if (newBest) {
          best = st.score;
          api.store.set('best', best);
        }
        render();
        api.status('Game over. Score ' + st.score + ', best ' + best);
        if (newBest) api.celebrate('New best: ' + st.score);
      }

      function step(st) {
        st.dir = st.nextDir;
        var d = DIRS[st.dir];
        var head = st.trail[st.trail.length - 1];
        var nx = head.x + d.x;
        var ny = head.y + d.y;

        if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) return die(st);

        var eats = st.pickup && nx === st.pickup.x && ny === st.pickup.y;
        var body = eats ? st.trail : st.trail.slice(1);
        if (body.some(function (c) { return c.x === nx && c.y === ny; })) return die(st);

        st.trail.push({ x: nx, y: ny });
        if (eats) {
          st.score++;
          score = st.score;
          render();
          api.status('Score ' + st.score);
          api.tone(392 + st.score * 16, 0.09);
          st.pickup = placePickup(st);
        } else {
          st.trail.shift();
        }
      }

      function drawFrame(st) {
        if (!canvas) return;
        var c = canvas.getContext('2d');
        c.fillStyle = '#06110a';
        c.fillRect(0, 0, CANVAS, CANVAS);

        c.strokeStyle = 'rgba(127,240,160,0.08)';
        c.lineWidth = 1;
        for (var i = 1; i < GRID; i++) {
          c.beginPath();
          c.moveTo(i * CELL + 0.5, 0);
          c.lineTo(i * CELL + 0.5, CANVAS);
          c.stroke();
          c.beginPath();
          c.moveTo(0, i * CELL + 0.5);
          c.lineTo(CANVAS, i * CELL + 0.5);
          c.stroke();
        }

        c.fillStyle = '#7ff0a0';
        for (var k = 0; k < st.trail.length; k++) {
          var cell = st.trail[k];
          c.fillRect(cell.x * CELL + 2, cell.y * CELL + 2, CELL - 4, CELL - 4);
        }
        if (st.pickup) {
          c.fillStyle = '#c9ffdb';
          c.fillRect(st.pickup.x * CELL + 4, st.pickup.y * CELL + 4, CELL - 8, CELL - 8);
        }

        c.fillStyle = 'rgba(201,255,219,0.8)';
        c.font = '600 12px ui-monospace, Menlo, monospace';
        c.textAlign = 'left';
        c.fillText('SCORE ' + String(st.score).padStart(3, '0'), 8, 16);
      }

      drawFrame(freshGame());
      render();
      api.status('Press Start');

      return {
        destroy: function () {
          gen++;
          clearTimeout(timer);
          timer = null;
          parked = null;
          setRunning(false);
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }
  });
})();
