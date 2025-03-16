import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CourseList from "./components/CourseList";
import Dashboard from "./pages/Dashboard";
import CoursePage from "./pages/CoursePage"; // Import CoursePage component
import Login from "./pages/LoginPage";
import Signup from "./pages/SignupPage";
import NotFound from "./pages/NotFound";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated") === "true";
    setIsAuthenticated(authStatus);
  }, []);

  return (
    <Routes>
      <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/courses" element={<CourseList />} />
      <Route path="/course/:courseId" element={<CoursePage />} /> {/* ✅ Added this route */}
      <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
      <Route path="/signup" element={<Signup setIsAuthenticated={setIsAuthenticated} />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
