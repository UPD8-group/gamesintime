/* Tiddlywinks for Games in Time.

   Joseph Assheton Fincher's game, patented in 1888: press the edge of a small counter (a wink) with a bigger
   one (the squidger) so the wink hops, and try to land it in the cup. Seen from above on a felt mat, with a
   little height so a hopping wink rises over its shadow and the cup looks like a real pot.

   Rules used (see docs/game-notes/tiddlywinks.json):
     - Each player has four winks of one colour. Squidge one wink a turn.
     - Pot a wink in the cup and you shoot again.
     - A wink that lands on top of another wink "squops" it. A squopped wink cannot be played until the
       wink on top of it moves off. Even the 1890 rules said so.
     - A wink that flies off the mat goes back on at the edge.
     - Solo: pot all four in as few shots as you can. Against the computer: first to pot all four wins.

   How the file is organised:
     Part 1  The hop: where a squidged wink goes, worked out in advance as a path, including the cup's rim and
             wall and landing on other winks. The same function lets the computer imagine shots.
     Part 2  The computer player.
     Part 3  The game: layout, drawing, turns, pointer and keyboard.
   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  /* World units: the mat is 300 by 300 with the cup in the middle. */
  var MAT = 300, CX = 150, CY = 150;
  var CUP_OUT = 26, CUP_IN = 21, CUP_H = 22;   /* the cup's outside and inside radius, and its height */
  var RW = 9;                                  /* a wink's radius */
  var RS = 15;                                 /* the squidger's radius */
  var THICK = 2.4;                             /* how thick a wink is */
  var STACK = 4.5;                             /* how high a squopping wink is drawn above the one below */
  var LIFT = 0.55;                             /* how far up the screen one unit of height is drawn */
  var RANGE = 280;                             /* how far a full-power squidge sends a wink */
  var STEP = 1 / 120;                          /* the hop's path is worked out in steps of this many seconds */
  var THINK_MS = 350;                          /* the computer's pause before it acts */
  var START_X = [78, 126, 174, 222], YOU_Y = 262, CPU_Y = 38;
  /* How much the computer's hand wobbles: aim in radians, power as a fraction. Tuned offline so that from
     the starting row about 1 shot in 4 goes in on Easy, 2 in 5 on Medium and 2 in 3 on Hard. */
  var LEVELS = {
    easy: { label: 'Easy', aim: 0.3, power: 0.35 },
    medium: { label: 'Medium', aim: 0.18, power: 0.22 },
    hard: { label: 'Hard', aim: 0.11, power: 0.13 }
  };

  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }
  function seeded(seed) {
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gauss(rnd) { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(Math.max(1e-9, u))) * Math.cos(2 * Math.PI * v); }

  /* =====================================================================
     PART 1: THE HOP
     A squidged wink flies in an arc. Its path is sampled every STEP seconds. On the way it may:
       - drop into the cup from above (potted), or clip the rim and rattle in or bounce out;
       - hit the outside wall of the cup if it is too low, and fall back;
       - land on another wink (a squop), or skid a little on the felt and stop.
     ===================================================================== */
  function hop(x0, y0, dir, power, others) {
    var ux = Math.cos(dir), uy = Math.sin(dir);
    var D = 4 + clamp(power, 0, 1) * RANGE, mainD = D;
    var path = [], res = { pot: false, rim: false, events: [], path: path, x: x0, y: y0, level: 0, under: null, off: false };
    var x = x0, y = y0, z0 = 0, f0 = 0;
    var H = 0.42 * D + 14, T = 0.4 + 0.34 * Math.sqrt(D / RANGE), flips = 1 + Math.floor(D / 120);
    var edge = CUP_OUT + RW * 0.5;
    for (var arc = 0; arc < 3; arc++) {
      var n = Math.max(3, Math.round(T / STEP)), hit = null, hx = 0, hy = 0, hz = 0, left = 0;
      var pz = z0, prho = dist(x, y, CX, CY);
      for (var i = 1; i <= n; i++) {
        var k = i / n, sx = x + ux * D * k, sy = y + uy * D * k, sz = z0 * (1 - k) + 4 * H * k * (1 - k);
        var rho = dist(sx, sy, CX, CY);
        path.push({ x: sx, y: sy, z: sz, f: f0 + k * flips * Math.PI, ux: ux, uy: uy });
        if (sz < CUP_H && rho < edge) {
          if (pz >= CUP_H) hit = rho <= CUP_IN - RW * 0.35 ? 'pot' : rho < (CUP_IN + CUP_OUT) / 2 ? 'rim-in' : 'rim-out';
          else if (prho >= edge) hit = 'wall';
        }
        if (hit) { hx = sx; hy = sy; hz = sz; left = D * (1 - k); break; }
        pz = sz; prho = rho;
      }
      if (!hit) { x += ux * D; y += uy * D; break; }
      res.events.push(hit);
      if (hit === 'pot' || hit === 'rim-in') {
        /* down it goes */
        var ex = CX + (hx - CX) * 0.35, ey = CY + (hy - CY) * 0.35, last = path[path.length - 1].f;
        for (var j = 1; j <= 20; j++) {
          var q = j / 20;
          path.push({ x: hx + (ex - hx) * q, y: hy + (ey - hy) * q, z: hz * (1 - q * q) - 1.5 * q, f: last + q * 0.6, ux: ux, uy: uy, inCup: true });
        }
        res.pot = true; res.rim = hit === 'rim-in'; res.x = ex; res.y = ey;
        return res;
      }
      /* bounce off the rim or the wall, away from the middle of the cup */
      var nx = hx - CX, ny = hy - CY, nl = Math.sqrt(nx * nx + ny * ny) || 1;
      nx /= nl; ny /= nl;
      var dot = ux * nx + uy * ny;
      if (dot < 0) { ux -= 2 * dot * nx; uy -= 2 * dot * ny; }
      x = hx; y = hy; z0 = hz; f0 = path[path.length - 1].f;
      if (hit === 'rim-out') { D = 10 + 0.2 * left; H = 5 + 0.25 * D; T = 0.24; flips = 1; }
      else { D = Math.max(4, 0.18 * left); H = 1.5 + 0.15 * D; T = 0.16; flips = 0; }
    }
    var lastF = path.length ? path[path.length - 1].f : 0;
    /* landed on another wink? Then it sits on top: a squop */
    var under = null, lvl = 0;
    others.forEach(function (o) {
      var d = dist(o.x, o.y, x, y);
      if (d < RW * 1.6 && (!under || o.level > under.level)) under = o;
    });
    if (under) {
      others.forEach(function (o) { if (dist(o.x, o.y, x, y) < RW * 2 && o.level + 1 > lvl) lvl = o.level + 1; });
      res.level = lvl; res.under = under;
      res.events.push('squop');
    } else {
      /* a little skid on the felt */
      var skid = Math.min(9, 0.045 * mainD + 1.5), steps = Math.ceil(skid / 0.6);
      for (var s = 0; s < steps; s++) {
        var nx2 = x + ux * 0.6, ny2 = y + uy * 0.6;
        if (dist(nx2, ny2, CX, CY) < CUP_OUT + RW) break;
        var bump = false;
        for (var b = 0; b < others.length; b++) if (dist(others[b].x, others[b].y, nx2, ny2) < RW * 2) { bump = true; break; }
        if (bump) break;
        x = nx2; y = ny2;
        path.push({ x: x, y: y, z: 0, f: lastF, ux: ux, uy: uy });
      }
      /* rest against, not inside, anything it touches */
      for (var it = 0; it < 4; it++) {
        others.forEach(function (o) {
          var d = dist(o.x, o.y, x, y);
          if (d < RW * 2) { var k2 = (RW * 2 + 0.3 - d) / (d || 1); x += (x - o.x) * k2; y += (y - o.y) * k2; }
        });
        var rc = dist(x, y, CX, CY);
        if (rc < CUP_OUT + RW) { x = CX + (x - CX) * (CUP_OUT + RW + 0.3) / (rc || 1); y = CY + (y - CY) * (CUP_OUT + RW + 0.3) / (rc || 1); }
      }
    }
    /* off the mat: it goes back on at the edge */
    var lo = RW + 3, hi = MAT - RW - 3;
    if (x < lo || x > hi || y < lo || y > hi) {
      res.off = true;
      var ox = x, oy = y, cx2 = clamp(x, lo, hi), cy2 = clamp(y, lo, hi);
      for (var m = 1; m <= 24; m++) path.push({ x: ox + (cx2 - ox) * ease(m / 24), y: oy + (cy2 - oy) * ease(m / 24), z: 0, f: lastF, ux: ux, uy: uy });
      x = cx2; y = cy2;
      res.level = 0; res.under = null;
    }
    path.push({ x: x, y: y, z: res.level * STACK, f: lastF, ux: ux, uy: uy });
    res.x = x; res.y = y;
    return res;
  }
  /* A wink is squopped when a wink higher up the pile overlaps it. */
  function isCovered(w, winks) {
    for (var i = 0; i < winks.length; i++) {
      var o = winks[i];
      if (o !== w && !o.potted && o.level > w.level && dist(o.x, o.y, w.x, w.y) < RW * 1.9) return true;
    }
    return false;
  }
  function powerFor(d) { return clamp((d - 4) / RANGE, 0, 1); }

  /* =====================================================================
     PART 2: THE COMPUTER
     For each of its free winks, the computer imagines 24 squidges aimed at the middle of the cup, each
     with the wobble its hand really has, and counts how many go in. It plays the wink with the best
     chance. On Hard it will sometimes squop your wink that is nearest the cup instead. If nothing has
     a chance (say its wink is right against the cup), it hops a wink back to a better spot.
     ===================================================================== */
  function planCpu(winks, owner, level, rnd) {
    var L = LEVELS[level] || LEVELS.medium, imagine = seeded(1888);
    var noise = [];
    for (var k = 0; k < 24; k++) noise.push([gauss(imagine), gauss(imagine)]);
    var mine = winks.filter(function (w) { return w.owner === owner && !w.potted && !isCovered(w, winks); });
    if (!mine.length) return null;
    function chance(w, dir, power, test) {
      var others = winks.filter(function (o) { return o !== w && !o.potted; }), hits = 0;
      noise.forEach(function (e) { if (test(hop(w.x, w.y, dir + e[0] * L.aim, power * (1 + e[1] * L.power), others))) hits++; });
      return hits / noise.length;
    }
    var options = [];
    mine.forEach(function (w) {
      var d = dist(w.x, w.y, CX, CY), dir = Math.atan2(CY - w.y, CX - w.x);
      [0.98, 1.02, 1.07].forEach(function (m) {
        var p = powerFor(d) * m;
        options.push({ wink: w, dir: dir, power: p, kind: 'pot', chance: chance(w, dir, p, function (r) { return r.pot; }) });
      });
    });
    options.sort(function (a, b) { return b.chance - a.chance; });
    var best = options[0];
    if (level === 'hard' && best.chance < 0.45) {
      var foes = winks.filter(function (w) { return w.owner !== owner && !w.potted && !isCovered(w, winks); })
        .sort(function (a, b) { return dist(a.x, a.y, CX, CY) - dist(b.x, b.y, CX, CY); }).slice(0, 2);
      foes.forEach(function (t) {
        mine.forEach(function (w) {
          var d = dist(w.x, w.y, t.x, t.y);
          if (d < RW * 3) return;
          var dir = Math.atan2(t.y - w.y, t.x - w.x), p = powerFor(d);
          var c = chance(w, dir, p, function (r) { return r.under === t; });
          if (c > best.chance + 0.15) best = { wink: w, dir: dir, power: p, kind: 'squop', chance: c, target: t };
        });
      });
    }
    if (best.chance < 0.05) {
      /* lay up: hop the wink nearest the cup to a spot about 75 away from the middle */
      var w2 = mine.slice().sort(function (a, b) { return dist(a.x, a.y, CX, CY) - dist(b.x, b.y, CX, CY); })[0];
      var away = Math.atan2(w2.y - CY, w2.x - CX), tx = CX + Math.cos(away) * 75, ty = CY + Math.sin(away) * 75;
      tx = clamp(tx, 30, MAT - 30); ty = clamp(ty, 30, MAT - 30);
      best = { wink: w2, dir: Math.atan2(ty - w2.y, tx - w2.x), power: powerFor(Math.max(14, dist(w2.x, w2.y, tx, ty))), kind: 'layup', chance: 0 };
    }
    return {
      wink: best.wink, kind: best.kind, target: best.target || null,
      dir: best.dir + gauss(rnd) * L.aim,
      power: clamp(best.power * (1 + gauss(rnd) * L.power), 0.02, 1)
    };
  }

  GamesInTime.register({
    id: 'tiddlywinks',
    frame: 'table',
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
        P.vermilion = rgb('--vermilion', '--red'); P.rose = rgb('--rose'); P.peacock = rgb('--peacock'); P.cobalt = rgb('--cobalt');
        P.felt = rgb('--brand'); P.felt2 = rgb('--brand-2', '--brand');
        P.you = P.vermilion; P.cpu = P.rose;
        /* the cup is cream china with a gold band; the squidger is bone */
        P.china = mix(P.ink, P.gold, 0.12); P.bone = mix(P.ink, P.goldShadow, 0.25);
        P.fontPoster = cssVar('--font-poster') || cssVar('--font-display') || 'serif';
        P.fontDisplay = cssVar('--font-display') || 'serif';
        P.fontHead = cssVar('--font-head') || 'sans-serif';
      }
      readColours();

      /* ---- settings and records ---- */
      var mode = api.store.get('mode', 'cpu') === 'solo' ? 'solo' : 'cpu';
      var level = api.store.get('level', 'medium');
      if (!LEVELS[level]) level = 'medium';
      var best = api.store.get('best', 0);
      var stats = api.store.get('stats', {});
      if (!stats || typeof stats !== 'object') stats = {};

      root.appendChild(h('style', null,
        '.game-tiddlywinks .tw-stage { position: relative; overflow: hidden; }' +
        '.game-tiddlywinks .tw-canvas { display: block; margin: 0 auto; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }' +
        '.game-tiddlywinks .tw-canvas.is-aim { touch-action: none; }' +
        '.game-tiddlywinks .tw-keys { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; }' +
        '.game-tiddlywinks .tw-key { position: absolute; width: 40px; height: 40px; margin: -20px 0 0 -20px; padding: 0; border: 0; border-radius: 50%; background: transparent; pointer-events: none; }' +
        '.game-tiddlywinks .tw-key:focus { outline: none; }' +
        '.game-tiddlywinks .tw-key:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }' +
        '.game-tiddlywinks .tw-note { text-align: center; margin-top: .6rem; }' +
        '.game-tiddlywinks .tw-note strong { color: var(--ink); }' +
        '@media (max-width: 600px) { .game-tiddlywinks .game-toolbar { gap: .45rem .5rem; margin-bottom: .6rem; } .game-tiddlywinks .seg button { padding: .4rem .7rem; } }'));

      /* ---- toolbar ---- */
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(); } }, 'New game');
      var modeBtns = {
        solo: h('button', { type: 'button', 'aria-pressed': String(mode === 'solo'), onclick: function () { setMode('solo'); } }, 'Solo'),
        cpu: h('button', { type: 'button', 'aria-pressed': String(mode === 'cpu'), onclick: function () { setMode('cpu'); } }, 'Vs computer')
      };
      var levelBtns = {};
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' });
      Object.keys(LEVELS).forEach(function (k) {
        levelBtns[k] = h('button', { type: 'button', 'aria-pressed': String(k === level), onclick: function () { setLevel(k); } }, LEVELS[k].label);
        levelSeg.appendChild(levelBtns[k]);
      });
      levelSeg.hidden = mode !== 'cpu';
      root.appendChild(h('div', { class: 'game-toolbar' }, newBtn, h('div', { class: 'seg', role: 'group', 'aria-label': 'Who plays' }, modeBtns.solo, modeBtns.cpu), levelSeg));

      var stage = h('div', { class: 'tw-stage' });
      var canvas = h('canvas', { class: 'tw-canvas', role: 'img', tabindex: '0', 'aria-label': 'A felt tiddlywinks mat with a cup in the middle' });
      var keys = h('div', { class: 'tw-keys', role: 'group', 'aria-label': 'Your winks' });
      stage.appendChild(canvas);
      stage.appendChild(keys);
      root.appendChild(stage);
      var recordLine = h('span', null, '');
      root.appendChild(h('p', { class: 'game-note tw-note' }, recordLine));
      root.appendChild(h('p', { class: 'game-note tw-note' }, 'Drag back from one of your winks and let go: the further you pull, the further it hops. Squop: a wink that lands on another covers it, and a covered wink cannot be played until the top one moves. Keyboard: Tab to a wink, arrows aim, hold Space for power.'));
      var ctx = canvas.getContext('2d');

      function setMode(m) {
        mode = m;
        api.store.set('mode', m);
        modeBtns.solo.setAttribute('aria-pressed', String(m === 'solo'));
        modeBtns.cpu.setAttribute('aria-pressed', String(m === 'cpu'));
        levelSeg.hidden = m !== 'cpu';
        showRecord();
        newGame();
      }
      function setLevel(k) {
        level = k;
        api.store.set('level', k);
        Object.keys(levelBtns).forEach(function (x) { levelBtns[x].setAttribute('aria-pressed', String(x === k)); });
        showRecord();
        newGame();
      }
      function showRecord() {
        if (mode === 'solo') {
          recordLine.replaceChildren(h('strong', null, 'Solo best: '), best ? 'all four potted in ' + best + ' shots' : 'not set yet. Pot all four winks in as few shots as you can.');
        } else {
          var s = stats[level] || {};
          recordLine.replaceChildren(h('strong', null, LEVELS[level].label + ': '), (s.won || 0) + ' won of ' + (s.played || 0) + ' played');
        }
      }
      showRecord();

      /* =====================================================================
         PART 3: THE GAME
         ===================================================================== */
      var G = null, L = null, dpr = 1, lastVh = 0, matImg = null;
      var timers = [], raf = 0, lastT = 0;
      var drag = null, charge = null, selected = null, keyboardUsed = false;

      function later(fn, ms) {
        var id = setTimeout(function () { timers = timers.filter(function (x) { return x !== id; }); if (!destroyed) fn(); }, ms);
        timers.push(id);
        return id;
      }
      function clearTimers() { timers.forEach(clearTimeout); timers = []; }
      function think() { return reduced ? 0 : THINK_MS; }
      function say(t) { api.status(t); }
      function onMat() { return G.winks.filter(function (w) { return !w.potted; }); }
      function freeWinks(owner) { return G.winks.filter(function (w) { return w.owner === owner && !w.potted && !isCovered(w, G.winks); }); }
      function potted(owner) { return G.winks.filter(function (w) { return w.owner === owner && w.potted; }).length; }
      function scoreText() {
        if (G.mode === 'solo') return potted('you') + ' of 4 potted · ' + G.shots + (G.shots === 1 ? ' shot' : ' shots') + (best ? ' · Best ' + best : '');
        return 'You ' + potted('you') + ', Computer ' + potted('cpu');
      }
      function colourName(owner) { return owner === 'you' ? 'red' : 'mauve'; }

      /* ---- layout ---- */
      function computeLayout(w, vh, vw) {
        var narrow = w < 600 || (vh > vw * 1.05 && w < 900);
        var classroom = document.documentElement.classList.contains('classroom');
        var maxH = Math.max(320, vh - (narrow ? 170 : classroom ? 380 : 270));
        var out = { W: w, narrow: narrow };
        if (narrow) {
          var M = Math.floor(Math.min(w - 4, maxH - 82));
          out.H = M + 82;
          out.mat = { x: Math.round((w - M) / 2), y: 2, size: M };
          var pw = (w - 12) / 2;
          out.panels = [{ x: 4, y: M + 10, w: pw, h: 68 }, { x: 8 + pw, y: M + 10, w: pw, h: 68 }];
        } else {
          var H = Math.round(Math.min(maxH, Math.max(360, w * 0.56)));
          var M2 = Math.floor(Math.min(H - 16, w - 2 * 180));
          out.H = H;
          out.mat = { x: Math.round((w - M2) / 2), y: Math.round((H - M2) / 2), size: M2 };
          var pw2 = Math.min(230, out.mat.x - 22), ph = Math.min(M2, Math.round(Math.max(170, pw2 * 0.95)));
          out.panels = [{ x: out.mat.x - 14 - pw2, y: out.mat.y, w: pw2, h: ph }, { x: out.mat.x + M2 + 14, y: out.mat.y, w: pw2, h: ph }];
        }
        out.s = out.mat.size / MAT;
        return out;
      }
      function px(x) { return L.mat.x + x * L.s; }
      function py(y, z) { return L.mat.y + (y - (z || 0) * LIFT) * L.s; }

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
        matImg = paintMat();
        placeKeys();
        render();
      }

      /* ---- the felt mat, painted once per size ---- */
      function roundRect(g, x, y, w, hh, r) {
        g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + hh - r);
        g.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh); g.lineTo(x + r, y + hh); g.quadraticCurveTo(x, y + hh, x, y + hh - r);
        g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
      }
      function paintMat() {
        var c = document.createElement('canvas');
        c.width = canvas.width; c.height = canvas.height;
        var g = c.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        var m = L.mat, M = m.size, s = L.s, R = seeded(1889), i;
        /* a soft shadow under the mat */
        g.fillStyle = col(P.shadow, 0.45);
        g.beginPath(); roundRect(g, m.x + 4, m.y + 6, M, M, 12 * s); g.fill();
        g.save();
        g.beginPath(); roundRect(g, m.x, m.y, M, M, 12 * s); g.clip();
        var gr = g.createRadialGradient(m.x + M * 0.45, m.y + M * 0.4, M * 0.05, m.x + M / 2, m.y + M / 2, M * 0.75);
        gr.addColorStop(0, col(mix(P.felt, P.felt2, 0.7))); gr.addColorStop(0.6, col(P.felt)); gr.addColorStop(1, col(mix(P.felt, P.shadow, 0.35)));
        g.fillStyle = gr; g.fillRect(m.x, m.y, M, M);
        /* felt fibres */
        var n = Math.round(M * M / 26);
        for (i = 0; i < n; i++) {
          g.fillStyle = col(R() < 0.5 ? P.felt2 : mix(P.felt, P.shadow, 0.4), 0.18 + R() * 0.25);
          var fx = m.x + R() * M, fy = m.y + R() * M, a = R() * Math.PI;
          g.fillRect(fx, fy, 0.8 + Math.abs(Math.cos(a)) * 1.8, 0.8 + Math.abs(Math.sin(a)) * 1.8);
        }
        g.restore();
        /* a gold braid border with corner flourishes, in the style of an 1880s games box */
        var inset = 9 * s;
        g.strokeStyle = col(P.gold, 0.85); g.lineWidth = Math.max(1.5, 1.6 * s);
        g.beginPath(); roundRect(g, m.x + inset, m.y + inset, M - inset * 2, M - inset * 2, 6 * s); g.stroke();
        g.setLineDash([Math.max(2, 3 * s), Math.max(2, 3 * s)]);
        g.lineWidth = Math.max(1, 1 * s);
        g.beginPath(); roundRect(g, m.x + inset + 4 * s, m.y + inset + 4 * s, M - inset * 2 - 8 * s, M - inset * 2 - 8 * s, 4 * s); g.stroke();
        g.setLineDash([]);
        [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (k) {
          var cx = m.x + inset + k[0] * (M - inset * 2), cy = m.y + inset + k[1] * (M - inset * 2), sx = k[0] ? -1 : 1, sy = k[1] ? -1 : 1;
          g.strokeStyle = col(P.gold, 0.85); g.lineWidth = Math.max(1.2, 1.2 * s);
          g.beginPath(); g.arc(cx + sx * 9 * s, cy + sy * 9 * s, 5 * s, 0, Math.PI * 2); g.stroke();
          g.beginPath(); g.moveTo(cx + sx * 16 * s, cy + sy * 2 * s); g.quadraticCurveTo(cx + sx * 20 * s, cy + sy * 9 * s, cx + sx * 14 * s, cy + sy * 14 * s); g.stroke();
          g.beginPath(); g.moveTo(cx + sx * 2 * s, cy + sy * 16 * s); g.quadraticCurveTo(cx + sx * 9 * s, cy + sy * 20 * s, cx + sx * 14 * s, cy + sy * 14 * s); g.stroke();
        });
        /* the maker's name printed on the felt, as on the boxes of 1889 */
        g.fillStyle = col(P.gold, 0.32);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = Math.round(Math.max(10, 13 * s)) + 'px ' + P.fontPoster;
        g.fillText('TIDDLEDY-WINKS', m.x + M / 2, m.y + M / 2 + 58 * s);
        g.font = Math.round(Math.max(8, 7.5 * s)) + 'px ' + P.fontHead;
        g.fillText("FINCHER'S PATENT · 1888", m.x + M / 2, m.y + M / 2 + 72 * s);
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
      function onVisibility() {
        if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; if (charge) { charge = null; if (G) G.aim.power = 0; } }
        else kick();
      }
      document.addEventListener('visibilitychange', onVisibility);

      /* ---- a new game ---- */
      function newGame() {
        clearTimers();
        drag = null; charge = null; selected = null;
        readColours();
        if (L) matImg = paintMat();
        var winks = [];
        START_X.forEach(function (x, i) { winks.push({ id: 'you' + i, owner: 'you', x: x, y: YOU_Y, level: 0, potted: false, pop: reduced ? 1 : -i * 0.06 }); });
        if (mode === 'cpu') START_X.forEach(function (x, i) { winks.push({ id: 'cpu' + i, owner: 'cpu', x: MAT - x, y: CPU_Y, level: 0, potted: false, pop: reduced ? 1 : -0.25 - i * 0.06 }); });
        G = {
          mode: mode, winks: winks, turn: 'you', phase: 'aim', shots: 0, over: false, winner: null,
          aim: { dir: -Math.PI / 2, power: 0 }, flight: null, lastPower: 0, cpuAim: null,
          texts: [], sparks: [], inCup: [], hint: true, skipGuard: 0
        };
        api.sound('shuffle');
        startTurn('you');
        kick();
      }

      function startTurn(who) {
        if (G.over) return;
        G.turn = who;
        var free = freeWinks(who);
        if (!free.length && G.mode === 'cpu' && G.skipGuard < 3) {
          G.skipGuard++;
          var other = who === 'you' ? 'cpu' : 'you';
          say((who === 'you' ? 'All your winks are squopped, so you miss a turn' : "All the computer's winks are squopped, so it misses a turn") + ' · ' + scoreText());
          G.phase = 'pause';
          setAimClass(); placeKeys();
          later(function () { startTurn(other); }, reduced ? 600 : 1500);
          return;
        }
        G.skipGuard = 0;
        if (who === 'you') {
          G.phase = 'aim';
          if (!selected || selected.potted || isCovered(selected, G.winks) || selected.owner !== 'you') selected = null;
          G.aim = { dir: selected ? Math.atan2(CY - selected.y, CX - selected.x) : -Math.PI / 2, power: 0 };
          var squopped = G.winks.filter(function (w) { return w.owner === 'you' && !w.potted && isCovered(w, G.winks); }).length;
          say((G.mode === 'solo' ? 'Solo: ' : 'Your turn: ') + 'drag back from a red wink · ' + scoreText() + (squopped ? ' · ' + squopped + ' squopped' : ''));
          setAimClass();
          placeKeys();
          if (keyboardUsed) focusAWink();
        } else {
          G.phase = 'cpu';
          setAimClass();
          placeKeys();
          say("The computer's turn · " + scoreText());
          var t0 = G.cpuT0 = performance.now();
          later(function () {
            var plan = planCpu(G.winks, 'cpu', level, rnd);
            G.planMs = Math.round(performance.now() - t0);
            if (!plan) { startTurn('you'); return; }
            later(function () { cpuSquidge(plan); }, Math.max(0, think() - (performance.now() - t0)));
          }, 30);
        }
        describe();
        kick();
      }
      function describe() {
        var parts = ['A felt tiddlywinks mat with a cup in the middle.'];
        ['you', 'cpu'].forEach(function (o) {
          if (o === 'cpu' && G.mode === 'solo') return;
          var list = G.winks.filter(function (w) { return w.owner === o; });
          if (!list.length) return;
          var cov = list.filter(function (w) { return !w.potted && isCovered(w, G.winks); }).length;
          parts.push((o === 'you' ? 'Your red winks: ' : "The computer's mauve winks: ") + potted(o) + ' of 4 in the cup' + (cov ? ', ' + cov + ' squopped' : '') + '.');
        });
        if (G.phase === 'aim' && G.turn === 'you') parts.push('Tab to one of your winks, use the arrows to aim, hold Space for power and let go to squidge.');
        canvas.setAttribute('aria-label', parts.join(' '));
      }

      /* ---- squidging ---- */
      function cpuSquidge(plan) {
        selected = null;
        G.cpuAim = { wink: plan.wink, dir: plan.dir, power: plan.power, t: 0, kind: plan.kind };
        G.aim = { dir: plan.dir, power: 0 };
        if (reduced) { squidge(plan.wink, plan.dir, plan.power); return; }
        kick();
      }
      function squidge(w, dir, power) {
        if (!w || w.potted) return;
        var others = G.winks.filter(function (o) { return o !== w && !o.potted; });
        var res = hop(w.x, w.y, dir, power, others);
        if (G.turn === 'you') G.lastPower = power; else G.cpuWait = Math.round(performance.now() - G.cpuT0);
        G.shots += G.turn === 'you' ? 1 : 0;
        G.cpuShots = (G.cpuShots || 0) + (G.turn === 'cpu' ? 1 : 0);
        G.flight = { wink: w, res: res, t: reduced ? 1e9 : -0.09, dir: dir, from: { x: w.x, y: w.y, level: w.level }, ev: 0 };
        w.flying = true;
        w.level = 0;
        G.phase = 'flying';
        G.cpuAim = null;
        G.hint = false;
        drag = null; charge = null;
        setAimClass();
        placeKeys();
        if (reduced) { api.sound('pop'); update(0); }
        kick();
      }
      function land() {
        var f = G.flight, w = f.wink, res = f.res, who = G.turn, other = who === 'you' ? 'cpu' : 'you';
        G.flight = null;
        w.flying = false;
        w.x = res.x; w.y = res.y; w.level = res.level;
        if (res.pot) {
          w.potted = true;
          var nIn = G.inCup.length, ang = nIn * 2.4;
          w.cupX = CX + Math.cos(ang) * Math.min(8, 3 + nIn * 1.5); w.cupY = CY - 5 + Math.sin(ang) * Math.min(4, 2 + nIn * 0.7);
          G.inCup.push(w);
          api.sound('bell');
          sparkle(res.x, res.y);
          floatText(res.rim ? 'Rattled in!' : 'Potted!', CX, CY - 40, who === 'you' ? P.gold : P.rose);
          if (potted(who) === 4) { endGame(who); return; }
          if (G.mode === 'solo') say('Potted! ' + scoreText());
          else say((who === 'you' ? 'Potted! Shoot again' : 'The computer potted one and goes again') + ' · ' + scoreText());
          G.phase = 'pause';
          later(function () { startTurn(who); }, reduced ? 300 : 800);
          describe();
          return;
        }
        api.sound('tick');
        var msg = '';
        if (res.under) {
          api.sound('clack');
          var mineUnder = res.under.owner === who;
          floatText('Squop!', w.x, w.y - 22, P.gold);
          if (G.mode === 'solo') msg = 'Squop! You covered your own wink. Play the top one to free it';
          else if (who === 'you') msg = mineUnder ? 'Squop! You covered your own wink' : 'Squop! Your wink is on top of a mauve wink';
          else msg = mineUnder ? 'The computer squopped its own wink' : 'The computer squopped your wink!';
        } else if (res.off) msg = 'Off the mat! The wink goes back on at the edge';
        else if (res.events.indexOf('rim-out') >= 0) msg = 'Off the rim!';
        else if (res.events.indexOf('wall') >= 0) msg = 'It hit the side of the cup';
        if (G.mode === 'solo') {
          say((msg ? msg + ' · ' : '') + scoreText());
          G.phase = 'pause';
          later(function () { startTurn('you'); }, reduced ? 200 : 450);
        } else {
          say((msg ? msg + ' · ' : '') + (other === 'you' ? 'Your turn' : "The computer's turn") + ' · ' + scoreText());
          G.phase = 'pause';
          later(function () { startTurn(other); }, reduced ? 250 : 650);
        }
        describe();
      }
      function endGame(who) {
        G.over = true;
        G.phase = 'over';
        G.winner = who;
        setAimClass();
        placeKeys();
        if (G.mode === 'solo') {
          var isBest = !best || G.shots < best;
          if (isBest) { best = G.shots; api.store.set('best', best); }
          showRecord();
          if (isBest) {
            say('All four potted in ' + G.shots + ' shots. A new best!');
            api.celebrate('All four potted in ' + G.shots + ' shots!');
          } else {
            say('All four potted in ' + G.shots + ' shots. Your best is ' + best + '.');
            api.sound('coin');
          }
        } else {
          var s = stats[level] || { won: 0, played: 0 };
          s.played = (s.played || 0) + 1;
          if (who === 'you') s.won = (s.won || 0) + 1;
          stats[level] = s;
          api.store.set('stats', stats);
          showRecord();
          var a = potted('you'), b = potted('cpu');
          if (who === 'you') {
            say('You win, ' + a + ' winks to ' + b + '!');
            api.celebrate('You potted all four first, ' + a + ' to ' + b + '!');
          } else {
            say('The computer potted all four first, ' + b + ' to ' + a + '. Have another go!');
            api.sound('lose');
          }
        }
        describe();
        kick();
      }

      /* ---- effects ---- */
      function floatText(text, x, y, c) { G.texts.push({ text: text, x: x, y: y, c: c, t: 0 }); }
      function sparkle(x, y) {
        if (reduced) return;
        for (var i = 0; i < 18; i++) {
          var a = rnd() * Math.PI * 2, sp = 30 + rnd() * 70;
          G.sparks.push({ x: x, y: y - CUP_H, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, t: 0, life: 0.5 + rnd() * 0.5 });
        }
      }

      /* ---- update ---- */
      function update(dt) {
        if (!G) return false;
        var busy = false, i;
        G.winks.forEach(function (w) { if (w.pop < 1) { w.pop = Math.min(1, w.pop + dt / 0.22); busy = true; } });
        if (G.cpuAim) {
          busy = true;
          G.cpuAim.t += dt;
          var t = G.cpuAim.t;
          G.aim.dir = G.cpuAim.dir;
          G.aim.power = G.cpuAim.power * ease((t - 0.1) / 0.4);
          if (t > 0.62) squidge(G.cpuAim.wink, G.cpuAim.dir, G.cpuAim.power);
        }
        if (charge) { busy = true; G.aim.power = chargePower(); }
        var f = G.flight;
        if (f) {
          busy = true;
          var before = f.t;
          f.t += dt;
          var path = f.res.path, idx = Math.floor(Math.max(0, f.t) / STEP);
          /* sounds as the wink meets things on the way */
          if (before < 0 && f.t >= 0) api.sound('pop');
          if (idx >= path.length) land();
          else {
            var p = path[idx];
            if (f.res.events.length > f.ev) {
              /* play the rim and wall sounds when the wink reaches them */
              var e = f.res.events[f.ev];
              if ((e === 'rim-out' || e === 'wall') && p.z < CUP_H && dist(p.x, p.y, CX, CY) < CUP_OUT + RW) {
                api.sound(e === 'wall' ? 'clack' : 'tick');
                if (e === 'rim-out') floatText('Off the rim!', CX, CY - 44, P.ink);
                f.ev++;
              } else if (e === 'rim-in' && p.inCup) { api.sound('tick'); f.ev++; }
              else if (e === 'pot' || e === 'squop') f.ev++;
            }
          }
        }
        for (i = G.texts.length - 1; i >= 0; i--) { G.texts[i].t += dt; busy = true; if (G.texts[i].t > 1.2) G.texts.splice(i, 1); }
        for (i = G.sparks.length - 1; i >= 0; i--) {
          var sp = G.sparks[i];
          sp.t += dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 140 * dt;
          busy = true;
          if (sp.t > sp.life) G.sparks.splice(i, 1);
        }
        return busy;
      }

      /* ---- drawing ---- */
      function render() {
        if (!L || !G) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, L.W, L.H);
        ctx.drawImage(matImg, 0, 0, L.W, L.H);
        drawPanels();
        var fp = flightSample();
        var list = G.winks.filter(function (w) { return !w.potted && !w.flying; });
        list.sort(function (a, b) { return a.level - b.level || a.y - b.y; });
        var behind = list.filter(function (w) { return w.y < CY && w.level === 0; });
        var front = list.filter(function (w) { return !(w.y < CY && w.level === 0); });
        behind.forEach(function (w) { drawWinkShadow(w.x, w.y, 0, 1); });
        behind.forEach(drawRestingWink);
        drawCup(fp);
        front.forEach(function (w) { drawWinkShadow(w.x, w.y, w.level * STACK, 1); });
        front.forEach(drawRestingWink);
        if (G.phase === 'aim' && G.turn === 'you') drawSelection();
        var aiming = (G.phase === 'aim' && G.turn === 'you' && aimWink()) || G.cpuAim;
        if (aiming) drawAim();
        if (G.flight) drawFlight(fp);
        if (G.hint && G.phase === 'aim' && G.turn === 'you' && !drag && !charge) drawHint();
        G.sparks.forEach(function (s) {
          ctx.fillStyle = col(P.gold, 1 - s.t / s.life);
          var X = px(s.x), Y = py(s.y), r = Math.max(1.5, 1.6 * L.s);
          ctx.beginPath(); ctx.moveTo(X, Y - r * 2); ctx.lineTo(X + r * 0.6, Y); ctx.lineTo(X, Y + r * 2); ctx.lineTo(X - r * 0.6, Y); ctx.closePath(); ctx.fill();
        });
        G.texts.forEach(function (t) {
          var k = t.t / 1.2, X = px(t.x), Y = py(t.y) - k * 26;
          ctx.globalAlpha = 1 - ease((k - 0.6) / 0.4);
          ctx.font = Math.round(Math.max(16, 15 * L.s)) + 'px ' + P.fontDisplay;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 4; ctx.strokeStyle = col(P.shadow, 0.75);
          ctx.strokeText(t.text, X, Y);
          ctx.fillStyle = col(t.c);
          ctx.fillText(t.text, X, Y);
          ctx.globalAlpha = 1;
        });
        if (G.over) drawResult();
      }
      function winkColour(w) { return w.owner === 'you' ? P.you : P.cpu; }
      function drawWinkShadow(x, y, z, alpha) {
        var r = RW * L.s * (1 + z / 120), X = px(x) + z * 0.25 * L.s + 1.5, Y = py(y) + z * 0.12 * L.s + 2.5;
        var g = ctx.createRadialGradient(X, Y, r * 0.3, X, Y, r * 1.25);
        g.addColorStop(0, col(P.shadow, 0.5 * alpha * Math.max(0.25, 1 - z / 90))); g.addColorStop(1, col(P.shadow, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(X, Y, r * 1.25, 0, Math.PI * 2); ctx.fill();
      }
      /* A wink: a thin disc with a bevelled edge. flip (0 to PI) squashes it as it tumbles in the air. */
      function drawWink(c, X, Y, r, ux, uy, flip, alpha) {
        var squash = Math.abs(Math.cos(flip || 0)), under = Math.cos(flip || 0) < 0;
        var rot = Math.atan2(uy || 0, ux || 1);
        ctx.save();
        if (alpha != null && alpha < 1) ctx.globalAlpha = alpha;
        ctx.translate(X, Y);
        ctx.rotate(rot);
        ctx.scale(Math.max(0.12, squash), 1);
        ctx.rotate(-rot);
        var edge = mix(c, P.shadow, 0.45), top = under ? mix(c, P.shadow, 0.25) : c;
        ctx.fillStyle = col(edge);
        ctx.beginPath(); ctx.arc(0, THICK * LIFT * L.s * 0.6, r, 0, Math.PI * 2); ctx.fill();
        var g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
        g.addColorStop(0, col(mix(top, P.ink, 0.35))); g.addColorStop(0.7, col(top)); g.addColorStop(1, col(mix(top, P.shadow, 0.3)));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = col(mix(top, P.shadow, 0.5), 0.9); ctx.lineWidth = Math.max(1, r * 0.12);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = col(P.ink, 0.55); ctx.lineWidth = Math.max(1, r * 0.1);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.88, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
        ctx.restore();
      }
      function drawRestingWink(w) {
        var z = w.level * STACK, k = w.pop < 1 ? ease(Math.max(0, w.pop)) : 1;
        if (k <= 0) return;
        var X = px(w.x), Y = py(w.y, z) - (1 - k) * 14;
        drawWink(winkColour(w), X, Y, RW * L.s * (0.6 + 0.4 * k), 1, 0, 0, k);
        if (isCovered(w, G.winks)) {
          /* a dashed ring marks a squopped wink */
          ctx.setLineDash([3, 3]); ctx.strokeStyle = col(P.ink, 0.9); ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(X, Y, RW * L.s + 4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        }
      }
      function drawCup(fp) {
        var s = L.s, X = px(CX), base = py(CY), rimY = py(CY, CUP_H), Ro = CUP_OUT * s, Ri = CUP_IN * s;
        /* shadow */
        var sg = ctx.createRadialGradient(X + 6 * s, base + 5 * s, Ro * 0.4, X + 6 * s, base + 5 * s, Ro * 1.35);
        sg.addColorStop(0, col(P.shadow, 0.55)); sg.addColorStop(1, col(P.shadow, 0));
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(X + 6 * s, base + 5 * s, Ro * 1.35, 0, Math.PI * 2); ctx.fill();
        /* the side of the pot */
        var side = ctx.createLinearGradient(X - Ro, 0, X + Ro, 0);
        side.addColorStop(0, col(mix(P.china, P.shadow, 0.45))); side.addColorStop(0.35, col(P.china)); side.addColorStop(1, col(mix(P.china, P.shadow, 0.55)));
        ctx.fillStyle = side;
        ctx.beginPath(); ctx.arc(X, base, Ro, 0, Math.PI); ctx.lineTo(X - Ro, rimY); ctx.arc(X, rimY, Ro, Math.PI, 0, true); ctx.closePath(); ctx.fill();
        /* gold bands */
        ctx.strokeStyle = col(P.gold); ctx.lineWidth = Math.max(1.5, 2.2 * s);
        [0.3, 0.72].forEach(function (k) { var y = py(CY, CUP_H * k); ctx.beginPath(); ctx.arc(X, y, Ro, 0.05, Math.PI - 0.05); ctx.stroke(); });
        /* the rim */
        ctx.fillStyle = col(mix(P.china, P.ink, 0.35));
        ctx.beginPath(); ctx.arc(X, rimY, Ro, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = col(P.gold, 0.9); ctx.lineWidth = Math.max(1, 1.2 * s);
        ctx.beginPath(); ctx.arc(X, rimY, (Ro + Ri) / 2, 0, Math.PI * 2); ctx.stroke();
        /* inside: the far wall, the bottom, and anything potted */
        ctx.save();
        ctx.beginPath(); ctx.arc(X, rimY, Ri, 0, Math.PI * 2); ctx.clip();
        var wall = ctx.createLinearGradient(0, rimY - Ri, 0, rimY + Ri);
        wall.addColorStop(0, col(mix(P.china, P.shadow, 0.35))); wall.addColorStop(1, col(mix(P.china, P.shadow, 0.75)));
        ctx.fillStyle = wall; ctx.fillRect(X - Ri, rimY - Ri, Ri * 2, Ri * 2);
        ctx.fillStyle = col(mix(P.china, P.shadow, 0.6));
        ctx.beginPath(); ctx.arc(X, base, Ri, 0, Math.PI * 2); ctx.fill();
        G.inCup.forEach(function (w, i) { drawWink(mix(winkColour(w), P.shadow, 0.12), px(w.cupX), py(w.cupY, i * 1.2), RW * s * 0.95, 1, 0, 0, 1); });
        if (fp && fp.p.inCup) drawWink(winkColour(G.flight.wink), fp.X, fp.Y, fp.r, fp.p.ux, fp.p.uy, fp.p.f, 1);
        var shade = ctx.createLinearGradient(0, rimY - Ri, 0, rimY + Ri);
        shade.addColorStop(0, col(P.shadow, 0.05)); shade.addColorStop(1, col(P.shadow, 0.55));
        ctx.fillStyle = shade; ctx.fillRect(X - Ri, rimY - Ri, Ri * 2, Ri * 2);
        ctx.restore();
        ctx.strokeStyle = col(P.ink, 0.6); ctx.lineWidth = Math.max(1, 1.2 * s);
        ctx.beginPath(); ctx.arc(X, rimY, Ro - 0.6, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
      }
      function aimWink() {
        if (drag && drag.wink) return drag.wink;
        if (charge && selected) return selected;
        return selected;
      }
      function drawSelection() {
        var w = aimWink();
        if (!w) return;
        var X = px(w.x), Y = py(w.y, w.level * STACK);
        ctx.strokeStyle = col(P.gold, 0.95); ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(X, Y, RW * L.s + 5, 0, Math.PI * 2); ctx.stroke();
      }
      function maxPull() { return Math.max(80, Math.min(200, L.mat.size * 0.36)); }
      function drawAim() {
        var w = G.cpuAim ? G.cpuAim.wink : aimWink();
        if (!w) return;
        var s = L.s, X = px(w.x), Y = py(w.y, w.level * STACK), dir = G.aim.dir, pw = G.aim.power || 0;
        var ux = Math.cos(dir), uy = Math.sin(dir), r = RW * s, mine = !G.cpuAim;
        /* the squidger, pressing on the far edge of the wink */
        var back = r + RS * s * (0.55 + pw * 0.35);
        var SX = X - ux * back, SY = Y - uy * back - 2 * s;
        var sh = ctx.createRadialGradient(SX + 3, SY + 5, RS * s * 0.2, SX + 3, SY + 5, RS * s * 1.2);
        sh.addColorStop(0, col(P.shadow, 0.45)); sh.addColorStop(1, col(P.shadow, 0));
        ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(SX + 3, SY + 5, RS * s * 1.2, 0, Math.PI * 2); ctx.fill();
        drawWink(P.bone, SX, SY, RS * s, ux, uy, 0.45 + pw * 0.3, 1);
        /* the aim: a dotted arrow the way the wink will hop (not how far) */
        var len = Math.max(36, 48 * s);
        ctx.fillStyle = col(mine ? P.gold : P.rose, 0.95);
        for (var i = 1; i <= 7; i++) {
          var d = r + 4 + len * i / 7;
          ctx.globalAlpha = 1 - i / 10;
          ctx.beginPath(); ctx.arc(X + ux * d, Y + uy * d, 2.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        var tipD = r + 6 + len, tx = X + ux * tipD, ty = Y + uy * tipD;
        ctx.beginPath(); ctx.moveTo(tx + ux * 8, ty + uy * 8); ctx.lineTo(tx - uy * 6, ty + ux * 6); ctx.lineTo(tx + uy * 6, ty - ux * 6); ctx.closePath();
        ctx.globalAlpha = 0.6; ctx.fill(); ctx.globalAlpha = 1;
        /* the power meter: a ring round the wink */
        var R = r + 10;
        ctx.lineWidth = 6; ctx.lineCap = 'butt';
        ctx.strokeStyle = col(P.shadow, 0.6);
        ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.stroke();
        if (pw > 0) {
          var c = pw < 0.5 ? mix(P.peacock, P.gold, pw * 2) : mix(P.gold, P.vermilion, (pw - 0.5) * 2);
          ctx.strokeStyle = col(c);
          ctx.beginPath(); ctx.arc(X, Y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pw); ctx.stroke();
        }
        if (mine && G.lastPower) {
          var la = -Math.PI / 2 + Math.PI * 2 * G.lastPower;
          ctx.strokeStyle = col(P.ink, 0.9); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(X + Math.cos(la) * (R - 5), Y + Math.sin(la) * (R - 5)); ctx.lineTo(X + Math.cos(la) * (R + 5), Y + Math.sin(la) * (R + 5)); ctx.stroke();
        }
        if (pw > 0) {
          var ty2 = Y + (uy > 0 ? -R - 14 : R + 16);
          ctx.font = '700 14px ' + P.fontHead;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3; ctx.strokeStyle = col(P.shadow, 0.8);
          ctx.strokeText(Math.round(pw * 100) + '%', X, ty2);
          ctx.fillStyle = col(P.ink);
          ctx.fillText(Math.round(pw * 100) + '%', X, ty2);
        }
      }
      function flightSample() {
        var f = G.flight;
        if (!f || f.t < 0) return null;
        var path = f.res.path, p = path[Math.min(path.length - 1, Math.floor(f.t / STEP))];
        return { p: p, X: px(p.x), Y: py(p.y, p.z), r: RW * L.s * (1 + Math.max(0, p.z) / 110) };
      }
      function drawFlight(fp) {
        var f = G.flight, w = f.wink, s = L.s;
        if (f.t < 0) {
          /* the squidger presses down on the edge */
          var X0 = px(f.from.x), Y0 = py(f.from.y, f.from.level * STACK), ux0 = Math.cos(f.dir), uy0 = Math.sin(f.dir);
          var k0 = 1 + f.t / 0.09, back = RW * s + RS * s * (0.9 - 0.35 * k0);
          drawWinkShadow(f.from.x, f.from.y, f.from.level * STACK, 1);
          drawWink(winkColour(w), X0, Y0, RW * s, 1, 0, 0, 1);
          drawWink(P.bone, X0 - ux0 * back, Y0 - uy0 * back - (2 - k0 * 2) * s, RS * s, ux0, uy0, 0.75 - k0 * 0.2, 1);
          return;
        }
        if (!fp || fp.p.inCup) return;   /* falling inside the cup: drawn with the cup, behind the rim */
        var p = fp.p;
        if (dist(p.x, p.y, CX, CY) > CUP_OUT) drawWinkShadow(p.x, p.y, p.z, 1);
        drawWink(winkColour(w), fp.X, fp.Y, fp.r, p.ux, p.uy, p.f, 1);
      }
      function drawHint() {
        var text = 'Drag back from a red wink and let go';
        var fs = Math.round(Math.max(13, Math.min(19, 13 * L.s)));
        ctx.font = '700 ' + fs + 'px ' + P.fontHead;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var X = px(CX), Y = py(205);
        var w = Math.min(L.mat.size - 16, ctx.measureText(text).width + 24);
        ctx.fillStyle = col(P.shadow, 0.75);
        ctx.beginPath(); roundRect(ctx, X - w / 2, Y - fs * 0.95, w, fs * 1.9, fs * 0.9); ctx.fill();
        ctx.fillStyle = col(P.ink);
        ctx.fillText(text, X, Y + 1, w - 12);
      }
      function drawPanels() {
        L.panels.forEach(function (p, i) {
          var who = i === 0 ? 'you' : 'cpu';
          var active = !G.over && G.turn === who && (G.mode === 'cpu' || who === 'you');
          ctx.fillStyle = col(P.surface2, 0.85);
          ctx.beginPath(); roundRect(ctx, p.x, p.y, p.w, p.h, 12); ctx.fill();
          ctx.strokeStyle = active ? col(P.gold) : col(P.ink, 0.18); ctx.lineWidth = active ? 2.5 : 1.5;
          ctx.beginPath(); roundRect(ctx, p.x + 1, p.y + 1, p.w - 2, p.h - 2, 11); ctx.stroke();
          var narrow = L.narrow, title, big, sub = '', colr = who === 'you' ? P.you : P.cpu;
          if (G.mode === 'solo') {
            if (who === 'you') { title = 'POTTED'; big = potted('you') + '/4'; }
            else { title = 'SHOTS'; big = String(G.shots); sub = best ? 'Best: ' + best : 'No best yet'; colr = null; }
          } else {
            title = who === 'you' ? 'YOU' : 'COMPUTER';
            big = String(potted(who));
          }
          ctx.textBaseline = 'alphabetic';
          if (narrow) {
            ctx.font = '700 13px ' + P.fontHead; ctx.textAlign = 'left';
            ctx.fillStyle = col(active ? P.gold : P.ink, 0.95);
            ctx.fillText(title, p.x + 10, p.y + 20);
            ctx.font = '22px ' + P.fontDisplay; ctx.textAlign = 'right';
            ctx.fillStyle = col(P.ink);
            ctx.fillText(big, p.x + p.w - 10, p.y + 26);
            if (colr) drawIcons(who, colr, p.x + 12, p.y + 47, Math.min(11, (p.w - 24) / 8.5));
            else if (sub) { ctx.font = '600 12px ' + P.fontHead; ctx.textAlign = 'left'; ctx.fillStyle = col(P.muted); ctx.fillText(sub, p.x + 10, p.y + 52); }
          } else {
            var cx = p.x + p.w / 2, fs = Math.round(Math.max(14, Math.min(22, p.w * 0.11)));
            ctx.textAlign = 'center';
            ctx.font = '700 ' + fs + 'px ' + P.fontHead;
            ctx.fillStyle = col(active ? P.gold : P.ink, 0.95);
            ctx.fillText(title, cx, p.y + 18 + fs);
            ctx.font = Math.round(fs * 2.6) + 'px ' + P.fontDisplay;
            ctx.fillStyle = col(P.ink);
            ctx.fillText(big, cx, p.y + 28 + fs * 3.4);
            if (colr) {
              var ir = Math.min(13, (p.w - 30) / 9);
              drawIcons(who, colr, cx - ir * 3.3, p.y + 46 + fs * 4.2, ir);
            } else if (sub) {
              ctx.font = '600 ' + Math.round(fs * 0.75) + 'px ' + P.fontHead; ctx.fillStyle = col(P.muted);
              ctx.fillText(sub, cx, p.y + 44 + fs * 4.2);
            }
            if (active && G.mode === 'cpu') {
              ctx.font = '600 ' + Math.round(fs * 0.7) + 'px ' + P.fontHead; ctx.fillStyle = col(P.gold);
              ctx.fillText(who === 'you' ? 'Your turn' : 'Thinking', cx, p.y + p.h - 18);
            }
          }
        });
      }
      /* four little winks: solid when potted, faint when still on the mat */
      function drawIcons(who, c, x, y, r) {
        var n = potted(who);
        for (var i = 0; i < 4; i++) {
          var X = x + i * r * 2.2 + r, done = i < n;
          if (done) drawWink(c, X, y, r, 1, 0, 0, 1);
          else { ctx.strokeStyle = col(c, 0.75); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X, y, r - 1, 0, Math.PI * 2); ctx.stroke(); }
        }
      }
      function drawResult() {
        var fs = Math.round(Math.max(22, Math.min(44, 30 * L.s)));
        ctx.font = fs + 'px ' + P.fontDisplay;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var text = G.mode === 'solo' ? G.shots + ' shots' : G.winner === 'you' ? 'You win!' : 'Computer wins';
        var X = px(CX), Y = py(CY + 70), w = ctx.measureText(text).width + 40;
        ctx.fillStyle = col(P.shadow, 0.8);
        ctx.beginPath(); roundRect(ctx, X - w / 2, Y - fs, w, fs * 2, fs * 0.6); ctx.fill();
        ctx.fillStyle = col(G.winner === 'you' ? P.gold : P.ink);
        ctx.fillText(text, X, Y + 2);
      }

      /* ---- keyboard: one invisible button per wink you can play, so Tab moves between them ---- */
      function placeKeys() {
        if (!L || !G) return;
        var playable = G.phase === 'aim' && G.turn === 'you' && !G.over ? freeWinks('you') : [];
        var focused = document.activeElement && document.activeElement.parentNode === keys ? document.activeElement.getAttribute('data-id') : null;
        var keep = {};
        Array.prototype.slice.call(keys.children).forEach(function (b) { keep[b.getAttribute('data-id')] = b; });
        var wanted = {};
        playable.sort(function (a, b) { return a.x - b.x; }).forEach(function (w, i) {
          wanted[w.id] = true;
          var b = keep[w.id];
          if (!b) {
            b = h('button', { type: 'button', class: 'tw-key', 'data-id': w.id });
            b.addEventListener('focus', function () { onKeyFocus(w); });
            b.addEventListener('blur', onKeyBlur);
            b.addEventListener('keydown', onKey);
            b.addEventListener('keyup', onKeyUp);
            b.addEventListener('click', function (e) { e.preventDefault(); });
          }
          b.style.left = px(w.x) + 'px';
          b.style.top = py(w.y, w.level * STACK) + 'px';
          b.setAttribute('aria-label', 'Red wink ' + (i + 1) + ', ' + Math.round(dist(w.x, w.y, CX, CY) / (RW * 2)) + ' wink widths from the cup');
          keys.appendChild(b);
        });
        Object.keys(keep).forEach(function (id) { if (!wanted[id]) { if (focused === id) canvas.focus({ preventScroll: true }); keep[id].remove(); } });
      }
      function focusAWink() {
        var b = (selected && keys.querySelector('[data-id="' + selected.id + '"]')) || keys.firstChild;
        if (b && document.activeElement !== b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }
      }
      function onKeyFocus(w) {
        if (G.phase !== 'aim' || G.turn !== 'you') return;
        if (selected !== w) { selected = w; G.aim = { dir: Math.atan2(CY - w.y, CX - w.x), power: 0 }; }
        G.hint = false;
        render();
      }
      function onKeyBlur() { if (charge) { charge = null; if (G) G.aim.power = 0; } render(); }
      function chargePower() { var t = (performance.now() - charge.t0) / 1000, k = (t % 2.2) / 1.1; return k > 1 ? 2 - k : k; }
      function canAim() { return !!(G && G.phase === 'aim' && G.turn === 'you' && !G.over); }
      function onKey(e) {
        var k = e.key;
        if (k === ' ' || k === 'Spacebar' || k === 'Enter') {
          e.preventDefault();
          if (api.unlockSound) api.unlockSound();
          if (k === 'Enter' || e.repeat || !canAim() || !selected || charge) return;
          keyboardUsed = true;
          charge = { t0: performance.now() };
          kick();
          return;
        }
        if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
          e.preventDefault();
          if (!canAim() || !selected) return;
          var stepA = e.shiftKey ? 0.008 : 0.035;
          G.aim.dir += (k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1) * stepA * (k === 'ArrowUp' || k === 'ArrowDown' ? 0.25 : 1);
          render();
          return;
        }
        if (k === 'Escape' && charge) { charge = null; G.aim.power = 0; render(); }
      }
      function onKeyUp(e) {
        if ((e.key === ' ' || e.key === 'Spacebar') && charge) {
          e.preventDefault();
          var p = chargePower();
          charge = null;
          if (canAim() && selected && p >= 0.02) squidge(selected, G.aim.dir, p); else { G.aim.power = 0; render(); }
        }
      }

      /* ---- pointer: press on one of your winks and pull back ---- */
      function setAimClass() { canvas.classList.toggle('is-aim', canAim()); }
      function local(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      function nearestWink(p, owner, onlyFree) {
        var bestW = null, bestD = Math.max(26, RW * L.s * 2.4);
        G.winks.forEach(function (w) {
          if (w.potted || w.flying || (owner && w.owner !== owner)) return;
          if (onlyFree && isCovered(w, G.winks)) return;
          var d = dist(p.x, p.y, px(w.x), py(w.y, w.level * STACK));
          if (d < bestD) { bestD = d; bestW = w; }
        });
        return bestW;
      }
      function onDown(e) {
        if (api.unlockSound) api.unlockSound();
        if (e.button != null && e.button > 0) return;
        if (!canAim()) return;
        var p = local(e);
        var w = nearestWink(p, 'you', true);
        if (!w) {
          var any = nearestWink(p, null, false);
          if (any && any.owner === 'you') { api.sound('wrong'); say('That wink is squopped. Play the wink on top of it first · ' + scoreText()); }
          else if (any) say('That is the computer\'s wink. Drag back from one of your red winks · ' + scoreText());
          return;
        }
        selected = w;
        keyboardUsed = false;
        drag = { id: e.pointerId, wink: w };
        G.aim = { dir: Math.atan2(CY - w.y, CX - w.x), power: 0 };
        G.hint = false;
        charge = null;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        e.preventDefault();
        render();
      }
      function onMove(e) {
        if (!drag || e.pointerId !== drag.id || !canAim()) return;
        var p = local(e), w = drag.wink, X = px(w.x), Y = py(w.y, w.level * STACK);
        var dx = X - p.x, dy = Y - p.y, len = Math.sqrt(dx * dx + dy * dy);
        if (len > 4) G.aim.dir = Math.atan2(dy, dx);
        G.aim.power = Math.min(1, len / maxPull());
        render();
      }
      function onUp(e) {
        if (!drag || e.pointerId !== drag.id) return;
        var w = drag.wink;
        drag = null;
        if (!canAim()) { render(); return; }
        if (G.aim.power >= 0.03) squidge(w, G.aim.dir, G.aim.power);
        else { G.aim.power = 0; G.hint = true; render(); }
      }
      function onCancel(e) {
        if (!drag || e.pointerId !== drag.id) return;
        drag = null;
        if (G && G.phase === 'aim') G.aim.power = 0;
        render();
      }
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onCancel);
      canvas.addEventListener('keydown', function (e) {
        /* from the canvas itself, Space or Enter jumps to your first wink */
        if ((e.key === ' ' || e.key === 'Enter') && canAim()) { e.preventDefault(); keyboardUsed = true; focusAWink(); }
      });

      var ro = null;
      if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(function () { resize(); }); ro.observe(root); }
      window.addEventListener('resize', resize);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!destroyed && L) { matImg = paintMat(); render(); } });

      /* A small window for the play-test script. */
      root.gitTest = {
        state: function () {
          var r = canvas.getBoundingClientRect();
          return {
            mode: G.mode, phase: G.phase, turn: G.turn, over: G.over, winner: G.winner, shots: G.shots, cpuShots: G.cpuShots || 0,
            you: potted('you'), cpu: potted('cpu'), running: !!raf, cpuWait: G.cpuWait || 0, planMs: G.planMs || 0,
            winks: G.winks.map(function (w) { return { id: w.id, owner: w.owner, potted: w.potted, covered: !w.potted && isCovered(w, G.winks), x: r.left + px(w.x), y: r.top + py(w.y, w.level * STACK) }; }),
            cup: { x: r.left + px(CX), y: r.top + py(CY) }, maxPull: L ? maxPull() : 0
          };
        },
        /* the drag that would put this wink in the middle of the cup */
        pull: function (id) {
          var w = G.winks.filter(function (x) { return x.id === id; })[0];
          if (!w) return null;
          var r = canvas.getBoundingClientRect(), d = dist(w.x, w.y, CX, CY), dir = Math.atan2(CY - w.y, CX - w.x), k = powerFor(d) * maxPull();
          var X = r.left + px(w.x), Y = r.top + py(w.y, w.level * STACK);
          return { from: { x: X, y: Y }, to: { x: X - Math.cos(dir) * k, y: Y - Math.sin(dir) * k } };
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
          if (ro) ro.disconnect();
          delete root.gitTest;
        }
      };
    }
  });
})();
