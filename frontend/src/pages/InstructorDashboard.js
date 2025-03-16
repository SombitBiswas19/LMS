import React, { useState, useEffect } from "react";
import axios from "axios";
import { Navigate } from "react-router-dom"; // To redirect if not an instructor

const InstructorDashboard = ({ userId }) => {
  const [courses, setCourses] = useState([]);
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    modules: [{ title: "", videos: [""] }],
  });

  const userRole = localStorage.getItem("role");

  // If not an instructor, redirect to the default dashboard (or any other page)
  if (userRole !== "instructor") {
    return <Navigate to="/dashboard" />;
  }

  // Fetch instructor's courses when component mounts
  useEffect(() => {
    const fetchInstructorCourses = async () => {
      try {
        const response = await axios.get(`/api/instructor/courses/${userId}`);
        setCourses(response.data);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchInstructorCourses();
  }, [userId]);

  // Handle adding a new course
  const handleAddCourse = async () => {
    try {
      const response = await axios.post("/api/instructor/add-course", {
        ...newCourse,
        instructorId: userId,
      });
      setCourses([...courses, response.data.course]); // Add the new course to the list
      setNewCourse({ title: "", description: "", modules: [{ title: "", videos: [""] }] });
    } catch (error) {
      console.error("Error adding course:", error);
    }
  };

  // Handle input changes for new course
  const handleCourseInputChange = (e) => {
    const { name, value } = e.target;
    setNewCourse((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle module input change
  const handleModuleInputChange = (index, e) => {
    const { name, value } = e.target;
    const updatedModules = [...newCourse.modules];
    updatedModules[index][name] = value;
    setNewCourse((prev) => ({
      ...prev,
      modules: updatedModules,
    }));
  };

  const handleAddModule = () => {
    setNewCourse((prev) => ({
      ...prev,
      modules: [...prev.modules, { title: "", videos: [""] }],
    }));
  };

  return (
    <div>
      <h2>Instructor Dashboard</h2>
      <p>Manage your courses, assignments, and grading here.</p>

      <h3>Your Courses</h3>
      <div>
        {courses.length > 0 ? (
          courses.map((course) => (
            <div key={course._id}>
              <h4>{course.title}</h4>
              <p>{course.description}</p>
              <p>Enrolled Students: {course.enrollmentCount}</p>
              <button>Manage</button>
            </div>
          ))
        ) : (
          <p>No courses found. Add a new course below.</p>
        )}
      </div>

      <h3>Add New Course</h3>
      <div>
        <label>Course Title:</label>
        <input
          type="text"
          name="title"
          value={newCourse.title}
          onChange={handleCourseInputChange}
        />
        <br />
        <label>Course Description:</label>
        <textarea
          name="description"
          value={newCourse.description}
          onChange={handleCourseInputChange}
        />
        <br />
        <h4>Modules</h4>
        {newCourse.modules.map((module, index) => (
          <div key={index}>
            <label>Module Title:</label>
            <input
              type="text"
              name="title"
              value={module.title}
              onChange={(e) => handleModuleInputChange(index, e)}
            />
            <br />
            <label>Videos (comma separated URLs):</label>
            <input
              type="text"
              name="videos"
              value={module.videos.join(",")}
              onChange={(e) => {
                const videos = e.target.value.split(",");
                handleModuleInputChange(index, { target: { name: "videos", value: videos } });
              }}
            />
            <br />
          </div>
        ))}
        <button onClick={handleAddModule}>Add Module</button>
        <br />
        <button onClick={handleAddCourse}>Add Course</button>
      </div>
    </div>
  );
};

export default InstructorDashboard;
