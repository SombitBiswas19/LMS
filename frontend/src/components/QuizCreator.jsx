import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { courseAPI, handleApiError } from '../services/api';
import {
  Plus,
  Minus,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  HelpCircle,
  Trash2,
  Copy,
  Eye,
  Settings
} from 'lucide-react';

// Enhanced Quiz Creator Component
const QuizCreator = ({ courseId, onQuizCreated, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [previewMode, setPreviewMode] = useState(false);

  // Quiz basic information
  const [quizInfo, setQuizInfo] = useState({
    title: '',
    description: '',
    instructions: '',
    time_limit_minutes: 30,
    passing_score: 70,
    attempts_allowed: 3,
    randomize_questions: false,
    randomize_answers: false,
    show_correct_answers: true,
    is_mandatory: false
  });

  // Questions state with better structure
  const [questions, setQuestions] = useState([
    {
      id: Date.now(),
      question: '',
      type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      topic: '',
      points: 1,
      difficulty: 'medium'
    }
  ]);

  const [errors, setErrors] = useState({});

  // Validation functions
  const validateQuizInfo = () => {
    const newErrors = {};
    
    if (!quizInfo.title.trim()) {
      newErrors.title = 'Quiz title is required';
    }
    
    if (quizInfo.time_limit_minutes < 1) {
      newErrors.time_limit_minutes = 'Time limit must be at least 1 minute';
    }
    
    if (quizInfo.passing_score < 0 || quizInfo.passing_score > 100) {
      newErrors.passing_score = 'Passing score must be between 0 and 100';
    }
    
    if (quizInfo.attempts_allowed < 1) {
      newErrors.attempts_allowed = 'Must allow at least 1 attempt';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateQuestions = () => {
    const newErrors = {};
    
    questions.forEach((question, index) => {
      const questionErrors = {};
      
      if (!question.question.trim()) {
        questionErrors.question = 'Question text is required';
      }
      
      if (question.type === 'multiple_choice') {
        // Check if at least 2 options are filled
        const filledOptions = question.options.filter(opt => opt.trim() !== '');
        if (filledOptions.length < 2) {
          questionErrors.options = 'At least 2 options are required';
        }
        
        // Check if correct answer is selected and valid
        if (!question.correct_answer) {
          questionErrors.correct_answer = 'Please select the correct answer';
        } else if (!question.options.includes(question.correct_answer)) {
          questionErrors.correct_answer = 'Correct answer must be one of the options';
        }
      }
      
      if (question.points < 0) {
        questionErrors.points = 'Points cannot be negative';
      }
      
      if (Object.keys(questionErrors).length > 0) {
        newErrors[`question_${index}`] = questionErrors;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Question manipulation functions
  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      question: '',
      type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      topic: '',
      points: 1,
      difficulty: 'medium'
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    } else {
      toast.error('Quiz must have at least one question');
    }
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    
    // If changing options, update correct_answer if it becomes invalid
    if (field === 'options') {
      const currentCorrect = updatedQuestions[index].correct_answer;
      if (currentCorrect && !value.includes(currentCorrect)) {
        updatedQuestions[index].correct_answer = '';
      }
    }
    
    setQuestions(updatedQuestions);
  };

  const addOption = (questionIndex) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].options.length < 6) { // Max 6 options
      updatedQuestions[questionIndex].options.push('');
      setQuestions(updatedQuestions);
    }
  };

  const removeOption = (questionIndex, optionIndex) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].options.length > 2) { // Min 2 options
      const removedOption = updatedQuestions[questionIndex].options[optionIndex];
      updatedQuestions[questionIndex].options.splice(optionIndex, 1);
      
      // Clear correct answer if it was the removed option
      if (updatedQuestions[questionIndex].correct_answer === removedOption) {
        updatedQuestions[questionIndex].correct_answer = '';
      }
      
      setQuestions(updatedQuestions);
    }
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...questions];
    const oldValue = updatedQuestions[questionIndex].options[optionIndex];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    
    // Update correct_answer if it matches the old option value
    if (updatedQuestions[questionIndex].correct_answer === oldValue) {
      updatedQuestions[questionIndex].correct_answer = value;
    }
    
    setQuestions(updatedQuestions);
  };

  const duplicateQuestion = (index) => {
    const questionToDuplicate = { ...questions[index] };
    questionToDuplicate.id = Date.now();
    questionToDuplicate.question += ' (Copy)';
    
    const updatedQuestions = [...questions];
    updatedQuestions.splice(index + 1, 0, questionToDuplicate);
    setQuestions(updatedQuestions);
  };

  // Submit quiz
  const handleSubmit = async () => {
    if (!validateQuizInfo() || !validateQuestions()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setLoading(true);
    
    try {
      // Calculate total points
      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
      
      // Format questions for API
      const formattedQuestions = questions.map(q => ({
        question: q.question.trim(),
        type: q.type,
        options: q.options.filter(opt => opt.trim() !== ''),
        correct_answer: q.correct_answer,
        explanation: q.explanation?.trim() || '',
        topic: q.topic?.trim() || 'General',
        points: q.points || 1,
        difficulty: q.difficulty || 'medium'
      }));

      const quizData = {
        ...quizInfo,
        questions: formattedQuestions,
        total_points: totalPoints
      };

      await courseAPI.createQuiz(courseId, quizData);
      
      toast.success('Quiz created successfully!');
      onQuizCreated();
      onClose();
      
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // Render functions
  const renderQuizInfo = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiz Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quiz Title *
            </label>
            <input
              type="text"
              value={quizInfo.title}
              onChange={(e) => setQuizInfo({...quizInfo, title: e.target.value})}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter quiz title"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={quizInfo.description}
              onChange={(e) => setQuizInfo({...quizInfo, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of the quiz"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions
            </label>
            <textarea
              value={quizInfo.instructions}
              onChange={(e) => setQuizInfo({...quizInfo, instructions: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Instructions for students taking the quiz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Limit (minutes) *
            </label>
            <input
              type="number"
              value={quizInfo.time_limit_minutes}
              onChange={(e) => setQuizInfo({...quizInfo, time_limit_minutes: parseInt(e.target.value) || 0})}
              min="1"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.time_limit_minutes ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.time_limit_minutes && <p className="text-red-500 text-sm mt-1">{errors.time_limit_minutes}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passing Score (%) *
            </label>
            <input
              type="number"
              value={quizInfo.passing_score}
              onChange={(e) => setQuizInfo({...quizInfo, passing_score: parseInt(e.target.value) || 0})}
              min="0"
              max="100"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.passing_score ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.passing_score && <p className="text-red-500 text-sm mt-1">{errors.passing_score}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attempts Allowed *
            </label>
            <input
              type="number"
              value={quizInfo.attempts_allowed}
              onChange={(e) => setQuizInfo({...quizInfo, attempts_allowed: parseInt(e.target.value) || 1})}
              min="1"
              max="10"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.attempts_allowed ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.attempts_allowed && <p className="text-red-500 text-sm mt-1">{errors.attempts_allowed}</p>}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <h4 className="font-medium text-gray-900">Quiz Options</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={quizInfo.randomize_questions}
                onChange={(e) => setQuizInfo({...quizInfo, randomize_questions: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">Randomize question order</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={quizInfo.randomize_answers}
                onChange={(e) => setQuizInfo({...quizInfo, randomize_answers: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">Randomize answer options</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={quizInfo.show_correct_answers}
                onChange={(e) => setQuizInfo({...quizInfo, show_correct_answers: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">Show correct answers after completion</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={quizInfo.is_mandatory}
                onChange={(e) => setQuizInfo({...quizInfo, is_mandatory: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm">Mandatory quiz</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuestion = (question, index) => (
    <div key={question.id} className="bg-gray-50 p-6 rounded-lg border">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-lg font-medium text-gray-900">
          Question {index + 1}
        </h4>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => duplicateQuestion(index)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Duplicate Question"
          >
            <Copy className="h-4 w-4" />
          </button>
          {questions.length > 1 && (
            <button
              type="button"
              onClick={() => removeQuestion(index)}
              className="p-1 text-red-400 hover:text-red-600"
              title="Delete Question"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Text *
          </label>
          <textarea
            value={question.question}
            onChange={(e) => updateQuestion(index, 'question', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors[`question_${index}`]?.question ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your question here..."
          />
          {errors[`question_${index}`]?.question && (
            <p className="text-red-500 text-sm mt-1">{errors[`question_${index}`].question}</p>
          )}
        </div>

        {/* Question Options */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">
              Answer Options *
            </label>
            <button
              type="button"
              onClick={() => addOption(index)}
              disabled={question.options.length >= 6}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
            >
              <Plus className="h-4 w-4 inline mr-1" />
              Add Option
            </button>
          </div>
          
          <div className="space-y-2">
            {question.options.map((option, optionIndex) => (
              <div key={optionIndex} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={`correct_${question.id}`}
                  checked={question.correct_answer === option}
                  onChange={() => updateQuestion(index, 'correct_answer', option)}
                  className="text-blue-600"
                  disabled={!option.trim()}
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Option ${optionIndex + 1}`}
                />
                {question.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index, optionIndex)}
                    className="p-2 text-red-400 hover:text-red-600"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {errors[`question_${index}`]?.options && (
            <p className="text-red-500 text-sm mt-1">{errors[`question_${index}`].options}</p>
          )}
          {errors[`question_${index}`]?.correct_answer && (
            <p className="text-red-500 text-sm mt-1">{errors[`question_${index}`].correct_answer}</p>
          )}
        </div>

        {/* Additional Question Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Topic
            </label>
            <input
              type="text"
              value={question.topic}
              onChange={(e) => updateQuestion(index, 'topic', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Variables, Functions"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Points
            </label>
            <input
              type="number"
              value={question.points}
              onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value) || 1)}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty
            </label>
            <select
              value={question.difficulty}
              onChange={(e) => updateQuestion(index, 'difficulty', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Explanation (Optional)
          </label>
          <textarea
            value={question.explanation}
            onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Explain why this is the correct answer..."
          />
        </div>
      </div>
    </div>
  );

  const renderQuestions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Questions ({questions.length})
        </h3>
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </button>
      </div>

      <div className="space-y-6 max-h-96 overflow-y-auto">
        {questions.map((question, index) => renderQuestion(question, index))}
      </div>
    </div>
  );

  const renderPreview = () => {
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
    const validQuestions = questions.filter(q => 
      q.question.trim() && 
      q.correct_answer && 
      q.options.filter(opt => opt.trim()).length >= 2
    );

    return (
      <div className="space-y-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Quiz Preview</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{validQuestions.length}</div>
              <div className="text-sm text-gray-600">Questions</div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{totalPoints}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{quizInfo.time_limit_minutes}</div>
              <div className="text-sm text-gray-600">Minutes</div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{quizInfo.passing_score}%</div>
              <div className="text-sm text-gray-600">Pass Score</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h4 className="font-semibold text-gray-900 mb-4">{quizInfo.title}</h4>
          {quizInfo.description && (
            <p className="text-gray-600 mb-4">{quizInfo.description}</p>
          )}
          {quizInfo.instructions && (
            <div className="bg-yellow-50 p-4 rounded-lg mb-4">
              <h5 className="font-medium text-yellow-800 mb-2">Instructions:</h5>
              <p className="text-yellow-700 text-sm">{quizInfo.instructions}</p>
            </div>
          )}

          <div className="space-y-4">
            {validQuestions.map((question, index) => (
              <div key={question.id} className="border-l-4 border-blue-500 pl-4">
                <h5 className="font-medium text-gray-900 mb-2">
                  {index + 1}. {question.question}
                </h5>
                <div className="space-y-1">
                  {question.options.filter(opt => opt.trim()).map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className={`p-2 rounded text-sm ${
                        option === question.correct_answer
                          ? 'bg-green-100 text-green-800 font-medium'
                          : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      {String.fromCharCode(65 + optIndex)}. {option}
                      {option === question.correct_answer && (
                        <CheckCircle className="inline h-4 w-4 ml-2" />
                      )}
                    </div>
                  ))}
                </div>
                {question.explanation && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                    <strong>Explanation:</strong> {question.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {validQuestions.length !== questions.length && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-700 text-sm">
                {questions.length - validQuestions.length} question(s) are incomplete and will not be included.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-6xl shadow-2xl flex flex-col" style={{ height: '90vh' }}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create Quiz</h2>
              <p className="text-gray-600 mt-1">
                {currentStep === 1 && 'Step 1: Quiz Information'}
                {currentStep === 2 && 'Step 2: Add Questions'}
                {currentStep === 3 && 'Step 3: Preview & Create'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                  previewMode 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? 'Edit Mode' : 'Preview'}
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        {!previewMode && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between max-w-md mx-auto">
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <div className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                      currentStep >= step
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'border-gray-300 text-gray-400'
                    }`}>
                      {step}
                    </div>
                  </div>
                  {step < 3 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {previewMode ? (
              renderPreview()
            ) : (
              <>
                {currentStep === 1 && renderQuizInfo()}
                {currentStep === 2 && renderQuestions()}
                {currentStep === 3 && renderPreview()}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        {!previewMode && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex justify-between">
              <div>
                {currentStep > 1 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                
                {currentStep < 3 ? (
                  <button
                    onClick={() => {
                      if (currentStep === 1 && !validateQuizInfo()) return;
                      if (currentStep === 2 && !validateQuestions()) return;
                      setCurrentStep(currentStep + 1);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || questions.length === 0}
                    className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Create Quiz
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizCreator;