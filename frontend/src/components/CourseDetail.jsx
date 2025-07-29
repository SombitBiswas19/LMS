// ENHANCED CourseDetail.jsx with complete functionality and UI improvements

import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { courseAPI, handleApiError } from "../services/api";
import { toast } from "react-hot-toast";

import LoadingSpinner from "./LoadingSpinner";
import ErrorFallback from "./ErrorFallback";
import {
  BookOpen,
  ChevronRight,
  Clock,
  BarChart,
  CheckCircle,
  Lock,
  PlayCircle,
  Users,
  Star,
  Video,
  FileText,
  Award,
  Calendar,
  DollarSign,
  Globe,
  Target,
  AlertCircle,
  BookMarked,
  Download,
  Share2,
  Heart,
  RefreshCw,
  Settings,
  TrendingUp,
  MessageCircle,
  ThumbsUp,
  Shield,
  Zap,
  BookOpenCheck,
  GraduationCap,
  Timer,
  Eye,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const CourseDetail = ({ user }) => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  // Enhanced state management
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [enrollmentStatus, setEnrollmentStatus] = useState({
    isEnrolled: false,
    progress: 0,
    enrollment: null,
  });
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSyllabus, setExpandedSyllabus] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  // In CourseDetail.jsx, add this useEffect:
  useEffect(() => {
    console.log("🔄 Enrollment Status Changed:", {
      isEnrolled: enrollmentStatus.isEnrolled,
      courseEnrolled: course?.is_enrolled,
      timestamp: new Date().toISOString(),
    });
  }, [enrollmentStatus.isEnrolled, course?.is_enrolled]);

  // Enhanced course data fetching with proper enrollment handling
  const fetchCourseDetails = useCallback(
    async (forceRefresh = false) => {
      try {
        setLoading(true);
        setError(null);

        console.log(
          `🔄 Fetching course ${courseId} details (forceRefresh: ${forceRefresh})`
        );

        // Fetch course details with enrollment data
        const courseData = await courseAPI.getCourse(courseId, forceRefresh);

        // Set enrollment status from course data
        if (user?.role === "student") {
          const newEnrollmentStatus = {
            isEnrolled: courseData.is_enrolled || false,
            progress: courseData.user_progress || 0,
            enrollment: courseData.enrollment_data || null,
            status: courseData.enrollment_status || "not_enrolled",
            lastAccessed: courseData.last_accessed,
            enrolledAt: courseData.enrolled_at,
            completedLessons: courseData.completed_lessons || [],
            completedQuizzes: courseData.completed_quizzes || [],
          };

          console.log(`📊 Setting enrollment status:`, newEnrollmentStatus);
          setEnrollmentStatus((prevStatus) => {
            if (prevStatus.isEnrolled && !newEnrollmentStatus.isEnrolled) {
              console.warn("⚠️ Preventing enrollment status override");
              return prevStatus; // Keep existing enrolled state
            }
            return newEnrollmentStatus;
          });
        }
        setCourse(courseData);

        // Fetch lessons and quizzes
        try {
          const lessonsData = await courseAPI.getLessons(courseId);
          setLessons(Array.isArray(lessonsData) ? lessonsData : []);
        } catch (lessonError) {
          console.warn("Failed to fetch lessons:", lessonError);
          setLessons([]);
        }

        try {
          const quizzesData = await courseAPI.getQuizzes(courseId);
          setQuizzes(Array.isArray(quizzesData) ? quizzesData : []);
        } catch (quizError) {
          console.warn("Failed to fetch quizzes:", quizError);
          setQuizzes([]);
        }

        // Fetch reviews
        try {
          const reviewsData = await courseAPI.getCourseReviews(courseId);
          setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        } catch (reviewError) {
          console.warn("Failed to fetch reviews:", reviewError);
          setReviews([]);
        }
      } catch (err) {
        console.error("Error fetching course details:", err);
        handleApiError(err);
        setError(err);
        setLessons([]);
        setQuizzes([]);
        setReviews([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [courseId, user?.role]
  );

  // Line 89-145: Update handleEnroll function
  const handleEnroll = async () => {
    if (!user) {
      toast.error("Please login to enroll in courses");
      navigate("/login");
      return;
    }

    if (enrolling) return;
    setEnrolling(true);

    try {
      console.log(`🎓 Starting enrollment for course ${courseId}`);
      const result = await courseAPI.enrollCourse(courseId);

      // ✅ CRITICAL FIX: Update local state immediately
      const newEnrollmentStatus = {
        isEnrolled: true,
        progress: 0,
        enrollment: result.enrollment_data || {
          enrolled_at: new Date().toISOString(),
        },
        status: "active",
        lastAccessed: null,
        enrolledAt: new Date().toISOString(),
        completedLessons: [],
        completedQuizzes: [],
      };

      setEnrollmentStatus(newEnrollmentStatus);

      // ✅ Update course state
      setCourse((prevCourse) => ({
        ...prevCourse,
        is_enrolled: true,
        user_progress: 0,
        enrollment_data: newEnrollmentStatus.enrollment,
        enrollment_count: (prevCourse.enrollment_count || 0) + 1,
      }));

      toast.success(`🎉 Successfully enrolled in "${course?.title}"!`);

      // Optional: Refresh in background
      setTimeout(() => fetchCourseDetails(true), 1000);
    } catch (err) {
      console.error("❌ Enrollment failed:", err);
      handleApiError(err);
    } finally {
      setEnrolling(false);
    }
  };

  // Enhanced unenrollment handler
  const handleUnenroll = async () => {
    if (
      !window.confirm(
        "Are you sure you want to unenroll from this course? You will lose all progress."
      )
    ) {
      return;
    }

    if (unenrolling) return;

    setUnenrolling(true);
    try {
      console.log(`🚫 Starting unenrollment process for course ${courseId}`);

      await courseAPI.unenrollCourse(courseId);

      console.log("✅ Unenrollment successful");

      // Immediately update local state
      const newEnrollmentStatus = {
        isEnrolled: false,
        progress: 0,
        enrollment: null,
        status: "not_enrolled",
        lastAccessed: null,
        enrolledAt: null,
        completedLessons: [],
        completedQuizzes: [],
      };

      setEnrollmentStatus(newEnrollmentStatus);

      // Update course state
      setCourse((prevCourse) => ({
        ...prevCourse,
        is_enrolled: false,
        user_progress: 0,
        enrollment_data: null,
        enrollment_status: "not_enrolled",
        enrollment_count: Math.max((prevCourse.enrollment_count || 1) - 1, 0),
      }));

      toast.success("Successfully unenrolled from course");
    } catch (err) {
      console.error("❌ Unenrollment failed:", err);
      handleApiError(err);
    } finally {
      setUnenrolling(false);
    }
  };

  // Enhanced refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCourseDetails(true);
    toast.success("Course data refreshed!");
  };

  // Bookmark handler
  const handleBookmark = async () => {
    if (!user) {
      toast.error("Please login to bookmark courses");
      return;
    }

    try {
      if (bookmarked) {
        await courseAPI.removeBookmark(courseId);
        setBookmarked(false);
        toast.success("Removed from bookmarks");
      } else {
        await courseAPI.addBookmark(courseId);
        setBookmarked(true);
        toast.success("Added to bookmarks");
      }
    } catch (err) {
      handleApiError(err);
    }
  };

  // Share handler
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: course.title,
          text: course.short_description || course.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success("Course link copied to clipboard!");
    }
  };

  // Listen for enrollment changes from other components
  useEffect(() => {
    const handleEnrollmentChange = (event) => {
      if (event.detail.courseId === parseInt(courseId)) {
        console.log("📡 Received enrollment change event:", event.detail);

        setEnrollmentStatus({
          isEnrolled: event.detail.enrolled,
          progress: event.detail.course?.user_progress || 0,
          enrollment: event.detail.course?.enrollment_data || null,
          status:
            event.detail.course?.enrollment_status ||
            (event.detail.enrolled ? "active" : "not_enrolled"),
          completedLessons: event.detail.course?.completed_lessons || [],
          completedQuizzes: event.detail.course?.completed_quizzes || [],
        });

        setCourse((prevCourse) => ({
          ...prevCourse,
          ...event.detail.course,
          is_enrolled: event.detail.enrolled,
        }));
      }
    };

    window.addEventListener("courseEnrollmentChanged", handleEnrollmentChange);

    return () => {
      window.removeEventListener(
        "courseEnrollmentChanged",
        handleEnrollmentChange
      );
    };
  }, [courseId]);

  // Initial data fetch
  useEffect(() => {
    fetchCourseDetails();
  }, [fetchCourseDetails]);

  // Check bookmark status
  useEffect(() => {
    const checkBookmark = async () => {
      if (user && course) {
        try {
          const isBookmarked = await courseAPI.isBookmarked(courseId);
          setBookmarked(isBookmarked);
        } catch (err) {
          console.warn("Failed to check bookmark status:", err);
        }
      }
    };

    checkBookmark();
  }, [courseId, user, course]);

  // Handle lesson start with proper enrollment check
  const handleStartLesson = (lesson) => {
    if (!enrollmentStatus.isEnrolled && user?.role !== "admin") {
      toast.error("Please enroll in the course first");
      return;
    }

    navigate(`/course/${courseId}/lesson/${lesson.id}`);
  };

  // Handle quiz start with proper enrollment check
  const handleStartQuiz = (quiz) => {
    if (!enrollmentStatus.isEnrolled && user?.role !== "admin") {
      toast.error("Please enroll in the course first");
      return;
    }

    navigate(`/course/${courseId}/quiz/${quiz.id}`);
  };

  // Tab component
  const TabButton = ({ id, label, icon: Icon, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
        activeTab === id
          ? "bg-blue-100 text-blue-700"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
      {count !== undefined && (
        <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
          {count}
        </span>
      )}
    </button>
  );

  // Render lesson item
  const renderLesson = (lesson, index) => {
    const isCompleted = (enrollmentStatus.completedLessons || []).includes(lesson.id);
    const isLocked = !enrollmentStatus.isEnrolled && user?.role !== "admin";

    return (
      <div
        key={lesson.id}
        className={`flex items-center p-4 rounded-lg border transition-colors ${
          isLocked
            ? "bg-gray-50 border-gray-200"
            : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer"
        }`}
        onClick={() => !isLocked && handleStartLesson(lesson)}
      >
        <div className="flex-shrink-0 mr-4">
          {isCompleted ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : isLocked ? (
            <Lock className="w-6 h-6 text-gray-400" />
          ) : (
            <PlayCircle className="w-6 h-6 text-blue-500" />
          )}
        </div>

        <div className="flex-grow">
          <div className="flex items-center justify-between">
            <h4
              className={`font-medium ${
                isLocked ? "text-gray-500" : "text-gray-900"
              }`}
            >
              {index + 1}. {lesson.title}
            </h4>
            <div className="flex items-center text-sm text-gray-500">
              {lesson.duration && (
                <>
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{lesson.duration} min</span>
                </>
              )}
            </div>
          </div>
          {lesson.description && (
            <p
              className={`text-sm mt-1 ${
                isLocked ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {lesson.description}
            </p>
          )}
        </div>

        {!isLocked && <ArrowRight className="w-4 h-4 text-gray-400 ml-2" />}
      </div>
    );
  };

  // Around line 400-450, update the enrollment button rendering:
  const renderEnrollmentButton = () => {
    if (loading) {
      return <div>Loading...</div>;
    }

    // ✅ CRITICAL: Use consistent enrollment check
    const isCurrentlyEnrolled =
      enrollmentStatus.isEnrolled || course?.is_enrolled;

    console.log("🔍 Enrollment check:", {
      enrollmentStatus: enrollmentStatus.isEnrolled,
      courseEnrolled: course?.is_enrolled,
      finalDecision: isCurrentlyEnrolled,
    });

    if (isCurrentlyEnrolled) {
      return (
        <button
          disabled
          className="enrolled-btn bg-green-600 text-white px-6 py-3 rounded"
        >
          ✓ Enrolled
        </button>
      );
    }

    return (
      <button
        onClick={handleEnroll}
        disabled={enrolling}
        className="enroll-btn bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded"
      >
        {enrolling ? "Enrolling..." : "Enroll Now"}
      </button>
    );
  };

  // Use this function in your JSX:
  {
    renderEnrollmentButton();
  }

  // Render quiz item
  const renderQuiz = (quiz, index) => {
    const isCompleted = enrollmentStatus.completedQuizzes.includes(quiz.id);
    const isLocked = !enrollmentStatus.isEnrolled && user?.role !== "admin";

    return (
      <div
        key={quiz.id}
        className={`flex items-center p-4 rounded-lg border transition-colors ${
          isLocked
            ? "bg-gray-50 border-gray-200"
            : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer"
        }`}
        onClick={() => !isLocked && handleStartQuiz(quiz)}
      >
        <div className="flex-shrink-0 mr-4">
          {isCompleted ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : isLocked ? (
            <Lock className="w-6 h-6 text-gray-400" />
          ) : (
            <FileText className="w-6 h-6 text-purple-500" />
          )}
        </div>

        <div className="flex-grow">
          <div className="flex items-center justify-between">
            <h4
              className={`font-medium ${
                isLocked ? "text-gray-500" : "text-gray-900"
              }`}
            >
              Quiz {index + 1}: {quiz.title}
            </h4>
            <div className="flex items-center text-sm text-gray-500">
              {quiz.question_count && (
                <>
                  <FileText className="w-4 h-4 mr-1" />
                  <span>{quiz.question_count} questions</span>
                </>
              )}
            </div>
          </div>
          {quiz.description && (
            <p
              className={`text-sm mt-1 ${
                isLocked ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {quiz.description}
            </p>
          )}
        </div>

        {!isLocked && <ArrowRight className="w-4 h-4 text-gray-400 ml-2" />}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="large" message="Loading course details..." />
      </div>
    );
  }

  if (error) {
    return <ErrorFallback error={error} />;
  }

  if (!course) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Course not found
        </h2>
        <Link to="/courses" className="text-blue-600 hover:text-blue-700">
          Back to Courses
        </Link>
      </div>
    );
  }

  // Use local enrollment status
  const isEnrolled = enrollmentStatus.isEnrolled || user?.role === "admin";
  const totalLessons = Array.isArray(lessons) ? lessons.length : 0;
  const totalQuizzes = Array.isArray(quizzes) ? quizzes.length : 0;
  const progress = enrollmentStatus.progress || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black bg-opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="container mx-auto px-4 py-12 relative">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumbs */}
            <nav className="text-sm font-medium text-blue-100 mb-6">
              <Link
                to="/courses"
                className="hover:text-white transition-colors"
              >
                Courses
              </Link>
              <ChevronRight className="inline w-4 h-4 mx-2" />
              <span>{course.title}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                  {course.title}
                </h1>
                <p className="text-xl text-blue-100 mb-6 leading-relaxed">
                  {course.short_description || course.description}
                </p>

                {/* Course Meta */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-blue-100 mb-8">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="truncate">{course.instructor}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>{course.duration_hours} hours</span>
                  </div>
                  <div className="flex items-center">
                    <BarChart className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="capitalize">
                      {course.difficulty_level}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-5 h-5 mr-2 text-yellow-400 fill-current flex-shrink-0" />
                    <span>{course.rating?.toFixed(1) || "N/A"}</span>
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>{course.enrollment_count || 0} students</span>
                  </div>
                  <div className="flex items-center">
                    <Globe className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>{course.language || "English"}</span>
                  </div>
                </div>

                {/* Enhanced Enrollment Status Display */}
                {user?.role === "student" && (
                  <div className="mb-6">
                    {isEnrolled ? (
                      <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-30">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center text-green-300">
                            <CheckCircle className="w-6 h-6 mr-2" />
                            <span className="font-semibold text-lg">
                              Enrolled & Learning
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {Math.round(progress)}%
                            </div>
                            <div className="text-sm text-blue-100">
                              Complete
                            </div>
                          </div>
                        </div>

                        <div className="w-full bg-white bg-opacity-30 rounded-full h-3 mb-4">
                          <div
                            className="bg-gradient-to-r from-green-400 to-blue-400 h-3 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-blue-100">
                              Lessons Completed
                            </div>
                            <div className="font-semibold">
                              {enrollmentStatus.completedLessons?.length || 0} /{" "}
                              {totalLessons}
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-100">
                              Quizzes Completed
                            </div>
                            <div className="font-semibold">
                              {enrollmentStatus.completedQuizzes?.length || 0} /{" "}
                              {totalQuizzes}
                            </div>
                          </div>
                        </div>

                        {enrollmentStatus.enrolledAt && (
                          <div className="mt-4 pt-4 border-t border-white border-opacity-20">
                            <div className="flex items-center justify-between text-sm text-blue-100">
                              <span>
                                Enrolled:{" "}
                                {new Date(
                                  enrollmentStatus.enrolledAt
                                ).toLocaleDateString()}
                              </span>
                              {enrollmentStatus.lastAccessed && (
                                <span>
                                  Last accessed:{" "}
                                  {new Date(
                                    enrollmentStatus.lastAccessed
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-30">
                        <div className="flex items-center mb-4">
                          <AlertCircle className="w-6 h-6 mr-3 text-yellow-300" />
                          <div>
                            <div className="font-semibold text-lg">
                              Ready to Start Learning?
                            </div>
                            <div className="text-blue-100">
                              Join thousands of students already enrolled
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-blue-100">
                          Click "Enroll Now" to begin your learning journey
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons for Mobile */}
                <div className="lg:hidden mb-8">
                  <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-6">
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold mb-2">
                        {course.is_free ? "Free" : `$${course.price}`}
                      </div>
                      {!course.is_free && course.discount_price && (
                        <div className="text-blue-200 line-through text-lg">
                          ${course.discount_price}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {user?.role === "admin" ? (
                        <button
                          onClick={() =>
                            navigate(`/admin/courses/${courseId}/edit`)
                          }
                          className="w-full bg-white text-blue-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                        >
                          <Settings className="w-5 h-5 mr-2" />
                          Manage Course
                        </button>
                      ) : isEnrolled ? (
                        <>
                          <button
                            onClick={() => {
                              if (lessons.length > 0) {
                                handleStartLesson(lessons[0]);
                              } else {
                                toast("No lessons available yet", {
                                  icon: "ℹ️",
                                });
                              }
                            }}
                            className="w-full bg-white text-blue-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                          >
                            <PlayCircle className="w-5 h-5 mr-2" />
                            {progress > 0
                              ? "Continue Learning"
                              : "Start Course"}
                          </button>

                          <button
                            onClick={handleUnenroll}
                            disabled={unenrolling}
                            className="w-full text-sm text-red-300 hover:text-red-100 py-2 px-4 border border-red-300 rounded-lg hover:border-red-100 transition-colors disabled:opacity-50"
                          >
                            {unenrolling ? "Unenrolling..." : "Unenroll"}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleEnroll}
                          disabled={enrolling || !user}
                          className="w-full bg-white text-blue-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                          {enrolling ? (
                            <>
                              <LoadingSpinner size="small" />
                              <span className="ml-2">Enrolling...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-5 h-5 mr-2" />
                              Enroll Now
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Preview/Action Panel - Desktop */}
              <div className="lg:col-span-1 hidden lg:block">
                <div className="sticky top-6">
                  <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-30">
                    {/* Course Preview */}
                    <div className="aspect-video bg-black bg-opacity-50 rounded-lg mb-6 flex items-center justify-center overflow-hidden">
                      {course.preview_video_url ? (
                        <video
                          src={course.preview_video_url}
                          controls
                          className="w-full h-full rounded-lg object-cover"
                          poster={course.thumbnail_url}
                        />
                      ) : course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-center">
                          <PlayCircle className="w-16 h-16 text-white opacity-50 mx-auto mb-2" />
                          <p className="text-white text-sm">Course Preview</p>
                        </div>
                      )}
                    </div>

                    <div className="text-center mb-6">
                      <div className="text-3xl font-bold mb-2">
                        {course.is_free ? "Free" : `$${course.price}`}
                      </div>
                      {!course.is_free && course.discount_price && (
                        <div className="text-blue-200 line-through text-lg">
                          ${course.discount_price}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-3 mb-6">
                      {user?.role === "admin" ? (
                        <button
                          onClick={() =>
                            navigate(`/admin/courses/${courseId}/edit`)
                          }
                          className="w-full bg-white text-blue-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                        >
                          <Settings className="w-5 h-5 mr-2" />
                          Manage Course
                        </button>
                      ) : isEnrolled ? (
                        <>
                          <button
                            onClick={() => {
                              if (lessons.length > 0) {
                                handleStartLesson(lessons[0]);
                              } else {
                                toast("No lessons available yet", {
                                  icon: "ℹ️",
                                });
                              }
                            }}
                            className="w-full bg-white text-blue-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                          >
                            <PlayCircle className="w-5 h-5 mr-2" />
                            {progress > 0
                              ? "Continue Learning"
                              : "Start Course"}
                          </button>

                          <button
                            onClick={handleUnenroll}
                            disabled={unenrolling}
                            className="w-full text-sm text-red-300 hover:text-red-100 py-2 px-4 border border-red-300 rounded-lg hover:border-red-100 transition-colors disabled:opacity-50"
                          >
                            {unenrolling ? "Unenrolling..." : "Unenroll"}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleEnroll}
                          disabled={enrolling || !user}
                          className="w-full bg-white text-blue-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                          {enrolling ? (
                            <>
                              <LoadingSpinner size="small" />
                              <span className="ml-2">Enrolling...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-5 h-5 mr-2" />
                              Enroll Now
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Course Quick Stats */}
                    <div className="space-y-3 text-sm text-blue-100">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <Video className="w-4 h-4 mr-2" />
                          Lessons
                        </span>
                        <span className="font-semibold">{totalLessons}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          Quizzes
                        </span>
                        <span className="font-semibold">{totalQuizzes}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          Duration
                        </span>
                        <span className="font-semibold">
                          {course.duration_hours}h
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <Award className="w-4 h-4 mr-2" />
                          Certificate
                        </span>
                        <span className="font-semibold">
                          {course.has_certificate ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <Globe className="w-4 h-4 mr-2" />
                          Access
                        </span>
                        <span className="font-semibold">Lifetime</span>
                      </div>
                    </div>

                    {/* Social Actions */}
                    <div className="flex space-x-2 mt-6 pt-6 border-t border-white border-opacity-20">
                      <button
                        onClick={handleBookmark}
                        className={`flex-1 py-2 px-3 rounded-lg border border-white border-opacity-30 transition-colors ${
                          bookmarked
                            ? "bg-white bg-opacity-20 text-white"
                            : "text-blue-100 hover:bg-white hover:bg-opacity-10"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 mx-auto ${
                            bookmarked ? "fill-current" : ""
                          }`}
                        />
                      </button>
                      <button
                        onClick={handleShare}
                        className="flex-1 py-2 px-3 rounded-lg border border-white border-opacity-30 text-blue-100 hover:bg-white hover:bg-opacity-10 transition-colors"
                      >
                        <Share2 className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex-1 py-2 px-3 rounded-lg border border-white border-opacity-30 text-blue-100 hover:bg-white hover:bg-opacity-10 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-4 h-4 mx-auto ${
                            refreshing ? "animate-spin" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-lg shadow-sm">
            <TabButton id="overview" label="Overview" icon={BookOpen} />
            <TabButton
              id="syllabus"
              label="Syllabus"
              icon={BookMarked}
              count={totalLessons + totalQuizzes}
            />
            <TabButton id="instructor" label="Instructor" icon={Users} />
            <TabButton
              id="reviews"
              label="Reviews"
              icon={Star}
              count={reviews.length}
            />
            {isEnrolled && (
              <TabButton id="progress" label="My Progress" icon={TrendingUp} />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  {/* Course Description */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      About This Course
                    </h2>
                    <div className="prose max-w-none text-gray-700">
                      <p className="text-lg leading-relaxed mb-4">
                        {course.description}
                      </p>
                    </div>
                  </div>

                  {/* What You'll Learn */}
                  {course.learning_objectives && (
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        What You'll Learn
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {course.learning_objectives.map((objective, index) => (
                          <div key={index} className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{objective}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prerequisites */}
                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Prerequisites
                      </h2>
                      <ul className="space-y-2">
                        {course.prerequisites.map((prereq, index) => (
                          <li key={index} className="flex items-start">
                            <Target className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{prereq}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Course Features */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Course Features
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                        <Video className="w-6 h-6 text-blue-600 mr-3" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {totalLessons}
                          </div>
                          <div className="text-sm text-gray-600">
                            Video Lessons
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                        <FileText className="w-6 h-6 text-purple-600 mr-3" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {totalQuizzes}
                          </div>
                          <div className="text-sm text-gray-600">Quizzes</div>
                        </div>
                      </div>
                      <div className="flex items-center p-3 bg-green-50 rounded-lg">
                        <Award className="w-6 h-6 text-green-600 mr-3" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {course.has_certificate ? "Yes" : "No"}
                          </div>
                          <div className="text-sm text-gray-600">
                            Certificate
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center p-3 bg-orange-50 rounded-lg">
                        <Clock className="w-6 h-6 text-orange-600 mr-3" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {course.duration_hours}h
                          </div>
                          <div className="text-sm text-gray-600">Duration</div>
                        </div>
                      </div>
                      <div className="flex items-center p-3 bg-indigo-50 rounded-lg">
                        <Globe className="w-6 h-6 text-indigo-600 mr-3" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            Lifetime
                          </div>
                          <div className="text-sm text-gray-600">Access</div>
                        </div>
                      </div>
                      <div className="flex items-center p-3 bg-pink-50 rounded-lg">
                        <Users className="w-6 h-6 text-pink-600 mr-3" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {course.enrollment_count || 0}
                          </div>
                          <div className="text-sm text-gray-600">Students</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Syllabus Tab */}
              {activeTab === "syllabus" && (
                <div className="space-y-6">
                  {/* Lessons Section */}
                  {totalLessons > 0 && (
                    <div className="bg-white rounded-lg shadow-sm">
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-bold text-gray-900">
                            Course Lessons
                          </h2>
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {totalLessons} lessons
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="space-y-3">
                          {lessons.map((lesson, index) =>
                            renderLesson(lesson, index)
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quizzes Section */}
                  {totalQuizzes > 0 && (
                    <div className="bg-white rounded-lg shadow-sm">
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-bold text-gray-900">
                            Course Quizzes
                          </h2>
                          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                            {totalQuizzes} quizzes
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="space-y-3">
                          {quizzes.map((quiz, index) =>
                            renderQuiz(quiz, index)
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {totalLessons === 0 && totalQuizzes === 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                      <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Content Coming Soon
                      </h3>
                      <p className="text-gray-600">
                        The course content is being prepared. Check back soon!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Instructor Tab */}
              {activeTab === "instructor" && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Meet Your Instructor
                  </h2>
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {course.instructor?.charAt(0)?.toUpperCase() || "I"}
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {course.instructor}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {course.instructor_bio ||
                          "Experienced instructor passionate about teaching and helping students achieve their learning goals."}
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Courses:</span>
                          <span className="font-semibold ml-2">
                            {course.instructor_course_count || 1}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Students:</span>
                          <span className="font-semibold ml-2">
                            {course.instructor_student_count ||
                              course.enrollment_count ||
                              0}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Rating:</span>
                          <span className="font-semibold ml-2">
                            {course.instructor_rating?.toFixed(1) ||
                              course.rating?.toFixed(1) ||
                              "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Experience:</span>
                          <span className="font-semibold ml-2">
                            {course.instructor_experience || "5+ years"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reviews Tab */}
              {activeTab === "reviews" && (
                <div className="space-y-6">
                  {/* Review Summary */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      Student Reviews
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="text-center">
                        <div className="text-6xl font-bold text-gray-900 mb-2">
                          {course.rating?.toFixed(1) || "N/A"}
                        </div>
                        <div className="flex justify-center mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-6 h-6 ${
                                star <= (course.rating || 0)
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-gray-600">
                          Based on {reviews.length} reviews
                        </div>
                      </div>
                      <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = reviews.filter(
                            (r) => r.rating === rating
                          ).length;
                          const percentage =
                            reviews.length > 0
                              ? (count / reviews.length) * 100
                              : 0;
                          return (
                            <div key={rating} className="flex items-center">
                              <span className="text-sm text-gray-600 w-8">
                                {rating}
                              </span>
                              <Star className="w-4 h-4 text-yellow-400 fill-current mr-2" />
                              <div className="flex-grow bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-yellow-400 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 w-8">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Individual Reviews */}
                  <div className="space-y-4">
                    {reviews.length > 0 ? (
                      reviews.map((review, index) => (
                        <div
                          key={index}
                          className="bg-white rounded-lg shadow-sm p-6"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                                {review.student_name
                                  ?.charAt(0)
                                  ?.toUpperCase() || "S"}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {review.student_name || "Anonymous Student"}
                                </div>
                                <div className="flex items-center">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= review.rating
                                          ? "text-yellow-400 fill-current"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {review.created_at &&
                                new Date(
                                  review.created_at
                                ).toLocaleDateString()}
                            </div>
                          </div>
                          <p className="text-gray-700 leading-relaxed">
                            {review.comment}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No Reviews Yet
                        </h3>
                        <p className="text-gray-600">
                          Be the first to review this course!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Progress Tab */}
              {activeTab === "progress" && isEnrolled && (
                <div className="space-y-6">
                  {/* Progress Overview */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      Your Progress
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {Math.round(progress)}%
                        </div>
                        <div className="text-gray-600">Complete</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {enrollmentStatus.completedLessons?.length || 0}
                        </div>
                        <div className="text-gray-600">Lessons Done</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-3xl font-bold text-purple-600 mb-2">
                          {enrollmentStatus.completedQuizzes?.length || 0}
                        </div>
                        <div className="text-gray-600">Quizzes Done</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Course Progress</span>
                        <span>{Math.round(progress)}% Complete</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-1000"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Activity Timeline */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Recent Activity
                      </h3>
                      <div className="space-y-3">
                        {enrollmentStatus.enrolledAt && (
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <GraduationCap className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                Enrolled in course
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(
                                  enrollmentStatus.enrolledAt
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        )}

                        {enrollmentStatus.lastAccessed && (
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <Eye className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                Last accessed
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(
                                  enrollmentStatus.lastAccessed
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Next Steps */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Continue Learning
                    </h3>
                    {lessons.length > 0 && (
                      <div className="space-y-3">
                        {lessons
                          .filter(
                            (lesson) =>
                              !enrollmentStatus.completedLessons?.includes(
                                lesson.id
                              )
                          )
                          .slice(0, 3)
                          .map((lesson, index) => (
                            <div
                              key={lesson.id}
                              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                              onClick={() => handleStartLesson(lesson)}
                            >
                              <PlayCircle className="w-5 h-5 text-blue-500 mr-3" />
                              <div className="flex-grow">
                                <div className="font-medium text-gray-900">
                                  {lesson.title}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {lesson.duration && `${lesson.duration} min`}
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Course Quick Actions - Mobile */}
              <div className="lg:hidden mb-6">
                <div className="flex space-x-2">
                  <button
                    onClick={handleBookmark}
                    className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                      bookmarked
                        ? "bg-red-50 border-red-200 text-red-600"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 mx-auto ${
                        bookmarked ? "fill-current" : ""
                      }`}
                    />
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 py-2 px-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-colors"
                  >
                    <Share2 className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex-1 py-2 px-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 mx-auto ${
                        refreshing ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Related Courses */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  You May Also Like
                </h3>
                <div className="space-y-4">
                  {/* Placeholder for related courses */}
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Related courses will appear here</p>
                  </div>
                </div>
              </div>

              {/* Course Tags */}
              {course.tags && course.tags.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Course Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Course Statistics */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Course Statistics
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-gray-600">Students Enrolled</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {course.enrollment_count || 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Star className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-gray-600">Average Rating</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {course.rating?.toFixed(1) || "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-gray-600">Last Updated</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {course.updated_at
                        ? new Date(course.updated_at).toLocaleDateString()
                        : "Recently"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Globe className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-gray-600">Language</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {course.language || "English"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      {user?.role === "student" && !isEnrolled && (
        <div className="fixed bottom-6 right-6 lg:hidden z-50">
          <button
            onClick={handleEnroll}
            disabled={enrolling || !user}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center disabled:opacity-50"
          >
            {enrolling ? (
              <>
                <LoadingSpinner size="small" />
                <span className="ml-2">Enrolling...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Enroll Now
              </>
            )}
          </button>
        </div>
      )}

      {/* Success/Enrollment Celebration Modal */}
      {/* This would be implemented as a separate modal component */}
    </div>
  );
};

export default CourseDetail;
