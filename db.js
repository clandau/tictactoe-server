const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

module.exports = {
  admin,
  async saveNewUser(data) {
    const userData = { email: data.email, games: [], }
    return await db.collection("users").doc(data.uid).set(userData);
  }
}