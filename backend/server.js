const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
require("dotenv").config();

const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes"); // Import course routes

const User = require("./models/User");
const Course = require("./models/Course");
const Enrollment = require("./models/Enrollment");

const app = express();

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Routes
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes); // Ensure course routes are loaded

// ✅ Enroll Course
app.post("/api/enroll", async (req, res) => {
  const { userId, courseId } = req.body;

  try {
    const userExists = await User.findById(userId);
    if (!userExists) return res.status(404).json({ message: "User not found." });

    const courseExists = await Course.findById(courseId);
    if (!courseExists) return res.status(404).json({ message: "Course not found." });

    let enrollment = await Enrollment.findOne({ userId });

    if (!enrollment) {
      enrollment = new Enrollment({ userId, courses: [courseId] });
    } else {
      if (enrollment.courses.includes(courseId)) {
        return res.status(400).json({ message: "Already enrolled in this course." });
      }
      enrollment.courses.push(courseId);
    }

    await enrollment.save();
    res.status(200).json({ message: "✅ Enrolled successfully!", enrollment });
  } catch (error) {
    console.error("❌ Enrollment error:", error);
    res.status(500).json({ message: "Failed to enroll in the course." });
  }
});

// ✅ Fetch Enrolled Courses
app.get("/api/enrolled-courses/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const enrollment = await Enrollment.findOne({ userId });

    if (!enrollment || enrollment.courses.length === 0) {
      return res.status(404).json({ message: "No enrolled courses found." });
    }

    const courses = await Course.find({ _id: { $in: enrollment.courses } });
    res.status(200).json(courses);
  } catch (error) {
    console.error("❌ Error fetching enrolled courses:", error);
    res.status(500).json({ message: "Failed to retrieve enrolled courses." });
  }
});

// ✅ Serve Frontend (React)
const frontendPath = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
