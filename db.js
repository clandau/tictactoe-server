const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

module.exports = {
  admin,
  saveNewUser,
  createGameDocument,
  saveCompletedGame,
  getWins,
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
  if (winner !== "computer") saveWin(winner, gameId);
  const loser = player1 === winner ? player2 : player1;
  if (loser !== "computer") saveLoss(loser, gameId);

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
    [`counts.${uid}`]: admin.firestore.FieldValue.increment(1),
  });
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

async function getWins() {
  const res = await db.collection("wins").doc("winCount").get();
  const counts = res.data().counts;
  // get the names and top 20
  const top20Sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);
  const returnArray = [];
  for (let item of top20Sorted) {
    const userDoc = await db.collection("users").doc(item[0]).get();
    const email = userDoc.data().email;
    const count = item[1];
    returnArray.push({ email, count });
  }
  return returnArray;
}
