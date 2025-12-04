// models/notes.js
const mongoose = require('mongoose');

const NotesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: 'Untitled',
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },

    semester: {
      type: Number,
      required: true,
    },

    // PDF stored directly in MongoDB
    fileData: {
      type: Buffer,
    },
    contentType: {
      type: String,
      default: 'application/pdf',
    },
    originalName: {
      type: String,
    },
    size: {
      type: Number,
    },

    // optional item picture stored in MongoDB
    itemPicData: {
      type: Buffer,
    },
    itemPicContentType: {
      type: String,
    },
    itemPicOriginalName: {
      type: String,
    },

    // pricing
    originalPrice: {
      type: Number,
      default: 0,
    },
    discountPrice: {
      type: Number,
      default: 0,
    },

    // NEW → Preview URL for client display
    previewLink: {
      type: String,
      trim: true,
      default: '',
    },

    // additional meta
    type: {
      type: String,
      default: 'notes',
    },

    uploadDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notes', NotesSchema);
