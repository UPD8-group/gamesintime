/* Dance Mat for Games in Time.

   Arrows scroll up the screen to a row of targets at the top. Step on the matching arrow (a key, or a big panel on
   a touch screen) at the moment it reaches its target, in time with the music. The 1998 arcade mechanic: judgements
   (Perfect, Great, Good, Miss), a combo, and a dance gauge that must still have something in it when the song ends.

   Everything you hear is made here, note by note, with the Web Audio API: drums from noise and sine waves, bass,
   chords and tunes from oscillators. The three songs are our own, written in this file as patterns of 16 steps per
   bar (a step is a sixteenth note).

   Timing: the music runs on the audio clock (AudioContext.currentTime), which never drifts away from the sound.
   When you press a key, the browser stamps the event with the time it happened. getOutputTimestamp() tells us which
   moment of the music was coming out of the speakers at that time, so a step is judged against what you actually
   heard, not against when the computer got round to reading the key. An adjustable "audio delay" covers wireless
   headphones, which play the sound a little later than the browser expects.

   Step charts: made from each song's own beats and tune (see makeChart), with a seeded random number so the same
   song and level always gives the same chart. The feet take turns, so Beginner never asks you to cross your legs.

   The canvas has a read-only test hook (canvas.gitTest) that reports the chart and the clock, so the automated test
   can step perfectly in time. */
