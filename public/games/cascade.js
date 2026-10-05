/* Cascade: the falling-blocks well from the original 1983 neon arcade (UPD8-group/1973), ported as it is.
   Fit the falling blocks into the well; full rows clear and the drop quickens as you go.
   The seven pieces, their colours, the rotation and wall kicks, the drop speeds, tones, scoring and drawing are the
   original's, function for function; only React state became plain variables. The neon cabinet is the frame
   (frame: 'none'). See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  const COLS = 10;
  const ROWS = 18;
  const CELL = 24;
  const W = COLS * CELL; // 240
  const H = ROWS * CELL; // 432

  // original neon colour mapping for the seven shapes
  const COLORS = {
    I: '#05d9e8',
    O: '#fee440',
    T: '#ff2e97',
    S: '#05ffa1',
    Z: '#ff5f6d',
    J: '#7a5cff',
    L: '#ff7a2c',
  };

  // [col,row] cells per rotation, within a 4-wide box
  const SHAPES = {
    I: [
      [[0, 1], [1, 1], [2, 1], [3, 1]],
      [[2, 0], [2, 1], [2, 2], [2, 3]],
    ],
    O: [[[1, 0], [2, 0], [1, 1], [2, 1]]],
    T: [
      [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [1, 2]],
      [[1, 0], [0, 1], [1, 1], [1, 2]],
    ],
    S: [
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]],
    ],
    Z: [
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[2, 0], [1, 1], [2, 1], [1, 2]],
    ],
    J: [
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [0, 2], [1, 2]],
    ],
    L: [
      [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1], [1, 2]],
    ],
  };
  const TYPES = Object.keys(SHAPES);
  /* The caption under the cabinet. The original's em-dashes are middle dots here, as everywhere on Games in Time. */
  const NOTE = 'fit the falling blocks · full rows clear';

  /* Every rule the cabinet uses, copied from the original arcade's styles.css and scoped to this game. The 1980s hall supplies
     the neon values of the shared variables (--amber is hot magenta there, --teal cyan, --olive mint).
     The site has its own .btn, so the arcade's btn, btn-solid and btn-outline are m-btn, m-btn-solid and
     m-btn-outline here. The first line is the arcade's body type, which its buttons inherit. */
  const CSS = `
.game-cascade { font: 17px/1.65 var(--font-body); color: var(--ink); -webkit-font-smoothing: antialiased; }
.game-cascade button { font: inherit; cursor: pointer; }
.game-cascade :focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
.game-cascade .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; clip-path: inset(50%); overflow: hidden; white-space: nowrap; }
.game-cascade .m-btn { display: inline-block; font-family: var(--font-mono); font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; border-radius: 8px; padding: 13px 24px; transition: filter 0.2s, background 0.2s, color 0.2s; }
.game-cascade .m-btn-solid { background: var(--amber); color: var(--ground); border: 1px solid var(--amber); }
.game-cascade .m-btn-solid:hover { filter: brightness(1.12); }
.game-cascade .m-btn-outline { background: transparent; color: var(--ink); border: 1px solid var(--line); }
.game-cascade .m-btn-outline:hover { border-color: var(--amber); color: var(--amber); }
.game-cascade .m-btn:disabled { opacity: 0.4; pointer-events: none; }
.game-cascade .machine-stage { display: flex; justify-content: center; }
.game-cascade .machine-note { font-family: var(--font-mono); font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; text-align: center; color: var(--ink-dim); margin: 22px auto 0; max-width: 60ch; }
.game-cascade .machine-controls { display: flex; justify-content: center; gap: 12px; margin-top: 18px; }
.game-cascade .neon-cabinet { width: 100%; max-width: 560px; border-radius: 20px; padding: 18px; background: linear-gradient(165deg, #1b1140, #0d0722 76%); border: 1px solid rgba(255, 46, 151, 0.35); box-shadow: 0 0 0 1px rgba(5, 217, 232, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 26px 60px rgba(0, 0, 0, 0.55); }
.game-cascade .cascade-cabinet { max-width: 340px; }
.game-cascade .neon-screen { position: relative; border-radius: 12px; overflow: hidden; box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.7); }
.game-cascade .neon-canvas { display: block; width: 100%; height: auto; touch-action: none; }
.game-cascade .neon-cabinet:not(.is-running) .neon-canvas { touch-action: auto; }
.game-cascade .neon-scan { position: absolute; inset: 0; pointer-events: none; border-radius: inherit; background: repeating-linear-gradient(rgba(0, 0, 0, 0.18) 0px, rgba(0, 0, 0, 0.18) 1px, transparent 1px, transparent 3px); }
.game-cascade .neon-btn { font-family: var(--font-mono); font-size: 15px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #f7f0ff; background: rgba(255, 46, 151, 0.1); border: 1px solid rgba(5, 217, 232, 0.5); border-radius: 10px; min-height: 48px; padding: 10px 6px; touch-action: manipulation; transition: background 0.12s, box-shadow 0.12s; }
.game-cascade .neon-btn:active { background: rgba(5, 217, 232, 0.25); box-shadow: 0 0 14px rgba(5, 217, 232, 0.5); }
.game-cascade .neon-btn-fire { color: #ff2e97; border-color: rgba(255, 46, 151, 0.7); }
.game-cascade .neon-btn-fire:active { background: rgba(255, 46, 151, 0.25); box-shadow: 0 0 14px rgba(255, 46, 151, 0.5); }
.game-cascade .cascade-pad { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 300px; margin: 14px auto 0; }
.game-cascade .cascade-pad .neon-btn { flex: 1 1 18%; }
.game-cascade .cascade-pad .neon-btn-fire { flex-basis: 100%; }
`;

  GamesInTime.register({
    id: 'cascade',
    frame: 'none',
    mount: function (root, api) {
      const h = api.h;
      root.appendChild(h('style', null, CSS));

      const canvas = h('canvas', {
        width: W,
        height: H,
        class: 'neon-canvas',
        role: 'img',
        'aria-label': 'Cascade. Falling blocks. Move and rotate with the buttons below or the arrow keys; space to drop.',
      });
      const press = (action) => (e) => {
        e.preventDefault();
        api.unlockSound();
        action();
      };
      const cabinet = h('div', { class: 'neon-cabinet cascade-cabinet' },
        h('div', { class: 'neon-screen cascade-screen' },
          canvas,
          h('div', { class: 'neon-scan', 'aria-hidden': 'true' })),
        h('div', { class: 'cascade-pad', role: 'group', 'aria-label': 'Piece controls' },
          h('button', { type: 'button', class: 'neon-btn', 'aria-label': 'Move left', onpointerdown: press(() => move(-1)) }, '◀'),
          h('button', { type: 'button', class: 'neon-btn', 'aria-label': 'Rotate', onpointerdown: press(() => rotate()) }, '⟳'),
          h('button', { type: 'button', class: 'neon-btn', 'aria-label': 'Move right', onpointerdown: press(() => move(1)) }, '▶'),
          h('button', { type: 'button', class: 'neon-btn', 'aria-label': 'Soft drop', onpointerdown: press(() => soft()) }, '▼'),
          h('button', { type: 'button', class: 'neon-btn neon-btn-fire', 'aria-label': 'Hard drop', onpointerdown: press(() => hard()) }, '⤓ drop')));
      const note = h('p', { class: 'machine-note', role: 'status' }, NOTE);
      const readout = h('p', { class: 'sr-only', 'data-testid': 'cascade-score' });
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
      let lines = 0;
      let best = Number(api.store.get('best', 0)) || 0;

      function showReadout() {
        readout.textContent = `score ${score} · lines ${lines} · best ${best}`;
      }
      function setScore(n) {
        score = n;
        showReadout();
        if (running && game) api.status(`Score ${score}, level ${game.level}`);
      }
      function setLines(n) {
        lines = n;
        showReadout();
      }
      function setBest(n) {
        best = n;
        showReadout();
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
        // the arrow keys, WASD and space belong to the game only while it runs, as in the original
        if (v) window.addEventListener('keydown', onKey);
        else window.removeEventListener('keydown', onKey);
      }

      function onKey(e) {
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') { move(-1); e.preventDefault(); }
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') { move(1); e.preventDefault(); }
        else if (k === 'ArrowUp' || k === 'w' || k === 'W') { rotate(); e.preventDefault(); }
        else if (k === 'ArrowDown' || k === 's' || k === 'S') { soft(); e.preventDefault(); }
        else if (k === ' ') { hard(); e.preventDefault(); }
      }

      function bag() {
        const b = [...TYPES];
        for (let i = b.length - 1; i > 0; i--) {
          const j = Math.floor(api.random() * (i + 1));
          [b[i], b[j]] = [b[j], b[i]];
        }
        return b;
      }

      function freshGame() {
        const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        const st = {
          board,
          queue: bag(),
          piece: null,
          score: 0,
          lines: 0,
          level: 1,
          drops: 0,
          lastDrop: 0,
          over: false,
        };
        return st;
      }

      function spawn(st) {
        if (!st.queue.length) st.queue = bag();
        const type = st.queue.shift();
        st.piece = { type, rot: 0, x: 3, y: -1 };
        if (collides(st, st.piece)) {
          st.over = true;
        }
      }

      function cellsOf(piece) {
        return SHAPES[piece.type][piece.rot].map(([c, r]) => [piece.x + c, piece.y + r]);
      }

      function collides(st, piece) {
        return cellsOf(piece).some(
          ([c, r]) => c < 0 || c >= COLS || r >= ROWS || (r >= 0 && st.board[r][c]),
        );
      }

      function move(dx) {
        const st = game;
        if (!st || st.over || !st.piece) return;
        const p = { ...st.piece, x: st.piece.x + dx };
        if (!collides(st, p)) {
          st.piece = p;
          api.tone(300, 0.02, 'square', 0.03);
        }
      }

      function rotate() {
        const st = game;
        if (!st || st.over || !st.piece) return;
        const states = SHAPES[st.piece.type].length;
        const rot = (st.piece.rot + 1) % states;
        for (const kick of [0, -1, 1, -2, 2]) {
          const p = { ...st.piece, rot, x: st.piece.x + kick };
          if (!collides(st, p)) {
            st.piece = p;
            api.tone(440, 0.03, 'square', 0.04);
            return;
          }
        }
      }

      function soft() {
        const st = game;
        if (!st || st.over || !st.piece) return;
        const p = { ...st.piece, y: st.piece.y + 1 };
        if (!collides(st, p)) {
          st.piece = p;
          st.lastDrop = performance.now();
        } else {
          lock(st);
        }
      }

      function hard() {
        const st = game;
        if (!st || st.over || !st.piece) return;
        let p = st.piece;
        while (!collides(st, { ...p, y: p.y + 1 })) p = { ...p, y: p.y + 1 };
        st.piece = p;
        api.tone(180, 0.05, 'square', 0.05);
        lock(st);
      }

      function lock(st) {
        for (const [c, r] of cellsOf(st.piece)) {
          if (r >= 0) st.board[r][c] = COLORS[st.piece.type];
        }
        st.drops++;
        // clear full lines
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (st.board[r].every((cell) => cell)) {
            st.board.splice(r, 1);
            st.board.unshift(Array(COLS).fill(null));
            cleared++;
            r++;
          }
        }
        if (cleared) {
          const pts = [0, 100, 300, 500, 800][cleared] * st.level;
          st.score += pts;
          st.lines += cleared;
          st.level = 1 + Math.floor(st.lines / 10);
          setScore(st.score);
          setLines(st.lines);
          api.tone(cleared >= 4 ? 659 : 523, 0.2);
        } else {
          api.tone(220, 0.04, 'square', 0.04);
        }
        st.piece = null;
        spawn(st);
        if (st.over) {
          gen++;
          const isNewBest = saveBest(st.score);
          setRunning(false);
          setMessage(`stacked out · ${st.score} points · press start`);
          api.status(`Game over. Score ${st.score}, best ${best}`);
          if (isNewBest) api.celebrate(`New best score: ${st.score}`);
        }
      }

      function interval(st) {
        return Math.max(120, 720 - (st.level - 1) * 70);
      }

      function start() {
        api.unlockSound();
        const g = ++gen;
        const st = freshGame();
        spawn(st);
        st.lastDrop = performance.now();
        game = st;
        cancelAnimationFrame(raf);
        setScore(0);
        setLines(0);
        setMessage(NOTE);
        setRunning(true);
        api.status('Score 0, level 1');
        raf = requestAnimationFrame(function frame(now) {
          if (gen !== g) return;
          if (!st.over && now - st.lastDrop >= interval(st)) {
            st.lastDrop = now;
            const p = { ...st.piece, y: st.piece.y + 1 };
            if (!collides(st, p)) st.piece = p;
            else lock(st);
          }
          drawFrame(st);
          if (!st.over) raf = requestAnimationFrame(frame);
        });
      }

      function stop() {
        gen++;
        cancelAnimationFrame(raf);
        game = null;
        setRunning(false);
        setScore(0);
        setLines(0);
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

      function block(c, x, y, color) {
        c.fillStyle = color;
        c.shadowColor = color;
        c.shadowBlur = 8;
        c.beginPath();
        c.roundRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3, 4);
        c.fill();
        c.shadowBlur = 0;
      }

      function drawFrame(st) {
        const c = canvas.getContext('2d');
        c.fillStyle = '#0a0616';
        c.fillRect(0, 0, W, H);

        // faint grid
        c.strokeStyle = 'rgba(122,92,255,0.10)';
        c.lineWidth = 1;
        for (let i = 1; i < COLS; i++) {
          c.beginPath();
          c.moveTo(i * CELL + 0.5, 0);
          c.lineTo(i * CELL + 0.5, H);
          c.stroke();
        }
        for (let i = 1; i < ROWS; i++) {
          c.beginPath();
          c.moveTo(0, i * CELL + 0.5);
          c.lineTo(W, i * CELL + 0.5);
          c.stroke();
        }

        for (let r = 0; r < ROWS; r++) {
          for (let col = 0; col < COLS; col++) {
            if (st.board[r][col]) block(c, col * CELL, r * CELL, st.board[r][col]);
          }
        }

        if (st.piece) {
          // ghost
          let g = st.piece;
          while (!collides(st, { ...g, y: g.y + 1 })) g = { ...g, y: g.y + 1 };
          c.globalAlpha = 0.22;
          for (const [col, r] of cellsOf(g)) if (r >= 0) block(c, col * CELL, r * CELL, COLORS[st.piece.type]);
          c.globalAlpha = 1;
          for (const [col, r] of cellsOf(st.piece))
            if (r >= 0) block(c, col * CELL, r * CELL, COLORS[st.piece.type]);
        }

        // hud
        c.textAlign = 'left';
        c.fillStyle = '#05d9e8';
        c.font = '700 14px ui-monospace, Menlo, monospace';
        c.fillText(String(st.score).padStart(5, '0'), 6, 16);
        c.textAlign = 'right';
        c.fillStyle = '#ff2e97';
        c.fillText(`L${st.level}`, W - 6, 16);
      }

      // first paint: the empty well, as in the original before Start is pressed
      setRunning(false);
      showReadout();
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
