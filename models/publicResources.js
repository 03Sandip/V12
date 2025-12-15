// models/Resource.js
import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // 👇 This identifies which type of document it is
    type: {
      type: String,
      enum: ["QUESTION_PAPER", "ANSWER_NOTES", "SYLLABUS"],
      required: true,
    },

    // 👇 Direct Google Drive or any file link
    link: {
      type: String,
      required: true,
      trim: true,
    },

    // Optional fields (use when needed)
    subject: {
      type: String,
      trim: true,
    },
    semester: {
      type: Number,
    },
    department: {
      type: String,
      trim: true,
    },
    year: {
      type: Number,
    }
  },
  {
    timestamps: true // adds createdAt & updatedAt
  }
);

export default mongoose.model("Resource", resourceSchema);
