/* Klondike Patience for Games in Time, in the 1900 to 1919 hall.
   The earliest printed rules are from about 1905 (Tarbart's Patience Games, turning the stock three at a time).
   The 1907 Hoyle calls it Seven-Card Klondike, and books of 1908 to 1914 turn the stock one card at a time with no
   second pass. This version lets you choose: draw 1 or draw 3, and go round the stock again or only once.

   How the file is organised:
     Part 1  The cards and the rules. A plain "state" object holds every pile. These functions never touch the
             screen, so Undo is simply a saved copy of the state.
     Part 2  Looking for moves: what a tap does, the Hint button and the auto-finish.
     Part 3  The screen: 52 card elements that glide between piles, drag and drop, the keyboard cursor, the timer
             and the bouncing-cards finale.
   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  /* =====================================================================
     PART 1: CARDS AND RULES
     A card is a number from 0 to 51.
       suit = Math.floor(card / 13): 0 spades, 1 hearts, 2 diamonds, 3 clubs
       rank = card % 13 + 1:         1 ace, 2 to 10, 11 jack, 12 queen, 13 king
     Pile names: 's' stock, 'w' waste, 'f0' to 'f3' foundations, 't0' to 't6' tableau columns.
     In every pile array the LAST card is the one on top.
     ===================================================================== */
  var SUIT_NAMES = ['spades', 'hearts', 'diamonds', 'clubs'];
  var RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var RANK_NAMES = ['', 'ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king'];
  /* Suit shapes, drawn on a 24 by 24 grid. Used in the card corners, the big centre pip and the finale. */
  var SUIT_PATHS = [
    'M12 1.6C14.7 5.9 22 9.5 22 14.6c0 2.9-2.2 4.7-4.6 4.7-1.6 0-2.9-.8-3.8-2 .3 2.2 1.2 3.8 2.9 5.1H7.5c1.7-1.3 2.6-2.9 2.9-5.1-.9 1.2-2.2 2-3.8 2C4.2 19.3 2 17.5 2 14.6 2 9.5 9.3 5.9 12 1.6z',
    'M12 21.4C9.9 19.4 2 14 2 8.3 2 4.8 4.6 2.6 7.4 2.6c2 0 3.6 1.1 4.6 2.9 1-1.8 2.6-2.9 4.6-2.9 2.8 0 5.4 2.2 5.4 5.7 0 5.7-7.9 11.1-10 13.1z',
    'M12 1.5 20.6 12 12 22.5 3.4 12z',
    'M12 2.2a4.6 4.6 0 0 1 4.3 6.2 4.6 4.6 0 1 1-2.4 8.3c.3 2.3 1.2 4 2.9 5.4H7.2c1.7-1.4 2.6-3.1 2.9-5.4a4.6 4.6 0 1 1-2.4-8.3A4.6 4.6 0 0 1 12 2.2z'
  ];
  var CROWN_PATH = 'M2 18 3.5 7l5 5L12 4l3.5 8 5-5L22 18z';

  function suitOf(c) { return Math.floor(c / 13); }
  function rankOf(c) { return c % 13 + 1; }
  function isRed(c) { var s = suitOf(c); return s === 1 || s === 2; }
  function cardName(c) { return RANK_NAMES[rankOf(c)] + ' of ' + SUIT_NAMES[suitOf(c)]; }
  function topOf(list) { return list.length ? list[list.length - 1] : -1; }

  /* Fisher-Yates shuffle, from the last card down. random() is the site's api.random. */
  function shuffle(list, random) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Deal like a person at a table: seven rows, left to right. Row r puts one card on every column from r to 6,
     so column 1 gets one card and column 7 gets seven. The top card of each column is turned face up.
     The other 24 cards are the stock; order[28] is the first card you will turn. */
  function dealState(order) {
    var s = { stock: [], waste: [], f: [[], [], [], []], t: [[], [], [], [], [], [], []], up: [], passes: 0 };
    var k = 0, r, c;
    for (var i = 0; i < 52; i++) s.up[i] = false;
    for (r = 0; r < 7; r++) for (c = r; c < 7; c++) s.t[c].push(order[k++]);
    for (c = 0; c < 7; c++) s.up[topOf(s.t[c])] = true;
    s.stock = order.slice(28).reverse();
    return s;
  }
  function copyList(l) { return l.slice(); }
  function cloneState(s) {
    return { stock: s.stock.slice(), waste: s.waste.slice(), f: s.f.map(copyList), t: s.t.map(copyList), up: s.up.slice(), passes: s.passes };
  }
  function pileOf(s, key) {
    if (key === 's') return s.stock;
    if (key === 'w') return s.waste;
    if (key.charAt(0) === 'f') return s.f[+key.charAt(1)];
    return s.t[+key.charAt(1)];
  }
  /* Foundations build up in one suit, starting with the ace. */
  function fitsFoundation(s, card, fi) {
    var f = s.f[fi];
    if (!f.length) return rankOf(card) === 1;
    var top = topOf(f);
    return suitOf(top) === suitOf(card) && rankOf(card) === rankOf(top) + 1;
  }
  /* Columns build down in alternating colours. Only a king may go into an empty column. */
  function fitsTableau(s, card, ti) {
    var t = s.t[ti];
    if (!t.length) return rankOf(card) === 13;
    var top = topOf(t);
    return s.up[top] && isRed(top) !== isRed(card) && rankOf(top) === rankOf(card) + 1;
  }
  /* Can the cards from position `index` to the top of pile `from` move to pile `to`?
     From a column you may move any face-up run; from the waste or a foundation only the top card. */
  function canMove(s, from, index, to) {
    if (from === to || from === 's' || to === 's' || to === 'w') return false;
    var src = pileOf(s, from);
    if (index < 0 || index >= src.length || !s.up[src[index]]) return false;
    var count = src.length - index;
    if (from.charAt(0) !== 't' && count !== 1) return false;
    if (to.charAt(0) === 'f') return count === 1 && fitsFoundation(s, src[index], +to.charAt(1));
    return fitsTableau(s, src[index], +to.charAt(1));
  }
  /* Move the cards. If that uncovers a face-down card in a column, turn it over (returned as `flipped`). */
  function applyMove(s, from, index, to) {
    var src = pileOf(s, from), dst = pileOf(s, to);
    var moved = src.splice(index);
    for (var i = 0; i < moved.length; i++) dst.push(moved[i]);
    var flipped = -1;
    if (from.charAt(0) === 't' && src.length && !s.up[topOf(src)]) { flipped = topOf(src); s.up[flipped] = true; }
    return { moved: moved, flipped: flipped };
  }
  /* Turn cards from the stock onto the waste, face up. */
  function drawCards(s, n) {
    var out = [];
    for (var i = 0; i < n && s.stock.length; i++) { var c = s.stock.pop(); s.up[c] = true; s.waste.push(c); out.push(c); }
    return out;
  }
  /* passLimit 0 means go round as often as you like; 1 means once through (the 1908 rule). */
  function canRecycle(s, passLimit) { return !s.stock.length && s.waste.length > 0 && (passLimit === 0 || s.passes + 1 < passLimit); }
  /* Turn the waste over to make the stock again. The order is kept, so the next pass meets the cards in the same order. */
  function recycle(s) { while (s.waste.length) { var c = s.waste.pop(); s.up[c] = false; s.stock.push(c); } s.passes++; }
  function onFoundations(s) { return s.f[0].length + s.f[1].length + s.f[2].length + s.f[3].length; }
  function isWon(s) { return onFoundations(s) === 52; }
  function faceDownLeft(s) { var n = 0; s.t.forEach(function (t) { t.forEach(function (c) { if (!s.up[c]) n++; }); }); return n; }
  function firstUp(t, s) { for (var i = 0; i < t.length; i++) if (s.up[t[i]]) return i; return -1; }

  /* =====================================================================
     PART 2: LOOKING FOR MOVES
     ===================================================================== */
  /* The foundation a card can go to: the pile already holding its suit, or an empty one for an ace. -1 if none. */
  function foundationFor(s, card) {
    var fi;
    for (fi = 0; fi < 4; fi++) if (s.f[fi].length && suitOf(topOf(s.f[fi])) === suitOf(card) && fitsFoundation(s, card, fi)) return fi;
    if (rankOf(card) === 1) for (fi = 0; fi < 4; fi++) if (!s.f[fi].length) return fi;
    return -1;
  }
  /* What a tap does: send the card (and anything on it) to its best legal place.
     1. A single card goes up to a foundation if it can.
     2. Otherwise onto another column, preferring a column that already has cards.
     3. A king goes into an empty column only if that achieves something (it comes from the waste or a
        foundation, or it uncovers a card), so a tap never shuffles a king between empty columns for nothing. */
  function bestMoveFor(s, from, index) {
    if (from === 's') return null;
    var src = pileOf(s, from);
    if (!src.length) return null;
    if (from.charAt(0) !== 't') index = src.length - 1;
    if (index < 0 || index >= src.length || !s.up[src[index]]) return null;
    var card = src[index], single = index === src.length - 1, ti;
    if (single && from.charAt(0) !== 'f') {
      var fi = foundationFor(s, card);
      if (fi >= 0) return { from: from, index: index, to: 'f' + fi };
    }
    var empty = -1;
    for (ti = 0; ti < 7; ti++) {
      if ('t' + ti === from || !fitsTableau(s, card, ti)) continue;
      if (s.t[ti].length) return { from: from, index: index, to: 't' + ti };
      if (empty < 0) empty = ti;
    }
    if (empty >= 0 && (from.charAt(0) !== 't' || index > 0)) return { from: from, index: index, to: 't' + empty };
    return null;
  }
  /* Is there a face-up king that is not already at the bottom of a column (so an empty column would help it)? */
  function kingWaiting(s) {
    var w = topOf(s.waste);
    if (w >= 0 && rankOf(w) === 13) return true;
    for (var ti = 0; ti < 7; ti++) {
      var t = s.t[ti], i = firstUp(t, s);
      if (i > 0 && rankOf(t[i]) === 13) return true;
    }
    return false;
  }
  /* The cards that can come to the top of the waste by turning the stock (and going round again, if allowed),
     without any other move. With Draw 1 that is every card; with Draw 3 some cards are always buried. */
  function reachableTops(s, drawN, passLimit) {
    var c = { stock: s.stock.slice(), waste: s.waste.slice(), passes: s.passes }, tops = [];
    if (c.waste.length) tops.push(topOf(c.waste));
    for (var guard = (c.stock.length + c.waste.length) * 3 + 6; guard > 0; guard--) {
      if (c.stock.length) {
        for (var k = 0; k < drawN && c.stock.length; k++) c.waste.push(c.stock.pop());
        tops.push(topOf(c.waste));
      } else if (canRecycle(c, passLimit) && c.passes < s.passes + 2) {
        while (c.waste.length) c.stock.push(c.waste.pop());
        c.passes++;
      } else break;
    }
    return tops;
  }
  /* Could turning the stock ever bring up a card that can be played right now? If not, turning is pointless. */
  function stockHelps(s, drawN, passLimit) {
    var tops = reachableTops(s, drawN, passLimit);
    for (var i = 0; i < tops.length; i++) {
      if (tops[i] === topOf(s.waste)) continue;
      if (foundationFor(s, tops[i]) >= 0) return true;
      for (var tj = 0; tj < 7; tj++) if (fitsTableau(s, tops[i], tj)) return true;
    }
    return false;
  }
  /* The Hint button. It scores every sensible move and suggests the best:
       a card that goes up to a foundation (best of all if it uncovers a face-down card),
       a run that moves to another column and uncovers a face-down card,
       part of a run that moves aside so the card under it can go up to a foundation,
       a card from the waste onto a column, and last of all turning the stock (only if that can help). */
  function findHint(s, passLimit, drawN) {
    var best = null, bestScore = 0, ti, tj, fi, i;
    function consider(m, score) { if (score > bestScore) { best = m; bestScore = score; } }
    var w = topOf(s.waste);
    if (w >= 0) { fi = foundationFor(s, w); if (fi >= 0) consider({ from: 'w', index: s.waste.length - 1, to: 'f' + fi }, 80); }
    for (ti = 0; ti < 7; ti++) {
      var t = s.t[ti];
      if (!t.length) continue;
      fi = foundationFor(s, topOf(t));
      if (fi >= 0) consider({ from: 't' + ti, index: t.length - 1, to: 'f' + fi }, t.length > 1 && !s.up[t[t.length - 2]] ? 90 : 70);
      var first = firstUp(t, s);
      if (first < 0) continue;
      for (tj = 0; tj < 7; tj++) {
        if (tj === ti || !fitsTableau(s, t[first], tj)) continue;
        if (!s.t[tj].length) { if (first > 0) consider({ from: 't' + ti, index: first, to: 't' + tj }, 60); }
        else consider({ from: 't' + ti, index: first, to: 't' + tj }, first > 0 ? 75 : (kingWaiting(s) ? 40 : 0));
      }
      for (i = first + 1; i < t.length; i++) {
        if (foundationFor(s, t[i - 1]) < 0) continue;
        for (tj = 0; tj < 7; tj++) if (tj !== ti && s.t[tj].length && fitsTableau(s, t[i], tj)) consider({ from: 't' + ti, index: i, to: 't' + tj }, 65);
      }
    }
    if (w >= 0) for (tj = 0; tj < 7; tj++) if (fitsTableau(s, w, tj)) consider({ from: 'w', index: s.waste.length - 1, to: 't' + tj }, s.t[tj].length ? 50 : 45);
    if ((s.stock.length || canRecycle(s, passLimit)) && stockHelps(s, drawN || 1, passLimit)) consider({ draw: true }, 10);
    return best;
  }
  /* Is there anything useful left to do? Used to tell the player when the game is stuck. */
  function anyMoveLeft(s, passLimit, drawN) { return !!findHint(s, passLimit, drawN); }
  /* The auto-finish. Once every card is face up (nothing face down in the columns and nothing left in the stock)
     the game plays itself out: it keeps sending the lowest card it can reach up to a foundation. This works out
     the whole plan on a copy first, and only finishes for you if the plan really gets all 52 cards home. */
  function finishPlan(s, drawN, passLimit) {
    if (faceDownLeft(s) > 0 || s.stock.length) return null;
    var c = cloneState(s), plan = [], idle = 0;
    for (var guard = 0; guard < 3000 && !isWon(c); guard++) {
      var best = null, bestRank = 99, ti, fi;
      var w = topOf(c.waste);
      if (w >= 0) { fi = foundationFor(c, w); if (fi >= 0) { best = { from: 'w', index: c.waste.length - 1, to: 'f' + fi }; bestRank = rankOf(w); } }
      for (ti = 0; ti < 7; ti++) {
        var top = topOf(c.t[ti]);
        if (top < 0 || rankOf(top) >= bestRank) continue;
        fi = foundationFor(c, top);
        if (fi >= 0) { best = { from: 't' + ti, index: c.t[ti].length - 1, to: 'f' + fi }; bestRank = rankOf(top); }
      }
      if (best) { applyMove(c, best.from, best.index, best.to); plan.push(best); idle = 0; continue; }
      if (c.stock.length) { drawCards(c, drawN); plan.push({ draw: true }); }
      else if (canRecycle(c, passLimit)) { recycle(c); plan.push({ recycle: true }); }
      else return null;
      if (++idle > 120) return null;
    }
    return isWon(c) ? plan : null;
  }

  /* =====================================================================
     PART 3: THE SCREEN
     ===================================================================== */
  var DEAL_STEP = 26;        /* ms between cards while dealing */
  var FINISH_STEP = 95;      /* ms between cards in the auto-finish */
  var PILES = ['s', 'w', 'f0', 'f1', 'f2', 'f3', 't0', 't1', 't2', 't3', 't4', 't5', 't6'];
  var TOP_ROW = ['s', 'w', 'f0', 'f1', 'f2', 'f3'];
  var TOP_COL = { s: 0, w: 1, f0: 3, f1: 4, f2: 5, f3: 6 };
  var UNDER_TOP = ['s', 'w', 'w', 'f0', 'f1', 'f2', 'f3'];   /* which top-row pile sits above each column */

  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgIcon(path, cls) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    if (cls) s.setAttribute('class', cls);
    var p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', path); s.appendChild(p);
    return s;
  }
  function fmtTime(ms) {
    var sec = Math.max(0, Math.floor(ms / 1000)), m = Math.floor(sec / 60), r = sec % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  function capital(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  var CSS = [
    /* the board reaches into the frame's padding on phones, so seven columns of cards fit at 320 px */
    '.game-klondike .kl-wrap { position: relative; margin: 0 -6px; }',
    '@media (max-width: 520px) { .game-klondike .kl-wrap { margin: 0 -9px; } }',
    '.game-klondike .kl-board { position: relative; width: 100%; min-height: 260px; outline: none; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent;',
    '  --kl-black: var(--bg); --kl-red: var(--vermilion); --kl-paper: var(--ink); --kl-edge: var(--ink-muted); }',
    '.game-klondike .kl-board.is-instant .kl-card, .game-klondike .kl-board.is-instant .kl-inner { transition: none !important; }',
    /* empty places: dashed outlines with a faint letter */
    '.game-klondike .kl-slot { position: absolute; left: 0; top: 0; width: var(--cw); height: var(--ch); border-radius: var(--cr); border: 2px dashed var(--line); display: grid; place-items: center; color: var(--line); font-family: var(--font-poster); font-size: calc(var(--cw) * .44); line-height: 1; pointer-events: none; }',
    '.game-klondike .kl-slot svg { width: 52%; height: 52%; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }',
    '.game-klondike .kl-slot.is-stock { border-style: solid; color: var(--ink-muted); cursor: pointer; pointer-events: auto; }',
    '.game-klondike .kl-slot.is-stock.is-done { opacity: .45; cursor: default; }',
    /* a card: the outer box is moved with transform; the inner box turns over (rotateY) to show the back */
    '.game-klondike .kl-card { position: absolute; left: 0; top: 0; width: var(--cw); height: var(--ch); transition: transform .22s cubic-bezier(.2,.7,.3,1); touch-action: manipulation; perspective: 900px; }',
    '.game-klondike .kl-card.is-up { cursor: grab; touch-action: none; }',
    '.game-klondike .kl-card.is-stockcard { cursor: pointer; }',
    '.game-klondike .kl-card.is-drag { transition: none; cursor: grabbing; }',
    '.game-klondike .kl-inner { position: absolute; inset: 0; transform-style: preserve-3d; transition: transform .3s ease; }',
    '.game-klondike .kl-card:not(.is-up) .kl-inner { transform: rotateY(180deg); }',
    '.game-klondike .kl-front, .game-klondike .kl-back { position: absolute; inset: 0; border-radius: var(--cr); -webkit-backface-visibility: hidden; backface-visibility: hidden; overflow: hidden; }',
    '.game-klondike .kl-front { background: var(--kl-paper); color: var(--kl-black); box-shadow: inset 0 0 0 1px var(--kl-edge), 0 1px 3px var(--kl-shadow, transparent); }',
    '.game-klondike .kl-front.is-red { color: var(--kl-red); }',
    '.game-klondike .kl-idx { position: absolute; left: 6%; top: 3%; display: flex; align-items: center; gap: 1px; line-height: 1; white-space: nowrap; }',
    '.game-klondike .kl-idx b { font: 800 var(--idx)/1 var(--font-head); letter-spacing: -.06em; }',
    '.game-klondike .kl-idx svg { width: calc(var(--idx) * .8); height: calc(var(--idx) * .8); fill: currentColor; flex: none; }',
    '.game-klondike .kl-idx-b { left: auto; top: auto; right: 6%; bottom: 3%; transform: rotate(180deg); }',
    '.game-klondike .is-small .kl-idx-b { display: none; }',
    '.game-klondike .kl-pip { position: absolute; left: 50%; top: 52%; width: 44%; height: 44%; transform: translate(-50%, -50%); fill: currentColor; }',
    '.game-klondike .is-small .kl-pip { top: 62%; width: 50%; height: 50%; }',
    '.game-klondike .kl-pip.is-ace { width: 60%; height: 60%; }',
    '.game-klondike .kl-court { position: absolute; left: 19%; right: 19%; top: 19%; bottom: 19%; border-radius: calc(var(--cr) * .7); border: max(1px, calc(var(--cw) * .025)) solid var(--gold-shadow); background: var(--kl-tint, transparent); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2%; }',
    '.game-klondike .kl-court .kl-crown { width: 46%; height: 18%; fill: var(--gold-shadow); }',
    '.game-klondike .kl-court b { font: 400 calc(var(--cw) * .46)/.9 var(--font-poster); }',
    '.game-klondike .kl-court .kl-cs { width: 30%; height: 22%; fill: currentColor; }',
    '.game-klondike .is-small .kl-court .kl-crown { display: none; }',
    '.game-klondike .is-small .kl-court { left: 12%; right: 12%; top: 34%; bottom: 6%; }',
    /* Edwardian card back: a plum ground, a gilt lattice, a cream margin and a centre medallion */
    '.game-klondike .kl-back { transform: rotateY(180deg); background-color: var(--brand); border: max(2px, calc(var(--cw) * .045)) solid var(--kl-paper);',
    '  background-image: radial-gradient(ellipse 22% 15% at 50% 50%, var(--gold) 0 46%, var(--rose) 50% 70%, transparent 74%), repeating-linear-gradient(45deg, transparent 0 4px, var(--peacock) 4px 5px), repeating-linear-gradient(-45deg, transparent 0 4px, var(--peacock) 4px 5px);',
    '  box-shadow: inset 0 0 0 1px var(--gold), inset 0 0 0 3px var(--brand), inset 0 0 0 4px var(--gold), 0 1px 3px var(--kl-shadow, transparent); }',
    /* colour mixes for browsers that have them: a deeper red that reads well on cream, soft shadows, a plum back */
    '@supports (color: color-mix(in srgb, red, blue)) {',
    '  .game-klondike .kl-board { --kl-red: color-mix(in srgb, var(--vermilion) 76%, var(--bg)); --kl-edge: color-mix(in srgb, var(--bg) 35%, var(--ink)); --kl-shadow: color-mix(in srgb, var(--bg) 55%, transparent); --kl-plum: color-mix(in srgb, var(--rose) 40%, var(--bg)); }',
    '  .game-klondike .kl-court { --kl-tint: color-mix(in srgb, currentColor 9%, transparent); }',
    '  .game-klondike .kl-back { background-color: var(--kl-plum);',
    '    background-image: radial-gradient(ellipse 22% 15% at 50% 50%, var(--gold) 0 46%, var(--rose) 50% 70%, transparent 74%), radial-gradient(circle at 50% 50%, transparent 0 30%, color-mix(in srgb, var(--bg) 35%, transparent) 75%), repeating-linear-gradient(45deg, transparent 0 4px, color-mix(in srgb, var(--gold) 55%, transparent) 4px 5px), repeating-linear-gradient(-45deg, transparent 0 4px, color-mix(in srgb, var(--peacock) 75%, transparent) 4px 5px);',
    '    box-shadow: inset 0 0 0 1px var(--gold), inset 0 0 0 3px var(--kl-plum), inset 0 0 0 4px var(--gold), 0 1px 3px var(--kl-shadow); }',
    '}',
    /* lifted, dragged, hinted and keyboard-held cards */
    '.game-klondike .kl-card.is-lift { z-index: 600 !important; }',
    '.game-klondike .kl-card.is-drag .kl-front, .game-klondike .kl-card.is-held .kl-front { box-shadow: inset 0 0 0 1px var(--kl-edge), 0 10px 18px var(--kl-shadow, transparent); }',
    '.game-klondike .kl-card.is-held .kl-front { outline: 3px solid var(--gold); outline-offset: -1px; }',
    '.game-klondike .kl-card.is-hint .kl-front, .game-klondike .kl-slot.is-hint { outline: 4px solid var(--gold); outline-offset: -2px; animation: game-klondike-glow .55s ease-in-out 3 alternate; }',
    '@keyframes game-klondike-glow { from { outline-color: var(--gold); } to { outline-color: var(--rose); } }',
    '.game-klondike .kl-card.is-nope { animation: game-klondike-nope .32s ease; }',
    '@keyframes game-klondike-nope { 0%, 100% { margin-left: 0; } 25% { margin-left: -6px; } 75% { margin-left: 6px; } }',
    '.game-klondike .kl-card.is-home .kl-front { animation: game-klondike-home .4s ease-out; }',
    '@keyframes game-klondike-home { 0% { filter: brightness(1.35); transform: scale(1.08); } 100% { filter: none; transform: none; } }',
    /* keyboard cursor */
    '.game-klondike .kl-cursor { position: absolute; left: 0; top: 0; border-radius: var(--cr); outline: 4px solid var(--focus); outline-offset: 2px; pointer-events: none; z-index: 700; display: none; transition: transform .12s ease, width .12s, height .12s; }',
    '.game-klondike .kl-board.is-kb:focus .kl-cursor, .game-klondike .kl-board:focus-visible .kl-cursor { display: block; }',
    '.game-klondike .kl-board:focus-visible { box-shadow: none; }',
    /* toolbar and scoreboard */
    '.game-klondike .game-toolbar { justify-content: center; }',
    '.game-klondike .kl-stats { justify-content: center; font-family: var(--font-head); }',
    '.game-klondike .kl-stats b { font-family: var(--font-poster); font-weight: 400; font-size: 1.3em; color: var(--gold); display: inline-block; }',
    '.game-klondike .kl-stats .kl-time { min-width: 3.2ch; }',
    '.game-klondike .kl-stats .kl-best b { color: var(--leaf); }',
    '.game-klondike .kl-tools { display: flex; flex-wrap: wrap; justify-content: center; gap: .5rem; }',
    '@media (max-width: 359px) { .game-klondike .game-toolbar .btn { padding: .4rem .55rem; font-size: .95rem; } .game-klondike .kl-tools { gap: .35rem; } .game-klondike .scoreboard { gap: .2rem .5rem; font-size: .78rem; } }',
    '.game-klondike .game-toolbar .btn { white-space: nowrap; }',
    '.game-klondike .kl-rules { display: flex; justify-content: center; margin-top: .8rem; }',
    '.game-klondike .kl-rules .field { flex-wrap: wrap; justify-content: center; font-weight: 600; color: var(--ink-muted); }',
    '.game-klondike .kl-rules select { max-width: 100%; }',
    '.game-klondike .kl-finale { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 800; cursor: pointer; transition: opacity .6s ease; }',
    '.game-klondike .kl-note { text-align: center; }',
    '@media (max-width: 520px) { .game-klondike .game-toolbar { gap: .45rem; margin-bottom: .6rem; } .game-klondike .kl-tools { gap: .4rem; } .game-klondike .game-toolbar .btn { padding: .4rem .75rem; } .game-klondike .seg button { padding: .35rem .85rem; } .game-klondike .scoreboard { gap: .2rem .6rem; font-size: .82rem; margin-bottom: .5rem; } .game-klondike .kl-stats b { font-size: 1.2em; } .game-klondike .kl-note { font-size: .88rem; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'klondike',
    frame: 'baize',
    mount: function (root, api) {
      var h = api.h;
      var reduced = !!api.reducedMotion;

      /* ---- settings, remembered for next time ---- */
      /* the chosen settings; the game in progress keeps the ones it was dealt with (drawN, passLimit) */
      var wantDraw = api.store.get('draw', 1) === 3 ? 3 : 1;
      var wantPasses = api.store.get('passes', 0) === 1 ? 1 : 0;
      var drawN = wantDraw, passLimit = wantPasses;
      var wins = Number(api.store.get('wins', 0)) || 0;

      /* ---- game state ---- */
      var s = null;              /* the rules state from Part 1 */
      var history = [];          /* saved states for Undo */
      var moves = 0;
      var startedAt = 0;         /* when the first move was made (0 = clock not started) */
      var finishedMs = 0;
      var won = false, dealing = false, finishing = false;
      var timers = [];           /* every setTimeout, so New game and destroy can stop them all */
      var clock = null;          /* the setInterval that updates the time */
      var finaleStop = null;     /* stops the bouncing-cards finale */
      var L = null;              /* layout: card size and pile positions */
      var cardEls = [];          /* card number -> element */
      var slotEls = {};          /* pile name -> empty-place element */
      var cursor = { pile: 't0', depth: 0 };
      var held = null;           /* keyboard: {from, index} of cards picked up with Enter */
      var drag = null;           /* pointer: the tap or drag in progress */
      var hintTimer = null;
      var lastPos = null;        /* where every card was last drawn */

      function later(ms, fn) { var id = setTimeout(function () { timers = timers.filter(function (t) { return t !== id; }); fn(); }, ms); timers.push(id); return id; }
      function clearTimers() { timers.forEach(clearTimeout); timers = []; }

      root.appendChild(h('style', null, CSS));

      /* ---- toolbar ---- */
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(); board.focus({ preventScroll: true }); } }, 'New game');
      var undoBtn = h('button', { class: 'btn', type: 'button', onclick: function () { undo(); } }, 'Undo');
      var hintBtn = h('button', { class: 'btn', type: 'button', onclick: function () { hint(); } }, 'Hint');
      var draw1Btn = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setDraw(1); } }, 'Draw 1');
      var draw3Btn = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setDraw(3); } }, 'Draw 3');
      var passSelect = h('select', { id: 'kl-passes', onchange: function () { setPasses(passSelect.value === 'once' ? 1 : 0); } },
        h('option', { value: 'again' }, 'go round again'),
        h('option', { value: 'once' }, 'once only (1908)'));
      var toolbar = h('div', { class: 'game-toolbar' },
        h('span', { class: 'kl-tools' }, newBtn, undoBtn, hintBtn),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Cards turned from the stock' }, draw1Btn, draw3Btn));

      var movesEl = h('b', null, '0'), timeEl = h('b', { class: 'kl-time' }, '0:00'), bestEl = h('b', null, '-'), winsEl = h('b', null, String(wins));
      var stats = h('div', { class: 'scoreboard kl-stats', role: 'group', 'aria-label': 'Score' },
        h('span', null, 'Moves ', movesEl), h('span', null, 'Time ', timeEl), h('span', { class: 'kl-best' }, 'Best ', bestEl), h('span', null, 'Won ', winsEl));

      var board = h('div', { class: 'kl-board', tabindex: '0', role: 'application', 'aria-roledescription': 'card table',
        'aria-label': 'Klondike patience. Arrow keys choose a pile, Enter picks up cards and puts them down, Space turns a card from the stock, U undoes, H gives a hint.' });
      var cursorEl = h('div', { class: 'kl-cursor', 'aria-hidden': 'true' });
      var wrap = h('div', { class: 'kl-wrap' }, board);
      var note = h('p', { class: 'game-note kl-note' }, 'Tap a card to send it to its best place, or drag it. Keyboard: arrows choose a pile, Enter picks up and puts down, Space turns the stock, U undoes, H hints.');
      var rules = h('div', { class: 'kl-rules' }, h('label', { class: 'field', for: 'kl-passes' }, 'Stock:', passSelect));
      root.appendChild(toolbar);
      root.appendChild(stats);
      root.appendChild(wrap);
      root.appendChild(rules);
      root.appendChild(note);

      /* ---- build the 13 empty places and the 52 cards once; they are reused every game ---- */
      PILES.forEach(function (key) {
        var el = h('div', { class: 'kl-slot' + (key === 's' ? ' is-stock' : ''), 'data-pile': key, 'aria-hidden': 'true' });
        if (key.charAt(0) === 'f') el.textContent = 'A';
        if (key.charAt(0) === 't') el.textContent = 'K';
        slotEls[key] = el; board.appendChild(el);
      });
      var recycleIcon = (function () {
        var sv = document.createElementNS(SVGNS, 'svg'); sv.setAttribute('viewBox', '0 0 24 24'); sv.setAttribute('aria-hidden', 'true');
        var p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', 'M19 8.5A8 8 0 1 0 20 13M19 3.5v5h-5'); sv.appendChild(p); return sv;
      })();
      slotEls.s.appendChild(recycleIcon);
      for (var ci = 0; ci < 52; ci++) { cardEls[ci] = makeCard(ci); board.appendChild(cardEls[ci]); }
      board.appendChild(cursorEl);

      function makeCard(card) {
        var r = rankOf(card), su = suitOf(card), path = SUIT_PATHS[su];
        var centre;
        if (r > 10) centre = h('span', { class: 'kl-court' }, r !== 11 ? svgIcon(CROWN_PATH, 'kl-crown') : null, h('b', null, RANK_LABELS[r]), svgIcon(path, 'kl-cs'));
        else centre = svgIcon(path, 'kl-pip' + (r === 1 ? ' is-ace' : ''));
        var front = h('div', { class: 'kl-front' + (isRed(card) ? ' is-red' : '') },
          h('span', { class: 'kl-idx' }, h('b', null, RANK_LABELS[r]), svgIcon(path)),
          centre,
          h('span', { class: 'kl-idx kl-idx-b' }, h('b', null, RANK_LABELS[r]), svgIcon(path)));
        return h('div', { class: 'kl-card', 'data-card': String(card), 'aria-hidden': 'true' },
          h('div', { class: 'kl-inner' }, front, h('div', { class: 'kl-back' })));
      }

      /* ---- layout: card size from the board width; pile positions; columns squeeze up when they get long ---- */
      function measure() {
        var W = board.clientWidth || 300;
        var gap = Math.max(3, Math.min(12, Math.round(W * 0.012)));
        var cw = Math.floor(Math.min(100, (W - gap * 6) / 7));
        var ch = Math.round(cw * 1.4);
        var x0 = Math.floor((W - (cw * 7 + gap * 6)) / 2);
        var idx = Math.round(Math.max(13, Math.min(24, cw * 0.37)));
        L = {
          W: W, cw: cw, ch: ch, gap: gap, x0: x0, idx: idx,
          tabY: ch + Math.max(10, Math.round(ch * 0.16)),
          fd: Math.max(4, Math.round(ch * 0.085)),
          fu: Math.max(Math.round(idx * 1.2 + cw * 0.08), Math.round(ch * 0.2)),
          fan: Math.max(Math.round(cw * 0.3), Math.min(Math.floor((cw + gap) / 2) - 1, Math.round(idx * 1.75 + cw * 0.06))),
          maxH: Math.max(ch * 4.5, (window.innerHeight || 800) - 150)
        };
        board.style.setProperty('--cw', cw + 'px');
        board.style.setProperty('--ch', ch + 'px');
        board.style.setProperty('--cr', Math.max(4, Math.round(cw * 0.09)) + 'px');
        board.style.setProperty('--idx', idx + 'px');
        board.classList.toggle('is-small', cw < 56);
      }
      function colX(i) { return L.x0 + i * (L.cw + L.gap); }
      function pileXY(key) {
        if (key.charAt(0) === 't') return { x: colX(+key.charAt(1)), y: L.tabY };
        return { x: colX(TOP_COL[key]), y: 0 };
      }
      /* The vertical gaps in one column, squeezed if the column would be taller than the screen allows. */
      function columnSteps(t) {
        var fd = L.fd, fu = L.fu, downs = 0, ups = 0;
        for (var i = 0; i < t.length - 1; i++) { if (s.up[t[i]]) ups++; else downs++; }
        var height = L.tabY + downs * fd + ups * fu + L.ch;
        if (height > L.maxH && ups > 0) {
          fd = Math.max(3, Math.round(fd * 0.6));
          var room = L.maxH - L.tabY - L.ch - downs * fd;
          fu = Math.min(L.fu, Math.max(Math.round(L.idx * 1.05), Math.floor(room / ups)));
        }
        return { fd: fd, fu: fu };
      }
      /* Where every card sits: {x, y, z} by card number, plus the bottom edge of the longest column. */
      function positions() {
        var pos = [], i, xy;
        function put(card, x, y, z) { pos[card] = { x: x, y: y, z: z }; }
        xy = pileXY('s'); for (i = 0; i < s.stock.length; i++) put(s.stock[i], xy.x, xy.y, 10 + i);
        xy = pileXY('w');
        var fanFrom = drawN === 3 ? Math.max(0, s.waste.length - 3) : s.waste.length;
        for (i = 0; i < s.waste.length; i++) put(s.waste[i], xy.x + (i >= fanFrom ? (i - fanFrom) * L.fan : 0), xy.y, 10 + i);
        for (var fi = 0; fi < 4; fi++) { xy = pileXY('f' + fi); for (i = 0; i < s.f[fi].length; i++) put(s.f[fi][i], xy.x, xy.y, 10 + i); }
        var bottom = L.tabY + L.ch * 3;
        for (var ti = 0; ti < 7; ti++) {
          var t = s.t[ti], steps = columnSteps(t), y = L.tabY;
          xy = pileXY('t' + ti);
          for (i = 0; i < t.length; i++) {
            put(t[i], xy.x, y, 10 + i);
            if (i < t.length - 1) y += s.up[t[i]] ? steps.fu : steps.fd;
          }
          bottom = Math.max(bottom, y + L.ch);
        }
        pos.bottom = bottom;
        return pos;
      }
      function whereIs(card) {
        if (s.stock.indexOf(card) >= 0) return 's';
        if (s.waste.indexOf(card) >= 0) return 'w';
        for (var i = 0; i < 4; i++) if (s.f[i].indexOf(card) >= 0) return 'f' + i;
        for (i = 0; i < 7; i++) if (s.t[i].indexOf(card) >= 0) return 't' + i;
        return '';
      }

      /* ---- drawing: move every card element to its place; CSS transitions make them glide ---- */
      function render(instant) {
        if (!s || !L) return;
        if (instant) board.classList.add('is-instant');
        var pos = positions();
        lastPos = pos;
        board.style.height = Math.ceil(pos.bottom + 8) + 'px';
        var heldSet = {};
        if (held) { var hp = pileOf(s, held.from); for (var k = held.index; k < hp.length; k++) heldSet[hp[k]] = true; }
        var stockTop = topOf(s.stock);
        for (var card = 0; card < 52; card++) {
          var el = cardEls[card], p = pos[card];
          if (!p || (drag && drag.moved && drag.set[card])) continue;
          var raise = heldSet[card] ? -Math.round(L.ch * 0.12) : 0;
          el.style.transform = 'translate(' + p.x + 'px,' + (p.y + raise) + 'px)';
          el.style.zIndex = String(heldSet[card] ? 500 + p.z : p.z);
          el.classList.toggle('is-up', !!s.up[card]);
          el.classList.toggle('is-held', !!heldSet[card]);
          el.classList.toggle('is-stockcard', card === stockTop);
          el.setAttribute('data-pile', whereIs(card));
        }
        PILES.forEach(function (key) {
          var xy = pileXY(key);
          slotEls[key].style.transform = 'translate(' + xy.x + 'px,' + xy.y + 'px)';
        });
        var canGoRound = canRecycle(s, passLimit);
        slotEls.s.classList.toggle('is-done', !s.stock.length && !canGoRound);
        recycleIcon.style.display = !s.stock.length && canGoRound ? '' : 'none';
        slotEls.s.setAttribute('title', s.stock.length ? 'Turn a card' : canGoRound ? 'Turn the waste over' : 'The stock is used up');
        board.setAttribute('data-moves', String(moves));
        board.setAttribute('data-won', won ? 'yes' : 'no');
        placeCursor();
        if (instant) { void board.offsetWidth; board.classList.remove('is-instant'); }
        updateStats();
      }
      /* Lift moving cards above everything else while they glide. */
      function lift(cards, ms) {
        cards.forEach(function (c) { cardEls[c].classList.add('is-lift'); });
        later(ms || 260, function () { cards.forEach(function (c) { cardEls[c].classList.remove('is-lift'); }); });
      }

      /* ---- the clock and the scoreboard ---- */
      function bestKey() { return 'best:' + drawN + (passLimit ? 'once' : 'again'); }
      function elapsed() { return finishedMs || (startedAt ? Date.now() - startedAt : 0); }
      function updateStats() {
        movesEl.textContent = String(moves);
        timeEl.textContent = fmtTime(elapsed());
        var best = api.store.get(bestKey(), null);
        bestEl.textContent = best ? fmtTime(best) : '-';
        winsEl.textContent = String(wins);
        undoBtn.disabled = !history.length || won || finishing || dealing;
        hintBtn.disabled = won || finishing || dealing;
        draw1Btn.setAttribute('aria-pressed', String(wantDraw === 1));
        draw3Btn.setAttribute('aria-pressed', String(wantDraw === 3));
        passSelect.value = wantPasses ? 'once' : 'again';
      }
      function startClock() { if (!startedAt) startedAt = Date.now(); }
      var READY = 'Your move: red on black, aces to the top.';

      /* ---- a new deal ---- */
      function newGame() {
        /* shuffle first, before anything else uses the random numbers */
        var order = shuffle(Array.apply(null, Array(52)).map(function (_, i) { return i; }), api.random);
        clearTimers();
        stopFinale();
        clearHint();
        if (drag) { endDrag(); drag = null; }
        s = dealState(order);
        drawN = wantDraw; passLimit = wantPasses;
        history = []; moves = 0; startedAt = 0; finishedMs = 0; won = false; finishing = false; held = null;
        cursor = { pile: 't0', depth: 0 };
        api.sound('shuffle');
        measure();
        if (reduced) { dealing = false; render(true); api.status(READY); return; }
        /* the deal: every card starts on the stock and flies to its column, in dealing order */
        dealing = true;
        var real = s;
        s = { stock: order.slice().reverse(), waste: [], f: [[], [], [], []], t: [[], [], [], [], [], [], []], up: real.up.map(function () { return false; }), passes: 0 };
        render(true);
        s = real;
        var dealOrder = [];
        for (var r = 0; r < 7; r++) for (var col = r; col < 7; col++) dealOrder.push(s.t[col][r]);
        dealOrder.forEach(function (card, i) {
          cardEls[card].style.transitionDelay = (i * DEAL_STEP) + 'ms';
          cardEls[card].firstChild.style.transitionDelay = (i * DEAL_STEP + 200) + 'ms';
        });
        api.status('Dealing seven columns...');
        later(20, function () { render(false); });
        later(dealOrder.length * DEAL_STEP + 520, function () {
          dealOrder.forEach(function (card) { cardEls[card].style.transitionDelay = ''; cardEls[card].firstChild.style.transitionDelay = ''; });
          dealing = false;
          api.sound('flip');
          api.status(READY);
          updateStats();
        });
        updateStats();
      }

      /* ---- doing things ---- */
      function snapshot() { history.push({ s: cloneState(s), moves: moves }); if (history.length > 400) history.shift(); }
      function busy() { return dealing || finishing || won; }

      function doMove(m) {
        if (!canMove(s, m.from, m.index, m.to)) return false;
        snapshot();
        var res = applyMove(s, m.from, m.index, m.to);
        moves++; startClock();
        held = null;
        lift(res.moved);
        var first = res.moved[0];
        if (m.to.charAt(0) === 'f') {
          api.sound('coin');
          var el = cardEls[first];
          el.classList.remove('is-home'); void el.offsetWidth; el.classList.add('is-home');
          later(450, function () { el.classList.remove('is-home'); });
          var home = onFoundations(s);
          api.status(capital(cardName(first)) + ' goes up to the foundation.' + (home >= 40 && home < 52 ? ' Nearly there!' : ''));
        } else {
          api.sound('click');
          var dst = pileOf(s, m.to), under = dst[dst.length - res.moved.length - 1];
          api.status(capital(cardName(first)) + (under != null ? ' goes on the ' + cardName(under) : ' goes into the empty column') + (res.moved.length > 1 ? ', with ' + (res.moved.length - 1) + ' more.' : '.'));
        }
        if (res.flipped >= 0) { later(130, function () { api.sound('flip'); }); api.announce('You turned over the ' + cardName(res.flipped) + '.'); }
        cursorFollow(m.to);
        render(false);
        afterMove();
        return true;
      }
      function drawStock(how) {
        if (busy()) return;
        held = null;
        clearHint();
        if (s.stock.length) {
          snapshot();
          var got = drawCards(s, drawN);
          moves++; startClock();
          lift(got, 320);
          api.sound('flip');
          api.status('You turn the ' + cardName(topOf(s.waste)) + '.');
          api.announce('Waste: ' + cardName(topOf(s.waste)) + '. ' + s.stock.length + ' left in the stock.');
        } else if (canRecycle(s, passLimit)) {
          snapshot();
          recycle(s);
          moves++;
          api.sound('shuffle');
          api.status('You turn the waste over to go round the stock again.');
        } else {
          api.sound('wrong');
          api.status(passLimit ? 'The stock is used up: in the 1908 rules you go through it only once.' : 'The stock and the waste are both empty.');
          return;
        }
        if (how === 'key') cursor = { pile: 'w', depth: 0 };
        render(false);
        afterMove();
      }
      function afterMove() {
        if (isWon(s)) { win(); return; }
        var plan = finishPlan(s, drawN, passLimit);
        if (plan) { autoFinish(plan); return; }
        if (!anyMoveLeft(s, passLimit, drawN)) api.status('No moves left. Try Undo, or deal a new game.');
      }

      /* Why a move is not allowed, in words a kid can use next time. */
      function whyNot(from, index, to) {
        var card = pileOf(s, from)[index];
        if (card == null) return 'That move is not allowed.';
        if (to.charAt(0) === 'f') {
          if (pileOf(s, from).length - 1 !== index) return 'Only one card at a time can go up to a foundation.';
          return 'Foundations start with an ace and build up in one suit: ace, two, three and so on.';
        }
        var t = s.t[+to.charAt(1)];
        if (!t.length) return 'Only a king can go into an empty column.';
        var top = topOf(t);
        if (isRed(top) === isRed(card)) return 'Colours must change: red on black, or black on red.';
        return 'The ' + cardName(card) + ' must sit on a card one higher, a ' + RANK_NAMES[Math.min(13, rankOf(card) + 1)] + '.';
      }
      function nope(cards, msg) {
        api.sound('wrong');
        cards.forEach(function (c) { var el = cardEls[c]; el.classList.remove('is-nope'); void el.offsetWidth; el.classList.add('is-nope'); });
        later(360, function () { cards.forEach(function (c) { cardEls[c].classList.remove('is-nope'); }); });
        if (msg) api.status(msg);
      }

      function tap(pile, index) {
        if (busy()) return;
        clearHint();
        if (pile === 's') { drawStock('tap'); return; }
        var src = pileOf(s, pile);
        if (!src.length) return;
        if (pile.charAt(0) !== 't') index = src.length - 1;
        if (!s.up[src[index]]) { api.sound('tick'); api.status('That card is face down. Clear the cards above it first.'); return; }
        /* a tap never pulls a card back off a foundation by accident; drag it down if you really need it */
        if (pile.charAt(0) === 'f') { api.sound('tick'); api.status('To take a card back off a foundation, drag it onto a column.'); return; }
        var m = bestMoveFor(s, pile, index);
        if (m) doMove(m);
        else nope(src.slice(index), 'The ' + cardName(src[index]) + ' has nowhere to go yet.');
      }

      function undo() {
        if (!history.length || dealing || finishing || won) return;
        var prev = history.pop();
        s = prev.s; moves = prev.moves; held = null;
        clearHint();
        api.sound('pop');
        api.status('Move undone.');
        clampCursor();
        render(false);
      }

      function clearHint() {
        if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; }
        Array.prototype.forEach.call(board.querySelectorAll('.is-hint'), function (el) { el.classList.remove('is-hint'); });
      }
      function hint() {
        if (busy()) return;
        clearHint();
        var m = findHint(s, passLimit, drawN);
        if (!m) { api.sound('wrong'); api.status('No moves left. Try Undo, or deal a new game.'); return; }
        api.sound('bell');
        var marks = [];
        if (m.draw) {
          marks.push(s.stock.length ? cardEls[topOf(s.stock)] : slotEls.s);
          api.status(s.stock.length ? 'Hint: turn a card from the stock.' : 'Hint: turn the waste over and go round again.');
        } else {
          var src = pileOf(s, m.from), card = src[m.index], dst = pileOf(s, m.to);
          marks.push(cardEls[card]);
          marks.push(dst.length ? cardEls[topOf(dst)] : slotEls[m.to]);
          var where = m.to.charAt(0) === 'f' ? 'up to the foundation' : dst.length ? 'onto the ' + cardName(topOf(dst)) : 'into the empty column';
          api.status('Hint: move the ' + cardName(card) + ' ' + where + '.');
        }
        marks.forEach(function (el) { el.classList.add('is-hint'); });
        hintTimer = setTimeout(function () { hintTimer = null; clearHint(); }, 1900);
      }

      /* ---- auto-finish and the win ---- */
      function autoFinish(plan) {
        finishing = true;
        held = null;
        api.status('Every card is face up. Finishing for you!');
        updateStats();
        var step = 0;
        function next() {
          if (step >= plan.length) { finishing = false; if (isWon(s)) win(); else render(false); return; }
          var m = plan[step++];
          if (m.draw) { drawCards(s, drawN); api.sound('flip'); }
          else if (m.recycle) recycle(s);
          else { var res = applyMove(s, m.from, m.index, m.to); lift(res.moved, 220); api.sound('tick'); }
          moves++;
          if (reduced) next(); else { render(false); later(FINISH_STEP, next); }
        }
        if (reduced) next(); else later(260, next);
      }
      function win() {
        if (won) return;
        won = true; finishing = false; held = null;
        finishedMs = elapsed() || 1;
        wins++; api.store.set('wins', wins);
        var best = api.store.get(bestKey(), null), isBest = !best || finishedMs < best;
        if (isBest) api.store.set(bestKey(), finishedMs);
        render(false);
        api.status('You won in ' + fmtTime(finishedMs) + ' with ' + moves + ' moves!' + (isBest ? ' That is your best time.' : ''));
        api.celebrate(isBest && best ? 'New best time: ' + fmtTime(finishedMs) + '!' : 'You won in ' + fmtTime(finishedMs) + '!');
        if (!reduced) later(450, finale);
      }

      /* The bouncing-cards finale: the cards leap off the foundations, kings first, and bounce across the
         table leaving trails, the way the 1990 computer version ended. Tap or press a key to stop it. */
      function finale() {
        stopFinale();
        var rect = wrap.getBoundingClientRect(), brect = board.getBoundingClientRect();
        var W = Math.round(rect.width), H = Math.round(rect.height);
        if (W < 50 || H < 50) return;
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        var cv = h('canvas', { class: 'kl-finale', 'aria-hidden': 'true', width: String(W * dpr), height: String(H * dpr) });
        var ctx = cv.getContext('2d');
        if (!ctx) return;
        ctx.scale(dpr, dpr);
        wrap.appendChild(cv);
        var sample = cardEls[0].querySelector('.kl-front'), sampleRed = cardEls[13].querySelector('.kl-front');
        var paper = getComputedStyle(sample).backgroundColor;
        var black = getComputedStyle(sample).color, red = getComputedStyle(sampleRed).color;
        var edge = getComputedStyle(board).getPropertyValue('--ink-muted').trim() || black;
        var font = (getComputedStyle(root).getPropertyValue('--font-head') || 'sans-serif').trim();
        var cw = L.cw, ch = L.ch, ox = brect.left - rect.left, oy = brect.top - rect.top;
        var paths = SUIT_PATHS.map(function (d) { try { return new Path2D(d); } catch (e) { return null; } });
        function drawCard(card, x, y) {
          ctx.fillStyle = paper; ctx.strokeStyle = edge; ctx.lineWidth = 1;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, Math.max(3, cw * 0.09)); else ctx.rect(x, y, cw, ch);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = isRed(card) ? red : black;
          ctx.font = '800 ' + L.idx + 'px ' + font;
          ctx.textBaseline = 'top';
          ctx.fillText(RANK_LABELS[rankOf(card)], x + cw * 0.08, y + ch * 0.04);
          var p = paths[suitOf(card)];
          if (p) { ctx.save(); ctx.translate(x + cw * 0.26, y + ch * 0.4); ctx.scale(cw * 0.48 / 24, cw * 0.48 / 24); ctx.fill(p); ctx.restore(); }
        }
        var order = [];
        for (var rk = 13; rk >= 1; rk--) for (var fi = 0; fi < 4; fi++) { var f = s.f[fi]; if (f[rk - 1] != null) order.push({ card: f[rk - 1], fi: fi }); }
        var flying = [], next = 0, lastLaunch = 0, t0 = performance.now(), raf = 0, stopped = false;
        function frame(now) {
          if (stopped) return;
          if (next < order.length && now - lastLaunch > 170) {
            var o = order[next++], xy = pileXY('f' + o.fi);
            flying.push({ card: o.card, x: xy.x + ox, y: xy.y + oy, vx: (api.random() < 0.5 ? -1 : 1) * (2 + api.random() * 4), vy: -api.random() * 6 - 2 });
            cardEls[o.card].style.visibility = 'hidden';
            lastLaunch = now;
          }
          for (var i = 0; i < flying.length; i++) {
            var p = flying[i];
            p.vy += 0.55; p.x += p.vx; p.y += p.vy;
            if (p.y + ch > H) { p.y = H - ch; p.vy = -p.vy * 0.74; if (Math.abs(p.vy) < 2) p.vy = -6 - api.random() * 4; }
            drawCard(p.card, p.x, p.y);
          }
          flying = flying.filter(function (p) { return p.x > -cw - 4 && p.x < W + 4; });
          if ((next >= order.length && !flying.length) || now - t0 > 9000) { end(); return; }
          raf = requestAnimationFrame(frame);
        }
        function end() {
          if (stopped) return;
          stopped = true;
          cancelAnimationFrame(raf);
          cv.removeEventListener('pointerdown', end);
          cv.style.opacity = '0';
          later(650, function () { cv.remove(); });
          cardEls.forEach(function (el) { el.style.visibility = ''; });
          finaleStop = null;
        }
        cv.addEventListener('pointerdown', end);
        finaleStop = function () { end(); cv.remove(); };
        raf = requestAnimationFrame(frame);
      }
      function stopFinale() { if (finaleStop) finaleStop(); finaleStop = null; }

      /* ---- settings ---- */
      /* A new setting deals a fresh game straight away if you have not started; otherwise it waits for New game. */
      function setDraw(n) {
        if (wantDraw === n) return;
        wantDraw = n; api.store.set('draw', n);
        api.sound('click');
        if (moves === 0 && !won) newGame();
        else { updateStats(); api.status('Draw ' + n + ' starts with your next new game.'); }
        board.focus({ preventScroll: true });
      }
      function setPasses(n) {
        if (wantPasses === n) return;
        wantPasses = n; api.store.set('passes', n);
        api.sound('click');
        if (moves === 0 && !won) newGame();
        else { updateStats(); api.status((n ? 'Once through the stock' : 'Going round the stock again') + ' starts with your next new game.'); }
      }

      /* ---- pointer: a tap sends a card to its best place; a drag drops it where you let go ---- */
      function onPointerDown(ev) {
        if (ev.button != null && ev.button > 0) return;
        board.classList.remove('is-kb');
        if (finaleStop) { stopFinale(); return; }
        if (drag || busy()) return;
        var cardEl = ev.target.closest('.kl-card');
        var slot = ev.target.closest('.kl-slot');
        if (!cardEl && slot && slot.getAttribute('data-pile') === 's') { ev.preventDefault(); drawStock('tap'); return; }
        if (!cardEl) return;
        var card = +cardEl.getAttribute('data-card'), pile = whereIs(card), src = pileOf(s, pile), index = src.indexOf(card);
        if (pile === 's') { ev.preventDefault(); drawStock('tap'); return; }
        if (!s.up[card]) { tap(pile, index); return; }
        if (pile.charAt(0) !== 't') index = src.length - 1;
        var set = {}, list = src.slice(index);
        list.forEach(function (c) { set[c] = true; });
        drag = { id: ev.pointerId, pile: pile, index: index, list: list, set: set, x0: ev.clientX, y0: ev.clientY, moved: false, start: lastPos };
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerCancel);
      }
      function onPointerMove(ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        var dx = ev.clientX - drag.x0, dy = ev.clientY - drag.y0;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 7) return;
        if (!drag.moved) {
          drag.moved = true; clearHint(); held = null;
          drag.list.forEach(function (c, i) { cardEls[c].classList.add('is-drag'); cardEls[c].style.zIndex = String(900 + i); });
        }
        ev.preventDefault();
        drag.list.forEach(function (c) {
          var p = drag.start[c];
          cardEls[c].style.transform = 'translate(' + (p.x + dx) + 'px,' + (p.y + dy) + 'px)';
        });
      }
      function endDrag() {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerCancel);
        if (drag) drag.list.forEach(function (c) { cardEls[c].classList.remove('is-drag'); });
      }
      function onPointerCancel(ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        endDrag(); drag = null; render(false);
      }
      function onPointerUp(ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        var d = drag;
        endDrag();
        drag = null;
        if (!d.moved) { tap(d.pile, d.index); return; }
        var p = d.start[d.list[0]];
        var target = dropTarget(p.x + ev.clientX - d.x0, p.y + ev.clientY - d.y0, d.pile, d.index);
        if (target && target.ok) doMove({ from: d.pile, index: d.index, to: target.pile });
        else {
          render(false);
          if (target) nope(d.list, whyNot(d.pile, d.index, target.pile));
        }
      }
      /* Which pile did the cards land on? Every pile the dragged card overlaps is a candidate, the biggest overlap
         first; the first one where the move is legal wins, so a slightly sloppy drop still works. */
      function dropTarget(x, y, from, index) {
        var hits = [];
        PILES.forEach(function (key) {
          if (key === from || key === 's' || key === 'w') return;
          var xy = pileXY(key), top = xy.y, height = L.ch;
          if (key.charAt(0) === 't') {
            var t = s.t[+key.charAt(1)];
            if (t.length && lastPos[topOf(t)]) top = lastPos[topOf(t)].y;
            height = Math.max(L.ch, (lastPos.bottom || 0) - top + L.ch);
          }
          var ox = Math.min(x + L.cw, xy.x + L.cw) - Math.max(x, xy.x);
          var oy = Math.min(y + L.ch, top + height) - Math.max(y, top);
          if (ox > 0 && oy > 0) hits.push({ pile: key, area: ox * oy });
        });
        hits.sort(function (a, b) { return b.area - a.area; });
        for (var i = 0; i < hits.length; i++) if (canMove(s, from, index, hits[i].pile)) return { pile: hits[i].pile, ok: true };
        return hits.length ? { pile: hits[0].pile, ok: false } : null;
      }

      /* ---- keyboard: a cursor that moves between piles ---- */
      function clampCursor() {
        if (!s) return;
        if (cursor.pile.charAt(0) === 't') {
          var t = pileOf(s, cursor.pile), first = firstUp(t, s);
          if (!t.length) cursor.depth = 0;
          else cursor.depth = Math.max(first < 0 ? t.length - 1 : first, Math.min(t.length - 1, cursor.depth));
        }
      }
      function cursorFollow(pile) { cursor = { pile: pile, depth: pileOf(s, pile).length - 1 }; clampCursor(); }
      function placeCursor() {
        if (!L || !s || !lastPos) return;
        clampCursor();
        var key = cursor.pile, xy = pileXY(key), x = xy.x, y = xy.y, hgt = L.ch;
        var list = pileOf(s, key);
        if (key.charAt(0) === 't' && list.length) {
          var a = lastPos[list[cursor.depth]], b = lastPos[topOf(list)];
          if (a && b) { y = a.y; hgt = b.y - a.y + L.ch; x = a.x; }
        } else if (key === 'w' && list.length && lastPos[topOf(list)]) x = lastPos[topOf(list)].x;
        cursorEl.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        cursorEl.style.width = L.cw + 'px';
        cursorEl.style.height = hgt + 'px';
        board.setAttribute('data-cursor', key + ':' + cursor.depth);
      }
      function describe(key) {
        var list = pileOf(s, key);
        if (key === 's') return list.length ? 'Stock, ' + list.length + ' cards. Press Enter or Space to turn.' : (canRecycle(s, passLimit) ? 'Stock is empty. Press Enter to turn the waste over.' : 'Stock is used up.');
        if (key === 'w') return list.length ? 'Waste, ' + cardName(topOf(list)) + '.' : 'Waste, empty.';
        if (key.charAt(0) === 'f') return 'Foundation ' + (+key.charAt(1) + 1) + (list.length ? ', ' + cardName(topOf(list)) + '.' : ', empty. Aces go here.');
        if (!list.length) return 'Column ' + (+key.charAt(1) + 1) + ', empty. Only a king can go here.';
        var downs = list.filter(function (c) { return !s.up[c]; }).length, sel = list.slice(cursor.depth);
        return 'Column ' + (+key.charAt(1) + 1) + ', ' + cardName(sel[0]) + (sel.length > 1 ? ' with ' + (sel.length - 1) + ' more on it' : '') + (downs ? '. ' + downs + ' face down.' : '.');
      }
      function moveCursor(dir) {
        var key = cursor.pile;
        if (key.charAt(0) === 't') {
          var col = +key.charAt(1), t = s.t[col], first = firstUp(t, s);
          if (dir === 'left' && col > 0) cursorFollow('t' + (col - 1));
          else if (dir === 'right' && col < 6) cursorFollow('t' + (col + 1));
          else if (dir === 'up') { if (t.length && first >= 0 && cursor.depth > first) cursor.depth--; else cursor = { pile: UNDER_TOP[col], depth: 0 }; }
          else if (dir === 'down') { if (cursor.depth < t.length - 1) cursor.depth++; }
        } else {
          var i = TOP_ROW.indexOf(key);
          if (dir === 'left' && i > 0) cursor = { pile: TOP_ROW[i - 1], depth: 0 };
          else if (dir === 'right' && i < TOP_ROW.length - 1) cursor = { pile: TOP_ROW[i + 1], depth: 0 };
          else if (dir === 'down') cursorFollow('t' + TOP_COL[key]);
        }
        placeCursor();
        api.sound('tick');
        api.announce(describe(cursor.pile) + (held ? ' Press Enter to put the cards here.' : ''));
      }
      function enterKey() {
        if (busy()) return;
        clearHint();
        var key = cursor.pile, list = pileOf(s, key);
        if (!held) {
          if (key === 's') { drawStock('key'); return; }
          if (!list.length) { api.sound('tick'); api.status('There is nothing here to pick up.'); return; }
          var index = key.charAt(0) === 't' ? cursor.depth : list.length - 1;
          if (!s.up[list[index]]) { api.sound('tick'); return; }
          held = { from: key, index: index };
          api.sound('click');
          var n = list.length - index;
          api.status('You picked up the ' + cardName(list[index]) + (n > 1 ? ' and ' + (n - 1) + ' more' : '') + '. Choose a pile and press Enter.');
          render(false);
          return;
        }
        if (key === held.from) {
          /* Enter twice on the same pile sends the cards to their best place, like a tap */
          var m = bestMoveFor(s, held.from, held.index);
          held = null;
          if (m) doMove(m); else { render(false); api.status('Put back. That card has nowhere to go yet.'); }
          return;
        }
        if (canMove(s, held.from, held.index, key)) { var hm = { from: held.from, index: held.index, to: key }; held = null; doMove(hm); }
        else nope(pileOf(s, held.from).slice(held.index), whyNot(held.from, held.index, key));
      }
      function onKey(ev) {
        if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
        var k = ev.key;
        if (finaleStop) { stopFinale(); if (k !== 'Tab') ev.preventDefault(); return; }
        var handled = true;
        if (k === 'ArrowLeft') moveCursor('left');
        else if (k === 'ArrowRight') moveCursor('right');
        else if (k === 'ArrowUp') moveCursor('up');
        else if (k === 'ArrowDown') moveCursor('down');
        else if (k === 'Enter') enterKey();
        else if (k === ' ' || k === 'Spacebar') drawStock('key');
        else if (k === 'Escape') { if (held) { held = null; render(false); api.status('Put back.'); } else handled = false; }
        else if (k === 'u' || k === 'U') undo();
        else if (k === 'h' || k === 'H') hint();
        else handled = false;
        if (handled) { ev.preventDefault(); board.classList.add('is-kb'); placeCursor(); }
      }
      function onFocus() { placeCursor(); }

      board.addEventListener('pointerdown', onPointerDown);
      board.addEventListener('keydown', onKey);
      board.addEventListener('focus', onFocus);
      var ro = null, lastW = 0;
      function onResize() {
        if (!s || !board.clientWidth || (board.clientWidth === lastW && L)) return;
        lastW = board.clientWidth;
        measure(); render(true);
      }
      function onWinResize() { if (!s) return; measure(); render(true); }
      if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe(board); }
      window.addEventListener('resize', onWinResize);
      clock = setInterval(function () { if (startedAt && !won && !document.hidden) timeEl.textContent = fmtTime(elapsed()); }, 500);

      newGame();

      return {
        destroy: function () {
          clearTimers();
          clearHint();
          stopFinale();
          if (clock) clearInterval(clock);
          clock = null;
          if (ro) ro.disconnect();
          window.removeEventListener('resize', onWinResize);
          endDrag();
          drag = null;
          board.removeEventListener('pointerdown', onPointerDown);
          board.removeEventListener('keydown', onKey);
          board.removeEventListener('focus', onFocus);
        }
      };
    }
  });
})();
