const assert = require("chai").assert;

const game = require("../game");

describe("handle a game move logic", () => {
  let state = { player1: "123", board: [[], [], []] };
  let playerUid = "123";

  let boardWithRowWin = [
    ["X", "X", "X"],
    ["O", "O", ""],
    ["X", "O", "X"],
  ];
  let boardWithColumnWin = [
    ["O", "X", "X"],
    ["O", "O", ""],
    ["", "O", "X"],
  ];
  let boardWithDiagonalWin = [
    ["O", "X", "X"],
    ["O", "O", "X"],
    ["X", "O", ""],
  ];
  let boardWithDraw = [
    ["X", "X", "O"],
    ["O", "O", "X"],
    ["X", "O", ""],
  ];
  let boardNotDone = [
    ["X", "", ""],
    ["O", "O", ""],
    ["X", "O", "X"],
  ];

  it("should run test", () => {
    return assert.isTrue(true);
  });

  it("should return a row win", () => {
    state.board = boardWithRowWin;
    const result = game.handleMove(state, playerUid, { y: 0, x: 2 });
    assert.deepEqual(result, { gameOver: true, result: "X" });
  });
  
  it("should return a column win", () => {
    let coordinates = { y: 1, x: 2 };
    state.board = boardWithColumnWin;
    const result = game.handleMove(state, playerUid, coordinates);
    assert.deepEqual(result, { gameOver: true, result: "X"});
  });
  
  it("should return a diagonal win", () => {
    let coordinates = { y: 2, x: 2 };
    state.board = boardWithDiagonalWin;
    const result = game.handleMove(state, "computer", coordinates);
    assert.deepEqual(result, { gameOver: true, result: "O"})
  });

  it("should return a draw", () => {
    let coordinates = { y: 2, x: 2 };
    state.board = boardWithDraw;
    const result = game.handleMove(state, playerUid, coordinates);
    assert.deepEqual(result, { gameOver: true, result: "draw"})
  });

  it("should return an incomplete game", () => {
    let coordinates = { y: 0, x: 2 };
    state.board = boardNotDone;
    const result = game.handleMove(state, playerUid, coordinates);
    assert.deepEqual(result, { gameOver: false })
  });
});
