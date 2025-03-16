import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

function CoursePage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [enrolled, setEnrolled] = useState(false);
  const [error, setError] = useState("");

  const userId = localStorage.getItem("userId"); // Fetch userId from localStorage

  useEffect(() => {
    // Fetch course details
    fetch(`http://localhost:5000/api/courses/${courseId}`)
      .then((res) => res.json())
      .then((data) => setCourse(data))
      .catch((err) => console.error("Error fetching course:", err));

    // Fetch enrolled courses from backend
    if (userId) {
      fetch(`http://localhost:5000/api/enrolled-courses/${userId}`)
        .then((res) => res.json())
        .then((enrolledCourses) => {
          const isEnrolled = enrolledCourses.some(course => course._id === courseId);
          setEnrolled(isEnrolled);
        })
        .catch((err) => console.error("Error fetching enrolled courses:", err));
    }
  }, [courseId, userId]);

  const handleEnroll = async () => {
    if (!userId) {
      setError("User not logged in!");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, courseId }),
      });

      if (!response.ok) throw new Error("Failed to enroll");

      setEnrolled(true);
    } catch (error) {
      console.error("Enrollment error:", error);
      setError("Failed to enroll in the course.");
    }
  };

  if (!course) return <h2>Loading...</h2>;

  return (
    <div>
      <h1>{course.title}</h1>
      <p>{course.description}</p>
      <h2>Modules</h2>
      {course.modules.map((module, index) => (
        <div key={index}>
          <h3>{module.title}</h3>
          <ul>
            {module.videos.map((videoUrl, vIndex) => (
              <li key={vIndex}>
                <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                  Video {vIndex + 1}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {enrolled ? (
        <p>✅ Already Enrolled</p>
      ) : (
        <button onClick={handleEnroll}>Enroll</button>
      )}
    </div>
  );
}

export default CoursePage;
