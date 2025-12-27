const express = require("express");
const upload = require("../middleware/cloudUpload");
const cloudinary = require("../config/cloudinary");
const QuestionModel = require("../models/Question");

const router = express.Router();

/* =========================================================
   ADMIN: ADD QUESTION
========================================================= */
router.post(
  "/admin/question",
  upload.single("image"),
  async (req, res) => {
    try {
      const Question = QuestionModel();

      const data = {
        ...req.body,
        options: req.body.options ? JSON.parse(req.body.options) : [],
        correctAnswer: JSON.parse(req.body.correctAnswer)
      };

      if (req.file) {
        data.image = req.file.path;
        data.imagePublicId = req.file.filename;
      }

      const q = await Question.create(data);
      res.status(201).json(q);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* =========================================================
   ADMIN: UPDATE QUESTION
========================================================= */
router.put(
  "/admin/question/:id",
  upload.single("image"),
  async (req, res) => {
    try {
      const Question = QuestionModel();
      const q = await Question.findById(req.params.id);

      if (!q) return res.status(404).json({ error: "Not found" });

      if (req.file && q.imagePublicId) {
        await cloudinary.uploader.destroy(q.imagePublicId);
      }

      if (req.body.options)
        req.body.options = JSON.parse(req.body.options);

      if (req.body.correctAnswer)
        req.body.correctAnswer = JSON.parse(req.body.correctAnswer);

      if (req.file) {
        req.body.image = req.file.path;
        req.body.imagePublicId = req.file.filename;
      }

      const updated = await Question.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* =========================================================
   ADMIN: DELETE QUESTION
========================================================= */
router.delete("/admin/question/:id", async (req, res) => {
  try {
    const Question = QuestionModel();
    const q = await Question.findById(req.params.id);

    if (!q) return res.status(404).json({ error: "Not found" });

    if (q.imagePublicId) {
      await cloudinary.uploader.destroy(q.imagePublicId);
    }

    await q.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   USER: FETCH QUESTIONS (FILTER + SORT)
   /api/questions?department=CSE&subject=DS&year=2023
========================================================= */
router.get("/questions", async (req, res) => {
  try {
    const Question = QuestionModel();

    const filter = {};
    ["subject", "topic", "department", "type"].forEach((k) => {
      if (req.query[k]) filter[k] = req.query[k];
    });

    if (req.query.year) filter.year = Number(req.query.year);

    const data = await Question
      .find(filter)
      .sort({ year: -1, createdAt: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   USER: GET SUBJECTS (DEPARTMENT-WISE) ✅ FIXED
   /api/questions/subjects?department=CSE
========================================================= */
router.get("/questions/subjects", async (req, res) => {
  try {
    const { department } = req.query;

    if (!department) {
      return res.json([]);
    }

    const Question = QuestionModel();

    const subjects = await Question.distinct("subject", {
      department
    });

    res.json(subjects.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   USER: GET YEARS (OPTIONAL SUBJECT + DEPARTMENT)
   /api/questions/years?department=CSE&subject=DS
========================================================= */
router.get("/questions/years", async (req, res) => {
  try {
    const Question = QuestionModel();

    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.subject) filter.subject = req.query.subject;

    const years = await Question.distinct("year", filter);
    res.json(years.sort((a, b) => b - a));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   USER: GET SETS
   /api/questions/sets?department=CSE&subject=DS&year=2023
========================================================= */
router.get("/questions/sets", async (req, res) => {
  try {
    const Question = QuestionModel();

    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.year) filter.year = Number(req.query.year);

    const sets = await Question.distinct("set", filter);
    res.json(sets.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* =========================================================
   USER: GET TOPICS (SUBJECT + DEPARTMENT REQUIRED) ✅ FIXED
   /api/questions/topics?department=CSE&subject=DS
========================================================= */
router.get("/questions/topics", async (req, res) => {
  try {
    const { subject, department } = req.query;

    if (!subject || !department) {
      return res.status(400).json({
        error: "subject and department are required"
      });
    }

    const Question = QuestionModel();

    const topics = await Question.distinct("topic", {
      subject,
      department
    });

    res.json(topics.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   USER: GET DEPARTMENTS
   /api/questions/departments
========================================================= */
router.get("/questions/departments", async (req, res) => {
  try {
    const Question = QuestionModel();
    const depts = await Question.distinct("department");
    res.json(depts.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
