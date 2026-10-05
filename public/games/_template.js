/* Template for a Games in Time game. Copy to public/games/<id>.js. See docs/ADDING-A-GAME.md */
(function () {
  'use strict';
  GamesInTime.register({
    id: 'my-game',
    frame: 'table',
    mount: function (root, api) {
      var h = api.h;
      root.appendChild(h('style', null,
        '.game-my-game .cells { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: min(90vw, 360px); margin-inline: auto; }' +
        '.game-my-game .cell { aspect-ratio: 1; min-height: 44px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); border-radius: 12px; font-family: var(--font-display); font-size: 2rem; }'));
      var toolbar = h('div', { class: 'game-toolbar' },
        h('button', { class: 'btn btn-primary', type: 'button', onclick: newGame }, 'New game'));
      var board = h('div', { class: 'cells', role: 'group', 'aria-label': 'Board' });
      root.appendChild(toolbar);
      root.appendChild(board);
      function newGame() {
        board.replaceChildren();
        api.sound('shuffle');
        api.status('Your turn');
      }
      newGame();
      return { destroy: function () {} };
    }
  });
})();
