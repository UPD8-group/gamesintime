/* Marbles (Ring Taw) for Games in Time.

   Seen from above: a chalk ring on packed earth with thirteen marbles in a cross. You and the computer take
   turns to flick a big "taw" from the edge of the ring. Every marble knocked right over the chalk line is won.
   The rules are Ring Taw as Alice Gomme described it in 1898 (see docs/game-notes/marbles.json):
     - lag first: each player bowls at a line, and the closer marble shoots first;
     - knock a marble out of the ring and you shoot again, from anywhere on the edge;
     - knock nothing out and the other player shoots;
     - if your taw stops inside the ring you are "fat": every marble you won this turn goes back in the ring,
       and the other player shoots.
   First to win more than half the marbles (7 of 13) wins.

   How the file is organised:
     Part 1  Physics. Marbles skid, grip, roll and click off each other. Plain functions on plain objects, so
             the computer can copy the ring and try a shot in its head before it plays.
     Part 2  The computer player.
     Part 3  Glass: marbles whose swirls really roll, drawn from a 3D rotation.
     Part 4  The game: layout, drawing, turns and rules, pointer and keyboard.
   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  /* World units: the chalk ring has a radius of 100. The marbles are drawn bigger than life so a kid
     at the back of a classroom can see them. */
  var RING = 100;
  var R_MARBLE = 6.4, R_TAW = 8.4;
  var TAW_WEIGHT = 1.5;            /* a taw is an "alley", heavier than the marbles it hits, so it rolls on after a hit */
  var GAP = 17;                    /* distance between neighbouring marbles in the cross */
  var TARGETS = 13, TO_WIN = 7;    /* more than half of 13 */
  var ROLL = 105;                  /* rolling resistance: how fast a rolling marble slows down */
  var SLIDE = 900;                 /* friction while a struck marble skids, before it grips and rolls */
  var BOUNCE = 0.92;               /* glass on glass is springy */
  var MAX_SPEED = 345;             /* a full-power flick */
  var STEP = 1 / 240;              /* physics time step, in seconds */
  var REST = 1.5;                  /* slower than this counts as stopped */
  var LAG_LINE = -72;              /* the lag line: a chalk chord across the top of the ring */
  var LAG_FROM = 100;              /* lag shots are bowled from the bottom of the ring */
  var KERB = 111;                  /* in the lag, a taw that rolls this far from the middle hits the kerb and stops */
  var THINK_MS = 350;              /* the computer's pause before it acts */
  /* How much the computer's hand wobbles (aim in radians, power as a fraction), tuned by playing
     thousands of shots offline: about 4 in 10 of its shots knock a marble out on Easy, 6 in 10 on
     Medium and 3 in 4 on Hard. "pick" is how many of its best ideas it chooses between. */
  var LEVELS = {
    easy: { label: 'Easy', aim: 0.24, power: 0.32, pick: 4, lag: 0.18 },
    medium: { label: 'Medium', aim: 0.14, power: 0.22, pick: 2, lag: 0.1 },
    hard: { label: 'Hard', aim: 0.085, power: 0.14, pick: 1, lag: 0.05 }
  };

  /* =====================================================================
     PART 1: PHYSICS
     Each marble has a velocity (vx, vy) and a spin, stored as the speed its surface turns at (wx, wy).
     When the two match, the marble rolls. When they do not, it skids, and friction pulls them together:
     a marble hit from rest skids, then grips and rolls on at 5/7 of the speed. A taw that hits a marble
     full on keeps its spin and rolls on after it, the way a real one does.
     ===================================================================== */
  function makeBall(x, y, r, kind) {
    return { x: x, y: y, vx: 0, vy: 0, wx: 0, wy: 0, r: r, m: r * r * r * (kind === 'taw' ? TAW_WEIGHT : 1), kind: kind, live: true };
  }
  function speedOf(b) { return Math.sqrt(b.vx * b.vx + b.vy * b.vy); }
  function isMoving(b) {
    return b.vx * b.vx + b.vy * b.vy > REST * REST || b.wx * b.wx + b.wy * b.wy > REST * REST;
  }
  function integrate(b, dt) {
    var sx = b.vx - b.wx, sy = b.vy - b.wy, slip = Math.sqrt(sx * sx + sy * sy);
    if (slip > 0.5) {
      var dv = SLIDE * dt;
      if (3.5 * dv >= slip) {
        /* friction has caught up: from now on it rolls */
        var rx = (5 * b.vx + 2 * b.wx) / 7, ry = (5 * b.vy + 2 * b.wy) / 7;
        b.vx = b.wx = rx; b.vy = b.wy = ry;
      } else {
        var ux = sx / slip, uy = sy / slip;
        b.vx -= ux * dv; b.vy -= uy * dv;
        b.wx += 2.5 * ux * dv; b.wy += 2.5 * uy * dv;
      }
    } else {
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (sp > 0) {
        var ns = sp - ROLL * dt;
        if (ns <= 0) { b.vx = b.vy = b.wx = b.wy = 0; }
        else { var k = ns / sp; b.vx *= k; b.vy *= k; b.wx = b.vx; b.wy = b.vy; }
      } else { b.wx = b.wy = 0; }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.q) rollQ(b, b.wx * dt, b.wy * dt);
  }
  /* Marble against marble: an elastic knock along the line between their centres. */
  function collide(list, onHit) {
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (!a.live) continue;
      for (var j = i + 1; j < list.length; j++) {
        var b = list[j];
        if (!b.live) continue;
        var dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
        if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
        var d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ia = 1 / a.m, ib = 1 / b.m;
        var push = (rr - d) / (ia + ib);
        a.x -= nx * push * ia; a.y -= ny * push * ia;
        b.x += nx * push * ib; b.y += ny * push * ib;
        var closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (closing > 0) {
          var J = (1 + BOUNCE) * closing / (ia + ib);
          a.vx -= J * ia * nx; a.vy -= J * ia * ny;
          b.vx += J * ib * nx; b.vy += J * ib * ny;
          if (onHit) onHit(a, b, closing);
        }
      }
    }
  }
  function stepWorld(list, dt, onHit) {
    for (var i = 0; i < list.length; i++) if (list[i].live) integrate(list[i], dt);
    collide(list, onHit);
  }
  /* A marble is out when the whole of it is past the chalk line and it is rolling away. */
  function isOutside(b) { var d2 = b.x * b.x + b.y * b.y, R = RING + b.r; return d2 > R * R; }
  function headingOut(b) { return b.x * b.vx + b.y * b.vy >= 0; }

  /* =====================================================================
     PART 2: THE COMPUTER
     The computer plays like a careful kid:
       1. For each marble, it picks a few directions that would send it out of the ring, and works out
          where its taw must touch the marble to send it that way (the "ghost ball" trick from billiards).
       2. It walks round the edge of the ring looking for a spot with a clear path to that touch point.
       3. It plays the best of those shots in its head, with the same physics as the game, at a few
          strengths, and scores them: marbles knocked out are good, a taw left in the ring is bad.
       4. It plays the best one, but its hand wobbles: on Easy a lot, on Hard hardly at all.
     ===================================================================== */
  function rayExit(x, y, ux, uy, rad) {
    var pu = x * ux + y * uy, c = x * x + y * y - rad * rad, disc = pu * pu - c;
    return disc < 0 ? 0 : -pu + Math.sqrt(disc);
  }
  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    var t = L2 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var qx = ax + t * dx - px, qy = ay + t * dy - py;
    return Math.sqrt(qx * qx + qy * qy);
  }
  /* Where a taw sits for a spot on the edge: on the chalk line, nudged outwards if a marble is in the way. */
  function edgeSpot(targets, phi) {
    var ux = Math.cos(phi), uy = Math.sin(phi), d = RING;
    for (var tries = 0; tries < 12; tries++) {
      var bump = false;
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i], dx = ux * d - t.x, dy = uy * d - t.y, rr = t.r + R_TAW + 0.5;
        if (dx * dx + dy * dy < rr * rr) { bump = true; break; }
      }
      if (!bump) break;
      d += 3;
    }
    return { x: ux * d, y: uy * d };
  }
  function pathClear(targets, skip, sx, sy, gx, gy) {
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (t === skip) continue;
      if (segDist(t.x, t.y, sx, sy, gx, gy) < t.r + R_TAW + 0.6) return false;
    }
    return true;
  }
  function shotIdeas(targets) {
    var ideas = [], mTaw = R_TAW * R_TAW * R_TAW * TAW_WEIGHT;
    targets.forEach(function (T) {
      var base = Math.atan2(T.y, T.x);
      for (var k = -5; k <= 5; k++) {
        var dirOut = base + k * 0.3;                     /* the way we want this marble to go */
        var ux = Math.cos(dirOut), uy = Math.sin(dirOut);
        var gx = T.x - ux * (T.r + R_TAW), gy = T.y - uy * (T.r + R_TAW);   /* where the taw touches it */
        var vt = Math.sqrt(2 * ROLL * rayExit(T.x, T.y, ux, uy, RING + T.r + 4)) * 1.4;
        var best = null;
        for (var j = 0; j < 40; j++) {
          var phi = j / 40 * Math.PI * 2, S = edgeSpot(targets, phi);
          var dx = gx - S.x, dy = gy - S.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 4) continue;
          var cx = dx / dist, cy = dy / dist, cut = cx * ux + cy * uy;
          if (cut < 0.5) continue;
          if (!pathClear(targets, T, S.x, S.y, gx, gy)) continue;
          var vc = vt / (cut * (1 + BOUNCE) * mTaw / (mTaw + T.m));
          var v0 = Math.sqrt(vc * vc + 2 * ROLL * dist) * 1.08;
          var score = cut - dist / 450 - (v0 > MAX_SPEED ? 0.6 : 0);
          if (!best || score > best.score) best = { phi: phi, dir: Math.atan2(cy, cx), speed: Math.min(v0, MAX_SPEED), score: score };
        }
        if (best) ideas.push(best);
      }
    });
    ideas.sort(function (a, b) { return b.score - a.score; });
    ideas = ideas.slice(0, 26);
    /* and a few hard, straight shots at the marbles nearest the edge, to scatter a crowded ring */
    targets.slice().sort(function (a, b) { return (b.x * b.x + b.y * b.y) - (a.x * a.x + a.y * a.y); }).slice(0, 6).forEach(function (T) {
      var phi = Math.atan2(T.y, T.x), S = edgeSpot(targets, phi);
      if (pathClear(targets, T, S.x, S.y, T.x, T.y)) ideas.push({ phi: phi, dir: Math.atan2(T.y - S.y, T.x - S.x), speed: MAX_SPEED * 0.62, score: 0 });
    });
    return ideas;
  }
  /* Play a shot in the computer's head, on a copy of the ring. */
  function trial(targets, phi, dir, speed) {
    var sim = targets.map(function (t) { return makeBall(t.x, t.y, t.r, 'target'); });
    var S = edgeSpot(targets, phi), taw = makeBall(S.x, S.y, R_TAW, 'taw');
    taw.vx = taw.wx = Math.cos(dir) * speed; taw.vy = taw.wy = Math.sin(dir) * speed;
    sim.push(taw);
    var out = 0, t = 0;
    while (t < 9) {
      stepWorld(sim, STEP, null);
      t += STEP;
      var moving = false;
      for (var i = 0; i < sim.length; i++) {
        var b = sim[i];
        if (!b.live) continue;
        if (isOutside(b) && headingOut(b)) { b.live = false; if (b.kind === 'target') out++; continue; }
        if (isMoving(b)) moving = true;
      }
      if (!moving) break;
    }
    return { out: out, fat: taw.live && taw.x * taw.x + taw.y * taw.y < RING * RING };
  }
  function gauss(rnd) { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(Math.max(1e-9, u))) * Math.cos(2 * Math.PI * v); }
  function planShot(targets, atRisk, level, rnd, perfect) {
    var L = LEVELS[level] || LEVELS.medium, tried = [];
    function worth(r) { return r.fat ? -(6 + 10 * atRisk + r.out) : r.out * 10 + 1; }
    shotIdeas(targets).forEach(function (c) {
      [1, 1.22, 1.5].forEach(function (mult) {
        var sp = Math.min(MAX_SPEED, c.speed * mult);
        tried.push({ phi: c.phi, dir: c.dir, speed: sp, value: worth(trial(targets, c.phi, c.dir, sp)) });
      });
    });
    var pick;
    if (!tried.length) {
      /* nothing has a clear path: roll straight at the marble nearest the edge */
      var near = targets.slice().sort(function (a, b) { return (b.x * b.x + b.y * b.y) - (a.x * a.x + a.y * a.y); })[0] || { x: 0, y: 0 };
      var phi = Math.atan2(near.y, near.x) || 0, S = edgeSpot(targets, phi);
      pick = { phi: phi, dir: Math.atan2(near.y - S.y, near.x - S.x), speed: MAX_SPEED * 0.7 };
    } else {
      /* A shot that only works if it is perfect is a bad bet. The computer knows how much its own hand
         wobbles, so it tries the best few again with that wobble, and each keeps its average score. */
      tried.sort(function (a, b) { return b.value - a.value; });
      var top = tried.slice(0, 8), wa = Math.max(0.006, L.aim * 0.8), wp = Math.max(0.03, L.power * 0.8);
      top.forEach(function (t) {
        var sum = t.value;
        [[wa, 0], [-wa, 0], [0, wp], [0, -wp], [wa * 0.7, wp * 0.7], [-wa * 0.7, -wp * 0.7]].forEach(function (d) {
          sum += worth(trial(targets, t.phi, t.dir + d[0], Math.min(MAX_SPEED, t.speed * (1 + d[1]))));
        });
        t.value = sum / 7;
      });
      top.sort(function (a, b) { return b.value - a.value; });
      var good = top.filter(function (t) { return t.value > 1; });
      var pool = good.length ? good : top;
      pick = perfect ? pool[0] : pool[Math.floor(rnd() * Math.min(L.pick, pool.length))];
    }
    if (perfect) return { phi: pick.phi, dir: pick.dir, speed: pick.speed, value: pick.value };
    return {
      phi: pick.phi,
      dir: pick.dir + gauss(rnd) * L.aim,
      speed: Math.max(40, Math.min(MAX_SPEED, pick.speed * (1 + gauss(rnd) * L.power)))
    };
  }

  /* =====================================================================
     PART 3: GLASS
     Each marble carries a rotation (a quaternion). Rolling turns it about the axis that lies flat on the
     ground at right angles to the way it moves. The coloured ribbons inside the glass are points on a
     sphere: every frame they are turned by the rotation, and the half facing us is drawn strongly, the
     far half faintly, seen through the glass.
     ===================================================================== */
  function rollQ(b, dx, dy) {
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1e-7) return;
    var half = d / b.r / 2, s = Math.sin(half) / d, c = Math.cos(half);
    var ax = -dy * s, ay = dx * s, q = b.q;
    var w = c * q[0] - ax * q[1] - ay * q[2];
    var x = c * q[1] + ax * q[0] + ay * q[3];
    var y = c * q[2] + ay * q[0] - ax * q[3];
    var z = c * q[3] + ax * q[2] - ay * q[1];
    var n = 1 / Math.sqrt(w * w + x * x + y * y + z * z);
    q[0] = w * n; q[1] = x * n; q[2] = y * n; q[3] = z * n;
  }
  function norm3(v) { var n = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; }
  function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function basis(a) { var t = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], e1 = norm3(cross3(a, t)); return [e1, cross3(a, e1)]; }
  /* A loop round the sphere about axis a, at latitude lat, wobbling up and down. */
  function loop(a, lat, wob, freq, phase) {
    var e = basis(a), pts = [];
    for (var i = 0; i < 30; i++) {
      var th = i / 30 * Math.PI * 2, l = lat + wob * Math.sin(freq * th + phase), c = Math.cos(l), s = Math.sin(l);
      var ct = Math.cos(th), st = Math.sin(th);
      pts.push([(e[0][0] * ct + e[1][0] * st) * c + a[0] * s, (e[0][1] * ct + e[1][1] * st) * c + a[1] * s, (e[0][2] * ct + e[1][2] * st) * c + a[2] * s]);
    }
    return pts;
  }
  /* Small seeded random numbers, so the earth and the marbles look the same every time. */
  function seeded(seed) {
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }

  GamesInTime.register({
    id: 'marbles',
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
        P.gold = rgb('--gold'); P.goldShadow = rgb('--gold-shadow', '--brass', '--gold'); P.vermilion = rgb('--vermilion', '--red');
        P.peacock = rgb('--peacock'); P.cobalt = rgb('--cobalt'); P.rose = rgb('--rose'); P.leaf = rgb('--leaf', '--green');
        /* packed earth: the hall's gold shadow, warmed with vermilion and darkened with the night ground */
        P.earth = mix(mix(P.goldShadow, P.vermilion, 0.25), P.shadow, 0.42);
        P.earthLight = mix(P.earth, P.gold, 0.14);
        P.earthDark = mix(P.earth, P.shadow, 0.5);
        P.fontChalk = cssVar('--font-poster') || cssVar('--font-head') || 'sans-serif';
        P.fontHead = cssVar('--font-head') || 'sans-serif';
      }
      readColours();

      /* ---- settings and records, remembered for next time ---- */
      var level = api.store.get('level', 'medium');
      if (!LEVELS[level]) level = 'medium';
      var stats = api.store.get('stats', {});
      if (!stats || typeof stats !== 'object') stats = {};

      root.appendChild(h('style', null,
        '.game-marbles .mb-stage { position: relative; }' +
        '.game-marbles .mb-canvas { display: block; margin: 0 auto; border-radius: 14px; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }' +
        '.game-marbles .mb-canvas.is-aim { touch-action: none; cursor: grab; }' +
        '.game-marbles .mb-canvas.is-dragging { cursor: grabbing; }' +
        '.game-marbles .mb-note { text-align: center; margin-top: .6rem; }' +
        '.game-marbles .mb-note strong { color: var(--ink); }' +
        '@media (max-width: 600px) { .game-marbles .game-toolbar { gap: .45rem .5rem; margin-bottom: .6rem; } .game-marbles .seg button { padding: .4rem .75rem; } }'));

      /* ---- toolbar ---- */
      var levelBtns = {};
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' });
      Object.keys(LEVELS).forEach(function (k) {
        levelBtns[k] = h('button', { type: 'button', 'aria-pressed': String(k === level), onclick: function () { setLevel(k); } }, LEVELS[k].label);
        levelSeg.appendChild(levelBtns[k]);
      });
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(); } }, 'New game');
      root.appendChild(h('div', { class: 'game-toolbar' }, newBtn, levelSeg));

      var stage = h('div', { class: 'mb-stage' });
      var canvas = h('canvas', { class: 'mb-canvas', role: 'img', tabindex: '0', 'aria-label': 'A chalk ring of marbles' });
      stage.appendChild(canvas);
      root.appendChild(stage);
      var recordLine = h('span', null, '');
      root.appendChild(h('p', { class: 'game-note mb-note' }, recordLine));
      root.appendChild(h('p', { class: 'game-note mb-note' }, 'Drag back from your taw and let go. Tap outside the ring to move round the edge. Keyboard: Left and Right aim, Up and Down move round the ring, hold Space for power.'));
      var ctx = canvas.getContext('2d');

      function setLevel(k) {
        level = k;
        api.store.set('level', k);
        Object.keys(levelBtns).forEach(function (x) { levelBtns[x].setAttribute('aria-pressed', String(x === k)); });
        showRecord();
        newGame();
      }
      function showRecord() {
        var s = stats[level] || {};
        recordLine.replaceChildren(h('strong', null, LEVELS[level].label + ': '),
          (s.won || 0) + ' won of ' + (s.played || 0) + ' played' + (s.best ? ' · Biggest haul: ' + s.best + ' marbles' : ''));
      }
      showRecord();

      /* =====================================================================
         PART 4: THE GAME
         ===================================================================== */
      var G = null;                 /* everything about the game in play */
      var L = null;                 /* the layout: canvas size, scale and where the tallies go */
      var dpr = 1, lastVh = 0;
      var ground = null, groundBare = null, sprites = {};
      var looks = null;
      var timers = [];
      var raf = 0, lastT = 0, acc = 0;
      var drag = null, charge = null, keyAim = false;
      var lastClick = 0, lastCoin = 0;

      function later(fn, ms) {
        var id = setTimeout(function () { timers = timers.filter(function (x) { return x !== id; }); if (!destroyed) fn(); }, ms);
        timers.push(id);
        return id;
      }
      function clearTimers() { timers.forEach(clearTimeout); timers = []; }
      function think() { return reduced ? 0 : THINK_MS; }

      function targetsInRing() { return G.balls.filter(function (b) { return b.kind === 'target' && b.live && !b.out; }); }
      function atRisk(who) { return G.won[who].filter(function (m) { return m.provisional; }).length; }
      function scoreText() { return 'You ' + G.won.you.length + ', Computer ' + G.won.cpu.length; }
      function say(text) { api.status(text); }
      function describe() {
        if (!G) return;
        var label;
        if (G.mode === 'lag') label = 'Lag for first shot. Your taw is below the chalk ring; roll it up towards the lag line near the top. Left and Right arrows aim, hold Space for power and let go to roll.';
        else {
          var left = targetsInRing().length;
          label = 'A chalk ring on packed earth with ' + left + (left === 1 ? ' marble' : ' marbles') + ' inside. You have won ' + G.won.you.length + ', the computer has won ' + G.won.cpu.length + '.' +
            (G.phase === 'aim' && G.turn === 'you' ? ' Your taw is on the edge of the ring. Left and Right arrows aim, Up and Down move round the ring, hold Space for power and let go to shoot.' : '');
        }
        canvas.setAttribute('aria-label', label);
      }

      /* ---- the marbles' looks ---- */
      function makeLook(style, hue, hue2, R, id) {
        var ribbons = [], clear = false, tint = hue;
        function axis() { return norm3([R() * 2 - 1, R() * 2 - 1, R() * 2 - 1]); }
        function rib(pts, c, w) { return { pts: pts, w: w, front: col(c, 0.95), back: clear ? col(c, 0.3) : null }; }
        if (style === 'cat') {
          clear = true; tint = mix(hue, P.ink, 0.5);
          ribbons.push(rib(loop(axis(), 0, 0.12, 3, R() * 6), hue, 0.44));
        } else if (style === 'swirl') {
          ribbons.push(rib(loop(axis(), 0, 0.5, 2, R() * 6), P.ink, 0.2));
          ribbons.push(rib(loop(axis(), 0.15, 0.4, 3, R() * 6), hue2, 0.26));
        } else if (style === 'lines') {
          clear = true; tint = mix(hue, P.ink, 0.3);
          var ax = axis(), e = basis(ax);
          for (var k = 0; k < 4; k++) {
            var th = k / 4 * Math.PI, n = [e[0][0] * Math.cos(th) + e[1][0] * Math.sin(th), e[0][1] * Math.cos(th) + e[1][1] * Math.sin(th), e[0][2] * Math.cos(th) + e[1][2] * Math.sin(th)];
            ribbons.push(rib(loop(n, 0, 0, 0, 0), k % 2 ? hue2 : P.ink, 0.12));
          }
        } else if (style === 'clear') {
          clear = true;
          ribbons.push(rib(loop(axis(), 0.1, 0.55, 2, R() * 6), P.ink, 0.13));
          ribbons.push(rib(loop(axis(), -0.2, 0.3, 3, R() * 6), hue2, 0.13));
        } else {
          /* a taw: an "alley", streaked like agate */
          ribbons.push(rib(loop(axis(), 0, 0.55, 2, R() * 6), hue2, 0.24));
          ribbons.push(rib(loop(axis(), 0.3, 0.4, 3, R() * 6), P.ink, 0.16));
          ribbons.push(rib(loop(axis(), -0.35, 0.35, 2, R() * 6), mix(hue, P.shadow, 0.45), 0.2));
        }
        return { id: id, tint: tint, clear: clear, ribbons: ribbons };
      }
      function makeLooks() {
        var R = seeded(1898), hues = [P.vermilion, P.peacock, P.gold, P.cobalt, P.rose, P.leaf];
        var styles = ['cat', 'swirl', 'lines', 'swirl', 'cat', 'clear'], list = [];
        for (var i = 0; i < TARGETS; i++) list.push(makeLook(styles[i % styles.length], hues[i % hues.length], hues[(i + 3) % hues.length], R, 't' + i));
        return {
          targets: list,
          you: makeLook('alley', P.gold, P.vermilion, R, 'you'),
          cpu: makeLook('alley', P.cobalt, P.peacock, R, 'cpu')
        };
      }

      /* ---- layout ----
         Wide screens: the ring in the middle, your tally on the left, the computer's on the right.
         Phones: the ring on top, the two tallies side by side underneath. */
      function computeLayout(w, vh, vw) {
        var narrow = w < 560 || (vh > vw * 1.05 && w < 900);
        /* leave room for the status line and the toolbar (and, in classroom mode, everything below the game too) */
        var classroom = document.documentElement.classList.contains('classroom');
        var maxH = Math.max(300, vh - (narrow ? 170 : classroom ? 380 : 270));
        var out = { W: w, narrow: narrow };
        if (narrow) {
          var slot = Math.min(30, (w / 2 - 20) / 7);
          var trayH = Math.round(30 + slot * 2 + 10);
          var s = Math.min(w / 226, (maxH - trayH - 8) / 226);
          var ringH = Math.round(226 * s);
          out.s = s; out.H = ringH + trayH + 10; out.ox = w / 2; out.oy = ringH / 2;
          var tw = (w - 24) / 2;
          out.trays = [{ x: 8, y: ringH + 4, w: tw, h: trayH, cols: 7 }, { x: 16 + tw, y: ringH + 4, w: tw, h: trayH, cols: 7 }];
        } else {
          var H = Math.round(Math.min(maxH, Math.max(330, w * 0.58)));
          var s2 = Math.min(H / 234, (w - 250) / 234);
          var tw2 = Math.max(110, Math.min(250, (w - 234 * s2) / 2 - 20));
          out.s = s2; out.H = H; out.ox = w / 2; out.oy = H / 2;
          var cols = tw2 >= 150 ? 3 : 2;
          out.trays = [{ x: 10, y: 10, w: tw2, h: H - 20, cols: cols }, { x: w - 10 - tw2, y: 10, w: tw2, h: H - 20, cols: cols }];
        }
        out.trays.forEach(function (t, i) {
          t.who = i === 0 ? 'you' : 'cpu';
          var rows = Math.ceil(TARGETS / t.cols);
          if (narrow) {
            t.fs = 15;
            t.head = 28;
            t.slot = Math.min((t.w - 12) / t.cols, (t.h - t.head - 6) / rows);
          } else {
            t.fs = Math.round(Math.max(16, Math.min(26, t.w * 0.12)));
            t.head = Math.round(22 + t.fs * 4.1);
            t.slot = Math.min((t.w - 16) / t.cols, (t.h - t.head - 14) / rows, R_MARBLE * out.s * 2 * 1.55);
          }
          t.gx = t.x + (t.w - t.slot * t.cols) / 2;
          t.gy = t.y + t.head;
        });
        return out;
      }
      function slotXY(tray, i) {
        var c = i % tray.cols, r = Math.floor(i / tray.cols);
        return { x: tray.gx + (c + 0.5) * tray.slot, y: tray.gy + (r + 0.5) * tray.slot };
      }
      function trayOf(who) { return L.trays[who === 'you' ? 0 : 1]; }
      function px(x) { return L.ox + x * L.s; }
      function py(y) { return L.oy + y * L.s; }

      function resize() {
        if (destroyed) return;
        var w = Math.floor(stage.clientWidth);
        if (!w) return;
        var vh = window.innerHeight || 800;
        /* small height changes are a phone's address bar sliding away: ignore them so nothing jumps */
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
        sprites = {};
        ground = paintGround(true);
        groundBare = paintGround(false);
        render();
      }

      /* ---- the ground: packed earth, the chalk ring and the two tally boxes, painted once per size ---- */
      function chalkPath(g, pts, width, R, closed) {
        for (var pass = 0; pass < 3; pass++) {
          g.beginPath();
          for (var i = 0; i < pts.length; i++) {
            var jx = (R() - 0.5) * width * 0.7, jy = (R() - 0.5) * width * 0.7;
            if (i === 0) g.moveTo(pts[i][0] + jx, pts[i][1] + jy); else g.lineTo(pts[i][0] + jx, pts[i][1] + jy);
          }
          if (closed) g.closePath();
          g.strokeStyle = col(P.ink, 0.22 + pass * 0.16);
          g.lineWidth = width * (0.55 + pass * 0.3);
          g.lineCap = 'round'; g.lineJoin = 'round';
          g.stroke();
        }
      }
      function ringPoints(cx, cy, rad, from, to) {
        var pts = [], n = Math.max(24, Math.round(rad / 3 * Math.abs(to - from) / (Math.PI * 2)));
        for (var i = 0; i <= n; i++) { var a = from + (to - from) * i / n; pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
        return pts;
      }
      function roundRectPts(x, y, w, hh, r) {
        var pts = [], n = 6;
        var corners = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + hh - r, 0], [x + r, y + hh - r, Math.PI / 2], [x + r, y + r, Math.PI]];
        for (var c = 0; c < 4; c++) for (var k = 0; k <= n; k++) { var a = corners[c][2] + k / n * Math.PI / 2; pts.push([corners[c][0] + Math.cos(a) * r, corners[c][1] + Math.sin(a) * r]); }
        return pts;
      }
      function paintGround(withRing) {
        var c = document.createElement('canvas');
        c.width = canvas.width; c.height = canvas.height;
        var g = c.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        var W = L.W, H = L.H, cx = L.ox, cy = L.oy, rpx = RING * L.s, R = seeded(42), i;
        g.fillStyle = col(P.earthDark); g.fillRect(0, 0, W, H);
        var rg = g.createRadialGradient(cx, cy, rpx * 0.15, cx, cy, Math.max(W, H) * 0.72);
        rg.addColorStop(0, col(P.earthLight)); rg.addColorStop(0.5, col(P.earth)); rg.addColorStop(1, col(P.earthDark));
        g.fillStyle = rg; g.fillRect(0, 0, W, H);
        /* grit and specks */
        var n = Math.round(W * H / 45);
        for (i = 0; i < n; i++) {
          var sz = 0.5 + R() * 1.4;
          g.fillStyle = col(R() < 0.5 ? P.earthLight : P.earthDark, 0.25 + R() * 0.4);
          g.fillRect(R() * W, R() * H, sz, sz);
        }
        /* a few pebbles */
        for (i = 0; i < Math.round(W * H / 9000); i++) {
          var x = R() * W, y = R() * H, pr = 1.2 + R() * 2.6 * Math.max(1, L.s * 0.6);
          g.fillStyle = col(mix(P.earth, P.muted, 0.35 + R() * 0.3), 0.85);
          g.beginPath(); g.ellipse(x, y, pr, pr * (0.6 + R() * 0.3), R() * 3, 0, Math.PI * 2); g.fill();
          g.fillStyle = col(P.ink, 0.25);
          g.beginPath(); g.arc(x - pr * 0.3, y - pr * 0.3, pr * 0.35, 0, Math.PI * 2); g.fill();
        }
        /* scuffs where knees have knelt */
        g.lineCap = 'round';
        for (i = 0; i < 10; i++) {
          var sx = R() * W, sy = R() * H, len = 20 + R() * 50;
          g.strokeStyle = col(P.earthDark, 0.25); g.lineWidth = 2 + R() * 4;
          g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + len * 0.5, sy + (R() - 0.5) * 20, sx + len, sy + (R() - 0.5) * 12); g.stroke();
        }
        if (withRing) chalkPath(g, ringPoints(cx, cy, rpx, 0, Math.PI * 2), Math.max(2.2, L.s * 1.7), seeded(9), true);
        L.trays.forEach(function (t) {
          chalkPath(g, roundRectPts(t.x + 2, t.y + 2, t.w - 4, t.h - 4, Math.min(14, t.w * 0.08)), Math.max(1.6, L.s * 0.9), seeded(t.who === 'you' ? 3 : 5), true);
        });
        return c;
      }

      /* ---- glass sprites: the body, the shine and the shadow are painted once for each size ---- */
      function sprite(look, rpx) {
        var key = look.id + ':' + rpx;
        if (sprites[key]) return sprites[key];
        var pad = Math.ceil(rpx * 0.7) + 2, size = rpx * 2 + pad * 2, cpx = Math.ceil(size * dpr);
        function layer(draw) {
          var c = document.createElement('canvas'); c.width = c.height = cpx;
          var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); draw(g, rpx + pad, rpx + pad); return c;
        }
        var t = look.tint, light = mix(t, P.ink, 0.6), dark = mix(t, P.shadow, 0.62);
        var sp = {
          size: size, pad: pad, r: rpx,
          shadow: layer(function (g, cx, cy) {
            var x = cx + rpx * 0.28, y = cy + rpx * 0.36, gr = g.createRadialGradient(x, y, rpx * 0.15, x, y, rpx * 1.3);
            gr.addColorStop(0, col(P.shadow, 0.6)); gr.addColorStop(1, col(P.shadow, 0));
            g.fillStyle = gr; g.beginPath(); g.arc(x, y, rpx * 1.3, 0, Math.PI * 2); g.fill();
          }),
          under: layer(function (g, cx, cy) {
            var gr = g.createRadialGradient(cx - rpx * 0.35, cy - rpx * 0.4, rpx * 0.05, cx, cy, rpx);
            gr.addColorStop(0, col(light, look.clear ? 0.62 : 1)); gr.addColorStop(0.55, col(t, look.clear ? 0.42 : 0.97)); gr.addColorStop(1, col(dark, look.clear ? 0.85 : 1));
            g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rpx, 0, Math.PI * 2); g.fill();
          }),
          over: layer(function (g, cx, cy) {
            g.save(); g.beginPath(); g.arc(cx, cy, rpx, 0, Math.PI * 2); g.clip();
            var rim = g.createRadialGradient(cx, cy, rpx * 0.6, cx, cy, rpx);
            rim.addColorStop(0, col(P.shadow, 0)); rim.addColorStop(1, col(P.shadow, 0.45));
            g.fillStyle = rim; g.fillRect(cx - rpx, cy - rpx, rpx * 2, rpx * 2);
            /* light bends through the glass and glows on the far side */
            var gx = cx + rpx * 0.32, gy = cy + rpx * 0.4, glow = g.createRadialGradient(gx, gy, 0, gx, gy, rpx * 0.6);
            glow.addColorStop(0, col(light, 0.6)); glow.addColorStop(1, col(light, 0));
            g.fillStyle = glow; g.fillRect(cx - rpx, cy - rpx, rpx * 2, rpx * 2);
            g.restore();
            g.save(); g.translate(cx - rpx * 0.36, cy - rpx * 0.4); g.rotate(-0.7); g.scale(1, 0.6);
            var hl = g.createRadialGradient(0, 0, 0, 0, 0, rpx * 0.36);
            hl.addColorStop(0, col(P.ink, 0.95)); hl.addColorStop(0.45, col(P.ink, 0.55)); hl.addColorStop(1, col(P.ink, 0));
            g.fillStyle = hl; g.beginPath(); g.arc(0, 0, rpx * 0.36, 0, Math.PI * 2); g.fill();
            g.restore();
            g.fillStyle = col(P.ink, 0.95); g.beginPath(); g.arc(cx - rpx * 0.44, cy - rpx * 0.46, Math.max(0.8, rpx * 0.09), 0, Math.PI * 2); g.fill();
            g.strokeStyle = col(P.shadow, 0.5); g.lineWidth = Math.max(0.8, rpx * 0.07);
            g.beginPath(); g.arc(cx, cy, rpx - g.lineWidth / 2, 0, Math.PI * 2); g.stroke();
          })
        };
        sprites[key] = sp;
        return sp;
      }
      function drawSwirls(b, X, Y, rpx) {
        var q = b.q, w = q[0], x = q[1], y = q[2], z = q[3];
        var m00 = 1 - 2 * (y * y + z * z), m01 = 2 * (x * y - w * z), m02 = 2 * (x * z + w * y);
        var m10 = 2 * (x * y + w * z), m11 = 1 - 2 * (x * x + z * z), m12 = 2 * (y * z - w * x);
        var m20 = 2 * (x * z - w * y), m21 = 2 * (y * z + w * x), m22 = 1 - 2 * (x * x + y * y);
        var k = rpx * 0.9, rib = b.look.ribbons;
        ctx.save();
        ctx.beginPath(); ctx.arc(X, Y, rpx * 0.96, 0, Math.PI * 2); ctx.clip();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (var pass = 0; pass < 2; pass++) {
          for (var r = 0; r < rib.length; r++) {
            var R = rib[r];
            if (!pass && (!R.back || rpx < 6)) continue;
            var pts = R.pts, n = pts.length, pen = false;
            ctx.beginPath();
            for (var i = 0; i <= n; i++) {
              var p = pts[i % n], front = m20 * p[0] + m21 * p[1] + m22 * p[2] > 0;
              if (front === (pass === 1)) {
                var sx = X + (m00 * p[0] + m01 * p[1] + m02 * p[2]) * k, sy = Y + (m10 * p[0] + m11 * p[1] + m12 * p[2]) * k;
                if (pen) ctx.lineTo(sx, sy); else { ctx.moveTo(sx, sy); pen = true; }
              } else pen = false;
            }
            ctx.strokeStyle = pass ? R.front : R.back;
            ctx.lineWidth = Math.max(1, R.w * rpx * (pass ? 1 : 0.8));
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      /* Sprites come in whole-pixel sizes and are scaled to the exact size, so animations do not fill the cache. */
      function spriteFor(look, rpx) { return sprite(look, Math.max(2, Math.round(rpx))); }
      function drawShadow(b, X, Y, rpx, alpha) {
        var sp = spriteFor(b.look, rpx), k = rpx / sp.r, size = sp.size * k, o = size / 2;
        if (alpha != null && alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
        ctx.drawImage(sp.shadow, X - o, Y - o, size, size);
        ctx.globalAlpha = 1;
      }
      function drawMarble(b, X, Y, rpx, alpha, withShadow) {
        var sp = spriteFor(b.look, rpx), k = rpx / sp.r, size = sp.size * k, o = size / 2;
        if (alpha != null && alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
        if (withShadow) ctx.drawImage(sp.shadow, X - o, Y - o, size, size);
        ctx.drawImage(sp.under, X - o, Y - o, size, size);
        drawSwirls(b, X, Y, rpx);
        ctx.drawImage(sp.over, X - o, Y - o, size, size);
        ctx.globalAlpha = 1;
      }

      /* ---- sounds: glass clicks are pitched and weighted by how hard the marbles meet ---- */
      function clickSound(speed) {
        if (speed < 6) return;
        var now = performance.now();
        if (now - lastClick < 24) return;
        lastClick = now;
        var k = Math.min(1, speed / 300);
        if (api.tone) {
          api.tone(2300 + 1700 * k + rnd() * 300, 0.03 + 0.03 * k, 'sine', 0.03 + 0.17 * k);
          api.tone(5200 + 900 * k, 0.02 + 0.015 * k, 'triangle', 0.012 + 0.05 * k);
        } else api.sound('click');
      }
      function coinSound() {
        var now = performance.now();
        if (now - lastCoin < 110) return;
        lastCoin = now;
        api.sound('coin');
      }

      /* ---- the animation loop runs only while something moves ---- */
      function kick() {
        if (!raf && !destroyed && !document.hidden) { lastT = 0; raf = requestAnimationFrame(frame); }
      }
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
        if (document.hidden) {
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          if (charge) { charge = null; if (G) G.aim.power = 0; }
        } else kick();
      }
      document.addEventListener('visibilitychange', onVisibility);

      /* ---- game set-up ---- */
      function crossSpots() {
        var s = [[0, 0]];
        for (var k = 1; k <= 3; k++) s.push([k * GAP, 0], [-k * GAP, 0], [0, k * GAP], [0, -k * GAP]);
        return s;
      }
      function newBall(x, y, kind, look) {
        var b = makeBall(x, y, kind === 'target' ? R_MARBLE : R_TAW, kind);
        b.look = look;
        b.q = [1, 0, 0, 0];
        rollQ(b, (rnd() - 0.5) * 40, (rnd() - 0.5) * 40);
        return b;
      }
      function newGame() {
        clearTimers();
        drag = null; charge = null; acc = 0;
        readColours();
        looks = makeLooks();
        sprites = {};
        if (L) { ground = paintGround(true); groundBare = paintGround(false); }
        G = {
          phase: 'intro', mode: 'lag', turn: 'you', first: 'you',
          balls: [], taw: null, lag: {}, won: { you: [], cpu: [] },
          flying: [], fading: [], texts: [], dust: [],
          intro: reduced ? 1 : 0, shots: 0, shotOut: 0, shotTime: 0,
          aim: { dir: -Math.PI / 2, power: 0 }, cpuAim: null, pulse: 0, lastPower: 0,
          spot: { you: Math.PI / 2, cpu: -Math.PI / 2 },
          over: false, winner: null, hint: true, firstMain: true
        };
        canvas.classList.remove('is-dragging');
        setAimClass();
        if (!reduced) api.sound('chalk');
        say('Drawing the ring in chalk');
        describe();
        if (reduced) startLag(); else kick();
      }

      /* ---- the lag: bowl at the line, and the closer marble shoots first ---- */
      function startLag() {
        G.phase = 'aim'; G.mode = 'lag'; G.turn = 'you';
        G.taw = newBall(-22, LAG_FROM, 'taw', looks.you);
        G.taw.owner = 'you';
        G.taw.pop = reduced ? 1 : 0;
        G.balls = [G.taw];
        G.lag = { you: G.taw };
        G.aim = { dir: -Math.PI / 2, power: 0 };
        G.pulse = reduced ? 0 : 2.5;
        setAimClass();
        say('Lag for first shot: roll your taw as close to the line as you can');
        describe();
        kick();
      }
      function cpuLag() {
        G.phase = 'cpu'; G.turn = 'cpu';
        G.cpuT0 = performance.now();
        setAimClass();
        say("The computer's lag");
        later(function () {
          var x = 22, mine = G.lag.you;
          while (Math.abs(mine.x - x) < R_TAW * 2 + 2 && Math.abs(mine.y - LAG_FROM) < R_TAW * 2 + 2) x += 12;
          var taw = newBall(x, LAG_FROM, 'taw', looks.cpu);
          taw.owner = 'cpu';
          taw.pop = reduced ? 1 : 0;
          G.balls.push(taw);
          G.lag.cpu = taw;
          G.taw = taw;
          var lv = LEVELS[level];
          var speed = Math.sqrt(2 * ROLL * (LAG_FROM - LAG_LINE)) * (1 + gauss(rnd) * lv.lag);
          cpuShoot(-Math.PI / 2 + gauss(rnd) * lv.aim * 0.5, speed / MAX_SPEED);
        }, think());
      }
      function finishLag() {
        var dy = Math.abs(G.lag.you.y - LAG_LINE), dc = Math.abs(G.lag.cpu.y - LAG_LINE);
        var youFirst = dy <= dc;
        G.first = youFirst ? 'you' : 'cpu';
        var winner = youFirst ? G.lag.you : G.lag.cpu;
        floatText('Closer!', winner.x, winner.y - 16, P.gold);
        api.sound(youFirst ? 'bell' : 'tick');
        say(youFirst ? 'You were closer to the line, so you shoot first' : 'The computer was closer to the line, so it shoots first');
        G.phase = 'lagged';
        G.taw = null;
        later(function () {
          G.balls.forEach(function (b) { G.fading.push({ b: b, t: 0 }); });
          G.balls = [];
          layCross();
        }, reduced ? 700 : 1500);
        kick();
      }

      /* ---- laying the cross: thirteen marbles go in, one after another ---- */
      function layCross() {
        G.mode = 'main';
        G.phase = 'laying';
        crossSpots().forEach(function (s, i) {
          var b = newBall(s[0], s[1], 'target', looks.targets[i]);
          b.drop = reduced ? 1 : -i * 0.055;     /* drop-in progress, one after another */
          G.balls.push(b);
        });
        say('Thirteen marbles in a cross');
        describe();
        if (reduced) startTurn(G.first, false); else kick();
      }

      /* ---- turns ---- */
      function placeTaw(who, phi) {
        var S = edgeSpot(targetsInRing(), phi);
        if (!G.taw || G.taw.owner !== who) {
          G.taw = newBall(S.x, S.y, 'taw', who === 'you' ? looks.you : looks.cpu);
          G.taw.owner = who;
          G.taw.pop = reduced ? 1 : 0;
          G.balls.push(G.taw);
        } else { G.taw.x = S.x; G.taw.y = S.y; G.taw.vx = G.taw.vy = G.taw.wx = G.taw.wy = 0; }
        G.spot[who] = phi;
      }
      function centreDir() { return Math.atan2(-G.taw.y, -G.taw.x); }
      function startTurn(who, again) {
        G.turn = who;
        G.shotOut = 0;
        if (who === 'you') {
          G.phase = 'aim';
          placeTaw('you', G.spot.you);
          G.aim = { dir: centreDir(), power: 0 };
          G.pulse = reduced ? 0 : 2;
          if (G.firstMain) { G.hint = true; G.firstMain = false; }
          say((again ? 'Shoot again' : 'Your shot') + ' · ' + scoreText());
          setAimClass();
          describe();
          kick();
        } else cpuTurn(again);
      }
      function cpuTurn(again) {
        G.phase = 'cpu';
        G.turn = 'cpu';
        setAimClass();
        say((again ? 'The computer shoots again' : "The computer's shot") + ' · ' + scoreText());
        describe();
        /* the computer works out its shot during its thinking pause, then plays it */
        var started = G.cpuT0 = performance.now();
        later(function () {
          var plan = planShot(targetsInRing(), atRisk('cpu'), level, rnd, false);
          G.planMs = Math.round(performance.now() - started);
          later(function () {
            placeTaw('cpu', plan.phi);
            cpuShoot(plan.dir, plan.speed / MAX_SPEED);
          }, Math.max(0, think() - (performance.now() - started)));
        }, 30);
      }
      /* The computer's hand: its taw pops in, it pulls back, and lets go. */
      function cpuShoot(dir, power) {
        if (reduced) { G.aim = { dir: dir, power: power }; shoot(dir, power); return; }
        G.cpuAim = { dir: dir, power: power, t: 0 };
        G.aim = { dir: dir, power: 0 };
        kick();
      }
      function shoot(dir, power) {
        var taw = G.taw;
        if (!taw) return;
        power = Math.max(0, Math.min(1, power));
        var sp = power * MAX_SPEED;
        taw.vx = taw.wx = Math.cos(dir) * sp;
        taw.vy = taw.wy = Math.sin(dir) * sp;
        taw.escaped = false;
        taw.pop = 1;
        G.lastShot = { dir: dir, power: power, x: taw.x, y: taw.y };
        if (G.turn === 'you') G.lastPower = power;
        else G.cpuWait = Math.round(performance.now() - G.cpuT0);
        G.phase = 'rolling';
        G.shotOut = 0;
        G.shotTime = 0;
        G.shots++;
        G.cpuAim = null;
        G.hint = false;
        drag = null; charge = null;
        setAimClass();
        api.sound('tick');
        if (power > 0.75) api.sound('whoosh');
        kick();
      }

      /* ---- after every shot: the Ring Taw rules ---- */
      function settle() {
        if (G.mode === 'lag') {
          if (G.turn === 'you') cpuLag(); else finishLag();
          return;
        }
        var who = G.turn, other = who === 'you' ? 'cpu' : 'you', taw = G.taw;
        var fat = !!taw && !taw.escaped && taw.x * taw.x + taw.y * taw.y < RING * RING;
        if (taw) {
          G.fading.push({ b: taw, t: 0 });
          G.balls = G.balls.filter(function (b) { return b !== taw; });
          G.taw = null;
          if (!fat) G.spot[who] = Math.atan2(taw.y, taw.x);
        }
        if (fat) {
          var back = G.won[who].filter(function (m) { return m.provisional; });
          var whose = who === 'you' ? 'Your' : "The computer's";
          api.sound('wrong');
          floatText('Fat!', taw.x, taw.y - 14, P.vermilion);
          var tip = who === 'you' && !G.tipped ? '. Hit harder so it rolls right out' : '';
          if (who === 'you') G.tipped = true;
          if (back.length) {
            say('Fat! ' + whose + ' taw stopped in the ring, so ' + back.length + (back.length === 1 ? ' marble goes' : ' marbles go') + ' back' + tip);
            G.phase = 'returning';
            returnMarbles(who, back, function () { startTurn(other, false); });
          } else {
            say('Fat! ' + whose + ' taw stopped in the ring' + tip);
            G.phase = 'pause';
            later(function () { startTurn(other, false); }, reduced ? 500 : 1200);
          }
          describe();
          kick();
          return;
        }
        var total = G.won[who].length, left = targetsInRing().length;
        if (total >= TO_WIN || left === 0) { bank(who); endGame(); return; }
        if (G.shotOut > 0) {
          floatText('Shoot again!', 0, -RING * 0.3, who === 'you' ? P.gold : P.peacock);
          if (who === 'you') say('You knocked ' + (G.shotOut === 1 ? 'one' : G.shotOut) + ' out! Shoot again · ' + scoreText());
          else say('The computer knocked ' + (G.shotOut === 1 ? 'one' : G.shotOut) + ' out and shoots again · ' + scoreText());
          G.phase = 'pause';
          later(function () { startTurn(who, true); }, reduced ? 250 : 750);
        } else {
          bank(who);
          say((who === 'you' ? 'No marbles out. ' : 'The computer missed. ') + (other === 'you' ? 'Your shot' : "The computer's shot") + ' · ' + scoreText());
          G.phase = 'pause';
          later(function () { startTurn(other, false); }, reduced ? 250 : 650);
        }
        describe();
        kick();
      }
      function bank(who) { G.won[who].forEach(function (m) { m.provisional = false; }); }
      function endGame() {
        G.over = true;
        G.phase = 'over';
        var a = G.won.you.length, b = G.won.cpu.length;
        G.winner = a > b ? 'you' : 'cpu';
        var s = stats[level] || { won: 0, played: 0, best: 0 };
        s.played = (s.played || 0) + 1;
        if (G.winner === 'you') s.won = (s.won || 0) + 1;
        s.best = Math.max(s.best || 0, a);
        stats[level] = s;
        api.store.set('stats', stats);
        showRecord();
        setAimClass();
        if (G.winner === 'you') {
          say('You win, ' + a + ' marbles to ' + b + '!');
          api.celebrate('You win the ring, ' + a + ' marbles to ' + b + '!');
        } else {
          say('The computer wins, ' + b + ' marbles to ' + a + '. Have another go!');
          api.sound('lose');
        }
        describe();
        kick();
      }

      /* ---- won marbles roll into the tally; on a fat turn they roll back ---- */
      function winMarble(b) {
        var who = G.turn;
        b.out = true;
        b.owner = who;
        b.provisional = true;
        b.inTray = false;
        b.slot = G.won[who].length;
        G.won[who].push(b);
        G.shotOut++;
        coinSound();
        floatText('+1', b.x, b.y - 12, who === 'you' ? P.gold : P.peacock);
        chalkDust(b.x, b.y);
        describe();
      }
      function scoop(b) {
        b.live = false;
        G.balls = G.balls.filter(function (x) { return x !== b; });
        G.flying.push({ b: b, wx: b.x, wy: b.y, who: b.owner, t: 0, dur: reduced ? 0.01 : 0.6 });
      }
      function returnMarbles(who, list, done) {
        var spots = crossSpots(), stagger = reduced ? 0 : 0.09, tray = trayOf(who);
        G.won[who] = G.won[who].filter(function (m) { return !m.provisional; });
        G.won[who].forEach(function (m, i) { m.slot = i; });
        G.flying = G.flying.filter(function (f) { return list.indexOf(f.b) < 0; });
        var placed = targetsInRing().slice();
        list.forEach(function (b, i) {
          var home = null;
          for (var k = 0; k < spots.length && !home; k++) {
            var ok = placed.every(function (o) { var dx = o.x - spots[k][0], dy = o.y - spots[k][1]; return dx * dx + dy * dy > (o.r + b.r + 2) * (o.r + b.r + 2); });
            if (ok) home = spots[k];
          }
          if (!home) home = [(rnd() - 0.5) * 40, (rnd() - 0.5) * 40];
          placed.push({ x: home[0], y: home[1], r: b.r });
          /* it may still be rolling outside the ring, or already sitting in the tally */
          var from = b.live ? { x: px(b.x), y: py(b.y) } : slotXY(tray, b.slot);
          if (b.live) { b.live = false; G.balls = G.balls.filter(function (x) { return x !== b; }); }
          b.out = false; b.provisional = false; b.owner = null; b.inTray = false;
          b.vx = b.vy = b.wx = b.wy = 0;
          G.flying.push({ b: b, from: from, home: home, who: who, t: -i * stagger, dur: reduced ? 0.01 : 0.55, back: true });
        });
        var wait = reduced ? 60 : (list.length * stagger + 0.55) * 1000 + 300;
        later(function () {
          G.flying.filter(function (f) { return f.back; }).forEach(landBack);
          G.flying = G.flying.filter(function (f) { return !f.back; });
          describe();
          done();
        }, wait);
      }
      function landBack(f) {
        var b = f.b;
        if (b.live) return;
        b.x = f.home[0]; b.y = f.home[1];
        b.live = true;
        G.balls.push(b);
      }

      /* ---- little effects ---- */
      function floatText(text, x, y, c) { G.texts.push({ text: text, x: x, y: y, c: c, t: 0 }); }
      function chalkDust(x, y) {
        if (reduced) return;
        for (var i = 0; i < 7; i++) {
          var a = rnd() * Math.PI * 2, s = 10 + rnd() * 30;
          G.dust.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.5 + rnd() * 0.4 });
        }
      }

      /* ---- update: physics and animations; returns true while anything still moves ---- */
      function update(dt) {
        if (!G) return false;
        var busy = false, i;
        if (G.phase === 'intro') {
          G.intro = Math.min(1, G.intro + dt / 0.75);
          busy = true;
          if (G.intro >= 1) startLag();
        }
        if (G.phase === 'laying') {
          var all = true;
          G.balls.forEach(function (b) {
            if (b.drop == null || b.drop >= 1) return;
            var before = b.drop;
            b.drop = Math.min(1, b.drop + dt / 0.2);
            if (before < 0.7 && b.drop >= 0.7) {
              if (api.tone) api.tone(2600 + rnd() * 900, 0.04, 'sine', 0.09); else api.sound('click');
            }
            if (b.drop < 1) all = false;
          });
          busy = true;
          if (all) { G.phase = 'pause'; startTurn(G.first, false); }
        }
        if (G.phase === 'rolling') {
          busy = true;
          acc += dt;
          var steps = 0;
          while (acc >= STEP && steps < 16) {
            stepWorld(G.balls, STEP, onHit);
            acc -= STEP; steps++;
            G.shotTime += STEP;
            if (G.mode === 'lag') kerb();
            checkOuts();
          }
          if (shotDone() || G.shotTime > 14) {
            G.balls.forEach(function (b) { if (!b.out) { b.vx = b.vy = b.wx = b.wy = 0; } });
            acc = 0;
            settle();
          }
        } else {
          /* marbles already out keep rolling away until they are scooped up */
          G.balls.forEach(function (b) { if (b.out && b.live) { integrate(b, dt); busy = true; } });
        }
        /* scoop up marbles that are out, once they slow down or roll far enough */
        G.balls.slice().forEach(function (b) {
          if (!b.out || !b.live) return;
          b.outT = (b.outT || 0) + dt;
          var d = Math.sqrt(b.x * b.x + b.y * b.y);
          if (b.outT > 0.25 && (speedOf(b) < 60 || d > RING + 26 || b.outT > 1.1)) scoop(b);
        });
        G.balls.forEach(function (b) { if (b.pop != null && b.pop < 1) { b.pop = Math.min(1, b.pop + dt / 0.18); busy = true; } });
        if (G.cpuAim) {
          busy = true;
          G.cpuAim.t += dt;
          var t = G.cpuAim.t;
          G.aim.dir = G.cpuAim.dir;
          G.aim.power = G.cpuAim.power * ease((t - 0.12) / 0.45);
          if (t > 0.72) shoot(G.cpuAim.dir, G.cpuAim.power);
        }
        if (charge) { busy = true; G.aim.power = chargePower(); }
        if (G.pulse > 0) { G.pulse = Math.max(0, G.pulse - dt); busy = true; }
        for (i = G.flying.length - 1; i >= 0; i--) {
          var f = G.flying[i];
          f.t += dt;
          busy = true;
          if (f.t >= f.dur) {
            if (f.back) landBack(f);
            else { f.b.inTray = true; api.sound('tick'); }
            G.flying.splice(i, 1);
          }
        }
        for (i = G.fading.length - 1; i >= 0; i--) { G.fading[i].t += dt; busy = true; if (G.fading[i].t > 0.35) G.fading.splice(i, 1); }
        for (i = G.texts.length - 1; i >= 0; i--) { G.texts[i].t += dt; busy = true; if (G.texts[i].t > 1.1) G.texts.splice(i, 1); }
        for (i = G.dust.length - 1; i >= 0; i--) {
          var p = G.dust[i];
          p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
          busy = true;
          if (p.t > p.life) G.dust.splice(i, 1);
        }
        return busy;
      }
      function onHit(a, b, speed) { clickSound(speed); }
      /* Too far in the lag: the taw runs into the kerb at the edge of the playground and stops dead. */
      function kerb() {
        G.balls.forEach(function (b) {
          var lim = KERB - b.r;
          if (Math.abs(b.x) <= lim && Math.abs(b.y) <= lim) return;
          b.x = Math.max(-lim, Math.min(lim, b.x)); b.y = Math.max(-lim, Math.min(lim, b.y));
          if (speedOf(b) > 20) { api.sound('thud'); floatText('Too far!', b.x, b.y + 16, P.ink); }
          b.vx = b.vy = b.wx = b.wy = 0;
        });
      }
      function checkOuts() {
        for (var i = 0; i < G.balls.length; i++) {
          var b = G.balls[i];
          if (!b.live) continue;
          if (b.kind === 'target' && !b.out && isOutside(b) && headingOut(b)) winMarble(b);
          else if (b.kind === 'taw' && G.mode === 'main' && !b.escaped && G.shotTime > 0.05 && isOutside(b) && headingOut(b)) b.escaped = true;
        }
      }
      /* A shot is over when everything in the ring has stopped, and anything outside it is rolling away. */
      function shotDone() {
        for (var i = 0; i < G.balls.length; i++) {
          var b = G.balls[i];
          if (!b.live || b.out || !isMoving(b)) continue;
          if (G.mode === 'main' && b.kind === 'taw' && b.escaped) continue;
          return false;
        }
        return true;
      }

      /* ---- drawing ---- */
      function render() {
        if (!L || !G) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, L.W, L.H);
        var s = L.s;
        if (G.phase === 'intro') {
          ctx.drawImage(groundBare, 0, 0, L.W, L.H);
          drawRingProgress(G.intro);
        } else ctx.drawImage(ground, 0, 0, L.W, L.H);
        drawTrays();
        if (G.mode === 'lag' || G.phase === 'lagged') drawLagLine();
        var list = G.balls.slice();
        G.fading.forEach(function (f) { list.push(f.b); });
        /* shadows first, then glass, so a shadow never falls across a marble */
        list.forEach(function (b) { var a = ballAlpha(b); if (a > 0) drawShadow(b, px(b.x), py(b.y), b.r * s * ballScale(b), a); });
        if (G.phase === 'aim' && G.turn === 'you' && G.taw) drawTawHalo(G.taw);
        list.forEach(function (b) {
          var a = ballAlpha(b);
          if (a <= 0) return;
          var lift = b.drop != null && b.drop < 1 ? (1 - ease(b.drop)) * 18 * s : 0;
          drawMarble(b, px(b.x), py(b.y) - lift, b.r * s * ballScale(b), a, false);
        });
        G.flying.forEach(drawFlying);
        if ((G.phase === 'aim' && G.taw && (drag || charge || keyAim || G.mode === 'lag')) || G.cpuAim) drawAim();
        if (G.hint && G.phase === 'aim' && G.turn === 'you' && !drag && !charge) drawHint();
        G.dust.forEach(function (p) {
          ctx.fillStyle = col(P.ink, 0.5 * (1 - p.t / p.life));
          ctx.fillRect(px(p.x) - 1, py(p.y) - 1, 2.2, 2.2);
        });
        G.texts.forEach(function (t) {
          var k = t.t / 1.1, y = py(t.y) - k * 24;
          ctx.globalAlpha = 1 - ease((k - 0.6) / 0.4);
          ctx.font = '700 ' + Math.round(Math.max(17, 9 * s)) + 'px ' + P.fontChalk;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 4; ctx.strokeStyle = col(P.shadow, 0.7);
          ctx.strokeText(t.text, px(t.x), y);
          ctx.fillStyle = col(t.c);
          ctx.fillText(t.text, px(t.x), y);
          ctx.globalAlpha = 1;
        });
        if (G.over) drawResult();
      }
      function ballScale(b) {
        if (b.drop != null && b.drop < 1) return 1 + (1 - ease(b.drop)) * 0.5;
        if (b.pop != null && b.pop < 1) return 0.4 + 0.6 * ease(b.pop);
        return 1;
      }
      function ballAlpha(b) {
        if (b.drop != null && b.drop < 1) return Math.max(0, Math.min(1, b.drop * 1.6));
        for (var i = 0; i < G.fading.length; i++) if (G.fading[i].b === b) return 1 - G.fading[i].t / 0.35;
        return 1;
      }
      function drawRingProgress(k) {
        var a0 = Math.PI / 2, pts = ringPoints(L.ox, L.oy, RING * L.s, a0, a0 + Math.PI * 2 * Math.max(0.02, ease(k)));
        chalkPath(ctx, pts, Math.max(2.2, L.s * 1.7), seeded(9), false);
        var end = pts[pts.length - 1];
        ctx.fillStyle = col(P.ink, 0.9);
        ctx.beginPath(); ctx.arc(end[0], end[1], Math.max(3, L.s * 2.4), 0, Math.PI * 2); ctx.fill();
      }
      function drawLagLine() {
        var half = Math.sqrt(RING * RING - LAG_LINE * LAG_LINE), y = py(LAG_LINE), pts = [];
        for (var i = 0; i <= 10; i++) pts.push([px(-half + 2 * half * i / 10), y]);
        chalkPath(ctx, pts, Math.max(2, L.s * 1.4), seeded(77), false);
        ctx.font = '700 ' + Math.round(Math.max(13, 6.5 * L.s)) + 'px ' + P.fontChalk;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = col(P.ink, 0.8);
        ctx.fillText('LAG LINE', px(0), y - 6);
        if (G.phase === 'lagged') {
          ['you', 'cpu'].forEach(function (k) {
            var b = G.lag[k];
            if (!b) return;
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = col(k === G.first ? P.gold : P.ink, 0.85); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(px(b.x), py(b.y)); ctx.lineTo(px(b.x), y); ctx.stroke();
            ctx.setLineDash([]);
          });
        }
      }
      function drawTrays() {
        L.trays.forEach(function (t) {
          var who = t.who, list = G.won[who], fs = t.fs;
          var active = !G.over && G.mode === 'main' && G.turn === who && G.phase !== 'laying';
          var risk = list.filter(function (m) { return m.provisional; }).length;
          var label = who === 'you' ? 'YOU' : 'COMPUTER', n = String(list.length);
          if (active) {
            ctx.strokeStyle = col(P.gold, 0.9); ctx.lineWidth = 2.5;
            ctx.beginPath(); roundRect(ctx, t.x + 6, t.y + 6, t.w - 12, t.h - 12, Math.min(12, t.w * 0.07)); ctx.stroke();
          }
          ctx.fillStyle = col(active ? P.gold : P.ink, active ? 1 : 0.88);
          ctx.textBaseline = 'alphabetic';
          if (L.narrow) {
            ctx.font = '700 ' + fs + 'px ' + P.fontChalk;
            ctx.textAlign = 'left';
            ctx.fillText(label, t.x + 12, t.y + 22);
            ctx.textAlign = 'right';
            ctx.font = '700 ' + (fs + 5) + 'px ' + P.fontChalk;
            ctx.fillText(n, t.x + t.w - 12, t.y + 24);
            if (risk) {
              ctx.font = '700 11px ' + P.fontHead;
              ctx.fillStyle = col(P.gold);
              ctx.fillText('+' + risk + ' this turn', t.x + t.w - 32, t.y + 21);
            }
          } else {
            ctx.textAlign = 'center';
            var y1 = t.y + 12 + fs, y2 = y1 + fs * 2.1;
            ctx.font = '700 ' + fs + 'px ' + P.fontChalk;
            ctx.fillText(label, t.x + t.w / 2, y1);
            ctx.font = '700 ' + Math.round(fs * 2) + 'px ' + P.fontChalk;
            ctx.fillText(n, t.x + t.w / 2, y2);
            if (risk) {
              ctx.font = '700 ' + Math.round(Math.max(12, fs * 0.6)) + 'px ' + P.fontHead;
              ctx.fillStyle = col(P.gold);
              ctx.fillText(risk + ' won this turn', t.x + t.w / 2, y2 + fs * 0.95);
            }
          }
          list.forEach(function (m) {
            if (!m.inTray) return;
            var p = slotXY(t, m.slot), r = Math.min(m.r * L.s, t.slot * 0.4);
            drawMarble(m, p.x, p.y, r, 1, true);
            if (m.provisional) {
              ctx.setLineDash([3, 3]); ctx.strokeStyle = col(P.gold, 0.95); ctx.lineWidth = 1.5;
              ctx.beginPath(); ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
            }
          });
        });
      }
      function roundRect(g, x, y, w, hh, r) {
        g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + hh - r);
        g.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh); g.lineTo(x + r, y + hh); g.quadraticCurveTo(x, y + hh, x, y + hh - r);
        g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
      }
      function drawFlying(f) {
        var tray = trayOf(f.who), A, B, rA, rB;
        var rTray = Math.min(f.b.r * L.s, tray.slot * 0.4), rRing = f.b.r * L.s;
        if (f.back) { A = f.from; B = { x: px(f.home[0]), y: py(f.home[1]) }; rA = rTray; rB = rRing; }
        else { A = { x: px(f.wx), y: py(f.wy) }; B = slotXY(tray, f.b.slot); rA = rRing; rB = rTray; }
        var k = ease(Math.max(0, f.t) / f.dur);
        var mx = (A.x + B.x) / 2, my = Math.min(A.y, B.y) - 30;
        var x = (1 - k) * (1 - k) * A.x + 2 * (1 - k) * k * mx + k * k * B.x;
        var y = (1 - k) * (1 - k) * A.y + 2 * (1 - k) * k * my + k * k * B.y;
        if (f.prev) rollQ(f.b, (x - f.prev.x) / L.s, (y - f.prev.y) / L.s);
        f.prev = { x: x, y: y };
        drawMarble(f.b, x, y, rA + (rB - rA) * k, 1, true);
      }
      function drawTawHalo(b) {
        var X = px(b.x), Y = py(b.y), r = b.r * L.s;
        var k = G.pulse > 0 ? 0.5 + 0.5 * Math.sin(G.pulse * 7) : 0.6;
        ctx.strokeStyle = col(P.gold, 0.35 + 0.5 * k);
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(X, Y, r + 5 + k * 4, 0, Math.PI * 2); ctx.stroke();
      }
      function maxPull() { return Math.max(70, Math.min(170, RING * L.s * 0.55)); }
      function drawAim() {
        var b = G.taw;
        if (!b) return;
        var X = px(b.x), Y = py(b.y), r = b.r * L.s, dir = G.aim.dir, pw = G.aim.power || 0;
        var ux = Math.cos(dir), uy = Math.sin(dir), pull = pw * maxPull(), mine = G.turn === 'you';
        /* the pulled-back line: from the taw back to your thumb */
        if (pw > 0.01) {
          ctx.strokeStyle = col(P.ink, 0.85); ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.setLineDash([2, 6]);
          ctx.beginPath(); ctx.moveTo(X - ux * (r + 2), Y - uy * (r + 2)); ctx.lineTo(X - ux * (r + pull), Y - uy * (r + pull)); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = col(P.ink, 0.9);
          ctx.beginPath(); ctx.arc(X - ux * (r + pull), Y - uy * (r + pull), 5, 0, Math.PI * 2); ctx.fill();
        }
        /* the aim guide: a short dotted line the way the taw will go */
        var len = Math.max(50, RING * L.s * 0.55);
        ctx.fillStyle = col(mine ? P.gold : P.peacock, 0.95);
        for (var i = 1; i <= 9; i++) {
          var d = r + 6 + len * i / 9;
          ctx.globalAlpha = 1 - i / 11;
          ctx.beginPath(); ctx.arc(X + ux * d, Y + uy * d, 2.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        /* the power meter: a ring round the taw that fills up */
        var R = r + 9;
        ctx.lineWidth = 6; ctx.lineCap = 'butt';
        ctx.strokeStyle = col(P.shadow, 0.55);
        ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.stroke();
        if (pw > 0) {
          var c = pw < 0.5 ? mix(P.leaf, P.gold, pw * 2) : mix(P.gold, P.vermilion, (pw - 0.5) * 2);
          ctx.strokeStyle = col(c);
          ctx.beginPath(); ctx.arc(X, Y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pw); ctx.stroke();
        }
        if (mine && G.lastPower) {
          var la = -Math.PI / 2 + Math.PI * 2 * G.lastPower;
          ctx.strokeStyle = col(P.ink, 0.9); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(X + Math.cos(la) * (R - 5), Y + Math.sin(la) * (R - 5)); ctx.lineTo(X + Math.cos(la) * (R + 5), Y + Math.sin(la) * (R + 5)); ctx.stroke();
        }
        if (pw > 0) {
          var ty = Y > L.oy ? Y - R - 14 : Y + R + 16;
          ctx.font = '700 14px ' + P.fontHead;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3; ctx.strokeStyle = col(P.shadow, 0.8);
          ctx.strokeText(Math.round(pw * 100) + '%', X, ty);
          ctx.fillStyle = col(P.ink);
          ctx.fillText(Math.round(pw * 100) + '%', X, ty);
        }
      }
      function drawHint() {
        var text = G.mode === 'lag' ? 'Pull back from your taw and let go' : 'Drag back from your taw to shoot';
        var fs = Math.round(Math.max(13, Math.min(20, 7.5 * L.s)));
        ctx.font = '700 ' + fs + 'px ' + P.fontHead;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var y = py(G.mode === 'lag' ? 30 : -RING * 0.62);
        var w = Math.min(L.W - 16, ctx.measureText(text).width + 24);
        ctx.fillStyle = col(P.shadow, 0.75);
        ctx.beginPath(); roundRect(ctx, L.ox - w / 2, y - fs * 0.95, w, fs * 1.9, fs * 0.9); ctx.fill();
        ctx.fillStyle = col(P.ink);
        ctx.fillText(text, L.ox, y + 1, w - 12);
      }
      function drawResult() {
        var win = G.winner === 'you';
        var fs = Math.round(Math.max(22, Math.min(46, 15 * L.s)));
        ctx.font = '700 ' + fs + 'px ' + P.fontChalk;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var text = win ? 'You win!' : 'Computer wins';
        var w = ctx.measureText(text).width + 40;
        ctx.fillStyle = col(P.shadow, 0.78);
        ctx.beginPath(); roundRect(ctx, L.ox - w / 2, L.oy - fs, w, fs * 2, fs * 0.6); ctx.fill();
        ctx.fillStyle = col(win ? P.gold : P.ink);
        ctx.fillText(text, L.ox, L.oy + 2);
      }

      /* ---- aiming with a finger or a mouse ---- */
      function canAim() { return !!(G && G.phase === 'aim' && G.turn === 'you' && G.taw && !G.over); }
      function setAimClass() {
        var on = canAim();
        canvas.classList.toggle('is-aim', on);
        if (!on) canvas.classList.remove('is-dragging');
      }
      function local(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      function onDown(e) {
        if (api.unlockSound) api.unlockSound();
        if (e.button != null && e.button > 0) return;
        if (!canAim()) return;
        try { canvas.focus({ preventScroll: true }); } catch (err) { /* older browsers */ }
        var p = local(e), t = G.taw, tx = px(t.x), ty = py(t.y);
        var dpx = Math.sqrt((p.x - tx) * (p.x - tx) + (p.y - ty) * (p.y - ty));
        var wx = (p.x - L.ox) / L.s, wy = (p.y - L.oy) / L.s, inside = wx * wx + wy * wy < (RING - 3) * (RING - 3);
        var near = dpx <= Math.max(30, t.r * L.s * 2.4);
        if (near || inside || G.mode === 'lag') {
          drag = { mode: 'aim', id: e.pointerId, sx: p.x, sy: p.y, rel: !near };
          G.aim.power = 0;
        } else {
          drag = { mode: 'move', id: e.pointerId };
          moveTawTo(wx, wy);
        }
        charge = null;
        canvas.classList.add('is-dragging');
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        e.preventDefault();
        render();
      }
      function onMove(e) {
        if (!drag || e.pointerId !== drag.id || !canAim()) return;
        var p = local(e);
        if (drag.mode === 'move') { moveTawTo((p.x - L.ox) / L.s, (p.y - L.oy) / L.s); render(); return; }
        var t = G.taw, ox = drag.rel ? drag.sx : px(t.x), oy = drag.rel ? drag.sy : py(t.y);
        var dx = ox - p.x, dy = oy - p.y, len = Math.sqrt(dx * dx + dy * dy);
        if (len > 3) G.aim.dir = Math.atan2(dy, dx);
        G.aim.power = Math.min(1, len / maxPull());
        render();
      }
      function onUp(e) {
        if (!drag || e.pointerId !== drag.id) return;
        var d = drag;
        drag = null;
        canvas.classList.remove('is-dragging');
        if (!canAim()) { render(); return; }
        if (d.mode === 'aim') {
          if (G.aim.power >= 0.05) shoot(G.aim.dir, G.aim.power);
          else { G.aim.power = 0; G.hint = true; render(); }
        } else render();
      }
      function onCancel(e) {
        if (!drag || e.pointerId !== drag.id) return;
        drag = null;
        canvas.classList.remove('is-dragging');
        if (G && G.phase === 'aim') G.aim.power = 0;
        render();
      }
      function moveTawTo(wx, wy) {
        if (G.mode !== 'main') return;
        placeTaw('you', Math.atan2(wy, wx));
        G.aim.dir = centreDir();
        G.hint = false;
      }

      /* ---- aiming with the keyboard ---- */
      function chargePower() {
        var t = (performance.now() - charge.t0) / 1000, k = (t % 2.2) / 1.1;
        return k > 1 ? 2 - k : k;
      }
      function onKey(e) {
        var k = e.key;
        if (k === ' ' || k === 'Spacebar') {
          e.preventDefault();
          if (api.unlockSound) api.unlockSound();
          if (e.repeat || !canAim() || drag || charge) return;
          charge = { t0: performance.now() };
          keyAim = true;
          G.hint = false;
          kick();
          return;
        }
        if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
          e.preventDefault();
          if (!canAim()) return;
          keyAim = true;
          var fine = e.shiftKey ? 0.25 : 1;
          if (k === 'ArrowLeft') G.aim.dir -= 0.035 * fine;
          if (k === 'ArrowRight') G.aim.dir += 0.035 * fine;
          if ((k === 'ArrowUp' || k === 'ArrowDown') && G.mode === 'main') {
            var off = G.aim.dir - centreDir();
            placeTaw('you', G.spot.you + (k === 'ArrowUp' ? -0.07 : 0.07) * fine);
            G.aim.dir = centreDir() + off;
          }
          G.hint = false;
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
          if (canAim() && p >= 0.03) shoot(G.aim.dir, p); else { G.aim.power = 0; render(); }
        }
      }
      function onBlur() { keyAim = false; if (charge) { charge = null; if (G && G.phase === 'aim') G.aim.power = 0; } render(); }
      function onFocus() { keyAim = true; render(); }

      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onCancel);
      canvas.addEventListener('keydown', onKey);
      canvas.addEventListener('keyup', onKeyUp);
      canvas.addEventListener('blur', onBlur);
      canvas.addEventListener('focus', onFocus);

      var ro = null;
      if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(function () { resize(); }); ro.observe(root); }
      window.addEventListener('resize', resize);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!destroyed) render(); });

      /* A small window for the play-test script: read-only state, and the shot the computer would play for you. */
      root.gitTest = {
        state: function () {
          var r = canvas.getBoundingClientRect();
          return {
            phase: G.phase, mode: G.mode, turn: G.turn, over: G.over, winner: G.winner, shots: G.shots,
            you: G.won.you.length, cpu: G.won.cpu.length, inRing: targetsInRing().length, level: level,
            taw: G.taw ? { x: r.left + px(G.taw.x), y: r.top + py(G.taw.y) } : null,
            running: !!raf, maxPull: L ? maxPull() : 0, planMs: G.planMs || 0, cpuWait: G.cpuWait || 0, lastShot: G.lastShot || null
          };
        },
        suggest: function () {
          if (!canAim() || G.mode !== 'main') return null;
          var plan = planShot(targetsInRing(), atRisk('you'), 'hard', rnd, true), r = canvas.getBoundingClientRect();
          var S = edgeSpot(targetsInRing(), plan.phi), out = RING + 9, k = maxPull() * plan.speed / MAX_SPEED;
          return {
            move: { x: r.left + px(Math.cos(plan.phi) * out), y: r.top + py(Math.sin(plan.phi) * out) },
            away: { x: r.left + px(-Math.cos(plan.phi) * out), y: r.top + py(-Math.sin(plan.phi) * out) },
            plan: plan,
            from: { x: r.left + px(S.x), y: r.top + py(S.y) },
            to: { x: r.left + px(S.x) - Math.cos(plan.dir) * k, y: r.top + py(S.y) - Math.sin(plan.dir) * k }
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
          if (ro) ro.disconnect();
          delete root.gitTest;
        }
      };
    }
  });
})();
