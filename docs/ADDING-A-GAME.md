# Adding a game

Every game is one JavaScript file, `public/games/<id>.js`. No framework, no build step, no external files.
Games in Time must feel like a games site: bold, tactile, noisy (when sound is on), and rewarding to win.

1. The catalogue entry already exists in `public/content.js` (title, era, story, sources). Do not edit `content.js`.
2. Write `public/games/<id>.js`, starting from `public/games/_template.js`.
3. Write `docs/game-notes/<id>.json` (see below) with the rules and controls for the online version.
4. Test with `node tests/page.mjs '#/game/<id>' <your-check.mjs> 1280` and `... 360`, then `npm test`.

## The contract

```js
GamesInTime.register({
  id: 'draughts',
  frame: 'table',            // the period object the game sits in (see Frames)
  mount: function (root, api) {
    // build everything inside root
    return { destroy: function () { /* stop loops, timers and document listeners */ } };
  }
});
```

`root` is an empty `<div class="game-root game-<id>">` inside the frame. The shell puts the status line above the
frame, and "Classroom mode" and "Next game" below it. `api` gives you:

| Member | What it does |
|---|---|
| `api.status(text)` | The big status line above the game: "Your turn", "Computer is thinking", "You win, 5 boxes to 4". Screen readers hear it. Never leave it empty during play. |
| `api.announce(text)` | Extra screen-reader announcement without changing the status line. |
| `api.sound(name)` | Plays a synthesised sound if the visitor has sound on. Names: `click`, `tick`, `clack` (wooden piece), `thud`, `flip` (card), `shuffle`, `dice`, `pop`, `whoosh`, `chalk`, `bell`, `coin`, `wrong`, `lose`, `win`. Use them on every meaningful action. |
| `api.tone(freq, seconds, type, volume)` | Plays one synthesised note (an oscillator `type` such as `'square'` or `'sine'`) if the visitor has sound on. The arcade games use it for their bleeps and Skipping uses it for the chant. Check it exists before calling it. |
| `api.unlockSound()` | Wakes the browser's sound engine. Call it from the first tap or key press of a game that makes its own sounds, because browsers keep sound off until the visitor does something. |
| `api.celebrate(text)` | Call once when the player wins: confetti, a fanfare, a toast with `text`, and a star on their ticket. Call it for a new high score in solo games too. |
| `api.h(tag, attrs, ...children)` | Element helper. `attrs`: `class`, `text`, `style` (object), `on<event>` (function), any attribute. |
| `api.reducedMotion` | `true` when the visitor prefers reduced motion: skip shakes, long tweens and flashing, but keep the game fully playable. |
| `api.random()` | Random number in [0, 1). Use it instead of `Math.random`. |
| `api.store.get(key, fallback)` / `api.store.set(key, value)` | Remembers settings and best scores for this game only. Safe when storage is blocked. |
| `api.images()` | List of the site's historical pictures `{hero, card, alt, caption, credit}`. The jigsaw uses these. May be empty. |
| `api.content` | This game's entry from `content.js` (title, year, howToPlay, story). |
| `api.era` | The hall this game belongs to (`{id, name, years}`). |

## Frames

The shell wraps the game in a period object, like the cabinets in an arcade. Each frame sets its own colours, so use the
colour variables below and the game will read correctly inside it.

| Frame | Looks like | Inside colours | Use for |
|---|---|---|---|
| `table` | Polished wooden games table | dark walnut, cream ink | board games, dice games |
| `slate` | School slate in a pine frame | slate grey-green, chalk-white ink | pencil, chalk and word games |
| `baize` | Card table with green felt | green felt, cream ink, `--surface` is translucent | card games |
| `paper` | Puzzle page or notepad | cream paper, dark ink, blue `--brand` | crosswords, puzzles, pencil-and-paper |
| `tin` | Painted tin toy with gold pinstripes | deep blue enamel | dexterity toys |
| `stage` | Night-time stage | deep navy, cream ink | action and timing games drawn on a canvas |

## Colours (CSS variables)

Never hard-code a colour for text or a surface. Use:

- Surfaces: `--surface`, `--surface-2` (inside the frame), `--bg`, `--brand` (a board colour) with `--on-brand` text on it.
- Text and lines: `--ink`, `--ink-muted`, `--line`, `--link` (gold accent text), `--brand-text`.
- Poster colours for pieces, players and effects (read well on the dark site): `--gold`, `--vermilion`, `--peacock`,
  `--cobalt`, `--rose`, `--leaf`, plus `--red`, `--green`. `--era` is the colour of the current hall.
- Fonts: `--font-head` (Outfit, bold and friendly), `--font-display` (Abril Fatface, Victorian poster type, for big numbers
  and titles), `--font-mono` (Courier Prime, typewriter labels).

Inside a `<canvas>`, read the variables once at start with `getComputedStyle(root).getPropertyValue('--gold')`.

## Shared controls

Use these classes so every game matches: `.game-toolbar` (row of controls), `.btn`, `.btn-primary` (gold, the main
action), `.btn-ghost`, `.seg` (a pill group of buttons with `aria-pressed`), `.field` (label with a select or input),
`.scoreboard`, `.game-note`, `.board`. Game-specific CSS goes in a `<style>` element appended inside `root`, with every
selector starting `.game-<id>`.

## What makes it fun (required)

- **Juice.** Every action gives feedback: a sound, a small animation (a piece drops in, a card flips, a marble clicks),
  a score that ticks up. Wins get `api.celebrate()`. Losses get `api.sound('lose')` and a clear, kind message.
- **Instant start.** The game is playable the moment the page opens, or one big gold Start button away (action games).
- **A reason to play again.** Scores, best scores (`api.store`), difficulty levels, or a computer that adapts.
- **Big, readable pieces.** Projected on a classroom wall, a kid at the back should still follow it.
- **Honest history.** Play the historical rules. Where the online version adapts a physical game (flicking a marble
  with a mouse), say how in `howToPlay`.

## Rules every game follows

- Build everything inside `root`. Never touch elements outside it. Clean up in `destroy()`.
- Keyboard and touch both work. Buttons and cells are at least 36 by 36 CSS pixels at 360 px wide (board cells may be
  30 px when a board would not otherwise fit). Works at 320 px wide with no sideways page scroll.
- The computer opponent pauses about 350 ms before moving (0 with `api.reducedMotion`) so a kid can see what happened.
- Canvas games: scale for `devicePixelRatio`, resize with a `ResizeObserver` on `root`, run `requestAnimationFrame`
  only while playing, pause when `document.hidden`, stop everything in `destroy()`. Give the canvas `role="img"` and an
  `aria-label` that describes the scene, and give keyboard controls (Space, arrows, Enter) as well as pointer/touch.
  Use `touch-action: none` on the canvas only while dragging is part of play.
- No external resources, no `fetch` to other sites, no `innerHTML` built from user input, no `eval`.

## docs/game-notes/<id>.json

```json
{
  "howToPlay": ["Short step", "Short step"],
  "controls": "Tap or click a piece, then a square. Keyboard: arrows and Enter.",
  "computer": "How the computer opponent thinks, in plain words a 12-year-old can follow. Empty string if there is none.",
  "players": ["vs computer", "2 players"],
  "notes": "Anything adapted from the historical rules, and why."
}
```

The shell shows `howToPlay`, `controls` and `computer` under the game, so write them for kids: short sentences,
Australian English, no em-dashes.
