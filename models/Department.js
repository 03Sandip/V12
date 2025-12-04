// models/Department.js
const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    semesters: [
      {
        type: Number,
        required: true,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', DepartmentSchema);
