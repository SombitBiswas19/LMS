// CourseRoutes.js
const express = require("express");
const router = express.Router();
const Course = require("../models/Course");

// ✅ Get course by ID
router.get("/:courseId", async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: "Error fetching course", error });
  }
});

module.exports = router;