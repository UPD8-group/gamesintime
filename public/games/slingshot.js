/* Slingshot for Games in Time (the 2010s hall).

   Pull back a slingshot and launch friendly round puffballs at wobbly towers of wood, ice and stone, built on hills, to
   knock over the gold trophies and snowmen. The physics puzzle mechanic made famous on phones in the 2010s; the
   puffballs, towers, levels and look are our own. Nothing alive gets hurt: puffballs bounce and poof back home, and
   the targets are trophies and snowmen.

   The file has three parts:
   1. A small rigid-body physics engine written for this game (boxes, slopes and balls, gravity, friction, bounce,
      resting contact and sleeping). It follows the ideas of Erin Catto's Box2D, the free engine many 2010s phone games
      were built on: "sequential impulses", "warm starting" and "sleeping islands". Everything is explained below.
   2. The levels, built from planks, posts, blocks and hills.
   3. The game: drawing, input, scoring and stars.
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  /* =====================================================================================================
     PART 1. THE PHYSICS ENGINE
     World units are metres and seconds, and y points UP (the drawing code flips it for the screen).

     Each step (120 times a second) the engine does this:
       a) Find which shapes touch. For each touching pair it makes a "contact" with one or two contact points.
       b) Gravity speeds every moving body up a little.
       c) The solver fixes the speeds so touching bodies do not move into each other, and adds friction and bounce.
          It goes round all the contacts 8 times, nudging each one, because fixing one contact can spoil another.
          The nudges ("impulses") from last step are reused as a first guess ("warm starting"), which is the secret
          that lets a tall tower stand still instead of jiggling.
       d) Bodies move by their speed.
       e) Any small overlap left over is pushed apart.
       f) Groups of touching bodies that have all been still for half a second go to sleep. A sleeping body costs
          nothing and cannot jiggle. It wakes up when something awake touches it.
     ===================================================================================================== */
  var GRAVITY = -10;               // metres per second, per second (a little more than Earth's 9.8, for snappier play)
  var STEP = 1 / 120;              // seconds per physics step
  var VEL_ITERS = 8;               // passes of the speed solver per step
  var POS_ITERS = 3;               // passes of the overlap fixer per step
  var SLOP = 0.005;                // 5 mm of overlap is allowed, so resting bodies stay touching
  var BAUMGARTE = 0.2;             // how much of an overlap is fixed in one pass (a fifth: gentle, no popping)
  var MAX_CORRECTION = 0.2;        // never push a body more than 20 cm in one pass
  var BOUNCE_SPEED = 1;            // hits slower than 1 m/s do not bounce at all (so resting things do not hop)
  var SLEEP_SPEED = 0.03, SLEEP_SPIN = 0.05, SLEEP_TIME = 0.5;
  var MAX_MOVE = 2;                // metres per step, a safety limit
  var CIRCLE = 0, POLY = 1;
  var T_CIRCLES = 0, T_FACE_A = 1, T_FACE_B = 2;   // the three kinds of contact (see collide functions)

  /* ---------- shapes ---------- */
  function boxShape(w, h) {
    return polyShape([-w / 2, w / 2, w / 2, -w / 2], [-h / 2, -h / 2, h / 2, h / 2]);
  }
  /* A convex polygon from corner lists in counter-clockwise order. The shape is moved so its balance point (centroid)
     is at (0, 0); shape.cx and shape.cy say where that balance point was. Also works out the area and how hard the
     shape is to spin ("moment of inertia") using the triangle-fan method. */
  function polyShape(xs, ys) {
    var n = xs.length, area = 0, cx = 0, cy = 0, I = 0, i, j;
    var rx = xs[0], ry = ys[0];
    for (i = 0; i < n; i++) {
      j = (i + 1) % n;
      var e1x = xs[i] - rx, e1y = ys[i] - ry, e2x = xs[j] - rx, e2y = ys[j] - ry;
      var D = e1x * e2y - e1y * e2x, a = 0.5 * D;
      area += a;
      cx += a * (e1x + e2x) / 3; cy += a * (e1y + e2y) / 3;
      I += (D / 12) * (e1x * e1x + e2x * e1x + e2x * e2x + e1y * e1y + e2y * e1y + e2y * e2y);
    }
    cx /= area; cy /= area;
    var s = { type: POLY, n: n, lx: new Float64Array(n), ly: new Float64Array(n), nx: new Float64Array(n), ny: new Float64Array(n), area: area, r: 0, cx: cx + rx, cy: cy + ry };
    s.inertiaPerDensity = I - area * (cx * cx + cy * cy);
    for (i = 0; i < n; i++) { s.lx[i] = xs[i] - s.cx; s.ly[i] = ys[i] - s.cy; }
    for (i = 0; i < n; i++) {
      j = (i + 1) % n;
      var ex = s.lx[j] - s.lx[i], ey = s.ly[j] - s.ly[i], len = Math.sqrt(ex * ex + ey * ey);
      s.nx[i] = ey / len; s.ny[i] = -ex / len;    // outward normal of the edge from corner i to corner i+1
    }
    var maxR = 0;
    for (i = 0; i < n; i++) maxR = Math.max(maxR, Math.sqrt(s.lx[i] * s.lx[i] + s.ly[i] * s.ly[i]));
    s.bound = maxR;
    return s;
  }
  function circleShape(r) { return { type: CIRCLE, n: 0, r: r, area: Math.PI * r * r, inertiaPerDensity: 0.5 * Math.PI * r * r * r * r }; }

  /* ---------- bodies ---------- */
  var nextBodyId = 1;
  function makeBody(shape, x, y, angle, density, opt) {
    opt = opt || {};
    var n = shape.n || 0;
    var b = {
      id: nextBodyId++, shape: shape, x: x, y: y, a: angle || 0, c: 1, s: 0, vx: 0, vy: 0, w: 0,
      isStatic: !density, awake: !!density, sleepT: 0,
      m: 0, invM: 0, I: 0, invI: 0,
      friction: opt.friction == null ? 0.6 : opt.friction, restitution: opt.restitution || 0,
      linDamp: opt.linDamp || 0, angDamp: opt.angDamp || 0.02,
      wx: new Float64Array(n), wy: new Float64Array(n), wnx: new Float64Array(n), wny: new Float64Array(n),
      minX: 0, minY: 0, maxX: 0, maxY: 0, idx: 0, dead: false,
      kind: opt.kind || 'block', mat: opt.mat || null, hp: opt.hp || 0, data: opt.data || null
    };
    if (density) {
      b.m = density * shape.area; b.invM = 1 / b.m;
      b.I = density * shape.inertiaPerDensity; b.invI = b.I > 0 ? 1 / b.I : 0;
    }
    updateTransform(b);
    return b;
  }
  /* Work out where the corners of a body are in the world, and the box around it (used to skip far-apart pairs). */
  function updateTransform(b) {
    var c = Math.cos(b.a), s = Math.sin(b.a), sh = b.shape;
    b.c = c; b.s = s;
    if (sh.type === CIRCLE) {
      b.minX = b.x - sh.r; b.maxX = b.x + sh.r; b.minY = b.y - sh.r; b.maxY = b.y + sh.r;
      return;
    }
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < sh.n; i++) {
      var x = b.x + c * sh.lx[i] - s * sh.ly[i], y = b.y + s * sh.lx[i] + c * sh.ly[i];
      b.wx[i] = x; b.wy[i] = y;
      b.wnx[i] = c * sh.nx[i] - s * sh.ny[i]; b.wny[i] = s * sh.nx[i] + c * sh.ny[i];
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    b.minX = minX; b.minY = minY; b.maxX = maxX; b.maxY = maxY;
  }

  /* ---------- contacts ----------
     A contact remembers up to two points where two bodies touch. The points are stored in the bodies' own frames
     ("local" coordinates), so they move with the bodies, and each point has an id saying which corner and which edge
     made it. Next step, a point with the same id gets back its old impulse: that is warm starting. */
  function makeContact(A, B) {
    /* A ball against a box is always handled as (box, ball). */
    if (A.shape.type === CIRCLE && B.shape.type === POLY) { var t = A; A = B; B = t; }
    return {
      a: A, b: B, type: 0, n: 0, lnx: 0, lny: 0, lpx: 0, lpy: 0,
      p0x: 0, p0y: 0, id0: -1, ni0: 0, ti0: 0, p1x: 0, p1y: 0, id1: -1, ni1: 0, ti1: 0,
      nx: 0, ny: 0, wp0x: 0, wp0y: 0, wp1x: 0, wp1y: 0,
      r0ax: 0, r0ay: 0, r0bx: 0, r0by: 0, nm0: 0, tm0: 0, bias0: 0,
      r1ax: 0, r1ay: 0, r1bx: 0, r1by: 0, nm1: 0, tm1: 0, bias1: 0,
      k11: 0, k12: 0, k22: 0, i11: 0, i12: 0, i22: 0, block: false,
      mA: 0, mB: 0, iA: 0, iB: 0, friction: Math.sqrt(A.friction * B.friction), restitution: Math.max(A.restitution, B.restitution),
      impact: 0, stamp: 0
    };
  }

  /* Scratch space for the collision code, made once so the hot loop does not create garbage. */
  var SEP = 0;
  var clipX = new Float64Array(2), clipY = new Float64Array(2), clipId = new Int32Array(2);
  var clip2X = new Float64Array(2), clip2Y = new Float64Array(2), clip2Id = new Int32Array(2);
  var VERTEX = 0, FACE = 1;
  function featureId(indexA, indexB, typeA, typeB) { return indexA | (indexB << 8) | (typeA << 16) | (typeB << 17); }
  function flipId(id) { return ((id >> 8) & 255) | ((id & 255) << 8) | (((id >> 17) & 1) << 16) | (((id >> 16) & 1) << 17); }

  /* Separating axis test: for each edge of A, how far is B's deepest corner in front of it? The biggest of those is
     the best guess for the gap between them (negative means overlapping). Returns the edge; the gap goes in SEP. */
  function maxSeparation(A, B) {
    var best = -Infinity, bestI = 0;
    for (var i = 0; i < A.shape.n; i++) {
      var nx = A.wnx[i], ny = A.wny[i], px = A.wx[i], py = A.wy[i], si = Infinity;
      for (var j = 0; j < B.shape.n; j++) {
        var d = nx * (B.wx[j] - px) + ny * (B.wy[j] - py);
        if (d < si) si = d;
      }
      if (si > best) { best = si; bestI = i; }
    }
    SEP = best;
    return bestI;
  }
  /* Keep the part of a segment that is behind a line (used to trim one edge against the sides of another). */
  function clipSegment(inX, inY, inId, outX, outY, outId, nx, ny, offset, vertexIndexA) {
    var count = 0;
    var d0 = nx * inX[0] + ny * inY[0] - offset, d1 = nx * inX[1] + ny * inY[1] - offset;
    if (d0 <= 0) { outX[count] = inX[0]; outY[count] = inY[0]; outId[count] = inId[0]; count++; }
    if (d1 <= 0) { outX[count] = inX[1]; outY[count] = inY[1]; outId[count] = inId[1]; count++; }
    if (d0 * d1 < 0 && count < 2) {
      var t = d0 / (d0 - d1);
      outX[count] = inX[0] + t * (inX[1] - inX[0]); outY[count] = inY[0] + t * (inY[1] - inY[0]);
      outId[count] = featureId(vertexIndexA, (inId[0] >> 8) & 255, VERTEX, FACE);
      count++;
    }
    return count;
  }
  function toLocalX(b, x, y) { return b.c * (x - b.x) + b.s * (y - b.y); }
  function toLocalY(b, x, y) { return -b.s * (x - b.x) + b.c * (y - b.y); }

  /* Box against box (any convex polygons). Pick the "reference" edge that the other shape is pushing into, find the
     "incident" edge of the other shape that faces it, trim that edge to the reference edge's width, and keep the
     trimmed ends that are overlapping. That gives one or two contact points, like a book lying on a table. */
  function collidePolys(ct, A, B) {
    ct.n = 0;
    var edgeA = maxSeparation(A, B), sepA = SEP;
    if (sepA > 0) return;
    var edgeB = maxSeparation(B, A), sepB = SEP;
    if (sepB > 0) return;
    var P1, P2, e1, flip;
    if (sepB > sepA + 0.1 * SLOP) { P1 = B; P2 = A; e1 = edgeB; flip = true; }
    else { P1 = A; P2 = B; e1 = edgeA; flip = false; }
    var n1x = P1.wnx[e1], n1y = P1.wny[e1], inc = 0, minDot = Infinity, i;
    for (i = 0; i < P2.shape.n; i++) {
      var d = n1x * P2.wnx[i] + n1y * P2.wny[i];
      if (d < minDot) { minDot = d; inc = i; }
    }
    var i2 = (inc + 1) % P2.shape.n;
    clipX[0] = P2.wx[inc]; clipY[0] = P2.wy[inc]; clipId[0] = featureId(e1, inc, FACE, VERTEX);
    clipX[1] = P2.wx[i2]; clipY[1] = P2.wy[i2]; clipId[1] = featureId(e1, i2, FACE, VERTEX);
    var iv1 = e1, iv2 = (e1 + 1) % P1.shape.n;
    var v11x = P1.wx[iv1], v11y = P1.wy[iv1], v12x = P1.wx[iv2], v12y = P1.wy[iv2];
    var tx = v12x - v11x, ty = v12y - v11y, tl = Math.sqrt(tx * tx + ty * ty);
    tx /= tl; ty /= tl;
    var nx = ty, ny = -tx;
    var front = nx * v11x + ny * v11y;
    var side1 = -(tx * v11x + ty * v11y), side2 = tx * v12x + ty * v12y;
    if (clipSegment(clipX, clipY, clipId, clip2X, clip2Y, clip2Id, -tx, -ty, side1, iv1) < 2) return;
    if (clipSegment(clip2X, clip2Y, clip2Id, clipX, clipY, clipId, tx, ty, side2, iv2) < 2) return;
    ct.type = flip ? T_FACE_B : T_FACE_A;
    ct.lnx = P1.shape.nx[e1]; ct.lny = P1.shape.ny[e1];
    ct.lpx = 0.5 * (P1.shape.lx[iv1] + P1.shape.lx[iv2]); ct.lpy = 0.5 * (P1.shape.ly[iv1] + P1.shape.ly[iv2]);
    for (i = 0; i < 2; i++) {
      var sep = nx * clipX[i] + ny * clipY[i] - front;
      if (sep > 0) continue;
      var lx = toLocalX(P2, clipX[i], clipY[i]), ly = toLocalY(P2, clipX[i], clipY[i]), id = flip ? flipId(clipId[i]) : clipId[i];
      if (ct.n === 0) { ct.p0x = lx; ct.p0y = ly; ct.id0 = id; } else { ct.p1x = lx; ct.p1y = ly; ct.id1 = id; }
      ct.n++;
    }
  }
  /* Box (A) against ball (B): find the edge the ball's centre is furthest in front of. If the centre is inside, push
     out through that edge; otherwise the ball touches the edge or one of its corners. */
  function collidePolyCircle(ct, A, B) {
    ct.n = 0;
    var sh = A.shape, r = B.shape.r;
    var cx = toLocalX(A, B.x, B.y), cy = toLocalY(A, B.x, B.y);
    var sep = -Infinity, ni = 0, i;
    for (i = 0; i < sh.n; i++) {
      var s = sh.nx[i] * (cx - sh.lx[i]) + sh.ny[i] * (cy - sh.ly[i]);
      if (s > r) return;
      if (s > sep) { sep = s; ni = i; }
    }
    var j = (ni + 1) % sh.n, v1x = sh.lx[ni], v1y = sh.ly[ni], v2x = sh.lx[j], v2y = sh.ly[j];
    ct.type = T_FACE_A; ct.p0x = 0; ct.p0y = 0; ct.id0 = 0;
    if (sep < 1e-9) {
      ct.lnx = sh.nx[ni]; ct.lny = sh.ny[ni]; ct.lpx = 0.5 * (v1x + v2x); ct.lpy = 0.5 * (v1y + v2y); ct.n = 1;
      return;
    }
    var u1 = (cx - v1x) * (v2x - v1x) + (cy - v1y) * (v2y - v1y);
    var u2 = (cx - v2x) * (v1x - v2x) + (cy - v2y) * (v1y - v2y);
    var dx, dy, d;
    if (u1 <= 0 || u2 <= 0) {
      var vx = u1 <= 0 ? v1x : v2x, vy = u1 <= 0 ? v1y : v2y;
      dx = cx - vx; dy = cy - vy; d = dx * dx + dy * dy;
      if (d > r * r) return;
      d = Math.sqrt(d) || 1;
      ct.lnx = dx / d; ct.lny = dy / d; ct.lpx = vx; ct.lpy = vy; ct.id0 = u1 <= 0 ? 1 : 2;
    } else {
      var fx = 0.5 * (v1x + v2x), fy = 0.5 * (v1y + v2y);
      if ((cx - fx) * sh.nx[ni] + (cy - fy) * sh.ny[ni] > r) return;
      ct.lnx = sh.nx[ni]; ct.lny = sh.ny[ni]; ct.lpx = fx; ct.lpy = fy;
    }
    ct.n = 1;
  }
  function collideCircles(ct, A, B) {
    ct.n = 0;
    var dx = B.x - A.x, dy = B.y - A.y, rr = A.shape.r + B.shape.r;
    if (dx * dx + dy * dy > rr * rr) return;
    ct.type = T_CIRCLES; ct.lpx = 0; ct.lpy = 0; ct.p0x = 0; ct.p0y = 0; ct.id0 = 0; ct.n = 1;
  }
  function collide(ct) {
    var oldN = ct.n, oId0 = ct.id0, oId1 = ct.id1, oN0 = ct.ni0, oT0 = ct.ti0, oN1 = ct.ni1, oT1 = ct.ti1;
    var A = ct.a, B = ct.b;
    if (A.shape.type === POLY && B.shape.type === POLY) collidePolys(ct, A, B);
    else if (A.shape.type === POLY) collidePolyCircle(ct, A, B);
    else collideCircles(ct, A, B);
    /* warm starting: a point that was here last step keeps its impulse */
    ct.ni0 = ct.ti0 = ct.ni1 = ct.ti1 = 0;
    if (oldN > 0) {
      if (ct.n > 0) {
        if (ct.id0 === oId0) { ct.ni0 = oN0; ct.ti0 = oT0; } else if (oldN > 1 && ct.id0 === oId1) { ct.ni0 = oN1; ct.ti0 = oT1; }
      }
      if (ct.n > 1) {
        if (ct.id1 === oId0) { ct.ni1 = oN0; ct.ti1 = oT0; } else if (oldN > 1 && ct.id1 === oId1) { ct.ni1 = oN1; ct.ti1 = oT1; }
      }
    }
  }

  /* Turn a contact's stored points into world positions and one shared push direction (the "normal", from A to B). */
  function worldManifold(ct) {
    var A = ct.a, B = ct.b, rA = A.shape.r, rB = B.shape.r, nx, ny, k;
    if (ct.type === T_CIRCLES) {
      var pAx = A.x + A.c * ct.lpx - A.s * ct.lpy, pAy = A.y + A.s * ct.lpx + A.c * ct.lpy;
      var pBx = B.x + B.c * ct.p0x - B.s * ct.p0y, pBy = B.y + B.s * ct.p0x + B.c * ct.p0y;
      var dx = pBx - pAx, dy = pBy - pAy, d = Math.sqrt(dx * dx + dy * dy);
      nx = 1; ny = 0;
      if (d > 1e-9) { nx = dx / d; ny = dy / d; }
      ct.wp0x = 0.5 * (pAx + rA * nx + pBx - rB * nx); ct.wp0y = 0.5 * (pAy + rA * ny + pBy - rB * ny);
    } else {
      var R = ct.type === T_FACE_A ? A : B, I = ct.type === T_FACE_A ? B : A, rR = ct.type === T_FACE_A ? rA : rB, rI = ct.type === T_FACE_A ? rB : rA;
      nx = R.c * ct.lnx - R.s * ct.lny; ny = R.s * ct.lnx + R.c * ct.lny;
      var plx = R.x + R.c * ct.lpx - R.s * ct.lpy, ply = R.y + R.s * ct.lpx + R.c * ct.lpy;
      for (k = 0; k < ct.n; k++) {
        var lx = k === 0 ? ct.p0x : ct.p1x, ly = k === 0 ? ct.p0y : ct.p1y;
        var cx = I.x + I.c * lx - I.s * ly, cy = I.y + I.s * lx + I.c * ly;
        var dist = (cx - plx) * nx + (cy - ply) * ny;
        var ax = cx + (rR - dist) * nx, ay = cy + (rR - dist) * ny, bx = cx - rI * nx, by = cy - rI * ny;
        if (k === 0) { ct.wp0x = 0.5 * (ax + bx); ct.wp0y = 0.5 * (ay + by); } else { ct.wp1x = 0.5 * (ax + bx); ct.wp1y = 0.5 * (ay + by); }
      }
      if (ct.type === T_FACE_B) { nx = -nx; ny = -ny; }
    }
    ct.nx = nx; ct.ny = ny;
  }

  /* ---------- the world ---------- */
  function World() {
    this.bodies = [];
    this.contacts = [];          // every contact we remember
    this.pairs = new Map();      // the same contacts, found by the pair of body ids
    this.touching = [];          // contacts the solver works on this step
    this.stamp = 0;
    this.parent = new Int32Array(64);
    this.islandMin = new Float64Array(64);
    this.onImpact = null;        // the game listens for hard hits (to break blocks and make sounds)
  }
  World.prototype.add = function (b) { this.bodies.push(b); return b; };
  World.prototype.wake = function (b) { if (!b.isStatic && !b.dead) { b.awake = true; b.sleepT = 0; } };
  World.prototype.sleep = function (b) { b.awake = false; b.sleepT = 0; b.vx = b.vy = b.w = 0; };
  /* Take a body out. Anything resting on it wakes up, so it can fall. */
  World.prototype.remove = function (b) {
    if (b.dead) return;
    b.dead = true;
    var list = this.contacts, i;
    for (i = list.length - 1; i >= 0; i--) {
      var ct = list[i];
      if (ct.a === b || ct.b === b) {
        var other = ct.a === b ? ct.b : ct.a;
        if (ct.n > 0) this.wake(other);
        this.pairs.delete(pairKey(ct.a, ct.b));
        list[i] = list[list.length - 1]; list.pop();
      }
    }
    var at = this.bodies.indexOf(b);
    if (at >= 0) this.bodies.splice(at, 1);
  };
  function pairKey(A, B) { return A.id < B.id ? A.id * 65536 + B.id : B.id * 65536 + A.id; }
  function active(b) { return !b.isStatic && b.awake; }

  /* a) Find touching pairs. Bodies are kept sorted by their left edge, so we only compare bodies whose boxes
     overlap from left to right ("sort and sweep"). Pairs where nothing is awake are skipped: sleeping is free. */
  World.prototype.findContacts = function () {
    var bodies = this.bodies, n = bodies.length, i, j;
    for (i = 1; i < n; i++) {
      var b = bodies[i], k = i - 1;
      while (k >= 0 && bodies[k].minX > b.minX) { bodies[k + 1] = bodies[k]; k--; }
      bodies[k + 1] = b;
    }
    for (i = 0; i < n; i++) {
      var A = bodies[i];
      for (j = i + 1; j < n; j++) {
        var B = bodies[j];
        if (B.minX > A.maxX) break;
        if (B.minY > A.maxY || B.maxY < A.minY) continue;
        if (!active(A) && !active(B)) continue;
        if (A.isStatic && B.isStatic) continue;
        var key = pairKey(A, B), ct = this.pairs.get(key);
        if (!ct) { ct = makeContact(A, B); this.pairs.set(key, ct); this.contacts.push(ct); }
        collide(ct);
        ct.stamp = this.stamp;
      }
    }
  };
  /* Wake any sleeping body that an awake body is touching. Returns true if anything woke (then we look again, so a
     whole tower wakes at once, like a row of dominoes all hearing the knock). */
  World.prototype.wakeTouching = function () {
    var list = this.contacts, woke = false;
    for (var i = 0; i < list.length; i++) {
      var ct = list[i];
      if (ct.stamp !== this.stamp || ct.n === 0) continue;
      var A = ct.a, B = ct.b;
      if (!A.isStatic && !A.awake && active(B)) { this.wake(A); woke = true; }
      else if (!B.isStatic && !B.awake && active(A)) { this.wake(B); woke = true; }
    }
    return woke;
  };

  World.prototype.step = function (dt) {
    var bodies = this.bodies, i, k, b, ct;
    this.stamp++;
    var guard = 0;
    do { this.findContacts(); } while (this.wakeTouching() && ++guard < 40);
    /* forget contacts whose boxes have come apart (contacts between sleeping bodies are kept for later) */
    var list = this.contacts, touching = this.touching;
    touching.length = 0;
    for (i = list.length - 1; i >= 0; i--) {
      ct = list[i];
      if (ct.stamp !== this.stamp) {
        if (active(ct.a) || active(ct.b)) { this.pairs.delete(pairKey(ct.a, ct.b)); list[i] = list[list.length - 1]; list.pop(); }
        continue;
      }
      if (ct.n > 0) touching.push(ct);
    }

    /* b) gravity and a touch of air resistance */
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i]; b.idx = i;
      if (!active(b)) continue;
      b.vy += GRAVITY * dt;
      if (b.linDamp) { var ld = 1 / (1 + dt * b.linDamp); b.vx *= ld; b.vy *= ld; }
      b.w *= 1 / (1 + dt * b.angDamp);
    }

    /* c) the speed solver */
    for (i = 0; i < touching.length; i++) initContact(touching[i]);
    for (i = 0; i < touching.length; i++) warmStart(touching[i]);
    for (k = 0; k < VEL_ITERS; k++) for (i = 0; i < touching.length; i++) solveVelocity(touching[i]);

    /* d) move */
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      if (!active(b)) continue;
      var mx = b.vx * dt, my = b.vy * dt, m2 = mx * mx + my * my;
      if (m2 > MAX_MOVE * MAX_MOVE) { var sc = MAX_MOVE / Math.sqrt(m2); b.vx *= sc; b.vy *= sc; }
      if (Math.abs(b.w * dt) > 0.5 * Math.PI) b.w = (b.w > 0 ? 0.5 : -0.5) * Math.PI / dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
    }

    /* e) push out any leftover overlap */
    for (k = 0; k < POS_ITERS; k++) for (i = 0; i < touching.length; i++) solvePosition(touching[i]);
    for (i = 0; i < bodies.length; i++) if (active(bodies[i])) updateTransform(bodies[i]);

    /* f) sleeping islands: join touching awake bodies into groups with "union-find", then a group sleeps when its
       restless member has been still for SLEEP_TIME seconds */
    var nb = bodies.length;
    if (this.parent.length < nb) { this.parent = new Int32Array(nb * 2); this.islandMin = new Float64Array(nb * 2); }
    var parent = this.parent, islandMin = this.islandMin;
    for (i = 0; i < nb; i++) { parent[i] = i; islandMin[i] = Infinity; }
    for (i = 0; i < touching.length; i++) {
      ct = touching[i];
      if (ct.a.isStatic || ct.b.isStatic) continue;
      var ra = findRoot(parent, ct.a.idx), rb = findRoot(parent, ct.b.idx);
      if (ra !== rb) parent[ra] = rb;
    }
    for (i = 0; i < nb; i++) {
      b = bodies[i];
      if (!active(b)) continue;
      if (b.vx * b.vx + b.vy * b.vy > SLEEP_SPEED * SLEEP_SPEED || b.w * b.w > SLEEP_SPIN * SLEEP_SPIN) b.sleepT = 0;
      else b.sleepT += dt;
      var r = findRoot(parent, i);
      if (b.sleepT < islandMin[r]) islandMin[r] = b.sleepT;
    }
    for (i = 0; i < nb; i++) {
      b = bodies[i];
      if (active(b) && islandMin[findRoot(parent, i)] >= SLEEP_TIME) this.sleep(b);
    }

    /* hard hits, for breaking blocks and for sounds */
    if (this.onImpact) {
      for (i = 0; i < touching.length; i++) {
        ct = touching[i];
        if (ct.impact < -1.2) {
          var inv = ct.mA + ct.mB;
          if (inv > 0) this.onImpact(ct, -ct.impact / inv);
        }
      }
    }
  };
  function awakeCount(w) {
    var n = 0;
    for (var i = 0; i < w.bodies.length; i++) if (active(w.bodies[i])) n++;
    return n;
  }
  function findRoot(parent, i) {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  }

  /* Work out, once per step, the numbers the solver needs for each contact point: where it is from each body's centre
     (r), how much an impulse there changes the speed ("effective mass"), and how much it should bounce. */
  function initContact(ct) {
    var A = ct.a, B = ct.b;
    worldManifold(ct);
    var mA = active(A) ? A.invM : 0, mB = active(B) ? B.invM : 0, iA = active(A) ? A.invI : 0, iB = active(B) ? B.invI : 0;
    ct.mA = mA; ct.mB = mB; ct.iA = iA; ct.iB = iB;
    var nx = ct.nx, ny = ct.ny, tx = ny, ty = -nx;
    ct.impact = 0;
    for (var k = 0; k < ct.n; k++) {
      var px = k === 0 ? ct.wp0x : ct.wp1x, py = k === 0 ? ct.wp0y : ct.wp1y;
      var rax = px - A.x, ray = py - A.y, rbx = px - B.x, rby = py - B.y;
      var rnA = rax * ny - ray * nx, rnB = rbx * ny - rby * nx;
      var kN = mA + mB + iA * rnA * rnA + iB * rnB * rnB;
      var rtA = rax * ty - ray * tx, rtB = rbx * ty - rby * tx;
      var kT = mA + mB + iA * rtA * rtA + iB * rtB * rtB;
      var dvx = B.vx - B.w * rby - A.vx + A.w * ray, dvy = B.vy + B.w * rbx - A.vy - A.w * rax;
      var vRel = dvx * nx + dvy * ny;
      var bias = vRel < -BOUNCE_SPEED ? -ct.restitution * vRel : 0;
      if (vRel < ct.impact) ct.impact = vRel;
      if (k === 0) { ct.r0ax = rax; ct.r0ay = ray; ct.r0bx = rbx; ct.r0by = rby; ct.nm0 = kN > 0 ? 1 / kN : 0; ct.tm0 = kT > 0 ? 1 / kT : 0; ct.bias0 = bias; }
      else { ct.r1ax = rax; ct.r1ay = ray; ct.r1bx = rbx; ct.r1by = rby; ct.nm1 = kN > 0 ? 1 / kN : 0; ct.tm1 = kT > 0 ? 1 / kT : 0; ct.bias1 = bias; }
    }
    ct.block = false;
    if (ct.n === 2) {
      /* Two points on one face are solved together (the "block solver"), so a box sitting flat does not rock. */
      var rn1A = ct.r0ax * ny - ct.r0ay * nx, rn1B = ct.r0bx * ny - ct.r0by * nx, rn2A = ct.r1ax * ny - ct.r1ay * nx, rn2B = ct.r1bx * ny - ct.r1by * nx;
      var k11 = mA + mB + iA * rn1A * rn1A + iB * rn1B * rn1B, k22 = mA + mB + iA * rn2A * rn2A + iB * rn2B * rn2B, k12 = mA + mB + iA * rn1A * rn2A + iB * rn1B * rn2B;
      var det = k11 * k22 - k12 * k12;
      if (k11 * k11 < 1000 * det && det !== 0) {
        ct.block = true; ct.k11 = k11; ct.k12 = k12; ct.k22 = k22;
        ct.i11 = k22 / det; ct.i12 = -k12 / det; ct.i22 = k11 / det;
      }
    }
  }
  function applyImpulse(ct, rax, ray, rbx, rby, Px, Py) {
    var A = ct.a, B = ct.b;
    A.vx -= ct.mA * Px; A.vy -= ct.mA * Py; A.w -= ct.iA * (rax * Py - ray * Px);
    B.vx += ct.mB * Px; B.vy += ct.mB * Py; B.w += ct.iB * (rbx * Py - rby * Px);
  }
  function warmStart(ct) {
    var nx = ct.nx, ny = ct.ny, tx = ny, ty = -nx;
    applyImpulse(ct, ct.r0ax, ct.r0ay, ct.r0bx, ct.r0by, ct.ni0 * nx + ct.ti0 * tx, ct.ni0 * ny + ct.ti0 * ty);
    if (ct.n > 1) applyImpulse(ct, ct.r1ax, ct.r1ay, ct.r1bx, ct.r1by, ct.ni1 * nx + ct.ti1 * tx, ct.ni1 * ny + ct.ti1 * ty);
  }
  function relVel(ct, rax, ray, rbx, rby, dirx, diry) {
    var A = ct.a, B = ct.b;
    return (B.vx - B.w * rby - A.vx + A.w * ray) * dirx + (B.vy + B.w * rbx - A.vy - A.w * rax) * diry;
  }
  /* One nudge for one contact: first friction (it may not be more than friction times the push), then the push
     itself (it may only push, never pull: that is why impulses are clamped at zero). */
  function solveVelocity(ct) {
    var nx = ct.nx, ny = ct.ny, tx = ny, ty = -nx, lam, old, maxF;
    /* friction */
    lam = -ct.tm0 * relVel(ct, ct.r0ax, ct.r0ay, ct.r0bx, ct.r0by, tx, ty);
    maxF = ct.friction * ct.ni0; old = ct.ti0;
    ct.ti0 = Math.max(-maxF, Math.min(maxF, old + lam)); lam = ct.ti0 - old;
    applyImpulse(ct, ct.r0ax, ct.r0ay, ct.r0bx, ct.r0by, lam * tx, lam * ty);
    if (ct.n > 1) {
      lam = -ct.tm1 * relVel(ct, ct.r1ax, ct.r1ay, ct.r1bx, ct.r1by, tx, ty);
      maxF = ct.friction * ct.ni1; old = ct.ti1;
      ct.ti1 = Math.max(-maxF, Math.min(maxF, old + lam)); lam = ct.ti1 - old;
      applyImpulse(ct, ct.r1ax, ct.r1ay, ct.r1bx, ct.r1by, lam * tx, lam * ty);
    }
    /* the push */
    if (!ct.block) {
      lam = -ct.nm0 * (relVel(ct, ct.r0ax, ct.r0ay, ct.r0bx, ct.r0by, nx, ny) - ct.bias0);
      old = ct.ni0; ct.ni0 = Math.max(old + lam, 0); lam = ct.ni0 - old;
      applyImpulse(ct, ct.r0ax, ct.r0ay, ct.r0bx, ct.r0by, lam * nx, lam * ny);
      if (ct.n > 1) {
        lam = -ct.nm1 * (relVel(ct, ct.r1ax, ct.r1ay, ct.r1bx, ct.r1by, nx, ny) - ct.bias1);
        old = ct.ni1; ct.ni1 = Math.max(old + lam, 0); lam = ct.ni1 - old;
        applyImpulse(ct, ct.r1ax, ct.r1ay, ct.r1bx, ct.r1by, lam * nx, lam * ny);
      }
      return;
    }
    /* Block solver: find the two pushes x1, x2 (both zero or more) that stop both points sinking. Try "both
       pushing", then "only the first", "only the second", "neither", and keep the first that works. */
    var a1 = ct.ni0, a2 = ct.ni1;
    var vn1 = relVel(ct, ct.r0ax, ct.r0ay, ct.r0bx, ct.r0by, nx, ny), vn2 = relVel(ct, ct.r1ax, ct.r1ay, ct.r1bx, ct.r1by, nx, ny);
    var b1 = vn1 - ct.bias0 - (ct.k11 * a1 + ct.k12 * a2), b2 = vn2 - ct.bias1 - (ct.k12 * a1 + ct.k22 * a2);
    var x1 = -(ct.i11 * b1 + ct.i12 * b2), x2 = -(ct.i12 * b1 + ct.i22 * b2);
    if (!(x1 >= 0 && x2 >= 0)) {
      x1 = -ct.nm0 * b1; x2 = 0;
      if (!(x1 >= 0 && ct.k12 * x1 + b2 >= 0)) {
        x1 = 0; x2 = -ct.nm1 * b2;
        if (!(x2 >= 0 && ct.k12 * x2 + b1 >= 0)) {
          x1 = 0; x2 = 0;
          if (!(b1 >= 0 && b2 >= 0)) return;
        }
      }
    }
    var d1 = x1 - a1, d2 = x2 - a2;
    applyImpulse(ct, ct.r0ax, ct.r0ay, ct.r0bx, ct.r0by, d1 * nx, d1 * ny);
    applyImpulse(ct, ct.r1ax, ct.r1ay, ct.r1bx, ct.r1by, d2 * nx, d2 * ny);
    ct.ni0 = x1; ct.ni1 = x2;
  }
  /* Push apart any overlap deeper than SLOP, a fifth at a time, by moving the bodies directly. */
  function solvePosition(ct) {
    var A = ct.a, B = ct.b, mA = ct.mA, mB = ct.mB, iA = ct.iA, iB = ct.iB, rA = A.shape.r, rB = B.shape.r;
    for (var k = 0; k < ct.n; k++) {
      var cA = Math.cos(A.a), sA = Math.sin(A.a), cB = Math.cos(B.a), sB = Math.sin(B.a), nx, ny, px, py, sep;
      if (ct.type === T_CIRCLES) {
        var pAx = A.x + cA * ct.lpx - sA * ct.lpy, pAy = A.y + sA * ct.lpx + cA * ct.lpy;
        var pBx = B.x + cB * ct.p0x - sB * ct.p0y, pBy = B.y + sB * ct.p0x + cB * ct.p0y;
        var dx = pBx - pAx, dy = pBy - pAy, d = Math.sqrt(dx * dx + dy * dy);
        nx = 1; ny = 0;
        if (d > 1e-9) { nx = dx / d; ny = dy / d; }
        px = 0.5 * (pAx + pBx); py = 0.5 * (pAy + pBy); sep = d - rA - rB;
      } else {
        var faceA = ct.type === T_FACE_A;
        var Rx = faceA ? A.x : B.x, Ry = faceA ? A.y : B.y, Rc = faceA ? cA : cB, Rs = faceA ? sA : sB;
        var Ix = faceA ? B.x : A.x, Iy = faceA ? B.y : A.y, Ic = faceA ? cB : cA, Is = faceA ? sB : sA;
        nx = Rc * ct.lnx - Rs * ct.lny; ny = Rs * ct.lnx + Rc * ct.lny;
        var plx = Rx + Rc * ct.lpx - Rs * ct.lpy, ply = Ry + Rs * ct.lpx + Rc * ct.lpy;
        var lx = k === 0 ? ct.p0x : ct.p1x, ly = k === 0 ? ct.p0y : ct.p1y;
        px = Ix + Ic * lx - Is * ly; py = Iy + Is * lx + Ic * ly;
        sep = (px - plx) * nx + (py - ply) * ny - rA - rB;
        if (!faceA) { nx = -nx; ny = -ny; }
      }
      var rax = px - A.x, ray = py - A.y, rbx = px - B.x, rby = py - B.y;
      var C = BAUMGARTE * (sep + SLOP);
      if (C < -MAX_CORRECTION) C = -MAX_CORRECTION;
      if (C >= 0) continue;
      var rnA = rax * ny - ray * nx, rnB = rbx * ny - rby * nx;
      var K = mA + mB + iA * rnA * rnA + iB * rnB * rnB;
      if (K <= 0) continue;
      var imp = -C / K, Px = imp * nx, Py = imp * ny;
      A.x -= mA * Px; A.y -= mA * Py; A.a -= iA * (rax * Py - ray * Px);
      B.x += mB * Px; B.y += mB * Py; B.a += iB * (rbx * Py - rby * Px);
    }
  }

  /* =====================================================================================================
     PART 2. MATERIALS, PUFFBALLS AND LEVELS
     ===================================================================================================== */
  /* density in tonnes per cubic metre of a 1 m deep block, friction, bounce, and toughness (how big a knock, in
     newton-seconds, the piece can take before it breaks). Ice is slippery and brittle; stone is heavy and tough. */
  var MATERIALS = {
    wood: { density: 0.7, friction: 0.65, restitution: 0.1, tough: 2.6, points: 100, name: 'wood' },
    ice: { density: 0.9, friction: 0.12, restitution: 0.05, tough: 1.1, points: 50, name: 'ice' },
    stone: { density: 2.4, friction: 0.8, restitution: 0.05, tough: 9, points: 200, name: 'stone' }
  };
  var PUFFS = {
    puff: { r: 0.3, density: 2.6, label: 'puffball' },
    big: { r: 0.42, density: 3.2, label: 'big puffball' }
  };
  var TARGET_SIZE = { trophy: [0.5, 0.62], snowman: [0.56, 0.86] };
  var TARGET_TOUGH = 1.6;           // a knock this hard topples a target straight away
  var POST_W = 0.28, POST_H = 1.3, PLANK_T = 0.28, PLANK_L = 2.0;
  var VIEW_W = 20;                  // the screen always shows 20 metres from left to right
  var GROUND_SHOW = 0.75;           // metres of ground shown under the grass line
  var SLING_X = 2.8, SLING_Y = 1.75, MAX_PULL = 1.3, MAX_SPEED = 15;

  /* A level is a little building program. Helpers place each piece with its bottom edge at y, so pieces stack
     exactly. Every helper returns the height of the top of what it built. */
  function Builder(world) { this.world = world; this.blocks = []; this.targets = []; this.hills = []; }
  Builder.prototype.block = function (mat, x, y, w, h) {
    var M = MATERIALS[mat];
    var b = makeBody(boxShape(w, h), x, y + h / 2, 0, M.density, { friction: M.friction, restitution: M.restitution, kind: 'block', mat: mat, hp: M.tough });
    b.w0 = w; b.h0 = h; b.seed = (x * 73.13 + y * 19.7) % 1;
    this.world.add(b); this.blocks.push(b);
    return y + h;
  };
  Builder.prototype.post = function (mat, x, y, h) { return this.block(mat, x, y, POST_W, h || POST_H); };
  Builder.prototype.plank = function (mat, x, y, len) { return this.block(mat, x, y, len || PLANK_L, PLANK_T); };
  Builder.prototype.cube = function (mat, x, y, s) { return this.block(mat, x, y, s || 0.6, s || 0.6); };
  /* A hut: two posts with a plank across the top. */
  Builder.prototype.hut = function (mat, x, y, len, postH, roofMat) {
    len = len || PLANK_L;
    var off = len / 2 - POST_W / 2 - 0.06;
    this.post(mat, x - off, y, postH); this.post(mat, x + off, y, postH);
    return this.plank(roofMat || mat, x, y + (postH || POST_H), len);
  };
  Builder.prototype.target = function (kind, x, y) {
    var s = TARGET_SIZE[kind];
    var b = makeBody(boxShape(s[0], s[1]), x, y + s[1] / 2, 0, kind === 'snowman' ? 0.8 : 1.1, { friction: 0.7, restitution: 0.05, kind: 'target', data: { kind: kind } });
    b.w0 = s[0]; b.h0 = s[1];
    this.world.add(b); this.targets.push(b);
    return y + s[1];
  };
  /* A hill: a flat-topped mound (a trapezium) from x0 to x1 on the ground, with a top `top` metres high and slopes
     `slope` metres wide. Hills never move (they are "static" bodies). */
  Builder.prototype.hill = function (x0, x1, top, slope) {
    slope = slope == null ? 1.2 : slope;
    var s = polyShape([x0, x1, x1 - slope, x0 + slope], [0, 0, top, top]);
    var b = makeBody(s, s.cx, s.cy, 0, 0, { friction: 0.8, kind: 'hill' });
    b.xs = [x0, x1, x1 - slope, x0 + slope]; b.ys = [0, 0, top, top];
    this.world.add(b); this.hills.push(b);
    return top;
  };

  /* The ten levels. x is metres from the left edge (the slingshot is at 2.8), y is height above the ground.
     pebbles: the puffballs you get, in order. par: clear it with this many or fewer for three stars. */
  var LEVELS = [
    { name: 'First flick', par: 1, pebbles: ['puff', 'puff', 'puff'], hint: 'Pull back, aim at the hut and let go.', build: function (B) {
      var top = B.hut('wood', 14, 0);
      B.target('trophy', 14, top);
    } },
    { name: 'Two huts', par: 2, pebbles: ['puff', 'puff', 'puff'], hint: 'Two trophies this time. Can one puffball get both?', build: function (B) {
      B.target('trophy', 12.6, B.hut('wood', 12.6, 0));
      B.target('trophy', 16.4, B.hut('wood', 16.4, 0, PLANK_L, 1.8));
    } },
    { name: 'Ice house', par: 1, pebbles: ['puff', 'puff', 'puff'], hint: 'Ice is slippery and breaks easily.', build: function (B) {
      B.target('snowman', 14.5, 0);
      var top = B.hut('ice', 14.5, 0, 2.2);
      B.target('snowman', 14.5, top);
      top = B.hut('ice', 14.5, top, 2.2);
      B.target('snowman', 14.5, top);
    } },
    { name: 'Hilltop', par: 1, pebbles: ['puff', 'puff', 'puff'], hint: 'Aim a little higher to reach the top of the hill.', build: function (B) {
      var g = B.hill(11.2, 18.6, 2.0, 1.6);
      var top = B.hut('wood', 14.9, g);
      B.cube('stone', 14.9, top);
      B.target('trophy', 14.9, top + 0.6);
      B.target('trophy', 14.9, g);
    } },
    { name: 'Stone fort', par: 2, pebbles: ['puff', 'big', 'puff', 'puff'], hint: 'Stone is heavy and tough. The big blue puffball hits harder.', build: function (B) {
      var y = B.cube('stone', 12.9, 0); B.cube('stone', 12.9, y);
      y = B.cube('stone', 15.3, 0); B.cube('stone', 15.3, y);
      B.target('trophy', 14.1, 0);
      var top = B.block('stone', 14.1, 1.2, 3.2, PLANK_T);
      top = B.hut('wood', 14.1, top);
      B.target('trophy', 14.1, top);
    } },
    { name: 'Tall tower', par: 1, pebbles: ['puff', 'puff', 'puff'], hint: 'Knock the bottom and the whole tower comes down.', build: function (B) {
      var y = B.hut('wood', 15, 0);
      B.target('trophy', 15, y);
      y = B.hut('wood', 15, y);
      y = B.hut('wood', 15, y);
      B.target('trophy', 15, y);
    } },
    { name: 'Behind the wall', par: 2, pebbles: ['puff', 'big', 'puff', 'puff'], hint: 'Lob it high over the wall.', build: function (B) {
      var y = 0;
      for (var i = 0; i < 4; i++) y = B.cube('stone', 11.2, y);
      y = B.hut('wood', 15.2, 0, 2.6);
      B.target('trophy', 14.6, y); B.target('trophy', 15.8, y);
      B.target('snowman', 15.2, 0);
    } },
    { name: 'Twin hills', par: 2, pebbles: ['puff', 'puff', 'big', 'puff'], hint: 'One target sits in the valley between the hills.', build: function (B) {
      var g = B.hill(9.3, 13.1, 1.4, 1.0);
      B.target('trophy', 11.2, B.hut('wood', 11.2, g, 1.6, 1.0));
      var g2 = B.hill(15.3, 19.9, 2.6, 1.3);
      var top = B.hut('ice', 17.6, g2, 2.0);
      B.target('snowman', 17.6, top);
      B.target('snowman', 14.2, 0);
    } },
    { name: 'Pyramid', par: 2, pebbles: ['puff', 'big', 'puff', 'puff'], hint: 'Stone at the bottom, wood in the middle, ice on top.', build: function (B) {
      var mats = ['stone', 'wood', 'wood', 'ice'], s = 0.6, row, i, y = 0;
      for (row = 0; row < 4; row++) {
        var count = 4 - row, x0 = 14.4 - (count - 1) * s / 2;
        for (i = 0; i < count; i++) B.cube(mats[row], x0 + i * s, y, s);
        y += s;
      }
      B.target('trophy', 14.4, y);
      B.target('snowman', 12.4, 0); B.target('snowman', 16.4, 0);
    } },
    { name: 'Snow castle', par: 3, pebbles: ['puff', 'big', 'puff', 'big', 'puff'], hint: 'The last castle. Plan your shots!', build: function (B) {
      var g = B.hill(10.6, 19.6, 1.2, 1.2);
      var y = B.cube('stone', 12.6, g); y = B.cube('stone', 12.6, y);
      B.target('snowman', 12.6, y);
      var top = B.hut('ice', 15.0, g, 2.2);
      B.target('trophy', 15.0, g);
      top = B.hut('wood', 15.0, top, 2.2);
      B.target('snowman', 15.0, top);
      y = B.cube('stone', 17.6, g); y = B.cube('ice', 17.6, y); y = B.cube('ice', 17.6, y);
      B.target('trophy', 17.6, y);
    } }
  ];

  /* Build a level and let it settle for a moment where nobody can see, so that when you look at it, every piece is
     already resting exactly where gravity wants it. Then everything is put to sleep: perfectly still until hit. */
  function buildLevel(index) {
    var world = new World();
    var ground = makeBody(boxShape(80, 2), 10, -1, 0, 0, { friction: 0.8, kind: 'ground' });
    world.add(ground);
    var B = new Builder(world);
    LEVELS[index].build(B);
    var moving = world.bodies.filter(function (b) { return !b.isStatic; });
    var start = moving.map(function (b) { return { x: b.x, y: b.y, a: b.a }; });
    var steps = 0;
    while (steps < 480) {
      world.step(STEP); steps++;
      if (steps > 30 && !world.bodies.some(active)) break;
    }
    var settleMove = 0;
    moving.forEach(function (b, i) {
      settleMove = Math.max(settleMove, Math.hypot(b.x - start[i].x, b.y - start[i].y), Math.abs(b.a - start[i].a));
      world.sleep(b);
      b.x0 = b.x; b.y0 = b.y; b.a0 = b.a;
      updateTransform(b);
    });
    return { world: world, blocks: B.blocks, targets: B.targets, hills: B.hills, settleSteps: steps, settleMove: settleMove };
  }
  /* A target counts as knocked down once it tips past about 50 degrees, drops half a metre, flies off the screen, or
     takes a hard knock. */
  function targetDown(t) {
    return t.knocked || Math.cos(t.a) < 0.6 || t.y < t.y0 - 0.45 || t.x < -2 || t.x > VIEW_W + 2 || t.y < -3;
  }
  /* Where the puffball sits in the slingshot for an aim (angle in radians, power from 0 to 1). */
  function pullPoint(angle, power, r) {
    var x = SLING_X - Math.cos(angle) * power * MAX_PULL, y = SLING_Y - Math.sin(angle) * power * MAX_PULL;
    return { x: x, y: Math.max(y, r + 0.05) };
  }

  /* One go at one level, with no drawing: the page draws it, and the automated check can play it on its own.
     Things that happen (a block breaks, a target falls) are put in `events` for the page to turn into sounds,
     sparkles and points. */
  function Play(index) {
    var L = buildLevel(index), self = this;
    this.index = index; this.level = LEVELS[index];
    this.world = L.world; this.blocks = L.blocks; this.targets = L.targets; this.hills = L.hills;
    this.queue = this.level.pebbles.slice();   // puffballs still to shoot; queue[0] is in the slingshot
    this.used = 0; this.score = 0; this.time = 0; this.acc = 0;
    this.pebble = null; this.pebbleSince = 0; this.slowFor = 0; this.lastRetire = -10;
    this.targetsLeft = this.targets.length;
    this.events = [];
    this.breakList = [];
    this.result = '';                           // '', 'won' or 'lost'
    this.endAt = 0;
    this.world.onImpact = function (ct, J) { self.impact(ct, J); };
  }
  Play.prototype.canLaunch = function () { return !this.result && !this.pebble && this.queue.length > 0 && this.targetsLeft > 0; };
  Play.prototype.launch = function (angle, power) {
    if (!this.canLaunch()) return null;
    var kind = this.queue.shift(), P = PUFFS[kind], at = pullPoint(angle, power, P.r);
    var b = makeBody(circleShape(P.r), at.x, at.y, 0, P.density, { friction: 0.7, restitution: 0.35, angDamp: 2.5, kind: 'pebble', data: { kind: kind } });
    b.vx = Math.cos(angle) * power * MAX_SPEED; b.vy = Math.sin(angle) * power * MAX_SPEED;
    this.world.add(b);
    this.pebble = b; this.pebbleSince = this.time; this.slowFor = 0; this.used++;
    this.trail = [];
    return b;
  };
  /* A hard knock: blocks lose toughness and may break; targets topple. */
  Play.prototype.impact = function (ct, J) {
    var pair = [ct.a, ct.b];
    for (var i = 0; i < 2; i++) {
      var b = pair[i];
      if (b.dead) continue;
      if (b.kind === 'block' && J > 0.35) {
        b.hp -= J;
        b.hitAt = this.time;
        if (b.hp <= 0 && this.breakList.indexOf(b) < 0) this.breakList.push(b);
      } else if (b.kind === 'target' && J > TARGET_TOUGH) {
        b.knocked = true;
      }
    }
    if (J > 0.6) {
      var other = ct.a.kind === 'block' ? ct.a : ct.b.kind === 'block' ? ct.b : ct.a.kind === 'target' ? ct.a : ct.b;
      this.events.push({ type: 'knock', mat: other.mat || other.kind, J: J, x: ct.wp0x, y: ct.wp0y });
    }
  };
  Play.prototype.update = function (dt) {
    if (dt > 0.05) dt = 0.05;
    this.acc += dt;
    var steps = 0;
    while (this.acc >= STEP && steps < 6) { this.tick(); this.acc -= STEP; steps++; }
    if (steps === 6) this.acc = 0;
  };
  Play.prototype.tick = function () {
    var w = this.world, i, b;
    w.step(STEP);
    this.time += STEP;
    /* broken blocks */
    for (i = 0; i < this.breakList.length; i++) {
      b = this.breakList[i];
      if (b.dead) continue;
      w.remove(b);
      this.score += MATERIALS[b.mat].points;
      this.events.push({ type: 'break', body: b, points: MATERIALS[b.mat].points });
    }
    this.breakList.length = 0;
    /* pieces that fell off the edge of the world */
    for (i = w.bodies.length - 1; i >= 0; i--) {
      b = w.bodies[i];
      if (b.kind === 'block' && (b.y < -4 || b.x < -4 || b.x > VIEW_W + 4)) w.remove(b);
    }
    /* targets */
    for (i = 0; i < this.targets.length; i++) {
      var t = this.targets[i];
      if (!t.down && targetDown(t)) {
        t.down = true; t.downAt = this.time;
        this.targetsLeft--;
        this.score += 1000;
        this.events.push({ type: 'target', body: t, points: 1000, left: this.targetsLeft });
      }
      if (t.down && !t.dead && this.time - t.downAt > 0.7) { w.remove(t); this.events.push({ type: 'poof', x: t.x, y: t.y, kind: t.data.kind }); }
    }
    /* the puffball in flight: record its path, and send it home once it has stopped */
    var p = this.pebble;
    if (p) {
      /* a dot every 30 cm along the path, so a slow roll does not smudge it */
      var tl = this.trail.length;
      if (tl < 400 && (tl === 0 || (p.x - this.trail[tl - 2]) * (p.x - this.trail[tl - 2]) + (p.y - this.trail[tl - 1]) * (p.y - this.trail[tl - 1]) > 0.09)) this.trail.push(p.x, p.y);
      var slow = p.vx * p.vx + p.vy * p.vy < 0.06 && Math.abs(p.w) < 1;
      this.slowFor = slow ? this.slowFor + STEP : 0;
      var out = p.x < -1 || p.x > VIEW_W + 1 || p.y < -2;
      if (out || !p.awake || this.slowFor > 0.5 || this.time - this.pebbleSince > 8) {
        if (!p.dead) w.remove(p);
        this.events.push({ type: 'retire', x: p.x, y: p.y, out: out, kind: p.data.kind });
        this.pebble = null; this.lastRetire = this.time;
        this.lastTrail = this.trail;
      }
    }
    /* the end of the level */
    if (!this.result) {
      if (this.targetsLeft === 0) {
        if (!this.endAt) this.endAt = this.time + 1.2;
        if (this.time >= this.endAt) this.finish('won');
      } else if (!this.pebble && this.queue.length === 0) {
        var calm = awakeCount(w) === 0, stillFalling = false;
        for (i = 0; i < this.targets.length; i++) if (this.targets[i].down && !this.targets[i].dead) stillFalling = true;
        if (!stillFalling && (calm || this.time - this.lastRetire > 4)) this.finish('lost');
      }
    }
  };
  Play.prototype.finish = function (how) {
    this.result = how;
    if (how === 'won') {
      this.bonus = this.queue.length * 1000;
      this.score += this.bonus;
      this.stars = this.used <= this.level.par ? 3 : this.used <= this.level.par + 1 ? 2 : 1;
    }
    this.events.push({ type: how });
  };

  /* For the automated check (the page never calls this): build a level, optionally wake everything, run the physics
     for some seconds with no input, and report how far anything moved and whether it all went back to sleep. */
  function settleReport(index, seconds, wakeAll) {
    var L = buildLevel(index), w = L.world, i, moved = 0, down = 0;
    if (wakeAll) w.bodies.forEach(function (b) { w.wake(b); });
    var steps = Math.round(seconds / STEP);
    for (i = 0; i < steps; i++) w.step(STEP);
    w.bodies.forEach(function (b) {
      if (b.isStatic) return;
      moved = Math.max(moved, Math.hypot(b.x - b.x0, b.y - b.y0), Math.abs(b.a - b.a0));
    });
    L.targets.forEach(function (t) { if (targetDown(t)) down++; });
    return { level: index + 1, name: LEVELS[index].name, settleSteps: L.settleSteps, settleMove: +L.settleMove.toFixed(4), moved: +moved.toFixed(5), awake: w.bodies.filter(active).length, targetsDown: down, bodies: w.bodies.length };
  }

  /* =====================================================================================================
     PART 3. THE GAME
     ===================================================================================================== */
  var CSS =
    '.game-slingshot { --ss-card-ink: #23272f; }' +
    '.game-slingshot .ss-top { display: flex; flex-wrap: wrap; gap: .4rem .8rem; align-items: center; justify-content: space-between; margin-bottom: .7rem; }' +
    '.game-slingshot .ss-hud { margin: 0; gap: .3rem 1rem; font-size: clamp(.95rem, .85rem + .4vw, 1.15rem); }' +
    '.game-slingshot .ss-hud strong { color: var(--gold); font-family: var(--font-poster); font-size: 1.2em; }' +
    '.game-slingshot .ss-hud .ss-lname { color: var(--ink); }' +
    '.game-slingshot .ss-device { position: relative; margin-inline: auto; padding: 16px 24px; border-radius: 30px; background: linear-gradient(150deg, #353b46, #14161b 70%); box-shadow: inset 0 0 0 2px #444b57, inset 0 2px 0 rgba(255,255,255,.08), var(--shadow); }' +
    '.game-slingshot .ss-device::before { content: ""; position: absolute; left: 9px; top: 50%; width: 7px; height: 7px; margin-top: -3.5px; border-radius: 50%; background: #0b0c0f; box-shadow: inset 0 0 0 2px #2a2f38; }' +
    '.game-slingshot .ss-stage { position: relative; border-radius: 12px; overflow: hidden; background: #a6dcff; }' +
    '.game-slingshot .ss-canvas { display: block; width: 100%; touch-action: auto; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: grab; }' +
    '.game-slingshot .ss-canvas.is-live { touch-action: none; }' +
    '.game-slingshot .ss-canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }' +
    '.game-slingshot .ss-overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: 10px; background: rgba(21, 23, 28, .28); }' +
    '.game-slingshot .ss-overlay[hidden] { display: none; }' +
    '.game-slingshot .ss-card { background: #fff; color: var(--ss-card-ink); border-radius: 20px; padding: .9rem 1.3rem 1rem; text-align: center; max-width: 25rem; max-height: 100%; overflow: auto; display: grid; gap: .45rem; justify-items: center; box-shadow: 0 10px 0 rgba(0,0,0,.12), 0 18px 40px rgba(0,0,0,.3); }' +
    '.game-slingshot .ss-kicker { margin: 0; font-weight: 800; font-size: .8rem; letter-spacing: .12em; text-transform: uppercase; color: #e0484d; }' +
    '.game-slingshot .ss-title { margin: 0; font-family: var(--font-poster); font-weight: 700; font-size: clamp(1.5rem, 1.1rem + 2vw, 2.4rem); line-height: 1.05; color: var(--ss-card-ink); }' +
    '.game-slingshot .ss-msg { margin: 0; font-weight: 600; line-height: 1.35; color: #3a404b; }' +
    '.game-slingshot .ss-msg:empty, .game-slingshot .ss-stars:empty { display: none; }' +
    '.game-slingshot .ss-stars { margin: 0; font-size: clamp(1.8rem, 1.4rem + 2vw, 2.6rem); line-height: 1; letter-spacing: .08em; color: #f2b200; }' +
    '.game-slingshot .ss-stars .off { color: #d6dbe2; }' +
    '.game-slingshot .ss-btns { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }' +
    '.game-slingshot .ss-card .btn:not(.btn-primary) { background: #eef1f5; color: var(--ss-card-ink); border-color: #d4d9e0; }' +
    '.game-slingshot .ss-big { min-height: 52px; font-size: 1.15rem; padding-inline: 1.6rem; }' +
    '.game-slingshot .ss-tools { display: flex; flex-wrap: wrap; gap: .6rem; justify-content: center; margin-top: .9rem; }' +
    '.game-slingshot .ss-levels-wrap { margin-top: 1rem; text-align: center; }' +
    '.game-slingshot .ss-levels-label { margin: 0 0 .45rem; font-weight: 800; color: var(--ink-muted); font-size: .9rem; letter-spacing: .08em; text-transform: uppercase; }' +
    '.game-slingshot .ss-levels { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .45rem; max-width: 36rem; margin-inline: auto; }' +
    '@media (min-width: 760px) { .game-slingshot .ss-levels { grid-template-columns: repeat(10, minmax(0, 1fr)); max-width: 46rem; } }' +
    '.game-slingshot .ss-lvl { min-height: 52px; border-radius: 14px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); font: 800 1.05rem/1.05 var(--font-head); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 4px 2px; cursor: pointer; }' +
    '.game-slingshot .ss-lvl:hover:not(:disabled) { border-color: var(--link); }' +
    '.game-slingshot .ss-lvl[aria-current="true"] { border-color: var(--era); box-shadow: 0 0 0 2px var(--era); }' +
    '.game-slingshot .ss-lvl .st { font-size: .72rem; letter-spacing: .04em; color: var(--gold); }' +
    '.game-slingshot .ss-lvl .st .off { color: var(--ink-faint); }' +
    '.game-slingshot .ss-lvl:disabled { opacity: .45; cursor: not-allowed; }' +
    '@media (max-width: 560px) { .game-slingshot .ss-device { padding: 6px; border-radius: 16px; } .game-slingshot .ss-device::before { display: none; } .game-slingshot .ss-overlay { padding: 5px; } .game-slingshot .ss-card { padding: .5rem .7rem .6rem; gap: .3rem; border-radius: 14px; } .game-slingshot .ss-title { font-size: 1.3rem; } .game-slingshot .ss-msg { font-size: .88rem; } .game-slingshot .ss-stars { font-size: 1.6rem; } .game-slingshot .ss-big { min-height: 44px; font-size: 1rem; padding-inline: 1.1rem; } .game-slingshot .ss-kicker { font-size: .7rem; } }';

  /* Colours of the scene: a bright flat 2010s phone-game day, drawn by us. */
  var COL = {
    skyTop: '#6cc4ff', skyMid: '#a9e0ff', skyLow: '#e3f7ff',
    sun: '#ffd84d', sunRing: 'rgba(255, 233, 140, .45)',
    farHill: '#9fe3cf', nearHill: '#6ed2b2',
    grass: '#3fbf6f', grassDark: '#2f9e59', soil: '#8a5a3a', soilDark: '#734a2f',
    wood: '#e3a157', woodEdge: '#8f5726', woodGrain: '#c9853f',
    ice: 'rgba(184, 236, 255, .86)', iceEdge: '#f2fcff', iceShine: 'rgba(255, 255, 255, .8)',
    stone: '#98a1ac', stoneEdge: '#5f6772', stoneDot: '#7d8792',
    crack: 'rgba(40, 24, 10, .75)',
    gold: '#ffc233', goldDark: '#c48a0e', goldShine: '#fff3c4',
    snow: '#ffffff', snowShade: '#d8e6f2', coal: '#23272f', carrot: '#ff8a1f', scarf: '#ff5a5f',
    puff: '#ff5a5f', puffFluff: '#ff8d90', big: '#3d8bff', bigFluff: '#7fb2ff', eye: '#ffffff', pupil: '#23272f', cheek: 'rgba(255, 180, 190, .9)',
    slingDark: '#7a4a24', sling: '#a8692f', band: '#ff5a5f', bandBack: '#c83f44',
    dot: '#ffffff', dotEdge: 'rgba(35, 39, 47, .55)', trail: 'rgba(255, 255, 255, .75)'
  };

  GamesInTime.register({
    id: 'slingshot',
    frame: 'none',
    /* Used only by the automated check: the page itself never calls these. */
    selfTest: { levels: LEVELS.length, settle: settleReport, Play: Play },
    mount: function (root, api) {
      var h = api.h;
      var reduced = !!api.reducedMotion;
      var destroyed = false;
      root.appendChild(h('style', null, CSS));

      /* ---------- saved progress ---------- */
      var progress = api.store.get('progress', null);
      if (!progress || !progress.stars) progress = { stars: [], best: [], fails: [] };
      function stars(i) { return progress.stars[i] || 0; }
      function unlocked(i) { return i === 0 || stars(i - 1) > 0 || (progress.fails[i - 1] || 0) >= 3 || stars(i) > 0; }
      function save() { api.store.set('progress', progress); }

      /* ---------- DOM ---------- */
      var lvlNameEl = h('span', { class: 'ss-lname' }, '');
      var scoreEl = h('strong', null, '0'), puffsEl = h('strong', null, '0'), targetsEl = h('strong', null, '0');
      var hud = h('div', { class: 'scoreboard ss-hud' }, h('span', null, lvlNameEl), h('span', null, 'Score ', scoreEl), h('span', null, 'Puffballs ', puffsEl), h('span', null, 'Targets ', targetsEl));
      var canvas = h('canvas', { class: 'ss-canvas', role: 'img', tabindex: '0', 'aria-label': 'Slingshot' });
      var ovKicker = h('p', { class: 'ss-kicker' }, '');
      var ovTitle = h('p', { class: 'ss-title' }, 'Slingshot');
      var ovStars = h('p', { class: 'ss-stars', 'aria-hidden': 'true' }, '');
      var ovMsg = h('p', { class: 'ss-msg' }, '');
      var ovMain = h('button', { class: 'btn btn-primary ss-big', type: 'button' }, '▶ Play');
      var ovAlt = h('button', { class: 'btn', type: 'button' }, 'Replay');
      var overlay = h('div', { class: 'ss-overlay' }, h('div', { class: 'ss-card', role: 'group', 'aria-label': 'Level card' }, ovKicker, ovTitle, ovStars, ovMsg, h('div', { class: 'ss-btns' }, ovMain, ovAlt)));
      var stage = h('div', { class: 'ss-stage' }, canvas, overlay);
      var device = h('div', { class: 'ss-device' }, stage);
      var restartBtn = h('button', { class: 'btn', type: 'button' }, '↺ Restart level');
      var levelsEl = h('div', { class: 'ss-levels', role: 'group', 'aria-label': 'Levels' });
      var note = h('p', { class: 'game-note' }, 'Drag back anywhere on the picture and let go to launch. Keyboard: Up and Down arrows aim, Left and Right set the power, Space launches, R restarts the level.');
      root.appendChild(h('div', { class: 'ss-top' }, hud));
      root.appendChild(device);
      root.appendChild(h('div', { class: 'ss-tools' }, restartBtn));
      root.appendChild(h('div', { class: 'ss-levels-wrap' }, h('p', { class: 'ss-levels-label' }, 'Levels'), levelsEl));
      root.appendChild(note);

      var ctx = canvas.getContext('2d');
      var bg = document.createElement('canvas');
      var cssW = 300, cssH = 170, dpr = 1, K = 15, viewTop = 10, FONT = 'system-ui, sans-serif';

      /* ---------- game state ---------- */
      var play = null, index = 0, state = 'menu';       // menu | play | won | lost
      var aimAngle = 0.55, aimPower = 0, aimShown = false, dragging = false, dragX = 0, dragY = 0, dragId = -1;
      var loadAt = 0, loadFrom = 0;                       // the next puffball hops into the slingshot
      var rafId = 0, lastT = 0, clock = 0;
      var shakeUntil = 0, shakePow = 0, lastKnockSound = 0, lastStretch = 0;
      var floaters = [];
      var resultShownFor = -1;

      /* particles, kept in plain arrays that are reused (no garbage in the hot loop) */
      var PMAX = 220, pN = 0;
      var px = new Float32Array(PMAX), py = new Float32Array(PMAX), pvx = new Float32Array(PMAX), pvy = new Float32Array(PMAX), plife = new Float32Array(PMAX), pmax = new Float32Array(PMAX), psize = new Float32Array(PMAX), prot = new Float32Array(PMAX), pkind = new Uint8Array(PMAX), pcol = [];
      function spawn(kind, x, y, vx, vy, life, size, colour) {
        if (pN >= PMAX) return;
        px[pN] = x; py[pN] = y; pvx[pN] = vx; pvy[pN] = vy; plife[pN] = life; pmax[pN] = life; psize[pN] = size; prot[pN] = api.random() * 6; pkind[pN] = kind; pcol[pN] = colour; pN++;
      }
      function burst(kind, x, y, n, speed, life, size, colour) {
        if (reduced) n = Math.min(n, 4);
        for (var i = 0; i < n; i++) {
          var a = api.random() * Math.PI * 2, s = speed * (0.4 + api.random() * 0.8);
          spawn(kind, x, y, Math.cos(a) * s, Math.sin(a) * s + (kind === 0 ? speed * 0.5 : 0), life * (0.7 + api.random() * 0.6), size * (0.6 + api.random() * 0.8), colour);
        }
      }
      function floatText(text, x, y, colour) {
        if (floaters.length > 6) floaters.shift();
        floaters.push({ text: text, x: x, y: y, born: clock, colour: colour || '#ffffff' });
      }

      /* ---------- layout ---------- */
      function readFont() {
        var cs = getComputedStyle(root);
        FONT = (cs.getPropertyValue('--font-poster').trim() || 'system-ui, sans-serif');
      }
      function resize() {
        var avail = Math.max(240, root.clientWidth || 300);
        var narrow = avail < 560;
        var pad = narrow ? 12 : 48;
        var aspect = narrow ? 0.68 : 0.5625;
        var vh = window.innerHeight || 800;
        var w = Math.min(avail - pad, Math.max(300, (vh * 0.7) / aspect));
        device.style.maxWidth = Math.round(w + pad) + 'px';
        cssW = Math.round(w); cssH = Math.round(w * aspect);
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.style.height = cssH + 'px';
        canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
        K = cssW / VIEW_W;
        viewTop = cssH / K - GROUND_SHOW;
        readFont();
        bakeBackground();
        draw();
        fitCard();
      }
      function sx(x) { return x * K; }
      function sy(y) { return (viewTop - y) * K; }

      /* ---------- the background: sky, sun, far hills, ground and this level's hills (baked once) ---------- */
      function bakeBackground() {
        bg.width = canvas.width; bg.height = canvas.height;
        var b = bg.getContext('2d');
        b.setTransform(dpr, 0, 0, dpr, 0, 0);
        var g = b.createLinearGradient(0, 0, 0, sy(0));
        g.addColorStop(0, COL.skyTop); g.addColorStop(0.6, COL.skyMid); g.addColorStop(1, COL.skyLow);
        b.fillStyle = g; b.fillRect(0, 0, cssW, cssH);
        /* the sun */
        var sunX = sx(VIEW_W * 0.86), sunY = sy(viewTop - 1.5), sunR = 0.75 * K;
        b.fillStyle = COL.sunRing; b.beginPath(); b.arc(sunX, sunY, sunR * 1.6, 0, Math.PI * 2); b.fill();
        b.fillStyle = COL.sun; b.beginPath(); b.arc(sunX, sunY, sunR, 0, Math.PI * 2); b.fill();
        /* rolling far hills */
        b.fillStyle = COL.farHill;
        b.beginPath(); b.moveTo(0, sy(0));
        for (var x = 0; x <= VIEW_W + 0.5; x += 0.5) b.lineTo(sx(x), sy(1.6 + Math.sin(x * 0.45 + 1) * 0.7 + Math.sin(x * 1.3) * 0.2));
        b.lineTo(cssW, sy(0)); b.closePath(); b.fill();
        b.fillStyle = COL.nearHill;
        b.beginPath(); b.moveTo(0, sy(0));
        for (x = 0; x <= VIEW_W + 0.5; x += 0.5) b.lineTo(sx(x), sy(0.7 + Math.sin(x * 0.7 + 2.2) * 0.4));
        b.lineTo(cssW, sy(0)); b.closePath(); b.fill();
        /* the ground */
        b.fillStyle = COL.soil; b.fillRect(0, sy(0), cssW, cssH - sy(0));
        b.fillStyle = COL.soilDark;
        for (x = 0.3; x < VIEW_W; x += 1.1) b.fillRect(sx(x), sy(-0.35 - (x * 7 % 3) * 0.08), 0.35 * K, 0.08 * K);
        b.fillStyle = COL.grass; b.fillRect(0, sy(0) - 1, cssW, 0.16 * K + 1);
        b.fillStyle = COL.grassDark; b.fillRect(0, sy(-0.16), cssW, Math.max(1, 0.04 * K));
        /* this level's hills */
        if (play) play.hills.forEach(function (hl) {
          b.fillStyle = COL.soil;
          b.beginPath();
          for (var i = 0; i < hl.xs.length; i++) b[i ? 'lineTo' : 'moveTo'](sx(hl.xs[i]), sy(hl.ys[i]));
          b.closePath(); b.fill();
          b.strokeStyle = COL.grass; b.lineWidth = 0.18 * K; b.lineJoin = 'round'; b.lineCap = 'round';
          b.beginPath(); b.moveTo(sx(hl.xs[0]), sy(0)); b.lineTo(sx(hl.xs[3]), sy(hl.ys[3])); b.lineTo(sx(hl.xs[2]), sy(hl.ys[2])); b.lineTo(sx(hl.xs[1]), sy(0)); b.stroke();
        });
      }

      /* ---------- drawing helpers ---------- */
      /* Draw in a body's own frame: (0, 0) is its centre, x along it, y up, units are metres. */
      var offX = 0, offY = 0;    // screen shake, in CSS pixels
      function bodyFrame(x, y, a) {
        var c = Math.cos(a), s = Math.sin(a), k = dpr * K;
        ctx.setTransform(k * c, -k * s, -k * s, -k * c, k * x + dpr * offX, k * (viewTop - y) + dpr * offY);
      }
      function screenFrame() { ctx.setTransform(dpr, 0, 0, dpr, dpr * offX, dpr * offY); }
      function rect(x, y, w, hh) { ctx.beginPath(); ctx.rect(x, y, w, hh); }

      function drawBlock(b, alpha) {
        var w = b.w0, hh = b.h0, M = b.mat, lw = 0.045;
        bodyFrame(b.x, b.y, b.a);
        ctx.globalAlpha = alpha;
        ctx.lineWidth = lw; ctx.lineJoin = 'round';
        if (M === 'wood') {
          ctx.fillStyle = COL.wood; rect(-w / 2, -hh / 2, w, hh); ctx.fill();
          ctx.strokeStyle = COL.woodGrain; ctx.lineWidth = 0.03; ctx.beginPath();
          if (w >= hh) { ctx.moveTo(-w / 2 + 0.12, -hh * 0.12); ctx.lineTo(w / 2 - 0.3, -hh * 0.12); ctx.moveTo(-w / 2 + 0.35, hh * 0.18); ctx.lineTo(w / 2 - 0.1, hh * 0.18); }
          else { ctx.moveTo(-w * 0.12, -hh / 2 + 0.12); ctx.lineTo(-w * 0.12, hh / 2 - 0.3); ctx.moveTo(w * 0.18, -hh / 2 + 0.35); ctx.lineTo(w * 0.18, hh / 2 - 0.1); }
          ctx.stroke();
          ctx.strokeStyle = COL.woodEdge; ctx.lineWidth = lw; rect(-w / 2, -hh / 2, w, hh); ctx.stroke();
        } else if (M === 'ice') {
          ctx.fillStyle = COL.ice; rect(-w / 2, -hh / 2, w, hh); ctx.fill();
          ctx.strokeStyle = COL.iceShine; ctx.lineWidth = 0.05; ctx.beginPath();
          var m = Math.min(w, hh) * 0.5;
          ctx.moveTo(-w / 2 + 0.08, hh / 2 - 0.08 - m * 0.6); ctx.lineTo(-w / 2 + 0.08 + m * 0.6, hh / 2 - 0.08); ctx.stroke();
          ctx.strokeStyle = COL.iceEdge; ctx.lineWidth = lw; rect(-w / 2, -hh / 2, w, hh); ctx.stroke();
        } else {
          ctx.fillStyle = COL.stone; rect(-w / 2, -hh / 2, w, hh); ctx.fill();
          ctx.fillStyle = COL.stoneDot;
          for (var i = 0; i < 4; i++) { var fx = ((b.seed * (i + 3) * 7.31) % 1) - 0.5, fy = ((b.seed * (i + 5) * 3.17) % 1) - 0.5; ctx.beginPath(); ctx.arc(fx * w * 0.75, fy * hh * 0.75, 0.04, 0, Math.PI * 2); ctx.fill(); }
          ctx.strokeStyle = COL.stoneEdge; ctx.lineWidth = lw; rect(-w / 2, -hh / 2, w, hh); ctx.stroke();
        }
        /* cracks show how close a piece is to breaking */
        var health = b.hp / MATERIALS[M].tough;
        if (health < 0.7) {
          ctx.strokeStyle = COL.crack; ctx.lineWidth = 0.03; ctx.beginPath();
          var L = Math.max(w, hh) / 2, vert = hh > w;
          for (var c = 0; c < (health < 0.35 ? 2 : 1); c++) {
            var o = (c ? -0.25 : 0.2) * L;
            if (vert) { ctx.moveTo(-w / 2, o); ctx.lineTo(-w * 0.1, o + 0.1); ctx.lineTo(w * 0.05, o - 0.06); ctx.lineTo(w * 0.3, o + 0.08); }
            else { ctx.moveTo(o, -hh / 2); ctx.lineTo(o + 0.1, -hh * 0.1); ctx.lineTo(o - 0.06, hh * 0.05); ctx.lineTo(o + 0.08, hh * 0.3); }
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      function drawTrophy(t, alpha) {
        bodyFrame(t.x, t.y, t.a);
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 0.035; ctx.strokeStyle = COL.goldDark; ctx.lineJoin = 'round';
        /* base and stem */
        ctx.fillStyle = COL.goldDark; rect(-0.22, -0.31, 0.44, 0.09); ctx.fill();
        ctx.fillStyle = COL.gold; rect(-0.16, -0.24, 0.32, 0.06); ctx.fill(); ctx.stroke();
        rect(-0.045, -0.18, 0.09, 0.13); ctx.fill(); ctx.stroke();
        /* handles */
        ctx.lineWidth = 0.05; ctx.strokeStyle = COL.gold;
        ctx.beginPath(); ctx.arc(-0.2, 0.14, 0.08, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(0.2, 0.14, 0.08, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
        /* the cup */
        ctx.fillStyle = COL.gold; ctx.strokeStyle = COL.goldDark; ctx.lineWidth = 0.035;
        ctx.beginPath(); ctx.moveTo(-0.21, 0.29); ctx.lineTo(0.21, 0.29); ctx.quadraticCurveTo(0.2, -0.06, 0, -0.06); ctx.quadraticCurveTo(-0.2, -0.06, -0.21, 0.29); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = COL.goldShine; ctx.beginPath(); ctx.moveTo(-0.13, 0.24); ctx.quadraticCurveTo(-0.12, 0.05, -0.05, 0.0); ctx.lineTo(-0.08, 0.24); ctx.closePath(); ctx.fill();
        /* a star on the front */
        ctx.fillStyle = COL.goldDark; star(0.04, 0.13, 0.06);
        ctx.globalAlpha = 1;
      }
      function star(x, y, r) {
        ctx.beginPath();
        for (var i = 0; i < 10; i++) { var a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill();
      }
      function drawSnowman(t, alpha) {
        bodyFrame(t.x, t.y, t.a);
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 0.03; ctx.strokeStyle = COL.snowShade;
        ctx.fillStyle = COL.snow;
        ctx.beginPath(); ctx.arc(0, -0.18, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0.17, 0.18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        /* buttons, scarf, face, hat */
        ctx.fillStyle = COL.coal;
        ctx.beginPath(); ctx.arc(0, -0.1, 0.03, 0, Math.PI * 2); ctx.arc(0, -0.22, 0.03, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COL.scarf; rect(-0.17, 0.0, 0.34, 0.07); ctx.fill(); rect(0.06, -0.14, 0.07, 0.16); ctx.fill();
        ctx.fillStyle = COL.coal;
        ctx.beginPath(); ctx.arc(-0.08, 0.21, 0.028, 0, Math.PI * 2); ctx.arc(0.04, 0.21, 0.028, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COL.carrot; ctx.beginPath(); ctx.moveTo(-0.02, 0.17); ctx.lineTo(-0.2, 0.14); ctx.lineTo(-0.02, 0.12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = COL.coal; rect(-0.15, 0.32, 0.3, 0.04); ctx.fill(); rect(-0.1, 0.35, 0.2, 0.08); ctx.fill();
        ctx.globalAlpha = 1;
      }
      /* A puffball: a round fluffy friend with a face. `mood` is 'ready', 'fly' or 'rest'. */
      function drawPuff(x, y, a, kind, mood) {
        var r = PUFFS[kind].r, body = kind === 'big' ? COL.big : COL.puff, fluff = kind === 'big' ? COL.bigFluff : COL.puffFluff, i;
        bodyFrame(x, y, a);
        ctx.fillStyle = fluff;
        ctx.beginPath();
        for (i = 0; i < 11; i++) { var t = i * Math.PI * 2 / 11; ctx.moveTo(Math.cos(t) * r * 0.82 + r * 0.24, Math.sin(t) * r * 0.82); ctx.arc(Math.cos(t) * r * 0.82, Math.sin(t) * r * 0.82, r * 0.24, 0, Math.PI * 2); }
        ctx.fill();
        ctx.fillStyle = body; ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2); ctx.fill();
        /* face */
        ctx.fillStyle = COL.cheek; ctx.beginPath(); ctx.arc(-r * 0.5, -r * 0.12, r * 0.13, 0, Math.PI * 2); ctx.arc(r * 0.5, -r * 0.12, r * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COL.eye; ctx.beginPath(); ctx.arc(-r * 0.26, r * 0.16, r * 0.2, 0, Math.PI * 2); ctx.arc(r * 0.26, r * 0.16, r * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COL.pupil; ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.15, r * 0.1, 0, Math.PI * 2); ctx.arc(r * 0.32, r * 0.15, r * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = COL.pupil; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
        ctx.beginPath();
        if (mood === 'fly') { ctx.fillStyle = COL.pupil; ctx.ellipse(0, -r * 0.3, r * 0.15, r * 0.12, 0, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.moveTo(-r * 0.2, -r * 0.24); ctx.quadraticCurveTo(0, -r * 0.46, r * 0.2, -r * 0.24); ctx.stroke(); }
      }
      function drawSlingBack() {
        bodyFrame(0, 0, 0);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = COL.slingDark; ctx.lineWidth = 0.2;
        ctx.beginPath(); ctx.moveTo(SLING_X + 0.02, 0); ctx.lineTo(SLING_X, 1.3); ctx.lineTo(SLING_X + 0.2, 1.92); ctx.stroke();
        ctx.strokeStyle = COL.sling; ctx.lineWidth = 0.12;
        ctx.beginPath(); ctx.moveTo(SLING_X + 0.02, 0.05); ctx.lineTo(SLING_X, 1.3); ctx.lineTo(SLING_X + 0.2, 1.9); ctx.stroke();
      }
      function drawSlingFront() {
        bodyFrame(0, 0, 0);
        ctx.lineCap = 'round';
        ctx.strokeStyle = COL.slingDark; ctx.lineWidth = 0.2;
        ctx.beginPath(); ctx.moveTo(SLING_X, 1.3); ctx.lineTo(SLING_X - 0.22, 1.88); ctx.stroke();
        ctx.strokeStyle = COL.sling; ctx.lineWidth = 0.12;
        ctx.beginPath(); ctx.moveTo(SLING_X, 1.3); ctx.lineTo(SLING_X - 0.22, 1.86); ctx.stroke();
      }
      function bands(x, y, r, back) {
        bodyFrame(0, 0, 0);
        ctx.lineCap = 'round';
        ctx.strokeStyle = back ? COL.bandBack : COL.band; ctx.lineWidth = 0.09;
        ctx.beginPath();
        if (back) { ctx.moveTo(SLING_X + 0.2, 1.9); ctx.lineTo(x - r * 0.7, y); }
        else { ctx.moveTo(SLING_X - 0.22, 1.86); ctx.lineTo(x - r * 0.7, y); }
        ctx.stroke();
      }

      /* ---------- one frame ---------- */
      function draw() {
        if (destroyed || !cssW) return;
        offX = offY = 0;
        if (!reduced && clock < shakeUntil) { var kk = (shakeUntil - clock) / 0.3 * shakePow; offX = Math.round(Math.sin(clock * 90) * 5 * kk); offY = Math.round(Math.cos(clock * 77) * 3 * kk); }
        ctx.setTransform(1, 0, 0, 1, offX * dpr, offY * dpr);
        ctx.drawImage(bg, 0, 0);
        screenFrame();
        /* drifting clouds */
        ctx.fillStyle = 'rgba(255, 255, 255, .92)';
        for (var c = 0; c < 4; c++) {
          var cw = (2.2 + c * 0.5) * K, cx = (((c * 5.7 + (reduced ? 0 : clock * (0.12 + c * 0.03))) % (VIEW_W + 4)) - 2) * K, cy = sy(viewTop - 0.9 - (c % 2) * 1.4 - c * 0.25);
          ctx.beginPath();
          ctx.ellipse(cx, cy, cw * 0.5, cw * 0.17, 0, 0, Math.PI * 2);
          ctx.ellipse(cx - cw * 0.16, cy - cw * 0.12, cw * 0.2, cw * 0.17, 0, 0, Math.PI * 2);
          ctx.ellipse(cx + cw * 0.13, cy - cw * 0.16, cw * 0.24, cw * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if (!play) return;
        var i, b, list = play.world.bodies;
        /* the last shot's path, then this shot's */
        drawTrail(play.lastTrail, 0.45);
        if (play.pebble) drawTrail(play.trail, 0.85);
        /* the slingshot (back half) */
        drawSlingBack();
        /* puffballs waiting their turn */
        var waiting = play.queue.length - (loaded() ? 1 : 0), hop = loadProgress();
        for (i = 0; i < waiting; i++) {
          var kind = play.queue[(loaded() ? 1 : 0) + i];
          var wx = SLING_X - 0.75 - i * 0.58, bob = reduced ? 0 : Math.abs(Math.sin(clock * 3 + i * 1.3)) * 0.06;
          drawPuff(wx, PUFFS[kind].r + bob, 0, kind, 'rest');
        }
        /* the loaded puffball, pulled back by the aim */
        if (play.queue.length && !play.result) {
          var lk = play.queue[0], r = PUFFS[lk].r, at = pullPoint(aimAngle, aimShown ? aimPower : 0, r);
          if (hop < 1) {
            var fx0 = SLING_X - 0.75, fy0 = r;
            at = { x: fx0 + (at.x - fx0) * hop, y: fy0 + (at.y - fy0) * hop + Math.sin(hop * Math.PI) * 1.2 };
          }
          bands(at.x, at.y, r, true);
          drawPuff(at.x, at.y, 0, lk, 'ready');
          bands(at.x, at.y, r, false);
          if (aimShown && aimPower > 0 && hop >= 1) drawPreview(at);
        }
        drawSlingFront();
        /* blocks and targets */
        for (i = 0; i < list.length; i++) {
          b = list[i];
          if (b.kind === 'block') drawBlock(b, 1);
        }
        for (i = 0; i < play.targets.length; i++) {
          b = play.targets[i];
          if (b.dead) continue;
          var al = b.down ? Math.max(0, 1 - (play.time - b.downAt) / 0.7) : 1;
          if (b.data.kind === 'trophy') drawTrophy(b, al); else drawSnowman(b, al);
        }
        /* the puffball in flight */
        var p = play.pebble;
        if (p) {
          drawPuff(p.x, p.y, p.a, p.data.kind, Math.hypot(p.vx, p.vy) > 4 ? 'fly' : 'rest');
          if (p.y - p.shape.r > viewTop) {
            /* above the top of the screen: show a little arrow where it is */
            screenFrame();
            ctx.fillStyle = p.data.kind === 'big' ? COL.big : COL.puff;
            var ax = sx(p.x);
            ctx.beginPath(); ctx.moveTo(ax, 3); ctx.lineTo(ax - 8, 15); ctx.lineTo(ax + 8, 15); ctx.closePath(); ctx.fill();
          }
        }
        drawParticles();
        /* floating points */
        screenFrame();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        for (i = 0; i < floaters.length; i++) {
          var f = floaters[i], age = clock - f.born, size = Math.max(14, Math.min(30, K * 0.75));
          if (age > 1.1) continue;
          ctx.globalAlpha = Math.min(1, (1.1 - age) * 3);
          ctx.font = '700 ' + Math.round(size) + 'px ' + FONT;
          var fy = sy(f.y) - (reduced ? 0 : age * 34);
          ctx.strokeStyle = 'rgba(35, 39, 47, .7)'; ctx.lineWidth = 4; ctx.strokeText(f.text, sx(f.x), fy);
          ctx.fillStyle = f.colour; ctx.fillText(f.text, sx(f.x), fy);
        }
        ctx.globalAlpha = 1;
        /* aim readout */
        if (state === 'play' && aimShown && aimPower > 0 && loaded()) {
          var label = Math.round(aimPower * 100) + '% · ' + Math.round(aimAngle * 180 / Math.PI) + '°';
          ctx.font = '700 ' + Math.round(Math.max(13, Math.min(20, K * 0.5))) + 'px ' + FONT;
          ctx.textAlign = 'left';
          ctx.strokeStyle = 'rgba(35, 39, 47, .75)'; ctx.lineWidth = 4; ctx.strokeText(label, sx(SLING_X - 1.6), sy(3.0));
          ctx.fillStyle = '#ffffff'; ctx.fillText(label, sx(SLING_X - 1.6), sy(3.0));
        }
      }
      function drawTrail(arr, alpha) {
        if (!arr || !arr.length) return;
        screenFrame();
        ctx.fillStyle = COL.trail; ctx.globalAlpha = alpha;
        var rr = Math.max(1.5, K * 0.06);
        for (var i = 0; i < arr.length; i += 2) { ctx.beginPath(); ctx.arc(sx(arr[i]), sy(arr[i + 1]), rr, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      /* The dotted aim line: only the first part of the flight, so you still have to judge the rest. */
      function drawPreview(at) {
        var vx = Math.cos(aimAngle) * aimPower * MAX_SPEED, vy = Math.sin(aimAngle) * aimPower * MAX_SPEED;
        screenFrame();
        for (var i = 1; i <= 12; i++) {
          var t = i * 0.05, x = at.x + vx * t, y = at.y + vy * t + 0.5 * GRAVITY * t * t;
          if (y < 0) break;
          var rr = Math.max(2, K * (0.11 - i * 0.005));
          ctx.globalAlpha = 1 - i * 0.055;
          ctx.fillStyle = COL.dotEdge; ctx.beginPath(); ctx.arc(sx(x), sy(y), rr + 1.2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = COL.dot; ctx.beginPath(); ctx.arc(sx(x), sy(y), rr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      var DEBRIS = { wood: COL.wood, ice: '#c9f1ff', stone: COL.stone };
      function drawParticles() {
        if (!pN) return;
        screenFrame();
        for (var i = 0; i < pN; i++) {
          var k = plife[i] / pmax[i], s = psize[i] * K, X = sx(px[i]), Y = sy(py[i]);
          if (pkind[i] === 0) {           // a chip of a broken block
            ctx.globalAlpha = Math.min(1, k * 2);
            ctx.fillStyle = pcol[i];
            ctx.save(); ctx.translate(X, Y); ctx.rotate(prot[i]); ctx.fillRect(-s / 2, -s / 3, s, s * 0.66); ctx.restore();
          } else if (pkind[i] === 1) {    // a sparkle
            ctx.globalAlpha = k;
            ctx.fillStyle = pcol[i];
            ctx.beginPath(); ctx.arc(X, Y, s * (0.5 + k * 0.5), 0, Math.PI * 2); ctx.fill();
          } else {                        // a soft puff of dust
            ctx.globalAlpha = k * 0.8;
            ctx.fillStyle = pcol[i];
            ctx.beginPath(); ctx.arc(X, Y, s * (1.6 - k), 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }
      function stepParticles(dt) {
        for (var i = 0; i < pN; i++) {
          plife[i] -= dt;
          if (plife[i] <= 0) {
            pN--;
            px[i] = px[pN]; py[i] = py[pN]; pvx[i] = pvx[pN]; pvy[i] = pvy[pN]; plife[i] = plife[pN]; pmax[i] = pmax[pN]; psize[i] = psize[pN]; prot[i] = prot[pN]; pkind[i] = pkind[pN]; pcol[i] = pcol[pN];
            i--; continue;
          }
          if (pkind[i] === 0) pvy[i] += GRAVITY * dt;
          else if (pkind[i] === 2) { pvx[i] *= 0.94; pvy[i] *= 0.94; }
          px[i] += pvx[i] * dt; py[i] += pvy[i] * dt; prot[i] += dt * 6;
        }
      }

      /* ---------- the loaded puffball ---------- */
      function loaded() { return !!play && !play.pebble && play.queue.length > 0 && !play.result && play.targetsLeft > 0; }
      function loadProgress() { if (!loadAt) return 1; return Math.max(0, Math.min(1, (clock - loadFrom) / (loadAt - loadFrom))); }
      function readyToShoot() { return state === 'play' && loaded() && loadProgress() >= 1; }

      /* ---------- the loop ---------- */
      function frame(now) {
        rafId = 0;
        if (destroyed) return;
        var dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
        lastT = now;
        clock += dt;
        if (play && (state === 'play' || state === 'won' || state === 'lost')) {
          play.update(dt);
          handleEvents();
        }
        if (loadAt && clock >= loadAt) { loadAt = 0; afterLoad(); }
        stepParticles(dt);
        draw();
        syncData();
        if (wantLoop()) rafId = requestAnimationFrame(frame);
      }
      function wantLoop() {
        if (destroyed || document.hidden) return false;
        if (state === 'play') return true;
        if (pN > 0 || clock - (floaters.length ? floaters[floaters.length - 1].born : -9) < 1.2) return true;
        return !!play && awakeCount(play.world) > 0;
      }
      function startLoop() { if (!rafId && !destroyed && !document.hidden) { lastT = performance.now(); rafId = requestAnimationFrame(frame); } }
      function stopLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

      /* ---------- what happened this frame ---------- */
      var TARGET_NAME = { trophy: 'trophy', snowman: 'snowman' };
      function handleEvents() {
        var ev = play.events;
        for (var i = 0; i < ev.length; i++) {
          var e = ev[i];
          if (e.type === 'knock') {
            if (clock - lastKnockSound > 0.07) {
              lastKnockSound = clock;
              if (e.mat === 'stone') api.sound('thud');
              else if (e.mat === 'ice') { api.sound('chalk'); api.tone(1700 + api.random() * 500, 0.06, 'triangle', 0.05); }
              else api.sound('clack');
            }
            if (e.J > 1.2) burst(2, e.x, e.y, 3, 0.8, 0.5, 0.12, 'rgba(255, 255, 255, .8)');
            if (e.J > 3 && !reduced) { shakeUntil = clock + 0.25; shakePow = Math.min(1, e.J / 8); }
          } else if (e.type === 'break') {
            var bb = e.body, n = Math.round(6 + bb.w0 * bb.h0 * 14);
            burst(0, bb.x, bb.y, n, 3.2, 0.9, 0.16, DEBRIS[bb.mat]);
            if (bb.mat === 'ice') { api.tone(2300, 0.09, 'triangle', 0.06); api.sound('chalk'); }
            else if (bb.mat === 'stone') { api.sound('thud'); api.sound('dice'); }
            else { api.sound('clack'); api.tone(140, 0.12, 'square', 0.04); }
            floatText('+' + e.points, bb.x, bb.y + 0.3, '#ffffff');
            updateHud();
          } else if (e.type === 'target') {
            var t = e.body;
            api.sound('coin');
            burst(1, t.x, t.y + 0.2, 14, 2.4, 0.8, 0.09, COL.gold);
            floatText('+1000', t.x, t.y + 0.7, COL.gold);
            if (!reduced) { shakeUntil = clock + 0.3; shakePow = 0.6; }
            var nm = TARGET_NAME[t.data.kind];
            api.status(e.left ? 'Down goes the ' + nm + '! ' + e.left + ' to go.' : 'Down goes the last ' + nm + '!');
            updateHud();
          } else if (e.type === 'poof') {
            burst(2, e.x, e.y, 8, 1.2, 0.6, 0.2, 'rgba(255, 255, 255, .9)');
            api.sound('pop');
          } else if (e.type === 'retire') {
            if (!e.out) { burst(2, e.x, e.y, 7, 1, 0.55, 0.18, 'rgba(255, 255, 255, .9)'); burst(1, e.x, e.y, 6, 1.5, 0.6, 0.06, '#ffffff'); api.sound('pop'); }
            if (play.queue.length && play.targetsLeft > 0) {
              loadFrom = clock + (reduced ? 0 : 0.25); loadAt = loadFrom + (reduced ? 0.01 : 0.35);
              if (play.targetsLeft) api.status(puffWords(play.queue.length) + ' left. Pull back and let go.');
            } else if (play.targetsLeft > 0) {
              api.status('Out of puffballs. Waiting for everything to settle…');
            }
            updateHud();
          } else if (e.type === 'won') {
            onWon();
          } else if (e.type === 'lost') {
            onLost();
          }
        }
        ev.length = 0;
      }
      function afterLoad() { api.sound('tick'); }
      function puffWords(n) { return n === 1 ? '1 puffball' : n + ' puffballs'; }
      function targetWords(n) { return n === 1 ? '1 target' : n + ' targets'; }

      /* ---------- input: drag back to aim ---------- */
      function pullScale() { return Math.max(70, Math.min(170, cssW * 0.17)); }
      function onDown(e) {
        if (e.button > 0) return;
        api.unlockSound();
        if (state !== 'play' || !readyToShoot() || dragging) return;
        e.preventDefault();
        dragging = true; dragId = e.pointerId; dragX = e.clientX; dragY = e.clientY;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        aimShown = true; aimPower = 0;
        api.sound('tick');
        canvas.focus({ preventScroll: true });
      }
      function onMove(e) {
        if (!dragging || e.pointerId !== dragId) return;
        e.preventDefault();
        var dx = e.clientX - dragX, dy = e.clientY - dragY, d = Math.hypot(dx, dy);
        aimPower = Math.min(1, d / pullScale());
        if (d > 4) aimAngle = clampAngle(Math.atan2(dy, -dx));
        if (Math.abs(aimPower - lastStretch) > 0.12) { lastStretch = aimPower; api.tone(160 + aimPower * 260, 0.05, 'triangle', 0.035); }
        api.status('Power ' + Math.round(aimPower * 100) + '%, angle ' + Math.round(aimAngle * 180 / Math.PI) + '°. Let go to launch.');
        if (!rafId) startLoop();
      }
      function onUp(e) {
        if (!dragging || e.pointerId !== dragId) return;
        dragging = false; dragId = -1;
        if (e.type === 'pointercancel' || aimPower < 0.12) {
          aimPower = 0; aimShown = false;
          api.status('Pull back further, then let go to launch.');
          return;
        }
        launch();
      }
      function clampAngle(a) {
        var lo = -45 * Math.PI / 180, hi = 80 * Math.PI / 180;
        if (a > hi) return a > Math.PI * 0.75 ? lo : hi;
        if (a < lo) return a < -Math.PI * 0.75 ? hi : lo;
        return a;
      }
      function launch() {
        if (!readyToShoot()) return;
        var b = play.launch(aimAngle, aimPower);
        if (!b) return;
        api.sound('whoosh');
        api.tone(330 + aimPower * 220, 0.12, 'square', 0.05);
        floatText('Wheee!', b.x + 0.4, b.y + 0.7, '#ffffff');
        aimShown = false;
        api.status('Launched at ' + Math.round(aimPower * 100) + '% power, ' + Math.round(aimAngle * 180 / Math.PI) + '°. ' + targetWords(play.targetsLeft) + ' to go.');
        updateHud();
        startLoop();
      }
      /* keyboard: arrows aim, Space launches */
      function onKey(e) {
        if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
        var tgt = e.target, k = e.key;
        if (tgt && tgt.closest && tgt.closest('input, select, textarea')) return;
        var inRoot = !!(tgt && root.contains(tgt));
        var mine = inRoot || !tgt || tgt === document.body;
        if (!mine) return;
        if ((k === 'r' || k === 'R') && play && state !== 'menu') { e.preventDefault(); restart(); return; }
        if (state !== 'play') {
          if ((k === ' ' || k === 'Enter') && tgt === canvas) { e.preventDefault(); ovMain.click(); }
          return;
        }
        var step = e.shiftKey ? 6 : 2, used = true;
        if (k === 'ArrowUp') aimAngle = Math.min(80, Math.round(aimAngle * 180 / Math.PI) + step) * Math.PI / 180;
        else if (k === 'ArrowDown') aimAngle = Math.max(-45, Math.round(aimAngle * 180 / Math.PI) - step) * Math.PI / 180;
        else if (k === 'ArrowRight') aimPower = Math.min(1, Math.round(aimPower * 100 + (e.shiftKey ? 10 : 5)) / 100);
        else if (k === 'ArrowLeft') aimPower = Math.max(0, Math.round(aimPower * 100 - (e.shiftKey ? 10 : 5)) / 100);
        else if (k === ' ' || k === 'Enter') {
          e.preventDefault();
          if (aimShown && aimPower >= 0.12) launch();
          else api.status('Set the power first: press the Right arrow to pull back.');
          return;
        } else used = false;
        if (!used) return;
        e.preventDefault();
        if (!aimShown) { aimShown = true; if (aimPower < 0.12) aimPower = 0.6; }
        api.tone(160 + aimPower * 260, 0.04, 'triangle', 0.03);
        api.status('Power ' + Math.round(aimPower * 100) + '%, angle ' + Math.round(aimAngle * 180 / Math.PI) + '°. Space to launch.');
        startLoop();
      }

      /* ---------- levels and cards ---------- */
      function loadLevel(i, show) {
        index = Math.max(0, Math.min(LEVELS.length - 1, i));
        api.store.set('level', index);
        play = new Play(index);
        aimShown = false; aimPower = 0; dragging = false; loadAt = 0; pN = 0; floaters.length = 0;
        state = 'menu';
        bakeBackground();
        describe();
        updateHud();
        renderLevels();
        if (show !== false) showIntro();
        draw();
        syncData();
      }
      function describe() {
        var L = LEVELS[index], mats = {}, kinds = {};
        play.blocks.forEach(function (b) { mats[b.mat] = true; });
        play.targets.forEach(function (t) { kinds[t.data.kind] = (kinds[t.data.kind] || 0) + 1; });
        var parts = Object.keys(kinds).map(function (k) { return kinds[k] + ' ' + (k === 'trophy' ? (kinds[k] > 1 ? 'gold trophies' : 'gold trophy') : (kinds[k] > 1 ? 'snowmen' : 'snowman')); });
        canvas.setAttribute('aria-label', 'Slingshot, level ' + (index + 1) + ', ' + L.name + '. A slingshot on the left with ' + puffWords(L.pebbles.length) + '. On the right, towers of ' + Object.keys(mats).join(', ') + (play.hills.length ? ' on hills' : '') + ', holding ' + parts.join(' and ') + '.');
      }
      function starText(n) { var s = ''; for (var i = 0; i < 3; i++) s += i < n ? '★' : '☆'; return s; }
      function setStars(el, n) {
        el.replaceChildren();
        for (var i = 0; i < 3; i++) el.appendChild(h('span', { class: i < n ? '' : 'off' }, i < n ? '★' : '☆'));
      }
      function showCard(kicker, title, starsN, msg, main, alt) {
        ovKicker.textContent = kicker; ovTitle.textContent = title;
        if (starsN == null) ovStars.replaceChildren(); else setStars(ovStars, starsN);
        ovMsg.textContent = msg || '';
        ovMain.textContent = main[0]; ovMain.onclick = main[1];
        if (alt) { ovAlt.hidden = false; ovAlt.textContent = alt[0]; ovAlt.onclick = alt[1]; } else ovAlt.hidden = true;
        overlay.hidden = false;
        canvas.classList.remove('is-live');
        fitCard();
      }
      function showIntro() {
        var L = LEVELS[index], best = stars(index);
        showCard('Level ' + (index + 1) + ' of ' + LEVELS.length, L.name, best ? best : null, L.hint + ' ' + puffWords(L.pebbles.length) + '. Three stars if you need ' + (L.par === 1 ? 'only one.' : L.par + ' or fewer.'), ['▶ Play', begin], null);
        api.status('Level ' + (index + 1) + ': ' + L.name + '. Press Play.');
      }
      function begin() {
        api.unlockSound();
        if (state === 'menu' && play && play.used === 0) { /* fresh */ } else loadLevel(index, false);
        state = 'play';
        overlay.hidden = true;
        canvas.classList.add('is-live');
        api.sound('click');
        loadAt = 0;
        api.status('Drag back and let go to launch. ' + puffWords(play.queue.length) + ', ' + targetWords(play.targetsLeft) + ' to knock down.');
        updateHud();
        try { canvas.focus({ preventScroll: true }); } catch (err) { /* ignore */ }
        startLoop();
      }
      function restart() { loadLevel(index, false); begin(); }
      function onWon() {
        state = 'won';
        var n = play.stars, first = !stars(index);
        var newBest = (play.score > (progress.best[index] || 0));
        progress.stars[index] = Math.max(stars(index), n);
        progress.best[index] = Math.max(progress.best[index] || 0, play.score);
        save();
        renderLevels();
        updateHud();
        var last = index === LEVELS.length - 1;
        var msg = 'Score ' + play.score.toLocaleString('en-AU') + (play.bonus ? ' (with ' + play.bonus.toLocaleString('en-AU') + ' for puffballs left over)' : '') + '.' + (newBest && !first ? ' A new best!' : '');
        showCard(last ? 'Every level cleared!' : 'Level ' + (index + 1) + ' cleared', n === 3 ? 'Perfect!' : n === 2 ? 'Great shooting!' : 'You did it!', n, msg,
          last ? ['▶ Play level 1', function () { loadLevel(0, false); begin(); }] : ['Next level ▶', function () { loadLevel(index + 1, false); begin(); }],
          ['↺ Replay', restart]);
        api.status('Level cleared with ' + puffWords(play.used) + '. ' + n + (n === 1 ? ' star' : ' stars') + '. Score ' + play.score + '.');
        api.celebrate(last ? 'Every level cleared! ' + starText(n) : 'Level ' + (index + 1) + ' cleared! ' + starText(n));
        startLoop();
      }
      function onLost() {
        state = 'lost';
        var wasOpen = index + 1 < LEVELS.length && unlocked(index + 1);
        progress.fails[index] = (progress.fails[index] || 0) + 1;
        save();
        renderLevels();
        var left = play.targetsLeft, opened = !wasOpen && index + 1 < LEVELS.length && unlocked(index + 1);
        showCard('Out of puffballs', 'So close!', null, (left === 1 ? 'One target is still standing.' : left + ' targets are still standing.') + ' Try hitting the bottom of a tower.' + (opened ? ' Level ' + (index + 2) + ' is open now too, if you want to come back later.' : ''), ['↺ Try again', restart], opened ? ['Level ' + (index + 2) + ' ▶', function () { loadLevel(index + 1, false); begin(); }] : null);
        api.sound('lose');
        api.status('Out of puffballs, with ' + targetWords(left) + ' still standing. Have another go!');
      }
      function renderLevels() {
        levelsEl.replaceChildren();
        LEVELS.forEach(function (L, i) {
          var open = unlocked(i), s = stars(i);
          var st = h('span', { class: 'st', 'aria-hidden': 'true' });
          for (var j = 0; j < 3; j++) st.appendChild(h('span', { class: j < s ? '' : 'off' }, j < s ? '★' : '☆'));
          var btn = h('button', { class: 'ss-lvl', type: 'button', 'aria-label': 'Level ' + (i + 1) + ', ' + L.name + (open ? (s ? ', ' + s + (s === 1 ? ' star' : ' stars') : ', not cleared yet') : ', locked'), 'aria-current': i === index ? 'true' : 'false', disabled: !open, onclick: function () { loadLevel(i); try { ovMain.focus({ preventScroll: true }); } catch (err) { /* ignore */ } } },
            h('span', null, open ? String(i + 1) : '🔒'), st);
          levelsEl.appendChild(btn);
        });
      }
      function updateHud() {
        if (!play) return;
        lvlNameEl.textContent = 'Level ' + (index + 1) + ' · ' + LEVELS[index].name;
        scoreEl.textContent = play.score.toLocaleString('en-AU');
        puffsEl.textContent = String(play.queue.length);
        targetsEl.textContent = String(play.targetsLeft);
      }
      /* If the card is taller than the picture on a small screen, drop the message line (the status line says it). */
      function fitCard() {
        ovMsg.hidden = false;
        var card = ovMsg.parentNode;
        if (!overlay.hidden && card && card.scrollHeight > card.clientHeight + 1) ovMsg.hidden = true;
      }
      /* Read-only numbers for the automated check. */
      function syncData() {
        if (!play) return;
        var d = canvas.dataset, moved = 0, list = play.world.bodies;
        for (var i = 0; i < list.length; i++) { var b = list[i]; if (b.kind === 'block' || b.kind === 'target') moved = Math.max(moved, Math.hypot(b.x - b.x0, b.y - b.y0)); }
        d.state = state; d.level = String(index + 1); d.awake = String(awakeCount(play.world));
        d.targets = String(play.targetsLeft); d.pebbles = String(play.queue.length); d.moved = String(Math.round(moved * 1000)); d.score = String(play.score);
        d.ready = readyToShoot() ? '1' : '0'; d.flying = play.pebble ? '1' : '0'; d.stars = String(play.stars || 0);
      }

      /* ---------- wiring ---------- */
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      function noMenu(e) { e.preventDefault(); }
      canvas.addEventListener('contextmenu', noMenu);
      restartBtn.addEventListener('click', function () { restart(); });
      document.addEventListener('keydown', onKey);
      function onVisibility() {
        if (document.hidden) { stopLoop(); dragging = false; }
        else { draw(); if (wantLoop()) startLoop(); }
      }
      document.addEventListener('visibilitychange', onVisibility);
      var lastW = 0, lastDpr = 0;
      function maybeResize() {
        var w = Math.round(root.clientWidth), r = Math.min(2, window.devicePixelRatio || 1);
        if (w && (w !== lastW || r !== lastDpr)) { lastW = w; lastDpr = r; resize(); }
      }
      var ro = new ResizeObserver(maybeResize);
      ro.observe(root);
      window.addEventListener('resize', maybeResize);
      if (document.fonts && document.fonts.load) document.fonts.load('700 20px Fredoka').then(function () { if (!destroyed) { readFont(); draw(); } }, function () {});

      var startAt = api.store.get('level', 0) | 0;
      if (!unlocked(startAt)) startAt = 0;
      index = startAt;
      play = new Play(index);
      maybeResize();
      loadLevel(index);

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
