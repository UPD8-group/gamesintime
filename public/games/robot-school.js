/* Robot School: the flagship of the "2030 and beyond" hall, designed fresh for Games in Time.

   You are a teacher at a robot school in 2035. Your student is Pip, a brand-new robot with an empty brain.
   Four lessons, each a little game, each a different way that machines really learn:
     1. Snack Sorter     learning from labelled examples: one artificial neuron draws a line on a chart.
     2. Doodle Detective learning to see: Pip averages your drawings into "memory pictures" and compares.
     3. Maze Runner      learning by trying: Q-learning, with rewards you choose and a curiosity slider.
     4. Fair Robot       learning from unfair examples makes an unfair robot, and better examples fix it.

   Everything Pip learns is real machine learning, written below in plain JavaScript. It runs only in this
   browser tab. Nothing is sent anywhere (the site's security rules block it anyway), and no AI service is used.
   Progress (stars, big ideas, your examples and drawings) is saved on this device with api.store.

   The pure learning code is at the top (PIP'S BRAINS) and is also attached to the registered game as 'lab',
   so the automated checks can prove that each brain really learns. The drawing code comes next (ART), then
   the game itself inside mount(). See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  /* ---------- little helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  /* A random number maker that always gives the same numbers for the same seed. The game uses api.random;
     the checks use this so their results never change. */
  function seeded(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(list, rnd) {
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = list[i]; list[i] = list[j]; list[j] = t; }
    return list;
  }

  /* =====================================================================================================
     PIP'S BRAINS
     ===================================================================================================== */

  /* ---------- Brain 1: one artificial neuron (lessons 1 and 4) ----------
     A neuron takes two numbers (x1 and x2) and adds them up with a "weight" for each, plus a "bias":
         total = w1 × x1 + w2 × x2 + b
     A big positive total means "yes" (fruit, or neat), a big negative total means "no" (veg, or wobbly).
     The sigmoid squashes the total into a chance between 0 and 1. Where the total is exactly 0, the chance is
     50%: those points make a straight line on the chart. That line is Pip's whole idea of the difference.
     Big AI systems are built from millions of neurons like this one. */
  function sigmoid(z) { return z > 30 ? 1 : z < -30 ? 0 : 1 / (1 + Math.exp(-z)); }
  function Neuron() { this.w1 = 0; this.w2 = 0; this.b = 0; }
  Neuron.prototype.prob = function (x1, x2) { return sigmoid(this.w1 * x1 + this.w2 * x2 + this.b); };
  Neuron.prototype.copy = function () { var n = new Neuron(); n.w1 = this.w1; n.w2 = this.w2; n.b = this.b; return n; };
  /* Training, one small step (called "gradient descent"). For every example Pip asks: how wrong was my chance?
     If it said 30% fruit for a strawberry, it was 0.7 too low. Each weight is nudged a little in the direction
     that makes those mistakes smaller. The l2 part gently pulls the weights back towards 0, so Pip never gets
     wildly over-confident from just a few examples. Hundreds of tiny steps slide the line into a good place. */
  Neuron.prototype.learnStep = function (examples, rate, l2) {
    var n = examples.length;
    if (!n) return;
    var g1 = 0, g2 = 0, gb = 0;
    for (var i = 0; i < n; i++) {
      var e = examples[i];
      var err = this.prob(e.x1, e.x2) - e.y;   // how wrong, and which way
      g1 += err * e.x1; g2 += err * e.x2; gb += err;
    }
    this.w1 -= rate * (g1 / n + l2 * this.w1);
    this.w2 -= rate * (g2 / n + l2 * this.w2);
    this.b -= rate * (gb / n);
  };
  Neuron.prototype.train = function (examples, steps, rate, l2) { for (var s = 0; s < steps; s++) this.learnStep(examples, rate, l2); };
  var TRAIN = { steps: 400, rate: 1.5, l2: 0.01 };

  /* ---------- Lesson 1 data: the canteen's snacks ----------
     Pip cannot taste or see colours. Its two sensors give every snack two numbers from 0 to 10: how sweet and
     how juicy. These are our own made-up but sensible readings. Each real snack wobbles a little from them. */
  var SNACKS = [
    { id: 'strawberry', name: 'strawberry', fruit: 1, sweet: 7, juicy: 7.5 },
    { id: 'banana', name: 'banana', fruit: 1, sweet: 8, juicy: 3 },
    { id: 'watermelon', name: 'watermelon', fruit: 1, sweet: 7.5, juicy: 9.5 },
    { id: 'orange', name: 'orange', fruit: 1, sweet: 6.5, juicy: 9 },
    { id: 'grapes', name: 'bunch of grapes', fruit: 1, sweet: 8, juicy: 7.5 },
    { id: 'lemon', name: 'lemon', fruit: 1, sweet: 2, juicy: 8.5 },
    { id: 'apple', name: 'apple', fruit: 1, sweet: 6.5, juicy: 6.5 },
    { id: 'pear', name: 'pear', fruit: 1, sweet: 7, juicy: 6.5 },
    { id: 'cherries', name: 'pair of cherries', fruit: 1, sweet: 8.5, juicy: 6 },
    { id: 'pineapple', name: 'pineapple', fruit: 1, sweet: 7, juicy: 8 },
    { id: 'carrot', name: 'carrot', fruit: 0, sweet: 5, juicy: 3.5 },
    { id: 'broccoli', name: 'broccoli', fruit: 0, sweet: 1.5, juicy: 2.5 },
    { id: 'potato', name: 'potato', fruit: 0, sweet: 1, juicy: 2 },
    { id: 'lettuce', name: 'lettuce', fruit: 0, sweet: 1, juicy: 5 },
    { id: 'celery', name: 'celery stick', fruit: 0, sweet: 1, juicy: 6.5 },
    { id: 'onion', name: 'onion', fruit: 0, sweet: 3, juicy: 4.5 },
    { id: 'sweetpotato', name: 'sweet potato', fruit: 0, sweet: 6, juicy: 2 },
    { id: 'garlic', name: 'garlic bulb', fruit: 0, sweet: 1, juicy: 1.5 },
    { id: 'beetroot', name: 'beetroot', fruit: 0, sweet: 4, juicy: 4 },
    { id: 'cauliflower', name: 'cauliflower', fruit: 0, sweet: 2, juicy: 3 }
  ];
  /* The neuron works best with numbers from -1 to 1, so 0..10 becomes -1..1. */
  function norm10(v) { return (v - 5) / 5; }
  function snackExample(item, label) { return { x1: norm10(item.sweet), x2: norm10(item.juicy), y: label }; }
  /* One real snack: its type's numbers plus a little natural wobble (up to 0.4 either way). */
  function makeSnack(type, rnd) {
    var t = SNACKS[type];
    return {
      type: type,
      sweet: clamp(Math.round((t.sweet + (rnd() - 0.5) * 0.8) * 10) / 10, 0, 10),
      juicy: clamp(Math.round((t.juicy + (rnd() - 0.5) * 0.8) * 10) / 10, 0, 10)
    };
  }
  function snackGuess(neuron, item) { return neuron.prob(norm10(item.sweet), norm10(item.juicy)); }
  /* What fraction of these snacks Pip sorts correctly (compared with the canteen's list). */
  function sortAccuracy(neuron, items) {
    var right = 0;
    for (var i = 0; i < items.length; i++) if ((snackGuess(neuron, items[i]) >= 0.5 ? 1 : 0) === SNACKS[items[i].type].fruit) right++;
    return items.length ? right / items.length : 0;
  }
  function snackTypes() { var list = []; for (var i = 0; i < SNACKS.length; i++) list.push({ type: i, sweet: SNACKS[i].sweet, juicy: SNACKS[i].juicy }); return list; }
  /* The first lesson starts with two unusual snacks (a sour fruit, a dry fruit, a sweet vegetable...). With
     only those two, Pip learns a too-simple rule, like "sweet means fruit", and gets tricky snacks wrong on its
     first test. This finds every fruit and veg pair that a freshly trained neuron sorts at most 75% right. */
  function trickyPairs() {
    var pairs = [], all = snackTypes();
    for (var f = 0; f < SNACKS.length; f++) {
      if (!SNACKS[f].fruit) continue;
      for (var v = 0; v < SNACKS.length; v++) {
        if (SNACKS[v].fruit) continue;
        var n = new Neuron();
        n.train([snackExample(SNACKS[f], 1), snackExample(SNACKS[v], 0)], TRAIN.steps, TRAIN.rate, TRAIN.l2);
        if (sortAccuracy(n, all) <= 0.75) pairs.push([f, v]);
      }
    }
    return pairs;
  }

  /* ---------- Brain 2: memory pictures (lesson 2) ----------
     Pip sees a drawing as 16 rows of 16 squares, each on (1) or off (0): 256 numbers, nothing else.
     To compare drawings fairly, Pip first tidies each one up:
       1. crop to the part you drew and stretch it into a 12 by 12 box (keeping its shape), so big, small and
          off-centre drawings all line up;
       2. smudge it a little, so a line one square to the side still overlaps;
       3. scale the numbers so a drawing with lots of ink counts the same as one with a little.
     Pip's memory of a sign is the average of every tidied drawing of it you have taught. To guess, Pip
     measures how alike a new drawing is to each memory picture (1 means identical, 0 means nothing in common)
     and picks the closest. More drawings, in different styles, make better memory pictures. */
  var GRID = 16, SEE = 12;
  function seeVector(bits) {
    var minX = GRID, minY = GRID, maxX = -1, maxY = -1, x, y;
    for (y = 0; y < GRID; y++) for (x = 0; x < GRID; x++) {
      if (!bits[y * GRID + x]) continue;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    if (maxX < 0) return null;
    var out = new Float32Array(SEE * SEE);
    var bw = maxX - minX + 1, bh = maxY - minY + 1;
    var scale = (SEE - 1) / Math.max(bw, bh, 3);
    var offX = (SEE - bw * scale) / 2, offY = (SEE - bh * scale) / 2;
    /* 1. every drawn square lands on the 12 by 12 box, sharing itself between the boxes it overlaps */
    for (y = minY; y <= maxY; y++) for (x = minX; x <= maxX; x++) {
      if (!bits[y * GRID + x]) continue;
      var x0 = offX + (x - minX) * scale, x1 = x0 + scale, y0 = offY + (y - minY) * scale, y1 = y0 + scale;
      for (var ty = Math.floor(y0); ty < Math.ceil(y1); ty++) for (var tx = Math.floor(x0); tx < Math.ceil(x1); tx++) {
        if (tx < 0 || ty < 0 || tx >= SEE || ty >= SEE) continue;
        var ox = Math.min(x1, tx + 1) - Math.max(x0, tx), oy = Math.min(y1, ty + 1) - Math.max(y0, ty);
        if (ox > 0 && oy > 0) out[ty * SEE + tx] += ox * oy;
      }
    }
    /* 2. smudge: each square keeps a half share and gives a quarter to each neighbour, across then down */
    var across = new Float32Array(SEE * SEE), sm = new Float32Array(SEE * SEE);
    for (y = 0; y < SEE; y++) for (x = 0; x < SEE; x++) {
      var v = out[y * SEE + x] * 2;
      if (x > 0) v += out[y * SEE + x - 1];
      if (x < SEE - 1) v += out[y * SEE + x + 1];
      across[y * SEE + x] = v;
    }
    for (y = 0; y < SEE; y++) for (x = 0; x < SEE; x++) {
      var w = across[y * SEE + x] * 2;
      if (y > 0) w += across[(y - 1) * SEE + x];
      if (y < SEE - 1) w += across[(y + 1) * SEE + x];
      sm[y * SEE + x] = w;
    }
    /* 3. scale so the "length" of the 144 numbers is 1 */
    var len = 0;
    for (x = 0; x < sm.length; x++) len += sm[x] * sm[x];
    len = Math.sqrt(len) || 1;
    for (x = 0; x < sm.length; x++) sm[x] /= len;
    return sm;
  }
  /* How alike two tidied drawings are: multiply them square by square and add up (1 = the same). */
  function alike(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
  function SeeBrain(classes) {
    this.n = classes; this.sum = []; this.count = []; this.memory = [];
    for (var c = 0; c < classes; c++) { this.sum.push(new Float32Array(SEE * SEE)); this.count.push(0); this.memory.push(null); }
  }
  SeeBrain.prototype.add = function (cls, bits) {
    var v = seeVector(bits);
    if (!v) return false;
    var s = this.sum[cls], i, len = 0;
    for (i = 0; i < v.length; i++) s[i] += v[i];
    this.count[cls]++;
    for (i = 0; i < s.length; i++) len += s[i] * s[i];
    len = Math.sqrt(len) || 1;
    var m = new Float32Array(s.length);
    for (i = 0; i < s.length; i++) m[i] = s[i] / len;   // the average, scaled to length 1
    this.memory[cls] = m;
    return true;
  };
  SeeBrain.prototype.ready = function () { for (var c = 0; c < this.n; c++) if (!this.count[c]) return false; return true; };
  /* Pip's confidence: the more alike a memory is compared with the others, the bigger its share of 100%.
     (Each "alike" score is turned into exp(14 × alike), then the shares are scaled to add up to 1.) */
  SeeBrain.prototype.look = function (bits) {
    var v = seeVector(bits);
    if (!v) return null;
    var like = [], conf = [], total = 0, best = -1, c;
    for (c = 0; c < this.n; c++) like.push(this.memory[c] ? alike(v, this.memory[c]) : 0);
    for (c = 0; c < this.n; c++) {
      var e = this.memory[c] ? Math.exp(14 * like[c]) : 0;
      conf.push(e); total += e;
      if (this.memory[c] && (best < 0 || like[c] > like[best])) best = c;
    }
    for (c = 0; c < this.n; c++) conf[c] = total ? conf[c] / total : 0;
    return { guess: best, like: like, conf: conf, known: best >= 0 && like[best] >= 0.75 };
  };
  /* Wobbly practice drawings of each sign (0 star, 1 heart, 2 arrow). Used by "Draw one for me" and by the
     checks. style 0 or 1 picks one of two ways of drawing it. */
  function plot(bits, x, y) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < GRID && y < GRID) bits[y * GRID + x] = 1; }
  function strokes(bits, pts, rnd, wob) {
    for (var i = 0; i + 1 < pts.length; i++) {
      var a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])) * 2.5));
      for (var k = 0; k <= n; k++) { var t = k / n; plot(bits, a[0] + (b[0] - a[0]) * t + (rnd() - 0.5) * wob, a[1] + (b[1] - a[1]) * t + (rnd() - 0.5) * wob); }
    }
  }
  function heartPoint(t, k) { return [k * 16 * Math.pow(Math.sin(t), 3) / 17, k * -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 + 0.1]; }
  function sampleDrawing(cls, rnd, style) {
    var bits = new Uint8Array(GRID * GRID);
    if (style == null) style = rnd() < 0.5 ? 0 : 1;
    var size = 10 + rnd() * 5, cx = 7.5 + (rnd() - 0.5) * (15 - size) * 0.8, cy = 7.5 + (rnd() - 0.5) * (15 - size) * 0.8;
    var rot = (rnd() - 0.5) * 0.3, wob = 0.25 + rnd() * 0.35, pts = [], i, a;
    function P(x, y) { var c = Math.cos(rot), s = Math.sin(rot); return [cx + (x * c - y * s) * size / 2, cy + (x * s + y * c) * size / 2]; }
    if (cls === 0) {
      if (style === 0) {        // star outline: ten corners, out and in
        var inner = 0.4 + rnd() * 0.1;
        for (i = 0; i <= 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; var r = i % 2 ? inner : 1; pts.push(P(Math.cos(a) * r, Math.sin(a) * r)); }
      } else {                  // star in one go: five crossing lines
        for (i = 0; i <= 5; i++) { a = -Math.PI / 2 + i * Math.PI * 4 / 5; pts.push(P(Math.cos(a), Math.sin(a))); }
      }
      strokes(bits, pts, rnd, wob);
    } else if (cls === 1) {     // heart outline, or a coloured-in heart
      for (i = 0; i <= 40; i++) { var hp = heartPoint(i / 40 * Math.PI * 2, 1); pts.push(P(hp[0], hp[1])); }
      strokes(bits, pts, rnd, wob);
      if (style === 1) for (var k = 0.25; k < 1; k += 0.25) {
        pts = [];
        for (i = 0; i <= 40; i++) { hp = heartPoint(i / 40 * Math.PI * 2, k); pts.push(P(hp[0], hp[1])); }
        strokes(bits, pts, rnd, 0);
      }
    } else {                    // arrow pointing right: a stick arrow, or a fat block arrow
      var head = 0.35 + rnd() * 0.2;
      if (style === 0) {
        strokes(bits, [P(-1, 0), P(1, 0)], rnd, wob);
        strokes(bits, [P(1 - head, -head), P(1, 0), P(1 - head, head)], rnd, wob);
      } else {
        strokes(bits, [P(-1, -0.2), P(1 - head, -0.2), P(1 - head, -0.55), P(1, 0), P(1 - head, 0.55), P(1 - head, 0.2), P(-1, 0.2), P(-1, -0.2)], rnd, wob);
      }
    }
    return bits;
  }
  /* Drawings are saved as 64 hexadecimal digits (4 squares per digit). */
  function bitsToHex(bits) { var s = ''; for (var i = 0; i < bits.length; i += 4) s += (bits[i] | bits[i + 1] << 1 | bits[i + 2] << 2 | bits[i + 3] << 3).toString(16); return s; }
  function hexToBits(hex) {
    var bits = new Uint8Array(GRID * GRID);
    if (typeof hex !== 'string' || hex.length !== GRID * GRID / 4) return bits;
    for (var i = 0; i < hex.length; i++) { var n = parseInt(hex.charAt(i), 16) || 0; for (var b = 0; b < 4; b++) bits[i * 4 + b] = (n >> b) & 1; }
    return bits;
  }

  /* ---------- Brain 3: learning by trying, called Q-learning (lesson 3) ----------
     Pip has a table with a number for every square and every move (up, right, down, left): how good it thinks
     that move is from that square. At first every number is 0, so Pip has no idea and wanders at random.
     After each step Pip updates one number:
         new value = old value + half of (reward + 0.95 × the best value of the square it landed on − old value)
     Reaching the charger is a big reward (+10), a battery a small one (+3), a puddle a nasty surprise (−5).
     Over many tries, the good feeling spreads backwards from the charger, square by square (the glow you see),
     until Pip knows the best move everywhere. The 0.95 means a reward soon is worth more than one later, so the
     shortest way wins. Curiosity is the chance Pip tries a random move instead of its best one: that is how
     it finds new ways. Pip's sensors can tell when a wall is right next to it, so it never walks into one. */
  var MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // up, right, down, left
  var REWARD = { exit: 10, battery: 3, puddle: -5 };
  /* '#' wall, '.' floor, 'S' start, 'E' charger, 'P' puddle, 'B' battery */
  var MAZES = [
    { name: 'Maze 1', rows: ['S...#', '.#.##', '.#...', '.#.#.', '....E'] },
    { name: 'Maze 2', rows: ['S....#.', '.###.#.', '.#...P.', '.#.#.#.', '.#.#...', '.#.###.', '...#..E'] },
    { name: 'Maze 3', rows: ['S...#....', '.##.#.##.', '.#.......', '.#.##.##.', '.#..#..#.', '.##.#P.#.', '....#..#.', '.####.##.', '........E'] }
  ];
  function Maze(rows) {
    this.h = rows.length; this.w = rows[0].length; this.n = this.w * this.h;
    this.wall = []; this.puddle = []; this.battery = [];
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) {
      var ch = rows[y].charAt(x), i = y * this.w + x;
      this.wall.push(ch === '#' ? 1 : 0);
      this.puddle.push(ch === 'P' ? 1 : 0);
      if (ch === 'B') this.battery.push(i);
      if (ch === 'S') this.start = i;
      if (ch === 'E') this.exit = i;
    }
  }
  /* Where a move from square i leads, or -1 if a wall or the edge is in the way. */
  Maze.prototype.next = function (i, a) {
    var x = i % this.w + MOVES[a][0], y = Math.floor(i / this.w) + MOVES[a][1];
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    var j = y * this.w + x;
    return this.wall[j] ? -1 : j;
  };
  /* The fewest steps from the start to the charger, flooding outwards one square at a time (a "breadth-first
     search"). dry: true to keep out of puddles. -1 when there is no way. */
  Maze.prototype.shortest = function (dry) {
    var dist = [], queue = [this.start], head = 0;
    for (var k = 0; k < this.n; k++) dist.push(-1);
    dist[this.start] = 0;
    while (head < queue.length) {
      var i = queue[head++];
      if (i === this.exit) return dist[i];
      for (var a = 0; a < 4; a++) {
        var j = this.next(i, a);
        if (j < 0 || dist[j] >= 0 || (dry && this.puddle[j])) continue;
        dist[j] = dist[i] + 1; queue.push(j);
      }
    }
    return -1;
  };
  function Learner(maze) { this.maze = maze; this.alpha = 0.5; this.gamma = 0.95; this.reset(); }
  Learner.prototype.reset = function () {
    this.q = new Float32Array(this.maze.n * 4 * 4);   // squares × (which of up to 2 batteries Pip holds) × 4 moves
    this.tries = 0; this.history = [];
    this.begin();
  };
  Learner.prototype.state = function () { return this.pos + this.maze.n * this.got; };
  Learner.prototype.begin = function () { this.pos = this.maze.start; this.got = 0; this.steps = 0; this.wet = 0; this.done = false; };
  /* A try ends when Pip reaches the charger, or after 10 steps for every square (its battery runs out). */
  Learner.prototype.maxSteps = function () { return this.maze.n * 10; };
  /* The best move from state s (ties are broken at random, which is why a new Pip wanders). */
  Learner.prototype.best = function (s, rnd) {
    var cell = s % this.maze.n, bestA = -1, bestV = 0, ties = 0;
    for (var a = 0; a < 4; a++) {
      if (this.maze.next(cell, a) < 0) continue;
      var v = this.q[s * 4 + a];
      if (bestA < 0 || v > bestV + 1e-9) { bestV = v; bestA = a; ties = 1; }
      else if (v > bestV - 1e-9) { ties++; if (rnd() * ties < 1) bestA = a; }
    }
    return bestA;
  };
  Learner.prototype.value = function (s) {
    var cell = s % this.maze.n, best = null;
    for (var a = 0; a < 4; a++) { if (this.maze.next(cell, a) < 0) continue; var v = this.q[s * 4 + a]; if (best === null || v > best) best = v; }
    return best === null ? 0 : best;
  };
  /* One step. curiosity: chance of a random move (0 to 1). learn: false when Pip is only showing what it knows. */
  Learner.prototype.step = function (rnd, curiosity, learn) {
    var s = this.state(), cell = this.pos, a, explored = false;
    if (curiosity > 0 && rnd() < curiosity) {
      var open = [];
      for (var k = 0; k < 4; k++) if (this.maze.next(cell, k) >= 0) open.push(k);
      a = open[Math.floor(rnd() * open.length)]; explored = true;
    } else a = this.best(s, rnd);
    var j = this.maze.next(cell, a), r = 0, event = '';
    this.pos = j; this.steps++;
    if (this.maze.puddle[j]) { r += REWARD.puddle; this.wet++; event = 'puddle'; }
    var bi = this.maze.battery.indexOf(j);
    if (bi >= 0 && !(this.got & (1 << bi))) { this.got |= 1 << bi; r += REWARD.battery; event = 'battery'; }
    if (j === this.maze.exit) { r += REWARD.exit; this.done = true; event = 'exit'; }
    if (learn) {
      /* the Q-learning update: nudge this move's value towards (reward + 0.95 × best value from where it landed) */
      var target = r + (this.done ? 0 : this.gamma * this.value(this.state()));
      this.q[s * 4 + a] += this.alpha * (target - this.q[s * 4 + a]);
    }
    return { a: a, from: cell, to: j, r: r, explored: explored, event: event, done: this.done, out: this.steps >= this.maxSteps() };
  };
  /* End a try (reached the charger, or ran out of steps) and go back to the start. */
  Learner.prototype.finish = function (learn) {
    var res = { steps: this.steps, reached: this.done, wet: this.wet, got: this.got };
    if (learn) { this.tries++; this.history.push(this.done ? this.steps : -this.steps); if (this.history.length > 400) this.history.shift(); }
    this.begin();
    return res;
  };
  Learner.prototype.episode = function (rnd, curiosity, learn) {
    var max = this.maxSteps();
    while (!this.done && this.steps < max) this.step(rnd, curiosity, learn);
    return this.finish(learn);
  };
  /* Has Pip mastered the maze? Its best guesses (no curiosity, no learning) must reach the charger without
     getting wet, in no more than 2 steps over the shortest dry way. (A detour for a battery you placed counts:
     Pip did what you rewarded.) When puddles block every dry way, it just needs a short way. */
  function mastered(maze, res) {
    if (!res.reached) return false;
    var dry = maze.shortest(true);
    if (dry < 0) return res.steps <= maze.shortest(false) + 2;
    return !res.wet && (res.steps <= dry + 2 || res.got > 0);
  }

  /* ---------- Lesson 4 data: neat writing ----------
     Each page is [slant, wobble, neat, hand]. slant goes from -1 (leans left) to 1 (leans right). wobble goes
     from 0 (smooth) to 1 (very wobbly). The teacher's rule is simple: wobble under about 0.45 is neat. Slant
     has nothing to do with it. But last year's class happened to be all right-handed, and in their pages the
     neat writers all slanted strongly to the right. */
  var FAIR = {
    train: [
      [0.55, 0.15, 1, 'R'], [0.65, 0.3, 1, 'R'], [0.8, 0.4, 1, 'R'], [0.9, 0.2, 1, 'R'], [0.6, 0.35, 1, 'R'], [0.75, 0.1, 1, 'R'],
      [-0.2, 0.5, 0, 'R'], [0.0, 0.55, 0, 'R'], [-0.3, 0.65, 0, 'R'], [0.1, 0.6, 0, 'R'], [0.25, 0.85, 0, 'R'], [0.4, 0.95, 0, 'R']
    ],
    today: [
      [0.6, 0.2, 1, 'R', 'Jack'], [0.45, 0.3, 1, 'R', 'Olivia'], [0.75, 0.15, 1, 'R', 'Noah'], [0.3, 0.75, 0, 'R', 'Isla'], [0.55, 0.85, 0, 'R', 'Lucas'], [0.15, 0.65, 0, 'R', 'Chloe'],
      [-0.6, 0.15, 1, 'L', 'Mia'], [-0.4, 0.25, 1, 'L', 'Leo'], [-0.75, 0.3, 1, 'L', 'Ana'], [-0.45, 0.8, 0, 'L', 'Sam'], [-0.65, 0.7, 0, 'L', 'Zara'], [-0.25, 0.9, 0, 'L', 'Kai']
    ],
    tray: [
      [0.7, 0.25, 1, 'R', 'Ruby'], [0.5, 0.1, 1, 'R', 'Tom'], [0.2, 0.8, 0, 'R', 'Ella'], [0.05, 0.7, 0, 'R', 'Max'],
      [-0.55, 0.2, 1, 'L', 'Priya'], [-0.7, 0.35, 1, 'L', 'Ben'], [-0.5, 0.75, 0, 'L', 'Grace'], [-0.35, 0.85, 0, 'L', 'Ali']
    ]
  };
  function pageExample(p) { return { x1: p[0], x2: (p[1] - 0.5) * 2, y: p[2] }; }
  function pageGuess(neuron, p) { var e = pageExample(p); return neuron.prob(e.x1, e.x2); }
  /* How many pages Pip judges correctly, for right-handed (R) and left-handed (L) writers. */
  function fairReport(neuron, pages) {
    var r = { L: 0, R: 0, nL: 0, nR: 0 };
    for (var i = 0; i < pages.length; i++) {
      var p = pages[i];
      r['n' + p[3]]++;
      if ((pageGuess(neuron, p) >= 0.5 ? 1 : 0) === p[2]) r[p[3]]++;
    }
    return r;
  }

  var LAB = {
    seeded: seeded, Neuron: Neuron, TRAIN: TRAIN, SNACKS: SNACKS, norm10: norm10, snackExample: snackExample, makeSnack: makeSnack,
    snackGuess: snackGuess, sortAccuracy: sortAccuracy, snackTypes: snackTypes, trickyPairs: trickyPairs,
    GRID: GRID, seeVector: seeVector, SeeBrain: SeeBrain, sampleDrawing: sampleDrawing, bitsToHex: bitsToHex, hexToBits: hexToBits,
    MAZES: MAZES, Maze: Maze, Learner: Learner, mastered: mastered, REWARD: REWARD,
    FAIR: FAIR, pageExample: pageExample, pageGuess: pageGuess, fairReport: fairReport
  };

  /* =====================================================================================================
     ART: everything is drawn here in code. Pip, the snacks, the signs and the handwriting are our own designs.
     ===================================================================================================== */
  var TAU = Math.PI * 2;
  /* The 2030s hall's aurora colours. pal() refreshes them from the page's CSS variables when the game starts. */
  var C = {
    cyan: '#5ef2ff', violet: '#a78bfa', mint: '#5effa1', pink: '#ff7a90', sun: '#ffe36e', ink: '#eaf2ff', muted: '#a9b8d6', faint: '#5b6a8a',
    bg: '#04060d', bg2: '#080c18', surface: '#0e1426', surface2: '#151d36',
    shell: '#e8ecff', shellShade: '#b7bfee', shellDark: '#7f88c4', screen: '#0a0f24', screen2: '#121b3e', line: '#262c55'
  };
  var FONT = { head: 'Sora, Outfit, system-ui, sans-serif', mono: 'ui-monospace, Menlo, Consolas, monospace', hand: '"Comic Sans MS", "Chalkboard SE", "Segoe Print", "Marker Felt", "Trebuchet MS", sans-serif' };
  function pal(el) {
    try {
      var cs = getComputedStyle(el);
      var v = function (n, fb) { var s = cs.getPropertyValue(n).trim(); return s || fb; };
      C.cyan = v('--peacock', C.cyan); C.violet = v('--cobalt', C.violet); C.mint = v('--leaf', C.mint); C.pink = v('--rose', C.pink);
      C.ink = v('--ink', C.ink); C.muted = v('--ink-muted', C.muted); C.faint = v('--ink-faint', C.faint);
      C.bg = v('--bg', C.bg); C.bg2 = v('--bg-2', C.bg2); C.surface = v('--surface', C.surface); C.surface2 = v('--surface-2', C.surface2);
      FONT.head = v('--font-head', FONT.head); FONT.mono = v('--font-mono', FONT.mono);
    } catch (e) { /* keep the defaults */ }
  }
  /* '#rrggbb' plus an opacity (rounded to steps of 1/40), as an rgba() string. Each colour's 41 strings are made
     once and kept, so drawing every frame builds no new strings. */
  var ramps = {};
  function rgba(hex, a) {
    var r = ramps[hex];
    if (!r) {
      r = [];
      var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()), n = m ? parseInt(m[1], 16) : 0;
      for (var k = 0; k <= 40; k++) r.push(m ? 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + (k / 40) + ')' : hex);
      ramps[hex] = r;
    }
    return r[Math.round((a < 0 ? 0 : a > 1 ? 1 : a) * 40)];
  }
  var fontCache = {};
  function headFont(px) { px = Math.round(px); return fontCache[px] || (fontCache[px] = '800 ' + px + 'px ' + FONT.head); }
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
  function starPath(c, x, y, r, inner, points, rot) {
    c.beginPath();
    for (var i = 0; i <= points * 2; i++) {
      var a = (rot || -Math.PI / 2) + i * Math.PI / points, rr = i % 2 ? r * inner : r;
      if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  }
  function heartPath(c, x, y, r) {
    c.beginPath();
    c.moveTo(x, y + r * 0.9);
    c.bezierCurveTo(x - r * 1.25, y + r * 0.05, x - r * 0.75, y - r * 0.95, x, y - r * 0.35);
    c.bezierCurveTo(x + r * 0.75, y - r * 0.95, x + r * 1.25, y + r * 0.05, x, y + r * 0.9);
    c.closePath();
  }
  function arrowPath(c, x, y, r) {
    c.beginPath();
    c.moveTo(x - r, y - r * 0.28); c.lineTo(x + r * 0.15, y - r * 0.28); c.lineTo(x + r * 0.15, y - r * 0.7);
    c.lineTo(x + r, y); c.lineTo(x + r * 0.15, y + r * 0.7); c.lineTo(x + r * 0.15, y + r * 0.28); c.lineTo(x - r, y + r * 0.28);
    c.closePath();
  }
  function sparkle(c, x, y, r, col) {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
    c.fill();
  }

  /* ---------- Pip ----------
     A friendly robot with a screen for a face. Everything is measured in units where the head is 100 wide, so
     Pip can be drawn at any size. x, y is the middle of the head; s is the head's width in pixels.
     p is the "actor" (see PipActor in the game): mood, arms, look, bulb, blink, sparkle and so on.
     opts.head: draw just the head (the maze runner). */
  /* Pip's gradients are made once per canvas and kept, so drawing 60 times a second makes nothing new. They are
     in Pip's own units, so they work at every size. */
  function pipGradients(c) {
    if (c.__rsPip) return c.__rsPip;
    var g = {};
    g.glow = c.createRadialGradient(0, 128, 2, 0, 128, 46);
    g.glow.addColorStop(0, rgba(C.cyan, 0.55)); g.glow.addColorStop(0.5, rgba(C.violet, 0.22)); g.glow.addColorStop(1, rgba(C.violet, 0));
    g.body = c.createLinearGradient(-34, 44, 34, 112);
    g.body.addColorStop(0, C.shell); g.body.addColorStop(1, C.shellShade);
    g.bulb = c.createRadialGradient(0, -60, 2, 0, -60, 26);
    g.bulb.addColorStop(0, rgba(C.sun, 0.75)); g.bulb.addColorStop(1, rgba(C.sun, 0));
    g.head = c.createLinearGradient(0, -40, 0, 40);
    g.head.addColorStop(0, C.shell); g.head.addColorStop(1, C.shellShade);
    g.screen = c.createLinearGradient(0, -28, 0, 28);
    g.screen.addColorStop(0, C.screen2); g.screen.addColorStop(1, C.screen);
    c.__rsPip = g;
    return g;
  }
  function drawPip(c, x, y, s, p, now, opts) {
    opts = opts || {};
    var u = s / 100, rm = !!opts.still, G = pipGradients(c);
    var mood = p.mood, bob = rm ? 0 : Math.sin(now / 520) * 2.2;
    var shiver = (mood === 'wet' && !rm) ? Math.sin(now / 28) * 1.6 : 0;
    c.save();
    c.translate(x + shiver * u, y);
    c.scale(u, u);
    if (!opts.head) {
      /* hover glow on the floor, and a soft jet under the body */
      c.fillStyle = G.glow; c.beginPath(); c.ellipse(0, 128, 46, 12, 0, 0, TAU); c.fill();
    }
    c.translate(0, bob);
    if (p.tilt) c.rotate(p.tilt);
    if (!opts.head) {
      c.fillStyle = rgba(C.mint, 0.35); c.beginPath(); c.moveTo(-12, 112); c.lineTo(12, 112); c.lineTo(0, 124 + (rm ? 0 : Math.sin(now / 90) * 3)); c.closePath(); c.fill();
      drawArm(c, p, now, rm, 1);
      /* body */
      c.fillStyle = G.body; roundRect(c, -34, 44, 68, 70, 26); c.fill();
      c.lineWidth = 2; c.strokeStyle = rgba(C.line, 0.5); c.stroke();
      /* chest light: a slow heartbeat of colour, busy bars while thinking, or a heart */
      c.fillStyle = C.screen; roundRect(c, -18, 60, 36, 24, 8); c.fill();
      var chest = p.chest || 'dot';
      if (chest === 'dot') {
        c.fillStyle = rgba(C.mint, rm ? 1 : Math.round((0.55 + 0.45 * (Math.sin(now / 400) * 0.5 + 0.5)) * 20) / 20);
        c.beginPath(); c.arc(0, 72, 4.5, 0, TAU); c.fill();
      } else if (chest === 'bars') {
        for (var b = 0; b < 4; b++) { var hh = 4 + 10 * (rm ? 0.6 : (Math.sin(now / 120 + b * 1.3) * 0.5 + 0.5)); c.fillStyle = b % 2 ? C.cyan : C.violet; c.fillRect(-12 + b * 6.5, 80 - hh, 4.5, hh); }
      } else if (chest === 'heart') {
        c.fillStyle = C.pink; heartPath(c, 0, 71, 8); c.fill();
      }
      drawArm(c, p, now, rm, 0);
      /* neck */
      c.fillStyle = C.shellDark; roundRect(c, -10, 34, 20, 12, 4); c.fill();
    }
    /* ears */
    c.fillStyle = C.violet;
    c.beginPath(); c.arc(-52, 0, 8, 0, TAU); c.arc(52, 0, 8, 0, TAU); c.fill();
    c.fillStyle = rgba(C.cyan, 0.9);
    c.beginPath(); c.arc(-53, 0, 3, 0, TAU); c.arc(53, 0, 3, 0, TAU); c.fill();
    /* antenna and its idea bulb */
    c.strokeStyle = C.shellDark; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -36); c.quadraticCurveTo(4, -46, 0, -54); c.stroke();
    if (p.bulb > 0.02) {
      c.globalAlpha = Math.min(1, p.bulb); c.fillStyle = G.bulb; c.beginPath(); c.arc(0, -60, 26, 0, TAU); c.fill(); c.globalAlpha = 1;
    }
    c.fillStyle = p.bulb > 0.02 ? C.sun : '#3a4270';
    c.beginPath(); c.arc(0, -60, 7, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(-2.2, -62.5, 2.2, 0, TAU); c.fill();
    /* head */
    c.fillStyle = G.head; roundRect(c, -50, -38, 100, 76, 24); c.fill();
    c.lineWidth = 2; c.strokeStyle = rgba(C.line, 0.5); c.stroke();
    /* face screen */
    c.fillStyle = G.screen; roundRect(c, -40, -28, 80, 56, 16); c.fill();
    c.fillStyle = 'rgba(255,255,255,.07)'; roundRect(c, -36, -25, 46, 10, 5); c.fill();
    drawFace(c, p, now, rm);
    c.restore();
    /* floating extras drawn in screen space around the head */
    if (opts.head) return;
    var t = now / 1000;
    if (p.sparkle > 0.02) {
      for (var k = 0; k < 5; k++) {
        var ang = k * 1.256 + (rm ? 0 : t * 0.9), dist = 62 + (rm ? 0 : Math.sin(t * 3 + k) * 6);
        sparkle(c, x + Math.cos(ang) * dist * u, y + bob * u + Math.sin(ang) * dist * 0.75 * u - 10 * u, (5 + (k % 2) * 3) * u * p.sparkle, rgba(k % 2 ? C.sun : C.cyan, p.sparkle));
      }
    }
    if (p.hearts > 0.02) {
      for (var hk = 0; hk < 4; hk++) {
        var rise = rm ? 0.5 : ((t * 0.6 + hk / 4) % 1);
        c.fillStyle = rgba(C.pink, p.hearts * (1 - rise));
        heartPath(c, x + (hk - 1.5) * 26 * u, y - 40 * u - rise * 50 * u, 7 * u); c.fill();
      }
    }
    if (mood === 'thinking') {
      for (var d = 0; d < 3; d++) {
        var on = rm ? 1 : ((Math.floor(t * 3) % 4) > d ? 1 : 0.25);
        c.fillStyle = rgba(C.cyan, on);
        c.beginPath(); c.arc(x + (64 + d * 11) * u, y + bob * u - (44 + d * 6) * u, (3 + d) * u, 0, TAU); c.fill();
      }
    }
    if (mood === 'confused') {
      c.fillStyle = C.sun; c.font = headFont(30 * u); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('?', x + 62 * u, y + bob * u - 46 * u + (rm ? 0 : Math.sin(t * 4) * 3 * u));
    }
    if (mood === 'wet') {
      c.fillStyle = rgba(C.cyan, 0.85);
      for (var w = 0; w < 3; w++) {
        var fall = rm ? 0.4 : ((t * 1.4 + w / 3) % 1);
        var dx = x + (-40 + w * 40) * u, dy = y - 30 * u + fall * 70 * u;
        c.beginPath(); c.moveTo(dx, dy - 6 * u); c.quadraticCurveTo(dx + 4 * u, dy, dx, dy + 3 * u); c.quadraticCurveTo(dx - 4 * u, dy, dx, dy - 6 * u); c.fill();
      }
    }
  }
  /* Arms are tubes from the shoulders to round hands. i 0 is the arm on our right (drawn in front of the body), i 1 the other. */
  var ARM_POSES = {
    down: [[44, 96], [-44, 96]],
    wave: [[58, 22], [-44, 96]],
    cheer: [[60, 20], [-60, 20]],
    hold: [[30, 90], [-30, 90]],
    left: [[44, 96], [-76, 60]],
    right: [[76, 60], [-44, 96]],
    shrug: [[60, 44], [-60, 44]],
    up: [[44, 96], [-58, 18]]
  };
  function drawArm(c, p, now, rm, i) {
    var pose = ARM_POSES[p.arms] || ARM_POSES.down;
    var sx = i === 0 ? 34 : -34, hx = pose[i][0], hy = pose[i][1];
    if (p.arms === 'wave' && i === 0 && !rm) { hx += Math.sin(now / 160) * 8; hy += Math.cos(now / 160) * 3; }
    var mx = (sx + hx) / 2 + (i === 0 ? 8 : -8), my = (58 + hy) / 2 + 6;
    c.strokeStyle = C.shellDark; c.lineWidth = 10; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx, 58); c.quadraticCurveTo(mx, my, hx, hy); c.stroke();
    c.strokeStyle = C.shellShade; c.lineWidth = 6;
    c.beginPath(); c.moveTo(sx, 58); c.quadraticCurveTo(mx, my, hx, hy); c.stroke();
    c.fillStyle = C.shell; c.beginPath(); c.arc(hx, hy, 8.5, 0, TAU); c.fill();
    c.lineWidth = 2; c.strokeStyle = rgba(C.line, 0.45); c.stroke();
  }
  /* The face: glowing eyes and mouth that show what Pip feels. */
  function drawFace(c, p, now, rm) {
    var mood = p.mood, lx = (p.look ? p.look[0] : 0) * 5, ly = (p.look ? p.look[1] : 0) * 4;
    var eyeCol = mood === 'aha' ? C.sun : mood === 'love' ? C.pink : C.cyan;
    var blink = p.blink || 0;
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (var side = -1; side <= 1; side += 2) {
      var ex = side * 17 + lx, ey = -5 + ly;
      c.fillStyle = eyeCol; c.strokeStyle = eyeCol;
      if (mood === 'happy' || mood === 'confident') {
        c.lineWidth = 5;
        c.strokeStyle = rgba(eyeCol, 0.3); c.lineWidth = 10; c.beginPath(); c.arc(ex, ey + 4, 7, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        c.strokeStyle = eyeCol; c.lineWidth = 5; c.beginPath(); c.arc(ex, ey + 4, 7, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      } else if (mood === 'aha') {
        c.fillStyle = rgba(C.sun, 0.3); starPath(c, ex, ey, 13, 0.45, 5); c.fill();
        c.fillStyle = C.sun; starPath(c, ex, ey, 9.5, 0.45, 5); c.fill();
      } else if (mood === 'love') {
        c.fillStyle = C.pink; heartPath(c, ex, ey, 9); c.fill();
      } else if (mood === 'surprised') {
        c.lineWidth = 4; c.beginPath(); c.arc(ex, ey, 8.5, 0, TAU); c.stroke();
        c.beginPath(); c.arc(ex, ey, 3, 0, TAU); c.fill();
      } else if (mood === 'sleepy') {
        c.lineWidth = 4; c.beginPath(); c.moveTo(ex - 7, ey + 2); c.lineTo(ex + 7, ey + 2); c.stroke();
      } else {
        var w = 11, hgt = 19;
        if (mood === 'confused' && side === 1) { w = 9; hgt = 12; }
        if (mood === 'thinking') { ex += 4; ey -= 3; }
        if (mood === 'sad' || mood === 'wet') hgt = 14;
        hgt = Math.max(2.5, hgt * (1 - blink));
        c.fillStyle = rgba(eyeCol, 0.28); roundRect(c, ex - w / 2 - 3, ey - hgt / 2 - 3, w + 6, hgt + 6, (w + 6) / 2); c.fill();
        c.fillStyle = eyeCol; roundRect(c, ex - w / 2, ey - hgt / 2, w, hgt, w / 2); c.fill();
        if (mood === 'sad' || mood === 'wet') {
          /* droopy lids */
          c.fillStyle = C.screen2;
          c.beginPath(); c.moveTo(ex - w, ey - hgt / 2 - 4); c.lineTo(ex + w, ey - hgt / 2 - 4); c.lineTo(side < 0 ? ex - w : ex + w, ey + 1); c.closePath(); c.fill();
        }
        if (mood === 'confused' && side === 1) {
          c.strokeStyle = eyeCol; c.lineWidth = 3; c.beginPath(); c.moveTo(ex - 8, ey - 14); c.lineTo(ex + 7, ey - 18); c.stroke();
        }
      }
    }
    /* cheeks */
    if (mood === 'happy' || mood === 'confident' || mood === 'aha' || mood === 'love') {
      c.fillStyle = rgba(C.pink, 0.45);
      c.beginPath(); c.ellipse(-28, 10, 6, 3.5, 0, 0, TAU); c.ellipse(28, 10, 6, 3.5, 0, 0, TAU); c.fill();
    }
    /* mouth */
    var my = 14;
    c.strokeStyle = eyeCol; c.fillStyle = eyeCol; c.lineWidth = 4;
    c.beginPath();
    if (mood === 'happy' || mood === 'love') { c.arc(0, my - 4, 10, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }
    else if (mood === 'confident' || mood === 'aha') { c.moveTo(-12, my - 2); c.lineTo(12, my - 2); c.arc(0, my - 2, 12, 0, Math.PI); c.closePath(); c.fill(); }
    else if (mood === 'sad') { c.arc(0, my + 9, 9, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); }
    else if (mood === 'surprised') { c.arc(0, my + 1, 5, 0, TAU); c.stroke(); }
    else if (mood === 'confused' || mood === 'wet') {
      for (var k = 0; k <= 12; k++) { var xx = -11 + k * 22 / 12, yy = my + Math.sin(k / 12 * TAU * 1.5 + (rm || mood !== 'wet' ? 0 : now / 60)) * 2.5; if (k) c.lineTo(xx, yy); else c.moveTo(xx, yy); }
      c.stroke();
    }
    else if (mood === 'thinking') { c.moveTo(-2, my); c.lineTo(9, my - 2); c.stroke(); }
    else if (mood === 'sleepy') { c.arc(0, my, 3, 0, TAU); c.stroke(); }
    else { c.moveTo(-7, my); c.quadraticCurveTo(0, my + 4, 7, my); c.stroke(); }
  }

  /* ---------- the snacks (lesson 1) ----------
     drawSnack(c, id, x, y, r): r is roughly the snack's radius. Simple shapes so they read at any size. */
  function blob(c, x, y, rx, ry, fill) { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
  function leaf(c, x, y, len, ang, col) {
    c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = col;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -len * 0.35, len, 0); c.quadraticCurveTo(len * 0.5, len * 0.35, 0, 0); c.fill();
    c.restore();
  }
  function shine(c, x, y, r) { c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(x, y, r * 0.5, r * 0.28, -0.6, 0, TAU); c.fill(); }
  /* bumps, berries and spots, kept as constants so drawing makes nothing new */
  var GRAPE_PTS = [[-0.45, -0.35], [0, -0.4], [0.45, -0.35], [-0.25, 0.05], [0.25, 0.05], [0, 0.45], [-0.5, 0.05], [0.5, 0.05]];
  var BROC_PTS = [[-0.5, -0.05], [0, -0.35], [0.5, -0.05], [-0.25, -0.5], [0.25, -0.5], [0, 0.1]];
  var CAULI_PTS = [[-0.45, 0], [0, -0.3], [0.45, 0], [-0.22, -0.45], [0.22, -0.45], [0, 0.1], [-0.3, 0.25], [0.3, 0.25]];
  var POTATO_SPOTS = [[-0.4, -0.2], [0.2, -0.3], [0.45, 0.2], [-0.1, 0.25]];
  var SWEETPOTATO_SPOTS = [[-0.4, -0.05], [0.1, -0.2], [0.45, 0.1]];
  function dots(c, list, r, size) { for (var i = 0; i < list.length; i++) { c.beginPath(); c.arc(list[i][0] * r, list[i][1] * r, r * size, 0, TAU); c.fill(); } }
  var SNACK_ART = {
    strawberry: function (c, r) {
      c.fillStyle = '#e8384f'; c.beginPath(); c.moveTo(0, r * 0.95);
      c.bezierCurveTo(-r * 1.0, r * 0.3, -r * 0.95, -r * 0.65, 0, -r * 0.55); c.bezierCurveTo(r * 0.95, -r * 0.65, r * 1.0, r * 0.3, 0, r * 0.95); c.fill();
      c.fillStyle = '#ffe08a';
      for (var i = 0; i < 9; i++) { var a = i * 2.4, d = (i % 3 + 1) * r * 0.2; c.beginPath(); c.ellipse(Math.cos(a) * d * 1.2, Math.sin(a) * d * 0.9 + r * 0.05, r * 0.05, r * 0.08, 0, 0, TAU); c.fill(); }
      for (var k = 0; k < 5; k++) leaf(c, 0, -r * 0.55, r * 0.5, -Math.PI / 2 + (k - 2) * 0.55, '#3fae4a');
    },
    banana: function (c, r) {
      c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(-r * 0.95, -r * 0.35);
      c.quadraticCurveTo(-r * 0.2, r * 0.75, r * 0.9, -r * 0.2); c.quadraticCurveTo(r * 0.2, r * 0.35, -r * 0.8, -r * 0.5); c.closePath(); c.fill();
      c.fillStyle = '#7a5520'; blob(c, -r * 0.9, -r * 0.43, r * 0.09, r * 0.09, '#7a5520'); blob(c, r * 0.88, -r * 0.22, r * 0.07, r * 0.07, '#7a5520');
    },
    watermelon: function (c, r) {
      c.fillStyle = '#2f9e44'; c.beginPath(); c.arc(0, -r * 0.25, r, 0, Math.PI); c.closePath(); c.fill();
      c.fillStyle = '#d3f9b5'; c.beginPath(); c.arc(0, -r * 0.25, r * 0.86, 0, Math.PI); c.closePath(); c.fill();
      c.fillStyle = '#f0405a'; c.beginPath(); c.arc(0, -r * 0.25, r * 0.76, 0, Math.PI); c.closePath(); c.fill();
      c.fillStyle = '#1b1b2b'; for (var i = 0; i < 5; i++) { c.beginPath(); c.ellipse((i - 2) * r * 0.26, r * 0.12 + (i % 2) * r * 0.16, r * 0.05, r * 0.09, 0, 0, TAU); c.fill(); }
    },
    orange: function (c, r) {
      blob(c, 0, r * 0.05, r * 0.85, r * 0.85, '#ff9a1f'); shine(c, -r * 0.3, -r * 0.3, r);
      c.fillStyle = 'rgba(160,70,0,.35)'; for (var i = 0; i < 6; i++) { c.beginPath(); c.arc(Math.cos(i) * r * 0.45, Math.sin(i * 1.7) * r * 0.45 + r * 0.05, r * 0.04, 0, TAU); c.fill(); }
      leaf(c, r * 0.05, -r * 0.75, r * 0.5, -0.4, '#3fae4a');
    },
    grapes: function (c, r) {
      var pts = GRAPE_PTS;
      for (var i = 0; i < pts.length; i++) { blob(c, pts[i][0] * r, pts[i][1] * r + r * 0.1, r * 0.3, r * 0.3, i % 2 ? '#8e44c9' : '#a259e0'); }
      for (i = 0; i < 3; i++) shine(c, pts[i][0] * r - r * 0.08, pts[i][1] * r, r * 0.35);
      c.strokeStyle = '#5b8a2e'; c.lineWidth = Math.max(1.5, r * 0.08); c.beginPath(); c.moveTo(0, -r * 0.6); c.lineTo(r * 0.1, -r * 0.95); c.stroke();
      leaf(c, r * 0.1, -r * 0.8, r * 0.45, -0.3, '#3fae4a');
    },
    lemon: function (c, r) {
      c.fillStyle = '#ffe14d'; c.beginPath(); c.moveTo(-r * 1.0, 0);
      c.quadraticCurveTo(-r * 0.75, -r * 0.75, 0, -r * 0.72); c.quadraticCurveTo(r * 0.75, -r * 0.75, r * 1.0, 0);
      c.quadraticCurveTo(r * 0.75, r * 0.75, 0, r * 0.72); c.quadraticCurveTo(-r * 0.75, r * 0.75, -r * 1.0, 0); c.fill();
      shine(c, -r * 0.3, -r * 0.3, r);
    },
    apple: function (c, r) {
      c.fillStyle = '#e83a3a'; c.beginPath(); c.moveTo(0, -r * 0.5);
      c.bezierCurveTo(r * 0.9, -r * 0.95, r * 1.15, r * 0.5, r * 0.3, r * 0.85); c.quadraticCurveTo(0, r * 0.75, -r * 0.3, r * 0.85);
      c.bezierCurveTo(-r * 1.15, r * 0.5, -r * 0.9, -r * 0.95, 0, -r * 0.5); c.fill();
      shine(c, -r * 0.35, -r * 0.2, r);
      c.strokeStyle = '#6b4420'; c.lineWidth = Math.max(1.5, r * 0.09); c.beginPath(); c.moveTo(0, -r * 0.45); c.lineTo(r * 0.08, -r * 0.85); c.stroke();
      leaf(c, r * 0.08, -r * 0.72, r * 0.45, -0.5, '#3fae4a');
    },
    pear: function (c, r) {
      c.fillStyle = '#b5d94a'; c.beginPath(); c.moveTo(0, -r * 0.75);
      c.bezierCurveTo(r * 0.45, -r * 0.75, r * 0.3, -r * 0.1, r * 0.75, r * 0.4); c.bezierCurveTo(r * 0.95, r * 0.95, -r * 0.95, r * 0.95, -r * 0.75, r * 0.4);
      c.bezierCurveTo(-r * 0.3, -r * 0.1, -r * 0.45, -r * 0.75, 0, -r * 0.75); c.fill();
      shine(c, -r * 0.3, r * 0.2, r);
      c.strokeStyle = '#6b4420'; c.lineWidth = Math.max(1.5, r * 0.08); c.beginPath(); c.moveTo(0, -r * 0.72); c.lineTo(r * 0.12, -r * 1.0); c.stroke();
    },
    cherries: function (c, r) {
      c.strokeStyle = '#4c8a2a'; c.lineWidth = Math.max(1.5, r * 0.08);
      c.beginPath(); c.moveTo(-r * 0.45, r * 0.25); c.quadraticCurveTo(-r * 0.2, -r * 0.5, r * 0.15, -r * 0.9); c.moveTo(r * 0.45, r * 0.3); c.quadraticCurveTo(r * 0.35, -r * 0.4, r * 0.15, -r * 0.9); c.stroke();
      blob(c, -r * 0.45, r * 0.45, r * 0.38, r * 0.38, '#c2183b'); blob(c, r * 0.45, r * 0.5, r * 0.38, r * 0.38, '#d81e45');
      shine(c, -r * 0.55, r * 0.33, r * 0.6); shine(c, r * 0.35, r * 0.38, r * 0.6);
      leaf(c, r * 0.15, -r * 0.9, r * 0.5, 0.2, '#3fae4a');
    },
    pineapple: function (c, r) {
      blob(c, 0, r * 0.25, r * 0.6, r * 0.72, '#f2b41b');
      c.strokeStyle = 'rgba(140,80,0,.55)'; c.lineWidth = Math.max(1, r * 0.06);
      c.save(); c.beginPath(); c.ellipse(0, r * 0.25, r * 0.6, r * 0.72, 0, 0, TAU); c.clip();
      for (var i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * r * 0.3 - r, -r); c.lineTo(i * r * 0.3 + r, r * 1.5); c.moveTo(i * r * 0.3 + r, -r); c.lineTo(i * r * 0.3 - r, r * 1.5); c.stroke(); }
      c.restore();
      for (var k = 0; k < 5; k++) leaf(c, 0, -r * 0.4, r * 0.6, -Math.PI / 2 + (k - 2) * 0.35, k % 2 ? '#2e8b3e' : '#3fae4a');
    },
    carrot: function (c, r) {
      c.fillStyle = '#ff8a1f'; c.beginPath(); c.moveTo(-r * 0.35, -r * 0.55); c.quadraticCurveTo(0, -r * 0.72, r * 0.35, -r * 0.55); c.lineTo(r * 0.04, r * 1.0); c.lineTo(-r * 0.04, r * 1.0); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(150,60,0,.45)'; c.lineWidth = Math.max(1, r * 0.05);
      for (var i = 0; i < 4; i++) { var yy = -r * 0.3 + i * r * 0.3; c.beginPath(); c.moveTo(-r * 0.25 + i * r * 0.05, yy); c.lineTo(-r * 0.05, yy + r * 0.04); c.stroke(); }
      for (var k = 0; k < 3; k++) leaf(c, 0, -r * 0.6, r * 0.5, -Math.PI / 2 + (k - 1) * 0.45, '#3fae4a');
    },
    broccoli: function (c, r) {
      c.fillStyle = '#9ccf6a'; c.beginPath(); c.moveTo(-r * 0.2, r * 0.95); c.lineTo(r * 0.2, r * 0.95); c.lineTo(r * 0.12, r * 0.1); c.lineTo(-r * 0.12, r * 0.1); c.closePath(); c.fill();
      var pts = BROC_PTS;
      for (var i = 0; i < pts.length; i++) blob(c, pts[i][0] * r, pts[i][1] * r, r * 0.36, r * 0.33, i % 2 ? '#2e8b3e' : '#38a14a');
    },
    potato: function (c, r) {
      c.fillStyle = '#c69c6d'; c.beginPath(); c.moveTo(-r * 0.9, 0);
      c.bezierCurveTo(-r * 0.9, -r * 0.7, r * 0.6, -r * 0.8, r * 0.9, -r * 0.1); c.bezierCurveTo(r * 1.0, r * 0.6, -r * 0.5, r * 0.8, -r * 0.9, 0); c.fill();
      c.fillStyle = 'rgba(110,70,30,.55)'; dots(c, POTATO_SPOTS, r, 0.06);
    },
    lettuce: function (c, r) {
      for (var i = 0; i < 9; i++) { var a = i * TAU / 9; blob(c, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.45, r * 0.42, r * 0.36, i % 2 ? '#6cc24a' : '#82d65c'); }
      blob(c, 0, 0, r * 0.45, r * 0.4, '#b6ec8a');
      c.strokeStyle = 'rgba(60,130,40,.6)'; c.lineWidth = Math.max(1, r * 0.05);
      for (i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(i * 1.6) * r * 0.35, Math.sin(i * 1.6) * r * 0.3); c.stroke(); }
    },
    celery: function (c, r) {
      for (var i = -1; i <= 1; i++) { c.fillStyle = i ? '#a8d672' : '#bfe48a'; roundRect(c, i * r * 0.28 - r * 0.14, -r * 0.45, r * 0.28, r * 1.4, r * 0.12); c.fill(); }
      for (var k = 0; k < 5; k++) leaf(c, (k - 2) * r * 0.18, -r * 0.45, r * 0.5, -Math.PI / 2 + (k - 2) * 0.4, '#3fae4a');
    },
    onion: function (c, r) {
      c.fillStyle = '#c779c9'; c.beginPath(); c.moveTo(0, -r * 0.85);
      c.bezierCurveTo(r * 0.2, -r * 0.4, r * 0.95, -r * 0.2, r * 0.75, r * 0.4); c.bezierCurveTo(r * 0.55, r * 0.9, -r * 0.55, r * 0.9, -r * 0.75, r * 0.4);
      c.bezierCurveTo(-r * 0.95, -r * 0.2, -r * 0.2, -r * 0.4, 0, -r * 0.85); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = Math.max(1, r * 0.05);
      c.beginPath(); c.moveTo(0, -r * 0.6); c.quadraticCurveTo(r * 0.5, 0, 0, r * 0.75); c.moveTo(0, -r * 0.6); c.quadraticCurveTo(-r * 0.5, 0, 0, r * 0.75); c.stroke();
      c.strokeStyle = '#e8d8b0'; c.beginPath(); c.moveTo(-r * 0.15, r * 0.78); c.lineTo(-r * 0.2, r * 0.98); c.moveTo(0, r * 0.8); c.lineTo(0, r * 1.0); c.moveTo(r * 0.15, r * 0.78); c.lineTo(r * 0.2, r * 0.98); c.stroke();
    },
    sweetpotato: function (c, r) {
      c.save(); c.rotate(-0.35);
      c.fillStyle = '#c4563a'; c.beginPath(); c.moveTo(-r * 1.0, 0); c.quadraticCurveTo(-r * 0.3, -r * 0.62, r * 0.4, -r * 0.45); c.quadraticCurveTo(r * 1.1, -r * 0.2, r * 1.0, 0);
      c.quadraticCurveTo(r * 0.8, r * 0.45, 0, r * 0.45); c.quadraticCurveTo(-r * 0.6, r * 0.4, -r * 1.0, 0); c.fill();
      c.fillStyle = 'rgba(90,30,20,.45)'; dots(c, SWEETPOTATO_SPOTS, r, 0.05);
      c.restore();
    },
    garlic: function (c, r) {
      c.fillStyle = '#f3ecdf'; c.beginPath(); c.moveTo(0, -r * 0.95);
      c.bezierCurveTo(r * 0.15, -r * 0.4, r * 0.95, -r * 0.3, r * 0.75, r * 0.4); c.bezierCurveTo(r * 0.55, r * 0.85, -r * 0.55, r * 0.85, -r * 0.75, r * 0.4);
      c.bezierCurveTo(-r * 0.95, -r * 0.3, -r * 0.15, -r * 0.4, 0, -r * 0.95); c.fill();
      c.strokeStyle = 'rgba(150,130,110,.6)'; c.lineWidth = Math.max(1, r * 0.05);
      c.beginPath(); c.moveTo(0, -r * 0.5); c.quadraticCurveTo(r * 0.35, 0, r * 0.15, r * 0.7); c.moveTo(0, -r * 0.5); c.quadraticCurveTo(-r * 0.35, 0, -r * 0.15, r * 0.7); c.stroke();
    },
    beetroot: function (c, r) {
      for (var k = 0; k < 3; k++) leaf(c, 0, -r * 0.5, r * 0.6, -Math.PI / 2 + (k - 1) * 0.5, k === 1 ? '#3fae4a' : '#2e8b3e');
      blob(c, 0, r * 0.05, r * 0.68, r * 0.62, '#9d1b4f');
      c.strokeStyle = '#9d1b4f'; c.lineWidth = Math.max(1.5, r * 0.08); c.beginPath(); c.moveTo(0, r * 0.6); c.quadraticCurveTo(r * 0.05, r * 0.85, r * 0.2, r * 1.0); c.stroke();
      shine(c, -r * 0.25, -r * 0.15, r * 0.8);
    },
    cauliflower: function (c, r) {
      for (var k = 0; k < 4; k++) leaf(c, (k < 2 ? -1 : 1) * r * 0.2, r * 0.35, r * 0.75, (k < 2 ? Math.PI * 0.85 : Math.PI * 0.15) + (k % 2) * 0.35 * (k < 2 ? 1 : -1), '#3fae4a');
      var pts = CAULI_PTS;
      for (var i = 0; i < pts.length; i++) blob(c, pts[i][0] * r, pts[i][1] * r, r * 0.3, r * 0.27, i % 2 ? '#f4ead2' : '#fff6e0');
    }
  };
  function drawSnack(c, id, x, y, r, rot) {
    var art = SNACK_ART[id];
    if (!art) return;
    c.save(); c.translate(x, y); if (rot) c.rotate(rot);
    art(c, r);
    c.restore();
  }

  /* ---------- the three signs of lesson 2 ---------- */
  var SIGNS = [
    { id: 'star', name: 'star', colour: 'sun' },
    { id: 'heart', name: 'heart', colour: 'pink' },
    { id: 'arrow', name: 'arrow', colour: 'cyan' }
  ];
  function drawSign(c, cls, x, y, r, col) {
    c.fillStyle = col;
    if (cls === 0) { starPath(c, x, y, r, 0.45, 5); c.fill(); }
    else if (cls === 1) { heartPath(c, x, y + r * 0.05, r); c.fill(); }
    else { arrowPath(c, x, y, r); c.fill(); }
  }
  /* The same signs as small SVG pictures for buttons (built with DOM calls, no HTML strings). */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgIcon(kind) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.setAttribute('class', 'rs-icon rs-icon-' + kind);
    var p = document.createElementNS(SVGNS, 'path');
    var d = {
      star: 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z',
      heart: 'M12 21s-7.5-4.6-9.3-9.4C1.5 8.2 3.7 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.5 0 5.7 3.7 4.5 7.1C19.5 16.4 12 21 12 21z',
      arrow: 'M2.5 9.5h11V4.8L21.5 12l-8 7.2v-4.7h-11z',
      fruit: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
      veg: 'M5 5h14v14H5z',
      play: 'M7 4.5v15l12.5-7.5z',
      lock: 'M7 10V7.5a5 5 0 0 1 10 0V10h1.5v11h-13V10zm2.5 0h5V7.5a2.5 2.5 0 0 0-5 0z',
      puddle: 'M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z',
      battery: 'M9 2.5h6v2h3v17H6v-17h3zm2 6v3H8v2h3v3h2v-3h3v-2h-3v-3z',
      wall: 'M3 5h18v4H3zm0 5h8v4H3zm10 0h8v4h-8zM3 15h18v4H3z',
      look: 'M12 5C6.5 5 2.5 12 2.5 12S6.5 19 12 19s9.5-7 9.5-7S17.5 5 12 5zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z',
      bulb: 'M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2zM9 18.5h6V20H9zm1 2.5h4v1h-4z',
      hand: 'M8 21c-2-1.5-4-5-4-8V8.5a1.5 1.5 0 0 1 3 0V12h1V4.5a1.5 1.5 0 0 1 3 0V11h1V3.5a1.5 1.5 0 0 1 3 0V11h1V5.5a1.5 1.5 0 0 1 3 0V15c0 3-2 5-4 6z'
    }[kind] || '';
    p.setAttribute('d', d); p.setAttribute('fill', 'currentColor');
    s.appendChild(p);
    return s;
  }

  /* ---------- handwriting (lesson 4) ----------
     A short sentence written with a slant (leaning left or right) and a wobble (how bumpy the letters are).
     seed keeps each page's wobble the same every time it is drawn. */
  function drawWriting(c, text, x, y, w, h, slant, wobble, seed, ink) {
    var rnd = seeded(seed);
    var size = Math.min(h * 0.46, w / (text.length * 0.5));
    c.save();
    /* lined paper */
    c.strokeStyle = 'rgba(120,150,220,.35)'; c.lineWidth = 1;
    for (var ly = y + h * 0.3; ly < y + h; ly += h * 0.34) { c.beginPath(); c.moveTo(x + 4, Math.round(ly) + 0.5); c.lineTo(x + w - 4, Math.round(ly) + 0.5); c.stroke(); }
    c.fillStyle = ink; c.font = '500 ' + Math.round(size) + 'px ' + FONT.hand; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    var total = c.measureText(text).width;
    var scaleX = total > w * 0.86 ? (w * 0.86) / total : 1;
    var cx = x + (w - total * scaleX) / 2, base = y + h * 0.64;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i), cw = c.measureText(ch).width * scaleX;
      var dy = (Math.sin(i * 1.9 + seed) * 0.6 + (rnd() - 0.5)) * wobble * size * 0.55;
      var rot = (rnd() - 0.5) * wobble * 0.9;
      var grow = 1 + (rnd() - 0.5) * wobble * 0.6;
      c.save();
      c.translate(cx + cw / 2, base + dy);
      c.transform(1, 0, -slant * 0.7, 1, 0, 0);    // shear: the tops of letters lean with the slant
      c.rotate(rot); c.scale(scaleX * grow, grow);
      c.fillText(ch, -cw / (2 * scaleX), 0);
      c.restore();
      cx += cw;
    }
    c.restore();
  }

  /* =====================================================================================================
     STYLES (every selector starts with .game-robot-school)
     ===================================================================================================== */
  var P = '.game-robot-school ';
  var CSS = [
    '.game-robot-school { --rs-cyan: var(--peacock, #5ef2ff); --rs-violet: var(--cobalt, #a78bfa); --rs-mint: var(--leaf, #5effa1); --rs-pink: var(--rose, #ff7a90); --rs-sun: #ffe36e;',
    '  --rs-glass: rgba(14, 20, 38, .74); --rs-glass-2: rgba(21, 29, 54, .9); --rs-edge: rgba(234, 242, 255, .13); color: var(--ink); font-family: var(--font-body); line-height: 1.45; }',
    P + '*, ' + P + '*::before { box-sizing: border-box; }',
    P + 'button { font-family: var(--font-head); }',
    /* no hover lift: a pointer resting on a button's edge would make it jitter up and down */
    P + '.btn:hover { transform: none; }',
    P + '.rs-cab { position: relative; isolation: isolate; overflow: hidden; border-radius: 28px; padding: clamp(10px, 2.2vw, 22px);',
    '  background: radial-gradient(110% 70% at 0% 0%, rgba(94, 242, 255, .13), transparent 55%), radial-gradient(90% 70% at 100% 0%, rgba(167, 139, 250, .18), transparent 60%), radial-gradient(90% 60% at 50% 115%, rgba(94, 255, 161, .11), transparent 60%), var(--ground-2, var(--bg-2));',
    '  border: 1px solid rgba(94, 242, 255, .3); box-shadow: 0 0 0 1px rgba(167, 139, 250, .16), 0 28px 64px rgba(0, 0, 0, .55), inset 0 1px 0 rgba(255, 255, 255, .06); }',
    P + '.rs-aurora { position: absolute; left: -20%; right: -20%; top: -30%; height: 60%; z-index: -1; pointer-events: none; opacity: .9;',
    '  background: linear-gradient(100deg, transparent 12%, rgba(94, 242, 255, .13) 30%, rgba(94, 255, 161, .1) 45%, rgba(167, 139, 250, .14) 62%, transparent 82%); border-radius: 50%; animation: rs-aurora 16s ease-in-out infinite alternate; }',
    '@keyframes rs-aurora { from { transform: translateX(-7%) rotate(-3deg); } to { transform: translateX(7%) rotate(3deg); } }',
    P + '.rs-rm .rs-aurora { animation: none; }',
    /* top bar */
    P + '.rs-bar { display: flex; flex-wrap: wrap; align-items: center; gap: .45rem .8rem; margin-bottom: clamp(.6rem, 1.6vw, 1rem); }',
    P + '.rs-logo { display: inline-flex; align-items: center; gap: .5rem; font-family: var(--font-head); font-weight: 800; font-size: 1.12rem; letter-spacing: .01em; white-space: nowrap; }',
    P + '.rs-logo canvas { width: 34px; height: 34px; flex: none; }',
    P + '.rs-chip { font-family: var(--font-mono); font-weight: 700; font-size: .7rem; letter-spacing: .14em; text-transform: uppercase; padding: .22rem .55rem; border-radius: 999px; border: 1px solid rgba(94, 242, 255, .45); color: var(--rs-cyan); white-space: nowrap; }',
    P + '.rs-where { flex: 1 1 10rem; min-width: 0; color: var(--ink-muted); font-weight: 600; font-size: .98rem; }',
    P + '.rs-bar .btn { min-height: 44px; }',
    /* panels, speech and buttons */
    P + '.rs-panel { min-width: 0; background: var(--rs-glass); border: 1px solid var(--rs-edge); border-radius: 20px; padding: clamp(10px, 1.6vw, 16px); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .05); }',
    P + '.rs-panel > * + * { margin-top: .7rem; }',
    P + '.rs-h { font-family: var(--font-head); font-weight: 800; font-size: clamp(1.15rem, 1rem + .6vw, 1.45rem); margin: 0; line-height: 1.15; }',
    P + '.rs-h:focus { outline: none; }',
    P + '.rs-sub { margin: 0; color: var(--ink-muted); font-size: .95rem; }',
    P + '.rs-say { position: relative; margin: 0; min-height: 3.1em; padding: .65rem .95rem; border-radius: 18px; border: 1.5px solid rgba(94, 242, 255, .5);',
    '  background: linear-gradient(180deg, rgba(94, 242, 255, .13), rgba(167, 139, 250, .1)); font-family: var(--font-head); font-weight: 600; font-size: clamp(1rem, .96rem + .28vw, 1.14rem); line-height: 1.38; color: var(--ink); }',
    P + '.rs-say::before { content: ""; position: absolute; width: 14px; height: 14px; background: #17223f; border: 1.5px solid rgba(94, 242, 255, .5); border-width: 0 0 1.5px 1.5px; }',
    P + '.rs-say--left::before { left: -8.5px; top: 1.1rem; transform: rotate(45deg); }',
    P + '.rs-say--down::before { left: 50%; bottom: -8.5px; margin-left: -7px; transform: rotate(-45deg); }',
    P + '.rs-say strong { color: var(--rs-cyan); }',
    P + '.rs-coach { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .3rem .9rem; align-items: center; margin-bottom: .8rem; }',
    P + '.rs-coach canvas { width: 120px; height: 130px; display: block; }',
    '@media (max-width: 520px) { ' + P + '.rs-coach canvas { width: 76px; height: 84px; } ' + P + '.rs-coach { gap: .3rem .55rem; } }',
    P + '.rs-row { display: flex; flex-wrap: wrap; gap: .55rem; align-items: center; }',
    P + '.rs-row--c { justify-content: center; }',
    P + '.rs-big { min-height: 52px; font-size: 1.08rem; padding: .55rem 1.3rem; }',
    P + '.btn .rs-icon { width: 1.15em; height: 1.15em; flex: none; }',
    P + '.rs-fruit { border-color: var(--rs-pink); background: rgba(255, 122, 144, .14); }',
    P + '.rs-veg { border-color: var(--rs-mint); background: rgba(94, 255, 161, .12); }',
    P + '.rs-fruit .rs-icon { color: var(--rs-pink); } ' + P + '.rs-veg .rs-icon { color: var(--rs-mint); }',
    P + '.rs-fruit:hover { border-color: var(--rs-pink); } ' + P + '.rs-veg:hover { border-color: var(--rs-mint); }',
    P + '.rs-toggles { display: flex; flex-wrap: wrap; gap: .4rem; }',
    P + '.rs-toggles button { min-height: 44px; min-width: 44px; display: inline-flex; align-items: center; justify-content: center; gap: .35rem; padding: .35rem .8rem; border-radius: 999px; border: 2px solid var(--rs-edge); background: var(--surface-2); color: var(--ink-muted); font-weight: 700; font-size: .95rem; }',
    P + '.rs-toggles button[aria-pressed="true"] { background: var(--rs-cyan); border-color: var(--rs-cyan); color: var(--on-era, #021317); }',
    P + '.rs-toggles button:disabled { opacity: .45; cursor: not-allowed; }',
    P + '.rs-toggles .rs-icon { width: 1.1em; height: 1.1em; }',
    P + '.rs-stars { font-size: 1.15rem; letter-spacing: .08em; color: var(--rs-sun); white-space: nowrap; }',
    P + '.rs-stars .off { color: var(--ink-faint); }',
    P + '.rs-how { border-top: 1px solid var(--rs-edge); padding-top: .4rem; margin-top: .9rem; }',
    P + '.rs-how summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; font-family: var(--font-head); font-weight: 700; color: var(--rs-cyan); }',
    P + '.rs-how p { margin: .5rem 0 0; max-width: 70ch; color: var(--ink); }',
    P + '.rs-note { font-size: .9rem; color: var(--ink-muted); margin: 0; }',
    P + '.rs-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }',
    P + 'canvas { display: block; max-width: 100%; touch-action: manipulation; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }',
    P + 'canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; border-radius: 10px; }',
    /* lobby */
    P + '.rs-hello { display: grid; grid-template-columns: minmax(0, 1fr); gap: .8rem 1.2rem; align-items: center; }',
    '@media (min-width: 700px) { ' + P + '.rs-hello { grid-template-columns: 200px minmax(0, 1fr); } }',
    P + '.rs-hello canvas.rs-hero-pip { width: 200px; height: 220px; margin-inline: auto; }',
    '@media (max-width: 699px) { ' + P + '.rs-hello canvas.rs-hero-pip { width: 150px; height: 165px; } }',
    P + '.rs-title { font-family: var(--font-head); font-weight: 800; font-size: clamp(1.9rem, 1.3rem + 2.6vw, 3rem); line-height: 1; margin: .1rem 0 .55rem; letter-spacing: -.02em; }',
    P + '.rs-title span { display: block; font-size: .5em; letter-spacing: 0; color: var(--rs-cyan); margin-top: .35rem; }',
    P + '.rs-privacy { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .6rem; align-items: start; margin: .8rem 0 0; padding: .7rem .9rem; border-radius: 16px; background: rgba(94, 255, 161, .08); border: 1px solid rgba(94, 255, 161, .35); font-size: .95rem; }',
    P + '.rs-privacy svg { width: 26px; height: 26px; color: var(--rs-mint); margin-top: .1rem; }',
    P + '.rs-privacy strong { color: var(--rs-mint); }',
    P + '.rs-name { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-top: .8rem; font-weight: 700; }',
    P + '.rs-name input { min-height: 44px; width: 11rem; max-width: 100%; padding: .3rem .8rem; border-radius: 999px; border: 2px solid var(--rs-edge); background: var(--surface-2); color: var(--ink); font: inherit; font-weight: 700; }',
    P + '.rs-name input:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }',
    P + '.rs-cards { list-style: none; margin: 1rem 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: .8rem; }',
    P + '.rs-cards li { margin: 0; display: flex; }',
    P + '.rs-card { flex: 1; display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: .15rem .85rem; align-content: start; text-align: left; padding: .9rem 1rem 1rem; border-radius: 18px; border: 1.5px solid var(--rs-edge); background: var(--rs-glass-2); color: var(--ink); cursor: pointer; transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease; }',
    P + '.rs-card:hover { transform: translateY(-3px); border-color: var(--rs-cyan); box-shadow: 0 0 0 1px var(--rs-cyan), 0 14px 30px rgba(0, 0, 0, .4); }',
    P + '.rs-card canvas { grid-row: 1 / span 4; width: 64px; height: 64px; }',
    P + '.rs-card-k { font-family: var(--font-mono); font-size: .72rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--rs-cyan); }',
    P + '.rs-card-t { font-family: var(--font-head); font-weight: 800; font-size: 1.2rem; line-height: 1.15; }',
    P + '.rs-card-d { font-family: var(--font-body); font-weight: 500; color: var(--ink-muted); font-size: .95rem; line-height: 1.35; }',
    P + '.rs-card-s { display: flex; flex-wrap: wrap; gap: .3rem .7rem; align-items: center; font-family: var(--font-body); font-size: .85rem; color: var(--ink-muted); margin-top: .2rem; }',
    P + '.rs-idea-chip { display: inline-flex; align-items: center; gap: .3rem; padding: .1rem .5rem; border-radius: 999px; background: rgba(255, 227, 110, .14); color: var(--rs-sun); font-weight: 700; }',
    P + '.rs-idea-chip .rs-icon { width: 1em; height: 1em; }',
    P + '.rs-ideas { margin-top: 1rem; }',
    P + '.rs-ideas ol { margin: .5rem 0 0; padding-left: 1.4rem; display: grid; gap: .45rem; }',
    P + '.rs-ideas li { margin: 0; }',
    P + '.rs-ideas li.off { color: var(--ink-faint); }',
    P + '.rs-cert { margin-top: 1rem; padding: 1rem 1.2rem; border-radius: 18px; text-align: center; border: 2px solid var(--rs-sun); background: radial-gradient(120% 120% at 50% 0%, rgba(255, 227, 110, .18), transparent 60%), var(--rs-glass-2); }',
    P + '.rs-cert .rs-h { color: var(--rs-sun); }',
    P + '.rs-foot { display: flex; flex-wrap: wrap; gap: .6rem; justify-content: space-between; align-items: center; margin-top: 1rem; }',
    /* lesson layouts */
    P + '.rs-two { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; align-items: start; }',
    '@media (min-width: 900px) { ' + P + '.rs-two { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); } ' + P + '.rs-two--even { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }',
    P + '.rs-scene { width: 100%; height: 340px; border-radius: 16px; }',
    '@media (max-width: 520px) { ' + P + '.rs-scene { height: 270px; } }',
    '@media (min-width: 900px) { ' + P + '.rs-l1 .rs-say--down::before { left: 30%; } }',
    P + '.rs-chartwrap { position: relative; }',
    P + '.rs-chart { width: 100%; border-radius: 12px; }',
    P + '.rs-legend { display: flex; flex-wrap: wrap; gap: .3rem .9rem; font-size: .88rem; color: var(--ink-muted); }',
    P + '.rs-legend span { display: inline-flex; align-items: center; gap: .3rem; }',
    P + '.rs-legend .rs-icon { width: 1em; height: 1em; }',
    P + '.rs-hist { display: flex; gap: .45rem; align-items: flex-end; min-height: 92px; padding: .4rem .2rem 0; overflow-x: auto; }',
    P + '.rs-hist-col { flex: 0 0 auto; width: 46px; display: grid; justify-items: center; gap: .2rem; font-size: .8rem; color: var(--ink-muted); }',
    P + '.rs-hist-bar { width: 26px; border-radius: 8px 8px 3px 3px; background: linear-gradient(180deg, var(--rs-mint), var(--rs-cyan)); min-height: 4px; }',
    P + '.rs-hist-col strong { color: var(--ink); font-size: .9rem; }',
    P + '.rs-empty { color: var(--ink-faint); font-size: .9rem; align-self: center; }',
    P + '.rs-ask { display: grid; gap: .6rem; }',
    P + '.rs-ask .rs-row .btn { flex: 1 1 6.5rem; max-width: 14rem; padding-inline: .8rem; }',
    /* lesson 2 */
    P + '.rs-pad { width: 100%; max-width: 420px; margin-inline: auto; touch-action: none; border-radius: 14px; cursor: crosshair; }',
    P + '.rs-secret { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .7rem; align-items: center; padding: .7rem .9rem; border-radius: 16px; border: 2px dashed rgba(255, 227, 110, .6); background: rgba(255, 227, 110, .08); }',
    P + '.rs-secret svg { width: 46px; height: 46px; }',
    P + '.rs-secret strong { font-family: var(--font-head); font-size: 1.25rem; }',
    P + '.rs-icon-star { color: var(--rs-sun); } ' + P + '.rs-icon-heart { color: var(--rs-pink); } ' + P + '.rs-icon-arrow { color: var(--rs-cyan); }',
    P + '.rs-bars { display: grid; gap: .45rem; }',
    P + '.rs-barrow { display: grid; grid-template-columns: 5.6rem minmax(0, 1fr) 3rem; gap: .5rem; align-items: center; font-weight: 700; }',
    P + '.rs-barrow > span:first-child { display: inline-flex; align-items: center; gap: .35rem; }',
    P + '.rs-barrow .rs-icon { width: 1.2em; height: 1.2em; }',
    P + '.rs-track { height: 16px; border-radius: 999px; background: rgba(234, 242, 255, .08); overflow: hidden; }',
    P + '.rs-fill { height: 100%; width: 0; border-radius: 999px; }',
    P + '.rs-pct { text-align: right; font-variant-numeric: tabular-nums; }',
    P + '.rs-mems { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem; }',
    P + '.rs-mem { display: grid; justify-items: center; gap: .2rem; text-align: center; font-size: .82rem; color: var(--ink-muted); }',
    P + '.rs-mem canvas { width: 100%; max-width: 84px; aspect-ratio: 1; height: auto; border-radius: 10px; }',
    P + '.rs-mem strong { color: var(--ink); font-size: .9rem; }',
    P + '.rs-dots { display: flex; gap: .35rem; }',
    P + '.rs-dots span { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--rs-edge); display: grid; place-items: center; font-size: .65rem; font-weight: 900; }',
    P + '.rs-dots .now { border-color: var(--rs-cyan); }',
    P + '.rs-dots .yes { background: var(--rs-mint); border-color: var(--rs-mint); color: #04220f; }',
    P + '.rs-dots .no { background: var(--rs-pink); border-color: var(--rs-pink); color: #2a0610; }',
    /* lesson 3 */
    P + '.rs-maze { width: 100%; max-width: 560px; margin-inline: auto; border-radius: 14px; }',
    P + '.rs-pad.is-locked { touch-action: auto; cursor: default; }',
    P + '.rs-steps { width: 100%; height: 130px; border-radius: 12px; }',
    P + '.rs-slider { display: grid; gap: .25rem; font-weight: 700; }',
    P + '.rs-slider input { width: 100%; min-height: 40px; accent-color: var(--rs-cyan); }',
    P + '.rs-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .3rem .8rem; font-size: .92rem; color: var(--ink-muted); }',
    P + '.rs-stats strong { color: var(--ink); font-variant-numeric: tabular-nums; }',
    P + '.rs-label { font-family: var(--font-mono); font-size: .74rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-muted); margin: 0; }',
    P + '.rs-pulse { box-shadow: 0 0 0 3px var(--rs-sun); }',
    /* lesson 4 */
    P + '.rs-pages { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 128px), 1fr)); gap: .5rem; }',
    '@media (max-width: 420px) { ' + P + '.rs-page { padding: .4rem .4rem .45rem; font-size: .78rem; } ' + P + '.rs-page-top { font-size: .84rem; } ' + P + '.rs-hand { font-size: .7rem; padding: .05rem .3rem; } }',
    P + '.rs-pages li { margin: 0; }',
    P + '.rs-page { position: relative; height: 100%; display: grid; gap: .25rem; padding: .45rem .5rem .5rem; border-radius: 14px; background: var(--rs-glass-2); border: 2px solid var(--rs-edge); font-size: .82rem; color: var(--ink-muted); text-align: left; width: 100%; }',
    P + 'button.rs-page { cursor: pointer; font-family: var(--font-body); }',
    P + 'button.rs-page[aria-pressed="true"] { border-color: var(--rs-cyan); box-shadow: 0 0 0 2px var(--rs-cyan); }',
    P + '.rs-page canvas { width: 100%; height: 54px; border-radius: 8px; }',
    P + '.rs-page-top { display: flex; justify-content: space-between; align-items: center; gap: .3rem; font-weight: 700; color: var(--ink); font-size: .9rem; }',
    P + '.rs-hand { display: inline-flex; align-items: center; gap: .2rem; font-size: .75rem; font-weight: 800; padding: .05rem .4rem; border-radius: 999px; border: 1px solid var(--rs-edge); color: var(--ink-muted); }',
    P + '.rs-hand.L { border-color: var(--rs-violet); color: var(--rs-violet); }',
    P + '.rs-hand .rs-icon { width: 1em; height: 1em; }',
    P + '.rs-hand.L .rs-icon { transform: scaleX(-1); }',
    P + '.rs-verdict { font-weight: 800; color: var(--ink); min-height: 1.3em; }',
    P + '.rs-verdict.ok { color: var(--rs-mint); } ' + P + '.rs-verdict.bad { color: var(--rs-pink); }',
    P + '.rs-page.bad { border-color: var(--rs-pink); } ' + P + '.rs-page.ok { border-color: rgba(94, 255, 161, .55); }',
    P + '.rs-pick { position: absolute; right: .4rem; bottom: .4rem; width: 22px; height: 22px; border-radius: 6px; border: 2px solid var(--rs-edge); display: grid; place-items: center; font-weight: 900; color: var(--on-era, #021317); }',
    P + 'button.rs-page[aria-pressed="true"] .rs-pick { background: var(--rs-cyan); border-color: var(--rs-cyan); }',
    P + '.rs-meter { display: grid; gap: .5rem; }',
    P + '.rs-meter-row { display: grid; grid-template-columns: 8.2rem minmax(0, 1fr) 3.2rem; gap: .5rem; align-items: center; font-weight: 700; font-size: .92rem; }',
    '@media (max-width: 420px) { ' + P + '.rs-meter-row { grid-template-columns: 6.6rem minmax(0, 1fr) 2.8rem; font-size: .85rem; } ' + P + '.rs-barrow { grid-template-columns: 4.8rem minmax(0, 1fr) 2.6rem; } }',
    P + '.rs-meter-row .rs-fill { background: var(--rs-mint); }',
    P + '.rs-meter-row.L .rs-fill { background: var(--rs-violet); }',
    /* Pip's question */
    P + '.rs-quiz { border: 2px solid var(--rs-sun); background: radial-gradient(120% 100% at 0% 0%, rgba(255, 227, 110, .12), transparent 60%), var(--rs-glass-2); }',
    P + '.rs-quiz .rs-opts { display: grid; gap: .5rem; }',
    P + '.rs-quiz .rs-opts .btn { justify-content: flex-start; text-align: left; white-space: normal; min-height: 48px; }',
    P + '.rs-quiz .rs-opts .btn.wrong { border-color: var(--rs-pink); opacity: .7; }',
    P + '.rs-quiz .rs-opts .btn.right { border-color: var(--rs-mint); background: rgba(94, 255, 161, .16); }',
    P + '.rs-quiz .rs-opts .btn.right:disabled { opacity: 1; }',
    P + '.rs-bigidea { padding: .7rem .9rem; border-radius: 14px; background: rgba(255, 227, 110, .12); border-left: 4px solid var(--rs-sun); font-weight: 600; }',
    '@media (prefers-reduced-motion: reduce) { ' + P + '.rs-card, ' + P + '.rs-card:hover { transition: none; transform: none; } }'
  ].join('\n');

  /* =====================================================================================================
     THE GAME
     ===================================================================================================== */
  var LESSONS = [
    {
      title: 'Snack Sorter', kicker: 'Lesson 1 · Learning from examples',
      desc: 'Teach Pip fruit from veg, and watch its line move as it learns.',
      idea: 'Robots learn patterns from examples. {N} does not know what a strawberry is. It only knows the numbers you showed it, and more examples, especially tricky ones, make it better.',
      q: 'How did I get better at sorting snacks?',
      options: [
        ['You showed me more examples, especially the tricky ones I got wrong.', ''],
        ['I tasted the snacks.', 'I cannot taste anything! I only get two numbers for each snack: sweet and juicy.'],
        ['I looked up the answers on the internet.', 'No internet here. Everything I know came from the examples you gave me.']
      ]
    },
    {
      title: 'Doodle Detective', kicker: 'Lesson 2 · Learning to see',
      desc: 'Draw stars, hearts and arrows until Pip can tell them apart.',
      idea: 'To a robot, a picture is just numbers. {N} learns what a sign looks like by averaging the examples it is shown, and it can only recognise things it has been taught.',
      q: 'When you draw for me, what do I really see?',
      options: [
        ['256 little squares, each one on or off.', ''],
        ['A picture, just like the one you see.', 'I wish! I only get the 256 squares as numbers. I never see a picture the way you do.'],
        ['Your hand moving.', 'I cannot see you at all. I only get the squares you coloured in.']
      ]
    },
    {
      title: 'Maze Runner', kicker: 'Lesson 3 · Learning by trying',
      desc: 'Pip finds its way by trial and error. You choose the rewards.',
      idea: 'A robot can learn by trying again and again and remembering what led to rewards. It learns to do whatever is rewarded, so rewards must be chosen carefully.',
      q: 'How did I learn the way through the maze?',
      options: [
        ['By trying again and again, and remembering which moves led to rewards.', ''],
        ['Somebody gave me a map.', 'Nobody gave me a map! I had to bump around and learn from what happened.'],
        ['I was just lucky.', 'Luck helped me find the charger the first time, but remembering is how I got faster.']
      ]
    },
    {
      title: 'Fair Robot', kicker: 'Lesson 4 · Learning to be fair',
      desc: 'Pip has been unfair to some kids. Find out why, and fix it.',
      idea: 'Unfair examples make an unfair robot. {N} was not being mean. It copied a pattern from examples that left some people out, and better examples, from everyone, fixed it.',
      q: 'Why was I unfair to the left-handed writers?',
      options: [
        ['I had only learned from right-handed writing.', ''],
        ['Robots do not like left-handed people.', 'Robots do not like or dislike anyone. I only copy patterns from my examples.'],
        ['My camera was broken.', 'My camera was fine. The problem was the examples I learned from.']
      ]
    }
  ];
  var NAME_OK = /[^A-Za-z0-9 '\-À-ɏ]/g;

  GamesInTime.register({
    id: 'robot-school',
    frame: 'none',
    lab: LAB,
    mount: function (root, api) {
      var h = api.h;
      var RM = !!api.reducedMotion;
      var destroyed = false;
      function rnd() { return api.random(); }
      var PIP_FULL = { still: RM }, PIP_HEAD = { head: true, still: RM }, PIP_ICON = { head: true, still: true };
      pal(root);
      root.appendChild(h('style', null, CSS));
      if (RM) root.classList.add('rs-rm');

      /* ---------- saved progress (this device only) ---------- */
      function blankSave() { return { v: 1, name: 'Pip', stars: [0, 0, 0, 0], ideas: [0, 0, 0, 0], grad: 0, l1: { ex: [], tests: [] }, l2: { ex: [], best: -1 }, l3: { done: [0, 0, 0] } }; }
      function num(v, a, b, fb) { v = Number(v); return isFinite(v) ? clamp(v, a, b) : fb; }
      function loadSave() {
        var s = api.store.get('save', null), out = blankSave(), i;
        if (!s || typeof s !== 'object' || s.v !== 1) return out;
        if (typeof s.name === 'string') out.name = cleanName(s.name);
        for (i = 0; i < 4; i++) { out.stars[i] = Math.round(num(s.stars && s.stars[i], 0, 3, 0)); out.ideas[i] = s.ideas && s.ideas[i] ? 1 : 0; }
        out.grad = s.grad ? 1 : 0;
        if (s.l1 && Array.isArray(s.l1.ex)) s.l1.ex.slice(-60).forEach(function (e) {
          if (Array.isArray(e) && e.length === 4) out.l1.ex.push([Math.round(num(e[0], 0, SNACKS.length - 1, 0)), num(e[1], 0, 10, 5), num(e[2], 0, 10, 5), e[3] ? 1 : 0]);
        });
        if (s.l1 && Array.isArray(s.l1.tests)) s.l1.tests.slice(-12).forEach(function (t) { out.l1.tests.push(Math.round(num(t, 0, 10, 0))); });
        if (s.l2 && Array.isArray(s.l2.ex)) s.l2.ex.slice(-60).forEach(function (e) {
          if (Array.isArray(e) && e.length === 2 && typeof e[1] === 'string' && /^[0-9a-f]{64}$/.test(e[1])) out.l2.ex.push([Math.round(num(e[0], 0, 2, 0)), e[1]]);
        });
        if (s.l2) out.l2.best = Math.round(num(s.l2.best, -1, 6, -1));
        if (s.l3 && Array.isArray(s.l3.done)) for (i = 0; i < 3; i++) out.l3.done[i] = s.l3.done[i] ? 1 : 0;
        return out;
      }
      function cleanName(s) { s = String(s || '').replace(NAME_OK, '').replace(/\s+/g, ' ').trim().slice(0, 12); return s || 'Pip'; }
      var save = loadSave();
      function persist() { api.store.set('save', save); }
      function N() { return save.name; }
      function idea(i) { return LESSONS[i].idea.replace(/\{N\}/g, N()); }
      /* Award stars for a lesson (only ever goes up). Returns true when it is a new best. */
      function award(li, stars) {
        if (stars <= save.stars[li]) return false;
        save.stars[li] = stars; persist(); updateBar();
        return true;
      }
      function starText(n) { var s = ''; for (var i = 0; i < 3; i++) s += i < n ? '★' : '☆'; return s; }
      function starsEl(n) {
        var el = h('span', { class: 'rs-stars', role: 'img', 'aria-label': n + ' of 3 stars' });
        for (var i = 0; i < 3; i++) el.appendChild(h('span', { class: i < n ? 'on' : 'off', 'aria-hidden': 'true' }, i < n ? '★' : '☆'));
        return el;
      }

      /* ---------- the clock: game time only moves while the game is visible on screen ----------
         Everything that happens "later" is scheduled on game time with after(), so hiding the tab or scrolling
         away pauses every animation and every lesson, and nothing runs after destroy. */
      var raf = 0, lastNow = 0, T = 0, onScreen = true, timers = [];
      function after(ms, fn) { var t = { at: T + ms, fn: fn, dead: false }; timers.push(t); return t; }
      function cancel(t) { if (t) t.dead = true; }
      function clearTimers() { for (var i = 0; i < timers.length; i++) timers[i].dead = true; timers = []; }
      function running() { return !destroyed && !document.hidden && onScreen; }
      function kick() { if (!raf && running()) raf = requestAnimationFrame(tick); }
      function tick(now) {
        raf = 0;
        if (!running()) { lastNow = 0; return; }
        var dt = lastNow ? Math.min(50, Math.max(0, now - lastNow)) : 16;
        lastNow = now; T += dt;
        if (timers.length) {
          var due = null, i;
          for (i = 0; i < timers.length; i++) if (timers[i].at <= T || timers[i].dead) { due = due || []; due.push(timers[i]); }
          if (due) {
            timers = timers.filter(function (t) { return due.indexOf(t) < 0; });
            for (i = 0; i < due.length; i++) if (!due[i].dead) due[i].fn();
          }
        }
        if (view && view.frame) view.frame(dt, T);
        if (logo) logo.draw(T);
        kick();
      }
      function dur(ms) { return RM ? Math.min(ms, 160) : ms; }

      /* ---------- sound: robot chirps made from short notes ---------- */
      var CHIRPS = {
        hello: [[660, 0.07], [880, 0.07], [1175, 0.12]], happy: [[784, 0.06], [1047, 0.1]], sad: [[523, 0.1], [392, 0.18]],
        think: [[620, 0.04], [720, 0.04], [660, 0.05]], aha: [[523, 0.07], [659, 0.07], [784, 0.07], [1047, 0.18]],
        scan: [[1400, 0.03], [1700, 0.03], [2000, 0.03]], oops: [[330, 0.08], [247, 0.14]], step: [[1200, 0.02]]
      };
      function chirp(kind) {
        var seq = CHIRPS[kind];
        if (!seq || typeof api.tone !== 'function') return;
        seq.forEach(function (n, i) { if (i === 0) note(n); else after(i * 70, function () { note(n); }); });
      }
      function note(n) { try { api.tone(n[0], n[1], 'sine', 0.06); } catch (e) { /* sound is optional */ } }
      function sfx(name) { try { api.sound(name); } catch (e) { /* sound is optional */ } }

      /* ---------- canvases ---------- */
      function dprNow() { return Math.min(2, window.devicePixelRatio || 1); }
      /* Size a canvas to w by h CSS pixels, sharp on high-density screens. Returns its 2D context. */
      function fit(canvas, w, hh) {
        var d = dprNow(), bw = Math.max(1, Math.round(w * d)), bh = Math.max(1, Math.round(hh * d));
        if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
        canvas.style.height = hh + 'px';
        var c = canvas.getContext('2d');
        c.setTransform(d, 0, 0, d, 0, 0);
        return c;
      }

      /* ---------- Pip's feelings ----------
         The actor holds how Pip looks right now. feel(mood, ms) shows a mood for a while (0: until changed);
         pose(arms, ms) the same for the arms; aha() is the light-bulb moment when Pip learns something. */
      function PipActor(base) {
        this.base = base || 'neutral'; this.mood = this.base; this.moodLeft = 0; this.arms = 'down'; this.armsLeft = 0;
        this.look = [0, 0]; this.bulb = 0; this.sparkle = 0; this.hearts = 0; this.blink = 0; this.blinkIn = 1200 + rnd() * 2400;
        this.chest = 'dot'; this.tilt = 0; this.dx = 0;
      }
      PipActor.prototype.feel = function (mood, ms) { this.mood = mood; this.moodLeft = ms || 0; if (!ms) this.base = mood; };
      PipActor.prototype.flash = function (mood, ms) { this.mood = mood; this.moodLeft = ms || 1400; };
      PipActor.prototype.pose = function (arms, ms) { this.arms = arms; this.armsLeft = ms || 0; };
      PipActor.prototype.aha = function () { this.bulb = 1; this.sparkle = 1; this.flash('aha', 1800); this.pose('cheer', 1300); chirp('aha'); };
      PipActor.prototype.update = function (dt) {
        if (this.moodLeft > 0) { this.moodLeft -= dt; if (this.moodLeft <= 0) { this.moodLeft = 0; this.mood = this.base; } }
        if (this.armsLeft > 0) { this.armsLeft -= dt; if (this.armsLeft <= 0) { this.armsLeft = 0; this.arms = 'down'; } }
        if (this.bulb > 0) this.bulb = Math.max(0, this.bulb - dt / 1700);
        if (this.sparkle > 0) this.sparkle = Math.max(0, this.sparkle - dt / 1900);
        if (this.hearts > 0) this.hearts = Math.max(0, this.hearts - dt / 2400);
        this.blinkIn -= dt;
        if (this.blinkIn <= 0) { this.blink = 1; this.blinkIn = 2200 + rnd() * 3200; }
        else if (this.blink > 0) this.blink = Math.max(0, this.blink - dt / 140);
      };
      /* Where to draw a whole Pip so it fits a w by h box: head width s, head centre x, y. */
      function pipFit(w, hh, pad) {
        pad = pad || 0;
        var s = Math.min((hh - pad * 2) / 2.1, (w - pad * 2) / 1.55);
        return { s: s, x: w / 2, y: (hh - 2.07 * s) / 2 + 0.67 * s };
      }
      /* A small canvas with Pip in it (the coach beside the speech bubble, and the lobby). */
      function PipBox(cls, label, cssW, cssH) {
        var self = this;
        this.actor = new PipActor('neutral');
        this.canvas = h('canvas', { class: cls, role: 'img', 'aria-label': label });
        this.w = cssW; this.h = cssH; this.c = null;
        this.resize = function () {
          var w = self.canvas.clientWidth || cssW, hh = Math.round(w * cssH / cssW);
          self.w = w; self.h = hh; self.c = fit(self.canvas, w, hh);
        };
        this.draw = function (dt, now) {
          if (!self.c) self.resize();
          self.actor.update(dt);
          var f = pipFit(self.w, self.h, 2);
          self.c.clearRect(0, 0, self.w, self.h);
          drawPip(self.c, f.x + self.actor.dx * f.s, f.y, f.s, self.actor, now, PIP_FULL);
        };
      }

      /* ---------- the cabinet, its top bar and the view inside ---------- */
      var logoCv = h('canvas', { width: 68, height: 68, 'aria-hidden': 'true' });
      var logo = {
        actor: new PipActor('happy'),
        draw: function (now) {
          var c = logoCv.getContext('2d'), d = logoCv.width / 34;
          c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, 34, 34);
          logo.actor.update(16);
          drawPip(c, 17, 20, 26, logo.actor, now, PIP_ICON);
        }
      };
      var whereEl = h('span', { class: 'rs-where' });
      var barStars = h('span');
      var homeBtn = h('button', { class: 'btn', type: 'button', onclick: function () { go(lobby, true); } }, 'All lessons');
      var bar = h('div', { class: 'rs-bar' },
        h('span', { class: 'rs-logo' }, logoCv, h('span', null, 'Robot School')), h('span', { class: 'rs-chip' }, 'Year 2035'),
        whereEl, barStars, homeBtn);
      var host = h('div', { class: 'rs-view' });
      var cab = h('div', { class: 'rs-cab' }, h('div', { class: 'rs-aurora', 'aria-hidden': 'true' }), bar, host);
      root.appendChild(cab);

      var view = null, viewLesson = -1;
      function updateBar() {
        if (viewLesson < 0) { whereEl.textContent = 'You are the teacher. ' + N() + ' is your student.'; barStars.replaceChildren(); homeBtn.hidden = true; }
        else { whereEl.textContent = LESSONS[viewLesson].kicker; barStars.replaceChildren(starsEl(save.stars[viewLesson])); homeBtn.hidden = false; }
      }
      /* Switch to another view (the lobby or a lesson). user: true when a click asked for it, so focus moves too. */
      function go(make, user) {
        if (view && view.leave) view.leave();
        clearTimers();
        view = make();
        viewLesson = view.lesson == null ? -1 : view.lesson;
        host.replaceChildren(view.el);
        updateBar();
        if (view.resize) view.resize();
        if (view.enter) view.enter();
        if (user) {
          showCab();
          if (view.heading) view.heading.focus({ preventScroll: true });
        }
        kick();
      }
      /* Scroll the robot back into sight (below the site's fixed header) if its top is off screen. */
      function showCab() {
        var r = cab.getBoundingClientRect();
        if (r.top < 0 || r.top > window.innerHeight * 0.6) window.scrollBy({ top: r.top - 84, behavior: RM ? 'auto' : 'smooth' });
      }
      function say(el, text) { el.textContent = text; }
      /* keyNav: true while the player is using the keyboard inside the game (a click anywhere makes it false).
         Only then does a lesson move focus to a new button when the one just pressed disappears. */
      var keyNav = false;

      /* ---------- Pip's question: a quick check at the end of each lesson ---------- */
      function questionCard(li, actor, onRight) {
        var L = LESSONS[li];
        var order = shuffle([0, 1, 2], rnd);
        var fb = h('p', { class: 'rs-note', 'aria-live': 'polite' });
        var ideaEl = h('p', { class: 'rs-bigidea', hidden: true }, 'Big idea: ' + idea(li));
        var buttons = [];
        var card = h('div', { class: 'rs-panel rs-quiz', role: 'group', 'aria-label': N() + '’s question' },
          h('p', { class: 'rs-label' }, N() + '’s question'),
          h('p', { class: 'rs-h' }, L.q),
          h('div', { class: 'rs-opts' }, order.map(function (k) {
            var b = h('button', { class: 'btn', type: 'button', onclick: function () { answer(k, b); } }, L.options[k][0]);
            buttons.push(b);
            return b;
          })),
          fb, ideaEl);
        if (save.ideas[li]) {
          fb.textContent = 'You already answered this one. Here is the big idea again:'; ideaEl.hidden = false;
          buttons.forEach(function (b, k) { b.disabled = true; if (order[k] === 0) b.classList.add('right'); });
        }
        function answer(k, b) {
          if (k === 0) {
            b.classList.add('right'); sfx('coin');
            buttons.forEach(function (x) { x.disabled = true; });
            fb.textContent = 'Yes! That is exactly it.';
            ideaEl.hidden = false;
            if (actor) actor.aha();
            var first = !save.ideas[li];
            save.ideas[li] = 1; persist();
            if (first && save.ideas.every(Boolean) && !save.grad) {
              save.grad = 1; persist();
              api.celebrate(N() + ' graduated from Robot School!');
              fb.textContent = 'Yes! And that was the last big idea. ' + N() + ' has graduated! See the certificate in All lessons.';
            }
            if (onRight) onRight(first);
          } else {
            b.classList.add('wrong'); b.disabled = true; sfx('wrong');
            fb.textContent = L.options[k][1];
            if (actor) actor.flash('confused', 1600);
          }
        }
        return card;
      }
      function howBox(paras) {
        return h('details', { class: 'rs-how' }, h('summary', null, 'How does ' + N() + ' learn this?'), paras.map(function (t) { return h('p', null, t); }));
      }

      /* ---------- the lobby: Pip says hello and you pick a lesson ---------- */
      function lessonIcon(i) {
        var cv = h('canvas', { 'aria-hidden': 'true' });
        function paint() {
          var c = fit(cv, 64, 64);
          c.clearRect(0, 0, 64, 64);
          c.fillStyle = rgba(C.cyan, 0.08); roundRect(c, 1, 1, 62, 62, 16); c.fill();
          if (i === 0) {
            c.strokeStyle = C.cyan; c.lineWidth = 2.5; c.beginPath(); c.moveTo(10, 56); c.lineTo(56, 8); c.stroke();
            drawSnack(c, 'strawberry', 44, 40, 13); drawSnack(c, 'carrot', 20, 22, 13);
          } else if (i === 1) {
            var pattern = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'];
            for (var y = 0; y < 7; y++) for (var x = 0; x < 7; x++) {
              c.fillStyle = pattern[y].charAt(x) === '#' ? C.sun : rgba(C.ink, 0.08);
              c.fillRect(8 + x * 7, 8 + y * 7, 6, 6);
            }
          } else if (i === 2) {
            var m = ['S.#', '.##', '..E'];
            for (y = 0; y < 3; y++) for (x = 0; x < 3; x++) {
              var ch = m[y].charAt(x);
              c.fillStyle = ch === '#' ? '#26305a' : rgba(C.mint, 0.12 + (x + y) * 0.1);
              c.fillRect(8 + x * 16, 8 + y * 16, 15, 15);
            }
            c.fillStyle = C.mint; sparkle(c, 48, 48, 6, C.mint);
            drawPip(c, 16, 16, 13, logo.actor, 0, PIP_ICON);
          } else {
            c.strokeStyle = C.ink; c.lineWidth = 2.5; c.lineCap = 'round';
            c.beginPath(); c.moveTo(32, 12); c.lineTo(32, 52); c.moveTo(20, 54); c.lineTo(44, 54); c.moveTo(12, 22); c.lineTo(52, 22); c.stroke();
            c.fillStyle = C.violet; c.beginPath(); c.arc(16, 34, 9, 0, Math.PI); c.fill();
            c.fillStyle = C.mint; c.beginPath(); c.arc(48, 34, 9, 0, Math.PI); c.fill();
            c.strokeStyle = rgba(C.ink, 0.6); c.lineWidth = 1.5;
            c.beginPath(); c.moveTo(12, 22); c.lineTo(8, 34); c.moveTo(12, 22); c.lineTo(24, 34); c.moveTo(52, 22); c.lineTo(40, 34); c.moveTo(52, 22); c.lineTo(56, 34); c.stroke();
          }
        }
        return { el: cv, paint: paint };
      }
      function lobby() {
        var box = new PipBox('rs-hero-pip', N() + ', a friendly robot with a screen for a face, waves hello.', 200, 220);
        var A = box.actor;
        A.feel('happy'); A.pose('wave', 3200);
        var first = !save.stars.some(Boolean);
        var hello = save.grad ? 'I graduated! Thank you, teacher. Want to keep practising?' :
          first ? 'Hi! I’m ' + N() + '. I’m a brand-new robot and my brain is completely empty. Will you be my teacher?' :
          'Welcome back, teacher! Which lesson shall we do today?';
        var sayEl = h('p', { class: 'rs-say rs-say--left', 'aria-live': 'polite' }, hello);
        var nameIn = h('input', { type: 'text', maxlength: '12', value: N(), autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Your robot’s name' });
        nameIn.addEventListener('input', function () {
          save.name = cleanName(nameIn.value);
          persist(); updateBar();
          box.canvas.setAttribute('aria-label', N() + ', a friendly robot with a screen for a face, waves hello.');
          say(sayEl, nameIn.value.trim() ? 'Ooh, ' + N() + '! I like that name.' : 'No name? Then I’ll be Pip.');
          A.flash('happy', 1200);
        });
        nameIn.addEventListener('blur', function () { nameIn.value = N(); });
        var icons = [];
        /* the big button opens the first lesson with no stars, else the first without three stars */
        var next = -1, startText, k;
        for (k = 0; k < 4 && next < 0; k++) if (!save.stars[k]) next = k;
        if (next >= 0) startText = save.stars.some(Boolean) ? 'Keep going: lesson ' + (next + 1) : 'Start lesson 1';
        else {
          for (k = 0; k < 4 && next < 0; k++) if (save.stars[k] < 3) next = k;
          startText = next >= 0 ? 'Earn more stars: lesson ' + (next + 1) : 'Play lesson 1 again';
          if (next < 0) next = 0;
        }
        var startBtn = h('button', { class: 'btn btn-primary rs-big', type: 'button', onclick: function () { openLesson(next); } }, svgIcon('play'), startText);
        var cards = h('ul', { class: 'rs-cards', 'aria-label': 'Lessons' }, LESSONS.map(function (L, i) {
          var ic = lessonIcon(i); icons.push(ic);
          return h('li', null, h('button', { class: 'rs-card', type: 'button', onclick: function () { openLesson(i); },
            'aria-label': L.kicker + ': ' + L.title + '. ' + L.desc + ' ' + save.stars[i] + ' of 3 stars' + (save.ideas[i] ? ', big idea collected.' : '.') },
            ic.el,
            h('span', { class: 'rs-card-k' }, 'Lesson ' + (i + 1)),
            h('span', { class: 'rs-card-t' }, L.title),
            h('span', { class: 'rs-card-d' }, L.desc),
            h('span', { class: 'rs-card-s' }, starsEl(save.stars[i]), save.ideas[i] ? h('span', { class: 'rs-idea-chip' }, svgIcon('bulb'), 'Big idea') : null)));
        }));
        var ideas = h('div', { class: 'rs-panel rs-ideas' },
          h('p', { class: 'rs-label' }, 'Big ideas collected: ' + save.ideas.filter(Boolean).length + ' of 4'),
          h('ol', null, LESSONS.map(function (L, i) {
            return save.ideas[i] ? h('li', null, idea(i)) : h('li', { class: 'off' }, 'Finish lesson ' + (i + 1) + ' and answer ' + N() + '’s question to unlock this idea.');
          })));
        var cert = save.grad ? h('div', { class: 'rs-cert', role: 'group', 'aria-label': 'Certificate' },
          h('p', { class: 'rs-label' }, 'Robot School · Year 2035 · Certificate'),
          h('p', { class: 'rs-h' }, N() + ' has graduated!'),
          h('p', null, 'Taught by you. ' + N() + ' learned from examples, learned to see, learned by trying, and learned to be fair.')) : null;
        var confirmRow = h('div', { class: 'rs-row', hidden: true },
          h('span', { class: 'rs-note' }, N() + ' will forget every lesson, star and drawing.'),
          h('button', { class: 'btn', type: 'button', onclick: function () { save = blankSave(); persist(); go(lobby, true); } }, 'Yes, start over'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { confirmRow.hidden = true; resetBtn.hidden = false; } }, 'No, keep it'));
        var resetBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { confirmRow.hidden = false; resetBtn.hidden = true; } }, 'Start over');
        var heading = h('h3', { class: 'rs-title', tabindex: '-1' }, 'Robot School', h('span', null, 'Teach a robot. Watch it learn.'));
        var shield = svgIcon('lock');
        var el = h('div', { class: 'rs-lobby' },
          h('div', { class: 'rs-hello' }, box.canvas,
            h('div', null, heading, sayEl,
              h('p', { class: 'rs-privacy' }, shield, h('span', null, h('strong', null, N() + ' really learns, right here on this device. '),
                'Its brain is a small machine-learning program written in plain JavaScript. Nothing you teach, draw or type is sent anywhere, and no AI service on the internet is used.')),
              h('label', { class: 'rs-name' }, 'Your robot’s name', nameIn),
              h('div', { class: 'rs-row', style: { marginTop: '.9rem' } }, startBtn))),
          cards, ideas, cert,
          h('div', { class: 'rs-foot' }, h('p', { class: 'rs-note' }, 'Progress is saved in this browser only.'), h('div', { class: 'rs-row' }, resetBtn, confirmRow)));
        function openLesson(i) { sfx('click'); go([lessonSort, lessonSee, lessonMaze, lessonFair][i], true); }
        return {
          el: el, heading: heading,
          enter: function () {
            api.status(save.grad ? 'Robot School: ' + N() + ' has graduated. Pick any lesson to keep practising.' : 'Robot School: pick a lesson to teach ' + N());
            chirp('hello');
          },
          resize: function () { box.resize(); icons.forEach(function (ic) { ic.paint(); }); },
          frame: function (dt, now) { box.draw(dt, now); }
        };
      }

      /* =================================================================================================
         LESSON 1: SNACK SORTER. Pip learns fruit from veg with one neuron, and its line moves on the chart.
         ================================================================================================= */
      var TRICKY = null;
      function lessonSort() {
        var S = save.l1;
        var A = new PipActor('neutral');
        var neuron = new Neuron();
        var examples = [];          // {type, sweet, juicy, label}: label 1 fruit, 0 veg
        var trainData = [];         // the same examples as numbers for the neuron
        var trainLeft = 0;          // training steps still to show on the chart
        var phase = 'teach';        // teach, ready, test, report
        var queue = [];             // snacks waiting to be taught this round
        var cur = null;             // the snack on screen
        var bins = [[], []];        // what has landed in the fruit bowl (0) and the veg crate (1)
        var testSet = [], testAt = 0, testRight = 0, wrongNow = [], lastWrong = [];
        var tests = S.tests.slice();
        var chartDirty = true, angleBefore = null;
        var sc = null, SW = 300, SH = 300, PS = 90, pipX = 150, pipY = 180, holdY = 80, itemR = 26, binY = 240, binW = 90, binX = [60, 240];
        var cc = null, CW = 300, CH = 300, chartBg = document.createElement('canvas'), sceneBg = document.createElement('canvas');
        var pl = 36, pt = 10, pw = 250, ph = 250, F12 = '', F13 = '', F12h = '';

        examples = S.ex.map(function (e) { return { type: e[0], sweet: e[1], juicy: e[2], label: e[3] }; });
        rebuildData();
        if (examples.length) neuron.train(trainData, TRAIN.steps * 2, TRAIN.rate, TRAIN.l2);

        /* ----- the page ----- */
        var heading = h('h3', { class: 'rs-h', tabindex: '-1' }, 'Snack Sorter');
        var sayEl = h('p', { class: 'rs-say rs-say--down', 'aria-live': 'polite' });
        var scene = h('canvas', { class: 'rs-scene', role: 'img', 'aria-label': 'The canteen snack chute. ' + N() + ' floats between a fruit bowl on the left and a veg crate on the right.' });
        var chart = h('canvas', { class: 'rs-chart', role: 'img', 'aria-label': N() + '’s chart' });
        var fruitBtn = h('button', { class: 'btn rs-big rs-fruit', type: 'button', disabled: true, onclick: function () { label(1); } }, svgIcon('fruit'), 'Fruit');
        var vegBtn = h('button', { class: 'btn rs-big rs-veg', type: 'button', disabled: true, onclick: function () { label(0); } }, svgIcon('veg'), 'Veg');
        var askRow = h('div', { class: 'rs-ask' }, h('div', { class: 'rs-row rs-row--c', role: 'group', 'aria-label': 'Label the snack' }, fruitBtn, vegBtn),
          h('p', { class: 'rs-note', style: { textAlign: 'center' } }, 'Keys: left arrow or F for fruit, right arrow or V for veg.'));
        var tryBtn = h('button', { class: 'btn btn-primary rs-big', type: 'button', onclick: startTest }, svgIcon('play'), 'Let ' + N() + ' try');
        var moreBtn = h('button', { class: 'btn rs-big', type: 'button', onclick: teachMore }, 'Teach ' + N() + ' more');
        var skipBtn = h('button', { class: 'btn rs-big', type: 'button', onclick: skipTest }, 'Skip to the result');
        var ctrlRow = h('div', { class: 'rs-row rs-row--c' });
        var hist = h('div', { class: 'rs-hist', role: 'list', 'aria-label': N() + '’s test scores' });
        var qHost = h('div');
        var restartBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: restart }, 'Start this lesson again');
        var el = h('div', { class: 'rs-lesson rs-l1' },
          h('div', { class: 'rs-row', style: { justifyContent: 'space-between', marginBottom: '.5rem' } }, heading),
          sayEl,
          h('div', { class: 'rs-two', style: { marginTop: '.9rem' } },
            h('div', { class: 'rs-panel' }, scene, askRow, ctrlRow),
            h('div', { class: 'rs-panel' },
              h('p', { class: 'rs-label' }, N() + '’s chart: every dot is a snack you taught'),
              h('div', { class: 'rs-chartwrap' }, chart),
              h('p', { class: 'rs-legend' }, h('span', null, svgIcon('fruit'), 'fruit you taught'), h('span', null, svgIcon('veg'), 'veg you taught'), h('span', null, '✕ test mistake')),
              h('p', { class: 'rs-label' }, 'Test scores (out of 10)'), hist)),
          qHost,
          howBox([
            N() + ' cannot taste or see. Its two sensors turn each snack into two numbers from 0 to 10: how sweet it is and how juicy it is. Each snack you teach becomes a dot on ' + N() + '’s chart.',
            N() + '’s brain here is one artificial neuron. It draws a straight line to split the fruit dots from the veg dots. Every time you add a dot, it nudges the line a tiny bit, hundreds of times, until the line fits your examples as well as it can. That nudging is called training.',
            'A new snack is a fruit if it lands on the fruit side of the line. The further from the line, the surer ' + N() + ' is. ' + N() + ' does not know what a strawberry is. It only knows the numbers you showed it, so the tricky snacks it gets wrong are the best ones to teach next.',
            'The sweet and juicy scores are our own made-up readings for this game. Real sorting robots measure many more things, like colour, shape and weight.'
          ]),
          h('div', { class: 'rs-row', style: { marginTop: '.4rem' } }, restartBtn));
        var legendIcons = el.querySelectorAll('.rs-legend .rs-icon');
        if (legendIcons[0]) legendIcons[0].style.color = 'var(--rs-pink)';
        if (legendIcons[1]) legendIcons[1].style.color = 'var(--rs-mint)';

        function rebuildData() { trainData = examples.map(function (e) { return snackExample(e, e.label); }); }
        function store() {
          S.ex = examples.slice(-60).map(function (e) { return [e.type, e.sweet, e.juicy, e.label]; });
          S.tests = tests.slice(-12);
          persist();
        }
        function hasBoth() { var f = 0, v = 0; examples.forEach(function (e) { if (e.label) f++; else v++; }); return f > 0 && v > 0; }
        function nameOf(it) { return SNACKS[it.type].name; }
        function a(it) { return /^[aeiou]/.test(nameOf(it)) ? 'an ' + nameOf(it) : 'a ' + nameOf(it); }
        function pct(p) { return Math.round(Math.max(p, 1 - p) * 100) + '%'; }
        function poolAccuracy() { return sortAccuracy(neuron, snackTypes()); }
        function setAsk(on) { fruitBtn.disabled = vegBtn.disabled = !on; askRow.hidden = phase !== 'teach'; if (on) keepFocus(fruitBtn); }
        /* When the button a keyboard user just pressed disappears, carry their focus to the new main button. */
        function keepFocus(target) {
          if (!keyNav) return;
          var a = document.activeElement;
          if (a && a !== document.body && (!el.contains(a) || (a.offsetParent && !a.disabled))) return;
          if (target && !target.disabled && target.offsetParent) target.focus({ preventScroll: true });
        }
        function setControls(list) { ctrlRow.replaceChildren.apply(ctrlRow, list); if (list[0]) keepFocus(list[0]); }
        function lineAngle() { return Math.atan2(neuron.w2, neuron.w1); }

        /* ----- teaching ----- */
        function startRound(items) { phase = 'teach'; queue = items; setControls([]); setAsk(false); after(dur(350), nextTeach); }
        /* The first two snacks are an unusual pair (see trickyPairs), re-picked until a neuron trained on just
           these two would sort at most 70% of the kinds of snack correctly: Pip's first rule is too simple. */
        function firstRound() {
          if (!TRICKY) TRICKY = trickyPairs();
          var items = null, all = snackTypes();
          for (var tries = 0; tries < 30; tries++) {
            var pair = TRICKY[Math.floor(rnd() * TRICKY.length)] || [1, 10];
            items = [makeSnack(pair[0], rnd), makeSnack(pair[1], rnd)];
            var test = new Neuron();
            test.train([snackExample(items[0], 1), snackExample(items[1], 0)], TRAIN.steps, TRAIN.rate, TRAIN.l2);
            if (sortAccuracy(test, all) <= 0.7) break;
          }
          if (rnd() < 0.5) items.reverse();
          startRound(items);
        }
        function nextTeach() {
          if (!queue.length) { showReady(); return; }
          drop(queue.shift(), 'teach');
        }
        function drop(it, mode) {
          cur = { it: it, mode: mode, st: 'fall', t: 0, x: pipX, y: -itemR * 2, rot: 0, landed: false, readout: 0,
            sweetText: 'SWEET ' + it.sweet.toFixed(1), juicyText: 'JUICY ' + it.juicy.toFixed(1), name: nameOf(it), decideText: '' };
          A.look = [0, -1];
          chartDirty = true;
          if (mode === 'teach') api.status('Snack Sorter · teaching: ' + nameOf(it) + ' coming down the chute');
        }
        function onScanned() {
          var it = cur.it;
          if (cur.mode === 'teach') {
            cur.st = 'ask';
            var p = examples.length ? snackGuess(neuron, it) : null;
            cur.prior = p;
            var reading = 'Sweet ' + it.sweet.toFixed(1) + ', juicy ' + it.juicy.toFixed(1) + '. ';
            if (p == null) { A.feel('confused'); say(sayEl, 'Here comes ' + a(it) + '! I measured it: ' + reading + 'But I have no idea what it is yet. Is it a fruit or a veg?'); }
            else {
              var guess = p >= 0.5 ? 'fruit' : 'veg', sure = Math.max(p, 1 - p);
              A.feel(sure > 0.85 ? 'confident' : sure > 0.65 ? 'thinking' : 'confused');
              say(sayEl, 'Here comes ' + a(it) + '. ' + reading + 'I think it’s a ' + guess + ', and I’m ' + pct(p) + ' sure. What is it really?');
            }
            setAsk(true);
            el.setAttribute('data-item', SNACKS[it.type].id);
            api.status('Snack Sorter · is the ' + nameOf(it) + ' a fruit or a veg?');
          } else {
            cur.st = 'decide'; cur.t = 0;
            cur.p = snackGuess(neuron, it);
            cur.decideText = (cur.p >= 0.5 ? 'FRUIT' : 'VEG') + ' · ' + pct(cur.p) + ' sure';
            var s2 = Math.max(cur.p, 1 - cur.p);
            A.feel(s2 > 0.85 ? 'confident' : s2 > 0.65 ? 'thinking' : 'confused');
          }
        }
        function label(y) {
          if (!cur || cur.st !== 'ask') return;
          api.unlockSound();
          setAsk(false);
          el.setAttribute('data-item', '');
          var it = cur.it;
          cur.label = y; cur.bin = y ? 0 : 1; cur.st = 'toss'; cur.t = 0;
          A.pose(y ? 'left' : 'right', 700); A.look = [y ? -1 : 1, 0.4];
          sfx('whoosh');
          examples.push({ type: it.type, sweet: it.sweet, juicy: it.juicy, label: y });
          if (examples.length > 60) examples.shift();
          rebuildData(); store();
          angleBefore = examples.length > 2 ? lineAngle() : null;
          trainLeft = TRAIN.steps;
          A.feel('thinking'); A.chest = 'bars';
          if (RM) { neuron.train(trainData, trainLeft, TRAIN.rate, TRAIN.l2); trainLeft = 0; }
          chartDirty = true;
          el.setAttribute('data-examples', String(examples.length));
        }
        /* After a taught snack has landed and the line has finished moving, Pip says what it learned. */
        function taughtDone() {
          var it = cur.it, y = cur.label, p = cur.prior;
          A.chest = 'dot'; A.feel('neutral'); A.look = [0, 0];
          el.setAttribute('data-pool', poolAccuracy().toFixed(2));
          var what = y ? 'fruit' : 'veg', moved = angleBefore != null ? Math.abs(lineAngle() - angleBefore) : 0;
          if (moved > Math.PI) moved = Math.PI * 2 - moved;
          if (p == null) { A.flash('happy', 1500); chirp('happy'); say(sayEl, 'So ' + a(it) + ' is a ' + what + '. I’ve put a dot on my chart.' + (examples.length === 1 ? ' One dot is not enough to draw a line, though!' : '')); }
          else if ((p >= 0.5 ? 1 : 0) === y) { A.flash('happy', 1500); chirp('happy'); say(sayEl, 'I guessed right! ' + cap(nameOf(it)) + ': ' + what + '. My line only needed a little nudge.'); }
          else if (moved > 0.35) { A.aha(); say(sayEl, 'Aha! So ' + a(it) + ' is a ' + what + '! That changes everything. Look how far my line moved.'); }
          else { A.flash('surprised', 1500); chirp('oops'); say(sayEl, 'Oh! ' + cap(a(it)) + ' is a ' + what + '? I’ve moved my line to fit it.'); }
          if (examples.length === 2 && p == null) say(sayEl, sayEl.textContent + ' Now I have one of each, so I can draw my first line.');
          cur = null; chartDirty = true;
          after(dur(1500), nextTeach);
        }
        function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
        function showReady() {
          phase = 'ready'; setAsk(false);
          askRow.hidden = true;
          A.feel('happy');
          if (!hasBoth()) { setControls([moreBtn]); say(sayEl, 'I need at least one fruit and one veg before I can draw a line. Teach me more!'); api.status('Snack Sorter · teach at least one fruit and one veg'); return; }
          setControls([tryBtn, moreBtn]);
          say(sayEl, 'I’ve learned from ' + examples.length + ' snack' + (examples.length === 1 ? '' : 's') + '. Shall I try sorting 10 new snacks all by myself?');
          api.status('Snack Sorter · ' + examples.length + ' snacks taught. Let ' + N() + ' try, or teach more');
        }
        function teachMore() {
          api.unlockSound(); sfx('click');
          var taught = {}, items = [], i;
          examples.forEach(function (e) { taught[e.type] = 1; });
          for (i = 0; i < lastWrong.length && items.length < 3; i++) items.push(lastWrong[i]);
          var fresh = shuffle(snackTypes().map(function (t) { return t.type; }), rnd).filter(function (t) { return !taught[t] && !items.some(function (x) { return x.type === t; }); });
          var any = shuffle(snackTypes().map(function (t) { return t.type; }), rnd);
          while (items.length < 4) items.push(makeSnack(fresh.length ? fresh.shift() : any.shift(), rnd));
          say(sayEl, lastWrong.length ? 'Great! The snacks I got wrong are coming back first, because those are the best ones to learn from.' : 'Four more snacks coming up!');
          lastWrong = [];
          askRow.hidden = false;
          startRound(items);
        }

        /* ----- testing: Pip sorts 10 new snacks on its own ----- */
        function startTest() {
          if (!hasBoth()) { showReady(); return; }
          api.unlockSound(); sfx('click');
          phase = 'test'; setAsk(false); askRow.hidden = true;
          var fruit = [], veg = [];
          SNACKS.forEach(function (s, i) { (s.fruit ? fruit : veg).push(i); });
          shuffle(fruit, rnd); shuffle(veg, rnd);
          testSet = shuffle(fruit.slice(0, 5).concat(veg.slice(0, 5)), rnd).map(function (t) { return makeSnack(t, rnd); });
          testAt = 0; testRight = 0; wrongNow = []; bins = [[], []];
          setControls([skipBtn]);
          chirp('think'); A.feel('thinking');
          say(sayEl, 'Here I go! Ten new snacks, and nobody tells me the answers. Let’s see what my line says.');
          after(dur(700), nextTest);
        }
        function nextTest() {
          if (phase !== 'test') return;
          if (testAt >= testSet.length) { finishTest(); return; }
          drop(testSet[testAt], 'test');
          api.status('Snack Sorter · ' + N() + ' is sorting on its own: ' + testAt + ' of 10 done, ' + testRight + ' right');
        }
        function judged(it, bin) {
          var right = (bin === 0) === !!SNACKS[it.type].fruit;
          if (right) testRight++; else wrongNow.push(it);
          testAt++;
          return right;
        }
        function skipTest() {
          if (phase !== 'test') return;
          sfx('click');
          if (cur && cur.mode === 'test' && !cur.landed) { cur = null; }
          while (testAt < testSet.length) {
            var it = testSet[testAt], bin = snackGuess(neuron, it) >= 0.5 ? 0 : 1;
            var right = judged(it, bin);
            bins[bin].push({ type: it.type, mark: right ? 1 : -1 });
          }
          clearTimers();
          finishTest();
        }
        function finishTest() {
          phase = 'report'; cur = null;
          var score = testRight;
          var best = tests.length ? Math.max.apply(null, tests) : -1;
          tests.push(score); store();
          lastWrong = wrongNow.slice();
          var lastWrongNames = wrongNow.map(nameOf).slice(0, 3).join(', ');
          drawHist(); chartDirty = true;
          el.setAttribute('data-tests', tests.join(','));
          el.setAttribute('data-pool', poolAccuracy().toFixed(2));
          var stars = score === 10 ? 3 : score >= 8 ? 2 : 1;
          var newStars = award(0, stars);
          var msg;
          A.feel(score >= 9 ? 'confident' : score >= 8 ? 'happy' : 'neutral'); A.look = [0, 0];
          if (score === 10) { A.aha(); msg = 'Ten out of ten! Every snack in the right place. You’re a brilliant teacher.'; }
          else if (best >= 0 && score > best) { A.aha(); msg = 'Aha! ' + score + ' out of 10, my best yet! Your extra examples really helped.'; }
          else if (tests.length === 1) { A.flash('sad', 2600); chirp('sad'); msg = 'I got ' + score + ' out of 10 right. The tricky ones fooled me'; }
          else { A.flash('thinking', 2000); chirp('think'); msg = score + ' out of 10. Some tests are harder than others'; }
          if (score < 10 && lastWrongNames) msg += (msg.slice(-1) === '.' ? ' ' : ': ') + 'I got the ' + lastWrongNames + ' wrong. Teach me more, and I’ll look at those first!';
          else if (score < 10) msg += '.';
          var mixed = examples.filter(function (e) { return e.label !== SNACKS[e.type].fruit; });
          if (mixed.length) {
            var m = mixed[0];
            msg += ' Psst: you taught me that ' + a(m) + ' is a ' + (m.label ? 'fruit' : 'veg') + ', but the canteen list says it’s a ' + (m.label ? 'veg' : 'fruit') + '. I learn exactly what you teach me, even mistakes!';
          }
          say(sayEl, msg);
          sfx(score >= 8 ? 'bell' : 'pop');
          if (newStars && stars === 3) api.celebrate(N() + ' sorted every snack!');
          api.status('Snack Sorter · ' + N() + ' got ' + score + ' out of 10 right');
          moreBtn.className = score === 10 ? 'btn rs-big' : 'btn btn-primary rs-big';
          tryBtn.className = score === 10 ? 'btn btn-primary rs-big' : 'btn rs-big';
          setControls(score === 10 ? [tryBtn, moreBtn] : [moreBtn, tryBtn]);
          tryBtn.lastChild.textContent = 'Test again';
          if (tests.length >= 2 && !qHost.firstChild) qHost.appendChild(questionCard(0, A));
        }
        function drawHist() {
          hist.replaceChildren();
          if (!tests.length) { hist.appendChild(h('span', { class: 'rs-empty' }, 'No tests yet.')); return; }
          tests.slice(-8).forEach(function (s, i, list) {
            var n = tests.length - list.length + i + 1;
            hist.appendChild(h('div', { class: 'rs-hist-col', role: 'listitem', 'aria-label': 'Test ' + n + ': ' + s + ' out of 10' },
              h('strong', null, String(s)), h('div', { class: 'rs-hist-bar', style: { height: Math.max(4, s * 6) + 'px' } }), h('span', null, 'Test ' + n)));
          });
        }
        function restart() {
          sfx('click');
          examples = []; rebuildData(); tests = []; lastWrong = []; bins = [[], []]; neuron = new Neuron(); cur = null; clearTimers();
          store(); drawHist(); chartDirty = true; qHost.replaceChildren();
          el.setAttribute('data-examples', '0'); el.setAttribute('data-tests', ''); el.setAttribute('data-pool', poolAccuracy().toFixed(2));
          showCab();
          A.feel('neutral'); A.flash('surprised', 900);
          say(sayEl, 'My snack memories are gone. Let’s start again!');
          askRow.hidden = false; tryBtn.lastChild.textContent = 'Let ' + N() + ' try'; tryBtn.className = 'btn btn-primary rs-big'; moreBtn.className = 'btn rs-big';
          firstRound();
        }

        /* ----- moving the snack: fall, scan, (wait or decide), toss, land ----- */
        function binCentre(b) { return binX[b]; }
        function step(dt) {
          if (!cur) return;
          cur.t += dt;
          var k;
          if (cur.st === 'fall') {
            var D = cur.mode === 'test' && testAt > 1 ? dur(300) : dur(460);
            k = clamp(cur.t / D, 0, 1);
            cur.y = lerp(-itemR * 2, holdY, RM ? 1 : k * k);
            if (k >= 1) { cur.st = 'scan'; cur.t = 0; chirp('scan'); A.feel('thinking'); }
          } else if (cur.st === 'scan') {
            var Ds = cur.mode === 'test' && testAt > 1 ? dur(320) : dur(560);
            cur.readout = clamp(cur.t / Ds, 0, 1);
            if (cur.t >= Ds) onScanned();
          } else if (cur.st === 'decide') {
            if (cur.t >= (testAt > 1 ? dur(260) : dur(420))) {
              cur.bin = cur.p >= 0.5 ? 0 : 1; cur.st = 'toss'; cur.t = 0;
              A.pose(cur.bin === 0 ? 'left' : 'right', 600); sfx('whoosh');
            }
          } else if (cur.st === 'toss') {
            var Dt = RM ? 1 : (cur.mode === 'test' && testAt > 1 ? 340 : 480);
            k = clamp(cur.t / Dt, 0, 1);
            var tx = binCentre(cur.bin), ty = binY - 4;
            cur.x = lerp(pipX, tx, k); cur.y = lerp(holdY, ty, k) - Math.sin(k * Math.PI) * 60;
            cur.rot += dt * 0.012 * (cur.bin === 0 ? -1 : 1);
            if (k >= 1) land();
          } else if (cur.st === 'landed') {
            if (cur.mode === 'teach' && trainLeft === 0) taughtDone();
          }
        }
        function land() {
          var it = cur.it;
          cur.landed = true; cur.st = 'landed';
          if (cur.mode === 'teach') {
            bins[cur.bin].push({ type: it.type, mark: 0 });
            sfx('pop');
          } else {
            var right = judged(it, cur.bin);
            bins[cur.bin].push({ type: it.type, mark: right ? 1 : -1 });
            sfx(right ? 'coin' : 'wrong');
            A.flash(right ? 'happy' : 'sad', 600);
            chartDirty = true;
            api.status('Snack Sorter · ' + N() + ' is sorting on its own: ' + testAt + ' of 10 done, ' + testRight + ' right');
            cur = null;
            after(testAt > 2 ? dur(180) : dur(360), nextTest);
          }
          if (bins[0].length > 7) bins[0].shift();
          if (bins[1].length > 7) bins[1].shift();
        }

        /* ----- drawing the canteen ----- */
        function layout() {
          SW = Math.max(240, scene.clientWidth || 300); SH = SW < 480 ? 270 : 340;
          sc = fit(scene, SW, SH);
          PS = clamp(SH * 0.3, 64, 100);
          pipX = SW / 2; pipY = SH - 1.3 * PS - 6;
          itemR = clamp(PS * 0.3, 20, 30);
          holdY = pipY - 0.67 * PS - itemR - 8;
          binW = clamp(SW * 0.25, 70, 120); binY = SH - 58;
          binX = [Math.max(binW / 2 + 6, SW * 0.16), SW - Math.max(binW / 2 + 6, SW * 0.16)];
          buildSceneBg();
          CW = Math.max(220, chart.clientWidth || 300); CH = Math.round(Math.min(CW * 0.92, 360));
          F12 = '700 12px ' + FONT.mono; F13 = '800 13px ' + FONT.head; F12h = '600 12px ' + FONT.head;
          cc = fit(chart, CW, CH);
          pl = 38; pt = 12; pw = CW - pl - 12; ph = CH - pt - 38;
          chartDirty = true;
        }
        function buildSceneBg() {
          var d = dprNow();
          sceneBg.width = Math.round(SW * d); sceneBg.height = Math.round(SH * d);
          var b = sceneBg.getContext('2d');
          b.setTransform(d, 0, 0, d, 0, 0);
          var g = b.createLinearGradient(0, 0, 0, SH);
          g.addColorStop(0, '#0b1230'); g.addColorStop(1, '#060914');
          b.fillStyle = g; b.fillRect(0, 0, SW, SH);
          /* aurora lights on the canteen wall */
          for (var i = 0; i < 3; i++) {
            var ag = b.createLinearGradient(0, 0, SW, 0);
            var col = [C.cyan, C.violet, C.mint][i];
            ag.addColorStop(0, rgba(col, 0)); ag.addColorStop(0.5, rgba(col, 0.12)); ag.addColorStop(1, rgba(col, 0));
            b.fillStyle = ag;
            b.beginPath(); b.moveTo(0, 30 + i * 26); b.bezierCurveTo(SW * 0.3, 10 + i * 30, SW * 0.6, 60 + i * 20, SW, 26 + i * 28); b.lineTo(SW, 46 + i * 28); b.bezierCurveTo(SW * 0.6, 80 + i * 20, SW * 0.3, 30 + i * 30, 0, 50 + i * 26); b.closePath(); b.fill();
          }
          /* floor */
          b.fillStyle = 'rgba(94,242,255,.06)'; b.fillRect(0, SH - 24, SW, 24);
          b.strokeStyle = 'rgba(94,242,255,.25)'; b.beginPath(); b.moveTo(0, SH - 24.5); b.lineTo(SW, SH - 24.5); b.stroke();
          /* the chute: a glass tube from the ceiling */
          var top = holdY - itemR - 16;
          b.fillStyle = 'rgba(167,139,250,.14)'; roundRect(b, pipX - itemR - 8, -10, (itemR + 8) * 2, top + 10, 10); b.fill();
          b.strokeStyle = 'rgba(167,139,250,.6)'; b.lineWidth = 2; roundRect(b, pipX - itemR - 8, -10, (itemR + 8) * 2, top + 10, 10); b.stroke();
          b.fillStyle = 'rgba(234,242,255,.12)'; b.fillRect(pipX - itemR - 2, 0, 5, top - 4);
          b.fillStyle = C.violet; roundRect(b, pipX - itemR - 14, top - 6, (itemR + 14) * 2, 10, 5); b.fill();
          b.font = '700 10px ' + FONT.mono; b.textAlign = 'left'; b.fillStyle = rgba(C.ink, 0.55);
          if (SW > 360) b.fillText('SNACK CHUTE · CANTEEN 2035', 10, 18);
        }
        function drawBin(c, b) {
          var x = binX[b], w = binW, y = binY, col = b === 0 ? C.pink : C.mint;
          /* the pile inside, behind the front */
          var pile = bins[b], r = clamp(w * 0.16, 9, 15);
          for (var i = 0; i < pile.length; i++) {
            var px = x - w * 0.3 + (i % 4) * w * 0.2, py = y + 4 - Math.floor(i / 4) * r * 1.1 - (i % 2) * 3;
            drawSnack(c, SNACKS[pile[i].type].id, px, py, r);
          }
          c.fillStyle = rgba(col, 0.2); c.strokeStyle = col; c.lineWidth = 2.5;
          if (b === 0) { c.beginPath(); c.moveTo(x - w / 2, y + 2); c.quadraticCurveTo(x - w / 2 + 4, y + 40, x, y + 42); c.quadraticCurveTo(x + w / 2 - 4, y + 40, x + w / 2, y + 2); c.closePath(); c.fill(); c.stroke(); }
          else { roundRect(c, x - w / 2, y + 2, w, 38, 6); c.fill(); c.stroke(); c.beginPath(); c.moveTo(x - w / 2, y + 21); c.lineTo(x + w / 2, y + 21); c.stroke(); }
          /* tick or cross on the snacks marked in a test (a shape, not only a colour) */
          for (i = 0; i < pile.length; i++) {
            if (!pile[i].mark) continue;
            var mx = x - w * 0.3 + (i % 4) * w * 0.2 + r * 0.7, my = y + 4 - Math.floor(i / 4) * r * 1.1 - (i % 2) * 3 - r * 0.7;
            c.fillStyle = pile[i].mark > 0 ? C.mint : C.pink; c.beginPath(); c.arc(mx, my, 7, 0, TAU); c.fill();
            c.strokeStyle = '#06101a'; c.lineWidth = 2.2; c.beginPath();
            if (pile[i].mark > 0) { c.moveTo(mx - 3.5, my); c.lineTo(mx - 1, my + 3); c.lineTo(mx + 3.5, my - 3); }
            else { c.moveTo(mx - 3, my - 3); c.lineTo(mx + 3, my + 3); c.moveTo(mx + 3, my - 3); c.lineTo(mx - 3, my + 3); }
            c.stroke();
          }
          c.font = F13; c.textAlign = 'center'; c.fillStyle = col;
          c.fillText(b === 0 ? 'FRUIT' : 'VEG', x, y + 34);
          /* the chart's shape for this bin: a circle for fruit, a square for veg */
          c.strokeStyle = col; c.lineWidth = 2;
          if (b === 0) { c.beginPath(); c.arc(x, y + 14, 4, 0, TAU); c.stroke(); } else c.strokeRect(x - 4, y + 10, 8, 8);
        }
        function drawScene(now) {
          var c = sc;
          if (!c) return;
          c.drawImage(sceneBg, 0, 0, SW, SH);
          drawBin(c, 0); drawBin(c, 1);
          drawPip(c, pipX, pipY, PS, A, now, PIP_FULL);
          if (cur) {
            if (cur.st === 'scan' || cur.st === 'ask' || cur.st === 'decide') {
              /* a holder beam and the scanner sweep */
              c.fillStyle = rgba(C.cyan, 0.13); c.beginPath(); c.moveTo(pipX - 6, pipY - 0.62 * PS); c.lineTo(pipX - itemR * 1.2, holdY + itemR * 0.4); c.lineTo(pipX + itemR * 1.2, holdY + itemR * 0.4); c.lineTo(pipX + 6, pipY - 0.62 * PS); c.closePath(); c.fill();
              c.strokeStyle = rgba(C.cyan, 0.7); c.lineWidth = 2; c.beginPath(); c.ellipse(pipX, holdY + itemR * 0.75, itemR * 1.1, itemR * 0.28, 0, 0, TAU); c.stroke();
              if (cur.st === 'scan' && !RM) { var sy = holdY - itemR + cur.readout * itemR * 2; c.fillStyle = rgba(C.mint, 0.5); c.fillRect(pipX - itemR - 6, sy - 1.5, itemR * 2 + 12, 3); }
            }
            drawSnack(c, SNACKS[cur.it.type].id, cur.x, cur.y, itemR, cur.st === 'toss' ? cur.rot : 0);
            if (cur.readout > 0 && cur.st !== 'toss' && cur.st !== 'landed') {
              var rx = pipX + itemR + 14, right = rx + 112 < SW;
              if (!right) rx = pipX - itemR - 14;
              c.textAlign = right ? 'left' : 'right'; c.font = F12;
              c.fillStyle = rgba(C.cyan, Math.min(1, cur.readout * 2));
              c.fillText(cur.sweetText, rx, holdY - 6);
              c.fillStyle = rgba(C.mint, Math.min(1, cur.readout * 1.5));
              c.fillText(cur.juicyText, rx, holdY + 10);
              if (cur.st === 'ask') { c.font = F12h; c.fillStyle = rgba(C.ink, 0.8); c.fillText(cur.name, rx, holdY + 27); }
            }
            if (cur.st === 'decide' && cur.p != null) {
              c.font = F13; c.textAlign = 'center'; c.fillStyle = cur.p >= 0.5 ? C.pink : C.mint;
              c.fillText(cur.decideText, pipX, Math.max(14, holdY - itemR - 22));
            }
          }
        }

        /* ----- the chart: sweet across, juicy up ----- */
        function X(v) { return pl + v / 10 * pw; }
        function Y(v) { return pt + (1 - v / 10) * ph; }
        function renderChart() {
          var d = dprNow();
          chartBg.width = Math.round(CW * d); chartBg.height = Math.round(CH * d);
          var c = chartBg.getContext('2d');
          c.setTransform(d, 0, 0, d, 0, 0);
          c.fillStyle = '#070b1a'; roundRect(c, 0, 0, CW, CH, 12); c.fill();
          var ready = hasBoth() || trainLeft > 0, i, j;
          /* the background shows Pip's opinion everywhere: pink where it would say fruit, green for veg */
          if (ready && examples.length > 1) {
            var n = 28, cw = pw / n, chh = ph / n, fx = 0, fy = 0, fc = 0, vx = 0, vy = 0, vc = 0;
            for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
              var sweet = (i + 0.5) / n * 10, juicy = (j + 0.5) / n * 10, p = neuron.prob(norm10(sweet), norm10(juicy));
              var amt = Math.abs(p - 0.5) * 2;
              c.fillStyle = rgba(p >= 0.5 ? C.pink : C.mint, Math.round((0.05 + amt * 0.26) * 40) / 40);
              c.fillRect(pl + i * cw, pt + (n - 1 - j) * chh, Math.ceil(cw), Math.ceil(chh));
              if (p >= 0.5) { fx += sweet; fy += juicy; fc++; } else { vx += sweet; vy += juicy; vc++; }
            }
            c.font = '800 ' + Math.round(clamp(CW / 18, 12, 20)) + 'px ' + FONT.head; c.textAlign = 'center'; c.textBaseline = 'middle';
            if (fc > 6) { c.fillStyle = rgba(C.pink, 0.75); c.fillText('FRUIT', X(fx / fc), Y(fy / fc)); }
            if (vc > 6) { c.fillStyle = rgba(C.mint, 0.75); c.fillText('VEG', X(vx / vc), Y(vy / vc)); }
            c.textBaseline = 'alphabetic';
          }
          /* grid and axes */
          c.strokeStyle = 'rgba(234,242,255,.08)'; c.lineWidth = 1;
          for (i = 0; i <= 10; i += 2) { c.beginPath(); c.moveTo(Math.round(X(i)) + 0.5, pt); c.lineTo(Math.round(X(i)) + 0.5, pt + ph); c.moveTo(pl, Math.round(Y(i)) + 0.5); c.lineTo(pl + pw, Math.round(Y(i)) + 0.5); c.stroke(); }
          c.strokeStyle = rgba(C.ink, 0.5); c.beginPath(); c.moveTo(pl, pt); c.lineTo(pl, pt + ph); c.lineTo(pl + pw, pt + ph); c.stroke();
          c.fillStyle = C.muted; c.font = '600 11px ' + FONT.head; c.textAlign = 'center';
          [0, 5, 10].forEach(function (v) { c.fillText(String(v), X(v), pt + ph + 14); });
          c.textAlign = 'right';
          [0, 5, 10].forEach(function (v) { c.fillText(String(v), pl - 6, Y(v) + 4); });
          c.textAlign = 'center'; c.font = '700 12px ' + FONT.head; c.fillStyle = C.cyan;
          c.fillText('Sweet →', pl + pw / 2, pt + ph + 30);
          c.save(); c.translate(13, pt + ph / 2); c.rotate(-Math.PI / 2); c.fillStyle = C.mint; c.fillText('Juicy →', 0, 0); c.restore();
          /* Pip's line, where the neuron's total is exactly 0 */
          if (ready && examples.length > 1) {
            var pts = lineEnds();
            if (pts.length === 2) {
              c.strokeStyle = rgba(C.sun, 0.25); c.lineWidth = 9; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); c.stroke();
              c.strokeStyle = C.sun; c.lineWidth = 3; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); c.stroke();
            }
          }
          /* the examples you taught */
          var r = clamp(CW / 30, 8, 12);
          examples.forEach(function (e) {
            var x = X(e.sweet), y = Y(e.juicy), col = e.label ? C.pink : C.mint;
            c.fillStyle = 'rgba(7,11,26,.85)'; c.strokeStyle = col; c.lineWidth = 2.5;
            if (e.label) { c.beginPath(); c.arc(x, y, r + 2, 0, TAU); c.fill(); c.stroke(); }
            else { roundRect(c, x - r - 2, y - r - 2, (r + 2) * 2, (r + 2) * 2, 4); c.fill(); c.stroke(); }
            drawSnack(c, SNACKS[e.type].id, x, y, r * 0.8);
          });
          /* the test snacks Pip got wrong */
          if (phase === 'report' || phase === 'test') {
            (phase === 'report' ? lastWrong : wrongNow).forEach(function (it) {
              var x = X(it.sweet), y = Y(it.juicy);
              c.strokeStyle = C.sun; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - 6, y - 6); c.lineTo(x + 6, y + 6); c.moveTo(x + 6, y - 6); c.lineTo(x - 6, y + 6); c.stroke();
            });
          }
          chart.setAttribute('aria-label', chartWords());
        }
        /* The two points where Pip's line crosses the edges of the chart. */
        function lineEnds() {
          var out = [], w1 = neuron.w1, w2 = neuron.w2, b = neuron.b, u, v;
          if (Math.abs(w2) > 1e-6) { for (u = -1; u <= 1; u += 2) { v = -(w1 * u + b) / w2; if (v >= -1 && v <= 1) out.push([X((u + 1) * 5), Y((v + 1) * 5)]); } }
          if (Math.abs(w1) > 1e-6) { for (v = -1; v <= 1; v += 2) { u = -(w2 * v + b) / w1; if (u > -1 && u < 1) out.push([X((u + 1) * 5), Y((v + 1) * 5)]); } }
          return out.slice(0, 2);
        }
        function chartWords() {
          var f = 0, v = 0;
          examples.forEach(function (e) { if (e.label) f++; else v++; });
          var s = N() + '’s chart: sweetness goes across, juiciness goes up. ' + f + ' fruit dots and ' + v + ' veg dots.';
          if (examples.length > 1 && hasBoth()) {
            var side = (neuron.w1 >= 0 ? 'sweeter' : 'less sweet') + (Math.abs(neuron.w2) > Math.abs(neuron.w1) * 0.3 ? (neuron.w2 >= 0 ? ' and juicier' : ' and less juicy') : '');
            s += ' A line splits them: ' + N() + ' calls ' + side + ' snacks fruit. It sorts ' + Math.round(poolAccuracy() * 20) + ' of the 20 kinds of snack correctly.';
          }
          return s;
        }
        function drawChart(now) {
          if (!cc) return;
          if (chartDirty) { renderChart(); chartDirty = false; }
          cc.clearRect(0, 0, CW, CH);
          cc.drawImage(chartBg, 0, 0, CW, CH);
          /* where the snack being scanned would land on the chart */
          if (cur && cur.readout > 0.5 && cur.st !== 'toss' && cur.st !== 'landed') {
            var x = X(cur.it.sweet), y = Y(cur.it.juicy), pulse = RM ? 0 : Math.sin(now / 160) * 2;
            cc.strokeStyle = C.cyan; cc.lineWidth = 2.5; cc.setLineDash([4, 3]);
            cc.beginPath(); cc.arc(x, y, 13 + pulse, 0, TAU); cc.stroke(); cc.setLineDash([]);
            cc.fillStyle = C.cyan; cc.font = F13; cc.textAlign = 'center'; cc.fillText('?', x, y + 5);
          }
        }

        function frame(dt, now) {
          A.update(dt);
          if (trainLeft > 0) {
            var n = Math.min(trainLeft, 18);
            neuron.train(trainData, n, TRAIN.rate, TRAIN.l2);
            trainLeft -= n; chartDirty = true;
          }
          step(dt);
          drawScene(now);
          drawChart(now);
        }
        function onKey(e) {
          var k = e.key;
          if (cur && cur.st === 'ask') {
            if (k === 'ArrowLeft' || k === 'f' || k === 'F') { e.preventDefault(); label(1); }
            else if (k === 'ArrowRight' || k === 'v' || k === 'V') { e.preventDefault(); label(0); }
          }
        }

        drawHist();
        el.setAttribute('data-examples', String(examples.length));
        el.setAttribute('data-tests', tests.join(','));
        el.setAttribute('data-pool', poolAccuracy().toFixed(2));
        return {
          el: el, heading: heading, lesson: 0,
          resize: layout,
          frame: frame,
          onKey: onKey,
          enter: function () {
            A.feel('neutral');
            if (!examples.length) {
              say(sayEl, 'Welcome to the canteen of 2035! Snacks come down this chute. I can measure how sweet and how juicy they are, but I don’t know what fruit and veg are. Tell me, and I’ll learn!');
              api.status('Snack Sorter · teach ' + N() + ' which snacks are fruit and which are veg');
              chirp('hello');
              firstRound();
            } else {
              showReady();
              if (hasBoth()) say(sayEl, 'Welcome back! I remember ' + examples.length + ' snacks you taught me. Shall I take a test, or will you teach me more?');
              if (tests.length >= 2) qHost.appendChild(questionCard(0, A));
            }
          }
        };
      }

      /* =================================================================================================
         LESSON 2: DOODLE DETECTIVE. You draw signs on a 16 by 16 grid; Pip builds memory pictures and guesses.
         ================================================================================================= */
      function lessonSee() {
        var S = save.l2;
        var coach = new PipBox('rs-coach-pip', N() + ' the robot, watching the drawing grid.', 104, 112);
        var A = coach.actor;
        var brain = new SeeBrain(3);
        var stored = [];            // [cls, hex] for saving
        S.ex.forEach(function (e) { if (brain.add(e[0], hexToBits(e[1]))) stored.push(e); });
        var bits = new Uint8Array(GRID * GRID);
        var mode = 'teach', cls = 0, eraser = false, showNums = false;
        var busy = false, scanT = -1, result = null, shownConf = [0, 0, 0];
        var quiz = null;            // { order, at, right, marks, state }
        var cursor = { x: 7, y: 7, show: false };
        var drawing = false, paintVal = 1, lastCell = -1, padDirty = true;
        var pc = null, PW = 320, cell = 20;

        /* ----- the page ----- */
        var heading = h('h3', { class: 'rs-h', tabindex: '-1' }, 'Doodle Detective');
        var sayEl = h('p', { class: 'rs-say rs-say--left', 'aria-live': 'polite' });
        var pad = h('canvas', { class: 'rs-pad', tabindex: '0', role: 'img', 'aria-label': '' });
        var clearBtn = h('button', { class: 'btn', type: 'button', onclick: function () { clearPad(true); pad.focus(); } }, 'Clear');
        var eraserBtn = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { eraser = !eraser; eraserBtn.setAttribute('aria-pressed', String(eraser)); sfx('click'); } }, 'Eraser');
        var numsBtn = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { showNums = !showNums; numsBtn.setAttribute('aria-pressed', String(showNums)); padDirty = true; sfx('click'); if (showNums) say(sayEl, 'This is all I see: 256 numbers. 1 means coloured in, 0 means empty. No picture, just numbers!'); } }, 'Show what ' + N() + ' sees');
        var padTools = h('div', { class: 'rs-row', style: { justifyContent: 'center' } }, clearBtn, h('div', { class: 'rs-toggles' }, eraserBtn, numsBtn));

        var modeBtns = [], MODES = [['teach', 'Teach'], ['quiz', 'Test ' + N()], ['free', 'Free draw']];
        var modeRow = h('div', { class: 'rs-toggles', role: 'group', 'aria-label': 'What to do' }, MODES.map(function (m) {
          var b = h('button', { type: 'button', 'aria-pressed': String(m[0] === mode), onclick: function () { setMode(m[0], true); } }, m[1]);
          modeBtns.push(b); return b;
        }));
        var signBtns = [];
        var signRow = h('div', { class: 'rs-toggles', role: 'group', 'aria-label': 'Which sign to teach' }, SIGNS.map(function (sg, i) {
          var b = h('button', { type: 'button', 'aria-pressed': String(i === cls), onclick: function () { pickSign(i); } }, svgIcon(sg.id), cap(sg.name));
          signBtns.push(b); return b;
        }));
        var teachBtn = h('button', { class: 'btn btn-primary rs-big', type: 'button', onclick: teach }, '');
        var helpBtn = h('button', { class: 'btn', type: 'button', onclick: drawForMe }, 'Draw one for me');
        var memCanvases = [], memLabels = [];
        var mems = h('div', { class: 'rs-mems' }, SIGNS.map(function (sg, i) {
          var cv = h('canvas', { role: 'img', 'aria-label': '' }); memCanvases.push(cv);
          var lab = h('span'); memLabels.push(lab);
          return h('div', { class: 'rs-mem' }, cv, h('strong', null, cap(sg.name)), lab);
        }));
        var teachPanel = h('div', null,
          h('p', { class: 'rs-label' }, '1. Pick a sign'), signRow,
          h('p', { class: 'rs-label', style: { marginTop: '.7rem' } }, '2. Draw it on the grid, then teach ' + N()),
          h('div', { class: 'rs-row', style: { marginTop: '.4rem' } }, teachBtn, helpBtn),
          h('p', { class: 'rs-note', style: { marginTop: '.5rem' } }, 'Tip: teach each sign a few times, in different sizes and styles.'));

        var secretIcon = h('span'), secretWord = h('strong'), dots = h('div', { class: 'rs-dots', 'aria-hidden': 'true' });
        var secret = h('div', { class: 'rs-secret' }, secretIcon, h('div', null, h('span', null, 'Draw '), secretWord, h('br'), h('span', { class: 'rs-note' }, N() + ' can’t see this card. It only sees the grid.')));
        var lookBtn = h('button', { class: 'btn btn-primary rs-big', type: 'button', onclick: look }, 'Show ' + N());
        var nextBtn = h('button', { class: 'btn btn-primary rs-big', type: 'button', onclick: nextRound }, 'Next drawing');
        var fixBtn = h('button', { class: 'btn', type: 'button', onclick: teachFromMistake }, 'Teach ' + N() + ' with this drawing');
        var quizRow = h('div', { class: 'rs-row' });
        var quizPanel = h('div', null, secret, h('p', { class: 'rs-label', style: { marginTop: '.6rem' } }, 'Round'), dots, quizRow);
        var freePanel = h('div', null, h('p', { class: 'rs-note' }, 'Draw anything at all: a sign, a smiley face, a house. What will ' + N() + ' think it is?'), h('div', { class: 'rs-row', style: { marginTop: '.5rem' } }, lookBtn));

        var barFills = [], barPcts = [];
        var bars = h('div', { class: 'rs-bars', role: 'group', 'aria-label': N() + '’s confidence' }, SIGNS.map(function (sg, i) {
          var fill = h('div', { class: 'rs-fill', style: { background: 'var(--rs-' + sg.colour + ')' } }); barFills.push(fill);
          var pctEl = h('span', { class: 'rs-pct' }, '0%'); barPcts.push(pctEl);
          return h('div', { class: 'rs-barrow' }, h('span', null, svgIcon(sg.id), cap(sg.name)), h('div', { class: 'rs-track' }, fill), pctEl);
        }));
        var barsWrap = h('div', null, h('p', { class: 'rs-label' }, 'How sure ' + N() + ' is'), bars);
        var sidePanel = h('div', { class: 'rs-panel' }, modeRow, teachPanel, quizPanel, freePanel, barsWrap,
          h('p', { class: 'rs-label' }, N() + '’s memory pictures (the average of your drawings)'), mems);
        var qHost = h('div');
        var restartBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: restart }, 'Forget all my drawings');
        var el = h('div', { class: 'rs-lesson rs-l2' },
          heading,
          h('div', { class: 'rs-coach', style: { marginTop: '.5rem' } }, coach.canvas, sayEl),
          h('div', { class: 'rs-two rs-two--even' }, h('div', { class: 'rs-panel' }, pad, padTools), sidePanel),
          qHost,
          howBox([
            N() + ' sees your drawing as 16 rows of 16 squares: 256 numbers, each one 1 (coloured in) or 0 (empty). That is all. Press “Show what ' + N() + ' sees” to see them.',
            'First ' + N() + ' tidies each drawing: it crops it, stretches it to the same size, and smudges it a little so a line one square to the side still overlaps. Then it adds it to its memory picture for that sign: the average of every drawing of it you have taught.',
            'To guess, ' + N() + ' compares a new drawing with each memory picture, square by square, and picks the most alike. The bars show how sure it is. If you only teach small stars, it may not know a big one, so teach lots of different examples.',
            'A drawing of something new, like a cat, still gets a guess: ' + N() + ' can only choose from the signs it knows. Real robots can be confidently wrong too.'
          ]),
          h('div', { class: 'rs-row', style: { marginTop: '.4rem' } }, restartBtn));

        function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
        function a(i) { return (i === 2 ? 'an ' : 'a ') + SIGNS[i].name; }
        function inked() { var n = 0; for (var i = 0; i < bits.length; i++) n += bits[i]; return n; }
        function setData() {
          /* the pad holds the page still only while you can draw on it */
          pad.classList.toggle('is-locked', busy || (mode === 'quiz' && !!quiz && quiz.state !== 'draw'));
          el.setAttribute('data-mode', mode);
          el.setAttribute('data-counts', brain.count.join(','));
          el.setAttribute('data-quiz', quiz ? quiz.marks.join('') : '');
          el.setAttribute('data-guess', result ? String(result.guess) : '');
          el.setAttribute('data-target', quiz && quiz.at < quiz.order.length ? String(quiz.order[quiz.at]) : '');
        }
        function store() { S.ex = stored.slice(-60); persist(); }

        /* ----- the drawing grid ----- */
        function cellAt(e) {
          var r = pad.getBoundingClientRect();
          var x = Math.floor((e.clientX - r.left) / r.width * GRID), y = Math.floor((e.clientY - r.top) / r.height * GRID);
          return clamp(x, 0, GRID - 1) + clamp(y, 0, GRID - 1) * GRID;
        }
        function paintLine(from, to) {
          /* colour every square on the straight line between two squares, so fast strokes have no gaps */
          var x0 = from % GRID, y0 = Math.floor(from / GRID), x1 = to % GRID, y1 = Math.floor(to / GRID);
          var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
          for (var k = 0; k <= n; k++) bits[Math.round(y0 + (y1 - y0) * k / n) * GRID + Math.round(x0 + (x1 - x0) * k / n)] = paintVal;
          padDirty = true;
        }
        /* Drawing again clears Pip's last guess (but not during a test round that is waiting for Next). */
        function startedDrawing() {
          if (mode === 'quiz' && quiz && quiz.state !== 'draw') return false;
          if (result) { result = null; setBars(null); }
          return true;
        }
        pad.addEventListener('pointerdown', function (e) {
          if (busy || (mode === 'quiz' && quiz && quiz.state !== 'draw')) return;
          api.unlockSound();
          e.preventDefault();
          if (!startedDrawing()) return;
          try { pad.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
          drawing = true; paintVal = (eraser || e.button === 2) ? 0 : 1;
          lastCell = cellAt(e); paintLine(lastCell, lastCell);
          cursor.show = false;
          if (paintVal) sfx('chalk');
        });
        pad.addEventListener('pointermove', function (e) {
          if (!drawing) return;
          var c2 = cellAt(e);
          if (c2 !== lastCell) { paintLine(lastCell, c2); lastCell = c2; }
        });
        function endStroke() { if (!drawing) return; drawing = false; drawn(); }
        pad.addEventListener('pointerup', endStroke);
        pad.addEventListener('pointercancel', endStroke);
        pad.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        pad.addEventListener('focus', function () { cursor.show = true; padDirty = true; });
        pad.addEventListener('blur', function () { cursor.show = false; padDirty = true; });
        function drawn() {
          padDirty = true;
          pad.setAttribute('aria-label', padWords());
          if (mode === 'teach') api.status('Doodle Detective · drawing ' + a(cls) + ': ' + inked() + ' squares coloured in. Teach ' + N() + ' when you are happy with it');
        }
        function padWords() { return 'Drawing grid, 16 by 16 squares, ' + inked() + ' coloured in. Arrow keys move the cursor, Space colours or clears a square, Shift and an arrow key draws a line.'; }
        function clearPad(user) {
          if (busy) return;
          if (mode === 'quiz' && quiz && quiz.state === 'shown') return;
          bits = new Uint8Array(GRID * GRID); result = null; setBars(null); padDirty = true;
          pad.setAttribute('aria-label', padWords());
          if (user) sfx('whoosh');
          setData();
        }
        function drawPad(now) {
          var c = pc;
          if (!c) return;
          c.fillStyle = '#070b1a'; c.fillRect(0, 0, PW, PW);
          var i, x, y;
          c.strokeStyle = 'rgba(234,242,255,.07)'; c.lineWidth = 1;
          for (i = 1; i < GRID; i++) { var p = Math.round(i * cell) + 0.5; c.beginPath(); c.moveTo(p, 0); c.lineTo(p, PW); c.moveTo(0, p); c.lineTo(PW, p); c.stroke(); }
          var scanRow = scanT >= 0 ? scanT * GRID : -9;
          for (y = 0; y < GRID; y++) for (x = 0; x < GRID; x++) {
            if (!bits[y * GRID + x]) continue;
            var lit = Math.abs(y - scanRow) < 1.5;
            c.fillStyle = lit ? C.sun : C.cyan;
            c.fillRect(x * cell + 1.5, y * cell + 1.5, cell - 3, cell - 3);
          }
          if (scanT >= 0) {
            var sy = scanT * PW;
            c.fillStyle = rgba(C.mint, 0.25); c.fillRect(0, sy - cell, PW, cell);
            c.fillStyle = C.mint; c.fillRect(0, sy - 1.5, PW, 3);
          }
          if (showNums) {
            c.font = '600 ' + Math.max(8, Math.round(cell * 0.45)) + 'px ' + FONT.mono; c.textAlign = 'center'; c.textBaseline = 'middle';
            for (y = 0; y < GRID; y++) for (x = 0; x < GRID; x++) {
              var on = bits[y * GRID + x];
              c.fillStyle = on ? '#04101a' : 'rgba(234,242,255,.32)';
              c.fillText(on ? '1' : '0', x * cell + cell / 2, y * cell + cell / 2 + 1);
            }
            c.textBaseline = 'alphabetic';
          }
          if (cursor.show) {
            c.strokeStyle = C.sun; c.lineWidth = 2.5;
            c.strokeRect(cursor.x * cell + 1.5, cursor.y * cell + 1.5, cell - 3, cell - 3);
          }
          if (!inked() && !showNums && scanT < 0) {
            c.fillStyle = 'rgba(234,242,255,.35)'; c.font = '600 ' + Math.round(clamp(PW / 18, 13, 18)) + 'px ' + FONT.head; c.textAlign = 'center';
            c.fillText(mode === 'teach' ? 'Draw ' + a(cls) + ' here' : mode === 'quiz' ? 'Draw here' : 'Draw anything here', PW / 2, PW / 2);
          }
        }

        /* ----- memory pictures and confidence bars ----- */
        function drawMems() {
          for (var k = 0; k < 3; k++) {
            var cv = memCanvases[k], w = Math.max(48, Math.min(84, cv.clientWidth || 72)), c = fit(cv, w, w), m = brain.memory[k];
            c.fillStyle = '#070b1a'; c.fillRect(0, 0, w, w);
            var col = C[SIGNS[k].colour];
            if (!m) {
              c.strokeStyle = 'rgba(234,242,255,.3)'; c.setLineDash([4, 4]); c.strokeRect(4.5, 4.5, w - 9, w - 9); c.setLineDash([]);
              c.fillStyle = 'rgba(234,242,255,.4)'; c.font = '800 ' + Math.round(w / 3) + 'px ' + FONT.head; c.textAlign = 'center'; c.fillText('?', w / 2, w / 2 + w / 9);
            } else {
              var max = 0, i; for (i = 0; i < m.length; i++) if (m[i] > max) max = m[i];
              var cs = w / SEE;
              for (i = 0; i < m.length; i++) {
                var v = max ? m[i] / max : 0;
                if (v < 0.04) continue;
                c.fillStyle = rgba(col, Math.round(v * 20) / 20);
                c.fillRect((i % SEE) * cs, Math.floor(i / SEE) * cs, Math.ceil(cs), Math.ceil(cs));
              }
            }
            var n = brain.count[k];
            memLabels[k].textContent = n ? n + ' drawing' + (n === 1 ? '' : 's') : 'not taught yet';
            cv.setAttribute('aria-label', 'Memory picture of ' + a(k) + ': ' + (n ? 'the average of ' + n + ' drawing' + (n === 1 ? '' : 's') : 'empty, not taught yet'));
          }
        }
        function setBars(conf) {
          for (var k = 0; k < 3; k++) {
            var v = conf ? conf[k] : 0;
            barPcts[k].textContent = conf ? Math.round(v * 100) + '%' : '·';
            if (RM || !conf) { shownConf[k] = v; barFills[k].style.width = (v * 100).toFixed(1) + '%'; }
          }
          bars.setAttribute('aria-label', conf ? N() + '’s confidence: ' + SIGNS.map(function (sg, i) { return sg.name + ' ' + Math.round(conf[i] * 100) + '%'; }).join(', ') : N() + '’s confidence: no guess yet');
        }

        /* ----- teaching ----- */
        function pickSign(i) {
          cls = i; sfx('click');
          signBtns.forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === i)); });
          teachBtn.textContent = 'Teach ' + N() + ': this is ' + a(i);
          padDirty = true;
          api.status('Doodle Detective · draw ' + a(i) + ', then teach ' + N());
        }
        function teach() {
          if (busy) return;
          api.unlockSound();
          if (!inked()) { A.flash('confused', 1400); say(sayEl, 'The grid is empty! Draw ' + a(cls) + ' first.'); return; }
          var before = brain.count[cls];
          if (!brain.add(cls, bits)) return;
          stored.push([cls, bitsToHex(bits)]);
          if (stored.length > 60) stored.shift();
          store();
          sfx('pop');
          drawMems();
          var total = brain.count[0] + brain.count[1] + brain.count[2];
          if (before === 0) { A.aha(); say(sayEl, 'So that’s ' + a(cls) + '! It’s my first ' + SIGNS[cls].name + ', so my memory picture of it is just your drawing.'); }
          else { A.flash('happy', 1500); chirp('happy'); say(sayEl, 'Got it! My memory of ' + a(cls) + ' is now the average of ' + brain.count[cls] + ' drawings. Look how it changed.'); }
          if (brain.ready() && total >= 3 && total <= 4) say(sayEl, sayEl.textContent + ' I know all three signs now. Press “Test ' + N() + '” when you’re ready, or teach me more first.');
          modeBtns[1].disabled = !brain.ready();
          clearPad(false);
          setData();
        }
        function drawForMe() {
          if (busy) return;
          sfx('chalk');
          bits = sampleDrawing(cls, rnd); result = null; setBars(null); padDirty = true;
          pad.setAttribute('aria-label', padWords());
          say(sayEl, 'Here’s a wobbly ' + SIGNS[cls].name + ' I made. Change it if you like, then teach me. Your own drawings help me most!');
        }

        /* ----- looking: Pip scans the grid, then guesses ----- */
        function look() {
          if (busy) return;
          api.unlockSound();
          if (!inked()) { A.flash('confused', 1400); say(sayEl, 'I can’t see anything. Draw something first!'); return; }
          if (!brain.ready()) { say(sayEl, 'Teach me all three signs first!'); return; }
          busy = true; scanT = 0; A.feel('thinking'); A.chest = 'bars'; chirp('scan'); setData();
          setBars(null);
          lookBtn.disabled = true;
          api.status('Doodle Detective · ' + N() + ' is looking at your drawing');
        }
        function lookDone() {
          busy = false; scanT = -1; padDirty = true; A.chest = 'dot'; A.feel('neutral');
          lookBtn.disabled = false;
          result = brain.look(bits);
          setBars(result.conf);
          var g = result.guess, sure = Math.round(result.conf[g] * 100) + '%';
          if (mode === 'quiz') {
            var target = quiz.order[quiz.at], right = g === target;
            quiz.state = 'shown';
            quiz.marks.push(right ? 1 : 0);
            if (right) {
              quiz.right++; sfx('coin'); act(g);
              say(sayEl, 'It’s ' + a(g) + '! I’m ' + sure + ' sure.' + (result.known ? '' : ' It didn’t look much like my memory picture, though.'));
              quizRow.replaceChildren(nextBtn);
            } else {
              sfx('wrong'); A.flash('confused', 2000); chirp('oops');
              say(sayEl, 'I thought it was ' + a(g) + ' (' + sure + ' sure). Was it ' + a(target) + '? Oops! Teach me with this drawing and I’ll learn from my mistake.');
              quizRow.replaceChildren(nextBtn, fixBtn);
              fixBtn.disabled = false;
            }
            nextBtn.textContent = quiz.at + 1 >= quiz.order.length ? 'See my score' : 'Next drawing';
            drawDots();
            api.status('Doodle Detective · round ' + (quiz.at + 1) + ' of 6: ' + N() + ' guessed ' + a(g) + (right ? ', right!' : ', wrong'));
          } else {
            if (!result.known) {
              A.flash('confused', 2200); chirp('think');
              say(sayEl, 'Hmm. That doesn’t look much like any sign I know. My best guess is ' + a(g) + ' (' + sure + ' sure), but I only know the three signs you taught me.');
            } else { act(g); say(sayEl, 'That’s ' + a(g) + '! I’m ' + sure + ' sure.'); }
            api.status('Doodle Detective · ' + N() + ' thinks it is ' + a(g) + ', ' + sure + ' sure');
          }
          setData();
        }
        /* Pip acts out each sign: sparkles for a star, hearts for a heart, a zoom for an arrow. */
        var zoomT = -1;
        function act(g) {
          A.look = [0, 0];
          if (g === 0) { A.sparkle = 1; A.flash('confident', 1600); A.pose('cheer', 1200); chirp('aha'); }
          else if (g === 1) { A.hearts = 1; A.flash('love', 1800); A.chest = 'heart'; after(1800, function () { A.chest = 'dot'; }); chirp('happy'); }
          else { A.flash('happy', 1400); A.pose('right', 1000); if (!RM) zoomT = 0; chirp('happy'); }
        }

        /* ----- the test: six secret signs ----- */
        function setMode(m, user) {
          if (busy) return;
          if (m === 'quiz' && !brain.ready()) { A.flash('confused', 1500); say(sayEl, 'Teach me all three signs first, then test me!'); return; }
          mode = m;
          if (user) sfx('click');
          modeBtns.forEach(function (b, k) { b.setAttribute('aria-pressed', String(MODES[k][0] === m)); });
          teachPanel.hidden = m !== 'teach'; quizPanel.hidden = m !== 'quiz'; freePanel.hidden = m !== 'free';
          helpBtn.hidden = m !== 'teach';
          clearPad(false);
          if (m === 'teach') {
            say(sayEl, brain.ready() ? 'Teach me more! Different sizes and styles help most.' : 'Pick a sign, draw it on the grid, and teach me. I need all three: a star, a heart and an arrow.');
            api.status('Doodle Detective · draw ' + a(cls) + ', then teach ' + N());
          } else if (m === 'quiz') startQuiz();
          else { say(sayEl, 'Draw anything you like, and I’ll tell you what I think it is.'); api.status('Doodle Detective · free draw: draw anything, then show ' + N()); freePanel.lastChild.appendChild(lookBtn); }
          setData();
        }
        function startQuiz() {
          quiz = { order: shuffle([0, 0, 1, 1, 2, 2], rnd), at: 0, right: 0, marks: [], state: 'draw' };
          say(sayEl, 'Test time! The card says which sign to draw. I can’t see the card, only your drawing. Six rounds!');
          showRound();
        }
        function showRound() {
          var t = quiz.order[quiz.at];
          quiz.state = 'draw';
          clearPad(false);
          secretIcon.replaceChildren(svgIcon(SIGNS[t].id));
          secretWord.textContent = a(t);
          quizRow.replaceChildren(lookBtn);
          drawDots();
          api.status('Doodle Detective · round ' + (quiz.at + 1) + ' of 6: draw ' + a(t) + ', then show ' + N());
          setData();
        }
        function drawDots() {
          dots.replaceChildren();
          for (var i = 0; i < quiz.order.length; i++) {
            var m = quiz.marks[i];
            dots.appendChild(h('span', { class: m === 1 ? 'yes' : m === 0 ? 'no' : i === quiz.at ? 'now' : '' }, m === 1 ? '✓' : m === 0 ? '✕' : ''));
          }
        }
        function teachFromMistake() {
          var t = quiz.order[quiz.at];
          if (brain.add(t, bits)) { stored.push([t, bitsToHex(bits)]); store(); }
          fixBtn.disabled = true;
          drawMems(); A.aha(); sfx('pop');
          say(sayEl, 'Thanks! Now I know that one was ' + a(t) + '. My memory picture of ' + a(t) + ' just got better.');
          setData();
        }
        function nextRound() {
          if (!quiz) return;
          sfx('click');
          quiz.at++;
          if (quiz.at < quiz.order.length) { showRound(); return; }
          var score = quiz.right, stars = score === 6 ? 3 : score >= 4 ? 2 : 1;
          var newStars = award(1, stars);
          var newBest = score > S.best;
          if (newBest) { S.best = score; persist(); }
          quiz.state = 'done';
          quizRow.replaceChildren(h('button', { class: 'btn btn-primary rs-big', type: 'button', onclick: function () { startQuiz(); } }, 'Test me again'),
            h('button', { class: 'btn', type: 'button', onclick: function () { setMode('teach', true); } }, 'Teach me more'));
          secretIcon.replaceChildren(); secretWord.textContent = 'nothing: the test is over';
          A.feel(score >= 4 ? 'happy' : 'neutral');
          if (score === 6) { A.aha(); say(sayEl, 'Six out of six! I can read your signs perfectly now.'); }
          else if (score >= 4) { A.flash('happy', 1600); chirp('happy'); say(sayEl, score + ' out of 6! Not bad. The ones I got wrong would make great extra examples.'); }
          else { A.flash('sad', 2000); chirp('sad'); say(sayEl, score + ' out of 6. I need more practice. Teach me more drawings, in lots of different styles!'); }
          sfx(score >= 4 ? 'bell' : 'pop');
          if (newStars && stars === 3) api.celebrate(N() + ' read every sign!');
          api.status('Doodle Detective · ' + N() + ' got ' + score + ' out of 6 right');
          if (!qHost.firstChild) qHost.appendChild(questionCard(1, A));
          setData();
        }
        function restart() {
          if (busy) return;
          sfx('click');
          brain = new SeeBrain(3); stored = []; store(); quiz = null;
          drawMems(); qHost.replaceChildren();
          showCab();
          modeBtns[1].disabled = true;
          setMode('teach', false);
          A.flash('surprised', 1000);
          say(sayEl, 'All my drawings are gone. My memory pictures are empty again. Teach me from the start!');
        }

        function frame(dt, now) {
          if (scanT >= 0) {
            scanT += dt / (RM ? 250 : 900);
            padDirty = true;
            if (scanT >= 1) lookDone();
          }
          if (zoomT >= 0) {
            zoomT += dt / 900;
            A.dx = zoomT < 1 ? Math.sin(zoomT * Math.PI) * 0.55 : 0;
            if (zoomT >= 1) { zoomT = -1; A.dx = 0; }
          }
          if (!RM && result) {
            for (var k = 0; k < 3; k++) {
              var target = result.conf[k];
              if (Math.abs(shownConf[k] - target) > 0.002) { shownConf[k] += (target - shownConf[k]) * Math.min(1, dt / 90); barFills[k].style.width = (shownConf[k] * 100).toFixed(1) + '%'; }
            }
          }
          coach.draw(dt, now);
          if (padDirty) { padDirty = false; drawPad(now); }
        }
        function onKey(e) {
          if (e.target !== pad) return;
          var k = e.key, mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
          if (mv) {
            e.preventDefault();
            cursor.show = true;
            if (e.shiftKey && !startedDrawing()) return;
            cursor.x = clamp(cursor.x + mv[0], 0, GRID - 1); cursor.y = clamp(cursor.y + mv[1], 0, GRID - 1);
            if (e.shiftKey && !busy) { bits[cursor.y * GRID + cursor.x] = eraser ? 0 : 1; drawn(); }
            padDirty = true;
          } else if (k === ' ' || k === 'Spacebar') {
            e.preventDefault();
            if (busy || (mode === 'quiz' && quiz && quiz.state !== 'draw') || !startedDrawing()) return;
            var i = cursor.y * GRID + cursor.x;
            bits[i] = bits[i] ? 0 : 1; cursor.show = true; drawn(); sfx('chalk');
          } else if (k === 'Enter') {
            e.preventDefault();
            if (mode === 'teach') teach(); else if (!quiz || quiz.state === 'draw' || mode === 'free') look();
          }
        }
        function layout() {
          PW = Math.max(200, Math.min(420, pad.clientWidth || 320));
          pc = fit(pad, PW, PW);
          cell = PW / GRID;
          coach.resize(); drawMems();
          padDirty = true;
        }

        teachBtn.textContent = 'Teach ' + N() + ': this is ' + a(cls);
        modeBtns[1].disabled = !brain.ready();
        quizPanel.hidden = true; freePanel.hidden = true;
        pad.setAttribute('aria-label', padWords());
        setBars(null);
        setData();
        return {
          el: el, heading: heading, lesson: 1,
          resize: layout, frame: frame, onKey: onKey,
          enter: function () {
            var total = brain.count[0] + brain.count[1] + brain.count[2];
            if (!total) { say(sayEl, 'I’m going to learn to see! Teach me three signs: a star, a heart and an arrow. Pick one, draw it on the grid, and teach me.'); chirp('hello'); }
            else say(sayEl, 'Welcome back! I remember ' + total + ' of your drawings. Teach me more, or test me!');
            A.feel('neutral'); A.look = [-0.6, 0.3];
            api.status('Doodle Detective · draw ' + a(cls) + ', then teach ' + N());
            if (S.best >= 0 && !qHost.firstChild) qHost.appendChild(questionCard(1, A));
          }
        };
      }

      /* =================================================================================================
         LESSON 3: MAZE RUNNER. Pip learns the way to the charger by trial and error (Q-learning).
         ================================================================================================= */
      var HEAT = [];
      function heatColours() {
        /* 21 glow colours from dim violet (a little good) through cyan to bright mint (very good) */
        if (HEAT.length) return;
        var a = [167, 139, 250], b = [94, 242, 255], m = [94, 255, 161];
        for (var k = 0; k <= 20; k++) {
          var v = k / 20, from = v < 0.5 ? a : b, to = v < 0.5 ? b : m, t = v < 0.5 ? v * 2 : (v - 0.5) * 2;
          HEAT.push('rgba(' + Math.round(lerp(from[0], to[0], t)) + ',' + Math.round(lerp(from[1], to[1], t)) + ',' + Math.round(lerp(from[2], to[2], t)) + ',' + (0.14 + v * 0.56).toFixed(2) + ')');
        }
      }
      function lessonMaze() {
        var S = save.l3;
        heatColours();
        var coach = new PipBox('rs-coach-pip', N() + ' the robot, ready to explore the maze.', 104, 112);
        var A = coach.actor;
        var level = 0;
        for (var k0 = 0; k0 < 3; k0++) if (!S.done[k0]) { level = k0; break; }
        var maze, learner, dryBest = 0;
        var curiosity = 0.15, speed = 'run', tool = 'look', showHeat = true, showArrows = true;
        var training = false, showing = false, stepAcc = 0, showSteps = 0, showCap = 0;
        var agent = { from: 0, to: 0, t: 1 }, trail = [], exploredAt = -9999, hinted = false, triesEnded = 0, foundOnce = false;
        var cursor = -1, clearTrail = false;
        var mc = null, MW = 320, cs = 40, stc = null, STW = 300, STH = 130, stepsDirty = true;

        /* ----- the page ----- */
        var heading = h('h3', { class: 'rs-h', tabindex: '-1' }, 'Maze Runner');
        var sayEl = h('p', { class: 'rs-say rs-say--left', 'aria-live': 'polite' });
        var mazeCv = h('canvas', { class: 'rs-maze', tabindex: '0', role: 'img', 'aria-label': '' });
        var stepsCv = h('canvas', { class: 'rs-steps', role: 'img', 'aria-label': '' });
        var levelBtns = [];
        var levelRow = h('div', { class: 'rs-toggles', role: 'group', 'aria-label': 'Which maze' }, MAZES.map(function (m, i) {
          var b = h('button', { type: 'button', 'aria-pressed': String(i === level), onclick: function () { if (i !== level) { sfx('click'); setLevel(i, true); } } }, m.name);
          levelBtns.push(b); return b;
        }));
        var trainBtn = h('button', { class: 'btn btn-primary rs-big', type: 'button', onclick: function () { toggleTrain(); } }, '');
        var showBtn = h('button', { class: 'btn rs-big', type: 'button', onclick: showMe }, 'Show me what you learned');
        var speedBtns = [], SPEEDS = [['walk', 'Walk'], ['run', 'Run'], ['zoom', 'Zoom']];
        var speedRow = h('div', { class: 'rs-toggles', role: 'group', 'aria-label': 'Speed' }, SPEEDS.map(function (sp) {
          var b = h('button', { type: 'button', 'aria-pressed': String(sp[0] === speed), onclick: function () { speed = sp[0]; sfx('click'); speedBtns.forEach(function (x, i) { x.setAttribute('aria-pressed', String(SPEEDS[i][0] === speed)); }); } }, sp[1]);
          speedBtns.push(b); return b;
        }));
        var curOut = h('span');
        var curIn = h('input', { type: 'range', min: '0', max: '60', step: '5', value: String(Math.round(curiosity * 100)), 'aria-label': 'Curiosity: the chance of a random move' });
        curIn.addEventListener('input', function () { curiosity = Number(curIn.value) / 100; curWords(); });
        var toolBtns = [], TOOLS = [['look', 'Look', 'look'], ['puddle', 'Puddle', 'puddle'], ['battery', 'Battery', 'battery'], ['wall', 'Wall', 'wall']];
        var toolRow = h('div', { class: 'rs-toggles', role: 'group', 'aria-label': 'Tap the maze to add or remove' }, TOOLS.map(function (t) {
          var b = h('button', { type: 'button', 'aria-pressed': String(t[0] === tool), onclick: function () { tool = t[0]; sfx('click'); toolBtns.forEach(function (x, i) { x.setAttribute('aria-pressed', String(TOOLS[i][0] === tool)); }); } }, svgIcon(t[2]), t[1]);
          toolBtns.push(b); return b;
        }));
        var heatBtn = h('button', { type: 'button', 'aria-pressed': 'true', onclick: function () { showHeat = !showHeat; heatBtn.setAttribute('aria-pressed', String(showHeat)); sfx('click'); } }, 'Glow');
        var arrowBtn = h('button', { type: 'button', 'aria-pressed': 'true', onclick: function () { showArrows = !showArrows; arrowBtn.setAttribute('aria-pressed', String(showArrows)); sfx('click'); } }, 'Arrows');
        var stTries = h('strong'), stLast = h('strong'), stBest = h('strong'), stShort = h('strong');
        var forgetBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { sfx('click'); forget(); say(sayEl, 'Whoosh! I forgot everything about this maze. Train me again!'); } }, 'Forget this maze');
        var qHost = h('div');
        var el = h('div', { class: 'rs-lesson rs-l3' },
          heading,
          h('div', { class: 'rs-coach', style: { marginTop: '.5rem' } }, coach.canvas, sayEl),
          h('div', { class: 'rs-two' },
            h('div', { class: 'rs-panel' }, levelRow, mazeCv,
              h('div', { class: 'rs-row rs-row--c' }, trainBtn, showBtn),
              h('p', { class: 'rs-note', style: { textAlign: 'center' } }, 'Glow: how good ' + N() + ' thinks each square is. Arrows: its best move from there.')),
            h('div', { class: 'rs-panel' },
              h('p', { class: 'rs-label' }, 'Speed'), speedRow,
              h('label', { class: 'rs-slider' }, curOut, curIn),
              h('p', { class: 'rs-label' }, 'Tap the maze to add or remove'), toolRow,
              h('p', { class: 'rs-label' }, 'Show'), h('div', { class: 'rs-toggles' }, heatBtn, arrowBtn),
              h('div', { class: 'rs-stats' }, h('span', null, 'Tries: ', stTries), h('span', null, 'Last try: ', stLast), h('span', null, 'Fastest: ', stBest), h('span', null, 'Shortest dry way: ', stShort)),
              h('p', { class: 'rs-label' }, 'Steps per try'), stepsCv,
              h('p', { class: 'rs-note' }, 'Try this: put a puddle on ' + N() + '’s favourite path, or a battery in a dead end, and keep training. Or set curiosity to 0 and see what happens.'),
              forgetBtn)),
          qHost,
          howBox([
            'Nobody gives ' + N() + ' a map. It keeps a table with a number for every square and every move: how good it thinks that move is. At first every number is 0, so it wanders at random.',
            'Reaching the charger gives a reward of 10. A battery gives 3, and a puddle gives a nasty −5. After every step, ' + N() + ' updates one number in its table: the move it just made is worth the reward it got, plus most of the value of the square it landed on.',
            'So the good feeling spreads backwards from the charger, one square at a time, try after try. That is the glow you can see. When every square glows, ' + N() + ' just follows the brightest way. This is called reinforcement learning, and this kind is Q-learning.',
            'Curiosity is the chance ' + N() + ' tries a random move instead of its best one. With none, it may never find a shortcut. With lots, it keeps wandering even when it knows the way. Real game characters and robots are trained like this, with millions of tries.'
          ]));

        function a3(n) { return n + ' step' + (n === 1 ? '' : 's'); }
        function curWords() {
          var p = Math.round(curiosity * 100);
          curOut.textContent = 'Curiosity: ' + p + '%' + (p ? ' (a random move about 1 time in ' + Math.round(100 / p) + ')' : ' (always does its best move)');
        }
        function setLevel(i, user) {
          level = i; stopAll();
          maze = new Maze(MAZES[i].rows);
          learner = new Learner(maze);
          levelBtns.forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === i)); b.textContent = MAZES[k].name + (S.done[k] ? ' ★' : ''); });
          forget(true);
          if (mc) layout();
          if (user) { say(sayEl, MAZES[i].name + '! A new maze, and I don’t know the way. Press Train and watch me learn.'); A.flash('surprised', 900); }
        }
        function forget(quiet) {
          stopAll();
          learner.reset();
          trail = []; agent = { from: maze.start, to: maze.start, t: 1 };
          hinted = false; triesEnded = 0; foundOnce = false; showBtn.classList.remove('rs-pulse');
          dryBest = maze.shortest(true);
          stats(); stepsDirty = true;
          if (!quiet) { A.flash('surprised', 900); }
          api.status('Maze Runner · ' + MAZES[level].name + ': press Train');
        }
        function stopAll() { training = false; showing = false; stepAcc = 0; setTrainLabel(); }
        function setTrainLabel() { trainBtn.replaceChildren(training ? '❚❚ Pause' : '▶ Train'); trainBtn.setAttribute('aria-pressed', String(training)); }
        function toggleTrain() {
          api.unlockSound(); sfx('click');
          if (showing) { showing = false; learner.begin(); }
          training = !training; setTrainLabel();
          if (training) { A.feel('neutral'); A.look = [0, 0]; if (!learner.tries) say(sayEl, 'Here I go! I have no idea where the charger is, so I’ll wander around until I bump into it.'); api.status('Maze Runner · training: try ' + (learner.tries + 1)); }
          else { say(sayEl, 'Paused. I have had ' + learner.tries + ' tries so far.'); api.status('Maze Runner · paused after ' + learner.tries + ' tries'); }
        }
        function stats() {
          var h2 = learner.history, reached = h2.filter(function (s) { return s > 0; });
          stTries.textContent = String(learner.tries);
          stLast.textContent = h2.length ? (h2[h2.length - 1] > 0 ? a3(h2[h2.length - 1]) : 'gave up') : '·';
          stBest.textContent = reached.length ? a3(Math.min.apply(null, reached)) : '·';
          stShort.textContent = dryBest > 0 ? a3(dryBest) : maze.shortest(false) > 0 ? 'none (puddles!)' : '·';
          el.setAttribute('data-level', String(level));
          el.setAttribute('data-tries', String(learner.tries));
          el.setAttribute('data-history', h2.join(','));
          el.setAttribute('data-shortest', String(dryBest));
          el.setAttribute('data-mastered', S.done.join(','));
          mazeCv.setAttribute('aria-label', mazeWords());
          stepsCv.setAttribute('aria-label', stepsWords());
        }
        function mazeWords() {
          var w = maze.w, pos = learner.pos;
          return MAZES[level].name + ', ' + maze.w + ' by ' + maze.h + ' squares. ' + N() + ' is at column ' + (pos % w + 1) + ', row ' + (Math.floor(pos / w) + 1) +
            '. The charger is at column ' + (maze.exit % w + 1) + ', row ' + (Math.floor(maze.exit / w) + 1) + '. ' + maze.puddle.filter(Boolean).length + ' puddles, ' + maze.battery.length + ' batteries. Arrow keys move the cursor and Space uses the tool.';
        }
        function stepsWords() {
          var h2 = learner.history;
          if (!h2.length) return 'Steps per try: no tries yet.';
          var first = h2.slice(0, 5).map(Math.abs), last = h2.slice(-5).map(Math.abs);
          var avg = function (l) { return Math.round(l.reduce(function (x, y) { return x + y; }, 0) / l.length); };
          return 'Steps per try: the first tries took about ' + avg(first) + ' steps, the latest about ' + avg(last) + '.';
        }

        /* ----- one step of Pip, while training or showing ----- */
        function doStep(learn) {
          if (clearTrail) { trail = []; clearTrail = false; }
          var r = learner.step(rnd, learn ? curiosity : 0, learn);
          agent = { from: r.from, to: r.to, t: 0 };
          trail.push(r.to); if (trail.length > 40) trail.shift();
          if (r.explored) exploredAt = T;
          var loud = speed !== 'zoom' || showing;
          if (r.event === 'puddle') { A.flash('wet', 1000); if (loud) note([220, 0.12]); }
          else if (r.event === 'battery') { A.flash('happy', 800); if (loud) note([1320, 0.08]); }
          else if (speed === 'walk' && loud) note([900 + (r.to % 7) * 40, 0.02]);
          if (r.done || r.out || (showing && learner.steps >= showCap)) endTry(learn, r);
        }
        function endTry(learn, r) {
          var res = learner.finish(learn);
          clearTrail = true;
          /* Pip stays on the charger for a moment before going back to the start (not in Zoom) */
          if (r.done && (speed !== 'zoom' || !learn)) { agent = { from: r.to, to: r.to, t: 1 }; stepAcc = -380; }
          else agent = { from: maze.start, to: maze.start, t: 1 };
          if (!learn) { showDone(res, r); return; }
          triesEnded++;
          if (res.reached && !foundOnce) {
            foundOnce = true; A.aha();
            say(sayEl, 'I found the charger after ' + a3(res.steps) + '! A good feeling now glows on the square I came from. Every try, it spreads back a little further.');
          } else if (res.reached && speed !== 'zoom') { A.flash('happy', 700); if (speed === 'walk') sfx('bell'); }
          else if (!res.reached && speed !== 'zoom') { A.flash('sleepy', 900); }
          if (!hinted && learner.tries >= 3) {
            if (knowsTheWay()) {
              /* Pip stops by itself to show off (press Train to keep going) */
              hinted = true; A.aha();
              training = false; setTrainLabel();
              say(sayEl, 'I think I know the way now! I’ve stopped training. Press “Show me what you learned” to see my best route.');
              showBtn.classList.add('rs-pulse');
            }
          }
          stats(); stepsDirty = true;
          api.status('Maze Runner · ' + learner.tries + ' tries. Last try: ' + (res.reached ? a3(res.steps) : 'ran out of battery after ' + a3(res.steps)));
        }
        /* Pip's quiet self-test: follow only its best moves from the start. It passes only if every square on
           the way already has a learned (positive) value, and the route would pass the Show me test. */
        function knowsTheWay() {
          learner.begin();
          var cap = Math.max(12, maze.shortest(false) * 3 + 6);
          while (!learner.done && learner.steps < cap) {
            if (learner.value(learner.state()) <= 0.001) { learner.finish(false); return false; }
            learner.step(constHalf, 0, false);
          }
          return mastered(maze, learner.finish(false));
        }
        function showMe() {
          api.unlockSound(); sfx('click');
          training = false; setTrainLabel();
          learner.begin(); trail = []; clearTrail = false;
          agent = { from: maze.start, to: maze.start, t: 1 };
          showing = true; stepAcc = -250;
          showCap = Math.max(12, (maze.shortest(false) || 10) * 3 + 6);
          A.feel('neutral');
          say(sayEl, learner.tries ? 'Watch! No curiosity this time: I’ll only take the move I think is best from every square.' : 'I haven’t learned anything yet, but here goes…');
          api.status('Maze Runner · ' + N() + ' is showing its best route');
        }
        function showDone(res, r) {
          showing = false;
          var ok = mastered(maze, res);
          if (ok) {
            var first = !S.done[level];
            S.done[level] = 1; persist();
            var n = S.done.filter(Boolean).length;
            var newStars = award(2, n);
            levelBtns[level].textContent = MAZES[level].name + ' ★';
            A.aha(); sfx('bell'); showBtn.classList.remove('rs-pulse');
            say(sayEl, 'I made it in ' + a3(res.steps) + (res.wet ? '' : ', and stayed dry') + '! ' + (dryBest > 0 ? 'The shortest dry way is ' + a3(dryBest) + '. ' : '') + (res.got ? 'I grabbed the battery you left me, too. ' : '') + (level < 2 && first ? 'Ready for ' + MAZES[level + 1].name + '?' : ''));
            if (first) {
              if (n === 3 && newStars) api.celebrate(N() + ' mastered every maze!');
              else api.celebrate(N() + ' mastered ' + MAZES[level].name + '!');
            }
            if (!qHost.firstChild) qHost.appendChild(questionCard(2, A));
            api.status('Maze Runner · ' + N() + ' found its way in ' + a3(res.steps) + '. ' + MAZES[level].name + ' mastered!');
          } else {
            A.flash('confused', 2000); chirp('oops');
            var why = !res.reached ? 'I got lost going round in circles. ' : res.wet ? 'I made it, but I splashed through a puddle on the way. ' : 'I made it in ' + a3(res.steps) + ', but there’s a shorter way. ';
            say(sayEl, why + 'Train me some more!');
            api.status('Maze Runner · not quite yet: train ' + N() + ' some more');
          }
          stats();
        }

        /* ----- changing the maze ----- */
        function useTool(i) {
          if (i < 0) return;
          api.unlockSound();
          var w = maze.w, where = 'column ' + (i % w + 1) + ', row ' + (Math.floor(i / w) + 1);
          if (tool === 'look') {
            if (maze.wall[i]) { say(sayEl, 'That’s a wall. I can’t go there.'); return; }
            var s = i + maze.n * learner.got, v = learner.value(s), b = learner.best(s, rnd);
            if (i === maze.exit) say(sayEl, 'That’s the charger! Reaching it is worth 10 to me.');
            else say(sayEl, 'At ' + where + ' my best move is ' + ['up', 'right', 'down', 'left'][b] + '. I think that square is worth ' + v.toFixed(1) + (v > 0.05 ? '.' : ', so I haven’t learned much about it yet.'));
            sfx('tick');
            return;
          }
          if (i === maze.start || i === maze.exit) { say(sayEl, 'Leave the start and the charger where they are!'); sfx('wrong'); return; }
          if (tool === 'wall') {
            maze.wall[i] = maze.wall[i] ? 0 : 1;
            if (maze.wall[i]) { maze.puddle[i] = 0; var bi = maze.battery.indexOf(i); if (bi >= 0) maze.battery.splice(bi, 1); }
            if (maze.shortest(false) < 0) { maze.wall[i] = 0; say(sayEl, 'If you put a wall there I can never reach the charger!'); sfx('wrong'); return; }
            if (learner.pos === i) { learner.begin(); agent = { from: maze.start, to: maze.start, t: 1 }; }
            say(sayEl, maze.wall[i] ? 'A new wall! My old memories might be wrong now, so I’ll have to learn again.' : 'You knocked down a wall! Will I find the new way?');
            sfx('thud');
          } else if (maze.wall[i]) { say(sayEl, 'That’s a wall. Choose the Wall tool to knock it down first.'); sfx('wrong'); return; }
          else if (tool === 'puddle') {
            maze.puddle[i] = maze.puddle[i] ? 0 : 1;
            if (maze.puddle[i]) { var bj = maze.battery.indexOf(i); if (bj >= 0) maze.battery.splice(bj, 1); }
            say(sayEl, maze.puddle[i] ? 'A puddle! Splashing in it gives me a bad feeling (−5). I’ll learn to go around.' : 'Puddle mopped up.');
            sfx(maze.puddle[i] ? 'pop' : 'whoosh');
          } else if (tool === 'battery') {
            var bk = maze.battery.indexOf(i);
            if (bk >= 0) { maze.battery.splice(bk, 1); say(sayEl, 'Battery gone.'); sfx('whoosh'); }
            else if (maze.battery.length >= 2) { say(sayEl, 'Two batteries is the most I can carry!'); sfx('wrong'); return; }
            else { maze.puddle[i] = 0; maze.battery.push(i); say(sayEl, 'A battery! Grabbing it gives me a small reward (+3). Will I learn to fetch it on the way?'); sfx('coin'); }
          }
          hinted = false; showBtn.classList.remove('rs-pulse');
          dryBest = maze.shortest(true);
          stats();
        }
        function cellFromEvent(e) {
          var r = mazeCv.getBoundingClientRect();
          var x = Math.floor((e.clientX - r.left) / r.width * maze.w), y = Math.floor((e.clientY - r.top) / r.height * maze.h);
          if (x < 0 || y < 0 || x >= maze.w || y >= maze.h) return -1;
          return y * maze.w + x;
        }
        mazeCv.addEventListener('click', function (e) { var i = cellFromEvent(e); cursor = -1; useTool(i); });

        /* ----- drawing the maze ----- */
        function cx(i) { return (i % maze.w + 0.5) * cs; }
        function cy(i) { return (Math.floor(i / maze.w) + 0.5) * cs; }
        function drawMaze(now) {
          var c = mc;
          if (!c) return;
          var n = maze.n, i, got = learner.got, base = maze.n * got;
          c.fillStyle = '#070b1a'; c.fillRect(0, 0, MW, MW * maze.h / maze.w);
          /* how good Pip thinks each square is: the glow */
          var vmax = 0.01;
          for (i = 0; i < n; i++) if (!maze.wall[i]) { var vv = learner.value(base + i); if (vv > vmax) vmax = vv; }
          for (i = 0; i < n; i++) {
            var x = (i % maze.w) * cs, y = Math.floor(i / maze.w) * cs;
            if (maze.wall[i]) {
              c.fillStyle = '#1c2550'; roundRect(c, x + 1.5, y + 1.5, cs - 3, cs - 3, cs * 0.16); c.fill();
              c.fillStyle = 'rgba(167,139,250,.35)'; c.fillRect(x + cs * 0.18, y + 2.5, cs * 0.64, 2);
              continue;
            }
            c.fillStyle = 'rgba(234,242,255,.035)'; c.fillRect(x + 1, y + 1, cs - 2, cs - 2);
            if (showHeat) {
              var v = learner.value(base + i);
              if (v > 0.005) { c.fillStyle = HEAT[Math.round(clamp(v / vmax, 0, 1) * 20)]; c.fillRect(x + 1, y + 1, cs - 2, cs - 2); }
              else if (v < -0.05) { c.fillStyle = 'rgba(255,122,144,.22)'; c.fillRect(x + 1, y + 1, cs - 2, cs - 2); }
            }
          }
          /* puddles, batteries, start pad and charger */
          for (i = 0; i < n; i++) {
            if (!maze.puddle[i]) continue;
            c.fillStyle = 'rgba(94,170,255,.75)'; c.beginPath(); c.ellipse(cx(i), cy(i) + cs * 0.08, cs * 0.36, cs * 0.22, 0, 0, TAU); c.fill();
            c.strokeStyle = 'rgba(200,235,255,.7)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(cx(i) - cs * 0.06, cy(i) + cs * 0.04, cs * 0.16, cs * 0.08, 0, 0, TAU); c.stroke();
          }
          for (var k = 0; k < maze.battery.length; k++) {
            var bi = maze.battery[k], taken = learner.got & (1 << k), bx = cx(bi), by = cy(bi), bw = cs * 0.3, bh = cs * 0.46;
            c.globalAlpha = taken ? 0.3 : 1;
            c.fillStyle = C.mint; roundRect(c, bx - bw / 2, by - bh / 2, bw, bh, 3); c.fill();
            c.fillRect(bx - bw * 0.2, by - bh / 2 - 3, bw * 0.4, 3);
            c.fillStyle = '#06301a'; c.fillRect(bx - 1.5, by - bh * 0.25, 3, bh * 0.5); c.fillRect(bx - bh * 0.18, by - 1.5, bh * 0.36, 3);
            c.globalAlpha = 1;
          }
          c.strokeStyle = rgba(C.violet, 0.8); c.lineWidth = 2; c.beginPath(); c.arc(cx(maze.start), cy(maze.start), cs * 0.32, 0, TAU); c.stroke();
          var ex = cx(maze.exit), ey = cy(maze.exit), glowR = cs * (0.42 + (RM ? 0 : Math.sin(now / 300) * 0.04));
          c.fillStyle = rgba(C.mint, 0.25); c.beginPath(); c.arc(ex, ey, glowR, 0, TAU); c.fill();
          c.fillStyle = C.mint; roundRect(c, ex - cs * 0.24, ey - cs * 0.32, cs * 0.48, cs * 0.64, cs * 0.1); c.fill();
          c.fillStyle = '#06301a'; c.beginPath(); c.moveTo(ex + cs * 0.04, ey - cs * 0.24); c.lineTo(ex - cs * 0.12, ey + cs * 0.03); c.lineTo(ex, ey + cs * 0.03); c.lineTo(ex - cs * 0.05, ey + cs * 0.24); c.lineTo(ex + cs * 0.12, ey - cs * 0.04); c.lineTo(ex, ey - cs * 0.04); c.closePath(); c.fill();
          /* Pip's best move from each square */
          if (showArrows) {
            c.strokeStyle = 'rgba(4,10,20,.7)'; c.lineWidth = clamp(cs * 0.05, 2, 3.5); c.lineCap = 'round'; c.lineJoin = 'round';
            for (i = 0; i < n; i++) {
              if (maze.wall[i] || i === maze.exit) continue;
              var s = base + i;
              if (learner.value(s) <= 0.005) continue;
              var bestA = learner.best(s, constHalf), d = MOVES[bestA], ax = cx(i), ay = cy(i), L = Math.min(cs * 0.13, 9);
              c.beginPath();
              c.moveTo(ax - d[0] * L - d[1] * L, ay - d[1] * L - d[0] * L);
              c.lineTo(ax + d[0] * L, ay + d[1] * L);
              c.lineTo(ax - d[0] * L + d[1] * L, ay - d[1] * L + d[0] * L);
              c.stroke();
            }
          }
          /* the trail of this try */
          for (i = 0; i < trail.length; i++) {
            c.fillStyle = rgba(C.sun, 0.1 + 0.5 * i / trail.length);
            c.beginPath(); c.arc(cx(trail[i]), cy(trail[i]), cs * 0.08, 0, TAU); c.fill();
          }
          /* keyboard cursor */
          if (cursor >= 0) { c.strokeStyle = C.sun; c.lineWidth = 3; c.strokeRect((cursor % maze.w) * cs + 2.5, Math.floor(cursor / maze.w) * cs + 2.5, cs - 5, cs - 5); }
          /* Pip, gliding from square to square */
          var k = RM || speed === 'zoom' ? 1 : ease(agent.t);
          var px = lerp(cx(agent.from), cx(agent.to), k), py = lerp(cy(agent.from), cy(agent.to), k);
          drawPip(c, px, py - cs * 0.04, cs * 0.66, A, now, PIP_HEAD);
          if (T - exploredAt < 450 && training) { sparkle(c, px + cs * 0.36, py - cs * 0.36, cs * 0.14, C.sun); }
        }
        function constHalf() { return 0.5; }
        /* Every try since the start, as bars. After 48 tries, neighbouring tries share a bar (their average), so
           the whole learning curve always fits: long tries at first, short ones once Pip has learned. */
        function drawStepsChart() {
          var c = stc;
          if (!c) return;
          c.fillStyle = '#070b1a'; c.fillRect(0, 0, STW, STH);
          var all = learner.history, bars = [], per = Math.max(1, Math.ceil(all.length / 48)), i, k;
          for (i = 0; i < all.length; i += per) {
            var sum = 0, cnt = 0, gaveUp = false;
            for (k = i; k < Math.min(all.length, i + per); k++) { sum += Math.abs(all[k]); cnt++; if (all[k] < 0) gaveUp = true; }
            bars.push({ v: sum / cnt, out: gaveUp && per === 1 });
          }
          var n = Math.max(bars.length, 12), padL = 30, padB = 16, gw = STW - padL - 6, gh = STH - padB - 8;
          var top = Math.max(dryBest * 2, 10);
          bars.forEach(function (b) { if (b.v > top) top = Math.ceil(b.v); });
          var bw = gw / n;
          c.fillStyle = C.muted; c.font = '600 10px ' + FONT.head; c.textAlign = 'right';
          c.fillText(String(top), padL - 4, 14); c.fillText('0', padL - 4, 8 + gh);
          for (i = 0; i < bars.length; i++) {
            var bh = Math.max(2, bars[i].v / top * gh);
            c.fillStyle = bars[i].out ? C.pink : C.cyan;
            c.fillRect(padL + i * bw + 1, 8 + gh - bh, Math.max(1, bw - 2), bh);
          }
          if (dryBest > 0) {
            var ly = 8 + gh - dryBest / top * gh;
            c.strokeStyle = C.sun; c.setLineDash([5, 4]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(padL, ly); c.lineTo(STW - 4, ly); c.stroke(); c.setLineDash([]);
            c.fillStyle = '#070b1a'; c.fillRect(padL + 2, ly - 15, 52, 12);
            c.fillStyle = C.sun; c.textAlign = 'left'; c.fillText('shortest', padL + 5, ly - 5);
          }
          c.textAlign = 'left'; c.fillStyle = C.muted;
          c.fillText(all.length ? 'first try ← → latest try' + (per > 1 ? ' (' + per + ' tries a bar)' : '') : 'No tries yet', padL, STH - 3);
        }

        function frame(dt, now) {
          if (training || showing) {
            if (speed === 'zoom' && training) {
              /* up to 1200 steps a frame, but at most 2 whole tries, so the chart still visibly falls */
              var budget = 1200, ends = 0, before = learner.tries;
              while (budget-- > 0 && training && ends < 2) { doStep(true); if (learner.tries !== before) { ends++; before = learner.tries; } }
            } else {
              var per = showing ? (RM ? 120 : 200) : speed === 'walk' ? 220 : 40;
              stepAcc += dt;
              var guard = 0;
              while (stepAcc >= per && (training || showing) && guard++ < 20) { stepAcc -= per; doStep(training); }
              agent.t = Math.min(1, agent.t + dt / per);
            }
          }
          coach.draw(dt, now);
          drawMaze(now);
          if (stepsDirty) { stepsDirty = false; drawStepsChart(); }
        }
        function onKey(e) {
          if (e.target !== mazeCv) return;
          var k = e.key, mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
          if (cursor < 0) cursor = maze.start;
          if (mv) {
            e.preventDefault();
            var x = clamp(cursor % maze.w + mv[0], 0, maze.w - 1), y = clamp(Math.floor(cursor / maze.w) + mv[1], 0, maze.h - 1);
            cursor = y * maze.w + x;
          } else if (k === ' ' || k === 'Enter' || k === 'Spacebar') { e.preventDefault(); useTool(cursor); }
        }
        function layout() {
          /* squares at most 64 pixels wide, so a small maze is not huge on a big screen */
          mazeCv.style.width = '';
          var avail = Math.max(200, Math.min(560, maze.w * 64, mazeCv.clientWidth || 320));
          mazeCv.style.width = avail + 'px';
          MW = avail; cs = MW / maze.w;
          mc = fit(mazeCv, MW, Math.round(MW * maze.h / maze.w));
          STW = Math.max(200, stepsCv.clientWidth || 300); STH = 130;
          stc = fit(stepsCv, STW, STH);
          coach.resize(); stepsDirty = true;
        }

        mazeCv.addEventListener('blur', function () { cursor = -1; });
        curWords();
        setLevel(level, false);
        setTrainLabel();
        return {
          el: el, heading: heading, lesson: 2,
          resize: layout, frame: frame, onKey: onKey,
          leave: function () { training = false; showing = false; },
          enter: function () {
            A.feel('neutral');
            say(sayEl, 'The glowing door is my charger. I don’t know the way yet, but I get a reward each time I reach it, and I remember which moves helped. Press Train and watch me learn!');
            chirp('hello');
            if (S.done.some(Boolean) && !qHost.firstChild) qHost.appendChild(questionCard(2, A));
          }
        };
      }

      /* =================================================================================================
         LESSON 4: FAIR ROBOT. Pip learned from unfair examples and is unfair to left-handed writers.
         ================================================================================================= */
      var PHRASES = ['I like maths', 'Robots rock', 'Sunny day', 'My big dog', 'Hello there', 'Our class', 'Blue sky', 'Fun at school', 'Go team', 'Space is big', 'I can swim', 'Best day', 'Tea time', 'My red kite', 'Zoom zoom', 'Green tree', 'Big wave', 'Nice work', 'Happy cat', 'Sports day'];
      function lessonFair() {
        var coach = new PipBox('rs-coach-pip', N() + ' the robot, holding a sheet of gold stickers.', 104, 112);
        var A = coach.actor;
        var neuron = new Neuron();
        var lessons = FAIR.train.slice();           // the pages Pip has learned from
        var picked = [0, 0, 0, 0, 0, 0, 0, 0];       // tray pages ticked (not yet taught)
        var taughtTray = [0, 0, 0, 0, 0, 0, 0, 0];   // tray pages Pip has learned from
        var stage = 'intro', reveal = -1, revealT = 0, verdicts = [], days = 0, trainLeft = 0;
        var cc = null, CW = 300, CH = 280, chartDirty = true, chartBg = document.createElement('canvas');
        neuron.train(lessons.map(pageExample), 600, TRAIN.rate, TRAIN.l2);

        /* ----- the page ----- */
        var heading = h('h3', { class: 'rs-h', tabindex: '-1' }, 'Fair Robot');
        var sayEl = h('p', { class: 'rs-say rs-say--left', 'aria-live': 'polite' });
        var dayBtn = h('button', { class: 'btn btn-primary rs-big', type: 'button', onclick: stickerDay }, svgIcon('play'), 'Start sticker day');
        var cards = FAIR.today.map(function (p, i) { return pageCard(p, 100 + i, false); });
        var todayList = h('ul', { class: 'rs-pages', 'aria-label': 'Class 6B’s pages' }, cards.map(function (c) { return h('li', null, c.el); }));
        var tray = FAIR.tray.map(function (p, i) { return pageCard(p, 200 + i, true, i); });
        var trayNote = h('p', { class: 'rs-note' }, '');
        var teachBtn = h('button', { class: 'btn btn-primary rs-big', type: 'button', onclick: retrain }, 'Teach ' + N() + ' with these pages');
        var trayPanel = h('div', { class: 'rs-panel', hidden: true },
          h('p', { class: 'rs-label' }, 'Extra example pages, already marked by the teacher'),
          h('p', { class: 'rs-note' }, 'Tick the pages you want ' + N() + ' to learn from. Three stars if you can make ' + N() + ' fair with 4 pages or fewer.'),
          h('ul', { class: 'rs-pages', 'aria-label': 'Extra example pages' }, tray.map(function (c) { return h('li', null, c.el); })),
          h('div', { class: 'rs-row' }, teachBtn, trayNote));
        var chart = h('canvas', { class: 'rs-chart', role: 'img', 'aria-label': '' });
        var meterR = meterRow('Right-handed', 'R'), meterL = meterRow('Left-handed', 'L');
        var lastYearCards = FAIR.train.map(function (p, i) { return pageCard(p.concat(['Class 5R']), 300 + i, false); });
        var lastYear = h('details', { class: 'rs-how', style: { marginTop: '.4rem' } }, h('summary', null, 'The 12 pages ' + N() + ' learned from last year (Class 5R)'),
          h('ul', { class: 'rs-pages', style: { marginTop: '.5rem' } }, lastYearCards.map(function (c) { return h('li', null, c.el); })));
        lastYear.addEventListener('toggle', function () { if (lastYear.open) lastYearCards.forEach(function (c) { c.paint(); }); });
        var qHost = h('div');
        var el = h('div', { class: 'rs-lesson rs-l4' },
          heading,
          h('div', { class: 'rs-coach', style: { marginTop: '.5rem' } }, coach.canvas, sayEl),
          h('div', { class: 'rs-two' },
            h('div', { class: 'rs-panel' }, h('p', { class: 'rs-label' }, 'Sticker day in Class 6B: a gold sticker for neat writing'), todayList, h('div', { class: 'rs-row rs-row--c' }, dayBtn)),
            h('div', { class: 'rs-panel' }, h('p', { class: 'rs-label' }, N() + '’s chart of the pages it learned from'), chart,
              h('p', { class: 'rs-legend' }, h('span', null, '● neat'), h('span', null, '■ wobbly'), h('span', null, 'R right-handed'), h('span', null, 'L left-handed'), h('span', null, '◇ today’s pages')),
              h('p', { class: 'rs-label' }, 'How often ' + N() + ' was right'), h('div', { class: 'rs-meter' }, meterR.el, meterL.el), lastYear)),
          trayPanel, qHost,
          howBox([
            N() + ' measures two things on each page: which way the writing slants, and how wobbly it is. The teacher only cares about wobbliness: smooth writing is neat, whichever way it leans.',
            'But every page ' + N() + ' learned from last year came from Class 5R, and everyone in that class happened to be right-handed. All the neat writers there slanted their letters to the right. So ' + N() + '’s line learned that slanting right was part of being neat.',
            N() + ' was not being mean. It copied a pattern from examples that left some people out. Adding more right-handed pages does not help, because they show the same pattern. What fixes it is examples from the people it got wrong.',
            'This happens with real systems too. In 2018 researcher Joy Buolamwini found that some face-reading programs made many more mistakes with darker-skinned women than with lighter-skinned men. The fix starts with fair examples, chosen with care.'
          ]));

        function meterRow(label, hand) {
          var fill = h('div', { class: 'rs-fill' }), num = h('span', { class: 'rs-pct' }, '·');
          var row = h('div', { class: 'rs-meter-row ' + hand, role: 'img', 'aria-label': label + ' writers: no sticker day yet' }, h('span', null, label), h('div', { class: 'rs-track' }, fill), num);
          return { el: row, set: function (right, of) { fill.style.width = (of ? right / of * 100 : 0) + '%'; num.textContent = of ? right + '/' + of : '·'; row.setAttribute('aria-label', label + ' writers: ' + N() + ' was right for ' + right + ' of ' + of); } };
        }
        /* A page of writing: who wrote it, which hand, the teacher's mark, and later Pip's verdict. */
        function pageCard(p, seed, toggle, trayIndex) {
          var cv = h('canvas', { 'aria-hidden': 'true' });
          var verdict = h('span', { class: 'rs-verdict' }, toggle ? '' : ' ');
          var name = p[4] || 'Page';
          var handChip = h('span', { class: 'rs-hand ' + p[3] }, svgIcon('hand'), p[3] === 'L' ? 'Left' : 'Right');
          var teacher = h('span', null, 'Teacher: ' + (p[2] ? 'neat' : 'wobbly'));
          var kids = [h('span', { class: 'rs-page-top' }, h('span', null, name), handChip), cv, teacher, toggle ? h('span', { class: 'rs-pick', 'aria-hidden': 'true' }, '✓') : verdict];
          var label = name + ', ' + (p[3] === 'L' ? 'left' : 'right') + '-handed. The teacher says it is ' + (p[2] ? 'neat' : 'wobbly') + '.';
          var node = toggle
            ? h('button', { class: 'rs-page', type: 'button', 'aria-pressed': 'false', 'aria-label': label + ' Add to ' + N() + '’s lessons.', onclick: function () { pick(trayIndex); } }, kids)
            : h('div', { class: 'rs-page', role: 'group', 'aria-label': label }, kids);
          var text = PHRASES[seed % PHRASES.length];
          function paint() {
            var w = Math.max(100, cv.clientWidth || 140), hh = 54, c = fit(cv, w, hh);
            c.fillStyle = '#f4f1e8'; roundRect(c, 0, 0, w, hh, 6); c.fill();
            drawWriting(c, text, 0, 0, w, hh, p[0], p[1], seed, '#1c2340');
          }
          return {
            el: node, paint: paint, label: label,
            setVerdict: function (sticker, right) {
              verdict.textContent = N() + ': ' + (sticker ? '★ sticker' : 'keep practising') + (right ? '  ✓' : '  ✕');
              verdict.className = 'rs-verdict ' + (right ? 'ok' : 'bad');
              node.className = 'rs-page ' + (right ? 'ok' : 'bad');
              node.setAttribute('aria-label', label + ' ' + N() + ' gave ' + (sticker ? 'a sticker' : 'no sticker') + ', which is ' + (right ? 'right.' : 'wrong.'));
            },
            clear: function () { verdict.textContent = ' '; verdict.className = 'rs-verdict'; node.className = 'rs-page'; node.setAttribute('aria-label', label); }
          };
        }
        function pick(i) {
          if (taughtTray[i]) { say(sayEl, 'I have already learned from ' + FAIR.tray[i][4] + '’s page.'); return; }
          picked[i] = picked[i] ? 0 : 1; sfx('click');
          tray[i].el.setAttribute('aria-pressed', String(!!picked[i]));
          trayWords();
        }
        function trayWords() {
          var n = picked.filter(Boolean).length + taughtTray.filter(Boolean).length;
          trayNote.textContent = n ? 'Extra pages: ' + n : 'No extra pages yet.';
          el.setAttribute('data-added', String(taughtTray.filter(Boolean).length));
        }

        /* ----- sticker day: Pip judges each page, one by one ----- */
        function stickerDay() {
          if (stage === 'day' || trainLeft > 0) return;
          api.unlockSound(); sfx('click');
          stage = 'day'; reveal = 0; revealT = 0; verdicts = []; days++;
          el.setAttribute('data-stage', 'day');
          cards.forEach(function (c) { c.clear(); });
          dayBtn.disabled = true;
          A.feel('thinking'); A.chest = 'bars';
          say(sayEl, 'Sticker day! I’ll look at each page and decide: neat writing gets a gold sticker.');
          api.status('Fair Robot · sticker day: ' + N() + ' is marking the pages');
          chartDirty = true;
        }
        function judgeNext() {
          var p = FAIR.today[reveal], sticker = pageGuess(neuron, p) >= 0.5, right = (sticker ? 1 : 0) === p[2];
          verdicts.push(right ? 1 : 0);
          cards[reveal].setVerdict(sticker, right);
          sfx(sticker ? 'coin' : 'tick');
          reveal++;
          if (reveal >= FAIR.today.length) report();
        }
        function report() {
          stage = 'report'; reveal = -1;
          el.setAttribute('data-stage', 'report');
          A.chest = 'dot';
          var r = fairReport(neuron, FAIR.today);
          meterR.set(r.R, r.nR); meterL.set(r.L, r.nL);
          el.setAttribute('data-fair', r.R + ',' + r.L);
          dayBtn.disabled = false; dayBtn.lastChild.textContent = 'Sticker day again';
          var missed = FAIR.today.filter(function (p) { return p[3] === 'L' && p[2] === 1 && pageGuess(neuron, p) < 0.5; }).map(function (p) { return p[4]; });
          var fair = r.R >= 5 && r.L >= 5;
          var added = taughtTray.filter(Boolean).length;
          award(3, 1);
          if (!fair) {
            A.feel('sad'); chirp('sad');
            if (days === 1) {
              say(sayEl, 'Hmm. I was right for ' + r.R + ' of 6 right-handed writers, but only ' + r.L + ' of 6 left-handed writers. ' + listNames(missed) + ' write neatly, but I didn’t give them stickers. That’s not fair! Look at my chart: every neat page I learned from slants to the right, because everyone in Class 5R was right-handed. Can you fix me? Tick some extra pages below to teach me.');
              trayPanel.hidden = false; trayWords();
              tray.forEach(function (c) { c.paint(); });
            } else {
              var onlyRight = taughtTray.every(function (t, i) { return !t || FAIR.tray[i][3] === 'R'; });
              say(sayEl, 'Still unfair: left-handed writers ' + r.L + ' of 6. ' + (added && onlyRight ? 'More right-handed pages didn’t help. They show me the same pattern I already knew! ' : '') + 'I need examples of neat writing that slants the other way.');
            }
            api.status('Fair Robot · right-handed ' + r.R + ' of 6, left-handed ' + r.L + ' of 6. Not fair yet');
          } else {
            A.feel('happy'); A.aha();
            var stars = r.R === 6 && r.L === 6 && added <= 4 ? 3 : 2;
            var newStars = award(3, stars);
            say(sayEl, 'Fair at last! Right-handed ' + r.R + ' of 6, left-handed ' + r.L + ' of 6. Now I know that neat means smooth, whichever way you slant.' + (stars === 3 ? ' And you only needed ' + added + ' extra page' + (added === 1 ? '' : 's') + '. Better examples beat more examples!' : added > 4 ? ' Can you do it with 4 pages or fewer? Press “Start this lesson again” to try.' : ''));
            if (newStars) api.celebrate(stars === 3 ? N() + ' is fair, with just ' + added + ' extra pages!' : N() + ' is fair now!');
            api.status('Fair Robot · fair! Right-handed ' + r.R + ' of 6, left-handed ' + r.L + ' of 6');
            if (!qHost.firstChild) qHost.appendChild(questionCard(3, A));
            restartRow.hidden = false;
          }
          chartDirty = true;
        }
        function listNames(list) { if (!list.length) return 'Some left-handed kids'; if (list.length === 1) return list[0]; return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]; }
        function retrain() {
          if (trainLeft > 0 || stage === 'day') return;
          var n = 0;
          picked.forEach(function (on, i) { if (on && !taughtTray[i]) { taughtTray[i] = 1; lessons.push(FAIR.tray[i]); n++; } picked[i] = 0; });
          if (!n) { A.flash('confused', 1400); say(sayEl, 'Tick at least one page first, then teach me.'); return; }
          api.unlockSound(); sfx('pop');
          tray.forEach(function (c, i) { c.el.setAttribute('aria-pressed', String(!!taughtTray[i])); c.el.disabled = !!taughtTray[i]; });
          trainLeft = RM ? 0 : 600;
          if (RM) neuron.train(lessons.map(pageExample), 600, TRAIN.rate, TRAIN.l2);
          trainData = lessons.map(pageExample);
          A.feel('thinking'); A.chest = 'bars';
          say(sayEl, 'Learning from ' + n + ' more page' + (n === 1 ? '' : 's') + '… watch my line on the chart.');
          trayWords(); chartDirty = true;
          if (RM) trained();
        }
        var trainData = [];
        function trained() {
          A.chest = 'dot'; A.feel('neutral');
          var moved = Math.abs(neuron.w1) < 1.5;
          if (moved) A.aha(); else A.flash('thinking', 1200);
          say(sayEl, moved ? 'Aha! My line has turned. I learned from ' + lessons.length + ' pages now. Let’s run sticker day again!' : 'I learned from ' + lessons.length + ' pages now, but my line hardly moved. Let’s see on sticker day.');
          api.status('Fair Robot · ' + N() + ' has learned from ' + lessons.length + ' pages. Run sticker day again');
          chartDirty = true;
        }
        var restartRow = h('div', { class: 'rs-row', hidden: true }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: restart }, 'Start this lesson again'));
        el.appendChild(restartRow);
        function restart() {
          sfx('click');
          neuron = new Neuron(); lessons = FAIR.train.slice(); neuron.train(lessons.map(pageExample), 600, TRAIN.rate, TRAIN.l2);
          picked = [0, 0, 0, 0, 0, 0, 0, 0]; taughtTray = [0, 0, 0, 0, 0, 0, 0, 0]; stage = 'intro'; days = 0; reveal = -1;
          tray.forEach(function (c) { c.el.setAttribute('aria-pressed', 'false'); c.el.disabled = false; });
          cards.forEach(function (c) { c.clear(); });
          meterR.set(0, 0); meterL.set(0, 0);
          trayPanel.hidden = true; restartRow.hidden = true; dayBtn.lastChild.textContent = 'Start sticker day';
          el.setAttribute('data-stage', 'intro'); el.removeAttribute('data-fair');
          showCab();
          A.feel('neutral'); A.flash('surprised', 900);
          say(sayEl, 'Back to how I was last year. Can you make me fair with 4 extra pages or fewer?');
          chartDirty = true; trayWords();
        }

        /* ----- the chart: slant across, wobble up ----- */
        var pl = 30, pt = 10, pw = 250, ph = 220;
        function X(s) { return pl + (s + 1) / 2 * pw; }
        function Y(w) { return pt + (1 - w) * ph; }
        function renderChart() {
          var d = dprNow();
          chartBg.width = Math.round(CW * d); chartBg.height = Math.round(CH * d);
          var c = chartBg.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
          c.fillStyle = '#070b1a'; roundRect(c, 0, 0, CW, CH, 12); c.fill();
          var n = 26, i, j, cw = pw / n, chh = ph / n, gs = 0, gw = 0, gn = 0, bs = 0, bw2 = 0, bn = 0;
          for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
            var s = (i + 0.5) / n * 2 - 1, w = (j + 0.5) / n, p = pageGuess(neuron, [s, w, 0]);
            c.fillStyle = rgba(p >= 0.5 ? C.mint : C.pink, Math.round((0.05 + Math.abs(p - 0.5) * 2 * 0.24) * 40) / 40);
            c.fillRect(pl + i * cw, pt + (n - 1 - j) * chh, Math.ceil(cw), Math.ceil(chh));
            if (p >= 0.5) { gs += s; gw += w; gn++; } else { bs += s; bw2 += w; bn++; }
          }
          /* Pip's line: where the neuron is exactly 50:50 */
          var ends = [], w1 = neuron.w1, w2 = neuron.w2, b = neuron.b, u, v;
          if (Math.abs(w2) > 1e-6) for (u = -1; u <= 1; u += 2) { v = -(w1 * u + b) / w2; if (v >= -1 && v <= 1) ends.push([X(u), Y((v + 1) / 2)]); }
          if (Math.abs(w1) > 1e-6) for (v = -1; v <= 1; v += 2) { u = -(w2 * v + b) / w1; if (u > -1 && u < 1) ends.push([X(u), Y((v + 1) / 2)]); }
          if (ends.length >= 2) {
            c.strokeStyle = rgba(C.sun, 0.25); c.lineWidth = 9; c.beginPath(); c.moveTo(ends[0][0], ends[0][1]); c.lineTo(ends[1][0], ends[1][1]); c.stroke();
            c.strokeStyle = C.sun; c.lineWidth = 3; c.beginPath(); c.moveTo(ends[0][0], ends[0][1]); c.lineTo(ends[1][0], ends[1][1]); c.stroke();
          }
          c.font = '800 ' + Math.round(clamp(CW / 22, 11, 15)) + 'px ' + FONT.head; c.textAlign = 'center';
          /* label each side in the middle of its own area */
          if (gn) { c.fillStyle = rgba(C.mint, 0.85); c.fillText('STICKER', clamp(X(gs / gn), pl + 40, pl + pw - 40), Y(gw / gn) + 5); }
          if (bn) { c.fillStyle = rgba(C.pink, 0.85); c.fillText('NO STICKER', clamp(X(bs / bn), pl + 50, pl + pw - 50), Y(bw2 / bn) + 5); }
          /* axes */
          c.strokeStyle = rgba(C.ink, 0.5); c.lineWidth = 1; c.beginPath(); c.moveTo(pl, pt); c.lineTo(pl, pt + ph); c.lineTo(pl + pw, pt + ph); c.stroke();
          c.strokeStyle = 'rgba(234,242,255,.12)'; c.beginPath(); c.moveTo(X(0) + 0.5, pt); c.lineTo(X(0) + 0.5, pt + ph); c.stroke();
          c.fillStyle = C.muted; c.font = '700 11px ' + FONT.head;
          c.textAlign = 'left'; c.fillText('← leans left', pl + 2, pt + ph + 15);
          c.textAlign = 'right'; c.fillText('leans right →', pl + pw, pt + ph + 15);
          c.save(); c.translate(12, pt + ph / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.fillText('smooth → wobbly', 0, 0); c.restore();
          /* today's pages, once sticker day has started */
          if (days > 0) FAIR.today.forEach(function (p) {
            var x = X(p[0]), y = Y(p[1]);
            c.strokeStyle = p[3] === 'L' ? C.violet : C.cyan; c.lineWidth = 2;
            c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x + 6, y); c.lineTo(x, y + 6); c.lineTo(x - 6, y); c.closePath(); c.stroke();
          });
          /* the pages Pip learned from: a circle for neat, a square for wobbly, with R or L inside */
          c.font = '800 9px ' + FONT.head; c.textAlign = 'center'; c.textBaseline = 'middle';
          lessons.forEach(function (p) {
            var x = X(p[0]), y = Y(p[1]), col = p[2] ? C.mint : C.pink;
            c.fillStyle = col;
            if (p[2]) { c.beginPath(); c.arc(x, y, 7.5, 0, TAU); c.fill(); } else c.fillRect(x - 7, y - 7, 14, 14);
            c.fillStyle = '#04101a'; c.fillText(p[3], x, y + 0.5);
          });
          c.textBaseline = 'alphabetic';
          var leftNeat = lessons.filter(function (p) { return p[3] === 'L' && p[2]; }).length;
          chart.setAttribute('aria-label', N() + '’s chart: slant goes across, wobble goes up. It has learned from ' + lessons.length + ' pages: ' + lessons.filter(function (p) { return p[2]; }).length + ' neat and ' + lessons.filter(function (p) { return !p[2]; }).length + ' wobbly. ' +
            (leftNeat ? leftNeat + ' of the neat pages lean left.' : 'Every neat page leans right.') + ' Its line ' + (Math.abs(neuron.w1) > 1.5 ? 'is tilted: it gives stickers to writing that leans right.' : 'is nearly flat: it gives stickers to smooth writing, whichever way it leans.'));
        }
        function drawChart() {
          if (!cc) return;
          if (chartDirty) { renderChart(); chartDirty = false; }
          cc.clearRect(0, 0, CW, CH); cc.drawImage(chartBg, 0, 0, CW, CH);
        }
        function frame(dt, now) {
          coach.draw(dt, now);
          if (trainLeft > 0) {
            var n = Math.min(trainLeft, 20);
            neuron.train(trainData, n, TRAIN.rate, TRAIN.l2);
            trainLeft -= n; chartDirty = true;
            if (!trainLeft) trained();
          }
          if (stage === 'day' && reveal >= 0) {
            revealT += dt;
            if (revealT >= dur(420)) { revealT = 0; judgeNext(); }
          }
          drawChart();
        }
        function layout() {
          CW = Math.max(220, chart.clientWidth || 300); CH = Math.round(Math.min(CW * 0.85, 320));
          cc = fit(chart, CW, CH);
          pl = 30; pt = 10; pw = CW - pl - 10; ph = CH - pt - 26;
          chartDirty = true;
          coach.resize();
          cards.forEach(function (c) { c.paint(); });
          if (!trayPanel.hidden) tray.forEach(function (c) { c.paint(); });
          if (lastYear.open) lastYearCards.forEach(function (c) { c.paint(); });
        }
        trayWords();
        return {
          el: el, heading: heading, lesson: 3,
          resize: layout, frame: frame,
          enter: function () {
            A.feel('happy'); A.chest = 'heart';
            say(sayEl, 'Last year I learned to spot neat writing from Class 5R’s pages. Today I’m giving out gold stickers for neat writing in Class 6B! Press “Start sticker day”.');
            api.status('Fair Robot · press Start sticker day');
            chirp('hello');
            after(2200, function () { A.chest = 'dot'; });
            el.setAttribute('data-stage', 'intro');
          }
        };
      }

      /* =================================================================================================
         Wiring: keys, sound unlock, resizing, pausing when hidden or off screen, and clean-up.
         ================================================================================================= */
      function onKey(e) {
        var t = e.target, tag = t && t.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
        if (view && view.onKey) view.onKey(e);
      }
      function wake() { api.unlockSound(); }
      function keysOn(e) { if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key.indexOf('Arrow') === 0) keyNav = true; }
      function keysOff() { keyNav = false; }
      root.addEventListener('keydown', keysOn);
      document.addEventListener('pointerdown', keysOff, true);
      root.addEventListener('keydown', onKey);
      root.addEventListener('pointerdown', wake);
      root.addEventListener('keydown', wake);

      var lastW = 0, lastD = 0;
      function maybeResize() {
        var w = Math.round(root.clientWidth), d = dprNow();
        if (!w || (w === lastW && d === lastD)) return;
        lastW = w; lastD = d;
        if (view && view.resize) view.resize();
        kick();
      }
      var ro = typeof ResizeObserver === 'function' ? new ResizeObserver(maybeResize) : null;
      if (ro) ro.observe(root);
      window.addEventListener('resize', maybeResize);
      /* Stop drawing while the robot is scrolled out of sight, and while the tab is hidden. */
      var io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (entries) {
        onScreen = entries[entries.length - 1].isIntersecting;
        if (onScreen) kick();
      }) : null;
      if (io) io.observe(cab);
      function onVisibility() { if (!document.hidden) kick(); }
      document.addEventListener('visibilitychange', onVisibility);

      go(lobby, false);
      lastW = Math.round(root.clientWidth); lastD = dprNow();

      return {
        destroy: function () {
          destroyed = true;
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          clearTimers();
          if (view && view.leave) view.leave();
          if (ro) ro.disconnect();
          if (io) io.disconnect();
          window.removeEventListener('resize', maybeResize);
          document.removeEventListener('visibilitychange', onVisibility);
          root.removeEventListener('keydown', onKey);
          root.removeEventListener('keydown', keysOn);
          document.removeEventListener('pointerdown', keysOff, true);
          root.removeEventListener('pointerdown', wake);
          root.removeEventListener('keydown', wake);
        }
      };
    }
  });
})();
