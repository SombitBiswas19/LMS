-- ============================================
-- Smart E-learning Platform Database Setup
-- PostgreSQL Database Creation Script
-- ============================================

-- Step 1: Create Database (run as postgres superuser)
-- Connect to PostgreSQL as superuser first, then run:

CREATE DATABASE smart_elearning_db;
CREATE USER elearning_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE smart_elearning_db TO elearning_user;

-- Connect to the new database (from psql client or a DB tool):
-- \c smart_elearning_db

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO elearning_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO elearning_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO elearning_user;

-- ============================================
-- Table Creation Scripts
-- ============================================

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructor VARCHAR(255),
    duration_hours FLOAT,
    difficulty_level VARCHAR(50) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    tags JSON,
    thumbnail_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lessons table
CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    video_url VARCHAR(500),
    duration_minutes FLOAT,
    "order" INTEGER NOT NULL,
    transcript TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes table
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    questions JSON NOT NULL,
    total_points INTEGER NOT NULL,
    time_limit_minutes INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enrollments table
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    progress_percentage FLOAT DEFAULT 0.0,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT FALSE,
    UNIQUE(student_id, course_id)
);

-- Quiz Attempts table
CREATE TABLE quiz_attempts (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    answers JSON,
    score FLOAT NOT NULL,
    max_score FLOAT NOT NULL,
    time_taken_minutes FLOAT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student Analytics table
CREATE TABLE student_analytics (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    total_watch_time_minutes FLOAT DEFAULT 0.0,
    videos_watched INTEGER DEFAULT 0,
    quizzes_attempted INTEGER DEFAULT 0,
    avg_quiz_score FLOAT DEFAULT 0.0,
    login_count INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    dropout_risk_score FLOAT DEFAULT 0.0,
    capability_score FLOAT DEFAULT 0.0,
    UNIQUE(student_id, course_id)
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_courses_active ON courses(is_active);
CREATE INDEX idx_courses_difficulty ON courses(difficulty_level);
CREATE INDEX idx_courses_created ON courses(created_at);

CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_lessons_order ON lessons(course_id, "order");

CREATE INDEX idx_quizzes_course ON quizzes(course_id);

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_completed ON enrollments(is_completed);
CREATE INDEX idx_enrollments_progress ON enrollments(progress_percentage);

CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_date ON quiz_attempts(attempted_at);

CREATE INDEX idx_analytics_student ON student_analytics(student_id);
CREATE INDEX idx_analytics_course ON student_analytics(course_id);
CREATE INDEX idx_analytics_dropout_risk ON student_analytics(dropout_risk_score);
CREATE INDEX idx_analytics_capability ON student_analytics(capability_score);
CREATE INDEX idx_analytics_last_activity ON student_analytics(last_activity);

-- ============================================
-- Triggers and Functions
-- ============================================

CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_activity
    BEFORE UPDATE ON student_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_last_activity();

CREATE OR REPLACE FUNCTION create_student_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO student_analytics (student_id, course_id)
    VALUES (NEW.student_id, NEW.course_id)
    ON CONFLICT (student_id, course_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_analytics
    AFTER INSERT ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION create_student_analytics();

-- ============================================
-- Insert Demo Data
-- ============================================

-- Insert demo users (password: password123)
INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES
('admin@demo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewuOSm8ZD.xpe.G.', 'Admin User', 'admin', true),
('student@demo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewuOSm8ZD.xpe.G.', 'John Doe', 'student', true),
('jane@demo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewuOSm8ZD.xpe.G.', 'Jane Smith', 'student', true),
('mike@demo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewuOSm8ZD.xpe.G.', 'Mike Johnson', 'student', true),
('sarah@demo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewuOSm8ZD.xpe.G.', 'Sarah Williams', 'student', true);

-- Insert demo courses
INSERT INTO courses (title, description, instructor, duration_hours, difficulty_level, tags, is_active) VALUES
('Introduction to Python Programming', 
 'Learn the fundamentals of Python programming from scratch. Perfect for beginners who want to start their coding journey. Covers variables, data types, control structures, functions, and basic file handling.',
 'Dr. Sarah Wilson', 8.5, 'beginner', 
 '["Python", "Programming", "Beginner", "Coding"]', true),

('Advanced JavaScript and React', 
 'Master modern JavaScript and React development. Build interactive web applications with hooks, context, and advanced patterns. Learn state management, API integration, and deployment strategies.',
 'Prof. Alex Chen', 12.0, 'advanced', 
 '["JavaScript", "React", "Web Development", "Frontend"]', true),

('Data Science with Machine Learning', 
 'Explore data science concepts and machine learning algorithms. Use Python, pandas, and scikit-learn for real-world projects. Learn data visualization, statistical analysis, and predictive modeling.',
 'Dr. Maria Rodriguez', 15.5, 'intermediate', 
 '["Data Science", "Machine Learning", "Python", "Analytics"]', true),

('Digital Marketing Fundamentals', 
 'Learn digital marketing strategies including SEO, social media marketing, and online advertising campaigns. Understand analytics, content marketing, and customer engagement techniques.',
 'John Marketing', 6.0, 'beginner', 
 '["Marketing", "SEO", "Social Media", "Digital"]', true),

('Full Stack Web Development', 
 'Complete web development course covering both frontend and backend technologies. Learn HTML, CSS, JavaScript, Node.js, Express, and database integration.',
 'Prof. David Kim', 20.0, 'intermediate', 
 '["Web Development", "Full Stack", "JavaScript", "Node.js"]', true);

-- Insert demo lessons
INSERT INTO lessons (course_id, title, duration_minutes, "order", transcript) VALUES
-- Python Course Lessons
(1, 'Python Basics and Syntax', 45, 1, 'Welcome to Python programming. In this lesson, we will cover variables, data types, and basic syntax. Python is a powerful programming language known for its simplicity and readability.'),
(1, 'Control Structures and Functions', 50, 2, 'Learn about if statements, loops, and how to create and use functions in Python. Control structures help you make decisions and repeat code efficiently.'),
(1, 'Working with Data Structures', 40, 3, 'Explore lists, dictionaries, and sets in Python. Understand when and how to use each data structure for different programming scenarios.'),
(1, 'File Handling and Error Management', 35, 4, 'Learn to read and write files, handle exceptions, and debug your Python code. Proper error handling is crucial for robust applications.'),

-- JavaScript/React Course Lessons
(2, 'Modern JavaScript ES6+ Features', 55, 1, 'Discover arrow functions, destructuring, async/await, and other modern JavaScript features that make your code more efficient and readable.'),
(2, 'React Components and JSX', 60, 2, 'Build your first React components using JSX syntax and understand the component lifecycle. Learn how to create reusable UI components.'),
(2, 'State Management with Hooks', 50, 3, 'Master useState, useEffect, and custom hooks for managing state in React applications. Understand the React component lifecycle.'),
(2, 'Building a Complete React App', 70, 4, 'Put it all together by building a full-featured React application from start to finish, including routing and API integration.'),

-- Data Science Course Lessons
(3, 'Data Analysis with Pandas', 45, 1, 'Introduction to pandas library for data manipulation and analysis in Python. Learn to work with DataFrames and Series.'),
(3, 'Data Visualization Techniques', 40, 2, 'Create compelling visualizations using matplotlib and seaborn libraries. Learn to tell stories with your data.'),
(3, 'Machine Learning Algorithms', 65, 3, 'Understand supervised and unsupervised learning algorithms and their applications. Explore classification and regression techniques.'),
(3, 'Building ML Models', 55, 4, 'Train, evaluate, and deploy machine learning models using scikit-learn. Learn about model validation and performance metrics.');

-- Insert demo quizzes
INSERT INTO quizzes (course_id, title, questions, total_points, time_limit_minutes) VALUES
(1, 'Python Basics Quiz', '[
  {
    "question": "What is the correct way to declare a variable in Python?",
    "options": ["var x = 5", "x = 5", "int x = 5", "declare x = 5"],
    "correct_answer": "x = 5"
  },
  {
    "question": "Which data type is mutable in Python?",
    "options": ["String", "Tuple", "List", "Integer"],
    "correct_answer": "List"
  },
  {
    "question": "What does the len() function do?",
    "options": ["Returns the length of an object", "Converts to lowercase", "Creates a list", "Sorts data"],
    "correct_answer": "Returns the length of an object"
  },
  {
    "question": "How do you create a comment in Python?",
    "options": ["// This is a comment", "# This is a comment", "/* This is a comment */", "<!-- This is a comment -->"],
    "correct_answer": "# This is a comment"
  }
]', 40, 10),

(2, 'React Fundamentals Quiz', '[
  {
    "question": "What is JSX?",
    "options": ["A database", "JavaScript XML syntax extension", "A CSS framework", "A testing library"],
    "correct_answer": "JavaScript XML syntax extension"
  },
  {
    "question": "Which hook is used for side effects in React?",
    "options": ["useState", "useEffect", "useContext", "useReducer"],
    "correct_answer": "useEffect"
  },
  {
    "question": "How do you pass data from parent to child component?",
    "options": ["Props", "State", "Context", "Refs"],
    "correct_answer": "Props"
  }
]', 30, 15),

(3, 'Data Science Quiz', '[
  {
    "question": "What is the purpose of pandas in data science?",
    "options": ["Web scraping", "Data manipulation and analysis", "Machine learning", "Data visualization"],
    "correct_answer": "Data manipulation and analysis"
  },
  {
    "question": "Which algorithm is best for classification problems?",
    "options": ["Linear Regression", "Random Forest", "K-means", "PCA"],
    "correct_answer": "Random Forest"
  },
  {
    "question": "What does CSV stand for?",
    "options": ["Computer Science Variable", "Comma Separated Values", "Central System Values", "Code Style Verification"],
    "correct_answer": "Comma Separated Values"
  }
]', 30, 12);

-- Insert demo enrollments
INSERT INTO enrollments (student_id, course_id, progress_percentage, is_completed) VALUES
(2, 1, 75.0, false),
(2, 3, 40.0, false),
(3, 1, 100.0, true),
(3, 2, 60.0, false),
(3, 4, 25.0, false),
(4, 2, 80.0, false),
(4, 3, 30.0, false),
(5, 1, 90.0, false),
(5, 5, 15.0, false);

-- Insert demo quiz attempts
INSERT INTO quiz_attempts (student_id, quiz_id, answers, score, max_score, time_taken_minutes) VALUES
(2, 1, '[{"answer": "x = 5"}, {"answer": "List"}, {"answer": "Returns the length of an object"}, {"answer": "# This is a comment"}]', 40, 40, 8.5),
(3, 1, '[{"answer": "x = 5"}, {"answer": "Tuple"}, {"answer": "Returns the length of an object"}, {"answer": "# This is a comment"}]', 30, 40, 9.2),
(3, 2, '[{"answer": "JavaScript XML syntax extension"}, {"answer": "useEffect"}, {"answer": "Props"}]', 30, 30, 12.1),
(4, 2, '[{"answer": "JavaScript XML syntax extension"}, {"answer": "useState"}, {"answer": "Props"}]', 20, 30, 14.5),
(5, 1, '[{"answer": "x = 5"}, {"answer": "List"}, {"answer": "Returns the length of an object"}, {"answer": "# This is a comment"}]', 40, 40, 7.8);



-- ============================================
-- Verification Queries
-- ============================================

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'courses', COUNT(*) FROM courses
UNION ALL
SELECT 'lessons', COUNT(*) FROM lessons
UNION ALL
SELECT 'quizzes', COUNT(*) FROM quizzes
UNION ALL
SELECT 'enrollments', COUNT(*) FROM enrollments
UNION ALL
SELECT 'quiz_attempts', COUNT(*) FROM quiz_attempts
UNION ALL
SELECT 'student_analytics', COUNT(*) FROM student_analytics;

-- ============================================
-- Final Permissions
-- ============================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO elearning_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO elearning_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO elearning_user;

-- Success Message
SELECT 'Database setup completed successfully! 🎓' AS status;