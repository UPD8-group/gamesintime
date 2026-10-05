/* Block World: the 2010s hall of Games in Time.

   A side-on world made of blocks. Dig blocks to collect them, place them to build, make new blocks from old ones in
   your Bag, and light up caves with torches when night falls and the fireflies come out. Explore mode starts you
   with nothing but a few torches; Creative mode gives you every block and lets you fly. Building challenges give a
   class something to aim for (build a house with a door and a window, a tower, a bridge...).

   The mechanics are those of Minecraft (Markus Persson and Mojang, Sweden, 2009 to 2011) and Terraria (2011). The
   blocks, their names and pictures, the explorer and everything else you see are our own, drawn in code.

   How it works, for curious coders:
   - The world is a grid of 384 by 112 cells. Each cell holds one small number: which block is there (0 is air).
   - The world grows from one number, the seed. A seeded "noise" function turns (x, y, seed) into smooth random
     values, so the same seed always gives the same hills, lakes, caves and ores. Same number, same world.
   - Saving keeps only the seed and the cells you changed, so a whole world fits in a few kilobytes.
   - Light spreads like water through a maze: each step away from the sky or a torch it gets one step dimmer.
     This is a "flood fill" (also called breadth-first search), the same idea as the paint bucket in a drawing app.
   - Only the cells you can see are drawn, and each block's picture is painted once, when the game starts, into a
     hidden canvas (a "texture atlas"), so every frame is just copying small squares. That keeps it smooth on a
     Chromebook.
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  /* ---------- the world grid ---------- */
  var WW = 384, WH = 112, N = WW * WH;
  var SEA = 50;              // open-air cells at or below this row fill with water: that makes the lakes
  var CYCLE = 300;           // seconds in one whole day and night
  var DAY_PART = 0.62;       // the first 62% of each cycle is daytime
  var PW = 0.66, PH = 1.7;   // the explorer's width and height, in blocks
  var GRAVITY = 34, JUMP = 10.4, WALK = 5.2, FLY = 8;

  /* ---------- the blocks ----------
     Every block has a number. solid: you bump into it. opaque: light cannot pass. cost: how much light fades
     passing through. light: how brightly it glows. hard: seconds to dig in Explore (-1: cannot be dug). drop: what
     you collect when you dig it. chip: the colour of the little bits that fly off. */
  var AIR = 0, GRASS = 1, DIRT = 2, STONE = 3, WOOD = 4, LEAVES = 5, SAND = 6, WATER = 7, PLANKS = 8, GLASS = 9,
    BRICK = 10, TORCH = 11, COAL = 12, COPPER = 13, OPAL = 14, DEEP = 15, BENCH = 16, DOOR_B = 17, DOOR_T = 18,
    CLAY = 19, LAMP = 20, WATTLE = 21;
  var NB = 22;
  var WALL_DIRT = 30, WALL_STONE = 31, CRACK = 32;   // pictures only: cave back walls and digging cracks
  var B = [];
  var SOLID = new Uint8Array(NB), OPAQUE = new Uint8Array(NB), COST = new Uint8Array(NB), LIGHT = new Uint8Array(NB);
  function def(id, name, o) {
    o = o || {};
    B[id] = {
      id: id, name: name, solid: o.solid !== false, opaque: o.opaque !== false, cost: o.cost || 1, light: o.light || 0,
      hard: o.hard == null ? 0.5 : o.hard, drop: o.drop == null ? id : o.drop, snd: o.snd || 'soft', chip: o.chip || '#999999'
    };
    SOLID[id] = B[id].solid ? 1 : 0; OPAQUE[id] = B[id].opaque ? 1 : 0; COST[id] = B[id].cost; LIGHT[id] = B[id].light;
  }
  def(AIR, 'Air', { solid: false, opaque: false, hard: -1 });
  def(GRASS, 'Grass', { hard: 0.3, drop: DIRT, chip: '#4cc46a' });
  def(DIRT, 'Dirt', { hard: 0.3, chip: '#9a6437' });
  def(STONE, 'Stone', { hard: 0.7, snd: 'hard', chip: '#8a93a1' });
  def(WOOD, 'Wood', { hard: 0.5, snd: 'wood', chip: '#8c5b33' });
  def(LEAVES, 'Leaves', { hard: 0.12, opaque: false, cost: 2, snd: 'leaf', chip: '#3cbc70' });
  def(SAND, 'Sand', { hard: 0.25, chip: '#f0d18a' });
  def(WATER, 'Water', { solid: false, opaque: false, cost: 2, hard: -1, chip: '#5aa2ff' });
  def(PLANKS, 'Planks', { hard: 0.5, snd: 'wood', chip: '#d79c58' });
  def(GLASS, 'Glass', { hard: 0.25, opaque: false, snd: 'glass', chip: '#d9f3ff' });
  def(BRICK, 'Brick', { hard: 0.7, snd: 'hard', chip: '#e0604c' });
  def(TORCH, 'Torch', { solid: false, opaque: false, hard: 0, light: 14, snd: 'leaf', chip: '#ffc233' });
  def(COAL, 'Coal', { hard: 0.8, snd: 'hard', chip: '#2f323b' });
  def(COPPER, 'Copper', { hard: 0.9, snd: 'hard', chip: '#e3873f' });
  def(OPAL, 'Opal', { hard: 1.1, light: 6, snd: 'glass', chip: '#7fe3ff' });
  def(DEEP, 'Deep rock', { hard: -1, chip: '#3a344d' });
  def(BENCH, 'Workbench', { hard: 0.5, opaque: false, snd: 'wood', chip: '#c98a4b' });
  def(DOOR_B, 'Door', { solid: false, opaque: false, hard: 0.5, snd: 'wood', chip: '#b8743c' });
  def(DOOR_T, 'Door', { solid: false, opaque: false, hard: 0.5, drop: DOOR_B, snd: 'wood', chip: '#b8743c' });
  def(CLAY, 'Clay', { hard: 0.35, chip: '#9ea8bf' });
  def(LAMP, 'Lamp', { hard: 0.5, light: 15, snd: 'glass', chip: '#ffd76a' });
  def(WATTLE, 'Wattle', { solid: false, opaque: false, hard: 0, snd: 'leaf', chip: '#ffcf1f' });

  /* The order blocks appear in the Bag, and Creative mode's starting hotbar. */
  var PALETTE = [GRASS, DIRT, STONE, SAND, CLAY, WOOD, PLANKS, LEAVES, GLASS, BRICK, TORCH, LAMP, DOOR_B, BENCH, WATTLE, COAL, COPPER, OPAL, WATER];
  var CREATIVE_HOTBAR = [DIRT, STONE, WOOD, PLANKS, GLASS, BRICK, SAND, LEAVES, TORCH];

  /* Things you can make in Explore mode. bench: you must stand near a workbench. */
  var RECIPES = [
    { out: PLANKS, n: 4, need: [[WOOD, 1]] },
    { out: BENCH, n: 1, need: [[PLANKS, 4]] },
    { out: TORCH, n: 4, need: [[COAL, 1], [PLANKS, 1]] },
    { out: GLASS, n: 1, need: [[SAND, 1]], bench: true },
    { out: BRICK, n: 1, need: [[CLAY, 1]], bench: true },
    { out: DOOR_B, n: 1, need: [[PLANKS, 3]], bench: true },
    { out: LAMP, n: 1, need: [[COPPER, 1], [GLASS, 1]], bench: true }
  ];

  /* The building challenges. Each one is checked by the game itself. */
  var GOALS = [
    { id: 'bench', text: 'Put a workbench in the world.', hint: 'In Explore, make one from 4 planks in the Bag.' },
    { id: 'house', text: 'Build a house with a door and a window.', hint: 'Walls, a floor and a roof all round, at least 2 blocks high inside, with a door and some glass. A dug-out room counts too, like the underground homes of Coober Pedy, the opal town in South Australia.' },
    { id: 'torch', text: 'Light up a cave with a torch.', hint: 'Place a torch deep underground.' },
    { id: 'tower', text: 'Build a tower 10 blocks tall.', hint: 'Aim at your own feet and place a block: you hop up and it goes under you.' },
    { id: 'bridge', text: 'Build a bridge over water.', hint: '6 blocks side by side, with water underneath.' },
    { id: 'night', text: 'Watch the fireflies come out.', hint: 'Stand outside at night. In a hurry? Use Skip to night.' },
    { id: 'opal', text: 'Find an opal.', hint: 'Opals hide deep underground. They glow a little in the dark.' },
    { id: 'deep', text: 'Dig down to the deep rock.', hint: 'The dark rock at the very bottom of the world cannot be dug.' }
  ];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth01(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  /* ---------- seeded noise ----------
     hash() mixes three whole numbers into a random-looking fraction from 0 to 1. The same inputs always give the
     same answer, which is what makes a world repeatable. perlin() blends the hashes of the four corners of a grid
     square into a smooth wavy surface, so neighbouring cells get similar values (hills, not static). */
  function hash(x, y, s) {
    var h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  var GX = [1, -1, 0, 0, 0.7071, -0.7071, 0.7071, -0.7071], GY = [0, 0, 1, -1, 0.7071, 0.7071, -0.7071, -0.7071];
  function grad(ix, iy, s, dx, dy) { var k = (hash(ix, iy, s) * 8) | 0; return GX[k] * dx + GY[k] * dy; }
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function perlin(x, y, s) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fade(fx), v = fade(fy);
    var a = grad(ix, iy, s, fx, fy), b = grad(ix + 1, iy, s, fx - 1, fy);
    var c = grad(ix, iy + 1, s, fx, fy - 1), d = grad(ix + 1, iy + 1, s, fx - 1, fy - 1);
    var ab = a + (b - a) * u, cd = c + (d - c) * u;
    return ab + (cd - ab) * v;   // about -0.7 to 0.7
  }
  /* Three layers of noise added together, each finer and fainter: big hills with small bumps on them. */
  function fbm(x, y, s) { return perlin(x, y, s) + perlin(x * 2, y * 2, s + 1) * 0.5 + perlin(x * 4, y * 4, s + 2) * 0.25; }

  /* A small seeded random number generator, for painting the block pictures the same way every time. */
  function seeded(a) {
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------- growing a world from a seed ---------- */
  function generate(seed) {
    var w = new Uint8Array(N), surf = new Int16Array(WW), s = Math.imul(seed | 0, 7919) | 0;
    var x, y, i, k, id;
    /* 1. The height of the ground in every column: rolling hills, with the odd mountain. */
    for (x = 0; x < WW; x++) {
      var hgt = 47 - fbm(x / 56, 0.5, s) * 14 - perlin(x / 14, 3.5, s + 3) * 3;
      var m = perlin(x / 130, 7.5, s + 4);
      if (m > 0.25) hgt -= (m - 0.25) * 55;
      surf[x] = clamp(Math.round(hgt), 16, 64);
    }
    /* Columns near a lake: no caves there, so the lakes do not drain away underground. */
    var wet = new Uint8Array(WW);
    for (x = 0; x < WW; x++) if (surf[x] >= SEA) for (k = -6; k <= 6; k++) if (x + k >= 0 && x + k < WW) wet[x + k] = 1;
    /* 2. Fill each column: sky, then grass, dirt and stone, with sandy beaches and deserts. */
    for (x = 0; x < WW; x++) {
      var top = surf[x];
      var desert = perlin(x / 90, 9.5, s + 5) > 0.38;
      var beach = top >= SEA - 1 || (wet[x] && top >= SEA - 3);
      var dirtDepth = 3 + Math.floor(hash(x, 1, s) * 2) + (top < 40 ? 1 : 0);
      for (y = 0; y < WH; y++) {
        i = y * WW + x;
        if (y >= WH - 2 || (y === WH - 3 && hash(x, y, s + 5) < 0.5)) id = DEEP;
        else if (y < top) id = y >= SEA ? WATER : AIR;
        else if (y === top) id = (beach || desert) ? SAND : GRASS;
        else if (y < top + dirtDepth) id = (beach || desert) ? (beach && y > top + 1 ? CLAY : SAND) : DIRT;
        else id = STONE;
        /* 3. Caves: where a smooth noise value is very close to zero we get long winding tunnels, and where a
           second noise is high we get big caverns. Deeper down, the caves get wider. */
        if ((id === STONE || id === DIRT) && !wet[x]) {
          var depth = y - top;
          var mouth = perlin(x / 20, 1.5, s + 8) > 0.45;
          if (depth > 6 || (mouth && depth > 0)) {
            var df = Math.min(1, depth / 45);
            var t1 = Math.abs(perlin(x / 22, y / 11, s + 9)), t2 = Math.abs(perlin(x / 13, y / 17, s + 10));
            if (t1 < 0.022 + df * 0.022 || (depth > 14 && t2 < 0.014 + df * 0.012) || (depth > 22 && perlin(x / 16, y / 9, s + 11) > 0.5 - df * 0.08)) id = AIR;
          }
        }
        /* 4. Ores in the stone: coal near the top, copper deeper, and rare opals right at the bottom. */
        if (id === STONE) {
          var d2 = y - top;
          if (d2 > 4 && perlin(x / 3.5, y / 3.5, s + 12) > 0.4) id = COAL;
          else if (d2 > 18 && perlin(x / 3, y / 3, s + 13) > 0.46) id = COPPER;
          else if (y > 80 && perlin(x / 2.5, y / 2.5, s + 14) > 0.5) id = OPAL;
        }
        w[i] = id;
      }
    }
    /* 5. Trees: round bushy ones, and tall gum trees with clumps of leaves. Then golden wattle flowers. */
    var lastTree = -10;
    for (x = 4; x < WW - 4; x++) {
      var t0 = surf[x];
      if (w[t0 * WW + x] !== GRASS || x - lastTree < 4 || hash(x, 2, s) > 0.17) continue;
      var gum = hash(x, 3, s) < 0.45;
      var th = gum ? 6 + Math.floor(hash(x, 4, s) * 3) : 4 + Math.floor(hash(x, 4, s) * 2);
      if (t0 - th - 4 < 2) continue;
      for (k = 1; k <= th; k++) w[(t0 - k) * WW + x] = WOOD;
      var cy = t0 - th;
      var blobs = gum ? [[-2, 0, 1.7], [2, -1, 1.7], [0, -2, 1.9]] : [[0, -1, 2.4]];
      for (var b = 0; b < blobs.length; b++) {
        var bx = x + blobs[b][0], by = cy + blobs[b][1], br = blobs[b][2];
        for (var yy = Math.floor(by - br); yy <= Math.ceil(by + br); yy++) {
          for (var xx = Math.floor(bx - br - 1); xx <= Math.ceil(bx + br + 1); xx++) {
            if (xx < 0 || xx >= WW || yy < 0) continue;
            var ddx = xx - bx, ddy = (yy - by) * 1.15;
            if (ddx * ddx + ddy * ddy <= br * br + 0.6 && w[yy * WW + xx] === AIR) w[yy * WW + xx] = LEAVES;
          }
        }
      }
      if (gum) { w[(cy + 1) * WW + x - 1] = w[(cy + 1) * WW + x - 1] === AIR ? WOOD : w[(cy + 1) * WW + x - 1]; }
      lastTree = x;
    }
    for (x = 1; x < WW - 1; x++) {
      var t1i = surf[x] * WW + x;
      if (w[t1i] === GRASS && w[t1i - WW] === AIR && hash(x, 5, s) < 0.08) w[t1i - WW] = WATTLE;
    }
    /* 6. Where you start: the dry, open column closest to the middle of the world. */
    var spawn = WW >> 1;
    for (k = 0; k < WW / 2 - 8; k++) {
      var cand = [(WW >> 1) + k, (WW >> 1) - k];
      var found = -1;
      for (var q = 0; q < 2; q++) {
        x = cand[q]; var tt = surf[x];
        if (tt < SEA - 1 && w[(tt - 1) * WW + x] === AIR && w[(tt - 2) * WW + x] === AIR && w[(tt - 3) * WW + x] === AIR && SOLID[w[tt * WW + x]]) { found = x; break; }
      }
      if (found >= 0) { spawn = found; break; }
    }
    return { w: w, surf: surf, spawn: spawn };
  }

  /* ---------- saving: only the changes ----------
     We compare the world with a freshly grown copy and write down each cell that is different. Each change is the
     gap since the last changed cell (in base 36, so it is short) followed by the new block's number. */
  function encodeChanges(world, gen) {
    var out = [], prev = -1;
    for (var i = 0; i < N; i++) {
      if (world[i] !== gen[i]) { out.push((i - prev).toString(36) + world[i].toString(36)); prev = i; }
    }
    return out.join(',');
  }
  function applyChanges(world, str) {
    if (typeof str !== 'string' || !str) return 0;
    var parts = str.split(','), at = -1, n = 0;
    for (var k = 0; k < parts.length; k++) {
      var p = parts[k];
      if (p.length < 2) continue;
      var gap = parseInt(p.slice(0, -1), 36), id = parseInt(p.slice(-1), 36);
      if (!(gap > 0) || !(id >= 0) || id >= NB) continue;
      at += gap;
      if (at >= N) break;
      world[at] = id; n++;
    }
    return n;
  }

  /* ---------- painting the blocks ----------
     Each block is painted once into a hidden canvas. Sizes are measured in sixteenths of a block (u), so the art
     looks the same however big the blocks are on screen. */
  function rr(c, x, y, w, hh, r) {
    r = Math.min(r, w / 2, hh / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r);
    c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function paint(c, id, v, S) {
    var u = S / 16, rnd = seeded(id * 977 + v * 131 + 3), k;
    function R(a, b) { return a + rnd() * (b - a); }
    function rect(col, x, y, w, hh) { c.fillStyle = col; c.fillRect(x * u, y * u, w * u, hh * u); }
    function dot(col, x, y, r) { c.fillStyle = col; c.beginPath(); c.arc(x * u, y * u, r * u, 0, Math.PI * 2); c.fill(); }
    function oval(col, x, y, rx, ry, rot) { c.fillStyle = col; c.beginPath(); c.ellipse(x * u, y * u, rx * u, ry * u, rot || 0, 0, Math.PI * 2); c.fill(); }
    function box(col, x, y, w, hh, r) { c.fillStyle = col; rr(c, x * u, y * u, w * u, hh * u, r * u); c.fill(); }
    function line(col, wd, pts) {
      c.strokeStyle = col; c.lineWidth = wd * u; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(pts[0] * u, pts[1] * u);
      for (var q = 2; q < pts.length; q += 2) c.lineTo(pts[q] * u, pts[q + 1] * u);
      c.stroke();
    }
    function bevel(a, b) { rect('rgba(255,255,255,' + a + ')', 0, 0, 16, 1); rect('rgba(0,0,0,' + b + ')', 0, 15, 16, 1); }
    function stone() {
      rect('#7f8898', 0, 0, 16, 16);
      var j = v * 0.7;
      box('#9aa3b2', 0.8, 0.8 + j * 0.4, 8.2, 6.4 - j * 0.4, 2); box('#8790a0', 9.6, 1.4, 5.6, 5.2 + j, 2);
      box('#929bab', 1.6 + j * 0.6, 8.2, 6.4, 6.6, 2); box('#8a93a3', 8.8, 7.6 + j * 0.5, 6.4, 7.6 - j * 0.5, 2);
      rect('rgba(255,255,255,0.16)', 1.6, 1.2 + j * 0.4, 6, 0.8);
      for (var q = 0; q < 4; q++) dot('#6c7586', R(2, 14), R(2, 14), R(0.4, 0.7));
    }
    switch (id) {
      case DIRT:
        rect('#9a6437', 0, 0, 16, 16);
        for (k = 0; k < 6; k++) oval(['#7f4f2a', '#b27a47', '#87572f'][k % 3], R(2, 14), R(2, 14), R(1, 1.8), R(0.7, 1.2), R(0, 3));
        for (k = 0; k < 4; k++) dot('#c48d5c', R(1, 15), R(1, 15), 0.45);
        bevel(0.1, 0.18);
        break;
      case GRASS:
        paint(c, DIRT, v, S);
        c.fillStyle = '#3fb65d'; c.beginPath(); c.moveTo(0, 0); c.lineTo(16 * u, 0); c.lineTo(16 * u, 4.6 * u);
        for (k = 0; k < 6; k++) {
          var gx0 = 16 - k * 16 / 6, gx1 = gx0 - 16 / 6, deep = (k + v) % 2 ? R(6, 7.6) : R(4.6, 5.4);
          c.quadraticCurveTo((gx0 + gx1) / 2 * u, deep * u, gx1 * u, 4.6 * u);
        }
        c.closePath(); c.fill();
        rect('#6fd987', 0, 0, 16, 1.5);
        for (k = 0; k < 3; k++) dot('#2f9a4c', R(2, 14), R(2.6, 3.6), 0.5);
        break;
      case STONE: stone(); bevel(0.12, 0.2); break;
      case DEEP:
        rect('#3a344d', 0, 0, 16, 16);
        for (k = 0; k < 6; k++) line('#2a2539', 1.1, [k * 4 - 6, 16, k * 4 + 2, 0]);
        for (k = 0; k < 5; k++) dot('#554c71', R(1, 15), R(1, 15), R(0.5, 0.9));
        bevel(0.05, 0.25);
        break;
      case WOOD:
        rect('#8c5b33', 0, 0, 16, 16);
        rect('#a8743f', 3.5 + v, 0, 1.4, 16); rect('#a8743f', 10.5 - v, 0, 1, 16);
        rect('#6e4426', 1.5, 0, 1, 16); rect('#6e4426', 7, R(0, 4), 1.1, R(8, 12)); rect('#6e4426', 13, R(3, 7), 1, R(7, 12));
        var kx = R(5, 11), ky = R(5, 11);
        oval('#6e4426', kx, ky, 1.3, 0.9); oval('#a8743f', kx, ky, 0.6, 0.35);
        break;
      case LEAVES:
        rect('#279a58', 0, 0, 16, 16);
        for (k = 0; k < 7; k++) dot('#3cbc70', R(1, 15), R(1, 15), R(2, 3.2));
        for (k = 0; k < 5; k++) dot('#1d7f47', R(1, 15), R(1, 15), R(1.3, 2.2));
        for (k = 0; k < 4; k++) dot('#79e09f', R(2, 14), R(2, 14), R(0.6, 0.9));
        break;
      case SAND:
        rect('#f0d18a', 0, 0, 16, 16);
        for (k = 0; k < 10; k++) dot('#d9b465', R(1, 15), R(1, 15), 0.55);
        for (k = 0; k < 6; k++) dot('#fbe6b0', R(1, 15), R(1, 15), 0.5);
        bevel(0.15, 0.12);
        break;
      case WATER:
        if (v === 0) {
          rect('rgba(48,142,240,0.6)', 0, 0, 16, 16);
          rect('rgba(160,215,255,0.22)', R(1, 8), R(3, 6), 4, 0.6); rect('rgba(160,215,255,0.22)', R(6, 11), R(9, 13), 4, 0.6);
        } else {
          var f = v - 1, pts = [], x;
          for (x = 0; x <= 16; x++) pts.push(x, 2.6 + 0.9 * Math.sin((x / 16) * Math.PI * 2 + f * Math.PI / 2));
          c.fillStyle = 'rgba(48,142,240,0.6)'; c.beginPath(); c.moveTo(0, 16 * u);
          for (x = 0; x < pts.length; x += 2) c.lineTo(pts[x] * u, pts[x + 1] * u);
          c.lineTo(16 * u, 16 * u); c.closePath(); c.fill();
          line('rgba(210,240,255,0.85)', 0.9, pts);
        }
        break;
      case PLANKS:
        rect('#d79c58', 0, 0, 16, 16);
        rect('#a8743a', 0, 7.5, 16, 1);
        rect('#a8743a', v ? 5 : 10, 0, 1, 7.5); rect('#a8743a', v ? 11 : 4, 8.5, 1, 7.5);
        rect('#e8b574', 1, 2.5, 6, 0.5); rect('#e8b574', 9, 4.5, 5, 0.5); rect('#e8b574', 3, 11, 7, 0.5); rect('#e8b574', 11, 13, 4, 0.5);
        dot('#7a5128', 1.5, 1.6, 0.55); dot('#7a5128', 14.5, 1.6, 0.55); dot('#7a5128', 1.5, 9.8, 0.55); dot('#7a5128', 14.5, 9.8, 0.55);
        bevel(0.18, 0.2);
        break;
      case GLASS:
        rect('rgba(185,232,255,0.2)', 0, 0, 16, 16);
        c.strokeStyle = '#e4f6ff'; c.lineWidth = 1.2 * u; c.strokeRect(0.6 * u, 0.6 * u, 14.8 * u, 14.8 * u);
        line('rgba(255,255,255,0.8)', 1.1, [3.5, 9.5, 9.5, 3.5]); line('rgba(255,255,255,0.55)', 0.7, [6.5, 12, 12, 6.5]);
        break;
      case BRICK:
        rect('#f0d5bf', 0, 0, 16, 16);
        for (k = 0; k < 4; k++) {
          var off = k % 2 ? -4 : 0;
          for (var bx = off; bx < 16; bx += 8) box(['#e0604c', '#d4513f', '#e86d58'][(k + bx / 8 + 3) % 3 | 0], bx + 0.5, k * 4 + 0.5, 7, 3.1, 0.6);
        }
        bevel(0.12, 0.15);
        break;
      case TORCH:
        box('#8c5b33', 7, 7, 2, 9, 0.6); rect('#6e4426', 7, 9, 2, 0.8);
        var top = v ? 0.6 : 1.4, wob = v ? 0.4 : -0.3;
        c.fillStyle = '#ff9f1c'; c.beginPath(); c.moveTo((8 + wob) * u, top * u);
        c.quadraticCurveTo(11.6 * u, 5 * u, 8 * u, 7.8 * u); c.quadraticCurveTo(4.4 * u, 5 * u, (8 + wob) * u, top * u); c.fill();
        c.fillStyle = '#ffe27a'; c.beginPath(); c.moveTo((8 + wob * 0.5) * u, (top + 2.4) * u);
        c.quadraticCurveTo(10 * u, 5.8 * u, 8 * u, 7.4 * u); c.quadraticCurveTo(6 * u, 5.8 * u, (8 + wob * 0.5) * u, (top + 2.4) * u); c.fill();
        break;
      case COAL:
        stone();
        for (k = 0; k < 4; k++) { var cx = R(1, 10), cy = R(1, 10); box('#25282f', cx, cy, R(3.4, 4.8), R(2.8, 4), 1.2); dot('#555b68', cx + 1, cy + 0.9, 0.55); }
        bevel(0.12, 0.2);
        break;
      case COPPER:
        stone();
        for (k = 0; k < 4; k++) { var ux = R(1, 10.5), uy = R(1, 10.5); box('#e3873f', ux, uy, R(3, 4.4), R(2.4, 3.4), 1.2); dot('#ffc896', ux + 0.9, uy + 0.8, 0.55); }
        dot('#3fc9a3', R(3, 13), R(3, 13), 0.7);
        bevel(0.12, 0.2);
        break;
      case OPAL:
        stone(); rect('rgba(30,24,60,0.28)', 0, 0, 16, 16);
        var gems = ['#7fe3ff', '#ff7ad9', '#b6ff7a', '#ffd36e'];
        for (k = 0; k < 4; k++) { var ox = R(3, 13), oy = R(3, 13); oval(gems[k], ox, oy, R(1.4, 2.2), R(1, 1.5), R(0, 3)); dot('rgba(255,255,255,0.9)', ox - 0.5, oy - 0.4, 0.45); }
        bevel(0.12, 0.2);
        break;
      case BENCH:
        box('#c98a4b', 0, 0, 16, 3.4, 0.8); rect('#a86f37', 0, 2.6, 16, 0.8);
        rect('#8c5b33', 1.5, 3.4, 2, 12.6); rect('#8c5b33', 12.5, 3.4, 2, 12.6); rect('#8c5b33', 1.5, 10, 13, 1.4);
        rect('#ffc233', 4, 8.6, 5, 1.4); for (k = 0; k < 4; k++) rect('#a87a10', 4.6 + k * 1.2, 8.6, 0.3, 0.7);
        rect('#8c5b33', 10.4, 6.6, 0.8, 3.4); box('#8a93a1', 9.1, 5.8, 3.4, 1.6, 0.5);
        break;
      case DOOR_B:
      case DOOR_T:
        if (v === 0) {
          rect('#7d4e29', 0, 0, 16, 16); rect('#b8743c', 1.6, 0, 12.8, 16);
          rect('#a5652f', 5.6, 0, 0.6, 16); rect('#a5652f', 9.8, 0, 0.6, 16);
          if (id === DOOR_B) { box('#a5652f', 3.4, 1.5, 9.2, 10.5, 1); rect('#5e3a1e', 0, 15, 16, 1); dot('#ffc233', 12, 4.2, 1.1); dot('#fff1b8', 11.7, 3.9, 0.35); }
          else { box('#a5652f', 3.4, 3, 9.2, 13, 1); rect('#5e3a1e', 0, 0, 16, 1.3); }
        } else {
          /* the door swung open: you see its edge */
          rect('#7d4e29', 0, 0, 1.6, 16); rect('#b8743c', 1.6, 0, 3, 16); rect('#a5652f', 4, 0, 0.6, 16);
          if (id === DOOR_B) { rect('#5e3a1e', 0, 15, 16, 1); dot('#ffc233', 4.4, 4.2, 0.8); } else rect('#5e3a1e', 0, 0, 16, 1.3);
        }
        break;
      case CLAY:
        rect('#9ea8bf', 0, 0, 16, 16);
        c.strokeStyle = '#8691aa'; c.lineWidth = u;
        c.beginPath(); c.arc(5 * u, 6 * u, 3 * u, 0.3, 2.4); c.stroke();
        c.beginPath(); c.arc(11 * u, 11 * u, 3.4 * u, 3.4, 5.6); c.stroke();
        for (k = 0; k < 5; k++) dot('#bac3d8', R(1, 15), R(1, 15), 0.5);
        bevel(0.14, 0.16);
        break;
      case LAMP:
        box('#b8672f', 0, 0, 16, 16, 2.2);
        var g = c.createRadialGradient(8 * u, 8 * u, 0, 8 * u, 8 * u, 7 * u);
        g.addColorStop(0, '#fffbe8'); g.addColorStop(1, '#ffcf4a');
        c.fillStyle = g; rr(c, 2.2 * u, 2.2 * u, 11.6 * u, 11.6 * u, 1.8 * u); c.fill();
        rect('#b8672f', 7.3, 2, 1.4, 12); rect('#b8672f', 2, 7.3, 12, 1.4);
        dot('#ffd2a8', 1.2, 1.2, 0.5); dot('#ffd2a8', 14.8, 1.2, 0.5); dot('#ffd2a8', 1.2, 14.8, 0.5); dot('#ffd2a8', 14.8, 14.8, 0.5);
        break;
      case WATTLE:
        line('#3d8f4a', 1, [8, 16, 8, 7]); line('#3d8f4a', 0.8, [8, 11.5, 4.5, 7.5]); line('#3d8f4a', 0.8, [8, 10, 11.5, 6.5]);
        oval('#4fa65a', 6, 13, 1.8, 0.5, -0.5); oval('#4fa65a', 10, 12.5, 1.8, 0.5, 0.5);
        var puffs = [[8, 5.5], [6.4, 4], [9.8, 4.2], [4.5, 6.2], [11.5, 5.4], [5.6, 8], [10.6, 7.4], [8, 3]];
        for (k = 0; k < puffs.length; k++) dot('#ffcf1f', puffs[k][0], puffs[k][1], 1.5);
        for (k = 0; k < puffs.length; k += 2) dot('#ffe766', puffs[k][0] - 0.4, puffs[k][1] - 0.4, 0.6);
        break;
      case WALL_DIRT: paint(c, DIRT, v, S); rect('rgba(18,10,26,0.66)', 0, 0, 16, 16); break;
      case WALL_STONE: stone(); rect('rgba(12,14,30,0.7)', 0, 0, 16, 16); break;
      case CRACK:
        var segs = [[8, 8, 6, 5], [8, 8, 11, 10], [6, 5, 4, 6], [11, 10, 13, 13], [8, 8, 9, 3], [4, 6, 2, 9], [9, 3, 12, 2], [13, 13, 15, 12], [2, 9, 3, 13], [6, 5, 5, 1]];
        var upto = [1, 3, 6, 10][v];
        for (k = 0; k < upto; k++) line('rgba(25,22,35,0.75)', 1.1, segs[k]);
        break;
    }
  }

  /* The atlas: which pictures exist and how many versions of each. Versions make the ground look less repetitive;
     water has a still body and four wave frames; torches have two flame frames; doors are shut or open. */
  var ART = [[GRASS, 2], [DIRT, 3], [STONE, 3], [WOOD, 2], [LEAVES, 2], [SAND, 2], [WATER, 5], [PLANKS, 2], [GLASS, 1],
    [BRICK, 1], [TORCH, 2], [COAL, 2], [COPPER, 2], [OPAL, 2], [DEEP, 1], [BENCH, 1], [DOOR_B, 2], [DOOR_T, 2], [CLAY, 1],
    [LAMP, 1], [WATTLE, 1], [WALL_DIRT, 2], [WALL_STONE, 2], [CRACK, 4]];
  var SLOT0 = new Int16Array(40), NVAR = new Uint8Array(40), NSLOTS = 0;
  (function () { for (var k = 0; k < ART.length; k++) { SLOT0[ART[k][0]] = NSLOTS; NVAR[ART[k][0]] = ART[k][1]; NSLOTS += ART[k][1]; } })();
  var ATLAS_COLS = 8;

  /* Every cell gets a fixed random number (0 to 255) to pick which version of a picture it shows. */
  var VARI = null;
  function variTable() {
    if (VARI) return VARI;
    VARI = new Uint8Array(N);
    for (var i = 0; i < N; i++) VARI[i] = (hash(i % WW, (i / WW) | 0, 4242) * 256) | 0;
    return VARI;
  }

  /* Light: the darkness for each light level (0 to 15, in quarter steps). */
  var MAX_DARK = 0.88, DARK = new Uint8Array(61);
  (function () { for (var k = 0; k <= 60; k++) DARK[k] = Math.round(255 * MAX_DARK * Math.pow(1 - k / 60, 1.25)); })();

  var CSS = [
    '.game-block-world { color: var(--ink); font-family: var(--font-body); }',
    '.game-block-world .bw-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; clip-path: inset(50%); overflow: hidden; white-space: nowrap; }',
    '.game-block-world .bw-device { position: relative; max-width: 1100px; margin: 0 auto; padding: 12px 14px 16px; border-radius: 30px; background: linear-gradient(180deg, var(--surface-2), var(--bg-2)); border: 1px solid var(--line); box-shadow: 0 24px 60px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08); }',
    '.game-block-world .bw-cam { width: 8px; height: 8px; border-radius: 50%; margin: 0 auto 8px; background: #0b0d11; box-shadow: inset 0 0 0 2px rgba(255,255,255,.07); }',
    '.game-block-world .bw-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }',
    '.game-block-world .bw-bar .btn { min-height: 44px; padding: .4rem .95rem; }',
    '.game-block-world .bw-bar .btn[aria-pressed="true"] { background: var(--era); border-color: var(--era); color: var(--on-era); }',
    '.game-block-world .bw-saved { margin-left: auto; font-size: .85rem; font-weight: 600; color: var(--ink-muted); }',
    '.game-block-world .bw-screen { position: relative; border-radius: 16px; overflow: hidden; background: #0b0d12; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); }',
    '.game-block-world .bw-canvas { display: block; width: 100%; height: 420px; touch-action: auto; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: crosshair; outline: none; }',
    '.game-block-world .bw-canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }',
    '.game-block-world .is-running .bw-canvas { touch-action: none; }',
    '.game-block-world .bw-cardwrap { position: absolute; inset: 0; display: grid; place-items: center; padding: 12px; background: linear-gradient(180deg, rgba(21,23,28,.05), rgba(21,23,28,.5)); }',
    '.game-block-world .bw-card { width: 100%; max-width: 30rem; max-height: 100%; overflow: auto; display: grid; gap: .6rem; justify-items: center; text-align: center; padding: 1rem 1.2rem 1.1rem; border-radius: 22px; background: color-mix(in srgb, var(--surface) 94%, transparent); border: 2px solid var(--line); box-shadow: 0 18px 40px rgba(0,0,0,.45); }',
    '.game-block-world .bw-title { margin: 0; font-family: var(--font-poster); font-weight: 700; font-size: clamp(1.9rem, 1.4rem + 2.2vw, 2.8rem); line-height: 1; letter-spacing: -.01em; }',
    '.game-block-world .bw-title span:first-child { color: var(--era); }',
    '.game-block-world .bw-title span + span { color: var(--gold); }',
    '.game-block-world .bw-lede { margin: 0; color: var(--ink-muted); line-height: 1.35; }',
    '.game-block-world .bw-hint { margin: 0; font-size: .92rem; line-height: 1.35; color: var(--ink); min-height: 2.5em; }',
    '.game-block-world .bw-seed { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: .5rem; font-weight: 700; }',
    '.game-block-world .bw-seed input { width: 6.5rem; min-height: 44px; padding: .3rem .8rem; border-radius: 999px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); font: inherit; font-weight: 700; text-align: center; }',
    '.game-block-world .bw-seed input:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }',
    '.game-block-world .bw-go { display: flex; flex-wrap: wrap; gap: .6rem; justify-content: center; }',
    '.game-block-world .bw-big { min-height: 52px; font-size: 1.12rem; padding: .5rem 1.5rem; }',
    '.game-block-world .bw-small { margin: 0; font-size: .85rem; color: var(--ink-muted); line-height: 1.35; }',
    '.game-block-world .bw-panel { position: absolute; inset: 0; overflow: auto; padding: 14px 16px 18px; background: var(--bg); }',
    '.game-block-world .bw-panel[hidden], .game-block-world .bw-cardwrap[hidden] { display: none; }',
    '.game-block-world .bw-phead { display: flex; align-items: center; justify-content: space-between; gap: .6rem; margin-bottom: .5rem; }',
    '.game-block-world .bw-panel h3 { margin: 0; font-size: 1.35rem; }',
    '.game-block-world .bw-panel h4 { margin: 1rem 0 .4rem; font-size: 1.1rem; }',
    '.game-block-world .bw-panel p { margin: .2rem 0 .6rem; color: var(--ink-muted); line-height: 1.4; }',
    '.game-block-world .bw-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); gap: 8px; }',
    '.game-block-world .bw-item { display: grid; justify-items: center; align-content: center; gap: 3px; min-height: 78px; padding: 8px 4px; border-radius: 14px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); font: inherit; font-weight: 700; font-size: .82rem; line-height: 1.1; cursor: pointer; }',
    '.game-block-world .bw-item:hover, .game-block-world .bw-item:focus-visible { border-color: var(--gold); }',
    '.game-block-world .bw-item img, .game-block-world .bw-recipe img { width: 36px; height: 36px; }',
    '.game-block-world .bw-item .bw-cnt { color: var(--ink-muted); font-weight: 600; }',
    '.game-block-world .bw-recipes { display: grid; gap: 8px; }',
    '.game-block-world .bw-recipe { display: flex; align-items: center; gap: .7rem; padding: 8px 10px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface-2); }',
    '.game-block-world .bw-recipe img { flex: none; }',
    '.game-block-world .bw-rtext { flex: 1; min-width: 0; line-height: 1.25; font-weight: 700; }',
    '.game-block-world .bw-rtext small { display: block; font-weight: 500; color: var(--ink-muted); }',
    '.game-block-world .bw-goals { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }',
    '.game-block-world .bw-goals li { display: flex; gap: .65rem; align-items: flex-start; padding: 8px 10px; border-radius: 12px; background: var(--surface-2); line-height: 1.3; }',
    '.game-block-world .bw-goals li small { display: block; color: var(--ink-muted); }',
    '.game-block-world .bw-tick { flex: none; width: 1.7rem; height: 1.7rem; border-radius: 50%; display: grid; place-items: center; border: 2px solid var(--line); font-weight: 800; }',
    '.game-block-world .bw-goals li.done .bw-tick { background: var(--era); border-color: var(--era); color: var(--on-era); }',
    '.game-block-world .bw-hotbar { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px; max-width: 660px; margin: 12px auto 0; }',
    '.game-block-world .bw-slot { position: relative; aspect-ratio: 1; min-height: 44px; padding: 0; display: grid; place-items: center; border-radius: 12px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); font: inherit; cursor: pointer; touch-action: manipulation; transition: transform .1s; }',
    '.game-block-world .bw-slot img { width: 60%; height: 60%; pointer-events: none; }',
    '.game-block-world .bw-slot[aria-pressed="true"] { border-color: var(--gold); box-shadow: 0 0 0 2px var(--gold), 0 4px 0 var(--gold-shadow); transform: translateY(-2px); }',
    '.game-block-world .bw-slot .bw-n { position: absolute; right: 5px; bottom: 2px; font-size: .78rem; font-weight: 800; text-shadow: 0 1px 0 rgba(0,0,0,.6); }',
    '.game-block-world .bw-slot .bw-k { position: absolute; left: 6px; top: 2px; font-size: .68rem; font-weight: 700; color: var(--ink-muted); }',
    '.game-block-world .bw-slot.empty img { visibility: hidden; }',
    '.game-block-world .bw-slot.zero img { opacity: .3; }',
    '.game-block-world .bw-bagslot { font-weight: 800; font-size: .85rem; border-style: dashed; }',
    '.game-block-world .bw-pad { display: flex; align-items: center; justify-content: space-between; gap: 8px; max-width: 660px; margin: 12px auto 0; }',
    '.game-block-world .bw-grp { display: flex; gap: 6px; }',
    '.game-block-world .bw-arrow { width: 56px; height: 52px; padding: 0; display: grid; place-items: center; border-radius: 16px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.25rem; cursor: pointer; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }',
    '.game-block-world .bw-arrow.on { background: var(--era); border-color: var(--era); color: var(--on-era); }',
    '.game-block-world .bw-tool button { min-height: 52px; min-width: 58px; padding: .3rem .8rem; font: inherit; font-weight: 800; line-height: 1.05; display: grid; place-items: center; gap: 1px; }',
    '.game-block-world .bw-tool svg { width: 20px; height: 20px; }',
    '.game-block-world .bw-device.is-card .bw-off { opacity: .45; }',
    '@media (max-width: 560px) {',
    '  .game-block-world .bw-device { padding: 8px 8px 12px; border-radius: 20px; }',
    '  .game-block-world .bw-cam { margin-bottom: 6px; }',
    '  .game-block-world .bw-bar { gap: 6px; }',
    '  .game-block-world .bw-bar .btn { padding: .3rem .75rem; font-size: .95rem; }',
    '  .game-block-world .bw-hotbar { grid-template-columns: repeat(5, minmax(0, 1fr)); max-width: 340px; }',
    '  .game-block-world .bw-pad { gap: 6px; }',
    '  .game-block-world .bw-arrow { width: 42px; height: 48px; font-size: 1.1rem; border-radius: 13px; }',
    '  .game-block-world .bw-grp { gap: 5px; }',
    '  .game-block-world .bw-tool { flex: none; }',
    '  .game-block-world .bw-tool button { min-width: 48px; padding: .2rem .4rem; font-size: .85rem; }',
    '  .game-block-world .bw-card { padding: .7rem .7rem .8rem; gap: .45rem; }',
    '  .game-block-world .bw-lede { display: none; }',
    '  .game-block-world .bw-big { min-height: 48px; font-size: 1.02rem; padding: .4rem 1.1rem; }',
    '}',
    '@media (max-width: 350px) {',
    '  .game-block-world .bw-arrow { width: 38px; }',
    '  .game-block-world .bw-tool button { min-width: 42px; padding: .2rem .3rem; font-size: .78rem; }',
    '  .game-block-world .bw-bar .btn { padding: .3rem .6rem; }',
    '}'
  ].join('\n');

  GamesInTime.register({
    id: 'block-world',
    frame: 'none',
    mount: function (root, api) {
      var h = api.h;
      var reduced = !!api.reducedMotion;
      var destroyed = false;
      function tone(f, d, type, vol) { if (api.tone) api.tone(f, d, type, vol); }

      /* ================= the page: a flat 2010s tablet ================= */
      root.appendChild(h('style', null, CSS));
      var uid = 'bw' + Math.floor(api.random() * 1e6);

      var btnMenu = h('button', { class: 'btn', type: 'button', onclick: function () { openCard(); } }, 'Menu');
      var btnBag = h('button', { class: 'btn bw-off', type: 'button', 'aria-pressed': 'false', onclick: function () { togglePanel('bag'); } }, 'Bag');
      var btnGoals = h('button', { class: 'btn bw-off', type: 'button', 'aria-pressed': 'false', onclick: function () { togglePanel('goals'); } }, 'Goals');
      var btnHome = h('button', { class: 'btn bw-off', type: 'button', onclick: function () { goHome(); focusGame(); } }, 'Home');
      var btnTime = h('button', { class: 'btn bw-off', type: 'button', onclick: function () { skipTime(); focusGame(); } }, 'Skip to night');
      var btnFly = h('button', { class: 'btn bw-off', type: 'button', 'aria-pressed': 'true', hidden: true, onclick: function () { toggleFly(); focusGame(); } }, 'Fly');
      var savedEl = h('span', { class: 'bw-saved' }, '');
      var bar = h('div', { class: 'bw-bar' }, btnMenu, btnBag, btnGoals, btnHome, btnTime, btnFly, savedEl);

      var canvas = h('canvas', { class: 'bw-canvas', role: 'img', tabindex: '0', 'aria-label': 'Block World. A side-on world of grass, dirt, stone and trees.' });

      /* the start card */
      var modeBtns = {};
      var modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Mode' },
        ['explore', 'creative'].map(function (m) {
          modeBtns[m] = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setMode(m); } }, m === 'explore' ? 'Explore' : 'Creative');
          return modeBtns[m];
        }));
      var modeHint = h('p', { class: 'bw-hint' }, '');
      var seedInput = h('input', { id: uid + '-seed', type: 'text', inputmode: 'numeric', autocomplete: 'off', maxlength: '5', 'aria-describedby': uid + '-seednote' });
      var diceBtn = h('button', { class: 'btn', type: 'button', onclick: function () { seedInput.value = String(1 + Math.floor(api.random() * 99999)); onSeedInput(); } }, 'Random');
      var contBtn = h('button', { class: 'btn btn-primary bw-big', type: 'button', onclick: function () { startPlay(true); } }, '▶ Continue');
      var newBtn = h('button', { class: 'btn bw-big', type: 'button', onclick: function () { onNewWorld(); } }, 'New world');
      var card = h('div', { class: 'bw-card', role: 'group', 'aria-label': 'Start Block World' },
        h('h3', { class: 'bw-title' }, h('span', null, 'Block'), ' ', h('span', null, 'World')),
        h('p', { class: 'bw-lede' }, 'Dig, collect and build in a world grown from one number.'),
        modeSeg, modeHint,
        h('div', { class: 'bw-seed' }, h('label', { for: uid + '-seed' }, 'World number'), seedInput, diceBtn),
        h('div', { class: 'bw-go' }, contBtn, newBtn),
        h('p', { class: 'bw-small', id: uid + '-seednote' }, 'Same number, same world. Give your class one number and everyone explores the same hills.'));
      var cardWrap = h('div', { class: 'bw-cardwrap' }, card);
      var panelEl = h('div', { class: 'bw-panel', role: 'region', hidden: true });
      var screenEl = h('div', { class: 'bw-screen' }, canvas, cardWrap, panelEl);

      /* the hotbar: nine blocks to hold, and the Bag */
      var slotEls = [], slotImg = [], slotN = [], slotSrc = [];
      var hotbarEl = h('div', { class: 'bw-hotbar', role: 'group', 'aria-label': 'Hotbar' });
      for (var si = 0; si < 9; si++) {
        (function (k) {
          slotImg[k] = h('img', { alt: '', draggable: 'false' });
          slotN[k] = h('span', { class: 'bw-n', 'aria-hidden': 'true' });
          slotEls[k] = h('button', { class: 'bw-slot bw-off', type: 'button', 'aria-pressed': 'false', onclick: function () { selectSlot(k); focusGame(); } },
            slotImg[k], slotN[k], h('span', { class: 'bw-k', 'aria-hidden': 'true' }, String(k + 1)));
          slotSrc[k] = '';
          hotbarEl.appendChild(slotEls[k]);
        })(si);
      }
      var bagSlot = h('button', { class: 'bw-slot bw-bagslot bw-off', type: 'button', 'aria-label': 'Open the Bag', onclick: function () { togglePanel('bag'); } }, 'Bag');
      hotbarEl.appendChild(bagSlot);

      /* the touch pad: walk, jump, and the dig or place switch */
      var pad = { left: false, right: false, up: false, down: false };
      var padBtns = [];
      function padBtn(label, glyph, key) {
        var b = h('button', { class: 'bw-arrow bw-off', type: 'button', 'aria-label': label }, glyph);
        function on(e) {
          if (e.button > 0 || state !== 'play') return;
          e.preventDefault();
          api.unlockSound();
          pad[key] = true; b.classList.add('on');
          try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        }
        function off() { pad[key] = false; b.classList.remove('on'); }
        b.addEventListener('pointerdown', on);
        b.addEventListener('pointerup', off);
        b.addEventListener('pointercancel', off);
        b.addEventListener('lostpointercapture', off);
        b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        padBtns.push(b);
        return b;
      }
      function toolIcon(kind) {
        var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
        s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('fill', 'none');
        s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2.2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
        var p = document.createElementNS(ns, 'path');
        /* dig: a garden spade. place: a block with a plus. */
        p.setAttribute('d', kind === 'dig' ? 'M5 19l7-7M10.5 13.5l-2-2 4.5-4.5a3 3 0 0 1 4.2 0l.8.8a3 3 0 0 1 0 4.2L13.5 16.5z' : 'M4 7h13v13H4zM20 3v6M17 6h6');
        s.appendChild(p);
        return s;
      }
      var digBtn = h('button', { type: 'button', 'aria-pressed': 'true', onclick: function () { setTool(true); } }, toolIcon('dig'), 'Dig');
      var placeBtn = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setTool(false); } }, toolIcon('place'), 'Place');
      var toolSeg = h('div', { class: 'seg bw-tool bw-off', role: 'group', 'aria-label': 'What a tap does' }, digBtn, placeBtn);
      var padEl = h('div', { class: 'bw-pad' },
        h('div', { class: 'bw-grp' }, padBtn('Walk left', '◀', 'left'), padBtn('Walk right', '▶', 'right')),
        toolSeg,
        h('div', { class: 'bw-grp' }, padBtn('Swim or fly down', '▼', 'down'), padBtn('Jump, swim or fly up', '▲', 'up')));

      var device = h('div', { class: 'bw-device is-card' }, h('div', { class: 'bw-cam', 'aria-hidden': 'true' }), bar, screenEl, hotbarEl, padEl);
      var note = h('p', { class: 'game-note' }, 'Mouse: left button digs (hold it), right button places. Touch: pick Dig or Place, then tap the world; use the arrows to walk and jump. Keyboard: A and D or the arrow keys walk, W, Up or Space jumps, S or Down swims down. 1 to 9 pick a block. Aim with I, J, K and L, then X digs and C places. E opens the Bag, G the goals, Q switches Dig and Place, F flies in Creative.');
      root.appendChild(device);
      root.appendChild(note);

      var ctx = canvas.getContext('2d');

      /* ================= game state ================= */
      var state = 'card';            // 'card' (the start card is showing) or 'play'
      var panel = null;              // null, 'bag' or 'goals'
      var mode = api.store.get('mode', 'explore') === 'creative' ? 'creative' : 'explore';
      var seed = 1;
      var world = null, gen = null, surf = null, vari = variTable();
      var sky = new Uint8Array(N), blk = new Uint8Array(N);   // light from the sky and from torches, 0 to 15
      var inv = new Int32Array(NB);  // Explore: how many of each block you carry
      var hotbar = [0, 0, 0, 0, 0, 0, 0, 0, 0], sel = 0;
      var done = {};
      var clock = 0, warpTo = -1;    // seconds since this world began; warpTo: fast-forwarding to this time
      var spawnX = 0;
      var P = { x: 0, y: 0, vx: 0, vy: 0, ground: false, water: false, face: 1, walk: 0, fly: false, jumpBuf: 0, coyote: 0, autoCool: 0, swing: 0, digging: false };
      var keys = { left: false, right: false, up: false, down: false };
      var digTool = true;            // the Dig or Place switch: what a tap or a left click does
      var dig = { cell: -1, t: 0, need: 1, stage: 0 };
      var pointer = { down: false, id: -1, act: 'dig', c: -1, r: -1, last: -1 };
      var hover = { on: false, c: 0, r: 0 };
      var aimMode = 'none', aimDX = 1, aimDY = 0, keyDig = false;
      var tgt = { ok: false, c: 0, r: 0, i: 0, near: false };
      var pending = { i: -1, id: 0, until: 0 };   // a block waiting to go under your feet once you hop up
      var lightDirty = true, lightMs = 0, changedSinceSave = false, saveTimer = 0, lastSaveAt = 0;
      var tipsShown = {};
      var dayAmt = 1, nightAmt = 0, sunH = 1, duskAmt = 0, isNight = false;
      var lastStatus = '', lastAria = '', infoTimer = 0, dataTimer = 0, checkTimer = 0, simAcc = 0, simTickNo = 0;
      var playT = 0;                 // seconds of play, for animations

      /* canvas sizes, in device pixels. Td is the size of one block on screen. */
      var dpr = 1, cw = 300, ch = 300, cssW = 300, Td = 0, camX = 0, camY = 0, camFX = 0, camFY = 0;
      var FONT = 'sans-serif', HUD_FONT = '600 14px sans-serif', BIG_FONT = '700 18px sans-serif';
      var atlas = document.createElement('canvas'), SX = new Int32Array(NSLOTS), SY = new Int32Array(NSLOTS);
      var skyCv = document.createElement('canvas'), skyKey = -1;
      skyCv.width = 1; skyCv.height = 64;
      var hillCv = [document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas')];
      var cloudCv = [document.createElement('canvas'), document.createElement('canvas')];
      var torchGlow = document.createElement('canvas'), flyGlow = document.createElement('canvas');
      var lightCv = document.createElement('canvas'), lightCtx = lightCv.getContext('2d'), lightImg = null, LW = 0, LH = 0;
      var stripW = 1, stripH = 1, DASH = [6, 4], NO_DASH = [];
      var ICON = [];

      /* little effects: pools of objects made once and reused, so nothing new is made while you play */
      var PARTS = [], PMAX = 140, pNext = 0;
      for (var pk = 0; pk < PMAX; pk++) PARTS.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, col: '#fff', sz: 0.1 });
      var FLIES = [];
      for (var fk = 0; fk < 18; fk++) FLIES.push({ on: false, x: 0, y: 0, ph: 0, sp: 1, life: 0, ox: 0, oy: 0 });
      var FLOAT = [];
      for (var lk = 0; lk < 6; lk++) FLOAT.push({ on: false, x: 0, y: 0, t: 0, id: 0, text: '' });
      var STARS = [];
      (function () { var r = seeded(77); for (var k = 0; k < 70; k++) STARS.push({ x: r(), y: r() * 0.62, s: r() < 0.2 ? 2 : 1, a: 0.4 + r() * 0.6, p: r() * 6.28 }); })();
      var CLOUDS = [];
      (function () { var r = seeded(91); for (var k = 0; k < 6; k++) CLOUDS.push({ u: r(), y: 0.06 + r() * 0.22, sc: 0.7 + r() * 0.6, sp: 0.15 + r() * 0.25 }); })();
      var GLOWS = new Int32Array(256), glowN = 0;
      var banner = { text: '', until: 0, w: 0, lines: [] }, bannerQueue = [];

      /* water and falling sand: only cells near a change are "awake" and get checked */
      var ACT_MAX = 8192, act = new Int32Array(ACT_MAX), actCur = new Int32Array(ACT_MAX), actN = 0, inAct = new Uint8Array(N);
      /* light flood fill queue (a ring: when the end is reached it wraps round to the start) */
      var QSIZE = 1 << 18, QM = QSIZE - 1, Q = new Int32Array(QSIZE);
      /* for the house check */
      var mark = new Int32Array(N), markGen = 0, fillStack = new Int32Array(1024);

      /* ================= light ================= */
      /* Sunlight shines straight down each column until it hits something solid; leaves and water dim it.
         Then light spreads sideways and round corners, one step dimmer for each block it travels. Torches and lamps
         spread their own light the same way. Light can soak a little way into solid ground too, but it fades four
         times as fast in there, so you can see the first few blocks under the grass and the walls of a lit cave. */
      function computeLight() {
        var t0 = performance.now();
        var i, x, y, l, id, qt = 0;
        sky.fill(0); blk.fill(0);
        for (x = 0; x < WW; x++) {
          l = 15;
          for (y = 0; y < WH; y++) {
            i = y * WW + x; id = world[i];
            if (OPAQUE[id]) break;
            if (COST[id] > 1) l = l > 2 ? l - 2 : 0;
            sky[i] = l;
            if (l > 1) { Q[qt] = i; qt = (qt + 1) & QM; }
          }
        }
        spread(sky, 0, qt);
        qt = 0;
        for (i = 0; i < N; i++) { l = LIGHT[world[i]]; if (l) { blk[i] = l; Q[qt] = i; qt = (qt + 1) & QM; } }
        spread(blk, 0, qt);
        lightDirty = false;
        lightMs = performance.now() - t0;
      }
      /* The flood fill: take a lit cell off the queue, try to light each of its four neighbours a little dimmer,
         and put any neighbour that got brighter back on the queue. Stop when the queue is empty. */
      function spread(arr, qh, qt) {
        var i, l, x, n, id;
        while (qh !== qt) {
          i = Q[qh]; qh = (qh + 1) & QM;
          l = arr[i];
          if (l <= 1) continue;
          x = i % WW; id = world[i];
          /* inside solid ground (but not in a glowing block) light fades by 4 for each block */
          var inside = OPAQUE[id] && !LIGHT[id];
          if (x > 0) qt = lightTo(arr, i - 1, l, inside, qt);
          if (x < WW - 1) qt = lightTo(arr, i + 1, l, inside, qt);
          if (i >= WW) qt = lightTo(arr, i - WW, l, inside, qt);
          if (i < N - WW) qt = lightTo(arr, i + WW, l, inside, qt);
        }
      }
      function lightTo(arr, n, l, inside, qt) {
        var t = world[n];
        var nl = l - (inside ? 4 : OPAQUE[t] ? 1 : COST[t]);
        if (nl > arr[n]) { arr[n] = nl; Q[qt] = n; qt = (qt + 1) & QM; }
        return qt;
      }

      /* ================= the world: loading, changing, saving ================= */
      function loadWorld(newSeed, data) {
        seed = clamp(Math.floor(newSeed) || 1, 1, 99999);
        var g = generate(seed);
        gen = g.w; surf = g.surf; spawnX = g.spawn;
        world = new Uint8Array(gen);
        inv.fill(0); hotbar = [0, 0, 0, 0, 0, 0, 0, 0, 0]; sel = 0; done = {}; clock = CYCLE * 0.08; warpTo = -1;
        actN = 0; inAct.fill(0);
        P.vx = 0; P.vy = 0; P.fly = mode === 'creative'; pending.i = -1;
        for (var k = 0; k < PMAX; k++) PARTS[k].on = false;
        for (k = 0; k < FLIES.length; k++) FLIES[k].on = false;
        bannerQueue.length = 0; banner.until = 0;
        if (data) {
          applyChanges(world, data.ch);
          if (mode === 'explore' && typeof data.inv === 'string') {
            data.inv.split(',').forEach(function (p) { var a = p.split(':'), id = +a[0], n = +a[1]; if (id > 0 && id < NB && n > 0) inv[id] = Math.min(9999, n | 0); });
          }
          if (data.hb && data.hb.length === 9) hotbar = data.hb.map(function (id) { id = id | 0; return id > 0 && id < NB && id !== DOOR_T ? id : 0; });
          sel = clamp(data.sel | 0, 0, 8);
          clock = Math.max(0, +data.clk || 0);
          String(data.done || '').split(',').forEach(function (d) { if (d) done[d] = 1; });
          if (mode === 'creative' && data.fly === 0) P.fly = false;
        } else if (mode === 'explore') {
          inv[TORCH] = 6; hotbar[0] = TORCH;
        } else {
          hotbar = CREATIVE_HOTBAR.slice();
        }
        if (data && isFinite(data.px) && isFinite(data.py) && data.px > 0 && data.px < WW && data.py > 1 && data.py < WH) { P.x = +data.px; P.y = +data.py; }
        else placeAtSpawn();
        unstick();
        computeLight();
        snapCamera();
        changedSinceSave = false;
        tipsShown = {};
        updateTime();
      }
      function placeAtSpawn() {
        P.x = spawnX + 0.5;
        var r = 0;
        while (r < WH - 1 && !SOLID[world[r * WW + spawnX]] && world[r * WW + spawnX] !== WATER) r++;
        P.y = r; P.vx = 0; P.vy = 0;
      }
      function setBlock(i, id) {
        world[i] = id;
        lightDirty = true;
        wakeAround(i);
        markChanged();
      }
      function markChanged() {
        changedSinceSave = true;
        if (!saveTimer) saveTimer = setTimeout(function () { saveTimer = 0; saveNow(); }, 1500);
        savedEl.textContent = 'Saving…';
      }
      function saveNow() {
        if (!world || state !== 'play') return;   // a preview on the start card is never saved
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; }
        var invStr = [];
        if (mode === 'explore') for (var id = 1; id < NB; id++) if (inv[id] > 0) invStr.push(id + ':' + inv[id]);
        api.store.set('world-' + mode, {
          v: 1, seed: seed, ch: encodeChanges(world, gen), inv: invStr.join(','), hb: hotbar.slice(), sel: sel,
          px: Math.round(P.x * 100) / 100, py: Math.round(P.y * 100) / 100, clk: Math.round(clock), done: Object.keys(done).join(','), fly: P.fly ? 1 : 0
        });
        api.store.set('mode', mode);
        changedSinceSave = false;
        lastSaveAt = performance.now();
        savedEl.textContent = 'Saved ✓';
      }
      function savedData(m) {
        var d = api.store.get('world-' + m, null);
        return d && typeof d === 'object' && d.seed >= 1 ? d : null;
      }

      /* ================= water and falling sand =================
         Water and sand that have just been disturbed are "awake". Every tenth of a second each awake cell gets a
         turn: sand falls if there is air or water below it; water falls, or spills sideways over an edge, or is
         pushed sideways by the water above it. Moving wakes the neighbours, so a waterfall keeps going until it
         settles, and then everything goes back to sleep. */
      function wake(i) {
        if (i < 0 || i >= N || inAct[i] || actN >= ACT_MAX) return;
        inAct[i] = 1; act[actN++] = i;
      }
      function wakeAround(i) { wake(i); wake(i - 1); wake(i + 1); wake(i - WW); wake(i + WW); }
      function simTick() {
        if (!actN) return;
        simTickNo++;
        var n = actN, k, i, id, b, tmp = actCur;
        actCur = act; act = tmp; actN = 0;
        for (k = 0; k < n; k++) inAct[actCur[k]] = 0;
        for (k = 0; k < n; k++) {
          i = actCur[k]; id = world[i];
          if (id !== SAND && id !== WATER) continue;
          b = i + WW;
          if (b >= N) continue;
          if (id === SAND) {
            if (world[b] === AIR || world[b] === WATER) { moveCell(i, b); }
            continue;
          }
          if (world[b] === AIR) { moveCell(i, b); continue; }
          if (world[b] === WATER || SOLID[world[b]]) {
            var x = i % WW, first = ((x + simTickNo) & 1) ? 1 : -1, pushed = i >= WW && world[i - WW] === WATER;
            for (var t = 0; t < 2; t++) {
              var d = t === 0 ? first : -first, s = i + d;
              if (x + d < 0 || x + d >= WW || world[s] !== AIR) continue;
              if (world[s + WW] === AIR || pushed) { moveCell(i, s); break; }
            }
          }
        }
      }
      function moveCell(from, to) {
        var id = world[from];
        world[from] = world[to]; world[to] = id;   // swap: sand sinking through water lifts the water up
        wakeAround(from); wakeAround(to);
        lightDirty = true;
        markChanged();
        if (overlapsPlayer(to % WW, (to / WW) | 0) && SOLID[id]) unstick();
      }

      /* ================= the explorer: moving and bumping ================= */
      function solidAt(c, r) {
        if (c < 0 || c >= WW || r >= WH) return true;
        if (r < 0) return false;
        return SOLID[world[r * WW + c]] === 1;
      }
      function boxHits(x0, y0, x1, y1) {
        var c0 = Math.floor(x0), c1 = Math.floor(x1 - 1e-6), r0 = Math.floor(y0), r1 = Math.floor(y1 - 1e-6);
        for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) if (solidAt(c, r)) return true;
        return false;
      }
      function overlapsPlayer(c, r) {
        return c + 1 > P.x - PW / 2 && c < P.x + PW / 2 && r + 1 > P.y - PH && r < P.y;
      }
      function unstick() {
        if (!boxHits(P.x - PW / 2, P.y - PH, P.x + PW / 2, P.y)) return;
        var baseY = P.y, k;
        for (k = 1; k <= 4; k++) { P.y = Math.floor(baseY) - (k - 1); if (!boxHits(P.x - PW / 2, P.y - PH, P.x + PW / 2, P.y)) return; }
        P.y = baseY;
        for (k = 1; k <= 3; k++) {
          var x0 = P.x;
          P.x = Math.floor(x0) + 0.5 + k; if (!boxHits(P.x - PW / 2, P.y - PH, P.x + PW / 2, P.y)) return;
          P.x = Math.floor(x0) + 0.5 - k; if (!boxHits(P.x - PW / 2, P.y - PH, P.x + PW / 2, P.y)) return;
          P.x = x0;
        }
        placeAtSpawn();
      }
      function waterAt(x, y) {
        var c = Math.floor(x), r = Math.floor(y);
        if (c < 0 || c >= WW || r < 0 || r >= WH) return false;
        return world[r * WW + c] === WATER;
      }
      function approach(v, target, step) { return v < target ? Math.min(target, v + step) : Math.max(target, v - step); }

      function physics(dt) {
        var left = keys.left || pad.left, right = keys.right || pad.right, up = keys.up || pad.up, down = keys.down || pad.down;
        var dir = (right ? 1 : 0) - (left ? 1 : 0);
        if (dir) P.face = dir;
        var wasWater = P.water;
        P.water = waterAt(P.x, P.y - PH * 0.45);
        if (P.water && !wasWater && P.vy > 4) { api.sound('whoosh'); splash(); }
        var speed = P.fly ? FLY : WALK * (P.water ? 0.6 : 1);
        P.vx = approach(P.vx, dir * speed, (P.ground || P.fly ? 42 : 24) * dt);
        if (P.fly) {
          P.vy = approach(P.vy, (down ? FLY : 0) - (up ? FLY : 0), 40 * dt);
        } else if (P.water) {
          P.vy += GRAVITY * 0.22 * dt;
          if (up) P.vy -= 26 * dt;
          if (down) P.vy += 12 * dt;
          P.vy = clamp(P.vy, -4.6, 3.2);
        } else {
          P.vy += GRAVITY * dt;
          if (P.vy > 22) P.vy = 22;
          P.jumpBuf = up ? 0.12 : Math.max(0, P.jumpBuf - dt);
          if (P.jumpBuf > 0 && P.coyote > 0) { P.vy = -JUMP; P.jumpBuf = 0; P.coyote = 0; tone(392, 0.05, 'sine', 0.03); }
        }
        if (P.autoCool > 0) P.autoCool -= dt;
        var blocked = moveX(P.vx * dt);
        if (blocked && dir && !P.fly) {
          /* walking into a step one block high hops you up it: easy on a touch screen */
          if (P.ground && P.autoCool <= 0 && stepFree(dir)) { P.vy = -JUMP * 0.92; P.autoCool = 0.3; }
          /* pushing against the bank while swimming up climbs you out of the water */
          else if (P.water && up) P.vy = -6.5;
        }
        var fallV = P.vy;
        moveY(P.vy * dt);
        if (P.ground && fallV > 14) { api.sound('thud'); }
        if (P.ground) P.coyote = 0.1; else P.coyote = Math.max(0, P.coyote - dt);
        if (P.ground && Math.abs(P.vx) > 0.2) P.walk += Math.abs(P.vx) * dt * 2.6;
      }
      function moveX(dx) {
        if (!dx) return false;
        P.x += dx;
        var y0 = P.y - PH, y1 = P.y, r0 = Math.floor(y0), r1 = Math.floor(y1 - 1e-6), c, r;
        if (dx > 0) {
          c = Math.floor(P.x + PW / 2 - 1e-6);
          for (r = r0; r <= r1; r++) if (solidAt(c, r)) { P.x = c - PW / 2 - 1e-4; P.vx = 0; return true; }
        } else {
          c = Math.floor(P.x - PW / 2);
          for (r = r0; r <= r1; r++) if (solidAt(c, r)) { P.x = c + 1 + PW / 2 + 1e-4; P.vx = 0; return true; }
        }
        return false;
      }
      function moveY(dy) {
        P.y += dy;
        var c0 = Math.floor(P.x - PW / 2), c1 = Math.floor(P.x + PW / 2 - 1e-6), c, r;
        if (dy > 0) {
          r = Math.floor(P.y - 1e-6);
          for (c = c0; c <= c1; c++) if (solidAt(c, r)) { P.y = r; P.vy = 0; break; }
        } else if (dy < 0) {
          r = Math.floor(P.y - PH);
          for (c = c0; c <= c1; c++) if (solidAt(c, r)) { P.y = r + 1 + PH; P.vy = 0; break; }
          if (P.y - PH < 0) { P.y = PH; P.vy = 0; }
        }
        r = Math.floor(P.y + 0.02);
        P.ground = false;
        if (P.vy >= 0) for (c = c0; c <= c1; c++) if (solidAt(c, r)) { P.ground = true; break; }
      }
      function stepFree(dir) {
        var fc = dir > 0 ? Math.floor(P.x + PW / 2 + 0.05) : Math.floor(P.x - PW / 2 - 0.05);
        var foot = Math.floor(P.y - 0.01);
        if (!solidAt(fc, foot) || solidAt(fc, foot - 1) || solidAt(fc, foot - 2)) return false;
        var head = Math.floor(P.y - PH - 1.05);
        return !solidAt(Math.floor(P.x - PW / 2), head) && !solidAt(Math.floor(P.x + PW / 2 - 1e-6), head);
      }

      /* ================= digging and building ================= */
      function reachOf() { return mode === 'creative' ? 8 : 5.5; }
      function updateTarget() {
        var c, r;
        tgt.ok = false;
        if (pointer.down) { c = pointer.c; r = pointer.r; }
        else if (aimMode === 'mouse' && hover.on) { c = hover.c; r = hover.r; }
        else if (aimMode === 'key') { c = Math.floor(P.x) + aimDX; r = Math.floor(P.y - 0.01) + aimDY; }
        else return;
        if (c < 0 || c >= WW || r < 0 || r >= WH) return;
        tgt.ok = true; tgt.c = c; tgt.r = r; tgt.i = r * WW + c;
        var dx = c + 0.5 - P.x, dy = r + 0.5 - (P.y - PH * 0.55);
        tgt.near = dx * dx + dy * dy <= reachOf() * reachOf();
      }
      function updateDig(dt) {
        var want = (pointer.down && pointer.act === 'dig') || keyDig;
        P.digging = false;
        if (!want || !tgt.ok) { dig.cell = -1; return; }
        if (!tgt.near) { dig.cell = -1; hint('far', 'Too far away. Walk closer.'); return; }
        var i = tgt.i, id = world[i];
        if (id === AIR || id === WATER) { dig.cell = -1; return; }
        if (B[id].hard < 0) { dig.cell = -1; hint('deep', B[id].name + ' is too hard to dig.'); return; }
        P.digging = true;
        P.face = tgt.c + 0.5 >= P.x ? 1 : -1;
        if (dig.cell !== i) { dig.cell = i; dig.t = 0; dig.stage = 0; dig.need = mode === 'creative' ? 0.1 : B[id].hard; }
        dig.t += dt;
        P.swing += dt * 16;
        var stage = dig.need > 0 ? Math.min(3, Math.floor(dig.t / dig.need * 4)) : 3;
        if (stage > dig.stage) { dig.stage = stage; tone(B[id].snd === 'hard' ? 150 + stage * 30 : 220 + stage * 40, 0.035, 'triangle', 0.05); }
        if (dig.t >= dig.need) { breakBlock(i); dig.cell = -1; }
      }
      function breakBlock(i) {
        var id = world[i], c = i % WW, r = (i / WW) | 0;
        if (id === DOOR_B || id === DOOR_T) {
          var other = id === DOOR_B ? i - WW : i + WW;
          if (other >= 0 && other < N && (world[other] === DOOR_B || world[other] === DOOR_T)) setBlock(other, AIR);
        }
        setBlock(i, AIR);
        /* dug the block you stand on? slide over it so you drop into the hole (you are thinner than a block) */
        if (P.ground && r === Math.floor(P.y + 0.02) && c >= Math.floor(P.x - PW / 2) && c <= Math.floor(P.x + PW / 2 - 1e-6)) {
          var nx = c + 0.5;
          if (!boxHits(nx - PW / 2, P.y - PH, nx + PW / 2, P.y)) P.x = nx;
        }
        if (r > 0 && world[i - WW] === WATTLE) { setBlock(i - WW, AIR); if (mode === 'explore') give(WATTLE, 1, c, r - 1); }
        burst(c, r, B[id].chip, reduced ? 4 : 9);
        var snd = B[id].snd;
        if (snd === 'hard') api.sound('clack');
        else if (snd === 'wood') { api.sound('clack'); tone(196, 0.06, 'triangle', 0.05); }
        else if (snd === 'glass') { tone(1568, 0.09, 'triangle', 0.05); api.sound('tick'); }
        else if (snd === 'leaf') api.sound('flip');
        else api.sound('thud');
        if (mode === 'explore') give(B[id].drop, 1, c, r);
        if (id === OPAL && gen[i] === OPAL) complete('opal');
        if (id === WOOD && mode === 'explore') tip('wood', 'Wood! Open the Bag to turn it into planks.');
        syncData();
      }
      function give(id, n, c, r) {
        if (!id) return;
        var had = inv[id];
        inv[id] = Math.min(9999, inv[id] + n);
        if (hotbar.indexOf(id) < 0) {
          var free = hotbar.indexOf(0);
          if (free < 0) for (var k = 0; k < 9; k++) if (hotbar[k] && inv[hotbar[k]] <= 0) { free = k; break; }
          if (free >= 0) hotbar[free] = id;
        }
        if (c != null) floater(c, r, id);
        refreshHotbar();
        if (!had) updateStatus();
      }
      function hasSupport(i) {
        var c = i % WW, r = (i / WW) | 0;
        return (c > 0 && world[i - 1] !== AIR) || (c < WW - 1 && world[i + 1] !== AIR) || (r > 0 && world[i - WW] !== AIR) || (r < WH - 1 && world[i + WW] !== AIR);
      }
      function tryPlace(c, r, quiet) {
        var i = r * WW + c, id = hotbar[sel];
        if (!id) { if (!quiet) hint('empty', mode === 'explore' ? 'Your hand is empty. Dig blocks to collect them.' : 'Pick a block from the hotbar first.'); return false; }
        if (mode === 'explore' && inv[id] <= 0) { if (!quiet) { hint('none' + id, 'No ' + B[id].name.toLowerCase() + ' left. Dig or make some more.'); api.sound('wrong'); } return false; }
        var cur = world[i];
        if (cur !== AIR && cur !== WATER && cur !== WATTLE) { if (!quiet) hint('full', 'That space is full. Place blocks in an empty space.'); return false; }
        if (cur === WATTLE && id === WATTLE) return false;
        var below = r < WH - 1 ? world[i + WW] : DEEP;
        if (id === DOOR_B) {
          if (r < 1 || (world[i - WW] !== AIR && world[i - WW] !== WATER) || !SOLID[below]) { if (!quiet) hint('door', 'A door needs two empty spaces and solid ground under it.'); return false; }
        } else if (id === WATTLE) {
          if (below !== GRASS && below !== DIRT) { if (!quiet) hint('wattle', 'Wattle grows on grass or dirt.'); return false; }
        } else if (id === TORCH) {
          if (!SOLID[below] && !(c > 0 && SOLID[world[i - 1]]) && !(c < WW - 1 && SOLID[world[i + 1]]) && !(r > surf[c])) { if (!quiet) hint('torch', 'A torch needs a wall or the ground next to it.'); return false; }
        } else if (mode === 'explore' && !hasSupport(i)) { if (!quiet) hint('float', 'Blocks need something next to them to stick to.'); return false; }
        if (SOLID[id] && overlapsPlayer(c, r)) {
          /* placing a block where you stand: hop up and put it under your feet */
          if (!P.fly && P.ground && r === Math.floor(P.y - 0.01) && !solidAt(Math.floor(P.x - PW / 2), Math.floor(P.y - PH - 1.05)) && !solidAt(Math.floor(P.x + PW / 2 - 1e-6), Math.floor(P.y - PH - 1.05))) {
            P.vy = -JUMP; P.ground = false; pending.i = i; pending.id = id; pending.until = playT + 0.6;
            return true;
          }
          if (!quiet) hint('self', 'You are standing there. Aim at your feet to build under yourself.');
          return false;
        }
        if (cur === WATTLE && mode === 'explore') give(WATTLE, 1);
        setBlock(i, id);
        if (id === DOOR_B) setBlock(i - WW, DOOR_T);
        if (mode === 'explore') { inv[id]--; refreshHotbar(); }
        if (OPAQUE[id] && below === GRASS) setBlock(i + WW, DIRT);
        if (B[id].snd === 'hard') api.sound('clack'); else if (B[id].snd === 'glass') { api.sound('click'); tone(1175, 0.06, 'triangle', 0.04); } else api.sound('pop');
        if (!reduced) burst(c, r, B[id].chip, 3);
        afterPlace(i, id);
        syncData();
        return true;
      }
      function placeAtTarget() {
        if (!tgt.ok) { hint('aim', 'Aim first: move the mouse over a space, or use I, J, K and L.'); return; }
        if (!tgt.near) { hint('far', 'Too far away. Walk closer.'); api.sound('wrong'); return; }
        tryPlace(tgt.c, tgt.r, false);
      }
      function canHold(i) { var id = world[i]; return id === AIR || id === WATER || id === WATTLE; }

      /* ================= the building challenges ================= */
      function afterPlace(i, id) {
        var c = i % WW, r = (i / WW) | 0;
        if (id === BENCH) complete('bench');
        if (id === TORCH && r > surf[c] + 3) complete('torch');
        if (SOLID[id]) {
          /* tower: count your blocks straight up and down from this one */
          var n = 1, k;
          for (k = i - WW; k >= 0 && SOLID[world[k]] && world[k] !== gen[k]; k -= WW) n++;
          for (k = i + WW; k < N && SOLID[world[k]] && world[k] !== gen[k]; k += WW) n++;
          if (n >= 10) complete('tower');
          /* bridge: your blocks side by side, each with water somewhere in the three cells under it */
          var m = 0;
          for (k = c; k >= 0 && bridgeCell(k, r); k--) m++;
          for (k = c + 1; k < WW && bridgeCell(k, r); k++) m++;
          if (m >= 6) complete('bridge');
        }
        checkHouse(i);
      }
      function bridgeCell(c, r) {
        var i = r * WW + c;
        if (!SOLID[world[i]] || world[i] === gen[i]) return false;
        for (var d = 1; d <= 3 && r + d < WH; d++) if (world[i + d * WW] === WATER) return true;
        return false;
      }
      /* A house is a small space closed in on every side. Starting from each empty cell near the block you just
         placed, we flood-fill the space (like pouring paint). If the paint escapes (more than 300 cells, or off the
         edge of the world) it is not closed in. If it stays inside, we look at the walls the paint touched: one of
         them must be a door and one must be glass, and the room must be at least 2 blocks high somewhere. */
      function roomCell(id) { return id === AIR || id === TORCH || id === WATTLE; }
      function checkHouse(i0) {
        if (done.house) return;
        var c0 = i0 % WW, r0 = (i0 / WW) | 0, dc, dr;
        markGen++;
        for (dr = -5; dr <= 5; dr++) {
          for (dc = -5; dc <= 5; dc++) {
            var c = c0 + dc, r = r0 + dr;
            if (c < 1 || c >= WW - 1 || r < 1 || r >= WH - 1) continue;
            var s = r * WW + c;
            if (mark[s] === markGen || !roomCell(world[s])) continue;
            if (fillRoom(s)) { complete('house'); return; }
          }
        }
      }
      function fillRoom(start) {
        var sp = 0, count = 0, door = false, glass = false, tall = false, escaped = false;
        var startGen = markGen;
        fillStack[sp++] = start; mark[start] = startGen;
        var cells = [];
        while (sp > 0) {
          var i = fillStack[--sp];
          count++;
          cells.push(i);
          if (count > 300) { escaped = true; break; }
          var x = i % WW, y = (i / WW) | 0;
          if (x <= 0 || x >= WW - 1 || y <= 0 || y >= WH - 1) { escaped = true; break; }
          var ns = [i - 1, i + 1, i - WW, i + WW];
          for (var k = 0; k < 4; k++) {
            var n = ns[k], id = world[n];
            if (roomCell(id)) {
              if (mark[n] !== startGen) { mark[n] = startGen; if (sp < fillStack.length) fillStack[sp++] = n; else escaped = true; }
            } else {
              if (id === DOOR_B || id === DOOR_T) door = true;
              else if (id === GLASS) glass = true;
            }
          }
        }
        if (escaped) {
          /* mark the rest of this big space so we do not fill it again */
          while (sp > 0) mark[fillStack[--sp]] = startGen;
          return false;
        }
        if (count < 2 || !door || !glass) return false;
        for (var q = 0; q < cells.length; q++) { var a = cells[q] - WW; if (a >= 0 && mark[a] === startGen && roomCell(world[a])) { tall = true; break; } }
        return tall;
      }
      function complete(id) {
        if (done[id]) return;
        var goal = null;
        for (var k = 0; k < GOALS.length; k++) if (GOALS[k].id === id) goal = GOALS[k];
        if (!goal) return;
        done[id] = 1;
        var n = Object.keys(done).length;
        var msg = 'Challenge done: ' + goal.text.replace(/\.$/, '') + '!';
        showBanner(msg);
        api.announce(msg + ' ' + n + ' of ' + GOALS.length + ' done.');
        if (n === GOALS.length) api.celebrate('Every building challenge done!');
        else if (id === 'house') api.celebrate('You built a house!');
        else if (id === 'opal') api.celebrate('You found an opal!');
        else { api.sound('bell'); tone(1047, 0.18, 'sine', 0.06); }
        markChanged();
        if (panel === 'goals') buildGoals();
      }

      /* ================= crafting ================= */
      function nearBench() {
        var pc = Math.floor(P.x), pr = Math.floor(P.y - 0.5);
        for (var r = pr - 3; r <= pr + 3; r++) for (var c = pc - 4; c <= pc + 4; c++) if (c >= 0 && c < WW && r >= 0 && r < WH && world[r * WW + c] === BENCH) return true;
        return false;
      }
      function canMake(rec) {
        if (rec.bench && !nearBench()) return false;
        for (var k = 0; k < rec.need.length; k++) if (inv[rec.need[k][0]] < rec.need[k][1]) return false;
        return true;
      }
      function make(rec) {
        if (!canMake(rec)) { api.sound('wrong'); return; }
        for (var k = 0; k < rec.need.length; k++) inv[rec.need[k][0]] -= rec.need[k][1];
        give(rec.out, rec.n);
        api.sound('coin');
        var msg = 'Made ' + rec.n + ' ' + plural(rec.out, rec.n) + '.';
        showBanner(msg);
        api.announce(msg);
        if (rec.out === PLANKS) tip('planks', 'Now make a workbench from 4 planks. Stand near it to make glass, bricks and doors.');
        markChanged();
      }
      function plural(id, n) {
        var name = B[id].name;
        if (id === PLANKS) return n === 1 ? 'plank' : 'planks';
        if (n === 1) return name.toLowerCase();
        if (id === GLASS || id === SAND || id === DIRT || id === STONE || id === WOOD || id === CLAY || id === COAL || id === COPPER || id === WATTLE || id === WATER || id === LEAVES || id === PLANKS || id === DEEP) return name.toLowerCase();
        if (id === BENCH) return 'workbenches';
        if (id === TORCH) return 'torches';
        return name.toLowerCase() + 's';
      }
      function needText(rec) {
        return 'from ' + rec.need.map(function (p) { return p[1] + ' ' + plural(p[0], p[1]); }).join(' and ');
      }

      /* ================= the hotbar, Bag and Goals ================= */
      function refreshHotbar() {
        for (var k = 0; k < 9; k++) {
          var id = hotbar[k], src = id ? ICON[id] : '';
          if (slotSrc[k] !== src) { slotSrc[k] = src; if (src) slotImg[k].src = src; else slotImg[k].removeAttribute('src'); }
          var count = id && mode === 'explore' ? inv[id] : -1;
          slotN[k].textContent = count >= 0 ? String(count) : '';
          slotEls[k].classList.toggle('empty', !id);
          slotEls[k].classList.toggle('zero', count === 0);
          slotEls[k].setAttribute('aria-pressed', String(k === sel));
          slotEls[k].setAttribute('aria-label', 'Slot ' + (k + 1) + ': ' + (id ? B[id].name + (count >= 0 ? ', ' + count : '') : 'empty'));
        }
        syncData();
      }
      function selectSlot(k) {
        if (k < 0 || k > 8) return;
        sel = k;
        refreshHotbar();
        api.sound('tick');
        var id = hotbar[k];
        if (id) showBanner(B[id].name, 1.1, true);
        updateStatus();
        if (panel === 'bag') buildBag();
      }
      function setTool(isDig) {
        digTool = isDig;
        digBtn.setAttribute('aria-pressed', String(isDig));
        placeBtn.setAttribute('aria-pressed', String(!isDig));
        api.sound('click');
        api.announce(isDig ? 'Tapping digs.' : 'Tapping places blocks.');
      }
      function togglePanel(which) {
        if (state !== 'play') return;
        if (panel === which) { closePanel(); return; }
        panel = which;
        panelEl.hidden = false;
        panelEl.setAttribute('aria-label', which === 'bag' ? 'Bag' : 'Building challenges');
        btnBag.setAttribute('aria-pressed', String(which === 'bag'));
        btnGoals.setAttribute('aria-pressed', String(which === 'goals'));
        keys.left = keys.right = keys.up = keys.down = false; keyDig = false; pointer.down = false;
        if (which === 'bag') buildBag(); else buildGoals();
        panelEl.scrollTop = 0;
        api.sound('flip');
        updateStatus();
        var first = panelEl.querySelector('button');
        if (first) try { first.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
      function closePanel() {
        if (!panel) return;
        var was = panel;
        panel = null;
        panelEl.hidden = true;
        panelEl.replaceChildren();
        btnBag.setAttribute('aria-pressed', 'false');
        btnGoals.setAttribute('aria-pressed', 'false');
        updateStatus();
        focusGame();
        if (was === 'bag') api.sound('click');
      }
      function panelHead(title) {
        return h('div', { class: 'bw-phead' }, h('h3', null, title),
          h('button', { class: 'btn', type: 'button', onclick: function () { closePanel(); } }, 'Close ✕'));
      }
      function buildBag(focusIdx) {
        var list = mode === 'creative' ? PALETTE : PALETTE.filter(function (id) { return inv[id] > 0; });
        var items = h('div', { class: 'bw-items' }, list.map(function (id) {
          var count = mode === 'explore' ? inv[id] : -1;
          return h('button', {
            class: 'bw-item', type: 'button',
            'aria-label': B[id].name + (count >= 0 ? ', ' + count : '') + '. Put it in slot ' + (sel + 1) + '.',
            onclick: function () { putInSlot(id); }
          }, h('img', { src: ICON[id], alt: '' }), h('span', null, B[id].name), count >= 0 ? h('span', { class: 'bw-cnt' }, '× ' + count) : null);
        }));
        var kids = [panelHead(mode === 'creative' ? 'Every block' : 'Bag'),
          h('p', null, mode === 'creative' ? 'As many as you like. Pick one to put it in slot ' + (sel + 1) + ' of your hotbar.' : list.length ? 'Pick a block to put it in slot ' + (sel + 1) + ' of your hotbar.' : 'Your bag is empty. Dig some blocks to collect them.'),
          items];
        if (mode === 'explore') {
          var bench = nearBench();
          kids.push(h('h4', null, 'Make'));
          kids.push(h('p', null, bench ? 'You are next to a workbench, so you can make everything.' : 'Some things need a workbench nearby. Make one from 4 planks and stand next to it.'));
          var rows = RECIPES.map(function (rec) {
            var ok = canMake(rec);
            var why = rec.bench && !bench ? 'Needs a workbench nearby.' : '';
            return h('div', { class: 'bw-recipe' }, h('img', { src: ICON[rec.out], alt: '' }),
              h('div', { class: 'bw-rtext' }, rec.n + ' ' + plural(rec.out, rec.n).replace(/^./, function (m) { return m.toUpperCase(); }), h('small', null, needText(rec) + (why ? '. ' + why : ''))),
              h('button', { class: 'btn' + (ok ? ' btn-primary' : ''), type: 'button', disabled: !ok, 'aria-label': 'Make ' + rec.n + ' ' + plural(rec.out, rec.n) + ' ' + needText(rec),
                onclick: function () { var idx = RECIPES.indexOf(rec); make(rec); buildBag(idx); } }, 'Make'));
          });
          kids.push(h('div', { class: 'bw-recipes' }, rows));
        }
        panelEl.replaceChildren.apply(panelEl, kids);
        if (focusIdx != null) {
          var btns = panelEl.querySelectorAll('.bw-recipe button');
          var b = btns[focusIdx];
          if (b && b.disabled) b = panelEl.querySelector('.bw-recipe button:not([disabled])') || panelEl.querySelector('.bw-phead button');
          if (b) try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        }
      }
      function putInSlot(id) {
        var old = hotbar.indexOf(id);
        if (old >= 0 && old !== sel) hotbar[old] = hotbar[sel];
        hotbar[sel] = id;
        refreshHotbar();
        api.sound('pop');
        api.announce(B[id].name + ' in slot ' + (sel + 1) + '.');
        closePanel();
        showBanner(B[id].name, 1.1, true);
        markChanged();
      }
      function buildGoals() {
        var n = Object.keys(done).length;
        panelEl.replaceChildren(panelHead('Building challenges'),
          h('p', null, n + ' of ' + GOALS.length + ' done. Teachers: give everyone the same world number and set one challenge for the lesson.'),
          h('ul', { class: 'bw-goals' }, GOALS.map(function (g) {
            return h('li', { class: done[g.id] ? 'done' : '' }, h('span', { class: 'bw-tick', 'aria-hidden': 'true' }, done[g.id] ? '✓' : ''),
              h('span', null, h('span', { class: 'bw-sr' }, done[g.id] ? 'Done: ' : 'Not done yet: '), g.text, h('small', null, g.hint)));
          })));
      }

      /* ================= small helpers for feedback ================= */
      /* A message across the top of the world. Urgent ones (hints, the block you picked) show at once; others wait
         their turn. */
      function showBanner(text, secs, urgent) {
        if (!urgent && banner.until > playT && banner.text !== text) { if (bannerQueue.length < 3 && bannerQueue.indexOf(text) < 0) bannerQueue.push(text); return; }
        banner.text = text; banner.until = playT + (secs || 3); banner.w = 0;
        if (state !== 'play') draw();
      }
      var hintAt = {};
      function hint(key, text) {
        if (hintAt[key] && playT - hintAt[key] < 3) return;
        hintAt[key] = playT;
        showBanner(text, 2.2, true);
      }
      function tip(key, text) {
        if (tipsShown[key]) return;
        tipsShown[key] = 1;
        showBanner(text, 4.5);
      }
      function burst(c, r, col, n) {
        for (var k = 0; k < n; k++) {
          var p = PARTS[pNext]; pNext = (pNext + 1) % PMAX;
          p.on = true; p.x = c + 0.2 + api.random() * 0.6; p.y = r + 0.2 + api.random() * 0.6;
          p.vx = (api.random() - 0.5) * 6; p.vy = -2 - api.random() * 4; p.max = p.life = 0.35 + api.random() * 0.3;
          p.col = col; p.sz = 0.1 + api.random() * 0.08;
        }
      }
      function splash() {
        if (reduced) return;
        var c = Math.floor(P.x), r = Math.floor(P.y - 0.5);
        burst(c, r, '#9ad8ff', 8);
      }
      function floater(c, r, id) {
        for (var k = 0; k < FLOAT.length; k++) {
          var f = FLOAT[k];
          if (f.on) continue;
          f.on = true; f.x = c + 0.5; f.y = r + 0.5; f.t = 0; f.id = id;
          tone(988, 0.05, 'sine', 0.05);
          return;
        }
      }
      function focusGame() { try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }

      /* ================= time of day ================= */
      function updateTime() {
        var tc = (clock / CYCLE) % 1;
        sunH = tc < DAY_PART ? Math.sin(Math.PI * tc / DAY_PART) : -Math.sin(Math.PI * (tc - DAY_PART) / (1 - DAY_PART));
        dayAmt = 0.16 + 0.84 * smooth01((sunH + 0.12) / 0.42);
        nightAmt = smooth01((-sunH - 0.02) / 0.25);
        duskAmt = sunH > -0.25 && sunH < 0.35 ? 1 - Math.abs(sunH - 0.05) / 0.3 : 0;
        if (duskAmt < 0) duskAmt = 0;
        var night = tc >= DAY_PART;
        if (night !== isNight) {
          isNight = night;
          if (state === 'play') {
            if (night) { tip('night', 'Night is falling. Torches light up the dark, and the fireflies come out.'); tone(392, 0.4, 'sine', 0.05); tone(330, 0.5, 'sine', 0.04); }
            else { api.sound('bell'); showBanner('Morning! Day ' + dayNumber() + '.', 2.5); }
            api.announce(night ? 'Night is falling.' : 'Morning.');
          }
          btnTime.textContent = night ? 'Skip to morning' : 'Skip to night';
          updateStatus();
        }
      }
      function dayNumber() { return Math.floor(clock / CYCLE) + 1; }
      function skipTime() {
        if (state !== 'play') return;
        var start = Math.floor(clock / CYCLE) * CYCLE, tc = (clock / CYCLE) % 1;
        var target = tc < DAY_PART ? start + CYCLE * (DAY_PART + 0.07) : start + CYCLE * 1.03;
        api.sound('whoosh');
        if (reduced) { clock = target; warpTo = -1; updateTime(); lightDirty = true; } else warpTo = target;
      }
      function toggleFly() {
        if (mode !== 'creative' || state !== 'play') return;
        P.fly = !P.fly;
        btnFly.setAttribute('aria-pressed', String(P.fly));
        api.sound(P.fly ? 'whoosh' : 'click');
        showBanner(P.fly ? 'Flying. Up and down arrows fly.' : 'Walking.', 1.6, true);
        markChanged();
      }
      function goHome() {
        if (state !== 'play') return;
        placeAtSpawn(); unstick(); snapCamera();
        api.sound('whoosh');
        showBanner('Back home.', 1.6, true);
      }

      /* ================= the main loop ================= */
      var rafId = 0, lastT = 0, frameMs = 0;
      function frame(now) {
        rafId = 0;
        if (destroyed || state !== 'play' || document.hidden) return;
        var dt = (now - lastT) / 1000;
        lastT = now;
        if (dt > 0.05) dt = 0.05; else if (dt < 0) dt = 0;
        update(dt);
        draw();
        frameMs = frameMs * 0.95 + (performance.now() - now) * 0.05;
        rafId = requestAnimationFrame(frame);
      }
      function startLoop() { if (rafId || destroyed) return; lastT = performance.now(); rafId = requestAnimationFrame(frame); }
      function stopLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

      function update(dt) {
        playT += dt;
        if (!panel) {
          if (warpTo >= 0) { clock += dt * 45; if (clock >= warpTo) { clock = warpTo; warpTo = -1; } }
          else clock += dt;
          physics(dt / 2); physics(dt / 2);
          updateTarget();
          updateDig(dt);
          if (pending.i >= 0) {
            var pc = pending.i % WW, pr = (pending.i / WW) | 0;
            if (!overlapsPlayer(pc, pr)) { if (hotbar[sel] === pending.id) tryPlace(pc, pr, true); pending.i = -1; }
            else if (playT > pending.until) pending.i = -1;
          }
          simAcc += dt;
          if (simAcc >= 0.1) { simAcc = 0; simTick(); }
        }
        updateTime();
        if (lightDirty) computeLight();
        followCamera(dt);
        updateEffects(dt);
        checkTimer += dt;
        if (checkTimer > 0.5) { checkTimer = 0; periodicChecks(); }
        dataTimer += dt;
        if (dataTimer > 0.25) { dataTimer = 0; syncData(); }
        if (banner.until <= playT && bannerQueue.length) { banner.text = bannerQueue.shift(); banner.until = playT + 3; banner.w = 0; }
      }
      function periodicChecks() {
        var pc = clamp(Math.floor(P.x), 0, WW - 1), pr = clamp(Math.floor(P.y - PH + 0.2), 0, WH - 1);
        if (P.y >= WH - 3.2) complete('deep');
        var flies = 0;
        for (var k = 0; k < FLIES.length; k++) if (FLIES[k].on) flies++;
        if (nightAmt > 0.6 && sky[pr * WW + pc] >= 12 && flies >= 3) complete('night');
        updateStatus();
        infoTimer += 0.5;
        if (infoTimer >= 2) { infoTimer = 0; updateAria(); }
        if (changedSinceSave && !saveTimer) saveNow();
      }

      /* ================= effects ================= */
      function updateEffects(dt) {
        var k, p;
        for (k = 0; k < PMAX; k++) {
          p = PARTS[k];
          if (!p.on) continue;
          p.life -= dt;
          if (p.life <= 0) { p.on = false; continue; }
          p.vy += 18 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        }
        for (k = 0; k < FLOAT.length; k++) {
          var f = FLOAT[k];
          if (!f.on) continue;
          f.t += dt;
          var tx = P.x, ty = P.y - PH * 0.6, a = Math.min(1, dt * 9);
          f.x += (tx - f.x) * a; f.y += (ty - f.y) * a;
          if (f.t > 0.45) f.on = false;
        }
        /* fireflies: at night they appear over the grass near you, drift, blink and fade */
        var c0 = Math.floor(camX / Td) - 2, cols = Math.ceil(cw / Td) + 4;
        for (k = 0; k < FLIES.length; k++) {
          var fl = FLIES[k];
          if (fl.on) {
            fl.life -= dt;
            fl.x = fl.ox + Math.sin(playT * fl.sp + fl.ph) * 1.2;
            fl.y = fl.oy + Math.cos(playT * fl.sp * 1.3 + fl.ph) * 0.6;
            if (fl.life <= 0 || nightAmt < 0.15 || fl.x < c0 - 4 || fl.x > c0 + cols + 4) fl.on = false;
          } else if (nightAmt > 0.3 && api.random() < dt * 2) {
            var c = clamp(c0 + Math.floor(api.random() * cols), 1, WW - 2), r = 0;
            while (r < WH - 1 && world[r * WW + c] === AIR) r++;
            var fy = r - 1 - api.random() * 3, fi = Math.floor(fy) * WW + c;
            if (fy > 1 && world[fi] === AIR && sky[fi] >= 12) {
              fl.on = true; fl.ox = c + 0.5; fl.oy = fy; fl.x = fl.ox; fl.y = fl.oy; fl.ph = api.random() * 6.28; fl.sp = 0.4 + api.random() * 0.6; fl.life = 6 + api.random() * 8;
            }
          }
        }
      }

      /* ================= the camera ================= */
      function camTarget() {
        var tx = P.x * Td - cw / 2, ty = (P.y - PH * 0.5) * Td - ch * 0.52;
        camFX = clamp(tx, 0, WW * Td - cw);
        camFY = clamp(ty, 0, WH * Td - ch);
      }
      function snapCamera() { if (!Td) return; camTarget(); camX = Math.round(camFX); camY = Math.round(camFY); camPX = camFX; camPY = camFY; }
      var camPX = 0, camPY = 0;
      function followCamera(dt) {
        camTarget();
        var a = Math.min(1, dt * 7);
        camPX += (camFX - camPX) * a; camPY += (camFY - camPY) * a;
        camX = Math.round(camPX); camY = Math.round(camPY);
      }

      /* ================= drawing ================= */
      function buildAtlas() {
        atlas.width = ATLAS_COLS * Td; atlas.height = Math.ceil(NSLOTS / ATLAS_COLS) * Td;
        var a = atlas.getContext('2d');
        a.clearRect(0, 0, atlas.width, atlas.height);
        var s = 0;
        for (var k = 0; k < ART.length; k++) {
          for (var v = 0; v < ART[k][1]; v++) {
            SX[s] = (s % ATLAS_COLS) * Td; SY[s] = Math.floor(s / ATLAS_COLS) * Td;
            a.save(); a.translate(SX[s], SY[s]); a.beginPath(); a.rect(0, 0, Td, Td); a.clip();
            paint(a, ART[k][0], v, Td);
            a.restore();
            s++;
          }
        }
      }
      function buildIcons() {
        var S = 72, cv = document.createElement('canvas');
        cv.width = cv.height = S;
        var c = cv.getContext('2d');
        for (var k = 0; k < PALETTE.length; k++) {
          var id = PALETTE[k];
          c.clearRect(0, 0, S, S);
          if (id === DOOR_B) {
            c.save(); c.translate(S * 0.25, 0); c.scale(0.5, 0.5); paint(c, DOOR_T, 0, S); c.translate(0, S); paint(c, DOOR_B, 0, S); c.restore();
          } else {
            c.save(); c.translate(S * 0.06, S * 0.06); c.scale(0.88, 0.88); paint(c, id, id === WATER ? 1 : 0, S); c.restore();
          }
          ICON[id] = cv.toDataURL('image/png');
        }
      }
      function buildSprites() {
        /* soft glows, drawn once: warm for torches, green-gold for fireflies */
        var gs = Td * 6;
        torchGlow.width = torchGlow.height = gs;
        var c = torchGlow.getContext('2d'), g = c.createRadialGradient(gs / 2, gs / 2, 0, gs / 2, gs / 2, gs / 2);
        g.addColorStop(0, 'rgba(255,190,90,0.42)'); g.addColorStop(0.4, 'rgba(255,150,60,0.14)'); g.addColorStop(1, 'rgba(255,140,40,0)');
        c.fillStyle = g; c.fillRect(0, 0, gs, gs);
        var fs = Math.max(10, Math.round(Td * 1.6));
        flyGlow.width = flyGlow.height = fs;
        c = flyGlow.getContext('2d'); g = c.createRadialGradient(fs / 2, fs / 2, 0, fs / 2, fs / 2, fs / 2);
        g.addColorStop(0, 'rgba(255,255,210,1)'); g.addColorStop(0.1, 'rgba(240,255,150,1)'); g.addColorStop(0.22, 'rgba(200,255,100,0.6)'); g.addColorStop(0.55, 'rgba(170,255,90,0.16)'); g.addColorStop(1, 'rgba(160,255,80,0)');
        c.fillStyle = g; c.fillRect(0, 0, fs, fs);
      }
      function buildBackdrop() {
        /* hills: four strips (far and near, by day and by night) whose ends join up, so they can repeat forever */
        stripW = Math.max(64, Math.round(cw * 1.6)); stripH = Math.max(16, Math.round(Td * 8));
        var specs = [['#a7c8ee', [2, 5, 11], 0.3, 0.55], ['#1e2752', [2, 5, 11], 0.3, 0.55], ['#6cbb8f', [3, 7, 13], 0.22, 0.74], ['#16283a', [3, 7, 13], 0.22, 0.74]];
        for (var k = 0; k < 4; k++) {
          var cv = hillCv[k]; cv.width = stripW; cv.height = stripH;
          var c = cv.getContext('2d'), sp = specs[k], f = sp[1];
          c.fillStyle = sp[0]; c.beginPath(); c.moveTo(0, stripH);
          for (var x0 = 0; x0 < stripW + 4; x0 += 4) {
            var x = Math.min(x0, stripW), p = x / stripW * Math.PI * 2;
            c.lineTo(x, stripH * (sp[3] - sp[2] * (0.55 * Math.sin(p * f[0] + 1.3) + 0.3 * Math.sin(p * f[1] + 0.4) + 0.15 * Math.sin(p * f[2] + 2.1))));
          }
          c.lineTo(stripW, stripH); c.closePath(); c.fill();
        }
        /* a flat cloud */
        var cwid = Math.round(Td * 5), chei = Math.round(Td * 2);
        for (k = 0; k < 2; k++) {
          var cc = cloudCv[k]; cc.width = cwid; cc.height = chei;
          var d = cc.getContext('2d'); d.fillStyle = k ? '#56608a' : '#ffffff';
          d.beginPath(); d.arc(cwid * 0.3, chei * 0.62, chei * 0.34, 0, 6.29); d.arc(cwid * 0.5, chei * 0.45, chei * 0.42, 0, 6.29); d.arc(cwid * 0.7, chei * 0.6, chei * 0.32, 0, 6.29); d.fill();
          rr(d, cwid * 0.12, chei * 0.55, cwid * 0.76, chei * 0.38, chei * 0.19); d.fill();
        }
      }
      function sizeLight() {
        LW = Math.ceil(cw / Td) + 4; LH = Math.ceil(ch / Td) + 4;
        lightCv.width = LW; lightCv.height = LH;
        lightImg = lightCtx.createImageData(LW, LH);
        var d = lightImg.data;
        for (var k = 0; k < d.length; k += 4) { d[k] = 6; d[k + 1] = 8; d[k + 2] = 22; d[k + 3] = 0; }
      }
      function mixRGB(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
      function rgbStr(c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }
      var SKY_DAY = [[61, 139, 255], [166, 218, 255]], SKY_NIGHT = [[6, 9, 26], [26, 36, 82]], SKY_DUSK = [[70, 66, 150], [255, 146, 112]];
      function updateSky() {
        var dayT = smooth01((sunH + 0.1) / 0.45), key = Math.round(dayT * 60) * 100 + Math.round(duskAmt * 40);
        if (key === skyKey) return;
        skyKey = key;
        var top = mixRGB(SKY_NIGHT[0], SKY_DAY[0], dayT), bot = mixRGB(SKY_NIGHT[1], SKY_DAY[1], dayT);
        top = mixRGB(top, SKY_DUSK[0], duskAmt * 0.5); bot = mixRGB(bot, SKY_DUSK[1], duskAmt * 0.75);
        var c = skyCv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 64);
        g.addColorStop(0, rgbStr(top)); g.addColorStop(1, rgbStr(bot));
        c.fillStyle = g; c.fillRect(0, 0, 1, 64);
      }

      function draw() {
        if (!world || !Td) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        var c0 = Math.max(0, Math.floor(camX / Td)), r0 = Math.max(0, Math.floor(camY / Td));
        var c1 = Math.min(WW - 1, Math.floor((camX + cw - 1) / Td)), r1 = Math.min(WH - 1, Math.floor((camY + ch - 1) / Td));
        /* Every cell below the ground line is covered by a block or a cave wall, so the sky only needs painting
           down to the lowest ground line on screen. Deep underground it is not painted at all. */
        skyBottom = 0;
        for (var c = c0; c <= c1; c++) { var gy = (surf[c] + 1) * Td - camY; if (gy > skyBottom) skyBottom = gy; }
        if (skyBottom > ch) skyBottom = ch;
        if (skyBottom > 0) drawSky();
        drawTiles(c0, r0, c1, r1);
        drawPlayer();
        drawParticles();
        drawLight(c0 - 1, r0 - 1, c1 - c0 + 3, r1 - r0 + 3);
        drawGlows();
        drawCursor();
        drawHud();
      }
      var skyBottom = 0;
      function drawSky() {
        updateSky();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(skyCv, 0, 0, 1, 64 * skyBottom / ch, 0, 0, cw, skyBottom);
        var k, dk = 1 - smooth01((sunH + 0.1) / 0.45);
        /* stars */
        if (nightAmt > 0.02) {
          ctx.fillStyle = '#ffffff';
          for (k = 0; k < STARS.length; k++) {
            var st = STARS[k];
            ctx.globalAlpha = nightAmt * st.a * (reduced ? 1 : 0.75 + 0.25 * Math.sin(playT * 1.7 + st.p));
            ctx.fillRect(Math.round(st.x * cw), Math.round(st.y * ch), st.s * dpr, st.s * dpr);
          }
          ctx.globalAlpha = 1;
        }
        /* the sun by day, the moon by night, rising on the left and setting on the right */
        var tc = (clock / CYCLE) % 1, rad = Td * 0.85, x, y;
        if (tc < DAY_PART) {
          var p = tc / DAY_PART;
          x = cw * (0.06 + 0.88 * p); y = ch * 0.7 - Math.sin(p * Math.PI) * ch * 0.58;
          ctx.fillStyle = '#ffd23f'; ctx.globalAlpha = 0.22; ctx.beginPath(); ctx.arc(x, y, rad * 1.7, 0, 6.2832); ctx.fill();
          ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
        } else {
          var q = (tc - DAY_PART) / (1 - DAY_PART);
          x = cw * (0.06 + 0.88 * q); y = ch * 0.7 - Math.sin(q * Math.PI) * ch * 0.58;
          ctx.fillStyle = '#eef2ff'; ctx.beginPath(); ctx.arc(x, y, rad * 0.8, 0, 6.2832); ctx.fill();
          ctx.fillStyle = '#cdd5ea'; ctx.beginPath(); ctx.arc(x - rad * 0.25, y - rad * 0.15, rad * 0.18, 0, 6.2832); ctx.arc(x + rad * 0.22, y + rad * 0.25, rad * 0.12, 0, 6.2832); ctx.fill();
        }
        /* clouds drift slowly (they stay put if you prefer less motion) */
        var VW = cw * 2.4, cyc = camY + ch / 2;
        for (k = 0; k < CLOUDS.length; k++) {
          var cl = CLOUDS[k], w = cloudCv[0].width * cl.sc, hh = cloudCv[0].height * cl.sc;
          var cx = ((cl.u * VW + (reduced ? 0 : clock * cl.sp * Td) - camX * 0.1) % VW + VW) % VW - w;
          var cy = ch * cl.y - (cyc - 40 * Td) * 0.08;
          if (cx > cw || cy > ch || cy + hh < 0) continue;
          if (cy >= skyBottom) continue;
          if (dk < 0.99) { ctx.globalAlpha = (1 - dk) * 0.95; ctx.drawImage(cloudCv[0], cx, cy, w, hh); }
          if (dk > 0.01) { ctx.globalAlpha = dk * 0.8; ctx.drawImage(cloudCv[1], cx, cy, w, hh); }
        }
        ctx.globalAlpha = 1;
        /* far and near hills move slower than the ground, which makes them feel far away (parallax) */
        drawHills(0, 0.12, 0.35, -3, dk);
        drawHills(2, 0.3, 0.6, 1, dk);
      }
      function drawHills(k, fx, fy, rowOff, dk) {
        var cyc = camY + ch / 2;
        var y = Math.round(((SEA + rowOff) * Td - cyc) * fy + ch / 2 - stripH * 0.7);
        if (y >= skyBottom) return;
        var off = -(((camX * fx) % stripW) + stripW) % stripW;
        off = Math.round(off);
        var hv = Math.min(stripH, skyBottom - y);
        /* by day only the day hills, at night only the night hills, and both mixed at dawn and dusk */
        for (var pass = 0; pass < 2; pass++) {
          var a = pass === 0 ? (dk > 0.99 ? 0 : 1) : (dk < 0.01 ? 0 : dk > 0.99 ? 1 : dk);
          if (a <= 0) continue;
          ctx.globalAlpha = a;
          var cv = hillCv[k + pass];
          ctx.drawImage(cv, 0, 0, stripW, hv, off, y, stripW, hv); ctx.drawImage(cv, 0, 0, stripW, hv, off + stripW, y, stripW, hv);
          if (y + stripH < skyBottom) { ctx.fillStyle = pass ? (k ? '#16283a' : '#1e2752') : (k ? '#6cbb8f' : '#a7c8ee'); ctx.fillRect(0, y + stripH, cw, skyBottom - y - stripH); }
        }
        ctx.globalAlpha = 1;
      }
      function drawTiles(c0, r0, c1, r1) {
        var r, c, i, id, s, dx, dy, top, wf = reduced ? 0 : Math.floor(playT * 3), tf = reduced ? 0 : Math.floor(playT * 7);
        var wallD = SLOT0[WALL_DIRT], wallS = SLOT0[WALL_STONE];
        glowN = 0;
        ctx.imageSmoothingEnabled = false;
        for (r = r0; r <= r1; r++) {
          dy = r * Td - camY;
          for (c = c0; c <= c1; c++) {
            i = r * WW + c; id = world[i]; dx = c * Td - camX;
            if (!OPAQUE[id] && r > surf[c]) {
              s = (r - surf[c] <= 4 ? wallD : wallS) + (vari[i] & 1);
              ctx.drawImage(atlas, SX[s], SY[s], Td, Td, dx, dy, Td, Td);
            }
            if (id === AIR) continue;
            if (id === WATER) {
              top = r > 0 && !SOLID[world[i - WW]] && world[i - WW] !== WATER;
              s = SLOT0[WATER] + (top ? 1 + ((wf + (c >> 1)) & 3) : 0);
            } else if (id === TORCH) {
              s = SLOT0[TORCH] + ((tf + c) & 1);
              if (glowN < GLOWS.length) GLOWS[glowN++] = i;
            } else if (id === DOOR_B || id === DOOR_T) {
              s = SLOT0[id] + (overlapsPlayer(c, r) || overlapsPlayer(c, id === DOOR_B ? r - 1 : r + 1) ? 1 : 0);
            } else {
              s = SLOT0[id] + (NVAR[id] > 1 ? vari[i] % NVAR[id] : 0);
              if (id === LAMP && glowN < GLOWS.length) GLOWS[glowN++] = i;
            }
            ctx.drawImage(atlas, SX[s], SY[s], Td, Td, dx, dy, Td, Td);
          }
        }
        drawEdges(c0, r0, c1, r1);
      }
      /* A thin dark line wherever a solid block meets open space, and a light line on its top: this makes the
         shapes of hills, caves and tunnels easy to read. */
      function drawEdges(c0, r0, c1, r1) {
        var e = Math.max(2, Math.round(Td / 14)), r, c, i, dx, dy;
        for (var pass = 0; pass < 2; pass++) {
          ctx.fillStyle = pass ? 'rgba(255,255,255,0.2)' : 'rgba(10,12,22,0.42)';
          for (r = r0; r <= r1; r++) {
            dy = r * Td - camY;
            for (c = c0; c <= c1; c++) {
              i = r * WW + c;
              if (!OPAQUE[world[i]]) continue;
              dx = c * Td - camX;
              if (pass) { if (r > 0 && !OPAQUE[world[i - WW]]) ctx.fillRect(dx, dy, Td, e); continue; }
              if (r < WH - 1 && !OPAQUE[world[i + WW]]) ctx.fillRect(dx, dy + Td - e, Td, e);
              if (c > 0 && !OPAQUE[world[i - 1]]) ctx.fillRect(dx, dy, e, Td);
              if (c < WW - 1 && !OPAQUE[world[i + 1]]) ctx.fillRect(dx + Td - e, dy, e, Td);
            }
          }
        }
      }
      /* The explorer: a kid in a yellow builder's helmet, a coral jacket and a mint backpack. Drawn with simple
         shapes each frame, flipped to face the way they walk. */
      function rrp(x, y, w, hh, r) { rr(ctx, x, y, w, hh, r); ctx.fill(); }
      function drawPlayer() {
        var s = Td, px = Math.round(P.x * Td - camX), py = Math.round(P.y * Td - camY);
        var moving = P.ground && Math.abs(P.vx) > 0.4;
        var leg = moving ? Math.sin(P.walk * 2.2) * 0.55 : (P.ground || P.fly ? 0 : 0.35);
        var bob = moving && !reduced ? Math.abs(Math.sin(P.walk * 2.2)) * 0.04 * s : 0;
        ctx.save();
        ctx.translate(px, py - bob);
        ctx.scale(P.face, 1);
        /* legs and boots */
        for (var side = -1; side <= 1; side += 2) {
          ctx.save();
          ctx.translate(side * 0.1 * s, -0.62 * s);
          ctx.rotate(side * leg);
          ctx.fillStyle = '#3a3f4b'; rrp(-0.09 * s, 0, 0.18 * s, 0.56 * s, 0.07 * s);
          ctx.fillStyle = '#23272f'; rrp(-0.1 * s, 0.5 * s, 0.25 * s, 0.13 * s, 0.05 * s);
          ctx.restore();
        }
        /* backpack, jacket, zip */
        ctx.fillStyle = '#00c9a7'; rrp(-0.34 * s, -1.24 * s, 0.17 * s, 0.5 * s, 0.07 * s);
        ctx.fillStyle = '#ff5a5f'; rrp(-0.22 * s, -1.32 * s, 0.44 * s, 0.76 * s, 0.15 * s);
        ctx.fillStyle = '#ffb3a7'; ctx.fillRect(0.05 * s, -1.22 * s, 0.035 * s, 0.56 * s);
        /* the arm: swings when walking, digs with a little spade */
        ctx.save();
        ctx.translate(0.02 * s, -1.18 * s);
        var arm = P.digging ? -1.5 + Math.sin(P.swing) * 0.7 : (moving ? -Math.sin(P.walk * 2.2) * 0.6 : 0.1);
        ctx.rotate(arm);
        ctx.fillStyle = '#e8484d'; rrp(-0.07 * s, 0, 0.14 * s, 0.48 * s, 0.07 * s);
        ctx.fillStyle = '#f1c29a'; ctx.beginPath(); ctx.arc(0, 0.5 * s, 0.075 * s, 0, 6.2832); ctx.fill();
        if (P.digging) {
          ctx.fillStyle = '#8c5b33'; ctx.fillRect(-0.025 * s, 0.45 * s, 0.05 * s, 0.38 * s);
          ctx.fillStyle = '#c9d1dc'; ctx.beginPath(); ctx.moveTo(-0.11 * s, 0.8 * s); ctx.lineTo(0.11 * s, 0.8 * s); ctx.lineTo(0, 1.02 * s); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        /* head, face and helmet */
        ctx.fillStyle = '#f1c29a'; ctx.beginPath(); ctx.arc(0.03 * s, -1.53 * s, 0.25 * s, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#23272f'; ctx.beginPath(); ctx.arc(0.15 * s, -1.54 * s, 0.037 * s, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(255,90,95,0.45)'; ctx.beginPath(); ctx.arc(0.13 * s, -1.44 * s, 0.05 * s, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#ffc233'; ctx.beginPath(); ctx.arc(0.03 * s, -1.6 * s, 0.27 * s, Math.PI, 0); ctx.fill();
        rrp(-0.2 * s, -1.63 * s, 0.6 * s, 0.08 * s, 0.04 * s);
        ctx.fillStyle = '#ffe08a'; ctx.fillRect(-0.02 * s, -1.85 * s, 0.07 * s, 0.22 * s);
        ctx.restore();
      }
      function drawParticles() {
        for (var k = 0; k < PMAX; k++) {
          var p = PARTS[k];
          if (!p.on) continue;
          ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
          ctx.fillStyle = p.col;
          var sz = Math.max(2, p.sz * Td);
          ctx.fillRect(Math.round(p.x * Td - camX - sz / 2), Math.round(p.y * Td - camY - sz / 2), sz, sz);
        }
        ctx.globalAlpha = 1;
        /* blocks you collect fly to you */
        for (k = 0; k < FLOAT.length; k++) {
          var f = FLOAT[k];
          if (!f.on) continue;
          var s = SLOT0[f.id] || 0, sz2 = Math.round(Td * 0.5);
          ctx.globalAlpha = 1 - f.t / 0.5;
          ctx.drawImage(atlas, SX[s], SY[s], Td, Td, Math.round(f.x * Td - camX - sz2 / 2), Math.round(f.y * Td - camY - sz2 / 2), sz2, sz2);
        }
        ctx.globalAlpha = 1;
      }
      /* The light overlay: one tiny pixel per block holds how dark that block is. The browser stretches this tiny
         picture over the world with smoothing turned on, which blends neighbouring blocks into soft light. */
      function drawLight(c0, r0, cols, rows) {
        if (!lightImg) return;
        cols = Math.min(cols, LW); rows = Math.min(rows, LH);
        var d = lightImg.data, rr2, cc, r, c, i, id, a, v, b, p, firstDark = -1;
        for (rr2 = 0; rr2 < rows; rr2++) {
          r = r0 + rr2;
          var rowDark = false;
          for (cc = 0; cc < cols; cc++) {
            c = c0 + cc;
            if (r < 0) a = 0;
            else {
              var cc2 = c < 0 ? 0 : c >= WW ? WW - 1 : c;
              i = (r >= WH ? WH - 1 : r) * WW + cc2; id = world[i];
              if (id === AIR && r <= surf[cc2]) {
                /* open air with the sky behind it: the sky picture already shows day or night, so only shade it
                   where something blocks the sky (under a roof, under a tree) */
                v = sky[i]; b = blk[i]; if (b > v) v = b;
                a = v >= 15 ? 0 : DARK[(v * 4) | 0];
                if (a > 80) a = 80;
              } else { v = sky[i] * dayAmt; b = blk[i]; if (b > v) v = b; a = DARK[(v * 4) | 0]; }
            }
            p = (rr2 * LW + cc) * 4 + 3;
            d[p] = a;
            if (a) rowDark = true;
          }
          if (rowDark && firstDark < 0) firstDark = rr2;
        }
        if (firstDark < 0) return;   // nothing in shadow: bright day in the open
        lightCtx.putImageData(lightImg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        /* start one row above the first shaded row, so the soft edge blends in */
        var skip = Math.max(0, firstDark - 1);
        ctx.drawImage(lightCv, 0, skip, cols, rows - skip, c0 * Td - camX, (r0 + skip) * Td - camY, cols * Td, (rows - skip) * Td);
      }
      function drawGlows() {
        ctx.globalCompositeOperation = 'lighter';
        var gs = torchGlow.width, k, i, x, y;
        for (k = 0; k < glowN; k++) {
          i = GLOWS[k];
          x = (i % WW + 0.5) * Td - camX; y = (((i / WW) | 0) + (world[i] === TORCH ? 0.3 : 0.5)) * Td - camY;
          ctx.globalAlpha = (world[i] === TORCH ? 0.8 : 0.6) * (0.45 + 0.55 * (1 - dayAmt)) * (reduced ? 1 : 0.92 + 0.08 * Math.sin(playT * 9 + i));
          ctx.drawImage(torchGlow, x - gs / 2, y - gs / 2);
        }
        if (nightAmt > 0.02) {
          var fs = flyGlow.width;
          for (k = 0; k < FLIES.length; k++) {
            var fl = FLIES[k];
            if (!fl.on) continue;
            ctx.globalAlpha = nightAmt * Math.min(1, fl.life) * (reduced ? 0.85 : 0.45 + 0.55 * Math.max(0, Math.sin(playT * 2.6 + fl.ph)));
            ctx.drawImage(flyGlow, fl.x * Td - camX - fs / 2, fl.y * Td - camY - fs / 2);
          }
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      function drawCursor() {
        if (state !== 'play' || !tgt.ok || panel) return;
        var x = tgt.c * Td - camX, y = tgt.r * Td - camY, lw = Math.max(2, Math.round(Td / 16));
        if (dig.cell === tgt.i && dig.t > 0) {
          var s = SLOT0[CRACK] + dig.stage;
          ctx.drawImage(atlas, SX[s], SY[s], Td, Td, x, y, Td, Td);
        }
        ctx.lineWidth = lw + 2; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        if (!tgt.near) ctx.setLineDash(DASH);
        ctx.strokeRect(x + lw / 2, y + lw / 2, Td - lw, Td - lw);
        ctx.lineWidth = lw; ctx.strokeStyle = tgt.near ? '#ffffff' : 'rgba(255,255,255,0.6)';
        ctx.strokeRect(x + lw / 2, y + lw / 2, Td - lw, Td - lw);
        ctx.setLineDash(NO_DASH);
      }
      var hudText = '', hudKey = '', hudW = 0;
      /* split the banner text into lines that fit (done once per message, not every frame) */
      function wrapBanner(maxW) {
        var words = banner.text.split(' '), lines = [], cur = '', widest = 0;
        for (var k = 0; k < words.length; k++) {
          var test = cur ? cur + ' ' + words[k] : words[k];
          if (cur && ctx.measureText(test).width > maxW) { lines.push(cur); cur = words[k]; } else cur = test;
        }
        if (cur) lines.push(cur);
        for (k = 0; k < lines.length; k++) widest = Math.max(widest, ctx.measureText(lines[k]).width);
        banner.lines = lines; banner.w = Math.min(widest, maxW);
      }
      function drawHud() {
        /* top left: day or night, and how deep you are */
        var pc = clamp(Math.floor(P.x), 0, WW - 1), depth = Math.floor(P.y) - surf[pc];
        var key = (isNight ? 'n' : 'd') + dayNumber() + ':' + (depth > 2 ? depth : 0);
        ctx.font = HUD_FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        if (key !== hudKey) { hudKey = key; hudText = (isNight ? 'Night ' : 'Day ') + dayNumber() + (depth > 2 ? ' · ' + depth + ' deep' : ''); hudW = ctx.measureText(hudText).width; }
        var pad2 = Math.round(8 * dpr), hh = Math.round(28 * dpr), tw = hudW;
        ctx.fillStyle = 'rgba(21,23,28,0.72)'; rr(ctx, pad2, pad2, tw + hh + pad2, hh, hh / 2); ctx.fill();
        var ix = pad2 + hh / 2, iy = pad2 + hh / 2, ir = hh * 0.26;
        if (isNight) { ctx.fillStyle = '#eef2ff'; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, 6.2832); ctx.fill(); ctx.fillStyle = 'rgba(21,23,28,1)'; ctx.beginPath(); ctx.arc(ix + ir * 0.5, iy - ir * 0.35, ir * 0.85, 0, 6.2832); ctx.fill(); }
        else { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, 6.2832); ctx.fill(); }
        ctx.fillStyle = '#ffffff'; ctx.fillText(hudText, pad2 + hh, iy + dpr);
        /* the banner: messages and tips across the top, wrapped onto more lines on a narrow screen */
        if (banner.until > playT) {
          var left = banner.until - playT, a = reduced ? 1 : Math.min(1, left * 3);
          ctx.font = BIG_FONT; ctx.textAlign = 'center';
          var maxW = cw - pad2 * 2 - 36 * dpr, lineH = Math.round(22 * dpr);
          if (!banner.w) wrapBanner(maxW);
          var bw = Math.min(cw - pad2 * 2, banner.w + 36 * dpr), bh = Math.round(18 * dpr) + lineH * banner.lines.length, bx = (cw - bw) / 2, by = hh + pad2 * 2;
          ctx.globalAlpha = a;
          ctx.fillStyle = 'rgba(21,23,28,0.86)'; rr(ctx, bx, by, bw, bh, Math.min(bh / 2, 20 * dpr)); ctx.fill();
          ctx.fillStyle = '#ffc233'; rr(ctx, bx, by + 8 * dpr, Math.round(5 * dpr), bh - 16 * dpr, 3 * dpr); ctx.fill();
          ctx.fillStyle = '#ffffff';
          for (var ln = 0; ln < banner.lines.length; ln++) ctx.fillText(banner.lines[ln], cw / 2, by + 9 * dpr + lineH * (ln + 0.5) + dpr);
          ctx.globalAlpha = 1;
        }
      }

      /* ================= words for the status line and screen readers ================= */
      function statusText() {
        if (state !== 'play') return 'Choose Explore or Creative, then press Start.';
        if (panel === 'bag') return mode === 'explore' ? 'Bag open. Pick a block or make something new.' : 'Pick any block for your hotbar.';
        if (panel === 'goals') return Object.keys(done).length + ' of ' + GOALS.length + ' building challenges done.';
        var id = hotbar[sel];
        return (mode === 'explore' ? 'Explore' : 'Creative') + ' · ' + (isNight ? 'Night ' : 'Day ') + dayNumber() + ' · Holding ' + (id ? B[id].name.toLowerCase() : 'nothing');
      }
      function updateStatus() { var s = statusText(); if (s !== lastStatus) { lastStatus = s; api.status(s); } }
      function updateAria() {
        if (!world) return;
        var pc = clamp(Math.floor(P.x), 0, WW - 1), pr = clamp(Math.floor(P.y + 0.02), 0, WH - 1), depth = Math.floor(P.y) - surf[pc];
        var under = world[pr * WW + pc];
        var s = 'Block World, ' + (mode === 'explore' ? 'Explore' : 'Creative') + ' mode. ' + (isNight ? 'Night' : 'Day') + ', ' +
          (depth > 2 ? depth + ' blocks underground. ' : 'on the surface. ') +
          (P.water ? 'Swimming. ' : under && under !== WATER ? 'Standing on ' + B[under].name.toLowerCase() + '. ' : '') +
          (tgt.ok ? 'Aiming at ' + (world[tgt.i] ? B[world[tgt.i]].name.toLowerCase() : 'an empty space') + (tgt.near ? '.' : ', too far away.') : '');
        if (s !== lastAria) { lastAria = s; canvas.setAttribute('aria-label', s); }
      }
      /* Read-only numbers for the automated play test. */
      function syncData() {
        var d = canvas.dataset;
        d.state = state; d.mode = mode; d.seed = String(seed);
        d.px = P.x.toFixed(2); d.py = P.y.toFixed(2); d.ground = P.ground ? '1' : '0';
        d.tile = String(Td / dpr); d.camx = String(camX / dpr); d.camy = String(camY / dpr);
        d.held = hotbar[sel] ? B[hotbar[sel]].name : '';
        var inv2 = [];
        for (var id = 1; id < NB; id++) if (inv[id] > 0) inv2.push(B[id].name + ':' + inv[id]);
        d.inv = inv2.join(','); d.done = Object.keys(done).join(','); d.lightms = lightMs.toFixed(2); d.panel = panel || '';
        d.night = isNight ? '1' : '0'; d.framems = frameMs.toFixed(2);
      }

      /* ================= the start card ================= */
      var replaceArmed = 0;
      function setMode(m) {
        if (m !== 'explore' && m !== 'creative') return;
        if (m !== mode) { mode = m; api.store.set('mode', m); api.sound('click'); }
        refreshCard(true);
      }
      function refreshCard(preview) {
        modeBtns.explore.setAttribute('aria-pressed', String(mode === 'explore'));
        modeBtns.creative.setAttribute('aria-pressed', String(mode === 'creative'));
        modeHint.textContent = mode === 'explore' ? 'Dig to collect blocks, make new ones, and light up the night.' : 'Every block, as many as you like, and you can fly.';
        var saved = savedData(mode);
        replaceArmed = 0;
        contBtn.hidden = !saved;
        if (saved) {
          contBtn.textContent = '▶ Continue world ' + saved.seed;
          newBtn.className = 'btn bw-big'; newBtn.textContent = 'New world';
          if (preview) seedInput.value = String(saved.seed);
        } else {
          newBtn.className = 'btn btn-primary bw-big'; newBtn.textContent = '▶ Start';
          if (!seedInput.value) seedInput.value = String(1 + Math.floor(api.random() * 99999));
        }
        refit();
        if (preview) { previewWorld(); refreshHotbar(); }
        updateStatus();
      }
      function refit() { lastW = 0; maybeResize(); }
      function readSeed() {
        var v = parseInt(String(seedInput.value).replace(/[^0-9]/g, ''), 10);
        if (!(v >= 1)) v = 1 + Math.floor(api.random() * 99999);
        return clamp(v, 1, 99999);
      }
      var seedTimer = 0;
      function onSeedInput() {
        var clean = String(seedInput.value).replace(/[^0-9]/g, '').slice(0, 5);
        if (clean !== seedInput.value) seedInput.value = clean;
        replaceArmed = 0;
        var saved = savedData(mode);
        if (saved) newBtn.textContent = 'New world';
        clearTimeout(seedTimer);
        seedTimer = setTimeout(function () { if (!destroyed && state === 'card' && seedInput.value) previewWorld(); }, 350);
      }
      seedInput.addEventListener('input', onSeedInput);
      seedInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); onNewWorld(); } });
      function previewWorld() {
        var saved = savedData(mode), s = readSeed();
        if (saved && saved.seed === s) loadWorld(saved.seed, saved); else loadWorld(s, null);
        clock = CYCLE * 0.12; updateTime();
        draw();
      }
      function onNewWorld() {
        var saved = savedData(mode);
        if (saved && !replaceArmed) {
          replaceArmed = 1;
          newBtn.textContent = 'Replace my saved world?';
          api.announce('Press again to replace your saved ' + mode + ' world with a new one.');
          return;
        }
        startPlay(false);
      }
      function startPlay(cont) {
        api.unlockSound();
        var saved = savedData(mode);
        if (cont && saved) loadWorld(saved.seed, saved);
        else loadWorld(readSeed(), null);
        state = 'play';
        cardWrap.hidden = true;
        refit();
        device.classList.remove('is-card');
        device.classList.add('is-running');
        setControlsEnabled(true);
        btnFly.hidden = mode !== 'creative';
        btnFly.setAttribute('aria-pressed', String(P.fly));
        refreshHotbar();
        api.sound('pop'); tone(523, 0.08, 'triangle', 0.05); tone(784, 0.12, 'triangle', 0.05);
        playT = 0; hintAt = {};
        if (mode === 'creative') showBanner('Creative: every block is in the Bag. F or the Fly button flies.', 4);
        else showBanner(cont ? 'Welcome back to world ' + seed + '.' : 'World ' + seed + '. Dig a tree trunk to collect wood.', 4);
        if (!cont) saveNow(); else savedEl.textContent = 'Saved ✓';
        updateStatus(); updateAria(); syncData();
        focusGame();
        startLoop();
      }
      function openCard() {
        if (state === 'card') { focusCardStart(); return; }
        saveNow();
        closePanel();
        stopLoop();
        state = 'card';
        cardWrap.hidden = false;
        device.classList.add('is-card');
        device.classList.remove('is-running');
        setControlsEnabled(false);
        keys.left = keys.right = keys.up = keys.down = false; keyDig = false; pointer.down = false;
        for (var k in pad) pad[k] = false;
        refreshCard(false);
        seedInput.value = String(seed);
        snapCamera();
        draw();
        api.sound('click');
        focusCardStart();
      }
      function focusCardStart() { var b = contBtn.hidden ? newBtn : contBtn; try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      function setControlsEnabled(on) {
        [btnBag, btnGoals, btnHome, btnTime, btnFly, bagSlot, digBtn, placeBtn].concat(slotEls, padBtns).forEach(function (b) { b.disabled = !on; });
      }

      /* ================= input: keyboard ================= */
      function onKeyDown(e) {
        if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
        var t = e.target;
        if (t && t.closest && t.closest('input, select, textarea')) return;
        if (state !== 'play') return;
        var inRoot = !!(t && root.contains(t)), onBody = !t || t === document.body || t === document.documentElement;
        if (!inRoot && !onBody) return;
        var k = e.key, handled = true;
        api.unlockSound();
        if (panel) {
          if (k === 'Escape' || ((k === 'e' || k === 'E' || k === 'b' || k === 'B') && panel === 'bag') || ((k === 'g' || k === 'G') && panel === 'goals')) { e.preventDefault(); closePanel(); }
          return;
        }
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = true;
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = true;
        else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ' || k === 'Spacebar') keys.up = true;
        else if (k === 'ArrowDown' || k === 's' || k === 'S') keys.down = true;
        else if (k >= '1' && k <= '9') selectSlot(+k - 1);
        else if (k === 'e' || k === 'E' || k === 'b' || k === 'B') togglePanel('bag');
        else if (k === 'g' || k === 'G') togglePanel('goals');
        else if (k === 'f' || k === 'F') toggleFly();
        else if (k === 'q' || k === 'Q') setTool(!digTool);
        else if (k === 'i' || k === 'I' || k === 'j' || k === 'J' || k === 'k' || k === 'K' || k === 'l' || k === 'L') {
          /* the aim starts on the block in front of your feet, and each key moves it one block */
          var lk = k.toLowerCase();
          if (aimMode !== 'key') { aimMode = 'key'; aimDX = P.face; aimDY = 0; }
          if (lk === 'i') aimDY--; else if (lk === 'k') aimDY++; else if (lk === 'j') aimDX--; else aimDX++;
          aimDX = clamp(aimDX, -4, 4); aimDY = clamp(aimDY, -4, 3);
          updateTarget(); updateAria();
        }
        else if (k === 'x' || k === 'X') { keyDig = true; if (aimMode === 'none') { aimMode = 'key'; aimDX = P.face; aimDY = 0; } }
        else if (k === 'c' || k === 'C') { if (aimMode === 'none') { aimMode = 'key'; aimDX = P.face; aimDY = 0; } updateTarget(); placeAtTarget(); }
        else handled = false;
        if (handled) e.preventDefault();
      }
      function onKeyUp(e) {
        var k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
        else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ' || k === 'Spacebar') { keys.up = false; if (state === 'play' && k === ' ' && root.contains(e.target)) e.preventDefault(); }
        else if (k === 'ArrowDown' || k === 's' || k === 'S') keys.down = false;
        else if (k === 'x' || k === 'X') keyDig = false;
      }
      function onBlur() {
        keys.left = keys.right = keys.up = keys.down = false; keyDig = false; pointer.down = false;
        for (var k in pad) pad[k] = false;
        padBtns.forEach(function (b) { b.classList.remove('on'); });
      }

      /* ================= input: mouse and touch on the world ================= */
      function cellFromEvent(e) {
        var rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        var x = (e.clientX - rect.left) * (cw / rect.width), y = (e.clientY - rect.top) * (ch / rect.height);
        if (x < 0 || y < 0 || x >= cw || y >= ch) return false;
        var c = Math.floor((x + camX) / Td), r = Math.floor((y + camY) / Td);
        if (c < 0 || c >= WW || r < 0 || r >= WH) return false;
        hover.c = c; hover.r = r;
        return true;
      }
      function onPDown(e) {
        if (state !== 'play' || panel) return;
        api.unlockSound();
        var act;
        if (e.pointerType === 'mouse') { if (e.button === 2) act = 'place'; else if (e.button === 0) act = digTool ? 'dig' : 'place'; else return; }
        else act = digTool ? 'dig' : 'place';
        if (!cellFromEvent(e)) return;
        e.preventDefault();
        focusGame();
        if (e.pointerType === 'mouse') { aimMode = 'mouse'; hover.on = true; }
        pointer.down = true; pointer.id = e.pointerId; pointer.act = act; pointer.c = hover.c; pointer.r = hover.r; pointer.last = -1;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        updateTarget();
        if (act === 'place') placeFromPointer();
      }
      function placeFromPointer() {
        var i = pointer.r * WW + pointer.c;
        if (i === pointer.last) return;
        pointer.last = i;
        if (!tgt.near) { hint('far', 'Too far away. Walk closer.'); api.sound('wrong'); return; }
        if (canHold(i) || world[i] === WATTLE) tryPlace(pointer.c, pointer.r, false);
      }
      function onPMove(e) {
        if (state !== 'play') return;
        var ok = cellFromEvent(e);
        if (e.pointerType === 'mouse') { hover.on = ok; if (ok) aimMode = 'mouse'; }
        if (pointer.down && e.pointerId === pointer.id && ok) {
          pointer.c = hover.c; pointer.r = hover.r;
          updateTarget();
          if (pointer.act === 'place') placeFromPointer();
        }
      }
      function onPUp(e) { if (e.pointerId === pointer.id) { pointer.down = false; pointer.id = -1; } }
      function onPLeave(e) { if (e.pointerType === 'mouse' && !pointer.down) hover.on = false; }
      canvas.addEventListener('pointerdown', onPDown);
      canvas.addEventListener('pointermove', onPMove);
      canvas.addEventListener('pointerup', onPUp);
      canvas.addEventListener('pointercancel', onPUp);
      canvas.addEventListener('lostpointercapture', onPUp);
      canvas.addEventListener('pointerleave', onPLeave);
      canvas.addEventListener('contextmenu', function (e) { if (state === 'play') e.preventDefault(); });
      canvas.addEventListener('keydown', function (e) { if (state === 'card' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); focusCardStart(); } });
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', onBlur);
      function onVisibility() {
        if (document.hidden) { onBlur(); saveNow(); stopLoop(); }
        else if (state === 'play') startLoop();
      }
      document.addEventListener('visibilitychange', onVisibility);

      /* ================= sizing ================= */
      function readFonts() {
        var cs = getComputedStyle(root);
        FONT = (cs.getPropertyValue('--font-head').trim() || cs.fontFamily || 'sans-serif');
        HUD_FONT = '600 ' + Math.round(14 * dpr) + 'px ' + FONT;
        BIG_FONT = '700 ' + Math.round(17 * dpr) + 'px ' + FONT;
        banner.w = 0; hudKey = '';
      }
      function resize() {
        /* Classroom mode fills the screen for a whiteboard: let the tablet grow, with bigger blocks */
        var big = document.documentElement.classList.contains('classroom');
        var wantMax = big ? 'min(1700px, 100%)' : '';
        if (device.style.maxWidth !== wantMax) device.style.maxWidth = wantMax;
        var w = Math.round(screenEl.clientWidth);
        if (!w) return;
        var vh = window.innerHeight || 800;
        var hh = w < 560 ? Math.round(clamp(w * 1.08, 280, Math.max(280, vh * 0.56))) : Math.round(clamp(w * (vh > (window.innerWidth || 0) ? 0.78 : 0.56), 320, Math.max(320, Math.min(big ? 1000 : 640, vh * (big ? 0.66 : 0.72)))));
        /* on a small screen the start card may need more room than the picture: grow the picture to fit it */
        if (state !== 'play') hh = Math.max(hh, Math.ceil(card.scrollHeight) + 24);
        dpr = Math.min(2, window.devicePixelRatio || 1);
        cssW = w;
        canvas.style.height = hh + 'px';
        cw = Math.round(w * dpr); ch = Math.round(hh * dpr);
        canvas.width = cw; canvas.height = ch;
        /* blocks are bigger on touch screens, so a finger can tap the one it means */
        var coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        var newTd = Math.round((coarse ? clamp(Math.round(w / 18), 28, big ? 64 : 44) : clamp(Math.round(w / 26), 24, big ? 56 : 40)) * dpr);
        if (newTd !== Td) { Td = newTd; buildAtlas(); buildSprites(); }
        DASH = [Math.round(Td / 5), Math.round(Td / 8)];
        buildBackdrop();
        sizeLight();
        readFonts();
        snapCamera();
        if (state !== 'play') draw();
        syncData();
      }
      var lastW = 0, lastH = 0, lastDpr = 0, lastBig = false;
      function maybeResize() {
        var w = Math.round(screenEl.clientWidth), vh = window.innerHeight, r = Math.min(2, window.devicePixelRatio || 1);
        var big = document.documentElement.classList.contains('classroom');
        if (w && (w !== lastW || r !== lastDpr || Math.abs(vh - lastH) > 60 || big !== lastBig)) { lastW = w; lastDpr = r; lastH = vh; lastBig = big; resize(); }
      }
      var ro = new ResizeObserver(maybeResize);
      ro.observe(screenEl);
      ro.observe(root);
      window.addEventListener('resize', maybeResize);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!destroyed) { readFonts(); if (state !== 'play') draw(); } }, function () {});

      /* ================= start ================= */
      buildIcons();
      setControlsEnabled(false);
      refreshHotbar();
      maybeResize();
      refreshCard(true);
      savedEl.textContent = '';

      return {
        destroy: function () {
          if (state === 'play') saveNow();
          destroyed = true;
          stopLoop();
          clearTimeout(saveTimer); clearTimeout(seedTimer);
          ro.disconnect();
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
