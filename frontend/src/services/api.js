// COMPLETE ENHANCED COURSE API - Production Ready Version
// This replaces and extends your existing courseAPI with comprehensive fixes

import axios from 'axios';
import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Brain, Target, Zap, Plus, Save } from 'lucide-react';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_VERSION = '';
const TIMEOUT = 30000; // 30 seconds
const UPLOAD_TIMEOUT = 600000; // 10 minutes for uploads


// Create axios instance with enhanced configuration
const api = axios.create({
  baseURL: `${API_BASE_URL}${API_VERSION}`,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.metadata = { startTime: new Date() };

    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling
api.interceptors.response.use(
  (response) => {
    const duration = new Date() - response.config.metadata.startTime;

    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
    }

    return response;
  },
  (error) => {
    const duration = error.config?.metadata ? new Date() - error.config.metadata.startTime : 0;

    if (process.env.NODE_ENV === 'development') {
      console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} (${duration}ms)`, error);
    }

    // Handle different error types
    if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection.');
    } else if (error.response?.status === 401) {
      handleUnauthorized();
    } else if (error.response?.status === 403) {
      toast.error('Access denied. You don\'t have permission for this action.');
    } else if (error.response?.status === 404) {
      toast.error('Resource not found.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (!error.response) {
      toast.error('Network error. Please check your connection.');
    }

    return Promise.reject(error);
  }
);

// Handle unauthorized access
const handleUnauthorized = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  localStorage.removeItem('refresh_token');

  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
    toast.error('Session expired. Please login again.');
  }
};

// Helper function to get current user safely
const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Enhanced error handling for API responses
const handleApiError = (error) => {
  console.error('API Error Details:', {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    config: {
      method: error.config?.method,
      url: error.config?.url,
      data: error.config?.data
    }
  });

  let errorMessage = 'An unexpected error occurred';

  if (error.response?.data) {
    const { detail, message } = error.response.data;

    if (detail) {
      if (Array.isArray(detail)) {
        // Handle validation errors
        const messages = detail.map(err => {
          const field = err.loc?.[1] || 'Field';
          return `${field}: ${err.msg}`;
        });
        errorMessage = messages.join('\n');
      } else if (typeof detail === 'string') {
        errorMessage = detail;
      }
    } else if (message) {
      errorMessage = message;
    }
  } else if (error.message) {
    errorMessage = error.message;
  }

  // Show user-friendly messages for common errors
  if (error.response?.status === 401) {
    errorMessage = 'Please log in to continue';
  } else if (error.response?.status === 403) {
    errorMessage = 'You don\'t have permission to perform this action';
  } else if (error.response?.status === 404) {
    errorMessage = 'The requested resource was not found';
  } else if (error.response?.status === 422) {
    errorMessage = 'Please check your input and try again';
  } else if (error.response?.status >= 500) {
    errorMessage = 'Server error. Please try again later';
  }

  toast.error(errorMessage);
  return errorMessage;
};

// Enhanced error handler specifically for form submissions
const handleFormSubmissionError = (error, formType = 'form') => {
  console.error(`${formType} submission error:`, error);

  if (error.response?.status === 422) {
    const details = error.response.data?.detail;
    if (Array.isArray(details)) {
      const fieldErrors = details.map(err => {
        const field = err.loc?.[1] || 'Unknown field';
        const message = err.msg || 'Invalid value';
        return `${field}: ${message}`;
      });

      toast.error(`Validation errors:\n${fieldErrors.join('\n')}`, {
        duration: 6000,
        style: {
          whiteSpace: 'pre-line'
        }
      });

      return fieldErrors;
    } else if (typeof details === 'string') {
      toast.error(details);
      return [details];
    }
  }

  // Fallback to general error handler
  handleApiError(error);
  return [error.message || 'An unexpected error occurred'];
};

// Helper to safely extract course ID from response
const extractCourseId = (courseResponse) => {
  if (!courseResponse) {
    console.error('No course response provided');
    return null;
  }

  if (typeof courseResponse === 'number') {
    return courseResponse;
  }

  if (courseResponse.id) {
    return parseInt(courseResponse.id);
  }

  if (courseResponse.data && courseResponse.data.id) {
    return parseInt(courseResponse.data.id);
  }

  console.error('Could not extract course ID from response:', courseResponse);
  return null;
};

// Helper to validate lesson data before submission
const validateLessonData = (lessonData) => {
  const errors = [];

  if (!lessonData.title || !lessonData.title.trim()) {
    errors.push('Lesson title is required');
  }

  if (lessonData.duration_minutes === undefined || lessonData.duration_minutes < 0) {
    errors.push('Valid duration is required');
  }

  if (lessonData.order === undefined || lessonData.order < 1) {
    errors.push('Valid lesson order is required');
  }

  return errors;
};

// Helper to validate course data before submission
const validateCourseData = (courseData) => {
  const errors = [];

  if (!courseData.title || !courseData.title.trim()) {
    errors.push('Course title is required');
  }

  if (!courseData.description || !courseData.description.trim()) {
    errors.push('Course description is required');
  }

  if (!courseData.instructor || !courseData.instructor.trim()) {
    errors.push('Instructor name is required');
  }

  if (!courseData.duration_hours || courseData.duration_hours <= 0) {
    errors.push('Valid duration is required');
  }

  return errors;
};

// Enhanced Auth API
const authAPI = {
  async login(email, password) {
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
      }

      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  async signup(userData) {
    try {
      const response = await api.post('/auth/signup', userData);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  async updateProfile(profileData) {
    try {
      const response = await api.put('/auth/me', profileData);
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  async changePassword(passwordData) {
    try {
      const response = await api.post('/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('refresh_token');
    }
  },

  async validateToken() {
    try {
      const response = await api.get('/auth/validate-token');
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }
};

// Enhanced Course API with proper enrollment state management
const courseAPI = {
  // ✅ CRITICAL FIX: Enhanced getEnrolledCourses method
  async getEnrolledCourses(forceRefresh = false) {
    try {
      const params = {};
      if (forceRefresh) {
        params._t = Date.now(); // Cache busting
      }

      console.log('🔄 Fetching enrolled courses...');
      const response = await api.get('/courses/enrolled/list', { params });
      
      const enrolledCourses = Array.isArray(response.data) ? response.data : [];
      
      console.log('✅ Enrolled courses fetched:', {
        count: enrolledCourses.length,
        courses: enrolledCourses.map(c => ({
          id: c.id,
          title: c.title,
          is_enrolled: c.is_enrolled,
          progress: c.user_progress
        }))
      });

      return enrolledCourses;
    } catch (error) {
      console.error('❌ Error fetching enrolled courses:', error);
      
      // Fallback: try to get from regular courses endpoint
      try {
        console.log('🔄 Fallback: Getting enrolled courses from main endpoint...');
        const allCourses = await this.getCourses(forceRefresh);
        const enrolledCourses = allCourses.filter(course => course.is_enrolled);
        
        console.log('✅ Fallback successful:', {
          total: allCourses.length,
          enrolled: enrolledCourses.length
        });
        
        return enrolledCourses;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        return [];
      }
    }
  },

 async getCourses(forceRefresh = false) {
    try {
      const params = {};
      if (forceRefresh) {
        params._t = Date.now();
      }

      console.log('🔄 Fetching all courses...');
      const response = await api.get('/courses/', { params });
      const courses = Array.isArray(response.data) ? response.data : [];

      console.log('📚 All courses fetched:', {
        total: courses.length,
        enrolled: courses.filter(c => c.is_enrolled).length
      });

      const currentUser = getCurrentUser();
      if (!currentUser || currentUser.role !== 'student') {
        return courses.map(course => ({
          ...course,
          is_enrolled: false,
          user_progress: 0,
          enrollment_data: null
        }));
      }

      // For students, ensure enrollment data is properly handled
      const coursesWithEnrollment = courses.map(course => ({
        ...course,
        is_enrolled: Boolean(course.is_enrolled),
        user_progress: course.user_progress || 0,
        enrollment_data: course.enrollment_data || null,
        enrollment_status: course.enrollment_status || (course.is_enrolled ? 'active' : 'not_enrolled')
      }));

      console.log('✅ Courses processed with enrollment data:', {
        totalCourses: coursesWithEnrollment.length,
        enrolledCourses: coursesWithEnrollment.filter(c => c.is_enrolled).length,
        sampleEnrollment: coursesWithEnrollment.filter(c => c.is_enrolled).slice(0, 2).map(c => ({
          id: c.id,
          title: c.title,
          progress: c.user_progress
        }))
      });

      return coursesWithEnrollment;

    } catch (error) {
      console.error('❌ Error fetching courses:', error);
      handleApiError(error);
      throw error;
    }
  },

  // ✅ ENHANCED: getCourse with detailed enrollment info
  async getCourse(courseId) {
    try {
      if (!courseId || courseId === 'undefined') {
        throw new Error('Course ID is required');
      }

      const validCourseId = parseInt(courseId);
      console.log(`🔄 Fetching course ${validCourseId}...`);
      
      const response = await api.get(`/courses/${validCourseId}`);
      const course = response.data;

      console.log('📚 Course data received:', {
        id: course.id,
        title: course.title,
        is_enrolled: course.is_enrolled,
        user_progress: course.user_progress,
        enrollment_status: course.enrollment_status
      });

      return course;
    } catch (error) {
      console.error('❌ Error fetching course:', error);
      handleApiError(error);
      throw error;
    }
  },

  


  // Alias for backward compatibility
  async getCourseById(courseId) {
    return this.getCourse(courseId);
  },

  // Method to validate course exists before operations
  async validateCourseExists(courseId) {
    try {
      if (!courseId || courseId === 'undefined') {
        return false;
      }

      const course = await this.getCourse(courseId);
      return !!course && !!course.id;

    } catch (error) {
      console.error('Error validating course existence:', error);
      return false;
    }
  },


// Enhanced course creation with quiz lessons
  async createCourse(courseData) {
    try {
      console.log('🔄 Creating course with data:', courseData);
      
      // Separate lessons from course data
      const { lessons, ...baseCourseData } = courseData;
      
      // Create the course first
      // Fixed code
      const response = await api.post('/courses', baseCourseData);
      const course = response.data;


      console.log('✅ Course created:', course);

      // Create lessons if provided
      if (lessons && lessons.length > 0) {
        console.log(`🔄 Creating ${lessons.length} lessons for course ${course.id}`);
        
        for (let i = 0; i < lessons.length; i++) {
          const lesson = lessons[i];
          if (lesson.title && lesson.title.trim()) {
            const lessonData = {
              ...lesson,
              order: i + 1,
              duration_minutes: parseInt(lesson.duration_minutes) || 0,
              points: parseInt(lesson.points) || 0
            };

            await this.createLesson(course.id, lessonData);
            console.log(`✅ Created lesson ${i + 1}: ${lesson.title}`);
          }
        }
      }

      return course;
    } catch (error) {
      console.error('❌ Failed to create course:', error);
      throw error;
    }
  },

  
  

  // FIXED: Method to create course with lessons in sequence
  async createCourseWithLessons(courseData, lessons = []) {
    try {
      console.log('Creating course with lessons...');

      // Step 1: Create the course first
      const createdCourse = await this.createCourse(courseData);

      if (!createdCourse || !createdCourse.id) {
        throw new Error('Failed to create course - no course ID returned');
      }

      console.log(`Course created with ID: ${createdCourse.id}`);

      // Step 2: Create lessons if provided
      const createdLessons = [];

      if (lessons && lessons.length > 0) {
        console.log(`Creating ${lessons.length} lessons for course ${createdCourse.id}`);

        for (let i = 0; i < lessons.length; i++) {
          const lesson = lessons[i];

          try {
            // Ensure lesson has an order if not specified
            if (!lesson.order) {
              lesson.order = i + 1;
            }

            console.log(`Creating lesson ${i + 1}/${lessons.length}:`, lesson.title);

            const createdLesson = await this.createLesson(createdCourse.id, lesson);
            createdLessons.push(createdLesson);

            console.log(`Lesson ${i + 1} created successfully`);

          } catch (lessonError) {
            console.error(`Failed to create lesson ${i + 1}:`, lessonError);
            // Continue with other lessons even if one fails
            toast.error(`Failed to create lesson "${lesson.title}": ${lessonError.message}`);
          }
        }
      }

      const result = {
        course: createdCourse,
        lessons: createdLessons,
        success: true,
        totalLessons: lessons.length,
        createdLessons: createdLessons.length
      };

      console.log('Course creation with lessons completed:', result);

      if (createdLessons.length < lessons.length) {
        toast.warning(`Course created but only ${createdLessons.length}/${lessons.length} lessons were created successfully`);
      } else if (lessons.length > 0) {
        toast.success(`Course and all ${createdLessons.length} lessons created successfully!`);
      }

      return result;

    } catch (error) {
      console.error('Error in createCourseWithLessons:', error);
      throw error;
    }
  },

  // FIXED: Better error handling for batch operations
  async createLessonsBatch(courseId, lessons) {
    try {
      if (!courseId || courseId === 'undefined') {
        throw new Error('Valid course ID is required');
      }

      if (!Array.isArray(lessons) || lessons.length === 0) {
        throw new Error('At least one lesson is required');
      }

      const results = [];
      const errors = [];

      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];

        try {
          // Ensure lesson has an order
          if (!lesson.order) {
            lesson.order = i + 1;
          }

          const result = await this.createLesson(courseId, lesson);
          results.push(result);

        } catch (error) {
          console.error(`Failed to create lesson ${i + 1}:`, error);
          errors.push({
            index: i,
            lesson: lesson,
            error: error.message
          });
        }
      }

      return {
        success: results.length,
        failed: errors.length,
        total: lessons.length,
        results: results,
        errors: errors
      };

    } catch (error) {
      console.error('Error in batch lesson creation:', error);
      throw error;
    }
  },

  // Enhanced course update
  async updateCourse(courseId, courseData) {
    try {
      const cleanedData = {};

      // Only include fields that are being updated
      if (courseData.title !== undefined) cleanedData.title = courseData.title.trim();
      if (courseData.description !== undefined) cleanedData.description = courseData.description.trim();
      if (courseData.short_description !== undefined) cleanedData.short_description = courseData.short_description?.trim() || '';
      if (courseData.instructor !== undefined) cleanedData.instructor = courseData.instructor.trim();
      if (courseData.duration_hours !== undefined) cleanedData.duration_hours = parseFloat(courseData.duration_hours);
      if (courseData.difficulty_level !== undefined) cleanedData.difficulty_level = courseData.difficulty_level;
      if (courseData.category !== undefined) cleanedData.category = courseData.category?.trim() || 'General';
      if (courseData.tags !== undefined) cleanedData.tags = Array.isArray(courseData.tags) ? courseData.tags.filter(tag => tag && tag.trim()) : [];
      if (courseData.prerequisites !== undefined) cleanedData.prerequisites = Array.isArray(courseData.prerequisites) ? courseData.prerequisites.filter(p => p && p.trim()) : [];
      if (courseData.learning_objectives !== undefined) cleanedData.learning_objectives = Array.isArray(courseData.learning_objectives) ? courseData.learning_objectives.filter(obj => obj && obj.trim()) : [];
      if (courseData.price !== undefined) cleanedData.price = parseFloat(courseData.price) || 0.0;
      if (courseData.is_featured !== undefined) cleanedData.is_featured = Boolean(courseData.is_featured);
      if (courseData.is_free !== undefined) cleanedData.is_free = Boolean(courseData.is_free);
      if (courseData.language !== undefined) cleanedData.language = courseData.language || 'English';
      if (courseData.certificate_available !== undefined) cleanedData.certificate_available = Boolean(courseData.certificate_available);
      if (courseData.estimated_completion_time !== undefined) cleanedData.estimated_completion_time = courseData.estimated_completion_time ? parseInt(courseData.estimated_completion_time) : null;

      const response = await api.put(`/courses/${courseId}`, cleanedData);
      return response.data;
    } catch (error) {
      console.error('Error updating course:', error);
      handleApiError(error);
      throw error;
    }
  },

  async deleteCourse(courseId) {
    try {
      const response = await api.delete(`/courses/${courseId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting course:', error);
      handleApiError(error);
      throw error;
    }
  },

 async enrollCourse(courseId) {
    try {
      console.log(`🎓 Starting enrollment for course ${courseId}`);
      
      const response = await api.post(`/courses/${courseId}/enroll`);
      
      console.log('✅ Enrollment API response:', response.data);

      // ✅ CRITICAL: Dispatch enrollment change event immediately
      const enrollmentData = {
        courseId: parseInt(courseId),
        enrolled: true,
        course: {
          id: parseInt(courseId),
          is_enrolled: true,
          user_progress: 0,
          enrollment_data: response.data,
          enrollment_status: 'active',
          enrolled_at: new Date().toISOString()
        }
      };

      // Dispatch custom event for immediate UI updates
      window.dispatchEvent(new CustomEvent('courseEnrollmentChanged', {
        detail: enrollmentData
      }));

      console.log('📡 Enrollment event dispatched:', enrollmentData);

      toast.success('🎉 Successfully enrolled in course!');
      return response.data;
    } catch (error) {
      console.error('❌ Enrollment error:', error);
      handleApiError(error);
      throw error;
    }
  },

 // ✅ ENHANCED: Better unenrollment with state cleanup
  async unenrollCourse(courseId) {
    try {
      console.log(`🚫 Starting unenrollment for course ${courseId}`);
      
      const response = await api.delete(`/courses/${courseId}/enroll`);
      
      // Dispatch unenrollment event
      window.dispatchEvent(new CustomEvent('courseEnrollmentChanged', {
        detail: {
          courseId: parseInt(courseId),
          enrolled: false,
          course: null
        }
      }));

      toast.success('Successfully unenrolled from course');
      return response.data;
    } catch (error) {
      console.error('❌ Unenrollment error:', error);
      handleApiError(error);
      throw error;
    }
  },


  async getMyEnrollments(params = {}) {
    try {
      const response = await api.get('/courses/my-enrollments', {
        params: {
          ...params,
          _t: Date.now() // ✅ Cache busting
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      throw error;
    }
  },
  // LESSON MANAGEMENT - Enhanced with comprehensive validation

  async getLessons(courseId) {
    try {
      const response = await api.get(`/courses/${courseId}/lessons`);
      return response.data;
    } catch (error) {
      console.error('Error fetching lessons:', error);
      handleApiError(error);
      throw error;
    }
  },

  async getLesson(courseId, lessonId) {
    try {
      console.log(`🔄 Fetching lesson ${lessonId} for course ${courseId}`);
      
      // ✅ Fixed code
      const response = await api.get(`/courses/${courseId}/lessons/${lessonId}`);
      const lesson = response.data;
      
      // Ensure quiz data is properly structured
      if (response.lesson_type === 'quiz' && response.quiz_data) {
        response.quiz_data = {
          time_limit_minutes: response.quiz_data.time_limit_minutes || 30,
          passing_score: response.quiz_data.passing_score || 70,
          attempts_allowed: response.quiz_data.attempts_allowed || 3,
          randomize_questions: response.quiz_data.randomize_questions || false,
          show_correct_answers: response.quiz_data.show_correct_answers !== false,
          questions: Array.isArray(response.quiz_data.questions) ? response.quiz_data.questions : []
        };
      }

      console.log('✅ Lesson fetched successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch lesson:', error);
      throw error;
    }
  },

  // Mark lesson as complete
  async markLessonComplete(courseId, lessonId) {
    try {
      console.log(`🔄 Marking lesson ${lessonId} as complete`);
      
      const response = await api.post(`/courses/${courseId}/lessons/${lessonId}/complete`);
      const result = response.data;

      console.log('✅ Lesson marked as complete:', response);
      
      // Dispatch enrollment change event to update UI
      window.dispatchEvent(new CustomEvent('lessonCompleted', {
        detail: {
          courseId: parseInt(courseId),
          lessonId: parseInt(lessonId),
          progress: response.progress || 0
        }
      }));

      return response;
    } catch (error) {
      console.error('❌ Failed to mark lesson complete:', error);
      throw error;
    }
  },

  // Quiz attempt for quiz lessons
  async attemptQuizLesson(courseId, lessonId, answers, timeTaken = 0) {
    try {
      console.log(`🔄 Submitting quiz lesson ${lessonId} attempt`);
      
      const payload = {
        answers: answers,
        time_taken: timeTaken
      };

      const response = await api.post(`/courses/${courseId}/lessons/${lessonId}/quiz-attempt`, payload);
      const quizResult = response.data;

      console.log('✅ Quiz lesson attempt submitted:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to submit quiz lesson attempt:', error);
      throw error;
    }
  },

  // FIXED: Enhanced lesson creation with proper course ID validation
  async createLesson(courseId, lessonData) {
    try {
      // CRITICAL FIX: Validate courseId first
      if (!courseId || courseId === 'undefined' || courseId === undefined) {
        throw new Error('Valid course ID is required to create a lesson');
      }

      // Ensure courseId is a number
      const validCourseId = parseInt(courseId);
      if (isNaN(validCourseId) || validCourseId <= 0) {
        throw new Error('Course ID must be a valid positive number');
      }

      // Validate required fields
      if (!lessonData.title || !lessonData.title.trim()) {
        throw new Error('Lesson title is required');
      }

      if (lessonData.duration_minutes === undefined || lessonData.duration_minutes < 0) {
        throw new Error('Valid duration is required');
      }

      if (lessonData.order === undefined || lessonData.order < 1) {
        throw new Error('Valid lesson order is required');
      }

      // Clean the data before sending
      const cleanedData = {
        title: lessonData.title.trim(),
        description: lessonData.description?.trim() || '',
        video_url: lessonData.video_url?.trim() || '',
        duration_minutes: parseFloat(lessonData.duration_minutes) || 0,
        order: parseInt(lessonData.order) || 1,
        lesson_type: lessonData.lesson_type || 'video',
        content: lessonData.content?.trim() || '',
        transcript: lessonData.transcript?.trim() || '',
        resources: lessonData.resources || null,
        is_preview: Boolean(lessonData.is_preview),
        is_mandatory: Boolean(lessonData.is_mandatory !== false), // Default to true
        points: parseInt(lessonData.points) || 0
      };
      
      // Add quiz-specific fields if this is a quiz
      if (lessonData.lesson_type === 'quiz' && lessonData.quiz_data) {
        cleanedData.quiz_data = {
          time_limit_minutes: lessonData.quiz_data.time_limit_minutes || 30,
          passing_score: lessonData.quiz_data.passing_score || 70,
          attempts_allowed: lessonData.quiz_data.attempts_allowed || 3,
          randomize_questions: lessonData.quiz_data.randomize_questions || false,
          show_correct_answers: lessonData.quiz_data.show_correct_answers !== false,
          questions: lessonData.quiz_data.questions || []
        };
      }

      console.log(`Creating lesson for course ${validCourseId}:`, cleanedData);

      const response = await api.post(`/courses/${validCourseId}/lessons`, cleanedData);

      console.log('Lesson created successfully:', response.data);
      toast.success('Lesson created successfully!');

      return response.data;
    } catch (error) {
      console.error('Error creating lesson:', error);

      // Enhanced error handling for lesson creation
      if (error.response?.status === 422) {
        const details = error.response.data?.detail;
        if (Array.isArray(details)) {
          const errorMessages = details.map(err => {
            const field = err.loc?.[1] || 'Field';
            const message = err.msg || 'Invalid value';
            return `${field}: ${message}`;
          });
          throw new Error(`Validation errors: ${errorMessages.join(', ')}`);
        } else if (typeof details === 'string') {
          throw new Error(details);
        }
      }

      handleApiError(error);
      throw error;
    }
  },

  // Enhanced lesson update method
  async updateLesson(courseId, lessonId, lessonData) {
    try {
      console.log('🔄 Updating lesson with data:', lessonData);
      
      const payload = {
        title: lessonData.title,
        description: lessonData.description || '',
        lesson_type: lessonData.lesson_type || 'video',
        video_url: lessonData.video_url || '',
        content: lessonData.content || '',
        duration_minutes: parseInt(lessonData.duration_minutes) || 0,
        points: parseInt(lessonData.points) || 0,
        is_preview: lessonData.is_preview || false,
        is_mandatory: lessonData.is_mandatory !== undefined ? lessonData.is_mandatory : true
      };

      // Add quiz-specific fields if this is a quiz
      if (lessonData.lesson_type === 'quiz' && lessonData.quiz_data) {
        payload.quiz_data = {
          time_limit_minutes: lessonData.quiz_data.time_limit_minutes || 30,
          passing_score: lessonData.quiz_data.passing_score || 70,
          attempts_allowed: lessonData.quiz_data.attempts_allowed || 3,
          randomize_questions: lessonData.quiz_data.randomize_questions || false,
          show_correct_answers: lessonData.quiz_data.show_correct_answers !== false,
          questions: lessonData.quiz_data.questions || []
        };
      }

      // ✅ Fixed code
      const response = await api.put(`/courses/${courseId}/lessons/${lessonId}`, payload);
      const updatedLesson = response.data;

      console.log('✅ Lesson updated successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to update lesson:', error);
      throw error;
    }
  },

  async deleteLesson(courseId, lessonId) {
    try {
      const response = await api.delete(`/courses/${courseId}/lessons/${lessonId}`);
      toast.success('Lesson deleted successfully');
      return response.data;
    } catch (error) {
      console.error('Error deleting lesson:', error);
      handleApiError(error);
      throw error;
    }
  },

  // Enhanced video upload with comprehensive validation and progress tracking
  async uploadVideo(courseId, lessonId, videoFile, onUploadProgress) {
    try {
      // Validate file
      if (!videoFile) {
        throw new Error('No video file provided');
      }

      const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/wmv', 'video/mkv', 'video/flv'];
      if (!allowedTypes.includes(videoFile.type)) {
        throw new Error('Invalid video format. Please use MP4, WebM, OGG, AVI, MOV, WMV, MKV, or FLV');
      }

      const maxSize = 500 * 1024 * 1024; // 500MB
      if (videoFile.size > maxSize) {
        throw new Error('Video file is too large. Maximum size is 500MB');
      }

      const formData = new FormData();
      formData.append('file', videoFile);

      const response = await api.post(
        `/courses/${courseId}/lessons/${lessonId}/upload-video`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (onUploadProgress && progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onUploadProgress(progress);
            }
          },
          timeout: UPLOAD_TIMEOUT
        }
      );

      toast.success('Video uploaded successfully!');
      return response.data;
    } catch (error) {
      console.error('Error uploading video:', error);

      if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timeout. Please try again with a smaller file.');
      }

      handleApiError(error);
      throw error;
    }
  },

  // QUIZ MANAGEMENT - Enhanced with comprehensive validation

  async getQuizzes(courseId) {
    try {
      const response = await api.get(`/courses/${courseId}/quizzes`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      handleApiError(error);
      throw error;
    }
  },

  async getQuiz(courseId, quizId) {
    try {
      const response = await api.get(`/courses/${courseId}/quizzes/${quizId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz:', error);
      handleApiError(error);
      throw error;
    }
  },

  // Enhanced quiz creation with comprehensive validation
  async createQuiz(courseId, quizData) {
    try {
      // Validate required fields
      if (!quizData.title || !quizData.title.trim()) {
        throw new Error('Quiz title is required');
      }

      if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
        throw new Error('At least one question is required');
      }

      // Validate each question thoroughly
      quizData.questions.forEach((question, index) => {
        if (!question.question || !question.question.trim()) {
          throw new Error(`Question ${index + 1} text is required`);
        }

        if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
          throw new Error(`Question ${index + 1} must have at least 2 options`);
        }

        // Remove empty options
        const validOptions = question.options.filter(opt => opt && opt.trim());
        if (validOptions.length < 2) {
          throw new Error(`Question ${index + 1} must have at least 2 valid options`);
        }

        if (!question.correct_answer || !question.correct_answer.trim()) {
          throw new Error(`Question ${index + 1} must have a correct answer selected`);
        }

        if (!validOptions.includes(question.correct_answer)) {
          throw new Error(`Question ${index + 1} correct answer must be one of the valid options`);
        }
      });

      // Clean and validate the data before sending
      const cleanedData = {
        title: quizData.title.trim(),
        description: quizData.description?.trim() || '',
        instructions: quizData.instructions?.trim() || '',
        questions: quizData.questions.map((q, index) => {
          const validOptions = q.options.filter(opt => opt && opt.trim()).map(opt => opt.trim());
          return {
            question: q.question.trim(),
            type: q.type || 'multiple_choice',
            options: validOptions,
            correct_answer: q.correct_answer.trim(),
            explanation: q.explanation?.trim() || '',
            topic: q.topic?.trim() || 'General',
            points: parseInt(q.points) || 1,
            difficulty: q.difficulty || 'medium'
          };
        }),
        total_points: parseInt(quizData.total_points) || quizData.questions.reduce((sum, q) => sum + (parseInt(q.points) || 1), 0),
        time_limit_minutes: parseInt(quizData.time_limit_minutes) || 30,
        passing_score: parseInt(quizData.passing_score) || 70,
        attempts_allowed: parseInt(quizData.attempts_allowed) || 3,
        randomize_questions: Boolean(quizData.randomize_questions),
        randomize_answers: Boolean(quizData.randomize_answers),
        show_correct_answers: Boolean(quizData.show_correct_answers !== false), // Default true
        is_mandatory: Boolean(quizData.is_mandatory)
      };

      // Additional validation
      if (cleanedData.passing_score < 0 || cleanedData.passing_score > 100) {
        throw new Error('Passing score must be between 0 and 100');
      }

      if (cleanedData.attempts_allowed < 1) {
        throw new Error('At least 1 attempt must be allowed');
      }

      if (cleanedData.time_limit_minutes < 1) {
        throw new Error('Time limit must be at least 1 minute');
      }

      const response = await api.post(`/courses/${courseId}/quizzes`, cleanedData);
      toast.success('Quiz created successfully!');
      return response.data;
    } catch (error) {
      console.error('Error creating quiz:', error);
      handleApiError(error);
      throw error;
    }
  },

  async updateQuiz(courseId, quizId, quizData) {
    try {
      // Similar validation as create quiz
      if (quizData.title !== undefined && (!quizData.title || !quizData.title.trim())) {
        throw new Error('Quiz title cannot be empty');
      }

      if (quizData.questions !== undefined) {
        if (!Array.isArray(quizData.questions) || quizData.questions.length === 0) {
          throw new Error('At least one question is required');
        }

        // Validate each question
        quizData.questions.forEach((question, index) => {
          if (!question.question || !question.question.trim()) {
            throw new Error(`Question ${index + 1} text is required`);
          }

          if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
            throw new Error(`Question ${index + 1} must have at least 2 options`);
          }

          const validOptions = question.options.filter(opt => opt && opt.trim());
          if (validOptions.length < 2) {
            throw new Error(`Question ${index + 1} must have at least 2 valid options`);
          }

          if (!question.correct_answer || !validOptions.includes(question.correct_answer)) {
            throw new Error(`Question ${index + 1} correct answer must be one of the valid options`);
          }
        });
      }

      // Clean the data
      const cleanedData = {};

      if (quizData.title !== undefined) cleanedData.title = quizData.title.trim();
      if (quizData.description !== undefined) cleanedData.description = quizData.description?.trim() || '';
      if (quizData.instructions !== undefined) cleanedData.instructions = quizData.instructions?.trim() || '';
      if (quizData.questions !== undefined) {
        cleanedData.questions = quizData.questions.map(q => {
          const validOptions = q.options.filter(opt => opt && opt.trim()).map(opt => opt.trim());
          return {
            question: q.question.trim(),
            type: q.type || 'multiple_choice',
            options: validOptions,
            correct_answer: q.correct_answer.trim(),
            explanation: q.explanation?.trim() || '',
            topic: q.topic?.trim() || 'General',
            points: parseInt(q.points) || 1,
            difficulty: q.difficulty || 'medium'
          };
        });
      }
      if (quizData.total_points !== undefined) cleanedData.total_points = parseInt(quizData.total_points) || 0;
      if (quizData.time_limit_minutes !== undefined) cleanedData.time_limit_minutes = parseInt(quizData.time_limit_minutes) || 30;
      if (quizData.passing_score !== undefined) cleanedData.passing_score = parseInt(quizData.passing_score) || 70;
      if (quizData.attempts_allowed !== undefined) cleanedData.attempts_allowed = parseInt(quizData.attempts_allowed) || 3;
      if (quizData.randomize_questions !== undefined) cleanedData.randomize_questions = Boolean(quizData.randomize_questions);
      if (quizData.randomize_answers !== undefined) cleanedData.randomize_answers = Boolean(quizData.randomize_answers);
      if (quizData.show_correct_answers !== undefined) cleanedData.show_correct_answers = Boolean(quizData.show_correct_answers);
      if (quizData.is_mandatory !== undefined) cleanedData.is_mandatory = Boolean(quizData.is_mandatory);

      const response = await api.put(`/courses/${courseId}/quizzes/${quizId}`, cleanedData);
      toast.success('Quiz updated successfully!');
      return response.data;
    } catch (error) {
      console.error('Error updating quiz:', error);
      handleApiError(error);
      throw error;
    }
  },

  async deleteQuiz(courseId, quizId) {
    try {
      const response = await api.delete(`/courses/${courseId}/quizzes/${quizId}`);
      toast.success('Quiz deleted successfully');
      return response.data;
    } catch (error) {
      console.error('Error deleting quiz:', error);
      handleApiError(error);
      throw error;
    }
  },

  
  // Enhanced quiz attempt with comprehensive validation
  async attemptQuiz(courseId, quizId, answers, timeTaken) {
    try {
      // Validate inputs
      if (!Array.isArray(answers)) {
        throw new Error('Answers must be provided as an array');
      }

      if (typeof timeTaken !== 'number' || timeTaken < 0) {
        throw new Error('Valid time taken must be provided');
      }

      // Clean answers data
      const cleanedAnswers = answers.map((answer, index) => {
        if (typeof answer === 'object' && answer !== null) {
          return {
            question_index: answer.question_index !== undefined ? answer.question_index : index,
            answer: answer.answer || '',
            time_spent: answer.time_spent || 0
          };
        } else {
          return {
            question_index: index,
            answer: answer || '',
            time_spent: 0
          };
        }
      });

      const response = await api.post(`/courses/${courseId}/quizzes/${quizId}/attempt`, {
        answers: cleanedAnswers,
        time_taken_minutes: timeTaken
      });

      // Show appropriate success message based on result
      const result = response.data;
      if (result.is_passed) {
        toast.success(`Quiz completed successfully! Score: ${result.percentage.toFixed(1)}%`);
      } else {
        toast.error(`Quiz completed. Score: ${result.percentage.toFixed(1)}%. You need ${result.quiz_passing_score || 70}% to pass.`);
      }

      return response.data;
    } catch (error) {
      console.error('Error submitting quiz attempt:', error);
      handleApiError(error);
      throw error;
    }
  },

  async getQuizAttempts(courseId, quizId) {
    try {
      const response = await api.get(`/courses/${courseId}/quizzes/${quizId}/attempts`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz attempts:', error);
      handleApiError(error);
      throw error;
    }
  },

  // SEARCH AND FILTERING

  async searchCourses(query, filters = {}) {
    try {
      const params = { q: query, ...filters };
      const response = await api.get('/courses/search', { params });
      return response.data;
    } catch (error) {
      console.error('Error searching courses:', error);
      handleApiError(error);
      throw error;
    }
  },

  // COURSE REVIEWS

  async getCourseReviews(courseId, params = {}) {
    try {
      const response = await api.get(`/courses/${courseId}/reviews`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching course reviews:', error);
      handleApiError(error);
      throw error;
    }
  },

  async addCourseReview(courseId, reviewData) {
    try {
      // Validate review data
      if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const cleanedData = {
        rating: parseInt(reviewData.rating),
        comment: reviewData.comment?.trim() || ''
      };

      const response = await api.post(`/courses/${courseId}/reviews`, cleanedData);
      toast.success('Review added successfully!');
      return response.data;
    } catch (error) {
      console.error('Error adding course review:', error);
      handleApiError(error);
      throw error;
    }
  },

  // UTILITY METHODS

  async getCourseCategories() {
    try {
      const response = await api.get('/courses/categories/list');
      return response.data;
    } catch (error) {
      console.error('Error fetching course categories:', error);
      handleApiError(error);
      throw error;
    }
  },

  async getFeaturedCourses(limit = 10) {
    try {
      const response = await api.get('/courses/featured', { params: { limit } });
      return response.data;
    } catch (error) {
      console.error('Error fetching featured courses:', error);
      handleApiError(error);
      throw error;
    }
  },

  async getPopularCourses(limit = 10) {
    try {
      const response = await api.get('/courses/popular', { params: { limit } });
      return response.data;
    } catch (error) {
      console.error('Error fetching popular courses:', error);
      handleApiError(error);
      throw error;
    }
  },

  async syncEnrollmentState() {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser || currentUser.role !== 'student') {
        return { enrolledCourses: [], allCourses: [] };
      }

      console.log('🔄 Syncing enrollment state...');

      const [enrolledCourses, allCourses] = await Promise.all([
        this.getEnrolledCourses(true), // Force refresh
        this.getCourses(true) // Force refresh
      ]);

      console.log('✅ Enrollment state synced:', {
        enrolledCount: enrolledCourses.length,
        totalCount: allCourses.length,
        enrolledFromAll: allCourses.filter(c => c.is_enrolled).length
      });

      return {
        enrolledCourses,
        allCourses,
        stats: {
          total: allCourses.length,
          enrolled: enrolledCourses.length,
          completed: enrolledCourses.filter(c => c.user_progress >= 100).length,
          inProgress: enrolledCourses.filter(c => c.user_progress > 0 && c.user_progress < 100).length
        }
      };
    } catch (error) {
      console.error('❌ Error syncing enrollment state:', error);
      return { enrolledCourses: [], allCourses: [], stats: { total: 0, enrolled: 0, completed: 0, inProgress: 0 } };
    }
  }
};



// Enhanced Analytics API
const analyticsAPI = {
  async getStudentDashboard() {
    try {
      console.log('🔄 Fetching student dashboard analytics...');
      
      const response = await api.get('/analytics/dashboard');
      const dashboardData = response.data;

      console.log('📊 Student dashboard data:', {
        totalEnrollments: dashboardData.total_enrollments,
        completedCourses: dashboardData.completed_courses,
        currentCourses: dashboardData.current_courses?.length
      });

      return dashboardData;
    } catch (error) {
      console.error('❌ Error fetching student dashboard:', error);
      handleApiError(error);
      throw error;
    }
  },

  async getAdminDashboard() {
    try {
      const response = await api.get('/analytics/admin/dashboard');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching admin dashboard:', error);
      handleApiError(error);
      throw error;
    }
  },

  async updateProgress(courseId, lessonId, watchTime, completed = false) {
    try {
      const response = await api.post('/analytics/update-progress', {
        course_id: parseInt(courseId),
        lesson_id: parseInt(lessonId),
        watch_time_minutes: parseFloat(watchTime) || 0,
        completed: Boolean(completed)
      });

      // If lesson completed, dispatch progress update event
      if (completed) {
        window.dispatchEvent(new CustomEvent('lessonProgressUpdated', {
          detail: {
            courseId: parseInt(courseId),
            lessonId: parseInt(lessonId),
            completed: true
          }
        }));
      }

      return response.data;
    } catch (error) {
      console.error('❌ Error updating progress:', error);
      throw error;
    }
  },

  

  async trackVideoProgress(courseId, lessonId, progressData) {
    try {
      const cleanedData = {
        course_id: parseInt(courseId),
        lesson_id: parseInt(lessonId),
        current_time: parseFloat(progressData.currentTime) || 0,
        duration: parseFloat(progressData.duration) || 0,
        progress_percentage: parseFloat(progressData.progressPercentage) || 0,
        watch_time_seconds: parseFloat(progressData.watchTimeSeconds) || 0,
        completed: Boolean(progressData.completed)
      };

      const response = await api.post('/analytics/video-progress', cleanedData);
      return response.data;
    } catch (error) {
      console.error('Error tracking video progress:', error);
      // Don't show error toast for video progress as it happens very frequently
      throw error;
    }
  },


  async getCourseAnalytics(courseId) {
    try {
      const response = await api.get(`/analytics/admin/course/${courseId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching course analytics:', error);
      handleApiError(error);
      throw error;
    }
  },

  async getStudentAnalytics(studentId) {
    try {
      const response = await api.get(`/analytics/admin/student/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching student analytics:', error);
      handleApiError(error);
      throw error;
    }
  },

  async getEngagementMetrics(timeframe = '7d') {
    try {
      const response = await api.get('/analytics/engagement', { params: { timeframe } });
      return response.data;
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
      handleApiError(error);
      throw error;
    }
  }
};

// Admin API (for user management)
const adminAPI = {
  async getAllUsers(params = {}) {
    try {
      const response = await api.get('/auth/users', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      handleApiError(error);
      throw error;
    }
  },

  async updateUserRole(userId, role) {
    try {
      const response = await api.put(`/admin/users/${userId}/role`, { role });
      toast.success('User role updated successfully');
      return response.data;
    } catch (error) {
      console.error('Error updating user role:', error);
      handleApiError(error);
      throw error;
    }
  },

  async deleteUser(userId) {
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted successfully');
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      handleApiError(error);
      throw error;
    }
  },

  async getUserStats() {
    try {
      const response = await api.get('/admin/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      handleApiError(error);
      throw error;
    }
  }
};

// TOKEN MANAGEMENT UTILITIES

const setAuthToken = (token) => {
  localStorage.setItem('access_token', token);
};

const removeAuthToken = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  localStorage.removeItem('refresh_token');
};

const isAuthenticated = () => {
  const token = localStorage.getItem('access_token');
  if (!token || !token.includes('.')) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    return payload.exp > now;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

const setCurrentUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

// UTILITY FUNCTIONS

const showInfoToast = (message) => {
  toast(message, {
    icon: 'ℹ️',
    style: {
      borderRadius: '10px',
      background: '#3B82F6',
      color: '#fff',
    },
  });
};

const showSuccessToast = (message) => {
  toast.success(message, {
    style: {
      borderRadius: '10px',
      background: '#10B981',
      color: '#fff',
    },
  });
};

const showWarningToast = (message) => {
  toast(message, {
    icon: '⚠️',
    style: {
      borderRadius: '10px',
      background: '#F59E0B',
      color: '#fff',
    },
  });
};

const showErrorToast = (message) => {
  toast.error(message, {
    style: {
      borderRadius: '10px',
      background: '#EF4444',
      color: '#fff',
    },
  });
};

// DATA VALIDATION UTILITIES

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '0 min';

  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);

  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatPercentage = (value, decimals = 1) => {
  if (typeof value !== 'number' || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
};

// CACHE MANAGEMENT

class ApiCache {
  constructor(defaultTTL = 300000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, data, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { data, expiresAt });
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }

  delete(key) {
    this.cache.delete(key);
  }
}

const apiCache = new ApiCache();

// DEBOUNCE UTILITY FOR SEARCH

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// RETRY MECHANISM FOR FAILED REQUESTS

const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Don't retry for certain error types
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

const refreshEnrollmentData = async () => {
  try {
    console.log('🔄 Refreshing all enrollment data...');
    
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'student') {
      return null;
    }

    // Clear any cached data and fetch fresh
    const enrollmentData = await courseAPI.syncEnrollmentState();
    
    // Dispatch global refresh event
    window.dispatchEvent(new CustomEvent('enrollmentDataRefreshed', {
      detail: enrollmentData
    }));

    console.log('✅ Enrollment data refreshed globally');
    return enrollmentData;
  } catch (error) {
    console.error('❌ Error refreshing enrollment data:', error);
    return null;
  }
};

// ✅ ENHANCED: Event listener setup for enrollment changes
const setupEnrollmentEventListeners = () => {
  // Listen for enrollment changes
  window.addEventListener('courseEnrollmentChanged', (event) => {
    console.log('📡 Global enrollment change detected:', event.detail);
    
    // Update local storage cache if needed
    const currentUser = getCurrentUser();
    if (currentUser) {
      // Trigger data refresh after a short delay
      setTimeout(() => {
        refreshEnrollmentData();
      }, 500);
    }
  });

  // Listen for lesson progress updates
  window.addEventListener('lessonProgressUpdated', (event) => {
    console.log('📡 Lesson progress updated:', event.detail);
    
    // Trigger dashboard refresh if needed
    setTimeout(() => {
      refreshEnrollmentData();
    }, 1000);
  });
};

// ✅ ENHANCED: Initialize enrollment tracking
const initializeEnrollmentTracking = () => {
  console.log('🚀 Initializing enrollment tracking...');
  setupEnrollmentEventListeners();
};

// ===== 1. ENHANCED API METHODS =====
// Add these to your api.js file

const dynamicQuizAPI = {
  // Question Bank Management
  async addQuestionToLesson(courseId, lessonId, questionData) {
    try {
      const response = await api.post(`/courses/${courseId}/lessons/${lessonId}/questions`, questionData);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  async getQuestionBank(courseId, lessonId, filters = {}) {
    try {
      const response = await api.get(`/dynamic-quiz/questions`, {
        params: { course_id: courseId, lesson_id: lessonId, ...filters }
      });
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Adaptive Quiz Generation
  async generateAdaptiveQuiz(lessonId, totalQuestions = 10) {
    try {
      const response = await api.post('/dynamic-quiz/generate', {
        lesson_id: lessonId,
        total_questions: totalQuestions,
        is_adaptive: true
      });
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  async startAdaptiveQuiz(quizId) {
    try {
      const response = await api.post(`/dynamic-quiz/start/${quizId}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  async getNextQuestion(quizId) {
    try {
      const response = await api.get(`/dynamic-quiz/question/${quizId}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  async submitAnswer(quizId, questionId, answer, timeTaken) {
    try {
      const response = await api.post(`/dynamic-quiz/answer/${quizId}/${questionId}`, {
        selected_answer: answer,
        time_taken_seconds: timeTaken
      });
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  async getQuizResults(quizId) {
    try {
      const response = await api.get(`/dynamic-quiz/results/${quizId}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Student Performance
  async getStudentPerformance(lessonId) {
    try {
      const response = await api.get(`/dynamic-quiz/performance/${lessonId}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  async getCapabilityAssessment(lessonId) {
    try {
      const response = await api.get(`/dynamic-quiz/capability-assessment/${lessonId}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }
};

// ===== 2. ADAPTIVE QUIZ CREATOR COMPONENT =====


const AdaptiveQuizCreator = ({ courseId, lessonId, onClose, onSuccess }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState({
    question_text: '',
    question_type: 'MULTIPLE_CHOICE',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    difficulty_level: 'MEDIUM',
    topic_tags: [],
    estimated_time_seconds: 60,
    points: 1
  });

  const difficultyLevels = [
    { value: 'EASY', label: 'Easy', color: 'green', description: 'Basic concepts, simple recall' },
    { value: 'MEDIUM', label: 'Medium', color: 'blue', description: 'Application of concepts' },
    { value: 'HARD', label: 'Hard', color: 'red', description: 'Complex analysis, synthesis' }
  ];

  const handleAddQuestion = async () => {
    try {
      setLoading(true);
      
      // Validate question
      if (!currentQuestion.question_text.trim()) {
        toast.error('Question text is required');
        return;
      }

      const validOptions = currentQuestion.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        toast.error('At least 2 options are required');
        return;
      }

      if (!currentQuestion.correct_answer) {
        toast.error('Please select the correct answer');
        return;
      }

      // Format question data
      const questionData = {
        ...currentQuestion,
        options: validOptions,
        topic_tags: currentQuestion.topic_tags.filter(tag => tag.trim())
      };

      await dynamicQuizAPI.addQuestionToLesson(courseId, lessonId, questionData);
      
      // Reset form
      setCurrentQuestion({
        question_text: '',
        question_type: 'MULTIPLE_CHOICE',
        options: ['', '', '', ''],
        correct_answer: '',
        explanation: '',
        difficulty_level: 'MEDIUM',
        topic_tags: [],
        estimated_time_seconds: 60,
        points: 1
      });

      toast.success('Question added to adaptive bank!');
      loadQuestions();
      
    } catch (error) {
      console.error('Error adding question:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = (async () => {
    try {
      const data = await dynamicQuizAPI.getQuestionBank(courseId, lessonId);
      setQuestions(data);
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    loadQuestions();
  }, [courseId, lessonId,loadQuestions]);

  const updateOption = (index, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const addOption = () => {
    if (currentQuestion.options.length < 6) {
      setCurrentQuestion({
        ...currentQuestion,
        options: [...currentQuestion.options, '']
      });
    }
  };

  const removeOption = (index) => {
    if (currentQuestion.options.length > 2) {
      const newOptions = currentQuestion.options.filter((_, i) => i !== index);
      setCurrentQuestion({
        ...currentQuestion,
        options: newOptions,
        correct_answer: newOptions.includes(currentQuestion.correct_answer) 
          ? currentQuestion.correct_answer 
          : ''
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <Brain className="h-6 w-6 mr-2" />
                Adaptive Quiz Creator
              </h2>
              <p className="text-blue-100 mt-1">Create intelligent questions that adapt to student capabilities</p>
            </div>
            <button onClick={onClose} className="text-blue-100 hover:text-white">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Question Bank Status */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Question Bank Status</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              {difficultyLevels.map(level => {
                const count = questions.filter(q => q.difficulty_level === level.value).length;
                return (
                  <div key={level.value} className="bg-white p-3 rounded-lg">
                    <div className={`text-2xl font-bold text-${level.color}-600`}>{count}</div>
                    <div className="text-sm text-gray-600">{level.label} Questions</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question Form */}
          <div className="space-y-6">
            {/* Question Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text *
              </label>
              <textarea
                value={currentQuestion.question_text}
                onChange={(e) => setCurrentQuestion({...currentQuestion, question_text: e.target.value})}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your adaptive question here..."
              />
            </div>

            {/* Difficulty and Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level *
                </label>
                <select
                  value={currentQuestion.difficulty_level}
                  onChange={(e) => setCurrentQuestion({...currentQuestion, difficulty_level: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {difficultyLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label} - {level.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Time (seconds)
                </label>
                <input
                  type="number"
                  value={currentQuestion.estimated_time_seconds}
                  onChange={(e) => setCurrentQuestion({...currentQuestion, estimated_time_seconds: parseInt(e.target.value)})}
                  min="10"
                  max="300"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points
                </label>
                <input
                  type="number"
                  value={currentQuestion.points}
                  onChange={(e) => setCurrentQuestion({...currentQuestion, points: parseInt(e.target.value)})}
                  min="1"
                  max="10"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Options */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Answer Options *
                </label>
                <button
                  type="button"
                  onClick={addOption}
                  disabled={currentQuestion.options.length >= 6}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  <Plus className="h-4 w-4 inline mr-1" />
                  Add Option
                </button>
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={currentQuestion.correct_answer === option}
                      onChange={() => setCurrentQuestion({...currentQuestion, correct_answer: option})}
                      disabled={!option.trim()}
                      className="text-blue-600"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {currentQuestion.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Topic Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic Tags (comma-separated)
              </label>
              <input
                type="text"
                value={currentQuestion.topic_tags.join(', ')}
                onChange={(e) => setCurrentQuestion({
                  ...currentQuestion,
                  topic_tags: e.target.value.split(',').map(tag => tag.trim())
                })}
                placeholder="e.g., variables, functions, loops"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explanation (Optional)
              </label>
              <textarea
                value={currentQuestion.explanation}
                onChange={(e) => setCurrentQuestion({...currentQuestion, explanation: e.target.value})}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Explain why this is the correct answer..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuestion}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Add Question
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== 3. ADAPTIVE QUIZ TAKING COMPONENT =====
const AdaptiveQuizTaker = ({ lessonId, courseId, onComplete }) => {
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [results, setResults] = useState(null);
  const [capability, setCapability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [adaptiveChanges, setAdaptiveChanges] = useState(0);

  // Generate adaptive quiz
  const generateQuiz = async () => {
    try {
      setLoading(true);
      
      // Get student capability first
      const capabilityData = await dynamicQuizAPI.getCapabilityAssessment(lessonId);
      setCapability(capabilityData);
      
      // Generate adaptive quiz
      const quizData = await dynamicQuizAPI.generateAdaptiveQuiz(lessonId, 10);
      setQuiz(quizData);
      
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast.error('Failed to generate adaptive quiz');
    } finally {
      setLoading(false);
    }
  };

  // Start the quiz
  const startQuiz = async () => {
    try {
      await dynamicQuizAPI.startAdaptiveQuiz(quiz.id);
      setQuizStarted(true);
      await getNextQuestion();
    } catch (error) {
      console.error('Error starting quiz:', error);
      toast.error('Failed to start quiz');
    }
  };

  // Get next question
  const getNextQuestion = async () => {
    try {
      const questionData = await dynamicQuizAPI.getNextQuestion(quiz.id);
      if (questionData) {
        setCurrentQuestion(questionData);
        setSelectedAnswer('');
        setQuestionStartTime(Date.now());
      } else {
        // Quiz completed
        await completeQuiz();
      }
    } catch (error) {
      console.error('Error getting next question:', error);
      toast.error('Failed to load next question');
    }
  };

  // Submit answer
  const submitAnswer = async () => {
    if (!selectedAnswer) {
      toast.error('Please select an answer');
      return;
    }

    try {
      const timeTaken = (Date.now() - questionStartTime) / 1000;
      const result = await dynamicQuizAPI.submitAnswer(
        quiz.id,
        currentQuestion.id,
        selectedAnswer,
        timeTaken
      );

      // Check if quiz is completed
      if (result.quiz_completed) {
        setResults(result.final_results);
        setQuizCompleted(true);
      } else {
        // Track adaptive changes
        if (result.adaptive_change_made) {
          setAdaptiveChanges(prev => prev + 1);
          toast.info('📊 Quiz difficulty adapted to your performance!', {
            duration: 2000,
          });
        }
        
        // Show feedback briefly
        if (result.is_correct) {
          toast.success('Correct! 🎉', { duration: 1500 });
        } else {
          toast.error('Incorrect. Keep trying! 💪', { duration: 1500 });
        }
        
        // Load next question after a brief delay
        setTimeout(() => {
          getNextQuestion();
        }, 1500);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Failed to submit answer');
    }
  };

  // Complete quiz
  const completeQuiz = async () => {
    try {
      const finalResults = await dynamicQuizAPI.getQuizResults(quiz.id);
      setResults(finalResults);
      setQuizCompleted(true);
    } catch (error) {
      console.error('Error completing quiz:', error);
    }
  };

  useEffect(() => {
    generateQuiz();
  }, [lessonId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Generating your personalized adaptive quiz...</p>
        </div>
      </div>
    );
  }

  if (quizCompleted && results) {
    return <AdaptiveQuizResults results={results} quiz={quiz} capability={capability} onComplete={onComplete} />;
  }

  if (!quizStarted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Adaptive Quiz Ready</h2>
            <p className="text-gray-600">This quiz will adapt to your learning level in real-time</p>
          </div>

          {/* Capability Assessment */}
          {capability && (
            <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Your Current Level: {capability.current_capability}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Mastery Score:</span>
                  <span className="font-semibold ml-2">{capability.mastery_score?.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-blue-700">Confidence:</span>
                  <span className="font-semibold ml-2">{(capability.confidence_level * 100)?.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Quiz Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{quiz?.total_questions}</div>
              <div className="text-sm text-gray-600">Questions</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{quiz?.time_limit_minutes}</div>
              <div className="text-sm text-gray-600">Minutes</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                <Zap className="h-6 w-6 mx-auto" />
              </div>
              <div className="text-sm text-gray-600">Adaptive</div>
            </div>
          </div>

          {/* Adaptive Features */}
          <div className="mb-8 p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-900 mb-2">🧠 Adaptive Features:</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Questions adapt to your performance in real-time</li>
              <li>• Difficulty increases when you're doing well</li>
              <li>• Extra support when you need it</li>
              <li>• Personalized learning insights at the end</li>
            </ul>
          </div>

          {/* Start Button */}
          <div className="text-center">
            <button
              onClick={startQuiz}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-lg shadow-lg"
            >
              Start Adaptive Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading next question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Question {currentQuestion.question_number} of {currentQuestion.total_questions}
            </h3>
            <p className="text-sm text-gray-600">
              Difficulty: <span className={`font-medium ${
                currentQuestion.difficulty === 'easy' ? 'text-green-600' :
                currentQuestion.difficulty === 'medium' ? 'text-blue-600' :
                'text-red-600'
              }`}>
                {currentQuestion.difficulty}
              </span>
            </p>
          </div>
          
          {adaptiveChanges > 0 && (
            <div className="text-right">
              <div className="text-sm text-purple-600 font-medium">
                🧠 {adaptiveChanges} Adaptations Made
              </div>
              <div className="text-xs text-gray-500">Quiz is learning from you!</div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(currentQuestion.question_number / currentQuestion.total_questions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
            {currentQuestion.question}
          </h2>

          {/* Answer Options */}
          <div className="space-y-4">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const optionLetter = String.fromCharCode(65 + index);
              
              return (
                <label
                  key={index}
                  className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full border-2 mr-4 flex items-center justify-center font-bold ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-500 text-white' 
                      : 'border-gray-300'
                  }`}>
                    {isSelected ? '✓' : optionLetter}
                  </div>
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={isSelected}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    className="sr-only"
                  />
                  <span className={`text-lg ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-900'}`}>
                    {option}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            onClick={submitAnswer}
            disabled={!selectedAnswer}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Submit Answer
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== 4. ADAPTIVE QUIZ RESULTS COMPONENT =====
const AdaptiveQuizResults = ({ results, quiz, capability, onComplete }) => {
  const getCapabilityChange = () => {
    if (!results.ending_capability || !results.starting_capability) return null;
    
    const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
    const startIndex = levels.indexOf(results.starting_capability);
    const endIndex = levels.indexOf(results.ending_capability);
    
    if (endIndex > startIndex) {
      return { type: 'improvement', message: 'Level Up! 🎉' };
    } else if (endIndex < startIndex) {
      return { type: 'decline', message: 'Needs Review 📚' };
    }
    return { type: 'stable', message: 'Consistent Performance ✅' };
  };

  const capabilityChange = getCapabilityChange();

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8 text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
          <Brain className="h-12 w-12 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Adaptive Quiz Complete!</h1>
        <p className="text-gray-600 mb-6">AI-powered analysis of your performance</p>
        
        {/* Score Display */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{results.final_score?.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Final Score</div>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{results.questions_answered}</div>
            <div className="text-sm text-gray-600">Questions Answered</div>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{results.adaptive_changes_made || 0}</div>
            <div className="text-sm text-gray-600">Adaptations Made</div>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="text-3xl font-bold text-yellow-600">
              {results.ending_capability || results.starting_capability}
            </div>
            <div className="text-sm text-gray-600">Current Level</div>
          </div>
        </div>
      </div>

      {/* Capability Assessment */}
      {capabilityChange && (
        <div className={`p-6 rounded-lg mb-8 ${
          capabilityChange.type === 'improvement' ? 'bg-green-50 border border-green-200' :
          capabilityChange.type === 'decline' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <h3 className="font-semibold mb-2 flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Learning Progress: {capabilityChange.message}
          </h3>
          <p className="text-sm">
            Started as: <strong>{results.starting_capability}</strong> → 
            Finished as: <strong>{results.ending_capability}</strong>
          </p>
        </div>
      )}

      {/* AI Insights */}
      {results.learning_insights && results.learning_insights.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-600" />
            AI Learning Insights
          </h3>
          <div className="space-y-3">
            {results.learning_insights.map((insight, index) => (
              <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Breakdown */}
      {results.difficulty_breakdown && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Difficulty</h3>
          <div className="space-y-4">
            {Object.entries(results.difficulty_breakdown).map(([difficulty, data]) => (
              <div key={difficulty} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className={`w-3 h-3 rounded-full mr-3 ${
                    difficulty === 'easy' ? 'bg-green-500' :
                    difficulty === 'medium' ? 'bg-blue-500' :
                    'bg-red-500'
                  }`}></span>
                  <span className="font-medium capitalize">{difficulty}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{data.correct}/{data.attempted}</div>
                  <div className="text-sm text-gray-600">{data.accuracy?.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={onComplete}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Continue Learning
        </button>
      </div>
    </div>
  );
};

// ===== 5. INTEGRATION WITH LESSON COMPONENT =====
const LessonWithAdaptiveQuiz = ({ lesson, courseId, user }) => {
  const [showAdaptiveQuiz, setShowAdaptiveQuiz] = useState(false);
  const [showQuizCreator, setShowQuizCreator] = useState(false);

  return (
    <div className="lesson-content">
      {/* Regular lesson content */}
      
      {/* Adaptive Quiz Section */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              Adaptive Quiz
            </h3>
            <p className="text-sm text-gray-600">Test your knowledge with AI-powered questions</p>
          </div>
          
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowQuizCreator(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4 inline mr-1" />
              Add Questions
            </button>
          )}
        </div>

        {user?.role === 'student' ? (
          <button
            onClick={() => setShowAdaptiveQuiz(true)}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium flex items-center justify-center"
          >
            <Zap className="h-5 w-5 mr-2" />
            Take Adaptive Quiz
          </button>
        ) : (
          <div className="text-center py-4 text-gray-600">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Students can take adaptive quizzes here</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdaptiveQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">Adaptive Quiz</h2>
              <button
                onClick={() => setShowAdaptiveQuiz(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <AdaptiveQuizTaker
              lessonId={lesson.id}
              courseId={courseId}
              onComplete={() => setShowAdaptiveQuiz(false)}
            />
          </div>
        </div>
      )}

      {showQuizCreator && (
        <AdaptiveQuizCreator
          courseId={courseId}
          lessonId={lesson.id}
          onClose={() => setShowQuizCreator(false)}
          onSuccess={() => {
            setShowQuizCreator(false);
            toast.success('Questions added to adaptive quiz bank!');
          }}
        />
      )}
    </div>
  );
};

// ===== 6. ENHANCED STUDENT PERFORMANCE DASHBOARD =====
const StudentPerformanceDashboard = ({ studentId, courseId }) => {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPerformanceData = async () => {
      try {
        const data = await dynamicQuizAPI.getStudentPerformance(courseId);
        setPerformance(data);
      } catch (error) {
        console.error('Error loading performance data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPerformanceData();
  }, [studentId, courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="text-center py-8">
        <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No performance data available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Capability Overview */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Target className="h-5 w-5 mr-2 text-blue-600" />
          Learning Capability Assessment
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{performance.current_capability}</div>
            <div className="text-sm text-gray-600">Current Level</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{performance.mastery_score?.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Mastery Score</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{(performance.confidence_level * 100)?.toFixed(0)}%</div>
            <div className="text-sm text-gray-600">Confidence</div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{performance.learning_velocity?.toFixed(1)}x</div>
            <div className="text-sm text-gray-600">Learning Velocity</div>
          </div>
        </div>
      </div>

      {/* Performance Breakdown */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Difficulty</h3>
        
        <div className="space-y-4">
          {Object.entries(performance.difficulty_breakdown || {}).map(([difficulty, data]) => (
            <div key={difficulty} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium capitalize">{difficulty}</span>
                <span className="text-sm text-gray-600">{data.correct}/{data.attempts}</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    difficulty === 'easy' ? 'bg-green-500' :
                    difficulty === 'medium' ? 'bg-blue-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${data.accuracy}%` }}
                />
              </div>
              
              <div className="text-sm text-gray-600 mt-1">
                Accuracy: {data.accuracy?.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Quiz History */}
      {performance.recent_quiz_history && performance.recent_quiz_history.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Quiz Performance</h3>
          
          <div className="space-y-3">
            {performance.recent_quiz_history.map((quiz, index) => (
              <div key={quiz.quiz_id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Quiz #{quiz.quiz_id}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(quiz.completed_at).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold">{quiz.score?.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">
                    {quiz.questions_answered}/{quiz.total_questions} questions
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Brain className="h-5 w-5 mr-2 text-purple-600" />
          AI Recommendations
        </h3>
        
        <div className="space-y-3">
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <p className="text-blue-800">
              📈 Based on your {performance.current_capability} level, we recommend focusing on 
              {performance.recommended_difficulty} difficulty questions.
            </p>
          </div>
          
          {performance.consistency_score < 0.7 && (
            <div className="p-3 bg-white rounded-lg border border-yellow-200">
              <p className="text-yellow-800">
                🎯 Try to improve consistency by taking regular practice quizzes.
              </p>
            </div>
          )}
          
          {performance.learning_velocity > 1.2 && (
            <div className="p-3 bg-white rounded-lg border border-green-200">
              <p className="text-green-800">
                🚀 You're learning fast! Consider taking on more challenging material.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== 7. ADMIN ANALYTICS DASHBOARD =====
const AdaptiveQuizAnalytics = ({ courseId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        // This would call your analytics API
        const data = await api.get(`/dynamic-quiz/analytics/course/${courseId}`);
        setAnalytics(data.data);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-blue-600">{analytics?.overall_stats?.total_quizzes || 0}</div>
          <div className="text-sm text-gray-600">Total Adaptive Quizzes</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-green-600">{analytics?.overall_stats?.unique_students || 0}</div>
          <div className="text-sm text-gray-600">Active Students</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-purple-600">{analytics?.overall_stats?.average_score?.toFixed(1) || 0}%</div>
          <div className="text-sm text-gray-600">Average Score</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-3xl font-bold text-yellow-600">{analytics?.adaptive_algorithm_stats?.average_adaptations_per_quiz?.toFixed(1) || 0}</div>
          <div className="text-sm text-gray-600">Avg Adaptations</div>
        </div>
      </div>

      {/* Capability Distribution */}
      {analytics?.capability_distribution && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Capability Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.capability_distribution.map((item) => (
              <div key={item.capability} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{item.count}</div>
                <div className="text-sm text-gray-600 capitalize">{item.capability}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Effectiveness */}
      {analytics?.question_effectiveness && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Effectiveness by Difficulty</h3>
          <div className="space-y-4">
            {analytics.question_effectiveness.map((item) => (
              <div key={item.difficulty} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className={`w-4 h-4 rounded-full mr-3 ${
                    item.difficulty === 'easy' ? 'bg-green-500' :
                    item.difficulty === 'medium' ? 'bg-blue-500' :
                    'bg-red-500'
                  }`}></span>
                  <span className="font-medium capitalize">{item.difficulty}</span>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold">{item.success_rate}% Success Rate</div>
                  <div className="text-sm text-gray-600">{item.total_attempts} attempts</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced lesson handling for course viewer
const handleLessonClick = (lesson, courseId, navigate, user) => {
  // Check if user is enrolled or is admin
  const canAccess = user?.role === 'admin' || lesson.is_preview || 
                   (user && lesson.course_enrolled);

  if (!canAccess) {
    toast.error('Please enroll in the course to access this lesson');
    return;
  }

  // Navigate to lesson viewer
  navigate(`/course/${courseId}/lesson/${lesson.id}`);
};

// Enhanced quiz result processing
const processQuizResults = (lesson, answers) => {
  if (!lesson.quiz_data?.questions) {
    return null;
  }

  const questions = lesson.quiz_data.questions;
  let correctAnswers = 0;
  const detailedResults = [];

  questions.forEach((question, index) => {
    const userAnswer = answers[index]?.answer;
    const isCorrect = userAnswer === question.correct_answer;
    
    if (isCorrect) {
      correctAnswers++;
    }

    detailedResults.push({
      question: question.question,
      user_answer: userAnswer,
      correct_answer: question.correct_answer,
      is_correct: isCorrect,
      explanation: question.explanation || '',
      points: question.points || 1
    });
  });

  const totalQuestions = questions.length;
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
  const earnedPoints = detailedResults
    .filter(r => r.is_correct)
    .reduce((sum, r) => sum + r.points, 0);
  
  const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const passingScore = lesson.quiz_data.passing_score || 70;
  const isPassed = percentage >= passingScore;

  return {
    score: correctAnswers,
    max_score: totalQuestions,
    points_earned: earnedPoints,
    total_points: totalPoints,
    percentage: percentage,
    is_passed: isPassed,
    passing_score: passingScore,
    detailed_results: {
      questions: detailedResults,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      weak_areas: detailedResults
        .filter(r => !r.is_correct)
        .map(r => `Question: "${r.question.substring(0, 50)}..."`)
        .slice(0, 3),
      recommendations: isPassed 
        ? ['Great job! Continue with the next lesson.']
        : [
            'Review the incorrect answers and their explanations.',
            'Study the course materials again before retaking.',
            'Focus on the areas where you had difficulty.'
          ]
    }
  };
};

// Enhanced enrollment checking for lessons
const checkLessonAccess = (lesson, user, course) => {
  // Admin can access everything
  if (user?.role === 'admin') {
    return { canAccess: true, reason: 'admin' };
  }

  // Preview lessons are accessible to everyone
  if (lesson.is_preview) {
    return { canAccess: true, reason: 'preview' };
  }

  // Check if user is enrolled
  const isEnrolled = course?.is_enrolled || false;
  
  if (!isEnrolled) {
    return { 
      canAccess: false, 
      reason: 'not_enrolled',
      message: 'Please enroll in the course to access this lesson'
    };
  }

  // Check if lesson is unlocked (based on previous lessons completion)
  // This would require additional logic based on your course structure
  
  return { canAccess: true, reason: 'enrolled' };
};



// EXPORT DEFAULT API INSTANCE
export default api;

// MAIN EXPORTS - Complete with all utilities
export {
  api,
  authAPI,
  courseAPI,
  analyticsAPI,
  adminAPI,
  getCurrentUser,
  handleApiError,
  handleFormSubmissionError,
  extractCourseId,
  validateLessonData,
  validateCourseData,
  setAuthToken,
  removeAuthToken,
  isAuthenticated,
  setCurrentUser,
  showInfoToast,
  showSuccessToast,
  showWarningToast,
  showErrorToast,
  validateEmail,
  validatePassword,
  validateUrl,
  formatDuration,
  formatFileSize,
  formatPercentage,
  apiCache,
  debounce,
  retryRequest,
  dynamicQuizAPI,
  AdaptiveQuizCreator,
  AdaptiveQuizTaker,
  AdaptiveQuizResults,
  LessonWithAdaptiveQuiz,
  StudentPerformanceDashboard,
  AdaptiveQuizAnalytics,
  handleLessonClick,
  processQuizResults,
  checkLessonAccess
};