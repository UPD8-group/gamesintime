/* Rock Paper Scissors for Games in Time.
   Janken (rock, paper, scissors) grew up in Japan in the 1800s out of older "sansukumi-ken", hand games
   of three signs that each fear another. The oldest, mushi-ken, used a frog (thumb), a slug (little
   finger) and a snake (index finger): the frog beats the slug, the slug beats the snake, and the snake
   beats the frog (Sansukumi-ken, Wikipedia, citing Linhart 1998). English speakers were still having the
   rock, paper and scissors game explained to them in the 1920s.

   How the file is organised:
     Part 1  The three games: their signs, who beats whom, the chant.
     Part 2  The computer. Easy picks at random. Hard keeps a tally of your moves, and of what you play
             after your last move and after your last two moves, guesses your most likely next move and
             plays the sign that beats it.
     Part 3  The screen: two big drawn hands that shake three times to the chant, then the reveal.
   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  var ID = 'rock-paper-scissors';
  var TO_WIN = 3;          /* first to three round wins, which is best of five when nobody draws */
  var BEAT_MS = 330;       /* one shake of the fists */
  var AFTER_MS = 650;      /* how long the reveal stays before you can play again */

  /* =====================================================================
     PART 1: THE GAMES
     beats[i] is the sign that sign i beats.
     ===================================================================== */
  var GAMES = {
    janken: {
      label: 'Janken (Japan)', chant: ['Jan', 'ken', 'pon!'], keys: ['r', 'p', 's'],
      signs: [
        { id: 'rock', name: 'Rock', also: 'guu', pose: 'fist' },
        { id: 'paper', name: 'Paper', also: 'paa', pose: 'flat' },
        { id: 'scissors', name: 'Scissors', also: 'choki', pose: 'vee' }],
      beats: [2, 0, 1],
      verbs: ['Rock blunts scissors', 'Paper wraps rock', 'Scissors cut paper']
    },
    english: {
      label: 'Rock, paper, scissors', chant: ['Rock,', 'paper,', 'scissors!'], keys: ['r', 'p', 's'],
      signs: [
        { id: 'rock', name: 'Rock', pose: 'fist' },
        { id: 'paper', name: 'Paper', pose: 'flat' },
        { id: 'scissors', name: 'Scissors', pose: 'vee' }],
      beats: [2, 0, 1],
      verbs: ['Rock blunts scissors', 'Paper wraps rock', 'Scissors cut paper']
    },
    mushi: {
      label: 'Mushi-ken (frog, slug, snake)', chant: ['One,', 'two,', 'three!'], keys: ['f', 'l', 'n'],
      signs: [
        { id: 'frog', name: 'Frog', also: 'thumb', pose: 'thumb' },
        { id: 'slug', name: 'Slug', also: 'little finger', pose: 'pinky' },
        { id: 'snake', name: 'Snake', also: 'pointer finger', pose: 'point' }],
      beats: [1, 2, 0],
      verbs: ['Frog eats slug', 'Slug beats snake (snakes were said to fear slugs)', 'Snake eats frog']
    }
  };
  /* result of a against b: 1 if a wins, -1 if b wins, 0 for a draw */
  function judge(game, a, b) { return a === b ? 0 : game.beats[a] === b ? 1 : -1; }
  function beaterOf(game, m) { for (var i = 0; i < 3; i++) if (game.beats[i] === m) return i; return 0; }

  /* =====================================================================
     PART 2: THE COMPUTER
     history: your moves this session, oldest first (0, 1 or 2).
     ===================================================================== */
  function predict(history, random) {
    var n = history.length;
    if (!n) return { move: Math.floor(random() * 3), kind: 'none' };
    function tally(match) {
      var c = [0, 0, 0], t = 0;
      for (var i = 0; i < n; i++) if (match(i)) { c[history[i]]++; t++; }
      return { c: c, t: t };
    }
    var a = history[n - 2], b = history[n - 1];
    var pair = n >= 3 ? tally(function (i) { return i >= 2 && history[i - 2] === a && history[i - 1] === b; }) : { c: [0, 0, 0], t: 0 };
    var last = tally(function (i) { return i >= 1 && history[i - 1] === b; });
    var often = tally(function () { return true; });
    var parts = [[pair, 0.55], [last, 0.3], [often, 0.15]].filter(function (p) { return p[0].t > 0; });
    var wsum = parts.reduce(function (s, p) { return s + p[1]; }, 0);
    var score = [0, 1, 2].map(function (m) { return parts.reduce(function (s, p) { return s + p[1] / wsum * p[0].c[m] / p[0].t; }, 0); });
    var best = Math.max.apply(null, score);
    var tops = [0, 1, 2].filter(function (m) { return score[m] > best - 1e-9; });
    var move = tops.length === 1 ? tops[0] : tops[Math.floor(random() * tops.length)];
    var kind = pair.t ? 'pair' : last.t ? 'last' : 'often';
    var src = kind === 'pair' ? pair : kind === 'last' ? last : often;
    return { move: move, kind: kind, a: a, b: b, count: src.c[move], total: src.t, often: often.c };
  }

  /* =====================================================================
     PART 3: THE SCREEN
     ===================================================================== */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, String(attrs[k])); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }
  /* a finger: a rounded bar from (x1, y1) to (x2, y2), w thick */
  function finger(x1, y1, x2, y2, w, cls) {
    var len = Math.hypot(x2 - x1, y2 - y1), deg = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    return s('rect', { x: x1.toFixed(1), y: (y1 - w / 2).toFixed(1), width: len.toFixed(1), height: w, rx: w / 2, class: cls || 'rps-skin', transform: 'rotate(' + deg.toFixed(1) + ' ' + x1 + ' ' + y1 + ')' });
  }
  /* The hand, drawn pointing right from a sleeve at the left. Curled fingers are stacked knuckles. */
  function hand(pose) {
    var g = s('g', { class: 'rps-hand' });
    var curled = { fist: [0, 1, 2, 3], vee: [2, 3], thumb: [0, 1, 2, 3], pinky: [0, 1, 2], point: [1, 2, 3], flat: [] }[pose];
    /* fingers that stick out go behind the palm */
    if (pose === 'flat') {
      g.appendChild(finger(120, 70, 224, 66, 16));
      g.appendChild(finger(120, 86, 232, 86, 16));
      g.appendChild(finger(120, 102, 226, 104, 16));
      g.appendChild(finger(118, 116, 210, 122, 15));
    } else if (pose === 'vee') {
      g.appendChild(finger(126, 70, 230, 34, 17));
      g.appendChild(finger(126, 86, 232, 112, 17));
    } else if (pose === 'pinky') {
      g.appendChild(finger(126, 116, 200, 122, 14));
    } else if (pose === 'point') {
      g.appendChild(finger(126, 66, 234, 62, 17));
    }
    /* the palm */
    g.appendChild(s('rect', { x: 66, y: pose === 'flat' ? 60 : 52, width: pose === 'flat' ? 74 : 84, height: pose === 'flat' ? 66 : 78, rx: 26, class: 'rps-skin' }));
    /* curled fingers: knuckles down the front of the fist */
    curled.forEach(function (k) { g.appendChild(s('rect', { x: 124, y: 52 + k * 19.5, width: 34, height: 19, rx: 9.5, class: 'rps-skin' })); });
    /* the thumb */
    if (pose === 'thumb') g.appendChild(finger(100, 60, 106, 2, 21));
    else if (pose === 'flat') g.appendChild(finger(102, 70, 150, 42, 17));
    else g.appendChild(finger(92, 62, 138, 72, 19));
    /* the sleeve and its cuff */
    g.appendChild(s('rect', { x: -40, y: 56, width: 96, height: 72, rx: 10, class: 'rps-sleeve' }));
    g.appendChild(s('rect', { x: 48, y: 50, width: 16, height: 84, rx: 6, class: 'rps-cuff' }));
    return g;
  }
  function icon(pose) {
    var svg = s('svg', { viewBox: '-44 -12 290 156', class: 'rps-icon', 'aria-hidden': 'true', focusable: 'false' });
    svg.appendChild(hand(pose));
    return svg;
  }

  var CSS = [
    '.game-rock-paper-scissors { --rps-you: var(--peacock); --rps-cpu: var(--rose); --rps-line: var(--bg); }',
    '.game-rock-paper-scissors .rps-score { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; justify-items: center; gap: .5rem; max-width: 30rem; margin: .2rem auto .2rem; }',
    '.game-rock-paper-scissors .rps-side { display: grid; justify-items: center; gap: .1rem; }',
    '.game-rock-paper-scissors .rps-side b { font-family: var(--font-head); font-weight: 800; font-size: 1.05rem; }',
    '.game-rock-paper-scissors .rps-num { font-family: var(--font-display); font-size: clamp(2.6rem, 2rem + 3vw, 4rem); line-height: 1; font-variant-numeric: tabular-nums; }',
    '.game-rock-paper-scissors .rps-num.you { color: var(--rps-you); }',
    '.game-rock-paper-scissors .rps-num.cpu { color: var(--rps-cpu); }',
    '.game-rock-paper-scissors .rps-num.is-pop { animation: rps-pop .5s cubic-bezier(.3, 1.7, .5, 1); }',
    '@keyframes rps-pop { 0% { transform: scale(1.9); } 100% { transform: scale(1); } }',
    '.game-rock-paper-scissors .rps-mid { text-align: center; font-weight: 700; color: var(--ink-muted); font-size: .95rem; line-height: 1.3; }',
    '.game-rock-paper-scissors .rps-pips { display: flex; gap: .3rem; justify-content: center; margin-top: .3rem; flex-wrap: wrap; }',
    '.game-rock-paper-scissors .rps-pip { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--line); }',
    '.game-rock-paper-scissors .rps-pip.w { background: var(--rps-you); border-color: var(--rps-you); }',
    '.game-rock-paper-scissors .rps-pip.l { background: var(--rps-cpu); border-color: var(--rps-cpu); }',
    '.game-rock-paper-scissors .rps-pip.d { background: var(--ink-muted); border-color: var(--ink-muted); width: 8px; height: 8px; align-self: center; }',
    '.game-rock-paper-scissors .rps-stage { position: relative; max-width: 760px; margin: 0 auto; border-radius: 18px; background: radial-gradient(60% 75% at 50% 18%, color-mix(in srgb, var(--gold) 22%, transparent), transparent 70%); }',
    '.game-rock-paper-scissors .rps-svg { display: block; width: 100%; height: auto; overflow: visible; }',
    '.game-rock-paper-scissors .rps-skin { fill: var(--ink); stroke: var(--rps-line); stroke-width: 4; stroke-linejoin: round; }',
    '.game-rock-paper-scissors .rps-sleeve { stroke: var(--rps-line); stroke-width: 4; }',
    '.game-rock-paper-scissors .rps-cuff { fill: var(--gold); stroke: var(--rps-line); stroke-width: 4; }',
    '.game-rock-paper-scissors .rps-you .rps-sleeve, .game-rock-paper-scissors .rps-btn .rps-sleeve { fill: var(--rps-you); }',
    '.game-rock-paper-scissors .rps-cpu .rps-sleeve { fill: var(--rps-cpu); }',
    '.game-rock-paper-scissors .rps-arm { transform-box: view-box; }',
    '.game-rock-paper-scissors .rps-you { transform-origin: 30px 170px; }',
    '.game-rock-paper-scissors .rps-cpu { transform-origin: 610px 170px; }',
    '.game-rock-paper-scissors .rps-arm.is-beat { animation: rps-beat .3s ease-in-out; }',
    '.game-rock-paper-scissors .rps-cpu.is-beat { animation-name: rps-beat-cpu; }',
    '@keyframes rps-beat { 0% { transform: rotate(0); } 40% { transform: rotate(-17deg) translateY(-10px); } 100% { transform: rotate(0); } }',
    '@keyframes rps-beat-cpu { 0% { transform: rotate(0); } 40% { transform: rotate(17deg) translateY(-10px); } 100% { transform: rotate(0); } }',
    '.game-rock-paper-scissors .rps-arm.is-reveal { animation: rps-reveal .35s cubic-bezier(.3, 1.6, .5, 1); }',
    '@keyframes rps-reveal { 0% { transform: translateY(-14px) scale(1.06); } 100% { transform: none; } }',
    '.game-rock-paper-scissors .rps-arm.is-win { filter: drop-shadow(0 0 10px var(--gold)) drop-shadow(0 0 22px var(--gold)); }',
    '.game-rock-paper-scissors .rps-arm.is-lose { opacity: .5; }',
    '.game-rock-paper-scissors .rps-chant { text-align: center; font-family: var(--font-poster); font-size: clamp(1.8rem, 1.1rem + 3.4vw, 3.3rem); line-height: 1.15; min-height: 1.2em; color: var(--ink); text-shadow: 3px 3px 0 var(--p1), 6px 6px 0 var(--p3); pointer-events: none; }',
    '@media (max-width: 520px) { .game-rock-paper-scissors .rps-stage { margin-inline: -6px; } }',
    '.game-rock-paper-scissors .rps-chant.is-say { animation: rps-say .3s ease-out; }',
    '@keyframes rps-say { 0% { transform: scale(1.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }',
    '.game-rock-paper-scissors .rps-flash { position: absolute; inset: 0; border-radius: 18px; pointer-events: none; opacity: 0; background: radial-gradient(circle at 50% 55%, color-mix(in srgb, var(--gold) 55%, transparent), transparent 65%); }',
    '.game-rock-paper-scissors .rps-flash.is-on { animation: rps-flash .7s ease-out; }',
    '@keyframes rps-flash { 0% { opacity: 1; } 100% { opacity: 0; } }',
    '.game-rock-paper-scissors .rps-names { display: flex; justify-content: space-between; font-weight: 800; font-size: .95rem; color: var(--ink-muted); padding: 0 6%; margin-top: -.3rem; }',
    '.game-rock-paper-scissors .rps-result { text-align: center; font-family: var(--font-head); font-weight: 800; font-size: clamp(1.15rem, 1rem + .9vw, 1.6rem); min-height: 2.6em; margin: .4rem 0 .6rem; display: grid; place-items: center; line-height: 1.2; }',
    '.game-rock-paper-scissors .rps-result.win { color: var(--gold); }',
    '.game-rock-paper-scissors .rps-result.lose { color: var(--rps-cpu); }',
    '.game-rock-paper-scissors .rps-choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .6rem; max-width: 620px; margin: 0 auto; }',
    '.game-rock-paper-scissors .rps-btn { display: grid; justify-items: center; gap: .1rem; min-height: 112px; padding: .5rem .3rem .6rem; border-radius: 18px; border: 3px solid var(--line); background: var(--surface-2); color: var(--ink); font-family: var(--font-head); font-weight: 800; font-size: 1.1rem; line-height: 1.1; transition: transform .12s, border-color .12s; }',
    '.game-rock-paper-scissors .rps-btn:hover { border-color: var(--gold); transform: translateY(-2px); }',
    '.game-rock-paper-scissors .rps-btn[aria-disabled="true"] { opacity: .6; cursor: wait; transform: none; }',
    '.game-rock-paper-scissors .rps-btn.is-picked { border-color: var(--rps-you); box-shadow: 0 0 0 3px var(--rps-you); }',
    '.game-rock-paper-scissors .rps-btn .rps-icon { width: 92px; height: 50px; }',
    '.game-rock-paper-scissors .rps-btn small { font-weight: 600; font-size: .78rem; color: var(--ink-muted); }',
    '.game-rock-paper-scissors .rps-btn kbd { font-family: var(--font-mono); font-size: .75rem; color: var(--ink-muted); border: 1px solid var(--line); border-radius: 5px; padding: 0 .3rem; }',
    '@media (max-width: 420px) { .game-rock-paper-scissors .rps-btn { font-size: .98rem; min-height: 100px; } .game-rock-paper-scissors .rps-btn .rps-icon { width: 74px; height: 42px; } .game-rock-paper-scissors .rps-btn small { font-size: .7rem; } }',
    '.game-rock-paper-scissors .rps-think { margin-top: 1rem; padding: .8rem 1rem; border-radius: 14px; background: var(--surface-2); border-left: 5px solid var(--rps-cpu); }',
    '.game-rock-paper-scissors .rps-think h3 { font-size: 1rem; margin: 0 0 .3rem; }',
    '.game-rock-paper-scissors .rps-think p { margin: .2rem 0 0; }',
    '.game-rock-paper-scissors .rps-bars { display: grid; gap: .25rem; margin-top: .5rem; max-width: 26rem; }',
    '.game-rock-paper-scissors .rps-bar { display: grid; grid-template-columns: 5.5rem 1fr 2rem; gap: .5rem; align-items: center; font-size: .9rem; font-weight: 700; }',
    '.game-rock-paper-scissors .rps-bar span.track { height: 10px; border-radius: 6px; background: var(--line); overflow: hidden; }',
    '.game-rock-paper-scissors .rps-bar span.fill { display: block; height: 100%; background: var(--rps-you); border-radius: 6px; transition: width .4s ease; }',
    '.game-rock-paper-scissors .rps-record { color: var(--ink-muted); font-size: .92rem; margin: .6rem 0 0; text-align: center; }',
    '.game-rock-paper-scissors .game-toolbar .field { flex-wrap: wrap; max-width: 100%; } .game-rock-paper-scissors .game-toolbar select { max-width: 100%; }',
    '@media (prefers-reduced-motion: reduce) { .game-rock-paper-scissors .rps-arm.is-beat, .game-rock-paper-scissors .rps-arm.is-reveal, .game-rock-paper-scissors .rps-chant.is-say, .game-rock-paper-scissors .rps-num.is-pop, .game-rock-paper-scissors .rps-flash.is-on { animation: none; } .game-rock-paper-scissors .rps-bar span.fill { transition: none; } }'
  ].join('\n');

  GamesInTime.register({
    id: ID,
    frame: 'stage',
    /* The rules and the predictor, for tests and for anyone curious. */
    logic: { games: GAMES, judge: judge, predict: predict },
    mount: function (root, api) {
      var h = api.h;
      root.appendChild(h('style', null, CSS));

      var gameId = api.store.get('game', 'janken');
      if (!GAMES[gameId]) gameId = 'janken';
      var level = api.store.get('level', 'hard');
      if (level !== 'easy' && level !== 'hard') level = 'hard';
      var record = api.store.get('record', {});
      if (!record || typeof record !== 'object') record = {};

      var game = GAMES[gameId], history = [], you = 0, cpu = 0, rounds = [], busy = false, over = false, timers = [];
      var lastThought = null;

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
        var idx = ['1', '2', '3'].indexOf(k);
        if (idx < 0) idx = game.keys.indexOf(k);
        if (idx >= 0) { ev.preventDefault(); choose(idx); }
      }
      document.addEventListener('keydown', onKey);
      function onHash() { if (!onPage()) destroy(); }
      window.addEventListener('hashchange', onHash);
      function destroy() { cancelAll(); document.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', onHash); }

      /* ---------- toolbar ---------- */
      var gameSelect = h('select', { id: 'rps-game', onchange: function () { gameId = gameSelect.value; api.store.set('game', gameId); game = GAMES[gameId]; history = []; buildChoices(); newMatch(); } },
        Object.keys(GAMES).map(function (k) { return h('option', { value: k }, GAMES[k].label); }));
      gameSelect.value = gameId;
      var levelBtns = {};
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Computer' },
        levelBtns.easy = h('button', { type: 'button', onclick: function () { setLevel('easy'); } }, 'Easy'),
        levelBtns.hard = h('button', { type: 'button', onclick: function () { setLevel('hard'); } }, 'Hard'));
      var newBtn = h('button', { class: 'btn', type: 'button', onclick: function () { newMatch(); } }, 'New match');
      root.appendChild(h('div', { class: 'game-toolbar' }, newBtn, h('label', { class: 'field', for: 'rps-game' }, 'Game', gameSelect), h('span', { class: 'field' }, 'Computer', levelSeg)));

      /* ---------- score ---------- */
      var youNum = h('span', { class: 'rps-num you' }, '0');
      var cpuNum = h('span', { class: 'rps-num cpu' }, '0');
      var midText = h('span');
      var pips = h('div', { class: 'rps-pips', 'aria-hidden': 'true' });
      root.appendChild(h('div', { class: 'rps-score scoreboard', role: 'group', 'aria-label': 'Score' },
        h('div', { class: 'rps-side' }, youNum, h('b', null, 'You')),
        h('div', { class: 'rps-mid' }, midText, pips),
        h('div', { class: 'rps-side' }, cpuNum, h('b', null, 'Computer'))));

      /* ---------- the stage: two arms facing each other ---------- */
      var stageSvg = s('svg', { class: 'rps-svg', viewBox: '14 50 612 180', role: 'img', 'aria-label': 'Your hand on the left and the computer\'s hand on the right' });
      var youArm = s('g', { class: 'rps-arm rps-you' });
      var cpuArm = s('g', { class: 'rps-arm rps-cpu' });
      var youPose = s('g', { transform: 'translate(50 70) scale(1.1)' });
      var cpuPose = s('g', { transform: 'translate(590 70) scale(-1.1 1.1)' });
      youArm.appendChild(youPose); cpuArm.appendChild(cpuPose);
      stageSvg.appendChild(youArm); stageSvg.appendChild(cpuArm);
      var chantEl = h('div', { class: 'rps-chant', 'aria-hidden': 'true' });
      var flash = h('div', { class: 'rps-flash', 'aria-hidden': 'true' });
      root.appendChild(chantEl);
      root.appendChild(h('div', { class: 'rps-stage' }, flash, stageSvg));
      root.appendChild(h('div', { class: 'rps-names', 'aria-hidden': 'true' }, h('span', null, 'You'), h('span', null, 'Computer')));
      var resultEl = h('div', { class: 'rps-result', 'aria-live': 'off' });
      root.appendChild(resultEl);
      function setPose(arm, pose) { arm.replaceChildren(hand(pose)); }

      /* ---------- the three choices ---------- */
      var choicesEl = h('div', { class: 'rps-choices', role: 'group', 'aria-label': 'Your sign' });
      root.appendChild(choicesEl);
      var choiceBtns = [];
      function buildChoices() {
        choicesEl.replaceChildren();
        choiceBtns = game.signs.map(function (sg, i) {
          var b = h('button', { class: 'rps-btn', type: 'button', 'data-sign': sg.id, onclick: function () { choose(i); } },
            icon(sg.pose), h('span', null, sg.name), sg.also ? h('small', null, sg.also) : null,
            h('kbd', { 'aria-hidden': 'true' }, String(i + 1) + (gameId === 'mushi' ? '' : ' or ' + game.keys[i].toUpperCase())));
          choicesEl.appendChild(b);
          return b;
        });
      }

      /* ---------- the computer's thinking ---------- */
      var thinkTitle = h('h3');
      var thinkText = h('p');
      var bars = h('div', { class: 'rps-bars' });
      var think = h('div', { class: 'rps-think' }, thinkTitle, thinkText, bars);
      var recordEl = h('p', { class: 'rps-record' });
      root.appendChild(think);
      root.appendChild(recordEl);
      root.appendChild(h('p', { class: 'game-note' }, 'Press 1, 2 or 3 to play' + ' (or R, P and S in the rock, paper, scissors games). First to ' + TO_WIN + ' rounds wins the match; draws are played again.'));

      function name(i) { return game.signs[i].name; }
      function showThinking() {
        if (level === 'easy') {
          thinkTitle.textContent = 'How the Easy computer thinks';
          thinkText.textContent = 'It picks at random every time, like a fair spinner. Nobody can guess its next move, and it never learns yours.';
          bars.replaceChildren();
          return;
        }
        thinkTitle.textContent = 'What the Hard computer is thinking';
        var t = lastThought;
        if (!history.length) thinkText.textContent = 'It is watching you. Play a few rounds and it will start to guess your next move from your habits.';
        else if (!t || t.kind === 'none') thinkText.textContent = 'No pattern yet, so it guessed at random.';
        else {
          var why = t.kind === 'pair' ? 'after you played ' + name(t.a) + ' then ' + name(t.b) + ', you played ' + name(t.move) + ' ' + t.count + ' time' + (t.count === 1 ? '' : 's') + ' out of ' + t.total
            : t.kind === 'last' ? 'after ' + name(t.b) + ', you played ' + name(t.move) + ' ' + t.count + ' time' + (t.count === 1 ? '' : 's') + ' out of ' + t.total
            : 'you play ' + name(t.move) + ' the most';
          thinkText.textContent = 'Last round it guessed you would play ' + name(t.move) + ', because ' + why + '. So it played ' + name(beaterOf(game, t.move)) + '. Play in a pattern and it will catch you!';
        }
        var counts = [0, 0, 0];
        history.forEach(function (m) { counts[m]++; });
        var max = Math.max(1, Math.max.apply(null, counts));
        bars.replaceChildren.apply(bars, game.signs.map(function (sg, i) {
          return h('div', { class: 'rps-bar' }, h('span', null, sg.name), h('span', { class: 'track' }, h('span', { class: 'fill', style: { width: (counts[i] / max * 100) + '%' } })), h('span', null, String(counts[i])));
        }));
      }
      function showRecord() {
        var r = record[level] || { w: 0, l: 0 };
        recordEl.textContent = 'Matches against ' + (level === 'hard' ? 'Hard' : 'Easy') + ' on this device: you ' + r.w + ', computer ' + r.l + '.';
      }

      /* ---------- play ---------- */
      function setLevel(l) {
        level = l;
        api.store.set('level', l);
        newMatch();
      }
      function setButtons(waiting) {
        choiceBtns.forEach(function (b) { b.setAttribute('aria-disabled', waiting ? 'true' : 'false'); });
      }
      function drawScore(popWho) {
        youNum.textContent = String(you);
        cpuNum.textContent = String(cpu);
        midText.textContent = over ? 'Match over' : 'First to ' + TO_WIN;
        pips.replaceChildren.apply(pips, rounds.map(function (r) { return h('span', { class: 'rps-pip ' + r }); }));
        [[youNum, 'you'], [cpuNum, 'cpu']].forEach(function (p) {
          p[0].classList.remove('is-pop');
          if (popWho === p[1]) { void p[0].offsetWidth; p[0].classList.add('is-pop'); }
        });
        root.setAttribute('data-score', you + '-' + cpu);
      }
      function newMatch() {
        cancelAll();
        you = 0; cpu = 0; rounds = []; busy = false; over = false;
        levelBtns.easy.setAttribute('aria-pressed', String(level === 'easy'));
        levelBtns.hard.setAttribute('aria-pressed', String(level === 'hard'));
        root.setAttribute('data-over', 'false');
        setPose(youPose, 'fist');
        setPose(cpuPose, 'fist');
        youArm.setAttribute('class', 'rps-arm rps-you');
        cpuArm.setAttribute('class', 'rps-arm rps-cpu');
        chantEl.textContent = 'Ready?';
        resultEl.className = 'rps-result';
        resultEl.textContent = 'Pick your sign!';
        choiceBtns.forEach(function (b) { b.classList.remove('is-picked'); });
        setButtons(false);
        drawScore();
        showThinking();
        showRecord();
        api.status('Pick ' + game.signs.map(function (sg) { return sg.name.toLowerCase(); }).join(', ').replace(/, ([^,]*)$/, ' or $1'));
      }

      function choose(i) {
        if (busy || over || i < 0 || i > 2) return;
        busy = true;
        setButtons(true);
        /* the computer decides first, from your past moves only */
        var thought = null, comp;
        if (level === 'hard') {
          thought = predict(history, api.random);
          /* with nothing to go on, predict() picks at random and the computer simply plays that */
          comp = thought.kind === 'none' ? thought.move : beaterOf(game, thought.move);
        } else comp = Math.floor(api.random() * 3);
        history.push(i);
        lastThought = thought;
        choiceBtns.forEach(function (b, k) { b.classList.toggle('is-picked', k === i); });
        setPose(youPose, 'fist'); setPose(cpuPose, 'fist');
        youArm.setAttribute('class', 'rps-arm rps-you');
        cpuArm.setAttribute('class', 'rps-arm rps-cpu');
        resultEl.className = 'rps-result';
        resultEl.textContent = '';
        api.status(game.chant.join(' '));
        if (api.reducedMotion) { chantEl.textContent = game.chant.join(' '); reveal(i, comp); return; }
        var beat = 0;
        (function shake() {
          chantEl.textContent = game.chant[beat];
          chantEl.classList.remove('is-say'); void chantEl.offsetWidth; chantEl.classList.add('is-say');
          if (beat === 2) { reveal(i, comp); return; }
          [youArm, cpuArm].forEach(function (a) { a.classList.remove('is-beat'); void a.getBoundingClientRect(); a.classList.add('is-beat'); });
          api.sound('tick');
          beat++;
          later(shake, BEAT_MS);
        })();
      }

      function reveal(i, comp) {
        setPose(youPose, game.signs[i].pose);
        setPose(cpuPose, game.signs[comp].pose);
        [youArm, cpuArm].forEach(function (a) { a.classList.remove('is-beat'); void a.getBoundingClientRect(); a.classList.add('is-reveal'); });
        api.sound('clack');
        var r = judge(game, i, comp);
        var line;
        if (r === 0) {
          rounds.push('d');
          line = 'You both played ' + name(i) + '. A draw: go again!';
          resultEl.className = 'rps-result';
          api.sound('pop');
        } else if (r > 0) {
          you += 1; rounds.push('w');
          line = game.verbs[i] + '! You win the round.';
          resultEl.className = 'rps-result win';
          youArm.classList.add('is-win'); cpuArm.classList.add('is-lose');
          flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on');
          api.sound('coin');
        } else {
          cpu += 1; rounds.push('l');
          line = game.verbs[comp] + '. The computer wins the round.';
          resultEl.className = 'rps-result lose';
          cpuArm.classList.add('is-win'); youArm.classList.add('is-lose');
          api.sound('wrong');
        }
        resultEl.textContent = line;
        root.setAttribute('data-last', game.signs[i].id + '-' + game.signs[comp].id);
        drawScore(r > 0 ? 'you' : r < 0 ? 'cpu' : null);
        showThinking();
        if (you >= TO_WIN || cpu >= TO_WIN) { endMatch(line); return; }
        api.status(line + ' ' + you + ' to ' + cpu + '.');
        later(function () { busy = false; setButtons(false); }, AFTER_MS);
      }

      function endMatch(line) {
        over = true;
        busy = false;
        root.setAttribute('data-over', 'true');
        var r = record[level] || { w: 0, l: 0 };
        if (you > cpu) {
          r.w += 1;
          api.status(line + ' You win the match ' + you + ' to ' + cpu + '! Press New match to play again.');
          api.celebrate('You won the match ' + you + ' to ' + cpu + '!');
          resultEl.textContent = 'You win the match, ' + you + ' to ' + cpu + '!';
        } else {
          r.l += 1;
          api.status(line + ' The computer wins the match ' + cpu + ' to ' + you + '. Press New match for a rematch.');
          api.sound('lose');
          resultEl.textContent = 'The computer wins the match, ' + cpu + ' to ' + you + '. Rematch?';
        }
        record[level] = r;
        api.store.set('record', record);
        showRecord();
        drawScore();
        setButtons(true);
        if (root.contains(document.activeElement) || document.activeElement === document.body) newBtn.focus({ preventScroll: true });
      }

      buildChoices();
      newMatch();
      return { destroy: destroy };
    }
  });
})();
