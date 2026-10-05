/* Melon Drop for Games in Time (the 2020s hall).

   Drop fruit into a glass jar. When two fruit of the same kind touch, they squash together into the next fruit up:
   two cherries make a strawberry, two strawberries make a plum, and so on, all the way to a watermelon. Every merge
   scores points. Do not let the jar overflow: if fruit stays above the dashed line, the game is over.

   This is the mechanic of the 2021 drop-and-merge fruit game from Japan; the fruit drawings, faces, jar, look and
   name are our own.

   The physics (see also the 'computer' note): every fruit is a circle. Sixty times a second the computer moves time
   forward in 8 tiny steps. In each tiny step it
     1. pulls every fruit down a little (gravity) and moves it by its speed,
     2. looks at every pair of fruit: if they overlap, it pushes them apart along the line between their centres
        (a heavy fruit moves less than a light one), and rubs away a little sideways sliding (friction),
     3. pushes any fruit that poked through a wall or the floor straight back inside, and
     4. works out each fruit's new speed from how far it really moved.
   Because the steps are tiny (1/480 of a second) and the speed is capped, a fruit can never move further than a
   few units in one step, much less than the smallest fruit is wide, so nothing can tunnel through anything. Fruit
   that is resting ends each step exactly where it started, so its speed works out to zero and it sits still. */
