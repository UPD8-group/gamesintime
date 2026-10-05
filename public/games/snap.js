/* Snap for Games in Time, in the 1800 to 1879 hall.
   John Jaques and Son published "Snap, the Old Original Game" in London in 1866: 64 picture cards in 16 sets of
   four. This version has 64 cards too, 16 Victorian pictures, four of each, drawn here in SVG.

   The rules followed (the usual Victorian way, per the V&A and pagat.com):
   - Deal all the cards face down. Each player keeps a face-down pile.
   - In turn, each player turns their top card onto their own face-up pile.
   - When the top cards of two face-up piles match, the first to call Snap wins both face-up piles and puts them
     under their face-down pile.
   - A wrong call (no match) costs a forfeit: you give one card from your face-down pile to each other player.
     This is one of the two forfeits the V&A records for Victorian Snap.
   - If your face-down pile runs out, turn your face-up pile over and carry on. With no cards at all, you are out.
   - The player who gathers all the cards wins. The Quick game ends after 60 turns: most cards wins.

   How the file is organised:
     Part 1  The pictures (inline SVG, coloured only with the site's colour variables).
     Part 2  The computer players: how fast they react, and how often they slip.
     Part 3  The game and the screen.
   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  /* =====================================================================
     PART 1: THE PICTURES
     Each picture is drawn on a 100 by 100 grid. Fill classes: k ink, p paper, g gold, r red, b blue, t teal,
     o rose, l leaf, w wood. Class s adds the ink outline; n means no fill.
     ===================================================================== */
  var PICTURES = [
    { name: 'top hat', svg:
      '<ellipse class="k" cx="50" cy="80" rx="40" ry="8"/>' +
      '<path class="k" d="M29 79 32 22Q50 15 68 22L71 79Q50 85 29 79Z"/>' +
      '<path class="r" d="M31 62Q50 67 69 62L70 72Q50 77 30 72Z"/>' +
      '<path class="p" opacity=".22" d="M37 26Q42 23 47 23L46 60Q41 60 36 59Z"/>' },
    { name: 'teapot', svg:
      '<path class="n s" stroke-width="7" d="M75 42Q93 40 91 57Q89 69 74 66"/>' +
      '<path class="b s" d="M27 52Q9 50 5 33L13 31Q17 44 29 44Z"/>' +
      '<path class="b s" d="M20 54Q20 30 50 30Q80 30 80 54Q80 78 50 80Q20 78 20 54Z"/>' +
      '<path class="p" d="M26 58Q50 68 74 58L73 63Q50 73 27 63Z"/>' +
      '<circle class="p" cx="50" cy="48" r="7"/><circle class="b" cx="50" cy="48" r="3.5"/>' +
      '<ellipse class="b s" cx="50" cy="30" rx="19" ry="5.5"/>' +
      '<circle class="g s" cx="50" cy="21" r="5.5"/>' },
    { name: 'penny-farthing', svg:
      '<circle class="n s" stroke-width="5" cx="36" cy="60" r="31"/>' +
      '<path class="n s" stroke-width="1.4" d="M36 29V91M5 60H67M14 38 58 82M14 82 58 38"/>' +
      '<circle class="n s" stroke-width="4" cx="86" cy="83" r="8"/>' +
      '<path class="n s" stroke-width="5" d="M36 60 41 24"/>' +
      '<path class="n s" stroke-width="5" d="M43 27Q78 30 86 83"/>' +
      '<path class="n s" stroke-width="4" d="M29 21H50"/>' +
      '<path class="k" d="M44 19Q52 14 60 20L58 24Q51 22 45 24Z"/>' +
      '<circle class="g s" stroke-width="1.6" cx="36" cy="60" r="4.5"/><circle class="g s" stroke-width="1.6" cx="86" cy="83" r="2.5"/>' },
    { name: 'parasol', svg:
      '<path class="n s" stroke-width="3.5" d="M50 14V86Q50 95 42 94"/>' +
      '<path class="o s" d="M12 52Q14 14 50 10Q86 14 88 52Z"/>' +
      '<path class="n s" stroke-width="1.5" d="M50 11 32 52M50 11 68 52M50 11V52"/>' +
      '<path class="p s" stroke-width="1.5" d="M12 52a4.6 4.6 0 0 0 9.5 0a4.6 4.6 0 0 0 9.5 0a4.6 4.6 0 0 0 9.5 0a4.6 4.6 0 0 0 9.5 0a4.6 4.6 0 0 0 9.5 0a4.6 4.6 0 0 0 9.5 0a4.6 4.6 0 0 0 9.5 0a4.6 4.6 0 0 0 9.5 0Z"/>' +
      '<path class="r s" d="M50 66 40 60 40 72ZM50 66 60 60 60 72Z"/>' +
      '<circle class="g s" cx="50" cy="9" r="3.5"/>' },
    { name: 'clock', svg:
      '<path class="w s" d="M19 84V46Q19 16 50 16Q81 16 81 46V84Z"/>' +
      '<circle class="p s" cx="50" cy="47" r="21"/>' +
      '<path class="n s" stroke-width="2.4" d="M50 30V34M50 60V64M33 47H37M63 47H67"/>' +
      '<path class="n s" stroke-width="3.2" stroke-linecap="round" d="M50 47 50 34M50 47 60 52"/>' +
      '<circle class="k" cx="50" cy="47" r="2.6"/>' +
      '<rect class="g s" x="12" y="82" width="76" height="9" rx="2"/>' +
      '<circle class="g s" cx="50" cy="12" r="4.5"/>' },
    { name: 'kite', svg:
      '<path class="r s" d="M50 5 80 38 50 72 20 38Z"/>' +
      '<path class="g" d="M50 6 79 38H50ZM50 38V71L21 38Z"/>' +
      '<path class="n s" stroke-width="2.2" d="M50 5V72M20 38H80"/>' +
      '<path class="n s" stroke-width="2.2" d="M50 72Q36 80 48 87Q60 93 50 99"/>' +
      '<path class="b s" stroke-width="1.4" d="M43 79 35 73V85ZM43 79 51 73V85Z"/>' +
      '<path class="t s" stroke-width="1.4" d="M55 91 47 86V97ZM55 91 63 86V97Z"/>' },
    { name: 'sailing ship', svg:
      '<path class="b" d="M0 86Q12 80 25 86T50 86T75 86T100 86V100H0Z"/>' +
      '<path class="w s" d="M10 68H90L78 86H22Z"/>' +
      '<path class="n s" stroke-width="3" d="M32 68V18M54 68V10M74 68V24"/>' +
      '<path class="p s" d="M20 24Q32 32 44 24L42 40Q32 46 22 40ZM21 44Q32 52 43 44L41 62Q32 66 23 62Z"/>' +
      '<path class="p s" d="M43 16Q54 24 65 16L63 34Q54 40 45 34ZM44 38Q54 46 64 38L62 60Q54 64 46 60Z"/>' +
      '<path class="p s" d="M66 30Q74 36 83 30L81 46Q74 50 68 46ZM67 50Q74 56 82 50L80 64Q74 66 69 64Z"/>' +
      '<path class="r s" stroke-width="1.6" d="M54 10H66L62 14 66 18H54Z"/>' },
    { name: 'oil lamp', svg:
      '<path class="g s" d="M32 93H68L61 79H39Z"/>' +
      '<path class="g s" d="M44 79 46 70H54L56 79Z"/>' +
      '<ellipse class="g s" cx="50" cy="64" rx="18" ry="9"/>' +
      '<ellipse class="o s" opacity=".85" cx="50" cy="44" rx="21" ry="17"/>' +
      '<path class="p s" stroke-width="2" d="M44 50V14Q50 9 56 14V50"/>' +
      '<path class="r" d="M50 47Q42 38 50 24Q58 38 50 47Z"/>' +
      '<path class="g" d="M50 45Q46 39 50 31Q54 39 50 45Z"/>' },
    { name: 'bonnet', svg:
      '<path class="n" stroke-width="5" style="stroke: var(--rose)" d="M20 66Q28 84 46 86M80 66Q72 84 54 86"/>' +
      '<path class="g s" d="M12 70Q8 18 50 14Q92 18 88 70Q76 60 50 59Q24 60 12 70Z"/>' +
      '<path class="w" opacity=".5" d="M23 64Q21 28 50 25Q79 28 77 64Q66 56 50 55Q34 56 23 64Z"/>' +
      '<path class="n" stroke-width="6" style="stroke: var(--rose)" d="M17 44Q50 20 83 44"/>' +
      '<path class="o s" stroke-width="1.6" d="M50 86 38 78 38 92ZM50 86 62 78 62 92Z"/>' +
      '<path class="o s" stroke-width="1.6" d="M48 88 42 99 47 98ZM52 88 58 99 53 98Z"/>' +
      '<circle class="r s" stroke-width="1.6" cx="76" cy="34" r="5.5"/><circle class="l s" stroke-width="1.6" cx="68" cy="29" r="3.8"/>' },
    { name: 'rocking horse', svg:
      '<path class="n s" stroke-width="6" d="M6 80Q50 102 94 80"/>' +
      '<path class="r" d="M6 80Q50 102 94 80" fill="none" stroke-width="3" style="stroke: var(--vermilion)"/>' +
      '<path class="n s" stroke-width="5" d="M30 56 22 86M40 58 40 90M60 58 62 90M70 54 80 86"/>' +
      '<ellipse class="p s" cx="50" cy="50" rx="25" ry="13"/>' +
      '<path class="p s" d="M66 46 74 22Q80 15 89 22L93 32Q87 35 81 32L76 52Z"/>' +
      '<path class="k" d="M72 22Q70 34 64 44L68 47Q74 36 77 24Z"/>' +
      '<path class="n s" stroke-width="5" d="M26 46Q12 48 14 66"/>' +
      '<path class="r s" d="M42 38Q50 34 58 38L57 50Q50 53 43 50Z"/>' +
      '<circle class="k" cx="84" cy="25" r="1.8"/>' +
      '<circle class="k" opacity=".25" cx="36" cy="52" r="3"/><circle class="k" opacity=".25" cx="62" cy="54" r="2.5"/>' },
    { name: 'steam train', svg:
      '<circle class="p s" cx="20" cy="20" r="7"/><circle class="p s" cx="30" cy="12" r="9"/><circle class="p s" cx="44" cy="8" r="6"/>' +
      '<path class="k s" d="M27 46 24 26H37L34 46Z"/>' +
      '<rect class="t s" x="16" y="44" width="50" height="24" rx="5"/>' +
      '<path class="g s" d="M44 44Q48 36 52 44Z"/>' +
      '<path class="r s" d="M62 30H90V68H62Z"/>' +
      '<rect class="p s" x="68" y="36" width="14" height="12"/>' +
      '<path class="k s" d="M58 28H94V32H58Z"/>' +
      '<path class="k s" d="M16 66 6 80H18Z"/>' +
      '<path class="n s" stroke-width="2.5" d="M2 92H98"/>' +
      '<circle class="r s" cx="32" cy="78" r="10"/><circle class="r s" cx="56" cy="78" r="10"/><circle class="r s" cx="80" cy="80" r="8"/>' +
      '<path class="n s" stroke-width="3" d="M32 78H80"/>' },
    { name: 'umbrella', svg:
      '<path class="n s" stroke-width="4" d="M50 52V84Q50 95 41 95Q34 95 34 88"/>' +
      '<path class="k s" d="M10 54Q12 12 50 8Q88 12 90 54Q83 46 76 54Q70 46 63 54Q57 46 50 54Q43 46 37 54Q30 46 24 54Q17 46 10 54Z"/>' +
      '<path class="n" stroke-width="1.6" style="stroke: var(--ink-muted)" d="M50 9 24 52M50 9 37 52M50 9V52M50 9 63 52M50 9 76 52"/>' +
      '<path class="b" d="M18 64Q14 72 18 74Q22 72 18 64ZM84 66Q80 74 84 76Q88 74 84 66ZM72 80Q68 88 72 90Q76 88 72 80ZM26 84Q22 92 26 94Q30 92 26 84Z"/>' },
    { name: 'drum', svg:
      '<path class="n s" stroke-width="4.5" d="M24 8 52 34M78 6 50 34"/>' +
      '<circle class="p s" cx="23" cy="7" r="4.5"/><circle class="p s" cx="79" cy="5" r="4.5"/>' +
      '<path class="r s" d="M18 40V76Q50 92 82 76V40Q50 56 18 40Z"/>' +
      '<path class="n" stroke-width="3" style="stroke: var(--gold)" d="M19 46 30 76 41 50 50 82 59 50 70 76 81 46"/>' +
      '<path class="b s" d="M18 40Q50 56 82 40V46Q50 62 18 46ZM18 72Q50 88 82 72V77Q50 93 18 77Z"/>' +
      '<ellipse class="p s" cx="50" cy="40" rx="32" ry="9"/>' },
    { name: 'spinning top', svg:
      '<path class="n s" stroke-width="2.5" d="M10 34Q4 52 14 66M90 34Q96 52 86 66"/>' +
      '<rect class="k s" x="46" y="12" width="8" height="16" rx="2"/>' +
      '<path class="w s" d="M18 36Q50 18 82 36Q76 64 50 88Q24 64 18 36Z"/>' +
      '<path class="r" d="M20 42Q50 30 80 42L78 50Q50 38 22 50Z"/>' +
      '<path class="b" d="M26 58Q50 48 74 58L70 64Q50 56 30 64Z"/>' +
      '<path class="k s" d="M47 84 50 96 53 84Z"/>' },
    { name: 'birdcage', svg:
      '<circle class="n s" stroke-width="3" cx="50" cy="9" r="5"/>' +
      '<path class="n" stroke-width="2.6" style="stroke: var(--gold-shadow)" d="M24 82V46Q24 16 50 15Q76 16 76 46V82M37 82V36Q38 18 50 15M63 82V36Q62 18 50 15M50 15V82"/>' +
      '<path class="n s" stroke-width="2" d="M24 46Q50 40 76 46"/>' +
      '<path class="n s" stroke-width="2.5" d="M28 66H72"/>' +
      '<ellipse class="g s" cx="46" cy="58" rx="11" ry="8"/><circle class="g s" cx="56" cy="50" r="6"/>' +
      '<path class="r" d="M61 49 67 51 61 53Z"/><circle class="k" cx="57" cy="48.5" r="1.4"/>' +
      '<path class="g s" d="M36 58 26 64 37 63Z"/>' +
      '<rect class="g s" x="18" y="80" width="64" height="9" rx="3"/>' },
    { name: 'button boot', svg:
      '<path class="k s" d="M33 8H61V60Q61 69 71 71L87 75Q95 77 95 86V90H29V66Q33 50 33 8Z"/>' +
      '<path class="w s" d="M29 90H44L42 97H31Z"/>' +
      '<path class="p" d="M29 88H95V91H29Z"/>' +
      '<circle class="g" cx="57" cy="16" r="2.6"/><circle class="g" cx="57" cy="26" r="2.6"/><circle class="g" cx="57" cy="36" r="2.6"/>' +
      '<circle class="g" cx="57" cy="46" r="2.6"/><circle class="g" cx="57" cy="56" r="2.6"/>' +
      '<path class="r" d="M33 8H61V13H33Z"/>' }
  ];
  /* Pairs that look a little alike. An Easy computer sometimes calls Snap on these by mistake. */
  var LOOKALIKE = { 3: 11, 11: 3, 0: 8, 8: 0, 4: 14, 14: 4, 6: 10, 10: 6, 5: 13, 13: 5 };
  function picOf(card) { return Math.floor(card / 4); }

  var SVGNS = 'http://www.w3.org/2000/svg';
  function pictureSvg(pic) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 100 100');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    s.innerHTML = PICTURES[pic].svg;   /* constant markup written above, never user input */
    return s;
  }

  /* =====================================================================
     PART 2: THE COMPUTER PLAYERS
     Each computer watches the face-up piles. When two top cards match it waits its reaction time, then calls
     Snap, unless someone was quicker or the match has gone.
       Easy:   900 to 1300 ms. Sometimes misses a match, and sometimes calls Snap on two cards that only
               look alike (parasol and umbrella, top hat and bonnet). Then it pays you a card!
       Medium: 600 to 900 ms. Rarely misses.
       Hard:   350 to 600 ms. Never misses, never makes a mistake.
     ===================================================================== */
  var LEVELS = {
    easy: { label: 'Easy', min: 900, max: 1300, miss: 0.18, oops: 0.32, wild: 0.02 },
    medium: { label: 'Medium', min: 600, max: 900, miss: 0.06, oops: 0.05, wild: 0 },
    hard: { label: 'Hard', min: 350, max: 600, miss: 0, oops: 0, wild: 0 }
  };
  var NAMES = ['Ada', 'Albert'];
  var QUICK_TURNS = 60;      /* the Quick game ends after this many turns */
  var MAX_TURNS = 600;       /* a very long full game ends here too: most cards wins */

  /* Little portraits for the players: Ada with a bow, Albert in a cap, and you. */
  var AVATARS = {
    Ada: '<circle class="o" cx="20" cy="20" r="19"/><path class="w" d="M8 22Q8 6 20 6Q32 6 32 22L30 32H10Z"/><circle class="p" cx="20" cy="20" r="8.5"/><path class="w" d="M11 17Q14 9 20 9Q27 9 29 17Q22 13 11 17Z"/><path class="r" d="M24 8 30 4 31 11ZM24 8 18 4 19 11Z"/><circle class="k" cx="17" cy="20" r="1.2"/><circle class="k" cx="23" cy="20" r="1.2"/><path class="n s" stroke-width="1.3" d="M17 24Q20 26.5 23 24"/><path class="b" d="M9 39Q10 30 20 30Q30 30 31 39Z"/>',
    Albert: '<circle class="t" cx="20" cy="20" r="19"/><circle class="p" cx="20" cy="21" r="8.5"/><path class="k" d="M10 18Q11 8 21 8Q30 8 31 15L35 17Q28 18 10 18Z"/><circle class="k" cx="17" cy="21" r="1.2"/><circle class="k" cx="23" cy="21" r="1.2"/><path class="n s" stroke-width="1.3" d="M17 25Q20 27.5 23 25"/><path class="r" d="M9 39Q10 31 20 31Q30 31 31 39Z"/><path class="p" d="M18 31H22L20 35Z"/>',
    You: '<circle class="g" cx="20" cy="20" r="19"/><circle class="p" cx="20" cy="17" r="8"/><path class="p" d="M7 36Q8 27 20 27Q32 27 33 36Z"/>'
  };
  function avatarSvg(name) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 40 40'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'sn-avatar');
    s.innerHTML = AVATARS[name] || AVATARS.You;
    return s;
  }


  var CSS = [
    '.game-snap { --sn-paper: var(--ink); --sn-ink: var(--bg); --sn-crimson: var(--vermilion); --sn-shadow: transparent; }',
    '@supports (color: color-mix(in srgb, red, blue)) { .game-snap { --sn-crimson: color-mix(in srgb, var(--vermilion) 62%, var(--bg)); --sn-shadow: color-mix(in srgb, var(--bg) 55%, transparent); } }',
    /* picture fills: every colour is one of the site's variables */
    '.game-snap svg .k { fill: var(--sn-ink); } .game-snap svg .p { fill: var(--sn-paper); } .game-snap svg .g { fill: var(--gold); }',
    '.game-snap svg .r { fill: var(--vermilion); } .game-snap svg .b { fill: var(--cobalt); } .game-snap svg .t { fill: var(--peacock); }',
    '.game-snap svg .o { fill: var(--rose); } .game-snap svg .l { fill: var(--leaf); } .game-snap svg .w { fill: var(--gold-shadow); } .game-snap svg .n { fill: none; }',
    /* the default line weight sits on the svg, so a stroke-width written on a shape can still thicken it */
    '.game-snap svg { stroke-width: 2.4; stroke-linejoin: round; stroke-linecap: round; }',
    '.game-snap svg .s { stroke: var(--sn-ink); }',
    /* toolbar: on phones the settings fold away behind an Options button */
    '.game-snap .game-toolbar { justify-content: center; }',
    '.game-snap .sn-opts { display: flex; flex-wrap: wrap; justify-content: center; gap: .6rem .8rem; }',
    '.game-snap .sn-optbtn { display: none; }',
    '@media (max-width: 700px) { .game-snap .sn-optbtn { display: inline-flex; } .game-snap .sn-opts { display: none; flex-basis: 100%; } .game-snap .sn-opts.is-open { display: flex; } }',
    '.game-snap .sn-table { position: relative; display: grid; gap: clamp(6px, 1.6vw, 16px); padding: 4px 0; outline: none; border-radius: 14px; }',
    '.game-snap .sn-table:focus-visible { box-shadow: 0 0 0 2px var(--focus); }',
    '.game-snap .sn-row { display: flex; justify-content: center; align-items: flex-start; gap: var(--sn-gap, 12px); }',
    '.game-snap .sn-seat { position: relative; display: grid; justify-items: center; gap: 4px; min-width: 0; padding: 6px 6px 8px; border-radius: 16px; border: 2px solid transparent; transition: border-color .2s, background-color .2s; }',
    '.game-snap .sn-seat.is-turn { border-color: var(--gold); background: var(--surface); }',
    '.game-snap .sn-seat.is-out { opacity: .45; }',
    '.game-snap .sn-name { display: flex; align-items: center; gap: 6px; font-family: var(--font-head); font-weight: 800; font-size: clamp(.95rem, .85rem + .4vw, 1.15rem); white-space: nowrap; line-height: 1.1; }',
    '.game-snap .sn-avatar { width: 30px; height: 30px; flex: none; }',
    '.game-snap .sn-count { font-family: var(--font-poster); font-weight: 400; color: var(--gold); font-size: 1.2em; min-width: 2ch; display: inline-block; }',
    '.game-snap .sn-count.is-bump { animation: game-snap-bump .45s ease; }',
    '@keyframes game-snap-bump { 40% { transform: scale(1.6); } }',
    '.game-snap .sn-piles { display: flex; align-items: center; }',
    /* the face-down pile: a little stack of backs, tucked half under the face-up pile */
    '.game-snap .sn-down { position: relative; width: var(--dw); height: calc(var(--dw) * 1.4); padding: 0; border: 0; background: none; color: var(--ink); flex: none; border-radius: 9px; margin-right: var(--tuck, 8px); z-index: 1; }',
    '.game-snap .sn-down .sn-back { position: absolute; inset: 0; }',
    '.game-snap .sn-down .sn-back:nth-child(1) { transform: translate(4px, 4px); }',
    '.game-snap .sn-down .sn-back:nth-child(2) { transform: translate(2px, 2px); }',
    '.game-snap .sn-down.is-empty .sn-back { display: none; }',
    '.game-snap .sn-down.is-empty { outline: 2px dashed var(--line); outline-offset: -2px; }',
    '.game-snap button.sn-down { cursor: pointer; }',
    '.game-snap button.sn-down:disabled { cursor: default; }',
    '.game-snap button.sn-down.is-ready .sn-back:nth-child(3) { box-shadow: inset 0 0 0 2px var(--gold), 0 0 0 4px var(--gold), 0 6px 14px var(--sn-shadow); animation: game-snap-nudge 1.4s ease-in-out infinite; }',
    '@keyframes game-snap-nudge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }',
    '.game-snap .sn-down-label { position: absolute; left: 50%; bottom: 0; transform: translate(-50%, 45%); background: var(--sn-paper); color: var(--sn-ink); font: 800 .8rem/1 var(--font-head); padding: 4px 9px; border-radius: 999px; white-space: nowrap; z-index: 3; }',
    'button.sn-down:disabled .sn-down-label { opacity: 0; }',
    /* a card */
    '.game-snap .sn-card { position: absolute; inset: 0; border-radius: calc(var(--cw) * .08); background: var(--sn-paper); color: var(--sn-ink); box-shadow: inset 0 0 0 2px var(--sn-ink), inset 0 0 0 5px var(--sn-paper), inset 0 0 0 6px var(--gold-shadow), 0 2px 6px var(--sn-shadow); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10% 9% 7%; transform: rotate(var(--rot, 0deg)); }',
    '.game-snap .sn-card svg { width: 100%; height: auto; flex: 1 1 auto; min-height: 0; }',
    '.game-snap .sn-label { font: 400 max(11px, calc(var(--cw) * .11))/1.1 var(--font-poster); text-transform: capitalize; letter-spacing: .02em; white-space: nowrap; margin-top: 4%; }',
    '.game-snap .sn-small .sn-label { display: none; }',
    '.game-snap .sn-back { border-radius: calc(var(--cw, 100px) * .08); background-color: var(--sn-crimson); border: 3px solid var(--sn-paper);',
    '  background-image: radial-gradient(ellipse 26% 18% at 50% 50%, var(--gold) 0 45%, transparent 48%), repeating-linear-gradient(45deg, transparent 0 6px, var(--gold) 6px 7px), repeating-linear-gradient(-45deg, transparent 0 6px, var(--gold) 6px 7px);',
    '  box-shadow: inset 0 0 0 2px var(--gold), 0 2px 5px var(--sn-shadow); }',
    '@supports (color: color-mix(in srgb, red, blue)) { .game-snap .sn-back { background-image: radial-gradient(ellipse 26% 18% at 50% 50%, var(--gold) 0 45%, transparent 48%), repeating-linear-gradient(45deg, transparent 0 6px, color-mix(in srgb, var(--gold) 50%, transparent) 6px 7px), repeating-linear-gradient(-45deg, transparent 0 6px, color-mix(in srgb, var(--gold) 50%, transparent) 6px 7px); } }',
    /* the face-up pile */
    '.game-snap .sn-up { position: relative; width: var(--cw); height: calc(var(--cw) * 1.4); flex: none; z-index: 2; }',
    '.game-snap .sn-up.is-empty { outline: 2px dashed var(--line); outline-offset: -2px; border-radius: calc(var(--cw) * .08); }',
    '.game-snap .sn-up .sn-card.is-new { animation: game-snap-turn .3s cubic-bezier(.2,.7,.3,1.15); }',
    '@keyframes game-snap-turn { from { transform: translateX(-45%) rotateY(80deg) scale(.9); } to { transform: rotate(var(--rot, 0deg)); } }',
    '.game-snap .sn-up.is-match .sn-card:last-child { animation: game-snap-slam .36s cubic-bezier(.3,1.6,.5,1); box-shadow: inset 0 0 0 2px var(--sn-ink), inset 0 0 0 5px var(--sn-paper), inset 0 0 0 6px var(--gold-shadow), 0 0 0 5px var(--gold), 0 8px 18px var(--sn-shadow); }',
    '@keyframes game-snap-slam { 0% { transform: scale(1.3) rotate(var(--rot, 0deg)); } 100% { transform: scale(1) rotate(var(--rot, 0deg)); } }',
    /* speech bubble */
    '.game-snap .sn-bubble { position: absolute; top: 0; left: 50%; transform: translate(-50%, -55%) scale(.6); opacity: 0; pointer-events: none; background: var(--sn-paper); color: var(--sn-ink); font: 400 clamp(1.05rem, .9rem + .8vw, 1.5rem)/1 var(--font-poster); padding: .35em .7em; border-radius: 14px; white-space: nowrap; z-index: 20; transition: opacity .15s, transform .15s; box-shadow: 0 4px 12px var(--sn-shadow); }',
    '.game-snap .sn-bubble::after { content: ""; position: absolute; left: 50%; bottom: -8px; border: 8px solid transparent; border-bottom: 0; border-top-color: var(--sn-paper); transform: translateX(-50%); }',
    '.game-snap .sn-bubble.is-on { opacity: 1; transform: translate(-50%, -55%) scale(1); }',
    '.game-snap .sn-bubble.is-wrong { background: var(--vermilion); color: var(--sn-paper); }',
    '.game-snap .sn-bubble.is-wrong::after { border-top-color: var(--vermilion); }',
    /* the big SNAP button */
    '.game-snap .sn-snapbar { display: grid; justify-items: center; gap: 6px; margin-top: clamp(6px, 1.6vw, 14px); }',
    '.game-snap .sn-snap { width: min(100%, 520px); min-height: clamp(68px, 11vw, 92px); border: 0; border-radius: 22px; background: var(--gold); color: var(--on-era); font: 400 clamp(2.1rem, 1.6rem + 2.6vw, 3.4rem)/1 var(--font-poster); letter-spacing: .06em; box-shadow: 0 7px 0 var(--gold-shadow), 0 12px 24px var(--sn-shadow); transition: transform .08s ease, box-shadow .08s ease; touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }',
    '.game-snap .sn-snap:active, .game-snap .sn-snap.is-press { transform: translateY(6px); box-shadow: 0 1px 0 var(--gold-shadow), 0 4px 10px var(--sn-shadow); }',
    '.game-snap .sn-snap.is-shake { animation: game-snap-shake .4s ease; background: var(--vermilion); }',
    '@keyframes game-snap-shake { 0%, 100% { translate: 0; } 20% { translate: -10px; } 40% { translate: 9px; } 60% { translate: -6px; } 80% { translate: 4px; } }',
    '.game-snap .sn-snap:disabled { opacity: .55; }',
    '.game-snap .sn-keys { font-size: .9rem; color: var(--ink-muted); text-align: center; margin: 0; }',
    '.game-snap .sn-turns { justify-self: center; font-weight: 700; color: var(--ink-muted); }',
    '.game-snap .sn-turns b { font-family: var(--font-poster); font-weight: 400; color: var(--gold); font-size: 1.2em; }',
    /* flash and the SNAP! stamp */
    '.game-snap .sn-flash { position: absolute; inset: -8px; border-radius: 16px; background: var(--era); opacity: 0; pointer-events: none; z-index: 30; }',
    '.game-snap .sn-stamp { position: absolute; left: 50%; top: 50%; z-index: 31; pointer-events: none; font: 400 clamp(3rem, 2rem + 6vw, 6.5rem)/1 var(--font-poster); color: var(--gold); -webkit-text-stroke: 2px var(--sn-ink); text-shadow: 0 6px 0 var(--sn-ink); transform: translate(-50%, -50%) rotate(-8deg); opacity: 0; white-space: nowrap; }',
    '.game-snap .sn-flyer { position: absolute; z-index: 40; pointer-events: none; }',
    '@media (max-width: 520px) { .game-snap .game-toolbar { gap: .45rem; margin-bottom: .5rem; } .game-snap .seg button { padding: .35rem .7rem; } .game-snap .sn-name { font-size: .92rem; gap: 4px; } .game-snap .sn-avatar { width: 24px; height: 24px; } .game-snap .sn-seat { padding: 4px 3px 6px; } }',
    '@media (max-width: 359px) { .game-snap .seg button { padding: .3rem .5rem; font-size: .92rem; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'snap',
    frame: 'baize',
    mount: function (root, api) {
      var h = api.h;
      var reduced = !!api.reducedMotion;
      var rnd = api.random;

      /* ---- settings, remembered ---- */
      var opponents = api.store.get('opponents', 1) === 2 ? 2 : 1;
      var level = LEVELS[api.store.get('level', 'easy')] ? api.store.get('level', 'easy') : 'easy';
      var quick = api.store.get('length', 'full') === 'quick';
      var record = api.store.get('wins', 0) || 0;

      /* ---- state ---- */
      var players = [];     /* {name, human, down: [], up: [], out, el} ; down[0] is the top of the face-down pile */
      var turn = 0, turns = 0, over = false, lock = false;
      var timers = [];      /* every animation and message timer */
      var turnTimer = null; /* the next computer turn */
      var reacts = {};      /* computer index -> its pending Snap call */
      var rot = {};         /* card -> the little tilt it lands with */
      var holdUntil = 0, held = '', holdTimer = null;

      function later(ms, fn) { var id = setTimeout(function () { timers = timers.filter(function (t) { return t !== id; }); fn(); }, ms); timers.push(id); return id; }
      function clearAll() {
        timers.forEach(clearTimeout); timers = [];
        if (turnTimer) clearTimeout(turnTimer); turnTimer = null;
        if (holdTimer) clearTimeout(holdTimer); holdTimer = null;
        Object.keys(reacts).forEach(function (k) { clearTimeout(reacts[k]); }); reacts = {};
      }
      function pause(min, max) { return reduced ? 0 : Math.round(min + rnd() * (max - min)); }

      /* The status line. Big news (a Snap, a forfeit) stays up for a moment; "whose turn" waits until then. */
      function news(text) { api.status(text); holdUntil = Date.now() + (reduced ? 1200 : 1700); held = ''; }
      function routine(text) {
        var wait = holdUntil - Date.now();
        if (wait <= 0) { api.status(text); return; }
        held = text;
        if (holdTimer) clearTimeout(holdTimer);
        holdTimer = setTimeout(function () { holdTimer = null; if (held && !over) api.status(held); held = ''; }, wait);
      }

      root.appendChild(h('style', null, CSS));

      /* ---- toolbar ---- */
      function segButton(text, onclick) { return h('button', { type: 'button', 'aria-pressed': 'false', onclick: onclick }, text); }
      var opp1 = segButton('1 rival', function () { setOpponents(1); });
      var opp2 = segButton('2 rivals', function () { setOpponents(2); });
      var lvlBtns = {};
      Object.keys(LEVELS).forEach(function (k) { lvlBtns[k] = segButton(LEVELS[k].label, function () { setLevel(k); }); });
      var lenFull = segButton('Full game', function () { setLength(false); });
      var lenQuick = segButton('Quick game', function () { setLength(true); });
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(); table.focus({ preventScroll: true }); } }, 'New game');
      var opts = h('div', { class: 'sn-opts', id: 'sn-opts' },
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Computer players' }, opp1, opp2),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'How quick the computer is' }, lvlBtns.easy, lvlBtns.medium, lvlBtns.hard),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Length of game: play until one player has every card, or a quick game of ' + QUICK_TURNS + ' turns' }, lenFull, lenQuick));
      var optBtn = h('button', { class: 'btn sn-optbtn', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'sn-opts', onclick: function () {
        var open = !opts.classList.contains('is-open');
        opts.classList.toggle('is-open', open);
        optBtn.setAttribute('aria-expanded', String(open));
        api.sound('click');
      } }, 'Options');
      var toolbar = h('div', { class: 'game-toolbar' }, newBtn, optBtn, opts);

      var table = h('div', { class: 'sn-table', tabindex: '0', role: 'group', 'aria-label': 'Snap table. Enter turns your card. Space or S calls Snap.' });
      var turnsEl = h('p', { class: 'sn-turns', hidden: true }, 'Turns left ', h('b', null, String(QUICK_TURNS)));
      var oppsRow = h('div', { class: 'sn-row sn-opps' });
      var meRow = h('div', { class: 'sn-row sn-me-row' });
      var flash = h('div', { class: 'sn-flash', 'aria-hidden': 'true' });
      var stamp = h('div', { class: 'sn-stamp', 'aria-hidden': 'true' }, 'SNAP!');
      table.appendChild(turnsEl);
      table.appendChild(oppsRow);
      table.appendChild(meRow);
      table.appendChild(flash);
      table.appendChild(stamp);
      var snapBtn = h('button', { class: 'sn-snap', type: 'button', 'aria-label': 'Snap! Space or S' }, 'SNAP!');
      snapBtn.addEventListener('pointerdown', function (ev) { if (ev.button > 0) return; ev.preventDefault(); humanSnap(); });
      snapBtn.addEventListener('click', function (ev) { if (ev.detail === 0) humanSnap(); });   /* a screen reader's click */
      var snapbar = h('div', { class: 'sn-snapbar' }, snapBtn, h('p', { class: 'sn-keys' }, 'Keys: Enter turns your card. Space or S calls Snap.'));
      root.appendChild(toolbar);
      root.appendChild(table);
      root.appendChild(snapbar);
      root.appendChild(h('p', { class: 'game-note' }, 'Watch every face-up pile. When two top pictures match, hit SNAP before your rivals do. Call it wrongly and you pay a card to each player.'));

      /* ---- sizes: cards are as big as the table allows ---- */
      /* Wide screens seat everyone in one row (you in the middle), so all the piles are easy to compare.
         Phones put your rivals above you. */
      var wideNow = null;
      function fit() {
        if (!players.length || !players[0].el) return;
        var W = table.clientWidth || 300, n = players.length;
        var wide = W >= 640;
        if (wide !== wideNow) {
          wideNow = wide;
          if (wide) { (n === 3 ? [1, 0, 2] : [1, 0]).forEach(function (i) { oppsRow.appendChild(players[i].el.seat); }); }
          else players.forEach(function (p) { (p.human ? meRow : oppsRow).appendChild(p.el.seat); });
          meRow.hidden = wide;
        }
        if (wide) {
          var g = Math.max(16, Math.min(48, Math.round(W * 0.04)));
          var cw = Math.min(170, Math.floor((W - g * (n - 1) - n * 24) / (n * 1.42)), Math.floor((window.innerHeight || 800) * 0.36 / 1.4));
          setSizes(oppsRow, Math.max(90, cw), 0.6, g);
          return;
        }
        var gap = Math.max(8, Math.min(40, Math.round(W * 0.04)));
        var opp = opponents === 2 ? Math.min(118, Math.floor((W - gap - 24) / (2 * 1.42))) : Math.min(124, Math.floor((W - 24) / 1.6), Math.round(W * 0.4));
        var me = Math.min(140, Math.floor((W - 24) / 1.72));
        setSizes(oppsRow, opp, 0.52, gap);
        setSizes(meRow, me, 0.7, gap);
      }
      function setSizes(row, cw, downShare, gap) {
        row.style.setProperty('--cw', cw + 'px');
        row.style.setProperty('--dw', Math.round(cw * downShare) + 'px');
        row.style.setProperty('--tuck', Math.round(-cw * 0.1) + 'px');
        row.style.setProperty('--sn-gap', gap + 'px');
        row.classList.toggle('sn-small', cw < 96);
      }

      /* ---- building the seats ---- */
      function makeBack() { return h('div', { class: 'sn-back' }); }
      function makeSeat(p, idx) {
        var count = h('b', { class: 'sn-count' }, '0');
        var name = h('div', { class: 'sn-name' }, avatarSvg(p.human ? 'You' : p.name), h('span', null, p.human ? 'You' : p.name), count);
        var down;
        if (p.human) down = h('button', { class: 'sn-down', type: 'button', 'aria-label': 'Turn your top card', onclick: function () { humanTurn(); } }, makeBack(), makeBack(), makeBack(), h('span', { class: 'sn-down-label' }, 'Turn'));
        else down = h('div', { class: 'sn-down', 'aria-hidden': 'true' }, makeBack(), makeBack(), makeBack());
        var up = h('div', { class: 'sn-up is-empty', role: 'img', 'aria-label': 'empty' });
        var bubble = h('div', { class: 'sn-bubble', 'aria-hidden': 'true' }, 'Snap!');
        var seat = h('div', { class: 'sn-seat' + (p.human ? ' sn-me' : ''), 'data-player': String(idx) }, bubble, name, h('div', { class: 'sn-piles' }, down, up));
        p.el = { seat: seat, count: count, down: down, up: up, bubble: bubble, shown: '', bubbleTimer: null };
        return seat;
      }
      function makeCard(card) {
        return h('div', { class: 'sn-card', 'data-pic': String(picOf(card)), style: { '--rot': (rot[card] || 0) + 'deg' } }, pictureSvg(picOf(card)), h('span', { class: 'sn-label' }, PICTURES[picOf(card)].name));
      }

      /* ---- drawing ---- */
      function total(p) { return p.down.length + p.up.length; }
      function topPic(p) { return p.up.length ? picOf(p.up[p.up.length - 1]) : -1; }
      function drawSeat(p, isNew) {
        var e = p.el;
        e.count.textContent = String(total(p));
        e.seat.classList.toggle('is-turn', !over && players[turn] === p);
        e.seat.classList.toggle('is-out', p.out);
        e.down.classList.toggle('is-empty', !p.down.length);
        if (p.human) {
          var ready = !over && !lock && players[turn] === p && !p.out;
          e.down.disabled = !ready;
          e.down.classList.toggle('is-ready', ready && !reduced);
          e.down.setAttribute('aria-label', ready ? 'Turn your top card. ' + p.down.length + ' cards face down.' : p.down.length + ' cards face down. Wait for your turn.');
        }
        /* the face-up pile: the top card and up to two beneath it; rebuilt only when it changes */
        var shown = p.up.slice(-3), key = shown.join(',');
        if (key !== e.shown) {
          e.shown = key;
          e.up.replaceChildren();
          shown.forEach(function (card, i) {
            var el = makeCard(card);
            if (isNew && i === shown.length - 1 && !reduced) el.classList.add('is-new');
            e.up.appendChild(el);
          });
        }
        e.up.classList.toggle('is-empty', !shown.length);
        e.up.setAttribute('aria-label', (p.human ? 'Your' : p.name + "'s") + ' face-up pile: ' + (p.up.length ? 'a ' + PICTURES[topPic(p)].name : 'empty'));
        e.seat.setAttribute('data-top', p.up.length ? String(topPic(p)) : '');
        e.seat.setAttribute('data-count', String(total(p)));
      }
      function drawAll() {
        players.forEach(function (p) { drawSeat(p, false); });
        turnsEl.hidden = !quick;
        turnsEl.lastChild.textContent = String(Math.max(0, QUICK_TURNS - turns));
        table.setAttribute('data-turn', over ? 'over' : String(turn));
        table.setAttribute('data-lock', lock ? 'yes' : 'no');
        snapBtn.disabled = over;
      }
      function bump(p) { var c = p.el.count; c.classList.remove('is-bump'); void c.offsetWidth; c.classList.add('is-bump'); }
      function say(p, text, wrong) {
        var b = p.el.bubble;
        b.textContent = text;
        b.classList.toggle('is-wrong', !!wrong);
        b.classList.add('is-on');
        if (p.el.bubbleTimer) clearTimeout(p.el.bubbleTimer);
        p.el.bubbleTimer = later(950, function () { b.classList.remove('is-on'); p.el.bubbleTimer = null; });
      }

      /* ---- the deal ---- */
      function shuffle(list) {
        var a = list.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
      }
      function newGame() {
        /* shuffle first, before anything else uses the random numbers */
        var deck = shuffle(Array.apply(null, Array(64)).map(function (_, i) { return i; }));
        clearAll();
        rot = {};
        deck.forEach(function (c) { rot[c] = Math.round((rnd() - 0.5) * 12); });
        players = [{ name: 'You', human: true, down: [], up: [], out: false }];
        for (var i = 0; i < opponents; i++) players.push({ name: NAMES[i], human: false, down: [], up: [], out: false });
        /* deal one at a time, starting with you: the first card dealt is the top of your pile */
        deck.forEach(function (card, k) { players[k % players.length].down.push(card); });
        turn = 0; turns = 0; over = false; lock = false; holdUntil = 0;
        oppsRow.replaceChildren();
        meRow.replaceChildren();
        players.forEach(function (p, idx) { (p.human ? meRow : oppsRow).appendChild(makeSeat(p, idx)); });
        wideNow = null;
        fit();
        drawAll();
        syncButtons();
        api.sound('shuffle');
        api.status('Your turn: tap your pile to turn a card.');
      }

      /* ---- turning cards ---- */
      function activeCount() { return players.filter(function (p) { return !p.out; }).length; }
      function his(p) { return p.name === 'Albert' ? 'his' : 'her'; }
      function nextTurn() {
        if (over) return;
        for (var k = 1; k <= players.length; k++) {
          var j = (turn + k) % players.length;
          if (!players[j].out) { turn = j; break; }
        }
        drawAll();
        promptTurn();
      }
      function promptTurn() {
        var p = players[turn];
        if (over || !p) return;
        if (p.human) routine('Your turn: tap your pile to turn a card.');
        else { routine(p.name + "'s turn"); scheduleComputerTurn(); }
      }
      function scheduleComputerTurn() {
        if (turnTimer) clearTimeout(turnTimer);
        turnTimer = setTimeout(function () {
          turnTimer = null;
          if (!over && !lock && players[turn] && !players[turn].human) turnCard(turn);
        }, pause(350, 600));
      }
      function turnCard(idx) {
        if (over || lock || idx !== turn) return;
        var p = players[idx];
        if (!p.down.length) {
          if (!p.up.length) { knockOut(p); if (!checkEnd()) nextTurn(); return; }
          /* the face-down pile is used up: turn the face-up pile over and carry on */
          p.down = p.up; p.up = [];
          api.sound('shuffle');
          api.announce(p.human ? 'You turn your pile over.' : p.name + ' turns ' + his(p) + ' pile over.');
        }
        var card = p.down.shift();
        p.up.push(card);
        turns++;
        api.sound('flip');
        drawSeat(p, true);
        api.announce((p.human ? 'You turn ' : p.name + ' turns ') + 'a ' + PICTURES[picOf(card)].name + '.');
        computersWatch();
        if ((quick && turns >= QUICK_TURNS) || turns >= MAX_TURNS) { drawAll(); lastCall(); return; }
        nextTurn();
      }
      function humanTurn() {
        if (over || lock || !players[turn]) return;
        if (players[turn].human) { if (api.unlockSound) api.unlockSound(); turnCard(turn); }
        else { api.sound('tick'); routine('Wait for your turn: ' + players[turn].name + ' is turning.'); }
      }
      /* the last turn of a Quick game: a moment for one final Snap */
      function lastCall() {
        news('Last card! Any snaps?');
        later(reduced ? 1300 : 1600, function () { if (!over && !lock) finish(); });
      }

      /* ---- matches and Snap ---- */
      function matchingPlayers() {
        var byPic = {}, out = [];
        players.forEach(function (p, i) { var pic = topPic(p); if (pic >= 0) (byPic[pic] = byPic[pic] || []).push(i); });
        Object.keys(byPic).forEach(function (k) { if (byPic[k].length > 1) out = out.concat(byPic[k]); });
        return out;
      }
      function lookalikeShowing() {
        var tops = players.map(topPic).filter(function (x) { return x >= 0; });
        for (var i = 0; i < tops.length; i++) for (var j = 0; j < tops.length; j++) if (i !== j && LOOKALIKE[tops[i]] === tops[j]) return true;
        return false;
      }
      /* After every turn each computer looks at the table and decides whether to call Snap.
         A real match: it calls after its reaction time (unless it misses it).
         Two cards that only look alike: an Easy computer sometimes calls anyway, by mistake. */
      function computersWatch() {
        var match = matchingPlayers().length > 0, alike = !match && lookalikeShowing();
        var L = LEVELS[level];
        players.forEach(function (p, i) {
          if (p.human || p.out || reacts[i]) return;
          var reason = null;
          if (match) { if (rnd() >= L.miss) reason = 'match'; }
          else if (alike) { if (rnd() < L.oops) reason = 'oops'; }
          else if (rnd() < L.wild) reason = 'wild';
          if (!reason) return;
          reacts[i] = setTimeout(function () {
            delete reacts[i];
            if (over || lock || p.out) return;
            var now = matchingPlayers().length > 0;
            if (reason === 'match' && !now) return;            /* too slow: the match has gone */
            if (reason === 'oops' && !now && !lookalikeShowing()) return;
            callSnap(i);
          }, Math.round(L.min + rnd() * (L.max - L.min)));
        });
      }
      function humanSnap() {
        if (over || lock) return;
        if (api.unlockSound) api.unlockSound();
        snapBtn.classList.remove('is-press'); void snapBtn.offsetWidth; snapBtn.classList.add('is-press');
        later(120, function () { snapBtn.classList.remove('is-press'); });
        callSnap(0);
      }
      function callSnap(idx) {
        if (over || lock) return;
        var caller = players[idx];
        if (!caller || caller.out) return;
        var matched = matchingPlayers();
        Object.keys(reacts).forEach(function (k) { clearTimeout(reacts[k]); });
        reacts = {};
        if (turnTimer) { clearTimeout(turnTimer); turnTimer = null; }
        lock = true;
        drawAll();
        if (matched.length) winPiles(idx, matched);
        else falseSnap(idx);
      }
      /* A good Snap: the caller takes every matching face-up pile and puts it under their face-down pile. */
      function winPiles(idx, matched) {
        var caller = players[idx];
        matched.forEach(function (i) { players[i].el.up.classList.add('is-match'); });
        api.sound('clack');
        say(caller, 'Snap!');
        flashAndStamp();
        function gather() {
          var won = [];
          matched.forEach(function (i) { won = won.concat(players[i].up); players[i].up = []; players[i].el.up.classList.remove('is-match'); });
          caller.down = caller.down.concat(won);
          api.sound('thud');
          bump(caller);
          drawAll();
          if (caller.human) news('Snap! You win ' + won.length + ' cards.');
          else news(caller.name + ' called Snap first and wins ' + won.length + ' cards.');
          afterSnap();
        }
        if (reduced) { gather(); return; }
        later(360, function () {
          matched.forEach(function (i) { fly(players[i].el.up, caller.el.down, players[i].up.slice(-3), true); });
          later(440, gather);
        });
      }
      /* A wrong call: the caller pays one card from the bottom of their face-down pile to every other player. */
      function falseSnap(idx) {
        var caller = players[idx], paid = 0, to = [];
        api.sound('wrong');
        say(caller, caller.human ? 'Snap?' : 'Snap!', true);
        if (caller.human) { snapBtn.classList.remove('is-shake'); void snapBtn.offsetWidth; snapBtn.classList.add('is-shake'); later(450, function () { snapBtn.classList.remove('is-shake'); }); }
        players.forEach(function (p) {
          if (p === caller || p.out) return;
          var card = caller.down.length ? caller.down.pop() : caller.up.length ? caller.up.shift() : null;
          if (card == null) return;
          p.down.push(card); paid++; to.push(p);
          fly(caller.el.down, p.el.down, [card], false);
          bump(p);
        });
        if (caller.human) news('No match! You pay ' + (paid === 1 ? 'a card to ' + to[0].name : paid + ' cards, one to each rival') + '.');
        else news(caller.name + ' called Snap with no match and pays ' + (to.length > 1 ? 'everyone' : 'you') + ' a card!');
        later(reduced ? 0 : 520, function () { drawAll(); afterSnap(); });
      }
      function afterSnap() {
        players.forEach(function (p) { if (!p.out && !total(p)) knockOut(p); });
        lock = false;
        if (checkEnd()) return;
        if ((quick && turns >= QUICK_TURNS) || turns >= MAX_TURNS) { finish(); return; }
        if (players[turn].out) { nextTurn(); return; }
        drawAll();
        /* three alike, or a fresh pair: let the computers look again */
        if (matchingPlayers().length) computersWatch();
        promptTurn();
      }
      function knockOut(p) {
        if (p.out) return;
        p.out = true;
        api.sound('pop');
        if (!p.human) { say(p, 'I am out!'); api.announce(p.name + ' has no cards left and is out.'); }
      }

      /* ---- the end ---- */
      function checkEnd() {
        if (over) return true;
        if (players[0].out || activeCount() <= 1) { finish(); return true; }
        return false;
      }
      function finish() {
        if (over) return;
        over = true; lock = false;
        clearAll();
        players.forEach(function (p) { p.el.bubble.classList.remove('is-on'); });
        drawAll();
        var me = players[0];
        var best = Math.max.apply(null, players.map(total));
        var leaders = players.filter(function (p) { return total(p) === best; });
        /* a game that ran out of turns says so, so the count makes sense */
        var limit = quick ? QUICK_TURNS : MAX_TURNS;
        var why = !me.out && activeCount() > 1 && turns >= limit ? 'All ' + limit + ' turns are up! ' : '';
        if (!me.out && leaders.length === 1 && leaders[0] === me) {
          record++; api.store.set('wins', record);
          api.status(total(me) === 64 ? 'You win! You gathered all 64 cards.' : why + 'You win with ' + total(me) + ' cards!');
          api.celebrate(total(me) === 64 ? 'Snap champion! All 64 cards!' : 'You win with ' + total(me) + ' cards!');
        } else if (!me.out && leaders.indexOf(me) >= 0) {
          api.sound('bell');
          api.status(why + "It's a tie at " + best + ' cards each. Play again to break it!');
        } else {
          api.sound('lose');
          var w = leaders[0];
          api.status((me.out ? 'Out of cards! ' : why) + w.name + ' wins with ' + total(w) + ' cards. Well played: press New game for a rematch.');
        }
      }

      /* ---- juice: flash, stamp and flying cards ---- */
      function flashAndStamp() {
        if (reduced) { stamp.style.opacity = '1'; later(600, function () { stamp.style.opacity = '0'; }); return; }
        if (flash.animate) flash.animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.25 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' });
        if (stamp.animate) stamp.animate([
          { opacity: 0, transform: 'translate(-50%, -50%) rotate(-8deg) scale(2.4)' },
          { opacity: 1, transform: 'translate(-50%, -50%) rotate(-8deg) scale(.92)', offset: 0.28 },
          { opacity: 1, transform: 'translate(-50%, -50%) rotate(-8deg) scale(1)', offset: 0.75 },
          { opacity: 0, transform: 'translate(-50%, -50%) rotate(-8deg) scale(1.05)' }], { duration: 820, easing: 'ease-out' });
      }
      /* Cards slide from one pile to another: copies fly, and the real piles update when they land. */
      function fly(fromEl, toEl, cards, faceUp) {
        if (reduced || !cards.length) return;
        var t = table.getBoundingClientRect(), a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
        if (!a.width || !b.width) return;
        cards.forEach(function (card, i) {
          var el = faceUp ? makeCard(card) : h('div', { class: 'sn-back', style: { position: 'absolute', inset: '0' } });
          var box = h('div', { class: 'sn-flyer', style: { left: (a.left - t.left) + 'px', top: (a.top - t.top) + 'px', width: a.width + 'px', height: a.height + 'px', '--cw': a.width + 'px' } }, el);
          if (!box.animate) return;
          table.appendChild(box);
          var dx = b.left - a.left + (b.width - a.width) / 2, dy = b.top - a.top + (b.height - a.height) / 2, sc = b.width / a.width;
          var anim = box.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ') rotate(' + (i * 7 - 7) + 'deg)', opacity: 0.8 }],
            { duration: 420 + i * 40, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
          anim.onfinish = function () { box.remove(); };
        });
      }

      /* ---- settings ---- */
      function syncButtons() {
        opp1.setAttribute('aria-pressed', String(opponents === 1));
        opp2.setAttribute('aria-pressed', String(opponents === 2));
        Object.keys(lvlBtns).forEach(function (k) { lvlBtns[k].setAttribute('aria-pressed', String(level === k)); });
        lenFull.setAttribute('aria-pressed', String(!quick));
        lenQuick.setAttribute('aria-pressed', String(quick));
      }
      function restart() { api.sound('click'); newGame(); table.focus({ preventScroll: true }); }
      function setOpponents(n) { opponents = n; api.store.set('opponents', n); restart(); }
      function setLevel(k) { level = k; api.store.set('level', k); restart(); }
      function setLength(q) { quick = q; api.store.set('length', q ? 'quick' : 'full'); restart(); }

      /* ---- keyboard: Space or S calls Snap; Enter or T turns your card ---- */
      function onKey(ev) {
        if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.repeat) return;
        var t = ev.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        var onPage = t === document.body || t === document.documentElement;
        if (!root.contains(t) && !onPage) return;
        if (onPage) {
          /* nothing is focused: only play when the table is on screen, so Space still scrolls the story */
          var r = table.getBoundingClientRect();
          if (r.bottom < 0 || r.top > window.innerHeight) return;
        }
        var onControl = t && t.tagName === 'BUTTON' && toolbar.contains(t);
        var k = ev.key;
        if (k === ' ' || k === 'Spacebar' || k === 's' || k === 'S') {
          if (onControl && k !== 's' && k !== 'S') return;
          ev.preventDefault();
          humanSnap();
        } else if (k === 'Enter' || k === 't' || k === 'T') {
          if (onControl && k === 'Enter') return;
          ev.preventDefault();
          humanTurn();
        }
      }
      function onKeyUp(ev) {
        /* stop Space from also clicking a focused SNAP button or pile when the key comes back up */
        if ((ev.key === ' ' || ev.key === 'Enter') && ev.target && (ev.target === snapBtn || (ev.target.classList && ev.target.classList.contains('sn-down')))) ev.preventDefault();
      }
      document.addEventListener('keydown', onKey);
      document.addEventListener('keyup', onKeyUp);
      var ro = window.ResizeObserver ? new ResizeObserver(function () { fit(); }) : null;
      if (ro) ro.observe(table);
      function onResize() { fit(); }
      window.addEventListener('resize', onResize);

      syncButtons();
      newGame();

      return {
        destroy: function () {
          over = true;
          clearAll();
          if (ro) ro.disconnect();
          window.removeEventListener('resize', onResize);
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('keyup', onKeyUp);
          Array.prototype.forEach.call(table.querySelectorAll('.sn-flyer'), function (el) { el.remove(); });
        }
      };
    }
  });
})();
