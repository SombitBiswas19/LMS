import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {toast} from 'react-hot-toast';
import { useApp } from '../App'; // Assuming useApp is exported from App.jsx

import LoadingSpinner from './LoadingSpinner';
import { User, Mail, Save, Camera } from 'lucide-react';

const Profile = () => {
  // Use the user from the global context
  const { user, setUser } = useApp();
  const [loading, setLoading] = useState(false);

  // Setup react-hook-form with default values from the user context
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
    },
  });

  // Handle form submission
  const onProfileSubmit = (data) => {
    setLoading(true);
    console.log("Submitting data:", data);

    // Simulate an API call
    setTimeout(() => {
      // In a real app, you would make an API call here.
      // For now, we just update the local state and show a toast.
      setUser({ ...user, full_name: data.full_name });
      toast.success('Profile updated successfully!');
      setLoading(false);
    }, 1000);
  };

  // If the user data is not yet available, show a loader
  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1 md:mt-0">View and edit your personal information.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Details Form */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Personal Information</h2>
            <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="full_name"
                    type="text"
                    {...register('full_name', { required: 'Full name is required' })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {errors.full_name && <p className="text-red-600 text-sm mt-1">{errors.full_name.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? <LoadingSpinner size="small" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - Avatar */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Profile Picture</h3>
            <div className="relative w-40 h-40 mx-auto mb-4">
              <img
                src={user.avatar_url || 'https://placehold.co/160x160/E2E8F0/4A5568?text=Avatar'}
                alt="Profile"
                className="w-full h-full rounded-full object-cover shadow-md"
              />
              <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                <Camera className="w-5 h-5" />
                <input id="avatar-upload" type="file" className="hidden" accept="image/png, image/jpeg" disabled />
              </label>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{user.full_name}</h2>
            <p className="text-sm text-gray-500 capitalize">{user.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
