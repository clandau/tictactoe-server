const db = require("./db");

module.exports = {
  initGameState,
  handleMove,
  handleComputerMove,
  addPlayer2,
};

/**
 * 
 * @param {string} player1 - UID of player 1
 * @param {string | null | undefined} player2 - UID of player 2, if exists. 
 * null if player 2 is expected but has not yet been set.
 * undefined if the second player is the computer, which is given the default value of "computer"
 * @returns {object} new game state object
 */
function initGameState(player1, player2 = "computer") {
  const state = {
    board: [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ],
    turn: "player1",
    status: "incomplete",
    player1,
    player2,
  };
  const gameRef = db.createGameDocument();
  state.gameId = gameRef.id;
  return state;
}

/**
 * @param {string} id - UID of the 2nd player
 * @param {object} state - current game state object
 * @returns {object} updated game state object
 */
function addPlayer2(id, state) {
  state.player2 = id;
  return state;
}

/**
 * @param {object} state - current game state
 * @param {string} playerUid - the UID of the player who moved
 * @param {object} coordinates - the X and Y coordinates of the move location
 * @returns {object} updated game state object
 */
function handleMove(state, playerUid, coordinates) {
  const currentValue = state.player1 === playerUid ? "X" : "O";
  const board = state.board;
  board[coordinates.y][coordinates.x] = currentValue;

  const boardResult = checkGameStatus(board);
  if (boardResult.gameOver) {
    state.status = "complete";
    if (boardResult.result === "draw") state.winner = "draw";
    else {
      state.winner = boardResult.result === "X" ? state.player1 : state.player2;
    }
    try {
      // save game to db
      db.saveCompletedGame(state);
    } catch (err) {
      console.error(err);
    }
  } else {
    state.turn = playerUid === state.player1 ? "player2" : "player1";
  }
  return state;
}

/**
 * determines a computer move
 * @param {object} state - current game state
 * @returns {object} updated game state
 */
function handleComputerMove(state) {
  const flatBoard = state.board.flat();
  const available = flatBoard.reduce((acc, curr, index) => {
    if (curr === "") {
      acc.push(index);
    }
    return acc;
  }, [])
  const index = Math.floor(Math.random() * available.length);
  flatBoard[available[index]] = "O";
  const twoDimensionalBoard = [];
  while (flatBoard.length) {
    twoDimensionalBoard.push(flatBoard.splice(0, 3));
  }
  const boardResult = checkGameStatus(twoDimensionalBoard);
  if (boardResult.gameOver) {
    state.status = "complete";
    if (boardResult.result === "draw") state.winner = "draw";
    else {
      state.winner = boardResult.result === "X" ? state.player1 : state.player2;
    }
    try {
      db.saveCompletedGame(state);
    } catch (err) {
      console.error(err);
    }
  } else {
    state.turn = "player1";
  }
  state.board = twoDimensionalBoard;
  return state;
}

/**
 * 
 * @param {string[][]} board current game board state
 * @returns {object} gameOver boolean, result X or O winner, or "draw"
 */
function checkGameStatus(board) {
  // check for row match
  for (let row of board) {
    if (!row.includes("") && row.every((i) => i === row[0])) {
      return { gameOver: true, result: row[0] };
    }
  }
  // check for column match
  let i = 0;
  while (i < board.length) {
    if (
      board[0][i] !== "" &&
      board[0][i] === board[1][i] &&
      board[0][i] === board[2][i]
    ) {
      return { gameOver: true, result: board[0][i] };
    }
    i++;
  }

  // check for diagonal match
  if (
    board[0][0] !== "" &&
    board[0][0] === board[1][1] &&
    board[0][0] === board[2][2]
  ) {
    return { gameOver: true, result: board[0][0] };
  }
  if (
    board[0][2] !== "" &&
    board[0][2] === board[1][1] &&
    board[0][2] === board[2][0]
  ) {
    return { gameOver: true, result: board[0][2] };
  }

  // check for tie
  const flatBoard = board.flat();
  if (flatBoard.filter((i) => i === "").length === 0) {
    return { gameOver: true, result: "draw" };
  }
  return { gameOver: false };
}
