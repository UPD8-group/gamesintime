# Games in Time

**gamesintime.com**: play the games kids played a hundred years and more ago, and learn who played them.

Free for everyone. No accounts, no ads, no tracking, no AI in the product. Built for kids aged 10 to 14, their teachers, and anyone curious. The 1970s, 80s and 90s live on the sister site, [1973.ai](https://1973.ai); Games in Time starts the clock earlier.

## Run it

- `npm start` serves `public/` at http://localhost:3000 (Python 3 required). Or just open `public/index.html` in a browser; the site works from a file, a USB stick or a shared drive, with no internet.
- `npm run build` copies the site into `dist/` (what Netlify deploys).
- `npm test` opens every page in headless Chromium and fails on errors, missing games, small touch targets or horizontal overflow. Needs `npm install` once (Playwright, dev only).
- `node tests/page.mjs '#/game/nim' ./check.mjs 360` opens one route, optionally runs a play-test script against it.

## How it is built

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies in the shipped site.

| Path | What it is |
|---|---|
| `public/index.html` | The one page. Loads the shell and every game file. |
| `public/app.js` | The shell: hash routing, the halls, game pages, the Teachers page, printables, and the small API every game plugs into. |
| `public/styles.css` | Design tokens (light and dark), layout, shared game controls. |
| `public/content.js` | Every word on the site: eras, the games catalogue with stories and sources, the "Kids your age" panels, teacher material, newspaper quotes, the 1913 crossword data. Edit this to change what the site says. |
| `public/games/<id>.js` | One file per playable game. See `docs/ADDING-A-GAME.md`. |
| `docs/RESEARCH.md` | The checked history behind every entry, with sources and what we are not sure about. |
| `docs/research/` | Raw research output (JSON) kept for provenance. |
| `tests/` | Smoke test and the one-page harness. |

Routes: `#/` home, `#/era/1880s`, `#/game/reversi`, `#/all`, `#/real-life`, `#/teachers`, `#/about`, `#/print/dots`.

## Rules for the history

1. Every date and story is checked against sources we actually read, and the sources are listed on the game page.
2. When historians disagree, we say so. What we cannot confirm goes under "What we are not sure about".
3. We use the names people used at the time, and avoid trademarked names that belong to companies today (Othello, Parcheesi, Chutes and Ladders, and so on).
4. We say where each game came from. Many reached Australia by ship, by newspaper and with migrants.
5. Games are played by their historical rules. Reversi starts with an empty centre, as in 1883. Where modern rules differ, the page says so.

## Rules for the games

- Keyboard and touch, both themes, 320px and up, no horizontal scroll.
- A computer opponent where it makes sense, and two players on one device where it makes sense.
- The computer's thinking is explained in plain words on the page ("How the computer plays"), because that is the computing lesson.
- Nothing that needs a server. Online multiplayer is a possible later phase.

## Deploy

Netlify: connect the repository, build command `npm run build`, publish directory `dist`. `netlify.toml` already says so and sets security headers, including a Content Security Policy that only allows the site's own files and Google Fonts.

## Credits

Games in Time began with an idea from a thirteen-year-old. The halls, the games and the "Kids your age" panels grew from that question.
