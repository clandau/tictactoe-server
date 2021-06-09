const app = require("express")();
const cors = require("cors");
const admin = require("firebase-admin");
const httpServer = require("http").createServer(app);

admin.initializeApp();

app.use(cors());
// Decodes the Firebase JSON Web Token
app.use(decodeIDToken);

/**
 * Decodes the JSON Web Token sent via the frontend app
 * Makes the currentUser (firebase) data available on the body.
 */
async function decodeIDToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const idToken = req.headers.authorization.split('Bearer ')[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req['currentUser'] = decodedToken;
    } catch (err) {
      console.log(err);
    }
  }

  next();
}

app.get("/api/newUser", (req, res) => {
  const user = req["currentUser"];
  console.log(user);
  if (!user) res.status(403).send("Not logged in.");
  else res.status(200).send({ message: "heeeey"});
})

const options = {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
  },
};
const io = require("socket.io")(httpServer, options);

io.on("connection", (client) => {
  client.emit("init", { data: "hi there, client!" });
});

httpServer.listen(3000);
