from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, Index, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum
from datetime import datetime
from typing import Optional

# Enums for Dynamic Quiz System
class DifficultyLevel(enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class CapabilityLevel(enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

class QuestionType(enum.Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    FILL_IN_BLANK = "fill_in_blank"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="student", nullable=False)  # student, admin, instructor
    is_active = Column(Boolean, default=True)
    
    # BUGFIX: The following columns were defined in the model but missing from the database schema,
    # causing 'UndefinedColumn' errors. Ensure your database is migrated to include them.
    is_verified = Column(Boolean, default=False)
    profile_image_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    preferences = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
   # last_login = Column(DateTime, nullable=True)
   # login_count = Column(Integer, default=0)
    
    # Relationships
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="student", cascade="all, delete-orphan")
    analytics = relationship("StudentAnalytics", back_populates="student", cascade="all, delete-orphan")
    created_courses = relationship("Course", back_populates="creator", foreign_keys="Course.created_by")
    progress_tracking = relationship("LessonProgress", back_populates="student", cascade="all, delete-orphan")

    student_performances = relationship("StudentPerformance", back_populates="student", cascade="all, delete-orphan")
    dynamic_quizzes = relationship("DynamicQuiz", back_populates="student", cascade="all, delete-orphan")
    question_attempts = relationship("QuestionAttempt", back_populates="student", cascade="all, delete-orphan")
    
    
    # Indexes for better performance
    __table_args__ = (
        Index('idx_user_email_active', 'email', 'is_active'),
        Index('idx_user_role', 'role'),
    )
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"

class Course(Base):
    __tablename__ = "courses"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text)
    short_description = Column(String(500))  # For course cards
    instructor = Column(String, nullable=False)
    duration_hours = Column(Float)
    difficulty_level = Column(String, nullable=False)  # beginner, intermediate, advanced
    category = Column(String)  # Programming, Design, Business, etc.
    tags = Column(JSON)
    prerequisites = Column(JSON)  # List of prerequisite course IDs or skills
    learning_objectives = Column(JSON)  # What students will learn
    thumbnail_url = Column(String)
    preview_video_url = Column(String)
    price = Column(Float, default=0.0)
    rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    enrollment_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    is_free = Column(Boolean, default=True)
    language = Column(String, default="English")
    certificate_available = Column(Boolean, default=True)
    estimated_completion_time = Column(Integer)  # in days
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    published_at = Column(DateTime)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    
    # Relationships
    creator = relationship("User", back_populates="created_courses", foreign_keys=[created_by])
    lessons = relationship("Lesson", back_populates="course", cascade="all, delete-orphan", order_by="Lesson.order")
    quizzes = relationship("Quiz", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    reviews = relationship("CourseReview", back_populates="course", cascade="all, delete-orphan")

    # Dynamic Quiz Relationships
    question_banks = relationship("QuestionBank", back_populates="course", cascade="all, delete-orphan")
    dynamic_quizzes = relationship("DynamicQuiz", back_populates="course", cascade="all, delete-orphan")
    adaptive_configs = relationship("AdaptiveAlgorithmConfig", back_populates="course", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_course_active_featured', 'is_active', 'is_featured'),
        Index('idx_course_category_difficulty', 'category', 'difficulty_level'),
        Index('idx_course_rating', 'rating'),
    )
    
    def __repr__(self):
        return f"<Course(id={self.id}, title='{self.title}', instructor='{self.instructor}')>"

class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    video_url = Column(String)
    video_duration = Column(Integer)  # in seconds
    duration_minutes = Column(Float)
    order = Column(Integer, nullable=False)
    lesson_type = Column(String, default="video")  # video, text, quiz, assignment
    content = Column(Text)  # For text-based lessons
    transcript = Column(Text)
    resources = Column(JSON)  # Additional resources, downloads
    is_preview = Column(Boolean, default=False)  # Can be viewed without enrollment
    is_mandatory = Column(Boolean, default=True)
    points = Column(Integer, default=0)  # Points awarded for completion
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="lessons")
    progress_tracking = relationship("LessonProgress", back_populates="lesson", cascade="all, delete-orphan")

    # Dynamic Quiz Relationships
    question_banks = relationship("QuestionBank", back_populates="lesson", cascade="all, delete-orphan")
    student_performances = relationship("StudentPerformance", back_populates="lesson", cascade="all, delete-orphan")
    dynamic_quizzes = relationship("DynamicQuiz", back_populates="lesson", cascade="all, delete-orphan")
    adaptive_configs = relationship("AdaptiveAlgorithmConfig", back_populates="lesson", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_lesson_course_order', 'course_id', 'order'),
    )
    
    def __repr__(self):
        return f"<Lesson(id={self.id}, title='{self.title}', course_id={self.course_id})>"


