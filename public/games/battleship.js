/* Battleships for Games in Time.
   A pencil-and-paper game said to have been played by Russian officers around the First World War, and
   first printed in 1931 as pads of grids called Salvo (Starex Novelty Company). Players drew two 10 by 10
   grids, lettered A to J across the top and numbered 1 to 10 down the side.

   The fleet follows the pencil-and-paper game as described by the game historian Bruce Whitehill
   (The Big Game Hunter, "Pencil and paper games"): a battleship of 5 squares, a cruiser of 4, a destroyer
   of 3 and a submarine of 2, in straight lines across or down. Those rules do not stop ships touching, so
   here they may touch but never overlap. As in his rules, when you hit a ship you are told which ship.
   Salvo, the 1931 rule: each turn you fire one shot for every ship you still have afloat.

   How the file is organised:
     Part 1  The rules: placing ships, firing, sinking.
     Part 2  The computer. Easy fires at random. Hard counts, for every square, how many ways the ships
             that are left could lie across it (a "probability map"), hunts on a checkerboard of the best
             squares, and once it hits a ship it only tries places that ship could still be.
     Part 3  The screen: graph-paper grids, pencil marks, the Sunk! stamp, placing your fleet.
   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  var ID = 'battleship';
  var N = 10;
  var LETTERS = 'ABCDEFGHIJ';
  var FLEET = [
    { id: 'battleship', name: 'Battleship', size: 5 },
    { id: 'cruiser', name: 'Cruiser', size: 4 },
    { id: 'destroyer', name: 'Destroyer', size: 3 },
    { id: 'submarine', name: 'Submarine', size: 2 }
  ];
  var uid = 0;
  var COMPUTER_MS = 350;   /* the computer's pause before it fires (the contract says about 350 ms) */
  var SHOT_MS = 380;       /* between the shots of a salvo */
  var STAMP_MS = 1300;     /* how long the Sunk! stamp stays */

  function cellName(r, c) { return LETTERS.charAt(c) + (r + 1); }

  /* =====================================================================
     PART 1: THE RULES
     A ship is { id, name, size, r, c, dir } with dir 'h' (across) or 'v' (down); r, c is its first square.
     ===================================================================== */
  function shipCells(sh) {
    var out = [];
    for (var k = 0; k < sh.size; k++) out.push(sh.dir === 'h' ? [sh.r, sh.c + k] : [sh.r + k, sh.c]);
    return out;
  }
  function onGrid(r, c) { return r >= 0 && c >= 0 && r < N && c < N; }
  function shipAt(fleet, r, c, ignoreId) {
    for (var i = 0; i < fleet.length; i++) {
      var sh = fleet[i];
      if (!sh || sh.r == null || sh.id === ignoreId) continue;
      var cells = shipCells(sh);
      for (var k = 0; k < cells.length; k++) if (cells[k][0] === r && cells[k][1] === c) return sh;
    }
    return null;
  }
  /* A ship fits if it stays on the grid and overlaps no other ship (touching is allowed). */
  function fits(fleet, sh) {
    return shipCells(sh).every(function (p) { return onGrid(p[0], p[1]) && !shipAt(fleet, p[0], p[1], sh.id); });
  }
  function randomFleet(random) {
    var fleet = [];
    FLEET.forEach(function (f) {
      var options = [];
      ['h', 'v'].forEach(function (dir) {
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
          var sh = { id: f.id, name: f.name, size: f.size, r: r, c: c, dir: dir };
          if (fits(fleet, sh)) options.push(sh);
        }
      });
      fleet.push(options[Math.floor(random() * options.length)]);
    });
    return fleet;
  }
  function emptyGrid(v) { var g = []; for (var r = 0; r < N; r++) { g.push([]); for (var c = 0; c < N; c++) g[r].push(v); } return g; }

  /* One side of the battle: its fleet and the shots fired at it. */
  function makeSide(fleet) {
    return { fleet: fleet, shot: emptyGrid(null), hitShip: emptyGrid(null), hits: {}, sunk: {} };
  }
  /* Fire at r, c. Returns { result: 'miss' | 'hit' | 'sunk' | 'again', ship }. */
  function fireAt(side, r, c) {
    if (side.shot[r][c]) return { result: 'again' };
    var sh = shipAt(side.fleet, r, c);
    if (!sh) { side.shot[r][c] = 'miss'; return { result: 'miss' }; }
    side.shot[r][c] = 'hit';
    side.hitShip[r][c] = sh.id;
    side.hits[sh.id] = (side.hits[sh.id] || 0) + 1;
    if (side.hits[sh.id] >= sh.size) { side.sunk[sh.id] = true; return { result: 'sunk', ship: sh }; }
    return { result: 'hit', ship: sh };
  }
  function afloat(side) { return side.fleet.filter(function (sh) { return !side.sunk[sh.id]; }).length; }
  function allSunk(side) { return afloat(side) === 0; }

  /* =====================================================================
     PART 2: THE COMPUTER
     It only ever looks at what a player with a pencil would know: its own hits and misses, which ship
     each hit was on, and which ships are sunk. It never peeks at your fleet.
     ===================================================================== */
  /* Every way a ship of this size could lie on squares that ok(r, c) allows. */
  function placements(size, ok) {
    var list = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      [[0, 1], [1, 0]].forEach(function (d) {
        var cells = [];
        for (var k = 0; k < size; k++) {
          var rr = r + d[0] * k, cc = c + d[1] * k;
          if (!onGrid(rr, cc) || !ok(rr, cc)) return;
          cells.push([rr, cc]);
        }
        list.push(cells);
      });
    }
    return list;
  }
  /* The probability map: for each square, how many placements of the ships still afloat cover it. */
  function heatMap(side, level) {
    var heat = emptyGrid(0), targeting = false;
    var left = FLEET.filter(function (f) { return !side.sunk[f.id]; });
    /* Target mode: ships we have hit but not sunk. Their placements must cover all their known hits. */
    left.forEach(function (f) {
      var known = [];
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (side.hitShip[r][c] === f.id) known.push(r * N + c);
      if (!known.length) return;
      targeting = true;
      placements(f.size, function (r, c) { var s = side.shot[r][c]; return s === null || (s === 'hit' && side.hitShip[r][c] === f.id); })
        .forEach(function (cells) {
          var ids = cells.map(function (p) { return p[0] * N + p[1]; });
          if (!known.every(function (k) { return ids.indexOf(k) >= 0; })) return;
          cells.forEach(function (p) { if (side.shot[p[0]][p[1]] === null) heat[p[0]][p[1]] += 100; });
        });
    });
    if (targeting) return { heat: heat, mode: 'target' };
    /* Hunt mode: every ship still afloat, anywhere it could fit among the squares not yet fired at. */
    left.forEach(function (f) {
      placements(f.size, function (r, c) { return side.shot[r][c] === null; })
        .forEach(function (cells) { cells.forEach(function (p) { heat[p[0]][p[1]] += 1; }); });
    });
    /* The smallest ship is at least 2 long, so it must cover a black square of a checkerboard:
       hunting only on one colour finds every ship with half the shots. */
    for (var r2 = 0; r2 < N; r2++) for (var c2 = 0; c2 < N; c2++) if ((r2 + c2) % 2 === 1) heat[r2][c2] *= level === 'hard' ? 0.02 : 1;
    return { heat: heat, mode: 'hunt' };
  }
  /* Pick n squares to fire at. */
  function aiChoose(side, n, level, random) {
    var free = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (side.shot[r][c] === null) free.push([r, c]);
    var picks = [];
    function take(cands) {
      while (picks.length < n && cands.length) {
        var best = Math.max.apply(null, cands.map(function (x) { return x[2]; }));
        var tops = cands.filter(function (x) { return x[2] >= best - 1e-9; });
        var p = tops[Math.floor(random() * tops.length)];
        picks.push([p[0], p[1]]);
        cands = cands.filter(function (x) { return x !== p; });
      }
    }
    if (level === 'easy') {
      take(free.map(function (p) { return [p[0], p[1], 1]; }));
      return { picks: picks, mode: 'random' };
    }
    var m = heatMap(side, level);
    take(free.map(function (p) { return [p[0], p[1], m.heat[p[0]][p[1]]]; }).filter(function (x) { return x[2] > 0; }));
    if (picks.length < n) {
      var hunt = heatMap({ fleet: side.fleet, shot: side.shot, hitShip: emptyGrid(null), hits: {}, sunk: side.sunk }, level);
      take(free.filter(function (p) { return !picks.some(function (q) { return q[0] === p[0] && q[1] === p[1]; }); }).map(function (p) { return [p[0], p[1], hunt.heat[p[0]][p[1]] + 0.001]; }));
    }
    return { picks: picks, mode: m.mode };
  }

  /* =====================================================================
     PART 3: THE SCREEN
     ===================================================================== */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] != null) el.setAttribute(k, String(attrs[k])); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }
  /* small, repeatable wobbles so pencil marks look hand-drawn but never change between redraws */
  function jit(r, c, k) { return ((((r + 3) * 37 + (c + 5) * 23 + k * 11) % 17) / 17 - 0.5) * 0.9; }
  function hull(sh, cls, hatch) {
    var x = sh.c * 10, y = sh.r * 10, L = sh.size * 10, d;
    if (sh.dir === 'h') d = 'M' + (x + 1.6) + ' ' + (y + 2.4) + 'H' + (x + L - 3.4) + 'L' + (x + L - 0.9) + ' ' + (y + 5) + 'L' + (x + L - 3.4) + ' ' + (y + 7.6) + 'H' + (x + 1.6) + 'Q' + (x + 0.8) + ' ' + (y + 5) + ' ' + (x + 1.6) + ' ' + (y + 2.4) + 'Z';
    else d = 'M' + (x + 2.4) + ' ' + (y + 1.6) + 'V' + (y + L - 3.4) + 'L' + (x + 5) + ' ' + (y + L - 0.9) + 'L' + (x + 7.6) + ' ' + (y + L - 3.4) + 'V' + (y + 1.6) + 'Q' + (x + 5) + ' ' + (y + 0.8) + ' ' + (x + 2.4) + ' ' + (y + 1.6) + 'Z';
    var g = s('g', { class: cls || 'bs-ship' }, s('path', { d: d, class: 'bs-hull' }), hatch ? s('path', { d: d, class: 'bs-hatch', fill: 'url(#' + hatch + ')' }) : null);
    /* a funnel or turret on every other square */
    for (var k = 1; k < sh.size; k += 2) {
      var cx = sh.dir === 'h' ? x + k * 10 + (k === sh.size - 1 ? -2 : 0) : x + 5, cy = sh.dir === 'h' ? y + 5 : y + k * 10 + (k === sh.size - 1 ? -2 : 0);
      g.appendChild(s('circle', { cx: cx, cy: cy, r: 1.5, class: 'bs-turret' }));
    }
    return g;
  }
  function outline(sh, cls) {
    var x = sh.c * 10, y = sh.r * 10, w = sh.dir === 'h' ? sh.size * 10 : 10, hgt = sh.dir === 'v' ? sh.size * 10 : 10;
    return s('g', { class: cls },
      s('rect', { x: x + 0.7, y: y + 0.7, width: w - 1.4, height: hgt - 1.4, rx: 3.6, class: 'bs-sunk-a' }),
      s('rect', { x: x + 1.1, y: y + 0.9, width: w - 2, height: hgt - 1.6, rx: 3.9, class: 'bs-sunk-b' }));
  }
  function cross(r, c, fresh) {
    var x = c * 10, y = r * 10;
    return s('path', { class: 'bs-hit' + (fresh ? ' is-new' : ''), pathLength: 20,
      d: 'M' + (x + 2.3 + jit(r, c, 1)).toFixed(2) + ' ' + (y + 2.5 + jit(r, c, 2)).toFixed(2) + 'L' + (x + 7.7 + jit(r, c, 3)).toFixed(2) + ' ' + (y + 7.6 + jit(r, c, 4)).toFixed(2) +
        'M' + (x + 7.6 + jit(r, c, 5)).toFixed(2) + ' ' + (y + 2.4 + jit(r, c, 6)).toFixed(2) + 'L' + (x + 2.4 + jit(r, c, 7)).toFixed(2) + ' ' + (y + 7.7 + jit(r, c, 8)).toFixed(2) });
  }
  function dot(r, c) {
    return s('circle', { class: 'bs-miss', cx: (c * 10 + 5 + jit(r, c, 9) * 0.6).toFixed(2), cy: (r * 10 + 5 + jit(r, c, 10) * 0.6).toFixed(2), r: 1.45 });
  }

  var CSS = [
    '.game-battleship { --bs-grid: color-mix(in srgb, var(--brand) 32%, transparent); --bs-grid-strong: color-mix(in srgb, var(--brand) 60%, transparent); --bs-pencil: var(--ink); --bs-red: var(--red); --bs-sea: color-mix(in srgb, var(--brand) 7%, var(--surface)); }',
    '.game-battleship .game-toolbar .field { flex-wrap: wrap; max-width: 100%; }',
    '.game-battleship .bs-help { margin: 0 0 .8rem; color: var(--ink-muted); max-width: 52rem; }',
    '.game-battleship .bs-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-bottom: .8rem; }',
    '.game-battleship .bs-shipbtn { display: inline-flex; align-items: center; gap: .5rem; }',
    '.game-battleship .bs-shipbtn[aria-pressed="true"] { border-color: var(--brand); background: color-mix(in srgb, var(--brand) 14%, var(--surface)); box-shadow: 0 0 0 2px var(--brand); }',
    '.game-battleship .bs-pips { display: inline-flex; gap: 2px; }',
    '.game-battleship .bs-pips i { width: 9px; height: 9px; border: 1.5px solid var(--bs-pencil); border-radius: 2px; background: color-mix(in srgb, var(--brand) 20%, transparent); }',
    '.game-battleship .bs-shipbtn.is-placed .bs-pips i { background: var(--brand); }',
    '.game-battleship .bs-boards { display: grid; gap: 1rem 1.6rem; grid-template-columns: minmax(0, 1fr); align-items: start; }',
    '@media (min-width: 760px) { .game-battleship .bs-boards.is-battle { grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); } }',
    '.game-battleship .bs-board { min-width: 0; }',
    '.game-battleship .bs-board h3 { font-size: 1.05rem; margin: 0 0 .35rem; display: flex; justify-content: space-between; gap: .5rem; flex-wrap: wrap; }',
    '.game-battleship .bs-board h3 small { font-weight: 600; color: var(--ink-muted); font-size: .85rem; }',
    '.game-battleship .bs-gridwrap { position: relative; display: grid; grid-template-columns: 1.15rem minmax(0, 1fr); grid-template-rows: 1.15rem auto; max-width: 500px; }',
    '.game-battleship .bs-board.is-mine .bs-gridwrap { max-width: 400px; }',
    '.game-battleship .bs-cols { grid-column: 2; display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); font: 700 .72rem var(--font-mono); color: var(--ink-muted); text-align: center; align-items: end; }',
    '.game-battleship .bs-rows { grid-row: 2; display: grid; grid-template-rows: repeat(10, minmax(0, 1fr)); font: 700 .72rem var(--font-mono); color: var(--ink-muted); align-items: center; text-align: right; padding-right: .2rem; }',
    '.game-battleship .bs-cells { grid-row: 2; grid-column: 2; position: relative; aspect-ratio: 1; display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); grid-template-rows: repeat(10, minmax(0, 1fr)); background: var(--bs-sea); border: 2px solid var(--bs-grid-strong); touch-action: manipulation; user-select: none; -webkit-user-select: none; }',
    '.game-battleship .bs-cells > div[role="row"] { display: contents; }',
    '.game-battleship .bs-cell { border-right: 1px solid var(--bs-grid); border-bottom: 1px solid var(--bs-grid); cursor: crosshair; outline: none; }',
    '.game-battleship .bs-cell:nth-child(10n) { border-right: 0; }',
    '.game-battleship .bs-cells:not(.is-live) .bs-cell { cursor: default; }',
    '.game-battleship .bs-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }',
    '.game-battleship .bs-hull { fill: color-mix(in srgb, var(--brand) 16%, var(--surface)); stroke: var(--brand); stroke-width: .75; stroke-linejoin: round; }',
    '.game-battleship .bs-turret { fill: var(--brand); }',
    '.game-battleship .bs-hatch { stroke: none; }',
    '.game-battleship .bs-hatch-line { stroke: var(--brand); stroke-width: .3; opacity: .55; }',
    '.game-battleship .bs-ship-lifted .bs-hatch { display: none; }',
    '.game-battleship .bs-ship-ghost .bs-hull { fill: color-mix(in srgb, var(--green) 30%, transparent); stroke: var(--green); stroke-dasharray: 1.5 1; }',
    '.game-battleship .bs-ship-ghost.is-bad .bs-hull { fill: color-mix(in srgb, var(--red) 25%, transparent); stroke: var(--red); }',
    '.game-battleship .bs-ship-ghost .bs-turret { fill: var(--green); }',
    '.game-battleship .bs-ship-ghost.is-bad .bs-turret { fill: var(--red); }',
    '.game-battleship .bs-ship-lifted .bs-hull { stroke-dasharray: 1.2 1; opacity: .5; }',
    '.game-battleship .bs-ship-reveal .bs-hull { fill: none; stroke: var(--bs-pencil); stroke-dasharray: 1.4 1; }',
    '.game-battleship .bs-ship-reveal .bs-turret { fill: var(--bs-pencil); opacity: .5; }',
    '.game-battleship .bs-hit { fill: none; stroke: var(--bs-red); stroke-width: 1.35; stroke-linecap: round; }',
    '.game-battleship .bs-hit.is-new { stroke-dasharray: 20; stroke-dashoffset: 20; animation: bs-draw .3s ease-out forwards; }',
    '@keyframes bs-draw { to { stroke-dashoffset: 0; } }',
    '.game-battleship .bs-miss { fill: var(--bs-pencil); opacity: .78; }',
    '.game-battleship .bs-sunk-a { fill: color-mix(in srgb, var(--bs-red) 10%, transparent); stroke: var(--bs-pencil); stroke-width: .8; }',
    '.game-battleship .bs-sunk-b { fill: none; stroke: var(--bs-pencil); stroke-width: .45; opacity: .55; }',
    '.game-battleship .bs-sunk.is-new .bs-sunk-a { animation: bs-ring .5s ease-out; transform-box: fill-box; transform-origin: center; }',
    '@keyframes bs-ring { 0% { transform: scale(1.25); opacity: 0; } 100% { transform: none; opacity: 1; } }',
    '.game-battleship .bs-ripple { fill: none; stroke: var(--brand); stroke-width: .6; animation: bs-ripple .7s ease-out forwards; }',
    '@keyframes bs-ripple { 0% { r: 1.5; opacity: .9; } 100% { r: 7; opacity: 0; } }',
    '.game-battleship .bs-burst { fill: var(--bs-red); animation: bs-burst .6s ease-out forwards; transform-box: fill-box; transform-origin: center; }',
    '@keyframes bs-burst { 0% { transform: scale(.4); opacity: .95; } 100% { transform: scale(1.8); opacity: 0; } }',
    '.game-battleship .bs-cursor { fill: none; stroke: var(--brand); stroke-width: .7; stroke-dasharray: 1.6 .9; }',
    '.game-battleship .bs-cells:focus-within .bs-cursor { stroke-width: 1.1; stroke: var(--focus); stroke-dasharray: none; }',
    '.game-battleship .bs-aim { fill: none; stroke: var(--brand); stroke-width: .8; }',
    '.game-battleship .bs-stamp { position: absolute; left: 1.15rem; right: 0; top: 1.15rem; bottom: 0; display: grid; place-items: center; pointer-events: none; text-align: center; }',
    '.game-battleship .bs-stamp > div { transform: rotate(-9deg); padding: .2rem 1rem .4rem; border: 4px solid var(--bs-red); border-radius: 10px; color: var(--bs-red); background: color-mix(in srgb, var(--surface) 82%, transparent); font-family: var(--font-display); line-height: 1; animation: bs-stamp .45s cubic-bezier(.3, 1.6, .5, 1); }',
    '.game-battleship .bs-stamp b { display: block; font-size: clamp(2.2rem, 1.4rem + 4vw, 4rem); font-weight: 400; letter-spacing: .03em; }',
    '.game-battleship .bs-stamp span { display: block; font-family: var(--font-head); font-weight: 800; font-size: 1rem; margin-top: .2rem; }',
    '@keyframes bs-stamp { 0% { transform: rotate(-9deg) scale(2.4); opacity: 0; } 100% { transform: rotate(-9deg) scale(1); opacity: 1; } }',
    '.game-battleship .bs-fleet { display: flex; flex-wrap: wrap; gap: .3rem .9rem; margin-top: .45rem; font-size: .9rem; font-weight: 700; }',
    '.game-battleship .bs-fleet span { display: inline-flex; align-items: center; gap: .35rem; }',
    '.game-battleship .bs-fleet span.is-sunk { text-decoration: line-through; color: var(--ink-muted); }',
    '.game-battleship .bs-fleet .bs-pips i.is-hit { background: var(--bs-red); border-color: var(--bs-red); }',
    '.game-battleship .bs-turnbar { display: flex; align-items: center; justify-content: space-between; gap: .4rem .8rem; margin-bottom: .7rem; font-weight: 800; font-size: 1.05rem; min-height: 40px; }',
    '.game-battleship .bs-shots { font-family: var(--font-mono); font-size: .9rem; color: var(--ink-muted); }',
    '.game-battleship .bs-log { list-style: none; padding: 0; margin: .9rem 0 0; font-size: .92rem; color: var(--ink-muted); display: grid; gap: .15rem; }',
    '.game-battleship .bs-log li { margin: 0; padding-left: .5rem; border-left: 3px solid var(--line); }',
    '.game-battleship .bs-log li:first-child { color: var(--ink); border-left-color: var(--brand); }',
    '.game-battleship .bs-swap { display: none; min-height: 40px; padding: .35rem .9rem; font-size: .95rem; }',
    '@media (max-width: 520px) { .game-battleship .bs-row.bs-ships { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .game-battleship .bs-row.bs-ships .btn { min-width: 0; flex-direction: column; gap: .15rem; padding: .35rem .4rem; font-size: .95rem; border-radius: 14px; } .game-battleship .bs-row.bs-ships .bs-pips i { width: 8px; height: 8px; } .game-battleship .bs-help { font-size: .95rem; } }',
    '@media (max-width: 759px) {',
    '  .game-battleship .bs-swap { display: inline-flex; }',
    '  .game-battleship .bs-boards.is-battle .bs-board.is-mine .bs-gridwrap { max-width: 190px; }',
    '  .game-battleship .bs-boards.is-battle.is-mine-big .bs-board.is-mine { order: -1; }',
    '  .game-battleship .bs-boards.is-battle.is-mine-big .bs-board.is-mine .bs-gridwrap { max-width: 500px; }',
    '  .game-battleship .bs-boards.is-battle.is-mine-big .bs-board.is-enemy .bs-gridwrap { max-width: 190px; }',
    '  .game-battleship .bs-gridwrap { margin-inline: -.55rem; }',
    '}',
    '@media (prefers-reduced-motion: reduce) { .game-battleship .bs-hit.is-new { animation: none; stroke-dashoffset: 0; } .game-battleship .bs-ripple, .game-battleship .bs-burst { display: none; } .game-battleship .bs-stamp > div, .game-battleship .bs-sunk.is-new .bs-sunk-a { animation: none; } }'
  ].join('\n');

  GamesInTime.register({
    id: ID,
    frame: 'paper',
    /* The rules and the computer, for tests and for anyone curious. */
    logic: { fleet: FLEET, fits: fits, fireAt: fireAt, makeSide: makeSide, aiChoose: aiChoose, randomFleet: randomFleet },
    mount: function (root, api) {
      var h = api.h;
      root.appendChild(h('style', null, CSS));

      var shotsMode = api.store.get('shots', 'one');
      if (shotsMode !== 'one' && shotsMode !== 'salvo') shotsMode = 'one';
      var level = api.store.get('level', 'easy');
      if (level !== 'easy' && level !== 'hard') level = 'easy';
      var best = api.store.get('best', {});
      if (!best || typeof best !== 'object') best = {};

      var phase = 'place', mine = null, theirs = null, myFleet = [], timers = [], busy = false;
      var selected = null, dir = 'h', aims = [], shotsFired = 0, lastMine = null, lastTheirs = null, logItems = [];
      var cursor = { mine: [4, 4], enemy: [4, 4] };

      function onPage() { return document.body.contains(root); }
      function later(fn, ms) {
        var id = setTimeout(function () { timers = timers.filter(function (t) { return t !== id; }); if (onPage()) fn(); }, api.reducedMotion ? 0 : ms);
        timers.push(id);
      }
      /* reading time, kept even with reduced motion */
      function hold(fn, ms) {
        var id = setTimeout(function () { timers = timers.filter(function (t) { return t !== id; }); if (onPage()) fn(); }, ms);
        timers.push(id);
      }
      function cancelAll() { timers.forEach(clearTimeout); timers = []; }
      function onHash() { if (!onPage()) destroy(); }
      window.addEventListener('hashchange', onHash);
      function destroy() { cancelAll(); window.removeEventListener('hashchange', onHash); }

      /* ---------- toolbar ---------- */
      var shotBtns = {}, levelBtns = {};
      var shotSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Shots each turn' },
        shotBtns.one = h('button', { type: 'button', onclick: function () { setSetting('shots', 'one'); } }, 'One shot'),
        shotBtns.salvo = h('button', { type: 'button', onclick: function () { setSetting('shots', 'salvo'); } }, 'Salvo'));
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Computer' },
        levelBtns.easy = h('button', { type: 'button', onclick: function () { setSetting('level', 'easy'); } }, 'Easy'),
        levelBtns.hard = h('button', { type: 'button', onclick: function () { setSetting('level', 'hard'); } }, 'Hard'));
      var newBtn = h('button', { class: 'btn', type: 'button', onclick: function () { newGame(); } }, 'New game');
      root.appendChild(h('div', { class: 'game-toolbar' }, newBtn, h('span', { class: 'field' }, 'Shots', shotSeg), h('span', { class: 'field' }, 'Computer', levelSeg)));

      /* ---------- placing ---------- */
      var help = h('p', { class: 'bs-help' });
      var shipBtns = {};
      var shipRow = h('div', { class: 'bs-row bs-ships', role: 'group', 'aria-label': 'Your ships' });
      FLEET.forEach(function (f) {
        var pipsEl = h('span', { class: 'bs-pips', 'aria-hidden': 'true' });
        for (var k = 0; k < f.size; k++) pipsEl.appendChild(h('i'));
        shipBtns[f.id] = h('button', { class: 'btn bs-shipbtn', type: 'button', 'aria-pressed': 'false', onclick: function () { pickUp(f.id); } }, f.name, pipsEl);
        shipRow.appendChild(shipBtns[f.id]);
      });
      var rotateBtn = h('button', { class: 'btn', type: 'button', onclick: function () { rotate(); } }, 'Rotate (R)');
      var shuffleBtn = h('button', { class: 'btn', type: 'button', onclick: function () { shuffle(); } }, 'Shuffle');
      var startBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { startBattle(); } }, 'Start battle');
      var placeRow = h('div', { class: 'bs-row' }, rotateBtn, shuffleBtn, startBtn);
      var placeBox = h('div', null, help, shipRow, placeRow);
      root.appendChild(placeBox);

      /* ---------- the turn bar (battle) ---------- */
      var turnText = h('span');
      var swapBtn = h('button', { class: 'btn bs-swap', type: 'button', 'aria-pressed': 'false', onclick: function () { boards.classList.toggle('is-mine-big'); swapBtn.setAttribute('aria-pressed', String(boards.classList.contains('is-mine-big'))); swapBtn.textContent = boards.classList.contains('is-mine-big') ? 'Show enemy big' : 'Show my fleet big'; } }, 'Show my fleet big');
      var turnBar = h('div', { class: 'bs-turnbar' }, turnText, swapBtn);
      root.appendChild(turnBar);

      /* ---------- the two grids ---------- */
      function makeGrid(kind, title) {
        var cols = h('div', { class: 'bs-cols', 'aria-hidden': 'true' });
        for (var c = 0; c < N; c++) cols.appendChild(h('span', null, LETTERS.charAt(c)));
        var rows = h('div', { class: 'bs-rows', 'aria-hidden': 'true' });
        for (var r = 0; r < N; r++) rows.appendChild(h('span', null, String(r + 1)));
        var cells = h('div', { class: 'bs-cells', role: 'grid', 'aria-label': title });
        var cellEls = [];
        for (var rr = 0; rr < N; rr++) {
          var row = h('div', { role: 'row' });
          cellEls.push([]);
          for (var cc = 0; cc < N; cc++) {
            var cell = h('div', { class: 'bs-cell', role: 'gridcell', tabindex: '-1', 'data-r': rr, 'data-c': cc, 'aria-label': cellName(rr, cc) });
            cellEls[rr].push(cell);
            row.appendChild(cell);
          }
          cells.appendChild(row);
        }
        var overlay = s('svg', { class: 'bs-overlay', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' });
        var hatchId = 'bs-hatch-' + kind + '-' + (++uid);
        overlay.appendChild(s('defs', null, s('pattern', { id: hatchId, width: 1.4, height: 1.4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(40)' }, s('line', { x1: 0, y1: 0, x2: 0, y2: 1.4, class: 'bs-hatch-line' }))));
        var layer = s('g');
        overlay.appendChild(layer);
        cells.appendChild(overlay);
        var stamp = h('div', { class: 'bs-stamp', 'aria-hidden': 'true' });
        var wrap = h('div', { class: 'bs-gridwrap' }, h('span'), cols, rows, cells, stamp);
        var heading = h('h3', null, title, h('small'));
        var fleetEl = h('div', { class: 'bs-fleet' });
        var box = h('section', { class: 'bs-board is-' + kind, 'aria-label': title }, heading, wrap, fleetEl);
        var g = { kind: kind, box: box, cells: cells, cellEls: cellEls, overlay: layer, hatch: hatchId, stamp: stamp, heading: heading, fleetEl: fleetEl };
        cells.addEventListener('click', function (ev) {
          var t = ev.target.closest('.bs-cell');
          if (t) cellClick(g, Number(t.getAttribute('data-r')), Number(t.getAttribute('data-c')));
        });
        cells.addEventListener('pointermove', function (ev) {
          if (ev.pointerType !== 'mouse') return;
          var t = ev.target.closest('.bs-cell');
          if (t) hover(g, Number(t.getAttribute('data-r')), Number(t.getAttribute('data-c')));
        });
        cells.addEventListener('keydown', function (ev) { gridKey(g, ev); });
        return g;
      }
      var enemyGrid = makeGrid('enemy', 'Enemy waters');
      var mineGrid = makeGrid('mine', 'Your fleet');
      var boards = h('div', { class: 'bs-boards' }, enemyGrid.box, mineGrid.box);
      root.appendChild(boards);
      var logList = h('ol', { class: 'bs-log', 'aria-label': 'Shots so far' });
      root.appendChild(logList);
      root.appendChild(h('p', { class: 'game-note' }, 'Fleet: a battleship of 5 squares, a cruiser of 4, a destroyer of 3 and a submarine of 2, as in the pencil-and-paper game. Red crosses are hits, dots are misses, and sunk ships are ringed in pencil. In Salvo (1931) you fire one shot for every ship you still have afloat. Keyboard: arrows move, Enter fires.'));

      /* ---------- drawing ---------- */
      function drawGrid(g) {
        var ov = g.overlay;
        ov.replaceChildren();
        var side = g.kind === 'mine' ? mine : theirs;
        var fleet = g.kind === 'mine' ? myFleet : (theirs ? theirs.fleet : []);
        var last = g.kind === 'mine' ? lastMine : lastTheirs;
        /* ships: always yours; the enemy's only when sunk or when the game is over */
        if (g.kind === 'mine') {
          fleet.forEach(function (sh) {
            if (sh.r == null) return;
            ov.appendChild(hull(sh, 'bs-ship' + (phase === 'place' && selected === sh.id ? ' bs-ship-lifted' : ''), g.hatch));
          });
        } else if (phase === 'over' && theirs) {
          fleet.forEach(function (sh) { if (!theirs.sunk[sh.id]) ov.appendChild(hull(sh, 'bs-ship bs-ship-reveal')); });
        }
        if (side) {
          fleet.forEach(function (sh) { if (side.sunk[sh.id]) ov.appendChild(outline(sh, 'bs-sunk' + (last && last.sunk === sh.id ? ' is-new' : ''))); });
          for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
            var v = side.shot[r][c];
            var fresh = !!(last && last.cells && last.cells.some(function (p) { return p[0] === r && p[1] === c; }));
            if (v === 'miss') {
              ov.appendChild(dot(r, c));
              if (fresh && !api.reducedMotion) ov.appendChild(s('circle', { class: 'bs-ripple', cx: c * 10 + 5, cy: r * 10 + 5, r: 1.5 }));
            } else if (v === 'hit') {
              if (fresh && !api.reducedMotion) ov.appendChild(s('circle', { class: 'bs-burst', cx: c * 10 + 5, cy: r * 10 + 5, r: 4 }));
              ov.appendChild(cross(r, c, fresh));
            }
            var label = cellName(r, c) + (v === 'miss' ? ', miss' : v === 'hit' ? ', hit' + (side.sunk[side.hitShip[r][c]] ? ', ' + nameOf(side.hitShip[r][c]) + ' sunk' : '') : g.kind === 'enemy' ? ', not fired at yet' : '');
            if (g.kind === 'mine' && v !== 'hit') { var shm = shipAt(myFleet, r, c); if (shm) label += ', your ' + shm.name; }
            g.cellEls[r][c].setAttribute('aria-label', label);
            g.cellEls[r][c].setAttribute('data-shot', v || '');
          }
        } else {
          for (var r2 = 0; r2 < N; r2++) for (var c2 = 0; c2 < N; c2++) {
            var sh2 = g.kind === 'mine' ? shipAt(myFleet, r2, c2) : null;
            g.cellEls[r2][c2].setAttribute('aria-label', cellName(r2, c2) + (sh2 ? ', your ' + sh2.name : ', empty'));
            g.cellEls[r2][c2].setAttribute('data-shot', '');
          }
        }
        /* salvo aims */
        if (g.kind === 'enemy') aims.forEach(function (p) {
          ov.appendChild(s('circle', { class: 'bs-aim', cx: p[1] * 10 + 5, cy: p[0] * 10 + 5, r: 3.2 }));
          ov.appendChild(s('path', { class: 'bs-aim', d: 'M' + (p[1] * 10 + 1.2) + ' ' + (p[0] * 10 + 5) + 'h7.6M' + (p[1] * 10 + 5) + ' ' + (p[0] * 10 + 1.2) + 'v7.6' }));
        });
        /* the placing preview */
        if (g.kind === 'mine' && phase === 'place' && selected && previewAt) {
          var f = fleetDef(selected);
          var ghost = { id: f.id, name: f.name, size: f.size, r: previewAt[0], c: previewAt[1], dir: dir };
          var ok = fits(myFleet, ghost);
          var cl = shipCells(ghost).filter(function (p) { return onGrid(p[0], p[1]); });
          if (cl.length) {
            var clipped = { id: f.id, size: cl.length, r: ghost.r, c: ghost.c, dir: dir };
            ov.appendChild(hull(clipped, 'bs-ship-ghost' + (ok ? '' : ' is-bad')));
          }
        }
        /* the cursor */
        var live = (g.kind === 'enemy' && phase === 'battle') || (g.kind === 'mine' && phase === 'place');
        g.cells.classList.toggle('is-live', live);
        if (live) {
          var cu = cursor[g.kind];
          ov.appendChild(s('rect', { class: 'bs-cursor', x: cu[1] * 10 + 0.6, y: cu[0] * 10 + 0.6, width: 8.8, height: 8.8, rx: 1 }));
        }
        drawFleetList(g);
      }
      var previewAt = null;
      function nameOf(id) { return fleetDef(id).name; }
      function fleetDef(id) { for (var i = 0; i < FLEET.length; i++) if (FLEET[i].id === id) return FLEET[i]; return FLEET[0]; }
      function drawFleetList(g) {
        var side = g.kind === 'mine' ? mine : theirs;
        if (!side) { g.fleetEl.replaceChildren(); return; }
        g.fleetEl.replaceChildren.apply(g.fleetEl, FLEET.map(function (f) {
          var hits = side.hits[f.id] || 0, sunk = side.sunk[f.id];
          var pipsEl = h('span', { class: 'bs-pips', 'aria-hidden': 'true' });
          for (var k = 0; k < f.size; k++) pipsEl.appendChild(h('i', { class: k < hits ? 'is-hit' : '' }));
          return h('span', { class: sunk ? 'is-sunk' : '' }, f.name, pipsEl, sunk ? h('span', { class: 'visually-hidden' }, ' sunk') : null);
        }));
        g.heading.querySelector('small').textContent = afloat(side) + ' of ' + FLEET.length + ' afloat' + (g.kind === 'enemy' ? ' \u00b7 ' + shotsFired + ' shot' + (shotsFired === 1 ? '' : 's') : '');
      }
      function drawAll() { drawGrid(enemyGrid); drawGrid(mineGrid); }
      function setRoving(g) {
        var cu = cursor[g.kind];
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) g.cellEls[r][c].setAttribute('tabindex', r === cu[0] && c === cu[1] ? '0' : '-1');
      }
      function log(text) {
        logItems.unshift(text);
        if (logItems.length > 5) logItems.length = 5;
        logList.replaceChildren.apply(logList, logItems.map(function (t) { return h('li', null, t); }));
      }
      function showStamp(g, title, sub) {
        g.stamp.replaceChildren(h('div', null, h('b', null, title), sub ? h('span', null, sub) : null));
        hold(function () { g.stamp.replaceChildren(); }, STAMP_MS);
      }

      /* ---------- settings ---------- */
      function setSetting(key, val) {
        if (key === 'shots') { shotsMode = val; api.store.set('shots', val); }
        else { level = val; api.store.set('level', val); }
        newGame();
      }
      function paintSettings() {
        shotBtns.one.setAttribute('aria-pressed', String(shotsMode === 'one'));
        shotBtns.salvo.setAttribute('aria-pressed', String(shotsMode === 'salvo'));
        levelBtns.easy.setAttribute('aria-pressed', String(level === 'easy'));
        levelBtns.hard.setAttribute('aria-pressed', String(level === 'hard'));
      }

      /* ---------- placing your fleet ---------- */
      function newGame() {
        cancelAll();
        phase = 'place'; busy = false; selected = null; dir = 'h'; aims = []; shotsFired = 0; lastMine = null; lastTheirs = null; logItems = [];
        mine = null; theirs = null; previewAt = null;
        myFleet = randomFleet(api.random);
        paintSettings();
        root.setAttribute('data-phase', 'place');
        placeBox.hidden = false;
        turnBar.hidden = true;
        enemyGrid.box.hidden = true;
        boards.classList.remove('is-battle', 'is-mine-big');
        swapBtn.textContent = 'Show my fleet big';
        enemyGrid.stamp.replaceChildren(); mineGrid.stamp.replaceChildren();
        mineGrid.heading.firstChild.textContent = 'Your fleet';
        logList.replaceChildren();
        cursor.mine = [4, 4]; cursor.enemy = [4, 4];
        setRoving(mineGrid);
        drawGrid(enemyGrid);
        refreshPlacing();
        api.status('Place your fleet, then press Start battle');
      }
      function refreshPlacing() {
        FLEET.forEach(function (f) {
          var sh = myFleet.filter(function (x) { return x.id === f.id; })[0];
          shipBtns[f.id].setAttribute('aria-pressed', String(selected === f.id));
          shipBtns[f.id].classList.toggle('is-placed', !!(sh && sh.r != null) && selected !== f.id);
        });
        var ready = myFleet.every(function (x) { return x.r != null; }) && !selected;
        startBtn.disabled = !ready;
        help.textContent = selected
          ? 'Now tap a square for the front of your ' + nameOf(selected) + ' (it points ' + (dir === 'h' ? 'across' : 'down') + '). Rotate turns it. Keyboard: arrows, Enter, R.'
          : 'Your fleet is placed. To move a ship, tap it, then tap where its front should go. Ships may not overlap. Press Start battle when you are ready.';
        drawGrid(mineGrid);
      }
      function pickUp(id) {
        if (phase !== 'place') return;
        if (selected === id) { selected = null; api.sound('click'); refreshPlacing(); return; }
        if (selected) return dropBack(id);
        lift(id);
      }
      function lift(id) {
        var sh = myFleet.filter(function (x) { return x.id === id; })[0];
        selected = id;
        dir = sh && sh.dir ? sh.dir : 'h';
        if (sh && sh.r != null) previewAt = [sh.r, sh.c];
        api.sound('flip');
        refreshPlacing();
      }
      /* choosing another ship while one is lifted: put the lifted one back where it was first */
      function dropBack(nextId) { selected = null; lift(nextId); }
      function rotate() {
        if (phase !== 'place') return;
        if (!selected) { help.textContent = 'Pick a ship first (tap it), then Rotate.'; api.sound('wrong'); return; }
        dir = dir === 'h' ? 'v' : 'h';
        api.sound('click');
        refreshPlacing();
      }
      function shuffle() {
        if (phase !== 'place') return;
        selected = null;
        myFleet = randomFleet(api.random);
        api.sound('shuffle');
        refreshPlacing();
      }
      function placeAt(r, c) {
        if (!selected) {
          var under = shipAt(myFleet, r, c);
          if (under) { previewAt = [r, c]; lift(under.id); previewAt = [under.r, under.c]; drawGrid(mineGrid); }
          return;
        }
        var f = fleetDef(selected);
        var sh = { id: f.id, name: f.name, size: f.size, r: r, c: c, dir: dir };
        if (!fits(myFleet, sh)) {
          api.sound('wrong');
          help.textContent = 'The ' + f.name + ' does not fit there: it would ' + (shipCells(sh).every(function (p) { return onGrid(p[0], p[1]); }) ? 'overlap another ship' : 'run off the grid') + '.';
          return;
        }
        myFleet = myFleet.map(function (x) { return x.id === f.id ? sh : x; });
        selected = null;
        api.sound('clack');
        refreshPlacing();
      }

      /* ---------- the battle ---------- */
      function startBattle() {
        if (phase !== 'place' || !myFleet.every(function (x) { return x.r != null; })) return;
        phase = 'battle';
        selected = null; previewAt = null;
        mine = makeSide(myFleet);
        theirs = makeSide(randomFleet(api.random));
        root.setAttribute('data-phase', 'battle');
        placeBox.hidden = true;
        turnBar.hidden = false;
        enemyGrid.box.hidden = false;
        boards.classList.add('is-battle');
        api.sound('bell');
        log('The battle begins. You fire first.');
        setRoving(enemyGrid);
        drawAll();
        yourTurn();
        if (root.contains(document.activeElement)) enemyGrid.cellEls[cursor.enemy[0]][cursor.enemy[1]].focus({ preventScroll: true });
      }
      function shotsAllowed() { return shotsMode === 'salvo' ? afloat(mine) : 1; }
      function yourTurn() {
        busy = false;
        aims = [];
        root.setAttribute('data-turn', 'you');
        var n = shotsAllowed();
        turnText.textContent = n > 1 ? 'Your salvo: pick ' + n + ' squares' : 'Your turn: pick a square';
        api.status(n > 1 ? 'Your turn: aim ' + n + ' shots, one for each ship you have afloat' : 'Your turn: pick a square to fire at');
        drawGrid(enemyGrid);
      }

      function cellClick(g, r, c) {
        if (g.kind === 'mine') { if (phase === 'place') { cursor.mine = [r, c]; setRoving(mineGrid); previewAt = [r, c]; placeAt(r, c); } return; }
        if (phase !== 'battle' || busy) return;
        cursor.enemy = [r, c];
        setRoving(enemyGrid);
        aimOrFire(r, c);
      }
      function hover(g, r, c) {
        if (g.kind === 'mine' && phase === 'place' && selected) { previewAt = [r, c]; drawGrid(mineGrid); }
      }
      function gridKey(g, ev) {
        var k = ev.key, cu = cursor[g.kind];
        var moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
        if (moves[k]) {
          ev.preventDefault();
          cu[0] = Math.max(0, Math.min(N - 1, cu[0] + moves[k][0]));
          cu[1] = Math.max(0, Math.min(N - 1, cu[1] + moves[k][1]));
          setRoving(g);
          if (g.kind === 'mine' && selected) previewAt = [cu[0], cu[1]];
          g.cellEls[cu[0]][cu[1]].focus({ preventScroll: true });
          drawGrid(g);
          return;
        }
        if (k === 'Enter' || k === ' ') {
          ev.preventDefault();
          cellClick(g, cu[0], cu[1]);
          return;
        }
        if ((k === 'r' || k === 'R') && g.kind === 'mine' && phase === 'place') { ev.preventDefault(); if (!selected) { var under = shipAt(myFleet, cu[0], cu[1]); if (under) lift(under.id); } rotate(); previewAt = [cu[0], cu[1]]; drawGrid(mineGrid); }
      }

      function aimOrFire(r, c) {
        if (theirs.shot[r][c]) {
          api.sound('wrong');
          api.status('You have already fired at ' + cellName(r, c) + '. Pick another square');
          return;
        }
        var n = shotsAllowed();
        if (n <= 1) { fireVolley([[r, c]]); return; }
        var at = aims.findIndex(function (p) { return p[0] === r && p[1] === c; });
        if (at >= 0) { aims.splice(at, 1); api.sound('click'); }
        else { aims.push([r, c]); api.sound('tick'); }
        if (aims.length >= n) { var volley = aims.slice(); aims = []; fireVolley(volley); return; }
        turnText.textContent = 'Your salvo: ' + aims.length + ' of ' + n + ' aimed';
        api.status('Salvo: ' + aims.length + ' of ' + n + ' shots aimed. Pick ' + (n - aims.length) + ' more');
        drawGrid(enemyGrid);
      }

      /* Your shots land one after another. */
      function fireVolley(list) {
        busy = true;
        root.setAttribute('data-turn', 'firing');
        var results = [];
        (function next(i) {
          if (i >= list.length) { afterYourVolley(results); return; }
          var p = list[i], res = fireAt(theirs, p[0], p[1]);
          shotsFired += 1;
          results.push(res);
          lastTheirs = { cells: [p], sunk: res.result === 'sunk' ? res.ship.id : null };
          var where = cellName(p[0], p[1]);
          if (res.result === 'miss') { api.sound('whoosh'); log('You fired at ' + where + ': miss.'); }
          else if (res.result === 'hit') { api.sound('thud'); log('You fired at ' + where + ': hit on the ' + res.ship.name + '!'); }
          else { api.sound('thud'); log('You fired at ' + where + ' and sank the ' + res.ship.name + '!'); }
          drawGrid(enemyGrid);
          if (res.result === 'sunk') {
            later(function () { api.sound('bell'); }, 150);
            showStamp(enemyGrid, 'Sunk!', 'You sank the ' + res.ship.name);
            api.status('Sunk! You sank the ' + res.ship.name + '!');
          } else api.status(res.result === 'hit' ? 'Hit! You hit the ' + res.ship.name + '.' : 'Miss.');
          if (allSunk(theirs)) { later(function () { finish(true); }, 300); return; }
          later(function () { next(i + 1); }, SHOT_MS);
        })(0);
      }
      function afterYourVolley(results) {
        var hits = results.filter(function (x) { return x.result !== 'miss'; }).length;
        if (results.length > 1) api.status('Salvo: ' + hits + ' hit' + (hits === 1 ? '' : 's') + ' and ' + (results.length - hits) + ' miss' + (results.length - hits === 1 ? '' : 'es') + '. The computer is aiming');
        else if (results[0].result !== 'sunk') api.status((results[0].result === 'hit' ? 'Hit! ' : 'Miss. ') + 'The computer is aiming');
        root.setAttribute('data-turn', 'computer');
        turnText.textContent = 'The computer is aiming...';
        later(computerTurn, COMPUTER_MS + (results.some(function (x) { return x.result === 'sunk'; }) ? 500 : 0));
      }

      function computerTurn() {
        var n = shotsMode === 'salvo' ? afloat(theirs) : 1;
        var choice = aiChoose(mine, n, level, api.random);
        var list = choice.picks;
        (function next(i) {
          if (i >= list.length) { if (!allSunk(mine)) yourTurn(); return; }
          var p = list[i], res = fireAt(mine, p[0], p[1]);
          lastMine = { cells: [p], sunk: res.result === 'sunk' ? res.ship.id : null };
          var where = cellName(p[0], p[1]);
          if (res.result === 'miss') { api.sound('whoosh'); log('The computer fired at ' + where + ': miss.'); }
          else if (res.result === 'hit') { api.sound('thud'); log('The computer fired at ' + where + ': hit on your ' + res.ship.name + '!'); }
          else { api.sound('lose'); log('The computer fired at ' + where + ' and sank your ' + res.ship.name + '!'); showStamp(mineGrid, 'Sunk!', 'Your ' + res.ship.name); }
          api.status(res.result === 'miss' ? 'The computer fired at ' + where + ' and missed.' : res.result === 'hit' ? 'The computer hit your ' + res.ship.name + ' at ' + where + '!' : 'The computer sank your ' + res.ship.name + '!');
          drawGrid(mineGrid);
          if (allSunk(mine)) { later(function () { finish(false); }, 400); return; }
          later(function () { next(i + 1); }, SHOT_MS);
        })(0);
      }

      function finish(won) {
        phase = 'over';
        busy = false;
        root.setAttribute('data-phase', 'over');
        root.setAttribute('data-turn', '');
        turnText.textContent = won ? 'You win!' : 'The computer wins';
        drawAll();
        var key = shotsMode + '-' + level;
        if (won) {
          var prev = best[key];
          var record = !prev || shotsFired < prev;
          if (record) { best[key] = shotsFired; api.store.set('best', best); }
          var msg = 'You sank the whole fleet in ' + shotsFired + ' shots!' + (record ? ' Your best yet.' : ' Your best is ' + prev + '.');
          api.status(msg + ' Press New game to play again.');
          log(msg);
          showStamp(enemyGrid, 'Victory!', shotsFired + ' shots');
          api.celebrate('You sank the whole fleet in ' + shotsFired + ' shots!');
        } else {
          api.status('The computer sank your fleet. Its ships are drawn on the enemy grid. Press New game for a rematch.');
          log('The computer sank your whole fleet.');
          api.sound('lose');
        }
        if (root.contains(document.activeElement)) newBtn.focus({ preventScroll: true });
      }

      newGame();
      return { destroy: destroy };
    }
  });
})();