(function () {
  'use strict';

  /* The eleven fruit, smallest to biggest. r is the radius in units (the jar is 420 units wide). */
  var FRUIT = [
    { name: 'cherry', r: 14 },
    { name: 'strawberry', r: 19 },
    { name: 'plum', r: 25 },
    { name: 'mandarin', r: 31 },
    { name: 'apple', r: 38 },
    { name: 'lemon', r: 45 },
    { name: 'peach', r: 53 },
    { name: 'pineapple', r: 62 },
    { name: 'rockmelon', r: 72 },
    { name: 'honeydew melon', r: 84 },
    { name: 'watermelon', r: 98 }
  ];
  var RADII = FRUIT.map(function (f) { return f.r; });
  /* "a plum" but "an apple" */
  function aFruit(i) { var n = FRUIT[i].name; return (/^[aeiou]/.test(n) ? 'an ' : 'a ') + n; }
  var POINTS = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];   /* points for making each fruit (a triangle-number ladder) */
  var MELON_PAIR = 100;                                      /* two watermelons together vanish for a big bonus */
  var DROPPABLE = [0.26, 0.25, 0.22, 0.16, 0.11];            /* chances for the five fruit the dropper can hold */
  var JW = 420, JH = 520;                                    /* inside of the jar, in units */
  var LINE_Y = 64;                                           /* the dashed "too full" line, measured from the jar top */
  var DROP_Y = -54;                                          /* where the held fruit hangs, above the jar */
  var TOP = 196, BOTTOM = 92;                                /* room above the jar (dropper, score) and below (fruit ladder) */
  var WORLD_H = TOP + JH + BOTTOM;
  var NARROW_W = JW + 48;
  var DANGER_TIME = 2.6;                                     /* seconds fruit may stay above the line */

  /* ---------- the physics: circles in a jar ---------- */
  /* makeWorld builds a little physics world. It knows nothing about the game, so the automated test can run it on
     its own (GamesInTime.get('melon-drop').makeWorld) to check that piles settle calmly and nothing escapes. */
  function makeWorld(width, floor, radii) {
    var SUB = 8;            /* tiny steps per frame */
    var ITER = 3;           /* times we sweep through all the overlaps in each tiny step */
    var GRAV = 1700;        /* units per second per second */
    var MAXV = 1500;        /* speed limit, units per second */
    var MU = 0.2;           /* friction between fruit */
    var MU_WALL = 0.1;      /* friction against the glass */
    var DAMP = 0.8;         /* air slows things a little each second */
    var REST_V = 3;         /* slower than this (units per second) counts as "still" */
    var REST_T = 0.6;       /* when every fruit has been still this long, the whole jar goes to sleep */
    var GROW = 140;         /* how fast a freshly merged fruit swells to full size, units per second */
    var MAXB = 140;
    var bodies = [], live = [], nLive = 0, merges = [], nMerge = 0, nextId = 1, asleep = false, i;
    for (i = 0; i < MAXB; i++) bodies.push({ on: false, id: 0, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, r: 10, R: 10, size: 0, inv: 1, age: 0, angle: 0, merging: false, touch: false, squash: 0, lastVy: 0, still: 0 });
    for (i = 0; i < 64; i++) merges.push({ a: null, b: null });
    /* Any change (a new fruit, a merge) wakes the jar up. */
    function relist() { nLive = 0; asleep = false; for (var k = 0; k < MAXB; k++) if (bodies[k].on) { live[nLive++] = bodies[k]; bodies[k].still = 0; } }
    function add(x, y, size, startR) {
      for (var k = 0; k < MAXB; k++) {
        var b = bodies[k];
        if (b.on) continue;
        b.on = true; b.id = nextId++; b.size = size; b.R = radii[size]; b.r = Math.min(b.R, startR || b.R);
        b.x = clampN(x, b.r, width - b.r); b.y = y; b.px = b.x; b.py = y; b.vx = 0; b.vy = 0;
        b.inv = 1 / (b.R * b.R);            /* heavier fruit (bigger area) move less when pushed */
        b.age = 0; b.angle = (k * 2.39996) % 6.283; b.merging = false; b.touch = false; b.squash = 0; b.lastVy = 0;
        relist();
        return b;
      }
      return null;
    }
    function remove(b) { b.on = false; relist(); }
    function clear() { for (var k = 0; k < MAXB; k++) bodies[k].on = false; relist(); }
    function clampN(v, a, b) { return v < a ? a : v > b ? b : v; }
    /* Push two overlapping fruit apart, then rub away some of their sideways sliding. */
    function solvePair(a, b, first) {
      var dx = b.x - a.x, rr = a.r + b.r;
      if (dx > rr + 1 || dx < -rr - 1) return;
      var dy = b.y - a.y;
      if (dy > rr + 1 || dy < -rr - 1) return;
      var d2 = dx * dx + dy * dy;
      /* two of the same fruit touching: remember them, the game merges them after this frame */
      if (first && a.size === b.size && !a.merging && !b.merging && d2 < (rr + 1) * (rr + 1) && nMerge < merges.length) {
        a.merging = b.merging = true; merges[nMerge].a = a; merges[nMerge].b = b; nMerge++;
      }
      if (d2 >= rr * rr) return;
      var d = Math.sqrt(d2);
      var nx, ny;
      if (d < 1e-6) { nx = 0; ny = 1; d = 0; } else { nx = dx / d; ny = dy / d; }
      var pen = rr - d, wsum = a.inv + b.inv, ka = a.inv / wsum, kb = b.inv / wsum;
      a.x -= nx * pen * ka; a.y -= ny * pen * ka;
      b.x += nx * pen * kb; b.y += ny * pen * kb;
      /* friction: how far did they slide past each other in this tiny step? take some of that back */
      var rx = (b.x - b.px) - (a.x - a.px), ry = (b.y - b.py) - (a.y - a.py);
      var rn = rx * nx + ry * ny, tx = rx - rn * nx, ty = ry - rn * ny, tl = Math.sqrt(tx * tx + ty * ty);
      if (tl > 1e-9) {
        var f = Math.min(1, MU * pen / tl);
        a.x += tx * f * ka; a.y += ty * f * ka;
        b.x -= tx * f * kb; b.y -= ty * f * kb;
      }
      if (ny > 0.3) a.touch = true; else if (ny < -0.3) b.touch = true;
    }
    /* The glass: anything poking through a wall or the floor goes straight back inside. */
    function walls(b) {
      var pen, t;
      if (b.x < b.r) { pen = b.r - b.x; b.x = b.r; t = b.y - b.py; if (t) b.y -= t * Math.min(1, MU_WALL * pen / Math.abs(t)); }
      else if (b.x > width - b.r) { pen = b.x - (width - b.r); b.x = width - b.r; t = b.y - b.py; if (t) b.y -= t * Math.min(1, MU_WALL * pen / Math.abs(t)); }
      if (b.y > floor - b.r) { pen = b.y - (floor - b.r); b.y = floor - b.r; t = b.x - b.px; if (t) b.x -= t * Math.min(1, MU * pen / Math.abs(t)); b.touch = true; }
    }
    function step(dt) {
      var h = dt / SUB, s, k, a, j, n;
      nMerge = 0;
      for (k = 0; k < nLive; k++) live[k].age += dt;
      /* A sleeping jar is perfectly still: nothing moves until something new happens. */
      if (asleep) return;
      for (k = 0; k < nLive; k++) { live[k].lastVy = live[k].vy; live[k].touch = false; }
      for (s = 0; s < SUB; s++) {
        n = nLive;
        for (k = 0; k < n; k++) {
          a = live[k];
          if (a.r < a.R) a.r = Math.min(a.R, a.r + GROW * h);
          a.vy += GRAV * h;
          a.vx *= 1 - DAMP * h; a.vy *= 1 - DAMP * h;
          a.px = a.x; a.py = a.y;
          a.x += a.vx * h; a.y += a.vy * h;
        }
        for (var it = 0; it < ITER; it++) {
          for (k = 0; k < n; k++) for (j = k + 1; j < n; j++) solvePair(live[k], live[j], it === 0);
          for (k = 0; k < n; k++) walls(live[k]);
        }
        for (k = 0; k < n; k++) {
          a = live[k];
          a.vx = (a.x - a.px) / h; a.vy = (a.y - a.py) / h;
          var sp = a.vx * a.vx + a.vy * a.vy;
          if (sp > MAXV * MAXV) { var f = MAXV / Math.sqrt(sp); a.vx *= f; a.vy *= f; }
          if (a.touch) a.angle += (a.x - a.px) / a.r;   /* fruit touching something rolls as it moves sideways */
        }
      }
      var allStill = nLive > 0;
      for (k = 0; k < nLive; k++) {
        a = live[k];
        /* a hard landing makes a fruit squash for a moment (drawing only) */
        var hit = a.lastVy - a.vy;
        if (hit > 260) a.squash = Math.max(a.squash, Math.min(1, hit / 1100));
        a.squash = Math.max(0, a.squash - dt * 5);
        if (a.vx * a.vx + a.vy * a.vy < REST_V * REST_V) a.still += dt; else a.still = 0;
        if (a.still < REST_T || a.squash > 0 || a.r < a.R) allStill = false;
      }
      if (allStill) { asleep = true; for (k = 0; k < nLive; k++) { live[k].vx = 0; live[k].vy = 0; } }
    }
    return {
      bodies: bodies, live: function () { return live; }, count: function () { return nLive; },
      merges: merges, mergeCount: function () { return nMerge; },
      add: add, remove: remove, clear: clear, step: step, width: width, floor: floor,
      sleeping: function () { return asleep; }, wake: function () { asleep = false; }
    };
  }

  /* ---------- small helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seeded(seed) {
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function parseColour(s) {
    s = String(s || '').trim();
    var m;
    if (s.charAt(0) === '#') {
      var x = s.slice(1);
      if (x.length === 3) x = x.split('').map(function (c) { return c + c; }).join('');
      if (x.length >= 6) return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
    }
    if ((m = s.match(/^rgba?\(([^)]+)\)$/i))) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      if (p.length >= 3) return [p[0], p[1], p[2]];
    }
    return [128, 128, 128];
  }
  function rgba(s, a) { var c = parseColour(s); return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }
  function mix(s1, s2, t) {
    var a = parseColour(s1), b = parseColour(s2);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }

  /* ---------- our own fruit drawings (each drawn at the origin, radius r) ---------- */
  var OUTLINE = 'rgba(40, 24, 52, 0.85)';
  var JUICE = ['#ff3d5a', '#ff4f6d', '#9b5de5', '#ff9f1c', '#8ac926', '#ffd60a', '#ffa07a', '#ffc300', '#f4a259', '#b8e07a', '#ff4d6d'];
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }
  function body(c, r, col, dark) {
    circ(c, 0, 0, r); c.fillStyle = col; c.fill();
    c.save(); circ(c, 0, 0, r); c.clip();
    c.fillStyle = dark; c.globalAlpha = 0.28; circ(c, r * 0.3, r * 0.35, r); c.fill(); c.globalAlpha = 1;
    c.restore();
  }
  function outline(c, r) { circ(c, 0, 0, r - 1); c.lineWidth = Math.max(2, r * 0.07); c.strokeStyle = OUTLINE; c.stroke(); }
  function gloss(c, r) { c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(-r * 0.4, -r * 0.45, r * 0.24, r * 0.13, -0.7, 0, Math.PI * 2); c.fill(); }
  function leafAt(c, x, y, s, a) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillStyle = '#4caf50'; c.strokeStyle = OUTLINE; c.lineWidth = Math.max(1.5, s * 0.12);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 0.6, -s * 0.55, s * 1.2, 0); c.quadraticCurveTo(s * 0.6, s * 0.45, 0, 0); c.fill(); c.stroke();
    c.restore();
  }
  function stemAt(c, x, y, len, a) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.strokeStyle = '#6b4a2b'; c.lineWidth = Math.max(2, len * 0.2); c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.25, -len * 0.6, len * 0.15, -len); c.stroke();
    c.restore();
  }
  /* A happy face. Every fruit has one; they are all a bit different. */
  function face(c, r, mood) {
    var ey = -r * 0.02, ex = r * 0.3, es = Math.max(1.6, r * 0.09);
    c.fillStyle = '#2a1d33';
    if (mood === 'wink') {
      circ(c, -ex, ey, es); c.fill();
      c.strokeStyle = '#2a1d33'; c.lineWidth = Math.max(1.5, r * 0.06); c.lineCap = 'round';
      c.beginPath(); c.arc(ex, ey + es * 0.3, es, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    } else { circ(c, -ex, ey, es); c.fill(); circ(c, ex, ey, es); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.9)';
    if (mood !== 'wink') { circ(c, -ex + es * 0.35, ey - es * 0.35, es * 0.35); c.fill(); }
    circ(c, ex + es * 0.35, ey - es * 0.35, es * 0.35); if (mood !== 'wink') c.fill();
    c.fillStyle = 'rgba(255,110,140,0.45)';
    circ(c, -ex * 1.45, ey + r * 0.2, r * 0.11); c.fill(); circ(c, ex * 1.45, ey + r * 0.2, r * 0.11); c.fill();
    c.strokeStyle = '#2a1d33'; c.lineWidth = Math.max(1.5, r * 0.06); c.lineCap = 'round';
    c.beginPath();
    if (mood === 'o') { c.ellipse(0, ey + r * 0.24, r * 0.07, r * 0.09, 0, 0, Math.PI * 2); c.fillStyle = '#2a1d33'; c.fill(); }
    else { c.arc(0, ey + r * 0.12, r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
  }
  var DRAW = [
    function cherry(c, r) {
      stemAt(c, r * 0.1, -r * 0.8, r * 0.9, 0.25);
      body(c, r, '#e8263f', '#7a0014'); outline(c, r); gloss(c, r); face(c, r, 'smile');
      leafAt(c, r * 0.32, -r * 1.55, r * 0.6, -0.3);
    },
    function strawberry(c, r) {
      c.beginPath();
      c.moveTo(0, r * 0.98);
      c.bezierCurveTo(-r * 0.75, r * 0.6, -r * 1.05, -r * 0.2, -r * 0.8, -r * 0.62);
      c.bezierCurveTo(-r * 0.55, -r * 1.0, r * 0.55, -r * 1.0, r * 0.8, -r * 0.62);
      c.bezierCurveTo(r * 1.05, -r * 0.2, r * 0.75, r * 0.6, 0, r * 0.98);
      c.closePath();
      c.fillStyle = '#ff3b5c'; c.fill();
      c.lineWidth = Math.max(2, r * 0.07); c.strokeStyle = OUTLINE; c.stroke();
      c.fillStyle = '#ffe66d';
      var rand = seeded(7);
      for (var i = 0; i < 12; i++) { var a = rand() * 6.28, d = rand() * r * 0.7; c.beginPath(); c.ellipse(Math.cos(a) * d, Math.sin(a) * d * 0.8 + r * 0.15, r * 0.035, r * 0.06, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#3fa34d';
      c.beginPath();
      for (var k = 0; k < 5; k++) { var aa = Math.PI + k * Math.PI / 4; c.lineTo(Math.cos(aa) * r * 0.62, -r * 0.62 + Math.sin(aa) * r * 0.32); c.lineTo(Math.cos(aa + Math.PI / 8) * r * 0.2, -r * 0.7); }
      c.closePath(); c.fill(); c.lineWidth = Math.max(1.5, r * 0.05); c.stroke();
      gloss(c, r); face(c, r * 0.9, 'smile');
    },
    function plum(c, r) {
      body(c, r, '#8e44ad', '#3b0a52'); outline(c, r);
      c.strokeStyle = 'rgba(40,0,60,0.45)'; c.lineWidth = r * 0.06; c.beginPath(); c.moveTo(r * 0.05, -r * 0.92); c.quadraticCurveTo(-r * 0.25, -r * 0.2, -r * 0.05, r * 0.5); c.stroke();
      c.fillStyle = 'rgba(220,200,255,0.25)'; c.beginPath(); c.ellipse(-r * 0.2, -r * 0.3, r * 0.55, r * 0.4, -0.5, 0, Math.PI * 2); c.fill();
      gloss(c, r); face(c, r, 'wink');
    },
    function mandarin(c, r) {
      body(c, r, '#ff9a1f', '#a14c00');
      c.fillStyle = 'rgba(170,80,0,0.35)';
      var rand = seeded(19);
      for (var i = 0; i < 18; i++) { var a = rand() * 6.28, d = rand() * r * 0.85; circ(c, Math.cos(a) * d, Math.sin(a) * d, r * 0.03); c.fill(); }
      outline(c, r); gloss(c, r); face(c, r, 'smile');
      leafAt(c, r * 0.02, -r * 0.92, r * 0.5, -0.5);
    },
    function apple(c, r) {
      stemAt(c, 0, -r * 0.82, r * 0.38, 0.2);
      body(c, r, '#8ad13f', '#2f6b0a'); outline(c, r);
      c.fillStyle = 'rgba(255,90,60,0.28)'; c.beginPath(); c.ellipse(r * 0.35, r * 0.05, r * 0.45, r * 0.55, 0.2, 0, Math.PI * 2); c.fill();
      gloss(c, r); face(c, r, 'smile');
      leafAt(c, r * 0.06, -r * 0.95, r * 0.5, -0.4);
    },
    function lemon(c, r) {
      c.save(); c.scale(1, 0.95);
      c.fillStyle = '#ffd60a';
      c.beginPath(); c.ellipse(r * 0.97, 0, r * 0.12, r * 0.1, 0, 0, Math.PI * 2); c.ellipse(-r * 0.97, 0, r * 0.1, r * 0.09, 0, 0, Math.PI * 2); c.fill();
      c.restore();
      body(c, r, '#ffd60a', '#a07800');
      c.fillStyle = 'rgba(160,110,0,0.25)';
      var rand = seeded(23);
      for (var i = 0; i < 16; i++) { var a = rand() * 6.28, d = rand() * r * 0.8; circ(c, Math.cos(a) * d, Math.sin(a) * d, r * 0.025); c.fill(); }
      outline(c, r); gloss(c, r); face(c, r, 'smile');
    },
    function peach(c, r) {
      body(c, r, '#ffb38a', '#c4552d');
      c.fillStyle = 'rgba(255,80,90,0.4)'; c.beginPath(); c.ellipse(r * 0.3, r * 0.2, r * 0.55, r * 0.62, 0.3, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(180,70,50,0.55)'; c.lineWidth = r * 0.05; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-r * 0.05, -r * 0.9); c.quadraticCurveTo(-r * 0.45, -r * 0.1, -r * 0.2, r * 0.75); c.stroke();
      outline(c, r); gloss(c, r); face(c, r, 'o');
      leafAt(c, -r * 0.02, -r * 0.94, r * 0.45, -0.25);
    },
    function pineapple(c, r) {
      /* crown of spiky leaves */
      c.fillStyle = '#3fa34d'; c.strokeStyle = OUTLINE; c.lineWidth = Math.max(2, r * 0.04);
      for (var k = -2; k <= 2; k++) {
        c.beginPath(); c.moveTo(k * r * 0.14 - r * 0.1, -r * 0.82); c.lineTo(k * r * 0.24, -r * 1.25 + Math.abs(k) * r * 0.1); c.lineTo(k * r * 0.14 + r * 0.1, -r * 0.82); c.closePath(); c.fill(); c.stroke();
      }
      body(c, r, '#ffc300', '#a66b00');
      c.save(); circ(c, 0, 0, r); c.clip();
      c.strokeStyle = 'rgba(150,90,0,0.45)'; c.lineWidth = r * 0.04;
      for (var x = -2 * r; x < 2 * r; x += r * 0.34) { c.beginPath(); c.moveTo(x, -r); c.lineTo(x + 2 * r, r); c.stroke(); c.beginPath(); c.moveTo(x, r); c.lineTo(x + 2 * r, -r); c.stroke(); }
      c.restore();
      outline(c, r); gloss(c, r); face(c, r, 'smile');
    },
    function rockmelon(c, r) {
      body(c, r, '#e9b36b', '#8a5a1e');
      c.save(); circ(c, 0, 0, r); c.clip();
      c.strokeStyle = 'rgba(255,245,220,0.55)'; c.lineWidth = r * 0.025;
      var rand = seeded(41);
      for (var i = 0; i < 26; i++) { var a = rand() * 6.28, d = rand() * r; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, r * (0.12 + rand() * 0.12), rand() * 6, rand() * 6 + 3); c.stroke(); }
      c.restore();
      outline(c, r); gloss(c, r); face(c, r, 'wink');
    },
    function honeydew(c, r) {
      body(c, r, '#c7ea8a', '#5b8a22');
      c.strokeStyle = 'rgba(90,140,40,0.35)'; c.lineWidth = r * 0.025;
      for (var k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(0, 0, Math.abs(k) * r * 0.22 + r * 0.06, r * 0.97, 0, 0, Math.PI * 2); c.stroke(); }
      outline(c, r); gloss(c, r); face(c, r, 'smile');
    },
    function watermelon(c, r) {
      body(c, r, '#2fa84f', '#0b4a1c');
      c.save(); circ(c, 0, 0, r); c.clip();
      c.strokeStyle = '#17692e'; c.lineWidth = r * 0.13; c.lineJoin = 'round';
      for (var k = -3; k <= 3; k++) {
        c.beginPath();
        for (var y = -r; y <= r; y += r * 0.1) { var x = k * r * 0.3 + Math.sin(y / r * 9 + k) * r * 0.04; if (y === -r) c.moveTo(x, y); else c.lineTo(x, y); }
        c.stroke();
      }
      c.restore();
      outline(c, r); gloss(c, r); face(c, r, 'smile');
      stemAt(c, 0, -r * 0.95, r * 0.18, 0.4);
    }
  ];

  GamesInTime.register({
    id: 'melon-drop',
    frame: 'none',
    makeWorld: makeWorld,
    mount: function (root, api) {
      var h = api.h;
      var destroyed = false;
      var reduced = !!api.reducedMotion;
      var best = Number(api.store.get('best', 0)) || 0;
      var biggestEver = Number(api.store.get('biggest', -1));
      if (!(biggestEver >= 0)) biggestEver = -1;

      /* ---------- the page parts ---------- */
      root.appendChild(h('style', null,
        '.game-melon-drop .md-card { max-width: 1060px; margin: 0 auto; padding: 10px; border-radius: 30px; background: linear-gradient(140deg, color-mix(in srgb, var(--cobalt) 45%, var(--surface)) 0%, var(--surface) 45%, color-mix(in srgb, var(--leaf) 30%, var(--surface)) 100%); box-shadow: 0 18px 44px rgba(0, 0, 0, .45); }' +
        '.game-melon-drop .md-stage { position: relative; border-radius: 22px; overflow: hidden; background: var(--bg); }' +
        '.game-melon-drop .md-canvas { display: block; width: 100%; height: 520px; touch-action: auto; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }' +
        '.game-melon-drop .is-playing .md-canvas { touch-action: none; cursor: pointer; }' +
        '.game-melon-drop .md-canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }' +
        '.game-melon-drop .md-overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: 12px; background: color-mix(in srgb, var(--bg) 40%, transparent); }' +
        '.game-melon-drop .md-overlay[hidden] { display: none; }' +
        '.game-melon-drop .md-box { display: grid; gap: .6rem; justify-items: center; text-align: center; max-width: 26rem; max-height: 100%; overflow-y: auto; padding: 1.1rem 1.3rem 1.2rem; border-radius: 26px; background: var(--surface); color: var(--ink); border: 2px solid color-mix(in srgb, var(--cobalt) 45%, transparent); box-shadow: 0 14px 30px rgba(0, 0, 0, .45); }' +
        '.game-melon-drop .md-title { margin: 0; font-family: var(--font-poster); font-weight: 800; letter-spacing: -.02em; font-size: clamp(2rem, 1.4rem + 2.6vw, 3rem); line-height: 1; color: var(--ink); }' +
        '.game-melon-drop .md-title span { color: var(--gold); }' +
        '.game-melon-drop .md-msg { margin: 0; font-weight: 600; line-height: 1.4; }' +
        '.game-melon-drop .md-sub { margin: 0; color: var(--ink-muted); font-size: .92rem; }' +
        '.game-melon-drop .md-sub:empty { display: none; }' +
        '.game-melon-drop .md-btn { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; min-height: 44px; padding: .45rem 1.15rem; border-radius: 999px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); font: 700 1rem var(--font-head); cursor: pointer; touch-action: manipulation; transition: transform .12s, background .12s; }' +
        '.game-melon-drop .md-btn:hover { transform: translateY(-1px); }' +
        '.game-melon-drop .md-btn:active { transform: translateY(1px); }' +
        '.game-melon-drop .md-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }' +
        '.game-melon-drop .md-btn:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }' +
        '.game-melon-drop .md-go { min-height: 54px; padding-inline: 1.9rem; font-size: 1.2rem; border-color: var(--gold); background: var(--gold); color: var(--on-era); box-shadow: 0 5px 0 var(--gold-shadow); }' +
        '.game-melon-drop .md-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .6rem .8rem; margin-top: .8rem; }' +
        '.game-melon-drop .md-tools { display: flex; flex-wrap: wrap; gap: .5rem; }' +
        '.game-melon-drop .md-score { display: flex; flex-wrap: wrap; gap: .3rem 1rem; font-weight: 800; font-variant-numeric: tabular-nums; }' +
        '.game-melon-drop .md-score strong { font-family: var(--font-poster); font-size: 1.2rem; color: var(--gold); }' +
        '.game-melon-drop .md-pad { display: none; gap: .5rem; justify-content: center; margin-top: .7rem; }' +
        '.game-melon-drop .md-pad .md-btn { min-height: 52px; min-width: 64px; font-size: 1.15rem; }' +
        '.game-melon-drop .md-pad .md-drop { flex: 1 1 auto; max-width: 12rem; border-color: var(--gold); }' +
        '@media (pointer: coarse) { .game-melon-drop .md-pad { display: flex; } }' +
        '@media (max-width: 480px) { .game-melon-drop .md-card { padding: 6px; border-radius: 24px; } .game-melon-drop .md-stage { border-radius: 18px; } .game-melon-drop .md-box { padding: .8rem .8rem .9rem; gap: .5rem; } .game-melon-drop .md-msg { font-size: .92rem; } .game-melon-drop .md-go { min-height: 48px; } }'));

      var canvas = h('canvas', { class: 'md-canvas', role: 'img', tabindex: '0', 'aria-label': 'An empty glass jar waits for fruit.' });
      var ovTitle = h('p', { class: 'md-title' }, 'Melon ', h('span', null, 'Drop'));
      var ovMsg = h('p', { class: 'md-msg' }, '');
      var ovSub = h('p', { class: 'md-sub' }, '');
      var ovBtn = h('button', { class: 'md-btn md-go', type: 'button', onclick: function () { overlayAction(); } }, '▶ Start');
      var overlay = h('div', { class: 'md-overlay' }, h('div', { class: 'md-box' }, ovTitle, ovMsg, ovBtn, ovSub));
      var stage = h('div', { class: 'md-stage' }, canvas, overlay);
      var card = h('div', { class: 'md-card' }, stage);
      var pauseBtn = h('button', { class: 'md-btn', type: 'button', disabled: true, onclick: function () { togglePause(); } }, 'Pause');
      var newBtn = h('button', { class: 'md-btn', type: 'button', onclick: function () { newGame(); } }, 'New game');
      var scoreEl = h('strong', null, '0'), bestEl = h('strong', null, String(best)), nextEl = h('strong', null, '');
      var bar = h('div', { class: 'md-bar' },
        h('div', { class: 'md-tools' }, pauseBtn, newBtn),
        h('div', { class: 'md-score' }, h('span', null, 'Score ', scoreEl), h('span', null, 'Next ', nextEl), h('span', null, 'Best ', bestEl)));
      function padBtn(label, text, fn, cls) {
        var b = h('button', { class: 'md-btn' + (cls ? ' ' + cls : ''), type: 'button', 'aria-label': label }, text);
        b.addEventListener('pointerdown', function (e) { e.preventDefault(); api.unlockSound(); fn(true); });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { b.addEventListener(t, function () { fn(false); }); });
        b.addEventListener('click', function (e) { if (e.detail === 0) { fn(true); fn(false); } });
        return b;
      }
      var pad = h('div', { class: 'md-pad', role: 'group', 'aria-label': 'Dropper controls' },
        padBtn('Move left', '◀', function (on) { padLeft = on; }),
        padBtn('Drop', '▼ Drop', function (on) { if (on) drop(); }, 'md-drop'),
        padBtn('Move right', '▶', function (on) { padRight = on; }));
      var note = h('p', { class: 'game-note' }, 'Move the dropper with the mouse, a finger (touch, slide, then let go to drop) or the arrow keys. Click, let go, or press Space or Down to drop. P pauses.');
      root.appendChild(card);
      root.appendChild(pad);
      root.appendChild(bar);
      root.appendChild(note);

      var ctx = canvas.getContext('2d');
      var bgCanvas = document.createElement('canvas');
      var W = 600, H = 520, dpr = 1, S = 1, WW = NARROW_W, wide = false, jx = 24, jy = TOP;
      var C = {}, FONT = 'sans-serif';
      var sprites = [], icons = [];

      function readColours() {
        var cs = getComputedStyle(root);
        function v(n, fb) { var s = cs.getPropertyValue(n).trim(); return s || fb; }
        C.bg = v('--bg', '#0f1115'); C.bg2 = v('--bg-2', C.bg); C.surface = v('--surface', '#1c2027'); C.surface2 = v('--surface-2', C.surface);
        C.ink = v('--ink', '#f5f5f5'); C.muted = v('--ink-muted', C.ink); C.faint = v('--ink-faint', C.muted);
        C.gold = v('--gold', '#6aaa64'); C.straw = v('--straw', '#c9b458'); C.cobalt = v('--cobalt', '#b18cff'); C.peacock = v('--peacock', '#4fe3c1');
        C.rose = v('--rose', '#ff7a9c'); C.vermilion = v('--vermilion', '#ff7a59'); C.red = v('--red', '#ff6b6b'); C.onEra = v('--on-era', '#0c1a0b');
        FONT = (cs.getPropertyValue('--font-poster').trim() || 'system-ui, sans-serif');
      }

      /* ---------- game state ---------- */
      var world = makeWorld(JW, JH, RADII);
      var state = 'idle';       /* idle | playing | paused | over */
      var score = 0, aimX = JW / 2, current = 0, next = 0, holdT = 0, dangerT = 0, biggest = -1, chain = 0, chainT = 0, melonMade = false;
      var pointerDown = false, pointerId = null, keyLeft = false, keyRight = false, padLeft = false, padRight = false;
      var acc = 0, lastT = 0, rafId = 0, dataTick = 0, statusAt = 0, statusDirty = false, tickT = 0, lastLanding = 0;
      var NFX = 90, NRING = 10, NFLOAT = 6;
      var fx = [], rings = [], floats = [], fxNext = 0, ringNext = 0, floatNext = 0, i0;
      for (i0 = 0; i0 < NFX; i0++) fx.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 3, age: 0, life: 1, col: '' });
      for (i0 = 0; i0 < NRING; i0++) rings.push({ on: false, x: 0, y: 0, r: 10, age: 0, col: '' });
      for (i0 = 0; i0 < NFLOAT; i0++) floats.push({ on: false, x: 0, y: 0, text: '', age: 0, size: 24, col: '' });
      function rnd() { return api.random(); }
      /* api.tone plays one synthesised note; older copies of the site may not have it */
      function tone(f, d, t, v) { if (typeof api.tone === 'function') api.tone(f, d, t, v); }
      function pickDrop() {
        var t = rnd(), sum = 0;
        for (var i = 0; i < DROPPABLE.length; i++) { sum += DROPPABLE[i]; if (t < sum) return i; }
        return 0;
      }

      /* ---------- layout ---------- */
      function resize() {
        var w = Math.max(240, Math.round(stage.clientWidth || 600));
        var vh = window.innerHeight || 800;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        var hh = Math.round(clamp(vh - 190, 480, 800));
        S = hh / WORLD_H;
        wide = w / S >= NARROW_W + 2 * 230;
        if (!wide) { S = w / NARROW_W; hh = Math.round(WORLD_H * S); }
        W = w; H = hh; WW = W / S;
        jx = (WW - JW) / 2; jy = TOP;
        canvas.style.height = hh + 'px';
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr);
        readColours();
        buildSprites();
        buildBackground();
        draw(performance.now());
        if (!overlay.hidden) fitCard();
      }
      /* Each fruit is painted once into a little canvas at the right size; every frame just copies them. */
      function buildSprites() {
        sprites = []; icons = [];
        var k = S * dpr;
        FRUIT.forEach(function (f, i) {
          sprites.push(paint(f.r, i, k));
          icons.push(paint(15, i, k));
        });
      }
      function paint(r, i, k) {
        var pad = r * 0.7 + 6, size = Math.ceil((r + pad) * 2 * k);
        var cv = document.createElement('canvas');
        cv.width = size; cv.height = size;
        var c = cv.getContext('2d');
        c.setTransform(k, 0, 0, k, size / 2, size / 2);
        DRAW[i](c, r);
        return { cv: cv, u: size / k };
      }
      /* The kitchen: a soft lilac evening wall with bubbles, a shelf under the jar, and the empty glass jar. */
      function buildBackground() {
        bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;
        var b = bgCanvas.getContext('2d');
        b.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
        var g = b.createLinearGradient(0, 0, 0, WORLD_H);
        g.addColorStop(0, mix(C.bg, C.cobalt, 0.28)); g.addColorStop(0.7, mix(C.bg, C.cobalt, 0.12)); g.addColorStop(1, C.bg);
        b.fillStyle = g; b.fillRect(0, 0, WW, WORLD_H);
        var rand = seeded(2021), cols = [C.cobalt, C.gold, C.straw, C.peacock, C.rose];
        for (var i = 0; i < 30; i++) {
          var bx = rand() * WW, by = rand() * WORLD_H * 0.85, br = 8 + rand() * 46;
          b.fillStyle = rgba(cols[i % cols.length], 0.06 + rand() * 0.07);
          if (bx + br > jx - 20 && bx - br < jx + JW + 20) continue;   /* keep bubbles out of the jar, so they never look like fruit */
          circ(b, bx, by, br); b.fill();
        }
        /* the shelf */
        var sy = jy + JH + 14;
        b.fillStyle = mix(C.surface2, C.straw, 0.22); b.fillRect(0, sy, WW, WORLD_H - sy);
        b.fillStyle = rgba(C.ink, 0.12); b.fillRect(0, sy, WW, 4);
        /* the jar: glass walls outside the space the fruit can use */
        var t = 12, rad = 22;
        b.fillStyle = rgba(C.ink, 0.05);
        roundRect(b, jx, jy - 20, JW, JH + 20, 14); b.fill();
        b.lineWidth = t; b.strokeStyle = rgba(C.ink, 0.22); b.lineJoin = 'round';
        b.beginPath(); b.moveTo(jx - t / 2, jy - 26); b.lineTo(jx - t / 2, jy + JH + t / 2 - rad); b.arcTo(jx - t / 2, jy + JH + t / 2, jx - t / 2 + rad, jy + JH + t / 2, rad);
        b.lineTo(jx + JW + t / 2 - rad, jy + JH + t / 2); b.arcTo(jx + JW + t / 2, jy + JH + t / 2, jx + JW + t / 2, jy + JH + t / 2 - rad, rad); b.lineTo(jx + JW + t / 2, jy - 26); b.stroke();
        b.lineWidth = 2.5; b.strokeStyle = rgba(C.ink, 0.6);
        b.stroke();
        /* rims at the top of the glass */
        b.fillStyle = rgba(C.ink, 0.55);
        roundRect(b, jx - t - 4, jy - 34, t + 8, 10, 5); b.fill();
        roundRect(b, jx + JW - 4, jy - 34, t + 8, 10, 5); b.fill();
        /* a long shine down the glass */
        b.fillStyle = rgba(C.ink, 0.12); roundRect(b, jx + 10, jy + 20, 10, JH - 60, 5); b.fill();
        b.fillStyle = rgba(C.ink, 0.07); roundRect(b, jx + JW - 26, jy + 40, 6, JH * 0.4, 3); b.fill();
        /* the rail the dropper slides on */
        b.fillStyle = rgba(C.ink, 0.18); roundRect(b, jx - 6, jy + DROP_Y - 62, JW + 12, 8, 4); b.fill();
        /* the fruit ladder under the jar */
        var ly = jy + JH + 50;
        b.fillStyle = rgba(C.bg, 0.35); roundRect(b, jx - 18, ly - 26, JW + 36, 52, 26); b.fill();
        if (wide) {
          b.fillStyle = rgba(C.ink, 0.7); b.font = '700 17px ' + FONT; b.textAlign = 'center'; b.textBaseline = 'middle';
          var gx = jx + JW + 150;
          b.fillText('Two the same', gx, jy + 230); b.fillText('make the next', gx, jy + 254); b.fillText('one up!', gx, jy + 278);
          b.fillText('Keep fruit below', gx, jy + 330); b.fillText('the dashed line.', gx, jy + 354);
        }
      }
      function roundRect(c, x, y, w, hh, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

      /* ---------- drawing ---------- */
      function sprite(i, x, y, angle, squash, alpha, scale) {
        var sp = sprites[i];
        ctx.save(); ctx.translate(x, y);
        if (scale) ctx.scale(scale, scale);
        if (squash > 0 && !reduced) ctx.scale(1 + squash * 0.12, 1 - squash * 0.12);
        if (angle) ctx.rotate(angle);
        if (alpha != null) ctx.globalAlpha = alpha;
        ctx.drawImage(sp.cv, -sp.u / 2, -sp.u / 2, sp.u, sp.u);
        ctx.restore();
      }
      function text(t, x, y, size, col, align, weight) {
        ctx.font = (weight || 800) + ' ' + size + 'px ' + FONT; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = col; ctx.fillText(t, x, y);
      }
      var hudScore = '0', hudBest = '0';
      function draw(now) {
        if (destroyed || !W) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(bgCanvas, 0, 0);
        ctx.setTransform(S * dpr, 0, 0, S * dpr, 0, 0);
        var live = world.live(), n = world.count(), i;
        var danger = dangerT > 0.05;
        /* the "too full" line */
        var flash = danger && !reduced ? 0.55 + 0.45 * Math.sin(now / 90) : 1;
        ctx.save();
        ctx.setLineDash([12, 9]); ctx.lineWidth = danger ? 4 : 2.5;
        ctx.strokeStyle = danger ? rgba(C.red, flash) : rgba(C.ink, 0.35);
        ctx.beginPath(); ctx.moveTo(jx + 2, jy + LINE_Y); ctx.lineTo(jx + JW - 2, jy + LINE_Y); ctx.stroke();
        ctx.restore();
        if (danger) text('Too full! ' + Math.max(0, Math.ceil(DANGER_TIME - dangerT)), jx + JW / 2, jy + LINE_Y - 16, 18, C.red);
        /* the aiming line and the dropper */
        var holding = state === 'playing' && holdT <= 0, cr = RADII[current];
        var ax = jx + clamp(aimX, cr, JW - cr);
        if (state === 'playing' || state === 'paused') {
          ctx.strokeStyle = rgba(C.ink, 0.22); ctx.lineWidth = 2; ctx.setLineDash([3, 9]);
          ctx.beginPath(); ctx.moveTo(ax, jy + DROP_Y + cr); ctx.lineTo(ax, jy + JH); ctx.stroke(); ctx.setLineDash([]);
        }
        var railY = jy + DROP_Y - 58;
        ctx.fillStyle = C.cobalt; roundRect(ctx, ax - 22, railY - 9, 44, 18, 9); ctx.fill();
        ctx.fillStyle = rgba(C.ink, 0.35); roundRect(ctx, ax - 16, railY - 6, 32, 5, 2.5); ctx.fill();
        if (holding || state === 'idle' || state === 'paused') {
          ctx.strokeStyle = rgba(C.ink, 0.6); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(ax, railY + 9); ctx.lineTo(ax, jy + DROP_Y - cr); ctx.stroke();
          sprite(current, ax, jy + DROP_Y, 0, 0, state === 'idle' ? 0.9 : 1);
        }
        /* the fruit in the jar */
        for (i = 0; i < n; i++) { var b = live[i]; sprite(b.size, jx + b.x, jy + b.y, b.angle, b.squash, null); }
        /* pops and juice */
        for (i = 0; i < NRING; i++) {
          var rg = rings[i]; if (!rg.on) continue;
          var k = rg.age / 0.45;
          ctx.globalAlpha = 1 - k; ctx.strokeStyle = rg.col; ctx.lineWidth = 6 * (1 - k) + 1;
          circ(ctx, jx + rg.x, jy + rg.y, rg.r * (1 + k * 0.6)); ctx.stroke();
        }
        for (i = 0; i < NFX; i++) {
          var p = fx[i]; if (!p.on) continue;
          ctx.globalAlpha = 1 - p.age / p.life; ctx.fillStyle = p.col;
          circ(ctx, jx + p.x, jy + p.y, p.r); ctx.fill();
        }
        ctx.globalAlpha = 1;
        for (i = 0; i < NFLOAT; i++) {
          var f = floats[i]; if (!f.on) continue;
          var q = f.age / 1;
          ctx.globalAlpha = 1 - q * q;
          ctx.font = '800 ' + f.size + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = f.size * 0.18; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(C.bg, 0.8);
          var fy = jy + f.y - (reduced ? 0 : q * 36);
          ctx.strokeText(f.text, jx + f.x, fy); ctx.fillStyle = f.col; ctx.fillText(f.text, jx + f.x, fy);
        }
        ctx.globalAlpha = 1;
        drawHud();
      }
      function drawHud() {
        var nx, ny;
        if (wide) {
          var lx = jx - 150;
          text('SCORE', lx, jy + 40, 16, C.muted, 'center', 700);
          text(hudScore, lx, jy + 86, 56, C.gold);
          text('BEST', lx, jy + 150, 14, C.muted, 'center', 700);
          text(hudBest, lx, jy + 178, 28, C.ink);
          nx = jx + JW + 150; ny = jy + 110;
          text('NEXT', nx, jy + 40, 16, C.muted, 'center', 700);
        } else {
          text('SCORE', 26, 14, 14, C.muted, 'left', 700);
          text(hudScore, 24, 40, 36, C.gold, 'left');
          text('BEST ' + hudBest, 26, 64, 14, C.muted, 'left', 700);
          nx = WW - 52; ny = 40;
          text('NEXT', nx - 46, ny, 14, C.muted, 'right', 700);
        }
        ctx.fillStyle = rgba(C.bg, 0.4); circ(ctx, nx, ny, wide ? 44 : 34); ctx.fill();
        ctx.strokeStyle = rgba(C.ink, 0.2); ctx.lineWidth = 2; ctx.stroke();
        if (state !== 'idle') sprite(next, nx, ny, 0, 0, null, Math.min(1, (wide ? 38 : 29) / RADII[next]));
        /* the fruit ladder: every fruit from cherry to watermelon; the ones you have made glow */
        var ly = jy + JH + 50, step = (JW + 12) / 11;
        for (var i = 0; i < 11; i++) {
          var x = jx - 6 + step * (i + 0.5), got = i <= biggest;
          var ic = icons[i];
          ctx.globalAlpha = got ? 1 : 0.32;
          ctx.drawImage(ic.cv, x - ic.u / 2, ly - ic.u / 2, ic.u, ic.u);
          if (i === biggestEver && biggestEver > biggest) { ctx.globalAlpha = 0.9; text('★', x + 13, ly - 15, 12, C.straw); }
        }
        ctx.globalAlpha = 1;
        if (biggest >= 0) { ctx.fillStyle = C.gold; roundRect(ctx, jx - 6 + step * 0.2, ly + 18, step * (biggest + 0.6), 4, 2); ctx.fill(); }
      }

      /* ---------- effects ---------- */
      function burst(x, y, col, n, speed) {
        for (var i = 0; i < (reduced ? Math.min(6, n) : n); i++) {
          var p = fx[fxNext]; fxNext = (fxNext + 1) % NFX;
          var a = rnd() * 6.28, s = speed * (0.4 + rnd() * 0.8);
          p.on = true; p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - 120; p.r = 2.5 + rnd() * 4; p.age = 0; p.life = 0.4 + rnd() * 0.4; p.col = col;
        }
      }
      function ring(x, y, r, col) { var g = rings[ringNext]; ringNext = (ringNext + 1) % NRING; g.on = true; g.x = x; g.y = y; g.r = r; g.age = 0; g.col = col; }
      function floatText(t, x, y, size, col) { var f = floats[floatNext]; floatNext = (floatNext + 1) % NFLOAT; f.on = true; f.text = t; f.x = clamp(x, 60, JW - 60); f.y = y; f.age = 0; f.size = size; f.col = col; }
      function updateFx(dt) {
        var i;
        for (i = 0; i < NFX; i++) { var p = fx[i]; if (!p.on) continue; p.age += dt; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.age >= p.life) p.on = false; }
        for (i = 0; i < NRING; i++) { var g = rings[i]; if (!g.on) continue; g.age += dt; if (g.age >= 0.45) g.on = false; }
        for (i = 0; i < NFLOAT; i++) { var f = floats[i]; if (!f.on) continue; f.age += dt; if (f.age >= 1) f.on = false; }
      }

      /* ---------- one frame of play ---------- */
      function frame(now) {
        rafId = 0;
        if (destroyed) return;
        var dt = Math.min(0.1, Math.max(0, (now - lastT) / 1000));
        lastT = now;
        if (state === 'playing') {
          /* keys and the on-screen pad slide the dropper */
          var dir = (keyRight || padRight ? 1 : 0) - (keyLeft || padLeft ? 1 : 0);
          if (dir) aimX = clamp(aimX + dir * 360 * dt, 0, JW);
          if (holdT > 0) holdT -= dt;
          acc += dt;
          var steps = 0;
          while (acc >= 1 / 60 && steps < 4) { tick(1 / 60); acc -= 1 / 60; steps++; if (state !== 'playing') break; }
          if (steps === 4) acc = 0;
          if (++dataTick % 4 === 0) syncData();
          if (statusDirty && now - statusAt > 900) { statusAt = now; statusDirty = false; api.status(statusLine()); }
        } else if (state === 'over') {
          acc += dt;
          while (acc >= 1 / 60) { world.step(1 / 60); acc -= 1 / 60; }
        }
        updateFx(dt);
        draw(now);
        if (wantLoop()) rafId = requestAnimationFrame(frame);
      }
      function tick(dt) {
        world.step(dt);
        doMerges();
        landingSounds();
        /* is anything resting above the line? */
        var live = world.live(), n = world.count(), above = false;
        for (var i = 0; i < n; i++) { var b = live[i]; if (b.age > 1.2 && !b.merging && b.y - b.r < LINE_Y) { above = true; break; } }
        if (above) {
          if (dangerT === 0) api.status('Careful! The jar is too full. Merge some fruit quickly.');
          dangerT += dt;
          tickT -= dt;
          if (tickT <= 0) { tickT = 0.5; api.sound('tick'); }
          if (dangerT >= DANGER_TIME) gameOver();
        } else if (dangerT > 0) { dangerT = Math.max(0, dangerT - dt * 2); if (dangerT === 0) statusDirty = true; }
        if (chainT > 0) { chainT -= dt; if (chainT <= 0) chain = 0; }
      }
      function landingSounds() {
        var live = world.live(), n = world.count(), now = performance.now();
        for (var i = 0; i < n; i++) {
          var b = live[i];
          if (b.squash > 0.35 && now - lastLanding > 90) { lastLanding = now; tone(150 + (10 - b.size) * 18, 0.07, 'sine', 0.06); break; }
        }
      }
      /* Two the same touched: swap them for the next fruit up, halfway between them. */
      function doMerges() {
        var m = world.mergeCount();
        for (var i = 0; i < m; i++) {
          var a = world.merges[i].a, b = world.merges[i].b;
          if (!a.on || !b.on) continue;
          var size = a.size, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, vx = (a.vx + b.vx) / 2, vy = (a.vy + b.vy) / 2, age = Math.max(a.age, b.age);
          world.remove(a); world.remove(b);
          chain++; chainT = 0.8;
          var made = size + 1, pts;
          if (size === FRUIT.length - 1) {
            pts = MELON_PAIR;
            ring(mx, my, RADII[size] * 1.3, JUICE[size]); ring(mx, my, RADII[size] * 0.8, C.straw);
            burst(mx, my, JUICE[size], 40, 520);
            floatText('Melon party! +' + pts, mx, my, 34, C.straw);
            api.sound('win');
            api.announce('Two watermelons! Melon party, plus ' + pts + ' points.');
          } else {
            pts = POINTS[made];
            var nb = world.add(mx, my, made, RADII[size]);
            if (nb) { nb.vx = vx * 0.5; nb.vy = Math.min(vy * 0.5, 0) - 40; nb.age = age; }
            ring(mx, my, RADII[made], JUICE[made]);
            burst(mx, my, JUICE[size], 8 + made * 2, 200 + made * 30);
            floatText('+' + pts + (chain > 1 ? '  chain ×' + chain : ''), mx, my - RADII[made] - 6, made >= 6 ? 30 : 22, chain > 1 ? C.straw : C.ink);
            api.sound('pop');
            tone(330 * Math.pow(2, (made + chain - 1) / 7), 0.14, 'triangle', 0.08);
            if (made > biggest) {
              biggest = made;
              if (made >= 5) api.announce('You made ' + aFruit(made) + '!');
              if (made > biggestEver) { biggestEver = made; api.store.set('biggest', made); }
              if (made === FRUIT.length - 1 && !melonMade) { melonMade = true; api.celebrate('You grew a watermelon!'); }
            }
          }
          score += pts;
          hudScore = String(score); scoreEl.textContent = hudScore;
          statusDirty = true;
        }
      }
      function statusLine() {
        return 'Score ' + score + ' · holding ' + aFruit(current) + ', next ' + aFruit(next) + '.';
      }

      /* ---------- dropping ---------- */
      function drop() {
        if (state !== 'playing' || holdT > 0) return;
        api.unlockSound();
        var r = RADII[current], x = clamp(aimX, r, JW - r);
        var b = world.add(x, DROP_Y, current);
        if (!b) return;
        b.vy = 60;
        if (current > biggest) biggest = current;
        api.sound('click');
        current = next; next = pickDrop();
        holdT = 0.5;
        nextEl.textContent = FRUIT[next].name;
        statusDirty = true;
        canvas.setAttribute('aria-label', 'A glass jar with ' + world.count() + ' fruit. You are holding ' + aFruit(current) + '. The biggest so far is ' + aFruit(Math.max(0, biggest)) + '.');
        syncData();
      }

      /* ---------- game flow ---------- */
      function wantLoop() {
        if (destroyed || document.hidden) return false;
        if (state === 'playing') return true;
        for (var i = 0; i < NFX; i++) if (fx[i].on) return true;
        for (i = 0; i < NRING; i++) if (rings[i].on) return true;
        for (i = 0; i < NFLOAT; i++) if (floats[i].on) return true;
        return state === 'over' && overSettleT-- > 0;
      }
      var overSettleT = 0;
      function startLoop() { if (!rafId && !destroyed && !document.hidden) { lastT = performance.now(); rafId = requestAnimationFrame(frame); } }
      function stopLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }
      function clearFx() { var i; for (i = 0; i < NFX; i++) fx[i].on = false; for (i = 0; i < NRING; i++) rings[i].on = false; for (i = 0; i < NFLOAT; i++) floats[i].on = false; }
      function reset() {
        world.clear(); clearFx();
        score = 0; dangerT = 0; biggest = -1; chain = 0; chainT = 0; holdT = 0; acc = 0; melonMade = false; statusDirty = false;
        current = pickDrop(); next = pickDrop(); aimX = JW / 2;
        hudScore = '0'; scoreEl.textContent = '0'; nextEl.textContent = FRUIT[next].name;
        hudBest = String(best); bestEl.textContent = hudBest;
      }
      function newGame() {
        stopLoop();
        reset();
        state = 'idle';
        setPlaying(false);
        pauseBtn.disabled = true; pauseBtn.textContent = 'Pause';
        ovTitle.replaceChildren('Melon ', h('span', null, 'Drop'));
        ovMsg.textContent = 'Drop fruit into the jar. Two the same that touch squash into the next fruit up. Can you grow a watermelon?';
        ovSub.textContent = best ? 'Best score: ' + best : 'Keep the fruit below the dashed line.';
        ovBtn.textContent = '▶ Start';
        overlay.hidden = false;
        fitCard();
        api.status('Press Start, then drop fruit into the jar.');
        canvas.setAttribute('aria-label', 'An empty glass jar waits for fruit.');
        syncData();
        draw(performance.now());
      }
      function start() {
        api.unlockSound();
        stopLoop();
        reset();
        state = 'playing';
        overlay.hidden = true;
        pauseBtn.disabled = false; pauseBtn.textContent = 'Pause';
        setPlaying(true);
        api.sound('whoosh');
        api.status('Move the dropper and drop. You are holding ' + aFruit(current) + '.');
        canvas.setAttribute('aria-label', 'An empty glass jar. You are holding ' + aFruit(current) + ' above it.');
        focusGame();
        syncData();
        startLoop();
      }
      function gameOver() {
        state = 'over';
        overSettleT = 90;
        setPlaying(false);
        pauseBtn.disabled = true;
        var isBest = score > best;
        if (isBest) { best = score; api.store.set('best', best); }
        hudBest = String(best); bestEl.textContent = hudBest;
        ovTitle.textContent = isBest ? 'New best!' : 'Jar full!';
        ovMsg.textContent = 'You scored ' + score + (biggest >= 0 ? ' and grew ' + aFruit(biggest) + '.' : '.') + (isBest ? ' That is your best yet!' : ' Big fruit need room: keep small ones together.');
        ovSub.textContent = 'Best score: ' + best;
        ovBtn.textContent = '▶ Play again';
        overlay.hidden = false;
        fitCard();
        api.status('The jar is full. You scored ' + score + '.' + (isBest ? ' A new best!' : ' Best: ' + best + '.') + ' Press Play again.');
        canvas.setAttribute('aria-label', 'The jar is full to the top. You scored ' + score + '.');
        if (isBest && score > 0) api.celebrate('New best: ' + score + '!'); else api.sound('lose');
        syncData();
        /* keyboard players land on the Play again button */
        if (document.activeElement === canvas) { try { ovBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      }
      function overlayAction() { if (state === 'paused') resume(); else start(); }
      function togglePause() { if (state === 'playing') pause(); else if (state === 'paused') resume(); }
      function pause() {
        if (state !== 'playing') return;
        state = 'paused';
        stopLoop();
        setPlaying(false);
        pointerDown = false; keyLeft = keyRight = padLeft = padRight = false;
        pauseBtn.textContent = 'Resume';
        ovTitle.textContent = 'Paused';
        ovMsg.textContent = 'The fruit are having a rest.';
        ovSub.textContent = 'Score so far: ' + score;
        ovBtn.textContent = '▶ Resume';
        overlay.hidden = false;
        fitCard();
        api.status('Paused. Score ' + score + '. Press Resume.');
        syncData();
        draw(performance.now());
      }
      function resume() {
        if (state !== 'paused') return;
        state = 'playing';
        overlay.hidden = true;
        pauseBtn.textContent = 'Pause';
        setPlaying(true);
        api.status(statusLine());
        focusGame();
        syncData();
        startLoop();
      }
      function fitCard() {
        ovMsg.hidden = false;
        var box = ovMsg.parentNode;
        if (box && box.scrollHeight > box.clientHeight + 1) ovMsg.hidden = true;
      }
      function setPlaying(on) { card.classList.toggle('is-playing', !!on); }
      function focusGame() { try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      /* Read-only numbers for the automated test. */
      function syncData() {
        var d = canvas.dataset, live = world.live(), n = world.count(), maxV = 0;
        for (var i = 0; i < n; i++) { var v = Math.abs(live[i].vx) + Math.abs(live[i].vy); if (v > maxV) maxV = v; }
        d.state = state; d.score = String(score); d.count = String(n); d.maxv = maxV.toFixed(1); d.danger = dangerT.toFixed(2);
        d.aim = aimX.toFixed(0); d.current = String(current); d.biggest = String(biggest); d.ready = String(holdT <= 0);
        d.jar = [((jx) * S).toFixed(1), ((jy) * S).toFixed(1), (JW * S).toFixed(1), S.toFixed(4)].join(',');
      }

      /* ---------- input ---------- */
      function jarX(e) { var r = canvas.getBoundingClientRect(); return (e.clientX - r.left) / S - jx; }
      function onMove(e) {
        if (state !== 'playing') return;
        if (e.pointerType === 'mouse' || pointerDown) {
          if (pointerDown && e.pointerId !== pointerId) return;
          aimX = clamp(jarX(e), 0, JW);
          if (!rafId) startLoop();
        }
      }
      function onDown(e) {
        if (state !== 'playing') return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (pointerDown) return;
        e.preventDefault();
        api.unlockSound();
        pointerDown = true; pointerId = e.pointerId;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        aimX = clamp(jarX(e), 0, JW);
      }
      function onUp(e) {
        if (!pointerDown || e.pointerId !== pointerId) return;
        pointerDown = false; pointerId = null;
        if (e.type === 'pointerup') { aimX = clamp(jarX(e), 0, JW); drop(); }
      }
      function onKeyDown(e) {
        if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
        var tgt = e.target, k = e.key;
        if (tgt && tgt.closest && tgt.closest('input, select, textarea')) return;
        if ((k === 'p' || k === 'P' || k === 'Escape') && (state === 'playing' || state === 'paused')) { e.preventDefault(); togglePause(); return; }
        if (state !== 'playing') return;
        var onButton = tgt && tgt !== canvas && tgt.closest && tgt.closest('button, a, summary');
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); keyLeft = true; }
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); keyRight = true; }
        else if (k === ' ' || k === 'Spacebar' || k === 'ArrowDown' || k === 's' || k === 'S' || (k === 'Enter' && !onButton)) {
          if (onButton && k !== 'ArrowDown') return;
          e.preventDefault();
          if (!e.repeat) drop();
        }
      }
      function onKeyUp(e) {
        var k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') keyLeft = false;
        if (k === 'ArrowRight' || k === 'd' || k === 'D') keyRight = false;
      }
      function onBlur() { keyLeft = keyRight = padLeft = padRight = false; }
      function onVisibility() {
        if (document.hidden) { if (state === 'playing') pause(); stopLoop(); }
        else draw(performance.now());
      }
      function noMenu(e) { e.preventDefault(); }
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('contextmenu', noMenu);
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('blur', onBlur);

      var lastW = 0, lastDpr = 0, lastVh = 0;
      function maybeResize() {
        var w = Math.round(stage.clientWidth), r = Math.min(2, window.devicePixelRatio || 1), vh = window.innerHeight;
        if (w && (w !== lastW || r !== lastDpr || Math.abs(vh - lastVh) > 80)) { lastW = w; lastDpr = r; lastVh = vh; resize(); }
      }
      var ro = typeof ResizeObserver === 'function' ? new ResizeObserver(maybeResize) : null;
      if (ro) ro.observe(stage);
      window.addEventListener('resize', maybeResize);

      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!destroyed && W) { readColours(); buildBackground(); draw(performance.now()); } }, function () {});
      readColours();
      reset();
      maybeResize();
      newGame();

      return {
        destroy: function () {
          destroyed = true;
          stopLoop();
          if (ro) ro.disconnect();
          window.removeEventListener('resize', maybeResize);
          window.removeEventListener('blur', onBlur);
          document.removeEventListener('keydown', onKeyDown);
          document.removeEventListener('keyup', onKeyUp);
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }
  });
})();
