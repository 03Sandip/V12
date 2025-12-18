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
   Multer → TEMP ONLY (/tmp)
   No permanent storage
============================= */
const upload = multer({
  dest: "/tmp",
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB
  }
});

/* =============================
   PDF COMPRESS (PUBLIC)
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
    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);
  } catch (err) {
    console.error("PDF compress error:", err);
    res.status(500).json({ error: "Failed to compress PDF" });
  }
});

/* =============================
   ANY FORMAT → PDF (PUBLIC)
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
    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);
  } catch (err) {
    console.error("PDF convert error:", err);
    res.status(500).json({ error: "Failed to convert file to PDF" });
  }
});

/* =============================
   PDF MERGE (PUBLIC)
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
    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);
  } catch (err) {
    console.error("PDF merge error:", err);
    res.status(500).json({ error: "Failed to merge PDFs" });
  }
});

/* =============================
   PDF SPLIT (PUBLIC)
   Supports page ranges
   Examples:
   - 1-3
   - 1-3,5,8
   - empty → all pages
============================= */
router.post("/pdf/split", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    const range = req.body.range || "";
    const pages = await splitPDF(req.file, range);

    if (!pages.length) {
      return res.status(400).json({ error: "No pages found in PDF" });
    }

    // 🔹 For now: return first split page
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=split.pdf"
    );
    res.setHeader("Content-Length", pages[0].length);

    res.send(pages[0]);
  } catch (err) {
    console.error("PDF split error:", err);
    res.status(500).json({ error: "Failed to split PDF" });
  }
});

/* =============================
   OPTIONS (CORS preflight)
============================= */
router.options("/pdf/*", (req, res) => {
  res.sendStatus(200);
});

module.exports = router;
