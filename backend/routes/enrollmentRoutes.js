const express = require("express");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const router = express.Router();

// Enroll in a Course
router.post("/enroll", async (req, res) => {
    const { userId, courseId } = req.body;
    try {
        let enrollment = await Enrollment.findOne({ userId });
        if (!enrollment) {
            enrollment = new Enrollment({ userId, courses: [courseId] });
        } else {
            if (!enrollment.courses.includes(courseId)) {
                enrollment.courses.push(courseId);
            } else {
                return res.status(400).json({ message: "Already enrolled in this course" });
            }
        }
        await enrollment.save();
        res.status(200).json(enrollment);
    } catch (error) {
        console.error("Enrollment error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get enrolled courses for a user
router.get("/enrolled-courses/:userId", async (req, res) => {
    try {
        let enrollment = await Enrollment.findOne({ userId: req.params.userId }).populate("courses");

        if (!enrollment) {
            // Create a new enrollment entry if not found
            enrollment = new Enrollment({ userId: req.params.userId, courses: [] });
            await enrollment.save();
        }

        res.json(enrollment.courses);
    } catch (error) {
        console.error("Fetch enrolled courses error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;