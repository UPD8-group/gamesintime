/* The Mansion of Happiness for Games in Time.
   W. and S. B. Ives of Salem, Massachusetts, published this race game on 25 November 1843, a near copy of
   George Fox's English game of 1800. The squares, their numbers and every rule below come from the 1843
   Ives "Rules of the Game" (transcribed by Anne Morris from the Library of Congress copy) and were checked
   square by square against the Library of Congress scan of the board (LC-USZC4-5133).

   How the file is organised:
     Part 1  The squares: number, name, a short kid-friendly meaning, and what the square does.
     Part 2  The rules engine. play() works out everything one spin of the teetotum does, as a list of
             steps (hop, jump, pay, say). It never touches the screen, so the rules can be read on their own.
     Part 3  The pictures: little engraved emblems for the squares, the spiral board, the teetotum.
     Part 4  The screen: the board, the teetotum, the square card, the players and the turn loop.

   The computer players have no choices to make: the teetotum decides everything, as it did in 1843.
   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  var ID = 'mansion-of-happiness';
  var LAST = 67;            /* the Mansion of Happiness */
  var SIDES = 8;            /* the 1843 teetotum was an octagonal "pin and plate" top; it is numbered 1 to 8 here */
  var STEP_MS = 150;        /* one hop along the track */
  var JUMP_MS = 520;        /* a swoop to another square */
  var SAY_MS = 950;         /* time to read what happened before the next step */
  var COMPUTER_MS = 350;    /* the computer's pause before it spins (the contract says about 350 ms) */
  var SPIN_MS = 1300;       /* the teetotum spins this long, then topples */
  var LOG_LENGTH = 7;
  var COUNTERS = 10;        /* "Each individual should be furnished with ten counters" (1843 rules) */
  var uid = 0;

  /* =====================================================================
     PART 1: THE SQUARES
     Unlisted numbers are plain squares (coloured but unnamed on the 1843 board).
     kind:  virtue   "Whoever possesses ... is entitled to advance six" (rule 3)
            return   "must return to his former situation" (rule 4)
            place    a punishment place, Poverty or Ruin: "blanks in your progress" unless you are sent there (rule 5)
            offence  found guilty: sent to a place, fined, sometimes locked up (rules 6 and 9 to 14)
            sent     sent to another square without a fine (rules 7 and 8)
            water, inn, seat, plain, mansion as named
     ===================================================================== */
  var SQUARES = {
    1: { name: 'Justice', kind: 'plain', icon: 'justice', gloss: 'Being fair to everyone.' },
    2: { name: 'Piety', kind: 'virtue', icon: 'piety', gloss: 'Being devoted to God and to religion.' },
    4: { name: 'Honesty', kind: 'virtue', icon: 'honesty', gloss: 'Telling the truth and never cheating.' },
    6: { name: 'The Water', kind: 'water', icon: 'water', gloss: 'A river crossing. You pay a ferryman to row you over.' },
    7: { name: 'Audacity', kind: 'return', icon: 'audacity', gloss: 'Rude, cheeky boldness.' },
    9: { name: 'The Inn', kind: 'inn', icon: 'inn', gloss: 'A place where travellers could eat, drink and sleep.' },
    11: { name: 'Poverty', kind: 'place', icon: 'poverty', gloss: 'Being very poor.' },
    13: { name: 'Temperance', kind: 'virtue', icon: 'temperance', gloss: 'Self-control, especially not drinking too much alcohol.' },
    14: { name: 'Passion', kind: 'offence', icon: 'passion', gloss: 'Losing your temper.', to: 6, fine: 1 },
    15: { name: 'Gratitude', kind: 'virtue', icon: 'gratitude', gloss: 'Being thankful.' },
    17: { name: 'Idleness', kind: 'sent', icon: 'idleness', gloss: 'Being lazy and wasting time.', to: 11 },
    18: { name: 'Prudence', kind: 'virtue', icon: 'prudence', gloss: 'Being careful and sensible.' },
    20: { name: 'Cruelty', kind: 'return', icon: 'cruelty', gloss: 'Being unkind, or hurting people or animals.' },
    22: { name: 'The Whipping Post', kind: 'place', icon: 'whipping', gloss: 'A post where people were tied and whipped as a public punishment.' },
    23: { name: 'Truth', kind: 'virtue', icon: 'truth', gloss: 'Saying what really happened.' },
    25: { name: 'Immodesty', kind: 'return', icon: 'immodesty', gloss: 'Showing off, or behaving in a way people then thought improper.' },
    26: { name: 'The Road to Folly', kind: 'sent', icon: 'folly', gloss: 'The path of foolish choices.', to: 18 },
    28: { name: 'Sabbath Breaker', kind: 'offence', icon: 'sabbath', gloss: 'Someone who worked or played on the Sabbath, the weekly day of rest and worship (Sunday, for these Christian families).', to: 22, fine: 1 },
    30: { name: 'The House of Correction', kind: 'place', icon: 'correction', gloss: 'A kind of prison where people found guilty of smaller crimes were made to work.' },
    31: { name: 'Chastity', kind: 'virtue', icon: 'chastity', gloss: 'Being pure and modest in how you behave.' },
    33: { name: 'Sincerity', kind: 'virtue', icon: 'sincerity', gloss: 'Meaning what you say.' },
    34: { name: 'A Cheat', kind: 'offence', icon: 'cheat', gloss: 'Someone who tricks people or breaks the rules to get ahead.', to: 30, fine: 1, months: 1, crime: 'cheat' },
    36: { name: 'The Pillory', kind: 'place', icon: 'pillory', gloss: 'A wooden frame on a post that locked a person\'s head and hands, so the public could see them punished.' },
    38: { name: 'Humility', kind: 'virtue', icon: 'humility', gloss: 'Not boasting, or thinking you are better than others.' },
    40: { name: 'The Stocks', kind: 'place', icon: 'stocks', gloss: 'A wooden frame that held a person\'s feet as a public punishment.' },
    42: { name: 'Industry', kind: 'virtue', icon: 'industry', gloss: 'Working hard.' },
    43: { name: 'A Perjurer', kind: 'offence', icon: 'perjurer', gloss: 'Someone who lies in court after promising to tell the truth.', to: 36, fine: 1 },
    45: { name: 'Charity', kind: 'virtue', icon: 'charity', gloss: 'Giving to people in need.' },
    47: { name: 'A Drunkard', kind: 'offence', icon: 'drunkard', gloss: 'Someone who is drunk again and again.', to: 40, fine: 1 },
    50: { name: 'Prison', kind: 'place', icon: 'prison', gloss: 'A jail for people found guilty of crimes.' },
    52: { name: 'Humanity', kind: 'virtue', icon: 'humanity', gloss: 'Kindness to people and animals.' },
    54: { name: 'Generosity', kind: 'virtue', icon: 'generosity', gloss: 'Sharing freely with others.' },
    55: { name: 'Ruin', kind: 'place', icon: 'ruin', gloss: 'Losing all your money and your good name.' },
    57: { name: 'A Robber', kind: 'offence', icon: 'robber', gloss: 'Someone who steals.', to: 50, fine: 2, months: 2, crime: 'robber' },
    60: { name: 'The Seat of Expectation', kind: 'seat', icon: 'seat', gloss: 'A seat for waiting in hope, close to the Mansion.' },
    61: { name: 'Ingratitude', kind: 'return', icon: 'ingratitude', gloss: 'Not being thankful.' },
    63: { name: 'The Summit of Dissipation', kind: 'offence', icon: 'summit', gloss: 'The very top of wild, wasteful living.', to: 55, fine: 3 },
    67: { name: 'The Mansion of Happiness', kind: 'mansion', icon: 'mansion', gloss: 'The goal: a happy home that stood for a good and happy life.' }
  };

  /* What each kind of square does, in the words shown in "All the squares". */
  function ruleText(n) {
    var q = SQUARES[n];
    if (!q) return '';
    switch (q.kind) {
      case 'virtue': return 'Advance six squares, to ' + (n + 6) + '.';
      case 'return': return 'Go back to where you were, and "not even think of Happiness, much less partake of it".';
      case 'water': return 'Pay 1 counter to be ferried over, and go on to 10.';
      case 'inn': return 'Pay 1 counter for refreshment, and go on to 12.';
      case 'place': return 'Only the guilty are punished here. Landing here by spinning does nothing.';
      case 'sent': return 'Go to ' + lowerThe(SQUARES[q.to].name) + ' (' + q.to + ').';
      case 'seat': return 'Spin past 67 and you come back here. Spin past again and you begin the game again.';
      case 'mansion': return 'Land here exactly to win.';
      case 'offence':
        return 'Go to ' + lowerThe(SQUARES[q.to].name) + ' (' + q.to + ') and pay a fine of ' + q.fine +
          (q.months ? '. Miss ' + (q.months === 1 ? 'a turn' : q.months + ' turns') + ', then begin the game again.' : '.');
      default: return 'The first square. Nothing happens here.';
    }
  }
  function lowerThe(name) { return name.indexOf('The ') === 0 ? 'the ' + name.slice(4) : name; }

  /* =====================================================================
     PART 2: THE RULES ENGINE
     state = { players: [{ name, you, pos, counters, months, crime, overthrown }], pool }
     pos 0 means "not on the board yet" (the start). play() changes state and returns the steps to show.
     ===================================================================== */

  /* Words for messages: "You spin" but "Aunt Agatha spins". */
  function who(p, cap) { return p.you ? (cap ? 'You' : 'you') : p.name; }
  function v(p, base, third) { return p.you ? base : third; }
  function whose(p) { return p.you ? 'your' : p.name + '\'s'; }
  function where(n) { return n === 0 ? 'the start' : String(n); }

  function occupantOf(players, sq, except) {
    if (sq <= 0) return null;   /* any number of counters may wait at the start */
    for (var j = 0; j < players.length; j++) if (j !== except && players[j].pos === sq) return players[j];
    return null;
  }

  /* Fines go into the fines box. The rules do not say what happens when your counters run out, so you
     simply pay what you have. */
  function pay(state, p, n, steps) {
    var paid = Math.min(n, p.counters);
    p.counters -= paid;
    state.pool += paid;
    steps.push({ pay: { who: state.players.indexOf(p), n: paid }, sound: 'coin', quick: true });
    if (paid < n) steps.push({ say: who(p, true) + ' cannot pay any more: ' + (p.you ? 'your' : 'their') + ' counters are all gone.' });
    return paid;
  }

  /* One spin. "bounced" is the earlier spin when this is the second spin after a locked-up square (rule 16). */
  function play(state, i, spin, bounced) {
    var P = state.players, p = P[i], steps = [], from = p.pos;
    var out = { steps: steps, respin: false, bounce: null, win: false };
    function step(o) { steps.push(o); return o; }

    if (bounced != null && spin === bounced) {
      step({ say: 'The same number again, so ' + who(p) + ' must stay on ' + where(from) + '.', sound: 'wrong' });
      return out;
    }

    var target = from + spin;
    if (target > LAST) {
      /* Rule 17: "if he throws over he may go back to the SEAT OF EXPECTATION, AT 60, and spin again in
         turn, but if he again throws over he must begin the game." */
      if (!p.overthrown) {
        p.overthrown = true;
        step({ card: 60, say: who(p, true) + ' needed ' + (LAST - from) + ' to land on the Mansion, so ' + v(p, 'go', 'goes') + ' back to the Seat of Expectation (60).', sound: 'wrong' });
        step({ move: { who: i, to: 60, style: 'jump' } });
        arrive(60, { from: from, guilty: false });
      } else {
        p.overthrown = false;
        step({ say: 'Past the Mansion again! ' + who(p, true) + ' must begin the game again.', sound: 'lose' });
        step({ move: { who: i, to: 0, style: 'jump' } });
        p.pos = 0;
      }
      return out;
    }

    step({ move: { who: i, to: target, style: 'hop' } });
    p.pos = target;
    if (target === LAST) {
      out.win = true;
      step({ card: LAST, say: who(p, true) + ' ' + v(p, 'reach', 'reaches') + ' the Mansion of Happiness!', sound: 'bell' });
      return out;
    }

    var q = SQUARES[target];
    var kind = q ? q.kind : 'plain';
    if (kind === 'virtue') {
      step({ card: target, say: who(p, true) + ' ' + v(p, 'possess', 'possesses') + ' ' + q.name + ', so ' + v(p, 'advance', 'advances') + ' six squares to ' + (target + 6) + '.', sound: 'bell' });
      step({ move: { who: i, to: target + 6, style: 'hop' } });
      arrive(target + 6, { from: from, guilty: false });
    } else if (kind === 'water') {
      step({ card: target, say: who(p, true) + ' ' + v(p, 'come', 'comes') + ' to the Water, ' + v(p, 'pay', 'pays') + ' 1 counter to be ferried over, and ' + v(p, 'go', 'goes') + ' on to 10.', sound: 'whoosh' });
      pay(state, p, 1, steps);
      step({ move: { who: i, to: 10, style: 'jump' } });
      arrive(10, { from: from, guilty: false });
    } else if (kind === 'inn') {
      step({ card: target, say: who(p, true) + ' ' + v(p, 'stop', 'stops') + ' at the Inn, ' + v(p, 'pay', 'pays') + ' 1 counter for refreshment, and ' + v(p, 'go', 'goes') + ' on to 12.', sound: 'clack' });
      pay(state, p, 1, steps);
      step({ move: { who: i, to: 12, style: 'jump' } });
      arrive(12, { from: from, guilty: false });
    } else if (kind === 'return') {
      step({ card: target, say: who(p, true) + ' ' + v(p, 'show', 'shows') + ' ' + q.name + ', so ' + v(p, 'go', 'goes') + ' back to ' + where(from) + ' and must "not even think of Happiness, much less partake of it".', sound: 'wrong' });
      step({ move: { who: i, to: from, style: 'jump' } });
      p.pos = from;
    } else if (kind === 'sent') {
      var sentText = target === 17
        ? 'Idleness! ' + who(p, true) + ' ' + v(p, 'come', 'comes') + ' to Poverty (11).'
        : who(p, true) + ' ' + v(p, 'take', 'takes') + ' the Road to Folly, and must go back to Prudence (18).';
      step({ card: target, say: sentText, sound: 'wrong' });
      step({ move: { who: i, to: q.to, style: 'jump' } });
      arrive(q.to, { from: from, guilty: false });
    } else if (kind === 'offence') {
      step({ card: target, say: offenceText(p, target), sound: 'wrong' });
      pay(state, p, q.fine, steps);
      step({ move: { who: i, to: q.to, style: 'jump' }, sound: 'thud' });
      if (arrive(q.to, { from: from, guilty: true, crime: q.crime || null }) && q.months) {
        p.months = q.months;
        p.crime = q.crime;
      }
    } else {
      /* a plain square, Justice, the Seat of Expectation, or a punishment place reached by spinning */
      var o = occupantOf(P, target, i);
      var lockedHere = o && o.months > 0 && (target === 30 || target === 50);
      if (!lockedHere) {
        var text;
        if (kind === 'place') text = who(p, true) + ' ' + v(p, 'stop', 'stops') + ' at ' + lowerThe(q.name) + '. Only the guilty are punished here, so nothing happens.';
        else if (q) text = who(p, true) + ' ' + v(p, 'land', 'lands') + ' on ' + lowerThe(q.name) + '.';
        else text = who(p, true) + ' ' + v(p, 'move', 'moves') + ' to ' + target + '.';
        step({ card: target, say: text });
      }
      arrive(target, { from: from, guilty: false });
    }
    return out;

    /* Rule 16: two counters may not share a square. Returns false when the mover had to go back. */
    function arrive(dest, ctx) {
      var o = occupantOf(P, dest, i);
      if (!o) { p.pos = dest; return true; }
      var oi = P.indexOf(o);
      if ((dest === 30 || dest === 50) && o.months > 0) {
        if (ctx.crime && ctx.crime === o.crime) {
          /* Rule 15: someone guilty of the same crime relieves the prisoner, who is free and begins again. */
          step({ say: who(p, true) + ' ' + v(p, 'take', 'takes') + ' ' + whose(o) + ' place, so ' + who(o) + ' ' + v(o, 'are', 'is') + ' set free and must begin the game again.', sound: 'whoosh' });
          step({ move: { who: oi, to: 0, style: 'jump' } });
          o.months = 0; o.crime = null; o.overthrown = false; o.pos = 0;
          p.pos = dest;
          return true;
        }
        /* Rule 16, secondly: a newcomer cannot relieve the prisoner, so goes back and spins again. */
        step({ card: dest, say: who(o, true) + ' ' + v(o, 'are', 'is') + ' locked in ' + lowerThe(SQUARES[dest].name) + ', so ' + who(p) + ' cannot stop there. Back to ' + where(ctx.from) + ' to spin again.', sound: 'thud' });
        step({ move: { who: i, to: ctx.from, style: 'jump' } });
        p.pos = ctx.from;
        out.respin = true;
        out.bounce = spin;
        return false;
      }
      if (ctx.guilty) {
        /* Rule 16, firstly: a guilty newcomer pays only the fine; the other goes to the newcomer's old place. */
        step({ say: who(o, true) + ' ' + v(o, 'were', 'was') + ' already on ' + dest + ', so ' + who(o) + ' ' + v(o, 'move', 'moves') + ' to ' + where(ctx.from) + '.' });
      } else {
        step({ say: who(p, true) + ' ' + v(p, 'take', 'takes') + ' ' + whose(o) + ' place on ' + dest + ' and ' + v(p, 'pay', 'pays') + ' 1 counter. ' + who(o, true) + ' ' + v(o, 'go', 'goes') + ' to ' + where(ctx.from) + '.', sound: 'clack' });
        pay(state, p, 1, steps);
      }
      step({ move: { who: oi, to: ctx.from, style: 'jump' } });
      o.pos = ctx.from;
      p.pos = dest;
      return true;
    }
  }

  function offenceText(p, n) {
    var W = who(p, true), are = v(p, 'are', 'is');
    switch (n) {
      case 14: return 'In a Passion! ' + W + ' ' + are + ' taken to the Water (6) for a ducking to cool off, and fined 1 counter.';
      case 28: return 'Sabbath Breaker! ' + W + ' ' + are + ' sent to the Whipping Post (22) and fined 1 counter.';
      case 34: return 'A Cheat! ' + W + ' ' + are + ' sent to the House of Correction (30) for one month, which means missing a turn, fined 1, and must then begin again.';
      case 43: return 'A Perjurer! ' + W + ' ' + are + ' put in the Pillory (36) and fined 1 counter.';
      case 47: return 'A Drunkard! ' + W + ' ' + are + ' put in the Stocks (40) and fined 1 counter.';
      case 57: return 'A Robber! ' + W + ' ' + are + ' sent to Prison (50) for two months, which means missing two turns, fined 2, and must then begin again.';
      case 63: return 'The Summit of Dissipation! ' + W + ' ' + v(p, 'fall', 'falls') + ' to Ruin (55) and ' + v(p, 'pay', 'pays') + ' a fine of 3.';
      default: return '';
    }
  }

  /* A locked-up player's turn: one month passes; when the time is up they are free and begin again. */
  function waitTurn(state, i) {
    var p = state.players[i], steps = [];
    p.months -= 1;
    var place = p.crime === 'robber' ? 'Prison' : 'the House of Correction';
    if (p.months > 0) {
      steps.push({ say: who(p, true) + ' ' + v(p, 'are', 'is') + ' locked in ' + place + ': ' + p.months + ' more turn to wait.', sound: 'thud' });
    } else {
      steps.push({ say: who(p, true) + ' ' + v(p, 'are', 'is') + ' set free from ' + place + ', and must begin the game again.', sound: 'whoosh' });
      steps.push({ move: { who: i, to: 0, style: 'jump' } });
      p.pos = 0; p.crime = null; p.overthrown = false;
    }
    return { steps: steps, respin: false, win: false };
  }

  /* =====================================================================
     PART 3: THE PICTURES
     ===================================================================== */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) el.setAttribute(k, String(attrs[k])); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }
  /* Static, hand-written emblem markup only (never anything a visitor typed). */
  function markup(g, str) { g.innerHTML = str; return g; }

  /* Emblems sit in a 60 by 60 box centred on 0,0. "o" is an ink outline; the colour classes are the
     watercolour washes a colourist added by hand to the printed engraving. */
  var EMBLEMS = {
    justice: '<path class="o gold" d="M-2.5-22h5v34h-5z"/><path class="l" d="M-21-15H21M-21-15l-7 16M-21-15l7 16M21-15l-7 16M21-15l7 16"/><path class="o gold" d="M-30 1a9 5 0 0 0 18 0zM12 1a9 5 0 0 0 18 0z"/><path class="o wood" d="M-12 12h24l4 8h-32z"/><circle class="o gold" cy="-19" r="4.5"/>',
    piety: '<path class="o paper2" d="M-17 0h34v24h-34z"/><path class="o blue" d="M-21 2L0-12L21 2z"/><path class="o paper2" d="M-6-4v-14h12v14z"/><path class="o blue" d="M-8-18L0-29L8-18z"/><path class="l" d="M0-29v-4M-2.5-31h5"/><path class="o wood" d="M-4 24v-9a4 4 0 0 1 8 0v9z"/>',
    honesty: '<path class="o paper2" d="M-12 26v-17l-8-12a4 4 0 0 1 7-4l5 7v-24a4 4 0 0 1 8 0v18-22a4 4 0 0 1 8 0v22-18a4 4 0 0 1 8 0v20-13a4 4 0 0 1 8 0v20c0 12-6 21-12 23z"/>',
    water: '<path class="o blue" d="M-30 6q7.5-6 15 0t15 0 15 0 15 0v20h-60z"/><path class="o wood" d="M-20 4h40l-7 9h-26z"/><path class="l" d="M2 4v-24"/><path class="o paper2" d="M4-20v20h14z"/><path class="l" d="M-30 18q7.5-5 15 0t15 0 15 0 15 0"/>',
    audacity: '<path class="o red" d="M-24-22h48a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6h-26l-12 12v-12h-10a6 6 0 0 1-6-6v-20a6 6 0 0 1 6-6z"/><path class="ink" d="M-3-17h6l-1 15h-4zM0 2a3 3 0 1 1 0 .1z"/>',
    inn: '<path class="o paper2" d="M-22-2h30v26h-30z"/><path class="o red" d="M-26 0L-7-16L12 0z"/><path class="o wood" d="M-12 24v-11h8v11z"/><path class="o gold" d="M-19 2h6v6h-6z"/><path class="l" d="M8-6h18M24-6v6"/><path class="o gold" d="M15 0h18v12h-18z"/>',
    poverty: '<path class="o wood" d="M-24 0h48a24 18 0 0 1-48 0z"/><path class="l" d="M-24 0h48M-8 6l4 6-3 5"/>',
    temperance: '<path class="o blue" d="M-12-22h20l-3 6c10 4 14 14 12 26-1 9-6 15-16 15s-15-6-16-15c-2-12 2-22 12-26z"/><path class="l" d="M8-18c8-2 12 4 10 11-1 4-4 7-8 8"/><path class="paper o" d="M-11 2a10 6 0 0 0 20 0z"/>',
    passion: '<path class="o red" d="M0 26c-16 0-22-10-20-22 2-10 10-14 10-26 8 6 10 12 9 18 4-4 5-9 4-14 12 9 17 22 13 32-3 8-8 12-16 12z"/><path class="o gold" d="M0 26c-8 0-11-5-10-11 1-6 6-8 7-14 6 5 9 10 9 16 0 5-2 9-6 9z"/>',
    gratitude: '<path class="l" d="M0 26v-26M0 10l-12-8M0 14l12-10"/><path class="o leaf" d="M-14 2q-8-4-6-12 8 2 6 12zM14 0q8-4 6-12-8 2-6 12z"/><circle class="o rose" cx="0" cy="-10" r="10"/><circle class="o rose" cx="-12" cy="-16" r="7"/><circle class="o rose" cx="12" cy="-16" r="7"/><circle class="o gold" cx="0" cy="-10" r="3.5"/>',
    idleness: '<path class="o paper2" d="M-26 6q0-14 26-14t26 14v10q-26 8-52 0z"/><path class="l" d="M-20 4q20 6 40 0"/><path class="ink" d="M6-26h12v3l-8 9h8v3h-13v-3l8-9h-7zM-8-20h8v2l-5 6h5v2h-9v-2l5-6h-4z"/>',
    prudence: '<path class="o wood" d="M-16 8c-6-10-6-24 2-30 4 3 6 4 14 4s10-1 14-4c8 6 8 20 2 30-4 7-10 12-16 12s-12-5-16-12z"/><circle class="o paper2" cx="-8" cy="-6" r="8"/><circle class="o paper2" cx="8" cy="-6" r="8"/><circle class="ink" cx="-8" cy="-6" r="3.5"/><circle class="ink" cx="8" cy="-6" r="3.5"/><path class="o gold" d="M-3 2h6l-3 6z"/><path class="l" d="M-10 26v-6M10 26v-6M-14 26h28"/>',
    cruelty: '<path class="l thick" d="M-26 20Q0 4 26-22"/><path class="o green" d="M-16 14l-6-10 10 4zM-4 7l-2-12 8 9zM8-2l-2-12 8 8zM16-10l8-6-2 10zM2 6l10 2-8 6zM-10 18l8 4-10 2z"/>',
    whipping: '<path class="o wood" d="M-4-28h8v54h-8z"/><path class="o wood" d="M-18-20h36v6h-36z"/><circle class="l" cx="0" cy="-2" r="5"/><path class="o wood" d="M-16 24h32v4h-32z"/>',
    truth: '<circle class="o gold" r="11"/><path class="l" d="M0-16v-10M0 16v10M-16 0h-10M16 0h10M-11-11l-7-7M11 11l7 7M-11 11l-7 7M11-11l7-7"/><circle class="ink" cx="-4" cy="-2" r="1.6"/><circle class="ink" cx="4" cy="-2" r="1.6"/><path class="l" d="M-4 4q4 3 8 0"/>',
    immodesty: '<circle class="o gold" cx="0" cy="-8" r="16"/><circle class="o blue" cx="0" cy="-8" r="11"/><path class="l paper-stroke" d="M-5-13q4-4 9-1"/><path class="o gold" d="M-3 8h6l1 20h-8z"/>',
    folly: '<path class="o red" d="M-20 14c0-14 4-26 20-28-6 6-8 14-6 24z"/><path class="o gold" d="M20 14c0-14-4-26-20-28 6 6 8 14 6 24z"/><path class="o blue" d="M-6 10c-2-10 0-18 6-24 6 6 8 14 6 24z"/><path class="o paper2" d="M-22 12h44v8h-44z"/><circle class="o gold" cx="-20" cy="15" r="4"/><circle class="o gold" cx="20" cy="15" r="4"/><circle class="o gold" cx="0" cy="-15" r="4"/>',
    sabbath: '<path class="o blue" d="M2-28l18 18-18 18-18-18z"/><path class="l" d="M2-28v36M-16-10h36"/><path class="l" d="M2 8q-6 8 0 12t-2 10"/><path class="o red" d="M-3 14l-5 3 5 2zM3 22l5 2-4 3z"/>',
    correction: '<path class="o paper2" d="M-26-10h52v36h-52z"/><path class="o wood" d="M-28-10L0-26L28-10z"/><path class="o ink" d="M-8 26v-16a8 8 0 0 1 16 0v16z"/><path class="l" d="M-20-2v12M-15-2v12M15-2v12M20-2v12M-22-2h10M-22 10h10M12-2h10M12 10h10"/>',
    chastity: '<path class="l" d="M0 28v-26"/><path class="o leaf" d="M0 18q-14-2-16-14 12 2 16 14z"/><path class="o paper" d="M0 0c-4-12-14-14-18-22 8 0 14 4 18 12 4-8 10-12 18-12-4 8-14 10-18 22z"/><path class="o paper" d="M0 2c-3-10-3-20 0-30 3 10 3 20 0 30z"/><circle class="o gold" cx="0" cy="-6" r="2.5"/>',
    sincerity: '<path class="o paper" d="M-24 4c4-12 18-16 26-10l10-12c2 6 0 12-4 16 8 0 14 6 16 12-14 2-26 4-34 2-6-1-12-3-14-8z"/><circle class="ink" cx="0" cy="-10" r="1.8"/><path class="o gold" d="M8-18l7-1-5 5z"/><path class="l" d="M-14 6q8 4 18-2"/><path class="o leaf" d="M14-26q8 0 10 6-8 0-10-6z"/>',
    cheat: '<path class="o paper" d="M-26-12l20-8 10 30-20 8z"/><path class="o paper" d="M-6-22h20v32h-20z" transform="rotate(10)"/><path class="red" d="M-17-3l3-5 3 5-3 5z"/><path class="red" d="M6-6c-3-6 6-6 3-1 3-5 9-1 3 5l-3 4-3-4z" transform="rotate(10)"/><path class="o gold" d="M-28 18l12-6 2 4-12 6z"/>',
    pillory: '<path class="o wood" d="M-4-6h8v34h-8z"/><path class="o wood" d="M-28-22h56v14h-56z"/><path class="l" d="M-28-15h56"/><circle class="o paper" cx="0" cy="-15" r="4.5"/><circle class="o paper" cx="-17" cy="-15" r="3"/><circle class="o paper" cx="17" cy="-15" r="3"/><path class="o wood" d="M-14 26h28v4h-28z"/>',
    humility: '<path class="l" d="M2 28c0-14-2-24-10-28"/><path class="o leaf" d="M2 18q12-4 16-14-12 2-16 14zM0 22q-12-2-18-10 12-2 18 10z"/><path class="o blue" d="M-8 0c-8 2-14-2-14-8 6-2 11 1 13 5 0-6 3-10 9-10 1 7-2 11-6 13 6 0 9 4 8 9-6 1-10-3-10-9z"/><circle class="o gold" cx="-8" cy="0" r="2.2"/>',
    stocks: '<path class="o wood" d="M-28-4h56v14h-56z"/><path class="l" d="M-28 3h56"/><circle class="o paper" cx="-12" cy="3" r="4"/><circle class="o paper" cx="12" cy="3" r="4"/><path class="o wood" d="M-24 10h6v16h-6zM18 10h6v16h-6z"/><path class="o wood" d="M-28-10h8v6h-8zM20-10h8v6h-8z"/>',
    industry: '<path class="o gold" d="M-20 22h40c0-30-6-44-20-44s-20 14-20 44z"/><path class="l" d="M-17 6h34M-19 14h38M-12-6h24M-6-16h12"/><path class="o ink" d="M-5 22v-7a5 5 0 0 1 10 0v7z"/><ellipse class="o gold" cx="20" cy="-18" rx="5" ry="3.5"/><path class="o paper" d="M18-21q-2-6 3-6 3 2-1 6zM21-21q2-6 6-4 0 4-5 5z"/>',
    perjurer: '<path class="o paper2" d="M-22-20h36v40h-36z"/><path class="o paper2" d="M-26-24a4 4 0 0 1 8 0v44a4 4 0 0 1-8 0zM10-24a4 4 0 0 1 8 0v44a4 4 0 0 1-8 0z"/><path class="l" d="M-14-10h20M-14-3h20M-14 4h12"/><path class="o red" d="M8 8l8 4 2 10-8 2-6-6z"/><path class="l" d="M10 14l6 6"/>',
    charity: '<path class="o gold" d="M-26 12c0-18 10-26 26-26s26 8 26 26c0 6-4 10-10 10h-32c-6 0-10-4-10-10z"/><path class="l" d="M-12-6q4 8 0 18M0-10q4 10 0 22M12-6q4 8 0 18"/>',
    drunkard: '<path class="o green" d="M-6-28h12v12c8 4 10 10 10 20v22h-32v-22c0-10 2-16 10-20z"/><path class="o paper2" d="M-14 4h28v12h-28z"/><path class="o wood" d="M-7-28h14v-4h-14z"/>',
    prison: '<path class="o paper2" d="M-24 28v-36a24 24 0 0 1 48 0v36z"/><path class="o ink" d="M-16 28v-30a16 16 0 0 1 32 0v30z"/><path class="l paper-stroke" d="M-8-15v43M0-18v46M8-15v43M-16 4h32"/>',
    humanity: '<path class="o red" d="M0 26c-14-10-26-20-26-34 0-10 8-16 15-16 6 0 9 4 11 8 2-4 5-8 11-8 7 0 15 6 15 16 0 14-12 24-26 34z"/><path class="l paper-stroke" d="M-14-12q2-6 8-6"/>',
    generosity: '<path class="o wood" d="M-20 2c0-8 6-14 12-14h16c6 0 12 6 12 14v14c0 6-4 10-10 10h-20c-6 0-10-4-10-10z"/><circle class="o gold" cx="-7" cy="-18" r="6"/><circle class="o gold" cx="8" cy="-20" r="6"/><circle class="o gold" cx="1" cy="-10" r="6"/><path class="l" d="M-20 8h40"/>',
    ruin: '<path class="o paper2" d="M-14 26v-30l6-4 4 6 6-8 4 6 8-2v32z"/><path class="l" d="M-8 26v-28M0 26v-26M8 26v-26"/><path class="o paper2" d="M-22 26h44v4h-44z"/><path class="o paper2" d="M14 18l8-6 6 4-6 8z"/>',
    robber: '<path class="o ink" d="M-28-8c8-4 18-4 28 2 10-6 20-6 28-2-2 10-8 16-14 16-6 0-10-4-14-8-4 4-8 8-14 8-6 0-12-6-14-16z"/><circle class="paper" cx="-13" cy="0" r="4"/><circle class="paper" cx="13" cy="0" r="4"/><path class="l" d="M-28-6l-4-6M28-6l4-6"/>',
    seat: '<path class="o red" d="M-16-26h32v26h-32z"/><path class="o wood" d="M-20 0h40v8h-40z"/><path class="o wood" d="M-18 8h5v20h-5zM13 8h5v20h-5z"/><path class="o wood" d="M-22-8h6v16h-6zM16-8h6v16h-6z"/><path class="l" d="M-10-18h20"/>',
    ingratitude: '<path class="l" d="M0 28v-16c0-8 6-10 10-14"/><path class="o wood" d="M10-2c6 2 10 10 6 16-6-2-8-8-6-16zM-2 18q-10-2-14-10 10 0 14 10z"/><circle class="o wood" cx="13" cy="0" r="5"/><path class="l" d="M8 2c-6 2-10 0-12-4M14 4c0 6-2 10-6 12"/>',
    summit: '<path class="o gold" d="M-16-22h32c0 16-6 24-16 24s-16-8-16-24z"/><path class="o gold" d="M-3 2h6v16h-6zM-14 18h28v6h-28z"/><path class="o red" d="M-13-18h26c-1 10-5 15-13 15s-12-5-13-15z"/><circle class="o gold" cx="-22" cy="20" r="5"/><circle class="o gold" cx="22" cy="14" r="5"/>',
    mansion: '<path class="o paper2" d="M-26-4h52v28h-52z"/><path class="o red" d="M-30-4L0-22L30-4z"/><path class="o blue" d="M-20 2h8v8h-8zM12 2h8v8h-8zM-4 2h8v8h-8z"/><path class="o wood" d="M-4 24v-10h8v10z"/>'
  };

  function emblem(name, scale) {
    var g = s('g', { class: 'moh-emblem', transform: scale && scale !== 1 ? 'scale(' + scale + ')' : null });
    return markup(g, EMBLEMS[name] || '');
  }

  /* An octagon with flat top and bottom, radius r. */
  function octagon(r) {
    var pts = [];
    for (var k = 0; k < 8; k++) {
      var a = (22.5 + 45 * k) * Math.PI / 180;
      pts.push((r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a)).toFixed(1));
    }
    return pts.join(' ');
  }

  /* The spiral. Squares run clockwise from the top left, round and inwards, like the 1843 board.
     The track is a "squircle" (between a square and a circle) that shrinks steadily as it turns. */
  var BOARD = 1000, CX = 500, CY = 505, R_OUT = 432, R_IN = 184, TURNS = 2.75, ROUND = 4;
  var MX = 478, MY = 482, MR = 150;   /* the Mansion's frame in the middle */
  function sign(x) { return x < 0 ? -1 : 1; }
  function spiralGeometry() {
    var steps = 6000, raw = [], cum = [0], L = 0, phi0 = -0.75 * Math.PI;
    for (var k = 0; k <= steps; k++) {
      var t = k / steps, phi = phi0 + t * TURNS * 2 * Math.PI, rho = R_OUT + (R_IN - R_OUT) * t;
      var c = Math.cos(phi), sn = Math.sin(phi);
      raw.push([CX + rho * sign(c) * Math.pow(Math.abs(c), 2 / ROUND), CY + rho * sign(sn) * Math.pow(Math.abs(sn), 2 / ROUND)]);
      if (k) { L += Math.hypot(raw[k][0] - raw[k - 1][0], raw[k][1] - raw[k - 1][1]); cum.push(L); }
    }
    var cells = [], j = 0;
    for (var n = 0; n <= LAST - 1; n++) {
      var want = L * n / (LAST - 1);
      while (j < steps - 1 && cum[j + 1] < want) j++;
      var f = cum[j + 1] > cum[j] ? Math.min(1, (want - cum[j]) / (cum[j + 1] - cum[j])) : 0;
      cells.push({ x: raw[j][0] + (raw[j + 1][0] - raw[j][0]) * f, y: raw[j][1] + (raw[j + 1][1] - raw[j][1]) * f });
    }
    cells.push({ x: MX, y: MY });   /* 67, the Mansion, in the middle */
    var d = 'M' + raw[0][0].toFixed(1) + ' ' + raw[0][1].toFixed(1);
    for (var m = 20; m <= steps; m += 20) d += 'L' + raw[m][0].toFixed(1) + ' ' + raw[m][1].toFixed(1);
    return { cells: cells, path: d, spacing: L / (LAST - 1) };
  }

  var CSS = [
    '.game-mansion-of-happiness { --moh-paper: var(--ink); --moh-ink: var(--bg); --moh-paper2: color-mix(in srgb, var(--ink) 80%, var(--gold)); --moh-blank: color-mix(in srgb, var(--gold) 62%, var(--leaf)); --moh-band: color-mix(in srgb, var(--ink) 88%, var(--gold)); --moh-wood: color-mix(in srgb, var(--gold) 62%, var(--bg)); }',
    '.game-mansion-of-happiness .game-toolbar .field { flex-wrap: wrap; max-width: 100%; } .game-mansion-of-happiness .game-toolbar select { max-width: 100%; }',
    '.game-mansion-of-happiness .moh-layout { display: grid; gap: .9rem 1.4rem; grid-template-columns: minmax(0, 1fr); grid-template-areas: "spin" "board" "card" "players"; }',
    '@media (min-width: 880px) { .game-mansion-of-happiness .moh-layout { grid-template-columns: minmax(0, 1.6fr) minmax(17rem, 1fr); grid-template-areas: "board spin" "board card" "board players" "board ."; grid-template-rows: auto auto auto 1fr; } }',
    '.game-mansion-of-happiness .moh-boardwrap { grid-area: board; position: relative; width: 100%; max-width: 680px; margin-inline: auto; }',
    '@media (max-width: 520px) { .game-mansion-of-happiness .moh-boardwrap { width: calc(100% + 1.4rem); max-width: none; margin-inline: -.7rem; } }',
    '.game-mansion-of-happiness .moh-board { display: block; width: 100%; height: auto; user-select: none; -webkit-user-select: none; }',
    '.game-mansion-of-happiness .moh-paper { fill: var(--moh-paper); }',
    '.game-mansion-of-happiness .moh-rule { fill: none; stroke: var(--moh-ink); stroke-width: 3; }',
    '.game-mansion-of-happiness .moh-rule-thin { fill: none; stroke: var(--moh-ink); stroke-width: 1.2; }',
    '.game-mansion-of-happiness .moh-scroll { fill: var(--moh-blank); stroke: var(--moh-ink); stroke-width: 2; }',
    '.game-mansion-of-happiness .moh-band-edge { fill: none; stroke: var(--moh-ink); stroke-linecap: round; stroke-linejoin: round; }',
    '.game-mansion-of-happiness .moh-band { fill: none; stroke: var(--moh-band); stroke-linecap: round; stroke-linejoin: round; }',
    '.game-mansion-of-happiness .moh-band-gold { fill: none; stroke: var(--moh-blank); stroke-linecap: round; stroke-linejoin: round; }',
    '.game-mansion-of-happiness .moh-hatch-line { stroke: var(--moh-ink); stroke-width: 1; opacity: .35; }',
    '.game-mansion-of-happiness .moh-cell-pic { fill: var(--moh-paper); stroke: var(--moh-ink); stroke-width: 2.4; }',
    '.game-mansion-of-happiness .moh-cell-blank { fill: var(--moh-blank); stroke: var(--moh-ink); stroke-width: 2.4; }',
    '.game-mansion-of-happiness .moh-cell-ring { fill: none; stroke: var(--moh-ink); stroke-width: 1; opacity: .5; }',
    '.game-mansion-of-happiness .moh-cell, .game-mansion-of-happiness .moh-mansion { cursor: help; }',
    '.game-mansion-of-happiness .moh-num { font-family: var(--font-head); font-weight: 800; fill: var(--moh-ink); text-anchor: middle; dominant-baseline: central; paint-order: stroke; stroke: var(--moh-paper); stroke-width: 7px; stroke-linejoin: round; font-variant-numeric: tabular-nums; }',
    '.game-mansion-of-happiness .moh-num-blank { stroke: none; }',
    '.game-mansion-of-happiness .moh-cell.is-target .moh-cell-pic, .game-mansion-of-happiness .moh-cell.is-target .moh-cell-blank { stroke: var(--vermilion); stroke-width: 7; }',
    '.game-mansion-of-happiness .moh-emblem .o { stroke: var(--moh-ink); stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; }',
    '.game-mansion-of-happiness .moh-emblem .l { fill: none; stroke: var(--moh-ink); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }',
    '.game-mansion-of-happiness .moh-emblem .l.thick { stroke: var(--peacock); stroke-width: 5; }',
    '.game-mansion-of-happiness .moh-emblem .paper-stroke { stroke: var(--moh-paper2); }',
    '.game-mansion-of-happiness .moh-emblem .ink { fill: var(--moh-ink); }',
    '.game-mansion-of-happiness .moh-emblem .paper { fill: var(--moh-paper); }',
    '.game-mansion-of-happiness .moh-emblem .paper2 { fill: var(--moh-paper2); }',
    '.game-mansion-of-happiness .moh-emblem .gold { fill: var(--gold); }',
    '.game-mansion-of-happiness .moh-emblem .red { fill: var(--vermilion); }',
    '.game-mansion-of-happiness .moh-emblem .blue { fill: var(--cobalt); }',
    '.game-mansion-of-happiness .moh-emblem .green { fill: var(--peacock); }',
    '.game-mansion-of-happiness .moh-emblem .leaf { fill: var(--leaf); }',
    '.game-mansion-of-happiness .moh-emblem .rose { fill: var(--rose); }',
    '.game-mansion-of-happiness .moh-emblem .wood { fill: var(--moh-wood); }',
    '.game-mansion-of-happiness .moh-start-ribbon { fill: var(--vermilion); stroke: var(--moh-ink); stroke-width: 2.4; }',
    '.game-mansion-of-happiness .moh-start-text { font-family: var(--font-display); fill: var(--moh-paper); text-anchor: middle; dominant-baseline: central; font-size: 30px; letter-spacing: .04em; }',
    '.game-mansion-of-happiness .moh-mansion-frame { fill: var(--moh-blank); stroke: var(--moh-ink); stroke-width: 3; }',
    '.game-mansion-of-happiness .moh-sky { fill: color-mix(in srgb, var(--cobalt) 35%, var(--moh-paper)); stroke: var(--moh-ink); stroke-width: 1.5; }',
    '.game-mansion-of-happiness .moh-lawn { fill: color-mix(in srgb, var(--leaf) 75%, var(--moh-paper)); }',
    '.game-mansion-of-happiness .moh-tree { fill: var(--peacock); stroke: var(--moh-ink); stroke-width: 2; }',
    '.game-mansion-of-happiness .moh-house { fill: var(--moh-paper); stroke: var(--moh-ink); stroke-width: 2.2; }',
    '.game-mansion-of-happiness .moh-roof { fill: var(--vermilion); stroke: var(--moh-ink); stroke-width: 2.2; }',
    '.game-mansion-of-happiness .moh-window { fill: var(--cobalt); stroke: var(--moh-ink); stroke-width: 1.4; }',
    '.game-mansion-of-happiness .moh-door { fill: var(--moh-wood); stroke: var(--moh-ink); stroke-width: 1.6; }',
    '.game-mansion-of-happiness .moh-ribbon { fill: var(--rose); stroke: var(--moh-ink); stroke-width: 2; }',
    '.game-mansion-of-happiness .moh-ribbon-text { font-family: var(--font-display); fill: var(--moh-ink); font-size: 20px; text-anchor: middle; }',
    '.game-mansion-of-happiness .moh-mansion.is-glowing .moh-mansion-frame { fill: var(--gold); }',
    '.game-mansion-of-happiness .moh-mansion.is-glowing { animation: moh-glow 1.2s ease-in-out 3; transform-box: fill-box; transform-origin: center; }',
    '@keyframes moh-glow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }',
    '.game-mansion-of-happiness .moh-token { transition: transform .14s ease-out; }',
    '.game-mansion-of-happiness .moh-token.is-jumping { transition-duration: .5s; transition-timing-function: cubic-bezier(.3, 1.3, .5, 1); }',
    '.game-mansion-of-happiness .moh-token-body { transform-box: fill-box; transform-origin: 50% 100%; }',
    '.game-mansion-of-happiness .moh-token.is-hop .moh-token-body { animation: moh-hop .15s ease-out; }',
    '@keyframes moh-hop { 0% { transform: translateY(0) scale(1); } 45% { transform: translateY(-14px) scale(1.12); } 100% { transform: translateY(0) scale(1); } }',
    '.game-mansion-of-happiness .moh-token-disc { stroke: var(--moh-paper); stroke-width: 5; }',
    '.game-mansion-of-happiness .moh-token-edge { fill: none; stroke: var(--moh-ink); stroke-width: 2.5; }',
    '.game-mansion-of-happiness .moh-token-letter { font-family: var(--font-display); fill: var(--moh-ink); text-anchor: middle; dominant-baseline: central; font-size: 30px; }',
    '.game-mansion-of-happiness .moh-token.is-current .moh-token-edge { stroke: var(--gold); stroke-width: 6; }',
    '.game-mansion-of-happiness .moh-bars line { stroke: var(--moh-ink); stroke-width: 4; stroke-linecap: round; }',
    '.game-mansion-of-happiness .c0 { fill: var(--vermilion); background: var(--vermilion); }',
    '.game-mansion-of-happiness .c1 { fill: var(--cobalt); background: var(--cobalt); }',
    '.game-mansion-of-happiness .c2 { fill: var(--peacock); background: var(--peacock); }',
    '.game-mansion-of-happiness .c3 { fill: var(--gold); background: var(--gold); }',
    /* the spin row: the teetotum, the big button, the result medallion */
    '.game-mansion-of-happiness .moh-spinrow { grid-area: spin; display: flex; align-items: center; gap: .6rem .9rem; }',
    '.game-mansion-of-happiness .moh-tee { width: 150px; height: 128px; flex: none; cursor: pointer; display: block; }',
    '@media (max-width: 520px) { .game-mansion-of-happiness .moh-tee { width: 92px; height: 78px; } }',
    '.game-mansion-of-happiness .moh-tee-shadow { fill: var(--moh-ink); opacity: .5; }',
    '.game-mansion-of-happiness .moh-tee-side { fill: color-mix(in srgb, var(--moh-paper) 65%, var(--gold)); stroke: var(--moh-ink); stroke-width: 2.5; }',
    '.game-mansion-of-happiness .moh-tee-top { fill: var(--moh-paper); stroke: var(--moh-ink); stroke-width: 2.5; }',
    '.game-mansion-of-happiness .moh-tee-inner { fill: none; stroke: var(--gold); stroke-width: 3; }',
    '.game-mansion-of-happiness .moh-tee-num { font-family: var(--font-display); font-size: 27px; fill: var(--moh-ink); text-anchor: middle; dominant-baseline: central; }',
    '.game-mansion-of-happiness .moh-tee-hi { fill: var(--gold); opacity: 0; }',
    '.game-mansion-of-happiness .moh-tee.is-down .moh-tee-hi { opacity: 1; }',
    '.game-mansion-of-happiness .moh-tee-pin { stroke: color-mix(in srgb, var(--moh-paper) 75%, var(--gold)); stroke-width: 7; stroke-linecap: round; }',
    '.game-mansion-of-happiness .moh-tee-pin-edge { stroke: var(--moh-ink); stroke-width: 11; stroke-linecap: round; }',
    '.game-mansion-of-happiness .moh-tee-knob { fill: var(--moh-paper); stroke: var(--moh-ink); stroke-width: 2.5; }',
    '.game-mansion-of-happiness .moh-spin { min-height: 60px; font-size: 1.2rem; padding: .5rem 1.1rem; flex: 1 1 auto; min-width: 0; }',
    '.game-mansion-of-happiness .moh-spin .moh-dot { width: 22px; height: 22px; border-radius: 50%; border: 3px solid var(--on-era); flex: none; }',
    '.game-mansion-of-happiness .moh-spin[aria-disabled="true"] { opacity: .7; cursor: wait; }',
    '.game-mansion-of-happiness .moh-spin.is-over { cursor: default; }',
    '.game-mansion-of-happiness .moh-result { width: 60px; height: 60px; border-radius: 50%; display: grid; place-items: center; font-family: var(--font-display); font-size: 2.1rem; line-height: 1; background: var(--moh-paper); color: var(--moh-ink); border: 4px solid var(--gold); flex: none; box-shadow: 0 4px 0 var(--gold-shadow); }',
    '.game-mansion-of-happiness .moh-result.is-empty { opacity: .35; }',
    '.game-mansion-of-happiness .moh-result.is-pop { animation: moh-pop .45s cubic-bezier(.3, 1.6, .5, 1); }',
    '@keyframes moh-pop { 0% { transform: scale(.3); } 100% { transform: scale(1); } }',
    '@media (max-width: 520px) { .game-mansion-of-happiness .moh-spinrow { gap: .5rem; } .game-mansion-of-happiness .moh-spin { font-size: 1.05rem; padding: .45rem .8rem; } .game-mansion-of-happiness .moh-result { width: 50px; height: 50px; font-size: 1.7rem; } }',
    /* the square card */
    '.game-mansion-of-happiness .moh-card { grid-area: card; display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: .15rem .9rem; align-items: start; padding: .8rem 1rem; border-radius: 14px; background: var(--moh-paper); color: var(--moh-ink); border: 4px double var(--moh-ink); box-shadow: 0 6px 18px rgba(0, 0, 0, .35); min-height: 8.2rem; }',
    '.game-mansion-of-happiness .moh-card.is-flash { animation: moh-card .4s ease-out; }',
    '@keyframes moh-card { 0% { transform: rotate(-1.5deg) scale(.97); } 100% { transform: none; } }',
    '.game-mansion-of-happiness .moh-card svg { width: 72px; height: 72px; grid-row: span 3; }',
    '.game-mansion-of-happiness .moh-card-title { font-family: var(--font-display); font-size: 1.35rem; line-height: 1.1; color: var(--moh-ink); margin: 0; }',
    '.game-mansion-of-happiness .moh-card-gloss { font-style: italic; margin: 0; color: var(--moh-ink); }',
    '.game-mansion-of-happiness .moh-card-say { margin: .25rem 0 0; font-weight: 700; color: var(--moh-ink); }',
    '@media (max-width: 520px) { .game-mansion-of-happiness .moh-card { grid-template-columns: 52px minmax(0, 1fr); padding: .65rem .75rem; font-size: .95rem; min-height: 9rem; } .game-mansion-of-happiness .moh-card svg { width: 52px; height: 52px; } .game-mansion-of-happiness .moh-card-title { font-size: 1.15rem; } }',
    /* players */
    '.game-mansion-of-happiness .moh-players { grid-area: players; display: grid; gap: .45rem; align-content: start; }',
    '.game-mansion-of-happiness .moh-players ol { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; }',
    '.game-mansion-of-happiness .moh-players li { margin: 0; display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; gap: .6rem; align-items: center; padding: .4rem .6rem; border-radius: 12px; border: 2px solid transparent; background: var(--surface-2); }',
    '.game-mansion-of-happiness .moh-players li.is-current { border-color: var(--gold); }',
    '.game-mansion-of-happiness .moh-chip { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-family: var(--font-display); color: var(--moh-ink); border: 3px solid var(--moh-paper); box-shadow: 0 0 0 1px var(--moh-ink); font-size: .95rem; }',
    '.game-mansion-of-happiness .moh-pname { font-weight: 800; line-height: 1.2; display: block; }',
    '.game-mansion-of-happiness .moh-pinfo { display: block; font-weight: 600; font-size: .88rem; color: var(--ink-muted); line-height: 1.25; }',
    '.game-mansion-of-happiness .moh-coins { font-variant-numeric: tabular-nums; font-weight: 800; white-space: nowrap; display: inline-flex; align-items: center; gap: .3rem; }',
    '.game-mansion-of-happiness .moh-coin { width: 14px; height: 14px; border-radius: 50%; background: var(--gold); border: 2px solid var(--gold-shadow); }',
    '.game-mansion-of-happiness .moh-coins.is-pay { animation: moh-pay .6s ease-out; }',
    '@keyframes moh-pay { 0% { color: var(--red); transform: scale(1.4); } 100% { transform: scale(1); } }',
    '.game-mansion-of-happiness .moh-pool { font-size: .92rem; color: var(--ink-muted); margin: 0; }',
    '.game-mansion-of-happiness .moh-below { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); gap: .8rem 1.4rem; margin-top: 1.1rem; }',
    '.game-mansion-of-happiness .moh-below h3 { font-size: 1rem; margin: 0 0 .4rem; }',
    '.game-mansion-of-happiness .moh-log ol { list-style: none; padding: 0; margin: 0; font-size: .95rem; }',
    '.game-mansion-of-happiness .moh-log li { padding: .25rem .5rem; border-left: 3px solid var(--line); margin: .2rem 0; }',
    '.game-mansion-of-happiness .moh-log li:first-child { border-left-color: var(--gold); }',
    '.game-mansion-of-happiness details.moh-all > summary { cursor: pointer; font-weight: 800; min-height: 44px; display: flex; align-items: center; color: var(--link); }',
    '.game-mansion-of-happiness .moh-all ul { list-style: none; padding: 0; margin: 0; display: grid; gap: .5rem; }',
    '.game-mansion-of-happiness .moh-all li { margin: 0; display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: .6rem; align-items: start; font-size: .95rem; }',
    '.game-mansion-of-happiness .moh-all svg { width: 44px; height: 44px; background: var(--moh-paper); border-radius: 8px; }',
    '.game-mansion-of-happiness .moh-all b { color: var(--ink); }',
    '.game-mansion-of-happiness .moh-all .moh-rulet { display: block; color: var(--ink-muted); }',
    '@media (prefers-reduced-motion: reduce) { .game-mansion-of-happiness .moh-token, .game-mansion-of-happiness .moh-token.is-jumping { transition: none; } .game-mansion-of-happiness .moh-token.is-hop .moh-token-body, .game-mansion-of-happiness .moh-result.is-pop, .game-mansion-of-happiness .moh-card.is-flash, .game-mansion-of-happiness .moh-mansion.is-glowing, .game-mansion-of-happiness .moh-coins.is-pay { animation: none; } }'
  ].join('\n');

  /* Who plays. In "vs computer" games you are Red and the computer plays the other seats. */
  var COMPUTER_NAMES = ['Aunt Agatha', 'Cousin Bertie', 'Uncle Cyril'];
  var COLOUR_NAMES = ['Red', 'Blue', 'Green', 'Gold'];
  var COLOUR_LETTERS = ['R', 'B', 'G', 'Gd'];
  var MODES = [
    ['c1', 'You and 1 computer'], ['c2', 'You and 2 computers'], ['c3', 'You and 3 computers'],
    ['h2', '2 players'], ['h3', '3 players'], ['h4', '4 players']
  ];

  GamesInTime.register({
    id: ID,
    frame: 'table',
    /* The rules engine, for tests and for anyone curious: play(state, playerIndex, spin). */
    rules: { squares: SQUARES, play: play, waitTurn: waitTurn },
    mount: function (root, api) {
      var h = api.h;
      root.appendChild(h('style', null, CSS));

      var mode = api.store.get('players', 'c1');
      if (!MODES.some(function (m) { return m[0] === mode; })) mode = 'c1';
      var vsComputer = function () { return mode.charAt(0) === 'c'; };
      var wins = Number(api.store.get('wins', 0)) || 0;

      var state = null, turn = 0, over = false, busy = false, timers = [], raf = 0, logItems = [];
      var display = [];   /* where each token is drawn right now (it lags the rules while it hops) */
      var teeAngle = 0;

      /* ---------- timers: everything pending is cancelled by New game and by leaving the page ---------- */
      function onPage() { return document.body.contains(root); }
      function later(fn, ms) {
        var id = setTimeout(function () { timers = timers.filter(function (t) { return t !== id; }); if (onPage()) fn(); }, api.reducedMotion ? 0 : ms);
        timers.push(id);
      }
      function cancelAll() {
        timers.forEach(clearTimeout); timers = [];
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      }
      function onHash() { if (!onPage()) destroy(); }
      window.addEventListener('hashchange', onHash);
      function destroy() { cancelAll(); window.removeEventListener('hashchange', onHash); }

      /* ---------- controls ---------- */
      var modeSelect = h('select', { id: 'moh-mode', onchange: function () { mode = modeSelect.value; api.store.set('players', mode); newGame(); } },
        MODES.map(function (m) { return h('option', { value: m[0] }, m[1]); }));
      modeSelect.value = mode;
      var newBtn = h('button', { class: 'btn', type: 'button', onclick: function () { newGame(); } }, 'New game');
      var toolbar = h('div', { class: 'game-toolbar' }, newBtn, h('label', { class: 'field', for: 'moh-mode' }, 'Players', modeSelect));

      /* ---------- the teetotum ---------- */
      var tee = s('svg', { class: 'moh-tee', viewBox: '0 0 200 170', 'aria-hidden': 'true', focusable: 'false' });
      var teeShadow = s('ellipse', { class: 'moh-tee-shadow', cx: 100, cy: 142, rx: 70, ry: 14 });
      var teeSide = s('g'), teeTop = s('g'), teePin = s('g'), teeNums = [];
      teeSide.appendChild(s('polygon', { class: 'moh-tee-side', points: octagon(82) }));
      teeTop.appendChild(s('polygon', { class: 'moh-tee-top', points: octagon(82) }));
      teeTop.appendChild(s('polygon', { class: 'moh-tee-inner', points: octagon(68) }));
      var teeHi = s('circle', { class: 'moh-tee-hi', r: 17 });
      teeTop.appendChild(teeHi);
      for (var k = 0; k < SIDES; k++) {
        var ang = -90 + 45 * k, rad = ang * Math.PI / 180, nx = 50 * Math.cos(rad), ny = 50 * Math.sin(rad);
        var tnum = s('text', { class: 'moh-tee-num', x: nx.toFixed(1), y: ny.toFixed(1), transform: 'rotate(' + (ang - 90) + ' ' + nx.toFixed(1) + ' ' + ny.toFixed(1) + ')' });
        tnum.textContent = String(k + 1);
        teeNums.push({ x: nx, y: ny });
        teeTop.appendChild(tnum);
      }
      teePin.appendChild(s('line', { class: 'moh-tee-pin-edge', x1: 0, y1: 0, x2: 0, y2: -64 }));
      teePin.appendChild(s('line', { class: 'moh-tee-pin', x1: 0, y1: 0, x2: 0, y2: -64 }));
      teePin.appendChild(s('circle', { class: 'moh-tee-knob', cx: 0, cy: -66, r: 8 }));
      tee.appendChild(teeShadow);
      tee.appendChild(s('g', null, teeSide, teeTop, teePin));
      tee.addEventListener('click', function () { humanSpin(); });

      /* angle: the plate's turn; wob: 0 to 1, how wobbly; fall: 0 upright to 1 toppled */
      function drawTee(angle, wob, fall) {
        var tilt = wob * 9 * Math.sin(angle / 23) - fall * 14;
        var sy = 0.44 + wob * 0.06 * Math.sin(angle / 31 + 1) + fall * 0.24;
        var cy = 96 + fall * 12;
        var plate = ') rotate(' + tilt.toFixed(2) + ') scale(1 ' + sy.toFixed(3) + ') rotate(' + angle.toFixed(2) + ')';
        teeSide.setAttribute('transform', 'translate(100 ' + (cy + 11).toFixed(1) + plate);
        teeTop.setAttribute('transform', 'translate(100 ' + cy.toFixed(1) + plate);
        teePin.setAttribute('transform', 'translate(100 ' + cy.toFixed(1) + ') rotate(' + (tilt * 1.6 - fall * 38).toFixed(2) + ') scale(1 ' + (1 - fall * 0.35).toFixed(3) + ')');
        teeShadow.setAttribute('rx', (70 + fall * 8).toFixed(1));
      }
      function showFace(value) {
        var p = teeNums[value - 1];
        teeHi.setAttribute('cx', p.x.toFixed(1));
        teeHi.setAttribute('cy', p.y.toFixed(1));
      }
      teeAngle = 180;
      drawTee(teeAngle, 0, 1);
      showFace(1);

      /* Spin to "value": the plate turns four times and a bit, slowing and wobbling, then topples with
         "value" on the front edge, the edge that touches the table. */
      function spinTee(value, done) {
        var want = ((180 - 45 * (value - 1)) % 360 + 360) % 360;
        var start = teeAngle, cur = ((start % 360) + 360) % 360;
        var total = 360 * 4 + ((want - cur + 360) % 360);
        tee.classList.remove('is-down');
        showFace(value);
        setResult(null);
        if (api.reducedMotion) {
          teeAngle = start + total;
          drawTee(teeAngle, 0, 1);
          tee.classList.add('is-down');
          api.sound('clack');
          setResult(value);
          done();
          return;
        }
        api.sound('whoosh');
        var t0 = performance.now(), lastSector = Math.floor(start / 45), lastTick = 0;
        function frame(now) {
          raf = 0;
          if (!onPage()) return;
          var t = Math.min(1, (now - t0) / SPIN_MS);
          var e = 1 - Math.pow(1 - t, 3);
          var a = start + total * e;
          var sector = Math.floor(a / 45);
          if (sector !== lastSector && now - lastTick > 70) { api.sound('tick'); lastTick = now; }
          lastSector = sector;
          var fall = t < 0.86 ? 0 : (t - 0.86) / 0.14;
          drawTee(a, Math.min(1, t * 1.3) * (1 - fall), fall);
          if (t < 1) { raf = requestAnimationFrame(frame); return; }
          teeAngle = start + total;
          tee.classList.add('is-down');
          api.sound('clack');
          setResult(value);
          done();
        }
        raf = requestAnimationFrame(frame);
      }

      var spinLabel = h('span', null, 'Spin the teetotum');
      var spinDot = h('span', { class: 'moh-dot c0', 'aria-hidden': 'true' });
      /* Never truly disabled, so keyboard focus stays on it between turns; aria-disabled says when it is waiting. */
      var spinBtn = h('button', { class: 'btn btn-primary moh-spin', type: 'button', onclick: function () { humanSpin(); } }, spinDot, spinLabel);
      var resultEl = h('div', { class: 'moh-result is-empty', 'aria-hidden': 'true' }, '?');
      function setResult(value) {
        resultEl.classList.remove('is-pop');
        if (value == null) { resultEl.textContent = '?'; resultEl.classList.add('is-empty'); return; }
        resultEl.textContent = String(value);
        resultEl.classList.remove('is-empty');
        void resultEl.offsetWidth;
        resultEl.classList.add('is-pop');
      }
      var spinRow = h('div', { class: 'moh-spinrow' }, tee, spinBtn, resultEl);

      /* ---------- the square card: what the square you landed on means, and what it did ---------- */
      var cardPic = s('svg', { viewBox: '-36 -36 72 72', 'aria-hidden': 'true', focusable: 'false' });
      var cardTitle = h('p', { class: 'moh-card-title' });
      var cardGloss = h('p', { class: 'moh-card-gloss' });
      var cardSay = h('p', { class: 'moh-card-say' });
      var card = h('div', { class: 'moh-card' }, cardPic, cardTitle, cardGloss, cardSay);
      function showCard(n, text) {
        var q = SQUARES[n];
        cardPic.replaceChildren();
        if (q) {
          cardPic.appendChild(s('polygon', { class: 'moh-cell-pic', points: octagon(34) }));
          cardPic.appendChild(emblem(q.icon, 0.85));
          cardTitle.textContent = n + '. ' + q.name;
          cardGloss.textContent = q.gloss;
        } else {
          cardPic.appendChild(s('polygon', { class: 'moh-cell-blank', points: octagon(34) }));
          var tn = s('text', { class: 'moh-num moh-num-blank', 'font-size': 28 }); tn.textContent = String(n); cardPic.appendChild(tn);
          cardTitle.textContent = 'Square ' + n;
          cardGloss.textContent = 'A plain square.';
        }
        cardSay.textContent = text || '';
        card.classList.remove('is-flash'); void card.offsetWidth; card.classList.add('is-flash');
      }
      function introCard() {
        cardPic.replaceChildren(s('polygon', { class: 'moh-cell-pic', points: octagon(34) }), emblem('mansion', 0.85));
        cardTitle.textContent = 'The Mansion of Happiness';
        cardGloss.textContent = 'Travel the spiral from Justice to the Mansion in the middle.';
        cardSay.textContent = 'Virtues send you on. Vices send you back, cost you counters or lock you up.';
      }

      /* ---------- players ---------- */
      var playerList = h('ol', { 'aria-label': 'Players' });
      var poolEl = h('p', { class: 'moh-pool' });
      var winsEl = h('p', { class: 'moh-pool' });
      var playersBox = h('div', { class: 'moh-players' }, playerList, poolEl, winsEl);

      /* ---------- the board ---------- */
      var geo = spiralGeometry();
      var cellR = Math.min(geo.spacing / 2 - 2.5, 47) / Math.cos(Math.PI / 8);
      var board = s('svg', { class: 'moh-board', viewBox: '0 0 ' + BOARD + ' ' + BOARD, role: 'img', 'aria-label': 'The board: a spiral of 67 numbered squares from Justice at the top left to the Mansion of Happiness in the middle.' });
      var hatchId = 'moh-hatch-' + (++uid);
      board.appendChild(markup(s('defs'), '<pattern id="' + hatchId + '" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><line class="moh-hatch-line" x1="0" y1="0" x2="0" y2="7"/></pattern>'));
      board.appendChild(s('rect', { class: 'moh-paper', x: 4, y: 4, width: BOARD - 8, height: BOARD - 8, rx: 20 }));
      board.appendChild(s('rect', { class: 'moh-rule', x: 14, y: 14, width: BOARD - 28, height: BOARD - 28, rx: 14 }));
      board.appendChild(s('rect', { class: 'moh-rule-thin', x: 22, y: 22, width: BOARD - 44, height: BOARD - 44, rx: 10 }));
      /* acanthus-style corner scrolls, like the gilt flourishes in the corners of the 1843 board */
      [[BOARD, 0, -1, 1], [0, BOARD, 1, -1], [BOARD, BOARD, -1, -1]].forEach(function (c) {
        board.appendChild(markup(s('g', { transform: 'translate(' + c[0] + ' ' + c[1] + ') scale(' + c[2] + ' ' + c[3] + ')' }),
          '<path class="moh-scroll" d="M30 104c-6-30 8-58 38-66 20-5 38 4 40 20 2 14-10 23-21 18-9-4-7-16 2-16-4-7-18-5-23 5-7 14-2 30 7 39-16 4-30-2-43 0z"/>'));
      });
      var bandW = geo.spacing + 6;
      board.appendChild(s('path', { class: 'moh-band-edge', d: geo.path, 'stroke-width': bandW + 7 }));
      board.appendChild(s('path', { class: 'moh-band-gold', d: geo.path, 'stroke-width': bandW + 1 }));
      board.appendChild(s('path', { class: 'moh-band', d: geo.path, 'stroke-width': bandW - 9 }));
      board.appendChild(s('path', { d: geo.path, fill: 'none', stroke: 'url(#' + hatchId + ')', 'stroke-width': bandW - 9, 'stroke-linecap': 'round' }));

      /* the start: a ribbon where square 0 would be */
      var c0 = geo.cells[0];
      board.appendChild(markup(s('g', { transform: 'translate(96 58) rotate(-8)' }),
        '<path class="moh-start-ribbon" d="M-56-22h112l-12 22 12 22h-112l12-22z"/><text class="moh-start-text" y="1">Start</text>'));

      var cellEls = {};
      for (var n = 1; n < LAST; n++) {
        var cpos = geo.cells[n], q = SQUARES[n];
        var g = s('g', { class: 'moh-cell', 'data-square': n, transform: 'translate(' + cpos.x.toFixed(1) + ' ' + cpos.y.toFixed(1) + ')' });
        var title = s('title'); title.textContent = n + (q ? '. ' + q.name + ': ' + q.gloss : '');
        g.appendChild(title);
        g.appendChild(s('polygon', { class: q ? 'moh-cell-pic' : 'moh-cell-blank', points: octagon(cellR) }));
        if (q) {
          g.appendChild(s('polygon', { class: 'moh-cell-ring', points: octagon(cellR - 5) }));
          var em = emblem(q.icon);
          em.setAttribute('transform', 'translate(0 11) scale(0.82)');
          g.appendChild(em);
          var tq = s('text', { class: 'moh-num', y: (-cellR * 0.58).toFixed(1), 'font-size': 32 });
          tq.textContent = String(n);
          g.appendChild(tq);
        } else {
          var tb = s('text', { class: 'moh-num moh-num-blank', 'font-size': 38 });
          tb.textContent = String(n);
          g.appendChild(tb);
        }
        cellEls[n] = g;
        board.appendChild(g);
      }

      /* the Mansion of Happiness in the middle */
      var mansion = s('g', { class: 'moh-mansion' });
      var mtitle = s('title'); mtitle.textContent = '67. The Mansion of Happiness';
      mansion.appendChild(mtitle);
      mansion.appendChild(s('polygon', { class: 'moh-mansion-frame', points: octagon(MR), transform: 'translate(' + MX + ' ' + MY + ')' }));
      mansion.appendChild(markup(s('g', { transform: 'translate(' + MX + ' ' + MY + ')' }),
        '<polygon class="moh-sky" points="' + octagon(MR - 14) + '"/>' +
        '<path class="moh-lawn" d="M-106 40q106-26 212 0v18l-40 42h-132l-40-42z"/>' +
        '<path class="moh-tree" d="M-98 44c-12-6-12-26 0-34-2-16 16-24 26-14 14-4 22 12 14 22 8 10-2 26-16 24-8 8-20 8-24 2z"/><path class="moh-tree" d="M98 44c12-6 12-26 0-34 2-16-16-24-26-14-14-4-22 12-14 22-8 10 2 26 16 24 8 8 20 8 24 2z"/>' +
        '<path class="moh-house" d="M-62 50v-50h124v50z"/><path class="moh-roof" d="M-70 2l70-34 70 34z"/><path class="moh-house" d="M-26 50v-60h52v60z"/><path class="moh-roof" d="M-32-8l32-22 32 22z"/>' +
        '<path class="moh-window" d="M-54 10h12v14h-12zM-54 30h12v14h-12zM42 10h12v14h-12zM42 30h12v14h-12zM-18 0h10v12h-10zM8 0h10v12h-10z"/>' +
        '<path class="moh-door" d="M-9 50v-22a9 9 0 0 1 18 0v22z"/>' +
        '<path class="moh-ribbon" d="M-124-84h248l-11 16 11 16h-248l11-16z"/><text class="moh-ribbon-text" y="-61" textLength="212" lengthAdjust="spacingAndGlyphs">THE MANSION OF HAPPINESS</text>' +
        '<text class="moh-num" y="94" font-size="34">67</text>'));
      board.appendChild(mansion);

      var tokenLayer = s('g', { class: 'moh-tokens' });
      board.appendChild(tokenLayer);
      /* Tap any square to read what it means (handy on phones, where hover titles do not show). */
      board.addEventListener('click', function (ev) {
        var cellEl = ev.target.closest && ev.target.closest('.moh-cell, .moh-mansion');
        if (!cellEl) return;
        var num = cellEl.classList.contains('moh-mansion') ? LAST : Number(cellEl.getAttribute('data-square'));
        showCard(num, ruleText(num) || 'A plain square: nothing happens here.');
        api.sound('flip');
      });
      var boardWrap = h('div', { class: 'moh-boardwrap board' }, board);

      /* ---------- below the board ---------- */
      var logList = h('ol', { 'aria-label': 'Last moves' });
      var allList = h('ul');
      Object.keys(SQUARES).map(Number).sort(function (x, y) { return x - y; }).forEach(function (num) {
        var sq = SQUARES[num];
        var pic = s('svg', { viewBox: '-36 -36 72 72', 'aria-hidden': 'true', focusable: 'false' }, emblem(sq.icon, 0.9));
        allList.appendChild(h('li', null, pic, h('span', null, h('b', null, num + '. ' + sq.name + '. '), sq.gloss, h('span', { class: 'moh-rulet' }, ruleText(num)))));
      });
      var below = h('div', { class: 'moh-below' },
        h('div', { class: 'moh-log' }, h('h3', null, 'Last moves'), logList),
        h('details', { class: 'moh-all' }, h('summary', null, 'All the squares and what they do'), allList));

      root.appendChild(toolbar);
      root.appendChild(h('div', { class: 'moh-layout' }, spinRow, card, boardWrap, playersBox));
      root.appendChild(below);
      root.appendChild(h('p', { class: 'game-note' }, 'Spin the eight-sided teetotum and move that many squares. Land on 67 exactly to win: spin past it and you go back to the Seat of Expectation (60); spin past again and you begin the game again. Two counters may never share a square: the newcomer pays 1 counter and the other goes back to where the newcomer started.'));

      /* ---------- drawing ---------- */
      var tokens = [];
      function tokenXY(i, sq) {
        if (sq === 0) {
          var off = [[-20, -20], [20, -20], [-20, 20], [20, 20]][i];
          return { x: c0.x + 6 + off[0], y: c0.y + 6 + off[1], small: true };
        }
        if (sq === LAST) return { x: MX + (i - 1.5) * 44, y: MY + 30 };
        var c = geo.cells[sq];
        return { x: c.x, y: c.y + cellR * 0.2 };
      }
      function buildTokens() {
        tokenLayer.replaceChildren();
        tokens = state.players.map(function (p, i) {
          var body = s('g', { class: 'moh-token-body' },
            s('circle', { class: 'moh-token-disc c' + i, r: 25 }),
            s('circle', { class: 'moh-token-edge', r: 28 }));
          var letter = s('text', { class: 'moh-token-letter', y: 1 }); letter.textContent = p.letter;
          if (p.letter.length > 1) letter.setAttribute('font-size', '22');
          body.appendChild(letter);
          var bars = s('g', { class: 'moh-bars', 'aria-hidden': 'true' },
            s('line', { x1: -14, y1: -30, x2: -14, y2: 30 }), s('line', { x1: 0, y1: -32, x2: 0, y2: 32 }), s('line', { x1: 14, y1: -30, x2: 14, y2: 30 }));
          bars.style.display = 'none';
          var tg = s('g', { class: 'moh-token', 'data-player': i }, body, bars);
          tokenLayer.appendChild(tg);
          return { g: tg, bars: bars };
        });
        display = state.players.map(function (p) { return p.pos; });
        tokens.forEach(function (t, i) { placeToken(i, display[i], 'none'); });
      }
      function placeToken(i, sq, style) {
        var t = tokens[i], xy = tokenXY(i, sq);
        t.g.classList.toggle('is-jumping', style === 'jump');
        t.g.classList.remove('is-hop');
        if (style === 'hop') { void t.g.getBoundingClientRect(); t.g.classList.add('is-hop'); }
        t.g.style.transform = 'translate(' + xy.x.toFixed(1) + 'px, ' + xy.y.toFixed(1) + 'px)' + (xy.small ? ' scale(.72)' : '');
        t.g.setAttribute('data-pos', String(sq));
        display[i] = sq;
        tokenLayer.appendChild(t.g);   /* the token that moved is drawn on top */
      }
      function drawPlayers() {
        playerList.replaceChildren();
        state.players.forEach(function (p, i) {
          var info = p.pos === 0 ? 'At the start' : p.pos === LAST ? 'In the Mansion!' : 'On ' + p.pos + (SQUARES[p.pos] ? ', ' + SQUARES[p.pos].name : '');
          if (p.months > 0) info += ' (locked up: ' + p.months + ' more turn' + (p.months > 1 ? 's' : '') + ')';
          playerList.appendChild(h('li', { class: i === turn && !over ? 'is-current' : '', 'data-player': i, 'data-pos': p.pos, 'data-counters': p.counters },
            h('span', { class: 'moh-chip c' + i, 'aria-hidden': 'true' }, p.letter),
            h('span', null, h('span', { class: 'moh-pname' }, p.name), h('span', { class: 'moh-pinfo' }, info)),
            h('span', { class: 'moh-coins', title: 'Counters left', 'aria-label': p.counters + ' counters' }, String(p.counters), h('span', { class: 'moh-coin', 'aria-hidden': 'true' }))));
          tokens[i].bars.style.display = p.months > 0 ? '' : 'none';
          tokens[i].g.classList.toggle('is-current', i === turn && !over);
        });
        poolEl.textContent = 'Fines box: ' + state.pool + ' counter' + (state.pool === 1 ? '' : 's') + '. Everyone starts with ' + COUNTERS + '.';
        winsEl.textContent = vsComputer() && wins ? 'You have reached the Mansion ' + wins + ' time' + (wins === 1 ? '' : 's') + ' on this device.' : 'First to the Mansion wins.';
      }
      function flashCoins(i) {
        var li = playerList.children[i];
        var coins = li && li.querySelector('.moh-coins');
        if (!coins) return;
        coins.classList.remove('is-pay'); void coins.offsetWidth; coins.classList.add('is-pay');
      }
      function log(text) {
        logItems.unshift(text);
        if (logItems.length > LOG_LENGTH) logItems.length = LOG_LENGTH;
        logList.replaceChildren();
        logItems.forEach(function (tx) { logList.appendChild(h('li', null, tx)); });
      }
      function setSpinState() {
        var p = state.players[turn];
        var waiting = over || busy || p.computer;
        spinBtn.setAttribute('aria-disabled', waiting ? 'true' : 'false');
        spinBtn.classList.toggle('is-over', over);
        spinDot.className = 'moh-dot c' + turn;
        if (over) spinLabel.textContent = 'Game over';
        else if (p.computer) spinLabel.textContent = p.name + ' is spinning';
        else if (vsComputer()) spinLabel.textContent = 'Spin the teetotum';
        else spinLabel.textContent = p.name + ': spin';
      }

      /* ---------- the game ---------- */
      function newGame() {
        cancelAll();
        over = false; turn = 0; logItems = [];
        setBusy(false);
        var count = Number(mode.charAt(1)) + (vsComputer() ? 1 : 0);
        var players = [];
        for (var i = 0; i < count; i++) {
          var computer = vsComputer() && i > 0, you = vsComputer() && i === 0;
          players.push({
            name: you ? 'You' : computer ? COMPUTER_NAMES[i - 1] : COLOUR_NAMES[i],
            letter: you ? 'Y' : computer ? COMPUTER_NAMES[i - 1].split(' ')[1].charAt(0) : COLOUR_LETTERS[i],
            you: you, computer: computer, pos: 0, counters: COUNTERS, months: 0, crime: null, overthrown: false
          });
        }
        state = { players: players, pool: 0 };
        root.setAttribute('data-over', 'false');
        buildTokens();
        mansion.classList.remove('is-glowing');
        clearTargets();
        setResult(null);
        introCard();
        logList.replaceChildren(h('li', { class: 'muted' }, 'No moves yet.'));
        api.sound('shuffle');
        startTurn();
      }
      function clearTargets() {
        Array.prototype.forEach.call(board.querySelectorAll('.moh-cell.is-target'), function (c) { c.classList.remove('is-target'); });
      }

      function setBusy(b) { busy = b; root.setAttribute('data-busy', b ? 'true' : 'false'); }

      function startTurn() {
        var p = state.players[turn];
        setBusy(false);
        root.setAttribute('data-turn', String(turn));
        drawPlayers();
        if (p.computer || p.months > 0) {
          /* Nothing to decide: the computer just spins, and a locked-up player just waits. */
          setBusy(true);
          api.status(p.months > 0 ? (p.you ? 'You are locked up this turn' : p.name + ' is locked up this turn') : p.name + ' is spinning the teetotum');
          setSpinState();
          later(takeTurn, p.months > 0 ? SAY_MS : COMPUTER_MS);
          return;
        }
        setSpinState();
        api.status(p.you ? 'Your turn: spin the teetotum' : p.name + '\'s turn: spin the teetotum');
      }

      function humanSpin() {
        if (!state || over || busy || state.players[turn].computer) return;
        takeTurn();
      }

      function takeTurn() {
        setBusy(true);
        setSpinState();
        var p = state.players[turn];
        if (p.months > 0) { runSteps(waitTurn(state, turn), endTurn); return; }
        var spin = 1 + Math.floor(api.random() * SIDES);
        api.status((p.you ? 'You spin' : p.name + ' spins') + ' the teetotum...');
        spinTee(spin, function () {
          var said = (p.you ? 'You' : p.name) + ' spun ' + spin + '.';
          api.status(said);
          log(said);
          resolve(spin, null);
        });
      }

      function resolve(spin, bounced) {
        var result = play(state, turn, spin, bounced);
        runSteps(result, function () {
          if (!result.respin) { endTurn(result); return; }
          var p = state.players[turn];
          later(function () {
            var again = 1 + Math.floor(api.random() * SIDES);
            api.status((p.you ? 'You spin' : p.name + ' spins') + ' again...');
            spinTee(again, function () {
              log((p.you ? 'You' : p.name) + ' spun ' + again + '.');
              resolve(again, result.bounce);
            });
          }, SAY_MS);
        });
      }

      /* Play the steps one after another: hops and jumps animate, messages wait a moment to be read. */
      function runSteps(result, done) {
        var steps = result.steps, k = 0;
        clearTargets();
        (function next() {
          if (k >= steps.length) { syncDisplay(); done(result); return; }
          var st = steps[k++];
          if (st.sound) api.sound(st.sound);
          if (st.say) { api.status(st.say); log(st.say); }
          if (st.card) { showCard(st.card, st.say); if (cellEls[st.card]) cellEls[st.card].classList.add('is-target'); }
          else if (st.say) cardSay.textContent = st.say;
          if (st.pay) { drawPlayers(); flashCoins(st.pay.who); }
          if (st.move) { moveToken(st.move, function () { later(next, 120); }); return; }
          later(next, st.quick ? 260 : st.say ? SAY_MS : 80);
        })();
      }

      function moveToken(mv, done) {
        var i = mv.who;
        if (mv.style === 'hop' && mv.to > display[i]) {
          (function hop() {
            if (display[i] >= mv.to) { done(); return; }
            placeToken(i, display[i] + 1, 'hop');
            api.sound('click');
            later(hop, STEP_MS);
          })();
          return;
        }
        if (display[i] === mv.to) { done(); return; }
        placeToken(i, mv.to, 'jump');
        api.sound('whoosh');
        later(done, JUMP_MS);
      }
      function syncDisplay() {
        state.players.forEach(function (p, i) { if (display[i] !== p.pos) placeToken(i, p.pos, 'none'); });
        drawPlayers();
      }

      function endTurn(result) {
        if (!(result && result.win)) { turn = (turn + 1) % state.players.length; startTurn(); return; }
        var p = state.players[turn];
        over = true;
        setBusy(false);
        root.setAttribute('data-over', 'true');
        mansion.classList.add('is-glowing');
        var counts = state.players.map(function (x) { return x.name + ' ' + x.counters; }).join(', ');
        if (p.computer) {
          api.status(p.name + ' reached the Mansion of Happiness first. Better luck next time! Press New game to play again.');
          api.sound('lose');
          log('Counters left: ' + counts + '.');
        } else {
          if (vsComputer()) { wins += 1; api.store.set('wins', wins); }
          var text = p.you ? 'You reached the Mansion of Happiness! You win!' : p.name + ' reaches the Mansion of Happiness and wins!';
          api.status(text + ' Press New game to play again.');
          log('Counters left: ' + counts + '.');
          api.celebrate(p.you ? 'You reached the Mansion of Happiness!' : p.name + ' wins the Mansion of Happiness!');
        }
        drawPlayers();
        setSpinState();
        if (root.contains(document.activeElement)) newBtn.focus({ preventScroll: true });
      }

      newGame();
      return { destroy: destroy };
    }
  });
})();
