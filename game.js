const db = require("./db");

module.exports = {
  initGameState,
}

async function initGameState(player1, player2 = "computer") {
  const state = { board: [["", "", ""],["", "", ""],["", "", ""]], player1, player2};
  const gameRef = await db.createGameDocument();
  state.gameId = gameRef.id;
  return state;
}

function handleMove(state) {

}