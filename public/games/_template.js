/* Template for a Games in Time game. Copy to public/games/<id>.js. See docs/ADDING-A-GAME.md */
(function () {
  'use strict';
  GamesInTime.register({
    id: 'my-game',
    mount: function (root, api) {
      var h = api.h;
      root.appendChild(h('style', null,
        '.game-my-game .board { display: grid; gap: 4px; }' +
        '.game-my-game .cell { min-width: 44px; min-height: 44px; border: 2px solid var(--line); background: var(--surface); border-radius: 6px; }'));
      var toolbar = h('div', { class: 'game-toolbar' },
        h('button', { class: 'btn btn-primary', type: 'button', onclick: newGame }, 'New game'));
      var board = h('div', { class: 'board', role: 'group', 'aria-label': 'Board' });
      root.appendChild(toolbar);
      root.appendChild(board);
      function newGame() {
        board.replaceChildren();
        api.status('Your turn');
      }
      newGame();
      return { destroy: function () {} };
    }
  });
})();
