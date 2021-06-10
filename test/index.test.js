const assert = require("chai").assert;

const game = require("../game");

describe("handle a game move logic", () => {
  let state = { player1: "123", board: [[], [], []], status: "incomplete" };
  let playerUid = "123";

  let boardWithRowWin = [
    ["X", "X", ""],
    ["O", "O", ""],
    ["X", "O", "X"],
  ];
  let boardWithRowWinResult = [
    ["X", "X", "X"],
    ["O", "O", ""],
    ["X", "O", "X"],
  ];
  let boardWithColumnWin = [
    ["O", "X", "X"],
    ["O", "O", ""],
    ["", "O", "X"],
  ];
  let boardWithColumnWinResult = [
    ["O", "X", "X"],
    ["O", "O", "X"],
    ["", "O", "X"],
  ];
  let boardWithDiagonalWin = [
    ["O", "X", "X"],
    ["O", "O", "X"],
    ["X", "O", ""],
  ];
  let boardWithDiagonalWinResult = [
    ["O", "X", "X"],
    ["O", "O", "X"],
    ["X", "O", "O"],
  ];
  let boardWithDraw = [
    ["X", "X", "O"],
    ["O", "O", "X"],
    ["X", "O", ""],
  ];
  let boardWithDrawResult = [
    ["X", "X", "O"],
    ["O", "O", "X"],
    ["X", "O", "X"],
  ];
  let boardNotDone = [
    ["X", "", ""],
    ["O", "O", ""],
    ["X", "O", "X"],
  ];
  let boardNotDoneResult = [
    ["X", "", "X"],
    ["O", "O", ""],
    ["X", "O", "X"],
  ];

  it("should run test", () => {
    return assert.isTrue(true);
  });

  it("should return a row win", () => {
    state.board = boardWithRowWin;
    const result = game.handleMove(state, playerUid, { y: 0, x: 2 });
    assert.deepEqual(result, {
      board: boardWithRowWinResult,
      player1: playerUid,
      status: "complete",
      winner: "player1",
    });
  });

  it("should return a column win", () => {
    let state = { player1: "123", board: boardWithColumnWin, status: "incomplete" }
    let coordinates = { y: 1, x: 2 };
    state.board = boardWithColumnWin;
    const result = game.handleMove(state, playerUid, coordinates);

    assert.deepEqual(result, {
      board: boardWithColumnWinResult,
      player1: playerUid,
      status: "complete",
      winner: "player1",
    });
  });

  it("should return a diagonal win", () => {
    let state = { player1: "123", board: boardWithDiagonalWin, status: "incomplete" }
    let coordinates = { y: 2, x: 2 };
    state.board = boardWithDiagonalWin;
    const result = game.handleMove(state, "computer", coordinates);
    assert.deepEqual(result, {
      board: boardWithDiagonalWinResult,
      player1: playerUid,
      status: "complete",
      winner: "player2",
    });
  });

  it("should return a draw", () => {
    let state = { player1: "123", board: boardWithDraw, status: "incomplete" }
    let coordinates = { y: 2, x: 2 };
    const result = game.handleMove(state, playerUid, coordinates);
    assert.deepEqual(result, {
      board: boardWithDrawResult,
      player1: playerUid,
      status: "complete",
      winner: "draw",
    });
  });

  it("should return an incomplete game", () => {
    let state = { player1: "123", board: boardNotDone, status: "incomplete" }
    let coordinates = { y: 0, x: 2 };
    const result = game.handleMove(state, playerUid, coordinates);
    assert.deepEqual(result, {
      board: boardNotDoneResult,
      player1: playerUid,
      turn: "player2",
      status: "incomplete",
    });
  });
});
