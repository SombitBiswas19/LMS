import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div>
      <h1>Welcome to Our LMS</h1>
      <p>Learn anytime, anywhere!</p>
      <Link to="/login"><button>Login</button></Link>
      <Link to="/signup"><button>Sign Up</button></Link>
    </div>
  );
}

export default HomePage;
