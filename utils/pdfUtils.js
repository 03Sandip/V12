// utils/pdfUtils.js

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const puppeteer = require("puppeteer");
const { PDFDocument } = require("pdf-lib");

/* =====================================================
   PDF COMPRESSION (qpdf)
   level: low | medium | high
===================================================== */
async function compressPDF(inputPath, outputPath, level = "medium") {
  const levels = {
    low: "--stream-data=compress",
    medium: "--stream-data=compress --object-streams=generate",
    high: "--stream-data=compress --object-streams=generate --linearize"
  };

  return new Promise((resolve, reject) => {
    exec(
      `qpdf ${levels[level]} "${inputPath}" "${outputPath}"`,
      err => (err ? reject(err) : resolve())
    );
  });
}

/* =====================================================
   ANY FORMAT → PDF
   Supports: HTML, JPG, PNG, TXT
===================================================== */
async function convertToPDF(file, outputPath) {
  const ext = path.extname(file.originalname).toLowerCase();

  // ---------- HTML → PDF ----------
  if (ext === ".html") {
    const html = fs.readFileSync(file.path, "utf8");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({ path: outputPath, format: "A4", printBackground: true });
    await browser.close();
    return;
  }

  // ---------- IMAGE → PDF ----------
  if ([".jpg", ".jpeg", ".png"].includes(ext)) {
    const pdf = await PDFDocument.create();
    const bytes = fs.readFileSync(file.path);

    const image =
      ext === ".png"
        ? await pdf.embedPng(bytes)
        : await pdf.embedJpg(bytes);

    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0 });

    fs.writeFileSync(outputPath, await pdf.save());
    return;
  }

  // ---------- TEXT → PDF ----------
  if (ext === ".txt") {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage();
    page.drawText(fs.readFileSync(file.path, "utf8"), {
      x: 40,
      y: page.getHeight() - 40,
      size: 12,
      maxWidth: page.getWidth() - 80
    });

    fs.writeFileSync(outputPath, await pdf.save());
    return;
  }

  throw new Error("Unsupported file format");
}

/* =====================================================
   PDF MERGE
===================================================== */
async function mergePDFs(files, outputPath) {
  const merged = await PDFDocument.create();

  for (const file of files) {
    const pdf = await PDFDocument.load(fs.readFileSync(file.path));
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }

  fs.writeFileSync(outputPath, await merged.save());
}

/* =====================================================
   PDF SPLIT (split after page number)
===================================================== */
async function splitPDF(inputPath, splitAfter) {
  const bytes = fs.readFileSync(inputPath);
  const pdf = await PDFDocument.load(bytes);
  const totalPages = pdf.getPageCount();
  const outputs = [];

  for (let i = splitAfter; i < totalPages; i++) {
    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(pdf, [i]);
    newPdf.addPage(page);

    const out = `output/page-${i + 1}.pdf`;
    fs.writeFileSync(out, await newPdf.save());
    outputs.push(out);
  }

  return outputs;
}

module.exports = {
  compressPDF,
  convertToPDF,
  mergePDFs,
  splitPDF
};
