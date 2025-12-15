const express = require("express");
const Article = require("../models/Article");

const router = express.Router();

/* =========================
   CREATE ARTICLE (ADMIN)
========================= */
router.post("/articles", async (req, res) => {
  try {
    const { title, content, isPublished } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    const article = await Article.create({
      title,
      content,
      isPublished,
    });

    res.json({ success: true, article });
  } catch (err) {
    console.error("Create article error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while saving article",
    });
  }
});

/* =========================
   GET ALL ARTICLES (ADMIN)
========================= */
router.get("/articles", async (req, res) => {
  try {
    const articles = await Article.find().sort({ createdAt: -1 });
    res.json({ success: true, articles });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* =========================
   GET SINGLE ARTICLE
========================= */
router.get("/articles/:id", async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ success: false });
    }
    res.json({ success: true, article });
  } catch {
    res.status(404).json({ success: false });
  }
});

/* =========================
   UPDATE ARTICLE (ADMIN)
========================= */
router.put("/articles/:id", async (req, res) => {
  try {
    const { title, content, isPublished } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { title, content, isPublished },
      { new: true }
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    res.json({ success: true, article });
  } catch (err) {
    console.error("Update article error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating article",
    });
  }
});

/* =========================
   DELETE ARTICLE (ADMIN)
========================= */
router.delete("/articles/:id", async (req, res) => {
  try {
    await Article.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
