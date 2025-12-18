const express = require("express");
const multer = require("multer");
const path = require("path");

const {
  compressPDF,
  convertToPDF,
  mergePDFs,
  splitPDF
} = require("../utils/pdfUtils");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/* =============================
   PDF COMPRESS
============================= */
router.post("/pdf/compress", upload.single("file"), async (req, res) => {
  try {
    const level = req.body.level || "medium";
    const output = `output/compressed-${Date.now()}.pdf`;

    await compressPDF(req.file.path, output, level);
    res.download(output);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   ANY FORMAT → PDF
============================= */
router.post("/pdf/convert", upload.single("file"), async (req, res) => {
  try {
    const output = `output/converted-${Date.now()}.pdf`;
    await convertToPDF(req.file, output);
    res.download(output);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   PDF MERGE
============================= */
router.post("/pdf/merge", upload.array("files", 10), async (req, res) => {
  try {
    const output = `output/merged-${Date.now()}.pdf`;
    await mergePDFs(req.files, output);
    res.download(output);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =============================
   PDF SPLIT
============================= */
router.post("/pdf/split", upload.single("file"), async (req, res) => {
  try {
    const splitAfter = parseInt(req.body.page);
    const files = await splitPDF(req.file.path, splitAfter);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
