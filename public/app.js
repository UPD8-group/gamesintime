/* Games in Time: app shell.
   Hash routes: #/ home, #/era/<id>, #/game/<id>, #/all, #/teachers, #/about, #/print/<what>.
   Every game is one file in public/games/<id>.js that calls GamesInTime.register({id, frame, mount}).
   See docs/ADDING-A-GAME.md for the contract. */
(function () {
  'use strict';

  /* ---------- tiny DOM helper ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (p) { if (p.indexOf('--') === 0) el.style.setProperty(p, v[p]); else el.style[p] = v[p]; });
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, String(v));
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function svg(markup) { var t = document.createElement('template'); t.innerHTML = markup.trim(); return t.content.firstChild; }

  /* ---------- storage (always wrapped: private windows and school devices may block it) ---------- */
  var store = {
    get: function (key, fallback) {
      try { var v = localStorage.getItem('git:' + key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set: function (key, val) {
      try { localStorage.setItem('git:' + key, JSON.stringify(val)); } catch (e) { /* ignore */ }
    }
  };

  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- sound: every effect is synthesised, no audio files ---------- */
  var Sound = (function () {
    var ctx = null, master = null, on = store.get('sound', true);
    function ensure() {
      if (!on) return null;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) { try { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.32; master.connect(ctx.destination); } catch (e) { ctx = null; return null; } }
      if (ctx.state === 'suspended') ctx.resume().catch(function () {});
      return ctx;
    }
    function tone(freq, start, dur, type, vol, slideTo) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, start);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
      g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(vol || 0.5, start + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g); g.connect(master); o.start(start); o.stop(start + dur + 0.02);
    }
    var noiseBuf = null;
    function noise(start, dur, filterType, freq, q, vol, freqTo) {
      if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; f.type = filterType || 'bandpass'; f.frequency.setValueAtTime(freq || 1500, start); f.Q.value = q || 1;
      if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, start + dur);
      g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(vol || 0.6, start + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(start); s.stop(start + dur + 0.02);
    }
    var lib = {
      click: function (t) { tone(1100, t, 0.04, 'triangle', 0.25); },
      tick: function (t) { noise(t, 0.02, 'highpass', 3500, 0.7, 0.35); },
      clack: function (t) { noise(t, 0.07, 'bandpass', 1700, 6, 0.9); tone(220, t, 0.06, 'sine', 0.3); },
      thud: function (t) { tone(110, t, 0.16, 'sine', 0.7, 55); noise(t, 0.05, 'lowpass', 600, 0.7, 0.3); },
      flip: function (t) { noise(t, 0.05, 'highpass', 2200, 0.8, 0.45, 5200); },
      shuffle: function (t) { for (var i = 0; i < 7; i++) lib.flip(t + i * 0.045 + Math.random() * 0.015); },
      dice: function (t) { for (var i = 0; i < 6; i++) noise(t + i * 0.06 + Math.random() * 0.03, 0.05, 'bandpass', 1200 + Math.random() * 1600, 5, 0.7); },
      pop: function (t) { tone(620, t, 0.09, 'sine', 0.6, 140); },
      whoosh: function (t) { noise(t, 0.28, 'bandpass', 400, 1.2, 0.5, 2600); },
      chalk: function (t) { noise(t, 0.09, 'highpass', 3000, 1, 0.35); },
      bell: function (t) { tone(1320, t, 0.7, 'sine', 0.45); tone(2640, t, 0.35, 'sine', 0.12); },
      coin: function (t) { tone(988, t, 0.08, 'square', 0.18); tone(1319, t + 0.08, 0.22, 'square', 0.18); },
      wrong: function (t) { tone(150, t, 0.18, 'square', 0.22, 110); },
      lose: function (t) { tone(392, t, 0.22, 'triangle', 0.4); tone(294, t + 0.2, 0.36, 'triangle', 0.4); },
      win: function (t) { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, t + i * 0.09, 0.32, 'triangle', 0.45); }); tone(1568, t + 0.38, 0.5, 'sine', 0.2); }
    };
    return {
      play: function (name) { var c = ensure(); if (!c || !lib[name]) return; try { lib[name](c.currentTime + 0.005); } catch (e) { /* ignore */ } },
      /* The 1973 arcade's square-wave bleep: same signature as its audio.js tone(freq, dur, type, vol). */
      tone: function (freq, dur, type, vol) {
        var c = ensure(); if (!c || c.state !== 'running') return;
        var t0 = c.currentTime, o = c.createOscillator(), g = c.createGain();
        o.type = type || 'square'; o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime((vol == null ? 0.11 : vol) / 0.32, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.25));
        o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + (dur || 0.25) + 0.05);
        o.onended = function () { o.disconnect(); g.disconnect(); };
      },
      unlock: function () { ensure(); },
      isOn: function () { return on; },
      set: function (v) { on = !!v; store.set('sound', on); if (on) ensure(); }
    };
  })();

  /* ---------- confetti and toast ---------- */
  function confetti(fromEl) {
    if (reducedMotion) return;
    var cv = h('canvas', { class: 'confetti', 'aria-hidden': 'true' });
    document.body.appendChild(cv);
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; var c = cv.getContext('2d'); c.scale(dpr, dpr);
    var r = fromEl ? fromEl.getBoundingClientRect() : { left: W / 2, top: H / 3, width: 0 };
    var ox = r.left + r.width / 2, oy = Math.max(40, r.top + 40);
    var colours = ['#ff5a3c', '#ffc23d', '#22c3ae', '#5b8dff', '#ff7eb3', '#fdf3e1'], parts = [];
    for (var i = 0; i < 150; i++) parts.push({ x: ox, y: oy, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4, s: 5 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colours[i % colours.length] });
    var t0 = performance.now();
    (function frame(now) {
      var t = now - t0; c.clearRect(0, 0, W, H);
      parts.forEach(function (p) { p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); });
      if (t < 2600) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }
  var toastTimer = null;
  function toast(text) {
    var old = document.querySelector('.toast'); if (old) old.remove();
    var el = h('div', { class: 'toast', role: 'status' }, text);
    document.body.appendChild(el);
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.remove(); }, 2800);
  }

  /* ---------- the visitor's ticket: which games they have played and won (this browser only) ---------- */
  var Ticket = {
    all: function () { return store.get('ticket', {}); },
    mark: function (id, how) {
      var t = Ticket.all();
      if (how === 'won' || !t[id]) { t[id] = how; store.set('ticket', t); }
    }
  };

  /* ---------- game registry and the API games receive ---------- */
  var registry = {};
  var GamesInTime = {
    register: function (def) {
      if (!def || !def.id || typeof def.mount !== 'function') throw new Error('GamesInTime.register needs {id, mount}');
      registry[def.id] = def;
    },
    get: function (id) { return registry[id]; },
    h: h,
    store: store,
    sound: Sound,
    content: function () { return window.GIT_CONTENT || {}; }
  };
  window.GamesInTime = GamesInTime;

  /* ---------- content lookups ---------- */
  function C() { return window.GIT_CONTENT || { site: {}, eras: [], games: [], kids: [], curriculum: {}, images: {} }; }
  function eras() { return (C().eras || []).filter(function (e) { return !e.external; }); }
  function posterOf(e) { return e.poster || e.pill; }
  function era(id) { return eras().filter(function (e) { return e.id === id; })[0]; }
  function eraIndex(id) { var list = eras(); for (var i = 0; i < list.length; i++) if (list[i].id === id) return i; return 99; }
  function games() {
    return (C().games || []).slice().sort(function (a, b) { return (eraIndex(a.era) - eraIndex(b.era)) || (a.year - b.year) || a.title.localeCompare(b.title); });
  }
  function game(id) { return games().filter(function (g) { return g.id === id; })[0]; }
  function gamesIn(eraId) { return games().filter(function (g) { return g.era === eraId; }); }
  function kidsPanel(eraId) { return (C().kids || []).filter(function (k) { return k.era === eraId; })[0]; }
  function lessonFor(gameId) { return ((C().curriculum || {}).lessons || []).filter(function (l) { return l.gameId === gameId; })[0]; }
  function image(id) { var m = C().images || {}; var im = m[id]; return im && im.hero ? im : null; }
  function neighbour(g, step) { var list = games(); for (var i = 0; i < list.length; i++) if (list[i].id === g.id) return list[(i + step + list.length) % list.length]; return null; }
  var FRAME_FOR_TYPE = { board: 'table', cards: 'baize', words: 'paper', puzzle: 'paper', action: 'stage', luck: 'table', chance: 'table' };

  /* ---------- routing ---------- */
  function href(parts) { return '#/' + parts.filter(function (p) { return p !== ''; }).join('/'); }
  function parseRoute() {
    var raw = (location.hash || '').replace(/^#/, '');
    var parts = (raw.charAt(0) === '/' ? raw.slice(1) : raw).split('/').filter(Boolean).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    return { name: parts[0] || 'home', id: parts[1] || '' };
  }

  var main, current = null, firstRender = true, header, menuEl, menuBtn, soundBtn;

  function setTitle(t) { var n = C().site.name || 'Games in Time'; document.title = t ? t + ' · ' + n : n + ' · Play the games kids played a hundred years ago'; }

  function render() {
    if (current && current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
    current = null;
    document.documentElement.classList.remove('classroom');
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    closeMenu();
    var r = parseRoute(), view;
    switch (r.name) {
      case 'home': view = pageHome(); break;
      case 'era': view = pageEra(r.id); break;
      case 'game': view = pageGame(r.id); break;
      case 'all': view = pageAll(); break;
      case 'real-life': view = pageEra('schoolyard'); break;
      case 'teachers': view = pageTeachers(); break;
      case 'about': view = pageAbout(); break;
      case 'print': view = pagePrint(r.id); break;
      default: view = pageNotFound();
    }
    current = view;
    main.className = 'site-main' + (view.eraId ? ' era-' + view.eraId : '');
    /* The whole page, header and footer included, wears the hall's period colours. */
    Array.prototype.slice.call(document.body.classList).forEach(function (c) { if (c.indexOf('era-') === 0) document.body.classList.remove(c); });
    if (view.eraId) document.body.classList.add('era-' + view.eraId);
    main.replaceChildren(view.el);
    setTitle(view.title);
    markCurrent(r, view.eraId);
    if (view.mount) view.mount();
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (!firstRender) {
      var heading = main.querySelector('h1');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    }
    firstRender = false;
    onScroll();
  }

  function markCurrent(r, eraId) {
    Array.prototype.forEach.call(document.querySelectorAll('.era-pills a[data-era]'), function (a) {
      if (a.getAttribute('data-era') === eraId) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  /* ---------- shared pieces ---------- */
  function picture(id, cls, sizes) {
    var im = image(id);
    if (!im) return null;
    return h('img', { class: cls || '', src: im.card || im.hero, srcset: (im.card ? im.card + ' 720w, ' : '') + im.hero + ' 1600w', sizes: sizes || '(max-width: 700px) 100vw, 33vw', alt: im.alt || '', loading: 'lazy', decoding: 'async', style: im.focus ? { objectPosition: im.focus } : null });
  }
  function hero(opts) {
    var im = opts.imageId ? image(opts.imageId) : null;
    var node = h('section', { class: 'hero', style: { '--hero-h': opts.height || '74vh', '--hero-h-phone': opts.phoneHeight || '52vh', '--focus-pos': im && im.focus ? im.focus : '50% 35%' } },
      im ? h('img', { class: 'hero-img', src: im.hero, srcset: (im.card ? im.card + ' 720w, ' : '') + im.hero + ' 1600w', sizes: '100vw', alt: im.alt || '', fetchpriority: 'high', decoding: 'async' }) : h('div', { class: 'hero-fallback', 'aria-hidden': 'true' }),
      h('div', { class: 'hero-content' },
        opts.badge ? h('span', { class: 'badge-pill' }, h('span', { class: 'tick', 'aria-hidden': 'true' }, '✓'), opts.badge) : null,
        opts.label ? h('p', { class: 'label' }, opts.label) : null,
        opts.poster ? h('p', { class: 'poster poster--big', 'aria-hidden': 'true' }, opts.poster) : null,
        h('h1', { class: 'hero-title' }, opts.title, opts.gold ? h('span', { class: 'gold' }, opts.gold) : null),
        opts.lede ? h('p', { class: 'hero-lede' }, opts.lede) : null,
        opts.actions ? h('div', { class: 'pill-row' }, opts.actions) : null),
      im && im.credit ? h('p', { class: 'hero-credit' }, (im.caption ? im.caption + '. ' : ''), im.source ? h('a', { href: im.source, rel: 'noopener', target: '_blank' }, im.credit) : im.credit) : null);
    return node;
  }
  function chipsFor(g) {
    return h('div', { class: 'chips' }, (g.players || []).map(function (p) { return h('span', { class: 'chip' }, p); }));
  }
  function gameCard(g, ticket) {
    var t = ticket || Ticket.all();
    var e = era(g.era);
    var pic = picture(g.id, '', '(max-width: 700px) 100vw, 25vw');
    return h('li', null,
      h('a', { class: 'gcard era-' + g.era, href: href(['game', g.id]) },
        h('div', { class: 'gcard-img' }, pic || h('div', { class: 'ph', 'aria-hidden': 'true' }, (g.title || '?').charAt(0)),
          h('span', { class: 'gcard-stamp' }, g.stamp || g.yearLabel || String(g.year)),
          t[g.id] ? h('span', { class: 'gcard-done', title: t[g.id] === 'won' ? 'You have won this one' : 'You have played this one', 'aria-label': t[g.id] === 'won' ? 'Won' : 'Played' }, t[g.id] === 'won' ? '★' : '✓') : null),
        h('div', { class: 'gcard-body' },
          h('span', { class: 'gcard-title' }, g.title),
          h('span', { class: 'gcard-hook' }, g.tagline || g.blurb || ''),
          chipsFor(g),
          h('span', { class: 'gcard-play' }, 'Play →'))));
  }
  function gameGrid(list) { var t = Ticket.all(); return h('ul', { class: 'tile-grid' }, list.map(function (g) { return gameCard(g, t); })); }
  function eraTile(e) {
    var pic = picture('hall-' + e.id, '', '(max-width: 700px) 100vw, 33vw');
    var n = gamesIn(e.id).length;
    return h('li', null,
      h('a', { class: 'gcard era-tile era-' + e.id, href: href(['era', e.id]) },
        h('div', { class: 'gcard-img' }, pic || h('div', { class: 'hero-fallback', 'aria-hidden': 'true' }), h('span', { class: 'poster', 'aria-hidden': 'true' }, posterOf(e))),
        h('div', { class: 'gcard-body' },
          h('span', { class: 'label' }, e.years),
          h('span', { class: 'gcard-title' }, e.name),
          h('span', { class: 'gcard-hook' }, e.hook || ''),
          h('span', { class: 'gcard-play' }, n + ' games to play →'))));
  }
  function sourcesList(sources) {
    if (!sources || !sources.length) return null;
    return h('ul', { class: 'sources' }, sources.map(function (s) {
      return h('li', null, h('a', { href: s.url, rel: 'noopener', target: '_blank' }, s.title), s.note ? ' (' + s.note + ')' : '');
    }));
  }
  function paragraphs(list) { return (list || []).map(function (p) { return h('p', null, p); }); }
  function surprise() { var list = games().filter(function (g) { return registry[g.id]; }); if (!list.length) list = games(); var g = list[Math.floor(Math.random() * list.length)]; if (g) location.hash = href(['game', g.id]); }

  /* ---------- pages ---------- */
  function pageHome() {
    var site = C().site, all = games(), t = Ticket.all();
    var played = all.filter(function (g) { return t[g.id]; }).length;
    var filterState = store.get('filter', 'all');
    var types = [['all', 'All games'], ['board', 'Board games'], ['cards', 'Cards'], ['puzzle', 'Puzzles'], ['words', 'Words and pencils'], ['action', 'Action'], ['luck', 'Dice and luck']];
    var grid = h('div');
    var filterBar = h('div', { class: 'filters', role: 'group', 'aria-label': 'Show' });
    function drawGrid() {
      grid.replaceChildren(gameGrid(all.filter(function (g) { return filterState === 'all' || g.type === filterState; })));
      Array.prototype.forEach.call(filterBar.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-f') === filterState)); });
    }
    types.forEach(function (tp) { filterBar.appendChild(h('button', { type: 'button', 'data-f': tp[0], 'aria-pressed': 'false', onclick: function () { filterState = tp[0]; store.set('filter', filterState); drawGrid(); } }, tp[1])); });
    drawGrid();
    var el = h('div', null,
      hero({ imageId: 'home', height: '88vh', phoneHeight: '56vh', badge: all.length + ' games from 1800 to 1919. All free.', title: 'Play the games kids played', gold: 'a hundred years ago.', lede: site.lede,
        actions: [h('a', { class: 'pill pill--gold', href: '#games' }, '▶ Start playing'), h('button', { class: 'pill pill--light', type: 'button', onclick: surprise }, 'Surprise me ', h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→'))] }),
      h('section', { class: 'section', 'aria-labelledby': 'halls-title' },
        h('div', { class: 'section-head' }, h('p', { class: 'label' }, 'Pick a decade'), h('h2', { id: 'halls-title' }, 'Step through time')),
        h('ul', { class: 'tile-grid era-grid' }, eras().map(eraTile))),
      h('section', { class: 'section', id: 'games', 'aria-labelledby': 'games-title' },
        h('div', { class: 'section-head' }, h('p', { class: 'label' }, 'Every game, ready to play'), h('h2', { id: 'games-title' }, 'Pick a game')),
        filterBar, grid),
      h('section', { class: 'section', 'aria-labelledby': 'ticket-title' },
        h('div', { class: 'ticket' },
          h('p', { class: 'label', style: { color: '#b3261e' } }, 'Your ticket'),
          h('h2', { id: 'ticket-title' }, played ? 'You have played ' + played + ' of ' + all.length + ' games.' : 'Collect a stamp for every game you play.'),
          h('p', null, played ? 'A star means you won. Your stamps are saved in this browser only.' : 'Play any game to stamp your ticket. Win it to earn a star. Stamps stay in this browser only.'),
          h('ul', { class: 'stamps' }, all.map(function (g) {
            return h('li', null, h('a', { class: t[g.id] ? 'on' + (t[g.id] === 'won' ? ' won' : '') : '', href: href(['game', g.id]), title: g.title, 'aria-label': g.title + (t[g.id] === 'won' ? ', won' : t[g.id] ? ', played' : ', not played yet') }, t[g.id] === 'won' ? '★' : (g.stamp && /^\d{4}$/.test(g.stamp) ? "'" + g.stamp.slice(2) : g.title.charAt(0))));
          })))),
      h('section', { class: 'section', 'aria-labelledby': 'why-title' },
        h('div', { class: 'info', style: { padding: 0 } },
          h('div', { class: 'icard' }, h('p', { class: 'label' }, 'Kids your age'), h('h2', { id: 'why-title' }, 'What did kids play before screens?'),
            h('p', null, 'Every hall has a story about being twelve in that decade: school, work, pocket money and where kids played. Then you play the same games they did.'),
            h('p', null, h('a', { class: 'pill pill--ghost', href: href(['era', '1880s']) }, 'Visit the 1880s →'))),
          h('div', { class: 'icard' }, h('p', { class: 'label' }, 'For teachers'), h('h2', null, 'Free for every classroom.'),
            h('p', null, 'No accounts, no ads, no tracking. Every game has its sources, a lesson idea, and a full-screen mode for the projector.'),
            h('p', null, h('a', { class: 'pill pill--ghost', href: href(['teachers']) }, 'Teacher notes →'))))));
    return { el: el, title: '' };
  }

  function kidsSection(eraId) {
    var e = era(eraId);
    var ids = (e && e.kids) || [];
    if (!ids.length) return null;
    return ids.map(function (k) {
      var p = kidsPanel(k);
      if (!p) return null;
      var pic = picture('kids-' + k, '', '(max-width: 860px) 100vw, 40vw');
      var im = image('kids-' + k);
      return h('section', { class: 'kids', 'aria-labelledby': 'kids-' + k },
        h('div', { class: 'section-head' }, h('p', { class: 'label' }, 'Kids your age'), h('h2', { id: 'kids-' + k }, p.title)),
        h('div', { class: 'kids-grid' },
          h('figure', { class: 'kids-photo' }, pic || h('div', { class: 'hero-fallback', style: { position: 'absolute' } }), im ? h('figcaption', null, (im.caption || '') + (im.credit ? '. ' + im.credit : '')) : null),
          h('div', { class: 'stack' },
            h('div', { class: 'prose stack' }, paragraphs(p.paragraphs)),
            p.fastFacts && p.fastFacts.length ? h('ul', { class: 'facts' }, p.fastFacts.slice(0, 4).map(function (f) { return h('li', null, f); })) : null,
            p.compare ? h('p', { class: 'compare' }, h('strong', null, 'Talk about it: '), p.compare) : null,
            p.sources && p.sources.length ? h('details', { class: 'more' }, h('summary', null, 'Sources'), sourcesList(p.sources)) : null)));
    });
  }

  function pageEra(id) {
    var e = era(id);
    if (!e) return pageNotFound();
    var list = gamesIn(id);
    var i = eraIndex(id), next = eras()[i + 1], prev = eras()[i - 1];
    var el = h('div', null,
      hero({ imageId: 'hall-' + e.id, height: '78vh', label: 'The ' + e.pill + ' hall · ' + e.years, poster: posterOf(e), title: e.title || e.name, gold: e.gold, lede: e.intro,
        actions: [list[0] ? h('a', { class: 'pill pill--gold', href: href(['game', list[0].id]) }, '▶ Play the first game') : null, h('a', { class: 'pill pill--ghost', href: '#hall-games' }, list.length + ' games in this hall')] }),
      h('section', { class: 'section', id: 'hall-games', 'aria-labelledby': 'hall-games-title' },
        h('div', { class: 'section-head' }, h('p', { class: 'label' }, e.years), h('h2', { id: 'hall-games-title' }, 'Games in this hall')),
        gameGrid(list)),
      kidsSection(id),
      e.extra ? h('section', { class: 'kids' }, h('div', { class: 'icard icard--wide' }, h('p', { class: 'label' }, e.extra.label), h('h2', null, e.extra.title), h('div', { class: 'prose stack' }, paragraphs(e.extra.paragraphs)), e.extra.sources ? h('details', { class: 'more' }, h('summary', null, 'Sources'), sourcesList(e.extra.sources)) : null)) : null,
      h('div', { class: 'next-band' },
        prev ? h('a', { class: 'pill pill--ghost', href: href(['era', prev.id]) }, '← ' + prev.pill) : h('span'),
        next ? h('a', { class: 'pill pill--gold', href: href(['era', next.id]) }, 'Next: ' + next.name + ' ', h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→')) : h('a', { class: 'pill pill--gold', href: href(['']) }, 'Back to the start')));
    return { el: el, title: e.name + ' (' + e.years + ')', eraId: e.id };
  }

  function pageAll() {
    var el = h('div', null,
      h('header', { class: 'page-head' }, h('p', { class: 'label' }, 'Every game'), h('h1', null, 'All ', games().length, ' games')),
      eras().map(function (e) {
        return h('section', { class: 'section era-' + e.id, 'aria-labelledby': 'all-' + e.id },
          h('div', { class: 'section-head' }, h('p', { class: 'label' }, e.years), h('h2', { id: 'all-' + e.id }, h('a', { href: href(['era', e.id]), style: { color: 'inherit', textDecoration: 'none' } }, e.name))),
          gameGrid(gamesIn(e.id)));
      }));
    return { el: el, title: 'All games' };
  }

  /* ----- game page ----- */
  function pageGame(id) {
    var g = game(id);
    if (!g) return pageNotFound();
    var e = era(g.era);
    var def = registry[g.id];
    var nextG = neighbour(g, 1), prevG = neighbour(g, -1);
    var statusEl = h('div', { class: 'game-status', role: 'status', 'aria-live': 'polite' });
    var root = h('div', { class: 'game-root game-' + g.id });
    var live = document.getElementById('sr-live');
    var frameName = (def && def.frame) || FRAME_FOR_TYPE[g.type] || 'table';
    var frame = h('div', { class: 'frame frame--' + frameName }, h('div', { class: 'frame-inner' }, root), h('span', { class: 'frame-plate', 'aria-hidden': 'true' }, 'Games in Time · ' + (g.stamp || g.year)));
    var playEl;
    var api = {
      status: function (text) { statusEl.textContent = text || ''; },
      announce: function (text) { if (live) { live.textContent = ''; setTimeout(function () { live.textContent = text || ''; }, 30); } },
      reducedMotion: reducedMotion,
      h: h,
      random: Math.random,
      store: { get: function (k, fb) { return store.get(g.id + ':' + k, fb); }, set: function (k, v) { store.set(g.id + ':' + k, v); } },
      sound: function (name) { Sound.play(name); },
      celebrate: function (text) { Ticket.mark(g.id, 'won'); Sound.play('win'); confetti(root); if (text) toast(text); },
      tone: function (freq, dur, type, vol) { Sound.tone(freq, dur, type, vol); },
      unlockSound: function () { Sound.unlock(); },
      images: function () { var m = C().images || {}; return Object.keys(m).map(function (k) { return m[k]; }).filter(function (im) { return im && im.hero; }); },
      content: g,
      era: e,
      site: C()
    };
    function markPlayed() { Ticket.mark(g.id, 'played'); root.removeEventListener('pointerdown', markPlayed); root.removeEventListener('keydown', markPlayed); }
    root.addEventListener('pointerdown', markPlayed);
    root.addEventListener('keydown', markPlayed);

    var classroomBtn = h('button', { class: 'pill pill--ghost', type: 'button', 'aria-pressed': 'false' }, 'Classroom mode');
    classroomBtn.addEventListener('click', function () {
      var on = !document.documentElement.classList.contains('classroom');
      document.documentElement.classList.toggle('classroom', on);
      classroomBtn.setAttribute('aria-pressed', String(on));
      classroomBtn.textContent = on ? 'Leave classroom mode' : 'Classroom mode';
      if (on && playEl.requestFullscreen) playEl.requestFullscreen().catch(function () {});
      if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    });
    function onFsChange() {
      if (!document.fullscreenElement && document.documentElement.classList.contains('classroom')) {
        document.documentElement.classList.remove('classroom'); classroomBtn.setAttribute('aria-pressed', 'false'); classroomBtn.textContent = 'Classroom mode';
      }
    }
    function onKey(ev) { if (ev.key === 'Escape' && document.documentElement.classList.contains('classroom') && !document.fullscreenElement) classroomBtn.click(); }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('keydown', onKey);

    playEl = h('section', { class: 'play', id: 'play', 'aria-label': 'Play ' + g.title },
      h('div', { class: 'play-head' }, h('p', { class: 'label' }, 'Play · ' + g.title), statusEl),
      def ? frame : h('div', { class: 'frame frame--' + frameName }, h('div', { class: 'frame-inner' }, h('p', { class: 'notice' }, 'This game is loading. If it does not appear, reload the page.'))),
      h('div', { class: 'play-tools no-print' }, classroomBtn, nextG ? h('a', { class: 'pill pill--gold', href: href(['game', nextG.id]) }, 'Next game: ' + nextG.title + ' ', h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→')) : null));

    var lesson = lessonFor(g.id);
    var kp = e && e.kids && e.kids.length ? kidsPanel(e.kids[e.kids.length > 1 && g.year >= 1910 ? 1 : 0]) : null;
    var info = h('section', { class: 'info', 'aria-label': 'About ' + g.title },
      g.howToPlay && g.howToPlay.length ? h('div', { class: 'icard' }, h('p', { class: 'label' }, 'How to play'), h('h2', null, 'The rules'), h('ol', { class: 'steps' }, g.howToPlay.map(function (s) { return h('li', null, h('span', null, s)); })), g.controls ? h('p', { class: 'muted' }, h('strong', null, 'Controls: '), g.controls) : null) : null,
      g.story && g.story.length ? h('div', { class: 'icard' }, h('p', { class: 'label' }, 'The story · ' + (g.yearLabel || g.year)), h('h2', null, g.origin || 'Where it came from'), h('div', { class: 'prose stack' }, paragraphs(g.story))) : null,
      g.didYouKnow && g.didYouKnow.length ? h('div', { class: 'icard' }, h('p', { class: 'label' }, 'Did you know?'), h('ul', { class: 'facts' }, g.didYouKnow.map(function (s) { return h('li', null, s); }))) : null,
      kp ? h('div', { class: 'icard' }, h('p', { class: 'label' }, 'Kids your age'), h('h2', null, kp.title), h('p', null, kp.paragraphs && kp.paragraphs[0]), h('p', null, h('a', { href: href(['era', g.era]) + '' }, 'Read more about being a kid back then →'))) : null,
      g.computer ? h('div', { class: 'icard' }, h('p', { class: 'label' }, 'How the computer plays'), h('p', null, g.computer)) : null,
      lesson ? h('div', { class: 'icard' }, h('p', { class: 'label' }, 'For teachers · ' + lesson.yearLevels), h('h2', null, lesson.title), h('p', null, lesson.idea), lesson.computerAngle ? h('p', { class: 'muted' }, lesson.computerAngle) : null) : null,
      h('div', { class: 'icard icard--wide' }, h('p', { class: 'label' }, 'Sources'), h('p', { class: 'muted' }, 'Everything above was checked against these. Where historians disagree, we say so.'), sourcesList(g.sources),
        g.uncertainties && g.uncertainties.length ? h('details', { class: 'more' }, h('summary', null, 'What we are not sure about'), h('ul', { class: 'sources' }, g.uncertainties.map(function (u) { return h('li', null, u); }))) : null,
        image(g.id) && image(g.id).credit ? h('p', { class: 'muted', style: { fontSize: '.85rem' } }, 'Picture: ' + (image(g.id).caption ? image(g.id).caption + '. ' : '') + image(g.id).credit + (image(g.id).license ? ' (' + image(g.id).license + ')' : '') + '.') : null));

    var el = h('article', { class: 'game-page era-' + g.era },
      hero({ imageId: g.id, height: '62vh', phoneHeight: '44vh', label: (g.stamp || g.yearLabel) + ' · ' + (e ? 'The ' + e.pill + ' hall' : ''), title: g.title + '.', gold: g.tagline || '', lede: g.blurb,
        actions: [h('a', { class: 'pill pill--gold', href: '#play', onclick: function (ev) { ev.preventDefault(); playEl.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }); } }, '▶ Play now'), chipsFor(g)] }),
      playEl, info,
      h('div', { class: 'next-band' },
        prevG ? h('a', { class: 'pill pill--ghost', href: href(['game', prevG.id]) }, '← ' + prevG.title) : h('span'),
        e ? h('a', { class: 'pill pill--ghost', href: href(['era', e.id]) }, 'All of the ' + e.pill) : null,
        nextG ? h('a', { class: 'pill pill--gold', href: href(['game', nextG.id]) }, 'Next: ' + nextG.title + ' ', h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→')) : null));

    var mounted = null;
    return {
      el: el, title: g.title, eraId: g.era,
      mount: function () {
        if (!def) return;
        try { mounted = def.mount(root, api) || null; }
        catch (err) { console.error(err); root.replaceChildren(h('p', { class: 'notice' }, 'Sorry, this game could not start. Please reload the page.')); }
      },
      destroy: function () {
        document.removeEventListener('fullscreenchange', onFsChange);
        document.removeEventListener('keydown', onKey);
        if (mounted && mounted.destroy) mounted.destroy();
      }
    };
  }

  function pageTeachers() {
    var cur = C().curriculum || {};
    var el = h('div', null,
      h('header', { class: 'page-head' }, h('p', { class: 'label' }, 'Games in Time in the classroom'), h('h1', null, 'For teachers.', h('span', { class: 'gold', style: { display: 'block' } }, 'Play first, then ask why.')),
        h('p', { class: 'lede' }, 'Every game comes with a checked history, primary sources and a lesson idea. Nothing to sign up for, nothing to install.')),
      h('section', { class: 'info', 'aria-label': 'What you need to know' },
        [['No accounts, no ads, no tracking.', 'The site does not collect names, emails or any personal information. Ticket stamps stay in each browser.'],
         ['Works on any device.', 'iPads, Chromebooks, laptops and interactive whiteboards. Pairs on one device work well for the two-player games.'],
         ['Works offline.', 'Download the site from GitHub, open index.html from a USB stick or a shared drive, and it runs without internet.'],
         ['Classroom mode.', 'Every game has a button that fills the screen for projecting. Sound can be switched off at the top of every page.'],
         ['Sources on every page.', 'Each game lists the sources we used, and says what we are not sure about. Use it as a source-analysis task.'],
         ['Real pictures.', 'The pictures are historical photographs, paintings and prints, credited on each page.']].map(function (x) {
          return h('div', { class: 'icard icard--third' }, h('h3', null, x[0]), h('p', { class: 'muted' }, x[1]));
        })),
      cur.lessons && cur.lessons.length ? h('section', { class: 'section', 'aria-labelledby': 'lessons-title' },
        h('div', { class: 'section-head' }, h('p', { class: 'label' }, 'Twenty minutes each'), h('h2', { id: 'lessons-title' }, 'Lesson ideas')),
        h('div', { class: 'lesson-grid' }, cur.lessons.map(function (l) {
          var g = game(l.gameId);
          return h('div', { class: 'lesson' }, h('p', { class: 'label' }, (g ? g.title + ' · ' : '') + l.yearLevels), h('h3', null, l.title), h('p', null, l.idea), l.computerAngle ? h('p', { class: 'computer' }, l.computerAngle) : null,
            h('p', null, g ? h('a', { href: href(['game', g.id]) }, 'Open ' + g.title) : null, l.curriculumUrl ? [' · ', h('a', { href: l.curriculumUrl, rel: 'noopener', target: '_blank' }, 'Curriculum')] : null));
        }))) : null,
      cur.links && cur.links.length ? h('section', { class: 'section', 'aria-labelledby': 'curr-title' },
        h('div', { class: 'section-head' }, h('p', { class: 'label' }, 'Where it fits'), h('h2', { id: 'curr-title' }, 'Curriculum links'), h('p', null, 'Codes are shown only where we could verify them on the curriculum site.')),
        h('div', { class: 'table-wrap' }, h('table', null,
          h('thead', null, h('tr', null, h('th', null, 'Curriculum'), h('th', null, 'Year'), h('th', null, 'Area'), h('th', null, 'Content'), h('th', null, 'Why it fits'))),
          h('tbody', null, cur.links.map(function (l) {
            return h('tr', null, h('td', null, l.jurisdiction), h('td', null, l.yearLevel), h('td', null, l.learningArea),
              h('td', null, l.code ? h('strong', null, l.code + ' ') : null, h('a', { href: l.url, rel: 'noopener', target: '_blank' }, l.description)), h('td', null, l.relevance));
          }))))) : null,
      cur.tips && cur.tips.length ? h('section', { class: 'section', 'aria-labelledby': 'tips-title' },
        h('div', { class: 'section-head' }, h('p', { class: 'label' }, 'From the classroom'), h('h2', { id: 'tips-title' }, 'Tips')), h('ul', { class: 'facts' }, cur.tips.map(function (t) { return h('li', null, t); }))) : null,
      h('section', { class: 'section', 'aria-labelledby': 'print-title' },
        h('div', { class: 'section-head' }, h('p', { class: 'label' }, 'Pencil and paper'), h('h2', { id: 'print-title' }, 'Printables')),
        h('div', { class: 'pill-row' },
          h('a', { class: 'pill pill--ghost', href: href(['print', 'dots']) }, 'Dots and Boxes grids'),
          h('a', { class: 'pill pill--ghost', href: href(['print', 'noughts']) }, 'Noughts and Crosses sheet'),
          h('a', { class: 'pill pill--ghost', href: href(['print', 'hundred']) }, 'Hundred-square board'))));
    return { el: el, title: 'For teachers' };
  }

  function pageAbout() {
    var site = C().site;
    var el = h('div', null,
      h('header', { class: 'page-head' }, h('p', { class: 'label' }, 'The project'), h('h1', null, 'About Games in Time.', h('span', { class: 'gold', style: { display: 'block' } }, 'An idea from a thirteen-year-old.'))),
      h('section', { class: 'info' },
        h('div', { class: 'icard icard--wide' }, h('div', { class: 'prose stack' },
          h('p', { class: 'pull' }, 'What did kids my age play a hundred years ago, and could we play those games today?'),
          h('p', null, 'That question, from a thirteen-year-old, is the whole site. Every game here was played by children between 1800 and 1919, and every one of them is playable right here, for free.'),
          h('p', null, 'Beside each game is its true story: the year, where it came from, who played it, and the sources we used. Every hall also tells you what it was like to be twelve in that decade.'))),
        h('div', { class: 'icard' }, h('p', { class: 'label' }, 'Our rules for the history'), h('ul', { class: 'facts' },
          h('li', null, 'Every date and story is checked against sources we actually read, and the sources are listed on the page.'),
          h('li', null, 'When historians disagree, we say so. What we cannot confirm goes under "What we are not sure about".'),
          h('li', null, 'We use the names people used at the time, and avoid trademarked names that belong to companies today.'))),
        h('div', { class: 'icard' }, h('p', { class: 'label' }, 'Free, for everyone'), h('p', null, 'No accounts, no ads, no tracking. The whole site is plain HTML, CSS and JavaScript, and you can download it and run it offline. The code is open: ', h('a', { href: site.repo, rel: 'noopener', target: '_blank' }, 'see it on GitHub'), '.'),
          h('p', null, 'The halls run from the 1800s to the neon arcades of the 1980s, each one dressed in the colours of its own time.'))));
    return { el: el, title: 'About' };
  }

  function pagePrint(what) {
    var body, title;
    if (what === 'dots') { title = 'Dots and Boxes grids'; body = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' } }, [0, 1, 2, 3].map(function () { return dotsGridSvg(6); })); }
    else if (what === 'noughts') { title = 'Noughts and Crosses sheet'; body = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '24px' } }, Array.apply(null, Array(12)).map(function () { return noughtsSvg(); })); }
    else if (what === 'hundred') { title = 'Hundred-square board'; body = hundredSvg(); }
    else return pageNotFound();
    var el = h('div', null,
      h('header', { class: 'page-head no-print' }, h('p', { class: 'label' }, 'Printable'), h('h1', null, title),
        h('div', { class: 'pill-row' }, h('a', { class: 'pill pill--ghost', href: href(['teachers']) }, '← For teachers'), h('button', { class: 'pill pill--gold', type: 'button', onclick: function () { window.print(); } }, 'Print this page'))),
      h('section', { class: 'section' }, h('div', { class: 'print-page' }, body)));
    return { el: el, title: title };
  }
  function svgEl(tag, attrs) { var el = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); }); return el; }
  function dotsGridSvg(n) { var s = svgEl('svg', { viewBox: '0 0 220 220', width: '100%', role: 'img', 'aria-label': n + ' by ' + n + ' dot grid' }); for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) s.appendChild(svgEl('circle', { cx: 20 + c * 36, cy: 20 + r * 36, r: 3.2, fill: '#000' })); return s; }
  function noughtsSvg() { var s = svgEl('svg', { viewBox: '0 0 150 150', width: '100%', role: 'img', 'aria-label': 'Empty noughts and crosses grid' }); [50, 100].forEach(function (p) { s.appendChild(svgEl('line', { x1: p, y1: 5, x2: p, y2: 145, stroke: '#000', 'stroke-width': 2 })); s.appendChild(svgEl('line', { x1: 5, y1: p, x2: 145, y2: p, stroke: '#000', 'stroke-width': 2 })); }); return s; }
  function hundredSvg() {
    var s = svgEl('svg', { viewBox: '0 0 520 520', width: '100%', role: 'img', 'aria-label': 'Hundred-square board numbered back and forth from the bottom left' });
    for (var r = 0; r < 10; r++) for (var c = 0; c < 10; c++) {
      var rb = 9 - r, num = rb * 10 + (rb % 2 === 0 ? c + 1 : 10 - c);
      s.appendChild(svgEl('rect', { x: 10 + c * 50, y: 10 + r * 50, width: 50, height: 50, fill: 'none', stroke: '#000', 'stroke-width': 1.5 }));
      var t = svgEl('text', { x: 15 + c * 50, y: 26 + r * 50, 'font-size': 13, 'font-family': 'sans-serif', fill: '#000' }); t.textContent = String(num); s.appendChild(t);
    }
    return s;
  }
  function pageNotFound() {
    var el = h('div', null, h('header', { class: 'page-head' }, h('p', { class: 'label' }, 'Lost in time'), h('h1', null, 'That room is not here.'), h('p', { class: 'lede' }, 'The page you asked for does not exist, or it has moved.'), h('div', { class: 'pill-row' }, h('a', { class: 'pill pill--gold', href: href(['']) }, 'Back to the start'))));
    return { el: el, title: 'Not found' };
  }

  /* ---------- header, menu and sound toggle ---------- */
  function buildHeader() {
    header = document.getElementById('site-header');
    var pills = h('nav', { class: 'era-pills', 'aria-label': 'Decades' },
      eras().map(function (e) { return h('a', { href: href(['era', e.id]), 'data-era': e.id }, e.pill); }));
    soundBtn = h('button', { class: 'circle-btn', type: 'button', 'aria-pressed': String(Sound.isOn()), 'aria-label': 'Sound', title: 'Sound on or off' },
      svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path class="wave" d="M15.5 8.5a5 5 0 0 1 0 7"/><path class="wave" d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>'));
    soundBtn.addEventListener('click', function () { Sound.set(!Sound.isOn()); soundBtn.setAttribute('aria-pressed', String(Sound.isOn())); if (Sound.isOn()) Sound.play('bell'); toast(Sound.isOn() ? 'Sound on' : 'Sound off'); });
    menuBtn = h('button', { class: 'circle-btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'menu', 'aria-label': 'Menu' },
      svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'));
    menuBtn.addEventListener('click', function () { if (menuEl.hidden) openMenu(); else closeMenu(); });
    header.replaceChildren(
      h('a', { class: 'brand', href: href(['']), 'aria-label': 'Games in Time, home' },
        svg('<svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="#ffc23d"/><circle cx="24" cy="24" r="16" fill="#140f0b"/><path d="M24 13v11l7 5" fill="none" stroke="#fdf3e1" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="24" r="2.6" fill="#ff5a3c"/></svg>'),
        h('span', null, 'Games in Time')),
      pills,
      h('div', { class: 'header-actions' }, h('button', { class: 'pill pill--light', type: 'button', style: { minHeight: '46px', padding: '.5rem 1.1rem' }, onclick: surprise }, 'Surprise me'), soundBtn, menuBtn));
    menuEl = document.getElementById('menu');
    menuEl.replaceChildren(h('div', { class: 'menu-inner' },
      h('p', { class: 'label', style: { color: 'var(--gold)' } }, 'The halls'),
      h('ul', { class: 'menu-halls' }, eras().map(function (e) {
        var im = image('hall-' + e.id);
        return h('li', null, h('a', { class: 'menu-hall era-' + e.id, href: href(['era', e.id]) }, h('span', { class: 'thumb', style: im ? { backgroundImage: 'url("' + (im.card || im.hero) + '")' } : null }), h('span', { class: 'txt' }, h('span', { class: 'label' }, e.years), h('strong', null, e.name), h('span', { class: 'muted' }, gamesIn(e.id).length + ' games'))));
      })),
      h('ul', { class: 'menu-links' },
        h('li', null, h('a', { class: 'pill pill--gold', href: href(['all']) }, 'All games')),
        h('li', null, h('a', { class: 'pill pill--ghost', href: href(['teachers']) }, 'For teachers')),
        h('li', null, h('a', { class: 'pill pill--ghost', href: href(['about']) }, 'About')))));
    menuEl.addEventListener('click', function (ev) { if (ev.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !menuEl.hidden) { closeMenu(); menuBtn.focus(); } });
  }
  function openMenu() { menuEl.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; header.classList.add('is-solid'); var f = menuEl.querySelector('a'); if (f) f.focus(); }
  function closeMenu() { if (!menuEl) return; menuEl.hidden = true; if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; onScroll(); }
  function onScroll() { if (header && (!menuEl || menuEl.hidden)) header.classList.toggle('is-solid', window.scrollY > 40 || !main.querySelector('.hero')); }

  function start() {
    main = document.getElementById('main');
    buildHeader();
    window.addEventListener('hashchange', render);
    window.addEventListener('scroll', onScroll, { passive: true });
    render();
  }
  /* Deferred scripts run while the document is still "interactive", so wait for DOMContentLoaded: by then every game file has registered. */
  if (document.readyState === 'complete') start(); else document.addEventListener('DOMContentLoaded', start);
})();
