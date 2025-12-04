// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Load env
dotenv.config();

// Connect to DB
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // to parse JSON bodies

// Route files
const departmentRoutes = require(path.join(__dirname, 'routes', 'departmentRoutes'));
const notesRoutes = require(path.join(__dirname, 'routes', 'notesRoutes'));
const authRoutes = require(path.join(__dirname, 'routes', 'authRoutes'));
const paymentRoutes = require(path.join(__dirname, 'routes', 'paymentRoutes')); // 👈 NEW

// Routes
app.use('/api/departments', departmentRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes); // 👈 /api/payment/create-order, /verify

// Health check
app.get('/', (req, res) => {
  res.send('Backend is running ✅');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
