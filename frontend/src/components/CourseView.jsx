// Enhanced CourseView.jsx - Complete Merged Version with All Features

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCallback } from "react";
import {
  BookOpen,
  Clock,
  Users,
  Star,
  Play,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  Grid,
  List,
  X,
  Sparkles,
  BookMarked,
  Video,
  FileText,
  Globe,
  Award,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Upload,
  Save,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Eye,
  EyeOff,
  Target,
  Book,
  Monitor,
  Headphones,
  File,
  Code,
  PenTool,
  Camera,
  Mic,
  Settings,
  ExternalLink,
  PlayCircle,
  Download,
  Link,
  TrendingUp,
  Zap,
  RefreshCw,
  Minus
} from "lucide-react";
import { courseAPI, handleApiError } from "../services/api";
import { toast } from "react-hot-toast";

const getTypeIcon = (type) => {
  switch (type) {
    case 'video':
      return Video;
    case 'audio':
      return Headphones;
    case 'document':
      return FileText;
    case 'quiz':
      return PenTool;
    case 'assignment':
      return Monitor;
    case 'live':
      return Camera;
    case 'podcast':
      return Mic;
    default:
      return FileText;
  }
};

// Complete Enhanced Edit Course Modal
const EnhancedEditCourseModal = ({ course, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    title: course.title || '',
    description: course.description || '',
    short_description: course.short_description || '',
    instructor: course.instructor || '',
    category: course.category || '',
    duration_hours: course.duration_hours || '',
    difficulty_level: course.difficulty_level || 'beginner',
    language: course.language || 'English',
    estimated_completion_time: course.estimated_completion_time || '',
    learning_objectives: course.learning_objectives || [''],
    prerequisites: course.prerequisites || [''],
    tags: Array.isArray(course.tags) ? course.tags.join(', ') : (course.tags || ''),
    price: course.price || 0,
    is_free: course.is_free ?? true,
    is_featured: course.is_featured || false,
    certificate_available: course.certificate_available ?? true,
  });

  const [lessons, setLessons] = useState([]);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchLessons();
  }, [course.id]);

  const fetchLessons = async () => {
    try {
      setLessonLoading(true);
      const data = await courseAPI.getLessons(course.id);
      setLessons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch lessons:', error);
      setLessons([]);
      toast.error('Failed to load lessons');
    } finally {
      setLessonLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'content', label: 'Content', icon: BookOpen },
    { id: 'lessons', label: 'Lessons', icon: Video },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const courseData = {
        ...formData,
        duration_hours: parseFloat(formData.duration_hours),
        price: parseFloat(formData.price),
        estimated_completion_time: formData.estimated_completion_time ? parseInt(formData.estimated_completion_time) : null,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        learning_objectives: formData.learning_objectives.filter(obj => obj.trim()),
        prerequisites: formData.prerequisites.filter(pre => pre.trim())
      };

      await courseAPI.updateCourse(course.id, courseData);
      toast.success('Course updated successfully!');
      onSuccess();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateArrayItem = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addLesson = async () => {
    try {
      const newLesson = {
        title: 'New Lesson',
        description: '',
        video_url: '',
        duration_minutes: 0,
        order: lessons.length + 1,
        lesson_type: 'video',
        content: '',
        transcript: '',
        is_preview: false,
        is_mandatory: true,
        points: 0
      };

      const createdLesson = await courseAPI.createLesson(course.id, newLesson);
      setLessons(prev => [...prev, createdLesson]);
      toast.success('Lesson added successfully!');
    } catch (error) {
      handleApiError(error);
    }
  };

  const updateLesson = async (lessonId, updates) => {
    try {
      const updatedLesson = await courseAPI.updateLesson(course.id, lessonId, updates);
      setLessons(prev => prev.map(lesson => 
        lesson.id === lessonId ? updatedLesson : lesson
      ));
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const deleteLesson = async (lessonId) => {
    try {
      await courseAPI.deleteLesson(course.id, lessonId);
      setLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
      toast.success('Lesson deleted successfully!');
    } catch (error) {
      handleApiError(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-6xl shadow-2xl flex flex-col" style={{ height: '90vh' }}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Edit Course</h2>
              <p className="text-gray-600 mt-1">{course.title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter course title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Short Description *
                    </label>
                    <input
                      type="text"
                      value={formData.short_description}
                      onChange={(e) => handleChange('short_description', e.target.value)}
                      maxLength={200}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description for course cards"
                    />
                    <p className="text-gray-500 text-sm mt-1">{formData.short_description.length}/200</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Detailed course description"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instructor Name *
                      </label>
                      <input
                        type="text"
                        value={formData.instructor}
                        onChange={(e) => handleChange('instructor', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Instructor name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleChange('category', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select a category</option>
                        <option value="Programming">Programming</option>
                        <option value="Design">Design</option>
                        <option value="Business">Business</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Data Science">Data Science</option>
                        <option value="Photography">Photography</option>
                        <option value="Music">Music</option>
                        <option value="Health">Health & Fitness</option>
                        <option value="Language">Language</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (hours) *
                      </label>
                      <input
                        type="number"
                        value={formData.duration_hours}
                        onChange={(e) => handleChange('duration_hours', e.target.value)}
                        min="0.5"
                        step="0.5"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="10.5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Difficulty Level *
                      </label>
                      <select
                        value={formData.difficulty_level}
                        onChange={(e) => handleChange('difficulty_level', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={formData.language}
                        onChange={(e) => handleChange('language', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Chinese">Chinese</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Content Tab */}
              {activeTab === 'content' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Learning Objectives *
                    </label>
                    <p className="text-sm text-gray-500 mb-4">
                      What will students learn after completing this course?
                    </p>
                    {formData.learning_objectives.map((objective, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={objective}
                          onChange={(e) => updateArrayItem('learning_objectives', index, e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Learning objective ${index + 1}`}
                        />
                        {formData.learning_objectives.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem('learning_objectives', index)}
                            className="text-red-500 hover:text-red-700 p-2"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem('learning_objectives')}
                      className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Learning Objective
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prerequisites (Optional)
                    </label>
                    <p className="text-sm text-gray-500 mb-4">
                      What should students know before taking this course?
                    </p>
                    {formData.prerequisites.map((prerequisite, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={prerequisite}
                          onChange={(e) => updateArrayItem('prerequisites', index, e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Prerequisite ${index + 1}`}
                        />
                        {formData.prerequisites.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem('prerequisites', index)}
                            className="text-red-500 hover:text-red-700 p-2"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem('prerequisites')}
                      className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Prerequisite
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => handleChange('tags', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="JavaScript, React, Frontend, Web Development"
                    />
                  </div>
                </div>
              )}

              {/* Lessons Tab */}
              {activeTab === 'lessons' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Course Lessons</h3>
                    <button
                      type="button"
                      onClick={addLesson}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lesson
                    </button>
                  </div>

                  {lessonLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading lessons...</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {lessons.map((lesson, index) => (
                        <LessonEditCard
                          key={lesson.id}
                          lesson={lesson}
                          index={index}
                          onUpdate={(updates) => updateLesson(lesson.id, updates)}
                          onDelete={() => deleteLesson(lesson.id)}
                        />
                      ))}

                      {lessons.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No lessons added yet. Click "Add Lesson" to get started.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Course Pricing</h3>
                    
                    <div className="flex items-center space-x-4 mb-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="pricing"
                          checked={formData.is_free}
                          onChange={() => handleChange('is_free', true)}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium">Free Course</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="pricing"
                          checked={!formData.is_free}
                          onChange={() => handleChange('is_free', false)}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium">Paid Course</span>
                      </label>
                    </div>

                    {!formData.is_free && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Course Price ($) *
                        </label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => handleChange('price', e.target.value)}
                          min="0.01"
                          step="0.01"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="29.99"
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Course Settings</h3>
                    
                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_featured}
                          onChange={(e) => handleChange('is_featured', e.target.checked)}
                          className="mr-3"
                        />
                        <div>
                          <span className="text-sm font-medium">Featured Course</span>
                          <p className="text-xs text-gray-500">This course will be highlighted in the catalog</p>
                        </div>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.certificate_available}
                          onChange={(e) => handleChange('certificate_available', e.target.checked)}
                          className="mr-3"
                        />
                        <div>
                          <span className="text-sm font-medium">Certificate Available</span>
                          <p className="text-xs text-gray-500">Students will receive a certificate upon completion</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Completion Time (days)
                    </label>
                    <input
                      type="number"
                      value={formData.estimated_completion_time}
                      onChange={(e) => handleChange('estimated_completion_time', e.target.value)}
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="How many days should students take to complete this course?"
                    />
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Course
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Lesson Edit Card Component
const LessonEditCard = ({ lesson, index, onUpdate, onDelete }) => {
  const [editData, setEditData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);

  useEffect(() => {
    if (lesson) {
      const initialData = {
        title: lesson.title || 'New Lesson',
        description: lesson.description || '',
        lesson_type: lesson.lesson_type || 'video',
        video_url: lesson.video_url || '',
        duration_minutes: lesson.duration_minutes || 0,
        points: lesson.points || 0,
        content: lesson.content || '',
        is_preview: lesson.is_preview || false,
        is_mandatory: lesson.is_mandatory !== undefined ? lesson.is_mandatory : true,
      };
      setEditData(initialData);
      setOriginalData(JSON.parse(JSON.stringify(initialData)));
    }
  }, [lesson]);

  useEffect(() => {
    if (editData && originalData) {
      const changed = JSON.stringify(editData) !== JSON.stringify(originalData);
      setHasChanges(changed);
    }
  }, [editData, originalData]);

  const handleChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (editData && hasChanges && onUpdate) {
      try {
        await onUpdate(editData);
        setOriginalData(JSON.parse(JSON.stringify(editData)));
        setHasChanges(false);
        toast.success('Lesson updated successfully!');
      } catch (error) {
        console.error('Failed to save lesson:', error);
      }
    }
  };

  const handleCancel = () => {
    setEditData(JSON.parse(JSON.stringify(originalData)));
    setHasChanges(false);
  };

  if (!lesson || !editData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">Loading lesson data...</p>
      </div>
    );
  }

  const TypeIcon = getTypeIcon(editData.lesson_type);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-lg">
              <TypeIcon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">
                {editData.title || `Lesson ${index + 1}`}
              </h4>
              <p className="text-sm text-gray-500">
                {editData.lesson_type} • {editData.duration_minutes} min
                {editData.is_preview && ' • Preview'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                Unsaved changes
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to delete this lesson?')) {
                  onDelete();
                }
              }}
              className="text-red-600 hover:text-red-800 p-1"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <ChevronDown 
              className={`h-4 w-4 text-gray-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lesson Title
              </label>
              <input
                type="text"
                value={editData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter lesson title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lesson Type
              </label>
              <select
                value={editData.lesson_type}
                onChange={(e) => handleChange('lesson_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="document">Document</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
                <option value="live">Live Session</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={editData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe what this lesson covers"
            />
          </div>

          {editData.lesson_type === 'video' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Video URL
                </label>
                {editData.video_url && (
                  <button
                    type="button"
                    onClick={() => setShowVideoPreview(!showVideoPreview)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    {showVideoPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                    {showVideoPreview ? 'Hide Preview' : 'Show Preview'}
                  </button>
                )}
              </div>
              <input
                type="url"
                value={editData.video_url}
                onChange={(e) => handleChange('video_url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="YouTube, Vimeo, Google Drive, or direct video URL"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supports YouTube, Vimeo, Google Drive, and direct video links
              </p>
              
              {showVideoPreview && editData.video_url && (
                <div className="mt-4">
                  <UniversalVideoPlayer 
                    url={editData.video_url}
                    title={editData.title}
                    className="w-full h-64 rounded-lg overflow-hidden"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={editData.duration_minutes}
                onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value) || 0)}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="30"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points/XP
              </label>
              <input
                type="number"
                value={editData.points}
                onChange={(e) => handleChange('points', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content/Transcript
            </label>
            <textarea
              value={editData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Lesson content, transcript, or notes"
            />
          </div>

          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={editData.is_preview}
                onChange={(e) => handleChange('is_preview', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Preview Lesson</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={editData.is_mandatory}
                onChange={(e) => handleChange('is_mandatory', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Mandatory</span>
            </label>
          </div>

          {hasChanges && (
            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Complete the Create Course Modal with all steps
const EnhancedCreateCourseModal = ({ onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    short_description: '',
    instructor: '',
    category: '',
    duration_hours: '',
    difficulty_level: 'beginner',
    language: 'English',
    estimated_completion_time: '',
    learning_objectives: [''],
    prerequisites: [''],
    tags: '',
    price: 0,
    is_free: true,
    is_featured: false,
    certificate_available: true,
    lessons: []
  });

  const [errors, setErrors] = useState({});

  const steps = [
    { number: 1, title: 'Basic Information', icon: FileText },
    { number: 2, title: 'Course Details', icon: BookOpen },
    { number: 3, title: 'Content Structure', icon: List },
    { number: 4, title: 'Pricing & Settings', icon: DollarSign },
    { number: 5, title: 'Lessons & Content', icon: Video }
  ];

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.short_description.trim()) newErrors.short_description = 'Short description is required';
        if (!formData.instructor.trim()) newErrors.instructor = 'Instructor name is required';
        if (!formData.category.trim()) newErrors.category = 'Category is required';
        break;
      case 2:
        if (!formData.duration_hours || formData.duration_hours <= 0) newErrors.duration_hours = 'Duration must be greater than 0';
        break;
      case 3:
        if (formData.learning_objectives.filter(obj => obj.trim()).length === 0) {
          newErrors.learning_objectives = 'At least one learning objective is required';
        }
        break;
      case 4:
        if (!formData.is_free && (!formData.price || formData.price <= 0)) {
          newErrors.price = 'Price must be greater than 0 for paid courses';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) return;
    
    setLoading(true);

    try {
      const courseData = {
        ...formData,
        duration_hours: parseFloat(formData.duration_hours),
        price: parseFloat(formData.price),
        estimated_completion_time: formData.estimated_completion_time ? parseInt(formData.estimated_completion_time) : null,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        learning_objectives: formData.learning_objectives.filter(obj => obj.trim()),
        prerequisites: formData.prerequisites.filter(pre => pre.trim())
      };

      const course = await courseAPI.createCourse(courseData);

      if (formData.lessons.length > 0) {
        for (const lesson of formData.lessons) {
          if (lesson.title.trim()) {
            await courseAPI.createLesson(course.id, {
              ...lesson,
              duration_minutes: parseInt(lesson.duration_minutes) || 0,
              points: parseInt(lesson.points) || 0
            });
          }
        }
      }

      toast.success('Course created successfully!');
      onSuccess();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateArrayItem = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addLesson = () => {
    setFormData(prev => ({
      ...prev,
      lessons: [...prev.lessons, {
        title: '',
        description: '',
        video_url: '',
        duration_minutes: 0,
        order: prev.lessons.length + 1,
        lesson_type: 'video',
        content: '',
        transcript: '',
        is_preview: false,
        is_mandatory: true,
        points: 0
      }]
    }));
  };

  const removeLesson = (index) => {
    setFormData(prev => ({
      ...prev,
      lessons: prev.lessons.filter((_, i) => i !== index).map((lesson, i) => ({
        ...lesson,
        order: i + 1
      }))
    }));
  };

  const updateLesson = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      lessons: prev.lessons.map((lesson, i) => 
        i === index ? { ...lesson, [field]: value } : lesson
      )
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-6xl shadow-2xl flex flex-col" style={{ height: '90vh' }}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Course</h2>
              <p className="text-gray-600 mt-1">Step {currentStep} of {steps.length}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <React.Fragment key={step.number}>
                  <div className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : isActive 
                        ? 'bg-blue-500 border-blue-500 text-white' 
                        : 'border-gray-300 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="ml-3 hidden sm:block">
                      <div className={`text-sm font-medium ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {step.title}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.title ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter an engaging course title"
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Short Description *
                    </label>
                    <input
                      type="text"
                      value={formData.short_description}
                      onChange={(e) => handleChange('short_description', e.target.value)}
                      maxLength={200}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.short_description ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Brief description for course cards (max 200 chars)"
                    />
                    <div className="flex justify-between items-center mt-1">
                      {errors.short_description && <p className="text-red-500 text-sm">{errors.short_description}</p>}
                      <p className="text-gray-500 text-sm ml-auto">{formData.short_description.length}/200</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={6}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.description ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Provide a detailed description of what students will learn"
                    />
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instructor Name *
                      </label>
                      <input
                        type="text"
                        value={formData.instructor}
                        onChange={(e) => handleChange('instructor', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.instructor ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Instructor name"
                      />
                      {errors.instructor && <p className="text-red-500 text-sm mt-1">{errors.instructor}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleChange('category', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.category ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select a category</option>
                        <option value="Programming">Programming</option>
                        <option value="Design">Design</option>
                        <option value="Business">Business</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Data Science">Data Science</option>
                        <option value="Photography">Photography</option>
                        <option value="Music">Music</option>
                        <option value="Health">Health & Fitness</option>
                        <option value="Language">Language</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Course Details */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (hours) *
                      </label>
                      <input
                        type="number"
                        value={formData.duration_hours}
                        onChange={(e) => handleChange('duration_hours', e.target.value)}
                        min="0.5"
                        step="0.5"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.duration_hours ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="e.g., 10.5"
                      />
                      {errors.duration_hours && <p className="text-red-500 text-sm mt-1">{errors.duration_hours}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Difficulty Level *
                      </label>
                      <select
                        value={formData.difficulty_level}
                        onChange={(e) => handleChange('difficulty_level', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={formData.language}
                        onChange={(e) => handleChange('language', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Chinese">Chinese</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Completion Time (days)
                    </label>
                    <input
                      type="number"
                      value={formData.estimated_completion_time}
                      onChange={(e) => handleChange('estimated_completion_time', e.target.value)}
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="How many days should students take to complete this course?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => handleChange('tags', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., JavaScript, React, Frontend, Web Development"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Separate tags with commas to help students find your course
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Content Structure */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Learning Objectives *
                    </label>
                    <p className="text-sm text-gray-500 mb-4">
                      What will students learn after completing this course?
                    </p>
                    {formData.learning_objectives.map((objective, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={objective}
                          onChange={(e) => updateArrayItem('learning_objectives', index, e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Learning objective ${index + 1}`}
                        />
                        {formData.learning_objectives.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem('learning_objectives', index)}
                            className="text-red-500 hover:text-red-700 p-2"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem('learning_objectives')}
                      className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Learning Objective
                    </button>
                    {errors.learning_objectives && <p className="text-red-500 text-sm mt-1">{errors.learning_objectives}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prerequisites (Optional)
                    </label>
                    <p className="text-sm text-gray-500 mb-4">
                      What should students know before taking this course?
                    </p>
                    {formData.prerequisites.map((prerequisite, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={prerequisite}
                          onChange={(e) => updateArrayItem('prerequisites', index, e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Prerequisite ${index + 1}`}
                        />
                        {formData.prerequisites.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem('prerequisites', index)}
                            className="text-red-500 hover:text-red-700 p-2"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem('prerequisites')}
                      className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Prerequisite
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Pricing & Settings */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Course Pricing</h3>
                    
                    <div className="flex items-center space-x-4 mb-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="pricing"
                          checked={formData.is_free}
                          onChange={() => handleChange('is_free', true)}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium">Free Course</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="pricing"
                          checked={!formData.is_free}
                          onChange={() => handleChange('is_free', false)}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium">Paid Course</span>
                      </label>
                    </div>

                    {!formData.is_free && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Course Price ($) *
                        </label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => handleChange('price', e.target.value)}
                          min="0.01"
                          step="0.01"
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.price ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="29.99"
                        />
                        {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Course Settings</h3>
                    
                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_featured}
                          onChange={(e) => handleChange('is_featured', e.target.checked)}
                          className="mr-3"
                        />
                        <div>
                          <span className="text-sm font-medium">Featured Course</span>
                          <p className="text-xs text-gray-500">This course will be highlighted in the catalog</p>
                        </div>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.certificate_available}
                          onChange={(e) => handleChange('certificate_available', e.target.checked)}
                          className="mr-3"
                        />
                        <div>
                          <span className="text-sm font-medium">Certificate Available</span>
                          <p className="text-xs text-gray-500">Students will receive a certificate upon completion</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Lessons & Content */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Course Lessons</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Add lessons to your course. You can always add more lessons later.
                    </p>
                    
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      {formData.lessons.map((lesson, index) => (
                        <CreateLessonCard
                          key={index}
                          lesson={lesson}
                          index={index}
                          onUpdate={(field, value) => updateLesson(index, field, value)}
                          onDelete={() => removeLesson(index)}
                        />
                      ))}
                    </div>
                    
                    <button
                      type="button"
                      onClick={addLesson}
                      className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lesson
                    </button>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800 mb-1">
                          Course Creation Note
                        </h4>
                        <p className="text-sm text-yellow-700">
                          You can create the course structure now and add more detailed content later. 
                          Lessons can be edited, reordered, and enhanced after course creation.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className={`flex items-center px-4 py-2 border rounded-lg transition-colors ${
                currentStep === 1
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </button>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading}
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
                      Create Course
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Create Lesson Card Component for Course Creation (continued)
const CreateLessonCard = ({ lesson, index, onUpdate, onDelete }) => {
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);

  useEffect(() => {
    if (lesson) {
      const initialData = {
        title: lesson.title || 'New Lesson',
        description: lesson.description || '',
        lesson_type: lesson.lesson_type || 'video',
        video_url: lesson.video_url || '',
        duration_minutes: lesson.duration_minutes || 0,
        points: lesson.points || 0,
        content: lesson.content || '',
        is_preview: lesson.is_preview || false,
        is_mandatory: lesson.is_mandatory !== undefined ? lesson.is_mandatory : true,
        // Quiz-specific fields
        quiz_data: lesson.quiz_data || null,
        time_limit_minutes: lesson.time_limit_minutes || 30,
        passing_score: lesson.passing_score || 70,
        attempts_allowed: lesson.attempts_allowed || 3
      };
      setEditData(initialData);
      
      // Load existing quiz questions if this is a quiz
      if (lesson.lesson_type === 'quiz' && lesson.quiz_data?.questions) {
        setQuizQuestions(lesson.quiz_data.questions);
      }
    }
  }, [lesson]);

  const handleChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));

    // If changing to quiz type, initialize quiz data
    if (field === 'lesson_type' && value === 'quiz' && !editData.quiz_data) {
      setEditData(prev => ({
        ...prev,
        quiz_data: {
          questions: [],
          time_limit_minutes: 30,
          passing_score: 70,
          attempts_allowed: 3,
          randomize_questions: false,
          show_correct_answers: true
        }
      }));
    }
  };

  const handleSave = async () => {
    if (editData && onUpdate) {
      try {
        // Include quiz data if this is a quiz
        const updatedData = {
          ...editData,
          quiz_data: editData.lesson_type === 'quiz' ? {
            questions: quizQuestions,
            time_limit_minutes: editData.time_limit_minutes,
            passing_score: editData.passing_score,
            attempts_allowed: editData.attempts_allowed,
            randomize_questions: editData.randomize_questions || false,
            show_correct_answers: editData.show_correct_answers !== false
          } : null
        };

        await onUpdate(updatedData);
        toast.success('Lesson updated successfully!');
      } catch (error) {
        console.error('Failed to save lesson:', error);
        toast.error('Failed to save lesson');
      }
    }
  };

  const handleCreateQuiz = () => {
    setShowQuizCreator(true);
  };

  const handleQuizCreated = (questions) => {
    setQuizQuestions(questions);
    setEditData(prev => ({
      ...prev,
      quiz_data: {
        ...prev.quiz_data,
        questions: questions
      }
    }));
    setShowQuizCreator(false);
    toast.success('Quiz questions added successfully!');
  };

  if (!lesson || !editData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">Loading lesson data...</p>
      </div>
    );
  }
  const getTypeIcon = (type) => {
    const icons = {
      video: Video,
      audio: Headphones,
      document: FileText,
      quiz: Target,
      assignment: PenTool,
      live: Monitor
    };
    return icons[type] || Video;
  };

  const TypeIcon = getTypeIcon(lesson.lesson_type);

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Lesson Header */}
        <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-lg">
                <TypeIcon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  {editData.title || `Lesson ${index + 1}`}
                </h4>
                <p className="text-sm text-gray-500">
                  {editData.lesson_type} • {editData.duration_minutes} min
                  {editData.lesson_type === 'quiz' && quizQuestions.length > 0 && (
                    <span> • {quizQuestions.length} questions</span>
                  )}
                </p>
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-red-600 hover:text-red-800 p-1"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Lesson Content */}
        <div className="border-t border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lesson Title
              </label>
              <input
                type="text"
                value={editData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter lesson title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lesson Type
              </label>
              <select
                value={editData.lesson_type}
                onChange={(e) => handleChange('lesson_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="document">Document</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
                <option value="live">Live Session</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={editData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe what this lesson covers"
            />
          </div>

          {/* Quiz-specific fields */}
          {editData.lesson_type === 'quiz' && (
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-900 mb-4 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Quiz Settings
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    value={editData.time_limit_minutes}
                    onChange={(e) => handleChange('time_limit_minutes', parseInt(e.target.value) || 30)}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    value={editData.passing_score}
                    onChange={(e) => handleChange('passing_score', parseInt(e.target.value) || 70)}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attempts Allowed
                  </label>
                  <input
                    type="number"
                    value={editData.attempts_allowed}
                    onChange={(e) => handleChange('attempts_allowed', parseInt(e.target.value) || 3)}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {quizQuestions.length > 0 ? (
                    <span className="text-green-600 font-medium">
                      ✓ {quizQuestions.length} question{quizQuestions.length !== 1 ? 's' : ''} added
                    </span>
                  ) : (
                    <span className="text-orange-600">
                      No questions added yet
                    </span>
                  )}
                </div>
                
                <button
                  onClick={handleCreateQuiz}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {quizQuestions.length > 0 ? 'Edit Questions' : 'Add Questions'}
                </button>
              </div>
            </div>
          )}

          {/* Video URL field for video lessons */}
          {editData.lesson_type === 'video' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video URL
              </label>
              <input
                type="url"
                value={editData.video_url}
                onChange={(e) => handleChange('video_url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="YouTube, Vimeo, Google Drive, or direct video URL"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={editData.duration_minutes}
                onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value) || 0)}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points/XP
              </label>
              <input
                type="number"
                value={editData.points}
                onChange={(e) => handleChange('points', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content/Transcript
            </label>
            <textarea
              value={editData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Lesson content, transcript, or notes"
            />
          </div>

          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={editData.is_preview}
                onChange={(e) => handleChange('is_preview', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Preview Lesson</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={editData.is_mandatory}
                onChange={(e) => handleChange('is_mandatory', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Mandatory</span>
            </label>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Quiz Creator Modal */}
      {showQuizCreator && (
        <QuizCreatorModal
          questions={quizQuestions}
          onQuestionsChange={handleQuizCreated}
          onClose={() => setShowQuizCreator(false)}
        />
      )}
    </>
  );
};


// 2. Create a simplified Quiz Creator Modal for course creation
const QuizCreatorModal = ({ questions = [], onQuestionsChange, onClose }) => {
  const [quizQuestions, setQuizQuestions] = useState(
    questions.length > 0 ? questions : [
      {
        id: Date.now(),
        question: '',
        options: ['', '', '', ''],
        correct_answer: '',
        explanation: '',
        points: 1
      }
    ]
  );

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      question: '',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      points: 1
    };
    setQuizQuestions([...quizQuestions, newQuestion]);
  };

  const removeQuestion = (index) => {
    if (quizQuestions.length > 1) {
      setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...quizQuestions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    setQuizQuestions(updatedQuestions);
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...quizQuestions];
    const oldValue = updatedQuestions[questionIndex].options[optionIndex];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    
    // Update correct_answer if it matches the old option value
    if (updatedQuestions[questionIndex].correct_answer === oldValue) {
      updatedQuestions[questionIndex].correct_answer = value;
    }
    
    setQuizQuestions(updatedQuestions);
  };

  const addOption = (questionIndex) => {
    const updatedQuestions = [...quizQuestions];
    if (updatedQuestions[questionIndex].options.length < 6) {
      updatedQuestions[questionIndex].options.push('');
      setQuizQuestions(updatedQuestions);
    }
  };

  const removeOption = (questionIndex, optionIndex) => {
    const updatedQuestions = [...quizQuestions];
    if (updatedQuestions[questionIndex].options.length > 2) {
      const removedOption = updatedQuestions[questionIndex].options[optionIndex];
      updatedQuestions[questionIndex].options.splice(optionIndex, 1);
      
      // Clear correct answer if it was the removed option
      if (updatedQuestions[questionIndex].correct_answer === removedOption) {
        updatedQuestions[questionIndex].correct_answer = '';
      }
      
      setQuizQuestions(updatedQuestions);
    }
  };

  const handleSave = () => {
    // Validate questions
    const validQuestions = quizQuestions.filter(q => 
      q.question.trim() && 
      q.correct_answer && 
      q.options.filter(opt => opt.trim()).length >= 2
    );

    if (validQuestions.length === 0) {
      toast.error('Please add at least one complete question');
      return;
    }

    if (validQuestions.length !== quizQuestions.length) {
      toast.warning(`${quizQuestions.length - validQuestions.length} incomplete question(s) will be excluded`);
    }

    onQuestionsChange(validQuestions);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl flex flex-col" style={{ height: '80vh' }}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Quiz Questions</h3>
              <p className="text-gray-600">Add questions for your quiz</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {quizQuestions.map((question, questionIndex) => (
              <div key={question.id} className="bg-gray-50 p-6 rounded-lg border">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-medium text-gray-900">
                    Question {questionIndex + 1}
                  </h4>
                  {quizQuestions.length > 1 && (
                    <button
                      onClick={() => removeQuestion(questionIndex)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Question Text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Text
                    </label>
                    <textarea
                      value={question.question}
                      onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your question here..."
                    />
                  </div>

                  {/* Options */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Answer Options
                      </label>
                      <button
                        onClick={() => addOption(questionIndex)}
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
                            onChange={() => updateQuestion(questionIndex, 'correct_answer', option)}
                            className="text-blue-600"
                            disabled={!option.trim()}
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={`Option ${optionIndex + 1}`}
                          />
                          {question.options.length > 2 && (
                            <button
                              onClick={() => removeOption(questionIndex, optionIndex)}
                              className="p-2 text-red-400 hover:text-red-600"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Explanation (Optional)
                    </label>
                    <textarea
                      value={question.explanation}
                      onChange={(e) => updateQuestion(questionIndex, 'explanation', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Explain why this is the correct answer..."
                    />
                  </div>

                  {/* Points */}
                  <div className="w-32">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Points
                    </label>
                    <input
                      type="number"
                      value={question.points}
                      onChange={(e) => updateQuestion(questionIndex, 'points', parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addQuestion}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors flex items-center justify-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Another Question
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Questions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. Update the lesson handling in the course creation to properly save quiz data
const handleCreateCourse = async (formData) => {
  try {
    // Process lessons to include quiz data
    const processedLessons = formData.lessons.map(lesson => {
      if (lesson.lesson_type === 'quiz' && lesson.quiz_data) {
        return {
          ...lesson,
          quiz_data: {
            questions: lesson.quiz_data.questions || [],
            time_limit_minutes: lesson.time_limit_minutes || 30,
            passing_score: lesson.passing_score || 70,
            attempts_allowed: lesson.attempts_allowed || 3,
            randomize_questions: lesson.randomize_questions || false,
            show_correct_answers: lesson.show_correct_answers !== false
          }
        };
      }
      return lesson;
    });

    const courseData = {
      ...formData,
      lessons: processedLessons
    };

    // Create the course
    const course = await courseAPI.createCourse(courseData);

    // Create lessons with quiz data
    for (const lesson of processedLessons) {
      if (lesson.title.trim()) {
        const lessonData = {
          ...lesson,
          duration_minutes: parseInt(lesson.duration_minutes) || 0,
          points: parseInt(lesson.points) || 0
        };

        const createdLesson = await courseAPI.createLesson(course.id, lessonData);

        // If this is a quiz, create the quiz
        if (lesson.lesson_type === 'quiz' && lesson.quiz_data?.questions) {
          const quizData = {
            title: lesson.title,
            description: lesson.description || '',
            time_limit_minutes: lesson.quiz_data.time_limit_minutes,
            passing_score: lesson.quiz_data.passing_score,
            attempts_allowed: lesson.quiz_data.attempts_allowed,
            randomize_questions: lesson.quiz_data.randomize_questions,
            show_correct_answers: lesson.quiz_data.show_correct_answers,
            questions: lesson.quiz_data.questions.map(q => ({
              question: q.question,
              options: q.options.filter(opt => opt.trim()),
              correct_answer: q.correct_answer,
              explanation: q.explanation || '',
              points: q.points || 1,
              type: 'multiple_choice'
            })),
            total_points: lesson.quiz_data.questions.reduce((sum, q) => sum + (q.points || 1), 0)
          };

          await courseAPI.createQuiz(course.id, quizData);
        }
      }
    }

    toast.success('Course created successfully!');
    return course;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

// Enhanced Icon Mapping for Different Content Types
const getContentIcon = (type) => {
  const iconMap = {
    video: Video,
    audio: Headphones,
    document: FileText,
    pdf: File,
    quiz: Target,
    assignment: PenTool,
    live: Monitor,
    presentation: Monitor,
    code: Code,
    image: Camera,
    podcast: Mic,
    ebook: Book
  };
  
  return iconMap[type] || FileText;
};

// Course Statistics Component (for admin dashboard)
const CourseStats = ({ courses }) => {
  const stats = useMemo(() => {
    if (!Array.isArray(courses)) return {};
    
    return {
      total: courses.length,
      published: courses.filter(c => c.is_published).length,
      draft: courses.filter(c => !c.is_published).length,
      free: courses.filter(c => c.is_free).length,
      paid: courses.filter(c => !c.is_free).length,
      totalEnrollments: courses.reduce((sum, c) => sum + (c.enrollment_count || 0), 0),
      avgRating: courses.length > 0 
        ? (courses.reduce((sum, c) => sum + (c.rating || 0), 0) / courses.length).toFixed(1)
        : 0,
      totalRevenue: courses
        .filter(c => !c.is_free)
        .reduce((sum, c) => sum + ((c.price || 0) * (c.enrollment_count || 0)), 0)
    };
  }, [courses]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
      <StatCard icon={BookOpen} label="Total Courses" value={stats.total} />
      <StatCard icon={Eye} label="Published" value={stats.published} color="green" />
      <StatCard icon={EyeOff} label="Draft" value={stats.draft} color="yellow" />
      <StatCard icon={Users} label="Enrollments" value={stats.totalEnrollments} color="blue" />
      <StatCard icon={Star} label="Avg Rating" value={stats.avgRating} color="yellow" />
      <StatCard icon={DollarSign} label="Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} color="green" />
      <StatCard icon={Globe} label="Free Courses" value={stats.free} color="blue" />
      <StatCard icon={Award} label="Paid Courses" value={stats.paid} color="purple" />
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color = 'gray' }) => {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colorClasses[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
};

// Course Search Suggestions Component
const SearchSuggestions = ({ courses, query, onSelect }) => {
  const suggestions = useMemo(() => {
    if (!query || query.length < 2) return [];
    
    const searchTerm = query.toLowerCase();
    const matches = [];
    
    courses.forEach(course => {
      // Title matches
      if (course.title?.toLowerCase().includes(searchTerm)) {
        matches.push({
          type: 'course',
          label: course.title,
          subtitle: `Course by ${course.instructor}`,
          course
        });
      }
      
      // Instructor matches
      if (course.instructor?.toLowerCase().includes(searchTerm)) {
        matches.push({
          type: 'instructor',
          label: course.instructor,
          subtitle: `Instructor`,
          course
        });
      }
      
      // Category matches
      if (course.category?.toLowerCase().includes(searchTerm)) {
        matches.push({
          type: 'category',
          label: course.category,
          subtitle: `Category`,
          course
        });
      }
    });
    
    // Remove duplicates and limit results
    const unique = matches.filter((item, index, self) => 
      index === self.findIndex(t => t.label === item.label && t.type === item.type)
    );
    
    return unique.slice(0, 8);
  }, [courses, query]);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1">
      {suggestions.map((suggestion, index) => (
        <button
          key={`${suggestion.type}-${suggestion.label}-${index}`}
          onClick={() => onSelect(suggestion)}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
        >
          <div className="flex items-center">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{suggestion.label}</div>
              <div className="text-sm text-gray-500">{suggestion.subtitle}</div>
            </div>
            <div className="text-xs text-gray-400 capitalize">{suggestion.type}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

// Bulk Actions Component for Admin
const BulkActions = ({ selectedCourses, onBulkAction }) => {
  if (selectedCourses.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-40">
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-gray-700">
          {selectedCourses.length} course{selectedCourses.length > 1 ? 's' : ''} selected
        </span>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onBulkAction('publish')}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
          >
            Publish
          </button>
          <button
            onClick={() => onBulkAction('unpublish')}
            className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors"
          >
            Unpublish
          </button>
          <button
            onClick={() => onBulkAction('feature')}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
          >
            Feature
          </button>
          <button
            onClick={() => onBulkAction('delete')}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Course Import/Export Component
const CourseImportExport = ({ onImport, onExport }) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!importFile) return;
    
    setImporting(true);
    try {
      await onImport(importFile);
      setShowImportModal(false);
      setImportFile(null);
      toast.success('Courses imported successfully!');
    } catch (error) {
      toast.error('Failed to import courses');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="flex space-x-2">
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import
        </button>
        <button
          onClick={onExport}
          className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </button>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Import Courses</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


const CourseView = ({ user }) => {
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolledLoading, setEnrolledLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [activeTab, setActiveTab] = useState("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    difficulty: searchParams.get("difficulty") || "all",
    category: searchParams.get("category") || "all",
    rating: searchParams.get("rating") || "all",
    duration: searchParams.get("duration") || "all",
    sort: searchParams.get("sort") || "newest",
  });

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value);
      }
    });
    setSearchParams(params);
  }, [filters, setSearchParams]);

  useEffect(() => {
    fetchCourses();
    if (user?.role === "student") {
      fetchEnrolledCourses();
    }
  }, [user]);

// ✅ CRITICAL FIX: Enhanced data fetching with proper enrollment sync
  const fetchCourses = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      console.log('🔄 Fetching courses data...');

      if (user?.role === 'student') {
        // For students, get both all courses and enrolled courses
        const [allCoursesData, enrolledCoursesData] = await Promise.all([
          courseAPI.getCourses(forceRefresh),
          courseAPI.getEnrolledCourses(forceRefresh)
        ]);

        console.log('📊 Student courses data:', {
          allCourses: allCoursesData?.length || 0,
          enrolledCourses: enrolledCoursesData?.length || 0,
          enrolledFromAll: allCoursesData?.filter(c => c.is_enrolled)?.length || 0
        });

        setCourses(Array.isArray(allCoursesData) ? allCoursesData : []);
        setEnrolledCourses(Array.isArray(enrolledCoursesData) ? enrolledCoursesData : []);

        // Log enrollment status for debugging
        const enrolledCount = allCoursesData?.filter(c => c.is_enrolled)?.length || 0;
        console.log(`🎓 Enrollment Summary: ${enrolledCount}/${allCoursesData?.length || 0} courses enrolled`);

        allCoursesData?.forEach((course) => {
          if (course.is_enrolled) {
            console.log(`✅ Enrolled: ${course.title} (${course.user_progress}% complete)`);
          }
        });
      } else {
        // For non-students, just get all courses
        const allCoursesData = await courseAPI.getCourses(forceRefresh);
        setCourses(Array.isArray(allCoursesData) ? allCoursesData : []);
        setEnrolledCourses([]);
      }
    } catch (error) {
      console.error("❌ Error fetching courses:", error);
      handleApiError(error);
      setCourses([]);
      setEnrolledCourses([]);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  const fetchEnrolledCourses = async () => {
    try {
      setEnrolledLoading(true);
      console.log("🔄 Fetching enrolled courses...");
      const data = await courseAPI.getEnrolledCourses();
      console.log("🎓 Enrolled courses received:", data?.length || 0);
      setEnrolledCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("❌ Error fetching enrolled courses:", error);
      setEnrolledCourses([]);
    } finally {
      setEnrolledLoading(false);
    }
  };

  const handleRefresh = async () => {
    console.log("🔄 Refreshing course data...");
    await fetchCourses();
    if (user?.role === "student") {
      await fetchEnrolledCourses();
    }
    toast.success("Course data refreshed!");
  };

  const handleEnrollCourse = async (courseId) => {
    if (!user) {
      toast.error("Please login to enroll in courses");
      navigate("/login");
      return;
    }

    try {
      console.log(`🎓 Enrolling in course ${courseId}...`);
      await courseAPI.enrollCourse(courseId);

      // ✅ CRITICAL FIX: Immediately update local state
      setCourses((prevCourses) =>
        prevCourses.map((course) =>
          course.id === courseId
            ? {
                ...course,
                is_enrolled: true,
                user_progress: 0,
                enrollment_count: (course.enrollment_count || 0) + 1,
              }
            : course
        )
      );

      toast.success("🎉 Enrolled successfully!");

      // ✅ Refresh data after state update
      setTimeout(() => {
        fetchCourses();
        if (user?.role === "student") {
          fetchEnrolledCourses();
        }
      }, 500);
    } catch (error) {
      console.error("❌ Enrollment failed:", error);
      handleApiError(error);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this course? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await courseAPI.deleteCourse(courseId);
      toast.success("Course deleted successfully");
      await fetchCourses();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setShowEditModal(true);
  };

  // Get the appropriate course list based on active tab
  const getDisplayCourses = () => {
    switch (activeTab) {
      case "enrolled":
        return enrolledCourses;
      case "all":
      default:
        return courses;
    }
  };

  const filteredAndSortedCourses = useMemo(() => {
    const coursesToFilter = getDisplayCourses();

    if (!Array.isArray(coursesToFilter)) return [];

    let filtered = coursesToFilter.filter((course) => {
      const matchesSearch =
        course.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
        course.description
          ?.toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        course.instructor?.toLowerCase().includes(filters.search.toLowerCase());

      const matchesDifficulty =
        filters.difficulty === "all" ||
        course.difficulty_level === filters.difficulty;
      const matchesCategory =
        filters.category === "all" || course.category === filters.category;
      const matchesRating =
        filters.rating === "all" ||
        (course.rating || 0) >= parseFloat(filters.rating);

      const matchesDuration =
        filters.duration === "all" ||
        (() => {
          const duration = course.duration_hours || 0;
          switch (filters.duration) {
            case "short":
              return duration <= 5;
            case "medium":
              return duration > 5 && duration <= 20;
            case "long":
              return duration > 20;
            default:
              return true;
          }
        })();

      return (
        matchesSearch &&
        matchesDifficulty &&
        matchesCategory &&
        matchesRating &&
        matchesDuration
      );
    });

    filtered.sort((a, b) => {
      switch (filters.sort) {
        case "newest":
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case "oldest":
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "popularity":
          return (b.enrollment_count || 0) - (a.enrollment_count || 0);
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        case "duration":
          return (b.duration_hours || 0) - (a.duration_hours || 0);
        case "progress":
          if (activeTab === "enrolled") {
            return (b.user_progress || 0) - (a.user_progress || 0);
          }
          return 0;
        default:
          return 0;
      }
    });

    return filtered;
  }, [courses, enrolledCourses, filters, activeTab]);

  const categories = useMemo(() => {
    const coursesToAnalyze = getDisplayCourses();
    if (!Array.isArray(coursesToAnalyze)) return [];
    return [
      ...new Set(
        coursesToAnalyze.map((course) => course.category).filter(Boolean)
      ),
    ];
  }, [courses, enrolledCourses, activeTab]);

  const clearFilters = () => {
    setFilters({
      search: "",
      difficulty: "all",
      category: "all",
      rating: "all",
      duration: "all",
      sort: "newest",
    });
  };

  // Calculate enrollment statistics for students
  const enrollmentStats = useMemo(() => {
    if (user?.role !== "student" || !Array.isArray(courses)) {
      return { total: 0, enrolled: 0, completed: 0, inProgress: 0 };
    }

    const enrolled = courses.filter((course) => course.is_enrolled);
    const completed = enrolled.filter((course) => course.user_progress >= 100);
    const inProgress = enrolled.filter(
      (course) => course.user_progress > 0 && course.user_progress < 100
    );

    return {
      total: courses.length,
      enrolled: enrolled.length,
      completed: completed.length,
      inProgress: inProgress.length,
    };
  }, [courses, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4 mb-4 lg:mb-0">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                  Course Catalog
                </h1>
                <p className="text-gray-600 mt-1">
                  Discover {filteredAndSortedCourses.length} of {getDisplayCourses().length} courses tailored for your growth
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "list"
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={handleRefresh}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors rounded-lg hover:bg-gray-100"
                title="Refresh courses"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              {user?.role === "admin" && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Student Statistics Dashboard */}
        {user?.role === "student" && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Total Courses"
                value={enrollmentStats.total}
                icon={BookOpen}
                color="blue"
              />
              <StatCard
                title="Enrolled"
                value={enrollmentStats.enrolled}
                icon={CheckCircle}
                color="green"
              />
              <StatCard
                title="In Progress"
                value={enrollmentStats.inProgress}
                icon={TrendingUp}
                color="yellow"
              />
              <StatCard
                title="Completed"
                value={enrollmentStats.completed}
                icon={Award}
                color="purple"
              />
            </div>
          </div>
        )}

        {/* Course Tabs */}
        {user?.role === "student" && (
          <div className="mb-6">
            <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm">
              <TabButton
                active={activeTab === "all"}
                onClick={() => setActiveTab("all")}
                icon={BookOpen}
                label="All Courses"
                count={courses.length}
              />
              <TabButton
                active={activeTab === "enrolled"}
                onClick={() => setActiveTab("enrolled")}
                icon={CheckCircle}
                label="My Courses"
                count={enrolledCourses.length}
                loading={enrolledLoading}
              />
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search courses, instructors, or topics..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center px-4 py-3 border rounded-lg transition-all ${
                    showFilters
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  <ChevronDown
                    className={`h-4 w-4 ml-2 transition-transform ${
                      showFilters ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <button
                  onClick={clearFilters}
                  className="flex items-center px-4 py-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-all"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pt-4 border-t border-gray-200">
                <FilterSelect
                  label="Difficulty"
                  value={filters.difficulty}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, difficulty: value }))
                  }
                  options={[
                    { value: "all", label: "All Levels" },
                    { value: "beginner", label: "Beginner" },
                    { value: "intermediate", label: "Intermediate" },
                    { value: "advanced", label: "Advanced" },
                  ]}
                />

                <FilterSelect
                  label="Category"
                  value={filters.category}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, category: value }))
                  }
                  options={[
                    { value: "all", label: "All Categories" },
                    ...categories.map((cat) => ({ value: cat, label: cat })),
                  ]}
                />

                <FilterSelect
                  label="Rating"
                  value={filters.rating}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, rating: value }))
                  }
                  options={[
                    { value: "all", label: "Any Rating" },
                    { value: "4.5", label: "4.5+ Stars" },
                    { value: "4", label: "4+ Stars" },
                    { value: "3.5", label: "3.5+ Stars" },
                    { value: "3", label: "3+ Stars" },
                  ]}
                />

                <FilterSelect
                  label="Duration"
                  value={filters.duration}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, duration: value }))
                  }
                  options={[
                    { value: "all", label: "Any Duration" },
                    { value: "short", label: "Short (≤5h)" },
                    { value: "medium", label: "Medium (5-20h)" },
                    { value: "long", label: "Long (20h+)" },
                  ]}
                />

                <FilterSelect
                  label="Sort By"
                  value={filters.sort}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, sort: value }))
                  }
                  options={[
                    { value: "newest", label: "Newest First" },
                    { value: "oldest", label: "Oldest First" },
                    { value: "rating", label: "Highest Rated" },
                    { value: "popularity", label: "Most Popular" },
                    { value: "title", label: "Alphabetical" },
                    { value: "duration", label: "Duration" },
                    ...(activeTab === "enrolled"
                      ? [{ value: "progress", label: "Progress" }]
                      : []),
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        {/* Course Grid/List */}
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
          }
        >
          {filteredAndSortedCourses.map((course) => (
            <EnhancedCourseCard
              key={course.id}
              course={course}
              user={user}
              onEnroll={() => handleEnrollCourse(course.id)}
              onDelete={() => handleDeleteCourse(course.id)}
              onEdit={() => handleEditCourse(course)}
              navigate={navigate}
              viewMode={viewMode}
              showProgress={activeTab === "enrolled" || course.is_enrolled}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredAndSortedCourses.length === 0 && (
          <div className="text-center py-16">
            <BookMarked className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {activeTab === "enrolled"
                ? "No enrolled courses"
                : "No courses found"}
            </h3>
            <p className="text-gray-500 mb-6">
              {activeTab === "enrolled"
                ? "You haven't enrolled in any courses yet. Browse all courses to get started!"
                : filters.search ||
                  filters.difficulty !== "all" ||
                  filters.category !== "all" ||
                  filters.rating !== "all" ||
                  filters.duration !== "all"
                ? "Try adjusting your search criteria or filters"
                : "No courses available at the moment"}
            </p>
            {activeTab === "enrolled" ? (
              <button
                onClick={() => setActiveTab("all")}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Browse All Courses
              </button>
            ) : (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <EnhancedCreateCourseModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchCourses();
          }}
        />
      )}

      {/* Edit Course Modal */}
      {showEditModal && editingCourse && (
        <EnhancedEditCourseModal
          course={editingCourse}
          onClose={() => {
            setShowEditModal(false);
            setEditingCourse(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingCourse(null);
            fetchCourses();
          }}
        />
      )}
    </div>
  );
};

// Enhanced Course Card Component with Progress Display
const EnhancedCourseCard = ({
  course,
  user,
  onEnroll,
  onDelete,
  onEdit,
  navigate,
  viewMode = "grid",
  showProgress = false,
}) => {
  const difficultyColors = {
    beginner: "bg-green-100 text-green-800",
    intermediate: "bg-yellow-100 text-yellow-800",
    advanced: "bg-red-100 text-red-800",
  };

  const handleCardClick = (e) => {
    if (e.target.closest("button")) return;
    navigate(`/course/${course.id}`);
  };

  const formatDuration = (hours) => {
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    return `${hours}h`;
  };

  if (viewMode === "list") {
    return (
      <div
        className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex">
          {/* Course Image */}
          <div className="w-48 h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative overflow-hidden flex-shrink-0">
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-white opacity-50" />
              </div>
            )}

            {/* Enrollment Badge */}
            {course.is_enrolled && (
              <div className="absolute top-2 left-2">
                <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Enrolled
                </span>
              </div>
            )}

            {/* Progress Overlay */}
            {showProgress && course.is_enrolled && course.user_progress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70">
                <div className="p-2">
                  <div className="flex justify-between text-white text-xs mb-1">
                    <span>Progress</span>
                    <span>{Math.round(course.user_progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-1">
                    <div
                      className="bg-green-400 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${course.user_progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Course Content */}
          <div className="flex-1 p-6">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                {course.title}
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  difficultyColors[course.difficulty_level]
                } flex-shrink-0 ml-4`}
              >
                {course.difficulty_level}
              </span>
            </div>

            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {course.description}
            </p>

            {/* Progress Info for Enrolled Courses */}
            {showProgress && course.is_enrolled && (
              <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700 font-medium">
                    Your Progress
                  </span>
                  <span className="text-blue-600">
                    {Math.round(course.user_progress)}% Complete
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${course.user_progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-500 space-x-4">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatDuration(course.duration_hours)}
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {course.enrollment_count || 0}
                </div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1 text-yellow-500 fill-current" />
                  {course.rating?.toFixed(1) || "N/A"}
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {course.instructor}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {user?.role === "admin" && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Course"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Course"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}

                {user?.role === "admin" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/course/${course.id}`);
                    }}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage
                  </button>
                ) : course.is_enrolled ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/course/${course.id}`);
                    }}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {course.user_progress > 0 ? "Continue" : "Start"}
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEnroll();
                    }}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Enroll
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Course Image */}
      <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-16 w-16 text-white opacity-50" />
          </div>
        )}

        {/* Enrollment Badge */}
        {course.is_enrolled && (
          <div className="absolute top-3 left-3">
            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              Enrolled
            </span>
          </div>
        )}

        {/* Featured Badge */}
        {course.is_featured && (
          <div className="absolute top-3 right-3">
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
              <Sparkles className="h-3 w-3 mr-1" />
              Featured
            </span>
          </div>
        )}

        {/* Progress Bar for Enrolled Students */}
        {showProgress && course.is_enrolled && course.user_progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-3">
            <div className="flex justify-between text-xs mb-2">
              <span>Progress</span>
              <span>{Math.round(course.user_progress)}%</span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-1.5">
              <div
                className="bg-green-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${course.user_progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Admin Actions */}
        {user?.role === "admin" && (
          <div className="absolute top-3 right-3 flex space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Edit Course"
            >
              <Edit className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              title="Delete Course"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Course Content */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors">
            {course.title}
          </h3>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              difficultyColors[course.difficulty_level]
            } flex-shrink-0 ml-2`}
          >
            {course.difficulty_level}
          </span>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {course.description}
        </p>

        {/* Progress Section for Enrolled Courses */}
        {showProgress && course.is_enrolled && (
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">
                Your Progress
              </span>
              <span className="text-sm font-bold text-blue-600">
                {Math.round(course.user_progress)}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${course.user_progress}%` }}
              />
            </div>
            {course.enrolled_at && (
              <div className="text-xs text-gray-600 mt-1">
                Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* Course Meta */}
        <div className="flex items-center text-sm text-gray-500 mb-4 space-x-4">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {formatDuration(course.duration_hours)}
          </div>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            {course.enrollment_count || 0}
          </div>
          <div className="flex items-center">
            <Star className="h-4 w-4 mr-1 text-yellow-500 fill-current" />
            {course.rating?.toFixed(1) || "N/A"}
          </div>
        </div>

        {/* Instructor */}
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-2">
            <Users className="h-4 w-4 text-gray-600" />
          </div>
          <span className="text-sm text-gray-700">{course.instructor}</span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            {course.is_free ? (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                Free
              </span>
            ) : (
              <div className="flex items-center text-lg font-bold text-gray-900">
                <DollarSign className="h-4 w-4 mr-1" />
                {course.price}
              </div>
            )}
          </div>

          {course.certificate_available && (
            <div className="flex items-center text-xs text-gray-500">
              <Award className="h-3 w-3 mr-1" />
              Certificate
            </div>
          )}
        </div>

        {/* Learning Objectives */}
        {course.learning_objectives && course.learning_objectives.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">What you'll learn:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              {course.learning_objectives.slice(0, 3).map((objective, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{objective}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-between items-center">
          {user?.role === "admin" ? (
            <div className="flex space-x-2 w-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/course/${course.id}`);
                }}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex-1"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </button>
            </div>
          ) : course.is_enrolled ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/course/${course.id}`);
              }}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              {course.user_progress > 0 ? "Continue Learning" : "Start Course"}
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnroll();
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Enroll Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Tab Button Component
const TabButton = ({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  loading = false,
}) => (
  <button
    onClick={onClick}
    className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors ${
      active
        ? "bg-blue-100 text-blue-700"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
    }`}
  >
    <Icon className="h-4 w-4 mr-2" />
    {label}
    {loading ? (
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current ml-2"></div>
    ) : (
      count !== undefined && (
        <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
          {count}
        </span>
      )
    )}
  </button>
);

// Stat Card Component
//const StatCard = ({ title, value, icon: Icon, color = "gray" }) => {
//  const colorClasses = {
//    gray: "bg-gray-100 text-gray-600",
//    green: "bg-green-100 text-green-600",
//    blue: "bg-blue-100 text-blue-600",
//    yellow: "bg-yellow-100 text-yellow-600",
//    purple: "bg-purple-100 text-purple-600",
//    red: "bg-red-100 text-red-600",
//  };

//  return (
//    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
//      <div className={`inline-flex p-2 rounded-lg mb-2 ${colorClasses[color]}`}>
//        <Icon className="h-4 w-4" />
//      </div>
//      <div className="text-2xl font-bold text-gray-900">{value}</div>
//      <div className="text-sm text-gray-600">{title}</div>
//    </div>
//  );
//};

// Filter Select Component
const FilterSelect = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

// Universal Video Player Component
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

    // Direct video files (mp4, webm, etc.)
    const videoExtensions = /\.(mp4|webm|ogg|avi|mov)(\?.*)?$/i;
    if (videoExtensions.test(url)) {
      return {
        type: 'direct',
        embedUrl: url
      };
    }

    // If no specific type detected, try as direct embed
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

export {
  CreateLessonCard,
  QuizCreatorModal,
  handleCreateCourse
};

export default CourseView;