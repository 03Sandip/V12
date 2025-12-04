const express = require("express");
const router = express.Router();
const Semester = require("../models/Semester");

router.get("/", async (req, res) => {
  const data = await Semester.find();
  res.json(data);
});

router.post("/", async (req, res) => {
  const sem = new Semester(req.body);
  await sem.save();
  res.json(sem);
});

module.exports = router;