(function () {
  'use strict';

  /* =====================================================================================
     Music helpers
     ===================================================================================== */
  var NAMES = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  /* 'A4' -> 69 (the MIDI note number). Middle C is C4 = 60. */
  function N(name) {
    var m = /^([A-G][#b]?)(-?\d)$/.exec(name);
    return NAMES[m[1]] + (Number(m[2]) + 1) * 12;
  }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  /* Chord shapes: how many semitones above the root each note is. */
  var SHAPES = { maj: [0, 4, 7], min: [0, 3, 7], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dom9: [0, 4, 7, 10, 14] };
  function chord(rootName, shape) { return { root: N(rootName), shape: SHAPES[shape] }; }
  /* Spread a chord's notes into a comfortable range (between low and low + 12), like a keyboard player's hand. */
  function voicing(ch, low) {
    var out = [];
    for (var i = 0; i < ch.shape.length; i++) {
      var m = ch.root + ch.shape[i];
      while (m < low) m += 12;
      while (m >= low + 12) m -= 12;
      if (out.indexOf(m) < 0) out.push(m);
    }
    return out.sort(function (a, b) { return a - b; });
  }
  /* A drum line written as 16 characters: x = hit, X = loud hit, g = soft "ghost" hit, . = rest. */
  function hits(pattern) {
    var out = [];
    for (var i = 0; i < pattern.length; i++) {
      var c = pattern.charAt(i);
      if (c === 'x') out.push([i, 1]); else if (c === 'X') out.push([i, 1.25]); else if (c === 'g') out.push([i, 0.35]);
    }
    return out;
  }
  /* A tune written as [step, note, length in steps] */
  function tune(list) { return list.map(function (n) { return { s: n[0], m: N(n[1]), len: n[2] }; }); }

  /* =====================================================================================
     The songs. Each one lists its sections in order. A section says how many bars it lasts, which chords
     it uses (one per bar, repeating), which parts play, and an "energy" from 0 to 3 that the step-chart maker
     uses: quiet parts get fewer arrows.
     ===================================================================================== */
  var SONGS = [
    {
      id: 'laser-lemonade', title: 'Laser Lemonade', style: '90s eurodance', bpm: 138, swing: 0, sound: 'euro',
      blurb: 'Four-on-the-floor kick drum, a bouncing bass and big shiny chords.',
      chords: {
        main: [chord('A2', 'min'), chord('F2', 'maj'), chord('C3', 'maj'), chord('G2', 'maj')]
      },
      drums: {
        intro: { kick: 'x...x...x...x...', ohat: '..x...x...x...x.' },
        verse: { kick: 'x...x...x...x...', clap: '....x.......x...', ohat: '..x...x...x...x.', hat: 'x.x.x.x.x.x.x.x.' },
        chorus: { kick: 'x...x...x...x...', clap: '....x.......x...', ohat: '..x...x...x...x.', hat: 'xxxxxxxxxxxxxxxx' },
        roll: { snare: 'x...x...x.x.xxxx' },
        outro: { kick: 'x...x...x...x...', ohat: '..x...x...x...x.' }
      },
      bass: { pump: [[2, 0, 2], [6, 12, 2], [10, 0, 2], [14, 12, 2]], drive: [[0, 0, 1], [2, 0, 2], [6, 12, 2], [8, 0, 1], [10, 0, 2], [14, 12, 2]] },
      melodies: {
        chorus: [
          tune([[0, 'E5', 3], [3, 'E5', 3], [6, 'D5', 2], [8, 'C5', 3], [11, 'D5', 2], [13, 'E5', 3]]),
          tune([[0, 'C5', 3], [3, 'C5', 3], [6, 'A4', 4], [10, 'C5', 2], [12, 'A4', 4]]),
          tune([[0, 'G4', 3], [3, 'C5', 3], [6, 'E5', 4], [10, 'D5', 2], [12, 'C5', 4]]),
          tune([[0, 'B4', 3], [3, 'D5', 3], [6, 'G5', 6], [12, 'F5', 2], [14, 'E5', 2]]),
          tune([[0, 'E5', 3], [3, 'E5', 3], [6, 'D5', 2], [8, 'C5', 3], [11, 'D5', 2], [13, 'E5', 3]]),
          tune([[0, 'C5', 3], [3, 'C5', 3], [6, 'A4', 4], [10, 'C5', 2], [12, 'F5', 4]]),
          tune([[0, 'E5', 3], [3, 'G5', 3], [6, 'E5', 4], [10, 'D5', 2], [12, 'C5', 4]]),
          tune([[0, 'B4', 3], [3, 'C5', 3], [6, 'D5', 4], [10, 'B4', 2], [12, 'A4', 4]])
        ]
      },
      sections: [
        { name: 'Intro', bars: 4, energy: 1, chords: 'main', drums: 'intro', pad: true, bass: 'pump' },
        { name: 'Verse', bars: 8, energy: 2, chords: 'main', drums: 'verse', pad: true, bass: 'pump', arp: true },
        { name: 'Chorus', bars: 8, energy: 3, chords: 'main', drums: 'chorus', stabs: true, bass: 'drive', lead: 'chorus', crash: true },
        { name: 'Break', bars: 4, energy: 1, chords: 'main', pad: true, bell: 'chorus', rollLast: 'roll' },
        { name: 'Chorus', bars: 8, energy: 3, chords: 'main', drums: 'chorus', stabs: true, bass: 'drive', lead: 'chorus', crash: true },
        { name: 'Outro', bars: 4, energy: 1, chords: 'main', drums: 'outro', pad: true, bass: 'pump', end: true }
      ]
    },
    {
      id: 'pixel-picnic', title: 'Pixel Picnic', style: 'chiptune', bpm: 150, swing: 0, sound: 'chip',
      blurb: 'Square-wave tunes like an 8-bit console. Quick and bouncy.',
      chords: {
        a: [chord('C3', 'maj'), chord('G2', 'maj'), chord('A2', 'min'), chord('F2', 'maj')],
        b: [chord('F2', 'maj'), chord('G2', 'maj'), chord('A2', 'min'), chord('G2', 'maj')]
      },
      drums: {
        a: { ckick: 'x.......x.x.....', csnare: '....x.......x...', chat: 'x.x.x.x.x.x.x.x.' },
        b: { ckick: 'x.....x...x.....', csnare: '....x.......x...', chat: 'xxxxxxxxxxxxxxxx' },
        brk: { ckick: 'x...............', chat: '..x...x...x...x.' }
      },
      bass: { bounce: [[0, 0, 2], [2, 12, 2], [4, 0, 2], [6, 12, 2], [8, 0, 2], [10, 12, 2], [12, 0, 2], [14, 12, 2]], walk: [[0, 0, 4], [4, 7, 4], [8, 12, 4], [12, 7, 4]] },
      melodies: {
        a: [
          tune([[0, 'C5', 2], [2, 'E5', 2], [4, 'G5', 2], [6, 'E5', 2], [8, 'C6', 4], [12, 'G5', 4]]),
          tune([[0, 'B4', 2], [2, 'D5', 2], [4, 'G5', 2], [6, 'D5', 2], [8, 'B5', 4], [12, 'A5', 2], [14, 'G5', 2]]),
          tune([[0, 'A4', 2], [2, 'C5', 2], [4, 'E5', 2], [6, 'A5', 2], [8, 'G5', 2], [10, 'E5', 2], [12, 'C5', 2], [14, 'E5', 2]]),
          tune([[0, 'F5', 4], [4, 'E5', 4], [8, 'D5', 4], [12, 'C5', 2], [14, 'D5', 2]]),
          tune([[0, 'C5', 2], [2, 'E5', 2], [4, 'G5', 2], [6, 'E5', 2], [8, 'C6', 4], [12, 'G5', 4]]),
          tune([[0, 'B4', 2], [2, 'D5', 2], [4, 'G5', 2], [6, 'D5', 2], [8, 'B5', 4], [12, 'A5', 2], [14, 'G5', 2]]),
          tune([[0, 'A4', 2], [2, 'C5', 2], [4, 'E5', 2], [6, 'A5', 2], [8, 'G5', 2], [10, 'E5', 2], [12, 'C5', 2], [14, 'E5', 2]]),
          tune([[0, 'F5', 2], [2, 'A5', 2], [4, 'C6', 4], [8, 'A5', 4], [12, 'G5', 4]])
        ],
        b: [
          tune([[0, 'A5', 2], [2, 'A5', 2], [4, 'G5', 2], [6, 'A5', 4], [10, 'C6', 2], [12, 'A5', 4]]),
          tune([[0, 'G5', 2], [2, 'G5', 2], [4, 'F5', 2], [6, 'G5', 4], [10, 'B5', 2], [12, 'G5', 4]]),
          tune([[0, 'E5', 2], [2, 'E5', 2], [4, 'D5', 2], [6, 'E5', 4], [10, 'A5', 2], [12, 'G5', 2], [14, 'E5', 2]]),
          tune([[0, 'D5', 4], [4, 'G5', 4], [8, 'B5', 4], [12, 'D6', 4]]),
          tune([[0, 'A5', 2], [2, 'A5', 2], [4, 'G5', 2], [6, 'A5', 4], [10, 'C6', 2], [12, 'A5', 4]]),
          tune([[0, 'G5', 2], [2, 'G5', 2], [4, 'F5', 2], [6, 'G5', 4], [10, 'B5', 2], [12, 'G5', 4]]),
          tune([[0, 'E5', 2], [2, 'E5', 2], [4, 'D5', 2], [6, 'E5', 4], [10, 'A5', 2], [12, 'G5', 2], [14, 'E5', 2]]),
          tune([[0, 'D6', 2], [2, 'B5', 2], [4, 'G5', 2], [6, 'D5', 2], [8, 'G5', 8]])
        ]
      },
      sections: [
        { name: 'Intro', bars: 2, energy: 1, chords: 'a', arp: true, bass: 'walk' },
        { name: 'Tune A', bars: 8, energy: 2, chords: 'a', drums: 'a', bass: 'bounce', arp: true, lead: 'a' },
        { name: 'Tune B', bars: 8, energy: 3, chords: 'b', drums: 'b', bass: 'bounce', arp: true, lead: 'b', crash: true },
        { name: 'Break', bars: 4, energy: 1, chords: 'a', drums: 'brk', bass: 'walk', bell: 'a' },
        { name: 'Tune A', bars: 8, energy: 3, chords: 'a', drums: 'b', bass: 'bounce', arp: true, lead: 'a', crash: true },
        { name: 'Outro', bars: 2, energy: 1, chords: 'a', arp: true, bass: 'walk', end: true }
      ]
    },
    {
      id: 'velvet-groove', title: 'Velvet Groove', style: 'slow funk', bpm: 96, swing: 0.16, sound: 'funk',
      blurb: 'A lazy, swinging groove with a slap bass and choppy keys.',
      chords: {
        vamp: [chord('E2', 'm7'), chord('A2', 'dom9')],
        bridge: [chord('C3', 'maj7'), chord('B2', 'm7')]
      },
      drums: {
        intro: { kick: 'x......x..x.....', snare: '....x.......x...', hat: 'xgxgxgxgxgxgxgxg' },
        groove: { kick: 'x......x..x.....', snare: '....x..g.g..x..g', hat: 'xgxgxgxgxgxgxgxg' },
        soft: { kick: 'x.........x.....', rim: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }
      },
      /* funk bass lines are written out note by note, one line per chord */
      bassLines: {
        vamp: [
          tune([[0, 'E2', 2], [3, 'E2', 1], [6, 'G2', 1], [7, 'A2', 2], [10, 'E2', 1], [12, 'D3', 1], [13, 'E3', 1], [14, 'D3', 1], [15, 'B2', 1]]),
          tune([[0, 'A2', 2], [3, 'A2', 1], [6, 'C#3', 1], [7, 'E3', 2], [10, 'A2', 1], [12, 'G2', 1], [13, 'A2', 1], [14, 'G2', 1], [15, 'E2', 1]])
        ],
        bridge: [
          tune([[0, 'C3', 4], [6, 'G2', 2], [8, 'C3', 2], [11, 'E3', 1], [12, 'G3', 2], [14, 'E3', 2]]),
          tune([[0, 'B2', 4], [6, 'F#2', 2], [8, 'B2', 2], [11, 'D3', 1], [12, 'F#3', 2], [14, 'D3', 2]])
        ]
      },
      clav: [2, 5, 10, 13],
      melodies: {
        riff: [
          tune([[0, 'B4', 2], [2, 'D5', 1], [3, 'E5', 3], [8, 'D5', 1], [9, 'B4', 1], [10, 'A4', 2], [12, 'G4', 2], [14, 'A4', 2]]),
          tune([[0, 'B4', 4], [8, 'E5', 1], [9, 'D5', 1], [10, 'B4', 1], [11, 'A4', 1], [12, 'G4', 2], [14, 'E4', 2]]),
          tune([[0, 'E4', 2], [3, 'G4', 1], [4, 'A4', 2], [6, 'A#4', 1], [7, 'B4', 3], [12, 'D5', 2], [14, 'E5', 2]]),
          tune([[0, 'G5', 2], [2, 'E5', 4], [8, 'D5', 2], [10, 'B4', 2], [12, 'A4', 4]]),
          tune([[0, 'B4', 2], [2, 'D5', 1], [3, 'E5', 3], [8, 'D5', 1], [9, 'B4', 1], [10, 'A4', 2], [12, 'G4', 2], [14, 'A4', 2]]),
          tune([[0, 'B4', 4], [8, 'E5', 1], [9, 'D5', 1], [10, 'B4', 1], [11, 'A4', 1], [12, 'G4', 2], [14, 'E4', 2]]),
          tune([[0, 'E4', 2], [3, 'G4', 1], [4, 'A4', 2], [6, 'A#4', 1], [7, 'B4', 3], [12, 'D5', 2], [14, 'E5', 2]]),
          tune([[0, 'E5', 2], [2, 'D5', 2], [4, 'B4', 2], [6, 'A4', 2], [8, 'B4', 8]])
        ]
      },
      sections: [
        { name: 'Intro', bars: 2, energy: 1, chords: 'vamp', drums: 'intro', funkBass: 'vamp', bassFrom: 1 },
        { name: 'Groove', bars: 4, energy: 2, chords: 'vamp', drums: 'groove', funkBass: 'vamp', clav: true },
        { name: 'Riff', bars: 8, energy: 3, chords: 'vamp', drums: 'groove', funkBass: 'vamp', clav: true, lead: 'riff', crash: true },
        { name: 'Bridge', bars: 4, energy: 1, chords: 'bridge', drums: 'soft', funkBass: 'bridge', keys: true },
        { name: 'Riff', bars: 8, energy: 3, chords: 'vamp', drums: 'groove', funkBass: 'vamp', clav: true, lead: 'riff', crash: true },
        { name: 'Outro', bars: 2, energy: 1, chords: 'vamp', drums: 'intro', keys: true, end: true }
      ]
    }
  ];

  /* =====================================================================================
     Turning a song into a list of timed notes, and a "beat grid" that says what happens on every step.
     ===================================================================================== */
  function stepLength(song) { return 60 / song.bpm / 4; }
  /* When step number s (counting sixteenth notes from the start) happens, in seconds. With swing, every second
     sixteenth is pushed a little later, which makes funk feel lazy. */
  function stepTime(song, s) {
    var st = stepLength(song);
    return s * st + (s % 2 === 1 ? song.swing * st : 0);
  }
  function arrange(song) {
    var events = [], grid = [], bar = 0, sl = stepLength(song);
    function ev(s, inst, a, b) { events.push({ t: stepTime(song, s), inst: inst, a: a, b: b }); }
    song.sections.forEach(function (sec, si) {
      var prog = song.chords[sec.chords];
      for (var b = 0; b < sec.bars; b++, bar++) {
        var s0 = bar * 16, ch = prog[b % prog.length], last = b === sec.bars - 1;
        var info = [];
        for (var k = 0; k < 16; k++) info.push({ s: s0 + k, energy: sec.energy, first: b === 0 && k === 0, kick: 0, snare: 0, lead: -1, bass: 0, section: si });
        grid.push.apply(grid, info);
        /* drums */
        var kit = sec.drums ? song.drums[sec.drums] : null;
        if (last && sec.rollLast) kit = song.drums[sec.rollLast];
        if (kit) Object.keys(kit).forEach(function (drum) {
          hits(kit[drum]).forEach(function (hit) {
            ev(s0 + hit[0], drum, hit[1]);
            if (drum === 'kick' || drum === 'ckick') info[hit[0]].kick = 1;
            if ((drum === 'snare' || drum === 'clap' || drum === 'csnare' || drum === 'rim') && hit[1] > 0.5) info[hit[0]].snare = 1;
          });
        });
        if (sec.crash && b === 0) ev(s0, 'crash', 1);
        /* bass: a pattern of [step, semitones above the chord root, length] */
        if (sec.bass) song.bass[sec.bass].forEach(function (n) { ev(s0 + n[0], 'bass', ch.root + n[1], n[2] * sl); info[n[0]].bass = 1; });
        if (sec.funkBass && b >= (sec.bassFrom || 0)) {
          var lines = song.bassLines[sec.funkBass];
          lines[b % lines.length].forEach(function (n) { ev(s0 + n.s, 'bass', n.m, n.len * sl); info[n.s].bass = 1; });
        }
        /* chords */
        if (sec.pad) ev(s0, 'pad', voicing(ch, 57), 16 * sl);
        if (sec.keys) ev(s0, 'keys', voicing(ch, 52), 16 * sl);
        if (sec.stabs) [0, 3, 6, 10, 12].forEach(function (k2) { ev(s0 + k2, 'stab', voicing(ch, 60), 2 * sl); });
        if (sec.clav) song.clav.forEach(function (k3) { ev(s0 + k3, 'clav', voicing(ch, 62), sl * 0.9); });
        if (sec.arp) {
          var v = voicing(ch, song.sound === 'chip' ? 60 : 57), notes = v.concat([v[0] + 12]);
          for (var k4 = 0; k4 < 16; k4++) ev(s0 + k4, 'arp', notes[k4 % notes.length], sl * 0.9);
        }
        /* the tune */
        var mel = sec.lead || sec.bell;
        if (mel) {
          var m = song.melodies[mel][b % song.melodies[mel].length];
          m.forEach(function (n) { ev(s0 + n.s, sec.lead ? 'lead' : 'bell', n.m, n.len * sl); if (sec.lead) info[n.s].lead = n.m; });
        }
        if (sec.end && last) ev(s0 + 16, 'final', voicing(ch, 57), 1.6);
      }
    });
    events.sort(function (x, y) { return x.t - y.t; });
    return { events: events, grid: grid, bars: bar, length: stepTime(song, bar * 16) + 1.2 };
  }

  /* =====================================================================================
     The step-chart maker.
     It walks through the song one sixteenth note at a time and decides where arrows go:
     - Beginner: only on beats (quarter notes), at least one beat apart, half as many in quiet parts.
     - Basic: beats and half-beats where the tune or the bass plays, at least half a beat apart, a few jumps.
     - Trick: follows the tune closely, with quick quarter-beat pairs and more jumps.
     Then it picks which arrow, pretending the dancer's feet take turns: the left foot only uses Left, Down and Up,
     the right foot only Right, Down and Up, and the two feet never land on the same panel. That is why the chart
     never asks you to cross your legs. When the tune goes up, it prefers Up or Right; when it goes down, Down or Left.
     ===================================================================================== */
  var LANES = ['Left', 'Down', 'Up', 'Right'];
  function seededRandom(seed) {
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function hash(str) { var x = 2166136261; for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }

  function makeChart(song, arr, level) {
    var rand = seededRandom(hash(song.id + ':' + level));
    var grid = arr.grid, picked = [], lastS = -99, run = 0;
    var startS = 16, endS = grid.length - 8;  /* no arrows in the first bar, so you can find the beat */
    for (var s = startS; s < endS; s++) {
      var g = grid[s], pos = s % 16, e = g.energy;
      if (!e) continue;
      var gap = s - lastS, take = false, jump = false;
      if (level === 'beginner') {
        if (pos % 4 !== 0 || gap < 4) continue;
        take = e >= 2 ? (pos % 8 === 0 || g.lead >= 0 || g.kick === 1) : pos % 8 === 0;
        if (take && e >= 2 && pos % 8 !== 0 && rand() < 0.3) take = false;
      } else if (level === 'basic') {
        if (pos % 2 !== 0 || gap < 2) continue;
        if (pos % 4 === 0) take = e >= 2 || pos % 8 === 0;
        else take = e >= 2 && (g.lead >= 0 || g.bass === 1) && rand() < (e === 3 ? 0.55 : 0.3);
        if (take && gap === 2 && run >= 3) take = false;      /* no long runs of quick steps */
        jump = take && g.first && e >= 2;
      } else {
        if (pos % 4 === 0) take = true;
        else if (pos % 2 === 0) take = e >= 2 && (g.lead >= 0 || g.bass === 1 || g.snare === 1) && rand() < 0.85;
        else take = e === 3 && g.lead >= 0 && lastS === s - 1 && rand() < 0.6;  /* quick pairs only */
        if (take && gap === 1 && run >= 2) take = false;      /* quick bursts stay short */
        jump = take && e === 3 && pos === 0 && ((s / 16 | 0) % 2 === 0 || g.first);
      }
      if (!take) continue;
      run = gap <= 2 ? run + 1 : 0;
      picked.push({ s: s, jump: jump, lead: g.lead });
      lastS = s;
    }
    /* choose arrows with the two-feet model */
    var notes = [], foot = 'R', at = { L: 0, R: 3 }, prevLead = -1, prevS = -99, prevLane = -1;
    var home = { L: 0, R: 3 }, allowed = { L: [0, 1, 2], R: [3, 1, 2] };
    picked.forEach(function (p) {
      var t = stepTime(song, p.s), gap = p.s - prevS;
      if (p.jump) {
        var pairs = level === 'basic' ? [[0, 3]] : [[0, 3], [0, 2], [1, 3], [0, 1], [2, 3]];
        var pr = pairs[Math.floor(rand() * pairs.length)];
        notes.push({ t: t, lane: pr[0], s: p.s }, { t: t, lane: pr[1], s: p.s });
        at.L = pr[0]; at.R = pr[1]; foot = 'R'; prevLane = -1;
      } else {
        if (gap >= 8) foot = rand() < 0.5 ? 'L' : 'R'; else foot = foot === 'L' ? 'R' : 'L';
        var other = foot === 'L' ? at.R : at.L, opts = allowed[foot], best = -1, bestW = -1e9;
        for (var i = 0; i < opts.length; i++) {
          var lane = opts[i];
          if (lane === other) continue;                                     /* never both feet on one panel */
          if (lane === prevLane && gap < 4 && level !== 'trick') continue;  /* no quick repeats on easier levels */
          var w = 1 + rand();
          if (lane === home[foot]) w += 0.6;
          if (p.lead >= 0 && prevLead >= 0) {
            if (p.lead > prevLead && (lane === 2 || lane === 3)) w += 1.4;
            if (p.lead < prevLead && (lane === 1 || lane === 0)) w += 1.4;
          }
          if (lane === at[foot]) w -= 0.5;
          if (w > bestW) { bestW = w; best = lane; }
        }
        if (best < 0) best = home[foot];
        notes.push({ t: t, lane: best, s: p.s, foot: foot });
        at[foot] = best; prevLane = best;
      }
      if (p.lead >= 0) prevLead = p.lead;
      prevS = p.s;
    });
    notes.forEach(function (n) { var pos = n.s % 16; n.beat = pos % 4 === 0 ? 0 : pos % 2 === 0 ? 1 : 2; });
    return notes;
  }

  /* =====================================================================================
     The synthesiser: every instrument is a few oscillators or a burst of noise, shaped by a volume envelope.
     ===================================================================================== */
  function Synth(ctx) {
    this.ctx = ctx;
    this.master = ctx.createGain(); this.master.gain.value = 0.55;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.bus = null;
    /* one second of white noise, for drums */
    var len = ctx.sampleRate | 0, nb = ctx.createBuffer(1, len, ctx.sampleRate), d = nb.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = nb;
    /* a small "room" (reverb): noise that fades away, used as an echo pattern */
    var rl = (ctx.sampleRate * 1.4) | 0, rb = ctx.createBuffer(2, rl, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var rd = rb.getChannelData(c); for (var j = 0; j < rl; j++) rd[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / rl, 3); }
    this.roomBuf = rb;
    /* pulse waves (the thin square sounds of 8-bit consoles), built from their harmonics */
    this.pulse = { p25: pulseWave(ctx, 0.25), p125: pulseWave(ctx, 0.125) };
  }
  function pulseWave(ctx, duty) {
    var n = 40, re = new Float32Array(n), im = new Float32Array(n);
    for (var k = 1; k < n; k++) { re[k] = Math.sin(2 * Math.PI * k * duty) / (k * Math.PI); im[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (k * Math.PI); }
    return ctx.createPeriodicWave(re, im);
  }
  /* A fresh mixing desk for each song, so stopping a song just means fading this one out. */
  Synth.prototype.newBus = function (song) {
    var ctx = this.ctx, b = {};
    b.out = ctx.createGain(); b.out.gain.value = 1; b.out.connect(this.master);
    b.room = ctx.createConvolver(); b.room.buffer = this.roomBuf;
    b.roomSend = ctx.createGain(); b.roomSend.gain.value = song.sound === 'chip' ? 0.12 : 0.28;
    b.roomSend.connect(b.room); b.room.connect(b.out);
    b.echo = ctx.createDelay(1.5); b.echo.delayTime.value = 3 * stepLength(song);
    b.echoFb = ctx.createGain(); b.echoFb.gain.value = 0.3;
    b.echoSend = ctx.createGain(); b.echoSend.gain.value = song.sound === 'funk' ? 0.12 : 0.24;
    b.echoSend.connect(b.echo); b.echo.connect(b.echoFb); b.echoFb.connect(b.echo); b.echo.connect(b.out);
    this.bus = b;
    return b;
  };
  Synth.prototype.fadeOut = function () {
    var b = this.bus, ctx = this.ctx;
    if (!b) return;
    this.bus = null;
    try { b.out.gain.cancelScheduledValues(ctx.currentTime); b.out.gain.setTargetAtTime(0, ctx.currentTime, 0.04); } catch (e) { /* ignore */ }
    setTimeout(function () { try { b.out.disconnect(); } catch (e) { /* ignore */ } }, 600);
  };
  /* helpers: an envelope, an oscillator, a noise burst */
  function env(g, t, peak, attack, decay, holdUntil) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    if (holdUntil) { g.gain.setValueAtTime(peak, Math.max(t + attack, holdUntil)); g.gain.exponentialRampToValueAtTime(0.0001, Math.max(t + attack, holdUntil) + decay); }
    else g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  Synth.prototype.osc = function (type, freq, t, stopAt, dest) {
    var o = this.ctx.createOscillator();
    if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
    o.frequency.setValueAtTime(freq, t);
    o.connect(dest); o.start(t); o.stop(stopAt);
    return o;
  };
  Synth.prototype.noiseHit = function (t, dur, type, freq, q, vol, dest) {
    var ctx = this.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    env(g, t, vol, 0.002, dur);
    s.connect(f); f.connect(g); g.connect(dest || this.bus.out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
    return g;
  };
  Synth.prototype.play = function (e, t, song) {
    var ctx = this.ctx, b = this.bus;
    if (!b) return;
    var out = b.out, g, f, i, v = e.a, sound = song.sound, o;
    switch (e.inst) {
      case 'kick':
        g = ctx.createGain(); env(g, t, 0.95 * v, 0.002, 0.32); g.connect(out);
        o = this.osc('sine', 150, t, t + 0.4, g); o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
        this.noiseHit(t, 0.012, 'highpass', 3000, 0.7, 0.25 * v);
        break;
      case 'ckick':
        g = ctx.createGain(); env(g, t, 0.6 * v, 0.002, 0.14); g.connect(out);
        o = this.osc('triangle', 180, t, t + 0.2, g); o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        break;
      case 'snare':
        this.noiseHit(t, 0.17, 'bandpass', 1900, 0.8, 0.55 * v);
        g = ctx.createGain(); env(g, t, 0.3 * v, 0.002, 0.08); g.connect(out); this.osc('triangle', 190, t, t + 0.12, g);
        break;
      case 'rim':
        g = ctx.createGain(); env(g, t, 0.22 * v, 0.001, 0.04); g.connect(out); this.osc('square', 820, t, t + 0.06, g);
        break;
      case 'csnare':
        this.noiseHit(t, 0.12, 'highpass', 1500, 0.5, 0.35 * v);
        break;
      case 'clap':
        for (i = 0; i < 3; i++) this.noiseHit(t + i * 0.011, 0.012, 'bandpass', 1150, 1.4, 0.5 * v);
        g = this.noiseHit(t + 0.033, 0.16, 'bandpass', 1150, 1.2, 0.42 * v); g.connect(b.roomSend);
        break;
      case 'hat': this.noiseHit(t, 0.03, 'highpass', 8000, 0.8, 0.14 * v); break;
      case 'chat': this.noiseHit(t, 0.025, 'highpass', 6000, 0.6, 0.1 * v); break;
      case 'ohat': this.noiseHit(t, 0.16, 'highpass', 7600, 0.8, 0.13 * v); break;
      case 'crash': g = this.noiseHit(t, 1.1, 'highpass', 5200, 0.5, 0.18); g.connect(b.roomSend); break;
      case 'bass': {
        var dur = e.b, fq = mtof(v);
        g = ctx.createGain(); g.connect(out);
        if (sound === 'chip') { env(g, t, 0.42, 0.004, 0.05, t + dur * 0.85); this.osc('triangle', fq, t, t + dur + 0.1, g); }
        else if (sound === 'funk') {
          f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(380, t + 0.14);
          f.connect(g); env(g, t, 0.5, 0.004, 0.08, t + Math.max(0.05, dur * 0.8));
          this.osc('sawtooth', fq, t, t + dur + 0.12, f); this.osc('sine', fq, t, t + dur + 0.12, g);
        } else {
          f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3; f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(320, t + 0.16);
          f.connect(g); env(g, t, 0.42, 0.004, 0.06, t + dur * 0.7);
          this.osc('sawtooth', fq, t, t + dur + 0.1, f); this.osc('square', fq / 2, t, t + dur + 0.1, f);
        }
        break;
      }
      case 'pad':
        g = ctx.createGain(); g.connect(out); g.connect(b.roomSend);
        f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1300; f.connect(g);
        env(g, t, 0.05, 0.25, 0.4, t + e.b - 0.2);
        for (i = 0; i < v.length; i++) { this.osc('sawtooth', mtof(v[i]) * 0.997, t, t + e.b + 0.5, f); this.osc('sawtooth', mtof(v[i]) * 1.003, t, t + e.b + 0.5, f); }
        break;
      case 'keys':
        /* an electric-piano sound: a soft sine with a quieter bell an octave up */
        for (i = 0; i < v.length; i++) {
          var ti = t + i * 0.012;
          g = ctx.createGain(); g.connect(out); g.connect(b.roomSend);
          env(g, ti, 0.09, 0.006, 1.8);
          this.osc('sine', mtof(v[i]), ti, ti + 2.2, g);
          var g2 = ctx.createGain(); g2.gain.value = 0.25; g2.connect(g); this.osc('sine', mtof(v[i]) * 2, ti, ti + 1, g2);
        }
        break;
      case 'stab':
        g = ctx.createGain(); g.connect(out); g.connect(b.roomSend);
        f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1; f.frequency.setValueAtTime(4200, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.22); f.connect(g);
        env(g, t, 0.07, 0.004, 0.22);
        for (i = 0; i < v.length; i++) { var fr = mtof(v[i]); this.osc('sawtooth', fr * 0.993, t, t + 0.3, f); this.osc('sawtooth', fr, t, t + 0.3, f); this.osc('sawtooth', fr * 1.007, t, t + 0.3, f); }
        break;
      case 'clav':
        g = ctx.createGain(); g.connect(out);
        f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1.6; f.connect(g);
        env(g, t, 0.16, 0.002, 0.09);
        for (i = 0; i < v.length; i++) this.osc(this.pulse.p25, mtof(v[i]), t, t + 0.14, f);
        break;
      case 'arp':
        g = ctx.createGain(); g.connect(out);
        if (sound === 'chip') { env(g, t, 0.06, 0.002, 0.03, t + e.b * 0.7); this.osc(this.pulse.p125, mtof(v), t, t + e.b + 0.05, g); }
        else { g.connect(b.echoSend); env(g, t, 0.05, 0.003, 0.12); this.osc('triangle', mtof(v + 12), t, t + 0.2, g); }
        break;
      case 'lead': {
        var ld = e.b, lf = mtof(v);
        g = ctx.createGain(); g.connect(out); g.connect(b.echoSend);
        if (sound === 'chip') {
          env(g, t, 0.11, 0.003, 0.05, t + ld * 0.9);
          o = this.osc(this.pulse.p25, lf, t, t + ld + 0.1, g);
          if (ld > 0.3) {
            /* vibrato: a slow wobble added to the pitch of long notes */
            var vib = ctx.createOscillator(), vg = ctx.createGain();
            vib.frequency.value = 6; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(lf * 0.012, t + 0.25);
            vib.connect(vg); vg.connect(o.frequency); vib.start(t); vib.stop(t + ld + 0.1);
          }
        } else if (sound === 'funk') {
          f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.05); f.frequency.exponentialRampToValueAtTime(1300, t + 0.3);
          f.connect(g); g.connect(b.roomSend);
          env(g, t, 0.13, 0.025, 0.12, t + Math.max(0.06, ld * 0.85));
          this.osc('sawtooth', lf * 0.996, t, t + ld + 0.2, f); this.osc('sawtooth', lf * 1.004, t, t + ld + 0.2, f);
        } else {
          f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3600; f.connect(g);
          env(g, t, 0.1, 0.006, 0.1, t + ld * 0.85);
          this.osc('square', lf, t, t + ld + 0.15, f); this.osc('sawtooth', lf * 1.005, t, t + ld + 0.15, f);
        }
        break;
      }
      case 'bell':
        g = ctx.createGain(); g.connect(out); g.connect(b.roomSend); g.connect(b.echoSend);
        env(g, t, 0.09, 0.004, Math.min(1.2, e.b + 0.4));
        this.osc(sound === 'chip' ? this.pulse.p125 : 'sine', mtof(v) * (sound === 'chip' ? 1 : 2), t, t + e.b + 0.6, g);
        break;
      case 'final':
        g = ctx.createGain(); g.connect(out); g.connect(b.roomSend);
        env(g, t, 0.07, 0.01, 1.4);
        for (i = 0; i < v.length; i++) { this.osc(sound === 'chip' ? this.pulse.p25 : 'sawtooth', mtof(v[i]), t, t + 1.6, g); this.osc('sine', mtof(v[i] - 12), t, t + 1.6, g); }
        this.noiseHit(t, 1.2, 'highpass', 5200, 0.5, 0.15);
        break;
    }
  };
  /* the beeps for the audio delay test */
  Synth.prototype.beep = function (t, hi) {
    var g = this.ctx.createGain(); g.connect(this.master); env(g, t, hi ? 0.35 : 0.25, 0.002, 0.08);
    this.osc('square', hi ? 1320 : 880, t, t + 0.12, g);
  };

  /* =====================================================================================
     Judging
     ===================================================================================== */
  var WINDOWS = { perfect: 0.045, great: 0.09, good: 0.135 };            /* seconds either side of the beat */
  var LEVELS = {
    beginner: { label: 'Beginner', lead: 1.9, wide: 1.2, miss: 5 },
    basic: { label: 'Basic', lead: 1.45, wide: 1.05, miss: 7 },
    trick: { label: 'Trick', lead: 1.1, wide: 1, miss: 9 }
  };
  var LEVEL_KEYS = ['beginner', 'basic', 'trick'];
  var GRADES = [['AAA', 99], ['AA', 93], ['A', 80], ['B', 65], ['C', 45], ['D', 0]];
  function gradeFor(pct) { for (var i = 0; i < GRADES.length; i++) if (pct >= GRADES[i][1]) return GRADES[i][0]; return 'D'; }

  /* Dancer poses: x and y of neck, hip, left elbow, left hand, right elbow, right hand, left knee, left foot,
     right knee, right foot. Height is 1, feet on 0, up is negative. */
  var POSES = {
    idle: [0, -0.74, 0, -0.4, -0.16, -0.58, -0.2, -0.44, 0.16, -0.58, 0.2, -0.44, -0.08, -0.2, -0.12, 0, 0.08, -0.2, 0.12, 0],
    bob: [0, -0.71, 0, -0.37, -0.18, -0.6, -0.26, -0.5, 0.15, -0.55, 0.16, -0.4, -0.13, -0.19, -0.12, 0, 0.13, -0.19, 0.12, 0],
    left: [-0.06, -0.73, -0.02, -0.4, -0.24, -0.66, -0.43, -0.73, 0.12, -0.56, 0.03, -0.5, -0.2, -0.2, -0.34, 0, 0.06, -0.2, 0.1, 0],
    right: [0.06, -0.73, 0.02, -0.4, -0.12, -0.56, -0.03, -0.5, 0.24, -0.66, 0.43, -0.73, -0.06, -0.2, -0.1, 0, 0.2, -0.2, 0.34, 0],
    up: [0, -0.86, 0, -0.52, -0.14, -0.94, -0.22, -1.1, 0.14, -0.94, 0.22, -1.1, -0.1, -0.32, -0.12, -0.14, 0.1, -0.32, 0.12, -0.14],
    down: [0, -0.6, 0, -0.28, -0.18, -0.44, -0.32, -0.36, 0.18, -0.44, 0.32, -0.36, -0.2, -0.16, -0.16, 0, 0.2, -0.16, 0.16, 0],
    jump: [0, -0.84, 0, -0.5, -0.24, -0.88, -0.42, -1.0, 0.24, -0.88, 0.42, -1.0, -0.16, -0.3, -0.3, -0.13, 0.16, -0.3, 0.3, -0.13],
    miss: [0.08, -0.7, 0.02, -0.38, -0.2, -0.66, -0.31, -0.81, 0.22, -0.5, 0.34, -0.44, -0.04, -0.2, -0.14, 0, 0.14, -0.18, 0.1, 0]
  };
  var LANE_POSE = ['left', 'down', 'up', 'right'];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  GamesInTime.register({
    id: 'dance-mat',
    frame: 'none',
    /* for the automated test: the songs, the chart maker and the synthesiser */
    songs: SONGS,
    internals: { arrange: arrange, Synth: Synth },
    makeChart: function (songIndex, level) { var song = SONGS[songIndex]; return makeChart(song, arrange(song), level); },
    mount: function (root, api) {
      var h = api.h;
      var reduced = !!api.reducedMotion;
      var destroyed = false;
      var timers = [];

      /* ---------- saved settings ---------- */
      var songIdx = clamp(Number(api.store.get('song', 0)) || 0, 0, SONGS.length - 1);
      var levelKey = api.store.get('level', 'beginner');
      if (!LEVELS[levelKey]) levelKey = 'beginner';
      var offsetMs = clamp(Number(api.store.get('offset', 0)) || 0, -150, 450);
      var bests = api.store.get('bests', {}) || {};

      /* ---------- styles ---------- */
      root.appendChild(h('style', null,
        '.game-dance-mat { color: var(--ink); }' +
        '.game-dance-mat .dm-stage { position: relative; border-radius: 22px; overflow: hidden; background: #071c1f; box-shadow: 0 0 0 2px rgba(31,200,185,.35), 0 0 0 6px rgba(139,92,246,.18), 0 22px 50px rgba(0,0,0,.5); }' +
        '.game-dance-mat .dm-canvas { display: block; width: 100%; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }' +
        '.game-dance-mat .dm-stage.is-playing .dm-canvas { touch-action: none; }' +
        '.game-dance-mat .dm-overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: 12px; background: rgba(4,18,20,.55); overflow: auto; }' +
        '.game-dance-mat .dm-card { width: min(100%, 30rem); max-height: 100%; overflow: auto; background: rgba(11,39,43,.95); border: 2px solid rgba(31,200,185,.5); border-radius: 18px; padding: .9rem 1rem 1rem; display: grid; gap: .65rem; text-align: center; box-shadow: 0 18px 40px rgba(0,0,0,.45); }' +
        '.game-dance-mat .dm-title { margin: 0; font-family: var(--font-poster); font-weight: 400; font-size: clamp(1.7rem, 1.2rem + 2.4vw, 2.6rem); line-height: 1.05; color: #f2fbf8; letter-spacing: .02em; text-shadow: 2px 2px 0 #ff3d9a, 4px 4px 0 #8b5cf6; }' +
        '.game-dance-mat .dm-msg { margin: 0; font-weight: 600; color: var(--ink); line-height: 1.35; }' +
        '.game-dance-mat .dm-songs { display: grid; gap: .45rem; }' +
        '.game-dance-mat .dm-song { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: .1rem .6rem; text-align: left; min-height: 52px; padding: .45rem .8rem; border-radius: 14px; border: 2px solid rgba(242,251,248,.18); background: rgba(16,52,58,.9); color: var(--ink); font: inherit; }' +
        '.game-dance-mat .dm-song strong { font-size: 1.08rem; line-height: 1.15; }' +
        '.game-dance-mat .dm-song span { font-size: .82rem; color: var(--ink-muted); }' +
        '.game-dance-mat .dm-song em { grid-row: 1 / span 2; grid-column: 2; font-style: normal; font-family: var(--font-poster); font-weight: 400; font-size: 1.15rem; color: #ffd23f; min-width: 2.6ch; text-align: right; }' +
        '.game-dance-mat .dm-song[aria-pressed="true"] { border-color: #ffd23f; background: rgba(255,61,154,.22); box-shadow: 0 0 0 2px rgba(255,210,63,.35); }' +
        '.game-dance-mat .dm-row { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; align-items: center; }' +
        '.game-dance-mat .dm-delay { font-size: .9rem; color: var(--ink-muted); display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; justify-content: center; }' +
        '.game-dance-mat .dm-delay output { min-width: 4.6ch; font-weight: 800; color: var(--ink); font-variant-numeric: tabular-nums; }' +
        '.game-dance-mat .dm-small { min-height: 40px; min-width: 40px; padding: .3rem .7rem; }' +
        '.game-dance-mat .dm-big { min-height: 54px; font-size: 1.2rem; padding-inline: 1.8rem; }' +
        '.game-dance-mat .dm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: .3rem; font-size: .85rem; }' +
        '.game-dance-mat .dm-stats b { display: block; font-size: 1.25rem; }' +
        '.game-dance-mat .dm-grade { font-family: var(--font-poster); font-weight: 400; font-size: clamp(3rem, 2rem + 6vw, 5rem); line-height: 1; color: #ffd23f; text-shadow: 4px 4px 0 #ff3d9a, 8px 8px 0 #8b5cf6; margin: .1rem 0 .3rem; }' +
        '.game-dance-mat .dm-grade.is-small { font-size: clamp(2rem, 1.5rem + 3vw, 3rem); }' +
        '.game-dance-mat .dm-pads { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 12px; }' +
        '.game-dance-mat .dm-pad { min-height: 72px; border-radius: 16px; border: 3px solid rgba(242,251,248,.25); background: linear-gradient(180deg, #164249, #0b272b); color: #f2fbf8; display: grid; place-items: center; padding: 6px; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; box-shadow: inset 0 -5px 0 rgba(0,0,0,.35); }' +
        '.game-dance-mat .dm-pads.is-playing .dm-pad { touch-action: none; }' +
        '.game-dance-mat .dm-pad svg { width: min(52px, 80%); height: auto; pointer-events: none; }' +
        '.game-dance-mat .dm-pad.is-down { background: linear-gradient(180deg, #ff3d9a, #8b5cf6); border-color: #ffd23f; box-shadow: inset 0 3px 0 rgba(0,0,0,.25); transform: translateY(2px); }' +
        '.game-dance-mat .dm-help { color: var(--ink-muted); font-size: .95rem; margin-top: .8rem; text-align: center; }' +
        '.game-dance-mat .dm-toolbar { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; margin-top: .8rem; }' +
        '.game-dance-mat .dm-toolbar:empty, .game-dance-mat .dm-toolbar.is-empty { display: none; }' +
        '@media (max-width: 420px) { .game-dance-mat .dm-overlay { padding: 6px; } .game-dance-mat .dm-card { padding: .6rem .6rem .7rem; gap: .5rem; } .game-dance-mat .dm-song { min-height: 46px; padding: .35rem .6rem; } .game-dance-mat .dm-song strong { font-size: 1rem; } .game-dance-mat .seg button { padding-inline: .55rem; } .game-dance-mat .dm-pad { min-height: 64px; } .game-dance-mat .dm-pads { gap: 7px; } }'));

      /* ---------- the stage, the cards on it and the four pads ---------- */
      var canvas = h('canvas', { class: 'dm-canvas', role: 'img', 'aria-label': 'A dance floor. Arrows scroll up to a row of targets at the top, and a dancer copies your steps.' });
      var overlay = h('div', { class: 'dm-overlay' });
      var stage = h('div', { class: 'dm-stage' }, canvas, overlay);
      function arrowSvg(rot) {
        var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('viewBox', '0 0 64 64'); s.setAttribute('aria-hidden', 'true');
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', 'M6 32 L30 8 L30 21 L58 21 L58 43 L30 43 L30 56 Z');
        p.setAttribute('fill', 'currentColor'); p.setAttribute('stroke', '#04201d'); p.setAttribute('stroke-width', '3'); p.setAttribute('stroke-linejoin', 'round');
        p.setAttribute('transform', 'rotate(' + rot + ' 32 32)');
        s.appendChild(p);
        return s;
      }
      var ROT = [0, -90, 90, 180];
      var pads = [0, 1, 2, 3].map(function (lane) {
        return h('button', { type: 'button', class: 'dm-pad', 'aria-label': LANES[lane] + ' arrow' }, arrowSvg(ROT[lane]));
      });
      var padRow = h('div', { class: 'dm-pads', role: 'group', 'aria-label': 'Dance mat: left, down, up, right' }, pads);
      var pauseBtn = h('button', { type: 'button', class: 'btn', onclick: function () { pauseGame(); } }, 'Pause');
      var quitBtn = h('button', { type: 'button', class: 'btn', onclick: function () { quitToMenu(); } }, 'Pick another song');
      var toolbar = h('div', { class: 'dm-toolbar is-empty' }, pauseBtn, quitBtn);
      var help = h('p', { class: 'dm-help' }, 'Keyboard: arrow keys, or D F J K for left, down, up, right. P pauses. On a tablet or phone, tap the big pads (two at once for a jump).');
      root.appendChild(stage);
      root.appendChild(padRow);
      root.appendChild(toolbar);
      root.appendChild(help);

      var ctx2 = canvas.getContext('2d');
      var W = 600, H = 480, dpr = 1;

      /* ---------- audio ---------- */
      var AC = window.AudioContext || window.webkitAudioContext;
      var actx = null, synth = null;
      function soundOn() { try { return !(window.GamesInTime && GamesInTime.sound && GamesInTime.sound.isOn) || GamesInTime.sound.isOn(); } catch (e) { return true; } }
      function ensureAudio() {
        if (actx) { audioResume(); return true; }
        if (!AC) return false;
        try { actx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { actx = new AC(); } catch (e2) { actx = null; return false; } }
        synth = new Synth(actx);
        actx.resume().catch(function () {});
        return true;
      }
      /* Which moment of the audio clock was coming out of the speakers at a performance.now() time (in ms).
         getOutputTimestamp() pairs "this sound is playing now" with "this is the time now", which is exactly what we
         need. Just after a pause it can still hold an old pair from before the pause, so until the audio system
         sends a fresh one we use currentTime minus the output delay instead. */
      var freshAfter = 0;
      function audioAt(perfMs) {
        if (!actx) return perfMs / 1000;
        var guess = actx.currentTime - (actx.outputLatency || actx.baseLatency || 0) - (performance.now() - perfMs) / 1000;
        if (actx.state !== 'running') return guess;
        if (actx.getOutputTimestamp) {
          var o = actx.getOutputTimestamp();
          if (o && o.performanceTime > freshAfter && o.contextTime > 0) return o.contextTime + (perfMs - o.performanceTime) / 1000;
        }
        return guess;
      }
      function audioResume() { if (actx && actx.state !== 'running') { freshAfter = performance.now(); actx.resume().catch(function () {}); } }
      function audioSuspend() { if (actx) { freshAfter = performance.now(); actx.suspend().catch(function () {}); } }

      /* ---------- game state ---------- */
      var state = 'menu';             /* menu | playing | paused | results | calibrate */
      var song = SONGS[songIdx], arr = null, chart = [], laneNotes = [[], [], [], []], laneNext = [0, 0, 0, 0];
      var T0 = 0;                     /* audio-clock time when the song's first step plays */
      var evIdx = 0, schedTimer = 0, rafId = 0;
      var frozenSong = 0;             /* song time held while paused */
      var counts = { perfect: 0, great: 0, good: 0, miss: 0 }, combo = 0, maxCombo = 0, gauge = 50, points = 0;
      var offsets = 0, offsetN = 0, gaugeEmptied = false, lastMilestone = 0;
      var flashText = '', flashColour = '#fff', flashAt = -1e9, flashSub = '', comboText = '';
      var laneFlash = [-1e9, -1e9, -1e9, -1e9], laneHit = [-1e9, -1e9, -1e9, -1e9], laneHitCol = ['#fff', '#fff', '#fff', '#fff'], laneDown = [false, false, false, false];
      var pose = new Float32Array(POSES.idle), target = 'idle', poseUntil = 0, lastHitLane = -1, lastHitAt = -1e9;
      var resumeAt = 0, endAt = 0;
      var clockA = 0, clockP = 0, clockOk = false;   /* smoothed song clock for drawing */

      function L() { return LEVELS[levelKey]; }
      function win(name) { return WINDOWS[name] * L().wide; }

      /* The song time the player is hearing at a moment (performance.now() ms), after the audio delay setting. */
      function heard(perfMs) {
        if (state !== 'playing' && state !== 'results') return frozenSong;
        if (resumeAt) return frozenSong;
        return audioAt(perfMs) - T0 - offsetMs / 1000;
      }
      /* A steadier copy of the same clock for drawing, so the arrows glide instead of jittering. */
      function frameSongTime(now) {
        var raw = heard(now);
        if (state !== 'playing' || resumeAt) { clockOk = false; return raw; }
        if (!clockOk) { clockA = raw; clockP = now; clockOk = true; return raw; }
        var pred = clockA + (now - clockP) / 1000, err = raw - pred;
        if (Math.abs(err) > 0.03) pred = raw; else pred += err * 0.1;
        clockA = pred; clockP = now;
        return pred;
      }

      /* ---------- sizes ---------- */
      var G = { laneW: 80, lanesX: 20, targetY: 70, wide: true, dancerX: 400, dancerH: 260, floorY: 400 };
      var sprites = { arrows: [], targets: [], glow: null, bg: null, size: 70, glowSize: 120 };
      function resize() {
        var w = Math.max(260, Math.round(stage.clientWidth || 600));
        var vh = window.innerHeight || 800;
        var hh = w < 560 ? Math.round(clamp(vh * 0.6, 420, 540)) : Math.round(clamp(Math.min(w * 0.56, vh * 0.66), 440, 600));
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = w; H = hh;
        canvas.style.height = hh + 'px';
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr);
        G.wide = w >= 640;
        G.laneW = G.wide ? clamp(Math.round(w * 0.085), 70, 96) : Math.floor(Math.min(92, (w - 20) / 4));
        G.lanesX = G.wide ? Math.round(Math.max(24, w * 0.1)) : Math.round((w - G.laneW * 4) / 2);
        G.targetY = Math.round(30 + G.laneW * 0.5 + 6);
        G.floorY = Math.round(hh * 0.9);
        G.dancerH = G.wide ? hh * 0.58 : hh * 0.5;
        G.dancerX = G.wide ? Math.round(G.lanesX + G.laneW * 4 + (w - G.lanesX - G.laneW * 4) / 2) : Math.round(w / 2);
        buildSprites();
        draw(performance.now());
      }

      /* ---------- sprites, drawn once per size ---------- */
      var BEAT_COL = [['#ff3d9a', '#a3135a'], ['#1fc8b9', '#0b625b'], ['#ffd23f', '#a37f05']];
      function arrowPath(g, s) {
        /* a chunky arrow pointing left, in a box of size s */
        var m = s * 0.08;
        g.beginPath();
        g.moveTo(m, s / 2);
        g.lineTo(s * 0.47, m);
        g.lineTo(s * 0.47, s * 0.32);
        g.lineTo(s - m, s * 0.32);
        g.lineTo(s - m, s * 0.68);
        g.lineTo(s * 0.47, s * 0.68);
        g.lineTo(s * 0.47, s - m);
        g.closePath();
      }
      function makeArrow(s, fill, dark, rot, outlineOnly) {
        var c = document.createElement('canvas'), px = Math.round(s * dpr);
        c.width = px; c.height = px;
        var g = c.getContext('2d');
        g.scale(dpr, dpr);
        g.translate(s / 2, s / 2); g.rotate(rot); g.translate(-s / 2, -s / 2);
        g.lineJoin = 'round';
        arrowPath(g, s);
        if (outlineOnly) {
          g.fillStyle = 'rgba(242,251,248,.10)'; g.fill();
          g.lineWidth = Math.max(3, s * 0.07); g.strokeStyle = 'rgba(242,251,248,.8)'; g.stroke();
          return c;
        }
        var gr = g.createLinearGradient(0, 0, s, s);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, fill); gr.addColorStop(1, dark);
        g.fillStyle = gr; g.fill();
        g.lineWidth = Math.max(3, s * 0.075); g.strokeStyle = '#04201d'; g.stroke();
        g.lineWidth = Math.max(1.5, s * 0.03); g.strokeStyle = 'rgba(255,255,255,.75)'; g.stroke();
        return c;
      }
      function buildSprites() {
        var s = G.laneW - 8, rots = [0, -Math.PI / 2, Math.PI / 2, Math.PI], l;
        sprites.size = s;
        sprites.arrows = [];
        for (var b = 0; b < 3; b++) { sprites.arrows.push([]); for (l = 0; l < 4; l++) sprites.arrows[b].push(makeArrow(s, BEAT_COL[b][0], BEAT_COL[b][1], rots[l], false)); }
        sprites.targets = [];
        for (l = 0; l < 4; l++) sprites.targets.push(makeArrow(s, '', '', rots[l], true));
        /* a soft glow for hits */
        var gs = Math.round(G.laneW * 1.6), gc = document.createElement('canvas');
        gc.width = Math.round(gs * dpr); gc.height = gc.width;
        var gg = gc.getContext('2d'); gg.scale(dpr, dpr);
        var rg = gg.createRadialGradient(gs / 2, gs / 2, 2, gs / 2, gs / 2, gs / 2);
        rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(0.3, 'rgba(255,210,63,.6)'); rg.addColorStop(1, 'rgba(255,61,154,0)');
        gg.fillStyle = rg; gg.fillRect(0, 0, gs, gs);
        sprites.glow = gc; sprites.glowSize = gs;
        /* the background: a dark club, a checked floor in perspective, and coloured light beams */
        var bg = document.createElement('canvas');
        bg.width = canvas.width; bg.height = canvas.height;
        var b2 = bg.getContext('2d'); b2.scale(dpr, dpr);
        var sky = b2.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#0b1f33'); sky.addColorStop(0.55, '#140b2e'); sky.addColorStop(1, '#071c1f');
        b2.fillStyle = sky; b2.fillRect(0, 0, W, H);
        var hor = H * 0.62, i;
        for (i = 0; i < 6; i++) {
          var x0 = W * (0.08 + i * 0.17);
          var beam = b2.createLinearGradient(x0, 0, x0, hor);
          var col = i % 3 === 0 ? '255,61,154' : i % 3 === 1 ? '31,200,185' : '139,92,246';
          beam.addColorStop(0, 'rgba(' + col + ',.22)'); beam.addColorStop(1, 'rgba(' + col + ',0)');
          b2.fillStyle = beam; b2.beginPath(); b2.moveTo(x0 - 6, 0); b2.lineTo(x0 + 6, 0); b2.lineTo(x0 + 70 - i * 20, hor); b2.lineTo(x0 - 70 + i * 22, hor); b2.closePath(); b2.fill();
        }
        /* the floor: rows of tiles that get wider as they come closer */
        var rowsN = 7, cx = G.dancerX;
        for (var r = 0; r < rowsN; r++) {
          var y1 = hor + (H - hor) * Math.pow(r / rowsN, 1.6), y2 = hor + (H - hor) * Math.pow((r + 1) / rowsN, 1.6);
          var tw1 = W * 0.09 * (0.5 + r / rowsN * 1.6), tw2 = W * 0.09 * (0.5 + (r + 1) / rowsN * 1.6);
          for (var c = -9; c < 9; c++) {
            b2.fillStyle = (r + c + 20) % 2 === 0 ? 'rgba(31,200,185,.16)' : 'rgba(139,92,246,.14)';
            b2.beginPath(); b2.moveTo(cx + c * tw1, y1); b2.lineTo(cx + (c + 1) * tw1, y1); b2.lineTo(cx + (c + 1) * tw2, y2); b2.lineTo(cx + c * tw2, y2); b2.closePath(); b2.fill();
          }
        }
        b2.fillStyle = 'rgba(0,0,0,.25)'; b2.fillRect(0, hor - 2, W, 3);
        /* the lanes: a dark strip so arrows are easy to read */
        b2.fillStyle = 'rgba(4,18,20,.62)';
        rrect(b2, G.lanesX - 6, 0, G.laneW * 4 + 12, H, 14); b2.fill();
        b2.strokeStyle = 'rgba(242,251,248,.07)'; b2.lineWidth = 1;
        for (var k = 1; k < 4; k++) { b2.beginPath(); b2.moveTo(G.lanesX + k * G.laneW + 0.5, 8); b2.lineTo(G.lanesX + k * G.laneW + 0.5, H - 8); b2.stroke(); }
        sprites.bg = bg;
      }
      function rrect(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

      /* ---------- drawing a frame ---------- */
      var FONT = "'Arial Black', Impact, sans-serif", WEIGHT = '900';
      var fontCache = {};
      function font(px) { var k = Math.round(px); return fontCache[k] || (fontCache[k] = WEIGHT + ' ' + k + 'px ' + FONT); }
      /* The hall's poster type has only one weight; if it has not loaded, a heavy fallback looks closest. */
      function pickWeight() {
        var loaded = false;
        try { document.fonts.forEach(function (f) { if (/bungee/i.test(f.family) && f.status === 'loaded') loaded = true; }); } catch (e) { /* ignore */ }
        WEIGHT = loaded ? '400' : '900'; fontCache = {};
      }
      function draw(now) {
        var c = ctx2, t = frameSongTime(now);
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.drawImage(sprites.bg, 0, 0);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        var spb = 60 / song.bpm, beatPhase = t >= 0 ? (t / spb) % 1 : 0;
        var live = state === 'playing' || state === 'paused' || state === 'results';
        var beatPulse = reduced || !live ? 0 : Math.max(0, 1 - beatPhase * 4);

        /* spotlight under the dancer, a little brighter on each beat */
        c.globalAlpha = 0.55 + 0.45 * beatPulse;
        c.drawImage(sprites.glow, G.dancerX - G.dancerH * 0.5, G.floorY - G.dancerH * 0.12, G.dancerH, G.dancerH * 0.24);
        c.globalAlpha = 1;
        drawDancer(c, now, beatPhase);

        /* the dance gauge */
        var gx = G.lanesX, gw = G.laneW * 4, gy = 10, gh = 14;
        c.fillStyle = 'rgba(0,0,0,.55)'; rrect(c, gx, gy, gw, gh, 7); c.fill();
        c.fillStyle = gauge < 20 ? '#ff3d9a' : gauge > 80 ? '#ffd23f' : '#1fc8b9';
        if (gauge > 0) { rrect(c, gx + 2, gy + 2, Math.max(6, (gw - 4) * gauge / 100), gh - 4, 5); c.fill(); }
        c.strokeStyle = 'rgba(242,251,248,.5)'; c.lineWidth = 1.5; rrect(c, gx, gy, gw, gh, 7); c.stroke();
        if (gauge < 20 && state === 'playing') {
          c.font = font(12); c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillStyle = '#ffffff';
          c.globalAlpha = reduced ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(now / 250)); c.fillText('DANGER', gx + gw - 8, gy + gh / 2 + 1); c.globalAlpha = 1;
        }

        /* the target row, pulsing on the beat */
        var s = sprites.size, half = s / 2, lane;
        for (lane = 0; lane < 4; lane++) {
          var cx = G.lanesX + lane * G.laneW + G.laneW / 2, cy = G.targetY;
          var pressed = laneDown[lane] || now - laneFlash[lane] < 90;
          var sc = pressed ? 0.88 : 1 + beatPulse * 0.07;
          c.globalAlpha = pressed ? 1 : 0.85;
          c.drawImage(sprites.targets[lane], cx - half * sc, cy - half * sc, s * sc, s * sc);
          c.globalAlpha = 1;
          var ht = now - laneHit[lane];
          if (ht < 260) {
            var k = ht / 260, gsz = sprites.glowSize * (reduced ? 1 : 0.7 + k * 0.6);
            c.globalAlpha = 1 - k;
            c.drawImage(sprites.glow, cx - gsz / 2, cy - gsz / 2, gsz, gsz);
            c.strokeStyle = laneHitCol[lane]; c.lineWidth = 4;
            c.beginPath(); c.arc(cx, cy, half * (reduced ? 1 : 0.9 + k * 0.5), 0, Math.PI * 2); c.stroke();
            c.globalAlpha = 1;
          }
        }

        /* the arrows: each one sits where its time is, so it reaches the target exactly on its beat */
        if (live) {
          var pxPerSec = (H - G.targetY + s) / L().lead;
          for (lane = 0; lane < 4; lane++) {
            var list = laneNotes[lane], x = G.lanesX + lane * G.laneW + G.laneW / 2 - half;
            for (var i = laneNext[lane]; i < list.length; i++) {
              var n = list[i];
              if (n.hit) continue;
              var y = G.targetY + (n.t - t) * pxPerSec;
              if (y > H + s) break;
              if (n.missed) { if (y < -s) continue; c.globalAlpha = 0.3; }
              c.drawImage(sprites.arrows[n.beat][lane], x, y - half, s, s);
              c.globalAlpha = 1;
            }
          }
        }

        /* judgement and combo */
        var ft = now - flashAt;
        if (ft < 700 && live) {
          var midX = G.lanesX + G.laneW * 2, midY = G.targetY + (H - G.targetY) * 0.34, big = Math.min(44, G.laneW * 0.5);
          var zoom = reduced ? 1 : ft < 80 ? 1.25 - ft / 80 * 0.25 : 1;
          c.globalAlpha = ft > 500 ? 1 - (ft - 500) / 200 : 1;
          c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
          c.font = font(big * zoom);
          c.lineWidth = 7; c.strokeStyle = '#04201d'; c.strokeText(flashText, midX, midY);
          c.fillStyle = flashColour; c.fillText(flashText, midX, midY);
          if (flashSub) { c.font = font(15); c.lineWidth = 5; c.strokeText(flashSub, midX, midY + big * 0.72); c.fillStyle = '#f2fbf8'; c.fillText(flashSub, midX, midY + big * 0.72); }
          if (combo >= 4) {
            c.font = font(Math.min(28, G.laneW * 0.32)); c.lineWidth = 6;
            c.strokeText(comboText, midX, midY + big * 1.4); c.fillStyle = '#ffd23f'; c.fillText(comboText, midX, midY + big * 1.4);
          }
          c.globalAlpha = 1;
        }

        /* song progress along the bottom of the lanes */
        if (live && arr) {
          var p = clamp(t / arr.length, 0, 1);
          c.fillStyle = 'rgba(242,251,248,.14)'; c.fillRect(G.lanesX, H - 9, G.laneW * 4, 4);
          c.fillStyle = '#1fc8b9'; c.fillRect(G.lanesX, H - 9, G.laneW * 4 * p, 4);
        }

        /* countdown after a pause */
        if (resumeAt) {
          var left = Math.max(1, Math.ceil((resumeAt - now) / 1000));
          c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(76); c.lineWidth = 9; c.strokeStyle = '#04201d';
          c.strokeText(String(left), G.lanesX + G.laneW * 2, H / 2); c.fillStyle = '#ffd23f'; c.fillText(String(left), G.lanesX + G.laneW * 2, H / 2);
        }
      }

      /* ---------- the dancer: a silhouette in a backwards cap ---------- */
      var dOx = 0, dOy = 0, dH = 1;
      function X(j) { return dOx + pose[j] * dH; }
      function Y(j) { return dOy + pose[j + 1] * dH; }
      function drawDancer(c, now, beatPhase) {
        /* the pose for the last step you hit, held for a moment, otherwise bob to the beat */
        var name = target;
        if (now > poseUntil) name = state === 'playing' && !resumeAt ? (beatPhase < 0.5 ? 'bob' : 'idle') : 'idle';
        var tp = POSES[name], k = reduced ? 1 : 0.35, i;
        for (i = 0; i < 20; i++) pose[i] += (tp[i] - pose[i]) * k;
        var hgt = G.dancerH, ox = G.dancerX;
        dOx = ox; dOy = G.floorY - hgt * 0.04; dH = hgt;
        c.save();
        c.globalAlpha = G.wide ? 1 : 0.4;
        c.lineCap = 'round'; c.lineJoin = 'round';
        c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(ox, G.floorY, hgt * 0.22, hgt * 0.04, 0, 0, Math.PI * 2); c.fill();
        var dx = X(0) - X(2), dy = Y(0) - Y(2), dl = Math.sqrt(dx * dx + dy * dy) || 1;
        var hx = X(0) + dx / dl * hgt * 0.12, hy = Y(0) + dy / dl * hgt * 0.12;
        for (var pass = 0; pass < 2; pass++) {
          var extra = pass === 0 ? hgt * 0.045 : 0;
          c.strokeStyle = pass === 0 ? 'rgba(31,200,185,.5)' : '#ff3d9a';
          c.fillStyle = c.strokeStyle;
          c.lineWidth = hgt * 0.085 + extra;
          c.beginPath(); c.moveTo(X(2), Y(2)); c.lineTo(X(12), Y(12)); c.lineTo(X(14), Y(14)); c.stroke();
          c.beginPath(); c.moveTo(X(2), Y(2)); c.lineTo(X(16), Y(16)); c.lineTo(X(18), Y(18)); c.stroke();
          c.lineWidth = hgt * 0.14 + extra;
          c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(2), Y(2)); c.stroke();
          c.lineWidth = hgt * 0.065 + extra;
          c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(4), Y(4)); c.lineTo(X(6), Y(6)); c.stroke();
          c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(8), Y(8)); c.lineTo(X(10), Y(10)); c.stroke();
          c.beginPath(); c.arc(hx, hy, hgt * 0.085 + extra / 2, 0, Math.PI * 2); c.fill();
        }
        /* a backwards cap, very 1998 */
        c.fillStyle = '#ffd23f';
        c.beginPath(); c.arc(hx, hy - hgt * 0.015, hgt * 0.09, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill();
        c.fillRect(hx - hgt * 0.13, hy - hgt * 0.03, hgt * 0.07, hgt * 0.028);
        c.restore();
      }

      /* ---------- the main loop (runs only while a song is on) ---------- */
      function loop(now) {
        rafId = 0;
        if (destroyed) return;
        if (resumeAt && now >= resumeAt) {
          resumeAt = 0; clockOk = false;
          audioResume();
        }
        if (state === 'playing' && !resumeAt) {
          if (synth && synth.bus) synth.bus.out.gain.value = soundOn() ? 1 : 0;
          var t = heard(now), gw = win('good');
          /* arrows that went past without a step are a Miss */
          for (var lane = 0; lane < 4; lane++) {
            var list = laneNotes[lane];
            while (laneNext[lane] < list.length && (list[laneNext[lane]].hit || list[laneNext[lane]].missed) && list[laneNext[lane]].t < t - 1) laneNext[lane]++;
            for (var i = laneNext[lane]; i < list.length && list[i].t < t - gw; i++) if (!list[i].hit && !list[i].missed) judge(list[i], 'miss', 0, now);
          }
          if (t > arr.length - 0.6 && !endAt) endAt = now + 700;
          if (endAt && now >= endAt) finish();
        }
        draw(now);
        if (state === 'playing') rafId = requestAnimationFrame(loop);
      }
      function startLoop() { if (!rafId && !destroyed) rafId = requestAnimationFrame(loop); }
      function stopLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

      /* The music is handed to the audio system a quarter of a second ahead, a few notes at a time. */
      function schedule() {
        if (!actx || !synth || state !== 'playing' || resumeAt) return;
        var until = actx.currentTime + 0.25, ev = arr.events;
        while (evIdx < ev.length && T0 + ev[evIdx].t < until) {
          try { synth.play(ev[evIdx], Math.max(actx.currentTime, T0 + ev[evIdx].t), song); } catch (e) { /* keep going */ }
          evIdx++;
        }
      }

      /* ---------- stepping ---------- */
      function press(lane, perfMs) {
        if (lane < 0 || lane > 3) return;
        laneFlash[lane] = performance.now();
        if (state === 'calibrate') { calTap(perfMs); return; }
        if (state !== 'playing' || resumeAt) return;
        var t = heard(perfMs), list = laneNotes[lane], gw = win('good');
        for (var i = laneNext[lane]; i < list.length; i++) {
          var n = list[i];
          if (n.hit || n.missed) continue;
          var d = t - n.t;
          if (d < -gw) break;                 /* the next arrow is still too far away: no penalty */
          if (d <= gw) {
            var ad = Math.abs(d);
            judge(n, ad <= win('perfect') ? 'perfect' : ad <= win('great') ? 'great' : 'good', d, performance.now());
            return;
          }
        }
      }
      /* name, colour, points (out of 3), gauge change */
      var JUDGE = { perfect: ['PERFECT', '#ffd23f', 3, 2], great: ['GREAT', '#5ee6da', 2, 1], good: ['GOOD', '#c9b8ff', 1, 0], miss: ['MISS', '#ff6b9e', 0, 0] };
      function judge(n, kind, d, now) {
        var J = JUDGE[kind];
        if (kind === 'miss') {
          n.missed = true; counts.miss++; combo = 0;
          gauge = Math.max(0, gauge - L().miss);
          if (gauge === 0 && !gaugeEmptied) { gaugeEmptied = true; api.status('The gauge is empty! Keep dancing to fill it back up before the song ends.'); }
          target = 'miss'; poseUntil = now + 260;
        } else {
          n.hit = true; counts[kind]++; combo++; if (combo > maxCombo) maxCombo = combo;
          gauge = Math.min(100, gauge + J[3]);
          if (gaugeEmptied && gauge > 10) { gaugeEmptied = false; api.status('The gauge is filling up again. Keep going!'); }
          offsets += d; offsetN++;
          laneHit[n.lane] = now; laneHitCol[n.lane] = J[1];
          /* two arrows hit together make the dancer jump */
          var together = lastHitLane >= 0 && lastHitLane !== n.lane && Math.abs(now - lastHitAt) < 60;
          target = together ? 'jump' : LANE_POSE[n.lane]; poseUntil = now + 60 / song.bpm * 1000 * 0.55;
          lastHitLane = n.lane; lastHitAt = now;
          if (combo % 50 === 0 && combo !== lastMilestone) { lastMilestone = combo; api.status(combo + ' in a row! Keep it going.'); }
        }
        points += J[2];
        flashText = J[0]; flashColour = J[1]; flashAt = now;
        flashSub = kind === 'great' || kind === 'good' ? (d < 0 ? 'early' : 'late') : '';
        comboText = combo + ' COMBO';
      }

      /* ---------- song flow ---------- */
      function setPlayingUi(on) {
        stage.classList.toggle('is-playing', on); padRow.classList.toggle('is-playing', on);
        toolbar.classList.toggle('is-empty', !on);
      }
      function startSong() {
        api.unlockSound();
        if (!ensureAudio()) { api.status('Sorry, this browser cannot play the music for this game.'); return; }
        song = SONGS[songIdx];
        arr = arrange(song);
        chart = makeChart(song, arr, levelKey);
        laneNotes = [[], [], [], []]; laneNext = [0, 0, 0, 0];
        chart.forEach(function (n) { n.hit = false; n.missed = false; laneNotes[n.lane].push(n); });
        counts = { perfect: 0, great: 0, good: 0, miss: 0 }; combo = 0; maxCombo = 0; gauge = 50; points = 0;
        offsets = 0; offsetN = 0; gaugeEmptied = false; lastMilestone = 0; flashAt = -1e9; endAt = 0; resumeAt = 0;
        target = 'idle'; poseUntil = 0;
        synth.fadeOut();
        synth.newBus(song);
        synth.bus.out.gain.value = soundOn() ? 1 : 0;
        evIdx = 0;
        T0 = actx.currentTime + 0.7;
        state = 'playing'; clockOk = false;
        overlay.hidden = true;
        setPlayingUi(true);
        clearInterval(schedTimer); schedTimer = setInterval(schedule, 25); schedule();
        api.status('Dancing to ' + song.title + ' on ' + L().label + '. Step as each arrow reaches its outline at the top.' + (soundOn() ? '' : ' Sound is switched off at the top of the page, so the music is silent.'));
        showWholeStage();
        startLoop();
      }
      function pauseGame() {
        if (state !== 'playing') return;
        frozenSong = resumeAt ? frozenSong : heard(performance.now());
        state = 'paused'; resumeAt = 0;
        audioSuspend();
        stopLoop();
        releaseAll();
        showCard('pause');
        api.status('Paused. Press Resume when you are ready.');
        draw(performance.now());
      }
      function resumeGame() {
        if (state !== 'paused') return;
        overlay.hidden = true;
        state = 'playing';
        resumeAt = performance.now() + (reduced ? 1000 : 3000);
        api.status('Get ready… the song carries on after the countdown.');
        startLoop();
      }
      function quitToMenu() {
        if (synth) synth.fadeOut();
        audioResume();
        clearInterval(schedTimer); schedTimer = 0;
        state = 'menu'; resumeAt = 0; stopLoop();
        setPlayingUi(false); releaseAll();
        showCard('menu');
        api.status('Pick a song and a level, then press Start.');
        draw(performance.now());
      }
      var lastResult = null;
      function finish() {
        clearInterval(schedTimer); schedTimer = 0;
        state = 'results';
        setPlayingUi(false); releaseAll();
        var total = chart.length, pct = total ? points / (total * 3) * 100 : 0, passed = gauge > 0;
        var grade = gradeFor(pct), key = song.id + ':' + levelKey, old = bests[key];
        var isBest = passed && (!old || pct > old.pct);
        if (isBest) { bests[key] = { grade: grade, pct: Math.round(pct * 10) / 10 }; api.store.set('bests', bests); }
        var avg = offsetN ? Math.round(offsets / offsetN * 1000) : 0;
        lastResult = { passed: passed, grade: grade, pct: pct, isBest: isBest, avg: avg };
        showCard('results');
        if (passed) {
          api.status('Passed! Grade ' + grade + ' on ' + song.title + ' (' + L().label + '): ' + Math.round(pct) + ' per cent, best combo ' + maxCombo + '.' + (isBest ? ' A new best!' : ''));
          api.celebrate(isBest ? 'New best: grade ' + grade + ' on ' + song.title + '!' : 'Passed with grade ' + grade + '!');
        } else {
          api.sound('lose');
          api.status('Not passed this time: the gauge was empty at the end. You stepped on ' + (total - counts.miss) + ' of ' + total + ' arrows. Have another go, or try an easier level.');
        }
        later(function () { if (synth && state !== 'playing') synth.fadeOut(); }, 1800);
      }
      /* On a small screen, scroll so the stage and the pads are both in view while you dance. */
      function showWholeStage() {
        var top = stage.getBoundingClientRect().top, bottom = padRow.getBoundingClientRect().bottom, vh = window.innerHeight || 800, head = 76;
        var delta = 0;
        if (top < head) delta = top - head;
        else if (bottom > vh - 8) delta = Math.min(top - head, bottom - vh + 8);
        if (Math.abs(delta) > 4) window.scrollBy({ top: delta, behavior: reduced ? 'auto' : 'smooth' });
      }
      function releaseAll() { for (var i = 0; i < 4; i++) { laneDown[i] = false; pads[i].classList.remove('is-down'); } }

      /* ---------- the cards on the stage ---------- */
      var songBtns = [];
      function gradeOf(sid, lk) { var b = bests[sid + ':' + lk]; return b ? b.grade : ''; }
      function showCard(kind) {
        overlay.replaceChildren();
        overlay.hidden = false;
        var card = h('div', { class: 'dm-card' });
        if (kind === 'menu') {
          songBtns = SONGS.map(function (sg, i) {
            return h('button', { type: 'button', class: 'dm-song', 'aria-pressed': String(i === songIdx), onclick: function () { pickSong(i); } },
              h('strong', null, sg.title), h('span', null, sg.style + ' · ' + sg.bpm + ' beats a minute'),
              h('em', { title: 'Best grade on ' + L().label }, h('span', { class: 'visually-hidden' }, 'Best on ' + L().label + ': ' + (gradeOf(sg.id, levelKey) ? '' : 'none yet')), gradeOf(sg.id, levelKey)));
          });
          var seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Level' }, LEVEL_KEYS.map(function (k) {
            return h('button', { type: 'button', 'aria-pressed': String(k === levelKey), onclick: function () { pickLevel(k); } }, LEVELS[k].label);
          }));
          var out = h('output', null, offsetMs + ' ms');
          var delay = h('div', { class: 'dm-delay' }, h('span', null, 'Audio delay'),
            h('button', { type: 'button', class: 'btn dm-small', 'aria-label': 'Less audio delay', onclick: function () { setOffset(offsetMs - 10); out.textContent = offsetMs + ' ms'; } }, '−'),
            out,
            h('button', { type: 'button', class: 'btn dm-small', 'aria-label': 'More audio delay', onclick: function () { setOffset(offsetMs + 10); out.textContent = offsetMs + ' ms'; } }, '+'),
            h('button', { type: 'button', class: 'btn dm-small', onclick: function () { startCalibration(); } }, 'Tap test'));
          card.append(h('p', { class: 'dm-title' }, 'Dance Mat'),
            h('div', { class: 'dm-songs', role: 'group', 'aria-label': 'Songs' }, songBtns),
            h('div', { class: 'dm-row' }, seg),
            h('button', { type: 'button', class: 'btn btn-primary dm-big', onclick: function () { startSong(); } }, '▶ Start'),
            delay);
        } else if (kind === 'pause') {
          card.append(h('p', { class: 'dm-title' }, 'Paused'), h('p', { class: 'dm-msg' }, song.title + ' is waiting for you. A countdown starts when you resume.'),
            h('div', { class: 'dm-row' }, h('button', { type: 'button', class: 'btn btn-primary dm-big', onclick: function () { resumeGame(); } }, '▶ Resume'),
              h('button', { type: 'button', class: 'btn', onclick: function () { quitToMenu(); } }, 'Pick another song')));
        } else if (kind === 'results') {
          var r = lastResult;
          card.append(h('p', { class: 'dm-msg' }, song.title + ' · ' + L().label),
            h('p', { class: 'dm-grade' + (r.passed ? '' : ' is-small') }, r.passed ? r.grade : 'So close!'),
            h('p', { class: 'dm-msg' }, r.passed ? (r.isBest ? 'Passed, and a new best!' : 'Passed!') : 'The gauge was empty at the end. Have another go.'),
            h('div', { class: 'dm-stats' }, ['perfect', 'great', 'good', 'miss'].map(function (k) { return h('span', null, h('b', null, String(counts[k])), JUDGE[k][0].charAt(0) + JUDGE[k][0].slice(1).toLowerCase()); })),
            h('p', { class: 'dm-msg', style: { fontWeight: '500', fontSize: '.92rem' } }, 'Best combo ' + maxCombo + ' · ' + Math.round(r.pct) + '% · ' + (Math.abs(r.avg) < 12 ? 'right on the beat' : 'on average ' + Math.abs(r.avg) + ' ms ' + (r.avg < 0 ? 'early' : 'late'))),
            h('div', { class: 'dm-row' }, h('button', { type: 'button', class: 'btn btn-primary dm-big', onclick: function () { startSong(); } }, '▶ Again'),
              h('button', { type: 'button', class: 'btn', onclick: function () { quitToMenu(); } }, 'Pick another song')));
        } else if (kind === 'calibrate') {
          calMsg = h('p', { class: 'dm-msg' }, 'Listen for 8 beeps. Tap any pad, or press Space, exactly on each beep.');
          card.append(h('p', { class: 'dm-title' }, 'Tap test'), calMsg,
            h('div', { class: 'dm-row' }, h('button', { type: 'button', class: 'btn', onclick: function () { endCalibration(false); } }, 'Cancel')));
        } else if (kind === 'calibrated') {
          card.append(h('p', { class: 'dm-title' }, 'Tap test'), calMsg,
            h('div', { class: 'dm-row' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: function () { showCard('menu'); api.status('Pick a song and a level, then press Start.'); } }, 'Done'),
              h('button', { type: 'button', class: 'btn', onclick: function () { startCalibration(); } }, 'Try again')));
        }
        overlay.appendChild(card);
        var first = card.querySelector('.btn-primary');
        if (first && kind !== 'menu') try { first.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
      function pickSong(i) {
        songIdx = i; song = SONGS[i]; api.store.set('song', i);
        songBtns.forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === i)); });
        api.status(SONGS[i].title + ' (' + SONGS[i].style + '): ' + SONGS[i].blurb + ' Press Start.');
        preview(SONGS[i]);
        draw(performance.now());
      }
      /* A taste of the song: two bars from its liveliest part, then it fades away. */
      function preview(sg) {
        api.unlockSound();
        if (!soundOn() || !ensureAudio()) { api.sound('click'); return; }
        var a = arrange(sg), bar = 0, from = 0, bars = sg.bpm < 110 ? 2 : 4;
        for (var i = 0; i < sg.sections.length; i++) { if (sg.sections[i].energy === 3) { from = bar; break; } bar += sg.sections[i].bars; }
        var t0 = stepTime(sg, from * 16), t1 = stepTime(sg, (from + bars) * 16), now = actx.currentTime + 0.08;
        synth.fadeOut();
        var bus = synth.newBus(sg);
        for (var k = 0; k < a.events.length; k++) {
          var e = a.events[k];
          if (e.t >= t0 && e.t < t1) synth.play(e, now + e.t - t0, sg);
        }
        bus.out.gain.setValueAtTime(1, now + (t1 - t0) - 0.6);
        bus.out.gain.linearRampToValueAtTime(0, now + (t1 - t0) + 0.2);
      }
      function pickLevel(k) {
        levelKey = k; api.store.set('level', k);
        api.sound('click');
        showCard('menu');
        api.status(LEVELS[k].label + ': ' + (k === 'beginner' ? 'arrows land on the beat, never faster.' : k === 'basic' ? 'arrows on beats and half-beats, with a few jumps.' : 'quick steps, more jumps and faster arrows.'));
      }
      function setOffset(v) { offsetMs = clamp(Math.round(v), -150, 450); api.store.set('offset', offsetMs); api.sound('tick'); }

      /* ---------- audio delay test: tap along to 8 beeps ---------- */
      var calMsg = null, calBeats = [], calTaps = [];
      function startCalibration() {
        api.unlockSound();
        if (!soundOn()) { api.status('Switch sound on at the top of the page first: the tap test needs you to hear the beeps.'); api.sound('wrong'); return; }
        if (!ensureAudio()) return;
        synth.fadeOut();
        state = 'calibrate';
        showCard('calibrate');
        calBeats = []; calTaps = [];
        var t0 = actx.currentTime + 0.8;
        for (var i = 0; i < 8; i++) { calBeats.push(t0 + i * 0.6); synth.beep(t0 + i * 0.6, i % 4 === 0); }
        later(function () { if (state === 'calibrate') endCalibration(true); }, 800 + 8 * 600 + 600);
        api.status('Tap test: tap on each beep.');
      }
      function calTap(perfMs) {
        var at = audioAt(perfMs), nearest = null;
        for (var i = 0; i < calBeats.length; i++) if (nearest === null || Math.abs(at - calBeats[i]) < Math.abs(at - nearest)) nearest = calBeats[i];
        if (nearest !== null && Math.abs(at - nearest) < 0.45) calTaps.push(at - nearest);
        if (calMsg) calMsg.textContent = 'Tap ' + calTaps.length + ' of 8…';
      }
      function endCalibration(done) {
        state = 'menu';
        if (!done) { showCard('menu'); api.status('Pick a song and a level, then press Start.'); return; }
        var taps = calTaps.slice(2).sort(function (a, b) { return a - b; });
        if (taps.length < 3) {
          calMsg = h('p', { class: 'dm-msg' }, 'We did not catch enough taps. Try again, and tap on every beep.');
        } else {
          var med = taps[taps.length >> 1];
          setOffset(Math.round(med * 1000 / 5) * 5);
          calMsg = h('p', { class: 'dm-msg' }, 'You tapped ' + Math.abs(Math.round(med * 1000)) + ' ms ' + (med < 0 ? 'before' : 'after') + ' the beeps, so the audio delay is now ' + offsetMs + ' ms. Wireless headphones often need 150 to 300 ms.');
        }
        showCard('calibrated');
        api.status('Tap test finished. Audio delay: ' + offsetMs + ' ms.');
      }

      /* ---------- input ---------- */
      var KEYS = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3, d: 0, D: 0, f: 1, F: 1, j: 2, J: 2, k: 3, K: 3 };
      /* When the press really happened: the event's own time stamp, so a busy frame cannot make a good step late. */
      function evTime(e) {
        var now = performance.now(), ts = e && e.timeStamp;
        return ts && ts <= now + 1 && ts > now - 250 ? ts : now;
      }
      function onKeyDown(e) {
        if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
        var tgt = e.target;
        if (tgt && tgt.closest && tgt.closest('input, select, textarea')) return;
        if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && (state === 'playing' || state === 'paused')) {
          e.preventDefault();
          if (state === 'playing') pauseGame(); else if (e.key !== 'Escape') resumeGame();
          return;
        }
        if (state === 'calibrate' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); if (!e.repeat) press(0, evTime(e)); return; }
        var lane = KEYS[e.key];
        if (lane === undefined || (state !== 'playing' && state !== 'calibrate')) return;
        e.preventDefault();
        if (e.repeat) return;
        laneDown[lane] = true; pads[lane].classList.add('is-down');
        press(lane, evTime(e));
      }
      function onKeyUp(e) {
        var lane = KEYS[e.key];
        if (lane === undefined) return;
        laneDown[lane] = false; pads[lane].classList.remove('is-down');
      }
      pads.forEach(function (pad, lane) {
        pad.addEventListener('pointerdown', function (e) {
          if (e.button > 0) return;
          api.unlockSound();
          if (state === 'playing' || state === 'calibrate') e.preventDefault();
          laneDown[lane] = true; pad.classList.add('is-down');
          press(lane, evTime(e));
          if (state !== 'playing') draw(performance.now());
        });
        function up() { laneDown[lane] = false; pad.classList.remove('is-down'); }
        pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up); pad.addEventListener('pointerleave', up);
        pad.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      });
      /* the lanes on the stage can be tapped too */
      function onCanvasDown(e) {
        if (state !== 'playing' && state !== 'calibrate') return;
        e.preventDefault();
        var r = canvas.getBoundingClientRect(), lane = state === 'calibrate' ? 0 : Math.floor((e.clientX - r.left - G.lanesX) / G.laneW);
        if (lane >= 0 && lane < 4) press(lane, evTime(e));
      }
      canvas.addEventListener('pointerdown', onCanvasDown);
      canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      function onVisibility() { if (document.hidden && state === 'playing') pauseGame(); }
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      document.addEventListener('visibilitychange', onVisibility);

      function later(fn, ms) { var id = setTimeout(function () { timers.splice(timers.indexOf(id), 1); if (!destroyed) fn(); }, ms); timers.push(id); return id; }

      /* ---------- read-only test hook ---------- */
      canvas.gitTest = function () {
        var now = performance.now();
        return {
          state: state, resuming: !!resumeAt, song: song.id, level: levelKey, offsetMs: offsetMs,
          songTimeNow: state === 'playing' && !resumeAt ? heard(now) : null, perfNow: now, length: arr ? arr.length : 0,
          notes: chart.map(function (n) { return [n.lane, n.t]; }),
          counts: { perfect: counts.perfect, great: counts.great, good: counts.good, miss: counts.miss }, combo: combo, maxCombo: maxCombo, gauge: gauge,
          audio: actx ? actx.state : 'none'
        };
      };

      /* ---------- start ---------- */
      var lastW = 0;
      var ro = new ResizeObserver(function () { var w = stage.clientWidth; if (w && w !== lastW) { lastW = w; resize(); } });
      ro.observe(stage);
      var poster = getComputedStyle(root).getPropertyValue('--font-poster').trim();
      if (poster) FONT = poster;
      pickWeight();
      if (document.fonts && document.fonts.load) document.fonts.load('40px Bungee').then(function () { if (!destroyed) { pickWeight(); draw(performance.now()); } }, function () {});
      resize();
      showCard('menu');
      api.status('Pick a song and a level, then press Start.');

      return {
        destroy: function () {
          destroyed = true;
          stopLoop();
          clearInterval(schedTimer);
          timers.forEach(clearTimeout); timers = [];
          ro.disconnect();
          document.removeEventListener('keydown', onKeyDown);
          document.removeEventListener('keyup', onKeyUp);
          document.removeEventListener('visibilitychange', onVisibility);
          if (actx) { try { actx.close(); } catch (e) { /* ignore */ } }
          actx = null; synth = null;
        }
      };
    }
  });
})();
