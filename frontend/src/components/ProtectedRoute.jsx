import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authAPI, isAuthenticated } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      // Quick check for token existence
      if (!isAuthenticated()) {
        setIsValid(false);
        setIsVerifying(false);
        return;
      }

      try {
        // Verify token with server and get user data
        const userData = await authAPI.getCurrentUser();
        
        // Check if user has required role
        if (requiredRole && userData.role !== requiredRole) {
          setIsValid(false);
          setIsVerifying(false);
          return;
        }

        setUser(userData);
        setIsValid(true);
      } catch (error) {
        console.error('Auth verification failed:', error);
        // Clear invalid tokens
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setIsValid(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAuth();
  }, [requiredRole]);

  // Show loading spinner while verifying
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner 
          size="large" 
          message="Verifying authentication..." 
        />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isValid) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Render protected content
  return children;
};

export default ProtectedRoute;