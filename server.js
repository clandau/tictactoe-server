const app = require("express")();
const cors = require("cors");
const admin = require("./db").admin;
const httpServer = require("http").createServer(app);

const datastore = require("./db.js");
const game = require("./game");

const availablePlayers = [];
// to hold game rooms
const rooms = {};
const state = {};

app.use(cors());
// Decodes the Firebase JSON Web Token
app.use(decodeIDToken);

/**
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

app.get("/api/newUser", async (req, res) => {
  const user = req["currentUser"];
  if (!user) res.status(403).send("Not logged in.");
  else {
    await datastore.saveNewUser(user);
    res.status(200).send({ message: "new user added." });
  }
});

app.get("/api/wins", async (req, res) => {
  try {
    const wins = await datastore.getWins();
    res.status(200).send(JSON.stringify(wins));
  } catch (err) {
    return res.status(500).send("Database error.");
  }
})

app.get("/api/games", async (req, res) => {
  try {
    const games = await datastore.getGames();
    res.status(200).send(JSON.stringify(games));
  } catch(err) {
    console.error(err);
    return res.status(500).send("Database error.")
  }
})

const options = {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
  },
};
const io = require("socket.io")(httpServer, options);

io.use(async (socket, next) => {
  const { token, uid } = socket.handshake.auth;
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken.uid !== uid) {
      next(new Error("Unable to validate user."));
    } else {
      next;
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
  socket.on("partnerChosen", handlePartnerChosen);

  async function handleNewGame(data) {
    if (data.twoPlayer) {
      // send list of available games / users
      if (availablePlayers.length) {
        socket.emit("playerOptions", { players: availablePlayers });
      } else {
        // create new twoPlayer game, and add this player as available
      }
    } else {
      // create new game against computer
      const newGameState = await game.initGameState(uid);
      state[newGameState.gameId] = newGameState;
      rooms[socket.id] = newGameState.gameId;
      // create a socket room with the game id as the name
      socket.join(newGameState.gameId);
      socket.emit("currentState", JSON.stringify(newGameState));
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
          emitGameState(roomId, currentState)
        }, 2000);
      }
    }
  }

  function handlePartnerChosen(data) {
    // put players in same room
    // send game state back to players
  }

  function emitGameState(room, gameState) {
    // Send this event to everyone in the room.
    io.sockets.in(room).emit("currentState", JSON.stringify(gameState));
  }
});

httpServer.listen(3000);
