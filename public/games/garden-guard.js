/* Garden Guard for Games in Time.

   A lane defence in a vegetable garden, played like the tower defence games of the late 2000s: the Flash game
   Desktop Tower Defense (Paul Preece, 2007) and Plants vs. Zombies (PopCap Games, 2009). Five garden beds run from
   the wild end of the garden to your lettuces. Snails, slugs, beetles, grasshoppers, aphids and a giant caterpillar
   crawl down the beds towards the lettuces. Plant helpers in the beds to shoo them away.

   Nobody gets hurt. Every pest has a "nerve" meter. Peas, prickles, sprinkler water and buzzing bees use up its
   nerve, and when its nerve runs out the pest turns round and runs off home. If a pest reaches your lettuces it has
   a munch and the level ends, kindly, and you can try again.

   The plants, pests, levels and art are all our own, drawn with canvas paths.

   How this file is laid out:
   - Data: the plants, the pests and the levels.
   - The garden simulation (newGarden, stepGarden): only numbers, no drawing, so it can be tested on its own.
   - The wave planner: how the computer decides which pests to send, when, and down which bed.
   - Drawing: the background is painted once into a hidden canvas; each frame draws plants, pests and effects on top.
   - Input: tap a seed card then a bed square, or use the keyboard. */
(function () {
  'use strict';

  var COLS = 9;            /* squares in each bed, from the lettuces (0) to the wild end (8) */
  var LANES = 5;           /* garden beds */
  var STEP = 1 / 60;       /* the simulation moves in steps of one sixtieth of a second */
  var SUN_VALUE = 25;      /* sunshine in one sun drop */
  var FLEE_SPEED = 2.4;    /* squares per second when a pest runs home */
  var PEA_SPEED = 5;       /* squares per second */
  var BEE_SPEED = 4.5;

  /* ---------- the plants ----------
     cost: sunshine to plant. recharge: seconds before you can plant another. leaves: how much nibbling it takes. */
  var PLANTS = {
    sun: { name: 'Sun Catcher', cost: 50, recharge: 5, leaves: 6, short: 'Makes sunshine',
      text: 'Catches sunshine and drops 25 every 12 seconds. Plant these first.' },
    pea: { name: 'Pea Flicker', cost: 100, recharge: 6, leaves: 6, rate: 1.4, short: 'Flicks peas',
      text: 'Flicks a pea down its bed every 1.4 seconds. Each pea uses up 1 nerve.' },
    wall: { name: 'Prickle Wall', cost: 50, recharge: 20, leaves: 40, short: 'Blocks pests',
      text: 'A prickly cactus. Pests stop to nibble it for ages, and the prickles make them nervous.' },
    sprinkler: { name: 'Sprinkler', cost: 75, recharge: 8, leaves: 6, range: 3, short: 'Slows pests',
      text: 'Sprays the next 3 squares of its bed. Wet pests slow to half speed and get a little nervous.' },
    hive: { name: 'Bee Hive', cost: 125, recharge: 10, leaves: 8, rate: 6, short: 'Sends bees',
      text: 'Every 6 seconds a bee buzzes round the closest pest in its bed or the beds next to it. Bees never sting.' }
  };
  var PLANT_ORDER = ['sun', 'pea', 'wall', 'sprinkler', 'hive'];

  /* ---------- the pests ----------
     nerve: how much shooing it takes. speed: squares per second. munch: leaves nibbled per second.
     cost: "pest points" the wave planner spends on it. size: in squares. */
  var PESTS = {
    snail: { name: 'Snail', nerve: 10, speed: 0.2, munch: 1, cost: 1, size: 0.8, text: 'Slow and steady.' },
    slug: { name: 'Slug', nerve: 7, speed: 0.3, munch: 1, cost: 1, size: 0.85, text: 'Faster than a snail, but shy.' },
    beetle: { name: 'Beetle', nerve: 26, speed: 0.2, munch: 1.5, cost: 3, size: 0.75, text: 'Brave. It takes lots of peas.' },
    hopper: { name: 'Grasshopper', nerve: 10, speed: 0.3, munch: 1, cost: 2, size: 0.85, hops: true, text: 'Hops over the first plant it meets.' },
    aphids: { name: 'Aphids', nerve: 3, speed: 0.32, munch: 0.5, cost: 2, size: 0.4, group: 3, text: 'Tiny, and they come in threes.' },
    boss: { name: 'Giant Caterpillar', nerve: 120, speed: 0.11, munch: 4, cost: 14, size: 1.5, boss: true, text: 'Huge and hungry. Gather every helper you have.' }
  };

  /* ---------- the levels ----------
     lanes: which beds are dug (1) this level. waves: how many waves. flags: the big waves. bosses: {wave: how many}.
     base and grow: the wave budget (see planWave). first: seconds before the first wave. gap: most seconds between
     waves. bias: how much the planner prefers your weakest bed (0 not at all, 1 a lot). */
  var LEVELS = [
    { name: 'First Sprouts', lanes: [0, 1, 1, 1, 0], pests: ['snail'], plants: ['sun', 'pea'], newPlant: 'pea', waves: 5, flags: [5], base: 1, grow: 0.4, first: 20, gap: 22, bias: 0, sun: 150,
      tip: 'Plant a row of Sun Catchers near the lettuces, then Pea Flickers in front of them.' },
    { name: 'Slime Time', lanes: [1, 1, 1, 1, 1], pests: ['snail', 'slug'], newPest: 'slug', plants: ['sun', 'pea', 'wall'], newPlant: 'wall', waves: 6, flags: [3, 6], base: 1.5, grow: 0.6, first: 20, gap: 21, bias: 0.3, sun: 200,
      tip: 'All five beds are dug now. A Prickle Wall near the wild end buys your peas time.' },
    { name: 'Beetle Drive', lanes: [1, 1, 1, 1, 1], pests: ['snail', 'slug', 'beetle'], newPest: 'beetle', plants: ['sun', 'pea', 'wall', 'sprinkler'], newPlant: 'sprinkler', waves: 7, flags: [4, 7], base: 2, grow: 0.75, first: 20, gap: 21, bias: 0.5, sun: 200,
      tip: 'Beetles are brave. Slow them with a Sprinkler so your peas get more flicks in.' },
    { name: 'Hop to It', lanes: [1, 1, 1, 1, 1], pests: ['snail', 'slug', 'beetle', 'hopper'], newPest: 'hopper', plants: ['sun', 'pea', 'wall', 'sprinkler', 'hive'], newPlant: 'hive', waves: 8, flags: [4, 8], base: 2.5, grow: 0.85, first: 20, gap: 20, bias: 0.6, sun: 200,
      tip: 'Grasshoppers jump over the first plant they meet, so put a cheap one in front.' },
    { name: 'Aphid Afternoon', lanes: [1, 1, 1, 1, 1], pests: ['snail', 'slug', 'beetle', 'hopper', 'aphids'], newPest: 'aphids', plants: ['sun', 'pea', 'wall', 'sprinkler', 'hive'], waves: 8, flags: [4, 8], base: 3, grow: 0.95, first: 20, gap: 20, bias: 0.7, sun: 200,
      tip: 'Aphids are tiny and shy, but three at once can sneak past one Pea Flicker.' },
    { name: 'The Big Munch', lanes: [1, 1, 1, 1, 1], pests: ['snail', 'slug', 'beetle', 'hopper', 'aphids'], newPest: 'boss', plants: ['sun', 'pea', 'wall', 'sprinkler', 'hive'], waves: 9, flags: [5, 9], bosses: { 9: 1 }, base: 3.5, grow: 1, first: 20, gap: 20, bias: 0.8, sun: 200,
      tip: 'A Giant Caterpillar comes in the last wave. Bee Hives next to its bed help a lot.' },
    { name: 'Garden Show', lanes: [1, 1, 1, 1, 1], pests: ['snail', 'slug', 'beetle', 'hopper', 'aphids'], plants: ['sun', 'pea', 'wall', 'sprinkler', 'hive'], waves: 10, flags: [5, 10], bosses: { 5: 1, 10: 2 }, base: 4, grow: 1.05, first: 20, gap: 19, bias: 1, sun: 200,
      tip: 'Everything at once, and two Giant Caterpillars at the end. Good luck, gardener.' }
  ];
  /* Endless: every 5th wave is big, every 10th brings caterpillars, and the budget keeps growing. */
  var ENDLESS = { name: 'Endless Garden', endless: true, lanes: [1, 1, 1, 1, 1], pests: ['snail', 'slug', 'beetle', 'hopper', 'aphids'], plants: ['sun', 'pea', 'wall', 'sprinkler', 'hive'], waves: Infinity, base: 3, grow: 0.9, first: 20, gap: 19, bias: 1, sun: 200,
    tip: 'The waves never stop and keep growing. How many can you hold?' };
  function levelDef(i) { return i >= LEVELS.length ? ENDLESS : LEVELS[i]; }
  function isFlag(L, w) { return L.endless ? w % 5 === 0 : L.flags.indexOf(w) >= 0; }
  function bossesIn(L, w) { return L.endless ? (w % 10 === 0 ? w / 10 : 0) : (L.bosses && L.bosses[w]) || 0; }

  /* A small random number generator that always gives the same numbers from the same seed (for fair tests). */
  function seeded(seed) {
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* Pools: the game makes all its pests, peas, bees and sun drops once and reuses them, so nothing new is made
     sixty times a second (that keeps old Chromebooks smooth). */
  function makePool(n, make) { var a = []; for (var i = 0; i < n; i++) { var o = make(); o.on = false; a.push(o); } return a; }
  function take(pool) { for (var i = 0; i < pool.length; i++) if (!pool[i].on) { pool[i].on = true; return pool[i]; } return null; }

  /* ================= the garden simulation ================= */
  function newGarden(levelIndex, seed) {
    var L = levelDef(levelIndex);
    var g = {
      level: levelIndex, L: L, rnd: seeded(seed || 1), t: 0,
      sunshine: L.sun, lanes: L.lanes.slice(), grid: [], plantCount: 0,
      pests: makePool(60, function () { return { type: 'snail', lane: 0, p: 0, nerve: 1, max: 1, state: 'walk', wet: 0, hopFrom: 0, hopTo: 0, hopT: 0, hopped: false, boop: 0, seed: 0, munchT: 0 }; }),
      peas: makePool(80, function () { return { lane: 0, p: 0 }; }),
      bees: makePool(24, function () { return { hive: null, target: null, lane: 0, p: 0, state: 'out', t: 0 }; }),
      suns: makePool(30, function () { return { lane: 0, p: 0, fall: 0, fallFrom: 0, life: 0, from: 'sky' }; }),
      wave: 0, waveTotal: L.waves, waveStartAt: 0, waveNerve: 0, nextWaveAt: L.first, warned: 0,
      queue: [], recent: [0, 0, 0, 0, 0], nextSkyAt: 7,
      recharge: { sun: 0, pea: 0, wall: 0, sprinkler: 0, hive: 0 },
      state: 'playing', culprit: null, shooed: 0, score: 0,
      /* things that happened this step, for sounds and pictures (the page reads them and sets them back to 0) */
      ev: { flick: 0, hit: 0, shoo: 0, munch: 0, eaten: 0, sunMade: 0, buzz: 0, bigWave: 0, wave: 0, spawn: 0, won: 0, lost: 0 },
      shooList: []
    };
    for (var l = 0; l < LANES; l++) { var row = []; for (var c = 0; c < COLS; c++) row.push(null); g.grid.push(row); }
    return g;
  }

  /* Can this plant go here right now? Returns '' if yes, or the reason why not. */
  function canPlant(g, type, lane, col) {
    if (g.state !== 'playing') return 'The level is over.';
    if (g.L.plants.indexOf(type) < 0) return 'That plant is not in this level.';
    if (lane < 0 || lane >= LANES || col < 0 || col >= COLS) return 'Pick a square in a bed.';
    if (!g.lanes[lane]) return 'That bed is not dug yet. Try a brown bed.';
    if (g.grid[lane][col]) return 'There is already a plant there.';
    if (g.recharge[type] > 0) return PLANTS[type].name + ' is still growing a new seed.';
    if (g.sunshine < PLANTS[type].cost) return 'Not enough sunshine. ' + PLANTS[type].name + ' needs ' + PLANTS[type].cost + '.';
    return '';
  }
  function plant(g, type, lane, col) {
    if (canPlant(g, type, lane, col)) return null;
    var P = PLANTS[type];
    g.sunshine -= P.cost;
    g.recharge[type] = P.recharge;
    var pl = { type: type, lane: lane, col: col, leaves: P.leaves, max: P.leaves, timer: type === 'sun' ? 6 : type === 'hive' ? 2 : 0, beeOut: false, flick: 0, hurt: 0, spray: false, born: g.t };
    g.grid[lane][col] = pl;
    g.plantCount++;
    return pl;
  }
  function dig(g, lane, col) {
    var pl = g.grid[lane] && g.grid[lane][col];
    if (!pl) return false;
    g.grid[lane][col] = null;
    g.plantCount--;
    return true;
  }

  /* Drop a sun: from the sky (it floats down onto a bed) or from a Sun Catcher (it pops out beside it). */
  function makeSun(g, lane, p, from) {
    var s = take(g.suns);
    if (!s) return;
    s.lane = lane; s.p = p; s.from = from; s.life = from === 'sky' ? 11 : 10;
    s.fall = from === 'sky' ? 1 : 0.5;     /* 1 = still high in the air, 0 = landed */
    if (from !== 'sky') g.ev.sunMade++;
  }
  function collectSun(g, s) {
    if (!s.on) return 0;
    s.on = false;
    g.sunshine += SUN_VALUE;
    return SUN_VALUE;
  }
  function collectAll(g) {
    var n = 0;
    for (var i = 0; i < g.suns.length; i++) if (g.suns[i].on) n += collectSun(g, g.suns[i]);
    return n;
  }

  /* ---------- the wave planner (the computer's side of the game) ----------
     Each wave gets a budget of "pest points" that grows wave by wave: base + grow x (wave - 1), but never more than
     1 + 1.4 x (wave - 1), so every level starts gently (wave 1 is a single pest). Big (flag) waves get double plus one. The planner spends the budget on pests from this level's list (a snail costs 1, a beetle 3),
     picking at random but favouring cheap pests in the first two waves and the level's new pest after that. The pests
     then come in one at a time, a second or two apart (closer together in a big wave). */
  function waveBudget(L, w) {
    var b = Math.min(L.base + L.grow * (w - 1), 1 + 1.4 * (w - 1));
    if (L.endless && w > 10) b *= Math.pow(1.06, w - 10);   /* endless keeps getting harder */
    return isFlag(L, w) ? b * 2 + 1 : b;
  }
  function planWave(g) {
    var L = g.L, w = g.wave, rnd = g.rnd;
    var budget = waveBudget(L, w), list = [], i;
    /* a level's new pest shows up early, so you meet it before the big waves */
    if (L.newPest && L.newPest !== 'boss' && w === 2) { list.push(L.newPest); budget -= PESTS[L.newPest].cost; }
    var guard = 0;
    while (budget > 0.25 && guard++ < 200) {
      var total = 0, weights = [];
      for (i = 0; i < L.pests.length; i++) {
        var P = PESTS[L.pests[i]];
        var wgt = P.cost <= budget + 0.5 ? 1 : 0;
        if (wgt && w <= 2 && P.cost > 1) wgt = 0.25;           /* gentle start */
        if (wgt && L.pests[i] === L.newPest && w > 2) wgt = 1.6; /* show off the new pest */
        weights.push(wgt); total += wgt;
      }
      if (total <= 0) break;
      var r = rnd() * total;
      for (i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) break; }
      i = Math.min(i, weights.length - 1);
      list.push(L.pests[i]);
      budget -= PESTS[L.pests[i]].cost;
    }
    /* shuffle, then any giant caterpillars come last */
    for (i = list.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var tmp = list[i]; list[i] = list[j]; list[j] = tmp; }
    for (i = 0; i < bossesIn(L, w); i++) list.push('boss');
    var flag = isFlag(L, w), at = g.t + (flag ? 1 : 0), nerve = 0;
    for (i = 0; i < list.length; i++) {
      g.queue.push({ at: at, type: list[i] });
      var P2 = PESTS[list[i]];
      nerve += P2.nerve * (P2.group || 1);
      at += list[i] === 'boss' ? 3 : flag ? 0.5 + rnd() * 0.8 : 1.3 + rnd() * 1.7;
    }
    g.waveNerve = nerve;
  }
  /* Which bed? Each dug bed gets a weight. Beds that had a pest recently get less (so the pests spread out), and
     beds with fewer helpers get more (the planner looks for your weakest bed), as much as this level's bias says. */
  function laneDefence(g, lane) {
    var d = 0;
    for (var l = lane - 1; l <= lane + 1; l++) {
      if (l < 0 || l >= LANES) continue;
      for (var c = 0; c < COLS; c++) {
        var pl = g.grid[l][c];
        if (!pl) continue;
        if (l === lane) d += pl.type === 'pea' ? 1 : pl.type === 'hive' ? 0.8 : pl.type === 'sprinkler' ? 0.4 : pl.type === 'wall' ? 0.5 : 0;
        else if (pl.type === 'hive') d += 0.4;   /* a hive helps the beds next to it too */
      }
    }
    return d;
  }
  var laneW = [0, 0, 0, 0, 0], laneD = [0, 0, 0, 0, 0];
  function pickLane(g) {
    var maxD = 1, l, total = 0;
    for (l = 0; l < LANES; l++) { laneD[l] = g.lanes[l] ? laneDefence(g, l) : 0; if (laneD[l] > maxD) maxD = laneD[l]; }
    for (l = 0; l < LANES; l++) {
      laneW[l] = g.lanes[l] ? (1 / (1 + g.recent[l])) * (1 + g.L.bias * (1 - laneD[l] / maxD)) : 0;
      total += laneW[l];
    }
    var r = g.rnd() * total;
    for (l = 0; l < LANES; l++) { r -= laneW[l]; if (r <= 0 && laneW[l] > 0) break; }
    if (l >= LANES) { for (l = LANES - 1; l > 0 && !g.lanes[l]; l--); }
    for (var k = 0; k < LANES; k++) g.recent[k] *= 0.5;
    g.recent[l] += 1;
    return l;
  }
  function spawnPest(g, type, lane, p) {
    var o = take(g.pests);
    if (!o) return null;
    var P = PESTS[type];
    o.type = type; o.lane = lane; o.p = p; o.nerve = P.nerve; o.max = P.nerve; o.state = 'walk'; o.wet = 0;
    o.hopped = false; o.hopT = 0; o.boop = 0; o.seed = g.rnd() * 100; o.munchT = 0;
    g.ev.spawn++;
    return o;
  }
  function startWave(g) {
    g.wave++;
    g.waveStartAt = g.t;
    planWave(g);
    g.nextWaveAt = g.t + g.L.gap + (isFlag(g.L, g.wave) ? 6 : 0);
    g.ev.wave++;
  }
  /* How much nerve is still to come in this wave: pests on their way plus pests still waiting to set off. */
  function nerveLeft(g) {
    var n = 0, i;
    for (i = 0; i < g.pests.length; i++) { var o = g.pests[i]; if (o.on && o.state !== 'flee') n += o.nerve; }
    for (i = 0; i < g.queue.length; i++) { var P = PESTS[g.queue[i].type]; n += P.nerve * (P.group || 1); }
    return n;
  }
  function anyPests(g) {
    for (var i = 0; i < g.pests.length; i++) if (g.pests[i].on && g.pests[i].state !== 'flee') return true;
    return false;
  }
  function flee(g, o) {
    o.state = 'flee';
    o.nerve = 0;
    g.shooed++;
    g.score += PESTS[o.type].cost * 10 / (PESTS[o.type].group || 1);
    g.ev.shoo++;
    g.shooList.push(o);
  }
  /* The first pest in this bed in front of a plant (between it and the wild end), still in the garden. */
  function pestAhead(g, lane, col, range) {
    var best = null;
    for (var i = 0; i < g.pests.length; i++) {
      var o = g.pests[i];
      if (!o.on || o.lane !== lane || o.state === 'flee' || o.p < col + 0.3 || o.p > COLS + 0.35) continue;
      if (range && o.p > col + 0.5 + range) continue;
      if (!best || o.p < best.p) best = o;
    }
    return best;
  }
  /* A bee goes to the pest closest to the lettuces in its bed or the beds next to it. */
  function beeTarget(g, lane) {
    var best = null;
    for (var i = 0; i < g.pests.length; i++) {
      var o = g.pests[i];
      if (!o.on || o.state === 'flee' || Math.abs(o.lane - lane) > 1 || o.p > COLS + 0.2) continue;
      if (!best || o.p < best.p) best = o;
    }
    return best;
  }

  function stepGarden(g, dt) {
    if (g.state !== 'playing') return;
    var L = g.L, i, o, pl, l, c;
    g.t += dt;
    for (i = 0; i < PLANT_ORDER.length; i++) { var k = PLANT_ORDER[i]; if (g.recharge[k] > 0) g.recharge[k] = Math.max(0, g.recharge[k] - dt); }

    /* sunshine from the sky, every 9 to 12 seconds, onto a random dug bed */
    if (g.t >= g.nextSkyAt) {
      g.nextSkyAt = g.t + 9 + g.rnd() * 3;
      for (var tries = 0; tries < 10; tries++) { l = Math.floor(g.rnd() * LANES); if (g.lanes[l]) break; }
      makeSun(g, l, 1 + g.rnd() * (COLS - 2), 'sky');
    }

    /* waves: the next one starts on time, or sooner once you have shooed most of the last one */
    if (g.wave < g.waveTotal) {
      if (g.wave > 0 && g.queue.length === 0 && g.t - g.waveStartAt > 8 && g.nextWaveAt - g.t > 3 && nerveLeft(g) < 0.3 * g.waveNerve) g.nextWaveAt = g.t + 3;
      if (isFlag(L, g.wave + 1) && g.warned < g.wave + 1 && g.t >= g.nextWaveAt - 4) { g.warned = g.wave + 1; g.ev.bigWave++; }
      if (g.t >= g.nextWaveAt) startWave(g);
    }
    while (g.queue.length && g.t >= g.queue[0].at) {
      var q = g.queue.shift();
      var lane = pickLane(g), P = PESTS[q.type];
      for (var n = 0; n < (P.group || 1); n++) spawnPest(g, q.type, lane, COLS + 0.7 + n * 0.45);
    }

    /* plants */
    for (l = 0; l < LANES; l++) for (c = 0; c < COLS; c++) {
      pl = g.grid[l][c];
      if (!pl) continue;
      if (pl.hurt > 0) pl.hurt -= dt;
      if (pl.flick > 0) pl.flick -= dt;
      if (pl.type === 'sun') {
        pl.timer -= dt;
        if (pl.timer <= 0) { pl.timer = 12; makeSun(g, l, c + 0.75, 'plant'); }
      } else if (pl.type === 'pea') {
        if (pl.timer > 0) pl.timer -= dt;
        if (pl.timer <= 0 && pestAhead(g, l, c, 0)) {
          var pea = take(g.peas);
          if (pea) { pea.lane = l; pea.p = c + 0.75; }
          pl.timer = PLANTS.pea.rate; pl.flick = 0.25; g.ev.flick++;
        }
      } else if (pl.type === 'sprinkler') {
        pl.spray = !!pestAhead(g, l, c, PLANTS.sprinkler.range);
      } else if (pl.type === 'hive') {
        if (pl.timer > 0) pl.timer -= dt;
        if (pl.timer <= 0 && !pl.beeOut) {
          var tg = beeTarget(g, l);
          if (tg) {
            var b = take(g.bees);
            if (b) { b.hive = pl; b.target = tg; b.lane = l; b.p = c + 0.5; b.state = 'out'; b.t = 0; pl.beeOut = true; pl.timer = PLANTS.hive.rate; }
          }
        }
      }
    }

    /* peas fly along their bed and bump the first pest they reach (pests in the middle of a hop are too high) */
    for (i = 0; i < g.peas.length; i++) {
      var pe = g.peas[i];
      if (!pe.on) continue;
      pe.p += PEA_SPEED * dt;
      if (pe.p > COLS + 1) { pe.on = false; continue; }
      for (var j = 0; j < g.pests.length; j++) {
        o = g.pests[j];
        if (!o.on || o.lane !== pe.lane || o.state === 'flee' || o.state === 'hop') continue;
        if (Math.abs(o.p - pe.p) < PESTS[o.type].size * 0.42) {
          pe.on = false; o.nerve -= 1; o.boop = 0.15; g.ev.hit++;
          break;
        }
      }
    }

    /* bees fly out, buzz round their pest for a moment (using up 5 nerve), then fly home */
    for (i = 0; i < g.bees.length; i++) {
      var be = g.bees[i];
      if (!be.on) continue;
      var hv = be.hive;
      if (!hv || g.grid[hv.lane][hv.col] !== hv) { be.on = false; continue; }   /* its hive was dug up or nibbled away */
      if (be.state === 'out' || be.state === 'buzz') {
        if (!be.target.on || be.target.state === 'flee') {
          be.target = beeTarget(g, hv.lane);
          if (!be.target) { be.state = 'home'; continue; }
          be.state = 'out';
        }
        var tx = be.target.p, tl = be.target.lane;
        if (be.state === 'out') {
          var dx = tx - be.p, dl = tl - be.lane, d = Math.sqrt(dx * dx + dl * dl);
          if (d < 0.15) { be.state = 'buzz'; be.t = 0; }
          else { var sp = Math.min(d, BEE_SPEED * dt) / d; be.p += dx * sp; be.lane += dl * sp; }
        } else {
          be.t += dt; be.p = tx; be.lane = tl;
          if (be.t >= 0.9) { be.target.nerve -= 5; be.target.boop = 0.2; g.ev.buzz++; be.state = 'home'; }
        }
      } else {
        var hx = hv.col + 0.5 - be.p, hl = hv.lane - be.lane, hd = Math.sqrt(hx * hx + hl * hl);
        if (hd < 0.12) { be.on = false; hv.beeOut = false; }
        else { var hs = Math.min(hd, BEE_SPEED * dt) / hd; be.p += hx * hs; be.lane += hl * hs; }
      }
    }

    /* pests */
    for (i = 0; i < g.pests.length; i++) {
      o = g.pests[i];
      if (!o.on) continue;
      P = PESTS[o.type];
      if (o.boop > 0) o.boop -= dt;
      if (o.state === 'flee') {
        o.p += FLEE_SPEED * dt;
        if (o.p > COLS + 2) o.on = false;
        continue;
      }
      if (o.state === 'hop') {
        o.hopT += dt / 0.8;
        o.p = o.hopFrom + (o.hopTo - o.hopFrom) * Math.min(1, o.hopT);
        if (o.hopT >= 1) o.state = 'walk';
        continue;
      }
      /* sprinklers: is this pest in the spray of one in its bed? */
      if (o.wet > 0) o.wet -= dt;
      for (c = 0; c < COLS; c++) {
        pl = g.grid[o.lane][c];
        if (pl && pl.type === 'sprinkler' && o.p > c + 0.3 && o.p < c + 0.5 + PLANTS.sprinkler.range) { o.wet = 1.2; o.nerve -= 0.4 * dt; break; }
      }
      /* is there a plant right in front of its mouth? */
      var mouth = o.p - P.size * 0.45, col = Math.floor(mouth);
      pl = col >= 0 && col < COLS ? g.grid[o.lane][col] : null;
      if (pl && mouth < col + 0.85) {
        if (P.hops && !o.hopped) {
          o.hopped = true; o.state = 'hop'; o.hopT = 0; o.hopFrom = o.p; o.hopTo = col - 0.1 + P.size * 0.45;
        } else {
          o.state = 'munch';
          o.munchT += dt;
          pl.leaves -= P.munch * dt;
          pl.hurt = 0.2;
          if (pl.type === 'wall') o.nerve -= 0.5 * dt;   /* prickles */
          if (o.munchT > 0.45) { o.munchT = 0; g.ev.munch++; }
          if (pl.leaves <= 0) { g.grid[o.lane][col] = null; g.plantCount--; g.ev.eaten++; }
        }
      } else {
        o.state = 'walk';
        o.p -= P.speed * (o.wet > 0 ? 0.5 : 1) * dt;
      }
      if (o.nerve <= 0) { flee(g, o); continue; }
      if (mouth < 0.05) { g.state = 'lost'; g.culprit = o; g.ev.lost++; return; }
    }

    /* sun drops float down, then wait to be collected, then fade away */
    for (i = 0; i < g.suns.length; i++) {
      var s = g.suns[i];
      if (!s.on) continue;
      if (s.fall > 0) s.fall = Math.max(0, s.fall - dt / (s.from === 'sky' ? 3 : 0.6));
      else { s.life -= dt; if (s.life <= 0) s.on = false; }
    }

    /* the level is won when every wave has come and every pest has been shooed */
    if (g.wave >= g.waveTotal && g.queue.length === 0 && !anyPests(g)) { g.state = 'won'; g.ev.won++; }
  }

  /* ================= colours and drawing helpers ================= */
  function parseColour(s) {
    s = String(s || '').trim();
    var m;
    if (s.charAt(0) === '#') {
      var x = s.slice(1);
      if (x.length === 3) x = x.split('').map(function (ch) { return ch + ch; }).join('');
      if (x.length === 6) return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16), 1];
    }
    if ((m = s.match(/^rgba?\(([^)]+)\)$/i))) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      if (p.length >= 3) return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    return null;
  }
  function rgba(s, a) { var c = parseColour(s); if (!c) return s; return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }

  /* The garden's own paint box. Garden colours are the same in every hall. */
  var ART = {
    grass: '#4f8f3c', grass2: '#3f7a31', grassHi: '#6aab4c', soil: '#6e4a2c', soil2: '#634126', soilHi: '#86603d', edge: '#a8794a',
    wild: '#2f6427', lettuce: '#9fdc6a', lettuce2: '#6fb847', lettuceVein: '#d8f5b8',
    leaf: '#3e9b3a', leaf2: '#2d7c2c', leafHi: '#7ccc5a', pea: '#8fdc4a', peaHi: '#d6ffb0',
    petal: '#ffb12e', petal2: '#ffd84a', seed: '#8a4b12', seedHi: '#c97a24',
    cactus: '#3fae6a', cactus2: '#2a8a52', spine: '#f6f1d0', bloom: '#ff6ec7',
    metal: '#b7c3cc', metal2: '#7c8a95', water: '#7fd4ff',
    straw: '#e0b04c', straw2: '#b8862e', bee: '#ffd23a', beeBand: '#2b2118', wing: 'rgba(255,255,255,0.75)',
    snailBody: '#cdb89c', snailShell: '#c0702a', snailShell2: '#7d4116', slug: '#d8843a', slug2: '#a85a22',
    beetle: '#2fa39a', beetle2: '#1c6f80', beetleHi: '#9df0e2', leg: '#2a2620',
    hopper: '#8ccf3a', hopper2: '#5d9a22', aphid: '#c6f07a', cat: '#7cc242', cat2: '#5a9a2a', catSpot: '#ffd84a', catHead: '#e98a2a',
    eye: '#ffffff', pupil: '#1b1b1b', sweat: '#9be0ff', sun: '#ffd23a', sunRay: '#ffb12e'
  };
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); c.fill(); }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); c.fill(); }
  function eyeAt(c, x, y, r, look) { c.fillStyle = ART.eye; circ(c, x, y, r); c.fillStyle = ART.pupil; circ(c, x + r * 0.35 * (look || 1), y, r * 0.55); }

  /* Every pest and plant is drawn looking down from above, in its own little picture space where u is the size of
     one square and +x points the way it faces. The page turns that space to fit the garden: on a wide screen the
     pests crawl from right to left, on a phone they crawl from the top down. */
  function drawPlant(c, type, u, t, pl) {
    var i, a;
    if (type === 'sun') {
      /* a ring of orange and yellow petals round a disc of seeds that glows when sunshine is nearly ready */
      var ready = pl ? clamp(1 - pl.timer / 3, 0, 1) : 0.3;
      var spin = t * 0.25;
      c.fillStyle = ART.petal;
      for (i = 0; i < 12; i++) { a = spin + i * Math.PI / 6; ell(c, Math.cos(a) * u * 0.25, Math.sin(a) * u * 0.25, u * 0.13, u * 0.06, a); }
      c.fillStyle = ART.petal2;
      for (i = 0; i < 12; i++) { a = -spin * 0.7 + (i + 0.5) * Math.PI / 6; ell(c, Math.cos(a) * u * 0.18, Math.sin(a) * u * 0.18, u * 0.1, u * 0.05, a); }
      c.fillStyle = ART.seed; circ(c, 0, 0, u * 0.14);
      c.fillStyle = ready > 0.6 ? ART.sun : ART.seedHi;
      for (i = 0; i < 14; i++) { a = i * 2.39996; var rr = u * 0.12 * Math.sqrt((i + 0.5) / 14); circ(c, Math.cos(a) * rr, Math.sin(a) * rr, u * 0.018 + ready * u * 0.01); }
      if (ready > 0.6) { c.fillStyle = 'rgba(255,230,120,' + ((ready - 0.6) * 0.8).toFixed(2) + ')'; circ(c, 0, 0, u * 0.2); }
    } else if (type === 'pea') {
      /* three leaves behind, and a curled pod spring that snaps forward to flick a pea */
      var f = pl && pl.flick > 0 ? pl.flick / 0.25 : 0;
      c.fillStyle = ART.leaf2; ell(c, -u * 0.15, -u * 0.17, u * 0.2, u * 0.1, -0.6); ell(c, -u * 0.15, u * 0.17, u * 0.2, u * 0.1, 0.6);
      c.fillStyle = ART.leaf; ell(c, -u * 0.22, 0, u * 0.2, u * 0.11, 0);
      c.strokeStyle = ART.leaf2; c.lineWidth = Math.max(2, u * 0.05); c.lineCap = 'round';
      var reach = u * (0.16 + f * 0.12);
      c.beginPath(); c.moveTo(-u * 0.05, 0); c.quadraticCurveTo(reach * 0.5, -u * 0.12 * (1 - f), reach, 0); c.stroke();
      c.fillStyle = ART.leafHi; ell(c, reach, 0, u * 0.12, u * 0.09, 0);
      c.fillStyle = ART.leaf2; ell(c, reach + u * 0.02, 0, u * 0.08, u * 0.05, 0);
      if (!f) { c.fillStyle = ART.pea; circ(c, reach + u * 0.02, 0, u * 0.045); }
    } else if (type === 'wall') {
      /* a barrel cactus seen from above: ribs, spines and a pink flower on top */
      var hurt = pl ? 1 - pl.leaves / pl.max : 0;
      c.fillStyle = ART.cactus2; circ(c, 0, 0, u * 0.36);
      c.fillStyle = ART.cactus; circ(c, 0, 0, u * 0.31);
      c.strokeStyle = ART.cactus2; c.lineWidth = Math.max(1, u * 0.02);
      c.beginPath();
      for (i = 0; i < 10; i++) { a = i * Math.PI / 5; c.moveTo(Math.cos(a) * u * 0.08, Math.sin(a) * u * 0.08); c.lineTo(Math.cos(a) * u * 0.33, Math.sin(a) * u * 0.33); }
      c.stroke();
      c.strokeStyle = ART.spine; c.lineWidth = Math.max(1, u * 0.012);
      c.beginPath();
      for (i = 0; i < 20; i++) { a = i * Math.PI / 10 + 0.15; var r1 = u * 0.3, r2 = u * 0.42; c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); c.lineTo(Math.cos(a + 0.12) * r2, Math.sin(a + 0.12) * r2); }
      c.stroke();
      c.fillStyle = ART.bloom; for (i = 0; i < 5; i++) { a = i * Math.PI * 0.4; ell(c, Math.cos(a) * u * 0.05, Math.sin(a) * u * 0.05, u * 0.05, u * 0.03, a); }
      c.fillStyle = ART.petal2; circ(c, 0, 0, u * 0.025);
      if (hurt > 0.35) { c.fillStyle = ART.soil2; ell(c, u * 0.3, -u * 0.05, u * 0.07, u * 0.05, 0); if (hurt > 0.7) ell(c, u * 0.28, u * 0.12, u * 0.07, u * 0.05, 0.5); }
    } else if (type === 'sprinkler') {
      /* a brass sprinkler head on a metal stand with a turning arm */
      c.fillStyle = ART.metal2; circ(c, 0, 0, u * 0.2);
      c.fillStyle = ART.metal; circ(c, 0, 0, u * 0.15);
      var arm = pl && pl.spray ? t * 6 : t * 0.6;
      c.strokeStyle = ART.metal2; c.lineWidth = Math.max(2, u * 0.05); c.lineCap = 'round';
      c.beginPath(); c.moveTo(Math.cos(arm) * u * 0.2, Math.sin(arm) * u * 0.2); c.lineTo(-Math.cos(arm) * u * 0.2, -Math.sin(arm) * u * 0.2); c.stroke();
      c.fillStyle = ART.petal; circ(c, 0, 0, u * 0.06);
      c.fillStyle = ART.water; circ(c, Math.cos(arm) * u * 0.21, Math.sin(arm) * u * 0.21, u * 0.035); circ(c, -Math.cos(arm) * u * 0.21, -Math.sin(arm) * u * 0.21, u * 0.035);
    } else if (type === 'hive') {
      /* a straw beehive (a skep) from above: rings of straw and a doorway facing the pests */
      c.fillStyle = ART.straw2; circ(c, 0, 0, u * 0.36);
      for (i = 0; i < 4; i++) { c.fillStyle = i % 2 ? ART.straw2 : ART.straw; circ(c, 0, 0, u * (0.33 - i * 0.075)); }
      c.fillStyle = ART.beeBand; ell(c, u * 0.3, 0, u * 0.05, u * 0.08, 0);
      if (!pl || !pl.beeOut) { c.fillStyle = ART.bee; ell(c, u * 0.1 + Math.sin(t * 7) * u * 0.03, -u * 0.05, u * 0.05, u * 0.035, 0); }
    }
  }
  /* Pests face +x. look: 1 normally; the eyes widen and sweat drops appear when they get nervous. */
  function drawPest(c, type, u, t, o) {
    var s = PESTS[type].size, wig = Math.sin(t * 7 + (o ? o.seed : 0)), nervous = o && o.state !== 'flee' && o.nerve < o.max * 0.4, i;
    var eyeR = u * (nervous || (o && o.state === 'flee') ? 0.06 : 0.048);
    if (type === 'snail') {
      var st = wig * u * 0.03;
      c.fillStyle = ART.snailBody; ell(c, st * 0.5, 0, u * 0.38 + st * 0.5, u * 0.12); ell(c, u * 0.3 + st, 0, u * 0.1, u * 0.1);
      c.strokeStyle = ART.snailBody; c.lineWidth = Math.max(1.5, u * 0.03); c.lineCap = 'round';
      c.beginPath(); c.moveTo(u * 0.34 + st, -u * 0.04); c.lineTo(u * 0.5 + st, -u * 0.12); c.moveTo(u * 0.34 + st, u * 0.04); c.lineTo(u * 0.5 + st, u * 0.12); c.stroke();
      eyeAt(c, u * 0.5 + st, -u * 0.12, eyeR, 1); eyeAt(c, u * 0.5 + st, u * 0.12, eyeR, 1);
      c.fillStyle = ART.snailShell2; circ(c, -u * 0.08, 0, u * 0.25);
      c.fillStyle = ART.snailShell; circ(c, -u * 0.08, 0, u * 0.21);
      c.strokeStyle = ART.snailShell2; c.lineWidth = Math.max(1.5, u * 0.03);
      c.beginPath();
      for (i = 0; i <= 18; i++) { var a = i * 0.62, r = u * 0.2 * (1 - i / 20); if (i === 0) c.moveTo(-u * 0.08 + Math.cos(a) * r, Math.sin(a) * r); else c.lineTo(-u * 0.08 + Math.cos(a) * r, Math.sin(a) * r); }
      c.stroke();
    } else if (type === 'slug') {
      var ss = wig * u * 0.04;
      c.fillStyle = ART.slug; ell(c, ss * 0.3, 0, u * 0.42 + ss * 0.5, u * 0.13);
      c.fillStyle = ART.slug2; ell(c, u * 0.02, 0, u * 0.17, u * 0.1);
      c.strokeStyle = ART.slug; c.lineWidth = Math.max(1.5, u * 0.03); c.lineCap = 'round';
      c.beginPath(); c.moveTo(u * 0.36 + ss, -u * 0.04); c.lineTo(u * 0.52 + ss, -u * 0.11); c.moveTo(u * 0.36 + ss, u * 0.04); c.lineTo(u * 0.52 + ss, u * 0.11); c.stroke();
      eyeAt(c, u * 0.52 + ss, -u * 0.11, eyeR, 1); eyeAt(c, u * 0.52 + ss, u * 0.11, eyeR, 1);
    } else if (type === 'beetle') {
      c.strokeStyle = ART.leg; c.lineWidth = Math.max(1.5, u * 0.025); c.lineCap = 'round';
      c.beginPath();
      for (i = -1; i <= 1; i++) for (var sd = -1; sd <= 1; sd += 2) { var sw = (i + sd) % 2 ? wig : -wig; c.moveTo(i * u * 0.11, sd * u * 0.12); c.lineTo(i * u * 0.11 + sw * u * 0.05 + u * 0.03 * i, sd * u * 0.27); }
      c.moveTo(u * 0.26, -u * 0.04); c.lineTo(u * 0.4, -u * 0.13); c.moveTo(u * 0.26, u * 0.04); c.lineTo(u * 0.4, u * 0.13);
      c.stroke();
      c.fillStyle = ART.leg; ell(c, u * 0.22, 0, u * 0.08, u * 0.09);
      c.fillStyle = ART.beetle2; ell(c, -u * 0.03, 0, u * 0.24, u * 0.19);
      c.fillStyle = ART.beetle; ell(c, -u * 0.04, -u * 0.08, u * 0.2, u * 0.085, 0.08); ell(c, -u * 0.04, u * 0.08, u * 0.2, u * 0.085, -0.08);
      c.fillStyle = ART.beetleHi; ell(c, -u * 0.08, -u * 0.1, u * 0.07, u * 0.025, 0.1);
      eyeAt(c, u * 0.27, -u * 0.05, eyeR * 0.85, 1); eyeAt(c, u * 0.27, u * 0.05, eyeR * 0.85, 1);
    } else if (type === 'hopper') {
      var air = o && o.state === 'hop' ? Math.sin(Math.min(1, o.hopT) * Math.PI) : 0;
      c.save(); c.scale(1 + air * 0.35, 1 + air * 0.35);
      c.strokeStyle = ART.hopper2; c.lineWidth = Math.max(2, u * 0.045); c.lineCap = 'round';
      var kick = air ? 0.12 : 0;
      c.beginPath(); c.moveTo(-u * 0.02, -u * 0.05); c.lineTo(-u * 0.14, -u * 0.2); c.lineTo(-u * (0.36 + kick), -u * 0.1);
      c.moveTo(-u * 0.02, u * 0.05); c.lineTo(-u * 0.14, u * 0.2); c.lineTo(-u * (0.36 + kick), u * 0.1); c.stroke();
      c.lineWidth = Math.max(1, u * 0.018);
      c.beginPath(); c.moveTo(u * 0.3, -u * 0.03); c.quadraticCurveTo(u * 0.45, -u * 0.2, u * 0.55, -u * 0.18); c.moveTo(u * 0.3, u * 0.03); c.quadraticCurveTo(u * 0.45, u * 0.2, u * 0.55, u * 0.18); c.stroke();
      c.fillStyle = ART.hopper; ell(c, 0, 0, u * 0.3, u * 0.08);
      c.fillStyle = ART.hopper2; ell(c, -u * 0.05, 0, u * 0.2, u * 0.05);
      c.fillStyle = ART.hopper; ell(c, u * 0.27, 0, u * 0.08, u * 0.07);
      eyeAt(c, u * 0.3, -u * 0.06, eyeR * 0.8, 1); eyeAt(c, u * 0.3, u * 0.06, eyeR * 0.8, 1);
      c.restore();
    } else if (type === 'aphids') {
      c.fillStyle = ART.aphid; ell(c, 0, 0, u * 0.12, u * 0.08);
      c.fillStyle = ART.leafHi; ell(c, -u * 0.03, 0, u * 0.06, u * 0.05);
      eyeAt(c, u * 0.1, -u * 0.035, u * 0.028, 1); eyeAt(c, u * 0.1, u * 0.035, u * 0.028, 1);
    } else if (type === 'boss') {
      /* a long caterpillar: segments that ripple, yellow spots and a big friendly head */
      for (i = 5; i >= 0; i--) {
        var sx = -u * (0.22 * i) * s * 0.75, sy = Math.sin(t * 4 - i * 0.8) * u * 0.05;
        c.fillStyle = ART.cat2; circ(c, sx, sy, u * 0.19);
        c.fillStyle = ART.cat; circ(c, sx, sy, u * 0.16);
        c.fillStyle = ART.catSpot; circ(c, sx - u * 0.03, sy - u * 0.07, u * 0.04); circ(c, sx - u * 0.03, sy + u * 0.07, u * 0.04);
      }
      c.fillStyle = ART.catHead; circ(c, u * 0.2, 0, u * 0.22);
      c.strokeStyle = ART.leg; c.lineWidth = Math.max(1.5, u * 0.025); c.lineCap = 'round';
      c.beginPath(); c.moveTo(u * 0.32, -u * 0.1); c.lineTo(u * 0.46, -u * 0.22); c.moveTo(u * 0.32, u * 0.1); c.lineTo(u * 0.46, u * 0.22); c.stroke();
      eyeAt(c, u * 0.3, -u * 0.08, eyeR * 1.4, 1); eyeAt(c, u * 0.3, u * 0.08, eyeR * 1.4, 1);
    }
    if (nervous) {   /* sweat drops: this pest is getting nervous */
      c.fillStyle = ART.sweat;
      var dy = ((t * 1.5 + (o ? o.seed : 0)) % 1) * u * 0.1;
      ell(c, u * 0.05, -u * 0.26 - dy, u * 0.03, u * 0.045); ell(c, -u * 0.08, u * 0.24 + dy, u * 0.025, u * 0.04);
    }
  }
  function drawLettuce(c, u) {
    c.fillStyle = ART.lettuce2; for (var i = 0; i < 7; i++) { var a = i * 0.9; ell(c, Math.cos(a) * u * 0.17, Math.sin(a) * u * 0.17, u * 0.17, u * 0.12, a); }
    c.fillStyle = ART.lettuce; for (i = 0; i < 5; i++) { a = i * 1.25 + 0.4; ell(c, Math.cos(a) * u * 0.08, Math.sin(a) * u * 0.08, u * 0.12, u * 0.09, a); }
    c.fillStyle = ART.lettuceVein; circ(c, 0, 0, u * 0.05);
  }
  function drawBee(c, u, t) {
    c.fillStyle = ART.wing; var fl = Math.sin(t * 60) * 0.4;
    ell(c, -u * 0.01, -u * 0.05, u * 0.05, u * 0.03, -0.6 + fl); ell(c, -u * 0.01, u * 0.05, u * 0.05, u * 0.03, 0.6 - fl);
    c.fillStyle = ART.bee; ell(c, 0, 0, u * 0.07, u * 0.045);
    c.fillStyle = ART.beeBand; c.fillRect(-u * 0.02, -u * 0.04, u * 0.02, u * 0.08); c.fillRect(u * 0.025, -u * 0.035, u * 0.015, u * 0.07);
  }

  /* ================= the page ================= */
  GamesInTime.register({
    id: 'garden-guard',
    frame: 'stage',
    /* Read-only handles for automated tests: the simulation can be run without a page. */
    testing: { LEVELS: LEVELS, ENDLESS: ENDLESS, PLANTS: PLANTS, PESTS: PESTS, newGarden: newGarden, stepGarden: stepGarden, plant: plant, dig: dig, canPlant: canPlant, collectAll: collectAll, waveBudget: waveBudget, STEP: STEP },
    mount: function (root, api) {
      var h = api.h;
      var destroyed = false;
      var reduced = !!api.reducedMotion;
      var reached = clamp(Number(api.store.get('reached', 0)) || 0, 0, LEVELS.length);   /* levels cleared so far */
      var endlessBest = Number(api.store.get('endless-best', 0)) || 0;
      var chosen = clamp(Number(api.store.get('level', 0)) || 0, 0, LEVELS.length);
      if (chosen > reached) chosen = reached;

      root.appendChild(h('style', null,
        '.game-garden-guard [hidden] { display: none !important; }' +
        '.game-garden-guard { --gg-ink: var(--ink); }' +
        '.game-garden-guard .gg-top { display: flex; flex-wrap: wrap; gap: .5rem .7rem; align-items: center; justify-content: space-between; margin-bottom: .55rem; }' +
        '.game-garden-guard .gg-sun { display: inline-flex; align-items: center; gap: .4rem; min-height: 42px; padding: .2rem .9rem .2rem .45rem; border-radius: 999px; background: var(--surface-2); border: 2px solid var(--line); font-weight: 800; font-size: 1.15rem; font-variant-numeric: tabular-nums; }' +
        '.game-garden-guard .gg-sun i { width: 28px; height: 28px; border-radius: 50%; background: radial-gradient(circle at 40% 38%, #fff6b0, #ffd23a 45%, #ffb12e 75%); box-shadow: 0 0 0 3px rgba(255, 210, 58, .25); display: inline-block; }' +
        '.game-garden-guard .gg-sun.flash { border-color: var(--red); }' +
        '.game-garden-guard .gg-tools { display: flex; gap: .45rem; flex-wrap: wrap; }' +
        '.game-garden-guard .gg-tools .btn { min-height: 42px; padding-inline: .9rem; }' +
        '.game-garden-guard .gg-wave { flex: 1 1 100%; display: flex; align-items: center; gap: .6rem; font-weight: 700; font-size: .95rem; color: var(--ink-muted); order: 3; }' +
        '.game-garden-guard .gg-bar { position: relative; flex: 1; height: 12px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--line); }' +
        '.game-garden-guard .gg-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; background: linear-gradient(90deg, var(--leaf), var(--gold)); width: 0; }' +
        '.game-garden-guard .gg-flag { position: absolute; top: -9px; width: 14px; height: 18px; margin-left: -7px; }' +
        '.game-garden-guard .gg-flag::before { content: ""; position: absolute; left: 2px; top: 0; width: 2px; height: 18px; background: var(--ink); }' +
        '.game-garden-guard .gg-flag::after { content: ""; position: absolute; left: 4px; top: 1px; width: 10px; height: 7px; background: var(--rose); clip-path: polygon(0 0, 100% 50%, 0 100%); }' +
        '.game-garden-guard .gg-seeds { display: flex; gap: .4rem; margin-bottom: .55rem; flex-wrap: nowrap; }' +
        '.game-garden-guard .gg-card { position: relative; flex: 1 1 0; min-width: 0; max-width: 92px; min-height: 64px; padding: 4px 2px 3px; border-radius: 12px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; font-weight: 800; font-size: .85rem; line-height: 1.1; overflow: hidden; cursor: pointer; touch-action: manipulation; }' +
        '.game-garden-guard .gg-card canvas { width: 36px; height: 36px; display: block; }' +
        '.game-garden-guard .gg-card .gg-cost { font-variant-numeric: tabular-nums; }' +
        '.game-garden-guard .gg-card[aria-pressed="true"] { border-color: var(--gold); box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 45%, transparent); background: color-mix(in srgb, var(--gold) 18%, var(--surface-2)); }' +
        '.game-garden-guard .gg-card.poor .gg-cost { color: var(--red); }' +
        '.game-garden-guard .gg-card.poor canvas, .game-garden-guard .gg-card.wait canvas { opacity: .45; }' +
        '.game-garden-guard .gg-card .gg-charge { position: absolute; left: 0; right: 0; bottom: 0; height: 100%; background: rgba(0, 0, 0, .45); transform-origin: top; transform: scaleY(0); pointer-events: none; }' +
        '.game-garden-guard .gg-card .gg-key { position: absolute; top: 2px; left: 5px; font-size: .68rem; color: var(--ink-muted); }' +
        '.game-garden-guard .gg-stage { position: relative; border-radius: 14px; overflow: hidden; background: #2f6427; }' +
        '.game-garden-guard .gg-canvas { display: block; width: 100%; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: pointer; }' +
        '.game-garden-guard .gg-canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }' +
        '.game-garden-guard .gg-overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: 10px; background: rgba(4, 16, 10, .45); }' +
        '.game-garden-guard .gg-overlay[hidden] { display: none; }' +
        '.game-garden-guard .gg-panel { background: color-mix(in srgb, var(--surface) 94%, transparent); border: 2px solid var(--line); border-radius: 18px; padding: .8rem 1rem .9rem; max-width: 40rem; width: 100%; max-height: 100%; overflow: auto; display: grid; gap: .55rem; justify-items: center; text-align: center; box-shadow: var(--shadow); }' +
        '.game-garden-guard .gg-title { margin: 0; font-family: var(--font-poster); font-weight: 900; font-size: clamp(1.5rem, 1.1rem + 2vw, 2.4rem); line-height: 1.05; color: var(--leaf); letter-spacing: .02em; }' +
        '.game-garden-guard .gg-msg { margin: 0; font-weight: 600; line-height: 1.35; color: var(--ink); max-width: 34rem; }' +
        '.game-garden-guard .gg-levels { display: flex; flex-wrap: wrap; gap: .35rem; justify-content: center; }' +
        '.game-garden-guard .gg-levels button { min-width: 44px; min-height: 44px; border-radius: 12px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); font-weight: 800; font-size: 1rem; padding: 0 .55rem; }' +
        '.game-garden-guard .gg-levels button[aria-pressed="true"] { background: var(--gold); border-color: var(--gold); color: var(--on-era); }' +
        '.game-garden-guard .gg-levels button:disabled { opacity: .45; cursor: not-allowed; }' +
        '.game-garden-guard .gg-plan { width: 100%; display: grid; gap: .35rem; text-align: left; background: var(--surface-2); border-radius: 12px; padding: .55rem .7rem; }' +
        '.game-garden-guard .gg-plan h3 { margin: 0; font-size: 1.05rem; color: var(--gold); }' +
        '.game-garden-guard .gg-plan p { margin: 0; font-size: .92rem; line-height: 1.35; color: var(--ink); }' +
        '.game-garden-guard .gg-row { display: flex; flex-wrap: wrap; gap: .25rem .7rem; align-items: center; font-size: .9rem; }' +
        '.game-garden-guard .gg-row strong { color: var(--ink-muted); font-size: .8rem; text-transform: uppercase; letter-spacing: .06em; margin-right: .1rem; }' +
        '.game-garden-guard .gg-chip { display: inline-flex; align-items: center; gap: .25rem; font-weight: 700; }' +
        '.game-garden-guard .gg-chip canvas { width: 28px; height: 28px; }' +
        '.game-garden-guard .gg-chip.new { color: var(--leaf); }' +
        '.game-garden-guard .gg-big { min-height: 52px; font-size: 1.15rem; padding: .5rem 1.6rem; }' +
        '.game-garden-guard .gg-actions { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }' +
        '@media (max-width: 480px) { .game-garden-guard .gg-seeds { gap: .25rem; } .game-garden-guard .gg-card { min-height: 58px; font-size: .78rem; border-radius: 10px; } .game-garden-guard .gg-card canvas { width: 30px; height: 30px; } .game-garden-guard .gg-card .gg-key { display: none; } .game-garden-guard .gg-panel { padding: .6rem .6rem .7rem; gap: .45rem; } .game-garden-guard .gg-plan p, .game-garden-guard .gg-row { font-size: .85rem; } .game-garden-guard .gg-tools .btn { padding-inline: .7rem; } .game-garden-guard .gg-sun { font-size: 1.05rem; } }'));

      /* ---------- DOM ---------- */
      var sunNum = h('span', null, '0');
      var sunBox = h('div', { class: 'gg-sun', 'aria-label': 'Sunshine' }, h('i', { 'aria-hidden': 'true' }), sunNum);
      var pauseBtn = h('button', { class: 'btn', type: 'button', disabled: true, onclick: function () { togglePause(); focusGame(); } }, 'Pause');
      var speedBtn = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false', 'aria-label': 'Fast forward', onclick: function () { toggleSpeed(); focusGame(); } }, '▶▶ 1×');
      var menuBtn = h('button', { class: 'btn', type: 'button', onclick: function () { showMenu(); } }, 'Levels');
      var waveText = h('span', null, '');
      var waveFill = h('div', { class: 'gg-fill' });
      var waveBar = h('div', { class: 'gg-bar', 'aria-hidden': 'true' }, waveFill);
      var top = h('div', { class: 'gg-top' }, sunBox, h('div', { class: 'gg-tools' }, pauseBtn, speedBtn, menuBtn), h('div', { class: 'gg-wave' }, waveText, waveBar));
      var seeds = h('div', { class: 'gg-seeds', role: 'group', 'aria-label': 'Seed packets' });
      var canvas = h('canvas', { class: 'gg-canvas', role: 'img', tabindex: '0', 'aria-label': 'A vegetable garden with five beds. Lettuces grow at one end; pests crawl in from the wild end.' });
      var ovTitle = h('p', { class: 'gg-title' }, 'Garden Guard');
      var ovMsg = h('p', { class: 'gg-msg' }, '');
      var ovLevels = h('div', { class: 'gg-levels', role: 'group', 'aria-label': 'Choose a level' });
      var ovPlan = h('div', { class: 'gg-plan' });
      var ovActions = h('div', { class: 'gg-actions' });
      var overlay = h('div', { class: 'gg-overlay' }, h('div', { class: 'gg-panel' }, ovTitle, ovMsg, ovLevels, ovPlan, ovActions));
      var stage = h('div', { class: 'gg-stage' }, canvas, overlay);
      var note = h('p', { class: 'game-note' }, 'Tap a seed packet, then a square in a bed. Tap sunshine to collect it. Keyboard: arrow keys move the gold square, 1 to 5 pick a plant, Enter or Space plants it, C collects all the sunshine, Delete digs a plant up, P pauses, F fast forwards.');
      root.appendChild(top);
      root.appendChild(seeds);
      root.appendChild(stage);
      root.appendChild(note);

      var ctx = canvas.getContext('2d');
      var bg = document.createElement('canvas');
      var sunSprite = document.createElement('canvas');
      var W = 300, H = 300, dpr = 1, vertical = false;
      var G = { gx: 0, gy: 0, cw: 40, ch: 40, u: 40 };
      var COL = {};
      function readColours() {
        var cs = getComputedStyle(root);
        function v(n, fb) { var s = cs.getPropertyValue(n).trim(); return s || fb; }
        COL.gold = v('--gold', '#3fd0ff'); COL.focus = v('--focus', '#b4f000'); COL.ink = v('--ink', '#ffffff'); COL.red = v('--red', '#ff6e8a');
        COL.rose = v('--rose', '#ff6ec7'); COL.leaf = v('--leaf', '#b4f000'); COL.bg = v('--bg', '#061423');
        COL.head = v('--font-head', 'system-ui, sans-serif'); COL.poster = v('--font-poster', 'sans-serif');
      }

      /* ---------- state ---------- */
      var g = null;                 /* the garden simulation (null on the first menu) */
      var phase = 'menu';           /* menu | playing | paused | over */
      var speed = 1, acc = 0, lastT = 0, rafId = 0;
      var selected = null;          /* the seed packet in your hand: a plant type, 'dig', or null */
      var cursor = { lane: 2, col: 2, show: false };
      var hover = null;             /* {lane, col} under the mouse */
      var fx = makePool(70, function () { return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, r: 2, col: '#fff', kind: 'dot' }; });
      var floaters = makePool(14, function () { return { x: 0, y: 0, text: '', col: '#fff', life: 0, max: 1, size: 16 }; });
      var flyers = makePool(16, function () { return { x: 0, y: 0, tx: 0, ty: 0, t: 0 }; });
      var banner = { text: '', until: 0 };
      var lastStatus = '', lastSound = { flick: 0, hit: 0, munch: 0 }, lastLabelAt = 0;
      var cards = {};

      /* ---------- layout: wide screens lie the beds across, phones stand them up ---------- */
      function resize() {
        var w = Math.max(240, Math.round(stage.clientWidth || root.clientWidth || 300));
        dpr = Math.min(2, window.devicePixelRatio || 1);
        vertical = w < 600;
        if (vertical) {
          G.cw = w / LANES;
          G.ch = clamp(G.cw * 0.8, 38, 60);
          H = Math.round(G.ch * (COLS + 1.9));
          G.gx = 0; G.gy = G.ch * 0.9;
        } else {
          /* a strip of fence along the top and a path along the bottom give the menu card room */
          G.cw = w / (COLS + 1.9);
          G.ch = clamp(G.cw * 0.86, 44, 96);
          H = Math.max(Math.round(G.ch * (LANES + 0.8)), 440);
          G.gx = G.cw; G.gy = Math.round((H - G.ch * LANES) * 0.62);
        }
        G.u = Math.min(G.cw, G.ch);
        W = w;
        canvas.style.height = H + 'px';
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        readColours();
        buildBackground();
        buildSunSprite();
        draw(performance.now());
        if (!overlay.hidden) fitCard();
      }
      /* garden position (lane, p squares from the lettuce end) to the screen */
      function sx(lane, p) { return vertical ? G.gx + (lane + 0.5) * G.cw : G.gx + p * G.cw; }
      function sy(lane, p) { return vertical ? G.gy + (COLS - p) * G.ch : G.gy + (lane + 0.5) * G.ch; }
      var A_PEST = 0;    /* the direction the pests come from, as an angle on the screen */
      function cellRect(lane, col) {
        return vertical ? { x: G.gx + lane * G.cw, y: G.gy + (COLS - 1 - col) * G.ch, w: G.cw, h: G.ch } : { x: G.gx + col * G.cw, y: G.gy + lane * G.ch, w: G.cw, h: G.ch };
      }
      function cellAt(x, y) {
        var lane, col;
        if (vertical) { lane = Math.floor((x - G.gx) / G.cw); col = COLS - 1 - Math.floor((y - G.gy) / G.ch); }
        else { lane = Math.floor((y - G.gy) / G.ch); col = Math.floor((x - G.gx) / G.cw); }
        if (lane < 0 || lane >= LANES || col < 0 || col >= COLS) return null;
        return { lane: lane, col: col };
      }

      function buildBackground() {
        bg.width = canvas.width; bg.height = canvas.height;
        var b = bg.getContext('2d'), rnd = seeded(2009), lanes = g ? g.lanes : levelDef(chosen).lanes, l, c, i;
        b.setTransform(dpr, 0, 0, dpr, 0, 0);
        A_PEST = vertical ? -Math.PI / 2 : 0;
        b.fillStyle = ART.grass; b.fillRect(0, 0, W, H);
        /* grass texture */
        for (i = 0; i < W * H / 90; i++) {
          b.strokeStyle = rnd() < 0.5 ? ART.grass2 : ART.grassHi; b.lineWidth = 1.2;
          var x = rnd() * W, y = rnd() * H; b.beginPath(); b.moveTo(x, y); b.lineTo(x + (rnd() - 0.5) * 3, y - 3 - rnd() * 4); b.stroke();
        }
        /* the wild end, with long grass and daisies */
        var wr = vertical ? { x: 0, y: 0, w: W, h: G.gy } : { x: G.gx + COLS * G.cw, y: G.gy, w: W - (G.gx + COLS * G.cw), h: LANES * G.ch };
        b.fillStyle = ART.wild; b.fillRect(wr.x, wr.y, wr.w, wr.h);
        for (i = 0; i < (wr.w * wr.h) / 40; i++) {
          b.strokeStyle = rnd() < 0.5 ? ART.grass : ART.grass2; b.lineWidth = 1.6;
          var gx = wr.x + rnd() * wr.w, gy = wr.y + rnd() * wr.h; b.beginPath(); b.moveTo(gx, gy); b.quadraticCurveTo(gx + 3, gy - 6, gx + (rnd() - 0.5) * 10, gy - 10 - rnd() * 8); b.stroke();
        }
        for (i = 0; i < (wr.w * wr.h) / 2600; i++) {
          var dx = wr.x + 6 + rnd() * (wr.w - 12), dy = wr.y + 6 + rnd() * (wr.h - 12);
          b.fillStyle = '#fffbe8'; for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3; ell(b, dx + Math.cos(a) * 3, dy + Math.sin(a) * 3, 2.6, 1.4, a); }
          b.fillStyle = ART.petal2; circ(b, dx, dy, 1.6);
        }
        /* landscape: a picket fence along the top and a stepping-stone path along the bottom */
        if (!vertical && G.gy > 8) {
          var fy = G.gy - 6, fh = Math.min(G.gy - 10, G.ch * 0.6);
          b.fillStyle = 'rgba(0,0,0,.18)'; b.fillRect(0, fy - 2, W, 6);
          b.fillStyle = '#efe6cf'; b.fillRect(0, fy - fh * 0.75, W, Math.max(3, fh * 0.1)); b.fillRect(0, fy - fh * 0.3, W, Math.max(3, fh * 0.1));
          for (var px = 6; px < W; px += Math.max(16, G.cw * 0.28)) {
            b.fillStyle = '#f6f0de'; b.beginPath(); b.moveTo(px, fy); b.lineTo(px, fy - fh + 5); b.lineTo(px + 5, fy - fh); b.lineTo(px + 10, fy - fh + 5); b.lineTo(px + 10, fy); b.closePath(); b.fill();
            b.fillStyle = 'rgba(0,0,0,.12)'; b.fillRect(px + 7, fy - fh + 6, 3, fh - 6);
          }
          var by0 = G.gy + LANES * G.ch;
          for (var sxp = G.gx * 0.4; sxp < W; sxp += G.cw * 0.7) {
            b.fillStyle = '#9a9384'; ell(b, sxp + (rnd() - 0.5) * 8, by0 + (H - by0) / 2, G.cw * 0.22, Math.max(4, (H - by0) * 0.28), (rnd() - 0.5) * 0.4);
          }
        }
        /* the lettuce strip */
        var lr = vertical ? { x: 0, y: G.gy + COLS * G.ch, w: W, h: H - (G.gy + COLS * G.ch) } : { x: 0, y: G.gy, w: G.gx, h: LANES * G.ch };
        b.fillStyle = ART.soilHi; b.fillRect(lr.x, lr.y, lr.w, lr.h);
        /* the beds: dark soil in squares, with timber edging */
        for (l = 0; l < LANES; l++) {
          if (!lanes[l]) {
            var r0 = cellRect(l, 0), r8 = cellRect(l, COLS - 1);
            var bx = Math.min(r0.x, r8.x), by = Math.min(r0.y, r8.y), bw = vertical ? G.cw : COLS * G.cw, bh = vertical ? COLS * G.ch : G.ch;
            b.fillStyle = 'rgba(20, 50, 15, .35)'; b.fillRect(bx, by, bw, bh);
            continue;
          }
          for (c = 0; c < COLS; c++) {
            var r = cellRect(l, c);
            b.fillStyle = (l + c) % 2 ? ART.soil : ART.soil2; b.fillRect(r.x, r.y, r.w, r.h);
            for (i = 0; i < 5; i++) { b.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.12)'; circ(b, r.x + rnd() * r.w, r.y + rnd() * r.h, 1 + rnd() * 1.5); }
          }
          var e0 = cellRect(l, 0), e8 = cellRect(l, COLS - 1);
          b.strokeStyle = ART.edge; b.lineWidth = 3;
          b.strokeRect(Math.min(e0.x, e8.x) + 1.5, Math.min(e0.y, e8.y) + 1.5, (vertical ? G.cw : COLS * G.cw) - 3, (vertical ? COLS * G.ch : G.ch) - 3);
          /* the lettuce for this bed */
          b.save(); b.translate(sx(l, -0.5), sy(l, -0.5)); drawLettuce(b, G.u); b.restore();
        }
      }
      function buildSunSprite() {
        var s = Math.round(G.u * 0.7 * dpr);
        sunSprite.width = s; sunSprite.height = s;
        var c = sunSprite.getContext('2d'), m = s / 2;
        c.fillStyle = 'rgba(255, 220, 90, .35)'; circ(c, m, m, m);
        c.fillStyle = ART.sunRay;
        for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5; c.beginPath(); c.moveTo(m + Math.cos(a - 0.18) * m * 0.5, m + Math.sin(a - 0.18) * m * 0.5); c.lineTo(m + Math.cos(a) * m * 0.95, m + Math.sin(a) * m * 0.95); c.lineTo(m + Math.cos(a + 0.18) * m * 0.5, m + Math.sin(a + 0.18) * m * 0.5); c.fill(); }
        var gr = c.createRadialGradient(m * 0.85, m * 0.8, m * 0.05, m, m, m * 0.55);
        gr.addColorStop(0, '#fffbd0'); gr.addColorStop(0.5, ART.sun); gr.addColorStop(1, ART.sunRay);
        c.fillStyle = gr; circ(c, m, m, m * 0.52);
      }

      /* ---------- seed packets ---------- */
      function iconCanvas(size, paint) {
        var r = Math.min(2, window.devicePixelRatio || 1), cv = h('canvas', { width: Math.round(size * r), height: Math.round(size * r), 'aria-hidden': 'true' });
        var c = cv.getContext('2d'); c.setTransform(r, 0, 0, r, 0, 0); c.translate(size / 2, size / 2); paint(c, size);
        return cv;
      }
      function plantIcon(type, size) { return iconCanvas(size, function (c, s) { c.rotate(-Math.PI / 2); drawPlant(c, type, s * 1.2, 0, null); }); }
      function pestIcon(type, size) { return iconCanvas(size, function (c, s) { var k = PESTS[type].size > 1 ? 0.62 : type === 'aphids' ? 2.2 : 1.1; c.rotate(-Math.PI * 0.75); if (type === 'boss') c.translate(s * 0.22, 0); drawPest(c, type, s * k, 0.3, null); }); }
      function buildSeeds() {
        seeds.replaceChildren();
        cards = {};
        var list = g ? g.L.plants : levelDef(chosen).plants;
        list.forEach(function (type, i) {
          var P = PLANTS[type];
          var charge = h('span', { class: 'gg-charge' });
          var btn = h('button', { class: 'gg-card', type: 'button', 'aria-pressed': 'false', 'aria-label': P.name + ', ' + P.cost + ' sunshine. ' + P.short + '. Key ' + (i + 1) + '.' },
            h('span', { class: 'gg-key', 'aria-hidden': 'true' }, String(i + 1)), plantIcon(type, 36), h('span', { class: 'gg-cost', 'aria-hidden': 'true' }, String(P.cost)), charge);
          btn.addEventListener('click', function () { pick(type); });
          cards[type] = { btn: btn, charge: charge, state: '' };
          seeds.appendChild(btn);
        });
        var digBtn = h('button', { class: 'gg-card', type: 'button', 'aria-pressed': 'false', 'aria-label': 'Trowel: dig up a plant to make room. Key Delete.' },
          iconCanvas(36, function (c, s) {
            c.rotate(-0.8);
            c.fillStyle = ART.metal; c.beginPath(); c.moveTo(-s * 0.05, -s * 0.12); c.quadraticCurveTo(s * 0.3, -s * 0.1, s * 0.42, 0); c.quadraticCurveTo(s * 0.3, s * 0.1, -s * 0.05, s * 0.12); c.closePath(); c.fill();
            c.fillStyle = ART.straw2; c.fillRect(-s * 0.42, -s * 0.06, s * 0.36, s * 0.12);
          }), h('span', { class: 'gg-cost', 'aria-hidden': 'true' }, 'Dig'));
        digBtn.addEventListener('click', function () { pick('dig'); });
        cards.dig = { btn: digBtn, charge: null, state: '' };
        seeds.appendChild(digBtn);
      }
      function updateSeeds() {
        if (!g) return;
        sunNum.textContent = String(g.sunshine);
        for (var k in cards) {
          var cd = cards[k];
          cd.btn.setAttribute('aria-pressed', String(selected === k));
          if (k === 'dig') continue;
          var P = PLANTS[k], wait = g.recharge[k] > 0, poor = g.sunshine < P.cost;
          var st = (wait ? 'w' : '') + (poor ? 'p' : '');
          if (st !== cd.state) { cd.state = st; cd.btn.classList.toggle('wait', wait); cd.btn.classList.toggle('poor', poor); }
          var frac = wait ? g.recharge[k] / P.recharge : 0;
          cd.charge.style.transform = 'scaleY(' + frac.toFixed(3) + ')';
        }
      }

      /* ---------- the menu card: levels and the plan for each level ---------- */
      function chip(label, icon, isNew) { return h('span', { class: 'gg-chip' + (isNew ? ' new' : '') }, icon, label + (isNew ? ' (new)' : '')); }
      function planFor(i) {
        var L = levelDef(i), parts = [];
        var flags = L.endless ? 'Every 5th wave is a big wave, and every 10th brings Giant Caterpillars.' :
          L.waves + ' waves. ' + (L.flags.length === 1 ? 'Wave ' + L.flags[0] + ' is a big wave.' : 'Waves ' + L.flags.join(' and ') + ' are big waves.');
        var pests = L.pests.slice();
        if (L.bosses || L.newPest === 'boss' || L.endless) pests.push('boss');
        parts.push(h('h3', null, (L.endless ? '' : 'Level ' + (i + 1) + ' · ') + L.name));
        parts.push(h('div', { class: 'gg-row' }, h('strong', null, 'Coming'), pests.map(function (t) { return chip(PESTS[t].name, pestIcon(t, 28), t === L.newPest); })));
        parts.push(h('div', { class: 'gg-row' }, h('strong', null, 'Your plants'), L.plants.map(function (t) { return chip(PLANTS[t].name, plantIcon(t, 28), t === L.newPlant && i > 0); })));
        if (L.newPest && PESTS[L.newPest]) parts.push(h('p', null, 'New pest: ' + PESTS[L.newPest].name + '. ' + PESTS[L.newPest].text));
        if (L.newPlant && i > 0) parts.push(h('p', null, 'New plant: ' + PLANTS[L.newPlant].name + '. ' + PLANTS[L.newPlant].text));
        parts.push(h('p', null, flags + ' ' + L.tip));
        return parts;
      }
      function renderLevels() {
        ovLevels.replaceChildren();
        for (var i = 0; i <= LEVELS.length; i++) {
          (function (i) {
            var locked = i > reached, isEnd = i === LEVELS.length;
            var label = isEnd ? (locked ? '🔒 Endless' : 'Endless') : (locked ? '🔒' : String(i + 1));
            var b = h('button', { type: 'button', 'aria-pressed': String(i === chosen), disabled: locked, 'aria-label': (isEnd ? 'Endless garden' : 'Level ' + (i + 1) + ', ' + LEVELS[i].name) + (locked ? ', locked' : '') }, label);
            b.addEventListener('click', function () {
              chosen = i; api.store.set('level', i); api.sound('click'); api.unlockSound();
              renderLevels(); ovPlan.replaceChildren.apply(ovPlan, planFor(chosen)); fitCard();
              buildSeeds(); buildBackground(); draw(performance.now());
              var again = ovLevels.querySelector('[aria-pressed="true"]'); if (again) again.focus({ preventScroll: true });
            });
            ovLevels.appendChild(b);
          })(i);
        }
      }
      function showCard(title, msg, mode, quiet) {
        overlay.hidden = false;
        ovTitle.textContent = title;
        ovMsg.textContent = msg;
        ovLevels.hidden = mode !== 'menu';
        if (mode === 'menu') renderLevels();
        var planLevel = mode === 'next' ? Math.min(chosen, LEVELS.length) : chosen;
        ovPlan.hidden = mode === 'pause';
        if (!ovPlan.hidden) ovPlan.replaceChildren.apply(ovPlan, planFor(planLevel));
        ovActions.replaceChildren();
        if (mode === 'pause') ovActions.appendChild(h('button', { class: 'btn btn-primary gg-big', type: 'button', onclick: function () { togglePause(); focusGame(); } }, '▶ Carry on'));
        else ovActions.appendChild(h('button', { class: 'btn btn-primary gg-big', type: 'button', onclick: function () { startLevel(chosen); } }, mode === 'retry' ? '↻ Try again' : '▶ ' + (chosen >= LEVELS.length ? 'Start endless' : 'Start level ' + (chosen + 1))));
        if (mode === 'retry' || mode === 'next' || mode === 'pause') ovActions.appendChild(h('button', { class: 'btn', type: 'button', onclick: function () { showMenu(); } }, 'Levels'));
        fitCard();
        var first = ovActions.querySelector('button');
        if (first && !quiet) { try { first.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      }
      /* If the card is taller than the garden on a small screen, it sheds the least important lines first: the plan's
         longer sentences, then (on the menu only) the intro line, then the plant and pest pictures. The title, the
         result message and the buttons always stay. */
      function fitCard() {
        var panel = ovMsg.parentNode, extras = ovPlan.querySelectorAll('p'), rows = ovPlan.querySelectorAll('.gg-row'), i;
        ovMsg.hidden = false;
        for (i = 0; i < extras.length; i++) extras[i].hidden = false;
        for (i = 0; i < rows.length; i++) rows[i].hidden = false;
        panel.scrollTop = 0;
        function tooTall() { return panel.scrollHeight > panel.clientHeight + 1; }
        for (i = extras.length - 1; i >= 0 && tooTall(); i--) extras[i].hidden = true;
        if (tooTall() && ovTitle.textContent === 'Garden Guard') ovMsg.hidden = true;
        for (i = rows.length - 1; i >= 0 && tooTall(); i--) rows[i].hidden = true;
      }
      /* The level menu. Leaving a level part way through just tidies the garden away. */
      function showMenu(quiet) {
        clearTimeout(cardTimer);
        g = null;
        selected = null;
        phase = 'menu';
        stopLoop();
        pauseBtn.disabled = true; pauseBtn.textContent = 'Pause';
        buildSeeds();
        buildBackground();
        draw(performance.now());
        showCard('Garden Guard', 'Pests are crawling towards your lettuces. Plant helpers to shoo them home. Nobody gets hurt: when a pest loses its nerve, it runs away.', 'menu', quiet);
        api.status('Pick a level, then press Start');
        sunNum.textContent = String(levelDef(chosen).sun);
        updateWave();
      }

      /* ---------- playing ---------- */
      function startLevel(i) {
        api.unlockSound();
        clearTimeout(cardTimer);
        chosen = i;
        api.store.set('level', i);
        g = newGarden(i, Math.floor(api.random() * 1e9) + 1);
        selected = null; cursor.lane = 2; cursor.col = 2;
        for (var k = 0; k < fx.length; k++) fx[k].on = false;
        for (k = 0; k < floaters.length; k++) floaters[k].on = false;
        for (k = 0; k < flyers.length; k++) flyers[k].on = false;
        banner.until = 0;
        overlay.hidden = true;
        phase = 'playing';
        pauseBtn.disabled = false; pauseBtn.textContent = 'Pause';
        buildSeeds();
        buildBackground();
        updateSeeds(); updateWave();
        api.sound('pop');
        say((g.L.endless ? 'Endless garden' : 'Level ' + (i + 1) + ', ' + g.L.name) + '. Plant Sun Catchers to make sunshine. The first pests come in ' + Math.round(g.L.first) + ' seconds.', 2500);
        lastWaveSeen = 0;
        describe();
        focusGame();
        startLoop();
      }
      function togglePause() {
        if (phase === 'playing') {
          phase = 'paused'; stopLoop(); pauseBtn.textContent = 'Carry on';
          showCard('Paused', 'The pests are waiting politely.', 'pause');
          api.status('Paused');
        } else if (phase === 'paused' && g) {
          phase = 'playing'; overlay.hidden = true; pauseBtn.textContent = 'Pause'; lastStatus = ''; lastLabelAt = 0; startLoop();
        }
      }
      function toggleSpeed() {
        speed = speed === 1 ? 2 : speed === 2 ? 3 : 1;
        speedBtn.textContent = '▶▶ ' + speed + '×';
        speedBtn.setAttribute('aria-pressed', String(speed > 1));
        api.sound('click');
        api.announce(speed === 1 ? 'Normal speed' : speed + ' times speed');
      }
      function say(text, hold) { api.status(text); lastStatus = text; lastLabelAt = performance.now() + (hold || 0); }
      function pick(type) {
        if (!g || phase !== 'playing') return;
        api.unlockSound();
        if (selected === type) { selected = null; api.sound('click'); updateSeeds(); say('Put away. Pick a seed packet.'); return; }
        if (type !== 'dig') {
          var P = PLANTS[type];
          if (g.recharge[type] > 0) { api.sound('wrong'); say(P.name + ' is still growing a new seed. Wait for the shade to go.'); return; }
          if (g.sunshine < P.cost) { api.sound('wrong'); flashSun(); say('Not enough sunshine. ' + P.name + ' needs ' + P.cost + '. Collect more.'); return; }
        }
        selected = type;
        cursor.show = true;
        api.sound('click');
        updateSeeds();
        say(type === 'dig' ? 'Trowel ready. Tap a plant to dig it up.' : PLANTS[type].name + ' picked. Now tap a square in a bed.');
      }
      var sunFlashTimer = 0, cardTimer = 0;
      function flashSun() { sunBox.classList.add('flash'); clearTimeout(sunFlashTimer); sunFlashTimer = setTimeout(function () { sunBox.classList.remove('flash'); }, 500); }
      function actAt(lane, col) {
        if (!g || phase !== 'playing') return;
        if (!selected) {
          var pl = g.grid[lane] && g.grid[lane][col];
          say(pl ? PLANTS[pl.type].name + '. ' + PLANTS[pl.type].text : 'Pick a seed packet first, then tap a square.');
          return;
        }
        if (selected === 'dig') {
          if (dig(g, lane, col)) { api.sound('thud'); puff(sx(lane, col + 0.5), sy(lane, col + 0.5), ART.soilHi, 8); selected = null; say('Dug up. That square is free again.'); describe(); }
          else { api.sound('wrong'); say('No plant there to dig up.'); }
          updateSeeds();
          return;
        }
        var why = canPlant(g, selected, lane, col);
        if (why) { api.sound('wrong'); if (/sunshine/.test(why)) flashSun(); say(why); return; }
        var type = selected;
        plant(g, type, lane, col);
        api.sound('pop'); api.tone(660, 0.07, 'triangle', 0.06);
        puff(sx(lane, col + 0.5), sy(lane, col + 0.5), ART.leafHi, 8);
        selected = null;
        updateSeeds();
        say(PLANTS[type].name + ' planted. ' + g.sunshine + ' sunshine left.');
        describe();
      }
      /* tap sunshine: is there a sun drop near this point? */
      function sunAt(x, y) {
        if (!g) return null;
        var best = null, bd = G.u * 0.55;
        for (var i = 0; i < g.suns.length; i++) {
          var s = g.suns[i]; if (!s.on) continue;
          var p = sunPos(s), d = Math.hypot(p.x - x, p.y - y);
          if (d < bd) { bd = d; best = s; }
        }
        return best;
      }
      var tmpPos = { x: 0, y: 0 };
      function sunPos(s) {
        tmpPos.x = sx(s.lane, s.p); tmpPos.y = sy(s.lane, s.p);
        if (s.fall > 0) tmpPos.y -= s.from === 'sky' ? s.fall * (tmpPos.y + G.u) : Math.sin(s.fall / 0.5 * Math.PI) * G.u * 0.4;
        return tmpPos;
      }
      function grabSun(s) {
        var p = sunPos(s), f = take(flyers);
        if (f) { f.x = p.x; f.y = p.y; f.t = 0; }
        collectSun(g, s);
        api.sound('coin');
        floatText('+' + SUN_VALUE, p.x, p.y - G.u * 0.3, ART.sun);
        updateSeeds();
        describe();
      }
      function grabAll() {
        if (!g) return;
        var n = 0;
        for (var i = 0; i < g.suns.length; i++) if (g.suns[i].on) { grabSun(g.suns[i]); n++; }
        if (!n) say('No sunshine to collect just now.');
      }

      /* ---------- effects ---------- */
      function puff(x, y, col, n) {
        for (var i = 0; i < (reduced ? Math.min(3, n) : n); i++) {
          var p = take(fx); if (!p) return;
          var a = api.random() * Math.PI * 2, sp = (0.4 + api.random()) * G.u * 1.4;
          p.x = x; p.y = y; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.life = p.max = 0.4 + api.random() * 0.3; p.r = 1.5 + api.random() * G.u * 0.05; p.col = col;
        }
      }
      function floatText(text, x, y, col, size) {
        var f = take(floaters);
        if (!f) { floaters[0].on = false; f = take(floaters); }
        f.x = clamp(x, 30, W - 30); f.y = clamp(y, 18, H - 10); f.text = text; f.col = col; f.life = f.max = 1; f.size = size || clamp(G.u * 0.32, 13, 22);
      }

      /* ---------- the loop ---------- */
      function startLoop() { if (!rafId && !destroyed && !document.hidden) { lastT = performance.now(); rafId = requestAnimationFrame(frame); } }
      function stopLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }
      function frame(now) {
        rafId = 0;
        if (destroyed) return;
        var dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
        if (phase === 'playing' && g) {
          acc += dt * speed;
          var steps = 0;
          while (acc >= STEP && steps < 24) { stepGarden(g, STEP); acc -= STEP; steps++; handleEvents(); if (g.state !== 'playing') break; }
          if (steps >= 24) acc = 0;
          updateSeeds();
          if (g.state !== 'playing') endLevel();
        }
        tickEffects(dt);
        draw(now);
        if (phase === 'playing' || (phase === 'over' && (anyOn(fx) || anyOn(floaters)))) rafId = requestAnimationFrame(frame);
      }
      function anyOn(pool) { for (var i = 0; i < pool.length; i++) if (pool[i].on) return true; return false; }
      function handleEvents() {
        var ev = g.ev, now = performance.now();
        if (ev.flick && now - lastSound.flick > 140) { lastSound.flick = now; api.tone(990, 0.035, 'triangle', 0.035); }
        if (ev.hit && now - lastSound.hit > 90) { lastSound.hit = now; api.tone(420, 0.05, 'sine', 0.06); }
        if (ev.munch && now - lastSound.munch > 300) { lastSound.munch = now; api.sound('tick'); }
        if (ev.eaten) { api.sound('thud'); say('A plant got nibbled away. Plant another to fill the gap.'); }
        if (ev.buzz) api.tone(210, 0.22, 'sawtooth', 0.025);
        if (ev.sunMade) api.tone(1320, 0.05, 'sine', 0.04);
        if (ev.bigWave) { banner.text = 'A big wave is coming!'; banner.until = now + 2600; api.sound('bell'); api.announce('A big wave of pests is coming.'); }
        if (ev.wave && g.wave === 1) { banner.text = 'Here they come!'; banner.until = now + 1600; api.sound('whoosh'); }
        if (ev.shoo) {
          for (var i = 0; i < g.shooList.length; i++) {
            var o = g.shooList[i], x = sx(o.lane, o.p), y = sy(o.lane, o.p);
            floatText(PESTS[o.type].boss ? 'Off you go!' : (i + g.shooed) % 3 === 0 ? 'Eek!' : 'Shoo!', x, y - G.u * 0.4, PESTS[o.type].boss ? ART.sun : '#ffffff', PESTS[o.type].boss ? clamp(G.u * 0.5, 18, 32) : null);
            puff(x, y, ART.sweat, 6);
          }
          api.sound('whoosh'); api.tone(1180, 0.07, 'square', 0.03);
        }
        g.shooList.length = 0;
        for (var k in ev) ev[k] = 0;
      }
      function tickEffects(dt) {
        var i;
        for (i = 0; i < fx.length; i++) { var p = fx[i]; if (!p.on) continue; p.life -= dt; if (p.life <= 0) { p.on = false; continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; }
        for (i = 0; i < floaters.length; i++) { var f = floaters[i]; if (!f.on) continue; f.life -= dt; if (f.life <= 0) f.on = false; else if (!reduced) f.y -= dt * 22; }
        for (i = 0; i < flyers.length; i++) { var fl = flyers[i]; if (!fl.on) continue; fl.t += dt / 0.45; if (fl.t >= 1) fl.on = false; }
      }
      function endLevel() {
        var won = g.state === 'won';
        phase = 'over';
        describe();
        pauseBtn.disabled = true;
        selected = null; updateSeeds();
        if (won) {
          var i = g.level;
          if (g.L.endless) { /* endless cannot be won */ }
          else {
            if (i + 1 > reached) { reached = i + 1; api.store.set('reached', reached); }
            chosen = Math.min(i + 1, LEVELS.length);
            api.store.set('level', chosen);
            var nextL = levelDef(chosen);
            var msg = 'Every pest shooed home and every lettuce safe. ' + pests(g.shooed) + ' shooed, ' + Math.round(g.score) + ' points. ' +
              (i + 1 >= LEVELS.length ? 'You cleared the whole garden! The Endless Garden is open.' : 'Next: level ' + (chosen + 1) + ', ' + nextL.name + '.');
            cardTimer = setTimeout(function () {
              if (destroyed || phase !== 'over') return;
              api.celebrate(i + 1 >= LEVELS.length ? 'Garden saved! Endless mode unlocked' : 'Level ' + (i + 1) + ' cleared!');
              showCard('Level ' + (i + 1) + ' cleared!', msg, 'next');
              say('Level ' + (i + 1) + ' cleared. ' + pests(g.shooed) + ' shooed.');
            }, reduced ? 200 : 900);
          }
        } else {
          var o = g.culprit, name = o ? PESTS[o.type].name.toLowerCase() : 'pest';
          var wave = g.wave;
          var newBest = false;
          if (g.L.endless) { var held = Math.max(0, wave - 1); if (held > endlessBest) { endlessBest = held; api.store.set('endless-best', held); newBest = true; } }
          api.sound('lose');
          var kind = ['Gardens take practice.', 'Every gardener loses a lettuce now and then.', 'The lettuce will grow back.'][g.shooed % 3];
          var m = (name === 'aphids' ? 'Some aphids' : 'A ' + name) + ' reached your lettuces and is having a munch. ' + kind + ' You shooed ' + pests(g.shooed) + (g.L.endless ? ' and held ' + Math.max(0, wave - 1) + ' waves (best ' + endlessBest + ').' : ' and reached wave ' + wave + ' of ' + g.waveTotal + '.');
          cardTimer = setTimeout(function () {
            if (destroyed || phase !== 'over') return;
            if (newBest) api.celebrate('New endless best: ' + endlessBest + ' waves');
            showCard(g.L.endless ? 'The garden held for ' + Math.max(0, wave - 1) + ' waves' : 'Munch, munch', m, 'retry');
            say(g.L.endless ? 'Endless garden over. ' + Math.max(0, wave - 1) + ' waves held.' : 'A pest reached the lettuces. Try again?');
          }, reduced ? 300 : 1300);
        }
        startLoop();
      }
      function pests(n) { return n === 0 ? 'no pests' : n === 1 ? '1 pest' : n + ' pests'; }
      function updateWave() {
        if (!g) { waveText.textContent = 'Shoo the pests away from your lettuces'; waveFill.style.width = '0'; waveBar.querySelectorAll('.gg-flag').forEach(function (f) { f.remove(); }); return; }
        var L = g.L;
        if (L.endless) {
          waveText.textContent = 'Wave ' + g.wave + ' · best ' + endlessBest;
          waveFill.style.width = '100%';
          return;
        }
        waveText.textContent = g.wave === 0 ? 'First wave soon · ' + g.waveTotal + ' waves' : 'Wave ' + Math.min(g.wave, g.waveTotal) + ' of ' + g.waveTotal;
        var into = g.wave === 0 ? clamp(g.t / g.L.first, 0, 1) * 0.5 : g.wave;
        waveFill.style.width = (100 * clamp(into / g.waveTotal, 0, 1)).toFixed(1) + '%';
        if (!waveBar.querySelector('.gg-flag')) L.flags.forEach(function (w) { waveBar.appendChild(h('span', { class: 'gg-flag', style: { left: (100 * w / g.waveTotal) + '%' } })); });
      }
      function statusText() {
        if (!g) return '';
        var L = g.L, head = L.endless ? 'Endless, wave ' + g.wave : 'Level ' + (g.level + 1) + ', wave ' + g.wave + ' of ' + g.waveTotal;
        if (g.wave === 0) head = (L.endless ? 'Endless' : 'Level ' + (g.level + 1)) + ', pests coming soon';
        return head + ' · ' + g.shooed + ' shooed';
      }

      /* ---------- drawing ---------- */
      function draw(now) {
        if (destroyed) return;
        var t = now / 1000, i, l, c;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(bg, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var u = G.u;
        if (g) {
          /* where you are about to plant */
          var target = hover || (cursor.show ? cursor : null);
          if (phase === 'playing' && target && (g.lanes[target.lane] || target === cursor)) {
            var r = cellRect(target.lane, target.col);
            var ok = selected && selected !== 'dig' ? !canPlant(g, selected, target.lane, target.col) : true;
            ctx.strokeStyle = ok ? COL.focus : COL.red; ctx.lineWidth = 3;
            ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
            if (selected && selected !== 'dig' && ok) {
              ctx.globalAlpha = 0.5; ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.rotate(A_PEST); drawPlant(ctx, selected, u, t, null); ctx.restore(); ctx.globalAlpha = 1;
            }
          }
          /* sprinkler spray */
          for (l = 0; l < LANES; l++) for (c = 0; c < COLS; c++) {
            var pl = g.grid[l][c];
            if (pl && pl.type === 'sprinkler' && pl.spray) {
              ctx.fillStyle = 'rgba(127, 212, 255, .35)';
              for (i = 0; i < 9; i++) {
                var k = ((t * 1.6 + i / 9) % 1), pp = c + 0.5 + k * PLANTS.sprinkler.range, side = Math.sin(i * 2.1 + t * 3) * 0.28;
                circ(ctx, sx(l + side, pp), sy(l + side, pp), u * (0.03 + 0.03 * (1 - k)));
              }
            }
          }
          /* plants */
          for (l = 0; l < LANES; l++) for (c = 0; c < COLS; c++) {
            pl = g.grid[l][c];
            if (!pl) continue;
            var jig = pl.hurt > 0 && !reduced ? Math.sin(t * 60) * u * 0.03 : 0;
            var grow = clamp((g.t - pl.born) / 0.25, 0.3, 1);
            ctx.save(); ctx.translate(sx(l, c + 0.5) + jig, sy(l, c + 0.5)); ctx.rotate(A_PEST); if (grow < 1 && !reduced) ctx.scale(grow, grow);
            drawPlant(ctx, pl.type, u, t, pl);
            ctx.restore();
            if (pl.leaves < pl.max) leafBar(sx(l, c + 0.5), sy(l, c + 0.5) + u * 0.42, u * 0.5, pl.leaves / pl.max);
          }
          /* peas */
          for (i = 0; i < g.peas.length; i++) {
            var pe = g.peas[i]; if (!pe.on) continue;
            var px = sx(pe.lane, pe.p), py = sy(pe.lane, pe.p);
            ctx.fillStyle = ART.leaf2; circ(ctx, px, py, u * 0.085);
            ctx.fillStyle = ART.pea; circ(ctx, px, py, u * 0.07);
            ctx.fillStyle = ART.peaHi; circ(ctx, px - u * 0.02, py - u * 0.02, u * 0.025);
          }
          /* pests */
          for (i = 0; i < g.pests.length; i++) {
            var o = g.pests[i]; if (!o.on) continue;
            var P = PESTS[o.type], ox = sx(o.lane, o.p), oy = sy(o.lane, o.p);
            var ang = o.state === 'flee' ? A_PEST : A_PEST + Math.PI;
            var bump = o.boop > 0 && !reduced ? 1 + o.boop * 0.8 : 1;
            ctx.save(); ctx.translate(ox, oy); ctx.rotate(ang);
            if (o.state === 'munch' && !reduced) ctx.translate(Math.sin(t * 18) * u * 0.02, 0);
            if (bump !== 1) ctx.scale(bump, 2 - bump);
            if (o.wet > 0) { ctx.fillStyle = 'rgba(127, 212, 255, .28)'; circ(ctx, 0, 0, u * P.size * 0.42); }
            drawPest(ctx, o.type, u * (P.boss ? 1.25 : 1), t, o);
            ctx.restore();
            if (o.state !== 'flee' && o.nerve < o.max) nerveBar(ox, oy - u * (P.boss ? 0.55 : 0.36), u * (P.boss ? 1 : 0.46), o.nerve / o.max);
          }
          /* bees */
          for (i = 0; i < g.bees.length; i++) {
            var be = g.bees[i]; if (!be.on) continue;
            var bx = sx(be.lane, be.p), by = sy(be.lane, be.p), ba = 0;
            if (be.state === 'buzz') { var ca = t * 9; bx += Math.cos(ca) * u * 0.25; by += Math.sin(ca) * u * 0.18; ba = ca + Math.PI / 2; }
            else ba = be.state === 'home' ? A_PEST + Math.PI : A_PEST;
            ctx.save(); ctx.translate(bx, by - u * 0.1); ctx.rotate(ba); drawBee(ctx, u * 1.3, t); ctx.restore();
          }
          /* sunshine */
          var ss = u * 0.7;
          for (i = 0; i < g.suns.length; i++) {
            var s = g.suns[i]; if (!s.on) continue;
            var sp = sunPos(s);
            var fade = s.fall > 0 ? 1 : clamp(s.life, 0, 1);
            var pulse = reduced ? 1 : 1 + Math.sin(t * 5 + i) * 0.06;
            ctx.globalAlpha = fade;
            ctx.drawImage(sunSprite, sp.x - ss * pulse / 2, sp.y - ss * pulse / 2, ss * pulse, ss * pulse);
            ctx.globalAlpha = 1;
          }
          /* a lost level: the pest munches the lettuce */
          if (g.state === 'lost' && g.culprit) {
            var cu = g.culprit;
            ctx.fillStyle = 'rgba(255, 110, 138, .35)'; circ(ctx, sx(cu.lane, -0.5), sy(cu.lane, -0.5), u * (0.45 + (reduced ? 0 : Math.sin(t * 8) * 0.04)));
          }
        }
        /* sun drops flying up to the counter */
        for (i = 0; i < flyers.length; i++) {
          var fl = flyers[i]; if (!fl.on) continue;
          var e = fl.t * fl.t, fx2 = fl.x + (8 - fl.x) * e, fy2 = fl.y + (-20 - fl.y) * e;
          ctx.globalAlpha = 1 - fl.t * 0.5; ctx.drawImage(sunSprite, fx2 - u * 0.3, fy2 - u * 0.3, u * 0.6, u * 0.6); ctx.globalAlpha = 1;
        }
        for (i = 0; i < fx.length; i++) { var p = fx[i]; if (!p.on) continue; ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.col; circ(ctx, p.x, p.y, p.r); }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        for (i = 0; i < floaters.length; i++) {
          var f = floaters[i]; if (!f.on) continue;
          ctx.globalAlpha = clamp(f.life / f.max * 1.5, 0, 1);
          ctx.font = '800 ' + Math.round(f.size) + 'px ' + COL.head;
          ctx.strokeStyle = 'rgba(10, 30, 10, .8)'; ctx.lineWidth = 4; ctx.strokeText(f.text, f.x, f.y);
          ctx.fillStyle = f.col; ctx.fillText(f.text, f.x, f.y);
        }
        ctx.globalAlpha = 1;
        if (banner.until > now && phase === 'playing') {
          var bs = clamp(W * 0.055, 20, 40);
          ctx.font = '900 ' + Math.round(bs) + 'px ' + COL.head;
          ctx.fillStyle = 'rgba(6, 20, 35, .6)'; ctx.fillRect(0, H / 2 - bs, W, bs * 2);
          ctx.strokeStyle = 'rgba(6, 20, 35, .9)'; ctx.lineWidth = 5; ctx.strokeText(banner.text, W / 2, H / 2);
          ctx.fillStyle = ART.sun; ctx.fillText(banner.text, W / 2, H / 2);
        }
        /* The status line: a message you caused stays up for a couple of seconds, then the score comes back. A new
           wave always shows straight away. The wave bar and the picture's description refresh a few times a second. */
        if (g && phase === 'playing') {
          var st = statusText();
          if (st !== lastStatus && (now - lastLabelAt > 2500 || g.wave !== lastWaveSeen)) { lastWaveSeen = g.wave; api.status(st); lastStatus = st; lastLabelAt = now; }
          if (now - lastHudAt > 300) { lastHudAt = now; updateWave(); describe(); }
        }
      }
      var lastWaveSeen = -1, lastHudAt = 0;
      function describe() {
        if (!g) return;
        var pests = 0, i, per = [0, 0, 0, 0, 0];
        for (i = 0; i < g.pests.length; i++) if (g.pests[i].on && g.pests[i].state !== 'flee') { pests++; per[g.pests[i].lane]++; }
        canvas.setAttribute('aria-label', 'Garden with ' + g.lanes.filter(Boolean).length + ' beds. ' + g.plantCount + ' plants, ' + pests + ' pests in the garden, ' + g.sunshine + ' sunshine. ' + statusText() + '.');
        var d = canvas.dataset;
        d.phase = phase; d.state = g.state; d.wave = String(g.wave); d.sunshine = String(g.sunshine); d.shooed = String(g.shooed); d.plants = String(g.plantCount); d.pests = String(pests); d.level = String(g.level);
        /* read-only numbers for the automated test: which way the beds lie, and where the squares are (CSS pixels) */
        d.layout = [vertical ? 1 : 0, G.gx.toFixed(1), G.gy.toFixed(1), G.cw.toFixed(1), G.ch.toFixed(1)].join(',');
        d.t = g.t.toFixed(1); d.lanes = per.join(',');
      }
      function leafBar(x, y, w, k) {
        ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - w / 2 - 1, y - 2, w + 2, 5);
        ctx.fillStyle = k > 0.35 ? ART.leafHi : ART.petal; ctx.fillRect(x - w / 2, y - 1, w * clamp(k, 0, 1), 3);
      }
      function nerveBar(x, y, w, k) {
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - w / 2 - 1, y - 2, w + 2, 6);
        ctx.fillStyle = k > 0.4 ? COL.ink : ART.sweat; ctx.fillRect(x - w / 2, y - 1, w * clamp(k, 0, 1), 4);
      }

      /* ---------- input ---------- */
      function localXY(e) { var r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }; }
      function onPointerDown(e) {
        if (e.button > 0 || !g || phase !== 'playing') return;
        api.unlockSound();
        var p = localXY(e);
        var s = sunAt(p.x, p.y);
        if (s) { grabSun(s); return; }
        var cell = cellAt(p.x, p.y);
        if (!cell) { if (selected) say('Tap a square inside a bed.'); return; }
        cursor.lane = cell.lane; cursor.col = cell.col;
        if (e.pointerType !== 'mouse') cursor.show = false;
        actAt(cell.lane, cell.col);
      }
      function onPointerMove(e) {
        if (e.pointerType !== 'mouse' || !g) return;
        var p = localXY(e);
        hover = cellAt(p.x, p.y);
        canvas.style.cursor = sunAt(p.x, p.y) ? 'pointer' : hover ? 'crosshair' : 'default';
      }
      function onPointerLeave() { hover = null; }
      function onKey(e) {
        if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
        var tgt = e.target;
        if (tgt && tgt.closest && tgt.closest('input, select, textarea')) return;
        var inRoot = !!(tgt && root.contains(tgt));
        if (!inRoot && tgt && tgt !== document.body) return;
        if (!g || (phase !== 'playing' && phase !== 'paused')) return;
        var k = e.key;
        if (k === 'p' || k === 'P') { e.preventDefault(); togglePause(); return; }
        if (phase !== 'playing') return;
        if (tgt && tgt.tagName === 'BUTTON' && (k === 'Enter' || k === ' ')) return;   /* let buttons work */
        var dl = 0, dc = 0;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') { if (vertical) dl = -1; else dc = -1; }
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') { if (vertical) dl = 1; else dc = 1; }
        else if (k === 'ArrowUp' || k === 'w' || k === 'W') { if (vertical) dc = 1; else dl = -1; }
        else if (k === 'ArrowDown' || k === 's' || k === 'S') { if (vertical) dc = -1; else dl = 1; }
        if (dl || dc) {
          e.preventDefault();
          cursor.show = true; hover = null;
          cursor.lane = clamp(cursor.lane + dl, 0, LANES - 1); cursor.col = clamp(cursor.col + dc, 0, COLS - 1);
          var pl = g.grid[cursor.lane][cursor.col];
          api.announce('Bed ' + (cursor.lane + 1) + ', square ' + (cursor.col + 1) + (pl ? ', ' + PLANTS[pl.type].name : g.lanes[cursor.lane] ? ', empty' : ', not dug'));
          api.sound('tick');
          return;
        }
        var n = parseInt(k, 10);
        if (n >= 1 && n <= g.L.plants.length) { e.preventDefault(); pick(g.L.plants[n - 1]); cursor.show = true; return; }
        if (k === 'Enter' || k === ' ' || k === 'Spacebar') { e.preventDefault(); cursor.show = true; actAt(cursor.lane, cursor.col); return; }
        if (k === 'c' || k === 'C') { e.preventDefault(); grabAll(); return; }
        if (k === 'f' || k === 'F') { e.preventDefault(); toggleSpeed(); return; }
        if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); selected = 'dig'; actAt(cursor.lane, cursor.col); return; }
        if (k === 'Escape' && selected) { e.preventDefault(); selected = null; updateSeeds(); say('Put away. Pick a seed packet.'); }
      }
      function onVisibility() {
        if (document.hidden) { if (phase === 'playing') togglePause(); stopLoop(); }
      }
      function focusGame() { try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }

      document.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onVisibility);
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerleave', onPointerLeave);
      var lastW = 0, lastDpr = 0;
      function maybeResize() {
        var w = Math.round(stage.clientWidth), r = Math.min(2, window.devicePixelRatio || 1);
        if (w && (w !== lastW || r !== lastDpr)) { lastW = w; lastDpr = r; resize(); }
      }
      var ro = new ResizeObserver(maybeResize);
      ro.observe(stage);

      resize();
      showMenu(true);

      return {
        destroy: function () {
          destroyed = true;
          stopLoop();
          clearTimeout(sunFlashTimer);
          clearTimeout(cardTimer);
          ro.disconnect();
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }
  });
})();
