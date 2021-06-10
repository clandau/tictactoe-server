const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

module.exports = {
  admin,
  saveNewUser,
  createGameDocument,
  saveCompletedGame,
};

async function saveNewUser(data) {
  const userData = { email: data.email, games: [] };
  return await db.collection("users").doc(data.uid).set(userData);
}

function createGameDocument() {
  return db.collection("games").doc();
}

async function saveCompletedGame(state) {
  const { gameId, player1, player2, winner } = state;
  const created = admin.firestore.FieldValue.serverTimestamp();
  // save win and loss to user account document
  if(winner !== "computer") saveWin(winner, gameId);
  const loser = player1 === winner ? player2 : player1;
  if(loser !== "computer") saveLoss(loser, gameId);

  // save to games collection
  return await db
    .collection("games")
    .doc(gameId)
    .set({ player1, player2, winner, created });
}

async function saveWin(uid, gameId) {
  // update win count document
  const winsRef = db.collection("wins").doc("winCount");
  await winsRef.update({
    [`counts.${uid}`]: admin.firestore.FieldValue.increment(1)
  })
  // add win to users object
  return await db
    .collection("users")
    .doc(uid)
    .update({
      games: admin.firestore.FieldValue.arrayUnion({ [gameId]: "win" }),
    });
}

async function saveLoss(uid, gameId) {
  return await db
    .collection("users")
    .doc(uid)
    .update({
      games: admin.firestore.FieldValue.arrayUnion({ [gameId]: "loss" }),
    });
}
