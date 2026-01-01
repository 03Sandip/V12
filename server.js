const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const connectDB = require("./config/db");
const { connectQuestionDB } = require("./config/db2");

connectDB();
connectQuestionDB();

const app = express();

// ================= MIDDLEWARES =================
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ================= ROUTES =================
const departmentRoutes = require("./routes/departmentRoutes");
const notesRoutes = require("./routes/notesRoutes");
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminPurchaseRoutes = require("./routes/adminPurchaseRoutes");
const couponRoutes = require("./routes/couponRoutes");
const articleRoutes = require("./routes/articleRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const questionRoutes = require("./routes/question.routes"); // ✅ ADD THIS
const receiptRoutes = require("./routes/receiptRoutes");


app.use("/api/departments", departmentRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminPurchaseRoutes);
app.use("/api", couponRoutes);
app.use("/api", articleRoutes);
app.use("/api", pdfRoutes);
app.use("/api", questionRoutes); // ✅ ADD THIS
app.use("/api/receipt", receiptRoutes);

// app.use("/api", questionRoutes); // ← only if imported

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
