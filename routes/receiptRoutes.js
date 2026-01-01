const express = require("express");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const Payment = require("../models/Payment");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:paymentId", authMiddleware, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.paymentId,
      user: req.user._id,
    }).populate("items.noteId", "title");

    if (!payment) {
      return res.status(404).send("Invoice not found");
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=gonotes-invoice-${payment._id}.pdf`
    );

    doc.pipe(res);

    /* =================================================
       CARD CONSTANTS
    ================================================= */
    const cardX = 40;
    const cardY = 40;
    const cardWidth = 515;
    const cardHeight = 760;

    /* =================================================
       UNICODE FONT (FOR EMOJIS)
    ================================================= */
    const fontPath = path.join(__dirname, "../assets/fonts/DejaVuSans.ttf");
    if (fs.existsSync(fontPath)) {
      doc.registerFont("unicode", fontPath);
    }

    /* =================================================
       CARD BACKGROUND
    ================================================= */
    doc
      .roundedRect(cardX, cardY, cardWidth, cardHeight, 12)
      .fill("#ffffff");

    /* =================================================
       LOGO (CENTERED, SAFE)
    ================================================= */
    const logoPath = path.join(__dirname, "../assets/logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, cardX + cardWidth / 2 - 22, 60, {
        width: 44,
        height: 44,
      });
    }

    /* =================================================
       HEADER (CENTERED)
    ================================================= */
    doc
      .fillColor("#111827")
      .font("Helvetica-Bold")
      .fontSize(26)
      .text("GoNotes", cardX, 115, {
        width: cardWidth,
        align: "center",
      });

    doc
      .font("Helvetica")
      .fontSize(16)
      .text("Invoice", cardX, 145, {
        width: cardWidth,
        align: "center",
      });

    const invoiceId = `INV-${payment._id.toString().slice(-6)}`;

    doc
      .fontSize(11)
      .fillColor("#6b7280")
      .text(invoiceId, cardX, 165, {
        width: cardWidth,
        align: "center",
      });

    doc
      .moveTo(cardX + 40, 195)
      .lineTo(cardX + cardWidth - 40, 195)
      .strokeColor("#e5e7eb")
      .stroke();

    /* =================================================
       ORDER & PAYMENT IDS
    ================================================= */
    const idsTop = 215;

    doc
      .fontSize(10)
      .fillColor("#9ca3af")
      .text("ORDER ID", 60, idsTop);

    doc
      .fontSize(11)
      .fillColor("#111827")
      .text(payment.razorpayOrderId || "-", 60, idsTop + 14, {
        width: 240,
      });

    doc
      .fontSize(10)
      .fillColor("#9ca3af")
      .text("PAYMENT ID", 330, idsTop);

    doc
      .fontSize(11)
      .fillColor("#111827")
      .text(payment.razorpayPaymentId || "-", 330, idsTop + 14, {
        width: 200,
      });

    /* =================================================
       TO / FROM
    ================================================= */
    const infoTop = idsTop + 60;

    // TO
    doc
      .fontSize(10)
      .fillColor("#9ca3af")
      .text("TO", 60, infoTop);

    doc
      .fontSize(11)
      .fillColor("#111827")
      .text(req.user.name || "Customer", 60, infoTop + 18)
      .text(req.user.email, 60, infoTop + 34);

    // FROM
    doc
      .fontSize(10)
      .fillColor("#9ca3af")
      .text("FROM", 330, infoTop);

    doc
      .fontSize(11)
      .fillColor("#111827")
      .text("GoNotes", 330, infoTop + 18)
      .text("Premium Study Notes Platform", 330, infoTop + 34);

    /* =================================================
       ITEMS TABLE
    ================================================= */
    const tableTop = infoTop + 90;

    doc
      .rect(60, tableTop, 475, 30)
      .fill("#f9fafb");

    doc
      .fillColor("#6b7280")
      .fontSize(10)
      .text("DESCRIPTION", 70, tableTop + 9)
      .text("QTY", 320, tableTop + 9)
      .text("PRICE", 380, tableTop + 9)
      .text("TOTAL", 460, tableTop + 9, { align: "right" });

    let y = tableTop + 45;
    const unitPrice =
      payment.amount / Math.max(payment.items.length, 1);

    payment.items.forEach((item) => {
      doc
        .fontSize(11)
        .fillColor("#111827")
        .text(item.noteId?.title || "Study Material", 70, y)
        .text("1", 330, y)
        .text(`₹${unitPrice.toFixed(2)}`, 380, y)
        .text(`₹${unitPrice.toFixed(2)}`, 460, y, {
          width: 75,
          align: "right",
        });

      doc
        .moveTo(60, y + 18)
        .lineTo(535, y + 18)
        .strokeColor("#f1f5f9")
        .stroke();

      y += 26;
    });

    /* =================================================
       TOTAL
    ================================================= */
   const totalsTop = y + 30;

// Left: Total label
doc
  .fontSize(13)
  .fillColor("#111827")
  .text("Total", 360, totalsTop, {
    width: 100,
    align: "left",
  });

// Right: Amount
doc
  .fontSize(20)
  .fillColor("#16a34a")
  .text(`₹${payment.amount.toFixed(2)}`, 360, totalsTop, {
    width: 175,
    align: "right",
  });


    /* =================================================
       THANK YOU MESSAGE (WITH EMOJIS)
    ================================================= */
    const messageTop = totalsTop + 90;

    doc
      .font(fs.existsSync(fontPath) ? "unicode" : "Helvetica")
      .fontSize(12)
      .fillColor("#374151")
      .text(
        "Thank you for purchasing notes from GoNotes\n" +
        "We hope they help you learn better and faster",
        cardX,
        messageTop,
        {
          width: cardWidth,
          align: "center",
          lineGap: 6,
        }
      );

    /* =================================================
       FOOTER
    ================================================= */
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#6b7280")
      .text(
        "This is a system-generated invoice. No signature required.",
        cardX,
        cardY + cardHeight - 40,
        { width: cardWidth, align: "center" }
      );

    doc.end();
  } catch (err) {
    console.error("Invoice generation failed:", err);
    if (!res.headersSent) {
      res.status(500).send("Invoice generation failed");
    }
  }
});

module.exports = router;
