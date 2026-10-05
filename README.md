# Games in Time

**gamesintime.com**: play the games kids played, from candlelight to neon, and learn who played them.

Thirty-nine games from the 1800s to the 1980s, rebuilt so anyone can play them in a browser, right now, for free. Every game is playable online. Each game page opens on a big historical picture, and underneath sit the game itself, how to play, the story, did you know, what kids your age were doing, how the computer plays, notes for teachers, and the sources we checked.

Free for everyone. No accounts, no ads, no tracking, no AI in the product. Built for kids aged 10 to 14, their teachers, and anyone curious. The idea came from a thirteen-year-old.

## The seven halls

Each hall is dressed in the look of its time, from parlour gilt to arcade neon.

| Hall | Years | Look | Games |
|---|---|---|---|
| The Parlour | 1800 to 1879 | Mahogany, crimson and gilt | Twenty Questions, The Mansion of Happiness, Tangram, Draughts, Happy Families, Noughts and Crosses, Snap |
| The Schoolyard | 1800 to 1919 | Chalk on a slate | Cup and Ball, Hopscotch, Hoop and Stick, Knucklebones, Marbles, Skipping, Conkers |
| The Craze Decade | 1880 to 1889 | Chromolithograph colour | The Fifteen Puzzle, Halma, Reversi, Tiddlywinks, Dots and Boxes, Pigs in Clover |
| The Games Cupboard | 1890 to 1899 | Arts and Crafts | Ludo, Snakes and Ladders, Hangman |
| The New Century | 1900 to 1919 | Art Nouveau | Rock Paper Scissors, Nim, Klondike Patience, Diabolo, Jigsaw Puzzle, Word-Cross, Battleships |
| The Memory Console | 1970 to 1979 | Burnt orange, amber, wood and bakelite | The Memory Handset, Television Tennis, Brickfield, Trail, Starfall |
| The Neon Floor | 1980 to 1989 | Neon on midnight | Drifter, Rush, Prowl, Cascade |

## Run it

- `npm start` serves `public/` at http://localhost:3000 (needs Python 3).
- `npm run build` copies the site into `dist/`, which is what Netlify deploys.
- `npm install` once, then `npm test`, opens every page in headless Chromium at desktop and phone widths. It fails on script errors, a game that does not mount, touch targets under 36 px, or sideways scrolling.
- `node tests/page.mjs '#/game/nim' ./check.mjs 360` opens one route at one width and can run a play-test script against it.

## How it is built

Plain HTML, CSS and JavaScript. No framework, no build step and no dependencies in the shipped site.

| Path | What it is |
|---|---|
| `public/index.html` | The one page. Loads the shell, the content and every game file. |
| `public/app.js` | The shell: hash routing, the home page, the halls, game pages, the Teachers page, printables, sound, confetti, the ticket of stamps, and the small API every game plugs into. |
| `public/styles.css` | Colour tokens, the seven era themes, the period frames games sit in, and the page layout. |
| `public/content.js` | Every word on the site: halls, the games catalogue with stories and sources, the "Kids your age" panels, teacher lessons, the 1913 crossword, and picture credits. |
| `public/games/<id>.js` | One file per game. `docs/ADDING-A-GAME.md` explains the contract. |
| `public/img/` | Historical pictures in WebP, two sizes each. All public domain or freely licensed, mostly from Wikimedia Commons, and credited on the page that shows them. |
| `docs/game-notes/<id>.json` | Each game's how to play, controls and "How the computer plays" text. |
| `scripts/merge-notes.mjs` | Copies the game notes, research and picture credits into `public/content.js`. Run it with `node scripts/merge-notes.mjs` after editing those files. |
| `docs/RESEARCH.md` | Every story, source and doubt in one readable file, generated from `content.js` by `node scripts/research-doc.mjs`. |
| `docs/research/` | The raw research behind the stories and pictures, kept for provenance. |
| `tests/` | The smoke test and the one-page harness. |

Routes: `#/` home, `#/era/1880s` a hall, `#/game/reversi` a game, `#/all` every game, `#/about`, and For Teachers at `#/teachers` with its parts `#/teachers/lessons`, `#/teachers/curriculum`, `#/teachers/tips` and `#/teachers/printables`. The printables themselves are `#/print/dots`, `#/print/noughts` and `#/print/hundred`. Links like `#games` with no slash jump to part of the current page.

## Rules for the history

1. Every date and story is checked against sources we actually read, and the sources are listed on the game page.
2. When historians disagree, we say so. What we cannot confirm goes under "What we are not sure about".
3. We use the names people used at the time, and avoid names that are trademarks today. That is why the halls have Reversi, Battleships and Prowl rather than the brand names some of them later carried.
4. We say where each game came from. Many reached Australia by ship, by newspaper and with migrants.
5. Games are played by their historical rules. Reversi starts with an empty centre, as in 1883. Where modern rules differ, the page says so.

## Rules for the games

- Every game is played on screen. Nothing is "coming soon" and nothing is "try it outside".
- Each game sits in a period object: a games table, a school slate, card-table baize, a puzzle page, a painted tin, a stage, or an arcade cabinet.
- Touch, mouse and keyboard where the original allows, from 320 px wide, with no sideways scrolling.
- A computer opponent where it makes sense, and two players on one device where it makes sense.
- The computer's thinking is explained in plain words on the page, because that is the computing lesson.
- Sound is made in the browser with WebAudio, and one switch in the header turns it all off.
- Nothing needs a server.

## Deploy

Netlify builds the site with `npm run build` and publishes `dist`. `netlify.toml` already says so and sets security headers, including a Content Security Policy that only allows the site's own files and Google Fonts.
