/* Drifter: the vector rock-shooter from the original 1983 neon arcade (UPD8-group/1973).
   Thrust, turn and wrap around the edges; shoot the drifting rocks, which split as they break. Three ships.
   Ported from the arcade's Drifter.jsx (React) to plain JavaScript. The canvas drawing, physics, speeds, timings,
   scoring, tones, controls and copy are the arcade's own. The neon cabinet is the frame, so it registers with
   frame: 'none'. See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  var W = 520;
  var H = 560;
  var SHIP_R = 12;
  var TURN = 0.075;
  var THRUST = 0.13;
  var FRICTION = 0.99;
  var MAX_SPEED = 6;
  var BULLET_SPEED = 7;
  var BULLET_LIFE = 46;
  var MAX_BULLETS = 4;
  var LIVES = 3;
  var SIZES = { 3: 34, 2: 20, 1: 12 };
  var SCORE = { 3: 20, 2: 50, 1: 100 };
  var HIT_TONE = { 3: 196, 2: 294, 1: 392 };
  /* The arcade's em-dashes are middle dots here; the no-break space keeps a dot from starting a line. */
  var CAPTION = 'thrust, turn, and shoot the drift\u00a0· three ships';

  function wrap(v, max) { return v < 0 ? v + max : v >= max ? v - max : v; }

  /* The arcade's CSS for this machine, copied from the original arcade's styles.css and scoped to .game-drifter. The 1980s hall
     supplies the 1983 neon values of --ground, --ink, --ink-dim, --amber, --line, --font-body and --font-mono.
     The arcade's .btn, .btn-solid and .btn-outline are renamed m-btn, m-btn-solid and m-btn-outline because the site
     has its own .btn. */
  var CSS = [
    /* the arcade's body type and focus ring, which these controls inherit there */
    '.game-drifter { font: 17px/1.65 var(--font-body); -webkit-font-smoothing: antialiased; }',
    '.game-drifter :focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }',
    '.game-drifter .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; clip-path: inset(50%); overflow: hidden; white-space: nowrap; }',
    '.game-drifter .m-btn { display: inline-block; font-family: var(--font-mono); font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; border-radius: 8px; padding: 13px 24px; transition: filter 0.2s, background 0.2s, color 0.2s; }',
    '.game-drifter .m-btn-solid { background: var(--amber); color: var(--ground); border: 1px solid var(--amber); }',
    '.game-drifter .m-btn-solid:hover { filter: brightness(1.12); }',
    '.game-drifter .m-btn-outline { background: transparent; color: var(--ink); border: 1px solid var(--line); }',
    '.game-drifter .m-btn-outline:hover { border-color: var(--amber); color: var(--amber); }',
    '.game-drifter .m-btn:disabled { opacity: 0.4; pointer-events: none; }',
    '.game-drifter .machine-stage { display: flex; justify-content: center; }',
    '.game-drifter .machine-note { font-family: var(--font-mono); font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; text-align: center; color: var(--ink-dim); margin: 22px auto 0; max-width: 60ch; }',
    '.game-drifter .machine-controls { display: flex; justify-content: center; gap: 12px; margin-top: 18px; }',
    '.game-drifter .neon-cabinet { width: 100%; max-width: 560px; border-radius: 20px; padding: 18px; background: linear-gradient(165deg, #1b1140, #0d0722 76%); border: 1px solid rgba(255, 46, 151, 0.35); box-shadow: 0 0 0 1px rgba(5, 217, 232, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 26px 60px rgba(0, 0, 0, 0.55); }',
    '.game-drifter .neon-screen { position: relative; border-radius: 12px; overflow: hidden; box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.7); }',
    '.game-drifter .neon-canvas { display: block; width: 100%; height: auto; touch-action: none; }',
    '/* Block page scrolling over the screen only while a game runs, so a finger can still scroll past an idle machine on a phone. */ .game-drifter:not(.is-running) .neon-canvas { touch-action: auto; }',
    '.game-drifter .neon-scan { position: absolute; inset: 0; pointer-events: none; border-radius: inherit; background: repeating-linear-gradient(rgba(0, 0, 0, 0.18) 0px, rgba(0, 0, 0, 0.18) 1px, transparent 1px, transparent 3px); }',
    '.game-drifter .neon-btn { font-family: var(--font-mono); font-size: 15px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #f7f0ff; background: rgba(255, 46, 151, 0.1); border: 1px solid rgba(5, 217, 232, 0.5); border-radius: 10px; min-height: 48px; padding: 10px 6px; touch-action: manipulation; transition: background 0.12s, box-shadow 0.12s; }',
    '.game-drifter .neon-btn:active { background: rgba(5, 217, 232, 0.25); box-shadow: 0 0 14px rgba(5, 217, 232, 0.5); }',
    '.game-drifter .neon-btn-fire { color: #ff2e97; border-color: rgba(255, 46, 151, 0.7); }',
    '.game-drifter .neon-btn-fire:active { background: rgba(255, 46, 151, 0.25); box-shadow: 0 0 14px rgba(255, 46, 151, 0.5); }',
    '.game-drifter .drifter-pad { display: flex; gap: 10px; max-width: 380px; margin: 14px auto 0; }',
    '.game-drifter .drifter-pad .neon-btn { flex: 1; }',
    '.game-drifter .drifter-pad .neon-btn-fire { flex: 1.4; }'
  ].join('\n');

  GamesInTime.register({
    id: 'drifter',
    frame: 'none',
    mount: function (root, api) {
      var h = api.h;
      var random = api.random;
      var gen = 0;            /* bumping this stops the animation loop that is running */
      var game = null;        /* the game in play */
      var keys = { left: false, right: false, thrust: false };
      var running = false;
      var score = 0;
      var best = readBest();
      var raf = 0;

      function readBest() { return Number(api.store.get('best', 0)) || 0; }

      /* ---------- the machine ---------- */
      root.appendChild(h('style', null, CSS));
      var canvas = h('canvas', {
        width: W, height: H, class: 'neon-canvas', role: 'img',
        'aria-label': 'Drifter. A ship among drifting rocks. Turn, thrust, and fire with the controls below or the arrow keys and space.'
      });
      /* hold-to-repeat touch controls */
      function hold(k, v) { return function () { api.unlockSound(); keys[k] = v; }; }
      function holdButton(label, glyph, k) {
        return h('button', {
          type: 'button', class: 'neon-btn', 'aria-label': label,
          onpointerdown: hold(k, true), onpointerup: hold(k, false), onpointerleave: hold(k, false), onpointercancel: hold(k, false)
        }, glyph);
      }
      var fireBtn = h('button', {
        type: 'button', class: 'neon-btn neon-btn-fire', 'aria-label': 'Fire',
        onpointerdown: function (e) { e.preventDefault(); api.unlockSound(); fire(); }
      }, '● fire');
      var note = h('p', { class: 'machine-note', role: 'status' }, CAPTION);
      var scoreLine = h('p', { class: 'sr-only', 'data-testid': 'drifter-score' });
      var startBtn = h('button', { type: 'button', class: 'm-btn m-btn-solid', onclick: start }, '▶ Start');
      var stopBtn = h('button', { type: 'button', class: 'm-btn m-btn-outline', onclick: stop, disabled: true }, '■ Stop');

      root.appendChild(h('div', { class: 'machine-stage' },
        h('div', { class: 'neon-cabinet drifter-cabinet' },
          h('div', { class: 'neon-screen' }, canvas, h('div', { class: 'neon-scan', 'aria-hidden': 'true' })),
          h('div', { class: 'drifter-pad', role: 'group', 'aria-label': 'Ship controls' },
            holdButton('Rotate left', '⟲', 'left'),
            holdButton('Thrust', '▲', 'thrust'),
            holdButton('Rotate right', '⟳', 'right'),
            fireBtn))));
      root.appendChild(note);
      root.appendChild(scoreLine);
      root.appendChild(h('div', { class: 'machine-controls' }, startBtn, stopBtn));

      /* ---------- what the React version kept in state ---------- */
      function renderScore() { scoreLine.textContent = 'score ' + score + ' · best ' + best; }
      function setScore(n) { score = n; renderScore(); }
      function setMessage(text) { note.textContent = text; }
      /* the site's status line follows the canvas readout while a game is on */
      function report(st) {
        if (running && st === game) api.status('Score ' + st.score + ', ships ' + Math.max(0, st.lives));
      }
      /* the keyboard is live only while a game runs, as in the arcade */
      function setRunning(v) {
        if (v === running) return;
        running = v;
        root.classList.toggle('is-running', !!v);
        startBtn.textContent = v ? 'Restart' : '▶ Start';
        stopBtn.disabled = !v;
        if (v) {
          window.addEventListener('keydown', down);
          window.addEventListener('keyup', up);
        } else {
          window.removeEventListener('keydown', down);
          window.removeEventListener('keyup', up);
          keys = { left: false, right: false, thrust: false };
        }
      }

      function down(e) {
        var k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; e.preventDefault(); }
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; e.preventDefault(); }
        else if (k === 'ArrowUp' || k === 'w' || k === 'W') { keys.thrust = true; e.preventDefault(); }
        else if (k === ' ') { fire(); e.preventDefault(); }
      }
      function up(e) {
        var k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
        else if (k === 'ArrowUp' || k === 'w' || k === 'W') keys.thrust = false;
      }

      /* ---------- the game ---------- */
      function makeRock(x, y, size) {
        var r = SIZES[size];
        var n = 9 + Math.floor(random() * 4);
        var verts = [];
        for (var i = 0; i < n; i++) {
          var a = (i / n) * Math.PI * 2;
          var jitter = 0.65 + random() * 0.5;
          verts.push({ a: a, r: r * jitter });
        }
        var speed = (4 - size) * 0.5 + random() * 0.6;
        var dir = random() * Math.PI * 2;
        return {
          x: x,
          y: y,
          vx: Math.cos(dir) * speed,
          vy: Math.sin(dir) * speed,
          size: size,
          radius: r,
          verts: verts,
          spin: (random() - 0.5) * 0.04,
          rot: random() * Math.PI * 2
        };
      }

      function freshGame() {
        var stars = [];
        for (var i = 0; i < 60; i++) {
          stars.push({ x: random() * W, y: random() * H, r: random() < 0.2 ? 1.6 : 1 });
        }
        var st = {
          ship: { x: W / 2, y: H / 2, angle: -Math.PI / 2, vx: 0, vy: 0 },
          bullets: [],
          rocks: [],
          score: 0,
          lives: LIVES,
          wave: 1,
          invuln: 0,
          stars: stars
        };
        spawnWave(st);
        return st;
      }

      function spawnWave(st) {
        var count = 3 + st.wave;
        for (var i = 0; i < count; i++) {
          /* keep new rocks away from the ship */
          var x, y;
          do {
            x = random() * W;
            y = random() * H;
          } while (Math.hypot(x - st.ship.x, y - st.ship.y) < 120);
          st.rocks.push(makeRock(x, y, 3));
        }
      }

      function fire() {
        var st = game;
        if (!st || st.bullets.length >= MAX_BULLETS) return;
        var s = st.ship;
        st.bullets.push({
          x: s.x + Math.cos(s.angle) * (SHIP_R + 4),
          y: s.y + Math.sin(s.angle) * (SHIP_R + 4),
          vx: Math.cos(s.angle) * BULLET_SPEED + s.vx,
          vy: Math.sin(s.angle) * BULLET_SPEED + s.vy,
          life: BULLET_LIFE
        });
        api.tone(660, 0.05, 'square', 0.06);
      }

      function start() {
        api.unlockSound();
        var g = ++gen;
        var st = freshGame();
        game = st;
        setScore(0);
        setMessage(CAPTION);
        setRunning(true);
        report(st);
        raf = requestAnimationFrame(function frame() {
          if (gen !== g) return;
          step(st);
          drawFrame(st);
          raf = requestAnimationFrame(frame);
        });
      }

      function stop() {
        gen++;
        cancelAnimationFrame(raf);
        game = null;
        setRunning(false);
        setScore(0);
        setMessage(CAPTION);
        drawFrame(freshGame());
        api.status('Press Start');
      }

      function saveBest(n) {
        if (n <= best) return false;
        best = n;
        api.store.set('best', n);
        renderScore();
        return true;
      }

      function end(st) {
        gen++;
        var newBest = saveBest(st.score);
        setRunning(false);
        setMessage('adrift\u00a0· ' + st.score + ' points\u00a0· press start');
        api.status('Game over. Score ' + st.score + ', best ' + best);
        if (newBest) api.celebrate('New best score: ' + st.score);
      }

      function loseLife(st) {
        st.lives--;
        api.tone(70, 0.4, 'sawtooth', 0.13);
        if (st.lives <= 0) return end(st);
        st.ship = { x: W / 2, y: H / 2, angle: -Math.PI / 2, vx: 0, vy: 0 };
        st.invuln = 120;
        report(st);
      }

      function step(st) {
        var s = st.ship;
        if (keys.left) s.angle -= TURN;
        if (keys.right) s.angle += TURN;
        if (keys.thrust) {
          s.vx += Math.cos(s.angle) * THRUST;
          s.vy += Math.sin(s.angle) * THRUST;
          if (random() < 0.5) api.tone(120, 0.03, 'sawtooth', 0.03);
        }
        var sp = Math.hypot(s.vx, s.vy);
        if (sp > MAX_SPEED) {
          s.vx = (s.vx / sp) * MAX_SPEED;
          s.vy = (s.vy / sp) * MAX_SPEED;
        }
        s.vx *= FRICTION;
        s.vy *= FRICTION;
        s.x = wrap(s.x + s.vx, W);
        s.y = wrap(s.y + s.vy, H);
        if (st.invuln > 0) st.invuln--;

        st.bullets.forEach(function (b) {
          b.x = wrap(b.x + b.vx, W);
          b.y = wrap(b.y + b.vy, H);
          b.life--;
        });
        st.bullets = st.bullets.filter(function (b) { return b.life > 0; });

        st.rocks.forEach(function (r) {
          r.x = wrap(r.x + r.vx, W);
          r.y = wrap(r.y + r.vy, H);
          r.rot += r.spin;
        });

        /* bullet hits rock */
        for (var ri = st.rocks.length - 1; ri >= 0; ri--) {
          var r = st.rocks[ri];
          for (var bi = st.bullets.length - 1; bi >= 0; bi--) {
            var b = st.bullets[bi];
            if (Math.hypot(b.x - r.x, b.y - r.y) <= r.radius) {
              st.bullets.splice(bi, 1);
              st.rocks.splice(ri, 1);
              st.score += SCORE[r.size];
              setScore(st.score);
              report(st);
              api.tone(HIT_TONE[r.size], 0.08);
              if (r.size > 1) {
                st.rocks.push(makeRock(r.x, r.y, r.size - 1), makeRock(r.x, r.y, r.size - 1));
              }
              break;
            }
          }
        }

        /* rock hits ship */
        if (st.invuln === 0) {
          for (var i = 0; i < st.rocks.length; i++) {
            var rock = st.rocks[i];
            if (Math.hypot(s.x - rock.x, s.y - rock.y) <= rock.radius + SHIP_R) {
              loseLife(st);
              break;
            }
          }
        }

        if (st.rocks.length === 0) {
          st.wave++;
          api.tone(523, 0.25);
          spawnWave(st);
        }
      }

      function drawFrame(st) {
        var c = canvas.getContext('2d');
        c.fillStyle = '#080316';
        c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(247,240,255,0.5)';
        st.stars.forEach(function (p) { c.fillRect(p.x, p.y, p.r, p.r); });

        /* hud */
        c.textAlign = 'left';
        c.fillStyle = '#05d9e8';
        c.font = '700 24px ui-monospace, Menlo, monospace';
        c.fillText(String(st.score).padStart(5, '0'), 16, 38);
        c.textAlign = 'right';
        c.fillStyle = '#ff2e97';
        c.font = '700 18px ui-monospace, Menlo, monospace';
        c.fillText('▲'.repeat(Math.max(0, st.lives)), W - 16, 36);

        c.lineWidth = 2;
        c.lineJoin = 'round';

        /* rocks */
        c.strokeStyle = '#05d9e8';
        c.shadowColor = '#05d9e8';
        c.shadowBlur = 8;
        st.rocks.forEach(function (r) {
          c.beginPath();
          r.verts.forEach(function (v, i) {
            var px = r.x + Math.cos(v.a + r.rot) * v.r;
            var py = r.y + Math.sin(v.a + r.rot) * v.r;
            if (i) c.lineTo(px, py); else c.moveTo(px, py);
          });
          c.closePath();
          c.stroke();
        });

        /* bullets */
        c.fillStyle = '#fee440';
        c.shadowColor = '#fee440';
        st.bullets.forEach(function (b) {
          c.beginPath();
          c.arc(b.x, b.y, 2.4, 0, Math.PI * 2);
          c.fill();
        });

        /* ship (blinks while invulnerable) */
        if (!(st.invuln > 0 && Math.floor(st.invuln / 6) % 2)) {
          var s = st.ship;
          c.strokeStyle = '#ff2e97';
          c.shadowColor = '#ff2e97';
          c.beginPath();
          var nose = { x: s.x + Math.cos(s.angle) * (SHIP_R + 4), y: s.y + Math.sin(s.angle) * (SHIP_R + 4) };
          var l = { x: s.x + Math.cos(s.angle + 2.5) * SHIP_R, y: s.y + Math.sin(s.angle + 2.5) * SHIP_R };
          var r = { x: s.x + Math.cos(s.angle - 2.5) * SHIP_R, y: s.y + Math.sin(s.angle - 2.5) * SHIP_R };
          c.moveTo(nose.x, nose.y);
          c.lineTo(l.x, l.y);
          c.lineTo(s.x - Math.cos(s.angle) * SHIP_R * 0.5, s.y - Math.sin(s.angle) * SHIP_R * 0.5);
          c.lineTo(r.x, r.y);
          c.closePath();
          c.stroke();
        }
        c.shadowBlur = 0;
      }

      renderScore();
      drawFrame(freshGame());
      api.status('Press Start');

      return {
        destroy: function () {
          gen++;
          cancelAnimationFrame(raf);
          window.removeEventListener('keydown', down);
          window.removeEventListener('keyup', up);
          keys = { left: false, right: false, thrust: false };
          running = false;
          game = null;
        }
      };
    }
  });
})();
