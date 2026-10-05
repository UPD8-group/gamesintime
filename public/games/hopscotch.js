/* Hopscotch for Games in Time.

   A chalk court on the ground. Throw your stone into the next square with a power meter, then hop the course in time
   with the beat: one foot in a single square, both feet in a pair of side-by-side squares, never in the square with
   your stone, jump round at the end, stoop to pick up your stone on the way back, and hop out. A wrong foot or a
   hop out of time means you stepped on a line and your turn is over. Clear squares 1 to 10 to win.

   History followed (Alice Bertha Gomme, The Traditional Games of England, Scotland and Ireland, vol. 1, 1894, entry
   "Hop-scotch", pp. 223 to 227):
   - The court is Miss Chase's third plan from Crockham Hill, Kent (fig. 3): 1, then 2 and 3 side by side, 4, then 5
     and 6 side by side. Her rules for it: "Hop, having one foot in No. 2 and the other in No. 3. Step into No. 4. Hop,
     having one foot in No. 5 and the other in No. 6. Jump round. Go back as you came." Here the same pattern carries
     on to 10, as on many British and Australian courts.
   - Her fourth plan: "Throw stone into No. 1. Pick it up. Hop from No. 1 to No. 8, not touching lines. So successively
     into Nos. 2, 3, 4, &c." Halliwell's definition, quoted by Gomme: hopping "without touching any of the lines".
   - You never land in the square that holds your stone, and you pick it up on the way back (the rule printed with
     the game on this site, and still the rule in playgrounds).
   - A turn lasts until you make a mistake; next time you carry on from the square you failed.

   Timing: hops fall on a steady beat. Each landing has a known time; a press counts if it comes within `win` ms of
   it (measured with performance.now(); game time stops while paused). The canvas carries read-only data-* attributes
   (phase, next beat, what is needed, meter timing) so the automated test can play. */
