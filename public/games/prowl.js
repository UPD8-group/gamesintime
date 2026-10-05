/* Prowl: the maze hunt from the 1983 neon floor of 1973.ai, ported as it is.
   Clear a glowing maze of dots while three sentries hunt you. Power dots turn the tables for a while.
   The maze, the sentries' rules, speeds, timings, tones, scoring and drawing are the original's, function for
   function; only React state became plain variables. The neon cabinet is the frame (frame: 'none').
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  const CELL = 24;
  const COLS = 15;
  const ROWS = 15;
  const W = COLS * CELL; // 360
  const H = ROWS * CELL; // 360
  const TUNNEL_ROW = 7;
  const LIVES = 3;
  const FRIGHT_FRAMES = 420;
  const PLAYER_SPEED = 2;
  const HUNTER_SPEED = 1.5;
  const FRIGHT_SPEED = 1;
  const HUNTER_STARTS = [
    { r: 7, c: 6 },
    { r: 7, c: 7 },
    { r: 7, c: 8 },
  ];
  const PLAYER_START = { r: 13, c: 7 };
  const POWER_CELLS = [
    { r: 1, c: 1 },
    { r: 1, c: 13 },
    { r: 13, c: 1 },
    { r: 13, c: 13 },
  ];
  const HUNTER_COLORS = ['#05d9e8', '#05ffa1', '#ff5f6d'];
  const DIRS = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];
  const KEY_DIRS = {
    ArrowUp: 0, ArrowDown: 1, ArrowLeft: 2, ArrowRight: 3,
    w: 0, s: 1, a: 2, d: 3, W: 0, S: 1, A: 2, D: 3,
  };
  /* The caption under the cabinet. The original's em-dashes are middle dots here, as everywhere on Games in Time. */
  const NOTE = 'clear the maze · power dots turn the sentries';

  const key = (r, c) => `${r},${c}`;
  const center = (i) => i * CELL + CELL / 2;

  function buildWalls() {
    const wall = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const border = r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1;
        row.push(border || (r % 2 === 0 && c % 2 === 0));
      }
      wall.push(row);
    }
    // central chamber
    wall[6][6] = wall[6][8] = wall[8][6] = wall[8][8] = false;
    // side tunnel
    wall[TUNNEL_ROW][0] = wall[TUNNEL_ROW][COLS - 1] = false;
    return wall;
  }

  /* Every rule the cabinet uses, copied from 1973.ai's styles.css and scoped to this game. The 1980s hall supplies
     the neon values of the shared variables (--amber is hot magenta there, --teal cyan, --olive mint).
     The site has its own .btn, so the arcade's btn, btn-solid and btn-outline are m-btn, m-btn-solid and
     m-btn-outline here. The first line is the arcade's body type, which its buttons inherit. */
  const CSS = `
.game-prowl { font: 17px/1.65 var(--font-body); color: var(--ink); -webkit-font-smoothing: antialiased; }
.game-prowl button { font: inherit; cursor: pointer; }
.game-prowl :focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
.game-prowl .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; clip-path: inset(50%); overflow: hidden; white-space: nowrap; }
.game-prowl .m-btn { display: inline-block; font-family: var(--font-mono); font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; border-radius: 8px; padding: 13px 24px; transition: filter 0.2s, background 0.2s, color 0.2s; }
.game-prowl .m-btn-solid { background: var(--amber); color: var(--ground); border: 1px solid var(--amber); }
.game-prowl .m-btn-solid:hover { filter: brightness(1.12); }
.game-prowl .m-btn-outline { background: transparent; color: var(--ink); border: 1px solid var(--line); }
.game-prowl .m-btn-outline:hover { border-color: var(--amber); color: var(--amber); }
.game-prowl .m-btn:disabled { opacity: 0.4; pointer-events: none; }
.game-prowl .machine-stage { display: flex; justify-content: center; }
.game-prowl .machine-note { font-family: var(--font-mono); font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; text-align: center; color: var(--ink-dim); margin: 22px auto 0; max-width: 60ch; }
.game-prowl .machine-controls { display: flex; justify-content: center; gap: 12px; margin-top: 18px; }
.game-prowl .neon-cabinet { width: 100%; max-width: 560px; border-radius: 20px; padding: 18px; background: linear-gradient(165deg, #1b1140, #0d0722 76%); border: 1px solid rgba(255, 46, 151, 0.35); box-shadow: 0 0 0 1px rgba(5, 217, 232, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 26px 60px rgba(0, 0, 0, 0.55); }
.game-prowl .prowl-cabinet { max-width: 420px; }
.game-prowl .neon-screen { position: relative; border-radius: 12px; overflow: hidden; box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.7); }
.game-prowl .neon-canvas { display: block; width: 100%; height: auto; touch-action: none; }
.game-prowl .neon-cabinet:not(.is-running) .neon-canvas { touch-action: auto; }
.game-prowl .neon-scan { position: absolute; inset: 0; pointer-events: none; border-radius: inherit; background: repeating-linear-gradient(rgba(0, 0, 0, 0.18) 0px, rgba(0, 0, 0, 0.18) 1px, transparent 1px, transparent 3px); }
.game-prowl .neon-btn { font-family: var(--font-mono); font-size: 15px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #f7f0ff; background: rgba(255, 46, 151, 0.1); border: 1px solid rgba(5, 217, 232, 0.5); border-radius: 10px; min-height: 48px; padding: 10px 6px; touch-action: manipulation; transition: background 0.12s, box-shadow 0.12s; }
.game-prowl .neon-btn:active { background: rgba(5, 217, 232, 0.25); box-shadow: 0 0 14px rgba(5, 217, 232, 0.5); }
.game-prowl .prowl-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 240px; margin: 14px auto 0; }
`;

  GamesInTime.register({
    id: 'prowl',
    frame: 'none',
    mount: function (root, api) {
      const h = api.h;
      root.appendChild(h('style', null, CSS));

      const canvas = h('canvas', {
        width: W,
        height: H,
        class: 'neon-canvas',
        role: 'img',
        'aria-label': 'Prowl. A glowing maze. Steer with the pad below or the arrow keys; eat the dots and avoid the sentries.',
      });
      const tap = (i) => (e) => {
        e.preventDefault();
        api.unlockSound();
        setWant(DIRS[i]);
      };
      const padButton = (label, i, glyph) =>
        h('button', { type: 'button', class: 'neon-btn', 'aria-label': label, onpointerdown: tap(i) }, glyph);
      const cabinet = h('div', { class: 'neon-cabinet prowl-cabinet' },
        h('div', { class: 'neon-screen prowl-screen' },
          canvas,
          h('div', { class: 'neon-scan', 'aria-hidden': 'true' })),
        h('div', { class: 'prowl-pad', role: 'group', 'aria-label': 'Direction pad' },
          h('span'),
          padButton('Up', 0, '▲'),
          h('span'),
          padButton('Left', 2, '◀'),
          padButton('Down', 1, '▼'),
          padButton('Right', 3, '▶')));
      const note = h('p', { class: 'machine-note', role: 'status' }, NOTE);
      const readout = h('p', { class: 'sr-only', 'data-testid': 'prowl-score' });
      const startBtn = h('button', { type: 'button', class: 'm-btn m-btn-solid', onclick: start });
      const stopBtn = h('button', { type: 'button', class: 'm-btn m-btn-outline', onclick: stop, disabled: true },
        h('span', { 'aria-hidden': 'true' }, '■'), ' Stop');
      root.appendChild(h('div', { class: 'machine-stage' }, cabinet));
      root.appendChild(note);
      root.appendChild(readout);
      root.appendChild(h('div', { class: 'machine-controls' }, startBtn, stopBtn));

      /* The original's refs and React state, as plain variables. gen cancels a running loop: Start, Stop, game over
         and destroy all bump it, and a frame from an older generation does nothing. */
      let gen = 0;
      let game = null;
      let raf = 0;
      let running = false;
      let score = 0;
      let best = Number(api.store.get('best', 0)) || 0;

      function setScore(n) {
        score = n;
        readout.textContent = `score ${score} · best ${best}`;
        if (running && game) api.status(`Score ${score}, level ${game.level}`);
      }
      function setBest(n) {
        best = n;
        readout.textContent = `score ${score} · best ${best}`;
      }
      function setMessage(text) {
        note.textContent = text;
      }
      function setRunning(v) {
        running = v;
        if (v) startBtn.replaceChildren('Restart');
        else startBtn.replaceChildren(h('span', { 'aria-hidden': 'true' }, '▶'), ' Start');
        stopBtn.disabled = !v;
        cabinet.classList.toggle('is-running', v);
        // the arrow keys and WASD belong to the game only while it runs, as in the original
        if (v) window.addEventListener('keydown', onKey);
        else window.removeEventListener('keydown', onKey);
      }

      function onKey(e) {
        const i = KEY_DIRS[e.key];
        if (i === undefined) return;
        e.preventDefault();
        setWant(DIRS[i]);
      }

      function buildMazeCanvas(wall) {
        const mc = document.createElement('canvas');
        mc.width = W;
        mc.height = H;
        const c = mc.getContext('2d');
        c.fillStyle = '#0a0616';
        c.fillRect(0, 0, W, H);
        c.strokeStyle = '#7a5cff';
        c.lineWidth = 2;
        c.shadowColor = '#7a5cff';
        c.shadowBlur = 6;
        c.fillStyle = '#160c36';
        for (let r = 0; r < ROWS; r++) {
          for (let col = 0; col < COLS; col++) {
            if (!wall[r][col]) continue;
            const x = col * CELL + 3;
            const y = r * CELL + 3;
            c.beginPath();
            c.roundRect(x, y, CELL - 6, CELL - 6, 5);
            c.fill();
            c.stroke();
          }
        }
        c.shadowBlur = 0;
        return mc;
      }

      function freshGame() {
        const wall = buildWalls();
        const pellets = new Set();
        const power = new Set(POWER_CELLS.map((p) => key(p.r, p.c)));
        const exclude = new Set([
          key(PLAYER_START.r, PLAYER_START.c),
          ...HUNTER_STARTS.map((hs) => key(hs.r, hs.c)),
          ...power,
        ]);
        for (let r = 1; r < ROWS - 1; r++) {
          for (let c = 1; c < COLS - 1; c++) {
            if (wall[r][c]) continue;
            if (exclude.has(key(r, c))) continue;
            pellets.add(key(r, c));
          }
        }
        return {
          wall,
          mazeCanvas: buildMazeCanvas(wall),
          pellets,
          power,
          player: { x: center(PLAYER_START.c), y: center(PLAYER_START.r), dir: null, want: null },
          hunters: HUNTER_STARTS.map((hs, i) => ({
            x: center(hs.c),
            y: center(hs.r),
            dir: DIRS[0],
            mode: 'chase',
            color: HUNTER_COLORS[i],
          })),
          score: 0,
          lives: LIVES,
          level: 1,
          fright: 0,
          pause: 40,
          pulse: 0,
        };
      }

      function wallAt(st, r, c) {
        if (r === TUNNEL_ROW && (c < 0 || c >= COLS)) return false;
        if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return true;
        return st.wall[r][c];
      }

      function setWant(dir) {
        const st = game;
        if (st) st.player.want = dir;
      }

      function start() {
        api.unlockSound();
        const g = ++gen;
        const st = freshGame();
        game = st;
        cancelAnimationFrame(raf);
        setScore(0);
        setMessage(NOTE);
        setRunning(true);
        api.status('Score 0, level 1');
        raf = requestAnimationFrame(function frame() {
          if (gen !== g) return;
          step(st);
          drawFrame(st);
          if (gen === g) raf = requestAnimationFrame(frame);
        });
      }

      function stop() {
        gen++;
        cancelAnimationFrame(raf);
        game = null;
        setRunning(false);
        setScore(0);
        setMessage(NOTE);
        drawFrame(freshGame());
        api.status('Press Start');
      }

      function saveBest(n) {
        if (n <= best) return false;
        api.store.set('best', n);
        setBest(n);
        return true;
      }

      function end(st, text) {
        gen++;
        const isNewBest = saveBest(st.score);
        setRunning(false);
        setMessage(text);
        api.status(`Game over. Score ${st.score}, best ${best}`);
        if (isNewBest) api.celebrate(`New best score: ${st.score}`);
      }

      function resetPositions(st) {
        st.player = { x: center(PLAYER_START.c), y: center(PLAYER_START.r), dir: null, want: null };
        st.hunters.forEach((hu, i) => {
          hu.x = center(HUNTER_STARTS[i].c);
          hu.y = center(HUNTER_STARTS[i].r);
          hu.dir = DIRS[0];
          hu.mode = 'chase';
        });
        st.fright = 0;
        st.pause = 40;
      }

      function moveEntity(st, ent, speed, decide) {
        const c = Math.round((ent.x - CELL / 2) / CELL);
        const r = Math.round((ent.y - CELL / 2) / CELL);
        const cx = center(c);
        const cy = center(r);
        if (Math.abs(ent.x - cx) < speed && Math.abs(ent.y - cy) < speed) {
          ent.x = cx;
          ent.y = cy;
          decide(ent, r, c);
        }
        if (ent.dir) {
          ent.x += ent.dir.dx * speed;
          ent.y += ent.dir.dy * speed;
          if (r === TUNNEL_ROW) {
            if (ent.x < -CELL / 2) ent.x = W + CELL / 2;
            else if (ent.x > W + CELL / 2) ent.x = -CELL / 2;
          }
        }
      }

      function step(st) {
        st.pulse++;
        if (st.pause > 0) {
          st.pause--;
          return;
        }
        if (st.fright > 0) {
          st.fright--;
          if (st.fright === 0) st.hunters.forEach((hu) => (hu.mode = 'chase'));
        }

        // player
        moveEntity(st, st.player, PLAYER_SPEED, (ent, r, c) => {
          if (ent.want && !wallAt(st, r + ent.want.dy, c + ent.want.dx)) ent.dir = ent.want;
          if (ent.dir && wallAt(st, r + ent.dir.dy, c + ent.dir.dx)) ent.dir = null;
          const k = key(r, c);
          if (st.pellets.has(k)) {
            st.pellets.delete(k);
            st.score += 10;
            setScore(st.score);
            api.tone(660 + (st.pulse % 6) * 40, 0.03, 'square', 0.05);
          }
          if (st.power.has(k)) {
            st.power.delete(k);
            st.score += 50;
            setScore(st.score);
            st.fright = FRIGHT_FRAMES;
            st.hunters.forEach((hu) => (hu.mode = 'fright'));
            api.tone(196, 0.2, 'square', 0.08);
          }
        });

        // hunters: at each crossing a sentry takes the opening that lands nearest you, and never turns back
        for (const hu of st.hunters) {
          const speed = hu.mode === 'fright' ? FRIGHT_SPEED : HUNTER_SPEED;
          moveEntity(st, hu, speed, (ent, r, c) => {
            const opts = DIRS.filter(
              (d) =>
                !wallAt(st, r + d.dy, c + d.dx) &&
                !(ent.dir && d.dx === -ent.dir.dx && d.dy === -ent.dir.dy),
            );
            const choices = opts.length ? opts : DIRS.filter((d) => !wallAt(st, r + d.dy, c + d.dx));
            if (!choices.length) return;
            if (ent.mode === 'fright') {
              ent.dir = choices[Math.floor(pseudo(st) * choices.length)];
            } else {
              let bestDir = choices[0];
              let bestD = Infinity;
              for (const d of choices) {
                const nx = center(c + d.dx);
                const ny = center(r + d.dy);
                const dist = (nx - st.player.x) ** 2 + (ny - st.player.y) ** 2;
                if (dist < bestD) {
                  bestD = dist;
                  bestDir = d;
                }
              }
              ent.dir = bestDir;
            }
          });
        }

        // collisions
        for (const hu of st.hunters) {
          if (Math.hypot(hu.x - st.player.x, hu.y - st.player.y) < CELL * 0.7) {
            if (hu.mode === 'fright') {
              hu.mode = 'chase';
              const home = HUNTER_STARTS[st.hunters.indexOf(hu)];
              hu.x = center(home.c);
              hu.y = center(home.r);
              hu.dir = DIRS[0];
              st.score += 200;
              setScore(st.score);
              api.tone(880, 0.12);
            } else {
              st.lives--;
              api.tone(70, 0.45, 'sawtooth', 0.14);
              if (st.lives <= 0) return end(st, `caught · ${st.score} points · press start`);
              resetPositions(st);
              return;
            }
          }
        }

        if (st.pellets.size === 0 && st.power.size === 0) {
          st.level++;
          api.tone(659, 0.35);
          const fresh = freshGame();
          st.pellets = fresh.pellets;
          st.power = fresh.power;
          resetPositions(st);
          setMessage(`level ${st.level} · the sentries are quicker now`);
          api.status(`Score ${st.score}, level ${st.level}`);
          api.celebrate(`Maze cleared! On to level ${st.level}`);
        }
      }

      // deterministic-ish wander that still varies per hunter/frame
      function pseudo(st) {
        st.seed = ((st.seed || 1) * 1103515245 + 12345) & 0x7fffffff;
        return st.seed / 0x7fffffff;
      }

      function drawFrame(st) {
        const c = canvas.getContext('2d');
        c.fillStyle = '#0a0616';
        c.fillRect(0, 0, W, H);
        if (st.mazeCanvas) c.drawImage(st.mazeCanvas, 0, 0);

        // pellets
        c.fillStyle = '#fee440';
        c.shadowColor = '#fee440';
        c.shadowBlur = 5;
        for (const k of st.pellets) {
          const [r, col] = k.split(',').map(Number);
          c.beginPath();
          c.arc(center(col), center(r), 2.2, 0, Math.PI * 2);
          c.fill();
        }
        // power dots
        const pr = 4 + Math.sin(st.pulse * 0.2) * 1.5;
        c.fillStyle = '#05ffa1';
        c.shadowColor = '#05ffa1';
        c.shadowBlur = 10;
        for (const k of st.power) {
          const [r, col] = k.split(',').map(Number);
          c.beginPath();
          c.arc(center(col), center(r), pr, 0, Math.PI * 2);
          c.fill();
        }

        // player orb
        c.fillStyle = '#ff2e97';
        c.shadowColor = '#ff2e97';
        c.shadowBlur = 14;
        c.beginPath();
        c.arc(st.player.x, st.player.y, CELL * 0.38, 0, Math.PI * 2);
        c.fill();

        // hunters: abstract neon sentries (diamond with an inner slit)
        for (const hu of st.hunters) {
          const frightened = hu.mode === 'fright';
          const flash = frightened && st.fright < 120 && Math.floor(st.fright / 12) % 2;
          const col = frightened ? (flash ? '#f7f0ff' : '#3a5cff') : hu.color;
          c.fillStyle = col;
          c.shadowColor = col;
          c.shadowBlur = 12;
          const s = CELL * 0.4;
          c.beginPath();
          c.moveTo(hu.x, hu.y - s);
          c.lineTo(hu.x + s, hu.y);
          c.lineTo(hu.x, hu.y + s);
          c.lineTo(hu.x - s, hu.y);
          c.closePath();
          c.fill();
          c.fillStyle = '#0a0616';
          c.shadowBlur = 0;
          c.fillRect(hu.x - s * 0.5, hu.y - 1.5, s, 3);
        }
        c.shadowBlur = 0;

        // hud
        c.textAlign = 'left';
        c.fillStyle = '#05d9e8';
        c.font = '700 15px ui-monospace, Menlo, monospace';
        c.fillText(String(st.score).padStart(5, '0'), 8, H - 8);
        c.textAlign = 'right';
        c.fillStyle = '#ff2e97';
        c.fillText('◆'.repeat(Math.max(0, st.lives)), W - 8, H - 8);
      }

      // first paint: the idle maze, as on 1973.ai before Start is pressed
      setRunning(false);
      setScore(0);
      drawFrame(freshGame());
      api.status('Press Start');

      return {
        destroy: function () {
          gen++;
          cancelAnimationFrame(raf);
          window.removeEventListener('keydown', onKey);
          game = null;
        },
      };
    },
  });
})();
