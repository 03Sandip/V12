const mongoose = require("mongoose");
const { getQuestionDB } = require("../config/db2");

/* ===============================
   Option Schema (MCQ / MSQ)
================================ */
const optionSchema = new mongoose.Schema(
  {
    label: {
      type: String, // A, B, C, D
      required: true
    },
    text: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

/* ===============================
   Question Schema
================================ */
const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ["MCQ", "MSQ", "NAT"],
      required: true
    },

    options: {
      type: [optionSchema],
      default: [] // optional for NAT
    },

    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
      required: true
      /*
        MCQ → "A"
        MSQ → ["A", "C"]
        NAT → 2.5
      */
    },

    subject: {
      type: String,
      required: true
    },

    topic: {
      type: String,
      required: true
    },

    year: {
      type: Number,
      required: true
    },
    set: {
    type: String,
    default: null,
    trim: true
    },

    department: {
      type: String,
      required: true // CSE / ECE / EE
    },

    /* ===============================
       OPTIONAL Cloudinary Image
    ================================ */
    image: {
      type: String,
      default: null // ✅ optional
    },

    imagePublicId: {
      type: String,
      default: null // ✅ optional
    },

    /* ===============================
       OPTIONAL Solution Link
    ================================ */
    solutionLink: {
      type: String,
      default: null // ✅ optional
    }
  },
  { timestamps: true }
);

/* ===============================
   Bind model to DB2 ONLY
================================ */
module.exports = () => {
  const questionDB = getQuestionDB();

  if (!questionDB) {
    throw new Error("Question DB not connected (MONGO_URI2)");
  }

  return (
    questionDB.models.Question ||
    questionDB.model("Question", questionSchema)
  );
};