(function () {
  'use strict';

  var ROWS = [[1], [2, 3], [4], [5, 6], [7], [8, 9], [10]];   /* bottom to top */
  var LAST = 10;
  /* beat: ms between hops at square 1 (it quickens a little with every square); win: landing window either side;
     chord: how close two foot presses must be to count as both feet; meter: one full swing of the power meter up and
     back; band: how far inside the square (in rows) the stone must land to keep off the lines; cpu*: the computer. */
  var LEVELS = {
    easy: { label: 'Easy', beat: 860, win: 180, perfect: 70, chord: 150, meter: 3000, band: 0.06, cpuToss: 0.72, cpuStep: 0.965 },
    normal: { label: 'Normal', beat: 720, win: 135, perfect: 55, chord: 120, meter: 2300, band: 0.1, cpuToss: 0.8, cpuStep: 0.977 },
    hard: { label: 'Hard', beat: 610, win: 100, perfect: 42, chord: 100, meter: 1800, band: 0.14, cpuToss: 0.88, cpuStep: 0.988 }
  };
  var LEVEL_KEYS = ['easy', 'normal', 'hard'];
  var COUNT_IN = 3;
  var Z_MIN = -0.4, Z_SPAN = 8.0;   /* the power meter throws from just in front of the court to past square 10 */
  var STONE_R = 0.11;               /* stone radius in rows */
  var K = 0.1;                      /* perspective: how quickly the court shrinks into the distance */
  var GRACE = 60;                   /* a missed landing is only called this long after the window, so a press already on its way still counts */
  var AIM_X = -1.3;                 /* you throw from beside the court, so you can see your square, then step to the start */

  /* ---------- colour helpers: every colour is read from the page's CSS variables ---------- */
  function parseColour(s) {
    s = String(s || '').trim();
    var m;
    if (s.charAt(0) === '#') {
      var x = s.slice(1);
      if (x.length === 3 || x.length === 4) x = x.split('').map(function (c) { return c + c; }).join('');
      if (x.length === 6 || x.length === 8) return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16), x.length === 8 ? parseInt(x.slice(6, 8), 16) / 255 : 1];
    }
    if ((m = s.match(/^rgba?\(([^)]+)\)$/i))) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      if (p.length >= 3) return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    return null;
  }
  function rgba(s, a) { var c = parseColour(s); if (!c) return s; return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? c[3] : a * c[3]).toFixed(3) + ')'; }
  function mix(s1, s2, t) {
    var a = parseColour(s1), b = parseColour(s2);
    if (!a || !b) return s1;
    return 'rgba(' + [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }).join(',') + ',' + (a[3] + (b[3] - a[3]) * t).toFixed(3) + ')';
  }
  function seeded(seed) {
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function chalkStack(cs) {
    var head = cs.getPropertyValue('--font-head').trim() || 'sans-serif';
    var parts = (cs.getPropertyValue('--font-poster').trim() || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x && !/^(cursive|fantasy)$/i.test(x); });
    return parts.concat([head]).join(', ');
  }
  function rowOf(sq) { for (var r = 0; r < ROWS.length; r++) if (ROWS[r].indexOf(sq) >= 0) return r; return -1; }
  function squareX(sq) { var r = rowOf(sq); return ROWS[r].length === 1 ? 0 : (ROWS[r][0] === sq ? -0.5 : 0.5); }

  /* The hops for one trip with the stone in square sq. Each step is one beat.
     need: one (either foot), both, left or right (one foot, in that side's square), pick (stoop for the stone). */
  function buildSteps(sq) {
    var sr = rowOf(sq), top = ROWS.length - 1, steps = [], r;
    function land(row, dir, picked) {
      var cells = ROWS[row];
      if (cells.length === 1) return { kind: 'hop', row: row, need: 'one', x: 0, dir: dir };
      if (row === sr && !picked) { var freeLeft = cells[1] === sq; return { kind: 'hop', row: row, need: freeLeft ? 'left' : 'right', x: freeLeft ? -0.5 : 0.5, dir: dir }; }
      return { kind: 'hop', row: row, need: 'both', x: 0, dir: dir };
    }
    var lastRow = sr === top ? top - 1 : top;
    for (r = 0; r <= lastRow; r++) {
      if (r === sr && ROWS[r].length === 1) continue;          /* hop over the square with your stone */
      steps.push(land(r, 'up', false));
    }
    var picked = false;
    if (sr === top) { steps.push({ kind: 'pick', row: lastRow, need: 'pick', x: 0, dir: 'up' }); picked = true; }
    steps.push({ kind: 'turn', row: lastRow, need: ROWS[lastRow].length === 1 ? 'one' : 'both', x: 0, dir: 'down' });
    for (r = lastRow - 1; r >= 0; r--) {
      if (!picked && r === sr) { steps.push({ kind: 'pick', row: r + 1, need: 'pick', x: steps[steps.length - 1].x, dir: 'down' }); picked = true; }
      steps.push(land(r, 'down', picked));
    }
    steps.push({ kind: 'out', row: -1, need: 'both', x: 0, dir: 'down' });
    return steps;
  }
  var NEED_WORDS = { one: 'one foot', both: 'both feet', left: 'left foot', right: 'right foot', pick: 'pick up' };

  GamesInTime.register({
    id: 'hopscotch',
    frame: 'stage',
    mount: function (root, api) {
      var h = api.h;
      var destroyed = false;
      var reduced = !!api.reducedMotion;
      var levelKey = api.store.get('level', 'easy');
      if (!LEVELS[levelKey]) levelKey = 'easy';
      var L = LEVELS[levelKey];
      var mode = api.store.get('mode', 'solo') === 'cpu' ? 'cpu' : 'solo';
      var best = {}, wins = api.store.get('wins', { you: 0, cpu: 0 }) || { you: 0, cpu: 0 };
      LEVEL_KEYS.forEach(function (k) { best[k] = Number(api.store.get('best-' + k, 0)) || 0; });

      /* ---------- DOM ---------- */
      root.appendChild(h('style', null,
        '.game-hopscotch .hs-toolbar { justify-content: space-between; margin-bottom: .6rem; }' +
        '.game-hopscotch .hs-settings { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }' +
        '.game-hopscotch .hs-group { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }' +
        '.game-hopscotch .hs-score { margin: 0; gap: .3rem .8rem; font-size: clamp(.95rem, .9rem + .5vw, 1.25rem); }' +
        '.game-hopscotch .hs-score strong { color: var(--gold); font-family: var(--hs-chalk, var(--font-poster)); font-size: 1.3em; display: inline-block; min-width: 1.2ch; }' +
        '.game-hopscotch .hs-score .cpu strong { color: var(--peacock); }' +
        '.game-hopscotch .hs-stage { position: relative; border-radius: 14px; overflow: hidden; background: var(--bg-2); }' +
        '.game-hopscotch .hs-canvas { display: block; width: 100%; height: 420px; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: pointer; }' +
        '.game-hopscotch .hs-canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }' +
        '.game-hopscotch .hs-overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: 10px; background: color-mix(in srgb, var(--bg) 30%, transparent); }' +
        '.game-hopscotch .hs-card { background: color-mix(in srgb, var(--surface) 92%, transparent); border: 2px solid var(--line); border-radius: 18px; padding: .8rem 1.1rem .9rem; text-align: center; max-width: 27rem; max-height: 100%; overflow: auto; display: grid; gap: .5rem; justify-items: center; box-shadow: var(--shadow); }' +
        '.game-hopscotch .hs-title { font-family: var(--hs-chalk, var(--font-poster)); font-weight: 700; font-size: clamp(1.7rem, 1.2rem + 2.6vw, 2.8rem); line-height: 1; color: var(--ink); margin: 0; }' +
        '.game-hopscotch .hs-msg { margin: 0; color: var(--ink); font-weight: 600; line-height: 1.35; }' +
        '.game-hopscotch .hs-sub { margin: 0; color: var(--ink-muted); font-size: .92rem; }' +
        '.game-hopscotch .hs-sub:empty { display: none; }' +
        '.game-hopscotch .hs-big { min-height: 56px; font-size: 1.25rem; padding: .55rem 1.9rem; }' +
        '.game-hopscotch .hs-pad { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .5rem; margin-top: .7rem; }' +
        '.game-hopscotch .hs-pad .btn { min-height: 60px; padding: .3rem .4rem; border-radius: 16px; font-size: 1.05rem; line-height: 1.1; flex-direction: column; gap: 0; touch-action: manipulation; user-select: none; -webkit-user-select: none; }' +
        '.game-hopscotch .hs-pad .btn small { font-size: .72rem; font-weight: 600; color: var(--ink-muted); }' +
        '.game-hopscotch .hs-pad .btn.hint { border-color: var(--gold); box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 35%, transparent); }' +
        '.game-hopscotch .hs-pad .btn.down { background: var(--gold); color: var(--on-era); }' +
        '.game-hopscotch .hs-pad .btn.down small { color: var(--on-era); }' +
        '.game-hopscotch .hs-pad .hs-throw { grid-column: 1 / -1; }' +
        '.game-hopscotch .hs-pad .hs-skip { grid-column: 1 / -1; }' +
        '@media (max-width: 420px) { .game-hopscotch .hs-overlay { padding: 6px; } .game-hopscotch .hs-card { padding: .55rem .6rem .65rem; gap: .4rem; } .game-hopscotch .hs-title { font-size: 1.5rem; } .game-hopscotch .hs-msg { font-size: .9rem; line-height: 1.3; } .game-hopscotch .hs-big { min-height: 48px; font-size: 1.1rem; padding-inline: 1.3rem; } .game-hopscotch .hs-card .seg button { padding-inline: .5rem; min-height: 40px; } .game-hopscotch .hs-toolbar .btn { padding-inline: .8rem; } .game-hopscotch .seg button { padding-inline: .6rem; } .game-hopscotch .hs-pad { gap: .35rem; } .game-hopscotch .hs-pad .btn { font-size: .95rem; padding-inline: .2rem; } .game-hopscotch .hs-pad .btn small { display: none; } }'));

      var pauseBtn = h('button', { class: 'btn', type: 'button', disabled: true, onclick: function () { togglePause(); focusGame(); } }, 'Pause');
      var newBtn = h('button', { class: 'btn', type: 'button', onclick: function () { newGame(true); focusGame(); } }, 'New game');
      var modeBtns = {};
      var modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Players' }, [['solo', 'Solo'], ['cpu', 'Vs computer']].map(function (m) {
        modeBtns[m[0]] = h('button', { type: 'button', 'aria-pressed': String(m[0] === mode), onclick: function () { setMode(m[0]); } }, m[1]);
        return modeBtns[m[0]];
      }));
      var levelBtns = {};
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Level' }, LEVEL_KEYS.map(function (k) {
        levelBtns[k] = h('button', { type: 'button', 'aria-pressed': String(k === levelKey), onclick: function () { setLevel(k); } }, LEVELS[k].label);
        return levelBtns[k];
      }));
      var scoreEl = h('div', { class: 'scoreboard hs-score' });
      var toolbar = h('div', { class: 'game-toolbar hs-toolbar' }, h('div', { class: 'hs-group' }, pauseBtn, newBtn), scoreEl);
      var canvas = h('canvas', { class: 'hs-canvas', role: 'img', tabindex: '0', 'aria-label': 'A hopscotch court chalked on the ground, numbered 1 to 10, with a child ready at the start line.' });
      var ovTitle = h('p', { class: 'hs-title' }, 'Hopscotch');
      var ovMsg = h('p', { class: 'hs-msg' }, '');
      var ovSub = h('p', { class: 'hs-sub' }, '');
      var ovBtn = h('button', { class: 'btn btn-primary hs-big', type: 'button', onclick: function () { overlayAction(); } }, '▶ Start');
      var overlay = h('div', { class: 'hs-overlay' }, h('div', { class: 'hs-card' }, ovTitle, ovMsg, h('div', { class: 'hs-settings' }, modeSeg, levelSeg), ovBtn, ovSub));
      var stage = h('div', { class: 'hs-stage' }, canvas, overlay);
      function padBtn(cls, label, sub, aria) { return h('button', { class: 'btn ' + cls, type: 'button', 'aria-label': aria }, label, h('small', null, sub)); }
      var bLeft = padBtn('hs-left', '◀ Left', 'A or ←', 'Left foot');
      var bBoth = padBtn('hs-both', 'Both', '↑ or Space', 'Both feet');
      var bRight = padBtn('hs-right', 'Right ▶', 'L or →', 'Right foot');
      var bPick = padBtn('hs-pick', 'Pick up', '↓ or S', 'Pick up your stone');
      var bThrow = padBtn('hs-throw', 'Hold to throw', 'hold Space, let go to throw', 'Hold to throw your stone, let go to throw');
      var bSkip = padBtn('hs-skip', 'Skip the computer’s turn', 'Enter', 'Skip the computer’s turn');
      var pad = h('div', { class: 'hs-pad' }, bLeft, bBoth, bRight, bPick, bThrow, bSkip);
      var note = h('p', { class: 'game-note' }, 'Keyboard: hold Space and let go to throw. Then land on the beat: Left arrow or A for your left foot, Right arrow or L for your right foot, both together (or Up or Space) for both feet, Down or S to stoop for your stone. P pauses. On a touch screen use the buttons, or tap the left or right half of the court (two fingers for both feet).');
      root.appendChild(toolbar);
      root.appendChild(stage);
      root.appendChild(pad);
      root.appendChild(note);

      var ctx = canvas.getContext('2d');
      var bgCanvas = document.createElement('canvas');
      var W = 300, H = 400, dpr = 1;
      var C = {}, FONT = 'sans-serif';
      function readColours() {
        var cs = getComputedStyle(root);
        function v(n, fb) { var s = cs.getPropertyValue(n).trim(); return s || fb; }
        C.bg = v('--bg', 'black'); C.bg2 = v('--bg-2', C.bg); C.surface = v('--surface', C.bg2); C.surface2 = v('--surface-2', C.surface);
        C.ink = v('--ink', 'white'); C.inkMuted = v('--ink-muted', C.ink); C.inkFaint = v('--ink-faint', C.inkMuted);
        C.gold = v('--gold', C.ink); C.vermilion = v('--vermilion', C.gold); C.peacock = v('--peacock', C.ink); C.cobalt = v('--cobalt', C.peacock);
        C.rose = v('--rose', C.vermilion); C.leaf = v('--leaf', C.peacock); C.red = v('--red', C.vermilion); C.green = v('--green', C.leaf);
        C.onEra = v('--on-era', C.bg);
        C.skin = mix(C.ink, C.rose, 0.32);
        C.skinLine = mix(C.rose, C.bg, 0.45);
        C.hairFair = mix(C.gold, C.ink, 0.25);
        C.hairDark = mix(C.bg, C.vermilion, 0.3);
        C.stocking = mix(C.bg, C.ink, 0.22);
        C.boot = mix(C.bg, C.ink, 0.08);
        C.stone = mix(C.vermilion, C.bg, 0.35);
        C.ground = mix(C.bg2, C.ink, 0.05);
        FONT = chalkStack(cs);
        root.style.setProperty('--hs-chalk', FONT);
      }

      /* ---------- game clock ---------- */
      var clockBase = performance.now(), pausedAt = null;
      function gnow() { return (pausedAt != null ? pausedAt : performance.now()) - clockBase; }
      function holdClock() { if (pausedAt == null) pausedAt = performance.now(); }
      function releaseClock() { if (pausedAt != null) { clockBase += performance.now() - pausedAt; pausedAt = null; } }
      function realOf(gt) { return gt + clockBase; }
      /* When an input really happened, in game time: the event's own timestamp (same clock as performance.now(), so a
         busy frame does not make a well-timed press late), or now if the browser gives something odd. */
      function evTime(e) {
        var now = performance.now(), ts = e && e.timeStamp;
        if (pausedAt == null && ts && ts <= now + 1 && ts > now - 250) return ts - clockBase;
        return gnow();
      }

      /* ---------- state ---------- */
      var state = 'idle';           /* idle | playing | paused | over */
      var phase = 'rest';           /* rest | think | aim | stone | stoneIn | hop | fault | cleared | turnover | won */
      var phaseAt = 0;
      var players = { you: { square: 1, turns: 1 }, cpu: { square: 1, turns: 1 } };
      var who = 'you';
      var holding = false, holdAt = 0, cpuReleaseAt = 0;
      var stone = null;              /* {z, x, from:{z,x}, at, landed, ok, why} */
      var steps = [], cur = 0, seqStart = 0, interval = 800, landedAt = [], hopFrom = { z: -0.6, x: 0 };
      var pend = null, lastSingle = null;
      var cpuEvents = [];
      var faultWhy = '', faultPos = null;
      var resumeAt = 0, rafId = 0, overAt = 0;
      var fx = [], floaters = [], shakeUntil = 0;
      var tickedBeat = -1, winner = null, newBest = false, cpuWillClear = false;

      function P() { return players[who]; }
      function beatTime(i) { return seqStart + (COUNT_IN + i) * interval; }
      function curNeed() { return phase === 'hop' && cur < steps.length ? steps[cur].need : ''; }
      function meterPower(t) { var k = ((t - holdAt) / L.meter) % 1; return k < 0.5 ? k * 2 : 2 - k * 2; }
      function zOfPower(p) { return Z_MIN + p * Z_SPAN; }
      function targetBand(sq) { var r = rowOf(sq); return { z0: r + L.band + STONE_R * 0.5, z1: r + 1 - L.band - STONE_R * 0.5 }; }

      /* ---------- layout and perspective ---------- */
      var G = {};
      function layout() {
        G.y0 = H * 0.85;
        G.yTop = H * 0.165;
        G.yInf = ((1 + 7 * K) * G.yTop - G.y0) / (7 * K);
        G.h0 = (G.y0 - G.yInf) * K;
        G.cx = W / 2;
        G.W0 = Math.min(G.h0 * 1.5, (W - 110) / 2.15);
        G.kid = G.h0 * 1.3;
      }
      /* court position (z rows up the court, x units across; a single square is x -0.5 to 0.5) to the screen */
      function P2(z, x) { var s = 1 / (1 + K * z); return { x: G.cx + x * G.W0 * s, y: G.yInf + (G.y0 - G.yInf) * s, s: s }; }
      function resize() {
        var w = Math.max(200, Math.round(stage.clientWidth || root.clientWidth || 300));
        var vh = window.innerHeight || 700;
        var hh = w < 480 ? Math.round(clamp(w * 1.45, 380, Math.max(380, vh * 0.62))) : Math.round(clamp(Math.min(w * 0.62, vh * 0.7), 440, 680));
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = w; H = hh;
        canvas.style.height = hh + 'px';
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr);
        readColours();
        layout();
        buildBackground();
        draw();
        if (!overlay.hidden) fitCard();
      }

      /* ---------- background: asphalt, a brick wall at the far end and the chalk court ---------- */
      function chalkLine(b, x1, y1, x2, y2, colour, width, rnd) {
        for (var k = 0; k < 3; k++) {
          b.strokeStyle = rgba(colour, 0.32 + k * 0.2); b.lineWidth = width * (1.5 - k * 0.35);
          b.beginPath(); b.moveTo(x1 + (rnd() - 0.5) * 2, y1 + (rnd() - 0.5) * 2); b.lineTo(x2 + (rnd() - 0.5) * 2, y2 + (rnd() - 0.5) * 2); b.stroke();
        }
        /* gaps where the chalk skipped */
        b.strokeStyle = rgba(C.ground, 0.55); b.lineWidth = 1;
        for (var i = 0; i < 4; i++) { var k2 = rnd(); var px = x1 + (x2 - x1) * k2, py = y1 + (y2 - y1) * k2; b.beginPath(); b.moveTo(px - 2, py - 1); b.lineTo(px + 2, py + 1); b.stroke(); }
      }
      function quad(b, z0, z1, x0, x1) { var a = P2(z0, x0), c = P2(z0, x1), d = P2(z1, x1), e = P2(z1, x0); b.beginPath(); b.moveTo(a.x, a.y); b.lineTo(c.x, c.y); b.lineTo(d.x, d.y); b.lineTo(e.x, e.y); b.closePath(); }
      function buildBackground() {
        bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;
        var b = bgCanvas.getContext('2d');
        b.setTransform(dpr, 0, 0, dpr, 0, 0);
        var rnd = seeded(1677);
        var gr = b.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, mix(C.bg2, C.bg, 0.4)); gr.addColorStop(1, C.ground);
        b.fillStyle = gr; b.fillRect(0, 0, W, H);
        /* a low brick wall along the far end of the yard */
        var wallY = Math.max(6, G.yTop - G.h0 * 0.5);
        b.fillStyle = mix(C.bg, C.vermilion, 0.28); b.fillRect(0, 0, W, wallY);
        var bw = 26, bh = 9, row = 0, x, y;
        for (y = 0; y < wallY - 2; y += bh + 2, row++) for (x = row % 2 ? -bw / 2 : 0; x < W; x += bw + 2) { b.fillStyle = mix(C.bg, C.vermilion, 0.34 + rnd() * 0.12); b.fillRect(x, y, bw, Math.min(bh, wallY - 2 - y)); }
        b.fillStyle = rgba(C.bg, 0.5); b.fillRect(0, wallY, W, 3);
        /* speckled asphalt */
        for (var i = 0; i < W * H / 220; i++) { b.fillStyle = rgba(rnd() < 0.5 ? C.ink : C.bg, 0.04 + rnd() * 0.07); b.fillRect(rnd() * W, wallY + rnd() * (H - wallY), 1.5, 1.5); }
        /* old chalk doodles on the wider playgrounds: a noughts and crosses game and a sun */
        if (W > 620) {
          b.save();
          b.strokeStyle = rgba(C.ink, 0.16); b.lineWidth = 3; b.lineCap = 'round';
          var gx = W * 0.14, gy = H * 0.62, gs = Math.min(W * 0.03, 26);
          for (var q = 1; q < 3; q++) { b.beginPath(); b.moveTo(gx + q * gs, gy); b.lineTo(gx + q * gs, gy + gs * 3); b.moveTo(gx, gy + q * gs); b.lineTo(gx + gs * 3, gy + q * gs); b.stroke(); }
          b.strokeStyle = rgba(C.rose, 0.22);
          b.beginPath(); b.moveTo(gx + 6, gy + 6); b.lineTo(gx + gs - 6, gy + gs - 6); b.moveTo(gx + gs - 6, gy + 6); b.lineTo(gx + 6, gy + gs - 6); b.stroke();
          b.strokeStyle = rgba(C.peacock, 0.22); b.beginPath(); b.arc(gx + gs * 1.5, gy + gs * 1.5, gs * 0.32, 0, Math.PI * 2); b.stroke();
          var sr = Math.min(W * 0.025, 22), sx = Math.min(W - sr * 2.4, Math.max(W * 0.86, G.cx + G.W0 * 2 + 46 + sr * 3.2)), sy = H * 0.36;
          b.strokeStyle = rgba(C.gold, 0.2);
          b.beginPath(); b.arc(sx, sy, sr, 0, Math.PI * 2); b.stroke();
          for (var ray = 0; ray < 8; ray++) { var an = ray * Math.PI / 4; b.beginPath(); b.moveTo(sx + Math.cos(an) * sr * 1.4, sy + Math.sin(an) * sr * 1.4); b.lineTo(sx + Math.cos(an) * sr * 2, sy + Math.sin(an) * sr * 2); b.stroke(); }
          b.restore();
        }
        /* the court: a faint chalk wash in each square, then the lines */
        ROWS.forEach(function (cells, r) {
          var x0 = cells.length === 1 ? -0.5 : -1, x1 = -x0;
          quad(b, r, r + 1, x0, x1); b.fillStyle = rgba(C.ink, 0.035); b.fill();
        });
        var lw = Math.max(2.5, G.h0 * 0.045);
        ROWS.forEach(function (cells, r) {
          var x0 = cells.length === 1 ? -0.5 : -1, x1 = -x0;
          var a = P2(r, x0), c = P2(r, x1), d = P2(r + 1, x1), e = P2(r + 1, x0);
          chalkLine(b, a.x, a.y, e.x, e.y, C.ink, lw, rnd);
          chalkLine(b, c.x, c.y, d.x, d.y, C.ink, lw, rnd);
          var below = r > 0 ? (ROWS[r - 1].length === 1 ? 0.5 : 1) : 0;
          var wide = Math.max(x1, below);
          var bl = P2(r, -wide), br = P2(r, wide);
          chalkLine(b, bl.x, bl.y, br.x, br.y, C.ink, lw, rnd);
          if (cells.length === 2) { var m0 = P2(r, 0), m1 = P2(r + 1, 0); chalkLine(b, m0.x, m0.y, m1.x, m1.y, C.ink, lw, rnd); }
          if (r === ROWS.length - 1) { var t0 = P2(r + 1, x0), t1 = P2(r + 1, x1); chalkLine(b, t0.x, t0.y, t1.x, t1.y, C.ink, lw, rnd); }
        });
        /* numbers */
        var colours = [C.gold, C.rose, C.peacock];
        ROWS.forEach(function (cells, r) {
          cells.forEach(function (n) {
            var p = P2(r + 0.5, squareX(n));
            var size = Math.max(14, G.h0 * 0.5 * p.s);
            b.font = '700 ' + Math.round(size) + 'px ' + FONT;
            b.textAlign = 'center'; b.textBaseline = 'middle';
            b.fillStyle = rgba(colours[n % 3], 0.85);
            b.save(); b.translate(p.x, p.y); b.scale(1, 0.85); b.fillText(String(n), 0, 0); b.restore();
          });
        });
      }

      /* ---------- drawing helpers ---------- */
      function rr(c, x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
      function chalkText(text, x, y, size, colour, align, alpha) {
        ctx.save();
        ctx.font = '700 ' + Math.round(size) + 'px ' + FONT;
        ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = rgba(C.bg, 0.8); ctx.lineWidth = Math.max(3, size * 0.16);
        ctx.strokeText(text, x, y);
        ctx.fillStyle = colour; ctx.fillText(text, x, y);
        ctx.restore();
      }
      function drawStone(x, y, s, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.translate(x, y); ctx.scale(1, 0.62);
        ctx.fillStyle = C.stone; ctx.strokeStyle = rgba(C.ink, 0.6); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-s, -s * 0.2); ctx.lineTo(-s * 0.5, -s); ctx.lineTo(s * 0.6, -s * 0.85); ctx.lineTo(s, s * 0.1); ctx.lineTo(s * 0.4, s); ctx.lineTo(-s * 0.7, s * 0.8); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = rgba(C.ink, 0.35); ctx.beginPath(); ctx.ellipse(-s * 0.2, -s * 0.35, s * 0.35, s * 0.2, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      /* A shoe print, for the "land here" marks: side -1 left, 1 right. */
      function footprint(x, y, s, side, colour, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y); ctx.scale(side, 1); ctx.rotate(-0.12);
        ctx.fillStyle = colour;
        ctx.beginPath(); ctx.ellipse(0, -s * 0.18, s * 0.2, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(s * 0.02, s * 0.3, s * 0.15, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      /* A child from behind (facing up the court) or from the front, simply drawn like a chalk picture come to life.
         o: dress, pinafore, hair, bow, cap, facing 'up'|'down', stance 'stand'|'one-left'|'one-right'|'both'|'stoop', air, tilt, spin (0..1 squash for turning) */
      function drawKid(x, footY, s, o) {
        ctx.save();
        ctx.translate(x, footY);
        if (o.tilt) ctx.rotate(o.tilt);
        if (o.squash) ctx.scale(1 - o.squash * 0.6, 1);
        var back = o.facing === 'up';
        var stance = o.stance || 'stand', air = o.air || 0;
        var stoop = stance === 'stoop' ? 1 : 0;
        var hip = -0.42 * s, sh = -0.71 * s + stoop * 0.2 * s, headY = -0.85 * s + stoop * 0.24 * s, hr = 0.12 * s;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        function leg(side, footX, footUp, kneeOut) {
          var fy = -footUp * s;
          ctx.strokeStyle = C.stocking; ctx.lineWidth = 0.075 * s;
          ctx.beginPath(); ctx.moveTo(side * 0.06 * s, hip + 0.05 * s); ctx.lineTo(side * (0.07 + kneeOut) * s, -0.22 * s - footUp * 0.5 * s); ctx.lineTo(footX * s, fy); ctx.stroke();
          ctx.fillStyle = C.boot; rr(ctx, footX * s - 0.065 * s + side * 0.015 * s, fy - 0.05 * s, 0.13 * s, 0.07 * s, 0.03 * s); ctx.fill();
          ctx.strokeStyle = rgba(C.ink, 0.4); ctx.lineWidth = 1; ctx.stroke();
        }
        var lift = 0.12 + air * 0.05;
        if (stance === 'both') { leg(-1, -0.24, air * 0.08, 0.06); leg(1, 0.24, air * 0.08, 0.06); }
        else if (stance === 'one-left') { leg(1, 0.13, lift + 0.1, 0.12); leg(-1, -0.075, air * 0.1, 0); }
        else if (stance === 'one-right') { leg(-1, -0.13, lift + 0.1, 0.12); leg(1, 0.075, air * 0.1, 0); }
        else { leg(-1, -0.075 - air * 0.03, air * 0.12, air * 0.05); leg(1, 0.075 + air * 0.03, air * 0.12, air * 0.05); }
        /* arms out for balance */
        var armUp = stance === 'stoop' ? 0 : 0.18 + air * 0.12;
        [-1, 1].forEach(function (side) {
          var reachDown = stance === 'stoop' && side === (o.reach || 1);
          var hx = side * (reachDown ? 0.12 : 0.36) * s, hy = reachDown ? -0.05 * s : sh + (0.12 - armUp) * s;
          ctx.strokeStyle = o.dress; ctx.lineWidth = 0.085 * s;
          ctx.beginPath(); ctx.moveTo(side * 0.13 * s, sh + 0.04 * s); ctx.lineTo(hx, hy); ctx.stroke();
          ctx.fillStyle = C.skin; ctx.beginPath(); ctx.arc(hx, hy, 0.045 * s, 0, Math.PI * 2); ctx.fill();
        });
        /* dress and pinafore */
        ctx.fillStyle = o.dress;
        ctx.beginPath(); ctx.moveTo(-0.13 * s, sh); ctx.lineTo(0.13 * s, sh); ctx.lineTo(0.24 * s, -0.27 * s); ctx.quadraticCurveTo(0, -0.22 * s, -0.24 * s, -0.27 * s); ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgba(C.ink, 0.92);
        if (back) {
          ctx.fillStyle = rgba(C.ink, 0.92);
          ctx.beginPath(); ctx.moveTo(-0.2 * s, -0.36 * s); ctx.quadraticCurveTo(0, -0.33 * s, 0.2 * s, -0.36 * s); ctx.lineTo(0.18 * s, -0.42 * s); ctx.lineTo(-0.18 * s, -0.42 * s); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = rgba(C.ink, 0.92); ctx.lineWidth = 0.03 * s;
          ctx.beginPath(); ctx.moveTo(-0.1 * s, sh); ctx.lineTo(0.12 * s, -0.42 * s); ctx.moveTo(0.1 * s, sh); ctx.lineTo(-0.12 * s, -0.42 * s); ctx.stroke();
          ctx.fillStyle = o.bow || o.dress; ctx.beginPath(); ctx.moveTo(0, -0.42 * s); ctx.lineTo(-0.09 * s, -0.47 * s); ctx.lineTo(-0.09 * s, -0.37 * s); ctx.closePath(); ctx.moveTo(0, -0.42 * s); ctx.lineTo(0.09 * s, -0.47 * s); ctx.lineTo(0.09 * s, -0.37 * s); ctx.closePath(); ctx.fill();
        } else if (o.pinafore) {
          ctx.beginPath(); ctx.moveTo(-0.09 * s, sh + 0.06 * s); ctx.lineTo(0.09 * s, sh + 0.06 * s); ctx.lineTo(0.17 * s, -0.31 * s); ctx.quadraticCurveTo(0, -0.27 * s, -0.17 * s, -0.31 * s); ctx.closePath(); ctx.fill();
        }
        /* head and hair */
        ctx.fillStyle = C.skin; ctx.beginPath(); ctx.arc(0, headY, hr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = o.hair;
        if (back) { ctx.beginPath(); ctx.arc(0, headY - hr * 0.05, hr * 1.06, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(0, headY - hr * 0.15, hr * 1.06, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill(); }
        if (o.plaits) { ctx.beginPath(); ctx.ellipse(-hr * 0.95, headY + hr * 0.55, hr * 0.3, hr * 0.8, 0.15, 0, Math.PI * 2); ctx.ellipse(hr * 0.95, headY + hr * 0.55, hr * 0.3, hr * 0.8, -0.15, 0, Math.PI * 2); ctx.fill(); }
        if (o.cap) { ctx.fillStyle = o.cap; ctx.beginPath(); ctx.ellipse(0, headY - hr * 0.7, hr * 1.12, hr * 0.45, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-hr * 1.2, headY - hr * 0.76, hr * 2.4, hr * 0.22); }
        if (o.bowHead) {
          ctx.fillStyle = o.bowHead; var bx = hr * 0.55, by = headY - hr * 0.95;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - hr * 0.55, by - hr * 0.35); ctx.lineTo(bx - hr * 0.55, by + hr * 0.3); ctx.closePath(); ctx.moveTo(bx, by); ctx.lineTo(bx + hr * 0.55, by - hr * 0.35); ctx.lineTo(bx + hr * 0.55, by + hr * 0.3); ctx.closePath(); ctx.fill();
        }
        if (!back) {
          ctx.fillStyle = C.bg;
          ctx.beginPath(); ctx.arc(-hr * 0.36, headY + hr * 0.02, Math.max(1.2, hr * 0.1), 0, Math.PI * 2); ctx.arc(hr * 0.36, headY + hr * 0.02, Math.max(1.2, hr * 0.1), 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = C.skinLine; ctx.fillStyle = C.skinLine; ctx.lineWidth = Math.max(1.2, hr * 0.12);
          if (o.mouth === 'o') { ctx.beginPath(); ctx.ellipse(0, headY + hr * 0.5, hr * 0.17, hr * 0.22, 0, 0, Math.PI * 2); ctx.fill(); }
          else { ctx.beginPath(); ctx.arc(0, headY + hr * 0.3, hr * 0.28, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
        }
        ctx.restore();
      }
      function kidStyle(w) {
        return w === 'cpu'
          ? { dress: C.peacock, pinafore: false, hair: C.hairDark, cap: mix(C.peacock, C.bg, 0.5), bow: null }
          : { dress: C.rose, pinafore: true, hair: C.hairFair, plaits: true, bowHead: C.vermilion, bow: C.vermilion };
      }

      /* ---------- where the hopper is ---------- */
      function stepPos(i) {
        if (i < 0) return { z: -0.6, x: 0 };
        var st = steps[i];
        if (st.kind === 'out') return { z: -0.6, x: 0 };
        return { z: st.row + 0.5, x: st.x };
      }
      function hopDur() { return Math.min(interval * 0.55, 340); }
      function kidNow(t) {
        var res = { z: -0.6, x: AIM_X, air: 0, facing: 'up', stance: 'stand', spin: 0, tilt: 0 };
        if (phase === 'hop' || (phase === 'fault' && faultWhy.indexOf('toss') !== 0) || phase === 'cleared') {
          var i = cur;
          var prev = stepPos(i - 1);
          var landedLast = i > 0 ? steps[i - 1] : null;
          res.z = prev.z; res.x = prev.x;
          res.facing = landedLast && (landedLast.dir === 'down') ? 'down' : 'up';
          res.stance = landedLast ? stanceFor(landedLast, landedAt[i - 1]) : 'both';
          if (phase === 'hop' && i < steps.length) {
            var st = steps[i], b = beatTime(i), hd = hopDur();
            if (st.kind === 'pick') {
              var pk = clamp((t - (b - hd * 0.7)) / (hd * 0.7), 0, 1);
              if (pk > 0) { res.stance = 'stoop'; res.reach = st.dir === 'up' ? 1 : 1; }
            } else if (t > b - hd) {
              var k = clamp((t - (b - hd)) / hd, 0, 1);
              var next = stepPos(i);
              res.z = prev.z + (next.z - prev.z) * k; res.x = prev.x + (next.x - prev.x) * k;
              res.air = Math.sin(k * Math.PI * 0.92) + (k >= 1 ? 0.08 : 0);
              res.stance = 'stand';
              if (st.kind === 'turn') { res.spin = Math.sin(k * Math.PI); if (k > 0.5) res.facing = 'down'; }
            }
          }
          if (phase === 'fault' && faultWhy.indexOf('toss') !== 0) {
            var fk = (t - phaseAt) / 1000;
            res.tilt = reduced ? 0.2 : Math.sin(fk * 18) * 0.25 * Math.max(0, 1 - fk) + 0.18;
            if (faultPos) { res.z = faultPos.z; res.x = faultPos.x; }
          }
        } else if (phase === 'stoneIn') {
          /* walk from the throwing spot beside the court to the start */
          var wk = clamp((t - phaseAt) / 420, 0, 1);
          res.z = -0.6; res.x = AIM_X * (1 - wk); res.facing = 'up'; res.stance = wk < 1 ? 'stand' : 'both';
          res.air = reduced ? 0 : Math.abs(Math.sin(wk * Math.PI * 3)) * 0.15;
        } else if (phase === 'aim' || phase === 'stone' || phase === 'think' || phase === 'fault') {
          res.z = -0.6; res.x = AIM_X; res.facing = 'up'; res.stance = 'stand';
        } else if (phase === 'won') {
          res.z = -0.6; res.x = 0; res.facing = 'down'; res.air = Math.abs(Math.sin((t - phaseAt) / 220)) * (reduced ? 0 : 0.8);
        }
        return res;
      }
      function stanceFor(st, how) {
        if (st.kind === 'pick') return 'stand';
        if (st.need === 'both') return 'both';
        if (how === 'left' || st.need === 'left') return 'one-left';
        if (how === 'right' || st.need === 'right') return 'one-right';
        return 'one-left';
      }

      /* ---------- the frame ---------- */
      /* Copy a cached layer pixel for pixel (its backing store matches the canvas), keeping any shake. */
      function blit(layer) {
        var m = ctx.getTransform ? ctx.getTransform() : null;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, m ? Math.round(m.e) : 0, m ? Math.round(m.f) : 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(layer, 0, 0);
        ctx.restore();
      }
      function draw() {
        if (destroyed || !W) return;
        var t = gnow(), now = performance.now();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.save();
        if (!reduced && now < shakeUntil) { var sk = (shakeUntil - now) / 350; ctx.translate(Math.sin(now * 0.1) * 6 * sk, Math.cos(now * 0.13) * 3 * sk); }
        blit(bgCanvas);
        var playing = state === 'playing' || state === 'paused';
        /* cleared squares get a chalk tick in the player's colour */
        if (state !== 'idle') {
          for (var n = 1; n < P().square && n <= LAST; n++) {
            var cp = P2(rowOf(n) + 0.78, squareX(n) + 0.3);
            ctx.strokeStyle = who === 'cpu' ? C.peacock : C.leaf; ctx.lineWidth = Math.max(2, 3 * cp.s); ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(cp.x - 7 * cp.s, cp.y); ctx.lineTo(cp.x - 2 * cp.s, cp.y + 5 * cp.s); ctx.lineTo(cp.x + 8 * cp.s, cp.y - 7 * cp.s); ctx.stroke();
          }
        }
        /* the target square while aiming */
        if (playing && (phase === 'aim' || phase === 'think' || phase === 'stone')) {
          var sq = P().square, r = rowOf(sq), x0 = ROWS[r].length === 1 ? -0.5 : (squareX(sq) < 0 ? -1 : 0), x1 = x0 + 1;
          quad(ctx, r, r + 1, x0, x1);
          ctx.fillStyle = rgba(C.gold, reduced ? 0.2 : 0.16 + 0.1 * Math.sin(now / 180)); ctx.fill();
          ctx.strokeStyle = rgba(C.gold, 0.9); ctx.lineWidth = 3; ctx.stroke();
        }
        /* hop guides: the next landings, with an approach ring closing on the beat */
        if (playing && phase === 'hop') drawGuides(t);
        /* the stone */
        if (stone) {
          var sp;
          if (phase === 'stone') {
            var k = clamp((t - stone.at) / stone.dur, 0, 1);
            var z = stone.from.z + (stone.z - stone.from.z) * k, x = stone.from.x + (stone.x - stone.from.x) * k;
            sp = P2(z, x);
            var arc = Math.sin(k * Math.PI) * G.h0 * 1.6 * sp.s + (1 - k) * G.kid * 0.55 * sp.s;
            ctx.fillStyle = rgba(C.bg, 0.4); ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 9 * sp.s, 4 * sp.s, 0, 0, Math.PI * 2); ctx.fill();
            drawStone(sp.x, sp.y - arc, Math.max(6, G.h0 * 0.14 * sp.s));
          } else if (!stone.picked) {
            sp = P2(stone.z, stone.x);
            drawStone(sp.x, sp.y, Math.max(6, G.h0 * 0.14 * sp.s));
          }
        }
        /* the waiting player in a two-player game */
        if (mode === 'cpu' && state !== 'idle' && W >= 480) {
          var other = who === 'you' ? 'cpu' : 'you';
          var ws = clamp(G.kid * 0.62, 34, 80);
          var wx = Math.max(ws * 0.5 + 6, G.cx - G.W0 * 2.7);
          drawKid(wx, H - 6, ws, Object.assign({ facing: 'down', stance: 'stand' }, kidStyle(other)));
          chalkText(other === 'cpu' ? 'Computer' : 'You', wx, H - ws * 1.12, clamp(ws * 0.26, 11, 18), other === 'cpu' ? C.peacock : C.rose);
        }
        /* the hopper */
        var kn = kidNow(t);
        var kp = P2(kn.z, kn.x);
        var ks = G.kid * kp.s;
        kp.x = clamp(kp.x, ks * 0.42 + 2, W - ks * 0.42 - 2);
        ctx.fillStyle = rgba(C.bg, 0.45 - kn.air * 0.2); ctx.beginPath(); ctx.ellipse(kp.x, kp.y + 2, ks * (0.24 - kn.air * 0.06), ks * 0.06, 0, 0, Math.PI * 2); ctx.fill();
        drawKid(kp.x, kp.y - kn.air * G.h0 * 0.42 * kp.s, ks, Object.assign({ facing: kn.facing, stance: kn.stance, air: kn.air, tilt: kn.tilt, squash: kn.spin, reach: kn.reach, mouth: phase === 'fault' ? 'o' : 'smile' }, kidStyle(who)));
        /* fault mark */
        if (phase === 'fault' && faultPos) {
          var fp = P2(faultPos.z, faultPos.x);
          ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.lineCap = 'round';
          var xs = 14 * fp.s + 6;
          ctx.beginPath(); ctx.moveTo(fp.x - xs, fp.y - xs * 0.6); ctx.lineTo(fp.x + xs, fp.y + xs * 0.6); ctx.moveTo(fp.x + xs, fp.y - xs * 0.6); ctx.lineTo(fp.x - xs, fp.y + xs * 0.6); ctx.stroke();
        }
        /* the power meter, level with the court so the band sits beside your square */
        if (playing && (phase === 'aim' || phase === 'think' || phase === 'stone')) drawMeter(t);
        /* count-in */
        if (playing && phase === 'hop') {
          var c0 = beatTime(-COUNT_IN), into = t - c0;
          if (into >= 0 && into < COUNT_IN * interval) {
            var cn = COUNT_IN - Math.floor(into / interval);
            var ck = (into % interval) / interval;
            var cx2 = Math.max(26, kp.x - ks * 0.55 - clamp(G.h0 * 0.45, 22, 50));
            chalkText(String(cn), cx2, kp.y - ks * 0.6, clamp(G.h0 * 0.7, 28, 64) * (reduced ? 1 : 1 + 0.25 * (1 - ck)), C.gold, 'center', 1 - ck * 0.6);
            if (cn === COUNT_IN && ck < 0.9) chalkText('Ready', cx2, kp.y - ks * 0.6 - clamp(G.h0 * 0.55, 24, 52), clamp(G.h0 * 0.26, 13, 22), C.ink, 'center', 0.9);
          }
        }
        /* the beat light */
        if (playing && phase === 'hop') {
          var since = (t - beatTime(-COUNT_IN)) % interval;
          var lightK = since >= 0 ? clamp(1 - since / 160, 0, 1) : 0;
          var lx = Math.max(30, G.cx - G.W0 * 2 - 40), ly = H - 30;
          ctx.fillStyle = rgba(C.gold, reduced ? 0.35 + 0.35 * lightK : 0.2 + 0.8 * lightK);
          ctx.beginPath(); ctx.arc(lx, ly, 13 + (reduced ? 0 : lightK * 5), 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = rgba(C.ink, 0.6); ctx.lineWidth = 2; ctx.stroke();
          chalkText('beat', lx, ly - 28, 13, C.inkMuted, 'center', 0.9);
        }
        /* labels */
        var lab = clamp(H * 0.055, 16, 32);
        chalkText('Square ' + Math.min(P().square, LAST), 12, lab * 0.9, lab, who === 'cpu' ? C.peacock : C.gold, 'left');
        var sub = mode === 'cpu' ? (who === 'cpu' ? 'Computer’s turn' : 'Your turn') : 'Turn ' + players.you.turns;
        if (state !== 'idle') chalkText(sub, 12, lab * 1.95, lab * 0.62, C.ink, 'left', 0.85);
        floaters.forEach(function (f) {
          var fk = clamp((now - f.born) / f.life, 0, 1);
          chalkText(f.text, f.x, f.y - (reduced ? 0 : fk * 26), f.size, f.colour, 'center', 1 - fk * fk);
        });
        fx.forEach(function (p) {
          var pk = clamp((now - p.born) / p.life, 0, 1);
          ctx.fillStyle = rgba(p.c || C.ink, 0.55 * (1 - pk));
          ctx.beginPath(); ctx.arc(p.x + p.vx * pk, p.y + p.vy * pk, p.r * (1 + pk), 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
        if (resumeAt) {
          var cd = Math.ceil((resumeAt - now) / ((reduced ? 600 : 1200) / 3));
          ctx.fillStyle = rgba(C.bg, 0.45); ctx.fillRect(0, 0, W, H);
          chalkText(String(clamp(cd, 1, 3)), W / 2, H / 2, clamp(H * 0.25, 60, 140), C.gold);
        }
      }
      function drawGuides(t) {
        for (var j = 0; j < 3 && cur + j < steps.length; j++) {
          var i = cur + j, st = steps[i], b = beatTime(i);
          var pos = stepPos(i), p = P2(pos.z, pos.x);
          var alpha = j === 0 ? 1 : j === 1 ? 0.45 : 0.22;
          var fs = G.h0 * 0.62 * p.s;
          var col = j === 0 ? C.gold : C.ink;
          if (st.kind === 'pick') {
            var spk = P2(stone.z, stone.x);
            chalkText('Pick up!', spk.x, spk.y - fs * 0.9, Math.max(13, fs * 0.55), col, 'center', alpha);
            ctx.strokeStyle = rgba(col, alpha); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(spk.x, spk.y, fs * 0.5, 0, Math.PI * 2); ctx.stroke();
          } else if (st.kind === 'turn') {
            ctx.strokeStyle = rgba(col, alpha); ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(p.x, p.y - fs * 0.1, fs * 0.55, Math.PI * 0.15, Math.PI * 1.75); ctx.stroke();
            ctx.fillStyle = rgba(col, alpha); var ax = p.x + Math.cos(Math.PI * 1.75) * fs * 0.55, ay = p.y - fs * 0.1 + Math.sin(Math.PI * 1.75) * fs * 0.55;
            ctx.beginPath(); ctx.moveTo(ax + 6, ay - 2); ctx.lineTo(ax - 4, ay - 8); ctx.lineTo(ax - 2, ay + 6); ctx.closePath(); ctx.fill();
            if (j === 0) chalkText('Turn!', p.x, p.y + fs * 0.75, Math.max(12, fs * 0.42), col, 'center', alpha);
          } else if (st.need === 'both') {
            footprint(p.x - fs * 0.42, p.y, fs, -1, col, alpha * 0.9); footprint(p.x + fs * 0.42, p.y, fs, 1, col, alpha * 0.9);
          } else {
            footprint(p.x, p.y, fs, st.need === 'right' ? 1 : -1, col, alpha * 0.9);
          }
          if (j === 0) {
            /* the ring closes on the landing exactly on the beat */
            var k = clamp((b - t) / interval, 0, 1);
            ctx.strokeStyle = rgba(C.gold, 0.45 + 0.55 * (1 - k)); ctx.lineWidth = 3;
            var rx = fs * (0.75 + k * 1.1), ry = rx * 0.55;
            ctx.beginPath(); ctx.ellipse(st.kind === 'pick' ? P2(stone.z, stone.x).x : p.x, st.kind === 'pick' ? P2(stone.z, stone.x).y : p.y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
            if (L === LEVELS.easy && st.kind !== 'pick') chalkText(NEED_WORDS[st.need], p.x, p.y + fs * 0.75, Math.max(12, fs * 0.38), C.gold, 'center', 0.95);
          }
        }
      }
      function drawMeter(t) {
        var mx = Math.min(W - 26, G.cx + G.W0 * 2 + 46), top = P2(Z_MIN + Z_SPAN, 0).y, bot = P2(Z_MIN, 0).y;
        ctx.fillStyle = rgba(C.bg, 0.55); rr(ctx, mx - 10, top - 6, 20, bot - top + 12, 10); ctx.fill();
        ctx.strokeStyle = rgba(C.ink, 0.5); ctx.lineWidth = 2; ctx.stroke();
        /* row marks */
        for (var r = 0; r <= ROWS.length; r++) { var yy = P2(r, 0).y; ctx.strokeStyle = rgba(C.ink, 0.35); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mx - 8, yy); ctx.lineTo(mx + 8, yy); ctx.stroke(); }
        var band = targetBand(P().square), b0 = P2(band.z0, 0).y, b1 = P2(band.z1, 0).y;
        ctx.fillStyle = rgba(C.gold, 0.85); ctx.fillRect(mx - 8, b1, 16, b0 - b1);
        /* a dashed guide from the band across to the target square */
        ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = rgba(C.gold, 0.5); ctx.lineWidth = 1.5;
        var mid = P2((band.z0 + band.z1) / 2, 0); ctx.beginPath(); ctx.moveTo(mx - 10, mid.y); ctx.lineTo(P2((band.z0 + band.z1) / 2, 1).x + 4, mid.y); ctx.stroke(); ctx.restore();
        if (holding || phase === 'stone') {
          var pw = phase === 'stone' ? (stone.z - Z_MIN) / Z_SPAN : meterPower(t);
          var y = P2(zOfPower(pw), 0).y;
          ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(mx - 16, y); ctx.lineTo(mx - 6, y - 7); ctx.lineTo(mx - 6, y + 7); ctx.closePath(); ctx.fill();
          ctx.fillRect(mx - 8, y - 2, 16, 4);
          if (phase !== 'stone') {
            /* where the stone would land */
            var gp = P2(zOfPower(pw), squareX(P().square));
            var band2 = targetBand(P().square), inBand = zOfPower(pw) >= band2.z0 && zOfPower(pw) <= band2.z1;
            drawStone(gp.x, gp.y, Math.max(6, G.h0 * 0.14 * gp.s), 0.55);
            ctx.strokeStyle = inBand ? C.green : rgba(C.ink, 0.85); ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
            ctx.beginPath(); ctx.ellipse(gp.x, gp.y, 16 * gp.s + 6, (16 * gp.s + 6) * 0.55, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
          }
        } else if (phase === 'aim' && who === 'you') {
          chalkText('Hold…', mx - 14, bot + 2, clamp(H * 0.035, 12, 18), C.gold, 'right');
        }
      }
      function puff(z, x, n, c) {
        var p = P2(z, x), now = performance.now();
        for (var i = 0; i < (reduced ? Math.min(3, n) : n); i++) fx.push({ x: p.x, y: p.y, c: c, vx: (api.random() - 0.5) * 50 * p.s, vy: -api.random() * 22 * p.s, r: 2 + api.random() * 3 * p.s, born: now, life: 380 + api.random() * 260 });
      }
      function floatText(text, colour, z, x, size) {
        var p = P2(z == null ? -0.6 : z, x || 0);
        floaters.push({ text: text, colour: colour, x: clamp(p.x, 70, W - 70), y: p.y - G.kid * p.s * 1.25, size: size || clamp(G.h0 * 0.42, 15, 30), born: performance.now(), life: 800 });
        if (floaters.length > 3) floaters.shift();
      }

      /* ---------- the loop ---------- */
      function frame() {
        rafId = 0;
        if (destroyed) return;
        var now = performance.now();
        if (resumeAt && now >= resumeAt) { resumeAt = 0; releaseClock(); syncData(); }
        if (state === 'playing' && !resumeAt) step(gnow());
        fx = fx.filter(function (p) { return now - p.born < p.life; });
        floaters = floaters.filter(function (f) { return now - f.born < f.life; });
        if (state === 'over' && overAt && now >= overAt) { overAt = 0; showOver(); }
        draw();
        if (wantLoop()) rafId = window.requestAnimationFrame(frame);
      }
      function wantLoop() { return !destroyed && !document.hidden && (state === 'playing' || overAt > 0 || fx.length > 0 || floaters.length > 0); }
      function startLoop() { if (!rafId && !destroyed && !document.hidden) rafId = window.requestAnimationFrame(frame); }
      function stopLoop() { if (rafId) window.cancelAnimationFrame(rafId); rafId = 0; }
      function setPhase(p, t) { phase = p; phaseAt = t; syncData(); updatePad(); }

      function step(t) {
        if (phase === 'think' && t - phaseAt >= (reduced ? 150 : 350)) { holding = true; holdAt = t; setPhase('aim', t); cpuReleaseAt = cpuAimTime(t); }
        if (phase === 'aim' && who === 'cpu' && holding && t >= cpuReleaseAt) release(t);
        if (phase === 'stone' && t - stone.at >= stone.dur) landStone(t);
        if (phase === 'stoneIn' && t - phaseAt >= 450) startHops(t);
        if (phase === 'hop') {
          /* the metronome ticks on every beat, count-in included */
          var bi = Math.floor((t - beatTime(-COUNT_IN)) / interval);
          if (bi > tickedBeat && bi < COUNT_IN + steps.length) { tickedBeat = bi; api.sound('tick'); }
          /* the computer's presses */
          while (cpuEvents.length && t >= cpuEvents[0].t && phase === 'hop') { var ev = cpuEvents.shift(); resolve(ev.action, ev.t); }
          /* a pending single foot press that never became both feet */
          if (pend && t - pend.t > L.chord) { var pd = pend; pend = null; resolve(pd.side === 'L' ? 'left' : 'right', pd.t); }
          if (phase === 'hop' && cur < steps.length && t > beatTime(cur) + L.win + GRACE && !(pend && pend.t <= beatTime(cur) + L.win)) fault('late', beatTime(cur) + L.win);
        }
        if (phase === 'fault' && t - phaseAt >= 1300) endTurn(t);
        if (phase === 'cleared' && t - phaseAt >= 900) nextSquare(t);
        if (phase === 'turnover' && t - phaseAt >= 1200) beginTurn(t);
      }

      /* ---------- throwing the stone ---------- */
      function pressThrow(t) {
        if (state !== 'playing' || resumeAt || phase !== 'aim' || who !== 'you' || holding) return;
        holding = true; holdAt = t == null ? gnow() : t;
        api.sound('click');
        syncData();
      }
      function releaseThrow(t) {
        if (state !== 'playing' || resumeAt || phase !== 'aim' || who !== 'you' || !holding) return;
        release(t == null ? gnow() : Math.max(t, holdAt));
      }
      function release(t) {
        holding = false;
        var pw = meterPower(t);
        var sq = P().square;
        stone = { z: zOfPower(pw), x: squareX(sq), from: { z: -0.45, x: AIM_X + 0.3 }, at: t, dur: 520, picked: false };
        setPhase('stone', t);
        api.sound('whoosh');
      }
      function landStone(t) {
        var sq = P().square, r = rowOf(sq), band = targetBand(sq);
        var ok = stone.z >= band.z0 && stone.z <= band.z1;
        api.sound('clack');
        puff(stone.z, stone.x, 6);
        if (ok) {
          floatText('In!', C.green, stone.z, stone.x);
          api.sound('chalk');
          setPhase('stoneIn', t);
          api.status((who === 'cpu' ? 'The computer’s stone is in square ' : 'Your stone is in square ') + sq + '. ' + (who === 'cpu' ? 'Watch it hop.' : 'Hop the court on the beat!'));
        } else {
          var onLine = Math.abs(stone.z - Math.round(stone.z)) < STONE_R + 0.05 && stone.z > -0.2 && stone.z < ROWS.length + 0.2;
          var why = onLine ? 'The stone landed on a line.' : stone.z < r ? 'Too short! The stone missed square ' + sq + '.' : 'Too far! The stone went past square ' + sq + '.';
          faultPos = { z: stone.z, x: stone.x };
          floatText(onLine ? 'On the line!' : stone.z < r ? 'Too short!' : 'Too far!', C.red, stone.z, stone.x);
          fault('toss', t, why);
        }
      }
      /* The computer holds the button and lets go: on target if it is having a good throw, otherwise a little out. */
      function cpuAimTime(t) {
        var band = targetBand(P().square);
        var zc = (band.z0 + band.z1) / 2;
        if (api.random() > L.cpuToss) zc += (api.random() < 0.5 ? -1 : 1) * ((band.z1 - band.z0) / 2 + 0.06 + api.random() * 0.25);
        else zc += (api.random() - 0.5) * (band.z1 - band.z0) * 0.6;
        var p = clamp((zc - Z_MIN) / Z_SPAN, 0, 1);
        return t + p * L.meter / 2;
      }

      /* ---------- hopping ---------- */
      function startHops(t) {
        steps = buildSteps(P().square);
        cur = 0; landedAt = []; pend = null; lastSingle = null; tickedBeat = -1;
        interval = L.beat * Math.pow(0.985, P().square - 1);
        seqStart = t;
        setPhase('hop', t);
        if (who === 'cpu') planCpu(); else cpuEvents = [];
        if (who === 'you') api.status('Square ' + P().square + ': hop on the beat. ' + describeFirst());
      }
      function describeFirst() {
        var st = steps[0];
        return st.need === 'both' ? 'Start with both feet in 2 and 3.' : st.need === 'one' ? 'Start on one foot.' : 'Start on one foot, on the side without your stone.';
      }
      function planCpu() {
        cpuEvents = []; cpuWillClear = false;
        for (var i = 0; i < steps.length; i++) {
          var b = beatTime(i), st = steps[i];
          if (api.random() > L.cpuStep) {
            var roll = api.random();
            if (roll < 0.4) cpuEvents.push({ t: b - L.win - 40 - api.random() * 80, action: correctAction(st) });
            else if (roll < 0.7) { /* too slow: no press at all */ }
            else cpuEvents.push({ t: b + (api.random() - 0.5) * 30, action: wrongAction(st) });
            return;
          }
          cpuEvents.push({ t: b + (api.random() - 0.5) * L.win * 0.6, action: correctAction(st) });
        }
        cpuWillClear = true;
      }
      function correctAction(st) { return st.need === 'one' ? (api.random() < 0.5 ? 'left' : 'right') : st.need; }
      function wrongAction(st) {
        if (st.need === 'both') return 'left';
        if (st.need === 'left') return 'right';
        if (st.need === 'right') return 'left';
        if (st.need === 'pick') return 'both';
        return 'both';
      }
      function matches(need, action) {
        if (need === 'one') return action === 'left' || action === 'right';
        return need === action;
      }
      function wrongWhy(st, action) {
        if (st.need === 'pick') return 'You hopped on without picking up your stone!';
        if (action === 'pick') return 'You stooped when you should have hopped!';
        if (st.kind === 'out') return 'Land on both feet when you hop out of the court!';
        if (st.need === 'one') return 'Two feet down in a single square!';
        if (st.need === 'both') return 'Both feet down here, one in each square!';
        return 'You landed in the square with your stone!';
      }
      /* Judge one landing. action: left | right | both | pick, at game time t. */
      function resolve(action, t) {
        if (state !== 'playing' || phase !== 'hop' || cur >= steps.length) return;
        var st = steps[cur], b = beatTime(cur), d = t - b;
        if (d < -L.win) {
          if (t < b - interval * 0.55) return;          /* nowhere near a beat: a stray tap, ignored */
          fault('early', t);
          return;
        }
        if (d > L.win) return;
        if (!matches(st.need, action)) { fault('wrong', t, wrongWhy(st, action), st.need === 'pick' || action === 'pick' ? 'Oops!' : 'Wrong foot!'); return; }
        landedAt[cur] = action;
        var pos = stepPos(cur);
        var perfect = Math.abs(d) <= L.perfect;
        if (st.kind === 'pick') {
          stone.picked = true;
          api.sound('pop');
          floatText('Got it!', C.gold, pos.z, pos.x);
        } else {
          api.sound(st.kind === 'out' ? 'chalk' : 'thud');
          puff(pos.z, pos.x + (st.need === 'both' ? -0.25 : 0), 4);
          if (st.need === 'both') puff(pos.z, pos.x + 0.25, 4);
          if (perfect && who === 'you') floatText('Perfect!', C.gold, pos.z, pos.x, clamp(G.h0 * 0.34, 13, 24));
        }
        flashPad(action);
        cur++;
        syncData();
        if (cur >= steps.length) squareDone(t);
      }
      function footDown(side, t) {
        if (state !== 'playing' || resumeAt || phase !== 'hop' || who !== 'you') return;
        if (pend && pend.side !== side && t - pend.t <= L.chord) { var t0 = pend.t; pend = null; resolve('both', t0); return; }
        if (pend) return;
        if (lastSingle && lastSingle.side !== side && t - lastSingle.t <= L.chord) return;   /* a stray second foot */
        var need = curNeed();
        if (need === 'both') { pend = { side: side, t: t }; return; }
        lastSingle = { side: side, t: t };
        resolve(side === 'L' ? 'left' : 'right', t);
      }
      function bothDown(t) { if (state === 'playing' && !resumeAt && phase === 'hop' && who === 'you') { pend = null; resolve('both', t); } }
      function pickDown(t) { if (state === 'playing' && !resumeAt && phase === 'hop' && who === 'you') { pend = null; resolve('pick', t); } }

      function squareDone(t) {
        var p = P();
        var sq = p.square;
        p.square++;
        api.sound('coin');
        floatText('Square ' + sq + ' cleared!', C.leaf, 2, 0, clamp(G.h0 * 0.48, 16, 34));
        api.announce((who === 'cpu' ? 'The computer cleared square ' : 'You cleared square ') + sq);
        stone = null;
        setPhase('cleared', t);
        renderScore();
      }
      function nextSquare(t) {
        if (P().square > LAST) { win(t); return; }
        beginThrow(t);
      }
      function fault(why, t, text, label) {
        if (phase === 'fault') return;
        pend = null; cpuEvents = [];
        faultWhy = why + (phase === 'hop' && steps[cur] ? ':' + steps[cur].kind + ':' + steps[cur].need + ':' + Math.round(t - beatTime(cur)) : '');
        if (why !== 'toss') { var kp = kidNow(t); faultPos = { z: kp.z, x: kp.x }; }
        setPhase('fault', t);
        api.sound('wrong'); api.sound('thud');
        if (!reduced) shakeUntil = performance.now() + 350;
        if (faultPos) puff(faultPos.z, faultPos.x, 10, C.red);
        var msg = text || (why === 'early' ? 'Too early! You stepped on a line.' : why === 'late' ? 'Too slow! You lost your balance and put a foot down.' : 'You stepped on a line.');
        if (why !== 'toss') floatText(label || (why === 'early' ? 'Too early!' : why === 'late' ? 'Too slow!' : 'Wrong foot!'), C.red, faultPos ? faultPos.z : 0, faultPos ? faultPos.x : 0);
        api.status((who === 'cpu' ? 'The computer is out: ' : '') + msg + ' Turn over.');
      }
      function endTurn(t) {
        stone = null;
        if (mode === 'cpu') who = who === 'you' ? 'cpu' : 'you';
        P().turns++;
        if (mode === 'solo') players.you.turns = P().turns;
        renderScore();
        setPhase('turnover', t);
        faultPos = null;
        floatText(mode === 'cpu' ? (who === 'cpu' ? 'Computer’s turn' : 'Your turn') : 'Turn ' + P().turns, who === 'cpu' ? C.peacock : C.gold, -0.6, 0, clamp(G.h0 * 0.5, 18, 36));
        api.status(mode === 'cpu' ? (who === 'cpu' ? 'Computer’s turn. It throws for square ' + P().square + '.' : 'Your turn! Throw for square ' + P().square + '.') : 'Turn ' + P().turns + '. Try square ' + P().square + ' again.');
      }
      function beginTurn(t) { beginThrow(t); }
      function beginThrow(t) {
        stone = null; holding = false; steps = []; cur = 0;
        if (who === 'cpu') { setPhase('think', t); api.status('The computer is aiming for square ' + P().square + '…'); }
        else { setPhase('aim', t); api.status('Square ' + P().square + ': hold to swing the meter, let go when it is level with your square.'); }
        renderScore();
      }
      function win(t) {
        winner = who;
        state = 'over';
        setPhase('won', t);
        overAt = performance.now() + 900;
        pauseBtn.disabled = true;
        setTouchAction(false);
        var turns = players.you.turns;
        if (mode === 'solo') {
          newBest = !best[levelKey] || turns < best[levelKey];
          if (newBest) { best[levelKey] = turns; api.store.set('best-' + levelKey, turns); }
          api.status('You cleared the court in ' + turns + ' turn' + (turns === 1 ? '' : 's') + '!' + (newBest ? ' A new best!' : ' Best: ' + best[levelKey] + '.'));
          api.celebrate('Court cleared in ' + turns + ' turn' + (turns === 1 ? '' : 's') + '!' + (newBest ? ' New best!' : ''));
        } else if (winner === 'you') {
          wins.you++; api.store.set('wins', wins);
          api.status('You win! You cleared all ten squares before the computer.');
          api.celebrate('You beat the computer at hopscotch!');
        } else {
          wins.cpu++; api.store.set('wins', wins);
          api.sound('lose');
          api.status('The computer cleared the court first. Have another go, you were on square ' + players.you.square + '.');
        }
        renderScore();
        updatePad();
        syncData();
      }
      function showOver() {
        if (mode === 'solo') { ovTitle.textContent = newBest ? 'New best!' : 'Court cleared!'; ovMsg.textContent = 'All ten squares in ' + players.you.turns + ' turn' + (players.you.turns === 1 ? '' : 's') + '.'; ovSub.textContent = 'Best on ' + L.label + ': ' + best[levelKey] + ' turns'; }
        else { ovTitle.textContent = winner === 'you' ? 'You win!' : 'Computer wins'; ovMsg.textContent = winner === 'you' ? 'You cleared the court first.' : 'It cleared the court while you were on square ' + players.you.square + '.'; ovSub.textContent = 'Games won: you ' + wins.you + ', computer ' + wins.cpu; }
        ovBtn.textContent = '▶ Play again';
        overlay.hidden = false;
        fitCard();
      }
      /* Skip the rest of the computer's turn: play it out instantly with the same chances it was playing with. */
      function skipCpu() {
        if (state !== 'playing' || who !== 'cpu' || resumeAt || phase === 'won') return;
        var t = gnow(), p = players.cpu, cleared = [], first = true, ok;
        if (phase === 'fault') { endTurn(t); return; }
        while (p.square <= LAST) {
          var hopChance = Math.pow(L.cpuStep, buildSteps(p.square).length);
          if (first && phase === 'hop') ok = cpuWillClear;
          else if (first && phase === 'stone') { var band = targetBand(p.square); ok = stone.z >= band.z0 && stone.z <= band.z1 && api.random() < hopChance; }
          else if (first && phase === 'stoneIn') ok = api.random() < hopChance;
          else if (first && phase === 'cleared') { first = false; continue; }
          else ok = api.random() < L.cpuToss * hopChance;
          first = false;
          if (!ok) break;
          cleared.push(p.square); p.square++;
        }
        cpuEvents = []; pend = null; stone = null; faultPos = null; steps = []; cur = 0; holding = false;
        if (p.square > LAST) { win(t); return; }
        who = 'you'; players.you.turns++;
        renderScore();
        setPhase('turnover', t);
        phaseAt = t - 700;
        api.status((cleared.length ? 'The computer cleared square' + (cleared.length > 1 ? 's ' : ' ') + cleared.join(', ') + ', then stepped on a line. ' : 'The computer stepped on a line. ') + 'Your turn! Throw for square ' + players.you.square + '.');
      }

      /* ---------- flow ---------- */
      function renderScore() {
        scoreEl.replaceChildren();
        if (mode === 'solo') {
          scoreEl.appendChild(h('span', null, 'Square ', h('strong', null, String(Math.min(players.you.square, LAST))), ' of 10'));
          scoreEl.appendChild(h('span', null, 'Turn ', h('strong', null, String(players.you.turns))));
          if (best[levelKey]) scoreEl.appendChild(h('span', null, 'Best ', h('strong', null, String(best[levelKey])), ' turns'));
        } else {
          scoreEl.appendChild(h('span', null, 'You: square ', h('strong', null, String(Math.min(players.you.square, LAST)))));
          scoreEl.appendChild(h('span', { class: 'cpu' }, 'Computer: square ', h('strong', null, String(Math.min(players.cpu.square, LAST)))));
          scoreEl.appendChild(h('span', null, 'Wins ', h('strong', null, String(wins.you)), ' to ', h('strong', null, String(wins.cpu))));
        }
      }
      function updatePad() {
        var aiming = state === 'playing' && (phase === 'aim' || phase === 'think' || phase === 'stone' || phase === 'stoneIn') && who === 'you';
        var cpuTurn = state === 'playing' && who === 'cpu';
        bThrow.hidden = !(aiming || state !== 'playing') || cpuTurn;
        bSkip.hidden = !cpuTurn;
        [bLeft, bBoth, bRight, bPick].forEach(function (b) { b.hidden = !bThrow.hidden || cpuTurn; });
        var labelText = state === 'idle' ? 'Start' : state === 'over' ? 'Play again' : state === 'paused' ? 'Resume' : 'Hold to throw';
        var subText = state === 'playing' ? 'hold Space, let go to throw' : state === 'paused' ? 'or press P' : 'or press Space';
        if (bThrow.firstChild.nodeValue !== labelText) bThrow.firstChild.nodeValue = labelText;
        if (bThrow.lastChild.textContent !== subText) bThrow.lastChild.textContent = subText;
        var need = curNeed();
        var hint = L === LEVELS.easy && who === 'you' ? need : '';
        bLeft.classList.toggle('hint', hint === 'left' || hint === 'one');
        bRight.classList.toggle('hint', hint === 'right' || hint === 'one');
        bBoth.classList.toggle('hint', hint === 'both');
        bPick.classList.toggle('hint', hint === 'pick');
      }
      var flashTimer = 0;
      function flashPad(action) {
        var b = action === 'left' ? bLeft : action === 'right' ? bRight : action === 'both' ? bBoth : bPick;
        b.classList.add('down');
        clearTimeout(flashTimer);
        flashTimer = setTimeout(function () { [bLeft, bBoth, bRight, bPick].forEach(function (x) { x.classList.remove('down'); }); }, 140);
        updatePad();
      }
      function resetGame() {
        players = { you: { square: 1, turns: 1 }, cpu: { square: 1, turns: 1 } };
        who = 'you'; winner = null; newBest = false;
        stone = null; steps = []; cur = 0; holding = false; pend = null; cpuEvents = []; faultPos = null;
        fx = []; floaters = []; overAt = 0;
      }
      function newGame(autoStart) {
        stopLoop();
        resumeAt = 0; pausedAt = null; clockBase = performance.now();
        resetGame();
        state = 'idle'; phase = 'rest';
        pauseBtn.disabled = true; pauseBtn.textContent = 'Pause'; pauseBtn.setAttribute('aria-pressed', 'false');
        setTouchAction(false);
        renderScore();
        if (autoStart) { start(); return; }
        ovTitle.textContent = 'Hopscotch';
        ovMsg.textContent = mode === 'cpu' ? 'Take turns with the computer. First to clear all ten squares wins.' : 'Throw your stone, then hop the court on the beat without touching a line.';
        ovSub.textContent = mode === 'solo' ? (best[levelKey] ? 'Best on ' + L.label + ': ' + best[levelKey] + ' turns' : '') : 'Games won: you ' + wins.you + ', computer ' + wins.cpu;
        ovBtn.textContent = '▶ Start';
        overlay.hidden = false;
        fitCard();
        api.status('Press Start. Throw your stone into square 1, then hop the court on the beat.');
        updatePad();
        syncData();
        draw();
      }
      function start() {
        stopLoop();
        resetGame();
        clockBase = performance.now(); pausedAt = null; resumeAt = 0;
        state = 'playing';
        overlay.hidden = true;
        pauseBtn.disabled = false; pauseBtn.textContent = 'Pause'; pauseBtn.setAttribute('aria-pressed', 'false');
        setTouchAction(true);
        api.sound('chalk');
        renderScore();
        beginThrow(0);
        startLoop();
      }
      function overlayAction() { if (state === 'paused') resume(); else start(); focusGame(); }
      function togglePause() { if (state === 'playing') pause(); else if (state === 'paused') resume(); }
      function pause() {
        if (state !== 'playing') return;
        state = 'paused';
        holdClock(); resumeAt = 0;
        if (who === 'you') holding = false;
        stopLoop();
        pauseBtn.textContent = 'Resume'; pauseBtn.setAttribute('aria-pressed', 'true');
        ovTitle.textContent = 'Paused';
        ovMsg.textContent = 'The court will wait for you.';
        ovSub.textContent = mode === 'solo' ? 'Square ' + players.you.square + ', turn ' + players.you.turns : 'You: square ' + players.you.square + ', computer: square ' + players.cpu.square;
        ovBtn.textContent = '▶ Resume';
        overlay.hidden = false;
        fitCard();
        updatePad();
        api.status('Paused. Press Resume to carry on.');
        syncData();
        draw();
      }
      function resume() {
        if (state !== 'paused') return;
        state = 'playing';
        overlay.hidden = true;
        pauseBtn.textContent = 'Pause'; pauseBtn.setAttribute('aria-pressed', 'false');
        /* a hop sequence restarts its count-in from the next landing so nobody is caught mid-air */
        if (phase === 'hop' && cur < steps.length) {
          var t = gnow(), shift = COUNT_IN * interval - (beatTime(cur) - t);
          if (shift > 0) {
            seqStart += shift;
            tickedBeat = Math.floor((t - beatTime(-COUNT_IN)) / interval);
            cpuEvents.forEach(function (ev) { ev.t += shift; });
          }
        }
        resumeAt = performance.now() + (reduced ? 600 : 1200);
        api.status('Get ready…');
        updatePad();
        startLoop();
      }
      function setLevel(k) {
        if (!LEVELS[k] || (k === levelKey && state === 'idle')) return;
        levelKey = k; L = LEVELS[k];
        api.store.set('level', k);
        LEVEL_KEYS.forEach(function (x) { levelBtns[x].setAttribute('aria-pressed', String(x === k)); });
        newGame(false);
      }
      function setMode(m) {
        if (m === mode && state === 'idle') return;
        mode = m;
        api.store.set('mode', m);
        modeBtns.solo.setAttribute('aria-pressed', String(m === 'solo'));
        modeBtns.cpu.setAttribute('aria-pressed', String(m === 'cpu'));
        newGame(false);
      }
      /* If the card is taller than the picture on a small screen, drop the message line (the status line above
         says the same thing). */
      function fitCard() {
        ovMsg.hidden = false;
        var card = ovMsg.parentNode;
        if (card && card.scrollHeight > card.clientHeight + 1) ovMsg.hidden = true;
      }
      /* Holding to throw and two-finger taps are part of play, so the canvas takes all touches only while a game is on. */
      function setTouchAction(on) { canvas.style.touchAction = on ? 'none' : 'manipulation'; }
      function focusGame() { try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }

      /* Read-only numbers for the automated test. */
      function syncData() {
        var d = canvas.dataset;
        d.state = state; d.phase = phase; d.who = who; d.mode = mode;
        d.square = String(P().square); d.turns = String(players.you.turns); d.youSquare = String(players.you.square); d.cpuSquare = String(players.cpu.square);
        d.need = curNeed(); d.step = String(cur); d.steps = String(steps.length);
        d.beatAt = phase === 'hop' && cur < steps.length ? String(Math.round(realOf(beatTime(cur)))) : '';
        d.win = String(L.win); d.chord = String(L.chord);
        var band = targetBand(Math.min(P().square, LAST));
        d.aimFrom = String(Math.round(((band.z0 - Z_MIN) / Z_SPAN) * L.meter / 2)); d.aimTo = String(Math.round(((band.z1 - Z_MIN) / Z_SPAN) * L.meter / 2));
        d.holdAt = holding ? String(Math.round(realOf(holdAt))) : '';
        d.why = phase === 'fault' ? faultWhy : '';
      }

      /* ---------- input ---------- */
      var KEYS = { ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', l: 'R', L: 'R', ArrowUp: 'B', w: 'B', W: 'B', ArrowDown: 'P', s: 'P', S: 'P' };
      function onKey(e) {
        if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
        var k = e.key, tgt = e.target;
        if (tgt && tgt.closest && tgt.closest('input, select, textarea')) return;
        var inRoot = !!(tgt && root.contains(tgt));
        if (k === 'p' || k === 'P') { if (state === 'playing' || state === 'paused') { e.preventDefault(); togglePause(); } return; }
        var isSpace = k === ' ' || k === 'Spacebar';
        var role = isSpace ? 'SPACE' : k === 'Enter' ? 'ENTER' : KEYS[k];
        if (!role) return;
        if (state === 'playing') {
          if (!inRoot && tgt && tgt !== document.body && tgt.closest && tgt.closest('a, button, summary')) return;
          e.preventDefault();
          if (e.repeat) return;
          var t = evTime(e);
          if (role === 'ENTER') { if (who === 'cpu') skipCpu(); else if (phase === 'hop') pickDown(t); return; }
          if (phase === 'aim' && (role === 'SPACE' || role === 'B')) { pressThrow(t); return; }
          if (role === 'SPACE' || role === 'B') bothDown(t);
          else if (role === 'L' || role === 'R') footDown(role, t);
          else if (role === 'P') pickDown(t);
        } else if (tgt === canvas && (isSpace || k === 'Enter')) {
          e.preventDefault();
          if (state === 'paused') resume(); else start();
        }
      }
      function onKeyUp(e) {
        if (destroyed) return;
        var k = e.key;
        if ((k === ' ' || k === 'Spacebar' || k === 'ArrowUp' || k === 'w' || k === 'W') && holding && who === 'you') { e.preventDefault(); releaseThrow(evTime(e)); }
      }
      /* Canvas: hold anywhere to throw; tap the left or right half for a foot, two fingers for both, and any tap
         while the stone needs picking up stoops for it. */
      function onPointerDown(e) {
        if (e.button > 0 || state !== 'playing') return;
        e.preventDefault();
        if (phase === 'aim') { try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } pressThrow(evTime(e)); return; }
        var t = evTime(e);
        if (curNeed() === 'pick') { pickDown(t); return; }
        var r = canvas.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        footDown(x < 0.5 ? 'L' : 'R', t);
      }
      function onPointerUp(e) { if (holding && who === 'you') releaseThrow(evTime(e)); }
      function padHandler(role) {
        return function (e) {
          if (e.button > 0) return;
          e.preventDefault();
          if (state !== 'playing') { if (role === 'THROW') { if (state === 'paused') resume(); else start(); focusGame(); } return; }
          var t = evTime(e);
          if (role === 'THROW') { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } pressThrow(t); }
          else if (role === 'SKIP') skipCpu();
          else if (role === 'B') bothDown(t);
          else if (role === 'P') pickDown(t);
          else footDown(role, t);
        };
      }
      function onVisibility() {
        if (document.hidden) { if (state === 'playing') pause(); stopLoop(); }
        else draw();
      }
      function noMenu(e) { e.preventDefault(); }
      document.addEventListener('keydown', onKey);
      document.addEventListener('keyup', onKeyUp);
      document.addEventListener('visibilitychange', onVisibility);
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerUp);
      canvas.addEventListener('contextmenu', noMenu);
      [[bLeft, 'L'], [bRight, 'R'], [bBoth, 'B'], [bPick, 'P'], [bThrow, 'THROW'], [bSkip, 'SKIP']].forEach(function (pair) {
        pair[0].addEventListener('pointerdown', padHandler(pair[1]));
        pair[0].addEventListener('contextmenu', noMenu);
      });
      bThrow.addEventListener('pointerup', onPointerUp);
      bThrow.addEventListener('pointercancel', onPointerUp);

      var lastW = 0, lastDpr = 0;
      function maybeResize() {
        var w = Math.round(stage.clientWidth), r = Math.min(2, window.devicePixelRatio || 1);
        if (w && (w !== lastW || r !== lastDpr)) { lastW = w; lastDpr = r; resize(); }
      }
      var ro = new ResizeObserver(maybeResize);
      ro.observe(stage);
      window.addEventListener('resize', maybeResize);
      if (document.fonts && document.fonts.load) {
        document.fonts.load('700 30px "Cabin Sketch"').then(function () { if (!destroyed) { buildBackground(); draw(); } }, function () {});
      }

      resize();
      newGame(false);

      return {
        destroy: function () {
          destroyed = true;
          stopLoop();
          clearTimeout(flashTimer);
          ro.disconnect();
          window.removeEventListener('resize', maybeResize);
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('keyup', onKeyUp);
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }
  });
})();
