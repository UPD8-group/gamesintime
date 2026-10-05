/* Ten-Pin for Games in Time.

   Ten-pin bowling down a lane drawn in 3D, played like the bowling game that came with the Nintendo Wii in 2006
   (Wii Sports), where you swung the controller like a real ball. Here you move along the foul line, set how much the
   ball curves, then swing: drag back and flick forward on a touch screen or with a mouse, or press Space three times
   for a power and accuracy meter, like the golf games of the 1990s.

   Under the 3D picture the game is flat: seen from above, the ball and the ten pins are circles that slide and
   bump like snooker balls, and pins knock pins. A pin hit hard falls over; a pin hit softly wobbles and might or
   might not go down. The picture then draws that flat world in perspective (things further away are drawn smaller,
   by dividing by their distance).

   Scoring follows the real rules: ten frames, a strike scores 10 plus your next two balls, a spare 10 plus your next
   ball, and the tenth frame gives a strike or spare its bonus balls straight away. Twelve strikes in a row is a
   perfect game: 300.

   The name, the alley and all the art are our own, drawn on the canvas. */
(function () {
  'use strict';

  /* ================= scoring =================
     rolls: every ball in order, as the number of pins it knocked down. Returns one entry per frame:
     { balls: the pins for each ball in this frame, marks: what the score sheet shows in its little boxes,
       points: this frame on its own (10 + bonus for a strike or spare), total: the running total so far, or null
       while the frame is still waiting for its bonus balls, kind: 'strike' | 'spare' | 'open' | '' }
     The rule: a strike scores 10 plus your next two balls; a spare scores 10 plus your next one ball; any other
     frame scores just its pins. The tenth frame gives you the bonus balls straight away, so a perfect game is
     twelve strikes in a row, 30 points in each of ten frames, 300. */
  function scoreFrames(rolls) {
    var frames = [], i = 0, total = 0, stuck = false;
    for (var f = 0; f < 10; f++) {
      var fr = { balls: [], marks: [], points: null, total: null, kind: '' };
      frames.push(fr);
      if (i >= rolls.length) { stuck = true; continue; }
      var a = rolls[i], b = rolls[i + 1], c = rolls[i + 2];
      if (f < 9) {
        if (a === 10) {                       /* strike: 10 plus the next two balls */
          fr.kind = 'strike'; fr.balls = [10]; fr.marks = ['', 'X'];
          if (b !== undefined && c !== undefined) fr.points = 10 + b + c;
          i += 1;
        } else if (b === undefined) {         /* only the first ball so far */
          fr.balls = [a]; fr.marks = [mark(a)];
          i += 1;
        } else if (a + b === 10) {            /* spare: 10 plus the next ball */
          fr.kind = 'spare'; fr.balls = [a, b]; fr.marks = [mark(a), '/'];
          if (c !== undefined) fr.points = 10 + c;
          i += 2;
        } else {                              /* open frame: just the pins */
          fr.kind = 'open'; fr.balls = [a, b]; fr.marks = [mark(a), mark(b)]; fr.points = a + b;
          i += 2;
        }
      } else {
        /* the tenth frame: a strike or a spare earns its bonus balls in the same frame, up to three balls */
        var n = a === 10 || (b !== undefined && a + b === 10) ? 3 : 2;
        fr.balls = rolls.slice(i, i + n);
        fr.marks = tenthMarks(fr.balls);
        fr.kind = a === 10 ? 'strike' : b !== undefined && a + b === 10 ? 'spare' : b !== undefined ? 'open' : '';
        if (fr.balls.length === n) fr.points = sum(fr.balls);
        i += fr.balls.length;
      }
      /* the running total only carries on while every frame before it is known */
      if (fr.points != null && !stuck) { total += fr.points; fr.total = total; }
      else stuck = true;
    }
    return frames;
  }
  function sum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
  function mark(n) { return n === 0 ? '-' : String(n); }
  function tenthMarks(balls) {
    var m = [], fresh = true, prev = 0;
    for (var k = 0; k < balls.length; k++) {
      var n = balls[k];
      if (fresh && n === 10) { m.push('X'); fresh = true; prev = 0; }
      else if (!fresh && prev + n === 10) { m.push('/'); fresh = true; prev = 0; }
      else { m.push(mark(n)); fresh = false; prev = n; }
    }
    return m;
  }
  /* The best score anyone could still get, which also gives the final score once the game is over. */
  function gameTotal(rolls) {
    var fr = scoreFrames(rolls), t = 0;
    for (var i = 0; i < fr.length; i++) if (fr[i].total != null) t = fr[i].total;
    return t;
  }

  /* ================= the lane and the pins (seen from above, in metres) =================
     x runs across the lane (0 in the middle, negative to the left), y runs down the lane from the foul line. */
  var LANE_HALF = 0.527;           /* the lane is 41.5 inches wide */
  var GUTTER = 0.235;              /* each gutter is about 9 inches */
  var KICK = LANE_HALF + GUTTER;   /* the side walls beside the pins */
  var HEAD_PIN = 18.288;           /* 60 feet from the foul line to the head pin */
  var DECK_END = 19.45;            /* the end of the pin deck; then the pit */
  var PIT_END = 20.2;
  var BALL_R = 0.108, BALL_M = 7;  /* an 8.5 inch ball, about 7 kg */
  var PIN_R = 0.06, PIN_M = 1.5, LYING_R = 0.085, PIN_H = 0.381;
  var PIN_SPOTS = (function () {
    /* pins 1 to 10 in the usual triangle, 12 inches apart */
    var s = 0.3048, row = s * Math.sqrt(3) / 2, out = [];
    var layout = [[0], [-0.5, 0.5], [-1, 0, 1], [-1.5, -0.5, 0.5, 1.5]];
    for (var r = 0; r < 4; r++) for (var k = 0; k < layout[r].length; k++) out.push({ x: layout[r][k] * s, y: HEAD_PIN + r * row });
    return out;
  })();
  var DT = 1 / 240;                /* physics step */
  var HOOK = 0.8;                  /* how hard a full curve pulls sideways, m/s/s, once the ball leaves the oil */

  function makeSim(seed) {
    var sim = { t: 0, rnd: null, ball: { x: 0, y: 0, vx: 0, vy: 0, curve: 0, speed: 0, roll: 0, gutter: false, done: true, hitPins: false },
      pins: [], hits: 0, hitT: -1, bigHit: 0, quietFor: 0, settled: true, awake: false };
    for (var i = 0; i < 10; i++) sim.pins.push({ n: i + 1, x: 0, y: 0, vx: 0, vy: 0, up: true, gone: false, out: true, tilt: 0, fallX: 0, fallY: 1, fallAt: -1, wob: 0, wobT: 0 });
    reseed(sim, seed || 1);
    return sim;
  }
  function reseed(sim, seed) {
    var s = seed | 0;
    sim.rnd = function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  /* Set up the pins. standing: which pins are up (an array of 10 true/false), at: where they stand (or the spots). */
  function rack(sim, standing, from) {
    for (var i = 0; i < 10; i++) {
      var p = sim.pins[i], src = from ? from.pins[i] : PIN_SPOTS[i];
      p.up = standing ? !!standing[i] : true;
      p.out = !p.up;
      p.x = src.x; p.y = src.y; p.vx = 0; p.vy = 0; p.tilt = 0; p.fallAt = -1; p.wob = 0; p.wobT = 0; p.gone = false;
    }
  }
  function copyPins(dst, src) {
    for (var i = 0; i < 10; i++) {
      var a = dst.pins[i], b = src.pins[i];
      a.x = b.x; a.y = b.y; a.vx = 0; a.vy = 0; a.up = b.up; a.out = b.out; a.tilt = 0; a.fallAt = -1; a.wob = 0; a.gone = false;
    }
  }
  /* Let go of the ball: x where it crosses the foul line, speed in m/s, angle in radians (+ is to the right),
     curve from -1 (curls left) to 1 (curls right). */
  function release(sim, x, speed, angle, curve) {
    var b = sim.ball;
    b.x = x; b.y = 0.2; b.vx = speed * Math.sin(angle); b.vy = speed * Math.cos(angle); b.curve = curve; b.speed = speed;
    b.roll = 0; b.gutter = false; b.done = false; b.hitPins = false;
    sim.t = 0; sim.hits = 0; sim.hitT = -1; sim.bigHit = 0; sim.quietFor = 0; sim.settled = false; sim.awake = false;
  }
  function standingCount(sim) { var n = 0; for (var i = 0; i < 10; i++) if (sim.pins[i].up) n++; return n; }
  function smooth(a, b, x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }

  /* Two round things bump: push them apart and swap some speed along the line between their centres
     (the same maths as snooker balls). Returns how hard they hit. */
  function bump(a, ra, ma, b, rb, mb, e) {
    var dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, rr = ra + rb;
    if (d2 >= rr * rr || d2 < 1e-12) return 0;
    var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, over = rr - d;
    var ia = 1 / ma, ib = 1 / mb;
    a.x -= nx * over * ia / (ia + ib); a.y -= ny * over * ia / (ia + ib);
    b.x += nx * over * ib / (ia + ib); b.y += ny * over * ib / (ia + ib);
    var rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rel >= 0) return 0;
    var j = -(1 + e) * rel / (ia + ib);
    a.vx -= j * ia * nx; a.vy -= j * ia * ny;
    b.vx += j * ib * nx; b.vy += j * ib * ny;
    return j;
  }
  /* A standing pin that gets hit: hard knocks topple it straight away; a softer knock makes it wobble, and it may
     or may not go over (that is the "will it fall?" moment every bowler knows). */
  function knock(sim, p, j) {
    if (!p.up || p.fallAt >= 0) return;
    var dv = j / PIN_M;
    if (dv > 0.9) topple(sim, p);
    else if (dv > 0.3) {
      p.wob = Math.max(p.wob, dv); p.wobT = 0;
      if (sim.rnd() < (dv - 0.3) / 0.6) p.fallAt = sim.t + 0.15 + sim.rnd() * 0.45;
    } else p.wob = Math.max(p.wob, dv);
  }
  function topple(sim, p) {
    p.up = false; p.fallAt = -1;
    var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (sp > 0.05) { p.fallX = p.vx / sp; p.fallY = p.vy / sp; }
    else { var a = sim.rnd() * Math.PI * 2; p.fallX = Math.cos(a); p.fallY = Math.sin(a); }
  }
  function stepSim(sim) {
    var b = sim.ball, i, j, p, q, hit;
    sim.t += DT;
    /* the ball */
    if (!b.done) {
      if (!b.gutter) {
        var hook = b.curve * HOOK * smooth(7, 14, b.y) * (8.5 / Math.max(5, b.speed));
        b.vx += hook * DT;
      }
      b.vy -= 0.12 * DT;               /* a little slowing down */
      b.x += b.vx * DT; b.y += b.vy * DT;
      b.roll += Math.sqrt(b.vx * b.vx + b.vy * b.vy) * DT / BALL_R;
      if (!b.gutter && Math.abs(b.x) > LANE_HALF && b.y < DECK_END) { b.gutter = true; b.x = (b.x < 0 ? -1 : 1) * (LANE_HALF + GUTTER * 0.5); b.vx = 0; }
      if (b.y > DECK_END) { if (Math.abs(b.x) + BALL_R > KICK) { b.x = (b.x < 0 ? -1 : 1) * (KICK - BALL_R); b.vx *= -0.3; } }
      if (b.y > PIT_END - BALL_R || b.vy < 0.05) b.done = true;
    }
    /* nothing on the pin deck moves until the ball gets close, so skip the pins until then */
    if (!sim.awake) {
      if (b.y < HEAD_PIN - 1.2 && !b.done) return;
      sim.awake = true;
    }
    /* the pins */
    for (i = 0; i < 10; i++) {
      p = sim.pins[i];
      if (p.gone) continue;
      if (p.up && p.fallAt >= 0 && sim.t >= p.fallAt) topple(sim, p);
      if (!p.up && p.tilt < 1) p.tilt = Math.min(1, p.tilt + DT / 0.3);
      if (p.wob > 0) { p.wobT += DT; p.wob = Math.max(0, p.wob - DT * 0.9); }
      var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp > 0) {
        var fr = (p.up ? 7 : 2.2) * DT;       /* standing pins grip the deck; lying pins slide */
        if (sp <= fr) { p.vx = 0; p.vy = 0; }
        else { p.vx -= p.vx / sp * fr; p.vy -= p.vy / sp * fr; }
      }
      p.x += p.vx * DT; p.y += p.vy * DT;
      /* off the deck: into a gutter or the pit means down */
      if (p.up && (Math.abs(p.x) > LANE_HALF + PIN_R * 0.5 || p.y > DECK_END)) topple(sim, p);
      var r = p.up ? PIN_R : LYING_R;
      if (p.y > HEAD_PIN - 1 && Math.abs(p.x) + r > KICK) { p.x = (p.x < 0 ? -1 : 1) * (KICK - r); p.vx *= -0.45; }
      if (p.y > PIT_END) { p.gone = true; p.vx = 0; p.vy = 0; }
      if (p.y < HEAD_PIN - 3) { p.vy = Math.abs(p.vy) * 0.3; }
    }
    /* the ball knocks pins */
    if (!b.done && !b.gutter && b.y > HEAD_PIN - 1) {
      for (i = 0; i < 10; i++) {
        p = sim.pins[i];
        if (p.gone || (p.out && !p.up)) continue;
        hit = bump(b, BALL_R, BALL_M, p, p.up ? PIN_R : LYING_R, PIN_M, 0.55);
        if (hit > 0) { b.hitPins = true; if (p.up) knock(sim, p, hit); sim.hits++; sim.hitT = sim.t; if (hit > sim.bigHit) sim.bigHit = hit; }
      }
    }
    /* pins knock pins */
    for (i = 0; i < 10; i++) {
      p = sim.pins[i];
      if (p.gone || p.out) continue;
      for (j = i + 1; j < 10; j++) {
        q = sim.pins[j];
        if (q.gone || q.out) continue;
        hit = bump(p, p.up ? PIN_R : LYING_R, PIN_M, q, q.up ? PIN_R : LYING_R, PIN_M, 0.6);
        if (hit > 0) { if (p.up) knock(sim, p, hit); if (q.up) knock(sim, q, hit); if (hit > 0.3) { sim.hits++; sim.hitT = sim.t; } }
      }
    }
    /* is everything still? */
    var moving = !b.done;
    for (i = 0; i < 10 && !moving; i++) {
      p = sim.pins[i];
      if (p.gone || p.out) continue;
      if (p.vx * p.vx + p.vy * p.vy > 0.0004 || (p.up && p.fallAt >= 0) || (!p.up && p.tilt < 1)) moving = true;
    }
    sim.quietFor = moving ? 0 : sim.quietFor + DT;
    if (sim.quietFor > 0.35 || sim.t > 9) sim.settled = true;
  }
  /* Run a throw to the end without drawing it (for the Skip button, and for the computer imagining throws). */
  function runToEnd(sim) { var n = 0; while (!sim.settled && n++ < 3000) stepSim(sim); }

  /* ================= the computer bowler =================
     The computer imagines throws before it makes one. It runs the same pin physics in its head (without drawing
     anything) for every start board and every curve setting, counts how many pins each throw would knock down, and
     picks the best one, preferring throws whose neighbours also do well (so a small slip still works). Then its hand
     wobbles: a random error is added to where it stands, its aim, its speed and its curve. Easy wobbles a lot, Pro
     hardly at all. */
  var CPU = {
    easy: { label: 'Easy', speed: 7.6, sx: 0.08, sa: 0.013, sv: 0.6, sc: 0.3 },
    normal: { label: 'Normal', speed: 8.4, sx: 0.035, sa: 0.0055, sv: 0.35, sc: 0.14 },
    pro: { label: 'Pro', speed: 8.9, sx: 0.014, sa: 0.0024, sv: 0.15, sc: 0.05 }
  };
  var CURVES = [-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1];
  var BOARD = 2 * LANE_HALF / 39;        /* a lane is 39 wooden boards wide */
  var START_MAX = 16;                    /* you can stand up to 16 boards either side of the middle */
  function makePlanner() { return { sim: makeSim(11), base: makeSim(12), cands: [], scores: [], i: 0, ready: false, pick: null, speed: 8.5, before: 10 }; }
  function planStart(pl, live, speed) {
    copyPins(pl.base, live);
    pl.before = standingCount(live);
    pl.cands.length = 0; pl.scores.length = 0; pl.i = 0; pl.ready = false; pl.speed = speed;
    for (var c = 0; c < CURVES.length; c++) for (var b = -START_MAX; b <= START_MAX; b++) pl.cands.push(c * 100 + (b + 50));
  }
  function planWork(pl, n) {
    while (n-- > 0 && pl.i < pl.cands.length) {
      var code = pl.cands[pl.i], x = (code % 100 - 50) * BOARD, curve = CURVES[Math.floor(code / 100)];
      reseed(pl.sim, 7 + pl.i);
      copyPins(pl.sim, pl.base);
      release(pl.sim, x, pl.speed, 0, curve);
      runToEnd(pl.sim);
      var down = pl.before - standingCount(pl.sim);
      pl.scores[pl.i] = down + (down === pl.before ? 2 : 0);   /* knocking every pin down is worth a bonus */
      pl.i++;
    }
    if (pl.i >= pl.cands.length && !pl.ready) {
      /* smooth each score with its neighbours on either side, then take the best */
      var best = -1, bestI = 0, row = 2 * START_MAX + 1;
      for (var i = 0; i < pl.cands.length; i++) {
        var k = i % row, l = k > 0 ? pl.scores[i - 1] : pl.scores[i], r = k < row - 1 ? pl.scores[i + 1] : pl.scores[i];
        var s = pl.scores[i] * 0.5 + (l + r) * 0.25 - Math.abs(CURVES[Math.floor(pl.cands[i] / 100)]) * 0.01;
        if (s > best + 1e-9) { best = s; bestI = i; }
      }
      var code2 = pl.cands[bestI];
      pl.pick = { board: code2 % 100 - 50, curve: Math.floor(code2 / 100) - 3, expect: pl.scores[bestI] };
      pl.ready = true;
    }
    return pl.ready;
  }
  function gauss(rand) { var u = 1 - rand(), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  /* ================= colours ================= */
  function parseColour(s) {
    s = String(s || '').trim();
    var m;
    if (s.charAt(0) === '#') {
      var x = s.slice(1);
      if (x.length === 3) x = x.split('').map(function (ch) { return ch + ch; }).join('');
      if (x.length === 6) return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
    }
    if ((m = s.match(/^rgba?\(([^)]+)\)$/i))) { var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); if (p.length >= 3) return p; }
    return [255, 255, 255];
  }
  function rgba(s, a) { var c = parseColour(s); return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ================= the page ================= */
  GamesInTime.register({
    id: 'ten-pin',
    frame: 'stage',
    /* Read-only handles for automated tests: scoring and physics can be checked without a page. */
    testing: { scoreFrames: scoreFrames, gameTotal: gameTotal, makeSim: makeSim, rack: rack, release: release, stepSim: stepSim, runToEnd: runToEnd, standingCount: standingCount, reseed: reseed, copyPins: copyPins, makePlanner: makePlanner, planStart: planStart, planWork: planWork, CPU: CPU, CURVES: CURVES, BOARD: BOARD, PIN_SPOTS: PIN_SPOTS, gauss: gauss },
    mount: function (root, api) {
      var h = api.h;
      var destroyed = false;
      var reduced = !!api.reducedMotion;
      var best = Number(api.store.get('best', 0)) || 0;
      var humans = clamp(Number(api.store.get('humans', 1)) || 1, 1, 4);
      var cpuLevel = api.store.get('cpu', 'off');
      if (cpuLevel !== 'off' && !CPU[cpuLevel]) cpuLevel = 'off';
      if (cpuLevel !== 'off' && humans > 3) humans = 3;

      root.appendChild(h('style', null,
        '.game-ten-pin [hidden] { display: none !important; }' +
        '.game-ten-pin .tp-top { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; justify-content: space-between; margin-bottom: .55rem; }' +
        '.game-ten-pin .tp-top .btn { min-height: 42px; }' +
        '.game-ten-pin .tp-now { font-weight: 800; display: flex; align-items: center; gap: .45rem; font-size: 1.05rem; }' +
        '.game-ten-pin .tp-dot { width: 14px; height: 14px; border-radius: 50%; display: inline-block; box-shadow: 0 0 0 2px rgba(255,255,255,.25); flex: none; }' +
        '.game-ten-pin .tp-stage { position: relative; border-radius: 14px; overflow: hidden; background: #061423; }' +
        '.game-ten-pin .tp-canvas { display: block; width: 100%; touch-action: auto; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }' +
        '.game-ten-pin .tp-canvas.aiming { touch-action: none; cursor: grab; }' +
        '.game-ten-pin .tp-canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }' +
        '.game-ten-pin .tp-overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: 10px; background: rgba(3, 10, 20, .55); }' +
        '.game-ten-pin .tp-overlay[hidden] { display: none; }' +
        '.game-ten-pin .tp-card { background: color-mix(in srgb, var(--surface) 94%, transparent); border: 2px solid var(--line); border-radius: 18px; padding: .8rem 1rem .95rem; max-width: 30rem; width: 100%; max-height: 100%; overflow: auto; display: grid; gap: .6rem; justify-items: center; text-align: center; box-shadow: var(--shadow); }' +
        '.game-ten-pin .tp-title { margin: 0; font-family: var(--font-poster); font-weight: 900; font-size: clamp(1.6rem, 1.1rem + 2.2vw, 2.6rem); line-height: 1; letter-spacing: .03em; color: transparent; background: linear-gradient(180deg, #ffffff 0%, #bfe9ff 45%, #3fd0ff 55%, #eaf8ff 100%); -webkit-background-clip: text; background-clip: text; }' +
        '.game-ten-pin .tp-msg { margin: 0; font-weight: 600; line-height: 1.35; color: var(--ink); }' +
        '.game-ten-pin .tp-sub { margin: 0; font-size: .9rem; color: var(--ink-muted); }' +
        '.game-ten-pin .tp-sub:empty { display: none; }' +
        '.game-ten-pin .tp-settings { display: grid; gap: .45rem; justify-items: center; }' +
        '.game-ten-pin .tp-setrow { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; justify-content: center; }' +
        '.game-ten-pin .tp-lab { font-weight: 800; font-size: .85rem; color: var(--ink-muted); min-width: 4.6rem; text-align: right; }' +
        '.game-ten-pin .tp-settings .seg button { min-width: 44px; }' +
        '.game-ten-pin .tp-settings .seg button { min-height: 40px; padding-inline: .8rem; }' +
        '.game-ten-pin .tp-big { min-height: 52px; font-size: 1.15rem; padding: .5rem 1.7rem; }' +
        '.game-ten-pin .tp-pad { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .45rem; margin-top: .6rem; }' +
        '.game-ten-pin .tp-pad .btn { min-height: 52px; padding: .25rem .3rem; border-radius: 14px; flex-direction: column; gap: 0; line-height: 1.1; font-size: 1rem; touch-action: manipulation; user-select: none; -webkit-user-select: none; }' +
        '.game-ten-pin .tp-pad .btn small { font-size: .7rem; font-weight: 600; color: var(--ink-muted); }' +
        '.game-ten-pin .tp-pad .tp-bowl { background: var(--gold); border-color: var(--gold); color: var(--on-era); }' +
        '.game-ten-pin .tp-pad .tp-bowl small { color: var(--on-era); }' +
        '.game-ten-pin .tp-pad .btn:disabled { opacity: .4; }' +
        '.game-ten-pin .tp-sheet { margin-top: .9rem; display: grid; gap: .55rem; }' +
        '.game-ten-pin .tp-row { border: 2px solid var(--line); border-radius: 14px; padding: .4rem .5rem .5rem; background: var(--surface-2); }' +
        '.game-ten-pin .tp-row.now { border-color: var(--gold); box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 30%, transparent); }' +
        '.game-ten-pin .tp-name { display: flex; align-items: center; gap: .45rem; font-weight: 800; margin: 0 0 .35rem; }' +
        '.game-ten-pin .tp-name .tp-total { margin-left: auto; font-size: 1.25rem; font-variant-numeric: tabular-nums; color: var(--gold); }' +
        '.game-ten-pin .tp-frames { display: grid; grid-template-columns: repeat(9, minmax(0, 1fr)) minmax(0, 1.45fr); gap: 3px; }' +
        '.game-ten-pin .tp-f { border: 1px solid var(--line); border-radius: 6px; background: var(--surface); display: grid; grid-template-rows: auto auto 1fr; min-height: 58px; font-variant-numeric: tabular-nums; }' +
        '.game-ten-pin .tp-f.now { border-color: var(--gold); background: color-mix(in srgb, var(--gold) 12%, var(--surface)); }' +
        '.game-ten-pin .tp-fn { font-size: .66rem; color: var(--ink-muted); text-align: center; line-height: 1.2; font-weight: 700; }' +
        '.game-ten-pin .tp-boxes { display: flex; justify-content: flex-end; }' +
        '.game-ten-pin .tp-boxes span { width: 1.15rem; height: 1.15rem; border-left: 1px solid var(--line); border-bottom: 1px solid var(--line); display: grid; place-items: center; font-weight: 800; font-size: .82rem; }' +
        '.game-ten-pin .tp-boxes span.x { color: var(--gold); }' +
        '.game-ten-pin .tp-boxes span.s { color: var(--rose); }' +
        '.game-ten-pin .tp-ft { text-align: center; font-weight: 800; font-size: 1rem; align-self: center; padding: 1px 0 2px; }' +
        '.game-ten-pin .tp-ft.wait { color: var(--ink-faint); font-weight: 600; }' +
        '.game-ten-pin .tp-tip { margin: .7rem 0 0; padding: .55rem .75rem; border-radius: 12px; background: color-mix(in srgb, var(--gold) 12%, var(--surface-2)); border-left: 4px solid var(--gold); font-weight: 600; line-height: 1.4; }' +
        '.game-ten-pin .tp-tip strong { color: var(--gold); }' +
        '@media (max-width: 560px) { .game-ten-pin .tp-frames { grid-template-columns: repeat(5, minmax(0, 1fr)); } .game-ten-pin .tp-f { min-height: 54px; } .game-ten-pin .tp-pad { gap: .3rem; grid-template-columns: repeat(4, minmax(0, 1fr)); } .game-ten-pin .tp-pad .btn { font-size: .86rem; min-height: 46px; padding-inline: .1rem; white-space: nowrap; } .game-ten-pin .tp-pad .tp-bowl { grid-column: 1 / -1; min-height: 50px; font-size: 1.05rem; } .game-ten-pin .tp-pad .btn small { display: none; } .game-ten-pin .tp-lab { min-width: 0; text-align: center; flex-basis: 100%; } .game-ten-pin .tp-card { padding: .6rem .6rem .7rem; gap: .45rem; } .game-ten-pin .tp-settings .seg button { padding-inline: .55rem; } }' +
        '@media (max-width: 400px) { .game-ten-pin .tp-pad { grid-template-columns: repeat(2, minmax(0, 1fr)); } }'));

      /* ---------- DOM ---------- */
      var nowDot = h('span', { class: 'tp-dot' });
      var nowText = h('span', null, 'Ten-Pin');
      var skipBtn = h('button', { class: 'btn', type: 'button', disabled: true, onclick: function () { skip(); } }, '▶▶ Skip');
      var newBtn = h('button', { class: 'btn', type: 'button', onclick: function () { showSetup(); } }, 'New game');
      var top = h('div', { class: 'tp-top' }, h('div', { class: 'tp-now' }, nowDot, nowText), h('div', { class: 'game-toolbar', style: { margin: 0 } }, skipBtn, newBtn));
      var canvas = h('canvas', { class: 'tp-canvas', role: 'img', tabindex: '0', 'aria-label': 'A bowling lane seen from behind the bowler, with ten pins at the far end.' });
      var ovTitle = h('p', { class: 'tp-title' }, 'Ten-Pin');
      var ovMsg = h('p', { class: 'tp-msg' }, '');
      var whoBtns = {}, levelBtns = {};
      var whoSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Players taking turns on this device' }, [1, 2, 3, 4].map(function (n) {
        whoBtns[n] = h('button', { type: 'button', 'aria-pressed': String(n === humans), 'aria-label': n + (n === 1 ? ' player' : ' players'), onclick: function () { setWho(n); } }, String(n));
        return whoBtns[n];
      }));
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Computer player' }, ['off', 'easy', 'normal', 'pro'].map(function (k) {
        levelBtns[k] = h('button', { type: 'button', 'aria-pressed': String(k === cpuLevel), 'aria-label': k === 'off' ? 'No computer player' : 'Computer: ' + CPU[k].label, onclick: function () { setLevel(k); } }, k === 'off' ? 'Off' : CPU[k].label);
        return levelBtns[k];
      }));
      var ovSettings = h('div', { class: 'tp-settings' },
        h('div', { class: 'tp-setrow' }, h('span', { class: 'tp-lab', 'aria-hidden': 'true' }, 'Players'), whoSeg),
        h('div', { class: 'tp-setrow' }, h('span', { class: 'tp-lab', 'aria-hidden': 'true' }, 'Computer'), levelSeg));
      var ovBtn = h('button', { class: 'btn btn-primary tp-big', type: 'button', onclick: function () { startGame(); } }, '▶ Start');
      var ovSub = h('p', { class: 'tp-sub' }, '');
      var overlay = h('div', { class: 'tp-overlay' }, h('div', { class: 'tp-card' }, ovTitle, ovMsg, ovSettings, ovBtn, ovSub));
      var stage = h('div', { class: 'tp-stage' }, canvas, overlay);
      function padBtn(cls, label, sub, aria) { return h('button', { class: 'btn ' + cls, type: 'button', 'aria-label': aria }, label, h('small', null, sub)); }
      var bLeft = padBtn('tp-left', '◀ Move', '← key', 'Move left');
      var bRight = padBtn('tp-right', 'Move ▶', '→ key', 'Move right');
      var bCurveL = padBtn('tp-cl', '↶ Curve', 'A key', 'Curve more to the left');
      var bCurveR = padBtn('tp-cr', 'Curve ↷', 'D key', 'Curve more to the right');
      var bBowl = padBtn('tp-bowl', 'Bowl', 'Space ×3', 'Bowl with the power meter: press three times');
      var pad = h('div', { class: 'tp-pad' }, bLeft, bRight, bCurveL, bCurveR, bBowl);
      var tip = h('p', { class: 'tp-tip' }, 'Knock down all ten pins with your first ball for a strike, or with both balls for a spare.');
      var sheet = h('div', { class: 'tp-sheet', role: 'list', 'aria-label': 'Score sheet' });
      var note = h('p', { class: 'game-note' }, 'Move along the line and set the curve, then drag down on the lane and flick up to bowl (a faster flick is a faster ball). Or press Space (or Bowl) three times: once to start the swing, once to set the power, and once on the white line for a straight throw. Keyboard: ← and → move, A and D curve, Enter skips.');
      root.appendChild(top);
      root.appendChild(stage);
      root.appendChild(pad);
      root.appendChild(tip);
      root.appendChild(sheet);
      root.appendChild(note);

      var ctx = canvas.getContext('2d');
      var bgLayer = document.createElement('canvas');
      var pinSprite = document.createElement('canvas');
      var maskSprite = document.createElement('canvas');
      var W = 300, H = 300, dpr = 1, F = 300, HOR = 60;
      var C = {};
      function readColours() {
        var cs = getComputedStyle(root);
        function v(n, fb) { var s = cs.getPropertyValue(n).trim(); return s || fb; }
        C.gold = v('--gold', '#3fd0ff'); C.rose = v('--rose', '#ff6ec7'); C.leaf = v('--leaf', '#b4f000'); C.cobalt = v('--cobalt', '#5b8cff');
        C.ink = v('--ink', '#eef7ff'); C.muted = v('--ink-muted', '#a9c6dc'); C.red = v('--red', '#ff6e8a'); C.bg = v('--bg', '#061423');
        C.head = v('--font-head', 'system-ui, sans-serif'); C.poster = v('--font-poster', 'sans-serif') + ', ' + C.head;
        C.players = [C.gold, C.rose, C.leaf, C.cobalt];
        /* see-through versions, worked out once here rather than every frame */
        C.goldDim = rgba(C.gold, 0.25); C.gold50 = rgba(C.gold, 0.5); C.ink35 = rgba(C.ink, 0.35); C.ink40 = rgba(C.ink, 0.4);
      }

      /* ---------- game state ---------- */
      var sim = makeSim(1);
      var planner = makePlanner();
      var fullRackPick = {};                /* the computer's best first ball, worked out once per level */
      var players = [];                     /* {name, colour, rolls: [], cpu: bool} */
      var cur = 0, frame = 0, ball = 0;     /* whose turn, which frame (0 to 9) and which ball in it */
      var standing = [];                    /* pins up before this ball */
      var phase = 'setup';                  /* setup | aim | meter | drag | cpuThink | cpuWalk | cpuSwing | roll | result | sweep | over */
      var phaseAt = 0, simAcc = 0, lastT = 0, rafId = 0;
      var aim = { board: 0, curve: 0 };     /* where you stand (boards from the middle, + is right) and the curve (-3 to 3) */
      var meter = { stage: 0, at: 0, level: 0, power: 0, acc: 0 };
      var NS = 12;                          /* pointer samples kept for measuring the flick */
      var drag = { id: -1, x0: 0, y0: 0, back: 0, n: 0, xs: new Array(NS).fill(0), ys: new Array(NS).fill(0), ts: new Array(NS).fill(0) };
      var swingArm = 0;                     /* 0 hanging, + back, - forward (for the picture) */
      var thrown = { x: 0, speed: 0, angle: 0, curve: 0 };
      var cpuPlan = null, cpuLevelNow = 'normal';
      var CAM_Y = -5.4, CAM_Z = 2.1;
      var cam = { x: 0, y: CAM_Y, z: CAM_Z };
      var banner = { text: '', sub: '', at: -1e9, kind: '' };
      var lastClack = 0, rumbleAt = 0, rollT = 0, before = 10;
      var history = [];                     /* this player's strikes in a row, for 'Turkey!' */

      /* ---------- setup card ---------- */
      /* Up to four bowlers: people taking turns on this device, plus the computer if you want it. */
      function setWho(n, quiet) {
        humans = n; api.store.set('humans', n); if (!quiet) api.sound('click');
        if (n > 3 && cpuLevel !== 'off') setLevel('off', true);
        syncSetup();
      }
      function setLevel(k, quiet) {
        cpuLevel = k; api.store.set('cpu', k); if (!quiet) api.sound('click');
        if (k !== 'off' && humans > 3) { humans = 3; api.store.set('humans', 3); }
        syncSetup();
      }
      function syncSetup() {
        Object.keys(whoBtns).forEach(function (x) { whoBtns[x].setAttribute('aria-pressed', String(Number(x) === humans)); });
        Object.keys(levelBtns).forEach(function (x) { levelBtns[x].setAttribute('aria-pressed', String(x === cpuLevel)); });
        var n = humans + (cpuLevel !== 'off' ? 1 : 0);
        ovMsg.textContent = phase === 'setup' ? (n === 1 ? 'Bowl ten frames on your own and chase your best score.' : humans === 1 ? 'You against the computer, frame by frame.' : n + ' bowlers take turns, one frame each.') + ' Move, set the curve, then swing.' : ovMsg.textContent;
      }
      function showSetup() {
        phase = 'setup';
        overlay.hidden = false;
        ovTitle.textContent = 'Ten-Pin';
        ovSettings.hidden = false;
        syncSetup();
        ovBtn.textContent = '▶ Start';
        ovSub.textContent = best ? 'Your best score: ' + best : '';
        skipBtn.disabled = true;
        setAiming(false);
        updatePad();
        api.status('Choose who is playing, then press Start');
        draw(performance.now());
      }

      /* ---------- the flow of a game ---------- */
      function startGame() {
        api.unlockSound();
        players = [];
        for (var i = 0; i < humans; i++) players.push({ name: humans === 1 ? 'You' : 'Player ' + (i + 1), colour: C.players[i], rolls: [], cpu: false, streak: 0 });
        if (cpuLevel !== 'off') players.push({ name: 'Computer', colour: C.players[humans] || C.rose, rolls: [], cpu: true, streak: 0 });
        cpuLevelNow = cpuLevel;
        cur = 0; frame = 0; ball = 0;
        overlay.hidden = true;
        api.sound('shuffle');
        buildSheet();
        newRack();
        beginTurn();
      }
      function newRack() {
        for (var i = 0; i < 10; i++) standing[i] = true;
        rack(sim, null);
        sim.ball.done = true;
      }
      function P() { return players[cur]; }
      function beginTurn() {
        var p = P();
        aim.board = p.cpu ? 0 : (p.lastBoard != null ? p.lastBoard : aim.board);
        aim.curve = p.cpu ? 0 : (p.lastCurve != null ? p.lastCurve : aim.curve);
        meter.stage = 0;
        swingArm = 0;
        before = standingCount(sim);
        cam.y = CAM_Y; cam.z = CAM_Z; cam.x = 0;
        updateNow();
        renderSheet();
        if (p.cpu) {
          setPhase('cpuThink');
          var lv = CPU[cpuLevelNow];
          if (before === 10 && fullRackPick[cpuLevelNow]) { cpuPlan = fullRackPick[cpuLevelNow]; }
          else { cpuPlan = null; planStart(planner, sim, lv.speed); }
          api.status(p.name + ' is thinking about frame ' + (frame + 1) + (ball ? ', ball ' + (ball + 1) : ''));
        } else {
          setPhase('aim');
          sayAim(true);
        }
        updatePad();
        startLoop();
      }
      function sayAim(first) {
        var p = P(), lead = (players.length > 1 ? p.name + ': ' : '') + 'Frame ' + (frame + 1) + ', ball ' + (ball + 1) + '. ';
        syncData();
        api.status(first ? lead + (before === 10 ? 'Move, set the curve, then swing.' : before + (before === 1 ? ' pin' : ' pins') + ' left. Go for the spare!') : lead + boardWords() + ', ' + curveWords() + '.');
        describe();
      }
      function boardWords() { var b = 20 - aim.board; return 'Board ' + b + (aim.board === 0 ? ' (the middle)' : aim.board > 0 ? ' (right of middle)' : ' (left of middle)'); }
      function curveWords() { var c = aim.curve; return c === 0 ? 'no curve' : (Math.abs(c) === 1 ? 'a little' : Math.abs(c) === 2 ? 'some' : 'a big') + ' curve to the ' + (c < 0 ? 'left' : 'right'); }
      function setPhase(p) { phase = p; phaseAt = performance.now(); setAiming(p === 'aim' || p === 'meter' || p === 'drag'); updatePad(); syncData(); }
      /* While you aim, the lane takes your drags (so the page does not scroll); the rest of the time it lets the page scroll. */
      function setAiming(on) { canvas.classList.toggle('aiming', !!on && !cpuTurn()); }
      function cpuTurn() { return !players.length || P().cpu; }
      function updatePad() {
        var human = players.length && !P().cpu && (phase === 'aim' || phase === 'meter');
        bLeft.disabled = bRight.disabled = bCurveL.disabled = bCurveR.disabled = !(human && phase === 'aim');
        bBowl.disabled = !human;
        skipBtn.disabled = !(phase === 'roll' || phase === 'result' || phase === 'cpuThink' || phase === 'cpuWalk' || phase === 'cpuSwing');
        bBowl.firstChild.textContent = phase === 'meter' ? (meter.stage === 1 ? 'Set power' : 'Release') : 'Bowl';
      }
      function updateNow() {
        var p = P();
        nowDot.style.background = p ? p.colour : C.gold;
        nowText.textContent = p ? p.name + ' · Frame ' + (frame + 1) : 'Ten-Pin';
      }
      function move(d) {
        if (phase !== 'aim' || P().cpu) return;
        var nb = clamp(aim.board + d, -START_MAX, START_MAX);
        if (nb === aim.board) { api.sound('wrong'); return; }
        aim.board = nb; api.sound('tick'); sayAim(false);
      }
      function curve(d) {
        if (phase !== 'aim' || P().cpu) return;
        var nc = clamp(aim.curve + d, -3, 3);
        if (nc === aim.curve) { api.sound('wrong'); return; }
        aim.curve = nc; api.tone(500 + nc * 60, 0.06, 'triangle', 0.05); sayAim(false);
      }

      /* ---------- swinging ---------- */
      /* The meter: press once and the needle climbs (power); press again to set the power and the needle drops
         back; press a third time as it crosses the white line for a straight ball. Early pulls left, late pushes right. */
      var M_UP = 1100, M_DOWN = 800, M_LINE = 0.1, M_END = -0.12;
      function meterPress(t) {
        if (P().cpu) return;
        api.unlockSound();
        if (phase === 'aim') { setPhase('meter'); meter.stage = 1; meter.at = t; meter.level = 0; api.sound('click'); api.status('Power going up. Press again to set it.'); return; }
        if (phase !== 'meter') return;
        if (meter.stage === 1) {
          meter.power = clamp((t - meter.at) / M_UP, 0, 1);
          meter.stage = 2; meter.at = t; api.sound('click');
          api.status('Power ' + Math.round(meter.power * 100) + '%. Now press on the white line.');
        } else if (meter.stage === 2) {
          var lvl = meter.power - (t - meter.at) / M_DOWN;
          meter.acc = clamp((lvl - M_LINE) / 0.11, -1, 1);
          api.sound('click');
          throwBall(5.4 + meter.power * 4.6, -meter.acc * 0.011, 'meter');
        }
        updatePad();
      }
      function meterTick(t) {
        if (phase !== 'meter') return;
        if (meter.stage === 1) {
          meter.level = (t - meter.at) / M_UP;
          if (meter.level >= 1) { meter.level = 1; meter.power = 1; meter.stage = 2; meter.at = t; updatePad(); }
        } else if (meter.stage === 2) {
          meter.level = meter.power - (t - meter.at) / M_DOWN;
          if (meter.level <= M_END) { meter.acc = -1; throwBall(5.4 + meter.power * 4.6, 0.011, 'meter'); }
        }
        swingArm = meter.stage === 1 ? meter.level * 1.5 : meter.stage === 2 ? Math.max(-0.8, meter.level * 1.5) : 0;
      }
      /* Drag and flick: drag down to swing back, then flick up. The speed of the flick is the speed of the ball, and a
         flick that leans sideways sends the ball a little that way. */
      function onPointerDown(e) {
        if (e.button > 0) return;
        if (phase !== 'aim' || cpuTurn()) return;
        api.unlockSound();
        e.preventDefault();
        drag.id = e.pointerId; drag.x0 = e.clientX; drag.y0 = e.clientY; drag.back = 0; drag.n = 0;
        pushSample(e);
        try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
        setPhase('drag');
        api.status('Drag down to swing back, then flick up.');
      }
      function pushSample(e) {
        var k = drag.n % NS;
        drag.xs[k] = e.clientX; drag.ys[k] = e.clientY; drag.ts[k] = e.timeStamp || performance.now(); drag.n++;
      }
      function flickSpeed() {
        /* how fast the pointer moved over the last 80 milliseconds, in canvas heights per second (only the forward
           swing counts, so the samples stop at the bottom of the backswing) */
        var n = Math.min(drag.n, NS), last = (drag.n - 1) % NS, t1 = drag.ts[last], i, k = last;
        for (i = 1; i < n; i++) {
          var j = (drag.n - 1 - i) % NS;
          if (t1 - drag.ts[j] > 80 || drag.ys[j] < drag.ys[k]) break;
          k = j;
        }
        var dt = Math.max(16, t1 - drag.ts[k]);
        var rect = canvas.getBoundingClientRect(), hh = rect.height || H;
        return { up: (drag.ys[k] - drag.ys[last]) / hh / (dt / 1000), side: (drag.xs[last] - drag.xs[k]) / hh / (dt / 1000) };
      }
      function onPointerMove(e) {
        if (phase !== 'drag' || e.pointerId !== drag.id) return;
        pushSample(e);
        var rect = canvas.getBoundingClientRect(), hh = rect.height || H;
        var dy = e.clientY - drag.y0;
        drag.back = Math.max(drag.back, dy);
        swingArm = clamp(dy / (hh * 0.3), -0.8, 1.5) * 1.1;
        /* once the swing comes back past where it started, the ball is away */
        if (drag.back > hh * 0.06 && dy < -hh * 0.02) letGo();
      }
      function onPointerUp(e) {
        if (phase !== 'drag' || e.pointerId !== drag.id) return;
        pushSample(e);
        var rect = canvas.getBoundingClientRect(), hh = rect.height || H;
        if (drag.back > hh * 0.06 && flickSpeed().up > 1) letGo();
        else cancelDrag(drag.back > hh * 0.06 ? 'Flick up faster to bowl.' : 'Drag down first to swing back, then flick up.');
      }
      function letGo() {
        var f = flickSpeed();
        drag.id = -1;
        if (f.up < 1) { cancelDrag('Too gentle! Flick up faster to bowl.'); return; }
        var speed = clamp(4.6 + f.up * 0.75, 5.2, 10.5);
        var angle = clamp(Math.atan2(f.side, f.up) * 0.09, -0.03, 0.03);
        throwBall(speed, angle, 'flick');
      }
      function cancelDrag(msg) {
        drag.id = -1; swingArm = 0;
        setPhase('aim');
        api.status(msg);
      }
      function throwBall(speed, angle, how) {
        var p = P();
        if (!p.cpu) { p.lastBoard = aim.board; p.lastCurve = aim.curve; }
        thrown.x = aim.board * BOARD; thrown.speed = speed; thrown.angle = angle; thrown.curve = aim.curve / 3;
        if (p.cpu) { thrown.x = cpuPlan.x; thrown.speed = cpuPlan.speed; thrown.angle = cpuPlan.angle; thrown.curve = cpuPlan.curve; }
        reseed(sim, Math.floor(api.random() * 1e9) + 1);
        release(sim, thrown.x, thrown.speed, thrown.angle, thrown.curve);
        simAcc = 0; rollT = 0; rumbleAt = 0;
        swingArm = -0.8;
        meter.stage = 0;
        setPhase('roll');
        api.sound('whoosh');
        api.status((players.length > 1 ? p.name + ': ' : '') + Math.round(thrown.speed * 3.6) + ' km/h' + (how === 'meter' ? (Math.abs(meter.acc) < 0.25 ? ', nice and straight.' : meter.acc > 0 ? ', a little early, so it pulled left.' : ', a little late, so it pushed right.') : '.'));
      }

      /* ---------- the computer's turn ---------- */
      function cpuTick(now) {
        var lv = CPU[cpuLevelNow];
        if (phase === 'cpuThink') {
          if (!cpuPlan) { if (planWork(planner, 12)) { cpuPlan = { board: planner.pick.board, curveStep: planner.pick.curve }; if (before === 10) fullRackPick[cpuLevelNow] = cpuPlan; } }
          if (cpuPlan && now - phaseAt > (reduced ? 150 : 450)) {
            /* add the wobble of a real hand */
            var rand = api.random;
            cpuPlan = { board: cpuPlan.board, curveStep: cpuPlan.curveStep,
              x: clamp(cpuPlan.board * BOARD + gauss(rand) * lv.sx, -START_MAX * BOARD, START_MAX * BOARD), angle: gauss(rand) * lv.sa,
              speed: clamp(lv.speed + gauss(rand) * lv.sv, 5.5, 10.5), curve: clamp(cpuPlan.curveStep / 3 + gauss(rand) * lv.sc, -1, 1) };
            aim.board = Math.round(cpuPlan.x / BOARD); aim.curve = cpuPlan.curveStep;
            setPhase('cpuWalk');
          }
        } else if (phase === 'cpuWalk') {
          if (now - phaseAt > (reduced ? 150 : 500)) setPhase('cpuSwing');
        } else if (phase === 'cpuSwing') {
          var k = (now - phaseAt) / (reduced ? 300 : 900);
          swingArm = k < 0.55 ? Math.sin(k / 0.55 * Math.PI / 2) * 1.4 : 1.4 - (k - 0.55) / 0.45 * 2.2;
          if (k >= 1) throwBall(cpuPlan.speed, cpuPlan.angle, 'cpu');
        }
      }

      /* ---------- after the ball ---------- */
      function finishBall() {
        var p = P();
        var after = standingCount(sim), down = before - after;
        p.rolls.push(down);
        for (var i = 0; i < 10; i++) standing[i] = sim.pins[i].up;
        var wasStrike = ball === 0 && down === 10 || (frame === 9 && before === 10 && down === 10);
        var wasSpare = !wasStrike && after === 0 && before < 10;
        var gutter = sim.ball.gutter && down === 0;
        p.streak = wasStrike ? p.streak + 1 : 0;
        var big = '', sub = '';
        if (wasStrike) { big = p.streak === 3 ? 'TURKEY!' : p.streak > 3 ? p.streak + ' IN A ROW!' : 'STRIKE!'; sub = 'All ten pins with one ball'; api.sound('bell'); api.tone(1568, 0.25, 'triangle', 0.08); }
        else if (wasSpare) { big = 'SPARE!'; sub = 'All the pins with two balls'; api.sound('coin'); }
        else if (gutter) { big = 'Gutter ball'; sub = 'Shake it off. Try moving or curving less.'; api.sound('thud'); }
        else if (down === 0) { big = 'Missed them'; sub = 'So close'; api.sound('thud'); }
        else { big = down + (down === 1 ? ' pin' : ' pins'); sub = after ? after + ' left standing' : ''; api.sound('pop'); }
        if (!wasStrike && !wasSpare && after > 1 && isSplit()) sub = 'A split! The head pin is down and there is a gap between the pins left.';
        banner.text = big; banner.sub = sub; banner.at = performance.now(); banner.kind = wasStrike ? 'strike' : wasSpare ? 'spare' : '';
        api.announce(big + '. ' + sub);
        teach(p, wasStrike, wasSpare, down);
        renderSheet();
        setPhase('result');
      }
      /* A split: the head pin is down and the pins left have a gap between them with no pin in front. */
      function isSplit() {
        if (standing[0]) return false;
        var up = []; for (var i = 0; i < 10; i++) if (standing[i]) up.push(i);
        if (up.length < 2) return false;
        var xs = up.map(function (i) { return Math.round(PIN_SPOTS[i].x / 0.1524); }).sort(function (a, b) { return a - b; });
        for (var k = 1; k < xs.length; k++) if (xs[k] - xs[k - 1] > 1) return true;
        return false;
      }
      /* The scoring lesson: say what just happened and what it is worth. */
      function teach(p, strike, spare, down) {
        var frames = scoreFrames(p.rolls), msg = '';
        var f = frames[frame];
        if (frame < 9) {
          if (strike) msg = '<strong>Strike!</strong> Frame ' + (frame + 1) + ' scores 10, plus whatever your next two balls knock down. The score sheet waits for them.';
          else if (spare) msg = '<strong>Spare!</strong> Frame ' + (frame + 1) + ' scores 10, plus whatever your next ball knocks down.';
          else if (ball === 1) msg = 'Frame ' + (frame + 1) + ': ' + f.balls[0] + ' + ' + f.balls[1] + ' = ' + f.points + '. No strike or spare, so the frame is worth just its pins.';
          else msg = 'First ball: ' + down + '. Knock down the other ' + (10 - down) + ' with your next ball for a spare, worth 10 plus a bonus.';
        } else {
          if (f.points != null) msg = 'Frame 10: ' + f.balls.join(' + ') + ' = ' + f.points + '. That was your last ball.';
          else if (strike || spare) msg = '<strong>' + (strike ? 'Strike' : 'Spare') + ' in the tenth!</strong> There is no frame after the tenth, so you get your bonus ' + (strike && ball === 0 ? 'balls' : 'ball') + ' right now.';
        }
        /* any earlier strike or spare that just got its bonus */
        for (var i = 0; i < frame; i++) {
          var e = frames[i];
          if ((e.kind === 'strike' || e.kind === 'spare') && e.points != null) {
            var bonus = e.points - 10;
            if (!p.told) p.told = {};
            if (!p.told[i]) { p.told[i] = true; msg = 'Frame ' + (i + 1) + ' ' + (e.kind === 'strike' ? 'strike' : 'spare') + ': 10 + ' + bonus + ' bonus = ' + e.points + '. ' + msg; }
          }
        }
        if (msg && players.length > 1) msg = p.name + ': ' + msg;
        if (msg) setTip(msg);
      }
      function setTip(htmlish) {
        /* the message is our own text with <strong> for the headline, built here (never from what anyone types) */
        tip.replaceChildren();
        var m = htmlish.match(/^(.*?)<strong>(.*?)<\/strong>(.*)$/);
        if (m) { if (m[1]) tip.appendChild(document.createTextNode(m[1])); tip.appendChild(h('strong', null, m[2])); tip.appendChild(document.createTextNode(m[3])); }
        else tip.textContent = htmlish;
      }
      /* Who goes next, and with how many pins? */
      function nextBall() {
        var p = P(), after = standingCount(sim);
        var frameDone = false, reset = false;
        if (frame < 9) {
          if (ball === 0 && after > 0) { ball = 1; }
          else frameDone = true;
        } else {
          var fr = scoreFrames(p.rolls)[9];
          if (ball === 0) { ball = 1; reset = after === 0; }
          else if (ball === 1) {
            if (fr.kind === 'strike' || fr.kind === 'spare') { ball = 2; reset = after === 0; }
            else frameDone = true;
          } else frameDone = true;
        }
        if (frameDone) {
          ball = 0;
          cur++;
          if (cur >= players.length) { cur = 0; frame++; }
          if (frame >= 10) { gameOver(); return; }
          newRack();
          if (players.length > 1) { banner.text = P().name; banner.sub = 'Frame ' + (frame + 1); banner.at = performance.now(); banner.kind = 'turn'; }
        } else if (reset) newRack();
        else sweep();
        beginTurn();
      }
      /* Clear the fallen pins away; the standing ones stay exactly where they are. */
      function sweep() {
        for (var i = 0; i < 10; i++) {
          var q = sim.pins[i];
          if (!q.up) { q.out = true; q.gone = true; }
          q.vx = 0; q.vy = 0; q.wob = 0; q.fallAt = -1;
        }
        sim.ball.done = true;
      }
      function gameOver() {
        setPhase('over');
        var totals = players.map(function (p) { return gameTotal(p.rolls); });
        var top = Math.max.apply(null, totals);
        var winners = players.filter(function (p, i) { return totals[i] === top; });
        var msg, celebrate = '';
        if (players.length === 1) {
          var isBest = top > best;
          msg = 'You scored ' + top + '.' + (top === 300 ? ' A perfect game!' : '') + (isBest && best ? ' A new best (it was ' + best + ').' : isBest ? '' : ' Your best is ' + best + '.');
          if (isBest) { best = top; api.store.set('best', best); celebrate = 'New best: ' + top; }
        } else {
          msg = players.map(function (p, i) { return p.name + ' ' + totals[i]; }).join(' · ') + '. ';
          if (winners.length > 1) msg += 'A tie!';
          else msg += winners[0].cpu ? 'The computer wins this time. Have another go!' : winners[0].name + ' wins!';
          if (winners.some(function (p) { return !p.cpu; })) celebrate = (winners.length > 1 ? 'A tie on ' + top : winners[0].name + ' wins with ' + top);
          players.forEach(function (p, i) { if (!p.cpu && totals[i] > best) { best = totals[i]; api.store.set('best', best); } });
        }
        if (celebrate) api.celebrate(celebrate); else api.sound('lose');
        api.status('Game over. ' + msg);
        overlay.hidden = false;
        ovTitle.textContent = players.length === 1 ? 'Game over' : winners.length > 1 ? 'A tie!' : winners[0].name + (winners[0].cpu ? ' wins' : ' wins!');
        ovMsg.textContent = msg;
        ovSettings.hidden = false;
        ovBtn.textContent = '↻ Play again';
        ovSub.textContent = 'Best score: ' + best;
        renderSheet();
        setTip('Final score' + (players.length > 1 ? 's: ' : ': ') + players.map(function (p, i) { return (players.length > 1 ? p.name + ' ' : '') + totals[i]; }).join(', ') + '. A perfect game is 12 strikes in a row: 300.');
      }
      function skip() {
        if (phase === 'cpuThink' || phase === 'cpuWalk' || phase === 'cpuSwing') {
          if (!cpuPlan || cpuPlan.x == null) {
            while (!cpuPlan) { if (planWork(planner, 400)) { cpuPlan = { board: planner.pick.board, curveStep: planner.pick.curve }; if (before === 10) fullRackPick[cpuLevelNow] = cpuPlan; } }
            phaseAt = -1e9; cpuTick(performance.now());
          }
          throwBall(cpuPlan.speed, cpuPlan.angle, 'cpu');
        }
        /* one press shows the result straight away, a second press moves on */
        if (phase === 'roll') { runToEnd(sim); finishBall(); }
        else if (phase === 'result') { phaseAt = -1e9; }
      }

      /* ---------- the loop ---------- */
      function startLoop() { if (!rafId && !destroyed && !document.hidden) { lastT = performance.now(); rafId = requestAnimationFrame(frameFn); } }
      function stopLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }
      function frameFn(now) {
        rafId = 0;
        if (destroyed) return;
        var dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
        if (phase === 'meter') meterTick(now);
        if (phase === 'cpuThink' || phase === 'cpuWalk' || phase === 'cpuSwing') cpuTick(now);
        if (phase === 'roll') {
          simAcc += dt; rollT += dt;
          var hitsBefore = sim.hits;
          while (simAcc >= DT && !sim.settled) { stepSim(sim); simAcc -= DT; }
          var newHits = sim.hits - hitsBefore;
          if (newHits > 0 && now - lastClack > 40) { lastClack = now; api.sound('clack'); if (newHits > 3) api.sound('dice'); }
          if (!sim.ball.done && now - rumbleAt > 260 && !sim.ball.hitPins) { rumbleAt = now; api.tone(48 + thrown.speed * 4, 0.3, 'sine', 0.06); }
          if (sim.settled) finishBall();
        } else if (phase === 'result') {
          if (now - phaseAt > (reduced ? 900 : 1700)) nextBall();
        }
        moveCamera(dt);
        draw(now);
        if (phase !== 'setup' && phase !== 'over') rafId = requestAnimationFrame(frameFn);
      }
      function moveCamera(dt) {
        /* the camera waits behind the bowler, then follows the ball down the lane and stops a few metres short of the
           pins, coming down a little so you see the pins fly */
        var ty = CAM_Y, tz = CAM_Z, tx = 0;
        if (phase === 'roll' || phase === 'result') {
          ty = Math.min(sim.ball.done ? 12.9 : sim.ball.y - 4.6, 12.9); tz = CAM_Z - 0.8 * clamp((ty - CAM_Y) / (12.9 - CAM_Y), 0, 1); tx = clamp(sim.ball.x, -0.4, 0.4) * 0.3;
          if (phase === 'roll' && sim.ball.y < 0.8) ty = CAM_Y;
        }
        var k = phase === 'roll' || phase === 'result' ? 1 - Math.pow(0.0015, dt) : 1;
        if (reduced && (phase === 'roll' || phase === 'result')) k = 1;
        cam.y += (ty - cam.y) * k; cam.z += (tz - cam.z) * k; cam.x += (tx - cam.x) * k;
      }

      /* ================= drawing ================= */
      var PX = 0, PY = 0, PS = 0;          /* the last point projected */
      function proj(x, y, z) {
        var d = y - cam.y; if (d < 0.35) d = 0.35;
        PS = F / d; PX = W / 2 + (x - cam.x) * PS; PY = HOR + (cam.z - z) * PS;
      }
      function resize() {
        var w = Math.max(240, Math.round(stage.clientWidth || 300));
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = w;
        H = Math.round(w < 560 ? clamp(w * 1.35, 380, 540) : clamp(w * 0.52, 380, 560));
        HOR = H * 0.2;
        F = Math.min(H * 1.45, w * 1.9);
        canvas.style.height = H + 'px';
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        readColours();
        buildBackground(); buildPin(); buildMask();
        draw(performance.now());
      }
      function buildBackground() {
        bgLayer.width = canvas.width; bgLayer.height = canvas.height;
        var b = bgLayer.getContext('2d');
        b.setTransform(dpr, 0, 0, dpr, 0, 0);
        var g = b.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#0b2140'); g.addColorStop(0.35, '#061428'); g.addColorStop(1, '#030a14');
        b.fillStyle = g; b.fillRect(0, 0, W, H);
        /* neon tubes along the ceiling, fading into the distance */
        for (var i = 0; i < 6; i++) {
          var y = HOR * (0.15 + i * 0.13), a = 0.55 - i * 0.07, half = W * (0.48 - i * 0.06);
          b.strokeStyle = rgba(i % 2 ? C.rose : C.gold, a); b.lineWidth = Math.max(1.5, 4 - i * 0.5);
          b.beginPath(); b.moveTo(W / 2 - half, y); b.lineTo(W / 2 + half, y); b.stroke();
        }
        /* little stars of light */
        var s = 12345;
        function r() { s = (s * 16807) % 2147483647; return s / 2147483647; }
        for (i = 0; i < 40; i++) { b.fillStyle = rgba([C.gold, C.rose, C.leaf][i % 3], 0.25 + r() * 0.4); b.fillRect(r() * W, r() * HOR * 1.6, 2, 2); }
      }
      /* One pin drawn once into a hidden canvas: white, round-bellied, two red stripes at the neck. Every pin on the
         lane is a copy of it, stretched to its size, which is much faster than drawing ten pins from scratch. */
      function buildPin() {
        var ph = Math.round(Math.max(80, H * 0.5) * dpr), pw = Math.round(ph * 0.34);
        pinSprite.width = pw; pinSprite.height = ph;
        var c = pinSprite.getContext('2d'), m = pw / 2;
        /* the pin's outline: [height from the base 0..1, half-width 0..1], taken from a real pin's shape */
        var prof = [[0, 0.42], [0.06, 0.6], [0.2, 0.92], [0.3, 1], [0.42, 0.9], [0.55, 0.58], [0.64, 0.4], [0.7, 0.38], [0.8, 0.5], [0.9, 0.52], [0.96, 0.4], [1, 0.12]];
        function path() {
          c.beginPath(); c.moveTo(m - prof[0][1] * m, ph);
          for (var i = 1; i < prof.length; i++) c.lineTo(m - prof[i][1] * m, ph - prof[i][0] * ph);
          for (i = prof.length - 1; i >= 0; i--) c.lineTo(m + prof[i][1] * m, ph - prof[i][0] * ph);
          c.closePath();
        }
        var g = c.createLinearGradient(0, 0, pw, 0);
        g.addColorStop(0, '#b9c3cc'); g.addColorStop(0.3, '#ffffff'); g.addColorStop(0.62, '#f3f6f8'); g.addColorStop(1, '#8e9aa6');
        path(); c.fillStyle = g; c.fill();
        c.save(); path(); c.clip();
        c.fillStyle = '#e8304a'; c.fillRect(0, ph * (1 - 0.69), pw, ph * 0.035); c.fillRect(0, ph * (1 - 0.635), pw, ph * 0.035);
        c.restore();
      }
      /* The panel above the pins, in Y2K chrome and neon. */
      function buildMask() {
        var mw = Math.round(560 * Math.min(dpr, 1.5)), mh = Math.round(mw * 0.42);
        maskSprite.width = mw; maskSprite.height = mh;
        var c = maskSprite.getContext('2d');
        var g = c.createLinearGradient(0, 0, 0, mh);
        g.addColorStop(0, '#0f2a45'); g.addColorStop(1, '#071a2e');
        c.fillStyle = g; c.fillRect(0, 0, mw, mh);
        c.lineWidth = mh * 0.05; c.lineCap = 'round';
        c.strokeStyle = C.gold; c.beginPath(); c.moveTo(-mw * 0.05, mh * 0.8); c.bezierCurveTo(mw * 0.25, mh * 0.1, mw * 0.55, mh * 1.0, mw * 1.05, mh * 0.25); c.stroke();
        c.strokeStyle = C.rose; c.lineWidth = mh * 0.03; c.beginPath(); c.moveTo(-mw * 0.05, mh * 0.95); c.bezierCurveTo(mw * 0.3, mh * 0.35, mw * 0.6, mh * 1.1, mw * 1.05, mh * 0.5); c.stroke();
        function star(x, y, r, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); }
        star(mw * 0.18, mh * 0.3, mh * 0.12, '#ffffff'); star(mw * 0.8, mh * 0.72, mh * 0.09, C.leaf); star(mw * 0.62, mh * 0.22, mh * 0.06, '#ffffff');
        var cg = c.createLinearGradient(0, 0, 0, mh * 0.12);
        cg.addColorStop(0, '#f4fbff'); cg.addColorStop(0.5, '#7f9db5'); cg.addColorStop(1, '#dfeefa');
        c.fillStyle = cg; c.fillRect(0, 0, mw, mh * 0.08); c.fillRect(0, mh * 0.92, mw, mh * 0.08);
      }

      /* flat things on the floor */
      var Q = [0, 0, 0, 0, 0, 0, 0, 0];
      function floorQuad(x0, x1, y0, y1, z, fill) {
        var yn = Math.max(y0, cam.y + 0.4);
        if (y1 <= yn) return;
        proj(x0, yn, z); Q[0] = PX; Q[1] = PY; proj(x1, yn, z); Q[2] = PX; Q[3] = PY;
        proj(x1, y1, z); Q[4] = PX; Q[5] = PY; proj(x0, y1, z); Q[6] = PX; Q[7] = PY;
        ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(Q[0], Q[1]); ctx.lineTo(Q[2], Q[3]); ctx.lineTo(Q[4], Q[5]); ctx.lineTo(Q[6], Q[7]); ctx.closePath(); ctx.fill();
      }
      /* a wall standing along the lane (x fixed) */
      function sideWall(x, y0, y1, z0, z1, fill) {
        var yn = Math.max(y0, cam.y + 0.4);
        if (y1 <= yn) return;
        proj(x, yn, z0); Q[0] = PX; Q[1] = PY; proj(x, y1, z0); Q[2] = PX; Q[3] = PY;
        proj(x, y1, z1); Q[4] = PX; Q[5] = PY; proj(x, yn, z1); Q[6] = PX; Q[7] = PY;
        ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(Q[0], Q[1]); ctx.lineTo(Q[2], Q[3]); ctx.lineTo(Q[4], Q[5]); ctx.lineTo(Q[6], Q[7]); ctx.closePath(); ctx.fill();
      }
      function drawLane(ox, dim) {
        var far = PIT_END + 0.35;
        /* approach, lane, gutters */
        floorQuad(ox - KICK - 0.12, ox + KICK + 0.12, -6, 0, 0, dim ? '#3b2a1c' : '#6b4b2e');
        floorQuad(ox - LANE_HALF, ox + LANE_HALF, 0, DECK_END, 0, dim ? '#5a4128' : '#c8935a');
        if (!dim) {
          /* every other board a shade lighter, so you can count them */
          for (var k = 1; k < 39; k += 2) floorQuad(ox - LANE_HALF + k * BOARD, ox - LANE_HALF + (k + 1) * BOARD, 0, 17.6, 0.0005, 'rgba(255, 236, 200, .07)');
          floorQuad(ox - LANE_HALF, ox + LANE_HALF, 17.6, DECK_END, 0.001, 'rgba(255, 245, 225, .18)');
          floorQuad(ox - LANE_HALF, ox + LANE_HALF, -0.01, 0.025, 0.002, '#1d1208');
          /* the aiming arrows, 15 feet down the lane, and the dots at 7 feet */
          ctx.fillStyle = '#3a210e';
          for (var a = 5; a <= 35; a += 5) {
            var ax = ox + (20 - a) * BOARD, ay = 4.57 + Math.abs(20 - a) * 0.035;
            proj(ax, ay + 0.3, 0.002); var tx = PX, ty = PY;
            proj(ax - 0.022, ay, 0.002); var lx = PX, ly = PY; proj(ax + 0.022, ay, 0.002);
            if (ay > cam.y + 0.5) { ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(lx, ly); ctx.lineTo(PX, PY); ctx.closePath(); ctx.fill(); }
          }
          for (var d = -2; d <= 2; d++) if (d) { floorQuad(ox + d * 5 * BOARD - 0.012, ox + d * 5 * BOARD + 0.012, 2.12, 2.15, 0.002, '#3a210e'); }
          /* pin spots */
          for (var p = 0; p < 10; p++) floorQuad(ox + PIN_SPOTS[p].x - 0.025, ox + PIN_SPOTS[p].x + 0.025, PIN_SPOTS[p].y - 0.012, PIN_SPOTS[p].y + 0.012, 0.002, 'rgba(120, 60, 20, .45)');
        }
        for (var s = -1; s <= 1; s += 2) {
          floorQuad(ox + s * LANE_HALF + (s < 0 ? -GUTTER : 0), ox + s * LANE_HALF + (s < 0 ? 0 : GUTTER), 0, far, -0.04, dim ? '#11161d' : '#1f2832');
          floorQuad(ox + s * (LANE_HALF + GUTTER * 0.42) - 0.02, ox + s * (LANE_HALF + GUTTER * 0.42) + 0.02, 0, far, -0.039, dim ? '#1a2029' : '#334252');
        }
        /* the pit */
        floorQuad(ox - KICK, ox + KICK, DECK_END, far, -0.05, '#020509');
        /* side walls by the pins, with a neon strip */
        for (s = -1; s <= 1; s += 2) {
          sideWall(ox + s * KICK, HEAD_PIN - 1.6, far, -0.05, 0.62, dim ? '#0a1522' : '#0f2238');
          sideWall(ox + s * KICK, HEAD_PIN - 1.6, far, 0.6, 0.64, dim ? C.goldDim : C.gold);
        }
        /* the back wall and the panel above it */
        proj(ox - KICK - 0.25, far, 0.95); var mx0 = PX, my0 = PY; proj(ox + KICK + 0.25, far, -0.05);
        ctx.fillStyle = '#010306'; ctx.fillRect(mx0, my0, PX - mx0, PY - my0);
        proj(ox - KICK - 0.35, far, 1.95); var nx0 = PX, ny0 = PY; proj(ox + KICK + 0.35, far, 0.95);
        if (dim) ctx.globalAlpha = 0.45;
        ctx.drawImage(maskSprite, nx0, ny0, PX - nx0, PY - ny0);
        ctx.globalAlpha = 1;
      }
      /* Draw a pin from its base to its head (both projected), so a falling or lying pin tips over correctly. */
      function drawPinAt(x, y, tilt, fx, fy, wob, t, alpha) {
        var th = tilt * Math.PI / 2, L2 = PIN_H / 2;
        var sx = Math.sin(th), cz = Math.cos(th);
        var lean = wob ? Math.sin(t * 28) * wob * 0.12 : 0;
        var bx = x - fx * L2 * sx, by = y - fy * L2 * sx, hx = x + fx * L2 * sx + lean, hy = y + fy * L2 * sx;
        var rz = PIN_R * sx;
        proj(bx, by, rz); var x0 = PX, y0 = PY, s0 = PS;
        proj(hx, hy, rz + PIN_H * cz); var x1 = PX, y1 = PY;
        var dx = x1 - x0, dy = y1 - y0, len = Math.sqrt(dx * dx + dy * dy), wpx = 0.122 * s0;
        if (len < wpx * 0.9) len = wpx * 0.9;
        var ang = Math.atan2(dx, -dy);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x0, y0); ctx.rotate(ang);
        ctx.drawImage(pinSprite, -wpx / 2, -len, wpx, len);
        ctx.restore();
      }
      var order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      function depthOf(i) { return i === 10 ? sim.ball.y : sim.pins[i].y; }
      function draw(now) {
        if (destroyed || !W) return;
        var t = now / 1000, i;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(bgLayer, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        /* neighbouring lanes, then ours */
        drawLane(-2 * 1.85, true); drawLane(2 * 1.85, true); drawLane(-1.85, true); drawLane(1.85, true);
        for (var nl = -1; nl <= 1; nl += 2) for (i = 0; i < 10; i++) { var sp = PIN_SPOTS[i]; drawPinAt(nl * 1.85 + sp.x, sp.y, 0, 0, 1, 0, t, 0.5); }
        drawLane(0, false);
        /* shadows */
        ctx.fillStyle = 'rgba(0, 0, 0, .35)';
        for (i = 0; i < 10; i++) { var q = sim.pins[i]; if (q.gone || (q.out && !q.up)) continue; proj(q.x, q.y, 0); ctx.beginPath(); ctx.ellipse(PX, PY, Math.max(0.5, 0.07 * PS), Math.max(0.3, 0.025 * PS), 0, 0, Math.PI * 2); ctx.fill(); }
        /* ball and pins, far ones first */
        for (i = 1; i < 11; i++) { var v = order[i], j = i - 1; while (j >= 0 && depthOf(order[j]) < depthOf(v)) { order[j + 1] = order[j]; j--; } order[j + 1] = v; }
        var showBall = phase === 'roll' || phase === 'result';
        for (i = 0; i < 11; i++) {
          var k = order[i];
          if (k === 10) { if (showBall && sim.ball.y < PIT_END + 0.2) drawBall(sim.ball.x, sim.ball.y, sim.ball.gutter ? BALL_R - 0.04 : BALL_R, sim.ball.roll, P() ? P().colour : C.gold); continue; }
          var pn = sim.pins[k];
          if (pn.gone || (pn.out && !pn.up)) continue;
          var fade = phase === 'result' && !pn.up ? clamp(1 - (now - phaseAt - 1100) / 500, 0, 1) : 1;
          if (fade <= 0) continue;
          drawPinAt(pn.x, pn.y, pn.up ? 0 : easeOut(pn.tilt), pn.fallX, pn.fallY, pn.up ? pn.wob : 0, t, fade);
        }
        /* the bowler and the aim line */
        if (players.length && phase !== 'over' && (phase !== 'roll' || cam.y < -3.6) && phase !== 'result') drawBowler(t);
        if (phase === 'aim' || phase === 'meter' || phase === 'drag' || phase === 'cpuWalk' || phase === 'cpuSwing') drawAimLine();
        drawPinDiagram();
        if (phase === 'meter') drawMeter();
        if (phase === 'roll' || phase === 'result') {
          var sz = clamp(W * 0.028, 12, 18);
          ctx.font = '700 ' + Math.round(sz) + 'px ' + C.head; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          textOut(Math.round(thrown.speed * 3.6) + ' km/h', 12, 12, C.ink);
        }
        drawBanner(now);
      }
      function easeOut(k) { return 1 - (1 - k) * (1 - k); }
      function textOut(s, x, y, col) { ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(2, 8, 16, .85)'; ctx.lineWidth = 4; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
      function drawBall(x, y, r, roll, col) {
        proj(x, y, 0);
        ctx.fillStyle = 'rgba(0, 0, 0, .4)'; ctx.beginPath(); ctx.ellipse(PX, PY, Math.max(0.5, r * PS * 1.05), Math.max(0.3, r * PS * 0.35), 0, 0, Math.PI * 2); ctx.fill();
        proj(x, y, r);
        var R = Math.max(1, r * PS), cx = PX, cy = PY;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(0, 0, 0, .28)'; ctx.beginPath(); ctx.arc(cx + R * 0.18, cy + R * 0.2, R * 0.85, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx - R * 0.08, cy - R * 0.1, R * 0.78, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, .55)'; ctx.beginPath(); ctx.ellipse(cx - R * 0.35, cy - R * 0.4, R * 0.28, R * 0.16, -0.6, 0, Math.PI * 2); ctx.fill();
        /* finger holes roll over the top of the ball as it goes away from us */
        var a = roll % (Math.PI * 2), c = Math.cos(a);
        if (c > 0.1) {
          ctx.fillStyle = 'rgba(5, 10, 20, .85)';
          var hy = cy + Math.sin(a) * R * 0.55;
          for (var hI = -1; hI <= 1; hI++) { ctx.beginPath(); ctx.ellipse(cx + hI * R * 0.22, hy - (hI === 0 ? R * 0.22 : 0), R * 0.08, R * 0.08 * c, 0, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      /* A bowler seen from behind, in the player's colour. The ball hand swings back and forward. */
      function drawBowler(t) {
        var p = P(), x = aim.board * BOARD - 0.18, y = -0.85;
        proj(x, y, 0); var fx = PX, fy = PY, s = PS;
        var u = s * 0.88;  /* pixels per metre at the bowler (a kid about 1.3 metres tall) */
        var col = p.colour;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 0.32 * u, 0.06 * u, 0, 0, Math.PI * 2); ctx.fill();
        ctx.lineCap = 'round';
        /* legs and shoes */
        ctx.strokeStyle = '#1b2a44'; ctx.lineWidth = 0.13 * u;
        ctx.beginPath(); ctx.moveTo(-0.1 * u, -0.72 * u); ctx.lineTo(-0.13 * u, -0.06 * u); ctx.moveTo(0.1 * u, -0.72 * u); ctx.lineTo(0.14 * u, -0.06 * u); ctx.stroke();
        ctx.fillStyle = '#e8eef5'; ctx.fillRect(-0.21 * u, -0.08 * u, 0.15 * u, 0.08 * u); ctx.fillRect(0.07 * u, -0.08 * u, 0.15 * u, 0.08 * u);
        /* body */
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-0.2 * u, -1.22 * u); ctx.lineTo(0.2 * u, -1.22 * u); ctx.lineTo(0.18 * u, -0.7 * u); ctx.lineTo(-0.18 * u, -0.7 * u); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-0.2 * u, -1.0 * u, 0.4 * u, 0.04 * u);
        /* left arm out for balance */
        ctx.strokeStyle = col; ctx.lineWidth = 0.09 * u;
        ctx.beginPath(); ctx.moveTo(-0.18 * u, -1.15 * u); ctx.lineTo(-0.42 * u, -0.85 * u); ctx.stroke();
        /* head and hair */
        ctx.fillStyle = '#e2b48c'; ctx.beginPath(); ctx.arc(0, -1.36 * u, 0.12 * u, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = cur % 2 ? '#2a1a10' : '#5b3a1e'; ctx.beginPath(); ctx.arc(0, -1.38 * u, 0.125 * u, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, -1.33 * u, 0.125 * u, 0.1 * u, 0, 0, Math.PI); ctx.fill();
        ctx.restore();
        /* the ball arm, drawn in 3D so the swing comes towards us */
        var sh = { x: x + 0.18, y: y, z: 1.04 }, arm = 0.55, ph = swingArm;
        var hx = sh.x, hy = sh.y - Math.sin(ph) * arm, hz = sh.z - Math.cos(ph) * arm;
        proj(sh.x, sh.y, sh.z); var ax = PX, ay = PY;
        proj(hx, hy, hz); var bx = PX, by = PY, bs = PS;
        ctx.strokeStyle = col; ctx.lineWidth = 0.09 * bs; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        if (phase !== 'roll') drawBall(hx, hy, BALL_R, 0, col);
      }
      /* The aim line: where the ball would go if you swung perfectly, dotted as far as the arrows, then fading. */
      function drawAimLine() {
        var x = aim.board * BOARD, vx = 0, y = 0.2, sp = P() && P().cpu ? 8.5 : 8.2, cv = aim.curve / 3;
        ctx.fillStyle = rgba(P() ? P().colour : C.gold, 0.9);
        for (var step = 0; step < 60; step++) {
          for (var k = 0; k < 8; k++) { vx += cv * HOOK * smooth(7, 14, y) * (8.5 / sp) * DT; x += vx * DT; y += sp * DT; }
          if (y > HEAD_PIN - 0.4 || Math.abs(x) > LANE_HALF) break;
          if (step % 2) continue;
          proj(x, y, 0.003);
          var a = clamp(1 - y / 16, 0.15, 0.9);
          ctx.globalAlpha = a;
          ctx.beginPath(); ctx.ellipse(PX, PY, Math.max(1, 0.03 * PS), Math.max(0.6, 0.012 * PS), 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      /* The pin diagram in the corner: which pins are standing, numbered as bowlers number them. */
      function drawPinDiagram() {
        var sz = clamp(W * 0.028, 9, 15), gap = sz * 2.3;
        var cx = W - gap * 2.1 - 8, cy = 12 + sz;
        ctx.fillStyle = 'rgba(3, 10, 20, .7)'; ctx.strokeStyle = C.gold50; ctx.lineWidth = 1.5;
        roundRect(cx - gap * 2.0, cy - sz * 1.3, gap * 4, gap * 2.6 + sz * 0.9, 10); ctx.fill(); ctx.stroke();
        ctx.font = '800 ' + Math.round(sz * 0.95) + 'px ' + C.head; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (var i = 0; i < 10; i++) {
          var sp = PIN_SPOTS[i], px = cx + (sp.x / 0.3048) * gap, py = cy + (3 - (sp.y - HEAD_PIN) / 0.264) * gap * 0.866;
          var up = phase === 'roll' || phase === 'result' ? sim.pins[i].up : (sim.pins[i].up && !sim.pins[i].out);
          ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
          if (up) { ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.fillStyle = '#0a1a2c'; }
          else { ctx.strokeStyle = C.ink35; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = C.ink40; }
          ctx.fillText(String(i + 1), px, py + 1);
        }
      }
      function roundRect(x, y, w, hh, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
      function drawMeter() {
        var mh = clamp(H * 0.5, 150, 260), mw = clamp(W * 0.045, 22, 34), x = 14, y = H - mh - 20;
        var lo = M_END, span = 1 - lo;
        function yy(l) { return y + mh - (l - lo) / span * mh; }
        ctx.fillStyle = 'rgba(3, 10, 20, .75)'; roundRect(x - 4, y - 4, mw + 8, mh + 8, 10); ctx.fill();
        var g = ctx.createLinearGradient(0, yy(1), 0, yy(0));
        g.addColorStop(0, C.rose); g.addColorStop(0.5, C.gold); g.addColorStop(1, C.leaf);
        ctx.fillStyle = g; ctx.fillRect(x, yy(1), mw, yy(0) - yy(1));
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x, yy(0), mw, yy(lo) - yy(0));
        if (meter.stage === 2) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(x - 6, yy(meter.power) - 1.5, mw + 12, 3); }
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 8, yy(M_LINE) - 2, mw + 16, 4);
        var l = clamp(meter.level, lo, 1);
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#02101c'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + mw + 14, yy(l)); ctx.lineTo(x + mw + 2, yy(l) - 7); ctx.lineTo(x + mw + 2, yy(l) + 7); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.font = '800 ' + Math.round(clamp(W * 0.024, 11, 15)) + 'px ' + C.head; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        textOut(meter.stage === 1 ? 'Power' : 'Line!', x + mw + 18, yy(l), '#ffffff');
      }
      function drawBanner(now) {
        var age = now - banner.at;
        if (age > 1600 || age < 0) return;
        var k = reduced ? 1 : clamp(age / 180, 0, 1), fade = clamp((1600 - age) / 300, 0, 1);
        var big = banner.kind === 'strike' || banner.kind === 'spare';
        var sz = clamp(W * (big ? 0.11 : 0.07), big ? 34 : 24, big ? 96 : 54) * (reduced ? 1 : 0.6 + 0.4 * k);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '900 italic ' + Math.round(sz) + 'px ' + C.poster;
        var y = H * 0.42;
        ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(2, 8, 16, .9)'; ctx.lineWidth = Math.max(5, sz * 0.12);
        ctx.strokeText(banner.text, W / 2, y);
        if (big) {
          var g = ctx.createLinearGradient(0, y - sz / 2, 0, y + sz / 2);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, banner.kind === 'strike' ? C.gold : C.rose); g.addColorStop(0.55, banner.kind === 'strike' ? '#0b6f8f' : '#a8327f'); g.addColorStop(1, '#ffffff');
          ctx.fillStyle = g;
        } else ctx.fillStyle = banner.kind === 'turn' ? (P() ? P().colour : C.gold) : '#ffffff';
        ctx.fillText(banner.text, W / 2, y);
        if (banner.sub) {
          var ss = clamp(W * 0.032, 13, 22);
          ctx.font = '700 ' + Math.round(ss) + 'px ' + C.head;
          textOutC(banner.sub, W / 2, y + sz * 0.62 + ss * 0.4);
        }
        ctx.restore();
      }
      function textOutC(s, x, y) {
        var maxW = W - 24;
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(2, 8, 16, .85)';
        if (ctx.measureText(s).width > maxW) {
          /* wrap onto two lines on narrow screens */
          var words = s.split(' '), a = '', b = '';
          for (var i = 0; i < words.length; i++) { if (ctx.measureText(a + ' ' + words[i]).width < maxW && !b) a = a ? a + ' ' + words[i] : words[i]; else b = b ? b + ' ' + words[i] : words[i]; }
          ctx.strokeText(a, x, y); ctx.fillStyle = '#ffffff'; ctx.fillText(a, x, y);
          ctx.strokeText(b, x, y + parseInt(ctx.font.match(/(\d+)px/)[1], 10) * 1.25); ctx.fillText(b, x, y + parseInt(ctx.font.match(/(\d+)px/)[1], 10) * 1.25);
          return;
        }
        ctx.strokeText(s, x, y); ctx.fillStyle = '#ffffff'; ctx.fillText(s, x, y);
      }

      /* ---------- the score sheet ---------- */
      var rows = [];
      function buildSheet() {
        sheet.replaceChildren();
        rows = players.map(function (p) {
          var total = h('span', { class: 'tp-total' }, '0');
          var frames = h('div', { class: 'tp-frames' });
          var cells = [];
          for (var i = 0; i < 10; i++) {
            var boxes = h('div', { class: 'tp-boxes', 'aria-hidden': 'true' });
            var nb = i === 9 ? 3 : 2;
            for (var b = 0; b < nb; b++) boxes.appendChild(h('span'));
            var ft = h('div', { class: 'tp-ft', 'aria-hidden': 'true' });
            var cell = h('div', { class: 'tp-f', role: 'listitem' }, h('div', { class: 'tp-fn', 'aria-hidden': 'true' }, String(i + 1)), boxes, ft);
            frames.appendChild(cell);
            cells.push({ cell: cell, boxes: boxes, ft: ft });
          }
          var row = h('div', { class: 'tp-row', role: 'listitem', 'aria-label': p.name }, h('p', { class: 'tp-name' }, h('span', { class: 'tp-dot', style: { background: p.colour } }), p.name, total), h('div', { role: 'list', 'aria-label': p.name + ' frames' }, frames));
          sheet.appendChild(row);
          return { row: row, total: total, cells: cells };
        });
      }
      function renderSheet() {
        players.forEach(function (p, pi) {
          var r = rows[pi]; if (!r) return;
          var frames = scoreFrames(p.rolls), last = 0;
          r.row.classList.toggle('now', pi === cur && phase !== 'over');
          for (var i = 0; i < 10; i++) {
            var f = frames[i], c = r.cells[i], spans = c.boxes.children;
            for (var b = 0; b < spans.length; b++) {
              var m = f.marks[b] != null ? f.marks[b] : '';
              if (i < 9 && f.kind === 'strike') m = b === 1 ? 'X' : '';
              spans[b].textContent = m;
              spans[b].className = m === 'X' ? 'x' : m === '/' ? 's' : '';
            }
            var pending = f.balls.length && f.total == null;
            c.ft.textContent = f.total != null ? String(f.total) : pending ? '…' : '';
            c.ft.className = 'tp-ft' + (pending ? ' wait' : '');
            if (f.total != null) last = f.total;
            c.cell.classList.toggle('now', pi === cur && i === frame && phase !== 'over');
            c.cell.setAttribute('aria-label', 'Frame ' + (i + 1) + ': ' + (f.balls.length ? frameWords(f) : 'not bowled yet') + (f.total != null ? ', total ' + f.total : pending ? ', waiting for bonus balls' : ''));
          }
          r.total.textContent = String(last);
        });
        syncData();
      }
      function frameWords(f) {
        return f.marks.map(function (m) { return m === 'X' ? 'strike' : m === '/' ? 'spare' : m === '-' ? 'nothing' : m === '' ? null : m; }).filter(function (x) { return x != null; }).join(' then ');
      }

      /* ---------- for screen readers and the automated test ---------- */
      function describe() {
        var up = [];
        for (var i = 0; i < 10; i++) if (sim.pins[i].up && !sim.pins[i].out) up.push(i + 1);
        canvas.setAttribute('aria-label', 'Bowling lane. ' + (players.length ? (P().name + ', frame ' + (frame + 1) + ', ball ' + (ball + 1) + '. ') : '') + (up.length === 10 ? 'All ten pins standing. ' : up.length ? 'Pins standing: ' + up.join(', ') + '. ' : '') + boardWords() + ', ' + curveWords() + '.');
      }
      function syncData() {
        var d = canvas.dataset;
        d.phase = phase; d.player = String(cur); d.frame = String(frame + 1); d.ball = String(ball + 1);
        d.rolls = players.map(function (p) { return p.rolls.join(','); }).join('|');
        d.standing = String(standingCount(sim));
        d.board = String(aim.board); d.curve = String(aim.curve);
        d.meterAt = phase === 'meter' ? String(Math.round(meter.at)) : '';
        d.meterStage = String(meter.stage); d.power = String(meter.power);
      }

      /* ---------- input ---------- */
      function onKey(e) {
        if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
        var tgt = e.target;
        if (tgt && tgt.closest && tgt.closest('input, select, textarea')) return;
        var inRoot = !!(tgt && root.contains(tgt));
        if (!inRoot && tgt && tgt !== document.body) return;
        if (phase === 'setup' || phase === 'over' || !players.length) return;
        var k = e.key;
        if (tgt && tgt.tagName === 'BUTTON' && (k === 'Enter' || k === ' ')) return;
        var human = !P().cpu;
        if (k === ' ' || k === 'Spacebar') { e.preventDefault(); if (e.repeat) return; if (human && (phase === 'aim' || phase === 'meter')) meterPress(e.timeStamp && Math.abs(e.timeStamp - performance.now()) < 250 ? e.timeStamp : performance.now()); return; }
        if (k === 'Enter') { e.preventDefault(); skip(); return; }
        if (!human || phase !== 'aim') return;
        if (k === 'ArrowLeft') { e.preventDefault(); move(-1); }
        else if (k === 'ArrowRight') { e.preventDefault(); move(1); }
        else if (k === 'a' || k === 'A') { e.preventDefault(); curve(-1); }
        else if (k === 'd' || k === 'D') { e.preventDefault(); curve(1); }
      }
      /* hold a Move button to keep moving */
      var holdTimer = 0;
      function holdable(btn, fn) {
        btn.addEventListener('pointerdown', function (e) {
          if (e.button > 0 || btn.disabled) return;
          e.preventDefault();
          api.unlockSound();
          fn();
          clearInterval(holdTimer);
          var n = 0;
          holdTimer = setInterval(function () { if (++n > 4) fn(); }, 70);
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { btn.addEventListener(ev, function () { clearInterval(holdTimer); }); });
        btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
      }
      holdable(bLeft, function () { move(-1); });
      holdable(bRight, function () { move(1); });
      holdable(bCurveL, function () { curve(-1); });
      holdable(bCurveR, function () { curve(1); });
      bBowl.addEventListener('click', function (e) { meterPress(e.timeStamp && Math.abs(e.timeStamp - performance.now()) < 250 ? e.timeStamp : performance.now()); });
      function onVisibility() { if (document.hidden) stopLoop(); else if (phase !== 'setup' && phase !== 'over') { if (phase === 'meter') { meter.stage = 0; setPhase('aim'); api.status('Swing stopped while you were away. Swing again.'); } startLoop(); } }
      document.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onVisibility);
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', function (e) { if (phase === 'drag' && e.pointerId === drag.id) cancelDrag('Swing cancelled. Drag down, then flick up.'); });
      var lastW = 0, lastDpr = 0;
      function maybeResize() {
        var w = Math.round(stage.clientWidth), r = Math.min(2, window.devicePixelRatio || 1);
        if (w && (w !== lastW || r !== lastDpr)) { lastW = w; lastDpr = r; resize(); }
      }
      var ro = new ResizeObserver(maybeResize);
      ro.observe(stage);

      readColours();
      newRack();
      resize();
      syncSetup();
      showSetup();

      return {
        destroy: function () {
          destroyed = true;
          stopLoop();
          clearInterval(holdTimer);
          ro.disconnect();
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }
  });
})();
