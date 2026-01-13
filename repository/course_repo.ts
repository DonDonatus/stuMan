import courses from "../models/courses";
import { slideInterface } from "../Types/slides.ts";

export const createCourse = async (
  title: string,
  code: string,
  lectureSlide?: slideInterface,
  notes?: string[]
) => {
  try {
    const course = new courses({
      title: title,
      code: code,
      lectureSlides: lectureSlide ? [lectureSlide] : [],
      notes: notes ? notes : [],
    });
    await course.save();
  } catch (error) {}
};

export const addNoteToCourse = async (name: string, note: string) => {
  const course = await courses.findOne({ title: name });
  try {
    if (course) {
      course.notes.push(note);
      await course.save();
    } else if (!course) {
      console.error("Course not found with code:", name);
    }
  } catch (error) {
    console.error("Error adding note to course:", error);
  }
};
