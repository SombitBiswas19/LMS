const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema({
  title: String,
  videos: [String], // Array of video URLs
});

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  modules: [moduleSchema], // Array of modules
});

module.exports = mongoose.model("Course", courseSchema,'courses');
