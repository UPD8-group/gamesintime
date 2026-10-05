/* Skyline for Games in Time (the 1990s hall).

   Two friends stand on the rooftops of a night-time city and take turns throwing water balloons at each other. Choose
   an angle and a speed; the balloon flies under gravity and is pushed by the wind (watch the flag). A direct hit is
   a big, harmless SPLOOSH and a point. First to 3 wins. Play the computer (Easy, Normal or Hard) or a friend.

   The mechanic is the turn-based "artillery" game that shipped with home computers in 1991 and became a craze on
   school computers; the city, characters, names and look here are our own. Nobody gets hurt: everyone just gets wet.

   The file has two parts:
   1. The city and the flying balloon, plus the computer players (no drawing, so the automated check can test them).
   2. The game: drawing, controls, turns and scores.
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  /* =====================================================================================================
     PART 1. THE CITY, THE BALLOON AND THE COMPUTER PLAYERS
     World units: the city is 800 units wide on a big screen (560 on a phone), x to the right, y DOWN (like the
     screen). Time is in seconds.
     ===================================================================================================== */
  var GRAVITY = 200;          // units per second, per second, pulling down
  var SPEED_UNIT = 6;         // "speed 50" means 50 x 6 = 300 units per second
  var SAMPLE = 1 / 240;       // the balloon's position is checked 240 times per second of flight
  var BALLOON_R = 6;
  var CHAR_W = 26, CHAR_H = 40;
  var MAX_WIND = 42;          // the strongest wind pushes 42 units per second, per second (a fifth of gravity)
  var WIND_STEP = 6;          // the wind number you see is wind / 6, so it goes from -7 to 7
  var MIN_SPEED = 5, MAX_SPEED = 100;
  var BUILDING_COLOURS = ['#2c5f6b', '#4a3a7d', '#6b2f5d', '#2f5a4a', '#3d4f80', '#5c4a2f', '#33496b'];

  /* Make a random city. rnd is a function giving numbers from 0 to 1. */
  function makeCity(W, H, rnd) {
    var styles = ['up', 'down', 'valley', 'hill', 'random', 'random'];
    var style = styles[Math.floor(rnd() * styles.length)];
    var narrow = W < 700, minW = narrow ? 42 : 54, maxW = narrow ? 66 : 86;
    var lowH = H * 0.16, highH = H * 0.6;
    var buildings = [], x = 0;
    while (x < W - 1) {
      var w = minW + rnd() * (maxW - minW);
      if (W - (x + w) < minW * 0.8) w = W - x;
      var t = (x + w / 2) / W, base;
      if (style === 'up') base = 0.25 + 0.55 * t;
      else if (style === 'down') base = 0.8 - 0.55 * t;
      else if (style === 'valley') base = 0.25 + 1.1 * Math.abs(t - 0.5);
      else if (style === 'hill') base = 0.8 - 1.1 * Math.abs(t - 0.5);
      else base = 0.2 + 0.6 * rnd();
      var hgt = lowH + (highH - lowH) * Math.max(0, Math.min(1, base + (rnd() - 0.5) * 0.35));
      buildings.push({ x0: Math.round(x), x1: Math.round(x + w), top: Math.round(H - hgt), colour: BUILDING_COLOURS[Math.floor(rnd() * BUILDING_COLOURS.length)], lit: [] });
      x += w;
    }
    /* The two friends stand on the 2nd or 3rd building from each end. */
    var n = buildings.length;
    var li = 1 + Math.floor(rnd() * 2), ri = n - 2 - Math.floor(rnd() * 2);
    if (ri - li < 2) { li = 1; ri = n - 2; }
    /* fairness: the building next to you (towards the other player) is never more than a little taller than
       yours, so you are never stuck behind a wall */
    function soften(i, next) {
      var me = buildings[i], nb = buildings[next];
      if (nb && me.top - nb.top > 16) nb.top = Math.round(me.top - rnd() * 16);
    }
    soften(li, li + 1); soften(ri, ri - 1);
    /* little alleys between buildings: each building is 2 units narrower than its plot */
    var tops = new Float32Array(W);
    for (var i = 0; i < W; i++) tops[i] = H;
    buildings.forEach(function (b) {
      b.x1 -= 2;
      for (var c = Math.max(0, b.x0); c < Math.min(W, b.x1); c++) tops[c] = b.top;
      /* which windows have their lights on */
      var cols = Math.max(1, Math.floor((b.x1 - b.x0 - 8) / 14)), rows = Math.max(1, Math.floor((H - b.top - 14) / 18));
      for (var k = 0; k < cols * rows; k++) b.lit.push(rnd() < 0.42 ? 1 : 0);
      b.cols = cols; b.rows = rows;
    });
    /* the wind flag flies from the roof nearest the middle */
    var flag = buildings[0];
    buildings.forEach(function (b) { if (Math.abs((b.x0 + b.x1) / 2 - W / 2) < Math.abs((flag.x0 + flag.x1) / 2 - W / 2)) flag = b; });
    var P = [buildings[li], buildings[ri]].map(function (b) { return { x: Math.round((b.x0 + b.x1) / 2), y: b.top, b: b }; });
    /* wind: one round in three is nearly calm */
    var wind = rnd() < 0.33 ? (rnd() - 0.5) * 12 : (rnd() - 0.5) * 2 * MAX_WIND;
    return { W: W, H: H, buildings: buildings, flag: flag, tops: tops, players: P, wind: Math.round(wind / 2) * 2, style: style, marks: [] };
  }
  function windLevel(city) { return Math.round(city.wind / WIND_STEP); }

  /* Is the balloon (a circle at x, y) touching a friend standing at p? Each friend is a box CHAR_W wide and CHAR_H
     tall, standing on the roof. */
  function touches(p, x, y) {
    var cx = Math.max(p.x - CHAR_W / 2, Math.min(x, p.x + CHAR_W / 2));
    var cy = Math.max(p.y - CHAR_H, Math.min(y, p.y));
    var dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy <= BALLOON_R * BALLOON_R;
  }
  function handOf(city, who) {
    var p = city.players[who], dir = who === 0 ? 1 : -1;
    return { x: p.x + dir * 8, y: p.y - CHAR_H + 2, dir: dir };
  }

  /* One throw. The balloon's position at time t comes straight from the projectile equations:
       x = x0 + vx t + 1/2 wind t^2      (the wind pushes sideways a little more every second)
       y = y0 + vy t + 1/2 gravity t^2   (gravity pulls down a little more every second)
     We check for a splash at every 1/240 of a second. The computer uses exactly this code to test its ideas. */
  function Flight(city, who, angle, speed) {
    var hand = handOf(city, who), a = angle * Math.PI / 180, v = speed * SPEED_UNIT;
    this.city = city; this.who = who; this.dir = hand.dir;
    this.x0 = hand.x; this.y0 = hand.y;
    this.vx = hand.dir * v * Math.cos(a); this.vy = -v * Math.sin(a);
    this.x = this.x0; this.y = this.y0; this.k = 0; this.t = 0;
    this.done = false; this.result = ''; this.leftHand = false; this.crossX = null; this.roof = false;
  }
  Flight.prototype.sample = function () {
    var c = this.city, t = (++this.k) * SAMPLE;
    var x = this.x0 + this.vx * t + 0.5 * c.wind * t * t;
    var y = this.y0 + this.vy * t + 0.5 * GRAVITY * t * t;
    var falling = this.vy + GRAVITY * t > 0;
    this.prevY = this.y; this.x = x; this.y = y; this.t = t;
    var target = c.players[1 - this.who], me = c.players[this.who];
    /* where it came down past the other friend's head height: used to say "too short" or "too far" */
    if (this.crossX === null && falling && y >= target.y - CHAR_H) this.crossX = x;
    if (touches(target, x, y)) return this.end('hit');
    var onMe = touches(me, x, y);
    if (!this.leftHand) { if (!onMe) this.leftHand = true; }
    else if (onMe) return this.end('self');
    if (x < -BALLOON_R * 2 || x > c.W + BALLOON_R * 2 || t > 14) return this.end('out');
    for (var d = -4; d <= 4; d += 4) {
      var col = Math.round(x) + d;
      if (col < 0 || col >= c.W) continue;
      if (y + Math.sqrt(BALLOON_R * BALLOON_R - d * d) >= c.tops[col]) {
        this.roof = this.prevY + BALLOON_R <= c.tops[col] + 2;
        this.hitTop = c.tops[col];
        return this.end(c.tops[col] >= c.H - 0.5 ? 'street' : 'building');
      }
    }
    return false;
  };
  Flight.prototype.end = function (result) {
    this.done = true; this.result = result;
    var target = this.city.players[1 - this.who];
    var where = this.crossX !== null ? this.crossX : this.x;
    if (result === 'out' && this.crossX === null) where = this.x;
    /* how far past (+) or short of (-) the other friend it came down */
    this.err = result === 'self' ? -999 : (where - target.x) * this.dir;
    return true;
  };
  Flight.prototype.run = function () { while (!this.done) this.sample(); return this; };
  function simulate(city, who, angle, speed) { return new Flight(city, who, angle, speed).run(); }

  /* The textbook answer with no wind and no buildings in the way: for a throw at angle a to land d across and h up,
       speed^2 = g d^2 / (2 cos^2(a) (d tan(a) - h))
     Returns the speed number, or 0 if that angle cannot reach. */
  function textbookSpeed(city, who, angle) {
    var hand = handOf(city, who), q = city.players[1 - who];
    var d = Math.abs(q.x - hand.x), up = hand.y - (q.y - CHAR_H / 2), a = angle * Math.PI / 180;
    var den = 2 * Math.cos(a) * Math.cos(a) * (d * Math.tan(a) - up);
    if (den <= 0) return 0;
    return Math.sqrt(GRAVITY * d * d / den) / SPEED_UNIT;
  }
  function clampSpeed(s) { return Math.max(MIN_SPEED, Math.min(MAX_SPEED, Math.round(s))); }
  function gauss(rnd) { return Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()); }

  /* The computer players. Each has aim(city, who) -> {angle, speed} and learn(flight) to hear how its throw went. */
  var HARD_WOBBLE_ANGLE = 3, HARD_WOBBLE_SPEED = 2.8;
  function Computer(level, rnd) {
    this.level = level; this.rnd = rnd;
    this.newRound();
  }
  Computer.prototype.newRound = function () { this.angle = 0; this.lo = 0; this.hi = 0; this.last = null; this.tries = 0; this.next = 0; this.blocked = 0; this.bias = 1; };
  Computer.prototype.aim = function (city, who) {
    var r = this.rnd, s;
    this.tries++;
    if (this.level === 'easy') {
      /* Easy: picks any angle, uses the no-wind textbook guess, then wobbles it a lot (a little less each go).
         It only learns "harder" or "softer" very slowly. */
      var angle = 35 + Math.floor(r() * 35);
      s = (textbookSpeed(city, who, angle) || 60) * this.bias;
      var spread = 0.45 * Math.pow(0.9, this.tries - 1);
      return (this.last = { angle: angle, speed: clampSpeed(s * (1 + (r() * 2 - 1) * spread)) });
    }
    if (this.level === 'normal') {
      /* Normal: brackets, like a person. Too short? Throw harder. Too far? Softer. Once it has one throw that was
         short and one that was long, it tries halfway between them, halving the gap every time. */
      if (!this.angle) {
        this.angle = 45 + Math.floor(r() * 16);
        s = textbookSpeed(city, who, this.angle) || 60;
        return (this.last = { angle: this.angle, speed: clampSpeed(s * (0.7 + r() * 0.6)) });
      }
      var L = this.last, sp;
      if (this.next) { sp = this.next; this.next = 0; }
      else if (this.lo && this.hi) {
        /* both neighbouring speeds missed: something is in the way, so try a steeper throw */
        if (this.hi - this.lo <= 1) { this.angle = this.angle >= 75 ? 40 : this.angle + 5; this.lo = this.hi = 0; sp = L.speed; }
        else sp = Math.round((this.lo + this.hi) / 2 + gauss(r) * 0.8);
      } else if (this.lo) sp = this.lo + Math.max(2, Math.round(this.lo * 0.1));
      else if (this.hi) sp = this.hi - Math.max(2, Math.round(this.hi * 0.1));
      else sp = L.speed;
      sp = clampSpeed(sp);
      /* never throw exactly the same way twice in a row: a person would try something a little different */
      if (sp === L.speed && this.angle === L.angle) { this.angle = Math.max(25, Math.min(75, this.angle + (r() < 0.5 ? -4 : 4))); sp = clampSpeed(sp + (r() < 0.5 ? -3 : 3)); }
      return (this.last = { angle: this.angle, speed: sp });
    }
    /* Hard: tries every angle in its head, using the real equations with the real wind, until it finds throws that
       hit; picks one; then its hand wobbles a little, like anyone's. */
    var best = solve(city, who, r);
    var a = best.angle + Math.round(gauss(r) * HARD_WOBBLE_ANGLE), sp2 = best.speed + Math.round(gauss(r) * HARD_WOBBLE_SPEED);
    return { angle: Math.max(5, Math.min(85, a)), speed: clampSpeed(sp2) };
  };
  Computer.prototype.learn = function (f) {
    if (!this.last || f.result === 'hit') return;
    this.lastErr = f.err;
    if (this.level === 'easy') {
      if (f.result !== 'self') this.bias *= f.err > 0 ? 0.97 : 1.03;
      return;
    }
    if (this.level !== 'normal') return;
    var sp = this.last.speed;
    /* soaked itself? throw flatter next time and start again */
    if (f.result === 'self') { this.angle = Math.max(30, this.angle - 10); this.lo = this.hi = 0; return; }
    /* stopped by a tall building well before the other friend? throw harder; already throwing hard? throw higher */
    if (f.result === 'building' && f.crossX === null && f.err < -150) {
      var harder = Math.round(sp * 1.15);
      this.lo = 0;
      if (sp >= 88 || (this.hi && harder >= this.hi)) { this.angle = this.angle >= 75 ? 50 : Math.min(75, this.angle + 6); this.hi = 0; this.next = sp; }
      else this.next = Math.min(MAX_SPEED, harder);
      return;
    }
    /* otherwise bracket: remember the fastest throw that was short and the slowest that was too far */
    if (f.err > 0) this.hi = this.hi ? Math.min(this.hi, sp) : sp;
    else this.lo = Math.max(this.lo, sp);
    if (this.lo && this.hi && this.lo >= this.hi) { this.lo = f.err > 0 ? 0 : sp; this.hi = f.err > 0 ? sp : 0; }
    /* short even at full speed? a flatter throw goes further into a headwind */
    if (f.err < 0 && sp >= MAX_SPEED) { this.angle = Math.max(25, this.angle - 8); this.lo = this.hi = 0; this.next = 90; }
  };
  /* Search: for each angle from 20 to 80 degrees, find the speed that comes down exactly on the other friend
     (halving the search each time, called a binary search), then check the nearest whole-number speeds really hit. */
  function solve(city, who, rnd) {
    var hits = [], a, i;
    for (a = 20; a <= 80; a++) {
      var lo = MIN_SPEED, hi = MAX_SPEED;
      for (i = 0; i < 14; i++) {
        var mid = (lo + hi) / 2, f = simulate(city, who, a, mid);
        if (f.result === 'hit') { lo = hi = mid; break; }
        if (f.err > 0) hi = mid; else lo = mid;
      }
      var base = Math.round((lo + hi) / 2);
      for (var d = -1; d <= 1; d++) {
        var s = base + d;
        if (s < MIN_SPEED || s > MAX_SPEED) continue;
        if (simulate(city, who, a, s).result === 'hit') { hits.push({ angle: a, speed: s }); break; }
      }
    }
    if (!hits.length) return { angle: 45, speed: clampSpeed(textbookSpeed(city, who, 45) || 60), found: false };
    /* prefer comfortable angles near 45 degrees, with a little randomness so it does not always look the same */
    hits.sort(function (p, q) { return Math.abs(p.angle - 48) - Math.abs(q.angle - 48); });
    var pick = hits[Math.floor(rnd() * Math.min(5, hits.length))];
    return { angle: pick.angle, speed: pick.speed, found: true };
  }

  /* For the automated check (the page never calls this): play many computer throws on random cities and count how
     many throws each level needs to hit. */
  function aiReport(level, rounds, seed) {
    var s = seed || 1;
    function rnd() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    var total = 0, firstHits = 0, worst = 0, capped = 0;
    for (var r = 0; r < rounds; r++) {
      var narrow = r % 2 === 1, W = narrow ? 560 : 800, city = makeCity(W, Math.round(W * (narrow ? 0.85 : 0.62)), rnd);
      var cpu = new Computer(level, rnd), who = r % 2, n = 0, f;
      do { n++; var aim = cpu.aim(city, who); f = simulate(city, who, aim.angle, aim.speed); cpu.learn(f); } while (f.result !== 'hit' && n < 40);
      if (f.result !== 'hit' && solve(city, who, rnd).found) capped++;
      total += n; if (n === 1) firstHits++; worst = Math.max(worst, n);
    }
    return { level: level, rounds: rounds, averageThrows: +(total / rounds).toFixed(2), firstThrowHits: +(firstHits / rounds).toFixed(2), worst: worst, neverHit: capped };
  }

  /* =====================================================================================================
     PART 2. THE GAME
     ===================================================================================================== */
  var NAMES = { cpu: ['You', 'Computer'], two: ['Player 1', 'Player 2'] };
  var TO_WIN = 3;
  var CSS =
    '.game-skyline { --sk-p1: #1fc8b9; --sk-p2: #ff3d9a; }' +
    '.game-skyline .sk-top { display: flex; flex-wrap: wrap; gap: .5rem .8rem; align-items: center; justify-content: space-between; margin-bottom: .7rem; }' +
    '.game-skyline .sk-score { margin: 0; gap: .3rem 1.1rem; font-size: clamp(1rem, .9rem + .5vw, 1.25rem); }' +
    '.game-skyline .sk-score strong { font-family: var(--font-poster); font-size: 1.3em; min-width: 1ch; display: inline-block; }' +
    '.game-skyline .sk-chip { display: inline-block; width: .9em; height: .9em; border-radius: 3px; border: 2px solid var(--ink); }' +
    '.game-skyline .sk-p1 strong { color: var(--sk-p1); } .game-skyline .sk-p2 strong { color: var(--sk-p2); }' +
    '.game-skyline .sk-p1 .sk-chip { background: var(--sk-p1); } .game-skyline .sk-p2 .sk-chip { background: var(--sk-p2); }' +
    '.game-skyline .sk-monitor { position: relative; margin-inline: auto; padding: 18px 18px 34px; border-radius: 20px; background: linear-gradient(180deg, #ebe4d1, #d4c9ad); box-shadow: inset 0 2px 0 #fbf7ea, inset 0 -4px 0 #b3a685, var(--shadow); }' +
    '.game-skyline .sk-monitor::after { content: ""; position: absolute; right: 24px; bottom: 13px; width: 9px; height: 9px; border-radius: 50%; background: #39e06f; box-shadow: 0 0 6px #39e06f; }' +
    '.game-skyline .sk-label { position: absolute; left: 24px; bottom: 9px; font: 700 .72rem/1 var(--font-mono); letter-spacing: .25em; color: #8d8166; text-transform: uppercase; }' +
    '.game-skyline .sk-screen { position: relative; border-radius: 14px; overflow: hidden; background: #050b14; box-shadow: 0 0 0 4px #24221d, 0 0 0 6px #b3a685; }' +
    '.game-skyline .sk-screen::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 62%, rgba(0, 0, 0, .38)), repeating-linear-gradient(rgba(0, 0, 0, .1) 0 1px, transparent 1px 3px); }' +
    '.game-skyline .sk-canvas { display: block; width: 100%; touch-action: auto; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }' +
    '.game-skyline .sk-canvas.is-live { touch-action: none; cursor: crosshair; }' +
    '.game-skyline .sk-canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }' +
    '.game-skyline .sk-overlay { position: absolute; inset: 0; z-index: 1; display: grid; place-items: center; padding: 10px; background: rgba(5, 11, 20, .5); }' +
    '.game-skyline .sk-overlay[hidden] { display: none; }' +
    '.game-skyline .sk-card { background: color-mix(in srgb, var(--surface) 94%, transparent); border: 2px solid var(--gold); border-radius: 16px; padding: .8rem 1.1rem .9rem; text-align: center; max-width: 28rem; max-height: 100%; overflow: auto; display: grid; gap: .5rem; justify-items: center; box-shadow: 0 0 0 4px rgba(31, 200, 185, .18); }' +
    '.game-skyline .sk-title { margin: 0; font-family: var(--font-poster); font-size: clamp(1.6rem, 1.1rem + 2.4vw, 2.6rem); line-height: 1; color: var(--straw, var(--gold)); letter-spacing: .02em; }' +
    '.game-skyline .sk-msg { margin: 0; color: var(--ink); font-weight: 600; line-height: 1.35; }' +
    '.game-skyline .sk-sub { margin: 0; color: var(--ink-muted); font-size: .9rem; }' +
    '.game-skyline .sk-sub:empty, .game-skyline .sk-msg:empty { display: none; }' +
    '.game-skyline .sk-settings { display: flex; flex-wrap: wrap; gap: .45rem; justify-content: center; }' +
    '.game-skyline .sk-big { min-height: 52px; font-size: 1.15rem; padding-inline: 1.6rem; }' +
    '.game-skyline .sk-btns { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }' +
    '.game-skyline .sk-panel { margin: .9rem auto 0; max-width: 46rem; border: 2px solid var(--line); border-radius: 16px; background: var(--surface); padding: .7rem .9rem .8rem; display: grid; gap: .45rem; }' +
    '.game-skyline .sk-who { margin: 0; font-weight: 800; display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }' +
    '.game-skyline .sk-who .sk-chip { flex: none; }' +
    '.game-skyline .sk-wind { margin-left: auto; font-family: var(--font-mono); font-size: 1.1rem; color: var(--ink-muted); }' +
    '.game-skyline .sk-row { display: grid; grid-template-columns: 4.2rem minmax(0, 1fr) 4.6rem; align-items: center; gap: .6rem; }' +
    '.game-skyline .sk-row label { font-weight: 800; }' +
    '.game-skyline .sk-row input[type=range] { width: 100%; min-height: 36px; accent-color: var(--gold); margin: 0; }' +
    '.game-skyline .sk-row input[type=number] { width: 100%; min-height: 42px; padding: .2rem .4rem; border-radius: 10px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); font: 700 1.25rem/1 var(--font-mono); text-align: center; }' +
    '.game-skyline .sk-throw { min-height: 52px; font-size: 1.2rem; width: 100%; }' +
    '.game-skyline .sk-panel.is-off .sk-row, .game-skyline .sk-panel.is-off .sk-throw { opacity: .55; }' +
    '.game-skyline .sk-toolbar { display: flex; flex-wrap: wrap; gap: .5rem; }' +
    '@media (max-width: 560px) { .game-skyline .sk-monitor { padding: 6px 6px 22px; border-radius: 12px; } .game-skyline .sk-monitor::after { right: 12px; bottom: 7px; width: 7px; height: 7px; } .game-skyline .sk-label { left: 12px; bottom: 6px; font-size: .62rem; } .game-skyline .sk-screen { border-radius: 8px; } .game-skyline .sk-overlay { padding: 5px; } .game-skyline .sk-card { padding: .5rem .6rem .6rem; gap: .35rem; } .game-skyline .sk-title { font-size: 1.45rem; } .game-skyline .sk-msg { font-size: .88rem; } .game-skyline .sk-card .seg button { padding-inline: .6rem; min-height: 40px; } .game-skyline .sk-big { min-height: 46px; font-size: 1.05rem; } .game-skyline .sk-panel { padding: .55rem .6rem .65rem; } .game-skyline .sk-row { grid-template-columns: 3.6rem minmax(0, 1fr) 4rem; gap: .45rem; } }';

  GamesInTime.register({
    id: 'skyline',
    frame: 'none',
    /* Used only by the automated check: the page itself never calls these. */
    selfTest: { aiReport: aiReport, makeCity: makeCity, simulate: simulate },
    mount: function (root, api) {
      var h = api.h, reduced = !!api.reducedMotion, destroyed = false;
      root.appendChild(h('style', null, CSS));

      /* ---------- settings and records ---------- */
      var mode = api.store.get('mode', 'cpu'); if (mode !== 'cpu' && mode !== 'two') mode = 'cpu';
      var level = api.store.get('level', 'normal'); if (['easy', 'normal', 'hard'].indexOf(level) < 0) level = 'normal';
      var record = api.store.get('record', null) || { easy: [0, 0], normal: [0, 0], hard: [0, 0] };

      /* ---------- DOM ---------- */
      var name1 = h('span', null, 'You'), name2 = h('span', null, 'Computer');
      var score1 = h('strong', null, '0'), score2 = h('strong', null, '0');
      var scoreboard = h('div', { class: 'scoreboard sk-score', 'aria-label': 'Score' },
        h('span', { class: 'sk-p1' }, h('span', { class: 'sk-chip', 'aria-hidden': 'true' }), name1, score1),
        h('span', { class: 'sk-p2' }, h('span', { class: 'sk-chip', 'aria-hidden': 'true' }), name2, score2));
      var newBtn = h('button', { class: 'btn', type: 'button' }, 'New game');
      var canvas = h('canvas', { class: 'sk-canvas', role: 'img', tabindex: '0', 'aria-label': 'A city skyline at night' });
      var ovTitle = h('p', { class: 'sk-title' }, 'Skyline');
      var ovMsg = h('p', { class: 'sk-msg' }, '');
      var ovSub = h('p', { class: 'sk-sub' }, '');
      var modeBtns = {}, levelBtns = {};
      var modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Who to play' },
        [['cpu', 'vs Computer'], ['two', '2 players']].map(function (m) { modeBtns[m[0]] = h('button', { type: 'button', 'aria-pressed': String(m[0] === mode), onclick: function () { setMode(m[0]); } }, m[1]); return modeBtns[m[0]]; }));
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Computer level' },
        [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']].map(function (m) { levelBtns[m[0]] = h('button', { type: 'button', 'aria-pressed': String(m[0] === level), onclick: function () { setLevel(m[0]); } }, m[1]); return levelBtns[m[0]]; }));
      var ovMain = h('button', { class: 'btn btn-primary sk-big', type: 'button' }, '▶ Start');
      var ovAlt = h('button', { class: 'btn', type: 'button', hidden: true }, 'Change settings');
      var settingsEl = h('div', { class: 'sk-settings' }, modeSeg, levelSeg);
      var overlay = h('div', { class: 'sk-overlay' }, h('div', { class: 'sk-card' }, ovTitle, ovMsg, settingsEl, h('div', { class: 'sk-btns' }, ovMain, ovAlt), ovSub));
      var screen = h('div', { class: 'sk-screen' }, canvas, overlay);
      var monitor = h('div', { class: 'sk-monitor' }, screen, h('span', { class: 'sk-label', 'aria-hidden': 'true' }, 'Skyline 91'));

      var whoChip = h('span', { class: 'sk-chip', 'aria-hidden': 'true' });
      var whoText = h('span', null, 'Press Start');
      var windText = h('span', { class: 'sk-wind' }, '');
      var angleRange = h('input', { type: 'range', min: '0', max: '90', step: '1', value: '45', id: 'sk-angle-range', 'aria-label': 'Angle in degrees' });
      var angleNum = h('input', { type: 'number', min: '0', max: '90', step: '1', value: '45', inputmode: 'numeric', id: 'sk-angle', 'aria-label': 'Angle in degrees' });
      var speedRange = h('input', { type: 'range', min: String(MIN_SPEED), max: String(MAX_SPEED), step: '1', value: '50', id: 'sk-speed-range', 'aria-label': 'Speed' });
      var speedNum = h('input', { type: 'number', min: String(MIN_SPEED), max: String(MAX_SPEED), step: '1', value: '50', inputmode: 'numeric', id: 'sk-speed', 'aria-label': 'Speed' });
      var throwBtn = h('button', { class: 'btn btn-primary sk-throw', type: 'button' }, 'Throw!');
      var panel = h('div', { class: 'sk-panel is-off', role: 'group', 'aria-label': 'Aim' },
        h('p', { class: 'sk-who' }, whoChip, whoText, windText),
        h('div', { class: 'sk-row' }, h('label', { for: 'sk-angle' }, 'Angle'), angleRange, angleNum),
        h('div', { class: 'sk-row' }, h('label', { for: 'sk-speed' }, 'Speed'), speedRange, speedNum),
        throwBtn);
      var note = h('p', { class: 'game-note' }, 'Drag on the city from your thrower to aim: the arrow shows the angle, and a longer arrow means more speed. Keyboard: Up and Down change the angle, Left and Right change the speed (hold Shift for big steps), Space or Enter throws.');
      root.appendChild(h('div', { class: 'sk-top' }, scoreboard, h('div', { class: 'sk-toolbar' }, newBtn)));
      root.appendChild(monitor);
      root.appendChild(panel);
      root.appendChild(note);

      var ctx = canvas.getContext('2d');
      var skyLayer = document.createElement('canvas'), cityLayer = document.createElement('canvas');
      var cssW = 320, cssH = 200, dpr = 1, S = 1, FONT = 'monospace', POSTER = 'sans-serif';

      /* ---------- game state ---------- */
      var city = null, worldW = 800, worldH = 496;
      var state = 'menu';                 // menu | aim | cpu | fly | splash | over
      var turn = 0, scores = [0, 0], round = 0;
      var aims = [{ angle: 45, speed: 50 }, { angle: 45, speed: 50 }];
      var trails = [new Float32Array(1200), new Float32Array(1200)], trailN = [0, 0];
      var flight = null, flightClock = 0, cpu = null, cpuTimer = 0, cpuAnim = null, nextAt = 0, nextFn = null;
      var soaked = [-9, -9], cheer = [-9, -9], throwAt = [-9, -9];
      var stars = [];
      var clock = 0, rafId = 0, lastT = 0, shakeUntil = 0, dragging = false, dragId = -1;
      var floaters = [], timers = [];
      function soon(fn, ms) { var id = setTimeout(function () { timers.splice(timers.indexOf(id), 1); if (!destroyed) fn(); }, ms); timers.push(id); }
      /* splash droplets, kept in reused arrays */
      var PMAX = 260, pN = 0;
      var px = new Float32Array(PMAX), py = new Float32Array(PMAX), pvx = new Float32Array(PMAX), pvy = new Float32Array(PMAX), plife = new Float32Array(PMAX), pmax = new Float32Array(PMAX), psize = new Float32Array(PMAX), pwhite = new Uint8Array(PMAX);

      function names() { return NAMES[mode]; }
      function isCpu(who) { return mode === 'cpu' && who === 1; }

      /* ---------- layout ---------- */
      function readFonts() {
        var cs = getComputedStyle(root);
        FONT = cs.getPropertyValue('--font-mono').trim() || 'monospace';
        POSTER = cs.getPropertyValue('--font-poster').trim() || 'sans-serif';
      }
      function resize() {
        var avail = Math.max(240, root.clientWidth || 300);
        var narrow = avail < 560, pad = narrow ? 12 : 36;
        var aspect = city ? worldH / worldW : (narrow ? 0.85 : 0.62);
        var vh = window.innerHeight || 800;
        var w = Math.min(avail - pad, Math.max(300, (vh * 0.62) / aspect));
        monitor.style.maxWidth = Math.round(w + pad) + 'px';
        panel.style.maxWidth = Math.max(Math.round(w + pad), 300) + 'px';
        cssW = Math.round(w); cssH = Math.round(w * aspect);
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.style.height = cssH + 'px';
        canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
        S = cssW / worldW;
        readFonts();
        bakeSky(); bakeCity();
        draw();
        fitCard();
      }

      /* ---------- the night sky and the city, drawn once into their own layers ---------- */
      function bakeSky() {
        skyLayer.width = canvas.width; skyLayer.height = canvas.height;
        var b = skyLayer.getContext('2d');
        b.setTransform(dpr, 0, 0, dpr, 0, 0);
        var g = b.createLinearGradient(0, 0, 0, cssH);
        g.addColorStop(0, '#050b1c'); g.addColorStop(0.55, '#10234a'); g.addColorStop(1, '#3b2a63');
        b.fillStyle = g; b.fillRect(0, 0, cssW, cssH);
        b.fillStyle = '#f2fbf8';
        for (var i = 0; i < stars.length; i += 3) { b.globalAlpha = 0.35 + stars[i + 2] * 0.5; b.fillRect(stars[i] * cssW, stars[i + 1] * cssH * 0.7, 1.5, 1.5); }
        b.globalAlpha = 1;
        /* a full moon with craters */
        var mx = cssW * 0.8, my = cssH * 0.16, mr = Math.max(9, cssW * 0.035);
        b.fillStyle = 'rgba(255, 244, 200, .12)'; b.beginPath(); b.arc(mx, my, mr * 1.9, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#fff4c8'; b.beginPath(); b.arc(mx, my, mr, 0, Math.PI * 2); b.fill();
        b.fillStyle = 'rgba(200, 180, 120, .35)';
        b.beginPath(); b.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.22, 0, Math.PI * 2); b.arc(mx + mr * 0.35, my + mr * 0.25, mr * 0.16, 0, Math.PI * 2); b.arc(mx + mr * 0.05, my + mr * 0.45, mr * 0.1, 0, Math.PI * 2); b.fill();
      }
      function bakeCity() {
        cityLayer.width = canvas.width; cityLayer.height = canvas.height;
        if (!city) return;
        var b = cityLayer.getContext('2d');
        b.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
        city.buildings.forEach(function (bd) {
          var w = bd.x1 - bd.x0, hh = city.H - bd.top;
          b.fillStyle = bd.colour; b.fillRect(bd.x0, bd.top, w, hh);
          b.fillStyle = 'rgba(255, 255, 255, .14)'; b.fillRect(bd.x0, bd.top, w, 2.5);
          b.fillStyle = 'rgba(0, 0, 0, .22)'; b.fillRect(bd.x1 - 3, bd.top, 3, hh);
          var gx = (w - bd.cols * 14) / 2 + 4;
          for (var r = 0; r < bd.rows; r++) for (var c = 0; c < bd.cols; c++) {
            b.fillStyle = bd.lit[r * bd.cols + c] ? '#ffd23f' : 'rgba(5, 15, 30, .55)';
            b.fillRect(bd.x0 + gx + c * 14, bd.top + 10 + r * 18, 6, 9);
          }
        });
        city.marks.forEach(function (m) { applyMark(b, m); });
      }
      /* A splash leaves a wet patch with drips; a roof hit can knock out a little notch. */
      function applyMark(b, m) {
        if (m.type === 'notch') {
          b.globalCompositeOperation = 'destination-out';
          b.beginPath(); b.arc(m.x, m.y, m.r, 0, Math.PI * 2); b.fill();
          b.globalCompositeOperation = 'source-over';
          return;
        }
        b.globalCompositeOperation = 'source-atop';
        b.fillStyle = 'rgba(40, 140, 230, .42)';
        b.beginPath(); b.arc(m.x, m.y, m.r, 0, Math.PI * 2); b.fill();
        b.fillStyle = 'rgba(40, 140, 230, .32)';
        for (var i = 0; i < 4; i++) { var dx = (m.seed * (i + 2) * 17) % (m.r * 1.6) - m.r * 0.8; b.fillRect(m.x + dx - 1.2, m.y, 2.4, m.r * (0.8 + ((m.seed * (i + 3)) % 1) * 1.8)); }
        b.globalCompositeOperation = 'source-over';
      }
      function addMark(m) { city.marks.push(m); var b = cityLayer.getContext('2d'); b.setTransform(dpr * S, 0, 0, dpr * S, 0, 0); applyMark(b, m); }

      /* ---------- drawing ---------- */
      function world() { ctx.setTransform(dpr * S, 0, 0, dpr * S, 0, 0); }
      function draw() {
        if (destroyed || !cssW) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        var shx = 0, shy = 0;
        if (!reduced && clock < shakeUntil) { var k = (shakeUntil - clock) / 0.4; shx = Math.round(Math.sin(clock * 80) * 6 * k * dpr); shy = Math.round(Math.cos(clock * 67) * 4 * k * dpr); }
        ctx.drawImage(skyLayer, 0, 0);
        if (!reduced) {
          ctx.fillStyle = '#ffffff';
          for (var i = 0; i < 24; i += 3) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(clock * (1.5 + stars[i + 2] * 2) + i); ctx.fillRect(stars[i] * cssW * dpr, stars[i + 1] * cssH * 0.7 * dpr, 2 * dpr, 2 * dpr); }
          ctx.globalAlpha = 1;
        }
        ctx.drawImage(cityLayer, shx, shy);
        if (!city) return;
        ctx.setTransform(dpr * S, 0, 0, dpr * S, shx, shy);
        drawFlag();
        drawTrail(0); drawTrail(1);
        drawFriend(0); drawFriend(1);
        if (state === 'aim' && !isCpu(turn)) drawAim();
        if (flight && state === 'fly') drawBalloon(flight.x, flight.y, flight);
        drawDrops();
        drawFloaters();
        drawWind();
      }
      function drawFlag() {
        /* on the roof nearest the middle of the city: it streams out with the wind, or hangs down when calm */
        var mid = city.flag;
        var fx = mid.x0 + 10, top = mid.top - 30, i;
        ctx.strokeStyle = '#cfd6dd'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(fx, mid.top); ctx.lineTo(fx, top - 2); ctx.stroke();
        ctx.fillStyle = '#ffd23f';
        var wl = windLevel(city);
        ctx.beginPath();
        if (wl === 0) {
          ctx.moveTo(fx, top); ctx.lineTo(fx + 5, top + 1); ctx.lineTo(fx + 4, top + 16); ctx.lineTo(fx, top + 15);
        } else {
          var dir = wl > 0 ? 1 : -1, len = 12 + Math.abs(wl) * 2.6, sag = Math.max(0, 5 - Math.abs(wl)) * 1.2, wave = reduced ? 0 : 1;
          for (i = 0; i <= 6; i++) { var t = i / 6; ctx.lineTo(fx + dir * len * t, top + sag * t * t + Math.sin(clock * 10 - t * 5) * 2 * t * wave); }
          for (i = 6; i >= 0; i--) { var t2 = i / 6; ctx.lineTo(fx + dir * len * t2, top + 10 + sag * t2 * t2 + Math.sin(clock * 10 - t2 * 5) * 2 * t2 * wave); }
        }
        ctx.closePath(); ctx.fill();
      }
      function drawTrail(who) {
        var n = trailN[who], arr = trails[who];
        if (!n) return;
        var live = flight && state === 'fly' && flight.who === who;
        ctx.fillStyle = who === 0 ? '#1fc8b9' : '#ff3d9a';
        ctx.globalAlpha = live ? 0.9 : 0.5;
        for (var i = 0; i < n; i += 2) ctx.fillRect(arr[i] - 1.4, arr[i + 1] - 1.4, 2.8, 2.8);
        ctx.globalAlpha = 1;
      }
      /* The two friends: a kid in a hoodie and a backwards cap, holding a water balloon. */
      function drawFriend(who) {
        var p = city.players[who], dir = who === 0 ? 1 : -1;
        var body = who === 0 ? '#1fc8b9' : '#ff3d9a', cap = who === 0 ? '#ff3d9a' : '#1fc8b9', skin = who === 0 ? '#f1c27d' : '#9a6334', hair = who === 0 ? '#5a3a1a' : '#1d1410';
        var wet = clock - soaked[who] < (reduced ? 1.2 : 2), happy = clock - cheer[who] < 1.6;
        var hop = happy && !reduced ? -Math.abs(Math.sin((clock - cheer[who]) * 9)) * 7 : 0;
        var x = p.x, y = p.y + hop;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(dir, 1);
        /* legs and shoes */
        ctx.fillStyle = '#28324a'; ctx.fillRect(-7, -12, 5, 12); ctx.fillRect(2, -12, 5, 12);
        ctx.fillStyle = '#f2fbf8'; ctx.fillRect(-8, -3, 7, 3); ctx.fillRect(1, -3, 8, 3);
        /* hoodie */
        ctx.fillStyle = body; rr(-10, -29, 20, 19, 5); ctx.fill();
        ctx.fillStyle = 'rgba(0, 0, 0, .18)'; ctx.fillRect(-6, -18, 12, 3);
        /* arms: one waves or throws, the other hangs */
        var since = clock - throwAt[who], swing = since < 0.3 ? since / 0.3 : 1;
        var aiming = (state === 'aim' || state === 'cpu') && turn === who && !wet;
        ctx.strokeStyle = body; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-7, -26); ctx.lineTo(-11, happy ? -40 : -15); ctx.stroke();
        var hx, hy;
        if (happy) { hx = 11; hy = -40; }
        else if (aiming) { hx = -4; hy = -42; }
        else if (since < 0.5) { hx = 8 + 6 * swing; hy = -38 + 16 * swing; }
        else { hx = 11; hy = -15; }
        ctx.beginPath(); ctx.moveTo(7, -26); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, Math.PI * 2); ctx.arc(happy ? -11 : -11, happy ? -40 : -15, 2.6, 0, Math.PI * 2); ctx.fill();
        if (aiming) { drawBalloonShape(hx + 1, hy - 5, 0, 0, who); }
        /* head, hair, backwards cap */
        ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, -35, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(0, -36, 8.2, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
        ctx.fillStyle = cap; ctx.beginPath(); ctx.arc(0, -38, 8.4, Math.PI, 0); ctx.fill();
        ctx.fillRect(-14, -40, 7, 3);
        /* face (looking at the other friend) */
        ctx.fillStyle = '#10141c';
        ctx.fillRect(2, -37, 2, 2.5); ctx.fillRect(6, -37, 2, 2.5);
        ctx.strokeStyle = '#10141c'; ctx.lineWidth = 1.2;
        if (wet) { ctx.beginPath(); ctx.arc(5, -31.5, 1.8, 0, Math.PI * 2); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(5, -33, 2.6, 0.2 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
        if (wet) {
          /* dripping wet: a water sheen, drips and a puddle */
          ctx.fillStyle = 'rgba(90, 180, 255, .45)'; rr(-11, -44, 22, 34, 6); ctx.fill();
          ctx.fillStyle = 'rgba(120, 200, 255, .9)';
          for (var d = 0; d < 4; d++) { var dy = reduced ? 0 : ((clock * 40 + d * 9) % 26); ctx.fillRect(-9 + d * 6, -30 + dy, 1.6, 3.5); }
          ctx.fillStyle = 'rgba(80, 170, 255, .55)'; ctx.beginPath(); ctx.ellipse(0, 0.5, 15, 2.6, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        /* name tag */
        var tag = mode === 'cpu' ? (who === 0 ? 'YOU' : 'CPU') : (who === 0 ? 'P1' : 'P2');
        textAt(tag, p.x, p.y - CHAR_H - 16 + hop, who === 0 ? '#1fc8b9' : '#ff3d9a', 13);
      }
      function rr(x, y, w, hh, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
      /* A water balloon: stretched along its flight, with a knot at the back. */
      function drawBalloonShape(x, y, vx, vy, who) {
        var sp = Math.sqrt(vx * vx + vy * vy), a = sp > 1 ? Math.atan2(vy, vx) : -Math.PI / 2, st = 1 + Math.min(0.35, sp / 1400);
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.fillStyle = who === 0 ? '#5ff0e2' : '#ff7cbc';
        ctx.beginPath(); ctx.ellipse(0, 0, BALLOON_R * 1.15 * st, BALLOON_R * 1.15 / st, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = who === 0 ? '#14998d' : '#c41f6e';
        ctx.beginPath(); ctx.moveTo(-BALLOON_R * 1.1 * st, 0); ctx.lineTo(-BALLOON_R * 1.1 * st - 3.5, -2.2); ctx.lineTo(-BALLOON_R * 1.1 * st - 3.5, 2.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, .75)'; ctx.beginPath(); ctx.ellipse(BALLOON_R * 0.3, -BALLOON_R * 0.4, BALLOON_R * 0.35, BALLOON_R * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      function drawBalloon(x, y, f) {
        var t = f.t;
        drawBalloonShape(x, y, f.vx + city.wind * t, f.vy + GRAVITY * t, f.who);
        if (y < -BALLOON_R) {
          /* above the screen: a little arrow shows where it is */
          ctx.fillStyle = f.who === 0 ? '#1fc8b9' : '#ff3d9a';
          ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x - 7, 13); ctx.lineTo(x + 7, 13); ctx.closePath(); ctx.fill();
        }
      }
      /* The aim arrow for the person whose turn it is: direction is the angle, length is the speed. */
      function arrowPerSpeed() { return worldW / 280; }
      function drawAim() {
        var hand = handOf(city, turn), A = aims[turn], a = A.angle * Math.PI / 180, len = A.speed * arrowPerSpeed();
        var ex = hand.x + hand.dir * Math.cos(a) * len, ey = hand.y - Math.sin(a) * len;
        ctx.strokeStyle = turn === 0 ? 'rgba(31, 200, 185, .9)' : 'rgba(255, 61, 154, .9)';
        ctx.lineWidth = 3; ctx.setLineDash([7, 6]);
        ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
        var ha = Math.atan2(ey - hand.y, ex - hand.x);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(ha - 0.45) * 12, ey - Math.sin(ha - 0.45) * 12); ctx.lineTo(ex - Math.cos(ha + 0.45) * 12, ey - Math.sin(ha + 0.45) * 12); ctx.closePath(); ctx.fill();
        /* the angle, drawn like a protractor */
        ctx.strokeStyle = 'rgba(242, 251, 248, .6)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(hand.x + hand.dir * 34, hand.y); ctx.stroke();
        ctx.beginPath();
        if (hand.dir > 0) ctx.arc(hand.x, hand.y, 24, -a, 0); else ctx.arc(hand.x, hand.y, 24, Math.PI, Math.PI + a);
        ctx.stroke();
        textAt(A.angle + '°', hand.x + hand.dir * 44, hand.y - 12, '#f2fbf8', 13);
      }
      function textAt(text, x, y, colour, px, font) {
        var size = px / Math.max(0.55, S) * Math.min(1, S * 1.25);
        ctx.font = '700 ' + Math.round(size) + 'px ' + (font || FONT);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(5, 11, 20, .85)'; ctx.lineWidth = size * 0.22;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = colour; ctx.fillText(text, x, y);
      }
      function drawWind() {
        var wl = windLevel(city), cx = city.W / 2, y = 16;
        textAt(wl === 0 ? 'WIND · CALM' : 'WIND ' + Math.abs(wl), cx, y, '#ffd23f', 14);
        if (!wl) return;
        var len = 10 + Math.abs(wl) * 9, dir = wl > 0 ? 1 : -1, y2 = y + 16;
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - dir * len / 2, y2); ctx.lineTo(cx + dir * len / 2, y2); ctx.stroke();
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.moveTo(cx + dir * (len / 2 + 8), y2); ctx.lineTo(cx + dir * len / 2, y2 - 6); ctx.lineTo(cx + dir * len / 2, y2 + 6); ctx.closePath(); ctx.fill();
      }
      function drawDrops() {
        for (var i = 0; i < pN; i++) {
          ctx.globalAlpha = Math.min(1, plife[i] / pmax[i] * 2);
          ctx.fillStyle = pwhite[i] ? '#e8f7ff' : '#5fb8ff';
          ctx.fillRect(px[i] - psize[i] / 2, py[i] - psize[i] / 2, psize[i], psize[i]);
        }
        ctx.globalAlpha = 1;
      }
      function drawFloaters() {
        for (var i = 0; i < floaters.length; i++) {
          var f = floaters[i], age = clock - f.born;
          if (age > f.life) continue;
          ctx.globalAlpha = Math.min(1, (f.life - age) * 3);
          var grow = reduced ? 1 : Math.min(1, 0.4 + age * 5);
          textAt(f.text, f.x, f.y - (reduced ? 0 : age * 24), f.colour, f.size * grow, POSTER);
        }
        ctx.globalAlpha = 1;
      }

      /* ---------- particles ---------- */
      function splash(x, y, n, power) {
        if (reduced) n = Math.ceil(n / 3);
        for (var i = 0; i < n && pN < PMAX; i++) {
          var a = -Math.PI * (0.1 + api.random() * 0.8), s = power * (0.3 + api.random());
          px[pN] = x; py[pN] = y; pvx[pN] = Math.cos(a) * s; pvy[pN] = Math.sin(a) * s;
          plife[pN] = pmax[pN] = 0.5 + api.random() * 0.6; psize[pN] = 2 + api.random() * 3; pwhite[pN] = api.random() < 0.3 ? 1 : 0;
          pN++;
        }
      }
      function stepDrops(dt) {
        for (var i = 0; i < pN; i++) {
          plife[i] -= dt;
          if (plife[i] <= 0) {
            pN--; px[i] = px[pN]; py[i] = py[pN]; pvx[i] = pvx[pN]; pvy[i] = pvy[pN]; plife[i] = plife[pN]; pmax[i] = pmax[pN]; psize[i] = psize[pN]; pwhite[i] = pwhite[pN];
            i--; continue;
          }
          pvy[i] += GRAVITY * 1.4 * dt; px[i] += pvx[i] * dt; py[i] += pvy[i] * dt;
        }
      }
      function floatText(text, x, y, colour, size, life) {
        if (floaters.length > 5) floaters.shift();
        floaters.push({ text: text, x: x, y: y, colour: colour, size: size || 18, born: clock, life: life || 1.1 });
      }

      /* ---------- the loop ---------- */
      function frame(now) {
        rafId = 0;
        if (destroyed) return;
        var dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
        lastT = now; clock += dt;
        if (state === 'fly' && flight) advanceFlight(dt);
        if (cpuAnim) stepCpuAnim();
        if (nextAt && clock >= nextAt) { var fn = nextFn; nextAt = 0; nextFn = null; fn(); }
        stepDrops(dt);
        draw();
        if (wantLoop()) rafId = requestAnimationFrame(frame);
      }
      function wantLoop() { return !destroyed && !document.hidden && (state !== 'menu' && state !== 'over' || pN > 0 || nextAt > 0); }
      function startLoop() { if (!rafId && !destroyed && !document.hidden) { lastT = performance.now(); rafId = requestAnimationFrame(frame); } }
      function stopLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }
      function later(seconds, fn) { nextAt = clock + seconds; nextFn = fn; startLoop(); }

      /* ---------- rounds and turns ---------- */
      function newGame() {
        api.unlockSound();
        scores = [0, 0]; round = 0; turn = 0;
        aims = [{ angle: 45, speed: 50 }, { angle: 45, speed: 50 }];
        cpu = mode === 'cpu' ? new Computer(level, api.random) : null;
        overlay.hidden = true;
        canvas.classList.add('is-live');
        updateScore();
        /* a short square-wave fanfare, like a 1991 PC speaker */
        [523, 659, 784, 1047].forEach(function (f, i) { soon(function () { api.tone(f, 0.09, 'square', 0.05); }, i * 90); });
        newRound();
        try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
      function newRound() {
        round++;
        var narrow = cssW < 520;
        worldW = narrow ? 560 : 800; worldH = Math.round(worldW * (narrow ? 0.85 : 0.62));
        city = makeCity(worldW, worldH, api.random);
        trailN[0] = trailN[1] = 0;
        if (cpu) cpu.newRound();
        resize();
        describe();
        beginTurn();
      }
      function describe() {
        var n = names(), wl = windLevel(city);
        canvas.setAttribute('aria-label', 'A city skyline at night with ' + city.buildings.length + ' buildings. ' + n[0] + ' (teal) stands on a roof on the left, ' + n[1] + ' (pink) on a roof on the right. ' + windWords(wl) + '.');
      }
      function windWords(wl) { return wl === 0 ? 'No wind' : 'Wind ' + Math.abs(wl) + ' blowing to the ' + (wl > 0 ? 'right' : 'left'); }
      function beginTurn() {
        flight = null;
        var n = names(), wl = windLevel(city);
        windText.textContent = wl === 0 ? 'Wind: calm' : 'Wind: ' + Math.abs(wl) + (wl > 0 ? ' →' : ' ←');
        whoChip.style.background = turn === 0 ? 'var(--sk-p1)' : 'var(--sk-p2)';
        setInputs(aims[turn]);
        if (isCpu(turn)) {
          state = 'cpu';
          setPanel(false);
          whoText.textContent = 'Computer’s turn';
          var think = { easy: 'The computer is having a guess…', normal: 'The computer is adjusting from its last throw…', hard: 'The computer is working out the physics…' }[level];
          api.status(think);
          var aim = cpu.aim(city, 1);
          cpuTimer = clock;
          later(reduced ? 0.35 : 0.7, function () { animateCpu(aim); });
        } else {
          state = 'aim';
          setPanel(true);
          whoText.textContent = mode === 'cpu' ? 'Your turn' : n[turn] + ' (' + (turn === 0 ? 'teal, left' : 'pink, right') + ')';
          api.status((mode === 'cpu' ? 'Your turn. ' : n[turn] + '’s turn. ') + windWords(wl) + '. Set the angle and speed, then Throw.');
        }
        startLoop();
      }
      /* The computer's sliders slide to its choice, so you can see the numbers it picked. */
      function animateCpu(aim) {
        if (reduced) { aims[1] = { angle: aim.angle, speed: aim.speed }; setInputs(aims[1]); later(0.35, function () { doThrow(); }); return; }
        cpuAnim = { from: { angle: aims[1].angle, speed: aims[1].speed }, to: aim, start: clock, dur: 0.7 };
      }
      function stepCpuAnim() {
        var k = Math.min(1, (clock - cpuAnim.start) / cpuAnim.dur), e = k * (2 - k);
        aims[1] = { angle: Math.round(cpuAnim.from.angle + (cpuAnim.to.angle - cpuAnim.from.angle) * e), speed: Math.round(cpuAnim.from.speed + (cpuAnim.to.speed - cpuAnim.from.speed) * e) };
        setInputs(aims[1]);
        if (Math.round(clock * 20) % 2 === 0) api.tone(300 + aims[1].angle * 6, 0.02, 'square', 0.025);
        if (k >= 1) { cpuAnim = null; later(0.3, function () { doThrow(); }); }
      }
      function doThrow() {
        if (state !== 'aim' && state !== 'cpu') return;
        api.unlockSound();
        var A = aims[turn];
        flight = new Flight(city, turn, A.angle, A.speed);
        flightClock = 0;
        trailN[turn] = 0;
        throwAt[turn] = clock;
        state = 'fly';
        setPanel(false);
        api.sound('whoosh');
        var n = names();
        api.status((isCpu(turn) ? 'The computer throws: ' : (mode === 'cpu' ? 'You throw: ' : n[turn] + ' throws: ')) + 'angle ' + A.angle + '°, speed ' + A.speed + '.');
        startLoop();
      }
      /* Play the flight back in real time (a little faster than life), checking every sample for a splash. */
      function advanceFlight(dt) {
        flightClock += dt * 1.3;
        var guard = 0;
        while (!flight.done && flight.t < flightClock && guard++ < 400) {
          flight.sample();
          if (flight.k % 4 === 0 && trailN[flight.who] < 1198) { trails[flight.who][trailN[flight.who]++] = flight.x; trails[flight.who][trailN[flight.who]++] = flight.y; }
        }
        if (flight.done) landed(flight);
      }
      function landed(f) {
        state = 'splash';
        if (cpu && f.who === 1) cpu.learn(f);
        var n = names(), who = f.who, other = 1 - who;
        if (f.result === 'hit' || f.result === 'self') {
          var wetOne = f.result === 'hit' ? other : who, scorer = f.result === 'hit' ? who : other;
          var tp = city.players[wetOne];
          splash(f.x, f.y, 60, 260);
          splash(tp.x, tp.y - CHAR_H, 30, 160);
          soaked[wetOne] = clock; cheer[scorer] = clock;
          floatText('SPLOOSH!', tp.x, tp.y - CHAR_H - 30, '#5fd0ff', 26, 1.6);
          if (!reduced) shakeUntil = clock + 0.4;
          api.sound('pop'); api.sound('whoosh');
          [392, 330, 262].forEach(function (fq, i) { soon(function () { api.tone(fq, 0.16, 'square', 0.05); }, 120 + i * 170); });
          soon(function () { api.sound('coin'); }, 700);
          scores[scorer]++;
          updateScore();
          var msg;
          if (f.result === 'self') msg = 'Oops! ' + (mode === 'cpu' ? (who === 0 ? 'You soaked yourself. A point to the computer.' : 'The computer soaked itself! A point to you.') : n[who] + ' got soaked by their own balloon! A point to ' + n[other] + '.');
          else if (mode === 'cpu') msg = who === 0 ? 'Direct hit! You soaked the computer.' : 'Splash! The computer got you.';
          else msg = 'Direct hit! ' + n[who] + ' soaked ' + n[other] + '.';
          api.status(msg + ' ' + scoreWords() + '.');
          api.announce(msg);
          var over = scores[scorer] >= TO_WIN;
          later(reduced ? 1.2 : 2.1, function () {
            if (over) gameOver(scorer);
            else { turn = wetOne; newRound(); }
          });
          return;
        }
        /* a miss: splash where it landed */
        if (f.result === 'building' || f.result === 'street') {
          splash(f.x, f.y, 22, 150);
          api.sound('pop'); api.tone(200, 0.08, 'triangle', 0.06);
          addMark({ type: 'wet', x: f.x, y: f.y + BALLOON_R * 0.6, r: 13, seed: api.random() });
          if (f.result === 'building' && f.roof && notchAllowed(f.x)) {
            notch(f.x, f.hitTop);
            api.sound('thud');
          }
          floatText('splat', f.x, f.y - 14, '#9fd8ff', 15, 0.9);
        } else {
          api.sound('wrong');
        }
        var who2 = isCpu(who) ? 'The computer' : (mode === 'cpu' ? 'You' : n[who]);
        api.status(missWords(f, who2) + ' ' + (isCpu(other) ? 'Computer’s turn next.' : (mode === 'cpu' ? 'Your turn next.' : n[other] + '’s turn next.')));
        later(reduced ? 0.6 : 1.0, function () { turn = other; beginTurn(); });
      }
      function missWords(f, who) {
        if (f.result === 'out') return f.err > 0 ? 'Out of town! ' + who + ' threw way too far.' : 'Out of town! The wind took it.';
        var e = f.err, size = Math.abs(e);
        var how = size < 30 ? (e < 0 ? 'Just short!' : 'Just over!') : size < 110 ? (e < 0 ? 'A bit short.' : 'A bit too far.') : (e < 0 ? 'Way short.' : 'Way too far.');
        return 'Splat! ' + how;
      }
      function notchAllowed(x) {
        /* never dig away the roof under anyone's feet */
        return city.players.every(function (p) { return Math.abs(x - p.x) > CHAR_W / 2 + 16; });
      }
      function notch(x, top) {
        var R = 9, cy = top, i;
        for (i = Math.max(0, Math.floor(x - R)); i <= Math.min(city.W - 1, Math.ceil(x + R)); i++) {
          var dx = i - x, dy = Math.sqrt(Math.max(0, R * R - dx * dx));
          if (city.tops[i] < cy + dy && city.tops[i] >= cy - dy - 1) city.tops[i] = Math.min(city.H, cy + dy);
        }
        addMark({ type: 'notch', x: x, y: cy, r: R });
        for (var k = 0; k < 6; k++) splash(x, cy, 1, 90);
      }
      function scoreWords() { var n = names(); return n[0] + ' ' + scores[0] + ', ' + n[1] + ' ' + scores[1]; }
      function updateScore() {
        var n = names();
        name1.textContent = n[0] + ' '; name2.textContent = n[1] + ' ';
        score1.textContent = String(scores[0]); score2.textContent = String(scores[1]);
      }
      function gameOver(winner) {
        state = 'over';
        canvas.classList.remove('is-live');
        setPanel(false);
        var n = names(), title, msg;
        if (mode === 'cpu') {
          record[level][winner === 0 ? 0 : 1]++;
          api.store.set('record', record);
          if (winner === 0) { title = 'You win!'; msg = 'You beat the computer on ' + level[0].toUpperCase() + level.slice(1) + ', ' + scores[0] + ' to ' + scores[1] + '.'; }
          else { title = 'The computer wins'; msg = scores[1] + ' to ' + scores[0] + '. ' + (scores[0] === 2 ? 'So close!' : 'Watch its numbers and the wind flag, and try again!'); }
        } else {
          title = n[winner] + ' wins!'; msg = scores[winner] + ' to ' + scores[1 - winner] + '. Everyone is a bit damp.';
        }
        whoText.textContent = 'Game over'; windText.textContent = '';
        whoChip.style.background = winner === 0 ? 'var(--sk-p1)' : 'var(--sk-p2)';
        ovTitle.textContent = title; ovMsg.textContent = msg; ovSub.textContent = recordWords();
        ovMain.textContent = '▶ Play again'; ovMain.onclick = newGame;
        ovAlt.hidden = false; ovAlt.onclick = showStart;
        settingsEl.hidden = true;
        overlay.hidden = false;
        fitCard();
        api.status(title + ' ' + msg);
        if (mode === 'cpu' && winner === 1) api.sound('lose');
        else api.celebrate(mode === 'cpu' ? 'You win ' + scores[0] + ' to ' + scores[1] + '!' : n[winner] + ' wins!');
        try { ovMain.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
      function recordWords() {
        if (mode !== 'cpu') return 'First to ' + TO_WIN + ' splashes wins.';
        return 'Your wins against the computer: Easy ' + record.easy[0] + ' · Normal ' + record.normal[0] + ' · Hard ' + record.hard[0];
      }
      function showStart() {
        state = 'menu';
        canvas.classList.remove('is-live');
        setPanel(false);
        ovTitle.textContent = 'Skyline';
        ovMsg.textContent = 'Throw water balloons from roof to roof. Pick an angle and a speed, and watch the wind. First to ' + TO_WIN + ' splashes wins.';
        ovSub.textContent = recordWords();
        ovMain.textContent = '▶ Start'; ovMain.onclick = newGame;
        ovAlt.hidden = true;
        settingsEl.hidden = false;
        levelSeg.hidden = mode !== 'cpu';
        overlay.hidden = false;
        whoText.textContent = 'Press Start';
        windText.textContent = '';
        fitCard();
        api.status('Press Start. First to ' + TO_WIN + ' splashes wins.');
        draw();
      }
      function setMode(m, quiet) {
        mode = m; api.store.set('mode', m);
        Object.keys(modeBtns).forEach(function (k) { modeBtns[k].setAttribute('aria-pressed', String(k === m)); });
        levelSeg.hidden = m !== 'cpu';
        ovSub.textContent = recordWords();
        updateScore();
        if (city) describe();
        if (!quiet) api.sound('click');
        fitCard();
      }
      function setLevel(l, quiet) {
        level = l; api.store.set('level', l);
        Object.keys(levelBtns).forEach(function (k) { levelBtns[k].setAttribute('aria-pressed', String(k === l)); });
        if (!quiet) api.sound('click');
      }

      /* ---------- the aim controls ---------- */
      function setInputs(A) {
        angleRange.value = angleNum.value = String(A.angle);
        speedRange.value = speedNum.value = String(A.speed);
      }
      function setPanel(on) {
        panel.classList.toggle('is-off', !on);
        [angleRange, angleNum, speedRange, speedNum, throwBtn].forEach(function (el) { el.disabled = !on; });
      }
      var lastTick = 0;
      function setAim(angle, speed, quiet) {
        if (state !== 'aim') return;
        var A = aims[turn];
        var na = Math.max(0, Math.min(90, Math.round(angle))), ns = Math.max(MIN_SPEED, Math.min(MAX_SPEED, Math.round(speed)));
        if (na === A.angle && ns === A.speed) return;
        A.angle = na; A.speed = ns;
        setInputs(A);
        if (!quiet && clock - lastTick > 0.05) { lastTick = clock; api.sound('tick'); }
        startLoop();
      }
      function fromInputs(e) {
        var t = e.target, v = Number(t.value);
        if (!isFinite(v) || t.value === '') return;
        if (t === angleRange || t === angleNum) setAim(v, aims[turn].speed);
        else setAim(aims[turn].angle, v);
      }
      [angleRange, speedRange].forEach(function (el) { el.addEventListener('input', fromInputs); });
      [angleNum, speedNum].forEach(function (el) {
        el.addEventListener('change', fromInputs);
        el.addEventListener('input', function (e) { if (e.target.value !== '' && Number(e.target.value) >= Number(e.target.min)) fromInputs(e); });
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); fromInputs(e); doThrow(); } });
        el.addEventListener('blur', function () { setInputs(aims[turn]); });
      });
      throwBtn.addEventListener('click', function () { doThrow(); });

      /* drag on the city to aim */
      function toWorld(e) {
        var r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width * worldW, y: (e.clientY - r.top) / r.height * worldH };
      }
      function aimAt(e) {
        var p = toWorld(e), hand = handOf(city, turn);
        var dx = (p.x - hand.x) * hand.dir, dy = hand.y - p.y;
        if (dx * dx + dy * dy < 25) return;
        var a = Math.atan2(dy, dx) * 180 / Math.PI;
        if (a < 0) a = dx < 0 ? 90 : 0;
        if (a > 90) a = 90;
        setAim(a, Math.sqrt(dx * dx + dy * dy) / arrowPerSpeed());
        api.status('Angle ' + aims[turn].angle + '°, speed ' + aims[turn].speed + '. Let go, then press Throw.');
      }
      function onDown(e) {
        if (e.button > 0) return;
        api.unlockSound();
        if (state !== 'aim' || isCpu(turn)) return;
        e.preventDefault();
        dragging = true; dragId = e.pointerId;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        aimAt(e);
      }
      function onMove(e) { if (dragging && e.pointerId === dragId) { e.preventDefault(); aimAt(e); } }
      function onUp(e) {
        if (!dragging || e.pointerId !== dragId) return;
        dragging = false;
        if (state === 'aim') api.status('Angle ' + aims[turn].angle + '°, speed ' + aims[turn].speed + '. Press Throw!');
      }
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      function noMenu(e) { e.preventDefault(); }
      canvas.addEventListener('contextmenu', noMenu);

      /* keyboard */
      function onKey(e) {
        if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
        var tgt = e.target, k = e.key;
        if (tgt && tgt.closest && tgt.closest('input, select, textarea')) return;
        var inRoot = !!(tgt && root.contains(tgt));
        if (!inRoot && tgt && tgt !== document.body) return;
        if (state === 'menu' || state === 'over') {
          if ((k === ' ' || k === 'Enter') && tgt === canvas) { e.preventDefault(); ovMain.click(); }
          return;
        }
        if (state !== 'aim') return;
        if (inRoot && tgt.tagName === 'BUTTON' && (k === ' ' || k === 'Enter')) return;
        var A = aims[turn], big = e.shiftKey ? 5 : 1;
        if (k === 'ArrowUp') setAim(A.angle + big, A.speed);
        else if (k === 'ArrowDown') setAim(A.angle - big, A.speed);
        else if (k === 'ArrowRight') setAim(A.angle, A.speed + big);
        else if (k === 'ArrowLeft') setAim(A.angle, A.speed - big);
        else if (k === ' ' || k === 'Enter') doThrow();
        else return;
        e.preventDefault();
      }
      document.addEventListener('keydown', onKey);
      newBtn.addEventListener('click', function () { cpuAnim = null; nextAt = 0; flight = null; showStart(); });
      function onVisibility() { if (document.hidden) { stopLoop(); dragging = false; } else { draw(); if (wantLoop()) startLoop(); } }
      document.addEventListener('visibilitychange', onVisibility);

      function fitCard() {
        ovMsg.hidden = false;
        var card = ovMsg.parentNode;
        if (!overlay.hidden && card && card.scrollHeight > card.clientHeight + 1) ovMsg.hidden = true;
      }

      var lastW = 0, lastDpr = 0;
      function maybeResize() {
        var w = Math.round(root.clientWidth), r = Math.min(2, window.devicePixelRatio || 1);
        if (w && (w !== lastW || r !== lastDpr)) { lastW = w; lastDpr = r; resize(); }
      }
      var ro = new ResizeObserver(maybeResize);
      ro.observe(root);
      window.addEventListener('resize', maybeResize);
      if (document.fonts && document.fonts.load) document.fonts.load('20px Bungee').then(function () { if (!destroyed) { readFonts(); draw(); } }, function () {});

      /* first paint: a city behind the start card */
      for (var si = 0; si < 70; si++) stars.push(api.random(), api.random(), api.random());
      (function () {
        var narrow = (root.clientWidth || 360) < 560;
        worldW = narrow ? 560 : 800; worldH = Math.round(worldW * (narrow ? 0.85 : 0.62));
        city = makeCity(worldW, worldH, api.random);
      })();
      setMode(mode, true); setLevel(level, true);
      maybeResize();
      describe();
      showStart();
      setPanel(false);

      return {
        destroy: function () {
          destroyed = true;
          stopLoop();
          timers.forEach(clearTimeout); timers.length = 0;
          ro.disconnect();
          window.removeEventListener('resize', maybeResize);
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }
  });
})();
