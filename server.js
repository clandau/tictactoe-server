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
      console.log(err);
    }
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

const options = {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
  },
};
const io = require("socket.io")(httpServer, options);

io.on("connection", (socket) => {

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
      const newGameState = await game.initGameState();
      state[newGameState.gameId] = newGameState;
      socket.emit("currentState", newGameState);
    }
  }
  
  function handlePlayerMove(data) {
    // 
  }
  
  function handlePartnerChosen(data) {
    // put players in same room
    // send game state back to players
  }
});


httpServer.listen(3000);
