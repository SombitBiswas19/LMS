import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courseAPI, analyticsAPI, handleApiError } from "../services/api";
import { toast } from "react-hot-toast";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  CheckCircle,
  List,
  SkipForward,
  SkipBack,
  Settings,
  MessageCircle,
  Home,
  AlertCircle,
} from "lucide-react";

// Universal Video Player Component - FIXED
const UniversalVideoPlayer = ({ url, title, className = "", onLoad, onError }) => {
  const [videoType, setVideoType] = useState(null);
  const [embedUrl, setEmbedUrl] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setError('No video URL provided');
      setLoading(false);
      onError?.('No video URL provided');
      return;
    }

    try {
      const processedUrl = processVideoUrl(url);
      if (processedUrl.error) {
        setError(processedUrl.error);
        onError?.(processedUrl.error);
      } else {
        setVideoType(processedUrl.type);
        setEmbedUrl(processedUrl.embedUrl);
        setError(null);
        onLoad?.(processedUrl);
      }
    } catch (err) {
      const errorMsg = 'Invalid video URL format';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [url, onLoad, onError]);

  const processVideoUrl = (url) => {
    if (!url) return { error: 'No URL provided' };

    // Clean the URL
    const cleanUrl = url.trim();

    // YouTube URLs - Enhanced regex
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/embed\/)([^"&?\/\s]{11})/;
    const youtubeMatch = cleanUrl.match(youtubeRegex);
    if (youtubeMatch) {
      return {
        type: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=${window.location.origin}`
      };
    }

    // Vimeo URLs - Enhanced
    const vimeoRegex = /(?:vimeo\.com\/)(?:video\/)?(\d+)/;
    const vimeoMatch = cleanUrl.match(vimeoRegex);
    if (vimeoMatch) {
      return {
        type: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=0`
      };
    }

    // Google Drive URLs - Fixed for better compatibility
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
    const driveMatch = cleanUrl.match(driveRegex);
    if (driveMatch) {
      return {
        type: 'drive',
        embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview?embedded=true`
      };
    }

    // Dailymotion URLs
    const dailymotionRegex = /dailymotion\.com\/video\/([^_]+)/;
    const dailymotionMatch = cleanUrl.match(dailymotionRegex);
    if (dailymotionMatch) {
      return {
        type: 'dailymotion',
        embedUrl: `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}`
      };
    }

    // Direct video files (mp4, webm, etc.)
    const videoExtensions = /\.(mp4|webm|ogg|avi|mov|mkv|m4v)(\?.*)?$/i;
    if (videoExtensions.test(cleanUrl)) {
      return {
        type: 'direct',
        embedUrl: cleanUrl
      };
    }

    // Local server files (starting with /)
    if (cleanUrl.startsWith('/')) {
      const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      return {
        type: 'direct',
        embedUrl: `${serverUrl}${cleanUrl}`
      };
    }

    // If it looks like a video URL but we couldn't parse it, try as direct
    if (cleanUrl.startsWith('http')) {
      return {
        type: 'direct',
        embedUrl: cleanUrl
      };
    }

    return { error: 'Unsupported video format' };
  };

  if (loading) {
    return (
      <div className={`bg-black flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-sm">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-black flex items-center justify-center text-white ${className}`}>
        <div className="text-center p-8">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">Video Unavailable</h3>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <p className="text-gray-500 text-xs">
            This lesson may contain text content or other materials
          </p>
        </div>
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div className={`bg-black flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Initializing player...</p>
        </div>
      </div>
    );
  }

  if (videoType === 'direct') {
    return (
      <div className={className}>
        <video 
          className="w-full h-full" 
          controls 
          preload="metadata"
          crossOrigin="anonymous"
          onError={(e) => {
            console.error('Video load error:', e);
            setError('Failed to load video');
            onError?.('Failed to load video');
          }}
        >
          <source src={embedUrl} type="video/mp4" />
          <source src={embedUrl} type="video/webm" />
          <source src={embedUrl} type="video/ogg" />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  return (
    <div className={className}>
      <iframe
        src={embedUrl}
        title={title || 'Video Player'}
        className="w-full h-full border-0"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
        onError={(e) => {
          console.error('Iframe load error:', e);
          setError('Failed to load video player');
          onError?.('Failed to load video player');
        }}
      />
    </div>
  );
};

const VideoPlayer = ({ user }) => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  // State variables
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoError, setVideoError] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [watchTime, setWatchTime] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);

  // Refs
  const watchTimeRef = useRef(0);

  // Fetch course data
  const fetchCourseData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [courseData, lessonsData] = await Promise.all([
        courseAPI.getCourse(courseId),
        courseAPI.getLessons(courseId),
      ]);

      setCourse(courseData);
      setLessons(Array.isArray(lessonsData) ? lessonsData : []);
    } catch (error) {
      console.error("Error fetching course data:", error);
      setError(error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  // Update progress
  const updateProgress = useCallback(async () => {
    if (!currentLesson || watchTimeRef.current === 0) return;

    try {
      await analyticsAPI.updateProgress(
        parseInt(courseId),
        currentLesson.id,
        watchTimeRef.current / 60, // Convert to minutes
        true // Mark as completed when updating
      );

      watchTimeRef.current = 0;
    } catch (error) {
      console.error("Failed to update progress:", error);
    }
  }, [courseId, currentLesson]);

  const getCurrentLessonIndex = () => {
    return lessons.findIndex((lesson) => lesson.id === currentLesson?.id);
  };

  const goToNextLesson = () => {
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex < lessons.length - 1) {
      const nextLesson = lessons[currentIndex + 1];
      updateProgress();
      navigate(`/course/${courseId}/lesson/${nextLesson.id}`);
    } else {
      toast.success("Course completed! 🎉");
      navigate(`/course/${courseId}`);
    }
  };

  const goToPreviousLesson = () => {
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex > 0) {
      const prevLesson = lessons[currentIndex - 1];
      updateProgress();
      navigate(`/course/${courseId}/lesson/${prevLesson.id}`);
    }
  };

  const goToLesson = (lesson) => {
    if (lesson.id !== currentLesson?.id) {
      updateProgress();
      navigate(`/course/${courseId}/lesson/${lesson.id}`);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Enhanced video URL processing
  const getVideoUrl = (lesson) => {
    if (!lesson?.video_url) return null;
    
    const url = lesson.video_url.trim();
    
    // If it's already a complete URL, return it
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it starts with /, prepend server URL
    if (url.startsWith('/')) {
      const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      return `${serverUrl}${url}`;
    }
    
    // Otherwise, assume it's a relative path
    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    return `${serverUrl}/${url}`;
  };

  // Fetch course data when courseId changes
  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  // Update current lesson when lessons or lessonId change
  useEffect(() => {
    if (lessons.length > 0 && lessonId) {
      const lesson = lessons.find((l) => l.id === parseInt(lessonId));
      if (lesson) {
        setCurrentLesson(lesson);
        setWatchTime(0);
        watchTimeRef.current = 0;
        setVideoError(null);
        setVideoLoaded(false);
      } else {
        setError(new Error("Lesson not found"));
      }
    }
  }, [lessons, lessonId]);

  // Watch time tracker
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentLesson && videoLoaded) {
        watchTimeRef.current += 1;
        setWatchTime((prev) => prev + 1);

        // Update progress every 30 seconds
        if (watchTimeRef.current % 30 === 0) {
          updateProgress();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentLesson, videoLoaded, updateProgress]);

  // Update progress when component unmounts or lesson changes
  useEffect(() => {
    return () => {
      if (currentLesson && watchTimeRef.current > 0) {
        updateProgress();
      }
    };
  }, [currentLesson, updateProgress]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold mb-2">Error Loading Video</h2>
          <p className="text-gray-400 mb-4">{error.message}</p>
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  // No lesson found
  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold mb-2">Lesson not found</h2>
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  const videoUrl = getVideoUrl(currentLesson);
  const currentIndex = getCurrentLessonIndex();

  return (
    <div className="min-h-screen bg-black">
      <div className="flex h-screen">
        {/* Video Player Section */}
        <div
          className={`flex-1 flex flex-col ${
            showPlaylist ? "w-3/4" : "w-full"
          }`}
        >
          {/* Header */}
          <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  updateProgress();
                  navigate("/dashboard");
                }}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Home className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  updateProgress();
                  navigate(`/course/${courseId}`);
                }}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">{currentLesson.title}</h1>
                <p className="text-sm text-gray-300">{course?.title}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Toggle Transcript"
              >
                <MessageCircle className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowPlaylist(!showPlaylist)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Toggle Playlist"
              >
                <List className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-300">
                {formatTime(watchTime)} watched
              </span>
            </div>
          </div>

          {/* Video Player Container */}
          <div className="flex-1 relative bg-black">
            {videoUrl ? (
              <UniversalVideoPlayer
                url={videoUrl}
                title={currentLesson.title}
                className="w-full h-full"
                onLoad={() => setVideoLoaded(true)}
                onError={(error) => setVideoError(error)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No video available for this lesson</p>
                  <p className="text-gray-400 mb-6">
                    This lesson may contain text content or other materials
                  </p>
                  {currentLesson.content && (
                    <div className="max-w-2xl mx-auto text-left bg-gray-800 p-6 rounded-lg">
                      <h3 className="text-xl font-semibold mb-4">
                        Lesson Content
                      </h3>
                      <div className="prose prose-invert">
                        {currentLesson.content
                          .split("\n")
                          .map((paragraph, index) => (
                            <p key={index} className="mb-3">
                              {paragraph}
                            </p>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Controls Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
              <button
                onClick={goToPreviousLesson}
                disabled={currentIndex === 0}
                className="flex items-center px-4 py-2 bg-black bg-opacity-75 text-white rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous Lesson"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Previous
              </button>

              <button
                onClick={goToNextLesson}
                disabled={currentIndex === lessons.length - 1}
                className="flex items-center px-4 py-2 bg-black bg-opacity-75 text-white rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next Lesson"
              >
                Next
                <ArrowRight className="h-5 w-5 ml-2" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {showPlaylist && (
          <div className="w-1/4 bg-white border-l border-gray-200 flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Course Content</h3>
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className={`p-1 rounded text-sm ${
                    showTranscript
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-500"
                  }`}
                >
                  Transcript
                </button>
              </div>
              <p className="text-sm text-gray-600">{lessons.length} lessons</p>
            </div>

            {/* Lessons List */}
            <div className="flex-1 overflow-y-auto">
              {lessons.map((lesson, index) => {
                const isActive = currentLesson?.id === lesson.id;
                const isCompleted = lesson.is_completed;

                return (
                  <button
                    key={lesson.id}
                    onClick={() => goToLesson(lesson)}
                    className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      isActive ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {isActive ? (
                          <Play className="h-4 w-4 text-blue-600" />
                        ) : isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                            {index + 1}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-sm font-medium truncate ${
                            isActive ? "text-blue-900" : "text-gray-900"
                          }`}
                        >
                          {lesson.title}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {Math.round(lesson.duration_minutes)} min
                          </span>
                          {lesson.lesson_type && (
                            <span className="text-xs text-gray-400">
                              • {lesson.lesson_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Course Progress */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Progress</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(((currentIndex + 1) / lessons.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / lessons.length) * 100}%`,
                  }}
                ></div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {currentIndex + 1} of {lessons.length} lessons
              </div>
            </div>
          </div>
        )}

        {/* Transcript Panel */}
        {showTranscript && currentLesson?.transcript && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-48 overflow-y-auto z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Transcript</h3>
                <button
                  onClick={() => setShowTranscript(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed">
                {currentLesson.transcript.split("\n").map((line, index) => (
                  <p key={index} className="mb-2">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;