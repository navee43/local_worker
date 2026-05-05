const mongoose = require("mongoose");
async function connectToMongoDB() {
  const url = process.env.MONGO_URI;
  if (!url) {
    throw new Error("❌  MONGO_URI is not set in .env — server cannot start.");
  }

  await mongoose.connect(url);
  console.log("✅  Connected to MongoDB");
  try {
    const collection = mongoose.connection.db.collection("users");
    const indexes = await collection.indexes();
    const emailIndex = indexes.find((idx) => idx.name === "email_1");

    if (emailIndex && !emailIndex.sparse) {
      await collection.dropIndex("email_1");
      await collection.createIndex(
        { email: 1 },
        { unique: true, sparse: true, name: "email_1" }
      );
    } else if (!emailIndex) {
      await collection.createIndex(
        { email: 1 },
        { unique: true, sparse: true, name: "email_1" }
      );
    }
  } catch (err) {
    console.error("⚠️  Index auto-fix error:", err.message);
  }
}
module.exports = { connectToMongoDB };