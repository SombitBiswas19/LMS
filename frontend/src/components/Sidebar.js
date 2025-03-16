import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <div className="w-64 h-screen bg-gray-800 text-white p-4">
      <h2 className="text-xl font-bold mb-4">LMS Dashboard</h2>
      <ul>
        <li className="mb-2">
          <Link to="/courses" className="block p-2 hover:bg-gray-700 rounded">
            Courses
          </Link>
        </li>
        <li className="mb-2">
          <Link to="/profile" className="block p-2 hover:bg-gray-700 rounded">
            User Details
          </Link>
        </li>
        <li className="mb-2">
          <Link to="/settings" className="block p-2 hover:bg-gray-700 rounded">
            Settings
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
