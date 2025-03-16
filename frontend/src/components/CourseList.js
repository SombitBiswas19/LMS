import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/courses")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.json();
      })
      .then((data) => setCourses(data))
      .catch((err) => setError(err.message)); // Handle fetch errors

    const storedCourses = JSON.parse(localStorage.getItem("enrolledCourses")) || [];
    setEnrolledCourses(storedCourses);
  }, []); // ✅ Removed `enrolledCourses` to prevent infinite loop

  const handleEnroll = (course) => {
    if (!enrolledCourses.some((c) => c._id === course._id)) {
      const updatedCourses = [...enrolledCourses, course];
      setEnrolledCourses(updatedCourses);
      localStorage.setItem("enrolledCourses", JSON.stringify(updatedCourses));
      alert(`Enrolled in ${course.title}`);
      navigate("/dashboard");
    } else {
      alert("Already enrolled in this course!");
    }
  };

  return (
    <div>
      <h2>Available Courses</h2>
      {error ? <p style={{ color: "red" }}>Error: {error}</p> : null}
      {courses.length === 0 ? (
        <p>Loading courses...</p>
      ) : (
        <ul>
          {courses.map((course) => (
            <li key={course._id}>
              <Link to={`/course/${course._id}`}>{course.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CourseList;
