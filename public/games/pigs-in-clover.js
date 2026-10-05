/* Pigs in Clover, Charles Martin Crandall's tilt puzzle of 1889.
   A round tin box with three rings, each with one gap. Tilt the box to roll the four marble pigs from the outside
   through every gap into the pen in the middle. Pigs already in the pen can roll back out.
   Physics: gravity follows the tilt, rolling friction slows the pigs, each ring is a circle with an arc missing
   (the ends of the arc are round posts), and pigs bounce off walls and off each other. The sum runs in small
   steps (240 a second) so a fast pig can never jump through a wall.
   See docs/ADDING-A-GAME.md for the contract this file follows. */
(function () {
  'use strict';

  var MR = 7.2;                 /* marble radius (the box is 100 units from centre to inside of the rim) */
  var T = 3.6;                  /* thickness of a ring wall */
  var RIM = 96 + T / 2;         /* centre line of the rim wall, so its inside face is at 96 */
  var RINGS = [75, 50, 27];     /* centre lines of the three rings, outside to inside */
  var PEN_IN = 19.5, PEN_OUT = 24.5;
  var G = 330;                  /* acceleration at full tilt, units per second squared */
  var FRICTION = 1.05, MAXV = 360, E_WALL = 0.42, E_PIG = 0.8, STEP = 1 / 240;
  var NPIGS = 4;

  function parseColour(s) {
    s = (s || '').trim();
    var m;
    if (s.charAt(0) === '#') {
      var hx = s.slice(1);
      if (hx.length === 3) hx = hx.split('').map(function (c) { return c + c; }).join('');
      var n = parseInt(hx.slice(0, 6), 16);
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    }
    if ((m = s.match(/rgba?\(([^)]+)\)/))) { var p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2]]; }
    return [128, 128, 128];
  }
  function rgba(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')'; }
  function mix(c1, c2, t) { return [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t]; }
  function clock(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function angDiff(a, b) { var d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }

  GamesInTime.register({
    id: 'pigs-in-clover',
    frame: 'tin',
    mount: function (root, api) {
      var h = api.h;
      root.appendChild(h('style', null,
        '.game-pigs-in-clover .game-toolbar { justify-content: center; }' +
        '.game-pigs-in-clover .scoreboard { justify-content: center; font-family: var(--font-mono); font-size: 1rem; color: var(--ink); }' +
        '.game-pigs-in-clover .pc-stage { display: flex; justify-content: center; }' +
        '.game-pigs-in-clover .pc-canvas { display: block; max-width: 100%; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; border-radius: 50%; cursor: crosshair; }' +
        '.game-pigs-in-clover .pc-canvas:focus-visible { outline: 3px solid var(--focus); outline-offset: 4px; }' +
        '.game-pigs-in-clover .pc-tilt[aria-pressed="true"] { background: var(--gold); border-color: var(--gold); color: var(--on-era); }' +
        '.game-pigs-in-clover .seg button { min-width: 44px; padding: .45rem .8rem; }' +
        '.game-pigs-in-clover .game-note { text-align: center; }'));

      var cs = getComputedStyle(root);
      function cssVar(n, fb) { var s = cs.getPropertyValue(n).trim(); return s || fb; }
      var C = {};
      [['ink', '--ink'], ['bg', '--bg'], ['surface', '--surface'], ['surface2', '--surface-2'], ['gold', '--gold'], ['vermilion', '--vermilion'], ['peacock', '--peacock'],
        ['cobalt', '--cobalt'], ['rose', '--rose'], ['leaf', '--leaf'], ['red', '--red'], ['green', '--green'], ['brand', '--brand'], ['goldShadow', '--gold-shadow']]
        .forEach(function (x) { C[x[0]] = parseColour(cssVar(x[1], '#888')); });
      C.pig = mix(mix(C.vermilion, C.rose, 0.5), C.ink, 0.5);
      C.pigDark = mix(C.pig, C.vermilion, 0.45);
      C.clover = mix(mix(C.leaf, C.peacock, 0.55), C.bg, 0.35);
      var FONT_POSTER = cssVar('--font-poster', 'Georgia, serif');

      /* ---------- state ---------- */
      var level = api.store.get('level', 'classic') === 'easy' ? 'easy' : 'classic';
      var best = api.store.get('best', {});
      var walls = [], pigs = [], tilt = { x: 0, y: 0 }, target = { x: 0, y: 0 };
      var keys = {}, pointerTilt = null, deviceTilt = null, deviceOn = false, deviceTimer = 0, base = null;
      var won = false, wonAt = 0, allInSince = 0, started = false, elapsed = 0, runFrom = 0, ticker = null, finalSecs = 0;
      var raf = 0, last = 0, destroyed = false, sparks = [], floaters = [], shown = '', lastInCount = 0;
      var S = 300, dpr = 1, k = 1, boxCanvas = document.createElement('canvas');

      /* ---------- DOM ---------- */
      var newBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { newGame(true); canvas.focus({ preventScroll: true }); } }, 'New game');
      var levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Gap size' });
      [['easy', 'Wide gaps'], ['classic', 'Narrow gaps']].forEach(function (lv) {
        levelSeg.appendChild(h('button', { type: 'button', 'data-level': lv[0], 'aria-pressed': String(level === lv[0]), onclick: function () { level = lv[0]; api.store.set('level', level); syncSeg(); newGame(true); } }, lv[1]));
      });
      var hasOrientation = typeof window.DeviceOrientationEvent !== 'undefined';
      var tiltBtn = h('button', { class: 'btn pc-tilt', type: 'button', 'aria-pressed': 'false', hidden: !hasOrientation, onclick: toggleDevice }, 'Tilt your device');
      root.appendChild(h('div', { class: 'game-toolbar' }, newBtn, levelSeg, tiltBtn));
      var penEl = h('span'), timeEl = h('span'), bestEl = h('span');
      root.appendChild(h('div', { class: 'scoreboard', role: 'group', 'aria-label': 'Progress' }, penEl, timeEl, bestEl));
      var canvas = h('canvas', { class: 'pc-canvas', tabindex: '0', role: 'img', 'aria-describedby': 'pc-help' });
      var ctx = canvas.getContext('2d');
      root.appendChild(h('div', { class: 'pc-stage' }, canvas));
      root.appendChild(h('p', { class: 'game-note', id: 'pc-help' },
        'Tilt the box with the arrow keys or W A S D (hold Shift for a gentle tilt), or press and hold on the box where you want the pigs to roll. ',
        'On a phone or tablet, press Tilt your device and tip it gently.'));
      function syncSeg() { Array.prototype.forEach.call(levelSeg.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-level') === level)); }); }
      function say(t) { if (t !== shown) { shown = t; api.status(t); } }

      /* ---------- the box ---------- */
      function buildWalls() {
        var rnd = api.random, a = rnd() * Math.PI * 2, opening = 2 * MR + (level === 'easy' ? 8.5 : 3.2);
        walls = [{ r: RIM, gap: null }];
        RINGS.forEach(function (r, i) {
          if (i) a += Math.PI * (0.62 + rnd() * 0.76);
          walls.push({ r: r, gap: { a: a, half: (opening + T) / 2 / r } });
        });
      }
      function placePigs() {
        var g1 = walls[1].gap.a, mid = (RIM - T / 2 + RINGS[0] + T / 2) / 2;
        pigs = [];
        for (var i = 0; i < NPIGS; i++) {
          var a = g1 + Math.PI * (0.38 + i * 0.42) + (api.random() - 0.5) * 0.12;
          pigs.push({ x: Math.cos(a) * mid, y: Math.sin(a) * mid, vx: 0, vy: 0, inPen: false, lastHit: 0, face: { x: 0, y: 0 }, bump: 0 });
        }
      }

      /* ---------- physics ---------- */
      function closest(w, x, y) {
        var d = Math.hypot(x, y) || 1e-6;
        if (w.gap) {
          var diff = angDiff(Math.atan2(y, x), w.gap.a);
          if (Math.abs(diff) < w.gap.half) { var e = diff > 0 ? w.gap.a + w.gap.half : w.gap.a - w.gap.half; return [w.r * Math.cos(e), w.r * Math.sin(e)]; }
        }
        return [w.r * x / d, w.r * y / d];
      }
      function step(dt, now) {
        var ax = tilt.x * G, ay = tilt.y * G, damp = Math.exp(-FRICTION * dt), minD = MR + T / 2;
        pigs.forEach(function (m) {
          m.vx = (m.vx + ax * dt) * damp; m.vy = (m.vy + ay * dt) * damp;
          var sp = Math.hypot(m.vx, m.vy);
          if (sp > MAXV) { m.vx *= MAXV / sp; m.vy *= MAXV / sp; }
          m.x += m.vx * dt; m.y += m.vy * dt;
        });
        /* pigs bump each other */
        for (var it = 0; it < 2; it++) for (var i = 0; i < pigs.length; i++) for (var j = i + 1; j < pigs.length; j++) {
          var a = pigs[i], b = pigs[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d >= 2 * MR || d < 1e-6) continue;
          var nx = dx / d, ny = dy / d, over = (2 * MR - d) / 2;
          a.x -= nx * over; a.y -= ny * over; b.x += nx * over; b.y += ny * over;
          var vr = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (vr < 0) {
            var jn = -(1 + E_PIG) * vr / 2;
            a.vx -= jn * nx; a.vy -= jn * ny; b.vx += jn * nx; b.vy += jn * ny;
            if (-vr > 40 && it === 0) clink(-vr, now, a, 2300);
          }
        }
        /* walls: the rim and three rings with a gap each */
        pigs.forEach(function (m) {
          for (var w = 0; w < walls.length; w++) {
            var c = closest(walls[w], m.x, m.y), nx = m.x - c[0], ny = m.y - c[1], d = Math.hypot(nx, ny);
            if (d >= minD) continue;
            if (d < 1e-6) { var r = Math.hypot(m.x, m.y) || 1; nx = m.x / r; ny = m.y / r; d = 1e-6; } else { nx /= d; ny /= d; }
            m.x += nx * (minD - d); m.y += ny * (minD - d);
            var vn = m.vx * nx + m.vy * ny;
            if (vn < 0) {
              m.vx -= (1 + E_WALL) * vn * nx; m.vy -= (1 + E_WALL) * vn * ny;
              m.vx *= 0.985; m.vy *= 0.985;
              if (-vn > 25) clink(-vn, now, m, 1500);
            }
          }
        });
      }
      /* A soft click, louder for a harder hit. */
      function clink(speed, now, m, freq) {
        if (now - m.lastHit < 55) return;
        m.lastHit = now;
        m.bump = Math.min(1, speed / 260);
        if (api.tone) api.tone(freq + api.random() * 500, 0.035, 'triangle', Math.min(0.12, 0.012 + speed / 2600));
        else if (speed > 120) api.sound('tick');
      }
      function penCheck(now) {
        var count = 0;
        pigs.forEach(function (m) {
          var r = Math.hypot(m.x, m.y);
          if (!m.inPen && r < PEN_IN) {
            m.inPen = true;
            api.sound('bell');
            burst(m.x, m.y, now);
            floaters.push({ x: m.x, y: m.y, t0: now, text: 'In!' });
          } else if (m.inPen && r > PEN_OUT) {
            m.inPen = false;
            if (api.tone) api.tone(330, 0.18, 'triangle', 0.08);
            floaters.push({ x: m.x, y: m.y, t0: now, text: 'Out!' });
            say('Oh no, a pig rolled out of the pen! Ease it back in.');
          }
          if (m.inPen) count++;
        });
        if (count !== lastInCount) {
          if (count > lastInCount && count < NPIGS) say(count + ' of ' + NPIGS + ' pigs in the pen. Careful, they can roll back out!');
          lastInCount = count;
          renderScore();
        }
        if (count === NPIGS) { if (!allInSince) allInSince = now; else if (now - allInSince > 600) win(); }
        else allInSince = 0;
      }
      function burst(x, y, now) {
        if (api.reducedMotion) return;
        for (var i = 0; i < 14; i++) {
          var a = api.random() * Math.PI * 2, sp = 20 + api.random() * 45;
          sparks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t0: now, life: 500 + api.random() * 300, c: i % 3 });
        }
      }

      /* ---------- the clock ---------- */
      function seconds() { return (elapsed + (runFrom ? performance.now() - runFrom : 0)) / 1000; }
      function startClock() { if (started || won) return; started = true; runFrom = performance.now(); ticker = setInterval(renderTime, 500); }
      function stopClock() { if (runFrom) { elapsed += performance.now() - runFrom; runFrom = 0; } if (ticker) { clearInterval(ticker); ticker = null; } }
      function renderTime() { timeEl.textContent = 'Time ' + clock(won ? finalSecs : seconds()); }
      function renderScore() {
        var n = pigs.filter(function (m) { return m.inPen; }).length;
        penEl.textContent = 'In the pen: ' + n + ' of ' + NPIGS;
        renderTime();
        bestEl.textContent = best[level] ? 'Best: ' + clock(best[level]) : 'Best: not yet';
        canvas.setAttribute('aria-label', 'A round tin box with three rings and a pen in the middle. ' + n + ' of ' + NPIGS + ' pink marble pigs are in the pen.' + (won ? ' All of them are in. You win.' : ''));
      }
      function win() {
        won = true; wonAt = performance.now(); stopClock();
        finalSecs = Math.max(1, Math.floor(seconds()));
        var old = best[level], newBest = !old || finalSecs < old;
        if (newBest) { best[level] = finalSecs; api.store.set('best', best); }
        keys = {}; pointerTilt = null; target.x = target.y = 0;
        renderScore();
        say('All four pigs are in the pen in ' + clock(finalSecs) + '!' + (newBest && old ? ' A new best time.' : newBest ? '' : ' Your best is ' + clock(old) + '.'));
        api.celebrate('All four pigs in the pen! ' + clock(finalSecs));
        wake();
      }

      /* ---------- input: keys, pointer, device ---------- */
      var KEYMAP = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
      var shiftHeld = false;
      function keyName(ev) { return ev.key && ev.key.length === 1 ? ev.key.toLowerCase() : ev.key; }
      function updateTarget() {
        if (won) { target.x = target.y = 0; return; }
        if (pointerTilt) { target.x = pointerTilt.x; target.y = pointerTilt.y; return; }
        var x = 0, y = 0, n = 0;
        Object.keys(keys).forEach(function (kk) { var v = KEYMAP[kk]; if (v) { x += v[0]; y += v[1]; n++; } });
        if (n && (x || y)) { var l = Math.hypot(x, y) || 1, mag = shiftHeld ? 0.32 : 0.72; target.x = x / l * mag; target.y = y / l * mag; return; }
        if (deviceTilt) { target.x = deviceTilt.x; target.y = deviceTilt.y; return; }
        target.x = target.y = 0;
      }
      function onKeyDown(ev) {
        if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
        if (ev.key === 'Shift') { shiftHeld = true; updateTarget(); return; }
        var kn = keyName(ev);
        if (!KEYMAP[kn]) return;
        var tag = ev.target && ev.target.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
        ev.preventDefault();
        if (won) return;
        keys[kn] = true; shiftHeld = ev.shiftKey;
        api.unlockSound && api.unlockSound();
        startClock(); updateTarget(); wake();
      }
      function onKeyUp(ev) {
        if (ev.key === 'Shift') { shiftHeld = false; updateTarget(); wake(); return; }
        var kn = keyName(ev);
        if (keys[kn]) { delete keys[kn]; updateTarget(); wake(); }
      }
      function onBlur() { keys = {}; shiftHeld = false; updateTarget(); }
      function pointerVec(ev) {
        var r = canvas.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var dx = (ev.clientX - cx) / (r.width * 0.4), dy = (ev.clientY - cy) / (r.height * 0.4), l = Math.hypot(dx, dy);
        if (l > 1) { dx /= l; dy /= l; }
        return { x: dx, y: dy };
      }
      var pointerId = null;
      function onDown(ev) {
        if (ev.button > 0 || won) return;
        ev.preventDefault();
        pointerId = ev.pointerId;
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
        if (document.activeElement !== canvas) canvas.focus({ preventScroll: true });
        pointerTilt = pointerVec(ev);
        api.unlockSound && api.unlockSound();
        startClock(); updateTarget(); wake();
      }
      function onMove(ev) { if (pointerId !== ev.pointerId || !pointerTilt) return; pointerTilt = pointerVec(ev); updateTarget(); wake(); }
      function onUp(ev) {
        if (pointerId !== ev.pointerId) return;
        pointerId = null; pointerTilt = null;
        try { canvas.releasePointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
        updateTarget(); wake();
      }
      function onOrientation(ev) {
        if (ev.beta == null || ev.gamma == null) return;
        if (deviceTimer) { clearTimeout(deviceTimer); deviceTimer = 0; say('Tip your device gently to roll the pigs. Hold it the way you like: that is level.'); }
        var ang = (window.screen && window.screen.orientation && window.screen.orientation.angle) || window.orientation || 0;
        var a = ang * Math.PI / 180, gx = ev.gamma, gy = ev.beta;
        var x = gx * Math.cos(a) + gy * Math.sin(a), y = -gx * Math.sin(a) + gy * Math.cos(a);
        if (!base) base = { x: x, y: y };
        var tx = (x - base.x) / 22, ty = (y - base.y) / 22, l = Math.hypot(tx, ty);
        if (l > 1) { tx /= l; ty /= l; }
        deviceTilt = { x: tx, y: ty };
        if (Math.abs(tx) + Math.abs(ty) > 0.08) startClock();
        updateTarget(); wake();
      }
      function stopDevice(msg) {
        deviceOn = false; deviceTilt = null; base = null;
        window.removeEventListener('deviceorientation', onOrientation);
        if (deviceTimer) { clearTimeout(deviceTimer); deviceTimer = 0; }
        tiltBtn.setAttribute('aria-pressed', 'false');
        if (msg) say(msg);
        updateTarget();
      }
      function startDevice() {
        deviceOn = true; base = null;
        tiltBtn.setAttribute('aria-pressed', 'true');
        window.addEventListener('deviceorientation', onOrientation);
        say('Tilt is on. Tip your device gently.');
        deviceTimer = setTimeout(function () { deviceTimer = 0; stopDevice('This device does not tell the page how it is tilted. Use the arrow keys or press on the box instead.'); }, 1800);
      }
      function toggleDevice() {
        api.unlockSound && api.unlockSound();
        if (deviceOn) { stopDevice('Tilt is off. Use the arrow keys or press on the box.'); return; }
        var DOE = window.DeviceOrientationEvent;
        if (DOE && typeof DOE.requestPermission === 'function') {
          DOE.requestPermission().then(function (state) {
            if (destroyed) return;
            if (state === 'granted') startDevice(); else stopDevice('Tilt was not allowed, so use the arrow keys or press on the box.');
          }).catch(function () { if (!destroyed) stopDevice('Tilt is not available here. Use the arrow keys or press on the box.'); });
        } else startDevice();
      }

      /* ---------- loop ---------- */
      function wake() { if (!raf && !destroyed && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
      function frame(now) {
        raf = 0;
        if (destroyed) return;
        var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
        last = now;
        var ease = 1 - Math.exp(-dt * 9);
        tilt.x += (target.x - tilt.x) * ease; tilt.y += (target.y - tilt.y) * ease;
        if (!won) {
          for (var t = 0; t < dt - 1e-9; t += STEP) step(Math.min(STEP, dt - t), now);
          penCheck(now);
        }
        pigs.forEach(function (m) {
          var sp = Math.hypot(m.vx, m.vy) || 1, f = Math.min(1, sp / 120);
          m.face.x += (m.vx / sp * f * 0.2 - m.face.x) * 0.2; m.face.y += (m.vy / sp * f * 0.2 - m.face.y) * 0.2;
          m.bump *= 0.86;
        });
        sparks = sparks.filter(function (s) { return now - s.t0 < s.life; });
        floaters = floaters.filter(function (f) { return now - f.t0 < 900; });
        draw(now);
        var moving = pigs.some(function (m) { return Math.abs(m.vx) + Math.abs(m.vy) > 0.6; });
        var tilting = Math.abs(tilt.x) + Math.abs(tilt.y) > 0.004 || Math.abs(target.x) + Math.abs(target.y) > 0;
        var busy = moving || tilting || sparks.length || floaters.length || (won && now - wonAt < 2400);
        if (!busy) pigs.forEach(function (m) { m.vx = m.vy = 0; });
        if (busy && !document.hidden) raf = requestAnimationFrame(frame);
      }
      function onVisibility() {
        if (document.hidden) {
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
          if (runFrom) { elapsed += performance.now() - runFrom; runFrom = 0; }
          if (ticker) { clearInterval(ticker); ticker = null; }
          keys = {}; pointerTilt = null; updateTarget();
        } else {
          if (started && !won && !runFrom) { runFrom = performance.now(); ticker = setInterval(renderTime, 500); }
          wake();
        }
      }

      /* ---------- drawing ---------- */
      function desiredSize() {
        var w = Math.max(240, Math.floor(root.clientWidth || 300));
        var availH = Math.max(260, (window.innerHeight || 700) - 255);
        return Math.floor(Math.min(w, availH, 760));
      }
      function layout() {
        S = desiredSize();
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.style.width = S + 'px'; canvas.style.height = S + 'px';
        canvas.width = Math.round(S * dpr); canvas.height = Math.round(S * dpr);
        k = S / 2 / 109;
        paintBox();
        wake();
      }
      /* The tin itself, painted once: brass rim, clover floor, lettering, the pen and the three red fences. */
      function paintBox() {
        boxCanvas.width = canvas.width; boxCanvas.height = canvas.height;
        var g = boxCanvas.getContext('2d');
        g.setTransform(dpr * k, 0, 0, dpr * k, S * dpr / 2, S * dpr / 2);
        /* rim */
        var rg = g.createRadialGradient(-30, -40, 20, 0, 0, 109);
        rg.addColorStop(0, rgba(mix(C.gold, C.ink, 0.35))); rg.addColorStop(0.7, rgba(C.gold)); rg.addColorStop(1, rgba(C.goldShadow));
        g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 108.5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = rgba(C.vermilion); g.lineWidth = 3.2; g.beginPath(); g.arc(0, 0, 103.6, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = rgba(mix(C.ink, C.gold, 0.4)); g.lineWidth = 0.7; g.beginPath(); g.arc(0, 0, 105.6, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(0, 0, 101.6, 0, Math.PI * 2); g.stroke();
        /* the field round the tracks: painted tin with a lithographer's stipple and a few clover leaves */
        var fg = g.createRadialGradient(-20, -30, 10, 0, 0, 100);
        fg.addColorStop(0, rgba(mix(C.clover, C.surface2, 0.2))); fg.addColorStop(1, rgba(mix(C.clover, C.bg, 0.45)));
        g.fillStyle = fg; g.beginPath(); g.arc(0, 0, 100, 0, Math.PI * 2); g.fill();
        var seed = 7, i, a, r, x, y, s;
        function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
        function leaf3(cx, cy, size, rot) {
          for (var l = 0; l < 3; l++) { var la = rot + l * Math.PI * 2 / 3; g.beginPath(); g.arc(cx + Math.cos(la) * size, cy + Math.sin(la) * size, size, 0, Math.PI * 2); g.fill(); }
        }
        g.fillStyle = rgba(C.ink, 0.06);
        for (i = 0; i < 900; i++) { a = rnd() * Math.PI * 2; r = Math.sqrt(rnd()) * 99; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, 0.35, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = rgba(mix(C.clover, C.leaf, 0.4), 0.42);
        for (i = 0; i < 110; i++) { a = rnd() * Math.PI * 2; r = 30 + Math.sqrt(rnd()) * 66; leaf3(Math.cos(a) * r, Math.sin(a) * r, 1.1 + rnd() * 0.8, rnd() * Math.PI); }
        /* lettering printed on the floor */
        g.fillStyle = rgba(C.gold, 0.72);
        arcText(g, 'PIGS  IN  CLOVER', 87, -Math.PI / 2, 7.5);
        arcText(g, '★  1889  ★', 87, Math.PI / 2, 6.5, true);
        /* the pen: a patch of lush clover, which is what every pig wants */
        var pr = RINGS[2] - 1.5;
        var pg = g.createRadialGradient(-4, -6, 2, 0, 0, pr);
        pg.addColorStop(0, rgba(mix(C.leaf, C.ink, 0.2))); pg.addColorStop(1, rgba(mix(C.leaf, C.peacock, 0.55)));
        g.fillStyle = pg; g.beginPath(); g.arc(0, 0, pr, 0, Math.PI * 2); g.fill();
        g.save(); g.beginPath(); g.arc(0, 0, pr, 0, Math.PI * 2); g.clip();
        g.fillStyle = rgba(mix(C.peacock, C.leaf, 0.3), 0.85);
        for (i = 0; i < 30; i++) { a = rnd() * Math.PI * 2; r = Math.sqrt(rnd()) * pr; leaf3(Math.cos(a) * r, Math.sin(a) * r, 1.6 + rnd() * 1.2, rnd() * Math.PI); }
        for (i = 0; i < 9; i++) {
          a = rnd() * Math.PI * 2; r = 4 + rnd() * (pr - 7); x = Math.cos(a) * r; y = Math.sin(a) * r; s = 0.75;
          g.fillStyle = rgba(i % 3 ? mix(C.rose, C.ink, 0.45) : C.ink, 0.95);
          for (var f = 0; f < 7; f++) { var fa = f * Math.PI * 2 / 6; g.beginPath(); g.arc(x + (f ? Math.cos(fa) * s * 1.3 : 0), y + (f ? Math.sin(fa) * s * 1.3 : 0), s, 0, Math.PI * 2); g.fill(); }
        }
        g.restore();
        g.fillStyle = rgba(C.bg, 0.55); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '5px ' + FONT_POSTER;
        g.fillText('THE PEN', 0.4, pr - 5.6);
        g.fillStyle = rgba(C.ink, 0.95); g.fillText('THE PEN', 0, pr - 6);
        /* fences: shadow, paint, highlight */
        walls.forEach(function (w, n) {
          if (!n) return;
          var a0 = w.gap.a + w.gap.half, a1 = w.gap.a - w.gap.half + Math.PI * 2;
          g.lineCap = 'round';
          g.strokeStyle = rgba(C.bg, 0.45); g.lineWidth = T + 1.2; g.beginPath(); g.arc(1.1, 1.6, w.r, a0, a1); g.stroke();
          g.strokeStyle = rgba(C.vermilion); g.lineWidth = T; g.beginPath(); g.arc(0, 0, w.r, a0, a1); g.stroke();
          g.strokeStyle = rgba(mix(C.vermilion, C.ink, 0.55), 0.85); g.lineWidth = 0.8; g.beginPath(); g.arc(-0.5, -0.7, w.r, a0, a1); g.stroke();
          /* gold posts at each end of the gap */
          [a0, a1].forEach(function (aa) { g.fillStyle = rgba(C.gold); g.beginPath(); g.arc(Math.cos(aa) * w.r, Math.sin(aa) * w.r, T * 0.62, 0, Math.PI * 2); g.fill(); });
        });
        /* the inside of the rim casts a shadow on the floor */
        var sh = g.createRadialGradient(0, 0, 88, 0, 0, 100);
        sh.addColorStop(0, rgba(C.bg, 0)); sh.addColorStop(1, rgba(C.bg, 0.35));
        g.fillStyle = sh; g.beginPath(); g.arc(0, 0, 100, 0, Math.PI * 2); g.fill();
      }
      function arcText(g, text, r, mid, size, flip) {
        g.save();
        g.font = size + 'px ' + FONT_POSTER; g.textAlign = 'center'; g.textBaseline = 'middle';
        var widths = text.split('').map(function (ch) { return g.measureText(ch).width; }), total = widths.reduce(function (s, x) { return s + x; }, 0);
        var ang = mid - (flip ? -1 : 1) * total / r / 2;
        text.split('').forEach(function (ch, i) {
          var a = ang + (flip ? -1 : 1) * (widths[i] / 2) / r;
          g.save(); g.translate(Math.cos(a) * r, Math.sin(a) * r); g.rotate(a + (flip ? -Math.PI / 2 : Math.PI / 2)); g.fillText(ch, 0, 0); g.restore();
          ang += (flip ? -1 : 1) * widths[i] / r;
        });
        g.restore();
      }
      function draw(now) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        /* the box leans a little the way it is tilted */
        var ox = tilt.x * 3 * dpr, oy = tilt.y * 3 * dpr;
        ctx.save();
        ctx.translate(S * dpr / 2 + ox, S * dpr / 2 + oy);
        ctx.scale(1 - Math.abs(tilt.x) * 0.025, 1 - Math.abs(tilt.y) * 0.025);
        ctx.translate(-S * dpr / 2, -S * dpr / 2);
        ctx.drawImage(boxCanvas, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(S * dpr / 2 + ox, S * dpr / 2 + oy);
        ctx.scale(dpr * k * (1 - Math.abs(tilt.x) * 0.025), dpr * k * (1 - Math.abs(tilt.y) * 0.025));
        /* the downhill side of the floor darkens a little */
        if (Math.abs(tilt.x) + Math.abs(tilt.y) > 0.02) {
          var lg = ctx.createLinearGradient(-tilt.x * 100, -tilt.y * 100, tilt.x * 100, tilt.y * 100);
          lg.addColorStop(0, rgba(C.ink, 0)); lg.addColorStop(1, rgba(C.bg, 0.22 * Math.min(1, Math.hypot(tilt.x, tilt.y))));
          ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.fill();
        }
        sparks.forEach(function (s) {
          var t = (now - s.t0) / s.life, x = s.x + s.vx * t, y = s.y + s.vy * t, r = 2.2 * (1 - t);
          ctx.fillStyle = rgba(s.c === 0 ? C.gold : s.c === 1 ? C.leaf : C.ink, 1 - t);
          ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); ctx.fill();
        });
        pigs.forEach(function (m) { drawPig(m, now); });
        /* glass shine */
        var gl = ctx.createLinearGradient(-80, -90, 20, 40);
        gl.addColorStop(0, rgba(C.ink, 0.2)); gl.addColorStop(0.45, rgba(C.ink, 0.05)); gl.addColorStop(0.5, rgba(C.ink, 0));
        ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(-22 - tilt.x * 4, -26 - tilt.y * 4, 82, 58, -0.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = rgba(C.ink, 0.28); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 0, 97.5, Math.PI * 1.05, Math.PI * 1.42); ctx.stroke();
        floaters.forEach(function (f) {
          var t = (now - f.t0) / 900;
          ctx.globalAlpha = 1 - t; ctx.fillStyle = rgba(f.text === 'Out!' ? C.red : C.gold);
          ctx.font = '9px ' + FONT_POSTER; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(f.text, f.x, f.y - 10 - t * 14); ctx.globalAlpha = 1;
        });
        /* a little level showing the tilt */
        var tl = Math.hypot(tilt.x, tilt.y);
        if (tl > 0.03 && !won) {
          ctx.strokeStyle = rgba(C.ink, 0.75); ctx.fillStyle = rgba(C.ink, 0.75); ctx.lineWidth = 2;
          var ex = tilt.x * 16, ey = tilt.y * 16;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ex, ey); ctx.stroke();
          var a = Math.atan2(ey, ex);
          ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * 4, ey + Math.sin(a) * 4); ctx.lineTo(ex + Math.cos(a + 2.4) * 4, ey + Math.sin(a + 2.4) * 4); ctx.lineTo(ex + Math.cos(a - 2.4) * 4, ey + Math.sin(a - 2.4) * 4); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      function drawPig(m, now) {
        var r = MR, x = m.x, y = m.y;
        var hop = won && !api.reducedMotion ? Math.abs(Math.sin((now - wonAt) / 160 + x)) * 2.2 * Math.max(0, 1 - (now - wonAt) / 2400) : 0;
        var squash = 1 + m.bump * 0.12;
        y -= hop;
        ctx.fillStyle = rgba(C.bg, 0.35);
        ctx.beginPath(); ctx.ellipse(x + 1.3 + tilt.x * 1.5, y + 2.2 + hop + tilt.y * 1.5, r * 0.95, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(x, y); ctx.scale(squash, 1 / squash);
        /* ears */
        ctx.fillStyle = rgba(C.pigDark);
        [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.moveTo(s * r * 0.25, -r * 0.82); ctx.lineTo(s * r * 0.95, -r * 1.05); ctx.lineTo(s * r * 0.75, -r * 0.35); ctx.closePath(); ctx.fill(); });
        /* body */
        var bg = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
        bg.addColorStop(0, rgba(mix(C.pig, C.ink, 0.55))); bg.addColorStop(0.55, rgba(C.pig)); bg.addColorStop(1, rgba(C.pigDark));
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        /* face, turned a little the way it rolls */
        var fx = m.face.x * r * 1.4, fy = m.face.y * r * 1.4;
        ctx.fillStyle = rgba(C.bg);
        if (m.inPen) {
          ctx.strokeStyle = rgba(C.bg); ctx.lineWidth = 0.7; ctx.lineCap = 'round';
          [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(fx + s * r * 0.32, fy - r * 0.12, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); });
        } else [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(fx + s * r * 0.32, fy - r * 0.15, r * 0.11, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = rgba(C.pigDark);
        ctx.beginPath(); ctx.ellipse(fx, fy + r * 0.25, r * 0.34, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(C.bg, 0.8);
        [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(fx + s * r * 0.12, fy + r * 0.25, r * 0.06, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = rgba(C.ink, 0.55); ctx.beginPath(); ctx.arc(-r * 0.4, -r * 0.45, r * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      /* ---------- games ---------- */
      function newGame(sound) {
        won = false; wonAt = 0; allInSince = 0; started = false; elapsed = 0; runFrom = 0; stopClock();
        sparks = []; floaters = []; lastInCount = 0; keys = {}; pointerTilt = null;
        tilt.x = tilt.y = 0; updateTarget();
        buildWalls(); placePigs();
        paintBox();
        renderScore();
        if (sound) api.sound('shuffle');
        shown = '';
        say('Tilt the box to roll all four pigs through the gaps into the pen in the middle.');
        wake();
      }

      /* ---------- wiring ---------- */
      root.addEventListener('keydown', onKeyDown);
      root.addEventListener('keyup', onKeyUp);
      canvas.addEventListener('blur', onBlur);
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('lostpointercapture', function (ev) { if (pointerId === ev.pointerId) onUp(ev); });
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('blur', onBlur);
      var queued = 0;
      function onResize() {
        if (queued || destroyed) return;
        queued = requestAnimationFrame(function () { queued = 0; if (desiredSize() !== S || Math.min(2, window.devicePixelRatio || 1) !== dpr) layout(); });
      }
      var ro = window.ResizeObserver ? new ResizeObserver(onResize) : null;
      if (ro) ro.observe(root);
      window.addEventListener('resize', onResize);

      /* For the automated play-test only: read the pigs, or put some straight into the pen to test the win.
         Nothing on the page calls this. */
      canvas.gitTest = {
        info: function () {
          return { won: won, tilt: { x: tilt.x, y: tilt.y }, walls: walls.map(function (w) { return { r: w.r, gap: w.gap ? { a: w.gap.a, half: w.gap.half } : null }; }),
            pigs: pigs.map(function (m) { return { x: m.x, y: m.y, vx: m.vx, vy: m.vy, r: Math.hypot(m.x, m.y), inPen: m.inPen }; }), S: S, k: k };
        },
        pen: function (n) {
          for (var i = 0; i < Math.min(n, pigs.length); i++) { var a = i * Math.PI / 2 + 0.4; pigs[i].x = Math.cos(a) * 10.5; pigs[i].y = Math.sin(a) * 10.5; pigs[i].vx = pigs[i].vy = 0; }
          startClock(); wake();
        }
      };

      layout();
      newGame(false);
      /* the lettering on the tin uses the hall's poster font; paint again once it has arrived */
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!destroyed) { paintBox(); wake(); } });

      return {
        destroy: function () {
          destroyed = true;
          stopClock();
          if (raf) cancelAnimationFrame(raf);
          if (queued) cancelAnimationFrame(queued);
          if (ro) ro.disconnect();
          if (deviceTimer) clearTimeout(deviceTimer);
          window.removeEventListener('deviceorientation', onOrientation);
          window.removeEventListener('resize', onResize);
          window.removeEventListener('blur', onBlur);
          document.removeEventListener('visibilitychange', onVisibility);
          canvas.gitTest = null;
          boxCanvas.width = 0; boxCanvas.height = 0;
        }
      };
    }
  });
})();
