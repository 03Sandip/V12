const express = require("express");
const router = express.Router();
const Stream = require("../models/Stream");

router.get("/", async (req, res) => {
  const data = await Stream.find();
  res.json(data);
});

router.post("/", async (req, res) => {
  const stream = new Stream(req.body);
  await stream.save();
  res.json(stream);
});

module.exports = router;
