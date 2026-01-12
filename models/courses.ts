import mongoose from "mongoose";

const lectureSlideSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  url: {
    type: String,
  },
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  lectureSlides: {
    type: [lectureSlideSchema],
    default: [],
  },
  notes: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Course", courseSchema);
