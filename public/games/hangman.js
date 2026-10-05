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
    { w: 'rabbit', cat: 'Beast', note: 'Rabbits were brought to Australia in 1859 and soon spread right across the country.' },
    { w: 'kangaroo', cat: 'Beast', note: 'A kangaroo cannot walk backwards, which is one reason it is on Australia\'s coat of arms.' },
    { w: 'koala', cat: 'Beast', note: 'A koala sleeps for up to twenty hours a day and eats only gum leaves.' },
    { w: 'possum', cat: 'Beast', note: 'The brushtail possum is a night-time visitor to many Australian roofs.' },
    { w: 'camel', cat: 'Beast', note: 'Camels carried goods across the Australian outback in the 1800s.' },
    { w: 'elephant', cat: 'Beast', note: 'The elephant is the largest animal on land, and its trunk is really a very long nose.' },
    { w: 'hedgehog', cat: 'Beast', note: 'A hedgehog is a small spiky animal that rolls into a ball when it is frightened.' },
    { w: 'fox', cat: 'Beast', note: 'Foxes were released in Australia in the 1870s so that people could hunt them.' },
    { w: 'squirrel', cat: 'Beast', note: 'A squirrel buries nuts for winter and forgets where some of them are.' },
    { w: 'tiger', cat: 'Beast', note: 'The tiger is the biggest of the big cats, and every tiger\'s stripes are different.' },
    { w: 'goat', cat: 'Beast', note: 'Goats will nibble almost anything and are brilliant climbers.' },
    { w: 'otter', cat: 'Beast', note: 'Otters hold hands while they sleep so they do not float away from each other.' },
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
    { w: 'dolls house', cat: 'Toys and games', note: 'A dolls house is a tiny house with tiny furniture for dolls.' },
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
     Gomme wrote Elephant as E××××××t, so only those two boxes are filled in. The guesser already knows
     the word has an E, so the E key is switched off; the second E stays blank until the round is won,
     which happens as soon as every letter of the word is known. */
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

  /* True when every letter of the word is known. A word like BEE is solved before it starts (B and E are
     shown and the middle is another E), so the computer never picks one and Player 1 is asked for another. */
  function solved(state) {
    for (var i = 0; i < state.word.length; i++) {
      var ch = state.word[i];
      if (isLetter(ch) && !known(state, ch)) return false;
    }
    return true;
  }

  /* A guess. Returns 'repeat', 'right' or 'wrong' and updates the state. */
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

  /* Picks a word the player has not seen lately. `recent` is a list of recent words; the computer
     keeps the last fifteen and will not pick one of those unless the list is nearly used up. */
  function pickWord(list, recent, random, shownEnds) {
    var fresh = list.filter(function (e) {
      if (shownEnds && newRound(e.w, true).over) return false;   /* a word like EEL would be given away by the shown letters */
      return recent.indexOf(e.w) === -1;
    });
    var pool = fresh.length ? fresh : list;
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

  var CSS =
    '.game-hangman .stage { display: flex; flex-wrap: wrap; gap: 1rem 1.5rem; align-items: flex-start; }' +
    '.game-hangman .candle-col { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: .4rem; }' +
    '.game-hangman .candle-svg { width: 150px; height: auto; display: block; }' +
    '.game-hangman .counter { font-weight: 700; font-variant-numeric: tabular-nums; text-align: center; max-width: 150px; }' +   /* no wider than the candle, so the word gets the room */
    '.game-hangman .play-col { flex: 1 1 240px; min-width: 0; display: flex; flex-direction: column; gap: .9rem; }' +
    '.game-hangman .info { color: var(--ink-muted); font-weight: 700; min-height: 1.5em; }' +
    /* The word is a row of parts (one per word), each part a row of chunks (split after a hyphen), each chunk a row of
       letter boxes. Every level wraps, so a long word folds onto a second line instead of running off the screen. */
    '.game-hangman .word { display: flex; flex-wrap: wrap; justify-content: center; gap: .5rem 1.1rem; --box: 44px; padding: .25rem 0; max-width: 100%; min-width: 0; }' +
    '.game-hangman .word-part { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; max-width: 100%; min-width: 0; }' +
    '.game-hangman .word-chunk { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; max-width: 100%; min-width: 0; }' +
    '.game-hangman .letter { width: var(--box); height: calc(var(--box) * 1.25); display: inline-flex; align-items: flex-end; justify-content: center;' +
    '  font-family: var(--font-display); font-size: calc(var(--box) * .72); line-height: 1; padding-bottom: .15em; box-sizing: border-box;' +
    '  border-bottom: 3px solid var(--ink); color: var(--ink); text-transform: uppercase; }' +
    '.game-hangman .letter--shown { color: var(--brass); }' +
    '.game-hangman .letter--punct { border-bottom-color: transparent; color: var(--ink-muted); width: calc(var(--box) * .5); }' +   /* a hyphen needs only half a box */
    '.game-hangman .letter--missed { color: var(--red); border-bottom-color: var(--red); }' +
    '.game-hangman .keys { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 6px; max-width: 600px; }' +
    '.game-hangman .key { min-width: 36px; min-height: 44px; aspect-ratio: 1 / 1; padding: 0; border-radius: 8px; border: 2px solid var(--line);' +
    '  background: var(--surface); color: var(--ink); font-family: var(--font-body); font-weight: 700; font-size: 1.25rem; cursor: pointer; }' +
    '.game-hangman .key:hover:not([disabled]) { background: var(--surface-2); border-color: var(--link); }' +
    '.game-hangman .key[disabled] { cursor: default; }' +
    '.game-hangman .key.is-right { background: var(--green); border-color: var(--green); color: var(--bg); }' +
    '.game-hangman .key.is-wrong { background: var(--red); border-color: var(--red); color: var(--bg); text-decoration: line-through; }' +
    '.game-hangman .key.is-shown { background: var(--surface-2); border-color: var(--brass); color: var(--brass); }' +
    '.game-hangman .key-row { display: flex; flex-wrap: wrap; gap: .6rem .8rem; align-items: center; }' +
    '.game-hangman .result { border: 2px solid var(--brass); border-radius: var(--radius); background: var(--surface-2); padding: .8rem 1rem; display: flex; flex-wrap: wrap; gap: .6rem 1rem; align-items: center; justify-content: space-between; }' +
    '.game-hangman .result p { margin: 0; flex: 1 1 220px; }' +
    '.game-hangman .result b { font-family: var(--font-display); font-weight: 400; letter-spacing: .04em; }' +
    '.game-hangman .setup { display: flex; flex-direction: column; gap: .75rem; max-width: 420px; }' +
    '.game-hangman .setup label { display: flex; flex-direction: column; gap: .25rem; font-weight: 700; }' +
    '.game-hangman .setup input { min-height: 44px; padding: .4rem .6rem; border-radius: 6px; border: 2px solid var(--line); background: var(--surface); color: var(--ink); font-size: 1.1rem; font-weight: 400; width: 100%; box-sizing: border-box; }' +
    '.game-hangman .setup .error { color: var(--red); font-weight: 700; min-height: 1.4em; margin: 0; }' +
    /* the form sits inside the board, which turns text selection off; turn it back on for the inputs (iPads need this) */
    '.game-hangman .setup input { user-select: text; -webkit-user-select: text; touch-action: auto; }' +
    '.game-hangman .seg { max-width: 100%; }' +
    '.game-hangman .seg button { white-space: normal; min-height: 44px; }' +
    '.game-hangman .flame-glow { animation: game-hangman-glow 1.6s ease-in-out infinite; }' +
    '.game-hangman .flame-glow.is-still { animation: none; }' +
    '@keyframes game-hangman-glow { 0%, 100% { opacity: .18; } 50% { opacity: .32; } }' +
    '@media (max-width: 600px) {' +
    '  .game-hangman .stage { flex-direction: column; flex-wrap: nowrap; align-items: stretch; }' +
    '  .game-hangman .candle-col { flex-direction: row; justify-content: center; gap: 1rem; }' +
    '  .game-hangman .candle-svg { width: 76px; }' +
    '  .game-hangman .counter { white-space: nowrap; font-size: .95rem; max-width: none; }' +
    '  .game-hangman .keys { grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 4px; }' +   /* six 47px keys fit in 302px */
    '  .game-hangman .key { min-height: 44px; font-size: 1.1rem; }' +
    '}';

  GamesInTime.register({
    id: 'hangman',
    mount: function (root, api) {
      var h = api.h;
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

      /* ---- toolbar ---- */
      var rules1894 = h('button', { type: 'button', 'aria-pressed': 'true', onclick: function () { setRules('1894'); } }, '1894 rules: Birds, Beasts and Fishes');
      var rulesClassic = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setRules('classic'); } }, 'Classic');
      var modeComputer = h('button', { type: 'button', 'aria-pressed': 'true', onclick: function () { setMode('computer'); } }, 'Play the computer');
      var modeTwo = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setMode('two'); } }, 'Two players: one types a secret word');
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: startRound }, 'New word');
      var toolbar = h('div', { class: 'game-toolbar' },
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Rules' }, rules1894, rulesClassic),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Who plays' }, modeComputer, modeTwo),
        newBtn);

      /* ---- scoreboard ----
         In two-player mode the labels say "Guesser won" and "Guesser lost", because after a swap the
         guesser is a different person. */
      var wonEl = h('b', null, '0'), lostEl = h('b', null, '0');
      var wonLabel = h('span', null, 'Won '), lostLabel = h('span', null, 'Lost ');
      var scoreboard = h('div', { class: 'scoreboard', role: 'group', 'aria-label': 'Score' },
        h('span', { class: 'score-won' }, wonLabel, wonEl),
        h('span', { class: 'score-lost' }, lostLabel, lostEl));

      /* ---- the candle ----
         Eight pieces stacked in a brass holder. Each wrong guess hides the top piece and shrinks the flame.
         The eighth wrong guess snuffs the candle: the flame goes and a wisp of smoke appears.
         The wax is cream (--on-brand is the same cream in both themes) with a dark teal outline (--brand is
         dark teal in both themes), so the pieces stand out on the light panel and on the dark one, and can
         be counted from the back of a classroom. */
      var WAX = 'var(--on-brand)', WAX_LINE = 'var(--brand)';
      var SEG_H = 15, CANDLE_X = 48, CANDLE_W = 44, CANDLE_BOTTOM = 200, CX = 70;
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
      var wick = svgEl('line', { class: 'wick', stroke: 'var(--ink)', 'stroke-width': 3, 'stroke-linecap': 'round' });
      var flameGlow = svgEl('circle', { class: 'flame-glow' + (api.reducedMotion ? ' is-still' : ''), r: 30, fill: 'var(--brass-bright)', opacity: .18 });
      var flameOuter = svgEl('path', { d: 'M0,-36 C 13,-19 15,-6 0,7 C -15,-6 -13,-19 0,-36 Z', fill: 'var(--brass-bright)' });
      var flameInner = svgEl('path', { d: 'M0,-17 C 5,-9 6,-3 0,3 C -6,-3 -5,-9 0,-17 Z', fill: WAX, opacity: .9 });   /* a pale centre, like a real flame */
      var flame = svgEl('g', { class: 'flame' }, flameOuter, flameInner);
      var smoke = svgEl('path', { class: 'smoke', d: 'M70,186 C 58,170 84,158 70,140 C 56,122 86,110 72,90 C 64,78 74,66 70,56', fill: 'none', stroke: 'var(--ink-muted)', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: .75 });
      candleSvg.appendChild(flameGlow);
      candleSvg.appendChild(wick);
      candleSvg.appendChild(flame);
      candleSvg.appendChild(smoke);
      var counter = h('div', { class: 'counter', 'aria-live': 'off' }, 'Wrong guesses: 0 of ' + MAX_WRONG);
      var candleCol = h('div', { class: 'candle-col' }, candleSvg, counter);

      function drawCandle(wrong) {
        var left = MAX_WRONG - wrong;
        for (var i = 0; i < MAX_WRONG; i++) pieces[i].setAttribute('visibility', i < left ? 'visible' : 'hidden');
        var topY = CANDLE_BOTTOM - 9 - left * SEG_H;             /* where the top of the candle is now */
        if (left > 0) {
          var scale = 0.45 + 0.55 * (left / MAX_WRONG);           /* the flame shrinks as the candle burns */
          wick.setAttribute('x1', CX); wick.setAttribute('x2', CX);
          wick.setAttribute('y1', topY); wick.setAttribute('y2', topY - 9);
          wick.setAttribute('visibility', 'visible');
          flame.setAttribute('transform', 'translate(' + CX + ',' + (topY - 10) + ') scale(' + scale.toFixed(3) + ')');
          flame.setAttribute('visibility', 'visible');
          flameGlow.setAttribute('cx', CX); flameGlow.setAttribute('cy', topY - 26);
          flameGlow.setAttribute('r', Math.round(30 * scale));
          flameGlow.setAttribute('visibility', 'visible');
          smoke.setAttribute('visibility', 'hidden');
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

      /* ---- the word and the keyboard ---- */
      var info = h('p', { class: 'info' });
      var wordRow = h('div', { class: 'word', role: 'group', 'aria-label': 'The word' });
      var keys = h('div', { class: 'keys', role: 'group', 'aria-label': 'Letters' });
      ALPHABET.split('').forEach(function (L) {
        var b = h('button', { class: 'key', type: 'button', 'data-letter': L, 'aria-label': 'Letter ' + L, onclick: function () { tryLetter(L); } }, L);
        keyButtons[L] = b;
        keys.appendChild(b);
      });
      var hintBtn = h('button', { class: 'btn', type: 'button', onclick: giveHint, 'aria-label': 'Hint, costs one wrong guess' }, 'Hint');
      var keyRow = h('div', { class: 'key-row' }, hintBtn, h('span', { class: 'game-note', style: { marginTop: '0' } }, 'A hint costs one wrong guess. Tip: try common letters first. E, A, R, O and T are the most used in English.'));
      var result = h('div', { class: 'result', hidden: true });

      /* ---- the two-player form ---- */
      var secretInput = h('input', { type: 'password', id: 'hangman-secret', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: 40, 'aria-describedby': 'hangman-secret-help' });
      var hintInput = h('input', { type: 'text', id: 'hangman-hint', autocomplete: 'off', maxlength: 40 });
      var setupError = h('p', { class: 'error', role: 'alert' });
      var setup = h('form', { class: 'setup', hidden: true, onsubmit: function (ev) { ev.preventDefault(); startTwoPlayer(); } },
        h('label', { for: 'hangman-secret' }, 'Player 1, type a secret word', secretInput),
        h('p', { class: 'game-note', id: 'hangman-secret-help', style: { marginTop: '0' } }, 'Letters only, up to twenty. The letters are hidden as you type. Player 2, look away!'),
        h('label', { for: 'hangman-hint' }, 'A hint for Player 2 (optional)', hintInput),
        setupError,
        h('div', null, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Start')));

      var playCol = h('div', { class: 'play-col' }, info, wordRow, result, keys, keyRow, setup);
      var stage = h('div', { class: 'board stage' }, candleCol, playCol);
      root.appendChild(toolbar);
      root.appendChild(scoreboard);
      root.appendChild(stage);

      /* ---- settings ---- */
      function setRules(r) {
        rules = r;
        api.store.set('rules', r);
        rules1894.setAttribute('aria-pressed', String(r === '1894'));
        rulesClassic.setAttribute('aria-pressed', String(r === 'classic'));
        startRound();
      }
      function setMode(m) {
        mode = m;
        api.store.set('mode', m);
        modeComputer.setAttribute('aria-pressed', String(m === 'computer'));
        modeTwo.setAttribute('aria-pressed', String(m === 'two'));
        score.won = score.lost = 0;
        showScore();
        startRound();
      }
      function showScore() {
        wonLabel.textContent = mode === 'two' ? 'Guesser won ' : 'Won ';
        lostLabel.textContent = mode === 'two' ? 'Guesser lost ' : 'Lost ';
        wonEl.textContent = String(score.won); lostEl.textContent = String(score.lost);
      }

      /* Status lines while guessing. In two-player mode they start with "Player 2:" so both kids know whose go it is. */
      function say(text) { api.status(mode === 'two' ? 'Player 2: ' + text : text); }

      /* ---- starting a round ---- */
      function startRound() {
        if (timer) { clearTimeout(timer); timer = null; }
        state = null; entry = null; playerHint = '';
        result.hidden = true;
        drawCandle(0);
        if (mode === 'two') {
          /* Player 1 types a word while Player 2 looks away */
          setup.hidden = false; keys.hidden = true; keyRow.hidden = true; wordRow.hidden = true;
          info.textContent = rules === '1894' ? 'Player 2 will see the first and last letters.' : 'Player 2 will see only dashes.';
          secretInput.value = ''; hintInput.value = ''; setupError.textContent = '';
          api.status('Player 1, type a secret word. Player 2, look away!');
          return;
        }
        /* the computer chooses: a short pause so the change is easy to see */
        setup.hidden = true; keys.hidden = false; keyRow.hidden = false; wordRow.hidden = false;
        wordRow.replaceChildren();
        info.textContent = '';
        setKeysEnabled(false);
        api.status('The computer is choosing a word');
        timer = setTimeout(function () {
          timer = null;
          if (!root.isConnected) return;   /* the visitor left while the computer was thinking */
          entry = rules === '1894' ? pickWord(ANIMALS, recentAnimals, api.random, true) : pickWord(CLASSIC, recentClassic, api.random, false);
          beginRound(entry.w, entry.cat);
        }, api.reducedMotion ? 0 : THINK_MS);
      }

      function startTwoPlayer() {
        var cleaned = cleanSecret(secretInput.value);
        if (!cleaned.error && rules === '1894' && newRound(cleaned.word, true).over) {
          cleaned.error = 'Under the 1894 rules the first and last letters are shown, so that word would be given away. Try a longer one.';
        }
        if (cleaned.error) { setupError.textContent = cleaned.error; secretInput.focus(); return; }
        playerHint = hintInput.value.trim();
        setup.hidden = true; keys.hidden = false; keyRow.hidden = false; wordRow.hidden = false;
        beginRound(cleaned.word, playerHint ? 'Hint: ' + playerHint : "Player 1's word");
        api.status('Player 1, pass the device to Player 2. Guess a letter');
      }

      /* Sets up the screen for a word. `label` is the category or hint shown above the word. */
      function beginRound(word, label) {
        word = word.toUpperCase();
        state = newRound(word, rules === '1894');
        var n = letterCount(word), parts = word.split(' ').length;
        info.textContent = label + ' · ' + n + ' letters' + (parts > 1 ? ', ' + parts + ' words' : '') +
          (rules === '1894' ? ' · first and last letters shown' : '');
        drawCandle(0);
        resetKeys();
        renderWord();
        if (state.over) finishRound(); else { say('Guess a letter'); hintBtn.disabled = false; }
      }

      /* ---- guessing ---- */
      function tryLetter(L) {
        if (!state || state.over) return;
        if (state.tried[L]) { say('You already tried ' + L); return; }
        if (known(state, L)) { say(L + ' is already shown'); return; }   /* a typed first or last letter under the 1894 rules */
        var outcome = guess(state, L);
        markKey(L, outcome);
        renderWord();
        if (state.over) { finishRound(); return; }
        if (outcome === 'right') {
          say(L + ' is in the word');
        } else {
          say('No ' + L + '. Wrong guesses: ' + state.wrong + ' of ' + MAX_WRONG);
          drawCandle(state.wrong);
          hintBtn.disabled = state.wrong >= MAX_WRONG - 1;   /* a hint would put the candle out, so no more hints */
        }
      }

      /* A hint burns one piece of the candle and reveals a letter (see hintLetter in Part 3). */
      function giveHint() {
        if (!state || state.over) return;
        if (state.wrong >= MAX_WRONG - 1) {
          say('No hints left: one more wrong guess would put the candle out');
          hintBtn.disabled = true;
          return;
        }
        var L = hintLetter(state);
        if (!L) return;
        state.wrong++;
        drawCandle(state.wrong);
        var outcome = guess(state, L);
        markKey(L, outcome);
        renderWord();
        if (state.over) { finishRound(); return; }
        say('Hint: there is a' + (/^[AEFHILMNORSX]$/.test(L) ? 'n ' : ' ') + L + ' in the word. Wrong guesses: ' + state.wrong + ' of ' + MAX_WRONG);
        if (state.wrong >= MAX_WRONG - 1) hintBtn.disabled = true;
      }

      function finishRound() {
        var word = state.word;
        var two = mode === 'two';
        if (state.won) {
          score.won++;
          api.status('You got it: ' + word + (two ? '. Player 2 wins this round' : ''));
        } else {
          score.lost++;
          api.status('The candle went out. The word was ' + word + (two ? '. Player 1 wins this round' : ''));
          drawCandle(MAX_WRONG);
          renderWord();  /* shows the letters that were missed, in red */
        }
        showScore();
        setKeysEnabled(false);
        hintBtn.disabled = true;
        /* the meaning of the word, and a way to the next round */
        var note = entry ? entry.note : (playerHint ? 'Player 1\'s hint was: ' + playerHint : 'That was Player 1\'s word.');
        result.replaceChildren(
          h('p', null, h('b', null, word), ': ', note),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: startRound }, two ? 'Swap and play again' : 'Next word'));
        result.hidden = false;
        var who = two ? 'Player 2' : 'You';
        api.announce(who + (state.won ? ' won. ' : ' lost. ') + word + '. ' + note);
      }

      /* ---- drawing the word and the keys ---- */
      /* Draws one box per character. A space starts a new part; a hyphen ends a chunk, so a long word like
         PENNY-FARTHING can fold onto a second line after the hyphen when the screen is narrow. */
      function renderWord() {
        wordRow.replaceChildren();
        var spoken = [];
        var part = null, chunk = null;
        function newPart() { part = h('span', { class: 'word-part' }); wordRow.appendChild(part); chunk = null; }
        function addBox(box) {
          if (!part) newPart();
          if (!chunk) { chunk = h('span', { class: 'word-chunk' }); part.appendChild(chunk); }
          chunk.appendChild(box);
        }
        for (var i = 0; i < state.word.length; i++) {
          var ch = state.word[i];
          if (ch === ' ') { newPart(); spoken.push('space'); continue; }
          if (!isLetter(ch)) {
            addBox(h('span', { class: 'letter letter--punct' }, ch));
            spoken.push(ch === '-' ? 'hyphen' : ch);
            chunk = null;   /* the next letter starts a new chunk, so a line may break here */
          } else if (state.shownAt[i]) {
            addBox(h('span', { class: 'letter letter--shown' }, ch));
            spoken.push(ch);
          } else if (state.tried[ch] === 'right' || (state.over && known(state, ch))) {
            addBox(h('span', { class: 'letter' }, ch));   /* guessed, or a second copy of a shown letter once the round is over */
            spoken.push(ch);
          } else if (state.over) {
            addBox(h('span', { class: 'letter letter--missed' }, ch));   /* round lost: show what was missed */
            spoken.push(ch);
          } else {
            addBox(h('span', { class: 'letter letter--blank' }));
            spoken.push('blank');
          }
        }
        wordRow.setAttribute('aria-label', 'The word: ' + spoken.join(', '));
        fitWord();
      }

      /* Picks a size for the letter boxes. The longest chunk stays on one line while the boxes can be at
         least COMFY_BOX wide; a longer chunk wraps onto as few lines as it needs, and the boxes are then made
         as big as those lines allow. A box is never smaller than MIN_BOX, so the letters stay readable. */
      var MIN_BOX = 26, COMFY_BOX = 30, MAX_BOX = 48, BOX_GAP = 4;
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
      }
      /* Colours a key and switches it off: green for right, red for wrong, brass for a letter shown from the start. */
      function markKey(L, outcome) {
        var b = keyButtons[L];
        b.classList.remove('is-right', 'is-wrong', 'is-shown');
        b.disabled = true;
        if (outcome === 'right') { b.classList.add('is-right'); b.setAttribute('aria-label', 'Letter ' + L + ', correct'); }
        else if (outcome === 'wrong') { b.classList.add('is-wrong'); b.setAttribute('aria-label', 'Letter ' + L + ', wrong'); }
        else { b.classList.add('is-shown'); b.setAttribute('aria-label', 'Letter ' + L + ', already shown'); }
      }
      function setKeysEnabled(on) {
        ALPHABET.split('').forEach(function (L) {
          var b = keyButtons[L];
          if (on) b.disabled = !!(state && (state.tried[L] || known(state, L))); else b.disabled = true;
        });
      }

      /* ---- the physical keyboard: any letter key is a guess ---- */
      function onKeyDown(ev) {
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
        if (!root.isConnected) { cleanUp(); return; }   /* the page has moved on; tidy up and ignore the key */
        var t = ev.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
        if (!state || state.over || keys.hidden) return;
        var k = String(ev.key || '');
        if (k.length !== 1 || !/[a-z]/i.test(k)) return;
        tryLetter(k.toUpperCase());
      }
      function onResize() { if (root.isConnected) fitWord(); else cleanUp(); }
      document.addEventListener('keydown', onKeyDown);
      window.addEventListener('resize', onResize);

      /* Removes everything this game attached outside its root. Called from destroy(), and also by the
         listeners themselves if they fire after the game has left the page, so nothing is left behind. */
      function cleanUp() {
        if (timer) { clearTimeout(timer); timer = null; }
        document.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('resize', onResize);
      }

      /* ---- go ---- */
      rules1894.setAttribute('aria-pressed', String(rules === '1894'));
      rulesClassic.setAttribute('aria-pressed', String(rules === 'classic'));
      modeComputer.setAttribute('aria-pressed', String(mode === 'computer'));
      modeTwo.setAttribute('aria-pressed', String(mode === 'two'));
      startRound();

      return {
        destroy: function () {
          cleanUp();
          api.announce('');   /* clear the last result from the screen-reader announcer, so it is not read out on the next page */
        }
      };
    }
  });
})();
