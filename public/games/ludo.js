/* Ludo for Games in Time. Alfred Collier patented Royal Ludo in England in 1891; Ludo was in the shops by 1896.
   It is a simpler, quicker English version of Pachisi, a race game from India.

   The rules played here are plain English Ludo as described by pachisi.vegard2.net (which draws on
   David Parlett's Oxford History of Board Games). We could not open an 1890s rule sheet:
   - Two, three or four players, four tokens each, one die. Tokens race clockwise round the cross.
   - A token can only leave its yard on a throw of six. It goes onto its own coloured starting square.
   - A six also earns another throw.
   - Move one token the number thrown. If you can move, you must.
   - Two tokens of the same colour may not share a square.
   - Landing exactly on a rival's token sends it back to its yard. There are no safe squares and no blocks.
   - After a full lap a token turns up its own coloured home column. It needs an exact throw to reach
     the centre; a throw that is too big cannot be used by that token.
   - The first player with all four tokens home wins.
   Common modern house rules that are NOT used: three sixes in a row losing the turn, two tokens making
   a block, star-shaped safe squares, extra throws for captures or for getting home, and two dice.

   How this file is organised:
     Part 1  The board: where the 52 track squares, home columns, yards and centre are.
     Part 2  The rules: which tokens can move after a throw.
     Part 3  The computer player, a short list of rules, explained in plain words.
     Part 4  The screen: board, tokens, a tumbling die, sounds, touch and keyboard.

   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  /* =====================================================================
     PART 1: THE BOARD
     The board is a 15 by 15 grid (row, column), with Red's yard in the top left, Green's top right,
     Yellow's bottom right and Blue's bottom left. Seats are numbered clockwise: 0 Red, 1 Green,
     2 Yellow, 3 Blue, which is also the order of play.
     A token's progress: -1 in its yard, 0 to 50 on the track (0 is its starting square),
     51 to 55 up its home column, 56 home in the centre.
     ===================================================================== */

  var SEATS = [
    { name: 'Red', key: 'red', letter: 'R' },
    { name: 'Green', key: 'green', letter: 'G' },
    { name: 'Yellow', key: 'yellow', letter: 'Y' },
    { name: 'Blue', key: 'blue', letter: 'B' }
  ];
  var HOME = 56, LAST_TRACK = 50;
  var START = [0, 13, 26, 39];   /* where each colour joins the 52-square track */

  /* The 52 track squares in clockwise order, starting with Red's starting square. */
  var LOOP = (function () {
    var s = [], i;
    for (i = 1; i <= 5; i++) s.push([6, i]);        /* left arm, top row, heading right */
    for (i = 5; i >= 0; i--) s.push([i, 6]);        /* top arm, left column, heading up */
    s.push([0, 7]);                                 /* top end */
    for (i = 0; i <= 5; i++) s.push([i, 8]);        /* top arm, right column, heading down */
    for (i = 9; i <= 14; i++) s.push([6, i]);       /* right arm, top row, heading right */
    s.push([7, 14]);                                /* right end */
    for (i = 14; i >= 9; i--) s.push([8, i]);       /* right arm, bottom row, heading left */
    for (i = 9; i <= 14; i++) s.push([i, 8]);       /* bottom arm, right column, heading down */
    s.push([14, 7]);                                /* bottom end */
    for (i = 14; i >= 9; i--) s.push([i, 6]);       /* bottom arm, left column, heading up */
    for (i = 5; i >= 0; i--) s.push([8, i]);        /* left arm, bottom row, heading left */
    s.push([7, 0]);                                 /* left end */
    s.push([6, 0]);                                 /* back to just before Red's start */
    return s;
  })();

  /* Turns a point (x across, y down, in squares) a quarter turn clockwise round the board's centre, k times.
     Everything is worked out for Red and turned round for the other colours. */
  function rot(x, y, k) {
    for (var i = 0; i < k; i++) { var nx = 15 - y; y = x; x = nx; }
    return [x, y];
  }
  var YARD_SPOTS = [[2, 2], [4, 2], [2, 4], [4, 4]];
  var HOME_SPOTS = [[6.42, 7.2], [6.42, 7.8], [6.98, 7.2], [6.98, 7.8]];
  function absOf(k, p) { return (START[k] + p) % 52; }

  /* The centre of a token, in squares, and how big it is drawn. */
  function spotOf(k, i, p, homeSlot) {
    if (p < 0) return { xy: rot(YARD_SPOTS[i][0], YARD_SPOTS[i][1], k), size: 1.55 };
    if (p <= LAST_TRACK) { var rc = LOOP[absOf(k, p)]; return { xy: [rc[1] + 0.5, rc[0] + 0.5], size: 0.9 }; }
    if (p < HOME) return { xy: rot(p - 50 + 0.5, 7.5, k), size: 0.9 };
    var hs = HOME_SPOTS[homeSlot || 0];
    return { xy: rot(hs[0], hs[1], k), size: 0.6 };
  }

  /* =====================================================================
     PART 2: THE RULES
     tok[k] is a list of 4 progress numbers for seat k, or null if nobody sits there.
     A move is { token, from, to, victim } where victim is { seat, token } or null.
     ===================================================================== */

  function ownAt(mine, q, skip) {
    for (var i = 0; i < 4; i++) if (i !== skip && mine[i] === q) return true;
    return false;
  }
  function rivalAt(tok, k, abs) {
    for (var j = 0; j < 4; j++) {
      if (j === k || !tok[j]) continue;
      for (var i = 0; i < 4; i++) {
        var p = tok[j][i];
        if (p >= 0 && p <= LAST_TRACK && absOf(j, p) === abs) return { seat: j, token: i };
      }
    }
    return null;
  }
  function legalMoves(tok, k, die) {
    var out = [], mine = tok[k];
    for (var i = 0; i < 4; i++) {
      var p = mine[i], q;
      if (p === HOME) continue;
      if (p < 0) { if (die !== 6) continue; q = 0; }           /* a six brings a token out */
      else { q = p + die; if (q > HOME) continue; }            /* an exact throw is needed to get home */
      if (q !== HOME && ownAt(mine, q, i)) continue;            /* your own tokens may not share a square */
      out.push({ token: i, from: p, to: q, victim: q <= LAST_TRACK ? rivalAt(tok, k, absOf(k, q)) : null });
    }
    return out;
  }
  function homeCount(tok, k) {
    var n = 0;
    for (var i = 0; i < 4; i++) if (tok[k][i] === HOME) n++;
    return n;
  }

  /* =====================================================================
     PART 3: THE COMPUTER PLAYER

     The computer does not look ahead. It follows a short list of rules, in this order, and uses the
     first rule that fits:
     1. Capture. If a token can land on a rival, do it. If there is a choice, send back the rival that
        had gone furthest, because that hurts them most.
     2. Bring a token out. On a six, if a token is waiting in the yard, bring it onto the track.
     3. Get out of danger. A token is in danger if a rival token is 1 to 6 squares behind it (or it is
        sitting on a rival's starting square while that rival still has tokens in its yard). If a move
        takes a token in danger to a safe square, do it.
     4. Go home. If a token can reach the centre with exactly this throw, take it home.
     5. Otherwise, move the token that is furthest behind, so no token gets left behind, but not onto
        a square right in front of a rival if a safer move exists.
     ===================================================================== */

  /* Could a rival token reach this track square with one throw? */
  function inDanger(tok, k, abs, ignore) {
    for (var j = 0; j < 4; j++) {
      if (j === k || !tok[j]) continue;
      for (var i = 0; i < 4; i++) {
        if (ignore && ignore.seat === j && ignore.token === i) continue;
        var p = tok[j][i];
        if (p < 0) { if (abs === START[j]) return true; continue; }
        if (p > LAST_TRACK) continue;
        for (var d = 1; d <= 6; d++) if (p + d <= LAST_TRACK && absOf(j, p + d) === abs) return true;
      }
    }
    return false;
  }
  function safeLanding(tok, k, m) {
    return m.to > LAST_TRACK || !inDanger(tok, k, absOf(k, m.to), m.victim);
  }
  function computerChoice(tok, k, die, moves) {
    var i, best;
    /* Rule 1: capture */
    var caps = moves.filter(function (m) { return m.victim; });
    if (caps.length) {
      best = caps[0];
      for (i = 1; i < caps.length; i++) if (tok[caps[i].victim.seat][caps[i].victim.token] > tok[best.victim.seat][best.victim.token]) best = caps[i];
      return { move: best, why: 'capture' };
    }
    /* Rule 2: bring a token out on a six */
    if (die === 6) {
      var out = moves.filter(function (m) { return m.from < 0; });
      if (out.length) return { move: out[0], why: 'out' };
    }
    /* Rule 3: get out of danger */
    var escapes = moves.filter(function (m) { return m.from >= 0 && m.from <= LAST_TRACK && inDanger(tok, k, absOf(k, m.from)) && safeLanding(tok, k, m); });
    if (escapes.length) {
      best = escapes[0];
      for (i = 1; i < escapes.length; i++) if (escapes[i].from > best.from) best = escapes[i];
      return { move: best, why: 'escape' };
    }
    /* Rule 4: go home */
    var home = moves.filter(function (m) { return m.to === HOME; });
    if (home.length) return { move: home[0], why: 'home' };
    /* Rule 5: the token furthest behind, preferring a safe landing */
    var onTrack = moves.filter(function (m) { return m.from >= 0; });
    var pool = onTrack.length ? onTrack : moves;
    var safe = pool.filter(function (m) { return safeLanding(tok, k, m); });
    var list = safe.length ? safe : pool;
    best = list[0];
    for (i = 1; i < list.length; i++) if (list[i].from < best.from) best = list[i];
    return { move: best, why: 'behind' };
  }

  /* =====================================================================
     PART 4: THE SCREEN
     ===================================================================== */

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, String(attrs[k])); });
    return el;
  }

  /* Die faces: which of the 9 places on a 3 by 3 grid have a pip. */
  var PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  /* How to turn the cube so a face points at you: [rotateX, rotateY] in degrees. */
  var FACE_TURN = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };

  var CSS = [
    /* The 1890s hall: madder red, sage-teal, ochre and indigo on a cream board. */
    '.game-ludo { --ld-cream: color-mix(in srgb, var(--ink) 95%, var(--gold)); --ld-line: color-mix(in srgb, var(--bg) 30%, transparent); --ld-edge: var(--bg);',
    '  --ld-shadow: color-mix(in srgb, var(--bg) 60%, transparent); --ld-shine: color-mix(in srgb, var(--ink) 65%, transparent); }',
    '.game-ludo .c0 { --c: var(--vermilion); } .game-ludo .c1 { --c: var(--peacock); } .game-ludo .c2 { --c: var(--gold); } .game-ludo .c3 { --c: var(--cobalt); }',
    '.game-ludo .c0, .game-ludo .c1, .game-ludo .c2, .game-ludo .c3 { --c-dark: color-mix(in srgb, var(--c) 52%, var(--bg)); --c-soft: color-mix(in srgb, var(--c) 30%, var(--ink)); --c-light: color-mix(in srgb, var(--c) 55%, var(--ink)); }',
    '.game-ludo .field { max-width: 100%; min-width: 0; } .game-ludo .field select { min-width: 0; flex: 1 1 auto; }',
    '.game-ludo .ld-main { display: grid; grid-template-columns: minmax(0, 600px) minmax(210px, 270px); gap: clamp(12px, 2.5vw, 26px); justify-content: center; align-items: start; }',
    '@media (max-width: 800px) { .game-ludo .ld-main { grid-template-columns: minmax(0, 1fr); } }',
    '.game-ludo .ld-wrap { position: relative; min-width: 0; }',
    '.game-ludo .ld-board { position: relative; display: grid; grid-template-columns: repeat(15, minmax(0, 1fr)); grid-template-rows: repeat(15, minmax(0, 1fr)); aspect-ratio: 1 / 1; max-width: none;',
    '  border: 6px solid var(--ld-edge); border-radius: 10px; background: var(--ld-cream); box-shadow: 0 0 0 2px var(--gold), 0 14px 30px var(--ld-shadow); container-type: inline-size; user-select: none; -webkit-user-select: none; touch-action: manipulation; cursor: pointer; }',
    '.game-ludo .ld-cell { position: relative; background: var(--ld-cream); box-shadow: inset 0 0 0 .5px var(--ld-line); }',
    '.game-ludo .ld-cell.is-col, .game-ludo .ld-cell.is-start { background: var(--c); }',
    '.game-ludo .ld-cell.is-start svg { position: absolute; inset: 18%; width: 64%; height: 64%; }',
    '.game-ludo .ld-cell.is-start path { fill: none; stroke: var(--ld-cream); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }',
    '.game-ludo .ld-cell.is-last { box-shadow: inset 0 0 0 2px var(--ld-edge); }',
    '.game-ludo .ld-yard { position: relative; background: var(--c); box-shadow: inset 0 0 0 1px var(--ld-line); }',
    '.game-ludo .ld-plate { position: absolute; inset: 13%; border-radius: 14%; background: var(--ld-cream); box-shadow: inset 0 2px 6px var(--ld-shadow), 0 0 0 2px var(--c-dark); }',
    '.game-ludo .ld-hole { position: absolute; width: 30%; height: 30%; border-radius: 50%; background: var(--c-soft); box-shadow: inset 0 2px 4px var(--ld-shadow); transform: translate(-50%, -50%); }',
    '.game-ludo .ld-yard-name { position: absolute; left: 0; right: 0; bottom: 1.5%; text-align: center; font-family: var(--font-poster); font-size: 3.1cqw; line-height: 1; color: var(--ld-cream); letter-spacing: .04em; pointer-events: none; }',
    '.game-ludo .ld-centre { position: relative; }',
    '.game-ludo .ld-centre svg { position: absolute; inset: 0; width: 100%; height: 100%; }',
    '.game-ludo .ld-centre polygon { stroke: var(--ld-edge); stroke-width: .04; }',
    /* Tokens: chunky bone-and-paint counters with the colour letter, so colour is not the only clue. */
    '.game-ludo .ld-layer { position: absolute; inset: 0; pointer-events: none; z-index: 2; }',
    '.game-ludo .ld-token { position: absolute; border-radius: 50%; font-size: 3cqw; outline: none; }',
    '.game-ludo .ld-token.in-yard { font-size: 5cqw; } .game-ludo .ld-token.at-home { font-size: 2cqw; }',
    '.game-ludo .ld-token.is-moving { z-index: 6; }',
    '.game-ludo .ld-face { position: absolute; inset: 0; border-radius: 50%; display: grid; place-items: center; font-family: var(--font-head); font-weight: 900; line-height: 1; color: var(--c-dark);',
    '  background: radial-gradient(circle at 50% 50%, var(--c) 0 52%, var(--c-light) 56% 64%, var(--c) 68%), radial-gradient(circle at 33% 27%, var(--ld-shine) 0, transparent 46%), var(--c);',
    '  background-blend-mode: normal, screen, normal; border: 2px solid var(--c-dark); box-shadow: 0 .14em 0 var(--c-dark), 0 .25em .4em var(--ld-shadow); transition: transform .15s ease; }',
    '.game-ludo .ld-token.is-movable .ld-face { box-shadow: 0 0 0 2px var(--ld-edge), 0 0 0 5px var(--gold), 0 0 14px 4px var(--gold); animation: ld-glow 1s ease-in-out infinite; }',
    '.game-ludo .ld-token:focus-visible .ld-face { box-shadow: 0 0 0 3px var(--ld-edge), 0 0 0 7px var(--ink), 0 0 0 9px var(--ld-edge); transform: scale(1.15); }',
    '@keyframes ld-glow { 50% { transform: scale(1.12); } }',
    '.game-ludo .ld-banner { position: absolute; inset: 0; z-index: 8; display: grid; place-items: center; pointer-events: none; }',
    '.game-ludo .ld-banner-card { pointer-events: auto; text-align: center; padding: 1rem 1.4rem 1.2rem; border-radius: 18px; background: color-mix(in srgb, var(--surface) 94%, transparent); color: var(--ink); border: 2px solid var(--gold); box-shadow: 0 14px 40px var(--ld-shadow); max-width: 86%; animation: ld-banner .45s cubic-bezier(.2, 1.4, .4, 1) both; }',
    '.game-ludo .ld-banner-title { font-family: var(--font-poster); font-size: clamp(1.9rem, 1.2rem + 3vw, 3rem); line-height: 1.05; color: var(--gold); margin: 0 0 .4rem; }',
    '.game-ludo .ld-banner-text { margin: 0 0 .8rem; font-weight: 600; }',
    '@keyframes ld-banner { 0% { transform: scale(.6); opacity: 0; } 100% { transform: none; opacity: 1; } }',
    /* The side panel: the die, what just happened, and the players. */
    '.game-ludo .ld-side { display: grid; gap: .9rem; align-content: start; min-width: 0; }',
    '.game-ludo .ld-dicebox { display: flex; align-items: center; gap: .9rem; }',
    '.game-ludo .ld-die-btn { flex: none; width: 96px; height: 96px; padding: 0; border-radius: 24px; border: 3px solid var(--line); background: var(--surface-2); display: grid; place-items: center; perspective: 420px; cursor: pointer; }',
    '.game-ludo .ld-die-btn[aria-disabled="true"] { cursor: default; }',
    '.game-ludo .ld-die-btn.is-ready { border-color: var(--c, var(--gold)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c, var(--gold)) 35%, transparent), 0 0 22px color-mix(in srgb, var(--c, var(--gold)) 55%, transparent); }',
    /* When it is your throw, the die wobbles to invite a tap. */
    '.game-ludo .ld-die-btn.is-ready .ld-tilt { animation: ld-invite 1.3s ease-in-out infinite; }',
    '@keyframes ld-invite { 0%, 100% { transform: rotateX(-16deg) rotateY(20deg); } 50% { transform: translateY(-5px) rotateX(-16deg) rotateY(20deg) rotateZ(-8deg); } }',
    '.game-ludo .ld-tilt { width: 58px; height: 58px; transform-style: preserve-3d; transform: rotateX(-16deg) rotateY(20deg); }',
    '.game-ludo .ld-cube { position: relative; width: 58px; height: 58px; transform-style: preserve-3d; }',
    '.game-ludo .ld-side-face { position: absolute; inset: 0; border-radius: 12px; background: var(--ld-cream); border: 2px solid color-mix(in srgb, var(--ld-cream) 70%, var(--bg)); display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); padding: 8px; backface-visibility: hidden; }',
    '.game-ludo .ld-pip { width: 11px; height: 11px; border-radius: 50%; background: var(--bg); place-self: center; box-shadow: inset 0 2px 2px color-mix(in srgb, var(--ink) 25%, transparent); }',
    '.game-ludo .ld-roll-word { display: grid; gap: .15rem; min-width: 0; }',
    '.game-ludo .ld-roll-word strong { font-family: var(--font-poster); font-weight: 400; font-size: 1.5rem; line-height: 1.1; color: var(--gold); }',
    '.game-ludo .ld-roll-word span { font-size: .9rem; color: var(--ink-muted); }',
    '.game-ludo .ld-say { margin: 0; font-family: var(--font-head); font-weight: 800; font-size: 1.05rem; line-height: 1.3; min-height: 2.6em; }',
    '.game-ludo .ld-players { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; }',
    '.game-ludo .ld-players li { margin: 0; display: flex; align-items: center; gap: .55rem; padding: .35rem .7rem .35rem .4rem; border-radius: 999px; border: 2px solid var(--line); font-weight: 700; }',
    '.game-ludo .ld-players li.is-turn { border-color: var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); }',
    '.game-ludo .ld-players .ld-mini { position: relative; width: 26px; height: 26px; flex: none; font-size: 13px; }',
    '.game-ludo .ld-players .ld-name { display: grid; line-height: 1.1; min-width: 0; }',
    '.game-ludo .ld-players .ld-name small { font-size: .74rem; font-weight: 700; color: var(--ink-muted); text-transform: uppercase; letter-spacing: .08em; }',
    '.game-ludo .ld-players .ld-count { margin-left: auto; font-variant-numeric: tabular-nums; color: var(--ink-muted); font-weight: 700; white-space: nowrap; }',
    '.game-ludo .ld-wins { font-size: .9rem; color: var(--ink-muted); margin: 0; }',
    '@media (max-width: 800px) { .game-ludo .ld-side { grid-template-columns: auto minmax(0, 1fr); align-items: center; } .game-ludo .ld-players, .game-ludo .ld-wins { grid-column: 1 / -1; } .game-ludo .ld-players { grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr)); } .game-ludo .ld-roll-word { display: none; } }',
    '@media (max-width: 480px) { .game-ludo .field select { font-size: .95rem; padding-inline: .6rem; } .game-ludo .ld-players li { font-size: .95rem; padding-block: .25rem; } .game-ludo .ld-wrap { margin-inline: calc(-1 * clamp(12px, 2.6vw, 26px) + 2px); } .game-ludo .ld-board { border-width: 3px; } .game-ludo .ld-die-btn { width: 84px; height: 84px; } .game-ludo .ld-say { font-size: 1rem; } }',
    '.classroom .game-ludo .ld-main { grid-template-columns: minmax(0, min(76vh, 760px)) minmax(210px, 300px); }',
    '@media (prefers-reduced-motion: reduce) { .game-ludo .ld-token.is-movable .ld-face, .game-ludo .ld-die-btn.is-ready .ld-tilt, .game-ludo .ld-banner-card { animation: none; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'ludo',
    frame: 'table',
    mount: function (root, api) {
      var h = api.h;
      root.appendChild(h('style', null, CSS));

      var destroyed = false, timers = [];
      function later(fn, ms) {
        var id = setTimeout(function () {
          var k = timers.indexOf(id);
          if (k >= 0) timers.splice(k, 1);
          if (!destroyed) fn();
        }, ms);
        timers.push(id);
        return id;
      }
      function stopTimers() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers = []; }

      var RM = !!api.reducedMotion;
      var THINK_MS = RM ? 0 : 350;        /* the computer's pause before it throws */
      var TUMBLE_MS = RM ? 0 : 620;       /* the die tumbling */
      var CHOOSE_MS = RM ? 0 : 300;       /* the computer's pause before it moves */
      var HOP_MS = RM ? 0 : 150;          /* one square of a token's journey */
      var NEXT_MS = RM ? 0 : 200;         /* a breath before the next turn */
      var READ_MS = 900;                  /* reading time when nobody can move; reading, not motion, so always kept */

      /* ----- settings, remembered between visits ----- */
      var OPTIONS = { c1: 'You + 1 computer', c2: 'You + 2 computers', c3: 'You + 3 computers', p2: '2 players', p3: '3 players', p4: '4 players' };
      var playersOpt = api.store.get('players', 'c1');
      if (!OPTIONS[playersOpt]) playersOpt = 'c1';
      var myColour = api.store.get('colour', 0);
      if ([0, 1, 2, 3].indexOf(myColour) < 0) myColour = 0;
      var wins = api.store.get('wins', 0);
      if (typeof wins !== 'number') wins = 0;

      /* ----- game state ----- */
      var seats = [], isHuman = [], tok = [null, null, null, null], homeSlots, turn = 0, phase = 'roll', die = 6, moves = [], over = false, lastLanding = -1;
      var queuedDice = [];   /* only the play-test script fills this */
      var keyboardRoll = false;

      /* ----- controls ----- */
      var playersSel = h('select', { id: 'ld-players', onchange: function () { playersOpt = playersSel.value; api.store.set('players', playersOpt); newGame(); } },
        Object.keys(OPTIONS).map(function (k) { return h('option', { value: k }, OPTIONS[k]); }));
      var colourSel = h('select', { id: 'ld-colour', onchange: function () { myColour = Number(colourSel.value); api.store.set('colour', myColour); newGame(); } },
        SEATS.map(function (s, k) { return h('option', { value: String(k) }, s.name); }));
      var colourField = h('label', { class: 'field', for: 'ld-colour' }, 'Your colour', colourSel);
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(); } }, 'New game');
      root.appendChild(h('div', { class: 'game-toolbar' }, h('label', { class: 'field', for: 'ld-players' }, 'Players', playersSel), colourField, newBtn));

      /* ----- the board ----- */
      var boardEl = h('div', { class: 'ld-board board', role: 'group', 'aria-label': 'Ludo board', onclick: onBoardClick });
      var cellEls = {};
      (function buildBoard() {
        var k, r, c;
        /* Yards. */
        var yardAt = [[1, 1], [1, 10], [10, 10], [10, 1]];
        for (k = 0; k < 4; k++) {
          var plate = h('div', { class: 'ld-plate' });
          YARD_SPOTS.forEach(function (sp, i) {
            var xy = rot(sp[0], sp[1], k), base = rot(3, 3, k);
            /* Position each hole inside the yard (6 by 6 squares). */
            var lx = (xy[0] - (base[0] - 3)) / 6, ly = (xy[1] - (base[1] - 3)) / 6;
            var hole = h('span', { class: 'ld-hole' });
            hole.style.left = ((lx - 0.13) / 0.74 * 100) + '%';
            hole.style.top = ((ly - 0.13) / 0.74 * 100) + '%';
            plate.appendChild(hole);
          });
          var yard = h('div', { class: 'ld-yard c' + k, 'aria-hidden': 'true' }, plate, h('span', { class: 'ld-yard-name' }, SEATS[k].name));
          yard.style.gridArea = yardAt[k][0] + ' / ' + yardAt[k][1] + ' / span 6 / span 6';
          boardEl.appendChild(yard);
        }
        /* The cross: every track square and home column square. */
        var colour = {};
        for (k = 0; k < 4; k++) {
          for (var step = 1; step <= 5; step++) { var p = rot(step + 0.5, 7.5, k); colour[Math.floor(p[1]) + ',' + Math.floor(p[0])] = { k: k, col: true }; }
          var st = LOOP[START[k]];
          colour[st[0] + ',' + st[1]] = { k: k, start: true };
        }
        for (r = 0; r < 15; r++) {
          for (c = 0; c < 15; c++) {
            var inArm = (r >= 6 && r <= 8) !== (c >= 6 && c <= 8);
            if (!inArm) continue;
            var info = colour[r + ',' + c];
            var cell = h('div', { class: 'ld-cell' + (info ? ' c' + info.k + (info.col ? ' is-col' : ' is-start') : ''), 'aria-hidden': 'true' });
            cell.style.gridArea = (r + 1) + ' / ' + (c + 1);
            if (info && info.start) {
              /* An arrow on each starting square, pointing the way the tokens go. */
              var a = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' });
              a.appendChild(svg('path', { d: 'M4 12h15M13 6l6 6-6 6', transform: 'rotate(' + (info.k * 90) + ' 12 12)' }));
              cell.appendChild(a);
            }
            cellEls[r + ',' + c] = cell;
            boardEl.appendChild(cell);
          }
        }
        /* The centre: four triangles, one for each colour's way home. */
        var centre = h('div', { class: 'ld-centre', 'aria-hidden': 'true' });
        centre.style.gridArea = '7 / 7 / span 3 / span 3';
        var s = svg('svg', { viewBox: '0 0 3 3', preserveAspectRatio: 'none' });
        [['0,0 0,3 1.5,1.5', 0], ['0,0 3,0 1.5,1.5', 1], ['3,0 3,3 1.5,1.5', 2], ['0,3 3,3 1.5,1.5', 3]].forEach(function (t) {
          var poly = svg('polygon', { points: t[0], class: 'c' + t[1] });
          poly.style.fill = 'var(--c)';
          s.appendChild(poly);
        });
        centre.appendChild(s);
        boardEl.appendChild(centre);
      })();
      var layer = h('div', { class: 'ld-layer' });
      boardEl.appendChild(layer);
      var banner = h('div', { class: 'ld-banner', hidden: true });
      var wrap = h('div', { class: 'ld-wrap' }, boardEl, banner);

      /* ----- the die ----- */
      var cube = h('div', { class: 'ld-cube' });
      var faceTransforms = { 1: 'translateZ(29px)', 6: 'rotateY(180deg) translateZ(29px)', 3: 'rotateY(90deg) translateZ(29px)', 4: 'rotateY(-90deg) translateZ(29px)', 2: 'rotateX(90deg) translateZ(29px)', 5: 'rotateX(-90deg) translateZ(29px)' };
      [1, 2, 3, 4, 5, 6].forEach(function (v) {
        var f = h('div', { class: 'ld-side-face' });
        f.style.transform = faceTransforms[v];
        for (var spot = 1; spot <= 9; spot++) {
          if (PIPS[v].indexOf(spot) < 0) continue;
          var pip = h('span', { class: 'ld-pip' });
          pip.style.gridArea = (Math.floor((spot - 1) / 3) + 1) + ' / ' + ((spot - 1) % 3 + 1);
          f.appendChild(pip);
        }
        cube.appendChild(f);
      });
      /* The die stays focusable even while it waits (aria-disabled, not disabled), so keyboard focus can rest on it. */
      var dieBtn = h('button', { class: 'ld-die-btn', type: 'button', 'aria-label': 'Throw the die', onclick: function (ev) { if (isHuman[turn]) roll(ev.detail === 0); } }, h('div', { class: 'ld-tilt' }, cube));
      var rollBig = h('strong');
      var rollSmall = h('span', null, 'Tap the die or press R');
      var say = h('p', { class: 'ld-say', 'aria-hidden': 'true' });
      var playersList = h('ul', { class: 'ld-players', 'aria-label': 'Players' });
      var winsEl = h('p', { class: 'ld-wins' });
      var side = h('div', { class: 'ld-side' }, h('div', { class: 'ld-dicebox' }, dieBtn, h('div', { class: 'ld-roll-word' }, rollBig, rollSmall)), say, playersList, winsEl);
      root.appendChild(h('div', { class: 'ld-main' }, wrap, side));
      root.appendChild(h('p', { class: 'game-note' }, 'English Ludo, as patented in 1891: one die, a six to come out, and a six earns another throw. Land on a rival to send it back to its yard. Your own tokens may not share a square, and you need an exact throw to reach the centre. Keys: R or Space throws, Tab picks a token, Enter moves it.'));

      function showFace(v) {
        var t = FACE_TURN[v];
        cube.style.transform = 'rotateX(' + t[0] + 'deg) rotateY(' + t[1] + 'deg)';
      }
      function tumble(v) {
        var t = FACE_TURN[v];
        if (!RM && cube.animate) {
          var spinX = 720 * (api.random() < 0.5 ? 1 : -1), spinY = 360 * (api.random() < 0.5 ? 1 : -1);
          try {
            cube.animate([
              { transform: 'rotateX(0deg) rotateY(0deg)' },
              { transform: 'rotateX(' + (spinX * 0.6 + 40) + 'deg) rotateY(' + (spinY * 0.5 - 30) + 'deg)', offset: 0.55 },
              { transform: 'rotateX(' + (t[0] + spinX) + 'deg) rotateY(' + (t[1] + spinY) + 'deg)' }
            ], { duration: TUMBLE_MS, easing: 'cubic-bezier(.2, .7, .3, 1)' });
            dieBtn.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-16px) scale(1.06)', offset: 0.3 }, { transform: 'translateY(0) scale(.97)', offset: 0.75 }, { transform: 'none' }], { duration: TUMBLE_MS, easing: 'ease-out' });
          } catch (e) { /* no animation */ }
        }
        showFace(v);
      }

      /* ----- names ----- */
      function nameOf(k) { return isHuman[k] && humanCount() === 1 ? 'You' : SEATS[k].name; }
      function humanCount() { var n = 0; seats.forEach(function (k) { if (isHuman[k]) n++; }); return n; }
      function setSay(text) { api.status(text); say.textContent = text; }

      /* ----- tokens on the board ----- */
      var tokenEls = [[], [], [], []];
      function tokenLabel(k, i) {
        var p = tok[k][i], where;
        if (p < 0) where = 'in its yard';
        else if (p === HOME) where = 'home';
        else if (p > LAST_TRACK) where = 'in the home column, ' + (HOME - p) + ' from home';
        else where = (HOME - p) + ' squares from home';
        return SEATS[k].name + ' token ' + (i + 1) + ', ' + where;
      }
      function placeEl(el, k, i, p) {
        var sp = spotOf(k, i, p, homeSlots[k][i]);
        el.style.left = ((sp.xy[0] - sp.size / 2) / 15 * 100) + '%';
        el.style.top = ((sp.xy[1] - sp.size / 2) / 15 * 100) + '%';
        el.style.width = el.style.height = (sp.size / 15 * 100) + '%';
        el.classList.toggle('in-yard', p < 0);
        el.classList.toggle('at-home', p === HOME);
      }
      function frameFor(k, i, p, extra) {
        var sp = spotOf(k, i, p, homeSlots[k][i]);
        return { left: ((sp.xy[0] - sp.size / 2) / 15 * 100) + '%', top: ((sp.xy[1] - sp.size / 2) / 15 * 100) + '%', width: (sp.size / 15 * 100) + '%', height: (sp.size / 15 * 100) + '%', transform: extra || 'none' };
      }
      function buildTokens() {
        layer.replaceChildren();
        tokenEls = [[], [], [], []];
        seats.forEach(function (k) {
          for (var i = 0; i < 4; i++) {
            var el = h('div', { class: 'ld-token c' + k, role: 'button', tabindex: '-1', 'data-seat': String(k), 'data-token': String(i), onkeydown: onTokenKey },
              h('span', { class: 'ld-face', 'aria-hidden': 'true' }, SEATS[k].letter));
            placeEl(el, k, i, tok[k][i]);
            layer.appendChild(el);
            tokenEls[k][i] = el;
          }
        });
      }
      function hopTo(el, k, i, from, to, done) {
        var path = [];
        if (from < 0) path.push(0);
        else for (var p = from + 1; p <= to; p++) path.push(p);
        el.classList.add('is-moving');
        var at = from, n = 0;
        (function next() {
          if (n >= path.length) { el.classList.remove('is-moving'); done(); return; }
          var q = path[n];
          if (!RM && el.animate) {
            var a = frameFor(k, i, at), b = frameFor(k, i, q);
            var mid = { left: 'calc((' + a.left + ' + ' + b.left + ') / 2)', top: 'calc((' + a.top + ' + ' + b.top + ') / 2)', width: b.width, height: b.height, transform: 'translateY(-38%) scale(1.18)', offset: 0.5 };
            try { el.animate([a, mid, b], { duration: from < 0 ? 300 : HOP_MS, easing: 'ease-in-out' }); } catch (e) { /* no animation */ }
          }
          placeEl(el, k, i, q);
          at = q;
          n++;
          later(function () { api.sound(q === 0 && from < 0 ? 'pop' : 'clack'); next(); }, from < 0 ? (RM ? 0 : 300) : HOP_MS);
        })();
      }
      /* A captured token flies back across the board to its yard. */
      function sendHome(v) {
        var el = tokenEls[v.seat][v.token], fromP = tok[v.seat][v.token];
        tok[v.seat][v.token] = -1;
        if (!el) return;
        if (!RM && el.animate) {
          var a = frameFor(v.seat, v.token, fromP), b = frameFor(v.seat, v.token, -1);
          el.classList.add('is-moving');
          later(function () { el.classList.remove('is-moving'); }, 520);
          try { el.animate([a, { left: 'calc((' + a.left + ' + ' + b.left + ') / 2)', top: 'calc((' + a.top + ' + ' + b.top + ') / 2)', width: b.width, height: b.height, transform: 'translateY(-60%) scale(1.6) rotate(200deg)', offset: 0.5 }, b], { duration: 520, easing: 'ease-in-out' }); } catch (e) { /* no animation */ }
        }
        placeEl(el, v.seat, v.token, -1);
      }

      /* ----- drawing the panel and highlights ----- */
      function render() {
        seats.forEach(function (k) {
          for (var i = 0; i < 4; i++) {
            var el = tokenEls[k][i];
            var movable = phase === 'move' && k === turn && isHuman[k] && moves.some(function (m) { return m.token === i; });
            el.classList.toggle('is-movable', movable);
            el.setAttribute('tabindex', movable ? '0' : '-1');
            el.setAttribute('aria-label', tokenLabel(k, i) + (movable ? ', can move ' + die : ''));
            if (movable) el.removeAttribute('aria-disabled'); else el.setAttribute('aria-disabled', 'true');
          }
        });
        Object.keys(cellEls).forEach(function (key) { cellEls[key].classList.toggle('is-last', key === lastLanding); });
        var humanRoll = !over && phase === 'roll' && isHuman[turn];
        dieBtn.setAttribute('aria-disabled', String(!humanRoll));
        dieBtn.className = 'ld-die-btn c' + turn + (humanRoll ? ' is-ready' : '');
        rollBig.textContent = over ? 'Game over' : (phase === 'roll' ? (isHuman[turn] ? (humanCount() === 1 ? 'Your throw' : SEATS[turn].name + ' to throw') : SEATS[turn].name + ' throws') : 'Threw ' + die);
        rollSmall.textContent = humanRoll ? 'Tap the die or press R' : (phase === 'move' && isHuman[turn] ? 'Tap a glowing token' : '');
        playersList.replaceChildren.apply(playersList, seats.map(function (k) {
          return h('li', { class: 'c' + k + (k === turn && !over ? ' is-turn' : '') },
            h('span', { class: 'ld-mini ld-token c' + k, 'aria-hidden': 'true' }, h('span', { class: 'ld-face' }, SEATS[k].letter)),
            h('span', { class: 'ld-name' }, nameOf(k), isHuman[k] ? null : h('small', null, 'computer')),
            h('span', { class: 'ld-count' }, homeCount(tok, k) + ' of 4 home'));
        }));
        winsEl.textContent = humanCount() === 1 ? 'Your wins against the computer: ' + wins : '';
      }

      /* ----- the flow of a game ----- */
      function setUp() {
        var order = { c1: [0, 2], c2: [0, 1, 2], c3: [0, 1, 2, 3], p2: [0, 2], p3: [0, 1, 2], p4: [0, 1, 2, 3] }[playersOpt];
        var vsComputer = playersOpt.charAt(0) === 'c';
        var shift = vsComputer ? myColour : 0;
        seats = order.map(function (k) { return (k + shift) % 4; }).sort();
        isHuman = [false, false, false, false];
        seats.forEach(function (k) { isHuman[k] = !vsComputer || k === myColour; });
        tok = [null, null, null, null];
        homeSlots = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
        seats.forEach(function (k) { tok[k] = [-1, -1, -1, -1]; });
        playersSel.value = playersOpt;
        colourSel.value = String(myColour);
        colourField.hidden = !vsComputer;
      }
      function newGame() {
        stopTimers();
        over = false; phase = 'roll'; moves = []; lastLanding = -1;
        banner.hidden = true; banner.replaceChildren();
        setUp();
        buildTokens();
        showFace(6);
        api.sound('shuffle');
        var first = isHuman[myColour] && playersOpt.charAt(0) === 'c' ? myColour : seats[0];
        startTurn(first, 'New game. ');
      }
      function nextSeat(k) {
        var i = seats.indexOf(k);
        return seats[(i + 1) % seats.length];
      }
      function startTurn(k, prefix) {
        turn = k; phase = 'roll'; moves = [];
        if (isHuman[k]) {
          setSay((prefix || '') + (humanCount() === 1 ? 'Your turn: throw the die.' : SEATS[k].name + "'s turn: throw the die."));
          render();
          return;
        }
        setSay((prefix || '') + SEATS[k].name + ' is throwing...');
        render();
        later(function () { roll(false); }, THINK_MS);
      }
      function nextDie() {
        if (queuedDice.length) return queuedDice.shift();
        return 1 + Math.floor(api.random() * 6);
      }
      function roll(fromKeyboard) {
        if (over || phase !== 'roll') return;
        keyboardRoll = !!fromKeyboard;
        phase = 'rolling';
        die = nextDie();
        api.sound('dice');
        tumble(die);
        render();
        later(afterRoll, TUMBLE_MS);
      }
      function afterRoll() {
        var who = nameOf(turn);
        moves = legalMoves(tok, turn, die);
        if (!moves.length) {
          phase = 'stuck';
          var why = tok[turn].every(function (p) { return p < 0 || p === HOME; }) && die !== 6 ? ' You need a six to come out.' : '';
          if (!isHuman[turn] || humanCount() > 1) why = why.replace('You need', 'It takes');
          setSay(who + ' threw a ' + die + '. No token can move.' + why);
          render();
          later(function () { endTurn(); }, READ_MS);
          return;
        }
        phase = 'move';
        if (!isHuman[turn]) {
          setSay(who + ' threw a ' + die + '.');
          render();
          later(function () { var c = computerChoice(tok, turn, die, moves); playMove(c.move); }, CHOOSE_MS);
          return;
        }
        var outNow = die === 6 && moves.some(function (m) { return m.from < 0; });
        setSay((who === 'You' ? 'You threw a ' : who + ' threw a ') + die + (die === 6 ? '! ' : '. ') + (outNow ? 'Bring a token out, or move one.' : 'Tap a glowing token to move it.'));
        render();
        if (keyboardRoll) focusMovable(0);
      }
      function focusMovable(n) {
        var list = movableEls();
        if (list.length) list[(n + list.length) % list.length].focus();
      }
      function movableEls() {
        return moves.map(function (m) { return tokenEls[turn][m.token]; });
      }
      function chooseToken(i) {
        if (over || phase !== 'move' || !isHuman[turn]) return;
        var m = moves.filter(function (x) { return x.token === i; })[0];
        if (!m) { api.sound('wrong'); setSay('That token cannot move a ' + die + '. Pick a glowing one.'); return; }
        var hadFocus = root.contains(document.activeElement);
        playMove(m, hadFocus);
      }
      function playMove(m, refocus) {
        phase = 'anim';
        var k = turn, el = tokenEls[k][m.token];
        render();
        if (m.to === HOME) homeSlots[k][m.token] = homeCount(tok, k);
        hopTo(el, k, m.token, m.from, m.to, function () {
          tok[k][m.token] = m.to;
          var words = '';
          lastLanding = m.to <= LAST_TRACK ? LOOP[absOf(k, m.to)].join(',') : -1;
          if (m.victim) {
            sendHome(m.victim);
            api.sound('whoosh');
            later(function () { api.sound('thud'); }, RM ? 0 : 300);
            words = nameOf(k) + ' sent ' + (isHuman[m.victim.seat] && humanCount() === 1 ? 'your' : SEATS[m.victim.seat].name + "'s") + ' token back to its yard! ';
          } else if (m.from < 0) {
            words = (nameOf(k) === 'You' ? 'Your' : nameOf(k) + "'s") + ' token is out. ';
          }
          if (m.to === HOME) {
            api.sound('bell');
            words += (nameOf(k) === 'You' ? 'One of your tokens is home! ' : 'A ' + SEATS[k].name.toLowerCase() + ' token is home! ');
          }
          if (homeCount(tok, k) === 4) { render(); finish(k); return; }
          if (refocus) dieBtn.focus();
          later(function () { endTurn(words); }, NEXT_MS);
        });
      }
      function endTurn(words) {
        if (over) return;
        if (die === 6) { startTurn(turn, (words || '') + 'A six: ' + (nameOf(turn) === 'You' ? 'throw again!' : nameOf(turn) + ' throws again.') + ' '); return; }
        startTurn(nextSeat(turn), words || '');
      }
      function finish(k) {
        over = true; phase = 'over';
        var title, text;
        if (isHuman[k] && humanCount() === 1) {
          title = 'You win!';
          text = 'All four of your tokens are home.';
          wins++;
          api.store.set('wins', wins);
          api.celebrate('You win at Ludo!');
        } else if (humanCount() === 1) {
          title = SEATS[k].name + ' wins';
          text = 'The ' + SEATS[k].name.toLowerCase() + ' computer got all four tokens home first. Good game! Have another go.';
          api.sound('lose');
        } else {
          title = SEATS[k].name + ' wins!';
          text = 'All four ' + SEATS[k].name.toLowerCase() + ' tokens are home. Well played!';
          api.celebrate(SEATS[k].name + ' wins at Ludo!');
        }
        setSay(title + ' ' + text);
        render();
        banner.replaceChildren(h('div', { class: 'ld-banner-card' },
          h('p', { class: 'ld-banner-title' }, title),
          h('p', { class: 'ld-banner-text' }, text),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(); } }, 'Play again')));
        banner.hidden = false;
      }

      /* ----- touch, mouse and keyboard ----- */
      /* A tap picks the nearest glowing token within about a square, so small tokens are easy to hit on a phone. */
      function onBoardClick(ev) {
        if (over || phase !== 'move' || !isHuman[turn]) return;
        var r = boardEl.getBoundingClientRect(), border = boardEl.clientLeft || 0;
        var unit = (r.width - 2 * border) / 15;
        var x = (ev.clientX - r.left - border) / unit, y = (ev.clientY - r.top - border) / unit;
        var bestI = -1, bestD = 99;
        for (var i = 0; i < 4; i++) {
          var sp = spotOf(turn, i, tok[turn][i], homeSlots[turn][i]);
          var d = Math.sqrt(Math.pow(sp.xy[0] - x, 2) + Math.pow(sp.xy[1] - y, 2));
          if (d < bestD && d < Math.max(1.05, sp.size / 2 + 0.4)) { bestD = d; bestI = i; }
        }
        if (bestI >= 0) chooseToken(bestI);
      }
      function onTokenKey(ev) {
        var el = ev.currentTarget, k = Number(el.getAttribute('data-seat')), i = Number(el.getAttribute('data-token'));
        if (k !== turn || phase !== 'move' || !isHuman[turn]) return;
        if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') { ev.preventDefault(); ev.stopPropagation(); chooseToken(i); return; }
        if (ev.key === 'Tab' && phase === 'move' && isHuman[turn]) {
          /* Tab and Shift+Tab go round the tokens that can move. Escape goes back to the die. */
          var list = movableEls(), at = list.indexOf(el);
          if (at >= 0 && list.length > 1) { ev.preventDefault(); list[(at + (ev.shiftKey ? -1 : 1) + list.length) % list.length].focus(); }
          return;
        }
        if (ev.key === 'Escape') { ev.preventDefault(); dieBtn.focus(); }
      }
      function onRootKey(ev) {
        if (ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        var t = ev.target, tag = t && t.tagName;
        if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
        var isR = ev.key === 'r' || ev.key === 'R';
        var isSpace = ev.key === ' ' || ev.key === 'Spacebar';
        if (!isR && !isSpace) return;
        if (isSpace && tag === 'BUTTON' && t !== dieBtn) return; /* Space presses other buttons as usual */
        if (phase === 'roll' && isHuman[turn] && !over) { ev.preventDefault(); roll(true); }
        else if (phase === 'move' && isHuman[turn] && isSpace) { ev.preventDefault(); focusMovable(0); }
      }
      root.addEventListener('keydown', onRootKey);
      /* R also works when nothing on the page has focus (for example right after the page loads). */
      function onDocKey(ev) {
        if (ev.key !== 'r' && ev.key !== 'R') return;
        if (document.activeElement && document.activeElement !== document.body) return;
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
        if (phase === 'roll' && isHuman[turn] && !over) { ev.preventDefault(); roll(true); }
      }
      document.addEventListener('keydown', onDocKey);

      /* ----- a small hook for the play-test script ----- */
      root.__test = {
        dice: function (list) { queuedDice = list.slice(); },
        load: function (spec) {
          stopTimers();
          over = false; lastLanding = -1;
          banner.hidden = true; banner.replaceChildren();
          if (spec.players) playersOpt = spec.players;
          if (spec.colour != null) myColour = spec.colour;
          setUp();
          Object.keys(spec.tokens || {}).forEach(function (k) {
            tok[k] = spec.tokens[k].slice();
            var n = 0;
            for (var i = 0; i < 4; i++) if (tok[k][i] === HOME) homeSlots[k][i] = n++;
          });
          buildTokens();
          startTurn(spec.turn != null ? spec.turn : seats[0], '');
        },
        state: function () {
          return { seats: seats.slice(), human: isHuman.slice(), tok: tok.map(function (t) { return t ? t.slice() : null; }), turn: turn, phase: phase, die: die, over: over,
            movable: phase === 'move' ? moves.map(function (m) { return m.token; }) : [] };
        }
      };

      newGame();

      return {
        destroy: function () {
          destroyed = true;
          stopTimers();
          root.removeEventListener('keydown', onRootKey);
          document.removeEventListener('keydown', onDocKey);
          delete root.__test;
        }
      };
    }
  });
})();
