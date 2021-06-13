const admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert({
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  }),
});

const db = admin.firestore();

module.exports = {
  admin,
  saveNewUser,
  createGameDocument,
  saveCompletedGame,
  getWins,
  getGames,
};

async function saveNewUser(data) {
  const userData = { email: data.email, games: [] };
  // check if user exists in db before creating a new one
  const doc = await db.collection("users").doc(data.uid).get();
  if (!doc.exists) {
    return await db.collection("users").doc(data.uid).set(userData);
  } else if (!doc.data().email) {
    return await doc.ref.update({email: data.email });
  } else {
    // user already in db with needed info
    return;
  }
}

function createGameDocument() {
  return db.collection("games").doc();
}

async function saveCompletedGame(state) {
  const { gameId, player1, player2, winner } = state;
  const created = admin.firestore.FieldValue.serverTimestamp();
  // save win and loss to user account document
  if (winner !== "draw") {
    if (winner !== "computer") await saveWin(winner, gameId);
    const loser = player1 === winner ? player2 : player1;
    if (loser !== "computer") await saveLoss(loser, gameId);
  }
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

async function getGames() {
  // store emails so we don't look them up multiple times
  const emails = {};
  try {
    const snapshot = await db
      .collection("games")
      .orderBy("created", "desc")
      .limit(20)
      .get();
    if (snapshot.empty) return null;
    const returnArray = [];
    for (let doc of snapshot.docs) {
      const { created, player1, player2, winner } = doc.data();
      const gameData = { created: created.toDate(), winner };
      if (emails[player1]) {
        gameData.player1 = emails[player1];
      } else {
        const player1Doc = await db.collection("users").doc(player1).get();

        const email = player1Doc.data().email;
        gameData.player1 = email;
        emails[player1] = email;
      }
      if (player2 === "computer") {
        gameData.player2 = player2;
      } else {
        if (emails[player2]) {
          gameData.player2 = emails[player2];
        } else {
          const player2Doc = await db.collection("users").doc(player2).get();
          gameData.player2 = player2Doc.data().email;
        }
      }
      if (winner !== "draw") {
        gameData.winner =
          player1 === winner ? gameData.player1 : gameData.player2;
      }
      returnArray.push(gameData);
    }
    return returnArray;
  } catch (err) {
    console.error(err);
  }
}
