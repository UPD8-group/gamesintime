/* Snakes and Ladders for Games in Time.
   Sold in England from 1892, adapted from the much older Indian game Moksha Patam, in which
   ladders were good deeds and snakes were bad ones. The English boards of the 1890s kept the idea
   and gave each ladder a virtue and each snake a vice. This board uses names in that style.

   How the file is organised:
     Part 1  The rules. Where every square sits, where the snakes and ladders are, and what one
             roll of the die does to a player's position. These functions never touch the screen.
     Part 2  The computer player. There is nothing to decide in Snakes and Ladders, so the
             computer simply waits a moment and rolls. That is explained in plain words below.
     Part 3  The screen. A 10 by 10 CSS grid of numbered cells, an SVG overlay that draws the
             snakes and ladders, coloured tokens, a big Roll button with a die face, a scoreboard,
             a legend and a short move log for teachers.

   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  var SIZE = 10;                 /* squares per side */
  var LAST = SIZE * SIZE;        /* square 100 wins */
  var TUMBLE_MS = 500;           /* how long the die tumbles before it settles */
  var STEP_MS = 120;             /* how long the token takes to hop one square */
  var SLIDE_MS = 320;            /* the pause before a token climbs a ladder or slides down a snake */
  var COMPUTER_MS = 600;         /* the computer's pause before it rolls */
  var HANDOFF_MS = 900;          /* how long the result stays on the status line before the next turn */
  var LOG_LENGTH = 6;            /* how many events the move log keeps */

  /* =====================================================================
     PART 1: THE RULES
     ===================================================================== */

  /* The fixed board. Each ladder goes UP from "from" to "to"; each snake goes DOWN from its
     head at "from" to its tail at "to". The names copy the style of 1890s English boards. */
  var LADDERS = [
    { name: 'Thrift', from: 4, to: 14 },
    { name: 'Penitence', from: 9, to: 31 },
    { name: 'Industry', from: 20, to: 38 },
    { name: 'Patience', from: 28, to: 84 },
    { name: 'Kindness', from: 40, to: 59 },
    { name: 'Honesty', from: 51, to: 67 },
    { name: 'Courage', from: 63, to: 81 },
    { name: 'Generosity', from: 71, to: 91 }
  ];
  var SNAKES = [
    { name: 'Indolence', from: 16, to: 6 },
    { name: 'Vanity', from: 47, to: 26 },
    { name: 'Disobedience', from: 49, to: 11 },
    { name: 'Greed', from: 62, to: 19 },
    { name: 'Cruelty', from: 87, to: 24 },
    { name: 'Pride', from: 93, to: 73 },
    { name: 'Envy', from: 95, to: 75 },
    { name: 'Dishonesty', from: 98, to: 78 }
  ];

  /* Look-up tables: LADDER_AT[4] is the Thrift ladder, SNAKE_AT[16] is the Indolence snake. */
  var LADDER_AT = {}, SNAKE_AT = {};
  LADDERS.forEach(function (l) { LADDER_AT[l.from] = l; });
  SNAKES.forEach(function (s) { SNAKE_AT[s.from] = s; });

  /* The squares are numbered boustrophedon ("as the ox ploughs"): 1 to 10 run left to right along
     the bottom row, 11 to 20 run right to left along the next row up, and so on, so 100 is at the
     top left. This turns a square number into a column (0 = left) and a row (0 = bottom). */
  function squareToCell(n) {
    var row = Math.floor((n - 1) / SIZE);
    var along = (n - 1) % SIZE;
    var col = row % 2 === 0 ? along : SIZE - 1 - along;
    return { col: col, row: row };
  }

  /* One die: a whole number from 1 to 6. api.random() gives a number from 0 up to (not including) 1. */
  function rollDie(random) {
    return 1 + Math.floor(random() * 6);
  }

  /* What a roll does to a player standing on "pos" (0 means they have not entered the board yet).
     Returns the die, the square they land on, the square they end up on, and what happened on the way.
     (The landing square can be less than pos + die: without "exact", a roll past 100 stops at 100.)
     With "exact" on (the traditional rule) a roll that would go past 100 is wasted. */
  function applyRoll(pos, die, exact) {
    var landed = pos + die;
    if (landed > LAST) {
      if (exact) return { die: die, from: pos, landed: pos, to: pos, via: null, kind: null, forfeited: true, needs: LAST - pos };
      landed = LAST;   /* the friendlier modern rule: overshooting still finishes */
    }
    var ladder = LADDER_AT[landed], snake = SNAKE_AT[landed];
    if (ladder) return { die: die, from: pos, landed: landed, to: ladder.to, via: ladder, kind: 'ladder', forfeited: false };
    if (snake) return { die: die, from: pos, landed: landed, to: snake.to, via: snake, kind: 'snake', forfeited: false };
    return { die: die, from: pos, landed: landed, to: landed, via: null, kind: null, forfeited: false };
  }

  /* =====================================================================
     PART 2: THE COMPUTER PLAYER
     Snakes and Ladders has no choices at all: you roll, you move, that is it. So the computer
     cannot be clever or silly. It waits COMPUTER_MS so you can see whose turn it is, then rolls
     exactly the same die you do. That makes it a fair game of pure luck, which is why teachers
     like it for talking about probability: every player has the same chance to win.
     (The waiting and rolling happens in Part 3, in scheduleComputer and roll.)
     ===================================================================== */

  /* =====================================================================
     PART 3: THE SCREEN
     ===================================================================== */

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) el.setAttribute(k, String(attrs[k])); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }

  /* The centre of a square in the overlay's 100 by 100 coordinate space. */
  function centre(n) {
    var c = squareToCell(n);
    return { x: (c.col + 0.5) * 10, y: (SIZE - 1 - c.row + 0.5) * 10 };
  }

  /* A wiggly path from one square to another: a chain of curves whose control points swing
     left and right of the straight line, so every snake looks like it is slithering. */
  function snakePath(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len;                  /* a unit vector at right angles to the line */
    var segs = Math.max(2, Math.round(len / 18));       /* longer snakes get more wiggles */
    var swing = Math.min(7, 3 + len / 12);
    var d = 'M ' + a.x.toFixed(2) + ' ' + a.y.toFixed(2);
    for (var i = 0; i < segs; i++) {
      var t0 = i / segs, t1 = (i + 1) / segs, side = i % 2 === 0 ? 1 : -1;
      var c1x = a.x + dx * (t0 + (t1 - t0) / 3) + nx * swing * side;
      var c1y = a.y + dy * (t0 + (t1 - t0) / 3) + ny * swing * side;
      var c2x = a.x + dx * (t0 + 2 * (t1 - t0) / 3) + nx * swing * side;
      var c2y = a.y + dy * (t0 + 2 * (t1 - t0) / 3) + ny * swing * side;
      var ex = a.x + dx * t1, ey = a.y + dy * t1;
      d += ' C ' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) + ', ' + c2x.toFixed(2) + ' ' + c2y.toFixed(2) + ', ' + ex.toFixed(2) + ' ' + ey.toFixed(2);
    }
    return d;
  }

  function drawSnake(s) {
    var head = centre(s.from), tail = centre(s.to);
    var d = snakePath(head, tail);
    var g = svg('g', { class: 'sal-snake', 'data-name': s.name });
    g.appendChild(svg('path', { d: d, class: 'sal-snake-body' }));
    g.appendChild(svg('path', { d: d, class: 'sal-snake-shine' }));
    /* A small head with two eyes at the top end. */
    g.appendChild(svg('circle', { cx: head.x, cy: head.y, r: 2.3, class: 'sal-snake-head' }));
    var dx = tail.x - head.x, dy = tail.y - head.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len;
    g.appendChild(svg('circle', { cx: head.x + nx * 1.1 - dx / len * 0.6, cy: head.y + ny * 1.1 - dy / len * 0.6, r: 0.55, class: 'sal-snake-eye' }));
    g.appendChild(svg('circle', { cx: head.x - nx * 1.1 - dx / len * 0.6, cy: head.y - ny * 1.1 - dy / len * 0.6, r: 0.55, class: 'sal-snake-eye' }));
    return g;
  }

  /* A ladder is two rails with rungs every few units along. */
  function drawLadder(l) {
    var a = centre(l.from), b = centre(l.to);
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len * 1.7, ny = dx / len * 1.7;        /* half the ladder's width, at right angles */
    var g = svg('g', { class: 'sal-ladder', 'data-name': l.name });
    g.appendChild(svg('line', { x1: a.x + nx, y1: a.y + ny, x2: b.x + nx, y2: b.y + ny, class: 'sal-rail' }));
    g.appendChild(svg('line', { x1: a.x - nx, y1: a.y - ny, x2: b.x - nx, y2: b.y - ny, class: 'sal-rail' }));
    var rungs = Math.max(2, Math.round(len / 4));
    for (var i = 0; i <= rungs; i++) {
      var t = i / rungs, px = a.x + dx * t, py = a.y + dy * t;
      g.appendChild(svg('line', { x1: px + nx, y1: py + ny, x2: px - nx, y2: py - ny, class: 'sal-rung' }));
    }
    return g;
  }

  /* Die faces: where the pips go on a 60 by 60 square, for 1 to 6. */
  var PIPS = {
    1: [[30, 30]],
    2: [[17, 17], [43, 43]],
    3: [[17, 17], [30, 30], [43, 43]],
    4: [[17, 17], [43, 17], [17, 43], [43, 43]],
    5: [[17, 17], [43, 17], [30, 30], [17, 43], [43, 43]],
    6: [[17, 17], [43, 17], [17, 30], [43, 30], [17, 43], [43, 43]]
  };
  function drawDie(face) {
    var s = svg('svg', { viewBox: '0 0 60 60', class: 'sal-die', 'aria-hidden': 'true', focusable: 'false' });
    s.appendChild(svg('rect', { x: 3, y: 3, width: 54, height: 54, rx: 10, class: 'sal-die-face' }));
    PIPS[face].forEach(function (p) { s.appendChild(svg('circle', { cx: p[0], cy: p[1], r: 5.5, class: 'sal-pip' })); });
    return s;
  }

  var CSS = [
    '.game-snakes-and-ladders .sal-top { display: flex; flex-wrap: wrap; gap: .6rem 1rem; align-items: center; justify-content: space-between; margin-bottom: .75rem; }',
    '.game-snakes-and-ladders .sal-roll { min-height: 56px; min-width: 9.5rem; font-size: 1.25rem; display: inline-flex; align-items: center; gap: .6rem; padding: .4rem 1.2rem .4rem .8rem; }',
    '.game-snakes-and-ladders .sal-die { width: 40px; height: 40px; flex: none; }',
    '.game-snakes-and-ladders .sal-roll.is-waiting { opacity: .6; cursor: wait; }',
    '.game-snakes-and-ladders .sal-die-face { fill: var(--on-brand); }',
    '.game-snakes-and-ladders .sal-pip { fill: var(--brand); }',
    '.game-snakes-and-ladders .sal-roll.is-tumbling .sal-die { animation: sal-tumble .5s ease-in-out; }',
    '@keyframes sal-tumble { 0% { transform: rotate(0) scale(1); } 25% { transform: rotate(90deg) scale(1.15); } 50% { transform: rotate(180deg) scale(.95); } 75% { transform: rotate(270deg) scale(1.1); } 100% { transform: rotate(360deg) scale(1); } }',
    '.game-snakes-and-ladders .scoreboard { font-size: 1rem; margin-bottom: 0; }',
    '.game-snakes-and-ladders .scoreboard .sal-player { padding: .2rem .5rem; border-radius: 999px; border: 2px solid transparent; }',
    '.game-snakes-and-ladders .scoreboard .sal-player.is-current { border-color: var(--brass); background: var(--surface-2); }',
    '.game-snakes-and-ladders .sal-tok { position: relative; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 800; line-height: 1; box-shadow: 0 0 0 2px var(--surface), 0 2px 4px rgba(0, 0, 0, .35); }',
    '.game-snakes-and-ladders .sal-tok-0 { background: var(--brand); color: var(--on-brand); }',
    '.game-snakes-and-ladders .sal-tok-1 { background: var(--red); color: var(--bg); }',
    '.game-snakes-and-ladders .sal-tok-2 { background: var(--green); color: var(--bg); }',
    '.game-snakes-and-ladders .sal-tok-3 { background: var(--brass); color: var(--bg); }',
    '.game-snakes-and-ladders .scoreboard .sal-tok { width: 26px; height: 26px; font-size: .85rem; }',
    /* The board: a square that fits phones, with the overlay sitting exactly on top of the grid. */
    '.game-snakes-and-ladders .sal-wrap { position: relative; width: min(92vw, 560px); max-width: 100%; margin-inline: auto; }',
    /* On phones the panel's padding would squeeze cells under 30 px, so the board borrows that padding. */
    '@media (max-width: 480px) { .game-snakes-and-ladders .sal-wrap { max-width: calc(100% + 1.6rem); margin-inline: -.8rem; } }',
    '.game-snakes-and-ladders .sal-grid { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); grid-template-rows: repeat(10, minmax(0, 1fr)); aspect-ratio: 1 / 1; border: 2px solid var(--brand); border-radius: 6px; overflow: hidden; background: var(--surface); }',
    '.game-snakes-and-ladders .sal-cell { position: relative; box-shadow: inset 0 0 0 1px var(--line); font-size: clamp(.58rem, 2.4vw, .95rem); font-weight: 700; color: var(--ink-muted); font-variant-numeric: tabular-nums; }',
    '.game-snakes-and-ladders .sal-cell.is-odd { background: var(--surface-2); }',
    '.game-snakes-and-ladders .sal-cell.is-here { box-shadow: inset 0 0 0 3px var(--brass); }',
    '.game-snakes-and-ladders .sal-cell.is-finish { background: var(--brass-bright); color: var(--brand); }',
    '.game-snakes-and-ladders .sal-num { position: absolute; left: 7%; top: 3%; pointer-events: none; }',
    '.game-snakes-and-ladders .sal-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }',
    '.game-snakes-and-ladders .sal-snake-body { fill: none; stroke: var(--red); stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }',
    '.game-snakes-and-ladders .sal-snake-shine { fill: none; stroke: var(--on-brand); stroke-width: .6; stroke-linecap: round; opacity: .55; }',
    '.game-snakes-and-ladders .sal-snake-head { fill: var(--red); }',
    '.game-snakes-and-ladders .sal-snake-eye { fill: var(--on-brand); }',
    '.game-snakes-and-ladders .sal-rail { stroke: var(--brass); stroke-width: 1.1; stroke-linecap: round; }',
    '.game-snakes-and-ladders .sal-rung { stroke: var(--brass); stroke-width: .9; stroke-linecap: round; }',
    /* Tokens sit inside their cell. Alone they fill most of it; sharing, they move into corners. */
    '.game-snakes-and-ladders .sal-cell .sal-tok { position: absolute; left: 50%; top: 50%; width: 64%; height: 64%; transform: translate(-50%, -50%); font-size: clamp(.6rem, 2.6vw, 1.1rem); z-index: 2; }',
    '.game-snakes-and-ladders .sal-cell .sal-tok.is-shared { width: 50%; height: 50%; font-size: clamp(.5rem, 2vw, .9rem); }',
    '.game-snakes-and-ladders .sal-cell .sal-tok.is-shared.at-0 { left: 27%; top: 27%; }',
    '.game-snakes-and-ladders .sal-cell .sal-tok.is-shared.at-1 { left: 73%; top: 27%; }',
    '.game-snakes-and-ladders .sal-cell .sal-tok.is-shared.at-2 { left: 27%; top: 73%; }',
    '.game-snakes-and-ladders .sal-cell .sal-tok.is-shared.at-3 { left: 73%; top: 73%; }',
    '.game-snakes-and-ladders .sal-tok.is-landed { animation: sal-land .3s ease-out; }',
    '@keyframes sal-land { 0% { transform: translate(-50%, -50%) scale(1.5); } 100% { transform: translate(-50%, -50%) scale(1); } }',
    '.game-snakes-and-ladders .sal-start { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; min-height: 40px; margin: .5rem auto 0; width: min(92vw, 560px); max-width: 100%; font-weight: 700; color: var(--ink-muted); font-size: .95rem; }',
    '.game-snakes-and-ladders .sal-start .sal-tok { width: 30px; height: 30px; font-size: .9rem; }',
    /* Legend and move log under the board. */
    '.game-snakes-and-ladders .sal-below { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: .75rem 1.25rem; margin-top: 1rem; font-size: .95rem; }',
    '.game-snakes-and-ladders .sal-below h3 { font-size: 1rem; margin: 0 0 .35rem; display: flex; align-items: center; gap: .4rem; }',
    '.game-snakes-and-ladders .sal-below ul, .game-snakes-and-ladders .sal-below ol { margin: 0; padding-left: 1.2rem; }',
    '.game-snakes-and-ladders .sal-below li { margin: .1rem 0; }',
    '.game-snakes-and-ladders .sal-legend li span { color: var(--ink-muted); font-variant-numeric: tabular-nums; }',
    '.game-snakes-and-ladders .sal-key { display: inline-block; width: 14px; height: 14px; border-radius: 50%; flex: none; }',
    '.game-snakes-and-ladders .sal-key-snake { background: var(--red); }',
    '.game-snakes-and-ladders .sal-key-ladder { background: var(--brass); border-radius: 3px; }',
    '.game-snakes-and-ladders .sal-log { grid-column: 1 / -1; }',
    '.game-snakes-and-ladders .sal-log ol { list-style: none; padding: 0; }',
    '.game-snakes-and-ladders .sal-log li { padding: .25rem .5rem; border-left: 3px solid var(--line); margin: .2rem 0; }',
    '.game-snakes-and-ladders .sal-log li:first-child { border-left-color: var(--brass); }',
    '.game-snakes-and-ladders .field input[type="checkbox"] { width: 22px; height: 22px; accent-color: var(--brand-2); }',
    '@media (prefers-reduced-motion: reduce) { .game-snakes-and-ladders .sal-roll.is-tumbling .sal-die, .game-snakes-and-ladders .sal-tok.is-landed { animation: none; } }'
  ].join('\n');

  /* The four token colours and names, in seat order. */
  var SEATS = [
    { name: 'Blue', letter: 'B' },
    { name: 'Red', letter: 'R' },
    { name: 'Green', letter: 'G' },
    { name: 'Gold', letter: 'Y' }
  ];
  var MODES = ['computer', '2', '3', '4'];

  GamesInTime.register({
    id: 'snakes-and-ladders',
    mount: function (root, api) {
      var h = api.h;
      root.appendChild(h('style', null, CSS));

      /* ---- settings, remembered for next time ---- */
      var modeKey = api.store.get('players', 'computer');
      if (MODES.indexOf(modeKey) < 0) modeKey = 'computer';
      var exact = api.store.get('exact', false) === true;

      /* ---- game state ---- */
      var players = [];        /* [{name, letter, seat, pos, isComputer}] */
      var turn = 0;            /* index into players */
      var over = false;        /* true once somebody has reached 100 */
      var busy = false;        /* true while the die tumbles or a token moves, so Roll does nothing */
      var timers = [];         /* every pending timeout, so New game and destroy can cancel them */
      var log = [];            /* the last few things that happened, newest first */
      var lastFace = 6;

      function later(fn, ms) {
        var id = setTimeout(function () {
          timers = timers.filter(function (t) { return t !== id; });
          fn();
        }, api.reducedMotion ? 0 : ms);
        timers.push(id);
        return id;
      }
      /* A pause that is reading time, not motion, so reduced motion does not shorten it. */
      function pause(fn, ms) {
        var id = setTimeout(function () {
          timers = timers.filter(function (t) { return t !== id; });
          fn();
        }, ms);
        timers.push(id);
        return id;
      }
      function cancelTimers() {
        timers.forEach(function (t) { clearTimeout(t); });
        timers = [];
      }

      /* ---- controls ---- */
      var playersSelect = h('select', { id: 'sal-players', onchange: function () { setMode(playersSelect.value); } },
        h('option', { value: 'computer' }, 'You vs computer'),
        h('option', { value: '2' }, '2 players'),
        h('option', { value: '3' }, '3 players'),
        h('option', { value: '4' }, '4 players'));
      playersSelect.value = modeKey;
      var exactBox = h('input', { type: 'checkbox', id: 'sal-exact', onchange: function () {
        exact = exactBox.checked;
        api.store.set('exact', exact);
        api.announce(exact ? 'Exact roll to finish is on' : 'Exact roll to finish is off');
      } });
      exactBox.checked = exact;
      var newBtn = h('button', { class: 'btn', type: 'button', onclick: newGame }, 'New game');
      var toolbar = h('div', { class: 'game-toolbar' },
        newBtn,
        h('label', { class: 'field', for: 'sal-players' }, 'Players', playersSelect),
        h('label', { class: 'field', for: 'sal-exact' }, exactBox, 'Exact roll to finish (traditional)'));

      var rollBtn = h('button', { class: 'btn btn-primary sal-roll', type: 'button', onclick: humanRoll, 'aria-label': 'Roll the die' });
      var rollText = h('span', null, 'Roll');
      rollBtn.appendChild(drawDie(lastFace));
      rollBtn.appendChild(rollText);

      var scoreboard = h('div', { class: 'scoreboard', 'aria-label': 'Players' });
      var top = h('div', { class: 'sal-top' }, rollBtn, scoreboard);

      /* ---- the board ---- */
      var grid = h('div', { class: 'sal-grid', role: 'group', 'aria-label': 'Snakes and Ladders board, 100 squares' });
      var cells = {};   /* square number -> its cell element */
      for (var r = SIZE - 1; r >= 0; r--) {
        for (var c = 0; c < SIZE; c++) {
          /* Which square lives at this column and row? The reverse of squareToCell. */
          var along = r % 2 === 0 ? c : SIZE - 1 - c;
          var n = r * SIZE + along + 1;
          var cell = h('div', { class: 'sal-cell' + ((r + c) % 2 ? ' is-odd' : '') + (n === LAST ? ' is-finish' : ''), 'data-square': n },
            h('span', { class: 'sal-num', 'aria-hidden': 'true' }, String(n)));
          cells[n] = cell;
          grid.appendChild(cell);
        }
      }
      var overlay = svg('svg', { viewBox: '0 0 100 100', class: 'sal-overlay', 'aria-hidden': 'true', focusable: 'false' });
      LADDERS.forEach(function (l) { overlay.appendChild(drawLadder(l)); });
      SNAKES.forEach(function (s) { overlay.appendChild(drawSnake(s)); });
      var wrap = h('div', { class: 'board sal-wrap' }, grid, overlay);

      var startTray = h('div', { class: 'sal-start' }, h('span', null, 'Start:'));

      /* ---- legend and log ---- */
      function legendList(items, word) {
        return h('ul', { class: 'sal-legend' }, items.map(function (it) {
          return h('li', null, it.name + ' ', h('span', null, it.from + ' ' + word + ' ' + it.to));
        }));
      }
      var logList = h('ol', { 'aria-label': 'Last moves' });
      var below = h('div', { class: 'sal-below' },
        h('div', null, h('h3', null, h('span', { class: 'sal-key sal-key-ladder', 'aria-hidden': 'true' }), 'Ladders'), legendList(LADDERS, 'up to')),
        h('div', null, h('h3', null, h('span', { class: 'sal-key sal-key-snake', 'aria-hidden': 'true' }), 'Snakes'), legendList(SNAKES, 'down to')),
        h('div', { class: 'sal-log' }, h('h3', null, 'Last moves'), logList));

      root.appendChild(toolbar);
      root.appendChild(top);
      root.appendChild(wrap);
      root.appendChild(startTray);
      root.appendChild(below);
      root.appendChild(h('p', { class: 'game-note' }, 'Everybody starts off the board. Land at the foot of a ladder to climb it; land on a snake\'s head to slide to its tail. First to square 100 wins.'));

      /* ---- drawing helpers ---- */
      function tokenEl(p, extraClass) {
        return h('span', { class: 'sal-tok sal-tok-' + p.seat + (extraClass ? ' ' + extraClass : ''), role: 'img',
          'aria-label': p.name + (p.pos === 0 ? ' at the start' : ' on square ' + p.pos) }, p.letter);
      }

      /* Redraw every token. Tokens live inside their cell; when a cell is shared, each one is
         pushed into a different corner so all of them stay visible. */
      function drawTokens(landedPlayer) {
        Array.prototype.forEach.call(root.querySelectorAll('.sal-cell .sal-tok, .sal-start .sal-tok'), function (t) { t.parentNode.removeChild(t); });
        Array.prototype.forEach.call(root.querySelectorAll('.sal-cell.is-here'), function (c) { c.classList.remove('is-here'); });
        var bySquare = {};
        players.forEach(function (p) { (bySquare[p.pos] = bySquare[p.pos] || []).push(p); });
        Object.keys(bySquare).forEach(function (sq) {
          var list = bySquare[sq];
          list.forEach(function (p, i) {
            if (p.pos === 0) { startTray.appendChild(tokenEl(p)); return; }
            var cls = (list.length > 1 ? 'is-shared at-' + i : '') + (p === landedPlayer ? ' is-landed' : '');
            cells[p.pos].appendChild(tokenEl(p, cls));
          });
        });
        if (landedPlayer && landedPlayer.pos > 0) cells[landedPlayer.pos].classList.add('is-here');
        startTray.hidden = !players.some(function (p) { return p.pos === 0; });
      }

      function drawScoreboard() {
        scoreboard.replaceChildren();
        players.forEach(function (p, i) {
          scoreboard.appendChild(h('span', { class: 'sal-player' + (i === turn && !over ? ' is-current' : '') },
            h('span', { class: 'sal-tok sal-tok-' + p.seat, 'aria-hidden': 'true' }, p.letter),
            p.name + ': ' + (p.pos === 0 ? 'start' : p.pos === LAST ? 'home' : String(p.pos))));
        });
      }

      function setDie(face) {
        lastFace = face;
        rollBtn.replaceChild(drawDie(face), rollBtn.querySelector('.sal-die'));
      }

      /* We never truly disable the Roll button: a disabled button loses keyboard focus, which would
         make a keyboard player hunt for it after every computer turn. aria-disabled tells screen
         readers it is waiting, and humanRoll ignores presses while busy. */
      function setRollEnabled(on) {
        rollBtn.setAttribute('aria-disabled', on ? 'false' : 'true');
        rollBtn.classList.toggle('is-waiting', !on);
      }

      function addLog(text) {
        log.unshift(text);
        if (log.length > LOG_LENGTH) log.length = LOG_LENGTH;
        logList.replaceChildren();
        log.forEach(function (t) { logList.appendChild(h('li', null, t)); });
      }

      /* ---- the game ---- */
      function setMode(key) {
        if (MODES.indexOf(key) < 0) key = 'computer';
        modeKey = key;
        api.store.set('players', key);
        newGame();
      }

      function newGame() {
        cancelTimers();
        busy = false; over = false; turn = 0; log = [];
        var count = modeKey === 'computer' ? 2 : Number(modeKey);
        players = [];
        for (var i = 0; i < count; i++) {
          var computer = modeKey === 'computer' && i === 1;
          players.push({ name: computer ? 'Computer' : SEATS[i].name, letter: computer ? 'C' : SEATS[i].letter, seat: i, pos: 0, isComputer: computer });
        }
        setRollEnabled(true);
        rollBtn.classList.remove('is-tumbling');
        rollText.textContent = 'Roll';
        drawTokens(null);
        drawScoreboard();
        logList.replaceChildren(h('li', { class: 'muted' }, 'No moves yet.'));
        api.status('Your turn, ' + players[0].name);
      }

      function current() { return players[turn]; }

      /* The human presses Roll. Ignored while something is already happening or the game is over. */
      function humanRoll() {
        if (busy || over || current().isComputer) return;
        roll();
      }

      /* Roll the die, tumble it, then walk the token. Used by humans and the computer alike. */
      function roll() {
        var p = current();
        busy = true;
        setRollEnabled(false);
        rollText.textContent = 'Rolling';
        var die = rollDie(api.random);
        var result = applyRoll(p.pos, die, exact);

        if (api.reducedMotion) { settle(); return; }
        /* Tumble: show random faces quickly for about half a second, then the real one. */
        rollBtn.classList.add('is-tumbling');
        var flips = 0;
        (function flip() {
          if (flips++ < 5) { setDie(1 + Math.floor(api.random() * 6)); later(flip, TUMBLE_MS / 6); }
          else settle();
        })();

        function settle() {
          rollBtn.classList.remove('is-tumbling');
          setDie(die);
          if (result.forfeited) {
            var text = p.name + ' rolled a ' + die + ' but needs exactly ' + result.needs + ' to finish, so stays on ' + p.pos + '.';
            api.status(text);
            if (p.isComputer) api.announce(text);
            addLog(text);
            pause(nextTurn, HANDOFF_MS);
            return;
          }
          api.status(p.name + ' rolled a ' + die + '.');
          walk(p, result);
        }
      }

      /* Hop the token one square at a time until it reaches the square it landed on. */
      function walk(p, result) {
        if (p.pos < result.landed) {
          p.pos += 1;
          drawTokens(null);
          drawScoreboard();
          later(function () { walk(p, result); }, STEP_MS);
          return;
        }
        if (result.via) {
          /* Pause on the ladder's foot or the snake's head so everyone sees why, then jump. */
          drawTokens(p);
          later(function () {
            p.pos = result.to;
            finishMove(p, result);
          }, SLIDE_MS);
        } else {
          finishMove(p, result);
        }
      }

      function finishMove(p, result) {
        var die = result.die;
        var text;
        if (result.kind === 'ladder') text = p.name + ' rolled a ' + die + ' and climbed the ' + result.via.name + ' ladder to ' + result.to + '.';
        else if (result.kind === 'snake') text = p.name + ' rolled a ' + die + ' and slid down the ' + result.via.name + ' snake to ' + result.to + '.';
        else text = p.name + ' rolled a ' + die + ' and moved to ' + result.to + '.';
        drawTokens(p);
        addLog(text);
        if (p.pos >= LAST) {
          over = true;
          busy = false;
          drawScoreboard();
          rollText.textContent = 'Roll';
          api.status(p.name + ' wins!');
          api.announce(text + ' ' + p.name + ' wins!');
          addLog(p.name + ' wins!');
          return;
        }
        api.status(text);
        if (p.isComputer) api.announce(text);
        pause(nextTurn, HANDOFF_MS);
      }

      function nextTurn() {
        turn = (turn + 1) % players.length;
        busy = false;
        drawScoreboard();
        var p = current();
        if (p.isComputer) {
          api.status('Computer is thinking');
          scheduleComputer();
        } else {
          setRollEnabled(true);
          rollText.textContent = 'Roll';
          api.status('Your turn, ' + p.name);
        }
      }

      /* The computer's whole strategy: wait so a kid can see it is the computer's go, then roll. */
      function scheduleComputer() {
        busy = true;
        setRollEnabled(false);
        later(function () { if (!over) roll(); }, COMPUTER_MS);
      }

      newGame();

      return {
        destroy: function () {
          cancelTimers();
        }
      };
    }
  });
})();
