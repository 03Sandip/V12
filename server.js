const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const connectDB = require("./config/db");
const { connectQuestionDB } = require("./config/db2");

// ================= DATABASE =================
connectDB();
connectQuestionDB();

const app = express();

// ================= CORS (FIXED FOR LIVE SERVER) =================
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5500",
    "http://127.0.0.1:5501",   // ✅ ADD THIS
    "https://gonotes.shop",
    "https://www.gonotes.shop"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.options("*", cors());


// IMPORTANT: allow preflight requests
app.options("*", cors());

// ================= BODY PARSER =================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ================= ROUTES =================
const departmentRoutes = require("./routes/departmentRoutes");
const notesRoutes = require("./routes/notesRoutes");
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminPurchaseRoutes = require("./routes/adminPurchaseRoutes");
const couponRoutes = require("./routes/couponRoutes");
const articleRoutes = require("./routes/articleRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const questionRoutes = require("./routes/question.routes");

// ================= ROUTE REGISTRATION =================
app.use("/api/departments", departmentRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminPurchaseRoutes);
app.use("/api", couponRoutes);
app.use("/api", articleRoutes);
app.use("/api", pdfRoutes);
app.use("/api", questionRoutes);

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.status(200).send("Backend is running ✅");
});

// ================= ERROR HANDLER (OPTIONAL BUT GOOD) =================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({
    success: false,
    message: err.message || "Server Error"
  });
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
