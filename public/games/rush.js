/* Rush: the lane-crossing dash from the 1983 neon floor of 1973.ai.
   Cross five lanes of traffic and a river of drifting logs to reach the top. Every crossing speeds the floor up.
   Ported from the arcade's Rush.jsx (React) to plain JavaScript. The canvas drawing, lanes, speeds, timings,
   scoring, tones, controls and copy are the arcade's own. The neon cabinet is the frame, so it registers with
   frame: 'none'. See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  var CELL = 40;
  var COLS = 13;
  var ROWS = 14;
  var W = COLS * CELL; /* 520 */
  var H = ROWS * CELL; /* 560 */
  var LIVES = 3;

  /* row 0 home · 1-5 river · 6 safe · 7-11 road · 12 safe · 13 start */
  var RIVER_ROWS = [1, 2, 3, 4, 5];
  var ROAD_ROWS = [7, 8, 9, 10, 11];
  var CAR_COLORS = ['#ff2e97', '#fee440', '#05ffa1', '#ff5f6d', '#05d9e8'];
  var LOG_COLOR = '#7a5cff';
  /* The arcade's em-dashes are middle dots here; the no-break space keeps a dot from starting a line. */
  var CAPTION = 'reach the top\u00a0· mind the traffic and ride the logs';
  var KEYS = {
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

  /* The arcade's CSS for this machine, copied from 1973.ai's styles.css and scoped to .game-rush. The 1980s hall
     supplies the 1983 neon values of --ground, --ink, --ink-dim, --amber, --line, --font-body and --font-mono.
     The arcade's .btn, .btn-solid and .btn-outline are renamed m-btn, m-btn-solid and m-btn-outline because the site
     has its own .btn. */
  var CSS = [
    /* the arcade's body type and focus ring, which these controls inherit there */
    '.game-rush { font: 17px/1.65 var(--font-body); -webkit-font-smoothing: antialiased; }',
    '.game-rush :focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }',
    '.game-rush .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; clip-path: inset(50%); overflow: hidden; white-space: nowrap; }',
    '.game-rush .m-btn { display: inline-block; font-family: var(--font-mono); font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; border-radius: 8px; padding: 13px 24px; transition: filter 0.2s, background 0.2s, color 0.2s; }',
    '.game-rush .m-btn-solid { background: var(--amber); color: var(--ground); border: 1px solid var(--amber); }',
    '.game-rush .m-btn-solid:hover { filter: brightness(1.12); }',
    '.game-rush .m-btn-outline { background: transparent; color: var(--ink); border: 1px solid var(--line); }',
    '.game-rush .m-btn-outline:hover { border-color: var(--amber); color: var(--amber); }',
    '.game-rush .m-btn:disabled { opacity: 0.4; pointer-events: none; }',
    '.game-rush .machine-stage { display: flex; justify-content: center; }',
    '.game-rush .machine-note { font-family: var(--font-mono); font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; text-align: center; color: var(--ink-dim); margin: 22px auto 0; max-width: 60ch; }',
    '.game-rush .machine-controls { display: flex; justify-content: center; gap: 12px; margin-top: 18px; }',
    '.game-rush .neon-cabinet { width: 100%; max-width: 560px; border-radius: 20px; padding: 18px; background: linear-gradient(165deg, #1b1140, #0d0722 76%); border: 1px solid rgba(255, 46, 151, 0.35); box-shadow: 0 0 0 1px rgba(5, 217, 232, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 26px 60px rgba(0, 0, 0, 0.55); }',
    '.game-rush .neon-screen { position: relative; border-radius: 12px; overflow: hidden; box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.7); }',
    '.game-rush .neon-canvas { display: block; width: 100%; height: auto; touch-action: none; }',
    '.game-rush .neon-scan { position: absolute; inset: 0; pointer-events: none; border-radius: inherit; background: repeating-linear-gradient(rgba(0, 0, 0, 0.18) 0px, rgba(0, 0, 0, 0.18) 1px, transparent 1px, transparent 3px); }',
    '.game-rush .neon-btn { font-family: var(--font-mono); font-size: 15px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #f7f0ff; background: rgba(255, 46, 151, 0.1); border: 1px solid rgba(5, 217, 232, 0.5); border-radius: 10px; min-height: 48px; padding: 10px 6px; touch-action: manipulation; transition: background 0.12s, box-shadow 0.12s; }',
    '.game-rush .neon-btn:active { background: rgba(5, 217, 232, 0.25); box-shadow: 0 0 14px rgba(5, 217, 232, 0.5); }',
    '.game-rush .rush-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 240px; margin: 14px auto 0; }'
  ].join('\n');

  function roundRect(c, x, y, w, h, r, fill) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
    if (fill) c.fill();
  }

  GamesInTime.register({
    id: 'rush',
    frame: 'none',
    mount: function (root, api) {
      var h = api.h;
      var random = api.random;
      var gen = 0;            /* bumping this stops the animation loop that is running */
      var game = null;        /* the game in play */
      var running = false;
      var score = 0;
      var best = readBest();
      var raf = 0;

      function readBest() { return Number(api.store.get('best', 0)) || 0; }

      /* ---------- the machine ---------- */
      root.appendChild(h('style', null, CSS));
      var canvas = h('canvas', {
        width: W, height: H, class: 'neon-canvas', role: 'img',
        'aria-label': 'Rush. Cross the lanes of traffic and the river. Hop with the pad below or the arrow keys.',
        onpointerdown: function (e) {
          e.preventDefault();
          api.unlockSound();
          hop('up');
        }
      });
      function tap(dir) { return function (e) { e.preventDefault(); hop(dir); }; }
      function padButton(label, glyph, dir) {
        return h('button', { type: 'button', class: 'neon-btn', 'aria-label': label, onpointerdown: tap(dir) }, glyph);
      }
      var note = h('p', { class: 'machine-note', role: 'status' }, CAPTION);
      var scoreLine = h('p', { class: 'sr-only', 'data-testid': 'rush-score' });
      var startBtn = h('button', { type: 'button', class: 'm-btn m-btn-solid', onclick: start }, '▶ Start');
      var stopBtn = h('button', { type: 'button', class: 'm-btn m-btn-outline', onclick: stop, disabled: true }, '■ Stop');

      root.appendChild(h('div', { class: 'machine-stage' },
        h('div', { class: 'neon-cabinet rush-cabinet' },
          h('div', { class: 'neon-screen' }, canvas, h('div', { class: 'neon-scan', 'aria-hidden': 'true' })),
          h('div', { class: 'rush-pad', role: 'group', 'aria-label': 'Direction pad' },
            h('span'),
            padButton('Hop up', '▲', 'up'),
            h('span'),
            padButton('Hop left', '◀', 'left'),
            padButton('Hop down', '▼', 'down'),
            padButton('Hop right', '▶', 'right')))));
      root.appendChild(note);
      root.appendChild(scoreLine);
      root.appendChild(h('div', { class: 'machine-controls' }, startBtn, stopBtn));

      /* ---------- what the React version kept in state ---------- */
      function renderScore() { scoreLine.textContent = 'score ' + score + ' · best ' + best; }
      function setScore(n) { score = n; renderScore(); }
      function setMessage(text) { note.textContent = text; }
      /* the site's status line follows the canvas readout while a game is on */
      function report(st) {
        if (running && st === game) api.status('Score ' + st.score + ', lives ' + Math.max(0, st.lives));
      }
      /* the keyboard is live only while a game runs, as in the arcade */
      function setRunning(v) {
        if (v === running) return;
        running = v;
        startBtn.textContent = v ? 'Restart' : '▶ Start';
        stopBtn.disabled = !v;
        if (v) window.addEventListener('keydown', onKey);
        else window.removeEventListener('keydown', onKey);
      }

      function onKey(e) {
        var dir = Object.prototype.hasOwnProperty.call(KEYS, e.key) ? KEYS[e.key] : null;
        if (!dir) return;
        e.preventDefault();
        hop(dir);
      }

      /* ---------- the game ---------- */
      function makeLane(row, type, index) {
        var dir = index % 2 === 0 ? 1 : -1;
        var len = type === 'river' ? (2 + (index % 2)) * CELL : (index % 2 ? 2 : 1.6) * CELL;
        var count = type === 'river' ? 3 : 2 + (index % 2);
        var speed = (type === 'river' ? 0.7 : 0.9) + index * 0.18;
        var spacing = (W + len) / count;
        var entities = [];
        for (var i = 0; i < count; i++) {
          entities.push({ x: i * spacing + random() * 40 });
        }
        return {
          row: row,
          type: type,
          dir: dir,
          len: len,
          speed: speed,
          entities: entities,
          color: type === 'river' ? LOG_COLOR : CAR_COLORS[(row + index) % CAR_COLORS.length]
        };
      }

      function freshGame() {
        var lanes = [];
        RIVER_ROWS.forEach(function (row, i) { lanes.push(makeLane(row, 'river', i)); });
        ROAD_ROWS.forEach(function (row, i) { lanes.push(makeLane(row, 'road', i)); });
        return {
          lanes: lanes,
          player: { x: W / 2, row: ROWS - 1 },
          score: 0,
          lives: LIVES,
          boost: 1,
          dead: false
        };
      }

      function laneAt(st, row) {
        return st.lanes.filter(function (l) { return l.row === row; })[0];
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
        setMessage('clipped\u00a0· ' + st.score + ' across\u00a0· press start');
        api.status('Game over. Score ' + st.score + ', best ' + best);
        if (newBest) api.celebrate('New best: ' + st.score + ' across');
      }

      function die(st) {
        st.lives--;
        api.tone(70, 0.4, 'sawtooth', 0.13);
        if (st.lives <= 0) return end(st);
        st.player = { x: W / 2, row: ROWS - 1 };
        report(st);
      }

      function hop(dir) {
        var st = game;
        if (!st || st.dead) return;
        api.unlockSound();
        var p = st.player;
        if (dir === 'left') p.x = Math.max(CELL / 2, p.x - CELL);
        else if (dir === 'right') p.x = Math.min(W - CELL / 2, p.x + CELL);
        else if (dir === 'up') p.row = Math.max(0, p.row - 1);
        else if (dir === 'down') p.row = Math.min(ROWS - 1, p.row + 1);
        api.tone(dir === 'up' ? 523 : 392, 0.05);

        if (p.row === 0) {
          st.score++;
          setScore(st.score);
          st.boost = 1 + st.score * 0.06;
          api.tone(659, 0.2);
          st.player = { x: W / 2, row: ROWS - 1 };
          report(st);
        }
      }

      function step(st) {
        st.lanes.forEach(function (lane) {
          var v = lane.dir * lane.speed * st.boost;
          lane.entities.forEach(function (e) {
            e.x += v;
            if (lane.dir > 0 && e.x > W) e.x = -lane.len;
            else if (lane.dir < 0 && e.x < -lane.len) e.x = W;
          });
        });

        var p = st.player;
        var lane = laneAt(st, p.row);
        if (lane) {
          var i, e;
          if (lane.type === 'road') {
            for (i = 0; i < lane.entities.length; i++) {
              e = lane.entities[i];
              if (p.x + 14 > e.x && p.x - 14 < e.x + lane.len) return die(st);
            }
          } else {
            /* river: must ride a log */
            var onLog = false;
            for (i = 0; i < lane.entities.length; i++) {
              e = lane.entities[i];
              if (p.x > e.x && p.x < e.x + lane.len) {
                onLog = true;
                p.x += lane.dir * lane.speed * st.boost;
                break;
              }
            }
            if (!onLog || p.x < CELL / 2 || p.x > W - CELL / 2) return die(st);
          }
        }
      }

      function drawFrame(st) {
        var c = canvas.getContext('2d');

        /* row backgrounds */
        for (var row = 0; row < ROWS; row++) {
          var y = row * CELL;
          if (row === 0) {
            var grad = c.createLinearGradient(0, y, W, y);
            grad.addColorStop(0, '#ff2e97');
            grad.addColorStop(1, '#05d9e8');
            c.fillStyle = grad;
          } else if (RIVER_ROWS.indexOf(row) >= 0) c.fillStyle = '#071a2e';
          else if (ROAD_ROWS.indexOf(row) >= 0) c.fillStyle = '#0a0a14';
          else c.fillStyle = '#122036';
          c.fillRect(0, y, W, CELL);
          if (ROAD_ROWS.indexOf(row) >= 0) {
            c.strokeStyle = 'rgba(247,240,255,0.18)';
            c.lineWidth = 2;
            c.setLineDash([12, 12]);
            c.beginPath();
            c.moveTo(0, y + CELL / 2);
            c.lineTo(W, y + CELL / 2);
            c.stroke();
            c.setLineDash([]);
          }
        }

        /* entities */
        st.lanes.forEach(function (lane) {
          var ly = lane.row * CELL;
          c.shadowBlur = 10;
          if (lane.type === 'river') {
            c.fillStyle = LOG_COLOR;
            c.shadowColor = LOG_COLOR;
            lane.entities.forEach(function (e) { roundRect(c, e.x, ly + 8, lane.len, CELL - 16, 8, true); });
          } else {
            c.fillStyle = lane.color;
            c.shadowColor = lane.color;
            lane.entities.forEach(function (e) { roundRect(c, e.x, ly + 7, lane.len, CELL - 14, 6, true); });
          }
        });
        c.shadowBlur = 0;

        /* player */
        var p = st.player;
        var cx = p.x;
        var cy = p.row * CELL + CELL / 2;
        c.fillStyle = '#05ffa1';
        c.shadowColor = '#05ffa1';
        c.shadowBlur = 14;
        c.beginPath();
        c.moveTo(cx, cy - 13);
        c.lineTo(cx + 13, cy);
        c.lineTo(cx, cy + 13);
        c.lineTo(cx - 13, cy);
        c.closePath();
        c.fill();
        c.shadowBlur = 0;

        /* hud */
        c.textAlign = 'left';
        c.fillStyle = '#0a0616';
        c.font = '700 18px ui-monospace, Menlo, monospace';
        c.fillText('ACROSS ' + String(st.score).padStart(2, '0'), 12, 26);
        c.textAlign = 'right';
        c.fillText('◆'.repeat(Math.max(0, st.lives)), W - 12, 26);
      }

      renderScore();
      drawFrame(freshGame());
      api.status('Press Start');

      return {
        destroy: function () {
          gen++;
          cancelAnimationFrame(raf);
          window.removeEventListener('keydown', onKey);
          running = false;
          game = null;
        }
      };
    }
  });
})();
