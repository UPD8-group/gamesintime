/* Games in Time: app shell.
   Hash routes: #/ home, #/era/<id>, #/game/<id>, #/all, #/real-life, #/teachers, #/about, #/print/<what>.
   Games register themselves with GamesInTime.register({id, mount}) from public/games/<id>.js. See docs/ADDING-A-GAME.md. */
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
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
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

  /* ---------- storage (always wrapped: private windows and school devices may block it) ---------- */
  var store = {
    get: function (key, fallback) {
      try { var v = localStorage.getItem('git:' + key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set: function (key, val) {
      try { localStorage.setItem('git:' + key, JSON.stringify(val)); } catch (e) { /* ignore */ }
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
    content: function () { return window.GIT_CONTENT || {}; }
  };
  window.GamesInTime = GamesInTime;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- content lookups ---------- */
  function C() { return window.GIT_CONTENT || { site: {}, eras: [], games: [], kids: [], curriculum: {}, trove: [] }; }
  function eras() { return C().eras || []; }
  function era(id) { return eras().filter(function (e) { return e.id === id; })[0]; }
  function games() { return C().games || []; }
  function game(id) { return games().filter(function (g) { return g.id === id; })[0]; }
  function gamesIn(eraId) {
    return games().filter(function (g) { return g.era === eraId; }).sort(function (a, b) { return (a.year - b.year) || a.title.localeCompare(b.title); });
  }
  function playable() { return games().filter(function (g) { return g.playable && registry[g.id]; }); }
  function kidsFor(eraId) { return (C().kids || []).filter(function (k) { return k.era === eraId; })[0]; }
  function troveFor(gameId) { return (C().trove || []).filter(function (t) { return t.gameId === gameId; }); }
  function lessonFor(gameId) { return ((C().curriculum || {}).lessons || []).filter(function (l) { return l.gameId === gameId; })[0]; }

  /* ---------- routing ---------- */
  var ROUTE_STYLE = window.GIT_ROUTE_STYLE || 'slash';
  function href(parts) {
    return ROUTE_STYLE === 'dot' ? '#' + parts.join('.') : '#/' + parts.join('/');
  }
  function parseRoute() {
    var raw = (location.hash || '').replace(/^#/, '');
    var parts;
    if (raw.charAt(0) === '/') parts = raw.slice(1).split('/');
    else parts = raw.split('.');
    parts = parts.filter(Boolean).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    return { name: parts[0] || 'home', id: parts[1] || '', rest: parts.slice(2) };
  }

  var main, current = null, firstRender = true;

  function navigateTitle(t) {
    document.title = t ? t + ' · ' + (C().site.name || 'Games in Time') : (C().site.name || 'Games in Time');
  }

  function render() {
    if (current && current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
    current = null;
    document.documentElement.classList.remove('classroom');
    if (document.fullscreenElement && document.exitFullscreen) { document.exitFullscreen().catch(function () {}); }
    closeMenu();
    var r = parseRoute();
    var view;
    switch (r.name) {
      case 'home': view = pageHome(); break;
      case 'era': view = pageEra(r.id); break;
      case 'game': view = pageGame(r.id); break;
      case 'all': view = pageAll(); break;
      case 'real-life': view = pageRealLife(); break;
      case 'teachers': view = pageTeachers(); break;
      case 'about': view = pageAbout(); break;
      case 'print': view = pagePrint(r.id); break;
      default: view = pageNotFound();
    }
    main.replaceChildren(view.el);
    navigateTitle(view.title);
    markCurrentNav(r);
    if (view.mount) view.mount();
    if (!firstRender) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      var heading = main.querySelector('h1');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    }
    firstRender = false;
  }

  function markCurrentNav(r) {
    var links = document.querySelectorAll('.site-nav a');
    Array.prototype.forEach.call(links, function (a) {
      var target = (a.getAttribute('href') || '').replace(/^#\/?/, '').split('/')[0] || 'home';
      var isCurrent = target === r.name || (target === 'home' && r.name === 'home');
      if (isCurrent) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  /* ---------- shared pieces ---------- */
  function badgeFor(g) {
    if (g.playable && registry[g.id]) return h('span', { class: 'badge badge--play' }, 'Play now');
    if (g.realLife) return h('span', { class: 'badge badge--real' }, 'Play in real life');
    if (g.kind === 'story') return h('span', { class: 'badge badge--story' }, 'The story');
    return h('span', { class: 'badge badge--soon' }, 'Coming soon');
  }
  function card(g) {
    var isPlay = g.playable && registry[g.id];
    return h('li', null,
      h('a', { class: 'card' + (isPlay ? ' card--playable' : ''), href: href(['game', g.id]) },
        h('span', { class: 'card-stamp' }, g.stamp || g.yearLabel || String(g.year)),
        h('span', { class: 'card-title' }, g.title),
        h('span', { class: 'card-blurb' }, g.blurb || ''),
        badgeFor(g)));
  }
  function cardGrid(list) {
    return h('ul', { class: 'card-grid' }, list.map(card));
  }
  function ticket(e) {
    var count = gamesIn(e.id).length;
    var playCount = gamesIn(e.id).filter(function (g) { return g.playable && registry[g.id]; }).length;
    if (e.gap) {
      return h('li', null, h('div', { class: 'ticket ticket--gap' },
        h('span', { class: 'ticket-years' }, e.years),
        h('span', { class: 'ticket-name' }, e.name),
        h('span', { class: 'ticket-count' }, e.intro)));
    }
    if (e.external) {
      return h('li', null, h('a', { class: 'ticket ticket--external', href: e.external, rel: 'noopener', target: '_blank' },
        h('span', { class: 'ticket-years' }, e.years),
        h('span', { class: 'ticket-name' }, e.name),
        h('span', { class: 'ticket-count' }, e.intro),
        h('span', { class: 'ticket-link' }, 'Open 1973.ai ↗')));
    }
    return h('li', null, h('a', { class: 'ticket', href: href(['era', e.id]) },
      h('span', { class: 'ticket-years' }, e.years),
      h('span', { class: 'ticket-name' }, e.name),
      h('span', { class: 'ticket-count' }, playCount + ' to play now · ' + count + ' in the hall'),
      h('span', { class: 'ticket-link' }, 'Enter the hall →')));
  }
  function sourcesList(sources) {
    if (!sources || !sources.length) return null;
    return h('ul', { class: 'sources' }, sources.map(function (s) {
      return h('li', null, h('a', { href: s.url, rel: 'noopener', target: '_blank' }, s.title), s.note ? ' — ' + s.note : '');
    }));
  }
  function paragraphs(list) { return (list || []).map(function (p) { return h('p', null, p); }); }

  /* ---------- pages ---------- */
  function pageHome() {
    var site = C().site;
    var play = playable();
    var el = h('div', null,
      h('section', { class: 'hero' },
        h('p', { class: 'eyebrow' }, 'A free time machine for games'),
        h('h1', null, site.name || 'Games in Time'),
        h('p', { class: 'lede' }, site.lede || site.tagline || ''),
        h('div', { class: 'hero-actions' },
          h('a', { class: 'btn btn-primary', href: href(['era', '1880s']) }, 'Start in the 1880s'),
          h('a', { class: 'btn', href: href(['teachers']) }, 'For teachers'))),
      h('section', { class: 'section', 'aria-labelledby': 'halls-title' },
        h('div', { class: 'section-head' }, h('h2', { id: 'halls-title' }, 'Pick a decade'), h('p', { class: 'muted' }, 'Each hall has games to play and the story of the kids who played them.')),
        h('ol', { class: 'rail', 'aria-label': 'Decades' }, eras().map(ticket))),
      play.length ? h('section', { class: 'section', 'aria-labelledby': 'play-title' },
        h('div', { class: 'section-head' }, h('h2', { id: 'play-title' }, 'Play now'), h('a', { href: href(['all']) }, 'All games')),
        cardGrid(play)) : null,
      h('section', { class: 'section', 'aria-labelledby': 'real-title' },
        h('div', { class: 'section-head' }, h('h2', { id: 'real-title' }, 'Play in real life')),
        h('p', { class: 'prose' }, 'Marbles, hopscotch, knucklebones and hoops do not need a screen. Learn the rules kids used, then try them at school or at home.'),
        h('p', null, h('a', { class: 'btn', href: href(['real-life']) }, 'See the playground games'))),
      h('section', { class: 'section', 'aria-labelledby': 'story-title' },
        h('div', { class: 'section-head' }, h('h2', { id: 'story-title' }, 'How this started')),
        h('p', { class: 'prose' }, 'Games in Time began with an idea from a thirteen-year-old: what did kids my age play a hundred years ago, and could we play those games today? Every game here is free, and every story is checked against real sources.'),
        h('p', null, h('a', { href: href(['about']) }, 'About the project'))));
    return { el: el, title: '' };
  }

  function kidsPanel(eraId, open) {
    var k = kidsFor(eraId);
    if (!k) return null;
    return h('details', { class: 'kids-panel', open: !!open },
      h('summary', null, k.title || 'Kids your age'),
      h('div', { class: 'kids-body' },
        h('div', { class: 'prose stack' }, paragraphs(k.paragraphs),
          k.compare ? h('div', { class: 'compare' }, h('strong', null, 'Talk about it: '), k.compare) : null),
        h('div', null,
          k.fastFacts && k.fastFacts.length ? h('div', { class: 'fast-facts' }, h('h3', null, 'Fast facts'), h('ul', null, k.fastFacts.map(function (f) { return h('li', null, f); }))) : null,
          k.sources && k.sources.length ? h('details', { class: 'muted', style: { marginTop: '.75rem', fontSize: '.9rem' } }, h('summary', null, 'Sources'), sourcesList(k.sources)) : null)));
  }

  function pageEra(id) {
    var e = era(id);
    if (!e || e.gap || e.external) return pageNotFound();
    var list = gamesIn(id);
    var play = list.filter(function (g) { return g.playable && registry[g.id]; });
    var rest = list.filter(function (g) { return !(g.playable && registry[g.id]); });
    var el = h('div', null,
      h('a', { class: 'crumb', href: href(['']) }, '← All decades'),
      h('header', { class: 'plaque' },
        h('p', { class: 'eyebrow' }, 'The ' + e.id + ' hall · ' + e.years),
        h('h1', null, e.name),
        h('p', { class: 'lede' }, e.intro || '')),
      kidsPanel(id, false),
      play.length ? h('section', { class: 'section', 'aria-labelledby': 'play-title' },
        h('div', { class: 'section-head' }, h('h2', { id: 'play-title' }, 'Play now')), cardGrid(play)) : null,
      rest.length ? h('section', { class: 'section', 'aria-labelledby': 'more-title' },
        h('div', { class: 'section-head' }, h('h2', { id: 'more-title' }, play.length ? 'Also in this hall' : 'In this hall'), h('p', { class: 'muted' }, 'Games to play off-screen, stories to read, and games we are still digitising.')), cardGrid(rest)) : null,
      !list.length ? h('p', { class: 'notice' }, 'This hall is being built. Check back soon.') : null);
    return { el: el, title: e.name + ' (' + e.years + ')' };
  }

  function pageAll() {
    var sections = eras().filter(function (e) { return !e.gap && !e.external; }).map(function (e) {
      var list = gamesIn(e.id);
      if (!list.length) return null;
      return h('section', { class: 'section', 'aria-labelledby': 'era-' + e.id },
        h('div', { class: 'section-head' }, h('h2', { id: 'era-' + e.id }, h('a', { href: href(['era', e.id]) }, e.name + ' · ' + e.years))),
        cardGrid(list));
    });
    var el = h('div', null,
      h('header', { class: 'page-head' }, h('p', { class: 'eyebrow' }, 'Every game, by decade'), h('h1', null, 'All games'),
        h('p', { class: 'lede' }, playable().length + ' to play now, ' + games().length + ' in the collection.')),
      sections);
    return { el: el, title: 'All games' };
  }

  function pageRealLife() {
    var list = games().filter(function (g) { return g.realLife; }).sort(function (a, b) { return a.title.localeCompare(b.title); });
    var el = h('div', null,
      h('header', { class: 'page-head' }, h('p', { class: 'eyebrow' }, 'No screen needed'), h('h1', null, 'Play in real life'),
        h('p', { class: 'lede' }, 'These games were played in streets, paddocks and schoolyards for a very long time. Learn the rules, then play them where you are.')),
      list.length ? cardGrid(list) : h('p', { class: 'notice' }, 'Coming soon.'));
    return { el: el, title: 'Play in real life' };
  }

  /* ----- game page ----- */
  function pageGame(id) {
    var g = game(id);
    if (!g) return pageNotFound();
    var e = era(g.era);
    var def = g.playable ? registry[g.id] : null;
    var statusEl = h('div', { class: 'game-status', role: 'status', 'aria-live': 'polite' });
    var root = h('div', { class: 'game-root game-' + g.id });
    var live = document.getElementById('sr-live');
    var api = {
      status: function (text) { statusEl.textContent = text || ''; },
      announce: function (text) { if (live) { live.textContent = ''; setTimeout(function () { live.textContent = text || ''; }, 30); } },
      reducedMotion: reducedMotion,
      h: h,
      random: Math.random,
      store: {
        get: function (k, fb) { return store.get(g.id + ':' + k, fb); },
        set: function (k, v) { store.set(g.id + ':' + k, v); }
      },
      content: g,
      site: C()
    };

    var classroomBtn = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false' }, 'Classroom mode');
    var panel = h('section', { class: 'game-panel', 'aria-label': 'Play ' + g.title }, statusEl, root,
      h('div', { class: 'game-tools no-print' }, classroomBtn, h('span', { class: 'game-note', style: { marginTop: '0' } }, 'Fills the screen for projecting. Press Escape to leave.')));
    classroomBtn.addEventListener('click', function () {
      var on = !document.documentElement.classList.contains('classroom');
      document.documentElement.classList.toggle('classroom', on);
      classroomBtn.setAttribute('aria-pressed', String(on));
      classroomBtn.textContent = on ? 'Leave classroom mode' : 'Classroom mode';
      if (on && panel.requestFullscreen) { panel.requestFullscreen().catch(function () {}); }
      if (!on && document.fullscreenElement && document.exitFullscreen) { document.exitFullscreen().catch(function () {}); }
    });
    function onFsChange() {
      if (!document.fullscreenElement && document.documentElement.classList.contains('classroom')) {
        document.documentElement.classList.remove('classroom');
        classroomBtn.setAttribute('aria-pressed', 'false');
        classroomBtn.textContent = 'Classroom mode';
      }
    }
    function onKey(ev) {
      if (ev.key === 'Escape' && document.documentElement.classList.contains('classroom') && !document.fullscreenElement) classroomBtn.click();
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('keydown', onKey);

    /* tabs */
    var lesson = lessonFor(g.id);
    var trove = troveFor(g.id);
    var tabs = [];
    var isStory = g.kind === 'story';
    if (g.howToPlay && g.howToPlay.length) tabs.push({ id: 'how', label: isStory ? 'A visit, step by step' : 'How to play', body: h('div', { class: 'stack' }, h('ol', null, g.howToPlay.map(function (s) { return h('li', null, s); })), g.computer ? h('div', null, h('h3', null, 'How the computer plays'), h('p', null, g.computer)) : null) });
    if (g.story && g.story.length) tabs.push({ id: 'story', label: 'The story', body: h('div', { class: 'prose stack' }, paragraphs(g.story), trove.length ? h('div', null, h('h3', null, 'From the newspapers'), trove.map(function (t) {
      return h('div', { class: 'trove-quote' }, h('blockquote', null, '“' + (t.cleanQuote || t.rawQuote) + '”'), h('cite', null, t.newspaper + ', ' + t.date + '. ', h('a', { href: t.url, rel: 'noopener', target: '_blank' }, 'Read it on Trove')));
    })) : null) });
    if (g.didYouKnow && g.didYouKnow.length) tabs.push({ id: 'facts', label: 'Did you know', body: h('ul', null, g.didYouKnow.map(function (s) { return h('li', null, s); })) });
    if (lesson || g.computer) tabs.push({ id: 'teach', label: 'For teachers', body: h('div', { class: 'stack' },
      lesson ? h('div', { class: 'lesson' }, h('h3', null, lesson.title), h('p', { class: 'muted' }, lesson.yearLevels), h('p', null, lesson.idea), lesson.computerAngle ? h('p', { class: 'computer' }, lesson.computerAngle) : null, lesson.curriculumUrl ? h('p', null, h('a', { href: lesson.curriculumUrl, rel: 'noopener', target: '_blank' }, 'Curriculum link')) : null) : null,
      h('p', null, h('a', { href: href(['teachers']) }, 'More for teachers'))) });
    if (g.sources && g.sources.length) tabs.push({ id: 'sources', label: 'Sources', body: h('div', null, sourcesList(g.sources), g.uncertainties && g.uncertainties.length ? h('details', { style: { marginTop: '.75rem' } }, h('summary', null, 'What we are not sure about'), h('ul', { class: 'sources' }, g.uncertainties.map(function (u) { return h('li', null, u); }))) : null) });

    if (isStory) { var storyIdx = tabs.findIndex(function (t) { return t.id === 'story'; }); if (storyIdx > 0) tabs.unshift(tabs.splice(storyIdx, 1)[0]); }
    var tablist = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'About ' + g.title });
    var panels = [];
    tabs.forEach(function (t, i) {
      var btn = h('button', { role: 'tab', type: 'button', id: 'tab-' + t.id, 'aria-controls': 'panel-' + t.id, 'aria-selected': i === 0 ? 'true' : 'false', tabindex: i === 0 ? '0' : '-1' }, t.label);
      var pnl = h('div', { class: 'tabpanel', role: 'tabpanel', id: 'panel-' + t.id, 'aria-labelledby': 'tab-' + t.id, hidden: i !== 0 }, t.body);
      btn.addEventListener('click', function () { selectTab(i); });
      btn.addEventListener('keydown', function (ev) {
        var n = tabs.length, j = i;
        if (ev.key === 'ArrowRight') j = (i + 1) % n; else if (ev.key === 'ArrowLeft') j = (i - 1 + n) % n; else if (ev.key === 'Home') j = 0; else if (ev.key === 'End') j = n - 1; else return;
        ev.preventDefault(); selectTab(j); tablist.children[j].focus();
      });
      tablist.appendChild(btn); panels.push(pnl);
    });
    function selectTab(j) {
      tabs.forEach(function (t, i) {
        tablist.children[i].setAttribute('aria-selected', i === j ? 'true' : 'false');
        tablist.children[i].setAttribute('tabindex', i === j ? '0' : '-1');
        panels[i].hidden = i !== j;
      });
    }

    var then = h('aside', { class: 'then-panel', 'aria-label': 'Then: the history of ' + g.title },
      h('div', { class: 'then-head' }, h('p', { class: 'eyebrow' }, 'Then'), h('p', null, h('strong', null, g.yearLabel || g.year), g.origin ? ' · ' + g.origin : '')),
      tablist, panels);

    var notPlayable = null;
    if (!def && !isStory) {
      notPlayable = h('div', { class: 'coming-soon' },
        h('p', null, h('strong', null, g.realLife ? 'This one is played off-screen.' : 'Not digitised yet.')),
        h('p', { class: 'muted' }, g.realLife ? 'Read how to play, then try it in the playground.' : 'We are building it. The story and the rules are ready now.'));
    }

    var el = h('article', { class: 'game-page' },
      h('a', { class: 'crumb', href: e ? href(['era', e.id]) : href(['all']) }, '← ' + (e ? 'The ' + e.id + ' hall' : 'All games')),
      h('header', { class: 'game-head' },
        h('h1', null, g.title),
        h('p', { class: 'game-meta' }, h('span', { class: 'stamp' }, g.yearLabel || g.year), g.origin ? h('span', null, g.origin) : null, badgeFor(g)),
        g.blurb ? h('p', { class: 'lede' }, g.blurb) : null),
      h('div', { class: 'game-layout' + (isStory ? ' game-layout--story' : '') }, def ? panel : notPlayable, then));

    var mounted = null;
    return {
      el: el, title: g.title,
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
    /* note: render() calls destroy via current */
  }

  function pageTeachers() {
    var cur = C().curriculum || {};
    var el = h('div', null,
      h('header', { class: 'page-head' }, h('p', { class: 'eyebrow' }, 'Games in Time in the classroom'), h('h1', null, 'For teachers'),
        h('p', { class: 'lede' }, 'Every game comes with a checked history, primary sources and a lesson idea. Nothing to sign up for, nothing to install.')),
      h('section', { class: 'section', 'aria-labelledby': 'know-title' },
        h('h2', { id: 'know-title' }, 'What you need to know'),
        h('ul', { class: 'stack', style: { marginTop: '.75rem' } },
          h('li', null, h('strong', null, 'No accounts, no ads, no tracking. '), 'The site does not collect names, emails or any personal information. It works the same for every student.'),
          h('li', null, h('strong', null, 'Works on any device. '), 'iPads, Chromebooks, laptops and interactive whiteboards. Pairs on one device work well for the two-player games.'),
          h('li', null, h('strong', null, 'Works offline. '), 'Download the site from GitHub, open index.html from a USB stick or a shared drive, and it runs without internet.'),
          h('li', null, h('strong', null, 'Classroom mode. '), 'Every playable game has a button that fills the screen for projecting.'),
          h('li', null, h('strong', null, 'Sources on every page. '), 'The Then panel beside each game cites the sources we used, and says what we are not sure about. Use it as a source-analysis task.'))),
      cur.lessons && cur.lessons.length ? h('section', { class: 'section', 'aria-labelledby': 'lessons-title' },
        h('h2', { id: 'lessons-title' }, 'Lesson ideas, twenty minutes each'),
        h('div', { class: 'card-grid lesson-grid', style: { marginTop: '1rem' } }, cur.lessons.map(function (l) {
          var g = game(l.gameId);
          return h('div', { class: 'lesson' }, h('h3', null, l.title), h('p', { class: 'muted' }, (g ? g.title + ' · ' : '') + l.yearLevels), h('p', null, l.idea), l.computerAngle ? h('p', { class: 'computer' }, l.computerAngle) : null,
            h('p', null, g ? h('a', { href: href(['game', g.id]) }, 'Open ' + g.title) : null, l.curriculumUrl ? [' · ', h('a', { href: l.curriculumUrl, rel: 'noopener', target: '_blank' }, 'Curriculum')] : null));
        }))) : null,
      cur.links && cur.links.length ? h('section', { class: 'section', 'aria-labelledby': 'curr-title' },
        h('h2', { id: 'curr-title' }, 'Curriculum links'),
        h('p', { class: 'muted', style: { margin: '.5rem 0 1rem' } }, 'Where the site fits. Codes are shown only where we could verify them on the curriculum site.'),
        h('div', { class: 'table-wrap' }, h('table', null,
          h('thead', null, h('tr', null, h('th', null, 'Curriculum'), h('th', null, 'Year'), h('th', null, 'Area'), h('th', null, 'Content'), h('th', null, 'Why it fits'))),
          h('tbody', null, cur.links.map(function (l) {
            return h('tr', null, h('td', null, l.jurisdiction), h('td', null, l.yearLevel), h('td', null, l.learningArea),
              h('td', null, l.code ? h('strong', null, l.code + ' ') : null, h('a', { href: l.url, rel: 'noopener', target: '_blank' }, l.description)), h('td', null, l.relevance));
          }))))) : null,
      cur.tips && cur.tips.length ? h('section', { class: 'section', 'aria-labelledby': 'tips-title' },
        h('h2', { id: 'tips-title' }, 'Classroom tips'), h('ul', { style: { marginTop: '.75rem' } }, cur.tips.map(function (t) { return h('li', null, t); }))) : null,
      h('section', { class: 'section', 'aria-labelledby': 'print-title' },
        h('h2', { id: 'print-title' }, 'Printables'),
        h('p', { class: 'muted', style: { margin: '.5rem 0 1rem' } }, 'Boards to print for pencil-and-paper play.'),
        h('div', { class: 'hero-actions' },
          h('a', { class: 'btn', href: href(['print', 'dots']) }, 'Dots and Boxes grids'),
          h('a', { class: 'btn', href: href(['print', 'noughts']) }, 'Noughts and Crosses sheet'),
          h('a', { class: 'btn', href: href(['print', 'hundred']) }, 'Hundred-square board'))));
    return { el: el, title: 'For teachers' };
  }

  function pageAbout() {
    var site = C().site;
    var el = h('div', { class: 'prose stack' },
      h('header', { class: 'page-head' }, h('p', { class: 'eyebrow' }, 'The project'), h('h1', null, 'About Games in Time')),
      h('p', null, 'Games in Time began with an idea from a thirteen-year-old. What did kids my age play a hundred years ago? Could we play those games today, for free, and learn about the kids who played them?'),
      h('p', null, 'So we went looking. The halls run from the 1800s to the 1910s. Each one holds games you can play right now, games we are still digitising, and games that were always played off-screen, in the street or the schoolyard. Beside every game is a Then panel: the year, where it came from, who played it, and the sources we used.'),
      h('h2', null, 'Our rules for the history'),
      h('ul', null,
        h('li', null, 'Every date and story is checked against sources we actually read, and the sources are listed on the page.'),
        h('li', null, 'When historians disagree, we say so. When we cannot confirm something, it goes under "What we are not sure about".'),
        h('li', null, 'We use the names people used at the time, and we avoid trademarked names that belong to companies today.'),
        h('li', null, 'The games are from everywhere. Many came to Australia with migrants, in newspapers, and in ships’ cargo. We say where each one came from.')),
      h('h2', null, 'Free, for everyone'),
      h('p', null, 'No accounts, no ads, no tracking. The whole site is plain HTML, CSS and JavaScript, and you can download it and run it offline. The code is open: ', h('a', { href: site.repo, rel: 'noopener', target: '_blank' }, 'see it on GitHub'), '.'),
      h('h2', null, 'Add a game'),
      h('p', null, 'Each game is one small file. If you can write a little JavaScript, you can add one. The how-to is in the repository under docs/ADDING-A-GAME.md.'),
      h('h2', null, 'The 1970s, 80s and 90s'),
      h('p', null, 'Those decades live on our sister site, ', h('a', { href: site.sister ? site.sister.url : 'https://1973.ai', rel: 'noopener' }, site.sister ? site.sister.name : '1973.ai'), '. Games in Time starts the clock earlier.'));
    return { el: el, title: 'About' };
  }

  function pagePrint(what) {
    var body, title;
    if (what === 'dots') {
      title = 'Dots and Boxes grids';
      body = h('div', { class: 'print-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' } },
        [0, 1, 2, 3].map(function () { return dotsGridSvg(6); }));
    } else if (what === 'noughts') {
      title = 'Noughts and Crosses sheet';
      body = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '24px' } },
        Array.apply(null, Array(12)).map(function () { return noughtsSvg(); }));
    } else if (what === 'hundred') {
      title = 'Hundred-square board';
      body = hundredSvg();
    } else return pageNotFound();
    var el = h('div', null,
      h('div', { class: 'no-print', style: { display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' } },
        h('a', { class: 'crumb', href: href(['teachers']) }, '← For teachers'),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { window.print(); } }, 'Print this page')),
      h('div', { class: 'print-page' }, h('h1', { style: { fontSize: '1.5rem', marginBottom: '1rem' } }, title), body));
    return { el: el, title: title };
  }
  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }
  function dotsGridSvg(n) {
    var s = svgEl('svg', { viewBox: '0 0 220 220', width: '100%', role: 'img', 'aria-label': n + ' by ' + n + ' dot grid' });
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) s.appendChild(svgEl('circle', { cx: 20 + c * 36, cy: 20 + r * 36, r: 3.2, fill: '#000' }));
    return s;
  }
  function noughtsSvg() {
    var s = svgEl('svg', { viewBox: '0 0 150 150', width: '100%', role: 'img', 'aria-label': 'Empty noughts and crosses grid' });
    [50, 100].forEach(function (p) {
      s.appendChild(svgEl('line', { x1: p, y1: 5, x2: p, y2: 145, stroke: '#000', 'stroke-width': 2 }));
      s.appendChild(svgEl('line', { x1: 5, y1: p, x2: 145, y2: p, stroke: '#000', 'stroke-width': 2 }));
    });
    return s;
  }
  function hundredSvg() {
    var s = svgEl('svg', { viewBox: '0 0 520 520', width: '100%', role: 'img', 'aria-label': 'Hundred-square board numbered boustrophedon from the bottom left' });
    for (var r = 0; r < 10; r++) for (var c = 0; c < 10; c++) {
      var rowFromBottom = 9 - r;
      var num = rowFromBottom * 10 + (rowFromBottom % 2 === 0 ? c + 1 : 10 - c);
      s.appendChild(svgEl('rect', { x: 10 + c * 50, y: 10 + r * 50, width: 50, height: 50, fill: 'none', stroke: '#000', 'stroke-width': 1.5 }));
      var t = svgEl('text', { x: 15 + c * 50, y: 26 + r * 50, 'font-size': 13, 'font-family': 'sans-serif', fill: '#000' });
      t.textContent = String(num); s.appendChild(t);
    }
    return s;
  }

  function pageNotFound() {
    var el = h('div', { class: 'stack' }, h('h1', null, 'That room is not here'), h('p', null, 'The page you asked for does not exist, or it has moved.'), h('p', null, h('a', { class: 'btn', href: href(['']) }, 'Back to the time machine')));
    return { el: el, title: 'Not found' };
  }

  /* ---------- header behaviour ---------- */
  var nav, menuBtn;
  function closeMenu() { if (nav) { nav.classList.remove('is-open'); } if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false'); }
  function setupHeader() {
    nav = document.getElementById('site-nav');
    menuBtn = document.querySelector('.menu-toggle');
    if (menuBtn) menuBtn.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    var toggle = document.getElementById('theme-toggle');
    function effectiveDark() {
      var t = document.documentElement.getAttribute('data-theme');
      if (t) return t === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    function reflect() {
      var dark = effectiveDark();
      if (toggle) { toggle.setAttribute('aria-pressed', String(dark)); toggle.textContent = dark ? 'Light mode' : 'Dark mode'; }
    }
    var saved = store.get('theme', null);
    if (saved === 'dark' || saved === 'light') document.documentElement.setAttribute('data-theme', saved);
    reflect();
    if (toggle) toggle.addEventListener('click', function () {
      var next = effectiveDark() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      store.set('theme', next);
      reflect();
    });
  }

  function start() {
    main = document.getElementById('main');
    setupHeader();
    window.addEventListener('hashchange', render);
    render();
  }
  /* Deferred scripts run while the document is still "interactive", so wait for DOMContentLoaded: by then every game file has registered. */
  if (document.readyState === 'complete') start(); else document.addEventListener('DOMContentLoaded', start);
})();