# NEW: Question Bank for Dynamic Quiz System
class QuestionBank(Base):
    __tablename__ = "question_banks"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)  # Can be course-wide
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(QuestionType), nullable=False)
    options = Column(JSON)  # For multiple choice: ["A", "B", "C", "D"]
    correct_answer = Column(String(500), nullable=False)
    explanation = Column(Text)
    difficulty_level = Column(Enum(DifficultyLevel), nullable=False)
    topic_tags = Column(JSON)  # ["algebra", "equations", "linear"]
    estimated_time_seconds = Column(Integer, default=60)
    points = Column(Integer, default=1)
    
    # Analytics fields
    times_used = Column(Integer, default=0)
    times_correct = Column(Integer, default=0)
    average_time_taken = Column(Float, default=0.0)
    success_rate = Column(Float, default=0.0)
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = relationship("Course", back_populates="question_banks")
    lesson = relationship("Lesson", back_populates="question_banks")
    creator = relationship("User")
    question_attempts = relationship("QuestionAttempt", back_populates="question", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_question_course_difficulty', 'course_id', 'difficulty_level'),
        Index('idx_question_lesson_difficulty', 'lesson_id', 'difficulty_level'),
        Index('idx_question_active', 'is_active'),
    )

# NEW: Student Performance Tracking for Adaptive Algorithm
class StudentPerformance(Base):
    __tablename__ = "student_performances"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    
    # Capability Assessment
    current_capability = Column(Enum(CapabilityLevel), default=CapabilityLevel.BEGINNER)
    mastery_score = Column(Float, default=0.0)  # 0-100
    confidence_level = Column(Float, default=0.5)  # 0-1
    learning_velocity = Column(Float, default=1.0)  # Rate of improvement
    consistency_score = Column(Float, default=0.0)  # Performance consistency 0-1
    
    # Performance Tracking by Difficulty
    easy_attempts = Column(Integer, default=0)
    easy_correct = Column(Integer, default=0)
    medium_attempts = Column(Integer, default=0)
    medium_correct = Column(Integer, default=0)
    hard_attempts = Column(Integer, default=0)
    hard_correct = Column(Integer, default=0)
    
    # Streak Tracking
    current_streak = Column(Integer, default=0)
    best_streak = Column(Integer, default=0)
    
    # Recommendations
    recommended_difficulty = Column(Enum(DifficultyLevel), default=DifficultyLevel.EASY)
    needs_review_topics = Column(JSON)  # ["algebra", "geometry"]
    strong_topics = Column(JSON)  # ["arithmetic", "fractions"]
    
    # Timestamps
    first_attempt = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("User", back_populates="student_performances")
    lesson = relationship("Lesson", back_populates="student_performances")
    
    def get_overall_accuracy(self) -> float:
        """Calculate overall accuracy across all difficulty levels"""
        total_attempts = self.easy_attempts + self.medium_attempts + self.hard_attempts
        total_correct = self.easy_correct + self.medium_correct + self.hard_correct
        
        if total_attempts == 0:
            return 0.0
        
        return (total_correct / total_attempts) * 100
    
    def _update_derived_metrics(self):
        """Update calculated fields based on current data"""
        # Update mastery score (weighted by difficulty)
        total_weighted_attempts = (self.easy_attempts * 1 + 
                                 self.medium_attempts * 2 + 
                                 self.hard_attempts * 3)
        total_weighted_correct = (self.easy_correct * 1 + 
                                self.medium_correct * 2 + 
                                self.hard_correct * 3)
        
        if total_weighted_attempts > 0:
            self.mastery_score = (total_weighted_correct / total_weighted_attempts) * 100
        
        # Update consistency score based on performance variance
        accuracies = []
        if self.easy_attempts > 0:
            accuracies.append(self.easy_correct / self.easy_attempts)
        if self.medium_attempts > 0:
            accuracies.append(self.medium_correct / self.medium_attempts)
        if self.hard_attempts > 0:
            accuracies.append(self.hard_correct / self.hard_attempts)
        
        if len(accuracies) > 1:
            variance = sum((x - sum(accuracies)/len(accuracies))**2 for x in accuracies) / len(accuracies)
            self.consistency_score = max(0, 1 - variance)

    __table_args__ = (
        Index('idx_student_performance_unique', 'student_id', 'lesson_id', unique=True),
        Index('idx_student_performance_capability', 'current_capability'),
    )

