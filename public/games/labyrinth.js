/* Labyrinth for Games in Time (the 1990s hall).

   A first-person 3D maze, played like the famous 1992 and 1993 PC games, with no weapons at all. You explore a
   museum after closing time: find the coloured keys, open the matching doors, collect the stars, find the secret
   walls that slide back, and ride the lift out. Caretaker robots patrol set routes. If one spots you, it sends you
   back to your last checkpoint with a friendly buzz.

   HOW THE 3D WORKS (raycasting, the trick from 1992)
   The maze is really a flat grid of squares, like graph paper seen from above. Nothing here is truly 3D.
   For every column of pixels on the screen, the computer fires one invisible "ray" from your eyes across the grid.
   The ray hops from square to square (this hopping is called DDA, the Digital Differential Analyser) until it lands
   in a square that holds a wall. The further away the wall is, the shorter the computer draws that column, so near
   walls look tall and far walls look small. Do that for every column and your brain sees a 3D room. The floor,
   ceiling and pictures on the walls are coloured in the same way, and far things are drawn darker, like fog.
   Keys, stars and robots are flat pictures ("sprites") that always turn to face you, drawn from far to near.

   Everything is drawn into one small picture (about 320 by 200 pixels, like a 1992 PC screen) and then stretched up
   with sharp edges, so the pixels look chunky on purpose. All the pictures are drawn by this file; there are no image
   files. See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  /* ---------- numbers that shape the game ---------- */
  var TEX = 64;            /* every wall, floor and sprite picture is 64 by 64 pixels */
  var SHADES = 16;         /* 16 copies of each picture, each a little darker, for the fog */
  var FOG_DIST = 15;       /* how many squares away a wall fades almost to black */
  var BAR_H = 32;          /* the status bar along the bottom, in screen pixels */
  var PLANE = 0.66;        /* half the width of the camera's view at 1 square away (about a 67 degree view) */
  var MOVE = 3.1, BACK = 2.3, SIDE = 2.6, TURN = 2.5;   /* squares per second and radians per second */
  var RADIUS = 0.22;       /* how fat you are, so you cannot press your nose into a wall */
  var DOOR_SPEED = 2.2;    /* doors open in under half a second */
  var PUSH_SPEED = 1.2;    /* secret walls slide 1.2 squares a second */
  var GRACE = 2.2;         /* seconds the robots ignore you after you are sent back */
  var MAX_SPRITES = 160;
  var PW = 200;            /* map code for a square that a sliding secret wall is passing through */

  /* Wall picture numbers. A secret wall uses the same number plus CRACK: it looks the same, with a few cracks. */
  var T_BRICK = 1, T_TILE = 2, T_WOOD = 3, T_STONE = 4, T_BOOKS = 5, T_COMPUTER = 6, T_POSTER = 7, T_LIFT = 8,
    T_JAMB = 9, T_DOOR = 10, T_DOOR_R = 11, T_DOOR_U = 12, T_DOOR_Y = 13, T_MEMPHIS = 14, T_METAL = 15, T_PANEL = 16;
  var CRACK = 32;
  var WALL_CHARS = { '#': T_BRICK, 'T': T_TILE, 'W': T_WOOD, 'S': T_STONE, 'B': T_BOOKS, 'C': T_COMPUTER, 'P': T_POSTER, 'E': T_LIFT, 'M': T_MEMPHIS, 'X': T_METAL, 'N': T_PANEL };
  /* Doors: D opens for anyone; R, U and Y need the red, blue or gold key. */
  var DOOR_CHARS = { 'D': 0, 'R': 1, 'U': 2, 'Y': 3 };
  var KEY_CHARS = { 'r': 1, 'u': 2, 'y': 3 };
  var KEY_NAMES = ['', 'red', 'blue', 'gold'];
  var KEY_SHAPES = ['', 'circle', 'square', 'triangle'];

  /* Sprite picture numbers */
  var S_STAR = 0, S_KEY1 = 1, S_KEY2 = 2, S_KEY3 = 3, S_DISK = 4, S_DISK_ON = 5, S_PLANT = 6, S_LAMP = 7, S_GLOBE = 8,
    S_DESK = 9, S_BOT_F = 10, S_BOT_S = 13, S_BOT_B = 16, S_ALERT = 17;
  /* Decorations: [sprite, size as a fraction of a wall's height, height above the floor, blocks the way?] */
  var DECOR = { 'p': [S_PLANT, 0.72, 0, true], 'l': [S_LAMP, 0.45, 0.55, false], 'g': [S_GLOBE, 0.72, 0, true], 'c': [S_DESK, 0.78, 0, true] };

  /* ---------- a tiny 5 by 7 pixel font, like the letters on a 1990s screen ----------
     Each letter is 7 rows of 5 dots: 1 means the dot is lit. */
  var FONT_ROWS = {
    'A': '01110 10001 10001 11111 10001 10001 10001', 'B': '11110 10001 10001 11110 10001 10001 11110',
    'C': '01110 10001 10000 10000 10000 10001 01110', 'D': '11100 10010 10001 10001 10001 10010 11100',
    'E': '11111 10000 10000 11110 10000 10000 11111', 'F': '11111 10000 10000 11110 10000 10000 10000',
    'G': '01110 10001 10000 10111 10001 10001 01111', 'H': '10001 10001 10001 11111 10001 10001 10001',
    'I': '01110 00100 00100 00100 00100 00100 01110', 'J': '00111 00010 00010 00010 00010 10010 01100',
    'K': '10001 10010 10100 11000 10100 10010 10001', 'L': '10000 10000 10000 10000 10000 10000 11111',
    'M': '10001 11011 10101 10101 10001 10001 10001', 'N': '10001 10001 11001 10101 10011 10001 10001',
    'O': '01110 10001 10001 10001 10001 10001 01110', 'P': '11110 10001 10001 11110 10000 10000 10000',
    'Q': '01110 10001 10001 10001 10101 10010 01101', 'R': '11110 10001 10001 11110 10100 10010 10001',
    'S': '01111 10000 10000 01110 00001 00001 11110', 'T': '11111 00100 00100 00100 00100 00100 00100',
    'U': '10001 10001 10001 10001 10001 10001 01110', 'V': '10001 10001 10001 10001 10001 01010 00100',
    'W': '10001 10001 10001 10101 10101 10101 01010', 'X': '10001 10001 01010 00100 01010 10001 10001',
    'Y': '10001 10001 10001 01010 00100 00100 00100', 'Z': '11111 00001 00010 00100 01000 10000 11111',
    '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110',
    '2': '01110 10001 00001 00010 00100 01000 11111', '3': '11111 00010 00100 00010 00001 10001 01110',
    '4': '00010 00110 01010 10010 11111 00010 00010', '5': '11111 10000 11110 00001 00001 10001 01110',
    '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000',
    '8': '01110 10001 10001 01110 10001 10001 01110', '9': '01110 10001 10001 01111 00001 00010 01100',
    '!': '00100 00100 00100 00100 00100 00000 00100', '?': '01110 10001 00001 00010 00100 00000 00100',
    '.': '00000 00000 00000 00000 00000 01100 01100', ',': '00000 00000 00000 00000 01100 00100 01000',
    ':': '00000 01100 01100 00000 01100 01100 00000', '/': '00000 00001 00010 00100 01000 10000 00000',
    '-': '00000 00000 00000 11111 00000 00000 00000', '\'': '01100 00100 01000 00000 00000 00000 00000',
    '+': '00000 00100 00100 11111 00100 00100 00000', '(': '00010 00100 01000 01000 01000 00100 00010',
    ')': '01000 00100 00010 00010 00010 00100 01000', ' ': '00000 00000 00000 00000 00000 00000 00000'
  };
  /* Turn each letter into 7 numbers, one per row, whose binary bits are the dots (16 = leftmost dot). */
  var GLYPHS = {};
  Object.keys(FONT_ROWS).forEach(function (ch) {
    GLYPHS[ch] = FONT_ROWS[ch].split(' ').map(function (row) { return parseInt(row, 2); });
  });

  /* ---------- small helpers ---------- */
  /* A seeded random number maker: the same seed always gives the same "random" numbers, so the pictures are the same
     every time the game loads. */
  function seeded(seed) {
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  /* One pixel colour packed into a single number, the way the screen memory stores it (alpha, blue, green, red). */
  function pack(r, g, b) { return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; }
  function hex(s) { var n = parseInt(s.slice(1), 16); return pack(n >> 16 & 255, n >> 8 & 255, n & 255); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
  function fmtTime(s) { s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }

  /* ---------- the levels ----------
     Each level is a map drawn with letters, seen from above. One letter is one square of the maze.
       Walls:  # brick   T tiles   W wood panels   S stone   B bookshelf   C computers   P picture   M 1990s wallpaper
               X metal   N panels  E the exit lift (walk up to it and press Use)
       ?       a secret wall: it looks like the wall next to it, with cracks. Press Use and it slides back.
       Doors:  D anyone can open   R needs the red key   U needs the blue key   Y needs the gold key
       Keys:   r red   u blue   y gold          * a star          ! a checkpoint disk          @ where you start
       Things: p plant   l ceiling lamp   g globe   c desk with a computer          . empty floor
     robots: each caretaker robot walks from point to point (x across, y down) and loops back to the start.
     eyes: how far the robots see (squares), how wide (degrees either side), how long they take to notice you (seconds)
     and how fast they roll (squares a second). */
  var LEVELS = [
    {
      name: 'Front Hall', floor: 'carpet', ceil: 'tiles', angle: -35, tip: 'TIP: CRACKED WALLS HIDE SECRETS',
      eyes: { range: 5, cone: 26, notice: 1.0, speed: 1.0 },
      robots: [{ path: [[7, 3], [22, 3]] }],
      map: [
        '########################',
        '#*...*#..*.....*.....*.#',
        '#.....D................#',
        '#..l..#..l.....l.....l.#',
        '#.@...#................#',
        '#p...p####D#####R#######',
        '##?####!..*.#..........#',
        '#.....#.....#....l....p#',
        '#..*..#..l..#..........E',
        '#.*.*.#.....#..*....*..#',
        '#.....#....r#.....g...p#',
        '########################'
      ]
    },
    {
      name: 'The Library', floor: 'boards', ceil: 'tiles', angle: -90, tip: 'TWO KEYS TO FIND THIS TIME',
      eyes: { range: 5.5, cone: 28, notice: 0.85, speed: 1.15 },
      robots: [
        { path: [[14, 6], [20, 6], [20, 14], [14, 14]] },
        { path: [[8, 1], [8, 11]] }
      ],
      map: [
        'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
        'W....*.W...*.........W!...*W',
        'W.u....W.............W...r.W',
        'W!.....W......l......D.....W',
        'W..l...W.BBBBB.BBBBB.W.g...W',
        'W......R.............Wc...cW',
        'W*.....W.........*...WWW?WWW',
        'W.....pW.............W*....W',
        'WWW?WWWW.BBBBB.BBBBB.W....*W',
        'W*.....W.*...........WWWWWWW',
        'W....*.W......l......W.....W',
        'W.....*W.............W.....W',
        'WWWWWWWW.BBBBB.BBBBB.W.....W',
        'W......W.............W.....W',
        'W..l...W..........*..U.....E',
        'W......D.............W..*..W',
        'W.@....W.BBBBB.BBBBB.Wp...pW',
        'Wc....cW.............W.....W',
        'W..*...W....*........W*...*W',
        'WWWWWWWWWWWWWWWWWWWWWWWWWWWW'
      ]
    },
    {
      name: 'The Computer Lab', floor: 'lino', ceil: 'tiles', angle: 0, tip: 'THE LIFT IS INSIDE THE LAB',
      eyes: { range: 6, cone: 30, notice: 0.7, speed: 1.3 },
      robots: [
        { path: [[8, 6], [8, 15], [21, 15], [21, 6]] },
        { path: [[25, 7], [28, 7], [28, 11], [25, 11]] },
        { path: [[10, 17], [19, 17], [19, 20], [10, 20]] }
      ],
      map: [
        'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNN',
        'T*....*T.*.....cr.N*.*M*...*pM',
        'T...l..T....l.....?...M......M',
        'T...*..T.....*.g..N...M......M',
        'T......T.c..!.....N..*M.....*M',
        'TTTDTTTTNNDNNNNNNNNNNNMMM?MMMM',
        'T......T........*.....M......M',
        'T.y..!.T.CCPCCYCCPCCC.M......M',
        'T......T*C*........*C.M......M',
        'T......T.C..c...c...C.M....*.M',
        'T...l..U.P....l.....P.R...l..M',
        'T......T.C..c...c...C.M......M',
        'T*.....T.C*........*C.M......M',
        'T.....cT.CCCCCECCCCCC*M......M',
        'T....*.T.CCCCCCCCCCCC.M......M',
        'Tp.....T..............M!....uM',
        'TTTTTTTTNNNNNNDNNNNNNNMMMMMMMM',
        'T....*.T..............M.....*M',
        'T..l...D...l......l...D......M',
        'T.@....T....*....*....M..*l..M',
        'Tc....pT.............*Mp....*M',
        'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNN'
      ]
    },
    {
      name: 'The Basement', floor: 'concrete', ceil: 'dark', angle: 0, tip: 'FIVE ROBOTS. USE THE MAP!',
      eyes: { range: 6.5, cone: 30, notice: 0.6, speed: 1.4 },
      robots: [
        { path: [[8, 15], [15, 15], [15, 22], [8, 22]] },
        { path: [[15, 8], [22, 8], [22, 15], [15, 15]] },
        { path: [[1, 1], [29, 1]] },
        { path: [[29, 1], [29, 22]] },
        { path: [[1, 8], [8, 8], [8, 15], [1, 15]] }
      ],
      map: [
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'X.............................X',
        'X.SSSSSS.XXXXXX.######.SSSSSS.X',
        'X.Su...S.X*..*X.#*..*#.S*..yS.X',
        'X.S..c.R.X....X*#.l..#.S....S.X',
        'X.S....S.?....X.#....#.S..c.S.X',
        'X.S*..*S.X*..*X.#...!#.S....S.X',
        'X.SSSSSS.XXXXXX.##D###.SSUSSS.X',
        'X.............................X',
        'X.SSSSSS.NNNNNN.##?###.SSSSSS.X',
        'X.S...*S.N..E.N.#*..*#.S*..!S.X',
        'X.D..l.S.Np...N.#....#.S....S*X',
        'X.S....S.N....N.#....#.S.l..D.X',
        'X.S!..*S.N*..*N.#*..*#.S*...S.X',
        'X.SSSSSS.NNNYNN.######.SSSSSS.X',
        'X.............................X',
        'X.SSSSSS.XXDXXX.######.SS?SSS.X',
        'X.S*..pS.X...*X.#r..p#.S*..*S.X',
        'X.S....D.X....X.#..l.#.S....S.X',
        'X.S.@..S.X..l.X.#....D.S....S.X',
        'X.S..l.S.X*..pX.#...*#.S*..*S.X',
        'X.SSSSSS.XXXXXX.######.SSSSSS.X',
        'X....*........................X',
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
      ]
    }
  ];

  /* ---------- the art: every picture is painted by code into a 64 by 64 canvas, then read back as pixels ---------- */
  var FOG = [5, 12, 15];   /* the colour far things fade into */
  function makeArt() {
    var cv = document.createElement('canvas');
    cv.width = TEX; cv.height = TEX;
    var g = cv.getContext('2d', { willReadFrequently: true });
    var rnd = seeded(1);
    function rgbs(c, k) { k = k == null ? 1 : k; return 'rgb(' + clamp(Math.round(c[0] * k), 0, 255) + ',' + clamp(Math.round(c[1] * k), 0, 255) + ',' + clamp(Math.round(c[2] * k), 0, 255) + ')'; }
    function rect(x, y, w, h, c) { g.fillStyle = typeof c === 'string' ? c : rgbs(c); g.fillRect(x, y, w, h); }
    function disc(x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    function poly(pts, fill, stroke, lw) {
      g.beginPath(); g.moveTo(pts[0], pts[1]);
      for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
      g.closePath();
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.lineJoin = 'round'; g.stroke(); }
      if (fill) { g.fillStyle = fill; g.fill(); }
    }
    /* Letters in the pixel font, painted dot by dot. */
    function ptext(str, x, y, c) {
      g.fillStyle = c;
      for (var i = 0; i < str.length; i++) {
        var gl = GLYPHS[str.charAt(i)] || GLYPHS[' '];
        for (var r = 0; r < 7; r++) for (var b = 0; b < 5; b++) if (gl[r] & (16 >> b)) g.fillRect(x + i * 6 + b, y + r, 1, 1);
      }
    }
    /* Read the canvas back as pixels, sprinkle a little grit (noise) for that hand-drawn 1992 feel, and make every
       pixel either fully solid or fully see-through (a sprite's see-through pixels are skipped when it is drawn). */
    function grab(noise) {
      var img = g.getImageData(0, 0, TEX, TEX), d = img.data;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; continue; }
        var n = noise ? (rnd() - 0.5) * noise : 0;
        d[i] = clamp(d[i] + n, 0, 255); d[i + 1] = clamp(d[i + 1] + n, 0, 255); d[i + 2] = clamp(d[i + 2] + n, 0, 255); d[i + 3] = 255;
      }
      return new Uint32Array(d.buffer);
    }

    /* --- walls --- */
    var paint = {};
    paint[T_BRICK] = function () {
      rect(0, 0, 64, 64, '#5d554c');
      for (var row = 0; row < 8; row++) {
        var y = row * 8, off = row % 2 ? 8 : 0;
        for (var bx = off - 16; bx < 64; bx += 16) {
          var k = 0.82 + rnd() * 0.3, c = [150, 62, 44];
          rect(bx + 1, y + 1, 15, 7, rgbs(c, k)); rect(bx + 1, y + 1, 15, 1, rgbs(c, k * 1.2)); rect(bx + 1, y + 7, 15, 1, rgbs(c, k * 0.72));
        }
      }
      return 16;
    };
    paint[T_TILE] = function () {
      rect(0, 0, 64, 64, '#c4d0d6');
      for (var j = 0; j < 4; j++) for (var i = 0; i < 4; i++) {
        var k = 0.9 + rnd() * 0.18, c = j === 2 ? [214, 64, 140] : [46, 108, 176];
        rect(i * 16 + 1, j * 16 + 1, 15, 15, rgbs(c, k));
        rect(i * 16 + 2, j * 16 + 2, 9, 2, rgbs(c, k * 1.6)); rect(i * 16 + 2, j * 16 + 2, 2, 7, rgbs(c, k * 1.45));
      }
      return 8;
    };
    paint[T_WOOD] = function () {
      rect(0, 0, 64, 64, '#3b2414');
      for (var p = 0; p < 4; p++) {
        var x = p * 16, k = 0.88 + rnd() * 0.22, c = [138, 90, 50];
        rect(x + 1, 0, 14, 64, rgbs(c, k));
        for (var line = 0; line < 4; line++) {
          var gx = x + 2 + Math.floor(rnd() * 11), ph = rnd() * 6;
          for (var y = 0; y < 64; y++) rect(gx + Math.round(Math.sin(y * 0.18 + ph)), y, 1, 1, rgbs(c, k * 0.72));
        }
      }
      rect(0, 38, 64, 4, '#a8743f'); rect(0, 38, 64, 1, '#d29b5c'); rect(0, 41, 64, 1, '#5a381c');
      return 10;
    };
    paint[T_STONE] = function () {
      rect(0, 0, 64, 64, '#2f3236');
      for (var row = 0; row < 4; row++) {
        var y = row * 16, x = row % 2 ? -11 : 0;
        while (x < 64) {
          var w = 14 + Math.floor(rnd() * 14), k = 0.78 + rnd() * 0.34, c = [112, 117, 122];
          rect(x + 1, y + 1, w - 1, 15, rgbs(c, k)); rect(x + 1, y + 1, w - 1, 1, rgbs(c, k * 1.25)); rect(x + 1, y + 1, 1, 15, rgbs(c, k * 1.15));
          x += w;
        }
      }
      return 24;
    };
    paint[T_BOOKS] = function () {
      var cols = [[178, 40, 48], [40, 120, 70], [36, 58, 130], [204, 160, 40], [120, 60, 150], [30, 140, 140], [210, 110, 40], [230, 220, 200]];
      rect(0, 0, 64, 64, '#2a170b');
      for (var s = 0; s < 3; s++) {
        var y0 = 2 + s * 21, x = 3;
        while (x < 61) {
          var w = Math.min(3 + Math.floor(rnd() * 4), 61 - x), hh = 11 + Math.floor(rnd() * 7), c = cols[Math.floor(rnd() * cols.length)];
          rect(x, y0 + 19 - hh, w, hh, rgbs(c)); rect(x, y0 + 19 - hh, 1, hh, rgbs(c, 1.3));
          rect(x, y0 + 21 - hh, w, 1, rgbs(c, 0.6)); if (w > 3) rect(x + 1, y0 + 24 - hh, w - 2, 1, '#e8c860');
          x += w + (rnd() < 0.12 ? 2 : 0);
        }
        rect(0, y0 + 19, 64, 2, '#8a5630'); rect(0, y0 + 19, 64, 1, '#b07040');
      }
      rect(0, 0, 3, 64, '#8a5630'); rect(61, 0, 3, 64, '#6a4020'); rect(0, 0, 64, 2, '#8a5630');
      return 6;
    };
    paint[T_COMPUTER] = function () {
      rect(0, 0, 64, 64, '#17565b'); rect(0, 0, 64, 2, '#0d3438');
      rect(0, 44, 64, 4, '#c9b99a'); rect(0, 44, 64, 1, '#e6d8b8'); rect(0, 48, 64, 16, '#123f43');
      for (var m = 0; m < 2; m++) {
        var mx = 4 + m * 30;
        rect(mx, 13, 26, 24, '#d8cfb8'); rect(mx, 13, 26, 1, '#f2ead6'); rect(mx + 25, 13, 1, 24, '#a89f88');
        rect(mx + 3, 16, 20, 15, '#08140e');
        for (var l = 0; l < 4; l++) rect(mx + 5, 18 + l * 3, 4 + Math.floor(rnd() * 13), 1, '#39ff7a');
        rect(mx + 5, 30, 3, 1, '#39ff7a');
        rect(mx + 9, 37, 8, 7, '#bfb59c'); rect(mx + 20, 33, 2, 1, '#ff3d9a');
      }
      return 6;
    };
    function memphis(seed) {
      var r2 = seeded(seed);
      rect(0, 0, 64, 64, '#0f6f69');
      for (var i = 0; i < 6; i++) {
        var x = r2() * 56, y = r2() * 56;
        g.strokeStyle = '#ff3d9a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y);
        for (var k = 1; k < 5; k++) g.lineTo(x + k * 3, y + (k % 2 ? -3 : 0));
        g.stroke();
      }
      for (i = 0; i < 5; i++) { var tx = r2() * 54, ty = r2() * 54; poly([tx, ty + 8, tx + 5, ty, tx + 10, ty + 8], '#ffd23f'); }
      for (i = 0; i < 8; i++) disc(r2() * 64, r2() * 64, 2, '#8b5cf6');
      for (i = 0; i < 10; i++) rect(Math.floor(r2() * 62), Math.floor(r2() * 62), 3, 1, '#04201d');
    }
    paint[T_MEMPHIS] = function () { memphis(7); return 6; };
    paint[T_POSTER] = function () {
      memphis(11);
      rect(10, 8, 44, 36, '#ffd23f'); rect(10, 8, 44, 1, '#fff0a0'); rect(12, 10, 40, 32, '#2a1a52');
      var sky = g.createLinearGradient(0, 10, 0, 42); sky.addColorStop(0, '#3b1f78'); sky.addColorStop(0.7, '#ff3d9a'); sky.addColorStop(1, '#ffb347');
      g.fillStyle = sky; g.fillRect(12, 10, 40, 32);
      disc(32, 30, 8, '#ffd23f');
      for (var s = 0; s < 4; s++) rect(24, 27 + s * 3, 16, 1, '#ff3d9a');
      poly([12, 42, 12, 34, 22, 30, 32, 36, 42, 29, 52, 35, 52, 42], '#1fc8b9');
      poly([12, 42, 20, 37, 30, 40, 40, 36, 52, 41, 52, 42], '#0d6e66');
      return 4;
    };
    paint[T_LIFT] = function () {
      rect(0, 0, 64, 64, '#3d4650'); rect(0, 0, 64, 1, '#5c6874');
      for (var x = 6; x < 58; x++) rect(x, 15, 1, 49, (x % 3) ? '#97a1ab' : '#7f8a95');
      rect(31, 15, 2, 49, '#2a3038'); rect(5, 14, 54, 1, '#20262e'); rect(5, 14, 1, 50, '#20262e'); rect(58, 14, 1, 50, '#20262e');
      rect(14, 3, 36, 10, '#06120c'); ptext('EXIT', 20, 4, '#39ff7a');
      poly([9, 12, 12, 5, 15, 12], '#ffd23f'); poly([49, 12, 52, 5, 55, 12], '#ffd23f');
      rect(25, 34, 4, 4, '#ffd23f'); rect(35, 34, 4, 4, '#ffd23f');
      return 4;
    };
    paint[T_JAMB] = function () {
      rect(0, 0, 64, 64, '#4a5560');
      for (var y = 0; y < 64; y += 8) { rect(0, y, 64, 1, '#5d6a77'); rect(0, y + 7, 64, 1, '#38414b'); }
      rect(28, 0, 8, 64, '#3a434d'); rect(29, 0, 1, 64, '#2a3038');
      return 8;
    };
    function doorBase() {
      rect(0, 0, 64, 64, '#56677a');
      for (var y = 4; y < 64; y += 10) { rect(2, y, 60, 1, '#7a8da2'); rect(2, y + 1, 60, 1, '#3a4756'); }
      rect(0, 0, 64, 2, '#2a333d'); rect(0, 62, 64, 2, '#2a333d'); rect(0, 0, 2, 64, '#2a333d'); rect(62, 0, 2, 64, '#2a333d');
      rect(54, 24, 4, 16, '#1c2229'); rect(55, 25, 2, 14, '#8fa2b6');
    }
    paint[T_DOOR] = function () { doorBase(); return 8; };
    function keyDoor(fill, dark, shape, word) {
      doorBase();
      rect(0, 16, 64, 30, fill); rect(0, 16, 64, 2, dark); rect(0, 44, 64, 2, dark);
      rect(23, 18, 18, 16, '#f6f2e8');
      symbol(shape, 32, 26, 6, dark);
      ptext(word, 32 - word.length * 3, 36, '#f6f2e8');
    }
    function symbol(shape, cx, cy, r, c) {
      if (shape === 'circle') disc(cx, cy, r, c);
      else if (shape === 'square') rect(cx - r, cy - r, r * 2, r * 2, c);
      else poly([cx, cy - r - 1, cx + r + 1, cy + r, cx - r - 1, cy + r], c);
    }
    paint[T_DOOR_R] = function () { keyDoor('#d8343f', '#6e1016', 'circle', 'RED'); return 6; };
    paint[T_DOOR_U] = function () { keyDoor('#2f6fe0', '#0f2a66', 'square', 'BLUE'); return 6; };
    paint[T_DOOR_Y] = function () { keyDoor('#e8b420', '#6a4c00', 'triangle', 'GOLD'); return 6; };
    paint[T_METAL] = function () {
      rect(0, 0, 64, 64, '#2b3036');
      for (var j = 0; j < 2; j++) for (var i = 0; i < 2; i++) {
        var k = 0.9 + rnd() * 0.2;
        rect(i * 32 + 1, j * 26 + 1, 30, 24, rgbs([84, 92, 102], k)); rect(i * 32 + 1, j * 26 + 1, 30, 1, rgbs([84, 92, 102], k * 1.35));
        rect(i * 32 + 3, j * 26 + 3, 2, 2, '#a6b0ba'); rect(i * 32 + 27, j * 26 + 3, 2, 2, '#a6b0ba'); rect(i * 32 + 3, j * 26 + 21, 2, 2, '#a6b0ba'); rect(i * 32 + 27, j * 26 + 21, 2, 2, '#a6b0ba');
      }
      for (var x = -10; x < 64; x += 8) poly([x, 64, x + 4, 54, x + 8, 54, x + 4, 64], '#ffd23f');
      rect(0, 53, 64, 1, '#111');
      return 12;
    };
    paint[T_PANEL] = function () {
      rect(0, 0, 64, 64, '#d9d2c3');
      for (var x = 0; x < 64; x += 16) rect(x, 0, 1, 50, '#b9b1a0');
      rect(0, 28, 64, 3, '#1fc8b9'); rect(0, 32, 64, 2, '#ff3d9a'); rect(0, 50, 64, 14, '#5b3fa8'); rect(0, 50, 64, 1, '#8b6fe0');
      return 8;
    };
    /* Cracks for a secret wall: the same picture, with a few dark zig-zags. Sharp eyes will spot them. */
    function cracks() {
      var r2 = seeded(99);
      g.strokeStyle = '#140c08'; g.lineWidth = 1;
      for (var i = 0; i < 3; i++) {
        var x = 10 + r2() * 44, y = 6 + r2() * 20;
        g.beginPath(); g.moveTo(x, y);
        for (var k = 0; k < 6; k++) { x += (r2() - 0.5) * 9; y += 3 + r2() * 5; g.lineTo(Math.round(x) + 0.5, Math.round(y) + 0.5); }
        g.stroke();
      }
    }

    var walls = [], avg = [];
    Object.keys(paint).forEach(function (id) {
      id = +id;
      g.clearRect(0, 0, TEX, TEX); rnd = seeded(id * 101);
      var noise = paint[id]();
      var px = grab(noise);
      walls[id] = shadeAll(px, true);
      avg[id] = average(px);
      if (id !== T_LIFT && id !== T_JAMB && id < T_DOOR || id === T_MEMPHIS || id === T_METAL || id === T_PANEL) {
        g.clearRect(0, 0, TEX, TEX); rnd = seeded(id * 101);
        paint[id](); cracks();
        walls[id + CRACK] = shadeAll(grab(noise), true);
        avg[id + CRACK] = avg[id];
      }
    });

    /* --- floors and ceilings (stored row by row, because the floor is drawn row by row) --- */
    var floors = {};
    function floorTex(name, fn) { g.clearRect(0, 0, TEX, TEX); rnd = seeded(name.length * 31 + name.charCodeAt(0)); var noise = fn(); var px = grab(noise); floors[name] = shadeAll(px, false); avg[name] = average(px); }
    floorTex('carpet', function () {
      rect(0, 0, 64, 64, '#3a1f5c');
      var cs = ['#1fc8b9', '#ffd23f', '#ff3d9a', '#8b5cf6'];
      for (var i = 0; i < 70; i++) rect(Math.floor(rnd() * 62), Math.floor(rnd() * 62), 2 + (i % 2), 1 + ((i >> 1) % 2), cs[i % 4]);
      return 14;
    });
    floorTex('boards', function () {
      rect(0, 0, 64, 64, '#3a2412');
      for (var j = 0; j < 4; j++) {
        var k = 0.85 + rnd() * 0.25, c = [128, 84, 46];
        rect(0, j * 16 + 1, 64, 15, rgbs(c, k));
        for (var l = 0; l < 3; l++) rect(0, j * 16 + 3 + Math.floor(rnd() * 11), 64, 1, rgbs(c, k * 0.8));
        rect((j * 23 + 9) % 64, j * 16, 1, 16, '#2a180a');
      }
      return 10;
    });
    floorTex('lino', function () { rect(0, 0, 64, 64, '#2a8f88'); rect(0, 0, 32, 32, '#e3dcc6'); rect(32, 32, 32, 32, '#e3dcc6'); return 10; });
    floorTex('concrete', function () {
      rect(0, 0, 64, 64, '#5b5f63');
      for (var i = 0; i < 90; i++) rect(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 1, 1, rnd() < 0.5 ? '#45484c' : '#72767a');
      rect(0, 0, 64, 1, '#43464a'); rect(0, 0, 1, 64, '#43464a');
      return 24;
    });
    floorTex('tiles', function () {
      rect(0, 0, 64, 64, '#cfcabd');
      for (var i = 0; i < 70; i++) rect(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 1, 1, '#a39d90');
      rect(0, 0, 64, 2, '#8f8a80'); rect(0, 0, 2, 64, '#8f8a80');
      return 6;
    });
    floorTex('light', function () {
      rect(0, 0, 64, 64, '#cfcabd'); rect(0, 0, 64, 2, '#8f8a80'); rect(0, 0, 2, 64, '#8f8a80');
      rect(8, 8, 48, 48, '#fff4c8'); rect(8, 8, 48, 2, '#fffbe8');
      for (var k = 1; k < 4; k++) rect(8 + k * 12, 8, 1, 48, '#eadba0');
      return 2;
    });
    floorTex('dark', function () {
      rect(0, 0, 64, 64, '#34373c');
      rect(0, 0, 64, 1, '#24272b'); rect(0, 0, 1, 64, '#24272b');
      rect(0, 26, 64, 9, '#7a4f2a'); rect(0, 26, 64, 2, '#a8703e'); rect(0, 34, 64, 1, '#4a2e16'); rect(20, 25, 4, 11, '#5a3a1e');
      return 16;
    });
    floorTex('cage', function () {
      rect(0, 0, 64, 64, '#34373c'); rect(0, 0, 64, 1, '#24272b'); rect(0, 0, 1, 64, '#24272b');
      disc(32, 32, 14, '#5a4a20'); disc(32, 32, 11, '#fff3b0'); disc(32, 32, 6, '#ffffff');
      g.strokeStyle = '#2a2a2a'; g.lineWidth = 2;
      for (var k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(32 + k * 7, 18); g.lineTo(32 + k * 7, 46); g.stroke(); }
      return 6;
    });

    /* --- sprites: flat pictures that always face you --- */
    var sprites = [];
    function sprite(id, fn, noise) { g.clearRect(0, 0, TEX, TEX); rnd = seeded(500 + id); fn(); sprites[id] = shadeAll(grab(noise || 0), true); }
    sprite(S_STAR, function () {
      var a = [], b = [];
      for (var i = 0; i < 10; i++) {
        var ang = -Math.PI / 2 + i * Math.PI / 5;
        a.push(32 + Math.cos(ang) * (i % 2 ? 11 : 27), 34 + Math.sin(ang) * (i % 2 ? 11 : 27));
        b.push(32 + Math.cos(ang) * (i % 2 ? 5 : 13), 33 + Math.sin(ang) * (i % 2 ? 5 : 13));
      }
      poly(a, '#ffc61a', '#7a4a00', 4); poly(b, '#fff1a0'); rect(28, 24, 3, 3, '#ffffff');
    });
    function keySprite(fill, dark, shape) {
      poly([24, 29, 57, 29, 57, 35, 53, 35, 53, 42, 48, 42, 48, 35, 43, 35, 43, 40, 38, 40, 38, 35, 24, 35], fill, dark, 3);
      if (shape === 'circle') { g.beginPath(); g.arc(17, 32, 12, 0, Math.PI * 2); g.strokeStyle = dark; g.lineWidth = 3; g.stroke(); g.fillStyle = fill; g.fill(); }
      else if (shape === 'square') poly([5, 20, 29, 20, 29, 44, 5, 44], fill, dark, 3);
      else poly([17, 16, 31, 44, 3, 44], fill, dark, 3);
      disc(17, shape === 'triangle' ? 36 : 32, 4, dark);
      rect(9, 25, 4, 2, '#ffffff'); rect(30, 30, 18, 1, '#ffffff');
    }
    sprite(S_KEY1, function () { keySprite('#ff4757', '#5e0b12', 'circle'); });
    sprite(S_KEY2, function () { keySprite('#3d7bff', '#0c2260', 'square'); });
    sprite(S_KEY3, function () { keySprite('#ffc61a', '#6a4c00', 'triangle'); });
    function disk(body, tick) {
      poly([12, 12, 46, 12, 52, 18, 52, 52, 12, 52], body, '#10141c', 2);
      rect(22, 12, 20, 13, '#c9d1d8'); rect(34, 14, 5, 9, '#3a4250');
      rect(17, 31, 30, 19, '#f2efe6'); rect(20, 35, 24, 1, '#9aa4ae'); rect(20, 39, 24, 1, '#9aa4ae'); rect(20, 43, 18, 1, '#9aa4ae');
      if (tick) { g.strokeStyle = '#0d7a3a'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(23, 40); g.lineTo(29, 46); g.lineTo(41, 33); g.stroke(); }
    }
    sprite(S_DISK, function () { disk('#2b3f73', false); });
    sprite(S_DISK_ON, function () { disk('#1f9e57', true); });
    sprite(S_PLANT, function () {
      for (var i = 0; i < 9; i++) {
        g.save(); g.translate(32, 44); g.rotate(-Math.PI / 2 + (i - 4) * 0.32);
        g.fillStyle = i % 2 ? '#2f9e4f' : '#45c868'; g.beginPath(); g.ellipse(15, 0, 16, 4.5, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      poly([20, 44, 44, 44, 40, 63, 24, 63], '#c0622f', '#6a3010', 2); rect(18, 42, 28, 5, '#d9763c');
    }, 8);
    sprite(S_LAMP, function () {
      rect(31, 0, 2, 22, '#20242a');
      g.beginPath(); g.moveTo(14, 36); g.quadraticCurveTo(32, 8, 50, 36); g.closePath();
      g.fillStyle = '#1fc8b9'; g.fill(); g.strokeStyle = '#0d6e66'; g.lineWidth = 2; g.stroke();
      rect(14, 35, 36, 3, '#0d6e66'); disc(32, 41, 6, '#fff6c0'); rect(30, 39, 2, 2, '#ffffff');
    });
    sprite(S_GLOBE, function () {
      rect(22, 58, 20, 5, '#5a3a20'); rect(30, 46, 4, 12, '#7a5230');
      g.strokeStyle = '#c9a040'; g.lineWidth = 3; g.beginPath(); g.arc(32, 30, 19, Math.PI * 0.55, Math.PI * 1.95); g.stroke();
      disc(32, 30, 16, '#2f6fb3');
      g.fillStyle = '#3fae5a';
      g.beginPath(); g.ellipse(26, 24, 7, 4, 0.5, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(38, 34, 5, 7, 0.2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(28, 38, 4, 3, 0, 0, Math.PI * 2); g.fill();
      rect(23, 20, 4, 3, '#a8d4ff');
    }, 6);
    sprite(S_DESK, function () {
      rect(4, 40, 56, 5, '#8a5a32'); rect(4, 40, 56, 1, '#b07a48'); rect(6, 45, 4, 19, '#5a3a20'); rect(54, 45, 4, 19, '#5a3a20');
      rect(38, 45, 14, 12, '#7a4a26'); rect(43, 50, 4, 1, '#d8b070');
      rect(16, 9, 32, 27, '#d8cfb8'); rect(16, 9, 32, 1, '#f2ead6'); rect(47, 9, 1, 27, '#a89f88');
      rect(19, 12, 26, 19, '#0b6e6e'); rect(22, 15, 15, 11, '#c0c0c0'); rect(22, 15, 15, 2, '#2a2f9a'); rect(24, 19, 9, 1, '#555'); rect(24, 22, 6, 1, '#555');
      rect(40, 27, 3, 2, '#ffd23f'); rect(28, 36, 8, 3, '#bfb59c'); rect(14, 38, 28, 2, '#efe8d6');
    }, 6);
    var EYES = ['#39ff7a', '#ffd23f', '#ff3d9a'];
    function feathers(x, y) {
      var cs = ['#ff3d9a', '#ff8ac8', '#8b5cf6'];
      for (var i = 0; i < 8; i++) { g.fillStyle = cs[i % 3]; g.beginPath(); g.ellipse(x + Math.cos(i * 0.8) * 4, y + Math.sin(i * 1.7) * 4, 4, 2, i, 0, Math.PI * 2); g.fill(); }
    }
    /* The caretaker robot, seen from the front, the side or the back. Its eye glows green, then yellow when it
       notices something, then pink when it has spotted you. */
    function robot(view, eye) {
      rect(13, 57, 10, 7, '#15181d'); rect(41, 57, 10, 7, '#15181d'); rect(17, 53, 30, 5, '#3a404a');
      rect(16, 32, 32, 22, '#e8e1cf'); rect(16, 32, 32, 2, '#fffaf0'); rect(41, 32, 7, 22, '#c9c0aa');
      rect(16, 44, 32, 4, '#1fc8b9'); rect(16, 47, 32, 1, '#0d6e66');
      g.beginPath(); g.arc(32, 30, 15, Math.PI, 0); g.closePath(); g.fillStyle = '#cfd6dc'; g.fill();
      rect(17, 28, 30, 4, '#aeb6be');
      rect(31, 6, 2, 10, '#8a929b'); disc(32, 6, 3, eye);
      if (view === 'front') {
        rect(19, 19, 26, 8, '#14181e');
        g.fillStyle = eye; g.beginPath(); g.ellipse(32, 23, 8, 2.7, 0, 0, Math.PI * 2); g.fill(); rect(28, 22, 2, 1, '#ffffff');
        rect(26, 36, 12, 4, '#14181e'); rect(27, 37, 2, 2, eye); rect(31, 37, 2, 2, eye); rect(35, 37, 2, 2, eye);
        rect(47, 38, 7, 3, '#8a929b'); rect(52, 17, 2, 23, '#8a5a32'); feathers(53, 13);
      } else if (view === 'side') {
        rect(30, 19, 17, 8, '#14181e');
        g.fillStyle = eye; g.beginPath(); g.ellipse(42, 23, 4, 2.5, 0, 0, Math.PI * 2); g.fill();
        rect(40, 38, 14, 3, '#8a929b'); rect(53, 17, 2, 23, '#8a5a32'); feathers(54, 13);
      } else {
        for (var v = 0; v < 3; v++) rect(22, 19 + v * 3, 20, 1, '#7d858d');
        rect(21, 35, 22, 7, '#d8d0bc'); rect(22, 36, 6, 1, '#9a927e');
        rect(10, 38, 7, 3, '#8a929b'); rect(10, 17, 2, 23, '#8a5a32'); feathers(11, 13);
      }
    }
    for (var e = 0; e < 3; e++) {
      (function (eye, n) {
        sprite(S_BOT_F + n, function () { robot('front', eye); }, 4);
        sprite(S_BOT_S + n, function () { robot('side', eye); }, 4);
      })(EYES[e], e);
    }
    sprite(S_BOT_B, function () { robot('back', EYES[0]); }, 4);
    sprite(S_ALERT, function () {
      poly([18, 6, 46, 6, 50, 10, 50, 38, 46, 42, 37, 42, 30, 52, 31, 42, 18, 42, 14, 38, 14, 10], '#fffbe8', '#14181e', 3);
      rect(29, 12, 6, 18, '#e8203a'); rect(29, 33, 6, 6, '#e8203a');
    });

    /* Make the 16 fog copies of a picture: copy 0 is full brightness, copy 15 has almost faded into the dark.
       colMajor stores the picture column by column, which is faster for walls and sprites (drawn as columns). */
    function shadeAll(px, colMajor) {
      var out = new Uint32Array(SHADES * TEX * TEX);
      for (var s = 0; s < SHADES; s++) {
        var k = 1 - (s / (SHADES - 1)) * 0.9, f0 = FOG[0] * (1 - k), f1 = FOG[1] * (1 - k), f2 = FOG[2] * (1 - k), base = s * TEX * TEX;
        for (var y = 0; y < TEX; y++) for (var x = 0; x < TEX; x++) {
          var c = px[y * TEX + x];
          if ((c >>> 24) === 0) continue;   /* left as 0: see-through */
          var r = ((c & 255) * k + f0) | 0, gg = (((c >> 8) & 255) * k + f1) | 0, b = (((c >> 16) & 255) * k + f2) | 0;
          out[base + (colMajor ? x * TEX + y : y * TEX + x)] = ((255 << 24) | (b << 16) | (gg << 8) | r) >>> 0;
        }
      }
      return out;
    }
    function average(px) {
      var r = 0, gg = 0, b = 0, n = 0;
      for (var i = 0; i < px.length; i++) { var c = px[i]; if ((c >>> 24) === 0) continue; r += c & 255; gg += (c >> 8) & 255; b += (c >> 16) & 255; n++; }
      n = n || 1;
      return pack((r / n) | 0, (gg / n) | 0, (b / n) | 0);
    }
    return { walls: walls, avg: avg, floors: floors, sprites: sprites };
  }

  /* ---------- the look of the beige 1990s monitor and keyboard keys around the game ---------- */
  var CSS = [
    '.game-labyrinth { color: var(--ink); }',
    '.game-labyrinth .lab-wrap { display: grid; justify-items: center; gap: 14px; }',
    '.game-labyrinth .lab-monitor { position: relative; max-width: 100%; padding: 18px 20px 34px; border-radius: 22px 22px 28px 28px; background: linear-gradient(180deg, #ebe3cd, #d3c9ae 68%, #bcb195); box-shadow: inset 0 2px 0 rgba(255, 255, 255, .65), inset 0 -4px 0 rgba(0, 0, 0, .16), 0 18px 40px rgba(0, 0, 0, .45); }',
    '.game-labyrinth .lab-monitor.is-small { padding: 8px 8px 24px; border-radius: 14px 14px 18px 18px; }',
    '.game-labyrinth .lab-screen { position: relative; background: #000; border-radius: 8px; overflow: hidden; box-shadow: 0 0 0 3px #4a4436, 0 0 0 5px #a39a80; }',
    '.game-labyrinth .lab-canvas { display: block; width: 100%; height: 100%; touch-action: auto; outline: none; }',
    '.game-labyrinth.is-running .lab-canvas { touch-action: none; }',
    '.game-labyrinth .lab-canvas:focus-visible { box-shadow: inset 0 0 0 3px var(--focus); }',
    '.game-labyrinth .lab-glass { position: absolute; inset: 0; pointer-events: none; border-radius: inherit; background: repeating-linear-gradient(rgba(0, 0, 0, .13) 0 1px, transparent 1px 3px), radial-gradient(130% 110% at 50% 45%, transparent 62%, rgba(0, 0, 0, .38)); }',
    '.game-labyrinth .lab-chin { position: absolute; left: 0; right: 0; bottom: 7px; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; font: 700 11px/1 var(--font-mono); letter-spacing: .2em; color: #6e6552; text-transform: uppercase; pointer-events: none; }',
    '.game-labyrinth .lab-monitor.is-small .lab-chin { bottom: 5px; padding: 0 12px; font-size: 9px; }',
    '.game-labyrinth .lab-led { width: 9px; height: 9px; border-radius: 50%; background: #4a4a3a; box-shadow: inset 0 1px 1px rgba(0, 0, 0, .5); }',
    '.game-labyrinth.is-running .lab-led { background: #39ff7a; box-shadow: 0 0 6px #39ff7a; }',
    '.game-labyrinth .lab-overlay { position: absolute; inset: 0; display: grid; justify-items: center; padding: 10px; background: rgba(4, 16, 18, .5); overflow: auto; }',
    '.game-labyrinth .lab-overlay[hidden] { display: none; }',
    '.game-labyrinth .lab-card { margin: auto 0; background: rgba(9, 34, 38, .95); border: 2px solid #1fc8b9; box-shadow: 5px 5px 0 #ff3d9a; border-radius: 6px; padding: .8rem 1.1rem .9rem; width: min(100%, 31rem); display: grid; gap: .55rem; justify-items: center; text-align: center; color: #f2fbf8; }',
    '.game-labyrinth .lab-title { font-family: var(--font-poster); font-weight: 400; font-size: clamp(1.45rem, 1rem + 2.2vw, 2.35rem); line-height: 1; margin: 0; color: #ffd23f; text-shadow: 3px 3px 0 #ff3d9a; letter-spacing: .05em; text-transform: uppercase; }',
    '.game-labyrinth .lab-msg { margin: 0; line-height: 1.35; font-weight: 600; max-width: 28rem; }',
    '.game-labyrinth .lab-sub { margin: 0; font-size: .92rem; color: #9fd3cc; line-height: 1.3; }',
    '.game-labyrinth .lab-sub:empty { display: none; }',
    '.game-labyrinth .lab-levels { display: flex; gap: .45rem; justify-content: center; flex-wrap: wrap; }',
    '.game-labyrinth .lab-level { width: 52px; height: 48px; border-radius: 6px; border: 2px solid rgba(242, 251, 248, .3); background: #10343a; color: #f2fbf8; font: 800 1.25rem/1 var(--font-head); display: grid; place-items: center; padding: 0; cursor: pointer; }',
    '.game-labyrinth .lab-level small { font-size: .62rem; font-weight: 700; color: #9fd3cc; letter-spacing: .04em; }',
    '.game-labyrinth .lab-level[aria-pressed="true"] { background: #ffd23f; border-color: #ffd23f; color: #04201d; box-shadow: 3px 3px 0 #ff3d9a; }',
    '.game-labyrinth .lab-level[aria-pressed="true"] small { color: #04201d; }',
    '.game-labyrinth .lab-level:disabled { opacity: .45; cursor: not-allowed; }',
    '.game-labyrinth .lab-row { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }',
    '.game-labyrinth .lab-big { min-height: 48px; font-size: 1.15rem; padding-inline: 1.6rem; }',
    '.game-labyrinth .lab-stats { display: grid; grid-template-columns: repeat(2, auto); gap: .2rem 1.2rem; margin: 0; font-weight: 700; }',
    '.game-labyrinth .lab-stats dt { color: #9fd3cc; font-weight: 600; text-align: right; }',
    '.game-labyrinth .lab-stats dd { margin: 0; text-align: left; color: #ffd23f; font-variant-numeric: tabular-nums; }',
    '.game-labyrinth .lab-pad { display: flex; gap: 14px 22px; justify-content: center; align-items: center; flex-wrap: wrap; user-select: none; -webkit-user-select: none; }',
    '.game-labyrinth .lab-cluster { display: grid; grid-template-columns: repeat(3, 58px); gap: 7px; }',
    '.game-labyrinth .lab-cluster.right { grid-template-columns: repeat(2, 66px); }',
    '.game-labyrinth .lab-key { min-height: 50px; min-width: 0; border-radius: 9px; border: 0; background: linear-gradient(#f3ecda, #d8ceb3); color: #2b2618; box-shadow: inset 0 -5px 0 #b3a888, 0 2px 0 #5d5543; font: 800 1.05rem/1 var(--font-head); display: grid; place-items: center; align-content: center; gap: 3px; touch-action: manipulation; padding: 3px 2px; cursor: pointer; -webkit-touch-callout: none; }',
    '.game-labyrinth .lab-key small { font-size: .6rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6b6250; }',
    '.game-labyrinth .lab-key.down { transform: translateY(2px); box-shadow: inset 0 -2px 0 #b3a888, 0 1px 0 #5d5543; background: linear-gradient(#ffe680, #ffd23f); }',
    '.game-labyrinth .lab-key.use { grid-column: span 2; background: linear-gradient(#ffe680, #f0bf2a); box-shadow: inset 0 -5px 0 #b8890a, 0 2px 0 #5d5543; }',
    '.game-labyrinth .lab-key.use small { color: #5a4300; }',
    '.game-labyrinth .lab-key:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }',
    '.game-labyrinth.is-running .lab-key { touch-action: none; }',
    '.game-labyrinth .lab-note { margin: 0; max-width: 60ch; text-align: center; }',
    '.game-labyrinth .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; clip-path: inset(50%); overflow: hidden; white-space: nowrap; }',
    '@media (max-width: 420px) { .game-labyrinth .lab-level { width: 46px; } .game-labyrinth .lab-cluster { grid-template-columns: repeat(3, 52px); gap: 6px; } .game-labyrinth .lab-cluster.right { grid-template-columns: repeat(2, 60px); gap: 6px; } .game-labyrinth .lab-pad { gap: 12px 14px; } .game-labyrinth .lab-card { padding: .55rem .6rem .65rem; gap: .4rem; box-shadow: 3px 3px 0 #ff3d9a; } .game-labyrinth .lab-msg { font-size: .9rem; } .game-labyrinth .lab-big { min-height: 44px; font-size: 1.05rem; } .game-labyrinth .lab-sub { font-size: .82rem; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'labyrinth',
    frame: 'none',
    levels: LEVELS,
    mount: function (root, api) {
      var h = api.h;
      var reduced = !!api.reducedMotion;
      var destroyed = false;
      var art = makeArt();
      root.appendChild(h('style', null, CSS));

      /* ---------- the page around the game: monitor, screen, keys ---------- */
      var canvas = h('canvas', { class: 'lab-canvas', role: 'img', tabindex: '0', 'aria-label': 'Labyrinth. A 3D maze seen through your own eyes. Press Start to explore.' });
      var overlay = h('div', { class: 'lab-overlay' });
      var screenEl = h('div', { class: 'lab-screen' }, canvas, h('div', { class: 'lab-glass', 'aria-hidden': 'true' }), overlay);
      var monitor = h('div', { class: 'lab-monitor' }, screenEl,
        h('div', { class: 'lab-chin', 'aria-hidden': 'true' }, h('span', null, 'Labyrinth 486'), h('span', { class: 'lab-led' })));
      var padKeys = {};
      function padKey(act, label, sub, aria, cls) {
        var b = h('button', { type: 'button', class: 'lab-key' + (cls ? ' ' + cls : ''), 'aria-label': aria, 'data-act': act },
          h('span', { 'aria-hidden': 'true' }, label), sub ? h('small', { 'aria-hidden': 'true' }, sub) : null);
        padKeys[act] = b;
        return b;
      }
      var pad = h('div', { class: 'lab-pad', role: 'group', 'aria-label': 'Controls' },
        h('div', { class: 'lab-cluster' },
          padKey('sl', '◁', 'step', 'Step left'), padKey('fwd', '▲', 'go', 'Walk forward'), padKey('sr', '▷', 'step', 'Step right'),
          padKey('tl', '◀', 'turn', 'Turn left'), padKey('back', '▼', 'back', 'Walk back'), padKey('tr', '▶', 'turn', 'Turn right')),
        h('div', { class: 'lab-cluster right' },
          padKey('use', 'USE', 'open', 'Use: open a door, push a wall, ride the lift', 'use'),
          padKey('map', 'MAP', '', 'Map on or off'), padKey('pause', 'II', 'pause', 'Pause')));
      var note = h('p', { class: 'game-note lab-note' }, 'Keyboard: arrows or W A S D to walk and turn, Q and E (or Shift with the arrows) to step sideways, Space or Enter to use, M for the map, P to pause. On a touch screen, hold the arrow keys under the screen, and tap the screen or USE to open doors.');
      root.appendChild(h('div', { class: 'lab-wrap' }, monitor, pad, note));

      var ctx = canvas.getContext('2d');
      var off = document.createElement('canvas');
      var octx = off.getContext('2d');
      var VW = 0, VH = 0, IH = 0, img = null, buf = null, zbuf = null, cssW = 0, cssH = 0, dpr = 1;
      var barDirty = true;

      /* The game is drawn small (VW by IH pixels) and stretched up with hard edges. Phones get a squarer view with
         slightly bigger pixels than laptops, and the whole screen always fits in the window. */
      function layout() {
        var avail = Math.max(220, Math.floor(root.clientWidth || 320));
        var small = avail < 520;
        monitor.classList.toggle('is-small', small);
        var w = avail - (small ? 16 : 40);
        var aspect = w < 500 ? 1.25 : w < 800 ? 1.6 : 1.9;
        var pxSize = w < 500 ? 1.7 : w < 800 ? 2.4 : 3;
        var nw = clamp(Math.round(w / pxSize), 160, 320);
        var nvh = Math.round(nw / aspect), nih = nvh + BAR_H;
        var classroom = document.documentElement.classList.contains('classroom');
        /* On a touch screen the keys under the monitor must fit on screen too. */
        var touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        var maxH = Math.max(220, (window.innerHeight || 800) - (classroom ? 150 : 240) - (touch ? pad.offsetHeight + 14 : 0));
        var scale = Math.min(w / nw, maxH / nih);
        cssW = Math.floor(nw * scale); cssH = Math.floor(nih * scale);
        screenEl.style.width = cssW + 'px'; screenEl.style.height = cssH + 'px';
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.max(1, Math.round(cssW * dpr)); canvas.height = Math.max(1, Math.round(cssH * dpr));
        if (nw !== VW || nih !== IH || !img) {
          VW = nw; VH = nvh; IH = nih;
          off.width = VW; off.height = IH;
          img = octx.createImageData(VW, IH);
          buf = new Uint32Array(img.data.buffer);
          zbuf = new Float32Array(VW);
          barDirty = true;
        }
        ctx.imageSmoothingEnabled = false;
        render();
        fitCard();
      }

      /* ---------- game state ---------- */
      var state = 'title';   /* title | playing | paused | done */
      var unlocked = clamp(Number(api.store.get('unlocked', 1)) || 1, 1, LEVELS.length);
      var levelIdx = clamp(Number(api.store.get('level', 0)) || 0, 0, unlocked - 1);
      var bests = api.store.get('bests', {}) || {};
      var L = null, E = null, MW = 0, MH = 0, grid = null, seen = null, solidDecor = null, secretAt = null, lights = null;
      var doors = [], things = [], robots = [];
      var P = { x: 0, y: 0, a: 0, vx: 0, vy: 0, turnV: 0 };
      var cp = { x: 0, y: 0, a: 0 };
      var haveKey = [true, false, false, false];
      var stats = { stars: 0, total: 0, secrets: 0, secretsTotal: 0, caught: 0 };
      var pw = null;            /* the secret wall that is sliding right now */
      var grace = 0, mapOn = false, clock = 0, levelTime = 0, alertLevel = 0, moving = false;
      var msgUntil = 0, msgCol = 0, bigText = '', bigSub = '', bigUntil = 0;
      var faceMood = 'idle', faceUntil = 0, idleFor = 0;
      var tintCol = '', tintUntil = 0, tintLen = 1;
      var floorT = null, ceilT = null, lightT = null;
      var beepAt = 0, rumbleAt = 0, lastSecond = -1, tipAt = 0;

      function loadLevel(i) {
        levelIdx = i; L = LEVELS[i]; E = L.eyes;
        MH = L.map.length; MW = L.map[0].length;
        grid = new Int16Array(MW * MH); seen = new Uint8Array(MW * MH); solidDecor = new Uint8Array(MW * MH);
        secretAt = new Uint8Array(MW * MH); lights = new Uint8Array(MW * MH);
        doors = []; things = []; robots = []; pw = null;
        haveKey = [true, false, false, false];
        stats = { stars: 0, total: 0, secrets: 0, secretsTotal: 0, caught: 0 };
        var rnd = seeded(i + 7);
        function ch(x, y) { return x < 0 || y < 0 || x >= MW || y >= MH ? '#' : L.map[y].charAt(x); }
        function isWallCh(c) { return !!WALL_CHARS[c] || c === '?'; }
        for (var y = 0; y < MH; y++) for (var x = 0; x < MW; x++) {
          var c = ch(x, y), ci = y * MW + x;
          lights[ci] = (x * 3 + y * 5) % 7 === 0 ? 1 : 0;
          if (WALL_CHARS[c]) grid[ci] = WALL_CHARS[c];
          else if (c === '?') { secretAt[ci] = 1; stats.secretsTotal++; }
          else if (c in DOOR_CHARS) {
            var k = DOOR_CHARS[c];
            /* A door is a thin slab across the middle of its square: across a corridor that runs east-west
               (axis 0) or north-south (axis 1). */
            doors.push({ x: x, y: y, key: k, open: 0, opening: false, axis: isWallCh(ch(x, y - 1)) && isWallCh(ch(x, y + 1)) ? 0 : 1, tex: [T_DOOR, T_DOOR_R, T_DOOR_U, T_DOOR_Y][k] });
            grid[ci] = 64 + doors.length - 1;
          } else if (c in KEY_CHARS) things.push({ kind: 'key', key: KEY_CHARS[c], tex: S_KEY1 + KEY_CHARS[c] - 1, x: x + 0.5, y: y + 0.5, size: 0.34, z: 0.18, alive: true, phase: rnd() * 6 });
          else if (c === '*') { things.push({ kind: 'star', tex: S_STAR, x: x + 0.5, y: y + 0.5, size: 0.3, z: 0.2, alive: true, phase: rnd() * 6 }); stats.total++; }
          else if (c === '!') things.push({ kind: 'disk', tex: S_DISK, x: x + 0.5, y: y + 0.5, size: 0.3, z: 0.16, alive: true, on: false, phase: rnd() * 6 });
          else if (c === '@') { P.x = x + 0.5; P.y = y + 0.5; }
          else if (DECOR[c]) {
            var d = DECOR[c];
            things.push({ kind: 'decor', tex: d[0], x: x + 0.5, y: y + 0.5, size: d[1], z: d[2], alive: true, phase: 0 });
            if (d[3]) solidDecor[ci] = 1;
          }
        }
        /* A secret wall borrows the picture of a wall next to it, plus cracks. */
        for (var s = 0; s < MW * MH; s++) {
          if (!secretAt[s]) continue;
          var sx = s % MW, sy = (s / MW) | 0, tex = 0, nb = [ch(sx - 1, sy), ch(sx + 1, sy), ch(sx, sy - 1), ch(sx, sy + 1)];
          for (var n = 0; n < 4 && !tex; n++) if (WALL_CHARS[nb[n]] && nb[n] !== 'E') tex = WALL_CHARS[nb[n]];
          grid[s] = (tex || T_BRICK) + CRACK;
        }
        P.a = L.angle * Math.PI / 180; P.vx = P.vy = P.turnV = 0;
        cp = { x: P.x, y: P.y, a: P.a };
        (L.robots || []).forEach(function (r) {
          var pts = r.path.map(function (p) { return [p[0] + 0.5, p[1] + 0.5]; });
          var nx = pts[1 % pts.length];
          robots.push({ path: pts, i: 1 % pts.length, x: pts[0][0], y: pts[0][1], a: Math.atan2(nx[1] - pts[0][1], nx[0] - pts[0][0]), look: 0, wait: 0.4, meter: 0, moving: false, anim: rnd() * 6 });
        });
        floorT = art.floors[L.floor]; ceilT = art.floors[L.ceil]; lightT = art.floors[L.ceil === 'dark' ? 'cage' : 'light'];
        levelTime = 0; grace = 2; mapOn = false; alertLevel = 0; msgUntil = 0; lastSecond = -1;
        bigText = 'LEVEL ' + (i + 1); bigSub = L.name.toUpperCase(); bigUntil = clock + 2.6; tipAt = clock + 2.7;
        faceMood = 'idle'; faceUntil = 0; idleFor = 0;
        barDirty = true;
        updateCanvasLabel();
      }

      /* ---------- moving about ---------- */
      function solidAt(x, y) {
        if (x < 0 || y < 0 || x >= MW || y >= MH) return true;
        var ci = (y | 0) * MW + (x | 0), v = grid[ci];
        if (v === 0) return solidDecor[ci] === 1;
        if (v >= 64 && v < PW) return doors[v - 64].open < 0.85;
        return true;
      }
      /* Move along one axis at a time, so you slide along walls instead of sticking to them. */
      function tryMove(dx, dy) {
        var r = RADIUS, e;
        if (dx) {
          e = P.x + dx + (dx > 0 ? r : -r);
          if (!solidAt(e, P.y - r) && !solidAt(e, P.y + r)) P.x += dx;
          else { P.x = dx > 0 ? Math.floor(e) - r - 0.001 : Math.floor(e) + 1 + r + 0.001; P.vx = 0; }
        }
        if (dy) {
          e = P.y + dy + (dy > 0 ? r : -r);
          if (!solidAt(P.x - r, e) && !solidAt(P.x + r, e)) P.y += dy;
          else { P.y = dy > 0 ? Math.floor(e) - r - 0.001 : Math.floor(e) + 1 + r + 0.001; P.vy = 0; }
        }
      }

      /* What is right in front of you (within about one square)? A short ray, the same hop-by-hop trick the
         drawing uses. Open doors are looked through. */
      function probe() {
        var dx = Math.cos(P.a), dy = Math.sin(P.a);
        var mx = P.x | 0, my = P.y | 0;
        var ddx = dx === 0 ? 1e30 : Math.abs(1 / dx), ddy = dy === 0 ? 1e30 : Math.abs(1 / dy);
        var sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
        var tx = dx < 0 ? (P.x - mx) * ddx : (mx + 1 - P.x) * ddx, ty = dy < 0 ? (P.y - my) * ddy : (my + 1 - P.y) * ddy;
        for (var i = 0; i < 4; i++) {
          var side, t;
          if (tx < ty) { t = tx; tx += ddx; mx += sx; side = 0; } else { t = ty; ty += ddy; my += sy; side = 1; }
          if (t > 1.3 || mx < 0 || my < 0 || mx >= MW || my >= MH) return null;
          var ci = my * MW + mx, v = grid[ci];
          if (v === 0) { if (solidDecor[ci]) return null; continue; }
          if (v >= 64 && v < PW && doors[v - 64].open >= 1) continue;
          return { ci: ci, x: mx, y: my, side: side, sx: sx, sy: sy };
        }
        return null;
      }

      function useAction() {
        if (state !== 'playing') return;
        idleFor = 0;
        var hit = probe();
        if (!hit) { tone(150, 0.05, 'square', 0.04); return; }
        var v = grid[hit.ci];
        if (v >= 64 && v < PW) {
          var d = doors[v - 64];
          if (d.opening) return;
          if (!haveKey[d.key]) {
            api.sound('wrong');
            say('THIS DOOR NEEDS THE ' + KEY_NAMES[d.key].toUpperCase() + ' KEY', 2.2, 2);
            api.announce('Locked. This door needs the ' + KEY_NAMES[d.key] + ' key, the one with a ' + KEY_SHAPES[d.key] + '.');
            mood('grr', 1.1);
            return;
          }
          d.opening = true;
          api.sound('whoosh'); tone(196, 0.09, 'square', 0.06);
          if (d.key) { say(KEY_NAMES[d.key].toUpperCase() + ' DOOR OPEN', 1.4, 0); api.announce('The ' + KEY_NAMES[d.key] + ' door slides open.'); }
        } else if (v === T_LIFT) {
          finishLevel();
        } else if (secretAt[hit.ci]) {
          startPush(hit);
        } else {
          tone(95, 0.08, 'square', 0.07);
          mood('hmm', 0.6);
        }
      }

      /* ---------- secret walls: press Use and the wall slides back two squares, if there is room ---------- */
      function freeForWall(x, y) {
        if (x < 0 || y < 0 || x >= MW || y >= MH) return false;
        var ci = y * MW + x;
        if (grid[ci] !== 0 || solidDecor[ci]) return false;
        if ((P.x | 0) === x && (P.y | 0) === y) return false;
        for (var i = 0; i < robots.length; i++) if ((robots[i].x | 0) === x && (robots[i].y | 0) === y) return false;
        for (i = 0; i < things.length; i++) if (things[i].alive && (things[i].x | 0) === x && (things[i].y | 0) === y) return false;
        return true;
      }
      function startPush(hit) {
        if (pw) return;
        var dx = hit.side === 0 ? hit.sx : 0, dy = hit.side === 1 ? hit.sy : 0;
        if (!freeForWall(hit.x + dx, hit.y + dy)) { tone(95, 0.08, 'square', 0.07); say('IT WILL NOT BUDGE', 1.4, 2); return; }
        secretAt[hit.ci] = 0;
        pw = { x: hit.x, y: hit.y, dx: dx, dy: dy, o: 0, left: 1, tex: grid[hit.ci] };
        grid[hit.ci] = PW; grid[(hit.y + dy) * MW + hit.x + dx] = PW;
        stats.secrets++;
        api.sound('thud');
        [392, 523, 659, 784, 1047].forEach(function (f, n) { later(function () { tone(f, 0.12, 'square', 0.07); }, 120 + n * 85); });
        say('SECRET FOUND!', 2.2, 1);
        api.announce('You found a secret wall. It is sliding back.');
        mood('wow', 1.6);
        flash('rgba(139, 92, 246, ', 0.6);
        updateStatus();
      }
      function stepPush(dt) {
        pw.o += dt * PUSH_SPEED;
        if (clock > rumbleAt) { rumbleAt = clock + 0.17; tone(55 + api.random() * 20, 0.14, 'sawtooth', 0.05); }
        if (pw.o < 1) return;
        grid[pw.y * MW + pw.x] = 0;
        pw.x += pw.dx; pw.y += pw.dy; pw.o -= 1;
        var nx = pw.x + pw.dx, ny = pw.y + pw.dy;
        if (pw.left > 0 && freeForWall(nx, ny)) { pw.left--; grid[ny * MW + nx] = PW; }
        else { grid[pw.y * MW + pw.x] = pw.tex; pw = null; api.sound('thud'); }
      }

      /* ---------- picking things up ---------- */
      function pickups() {
        for (var i = 0; i < things.length; i++) {
          var t = things[i];
          if (!t.alive || t.kind === 'decor') continue;
          var dx = t.x - P.x, dy = t.y - P.y;
          if (dx * dx + dy * dy > 0.3) continue;
          if (t.kind === 'star') {
            t.alive = false; stats.stars++;
            api.sound('coin');
            if (stats.stars === stats.total) { say('ALL ' + stats.total + ' STARS!', 2.2, 1); later(function () { tone(1568, 0.25, 'square', 0.06); }, 220); api.announce('You have found every star on this level.'); }
            else say('STAR ' + stats.stars + ' OF ' + stats.total, 1.1, 1);
            mood('happy', 0.9); flash('rgba(255, 210, 63, ', 0.35);
            barDirty = true; updateStatus();
          } else if (t.kind === 'key') {
            t.alive = false; haveKey[t.key] = true;
            [523, 659, 784, 1047].forEach(function (f, n) { later(function () { tone(f, 0.1, 'square', 0.07); }, n * 70); });
            say(KEY_NAMES[t.key].toUpperCase() + ' KEY!', 2, 1);
            api.announce('You found the ' + KEY_NAMES[t.key] + ' key. It opens ' + KEY_NAMES[t.key] + ' doors marked with a ' + KEY_SHAPES[t.key] + '.');
            mood('happy', 1.2); flash('rgba(255, 210, 63, ', 0.45);
            barDirty = true; updateStatus();
          } else if (t.kind === 'disk' && !t.on) {
            t.on = true; t.tex = S_DISK_ON;
            cp = { x: t.x, y: t.y, a: P.a };
            tone(660, 0.08, 'square', 0.06); later(function () { tone(990, 0.16, 'square', 0.06); }, 90);
            say('CHECKPOINT SAVED', 1.8, 0);
            api.announce('Checkpoint saved. If a robot spots you, you come back here.');
            mood('happy', 0.8);
          }
        }
      }

      /* ---------- the caretaker robots ----------
         Each robot rolls from point to point along its route. At each point it stops, turns to face the next one, and
         rolls on. It can see you if three things are all true:
           1. you are close enough (its range),
           2. you are inside its cone of vision (the angle between where it faces and where you are is small),
           3. nothing solid is in the way (a line of sight, checked with the same square-hopping as the drawing).
         Seeing you fills its "notice" meter (faster when you are close). When the meter is full, you are spotted. */
      function clearLine(x0, y0, x1, y1) {
        var dx = x1 - x0, dy = y1 - y0, mx = x0 | 0, my = y0 | 0, ex = x1 | 0, ey = y1 | 0;
        var ddx = dx === 0 ? 1e30 : Math.abs(1 / dx), ddy = dy === 0 ? 1e30 : Math.abs(1 / dy);
        var sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
        var tx = dx < 0 ? (x0 - mx) * ddx : (mx + 1 - x0) * ddx, ty = dy < 0 ? (y0 - my) * ddy : (my + 1 - y0) * ddy;
        for (var n = 0; n < 90; n++) {
          if (mx === ex && my === ey) return true;
          if (tx < ty) { mx += sx; tx += ddx; } else { my += sy; ty += ddy; }
          var v = grid[my * MW + mx];
          if (v !== 0) { if (v >= 64 && v < PW) { if (doors[v - 64].open < 0.6) return false; } else return false; }
        }
        return true;
      }
      function updateRobots(dt) {
        var cone = E.cone * Math.PI / 180, top = 0;
        for (var i = 0; i < robots.length; i++) {
          var r = robots[i], tgt = r.path[r.i];
          var dx = tgt[0] - r.x, dy = tgt[1] - r.y, dist = Math.sqrt(dx * dx + dy * dy);
          var want = r.wait > 0 ? r.look : (dist > 0.001 ? Math.atan2(dy, dx) : r.a);
          var diff = wrapAngle(want - r.a), turn = 3 * dt;
          r.a = wrapAngle(r.a + clamp(diff, -turn, turn));
          r.moving = false;
          if (r.wait > 0) r.wait -= dt;
          else if (Math.abs(diff) < 0.3) {
            var step = E.speed * dt;
            if (dist <= step) {
              r.x = tgt[0]; r.y = tgt[1];
              r.i = (r.i + 1) % r.path.length;
              var nt = r.path[r.i];
              r.look = Math.atan2(nt[1] - r.y, nt[0] - r.x); r.wait = 0.8;
            } else { r.x += dx / dist * step; r.y += dy / dist * step; r.moving = true; }
          }
          r.anim += dt;
          if (grace > 0) { r.meter = Math.max(0, r.meter - dt * 2); continue; }
          var px = P.x - r.x, py = P.y - r.y, pd = Math.sqrt(px * px + py * py);
          if (pd < 0.55) { caught(); return; }
          var sees = pd < E.range && Math.abs(wrapAngle(Math.atan2(py, px) - r.a)) < cone && clearLine(r.x, r.y, P.x, P.y);
          if (sees) {
            r.meter += dt / E.notice * (1.6 - pd / E.range);
            if (r.meter >= 1) { caught(); return; }
          } else r.meter = Math.max(0, r.meter - dt / (E.notice * 1.5));
          if (r.meter > top) top = r.meter;
        }
        if (top > 0.12 && alertLevel <= 0.12) barDirty = true;
        alertLevel = top;
        if (top > 0.05 && clock > beepAt) { beepAt = clock + 0.16 - top * 0.08; tone(480 + top * 700, 0.05, 'square', 0.05); }
      }
      function caught() {
        stats.caught++;
        P.x = cp.x; P.y = cp.y; P.a = cp.a; P.vx = P.vy = P.turnV = 0;
        for (var i = 0; i < robots.length; i++) robots[i].meter = 0;
        grace = GRACE; alertLevel = 0;
        tone(170, 0.32, 'sawtooth', 0.09); later(function () { tone(128, 0.4, 'sawtooth', 0.09); }, 200);
        say('SPOTTED! BACK TO THE CHECKPOINT', 2.4, 2);
        mood('oops', 1.9);
        flash('rgba(255, 61, 154, ', 0.7);
        api.announce('A caretaker robot spotted you. You are back at the last checkpoint.');
        updateStatus('A robot spotted you, so you are back at the checkpoint.');
      }

      /* ---------- drawing the 3D view: raycasting ---------- */
      var sprIdx = new Int16Array(MAX_SPRITES), sprD = new Float32Array(MAX_SPRITES), sprX = new Float32Array(MAX_SPRITES), sprY = new Float32Array(MAX_SPRITES);
      var sprTex = new Int16Array(MAX_SPRITES), sprSize = new Float32Array(MAX_SPRITES), sprZ = new Float32Array(MAX_SPRITES), sprSX = new Float32Array(MAX_SPRITES), sprFlip = new Uint8Array(MAX_SPRITES);
      var nSpr = 0, camDX = 1, camDY = 0;
      function addSprite(x, y, tex, size, z, sx, flip) {
        if (nSpr >= MAX_SPRITES) return;
        var d = (x - P.x) * camDX + (y - P.y) * camDY;   /* how far in front of you it is */
        if (d < 0.12 || d > FOG_DIST + 2) return;
        sprX[nSpr] = x; sprY[nSpr] = y; sprTex[nSpr] = tex; sprSize[nSpr] = size; sprZ[nSpr] = z; sprSX[nSpr] = sx; sprFlip[nSpr] = flip; sprD[nSpr] = d; sprIdx[nSpr] = nSpr;
        nSpr++;
      }

      function drawWorld() {
        var W = VW, Hv = VH, half = Hv >> 1, b = buf, mw = MW, mh = MH, px = P.x, py = P.y;
        var dirX = Math.cos(P.a), dirY = Math.sin(P.a), plX = -dirY * PLANE, plY = dirX * PLANE;
        var scale = W / (2 * PLANE);        /* how many pixels tall a wall 1 square away is */
        var shadeK = SHADES / FOG_DIST, x, y;
        camDX = dirX; camDY = dirY;

        /* 1. Floor and ceiling, one row at a time. Every row of floor pixels is a known distance away, so we walk
           across the floor picture from the left edge of the view to the right. The ceiling is the mirror image. */
        var rdx0 = dirX - plX, rdy0 = dirY - plY, rdx1 = dirX + plX, rdy1 = dirY + plY;
        for (y = half; y < Hv; y++) {
          var rowDist = 0.5 * scale / (y - half + 0.5);
          var stepX = rowDist * (rdx1 - rdx0) / W, stepY = rowDist * (rdy1 - rdy0) / W;
          var fx = px + rowDist * rdx0, fy = py + rowDist * rdy0;
          var s = (rowDist * shadeK) | 0;
          if (s > SHADES - 1) s = SHADES - 1;
          var so = s << 12, rowF = y * W, rowC = (Hv - 1 - y) * W;
          for (x = 0; x < W; x++) {
            var t = so | ((((fy * 64) | 0) & 63) << 6) | (((fx * 64) | 0) & 63);
            b[rowF + x] = floorT[t];
            var cx = fx | 0, cy = fy | 0;
            b[rowC + x] = (fx >= 0 && fy >= 0 && cx < mw && cy < mh && lights[cy * mw + cx] === 1) ? lightT[t] : ceilT[t];
            fx += stepX; fy += stepY;
          }
        }

        /* 2. Walls: one ray for every column of the screen. */
        var slide = pw;
        for (x = 0; x < W; x++) {
          var cam = 2 * (x + 0.5) / W - 1;
          var rdx = dirX + plX * cam, rdy = dirY + plY * cam;
          var mx = px | 0, my = py | 0;
          /* ddx: how far the ray travels to cross one whole square sideways; ddy: one whole square up or down. */
          var ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
          var stx = rdx < 0 ? -1 : 1, sty = rdy < 0 ? -1 : 1;
          var sdx = rdx < 0 ? (px - mx) * ddx : (mx + 1 - px) * ddx, sdy = rdy < 0 ? (py - my) * ddy : (my + 1 - py) * ddy;
          var side = 0, dist = 30, u = 0, tex = T_BRICK, prevDoor = false;
          for (var n = 0; n < 120; n++) {
            /* Hop to the next square: whichever grid line the ray reaches first. This is the DDA. */
            if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; }
            if (mx < 0 || my < 0 || mx >= mw || my >= mh) { dist = side === 0 ? sdx - ddx : sdy - ddy; break; }
            var ci = my * mw + mx, v = grid[ci];
            seen[ci] = 1;
            if (v === 0) { prevDoor = false; continue; }
            if (v < 64) {
              dist = side === 0 ? sdx - ddx : sdy - ddy;
              u = side === 0 ? py + dist * rdy : px + dist * rdx;
              u -= Math.floor(u);
              /* flip so pictures and words read the right way round from every side */
              if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) u = 1 - u;
              tex = prevDoor ? T_JAMB : v;
              break;
            }
            if (v < PW) {
              /* A door: a thin slab across the middle of the square. Has the ray hit the closed part of it? */
              var d = doors[v - 64], t2, hv;
              if (d.axis === 0) { t2 = (mx + 0.5 - px) / rdx; hv = py + t2 * rdy - my; }
              else { t2 = (my + 0.5 - py) / rdy; hv = px + t2 * rdx - mx; }
              if (t2 > 0 && hv >= d.open && hv < 1) {
                dist = t2; u = hv - d.open; tex = d.tex; side = d.axis;
                if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) u = 1 - u;
                break;
              }
              prevDoor = true; continue;
            }
            /* A sliding secret wall is a box part-way between two squares: find where the ray first enters it. */
            if (slide) {
              var bx0 = slide.x + slide.dx * slide.o, by0 = slide.y + slide.dy * slide.o;
              var ax = (bx0 - px) / rdx, bx = (bx0 + 1 - px) / rdx, ay = (by0 - py) / rdy, by = (by0 + 1 - py) / rdy;
              var nx = ax < bx ? ax : bx, fxx = ax < bx ? bx : ax, ny = ay < by ? ay : by, fyy = ay < by ? by : ay;
              var tin = nx > ny ? nx : ny, tout = fxx < fyy ? fxx : fyy, exitT = sdx < sdy ? sdx : sdy;
              if (tin <= tout && tin > 0 && tin <= exitT + 1e-6) {
                dist = tin;
                if (nx > ny) { side = 0; u = py + tin * rdy - by0; } else { side = 1; u = px + tin * rdx - bx0; }
                if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) u = 1 - u;
                tex = slide.tex; break;
              }
            }
            prevDoor = false;
          }
          zbuf[x] = dist;
          /* The further away, the shorter the wall: height = scale / distance. */
          var lh = scale / dist, top = half - lh * 0.5;
          var y0 = top < 0 ? 0 : Math.floor(top), y1 = Math.min(Hv, Math.ceil(top + lh));
          var sh = ((dist * shadeK) | 0) + side;
          if (sh > SHADES - 1) sh = SHADES - 1;
          var tu = (u * 64) | 0;
          if (tu > 63) tu = 63; else if (tu < 0) tu = 0;
          var col = art.walls[tex], base = (sh << 12) | (tu << 6), step = 64 / lh, tp = (y0 + 0.5 - top) * step, idx = y0 * W + x;
          for (y = y0; y < y1; y++) { b[idx] = col[base | ((tp | 0) & 63)]; tp += step; idx += W; }
        }

        /* 3. Sprites: things and robots, sorted from far to near and drawn column by column, skipping any column
           where a wall is nearer (we remembered every wall's distance in zbuf). */
        nSpr = 0;
        for (var i = 0; i < things.length; i++) {
          var th = things[i];
          if (!th.alive) continue;
          if (th.kind === 'decor') addSprite(th.x, th.y, th.tex, th.size, th.z, 1, 0);
          else {
            var bob = Math.sin(clock * 3 + th.phase) * 0.035;
            var spin = th.kind === 'key' || reduced ? 1 : Math.max(0.18, Math.abs(Math.cos(clock * (th.kind === 'star' ? 2.6 : 1.4) + th.phase)));
            addSprite(th.x, th.y, th.tex, th.size, th.z + bob, spin, 0);
          }
        }
        for (i = 0; i < robots.length; i++) {
          var r = robots[i];
          var rel = wrapAngle(Math.atan2(py - r.y, px - r.x) - r.a);
          var eye = r.meter >= 0.55 ? 2 : r.meter > 0.05 ? 1 : 0;
          var ar = Math.abs(rel), tx2, flip = 0;
          if (ar < 0.8) tx2 = S_BOT_F + eye; else if (ar > 2.35) tx2 = S_BOT_B; else { tx2 = S_BOT_S + eye; flip = rel < 0 ? 1 : 0; }
          addSprite(r.x, r.y, tx2, 0.8, r.moving ? Math.abs(Math.sin(r.anim * 11)) * 0.012 : 0, 1, flip);
          if (r.meter > 0.05) addSprite(r.x, r.y, S_ALERT, 0.26, 0.84, 1, 0);
        }
        /* insertion sort: furthest first */
        for (i = 1; i < nSpr; i++) {
          var k = sprIdx[i], kd = sprD[k], j = i - 1;
          while (j >= 0 && sprD[sprIdx[j]] < kd) { sprIdx[j + 1] = sprIdx[j]; j--; }
          sprIdx[j + 1] = k;
        }
        for (i = 0; i < nSpr; i++) {
          var q = sprIdx[i], depth = sprD[q];
          var rx = sprX[q] - px, ry = sprY[q] - py;
          var scrX = (W / 2) * (1 + ((dirX * ry - dirY * rx) / PLANE) / depth);
          var full = scale / depth, hgt = full * sprSize[q], wid = hgt * sprSX[q];
          var bottom = half + full * 0.5 - full * sprZ[q], topY = bottom - hgt, left = scrX - wid / 2;
          var sx0 = Math.max(0, Math.floor(left)), sx1 = Math.min(W, Math.ceil(left + wid));
          var sy0 = Math.max(0, Math.floor(topY)), sy1 = Math.min(Hv, Math.ceil(bottom));
          if (sx0 >= sx1 || sy0 >= sy1) continue;
          var ss = (depth * shadeK) | 0;
          if (ss > SHADES - 1) ss = SHADES - 1;
          var T = art.sprites[sprTex[q]], sso = ss << 12, tstep = 64 / hgt, fl = sprFlip[q];
          for (x = sx0; x < sx1; x++) {
            if (depth >= zbuf[x]) continue;
            var tcx = (((x + 0.5 - left) / wid) * 64) | 0;
            if (tcx < 0) tcx = 0; else if (tcx > 63) tcx = 63;
            if (fl) tcx = 63 - tcx;
            var cbase = sso | (tcx << 6), tpp = (sy0 + 0.5 - topY) * tstep, id2 = sy0 * W + x;
            for (y = sy0; y < sy1; y++) {
              var ty = tpp | 0;
              if (ty > 63) ty = 63;
              var c = T[cbase | ty];
              if (c !== 0) b[id2] = c;
              tpp += tstep; id2 += W;
            }
          }
        }
      }

      /* ---------- the screen furniture, drawn pixel by pixel into the same small picture ---------- */
      var C_WHITE = pack(242, 251, 248), C_YELLOW = hex('#ffd23f'), C_PINK = hex('#ff3d9a'), C_TEAL = hex('#1fc8b9'), C_MINT = hex('#9fd3cc'),
        C_BLACK = pack(4, 12, 14), C_BAR = hex('#0e3b40'), C_BAR_HI = hex('#2bb3a6'), C_BAR_LO = hex('#06191c'), C_WELL = hex('#071c1f'),
        C_DIM = hex('#24484c'), C_GREEN = hex('#39ff7a'), C_FLOORMAP = hex('#123033');
      var MSG_COLS = [C_WHITE, C_YELLOW, C_PINK];
      var KEY_COLS = [0, hex('#ff4757'), hex('#3d7bff'), hex('#ffc61a')];
      var SHAPES_7 = {
        circle: [28, 62, 127, 127, 127, 62, 28],
        square: [127, 127, 127, 127, 127, 127, 127],
        triangle: [8, 28, 28, 62, 62, 127, 127]
      };
      var HEADINGS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

      function box(x, y, w, hh, c) {
        var x0 = Math.max(0, x), x1 = Math.min(VW, x + w), y0b = Math.max(0, y), y1b = Math.min(IH, y + hh);
        if (x0 >= x1) return;
        for (var yy = y0b; yy < y1b; yy++) buf.fill(c, yy * VW + x0, yy * VW + x1);
      }
      /* darken a rectangle to half brightness (for the backing behind messages and the map) */
      function dim(x, y, w, hh) {
        var x0 = Math.max(0, x), x1 = Math.min(VW, x + w), y0b = Math.max(0, y), y1b = Math.min(VH, y + hh);
        for (var yy = y0b; yy < y1b; yy++) for (var i = yy * VW + x0, e = yy * VW + x1; i < e; i++) buf[i] = ((buf[i] >>> 1) & 0x7f7f7f) | 0xff000000;
      }
      function text(str, x, y, c, sc) {
        sc = sc || 1;
        for (var i = 0; i < str.length; i++) {
          var gl = GLYPHS[str.charAt(i)];
          if (!gl) continue;
          for (var r = 0; r < 7; r++) {
            var row = gl[r];
            if (row) for (var bit = 0; bit < 5; bit++) if (row & (16 >> bit)) box(x + (i * 6 + bit) * sc, y + r * sc, sc, sc, c);
          }
        }
      }
      function textW(str, sc) { return (str.length * 6 - 1) * (sc || 1); }
      function textShadow(str, x, y, c, sc) { text(str, x + (sc || 1), y + (sc || 1), C_BLACK, sc); text(str, x, y, c, sc); }
      function bitmap(rows, x, y, c, sc) { for (var r = 0; r < rows.length; r++) for (var bit = 0; bit < 7; bit++) if (rows[r] & (64 >> bit)) box(x + bit * sc, y + r * sc, sc, sc, c); }
      function line(x0, y0, x1, y1, c) {
        var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (var i = 0; i <= n; i++) {
          var x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
          if (x >= 0 && y >= 0 && x < VW && y < VH) buf[y * VW + x] = c;
        }
      }
      /* Split a long message into lines that fit the screen. */
      var msgLines = [];
      function wrapText(str, maxW) {
        var words = str.split(' '), lines = [], cur = '';
        words.forEach(function (w) {
          var t = cur ? cur + ' ' + w : w;
          if (textW(t) > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
        });
        if (cur) lines.push(cur);
        return lines;
      }

      function drawHud() {
        /* compass, top right: the red needle always points north */
        var r = 10, cx = VW - r - 4, cy = r + 4;
        for (var yy = -r; yy <= r; yy++) for (var xx = -r; xx <= r; xx++) {
          var dd = xx * xx + yy * yy;
          if (dd > r * r) continue;
          var i = (cy + yy) * VW + cx + xx;
          buf[i] = dd > (r - 1.3) * (r - 1.3) ? C_MINT : ((buf[i] >>> 2) & 0x3f3f3f) | 0xff000000;
        }
        var rel = -Math.PI / 2 - P.a, nx = Math.sin(rel), ny = -Math.cos(rel);
        line(cx, cy, cx - nx * 5, cy - ny * 5, C_WHITE);
        line(cx, cy, cx + nx * 8, cy + ny * 8, C_PINK);
        line(cx + 1, cy, cx + 1 + nx * 7, cy + ny * 7, C_PINK);
        var deg = ((P.a * 180 / Math.PI) + 90 + 720) % 360, hd = HEADINGS[Math.round(deg / 45) % 8];
        dim(cx - (textW(hd) >> 1) - 2, cy + r + 2, textW(hd) + 4, 10); dim(cx - (textW(hd) >> 1) - 2, cy + r + 2, textW(hd) + 4, 10);
        textShadow(hd, cx - (textW(hd) >> 1), cy + r + 3, C_MINT);

        /* the message line along the top */
        if (clock < msgUntil && msgLines.length) {
          var my = 4;
          for (var m = 0; m < msgLines.length; m++) {
            var w = textW(msgLines[m]), mx = (VW - 2 * r - 8 - w) >> 1;
            if (mx < 3) mx = 3;
            dim(mx - 3, my - 2, w + 6, 11);
            textShadow(msgLines[m], mx, my, MSG_COLS[msgCol]);
            my += 10;
          }
        }
        /* the big level title */
        if (clock < bigUntil) {
          var sc = VW >= 220 ? 2 : 1, bw = textW(bigText, sc), by = (VH >> 1) - 16;
          dim(0, by - 4, VW, 7 * sc + 22);
          textShadow(bigText, (VW - bw) >> 1, by, C_YELLOW, sc);
          textShadow(bigSub, (VW - textW(bigSub)) >> 1, by + 7 * sc + 6, C_WHITE);
        }
        if (mapOn) drawMap();
      }

      /* The automap: every square your rays have touched, seen from above, with each robot's view cone in pink.
         Robots see the shaded squares; stay out of the pink. */
      function drawMap() {
        var cs = Math.max(2, Math.min(10, Math.floor((VH - 12) / MH), Math.floor((VW - 10) / MW)));
        var w = MW * cs, hh = MH * cs, ox = (VW - w) >> 1, oy = Math.max(2, (VH - hh) >> 1);
        dim(ox - 3, oy - 3, w + 6, hh + 6); dim(ox - 3, oy - 3, w + 6, hh + 6);
        box(ox - 4, oy - 4, w + 8, 1, C_BAR_HI); box(ox - 4, oy + hh + 3, w + 8, 1, C_BAR_HI); box(ox - 4, oy - 4, 1, hh + 8, C_BAR_HI); box(ox + w + 3, oy - 4, 1, hh + 8, C_BAR_HI);
        var x, y, ci, v, c;
        for (y = 0; y < MH; y++) for (x = 0; x < MW; x++) {
          ci = y * MW + x;
          if (!seen[ci]) continue;
          v = grid[ci];
          if (v === 0) c = C_FLOORMAP;
          else if (v === T_LIFT) c = C_GREEN;
          else if (v >= 64 && v < PW) { var d = doors[v - 64]; c = d.key ? KEY_COLS[d.key] : C_MINT; if (d.open >= 1) c = C_FLOORMAP; }
          else if (v === PW) c = art.avg[pw ? pw.tex : T_BRICK];
          else c = art.avg[v];
          box(ox + x * cs, oy + y * cs, cs, cs, c);
        }
        /* what the robots can see right now */
        var cone = E.cone * Math.PI / 180, rr = Math.ceil(E.range);
        for (var i = 0; i < robots.length; i++) {
          var rb = robots[i];
          for (y = Math.max(0, (rb.y | 0) - rr); y <= Math.min(MH - 1, (rb.y | 0) + rr); y++) for (x = Math.max(0, (rb.x | 0) - rr); x <= Math.min(MW - 1, (rb.x | 0) + rr); x++) {
            var dx = x + 0.5 - rb.x, dy = y + 0.5 - rb.y;
            if (dx * dx + dy * dy > E.range * E.range || grid[y * MW + x] !== 0 || !seen[y * MW + x]) continue;
            if (Math.abs(wrapAngle(Math.atan2(dy, dx) - rb.a)) > cone || !clearLine(rb.x, rb.y, x + 0.5, y + 0.5)) continue;
            for (var py2 = 0; py2 < cs; py2++) for (var px2 = 0; px2 < cs; px2++) {
              var k = (oy + y * cs + py2) * VW + ox + x * cs + px2;
              buf[k] = (((buf[k] >>> 1) & 0x7f7f7f) + ((C_PINK >>> 1) & 0x7f7f7f)) | 0xff000000;
            }
          }
        }
        var dot = Math.max(2, cs >> 1), off2 = (cs - dot) >> 1;
        for (i = 0; i < things.length; i++) {
          var t = things[i];
          if (!t.alive || t.kind === 'decor' || !seen[(t.y | 0) * MW + (t.x | 0)]) continue;
          c = t.kind === 'star' ? C_YELLOW : t.kind === 'key' ? KEY_COLS[t.key] : (t.on ? C_GREEN : C_TEAL);
          box(ox + (t.x | 0) * cs + off2, oy + (t.y | 0) * cs + off2, dot, dot, c);
        }
        for (i = 0; i < robots.length; i++) if (seen[(robots[i].y | 0) * MW + (robots[i].x | 0)]) box(Math.round(ox + robots[i].x * cs) - 1, Math.round(oy + robots[i].y * cs) - 1, 3, 3, C_PINK);
        var pxm = Math.round(ox + P.x * cs), pym = Math.round(oy + P.y * cs);
        line(pxm, pym, Math.round(pxm + Math.cos(P.a) * cs * 1.6), Math.round(pym + Math.sin(P.a) * cs * 1.6), C_YELLOW);
        box(pxm - 1, pym - 1, 3, 3, C_WHITE);
        if (oy >= 12) textShadow('MAP', ox, oy - 11, C_MINT);
      }

      /* ---------- the status bar along the bottom ---------- */
      function well(x, y, w, hh) { box(x, y, w, hh, C_WELL); box(x, y, w, 1, C_BAR_LO); box(x, y + hh - 1, w, 1, C_BAR_HI); }
      function drawBar() {
        var y0 = VH, W = VW;
        box(0, y0, W, BAR_H, C_BAR); box(0, y0, W, 1, C_BAR_HI); box(0, IH - 1, W, 1, C_BAR_LO);
        var big = W >= 290 ? 2 : 1, fw = 26, fx = (W - fw) >> 1, bw = (fx - 6) >> 1, by = y0 + 3, bh = 27;
        var xs = [2, 4 + bw, fx + fw + 2, fx + fw + 4 + bw];
        var labels = ['LEVEL', 'STARS', 'KEYS', 'TIME'];
        var values = [String(levelIdx + 1), stats.stars + '/' + stats.total, '', fmtTime(levelTime)];
        for (var i = 0; i < 4; i++) {
          well(xs[i], by, bw, bh);
          text(labels[i], xs[i] + ((bw - textW(labels[i])) >> 1), by + 3, C_MINT);
          var vs = textW(values[i], big) > bw - 4 ? 1 : big;
          if (i !== 2) text(values[i], xs[i] + ((bw - textW(values[i], vs)) >> 1), by + (vs === 2 ? 11 : 14), C_YELLOW, vs);
        }
        /* keys: the shape and the colour, so colour is never the only clue */
        var ks = big, kw = 7 * ks, gap = ks * 2, kx = xs[2] + ((bw - (kw * 3 + gap * 2)) >> 1), ky = by + (ks === 2 ? 11 : 14);
        for (var k = 1; k <= 3; k++) bitmap(SHAPES_7[KEY_SHAPES[k]], kx + (k - 1) * (kw + gap), ky, haveKey[k] ? KEY_COLS[k] : C_DIM, ks);
        well(fx, by, fw, bh);
        drawFace(fx + 1, by);
      }

      /* The face in the middle of the bar is yours. It looks where you turn, blinks, grins at stars, gasps at
         secrets, sweats when a robot is noticing you, and puts on sunglasses when you reach the lift. */
      var C_SKIN = hex('#e8b07a'), C_SKIN_D = hex('#c98d5a'), C_CAP = hex('#ff3d9a'), C_CAP_D = hex('#b8206a'), C_HAIR = hex('#4a2a14'),
        C_EYE = hex('#fdfdf6'), C_PUPIL = hex('#1a1020'), C_MOUTH = hex('#5a1424'), C_TONGUE = hex('#ff7aa8'), C_SWEAT = hex('#8fdcff');
      var faceKey = '', lookDir = 0, lookUntil = 0, faceLook = 0, faceBlink = 0;
      function currentMood() {
        if (clock < faceUntil) return faceMood;
        if (state === 'done') return 'cool';
        if (alertLevel > 0.12) return 'worried';
        if (idleFor > 12) return 'bored';
        return 'idle';
      }
      function faceState() {
        var md = currentMood(), blink = md !== 'cool' && (clock % 4) > 3.85 ? 1 : 0;
        if (clock > lookUntil) { lookUntil = clock + 0.9 + api.random() * 1.4; lookDir = api.random() < 0.5 ? 0 : api.random() < 0.5 ? -1 : 1; }
        faceLook = P.turnV > 0.8 ? 1 : P.turnV < -0.8 ? -1 : lookDir;
        faceBlink = blink;
        return md + ',' + faceLook + ',' + blink;
      }
      function drawFace(x, y) {
        var md = currentMood(), look = faceLook, blink = faceBlink === 1;
        var ix, iy;
        /* head: an oval of skin, darker on the lower right */
        for (iy = 0; iy < 27; iy++) for (ix = 0; ix < 24; ix++) {
          var ex = (ix - 11.5) / 9.2, ey = (iy - 15) / 11.2;
          if (ex * ex + ey * ey > 1) continue;
          var ex2 = (ix - 10.8) / 9.2, ey2 = (iy - 14.2) / 11.2;
          box(x + ix, y + iy, 1, 1, ex2 * ex2 + ey2 * ey2 > 1 ? C_SKIN_D : C_SKIN);
        }
        box(x + 1, y + 13, 2, 4, C_SKIN_D); box(x + 21, y + 13, 2, 4, C_SKIN_D);
        /* a backwards cap and hair */
        for (iy = 2; iy < 10; iy++) for (ix = 2; ix < 22; ix++) {
          var cx2 = (ix - 11.5) / 9.6, cy2 = (iy - 9.5) / 7.6;
          if (cx2 * cx2 + cy2 * cy2 <= 1) box(x + ix, y + iy, 1, 1, iy > 7 ? C_CAP_D : C_CAP);
        }
        box(x + 11, y + 2, 2, 1, C_TEAL); box(x + 3, y + 9, 2, 3, C_HAIR); box(x + 19, y + 9, 2, 3, C_HAIR); box(x + 8, y + 10, 8, 1, C_HAIR);
        /* eyes */
        if (md === 'cool') {
          box(x + 4, y + 12, 16, 4, C_PUPIL); box(x + 3, y + 12, 18, 1, C_PUPIL); box(x + 6, y + 13, 2, 1, C_EYE); box(x + 15, y + 13, 2, 1, C_EYE);
        } else if (md === 'oops') {
          [6, 14].forEach(function (ex3) { box(x + ex3, y + 12, 1, 1, C_PUPIL); box(x + ex3 + 3, y + 12, 1, 1, C_PUPIL); box(x + ex3 + 1, y + 13, 2, 2, C_PUPIL); box(x + ex3, y + 15, 1, 1, C_PUPIL); box(x + ex3 + 3, y + 15, 1, 1, C_PUPIL); });
        } else if (blink || md === 'happy') {
          box(x + 6, y + 14, 4, 1, C_PUPIL); box(x + 14, y + 14, 4, 1, C_PUPIL);
          if (md === 'happy') { box(x + 6, y + 13, 1, 1, C_PUPIL); box(x + 9, y + 13, 1, 1, C_PUPIL); box(x + 14, y + 13, 1, 1, C_PUPIL); box(x + 17, y + 13, 1, 1, C_PUPIL); }
        } else {
          var tall = md === 'wow' || md === 'worried' ? 5 : 4, half2 = md === 'bored' ? 2 : 0;
          box(x + 6, y + 12 - (tall - 4), 4, tall, C_EYE); box(x + 14, y + 12 - (tall - 4), 4, tall, C_EYE);
          var pxo = 1 + look, pyo = md === 'wow' ? 0 : 1;
          box(x + 6 + pxo, y + 12 + pyo, 2, 2, C_PUPIL); box(x + 14 + pxo, y + 12 + pyo, 2, 2, C_PUPIL);
          if (half2) { box(x + 6, y + 12, 4, 2, C_SKIN_D); box(x + 14, y + 12, 4, 2, C_SKIN_D); }
        }
        /* eyebrows */
        if (md === 'worried') { box(x + 6, y + 10, 2, 1, C_HAIR); box(x + 8, y + 9, 2, 1, C_HAIR); box(x + 14, y + 9, 2, 1, C_HAIR); box(x + 16, y + 10, 2, 1, C_HAIR); }
        else if (md === 'grr') { box(x + 6, y + 9, 2, 1, C_HAIR); box(x + 8, y + 10, 2, 1, C_HAIR); box(x + 14, y + 10, 2, 1, C_HAIR); box(x + 16, y + 9, 2, 1, C_HAIR); }
        else if (md === 'wow') { box(x + 6, y + 8, 4, 1, C_HAIR); box(x + 14, y + 8, 4, 1, C_HAIR); }
        else if (md !== 'cool') { box(x + 6, y + 10, 4, 1, C_HAIR); box(x + 14, y + 10, 4, 1, C_HAIR); }
        box(x + 11, y + 16, 2, 2, C_SKIN_D);
        /* mouth */
        if (md === 'happy' || md === 'cool') { box(x + 7, y + 19, 10, 1, C_MOUTH); box(x + 8, y + 20, 8, 2, C_MOUTH); box(x + 8, y + 20, 8, 1, C_EYE); box(x + 9, y + 22, 6, 1, C_MOUTH); }
        else if (md === 'wow' || md === 'bored') { box(x + 10, y + 19, 4, 1, C_MOUTH); box(x + 9, y + 20, 6, 2, C_MOUTH); box(x + 10, y + 22, 4, 1, C_MOUTH); box(x + 11, y + 21, 2, 1, C_TONGUE); }
        else if (md === 'worried') { for (ix = 0; ix < 8; ix++) box(x + 8 + ix, y + 20 + (ix % 2), 1, 1, C_MOUTH); box(x + 19, y + 9, 1, 2, C_SWEAT); box(x + 18, y + 11, 3, 2, C_SWEAT); }
        else if (md === 'oops') { box(x + 8, y + 20, 8, 1, C_MOUTH); box(x + 12, y + 21, 3, 2, C_TONGUE); }
        else if (md === 'grr') { box(x + 9, y + 20, 6, 1, C_MOUTH); box(x + 8, y + 21, 1, 1, C_MOUTH); box(x + 15, y + 21, 1, 1, C_MOUTH); }
        else if (md === 'hmm') box(x + 11, y + 20, 5, 1, C_MOUTH);
        else { box(x + 9, y + 21, 6, 1, C_MOUTH); box(x + 8, y + 20, 1, 1, C_MOUTH); box(x + 15, y + 20, 1, 1, C_MOUTH); }
        if (md === 'bored') text('Z', x + 18, y + 1, C_WHITE);
      }

      /* ---------- put it all on the real screen ---------- */
      var ALERT_STROKES = [];
      for (var al = 0; al <= 10; al++) ALERT_STROKES.push('rgba(255, 61, 154, ' + (0.2 + al * 0.06).toFixed(2) + ')');
      function render() {
        if (!L || !buf) return;
        drawWorld();
        drawHud();
        var fk = faceState();
        if (fk !== faceKey) { faceKey = fk; barDirty = true; }
        var sec = Math.floor(levelTime);
        if (sec !== lastSecond) { lastSecond = sec; barDirty = true; }
        if (barDirty) { drawBar(); barDirty = false; }
        octx.putImageData(img, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
        var viewH = canvas.height * VH / IH;
        if (!reduced && tintCol && clock < tintUntil) {
          ctx.fillStyle = tintCol + (((tintUntil - clock) / tintLen) * 0.4).toFixed(3) + ')';
          ctx.fillRect(0, 0, canvas.width, viewH);
        }
        if (alertLevel > 0.05 && state === 'playing') {
          var lw = Math.max(3, canvas.width / VW * (1 + alertLevel * 3));
          ctx.strokeStyle = ALERT_STROKES[Math.min(10, Math.round(alertLevel * 10))];
          ctx.lineWidth = lw;
          ctx.strokeRect(lw / 2, lw / 2, canvas.width - lw, viewH - lw);
        }
      }

      /* ---------- feedback helpers ---------- */
      var timers = [];
      function later(fn, ms) {
        var id = setTimeout(function () { var k = timers.indexOf(id); if (k >= 0) timers.splice(k, 1); if (!destroyed) fn(); }, ms);
        timers.push(id);
      }
      function tone(f, d, type, vol) { if (api.tone) api.tone(f, d, type, vol); }
      function say(t, secs, col) { msgLines = wrapText(t, VW - 34); msgUntil = clock + secs; msgCol = col || 0; }
      function mood(m, secs) { faceMood = m; faceUntil = clock + secs; barDirty = true; }
      function flash(col, secs) { if (reduced) return; tintCol = col; tintLen = secs; tintUntil = clock + secs; }
      function keyList() { var k = []; for (var i = 1; i <= 3; i++) if (haveKey[i]) k.push(KEY_NAMES[i]); return k.length ? k.join(' and ') : 'none'; }
      function updateCanvasLabel() {
        canvas.setAttribute('aria-label', 'Labyrinth, level ' + (levelIdx + 1) + ', ' + L.name + '. A 3D maze seen through your own eyes. The bar along the bottom shows the level, stars found (' + stats.stars + ' of ' + stats.total + '), keys held (' + keyList() + ') and the time.');
      }
      function updateStatus(prefix) {
        if (state !== 'playing') return;
        var keysLeft = things.some(function (t) { return t.kind === 'key' && t.alive; });
        api.status((prefix ? prefix + ' ' : '') + 'Level ' + (levelIdx + 1) + ', ' + L.name + '. Stars ' + stats.stars + ' of ' + stats.total + '. Keys: ' + keyList() + '. ' + (keysLeft ? 'Find the keys and the lift.' : 'Find the lift.'));
        updateCanvasLabel();
        syncData();
      }
      function setRunning(on) { root.classList.toggle('is-running', on); syncData(); }
      function focusGame() { try { canvas.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }

      /* ---------- cards over the screen: choose a level, paused, level complete ---------- */
      function card(children) {
        overlay.replaceChildren(h('div', { class: 'lab-card' }, children));
        overlay.hidden = false;
        fitCard();
      }
      function hideCard() { overlay.hidden = true; overlay.replaceChildren(); }
      /* On a small screen, drop the sentence of the card if the card would not fit (the status line says it too). */
      function fitCard() {
        var c = overlay.firstChild;
        if (!c || overlay.hidden) return;
        var m = c.querySelector('.lab-msg');
        if (!m) return;
        m.hidden = false;
        if (c.offsetHeight > overlay.clientHeight - 16) m.hidden = true;
      }
      function starsIn(i) { return LEVELS[i].map.join('').split('*').length - 1; }
      var levelBtns = [], levelInfo = null;
      function showTitle() {
        stopLoop(); clearInput();
        state = 'title'; setRunning(false);
        levelBtns = [];
        var row = h('div', { class: 'lab-levels', role: 'group', 'aria-label': 'Choose a level' });
        LEVELS.forEach(function (lv, i) {
          var locked = i >= unlocked, b = bests[String(i + 1)];
          var btn = h('button', { type: 'button', class: 'lab-level', 'aria-pressed': String(i === levelIdx), disabled: locked,
            'aria-label': 'Level ' + (i + 1) + ', ' + lv.name + (locked ? ', locked until you finish level ' + i : b ? ', best time ' + fmtTime(b.time) : ''),
            onclick: function () { pickLevel(i, false); } },
            h('span', { 'aria-hidden': 'true' }, String(i + 1)), h('small', { 'aria-hidden': 'true' }, locked ? 'locked' : b ? fmtTime(b.time) : 'new'));
          levelBtns.push(btn); row.appendChild(btn);
        });
        levelInfo = h('p', { class: 'lab-sub' });
        var go = h('button', { type: 'button', class: 'btn btn-primary lab-big', onclick: function () { startLevel(levelIdx); } }, '▶ Start');
        card([h('p', { class: 'lab-title' }, 'Labyrinth'),
          h('p', { class: 'lab-msg' }, 'Find the coloured keys, open the doors, collect the stars and ride the lift. Keep out of sight of the caretaker robots!'),
          row, levelInfo, go]);
        pickLevel(levelIdx, true);
        api.status('Press Start. Choose a level, then find the keys, the stars and the lift.');
      }
      function pickLevel(i, quiet) {
        if (i >= unlocked) return;
        levelIdx = i; api.store.set('level', i);
        levelBtns.forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === i)); });
        var b = bests[String(i + 1)];
        if (levelInfo) levelInfo.textContent = 'Level ' + (i + 1) + ': ' + LEVELS[i].name + (b ? ' · best ' + fmtTime(b.time) + ' · stars ' + b.stars + ' of ' + starsIn(i) : ' · ' + starsIn(i) + ' stars to find');
        loadLevel(i);
        bigUntil = 0;
        render(); syncData();
        if (!quiet) api.sound('click');
        fitCard();
      }
      function startLevel(i) {
        api.unlockSound();
        loadLevel(i);
        hideCard();
        state = 'playing'; setRunning(true);
        [523, 659, 784].forEach(function (f, n) { later(function () { tone(f, 0.1, 'square', 0.06); }, n * 90); });
        updateStatus();
        api.announce('Level ' + (i + 1) + ', ' + L.name + '. ' + stats.total + ' stars to find.');
        focusGame();
        startLoop();
      }
      function pause() {
        if (state !== 'playing') return;
        state = 'paused'; setRunning(false); stopLoop(); clearInput();
        var resume = h('button', { type: 'button', class: 'btn btn-primary lab-big', onclick: resumeGame }, '▶ Resume');
        card([h('p', { class: 'lab-title' }, 'Paused'),
          h('p', { class: 'lab-msg' }, 'Level ' + (levelIdx + 1) + ', ' + L.name + ' · stars ' + stats.stars + ' of ' + stats.total + ' · time ' + fmtTime(levelTime)),
          h('div', { class: 'lab-row' }, resume,
            h('button', { type: 'button', class: 'btn', onclick: function () { startLevel(levelIdx); } }, 'Restart level'),
            h('button', { type: 'button', class: 'btn', onclick: showTitle }, 'Levels'))]);
        api.status('Paused. Press Resume to carry on.');
        render(); syncData();
        try { resume.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
      function resumeGame() {
        if (state !== 'paused') return;
        hideCard(); state = 'playing'; setRunning(true);
        updateStatus(); focusGame(); startLoop();
      }
      function finishLevel() {
        state = 'done'; setRunning(false); stopLoop(); clearInput(); mapOn = false; alertLevel = 0;
        var key = String(levelIdx + 1), prev = bests[key], t = Math.round(levelTime * 10) / 10, newBest = !prev || t < prev.time;
        bests[key] = { time: newBest ? t : prev.time, stars: Math.max(prev ? prev.stars : 0, stats.stars) };
        api.store.set('bests', bests);
        var last = levelIdx === LEVELS.length - 1;
        if (!last && unlocked < levelIdx + 2) { unlocked = levelIdx + 2; api.store.set('unlocked', unlocked); }
        faceUntil = 0; msgUntil = 0; barDirty = true;
        render(); syncData();
        api.sound('bell');
        function dt2(t2) { return h('dt', null, t2); }
        function dd2(t2) { return h('dd', null, t2); }
        var words = stats.stars === stats.total ? 'Every star found. Brilliant exploring!' : 'You found ' + stats.stars + ' of ' + stats.total + ' stars. Some hide behind secret walls with cracks in them.';
        if (last) words = 'You found your way out of the whole Labyrinth. ' + words;
        var next = last ? null : h('button', { type: 'button', class: 'btn btn-primary lab-big', onclick: function () { startLevel(levelIdx + 1); } }, 'Next level ▶');
        var again = h('button', { type: 'button', class: 'btn' + (last ? ' btn-primary lab-big' : ''), onclick: function () { startLevel(levelIdx); } }, 'Play again');
        card([h('p', { class: 'lab-title' }, last ? 'You escaped!' : 'Level ' + key + ' done!'),
          h('p', { class: 'lab-msg' }, words),
          h('dl', { class: 'lab-stats' },
            dt2('Time'), dd2(fmtTime(levelTime) + (newBest && prev ? ' · new best!' : '')),
            dt2('Best'), dd2(fmtTime(bests[key].time)),
            dt2('Stars'), dd2(stats.stars + ' of ' + stats.total),
            dt2('Secrets'), dd2(stats.secrets + ' of ' + stats.secretsTotal),
            dt2('Spotted'), dd2(stats.caught === 0 ? 'never!' : stats.caught + (stats.caught === 1 ? ' time' : ' times'))),
          h('div', { class: 'lab-row' }, next, again, h('button', { type: 'button', class: 'btn', onclick: showTitle }, 'Levels'))]);
        api.status('Level ' + key + ' complete in ' + fmtTime(levelTime) + ', with ' + stats.stars + ' of ' + stats.total + ' stars.' + (newBest && prev ? ' A new best time!' : ''));
        api.celebrate(last ? 'You escaped the Labyrinth!' : newBest && prev ? 'New best on level ' + key + ': ' + fmtTime(levelTime) : 'Level ' + key + ' complete!');
        try { (next || again).focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
      function toggleMap() {
        mapOn = !mapOn;
        api.sound('click');
        padKeys.map.setAttribute('aria-pressed', String(mapOn));
        api.announce(mapOn ? 'Map on. Pink squares show what the robots can see.' : 'Map off.');
        syncData();
      }

      /* ---------- the main loop: move everything a little, then draw, about 60 times a second ---------- */
      var raf = 0, lastT = 0, fpsT = 0, fpsN = 0;
      function startLoop() { if (raf || destroyed) return; lastT = 0; raf = requestAnimationFrame(tick); }
      function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
      function tick(now) {
        raf = 0;
        if (destroyed || state !== 'playing') return;
        var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 1 / 60;
        lastT = now;
        update(dt);
        if (state !== 'playing') return;
        render();
        fpsT += dt; fpsN++;
        if (fpsT >= 0.5) { canvas.dataset.fps = String(Math.round(fpsN / fpsT)); fpsT = 0; fpsN = 0; }
        syncData();
        raf = requestAnimationFrame(tick);
      }
      function inp(a) { return keyAct[a] || padAct[a] ? 1 : 0; }
      function update(dt) {
        clock += dt; levelTime += dt;
        if (grace > 0) grace -= dt;
        if (tipAt && clock >= tipAt) { tipAt = 0; if (L.tip && clock > msgUntil) say(L.tip, 3.2, 1); }
        var tIn = inp('tr') - inp('tl'), fw = inp('fwd') - inp('back'), st = inp('sr') - inp('sl');
        if (tIn || fw || st) idleFor = 0; else idleFor += dt;
        /* turning and walking speed up and slow down quickly, which feels smooth without feeling slippery */
        P.turnV += (tIn * TURN - P.turnV) * Math.min(1, dt * 12);
        if (!tIn && Math.abs(P.turnV) < 0.02) P.turnV = 0;
        P.a = wrapAngle(P.a + P.turnV * dt);
        var ca = Math.cos(P.a), sa = Math.sin(P.a), sp = fw > 0 ? MOVE : BACK, k = fw && st ? 0.75 : 1;
        var vx = (ca * fw * sp - sa * st * SIDE) * k, vy = (sa * fw * sp + ca * st * SIDE) * k, acc = Math.min(1, dt * 14);
        P.vx += (vx - P.vx) * acc; P.vy += (vy - P.vy) * acc;
        if (!fw && !st && Math.abs(P.vx) + Math.abs(P.vy) < 0.02) P.vx = P.vy = 0;
        tryMove(P.vx * dt, 0); tryMove(0, P.vy * dt);
        for (var i = 0; i < doors.length; i++) { var d = doors[i]; if (d.opening && d.open < 1) d.open = Math.min(1, d.open + dt * DOOR_SPEED); }
        if (pw) stepPush(dt);
        pickups();
        if (state === 'playing') updateRobots(dt);
      }
      /* Read-only numbers on the canvas (data-x, data-stars and so on) for the automated play-test. Only changed
         values are written. */
      var synced = {};
      function put(k, v) { if (synced[k] !== v) { synced[k] = v; canvas.dataset[k] = v; } }
      function syncData() {
        put('state', state); put('level', String(levelIdx + 1)); put('x', P.x.toFixed(2)); put('y', P.y.toFixed(2)); put('a', P.a.toFixed(3));
        put('stars', String(stats.stars)); put('total', String(stats.total)); put('keys', keyList()); put('caught', String(stats.caught));
        put('secrets', String(stats.secrets)); put('map', mapOn ? '1' : '0'); put('time', levelTime.toFixed(1)); put('alert', alertLevel.toFixed(2));
      }

      /* ---------- input: keyboard, the on-screen keys, and taps on the screen ---------- */
      var keyAct = { fwd: 0, back: 0, tl: 0, tr: 0, sl: 0, sr: 0 }, padAct = { fwd: 0, back: 0, tl: 0, tr: 0, sl: 0, sr: 0 };
      function clearInput() {
        Object.keys(keyAct).forEach(function (k) { keyAct[k] = 0; padAct[k] = 0; });
        Object.keys(padKeys).forEach(function (k) { padKeys[k].classList.remove('down'); });
      }
      function actFor(e) {
        switch (e.key) {
          case 'ArrowUp': case 'w': case 'W': return 'fwd';
          case 'ArrowDown': case 's': case 'S': return 'back';
          case 'ArrowLeft': return e.shiftKey ? 'sl' : 'tl';
          case 'ArrowRight': return e.shiftKey ? 'sr' : 'tr';
          case 'a': case 'A': return 'tl';
          case 'd': case 'D': return 'tr';
          case 'q': case 'Q': return 'sl';
          case 'e': case 'E': return 'sr';
          case ' ': case 'Spacebar': case 'Enter': return 'use';
          case 'm': case 'M': return 'map';
          case 'p': case 'P': case 'Escape': return 'pause';
        }
        return null;
      }
      function onKeyDown(e) {
        if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
        var tgt = e.target, act = actFor(e);
        if (!act || (tgt && tgt.closest && tgt.closest('input, select, textarea'))) return;
        var inRoot = !!(tgt && root.contains(tgt));
        /* Enter or Space on one of the on-screen keys presses that key instead (see onPadClick). */
        if (inRoot && (act === 'use') && tgt.closest && tgt.closest('button')) return;
        if (state === 'playing') {
          if (!inRoot && tgt && tgt !== document.body && tgt.closest && tgt.closest('a, button, summary, [tabindex]')) return;
          e.preventDefault();
          if (act === 'use') { if (!e.repeat) useAction(); return; }
          if (act === 'map') { if (!e.repeat) toggleMap(); return; }
          if (act === 'pause') { if (!e.repeat) pause(); return; }
          keyAct[act] = 1; idleFor = 0;
        } else if (state === 'paused' && act === 'pause' && e.key !== 'Escape' && !e.repeat) { e.preventDefault(); resumeGame(); }
        else if (tgt === canvas && act === 'use' && state === 'title') { e.preventDefault(); startLevel(levelIdx); }
      }
      function onKeyUp(e) {
        if (e.key === 'ArrowLeft') { keyAct.tl = 0; keyAct.sl = 0; return; }
        if (e.key === 'ArrowRight') { keyAct.tr = 0; keyAct.sr = 0; return; }
        var act = actFor(e);
        if (act && keyAct[act] !== undefined) keyAct[act] = 0;
      }
      function padPress(act, b) {
        if (act === 'pause') { if (state === 'playing') pause(); else if (state === 'paused') resumeGame(); return false; }
        if (state !== 'playing') return false;
        if (act === 'use') { useAction(); b.classList.add('down'); later(function () { b.classList.remove('down'); }, 130); return false; }
        if (act === 'map') { toggleMap(); return false; }
        padAct[act] = 1; b.classList.add('down'); idleFor = 0;
        return true;
      }
      Object.keys(padKeys).forEach(function (act) {
        var b = padKeys[act];
        if (act === 'map') b.setAttribute('aria-pressed', 'false');
        function up() { if (padAct[act] !== undefined) padAct[act] = 0; if (act !== 'use') b.classList.remove('down'); }
        b.addEventListener('pointerdown', function (e) {
          if (e.button > 0) return;
          e.preventDefault();
          api.unlockSound();
          if (padPress(act, b)) { try { b.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } }
        });
        b.addEventListener('pointerup', up);
        b.addEventListener('pointercancel', up);
        b.addEventListener('lostpointercapture', up);
        b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        /* A click with no pointer (Enter or Space on a focused key, or a switch device) gives a short press. */
        b.addEventListener('click', function (e) {
          if (e.detail !== 0) return;
          if (padPress(act, b) && padAct[act] !== undefined) later(up, 260);
        });
      });
      canvas.addEventListener('pointerdown', function (e) {
        if (state !== 'playing' || e.button > 0) return;
        e.preventDefault(); focusGame(); useAction();
      });
      function onVisibility() { if (document.hidden && state === 'playing') pause(); }
      function onBlur() { clearInput(); }
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('blur', onBlur);

      /* ---------- size: follow the page, and redraw when it changes ---------- */
      var lastW = -1, lastH = -1, lastCls = null, lastDpr = 0;
      function maybeLayout() {
        var w = root.clientWidth, hh = window.innerHeight, cls = document.documentElement.classList.contains('classroom'), r = Math.min(2, window.devicePixelRatio || 1);
        if (w === lastW && hh === lastH && cls === lastCls && r === lastDpr) return;
        lastW = w; lastH = hh; lastCls = cls; lastDpr = r;
        layout();
      }
      var ro = new ResizeObserver(maybeLayout);
      ro.observe(root);
      window.addEventListener('resize', maybeLayout);
      function onFs() { later(maybeLayout, 80); }
      document.addEventListener('fullscreenchange', onFs);

      showTitle();
      maybeLayout();

      return {
        destroy: function () {
          destroyed = true;
          stopLoop();
          timers.forEach(clearTimeout); timers = [];
          ro.disconnect();
          window.removeEventListener('resize', maybeLayout);
          window.removeEventListener('blur', onBlur);
          document.removeEventListener('keydown', onKeyDown);
          document.removeEventListener('keyup', onKeyUp);
          document.removeEventListener('visibilitychange', onVisibility);
          document.removeEventListener('fullscreenchange', onFs);
        }
      };
    }
  });
})();
