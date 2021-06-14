require("dotenv").config();

const app = require("express")();
const cors = require("cors");
const admin = require("./db").admin;
const httpServer = require("http").createServer(app);

const datastore = require("./db.js");
const game = require("./game");

const availableRooms = [];

const rooms = {};
const state = {};

if (process.env.NODE_ENV === "develop") {
  app.use(cors());
} else {
  const corsOptions = {
    origin: "https://tic-tac-toe-dfe95.web.app",
  };
  app.use(cors(corsOptions));
}

app.use(decodeIDToken);

/**
 * API middleware
 * Decodes the JSON Web Token sent via the frontend app to verify authentication
 * Makes the currentUser (firebase) data available on the body.
 */
async function decodeIDToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const idToken = req.headers.authorization.split("Bearer ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req["currentUser"] = decodedToken;
    } catch (err) {
      console.error(err);
      next(new Error("Unable to validate user."));
    }
  } else {
    next(new Error("Unable to validate user."));
  }
  next();
}

/**
 * GET the wins for the leaderboard
 */
app.get("/api/wins", async (req, res) => {
  try {
    const wins = await datastore.getWins();
    res.status(200).send(JSON.stringify(wins));
  } catch (err) {
    return res.status(500).send("Database error.");
  }
});

/**
 * GET the top 20 most recent games
 */
app.get("/api/games", async (req, res) => {
  try {
    const games = await datastore.getGames();
    res.status(200).send(JSON.stringify(games));
  } catch (err) {
    console.error(err);
    return res.status(500).send("Database error.");
  }
});

/**
 * setting up sockets for game play
 */
const origin =
  process.env.NODE_ENV === "develop"
    ? "http://localhost:8080"
    : "https://tic-tac-toe-dfe95.web.app";

const options = {
  cors: {
    origin,
    methods: ["GET", "POST"],
  },
};

const io = require("socket.io")(httpServer, options);

/**
 * socket.io middleware verifies that user is authenticated
 * and adds a users document in the database if they're not already there
 */
io.use(async (socket, next) => {
  const { token, uid } = socket.handshake.auth;
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken.uid !== uid) {
      next(new Error("Unable to validate user."));
    } else {
      // add user to db when they start a game
      await datastore.saveNewUser({
        email: decodedToken.email,
        uid: decodedToken.uid,
      });
      return next();
    }
  } catch (err) {
    next(new Error("Unable to validate user."));
  }
  next();
});

io.on("connection", (socket) => {
  const { uid } = socket.handshake.auth;

  socket.on("newGame", handleNewGame);
  socket.on("playerMove", handlePlayerMove);

  /**
   * handle a disconnect event
   */
  socket.on("disconnect", () => {
    console.log("disconnect event!", socket.id);
    const roomId = rooms[socket.id];
    if (!roomId) return;
    // if they leave while waiting for a partner, remove it from available rooms
    if (availableRooms.indexOf(roomId) !== -1) {
      availableRooms.splice(availableRooms.indexOf(roomId), 1);
    }
    const currentState = state[roomId];
    // if the user had an in-progress, 2-player game, notify other user
    if (
      currentState?.player2 !== "computer" &&
      currentState?.status === "incomplete"
    ) {
      emitPlayerLeft(roomId);
      // remove the game from state
      state[roomId] = null;
    }
  });

  async function handleNewGame(data) {
    if (data.twoPlayer) {
      // if there is a room waiting for a 2nd player, add this user to the room
      if (availableRooms.length) {
        // shift room from available array
        const roomId = availableRooms.shift();
        // add this player to the room
        socket.join(roomId);
        // add player to room and state as player2
        rooms[socket.id] = roomId;
        const currentState = game.addPlayer2(uid, state[roomId]);
        // emit current game state
        emitGameState(roomId, currentState);
      } else {
        // if there are no players waiting, create a game and set the room to available
        const newGameState = await game.initGameState(uid, null);
        state[newGameState.gameId] = newGameState;
        rooms[socket.id] = newGameState.gameId;
        availableRooms.push(newGameState.gameId);
        // create a socket room with the game id as the name
        socket.join(newGameState.gameId);
        // emit message that they're waiting for a player to join
        socket.emit("waitingPartner");
      }
    } else {
      // new 1-player game. create new game against computer
      const newGameState = await game.initGameState(uid);
      state[newGameState.gameId] = newGameState;
      rooms[socket.id] = newGameState.gameId;
      // create a socket room with the game id as the name
      socket.join(newGameState.gameId);
      emitGameState(newGameState.gameId, newGameState);
    }
  }

  function handlePlayerMove(coordinates) {
    const roomId = rooms[socket.id];
    let currentState = game.handleMove(state[roomId], uid, coordinates);
    if (currentState.status === "complete") {
      emitGameState(roomId, currentState);
      // remove from state object
      state[roomId] = null;
    } else {
      emitGameState(roomId, currentState);
      if (
        currentState.turn === "player2" &&
        currentState.player2 === "computer"
      ) {
        // wait 1 second before making computer's move
        setTimeout(() => {
          currentState = game.handleComputerMove(currentState);
          emitGameState(roomId, currentState);
        }, 1000);
      }
    }
  }
});

function emitGameState(room, gameState) {
  // Send this event to everyone in the room.
  io.sockets.in(room).emit("currentState", JSON.stringify(gameState));
}

function emitPlayerLeft(room) {
  io.sockets.in(room).emit("playerLeft");
}

httpServer.listen(process.env.PORT || 3000);
