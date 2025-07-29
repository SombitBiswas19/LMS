import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  ArrowRight,
  Flag,
  RotateCcw,
  Brain,
  Target,
  TrendingUp,
  BookOpen,
  AlertCircle,
  Award,
  BarChart3
} from 'lucide-react';
import { courseAPI, handleApiError } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {toast} from 'react-hot-toast';

// Helper functions moved outside component and made pure
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

// Fixed: Move this function inside component or make it accept parameters
const getProgressColor = (progress) => {
  if (progress < 25) return 'bg-red-500';
  if (progress < 50) return 'bg-orange-500';
  if (progress < 75) return 'bg-yellow-500';
  return 'bg-green-500';
};

const Quiz = ({ user }) => {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState(null);
  const [course, setCourse] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);

  const fetchQuizData = useCallback(async () => {
    try {
      const [quizData, courseData] = await Promise.all([
        courseAPI.getQuiz(courseId, quizId),
        courseAPI.getCourse(courseId)
      ]);
      
      setQuiz(quizData);
      setCourse(courseData);
      
      if (quizData) {
        setTimeLeft(quizData.time_limit_minutes * 60);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [courseId, quizId]);

  const handleSubmitQuiz = useCallback(async () => {
    try {
      const timeTaken = startTime ? (Date.now() - startTime) / (1000 * 60) : 0; // Convert to minutes
      const formattedAnswers = quiz.questions.map((_, index) => 
        answers[index] || { answer: null }
      );

      const result = await courseAPI.attemptQuiz(
        parseInt(courseId),
        parseInt(quizId),
        formattedAnswers,
        timeTaken
      );

      setResults(result);
      setQuizCompleted(true);
      toast.success('Quiz submitted successfully!');
    } catch (error) {
      handleApiError(error);
    }
  }, [startTime, quiz?.questions, answers, courseId, quizId]);

  useEffect(() => {
    fetchQuizData();
  }, [fetchQuizData]);

  useEffect(() => {
    let timer;
    if (quizStarted && !quizCompleted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizStarted, quizCompleted, timeLeft, handleSubmitQuiz]);

  const handleStartQuiz = () => {
    setQuizStarted(true);
    setStartTime(Date.now());
  };

  const handleAnswerChange = (questionIndex, selectedOption) => {
    setAnswers({
      ...answers,
      [questionIndex]: { answer: selectedOption }
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Quiz not found</h2>
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

  if (quizCompleted && results) {
    return <QuizResults results={results} quiz={quiz} course={course} navigate={navigate} courseId={courseId} />;
  }

  if (!quizStarted) {
    return <QuizIntro quiz={quiz} course={course} onStart={handleStartQuiz} navigate={navigate} courseId={courseId} />;
  }

  // Only access these after quiz is loaded
  const currentQ = quiz.questions[currentQuestion];
  const answeredQuestions = Object.keys(answers).length;
  const progressPercentage = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer and Progress */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-gray-600">
                Question {currentQuestion + 1} of {quiz.questions.length}
              </p>
            </div>
            
            <div className="text-right">
              <div className={`text-2xl font-bold mb-1 ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
                {formatTime(timeLeft)}
              </div>
              <p className="text-sm text-gray-500">Time remaining</p>
            </div>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(progressPercentage)}`}
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="h-full bg-white bg-opacity-30 animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Answered: {answeredQuestions}</span>
              <span>Remaining: {quiz.questions.length - answeredQuestions}</span>
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
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
                    {currentQ.question}
                  </h2>
                  {currentQ.description && (
                    <p className="text-gray-600 text-sm mt-2">{currentQ.description}</p>
                  )}
                </div>
              </div>
              {currentQ.points && (
                <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                  {currentQ.points} points
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-4">
              {currentQ.options.map((option, optionIndex) => {
                const isSelected = answers[currentQuestion]?.answer === option;
                const optionLetter = String.fromCharCode(65 + optionIndex); // A, B, C, D...
                
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
                        onChange={() => handleAnswerChange(currentQuestion, option)}
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

        {/* Navigation and Controls */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="flex items-center px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white rounded-lg shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Previous
          </button>

          <div className="flex items-center space-x-2">
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-10 h-10 rounded-full text-sm font-medium transition-all transform hover:scale-110 ${
                  index === currentQuestion
                    ? 'bg-blue-600 text-white shadow-lg'
                    : answers[index]
                    ? 'bg-green-100 text-green-800 border-2 border-green-300'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestion === quiz.questions.length - 1 ? (
            <button
              onClick={handleSubmitQuiz}
              className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Submit Quiz
              <Flag className="h-5 w-5 ml-2" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(Math.min(quiz.questions.length - 1, currentQuestion + 1))}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              Next
              <ArrowRight className="h-5 w-5 ml-2" />
            </button>
          )}
        </div>

        {/* Quiz Status Panel */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Quiz Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{answeredQuestions}</div>
              <div className="text-sm text-gray-600">Answered</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{quiz.questions.length - answeredQuestions}</div>
              <div className="text-sm text-gray-600">Remaining</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{quiz.total_points}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{quiz.time_limit_minutes}</div>
              <div className="text-sm text-gray-600">Minutes Limit</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Quiz Introduction Component
const QuizIntro = ({ quiz, course, onStart, navigate, courseId }) => (
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
          <h1 className="text-2xl font-bold mb-2">{quiz.title}</h1>
          <p className="text-blue-100">{course?.title}</p>
        </div>

        <div className="p-8">
          {quiz.description && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{quiz.description}</p>
            </div>
          )}

          {/* Quiz Information */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center mb-2">
                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-900">Time Limit</span>
              </div>
              <p className="text-blue-800 text-lg font-bold">{quiz.time_limit_minutes} minutes</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center mb-2">
                <Flag className="h-5 w-5 text-purple-600 mr-2" />
                <span className="font-medium text-purple-900">Questions</span>
              </div>
              <p className="text-purple-800 text-lg font-bold">{quiz.questions.length} questions</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center mb-2">
                <Award className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium text-green-900">Total Points</span>
              </div>
              <p className="text-green-800 text-lg font-bold">{quiz.total_points} points</p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center mb-2">
                <Target className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-900">Passing Score</span>
              </div>
              <p className="text-yellow-800 text-lg font-bold">{quiz.passing_score}%</p>
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
              <li>• You need {quiz.passing_score}% to pass this quiz</li>
            </ul>
          </div>

          {/* Start Button */}
          <div className="text-center">
            <button
              onClick={onStart}
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

// Quiz Results Component with AI Analytics
const QuizResults = ({ results, quiz, course, navigate, courseId }) => {
  const getPerformanceData = () => {
    if (!results.detailed_results) return [];
    
    const { questions } = results.detailed_results;
    return questions.map((q, index) => ({
      question: index + 1,
      correct: q.is_correct ? 1 : 0,
      topic: q.topic || 'General'
    }));
  };

  const getTopicPerformance = () => {
    if (!results.detailed_results) return [];
    
    const topics = {};
    results.detailed_results.questions.forEach(q => {
      const topic = q.topic || 'General';
      if (!topics[topic]) {
        topics[topic] = { correct: 0, total: 0 };
      }
      topics[topic].total++;
      if (q.is_correct) topics[topic].correct++;
    });

    return Object.entries(topics).map(([topic, data]) => ({
      topic,
      percentage: Math.round((data.correct / data.total) * 100),
      correct: data.correct,
      total: data.total
    }));
  };

  const weakAreas = results.detailed_results?.weak_areas || [];
  const recommendations = results.detailed_results?.recommendations || [];
  const topicPerformance = getTopicPerformance();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              {results.is_passed ? (
                <CheckCircle className="h-12 w-12 text-white" />
              ) : (
                <XCircle className="h-12 w-12 text-white" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {results.is_passed ? 'Quiz Completed Successfully!' : 'Quiz Completed'}
            </h1>
            <p className="text-gray-600">{course?.title} - {quiz.title}</p>
          </div>

          {/* Score Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
              <div className={`text-3xl font-bold mb-2 ${getScoreColor(results.percentage)}`}>
                {results.percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Your Score</div>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {Math.round(results.score)}/{results.max_score}
              </div>
              <div className="text-sm text-gray-600">Points Earned</div>
            </div>
            
            <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {quiz.questions.length}
              </div>
              <div className="text-sm text-gray-600">Total Questions</div>
            </div>

            <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {results.detailed_results?.correct_answers || 0}
              </div>
              <div className="text-sm text-gray-600">Correct Answers</div>
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

        {/* AI-Powered Analysis */}
        {results.detailed_results && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Topic Performance Chart */}
            {topicPerformance.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <Brain className="h-5 w-5 mr-2 text-purple-600" />
                  Topic Performance Analysis
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={topicPerformance}
                      dataKey="percentage"
                      nameKey="topic"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ topic, percentage }) => `${topic}: ${percentage}%`}
                    >
                      {topicPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Performance Trends */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                Question-by-Question Performance
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={getPerformanceData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="question" />
                  <YAxis domain={[0, 1]} />
                  <Tooltip 
                    formatter={(value) => [value === 1 ? 'Correct' : 'Incorrect', 'Result']}
                  />
                  <Line 
                    type="stepAfter" 
                    dataKey="correct" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* AI Insights and Recommendations */}
        {results.detailed_results && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Weak Areas */}
            {weakAreas.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="h-5 w-5 mr-2 text-red-600" />
                  Areas for Improvement
                </h3>
                <div className="space-y-3">
                  {weakAreas.map((area, index) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                        <span className="text-red-800 font-medium">{area}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Study Recommendations */}
            {recommendations.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-green-600" />
                  Study Recommendations
                </h3>
                <div className="space-y-3">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                        <span className="text-green-800 text-sm">{rec}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detailed Feedback */}
        {results.detailed_results?.detailed_feedback && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              AI-Powered Feedback
            </h3>
            <div className="prose prose-blue max-w-none">
              <p className="text-gray-700 leading-relaxed">{results.detailed_results.detailed_feedback}</p>
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
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium shadow-lg flex items-center"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default Quiz;