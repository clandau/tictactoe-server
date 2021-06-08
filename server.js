const app = require("express")();
const httpServer = require("http").createServer(app);
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
