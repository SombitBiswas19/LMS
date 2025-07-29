// Enhanced Lesson.jsx with proper quiz support

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  PlayCircle,
  BookOpen,
  Clock,
  Target,
  Flag,
  AlertCircle,
  FileText,
  Video,
  Headphones,
  Monitor,
  Award
} from 'lucide-react';
import { courseAPI, handleApiError } from '../services/api';
import { toast } from 'react-hot-toast';

const Lesson = ({ user }) => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  
  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResults, setQuizResults] = useState(null);

  const fetchLessonData = useCallback(async () => {
    try {
      const [lessonData, courseData, lessonsData] = await Promise.all([
        courseAPI.getLesson(courseId, lessonId),
        courseAPI.getCourse(courseId),
        courseAPI.getLessons(courseId)
      ]);
      
      setLesson(lessonData);
      setCourse(courseData);
      setLessons(Array.isArray(lessonsData) ? lessonsData : []);
      
      // If this is a quiz lesson, initialize quiz data
      if (lessonData?.lesson_type === 'quiz' && lessonData.quiz_data) {
        setTimeLeft(lessonData.quiz_data.time_limit_minutes * 60);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    fetchLessonData();
  }, [fetchLessonData]);

  // Quiz timer
  useEffect(() => {
    let timer;
    if (quizStarted && !quizCompleted && timeLeft > 0 && lesson?.lesson_type === 'quiz') {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleQuizSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizStarted, quizCompleted, timeLeft, lesson?.lesson_type]);

  const handleQuizStart = () => {
    setQuizStarted(true);
    setCurrentQuestion(0);
    setAnswers({});
  };

  const handleAnswerChange = (questionIndex, selectedOption) => {
    setAnswers({
      ...answers,
      [questionIndex]: { answer: selectedOption }
    });
  };

  const handleQuizSubmit = async () => {
    try {
      const formattedAnswers = lesson.quiz_data.questions.map((_, index) => 
        answers[index] || { answer: null }
      );

      // Calculate score
      let correctAnswers = 0;
      lesson.quiz_data.questions.forEach((question, index) => {
        if (answers[index]?.answer === question.correct_answer) {
          correctAnswers++;
        }
      });

      const totalQuestions = lesson.quiz_data.questions.length;
      const percentage = (correctAnswers / totalQuestions) * 100;
      const isPassed = percentage >= (lesson.quiz_data.passing_score || 70);

      const results = {
        score: correctAnswers,
        max_score: totalQuestions,
        percentage: percentage,
        is_passed: isPassed,
        detailed_results: {
          questions: lesson.quiz_data.questions.map((question, index) => ({
            question: question.question,
            user_answer: answers[index]?.answer || null,
            correct_answer: question.correct_answer,
            is_correct: answers[index]?.answer === question.correct_answer,
            explanation: question.explanation
          })),
          correct_answers: correctAnswers,
          total_questions: totalQuestions
        }
      };

      setQuizResults(results);
      setQuizCompleted(true);

      // Mark lesson as completed if quiz is passed
      if (isPassed) {
        await courseAPI.markLessonComplete(courseId, lessonId);
        toast.success('Quiz completed successfully!');
      } else {
        toast.error(`Quiz failed. You need ${lesson.quiz_data.passing_score}% to pass.`);
      }

    } catch (error) {
      handleApiError(error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getNextLesson = () => {
    const currentIndex = lessons.findIndex(l => l.id === parseInt(lessonId));
    return currentIndex >= 0 && currentIndex < lessons.length - 1 
      ? lessons[currentIndex + 1] 
      : null;
  };

  const getPreviousLesson = () => {
    const currentIndex = lessons.findIndex(l => l.id === parseInt(lessonId));
    return currentIndex > 0 ? lessons[currentIndex - 1] : null;
  };

  const handleMarkComplete = async () => {
    try {
      await courseAPI.markLessonComplete(courseId, lessonId);
      toast.success('Lesson marked as complete!');
      
      // Navigate to next lesson if available
      const nextLesson = getNextLesson();
      if (nextLesson) {
        navigate(`/course/${courseId}/lesson/${nextLesson.id}`);
      } else {
        navigate(`/course/${courseId}`);
      }
    } catch (error) {
      handleApiError(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lesson not found</h2>
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  // Render quiz content
  if (lesson.lesson_type === 'quiz') {
    return (
      <QuizLessonView
        lesson={lesson}
        course={course}
        quizStarted={quizStarted}
        quizCompleted={quizCompleted}
        quizResults={quizResults}
        currentQuestion={currentQuestion}
        answers={answers}
        timeLeft={timeLeft}
        onQuizStart={handleQuizStart}
        onAnswerChange={handleAnswerChange}
        onQuizSubmit={handleQuizSubmit}
        onQuestionChange={setCurrentQuestion}
        formatTime={formatTime}
        navigate={navigate}
        courseId={courseId}
        lessonId={lessonId}
        getNextLesson={getNextLesson}
        getPreviousLesson={getPreviousLesson}
      />
    );
  }

  // Regular lesson view
  return (
    <RegularLessonView
      lesson={lesson}
      course={course}
      onMarkComplete={handleMarkComplete}
      navigate={navigate}
      courseId={courseId}
      lessonId={lessonId}
      getNextLesson={getNextLesson}
      getPreviousLesson={getPreviousLesson}
    />
  );
};

// Quiz Lesson Component
const QuizLessonView = ({
  lesson,
  course,
  quizStarted,
  quizCompleted,
  quizResults,
  currentQuestion,
  answers,
  timeLeft,
  onQuizStart,
  onAnswerChange,
  onQuizSubmit,
  onQuestionChange,
  formatTime,
  navigate,
  courseId,
  lessonId,
  getNextLesson,
  getPreviousLesson
}) => {
  if (quizCompleted && quizResults) {
    return (
      <QuizResultsView
        lesson={lesson}
        course={course}
        results={quizResults}
        navigate={navigate}
        courseId={courseId}
        getNextLesson={getNextLesson}
      />
    );
  }

  if (!quizStarted) {
    return (
      <QuizIntroView
        lesson={lesson}
        course={course}
        onQuizStart={onQuizStart}
        navigate={navigate}
        courseId={courseId}
      />
    );
  }

  // Quiz in progress
  const questions = lesson.quiz_data?.questions || [];
  const currentQ = questions[currentQuestion];
  const progressPercentage = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Quiz Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{lesson.title}</h1>
              <p className="text-gray-600">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>
            
            <div className="text-right">
              <div className={`text-2xl font-bold mb-1 ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
                {formatTime(timeLeft)}
              </div>
              <p className="text-sm text-gray-500">Time remaining</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-blue-600 rounded-full w-10 h-10 flex items-center justify-center font-bold">
                  {currentQuestion + 1}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
                  {currentQ?.question}
                </h2>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {currentQ?.options?.map((option, optionIndex) => {
                const isSelected = answers[currentQuestion]?.answer === option;
                const optionLetter = String.fromCharCode(65 + optionIndex);
                
                return (
                  <label
                    key={optionIndex}
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center flex-1">
                      <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center text-sm font-bold ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500 text-white' 
                          : 'border-gray-300'
                      }`}>
                        {isSelected ? '✓' : optionLetter}
                      </div>
                      <input
                        type="radio"
                        name={`question-${currentQuestion}`}
                        value={option}
                        checked={isSelected}
                        onChange={() => onAnswerChange(currentQuestion, option)}
                        className="sr-only"
                      />
                      <span className={`text-lg ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-900'}`}>
                        {option}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => onQuestionChange(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="flex items-center px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white rounded-lg shadow-md"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Previous
          </button>

          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={onQuizSubmit}
              className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg"
            >
              Submit Quiz
              <Flag className="h-5 w-5 ml-2" />
            </button>
          ) : (
            <button
              onClick={() => onQuestionChange(Math.min(questions.length - 1, currentQuestion + 1))}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              Next
              <ArrowRight className="h-5 w-5 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Quiz Introduction View
const QuizIntroView = ({ lesson, course, onQuizStart, navigate, courseId }) => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-2xl mx-auto px-4">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="flex items-center text-white hover:text-blue-100 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </button>
          <h1 className="text-2xl font-bold mb-2">{lesson.title}</h1>
          <p className="text-blue-100">{course?.title}</p>
        </div>

        <div className="p-8">
          {lesson.description && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{lesson.description}</p>
            </div>
          )}

          {/* Quiz Information */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center mb-2">
                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-900">Time Limit</span>
              </div>
              <p className="text-blue-800 text-lg font-bold">
                {lesson.quiz_data?.time_limit_minutes || 30} minutes
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center mb-2">
                <Flag className="h-5 w-5 text-purple-600 mr-2" />
                <span className="font-medium text-purple-900">Questions</span>
              </div>
              <p className="text-purple-800 text-lg font-bold">
                {lesson.quiz_data?.questions?.length || 0} questions
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center mb-2">
                <Award className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium text-green-900">Points</span>
              </div>
              <p className="text-green-800 text-lg font-bold">
                {lesson.quiz_data?.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0} points
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center mb-2">
                <Target className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-900">Passing Score</span>
              </div>
              <p className="text-yellow-800 text-lg font-bold">
                {lesson.quiz_data?.passing_score || 70}%
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mb-8">
            <h3 className="font-medium text-blue-900 mb-3 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Instructions
            </h3>
            <ul className="text-blue-800 text-sm space-y-2">
              <li>• Read each question carefully before answering</li>
              <li>• You can navigate between questions using the Next/Previous buttons</li>
              <li>• Make sure to submit your quiz before time runs out</li>
              <li>• Once submitted, you cannot change your answers</li>
              <li>• You need {lesson.quiz_data?.passing_score || 70}% to pass this quiz</li>
            </ul>
          </div>

          {/* Start Button */}
          <div className="text-center">
            <button
              onClick={onQuizStart}
              className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Quiz Results View
const QuizResultsView = ({ lesson, course, results, navigate, courseId, getNextLesson }) => {
  const getScoreColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreMessage = (percentage) => {
    if (percentage >= 90) return 'Outstanding! 🌟';
    if (percentage >= 80) return 'Excellent work! 🎉';
    if (percentage >= 70) return 'Good job! 👍';
    if (percentage >= 60) return 'Not bad! Keep practicing 📚';
    return 'Keep studying! You can do better 💪';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Results Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              {results.is_passed ? (
                <CheckCircle className="h-12 w-12 text-white" />
              ) : (
                <AlertCircle className="h-12 w-12 text-white" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {results.is_passed ? 'Quiz Completed Successfully!' : 'Quiz Completed'}
            </h1>
            <p className="text-gray-600">{course?.title} - {lesson.title}</p>
          </div>

          {/* Score Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
              <div className={`text-3xl font-bold mb-2 ${getScoreColor(results.percentage)}`}>
                {results.percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Your Score</div>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {results.score}/{results.max_score}
              </div>
              <div className="text-sm text-gray-600">Correct Answers</div>
            </div>
            
            <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {lesson.quiz_data?.questions?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Total Questions</div>
            </div>
          </div>

          {/* Performance Message */}
          <div className="text-center mb-8">
            <p className={`text-xl font-semibold ${getScoreColor(results.percentage)}`}>
              {getScoreMessage(results.percentage)}
            </p>
            {results.is_passed && (
              <div className="mt-4 inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                <Award className="h-4 w-4 mr-2" />
                Passed with {results.percentage.toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {/* Detailed Results */}
        {results.detailed_results && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Question Review</h3>
            <div className="space-y-6">
              {results.detailed_results.questions.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium text-gray-900">
                      Question {index + 1}: {result.question}
                    </h4>
                    {result.is_correct ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className={`p-2 rounded ${result.is_correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      <strong>Your Answer:</strong> {result.user_answer || 'No answer selected'}
                    </div>
                    
                    {!result.is_correct && (
                      <div className="p-2 bg-green-50 text-green-800 rounded">
                        <strong>Correct Answer:</strong> {result.correct_answer}
                      </div>
                    )}
                    
                    {result.explanation && (
                      <div className="p-2 bg-blue-50 text-blue-800 rounded">
                        <strong>Explanation:</strong> {result.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg"
          >
            Back to Course
          </button>
          
          {results.is_passed && getNextLesson() && (
            <button
              onClick={() => navigate(`/course/${courseId}/lesson/${getNextLesson().id}`)}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg flex items-center"
            >
              Next Lesson
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Regular Lesson View
const RegularLessonView = ({ 
  lesson, 
  course, 
  onMarkComplete, 
  navigate, 
  courseId, 
  getNextLesson, 
  getPreviousLesson 
}) => {
  const getTypeIcon = (type) => {
    const icons = {
      video: Video,
      audio: Headphones,
      document: FileText,
      assignment: Monitor,
      live: Monitor
    };
    return icons[type] || BookOpen;
  };

  const TypeIcon = getTypeIcon(lesson.lesson_type);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/course/${courseId}`)}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Course
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center space-x-2">
                <TypeIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-gray-600 capitalize">{lesson.lesson_type}</span>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              {lesson.duration_minutes} minutes
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Lesson Header */}
              <div className="p-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{lesson.title}</h1>
                {lesson.description && (
                  <p className="text-gray-600">{lesson.description}</p>
                )}
              </div>

              {/* Lesson Content */}
              <div className="p-6">
                {lesson.lesson_type === 'video' && lesson.video_url ? (
                  <div className="aspect-video bg-black rounded-lg mb-6">
                    <UniversalVideoPlayer 
                      url={lesson.video_url}
                      title={lesson.title}
                      className="w-full h-full rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-lg mb-6 flex items-center justify-center">
                    <div className="text-center">
                      <TypeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No video available for this lesson
                      </h3>
                      <p className="text-gray-500">
                        This lesson may contain text content or other materials
                      </p>
                    </div>
                  </div>
                )}

                {/* Lesson Text Content */}
                {lesson.content && (
                  <div className="prose max-w-none">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Lesson Content</h3>
                      <div className="whitespace-pre-wrap text-gray-700">
                        {lesson.content}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lesson Actions */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    {getPreviousLesson() && (
                      <button
                        onClick={() => navigate(`/course/${courseId}/lesson/${getPreviousLesson().id}`)}
                        className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Previous
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-4">
                    <button
                      onClick={onMarkComplete}
                      className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </button>

                    {getNextLesson() && (
                      <button
                        onClick={() => navigate(`/course/${courseId}/lesson/${getNextLesson().id}`)}
                        className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Next Lesson
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Course Progress</h3>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  Course: {course?.title}
                </div>
                <div className="text-sm text-gray-600">
                  Instructor: {course?.instructor}
                </div>
                <div className="text-sm text-gray-600">
                  Difficulty: <span className="capitalize">{course?.difficulty_level}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Universal Video Player Component (same as before)
const UniversalVideoPlayer = ({ url, title, className = "" }) => {
  const [videoType, setVideoType] = useState(null);
  const [embedUrl, setEmbedUrl] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) {
      setError('No video URL provided');
      return;
    }

    try {
      const processedUrl = processVideoUrl(url);
      if (processedUrl.error) {
        setError(processedUrl.error);
      } else {
        setVideoType(processedUrl.type);
        setEmbedUrl(processedUrl.embedUrl);
        setError(null);
      }
    } catch (err) {
      setError('Invalid video URL');
    }
  }, [url]);

  const processVideoUrl = (url) => {
    if (!url) return { error: 'No URL provided' };

    // YouTube URLs
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
      return {
        type: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=0&rel=0&modestbranding=1`
      };
    }

    // Vimeo URLs
    const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
      return {
        type: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
      };
    }

    // Google Drive URLs
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
    const driveMatch = url.match(driveRegex);
    if (driveMatch) {
      return {
        type: 'drive',
        embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`
      };
    }

    // Direct video files
    const videoExtensions = /\.(mp4|webm|ogg|avi|mov)(\?.*)?$/i;
    if (videoExtensions.test(url)) {
      return {
        type: 'direct',
        embedUrl: url
      };
    }

    return {
      type: 'iframe',
      embedUrl: url
    };
  };

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
          <p className="text-white">Loading video...</p>
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
          poster={`${embedUrl}#t=0.1`}
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
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
    </div>
  );
};

export default Lesson;