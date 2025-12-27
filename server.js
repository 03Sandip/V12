// server.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

// ================= LOAD ENV FIRST =================
dotenv.config();

// ================= DB CONNECTIONS =================
const connectDB = require("./config/db");              // MONGO_URI
const { connectQuestionDB } = require("./config/db2"); // MONGO_URI2

connectDB();          // Main DB
connectQuestionDB();  // Question DB

const app = express();

// ================= MIDDLEWARES =================
app.use(cors());
app.use(express.json());

// ================= ROUTE FILES =================
const departmentRoutes = require("./routes/departmentRoutes");
const notesRoutes = require("./routes/notesRoutes");
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminPurchaseRoutes = require("./routes/adminPurchaseRoutes");
const couponRoutes = require("./routes/couponRoutes");
const articleRoutes = require("./routes/articleRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const questionRoutes = require("./routes/question.routes");

// ================= ROUTES =================
app.use("/api/departments", departmentRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminPurchaseRoutes);
app.use("/api", couponRoutes);
app.use("/api", articleRoutes);
app.use("/api", pdfRoutes);

// ✅ Question system (MONGO_URI2)
app.use("/api", questionRoutes);

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

/* =================================================
   OPTIONAL: CLOUDINARY TEST ROUTE
   👉 Use only for testing
   👉 SAFE to remove later
================================================= */
const cloudinary = require("./config/cloudinary");

app.get("/cloudinary-test", async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(
      "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    );
    res.json({
      success: true,
      url: result.secure_url
    });
  } catch (err) {
    console.error("❌ Cloudinary test error:", err);
    res.status(500).json(err.message);
  }
});
// =================================================

// ================= SERVER =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
