const mongoose = require("mongoose");

const contentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  title: String,
  type: { type: String, enum: ["video", "pdf"] },
  url: String
});

module.exports = mongoose.model("Content", contentSchema);
