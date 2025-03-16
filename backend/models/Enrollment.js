const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // Ensures one document per user
  courses: { type: [String], default: [] }, // Ensures array format
  enrolledAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Enrollment", enrollmentSchema,'enrollments');