# NEW: Dynamic Quiz Generation and Management
class DynamicQuiz(Base):
    __tablename__ = "dynamic_quizzes"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    
    # Quiz Configuration
    total_questions = Column(Integer, nullable=False)
    time_limit_minutes = Column(Integer, default=15)
    is_adaptive = Column(Boolean, default=True)
    
    # Question Distribution (Planned vs Actual)
    planned_easy = Column(Integer, default=0)
    planned_medium = Column(Integer, default=0)
    planned_hard = Column(Integer, default=0)
    actual_easy = Column(Integer, default=0)
    actual_medium = Column(Integer, default=0)
    actual_hard = Column(Integer, default=0)
    
    # Quiz State
    selected_questions = Column(JSON)  # List of question IDs
    current_question_index = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    is_paused = Column(Boolean, default=False)
    
    # Results
    final_score = Column(Float, default=0.0)
    questions_answered = Column(Integer, default=0)
    actual_duration_minutes = Column(Float, default=0.0)
    
    # Algorithm Tracking
    starting_capability = Column(Enum(CapabilityLevel), nullable=False)
    ending_capability = Column(Enum(CapabilityLevel), nullable=True)
    algorithm_version = Column(String(50), default="v1.0")
    adaptive_changes_made = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    student = relationship("User", back_populates="dynamic_quizzes")
    course = relationship("Course", back_populates="dynamic_quizzes")
    lesson = relationship("Lesson", back_populates="dynamic_quizzes")
    question_attempts = relationship("QuestionAttempt", back_populates="dynamic_quiz", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_dynamic_quiz_student', 'student_id'),
        Index('idx_dynamic_quiz_lesson', 'lesson_id'),
        Index('idx_dynamic_quiz_completed', 'is_completed'),
    )

# NEW: Individual Question Attempts in Dynamic Quiz
class QuestionAttempt(Base):
    __tablename__ = "question_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    dynamic_quiz_id = Column(Integer, ForeignKey("dynamic_quizzes.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("question_banks.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Attempt Details
    question_order = Column(Integer, nullable=False)  # Position in quiz
    selected_answer = Column(String(500), nullable=True)
    is_correct = Column(Boolean, nullable=True)
    time_taken_seconds = Column(Float, nullable=True)
    points_earned = Column(Integer, default=0)
    
    # Context at Time of Attempt
    student_capability_at_time = Column(Enum(CapabilityLevel), nullable=False)
    question_difficulty = Column(Enum(DifficultyLevel), nullable=False)
    was_adaptive_change = Column(Boolean, default=False)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    answered_at = Column(DateTime, nullable=True)
    
    # Relationships
    dynamic_quiz = relationship("DynamicQuiz", back_populates="question_attempts")
    question = relationship("QuestionBank", back_populates="question_attempts")
    student = relationship("User", back_populates="question_attempts")
    
    __table_args__ = (
        Index('idx_question_attempt_quiz', 'dynamic_quiz_id'),
        Index('idx_question_attempt_student', 'student_id'),
    )

# NEW: Adaptive Algorithm Configuration
class AdaptiveAlgorithmConfig(Base):
    __tablename__ = "adaptive_algorithm_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)  # Can be course-wide
    
    # Algorithm Settings
    algorithm_name = Column(String(50), default="capability_based_v1")
    is_active = Column(Boolean, default=True)
    
    # Question Distribution Ratios by Capability Level
    # Beginner Distribution
    beginner_easy_ratio = Column(Float, default=0.7)
    beginner_medium_ratio = Column(Float, default=0.25)
    beginner_hard_ratio = Column(Float, default=0.05)
    
    # Intermediate Distribution
    intermediate_easy_ratio = Column(Float, default=0.3)
    intermediate_medium_ratio = Column(Float, default=0.5)
    intermediate_hard_ratio = Column(Float, default=0.2)
    
    # Advanced Distribution
    advanced_easy_ratio = Column(Float, default=0.1)
    advanced_medium_ratio = Column(Float, default=0.4)
    advanced_hard_ratio = Column(Float, default=0.5)
    
    # Adaptive Thresholds
    increase_difficulty_threshold = Column(Float, default=0.8)  # Accuracy threshold to increase
    decrease_difficulty_threshold = Column(Float, default=0.4)  # Accuracy threshold to decrease
    time_efficiency_threshold = Column(Float, default=1.2)  # Time ratio threshold
    
    # Capability Assessment Weights
    accuracy_weight = Column(Float, default=0.6)
    consistency_weight = Column(Float, default=0.2)
    velocity_weight = Column(Float, default=0.2)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = relationship("Course", back_populates="adaptive_configs")
    lesson = relationship("Lesson", back_populates="adaptive_configs")
    
    __table_args__ = (
        Index('idx_adaptive_config_course', 'course_id'),
        Index('idx_adaptive_config_lesson', 'lesson_id'),
    )

class Quiz(Base):
    __tablename__ = "quizzes"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"))  # Optional: quiz for specific lesson
    title = Column(String, nullable=False)
    description = Column(Text)
    instructions = Column(Text)
    questions = Column(JSON, nullable=False)  # Store questions as JSON
    total_points = Column(Integer, nullable=False)
    passing_score = Column(Integer, default=70)  # Percentage needed to pass
    time_limit_minutes = Column(Integer, default=30)
    attempts_allowed = Column(Integer, default=3)
    randomize_questions = Column(Boolean, default=False)
    randomize_answers = Column(Boolean, default=False)
    show_correct_answers = Column(Boolean, default=True)
    is_mandatory = Column(Boolean, default=False)
    available_from = Column(DateTime)
    available_until = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="quizzes")
    lesson = relationship("Lesson")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Quiz(id={self.id}, title='{self.title}', course_id={self.course_id})>"

