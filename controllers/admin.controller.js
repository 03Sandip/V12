const Question = require("../models/Question");

exports.addQuestion = async (req, res) => {
  try {
    const {
      questionText,
      type,
      options,
      correctAnswer,
      subject,
      topic,
      year,
      department,
      solutionLink
    } = req.body;

    // Validation
    if (type !== "NAT" && (!options || options.length === 0)) {
      return res.status(400).json({ error: "Options required for MCQ/MSQ" });
    }

    const question = await Question.create({
      questionText,
      type,
      options: type === "NAT" ? [] : options,
      correctAnswer,
      subject,
      topic,
      year,
      department,
      solutionLink
    });

    res.status(201).json({
      success: true,
      data: question
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
