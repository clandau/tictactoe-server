require('dotenv').config();

const app = require("express")();
const cors = require("cors");
const admin = require("./db").admin;
const httpServer = require("http").createServer(app);

const datastore = require("./db.js");
const game = require("./game");

const availableRooms = [];

const rooms = {};
const state = {};

var corsOptions = {
  origin: 'https://tic-tac-toe-dfe95.web.app/',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

app.use(cors(corsOptions));
app.use(decodeIDToken);

/**
 * API middleware
 * Decodes the JSON Web Token sent via the frontend app
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
 * adds a new user to the database
 */
app.get("/api/newUser", async (req, res) => {
  const user = req["currentUser"];
  if (!user) res.status(403).send("Not logged in.");
  else {
    await datastore.saveNewUser(user);
    res.status(200).send({ message: "new user added." });
  }
});

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
const options = {
  cors: {
    origin: "https://tic-tac-toe-dfe95.web.app",
    methods: ["GET", "POST"],
  },
};
const io = require("socket.io")(httpServer, options);

// authorization middleware for sockets
io.use(async (socket, next) => {
  const { token, uid } = socket.handshake.auth;
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken.uid !== uid) {
      next(new Error("Unable to validate user."));
    } else {
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
  socket.on("disconnect", () => {
    console.log("disconnect event!", socket.id);
    const roomId = rooms[socket.id];
    if (!roomId) return;
    const currentState = state[roomId];
    if (
      currentState?.player2 !== "computer" &&
      currentState?.status === "incomplete"
    ) {
      emitPlayerLeft(roomId);
      state[roomId] = null;
    }
  });

  async function handleNewGame(data) {
    if (data.twoPlayer) {
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
        // create new game
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
      // create new game against computer
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
        // wait 2 seconds before making computer's move
        setTimeout(() => {
          currentState = game.handleComputerMove(currentState);
          emitGameState(roomId, currentState);
        }, 2000);
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
