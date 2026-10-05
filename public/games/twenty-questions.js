/* Twenty Questions for Games in Time.
   A parlour game recorded in a letter by Hannah More in 1786 and played all through the 1800s, often
   starting with the question "Is it animal, vegetable or mineral?".

   Two ways to play:
     "Computer guesses": you think of anything and the computer asks yes-or-no questions. It walks a
       decision tree: each answer sends it down the yes branch or the no branch until it reaches a thing
       to guess. When it guesses wrong, you teach it: what was it, and a question that tells the two
       apart. That question becomes a new branch, saved on this device, so the computer gets cleverer.
     "You guess": the computer secretly picks one of its things. You choose questions from a menu and it
       answers truthfully from a table of facts, crossing out everything that no longer fits.

   How the file is organised:
     Part 1  The things the computer knows and the questions about them (the table of facts).
     Part 2  Building the starting tree from the table, and learning.
     Part 3  The screen: chalk writing on the slate, tally marks, the two games.
   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  var ID = 'twenty-questions';
  var MAX = 20;
  var CHAR_MS = 26;          /* chalk writing speed: one letter every 26 ms */
  var COMPUTER_MS = 350;     /* the computer's pause before it asks its next question */

  /* =====================================================================
     PART 1: THE TABLE OF FACTS
     Each question has a key, the full question and a short label for the menu.
     Each thing lists the keys whose answer is "yes"; every other answer is "no".
     The Victorian kingdoms: animal means a creature or something made from one (an egg, a woollen
     jumper); vegetable means a plant or something made from plants (paper, wood, bread); mineral means
     everything else (stone, metal, glass, water).
     ===================================================================== */
  var QUESTIONS = [
    ['What is it?', [
      ['animal', 'Is it an animal, or made from an animal?', 'Animal?'],
      ['vegetable', 'Is it a vegetable: a plant, or made from plants?', 'Vegetable?'],
      ['mineral', 'Is it a mineral: not animal and not vegetable?', 'Mineral?'],
      ['alive', 'Is it alive?', 'Alive?'],
      ['made', 'Is it made by people?', 'Made by people?'],
      ['food', 'Is it a food?', 'A food?'],
      ['flower', 'Is it a flower?', 'A flower?'],
      ['toy', 'Is it a toy, or used in a game?', 'Toy or game?']]],
    ['Size and shape', [
      ['bread', 'Is it bigger than a loaf of bread?', 'Bigger than a loaf?'],
      ['person', 'Is it bigger than a person?', 'Bigger than a person?'],
      ['ball', 'Is it round like a ball?', 'Round like a ball?'],
      ['wheels', 'Does it have wheels?', 'Wheels?']]],
    ['Made of', [
      ['metal', 'Is it made of metal?', 'Metal?'],
      ['paper', 'Is it made of paper?', 'Paper?'],
      ['glass', 'Is it made of glass or china?', 'Glass or china?']]],
    ['Its body', [
      ['legs', 'Does it have legs?', 'Legs?'],
      ['four', 'Does it have four legs?', 'Four legs?'],
      ['feathers', 'Does it have feathers?', 'Feathers?'],
      ['shell', 'Does it have a shell?', 'A shell?'],
      ['fly', 'Can it fly?', 'Can it fly?'],
      ['water', 'Does it live underwater?', 'Lives underwater?'],
      ['sting', 'Can it sting you?', 'Can it sting?'],
      ['bark', 'Does it bark?', 'Does it bark?']]],
    ['People and it', [
      ['pet', 'Do people often keep it as a pet?', 'A pet?'],
      ['farm', 'Is it a farm animal?', 'Farm animal?'],
      ['kitchen', 'Would you find it in a kitchen?', 'In a kitchen?'],
      ['cook', 'Do you cook it before you eat it?', 'Cooked to eat?'],
      ['tree', 'Does it grow on a tree?', 'Grows on a tree?'],
      ['wear', 'Do you wear it?', 'Do you wear it?'],
      ['ride', 'Can you ride on it?', 'Can you ride it?'],
      ['money', 'Can you buy things with it?', 'Buy things with it?'],
      ['wool', 'Do we get wool from it?', 'Wool from it?'],
      ['milk', 'Do people drink its milk?', 'Drink its milk?'],
      ['door', 'Do you use it to open a door?', 'Opens a door?'],
      ['write', 'Do you write on it?', 'Write on it?']]]
  ];
  var Q = {};
  QUESTIONS.forEach(function (grp) { grp[1].forEach(function (q) { Q[q[0]] = { key: q[0], text: q[1], label: q[2] }; }); });

  var THINGS = [
    'a cat|animal alive bread legs four pet',
    'a dog|animal alive bread legs four pet bark',
    'a horse|animal alive bread person legs four farm ride',
    'a cow|animal alive bread person legs four farm milk',
    'a sheep|animal alive bread legs four farm wool',
    'a pig|animal alive bread legs four farm',
    'a duck|animal alive bread legs feathers fly farm',
    'a mouse|animal alive legs four pet',
    'a frog|animal alive legs four',
    'a goldfish|animal alive water pet',
    'a bee|animal alive legs fly sting',
    'a butterfly|animal alive legs fly',
    'a spider|animal alive legs',
    'an elephant|animal alive bread person legs four ride',
    'an owl|animal alive bread legs feathers fly',
    'a whale|animal alive bread person water',
    'a snail|animal alive shell',
    'an egg|animal food kitchen shell cook',
    'a woollen jumper|animal bread made wear',
    'an apple|vegetable food kitchen ball tree',
    'a strawberry|vegetable food kitchen',
    'a potato|vegetable food kitchen cook',
    'a pumpkin|vegetable food kitchen bread ball cook',
    'an oak tree|vegetable alive bread person',
    'a rose|vegetable alive flower',
    'grass|vegetable alive',
    'a loaf of bread|vegetable food kitchen made',
    'a book|vegetable made paper',
    'a kite|vegetable made paper fly toy bread',
    'a cricket bat|vegetable made toy bread',
    'a spinning top|vegetable made toy',
    'a rocking horse|vegetable made toy bread ride legs four',
    'a wooden spoon|vegetable made kitchen',
    'a coin|mineral made metal money',
    'a key|mineral made metal door',
    'a kettle|mineral made metal kitchen',
    'a teapot|mineral made glass kitchen',
    'a marble|mineral made glass toy ball',
    'a school slate|mineral made write',
    'a bell|mineral made metal',
    'a window|mineral made glass bread',
    'a pebble|mineral',
    'the Moon|mineral bread person ball',
    'a river|mineral bread person',
    'a steam train|mineral made metal bread person ride wheels',
    'a bicycle|mineral made metal bread ride wheels',
    'a brick|mineral made',
    'a gold ring|mineral made metal wear',
    'a snowman|mineral made bread'
  ].map(function (line) {
    var parts = line.split('|'), yes = {};
    parts[1].split(' ').forEach(function (k) { yes[k] = true; });
    return { name: parts[0], yes: yes };
  });

  /* =====================================================================
     PART 2: THE TREE
     A node is either a question { q, y, n } (y and n are the next nodes) or a thing to guess { t }.
     The starting tree begins with the Victorian opener, as two yes-or-no questions: "Is it an animal?"
     then "Is it a vegetable?". Inside each kingdom it picks, again and again, the question that splits
     what is left most evenly, because a question that halves the list does the most work.
     ===================================================================== */
  var SPLIT_ORDER = ['alive', 'made', 'food', 'bread', 'person', 'legs', 'four', 'fly', 'metal', 'kitchen', 'farm', 'pet', 'toy', 'glass', 'paper', 'water',
    'feathers', 'shell', 'wear', 'ball', 'ride', 'wheels', 'cook', 'tree', 'flower', 'bark', 'sting', 'money', 'wool', 'milk', 'door', 'write'];
  function splitTree(list) {
    if (list.length === 1) return { t: list[0].name };
    var best = null;
    SPLIT_ORDER.forEach(function (k) {
      var y = list.filter(function (t) { return t.yes[k]; }).length;
      var score = Math.min(y, list.length - y);
      if (score > 0 && (!best || score > best.score)) best = { k: k, score: score };
    });
    if (!best) return { t: list[0].name };
    return {
      q: Q[best.k].text,
      y: splitTree(list.filter(function (t) { return t.yes[best.k]; })),
      n: splitTree(list.filter(function (t) { return !t.yes[best.k]; }))
    };
  }
  function seedTree() {
    function king(k) { return THINGS.filter(function (t) { return t.yes[k]; }); }
    return {
      q: Q.animal.text, k: 'animal', y: splitTree(king('animal')),
      n: { q: Q.vegetable.text, k: 'vegetable', y: splitTree(king('vegetable')), n: splitTree(king('mineral')) }
    };
  }
  /* A tree read back from storage is checked before it is trusted. */
  function validTree(node, depth) {
    if (!node || typeof node !== 'object' || depth > 200) return false;
    if (typeof node.t === 'string') return node.t.length > 0 && node.t.length <= 60;
    return typeof node.q === 'string' && node.q.length <= 120 && validTree(node.y, depth + 1) && validTree(node.n, depth + 1);
  }
  function countThings(node) { return node.t ? 1 : countThings(node.y) + countThings(node.n); }
  /* When the twentieth question arrives before a thing, guess the one down the bigger branch. */
  function likelyLeaf(node) {
    while (!node.t) node = countThings(node.y) >= countThings(node.n) ? node.y : node.n;
    return node;
  }

  /* Tidy what a visitor types. It is only ever shown with textContent, never as markup. */
  function tidy(text, max) { return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max); }
  function asQuestion(text) {
    var t = tidy(text, 100).replace(/[?.!\s]+$/, '');
    if (!t) return '';
    return t.charAt(0).toUpperCase() + t.slice(1) + '?';
  }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  /* =====================================================================
     PART 3: THE SCREEN
     ===================================================================== */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, String(attrs[k])); });
    return el;
  }

  var CSS = [
    '.game-twenty-questions { --tq-chalk: var(--ink); --tq-dim: color-mix(in srgb, var(--ink) 55%, transparent); --tq-faint: color-mix(in srgb, var(--ink) 16%, transparent); --tq-yellow: var(--link); --tq-font: "Cabin Sketch", var(--font-head); }',
    '.game-twenty-questions .tq-slate { position: relative; padding: .4rem .2rem .2rem; }',
    '.game-twenty-questions .tq-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .4rem 1rem; }',
    '.game-twenty-questions .tq-count { font-family: var(--tq-font); font-size: 1.25rem; color: var(--tq-yellow); letter-spacing: .02em; }',
    '.game-twenty-questions .tq-tally { width: 220px; max-width: 62%; height: auto; display: block; }',
    '.game-twenty-questions .tq-tally line { stroke: var(--tq-chalk); stroke-width: 3.4; stroke-linecap: round; }',
    '.game-twenty-questions .tq-tally line.off { stroke: var(--tq-faint); stroke-width: 2.4; }',
    '.game-twenty-questions .tq-tally line.new { stroke-dasharray: 40; stroke-dashoffset: 40; animation: tq-draw .35s ease-out forwards; }',
    '@keyframes tq-draw { to { stroke-dashoffset: 0; } }',
    '.game-twenty-questions .tq-kicker { font-family: var(--tq-font); color: var(--tq-yellow); font-size: 1.15rem; margin: .9rem 0 0; min-height: 1.4em; }',
    '.game-twenty-questions .tq-q { font-family: var(--tq-font); font-weight: 700; color: var(--tq-chalk); font-size: clamp(1.7rem, 1.1rem + 2.6vw, 2.9rem); line-height: 1.15; margin: .3rem 0 .4rem; min-height: 2.3em; text-shadow: 0 0 1px var(--tq-chalk), 0 0 10px color-mix(in srgb, var(--ink) 25%, transparent); overflow-wrap: anywhere; }',
    /* chalk grain: two fine hatchings punch tiny gaps in the letters, so they look chalky in any font */
    '.game-twenty-questions .tq-q, .game-twenty-questions .tq-stamp, .game-twenty-questions .tq-hist { -webkit-mask-image: repeating-linear-gradient(118deg, var(--ink) 0 2px, color-mix(in srgb, var(--ink) 62%, transparent) 2px 3px), repeating-linear-gradient(28deg, var(--ink) 0 3px, color-mix(in srgb, var(--ink) 74%, transparent) 3px 4px); -webkit-mask-composite: source-in; mask-image: repeating-linear-gradient(118deg, var(--ink) 0 2px, color-mix(in srgb, var(--ink) 62%, transparent) 2px 3px), repeating-linear-gradient(28deg, var(--ink) 0 3px, color-mix(in srgb, var(--ink) 74%, transparent) 3px 4px); mask-composite: intersect; }',
    '.game-twenty-questions .tq-w { display: inline-block; white-space: nowrap; }',
    '.game-twenty-questions .tq-ch { display: inline-block; opacity: 0; animation: tq-chalk .2s ease-out forwards; }',
    '@keyframes tq-chalk { 0% { opacity: 0; transform: translateY(3px) scale(1.25); filter: blur(1.5px); } 100% { opacity: 1; transform: none; filter: none; } }',
    '.game-twenty-questions .tq-hint { color: var(--ink-muted); margin: 0 0 .8rem; max-width: 48rem; }',
    '.game-twenty-questions .tq-actions { display: flex; flex-wrap: wrap; gap: .7rem; align-items: center; margin: .6rem 0 .4rem; }',
    '.game-twenty-questions .tq-big { min-height: 60px; min-width: 8.5rem; font-size: 1.35rem; font-family: var(--tq-font); letter-spacing: .03em; border-width: 3px; }',
    '.game-twenty-questions .tq-chalkbtn { background: transparent; border-color: var(--tq-chalk); color: var(--tq-chalk); }',
    '.game-twenty-questions .tq-chalkbtn:hover { background: var(--tq-faint); color: var(--tq-chalk); }',
    '.game-twenty-questions .tq-key { font-size: .8em; opacity: .7; font-family: var(--font-mono); }',
    '.game-twenty-questions .tq-hist { list-style: none; margin: .8rem 0 0; padding: .6rem 0 0; border-top: 2px dashed var(--tq-faint); display: grid; gap: .25rem; font-family: var(--tq-font); font-size: 1.08rem; color: var(--tq-dim); }',
    '.game-twenty-questions .tq-hist li { margin: 0; display: flex; gap: .5rem; align-items: baseline; }',
    '.game-twenty-questions .tq-hist .n { min-width: 1.6rem; text-align: right; color: var(--tq-dim); }',
    '.game-twenty-questions .tq-hist .a { margin-left: auto; padding-left: .6rem; font-weight: 700; color: var(--tq-chalk); white-space: nowrap; }',
    '.game-twenty-questions .tq-hist .a.no { color: var(--tq-dim); }',
    '.game-twenty-questions .tq-hist li.note { color: var(--tq-yellow); }',
    '.game-twenty-questions .tq-form { display: grid; gap: .7rem; max-width: 40rem; margin: .4rem 0; }',
    '.game-twenty-questions .tq-form label { font-weight: 700; display: grid; gap: .3rem; }',
    '.game-twenty-questions .tq-form input { font: inherit; font-family: var(--tq-font); font-size: 1.3rem; min-height: 48px; padding: .3rem .8rem; border-radius: 12px; border: 2px solid var(--tq-chalk); background: var(--tq-faint); color: var(--tq-chalk); width: 100%; }',
    '.game-twenty-questions .tq-form input::placeholder { color: var(--tq-dim); }',
    '.game-twenty-questions .tq-err { color: var(--tq-yellow); font-weight: 700; min-height: 1.2em; margin: 0; }',
    '.game-twenty-questions .tq-know { font-size: .95rem; color: var(--ink-muted); margin: .8rem 0 0; }',
    '.game-twenty-questions .tq-menu { margin-top: 1rem; display: grid; gap: .7rem; }',
    '.game-twenty-questions .tq-menu h3, .game-twenty-questions .tq-things h3 { font-size: .95rem; margin: 0 0 .35rem; color: var(--ink-muted); font-family: var(--font-mono); letter-spacing: .08em; text-transform: uppercase; }',
    '.game-twenty-questions .tq-chips { display: flex; flex-wrap: wrap; gap: .45rem; }',
    '.game-twenty-questions .tq-chip { min-height: 40px; padding: .35rem .85rem; border-radius: 999px; border: 2px solid var(--tq-dim); background: transparent; color: var(--tq-chalk); font-weight: 700; font-size: .98rem; line-height: 1.15; }',
    '.game-twenty-questions .tq-chip:hover:not(:disabled) { border-color: var(--tq-chalk); background: var(--tq-faint); }',
    '.game-twenty-questions .tq-chip:disabled { cursor: default; border-style: dashed; color: var(--tq-dim); }',
    '.game-twenty-questions .tq-chip .tq-ans { margin-left: .35rem; font-family: var(--tq-font); color: var(--tq-yellow); }',
    '.game-twenty-questions .tq-things { margin-top: 1.1rem; }',
    '.game-twenty-questions .tq-thinglist { display: flex; flex-wrap: wrap; gap: .4rem; }',
    '.game-twenty-questions .tq-thing { min-height: 38px; padding: .3rem .75rem; border-radius: 10px; border: 2px solid var(--tq-chalk); background: var(--tq-faint); color: var(--tq-chalk); font-family: var(--tq-font); font-size: 1.08rem; line-height: 1.1; transition: opacity .3s, transform .3s; }',
    '.game-twenty-questions .tq-thing:hover:not(:disabled) { background: color-mix(in srgb, var(--ink) 28%, transparent); }',
    '.game-twenty-questions .tq-thing.is-out { opacity: .38; text-decoration: line-through; text-decoration-thickness: 2px; border-style: dashed; border-color: var(--tq-dim); background: transparent; cursor: default; }',
    '.game-twenty-questions .tq-thing.is-new-out { animation: tq-out .45s ease-out; }',
    '@keyframes tq-out { 0% { transform: scale(1.15) rotate(-3deg); opacity: 1; } 100% { transform: none; } }',
    '.game-twenty-questions .tq-thing.is-secret { border-color: var(--tq-yellow); color: var(--tq-yellow); opacity: 1; text-decoration: none; border-style: solid; }',
    '.game-twenty-questions .tq-left { font-family: var(--tq-font); color: var(--tq-yellow); font-size: 1.1rem; margin: 0 0 .5rem; }',
    '.game-twenty-questions .tq-confirm { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }',
    '.game-twenty-questions .tq-stamp { display: inline-block; font-family: var(--tq-font); color: var(--tq-yellow); font-size: clamp(1.6rem, 1rem + 2.5vw, 2.6rem); transform: rotate(-4deg); animation: tq-stamp .5s cubic-bezier(.3, 1.6, .5, 1); }',
    '@keyframes tq-stamp { 0% { transform: rotate(-4deg) scale(2.2); opacity: 0; } 100% { transform: rotate(-4deg) scale(1); opacity: 1; } }',
    /* On phones the lists are long, so chips are tighter and crossed-out things leave the list. */
    '@media (max-width: 600px) { .game-twenty-questions .tq-chip { font-size: .92rem; padding: .3rem .7rem; } .game-twenty-questions .tq-chips { gap: .35rem; } .game-twenty-questions .tq-thing { font-size: 1rem; padding: .3rem .6rem; } .game-twenty-questions .tq-thing.is-out:not(.is-new-out):not(.is-secret) { display: none; } }',
    '@media (prefers-reduced-motion: reduce) { .game-twenty-questions .tq-ch { animation: none; opacity: 1; } .game-twenty-questions .tq-tally line.new { animation: none; stroke-dashoffset: 0; } .game-twenty-questions .tq-stamp, .game-twenty-questions .tq-thing.is-new-out { animation: none; } }'
  ].join('\n');

  GamesInTime.register({
    id: ID,
    frame: 'slate',
    /* The table of facts and the starting tree, for tests and for anyone curious. */
    data: { questions: Q, things: THINGS, seedTree: seedTree },
    mount: function (root, api) {
      var h = api.h;
      root.appendChild(h('style', null, CSS));

      var mode = api.store.get('mode', 'mind');
      if (mode !== 'mind' && mode !== 'guess') mode = 'mind';
      var tree = api.store.get('tree', null);
      if (!validTree(tree, 0)) tree = seedTree();
      var learned = api.store.get('learned', []);
      if (!Array.isArray(learned)) learned = [];
      var stats = api.store.get('stats', {});
      if (!stats || typeof stats !== 'object') stats = {};

      var timers = [];
      function onPage() { return document.body.contains(root); }
      function later(fn, ms) {
        var id = setTimeout(function () { timers = timers.filter(function (t) { return t !== id; }); if (onPage()) fn(); }, api.reducedMotion ? 0 : ms);
        timers.push(id);
      }
      function cancelAll() { timers.forEach(clearTimeout); timers = []; }
      function onKey(ev) {
        if (!onPage() || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        var tg = ev.target && ev.target.tagName;
        if (tg === 'INPUT' || tg === 'SELECT' || tg === 'TEXTAREA') return;
        var k = (ev.key || '').toLowerCase();
        if (mode === 'mind' && (k === 'y' || k === 'n') && (phase === 'ask' || phase === 'guess') && !waiting) { ev.preventDefault(); answer(k === 'y'); }
      }
      document.addEventListener('keydown', onKey);
      function onHash() { if (!onPage()) destroy(); }
      window.addEventListener('hashchange', onHash);
      function destroy() { cancelAll(); document.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', onHash); }

      /* ---------- toolbar ---------- */
      var modeBtns = {};
      var seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Who guesses' },
        modeBtns.mind = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setMode('mind'); } }, 'Computer guesses'),
        modeBtns.guess = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setMode('guess'); } }, 'You guess'));
      var newBtn = h('button', { class: 'btn', type: 'button', onclick: function () { newGame(); } }, 'New game');
      var forgetBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: askForget }, 'Forget what it learned');
      var toolbar = h('div', { class: 'game-toolbar' }, newBtn, seg, forgetBtn);

      /* ---------- the slate ---------- */
      var countEl = h('span', { class: 'tq-count' });
      var tally = s('svg', { class: 'tq-tally', viewBox: '0 0 212 44', role: 'img' });
      var tallyLines = [];
      for (var g = 0; g < 4; g++) {
        var x0 = 10 + g * 52;
        for (var i = 0; i < 4; i++) { var ln = s('line', { x1: x0 + i * 9, y1: 7, x2: x0 + i * 9 + 1, y2: 37, class: 'off' }); tally.appendChild(ln); tallyLines.push(ln); }
        var dg = s('line', { x1: x0 - 5, y1: 31, x2: x0 + 32, y2: 12, class: 'off' }); tally.appendChild(dg); tallyLines.push(dg);
      }
      var kicker = h('p', { class: 'tq-kicker' });
      var qEl = h('p', { class: 'tq-q' });
      var hint = h('p', { class: 'tq-hint' });
      var actions = h('div', { class: 'tq-actions' });
      var hist = h('ol', { class: 'tq-hist', 'aria-label': 'Questions so far' });
      var know = h('p', { class: 'tq-know' });
      var slate = h('div', { class: 'tq-slate' }, h('div', { class: 'tq-top' }, countEl, tally), kicker, qEl, hint, actions, hist, know);
      var menu = h('div', { class: 'tq-menu' });
      var things = h('div', { class: 'tq-things' });
      root.appendChild(toolbar);
      root.appendChild(slate);
      root.appendChild(menu);
      root.appendChild(things);
      root.appendChild(h('p', { class: 'game-note' }, 'Every yes-or-no answer can cut the list of possible things in half. Halve it twenty times and you can pick out one thing from 2 to the power of 20, which is 1,048,576 things: about a million. That is why twenty questions is enough, if you ask good ones.'));

      /* ---------- chalk writing ---------- */
      /* Screen readers get the plain words; the letters drawn one by one are hidden from them. */
      function chalk(el, text) {
        var plain = h('span', { class: 'visually-hidden tq-plain' }, text);
        if (api.reducedMotion) { el.replaceChildren(plain, h('span', { 'aria-hidden': 'true' }, text)); api.sound('chalk'); return 0; }
        var drawn = h('span', { 'aria-hidden': 'true' }), n = 0;
        text.split(' ').forEach(function (word, wi) {
          var w = h('span', { class: 'tq-w' });
          for (var c = 0; c < word.length; c++) {
            w.appendChild(h('span', { class: 'tq-ch', style: { animationDelay: (n * CHAR_MS) + 'ms' } }, word.charAt(c)));
            n++;
          }
          if (wi) drawn.appendChild(document.createTextNode(' '));
          drawn.appendChild(w);
          /* a scratch of chalk for every word as it is written */
          (function (at) { if (wi < 8) later(function () { api.sound('chalk'); }, at); })(n * CHAR_MS - word.length * CHAR_MS);
          n++;
        });
        el.replaceChildren(plain, drawn);
        return n * CHAR_MS;
      }
      function setTally(used, fresh) {
        tallyLines.forEach(function (l, i) { l.setAttribute('class', i < used ? (fresh && i === used - 1 ? 'on new' : 'on') : 'off'); });
        tally.setAttribute('aria-label', used + ' of ' + MAX + ' questions used');
        countEl.textContent = used ? 'Question ' + used + ' of ' + MAX : MAX + ' questions';
      }
      function histLine(n, text, ans, cls) {
        hist.appendChild(h('li', { class: cls || '' }, n ? h('span', { class: 'n' }, n + '.') : null, h('span', null, text), ans != null ? h('span', { class: 'a' + (ans ? '' : ' no') }, ans ? 'Yes' : 'No') : null));
      }
      function bigBtn(label, key, primary, fn) {
        return h('button', { class: 'btn tq-big ' + (primary ? 'btn-primary' : 'tq-chalkbtn'), type: 'button', onclick: fn }, label, key ? h('span', { class: 'tq-key', 'aria-hidden': 'true' }, ' ' + key) : null);
      }
      function saveStats() { api.store.set('stats', stats); }

      /* ======================= Computer guesses ======================= */
      var phase = 'intro', node = null, asked = 0, waiting = false, overflowNode = null, guessed = null;
      function setPhase(p) { phase = p; root.setAttribute('data-phase', p); }

      function startMind() {
        setPhase('intro'); node = tree; asked = 0; waiting = false; overflowNode = null; guessed = null;
        menu.replaceChildren(); things.replaceChildren();
        hist.replaceChildren();
        hist.hidden = false;
        setTally(0);
        kicker.textContent = 'Think of anything at all';
        chalk(qEl, 'Think of something, and keep it secret!');
        hint.textContent = 'An animal, a plant, a food, a toy, a thing in your house: anything. I will ask yes-or-no questions and try to guess it in twenty.';
        var ready = bigBtn('I have one', '', true, function () { ask(); });
        actions.replaceChildren(ready);
        showKnow();
        api.status('Think of something, then press I have one');
      }
      function showKnow() {
        var n = countThings(tree);
        know.textContent = 'The computer knows ' + n + ' things' + (learned.length ? ', including ' + learned.length + ' you taught it on this device: ' + learned.slice(-6).join(', ') + (learned.length > 6 ? ' and more' : '') + '.' : '. Stump it and it will learn a new one.');
        forgetBtn.hidden = mode !== 'mind';
        forgetBtn.disabled = !learned.length;
      }

      function ask() {
        waiting = false;
        if (asked >= MAX - 1 && !node.t) { overflowNode = node; node = likelyLeaf(node); }
        var n = asked + 1;
        var text, kick = '';
        hint.textContent = '';
        if (node.t) {
          setPhase('guess');
          guessed = node.t;
          text = 'Is it ' + node.t + '?';
          kick = n === MAX ? 'My last question. Here is my guess:' : 'I think I know!';
        } else {
          setPhase('ask');
          text = node.q;
          if (node.k === 'animal') {
            kick = 'Animal, vegetable or mineral?';
            hint.textContent = 'Victorian players sorted everything into the three kingdoms of nature. A leather belt counts as animal, a wooden table as vegetable, and a coin as mineral.';
          } else if (node.k === 'vegetable') {
            kick = 'Not animal. Then is it vegetable?';
            hint.textContent = 'Vegetable means a plant, or something made from plants, like paper, bread or a wooden spoon.';
          } else kick = 'Question ' + n;
        }
        kicker.textContent = kick;
        chalk(qEl, text);
        actions.replaceChildren(bigBtn('Yes', 'Y', true, function () { answer(true); }), bigBtn('No', 'N', false, function () { answer(false); }));
        api.status(phase === 'guess' ? 'Is it ' + node.t + '? Answer yes or no' : 'Question ' + n + ': ' + text);
      }

      function answer(yes) {
        if (waiting || (phase !== 'ask' && phase !== 'guess')) return;
        asked += 1;
        setTally(asked, true);
        histLine(asked, phase === 'guess' ? 'Is it ' + node.t + '?' : node.q, yes);
        api.sound('click');
        if (phase === 'guess') { if (yes) computerRight(); else stumped(); return; }
        if (node.k === 'vegetable' && !yes) histLine(0, 'Then it must be mineral: stone, metal, glass or water.', null, 'note');
        node = yes ? node.y : node.n;
        waiting = true;
        actions.replaceChildren();
        later(ask, COMPUTER_MS);
      }

      function computerRight() {
        setPhase('done');
        stats.computer = (stats.computer || 0) + 1; saveStats();
        kicker.replaceChildren(h('span', { class: 'tq-stamp' }, 'Got it!'));
        chalk(qEl, 'It was ' + guessed + '! I guessed it in ' + asked + ' question' + (asked === 1 ? '' : 's') + '.');
        hint.textContent = 'Think of something trickier and see if you can stump me. Computer ' + stats.computer + ', you ' + (stats.stumped || 0) + ' on this device.';
        api.sound('bell');
        actions.replaceChildren(bigBtn('Play again', '', true, function () { newGame(); }));
        api.status('The computer guessed it in ' + asked + '. Press Play again to try something trickier');
        focusFirst();
      }

      function stumped() {
        setPhase('learn');
        stats.stumped = (stats.stumped || 0) + 1; saveStats();
        kicker.replaceChildren(h('span', { class: 'tq-stamp' }, 'You stumped me!'));
        api.celebrate('You stumped the computer!');
        api.status('You stumped the computer! Teach it what you were thinking of');
        chalk(qEl, 'Oh! What were you thinking of?');
        hint.textContent = 'Teach me, and I will remember it on this device.';
        var err = h('p', { class: 'tq-err', role: 'alert' });
        var thingIn = h('input', { type: 'text', id: 'tq-thing', maxlength: '40', autocomplete: 'off', placeholder: 'a giraffe' });
        var qIn = h('input', { type: 'text', id: 'tq-newq', maxlength: '100', autocomplete: 'off', placeholder: 'Does it have a very long neck?' });
        var step2 = h('div', { class: 'tq-form', hidden: true });
        var form = h('form', { class: 'tq-form', onsubmit: function (ev) { ev.preventDefault(); toStep2(); } },
          h('label', { for: 'tq-thing' }, 'It was (start with a, an or the if it needs one):', thingIn),
          h('div', { class: 'tq-actions' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Next'), h('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { newGame(); } }, 'Skip')));
        actions.replaceChildren(form, step2, err);
        thingIn.focus({ preventScroll: true });
        var thing = '';
        function toStep2() {
          thing = tidy(thingIn.value, 40);
          if (thing.replace(/[^a-z]/gi, '').length < 2) { err.textContent = 'Type what you were thinking of first.'; thingIn.focus(); return; }
          if (thing.toLowerCase() === guessed.toLowerCase()) { err.textContent = 'That is what I guessed! Was my guess right after all?'; return; }
          err.textContent = '';
          form.hidden = true;
          chalk(qEl, 'How can I tell ' + thing + ' from ' + guessed + '?');
          var yesB = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { teach(true); } }, 'Yes');
          var noB = h('button', { class: 'btn', type: 'button', onclick: function () { teach(false); } }, 'No');
          step2.replaceChildren(
            h('label', { for: 'tq-newq' }, 'Type a yes-or-no question that is true for one of them and not the other:', qIn),
            h('p', { style: { margin: 0, fontWeight: 700 } }, 'For ' + thing + ', the answer is:'),
            h('div', { class: 'tq-actions' }, yesB, noB));
          step2.hidden = false;
          qIn.focus({ preventScroll: true });
        }
        function teach(yesForNew) {
          var question = asQuestion(qIn.value);
          if (question.replace(/[^a-z]/gi, '').length < 6) { err.textContent = 'Type a question first, for example: ' + qIn.placeholder; qIn.focus(); return; }
          err.textContent = '';
          var at = overflowNode || node;
          var oldCopy = at.t ? { t: at.t } : { q: at.q, y: at.y, n: at.n, k: at.k };
          var fresh = { t: thing };
          delete at.t; delete at.k;
          at.q = question;
          at.y = yesForNew ? fresh : oldCopy;
          at.n = yesForNew ? oldCopy : fresh;
          learned.push(thing);
          api.store.set('tree', tree);
          api.store.set('learned', learned);
          setPhase('done');
          step2.hidden = true;
          api.sound('coin');
          chalk(qEl, 'Thank you! Now I know ' + thing + '.');
          hint.textContent = 'Next time I will ask: "' + question + '"';
          actions.replaceChildren(bigBtn('Play again', '', true, function () { newGame(); }));
          showKnow();
          api.status('The computer learned ' + thing + '. Press Play again');
          focusFirst();
        }
      }
      function focusFirst() {
        var b = actions.querySelector('button');
        if (b && root.contains(document.activeElement)) b.focus({ preventScroll: true });
      }

      function askForget() {
        if (!learned.length) return;
        actions.replaceChildren(h('div', { class: 'tq-confirm' },
          h('span', null, 'Forget the ' + learned.length + ' thing' + (learned.length === 1 ? '' : 's') + ' it learned on this device?'),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: function () {
            tree = seedTree(); learned = [];
            api.store.set('tree', tree); api.store.set('learned', learned);
            api.sound('whoosh');
            newGame();
            hint.textContent = 'Wiped clean. It is back to the ' + countThings(tree) + ' things it started with.';
          } }, 'Forget them'),
          h('button', { class: 'btn', type: 'button', onclick: function () { newGame(); } }, 'Keep them')));
      }

      /* ======================= You guess ======================= */
      var secret = null, answers = {}, outs = {}, chipEls = {}, thingEls = {}, gAsked = 0, gOver = false;

      function startGuess() {
        setPhase('g'); gAsked = 0; gOver = false; answers = {}; outs = {};
        secret = THINGS[Math.floor(api.random() * THINGS.length)];
        hist.replaceChildren();
        hist.hidden = true;
        setTally(0);
        kicker.textContent = 'I am thinking of something';
        chalk(qEl, 'Can you guess what it is?');
        hint.textContent = 'Pick questions below and I will answer truthfully. When you think you know, tap your guess in the list. A guess uses up a question too.';
        actions.replaceChildren();
        know.textContent = '';
        forgetBtn.hidden = true;
        /* the question menu */
        chipEls = {};
        menu.replaceChildren();
        QUESTIONS.forEach(function (grp) {
          menu.appendChild(h('div', null, h('h3', null, grp[0]),
            h('div', { class: 'tq-chips' }, grp[1].map(function (q) {
              var b = h('button', { class: 'tq-chip', type: 'button', title: q[1], onclick: function () { askFact(q[0]); } }, q[2]);
              chipEls[q[0]] = b;
              return b;
            }))));
        });
        /* the things it could be */
        thingEls = {};
        var list = h('div', { class: 'tq-thinglist' });
        THINGS.slice().sort(function (a, b) { return a.name.replace(/^(a|an|the) /, '').localeCompare(b.name.replace(/^(a|an|the) /, '')); }).forEach(function (t) {
          var b = h('button', { class: 'tq-thing', type: 'button', onclick: function () { guessThing(t); } }, t.name);
          thingEls[t.name] = b;
          list.appendChild(b);
        });
        leftEl = h('p', { class: 'tq-left' });
        things.replaceChildren(h('h3', null, 'Tap your guess'), leftEl, list);
        updateLeft();
        api.status('Ask a question from the menu, or tap a guess');
      }
      var leftEl = null;
      function remaining() { return THINGS.filter(function (t) { return !outs[t.name]; }); }
      function updateLeft(before) {
        var n = remaining().length;
        leftEl.textContent = 'Things it could be: ' + n + ' of ' + THINGS.length + (before != null && before !== n ? ' (that question crossed out ' + (before - n) + ')' : '');
      }

      function askFact(key) {
        if (gOver || answers[key] != null) return;
        var before = remaining().length;
        var yes = !!secret.yes[key];
        answers[key] = yes;
        gAsked += 1;
        setTally(gAsked, true);
        kicker.textContent = 'You asked';
        chalk(qEl, Q[key].text + ' ' + (yes ? 'Yes!' : 'No.'));
        histLine(gAsked, Q[key].text, yes);
        var chip = chipEls[key];
        chip.disabled = true;
        chip.appendChild(h('span', { class: 'tq-ans' }, yes ? 'yes' : 'no'));
        THINGS.forEach(function (t) {
          if (!outs[t.name] && !!t.yes[key] !== yes) { outs[t.name] = true; crossOut(t.name); }
        });
        updateLeft(before);
        api.sound(yes ? 'pop' : 'click');
        if (gAsked >= MAX) { outOfQuestions(); return; }
        var left = MAX - gAsked;
        api.status((yes ? 'Yes. ' : 'No. ') + (left <= 3 ? 'Only ' + left + ' question' + (left === 1 ? '' : 's') + ' left: time to guess?' : left + ' questions left'));
        hint.textContent = left <= 3 ? 'Only ' + left + ' question' + (left === 1 ? '' : 's') + ' left. Time to guess?' : '';
      }
      function crossOut(name) {
        var b = thingEls[name];
        if (!b) return;
        b.classList.add('is-out', 'is-new-out');
        b.disabled = true;
        later(function () { b.classList.remove('is-new-out'); }, 500);
      }
      function guessThing(t) {
        if (gOver || outs[t.name]) return;
        gAsked += 1;
        setTally(gAsked, true);
        kicker.textContent = 'Your guess';
        histLine(gAsked, 'Is it ' + t.name + '?', t === secret);
        if (t === secret) {
          gOver = true;
          setPhase('won');
          chalk(qEl, 'Yes! It was ' + t.name + '!');
          kicker.replaceChildren(h('span', { class: 'tq-stamp' }, 'You got it!'));
          thingEls[t.name].classList.add('is-secret');
          var best = stats.best || 0;
          var record = !best || gAsked < best;
          if (record) { stats.best = gAsked; }
          stats.guessWins = (stats.guessWins || 0) + 1; saveStats();
          hint.textContent = 'You guessed it in ' + gAsked + ' question' + (gAsked === 1 ? '' : 's') + '.' + (record ? ' That is your best on this device!' : ' Your best is ' + best + '.');
          api.celebrate('You guessed it in ' + gAsked + '!');
          api.status('You guessed it in ' + gAsked + ' questions! Press New game to play again');
          endGuess();
          return;
        }
        outs[t.name] = true;
        crossOut(t.name);
        updateLeft();
        chalk(qEl, 'Is it ' + t.name + '? No!');
        api.sound('wrong');
        if (gAsked >= MAX) { outOfQuestions(); return; }
        api.status('No, it is not ' + t.name + '. ' + (MAX - gAsked) + ' questions left');
      }
      function outOfQuestions() {
        gOver = true;
        setPhase('lost');
        kicker.textContent = 'Twenty questions used';
        chalk(qEl, 'Out of questions! It was ' + secret.name + '.');
        thingEls[secret.name].classList.remove('is-out');
        thingEls[secret.name].classList.add('is-secret');
        hint.textContent = 'So close. Try asking questions that cut the list in half.';
        api.sound('lose');
        api.status('Out of questions. It was ' + secret.name + '. Press New game to try again');
        endGuess();
      }
      function endGuess() {
        Object.keys(chipEls).forEach(function (k) { chipEls[k].disabled = true; });
        Object.keys(thingEls).forEach(function (k) { thingEls[k].disabled = true; });
        actions.replaceChildren(bigBtn('Play again', '', true, function () { newGame(); }));
        var b = actions.querySelector('button');
        if (b && root.contains(document.activeElement)) b.focus({ preventScroll: true });
      }

      /* ---------- both ---------- */
      function setMode(m) {
        mode = m;
        api.store.set('mode', m);
        newGame();
      }
      function newGame() {
        cancelAll();
        modeBtns.mind.setAttribute('aria-pressed', String(mode === 'mind'));
        modeBtns.guess.setAttribute('aria-pressed', String(mode === 'guess'));
        root.setAttribute('data-mode', mode);
        if (mode === 'mind') startMind(); else startGuess();
      }

      newGame();
      return { destroy: destroy };
    }
  });
})();
