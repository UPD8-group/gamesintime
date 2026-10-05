/* Starfall: the fixed-shooter last stand from the 1973 floor of 1973.ai (src/components/Starfall.jsx), ported as it is.
   A fleet of 40 twinkling star-glyphs in five rows marches across a 520 by 560 night sky and steps down at each edge.
   One bolt in the air at a time, three lives, bombs from the lowest star in each column, and every cleared wave comes
   back lower and faster. Same speeds, tones, colours and copy as the original; the cabinet is its own frame, so it
   registers with frame: 'none'. See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  var W = 520;
  var H = 560;
  var ROWS = 5;
  var COLS = 8;
  var PX = 4;
  /* two twinkle frames for the falling stars: 7 by 5 block glyphs */
  var STAR_A = ['...X...', '..XXX..', '.XXXXX.', '..XXX..', '...X...'];
  var STAR_B = ['X..X..X', '..XXX..', '.XXXXX.', '..XXX..', 'X..X..X'];
  var CANNON = ['...X...', '..XXX..', 'XXXXXXX', 'XXXXXXX'];
  var STAR_W = 7 * PX;
  var STAR_H = 5 * PX;
  var CANNON_W = 7 * PX;
  var CANNON_H = 4 * PX;
  var COL_GAP = 50;
  var ROW_GAP = 40;
  var FLEET_W = (COLS - 1) * COL_GAP + STAR_W;
  var SIDE = 16;
  var PLAYER_Y = H - 44;
  var BOLT_SPEED = 9;
  var BOMB_SPEED = 3.4;
  var LIVES = 3;
  /* cool at the top, hot as they descend */
  var ROW_COLORS = ['#41798c', '#7fa05a', '#e3cb6e', '#e9a23b', '#d4592a'];
  var HIT_TONES = [523, 466, 415, 370, 330];
  var INTRO = 'one bolt in the air · drag to aim, tap or space to fire';

  /* Every rule the cabinet uses on 1973.ai, copied from its styles.css with each selector prefixed .game-starfall.
     The source's .btn, .btn-solid and .btn-outline are renamed .m-btn, .m-btn-solid and .m-btn-outline because
     this site has its own .btn. The 1970s hall defines the source's colour and font variables, so they read the same.
     The first four rules are the page context the source's controls inherit (its body, box-sizing, button and
     focus rules). */
  var CSS = [
    '.game-starfall { font: 17px/1.65 var(--font-body); color: var(--ink); -webkit-font-smoothing: antialiased; }',
    '.game-starfall *, .game-starfall *::before, .game-starfall *::after { box-sizing: border-box; }',
    '.game-starfall button { font: inherit; cursor: pointer; }',
    '.game-starfall :focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }',
    '.game-starfall .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; clip-path: inset(50%); overflow: hidden; white-space: nowrap; }',
    '.game-starfall .m-btn { display: inline-block; font-family: var(--font-mono); font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; border-radius: 8px; padding: 13px 24px; transition: filter 0.2s, background 0.2s, color 0.2s; }',
    '.game-starfall .m-btn-solid { background: var(--amber); color: var(--ground); border: 1px solid var(--amber); }',
    '.game-starfall .m-btn-solid:hover { filter: brightness(1.12); }',
    '.game-starfall .m-btn-outline { background: transparent; color: var(--ink); border: 1px solid var(--line); }',
    '.game-starfall .m-btn-outline:hover { border-color: var(--amber); color: var(--amber); }',
    '.game-starfall .m-btn:disabled { opacity: 0.4; pointer-events: none; }',
    '.game-starfall .machine-stage { display: flex; justify-content: center; }',
    '.game-starfall .machine-note { font-family: var(--font-mono); font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; text-align: center; color: var(--ink-dim); margin: 22px auto 0; max-width: 60ch; }',
    '.game-starfall .machine-controls { display: flex; justify-content: center; gap: 12px; margin-top: 18px; }',
    '.game-starfall .scanlines { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: repeating-linear-gradient(rgba(0, 0, 0, 0.22) 0px, rgba(0, 0, 0, 0.22) 1px, transparent 1px, transparent 3px); z-index: 6; }',
    '.game-starfall .starfall-canvas { display: block; width: 100%; height: auto; touch-action: none; }',
    '/* Block page scrolling over the screen only while a game runs, so a finger can still scroll past an idle machine on a phone. */ .game-starfall:not(.is-running) .starfall-canvas { touch-action: auto; }',
    '.game-starfall .starfall-cabinet { width: 100%; max-width: 560px; border-radius: 22px; padding: 20px; background: linear-gradient(168deg, #2b3a42, #182227 70%); border: 1px solid rgba(255, 255, 255, 0.07); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 26px 60px rgba(0, 0, 0, 0.5); }',
    '.game-starfall .starfall-screen { position: relative; border-radius: 14px; overflow: hidden; box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.65); }'
  ].join('\n');

  GamesInTime.register({
    id: 'starfall',
    frame: 'none',
    mount: function (root, api) {
      var h = api.h;
      root.appendChild(h('style', null, CSS));

      /* The source's refs and state, as plain variables. Bumping gen ends whichever loop is running. */
      var gen = 0;
      var game = null;
      var keys = { left: false, right: false };
      var running = false;
      var score = 0;
      var best = readBest();
      var message = INTRO;
      var raf = 0;

      function readBest() {
        return Number(api.store.get('best', 0)) || 0;
      }

      /* ---------- the cabinet ---------- */
      var canvas = h('canvas', {
        width: W,
        height: H,
        class: 'starfall-canvas',
        role: 'img',
        'aria-label': 'Starfall battlefield. Drag or use the arrow keys to move the cannon; tap the screen or press space to fire.'
      });
      canvas.addEventListener('pointerdown', function (e) {
        api.unlockSound();
        onPointer(e);
        fire();
      });
      canvas.addEventListener('pointermove', onPointer);
      root.appendChild(h('div', { class: 'machine-stage' },
        h('div', { class: 'starfall-cabinet' },
          h('div', { class: 'starfall-screen' }, canvas, h('div', { class: 'scanlines', 'aria-hidden': 'true' })))));

      var noteEl = h('p', { class: 'machine-note', role: 'status' });
      var scoreEl = h('p', { class: 'sr-only', 'data-testid': 'starfall-score' });
      root.appendChild(noteEl);
      root.appendChild(scoreEl);
      var startBtn = h('button', { type: 'button', class: 'm-btn m-btn-solid', onclick: start });
      var stopBtn = h('button', { type: 'button', class: 'm-btn m-btn-outline', onclick: stop, disabled: true },
        h('span', { 'aria-hidden': 'true' }, '■'), ' Stop');
      root.appendChild(h('div', { class: 'machine-controls' }, startBtn, stopBtn));

      function setText(el, text) {
        if (el.textContent !== text) el.textContent = text;
      }
      /* What React rendered from state: the Start label, the Stop button's disabled state, the caption and the score line. */
      function render() {
        if (running) setText(startBtn, 'Restart');
        else if (startBtn.textContent !== '▶ Start') startBtn.replaceChildren(h('span', { 'aria-hidden': 'true' }, '▶'), ' Start');
        stopBtn.disabled = !running;
        setText(noteEl, message);
        setText(scoreEl, 'score ' + score + ' · best ' + best);
      }

      /* ---------- keyboard: listening only while a game runs, as in the source ---------- */
      function onKeyDown(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          keys.left = true;
          e.preventDefault();
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          keys.right = true;
          e.preventDefault();
        } else if (e.key === ' ') {
          fire();
          e.preventDefault();
        }
      }
      function onKeyUp(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
      }
      function setRunning(v) {
        if (v === running) return;
        running = v;
        root.classList.toggle('is-running', !!v);
        if (v) {
          window.addEventListener('keydown', onKeyDown);
          window.addEventListener('keyup', onKeyUp);
        } else {
          window.removeEventListener('keydown', onKeyDown);
          window.removeEventListener('keyup', onKeyUp);
          keys.left = false;
          keys.right = false;
        }
      }

      /* ---------- the game ---------- */
      function allAlive() {
        var a = [];
        for (var i = 0; i < ROWS * COLS; i++) a.push(true);
        return a;
      }

      function freshGame() {
        var sky = [];
        for (var i = 0; i < 46; i++) {
          /* fixed pinprick backdrop, seeded per game */
          sky.push({ x: api.random() * W, y: api.random() * (H - 120) });
        }
        return {
          alive: allAlive(),
          left: ROWS * COLS,
          fleetX: (W - FLEET_W) / 2,
          fleetY: 64,
          dir: 1,
          stepAcc: 0,
          stepFlip: false,
          bombAcc: 0,
          playerX: W / 2,
          targetX: W / 2,
          bolt: null,
          bombs: [],
          score: 0,
          lives: LIVES,
          wave: 1,
          pausedUntil: 0,
          last: 0,
          sky: sky
        };
      }

      /* One requestAnimationFrame loop while a game runs. Browsers stop animation frames while the page is hidden,
         and each step counts at most 50 ms, so the game simply waits for the visitor to come back. */
      function start() {
        api.unlockSound();
        var g = ++gen;
        var st = freshGame();
        game = st;
        score = 0;
        message = INTRO;
        setRunning(true);
        render();
        api.status('Score 0');
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function frame(now) {
          if (gen !== g) return;
          step(st, now);
          drawFrame(st);
          raf = requestAnimationFrame(frame);
        });
      }

      /* Returns true when n is a new best. */
      function saveBest(n) {
        if (n <= best) return false;
        best = n;
        api.store.set('best', n);
        return true;
      }

      function end(st, text) {
        gen++;
        var newBest = saveBest(st.score);
        setRunning(false);
        message = text;
        render();
        api.status('Game over. Score ' + st.score + ', best ' + best);
        if (newBest) api.celebrate('New best: ' + st.score);
      }

      function stop() {
        gen++;
        cancelAnimationFrame(raf);
        game = null;
        setRunning(false);
        score = 0;
        message = INTRO;
        render();
        api.status('Press Start');
        drawFrame(freshGame());
      }

      function fire() {
        var st = game;
        if (!st || st.bolt) return;
        st.bolt = { x: st.playerX, y: PLAYER_Y - 6 };
        api.tone(740, 0.06, 'square', 0.08);
      }

      function stepMs(st) {
        return Math.max(70, 90 + 430 * (st.left / (ROWS * COLS)) - (st.wave - 1) * 25);
      }

      function starAt(st, i) {
        var r = Math.floor(i / COLS);
        var c = i % COLS;
        return { x: st.fleetX + c * COL_GAP, y: st.fleetY + r * ROW_GAP, r: r };
      }

      function respawnFleet(st) {
        st.alive = allAlive();
        st.left = ROWS * COLS;
        st.fleetX = (W - FLEET_W) / 2;
        st.fleetY = 64 + Math.min((st.wave - 1) * 14, 56);
        st.dir = 1;
        st.bombs = [];
        st.bolt = null;
      }

      function step(st, now) {
        var dt = st.last ? Math.min(50, now - st.last) : 16;
        st.last = now;
        var i, b;

        /* cannon follows drag target, keys nudge it */
        if (keys.left) st.targetX -= 0.4 * dt;
        if (keys.right) st.targetX += 0.4 * dt;
        st.targetX = Math.max(SIDE + CANNON_W / 2, Math.min(W - SIDE - CANNON_W / 2, st.targetX));
        st.playerX = st.targetX;

        if (now < st.pausedUntil) return;

        /* fleet marches */
        st.stepAcc += dt;
        if (st.stepAcc >= stepMs(st)) {
          st.stepAcc = 0;
          st.stepFlip = !st.stepFlip;
          api.tone(st.stepFlip ? 92 : 74, 0.045, 'square', 0.05);
          var minX = Infinity;
          var maxX = -Infinity;
          for (i = 0; i < ROWS * COLS; i++) {
            if (!st.alive[i]) continue;
            var x = starAt(st, i).x;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x + STAR_W);
          }
          if (
            (st.dir > 0 && maxX + 12 > W - SIDE) ||
            (st.dir < 0 && minX - 12 < SIDE)
          ) {
            st.dir = -st.dir;
            st.fleetY += 16;
          } else {
            st.fleetX += st.dir * 12;
          }
          /* the fleet lands: the line is broken */
          for (i = 0; i < ROWS * COLS; i++) {
            if (!st.alive[i]) continue;
            if (starAt(st, i).y + STAR_H >= PLAYER_Y) {
              api.tone(62, 0.55, 'sawtooth', 0.14);
              return end(st, 'the line is broken · ' + st.score + ' points · press start');
            }
          }
        }

        /* a bottom-most star drops a bomb now and then */
        st.bombAcc += dt;
        var bombEvery = Math.max(420, 1000 - (st.wave - 1) * 90);
        if (st.bombAcc >= bombEvery && st.bombs.length < 3) {
          st.bombAcc = 0;
          var bottoms = [];
          for (var c = 0; c < COLS; c++) {
            for (var r = ROWS - 1; r >= 0; r--) {
              if (st.alive[r * COLS + c]) {
                bottoms.push(r * COLS + c);
                break;
              }
            }
          }
          if (bottoms.length) {
            var from = starAt(st, bottoms[Math.floor(api.random() * bottoms.length)]);
            st.bombs.push({ x: from.x + STAR_W / 2, y: from.y + STAR_H });
          }
        }

        /* bolt */
        if (st.bolt) {
          st.bolt.y -= BOLT_SPEED;
          if (st.bolt.y < -12) st.bolt = null;
        }
        if (st.bolt) {
          for (i = 0; i < ROWS * COLS; i++) {
            if (!st.alive[i]) continue;
            var s = starAt(st, i);
            if (
              st.bolt.x >= s.x &&
              st.bolt.x <= s.x + STAR_W &&
              st.bolt.y >= s.y &&
              st.bolt.y <= s.y + STAR_H
            ) {
              st.alive[i] = false;
              st.left--;
              st.score += (ROWS - s.r) * 10;
              score = st.score;
              render();
              api.status('Score ' + st.score);
              api.tone(HIT_TONES[s.r], 0.07);
              st.bolt = null;
              if (st.left === 0) {
                st.wave++;
                api.tone(659, 0.35);
                respawnFleet(st);
                st.pausedUntil = now + 900;
                api.celebrate('Wave ' + (st.wave - 1) + ' cleared!');
              }
              break;
            }
          }
        }

        /* bombs fall */
        for (i = 0; i < st.bombs.length; i++) st.bombs[i].y += BOMB_SPEED;
        st.bombs = st.bombs.filter(function (bomb) { return bomb.y < H + 10; });
        var px = st.playerX - CANNON_W / 2;
        for (i = 0; i < st.bombs.length; i++) {
          b = st.bombs[i];
          if (b.y >= PLAYER_Y && b.y <= PLAYER_Y + CANNON_H && b.x >= px && b.x <= px + CANNON_W) {
            st.lives--;
            st.bombs = [];
            st.bolt = null;
            if (st.lives <= 0) {
              api.tone(62, 0.55, 'sawtooth', 0.14);
              return end(st, 'the line is broken · ' + st.score + ' points · press start');
            }
            api.tone(70, 0.4, 'sawtooth', 0.12);
            st.pausedUntil = now + 700;
            break;
          }
        }
      }

      function drawGlyph(c, rows, x, y, color) {
        c.fillStyle = color;
        for (var r = 0; r < rows.length; r++) {
          for (var col = 0; col < rows[r].length; col++) {
            if (rows[r][col] === 'X') c.fillRect(x + col * PX, y + r * PX, PX, PX);
          }
        }
      }

      function drawFrame(st) {
        if (!canvas) return;
        var c = canvas.getContext('2d');
        c.fillStyle = '#070a12';
        c.fillRect(0, 0, W, H);

        /* pinprick backdrop */
        c.fillStyle = 'rgba(242,231,212,0.14)';
        for (var p = 0; p < st.sky.length; p++) c.fillRect(st.sky[p].x, st.sky[p].y, 2, 2);

        /* hud */
        c.textAlign = 'left';
        c.fillStyle = 'rgba(242,231,212,0.85)';
        c.font = '700 26px ui-monospace, Menlo, monospace';
        c.fillText(String(st.score).padStart(4, '0'), SIDE, 40);
        c.textAlign = 'right';
        c.fillStyle = 'rgba(242,231,212,0.6)';
        c.font = '700 18px ui-monospace, Menlo, monospace';
        c.fillText('▲'.repeat(Math.max(0, st.lives)), W - SIDE, 38);

        /* the fleet */
        var glyph = st.stepFlip ? STAR_B : STAR_A;
        for (var i = 0; i < ROWS * COLS; i++) {
          if (!st.alive[i]) continue;
          var s = starAt(st, i);
          drawGlyph(c, glyph, s.x, s.y, ROW_COLORS[s.r]);
        }

        /* bolt and bombs */
        c.fillStyle = '#f2e7d4';
        if (st.bolt) c.fillRect(st.bolt.x - 2, st.bolt.y - 10, 4, 12);
        c.fillStyle = '#d4592a';
        for (var k = 0; k < st.bombs.length; k++) c.fillRect(st.bombs[k].x - 2, st.bombs[k].y, 4, 10);

        /* the cannon */
        drawGlyph(c, CANNON, st.playerX - CANNON_W / 2, PLAYER_Y, '#f2e7d4');
      }

      function onPointer(e) {
        var st = game;
        if (!st) return;
        var rect = canvas.getBoundingClientRect();
        st.targetX = ((e.clientX - rect.left) / rect.width) * W;
      }

      drawFrame(freshGame());
      render();
      api.status('Press Start');

      return {
        destroy: function () {
          gen++;
          cancelAnimationFrame(raf);
          setRunning(false);
        }
      };
    }
  });
})();
