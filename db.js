const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

module.exports = {
  admin,
  saveNewUser,
  createGameDocument,
  saveGame,
};

async function saveNewUser(data) {
  const userData = { email: data.email, games: [] };
  return await db.collection("users").doc(data.uid).set(userData);
}

function createGameDocument() {
  return db.collection("games").doc();
}

function saveGame(data) {}
