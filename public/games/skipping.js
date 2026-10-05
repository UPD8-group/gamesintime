/* Skipping (long rope) for Games in Time.

   Two turners swing a long rope. You run in, then jump every time the rope slaps the ground, while the turners chant
   real skipping rhymes word by word. The turners speed up after every rhyme, turn swiftly at "pepper", and finish
   with "Pepper, salt, mustard, cider, vinegar", which gets faster and faster until you trip.

   History followed (all from Alice Bertha Gomme, The Traditional Games of England, Scotland and Ireland, vol. 2,
   London: David Nutt, 1898, entry "Skipping", pages 200 to 204):
   - Two girls turn a long rope and skippers run in and jump; "while 'in' jumping, the turners time the skippers'
     movements by a sing song".
   - Every rhyme below is quoted exactly as printed there, with the place it was collected.
   - "At pepper turn swiftly" (printed under "Up and down the city wall", Deptford) is the only rhyme that speeds the
     rope up mid-rhyme here, because it is the only one Gomme says to speed up.
   - "Pepper, salt, mustard, cider, vinegar": "Two girls turn the rope slowly at first, repeating the above words, then
     they turn it as quickly as possible until the skipper is tired out, or trips." That is the finale.
   - Strutt (1801), quoted by Gomme: "he who passes the rope about most times without interruption is the conqueror",
     so the score is the number of jumps.

   Timing: the beat is the moment the rope reaches the ground. Every turn of the rope has a start time and a length in
   milliseconds of game time (game time stops while paused). A jump counts for a beat if it starts between `early` ms
   before and `late` ms after the rope reaches the ground. All times come from performance.now().
   The canvas carries read-only data-* attributes (phase, beat times, windows) so the automated test can play. */
