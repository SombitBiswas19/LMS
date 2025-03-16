const EnrolledCourses = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const userId = localStorage.getItem("userId"); // Fetch from local storage or auth context

  useEffect(() => {
      if (!userId) return;

      const fetchEnrolledCourses = async () => {
          try {
              const response = await axios.get(`http://localhost:5000/api/enrolled-courses/${userId}`);
              setEnrolledCourses(response.data);
          } catch (error) {
              console.error("Error fetching enrolled courses:", error);
          }
      };

      fetchEnrolledCourses();
  }, [userId]); // Re-run when `userId` changes

  return (
      <div>
          <h3>Enrolled Courses</h3>
          {enrolledCourses.length === 0 ? (
              <p>No enrolled courses</p>
          ) : (
              <ul>
                  {enrolledCourses.map((course) => (
                      <li key={course._id}>{course.title}</li>
                  ))}
              </ul>
          )}
      </div>
  );
};

export default EnrolledCourses;
