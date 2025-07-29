import React, { useState, useEffect, createContext, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { authAPI, isAuthenticated, removeAuthToken } from "./services/api";
import toast from "react-hot-toast";

// Components
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import CourseView from "./components/CourseView";
import CourseDetail from "./components/CourseDetail";
import VideoPlayer from "./components/VideoPlayer";
import Quiz from "./components/Quiz";
import Analytics from "./components/Analytics";
import Profile from "./components/Profile";
import Auth from "./components/Auth";
import LoadingSpinner from "./components/LoadingSpinner";
import NotFound from "./components/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

// Create App Context
const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

// App Provider Component
const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);

      // Check if user is authenticated
      if (isAuthenticated()) {
        try {
          const userData = await authAPI.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error("Failed to get current user:", error);
          // Clear invalid tokens
          removeAuthToken();
          setUser(null);
        }
      }
    } catch (error) {
      console.error("App initialization error:", error);
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  };

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      removeAuthToken();
      setUser(null);
      toast.success("Logged out successfully");
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const refreshUserEnrollments = async () => {
    if (user?.role === "student") {
      try {
        // Force refresh enrollment data across the app
        window.dispatchEvent(
          new CustomEvent("refreshEnrollments", {
            detail: { userId: user.id },
          })
        );
      } catch (error) {
        console.warn("Could not refresh enrollments:", error);
      }
    }
  };

  const value = {
    user,
    setUser,
    login,
    logout,
    updateUser,
    refreshUserEnrollments, // ✅ Add this
    loading,
    isInitialized,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Auth Wrapper Component
const AuthWrapper = ({ children }) => {
  const { user, logout } = useApp();

  return (
    <Layout user={user} onLogout={logout}>
      {children}
    </Layout>
  );
};

// Main App Component
const App = () => {
  return (
    <div className="App">
      <AppProvider>
        <Router>
          <AppContent />
        </Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
            },
            success: {
              duration: 3000,
              theme: {
                primary: "green",
                secondary: "black",
              },
            },
            error: {
              duration: 5000,
              theme: {
                primary: "red",
                secondary: "black",
              },
            },
          }}
        />
      </AppProvider>
    </div>
  );
};

// App Content Component (separated to use hooks properly)
const AppContent = () => {
  const { user, login, logout, loading, isInitialized } = useApp();

  // Show loading screen during initialization
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600 text-lg">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Auth mode="login" onLogin={login} />
          )
        }
      />
      <Route
        path="/signup"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Auth mode="signup" onLogin={login} />
          )
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AuthWrapper>
              <Dashboard user={user} />
            </AuthWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <AuthWrapper>
              <CourseView user={user} />
            </AuthWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/course/:courseId"
        element={
          <ProtectedRoute>
            <AuthWrapper>
              <CourseDetail user={user} />
            </AuthWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/course/:courseId/lesson/:lessonId"
        element={
          <ProtectedRoute>
            <VideoPlayer user={user} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/course/:courseId/quiz/:quizId"
        element={
          <ProtectedRoute>
            <AuthWrapper>
              <Quiz user={user} />
            </AuthWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AuthWrapper>
              <Analytics user={user} onLogout={logout} />
            </AuthWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AuthWrapper>
              <Profile user={user} />
            </AuthWrapper>
          </ProtectedRoute>
        }
      />

      {/* Admin Only Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <AuthWrapper>
              <AdminRoutes user={user} />
            </AuthWrapper>
          </ProtectedRoute>
        }
      />

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Admin Routes Component
const AdminRoutes = ({ user }) => {
  return (
    <Routes>
      <Route path="/dashboard" element={<Analytics user={user} />} />
      <Route path="/courses" element={<CourseView user={user} />} />
      <Route path="/users" element={<UserManagement user={user} />} />
      <Route path="/reports" element={<ReportsView user={user} />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};

// User Management Component
const UserManagement = ({ user }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">User Management</h1>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-gray-600">User management features coming soon...</p>
        <p className="text-sm text-gray-500 mt-2">
          Current user: {user?.full_name}
        </p>
      </div>
    </div>
  );
};

// Reports View Component
const ReportsView = ({ user }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Reports & Analytics
      </h1>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-gray-600">
          Advanced reporting features coming soon...
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Current user: {user?.full_name}
        </p>
      </div>
    </div>
  );
};

// Update the value object around line 85

export default App;
