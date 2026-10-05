/* Draughts for Games in Time: English draughts, the game of the first world championship (1840s).

   The rules played here are English draughts, as Andrew Anderson set them down in 1852:
   - An 8 by 8 board with a dark square in each player's bottom left corner. Only the dark squares are used.
   - Each side has 12 men. Red (the darker pieces) moves first.
   - A man moves one square diagonally forward onto an empty dark square.
   - A capture is a jump: diagonally over an enemy piece next to you, onto the empty square just beyond it.
     The jumped piece is taken off the board.
   - Capturing is compulsory. If you can jump, you must, but you may choose which jump.
   - If the same piece can jump again after landing, it must keep jumping (a multi-jump).
   - A man that reaches the far row is crowned a king, and that ends the move.
   - Kings move and jump one square diagonally, forwards or backwards.
   - You lose when it is your turn and you cannot move: no pieces left, or every piece is blocked.
   - Site rule (ours, so games do not go on forever): if 40 moves each go by with no capture and no man
     moving, the game is a draw.

   How this file is organised:
     Part 1  The rules. Pure functions that only look at a board array.
     Part 2  The computer player: minimax with alpha-beta pruning, explained for a 12-year-old.
     Part 3  The screen: the board, turned-wood pieces, trays for captured pieces, sounds and keyboard.

   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  /* =====================================================================
     PART 1: THE RULES
     The board is an array of 64 numbers, row by row from the top (row 0) to the bottom (row 7).
       0 = empty, 1 = red man, 2 = red king, -1 = white man, -2 = white king.
     Red starts on rows 5 to 7 and moves up the board; White starts on rows 0 to 2 and moves down.
     A move is { from, path: [squares it lands on], caps: [squares it jumps over], crown }.
     ===================================================================== */

  var RED = 1, WHITE = -1;          /* the two sides, and also the sign of their pieces */
  var MAN = 1, KING = 2;
  var DRAW_PLIES = 80;              /* site rule: 40 moves each (80 single moves) with no capture and no man moving */

  var KING_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  var RED_DIRS = [[-1, -1], [-1, 1]];     /* red men move up the board */
  var WHITE_DIRS = [[1, -1], [1, 1]];     /* white men move down the board */

  function sideOf(p) { return p > 0 ? RED : (p < 0 ? WHITE : 0); }
  function isKing(p) { return p === KING || p === -KING; }
  function isDark(r, c) { return (r + c) % 2 === 1; }
  function crownRow(side) { return side === RED ? 0 : 7; }
  function dirsFor(p) { return isKing(p) ? KING_DIRS : (p > 0 ? RED_DIRS : WHITE_DIRS); }

  function startBoard() {
    var b = [];
    for (var i = 0; i < 64; i++) {
      var r = i >> 3, c = i & 7;
      b.push(!isDark(r, c) ? 0 : (r <= 2 ? -MAN : (r >= 5 ? MAN : 0)));
    }
    return b;
  }

  /* Every complete jump sequence the piece on `from` can make, added to `out`.
     A sequence only ends when no further jump is possible (you must keep jumping), or when a man
     lands on the far row (being crowned ends the move). Jumped pieces stay on the board until the
     move is over, so a piece can never be jumped twice and nobody can land on its square. */
  function jumpsFrom(b, from, out) {
    var piece = b[from], side = sideOf(piece), dirs = dirsFor(piece);
    b[from] = 0; /* the piece is lifted off its square while it jumps */
    function dfs(pos, path, caps) {
      var r = pos >> 3, c = pos & 7, any = false;
      for (var d = 0; d < dirs.length; d++) {
        var lr = r + 2 * dirs[d][0], lc = c + 2 * dirs[d][1];
        if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
        var mid = (r + dirs[d][0]) * 8 + (c + dirs[d][1]), land = lr * 8 + lc;
        if (sideOf(b[mid]) !== -side || b[land] !== 0 || caps.indexOf(mid) >= 0) continue;
        any = true;
        var p2 = path.concat([land]), c2 = caps.concat([mid]);
        if (!isKing(piece) && lr === crownRow(side)) out.push({ from: from, path: p2, caps: c2, crown: true });
        else dfs(land, p2, c2);
      }
      if (!any && path.length) out.push({ from: from, path: path, caps: caps, crown: false });
    }
    dfs(from, [], []);
    b[from] = piece;
  }

  /* All legal moves for `side`. If any capture exists, only captures are legal. */
  function legalMoves(b, side) {
    var caps = [], steps = [], i;
    for (i = 0; i < 64; i++) if (sideOf(b[i]) === side) jumpsFrom(b, i, caps);
    if (caps.length) return caps;
    for (i = 0; i < 64; i++) {
      var p = b[i];
      if (sideOf(p) !== side) continue;
      var dirs = dirsFor(p), r = i >> 3, c = i & 7;
      for (var d = 0; d < dirs.length; d++) {
        var tr = r + dirs[d][0], tc = c + dirs[d][1];
        if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue;
        if (b[tr * 8 + tc] === 0) steps.push({ from: i, path: [tr * 8 + tc], caps: [], crown: !isKing(p) && tr === crownRow(side) });
      }
    }
    return steps;
  }

  /* Plays a move on a copy of the board and returns the copy. */
  function applyMove(b, m) {
    var nb = b.slice(), piece = nb[m.from], to = m.path[m.path.length - 1];
    nb[m.from] = 0;
    for (var i = 0; i < m.caps.length; i++) nb[m.caps[i]] = 0;
    nb[to] = m.crown ? sideOf(piece) * KING : piece;
    return nb;
  }

  function countPieces(b, side) {
    var n = 0;
    for (var i = 0; i < 64; i++) if (sideOf(b[i]) === side) n++;
    return n;
  }

  /* =====================================================================
     PART 2: THE COMPUTER PLAYER

     How the computer chooses a move, in plain words:

     1. It can score any board. A positive score is good for the computer, a negative score is
        good for you. The score adds up:
        - 100 points for every man and 160 for every king (a king can go both ways, so it is
          worth more, but not twice as much).
        - 3 points for every row a man has marched forward, because it is closer to being crowned.
        - 10 points for every man still guarding its own back row: while it stays there, your men
          cannot be crowned on that square.
        - A few points for pieces in the middle of the board, where they can go either way and
          are hard to trap.
        - When it is ahead, a bonus for swapping pieces: being 3 against 2 is a bigger lead than
          being 12 against 11. With only a few pieces left, its kings also get points for
          hunting down your last pieces instead of wandering about.
     2. It looks ahead. It imagines every move it could make, then every reply you could make,
        then every answer to that, and so on. Easy looks 2 moves ahead, Medium 4, and Hard 6 or more.
     3. It expects you to play well. At each step it assumes you will choose the reply that is
        worst for it (that is the "mini" in minimax), and it chooses the move that is best for it
        (the "max"). The move that still scores best after your best reply is the one it plays.
     4. It skips hopeless ideas (alpha-beta pruning). If it already has a move that keeps all its
        pieces safe, and while checking another move it sees that you could win a piece straight
        away, it stops looking at that move. That saves a huge amount of thinking.
     5. It never stops in the middle of a fight. If the last move it imagines leaves a jump
        waiting, it keeps going until the jumping is over, so a half-finished swap cannot fool it.
     6. Hard looks at the most promising moves first (big captures, crowning, and whatever was best
        last time), then keeps looking deeper for about a third of a second.
     7. Easy adds a little randomness to its scores, so sometimes it picks a move that is not the
        best one. Medium adds just a pinch, so it does not play the same game every time.
     ===================================================================== */

  var WIN = 100000;

  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  /* The score of board `b` from the point of view of `side`. */
  function evaluate(b, side) {
    var s = 0, redMat = 0, whiteMat = 0, pieces = 0, i;
    var redMen = 0, whiteMen = 0;
    for (i = 0; i < 64; i++) { if (b[i] === MAN) redMen++; else if (b[i] === -MAN) whiteMen++; }
    for (i = 0; i < 64; i++) {
      var p = b[i];
      if (!p) continue;
      pieces++;
      var r = i >> 3, c = i & 7, v;
      var centre = (r >= 2 && r <= 5 && c >= 2 && c <= 5) ? ((r === 3 || r === 4) ? 6 : 3) : 0;
      if (isKing(p)) {
        v = 160 + (centre ? 4 : 0);
      } else {
        var ahead = p > 0 ? 7 - r : r; /* rows marched forward from its own back row */
        v = 100 + 3 * ahead + centre;
        /* A back-row guard only matters while the other side still has men that could be crowned. */
        if (ahead === 0 && (p > 0 ? whiteMen : redMen) > 0) v += 10;
      }
      if (p > 0) { s += v; redMat += isKing(p) ? 160 : 100; } else { s -= v; whiteMat += isKing(p) ? 160 : 100; }
    }
    var diff = redMat - whiteMat;
    s += Math.round(diff * 6 / (pieces + 2)); /* swapping pieces helps whoever is ahead */
    if (pieces <= 8 && diff !== 0) {
      /* The stronger side's kings walk towards the weaker side's pieces. */
      var strong = diff > 0 ? RED : WHITE, dist = 0;
      for (i = 0; i < 64; i++) {
        if (b[i] !== strong * KING) continue;
        var best = 99;
        for (var j = 0; j < 64; j++) {
          if (sideOf(b[j]) !== -strong) continue;
          var dd = Math.max(Math.abs((i >> 3) - (j >> 3)), Math.abs((i & 7) - (j & 7)));
          if (dd < best) best = dd;
        }
        if (best < 99) dist += best;
      }
      s += (strong === RED ? -4 : 4) * dist;
    }
    return side === RED ? s : -s;
  }

  /* Puts the most promising moves first: bigger captures, crowning, and moves that caused a
     cut-off at this depth before ("killer" moves). Good ordering makes alpha-beta much faster. */
  function orderMoves(moves, ctx, ply) {
    var killer = ctx.killers[ply];
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      m.order = m.caps.length * 10 + (m.crown ? 6 : 0) +
        (killer && killer.from === m.from && killer.to === m.path[m.path.length - 1] ? 8 : 0);
    }
    moves.sort(function (a, b) { return b.order - a.order; });
  }

  /* Negamax is minimax written once for both sides: my score is minus your score. */
  function negamax(b, side, depth, alpha, beta, ply, ctx) {
    ctx.nodes++;
    if (ctx.deadline && (ctx.nodes & 127) === 0 && now() > ctx.deadline) throw ctx.stop;
    var moves = legalMoves(b, side);
    if (!moves.length) return -WIN + ply; /* no move means this side has lost; losing later is less bad */
    var forced = moves[0].caps.length > 0;
    if (depth <= 0 && (!forced || ply >= ctx.maxPly)) return evaluate(b, side);
    if (moves.length > 1) orderMoves(moves, ctx, ply);
    var best = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var v = -negamax(applyMove(b, moves[i]), -side, depth - 1, -beta, -alpha, ply + 1, ctx);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        ctx.killers[ply] = { from: moves[i].from, to: moves[i].path[moves[i].path.length - 1] };
        break;
      }
    }
    return best;
  }

  /* Chooses the computer's move. `level` is 'easy', 'medium' or 'hard'. */
  function chooseMove(b, side, level, random) {
    var moves = legalMoves(b, side);
    if (moves.length <= 1) return moves[0] || null;
    var ctx = { nodes: 0, deadline: 0, maxPly: 40, stop: { stop: true }, killers: [] };
    var i, best = null, bestScore = -Infinity;

    if (level !== 'hard') {
      /* Easy and Medium: score every move exactly, add a sprinkle of randomness, take the best. */
      var depth = level === 'easy' ? 2 : 4, noise = level === 'easy' ? 60 : 8;
      for (i = 0; i < moves.length; i++) {
        var v = -negamax(applyMove(b, moves[i]), -side, depth - 1, -Infinity, Infinity, 1, ctx);
        v += (random() * 2 - 1) * noise;
        if (v > bestScore) { bestScore = v; best = moves[i]; }
      }
      return best;
    }

    /* Hard: iterative deepening. Look 2 moves ahead, then 3, then 4 and so on, always trying last
       round's best move first. It normally reaches 6 or more moves ahead; when about a third of a
       second is up it stops and keeps the best move from the deepest search it finished. The moves
       are shuffled first, so when two moves are equally good it does not always pick the same one. */
    var t0 = now(), order = moves.slice();
    for (i = order.length - 1; i > 0; i--) { var j = Math.floor(random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
    best = order[0];
    for (var d = 2; d <= 24; d++) {
      ctx.deadline = d <= 2 ? 0 : t0 + 270;
      try {
        var alpha = -Infinity, iterBest = null, scored = [];
        for (i = 0; i < order.length; i++) {
          var s = -negamax(applyMove(b, order[i]), -side, d - 1, -Infinity, -alpha, 1, ctx);
          scored.push({ m: order[i], s: s });
          if (s > alpha) { alpha = s; iterBest = order[i]; }
        }
        best = iterBest || best;
        scored.sort(function (x, y) { return y.s - x.s; });
        order = scored.map(function (x) { return x.m; });
        if (alpha > WIN - 1000 || alpha < -WIN + 1000) break; /* a forced win or loss has been found */
      } catch (e) {
        if (e !== ctx.stop) throw e;
        break;
      }
      if (d >= 6 && now() - t0 > 110) break; /* the next round would take about three times as long */
    }
    return best;
  }

  /* =====================================================================
     PART 3: THE SCREEN
     ===================================================================== */

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function crownSvg() {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'dr-crown');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', 'M3.2 16.6 2 6.8l5.3 4.3L12 3.6l4.7 7.5L22 6.8l-1.2 9.8zM3.6 18.4h16.8v2.4H3.6z');
    s.appendChild(p);
    return s;
  }

  var CSS = [
    /* Every colour starts from the hall's own variables, so the board wears the 1800s palette:
       mahogany squares, ivory squares, a gilt edge, crimson and ivory pieces. */
    '.game-draughts { --dr-dark: color-mix(in srgb, var(--vermilion) 26%, var(--bg)); --dr-dark-grain: color-mix(in srgb, var(--bg) 30%, transparent);',
    '  --dr-light: color-mix(in srgb, var(--ink) 86%, var(--gold)); --dr-light-grain: color-mix(in srgb, var(--gold) 14%, transparent);',
    '  --dr-edge: color-mix(in srgb, var(--vermilion) 16%, var(--bg)); --dr-gilt: var(--gold);',
    '  --dr-red: var(--vermilion); --dr-red-rim: color-mix(in srgb, var(--vermilion) 55%, var(--bg)); --dr-red-ring: color-mix(in srgb, var(--vermilion) 78%, var(--bg));',
    '  --dr-white: var(--ink); --dr-white-rim: color-mix(in srgb, var(--ink) 58%, var(--bg)); --dr-white-ring: color-mix(in srgb, var(--ink) 82%, var(--ink-muted));',
    '  --dr-shadow: color-mix(in srgb, var(--bg) 70%, transparent); --dr-shine: color-mix(in srgb, var(--ink) 55%, transparent); }',
    '.game-draughts .seg button { padding-inline: .85rem; }',
    /* A copy of the status line right above the board, for phones, where the real one is far up. */
    '.game-draughts .dr-mirror { display: none; margin: 0 0 .6rem; text-align: center; font-family: var(--font-head); font-weight: 800; font-size: 1.05rem; line-height: 1.3; min-height: 2.6em; text-wrap: balance; }',
    '@media (max-width: 600px) { .game-draughts .dr-mirror { display: block; } }',
    /* The table: trays at the sides on wide screens, above and below on phones. */
    '.game-draughts .dr-table { display: flex; align-items: center; justify-content: center; gap: clamp(10px, 2vw, 22px); }',
    '.game-draughts .dr-wrap { position: relative; flex: 0 1 560px; width: min(100%, 560px); min-width: 0; }',
    '.game-draughts .dr-board { position: relative; display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); grid-template-rows: repeat(8, minmax(0, 1fr)); aspect-ratio: 1 / 1; max-width: none; border: 9px solid var(--dr-edge); border-radius: 8px;',
    '  box-shadow: 0 0 0 2px var(--dr-gilt), inset 0 0 0 2px var(--dr-gilt), 0 14px 30px var(--dr-shadow); user-select: none; -webkit-user-select: none; touch-action: manipulation; }',
    '.game-draughts .dr-cell { position: relative; min-width: 0; outline: none; }',
    '.game-draughts .dr-cell.is-light { background: repeating-linear-gradient(96deg, transparent 0 5px, var(--dr-light-grain) 5px 6px, transparent 6px 11px), var(--dr-light); }',
    '.game-draughts .dr-cell.is-dark { background: repeating-linear-gradient(104deg, transparent 0 4px, var(--dr-dark-grain) 4px 6px, transparent 6px 10px), var(--dr-dark); cursor: pointer; }',
    '.game-draughts .dr-cell.is-last { box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--gold) 55%, transparent); }',
    '.game-draughts .dr-cell:focus-visible { box-shadow: inset 0 0 0 4px var(--focus); z-index: 3; }',
    /* Where the picked-up piece can go: a gilt dot for a step, a gilt ring for a jump. */
    '.game-draughts .dr-cell.is-dest::after { content: ""; position: absolute; inset: 36%; border-radius: 50%; background: var(--gold); box-shadow: 0 0 0 4px color-mix(in srgb, var(--gold) 30%, transparent); z-index: 4; pointer-events: none; animation: dr-beckon 1.1s ease-in-out infinite; }',
    '.game-draughts .dr-cell.is-dest.is-jump::after { inset: 22%; background: transparent; border: 4px solid var(--gold); box-shadow: 0 0 10px color-mix(in srgb, var(--gold) 60%, transparent); }',
    '@keyframes dr-beckon { 50% { transform: scale(1.18); } }',
    /* The pieces live in a layer over the squares, so they can slide and hop between squares. */
    '.game-draughts .dr-layer { position: absolute; inset: 0; pointer-events: none; z-index: 2; }',
    '.game-draughts .dr-piece { position: absolute; left: 0; top: 0; width: 12.5%; height: 12.5%; }',
    '.game-draughts .dr-piece.is-moving { z-index: 5; }',
    /* A turned-wood disc: a coloured face with lathe rings, a shine at the top left and a rim. */
    '.game-draughts .dr-disc { position: absolute; inset: 9%; border-radius: 50%; transition: transform .15s ease, opacity .2s; }',
    '.game-draughts .is-red .dr-disc { background: radial-gradient(circle at 50% 50%, transparent 0 25%, var(--dr-red-ring) 26% 29%, transparent 30% 47%, var(--dr-red-ring) 48% 51%, transparent 52%), radial-gradient(circle at 34% 28%, var(--dr-shine) 0, transparent 42%), var(--dr-red); border: 2px solid var(--dr-red-rim); box-shadow: inset 0 -3px 0 var(--dr-red-rim), 0 3px 5px var(--dr-shadow); }',
    '.game-draughts .is-white .dr-disc { background: radial-gradient(circle at 50% 50%, transparent 0 25%, var(--dr-white-ring) 26% 29%, transparent 30% 47%, var(--dr-white-ring) 48% 51%, transparent 52%), radial-gradient(circle at 34% 28%, var(--dr-shine) 0, transparent 42%), var(--dr-white); border: 2px solid var(--dr-white-rim); box-shadow: inset 0 -3px 0 var(--dr-white-rim), 0 3px 5px var(--dr-shadow); }',
    /* A king is two pieces stacked, with a gilt crown on top. */
    '.game-draughts .is-king .dr-disc { transform: translateY(-7%); }',
    '.game-draughts .is-red.is-king .dr-disc { box-shadow: inset 0 -3px 0 var(--dr-red-rim), 0 4px 0 var(--dr-red-rim), 0 6px 0 var(--dr-red), 0 8px 0 var(--dr-red-rim), 0 10px 8px var(--dr-shadow); }',
    '.game-draughts .is-white.is-king .dr-disc { box-shadow: inset 0 -3px 0 var(--dr-white-rim), 0 4px 0 var(--dr-white-rim), 0 6px 0 var(--dr-white), 0 8px 0 var(--dr-white-rim), 0 10px 8px var(--dr-shadow); }',
    '.game-draughts .dr-crown { position: absolute; left: 24%; top: 17%; width: 52%; height: 52%; display: none; overflow: visible; }',
    '.game-draughts .dr-crown path { fill: var(--gold); stroke: var(--bg); stroke-width: 1.1; stroke-linejoin: round; }',
    '.game-draughts .is-king .dr-crown { display: block; }',
    '.game-draughts .dr-piece.is-crowned .dr-crown { animation: dr-crown .6s cubic-bezier(.2, 1.6, .4, 1); }',
    '@keyframes dr-crown { 0% { transform: translateY(-60%) scale(1.8); opacity: 0; } 100% { transform: none; opacity: 1; } }',
    /* Picked up: the piece lifts and glows. Must capture: the piece pulses. */
    '.game-draughts .dr-piece.is-sel .dr-disc { transform: translateY(-10%) scale(1.08); outline: 3px solid var(--gold); outline-offset: 2px; }',
    '.game-draughts .dr-piece.is-must .dr-disc { outline: 4px solid var(--gold); outline-offset: 2px; filter: drop-shadow(0 0 7px var(--gold)); animation: dr-must 1s ease-in-out infinite; }',
    '@keyframes dr-must { 50% { outline-offset: 6px; } }',
    '.game-draughts .dr-piece.is-taken .dr-disc { opacity: .4; transform: scale(.8); }',
    /* Trays for captured pieces. */
    '.game-draughts .dr-tray { flex: 0 0 84px; display: flex; flex-direction: column; align-items: center; gap: 6px; align-self: stretch; justify-content: center; }',
    '.game-draughts .dr-tray-head { text-align: center; line-height: 1.1; }',
    '.game-draughts .dr-tray-name { display: block; font-family: var(--font-mono); font-weight: 700; font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-muted); }',
    '.game-draughts .dr-tray-count { display: block; font-family: var(--font-display); font-size: 2.1rem; line-height: 1.05; color: var(--gold); }',
    '.game-draughts .dr-tray.is-turn .dr-tray-name { color: var(--ink); }',
    '.game-draughts .dr-tray.is-turn .dr-tray-count { text-shadow: 0 0 14px color-mix(in srgb, var(--gold) 60%, transparent); }',
    '.game-draughts .dr-pile { display: flex; flex-direction: column-reverse; align-items: center; justify-content: flex-start; min-height: 176px; width: 56px; padding: 8px 0; border-radius: 30px; background: color-mix(in srgb, var(--bg) 45%, transparent); box-shadow: inset 0 3px 8px var(--dr-shadow); }',
    '.game-draughts .dr-mini { position: relative; width: 34px; height: 34px; flex: none; }',
    '.game-draughts .dr-mini + .dr-mini { margin-bottom: -21px; }',
    '.game-draughts .dr-mini .dr-disc { inset: 0; }',
    '.game-draughts .dr-mini.is-new { animation: dr-tray-drop .5s cubic-bezier(.3, 1.5, .5, 1) both; }',
    '@keyframes dr-tray-drop { 0% { transform: translateY(-46px); opacity: 0; } 60% { opacity: 1; } 100% { transform: none; } }',
    '@media (max-width: 700px) {',
    '  .game-draughts .dr-table { flex-direction: column; gap: 8px; }',
    '  .game-draughts .dr-tray { flex: none; flex-direction: row; align-self: center; gap: 10px; min-height: 40px; }',
    '  .game-draughts .dr-tray-head { display: flex; align-items: baseline; gap: 6px; }',
    '  .game-draughts .dr-tray-count { font-size: 1.5rem; }',
    '  .game-draughts .dr-pile { flex-direction: row; min-height: 36px; width: auto; min-width: 128px; padding: 4px 10px; }',
    '  .game-draughts .dr-mini { width: 26px; height: 26px; }',
    '  .game-draughts .dr-mini + .dr-mini { margin: 0 0 0 -15px; }',
    '}',
    /* On phones the board borrows the panel padding, so each square is at least 36 px at 360 px wide. */
    '@media (max-width: 480px) { .game-draughts .dr-table { margin-inline: calc(-1 * clamp(12px, 2.6vw, 26px) + 2px); } .game-draughts .dr-wrap { width: 100%; flex-basis: auto; } .game-draughts .dr-board { border-width: 5px; } }',
    /* Game over banner over the board. */
    '.game-draughts .dr-banner { position: absolute; inset: 0; z-index: 8; display: grid; place-items: center; pointer-events: none; }',
    '.game-draughts .dr-banner-card { pointer-events: auto; text-align: center; padding: 1rem 1.4rem 1.2rem; border-radius: 18px; background: color-mix(in srgb, var(--surface) 94%, transparent); border: 2px solid var(--gold); box-shadow: 0 14px 40px var(--dr-shadow); max-width: 86%; animation: dr-banner .45s cubic-bezier(.2, 1.4, .4, 1) both; }',
    '.game-draughts .dr-banner-title { font-family: var(--font-display); font-size: clamp(1.8rem, 1.2rem + 3vw, 3rem); line-height: 1.05; color: var(--gold); margin: 0 0 .35rem; }',
    '.game-draughts .dr-banner-text { margin: 0 0 .8rem; font-weight: 600; }',
    '@keyframes dr-banner { 0% { transform: scale(.6); opacity: 0; } 100% { transform: none; opacity: 1; } }',
    '.game-draughts .dr-foot { display: flex; flex-wrap: wrap; justify-content: center; gap: .3rem 1.2rem; margin-top: .9rem; font-size: .95rem; color: var(--ink-muted); text-align: center; }',
    '.game-draughts .dr-foot strong { color: var(--ink); }',
    '.game-draughts .dr-nowrap { white-space: nowrap; }',
    '.game-draughts .dr-quiet { color: var(--gold); font-weight: 700; }',
    '.classroom .game-draughts .dr-wrap { width: min(100%, 76vh); flex-basis: min(100%, 76vh); }',
    '@media (prefers-reduced-motion: reduce) { .game-draughts .dr-cell.is-dest::after, .game-draughts .dr-piece.is-must .dr-disc, .game-draughts .dr-mini.is-new, .game-draughts .dr-banner-card, .game-draughts .dr-piece.is-crowned .dr-crown { animation: none; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'draughts',
    frame: 'table',
    mount: function (root, api) {
      var h = api.h;
      root.appendChild(h('style', null, CSS));

      /* ----- timers: every pending timeout is kept so New game and destroy() can cancel it ----- */
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
      var THINK_MS = RM ? 0 : 350;   /* the computer's pause before it moves */
      var SLIDE_MS = RM ? 0 : 230;   /* one step */
      var HOP_MS = RM ? 0 : 340;     /* one jump */

      /* ----- settings, remembered between visits ----- */
      var mode = api.store.get('mode', 'computer') === 'two' ? 'two' : 'computer';
      var level = api.store.get('level', 'easy');
      if (['easy', 'medium', 'hard'].indexOf(level) < 0) level = 'easy';
      var human = api.store.get('colour', 'red') === 'white' ? WHITE : RED;
      var wins = api.store.get('wins', null);
      if (!wins || typeof wins !== 'object') wins = { easy: 0, medium: 0, hard: 0 };

      /* ----- game state ----- */
      var board, turn, over, quiet, lastMove, moves = [], sel = -1, partial = null, busy = false, takenBy, cursor = 0;
      var pieceEls = {};   /* square number -> piece element on the board */

      /* ----- controls ----- */
      var modeBtns = {}, levelBtns = {};
      var modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Who plays' },
        modeBtns.computer = h('button', { type: 'button', onclick: function () { setMode('computer'); } }, 'vs computer'),
        modeBtns.two = h('button', { type: 'button', onclick: function () { setMode('two'); } }, '2 players'));
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' },
        levelBtns.easy = h('button', { type: 'button', onclick: function () { setLevel('easy'); } }, 'Easy'),
        levelBtns.medium = h('button', { type: 'button', onclick: function () { setLevel('medium'); } }, 'Medium'),
        levelBtns.hard = h('button', { type: 'button', onclick: function () { setLevel('hard'); } }, 'Hard'));
      var colourSel = h('select', { id: 'dr-colour', onchange: function () { human = colourSel.value === 'white' ? WHITE : RED; api.store.set('colour', colourSel.value); newGame(); } },
        h('option', { value: 'red' }, 'Red (first)'),
        h('option', { value: 'white' }, 'White'));
      var colourField = h('label', { class: 'field', for: 'dr-colour' }, 'Play as', colourSel);
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(); } }, 'New game');
      root.appendChild(h('div', { class: 'game-toolbar' }, modeSeg, levelSeg, colourField, newBtn));

      var mirror = h('p', { class: 'dr-mirror', 'aria-hidden': 'true' });
      root.appendChild(mirror);

      /* ----- the board ----- */
      var boardEl = h('div', { class: 'dr-board board', role: 'group', 'aria-label': 'Draughts board, 8 rows by 8 columns. Arrow keys move around; Enter picks up a piece and puts it down.', onkeydown: onKey, onclick: onBoardClick });
      var cells = [];  /* by display position 0 to 63, top left to bottom right */
      for (var i = 0; i < 64; i++) {
        var dark = isDark(i >> 3, i & 7);
        var cell = h('div', { class: 'dr-cell ' + (dark ? 'is-dark' : 'is-light'), role: 'button', tabindex: '-1', 'aria-disabled': dark ? null : 'true', 'data-pos': String(i) });
        cells.push(cell);
        boardEl.appendChild(cell);
      }
      var layer = h('div', { class: 'dr-layer', 'aria-hidden': 'true' });
      boardEl.appendChild(layer);
      var banner = h('div', { class: 'dr-banner', hidden: true });
      var wrap = h('div', { class: 'dr-wrap' }, boardEl, banner);

      function makeTray() {
        var t = { name: h('span', { class: 'dr-tray-name' }), count: h('span', { class: 'dr-tray-count' }, '0'), pile: h('div', { class: 'dr-pile', 'aria-hidden': 'true' }) };
        t.el = h('div', { class: 'dr-tray' }, h('div', { class: 'dr-tray-head' }, t.name, t.count), t.pile);
        return t;
      }
      var trayTop = makeTray(), trayBottom = makeTray();
      root.appendChild(h('div', { class: 'dr-table' }, trayTop.el, wrap, trayBottom.el));

      var winsEl = h('span');
      var quietEl = h('span', { class: 'dr-quiet' });
      root.appendChild(h('p', { class: 'dr-foot' }, winsEl, quietEl));
      root.appendChild(h('p', { class: 'game-note' }, 'English draughts, as played in the 1840s championship matches. Jumping is compulsory, and a man that reaches the far row is crowned a king. Site rule: if 40 moves each go by with no capture and no man moving, the game is a draw.'));

      /* ----- names and words ----- */
      function colourName(side) { return side === RED ? 'Red' : 'White'; }
      function isComputer(side) { return mode === 'computer' && side !== human; }
      function flipped() { return mode === 'computer' && human === WHITE; }
      function bottomSide() { return flipped() ? WHITE : RED; }
      function say(text) { api.status(text); mirror.textContent = text; }

      /* Squares (0 to 63, Red's view) to display positions and back. Playing White turns the board round. */
      function toPos(sq) { return flipped() ? 63 - sq : sq; }
      function toSq(pos) { return flipped() ? 63 - pos : pos; }
      function placeTransform(sq, extra) {
        var p = toPos(sq);
        return 'translate(' + ((p & 7) * 100) + '%, ' + ((p >> 3) * 100) + '%)' + (extra || '');
      }

      /* ----- settings ----- */
      function setMode(m) { mode = m; api.store.set('mode', m); api.sound('click'); newGame(); }
      function setLevel(l) { level = l; api.store.set('level', l); api.sound('click'); updateControls(); updateFoot(); }
      function updateControls() {
        modeBtns.computer.setAttribute('aria-pressed', String(mode === 'computer'));
        modeBtns.two.setAttribute('aria-pressed', String(mode === 'two'));
        ['easy', 'medium', 'hard'].forEach(function (l) { levelBtns[l].setAttribute('aria-pressed', String(level === l)); });
        levelSeg.hidden = mode !== 'computer';
        colourField.hidden = mode !== 'computer';
        colourSel.value = human === WHITE ? 'white' : 'red';
      }
      function updateFoot() {
        if (mode === 'computer') {
          winsEl.replaceChildren(h('strong', null, 'Your wins:'), ' ',
            h('span', { class: 'dr-nowrap' }, 'Easy ' + (wins.easy || 0) + ','), ' ',
            h('span', { class: 'dr-nowrap' }, 'Medium ' + (wins.medium || 0) + ','), ' ',
            h('span', { class: 'dr-nowrap' }, 'Hard ' + (wins.hard || 0)));
        } else {
          winsEl.textContent = 'Two players: take turns on this device.';
        }
        var left = Math.ceil((DRAW_PLIES - quiet) / 2);
        quietEl.textContent = (!over && quiet >= 20) ? 'Draw in ' + left + ' more moves each unless someone captures or moves a man.' : '';
      }

      /* ----- pieces on the board ----- */
      function animate(el, frames, opts) {
        if (RM || !el.animate) return;
        try { el.animate(frames, opts); } catch (e) { /* old browsers: no animation */ }
      }
      function makePiece(sq, p, fresh) {
        var disc = h('div', { class: 'dr-disc' });
        var el = h('div', { class: 'dr-piece ' + (p > 0 ? 'is-red' : 'is-white') + (isKing(p) ? ' is-king' : '') }, disc, crownSvg());
        el.style.transform = placeTransform(sq);
        layer.appendChild(el);
        pieceEls[sq] = el;
        /* At the start of a game the pieces drop onto the board one after another. */
        if (fresh) animate(disc, [{ transform: 'translateY(-45%) scale(1.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, delay: ((sq * 37) % 24) * 16, easing: 'ease-out', fill: 'backwards' });
      }
      function rebuildPieces(fresh) {
        layer.replaceChildren();
        pieceEls = {};
        for (var s = 0; s < 64; s++) if (board[s]) makePiece(s, board[s], fresh);
      }
      function slidePiece(from, to) {
        var el = pieceEls[from];
        if (!el) return;
        el.classList.add('is-moving');
        animate(el, [{ transform: placeTransform(from) }, { transform: placeTransform(to) }], { duration: SLIDE_MS, easing: 'cubic-bezier(.3, .7, .35, 1)' });
        el.style.transform = placeTransform(to);
        delete pieceEls[from];
        pieceEls[to] = el;
      }
      /* A jump arcs up over the jumped piece and down onto the landing square. */
      function hopPiece(from, over, to) {
        var el = pieceEls[from];
        if (!el) return;
        el.classList.add('is-moving');
        animate(el, [
          { transform: placeTransform(from) },
          { transform: placeTransform(over, ' translateY(-55%) scale(1.25)'), offset: 0.5 },
          { transform: placeTransform(to) }], { duration: HOP_MS, easing: 'ease-in-out' });
        el.style.transform = placeTransform(to);
        delete pieceEls[from];
        pieceEls[to] = el;
        if (pieceEls[over]) pieceEls[over].classList.add('is-taken');
      }
      function settle() {
        Object.keys(pieceEls).forEach(function (k) { pieceEls[k].classList.remove('is-moving'); });
      }

      /* Captured pieces leave the board and drop into the capturer's tray. */
      function sendToTray(squares, capturer) {
        squares.forEach(function (sq, n) {
          var el = pieceEls[sq];
          if (el) {
            delete pieceEls[sq];
            if (RM) el.remove();
            else {
              animate(el, [{ opacity: 1, transform: placeTransform(sq) }, { opacity: 0, transform: placeTransform(sq, ' scale(.4)') }], { duration: 260, fill: 'forwards' });
              later(function () { el.remove(); }, 260);
            }
          }
          takenBy[capturer]++;
          var tray = capturer === bottomSide() ? trayBottom : trayTop;
          var mini = h('div', { class: 'dr-mini is-new ' + (capturer === RED ? 'is-white' : 'is-red') }, h('div', { class: 'dr-disc' }));
          if (!RM) mini.style.animationDelay = (n * 110) + 'ms';
          tray.pile.appendChild(mini);
        });
        updateTrays();
      }
      function trayLabel(side) {
        if (mode === 'computer') return side === human ? 'You took' : 'Computer took';
        return colourName(side) + ' took';
      }
      function updateTrays() {
        var b = bottomSide(), t = -b;
        trayBottom.name.textContent = trayLabel(b);
        trayTop.name.textContent = trayLabel(t);
        trayBottom.count.textContent = String(takenBy[b]);
        trayTop.count.textContent = String(takenBy[t]);
        trayBottom.el.classList.toggle('is-turn', !over && turn === b);
        trayTop.el.classList.toggle('is-turn', !over && turn === t);
      }

      /* ----- markers on the squares ----- */
      function samePrefix(path, steps) {
        for (var i = 0; i < steps.length; i++) if (path[i] !== steps[i]) return false;
        return true;
      }
      /* The squares the picked-up piece can land on next, and whether each is a jump. */
      function currentDests() {
        var list = [], seen = {};
        if (sel < 0) return list;
        var k = partial ? partial.steps.length : 0;
        moves.forEach(function (m) {
          if (m.from !== sel) return;
          if (partial && !samePrefix(m.path, partial.steps)) return;
          if (m.path.length <= k) return;
          var to = m.path[k];
          if (!seen[to]) { seen[to] = true; list.push({ sq: to, jump: m.caps.length > 0 }); }
        });
        return list;
      }
      function render() {
        var humanTurn = !over && !isComputer(turn) && !busy;
        var destMap = {};
        if (humanTurn) currentDests().forEach(function (d) { destMap[d.sq] = d; });
        var mustFrom = {};
        if (humanTurn && !partial && moves.length && moves[0].caps.length) moves.forEach(function (m) { mustFrom[m.from] = true; });
        var lastSet = {};
        if (lastMove) { lastSet[lastMove.from] = true; lastSet[lastMove.path[lastMove.path.length - 1]] = true; }
        for (var pos = 0; pos < 64; pos++) {
          var sq = toSq(pos), cell = cells[pos], d = destMap[sq];
          cell.classList.toggle('is-dest', !!d);
          cell.classList.toggle('is-jump', !!d && d.jump);
          cell.classList.toggle('is-last', !!lastSet[sq]);
          cell.setAttribute('aria-label', cellLabel(pos, sq, d, mustFrom[sq]));
        }
        var held = partial ? partial.at : sel;
        Object.keys(pieceEls).forEach(function (k) {
          var s = Number(k), el = pieceEls[k];
          el.classList.toggle('is-sel', s === held && !over);
          el.classList.toggle('is-must', !!mustFrom[s] && s !== sel);
        });
        updateTrays();
        updateFoot();
      }
      function cellLabel(pos, sq, dest, must) {
        var text = 'Row ' + ((pos >> 3) + 1) + ', column ' + ((pos & 7) + 1) + ', ';
        if (!isDark(sq >> 3, sq & 7)) return text + 'light square';
        var p = board[sq];
        text += p ? colourName(sideOf(p)) + (isKing(p) ? ' king' : ' man') : 'empty';
        if (sq === sel && !over) text += ', picked up';
        if (must) text += ', must capture';
        if (dest) text += dest.jump ? ', jump here' : ', move here';
        return text;
      }

      /* ----- the flow of a game ----- */
      function resetState(b, side) {
        stopTimers();
        board = b;
        turn = side; over = false; quiet = 0; lastMove = null; sel = -1; partial = null; busy = false;
        takenBy = {}; takenBy[RED] = 0; takenBy[WHITE] = 0;
        trayTop.pile.replaceChildren(); trayBottom.pile.replaceChildren();
        banner.hidden = true; banner.replaceChildren();
        updateControls();
      }
      function newGame() {
        resetState(startBoard(), RED);
        rebuildPieces(true);
        api.sound('clack');
        later(function () { api.sound('clack'); }, RM ? 0 : 140);
        startTurn('New game. ');
      }

      function startTurn(prefix) {
        moves = legalMoves(board, turn);
        sel = -1; partial = null;
        if (!moves.length) {
          var who = mode === 'computer' ? (turn === human ? 'You' : 'The computer') : colourName(turn);
          var none = countPieces(board, turn) === 0;
          finish(-turn, none ? who + (who === 'You' ? ' have' : ' has') + ' no pieces left.' : who + ' cannot move.');
          return;
        }
        if (quiet >= DRAW_PLIES) { finish(0, 'Forty moves each with no capture and no man moving.'); return; }
        if (isComputer(turn)) {
          say((prefix || '') + 'Computer is thinking...');
          render();
          later(computerMove, THINK_MS);
          return;
        }
        say((prefix || '') + promptText());
        render();
      }
      function promptText() {
        var who = mode === 'computer' ? 'Your turn (' + colourName(turn) + ').' : colourName(turn) + ' to move.';
        if (moves.length && moves[0].caps.length) return who + ' You must capture: jump with a glowing piece.';
        return who + ' Pick a piece, then a square.';
      }

      /* A tap, click or Enter on a square. */
      function activate(sq) {
        if (over || busy || isComputer(turn)) return;
        var hit = currentDests().filter(function (d) { return d.sq === sq; })[0];
        if (hit) { takeStep(sq); return; }
        if (partial) {
          api.sound('wrong');
          say('Keep jumping! The same piece must jump again: pick a glowing ring.');
          return;
        }
        var p = board[sq];
        if (sideOf(p) === turn) {
          var mine = moves.filter(function (m) { return m.from === sq; });
          if (!mine.length) {
            api.sound('wrong');
            say(moves[0].caps.length ? 'You must capture! Pick one of the glowing pieces.' : 'That piece is stuck. Try another one.');
            render();
            return;
          }
          api.sound('click');
          if (sel === sq) { sel = -1; say(promptText()); render(); return; }
          sel = sq;
          say(mine[0].caps.length ? 'Jump! Pick a glowing ring to land on.' : 'Now pick a gold dot to move to.');
          render();
          return;
        }
        if (sel >= 0) { sel = -1; say(promptText()); render(); }
      }

      /* One step of a person's move: a slide, or one jump of a multi-jump. */
      function takeStep(to) {
        if (!partial) partial = { at: sel, steps: [] };
        var k = partial.steps.length;
        partial.steps.push(to);
        var matching = moves.filter(function (m) { return m.from === sel && samePrefix(m.path, partial.steps); });
        var jump = matching[0].caps.length > 0;
        busy = true;
        if (jump) hopPiece(partial.at, matching[0].caps[k], to); else slidePiece(partial.at, to);
        partial.at = to;
        render();
        later(function () {
          busy = false;
          settle();
          api.sound('clack');
          var done = matching.filter(function (m) { return m.path.length === partial.steps.length; });
          if (done.length) { finishMove(done[0]); return; }
          api.sound('thud');
          say('Keep jumping! The same piece must jump again.');
          render();
        }, jump ? HOP_MS : SLIDE_MS);
      }

      function computerMove() {
        if (over || !isComputer(turn)) return;
        var m = chooseMove(board, turn, level, api.random);
        if (!m) return;
        busy = true;
        sel = m.from;
        render();
        var at = m.from, k = 0;
        (function step() {
          if (k >= m.path.length) { busy = false; settle(); finishMove(m); return; }
          var to = m.path[k];
          if (m.caps.length) hopPiece(at, m.caps[k], to); else slidePiece(at, to);
          at = to;
          k++;
          later(function () {
            api.sound('clack');
            if (m.caps.length && k < m.path.length) api.sound('thud');
            step();
          }, m.caps.length ? HOP_MS + 60 : SLIDE_MS);
        })();
      }

      /* The move is complete: update the board, crown, tip the jumped pieces into the tray, next turn. */
      function finishMove(m) {
        var mover = turn, piece = board[m.from], to = m.path[m.path.length - 1];
        board = applyMove(board, m);
        lastMove = m;
        sel = -1; partial = null;
        if (m.caps.length || !isKing(piece)) quiet = 0; else quiet++;
        var words = '';
        var whoDid = isComputer(mover) ? 'The computer' : (mode === 'computer' ? 'You' : colourName(mover));
        if (m.caps.length) {
          sendToTray(m.caps, mover);
          api.sound('thud');
          if (m.caps.length > 1) words = (m.caps.length === 2 ? 'Double jump! ' : m.caps.length === 3 ? 'Triple jump! ' : 'Amazing jump! ');
          words += whoDid + ' took ' + m.caps.length + (m.caps.length === 1 ? ' piece. ' : ' pieces. ');
        } else if (isComputer(mover)) {
          words = 'The computer moved. ';
        }
        if (m.crown) {
          var el = pieceEls[to];
          if (el) { el.classList.add('is-king'); el.classList.add('is-crowned'); }
          later(function () { api.sound('bell'); }, RM ? 0 : 120);
          words += whoDid === 'You' ? 'Crowned! Your piece is a king now. ' : whoDid + ' has a new king! ';
        }
        turn = -mover;
        startTurn(words);
      }

      function finish(winner, reason) {
        over = true; busy = false; sel = -1; partial = null;
        var title, text;
        if (winner === 0) {
          title = 'A draw';
          text = reason + ' The site rule makes it a draw.';
          api.sound('chalk');
        } else if (mode === 'computer') {
          if (winner === human) {
            title = 'You win!';
            text = reason + ' Well played!';
            wins[level] = (wins[level] || 0) + 1;
            api.store.set('wins', wins);
            api.celebrate('You beat the computer at draughts!');
          } else {
            title = 'Computer wins';
            text = reason + ' Good game! Try again, or pick an easier level.';
            api.sound('lose');
          }
        } else {
          title = colourName(winner) + ' wins!';
          text = reason + ' Well played, ' + colourName(winner) + '!';
          api.celebrate(colourName(winner) + ' wins at draughts!');
        }
        say(title + ' ' + text);
        render();
        banner.replaceChildren(h('div', { class: 'dr-banner-card' },
          h('p', { class: 'dr-banner-title' }, title),
          h('p', { class: 'dr-banner-text' }, text),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(); } }, 'Play again')));
        banner.hidden = false;
      }

      /* ----- pointer and keyboard ----- */
      function onBoardClick(ev) {
        var cell = ev.target.closest ? ev.target.closest('.dr-cell') : null;
        if (!cell || !boardEl.contains(cell)) return;
        var pos = Number(cell.getAttribute('data-pos'));
        setCursor(pos, false);
        activate(toSq(pos));
      }
      /* Only one square is a Tab stop; the arrow keys move from there. */
      function setCursor(pos, focus) {
        cells[cursor].setAttribute('tabindex', '-1');
        cursor = pos;
        cells[cursor].setAttribute('tabindex', '0');
        if (focus) cells[cursor].focus();
      }
      function onKey(ev) {
        var r = cursor >> 3, c = cursor & 7, k = ev.key;
        if (k === 'ArrowUp') r = Math.max(0, r - 1);
        else if (k === 'ArrowDown') r = Math.min(7, r + 1);
        else if (k === 'ArrowLeft') c = Math.max(0, c - 1);
        else if (k === 'ArrowRight') c = Math.min(7, c + 1);
        else if (k === 'Home') c = 0;
        else if (k === 'End') c = 7;
        else if (k === 'Enter' || k === ' ' || k === 'Spacebar') { ev.preventDefault(); activate(toSq(cursor)); return; }
        else if (k === 'Escape') { if (sel >= 0 && !partial && !busy) { sel = -1; say(promptText()); render(); } return; }
        else return;
        ev.preventDefault();
        setCursor(r * 8 + c, true);
      }

      /* ----- a small hook for the play-test script: load a position and read the state ----- */
      root.__test = {
        load: function (rows, side) {
          var b = [];
          rows.join('').split('').forEach(function (ch) { b.push({ r: MAN, R: KING, w: -MAN, W: -KING }[ch] || 0); });
          resetState(b, side === 'white' ? WHITE : RED);
          rebuildPieces(false);
          startTurn('');
        },
        state: function () {
          var names = { '1': 'r', '2': 'R', '-1': 'w', '-2': 'W' };
          return {
            rows: [0, 1, 2, 3, 4, 5, 6, 7].map(function (r) { return board.slice(r * 8, r * 8 + 8).map(function (p) { return names[String(p)] || '.'; }).join(''); }),
            turn: turn === RED ? 'red' : 'white', over: over, busy: busy, sel: sel, steps: partial ? partial.steps.slice() : null,
            must: moves.length ? moves[0].caps.length > 0 : false, quiet: quiet, flipped: flipped(), cursor: cursor,
            taken: { red: takenBy[RED], white: takenBy[WHITE] }
          };
        },
        pos: function (sq) { return toPos(sq); }
      };

      setCursor(42, false);
      newGame();

      return {
        destroy: function () {
          destroyed = true;
          stopTimers();
          delete root.__test;
        }
      };
    }
  });
})();
