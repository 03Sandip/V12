const express = require("express");
const multer = require("multer");

const {
  compressPDF,
  convertToPDF,
  mergePDFs,
  splitPDF
} = require("../utils/pdfUtils");

const router = express.Router();

/* =============================
   Multer → temp only
============================= */
const upload = multer({
  dest: "/tmp",
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

/* =============================
   PDF COMPRESS
============================= */
router.post("/pdf/compress", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    const level = req.body.level || "medium";
    const buffer = await compressPDF(req.file.path, level);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=compressed.pdf"
    );

    res.send(buffer);
  } catch (err) {
    console.error("PDF compress error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   ANY FORMAT → PDF
============================= */
router.post("/pdf/convert", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File is required" });
    }

    const buffer = await convertToPDF(req.file);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=converted.pdf"
    );

    res.send(buffer);
  } catch (err) {
    console.error("PDF convert error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   PDF MERGE
============================= */
router.post("/pdf/merge", upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({
        error: "At least 2 PDF files are required"
      });
    }

    const buffer = await mergePDFs(req.files);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=merged.pdf"
    );

    res.send(buffer);
  } catch (err) {
    console.error("PDF merge error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   PDF SPLIT
============================= */
router.post("/pdf/split", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    const pages = await splitPDF(req.file);

    // For now: return first page as PDF
    // (Later you can zip all pages)
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=page-1.pdf"
    );

    res.send(pages[0]);
  } catch (err) {
    console.error("PDF split error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
