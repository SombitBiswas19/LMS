import { useState } from "react";
import { useNavigate } from "react-router-dom";

function SignupPage({ setIsAuthenticated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Set user authenticated
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("role", data.role || "student"); // Optional role info
        setIsAuthenticated(true);

        const userId = data.userId; // Declare userId here

        // Fetch enrollments
        const enrollmentsResponse = await fetch(`http://localhost:5000/api/enrolled-courses/${userId}`);
        const enrollmentsData = await enrollmentsResponse.json();

        if (enrollmentsResponse.ok) {
          localStorage.setItem("enrolledCourses", JSON.stringify(enrollmentsData.enrolledCourses || []));
        } else {
          localStorage.setItem("enrolledCourses", JSON.stringify([]));
        }

        navigate("/dashboard");
      } else {
        alert(data.message || "Signup failed");
      }
    } catch (error) {
      console.error("Signup Error:", error);
      alert("Signup failed: Server error");
    }
  };

  return (
    <div>
      <h2>Sign Up</h2>
      <form onSubmit={handleSignup}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
}

export default SignupPage;
