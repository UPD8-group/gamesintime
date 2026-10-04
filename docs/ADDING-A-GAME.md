# Adding a game

Every game is one small JavaScript file. No build step, no framework.

1. Add an entry to `public/content.js` under `games`. Set `playable: true`.
2. Copy `public/games/_template.js` to `public/games/<id>.js` and fill it in. The `id` must match the content entry.
3. Add `<script src="games/<id>.js" defer></script>` to `public/index.html`, after the other game scripts.
4. Run `npm test`. It opens every page in a headless browser and fails on any error.

## The contract

```js
GamesInTime.register({
  id: 'my-game',
  mount: function (root, api) {
    // build the game inside root
    return { destroy: function () { /* clear timers, remove document listeners */ } };
  }
});
```

`root` is an empty `<div class="game-root game-<id>">` that belongs to the game. `api` gives you:

| Member | What it does |
|---|---|
| `api.status(text)` | Sets the status line above the board, e.g. "Your turn" or "Blue wins". Screen readers hear it. |
| `api.announce(text)` | Extra screen-reader announcement without changing the status line. |
| `api.h(tag, attrs, ...children)` | Element helper. `attrs` keys: `class`, `text`, `style` (object), `on<event>` (function), any attribute. Children can be strings, nodes or arrays. |
| `api.reducedMotion` | `true` when the visitor prefers reduced motion. Skip animations. |
| `api.random()` | Random number in [0, 1). Use it instead of `Math.random` so tests can seed it later. |
| `api.store.get(key, fallback)` / `api.store.set(key, value)` | Remembers settings such as difficulty for this game only. Safe when storage is blocked. |
| `api.content` | This game's entry from `content.js` (title, year, howToPlay, and so on). |
| `api.site` | The whole `GIT_CONTENT` object. |

## Rules every game follows

- Build everything inside `root`. Never touch elements outside it. Clean up in `destroy()`.
- Keyboard playable: cells are `<button>` elements, or focusable elements with key handlers. Every cell has an `aria-label` that says what it is and what is on it.
- Touch friendly: targets at least 44 by 44 CSS pixels. Works at 320px wide with no horizontal scroll. Use `touch-action: manipulation` on the board (the shared `.board` class does this).
- Use the shared classes: `.game-toolbar` (row of controls), `.btn`, `.btn-primary`, `.btn-ghost`, `.seg` (segmented control of buttons with `aria-pressed`), `.field` (label and select), `.board`, `.scoreboard`, `.game-note`.
- Colours come from CSS variables so both themes work. Backgrounds: `--bg`, `--surface`, `--surface-2`, `--brand` (teal, with `--on-brand` text on it). Text and borders on a surface: `--ink`, `--ink-muted`, `--link`, `--brand-text`, `--line`. Accents that read in both themes: `--brass`, `--brass-bright`, `--red`, `--green`. Never use `--brand` or `--brand-2` as a text colour on a surface: in dark mode they are dark. Never hard-code a colour that only reads in one theme.
- Game-specific CSS goes in a `<style>` element appended inside `root`, with every rule prefixed by `.game-<id>` so it cannot leak.
- No external resources, no `fetch`, no `innerHTML` built from user input.
- Always offer a New game button. Offer "Play the computer" and "Two players, one device" where that makes sense, and a difficulty choice where it is sensible.
- Call `api.status(...)` for whose turn it is and for the result. Announce wins clearly.
- Play the historical rules. If the modern version differs, say so in the content entry, not by changing the rules.
- The computer opponent must move after a short pause (about 350 ms, or immediately with `api.reducedMotion`) so a kid can see what happened.

## Content entry fields

```js
{
  id: 'reversi', title: 'Reversi', era: '1880s', year: 1883, yearLabel: '1883', origin: 'England',
  blurb: 'One sentence for the card.',
  story: ['Paragraph', 'Paragraph'],
  howToPlay: ['Step', 'Step'],
  didYouKnow: ['Fact', 'Fact'],
  computer: 'How the computer opponent thinks, in plain words.',
  sources: [{title: 'Page title', url: 'https://...', note: 'optional'}],
  uncertainties: ['Anything not confirmed'],
  playable: true,       // has a games/<id>.js file
  realLife: false,      // true for playground games played off-screen
  kind: 'game'          // or 'story' for entries that are history only
}
```
