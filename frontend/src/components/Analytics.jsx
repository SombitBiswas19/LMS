import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  Users,
  Clock,
  Trophy,
  AlertTriangle,
  BookOpen,
  Download,
  RefreshCw,
  UserCheck,
  BookMarked,
  Award,
  Target,
  Activity
} from 'lucide-react';
import { analyticsAPI, courseAPI, handleApiError } from '../services/api';
import toast from 'react-hot-toast';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Analytics = ({ user, onLogout }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [courseAnalytics, setCourseAnalytics] = useState([]);
  const [studentData, setStudentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      if (user?.role === 'admin') {
        const [adminData, courses] = await Promise.all([
          analyticsAPI.getAdminDashboard(),
          courseAPI.getCourses()
        ]);
        
        setDashboardData(adminData);

        // Fetch analytics for top courses
        const courseAnalyticsPromises = courses.slice(0, 5).map(course =>
          analyticsAPI.getCourseAnalytics(course.id).catch(() => null)
        );
        const analyticsResults = await Promise.all(courseAnalyticsPromises);
        setCourseAnalytics(analyticsResults.filter(Boolean));

        // Mock student data - in real app, this would come from API
        const mockStudentData = [
          { 
            id: 1, 
            name: 'John Doe', 
            email: 'john@example.com',
            enrolled_courses: 3,
            completed_courses: 1,
            total_watch_time: 45,
            avg_quiz_score: 85,
            last_activity: '2025-01-08',
            progress: 67
          },
          { 
            id: 2, 
            name: 'Jane Smith', 
            email: 'jane@example.com',
            enrolled_courses: 2,
            completed_courses: 2,
            total_watch_time: 32,
            avg_quiz_score: 92,
            last_activity: '2025-01-09',
            progress: 100
          },
          { 
            id: 3, 
            name: 'Mike Johnson', 
            email: 'mike@example.com',
            enrolled_courses: 4,
            completed_courses: 0,
            total_watch_time: 18,
            avg_quiz_score: 65,
            last_activity: '2025-01-07',
            progress: 25
          }
        ];
        setStudentData(mockStudentData);

      } else {
        const studentData = await analyticsAPI.getStudentDashboard();
        setDashboardData(studentData);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
    toast.success('Analytics refreshed!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-600 mt-1">
                  {user?.role === 'admin' ? 'Platform Overview & Student Analytics' : 'Your Learning Progress'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user?.role === 'admin' ? (
          <AdminAnalytics
            data={dashboardData}
            courseAnalytics={courseAnalytics}
            studentData={studentData}
            onRefresh={handleRefresh}
          />
        ) : (
          <StudentAnalytics data={dashboardData} />
        )}
      </div>
    </div>
  );
};

// Admin Analytics Component
const AdminAnalytics = ({ data, courseAnalytics, studentData }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');

  // Process data for charts
  const coursePerformanceData = courseAnalytics.map(course => ({
    name: course.course_title?.substring(0, 20) + '...' || 'Unknown Course',
    enrollments: course.total_enrollments || 0,
    completion: course.completion_rate || 0,
    avgScore: course.avg_quiz_score || 0
  }));

  const studentRiskData = [
    {
      name: 'Low Risk',
      value: studentData.filter(s => s.avg_quiz_score > 70).length,
      color: '#10b981'
    },
    {
      name: 'Medium Risk',
      value: studentData.filter(s => s.avg_quiz_score >= 50 && s.avg_quiz_score <= 70).length,
      color: '#f59e0b'
    },
    {
      name: 'High Risk',
      value: studentData.filter(s => s.avg_quiz_score < 50).length,
      color: '#ef4444'
    }
  ];

  const engagementData = studentData.map(student => ({
    name: student.name.split(' ')[0],
    watchTime: student.total_watch_time,
    score: student.avg_quiz_score,
    progress: student.progress
  }));

  // Mock trend data
  const trendData = [
    { month: 'Jan', enrollments: 120, completions: 45 },
    { month: 'Feb', enrollments: 150, completions: 62 },
    { month: 'Mar', enrollments: 180, completions: 78 },
    { month: 'Apr', enrollments: 200, completions: 95 },
    { month: 'May', enrollments: 240, completions: 112 },
    { month: 'Jun', enrollments: 280, completions: 135 }
  ];

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatCard 
          title="Total Students" 
          value={studentData.length} 
          icon={Users} 
          color="blue"
          trend="+12% this month"
        />
        <AdminStatCard 
          title="Active Courses" 
          value={courseAnalytics.length} 
          icon={BookOpen} 
          color="green"
          trend="+3 new courses"
        />
        <AdminStatCard 
          title="Total Enrollments" 
          value={studentData.reduce((sum, s) => sum + s.enrolled_courses, 0)} 
          icon={TrendingUp} 
          color="purple"
          trend="+18% this month"
        />
        <AdminStatCard 
          title="At-Risk Students" 
          value={studentData.filter(s => s.avg_quiz_score < 50).length} 
          icon={AlertTriangle} 
          color="red"
          trend="-8% improvement"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Course Performance */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Course Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={coursePerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="enrollments" fill="#3b82f6" name="Enrollments" />
              <Bar dataKey="completion" fill="#10b981" name="Completion Rate" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Student Risk Distribution */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Student Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={studentRiskData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {studentRiskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Enrollment Trends */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Enrollment Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="enrollments" 
                stackId="1" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.6}
                name="Enrollments"
              />
              <Area 
                type="monotone" 
                dataKey="completions" 
                stackId="1" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.6}
                name="Completions"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Student Engagement */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Student Engagement vs Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="watchTime" fill="#8884d8" name="Watch Time (hrs)" />
              <Line yAxisId="right" type="monotone" dataKey="score" stroke="#ff7300" name="Quiz Score %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Student Data Table */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Student Analytics</h3>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrolled Courses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Watch Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {studentData.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {student.name.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.enrolled_courses}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${student.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{student.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.total_watch_time}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      student.avg_quiz_score >= 80 ? 'bg-green-100 text-green-800' :
                      student.avg_quiz_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {student.avg_quiz_score}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      student.avg_quiz_score >= 70 ? 'bg-green-100 text-green-800' :
                      student.avg_quiz_score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {student.avg_quiz_score >= 70 ? 'Good' : 
                       student.avg_quiz_score >= 50 ? 'At Risk' : 'Critical'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Student Analytics Component
const StudentAnalytics = ({ data }) => {
  const progressData = data?.current_courses?.map(course => ({
    name: course.title?.substring(0, 20) + '...' || 'Unknown Course',
    progress: course.progress || 0
  })) || [];

  const performanceData = [
    { week: 'Week 1', score: 75 },
    { week: 'Week 2', score: 82 },
    { week: 'Week 3', score: 78 },
    { week: 'Week 4', score: 85 },
    { week: 'Week 5', score: 88 },
    { week: 'Week 6', score: 92 }
  ];

  return (
    <div className="space-y-8">
      {/* Student Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatCard 
          title="Enrolled Courses" 
          value={data?.total_enrollments || 0} 
          icon={BookOpen} 
          color="blue"
        />
        <AdminStatCard 
          title="Completed" 
          value={data?.completed_courses || 0} 
          icon={Trophy} 
          color="green"
        />
        <AdminStatCard 
          title="Watch Time" 
          value={`${Math.round(data?.total_watch_time || 0)}h`} 
          icon={Clock} 
          color="purple"
        />
        <AdminStatCard 
          title="Avg Score" 
          value={`${Math.round(data?.avg_quiz_score || 0)}%`} 
          icon={TrendingUp} 
          color="yellow"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Course Progress */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Course Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="progress" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Trend */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Admin Stat Card Component
const AdminStatCard = ({ title, value, icon: Icon, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${
              trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default Analytics;