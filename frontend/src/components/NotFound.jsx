import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeftCircle } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-red-100 p-6">
      <div className="max-w-md w-full text-center bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 rounded-full p-4">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">404 - Page Not Found</h1>
        <p className="text-gray-600 mb-6">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>

        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeftCircle className="h-5 w-5 mr-2" />
          Go Back
        </button>
      </div>
    </div>
  );
};

export default NotFound;
