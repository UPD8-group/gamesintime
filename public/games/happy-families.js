/* Happy Families for Games in Time, in the 1800 to 1879 hall.
   John Jaques junior of London devised the game and it was shown at the Great Exhibition of 1851. The original pack
   has eleven families of four (Mr, Mrs, Master and Miss), each named after the father's trade. The eleven names here
   are the original Jaques families as listed by Wikipedia and by the Pepys reissue's card list, and ten of them on
   the V&A's hand-coloured Jaques set of about 1860.

   The rules followed:
   - Deal all 44 cards among the players.
   - On your turn, ask one player for a named card from a family you already hold at least one card of.
   - If they have it, they must hand it over, and you ask again (anyone you like).
   - If not, they say it is "not at home" (the V&A's wording) and the turn passes to the player you asked.
   - A complete family is laid down at once. When every family is down, most families wins.
   Asking always says "please", as Victorian children were expected to.

   How the file is organised:
     Part 1  The families and the card pictures (inline SVG, coloured only with the site's colour variables).
     Part 2  The computer players: what they remember and how they choose whom to ask.
     Part 3  The game and the screen.
   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  /* =====================================================================
     PART 1: THE FAMILIES AND THEIR PICTURES
     A card is a number 0 to 43: family = Math.floor(card / 4), member = card % 4 (Mr, Mrs, Master, Miss).
     ===================================================================== */
  var FAMILIES = [
    { name: 'Bun', trade: 'Baker', colour: 'var(--gold)', hat: 'toque', prop: 'loaf' },
    { name: 'Grits', trade: 'Grocer', colour: 'var(--leaf)', hat: 'bowler', prop: 'scales' },
    { name: 'Bones', trade: 'Butcher', colour: 'var(--vermilion)', hat: 'boater', prop: 'sausages' },
    { name: 'Dose', trade: 'Doctor', colour: 'var(--cobalt)', hat: 'tophat', prop: 'bottle' },
    { name: 'Block', trade: 'Barber', colour: 'var(--hf-stripes)', coat: 'var(--hf-paper)', hat: 'slick', prop: 'scissors' },
    { name: 'Pots', trade: 'Painter', colour: 'var(--peacock)', hat: 'paper', prop: 'paintpot' },
    { name: 'Bung', trade: 'Brewer', colour: 'var(--gold-shadow)', hat: 'cap', prop: 'barrel' },
    { name: 'Tape', trade: 'Tailor', colour: 'var(--rose)', hat: 'specs', prop: 'tape' },
    { name: 'Chip', trade: 'Carpenter', colour: 'var(--ink-muted)', hat: 'paper', prop: 'saw' },
    { name: 'Soot', trade: 'Sweep', colour: 'var(--hf-soot)', hat: 'tophat', prop: 'brush' },
    { name: 'Dip', trade: 'Dyer', colour: 'var(--hf-purple)', hat: 'cap', prop: 'bucket' }
  ];
  var MEMBERS = ['Mr', 'Mrs', 'Master', 'Miss'];
  var CAPTIONS = ['', "'s Wife", "'s Son", "'s Daughter"];
  var PRONOUN = ['he', 'she', 'he', 'she'];
  function famOf(card) { return Math.floor(card / 4); }
  function memOf(card) { return card % 4; }
  function cardName(card) { return MEMBERS[memOf(card)] + ' ' + FAMILIES[famOf(card)].name; }
  function caption(card) { return 'the ' + FAMILIES[famOf(card)].trade + CAPTIONS[memOf(card)]; }

  /* The portrait in each card's oval, drawn on a 60 by 72 grid. Fill classes: k ink, p paper, g gold, w wood,
     o rose, b blue, t teal, h hair, c the family colour, d the coat colour. Class s adds the ink outline. */
  var HEAD = [{ x: 30, y: 31, r: 12 }, { x: 30, y: 32, r: 11 }, { x: 30, y: 34, r: 10.5 }, { x: 30, y: 34, r: 10.5 }];
  var BODY = [
    '<path class="d s" d="M5 73Q6 49 30 46Q54 49 55 73Z"/><path class="p s" d="M25 47 30 60 35 47Z"/><path class="k" d="M26 48 30 51 34 48 34 52 30 50 26 52Z"/>',
    '<path class="d s" d="M3 73Q8 50 30 47Q52 50 57 73Z"/><path class="p s" d="M13 55Q30 68 47 55L44 49Q30 60 16 49Z"/>',
    '<path class="d s" d="M10 73Q11 50 30 47Q49 50 50 73Z"/><path class="p s" d="M24 47.5 30 55 36 47.5Z"/><circle class="k" cx="30" cy="60" r="1.3"/><circle class="k" cx="30" cy="66" r="1.3"/>',
    '<path class="d s" d="M8 73Q13 50 30 47Q47 50 52 73Z"/><path class="p s" d="M23 50Q30 53 37 50L40 73H20Z"/><path class="n s" stroke-width="1.1" d="M20.6 67Q30 70.5 39.4 67"/>'
  ];
  function face(m, hat) {
    var hd = HEAD[m], x = hd.x, y = hd.y, out = '';
    out += '<circle class="p s" cx="' + x + '" cy="' + y + '" r="' + hd.r + '"/>';
    out += '<circle class="o" opacity=".55" cx="' + (x - 6.5) + '" cy="' + (y + 3.5) + '" r="2.6"/><circle class="o" opacity=".55" cx="' + (x + 6.5) + '" cy="' + (y + 3.5) + '" r="2.6"/>';
    out += '<circle class="k" cx="' + (x - 4) + '" cy="' + (y - 1) + '" r="1.4"/><circle class="k" cx="' + (x + 4) + '" cy="' + (y - 1) + '" r="1.4"/>';
    if (m === 0) {
      /* Mr: the big round nose and the moustache of a Victorian caricature */
      out += '<path class="k" d="M' + (x - 7) + ' ' + (y + 6) + 'Q' + (x - 3) + ' ' + (y + 3) + ' ' + x + ' ' + (y + 5.5) + 'Q' + (x + 3) + ' ' + (y + 3) + ' ' + (x + 7) + ' ' + (y + 6) + 'Q' + (x + 3) + ' ' + (y + 8.5) + ' ' + x + ' ' + (y + 7) + 'Q' + (x - 3) + ' ' + (y + 8.5) + ' ' + (x - 7) + ' ' + (y + 6) + 'Z"/>';
      out += '<circle class="o s" stroke-width="1" cx="' + x + '" cy="' + (y + 2.5) + '" r="3"/>';
      if (hat === 'specs') out += '<circle class="n s" stroke-width="1.2" cx="' + (x - 4) + '" cy="' + (y - 1) + '" r="3"/><circle class="n s" stroke-width="1.2" cx="' + (x + 4) + '" cy="' + (y - 1) + '" r="3"/><path class="n s" stroke-width="1.2" d="M' + (x - 1) + ' ' + (y - 1) + 'H' + (x + 1) + '"/>';
    } else {
      out += '<path class="n s" stroke-width="1.3" d="M' + (x - 3) + ' ' + (y + 5.5) + 'Q' + x + ' ' + (y + 8) + ' ' + (x + 3) + ' ' + (y + 5.5) + '"/>';
    }
    return out;
  }
  var HATS = {
    toque: '<path class="p s" d="M19 23Q14 7 23 8Q26 1 33 5Q41 1 42 9Q47 13 41 23Z"/><path class="p s" d="M19 20H41V24H19Z"/>',
    tophat: '<path class="k" d="M20 21 21.5 3H38.5L40 21Z"/><path class="c" d="M20.6 15H39.4L39.7 19H20.3Z"/><path class="n s" stroke-width="3.2" d="M14 21.5H46"/>',
    boater: '<path class="g s" d="M21 20V12H39V20Z"/><path class="c" d="M21 16H39V19H21Z"/><ellipse class="g s" cx="30" cy="21" rx="16" ry="3"/>',
    bowler: '<path class="k" d="M18 22Q18 7 30 7Q42 7 42 22Z"/><path class="n s" stroke-width="2.6" d="M14 22Q30 26 46 22"/>',
    paper: '<path class="p s" d="M16 23 30 4 44 23Z"/><path class="n s" stroke-width="1" d="M23 23 30 12 37 23"/>',
    cap: '<path class="d s" d="M17 24Q17 10 31 10Q43 11 43 21L49 24Z"/><circle class="d s" cx="31" cy="10" r="2"/>',
    slick: '<path class="k" d="M18 28Q17 16 30 15Q43 16 42 28Q37 21 31 22L30 19 28 22Q23 21 18 28Z"/>',
    specs: '<path class="h s" stroke-width="1" d="M18 32Q17 24 21 22L22 32ZM42 32Q43 24 39 22L38 32Z"/>'
  };
  var HAIR = [
    '',
    '<path class="h s" stroke-width="1" d="M18 36Q16 26 21 23L23 34ZM42 36Q44 26 39 23L37 34Z"/><path class="p s" d="M16 29Q14 15 30 14Q46 15 44 29Q38 22 30 23Q22 22 16 29Z"/><path class="n s" stroke-width="1" d="M17 27Q20 24 23 26Q26 23 30 25Q34 23 37 26Q40 24 43 27"/>',
    '<path class="h" d="M20.5 32Q20 25 26 24L34 24Q40 25 39.5 32Q34 27 30 28Q25 27 20.5 32Z"/><path class="k" d="M18.5 29Q18.5 18.5 31 18.5Q42.5 19.5 41.5 27L48 30Z"/>',
    '<path class="h s" stroke-width="1" d="M18.5 38Q15.5 23 30 22.5Q44.5 23 41.5 38Q38.5 28.5 30 28.5Q21.5 28.5 18.5 38Z"/><circle class="h s" stroke-width="1" cx="18.5" cy="40" r="3.4"/><circle class="h s" stroke-width="1" cx="41.5" cy="40" r="3.4"/><path class="c s" stroke-width="1" d="M30 23.5 21.5 18 21.5 28ZM30 23.5 38.5 18 38.5 28Z"/>'
  ];
  var PROPS = {
    loaf: '<ellipse class="w s" cx="49" cy="61" rx="9.5" ry="6"/><path class="n s" stroke-width="1.2" d="M44 57.5 46 62M48 56.5 50 61.5M52 57 54 62"/>',
    scales: '<path class="n s" stroke-width="1.6" d="M49 47V67M40 51H58M41 51 39 56M41 51 43 56M57 51 55 56M57 51 59 56"/><path class="g s" stroke-width="1.2" d="M37 56H45Q41 61 37 56ZM53 56H61Q57 61 53 56Z"/><path class="w s" stroke-width="1.2" d="M44 67H54V70H44Z"/>',
    sausages: '<circle class="o s" stroke-width="1.2" cx="41" cy="52" r="3.4"/><circle class="o s" stroke-width="1.2" cx="47" cy="56" r="3.4"/><circle class="o s" stroke-width="1.2" cx="52" cy="61" r="3.4"/><circle class="o s" stroke-width="1.2" cx="56" cy="67" r="3.4"/>',
    bottle: '<path class="b s" stroke-width="1.3" d="M46 52H52V56Q56 58 56 62V71H42V62Q42 58 46 56Z"/><path class="p" d="M44 62H54V67H44Z"/><path class="w s" stroke-width="1" d="M46.5 48H51.5V52H46.5Z"/>',
    scissors: '<path class="n s" stroke-width="2" d="M44 62 57 46M50 63 50 45"/><circle class="p s" stroke-width="1.6" cx="42" cy="65" r="3.6"/><circle class="p s" stroke-width="1.6" cx="50" cy="67" r="3.6"/>',
    paintpot: '<path class="n s" stroke-width="2" d="M49 59 56 45"/><path class="w s" stroke-width="1" d="M54.5 41.5 59 43.5 57 47.5 53 45.5Z"/><path class="t s" stroke-width="1.3" d="M41 58H57L55.5 71H42.5Z"/><path class="t" d="M44 71V74"/>',
    barrel: '<path class="w s" stroke-width="1.3" d="M42 52Q39.5 61.5 42 71H56Q58.5 61.5 56 52Z"/><path class="n s" stroke-width="1.3" d="M41.2 56H56.8M41.2 67H56.8"/>',
    tape: '<path class="g s" stroke-width="1" d="M23 47Q21 59 19 69L22.5 70Q24.5 59 26.5 48ZM37 47Q39 59 41 69L37.5 70Q35.5 59 33.5 48Z"/><path class="n s" stroke-width=".8" d="M22 52H24.6M21.4 56H24M20.8 60H23.4M20.2 64H22.8M35.4 52H38M36 56H38.6M36.6 60H39.2M37.2 64H39.8"/>',
    saw: '<path class="p s" stroke-width="1.2" d="M41 50 58 60 56 64 40 54Z"/><path class="n s" stroke-width=".9" d="M41 54 42.5 56 43.5 55.5 45 57.5 46 57 47.5 59 48.5 58.5 50 60.5 51 60 52.5 62 53.5 61.5 55 63.5"/><path class="w s" stroke-width="1.2" d="M35 46H42L41 55H36Z"/>',
    brush: '<path class="n" stroke-width="2.6" style="stroke: var(--gold-shadow)" d="M42 73 53 47"/><circle class="k" cx="54" cy="44" r="5.5"/><path class="n s" stroke-width="1.1" d="M54 36V52M46 44H62M48.5 38.5 59.5 49.5M48.5 49.5 59.5 38.5"/>',
    bucket: '<path class="n" stroke-width="2" style="stroke: var(--gold-shadow)" d="M49 58 55 44"/><path class="c s" stroke-width="1.3" d="M41 57H57L55 71H43Z"/><path class="n s" stroke-width="1" d="M41 57Q49 50 57 57"/><path class="c" d="M45 71Q44 74 45.5 74.5Q47 74 45 71Z"/>'
  };
  function portrait(card) {
    var f = FAMILIES[famOf(card)], m = memOf(card), prop = PROPS[f.prop];
    var out = '<rect class="c" opacity=".2" x="0" y="0" width="60" height="72"/>';
    out += BODY[m];
    if (m === 0 || m === 2) out += f.prop === 'tape' && m === 0 ? prop : '';
    out += face(m, f.hat);
    if (m === 0) out += HATS[f.hat] || '';
    else out += HAIR[m];
    if (f.prop !== 'tape' || m !== 0) {
      /* the children hold a smaller copy of the family's trade tool */
      out += m < 2 ? prop : '<g transform="translate(12 15) scale(.8)">' + prop + '</g>';
    }
    return out;
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgFrom(markup, viewBox, cls) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', viewBox); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    if (cls) s.setAttribute('class', cls);
    s.innerHTML = markup;   /* constant markup written in this file, never user input */
    return s;
  }

  /* The players: you and up to three Victorian cousins, with little portraits. */
  var NAMES = ['Ada', 'Albert', 'Edith'];
  var AVATARS = {
    Ada: '<circle class="o" cx="20" cy="20" r="19"/><path class="h" d="M8 22Q8 6 20 6Q32 6 32 22L30 32H10Z"/><circle class="p" cx="20" cy="20" r="8.5"/><path class="h" d="M11 17Q14 9 20 9Q27 9 29 17Q22 13 11 17Z"/><path class="r" d="M24 8 30 4 31 11ZM24 8 18 4 19 11Z"/><circle class="k" cx="17" cy="20" r="1.2"/><circle class="k" cx="23" cy="20" r="1.2"/><path class="n s" stroke-width="1.3" d="M17 24Q20 26.5 23 24"/><path class="b" d="M9 39Q10 30 20 30Q30 30 31 39Z"/>',
    Albert: '<circle class="t" cx="20" cy="20" r="19"/><circle class="p" cx="20" cy="21" r="8.5"/><path class="k" d="M10 18Q11 8 21 8Q30 8 31 15L35 17Q28 18 10 18Z"/><circle class="k" cx="17" cy="21" r="1.2"/><circle class="k" cx="23" cy="21" r="1.2"/><path class="n s" stroke-width="1.3" d="M17 25Q20 27.5 23 25"/><path class="r" d="M9 39Q10 31 20 31Q30 31 31 39Z"/><path class="p" d="M18 31H22L20 35Z"/>',
    Edith: '<circle class="l" cx="20" cy="20" r="19"/><path class="g" d="M7 25Q5 6 20 5Q35 6 33 25Q28 15 20 15Q12 15 7 25Z"/><circle class="p" cx="20" cy="22" r="8"/><circle class="k" cx="17" cy="22" r="1.2"/><circle class="k" cx="23" cy="22" r="1.2"/><path class="n s" stroke-width="1.3" d="M17 26Q20 28.5 23 26"/><path class="o" d="M13 29 20 32 27 29 25 33 20 34 15 33Z"/><path class="o" d="M9 39Q10 32 20 32Q30 32 31 39Z"/>',
    You: '<circle class="g" cx="20" cy="20" r="19"/><circle class="p" cx="20" cy="17" r="8"/><path class="p" d="M7 36Q8 27 20 27Q32 27 33 36Z"/>'
  };

  /* =====================================================================
     PART 2: THE COMPUTER PLAYERS
     Everyone hears every question, so a sharp player can remember:
       - who asked for which card (they must hold someone from that family, and not that card),
       - who said "not at home" (they do not have that card),
       - which cards changed hands (now we know exactly who has them).
     Each computer keeps its own memory of what was said. How much it keeps depends on the level:
       Easy:   remembers about half of what it hears, only for the last few questions, and sometimes just guesses.
       Medium: remembers most things for a good while.
       Hard:   remembers everything, all game.
     When it is a computer's turn it looks at every card it could ask for. A card it knows the place of is a
     certain catch. Otherwise it works out the best chance: players with more cards are more likely to have it,
     players who have asked about that family are much more likely, and players who said "not at home" are ruled
     out. It prefers families it nearly has, so it can lay them down.
     ===================================================================== */
  var LEVELS = {
    easy: { label: 'Easy', span: 6, recall: 0.5, guess: 0.35 },
    medium: { label: 'Medium', span: 16, recall: 0.85, guess: 0.08 },
    hard: { label: 'Hard', span: 100000, recall: 1, guess: 0 }
  };

  /* What computer `pi` remembers, built from the questions it heard (and kept). */
  function memoryOf(pi, log, level) {
    var L = LEVELS[level], k = { holder: {}, notHas: {}, hasFam: {} };
    var n = log.length;
    log.forEach(function (e, idx) {
      if (n - idx > L.span || !e.heard[pi]) return;
      var c = e.card, f = famOf(c);
      (k.hasFam[e.asker] = k.hasFam[e.asker] || {})[f] = true;
      if (e.got) { k.holder[c] = e.asker; k.notHas[c] = {}; if (e.lastCardOf) delete (k.hasFam[e.target] || {})[f]; }
      else {
        (k.notHas[c] = k.notHas[c] || {})[e.target] = true;
        k.notHas[c][e.asker] = true;
        if (k.holder[c] === e.target || k.holder[c] === e.asker) delete k.holder[c];
      }
    });
    return k;
  }
  /* Choose a question: {card, target}. */
  function chooseAsk(pi, players, log, level, rnd) {
    var me = players[pi], k = memoryOf(pi, log, level), L = LEVELS[level];
    var others = [];
    players.forEach(function (p, i) { if (i !== pi && p.hand.length) others.push(i); });
    if (!others.length || !me.hand.length) return null;
    var options = [], seen = {};
    me.hand.forEach(function (c) {
      var f = famOf(c);
      if (seen[f]) return;
      seen[f] = true;
      var held = me.hand.filter(function (x) { return famOf(x) === f; }).length;
      for (var m = 0; m < 4; m++) {
        var want = f * 4 + m;
        if (me.hand.indexOf(want) >= 0) continue;
        var known = k.holder[want];
        if (known !== undefined && known !== pi && others.indexOf(known) >= 0) { options.push({ card: want, target: known, chance: 1, held: held }); continue; }
        var cands = others.filter(function (o) { return !(k.notHas[want] && k.notHas[want][o]); });
        if (!cands.length) cands = others.slice();
        var weights = cands.map(function (o) { return players[o].hand.length * (k.hasFam[o] && k.hasFam[o][f] ? 3 : 1); });
        var sum = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
        cands.forEach(function (o, j) { options.push({ card: want, target: o, chance: weights[j] / sum, held: held }); });
      }
    });
    if (!options.length) return null;
    if (rnd() < L.guess) return options[Math.floor(rnd() * options.length)];
    var best = null, bestScore = -1;
    options.forEach(function (o) {
      var score = o.chance * (1 + 0.3 * o.held) + rnd() * 0.02;
      if (score > bestScore) { bestScore = score; best = o; }
    });
    return best;
  }

  /* =====================================================================
     PART 3: THE GAME AND THE SCREEN
     ===================================================================== */
  var CSS = [
    '.game-happy-families { --hf-paper: var(--ink); --hf-ink: var(--bg); --hf-soot: var(--bg); --hf-purple: var(--brand-2); --hf-shadow: transparent;',
    '  --hf-stripes: repeating-linear-gradient(135deg, var(--vermilion) 0 5px, var(--ink) 5px 10px); }',
    '@supports (color: color-mix(in srgb, red, blue)) { .game-happy-families { --hf-purple: color-mix(in srgb, var(--rose) 50%, var(--cobalt)); --hf-shadow: color-mix(in srgb, var(--bg) 55%, transparent); } }',
    '.game-happy-families svg { stroke-width: 1.6; stroke-linejoin: round; stroke-linecap: round; }',
    '.game-happy-families svg .s { stroke: var(--hf-ink); } .game-happy-families svg .n { fill: none; }',
    '.game-happy-families svg .k { fill: var(--hf-ink); } .game-happy-families svg .p { fill: var(--hf-paper); } .game-happy-families svg .g { fill: var(--gold); }',
    '.game-happy-families svg .w { fill: var(--gold-shadow); } .game-happy-families svg .o { fill: var(--rose); } .game-happy-families svg .b { fill: var(--cobalt); }',
    '.game-happy-families svg .t { fill: var(--peacock); } .game-happy-families svg .r { fill: var(--vermilion); } .game-happy-families svg .l { fill: var(--leaf); }',
    '.game-happy-families svg .h { fill: var(--gold-shadow); } .game-happy-families svg .c { fill: var(--hf-fill); } .game-happy-families svg .d { fill: var(--hf-coat, var(--hf-fill)); }',
    /* toolbar; on phones the settings fold away behind an Options button */
    '.game-happy-families .game-toolbar { justify-content: center; }',
    '.game-happy-families .hf-opts { display: flex; flex-wrap: wrap; justify-content: center; gap: .6rem .8rem; }',
    '.game-happy-families .hf-optbtn { display: none; }',
    '@media (max-width: 700px) { .game-happy-families .hf-optbtn { display: inline-flex; } .game-happy-families .hf-opts { display: none; flex-basis: 100%; } .game-happy-families .hf-opts.is-open { display: flex; } }',
    /* a card */
    '.game-happy-families .hf-card { --w: 90px; position: relative; flex: none; width: var(--w); height: calc(var(--w) * 1.42); background: var(--hf-paper); color: var(--hf-ink); border-radius: calc(var(--w) * .075); overflow: hidden; display: flex; flex-direction: column; align-items: center; padding: calc(var(--w) * .1) calc(var(--w) * .08) calc(var(--w) * .05);',
    '  box-shadow: inset 0 0 0 1.5px var(--hf-ink), inset 0 0 0 calc(var(--w) * .04) var(--hf-paper), inset 0 0 0 calc(var(--w) * .05) var(--gold-shadow), 0 2px 5px var(--hf-shadow); }',
    '.game-happy-families .hf-band { position: absolute; left: 0; right: 0; top: 0; height: calc(var(--w) * .075); background: var(--hf-c); border-bottom: 1px solid var(--hf-ink); }',
    '.game-happy-families .hf-title { font: 400 calc(var(--w) * .135)/1.05 var(--font-poster); white-space: nowrap; margin-top: calc(var(--w) * .02); }',
    '.game-happy-families .hf-oval { width: 86%; flex: 1 1 auto; min-height: 0; margin: 4% 0 3%; border-radius: 50%; overflow: hidden; background: var(--hf-paper); box-shadow: 0 0 0 max(1.5px, calc(var(--w) * .022)) var(--hf-ink), 0 0 0 max(3px, calc(var(--w) * .045)) var(--gold); }',
    '.game-happy-families .hf-oval svg { display: block; width: 100%; height: 100%; }',
    '.game-happy-families .hf-cap { font: italic 600 calc(var(--w) * .082)/1.1 var(--font-body); white-space: nowrap; }',
    '.game-happy-families .hf-card.is-mini { padding: calc(var(--w) * .12) calc(var(--w) * .07) calc(var(--w) * .07); }',
    '.game-happy-families .hf-card.is-mini .hf-title, .game-happy-families .hf-card.is-mini .hf-cap { display: none; }',
    '.game-happy-families .hf-card.is-mini .hf-oval { margin: 0; }',
    '.game-happy-families .hf-back { position: relative; width: var(--w); height: calc(var(--w) * 1.42); border-radius: calc(var(--w) * .075); background-color: var(--brand); border: 2px solid var(--hf-paper);',
    '  background-image: radial-gradient(circle at 50% 50%, var(--gold) 0 18%, transparent 20%), repeating-linear-gradient(45deg, transparent 0 4px, var(--gold-shadow) 4px 5px), repeating-linear-gradient(-45deg, transparent 0 4px, var(--gold-shadow) 4px 5px); box-shadow: inset 0 0 0 1.5px var(--gold), 0 1px 3px var(--hf-shadow); }',
    /* the cousins round the table */
    '.game-happy-families .hf-seats { display: grid; grid-template-columns: repeat(var(--n, 2), minmax(0, 1fr)); gap: clamp(6px, 1.5vw, 16px); }',
    '.game-happy-families .hf-seat { position: relative; display: grid; justify-items: center; align-content: start; gap: 3px; padding: 8px 4px; border-radius: 16px; border: 2px solid transparent; transition: border-color .2s, background-color .2s, transform .2s; min-width: 0; text-align: center; }',
    '.game-happy-families .hf-seat.is-turn { border-color: var(--gold); background: var(--surface); }',
    '.game-happy-families .hf-seat.is-asked { border-color: var(--rose); background: var(--surface); }',
    '.game-happy-families .hf-avatar { width: clamp(38px, 7vw, 68px); height: clamp(38px, 7vw, 68px); }',
    '.game-happy-families .hf-sname { font: 800 clamp(.95rem, .85rem + .4vw, 1.15rem)/1.1 var(--font-head); }',
    '.game-happy-families .hf-scount { font-size: .85rem; color: var(--ink-muted); white-space: nowrap; }',
    '.game-happy-families .hf-fan { position: relative; height: calc(var(--fw) * 1.6); width: calc(var(--fw) * 3.2); --fw: clamp(20px, 3vw, 30px); }',
    '.game-happy-families .hf-fan .hf-back { --w: var(--fw) !important; position: absolute; left: 50%; bottom: 0; transform-origin: 50% 100%; }',
    '.game-happy-families .hf-plaques { display: flex; flex-wrap: wrap; justify-content: center; gap: 3px; min-height: 16px; }',
    '.game-happy-families .hf-plaque { display: inline-block; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 4px; background: var(--hf-c); box-shadow: inset 0 0 0 1.5px var(--hf-ink); font: 800 .62rem/16px var(--font-head); color: var(--hf-ink); }',
    '.game-happy-families .hf-plaque.is-dark { color: var(--hf-paper); }',
    /* the speech area */
    '.game-happy-families .hf-talk:focus { outline: none; }',
    '.game-happy-families .hf-talk, .game-happy-families .hf-step { scroll-margin-top: 96px; scroll-margin-bottom: 16px; }',
    '.game-happy-families .hf-talk { position: relative; margin: clamp(8px, 2vw, 16px) 0; padding: 10px; border-radius: 18px; background: var(--surface); display: grid; gap: 8px; min-height: 118px; align-content: start; }',
    '.game-happy-families .hf-line { display: flex; align-items: flex-end; gap: 8px; min-height: 0; }',
    '.game-happy-families .hf-line.is-reply { flex-direction: row-reverse; }',
    '.game-happy-families .hf-line .hf-avatar { width: 32px; height: 32px; flex: none; }',
    '.game-happy-families .hf-bubble { position: relative; max-width: 78%; background: var(--hf-paper); color: var(--hf-ink); border-radius: 16px; padding: 8px 12px; font: 700 clamp(.95rem, .9rem + .3vw, 1.12rem)/1.3 var(--font-head); box-shadow: 0 2px 6px var(--hf-shadow); }',
    '.game-happy-families .hf-bubble b { font-family: var(--font-poster); font-weight: 400; font-size: 1.08em; }',
    '.game-happy-families .hf-line:not(.is-reply) .hf-bubble { border-bottom-left-radius: 4px; }',
    '.game-happy-families .hf-line.is-reply .hf-bubble { border-bottom-right-radius: 4px; background: var(--gold); }',
    '.game-happy-families .hf-line.is-no .hf-bubble { background: var(--ink-muted); }',
    '.game-happy-families .hf-line.is-pop .hf-bubble { animation: game-happy-families-pop .28s cubic-bezier(.3,1.5,.5,1); }',
    '@keyframes game-happy-families-pop { from { transform: scale(.6); opacity: 0; } }',
    '.game-happy-families .hf-line[hidden] { display: none; }',
    '.game-happy-families .hf-wanted { flex: none; margin-left: auto; }',
    '.game-happy-families .hf-wanted .hf-card { --w: 46px; transform: rotate(4deg); }',
    '.game-happy-families .hf-wanted.is-no { opacity: .45; }',
    '.game-happy-families .hf-log { list-style: none; margin: 0; padding: 0; font-size: .85rem; color: var(--ink-muted); display: grid; gap: 2px; }',
    '.game-happy-families .hf-log li { margin: 0; }',
    '.game-happy-families .hf-log li::before { content: "\\2022  "; color: var(--gold); }',
    /* your cards */
    '.game-happy-families .hf-mine { display: grid; gap: 8px; }',
    '.game-happy-families .hf-mine-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; }',
    '.game-happy-families .hf-mine-head h3 { font: 400 clamp(1.15rem, 1rem + .6vw, 1.45rem)/1.1 var(--font-poster); margin: 0; }',
    '.game-happy-families .hf-shelf { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-weight: 700; color: var(--ink-muted); font-size: .92rem; }',
    '.game-happy-families .hf-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 134px), 1fr)); gap: 8px; }',
    '@media (min-width: 1000px) { .game-happy-families .hf-tiles { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); } .game-happy-families .hf-sname { font-size: 1.3rem; } .game-happy-families .hf-plaque { height: 20px; font-size: .74rem; line-height: 20px; padding: 0 6px; } }',
    '.game-happy-families .hf-tile { display: flex; align-items: center; gap: 8px; min-height: 66px; padding: 6px 8px 6px 6px; border-radius: 14px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); text-align: left; font: inherit; transition: border-color .15s, transform .15s; }',
    '.game-happy-families .hf-tile:not(:disabled):hover { border-color: var(--gold); transform: translateY(-2px); }',
    '.game-happy-families .hf-tile[aria-pressed="true"] { border-color: var(--gold); background: var(--surface); box-shadow: 0 0 0 2px var(--gold); }',
    '.game-happy-families .hf-tile:disabled { cursor: default; }',
    '.game-happy-families .hf-tile.is-new { animation: game-happy-families-glow .9s ease; }',
    '@keyframes game-happy-families-glow { 30% { box-shadow: 0 0 0 4px var(--gold); transform: scale(1.05); } }',
    '.game-happy-families .hf-minifan { --mini: clamp(35px, 3.2vw, 46px); position: relative; height: calc(var(--mini) * 1.42); flex: none; }',
    '.game-happy-families .hf-minifan .hf-card { --w: var(--mini); position: absolute; top: 0; }',
    '.game-happy-families .hf-tname { display: grid; line-height: 1.1; min-width: 0; }',
    '.game-happy-families .hf-tname b { font: 400 1.15rem/1.05 var(--font-poster); }',
    '.game-happy-families .hf-tname span { font-size: .8rem; color: var(--ink-muted); }',
    '.game-happy-families .hf-dots { display: flex; gap: 3px; margin-top: 3px; }',
    '.game-happy-families .hf-dots i { width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid var(--ink-muted); }',
    '.game-happy-families .hf-dots i.on { background: var(--gold); border-color: var(--gold); }',
    '.game-happy-families .hf-empty { grid-column: 1 / -1; color: var(--ink-muted); font-weight: 600; padding: 8px 0; margin: 0; }',
    /* the asking steps */
    '.game-happy-families .hf-step { margin-top: 10px; padding: 10px; border-radius: 16px; background: var(--surface); }',
    '.game-happy-families .hf-step[hidden] { display: none; }',
    '.game-happy-families .hf-step h4 { margin: 0 0 8px; font: 700 1rem/1.25 var(--font-head); }',
    '.game-happy-families .hf-members { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }',
    '.game-happy-families .hf-member { display: grid; justify-items: center; gap: 4px; padding: 6px 2px; border-radius: 12px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); font: 700 .9rem/1.1 var(--font-head); min-width: 0; }',
    '.game-happy-families .hf-member .hf-card { --w: var(--mw, 64px); }',
    '.game-happy-families .hf-member:not(:disabled):hover, .game-happy-families .hf-member[aria-pressed="true"] { border-color: var(--gold); }',
    '.game-happy-families .hf-member[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--gold); background: var(--surface); }',
    '.game-happy-families .hf-member:disabled { opacity: .78; cursor: default; border-style: dashed; }',
    '.game-happy-families .hf-member .hf-have { font-size: .72rem; color: var(--gold); font-weight: 800; }',
    '.game-happy-families .hf-players { display: flex; flex-wrap: wrap; gap: 8px; }',
    '.game-happy-families .hf-pbtn { display: inline-flex; align-items: center; gap: 8px; min-height: 48px; padding: 6px 14px 6px 6px; border-radius: 999px; border: 2px solid var(--gold); background: var(--surface-2); color: var(--ink); font: 800 1rem/1.1 var(--font-head); }',
    '.game-happy-families .hf-pbtn:not(:disabled):hover { background: var(--gold); color: var(--on-era); }',
    '.game-happy-families .hf-pbtn .hf-avatar { width: 34px; height: 34px; }',
    '.game-happy-families .hf-pbtn small { font-weight: 600; color: inherit; opacity: .8; }',
    '.game-happy-families .hf-pbtn:disabled { opacity: .5; border-color: var(--line); }',
    /* flying cards and the family fan */
    '.game-happy-families .hf-fx { position: absolute; inset: 0; pointer-events: none; z-index: 50; overflow: visible; }',
    '.game-happy-families .hf-fly { position: absolute; left: 0; top: 0; }',
    '.game-happy-families .scoreboard { justify-content: center; }',
    '.game-happy-families .scoreboard b { font-family: var(--font-poster); font-weight: 400; color: var(--gold); font-size: 1.2em; }',
    '@media (max-width: 359px) { .game-happy-families .hf-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } .game-happy-families .hf-tile { flex-direction: column; text-align: center; padding: 6px 4px; } .game-happy-families .hf-tname { justify-items: center; } }',
    '@media (max-width: 520px) { .game-happy-families .game-toolbar { gap: .45rem; margin-bottom: .5rem; } .game-happy-families .seg button { padding: .35rem .7rem; } .game-happy-families .hf-talk { padding: 8px; } .game-happy-families .hf-bubble { max-width: 84%; } .game-happy-families .scoreboard { font-size: .9rem; gap: .2rem .8rem; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'happy-families',
    frame: 'baize',
    mount: function (root, api) {
      var h = api.h;
      var reduced = !!api.reducedMotion;
      var rnd = api.random;

      /* ---- settings, remembered ---- */
      var opponents = api.store.get('opponents', 2) === 3 ? 3 : 2;
      var level = LEVELS[api.store.get('level', 'medium')] ? api.store.get('level', 'medium') : 'medium';
      var record = api.store.get('wins', 0) || 0;

      /* ---- state ---- */
      var players = [];      /* {name, human, hand: [cards], families: [family numbers], el} */
      var turn = 0, over = false, busy = false, dealing = false;
      var log = [];          /* every question asked: {asker, target, card, got, heard: {computer: kept it?}} */
      var notes = [];        /* the short table-talk list shown under the speech */
      var pick = { family: -1, card: -1 };
      var timers = [];

      function later(ms, fn) { var id = setTimeout(function () { timers = timers.filter(function (t) { return t !== id; }); fn(); }, ms); timers.push(id); return id; }
      function clearAll() { timers.forEach(clearTimeout); timers = []; }
      function wait(min, max) { return reduced ? 0 : Math.round(min + rnd() * (max - min)); }

      root.appendChild(h('style', null, CSS));

      /* ---- toolbar ---- */
      function segButton(text, onclick) { return h('button', { type: 'button', 'aria-pressed': 'false', onclick: onclick }, text); }
      var opp2 = segButton('2 cousins', function () { setOpponents(2); });
      var opp3 = segButton('3 cousins', function () { setOpponents(3); });
      var lvlBtns = {};
      Object.keys(LEVELS).forEach(function (k) { lvlBtns[k] = segButton(LEVELS[k].label, function () { setLevel(k); }); });
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(); } }, 'New game');
      var opts = h('div', { class: 'hf-opts', id: 'hf-opts' },
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Computer players' }, opp2, opp3),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'How well the computer remembers' }, lvlBtns.easy, lvlBtns.medium, lvlBtns.hard));
      var optBtn = h('button', { class: 'btn hf-optbtn', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'hf-opts', onclick: function () {
        var open = !opts.classList.contains('is-open');
        opts.classList.toggle('is-open', open);
        optBtn.setAttribute('aria-expanded', String(open));
        api.sound('click');
      } }, 'Options');
      var toolbar = h('div', { class: 'game-toolbar' }, newBtn, optBtn, opts);
      var scoreboard = h('div', { class: 'scoreboard', role: 'group', 'aria-label': 'Families laid down' });

      /* ---- the table ---- */
      var tableEl = h('div', { class: 'hf-table' });
      var seatsEl = h('div', { class: 'hf-seats' });
      var askLine = h('div', { class: 'hf-line', hidden: true });
      var replyLine = h('div', { class: 'hf-line is-reply', hidden: true });
      var logEl = h('ul', { class: 'hf-log', 'aria-label': 'What has been asked' });
      var talk = h('div', { class: 'hf-talk', tabindex: '-1', 'aria-live': 'off' }, askLine, replyLine, logEl);
      var shelf = h('div', { class: 'hf-shelf' });
      var tiles = h('div', { class: 'hf-tiles', role: 'group', 'aria-label': 'Your cards, by family. Pick a family to ask for.' });
      var stepMember = h('div', { class: 'hf-step', hidden: true });
      var stepPlayer = h('div', { class: 'hf-step', hidden: true });
      var mine = h('div', { class: 'hf-mine' },
        h('div', { class: 'hf-mine-head' }, h('h3', null, 'Your cards'), shelf),
        tiles, stepMember, stepPlayer);
      var fx = h('div', { class: 'hf-fx', 'aria-hidden': 'true' });
      tableEl.appendChild(seatsEl);
      tableEl.appendChild(talk);
      tableEl.appendChild(mine);
      root.appendChild(toolbar);
      root.appendChild(scoreboard);
      root.appendChild(tableEl);
      root.appendChild(h('p', { class: 'game-note' }, 'Pick one of your families, then the card you want, then who to ask. Listen to what the others ask for: it tells you who holds which family. Keyboard: Tab to a button and press Enter; Escape goes back a step.'));
      root.appendChild(fx);

      /* ---- cards ---- */
      function famStyle(f) { var F = FAMILIES[f]; return { '--hf-c': F.colour, '--hf-fill': F.colour.indexOf('stripes') >= 0 ? 'var(--vermilion)' : F.colour, '--hf-coat': F.coat || F.colour.replace('var(--hf-stripes)', 'var(--vermilion)') }; }
      function makeCard(card, kind) {
        var f = famOf(card);
        var el = h('div', { class: 'hf-card' + (kind === 'mini' ? ' is-mini' : ''), 'data-card': String(card), style: famStyle(f) },
          h('div', { class: 'hf-band' }),
          h('div', { class: 'hf-title' }, kind === 'member' ? MEMBERS[memOf(card)] : cardName(card)),
          h('div', { class: 'hf-oval' }, svgFrom(portrait(card), '0 0 60 72')),
          kind === 'member' ? null : h('div', { class: 'hf-cap' }, caption(card)));
        return el;
      }
      function makeBack(w) { return h('div', { class: 'hf-back', style: { '--w': w + 'px' } }); }
      function avatar(name, cls) { return svgFrom(AVATARS[name] || AVATARS.You, '0 0 40 40', 'hf-avatar' + (cls ? ' ' + cls : '')); }
      function nameOf(i) { return players[i].human ? 'You' : players[i].name; }

      /* ---- seats ---- */
      function buildSeats() {
        seatsEl.replaceChildren();
        seatsEl.style.setProperty('--n', String(players.length - 1));
        players.forEach(function (p, i) {
          if (p.human) return;
          var count = h('div', { class: 'hf-scount' }, '');
          var fan = h('div', { class: 'hf-fan' });
          var plaques = h('div', { class: 'hf-plaques' });
          var seat = h('div', { class: 'hf-seat', 'data-player': String(i) }, avatar(p.name), h('div', { class: 'hf-sname' }, p.name), fan, count, plaques);
          p.el = { seat: seat, count: count, fan: fan, plaques: plaques };
          seatsEl.appendChild(seat);
        });
        players[0].el = { seat: mine };
      }
      function plaque(f) {
        var F = FAMILIES[f];
        return h('span', { class: 'hf-plaque' + (f === 9 || f === 10 ? ' is-dark' : ''), title: 'The ' + F.name + ' family', style: { '--hf-c': F.colour } }, F.name);
      }
      function drawSeats() {
        players.forEach(function (p, i) {
          if (p.human) return;
          var e = p.el;
          var n = p.hand.length;
          e.count.textContent = n === 1 ? '1 card' : n + ' cards';
          e.seat.setAttribute('data-cards', String(n));
          e.seat.setAttribute('data-families', String(p.families.length));
          e.seat.classList.toggle('is-turn', !over && turn === i);
          e.fan.replaceChildren();
          var show = Math.min(n, 7);
          for (var k = 0; k < show; k++) {
            var b = makeBack(21);
            var a = show > 1 ? -30 + 60 * k / (show - 1) : 0;
            b.style.transform = 'translateX(-50%) rotate(' + a + 'deg)';
            e.fan.appendChild(b);
          }
          e.plaques.replaceChildren.apply(e.plaques, p.families.map(plaque));
        });
      }
      function drawScore() {
        scoreboard.replaceChildren();
        players.forEach(function (p) { scoreboard.appendChild(h('span', null, (p.human ? 'You' : p.name) + ' ', h('b', null, String(p.families.length)))); });
        scoreboard.insertBefore(h('span', null, 'Families:'), scoreboard.firstChild);
        tableEl.setAttribute('data-turn', over ? 'over' : String(turn));
        tableEl.setAttribute('data-busy', busy ? 'yes' : 'no');
      }

      /* ---- your cards, grouped by family; each group is a button that starts a question ---- */
      function familiesHeld(p) {
        var fams = [];
        p.hand.forEach(function (c) { if (fams.indexOf(famOf(c)) < 0) fams.push(famOf(c)); });
        return fams.sort(function (a, b) { return a - b; });
      }
      function canAsk() { return !over && !busy && turn === 0 && players[0].hand.length > 0; }
      function drawMine(newCards) {
        var me = players[0];
        tiles.replaceChildren();
        var fams = familiesHeld(me);
        fams.forEach(function (f) {
          var held = me.hand.filter(function (c) { return famOf(c) === f; }).sort(function (a, b) { return a - b; });
          var fan = h('div', { class: 'hf-minifan', style: { width: 'calc(var(--mini) * ' + (1 + 0.37 * (held.length - 1)).toFixed(2) + ')' } });
          held.forEach(function (c, i) { var cEl = makeCard(c, 'mini'); cEl.style.left = 'calc(var(--mini) * ' + (0.37 * i).toFixed(2) + ')'; fan.appendChild(cEl); });
          var dots = h('span', { class: 'hf-dots', 'aria-hidden': 'true' });
          for (var m = 0; m < 4; m++) dots.appendChild(h('i', { class: held.some(function (c) { return memOf(c) === m; }) ? 'on' : '' }));
          var F = FAMILIES[f];
          var tile = h('button', { class: 'hf-tile', type: 'button', 'data-family': String(f), 'aria-pressed': String(pick.family === f),
            'aria-label': 'The ' + F.name + ' family: you have ' + held.map(cardName).join(', ') + '.', onclick: function () { chooseFamily(f); } },
            fan, h('span', { class: 'hf-tname' }, h('b', null, F.name), h('span', null, 'the ' + F.trade), dots));
          tile.disabled = !canAsk();
          if (newCards && held.some(function (c) { return newCards.indexOf(c) >= 0; }) && !reduced) tile.classList.add('is-new');
          tiles.appendChild(tile);
        });
        if (!fams.length) tiles.appendChild(h('p', { class: 'hf-empty' }, dealing ? 'Dealing the cards...' : over ? 'All the families are home.' : 'You have no cards left. Watch your cousins finish.'));
        shelf.replaceChildren(h('span', null, me.families.length ? 'Your families:' : 'No families yet'));
        me.families.forEach(function (f) { shelf.appendChild(plaque(f)); });
        mine.setAttribute('data-cards', String(me.hand.length));
        mine.setAttribute('data-families', String(me.families.length));
      }
      function drawAll(newCards) { drawSeats(); drawMine(newCards); drawScore(); drawSteps(); }

      /* ---- the three steps of a question: family, card, cousin ---- */
      function chooseFamily(f) {
        if (!canAsk()) return;
        pick = { family: f, card: -1 };
        api.sound('click');
        drawMine();
        drawSteps();
        var first = stepMember.querySelector('button:not(:disabled)');
        if (first) first.focus({ preventScroll: true });
        stepMember.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
        api.status('Your turn: who in the ' + FAMILIES[f].name + ' family do you want?');
      }
      function chooseCard(c) {
        if (!canAsk()) return;
        pick.card = c;
        api.sound('click');
        drawSteps();
        var first = stepPlayer.querySelector('button:not(:disabled)');
        if (first) first.focus({ preventScroll: true });
        stepPlayer.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
        api.status('Your turn: who will you ask for ' + cardName(c) + '?');
      }
      function drawSteps() {
        var me = players[0];
        var show = canAsk() && pick.family >= 0 && me.hand.some(function (c) { return famOf(c) === pick.family; });
        stepMember.hidden = !show;
        stepPlayer.hidden = !show || pick.card < 0;
        if (!show) { stepMember.replaceChildren(); stepPlayer.replaceChildren(); return; }
        var F = FAMILIES[pick.family];
        var row = h('div', { class: 'hf-members', role: 'group', 'aria-label': 'The ' + F.name + ' family' });
        for (var m = 0; m < 4; m++) {
          (function (card) {
            var have = me.hand.indexOf(card) >= 0;
            var b = h('button', { class: 'hf-member', type: 'button', 'data-card': String(card), 'aria-pressed': String(pick.card === card),
              'aria-label': cardName(card) + (have ? ', you have ' + (PRONOUN[memOf(card)] === 'he' ? 'him' : 'her') : ''), onclick: function () { chooseCard(card); } },
              makeCard(card, 'member'), h('span', null, MEMBERS[memOf(card)]), have ? h('span', { class: 'hf-have' }, 'You have') : null);
            b.disabled = have;
            row.appendChild(b);
          })(pick.family * 4 + m);
        }
        stepMember.replaceChildren(h('h4', null, 'Which ' + F.name + ' do you want?'), row);
        if (pick.card >= 0) {
          var prow = h('div', { class: 'hf-players', role: 'group', 'aria-label': 'Ask a cousin' });
          players.forEach(function (p, i) {
            if (p.human) return;
            var b = h('button', { class: 'hf-pbtn', type: 'button', 'data-player': String(i), onclick: function () { humanAsk(i); } },
              avatar(p.name), h('span', null, p.name, h('br'), h('small', null, p.hand.length === 1 ? '1 card' : p.hand.length + ' cards')));
            b.disabled = !p.hand.length;
            prow.appendChild(b);
          });
          stepPlayer.replaceChildren(h('h4', null, 'Ask who for ' + cardName(pick.card) + '?'), prow);
        }
      }
      function humanAsk(target) {
        if (!canAsk() || pick.card < 0 || !players[target].hand.length) return;
        var card = pick.card;
        pick = { family: -1, card: -1 };
        if (root.contains(document.activeElement)) talk.focus({ preventScroll: true });
        ask(0, target, card);
        talk.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
      }

      /* ---- speech ---- */
      function speak(line, who, html, cls) {
        line.hidden = false;
        line.className = 'hf-line' + (line === replyLine ? ' is-reply' : '') + (cls ? ' ' + cls : '') + (reduced ? '' : ' is-pop');
        var bubble = h('div', { class: 'hf-bubble' });
        html.forEach(function (part) { bubble.appendChild(typeof part === 'string' ? document.createTextNode(part) : part); });
        line.replaceChildren(avatar(who), bubble);
        return bubble;
      }
      function note(text) {
        notes.unshift(text);
        notes = notes.slice(0, reduced ? 6 : 3);
        logEl.replaceChildren.apply(logEl, notes.map(function (t) { return h('li', null, t); }));
      }
      function nm(card) { return h('b', null, cardName(card)); }

      /* ---- flying cards ---- */
      function rectIn(el) {
        var r = el.getBoundingClientRect(), base = root.getBoundingClientRect();
        return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
      }
      function anchorOf(i) { return i === 0 ? tiles : players[i].el.fan; }
      function fly(el, from, to, ms, delay, endScale) {
        if (reduced || !el.animate) return null;
        fx.appendChild(el);
        el.classList.add('hf-fly');
        var a = rectIn(from), b = rectIn(to);
        var w = el.offsetWidth || 50, hh = el.offsetHeight || 70;
        var x0 = a.x + a.w / 2 - w / 2, y0 = a.y + a.h / 2 - hh / 2, x1 = b.x + b.w / 2 - w / 2, y1 = b.y + b.h / 2 - hh / 2;
        var anim = el.animate([
          { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.8) rotate(-8deg)', opacity: 0.4 },
          { transform: 'translate(' + ((x0 + x1) / 2) + 'px,' + (Math.min(y0, y1) - 40) + 'px) scale(1.1) rotate(4deg)', opacity: 1, offset: 0.5 },
          { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(' + (endScale || 0.6) + ') rotate(0deg)', opacity: 0.9 }],
          { duration: ms, delay: delay || 0, easing: 'cubic-bezier(.3,.6,.3,1)', fill: 'both' });
        anim.onfinish = function () { el.remove(); };
        return anim;
      }

      /* ---- a question and its answer ---- */
      function ask(a, b, card) {
        busy = true;
        var asker = players[a], target = players[b];
        var who = asker.human ? 'You' : asker.name;
        var said = target.human ? ['Please, may I have ', nm(card), '?'] : ['Please, ' + target.name + ', have you got ', nm(card), '?'];
        var bubble = speak(askLine, who, said);
        var wanted = h('div', { class: 'hf-wanted' }, makeCard(card, 'mini'));
        askLine.appendChild(wanted);
        replyLine.hidden = true;
        players.forEach(function (p, i) { if (p.el && p.el.seat && !p.human) p.el.seat.classList.toggle('is-asked', i === b); });
        api.sound('pop');
        api.status(asker.human ? 'You ask ' + target.name + ' for ' + cardName(card) + '.' : asker.name + ' asks ' + (target.human ? 'you' : target.name) + ' for ' + cardName(card) + '.');
        api.announce((asker.human ? 'You' : asker.name) + ': Please, ' + (target.human ? '' : target.name + ', ') + 'have you got ' + cardName(card) + '?');
        drawAll();
        later(wait(550, 600), function () {
          var has = target.hand.indexOf(card) >= 0;
          var entry = { asker: a, target: b, card: card, got: has, heard: {} };
          players.forEach(function (p, i) { if (!p.human) entry.heard[i] = rnd() < LEVELS[level].recall; });
          if (has) {
            target.hand.splice(target.hand.indexOf(card), 1);
            entry.lastCardOf = !target.hand.some(function (c) { return famOf(c) === famOf(card); });
            asker.hand.push(card);
            log.push(entry);
            speak(replyLine, target.human ? 'You' : target.name, ['Yes, here ' + PRONOUN[memOf(card)] + ' is.'], 'is-yes');
            api.sound('whoosh');
            var flyer = makeCard(card, 'full');
            flyer.style.setProperty('--w', '64px');
            fly(flyer, b === 0 ? tiles : players[b].el.seat, a === 0 ? tiles : players[a].el.seat, 520, 0, 0.7);
            note((asker.human ? 'You' : asker.name) + ' got ' + cardName(card) + ' from ' + (target.human ? 'you' : target.name) + '.');
            api.announce((target.human ? 'You hand over ' : target.name + ' hands over ') + cardName(card) + '.');
            later(wait(450, 520), function () {
              wanted.remove();
              speak(askLine, who, ['Thank you!']);
              api.sound('coin');
              drawAll(a === 0 ? [card] : null);
              later(wait(350, 420), function () { layDown(a, function () { carryOn(a); }); });
            });
          } else {
            log.push(entry);
            speak(replyLine, target.human ? 'You' : target.name, ['Sorry, ', nm(card), ' is not at home.'], 'is-no');
            api.sound('thud');
            wanted.classList.add('is-no');
            note((asker.human ? 'You' : asker.name) + ' asked ' + (target.human ? 'you' : target.name) + ' for ' + cardName(card) + ': not at home.');
            api.announce((target.human ? 'You say: ' : target.name + ' says: ') + cardName(card) + ' is not at home.');
            later(wait(500, 600), function () { turn = b; startTurn(); });
          }
        });
      }
      /* After a card is handed over, the same player asks again, if they still have cards. */
      function carryOn(a) {
        if (allHome()) { finish(); return; }
        if (!players[a].hand.length) {
          note((players[a].human ? 'You have' : players[a].name + ' has') + ' no cards left.');
          turn = nextWithCards(a);
        }
        startTurn();
      }
      function nextWithCards(from) {
        for (var k = 1; k <= players.length; k++) { var j = (from + k) % players.length; if (players[j].hand.length) return j; }
        return from;
      }
      function allHome() { return players.reduce(function (n, p) { return n + p.families.length; }, 0) === FAMILIES.length; }

      /* ---- laying down a complete family, with the four cards fanned across the table ---- */
      function completeFamilies(p) {
        var out = [];
        familiesHeld(p).forEach(function (f) { if (p.hand.filter(function (c) { return famOf(c) === f; }).length === 4) out.push(f); });
        return out;
      }
      function layDown(i, done) {
        var p = players[i], fams = completeFamilies(p);
        if (!fams.length) { done(); return; }
        var f = fams[0];
        p.hand = p.hand.filter(function (c) { return famOf(c) !== f; });
        p.families.push(f);
        log.forEach(function (e) { if (famOf(e.card) === f) e.done = true; });
        api.sound('bell');
        var who = p.human ? 'You lay' : p.name + ' lays';
        api.status(who + ' down the ' + FAMILIES[f].name + ' family!');
        api.announce(who + ' down the ' + FAMILIES[f].name + ' family.');
        note(who + ' down the ' + FAMILIES[f].name + ' family.');
        if (p.human) speak(askLine, 'You', ['The whole ', h('b', null, FAMILIES[f].name), ' family is home!']);
        fan(f, i);
        drawAll();
        later(reduced ? 0 : 1250, function () { layDown(i, done); });
      }
      function fan(f, owner) {
        if (reduced) return;
        var base = rectIn(talk), target = owner === 0 ? shelf : players[owner].el.plaques;
        var w = Math.max(64, Math.min(110, Math.round(base.w / 5.2)));
        [0, 1, 2, 3].forEach(function (m, k) {
          var card = makeCard(f * 4 + m, 'full');
          card.style.setProperty('--w', w + 'px');
          card.classList.add('hf-fly');
          fx.appendChild(card);
          var cx = base.x + base.w / 2 - w / 2 + (k - 1.5) * w * 0.62, cy = base.y + 6;
          var t = rectIn(target), tx = t.x + t.w / 2 - w / 2, ty = t.y + t.h / 2 - w * 0.71;
          var rot = (k - 1.5) * 12;
          if (!card.animate) { card.remove(); return; }
          var anim = card.animate([
            { transform: 'translate(' + (base.x + base.w / 2 - w / 2) + 'px,' + (cy + 40) + 'px) scale(.4) rotate(0deg)', opacity: 0 },
            { transform: 'translate(' + cx + 'px,' + cy + 'px) scale(1.06) rotate(' + rot + 'deg)', opacity: 1, offset: 0.28 },
            { transform: 'translate(' + cx + 'px,' + cy + 'px) scale(1) rotate(' + rot + 'deg)', opacity: 1, offset: 0.7 },
            { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.25) rotate(0deg)', opacity: 0.2 }],
            { duration: 1200, delay: k * 50, easing: 'ease-in-out', fill: 'both' });
          anim.onfinish = function () { card.remove(); };
        });
      }

      /* ---- turns ---- */
      function startTurn() {
        if (over) return;
        if (allHome()) { finish(); return; }
        if (!players[turn].hand.length) turn = nextWithCards(turn);
        busy = false;
        players.forEach(function (p) { if (p.el && p.el.seat && !p.human) p.el.seat.classList.remove('is-asked'); });
        drawAll();
        var p = players[turn];
        if (p.human) {
          pick = { family: -1, card: -1 };
          drawAll();
          api.sound('tick');
          api.status('Your turn: pick one of your families to ask for.');
          var first = tiles.querySelector('button:not(:disabled)');
          if (first && root.contains(document.activeElement)) first.focus({ preventScroll: true });
          return;
        }
        api.status(p.name + "'s turn: " + p.name + ' is thinking...');
        busy = true;
        drawScore();
        later(wait(350, 600), function () {
          var choice = chooseAsk(turn, players, log, level, rnd);
          if (!choice) { busy = false; turn = nextWithCards(turn); startTurn(); return; }
          ask(turn, choice.target, choice.card);
        });
      }

      /* ---- the deal ---- */
      function shuffle(list) {
        var a = list.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
      }
      function newGame() {
        /* shuffle first, before anything else uses the random numbers */
        var deck = shuffle(Array.apply(null, Array(44)).map(function (_, i) { return i; }));
        clearAll();
        fx.replaceChildren();
        players = [{ name: 'You', human: true, hand: [], families: [] }];
        for (var i = 0; i < opponents; i++) players.push({ name: NAMES[i], human: false, hand: [], families: [] });
        /* deal one card at a time, starting with you */
        deck.forEach(function (card, k) { players[k % players.length].hand.push(card); });
        turn = 0; over = false; busy = true; dealing = true; log = []; notes = []; pick = { family: -1, card: -1 };
        logEl.replaceChildren();
        askLine.hidden = true; replyLine.hidden = true;
        buildSeats();
        syncButtons();
        api.sound('shuffle');
        api.status('Dealing all 44 cards...');
        var dealt = players.map(function (p) { return p.hand.slice(); });
        players.forEach(function (p) { p.dealt = p.hand; p.hand = []; });
        drawAll();
        var total = deck.length;
        deck.forEach(function (card, k) {
          var owner = k % players.length;
          var back = makeBack(30);
          fly(back, talk, anchorOf(owner), 380, k * 24, 0.7);
        });
        later(reduced ? 0 : total * 24 + 420, function () {
          dealing = false;
          players.forEach(function (p, i) { p.hand = dealt[i]; delete p.dealt; });
          api.sound('flip');
          drawAll();
          /* anyone dealt a whole family lays it down straight away */
          var order = players.map(function (_, i) { return i; });
          (function next() {
            var i = order.shift();
            if (i === undefined) {
              turn = 0;
              if (!log.length && askLine.hidden) speak(askLine, players[1].name, ['You go first! Ask for a card from a family you hold, and remember to say please.']);
              startTurn();
              return;
            }
            layDown(i, next);
          })();
        });
      }

      /* ---- the end ---- */
      function finish() {
        if (over) return;
        over = true; busy = false;
        clearAll();
        drawAll();
        var me = players[0];
        var best = Math.max.apply(null, players.map(function (p) { return p.families.length; }));
        var leaders = players.filter(function (p) { return p.families.length === best; });
        var tally = players.map(function (p) { return (p.human ? 'you ' : p.name + ' ') + p.families.length; }).join(', ');
        if (leaders.length === 1 && leaders[0] === me) {
          record++; api.store.set('wins', record);
          api.status('You win with ' + best + ' families! (' + tally + ')');
          api.celebrate('You win with ' + best + ' happy families!');
        } else if (leaders.indexOf(me) >= 0) {
          api.sound('bell');
          api.status("It's a tie! " + leaders.map(function (p) { return p.human ? 'You' : p.name; }).join(' and ') + ' have ' + best + ' families each.');
        } else {
          api.sound('lose');
          api.status(leaders.map(function (p) { return p.name; }).join(' and ') + (leaders.length > 1 ? ' share the win' : ' wins') + ' with ' + best + ' families. Well played: try again!');
        }
        note('Final count: ' + tally + '.');
      }

      /* ---- settings ---- */
      function syncButtons() {
        opp2.setAttribute('aria-pressed', String(opponents === 2));
        opp3.setAttribute('aria-pressed', String(opponents === 3));
        Object.keys(lvlBtns).forEach(function (k) { lvlBtns[k].setAttribute('aria-pressed', String(level === k)); });
      }
      function setOpponents(n) { opponents = n; api.store.set('opponents', n); api.sound('click'); newGame(); }
      function setLevel(k) { level = k; api.store.set('level', k); api.sound('click'); syncButtons(); api.status('The cousins now play ' + LEVELS[k].label + (busy || turn !== 0 ? '.' : '. Your turn: pick one of your families to ask for.')); }

      /* ---- keyboard: arrows move along a row of buttons, Escape goes back a step ---- */
      function onKey(ev) {
        var t = ev.target;
        if (ev.key === 'Escape' && root.contains(t)) {
          if (pick.card >= 0) { pick.card = -1; drawSteps(); var b = stepMember.querySelector('[aria-pressed="true"], button:not(:disabled)'); if (b) b.focus(); ev.preventDefault(); }
          else if (pick.family >= 0) { var f = pick.family; pick = { family: -1, card: -1 }; drawAll(); var tb = tiles.querySelector('[data-family="' + f + '"]'); if (tb) tb.focus(); ev.preventDefault(); }
          return;
        }
        if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight' && ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
        var group = t && t.closest && t.closest('.hf-tiles, .hf-members, .hf-players');
        if (!group) return;
        var list = Array.prototype.filter.call(group.querySelectorAll('button'), function (b) { return !b.disabled; });
        var i = list.indexOf(t);
        if (i < 0) return;
        var step = ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 1;
        var next = list[(i + step + list.length) % list.length];
        if (next) { next.focus(); ev.preventDefault(); }
      }
      root.addEventListener('keydown', onKey);

      /* the four cards of the "which one?" step share the width */
      function fit() { root.style.setProperty('--mw', Math.max(46, Math.min(100, Math.floor(((root.clientWidth || 300) - 24) / 4) - 14)) + 'px'); }
      var ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
      if (ro) ro.observe(root);
      fit();

      syncButtons();
      newGame();

      return {
        destroy: function () {
          over = true;
          clearAll();
          if (ro) ro.disconnect();
          root.removeEventListener('keydown', onKey);
          fx.replaceChildren();
        }
      };
    }
  });
})();
