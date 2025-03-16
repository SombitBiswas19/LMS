import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Dashboard = () => {
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const userId = localStorage.getItem("userId");

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const [coursesResponse, enrolledResponse] = await Promise.all([
                    fetch("http://localhost:5000/api/courses"),
                    fetch(`http://localhost:5000/api/enrolled-courses/${userId}`)
                ]);

                const coursesData = await coursesResponse.json();
                const enrolledData = await enrolledResponse.json();

                if (coursesResponse.ok) setAllCourses(coursesData || []);
                if (enrolledResponse.ok) {
                    setEnrolledCourses(enrolledData.map(course => course.title));
                }

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, [userId]);

    const handleEnroll = async (courseId) => {
        try {
            const response = await fetch("http://localhost:5000/api/enroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, courseId }),
            });

            const data = await response.json();

            if (response.ok) {
                setEnrolledCourses(prev => [...prev, data.courseTitle]);
                alert("Successfully enrolled!");
            } else {
                alert("Enrollment failed: " + data.message);
            }
        } catch (error) {
            console.error("Enrollment Error:", error);
            alert("Enrollment failed: Server error");
        }
    };

    if (loading) {
        return <div className="text-center text-xl font-semibold py-10">Loading...</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-3xl font-bold mb-4">Welcome to Your Dashboard</h2>

            <div className="mb-6">
                <h3 className="text-2xl font-semibold mb-2">Enrolled Courses:</h3>
                {enrolledCourses.length === 0 ? (
                    <p className="text-gray-600">You have not enrolled in any courses yet.</p>
                ) : (
                    <ul className="list-disc list-inside text-lg text-blue-700">
                        {enrolledCourses.map((courseTitle, index) => (
                            <li key={index}>{courseTitle}</li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <h3 className="text-2xl font-semibold mb-4">Available Courses:</h3>
                {allCourses.length === 0 ? (
                    <p className="text-gray-600">No courses available.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allCourses.map(course => (
                            <div key={course._id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                                <h4 className="text-xl font-semibold mb-2">{course.title}</h4>
                                <p className="text-gray-700">{course.description}</p>
                                <div className="mt-4 flex justify-between">
                                    <Link
                                        to={`/course/${course._id}`}
                                        className="text-blue-600 hover:underline"
                                    >
                                        View Details
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
