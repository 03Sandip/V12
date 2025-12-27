const mongoose = require("mongoose");

let questionDB;

const connectQuestionDB = async () => {
  try {
    questionDB = mongoose.createConnection(process.env.MONGO_URI2);

    questionDB.on("connected", () => {
      console.log("✅ Question DB connected (MONGO_URI2)");
    });

    questionDB.on("error", (err) => {
      console.error("❌ Question DB error:", err.message);
    });

  } catch (err) {
    console.error("❌ Question DB connection failed:", err.message);
  }
};

const getQuestionDB = () => questionDB;

module.exports = { connectQuestionDB, getQuestionDB };
