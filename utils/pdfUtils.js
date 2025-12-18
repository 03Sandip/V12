// utils/pdfUtils.js

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const puppeteer = require("puppeteer");
const { PDFDocument } = require("pdf-lib");

/* =====================================================
   PDF COMPRESSION (qpdf)
   INPUT  : multer temp file path
   OUTPUT : Buffer (no file saved)
   level  : low | medium | high
===================================================== */
function compressPDF(inputPath, level = "medium") {
  return new Promise((resolve, reject) => {
    const outputPath = path.join("/tmp", `compressed-${Date.now()}.pdf`);

    const levels = {
      low: "--stream-data=compress",
      medium: "--stream-data=compress --object-streams=generate",
      high: "--stream-data=compress --object-streams=generate --linearize"
    };

    exec(
      `qpdf ${levels[level]} "${inputPath}" "${outputPath}"`,
      err => {
        if (err) return cleanup(err);

        const buffer = fs.readFileSync(outputPath);
        cleanup(null, buffer);
      }
    );

    function cleanup(err, buffer) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outputPath) && fs.unlinkSync(outputPath);
      err ? reject(err) : resolve(buffer);
    }
  });
}

/* =====================================================
   ANY FORMAT → PDF
===================================================== */
async function convertToPDF(file) {
  const ext = path.extname(file.originalname).toLowerCase();

  // ---------- HTML → PDF ----------
  if (ext === ".html") {
    const html = fs.readFileSync(file.path, "utf8");

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const buffer = await page.pdf({
      format: "A4",
      printBackground: true
    });

    await browser.close();
    fs.unlinkSync(file.path);
    return buffer;
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

    fs.unlinkSync(file.path);
    return Buffer.from(await pdf.save());
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

    fs.unlinkSync(file.path);
    return Buffer.from(await pdf.save());
  }

  fs.unlinkSync(file.path);
  throw new Error("Unsupported file format");
}

/* =====================================================
   PDF MERGE
===================================================== */
async function mergePDFs(files) {
  const merged = await PDFDocument.create();

  for (const f of files) {
    const pdf = await PDFDocument.load(fs.readFileSync(f.path));
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(p => merged.addPage(p));
    fs.unlinkSync(f.path);
  }

  return Buffer.from(await merged.save());
}

/* =====================================================
   PDF SPLIT (WITH PAGE RANGE SUPPORT)
   range examples:
   - "1-3"
   - "1-3,5,8"
   - empty → all pages
===================================================== */
async function splitPDF(file, range) {
  const bytes = fs.readFileSync(file.path);
  const pdf = await PDFDocument.load(bytes);
  const totalPages = pdf.getPageCount();

  let pageIndexes = [];

  // If range is provided
  if (range) {
    const parts = range.split(",");

    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(n => parseInt(n, 10));
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= totalPages) {
            pageIndexes.push(i - 1);
          }
        }
      } else {
        const page = parseInt(part, 10);
        if (page >= 1 && page <= totalPages) {
          pageIndexes.push(page - 1);
        }
      }
    }
  } else {
    pageIndexes = pdf.getPageIndices();
  }

  // Remove duplicates
  pageIndexes = [...new Set(pageIndexes)];

  const outputs = [];

  for (const i of pageIndexes) {
    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(pdf, [i]);
    newPdf.addPage(page);
    outputs.push(Buffer.from(await newPdf.save()));
  }

  fs.unlinkSync(file.path);
  return outputs;
}

module.exports = {
  compressPDF,
  convertToPDF,
  mergePDFs,
  splitPDF
};