class Enrollment(Base):
    __tablename__ = "enrollments"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    enrollment_type = Column(String, default="free")  # free, paid, scholarship
    status = Column(String, default="active")  # active, completed, dropped, suspended
    enrolled_at = Column(DateTime, server_default=func.now())
    progress_percentage = Column(Float, default=0.0)
    completed_at = Column(DateTime)
    is_completed = Column(Boolean, default=False)
    certificate_issued = Column(Boolean, default=False)
    certificate_url = Column(String)
    total_watch_time = Column(Integer, default=0)  # in minutes
    last_accessed = Column(DateTime)
    completion_deadline = Column(DateTime)
    
    # Relationships
    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    
    # Unique constraint to prevent duplicate enrollments
    __table_args__ = (
        Index('idx_enrollment_student_course', 'student_id', 'course_id', unique=True),
        Index('idx_enrollment_status', 'status'),
        Index('idx_enrollment_created', 'enrolled_at'), 
    )
    
    def __repr__(self):
        return f"<Enrollment(id={self.id}, student_id={self.student_id}, course_id={self.course_id})>"

class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    watch_time_seconds = Column(Integer, default=0)
    last_position_seconds = Column(Integer, default=0)  # For video resuming
    completion_percentage = Column(Float, default=0.0)
    first_accessed = Column(DateTime, server_default=func.now())
    last_accessed = Column(DateTime, server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime)
    
    # Relationships
    student = relationship("User", back_populates="progress_tracking")
    lesson = relationship("Lesson", back_populates="progress_tracking")
    
    # Unique constraint
    __table_args__ = (
        Index('idx_lesson_progress_student_lesson', 'student_id', 'lesson_id', unique=True),
    )
    
    def __repr__(self):
        return f"<LessonProgress(student_id={self.student_id}, lesson_id={self.lesson_id}, completed={self.is_completed})>"

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    attempt_number = Column(Integer, default=1)
    answers = Column(JSON, nullable=False)  # Store answers as JSON
    score = Column(Float, nullable=False)
    max_score = Column(Float, nullable=False)
    percentage = Column(Float)
    is_passed = Column(Boolean, default=False)
    time_taken_minutes = Column(Float)
    time_started = Column(DateTime, server_default=func.now())
    attempted_at = Column(DateTime, server_default=func.now())
    submitted_at = Column(DateTime)
    ip_address = Column(String)  # For security/integrity
    user_agent = Column(String)  # For analytics
    percentage = Column(Float, default=0.0)
    is_passed = Column(Boolean, default=False)
    time_started = Column(DateTime, nullable=True)
    
    # Relationships
    student = relationship("User", back_populates="quiz_attempts")
    quiz = relationship("Quiz", back_populates="attempts")
    
    # Indexes
    __table_args__ = (
        Index('idx_quiz_attempt_student_quiz', 'student_id', 'quiz_id'),
        Index('idx_quiz_attempt_score', 'score'),
    )
    
    def __repr__(self):
        return f"<QuizAttempt(id={self.id}, student_id={self.student_id}, quiz_id={self.quiz_id}, score={self.score})>"

