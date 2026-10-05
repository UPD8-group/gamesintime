/* Television Tennis, ported from the original 1973 arcade source (UPD8-group/1973, src/components/TvTennis.jsx).
   Rally against the machine on a wood-grain television. Drag anywhere on the screen to move your paddle.
   First to seven. The court, physics, speeds, the machine's play, tones and copy are the arcade's own.
   Contract: docs/ADDING-A-GAME.md */
(function () {
  'use strict';

  var W = 640;
  var H = 440;
  var PADDLE_W = 10;
  var PADDLE_H = 72;
  var BALL = 10;
  var MARGIN = 26;
  var MACHINE_SPEED = 3.6;
  var WIN_SCORE = 7;
  var SERVE_SPEED = 5;

  var NOTE = 'first to seven · drag on the screen to move';

  /* Every rule the television uses from the arcade's src/styles.css, values unchanged, each selector prefixed with
     .game-television-tennis. The arcade's .btn, .btn-solid and .btn-outline are renamed .m-btn, .m-btn-solid and
     .m-btn-outline because Games in Time has its own global .btn. The first five rules carry over what the arcade
     set on body, button, :focus-visible, .sr-only and every element. */
  var CSS = [
    '.game-television-tennis { font: 17px/1.65 var(--font-body); color: var(--ink); -webkit-font-smoothing: antialiased; }',
    '.game-television-tennis *, .game-television-tennis *::before, .game-television-tennis *::after { box-sizing: border-box; }',
    '.game-television-tennis button { font: inherit; cursor: pointer; }',
    '.game-television-tennis :focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }',
    '.game-television-tennis .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; clip-path: inset(50%); overflow: hidden; white-space: nowrap; }',
    '.game-television-tennis .m-btn { display: inline-block; font-family: var(--font-mono); font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; border-radius: 8px; padding: 13px 24px; transition: filter 0.2s, background 0.2s, color 0.2s; }',
    '.game-television-tennis .m-btn-solid { background: var(--amber); color: var(--ground); border: 1px solid var(--amber); }',
    '.game-television-tennis .m-btn-solid:hover { filter: brightness(1.12); }',
    '.game-television-tennis .m-btn-outline { background: transparent; color: var(--ink); border: 1px solid var(--line); }',
    '.game-television-tennis .m-btn-outline:hover { border-color: var(--amber); color: var(--amber); }',
    '.game-television-tennis .m-btn:disabled { opacity: 0.4; pointer-events: none; }',
    '.game-television-tennis .machine-stage { display: flex; justify-content: center; }',
    '.game-television-tennis .machine-note { font-family: var(--font-mono); font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; text-align: center; color: var(--ink-dim); margin: 22px auto 0; max-width: 60ch; }',
    '.game-television-tennis .machine-controls { display: flex; justify-content: center; gap: 12px; margin-top: 18px; }',
    '.game-television-tennis .scanlines { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: repeating-linear-gradient(rgba(0, 0, 0, 0.22) 0px, rgba(0, 0, 0, 0.22) 1px, transparent 1px, transparent 3px); z-index: 6; }',
    '.game-television-tennis .tv-cabinet { width: 100%; border-radius: 22px; padding: 22px; border: 1px solid rgba(0, 0, 0, 0.6); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.09), 0 26px 60px rgba(0, 0, 0, 0.5); background: repeating-linear-gradient(113deg, rgba(0, 0, 0, 0.16) 0px, rgba(0, 0, 0, 0.16) 3px, rgba(255, 255, 255, 0.025) 3px, rgba(255, 255, 255, 0.025) 5px, transparent 5px, transparent 11px), linear-gradient(158deg, #5c3b1e, #40260f 55%, #2c1a09); }',
    '.game-television-tennis .tennis-cabinet { max-width: 720px; }',
    '.game-television-tennis .tv-screen { position: relative; border-radius: 18px; background: #080604; overflow: hidden; box-shadow: inset 0 0 0 3px rgba(0, 0, 0, 0.85), inset 0 0 50px rgba(0, 0, 0, 0.7); }',
    '.game-television-tennis .tennis-canvas { display: block; width: 100%; height: auto; touch-action: none; }',
    '/* Block page scrolling over the screen only while a game runs, so a finger can still scroll past an idle machine on a phone. */ .game-television-tennis:not(.is-running) .tennis-canvas { touch-action: auto; }',
    '@media (max-width: 720px) { .game-television-tennis .tv-cabinet { padding: 14px; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'television-tennis',
    frame: 'none',
    mount: function (root, api) {
      var h = api.h;

      /* The arcade's React state and refs, as plain variables. */
      var gen = 0; /* bumped to stop the running loop, exactly as the arcade does */
      var game = null;
      var running = false;
      var raf = 0;
      var shown = ''; /* the last line sent to the site's status, so screen readers do not hear repeats */

      /* ---------- the television ---------- */
      root.appendChild(h('style', null, CSS));
      var canvas = h('canvas', {
        width: W,
        height: H,
        class: 'tennis-canvas',
        role: 'img',
        'aria-label': 'Television tennis court. Drag anywhere on the screen to move your paddle.'
      });
      var note = h('p', { class: 'machine-note', role: 'status' }, NOTE);
      var scoreEl = h('p', { class: 'sr-only', 'data-testid': 'tennis-score' }, 'machine 0 · you 0');
      /* The play and stop symbols are hidden from screen readers, which read just Start, Restart and Stop. */
      var startBtn = h('button', { type: 'button', class: 'm-btn m-btn-solid', onclick: function () { start(); } },
        h('span', { 'aria-hidden': 'true' }, '▶'), ' Start');
      var stopBtn = h('button', { type: 'button', class: 'm-btn m-btn-outline', onclick: function () { stop(); }, disabled: true },
        h('span', { 'aria-hidden': 'true' }, '■'), ' Stop');

      root.appendChild(h('div', { class: 'machine-stage' },
        h('div', { class: 'tv-cabinet tennis-cabinet' },
          h('div', { class: 'tv-screen' },
            canvas,
            h('div', { class: 'scanlines', 'aria-hidden': 'true' })))));
      root.appendChild(note);
      root.appendChild(scoreEl);
      root.appendChild(h('div', { class: 'machine-controls' }, startBtn, stopBtn));

      /* Drawn at the arcade's own fixed 640 by 440 size and scaled to fit by CSS, exactly as in the original. */
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
      function setScore(machine, you) {
        setText(scoreEl, 'machine ' + machine + ' · you ' + you);
        if (running) report('You ' + you + ', machine ' + machine);
      }

      function freshGame() {
        return {
          leftY: H / 2,
          rightY: H / 2,
          targetY: H / 2,
          ball: { x: W / 2, y: H / 2, vx: 0, vy: 0 },
          machine: 0,
          you: 0,
          serveAt: 0,
          serveDir: api.random() < 0.5 ? -1 : 1
        };
      }

      function serve(g) {
        g.ball.x = W / 2;
        g.ball.y = H * (0.3 + api.random() * 0.4);
        var angle = (api.random() * 0.6 - 0.3) * Math.PI;
        g.ball.vx = Math.cos(angle) * SERVE_SPEED * g.serveDir;
        g.ball.vy = Math.sin(angle) * SERVE_SPEED;
        g.serveAt = 0;
      }

      function start() {
        api.unlockSound();
        var g = ++gen;
        var st = freshGame();
        st.serveAt = performance.now() + 700;
        game = st;
        setText(note, NOTE);
        setRunning(true);
        setScore(0, 0);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function frame(now) {
          if (gen !== g) return;
          step(st, now);
          drawFrame(st);
          if (gen === g) raf = requestAnimationFrame(frame);
        });
      }

      function stop() {
        gen++;
        cancelAnimationFrame(raf);
        game = null;
        setRunning(false);
        setScore(0, 0);
        setText(note, NOTE);
        drawFrame(freshGame());
        report('Press Start');
      }

      function endMatch(st) {
        gen++;
        setRunning(false);
        var won = st.you > st.machine;
        setText(note, won
          ? 'you win the channel · press start to defend it'
          : 'the machine takes it · press start for a rematch');
        if (won) {
          report('You win, ' + st.you + ' to ' + st.machine);
          api.celebrate('You win the channel, ' + st.you + ' to ' + st.machine);
        } else {
          report('The machine wins, ' + st.machine + ' to ' + st.you);
        }
      }

      function step(st, now) {
        // waiting to serve
        if (st.serveAt) {
          if (now >= st.serveAt) serve(st);
        } else {
          var b = st.ball;
          b.x += b.vx;
          b.y += b.vy;

          // walls
          if (b.y <= BALL / 2) {
            b.y = BALL / 2;
            b.vy = Math.abs(b.vy);
            api.tone(220, 0.06);
          } else if (b.y >= H - BALL / 2) {
            b.y = H - BALL / 2;
            b.vy = -Math.abs(b.vy);
            api.tone(220, 0.06);
          }

          // machine paddle (left)
          var lx = MARGIN + PADDLE_W;
          if (b.vx < 0 && b.x - BALL / 2 <= lx && b.x - BALL / 2 >= lx - Math.abs(b.vx) - 2) {
            if (Math.abs(b.y - st.leftY) <= PADDLE_H / 2 + BALL / 2) {
              deflect(b, st.leftY, 1);
              api.tone(330, 0.07);
            }
          }
          // your paddle (right)
          var rx = W - MARGIN - PADDLE_W;
          if (b.vx > 0 && b.x + BALL / 2 >= rx && b.x + BALL / 2 <= rx + Math.abs(b.vx) + 2) {
            if (Math.abs(b.y - st.rightY) <= PADDLE_H / 2 + BALL / 2) {
              deflect(b, st.rightY, -1);
              api.tone(392, 0.07);
            }
          }

          // points
          if (b.x < -BALL) {
            st.you++;
            api.tone(523, 0.22);
            setScore(st.machine, st.you);
            if (st.you >= WIN_SCORE) return endMatch(st);
            st.serveDir = -1;
            st.serveAt = now + 900;
          } else if (b.x > W + BALL) {
            st.machine++;
            api.tone(98, 0.3, 'sawtooth', 0.13);
            setScore(st.machine, st.you);
            if (st.machine >= WIN_SCORE) return endMatch(st);
            st.serveDir = 1;
            st.serveAt = now + 900;
          }
        }

        // machine tracks the ball with capped speed
        var want = st.serveAt ? H / 2 : st.ball.y;
        var dy = want - st.leftY;
        st.leftY += Math.max(-MACHINE_SPEED, Math.min(MACHINE_SPEED, dy));
        st.leftY = clampPaddle(st.leftY);

        // your paddle follows the drag target
        st.rightY = clampPaddle(st.targetY);
      }

      function deflect(b, paddleY, dir) {
        var speed = Math.hypot(b.vx, b.vy) * 1.04;
        var rel = Math.max(-1, Math.min(1, (b.y - paddleY) / (PADDLE_H / 2)));
        var angle = rel * (Math.PI / 3.4);
        b.vx = Math.cos(angle) * speed * dir;
        b.vy = Math.sin(angle) * speed;
      }

      function clampPaddle(y) {
        return Math.max(PADDLE_H / 2, Math.min(H - PADDLE_H / 2, y));
      }

      function drawFrame(st) {
        var c = ctx;
        c.fillStyle = '#0a0a08';
        c.fillRect(0, 0, W, H);

        // centre net
        c.strokeStyle = 'rgba(242,231,212,0.35)';
        c.lineWidth = 3;
        c.setLineDash([10, 14]);
        c.beginPath();
        c.moveTo(W / 2, 8);
        c.lineTo(W / 2, H - 8);
        c.stroke();
        c.setLineDash([]);

        // labels + scores
        c.textAlign = 'center';
        c.fillStyle = 'rgba(242,231,212,0.4)';
        c.font = '600 13px ui-monospace, Menlo, monospace';
        c.fillText('MACHINE', W * 0.28, 40);
        c.fillText('YOU', W * 0.72, 40);
        c.fillStyle = 'rgba(242,231,212,0.85)';
        c.font = '700 52px ui-monospace, Menlo, monospace';
        c.fillText(String(st.machine), W * 0.28, 92);
        c.fillText(String(st.you), W * 0.72, 92);

        // paddles + ball
        c.fillStyle = '#f2e7d4';
        c.fillRect(MARGIN, st.leftY - PADDLE_H / 2, PADDLE_W, PADDLE_H);
        c.fillRect(W - MARGIN - PADDLE_W, st.rightY - PADDLE_H / 2, PADDLE_W, PADDLE_H);
        if (!st.serveAt) {
          c.fillRect(st.ball.x - BALL / 2, st.ball.y - BALL / 2, BALL, BALL);
        }
      }

      function onPointer(e) {
        var st = game;
        if (!st) return;
        var rect = canvas.getBoundingClientRect();
        st.targetY = ((e.clientY - rect.top) / rect.height) * H;
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
