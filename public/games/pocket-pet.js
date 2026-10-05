/* Pocket Pet for Games in Time.

   A tiny creature lives on the dot screen of an egg-shaped handheld. It hatches, grows from a baby to a child to a
   grown-up, and needs you: food, games, cleaning up, lights off at bedtime, and medicine when it is ill. Like the
   1996 toy, it has three buttons: A chooses, B does it, C goes back. Big buttons beside it do the same things.

   Time: one pet day takes about 4 minutes on Normal (8 on Relaxed, 2 on Speedy). Time only runs while this page is
   open and showing. Everything is saved, so your pet is waiting when you come back, exactly as you left it.

   The pet never dies. If it is left hungry, ill and unhappy for a long time, its health runs out and it flies home
   to its own planet, where its family looks after it, and leaves you a new egg.

   How it grows up: the computer counts "care mistakes" (a need left at zero, ignored for a while) and what you did
   most (meals, snacks, games won). When the child grows up, those numbers pick one of five grown-up forms.

   Everything on the screen is drawn by this file, dot by dot. The creatures are our own designs. */
(function () {
  'use strict';

  /* =====================================================================================
     Pixel pictures. '#' is a dark dot, 'o' is an eye (it can look left or right), '.' is empty.
     ===================================================================================== */
  var SPR = {
    egg: ['.....##.....', '...##..##...', '..#......#..', '.#........#.', '.#..#.....#.', '#..###.....#', '#...#...#..#', '#..........#', '##..##..##.#', '#.##..##..##', '#..........#', '.#....#...#.', '.#...###..#.', '..##..#.##..', '....####....'],
    baby: ['...####...', '.##....##.', '#........#', '#..o..o..#', '#........#', '#...##...#', '.#......#.', '..######..', '..#....#..'],
    child: ['......##....', '.....#..#...', '......##....', '.....#......', '...######...', '..#......#..', '.#........#.', '.#..o..o..#.', '.#........#.', '.#...##...#.', '..#......#..', '...######...', '...#....#...', '..##....##..'],
    zing: ['..#....##....#..', '...#..#..#..#...', '....#.#..#.#....', '....########....', '...#........#...', '..#..........#..', '.#...o....o...#.', '.#............#.', '.#....#..#....#.', '.#.....##.....#.', '..#..........#..', '...#........#...', '....########....', '.....#....#.....', '....##....##....'],
    bloop: ['.......##.......', '......#..#......', '........#.......', '.......#........', '....########....', '..##........##..', '.#............#.', '#...o......o...#', '#..............#', '#.....####.....#', '#..............#', '.#............#.', '..#.#.#..#.#.#..', '...#.#.##.#.#...'],
    munch: ['....########....', '...#........#...', '..#..........#..', '.#...o....o...#.', '.#............#.', '#.##........##.#', '#.##........##.#', '#..............#', '#..##########..#', '#...#......#...#', '.#...######...#.', '..#..........#..', '...##########...', '...##......##...'],
    bounce: ['..##........##..', '..#.#......#.#..', '..#.#......#.#..', '..#..#....#..#..', '...#..####..#...', '..#..........#..', '..#..o....o..#..', '..#..........#..', '..#....##....#..', '...#........#...', '....########....', '.....#....#.....', '....#......#....', '.....#....#.....', '...###....###...'],
    drowse: ['.##..######..##.', '#..##......##..#', '#.#..........#.#', '.#............#.', '.#..##....##..#.', '.#............#.', '.#.....##.....#.', '.#............#.', '..#..........#..', '...##########...', '....#......#....', '...##......##...'],
    meal: ['#..#..#.', '.#..#..#', '########', '#......#', '#......#', '.#....#.', '..####..'],
    snack: ['.###.', '#####', '##.##', '#####', '#####', '.###.', '..#..', '..#..'],
    mess: ['...#...', '..#.#..', '...##..', '..####.', '.######', '#######'],
    heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
    note: ['..###', '..#.#', '..#..', '..#..', '###..', '###..'],
    germ: ['#..#..#', '.#####.', '.#.#.#.', '###.###', '.#####.', '.#...#.', '#..#..#'],
    pill: ['.######.', '####...#', '####...#', '.######.'],
    moon: ['..###.', '.##...', '##....', '##....', '##....', '.##...', '..###.'],
    z: ['####', '..#.', '.#..', '####'],
    rocket: ['...#...', '..###..', '.##.##.', '.#...#.', '.#.#.#.', '.#...#.', '.#...#.', '.#####.', '##.#.##', '#..#..#'],
    left: ['...#...', '..##...', '.######', '#######', '.######', '..##...', '...#...'],
    right: ['...#...', '...##..', '######.', '#######', '######.', '...##..', '...#...'],
    question: ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    cross: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    sparkle: ['..#..', '.....', '#.#.#', '.....', '..#..'],
    arrowUp: ['..#..', '.###.', '#####']
  };
  /* The icons printed round the screen, 7 by 7 */
  var ICONS = {
    feed: ['.#.#.#.', '..#.#..', '#######', '#.....#', '#.....#', '.#...#.', '..###..'],
    play: ['..###..', '.#.#.#.', '#..#..#', '#######', '#..#..#', '.#.#.#.', '..###..'],
    clean: ['...#...', '..###..', '.#####.', '.#####.', '#######', '.#####.', '..###..'],
    lights: ['..###..', '.#...#.', '.#...#.', '.#...#.', '..#.#..', '..###..', '..###..'],
    medicine: ['..###..', '..#.#..', '###.###', '#.....#', '###.###', '..#.#..', '..###..'],
    stats: ['......#', '....#.#', '....#.#', '..#.#.#', '..#.#.#', '#.#.#.#', '#######'],
    call: ['#######', '#..#..#', '#..#..#', '#..#..#', '#.....#', '###.###', '..#....']
  };
  /* 3 by 5 digits for the stats screen */
  var DIGITS = { 0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['###', '..#', '###', '#..', '###'], 3: ['###', '..#', '.##', '..#', '###'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '###', '..#', '###'], 6: ['###', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '###'], d: ['..#', '..#', '###', '#.#', '###'], g: ['###', '#.#', '###', '..#', '##.'] };

  var ACTIONS = ['feed', 'play', 'clean', 'lights', 'medicine', 'stats'];
  var ACTION_LABEL = { feed: 'Feed', play: 'Play', clean: 'Clean', lights: 'Lights', medicine: 'Medicine', stats: 'Stats' };
  var FORMS = {
    zing: { name: 'Zing', how: 'very few care mistakes and lots of games' },
    bloop: { name: 'Bloop', how: 'steady, everyday care' },
    munch: { name: 'Munch', how: 'more snacks than meals' },
    bounce: { name: 'Bounce', how: 'winning lots of games' },
    drowse: { name: 'Drowse', how: 'lots of care mistakes' }
  };
  var FORM_KEYS = ['zing', 'bloop', 'munch', 'bounce', 'drowse'];
  var NAMES = ['Pip', 'Moxi', 'Zuzu', 'Bean', 'Kiki', 'Nori', 'Taro', 'Lumi', 'Dot', 'Mochi', 'Bix', 'Wren'];
  var SPEEDS = { relaxed: { label: 'Relaxed', day: 480 }, normal: { label: 'Normal', day: 240 }, speedy: { label: 'Speedy', day: 120 } };
  var SPEED_KEYS = ['relaxed', 'normal', 'speedy'];
  var SHELLS = {
    teal: { label: 'Teal', a: '#3fe0d0', b: '#0d7e75' },
    grape: { label: 'Grape', a: '#b18cff', b: '#5a2bc0' },
    bubblegum: { label: 'Bubblegum', a: '#ff7ab8', b: '#c0186a' },
    banana: { label: 'Banana', a: '#ffe27a', b: '#d19a00' }
  };
  var SHELL_KEYS = ['teal', 'grape', 'bubblegum', 'banana'];

  /* Life stages, in pet hours of age */
  var HATCH_AT = 1, CHILD_AT = 9, GROWN_AT = 33;
  var LCD_W = 40, LCD_H = 24;
  var TICK = 250;               /* ms between screen frames, like the toy's jerky animation */

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  GamesInTime.register({
    id: 'pocket-pet',
    frame: 'none',
    mount: function (root, api) {
      var h = api.h;
      var reduced = !!api.reducedMotion;
      var destroyed = false;
      var timers = [];

      /* ---------- styles ---------- */
      root.appendChild(h('style', null,
        '.game-pocket-pet { --pp-a: #3fe0d0; --pp-b: #0d7e75; color: var(--ink); }' +
        '.game-pocket-pet .pp-wrap { display: grid; grid-template-columns: minmax(0, 360px) minmax(0, 1fr); gap: clamp(16px, 3vw, 36px); align-items: start; justify-content: center; }' +
        '@media (max-width: 760px) { .game-pocket-pet .pp-wrap { grid-template-columns: minmax(0, 1fr); } }' +
        '.game-pocket-pet .pp-device { position: relative; width: min(100%, 340px); margin: 26px auto 0; aspect-ratio: 0.84; border-radius: 50% 50% 47% 47% / 58% 58% 42% 42%;' +
        '  background: radial-gradient(circle at 30% 22%, rgba(255,255,255,.55), rgba(255,255,255,0) 26%), radial-gradient(circle at 72% 80%, rgba(0,0,0,.18), rgba(0,0,0,0) 40%),' +
        '  radial-gradient(rgba(255,255,255,.35) 1.2px, transparent 1.6px) 0 0 / 14px 14px, linear-gradient(160deg, var(--pp-a), var(--pp-b));' +
        '  box-shadow: inset -14px -20px 34px rgba(0,0,0,.28), inset 12px 12px 22px rgba(255,255,255,.3), 0 22px 44px rgba(0,0,0,.45); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 11% 0 7%; }' +
        '.game-pocket-pet .pp-loop { position: absolute; top: -24px; left: 50%; width: 46px; height: 40px; margin-left: -23px; border: 7px solid var(--pp-b); border-bottom-color: transparent; border-radius: 50% 50% 0 0; box-shadow: inset 0 3px 0 rgba(255,255,255,.35); }' +
        '.game-pocket-pet .pp-brand { font-family: var(--font-poster); font-weight: 400; font-size: clamp(.82rem, .7rem + .4vw, 1rem); letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.92); text-shadow: 0 2px 0 rgba(0,0,0,.25); margin-bottom: 4%; }' +
        '.game-pocket-pet .pp-bezel { width: 72%; padding: 4.5%; border-radius: 18px; background: linear-gradient(160deg, #26323a, #11181c); box-shadow: inset 0 2px 0 rgba(255,255,255,.12), 0 3px 0 rgba(0,0,0,.25); }' +
        '.game-pocket-pet .pp-canvas { display: block; margin: 0 auto; max-width: 100%; border-radius: 8px; touch-action: manipulation; }' +
        '.game-pocket-pet .pp-hw { display: flex; gap: 9%; justify-content: center; align-items: flex-start; margin-top: 7%; width: 70%; }' +
        '.game-pocket-pet .pp-hw button { width: 48px; height: 48px; border-radius: 50%; border: 0; background: radial-gradient(circle at 35% 30%, #fff8d8, #ffd23f 45%, #b98d00); box-shadow: 0 4px 0 rgba(0,0,0,.3), inset 0 -3px 0 rgba(0,0,0,.15); color: #3a2a00; font-weight: 900; font-size: 1.05rem; touch-action: manipulation; }' +
        '.game-pocket-pet .pp-hw button:nth-child(2) { margin-top: 14px; }' +
        '.game-pocket-pet .pp-hw button:active { transform: translateY(3px); box-shadow: 0 1px 0 rgba(0,0,0,.3); }' +
        '.game-pocket-pet .pp-hw-label { display: flex; justify-content: center; gap: 4px; margin-top: 3%; font-size: .72rem; font-weight: 700; color: rgba(255,255,255,.85); text-shadow: 0 1px 0 rgba(0,0,0,.3); letter-spacing: .04em; }' +
        '.game-pocket-pet .pp-panel { display: grid; grid-template-columns: minmax(0, 1fr); gap: .9rem; min-width: 0; }' +
        '.game-pocket-pet .pp-card { min-width: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: .9rem 1rem; display: grid; gap: .6rem; }' +
        '.game-pocket-pet .pp-head { display: flex; flex-wrap: wrap; gap: .3rem .8rem; align-items: baseline; justify-content: space-between; }' +
        '.game-pocket-pet .pp-name { font-family: var(--font-head); font-weight: 800; font-size: 1.35rem; }' +
        '.game-pocket-pet .pp-clock { color: var(--ink-muted); font-weight: 700; font-variant-numeric: tabular-nums; }' +
        '.game-pocket-pet .pp-wants { font-weight: 700; color: var(--brand-text); min-height: 1.4em; }' +
        '.game-pocket-pet .pp-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem; }' +
        '.game-pocket-pet .pp-act { min-height: 56px; border-radius: 14px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); font-weight: 800; font-size: 1rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: .35rem .3rem; touch-action: manipulation; }' +
        '.game-pocket-pet .pp-act canvas { width: 24px; height: 24px; image-rendering: pixelated; }' +
        '.game-pocket-pet .pp-act:hover { border-color: var(--link); }' +
        '.game-pocket-pet .pp-act[disabled] { opacity: .45; cursor: not-allowed; }' +
        '.game-pocket-pet .pp-act.is-main { background: var(--gold); color: var(--on-era); border-color: var(--gold); }' +
        '.game-pocket-pet .pp-meters { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .45rem .9rem; margin: 0; padding: 0; list-style: none; }' +
        '.game-pocket-pet .pp-meters li { margin: 0; display: flex; align-items: center; justify-content: space-between; gap: .5rem; font-weight: 700; }' +
        '.game-pocket-pet .pp-hearts { letter-spacing: .08em; color: var(--rose); font-size: 1.15rem; white-space: nowrap; }' +
        '.game-pocket-pet .pp-hearts .off { color: var(--ink-faint); }' +
        '.game-pocket-pet .pp-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }' +
        '.game-pocket-pet .pp-shell { width: 40px; height: 40px; border-radius: 50%; border: 3px solid var(--line); padding: 0; }' +
        '.game-pocket-pet .pp-shell[aria-pressed="true"] { border-color: var(--ink); box-shadow: 0 0 0 3px var(--focus); }' +
        '.game-pocket-pet .pp-namefield { display: flex; gap: .5rem; align-items: center; font-weight: 700; }' +
        '.game-pocket-pet .pp-namefield input { min-height: 42px; width: 9.5rem; max-width: 100%; padding: .3rem .8rem; border-radius: 999px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); font-weight: 700; }' +
        '.game-pocket-pet .pp-forms { display: flex; flex-wrap: wrap; gap: .5rem; }' +
        '.game-pocket-pet .pp-form { display: grid; justify-items: center; gap: 2px; font-size: .78rem; font-weight: 700; color: var(--ink-muted); width: 62px; text-align: center; }' +
        '.game-pocket-pet .pp-form canvas { width: 48px; height: 48px; border-radius: 10px; background: #b9c7a1; }' +
        '.game-pocket-pet .pp-small { color: var(--ink-muted); font-size: .92rem; }' +
        '@media (max-width: 420px) { .game-pocket-pet .pp-act { font-size: .9rem; min-height: 54px; } .game-pocket-pet .pp-card { padding: .8rem .75rem; } .game-pocket-pet .seg button { padding-inline: .65rem; } }'));

      /* ---------- the device ---------- */
      var canvas = h('canvas', { class: 'pp-canvas', role: 'img', tabindex: '0', 'aria-label': 'The pet screen' });
      var btnA = h('button', { type: 'button', 'aria-label': 'A: choose', onclick: function () { press('A'); } }, 'A');
      var btnB = h('button', { type: 'button', 'aria-label': 'B: do it', onclick: function () { press('B'); } }, 'B');
      var btnC = h('button', { type: 'button', 'aria-label': 'C: back', onclick: function () { press('C'); } }, 'C');
      var device = h('div', { class: 'pp-device' },
        h('span', { class: 'pp-loop', 'aria-hidden': 'true' }),
        h('span', { class: 'pp-brand', 'aria-hidden': 'true' }, 'Pocket Pet'),
        h('div', { class: 'pp-bezel' }, canvas),
        h('div', { class: 'pp-hw', role: 'group', 'aria-label': 'Handheld buttons' }, btnA, btnB, btnC),
        h('div', { class: 'pp-hw-label', 'aria-hidden': 'true' }, 'choose · do it · back'));

      /* ---------- the care panel ---------- */
      var nameEl = h('span', { class: 'pp-name' }, '');
      var clockEl = h('span', { class: 'pp-clock' }, '');
      var wantsEl = h('p', { class: 'pp-wants' }, '');
      var actionsEl = h('div', { class: 'pp-actions', role: 'group', 'aria-label': 'Look after your pet' });
      var meterEls = {};
      var METERS = [['full', 'Full'], ['happy', 'Happy'], ['clean', 'Clean'], ['energy', 'Energy'], ['health', 'Health']];
      var meters = h('ul', { class: 'pp-meters', 'aria-label': 'How your pet is' }, METERS.map(function (m) {
        meterEls[m[0]] = h('span', { class: 'pp-hearts' });
        return h('li', null, h('span', null, m[1]), meterEls[m[0]]);
      }));
      var infoEl = h('p', { class: 'pp-small' }, '');
      var speedBtns = {};
      var speedSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'How fast pet time runs' }, SPEED_KEYS.map(function (k) {
        speedBtns[k] = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { setSpeed(k); } }, SPEEDS[k].label);
        return speedBtns[k];
      }));
      var shellBtns = {};
      var shellRow = h('div', { class: 'pp-row', role: 'group', 'aria-label': 'Shell colour' }, SHELL_KEYS.map(function (k) {
        shellBtns[k] = h('button', { type: 'button', class: 'pp-shell', 'aria-label': SHELLS[k].label + ' shell', 'aria-pressed': 'false', style: { background: 'linear-gradient(160deg,' + SHELLS[k].a + ',' + SHELLS[k].b + ')' }, onclick: function () { setShell(k); } });
        return shellBtns[k];
      }));
      var nameInput = h('input', { type: 'text', maxlength: '12', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Pet name' });
      var newEggBtn = h('button', { type: 'button', class: 'btn', onclick: function () { askNewEgg(); } }, 'New egg');
      var formsEl = h('div', { class: 'pp-forms' });
      var panel = h('div', { class: 'pp-panel' },
        h('div', { class: 'pp-card' }, h('div', { class: 'pp-head' }, nameEl, clockEl), wantsEl, actionsEl),
        h('div', { class: 'pp-card' }, h('p', { class: 'label' }, 'How it is'), meters, infoEl),
        h('div', { class: 'pp-card' }, h('p', { class: 'label' }, 'Grown-ups you have raised'), formsEl, h('p', { class: 'pp-small' }, 'Each pet grows into one of five grown-ups, depending on how you look after it.')),
        h('div', { class: 'pp-card' }, h('p', { class: 'label' }, 'Settings'),
          h('div', { class: 'pp-row' }, h('span', { class: 'pp-small' }, 'Pet time'), speedSeg),
          h('div', { class: 'pp-row' }, h('span', { class: 'pp-small' }, 'Shell'), shellRow),
          h('div', { class: 'pp-row' }, h('label', { class: 'pp-namefield' }, 'Name', nameInput), newEggBtn),
          h('p', { class: 'pp-small' }, 'Time only passes while this page is open. Keyboard: A chooses, B does it, C goes back.')));
      root.appendChild(h('div', { class: 'pp-wrap' }, device, panel));

      var ctx = canvas.getContext('2d');

      /* =====================================================================================
         The pet's state, saved with api.store
         ===================================================================================== */
      var pet = null;
      var collection = api.store.get('collection', []) || [];
      var settings = api.store.get('settings', null) || { speed: 'normal', shell: 'teal' };
      if (!SPEEDS[settings.speed]) settings.speed = 'normal';
      if (!SHELLS[settings.shell]) settings.shell = 'teal';
      function newPet(gen) {
        return {
          v: 1, name: NAMES[Math.floor(api.random() * NAMES.length)], gen: gen || 1,
          stage: 'egg', form: '', age: 0, clock: 8 * 60,
          full: 70, happy: 70, clean: 100, energy: 90, health: 100,
          sick: false, asleep: false, lights: true, messes: [], messDue: -1,
          mistakes: 0, meals: 0, snacks: 0, snacksToday: 0, gamesWon: 0, gamesPlayed: 0, weight: 5,
          problemSince: {}, savedAt: Date.now()
        };
      }
      function load() {
        var p = api.store.get('pet', null);
        if (p && p.v === 1 && p.stage) return p;
        return null;
      }
      function save() {
        if (!pet) return;
        pet.savedAt = Date.now();
        api.store.set('pet', pet);
      }

      /* ---------- what the pet is doing on screen ---------- */
      var mode = 'main';          /* main | feedmenu | game | stats */
      var sel = -1;               /* which icon is chosen with A */
      var feedSel = 0, statsPage = 0;
      var anim = null;            /* a short animation: {type, t0, dur, data} */
      var walkX = 12, walkDir = 1, frame = 0, game = null;
      var lastWant = '', attention = false, tickTimer = 0, saveTimer = 0, lastTick = 0;

      /* =====================================================================================
         The simulation: every tick, pet time moves on and the needs change.
         Rates are per pet hour. One pet hour is (day length / 24) real seconds.
         ===================================================================================== */
      function petHoursPerSecond() { return 24 / SPEEDS[settings.speed].day; }
      function isNight() { return pet.clock >= 21 * 60 || pet.clock < 7 * 60; }
      function step(realSec) {
        if (!pet || anim && anim.type === 'farewell') return;
        var speedUp = pet.asleep && !pet.lights ? 4 : 1;            /* nights pass quickly in the dark */
        var dh = realSec * petHoursPerSecond() * speedUp;
        pet.age += dh;
        var oldClock = pet.clock;
        pet.clock = (pet.clock + dh * 60) % 1440;
        if (pet.clock < oldClock) { pet.snacksToday = 0; }          /* a new day */

        if (pet.stage === 'egg') { if (pet.age >= HATCH_AT && !anim) hatch(); return; }

        /* bedtime at 9 at night, up at 7 in the morning; a nap in the day lasts until it is full of energy */
        if (!pet.asleep && isNight()) { pet.asleep = true; pet.napping = false; beep('sleep'); say(pet.name + ' is sleepy and has gone to bed. Turn the lights off.'); }
        else if (pet.asleep && pet.napping) { if (isNight()) pet.napping = false; else if (pet.energy >= 99) wake(); }
        else if (pet.asleep && !isNight()) wake();

        var awake = !pet.asleep;
        pet.full = clamp(pet.full - (awake ? 6 : 1.5) * dh, 0, 100);
        pet.happy = clamp(pet.happy - (awake ? 5 : 1) * dh, 0, 100);
        pet.clean = clamp(pet.clean - (2 + 8 * pet.messes.length) * dh, 0, 100);
        if (awake) pet.energy = clamp(pet.energy - 4.5 * dh, 0, 100);
        else pet.energy = clamp(pet.energy + (pet.lights ? 5 : 14) * dh, 0, 100);
        if (pet.asleep && pet.lights) pet.happy = clamp(pet.happy - 3 * dh, 0, 100);

        /* messes: a while after eating */
        if (pet.messDue >= 0 && pet.age >= pet.messDue) {
          pet.messDue = -1;
          if (pet.messes.length < 3) { pet.messes.push(pet.age); beep('mess'); }
        }

        /* health: falls when ill, starving or dirty; slowly recovers otherwise */
        var hurt = 0;
        if (pet.sick) hurt += 6;
        if (pet.full <= 0) hurt += 5;
        if (pet.clean < 20) hurt += 3;
        if (pet.happy <= 0) hurt += 2;
        if (hurt) pet.health = clamp(pet.health - hurt * dh, 0, 100);
        else pet.health = clamp(pet.health + 3 * dh, 0, 100);

        /* getting ill: a small chance each pet hour, bigger when things are dirty or there were too many snacks */
        if (!pet.sick) {
          var risk = 0.01;
          if (pet.clean < 30) risk += 0.12;
          for (var i = 0; i < pet.messes.length; i++) if (pet.age - pet.messes[i] > 2) { risk += 0.08; break; }
          if (pet.snacksToday > 4) risk += 0.1;
          if (pet.full < 15) risk += 0.06;
          if (api.random() < risk * dh) { pet.sick = true; beep('sick'); }
        }

        /* care mistakes: a problem left alone for 2 pet hours counts once */
        var problems = currentProblems();
        Object.keys(problems).forEach(function (k) {
          if (pet.problemSince[k] == null) pet.problemSince[k] = pet.age;
          else if (pet.problemSince[k] >= 0 && pet.age - pet.problemSince[k] > 2) { pet.mistakes++; pet.problemSince[k] = -1; }
        });
        Object.keys(pet.problemSince).forEach(function (k) { if (!problems[k]) delete pet.problemSince[k]; });

        /* growing up */
        if (pet.stage === 'baby' && pet.age >= CHILD_AT && !anim) grow('child');
        else if (pet.stage === 'child' && pet.age >= GROWN_AT && !anim && !pet.asleep) grow('grown');

        /* the gentle ending: health has run out, so it goes home */
        if (pet.health <= 0 && !anim) farewell();
      }
      /* Problems that need you now (the attention icon lights up) */
      function currentProblems() {
        var p = {};
        if (pet.stage === 'egg') return p;
        if (pet.sick) p.sick = 1;
        if (pet.asleep && pet.lights && isNight()) p.lights = 1;
        if (pet.full <= 0) p.hungry = 1;
        if (pet.happy <= 0) p.bored = 1;
        if (pet.messes.length >= 2) p.mess = 1;
        return p;
      }

      /* =====================================================================================
         What the pet wants, in words (the status line and the care card)
         ===================================================================================== */
      function wants() {
        var n = pet.name;
        if (anim && anim.type === 'farewell') return n + ' is waving goodbye.';
        if (pet.stage === 'egg') return 'The egg is wobbling. Something is about to hatch!';
        if (pet.sick) return n + ' feels ill. Give ' + n + ' some medicine.';
        if (pet.asleep && pet.lights) return n + ' is asleep. Turn the lights off.';
        if (pet.messes.length) return n + ' made a mess. Clean it up.';
        if (pet.asleep) return n + ' is fast asleep. Shh! Nights go quickly in the dark.';
        if (pet.full <= 25) return n + ' is hungry. Feed ' + n + ' a meal.';
        if (pet.happy <= 25) return n + ' is bored. Play a game together.';
        if (pet.energy <= 20) return n + ' is tired. Turn the lights off for a nap.';
        if (pet.health < 50) return n + ' is getting better. Keep ' + n + ' fed and clean.';
        if (pet.full <= 50) return n + ' could eat something soon.';
        if (pet.happy <= 50) return n + ' would love to play.';
        return n + ' is happy. ' + (pet.stage === 'grown' ? 'What a great ' + FORMS[pet.form].name + '!' : 'Look at it bounce!');
      }
      /* The status line says what the pet wants. After something happens ("Yum!") that message stays for a few
         seconds, then the line goes back to what the pet wants. */
      var holdUntil = 0, lastLabel = '';
      function updateWords(force) {
        var w = wants(), now = performance.now();
        if (force || (now >= holdUntil && mode === 'main' && !anim && w !== lastWant)) {
          lastWant = w;
          wantsEl.textContent = w;
          api.status(w);
        }
        var label = describe();
        if (label !== lastLabel) { lastLabel = label; canvas.setAttribute('aria-label', label); }
        var att = Object.keys(currentProblems()).length > 0;
        if (att && !attention) beep('call');
        attention = att;
      }
      function stageWord() { return pet.stage === 'egg' ? 'egg' : pet.stage === 'baby' ? 'baby' : pet.stage === 'child' ? 'child' : 'grown-up ' + FORMS[pet.form].name; }
      function describe() {
        if (pet.stage === 'egg') return 'The pet screen shows a speckled egg, wobbling.';
        var bits = [pet.name + ', a ' + stageWord() + ',', pet.asleep ? 'is asleep' : 'is walking about'];
        if (pet.messes.length) bits.push('next to ' + pet.messes.length + ' mess' + (pet.messes.length > 1 ? 'es' : ''));
        if (pet.sick) bits.push('and feels ill');
        return 'The pet screen. ' + bits.join(' ') + '.' + (pet.lights ? '' : ' The lights are off.');
      }
      function say(text, holdMs) { api.status(text); wantsEl.textContent = text; lastWant = text; holdUntil = performance.now() + (holdMs || 3500); }

      /* =====================================================================================
         Actions
         ===================================================================================== */
      function blocked() {
        if (anim) return true;
        if (pet.stage === 'egg') { say('Wait for the egg to hatch first.'); beep('no'); return true; }
        return false;
      }
      function act(name) {
        api.unlockSound();
        if (!pet || blocked()) return;
        if ((name === 'feed' || name === 'play') && pet.asleep) { say(pet.name + ' is asleep. Let it sleep' + (pet.lights ? ', and turn the lights off.' : '.')); beep('no'); return; }
        if (name === 'feed') { mode = 'feedmenu'; feedSel = 0; beep('ok'); say('Meal or snack? A meal fills ' + pet.name + ' up. A snack makes it happy, but too many are not healthy.'); }
        else if (name === 'play') startGame();
        else if (name === 'clean') doClean();
        else if (name === 'lights') doLights();
        else if (name === 'medicine') doMedicine();
        else if (name === 'stats') { mode = 'stats'; statsPage = 0; beep('ok'); say(statsWords()); }
        renderAll();
      }
      function feed(kind) {
        if (pet.asleep) { say(pet.name + ' is asleep. Let it sleep.'); beep('no'); mode = 'main'; renderAll(); return; }
        if (kind === 'meal' && pet.full >= 100) { startAnim('refuse', 1500); say(pet.name + ' is full and shakes its head.'); beep('no'); mode = 'main'; renderAll(); return; }
        mode = 'main';
        startAnim('eat', 1800, { food: kind });
        if (kind === 'meal') { pet.full = clamp(pet.full + 25, 0, 100); pet.weight += 1; pet.meals++; pet.messDue = pet.messDue >= 0 ? pet.messDue : pet.age + 1.5 + api.random() * 1.5; say(pet.name + ' munches a bowl of noodles. Yum!'); }
        else { pet.happy = clamp(pet.happy + 20, 0, 100); pet.full = clamp(pet.full + 8, 0, 100); pet.weight += 2; pet.snacks++; pet.snacksToday++; if (api.random() < 0.4 && pet.messDue < 0) pet.messDue = pet.age + 1 + api.random(); say(pet.name + ' loves the ice block!' + (pet.snacksToday > 4 ? ' That is a lot of snacks today, though.' : '')); }
        beep('eat'); api.sound('pop');
        save(); renderAll();
      }
      function doClean() {
        if (!pet.messes.length && pet.clean > 80) { say('Everything is already spotless.'); beep('no'); return; }
        startAnim('clean', 1600);
        pet.messes = []; pet.clean = 100;
        api.sound('whoosh'); beep('ok');
        say('Swish! All clean.');
        save();
      }
      function doLights() {
        pet.lights = !pet.lights;
        api.sound('click');
        if (!pet.lights) {
          if (!pet.asleep && pet.energy < 50) { pet.asleep = true; pet.napping = true; say(pet.name + ' curls up for a nap.'); }
          else if (!pet.asleep) { pet.lights = true; say(pet.name + ' is not sleepy yet, so the lights went back on.'); beep('no'); return; }
          else say('Lights off. Goodnight, ' + pet.name + '!');
        } else if (pet.asleep) say('Lights on. ' + pet.name + ' is still asleep. Turn them off so it can sleep well.');
        else say('Lights on.');
        save();
      }
      function doMedicine() {
        if (!pet.sick) { startAnim('refuse', 1500); say(pet.name + ' is not ill, so it pushes the medicine away.'); beep('no'); return; }
        startAnim('medicine', 1800);
        pet.sick = false; pet.happy = clamp(pet.happy - 5, 0, 100);
        say('Yuck, but it works. ' + pet.name + ' feels better already.');
        beep('heal'); api.sound('bell');
        save();
      }
      function wake() {
        pet.asleep = false; pet.napping = false; pet.lights = true;
        beep('wake');
        say('Good morning! ' + pet.name + ' is awake.');
      }

      /* ---------- the mini-game: which way will it look? ---------- */
      function startGame() {
        if (pet.asleep) { say(pet.name + ' is asleep. Play tomorrow.'); beep('no'); return; }
        if (pet.energy < 10) { say(pet.name + ' is too tired to play. Try a nap first.'); beep('no'); return; }
        game = { round: 0, wins: 0, guess: 0, look: 0, phase: 'ask' };
        mode = 'game';
        beep('ok');
        say('Left or right? Guess which way ' + pet.name + ' will look. Round 1 of 5.');
        renderAll();
      }
      function guess(dir) {
        if (!game || game.phase !== 'ask') return;
        game.guess = dir;
        game.look = api.random() < 0.5 ? -1 : 1;
        game.phase = 'show';
        var right = game.look === dir;
        if (right) game.wins++;
        game.round++;
        beep(right ? 'yes' : 'no');
        say('Round ' + game.round + ' of 5: ' + pet.name + ' looked ' + (game.look < 0 ? 'left' : 'right') + '. ' + (right ? 'You guessed it!' : 'Not this time.'));
        renderAll();
        later(function () {
          if (!game) return;
          if (game.round >= 5) endGame();
          else { game.phase = 'ask'; say('Round ' + (game.round + 1) + ' of 5. Left or right?'); renderAll(); }
        }, 1300);
      }
      function endGame() {
        var won = game.wins >= 3, w = game.wins;
        game = null; mode = 'main';
        pet.gamesPlayed++;
        pet.energy = clamp(pet.energy - 8, 0, 100);
        pet.weight = Math.max(3, pet.weight - 1);
        if (won) { pet.gamesWon++; pet.happy = clamp(pet.happy + 25, 0, 100); startAnim('happy', 1600); beep('win'); say('You won ' + w + ' of 5! ' + pet.name + ' is delighted.'); }
        else { pet.happy = clamp(pet.happy + 8, 0, 100); say(w + ' of 5 this time. ' + pet.name + ' still had fun playing with you.'); beep('ok'); }
        save(); renderAll();
      }
      function quitGame() { game = null; mode = 'main'; say('Game stopped.'); renderAll(); }

      /* ---------- hatching, growing up and going home ---------- */
      function hatch() {
        startAnim('hatch', 2200);
        pet.stage = 'baby'; pet.full = 60; pet.happy = 70;
        tune([523, 659, 784, 1047, 784, 1047]);
        say('It hatched! Say hello to ' + pet.name + '.');
        save();
      }
      function chooseForm() {
        /* The computer's rule for which grown-up it becomes */
        if (pet.mistakes >= 5) return 'drowse';
        if (pet.mistakes <= 1 && pet.gamesWon >= 3) return 'zing';
        if (pet.snacks > pet.meals) return 'munch';
        if (pet.gamesWon >= 6) return 'bounce';
        return 'bloop';
      }
      function grow(to) {
        startAnim('grow', 2600, { from: pet.stage === 'baby' ? 'baby' : 'child' });
        if (to === 'child') {
          pet.stage = 'child';
          api.celebrate(pet.name + ' is a child now!');
          say(pet.name + ' grew into a child! Keep looking after it and see what it becomes.');
        } else {
          pet.stage = 'grown'; pet.form = chooseForm();
          if (collection.indexOf(pet.form) < 0) { collection.push(pet.form); api.store.set('collection', collection); renderForms(); }
          api.celebrate(pet.name + ' grew up into a ' + FORMS[pet.form].name + '!');
          say(pet.name + ' grew up into a ' + FORMS[pet.form].name + '! That form comes from ' + FORMS[pet.form].how + '.');
        }
        save(); renderAll();
      }
      function farewell() {
        mode = 'main'; game = null;
        startAnim('farewell', 6000);
        api.sound('whoosh');
        say(pet.name + ' missed you, so it is flying home to its own planet, where its family will look after it.');
        later(function () {
          var gen = pet.gen + 1;
          pet = newPet(gen);
          lastWant = '';
          save();
          say('A new egg arrived from ' + 'the home planet! Look after this one, and it will grow up big and strong.');
          api.sound('bell');
          renderAll();
        }, 6000);
      }
      var confirmUntil = 0;
      function askNewEgg() {
        if (anim && anim.type === 'farewell') return;
        var now = performance.now();
        if (now > confirmUntil) {
          confirmUntil = now + 4000;
          newEggBtn.textContent = 'Sure? Tap again';
          say(pet.stage === 'egg' ? 'Tap New egg again to swap this egg for another.' : 'Tap New egg again and ' + pet.name + ' will go to visit its home planet, leaving you a new egg.');
          later(function () { if (performance.now() >= confirmUntil) newEggBtn.textContent = 'New egg'; }, 4100);
          return;
        }
        confirmUntil = 0; newEggBtn.textContent = 'New egg';
        if (pet.stage === 'egg') { pet = newPet(pet.gen); save(); say('A fresh egg. It will hatch soon.'); renderAll(); return; }
        mode = 'main'; game = null;
        startAnim('farewell', 6000);
        say(pet.name + ' waves goodbye and flies off to visit its home planet.');
        later(function () { pet = newPet(pet.gen + 1); lastWant = ''; save(); say('A new egg! It will hatch soon.'); renderAll(); }, 6000);
      }

      /* =====================================================================================
         The three handheld buttons
         ===================================================================================== */
      function press(b) {
        api.unlockSound();
        if (!pet) return;
        if (anim && anim.type !== 'happy') return;
        beep('key');
        if (mode === 'game') { if (b === 'A') guess(-1); else if (b === 'B') guess(1); else quitGame(); return; }
        if (mode === 'feedmenu') { if (b === 'A') feedSel = 1 - feedSel; else if (b === 'B') feed(feedSel ? 'snack' : 'meal'); else { mode = 'main'; say(wants()); } renderAll(); return; }
        if (mode === 'stats') { if (b === 'C') { mode = 'main'; say(wants()); } else { statsPage = (statsPage + 1) % 6; say(statsWords()); } renderAll(); return; }
        if (b === 'A') { sel = (sel + 1) % ACTIONS.length; say('Chosen: ' + ACTION_LABEL[ACTIONS[sel]] + '. Press B to do it.'); }
        else if (b === 'B') { if (sel < 0) { say('Press A to choose something to do first.'); } else act(ACTIONS[sel]); }
        else { sel = -1; say(wants()); }
        renderAll();
      }
      function statsWords() {
        var p = ['Age ' + Math.floor(Math.max(0, pet.age - HATCH_AT) / 24) + ' days, weight ' + pet.weight + ' grams.', 'Full: ' + heartsOf(pet.full) + ' of 4 hearts.', 'Happy: ' + heartsOf(pet.happy) + ' of 4 hearts.', 'Clean: ' + heartsOf(pet.clean) + ' of 4 hearts.', 'Energy: ' + heartsOf(pet.energy) + ' of 4 hearts.', 'Health: ' + heartsOf(pet.health) + ' of 4 hearts.'];
        return 'Stats, page ' + (statsPage + 1) + ' of 6. ' + p[statsPage] + ' Press A for the next page, C to go back.';
      }
      function heartsOf(v) { return v <= 0 ? 0 : Math.min(4, Math.ceil(v / 25)); }

      /* =====================================================================================
         Sounds: the toy beeps. api.tone plays one square-wave note.
         ===================================================================================== */
      function beep(kind) {
        var T = {
          key: [[1760, 0.035]], ok: [[1319, 0.05], [1760, 0.06]], no: [[330, 0.1], [262, 0.14]], eat: [[392, 0.06], [330, 0.06], [392, 0.06]],
          yes: [[1047, 0.06], [1319, 0.06], [1568, 0.1]], win: [[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.18]], heal: [[880, 0.06], [1175, 0.1]],
          call: [[1760, 0.07], [0, 0.06], [1760, 0.07], [0, 0.06], [1760, 0.07]], sick: [[523, 0.1], [440, 0.1], [349, 0.16]], mess: [[262, 0.05], [196, 0.08]],
          sleep: [[784, 0.12], [659, 0.12], [523, 0.2]], wake: [[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.14]]
        }[kind];
        if (T) tune(T);
      }
      function tune(notes) {
        var t = 0;
        notes.forEach(function (n) {
          var f = typeof n === 'number' ? n : n[0], d = typeof n === 'number' ? 0.11 : n[1];
          if (f) later(function () { api.tone(f, d, 'square', 0.035); }, t * 1000);
          t += d + 0.015;
        });
      }

      /* =====================================================================================
         Drawing the dot screen. A 40 by 24 grid of dots, with icons printed above and below.
         ===================================================================================== */
      var buf = new Uint8Array(LCD_W * LCD_H);
      function clear() { buf.fill(0); }
      function dot(x, y, v) { if (x >= 0 && x < LCD_W && y >= 0 && y < LCD_H) buf[y * LCD_W + x] = v == null ? 1 : v; }
      /* draw a picture; flip mirrors it; look moves the eyes one dot left (-1) or right (1); closed hides the eyes */
      function sprite(rows, x, y, flip, look, closed) {
        var w = rows[0].length;
        for (var r = 0; r < rows.length; r++) {
          for (var c = 0; c < w; c++) {
            var ch = rows[r].charAt(flip ? w - 1 - c : c);
            if (ch === '#') dot(x + c, y + r);
            else if (ch === 'o') {
              if (closed) { dot(x + c, y + r + 1); continue; }
              dot(x + c + (look || 0), y + r);
            }
          }
        }
      }
      function petSprite() {
        if (pet.stage === 'egg') return SPR.egg;
        if (pet.stage === 'baby') return SPR.baby;
        if (pet.stage === 'child') return SPR.child;
        return SPR[pet.form] || SPR.bloop;
      }
      function digits(str, x, y) {
        for (var i = 0; i < str.length; i++) { var g = DIGITS[str.charAt(i)]; if (g) sprite(g, x, y); x += 4; }
      }
      /* only the edge of a picture: a dot whose neighbour above, below, left or right is empty */
      function outline(rows, x, y) {
        function on(r, c) { return r >= 0 && r < rows.length && c >= 0 && c < rows[r].length && rows[r].charAt(c) === '#'; }
        for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].length; c++) if (on(r, c) && (!on(r - 1, c) || !on(r + 1, c) || !on(r, c - 1) || !on(r, c + 1))) dot(x + c, y + r);
      }
      function hearts(v, x, y) {
        var n = heartsOf(v);
        for (var i = 0; i < 4; i++) { if (i < n) sprite(SPR.heart, x + i * 8, y); else outline(SPR.heart, x + i * 8, y); }
      }
      function startAnim(type, dur, data) { anim = { type: type, t0: performance.now(), dur: reduced && type !== 'farewell' ? Math.min(dur, 1200) : dur, data: data || {} }; }

      function composeScreen(now) {
        clear();
        var t = anim ? now - anim.t0 : 0, f = Math.floor(t / TICK), spr = petSprite(), w = spr[0].length, hgt = spr.length;
        var baseY = LCD_H - hgt - 1;

        if (anim && anim.type === 'farewell') {
          /* the pet waves, climbs into its rocket and flies home */
          var fx = Math.floor((LCD_W - w) / 2);
          if (t < 1800) { sprite(spr, fx, baseY - (f % 2), f % 2 === 1); if (f % 2) sprite(SPR.heart, fx + w + 1, baseY - 4); }
          else { var ry = Math.round(LCD_H - 11 - Math.max(0, (t - 2600) / 3200) * 30); sprite(SPR.rocket, Math.floor((LCD_W - 7) / 2), ry); if (t > 2400) { dot(19 + (f % 2), ry + 10); dot(20, ry + 11); dot(21 - (f % 2), ry + 12); } }
          return;
        }
        if (mode === 'stats' && !anim) { composeStats(); return; }
        if (mode === 'feedmenu' && !anim) {
          sprite(SPR.meal, 7, 8); sprite(SPR.snack, 27, 7);
          sprite(SPR.arrowUp, feedSel ? 27 : 8, 18);
          return;
        }
        if (mode === 'game' && game) {
          var gx = Math.floor((LCD_W - w) / 2), gy = baseY;
          if (game.phase === 'ask') { sprite(spr, gx, gy - (frame % 2), false, 0); sprite(SPR.left, 2, 10); sprite(SPR.right, LCD_W - 7, 10); sprite(SPR.question, gx + w + 1, 2); }
          else {
            sprite(spr, gx, gy, game.look > 0, game.look);
            sprite(game.look < 0 ? SPR.left : SPR.right, game.look < 0 ? 2 : LCD_W - 7, 10);
            if (game.look === game.guess) sprite(SPR.heart, gx + w + 1, 1); else sprite(SPR.cross, gx + w + 1, 2);
          }
          for (var r = 0; r < 5; r++) { dot(1 + r * 2, 0); if (r < game.round) dot(1 + r * 2, 1); }
          return;
        }
        if (anim && anim.type === 'hatch') {
          /* the egg shakes, its top lifts off, and the baby pops out */
          var ex = Math.floor((LCD_W - 12) / 2), ey = LCD_H - 16;
          if (t < 900) sprite(SPR.egg, ex + (reduced ? 0 : f % 2 ? 1 : -1), ey);
          else if (t < 1500) { sprite(SPR.egg.slice(0, 8), ex, ey - 4); sprite(SPR.egg.slice(8), ex, ey + 8); sprite(SPR.baby.slice(0, 5), ex + 1, ey + 3); }
          else { sprite(SPR.baby, Math.floor((LCD_W - 10) / 2), LCD_H - 10 - (f % 2)); sprite(SPR.sparkle, ex - 6, 4); sprite(SPR.sparkle, ex + 14, 6); }
          return;
        }
        if (anim && anim.type === 'grow') {
          var oldSpr = anim.data.from === 'baby' ? SPR.baby : SPR.child, ox = Math.floor((LCD_W - (t < 1300 ? oldSpr[0].length : w)) / 2);
          if (t < 1300) sprite(oldSpr, ox, LCD_H - oldSpr.length - 1);
          else sprite(spr, ox, baseY);
          if (!reduced || t > 1300) { sprite(SPR.sparkle, 3 + (f % 3) * 2, 3); sprite(SPR.sparkle, LCD_W - 9 - (f % 2) * 2, 5); sprite(SPR.sparkle, 6, 14); sprite(SPR.sparkle, LCD_W - 10, 15); }
          return;
        }

        /* the everyday screen: the pet walks about, messes sit on the right */
        var x = Math.round(walkX), y = baseY;
        if (pet.stage === 'egg') { var wob = reduced ? 0 : (frame % 4 === 1 ? 1 : frame % 4 === 3 ? -1 : 0); sprite(SPR.egg, Math.floor((LCD_W - 12) / 2) + wob, LCD_H - 16); return; }
        if (anim && (anim.type === 'eat' || anim.type === 'medicine' || anim.type === 'refuse' || anim.type === 'happy')) x = Math.floor((LCD_W - w) / 2) - (anim.type === 'happy' ? 0 : 5);
        var closed = pet.asleep, flip = walkDir < 0, look = 0, bob = 0;
        if (anim && anim.type === 'refuse') flip = f % 2 === 1;
        if (anim && anim.type === 'happy') { bob = f % 2 ? 2 : 0; sprite(SPR.heart, x + w + 1, 2 + (f % 2)); sprite(SPR.note, x - 7, 4 - (f % 2)); }
        if (!pet.asleep && !anim && frame % 2) bob = 1;
        sprite(spr, x, y - bob, flip, look, closed);
        if (anim && anim.type === 'eat') {
          var food = anim.data.food === 'meal' ? SPR.meal : SPR.snack, bites = Math.min(3, f >> 1), fw = food[0].length;
          var foodX = x + w + 2;
          for (var fr = 0; fr < food.length; fr++) for (var fc = 0; fc < fw - bites * 2; fc++) if (food[fr].charAt(fc + bites * 2) === '#') dot(foodX + fc, LCD_H - food.length - 1 + fr);
        }
        if (anim && anim.type === 'medicine') {
          if (t < 900) sprite(SPR.pill, x + w + 2 - Math.floor(t / 150), LCD_H - 6);
          else { sprite(SPR.sparkle, x - 6, 4); sprite(SPR.sparkle, x + w + 1, 3); }
        }
        if (pet.sick && !(anim && anim.type === 'medicine')) sprite(SPR.germ, Math.min(LCD_W - 8, x + w + 1), 2);
        if (pet.asleep) { var zx = Math.min(LCD_W - 10, x + w), zz = frame % 4; sprite(SPR.z, zx, 6 - (zz >> 1)); if (zz > 1) sprite(SPR.z, zx + 5, 1); }
        /* messes, each with stink lines that wiggle */
        for (var m = 0; m < pet.messes.length; m++) {
          var mx = LCD_W - 8 - m * 8;
          if (anim && anim.type === 'clean') continue;
          sprite(SPR.mess, mx, LCD_H - 7);
          if ((frame + m) % 2) { dot(mx + 1, LCD_H - 10); dot(mx + 2, LCD_H - 11); dot(mx + 5, LCD_H - 10); } else { dot(mx + 2, LCD_H - 10); dot(mx + 1, LCD_H - 11); dot(mx + 4, LCD_H - 11); }
        }
        if (anim && anim.type === 'clean') {
          /* a wave of bubbles sweeps across */
          var sx = LCD_W - Math.floor(t / anim.dur * (LCD_W + 4));
          for (var sy = 0; sy < LCD_H; sy++) { dot(sx, sy); if (sy % 3 === 0) dot(sx + 2, sy + (f % 2)); }
        }
      }
      function composeStats() {
        var p = statsPage;
        /* six little dots at the top show which page this is */
        for (var i = 0; i < 6; i++) { dot(22 + i * 3, 1); if (i === p) { dot(22 + i * 3, 2); dot(22 + i * 3, 3); } }
        if (p === 0) {
          /* age in days (the d) and weight in grams (the g) */
          digits(String(Math.floor(Math.max(0, pet.age - HATCH_AT) / 24)) + 'd', 3, 6);
          digits(String(pet.weight) + 'g', 3, 15);
          var ps = petSprite();
          sprite(ps, LCD_W - ps[0].length - 1, LCD_H - ps.length - 1);
          return;
        }
        var key = ['', 'full', 'happy', 'clean', 'energy', 'health'][p];
        var icon = { full: SPR.meal, happy: SPR.note, clean: SPR.mess, energy: SPR.moon, health: SPR.pill }[key];
        sprite(icon, 3, 3);
        hearts(pet[key], 4, 14);
      }

      /* ---------- painting the dots onto the canvas ---------- */
      var px = 6, cssW = 240, cssH = 216, dpr = 1, iconBand = 0;
      var LCD_BG = '#b9c7a1', LCD_ON = '#1d2a1c', LCD_OFF = 'rgba(29,42,28,.07)', NIGHT_BG = '#4a5643', NIGHT_ON = 'rgba(12,18,12,.85)';
      function resize() {
        var w = Math.round(canvas.parentNode.clientWidth - 0) || 240;
        var inner = w - Math.round(w * 0.09);
        px = Math.max(3, Math.floor(inner / LCD_W));
        iconBand = Math.round(px * 6.2);
        cssW = LCD_W * px + 12; cssH = LCD_H * px + iconBand * 2 + 4;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
        canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
        paint(performance.now());
      }
      function paint(now) {
        if (!pet) return;
        composeScreen(now);
        var c = ctx, dark = !pet.lights && pet.stage !== 'egg';
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.fillStyle = dark ? NIGHT_BG : LCD_BG; c.fillRect(0, 0, cssW, cssH);
        /* icons, printed around the dot area: the chosen one is dark, the others faint */
        var iconPx = Math.max(2, Math.round(px * 0.62)), names = ['feed', 'play', 'clean', 'lights', 'medicine', 'stats', '', 'call'];
        for (var i = 0; i < 8; i++) {
          var nm = names[i]; if (!nm) continue;
          var col = i % 4, top = i < 4;
          var ix = Math.round(6 + (col + 0.5) * (LCD_W * px / 4) - iconPx * 3.5), iy = top ? Math.round((iconBand - iconPx * 7) / 2) : cssH - iconBand + Math.round((iconBand - iconPx * 7) / 2) - 2;
          var on = nm === 'call' ? attention && (reduced || frame % 4 < 3) : ACTIONS.indexOf(nm) === sel || (mode === 'feedmenu' && nm === 'feed') || (mode === 'game' && nm === 'play') || (mode === 'stats' && nm === 'stats');
          c.fillStyle = on ? LCD_ON : 'rgba(29,42,28,.2)';
          var rows = ICONS[nm];
          for (var r = 0; r < 7; r++) for (var cc = 0; cc < 7; cc++) if (rows[r].charAt(cc) === '#') c.fillRect(ix + cc * iconPx, iy + r * iconPx, iconPx - 0.4, iconPx - 0.4);
        }
        /* the dot matrix: faint "off" dots, dark "on" dots */
        var ox = 6, oy = iconBand + 2, s = px - Math.max(0.6, px * 0.12);
        c.fillStyle = dark ? 'rgba(0,0,0,.08)' : LCD_OFF;
        for (var y = 0; y < LCD_H; y++) for (var x = 0; x < LCD_W; x++) if (!buf[y * LCD_W + x]) c.fillRect(ox + x * px, oy + y * px, s, s);
        c.fillStyle = dark ? NIGHT_ON : LCD_ON;
        for (var y2 = 0; y2 < LCD_H; y2++) for (var x2 = 0; x2 < LCD_W; x2++) if (buf[y2 * LCD_W + x2]) c.fillRect(ox + x2 * px, oy + y2 * px, s, s);
        if (dark) { /* a little moon in the corner when the lights are off */
          c.fillStyle = 'rgba(255,240,180,.55)';
          var mr = SPR.moon; for (var a = 0; a < mr.length; a++) for (var b = 0; b < mr[a].length; b++) if (mr[a].charAt(b) === '#') c.fillRect(ox + (2 + b) * px, oy + (1 + a) * px, s, s);
        }
        /* a soft shine across the glass */
        var gl = c.createLinearGradient(0, 0, cssW, cssH);
        gl.addColorStop(0, 'rgba(255,255,255,.18)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)');
        c.fillStyle = gl; c.fillRect(0, 0, cssW, cssH);
      }

      /* ---------- the panel ---------- */
      var actBtns = {};
      function iconCanvas(name) {
        var cv = document.createElement('canvas'); cv.width = 16; cv.height = 16; cv.setAttribute('aria-hidden', 'true');
        var g = cv.getContext('2d'), rows = ICONS[name] || SPR[name];
        var ox = Math.floor((8 - rows[0].length) / 2) * 2, oy = Math.floor((8 - rows.length) / 2) * 2;
        g.fillStyle = getComputedStyle(root).getPropertyValue('--ink').trim() || '#fff';
        for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].length; c++) if (rows[r].charAt(c) === '#') g.fillRect(ox + c * 2, oy + r * 2, 2, 2);
        return cv;
      }
      function renderActions() {
        actionsEl.replaceChildren();
        actBtns = {};
        var list;
        if (mode === 'feedmenu') list = [['meal', 'Meal', function () { feed('meal'); }, 'meal'], ['snack', 'Snack', function () { feed('snack'); }, 'snack'], ['back', 'Back', function () { mode = 'main'; say(wants()); renderAll(); }, '']];
        else if (mode === 'game') list = [['left', '← Left', function () { guess(-1); }, ''], ['right', 'Right →', function () { guess(1); }, ''], ['stop', 'Stop', function () { quitGame(); }, '']];
        else if (mode === 'stats') list = [['next', 'Next page', function () { press('A'); }, ''], ['back', 'Back', function () { press('C'); }, '']];
        else list = ACTIONS.map(function (a) { return [a, ACTION_LABEL[a] + (a === 'lights' && pet && !pet.lights ? ' on' : a === 'lights' ? ' off' : ''), function () { sel = ACTIONS.indexOf(a); act(a); }, a]; });
        list.forEach(function (it) {
          var b = h('button', { type: 'button', class: 'pp-act' + (mode !== 'main' && it[0] !== 'back' && it[0] !== 'stop' ? ' is-main' : ''), onclick: function () { api.unlockSound(); beep('key'); it[2](); } }, it[3] ? iconCanvas(it[3]) : null, it[1]);
          if (pet && (pet.stage === 'egg' || anim && anim.type === 'farewell')) b.disabled = true;
          if (mode === 'game' && game && game.phase !== 'ask' && it[0] !== 'stop') b.disabled = true;
          actBtns[it[0]] = b;
          actionsEl.appendChild(b);
        });
      }
      var lastActionsKey = '';
      function renderPanel() {
        var key = mode + '|' + (game ? game.phase : '') + '|' + pet.stage + '|' + pet.lights + '|' + (anim && anim.type === 'farewell');
        if (key !== lastActionsKey) { lastActionsKey = key; renderActions(); }
        nameEl.textContent = pet.stage === 'egg' ? 'An egg' : pet.name + ' · ' + stageWord();
        var hh = Math.floor(pet.clock / 60), mm = Math.floor(pet.clock % 60);
        clockEl.textContent = (isNight() ? '☾ ' : '☀ ') + 'Day ' + (Math.floor(Math.max(0, pet.age - HATCH_AT) / 24) + 1) + ' · ' + pad2(hh) + ':' + pad2(mm);
        METERS.forEach(function (m) {
          var n = heartsOf(pet[m[0]]), el = meterEls[m[0]];
          var txt = n + ' of 4';
          if (el.getAttribute('aria-label') !== txt) {
            el.setAttribute('aria-label', txt);
            el.replaceChildren(h('span', { 'aria-hidden': 'true' }, '♥♥♥♥'.slice(0, n)), h('span', { class: 'off', 'aria-hidden': 'true' }, '♡♡♡♡'.slice(0, 4 - n)));
          }
        });
        var info = (pet.stage === 'egg' ? 'Hatching soon.' : 'Weight ' + pet.weight + ' g · meals ' + pet.meals + ' · snacks ' + pet.snacks + ' · games won ' + pet.gamesWon + ' · care mistakes ' + pet.mistakes) + (pet.gen > 1 ? ' · egg number ' + pet.gen : '');
        if (infoEl.textContent !== info) infoEl.textContent = info;
        if (document.activeElement !== nameInput && nameInput.value !== pet.name) nameInput.value = pet.name;
        syncData();
      }
      function renderForms() {
        formsEl.replaceChildren();
        FORM_KEYS.forEach(function (k) {
          var have = collection.indexOf(k) >= 0;
          var cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; cv.setAttribute('aria-hidden', 'true');
          var g = cv.getContext('2d'), rows = SPR[k], s = 5, ox = Math.floor((96 - rows[0].length * s) / 2), oy = Math.floor((96 - rows.length * s) / 2);
          g.fillStyle = have ? '#1d2a1c' : 'rgba(29,42,28,.22)';
          for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].length; c++) { var ch = rows[r].charAt(c); if (ch === '#' || ch === 'o' && have) g.fillRect(ox + c * s, oy + r * s, s - 0.6, s - 0.6); }
          formsEl.appendChild(h('div', { class: 'pp-form' }, cv, h('span', null, have ? FORMS[k].name : '?'), h('span', { class: 'visually-hidden' }, have ? ' raised' : ' not raised yet')));
        });
      }
      function renderAll() { paint(performance.now()); renderPanel(); }
      function syncData() {
        var d = canvas.dataset;
        d.stage = pet.stage; d.form = pet.form; d.mode = mode; d.asleep = String(pet.asleep); d.lights = String(pet.lights); d.sick = String(pet.sick);
        d.messes = String(pet.messes.length); d.full = String(Math.round(pet.full)); d.happy = String(Math.round(pet.happy)); d.clean = String(Math.round(pet.clean));
        d.energy = String(Math.round(pet.energy)); d.health = String(Math.round(pet.health)); d.age = pet.age.toFixed(2); d.gen = String(pet.gen); d.anim = anim ? anim.type : '';
      }

      /* ---------- settings ---------- */
      function setSpeed(k, quiet) {
        settings.speed = k; api.store.set('settings', settings);
        SPEED_KEYS.forEach(function (x) { speedBtns[x].setAttribute('aria-pressed', String(x === k)); });
        if (quiet) return;
        api.sound('click');
        say('Pet time: ' + SPEEDS[k].label + '. One pet day takes about ' + Math.round(SPEEDS[k].day / 60) + ' minutes.');
      }
      function setShell(k, quiet) {
        settings.shell = k; api.store.set('settings', settings);
        root.style.setProperty('--pp-a', SHELLS[k].a); root.style.setProperty('--pp-b', SHELLS[k].b);
        SHELL_KEYS.forEach(function (x) { shellBtns[x].setAttribute('aria-pressed', String(x === k)); });
        if (!quiet) api.sound('click');
      }
      nameInput.addEventListener('change', function () {
        var v = nameInput.value.replace(/[^A-Za-z0-9 '\-]/g, '').trim().slice(0, 12);
        if (!v) { nameInput.value = pet.name; return; }
        pet.name = v; save(); lastWant = ''; updateWords(true); renderPanel();
        api.sound('pop');
      });

      /* =====================================================================================
         The clock: a tick four times a second moves pet time on and redraws the screen
         ===================================================================================== */
      function tick() {
        if (destroyed || document.hidden) return;
        var now = performance.now();
        var dt = Math.min(1, (now - lastTick) / 1000);
        lastTick = now;
        frame++;
        if (anim && now - anim.t0 >= anim.dur) { var done = anim.type; anim = null; if (done !== 'farewell') say(wants()); lastActionsKey = ''; }
        if (mode !== 'game' && mode !== 'stats' && mode !== 'feedmenu') step(dt);
        else step(dt * 0.25);                 /* time crawls while you are busy in a menu or a game */
        if (!pet) return;
        /* walking about, two dots a second, turning at the edges or now and then */
        if (!pet.asleep && !anim && pet.stage !== 'egg' && frame % 2 === 0) {
          var w = petSprite()[0].length, maxX = LCD_W - w - 1 - pet.messes.length * 8;
          walkX += walkDir * (pet.happy < 25 ? 0.5 : 1);
          if (walkX <= 1 || walkX >= maxX || api.random() < 0.08) walkDir = walkX <= 1 ? 1 : walkX >= maxX ? -1 : -walkDir;
          walkX = clamp(walkX, 1, Math.max(1, maxX));
        }
        updateWords(false);
        paint(now);
        renderPanel();
      }
      function onVisibility() {
        if (document.hidden) save();
        else lastTick = performance.now();
      }
      function onKey(e) {
        if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
        var tgt = e.target;
        if (tgt && tgt.closest && tgt.closest('input, select, textarea')) return;
        if (tgt && tgt !== document.body && !root.contains(tgt)) return;
        var k = e.key;
        if (mode === 'game' && (k === 'ArrowLeft' || k === 'ArrowRight')) { e.preventDefault(); press(k === 'ArrowLeft' ? 'A' : 'B'); return; }
        if (k === 'a' || k === 'A') { e.preventDefault(); press('A'); }
        else if (k === 'b' || k === 'B') { e.preventDefault(); press('B'); }
        else if (k === 'c' || k === 'C' || (k === 'Escape' && mode !== 'main')) { e.preventDefault(); press('C'); }
      }
      function later(fn, ms) { var id = setTimeout(function () { timers.splice(timers.indexOf(id), 1); if (!destroyed) fn(); }, ms); timers.push(id); return id; }

      /* ---------- start ---------- */
      var welcome = '';
      pet = load();
      if (pet) {
        var away = Date.now() - (pet.savedAt || Date.now());
        if (away > 60000) welcome = 'Welcome back! ' + (pet.stage === 'egg' ? 'Your egg' : pet.name) + ' waited for you. Time stands still while this page is closed.';
        if (!pet.problemSince) pet.problemSince = {};
      } else pet = newPet(1);
      setSpeed(settings.speed, true); setShell(settings.shell, true);
      renderForms();
      document.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onVisibility);
      var lastW = 0;
      var ro = new ResizeObserver(function () { var w = canvas.parentNode.clientWidth; if (w && w !== lastW) { lastW = w; resize(); } });
      ro.observe(device);
      lastTick = performance.now();
      tickTimer = setInterval(tick, TICK);
      saveTimer = setInterval(save, 5000);
      resize();
      lastWant = '';
      updateWords(true);
      renderAll();
      if (welcome) say(welcome, 6000);
      save();

      return {
        destroy: function () {
          destroyed = true;
          save();
          clearInterval(tickTimer); clearInterval(saveTimer);
          timers.forEach(clearTimeout); timers = [];
          ro.disconnect();
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('visibilitychange', onVisibility);
        }
      };
    }
  });
})();
