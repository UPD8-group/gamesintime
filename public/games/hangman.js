/* Hangman for Games in Time.
   First written down in 1894 by Alice Bertha Gomme as "Birds, Beasts and Fishes": the secret word
   was an animal, and the first and last letters were shown from the start.

   There is no gallows here. Wrong guesses burn down a candle instead. Eight wrong guesses and
   the candle goes out with a wisp of smoke.

   How the file is organised:
     Part 1  The word lists. Animals for the 1894 rules, and words a kid in the 1890s knew.
     Part 2  The rules. A small "state" object remembers the word and the letters tried.
             These functions never touch the screen.
     Part 3  The computer. How it picks a word and how it works out a hint.
     Part 4  The screen. The candle (SVG), the word boxes, the on-screen keyboard,
             the two-player form, the scoreboard.

   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  var MAX_WRONG = 8;      /* the candle has eight pieces */
  var THINK_MS = 350;     /* the computer's pause before it reveals its chosen word */
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* =====================================================================
     PART 1: THE WORD LISTS
     Each entry is { w: the word, cat: a category shown as a hint, note: one sentence
     shown after the round }. Words may contain a space or a hyphen; those are shown
     from the start and do not need guessing.
     ===================================================================== */

  /* Birds, beasts and fishes for the 1894 rules. */
  var ANIMALS = [
    /* birds */
    { w: 'emu', cat: 'Bird', note: 'Australia\'s tallest bird cannot fly, but it can run at nearly fifty kilometres an hour.' },
    { w: 'kookaburra', cat: 'Bird', note: 'A kookaburra\'s loud call sounds like laughter and is often heard at dawn and dusk.' },
    { w: 'galah', cat: 'Bird', note: 'A galah is a pink and grey cockatoo so common that "galah" became Australian slang for a silly person.' },
    { w: 'cockatoo', cat: 'Bird', note: 'A cockatoo is a big parrot with a crest of feathers it raises when it is excited.' },
    { w: 'sparrow', cat: 'Bird', note: 'Sparrows are small brown birds brought to Australia from England in the 1860s.' },
    { w: 'pigeon', cat: 'Bird', note: 'Pigeons carried messages tied to their legs long before there were telephones.' },
    { w: 'eagle', cat: 'Bird', note: 'A wedge-tailed eagle\'s wings stretch wider than a tall adult is high.' },
    { w: 'robin', cat: 'Bird', note: 'Several Australian robins have bright red or pink chests.' },
    { w: 'swan', cat: 'Bird', note: 'Europeans were amazed to find that Australian swans are black, not white.' },
    { w: 'owl', cat: 'Bird', note: 'Owls hunt at night and can turn their heads most of the way round.' },
    { w: 'magpie', cat: 'Bird', note: 'The Australian magpie is famous for its warbling song, and for swooping in spring.' },
    { w: 'lyrebird', cat: 'Bird', note: 'A lyrebird can copy almost any sound it hears, even other birds and barking dogs.' },
    { w: 'penguin', cat: 'Bird', note: 'Little penguins, the smallest penguins in the world, live along Australia\'s southern coast.' },
    { w: 'pelican', cat: 'Bird', note: 'A pelican\'s beak can hold more than its belly can.' },
    { w: 'parrot', cat: 'Bird', note: 'Parrots use their feet like hands to hold their food.' },
    /* beasts */
    { w: 'wombat', cat: 'Beast', note: 'A wombat is a sturdy digger whose droppings are shaped like little cubes.' },
    { w: 'platypus', cat: 'Beast', note: 'A platypus has a duck\'s bill and a beaver\'s tail and lays eggs, yet it is a mammal.' },
    { w: 'dingo', cat: 'Beast', note: 'The dingo is Australia\'s wild dog. It howls but hardly ever barks.' },
    { w: 'echidna', cat: 'Beast', note: 'An echidna is a spiny egg-laying mammal that eats ants with a long sticky tongue.' },
    { w: 'bandicoot', cat: 'Beast', note: 'A bandicoot is a small digging marsupial with a pointed nose that leaves little cone-shaped holes in lawns.' },
    { w: 'horse', cat: 'Beast', note: 'In the 1890s horses pulled nearly everything, from carts and coaches to trams.' },
    { w: 'badger', cat: 'Beast', note: 'A badger is a striped-faced European animal that digs a home called a sett.' },
    { w: 'donkey', cat: 'Beast', note: 'Donkeys were patient workers that carried loads for miners and farmers.' },
    { w: 'rabbit', cat: 'Beast', note: 'Rabbits let loose in Victoria in 1859 soon spread right across the country.' },
    { w: 'kangaroo', cat: 'Beast', note: 'A kangaroo cannot easily walk backwards; people often say that is why it was chosen for the coat of arms.' },
    { w: 'koala', cat: 'Beast', note: 'A koala sleeps for up to twenty hours a day and eats only gum leaves.' },
    { w: 'possum', cat: 'Beast', note: 'The brushtail possum is a night-time visitor to many Australian roofs.' },
    { w: 'camel', cat: 'Beast', note: 'Camels carried goods across the Australian outback in the 1800s.' },
    { w: 'elephant', cat: 'Beast', note: 'The elephant is the largest animal on land, and its trunk is really a very long nose.' },
    { w: 'hedgehog', cat: 'Beast', note: 'A hedgehog is a small spiky animal that rolls into a ball when it is frightened.' },
    { w: 'fox', cat: 'Beast', note: 'Foxes were released in Australia in the 1870s so that people could hunt them.' },
    { w: 'squirrel', cat: 'Beast', note: 'A squirrel buries nuts for winter and forgets where some of them are.' },
    { w: 'tiger', cat: 'Beast', note: 'The tiger is the biggest of the big cats, and every tiger\'s stripes are different.' },
    { w: 'goat', cat: 'Beast', note: 'Goats will nibble almost anything and are brilliant climbers.' },
    { w: 'otter', cat: 'Beast', note: 'Sea otters hold paws while they sleep so they do not drift apart.' },
    /* fishes */
    { w: 'barramundi', cat: 'Fish', note: 'Barramundi is an Aboriginal word meaning large-scaled river fish.' },
    { w: 'trout', cat: 'Fish', note: 'Trout are spotted river fish brought to Australia from England in the 1860s.' },
    { w: 'herring', cat: 'Fish', note: 'Herring are silvery fish that swim in huge groups called schools.' },
    { w: 'salmon', cat: 'Fish', note: 'Salmon swim up rivers to lay their eggs in the very place where they were born.' },
    { w: 'cod', cat: 'Fish', note: 'The Murray cod is Australia\'s biggest freshwater fish.' },
    { w: 'mullet', cat: 'Fish', note: 'Mullet swim in schools close to the shore and leap right out of the water.' },
    { w: 'flathead', cat: 'Fish', note: 'A flathead hides on the sandy bottom and waits for its dinner to swim past.' },
    { w: 'mackerel', cat: 'Fish', note: 'Mackerel are fast striped fish that swim in large schools.' },
    { w: 'sardine', cat: 'Fish', note: 'Sardines are tiny fish packed tightly into tins, which is where "packed like sardines" comes from.' },
    { w: 'snapper', cat: 'Fish', note: 'A snapper is a pink fish that grows a bump on its head as it gets older.' },
    { w: 'whiting', cat: 'Fish', note: 'Whiting are slim silvery fish that like shallow sandy beaches.' },
    { w: 'perch', cat: 'Fish', note: 'A perch is a freshwater fish with spiky fins and dark stripes.' },
    { w: 'flounder', cat: 'Fish', note: 'A flounder lies flat on one side, so both of its eyes end up on the same side of its head.' },
    { w: 'pike', cat: 'Fish', note: 'A pike is a long hunting fish with a mouth full of sharp teeth.' }
  ];

  /* Words a kid in the 1890s knew. Nothing invented after 1899. */
  var CLASSIC = [
    { w: 'omnibus', cat: 'Transport', note: 'An omnibus was a big horse-drawn bus. The word "bus" is short for it.' },
    { w: 'velocipede', cat: 'Transport', note: 'A velocipede was an early bicycle with pedals on the front wheel.' },
    { w: 'penny-farthing', cat: 'Transport', note: 'A penny-farthing was a bicycle with a huge front wheel and a tiny back one.' },
    { w: 'dray', cat: 'Transport', note: 'A dray was a low, strong cart pulled by horses or bullocks to carry heavy loads.' },
    { w: 'coach', cat: 'Transport', note: 'A coach was a horse-drawn carriage that carried passengers and mail between towns.' },
    { w: 'steamship', cat: 'Transport', note: 'A steamship crossed the oceans with coal-fired engines instead of sails.' },
    { w: 'bicycle', cat: 'Transport', note: 'By the 1890s the bicycle had two equal wheels and a chain, much like the ones we ride today.' },
    { w: 'tram', cat: 'Transport', note: 'Trams ran on rails along city streets, pulled by horses, cables or steam.' },
    { w: 'locomotive', cat: 'Transport', note: 'A locomotive is the engine that pulls a train. In the 1890s it ran on steam.' },
    { w: 'telegraph', cat: 'Invention', note: 'The telegraph sent messages along wires as clicks of Morse code, long before telephones.' },
    { w: 'gramophone', cat: 'Invention', note: 'A gramophone played music from flat discs and was wound up with a handle.' },
    { w: 'kinetoscope', cat: 'Invention', note: 'A kinetoscope was a box you peered into to watch one of the very first moving pictures.' },
    { w: 'typewriter', cat: 'Invention', note: 'A typewriter printed letters onto paper when you pressed its keys.' },
    { w: 'phonograph', cat: 'Invention', note: 'The phonograph recorded sound on wax cylinders and played it back.' },
    { w: 'magic lantern', cat: 'Invention', note: 'A magic lantern projected pictures from glass slides onto a wall.' },
    { w: 'stereoscope', cat: 'Invention', note: 'A stereoscope made two photographs look like one 3D scene.' },
    { w: 'zoetrope', cat: 'Invention', note: 'A zoetrope was a spinning drum with slits that made drawings appear to move.' },
    { w: 'lamplighter', cat: 'People and jobs', note: 'A lamplighter walked the streets each evening lighting the gas lamps with a long pole.' },
    { w: 'governess', cat: 'People and jobs', note: 'A governess was a woman paid to teach children at home.' },
    { w: 'bushranger', cat: 'People and jobs', note: 'A bushranger was an outlaw who hid in the Australian bush and robbed travellers.' },
    { w: 'swagman', cat: 'People and jobs', note: 'A swagman walked the country looking for work, carrying his bedroll, called a swag.' },
    { w: 'parlour', cat: 'Around the house', note: 'The parlour was the best room in the house, kept tidy for visitors.' },
    { w: 'gaslight', cat: 'Around the house', note: 'Before electricity, gaslight lit streets and houses with flames from gas pipes.' },
    { w: 'inkwell', cat: 'Around the house', note: 'An inkwell was a little pot of ink set into a school desk for dipping pens.' },
    { w: 'slate', cat: 'Around the house', note: 'A slate was a small blackboard that children wrote on with chalk, then wiped clean.' },
    { w: 'bonnet', cat: 'Clothes', note: 'A bonnet was a hat tied under the chin with ribbons.' },
    { w: 'bustle', cat: 'Clothes', note: 'A bustle was padding worn under a skirt to make it stick out at the back.' },
    { w: 'petticoat', cat: 'Clothes', note: 'A petticoat was an underskirt worn beneath a dress.' },
    { w: 'breeches', cat: 'Clothes', note: 'Breeches were short trousers that fastened just below the knee.' },
    { w: 'hopscotch', cat: 'Toys and games', note: 'In hopscotch you hop through squares chalked on the ground, kicking a flat stone from one square to the next.' },
    { w: 'cricket', cat: 'Toys and games', note: 'Cricket was played all over Australia in the 1890s. The first Test match was in 1877.' },
    { w: 'draughts', cat: 'Toys and games', note: 'Draughts is the board game of jumping and capturing pieces, called checkers in America.' },
    { w: 'marbles', cat: 'Toys and games', note: 'Marbles are small glass balls flicked at each other in games played in the dirt.' },
    { w: 'hoop', cat: 'Toys and games', note: 'Kids rolled a big wooden hoop along the street, tapping it with a stick to keep it going.' },
    { w: 'kite', cat: 'Toys and games', note: 'A kite flies on the wind at the end of a string.' },
    { w: 'skipping', cat: 'Toys and games', note: 'Skipping over a turning rope, often to a rhyme, was a favourite playground game.' },
    { w: 'knucklebones', cat: 'Toys and games', note: 'Knucklebones is a game of tossing and catching small bones, a bit like jacks.' },
    { w: 'tiddlywinks', cat: 'Toys and games', note: 'In tiddlywinks you flick small discs into a cup by pressing them with a bigger disc.' },
    { w: 'halma', cat: 'Toys and games', note: 'Halma is a board game where you hop your pieces across to the opposite corner.' },
    { w: 'ludo', cat: 'Toys and games', note: 'Ludo is a race game with dice, first sold in England in 1896.' },
    { w: 'spinning top', cat: 'Toys and games', note: 'A spinning top is a toy you whip or wind up to make it spin on its point.' },
    { w: 'rocking horse', cat: 'Toys and games', note: 'A rocking horse is a wooden horse on curved rockers that you ride indoors.' },
    { w: 'tin soldier', cat: 'Toys and games', note: 'A tin soldier was a small metal toy soldier, often painted by hand.' },
    { w: 'jack-in-the-box', cat: 'Toys and games', note: 'A jack-in-the-box is a box with a little clown on a spring that pops out when the lid opens.' },
    { w: 'picture book', cat: 'Toys and games', note: 'A picture book tells its story with pictures on every page.' },
    { w: 'toffee', cat: 'Sweets', note: 'Toffee is a hard sweet made by boiling sugar and butter.' },
    { w: 'humbug', cat: 'Sweets', note: 'A humbug is a striped boiled sweet that tastes of peppermint.' },
    { w: 'barley sugar', cat: 'Sweets', note: 'Barley sugar is a twisted, golden boiled sweet.' },
    { w: 'gingerbread', cat: 'Sweets', note: 'Gingerbread is a spiced biscuit or cake, sometimes shaped like little people.' }
  ];

  /* The letters of English from most common to least common. Used for hints. */
  var LETTERS_BY_FREQUENCY = 'ETAOINSHRDLCUMWFGYPBVKJXQZ';
  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /* =====================================================================
     PART 2: THE RULES
     ===================================================================== */
  function isLetter(ch) { return ch >= 'A' && ch <= 'Z'; }

  /* Starts a round. `shownEnds` is true for the 1894 rules: the first and last letters are shown.
     Gomme wrote Elephant as E××××××t, so only those two boxes are filled in. The second E in the middle
     starts blank. The guesser already knows the word has an E, so pressing E is free: it fills in that
     box and costs nothing (see freeLetter below). The round is won as soon as every letter is known. */
  function newRound(word, shownEnds) {
    var state = {
      word: word.toUpperCase(),  /* e.g. "PENNY-FARTHING" */
      tried: {},                 /* letter -> 'right' | 'wrong' */
      shownAt: {},               /* position in the word -> true when that box was shown from the start */
      wrong: 0,                  /* how many pieces of the candle have burnt */
      over: false,
      won: false
    };
    if (shownEnds) {
      var first = -1, last = -1;
      for (var i = 0; i < state.word.length; i++) {
        if (isLetter(state.word[i])) { if (first < 0) first = i; last = i; }
      }
      if (first >= 0) { state.shownAt[first] = true; state.shownAt[last] = true; }
    }
    if (solved(state)) state.over = state.won = true;  /* a two-letter word under 1894 rules is already solved */
    return state;
  }

  /* The letters shown from the start (the first and last letters under the 1894 rules), without repeats. */
  function shownLetters(state) {
    var out = [];
    Object.keys(state.shownAt).forEach(function (i) {
      var ch = state.word[Number(i)];
      if (out.indexOf(ch) === -1) out.push(ch);
    });
    return out;
  }

  /* True when the guesser knows this letter is in the word: it was shown, or it was guessed right. */
  function known(state, letter) {
    return state.tried[letter] === 'right' || shownLetters(state).indexOf(letter) !== -1;
  }

  /* True for a letter that was shown at an end but also hides inside the word, like the middle K and A in
     KOOKABURRA (shown as K _ _ _ _ _ _ _ _ A). Its key stays switched on, and pressing it fills in the blank
     copies for free. Once pressed, it counts as tried like any other letter. */
  function freeLetter(state, letter) {
    if (state.tried[letter] || shownLetters(state).indexOf(letter) === -1) return false;
    for (var i = 0; i < state.word.length; i++) {
      if (state.word[i] === letter && !state.shownAt[i]) return true;
    }
    return false;
  }

  /* True when this letter can still be guessed: not tried yet, and either not known or a free letter. */
  function canGuess(state, letter) {
    if (state.tried[letter]) return false;
    return !known(state, letter) || freeLetter(state, letter);
  }

  /* True when every letter of the word is known. A word like BEE is solved before it starts (B and E are
     shown and the middle is another E), so the computer never picks one and Player 1 is asked for another. */
  function solved(state) {
    for (var i = 0; i < state.word.length; i++) {
      var ch = state.word[i];
      if (isLetter(ch) && !known(state, ch)) return false;
    }
    return true;
  }

  /* A guess. Returns 'repeat', 'right' or 'wrong' and updates the state.
     Only a letter that is not in the word burns the candle, so a free letter (see above) costs nothing. */
  function guess(state, letter) {
    if (state.over || state.tried[letter]) return 'repeat';
    var inWord = state.word.indexOf(letter) !== -1;
    state.tried[letter] = inWord ? 'right' : 'wrong';
    if (!inWord) state.wrong++;
    if (solved(state)) { state.over = true; state.won = true; }
    else if (state.wrong >= MAX_WRONG) { state.over = true; }
    return inWord ? 'right' : 'wrong';
  }

  /* The letters still unknown, in word order, without repeats. */
  function hiddenLetters(state) {
    var out = [];
    for (var i = 0; i < state.word.length; i++) {
      var ch = state.word[i];
      if (isLetter(ch) && !known(state, ch) && out.indexOf(ch) === -1) out.push(ch);
    }
    return out;
  }

  /* Counts the real letters in a word (spaces and hyphens do not count). */
  function letterCount(word) { return word.split('').filter(isLetter).length; }

  /* Turns a typed secret into a clean word, or explains what is wrong with it. */
  function cleanSecret(raw) {
    var text = String(raw || '');
    if (text.normalize) text = text.normalize('NFD').replace(/[̀-ͯ]/g, '');  /* é becomes e */
    text = text.toUpperCase().replace(/\s+/g, ' ').replace(/^[\s-]+|[\s-]+$/g, '');
    if (!text) return { error: 'Type a secret word first.' };
    if (/[^A-Z \-]/.test(text)) return { error: 'Use letters only. Spaces and hyphens are fine.' };
    var n = letterCount(text);
    if (n < 2) return { error: 'The word needs at least two letters.' };
    if (n > 20) return { error: 'Keep it to twenty letters or fewer.' };
    return { word: text };
  }

  /* =====================================================================
     PART 3: THE COMPUTER
     ===================================================================== */

  /* Under the 1894 rules the first and last letters are shown, so a word needs at least two different letters
     still hidden, or the round is over in a guess or two (EMU shows as E _ U). Short words like that are
     skipped, and so is a word the shown letters would give away completely, like EEL. */
  function fairUnder1894(word) { return hiddenLetters(newRound(word, true)).length >= 2; }

  /* Picks a word the player has not seen lately. `recent` is a list of recent words; the computer
     keeps the last fifteen and will not pick one of those unless the list is nearly used up. */
  function pickWord(list, recent, random, shownEnds) {
    var usable = list.filter(function (e) { return !shownEnds || fairUnder1894(e.w); });
    var fresh = usable.filter(function (e) { return recent.indexOf(e.w) === -1; });
    var pool = fresh.length ? fresh : usable;
    var entry = pool[Math.floor(random() * pool.length)];
    recent.push(entry.w);
    while (recent.length > 15) recent.shift();
    return entry;
  }

  /* A hint: the computer looks at the letters still hidden and picks the one that is most common
     in English. That is the letter you were most likely to guess next anyway, so the hint is honest
     help, not a giveaway. (E is the most common letter, then T, A, O, I, N, ...) */
  function hintLetter(state) {
    var hidden = hiddenLetters(state);
    var best = null, bestRank = 99;
    hidden.forEach(function (ch) {
      var rank = LETTERS_BY_FREQUENCY.indexOf(ch);
      if (rank < bestRank) { bestRank = rank; best = ch; }
    });
    return best;
  }

  /* =====================================================================
     PART 4: THE SCREEN
     ===================================================================== */
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, String(attrs[k])); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }

  /* The game sits on a school slate: the word is written in chalk, and the candle is drawn in cream wax
     with slate-dark lines between its eight pieces, so they can be counted from the back of a classroom. */
  var P = '.game-hangman ';
  var CHALK_FONT = '"Cabin Sketch", var(--font-display)';
  var CSS = [
    '.game-hangman { container: hm / inline-size; --hm-wax: color-mix(in srgb, var(--ink) 88%, var(--gold)); --hm-line: color-mix(in srgb, var(--ink) 78%, transparent); --hm-red: color-mix(in srgb, var(--red) 65%, var(--ink)); --hm-dust: color-mix(in srgb, var(--ink) 8%, transparent); }',
    /* ----- top row: New word and the score ----- */
    P + '.hm-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .6rem 1rem; margin-bottom: 1rem; }',
    P + '.hm-top .game-toolbar { margin: 0; }',
    P + '.hm-score { list-style: none; margin: 0; padding: 0; display: flex; gap: .5rem; font-weight: 400; }',
    P + '.hm-score li { margin: 0; min-width: 4rem; display: grid; justify-items: center; gap: .1rem; padding: .3rem .55rem .35rem; border: 2px dashed var(--line); border-radius: 12px; text-align: center; }',
    P + '.hm-lbl { font-family: var(--font-mono); font-size: .74rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-muted); line-height: 1.2; }',
    P + '.hm-num { font-family: var(--font-poster); font-weight: 400; font-size: 1.8rem; line-height: 1; color: var(--ink); }',
    P + '.hm-num.is-bump { color: var(--gold); animation: hm-bump .55s cubic-bezier(.3, 1.6, .5, 1); }',
    '@keyframes hm-bump { 0% { transform: scale(1.8); } 100% { transform: none; } }',
    /* ----- the candle beside the word ----- */
    P + '.stage { display: flex; flex-wrap: wrap; gap: 1rem 1.75rem; align-items: flex-start; }',
    P + '.candle-col { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: .4rem; }',
    P + '.candle-svg { width: 160px; height: auto; display: block; overflow: visible; }',
    P + '.counter { font-weight: 700; font-variant-numeric: tabular-nums; text-align: center; white-space: nowrap; font-size: .95rem; color: var(--ink-muted); }',
    /* The flame and its wick sit in one group that glides down as the candle burns. */
    P + '.flame-group, ' + P + '.flame { transition: transform .45s cubic-bezier(.3, .7, .4, 1); }',
    P + '.flame-glow { animation: game-hangman-glow 1.6s ease-in-out infinite; }',
    P + '.flame-glow.is-still { animation: none; }',
    '@keyframes game-hangman-glow { 0%, 100% { opacity: .18; } 50% { opacity: .32; } }',
    /* a burnt piece flares and shrinks away */
    P + '.melt { transform-box: fill-box; transform-origin: 50% 100%; animation: hm-melt .55s ease-in both; pointer-events: none; }',
    '@keyframes hm-melt { 0% { opacity: 1; } 35% { fill: var(--brass-bright); } 100% { opacity: 0; transform: scaleY(.15); fill: var(--brass-bright); } }',
    /* the smoke rises when the candle goes out */
    P + '.smoke.is-rising { stroke-dasharray: 1 1; animation: hm-smoke 1.4s ease-out both; }',
    '@keyframes hm-smoke { 0% { stroke-dashoffset: 1; opacity: 0; } 12% { opacity: .9; } 100% { stroke-dashoffset: 0; opacity: .75; } }',
    /* ----- the word, in chalk ----- */
    P + '.play-col { flex: 1 1 240px; min-width: 0; display: flex; flex-direction: column; gap: .9rem; }',
    /* "word-info", not "info": the site already uses .info for the cards under the game, and hides it in classroom mode */
    P + '.word-info { color: var(--ink-muted); font-weight: 700; min-height: 1.5em; margin: 0; }',
    /* The word is a row of parts (one per word), each part a row of chunks (split after a hyphen), each chunk a row of
       letter boxes. Every level wraps, so a long word folds onto a second line instead of running off the screen. */
    P + '.word { display: flex; flex-wrap: wrap; justify-content: center; gap: .5rem 1.1rem; --box: 44px; padding: .25rem 0; max-width: 100%; min-width: 0; }',
    P + '.word-part { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; max-width: 100%; min-width: 0; }',
    P + '.word-chunk { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; max-width: 100%; min-width: 0; }',
    P + '.letter { width: var(--box); height: calc(var(--box) * 1.3); display: inline-flex; align-items: flex-end; justify-content: center; box-sizing: border-box;' +
      ' font-family: ' + CHALK_FONT + '; font-weight: 700; font-size: calc(var(--box) * .82); line-height: 1; padding-bottom: .1em;' +
      ' border-bottom: 4px solid var(--hm-line); border-radius: 1px; color: var(--ink); text-transform: uppercase; text-shadow: 0 0 10px color-mix(in srgb, var(--ink) 22%, transparent); }',
    P + '.letter--shown { color: var(--link); }',   /* shown from the start: yellow chalk */
    P + '.letter--punct { border-bottom-color: transparent; color: var(--ink-muted); width: calc(var(--box) * .5); }',   /* a hyphen needs only half a box */
    P + '.letter--missed { color: var(--hm-red); border-bottom-color: var(--hm-red); }',
    /* a letter appears as if written in chalk */
    P + '.letter.is-new { animation: hm-chalk .38s ease-out var(--hm-d, 0s) both; }',
    '@keyframes hm-chalk { 0% { opacity: 0; transform: translateY(4px) scale(1.35); filter: blur(2px); } 100% { opacity: 1; transform: none; filter: none; } }',
    /* the word is guessed: every letter turns gold and a wave runs along it */
    P + '.word.is-won .letter:not(.letter--punct) { color: var(--gold); border-bottom-color: var(--gold); animation: hm-wave .6s ease var(--hm-d, 0s) both; }',
    '@keyframes hm-wave { 0%, 100% { transform: none; } 40% { transform: translateY(-12px) rotate(-3deg); } }',
    /* ----- the letter keys ----- */
    P + '.keys { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 6px; max-width: 600px; }',
    P + '.key { min-width: 36px; min-height: 44px; aspect-ratio: 1 / 1; padding: 0; border-radius: 10px; border: 2px solid color-mix(in srgb, var(--ink) 34%, transparent);' +
      ' background: var(--hm-dust); color: var(--ink); font-family: var(--font-head); font-weight: 800; font-size: 1.25rem; cursor: pointer; transition: transform .12s ease, background-color .12s ease; }',
    /* hover is a brighter chalk smudge, never the gold of a shown letter */
    P + '.key:hover:not([disabled]):not(.is-shown) { background: color-mix(in srgb, var(--ink) 18%, transparent); border-color: var(--ink-muted); transform: translateY(-1px); }',
    P + '.key[disabled] { cursor: default; }',
    /* a key that is switched off but was never tried (while the computer is choosing, or after the round) looks faded */
    P + '.key[disabled]:not(.is-right):not(.is-wrong):not(.is-shown) { opacity: .5; }',
    /* right is green, wrong is red and struck through, and a letter shown from the start is solid gold; all with dark letters */
    P + '.key.is-right { background: var(--green); border-color: var(--green); color: var(--on-era); }',
    P + '.key.is-wrong { background: var(--red); border-color: var(--red); color: var(--on-era); text-decoration: line-through; text-decoration-thickness: 2px; }',
    P + '.key.is-shown { background: var(--gold); border-color: var(--gold); color: var(--on-era); }',
    /* a shown letter that also hides inside the word can still be pressed, for free: it glows */
    P + '.key.is-shown:not([disabled]) { box-shadow: 0 0 0 4px color-mix(in srgb, var(--gold) 38%, transparent); }',
    P + '.key.is-shake { animation: hm-shake .32s ease; }',
    '@keyframes hm-shake { 20%, 60% { transform: translateX(-5px); } 40%, 80% { transform: translateX(5px); } }',
    P + '.key-row { display: flex; flex-wrap: wrap; gap: .6rem .8rem; align-items: center; }',
    P + '.key-row .game-note { margin: 0; flex: 1 1 14rem; }',
    /* ----- after the round ----- */
    P + '.result { border: 2px solid var(--gold); border-radius: 16px; background: var(--hm-dust); padding: .8rem 1rem; display: flex; flex-wrap: wrap; gap: .6rem 1rem; align-items: center; justify-content: space-between; }',
    P + '.result p { margin: 0; flex: 1 1 220px; }',
    P + '.result b { font-family: ' + CHALK_FONT + '; font-weight: 700; font-size: 1.3em; letter-spacing: .04em; color: var(--link); }',
    P + '.result.is-new { animation: hm-pop .45s cubic-bezier(.3, 1.5, .5, 1) both; }',
    '@keyframes hm-pop { 0% { transform: scale(.85); opacity: 0; } 100% { transform: none; opacity: 1; } }',
    /* ----- the two-player form ----- */
    P + '.setup { display: flex; flex-direction: column; gap: .75rem; max-width: 420px; }',
    P + '.setup label { display: flex; flex-direction: column; gap: .25rem; font-weight: 700; }',
    P + '.setup input { min-height: 44px; padding: .4rem .7rem; border-radius: 10px; border: 2px solid color-mix(in srgb, var(--ink) 40%, transparent); background: var(--hm-dust); color: var(--ink); font-size: 1.1rem; font-weight: 400; width: 100%; box-sizing: border-box; }',
    P + '.setup .error { color: var(--hm-red); font-weight: 700; min-height: 1.4em; margin: 0; }',
    /* the secret word is a plain text box with its letters drawn as dots, so iPads do not offer to save it as a password */
    P + '.setup input.secret { -webkit-text-security: disc; }',
    /* the form sits inside the board, which turns text selection off; turn it back on for the inputs (iPads need this) */
    P + '.setup input { user-select: text; -webkit-user-select: text; touch-action: auto; }',
    /* ----- settings, under the slate's chalk line ----- */
    P + '.hm-settings { margin: 1.25rem 0 0; padding-top: 1rem; border-top: 2px dashed var(--line); }',
    P + '.seg { max-width: 100%; }',
    P + '.seg button { white-space: normal; min-height: 44px; }',
    P + '.seg .short { display: none; }',
    /* the echo repeats the status line next to the word; it only shows on phones (see below) */
    P + '.echo { display: none; margin: 0; font-weight: 700; text-align: center; min-height: 1.5em; color: var(--link); }',
    /* Wide screens: the alphabet in two rows of thirteen. */
    '@container hm (min-width: 760px) { ' + P + '.keys { grid-template-columns: repeat(13, minmax(0, 1fr)); max-width: 720px; } }',
    /* Phones: the candle goes small and sits beside its counter, and the status is repeated under the word. */
    '@container hm (max-width: 560px) {',
    P + '.stage { flex-direction: column; flex-wrap: nowrap; align-items: stretch; }',
    P + '.candle-col { flex-direction: row; justify-content: center; gap: 1rem; }',
    P + '.candle-svg { width: 76px; }',
    P + '.counter { white-space: normal; min-width: 0; }',
    P + '.keys { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 4px; }',   /* six keys a row: five short rows, so the word, the echo and the keys fit on one phone screen */
    P + '.hm-score li { min-width: 3.5rem; padding: .25rem .45rem .3rem; }',
    P + '.key { font-size: 1.1rem; aspect-ratio: auto; }',
    /* short button labels on phones, so the settings take less room */
    P + '.seg .long { display: none; }',
    P + '.seg .short { display: inline; }',
    P + '.echo { display: block; }',
    '}',
    /* Classroom mode (for projecting): a bigger candle and bigger keys. */
    '.classroom ' + P + '.candle-svg { width: 200px; }',
    '.classroom ' + P + '.key { font-size: 1.5rem; }',
    '@media (prefers-reduced-motion: reduce) { ' + P + '.flame-group, ' + P + '.flame, ' + P + '.key { transition: none; } ' + P + '.letter, ' + P + '.key, ' + P + '.result, ' + P + '.hm-num, ' + P + '.smoke { animation: none !important; } ' + P + '.melt { display: none; } }'
  ].join('\n');

  GamesInTime.register({
    id: 'hangman',
    frame: 'slate',   /* the 1894 game was played on a slate */
    mount: function (root, api) {
      var h = api.h;
      var RM = !!api.reducedMotion;
      root.appendChild(h('style', null, CSS));

      /* ---- settings, remembered between visits ---- */
      var rules = api.store.get('rules', '1894') === 'classic' ? 'classic' : '1894';
      var mode = api.store.get('mode', 'computer') === 'two' ? 'two' : 'computer';

      var state = null;          /* the current round, or null while the computer is choosing or Player 1 is typing */
      var entry = null;          /* the word list entry for this round (computer mode) */
      var playerHint = '';       /* the optional hint typed by Player 1 */
      var score = { won: 0, lost: 0 };
      var recentAnimals = [], recentClassic = [];
      var timer = null;
      var keyButtons = {};       /* letter -> its on-screen button */
      var tabKey = null;         /* the one letter key that Tab lands on (the arrow keys move between the others) */
      var announced = false;     /* true once this game has said something to screen readers */
      var cleanedUp = false;
      var revealed = {};         /* positions in the word already drawn, so only new letters get the chalk animation */

      /* ---- top row: New word and the score ----
         In two-player mode the score labels say "Guesser won" and "Guesser lost", because after a swap the
         guesser is a different person. The score is a list, so a screen reader reads the two numbers apart. */
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { api.sound('click'); startRound(true); } }, 'New word');
      var wonEl = h('b', { class: 'hm-num' }, '0'), lostEl = h('b', { class: 'hm-num' }, '0');
      var wonLabel = h('span', { class: 'hm-lbl' }, 'Won'), lostLabel = h('span', { class: 'hm-lbl' }, 'Lost');
      var scoreboard = h('ul', { class: 'scoreboard hm-score', 'aria-label': 'Score' },
        h('li', { class: 'score-won' }, wonLabel, h('span', { class: 'visually-hidden' }, ': '), wonEl),
        h('li', { class: 'score-lost' }, lostLabel, h('span', { class: 'visually-hidden' }, ': '), lostEl));

      /* ---- the settings ----
         Some buttons have a long label and a short one. Phones show the short one (see the CSS). */
      function label(long, short) { return [h('span', { class: 'long' }, long), h('span', { class: 'short' }, short)]; }
      var rules1894 = h('button', { type: 'button', 'aria-pressed': 'true', onclick: function () { setRules('1894'); } }, label('1894 rules: Birds, Beasts and Fishes', '1894 rules'));
      var rulesClassic = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setRules('classic'); } }, 'Classic');
      var modeComputer = h('button', { type: 'button', 'aria-pressed': 'true', onclick: function () { setMode('computer'); } }, label('Play the computer', 'Computer'));
      var modeTwo = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setMode('two'); } }, label('Two players: one types a secret word', 'Two players'));

      /* ---- the candle ----
         Eight pieces stacked in a brass holder. Each wrong guess burns the top piece away and the flame sinks and
         shrinks. The eighth wrong guess snuffs the candle: the flame goes and a wisp of smoke rises. */
      var WAX = 'var(--hm-wax)', WAX_LINE = 'var(--surface)';
      var SEG_H = 15, CANDLE_X = 48, CANDLE_W = 44, CANDLE_BOTTOM = 200, CX = 70;
      var TOP_FULL = CANDLE_BOTTOM - 9 - MAX_WRONG * SEG_H;   /* the top of a whole candle */
      var pieces = [];
      var candleSvg = svgEl('svg', { class: 'candle-svg', viewBox: '0 0 140 240', role: 'img', 'aria-label': 'Candle' });
      /* holder: a dish, a base and a ring handle, all in brass */
      candleSvg.appendChild(svgEl('ellipse', { cx: CX, cy: 222, rx: 58, ry: 11, fill: 'var(--brass)' }));
      candleSvg.appendChild(svgEl('circle', { cx: 122, cy: 198, r: 11, fill: 'none', stroke: 'var(--brass)', 'stroke-width': 6 }));
      candleSvg.appendChild(svgEl('path', { d: 'M28,196 L112,196 L112,208 Q112,218 100,218 L40,218 Q28,218 28,208 Z', fill: 'var(--brass)' }));
      candleSvg.appendChild(svgEl('ellipse', { cx: CX, cy: 196, rx: 42, ry: 7, fill: 'var(--brass-bright)' }));
      /* a stub that always stays, so the holder is never empty */
      candleSvg.appendChild(svgEl('rect', { x: CANDLE_X, y: 191, width: CANDLE_W, height: 7, rx: 2, fill: WAX, stroke: WAX_LINE, 'stroke-width': 2 }));
      /* the eight pieces, bottom to top */
      for (var p = 0; p < MAX_WRONG; p++) {
        var piece = svgEl('rect', { class: 'piece', x: CANDLE_X, y: CANDLE_BOTTOM - 9 - (p + 1) * SEG_H, width: CANDLE_W, height: SEG_H, rx: 3, fill: WAX, stroke: WAX_LINE, 'stroke-width': 2 });
        pieces.push(piece);
        candleSvg.appendChild(piece);
      }
      /* The wick, glow and flame are drawn on top of a whole candle; the group slides down as pieces burn. */
      var wick = svgEl('line', { class: 'wick', x1: CX, x2: CX, y1: TOP_FULL, y2: TOP_FULL - 9, stroke: 'var(--ink)', 'stroke-width': 3, 'stroke-linecap': 'round' });
      var flameGlow = svgEl('circle', { class: 'flame-glow' + (RM ? ' is-still' : ''), cx: CX, cy: TOP_FULL - 26, r: 30, fill: 'var(--brass-bright)', opacity: .18 });
      var flameOuter = svgEl('path', { d: 'M0,-36 C 13,-19 15,-6 0,7 C -15,-6 -13,-19 0,-36 Z', fill: 'var(--brass-bright)' });
      var flameInner = svgEl('path', { d: 'M0,-17 C 5,-9 6,-3 0,3 C -6,-3 -5,-9 0,-17 Z', fill: WAX, opacity: .9 });   /* a pale centre, like a real flame */
      var flame = svgEl('g', { class: 'flame' }, flameOuter, flameInner);
      var flameGroup = svgEl('g', { class: 'flame-group' }, flameGlow, wick, flame);
      var smoke = svgEl('path', { class: 'smoke', pathLength: 1, d: 'M70,186 C 58,170 84,158 70,140 C 56,122 86,110 72,90 C 64,78 74,66 70,56', fill: 'none', stroke: 'var(--ink-muted)', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: .75 });
      candleSvg.appendChild(flameGroup);
      candleSvg.appendChild(smoke);
      var counter = h('div', { class: 'counter', 'aria-live': 'off' }, 'Wrong guesses: 0 of ' + MAX_WRONG);
      var candleCol = h('div', { class: 'candle-col' }, candleSvg, counter);

      function drawCandle(wrong) {
        var left = MAX_WRONG - wrong;
        for (var i = 0; i < MAX_WRONG; i++) pieces[i].setAttribute('visibility', i < left ? 'visible' : 'hidden');
        if (left > 0) {
          var scale = 0.45 + 0.55 * (left / MAX_WRONG);           /* the flame shrinks as the candle burns */
          flameGroup.style.transform = 'translateY(' + (MAX_WRONG - left) * SEG_H + 'px)';
          flame.style.transform = 'translate(' + CX + 'px, ' + (TOP_FULL - 10) + 'px) scale(' + scale.toFixed(3) + ')';
          flameGlow.setAttribute('r', Math.round(30 * scale));
          wick.setAttribute('visibility', 'visible');
          flame.setAttribute('visibility', 'visible');
          flameGlow.setAttribute('visibility', 'visible');
          smoke.setAttribute('visibility', 'hidden');
          smoke.classList.remove('is-rising');
          candleSvg.setAttribute('aria-label', 'Candle burning, ' + left + ' of ' + MAX_WRONG + ' pieces left');
        } else {
          wick.setAttribute('visibility', 'hidden');
          flame.setAttribute('visibility', 'hidden');
          flameGlow.setAttribute('visibility', 'hidden');
          smoke.setAttribute('visibility', 'visible');
          candleSvg.setAttribute('aria-label', 'The candle has gone out');
        }
        counter.textContent = 'Wrong guesses: ' + wrong + ' of ' + MAX_WRONG;
      }
      /* The piece that has just burnt flares and shrinks away (a copy of it, so the real piece is simply hidden). */
      function meltPiece(index) {
        if (RM || index < 0 || index >= MAX_WRONG) return;
        var m = pieces[index].cloneNode(false);
        m.setAttribute('class', 'melt');
        m.removeAttribute('visibility');
        m.addEventListener('animationend', function () { m.remove(); });
        candleSvg.insertBefore(m, flameGroup);
      }

      /* ---- the word and the keyboard ---- */
      var info = h('p', { class: 'word-info' });
      var wordRow = h('div', { class: 'word', role: 'group', 'aria-label': 'The word' });
      /* The echo shows the latest status again, right under the word. Only phones show it, because there the
         status line is scrolled off the top while you tap the keys. Screen readers skip it (they already
         heard the status line). */
      var echo = h('p', { class: 'echo', 'aria-hidden': 'true' });
      /* The 26 letter keys are one stop for the Tab key; the arrow keys move between them (see onKeysKeyDown). */
      var keys = h('div', { class: 'keys', role: 'group', 'aria-label': 'Letters. Use the arrow keys to move between them', onkeydown: onKeysKeyDown });
      ALPHABET.split('').forEach(function (L) {
        var b = h('button', { class: 'key', type: 'button', tabindex: '-1', 'data-letter': L, 'aria-label': 'Letter ' + L, onclick: function () { tryLetter(L); },
          onanimationend: function () { b.classList.remove('is-shake'); } }, L);
        keyButtons[L] = b;
        keys.appendChild(b);
      });
      var hintBtn = h('button', { class: 'btn', type: 'button', onclick: giveHint, 'aria-label': 'Hint, costs one wrong guess' }, 'Hint');
      var keyRow = h('div', { class: 'key-row' }, hintBtn, h('span', { class: 'game-note' }, 'A hint costs one wrong guess. Tip: try common letters first. E, T, A, O, I and N are the most used letters in English.'));
      var result = h('div', { class: 'result', hidden: true });

      /* ---- the two-player form ---- */
      /* The secret word box is a plain text box whose letters are drawn as dots (the "secret" class in the CSS).
         A password box would make iPads offer to save the word as a password. Browsers that cannot draw the
         dots get a password box instead, so the word is still hidden from Player 2. */
      var canDot = !!(window.CSS && window.CSS.supports && window.CSS.supports('-webkit-text-security', 'disc'));   /* window.CSS, because CSS in this file is our style text */
      var secretInput = h('input', { type: canDot ? 'text' : 'password', class: 'secret', id: 'hangman-secret', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false', 'data-1p-ignore': 'true', 'data-lpignore': 'true', maxlength: 40, 'aria-describedby': 'hangman-secret-help' });
      var hintInput = h('input', { type: 'text', id: 'hangman-hint', autocomplete: 'off', maxlength: 40 });
      var setupError = h('p', { class: 'error', role: 'alert' });
      var setup = h('form', { class: 'setup', hidden: true, onsubmit: function (ev) { ev.preventDefault(); startTwoPlayer(); } },
        h('label', { for: 'hangman-secret' }, 'Player 1, type a secret word', secretInput),
        h('p', { class: 'game-note', id: 'hangman-secret-help', style: { marginTop: '0' } }, 'Letters only, up to twenty. The letters are hidden as you type. Player 2, look away!'),
        h('label', { for: 'hangman-hint' }, 'A hint for Player 2 (optional)', hintInput),
        setupError,
        h('div', null, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Start')));

      /* Top to bottom: New word and the score, then the candle and the word, then the settings. */
      var playCol = h('div', { class: 'play-col' }, info, wordRow, echo, result, keys, keyRow, setup);
      var stage = h('div', { class: 'board stage' }, candleCol, playCol);
      root.appendChild(h('div', { class: 'hm-top' }, h('div', { class: 'game-toolbar' }, newBtn), scoreboard));
      root.appendChild(stage);
      root.appendChild(h('div', { class: 'game-toolbar hm-settings' },
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Rules' }, rules1894, rulesClassic),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Who plays' }, modeComputer, modeTwo)));

      /* ---- settings ---- */
      function setRules(r) {
        rules = r;
        api.store.set('rules', r);
        rules1894.setAttribute('aria-pressed', String(r === '1894'));
        rulesClassic.setAttribute('aria-pressed', String(r === 'classic'));
        api.sound('click');
        startRound(true);
      }
      function setMode(m) {
        mode = m;
        api.store.set('mode', m);
        modeComputer.setAttribute('aria-pressed', String(m === 'computer'));
        modeTwo.setAttribute('aria-pressed', String(m === 'two'));
        score.won = score.lost = 0;
        showScore();
        api.sound('click');
        startRound(true);
      }
      /* `bump` names the number that has just gone up, so it can jump. */
      function showScore(bump) {
        wonLabel.textContent = mode === 'two' ? 'Guesser won' : 'Won';
        lostLabel.textContent = mode === 'two' ? 'Guesser lost' : 'Lost';
        wonEl.textContent = String(score.won); lostEl.textContent = String(score.lost);
        [[wonEl, 'won'], [lostEl, 'lost']].forEach(function (x) {
          x[0].classList.remove('is-bump');
          if (bump === x[1] && !RM) { void x[0].offsetWidth; x[0].classList.add('is-bump'); }
        });
      }

      /* Sets the status line, and the echo under the word on phones. */
      function setStatus(text) { api.status(text); echo.textContent = text; }
      /* Status lines while guessing. In two-player mode they start with "Player 2:" so both kids know whose go it is. */
      function say(text) { setStatus(mode === 'two' ? 'Player 2: ' + text : text); }
      /* Sends a message to screen readers only. */
      function announce(text) { announced = true; api.announce(text); }

      /* ---- starting a round ----
         `byHand` is true when a person pressed something, so the new word arrives with a sound (not on page load). */
      function startRound(byHand) {
        if (timer) { clearTimeout(timer); timer = null; }
        /* If "Next word" was pressed with the keyboard, the focus is on a button that is about to be hidden.
           Remember that, so the focus can go somewhere useful instead of getting lost. */
        var refocus = result.contains(document.activeElement);
        state = null; entry = null; playerHint = '';
        result.hidden = true;
        drawCandle(0);
        if (mode === 'two') {
          /* Player 1 types a word while Player 2 looks away */
          setup.hidden = false; keys.hidden = true; keyRow.hidden = true; wordRow.hidden = true;
          info.textContent = rules === '1894' ? 'Player 2 will see the first and last letters.' : 'Player 2 will see only dashes.';
          secretInput.value = ''; hintInput.value = ''; setupError.textContent = '';
          setStatus('Player 1, type a secret word. Player 2, look away!');
          if (refocus) secretInput.focus();
          return;
        }
        /* the computer chooses: a short pause so the change is easy to see */
        setup.hidden = true; keys.hidden = false; keyRow.hidden = false; wordRow.hidden = false;
        wordRow.replaceChildren();
        wordRow.classList.remove('is-won');
        info.textContent = '';
        setKeysEnabled(false);
        setStatus('The computer is choosing a word');
        timer = setTimeout(function () {
          timer = null;
          if (!root.isConnected) return;   /* the visitor left while the computer was thinking */
          entry = rules === '1894' ? pickWord(ANIMALS, recentAnimals, api.random, true) : pickWord(CLASSIC, recentClassic, api.random, false);
          beginRound(entry.w, entry.cat);
          if (byHand) api.sound('chalk');
          if (refocus && (!document.activeElement || document.activeElement === document.body)) focusKeys();
        }, RM ? 0 : THINK_MS);
      }

      function startTwoPlayer() {
        var cleaned = cleanSecret(secretInput.value);
        if (!cleaned.error && rules === '1894' && newRound(cleaned.word, true).over) {
          cleaned.error = 'Under the 1894 rules the first and last letters are shown, so that word would be given away. Try a longer one.';
        }
        if (cleaned.error) { setupError.textContent = cleaned.error; api.sound('wrong'); secretInput.focus(); return; }
        playerHint = hintInput.value.trim();
        setup.hidden = true; keys.hidden = false; keyRow.hidden = false; wordRow.hidden = false;
        beginRound(cleaned.word, playerHint ? 'Hint: ' + playerHint : "Player 1's word");
        api.sound('chalk');
        setStatus('Player 1, pass the device to Player 2. ' + startMessage());
        /* Take the focus out of the hidden form and put it on the letter keys. Otherwise the secret box keeps
           the focus, and Player 2's first typed letters would go into it instead of being guesses. */
        if (!focusKeys()) secretInput.blur();
      }

      /* Sets up the screen for a word. `label` is the category or hint shown above the word. */
      function beginRound(word, label) {
        word = word.toUpperCase();
        state = newRound(word, rules === '1894');
        revealed = {};
        wordRow.classList.remove('is-won');
        var n = letterCount(word), parts = word.split(' ').length;
        info.textContent = label + ' · ' + n + ' letters' + (parts > 1 ? ', ' + parts + ' words' : '') +
          (rules === '1894' ? ' · first and last letters shown' : '');
        drawCandle(0);
        resetKeys();
        renderWord();
        if (state.over) finishRound(); else { say(startMessage()); hintBtn.disabled = false; }
      }

      /* "Guess a letter", plus a tip when a shown letter also hides inside the word (1894 rules only). */
      function startMessage() {
        var free = shownLetters(state).filter(function (L) { return freeLetter(state, L); });
        if (!free.length) return 'Guess a letter';
        return 'Guess a letter. ' + free.join(' and ') + (free.length > 1 ? ' are' : ' is') +
          ' in the word more than once: press ' + (free.length > 1 ? 'them' : 'it') + ' for free';
      }

      /* ---- guessing ---- */
      function tryLetter(L) {
        if (!state || state.over) return;
        if (state.tried[L]) { api.sound('tick'); say('You already tried ' + L); return; }
        if (!canGuess(state, L)) { api.sound('tick'); say(L + ' is already shown'); return; }   /* a typed first or last letter under the 1894 rules */
        var free = freeLetter(state, L);
        var hadFocus = document.activeElement === keyButtons[L];   /* was this key pressed with Tab and Space or Enter? */
        var outcome = guess(state, L);
        markKey(L, outcome);
        renderWord();
        api.sound(outcome === 'wrong' ? 'wrong' : free ? 'pop' : 'chalk');
        if (outcome === 'wrong') { meltPiece(MAX_WRONG - state.wrong); shake(L); }
        if (state.over) { finishRound(); if (hadFocus) focusAfterRound(); return; }
        /* the key just switched itself off, which would drop the keyboard focus; move it on to the next key */
        if (hadFocus) focusKeys(nextKey(L, 1));
        if (free) {
          say(L + ' is in the word more than once. That one was free');
        } else if (outcome === 'right') {
          say(L + ' is in the word');
        } else {
          say('No ' + L + '. Wrong guesses: ' + state.wrong + ' of ' + MAX_WRONG);
          drawCandle(state.wrong);
          hintBtn.disabled = state.wrong >= MAX_WRONG - 1;   /* a hint would put the candle out, so no more hints */
        }
      }
      function shake(L) {
        if (RM) return;
        var b = keyButtons[L];
        b.classList.remove('is-shake'); void b.offsetWidth; b.classList.add('is-shake');
      }

      /* A hint burns one piece of the candle and reveals a letter (see hintLetter in Part 3). */
      function giveHint() {
        if (!state || state.over) return;
        var hadFocus = document.activeElement === hintBtn;
        if (state.wrong >= MAX_WRONG - 1) {
          api.sound('wrong');
          say('No hints left: one more wrong guess would put the candle out');
          hintBtn.disabled = true;
          if (hadFocus) focusKeys();
          return;
        }
        var L = hintLetter(state);
        if (!L) return;
        state.wrong++;
        api.sound('tick');
        meltPiece(MAX_WRONG - state.wrong);
        drawCandle(state.wrong);
        var outcome = guess(state, L);
        markKey(L, outcome);
        renderWord();
        if (state.over) { finishRound(); if (hadFocus) focusAfterRound(); return; }
        say('Hint: there is a' + (/^[AEFHILMNORSX]$/.test(L) ? 'n ' : ' ') + L + ' in the word. Wrong guesses: ' + state.wrong + ' of ' + MAX_WRONG);
        if (state.wrong >= MAX_WRONG - 1) { hintBtn.disabled = true; if (hadFocus) focusKeys(); }   /* a switched-off button loses the focus */
      }

      function finishRound() {
        var word = state.word;
        var two = mode === 'two';
        if (state.won) {
          score.won++;
          setStatus('You got it: ' + word + (two ? '. Player 2 wins this round' : ''));
          wordRow.classList.toggle('is-won', true);
          api.celebrate(two ? 'Player 2 got it: ' + word + '!' : 'You got it: ' + word + '!');
        } else {
          score.lost++;
          /* A loss against the computer gets a kind word. In two players, the candle going out is Player 1's win. */
          setStatus('The candle went out. The word was ' + word + (two ? '. Player 1 wins this round' : '. Good try, have another go!'));
          drawCandle(MAX_WRONG);
          if (!RM) smoke.classList.add('is-rising');
          renderWord();  /* shows the letters that were missed, in red */
          api.sound('whoosh');
          if (two) api.celebrate('Player 1 wins! ' + word + ' stumped Player 2.');
          else api.sound('lose');
        }
        showScore(state.won ? 'won' : 'lost');
        setKeysEnabled(false);
        hintBtn.disabled = true;
        /* the meaning of the word, and a way to the next round */
        var note = entry ? entry.note : (playerHint ? 'Player 1\'s hint was: ' + playerHint : 'That was Player 1\'s word.');
        result.replaceChildren(
          h('p', null, h('b', null, word), ': ', note),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { api.sound('click'); startRound(true); } }, two ? 'Swap and play again' : 'Next word'));
        result.classList.toggle('is-new', !RM);
        result.hidden = false;
        echo.textContent = '';   /* the result box under the word says it all now */
        var who = two ? 'Player 2' : 'You';
        announce(who + (state.won ? ' won. ' : ' lost. ') + word + '. ' + note);
      }

      /* ---- drawing the word and the keys ---- */
      /* Draws one box per character. A space starts a new part; a hyphen ends a chunk, so a long word like
         PENNY-FARTHING can fold onto a second line after the hyphen when the screen is narrow.
         Letters that appear for the first time are written in with chalk, one after another. */
      function renderWord() {
        wordRow.replaceChildren();
        var spoken = [];
        var part = null, chunk = null, fresh = 0, n = 0;
        function newPart() { part = h('span', { class: 'word-part' }); wordRow.appendChild(part); chunk = null; }
        function addBox(box, i, hasText) {
          if (!part) newPart();
          if (!chunk) { chunk = h('span', { class: 'word-chunk' }); part.appendChild(chunk); }
          box.style.setProperty('--hm-d', (state.won ? n * 0.05 : fresh * 0.06).toFixed(2) + 's');
          if (hasText && !revealed[i] && !RM && !state.won) { box.classList.add('is-new'); fresh++; }
          if (hasText) revealed[i] = true;
          n++;
          chunk.appendChild(box);
        }
        for (var i = 0; i < state.word.length; i++) {
          var ch = state.word[i];
          if (ch === ' ') { newPart(); spoken.push('space'); continue; }
          if (!isLetter(ch)) {
            addBox(h('span', { class: 'letter letter--punct' }, ch), i, false);
            spoken.push(ch === '-' ? 'hyphen' : ch);
            chunk = null;   /* the next letter starts a new chunk, so a line may break here */
          } else if (state.shownAt[i]) {
            addBox(h('span', { class: 'letter letter--shown' }, ch), i, true);
            spoken.push(ch);
          } else if (state.tried[ch] === 'right' || (state.over && known(state, ch))) {
            addBox(h('span', { class: 'letter' }, ch), i, true);   /* guessed, or a second copy of a shown letter once the round is over */
            spoken.push(ch);
          } else if (state.over) {
            addBox(h('span', { class: 'letter letter--missed' }, ch), i, true);   /* round lost: show what was missed */
            spoken.push(ch);
          } else {
            addBox(h('span', { class: 'letter letter--blank' }), i, false);
            spoken.push('blank');
          }
        }
        wordRow.setAttribute('aria-label', 'The word: ' + spoken.join(', '));
        fitWord();
      }

      /* Picks a size for the letter boxes. The longest chunk stays on one line while the boxes can be at
         least COMFY_BOX wide; a longer chunk wraps onto as few lines as it needs, and the boxes are then made
         as big as those lines allow. A box is never smaller than MIN_BOX, so the letters stay readable. */
      var MIN_BOX = 26, COMFY_BOX = 30, MAX_BOX = 56, BOX_GAP = 4;
      function fitWord() {
        if (!state || wordRow.hidden) return;
        /* count the boxes in the longest chunk: a space ends a chunk, a hyphen is the last box of its chunk */
        var longest = 1, count = 0;
        for (var i = 0; i < state.word.length; i++) {
          var ch = state.word[i];
          if (ch !== ' ') count++;
          if (count > longest) longest = count;
          if (ch === ' ' || ch === '-') count = 0;
        }
        var available = wordRow.clientWidth || root.clientWidth || 300;
        var perLine = Math.max(1, Math.floor((available + BOX_GAP) / (COMFY_BOX + BOX_GAP)));   /* boxes per line at a comfortable size */
        var lines = Math.ceil(longest / perLine);                                                /* lines the longest chunk needs */
        perLine = Math.ceil(longest / lines);                                                    /* spread the boxes evenly over them */
        var size = Math.floor((available - (perLine - 1) * BOX_GAP) / perLine);
        size = Math.max(MIN_BOX, Math.min(MAX_BOX, size));
        wordRow.style.setProperty('--box', size + 'px');
      }

      function resetKeys() {
        ALPHABET.split('').forEach(function (L) {
          var b = keyButtons[L];
          b.className = 'key';
          b.disabled = false;
          b.setAttribute('aria-label', 'Letter ' + L);
        });
        if (state) shownLetters(state).forEach(function (L) { markKey(L, 'shown'); });
        updateTabStop();
      }
      /* Colours a key and switches it off: green for right, red for wrong, gold for a letter shown from the start.
         A shown letter that also hides inside the word (a free letter) stays switched on until it is pressed. */
      function markKey(L, outcome) {
        var b = keyButtons[L];
        b.classList.remove('is-right', 'is-wrong', 'is-shown');
        b.disabled = true;
        if (outcome === 'right') { b.classList.add('is-right'); b.setAttribute('aria-label', 'Letter ' + L + ', correct'); }
        else if (outcome === 'wrong') { b.classList.add('is-wrong'); b.setAttribute('aria-label', 'Letter ' + L + ', wrong'); }
        else if (state && freeLetter(state, L)) {
          b.classList.add('is-shown'); b.disabled = false;
          b.setAttribute('aria-label', 'Letter ' + L + ', shown at an end and also inside the word. Press it to fill in the others for free');
        }
        else { b.classList.add('is-shown'); b.setAttribute('aria-label', 'Letter ' + L + ', already shown'); }
        updateTabStop();
      }
      function setKeysEnabled(on) {
        ALPHABET.split('').forEach(function (L) {
          keyButtons[L].disabled = !(on && state && canGuess(state, L));
        });
        updateTabStop();
      }

      /* ---- moving around the keys with the keyboard ----
         Only one key at a time can be reached with Tab (it has tabindex 0, the rest have -1). That saves
         pressing Tab 26 times. The arrow keys, Home and End then move between the keys that are switched on. */
      function enabledKeys() { return ALPHABET.split('').filter(function (L) { return !keyButtons[L].disabled; }); }
      function updateTabStop(preferred) {
        var on = enabledKeys();
        if (preferred && on.indexOf(preferred) !== -1) tabKey = preferred;
        else if (on.indexOf(tabKey) === -1) tabKey = on.length ? on[0] : null;
        ALPHABET.split('').forEach(function (L) { keyButtons[L].setAttribute('tabindex', L === tabKey ? '0' : '-1'); });
      }
      /* The next switched-on key after letter L, going forwards (step 1) or backwards (step -1), wrapping round. */
      function nextKey(L, step) {
        var i = ALPHABET.indexOf(L);
        for (var n = 1; n <= 26; n++) {
          var M = ALPHABET[(i + step * n + 26 * 26) % 26];
          if (!keyButtons[M].disabled) return M;
        }
        return null;
      }
      /* Puts the focus on a letter key (the Tab key's one, unless another is named). Returns false if every key is off. */
      function focusKeys(L) {
        updateTabStop(L);
        if (!tabKey || keys.hidden) return false;
        keyButtons[tabKey].focus();
        return true;
      }
      /* After the round, the focus goes to the "Next word" button in the result box. */
      function focusAfterRound() {
        var btn = result.querySelector('button');
        if (btn && !result.hidden) btn.focus();
      }
      /* How many keys fit in one row of the keyboard right now (it changes with the screen width). */
      function keysPerRow() {
        var top = keyButtons.A.offsetTop, n = 0;
        ALPHABET.split('').forEach(function (L) { if (keyButtons[L].offsetTop === top) n++; });
        return Math.max(1, n);
      }
      function onKeysKeyDown(ev) {
        var t = ev.target;
        if (!t || !t.classList || !t.classList.contains('key')) return;
        var L = t.getAttribute('data-letter'), to = null, on = enabledKeys();
        if (ev.key === 'ArrowRight') to = nextKey(L, 1);
        else if (ev.key === 'ArrowLeft') to = nextKey(L, -1);
        else if (ev.key === 'Home') to = on[0];
        else if (ev.key === 'End') to = on[on.length - 1];
        else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
          /* jump a whole row; if that key is off, keep going the same way to the nearest one that is on */
          var step = ev.key === 'ArrowDown' ? 1 : -1;
          var i = ALPHABET.indexOf(L) + step * keysPerRow();
          i = Math.max(0, Math.min(25, i));
          to = keyButtons[ALPHABET[i]].disabled ? nextKey(ALPHABET[i], step) : ALPHABET[i];
        } else return;
        ev.preventDefault();   /* stop the arrow keys scrolling the page */
        if (to) focusKeys(to);
      }

      /* ---- the physical keyboard: any letter key is a guess ---- */
      function onKeyDown(ev) {
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
        if (!root.isConnected) { cleanUp(); return; }   /* the page has moved on; tidy up and ignore the key */
        if (ev.defaultPrevented) return;                /* already used, for example an arrow key on the letter keys */
        var t = ev.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
        if (!state || state.over || keys.hidden) return;
        var k = String(ev.key || '');
        if (k.length !== 1 || !/[a-z]/i.test(k)) return;
        tryLetter(k.toUpperCase());
      }
      /* The word's boxes are sized to fit, so redo that when the window changes size (a phone turned sideways). */
      function onResize() { if (root.isConnected) fitWord(); else cleanUp(); }
      /* When the address changes (the visitor goes to another page), check whether this game has left the page.
         The site is meant to call destroy() when that happens, but in case it does not, the game tidies up by
         itself here. The site's own listener runs first and swaps the page, so by now root has gone. A second
         check a moment later covers a browser that runs the two listeners the other way round. */
      function onHashChange() {
        if (!root.isConnected) { cleanUp(); return; }
        setTimeout(function () { if (!root.isConnected) cleanUp(); }, 0);
      }
      document.addEventListener('keydown', onKeyDown);
      window.addEventListener('resize', onResize);
      window.addEventListener('hashchange', onHashChange);

      /* Removes everything this game attached outside its root, and clears the last result from the
         screen-reader announcer so it is not read out on the next page. Called from destroy(), when the
         visitor leaves (onHashChange), and by the listeners themselves if they fire after the game has gone.
         It only does its work once, however many of those happen. */
      function cleanUp() {
        if (timer) { clearTimeout(timer); timer = null; }
        if (cleanedUp) return;
        cleanedUp = true;
        document.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('hashchange', onHashChange);
        if (announced) api.announce('');   /* only if this game said something, so a message from the next page is never wiped */
      }

      /* ---- go ---- */
      rules1894.setAttribute('aria-pressed', String(rules === '1894'));
      rulesClassic.setAttribute('aria-pressed', String(rules === 'classic'));
      modeComputer.setAttribute('aria-pressed', String(mode === 'computer'));
      modeTwo.setAttribute('aria-pressed', String(mode === 'two'));
      showScore();
      startRound(false);

      return {
        destroy: function () { cleanUp(); }
      };
    }
  });
})();
