// routes/departmentRoutes.js
const express = require('express');
const router = express.Router();
const Department = require('../models/Department');

// Create department
// POST /api/departments
router.post('/', async (req, res) => {
  try {
    const { name, semesters } = req.body;

    if (!name || !semesters || !Array.isArray(semesters)) {
      return res
        .status(400)
        .json({ message: 'Name and semesters (array) are required' });
    }

    const existing = await Department.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: 'Department already exists' });
    }

    const department = new Department({ name, semesters });
    await department.save();

    res.status(201).json(department);
  } catch (err) {
    console.error('Error creating department:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all departments
// GET /api/departments
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json(departments);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete department
// DELETE /api/departments/:id
router.delete('/:id', async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // (Optional) you can also delete notes for this department here

    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    console.error('Error deleting department:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
