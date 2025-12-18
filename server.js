// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Route files
const departmentRoutes = require('./routes/departmentRoutes');
const notesRoutes = require('./routes/notesRoutes');
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminPurchaseRoutes = require('./routes/adminPurchaseRoutes');
const couponRoutes = require('./routes/couponRoutes');
const articleRoutes = require("./routes/articleRoutes");
const pdfRoutes = require("./routes/pdfRoutes"); // ✅ PDF ADDED

// Routes
app.use('/api/departments', departmentRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminPurchaseRoutes);
app.use('/api', couponRoutes);
app.use('/api', articleRoutes);
app.use('/api', pdfRoutes); // ✅ REGISTERED

// Health check
app.get('/', (req, res) => {
  res.send('Backend is running ✅');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
