/* Conkers for Games in Time.

   A strike duel against the computer, seen side-on. Each player's conker hangs on a string. To strike, you
   time a swing on a pendulum meter: let go when the needle is in the gold for a hard, true hit. Conkers crack
   as they take damage and finally smash. Rules used (see docs/game-notes/conkers.json):
     - Shout the rhyme first ("Obbly, obbly onkers, my first conquers", Gomme 1894) to strike first.
     - Take turns: three strikes each, then swap (the World Conker Championships give three strikes too).
     - If the strings tangle, the first to call "Strings!" gets an extra strike.
     - A conker that wins becomes a "oner", then a "twoer", and also takes the beaten conker's score.
       Your conker and its score are kept between games until it breaks.
     - Baking a conker to harden it was usually counted as cheating, so a baked conker's wins do not count.

   How the file is organised:
     Part 1  The rules: conker types, how good a strike is, how much damage it does, score names.
     Part 2  The game: layout, drawing (fists, strings, conkers with cracks, the meter), the swing,
             the "Strings!" and first-strike races, and saving your conker.
   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  /* =====================================================================
     PART 1: THE RULES
     ===================================================================== */
  /* Three ways to prepare a conker, with the trade-offs the playground lore gives them. */
  var TYPES = {
    fresh: { name: 'Fresh', power: 1.15, tough: 1.0, brittle: false, counts: true, hits: 3, toughDots: 1,
      blurb: 'Picked this autumn. Heavy and juicy, so it hits hard, but it is soft.' },
    seasoned: { name: 'Seasoned', power: 0.9, tough: 1.35, brittle: false, counts: true, hits: 1, toughDots: 2,
      blurb: 'Kept in a drawer for a whole year. Dry and tough, but light, so it hits softer.' },
    baked: { name: 'Baked', power: 0.95, tough: 1.6, brittle: true, counts: false, hits: 2, toughDots: 3,
      blurb: 'Hard as a rock but brittle: a perfect hit can shatter it. Most kids called baking cheating, so its wins do not count.' }
  };
  /* The computer's timing wobble (as a share of the meter) and how fast it calls in a race (milliseconds). */
  var LEVELS = {
    easy: { label: 'Easy', sd: 0.32, react: [650, 1050], score: [0, 1], types: ['fresh', 'fresh', 'seasoned'] },
    medium: { label: 'Medium', sd: 0.2, react: [430, 720], score: [0, 3], types: ['fresh', 'seasoned', 'baked'] },
    hard: { label: 'Hard', sd: 0.12, react: [300, 480], score: [1, 6], types: ['seasoned', 'seasoned', 'fresh', 'baked'] }
  };
  var PERIOD = 2.0;                                   /* seconds for the meter needle to swing there and back */
  var ZONES = { perfect: 0.06, good: 0.18, glance: 0.32 };   /* half-widths of the sweet spot, as a share of the meter */
  var STRIKES = 3;                                    /* strikes in a turn */
  var THINK_MS = 350;
  var NAMES = ['a new conker', 'a oner', 'a twoer', 'a threer', 'a fourer', 'a fiver', 'a sixer', 'a sevener', 'an eighter', 'a niner', 'a tenner', 'an elevener', 'a twelver'];
  function scoreName(n) { return n < NAMES.length ? NAMES[n] : 'a ' + n + '-er'; }

  function strikeQuality(delta) {
    if (delta < ZONES.perfect) return { kind: 'perfect', q: 1 };
    if (delta < ZONES.good) return { kind: 'good', q: 0.72 + 0.23 * (ZONES.good - delta) / (ZONES.good - ZONES.perfect) };
    if (delta < ZONES.glance) return { kind: 'glance', q: 0.3 + 0.3 * (ZONES.glance - delta) / (ZONES.glance - ZONES.good) };
    return { kind: 'miss', q: 0 };
  }
  /* Damage from a hit: the striker's weight, the timing, and how tough the target is. A perfect hit on a
     brittle (baked) conker shatters it. The striker's conker takes a knock too. */
  function damage(striker, target, hit, rnd) {
    var S = TYPES[striker.type], T = TYPES[target.type];
    var d = 15 * hit.q * S.power / T.tough * (0.88 + 0.24 * rnd());
    if (hit.kind === 'perfect') d *= 1.3;
    var shatter = hit.kind === 'perfect' && T.brittle;
    if (shatter) d *= 1.6;
    var recoil = 4.5 * hit.q * T.tough / S.tough * (0.7 + 0.6 * rnd());
    if (S.brittle && hit.q > 0.8) recoil *= 1.4;
    return { target: d, striker: recoil, shatter: shatter };
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }
  function seeded(seed) {
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gauss(rnd) { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(Math.max(1e-9, u))) * Math.cos(2 * Math.PI * v); }

  /* A conker's shape: a slightly lumpy round with a pale "eye", cracks that show as it is hurt, and the
     places it will chip. Made from a seed, so a saved conker looks the same next time. */
  function makeShape(seed, type) {
    var R = seeded(seed), pts = [], i;
    var lobes = R() * 6, bump = 0.03 + R() * 0.03;
    for (i = 0; i < 40; i++) {
      var a = i / 40 * Math.PI * 2;
      pts.push(1 + bump * Math.sin(2 * a + lobes) + (R() - 0.5) * 0.035 - (type === 'seasoned' ? 0.04 * Math.abs(Math.sin(3 * a + lobes)) : 0));
    }
    var cracks = [];
    for (i = 0; i < 8; i++) {
      var a0 = R() * Math.PI * 2, x = Math.cos(a0) * 0.97, y = Math.sin(a0) * 0.97, line = [[x, y]];
      var dir = a0 + Math.PI + (R() - 0.5) * 0.9, len = 0.35 + R() * 0.55, steps = 3 + Math.floor(R() * 3);
      for (var k = 0; k < steps; k++) {
        dir += (R() - 0.5) * 1.1;
        x += Math.cos(dir) * len / steps; y += Math.sin(dir) * len / steps;
        line.push([x, y]);
        if (R() < 0.3 && k > 0) cracks.push({ pts: [[x, y], [x + Math.cos(dir + 1.2) * 0.18, y + Math.sin(dir + 1.2) * 0.18]], minor: true, at: i });
      }
      cracks.push({ pts: line, at: i });
    }
    var chips = [];
    for (i = 0; i < 5; i++) chips.push({ a: R() * Math.PI * 2, depth: 0.12 + R() * 0.12, width: 0.35 + R() * 0.3, at: 0.45 + i * 0.1 });
    return { pts: pts, cracks: cracks, chips: chips, eye: { a: 2.0 + R() * 0.6, w: 0.5 + R() * 0.12 }, tilt: (R() - 0.5) * 0.4 };
  }
  function radiusAt(shape, a, dmg) {
    var n = shape.pts.length, f = ((a / (Math.PI * 2)) % 1 + 1) % 1 * n, i = Math.floor(f), t = f - i;
    var r = shape.pts[i % n] * (1 - t) + shape.pts[(i + 1) % n] * t;
    shape.chips.forEach(function (c) {
      if (dmg < c.at) return;
      var d = Math.abs(((a - c.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (d < c.width) r -= c.depth * Math.cos(d / c.width * Math.PI / 2);
    });
    return r;
  }

  GamesInTime.register({
    id: 'conkers',
    frame: 'stage',
    mount: function (root, api) {
      var h = api.h, rnd = api.random || Math.random, reduced = !!api.reducedMotion;
      var destroyed = false;

      /* ---- colours: every one comes from the page's CSS variables ---- */
      var cs = getComputedStyle(root);
      var probe = document.createElement('canvas').getContext('2d');
      function cssVar(name) { return (cs.getPropertyValue(name) || '').trim(); }
      function rgb() {
        for (var i = 0; i < arguments.length; i++) {
          var str = arguments[i] && arguments[i].charAt(0) === '-' ? cssVar(arguments[i]) : arguments[i];
          if (!str) continue;
          probe.fillStyle = '#000'; probe.fillStyle = str;
          var s = String(probe.fillStyle);
          if (s.charAt(0) === '#') return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
          var m = s.match(/[\d.]+/g);
          if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
        }
        return [128, 128, 128];
      }
      function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
      function col(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')'; }
      var P = {};
      function readColours() {
        cs = getComputedStyle(root);
        P.ink = rgb('--ink', cs.color); P.muted = rgb('--ink-muted', '--ink'); P.shadow = rgb('--bg', '--surface');
        P.surface = rgb('--surface'); P.surface2 = rgb('--surface-2', '--surface');
        P.gold = rgb('--gold'); P.goldShadow = rgb('--gold-shadow', '--brass', '--gold');
        P.vermilion = rgb('--vermilion', '--red'); P.leaf = rgb('--leaf', '--green'); P.peacock = rgb('--peacock'); P.rose = rgb('--rose');
        /* horse chestnut brown: vermilion and gold shadow, darkened with the night */
        P.conker = mix(mix(P.vermilion, P.goldShadow, 0.3), P.shadow, 0.5);
        P.eye = mix(P.muted, P.gold, 0.3);
        P.fontChalk = cssVar('--font-poster') || cssVar('--font-head') || 'sans-serif';
        P.fontHead = cssVar('--font-head') || 'sans-serif';
      }
      readColours();
      function conkerColours(type) {
        var base = type === 'seasoned' ? mix(P.conker, P.shadow, 0.22) : type === 'baked' ? mix(P.conker, P.shadow, 0.38) : P.conker;
        return { base: base, light: mix(base, P.gold, type === 'fresh' ? 0.45 : 0.3), dark: mix(base, P.shadow, 0.6), gloss: type === 'fresh' ? 0.85 : type === 'seasoned' ? 0.4 : 0.22 };
      }

      /* ---- settings, records and your saved conker ---- */
      var level = api.store.get('level', 'medium');
      if (!LEVELS[level]) level = 'medium';
      var stats = api.store.get('stats', {});
      if (!stats || typeof stats !== 'object') stats = {};
      var saved = api.store.get('conker', null);
      if (!saved || !TYPES[saved.type] || !(saved.hp > 0)) saved = null;
      var bestEver = api.store.get('best', 0) || 0;

      root.appendChild(h('style', null,
        '.game-conkers .ck-stage { position: relative; }' +
        '.game-conkers .ck-canvas { display: block; margin: 0 auto; border-radius: 14px; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }' +
        '.game-conkers .ck-act { display: flex; width: min(100%, 420px); min-height: 56px; margin: .8rem auto 0; font-size: 1.25rem; }' +
        '.game-conkers .ck-act[aria-disabled="true"] { background: var(--surface-2); border-color: var(--line); color: var(--ink-muted); box-shadow: none; cursor: default; }' +
        '.game-conkers .ck-note { text-align: center; margin-top: .6rem; }' +
        '.game-conkers .ck-board { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: .5rem; margin-bottom: .6rem; }' +
        '.game-conkers .ck-side { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: .1rem .4rem; padding: .45rem .65rem; border-radius: 12px; background: var(--surface-2); border: 2px solid var(--line); min-width: 0; }' +
        '.game-conkers .ck-side.is-on { border-color: var(--gold); }' +
        '.game-conkers .ck-who { grid-column: 1 / -1; font-family: var(--font-poster); font-weight: 700; font-size: 1.15rem; line-height: 1.1; }' +
        '.game-conkers .ck-side.is-on .ck-who { color: var(--gold); }' +
        '.game-conkers .ck-what { grid-column: 1 / -1; grid-row: 2; color: var(--ink-muted); font-size: .9rem; line-height: 1.2; }' +
        '.game-conkers .ck-pct { grid-column: 2; grid-row: 3; font-variant-numeric: tabular-nums; font-size: .95rem; line-height: 1; }' +
        '.game-conkers .ck-bar { grid-column: 1; grid-row: 3; height: 10px; border-radius: 999px; background: var(--bg); overflow: hidden; border: 1px solid var(--line); }' +
        '.game-conkers .ck-bar i { display: block; height: 100%; width: 100%; border-radius: inherit; background: var(--leaf); transition: width .45s ease, background-color .45s; }' +
        '.game-conkers .ck-bar i.mid { background: var(--gold); }' +
        '.game-conkers .ck-bar i.low { background: var(--vermilion); }' +
        '.game-conkers .ck-note strong { color: var(--ink); }' +
        '.game-conkers .ck-choose { padding: clamp(.8rem, 2.5vw, 1.4rem); border-radius: 14px; background: var(--surface-2); border: 1px solid var(--line); }' +
        '.game-conkers .ck-choose h3 { font-family: var(--font-poster); font-size: clamp(1.5rem, 1.2rem + 1.5vw, 2.2rem); text-align: center; margin: 0 0 .3rem; color: var(--gold); }' +
        '.game-conkers .ck-choose > p { text-align: center; color: var(--ink-muted); margin: 0 0 .8rem; }' +
        '.game-conkers .ck-keep { display: flex; flex-direction: column; align-items: center; gap: .3rem; margin: 0 auto 1rem; }' +
        '.game-conkers .ck-keep .btn { min-height: 52px; font-size: 1.1rem; }' +
        '.game-conkers .ck-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); gap: .7rem; }' +
        '.game-conkers .ck-card { display: grid; grid-template-columns: auto 1fr; gap: .2rem .8rem; align-items: center; text-align: left; padding: .8rem .9rem; border-radius: 14px; border: 2px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; min-height: 44px; }' +
        '.game-conkers .ck-card:hover, .game-conkers .ck-card:focus-visible { border-color: var(--gold); }' +
        '.game-conkers .ck-card strong { font-family: var(--font-head); font-size: 1.15rem; }' +
        '.game-conkers .ck-card .ck-blurb { grid-column: 1 / -1; color: var(--ink-muted); font-size: .95rem; line-height: 1.35; }' +
        '.game-conkers .ck-card .ck-pips { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: .2rem 1rem; font-size: .9rem; font-weight: 700; }' +
        '.game-conkers .ck-dot { display: inline-block; width: .7em; height: .7em; border-radius: 50%; border: 2px solid var(--gold); margin-left: .2em; vertical-align: -.05em; }' +
        '.game-conkers .ck-dot.on { background: var(--gold); }' +
        '.game-conkers .ck-ball { width: 2.4rem; height: 2.4rem; border-radius: 50%; background: var(--vermilion); background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--gold) 55%, var(--vermilion)), color-mix(in srgb, var(--vermilion) 50%, var(--bg)) 55%, color-mix(in srgb, var(--vermilion) 25%, var(--bg))); box-shadow: inset -3px -4px 0 color-mix(in srgb, var(--bg) 35%, transparent); }' +
        '.game-conkers .ck-ball.seasoned { filter: saturate(.75) brightness(.82); }' +
        '.game-conkers .ck-ball.baked { filter: saturate(.6) brightness(.62); }' +
        '@media (max-width: 600px) { .game-conkers .game-toolbar { gap: .45rem .5rem; margin-bottom: .6rem; } .game-conkers .seg button { padding: .4rem .75rem; }' +
        ' .game-conkers .ck-side { padding: .4rem .5rem; } .game-conkers .ck-who { font-size: 1rem; } .game-conkers .ck-pct { font-size: .9rem; } .game-conkers .ck-what { font-size: .82rem; } }'));

      /* ---- toolbar, stage, action button ---- */
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(); } }, 'New game');
      var levelBtns = {};
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' });
      Object.keys(LEVELS).forEach(function (k) {
        levelBtns[k] = h('button', { type: 'button', 'aria-pressed': String(k === level), onclick: function () { setLevel(k); } }, LEVELS[k].label);
        levelSeg.appendChild(levelBtns[k]);
      });
      root.appendChild(h('div', { class: 'game-toolbar' }, newBtn, levelSeg));
      function side(who) {
        var el = { box: h('div', { class: 'ck-side ck-' + who }), what: h('span', { class: 'ck-what' }), fill: h('i'), pct: h('b', { class: 'ck-pct' }) };
        el.box.append(h('span', { class: 'ck-who' }, who === 'you' ? 'You' : 'Computer'), el.what,
          h('span', { class: 'ck-bar', 'aria-hidden': 'true' }, el.fill), el.pct);
        return el;
      }
      var board = { you: side('you'), cpu: side('cpu') };
      var boardEl = h('div', { class: 'ck-board', role: 'group', 'aria-label': 'Conker strength' }, board.you.box, board.cpu.box);
      boardEl.hidden = true;
      root.appendChild(boardEl);
      var stage = h('div', { class: 'ck-stage' });
      var chooser = h('div', { class: 'ck-choose', role: 'group', 'aria-label': 'Choose your conker' });
      var canvas = h('canvas', { class: 'ck-canvas', role: 'img', tabindex: '0', 'aria-label': 'Two conkers hanging on strings' });
      stage.appendChild(chooser);
      stage.appendChild(canvas);
      root.appendChild(stage);
      var actBtn = h('button', { class: 'btn btn-primary ck-act', type: 'button', 'aria-disabled': 'true' }, 'Get ready');
      root.appendChild(actBtn);
      var recordLine = h('span', null, '');
      root.appendChild(h('p', { class: 'game-note ck-note' }, recordLine));
      root.appendChild(h('p', { class: 'game-note ck-note' }, 'Tap, click or press Space when the swinging needle is in the gold. Three strikes each, then swap. If the strings tangle, call Strings! first for an extra strike.'));
      var ctx = canvas.getContext('2d');

      function setLevel(k) {
        level = k;
        api.store.set('level', k);
        Object.keys(levelBtns).forEach(function (x) { levelBtns[x].setAttribute('aria-pressed', String(x === k)); });
        showRecord();
        newGame();
      }
      function showRecord() {
        var s = stats[level] || {}, mine = saved ? 'Your conker: ' + scoreName(saved.score) + ' (' + TYPES[saved.type].name.toLowerCase() + ', ' + Math.round(saved.hp) + '% strong)' : 'No conker on your string yet';
        recordLine.replaceChildren(h('strong', null, mine), ' · ' + LEVELS[level].label + ': ' + (s.won || 0) + ' won of ' + (s.played || 0) + (bestEver ? ' · Best ever: ' + scoreName(bestEver) : ''));
      }
      showRecord();

      /* =====================================================================
         PART 2: THE GAME
         ===================================================================== */
      var G = null, L = null, dpr = 1, lastVh = 0, back = null;
      var timers = [], raf = 0, lastT = 0, lastAct = 0;

      function later(fn, ms) {
        var id = setTimeout(function () { timers = timers.filter(function (x) { return x !== id; }); if (!destroyed) fn(); }, ms);
        timers.push(id);
        return id;
      }
      function clearTimers() { timers.forEach(clearTimeout); timers = []; }
      function think() { return reduced ? 0 : THINK_MS; }
      function say(t) { api.status(t); }
      function other(w) { return w === 'you' ? 'cpu' : 'you'; }
      function pct(c) { return Math.max(0, Math.round(c.hp)) + '%'; }
      function strengthText() { return 'Yours ' + pct(G.c.you) + ', computer\'s ' + pct(G.c.cpu); }
      function setAct(label, live) {
        actBtn.textContent = label;
        actBtn.setAttribute('aria-disabled', live ? 'false' : 'true');
      }

      /* ---- layout ---- */
      function computeLayout(w, vh, vw) {
        var narrow = w < 600 || (vh > vw * 1.05 && w < 900);
        var classroom = document.documentElement.classList.contains('classroom');
        var maxH = Math.max(300, vh - (narrow ? 330 : classroom ? 530 : 410));
        var H = narrow ? clamp(Math.round(w * 1.05), 300, maxH) : clamp(Math.round(w * 0.46), 320, maxH);
        var rc = clamp(Math.min(w, H) * 0.075, 18, 44);
        var top = Math.max(34, H * 0.1), Ls = H * (narrow ? 0.36 : 0.38);
        var fx = narrow ? [w * 0.27, w * 0.73] : [w * 0.32, w * 0.68];
        return {
          W: w, H: H, narrow: narrow, rc: rc, top: top, Ls: Ls, fx: fx,
          meter: { x: w / 2, y: H * 0.7, r: Math.min(H * 0.19, w * 0.28) },
          ground: H - Math.max(12, H * 0.045), g: 5.2 * H
        };
      }
      function rest(who) { var i = who === 'you' ? 0 : 1; return { x: L.fx[i], y: L.top }; }
      /* Where the striker's fist goes, so that its conker, pulled back and let go, sweeps down and across into
         the other conker. A conker on a string of length len at angle th hangs at (sin th, cos th) * len from
         the fist, and as it swings it moves along side * (cos th, -sin th). It meets the target at angle imp,
         just past the bottom of its swing, when it is going fastest. */
      function stance(striker) {
        var side = striker === 'you' ? 1 : -1, T = rest(other(striker)), imp = 0.35 * side, len = L.Ls * 0.9;
        var vx = side * Math.cos(imp), vy = -side * Math.sin(imp);
        var cx = T.x - vx * L.rc * 2, cy = T.y + L.Ls - vy * L.rc * 2;
        return { x: cx - Math.sin(imp) * len, y: cy - Math.cos(imp) * len, len: len, imp: imp, wind: -1.4 * side };
      }

      function resize() {
        if (destroyed) return;
        var w = Math.floor(stage.clientWidth);
        if (!w) return;
        var vh = window.innerHeight || 800;
        var room = document.documentElement.classList.contains('classroom');
        if (L && w === L.W && Math.abs(vh - lastVh) < 120 && room === L.room) return;
        lastVh = vh;
        L = computeLayout(w, vh, window.innerWidth || w);
        L.room = room;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(L.W * dpr);
        canvas.height = Math.round(L.H * dpr);
        canvas.style.width = L.W + 'px';
        canvas.style.height = L.H + 'px';
        back = paintBack();
        if (G) settlePositions();
        render();
      }

      /* ---- the backdrop: a night schoolyard drawn in chalk, painted once per size ---- */
      function leaf(g, x, y, size, rot, alpha) {
        g.save(); g.translate(x, y); g.rotate(rot);
        g.strokeStyle = col(P.ink, alpha); g.lineWidth = 1.6; g.lineCap = 'round';
        for (var i = 0; i < 7; i++) {
          var a = -Math.PI / 2 + (i - 3) * 0.42, len = size * (1 - Math.abs(i - 3) * 0.16);
          g.save(); g.rotate(a + Math.PI / 2);
          g.beginPath(); g.moveTo(0, 0);
          g.quadraticCurveTo(len * 0.28, -len * 0.55, 0, -len);
          g.quadraticCurveTo(-len * 0.28, -len * 0.55, 0, 0);
          g.stroke();
          g.beginPath(); g.moveTo(0, -len * 0.1); g.lineTo(0, -len * 0.9); g.stroke();
          g.restore();
        }
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, size * 0.5); g.stroke();
        g.restore();
      }
      function paintBack() {
        var c = document.createElement('canvas');
        c.width = canvas.width; c.height = canvas.height;
        var g = c.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        var W = L.W, H = L.H, R = seeded(1848), i;
        var bgr = g.createRadialGradient(W / 2, H * 0.4, H * 0.05, W / 2, H * 0.45, Math.max(W, H) * 0.75);
        bgr.addColorStop(0, col(mix(P.surface2, P.ink, 0.07))); bgr.addColorStop(0.55, col(P.surface)); bgr.addColorStop(1, col(mix(P.surface, P.shadow, 0.6)));
        g.fillStyle = bgr; g.fillRect(0, 0, W, H);
        /* a chalk brick wall along the bottom */
        var wallTop = H * 0.76, bh = Math.max(12, H * 0.045), bw = bh * 2.6;
        g.strokeStyle = col(P.ink, 0.07); g.lineWidth = 1.2;
        for (var row = 0, y = wallTop; y < L.ground; row++, y += bh) {
          g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
          for (var x = (row % 2) * bw / 2; x < W; x += bw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, Math.min(y + bh, L.ground)); g.stroke(); }
        }
        /* the ground, chalked */
        g.strokeStyle = col(P.ink, 0.35); g.lineWidth = 2;
        g.beginPath();
        for (i = 0; i <= 40; i++) { var gx = W * i / 40, gy = L.ground + (R() - 0.5) * 1.6; if (i) g.lineTo(gx, gy); else g.moveTo(gx, gy); }
        g.stroke();
        /* horse chestnut leaves in the corners */
        var ls = Math.min(W, H) * 0.12;
        leaf(g, ls * 0.5, ls * 1.25, ls, -0.5, 0.12);
        leaf(g, W - ls * 0.5, ls * 1.25, ls, 0.5, 0.12);
        if (!L.narrow) { leaf(g, ls * 1.4, ls * 0.9, ls * 0.7, -0.15, 0.08); leaf(g, W - ls * 1.4, ls * 0.9, ls * 0.7, 0.15, 0.08); }
        /* chalk dust */
        for (i = 0; i < W * H / 900; i++) { g.fillStyle = col(P.ink, 0.03 + R() * 0.05); g.fillRect(R() * W, R() * H, 1.4, 1.4); }
        return c;
      }

      /* ---- the animation loop runs only while something moves ---- */
      function kick() { if (!raf && !destroyed && !document.hidden) { lastT = 0; raf = requestAnimationFrame(frame); } }
      function frame(now) {
        raf = 0;
        if (destroyed) return;
        var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 1 / 60;
        lastT = now;
        var busy = update(dt);
        render();
        if (busy && !document.hidden) raf = requestAnimationFrame(frame);
      }
      function onVisibility() { if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; } else kick(); }
      document.addEventListener('visibilitychange', onVisibility);

      /* ---- choosing a conker ---- */
      function newGame() {
        clearTimers();
        readColours();
        if (L) back = paintBack();
        G = null;
        showChooser();
      }
      function showChooser() {
        canvas.hidden = true;
        boardEl.hidden = true;
        chooser.hidden = false;
        setAct('Choose a conker first', false);
        say('Choose your conker');
        var cards = h('div', { class: 'ck-cards' });
        Object.keys(TYPES).forEach(function (k) {
          var T = TYPES[k];
          function dots(n) { var out = []; for (var i = 0; i < 3; i++) out.push(h('span', { class: 'ck-dot' + (i < n ? ' on' : ''), 'aria-hidden': 'true' })); return out; }
          cards.appendChild(h('button', { type: 'button', class: 'ck-card', 'aria-label': T.name + ' conker. ' + T.blurb, onclick: function () { pick(k, false); } },
            h('span', { class: 'ck-ball ' + k, 'aria-hidden': 'true' }), h('strong', null, T.name),
            h('span', { class: 'ck-blurb' }, T.blurb),
            h('span', { class: 'ck-pips', 'aria-hidden': 'true' }, h('span', null, 'Hits', dots(T.hits)), h('span', null, 'Toughness', dots(T.toughDots)))));
        });
        var parts = [h('h3', null, 'Choose your conker')];
        if (saved) {
          parts.push(h('div', { class: 'ck-keep' },
            h('button', { type: 'button', class: 'btn btn-primary', onclick: function () { pick(saved.type, true); } }, 'Play on with ' + scoreName(saved.score).replace(/^an? /, 'your ')),
            h('span', { class: 'muted' }, TYPES[saved.type].name + ' conker, ' + Math.round(saved.hp) + '% strong. Its cracks stay with it.')));
          parts.push(h('p', null, 'Or thread a new one, and retire your ' + scoreName(saved.score).replace(/^an? /, '') + '.'));
        } else parts.push(h('p', null, 'Each player threads a horse chestnut on a string. Which will you bring?'));
        parts.push(cards);
        chooser.replaceChildren.apply(chooser, parts);
      }
      function pick(type, keep) {
        api.sound('click');
        var mine = keep && saved ? { type: saved.type, score: saved.score, hp: saved.hp, seed: saved.seed } : { type: type, score: 0, hp: 100, seed: Math.floor(rnd() * 1e9) };
        if (!keep) { saved = { type: mine.type, score: 0, hp: 100, seed: mine.seed }; api.store.set('conker', saved); }
        var lv = LEVELS[level], ct = lv.types[Math.floor(rnd() * lv.types.length)];
        var theirs = { type: ct, score: lv.score[0] + Math.floor(rnd() * (lv.score[1] - lv.score[0] + 1)), hp: 100, seed: Math.floor(rnd() * 1e9) };
        startMatch(mine, theirs);
      }

      /* ---- a match ---- */
      function startMatch(mine, theirs) {
        chooser.hidden = true;
        canvas.hidden = false;
        resize();
        G = {
          c: { you: mine, cpu: theirs }, shapes: { you: makeShape(mine.seed, mine.type), cpu: makeShape(theirs.seed, theirs.type) },
          phase: 'shout', striker: null, left: 0, bonus: null, strikes: 0, cpuStrikes: 0, over: false, winner: null,
          bob: { you: { a: 0, w: 0 }, cpu: { a: 0, w: 0 } }, reach: { you: 0, cpu: 0 }, len: { you: L.Ls, cpu: L.Ls },
          meter: null, swing: null, tangle: 0, race: null, texts: [], chips: [], shards: [], shake: 0, flash: null, broken: { you: false, cpu: false }
        };
        G.bob.you.w = 0.6; G.bob.cpu.w = -0.5;
        boardEl.hidden = false;
        showRecord();
        describe();
        try { canvas.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
        startRace('shout');
        kick();
      }
      function describe() {
        if (!G) return;
        ['you', 'cpu'].forEach(function (who) {
          var c = G.c[who], k = clamp(c.hp / 100, 0, 1), b = board[who];
          b.what.textContent = scoreName(c.score) + ' · ' + TYPES[c.type].name.toLowerCase();
          b.fill.style.width = (G.broken[who] ? 0 : Math.max(2, k * 100)) + '%';
          b.fill.className = k > 0.5 ? '' : k > 0.25 ? 'mid' : 'low';
          b.pct.textContent = G.broken[who] ? 'Smashed' : pct(c);
          b.box.classList.toggle('is-on', !G.over && G.striker === who && (G.phase === 'strike' || G.phase === 'swing'));
        });
        function one(who) {
          var c = G.c[who];
          return (who === 'you' ? 'Your ' : "The computer's ") + TYPES[c.type].name.toLowerCase() + ' conker, ' + scoreName(c.score) + ', is ' + (G.broken[who] ? 'smashed' : pct(c) + ' strong') + '.';
        }
        canvas.setAttribute('aria-label', 'Two conkers hanging on strings. ' + one('you') + ' ' + one('cpu') + ' Press Space or tap when the needle on the swing meter is in the gold.');
      }

      /* ---- races: shouting the rhyme first, and calling "Strings!" ---- */
      function startRace(kind) {
        var wait = kind === 'shout' ? 900 + rnd() * 1100 : 450 + rnd() * 600;
        G.race = { kind: kind, state: 'wait', winner: null };
        G.phase = kind === 'shout' ? 'shout' : 'tangle';
        if (kind === 'shout') {
          say('Get ready to shout the rhyme. Whoever shouts first strikes first');
          setAct('Wait for it', true);
        } else {
          say('The strings are tangled! Get ready to call Strings!');
          setAct('Wait for it', true);
        }
        later(function () {
          if (!G || !G.race || G.race.state !== 'wait') return;
          G.race.state = 'go';
          G.race.goT = performance.now();
          if (kind === 'shout') { say('Shout! Tap, click or press Space'); setAct('Shout!', true); }
          else { say('Strings! Call it first: tap, click or press Space'); setAct('Strings!', true); }
          api.sound('bell');
          var lv = LEVELS[level], ms = lv.react[0] + rnd() * (lv.react[1] - lv.react[0]);
          later(function () { if (G && G.race && G.race.state === 'go') finishRace('cpu', false); }, ms);
          kick();
        }, wait);
        kick();
      }
      function finishRace(winner, early) {
        var r = G.race;
        if (!r || r.state === 'done') return;
        r.state = 'done';
        r.winner = winner;
        r.early = early;
        r.ms = r.goT ? Math.round(performance.now() - r.goT) : 0;
        setAct('Wait', false);
        if (r.kind === 'shout') {
          var rhyme = 'Obbly, obbly onkers, my first conquers!';
          if (winner === 'you') { api.sound('coin'); pop('First strike!', P.gold); say('You shouted "' + rhyme + '" first, so you strike first'); }
          else { api.sound('wrong'); pop(early ? 'Too soon!' : 'Computer first!', P.ink); say((early ? 'Too soon! ' : '') + 'The computer shouted "' + rhyme + '" first, so it strikes first'); }
          later(function () { G.race = null; startTurn(winner); }, reduced ? 700 : 1500);
        } else {
          if (winner === 'you') { api.sound('coin'); pop('Your call!', P.gold); }
          else { api.sound('wrong'); pop(early ? 'Too soon!' : 'Computer called it!', P.ink); }
          say((winner === 'you' ? 'You called Strings! first' : (early ? 'Too soon! ' : '') + 'The computer called Strings! first') + ' and ' + (winner === 'you' ? 'get' : 'gets') + ' an extra strike');
          G.tangleDir = -1;
          if (reduced) G.tangle = 0;
          later(function () {
            G.race = null;
            if (winner === G.striker) startStrike(true);
            else { G.bonus = { back: G.striker }; G.striker = winner; startStrike(true); }
          }, reduced ? 700 : 1300);
        }
        kick();
      }

      /* ---- turns and strikes ---- */
      function startTurn(who) {
        G.striker = who;
        G.left = STRIKES;
        G.bonus = null;
        startStrike(false);
      }
      function nextStrike() {
        if (G.over) return;
        if (G.bonus) {
          var b = G.bonus;
          G.bonus = null;
          G.striker = b.back;
          if (G.left > 0) startStrike(false); else startTurn(other(b.back));
          return;
        }
        if (G.left > 0) startStrike(false); else startTurn(other(G.striker));
      }
      function startStrike(extra) {
        var who = G.striker;
        G.phase = 'strike';
        var s0 = (rnd() * 2 - 1) * 0.65;
        var label = extra ? 'extra strike' : 'strike ' + (STRIKES - G.left + 1) + ' of ' + STRIKES;
        G.meter = { t: 0, s0: s0, stop: null, result: null, extra: extra, label: label, phase0: 0 };
        G.reachTo = who;
        G.swing = null;
        if (who === 'you') {
          say('Your ' + label + ': press when the needle is in the gold');
          setAct('Strike!', true);
        } else {
          say("The computer's " + label);
          setAct("Computer's strike", false);
          /* The computer decides where it will let go (its timing wobbles by level) and when, then starts
             its needle at the point of the swing that gets there at that moment. */
          var lv = LEVELS[level], at = clamp(s0 + gauss(rnd) * lv.sd, -0.97, 0.97), when = reduced ? 0.05 : think() / 1000 + 0.45 + rnd() * 0.55;
          G.meter.phase0 = Math.asin(at) * PERIOD / (2 * Math.PI) - when;
          G.meter.plan = { at: at, when: when };
          G.cpuT0 = performance.now();
        }
        describe();
        kick();
      }
      function needleAt(m, t) { return Math.sin(2 * Math.PI * (t + m.phase0) / PERIOD); }
      function needle(t) { return needleAt(G.meter, t); }
      /* Let go: the meter decides how good the strike is, then the conker swings. */
      function release(p) {
        var m = G.meter;
        if (!m || m.stop != null || G.phase !== 'strike') return;
        m.stop = p;
        m.result = strikeQuality(Math.abs(p - m.s0));
        if (G.striker === 'you') G.strikes++; else { G.cpuStrikes++; G.cpuWait = Math.round(performance.now() - G.cpuT0); }
        if (!m.extra) G.left -= 1;
        G.phase = 'swing';
        setAct(G.striker === 'you' ? 'Swinging' : "Computer's strike", false);
        api.sound('whoosh');
        var st = stance(G.striker), res = m.result;
        var shorten = res.kind === 'miss' ? L.rc * 2 + 10 + rnd() * 10 : res.kind === 'glance' ? L.rc * 1.45 : 0;
        G.swing = { t: 0, st: st, len: st.len - shorten, a: st.wind, w: 7 * Math.sign(-st.wind) * (0.8 + 0.4 * res.q), hit: false, res: res, done: false, passed: false };
        if (reduced) { finishStrikeNow(); return; }
        kick();
      }
      /* With reduced motion there is no swing to watch: apply the result at once. */
      function finishStrikeNow() {
        var sw = G.swing;
        if (sw.res.kind !== 'miss') impact(); else missed();
        sw.done = true;
        G.bob[G.striker].a = 0; G.bob[G.striker].w = 0;
        if (!G.over && G.phase === 'swing') { G.phase = 'swung'; afterSwing(); }
      }
      function impact() {
        var sw = G.swing, who = G.striker, them = other(who);
        sw.hit = true;
        var d = damage(G.c[who], G.c[them], sw.res, rnd);
        G.c[them].hp -= d.target;
        G.c[who].hp -= d.striker;
        if (G.c[them].hp <= 0 && G.c[who].hp <= 0) G.c[who].hp = 1;   /* the conker that was hit breaks first */
        var label = sw.res.kind === 'perfect' ? (d.shatter ? 'Shattered!' : 'Perfect!') : sw.res.kind === 'good' ? 'Good hit!' : 'Glancing blow';
        pop(label, sw.res.kind === 'perfect' ? P.gold : P.ink);
        api.sound('thud');
        if (d.target > 18) api.sound('clack');
        if (!reduced) {
          G.shake = Math.min(1, 0.35 + d.target / 40);
          var T = conkerPos(them);
          G.flash = { x: T.x - (who === 'you' ? 1 : -1) * L.rc, y: T.y - L.rc * 0.4, t: 0 };
          chipBurst(T.x, T.y, them, 5 + Math.round(d.target / 5));
          G.bob[them].w += (who === 'you' ? 1 : -1) * (2.5 + 4 * sw.res.q);
          sw.w = -sw.w * 0.25;
        }
        if (G.c[them].hp <= 0) smash(them);
        else if (G.c[who].hp <= 0) smash(who);
        if (saved && G.c.you) { saved.hp = Math.max(0, G.c.you.hp); api.store.set('conker', G.c.you.hp > 0 ? saved : null); }
        describe();
      }
      function missed() {
        var sw = G.swing;
        pop('Missed!', P.ink);
        var r = Math.abs(sw.res ? (G.meter.stop - G.meter.s0) : 1);
        var chance = r < 0.45 ? 0.5 : 0.32;
        sw.tangled = !G.meter.extra && rnd() < chance;
      }
      function afterSwing() {
        var sw = G.swing;
        if (G.over) return;
        if (G.broken.you || G.broken.cpu) return;   /* the smash finishes the match */
        G.reachTo = null;
        if (sw.res.kind === 'miss' && sw.tangled) {
          G.phase = 'tangle';
          G.tangleDir = 1;
          G.tangle = reduced ? 1 : 0.001;
          api.sound('shuffle');
          later(function () { startRace('strings'); }, reduced ? 100 : 450);
          return;
        }
        G.phase = 'pause';
        var msg = sw.res.kind === 'miss' ? (G.striker === 'you' ? 'You missed' : 'The computer missed') : (G.striker === 'you' ? 'Hit!' : 'The computer hit your conker');
        say(msg + ' · ' + strengthText());
        later(function () { G.swing = null; nextStrike(); }, reduced ? 400 : 650);
      }

      /* ---- smashing ---- */
      function smash(who) {
        G.broken[who] = true;
        api.sound('clack');
        api.sound('dice');
        later(function () { api.sound('thud'); }, 120);
        if (G.texts) G.texts.length = 0;
        pop('Smash!', P.vermilion);
        if (!reduced) {
          var c = conkerPos(who), shape = G.shapes[who], cuts = [], n = 7 + Math.floor(rnd() * 3), i;
          for (i = 0; i < n; i++) cuts.push((i + rnd() * 0.6) / n * Math.PI * 2);
          var dir = who === G.striker ? (G.striker === 'you' ? -1 : 1) : (G.striker === 'you' ? 1 : -1);
          for (i = 0; i < n; i++) {
            var a0 = cuts[i], a1 = cuts[(i + 1) % n] + (i === n - 1 ? Math.PI * 2 : 0), pts = [[0, 0]];
            for (var k = 0; k <= 6; k++) { var a = a0 + (a1 - a0) * k / 6, r = radiusAt(shape, a, 1) * L.rc; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
            var mid = (a0 + a1) / 2, sp = 120 + rnd() * 220;
            G.shards.push({ pts: pts, x: c.x, y: c.y, vx: Math.cos(mid) * sp + dir * 140, vy: Math.sin(mid) * sp - 160 - rnd() * 120, r: 0, vr: (rnd() - 0.5) * 14, t: 0, eyeA: mid, who: who });
          }
          chipBurst(c.x, c.y, who, 18);
          G.shake = 1;
        }
        G.phase = 'smash';
        later(function () { endMatch(other(who)); }, reduced ? 900 : 1700);
      }
      function endMatch(winner) {
        G.over = true;
        G.winner = winner;
        G.phase = 'over';
        setAct('New game', true);
        var mine = G.c.you, theirs = G.c.cpu, s = stats[level] || { won: 0, played: 0 };
        s.played = (s.played || 0) + 1;
        if (winner === 'you') {
          s.won = (s.won || 0) + 1;
          var counts = TYPES[mine.type].counts, before = mine.score;
          if (counts) mine.score = mine.score + theirs.score + 1;
          saved = { type: mine.type, score: mine.score, hp: Math.max(1, mine.hp), seed: mine.seed };
          api.store.set('conker', saved);
          if (counts && mine.score > bestEver) { bestEver = mine.score; api.store.set('best', bestEver); }
          var name = scoreName(mine.score);
          if (counts) {
            say('You win! Your conker is now ' + name + (theirs.score ? ', because it took the beaten conker\'s score of ' + theirs.score + ' as well' : '') + '!');
            api.celebrate('Your conker is ' + name + '!');
          } else {
            say('You win! But your conker was baked, so the win does not count: it stays ' + scoreName(before) + '.');
            api.celebrate('You win! (A baked conker\'s wins do not count.)');
          }
        } else {
          theirs.score = theirs.score + mine.score + 1;
          saved = null;
          api.store.set('conker', null);
          say('Smash! Your conker broke. The computer\'s conker is now ' + scoreName(theirs.score) + '. Thread a new one and try again!');
          api.sound('lose');
        }
        stats[level] = s;
        api.store.set('stats', stats);
        showRecord();
        describe();
        kick();
      }

      /* ---- effects ---- */
      function pop(text, c) { if (G) G.texts.push({ text: text, c: c, t: 0 }); }
      function chipBurst(x, y, who, n) {
        if (reduced) return;
        for (var i = 0; i < n; i++) {
          var a = rnd() * Math.PI * 2, sp = 60 + rnd() * 200;
          G.chips.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, t: 0, life: 0.6 + rnd() * 0.6, s: 1.5 + rnd() * 3, who: who });
        }
      }

      /* ---- positions ---- */
      function pivot(who) {
        var r = rest(who);
        var k = ease(G.reach[who]);
        if (k <= 0) return r;
        var st = stance(who);
        return { x: r.x + (st.x - r.x) * k, y: r.y + (st.y - r.y) * k };
      }
      function conkerPos(who) {
        if (G.phase === 'strike' && G.striker === who && G.meter) {
          /* held up and back, ready to swing */
          var st = stance(who), p = pivot(who), k = ease(G.reach[who]), a = st.wind * k + G.bob[who].a * (1 - k), len = L.Ls + (st.len - L.Ls) * k;
          return { x: p.x + Math.sin(a) * len, y: p.y + Math.cos(a) * len, a: a, len: len, p: p };
        }
        if (G.swing && G.striker === who && !G.swing.done) {
          var sw = G.swing;
          return { x: sw.st.x + Math.sin(sw.a) * sw.len, y: sw.st.y + Math.cos(sw.a) * sw.len, a: sw.a, len: sw.len, p: { x: sw.st.x, y: sw.st.y } };
        }
        var pv = pivot(who), b = G.bob[who], ln = G.len[who];
        var pos = { x: pv.x + Math.sin(b.a) * ln, y: pv.y + Math.cos(b.a) * ln, a: b.a, len: ln, p: pv };
        if (G.tangle > 0) {
          /* tangled: both conkers dangle together under a knot between the fists */
          var k2 = ease(G.tangle), A = rest('you'), B = rest('cpu');
          var knot = { x: (A.x + B.x) / 2, y: L.top + L.Ls * 0.55 };
          var tx = knot.x + (who === 'you' ? -1 : 1) * L.rc * 1.02, ty = knot.y + L.Ls * 0.45;
          pos = { x: pos.x + (tx - pos.x) * k2, y: pos.y + (ty - pos.y) * k2, a: pos.a, len: ln, p: pv, knot: knot, k: k2 };
        }
        return pos;
      }
      function settlePositions() { if (!G) return; G.len.you = G.len.cpu = L.Ls; }

      /* ---- update ---- */
      function update(dt) {
        if (!G) return false;
        var busy = false, i;
        ['you', 'cpu'].forEach(function (who) {
          var want = G.reachTo === who ? 1 : 0;
          if (G.reach[who] !== want) { G.reach[who] += (want ? 1 : -1) * dt / 0.3; G.reach[who] = clamp(G.reach[who], 0, 1); busy = true; }
          if (Math.abs(G.len[who] - L.Ls) > 0.5) { G.len[who] += (L.Ls - G.len[who]) * Math.min(1, dt * 6); busy = true; }
          /* hanging conkers swing and settle like pendulums */
          var b = G.bob[who];
          if (!(G.swing && G.striker === who && !G.swing.done)) {
            /* the receiver steadies their conker while the striker lines up */
            var damp = G.phase === 'strike' && G.striker !== who ? 9 : 2.6;
            b.w += (-L.g / G.len[who] * Math.sin(b.a) - damp * b.w) * dt;
            b.a += b.w * dt;
            if (Math.abs(b.a) > 0.002 || Math.abs(b.w) > 0.01) busy = true; else { b.a = 0; b.w = 0; }
          }
        });
        if (G.phase === 'strike' && G.meter) {
          busy = true;
          var m = G.meter;
          m.t += dt;
          if (G.striker === 'cpu' && m.plan && m.t >= m.plan.when) release(m.plan.at);
        }
        if (G.swing && !G.swing.done && !reduced) {
          busy = true;
          var sw = G.swing, steps = Math.ceil(dt / (1 / 240)), h2 = dt / steps;
          for (i = 0; i < steps; i++) {
            sw.w += (-L.g / sw.len * Math.sin(sw.a)) * h2;
            sw.a += sw.w * h2;
            sw.t += h2;
            if (!sw.hit && !sw.passed && sw.res.kind !== 'miss') {
              var S = conkerPos(G.striker), T = conkerPos(other(G.striker));
              var dx = T.x - S.x, dy = T.y - S.y;
              if (dx * dx + dy * dy <= (L.rc * 2) * (L.rc * 2) * 1.02) impact();
            }
            var past = G.striker === 'you' ? sw.a > sw.st.imp + 0.35 : sw.a < sw.st.imp - 0.35;
            if (!sw.passed && past) {
              sw.passed = true;
              if (!sw.hit) { if (sw.res.kind === 'miss') missed(); else impact(); }
            }
          }
          if (!sw.done && sw.t > 0.62) {
            /* hand the swinging conker back to its fist, which now goes home */
            G.bob[G.striker].a = sw.a * 0.6;
            G.bob[G.striker].w = sw.w * 0.3;
            G.len[G.striker] = sw.len;
            sw.done = true;
            G.reachTo = null;
            if (G.phase === 'swing') { G.phase = 'swung'; afterSwing(); }
          }
        }
        if (G.tangleDir === 1 && G.tangle < 1) { G.tangle = Math.min(1, G.tangle + dt / 0.35); busy = true; }
        if (G.tangleDir === -1 && G.tangle > 0) { G.tangle = Math.max(0, G.tangle - dt / 0.35); busy = true; }
        if (G.race) busy = true;
        if (G.shake > 0) { G.shake = Math.max(0, G.shake - dt * 3.2); busy = true; }
        if (G.flash) { G.flash.t += dt; busy = true; if (G.flash.t > 0.25) G.flash = null; }
        for (i = G.texts.length - 1; i >= 0; i--) { G.texts[i].t += dt; busy = true; if (G.texts[i].t > 1.1) G.texts.splice(i, 1); }
        for (i = G.chips.length - 1; i >= 0; i--) {
          var c = G.chips[i];
          c.t += dt; c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
          if (c.y > L.ground) { c.y = L.ground; c.vy *= -0.3; c.vx *= 0.6; }
          busy = true;
          if (c.t > c.life) G.chips.splice(i, 1);
        }
        for (i = G.shards.length - 1; i >= 0; i--) {
          var s = G.shards[i];
          s.t += dt; s.vy += 1400 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt;
          if (s.y > L.ground - 4) { s.y = L.ground - 4; s.vy *= -0.32; s.vx *= 0.7; s.vr *= 0.6; }
          busy = true;
          if (s.t > 2.2) G.shards.splice(i, 1);
        }
        return busy;
      }

      /* ---- drawing ---- */
      function render() {
        if (!L) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, L.W, L.H);
        ctx.drawImage(back, 0, 0, L.W, L.H);
        if (!G) return;
        ctx.save();
        if (G.shake > 0 && !reduced) ctx.translate((rnd() - 0.5) * 10 * G.shake, (rnd() - 0.5) * 8 * G.shake);
        if (G.phase === 'strike' || (G.phase === 'swing' && G.meter) || (G.meter && G.meter.stop != null && G.phase === 'swung')) drawMeter();
        var order = G.striker === 'cpu' ? ['you', 'cpu'] : ['cpu', 'you'];
        order.forEach(drawHanging);
        G.shards.forEach(drawShard);
        G.chips.forEach(function (c) {
          var cc = conkerColours(G.c[c.who].type);
          ctx.fillStyle = col(c.t < 0.15 ? cc.light : cc.base, 1 - c.t / c.life);
          ctx.fillRect(c.x - c.s / 2, c.y - c.s / 2, c.s, c.s);
        });
        if (G.flash) {
          var k = G.flash.t / 0.25;
          ctx.strokeStyle = col(P.gold, 1 - k); ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(G.flash.x, G.flash.y, L.rc * (0.4 + k * 1.4), 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
        drawRace();
        G.texts.forEach(function (t) {
          var k = t.t / 1.1, fs = Math.round(clamp(L.W * 0.075, 26, 54));
          ctx.globalAlpha = 1 - ease((k - 0.65) / 0.35);
          ctx.font = '700 ' + fs + 'px ' + P.fontChalk;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          var y = L.top + L.Ls * 0.42 - k * 18, sc = 1 + 0.25 * (1 - ease(k * 4));
          ctx.save(); ctx.translate(L.W / 2, y); ctx.scale(sc, sc);
          ctx.lineWidth = 6; ctx.strokeStyle = col(P.shadow, 0.85); ctx.strokeText(t.text, 0, 0);
          ctx.fillStyle = col(t.c); ctx.fillText(t.text, 0, 0);
          ctx.restore();
          ctx.globalAlpha = 1;
        });
      }
      function drawFist(x, y, who) {
        var s = L.rc / 26, w = 46 * s, hh = 34 * s, side = who === 'you' ? 1 : -1;
        ctx.save();
        ctx.translate(x, y);
        /* the sleeve, up and out of the picture */
        ctx.fillStyle = col(mix(P.surface2, who === 'you' ? P.vermilion : P.peacock, 0.35));
        ctx.beginPath(); ctx.moveTo(-w * 0.42, -hh * 0.3); ctx.lineTo(-w * 0.55 - side * 10 * s, -L.H); ctx.lineTo(w * 0.55 - side * 10 * s, -L.H); ctx.lineTo(w * 0.42, -hh * 0.3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = col(P.ink, 0.5); ctx.lineWidth = 2; ctx.stroke();
        /* the fist: knuckles towards the other player */
        ctx.fillStyle = col(mix(P.muted, P.gold, 0.25));
        ctx.strokeStyle = col(P.ink, 0.9); ctx.lineWidth = 2.2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-w / 2, -hh / 2, w, hh, 12 * s); else ctx.rect(-w / 2, -hh / 2, w, hh);
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = col(P.shadow, 0.55); ctx.lineWidth = 1.6;
        for (var i = 1; i < 4; i++) { var kx = -w / 2 + w * i / 4; ctx.beginPath(); ctx.moveTo(kx, -hh * 0.42); ctx.lineTo(kx, hh * 0.05); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(side * w * 0.5, hh * 0.1); ctx.quadraticCurveTo(side * w * 0.15, hh * 0.32, -side * w * 0.2, hh * 0.15); ctx.stroke();
        ctx.restore();
      }
      function drawHanging(who) {
        var pos = conkerPos(who), pv = pos.p;
        /* the string */
        ctx.strokeStyle = col(P.ink, 0.85); ctx.lineWidth = Math.max(1.6, L.rc * 0.08); ctx.lineCap = 'round';
        if (G.broken[who]) {
          var stub = { x: pv.x + Math.sin(pos.a) * pos.len * 0.85, y: pv.y + Math.cos(pos.a) * pos.len * 0.85 };
          ctx.beginPath(); ctx.moveTo(pv.x, pv.y); ctx.lineTo(stub.x, stub.y); ctx.stroke();
          ctx.fillStyle = col(P.ink, 0.9); ctx.beginPath(); ctx.arc(stub.x, stub.y, L.rc * 0.13, 0, Math.PI * 2); ctx.fill();
        } else if (pos.knot && pos.k > 0) {
          ctx.beginPath(); ctx.moveTo(pv.x, pv.y); ctx.lineTo(pos.knot.x, pos.knot.y); ctx.lineTo(pos.x, pos.y - L.rc * 0.9); ctx.stroke();
          if (who === 'cpu') drawTwist(pos.knot, pos.k);
        } else {
          ctx.beginPath(); ctx.moveTo(pv.x, pv.y); ctx.lineTo(pos.x - Math.sin(pos.a) * L.rc * 0.9, pos.y - Math.cos(pos.a) * L.rc * 0.9); ctx.stroke();
        }
        drawFist(pv.x, pv.y, who);
        if (!G.broken[who]) drawConker(who, pos.x, pos.y, pos.a);
      }
      function drawTwist(knot, k) {
        ctx.strokeStyle = col(P.gold, 0.9 * k); ctx.lineWidth = 2;
        for (var i = 0; i < 4; i++) {
          var y = knot.y + 4 + i * 6;
          ctx.beginPath(); ctx.moveTo(knot.x - 6, y); ctx.quadraticCurveTo(knot.x, y + 5, knot.x + 6, y + 1); ctx.stroke();
        }
      }
      function conkerPath(shape, r, dmg) {
        ctx.beginPath();
        for (var i = 0; i <= 48; i++) {
          var a = i / 48 * Math.PI * 2, rr = radiusAt(shape, a, dmg) * r;
          if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
      }
      function drawConker(who, x, y, a) {
        var c = G.c[who], shape = G.shapes[who], r = L.rc * (c.type === 'seasoned' ? 0.94 : 1), dmg = clamp(1 - c.hp / 100, 0, 1);
        var cc = conkerColours(c.type);
        ctx.save();
        ctx.translate(x, y);
        /* shadow on the wall behind */
        ctx.fillStyle = col(P.shadow, 0.35);
        ctx.beginPath(); ctx.ellipse(r * 0.25, r * 0.35, r, r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
        ctx.rotate(a * 0.5 + shape.tilt);
        conkerPath(shape, r, dmg);
        var g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
        g.addColorStop(0, col(cc.light)); g.addColorStop(0.55, col(cc.base)); g.addColorStop(1, col(cc.dark));
        ctx.fillStyle = g; ctx.fill();
        ctx.save();
        ctx.clip();
        /* the pale "eye" where the conker joined its case */
        var ea = shape.eye.a, ex = Math.cos(ea) * r * 0.62, ey = Math.sin(ea) * r * 0.62;
        ctx.fillStyle = col(P.eye, 0.95);
        ctx.beginPath(); ctx.ellipse(ex, ey, r * shape.eye.w, r * shape.eye.w * 0.72, ea, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col(mix(P.eye, P.shadow, 0.3), 0.6);
        for (var i = 0; i < 8; i++) { var ra = ea + (i - 4) * 0.12, rr2 = r * (0.6 + (i % 3) * 0.08); ctx.fillRect(Math.cos(ra) * rr2, Math.sin(ra) * rr2, 1.5, 1.5); }
        if (c.type === 'seasoned') {
          ctx.strokeStyle = col(cc.dark, 0.7); ctx.lineWidth = 1.2;
          for (i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-r * 0.1 + i * r * 0.12, -r * 0.05, r * (0.45 + i * 0.1), -1.2 + i * 0.2, -0.3 + i * 0.2); ctx.stroke(); }
        }
        if (c.type === 'baked') {
          var bg = ctx.createRadialGradient(r * 0.3, -r * 0.5, 0, r * 0.3, -r * 0.5, r * 0.9);
          bg.addColorStop(0, col(P.shadow, 0.6)); bg.addColorStop(1, col(P.shadow, 0));
          ctx.fillStyle = bg; ctx.fillRect(-r, -r, r * 2, r * 2);
        }
        /* cracks, more of them as it takes damage */
        var show = Math.floor(dmg * shape.cracks.length * 1.25 + 0.0001);
        shape.cracks.forEach(function (cr, idx) {
          if (idx >= show) return;
          ctx.strokeStyle = col(P.shadow, 0.95); ctx.lineWidth = Math.max(1.2, r * (cr.minor ? 0.04 : 0.065)); ctx.lineJoin = 'round';
          ctx.beginPath();
          cr.pts.forEach(function (p, j) { if (j) ctx.lineTo(p[0] * r, p[1] * r); else ctx.moveTo(p[0] * r, p[1] * r); });
          ctx.stroke();
          ctx.strokeStyle = col(cc.light, 0.45); ctx.lineWidth = 1;
          ctx.beginPath();
          cr.pts.forEach(function (p, j) { if (j) ctx.lineTo(p[0] * r + 1, p[1] * r + 1); else ctx.moveTo(p[0] * r + 1, p[1] * r + 1); });
          ctx.stroke();
        });
        ctx.restore();
        /* the shine */
        ctx.fillStyle = col(P.ink, 0.5 * cc.gloss);
        ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.28, r * 0.15, -0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col(P.ink, 0.9 * cc.gloss);
        ctx.beginPath(); ctx.arc(-r * 0.45, -r * 0.47, Math.max(1, r * 0.06), 0, Math.PI * 2); ctx.fill();
        conkerPath(shape, r, dmg);
        ctx.strokeStyle = col(cc.dark, 0.9); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
        /* the knot under the conker */
        ctx.fillStyle = col(P.ink, 0.9);
        ctx.beginPath(); ctx.arc(x - Math.sin(a) * -r * 1.0, y + Math.cos(a) * r * 1.02, Math.max(2, r * 0.1), 0, Math.PI * 2); ctx.fill();
      }
      function drawShard(s) {
        var cc = conkerColours(G.c[s.who].type), alpha = s.t > 1.6 ? 1 - (s.t - 1.6) / 0.6 : 1;
        ctx.save();
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.translate(s.x, s.y); ctx.rotate(s.r);
        ctx.beginPath();
        s.pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
        ctx.closePath();
        var g = ctx.createLinearGradient(-L.rc, -L.rc, L.rc, L.rc);
        g.addColorStop(0, col(cc.light)); g.addColorStop(1, col(cc.dark));
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = col(P.eye, 0.85); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(s.pts[0][0], s.pts[0][1]); ctx.lineTo(s.pts[1][0], s.pts[1][1]); ctx.stroke();
        ctx.restore();
      }
      function roundRect(x, y, w, hh, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x + r, y + hh); ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
      }
      /* The swing meter: a little conker on a string swings across an arc; the gold is the sweet spot. */
      function drawMeter() {
        var m = G.meter, M = L.meter, span = Math.PI / 3, mine = G.striker === 'you';
        var cx = M.x, cy = M.y, r = M.r;
        function arcAt(p0, p1, colr, width) {
          var a0 = Math.PI / 2 - clamp(p1, -1, 1) * span, a1 = Math.PI / 2 - clamp(p0, -1, 1) * span;
          ctx.strokeStyle = colr; ctx.lineWidth = width; ctx.lineCap = 'butt';
          ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
        }
        var tw = Math.max(12, r * 0.2);
        arcAt(-1, 1, col(P.shadow, 0.75), tw + 6);
        arcAt(-1, 1, col(P.ink, 0.16), tw);
        arcAt(m.s0 - ZONES.glance, m.s0 + ZONES.glance, col(P.gold, 0.35), tw);
        arcAt(m.s0 - ZONES.good, m.s0 + ZONES.good, col(P.gold, 0.85), tw);
        arcAt(m.s0 - ZONES.perfect, m.s0 + ZONES.perfect, col(P.ink, 0.95), tw);
        /* ticks */
        ctx.strokeStyle = col(P.ink, 0.5); ctx.lineWidth = 1.5;
        for (var i = -4; i <= 4; i++) {
          var ta = Math.PI / 2 - i / 4 * span;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(ta) * (r + tw / 2 + 2), cy + Math.sin(ta) * (r + tw / 2 + 2)); ctx.lineTo(cx + Math.cos(ta) * (r + tw / 2 + 7), cy + Math.sin(ta) * (r + tw / 2 + 7)); ctx.stroke();
        }
        var p = m.stop != null ? m.stop : needle(m.t), na = Math.PI / 2 - p * span;
        var bx = cx + Math.cos(na) * r, by = cy + Math.sin(na) * r;
        ctx.strokeStyle = col(P.ink, 0.95); ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by); ctx.stroke();
        ctx.fillStyle = col(P.ink); ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
        var br = Math.max(8, tw * 0.62);
        var g = ctx.createRadialGradient(bx - br * 0.35, by - br * 0.35, 1, bx, by, br);
        g.addColorStop(0, col(mix(P.conker, P.gold, 0.5))); g.addColorStop(1, col(mix(P.conker, P.shadow, 0.4)));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = col(m.stop != null ? P.gold : P.ink, 0.9); ctx.lineWidth = 2; ctx.stroke();
        var fs = Math.round(clamp(L.W * 0.028, 13, 18));
        ctx.font = '700 ' + fs + 'px ' + P.fontHead; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = col(mine ? P.gold : P.ink);
        ctx.fillText((mine ? 'YOUR ' : "COMPUTER'S ") + m.label.toUpperCase(), cx, cy - 10);
      }
      function drawRace() {
        var r = G.race;
        if (!r) return;
        var fs = Math.round(clamp(L.W * 0.05, 18, 34)), y = L.meter.y + L.meter.r * 0.35;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (r.kind === 'shout') {
          ctx.font = '700 ' + Math.round(fs * 0.62) + 'px ' + P.fontHead;
          ctx.fillStyle = col(P.muted);
          var lines = L.narrow ? ['"Obbly, obbly onkers,', 'my first conquers!"'] : ['"Obbly, obbly onkers, my first conquers!"'];
          lines.forEach(function (ln, i) { ctx.fillText(ln, L.W / 2, y - fs * 1.5 + i * fs * 0.8); });
        }
        ctx.font = '700 ' + fs + 'px ' + P.fontChalk;
        if (r.state === 'wait') { ctx.fillStyle = col(P.ink, 0.8); ctx.fillText('Ready...', L.W / 2, y + fs * 0.3); }
        else if (r.state === 'go') {
          var t = (performance.now() - r.goT) / 1000, sc = 1 + 0.15 * Math.sin(t * 18);
          ctx.save(); ctx.translate(L.W / 2, y + fs * 0.3); ctx.scale(sc, sc);
          ctx.lineWidth = 6; ctx.strokeStyle = col(P.shadow, 0.85);
          var word = r.kind === 'shout' ? 'SHOUT!' : 'STRINGS!';
          ctx.strokeText(word, 0, 0);
          ctx.fillStyle = col(P.gold); ctx.fillText(word, 0, 0);
          ctx.restore();
        }
      }

      /* ---- acting: Space, a click or a tap ---- */
      function act() {
        if (api.unlockSound) api.unlockSound();
        lastAct = performance.now();
        if (!G) return;
        if (G.over) { newGame(); return; }
        if (G.race && G.race.state !== 'done') {
          if (G.race.state === 'wait') finishRace('cpu', true);
          else finishRace('you', false);
          return;
        }
        if (G.phase === 'strike' && G.striker === 'you' && G.meter && G.meter.stop == null) release(needle(G.meter.t));
      }
      actBtn.addEventListener('pointerdown', function (e) { if (e.button > 0) return; e.preventDefault(); act(); });
      actBtn.addEventListener('click', function () { if (performance.now() - lastAct > 500) act(); });
      canvas.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        try { canvas.focus({ preventScroll: true }); } catch (err) { /* ignore */ }
        act();
      });
      function onKey(e) {
        if (e.key !== ' ' && e.key !== 'Spacebar' && e.key !== 'Enter') return;
        if (e.target !== canvas && e.target !== actBtn) return;
        e.preventDefault();
        if (e.repeat) return;
        act();
      }
      root.addEventListener('keydown', onKey);

      var ro = null;
      if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(function () { resize(); }); ro.observe(root); }
      window.addEventListener('resize', resize);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!destroyed) render(); });

      /* A small window for the play-test script. */
      root.gitTest = {
        state: function () {
          if (!G) return { phase: 'choose', saved: saved, best: bestEver };
          var m = G.meter;
          return {
            phase: G.phase, striker: G.striker, left: G.left, over: G.over, winner: G.winner, strikes: G.strikes, cpuStrikes: G.cpuStrikes,
            you: { hp: G.c.you.hp, score: G.c.you.score, type: G.c.you.type }, cpu: { hp: G.c.cpu.hp, score: G.c.cpu.score, type: G.c.cpu.type },
            race: G.race ? { kind: G.race.kind, state: G.race.state } : null, tangled: G.tangle > 0,
            needle: m ? (m.stop != null ? m.stop : needle(m.t)) : null, s0: m ? m.s0 : null, cpuWait: G.cpuWait || 0,
            saved: saved, best: bestEver, running: !!raf, broken: G.broken
          };
        }
      };

      newGame();
      resize();

      return {
        destroy: function () {
          destroyed = true;
          clearTimers();
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          document.removeEventListener('visibilitychange', onVisibility);
          window.removeEventListener('resize', resize);
          root.removeEventListener('keydown', onKey);
          if (ro) ro.disconnect();
          delete root.gitTest;
        }
      };
    }
  });
})();