class StudentAnalytics(Base):
    __tablename__ = "student_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    
    # Learning metrics
    total_watch_time_minutes = Column(Float, default=0.0)
    videos_watched = Column(Integer, default=0)
    lessons_completed = Column(Integer, default=0)
    quizzes_attempted = Column(Integer, default=0)
    quizzes_passed = Column(Integer, default=0)
    avg_quiz_score = Column(Float, default=0.0)
    best_quiz_score = Column(Float, default=0.0)
    
    # Engagement metrics
    login_count = Column(Integer, default=0)
    session_count = Column(Integer, default=0)
    avg_session_duration = Column(Float, default=0.0)  # in minutes
    days_active = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    
    # AI predictions
    dropout_risk_score = Column(Float, default=0.0)
    capability_score = Column(Float, default=0.0)
    engagement_score = Column(Float, default=0.0)
    predicted_completion_time = Column(Integer)  # in days
    recommended_study_time = Column(Integer)  # minutes per day
    
    # Timestamps
    first_activity = Column(DateTime, server_default=func.now())
    last_activity = Column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    student = relationship("User", back_populates="analytics")
    
    # Unique constraint
    __table_args__ = (
        Index('idx_analytics_student_course', 'student_id', 'course_id', unique=True),
        Index('idx_analytics_dropout_risk', 'dropout_risk_score'),
    )
    
    def __repr__(self):
        return f"<StudentAnalytics(student_id={self.student_id}, course_id={self.course_id}, dropout_risk={self.dropout_risk_score})>"

class CourseReview(Base):
    __tablename__ = "course_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    review_text = Column(Text)
    is_verified = Column(Boolean, default=False)  # Verified purchase/completion
    helpful_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="reviews")
    student = relationship("User")
    
    # Unique constraint - one review per student per course
    __table_args__ = (
        Index('idx_review_course_student', 'course_id', 'student_id', unique=True),
        Index('idx_review_rating', 'rating'),
    )
    
    def __repr__(self):
        return f"<CourseReview(id={self.id}, course_id={self.course_id}, rating={self.rating})>"

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, nullable=False)  # course_update, quiz_due, achievement, etc.
    priority = Column(String, default="normal")  # low, normal, high, urgent
    is_read = Column(Boolean, default=False)
    action_url = Column(String)  # URL to navigate when clicked
    extra_data = Column(JSON)  # Additional data (renamed from metadata)
    created_at = Column(DateTime, server_default=func.now())
    read_at = Column(DateTime)
    expires_at = Column(DateTime)
    
    # Relationships
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('idx_notification_user_read', 'user_id', 'is_read'),
        Index('idx_notification_type', 'notification_type'),
        Index('idx_notification_created', 'created_at'),
    )
    
    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type='{self.notification_type}')>"

class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=False)
    icon_url = Column(String)
    badge_color = Column(String, default="#3B82F6")
    category = Column(String)  # learning, engagement, completion, etc.
    points = Column(Integer, default=0)
    criteria = Column(JSON)  # Criteria for earning the achievement
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user_achievements = relationship("UserAchievement", back_populates="achievement")
    
    def __repr__(self):
        return f"<Achievement(id={self.id}, name='{self.name}')>"

class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    earned_at = Column(DateTime, server_default=func.now())
    progress_data = Column(JSON)  # Data about how the achievement was earned
    
    # Relationships
    user = relationship("User")
    achievement = relationship("Achievement", back_populates="user_achievements")
    
    # Unique constraint
    __table_args__ = (
        Index('idx_user_achievement', 'user_id', 'achievement_id', unique=True),
    )
    
    def __repr__(self):
        return f"<UserAchievement(user_id={self.user_id}, achievement_id={self.achievement_id})>"

class Discussion(Base):
    __tablename__ = "discussions"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"))  # Optional: discussion for specific lesson
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("discussions.id"))  # For threaded discussions
    title = Column(String)
    content = Column(Text, nullable=False)
    is_question = Column(Boolean, default=False)
    is_answered = Column(Boolean, default=False)
    likes_count = Column(Integer, default=0)
    replies_count = Column(Integer, default=0)
    is_pinned = Column(Boolean, default=False)
    is_locked = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course = relationship("Course")
    lesson = relationship("Lesson")
    user = relationship("User")
    parent = relationship("Discussion", remote_side=[id])
    replies = relationship("Discussion", back_populates="parent")
    
    # Indexes
    __table_args__ = (
        Index('idx_discussion_course_created', 'course_id', 'created_at'),
        Index('idx_discussion_parent', 'parent_id'),
    )
    
    def __repr__(self):
        return f"<Discussion(id={self.id}, course_id={self.course_id}, user_id={self.user_id})>"
