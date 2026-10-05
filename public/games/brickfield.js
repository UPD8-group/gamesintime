/* Brickfield, ported from the 1973 floor of 1973.ai (src/components/Brickfield.jsx).
   Knock down a six-row spectrum wall with three balls. Higher rows score more; each row has its own tone.
   The cabinet, physics, speeds, scoring, tones and copy are the arcade's own. New here: your best score is
   remembered and shown in the site's status line. Contract: docs/ADDING-A-GAME.md */
(function () {
  'use strict';

  var W = 520;
  var H = 560;
  var ROWS = 6;
  var COLS = 10;
  var ROW_COLORS = ['#d4592a', '#e9a23b', '#e3cb6e', '#7fa05a', '#41798c', '#b03a5b'];
  var ROW_TONES = [523, 494, 440, 392, 349, 330];
  var WALL_TOP = 72;
  var BRICK_H = 20;
  var BRICK_GAP = 4;
  var SIDE = 14;
  var BRICK_W = (W - SIDE * 2 - BRICK_GAP * (COLS - 1)) / COLS;
  var PADDLE_W = 84;
  var PADDLE_H = 12;
  var PADDLE_Y = H - 34;
  var BALL = 9;
  var START_SPEED = 4.6;
  var SPEED_UP = 1.012;
  var MAX_SPEED = 8.8;
  var BALLS = 3;

  var NOTE = 'three balls · higher rows score more';

  /* Every rule the cabinet uses from the arcade's src/styles.css, values unchanged, each selector prefixed with
     .game-brickfield. The arcade's .btn, .btn-solid and .btn-outline are renamed .m-btn, .m-btn-solid and
     .m-btn-outline because Games in Time has its own global .btn. The first five rules carry over what the arcade
     set on body, button, :focus-visible, .sr-only and every element. */
  var CSS = [
    '.game-brickfield { font: 17px/1.65 var(--font-body); color: var(--ink); -webkit-font-smoothing: antialiased; }',
    '.game-brickfield *, .game-brickfield *::before, .game-brickfield *::after { box-sizing: border-box; }',
    '.game-brickfield button { font: inherit; cursor: pointer; }',
    '.game-brickfield :focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }',
    '.game-brickfield .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; clip-path: inset(50%); overflow: hidden; white-space: nowrap; }',
    '.game-brickfield .m-btn { display: inline-block; font-family: var(--font-mono); font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; border-radius: 8px; padding: 13px 24px; transition: filter 0.2s, background 0.2s, color 0.2s; }',
    '.game-brickfield .m-btn-solid { background: var(--amber); color: var(--ground); border: 1px solid var(--amber); }',
    '.game-brickfield .m-btn-solid:hover { filter: brightness(1.12); }',
    '.game-brickfield .m-btn-outline { background: transparent; color: var(--ink); border: 1px solid var(--line); }',
    '.game-brickfield .m-btn-outline:hover { border-color: var(--amber); color: var(--amber); }',
    '.game-brickfield .m-btn:disabled { opacity: 0.4; pointer-events: none; }',
    '.game-brickfield .machine-stage { display: flex; justify-content: center; }',
    '.game-brickfield .machine-note { font-family: var(--font-mono); font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; text-align: center; color: var(--ink-dim); margin: 22px auto 0; max-width: 60ch; }',
    '.game-brickfield .machine-controls { display: flex; justify-content: center; gap: 12px; margin-top: 18px; }',
    '.game-brickfield .scanlines { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: repeating-linear-gradient(rgba(0, 0, 0, 0.22) 0px, rgba(0, 0, 0, 0.22) 1px, transparent 1px, transparent 3px); z-index: 6; }',
    '.game-brickfield .bakelite-cabinet { width: 100%; max-width: 560px; border-radius: 22px; padding: 20px; background: linear-gradient(168deg, #2f2216, #1a120a 70%); border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 26px 60px rgba(0, 0, 0, 0.5); }',
    '.game-brickfield .bakelite-screen { position: relative; border-radius: 14px; overflow: hidden; box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.65); }',
    '.game-brickfield .brickfield-canvas { display: block; width: 100%; height: auto; touch-action: none; }',
    '/* Block page scrolling over the screen only while a game runs, so a finger can still scroll past an idle machine on a phone. */ .game-brickfield:not(.is-running) .brickfield-canvas { touch-action: auto; }'
  ].join('\n');

  GamesInTime.register({
    id: 'brickfield',
    frame: 'none',
    mount: function (root, api) {
      var h = api.h;

      /* The arcade's React state and refs, as plain variables. */
      var gen = 0; /* bumped to stop the running loop, exactly as the arcade does */
      var game = null;
      var running = false;
      var raf = 0;
      var best = Number(api.store.get('best', 0)) || 0;
      var shown = ''; /* the last line sent to the site's status, so screen readers do not hear repeats */

      /* ---------- the cabinet ---------- */
      root.appendChild(h('style', null, CSS));
      var canvas = h('canvas', {
        width: W,
        height: H,
        class: 'brickfield-canvas',
        role: 'img',
        'aria-label': 'Brickfield wall. Move your pointer across the screen to steer the paddle.'
      });
      var note = h('p', { class: 'machine-note', role: 'status' }, NOTE);
      var scoreEl = h('p', { class: 'sr-only', 'data-testid': 'brickfield-score' }, 'score 0');
      /* The play and stop symbols are hidden from screen readers, which read just Start, Restart and Stop. */
      var startBtn = h('button', { type: 'button', class: 'm-btn m-btn-solid', onclick: function () { start(); } },
        h('span', { 'aria-hidden': 'true' }, '▶'), ' Start');
      var stopBtn = h('button', { type: 'button', class: 'm-btn m-btn-outline', onclick: function () { stop(); }, disabled: true },
        h('span', { 'aria-hidden': 'true' }, '■'), ' Stop');

      root.appendChild(h('div', { class: 'machine-stage' },
        h('div', { class: 'bakelite-cabinet' },
          h('div', { class: 'bakelite-screen' },
            canvas,
            h('div', { class: 'scanlines', 'aria-hidden': 'true' })))));
      root.appendChild(note);
      root.appendChild(scoreEl);
      root.appendChild(h('div', { class: 'machine-controls' }, startBtn, stopBtn));

      /* Drawn at the arcade's own fixed 520 by 560 size and scaled to fit by CSS, exactly as on 1973.ai. */
      var ctx = canvas.getContext('2d');

      function setText(el, text) {
        if (el.textContent !== text) el.textContent = text;
      }
      function report(line) {
        if (line !== shown) { shown = line; api.status(line); }
      }
      function setRunning(v) {
        running = v;
        root.classList.toggle('is-running', !!v);
        if (running) setText(startBtn, 'Restart');
        else if (startBtn.textContent !== '▶ Start') startBtn.replaceChildren(h('span', { 'aria-hidden': 'true' }, '▶'), ' Start');
        stopBtn.disabled = !running;
      }
      function setScore(n) {
        setText(scoreEl, 'score ' + n);
        if (running) report('Score ' + n);
      }

      function freshGame() {
        return {
          bricks: Array.from({ length: ROWS * COLS }, function () { return true; }),
          left: ROWS * COLS,
          paddleX: W / 2,
          targetX: W / 2,
          ball: { x: W / 2, y: PADDLE_Y - 30, vx: 0, vy: 0 },
          score: 0,
          balls: BALLS,
          serveAt: 0
        };
      }

      function serve(st) {
        st.ball.x = st.paddleX;
        st.ball.y = PADDLE_Y - 26;
        var angle = -Math.PI / 2 + (api.random() * 0.5 - 0.25);
        st.ball.vx = Math.cos(angle) * START_SPEED;
        st.ball.vy = Math.sin(angle) * START_SPEED;
        st.serveAt = 0;
      }

      function start() {
        api.unlockSound();
        var g = ++gen;
        var st = freshGame();
        st.serveAt = performance.now() + 600;
        game = st;
        setText(note, NOTE);
        setRunning(true);
        setScore(0);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function frame(now) {
          if (gen !== g) return;
          step(st, now);
          drawFrame(st);
          if (gen === g) raf = requestAnimationFrame(frame);
        });
      }

      function end(st, text, cleared) {
        gen++;
        setRunning(false);
        setText(note, text);

        /* New on Games in Time: the best score is remembered, and a new best or a cleared field is celebrated. */
        var newBest = st.score > best;
        if (newBest) {
          best = st.score;
          api.store.set('best', best);
        }
        report((cleared ? 'Field cleared. Score ' : 'Game over. Score ') + st.score + ', best ' + best);
        if (cleared) api.celebrate('Field cleared! ' + st.score + ' points');
        else if (newBest) api.celebrate('New best! ' + st.score + ' points');
      }

      function stop() {
        gen++;
        cancelAnimationFrame(raf);
        game = null;
        setRunning(false);
        setScore(0);
        setText(note, NOTE);
        drawFrame(freshGame());
        report('Press Start');
      }

      function step(st, now) {
        st.paddleX = Math.max(PADDLE_W / 2 + 4, Math.min(W - PADDLE_W / 2 - 4, st.targetX));

        if (st.serveAt) {
          if (now >= st.serveAt) serve(st);
          return;
        }

        var b = st.ball;
        b.x += b.vx;
        b.y += b.vy;

        // side + top walls
        if (b.x <= BALL / 2 + 2) {
          b.x = BALL / 2 + 2;
          b.vx = Math.abs(b.vx);
          api.tone(220, 0.05);
        } else if (b.x >= W - BALL / 2 - 2) {
          b.x = W - BALL / 2 - 2;
          b.vx = -Math.abs(b.vx);
          api.tone(220, 0.05);
        }
        if (b.y <= BALL / 2 + 2) {
          b.y = BALL / 2 + 2;
          b.vy = Math.abs(b.vy);
          api.tone(220, 0.05);
        }

        // paddle
        if (
          b.vy > 0 &&
          b.y + BALL / 2 >= PADDLE_Y &&
          b.y + BALL / 2 <= PADDLE_Y + PADDLE_H + Math.abs(b.vy) &&
          Math.abs(b.x - st.paddleX) <= PADDLE_W / 2 + BALL / 2
        ) {
          var speed = Math.hypot(b.vx, b.vy);
          var rel = Math.max(-1, Math.min(1, (b.x - st.paddleX) / (PADDLE_W / 2)));
          var angle = -Math.PI / 2 + rel * (Math.PI / 3.2);
          b.vx = Math.cos(angle) * speed;
          b.vy = Math.sin(angle) * speed;
          b.y = PADDLE_Y - BALL / 2;
          api.tone(392, 0.06);
        }

        // bricks
        for (var r = 0; r < ROWS; r++) {
          for (var col = 0; col < COLS; col++) {
            var i = r * COLS + col;
            if (!st.bricks[i]) continue;
            var bx = SIDE + col * (BRICK_W + BRICK_GAP);
            var by = WALL_TOP + r * (BRICK_H + BRICK_GAP);
            if (
              b.x + BALL / 2 > bx &&
              b.x - BALL / 2 < bx + BRICK_W &&
              b.y + BALL / 2 > by &&
              b.y - BALL / 2 < by + BRICK_H
            ) {
              st.bricks[i] = false;
              st.left--;
              st.score += (ROWS - r) * 10;
              setScore(st.score);
              api.tone(ROW_TONES[r], 0.08);

              // bounce off the shallower axis of penetration
              var overlapX = Math.min(b.x + BALL / 2 - bx, bx + BRICK_W - (b.x - BALL / 2));
              var overlapY = Math.min(b.y + BALL / 2 - by, by + BRICK_H - (b.y - BALL / 2));
              if (overlapX < overlapY) b.vx = -b.vx;
              else b.vy = -b.vy;

              var sp = Math.min(MAX_SPEED, Math.hypot(b.vx, b.vy) * SPEED_UP);
              var scale = sp / Math.hypot(b.vx, b.vy);
              b.vx *= scale;
              b.vy *= scale;

              if (st.left === 0) {
                api.tone(659, 0.35);
                return end(st, 'field cleared · ' + st.score + ' points · press start to rebuild it', true);
              }
              return;
            }
          }
        }

        // lost ball
        if (b.y > H + BALL) {
          st.balls--;
          api.tone(82, 0.4, 'sawtooth', 0.13);
          if (st.balls === 0) {
            return end(st, 'out of balls · ' + st.score + ' points · press start');
          }
          st.serveAt = now + 800;
        }
      }

      function drawFrame(st) {
        var c = ctx;
        c.fillStyle = '#0d0a06';
        c.fillRect(0, 0, W, H);

        // score + remaining balls
        c.textAlign = 'left';
        c.fillStyle = 'rgba(242,231,212,0.85)';
        c.font = '700 26px ui-monospace, Menlo, monospace';
        c.fillText(String(st.score).padStart(4, '0'), SIDE, 42);
        c.textAlign = 'right';
        c.fillStyle = 'rgba(242,231,212,0.6)';
        c.fillText('●'.repeat(Math.max(0, st.balls)), W - SIDE, 42);

        // bricks
        for (var r = 0; r < ROWS; r++) {
          c.fillStyle = ROW_COLORS[r];
          for (var col = 0; col < COLS; col++) {
            if (!st.bricks[r * COLS + col]) continue;
            c.fillRect(
              SIDE + col * (BRICK_W + BRICK_GAP),
              WALL_TOP + r * (BRICK_H + BRICK_GAP),
              BRICK_W,
              BRICK_H
            );
          }
        }

        // paddle + ball
        c.fillStyle = '#f2e7d4';
        c.fillRect(st.paddleX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H);
        if (!st.serveAt) {
          c.fillRect(st.ball.x - BALL / 2, st.ball.y - BALL / 2, BALL, BALL);
        }
      }

      function onPointer(e) {
        var st = game;
        if (!st) return;
        var rect = canvas.getBoundingClientRect();
        st.targetX = ((e.clientX - rect.left) / rect.width) * W;
      }
      canvas.addEventListener('pointerdown', function (e) {
        api.unlockSound();
        onPointer(e);
      });
      canvas.addEventListener('pointermove', onPointer);

      drawFrame(freshGame());
      report('Press Start');

      return {
        destroy: function () {
          gen++;
          cancelAnimationFrame(raf);
          game = null;
        }
      };
    }
  });
})();
