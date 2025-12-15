const express = require("express");
const PublicResource = require("../models/publicResource");

const adminRouter = express.Router();
const publicRouter = express.Router();

/* =====================================================
   ================   ADMIN ROUTES  =====================
   Base path: /api/admin/resources
   (NO ADMIN AUTH REQUIRED)
===================================================== */

// CREATE
adminRouter.post("/", async (req, res) => {
  try {
    const data = await PublicResource.create(req.body);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Create error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// READ ALL
adminRouter.get("/", async (req, res) => {
  try {
    const data = await PublicResource.find().sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    console.error("List error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE
adminRouter.put("/:id", async (req, res) => {
  try {
    const data = await PublicResource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!data) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE
adminRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await PublicResource.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =====================================================
   ================   CLIENT ROUTES  =====================
   Base path: /api/resources
===================================================== */

function buildFilter(req, fixedType = null) {
  const { semester, department, subject, year } = req.query;
  const filter = {};

  if (fixedType) filter.type = fixedType;
  if (semester) filter.semester = Number(semester);
  if (department) filter.department = department;
  if (subject) filter.subject = subject;
  if (year) filter.year = Number(year);

  return filter;
}

// Question Papers
publicRouter.get("/question-papers", async (req, res) => {
  try {
    const data = await PublicResource.find(buildFilter(req, "QUESTION_PAPER"))
      .sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    console.error("QP error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Answer Notes
publicRouter.get("/answer-notes", async (req, res) => {
  try {
    const data = await PublicResource.find(buildFilter(req, "ANSWER_NOTES"))
      .sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Notes error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Syllabus
publicRouter.get("/syllabus", async (req, res) => {
  try {
    const data = await PublicResource.find(buildFilter(req, "SYLLABUS"))
      .sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Syllabus error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  adminResourceRoutes: adminRouter,
  publicResourceRoutes: publicRouter,
};
