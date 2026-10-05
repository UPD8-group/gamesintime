/* Five Letters for Games in Time.
   Guess the secret five-letter word in six tries. After each guess every letter changes colour:
     green with a tick       the right letter in the right place
     yellow with arrows      the letter is in the word, but somewhere else
     grey                    the letter is not in the word (or not again)
   There is one daily word, the same on every device that day, and as many practice words as you like.

   The mechanic is the 2021 web game by Josh Wardle, which grew out of the TV game Lingo (1987) and the
   pencil game Jotto (1955). The name, look, word lists and sounds here are our own.

   How the file is organised:
     Part 1  The word lists. The secret words were chosen by hand. The longer list of words you may guess
             was built from the free 12dicts word lists by Alan Beale (public domain), with rude words removed.
     Part 2  The rules. How a guess is coloured, including the tricky rule for double letters.
     Part 3  The computer. How it picks the daily word, and how it counts the words that still fit.
     Part 4  The screen. The board, the keyboard, the stats and the share grid.

   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  var LENGTH = 5;            /* letters in a word */
  var TRIES = 6;             /* guesses allowed */
  var DAY_MS = 86400000;     /* milliseconds in a day */
  var FIRST_DAY = Date.UTC(2026, 9, 1);   /* daily word number 1 was on 1 October 2026 */
  var FLIP_GAP = 260;        /* milliseconds between one tile turning over and the next */
  var FLIP_TIME = 520;       /* how long one tile takes to turn over */

  /* =====================================================================
     PART 1: THE WORD LISTS
     ===================================================================== */

  /* The secret words: 485 common words a 10-year-old knows, checked one by one by hand.
     Nothing rude, scary or sad, no brand names, and hardly any plurals. Australian spellings
     (metre, litre, fibre, ochre, mould, maths) and a few Aussie words (cuppa, footy, lolly, galah) are in.
     Changing this list changes which word falls on which day, so add words only before launch. */
  var ANSWERS = (
    'acorn actor album alive amber angle ankle apple apron arena arrow atlas attic aunty ' +
    'awake award ' +
    'badge bagel baker basil batch beach bench berry bilby birch black blank blaze blend ' +
    'blink block bloom blush board bonus booth brain brave bread brick brisk brook broom ' +
    'brown brush buddy build bumpy bunch bunny ' +
    'cabin cable camel candy canoe cargo catch cedar chain chair chalk champ charm chart ' +
    'chase cheek cheer chess chest chick child chill chime chirp choir chord chunk class ' +
    'clean click cliff climb clock cloth cloud coach coast cocoa comet comic coral couch ' +
    'court craft crane crate crawl cream creek crisp cross crowd crown crumb crust cuppa ' +
    'curly curry curve cycle ' +
    'dairy daisy dance delta diary digit diner dingo dizzy dodge dough dozen draft drain ' +
    'drama dream dress drift drill drink drive drone dusty ' +
    'eager eagle earth easel eight elbow email empty erase essay ' +
    'fable fairy fancy feast fence ferry fetch fibre field fifth fifty flake flame flash ' +
    'fleet float flock floor flour fluff flute foggy footy forty frame fresh frost fruit ' +
    'fudge funny fuzzy ' +
    'galah gecko giant glass glide globe glove goose grade grain grand grape graph grass ' +
    'gravy great green greet grill grove guess guest guide ' +
    'happy hatch heart heavy hedge hello heron hiker hippo hobby honey horse hotel house ' +
    'hover humid husky ' +
    'icing igloo ivory ' +
    'jelly jewel jolly judge juice juicy ' +
    'kayak knead knock koala ' +
    'label lemon lemur lever light lilac litre llama lodge lolly lucky lunar lunch ' +
    'magic mango manor maple march marsh match maths mayor medal melon merry metal metre ' +
    'mimic money month moose motor mould mouse mouth movie muddy mural music ' +
    'night ninth noisy north novel nudge nurse ' +
    'oasis ocean ochre olive onion opera orbit organ otter ' +
    'paint panda panel paper party pasta patch peace peach pearl pecan pedal penny perch ' +
    'petal phone photo piano pilot pinch pitch pixel pizza plane plank plant plate plaza ' +
    'poppy porch pouch prism prize proud prune pupil puppy ' +
    'quack queen quest quick quiet quilt ' +
    'radar radio rainy ranch rapid relax relay rhino rhyme rider ridge rinse river roast ' +
    'robin robot rocky rodeo route royal ruler rusty ' +
    'salad salty sandy sauce scarf scent scone scoop score scout scrub seven shade shake ' +
    'shape shark sheep sheet shelf shell shine shiny shirt shore shout silky silly sixth ' +
    'sixty skate skill skirt slate sleep slice slide slope sloth small smart smell smile ' +
    'snack snail snake snowy solar solve south space spade spark speak spell spice spicy ' +
    'spill spoon sport spray squad squid stack stage stair stamp steam steep stick stone ' +
    'stool stork storm story stove straw sugar sunny super swamp sweep sweet swift swing ' +
    'swirl ' +
    'table taste tasty teddy teeth tempo tenth thank three thumb tiger toast token torch ' +
    'towel tower track trail train treat trick truck trunk tulip tutor twirl twist ' +
    'uncle ' +
    'verse video visit vivid vocal voice vowel ' +
    'wafer wagon watch water weave whale wheat wheel whisk white windy world wrist ' +
    'yacht young ' +
    'zebra zesty '
  ).trim().split(' ');

  /* =====================================================================
     PART 2: THE RULES
     ===================================================================== */

  /* Colours one guess. Returns five marks, one per letter: 'right', 'near' or 'none'.

     Double letters are the tricky part. Each letter of the secret word can only light up ONE tile.
     So the computer works in two passes:
       Pass 1  Mark every letter in exactly the right place green, and cross those letters off the
               secret word.
       Pass 2  Go through the other letters from left to right. If the letter is still somewhere in what
               is left of the secret word, mark it yellow and cross that copy off. If not, it stays grey.
     Example: the secret word is ABBEY and you guess BABES.
       Pass 1  The B in the middle and the E are in the right places: green. Left over: A, B, Y.
       Pass 2  The first B is still left over: yellow. The A is left over: yellow. The S is not: grey.
     Example: the secret word is CRANE and you guess EERIE.
       Pass 1  The last E is in the right place: green. Left over: C, R, A, N (the only E is used up).
       Pass 2  The first two Es find no E left: grey. R is left over: yellow. I: grey. */
  function scoreGuess(guess, answer) {
    var marks = [], left = {}, i, ch;
    for (i = 0; i < LENGTH; i++) {
      if (guess.charAt(i) === answer.charAt(i)) marks[i] = 'right';
      else {
        marks[i] = 'none';
        ch = answer.charAt(i);
        left[ch] = (left[ch] || 0) + 1;      /* this letter of the secret word is still free */
      }
    }
    for (i = 0; i < LENGTH; i++) {
      if (marks[i] === 'right') continue;
      ch = guess.charAt(i);
      if (left[ch] > 0) { marks[i] = 'near'; left[ch]--; }
    }
    return marks;
  }

  function sameMarks(a, b) {
    for (var i = 0; i < LENGTH; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  var ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth'];

  /* Hard mode: every clue you have been given must be used. A green letter must stay in its place, and
     every green or yellow letter must be in the guess (twice, if two copies were found).
     Returns a message saying what is missing, or '' when the guess follows the rules. */
  function hardModeProblem(guess, rows) {
    for (var r = 0; r < rows.length; r++) {
      var word = rows[r].word, marks = rows[r].marks, need = {}, i, ch;
      for (i = 0; i < LENGTH; i++) {
        if (marks[i] === 'right' && guess.charAt(i) !== word.charAt(i)) {
          return 'Hard mode: the ' + ORDINAL[i] + ' letter must be ' + word.charAt(i).toUpperCase();
        }
        if (marks[i] !== 'none') { ch = word.charAt(i); need[ch] = (need[ch] || 0) + 1; }
      }
      for (ch in need) {
        if (count(guess, ch) < need[ch]) {
          return 'Hard mode: your guess must use ' + (need[ch] > 1 ? need[ch] + ' ' + ch.toUpperCase() + 's' : ch.toUpperCase());
        }
      }
    }
    return '';
  }
  function count(word, ch) { var n = 0; for (var i = 0; i < word.length; i++) if (word.charAt(i) === ch) n++; return n; }

  /* =====================================================================
     PART 3: THE COMPUTER
     ===================================================================== */

  /* A tiny random number maker that always gives the same numbers for the same seed (mulberry32).
     Every device runs the same sums, so every device shuffles the list into the same order. */
  function seededRandom(seed) {
    var t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      var x = Math.imul(t ^ (t >>> 15), 1 | t);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* The order of the daily words: the answer list shuffled once with a fixed seed (Fisher-Yates shuffle).
     Day 1 gets the first word in this order, day 2 the second, and so on. After 485 days it starts again. */
  var DAILY_ORDER = (function () {
    var order = ANSWERS.slice(), rand = seededRandom(20211001), i, j, t;
    for (i = order.length - 1; i > 0; i--) { j = Math.floor(rand() * (i + 1)); t = order[i]; order[i] = order[j]; order[j] = t; }
    return order;
  })();

  /* Today's daily word number, from the date on this device. 1 October 2026 is word 1.
     Using the calendar date (not the time) means everyone gets a new word at their own midnight. */
  function todayNumber() {
    var d = new Date();
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - FIRST_DAY) / DAY_MS) + 1;
  }
  function dailyWord(n) {
    var len = DAILY_ORDER.length;
    return DAILY_ORDER[(((n - 1) % len) + len) % len];
  }

  /* How many secret words still fit every clue so far. For each word in the answer list the computer
     pretends it is the secret word, colours each of your guesses against it, and keeps it only if every
     colour matches what you really saw. */
  function wordsThatFit(rows) {
    var n = 0;
    for (var a = 0; a < ANSWERS.length; a++) {
      var ok = true;
      for (var r = 0; r < rows.length && ok; r++) ok = sameMarks(scoreGuess(rows[r].word, ANSWERS[a]), rows[r].marks);
      if (ok) n++;
    }
    return n;
  }

  /* =====================================================================
     PART 4: THE SCREEN
     ===================================================================== */
  var P = '.game-five-letters ';
  var CSS = [
    '.game-five-letters { container: fl / inline-size; --fl-right: var(--green, #6aaa64); --fl-near: var(--straw, #c9b458); --fl-none: #3a3f47;' +
      ' --fl-edge: #3a3f47; --fl-typed: #8a909b; --fl-key: #4a505b; --fl-tile-ink: #ffffff; color: var(--ink); font-family: var(--font-body); }',
    /* colour-blind colours: orange and blue */
    '.game-five-letters.is-cb { --fl-right: #ff7a3d; --fl-near: #4da3ff; }',
    P + '.fl-card { position: relative; max-width: 560px; margin: 0 auto; border-radius: 28px; padding: 18px 18px 16px; border: 1px solid var(--line);' +
      ' background: radial-gradient(120% 60% at 50% -12%, color-mix(in srgb, var(--fl-right) 20%, transparent), transparent 62%),' +
      ' radial-gradient(70% 50% at 105% 105%, color-mix(in srgb, var(--cobalt, #b18cff) 18%, transparent), transparent 62%), var(--surface, #1c2027);' +
      ' box-shadow: 0 2px 0 rgba(255, 255, 255, .04) inset, 0 24px 60px rgba(0, 0, 0, .45); }',
    P + 'button { font: inherit; }',
    /* ----- top row: Daily or Practice, and Stats ----- */
    P + '.fl-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 10px; margin-bottom: 12px; }',
    P + '.fl-top .seg button { min-height: 40px; padding: .35rem .95rem; }',
    P + '.fl-sub { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 40px; margin: -4px 0 8px; }',
    P + '.fl-tag { font-family: var(--font-mono); font-size: .76rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-muted); }',
    P + '.fl-iconbtn { min-height: 40px; min-width: 40px; padding: .3rem .8rem; border-radius: 999px; border: 2px solid var(--line); background: transparent; color: var(--ink); font-weight: 700; cursor: pointer; }',
    P + '.fl-iconbtn:hover { border-color: var(--fl-right); }',
    P + '.fl-iconbtn[aria-expanded="true"] { background: var(--ink); color: var(--bg); border-color: var(--ink); }',
    /* ----- the board ----- */
    P + '.fl-board { display: grid; grid-template-rows: repeat(6, 1fr); gap: 6px; width: min(100%, 318px); margin: 0 auto; padding: 4px; border-radius: 12px; outline: none; }',
    P + '.fl-board:focus-visible { outline: 3px solid var(--focus); outline-offset: 4px; }',
    P + '.fl-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }',
    P + '.fl-tile { position: relative; aspect-ratio: 1 / 1; display: grid; place-items: center; border: 2px solid var(--fl-edge); border-radius: 6px; background: transparent;' +
      ' font-family: var(--font-head); font-weight: 800; font-size: clamp(1.45rem, 1rem + 2.2cqi, 2rem); line-height: 1; text-transform: uppercase; color: var(--ink); user-select: none; -webkit-user-select: none; }',
    P + '.fl-tile.is-typed { border-color: var(--fl-typed); }',
    P + '.fl-tile.is-pop { animation: fl-pop .12s ease-out; }',
    '@keyframes fl-pop { 0% { transform: scale(.86); } 60% { transform: scale(1.1); } 100% { transform: none; } }',
    P + '.fl-tile.is-right, ' + P + '.fl-tile.is-near, ' + P + '.fl-tile.is-none { color: var(--fl-tile-ink); border-color: transparent; }',
    P + '.fl-tile.is-right { --fl-bg: var(--fl-right); background: var(--fl-bg); }',
    P + '.fl-tile.is-near { --fl-bg: var(--fl-near); background: var(--fl-bg); }',
    P + '.fl-tile.is-none { --fl-bg: var(--fl-none); background: var(--fl-bg); }',
    /* the little marks that mean the colours never have to be the only clue */
    P + '.fl-mark { position: absolute; top: 3px; right: 4px; font-family: system-ui, sans-serif; font-size: .74rem; font-weight: 900; line-height: 1; opacity: .95; }',
    P + '.fl-tile:not(.is-right):not(.is-near) .fl-mark { display: none; }',
    /* a tile turns over to show its colour: the colour swaps half way, while the tile is edge-on */
    P + '.fl-tile.is-flip { animation: fl-flip ' + FLIP_TIME + 'ms ease-in-out var(--fl-d, 0ms) both; }',
    '@keyframes fl-flip { 0% { transform: rotateX(0); background: transparent; border-color: var(--fl-typed); color: var(--ink); }' +
      ' 49.9% { transform: rotateX(90deg); background: transparent; border-color: var(--fl-typed); color: var(--ink); }' +
      ' 50% { transform: rotateX(90deg); background: var(--fl-bg); border-color: transparent; color: var(--fl-tile-ink); }' +
      ' 100% { transform: rotateX(0); background: var(--fl-bg); border-color: transparent; color: var(--fl-tile-ink); } }',
    P + '.fl-tile.is-flip .fl-mark { animation: fl-markin ' + FLIP_TIME + 'ms step-end var(--fl-d, 0ms) both; }',
    '@keyframes fl-markin { 0% { opacity: 0; } 50% { opacity: .95; } }',
    P + '.fl-row.is-shake { animation: fl-shake .4s ease; }',
    '@keyframes fl-shake { 10%, 90% { transform: translateX(-2px); } 20%, 80% { transform: translateX(4px); } 30%, 50%, 70% { transform: translateX(-7px); } 40%, 60% { transform: translateX(7px); } }',
    P + '.fl-tile.is-jump { animation: fl-jump .5s ease var(--fl-d, 0ms); }',
    '@keyframes fl-jump { 0%, 100% { transform: none; } 40% { transform: translateY(-26%); } 60% { transform: translateY(4%); } }',
    /* ----- the message bubble over the board ----- */
    P + '.fl-stage { position: relative; }',
    P + '.fl-msg { position: absolute; left: 50%; top: 8px; transform: translateX(-50%); z-index: 3; pointer-events: none; max-width: 92%; text-align: center;' +
      ' background: var(--ink); color: var(--bg); font-weight: 800; padding: .55rem 1rem; border-radius: 10px; box-shadow: 0 8px 22px rgba(0, 0, 0, .45); }',
    P + '.fl-msg.is-in { animation: fl-msgin .18s ease-out; }',
    '@keyframes fl-msgin { from { opacity: 0; transform: translate(-50%, -6px); } }',
    /* ----- the keyboard: QWERTY on wide screens, A to Z in rows of seven on phones (bigger keys) ----- */
    P + '.fl-keys { display: grid; grid-template-columns: repeat(20, minmax(0, 1fr)); gap: 6px; margin: 14px auto 0; max-width: 500px; touch-action: manipulation; }',
    P + '.fl-key { grid-row: var(--qr); grid-column: var(--qc) / span var(--qs, 2); min-height: 54px; min-width: 0; padding: 0; border: 0; border-radius: 8px;' +
      ' background: var(--fl-key); color: #ffffff; font-family: var(--font-head); font-weight: 800; font-size: 1.12rem; text-transform: uppercase; cursor: pointer; position: relative;' +
      ' transition: background-color .15s, transform .08s; -webkit-tap-highlight-color: transparent; }',
    P + '.fl-key:hover { filter: brightness(1.12); }',
    P + '.fl-key:active { transform: translateY(1px) scale(.97); }',
    P + '.fl-key.is-wide { font-size: .78rem; letter-spacing: .02em; }',
    P + '.fl-key.is-right { background: var(--fl-right); }',
    P + '.fl-key.is-near { background: var(--fl-near); }',
    P + '.fl-key.is-none { background: #2a2e35; color: #8d939d; }',
    P + '.fl-key .fl-mark { top: 3px; right: 4px; font-size: .62rem; }',
    P + '.fl-key:not(.is-right):not(.is-near) .fl-mark { display: none; }',
    /* ----- the end of a game ----- */
    P + '.fl-end { margin: 14px auto 0; max-width: 500px; text-align: center; display: grid; gap: 12px; justify-items: center; }',
    P + '.fl-end.is-in { animation: fl-rise .4s cubic-bezier(.2, 1.3, .4, 1) both; }',
    '@keyframes fl-rise { from { opacity: 0; transform: translateY(14px); } }',
    P + '.fl-end h3 { font-family: var(--font-head); font-size: clamp(1.4rem, 1.1rem + 2cqi, 1.9rem); }',
    P + '.fl-answer { font-family: var(--font-head); font-weight: 800; letter-spacing: .18em; font-size: 1.35rem; color: var(--fl-right); }',
    P + '.fl-trail { font-size: .95rem; color: var(--ink-muted); }',
    P + '.fl-trail b { color: var(--ink); font-variant-numeric: tabular-nums; }',
    P + '.fl-endbtns { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }',
    P + '.fl-share-text { width: 100%; max-width: 320px; min-height: 9.5em; font: 1rem/1.25 ui-monospace, Menlo, Consolas, monospace; padding: .6rem; border-radius: 10px;' +
      ' border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); resize: none; user-select: text; -webkit-user-select: text; }',
    P + '.fl-next { font-variant-numeric: tabular-nums; color: var(--ink-muted); font-weight: 600; }',
    /* ----- stats ----- */
    P + '.fl-stats { margin: 0 auto 14px; max-width: 460px; padding: 14px; border-radius: 16px; background: var(--surface-2); border: 1px solid var(--line); }',
    P + '.fl-end .fl-stats { margin: 0; width: 100%; }',
    P + '.fl-nums { list-style: none; margin: 0 0 12px; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; }',
    P + '.fl-nums li { margin: 0; display: grid; gap: 2px; }',
    P + '.fl-nums b { font-family: var(--font-head); font-size: 1.7rem; line-height: 1; font-variant-numeric: tabular-nums; }',
    P + '.fl-nums span { font-size: .74rem; color: var(--ink-muted); line-height: 1.2; }',
    P + '.fl-dist { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }',
    P + '.fl-dist li { margin: 0; display: grid; grid-template-columns: 1.1rem 1fr; gap: 6px; align-items: center; font-weight: 700; font-size: .9rem; }',
    P + '.fl-bar { justify-self: start; min-width: 1.8rem; padding: .1rem .45rem; border-radius: 4px; background: var(--fl-none); color: #fff; text-align: right; font-variant-numeric: tabular-nums;' +
      ' transition: width .5s ease; }',
    P + '.fl-dist li.is-now .fl-bar { background: var(--fl-right); }',
    P + '.fl-stats-head { font-family: var(--font-head); font-size: 1.1rem; margin-bottom: 10px; text-align: center; }',
    P + '.fl-prac { margin-top: 10px; font-size: .85rem; color: var(--ink-muted); text-align: center; }',
    /* ----- settings and the legend ----- */
    P + '.fl-foot { display: flex; flex-wrap: wrap; gap: 8px 10px; align-items: center; justify-content: center; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line); }',
    P + '.fl-toggle { min-height: 40px; padding: .3rem .85rem; border-radius: 999px; border: 2px solid var(--line); background: transparent; color: var(--ink-muted); font-weight: 700; cursor: pointer; }',
    P + '.fl-toggle[aria-pressed="true"] { color: var(--ink); border-color: var(--fl-right); background: color-mix(in srgb, var(--fl-right) 22%, transparent); }',
    P + '.fl-legend { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 14px; font-size: .88rem; color: var(--ink-muted); }',
    P + '.fl-legend li { margin: 0; display: inline-flex; align-items: center; gap: 6px; }',
    P + '.fl-swatch { position: relative; width: 24px; height: 24px; border-radius: 4px; display: inline-block; flex: none; }',
    P + '.fl-swatch .fl-mark { top: 2px; right: 3px; font-size: .62rem; color: #fff; }',
    /* phones: A to Z keys, seven to a row, so every key is at least 36 pixels wide */
    '@container fl (max-width: 430px) {',
    P + '.fl-card { padding: 12px 10px 12px; border-radius: 22px; }',
    P + '.fl-keys { grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 5px; }',
    P + '.fl-key { grid-row: var(--ar); grid-column: var(--ac) / span 1; min-height: 46px; }',
    P + '.fl-key.is-wide { font-size: .7rem; }',
    P + '.fl-board { gap: 5px; } ' + P + '.fl-row { gap: 5px; }',
    P + '.fl-long { display: none; }',
    P + '.fl-legend { font-size: .82rem; }',
    '}',
    '@container fl (max-width: 330px) { ' + P + '.fl-card { padding: 10px 4px; } ' + P + '.fl-keys { gap: 4px; } }',
    /* classroom mode: everything bigger for the projector */
    '.classroom ' + P + '.fl-card { max-width: 760px; }',
    '.classroom ' + P + '.fl-board { width: min(100%, 420px); }',
    '.classroom ' + P + '.fl-keys { max-width: 680px; }',
    '@media (prefers-reduced-motion: reduce) { ' + P + '.fl-tile, ' + P + '.fl-row, ' + P + '.fl-msg, ' + P + '.fl-end, ' + P + '.fl-mark { animation: none !important; } }'
  ].join('\n');

  /* Where each key sits. QWERTY: a 20-column grid (each key is 2 columns wide, so rows can be offset
     by half a key). A to Z: a 7-column grid. [row, column, span] for each. */
  var QWERTY = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  var ABC = ['abcdefg', 'hijklmn', 'opqrstu', 'vwxyz'];
  function keyPlaces(key) {
    var q, a, r, i;
    if (key === 'enter') { q = [3, 1, 3]; a = [4, 1]; }
    else if (key === 'back') { q = [3, 18, 3]; a = [4, 7]; }
    else {
      for (r = 0; r < QWERTY.length; r++) { i = QWERTY[r].indexOf(key); if (i >= 0) q = [r + 1, (r === 0 ? 1 : r === 1 ? 2 : 4) + i * 2, 2]; }
      for (r = 0; r < ABC.length; r++) { i = ABC[r].indexOf(key); if (i >= 0) a = [r + 1, (r === 3 ? 2 : 1) + i]; }
    }
    return { '--qr': q[0], '--qc': q[1], '--qs': q[2], '--ar': a[0], '--ac': a[1] };
  }

  var MARK_TEXT = { right: '✓', near: '↔', none: '' };
  var SAY = { right: 'right place', near: 'in the word, wrong place', none: 'not in the word' };
  var PRAISE = ['First guess! Unbelievable!', 'Two guesses. Brilliant!', 'Three guesses. Superb!', 'Four guesses. Great work!', 'Five guesses. Nicely done!', 'Six guesses. Phew, just in time!'];

  GamesInTime.register({
    id: 'five-letters',
    frame: 'none',     /* the game draws its own dark 2020s app card */
    mount: function (root, api) {
      var h = api.h;
      var RM = !!api.reducedMotion;
      root.appendChild(h('style', null, CSS));

      /* The words you may guess: the secret words plus the longer list (Part 1), as a lookup table. */
      var allowed = {};
      ANSWERS.forEach(function (w) { allowed[w] = true; });
      moreWords().trim().split(' ').forEach(function (w) { allowed[w] = true; });

      /* ---- remembered between visits ---- */
      var hard = api.store.get('hard', false) === true;
      var colourBlind = api.store.get('cb', false) === true;
      var stats = api.store.get('stats', null);
      if (!stats || !stats.dist || stats.dist.length !== TRIES) stats = { played: 0, won: 0, streak: 0, best: 0, lastDay: null, lastWonDay: null, dist: [0, 0, 0, 0, 0, 0] };
      var practice = api.store.get('practice', { played: 0, won: 0 });

      /* ---- the game being played ---- */
      var game = null;           /* { mode, day, answer, rows: [{word, marks}], typed, over, won, hard } */
      var busy = false;          /* true while tiles are turning over: typing waits */
      var keyState = {};         /* letter -> best mark seen so far */
      var recent = [];           /* practice words used lately, so they do not come straight back */
      var timers = [];
      var msgTimer = null, clockTimer = null;
      var destroyed = false;

      function later(fn, ms) {
        var id = setTimeout(function () { var k = timers.indexOf(id); if (k >= 0) timers.splice(k, 1); if (!destroyed) fn(); }, ms);
        timers.push(id);
        return id;
      }

      /* ---- top row ---- */
      var dailyBtn = h('button', { type: 'button', 'aria-pressed': 'true', onclick: function () { api.sound('click'); startDaily(); } }, 'Daily', h('span', { class: 'fl-long' }, ' word'));
      var practiceBtn = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { api.sound('click'); startPractice(); } }, 'Practice');
      var tag = h('span', { class: 'fl-tag' });
      var statsBtn = h('button', { type: 'button', class: 'fl-iconbtn', 'aria-expanded': 'false', 'aria-controls': 'fl-stats-panel', onclick: toggleStats }, 'Stats');
      var newBtn = h('button', { type: 'button', class: 'fl-iconbtn', hidden: true, onclick: function () { api.sound('click'); startPractice(); } }, 'New word');
      var top = h('div', { class: 'fl-top' },
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Which word' }, dailyBtn, practiceBtn),
        statsBtn);
      var sub = h('div', { class: 'fl-sub' }, tag, newBtn);
      var statsPanel = h('section', { class: 'fl-stats', id: 'fl-stats-panel', hidden: true, 'aria-label': 'Your daily word stats' });

      /* ---- the board: six rows of five tiles ---- */
      var board = h('div', { class: 'fl-board', tabindex: '0', role: 'group', 'aria-label': 'Your guesses. Type a five-letter word, then press Enter.', 'aria-describedby': 'fl-legend' });
      var rowsEl = [], tiles = [];
      for (var r = 0; r < TRIES; r++) {
        var rowEl = h('div', { class: 'fl-row', role: 'group', 'aria-label': 'Guess ' + (r + 1) });
        rowEl.addEventListener('animationend', function (ev) { if (ev.target === ev.currentTarget) ev.currentTarget.classList.remove('is-shake'); });
        var rowTiles = [];
        for (var c = 0; c < LENGTH; c++) {
          var t = h('div', { class: 'fl-tile', 'aria-label': 'empty' }, h('span', { class: 'fl-letter' }), h('span', { class: 'fl-mark', 'aria-hidden': 'true' }));
          t.addEventListener('animationend', onTileAnimEnd);
          rowTiles.push(t);
          rowEl.appendChild(t);
        }
        rowsEl.push(rowEl);
        tiles.push(rowTiles);
        board.appendChild(rowEl);
      }
      function onTileAnimEnd(ev) {
        if (ev.target !== ev.currentTarget) return;
        ev.currentTarget.classList.remove('is-pop', 'is-jump');
      }
      var msg = h('div', { class: 'fl-msg', hidden: true, 'aria-hidden': 'true' });
      var stage = h('div', { class: 'fl-stage' }, board, msg);

      /* ---- the keyboard ---- */
      var keys = h('div', { class: 'fl-keys', role: 'group', 'aria-label': 'Keyboard' });
      var keyEls = {};
      'qwertyuiopasdfghjklzxcvbnm'.split('').concat(['enter', 'back']).forEach(function (k) {
        var label = k === 'enter' ? 'Enter' : k === 'back' ? '⌫' : k;
        var b = h('button', {
          type: 'button', class: 'fl-key' + (k.length > 1 ? ' is-wide' : ''), tabindex: '-1', style: keyPlaces(k), 'data-key': k,
          'aria-label': k === 'enter' ? 'Enter, check the word' : k === 'back' ? 'Delete a letter' : k.toUpperCase()
        }, h('span', { 'aria-hidden': k === 'back' ? 'true' : null }, label), h('span', { class: 'fl-mark', 'aria-hidden': 'true' }));
        /* Keep the focus where it is, so the next Enter on a real keyboard checks the word instead of
           pressing this key again. */
        b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        b.addEventListener('click', function () { api.unlockSound(); press(k); });
        keyEls[k] = b;
        keys.appendChild(b);
      });

      /* ---- the end of a game ---- */
      var endEl = h('section', { class: 'fl-end', hidden: true, 'aria-label': 'Result' });

      /* ---- settings and the legend ---- */
      var hardBtn = h('button', { type: 'button', class: 'fl-toggle', 'aria-pressed': String(hard), onclick: toggleHard }, 'Hard mode');
      var cbBtn = h('button', { type: 'button', class: 'fl-toggle', 'aria-pressed': String(colourBlind), onclick: toggleColours }, 'Colour-blind colours');
      function swatch(kind) { return h('span', { class: 'fl-swatch', style: { background: 'var(--fl-' + kind + ')' } }, h('span', { class: 'fl-mark', 'aria-hidden': 'true' }, MARK_TEXT[kind])); }
      var legend = h('ul', { class: 'fl-legend', id: 'fl-legend' },
        h('li', null, swatch('right'), 'Tick: right letter, right place'),
        h('li', null, swatch('near'), 'Arrows: in the word, wrong place'),
        h('li', null, swatch('none'), 'Grey: not in the word'));

      var card = h('div', { class: 'fl-card' }, top, statsPanel, sub, stage, keys, endEl, h('div', { class: 'fl-foot' }, hardBtn, cbBtn), legend);
      root.appendChild(card);
      root.classList.toggle('is-cb', colourBlind);

      /* =========================== starting a game =========================== */
      function startDaily() {
        var day = todayNumber();
        var saved = api.store.get('daily', null);
        var answer = dailyWord(day);
        game = { mode: 'daily', day: day, answer: answer, rows: [], typed: '', over: false, won: false, hard: hard };
        if (saved && saved.day === day && saved.answer === answer && saved.words) {
          /* carry on with today's word, exactly where you left it */
          saved.words.forEach(function (w) { game.rows.push({ word: w, marks: scoreGuess(w, answer) }); });
          game.over = !!saved.over;
          game.won = !!saved.won;
          game.hard = !!saved.hard;
        }
        setUp();
      }
      function startPractice() {
        var pick, tries = 0, today = dailyWord(todayNumber());
        do { pick = ANSWERS[Math.floor(api.random() * ANSWERS.length)]; tries++; }
        while ((pick === today || recent.indexOf(pick) >= 0) && tries < 50);
        recent.push(pick);
        if (recent.length > 40) recent.shift();
        game = { mode: 'practice', day: null, answer: pick, rows: [], typed: '', over: false, won: false, hard: hard };
        setUp();
      }
      function setUp() {
        busy = false;
        clearTimers();
        dailyBtn.setAttribute('aria-pressed', String(game.mode === 'daily'));
        practiceBtn.setAttribute('aria-pressed', String(game.mode === 'practice'));
        newBtn.hidden = game.mode !== 'practice';
        tag.textContent = game.mode === 'daily' ? 'No. ' + game.day + ' · ' + shortDate() : 'Practice';
        keyState = {};
        game.rows.forEach(function (row) { learnKeys(row); });
        drawBoard();
        drawKeys();
        hideMessage();
        if (game.over) showEnd(false);
        else { endEl.hidden = true; keys.hidden = false; }
        if (!statsPanel.hidden) drawStats(statsPanel);
        sayStatus();
      }
      function shortDate() {
        var d = new Date();
        return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
      }
      function sayStatus() {
        if (!game) return;
        var name = game.mode === 'daily' ? 'Daily word ' + game.day : 'Practice word';
        if (game.over) {
          api.status(game.won ? name + ': solved in ' + game.rows.length + '!' : name + ': the word was ' + game.answer.toUpperCase() + '.');
        } else {
          api.status(name + ' · guess ' + (game.rows.length + 1) + ' of ' + TRIES + (game.hard ? ' · hard mode' : ''));
        }
      }

      /* =========================== drawing =========================== */
      function setTile(t, letter, mark) {
        t.firstChild.textContent = letter ? letter.toUpperCase() : '';
        t.lastChild.textContent = mark ? MARK_TEXT[mark] : '';
        t.className = 'fl-tile' + (mark ? ' is-' + mark : letter ? ' is-typed' : '');
        t.setAttribute('aria-label', letter ? letter.toUpperCase() + (mark ? ', ' + SAY[mark] : '') : 'empty');
      }
      function drawBoard() {
        for (var r = 0; r < TRIES; r++) {
          var row = game.rows[r];
          for (var c = 0; c < LENGTH; c++) {
            if (row) setTile(tiles[r][c], row.word.charAt(c), row.marks[c]);
            else if (r === game.rows.length && !game.over) setTile(tiles[r][c], game.typed.charAt(c), null);
            else setTile(tiles[r][c], '', null);
          }
        }
      }
      var RANK = { none: 1, near: 2, right: 3 };
      function learnKeys(row) {
        for (var c = 0; c < LENGTH; c++) {
          var L = row.word.charAt(c), m = row.marks[c];
          if (!keyState[L] || RANK[m] > RANK[keyState[L]]) keyState[L] = m;
        }
      }
      function drawKeys() {
        Object.keys(keyEls).forEach(function (k) {
          if (k.length > 1) return;
          var m = keyState[k], b = keyEls[k];
          b.className = 'fl-key' + (m ? ' is-' + m : '');
          b.lastChild.textContent = m ? MARK_TEXT[m] : '';
          b.setAttribute('aria-label', k.toUpperCase() + (m ? ', ' + SAY[m] : ''));
        });
      }

      function showMessage(text, ms) {
        clearTimeout(msgTimer);
        msg.textContent = text;
        msg.hidden = false;
        msg.classList.remove('is-in');
        void msg.offsetWidth;          /* restart the little drop-in animation */
        msg.classList.add('is-in');
        api.announce(text);
        msgTimer = setTimeout(hideMessage, ms || 1800);
      }
      function hideMessage() { clearTimeout(msgTimer); msg.hidden = true; }

      function shakeRow() {
        var rowEl = rowsEl[game.rows.length];
        if (!rowEl) return;
        if (RM) return;
        rowEl.classList.remove('is-shake');
        void rowEl.offsetWidth;
        rowEl.classList.add('is-shake');
      }

      /* =========================== typing =========================== */
      function press(k) {
        if (!game || game.over || busy) return;
        if (k === 'enter') submit();
        else if (k === 'back') {
          if (!game.typed) return;
          game.typed = game.typed.slice(0, -1);
          setTile(tiles[game.rows.length][game.typed.length], '', null);
          api.sound('tick');
        } else if (/^[a-z]$/.test(k)) {
          if (game.typed.length >= LENGTH) return;
          var t = tiles[game.rows.length][game.typed.length];
          game.typed += k;
          setTile(t, k, null);
          if (!RM) { t.classList.remove('is-pop'); void t.offsetWidth; t.classList.add('is-pop'); }
          if (api.tone) api.tone(520 + game.typed.length * 70, 0.05, 'triangle', 0.05);
          else api.sound('tick');
        }
      }

      function submit() {
        var guess = game.typed;
        if (guess.length < LENGTH) { api.sound('wrong'); shakeRow(); showMessage('Not enough letters'); return; }
        if (!allowed[guess]) { api.sound('wrong'); shakeRow(); showMessage(guess.toUpperCase() + ' is not in the word list'); return; }
        if (game.hard) {
          var problem = hardModeProblem(guess, game.rows);
          if (problem) { api.sound('wrong'); shakeRow(); showMessage(problem, 2600); return; }
        }
        var marks = scoreGuess(guess, game.answer);
        var rowIndex = game.rows.length;
        game.rows.push({ word: guess, marks: marks });
        game.typed = '';
        game.won = marks.every(function (m) { return m === 'right'; });
        game.over = game.won || game.rows.length >= TRIES;
        if (game.mode === 'daily') saveDaily();
        if (game.over) recordResult();
        reveal(rowIndex, guess, marks);
      }

      /* Turn the tiles over one at a time, with a note for each: high for green, middle for yellow, low for grey. */
      var NOTES = [523, 587, 659, 784, 880];   /* C D E G A: five greens in a row play a happy scale */
      function reveal(r, guess, marks) {
        busy = true;
        var gap = RM ? 0 : FLIP_GAP;
        for (var c = 0; c < LENGTH; c++) {
          (function (c) {
            var t = tiles[r][c];
            setTile(t, guess.charAt(c), marks[c]);
            if (!RM) { t.style.setProperty('--fl-d', (c * gap) + 'ms'); t.classList.add('is-flip'); }
            later(function () {
              var m = marks[c];
              if (api.tone) {
                if (m === 'right') api.tone(NOTES[c], 0.22, 'triangle', 0.12);
                else if (m === 'near') api.tone(NOTES[c] / 1.5, 0.2, 'sine', 0.12);
                else api.tone(150, 0.12, 'triangle', 0.08);
              } else api.sound('flip');
            }, c * gap + (RM ? 0 : FLIP_TIME / 2));
          })(c);
        }
        later(function () {
          for (var c = 0; c < LENGTH; c++) { tiles[r][c].classList.remove('is-flip'); tiles[r][c].style.removeProperty('--fl-d'); }
          learnKeys(game.rows[r]);
          drawKeys();
          busy = false;
          api.announce('Guess ' + (r + 1) + ', ' + guess.toUpperCase() + ': ' + marks.map(function (m, i) { return guess.charAt(i).toUpperCase() + ' ' + SAY[m]; }).join('. ') + '.');
          if (game.won) win(r);
          else if (game.over) lose();
          else sayStatus();
        }, RM ? 0 : (LENGTH - 1) * gap + FLIP_TIME + 40);
      }

      function win(r) {
        showMessage(PRAISE[r], 2400);
        if (!RM) tiles[r].forEach(function (t, c) { t.style.setProperty('--fl-d', (c * 90) + 'ms'); t.classList.add('is-jump'); });
        later(function () {
          api.celebrate(game.mode === 'daily' ? 'Daily word solved in ' + (r + 1) + '!' : 'Solved in ' + (r + 1) + '!');
          showEnd(true);
          sayStatus();
        }, RM ? 300 : 1000);
      }
      function lose() {
        api.sound('lose');
        showMessage('The word was ' + game.answer.toUpperCase(), 3000);
        later(function () { showEnd(true); sayStatus(); }, RM ? 300 : 900);
      }

      /* =========================== saving =========================== */
      function saveDaily() {
        api.store.set('daily', { day: game.day, answer: game.answer, words: game.rows.map(function (r) { return r.word; }), over: game.over, won: game.won, hard: game.hard });
      }
      /* Called once, the moment a game ends. Daily games count towards your stats and streak. */
      function recordResult() {
        if (game.mode === 'practice') {
          practice.played++;
          if (game.won) practice.won++;
          api.store.set('practice', practice);
          return;
        }
        if (stats.lastDay === game.day) return;     /* already counted (should not happen) */
        stats.played++;
        stats.lastDay = game.day;
        if (game.won) {
          stats.won++;
          stats.dist[game.rows.length - 1]++;
          stats.streak = stats.lastWonDay === game.day - 1 ? stats.streak + 1 : 1;
          stats.lastWonDay = game.day;
          if (stats.streak > stats.best) stats.best = stats.streak;
        } else {
          stats.streak = 0;
        }
        api.store.set('stats', stats);
      }
      /* Your streak only counts if you solved yesterday's word (or today's). Miss a day and it starts again. */
      function currentStreak() {
        var today = todayNumber();
        return stats.lastWonDay != null && stats.lastWonDay >= today - 1 ? stats.streak : 0;
      }

      /* =========================== stats =========================== */
      function drawStats(into) {
        into.replaceChildren();
        var pct = stats.played ? Math.round(stats.won / stats.played * 100) : 0;
        into.appendChild(h('h3', { class: 'fl-stats-head' }, 'Daily word stats'));
        into.appendChild(h('ul', { class: 'fl-nums' },
          h('li', null, h('b', null, String(stats.played)), h('span', null, 'Played')),
          h('li', null, h('b', null, String(pct)), h('span', null, 'Win %')),
          h('li', null, h('b', null, String(currentStreak())), h('span', null, 'Streak')),
          h('li', null, h('b', null, String(stats.best)), h('span', null, 'Best streak'))));
        var most = Math.max.apply(null, stats.dist.concat([1]));
        var now = game && game.mode === 'daily' && game.won ? game.rows.length - 1 : -1;
        into.appendChild(h('ol', { class: 'fl-dist', 'aria-label': 'Daily words solved, by number of guesses' },
          stats.dist.map(function (n, i) {
            return h('li', { class: i === now ? 'is-now' : null, 'aria-label': (i + 1) + ' guesses: ' + n },
              h('span', { 'aria-hidden': 'true' }, String(i + 1)),
              h('span', { class: 'fl-bar', style: { width: Math.max(8, Math.round(n / most * 100)) + '%' }, 'aria-hidden': 'true' }, String(n)));
          })));
        into.appendChild(h('p', { class: 'fl-prac' }, 'Practice words solved: ' + practice.won + ' of ' + practice.played));
      }
      function toggleStats() {
        var open = statsPanel.hidden;
        statsPanel.hidden = !open;
        statsBtn.setAttribute('aria-expanded', String(open));
        api.sound('click');
        if (open) drawStats(statsPanel);
      }

      /* =========================== the end card =========================== */
      function showEnd(fresh) {
        keys.hidden = true;
        endEl.hidden = false;
        endEl.replaceChildren();
        var n = game.rows.length;
        var trail = [ANSWERS.length];
        for (var i = 1; i <= n; i++) trail.push(wordsThatFit(game.rows.slice(0, i)));
        endEl.appendChild(h('h3', null, game.won ? PRAISE[n - 1] : 'So close. Better luck next time!'));
        endEl.appendChild(h('p', null, 'The word was ', h('span', { class: 'fl-answer' }, game.answer.toUpperCase())));
        endEl.appendChild(h('p', { class: 'fl-trail' }, 'Secret words that still fitted your clues after each guess: ',
          trail.map(function (x, i) { return [i ? ' → ' : '', h('b', null, String(x))]; })));
        var shareText = makeShare();
        var shareBox = h('textarea', { class: 'fl-share-text', readonly: true, rows: 9, hidden: true, 'aria-label': 'Your result to copy' });
        shareBox.value = shareText;
        var copyBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: function () { copyResult(shareText, shareBox, copyBtn); } }, 'Copy my result');
        var btns = h('div', { class: 'fl-endbtns' }, copyBtn,
          h('button', { type: 'button', class: 'btn', onclick: function () { api.sound('click'); startPractice(); } }, game.mode === 'daily' ? 'Practise with another word' : 'Next practice word'));
        endEl.appendChild(btns);
        endEl.appendChild(shareBox);
        if (game.mode === 'daily') {
          var stat = h('div', { class: 'fl-stats' });
          drawStats(stat);
          endEl.appendChild(stat);
          endEl.appendChild(nextClock);
          tickClock();
        }
        if (fresh && !RM) { endEl.classList.remove('is-in'); void endEl.offsetWidth; endEl.classList.add('is-in'); }
        if (!statsPanel.hidden) drawStats(statsPanel);
      }

      /* The countdown to the next daily word. */
      var nextClock = h('p', { class: 'fl-next' });
      function tickClock() {
        clearTimeout(clockTimer);
        if (!game || game.mode !== 'daily' || !game.over) return;
        if (todayNumber() !== game.day) {
          nextClock.replaceChildren('A new daily word is ready. ', h('button', { type: 'button', class: 'btn btn-primary', onclick: startDaily }, 'Play it'));
          return;
        }
        var now = new Date(), midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        var mins = Math.max(1, Math.ceil((midnight - now) / 60000));
        nextClock.textContent = 'Next daily word in ' + Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min';
        clockTimer = setTimeout(tickClock, 30000);
      }

      /* The share grid: coloured squares only, so it never gives the word away. */
      function makeShare() {
        var sq = colourBlind ? { right: '🟧', near: '🟦', none: '⬛' } : { right: '🟩', near: '🟨', none: '⬛' };
        var head = 'Five Letters ' + (game.mode === 'daily' ? game.day : 'practice') + ' ' + (game.won ? game.rows.length : 'X') + '/' + TRIES + (game.hard ? '*' : '');
        return head + '\n\n' + game.rows.map(function (r) { return r.marks.map(function (m) { return sq[m]; }).join(''); }).join('\n') + '\n\nGames in Time · gamesintime.com';
      }
      /* Copy to the clipboard. It all happens on this device, so it works with no internet.
         If the browser says no, show the text so it can be copied by hand. */
      function copyResult(text, box, btn) {
        function done() { api.sound('pop'); btn.textContent = 'Copied!'; showMessage('Copied. Paste it to share.'); later(function () { btn.textContent = 'Copy my result'; }, 2200); }
        function fallback() {
          box.hidden = false;
          box.focus();
          box.select();
          var ok = false;
          try { ok = document.execCommand && document.execCommand('copy'); } catch (e) { ok = false; }
          if (ok) done(); else showMessage('Select the text below and copy it.', 2600);
        }
        try {
          if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
          else fallback();
        } catch (e) { fallback(); }
      }

      /* =========================== settings =========================== */
      function toggleHard() {
        if (game && !game.over && game.rows.length > 0) {
          api.sound('wrong');
          showMessage('Switch hard mode on or off before your first guess', 2400);
          return;
        }
        hard = !hard;
        api.store.set('hard', hard);
        hardBtn.setAttribute('aria-pressed', String(hard));
        if (game && !game.over) game.hard = hard;
        api.sound('click');
        showMessage(hard ? 'Hard mode on: every clue must be used in your next guesses' : 'Hard mode off', 2400);
        sayStatus();
      }
      function toggleColours() {
        colourBlind = !colourBlind;
        api.store.set('cb', colourBlind);
        cbBtn.setAttribute('aria-pressed', String(colourBlind));
        root.classList.toggle('is-cb', colourBlind);
        api.sound('click');
        if (game && game.over) showEnd(false);   /* the share squares change colour too */
      }

      /* =========================== the real keyboard =========================== */
      /* Typing works anywhere on the page unless you are typing in a box, or pressing Enter or Space on a button. */
      function onKeyDown(ev) {
        if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.defaultPrevented) return;
        var t = ev.target;
        if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
        var inside = root.contains(t) || (t && t.contains && t.contains(root));
        if (!inside) return;
        var k = ev.key;
        var onButton = t && t.closest && t.closest('button, a');
        if (k === 'Enter') { if (onButton) return; ev.preventDefault(); press('enter'); }
        else if (k === 'Backspace' || k === 'Delete') { ev.preventDefault(); press('back'); }
        else if (k && k.length === 1 && /[a-z]/i.test(k)) { press(k.toLowerCase()); }
      }
      document.addEventListener('keydown', onKeyDown);

      function clearTimers() { timers.forEach(clearTimeout); timers = []; }

      startDaily();

      return {
        destroy: function () {
          destroyed = true;
          clearTimers();
          clearTimeout(msgTimer);
          clearTimeout(clockTimer);
          document.removeEventListener('keydown', onKeyDown);
        }
      };
    }
  });

  /* More words you may guess (not secret words): 4,135 common English words of five letters, from the
     public-domain 12dicts lists (3of6game and 2of4brif) by Alan Beale, with rude and unkind words taken out.
     It is a function at the bottom of the file only so this long list does not get in the way of the code. */
  function moreWords() {
    return (
          'abaci aback abase abate abbey abbot abets abhor abide abler abode abort about above abuse abuts abuzz abyss ached ' +
      'aches achoo acids acing acmes acres acrid acted acute adage adapt added adder addle adept adieu adios adman admen ' +
      'admin admit adobe adopt adore adorn adult adzes aegis aeons aerie affix afire afoot afoul after again agape agate ' +
      'agave agent aggro agile aging agism aglow agony agree ahead ahold aided aides ailed aimed aioli aired aisle aitch ' +
      'alarm alder alert algae algal alias alibi alien align alike allay alley allot allow alloy aloes aloft aloha alone ' +
      'along aloof aloud alpha altar alter altos alums amass amaze ambit amble ameba amend amigo amiss amity among amour ' +
      'ample amply amuck amuse angel anger angry angst anime anion anise annex annoy annul anode anted antes antis antsy ' +
      'anvil aorta apace apart aphid aping appal apply apses aptly arbor arced ardor areas argon argot argue arias arise ' +
      'armed armor aroma arose array arson artsy ascot ashen ashes aside asked askew aspen aspic assay asset aster atoll ' +
      'atoms atone atria audio audit auger aught augur aunts aural auras autos avail avers avert avian avoid avows await ' +
      'aware awash awful awing awoke axing axiom axles azure baaed babas babel babes baccy backs bacon baddy badly baggy ' +
      'bails bairn baits baize baked bakes baldy baled bales balks balky balls bally balms balmy balsa balti banal bands ' +
      'bandy banes bangs banjo banks banns barbs bards bared barer bares barfs barge barks barmy barns baron basal based ' +
      'baser bases basic basin basis basks baste bated bathe baths batik baton batty bauds baulk bawls bayed bayou beads ' +
      'beady beaks beams beans beard bears beast beats beaus beaut beaux bebop becks beech beefs beefy beeps beers beery ' +
      'beets befit began begat beget begin begot begum begun beige being belay belch belie belle bells belly below belts ' +
      'bends bendy bents beret bergs berms berth beryl beset bests betas betel bevel bevvy bhaji bible bided bides bidet ' +
      'biers biffs bight bigot bijou biked biker bikes bikie bilge bilks bills billy bindi binds binge bingo biome biped ' +
      'birds birth bison bites bitty blabs blade blags blame bland blare blase blast bleak bleat bleed bleep bless blest ' +
      'blimp blind bling blini blips bliss blitz bloat blobs blocs blogs bloke blond blood blots blown blows blowy blubs ' +
      'bluer blues bluff blunt blurb blurs blurt boars boast boats bobby boded bodes bodge boffo bogey boggy bogie bogus ' +
      'boils boles bolls bolts bombs bonce bonds boned bones bongo bongs bonny booed books booms boons boors boost boots ' +
      'borax bored bores borne boron bosom bossy bosun botch bough bound bouts bowed bowel bower bowls boxed boxer boxes ' +
      'bozos braai brace bract brags braid brake brand brash brass brats bravo brawl brawn brays break bream breed breve ' +
      'brews briar bribe bride brief brier brigs brill brims brine bring brink briny broad broil broke bronc brood broth ' +
      'brows bruit brunt brute bucks budge buffs buggy bugle built bulbs bulge bulgy bulks bulky bulls bully bumph bumps ' +
      'bungs bunks bunts buoys burbs buret burgh burgs burka burks burly burns burnt burps burqa burro burrs burst busby ' +
      'bused buses bushy busks busts butte butty buxom buyer bylaw byres bytes byway cabal cabby caber cacao cache cacti ' +
      'caddy cadet cadge cadre caeca cafes caffs caged cages cagey cairn caked cakes calif calks calls calms calve calyx ' +
      'cameo camps campy canal caned canes canny canon canst canto cants caped caper capes capon carat carbs cards cared ' +
      'carer cares carob carol carps carry carts carve cased cases casks caste casts cater catty caulk cause caved caver ' +
      'caves cavil cawed cease cecum ceded cedes celeb cello cells cents certs chafe chaff chant chaos chaps chard chars ' +
      'chary chasm chats cheap cheat check cheep chefs chemo chews chewy chide chief chile chili chimp china chins chips ' +
      'chits chive chivy chock chocs choke chomp chook chops chore chose chows chuck chugs chump chums churn chute cider ' +
      'cigar cinch circa cited cites civet civic civil clack claim clamp clams clang clank clans claps clash clasp claws ' +
      'clays clear cleat clefs cleft clerk clime cling clink clips clipt cloak clods clogs clone clonk close clots clout ' +
      'clove clown clubs cluck clued clues clump clung clunk coals coats cobra cocky codas coded codes codex coeds coils ' +
      'coins colas colds coley colic colon color colts comas combo combs comer comes comfy comma comps conch condo coned ' +
      'cones coney conga conks cooed cooks cools coops coots copay coped copes copra copse cords cored cores corgi corks ' +
      'corms corns corny corps costs cough could count coupe coups coven cover coves covet covey cowed cower cowls cowry ' +
      'coxed coxes coyly coypu crabs crack crags craic cramp crams crank crape crash crass crave craws craze crazy creak ' +
      'credo creed creel creep crepe crept cress crest crews cribs crick cried crier cries crime crimp croak crock crocs ' +
      'croft crone crony crook croon crops crore croup crows crude cruel cruet crush crypt cubed cubes cubic cubit cuffs ' +
      'cuing culls cults cumin cupid curbs curds cured cures curio curls curse curst curvy cushy cusps cuter cutey cutie ' +
      'cutup cynic cysts czars dacha daddy dados daffy daggy daily dales dally dames damps dandy dared dares darns darts ' +
      'dated dates datum daubs daunt dawns dazed deals dealt deans dears deary death debar debit debts debug debut decaf ' +
      'decal decay decks decor decoy decry deeds deems defer defog deice deify deign deism deity delay delis dells delve ' +
      'demob demon demos demur denim dense dents depot depth derby desks deter detox deuce devil dhals dhoti dhows dials ' +
      'diced dices dicey dicta diets dikes dimes dimly dinar dined dines dings dingy dinky diode dippy direr dirge dirks ' +
      'dirty disco discs dishy disks ditch ditsy ditto ditty ditzy divan divas dived diver dives divot divvy djinn docks ' +
      'dodgy dodos doers doffs doggy dogie dogma doily doing doled doles dolls dolly dolts domed domes donga donor donut ' +
      'dooms doors doozy doped dopes dopey dorks dorky dorms dosed doses doted dotes dotty doubt doula douse doves dowdy ' +
      'dowel downs downy dowry dowse doyen dozed dozes drags drake drams drank drape drawl drawn draws drays dread drear ' +
      'dreck dregs dried drier dries drily drips droll drool droop drops dross drove drown drugs druid drums drunk dryad ' +
      'dryer dryly ducal duchy ducks ducky ducts dudes duels duets duffs dukes dulls dully dummy dumps dumpy dunce dunes ' +
      'dunks dunno dunny duped dupes dusky dusts duvet dwarf dweeb dwell dwelt dying earls early earns eased eases eaten ' +
      'eater eaves ebbed ebony eclat edema edged edges edict edify edits eerie egged egret eject eking elder elect elegy ' +
      'elfin elide elite elope elude elves embed ember emcee emend emery emirs emits emoji emote enact ended endow enemy ' +
      'enjoy ennui enrol ensue enter entry envoy epees epics epoch epoxy equal equip erect erode erred error erupt ether ' +
      'ethic ethos euros evade evens event every evict evils evoke ewers exact exalt exams excel execs exert exile exist ' +
      'exits expat expel expos extol extra exude exult eying eyrie faced faces facet facts faddy faded fades faffs fails ' +
      'faint fairs faith faked faker fakes fakir falls false famed fangs farce fared fares farms fasts fatal fated fates ' +
      'fatwa fault fauna fauns faves favor fawns faxed faxes fazed fazes fears feats feeds feels feign feint fella fells ' +
      'felon femur fends feral ferns ferny fetal feted fetes fetid fetus feuds fever fewer fiats fiber fiche fiefs fiend ' +
      'fiery fifes fight filch filed files filet fills filly films filmy filth final finch finds fined finer fines finks ' +
      'fiord fired fires firms first firth fishy fists fiver fives fixed fixer fixes fizzy fjord flack flags flail flair ' +
      'flaky flank flans flaps flare flask flats flaws flays fleas fleck flees flesh flick flied flier flies fling flint ' +
      'flips flirt flits floes flogs flood flops flora floss flout flown flows flubs flues fluid fluke fluky flume flung ' +
      'flunk flush flyby flyer foals foams foamy focal focus fogey foils foist folds folio folks folly fonts foods fools ' +
      'foots foray force fords forge forgo forks forms forte forth forts forum fouls found fount fours fowls foxed foxes ' +
      'foyer frack frail franc frank frats fraud frays freak freed freer frees frets friar fried frier fries frill frisk ' +
      'fritz frizz frock frogs frond front frosh froth frown froze frump fryer fuels fuggy fugue fully fumed fumes funds ' +
      'fungi funks funky furls furor furry furze fused fuses fussy fusty futon fuzes gabby gable gaffe gaffs gaged gages ' +
      'gaily gains gaits galas gales galls gamer games gamey gamma gammy gamut gangs gaols gaped gapes gases gasps gassy ' +
      'gated gates gator gaudy gauge gaunt gauze gauzy gavel gawks gawky gawps gayer gazed gazes gears geeks geeky geese ' +
      'gelds genes genie genii genre gents genus germs getup ghats ghost ghoul gibed gibes giddy gifts gilds gills gilts ' +
      'gimme girds girls girly giros girth gismo gites given giver gives gizmo glace glade gland glare glaze gleam glean ' +
      'glens glint glitz gloat globs gloms gloom gloop glory gloss glows glued glues gluey gluts gnash gnats gnawn gnaws ' +
      'gnome goads goals goats godly goers gofer gogga going golds golem golly goner gongs gonna gonzo goods goody gooey ' +
      'goofs goofy goons gored gores gorge gorse goths gotta gouge gourd gouty gowns grabs grace grads graft grail grams ' +
      'grans grant grasp grate grave grays graze grebe greed greys grids grief grime grimy grind grins gripe grips grits ' +
      'groan groin groks groom grope gross group grout growl grown grows grubs gruel gruff grump grunt guano guard guava ' +
      'guild guile guilt guise gulag gulch gulfs gulls gully gulps gumbo gummy gunge gungy gunky guppy gurus gushy gussy ' +
      'gusto gusts gusty gutsy gyros habit hacks hades hadst haiku hails hairs hairy hajes hakes halal haler hallo halls ' +
      'halos halts halve hammy hands handy hangs hanks hanky hardy hared harem hares harks harms harps harpy harry harsh ' +
      'harts hasps haste hasty hated hater hates hauls haunt haven haves havoc hawed hawks hazed hazel hazes heads heady ' +
      'heals heaps heard hears heath heats heave heeds heels hefts hefty heirs heist helix helms helps hence henna herbs ' +
      'herds heros hertz hewed hexed hexes hicks hides highs hijab hiked hikes hills hilly hilts hinds hinge hints hippy ' +
      'hired hires hitch hived hives hoagy hoard hoary hobos hocks hoick hoist hokey hokum holds holed holes holly homed ' +
      'homer homes homey honed hones honks honor hoods hoody hooey hoofs hooks hooky hoops hoots hoped hopes horde horns ' +
      'horsy hosed hoses hosts hotly hound hours hovel howdy howls hubby huffs huffy huger hulas hulks hullo hulls human ' +
      'humor humph humps humus hunch hunks hunky hunts hurls hurry hurts husks hutch hydra hyena hying hymns hyped hyper ' +
      'hypes iambs icier icily icons ideal ideas idiom idled idler idles idols idyll ikons ileum image imams imbed imbue ' +
      'impel imply inane inbox incur index indie inept inert infer ingot inked inlay inlet inner innit input inset inter ' +
      'intro inure ionic iotas irate irked irons irony isles islet issue itchy items ivied ivies jacks jaded jails jambs ' +
      'jammy japes jaunt jawed jazzy jeans jeeps jeers jells jemmy jerks jerky jests jetty jibed jibes jiffy jilts jimmy ' +
      'jinks jinns jived jives jocks joeys joins joint joist joked joker jokes jokey jolts joule joust jowls jowly julep ' +
      'jumbo jumps jumpy junks junky junta juror kabob kanji kapok kaput karat karma karts kazoo kebab keels keens keeps ' +
      'kerbs ketch keyed khaki kicks kiddo kiddy kills kilns kilos kilts kinda kinds kings kinks kiosk kirks kites kitty ' +
      'kiwis klutz knack knave kneed kneel knees knell knelt knife knits knobs knoll knots known knows kooks kooky korma ' +
      'krill krona krone kudos kudzu kurta labor laced laces lacks laden ladle lager laird lairs lairy laity lakes lakhs ' +
      'lamas lambs lamed lamer lames lamps lance lands lanes lanky lapel lapse larch lards large largo larks larva laser ' +
      'lassi lasso lasts latch later latex lathe lathi laths latte lauds laugh lawns laxer laxly layer layup lazed lazes ' +
      'leach leads leafs leafy leaks leaky leans leant leaps leapt learn lease leash least leave ledge leech leeks leers ' +
      'leery lefts lefty legal leggy legit lends leper letch letup levee level lexis liars libel licks lidos liege liens ' +
      'lifer lifts liked liken likes lilts limbo limbs limed limes limey limit limos limps lined linen liner lines lingo ' +
      'links lions lipid lippy liras lisps lists liter lithe lived liven liver lives livid loads loafs loamy loans loath ' +
      'lobby lobed lobes local lochs locks locos locum locus lodes lofts lofty logic login logon logos loins lolls loner ' +
      'longs looks looms loons loony loops loopy loose loots loped lopes lords lorry loser loses lotto lotus lough lours ' +
      'louse lousy louts loved lover loves lovey lowed lower lowly loyal luaus lubes lucid lucks lucre luges lulls lulus ' +
      'lumps lumpy lunge lungi lungs lupin lupus lurch lured lures lurgy lurid lurks lutes lying lymph lyres lyric macaw ' +
      'maces macho macks macro madam madly mafia magma maids mails maims mains maize major maker makes males malls malts ' +
      'mamas mamba mambo mamma mammy manes manga mange mangy mania manic manky manly manna manse mares marge marks marry ' +
      'marts masks mason masts mated mater mates matey matte matzo mauls mauve maven maxed maxes maxim maxis maybe mayst ' +
      'mazes meals mealy means meant meany meats meaty mecca media medic meets melds melee melts memes memos mends menus ' +
      'meows mercy meres merge merit mesas messy meted meter metes meths metro mewed mewls mezzo miaow micra micro midge ' +
      'midst miens might miked mikes miler miles milks milky mills mimed mimes mince minds mined miner mines mingy minim ' +
      'minis minks minor mints minty minus mired mires mirth miser mists misty miter mites mitre mitts mixed mixer mixes ' +
      'moans moats mocha mocks modal model modem modes moggy mogul moist mojos molar molds moldy moles molls molts momma ' +
      'mommy monks mooch moods moody mooed moons moors moots moped mopes moral mores morns morph mosey mossy motel motes ' +
      'motet moths motif motto moult mound mount mourn mousy moved mover moves mowed mower moxie mucks mucky mucus muffs ' +
      'mufti muggy mulch mules mulls mummy mumps munch murky mused muses mushy musky musos musts musty muted mutes mutts ' +
      'muzzy mynah myrrh myths naans nabob nacho nadir nails naive naked named names nanas nanny napes nappy narcs narks ' +
      'narky nasal nasty natch natty naval navel naves navvy nears neath necks needs needy neigh nerds nerdy nerve nervy ' +
      'nests never newer newly newsy newts nexus nicad nicer niche nicks niece niffy nifty nimbi nimby nines ninja ninny ' +
      'nippy nixed nixes noble nobly nodal nodes nohow noise nomad nonce nooks noose norms nosed noses nosey notch noted ' +
      'notes nouns novae novas nuked nukes numbs nutty nylon nymph oaken oakum oases oaths obeys obits oboes occur ocher ' +
      'ocker octet odder oddly odium odors odour offal offed offer often ogled ogles ogres oiled oinks okapi okays olden ' +
      'older oldie omega omens omits onset oohed oomph oozed oozes opals opens opine opted optic orcas order osier other ' +
      'ought ounce ousts outdo outed outer outre outta ouzos ovals ovary ovens overs overt ovoid owing owned owner oxide ' +
      'ozone paans paced paces pacey packs pacts paddy padre paean pagan paged pager pages pails pains pairs paled paler ' +
      'pales palls pally palms palsy panes pangs panic panto pants papal papas pappy paras parch pared pares parka parks ' +
      'parky parry parse parts passe paste pasts pasty pater pates paths patio patsy patty pause paved paves pawed pawns ' +
      'payed payee payer peaks peaky peals pears peaty pecks peeks peels peeps peers peeve pekes pelts penal pence peons ' +
      'peony peppy peril perks perky perms perps perry pesky pesos pesto pests peter petty phase phial phlox phony phyla ' +
      'picks picky piece piers pieta piety piggy piked pikes pilaf pilau piled piles pills pined pines piney pings pinks ' +
      'pinky pinny pinto pints pinup pious piped piper pipes pipit pique piste pitas pithy piton pitta pivot pixie place ' +
      'plaid plain plait plans plays plead pleas pleat plebe plebs plied plies plods plonk plops plots plows ploys pluck ' +
      'plugs plumb plume plump plums plunk plush poach podgy podia poems poesy poets point poise poked poker pokes pokey ' +
      'polar poles polio polka polls polyp polys ponds pongs pooch pooed poohs pools popes poppa pored pores porky ports ' +
      'posed poser poses posit posse posts potty poufs pound pours pouts pouty power prams prang prank prate prats prawn ' +
      'prays preen preps press preys price pricy pride pried pries prigs prime primo primp print prion prior prise privy ' +
      'probe prods profs prole promo proms prone prong proof props prose prove prowl prows proxy prude psalm pseud psych ' +
      'pucks pudgy puffs puffy puked pukes pukka pulls pulps pulpy pulse pumas pumps punch punks punts pupae pupal pupas ' +
      'puree purer purge purls purrs purse pushy putts putty pwned pylon pyres pzazz quads quaff quail quake qualm quark ' +
      'quart quash quays quell query queue quiff quill quins quint quips quirk quite quits quoit quota quote quoth rabbi ' +
      'rabid raced racer races racks radii radon rafts ragas raged rages ragga raids rails rains raise rajah rajas raked ' +
      'rakes rally ramps ranee range rangy ranis ranks rants rarer rasps raspy rated rates ratio ratty raved ravel raven ' +
      'raver raves rawer rayon razed razes razor reach react reads ready realm reams reaps rearm rears rebel rebus rebut ' +
      'recap recce recon recta recto recur redid redux reeds reedy reefs reeks reels refer refit regal rehab reign reiki ' +
      'reins rejig relic remit remix renal rends renew rents reorg repay repel reply repot reran rerun resat reset resin ' +
      'resit rests retch retro retry reuse revel revue ricks rides riffs rifle rifts right rigid rigor riled riles rinds ' +
      'rings rinks riots ripen riper risen riser rises risks risky rites ritzy rival riven rivet roach roads roams roans ' +
      'roars robed robes rocks roger rogue roils roles rolls roman romeo romps rondo roofs rooks rooms roomy roost roots ' +
      'roped ropes ropey rorts roses rosin rotas rotis rotor roues rouge rough round rouse roust routs roved rover roves ' +
      'rowan rowdy rowed rower rubes ruble rucks ruddy ruder ruffs rugby ruing ruins ruled rules rumba rummy rumor rumps ' +
      'runes rungs runic runny runts rupee rural ruses rusks rusts saber sable sabre sacks saddo sadhu sadly safer safes ' +
      'sagas sager sages saggy sahib sails saint saith sakes sakis sales sally salon salsa salts salve salvo samba samey ' +
      'sands saner sappy saree sarge saris sarky sassy satay sated sates satin satyr saucy sauna saute saved saver saves ' +
      'savor savoy savvy sawed saxes scabs scads scald scale scalp scaly scamp scams scans scant scare scarp scars scary ' +
      'scene schmo schwa scion scoff scold scoot scope scorn scour scowl scram scrap scree screw scrip scrod scrum scuba ' +
      'scuds scuff scull seals seams seamy sears seats sebum sects sedan sedge seeds seedy seeks seems seeps seers segue ' +
      'seize sells semis sends sense sepal sepia serfs serge serif serum serve servo setts setup sever sewed sewer shack ' +
      'shady shaft shahs shaky shale shall shalt shame shams shank shard share sharp shave shawl sheaf shear sheds sheen ' +
      'sheer sheik sherd shied shier shies shift shill shins ships shire shirk shoal shock shoed shoes shone shook shoon ' +
      'shoos shoot shops shorn short shots shove shown shows showy shred shrew shrub shrug shuck shuns shunt shush shuts ' +
      'shwas shyer shyly sibyl sicks sided sides sidle siege sieve sifts sighs sight signs silks sills silos silts since ' +
      'sines sinew singe sings sinks sinus sired siree siren sires sisal sises sitar sited sites situp sixes sized sizes ' +
      'skein skews skids skied skier skies skiff skimp skims skins skint skips skits skive skuas skulk skull skunk slabs ' +
      'slack slain slake slams slang slant slaps slash slats slave slays sleds sleek sleet slept slews slick slier slime ' +
      'slims slimy sling slink slips slits slobs sloes slogs sloop slops slosh slots slows slugs slump slums slung slunk ' +
      'slurp slurs slush slyer slyly smack smash smear smelt smirk smite smith smock smogs smoke smoky smote snafu snags ' +
      'snaky snaps snare snarf snarl sneak sneer snick snide sniff snipe snips snits snobs snoop snoot snore snort snots ' +
      'snout snows snubs snuck snuff snugs soaks soaps soapy soars sober socks sodas sofas softy soggy soils soled soles ' +
      'solid solos sonar songs sonic sonny sooty soppy sorer sores sorry sorts souks souls sound soups soupy sours souse ' +
      'sowed sower spacy spake spams spans spare spars spasm spate spats spawn spays spaza spear speck specs speed spelt ' +
      'spend spent spews spied spiel spies spiff spike spiky spilt spine spins spiny spire spite spits spivs splat splay ' +
      'split spoil spoke spoof spook spool spoor spore spots spout sprat spree sprig sprog spuds spume spurn spurs spurt ' +
      'squab squat squib stabs staff stags stagy staid stain stake stale stalk stall stand stank staph stare stark stars ' +
      'start stash state stats stave stays stead steak steal steed steel steer stein stems steno stent steps stern stews ' +
      'sties stiff stile still stilt sting stink stint stirs stoat stock stoep stogy stoic stoke stole stomp stony stood ' +
      'stoop stops store stoup stout stows strap stray strep strew strip strop strum strut stubs stuck studs study stuff ' +
      'stump stung stunk stuns stunt styes style styli suave sucks sucky sudsy suede suing suite suits sulks sulky sully ' +
      'sumac sumps sunup surer surfs surge surly sushi swabs swags swain swami swank swans swaps sward swarm swath swats ' +
      'sways swear sweat swede swell swept swigs swill swims swine swipe swish swizz swoon swoop swops sword swore sworn ' +
      'swots swung sylph synch synod synth syrup tabby tabla taboo tacit tacks tacky tacos taffy tails taint taken taker ' +
      'takes tales talks tally talon tamed tamer tames tamps tango tangs tangy tanks tapas taped taper tapes tapir tardy ' +
      'tares tarns taros tarot tarps tarry tarts tasks tater tatty taunt taupe tawny taxed taxes taxis teach teals teams ' +
      'tears teary tease techs techy teems teens teeny telex tells telly tempi temps tempt tench tends tenet tenon tenor ' +
      'tense tents tepee tepid terms terns terry terse tests testy texts thaws theft their theme there therm these thick ' +
      'thief thigh thine thing think thins third thong thorn those threw throb throw thrum thuds thugs thump thyme tiara ' +
      'tibia ticks tidal tided tides tiers tiffs tight tikes tikka tilde tiled tiler tiles tills tilts timed timer times ' +
      'timid tines tinge tings tinny tints tipsy tired tires titan titch tithe title tizzy toads toady today toddy toffs ' +
      'togae togas toils toked tokes tolls tombs tomes tonal toned toner tones tongs tonic tonne tools tooth toots topaz ' +
      'topee topic topis torsi torso torte torts total toted totem totes touch tough tours touts towed towns toxic toxin ' +
      'toyed trace tract trade trait tramp trams traps trash trawl trays tread treed trees treks trend tress trews triad ' +
      'trial tribe trice tried trier tries trike trill trims trios tripe trips trite troll tromp troop trope trots trout ' +
      'truce truer trugs truly trump truss trust truth tryst tsars tubas tubby tuber tubes tucks tufts tulle tummy tumor ' +
      'tunas tuned tuner tunes tunic tunny tuque turbo turfs turns turps tusks tutus tuxes twain twang tweak tweed tween ' +
      'tweet twerp twice twigs twill twine twins twits twixt tying tykes typed types typos tyres tyros tzars udder ulcer ' +
      'ulnae ulnas umber umped uncut under undid undue unfit unhip unify union unite units unity unlit unmet untie until ' +
      'unzip upend upped upper upset urban urged urges urine usage users usher using usual usurp usury uteri utter uvula ' +
      'vacua vague vales valet valid valor value valve vamps vanes vaped vapes vapid vapor vases vault veeps veers vegan ' +
      'veils veins velar veldt venal vends venom vents venue verbs verge verso verve vests vetch vexed vexes vials vibes ' +
      'vicar vices views vigil vigor viler villa villi vines vinyl viola viols viper viral virus visas vises visor vista ' +
      'vitae vital vivas vixen vocab vodka vogue voids voila voile voles volts vomit voted voter votes vouch vowed vroom ' +
      'vying wacks wacky waded wader wades wadge wadis wafts waged wager wages waifs wails waist waits waive waked waken ' +
      'wakes walks walla walls wally waltz wands waned wanes wanly wanna wants wards wares warms warns warps warts warty ' +
      'wasps waste watts waved waver waves waxed waxen waxes wazoo weals weans wears weary wedge weeds weedy weeks weeny ' +
      'weeps weepy weigh weird weirs welds wells welly welts wends wetly whack whams wharf whelk whelp where whets which ' +
      'whiff while whims whine whiny whips whirl whirr whirs whist whizz whole whoop whops whorl whose whups wicks widen ' +
      'wider widow width wield wikis wilds wiles wills wilts wimps wimpy wince winch winds wined wines wings winks wiped ' +
      'wiper wipes wired wires wised wiser wises wisps wispy witch witty wives wodge woken wolds wolfs woman wombs women ' +
      'wonga wonks wonky woods woody wooed wooer woofs wooly woozy words wordy works worms wormy worry worse worst worth ' +
      'would wound woven wowed wrack wraps wrapt wrath wreak wreck wrens wrest wring write writs wrong wrote wrung wryer ' +
      'wryly xenon yacks yahoo yakka yanks yards yarns yawed yawls yawns yearn years yeast yecch yells yelps yeses yetis ' +
      'yield yikes yobbo yodel yogic yogis yoked yokel yokes yolks yonks yours youth yowls yucca yucky yukky yummy yuppy ' +
      'yurts zappy zeros zilch zines zings zingy zippy zonal zoned zones zooms '
    );
  }
})();
