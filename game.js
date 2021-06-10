const db = require("./db");

module.exports = {
  initGameState,
  handleMove,
  handleComputerMove,
};

async function initGameState(player1, player2 = "computer") {
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
  const gameRef = await db.createGameDocument();
  state.gameId = gameRef.id;
  return state;
}

function handleMove(state, playerUid, coordinates) {
  // console.log(state, playerUid, coordinates);
  const currentValue = state.player1 === playerUid ? "X" : "O";
  const board = state.board;
  board[coordinates.y][coordinates.x] = currentValue;

  const boardResult = checkGameStatus(board);
  if (boardResult.gameOver) {
    state.status = "complete";
    if (boardResult.result === "draw") state.winner = "draw";
    else {
      state.winner = boardResult.result === "X" ? "player1" : "player2";
    }
  } else {
    state.turn = playerUid === state.player1 ? "player2" : "player1";
  }
  return state;
}

function handleComputerMove(state) {
  const flatBoard = state.board.flat();
  const available = [];
  flatBoard.forEach((cell, index) => {
    if (cell === "") available.push(index);
  });
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
      state.winner = boardResult.result === "X" ? "player1" : "player2";
    }
  } else {
    state.turn = "player1";
  }
  state.board = twoDimensionalBoard;
  return state;
}

function checkGameStatus(board) {
  // check for row match
  for (let row of board) {
    if (row.every((i) => i === row[0])) {
      return { gameOver: true, result: row[0] };
    }
  }
  // check for column match
  let i = 0;
  while (i < board.length) {
    if (board[0][i] === board[1][i] && board[0][i] === board[2][i]) {
      return { gameOver: true, result: board[0][i] };
    }
    i++;
  }

  // check for diagonal match
  if (board[0][0] === board[1][1] && board[0][0] === board[2][2]) {
    return { gameOver: true, result: board[0][0] };
  }
  if (board[0][2] === board[1][1] && board[0][2] === board[2][0]) {
    return { gameOver: true, result: board[0][2] };
  }

  // check for tie
  const flatBoard = board.flat();
  if (flatBoard.filter((i) => i === "").length === 0) {
    return { gameOver: true, result: "draw" };
  }
  return { gameOver: false };
}