(function () {
  'use strict';

  /* ---------- the rhymes ----------
     Each line is split into the chunks chanted on one turn of the rope. A chunk starting with "+" joins the one before
     it without a space. Joined back together, the chunks give the rhyme exactly as Gomme printed it. */
  var RHYMES = [
    { place: 'Deptford', page: 203, lines: [['My mother', 'said'], ['That the rope must', 'go'], ['Over my', 'head.']] },
    { place: 'printed as a “rhyme to time the jumps”', page: 204, lines: [['Cups and', 'saucers,'], ['Plates and', 'dishes,'], ['My old', 'man wears'], ['Calico', 'breeches.']] },
    { place: 'Deptford', page: 204, lines: [['Andy', 'Pandy,'], ['Sugardy', 'candy,'], ['French', 'almond'], ['Rock.']] },
    { place: 'Paddington Green', page: 202, lines: [['Up and', 'down the', 'ladder', 'wall,'], ['Ha’penny', 'loaf to', 'feed us', 'all;'], ['A bit for', 'you, and a', 'bit for', 'me,'], ['And a bit for', 'Punch and', 'Judy.']] },
    { place: 'Deptford', page: 202, lines: [['When I was young', 'and able,'], ['I sat upon', 'the table;'], ['The table', 'broke,'], ['And gave me', 'a poke,'], ['When I was young', 'and able.']] },
    { place: 'Crockham Hill, Kent', page: 202, lines: [['Half pound', 'tuppeny', 'rice,'], ['Half a', 'pound of', 'treacle,'], ['Penny', '’orth of', 'spice'], ['To make', 'it nice,'], ['Pop goes', 'the weazle.']] },
    { place: 'Deptford', page: 203, lines: [['Dancing', 'Dolly', 'had no', 'sense,'], ['For to', 'fiddle for', 'eighteen', '+pence;'], ['All the', 'tunes that', 'she could', 'play,'], ['Were “Sally', 'get out of', 'the donkey’s', 'way.”']] },
    { place: 'Deptford', page: 203, pepper: true, lines: [['Up and', 'down the', 'city', 'wall,'], ['Ha’penny', 'loaf to', 'feed us', 'all;'], ['I buy', 'milk,', 'you buy', 'flour,'], ['You shall have', 'pepper', 'in half', 'an hour.']] },
    { place: 'Deptford', page: 204, lines: [['Knife and', 'fork,'], ['Lay the', 'cloth,'], ['Dont', 'forget the', 'salt,'], ['Mustard,', 'vinegar,'], ['Pepper!']] }
  ];
  var FINALE = { page: 200, words: ['Pepper,', 'salt,', 'mustard,', 'cider,', 'vinegar.'] };
  var PEPPER_COUNTS = 6;            /* extra fast turns after "pepper", counted out (a game adaptation) */
  var CHANT = [784, 784, 659, 880, 784, 659];   /* the playground "sol sol mi la sol mi" chant */

  /* Difficulty. Times in ms. period: one turn of the rope in the first rhyme; speedUp: per rhyme; minPeriod: slowest
     the speed-ups go; floor: the fastest the rope ever turns (pepper); accel: per turn in the finale. early and late:
     the jump window around the rope reaching the ground (also capped to 45% and 20% of a turn). runIn: how much of a
     turn the "door" stays open for running in. */
  var LEVELS = {
    easy: { label: 'Easy', period: 920, minPeriod: 560, floor: 400, speedUp: 0.955, accel: 0.96, early: 300, late: 120, perfect: 70, runIn: 0.46 },
    normal: { label: 'Normal', period: 800, minPeriod: 470, floor: 330, speedUp: 0.945, accel: 0.955, early: 240, late: 95, perfect: 55, runIn: 0.38 },
    hard: { label: 'Hard', period: 690, minPeriod: 400, floor: 280, speedUp: 0.935, accel: 0.95, early: 190, late: 75, perfect: 45, runIn: 0.32 }
  };
  var LEVEL_KEYS = ['easy', 'normal', 'hard'];
  var IDEAL_LEAD = 30;
  var GRACE = 60;                   /* a late miss is only called this long after the window, so a press already on its way still counts */              /* a perfect jump starts this many ms before the rope reaches the ground */

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
  /* A small seeded random so chalk texture does not flicker from frame to frame. */
  function seeded(seed) {
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function joinChunks(chunks) { return chunks.reduce(function (s, c) { return c.charAt(0) === '+' ? s + c.slice(1) : (s ? s + ' ' + c : c); }, ''); }
  function plain(text) { return text.replace(/[\s,;:.!]+$/, ''); }
  /* The hall's chalk poster font, but falling back to the bold heading font rather than a generic 'cursive' (which is a
     script face on iPads) when the web font cannot load, for example when the site runs offline from a USB stick. */
  function chalkStack(cs) {
    var head = cs.getPropertyValue('--font-head').trim() || 'sans-serif';
    var parts = (cs.getPropertyValue('--font-poster').trim() || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x && !/^(cursive|fantasy)$/i.test(x); });
    return parts.concat([head]).join(', ');
  }

  GamesInTime.register({
    id: 'skipping',
    frame: 'stage',
    mount: function (root, api) {
      var h = api.h;
      var destroyed = false;
      var reduced = !!api.reducedMotion;
      var levelKey = api.store.get('level', 'easy');
      if (!LEVELS[levelKey]) levelKey = 'easy';
      var L = LEVELS[levelKey];
      var best = {};
      LEVEL_KEYS.forEach(function (k) { best[k] = Number(api.store.get('best-' + k, 0)) || 0; });

      /* ---------- DOM ---------- */
      root.appendChild(h('style', null,
        '.game-skipping .sk-toolbar { justify-content: space-between; margin-bottom: .6rem; }' +
        '.game-skipping .sk-settings { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }' +
        '.game-skipping .sk-group { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }' +
        '.game-skipping .sk-score { margin: 0; gap: .3rem .9rem; font-size: clamp(1rem, .9rem + .5vw, 1.25rem); }' +
        '.game-skipping .sk-score strong { color: var(--gold); font-family: var(--sk-chalk, var(--font-poster)); font-size: 1.35em; min-width: 1.6ch; display: inline-block; }' +
        '.game-skipping .sk-stage { position: relative; border-radius: 14px; overflow: hidden; background: var(--bg-2); }' +
        '.game-skipping .sk-canvas { display: block; width: 100%; height: 300px; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: pointer; }' +
        '.game-skipping .sk-canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }' +
        '.game-skipping .sk-overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: 10px; background: color-mix(in srgb, var(--bg) 30%, transparent); }' +
        '.game-skipping .sk-card { background: color-mix(in srgb, var(--surface) 92%, transparent); border: 2px solid var(--line); border-radius: 18px; padding: .8rem 1.1rem .9rem; text-align: center; max-width: 27rem; max-height: 100%; overflow: auto; display: grid; gap: .5rem; justify-items: center; box-shadow: var(--shadow); }' +
        '.game-skipping .sk-title { font-family: var(--sk-chalk, var(--font-poster)); font-weight: 700; font-size: clamp(1.7rem, 1.2rem + 2.6vw, 2.8rem); line-height: 1; color: var(--ink); margin: 0; }' +
        '.game-skipping .sk-msg { margin: 0; color: var(--ink); font-weight: 600; line-height: 1.35; }' +
        '.game-skipping .sk-sub { margin: 0; color: var(--ink-muted); font-size: .92rem; }' +
        '.game-skipping .sk-sub:empty { display: none; }' +
        '.game-skipping .sk-big { min-height: 56px; font-size: 1.25rem; padding: .55rem 1.9rem; }' +
        '.game-skipping .sk-karaoke { margin: 0 0 .6rem; padding: .45rem .8rem .5rem; border-radius: 14px; background: var(--surface-2); border: 2px dashed var(--line); }' +
        '.game-skipping .sk-line { font-family: var(--sk-chalk, var(--font-poster)); font-weight: 700; font-size: clamp(1.25rem, .95rem + 1.5vw, 2rem); line-height: 1.25; min-height: 1.25em; color: var(--ink-muted); text-align: center; overflow-wrap: anywhere; }' +
        '.game-skipping .sk-line span { border-radius: 8px; padding: 0 .12em; }' +
        '.game-skipping .sk-line .sung { color: var(--ink); }' +
        '.game-skipping .sk-line .now { color: var(--on-era); background: var(--gold); }' +
        '.game-skipping .sk-line .count { color: var(--rose); }' +
        '.game-skipping .sk-line .count.now { color: var(--on-era); background: var(--rose); }' +
        '.game-skipping .sk-next { font-family: var(--sk-chalk, var(--font-poster)); font-weight: 700; font-size: clamp(.95rem, .85rem + .5vw, 1.2rem); color: var(--ink-muted); text-align: center; margin-top: .1rem; min-height: 1.3em; }' +
        '.game-skipping .sk-source { font-size: .8rem; color: var(--ink-muted); text-align: center; margin-top: .2rem; line-height: 1.3; }' +
        '.game-skipping .sk-pad { display: flex; justify-content: center; margin-top: .7rem; }' +
        '.game-skipping .sk-jump { min-height: 60px; width: min(100%, 18rem); font-size: 1.3rem; border-color: var(--gold); touch-action: manipulation; user-select: none; -webkit-user-select: none; }' +
        '.game-skipping .sk-jump:active { background: var(--gold); color: var(--on-era); }' +
        '@media (max-width: 420px) { .game-skipping .sk-overlay { padding: 6px; } .game-skipping .sk-card { padding: .55rem .6rem .65rem; gap: .4rem; } .game-skipping .sk-title { font-size: 1.5rem; } .game-skipping .sk-msg { font-size: .9rem; line-height: 1.3; } .game-skipping .sk-big { min-height: 48px; font-size: 1.1rem; padding-inline: 1.3rem; } .game-skipping .sk-card .seg button { padding-inline: .5rem; min-height: 40px; } .game-skipping .sk-toolbar .btn { padding-inline: .8rem; } .game-skipping .seg button { padding-inline: .7rem; } }'));

      var pauseBtn = h('button', { class: 'btn', type: 'button', disabled: true, onclick: function () { togglePause(); focusGame(); } }, 'Pause');
      var newBtn = h('button', { class: 'btn', type: 'button', onclick: function () { newGame(true); focusGame(); } }, 'New game');
      var levelBtns = {};
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Level' }, LEVEL_KEYS.map(function (k) {
        levelBtns[k] = h('button', { type: 'button', 'aria-pressed': String(k === levelKey), onclick: function () { setLevel(k); } }, LEVELS[k].label);
        return levelBtns[k];
      }));
      var jumpsEl = h('strong', null, '0'), comboEl = h('strong', null, '0'), bestEl = h('strong', null, String(best[levelKey]));
      var scoreEl = h('div', { class: 'scoreboard sk-score' }, h('span', null, 'Jumps ', jumpsEl), h('span', null, 'Streak ', comboEl), h('span', null, 'Best ', bestEl));
      var toolbar = h('div', { class: 'game-toolbar sk-toolbar' }, h('div', { class: 'sk-group' }, pauseBtn, newBtn), scoreEl);
      var canvas = h('canvas', { class: 'sk-canvas', role: 'img', tabindex: '0', 'aria-label': 'Two children turn a long skipping rope in a schoolyard while a third waits to run in and jump.' });
      var ovTitle = h('p', { class: 'sk-title' }, 'Skipping');
      var ovMsg = h('p', { class: 'sk-msg' }, '');
      var ovSub = h('p', { class: 'sk-sub' }, '');
      var ovBtn = h('button', { class: 'btn btn-primary sk-big', type: 'button', onclick: function () { overlayAction(); } }, '▶ Start');
      var overlay = h('div', { class: 'sk-overlay' }, h('div', { class: 'sk-card' }, ovTitle, ovMsg, h('div', { class: 'sk-settings' }, levelSeg), ovBtn, ovSub));
      var stage = h('div', { class: 'sk-stage' }, canvas, overlay);
      var lineEl = h('div', { class: 'sk-line' });
      var nextEl = h('div', { class: 'sk-next' });
      var sourceEl = h('div', { class: 'sk-source' });
      var karaoke = h('div', { class: 'sk-karaoke', 'aria-hidden': 'true' }, lineEl, nextEl, sourceEl);
      var jumpBtn = h('button', { class: 'btn sk-jump', type: 'button', 'aria-label': 'Jump, or run in' }, 'Jump');
      var pad = h('div', { class: 'sk-pad' }, jumpBtn);
      var note = h('p', { class: 'game-note' }, 'Keyboard: Space or the Up arrow to run in and to jump. P pauses. On a phone or tablet, tap the picture or the Jump button.');
      root.appendChild(toolbar);
      root.appendChild(karaoke);
      root.appendChild(stage);
      root.appendChild(pad);
      root.appendChild(note);

      var ctx = canvas.getContext('2d');
      var bgCanvas = document.createElement('canvas');
      var W = 300, H = 300, dpr = 1;
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
        C.hairDark = mix(C.bg, C.vermilion, 0.3);
        C.hairGinger = mix(C.vermilion, C.gold, 0.25);
        C.hairFair = mix(C.gold, C.ink, 0.25);
        C.stocking = mix(C.bg, C.ink, 0.22);
        C.boot = mix(C.bg, C.ink, 0.08);
        C.rope = mix(C.gold, C.ink, 0.35);
        FONT = chalkStack(cs);
        root.style.setProperty('--sk-chalk', FONT);
      }

      /* ---------- game clock: game time stops while paused ---------- */
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

      /* ---------- game state ---------- */
      var state = 'idle';           /* idle | playing | paused | over */
      var phase = 'wait';           /* wait (before start) | runin | running | skipping | tangled */
      var resumeAt = 0;             /* real time when a resume countdown ends */
      var lastBeat = 0, nextBeat = 0, curPeriod = 900;
      var firstJumpBeat = Infinity, lastCleared = false, nextCleared = false, doomedAt = null, doomReason = '';
      var jumpStart = -1e9, jumpDur = 400, runStart = 0, runDur = 400, frozenRun = 1;
      var jumps = 0, combo = 0, bestCombo = 0;
      var plan = [], planPos = -1, finaleN = -1, item = null;
      var tangleAt = 0, overAt = 0, tangleReason = '';
      var fx = [], floaters = [], shakeUntil = 0, slapAt = -1e9, newBest = false, sayUntil = 0, sayText = '';
      var rafId = 0;

      function buildPlan() {
        var p = [];
        RHYMES.forEach(function (rh, r) {
          var fast = false;
          rh.lines.forEach(function (line, li) {
            line.forEach(function (chunk, ci) {
              var isPepper = !!rh.pepper && /^pepper/i.test(chunk);
              if (isPepper) fast = true;
              p.push({ kind: 'word', r: r, li: li, ci: ci, fast: fast, pepper: isPepper });
            });
          });
          if (rh.pepper) for (var c = 1; c <= PEPPER_COUNTS; c++) p.push({ kind: 'count', r: r, n: c, fast: true });
        });
        return p;
      }
      function basePeriod(r) { return Math.max(L.minPeriod, L.period * Math.pow(L.speedUp, r)); }
      function periodFor(it, prev) {
        if (!it) return basePeriod(0);
        if (it.kind === 'finale') {
          var b = basePeriod(RHYMES.length);
          if (it.n < 5) return b * 1.15;           /* "slowly at first, repeating the above words" */
          if (it.n < 10) return b;
          return Math.max(L.floor, prev * L.accel); /* "then they turn it as quickly as possible" */
        }
        var p = basePeriod(it.r);
        return it.fast ? Math.max(L.floor, p * 0.7) : p;
      }
      function earlyWin() { return Math.min(L.early, 0.45 * curPeriod); }
      function lateWin() { return Math.min(L.late, 0.2 * curPeriod); }

      /* ---------- layout ---------- */
      var G = {};
      function layout() {
        G.ground = H * 0.86;
        G.S = Math.min(H * 0.36, W * 0.3);
        G.cx = W / 2;
        G.lx = Math.max(W * 0.12, G.S * 0.32 + 6, W / 2 - G.S * 2.5);
        G.rx = W - G.lx;
        G.handOff = G.S * 0.33;
        G.axis = G.ground - G.S * 0.76;
        G.A = G.ground - G.axis;
        G.handR = G.S * 0.1;
        G.waitX = Math.max(G.lx + G.S * 0.55, W * 0.3);
        G.waitDY = H * 0.035;
        G.wallTop = H * 0.1;
        G.wallBase = G.ground - H * 0.08;
      }
      function resize() {
        var w = Math.max(200, Math.round(stage.clientWidth || root.clientWidth || 300));
        var vh = window.innerHeight || 700;
        var hh = w < 480 ? Math.round(clamp(w * 1.1, 290, Math.max(290, vh * 0.52))) : Math.round(clamp(Math.min(w * 0.5, vh * 0.52), 280, 540));
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

      /* ---------- background: dusk sky, a schoolyard brick wall, asphalt ---------- */
      function buildBackground() {
        bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;
        var b = bgCanvas.getContext('2d');
        b.setTransform(dpr, 0, 0, dpr, 0, 0);
        var rnd = seeded(1898);
        var sky = b.createLinearGradient(0, 0, 0, G.wallTop + 2);
        sky.addColorStop(0, C.surface); sky.addColorStop(1, mix(C.surface, C.rose, 0.35));
        b.fillStyle = sky; b.fillRect(0, 0, W, G.wallTop + 2);
        /* the wall */
        b.fillStyle = mix(C.bg, C.ink, 0.1); b.fillRect(0, G.wallTop, W, G.wallBase - G.wallTop);
        var bw = clamp(W / 13, 30, 64), bh = bw * 0.42, row = 0, x, y;
        for (y = G.wallTop + 3; y < G.wallBase; y += bh + 3, row++) {
          for (x = (row % 2 ? -bw / 2 : 0); x < W; x += bw + 3) {
            b.fillStyle = mix(mix(C.bg, C.vermilion, 0.34 + rnd() * 0.12), C.bg2, 0.25);
            b.fillRect(x, y, bw, Math.min(bh, G.wallBase - y));
          }
        }
        b.fillStyle = mix(C.bg, C.ink, 0.28); b.fillRect(0, G.wallTop - 6, W, 9);
        b.fillStyle = mix(C.bg, C.ink, 0.16); b.fillRect(0, G.wallTop + 3, W, 3);
        /* chalk marks on the wall: tally marks and a heart */
        b.strokeStyle = rgba(C.ink, 0.35); b.lineWidth = 2; b.lineCap = 'round';
        var tx = W * 0.83, ty = G.wallTop + (G.wallBase - G.wallTop) * 0.6, i;
        for (i = 0; i < 4; i++) { b.beginPath(); b.moveTo(tx + i * 7, ty); b.lineTo(tx + i * 7 + 1, ty + 22); b.stroke(); }
        b.beginPath(); b.moveTo(tx - 4, ty + 16); b.lineTo(tx + 26, ty + 5); b.stroke();
        b.strokeStyle = rgba(C.rose, 0.4);
        var hx = W * 0.2, hy = G.wallTop + (G.wallBase - G.wallTop) * 0.58, hs = Math.max(10, bw * 0.3);
        b.beginPath(); b.moveTo(hx, hy + hs * 0.9); b.bezierCurveTo(hx - hs * 1.4, hy, hx - hs * 0.5, hy - hs * 0.9, hx, hy - hs * 0.2); b.bezierCurveTo(hx + hs * 0.5, hy - hs * 0.9, hx + hs * 1.4, hy, hx, hy + hs * 0.9); b.stroke();
        /* ground */
        var gr = b.createLinearGradient(0, G.wallBase, 0, H);
        gr.addColorStop(0, mix(C.bg2, C.ink, 0.07)); gr.addColorStop(1, C.bg);
        b.fillStyle = gr; b.fillRect(0, G.wallBase, W, H - G.wallBase);
        b.fillStyle = rgba(C.bg, 0.6); b.fillRect(0, G.wallBase, W, 4);
        for (i = 0; i < W * 0.6; i++) {
          b.fillStyle = rgba(rnd() < 0.5 ? C.ink : C.bg, 0.06 + rnd() * 0.08);
          b.fillRect(rnd() * W, G.wallBase + 4 + rnd() * (H - G.wallBase), 1.5, 1.5);
        }
        /* a chalk ring where the rope lands */
        b.strokeStyle = rgba(C.ink, 0.28); b.lineWidth = 2.5;
        b.beginPath(); b.ellipse(G.cx, G.ground + 2, G.S * 0.42, G.S * 0.07, 0, 0, Math.PI * 2); b.stroke();
      }

      /* ---------- drawing helpers ---------- */
      function rr(c, x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
      function chalkText(text, x, y, size, colour, align, alpha) {
        ctx.save();
        ctx.font = '700 ' + Math.round(size) + 'px ' + FONT;
        ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = (alpha == null ? 1 : alpha);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = rgba(C.bg, 0.75); ctx.lineWidth = Math.max(3, size * 0.14);
        ctx.strokeText(text, x, y);
        ctx.fillStyle = colour; ctx.fillText(text, x, y);
        ctx.restore();
      }

      /* A child drawn simply from the front: boots, stockings, a knee-length dress with a pinafore, a hair bow.
         o: dress, pinafore, sailor, hair, long, cap, bow, arms [{x,y}|null, {x,y}|null] in canvas space, mouth, tuck, tilt */
      function drawKid(x, footY, s, o) {
        ctx.save();
        ctx.translate(x, footY);
        if (o.tilt) ctx.rotate(o.tilt);
        var tuck = o.tuck || 0;
        var hip = -0.42 * s, sh = -0.71 * s, headY = -0.85 * s, hr = 0.12 * s;
        var footY0 = -tuck * 0.1 * s;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        [-1, 1].forEach(function (side) {
          var fx = side * 0.075 * s - side * tuck * 0.03 * s, kneeX = side * (0.07 + tuck * 0.05) * s, kneeY = -0.22 * s - tuck * 0.06 * s;
          ctx.strokeStyle = C.stocking; ctx.lineWidth = 0.075 * s;
          ctx.beginPath(); ctx.moveTo(side * 0.06 * s, hip + 0.05 * s); ctx.lineTo(kneeX, kneeY); ctx.lineTo(fx, footY0); ctx.stroke();
          ctx.fillStyle = C.boot; rr(ctx, fx - 0.065 * s + side * 0.02 * s, footY0 - 0.05 * s, 0.13 * s, 0.07 * s, 0.03 * s); ctx.fill();
          ctx.strokeStyle = rgba(C.ink, 0.35); ctx.lineWidth = 1; ctx.stroke();
        });
        function arm(side, target) {
          var sx = side * 0.13 * s, sy = sh + 0.04 * s, hx, hy;
          if (target) {
            hx = target.x - x; hy = target.y - footY;
            if (o.tilt) { var cs = Math.cos(-o.tilt), sn = Math.sin(-o.tilt), nx = hx * cs - hy * sn, ny = hx * sn + hy * cs; hx = nx; hy = ny; }
          } else { hx = side * (0.2 + tuck * 0.12) * s; hy = sh + (0.3 - tuck * 0.32) * s; }
          var len = Math.hypot(hx - sx, hy - sy), maxLen = 0.42 * s;
          if (len > maxLen) { hx = sx + (hx - sx) * maxLen / len; hy = sy + (hy - sy) * maxLen / len; }
          ctx.strokeStyle = o.dress; ctx.lineWidth = 0.085 * s;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
          ctx.fillStyle = C.skin; ctx.beginPath(); ctx.arc(hx, hy, 0.045 * s, 0, Math.PI * 2); ctx.fill();
        }
        var arms = o.arms || [null, null];
        arm(-1, arms[0]); arm(1, arms[1]);
        ctx.fillStyle = o.dress;
        ctx.beginPath();
        ctx.moveTo(-0.13 * s, sh); ctx.lineTo(0.13 * s, sh);
        ctx.lineTo(0.24 * s, -0.27 * s - tuck * 0.04 * s);
        ctx.quadraticCurveTo(0, -0.22 * s - tuck * 0.05 * s, -0.24 * s, -0.27 * s - tuck * 0.04 * s);
        ctx.closePath(); ctx.fill();
        if (o.pinafore) {
          ctx.fillStyle = rgba(C.ink, 0.92);
          ctx.beginPath();
          ctx.moveTo(-0.09 * s, sh + 0.06 * s); ctx.lineTo(0.09 * s, sh + 0.06 * s);
          ctx.lineTo(0.17 * s, -0.31 * s - tuck * 0.04 * s);
          ctx.quadraticCurveTo(0, -0.27 * s - tuck * 0.05 * s, -0.17 * s, -0.31 * s - tuck * 0.04 * s);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = rgba(C.ink, 0.92); ctx.lineWidth = 0.025 * s;
          ctx.beginPath(); ctx.moveTo(-0.08 * s, sh + 0.06 * s); ctx.lineTo(-0.11 * s, sh); ctx.moveTo(0.08 * s, sh + 0.06 * s); ctx.lineTo(0.11 * s, sh); ctx.stroke();
        }
        if (o.sailor) {
          ctx.fillStyle = rgba(C.ink, 0.92);
          ctx.beginPath(); ctx.moveTo(-0.13 * s, sh); ctx.lineTo(0.13 * s, sh); ctx.lineTo(0, sh + 0.13 * s); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = o.dress; ctx.lineWidth = 0.02 * s; ctx.beginPath(); ctx.moveTo(-0.08 * s, sh + 0.02 * s); ctx.lineTo(0, sh + 0.09 * s); ctx.lineTo(0.08 * s, sh + 0.02 * s); ctx.stroke();
        }
        ctx.fillStyle = C.skin; ctx.beginPath(); ctx.arc(0, headY, hr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = o.hair;
        ctx.beginPath(); ctx.arc(0, headY - hr * 0.15, hr * 1.06, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
        if (o.long) { ctx.beginPath(); ctx.ellipse(-hr * 0.95, headY + hr * 0.5, hr * 0.32, hr * 0.8, 0.15, 0, Math.PI * 2); ctx.ellipse(hr * 0.95, headY + hr * 0.5, hr * 0.32, hr * 0.8, -0.15, 0, Math.PI * 2); ctx.fill(); }
        if (o.cap) {
          ctx.fillStyle = o.cap; ctx.beginPath(); ctx.ellipse(0, headY - hr * 0.72, hr * 1.12, hr * 0.42, 0, Math.PI, 0); ctx.fill();
          ctx.fillRect(-hr * 1.25, headY - hr * 0.78, hr * 2.5, hr * 0.2);
        }
        if (o.bow) {
          ctx.fillStyle = o.bow;
          var bx = hr * 0.6, by = headY - hr * 0.95;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - hr * 0.55, by - hr * 0.35); ctx.lineTo(bx - hr * 0.55, by + hr * 0.3); ctx.closePath();
          ctx.moveTo(bx, by); ctx.lineTo(bx + hr * 0.55, by - hr * 0.35); ctx.lineTo(bx + hr * 0.55, by + hr * 0.3); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.arc(bx, by, hr * 0.14, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = C.bg;
        ctx.beginPath(); ctx.arc(-hr * 0.36, headY + hr * 0.02, Math.max(1.2, hr * 0.1), 0, Math.PI * 2); ctx.arc(hr * 0.36, headY + hr * 0.02, Math.max(1.2, hr * 0.1), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(C.rose, 0.55);
        ctx.beginPath(); ctx.arc(-hr * 0.55, headY + hr * 0.35, hr * 0.16, 0, Math.PI * 2); ctx.arc(hr * 0.55, headY + hr * 0.35, hr * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.skinLine; ctx.fillStyle = C.skinLine; ctx.lineWidth = Math.max(1.2, hr * 0.12);
        if (o.mouth === 'o') { ctx.beginPath(); ctx.ellipse(0, headY + hr * 0.5, hr * 0.17, hr * 0.22, 0, 0, Math.PI * 2); ctx.fill(); }
        else if (o.mouth === 'open') { ctx.beginPath(); ctx.ellipse(0, headY + hr * 0.45, hr * 0.2, hr * 0.13, 0, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(0, headY + hr * 0.3, hr * 0.28, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
        ctx.restore();
      }

      /* Rope geometry for an angle theta (0 = overhead, PI = on the ground, sin > 0 = swinging towards you). */
      function ropeAt(theta) {
        var c = Math.cos(theta);
        var yH = G.axis - G.handR * c;
        var mid = Math.min(G.ground - 1, G.axis - G.A * c);
        return { xL: G.lx + G.handOff, xR: G.rx - G.handOff, y: yH, mid: mid, cy: 2 * mid - yH, front: Math.sin(theta) > 0.02 };
      }
      function drawRope(r, wrapAt) {
        ctx.save();
        ctx.lineCap = 'round';
        var w = Math.max(3.5, G.S * 0.036) * (r.front || wrapAt ? 1.15 : 0.85);
        ctx.beginPath();
        if (wrapAt) {
          ctx.moveTo(r.xL, r.y); ctx.quadraticCurveTo((r.xL + wrapAt.x) / 2, G.ground + 4, wrapAt.x - G.S * 0.1, wrapAt.y);
          ctx.moveTo(wrapAt.x + G.S * 0.1, wrapAt.y); ctx.quadraticCurveTo((r.xR + wrapAt.x) / 2, G.ground + 4, r.xR, r.y);
          ctx.strokeStyle = C.rope; ctx.lineWidth = w; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(wrapAt.x, wrapAt.y, G.S * 0.12, G.S * 0.045, 0.1, 0, Math.PI * 2);
        } else {
          ctx.moveTo(r.xL, r.y); ctx.quadraticCurveTo((r.xL + r.xR) / 2, r.cy, r.xR, r.y);
        }
        ctx.strokeStyle = rgba(C.bg, 0.55); ctx.lineWidth = w + 3; ctx.stroke();
        ctx.strokeStyle = r.front || wrapAt ? C.rope : mix(C.rope, C.bg, 0.3); ctx.lineWidth = w; ctx.stroke();
        /* turned wooden handles */
        ctx.strokeStyle = mix(C.vermilion, C.bg, 0.25); ctx.lineWidth = Math.max(4, G.S * 0.05);
        ctx.beginPath(); ctx.moveTo(r.xL - G.S * 0.05, r.y); ctx.lineTo(r.xL + G.S * 0.02, r.y); ctx.moveTo(r.xR + G.S * 0.05, r.y); ctx.lineTo(r.xR - G.S * 0.02, r.y); ctx.stroke();
        ctx.restore();
      }
      function bubble(text, x, y, colour) {
        var size = clamp(G.S * 0.17, 13, 26);
        ctx.save();
        ctx.font = '700 ' + Math.round(size) + 'px ' + FONT;
        var tw = ctx.measureText(text).width, pw = tw + size * 0.9, ph = size * 1.5;
        var bx = clamp(x - pw / 2, 4, W - pw - 4), by = Math.max(4, y - ph);
        var tipX = clamp(x, bx + 12, bx + pw - 12);
        ctx.fillStyle = rgba(C.ink, 0.95); rr(ctx, bx, by, pw, ph, size * 0.5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(tipX - 6, by + ph - 1); ctx.lineTo(tipX, by + ph + size * 0.45); ctx.lineTo(tipX + 6, by + ph - 1); ctx.fill();
        ctx.fillStyle = colour || C.bg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, bx + pw / 2, by + ph / 2 + 1);
        ctx.restore();
      }

      /* ---------- the frame ---------- */
      function ropeTheta(t) {
        if (phase === 'tangled' || phase === 'wait') return Math.PI;
        return Math.PI + clamp((t - lastBeat) / curPeriod, 0, 1) * Math.PI * 2;
      }
      /* Where the skipper is: 0 = waiting at the front, 1 = in the middle of the rope. */
      function runProgress(t) {
        if (phase === 'wait' || phase === 'runin') return 0;
        if (phase === 'running') return clamp((t - runStart) / runDur, 0, 1);
        if (phase === 'tangled') return frozenRun;
        return 1;
      }
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
        if (!reduced && now < shakeUntil) { var k = (shakeUntil - now) / 380; ctx.translate(Math.sin(now * 0.09) * 6 * k, Math.cos(now * 0.11) * 3 * k); }
        blit(bgCanvas);
        var theta = ropeTheta(t);
        var rope = ropeAt(theta);
        var tangled = phase === 'tangled';
        var chantOpen = state === 'playing' && !tangled && t - lastBeat < 160 && item && item.kind !== 'count';
        /* rope shadow and the slap where it hits the ground */
        var nearGround = clamp(1 - (G.ground - rope.mid) / (G.A * 0.6), 0, 1);
        if (nearGround > 0) { ctx.fillStyle = rgba(C.bg, 0.35 * nearGround); ctx.beginPath(); ctx.ellipse(G.cx, G.ground + 3, G.S * 0.5, G.S * 0.05, 0, 0, Math.PI * 2); ctx.fill(); }
        var slapK = clamp(1 - (t - slapAt) / 220, 0, 1);
        if (slapK > 0 && !tangled) { ctx.strokeStyle = rgba(C.gold, 0.7 * slapK); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(G.cx, G.ground + 2, G.S * (0.45 + (reduced ? 0 : (1 - slapK) * 0.25)), G.S * (0.08 + (reduced ? 0 : (1 - slapK) * 0.04)), 0, 0, Math.PI * 2); ctx.stroke(); }
        /* the turners */
        drawKid(G.lx, G.ground, G.S * 1.12, { dress: C.peacock, pinafore: true, hair: C.hairDark, bow: C.gold, long: true, arms: [null, { x: rope.xL, y: rope.y }], mouth: tangled ? 'o' : chantOpen ? 'open' : 'smile' });
        drawKid(G.rx, G.ground, G.S * 1.15, { dress: C.cobalt, sailor: true, hair: C.hairGinger, cap: mix(C.cobalt, C.bg, 0.45), arms: [{ x: rope.xR, y: rope.y }, null], mouth: tangled ? 'o' : chantOpen ? 'open' : 'smile' });
        /* the skipper */
        var rp = runProgress(t);
        var kx = G.waitX + (G.cx - G.waitX) * rp, ky = G.ground + G.waitDY * (1 - rp), ks = G.S * (1.04 - 0.04 * rp);
        if (phase === 'running') ky -= Math.abs(Math.sin(rp * Math.PI * 3)) * G.S * 0.05;
        var air = 0;
        if (phase === 'running' || phase === 'skipping') {
          var jp = (t - jumpStart) / jumpDur;
          if (jp >= 0 && jp <= 1) air = Math.sin(jp * Math.PI);
        }
        var footY = ky - air * G.S * 0.17;
        var tilt = tangled && !reduced ? -0.18 * clamp((t - tangleAt) / 260, 0, 1) : 0;
        var reach = 0.3 + air * 0.08, lift = 0.5 + air * 0.2;
        var kidOpts = { dress: C.rose, pinafore: true, hair: C.hairFair, bow: C.vermilion, long: true, tuck: air, tilt: tilt, mouth: tangled ? 'o' : (air > 0.2 ? 'open' : 'smile'), arms: [{ x: kx - ks * reach, y: footY - ks * lift }, { x: kx + ks * reach, y: footY - ks * lift }] };
        ctx.fillStyle = rgba(C.bg, 0.45 - air * 0.2); ctx.beginPath(); ctx.ellipse(kx, ky + 2, ks * (0.2 - air * 0.05), ks * 0.04, 0, 0, Math.PI * 2); ctx.fill();
        if (tangled) { drawKid(kx, footY, ks, kidOpts); drawRope(rope, { x: kx, y: ky - G.S * 0.04 }); }
        else if (rp < 0.6 || !rope.front) { drawRope(rope); drawKid(kx, footY, ks, kidOpts); }
        else { drawKid(kx, footY, ks, kidOpts); drawRope(rope); }
        ctx.fillStyle = C.skin;
        ctx.beginPath(); ctx.arc(rope.xL, rope.y, G.S * 0.05, 0, Math.PI * 2); ctx.arc(rope.xR, rope.y, G.S * 0.05, 0, Math.PI * 2); ctx.fill();
        /* run-in cue: the way in opens just after the rope slaps the ground */
        if (state === 'playing' && phase === 'runin') {
          var open = t >= lastBeat && t <= lastBeat + L.runIn * curPeriod;
          var ay = G.ground + G.waitDY * 0.5 + 8;
          ctx.strokeStyle = open ? C.green : rgba(C.ink, 0.35); ctx.lineWidth = open ? 5 : 3; ctx.setLineDash([10, 8]);
          ctx.beginPath(); ctx.moveTo(G.waitX + G.S * 0.25, ay); ctx.lineTo(G.cx - G.S * 0.15, ay); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = open ? C.green : rgba(C.ink, 0.35);
          ctx.beginPath(); ctx.moveTo(G.cx - G.S * 0.04, ay); ctx.lineTo(G.cx - G.S * 0.18, ay - 9); ctx.lineTo(G.cx - G.S * 0.18, ay + 9); ctx.closePath(); ctx.fill();
          chalkText(open ? 'GO!' : 'Wait…', (G.waitX + G.S * 0.25 + G.cx) / 2, ay + clamp(G.S * 0.2, 16, 30), clamp(G.S * 0.22, 16, 34), open ? C.green : C.inkMuted);
        }
        /* the turners talk */
        if (tangled) { bubble('Ohh!', G.lx, G.ground - G.S * 1.14, C.bg); bubble('Tangled!', G.rx, G.ground - G.S * 1.16, C.bg); }
        else if (state === 'playing' && item && item.kind === 'count') { bubble('Pepper! ' + item.n, G.rx, G.ground - G.S * 1.16, C.vermilion); }
        else if (state === 'playing' && item && item.pepper) { bubble('Pepper!', G.lx, G.ground - G.S * 1.14, C.vermilion); }
        else if (state === 'playing' && phase === 'runin') { bubble('Ready?', G.lx, G.ground - G.S * 1.14, C.bg); }
        else if (state === 'playing' && t < sayUntil) { bubble(sayText, G.lx, G.ground - G.S * 1.14, C.bg); }
        /* the score, chalked on the wall */
        var sz = clamp(H * 0.12, 28, 60);
        var label = String(jumps);
        ctx.font = '700 ' + Math.round(sz) + 'px ' + FONT;
        var nw = ctx.measureText(label).width;
        chalkText(label, 14, G.wallTop + sz * 0.72, sz, C.gold, 'left');
        chalkText(jumps === 1 ? 'jump' : 'jumps', 22 + nw, G.wallTop + sz * 0.86, sz * 0.42, C.ink, 'left', 0.85);
        if (state === 'playing' || state === 'paused') chalkText(Math.round(60000 / curPeriod) + ' turns a minute', 14, G.wallTop + sz * 1.45, clamp(sz * 0.36, 12, 20), C.inkMuted, 'left');
        /* floating words */
        floaters.forEach(function (f, i) {
          var fk = clamp((now - f.born) / f.life, 0, 1);
          chalkText(f.text, f.x, f.y - (reduced ? 0 : fk * 30), f.size, f.colour, 'center', 1 - fk * fk);
        });
        /* chalk dust */
        fx.forEach(function (p) {
          var pk = clamp((now - p.born) / p.life, 0, 1);
          ctx.fillStyle = rgba(C.ink, 0.5 * (1 - pk));
          ctx.beginPath(); ctx.arc(p.x + p.vx * pk, p.y + p.vy * pk, p.r * (1 + pk), 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
        if (resumeAt) {
          var left = Math.ceil((resumeAt - now) / ((reduced ? 600 : 1200) / 3));
          ctx.fillStyle = rgba(C.bg, 0.45); ctx.fillRect(0, 0, W, H);
          chalkText(String(clamp(left, 1, 3)), W / 2, H / 2, clamp(H * 0.3, 60, 140), C.gold);
        }
      }
      function puff(x, y, n) {
        var now = performance.now();
        for (var i = 0; i < (reduced ? Math.min(3, n) : n); i++) fx.push({ x: x, y: y, vx: (api.random() - 0.5) * G.S * 0.7, vy: -api.random() * G.S * 0.18, r: 2 + api.random() * 3, born: now, life: 420 + api.random() * 260 });
      }
      function floatText(text, colour, size, top) {
        var s = size || clamp(G.S * 0.22, 16, 34);
        floaters = floaters.filter(function (f) { return f.top !== !!top; });
        floaters.push({ text: text, colour: colour, size: s, top: !!top, x: G.cx, y: top ? G.wallTop + (G.wallBase - G.wallTop) * 0.22 : G.ground - G.S * 1.3, born: performance.now(), life: top ? 1100 : 650 });
      }

      /* ---------- the loop ---------- */
      function frame() {
        rafId = 0;
        if (destroyed) return;
        var now = performance.now();
        if (resumeAt && now >= resumeAt) { resumeAt = 0; releaseClock(); syncData(); api.status(phase === 'runin' ? 'Run in just after the rope slaps the ground.' : 'Jump each time the rope hits the ground.'); }
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

      function needsJump(b) { return (phase === 'running' || phase === 'skipping') && b >= firstJumpBeat - 1; }
      function step(t) {
        if (phase === 'tangled') { if (t - tangleAt > 1100) finish(); return; }
        if (doomedAt != null && t >= doomedAt) { tangle(doomReason, doomedAt); return; }
        var guard = 0;
        while (t >= nextBeat && guard++ < 8) { onBeat(nextBeat); if (phase === 'tangled') return; }
        if (phase === 'running' && t >= runStart + runDur) phase = 'skipping';
        if (needsJump(lastBeat) && !lastCleared && t > lastBeat + lateWin() + GRACE) tangle('late', lastBeat + lateWin());
      }
      function onBeat(b) {
        if (needsJump(lastBeat) && !lastCleared) { tangle('late', lastBeat + lateWin()); return; }
        var prevPeriod = curPeriod;
        lastBeat = b;
        lastCleared = nextCleared; nextCleared = false;
        slapAt = b;
        if (needsJump(b)) {
          item = nextItem();
          curPeriod = periodFor(item, prevPeriod);
          showKaraoke();
          if (item.kind !== 'count' && typeof api.tone === 'function') { try { api.tone(CHANT[(planPos + Math.max(0, finaleN)) % CHANT.length], 0.16, 'triangle', 0.06); } catch (e) { /* ignore */ } }
          if (item.pepper || (item.kind === 'finale' && item.n === 10)) { api.sound('whoosh'); api.status(item.kind === 'finale' ? 'Faster and faster! Keep jumping until you trip.' : 'Pepper! The turners are turning as fast as they can.'); }
        } else {
          curPeriod = basePeriod(0);
        }
        nextBeat = b + curPeriod;
        api.sound('tick');
        if (!reduced) puff(G.cx + (api.random() - 0.5) * G.S * 0.5, G.ground, 2);
        syncData();
      }
      function nextItem() {
        if (planPos < plan.length - 1) {
          planPos++;
          var it = plan[planPos];
          var prev = planPos > 0 ? plan[planPos - 1] : null;
          if (prev && prev.r !== it.r) rhymeDone(it.r);
          else if (!prev) api.status('Rhyme 1 of ' + RHYMES.length + ': “' + plain(joinChunks(RHYMES[0].lines[0])) + '”. Jump each time the rope hits the ground.');
          return it;
        }
        if (finaleN < 0) rhymeDone(-1);
        finaleN++;
        return { kind: 'finale', n: finaleN, wi: finaleN % FINALE.words.length };
      }
      function rhymeDone(nextR) {
        api.sound('bell');
        sayUntil = gnow() + 1300; sayText = nextR < 0 ? 'Pepper time!' : 'Rhyme ' + (nextR + 1) + '!';
        if (nextR >= 0) api.status('Rhyme ' + (nextR + 1) + ' of ' + RHYMES.length + ': “' + plain(joinChunks(RHYMES[nextR].lines[0])) + '”. Keep jumping!');
        else api.status('Pepper, salt, mustard, cider, vinegar: slowly at first, then as fast as they can!');
      }

      /* ---------- karaoke ---------- */
      var shownLineKey = '';
      function renderLine(chunks, key, nowIdx, cls) {
        if (shownLineKey !== key) {
          shownLineKey = key;
          lineEl.replaceChildren();
          chunks.forEach(function (c, i) {
            if (i > 0 && c.charAt(0) !== '+') lineEl.appendChild(document.createTextNode(' '));
            lineEl.appendChild(h('span', null, c.charAt(0) === '+' ? c.slice(1) : c));
          });
        }
        Array.prototype.forEach.call(lineEl.children, function (sp, i) {
          sp.className = (cls ? cls + ' ' : '') + (i < nowIdx ? 'sung' : i === nowIdx ? 'now' : '');
        });
      }
      function sourceText(r) { var rh = RHYMES[r]; return 'Rhyme ' + (r + 1) + ' of ' + RHYMES.length + ' · ' + rh.place + ', in Alice Gomme’s Traditional Games (1898), p. ' + rh.page; }
      function showKaraoke() {
        if (!item) {
          renderLine(RHYMES[0].lines[0], 'pre', -1);
          nextEl.textContent = joinChunks(RHYMES[0].lines[1]);
          sourceEl.textContent = state === 'playing' ? 'Run in and the turners start the chant.' : 'The turners chant rhymes recorded in 1898. Each word lands on one turn of the rope.';
          return;
        }
        if (item.kind === 'word') {
          var rh = RHYMES[item.r];
          renderLine(rh.lines[item.li], 'w' + item.r + '-' + item.li, item.ci);
          nextEl.textContent = item.li + 1 < rh.lines.length ? joinChunks(rh.lines[item.li + 1]) : (rh.pepper ? 'Pepper! Count the fast turns…' : item.r + 1 < RHYMES.length ? 'Next: ' + joinChunks(RHYMES[item.r + 1].lines[0]) : 'Next: Pepper, salt, mustard, cider, vinegar.');
          sourceEl.textContent = sourceText(item.r);
        } else if (item.kind === 'count') {
          var counts = [];
          for (var i = 1; i <= PEPPER_COUNTS; i++) counts.push(String(i));
          renderLine(counts, 'count' + item.r, item.n - 1, 'count');
          nextEl.textContent = 'The turners count the fast turns.';
          sourceEl.textContent = '“At pepper turn swiftly.” Gomme, Traditional Games (1898), p. 203';
        } else {
          renderLine(FINALE.words, 'finale', item.wi);
          nextEl.textContent = item.n < 5 ? 'Slowly at first…' : item.n < 10 ? 'Here it comes…' : 'As fast as they can! Fast turn ' + (item.n - 9);
          sourceEl.textContent = 'The turners “turn it as quickly as possible until the skipper is tired out, or trips.” Gomme (1898), p. 200';
        }
      }

      /* ---------- actions ---------- */
      function action(t) {
        if (state !== 'playing' || resumeAt) return;
        if (t == null) t = gnow();
        if (phase === 'runin') { tryRunIn(t); return; }
        if (phase !== 'running' && phase !== 'skipping') return;
        if (t < jumpStart + jumpDur) return;            /* already in the air */
        if (doomedAt != null) return;
        if (needsJump(lastBeat) && !lastCleared && t <= lastBeat + lateWin()) { lastCleared = true; clearBeat(lastBeat, t); return; }
        if (t >= nextBeat - earlyWin() && nextBeat >= firstJumpBeat - 1) { nextCleared = true; clearBeat(nextBeat, t); return; }
        /* Too early: you land again before the rope comes round. */
        startJump(t);
        doomedAt = nextBeat; doomReason = 'early';
        floatText('Too early!', C.red);
      }
      function startJump(t) { jumpStart = t; jumpDur = clamp(curPeriod * 0.62, 260, 470); }
      function clearBeat(b, t) {
        startJump(t);
        jumps++;
        var d = t - (b - IDEAL_LEAD);
        if (Math.abs(d) <= L.perfect) { combo++; bestCombo = Math.max(bestCombo, combo); floatText(combo >= 3 ? 'Perfect ×' + combo : 'Perfect!', C.gold); }
        else { combo = 0; floatText(d < 0 ? 'Good, a bit early' : 'Good, a bit late', C.ink, clamp(G.S * 0.16, 13, 24)); }
        if (jumps % 10 === 0) { api.sound('coin'); api.announce(jumps + ' jumps'); }
        jumpsEl.textContent = String(jumps);
        comboEl.textContent = String(combo);
        syncData();
      }
      function tryRunIn(t) {
        var since = t - lastBeat, open = L.runIn * curPeriod;
        if (since >= 0 && since <= open) {
          phase = 'running';
          runStart = t; runDur = clamp(curPeriod * 0.42, 220, 420);
          firstJumpBeat = nextBeat;
          api.sound('whoosh');
          floatText('In!', C.green);
          api.status('You are in! Jump when the rope hits the ground.');
          syncData();
        } else {
          frozenRun = 0.3;
          tangle(since > open ? 'runlate' : 'runearly', t);
        }
      }
      function tangle(reason, at) {
        if (phase === 'tangled') return;
        if (phase === 'skipping' || phase === 'running') frozenRun = phase === 'running' ? clamp((at - runStart) / runDur, 0.3, 1) : 1;
        phase = 'tangled';
        tangleReason = reason;
        tangleAt = at;
        doomedAt = null;
        combo = 0; comboEl.textContent = '0';
        api.sound('thud');
        api.sound('lose');
        if (!reduced) shakeUntil = performance.now() + 380;
        puff(G.cx, G.ground, 10);
        var msg = reason === 'late' ? 'Too late! The rope caught your feet.' : reason === 'early' ? 'Too early! You landed before the rope came round.' : reason === 'runearly' ? 'Ouch! Wait until the rope hits the ground, then run in.' : 'Too slow! Run in as soon as the rope hits the ground.';
        floatText(reason === 'late' ? 'Too late!' : reason === 'early' ? 'Too early!' : 'Ouch!', C.red);
        api.status('Tangled! ' + msg);
        syncData();
      }
      function finish() {
        state = 'over';
        overAt = performance.now() + 450;
        newBest = jumps > best[levelKey];
        if (newBest) { best[levelKey] = jumps; api.store.set('best-' + levelKey, jumps); bestEl.textContent = String(jumps); }
        pauseBtn.disabled = true;
        setTouchAction(false);
        var ranIn = tangleReason !== 'runearly' && tangleReason !== 'runlate';
        api.status((ranIn ? 'Tangled after ' + jumps + ' jump' + (jumps === 1 ? '' : 's') + '.' : 'You did not get in that time.') + (newBest ? ' A new best!' : ' Best: ' + best[levelKey] + '.') + ' Press Play again.');
        if (newBest) api.celebrate('New best: ' + jumps + ' jumps!');
        syncData();
      }
      function showOver() {
        var ranIn = tangleReason !== 'runearly' && tangleReason !== 'runlate';
        ovTitle.textContent = newBest ? 'New best!' : ranIn ? 'Tangled!' : 'Ouch!';
        ovMsg.textContent = ranIn
          ? jumps + ' jump' + (jumps === 1 ? '' : 's') + (bestCombo >= 3 ? ', with ' + bestCombo + ' perfect in a row.' : '.')
          : (tangleReason === 'runearly' ? 'Wait for the rope to slap the ground, then run in.' : 'Run in straight after the rope slaps the ground.');
        ovSub.textContent = 'Best on ' + L.label + ': ' + best[levelKey] + ' jumps';
        ovBtn.textContent = '▶ Play again';
        overlay.hidden = false;
        fitCard();
      }

      /* ---------- game flow ---------- */
      function resetRun() {
        plan = buildPlan(); planPos = -1; finaleN = -1; item = null;
        jumps = 0; combo = 0; bestCombo = 0; lastCleared = false; nextCleared = false; doomedAt = null; firstJumpBeat = Infinity;
        jumpStart = -1e9; tangleReason = ''; overAt = 0; newBest = false; frozenRun = 1; sayUntil = 0;
        fx = []; floaters = [];
        jumpsEl.textContent = '0'; comboEl.textContent = '0';
        shownLineKey = '';
      }
      function newGame(autoStart) {
        stopLoop();
        resumeAt = 0; pausedAt = null; clockBase = performance.now();
        resetRun();
        phase = 'wait'; state = 'idle';
        pauseBtn.disabled = true; pauseBtn.textContent = 'Pause'; pauseBtn.setAttribute('aria-pressed', 'false');
        setTouchAction(false);
        if (autoStart) { start(); return; }
        showKaraoke();
        ovTitle.textContent = 'Skipping';
        ovMsg.textContent = 'Run in just after the rope hits the ground, then jump every time it comes round.';
        ovSub.textContent = 'Best on ' + L.label + ': ' + best[levelKey] + ' jumps';
        ovBtn.textContent = '▶ Start';
        overlay.hidden = false;
        fitCard();
        api.status('Press Start. Run in when the rope hits the ground, then jump it every time.');
        syncData();
        draw();
      }
      function start() {
        stopLoop();
        resetRun();
        clockBase = performance.now(); pausedAt = null; resumeAt = 0;
        state = 'playing'; phase = 'runin';
        curPeriod = basePeriod(0);
        lastBeat = -curPeriod * 0.55; nextBeat = curPeriod * 0.45;
        overlay.hidden = true;
        pauseBtn.disabled = false; pauseBtn.textContent = 'Pause'; pauseBtn.setAttribute('aria-pressed', 'false');
        setTouchAction(true);
        showKaraoke();
        api.sound('click');
        api.status('Run in just after the rope slaps the ground. Press Space or tap.');
        syncData();
        startLoop();
      }
      function overlayAction() {
        if (state === 'paused') resume(); else start();
        focusGame();
      }
      function togglePause() { if (state === 'playing') pause(); else if (state === 'paused') resume(); }
      function pause() {
        if (state !== 'playing') return;
        state = 'paused';
        holdClock(); resumeAt = 0;
        stopLoop();
        pauseBtn.textContent = 'Resume'; pauseBtn.setAttribute('aria-pressed', 'true');
        ovTitle.textContent = 'Paused';
        ovMsg.textContent = 'The turners are waiting for you.';
        ovSub.textContent = 'Jumps so far: ' + jumps;
        ovBtn.textContent = '▶ Resume';
        overlay.hidden = false;
        fitCard();
        api.status('Paused. Press Resume to carry on.');
        syncData();
        draw();
      }
      function resume() {
        if (state !== 'paused') return;
        state = 'playing';
        overlay.hidden = true;
        pauseBtn.textContent = 'Pause'; pauseBtn.setAttribute('aria-pressed', 'false');
        resumeAt = performance.now() + (reduced ? 600 : 1200);
        api.status('Get ready…');
        syncData();
        startLoop();
      }
      function setLevel(k) {
        if (!LEVELS[k] || (k === levelKey && state === 'idle')) return;
        levelKey = k; L = LEVELS[k];
        api.store.set('level', k);
        LEVEL_KEYS.forEach(function (x) { levelBtns[x].setAttribute('aria-pressed', String(x === k)); });
        bestEl.textContent = String(best[k]);
        newGame(false);
      }
      /* If the card is taller than the picture on a small screen, drop the message line (the status line above
         says the same thing). */
      function fitCard() {
        ovMsg.hidden = false;
        var card = ovMsg.parentNode;
        if (card && card.scrollHeight > card.clientHeight + 1) ovMsg.hidden = true;
      }
      /* Taps only, never drags, so the canvas keeps touch-action: manipulation (no double-tap zoom) the whole time. */
      function setTouchAction() { canvas.style.touchAction = 'manipulation'; }
      function focusGame() { try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }

      /* Read-only numbers for the automated test: real (performance.now) times of the beats and the windows. */
      function syncData() {
        var d = canvas.dataset;
        d.state = state; d.phase = phase;
        d.lastBeat = String(Math.round(realOf(lastBeat))); d.nextBeat = String(Math.round(realOf(nextBeat)));
        d.period = String(Math.round(curPeriod)); d.early = String(Math.round(earlyWin())); d.late = String(Math.round(lateWin()));
        d.runin = String(L.runIn); d.jumps = String(jumps); d.lead = String(IDEAL_LEAD);
        d.rhyme = item ? (item.kind === 'finale' ? 'finale' : String(item.r + 1)) : '0';
      }

      /* ---------- input ---------- */
      function onKey(e) {
        if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
        var k = e.key, tgt = e.target;
        if (tgt && tgt.closest && tgt.closest('input, select, textarea')) return;
        var inRoot = !!(tgt && root.contains(tgt));
        if (k === 'p' || k === 'P') { if (state === 'playing' || state === 'paused') { e.preventDefault(); togglePause(); } return; }
        if (!(k === ' ' || k === 'Spacebar' || k === 'ArrowUp' || k === 'w' || k === 'W')) return;
        if (state === 'playing') {
          if (!inRoot && tgt && tgt !== document.body && tgt.closest && tgt.closest('a, button, summary')) return;
          e.preventDefault();
          if (!e.repeat) action(evTime(e));
        } else if (tgt === canvas) {
          e.preventDefault();
          if (state === 'paused') resume(); else start();
        }
      }
      function onPointer(e) {
        if (e.button > 0) return;
        if (state === 'playing') { e.preventDefault(); action(evTime(e)); }
      }
      function onJumpBtn(e) {
        if (e.button > 0) return;
        e.preventDefault();
        if (state === 'playing') action(evTime(e));
        else if (state === 'paused') resume();
        else start();
      }
      function onVisibility() {
        if (document.hidden) { if (state === 'playing') pause(); stopLoop(); }
        else draw();
      }
      function noMenu(e) { e.preventDefault(); }
      document.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onVisibility);
      canvas.addEventListener('pointerdown', onPointer);
      canvas.addEventListener('contextmenu', noMenu);
      jumpBtn.addEventListener('pointerdown', onJumpBtn);
      jumpBtn.addEventListener('contextmenu', noMenu);

      var lastW = 0, lastDpr = 0;
      function maybeResize() {
        var w = Math.round(stage.clientWidth), r = Math.min(2, window.devicePixelRatio || 1);
        if (w && (w !== lastW || r !== lastDpr)) { lastW = w; lastDpr = r; resize(); }
      }
      var ro = new ResizeObserver(maybeResize);
      ro.observe(stage);
      window.addEventListener('resize', maybeResize);
      if (document.fonts && document.fonts.load) {
        document.fonts.load('700 30px "Cabin Sketch"').then(function () { if (!destroyed) draw(); }, function () {});
      }

      resize();
      newGame(false);

      return {
        destroy: function () {
          destroyed = true;
          stopLoop();
          ro.disconnect();
          window.removeEventListener('resize', maybeResize);
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }
  });
})();
