const mongoose = require("mongoose");

const SemesterSchema = new mongoose.Schema({
  number: String
});

module.exports = mongoose.model("Semester", SemesterSchema);
