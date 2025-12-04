const mongoose = require("mongoose");

const StreamSchema = new mongoose.Schema({
  name: String
});

module.exports = mongoose.model("Stream", StreamSchema);
