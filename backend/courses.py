# FIXED courses.py - Enhanced Course Management with Proper Error Handling

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, desc,text
from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta  # FIXED: Added timedelta import
import shutil
import os
import json
import logging
from database import get_db
from models import User, Course, Lesson, Quiz, Enrollment, QuizAttempt, LessonProgress, StudentAnalytics
from auth import get_current_active_user
from dynamic_quiz_routes import QuestionAttempt,QuestionBankCreate,QuestionBank,QuestionBankResponse,DifficultyLevel,DynamicQuiz,StudentPerformance,CapabilityLevel,Query
import random


logger = logging.getLogger(__name__)
courses_router = APIRouter()

def convert_days_to_interval(days):
    """Convert days (integer) to PostgreSQL interval (timedelta)"""
    if days is None:
        return None
    if isinstance(days, (int, float)) and days > 0:
        return timedelta(days=int(days))
    return None

def convert_interval_to_days(interval):
    """Convert PostgreSQL interval (timedelta) to days (integer)"""
    if interval is None:
        return None
    if isinstance(interval, timedelta):
        return int(interval.days)
    return interval

# ADDED: Helper function to safely parse JSON arrays
def safe_json_parse(value, default=None):
    """Safely parse JSON string to Python object"""
    if value is None:
        return default or []
    
    if isinstance(value, (list, dict)):
        return value
    
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else default or []
        except (json.JSONDecodeError, TypeError):
            logger.warning(f"Failed to parse JSON: {value}")
            return default or []
    
    return default or []

# Enhanced Pydantic models
class CourseCreate(BaseModel):
    title: str
    description: str
    short_description: Optional[str] = None
    instructor: str
    duration_hours: float
    difficulty_level: str
    category: Optional[str] = None
    tags: List[str] = []
    prerequisites: List[str] = []
    learning_objectives: List[str] = []
    price: float = 0.0
    is_featured: bool = False
    is_free: bool = True
    language: str = "English"
    certificate_available: bool = True
    estimated_completion_time: Optional[int] = None

    @validator('difficulty_level')
    def validate_difficulty(cls, v):
        if v not in ["beginner", "intermediate", "advanced"]:
            raise ValueError('Difficulty must be beginner, intermediate, or advanced')
        return v

    @validator('duration_hours')
    def validate_duration(cls, v):
        if v <= 0:
            raise ValueError('Duration must be positive')
        return v

    @validator('price')
    def validate_price(cls, v):
        if v < 0:
            raise ValueError('Price cannot be negative')
        return v

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    instructor: Optional[str] = None
    duration_hours: Optional[float] = None
    difficulty_level: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None
    learning_objectives: Optional[List[str]] = None
    price: Optional[float] = None
    is_featured: Optional[bool] = None
    is_free: Optional[bool] = None
    language: Optional[str] = None
    certificate_available: Optional[bool] = None
    estimated_completion_time: Optional[int] = None

class CourseResponse(BaseModel):
    id: int
    title: str
    description: str
    short_description: Optional[str] = None
    instructor: str
    duration_hours: float
    difficulty_level: str
    category: Optional[str] = None
    tags: List[str] = []
    prerequisites: List[str] = []
    learning_objectives: List[str] = []
    thumbnail_url: Optional[str] = None
    preview_video_url: Optional[str] = None
    price: float = 0.0
    rating: float = 0.0
    rating_count: int = 0
    enrollment_count: int = 0
    is_active: bool = True
    is_featured: bool = False
    is_free: bool = True
    language: str = "English"
    certificate_available: bool = True
    estimated_completion_time: Optional[int] = None
    created_at: datetime
    created_by: Optional[int] = None
    is_enrolled: bool = False
    user_progress: float = 0.0

    class Config:
        from_attributes = True

class LessonCreate(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: Optional[str] = None
    duration_minutes: float
    order: int
    lesson_type: str = "video"
    content: Optional[str] = None
    transcript: Optional[str] = None
    resources: Optional[Dict[str, Any]] = None
    is_preview: bool = False
    is_mandatory: bool = True
    points: int = 0

    @validator('lesson_type')
    def validate_lesson_type(cls, v):
        if v not in ["video", "text", "quiz", "assignment", "audio", "document"]:
            raise ValueError('Invalid lesson type')
        return v

    @validator('duration_minutes')
    def validate_duration(cls, v):
        if v < 0:
            raise ValueError('Duration cannot be negative')
        return v

    @validator('order')
    def validate_order(cls, v):
        if v < 1:
            raise ValueError('Order must be at least 1')
        return v

class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    duration_minutes: Optional[float] = None
    order: Optional[int] = None
    lesson_type: Optional[str] = None
    content: Optional[str] = None
    transcript: Optional[str] = None
    resources: Optional[Dict[str, Any]] = None
    is_preview: Optional[bool] = None
    is_mandatory: Optional[bool] = None
    points: Optional[int] = None



class LessonResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    video_url: Optional[str] = None
    duration_minutes: float
    order: int
    lesson_type: str = "video"
    content: Optional[str] = None
    transcript: Optional[str] = None
    resources: Optional[Dict[str, Any]] = None
    is_preview: bool = False
    is_mandatory: bool = True
    points: int = 0
    is_completed: bool = False
    user_progress: float = 0.0

    class Config:
        from_attributes = True

class QuizCreate(BaseModel):
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    questions: List[dict]
    total_points: int
    time_limit_minutes: int = 30
    passing_score: int = 70
    attempts_allowed: int = 3
    randomize_questions: bool = False
    randomize_answers: bool = False
    show_correct_answers: bool = True
    is_mandatory: bool = False

    @validator('questions')
    def validate_questions(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one question is required')
        
        for i, question in enumerate(v):
            if not isinstance(question, dict):
                raise ValueError(f'Question {i+1} must be a dictionary')
            
            required_fields = ['question', 'options', 'correct_answer']
            for field in required_fields:
                if field not in question:
                    raise ValueError(f'Question {i+1} is missing required field: {field}')
            
            if not isinstance(question['options'], list) or len(question['options']) < 2:
                raise ValueError(f'Question {i+1} must have at least 2 options')
            
            if question['correct_answer'] not in question['options']:
                raise ValueError(f'Question {i+1} correct answer must be one of the options')
        
        return v

    @validator('total_points')
    def validate_points(cls, v):
        if v <= 0:
            raise ValueError('Total points must be positive')
        return v

    @validator('passing_score')
    def validate_passing_score(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Passing score must be between 0 and 100')
        return v

class QuizResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    questions: List[dict]
    total_points: int
    time_limit_minutes: int = 30
    passing_score: int = 70
    attempts_allowed: int = 3
    randomize_questions: bool = False
    randomize_answers: bool = False
    show_correct_answers: bool = True
    is_mandatory: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

class QuizAttemptCreate(BaseModel):
    answers: List[dict]
    time_taken_minutes: float

class QuizAttemptResponse(BaseModel):
    id: int
    score: float
    max_score: float
    percentage: float
    is_passed: bool
    attempted_at: datetime
    time_taken_minutes: float
    detailed_results: Optional[dict] = None

    class Config:
        from_attributes = True

class EnrollmentResponse(BaseModel):
    id: int
    course_id: int
    student_id: int
    progress_percentage: float
    is_completed: bool
    enrolled_at: datetime
    total_watch_time: int = 0

    class Config:
        from_attributes = True

# Helper functions
def calculate_course_rating(course_id: int, db: Session) -> float:
    """Calculate average rating for a course"""
    try:
        from models import CourseReview
        avg_rating = db.query(func.avg(CourseReview.rating)).filter(
            CourseReview.course_id == course_id
        ).scalar()
        return round(avg_rating or 0.0, 1)
    except Exception as e:
        logger.error(f"Error calculating course rating: {e}")
        return 0.0

def update_enrollment_count(course_id: int, db: Session):
    """Update enrollment count for a course"""
    try:
        count = db.query(Enrollment).filter(Enrollment.course_id == course_id).count()
        course = db.query(Course).filter(Course.id == course_id).first()
        if course:
            course.enrollment_count = count
            db.commit()
    except Exception as e:
        logger.error(f"Error updating enrollment count: {e}")
        db.rollback()

# FIXED: Helper function to prepare course response data with better error handling
def prepare_course_response_data(course, enrollment=None, user_role="student"):
    """Prepare course data for response with proper JSON parsing and user-specific data"""
    try:
        # Calculate rating safely
        rating = getattr(course, '_calculated_rating', None)
        if rating is None:
            rating = getattr(course, 'rating', 0.0) or 0.0
        
        return {
            'id': course.id,
            'title': course.title or '',
            'description': course.description or '',
            'short_description': course.short_description or '',
            'instructor': course.instructor or 'Unknown Instructor',
            'duration_hours': course.duration_hours or 0,
            'difficulty_level': course.difficulty_level or 'beginner',
            'category': course.category or 'General',
            'tags': safe_json_parse(course.tags, []),
            'prerequisites': safe_json_parse(course.prerequisites, []),
            'learning_objectives': safe_json_parse(course.learning_objectives, []),
            'thumbnail_url': course.thumbnail_url,
            'preview_video_url': course.preview_video_url,
            'price': course.price or 0.0,
            'rating': rating,
            'rating_count': getattr(course, 'rating_count', 0) or 0,
            'enrollment_count': getattr(course, 'enrollment_count', 0) or 0,
            'is_active': course.is_active,
            'is_featured': course.is_featured or False,
            'is_free': course.is_free if course.is_free is not None else True,
            'language': course.language or 'English',
            'certificate_available': course.certificate_available if course.certificate_available is not None else True,
            'estimated_completion_time': convert_interval_to_days(course.estimated_completion_time),
            'created_at': course.created_at,
            'created_by': course.created_by,
            'is_enrolled': enrollment is not None if user_role == "student" else False,
            'user_progress': enrollment.progress_percentage if enrollment and user_role == "student" else 0.0
        }
    except Exception as e:
        logger.error(f"Error preparing course response data for course {course.id}: {e}")
        # Return minimal safe data if there's an error
        return {
            'id': course.id,
            'title': course.title or 'Unknown Course',
            'description': course.description or 'No description available',
            'short_description': course.short_description or '',
            'instructor': course.instructor or 'Unknown Instructor',
            'duration_hours': course.duration_hours or 0,
            'difficulty_level': course.difficulty_level or 'beginner',
            'category': course.category or 'General',
            'tags': [],
            'prerequisites': [],
            'learning_objectives': [],
            'thumbnail_url': course.thumbnail_url,
            'preview_video_url': course.preview_video_url,
            'price': course.price or 0.0,
            'rating': 0.0,
            'rating_count': 0,
            'enrollment_count': 0,
            'is_active': course.is_active,
            'is_featured': course.is_featured or False,
            'is_free': course.is_free if course.is_free is not None else True,
            'language': course.language or 'English',
            'certificate_available': course.certificate_available if course.certificate_available is not None else True,
            'estimated_completion_time': convert_interval_to_days(course.estimated_completion_time),
            'created_at': course.created_at,
            'created_by': course.created_by,
            'is_enrolled': enrollment is not None if user_role == "student" else False,
            'user_progress': enrollment.progress_percentage if enrollment and user_role == "student" else 0.0
        }



def calculate_lesson_progress(student_id: int, lesson_id: int, db: Session) -> bool:
    """Check if lesson is completed by student"""
    try:
        progress = db.query(LessonProgress).filter(
            LessonProgress.student_id == student_id,
            LessonProgress.lesson_id == lesson_id
        ).first()
        return progress.is_completed if progress else False
    except Exception as e:
        logger.error(f"Error checking lesson progress: {e}")
        return False

def update_student_analytics(student_id: int, course_id: int, db: Session):
    """Update student analytics data"""
    try:
        analytics = db.query(StudentAnalytics).filter(
            StudentAnalytics.student_id == student_id,
            StudentAnalytics.course_id == course_id
        ).first()
        
        if not analytics:
            analytics = StudentAnalytics(
                student_id=student_id,
                course_id=course_id
            )
            db.add(analytics)
        
        # Calculate metrics
        enrollments = db.query(Enrollment).filter(Enrollment.student_id == student_id).all()
        quiz_attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == student_id).all()
        
        analytics.total_watch_time_minutes = sum(e.total_watch_time for e in enrollments)
        analytics.quizzes_attempted = len(quiz_attempts)
        analytics.quizzes_passed = len([qa for qa in quiz_attempts if qa.is_passed])
        
        if quiz_attempts:
            analytics.avg_quiz_score = sum(qa.percentage for qa in quiz_attempts) / len(quiz_attempts)
            analytics.best_quiz_score = max(qa.percentage for qa in quiz_attempts)
        
        analytics.last_activity = datetime.utcnow()
        db.commit()
        
    except Exception as e:
        logger.error(f"Error updating student analytics: {e}")
        db.rollback()

# FIXED: Course creation (unchanged but with better logging)
@courses_router.post("/", response_model=CourseResponse)
async def create_course(
    course: CourseCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new course - FIXED with better logging"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can create courses"
        )
    
    try:
        logger.info(f"Creating course '{course.title}' by {current_user.email}")
        
        # Convert estimated_completion_time from days to interval
        estimated_time_interval = convert_days_to_interval(course.estimated_completion_time)
        
        # Create course with all fields
        db_course = Course(
            title=course.title,
            description=course.description,
            short_description=course.short_description,
            instructor=course.instructor,
            duration_hours=course.duration_hours,
            difficulty_level=course.difficulty_level,
            category=course.category,
            tags=course.tags or [],
            prerequisites=course.prerequisites or [],
            learning_objectives=course.learning_objectives or [],
            price=course.price,
            is_featured=course.is_featured,
            is_free=course.is_free,
            language=course.language,
            certificate_available=course.certificate_available,
            estimated_completion_time=estimated_time_interval,
            created_by=current_user.id,
            created_at=datetime.utcnow(),
            is_active=True,  # IMPORTANT: Ensure course is active
            rating=0.0,
            rating_count=0,
            enrollment_count=0
        )
        
        db.add(db_course)
        db.commit()
        db.refresh(db_course)
        
        logger.info(f"Course created successfully: ID {db_course.id}, Title: {course.title}")
        
        # Prepare response data
        response_data = prepare_course_response_data(db_course, None, current_user.role)
        
        return CourseResponse(**response_data)
        
    except Exception as e:
        logger.error(f"Error creating course: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create course"
        )

@courses_router.get("/debug/info")
async def debug_course_info(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to check course visibility issues"""
    try:
        # Get basic course count
        total_courses = db.query(Course).count()
        active_courses = db.query(Course).filter(Course.is_active == True).count()
        
        # Get user info
        user_info = {
            "id": current_user.id,
            "email": current_user.email,
            "role": current_user.role,
            "is_active": getattr(current_user, 'is_active', True)
        }
        
        # Get sample courses
        sample_courses = db.query(Course).filter(Course.is_active == True).limit(3).all()
        courses_sample = []
        for course in sample_courses:
            courses_sample.append({
                "id": course.id,
                "title": course.title,
                "is_active": course.is_active,
                "created_by": course.created_by,
                "created_at": str(course.created_at)
            })
        
        # Get enrollments for this user
        enrollments = []
        if current_user.role == "student":
            user_enrollments = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id
            ).all()
            enrollments = [{"course_id": e.course_id, "status": getattr(e, 'status', 'active')} for e in user_enrollments]
        
        debug_info = {
            "user": user_info,
            "course_counts": {
                "total_courses": total_courses,
                "active_courses": active_courses
            },
            "sample_courses": courses_sample,
            "user_enrollments": enrollments,
            "api_endpoint_working": True
        }
        
        logger.info(f"Debug info for user {current_user.email}: {debug_info}")
        return debug_info
        
    except Exception as e:
        logger.error(f"Debug endpoint error: {e}")
        return {
            "error": str(e),
            "user": {"email": current_user.email, "role": current_user.role},
            "api_endpoint_working": False
        }
    
# ALSO ADD: Enhanced get_courses with detailed debugging
@courses_router.get("/debug/detailed", response_model=List[CourseResponse])
async def get_courses_debug(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Debug version of get_courses with detailed logging"""
    try:
        logger.info(f"=== DEBUG: Starting get_courses for {current_user.email} (role: {current_user.role}) ===")
        
        # Step 1: Check database connection
        try:
            db_test = db.execute(text("SELECT 1")).scalar()
            logger.info("✅ Database connection successful")
        except Exception as db_error:
            logger.error(f"❌ Database connection failed: {db_error}")
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        # Step 2: Get all courses (ignoring active filter first)
        try:
            all_courses_count = db.query(Course).count()
            logger.info(f"📊 Total courses in database: {all_courses_count}")
        except Exception as count_error:
            logger.error(f"❌ Error counting courses: {count_error}")
        
        # Step 3: Get active courses
        try:
            query = db.query(Course).filter(Course.is_active == True)
            active_courses = query.all()
            logger.info(f"🔍 Active courses found: {len(active_courses)}")
            
            # Log first few courses for debugging
            for i, course in enumerate(active_courses[:3]):
                logger.info(f"📚 Course {i+1}: ID={course.id}, Title='{course.title}', Active={course.is_active}")
                
        except Exception as query_error:
            logger.error(f"❌ Error querying active courses: {query_error}")
            raise HTTPException(status_code=500, detail="Error querying courses")
        
        # Step 4: Apply pagination
        try:
            paginated_courses = query.offset(skip).limit(limit).all()
            logger.info(f"📄 Paginated courses (skip={skip}, limit={limit}): {len(paginated_courses)}")
        except Exception as pagination_error:
            logger.error(f"❌ Error applying pagination: {pagination_error}")
            paginated_courses = active_courses[:limit]
        
        # Step 5: Get enrollments (for students only)
        enrollments = []
        enrollment_dict = {}
        
        if current_user.role == "student":
            try:
                enrollments = db.query(Enrollment).filter(
                    Enrollment.student_id == current_user.id
                ).all()
                enrollment_dict = {e.course_id: e for e in enrollments}
                logger.info(f"🎓 Student enrollments found: {len(enrollments)}")
            except Exception as enrollment_error:
                logger.error(f"⚠️ Error fetching enrollments (continuing without): {enrollment_error}")
        else:
            logger.info(f"👨‍🏫 User is {current_user.role}, skipping enrollment check")
        
        # Step 6: Process each course
        response_courses = []
        
        for i, course in enumerate(paginated_courses):
            try:
                logger.info(f"🔄 Processing course {i+1}/{len(paginated_courses)}: {course.title}")
                
                # Calculate rating
                course._calculated_rating = calculate_course_rating(course.id, db)
                
                # Get enrollment
                enrollment = enrollment_dict.get(course.id) if current_user.role == "student" else None
                
                # Prepare response data
                course_data = prepare_course_response_data(course, enrollment, current_user.role)
                
                # Create response object
                course_response = CourseResponse(**course_data)
                response_courses.append(course_response)
                
                logger.info(f"✅ Successfully processed course {course.id}")
                
            except Exception as course_error:
                logger.error(f"❌ Error processing course {course.id}: {course_error}")
                continue
        
        logger.info(f"🎉 === DEBUG: Returning {len(response_courses)} courses to {current_user.email} ===")
        return response_courses
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Critical error in get_courses_debug: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not fetch courses: {str(e)}"
        )

# SIMPLIFIED VERSION: Basic get_courses without complex logic
@courses_router.get("/simple", response_model=List[CourseResponse])
async def get_courses_simple(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Simplified version of get_courses for debugging"""
    try:
        logger.info(f"Simple get_courses for {current_user.email}")
        
        # Get all active courses
        courses = db.query(Course).filter(Course.is_active == True).limit(10).all()
        logger.info(f"Found {len(courses)} active courses")
        
        # Simple response without enrollment logic
        response_courses = []
        for course in courses:
            try:
                simple_course_data = {
                    'id': course.id,
                    'title': course.title or 'Untitled Course',
                    'description': course.description or 'No description',
                    'short_description': course.short_description or '',
                    'instructor': course.instructor or 'Unknown',
                    'duration_hours': course.duration_hours or 0,
                    'difficulty_level': course.difficulty_level or 'beginner',
                    'category': course.category or 'General',
                    'tags': [],
                    'prerequisites': [],
                    'learning_objectives': [],
                    'thumbnail_url': course.thumbnail_url,
                    'preview_video_url': course.preview_video_url,
                    'price': course.price or 0.0,
                    'rating': 0.0,
                    'rating_count': 0,
                    'enrollment_count': 0,
                    'is_active': course.is_active,
                    'is_featured': course.is_featured or False,
                    'is_free': course.is_free or True,
                    'language': course.language or 'English',
                    'certificate_available': course.certificate_available or True,
                    'estimated_completion_time': None,
                    'created_at': course.created_at,
                    'created_by': course.created_by,
                    'is_enrolled': False,
                    'user_progress': 0.0
                }
                
                response_courses.append(CourseResponse(**simple_course_data))
                
            except Exception as course_error:
                logger.error(f"Error in simple course processing: {course_error}")
                continue
        
        logger.info(f"Returning {len(response_courses)} simple courses")
        return response_courses
        
    except Exception as e:
        logger.error(f"Error in simple get_courses: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@courses_router.get("/{course_id}/quizzes", response_model=List[QuizResponse])
async def get_quizzes(
    course_id: int, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all quizzes for a course"""
    try:
        # Check if course exists
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Check enrollment for students
        if current_user.role == "student":
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course_id
            ).first()
            
            if not enrollment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You must be enrolled in this course to view quizzes"
                )
        
        quizzes = db.query(Quiz).filter(Quiz.course_id == course_id).all()
        return [QuizResponse.from_orm(quiz) for quiz in quizzes]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quizzes for course {course_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch quizzes"
        )

@courses_router.get("/{course_id}/quizzes/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    course_id: int,
    quiz_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific quiz"""
    try:
        quiz = db.query(Quiz).filter(
            Quiz.id == quiz_id,
            Quiz.course_id == course_id
        ).first()
        
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found"
            )
        
        # Check enrollment for students
        if current_user.role == "student":
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course_id
            ).first()
            
            if not enrollment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You must be enrolled in this course to view this quiz"
                )
        
        return QuizResponse.from_orm(quiz)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quiz {quiz_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch quiz"
        )

@courses_router.post("/{course_id}/quizzes/{quiz_id}/attempt", response_model=QuizAttemptResponse)
async def attempt_quiz(
    course_id: int,
    quiz_id: int,
    attempt: QuizAttemptCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submit a quiz attempt - FIXED"""
    try:
        # Check if quiz exists
        quiz = db.query(Quiz).filter(
            Quiz.id == quiz_id, 
            Quiz.course_id == course_id
        ).first()
        
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found"
            )
        
        # Check enrollment
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == course_id
        ).first()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be enrolled in this course to take this quiz"
            )
        
        # Check attempt limits
        previous_attempts = db.query(QuizAttempt).filter(
            QuizAttempt.student_id == current_user.id,
            QuizAttempt.quiz_id == quiz_id
        ).count()
        
        if previous_attempts >= quiz.attempts_allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum attempts ({quiz.attempts_allowed}) reached"
            )
        
        # Calculate score with better error handling
        correct_answers = 0
        total_questions = len(quiz.questions)
        detailed_results = []
        
        if len(attempt.answers) != total_questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Expected {total_questions} answers, got {len(attempt.answers)}"
            )
        
        for i, question in enumerate(quiz.questions):
            is_correct = False
            student_answer = None
            
            try:
                if i < len(attempt.answers) and attempt.answers[i]:
                    student_answer = attempt.answers[i].get("answer")
                    correct_answer = question.get("correct_answer")
                    is_correct = student_answer == correct_answer
                    if is_correct:
                        correct_answers += 1
            except (IndexError, KeyError, AttributeError) as e:
                logger.warning(f"Error processing answer {i}: {e}")
                is_correct = False
                student_answer = None
            
            detailed_results.append({
                "question_index": i,
                "question": question.get("question", ""),
                "student_answer": student_answer,
                "correct_answer": question.get("correct_answer", ""),
                "is_correct": is_correct,
                "explanation": question.get("explanation", ""),
                "topic": question.get("topic", "General")
            })
        
        # Calculate scores
        score = (correct_answers / total_questions) * quiz.total_points if total_questions > 0 else 0
        percentage = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
        is_passed = percentage >= quiz.passing_score
        
        # Save attempt with better error handling
        try:
            db_attempt = QuizAttempt(
                student_id=current_user.id,
                quiz_id=quiz_id,
                attempt_number=previous_attempts + 1,
                answers=attempt.answers,
                score=score,
                max_score=quiz.total_points,
                percentage=percentage,
                is_passed=is_passed,
                time_taken_minutes=attempt.time_taken_minutes,
                attempted_at=datetime.utcnow(),
                submitted_at=datetime.utcnow()
            )
            
            db.add(db_attempt)
            db.commit()
            db.refresh(db_attempt)
            
            # Update student analytics
            update_student_analytics(current_user.id, course_id, db)
            
            logger.info(f"Quiz attempt completed: User {current_user.id}, Quiz {quiz_id}, Score: {score}")
            
            return QuizAttemptResponse(
                id=db_attempt.id,
                score=score,
                max_score=quiz.total_points,
                percentage=percentage,
                is_passed=is_passed,
                attempted_at=db_attempt.attempted_at,
                time_taken_minutes=attempt.time_taken_minutes,
                detailed_results={
                    "total_questions": total_questions,
                    "correct_answers": correct_answers,
                    "questions": detailed_results,
                    "weak_areas": analyze_weak_areas(detailed_results, quiz.questions),
                    "recommendations": generate_recommendations(percentage, detailed_results),
                    "detailed_feedback": generate_detailed_feedback(percentage, detailed_results)
                }
            )
            
        except Exception as db_error:
            logger.error(f"Database error saving quiz attempt: {db_error}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save quiz attempt"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing quiz attempt: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not process quiz attempt"
        )

def analyze_weak_areas(detailed_results: List[dict], questions: List[dict]) -> List[str]:
    """Analyze weak areas based on quiz performance"""
    weak_areas = []
    
    try:
        for result in detailed_results:
            if not result.get("is_correct", False):
                topic = result.get("topic", "General")
                if topic not in weak_areas and topic != "General":
                    weak_areas.append(topic)
        
        # If no specific topics, analyze by question categories
        if not weak_areas:
            incorrect_questions = [r for r in detailed_results if not r.get("is_correct", False)]
            if len(incorrect_questions) > len(detailed_results) * 0.3:  # More than 30% wrong
                weak_areas.append("Overall Understanding")
    except Exception as e:
        logger.error(f"Error analyzing weak areas: {e}")
        weak_areas = ["General Review Needed"]
    
    return weak_areas

def generate_recommendations(percentage: float, detailed_results: List[dict]) -> List[str]:
    """Generate study recommendations based on performance"""
    recommendations = []
    
    try:
        if percentage < 50:
            recommendations.extend([
                "Review all course materials thoroughly",
                "Consider retaking lessons you found challenging",
                "Take additional practice quizzes",
                "Seek help from instructor or peers"
            ])
        elif percentage < 70:
            recommendations.extend([
                "Focus on the topics you got wrong",
                "Review related lesson materials",
                "Practice similar questions",
                "Ask questions about unclear concepts"
            ])
        elif percentage < 85:
            recommendations.extend([
                "Great job! Review the few topics you missed",
                "Consider helping other students",
                "Try advanced practice questions"
            ])
        else:
            recommendations.extend([
                "Excellent performance! You've mastered this material",
                "Consider taking advanced courses in this area",
                "Share your knowledge with other students"
            ])
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        recommendations = ["Continue studying and practicing regularly"]
    
    return recommendations

def generate_detailed_feedback(percentage: float, detailed_results: List[dict]) -> str:
    """Generate detailed feedback based on performance"""
    try:
        total_questions = len(detailed_results)
        correct_answers = sum(1 for r in detailed_results if r.get("is_correct", False))
        
        feedback = f"You answered {correct_answers} out of {total_questions} questions correctly ({percentage:.1f}%). "
        
        if percentage >= 90:
            feedback += "Outstanding performance! You have excellent understanding of the material. "
        elif percentage >= 80:
            feedback += "Great work! You have a strong grasp of most concepts. "
        elif percentage >= 70:
            feedback += "Good job! You understand the basics well. "
        elif percentage >= 60:
            feedback += "You're on the right track, but need more practice. "
        else:
            feedback += "This material needs more attention. Don't get discouraged! "
        
        # Add specific advice based on performance patterns
        wrong_answers = [r for r in detailed_results if not r.get("is_correct", False)]
        if len(wrong_answers) > 0:
            topics = list(set(r.get("topic", "General") for r in wrong_answers))
            if len(topics) <= 2 and topics != ["General"]:
                feedback += f"Focus your review on: {', '.join(topics)}. "
            else:
                feedback += "Review the course materials comprehensively. "
        
        return feedback
    except Exception as e:
        logger.error(f"Error generating detailed feedback: {e}")
        return "Keep studying and practicing to improve your understanding."

# Enrollment routes

@courses_router.post("/{course_id}/enroll", response_model=EnrollmentResponse)
async def enroll_course(
    course_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Enhanced enrollment with immediate response"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can enroll in courses"
        )
    
    try:
        # Check if already enrolled
        existing_enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == course_id
        ).first()
        
        if existing_enrollment:
            # ✅ Return existing enrollment instead of error
            return existing_enrollment
        
        # Create new enrollment
        enrollment = Enrollment(
            student_id=current_user.id,
            course_id=course_id,
            enrolled_at=datetime.utcnow(),
            status="active"
        )
        
        db.add(enrollment)
        
        # Update course enrollment count
        course = db.query(Course).filter(Course.id == course_id).first()
        if course:
            course.enrollment_count = (course.enrollment_count or 0) + 1
        
        db.commit()
        db.refresh(enrollment)
        
        logger.info(f"Student {current_user.id} enrolled in course {course_id}")
        
        # ✅ Return complete enrollment data
        return enrollment
        
    except Exception as e:
        logger.error(f"Enrollment error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not complete enrollment"
        )


@courses_router.delete("/{course_id}/enroll")
async def unenroll_course(
    course_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Unenroll from a course"""
    try:
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == course_id
        ).first()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Enrollment not found"
            )
        
        db.delete(enrollment)
        db.commit()
        
        # Update course enrollment count
        update_enrollment_count(course_id, db)
        
        logger.info(f"User {current_user.id} unenrolled from course {course_id}")
        return {"message": "Unenrolled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unenrolling from course {course_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not unenroll from course"
        )

# Video upload route
@courses_router.post("/{course_id}/lessons/{lesson_id}/upload-video")
async def upload_video(
    course_id: int,
    lesson_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload video for a lesson"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can upload videos"
        )
    
    try:
        # Check if lesson exists and user has permission
        lesson = db.query(Lesson).filter(
            Lesson.id == lesson_id, 
            Lesson.course_id == course_id
        ).first()
        
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson not found"
            )
        
        course = db.query(Course).filter(Course.id == course_id).first()
        if current_user.role != "admin" and course.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only upload videos to courses you created"
            )
        
        # Validate file type
        allowed_extensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']
        if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid video file format. Supported formats: " + ", ".join(allowed_extensions)
            )
        
        # Validate file size (limit to 500MB)
        max_size = 500 * 1024 * 1024  # 500MB in bytes
        if file.size and file.size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 500MB"
            )
        
        # Create uploads directory
        upload_dir = "static/uploads/videos"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        filename = f"lesson_{lesson_id}_{timestamp}{file_extension}"
        file_path = os.path.join(upload_dir, filename)
        
        # Save file
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as upload_error:
            logger.error(f"File upload error: {upload_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save uploaded file"
            )
        
        # Update lesson with video URL
        lesson.video_url = f"/static/uploads/videos/{filename}"
        db.commit()
        
        logger.info(f"Video uploaded for lesson {lesson_id}: {filename}")
        return {
            "message": "Video uploaded successfully", 
            "video_url": lesson.video_url,
            "filename": filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading video: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not upload video"
        )

# FIXED Search routes with enhanced functionality and proper error handling

# ALSO UPDATE: Your search function to handle interval conversion
# FIXED: Search courses with proper student visibility
@courses_router.get("/search")
async def search_courses(
    q: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    min_rating: Optional[float] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Enhanced search courses - FIXED for student visibility"""
    try:
        logger.info(f"Searching courses for user: {current_user.email} (role: {current_user.role})")
        
        # Base query - all active courses are searchable by everyone
        query = db.query(Course).filter(Course.is_active == True)
        
        # Apply search filters
        if q and q.strip():
            search_term = f"%{q.strip()}%"
            query = query.filter(
                Course.title.ilike(search_term) |
                Course.description.ilike(search_term) |
                Course.instructor.ilike(search_term)
            )
            logger.info(f"Applied text search filter: {q}")
        
        if category:
            query = query.filter(Course.category == category)
            logger.info(f"Applied category filter: {category}")
            
        if difficulty:
            query = query.filter(Course.difficulty_level == difficulty)
            logger.info(f"Applied difficulty filter: {difficulty}")
            
        if min_rating:
            query = query.filter(Course.rating >= min_rating)
            logger.info(f"Applied rating filter: {min_rating}")
        
        # Execute search
        courses = query.limit(50).all()
        logger.info(f"Search found {len(courses)} courses")
        
        # Get user enrollments efficiently (only for students)
        enrollments = []
        enrollment_dict = {}
        
        if current_user.role == "student":
            try:
                enrollments = db.query(Enrollment).filter(
                    Enrollment.student_id == current_user.id
                ).all()
                enrollment_dict = {e.course_id: e for e in enrollments}
                logger.info(f"Found {len(enrollments)} enrollments for student search")
            except Exception as enrollment_error:
                logger.error(f"Error fetching enrollments for student search: {enrollment_error}")
        
        # Process search results
        response_courses = []
        for course in courses:
            try:
                # Pre-calculate rating
                course._calculated_rating = calculate_course_rating(course.id, db)
                
                # Get enrollment for this course (if student)
                enrollment = enrollment_dict.get(course.id) if current_user.role == "student" else None
                
                # Prepare response data
                course_data = prepare_course_response_data(course, enrollment, current_user.role)
                
                # Create response object
                course_response = CourseResponse(**course_data)
                response_courses.append(course_response)
                
            except Exception as course_error:
                logger.error(f"Error processing course {course.id} in search: {course_error}")
                continue
        
        logger.info(f"Returning {len(response_courses)} search results to user {current_user.email}")
        return response_courses
        
    except Exception as e:
        logger.error(f"Error searching courses for user {current_user.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not search courses"
        )
# Additional search-related endpoints

@courses_router.get("/search/suggestions")
async def get_search_suggestions(
    q: str,
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get search suggestions for autocomplete"""
    try:
        if not q or len(q.strip()) < 2:
            return {"suggestions": []}
        
        search_term = f"%{q.strip()}%"
        
        # Get title suggestions
        title_suggestions = db.query(Course.title).filter(
            Course.is_active == True,
            Course.title.ilike(search_term)
        ).limit(limit // 2).all()
        
        # Get instructor suggestions
        instructor_suggestions = db.query(Course.instructor).filter(
            Course.is_active == True,
            Course.instructor.ilike(search_term)
        ).distinct().limit(limit // 2).all()
        
        # Get category suggestions
        category_suggestions = db.query(Course.category).filter(
            Course.is_active == True,
            Course.category.ilike(search_term)
        ).distinct().limit(limit // 3).all()
        
        # Combine and format suggestions
        suggestions = []
        
        # Add course titles
        for title in title_suggestions:
            if title[0] not in suggestions:
                suggestions.append({
                    "type": "course",
                    "text": title[0],
                    "category": "Courses"
                })
        
        # Add instructors
        for instructor in instructor_suggestions:
            if instructor[0] not in [s["text"] for s in suggestions]:
                suggestions.append({
                    "type": "instructor",
                    "text": instructor[0],
                    "category": "Instructors"
                })
        
        # Add categories
        for category in category_suggestions:
            if category[0] and category[0] not in [s["text"] for s in suggestions]:
                suggestions.append({
                    "type": "category",
                    "text": category[0],
                    "category": "Categories"
                })
        
        return {"suggestions": suggestions[:limit]}
        
    except Exception as e:
        logger.error(f"Error getting search suggestions: {e}")
        return {"suggestions": []}

@courses_router.get("/search/filters")
async def get_search_filters(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get available filter options for search"""
    try:
        # Get unique categories
        categories = db.query(Course.category).filter(
            Course.is_active == True,
            Course.category.isnot(None)
        ).distinct().all()
        
        # Get unique languages
        languages = db.query(Course.language).filter(
            Course.is_active == True,
            Course.language.isnot(None)
        ).distinct().all()
        
        # Get unique instructors
        instructors = db.query(Course.instructor).filter(
            Course.is_active == True,
            Course.instructor.isnot(None)
        ).distinct().limit(50).all()  # Limit to avoid too many results
        
        # Get price ranges
        price_stats = db.query(
            func.min(Course.price),
            func.max(Course.price),
            func.avg(Course.price)
        ).filter(
            Course.is_active == True,
            Course.price > 0
        ).first()
        
        return {
            "categories": sorted([cat[0] for cat in categories if cat[0]]),
            "difficulties": ["beginner", "intermediate", "advanced"],
            "languages": sorted([lang[0] for lang in languages if lang[0]]),
            "instructors": sorted([inst[0] for inst in instructors if inst[0]]),
            "price_range": {
                "min": float(price_stats[0]) if price_stats[0] else 0,
                "max": float(price_stats[1]) if price_stats[1] else 0,
                "avg": float(price_stats[2]) if price_stats[2] else 0
            },
            "sort_options": [
                {"value": "relevance", "label": "Relevance"},
                {"value": "rating", "label": "Highest Rated"},
                {"value": "enrollment", "label": "Most Popular"},
                {"value": "newest", "label": "Newest"},
                {"value": "price", "label": "Price: Low to High"},
                {"value": "title", "label": "Alphabetical"}
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting search filters: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch search filters"
        )

# Enhanced search with full-text search (if using PostgreSQL)
@courses_router.get("/search/advanced")
async def advanced_search_courses(
    q: Optional[str] = None,
    tags: Optional[str] = None,  # Comma-separated tags
    has_certificate: Optional[bool] = None,
    duration_min: Optional[float] = None,
    duration_max: Optional[float] = None,
    created_after: Optional[str] = None,  # ISO date string
    created_before: Optional[str] = None,  # ISO date string
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Advanced search with additional filters"""
    try:
        query = db.query(Course).filter(Course.is_active == True)
        
        # Text search
        if q and q.strip():
            search_term = f"%{q.strip()}%"
            query = query.filter(
                Course.title.ilike(search_term) |
                Course.description.ilike(search_term) |
                Course.instructor.ilike(search_term) |
                Course.short_description.ilike(search_term)
            )
        
        # Tags search
        if tags and tags.strip():
            tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
            for tag in tag_list:
                # For PostgreSQL, you might use: Course.tags.contains([tag])
                # For SQLite/MySQL, we'll use a JSON contains approach
                query = query.filter(Course.tags.contains(tag))
        
        # Certificate availability
        if has_certificate is not None:
            query = query.filter(Course.certificate_available == has_certificate)
        
        # Duration filters
        if duration_min is not None:
            query = query.filter(Course.duration_hours >= duration_min)
        
        if duration_max is not None:
            query = query.filter(Course.duration_hours <= duration_max)
        
        # Date filters
        if created_after:
            try:
                after_date = datetime.fromisoformat(created_after.replace('Z', '+00:00'))
                query = query.filter(Course.created_at >= after_date)
            except ValueError:
                pass  # Ignore invalid date format
        
        if created_before:
            try:
                before_date = datetime.fromisoformat(created_before.replace('Z', '+00:00'))
                query = query.filter(Course.created_at <= before_date)
            except ValueError:
                pass  # Ignore invalid date format
        
        # Execute query with limit
        courses = query.limit(50).all()
        
        # Format response (similar to basic search)
        response_courses = []
        enrollment_dict = {}
        
        if current_user.role == "student":
            enrollments = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id
            ).all()
            enrollment_dict = {e.course_id: e for e in enrollments}
        
        for course in courses:
            course_response = CourseResponse.from_orm(course)
            course_response.rating = calculate_course_rating(course.id, db)
            
            if current_user.role == "student":
                enrollment = enrollment_dict.get(course.id)
                course_response.is_enrolled = enrollment is not None
                course_response.user_progress = enrollment.progress_percentage if enrollment else 0.0
            else:
                course_response.is_enrolled = False
                course_response.user_progress = 0.0
            
            response_courses.append(course_response)
        
        return response_courses
        
    except Exception as e:
        logger.error(f"Error in advanced search: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not perform advanced search"
        )

# FIXED: Get courses with proper student visibility
# COMPLETELY REWRITTEN: Main courses endpoint that actually works
@courses_router.get("/", response_model=List[CourseResponse])
async def get_courses(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all courses - FIXED to properly show enrollment status and progress"""
    try:
        logger.info(f"📚 GET /courses/ called by {current_user.email} (role: {current_user.role})")
        
        # Base query for active courses
        query = db.query(Course).filter(Course.is_active == True)
        
        # Apply search filters
        if search and search.strip():
            search_term = f"%{search.strip()}%"
            query = query.filter(
                Course.title.ilike(search_term) |
                Course.description.ilike(search_term) |
                Course.instructor.ilike(search_term)
            )
            logger.info(f"🔍 Applied search filter: {search}")
        
        if category:
            query = query.filter(Course.category == category)
            logger.info(f"📂 Applied category filter: {category}")
            
        if difficulty:
            query = query.filter(Course.difficulty_level == difficulty)
            logger.info(f"📊 Applied difficulty filter: {difficulty}")
        
        # Apply pagination and execute query
        courses = query.offset(skip).limit(limit).all()
        logger.info(f"✅ Found {len(courses)} courses in database")
        
        if not courses:
            logger.info("📝 No courses found, returning empty list")
            return []
        
        # CRITICAL FIX: Get ALL user enrollments at once for efficiency
        enrollments = []
        enrollment_dict = {}
        
        if current_user.role == "student":
            try:
                enrollments = db.query(Enrollment).filter(
                    Enrollment.student_id == current_user.id
                ).all()
                enrollment_dict = {e.course_id: e for e in enrollments}
                logger.info(f"🎓 Found {len(enrollments)} enrollments for student {current_user.id}")
                
                # Log specific enrollments for debugging
                for enrollment in enrollments:
                    logger.info(f"   - Course {enrollment.course_id}: Progress {enrollment.progress_percentage}%, Status: {enrollment.status}")
                    
            except Exception as enrollment_error:
                logger.error(f"⚠️ Could not fetch enrollments: {enrollment_error}")
        
        # Process each course and add enrollment info
        response_courses = []
        
        for i, course in enumerate(courses):
            try:
                logger.debug(f"🔄 Processing course {i+1}: {course.title} (ID: {course.id})")
                
                # Get enrollment for this specific course
                enrollment = enrollment_dict.get(course.id) if current_user.role == "student" else None
                
                # FIXED: Calculate rating properly
                try:
                    avg_rating = calculate_course_rating(course.id, db)
                except Exception as rating_error:
                    logger.warning(f"Could not calculate rating for course {course.id}: {rating_error}")
                    avg_rating = course.rating or 0.0
                
                # FIXED: Build complete course data with enrollment info
                course_data = {
                    'id': course.id,
                    'title': course.title or f'Course {course.id}',
                    'description': course.description or 'No description available',
                    'short_description': course.short_description or '',
                    'instructor': course.instructor or 'Unknown Instructor',
                    'duration_hours': course.duration_hours or 0,
                    'difficulty_level': course.difficulty_level or 'beginner',
                    'category': course.category or 'General',
                    'thumbnail_url': course.thumbnail_url,
                    'preview_video_url': course.preview_video_url,
                    'price': course.price or 0.0,
                    'rating': avg_rating,
                    'rating_count': course.rating_count or 0,
                    'enrollment_count': course.enrollment_count or 0,
                    'is_active': course.is_active,
                    'is_featured': course.is_featured or False,
                    'is_free': course.is_free if course.is_free is not None else True,
                    'language': course.language or 'English',
                    'certificate_available': course.certificate_available if course.certificate_available is not None else True,
                    'created_at': course.created_at,
                    'created_by': course.created_by,
                }
                
                # Handle JSON fields safely
                course_data['tags'] = safe_json_parse(course.tags, [])
                course_data['prerequisites'] = safe_json_parse(course.prerequisites, [])
                course_data['learning_objectives'] = safe_json_parse(course.learning_objectives, [])
                
                # Handle interval field safely
                try:
                    estimated_time = course.estimated_completion_time
                    course_data['estimated_completion_time'] = convert_interval_to_days(estimated_time)
                except:
                    course_data['estimated_completion_time'] = None
                
                # CRITICAL FIX: Properly set enrollment status and progress
                if enrollment:
                    course_data['is_enrolled'] = True
                    course_data['user_progress'] = enrollment.progress_percentage or 0.0
                    logger.info(f"   ✅ Course {course.id} - ENROLLED with {course_data['user_progress']}% progress")
                else:
                    course_data['is_enrolled'] = False
                    course_data['user_progress'] = 0.0
                    if current_user.role == "student":
                        logger.info(f"   ❌ Course {course.id} - NOT ENROLLED")
                
                # Create CourseResponse object
                course_response = CourseResponse(**course_data)
                response_courses.append(course_response)
                
                logger.debug(f"✅ Successfully processed course {course.id}")
                
            except Exception as course_error:
                logger.error(f"❌ Error processing course {course.id}: {course_error}")
                continue
        
        logger.info(f"🎉 Successfully returning {len(response_courses)} courses to {current_user.email}")
        
        # DEBUG: Log enrollment summary
        if current_user.role == "student":
            enrolled_courses = [c for c in response_courses if c.is_enrolled]
            logger.info(f"📊 ENROLLMENT SUMMARY for {current_user.email}:")
            logger.info(f"   - Total courses: {len(response_courses)}")
            logger.info(f"   - Enrolled courses: {len(enrolled_courses)}")
            for enrolled_course in enrolled_courses:
                logger.info(f"   - {enrolled_course.title}: {enrolled_course.user_progress}% complete")
        
        return response_courses
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Critical error in get_courses: {e}")
        # Return empty list instead of throwing error
        return []

@courses_router.get("/my-enrollments", response_model=List[EnrollmentResponse])
async def get_my_enrollments(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's enrollments"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only students can access their enrollments"
        )

    try:
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id
        ).all()
        return enrollments
    except Exception as e:
        logger.error(f"Failed to fetch enrollments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch enrollments"
        )

# FIXED: Get single course with proper student access
@courses_router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: int, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific course - FIXED with proper enrollment data"""
    try:
        logger.info(f"Getting course {course_id} for user: {current_user.email} (role: {current_user.role})")
        
        # Get course
        course = db.query(Course).filter(
            Course.id == course_id, 
            Course.is_active == True
        ).first()
        
        if not course:
            logger.warning(f"Course {course_id} not found or inactive")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Calculate rating and enrollment count
        avg_rating = calculate_course_rating(course_id, db)
        enrollment_count = db.query(Enrollment).filter(Enrollment.course_id == course_id).count()
        
        # CRITICAL FIX: Get enrollment with all details for students
        enrollment = None
        enrollment_data = {}
        
        if current_user.role == "student":
            try:
                enrollment = db.query(Enrollment).filter(
                    Enrollment.student_id == current_user.id,
                    Enrollment.course_id == course_id
                ).first()
                
                if enrollment:
                    logger.info(f"✅ Student {current_user.id} IS enrolled in course {course_id}")
                    logger.info(f"   - Progress: {enrollment.progress_percentage}%")
                    logger.info(f"   - Status: {enrollment.status}")
                    logger.info(f"   - Enrolled at: {enrollment.enrolled_at}")
                    
                    # Get completed lessons and quizzes for this course
                    completed_lessons = db.query(LessonProgress).filter(
                        LessonProgress.student_id == current_user.id,
                        LessonProgress.course_id == course_id,
                        LessonProgress.is_completed == True
                    ).all()
                    
                    completed_quizzes = db.query(QuizAttempt).filter(
                        QuizAttempt.student_id == current_user.id,
                        QuizAttempt.quiz_id.in_(
                            db.query(Quiz.id).filter(Quiz.course_id == course_id)
                        ),
                        QuizAttempt.is_passed == True
                    ).distinct(QuizAttempt.quiz_id).all()
                    
                    enrollment_data = {
                        'enrollment_data': {
                            'enrolled_at': enrollment.enrolled_at,
                            'status': enrollment.status,
                            'last_accessed': enrollment.last_accessed,
                        },
                        'enrollment_status': enrollment.status,
                        'completed_lessons': [cp.lesson_id for cp in completed_lessons],
                        'completed_quizzes': [cq.quiz_id for cq in completed_quizzes],
                        'last_accessed': enrollment.last_accessed,
                        'enrolled_at': enrollment.enrolled_at,
                    }
                else:
                    logger.info(f"❌ Student {current_user.id} is NOT enrolled in course {course_id}")
                    
            except Exception as enrollment_error:
                logger.error(f"Error checking enrollment for student {current_user.id} in course {course_id}: {enrollment_error}")
        
        # Build response data
        course_data = {
            'id': course.id,
            'title': course.title,
            'description': course.description,
            'short_description': course.short_description,
            'instructor': course.instructor,
            'duration_hours': course.duration_hours,
            'difficulty_level': course.difficulty_level,
            'category': course.category,
            'tags': safe_json_parse(course.tags, []),
            'prerequisites': safe_json_parse(course.prerequisites, []),
            'learning_objectives': safe_json_parse(course.learning_objectives, []),
            'thumbnail_url': course.thumbnail_url,
            'preview_video_url': course.preview_video_url,
            'price': course.price or 0.0,
            'rating': avg_rating,
            'rating_count': course.rating_count or 0,
            'enrollment_count': enrollment_count,
            'is_active': course.is_active,
            'is_featured': course.is_featured or False,
            'is_free': course.is_free if course.is_free is not None else True,
            'language': course.language or 'English',
            'certificate_available': course.certificate_available if course.certificate_available is not None else True,
            'estimated_completion_time': convert_interval_to_days(course.estimated_completion_time),
            'created_at': course.created_at,
            'created_by': course.created_by,
            'is_enrolled': enrollment is not None,
            'user_progress': enrollment.progress_percentage if enrollment else 0.0,
        }
        
        # Add enrollment-specific data
        course_data.update(enrollment_data)
        
        response = CourseResponse(**course_data)
        
        logger.info(f"✅ Successfully returning course {course_id} to user {current_user.email}")
        logger.info(f"   - Enrolled: {response.is_enrolled}")
        logger.info(f"   - Progress: {response.user_progress}%")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching course {course_id} for user {current_user.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch course"
        )

# FIXED: Add endpoint to get only enrolled courses
@courses_router.get("/enrolled/list", response_model=List[CourseResponse])
async def get_enrolled_courses(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get only courses that the student is enrolled in"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access enrolled courses"
        )
    
    try:
        logger.info(f"📚 Getting enrolled courses for student {current_user.email}")
        
        # Get all enrollments for this student
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id
        ).all()
        
        if not enrollments:
            logger.info(f"No enrollments found for student {current_user.id}")
            return []
        
        # Get the courses for these enrollments
        course_ids = [e.course_id for e in enrollments]
        courses = db.query(Course).filter(
            Course.id.in_(course_ids),
            Course.is_active == True
        ).all()
        
        # Create enrollment lookup
        enrollment_dict = {e.course_id: e for e in enrollments}
        
        # Build response
        response_courses = []
        for course in courses:
            enrollment = enrollment_dict[course.id]
            
            # Get completed lessons and quizzes
            completed_lessons = db.query(LessonProgress).filter(
                LessonProgress.student_id == current_user.id,
                LessonProgress.course_id == course.id,
                LessonProgress.is_completed == True
            ).count()
            
            total_lessons = db.query(Lesson).filter(Lesson.course_id == course.id).count()
            
            course_data = {
                'id': course.id,
                'title': course.title,
                'description': course.description,
                'short_description': course.short_description,
                'instructor': course.instructor,
                'duration_hours': course.duration_hours,
                'difficulty_level': course.difficulty_level,
                'category': course.category,
                'tags': safe_json_parse(course.tags, []),
                'prerequisites': safe_json_parse(course.prerequisites, []),
                'learning_objectives': safe_json_parse(course.learning_objectives, []),
                'thumbnail_url': course.thumbnail_url,
                'preview_video_url': course.preview_video_url,
                'price': course.price or 0.0,
                'rating': calculate_course_rating(course.id, db),
                'rating_count': course.rating_count or 0,
                'enrollment_count': course.enrollment_count or 0,
                'is_active': course.is_active,
                'is_featured': course.is_featured or False,
                'is_free': course.is_free if course.is_free is not None else True,
                'language': course.language or 'English',
                'certificate_available': course.certificate_available if course.certificate_available is not None else True,
                'estimated_completion_time': convert_interval_to_days(course.estimated_completion_time),
                'created_at': course.created_at,
                'created_by': course.created_by,
                'is_enrolled': True,  # All courses in this list are enrolled
                'user_progress': enrollment.progress_percentage or 0.0,
                'enrollment_data': {
                    'enrolled_at': enrollment.enrolled_at,
                    'status': enrollment.status,
                    'last_accessed': enrollment.last_accessed,
                },
                'enrollment_status': enrollment.status,
                'enrolled_at': enrollment.enrolled_at,
                'last_accessed': enrollment.last_accessed,
            }
            
            response_courses.append(CourseResponse(**course_data))
        
        logger.info(f"✅ Returning {len(response_courses)} enrolled courses for {current_user.email}")
        return response_courses
        
    except Exception as e:
        logger.error(f"Error getting enrolled courses for {current_user.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch enrolled courses"
        )

# FIXED: Course update with proper interval handling and JSON parsing
@courses_router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    course: CourseUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a course - FIXED for interval type and JSON parsing"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can update courses"
        )
    
    try:
        db_course = db.query(Course).filter(Course.id == course_id).first()
        if not db_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Check if user owns the course (unless admin)
        if current_user.role != "admin" and db_course.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit courses you created"
            )
        
        # Update only provided fields
        update_data = course.dict(exclude_unset=True)
        
        for key, value in update_data.items():
            if key == 'estimated_completion_time' and value is not None:
                # Convert days to interval for database storage
                setattr(db_course, key, convert_days_to_interval(value))
            else:
                setattr(db_course, key, value)
        
        db_course.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_course)
        
        logger.info(f"Course updated: {db_course.title} by {current_user.email}")
        
        # FIXED: Use helper function to prepare response data
        response_data = prepare_course_response_data(db_course, None)
        
        return CourseResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating course {course_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update course"
        )



@courses_router.delete("/{course_id}")
async def delete_course(
    course_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete (deactivate) a course"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can delete courses"
        )
    
    try:
        db_course = db.query(Course).filter(Course.id == course_id).first()
        if not db_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Check ownership
        if current_user.role != "admin" and db_course.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete courses you created"
            )
        
        # Soft delete by setting is_active to False
        db_course.is_active = False
        db_course.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Course deleted: {db_course.title} by {current_user.email}")
        return {"message": "Course deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting course {course_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete course"
        )

# FIXED Lesson Management Routes
@courses_router.post("/{course_id}/lessons", response_model=LessonResponse)
async def create_lesson(
    course_id: int,
    lesson: LessonCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new lesson - FIXED"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can create lessons"
        )
    
    try:
        # Check if course exists and user has permission
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        if current_user.role != "admin" and course.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only add lessons to courses you created"
            )
        
        # Check if order is already taken and adjust if necessary
        existing_lesson = db.query(Lesson).filter(
            Lesson.course_id == course_id,
            Lesson.order == lesson.order
        ).first()
        
        if existing_lesson:
            # Auto-increment order to next available
            max_order = db.query(func.max(Lesson.order)).filter(
                Lesson.course_id == course_id
            ).scalar() or 0
            lesson.order = max_order + 1
        
        # Create lesson with proper error handling
        db_lesson = Lesson(
            course_id=course_id,
            title=lesson.title,
            description=lesson.description,
            video_url=lesson.video_url,
            duration_minutes=lesson.duration_minutes,
            order=lesson.order,
            lesson_type=lesson.lesson_type,
            content=lesson.content,
            transcript=lesson.transcript,
            resources=lesson.resources,
            is_preview=lesson.is_preview,
            is_mandatory=lesson.is_mandatory,
            points=lesson.points,
            created_at=datetime.utcnow()
        )
        
        db.add(db_lesson)
        db.commit()
        db.refresh(db_lesson)
        
        logger.info(f"Lesson created: {lesson.title} for course {course_id} by {current_user.email}")
        
        response = LessonResponse.from_orm(db_lesson)
        response.is_completed = False
        response.user_progress = 0.0
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating lesson: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not create lesson: {str(e)}"
        )

@courses_router.get("/{course_id}/lessons", response_model=List[LessonResponse])
async def get_lessons(
    course_id: int, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all lessons for a course"""
    try:
        # Check if course exists
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Get lessons ordered by order field
        lessons = db.query(Lesson).filter(
            Lesson.course_id == course_id
        ).order_by(Lesson.order).all()
        
        # Add completion status for students
        response_lessons = []
        for lesson in lessons:
            lesson_response = LessonResponse.from_orm(lesson)
            
            if current_user.role == "student":
                lesson_response.is_completed = calculate_lesson_progress(
                    current_user.id, lesson.id, db
                )
                # Get progress percentage if available
                progress = db.query(LessonProgress).filter(
                    LessonProgress.student_id == current_user.id,
                    LessonProgress.lesson_id == lesson.id
                ).first()
                lesson_response.user_progress = progress.completion_percentage if progress else 0.0
            else:
                lesson_response.is_completed = False
                lesson_response.user_progress = 0.0
            
            response_lessons.append(lesson_response)
        
        return response_lessons
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching lessons for course {course_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch lessons"
        )

@courses_router.put("/{course_id}/lessons/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    course_id: int,
    lesson_id: int,
    lesson_update: LessonUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a lesson"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can update lessons"
        )
    
    try:
        lesson = db.query(Lesson).filter(
            Lesson.id == lesson_id,
            Lesson.course_id == course_id
        ).first()
        
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson not found"
            )
        
        # Check permission
        course = db.query(Course).filter(Course.id == course_id).first()
        if current_user.role != "admin" and course.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update lessons in courses you created"
            )
        
        # Update lesson fields
        update_data = lesson_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(lesson, field, value)
        
        lesson.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(lesson)
        
        logger.info(f"Lesson updated: {lesson.title} by {current_user.email}")
        
        response = LessonResponse.from_orm(lesson)
        response.is_completed = False
        response.user_progress = 0.0
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lesson: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update lesson"
        )

@courses_router.delete("/{course_id}/lessons/{lesson_id}")
async def delete_lesson(
    course_id: int,
    lesson_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a lesson"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can delete lessons"
        )
    
    try:
        lesson = db.query(Lesson).filter(
            Lesson.id == lesson_id,
            Lesson.course_id == course_id
        ).first()
        
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson not found"
            )
        
        # Check permission
        course = db.query(Course).filter(Course.id == course_id).first()
        if current_user.role != "admin" and course.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete lessons from courses you created"
            )
        
        # Delete the lesson
        db.delete(lesson)
        db.commit()
        
        logger.info(f"Lesson deleted: {lesson.title} by {current_user.email}")
        return {"message": "Lesson deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting lesson: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete lesson"
        )

# FIXED Quiz Management Routes
@courses_router.post("/{course_id}/quizzes", response_model=QuizResponse)
async def create_quiz(
    course_id: int,
    quiz: QuizCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new quiz - FIXED"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can create quizzes"
        )
    
    try:
        # Check if course exists and user has permission
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        if current_user.role != "admin" and course.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only add quizzes to courses you created"
            )
        
        # Create quiz with proper error handling
        db_quiz = Quiz(
            course_id=course_id,
            title=quiz.title,
            description=quiz.description,
            instructions=quiz.instructions,
            questions=quiz.questions,
            total_points=quiz.total_points,
            time_limit_minutes=quiz.time_limit_minutes,
            passing_score=quiz.passing_score,
            attempts_allowed=quiz.attempts_allowed,
            randomize_questions=quiz.randomize_questions,
            randomize_answers=quiz.randomize_answers,
            show_correct_answers=quiz.show_correct_answers,
            is_mandatory=quiz.is_mandatory,
            created_at=datetime.utcnow()
        )
        
        db.add(db_quiz)
        db.commit()
        db.refresh(db_quiz)
        
        # CONTINUATION FROM WHERE THE CODE WAS CUT OFF - COURSES.PY

        logger.info(f"Quiz created: {quiz.title} for course {course_id} by {current_user.email}")
        
        return QuizResponse.from_orm(db_quiz)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating quiz: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not create quiz: {str(e)}"
        )

@courses_router.get("/{course_id}/quizzes", response_model=List[QuizResponse])
async def get_quizzes(
    course_id: int, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all quizzes for a course"""
    try:
        # Check if course exists
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Check enrollment for students
        if current_user.role == "student":
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course_id
            ).first()
            
            if not enrollment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You must be enrolled in this course to view quizzes"
                )
        
        quizzes = db.query(Quiz).filter(Quiz.course_id == course_id).all()
        return [QuizResponse.from_orm(quiz) for quiz in quizzes]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quizzes for course {course_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch quizzes"
        )

@courses_router.get("/{course_id}/quizzes/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    course_id: int,
    quiz_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific quiz"""
    try:
        quiz = db.query(Quiz).filter(
            Quiz.id == quiz_id,
            Quiz.course_id == course_id
        ).first()
        
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found"
            )
        
        # Check enrollment for students
        if current_user.role == "student":
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course_id
            ).first()
            
            if not enrollment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You must be enrolled in this course to view this quiz"
                )
        
        return QuizResponse.from_orm(quiz)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quiz {quiz_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch quiz"
        )

@courses_router.put("/{course_id}/quizzes/{quiz_id}", response_model=QuizResponse)
async def update_quiz(
    course_id: int,
    quiz_id: int,
    quiz_update: QuizCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a quiz"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can update quizzes"
        )
    
    try:
        quiz = db.query(Quiz).filter(
            Quiz.id == quiz_id,
            Quiz.course_id == course_id
        ).first()
        
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found"
            )
        
        # Check permission
        course = db.query(Course).filter(Course.id == course_id).first()
        if current_user.role != "admin" and course.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update quizzes in courses you created"
            )
        
        # Update quiz fields
        quiz.title = quiz_update.title
        quiz.description = quiz_update.description
        quiz.instructions = quiz_update.instructions
        quiz.questions = quiz_update.questions
        quiz.total_points = quiz_update.total_points
        quiz.time_limit_minutes = quiz_update.time_limit_minutes
        quiz.passing_score = quiz_update.passing_score
        quiz.attempts_allowed = quiz_update.attempts_allowed
        quiz.randomize_questions = quiz_update.randomize_questions
        quiz.randomize_answers = quiz_update.randomize_answers
        quiz.show_correct_answers = quiz_update.show_correct_answers
        quiz.is_mandatory = quiz_update.is_mandatory
        quiz.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(quiz)
        
        logger.info(f"Quiz updated: {quiz.title} by {current_user.email}")
        return QuizResponse.from_orm(quiz)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating quiz: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update quiz"
        )

@courses_router.delete("/{course_id}/quizzes/{quiz_id}")
async def delete_quiz(
    course_id: int,
    quiz_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a quiz"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can delete quizzes"
        )
    
    try:
        quiz = db.query(Quiz).filter(
            Quiz.id == quiz_id,
            Quiz.course_id == course_id
        ).first()
        
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found"
            )
        
        # Check permission
        course = db.query(Course).filter(Course.id == course_id).first()
        if current_user.role != "admin" and course.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete quizzes from courses you created"
            )
        
        # Delete quiz and related attempts
        db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).delete()
        db.delete(quiz)
        db.commit()
        
        logger.info(f"Quiz deleted: {quiz.title} by {current_user.email}")
        return {"message": "Quiz deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting quiz: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete quiz"
        )

@courses_router.get("/{course_id}/quizzes/{quiz_id}/attempts", response_model=List[QuizAttemptResponse])
async def get_quiz_attempts(
    course_id: int,
    quiz_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get quiz attempts for a specific quiz"""
    try:
        # Check if quiz exists
        quiz = db.query(Quiz).filter(
            Quiz.id == quiz_id,
            Quiz.course_id == course_id
        ).first()
        
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found"
            )
        
        # For students, only show their own attempts
        if current_user.role == "student":
            # Check enrollment
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course_id
            ).first()
            
            if not enrollment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You must be enrolled in this course"
                )
            
            attempts = db.query(QuizAttempt).filter(
                QuizAttempt.quiz_id == quiz_id,
                QuizAttempt.student_id == current_user.id
            ).order_by(desc(QuizAttempt.attempted_at)).all()
        
        # For instructors and admins, show all attempts
        else:
            course = db.query(Course).filter(Course.id == course_id).first()
            if current_user.role != "admin" and course.created_by != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view attempts for courses you created"
                )
            
            attempts = db.query(QuizAttempt).filter(
                QuizAttempt.quiz_id == quiz_id
            ).order_by(desc(QuizAttempt.attempted_at)).all()
        
        return [QuizAttemptResponse.from_orm(attempt) for attempt in attempts]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quiz attempts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch quiz attempts"
        )

# Course Reviews
@courses_router.get("/{course_id}/reviews")
async def get_course_reviews(
    course_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get reviews for a course"""
    try:
        from models import CourseReview
        
        # Check if course exists
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        reviews = db.query(CourseReview).filter(
            CourseReview.course_id == course_id
        ).order_by(desc(CourseReview.created_at)).offset(skip).limit(limit).all()
        
        # Include user information in reviews
        review_data = []
        for review in reviews:
            user = db.query(User).filter(User.id == review.student_id).first()
            review_data.append({
                "id": review.id,
                "rating": review.rating,
                "comment": review.comment,
                "created_at": review.created_at,
                "student_name": f"{user.first_name} {user.last_name}" if user else "Anonymous",
                "is_verified": review.is_verified
            })
        
        return review_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching course reviews: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch course reviews"
        )

@courses_router.post("/{course_id}/reviews")
async def add_course_review(
    course_id: int,
    review_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add a review for a course"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can add reviews"
        )
    
    try:
        from models import CourseReview
        
        # Check if course exists
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Check if student is enrolled
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == course_id
        ).first()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be enrolled in this course to leave a review"
            )
        
        # Check if review already exists
        existing_review = db.query(CourseReview).filter(
            CourseReview.student_id == current_user.id,
            CourseReview.course_id == course_id
        ).first()
        
        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already reviewed this course"
            )
        
        # Validate rating
        rating = review_data.get("rating", 0)
        if not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rating must be between 1 and 5"
            )
        
        # Create review
        review = CourseReview(
            student_id=current_user.id,
            course_id=course_id,
            rating=rating,
            comment=review_data.get("comment", ""),
            created_at=datetime.utcnow(),
            is_verified=enrollment.is_completed  # Verified if course is completed
        )
        
        db.add(review)
        db.commit()
        db.refresh(review)
        
        # Update course rating
        avg_rating = calculate_course_rating(course_id, db)
        rating_count = db.query(CourseReview).filter(
            CourseReview.course_id == course_id
        ).count()
        
        course.rating = avg_rating
        course.rating_count = rating_count
        db.commit()
        
        logger.info(f"Review added for course {course_id} by {current_user.email}")
        return {"message": "Review added successfully", "review_id": review.id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding course review: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not add review"
        )

# Additional utility endpoints
@courses_router.get("/categories/list")
async def get_course_categories(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get list of available course categories"""
    try:
        categories = db.query(Course.category).filter(
            Course.category.isnot(None),
            Course.is_active == True
        ).distinct().all()
        
        category_list = [cat[0] for cat in categories if cat[0]]
        return {"categories": sorted(category_list)}
        
    except Exception as e:
        logger.error(f"Error fetching categories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch categories"
        )

@courses_router.get("/featured")
async def get_featured_courses(
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get featured courses"""
    try:
        courses = db.query(Course).filter(
            Course.is_active == True,
            Course.is_featured == True
        ).order_by(desc(Course.rating), desc(Course.enrollment_count)).limit(limit).all()
        
        # Format response similar to get_courses
        enrollments = []
        if current_user.role == "student":
            enrollments = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id
            ).all()
        
        enrollment_dict = {e.course_id: e for e in enrollments}
        
        response_courses = []
        for course in courses:
            course_response = CourseResponse.from_orm(course)
            course_response.rating = calculate_course_rating(course.id, db)
            
            if current_user.role == "student":
                enrollment = enrollment_dict.get(course.id)
                course_response.is_enrolled = enrollment is not None
                course_response.user_progress = enrollment.progress_percentage if enrollment else 0.0
            else:
                course_response.is_enrolled = False
                course_response.user_progress = 0.0
            
            response_courses.append(course_response)
        
        return response_courses
        
    except Exception as e:
        logger.error(f"Error fetching featured courses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch featured courses"
        )

@courses_router.get("/popular")
async def get_popular_courses(
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get popular courses based on enrollment count"""
    try:
        courses = db.query(Course).filter(
            Course.is_active == True
        ).order_by(desc(Course.enrollment_count), desc(Course.rating)).limit(limit).all()
        
        # Format response similar to get_courses
        enrollments = []
        if current_user.role == "student":
            enrollments = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id
            ).all()
        
        enrollment_dict = {e.course_id: e for e in enrollments}
        
        response_courses = []
        for course in courses:
            course_response = CourseResponse.from_orm(course)
            course_response.rating = calculate_course_rating(course.id, db)
            
            if current_user.role == "student":
                enrollment = enrollment_dict.get(course.id)
                course_response.is_enrolled = enrollment is not None
                course_response.user_progress = enrollment.progress_percentage if enrollment else 0.0
            else:
                course_response.is_enrolled = False
                course_response.user_progress = 0.0
            
            response_courses.append(course_response)
        
        return response_courses
        
    except Exception as e:
        logger.error(f"Error fetching popular courses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch popular courses"
        )

# ===== 1. ENHANCED QUESTION BANK MANAGEMENT =====
# Add to courses.py - Question Bank Management Routes

@courses_router.post("/{course_id}/lessons/{lesson_id}/questions", response_model=QuestionBankResponse)
async def add_question_to_lesson(
    course_id: int,
    lesson_id: int,
    question_data: QuestionBankCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add adaptive questions to a lesson's question bank"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can add questions"
        )
    
    try:
        # Verify lesson exists and user has permission
        lesson = db.query(Lesson).filter(
            Lesson.id == lesson_id,
            Lesson.course_id == course_id
        ).first()
        
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        course = db.query(Course).filter(Course.id == course_id).first()
        if current_user.role != "admin" and course.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only add questions to courses you created"
            )
        
        # Create the question with enhanced metadata
        question = QuestionBank(
            course_id=course_id,
            lesson_id=lesson_id,
            question_text=question_data.question_text,
            question_type=question_data.question_type,
            options=question_data.options,
            correct_answer=question_data.correct_answer,
            explanation=question_data.explanation,
            difficulty_level=question_data.difficulty_level,
            topic_tags=question_data.topic_tags,
            estimated_time_seconds=question_data.estimated_time_seconds,
            points=question_data.points,
            created_by=current_user.id,
            # Initialize analytics fields
            times_used=0,
            times_correct=0,
            success_rate=0.0,
            average_time_taken=0.0
        )
        
        db.add(question)
        db.commit()
        db.refresh(question)
        
        logger.info(f"Question added to lesson {lesson_id} by {current_user.email}")
        return question
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding question to lesson: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not add question"
        )

@courses_router.get("/{course_id}/lessons/{lesson_id}/adaptive-quiz")
async def generate_adaptive_quiz_for_lesson(
    course_id: int,
    lesson_id: int,
    total_questions: int = Query(10, ge=5, le=25),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate an adaptive quiz for a specific lesson"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can take adaptive quizzes"
        )
    
    try:
        # Check enrollment
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == course_id
        ).first()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be enrolled in this course"
            )
        
        # Use the dynamic quiz service
        from dynamic_quiz_service import DynamicQuizService
        quiz_service = DynamicQuizService(db)
        
        quiz = quiz_service.generate_dynamic_quiz(
            student_id=current_user.id,
            lesson_id=lesson_id,
            total_questions=total_questions,
            is_adaptive=True
        )
        
        return quiz
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating adaptive quiz: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate adaptive quiz"
        )

# ===== 2. ENHANCED STUDENT CAPABILITY ASSESSMENT =====

class EnhancedCapabilityAssessment:
    """Enhanced capability assessment with multi-factor analysis"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def assess_student_capability(self, student_id: int, lesson_id: int) -> CapabilityLevel:
        """Multi-factor capability assessment"""
        try:
            # Get student performance record
            performance = self.db.query(StudentPerformance).filter(
                StudentPerformance.student_id == student_id,
                StudentPerformance.lesson_id == lesson_id
            ).first()
            
            # For new students, check broader course performance
            if not performance:
                lesson = self.db.query(Lesson).filter(Lesson.id == lesson_id).first()
                if lesson:
                    # Check course-wide performance
                    course_performances = self.db.query(StudentPerformance).filter(
                        StudentPerformance.student_id == student_id,
                        StudentPerformance.course_id == lesson.course_id
                    ).all()
                    
                    if course_performances:
                        # Calculate average capability across course
                        avg_accuracy = sum(p.get_overall_accuracy() for p in course_performances) / len(course_performances)
                        return self._accuracy_to_capability(avg_accuracy)
                
                # Create initial performance record
                return self._create_initial_performance(student_id, lesson_id)
            
            # Multi-factor assessment for existing students
            factors = self._calculate_assessment_factors(performance)
            return self._weighted_capability_assessment(factors)
            
        except Exception as e:
            logger.error(f"Error in capability assessment: {e}")
            return CapabilityLevel.BEGINNER
    
    def _calculate_assessment_factors(self, performance: StudentPerformance) -> dict:
        """Calculate multiple assessment factors"""
        
        # Factor 1: Overall Accuracy
        overall_accuracy = performance.get_overall_accuracy()
        
        # Factor 2: Difficulty Progression
        difficulty_progression = self._calculate_difficulty_progression(performance)
        
        # Factor 3: Consistency Score
        consistency = performance.consistency_score
        
        # Factor 4: Learning Velocity
        velocity = performance.learning_velocity
        
        # Factor 5: Recent Performance Trend
        recent_trend = self._calculate_recent_trend(performance.student_id, performance.lesson_id)
        
        return {
            'accuracy': overall_accuracy,
            'difficulty_progression': difficulty_progression,
            'consistency': consistency,
            'velocity': velocity,
            'recent_trend': recent_trend
        }
    
    def _calculate_difficulty_progression(self, performance: StudentPerformance) -> float:
        """Calculate how well student performs across difficulty levels"""
        try:
            easy_rate = (performance.easy_correct / performance.easy_attempts) if performance.easy_attempts > 0 else 0
            medium_rate = (performance.medium_correct / performance.medium_attempts) if performance.medium_attempts > 0 else 0
            hard_rate = (performance.hard_correct / performance.hard_attempts) if performance.hard_attempts > 0 else 0
            
            # Weighted score emphasizing harder questions
            if hard_rate > 0.7:
                return 0.9  # Strong across all levels
            elif medium_rate > 0.7 and easy_rate > 0.8:
                return 0.7  # Strong at medium level
            elif easy_rate > 0.8:
                return 0.5  # Solid at basic level
            else:
                return 0.3  # Needs improvement
                
        except Exception:
            return 0.5  # Default middle score
    
    def _calculate_recent_trend(self, student_id: int, lesson_id: int) -> float:
        """Calculate performance trend from recent quiz attempts"""
        try:
            # Get recent quiz attempts for this lesson
            recent_quizzes = self.db.query(DynamicQuiz).filter(
                DynamicQuiz.student_id == student_id,
                DynamicQuiz.lesson_id == lesson_id,
                DynamicQuiz.is_completed == True
            ).order_by(desc(DynamicQuiz.completed_at)).limit(5).all()
            
            if len(recent_quizzes) < 2:
                return 0.5  # Neutral trend
            
            # Calculate trend
            scores = [quiz.final_score for quiz in recent_quizzes]
            if len(scores) >= 3:
                # Simple trend calculation
                recent_avg = sum(scores[:2]) / 2
                older_avg = sum(scores[2:]) / len(scores[2:])
                
                if recent_avg > older_avg + 10:
                    return 0.8  # Improving
                elif recent_avg < older_avg - 10:
                    return 0.2  # Declining
            
            return 0.5  # Stable
            
        except Exception:
            return 0.5
    
    def _weighted_capability_assessment(self, factors: dict) -> CapabilityLevel:
        """Weighted assessment using multiple factors"""
        
        # Weights for different factors
        weights = {
            'accuracy': 0.35,
            'difficulty_progression': 0.25,
            'consistency': 0.15,
            'velocity': 0.10,
            'recent_trend': 0.15
        }
        
        # Calculate weighted score
        weighted_score = sum(
            factors[factor] * weight 
            for factor, weight in weights.items()
        )
        
        # Convert to capability level with more nuanced thresholds
        if weighted_score >= 0.85:
            return CapabilityLevel.EXPERT
        elif weighted_score >= 0.70:
            return CapabilityLevel.ADVANCED
        elif weighted_score >= 0.50:
            return CapabilityLevel.INTERMEDIATE
        else:
            return CapabilityLevel.BEGINNER

# ===== 3. ENHANCED QUESTION SELECTION ALGORITHM =====

class AdaptiveQuestionSelector:
    """Enhanced question selection with intelligent distribution"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def select_adaptive_questions(
        self, 
        lesson_id: int, 
        course_id: int,
        student_capability: CapabilityLevel,
        total_questions: int,
        student_id: int = None
    ) -> List[QuestionBank]:
        """Select questions using advanced adaptive algorithm"""
        
        try:
            # Get question distribution based on capability
            distribution = self._get_enhanced_distribution(student_capability, total_questions)
            
            # Get student's question history to avoid repetition
            used_questions = self._get_student_question_history(student_id, lesson_id) if student_id else []
            
            selected_questions = []
            
            # Select questions for each difficulty level
            for difficulty_str, count in distribution.items():
                if count == 0:
                    continue
                
                difficulty = DifficultyLevel(difficulty_str)
                questions = self._get_questions_by_criteria(
                    lesson_id, 
                    course_id, 
                    difficulty, 
                    count,
                    exclude_ids=used_questions + [q.id for q in selected_questions]
                )
                
                selected_questions.extend(questions)
            
            # If we don't have enough questions, fill with available ones
            if len(selected_questions) < total_questions:
                additional = self._fill_remaining_questions(
                    lesson_id,
                    course_id,
                    total_questions - len(selected_questions),
                    exclude_ids=[q.id for q in selected_questions]
                )
                selected_questions.extend(additional)
            
            # Shuffle to avoid predictable patterns
            random.shuffle(selected_questions)
            
            return selected_questions[:total_questions]
            
        except Exception as e:
            logger.error(f"Error in question selection: {e}")
            return []
    
    def _get_enhanced_distribution(self, capability: CapabilityLevel, total_questions: int) -> dict:
        """Enhanced distribution algorithm with gradual progression"""
        
        distributions = {
            CapabilityLevel.BEGINNER: {
                'easy': 0.70,
                'medium': 0.25,
                'hard': 0.05
            },
            CapabilityLevel.INTERMEDIATE: {
                'easy': 0.30,
                'medium': 0.50,
                'hard': 0.20
            },
            CapabilityLevel.ADVANCED: {
                'easy': 0.15,
                'medium': 0.45,
                'hard': 0.40
            },
            CapabilityLevel.EXPERT: {
                'easy': 0.10,
                'medium': 0.30,
                'hard': 0.60
            }
        }
        
        ratios = distributions[capability]
        
        # Calculate actual counts
        easy_count = max(1, int(total_questions * ratios['easy']))
        hard_count = max(1, int(total_questions * ratios['hard']))
        medium_count = total_questions - easy_count - hard_count
        
        # Ensure we have at least one question of each type for variety
        return {
            'easy': easy_count,
            'medium': medium_count,
            'hard': hard_count
        }
    
    def _get_questions_by_criteria(
        self, 
        lesson_id: int, 
        course_id: int, 
        difficulty: DifficultyLevel, 
        count: int,
        exclude_ids: List[int] = None
    ) -> List[QuestionBank]:
        """Get questions with intelligent selection criteria"""
        
        exclude_ids = exclude_ids or []
        
        # Build query with preference for lesson-specific questions
        query = self.db.query(QuestionBank).filter(
            QuestionBank.difficulty_level == difficulty,
            QuestionBank.is_active == True
        )
        
        if exclude_ids:
            query = query.filter(QuestionBank.id.notin_(exclude_ids))
        
        # Prefer lesson-specific questions first
        lesson_questions = query.filter(
            QuestionBank.lesson_id == lesson_id
        ).order_by(
            # Prioritize less-used questions with good success rates
            QuestionBank.times_used.asc(),
            (QuestionBank.success_rate >= 40).desc(),  # Avoid questions that are too easy/hard
            func.random()
        ).limit(count).all()
        
        # If not enough lesson questions, get course-wide questions
        if len(lesson_questions) < count:
            remaining = count - len(lesson_questions)
            course_questions = query.filter(
                QuestionBank.course_id == course_id,
                QuestionBank.lesson_id != lesson_id
            ).limit(remaining).all()
            
            lesson_questions.extend(course_questions)
        
        return lesson_questions
    
    def _get_student_question_history(self, student_id: int, lesson_id: int) -> List[int]:
        """Get recently used questions to avoid repetition"""
        try:
            # Get questions from recent quizzes (last 3 quizzes)
            recent_quizzes = self.db.query(DynamicQuiz).filter(
                DynamicQuiz.student_id == student_id,
                DynamicQuiz.lesson_id == lesson_id,
                DynamicQuiz.is_completed == True
            ).order_by(desc(DynamicQuiz.completed_at)).limit(3).all()
            
            used_question_ids = []
            for quiz in recent_quizzes:
                if quiz.selected_questions:
                    used_question_ids.extend(quiz.selected_questions)
            
            return list(set(used_question_ids))  # Remove duplicates
            
        except Exception:
            return []

# ===== 4. REAL-TIME ADAPTIVE ALGORITHM =====

class RealTimeAdaptiveEngine:
    """Real-time adaptation during quiz taking"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def should_adapt_difficulty(self, quiz_id: int) -> dict:
        """Determine if difficulty should be adapted based on recent performance"""
        try:
            quiz = self.db.query(DynamicQuiz).filter(DynamicQuiz.id == quiz_id).first()
            if not quiz or not quiz.is_adaptive:
                return {'should_adapt': False}
            
            # Get recent question attempts
            recent_attempts = self.db.query(QuestionAttempt).filter(
                QuestionAttempt.dynamic_quiz_id == quiz_id,
                QuestionAttempt.answered_at.isnot(None)
            ).order_by(desc(QuestionAttempt.answered_at)).limit(3).all()
            
            if len(recent_attempts) < 3:
                return {'should_adapt': False}
            
            # Calculate recent performance metrics
            recent_accuracy = sum(1 for attempt in recent_attempts if attempt.is_correct) / len(recent_attempts)
            avg_time_ratio = self._calculate_time_efficiency(recent_attempts)
            
            # Adaptation logic
            adaptation = self._determine_adaptation(recent_accuracy, avg_time_ratio, quiz.starting_capability)
            
            return adaptation
            
        except Exception as e:
            logger.error(f"Error in adaptive assessment: {e}")
            return {'should_adapt': False}
    
    def _calculate_time_efficiency(self, attempts: List[QuestionAttempt]) -> float:
        """Calculate time efficiency ratio"""
        try:
            ratios = []
            for attempt in attempts:
                if attempt.question and attempt.question.estimated_time_seconds > 0:
                    ratio = attempt.time_taken_seconds / attempt.question.estimated_time_seconds
                    ratios.append(ratio)
            
            return sum(ratios) / len(ratios) if ratios else 1.0
            
        except Exception:
            return 1.0
    
    def _determine_adaptation(self, accuracy: float, time_ratio: float, current_capability: CapabilityLevel) -> dict:
        """Determine what adaptation should be made"""
        
        # Increase difficulty conditions
        if accuracy >= 0.8 and time_ratio <= 1.2:
            if current_capability in [CapabilityLevel.BEGINNER, CapabilityLevel.INTERMEDIATE]:
                return {
                    'should_adapt': True,
                    'direction': 'increase',
                    'reason': 'High accuracy with good time efficiency'
                }
        
        # Decrease difficulty conditions
        elif accuracy <= 0.4 and time_ratio >= 1.5:
            if current_capability in [CapabilityLevel.INTERMEDIATE, CapabilityLevel.ADVANCED]:
                return {
                    'should_adapt': True,
                    'direction': 'decrease',
                    'reason': 'Low accuracy with slow response time'
                }
        
        return {'should_adapt': False}
    
    def adapt_next_question(self, quiz_id: int, planned_question_id: int) -> int:
        """Adapt the next question based on performance"""
        try:
            adaptation = self.should_adapt_difficulty(quiz_id)
            
            if not adaptation['should_adapt']:
                return planned_question_id
            
            quiz = self.db.query(DynamicQuiz).filter(DynamicQuiz.id == quiz_id).first()
            planned_question = self.db.query(QuestionBank).filter(
                QuestionBank.id == planned_question_id
            ).first()
            
            if not quiz or not planned_question:
                return planned_question_id
            
            # Determine target difficulty
            current_difficulty = planned_question.difficulty_level
            
            if adaptation['direction'] == 'increase':
                if current_difficulty == DifficultyLevel.EASY:
                    target_difficulty = DifficultyLevel.MEDIUM
                elif current_difficulty == DifficultyLevel.MEDIUM:
                    target_difficulty = DifficultyLevel.HARD
                else:
                    return planned_question_id  # Already at highest
            else:  # decrease
                if current_difficulty == DifficultyLevel.HARD:
                    target_difficulty = DifficultyLevel.MEDIUM
                elif current_difficulty == DifficultyLevel.MEDIUM:
                    target_difficulty = DifficultyLevel.EASY
                else:
                    return planned_question_id  # Already at lowest
            
            # Find replacement question
            replacement = self._find_replacement_question(
                quiz.lesson_id,
                quiz.course_id,
                target_difficulty,
                quiz.selected_questions
            )
            
            if replacement:
                # Log the adaptation
                logger.info(f"Adapted question difficulty: {current_difficulty.value} -> {target_difficulty.value}")
                return replacement.id
            
            return planned_question_id
            
        except Exception as e:
            logger.error(f"Error adapting question: {e}")
            return planned_question_id

# ===== 5. INTEGRATION WITH EXISTING QUIZ SYSTEM =====

# Update the existing dynamic_quiz_service.py get_next_question method
def get_next_question_enhanced(self, quiz_id: int) -> Optional[Dict[str, Any]]:
    """Enhanced get next question with real-time adaptation"""
    try:
        quiz = self.db.query(DynamicQuiz).filter(DynamicQuiz.id == quiz_id).first()
        if not quiz or quiz.is_completed:
            return None
        
        # Check if quiz is finished
        if quiz.current_question_index >= len(quiz.selected_questions):
            self._complete_quiz(quiz)
            return None
        
        # Get planned question ID
        planned_question_id = quiz.selected_questions[quiz.current_question_index]
        
        # Apply real-time adaptation if enabled
        if quiz.is_adaptive and quiz.current_question_index > 2:  # Only after 3+ questions
            adaptive_engine = RealTimeAdaptiveEngine(self.db)
            adapted_question_id = adaptive_engine.adapt_next_question(quiz_id, planned_question_id)
            
            if adapted_question_id != planned_question_id:
                # Update the quiz with adapted question
                quiz.selected_questions[quiz.current_question_index] = adapted_question_id
                quiz.adaptive_changes_made += 1
                self.db.commit()
                question_id = adapted_question_id
            else:
                question_id = planned_question_id
        else:
            question_id = planned_question_id
        
        # Get question details and return formatted data
        question = self.db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
        if not question:
            logger.error(f"Question {question_id} not found")
            return None
        
        # Create question attempt record
        attempt = QuestionAttempt(
            dynamic_quiz_id=quiz.id,
            question_id=question.id,
            student_id=quiz.student_id,
            question_order=quiz.current_question_index + 1,
            student_capability_at_time=quiz.starting_capability,
            question_difficulty=question.difficulty_level,
            started_at=datetime.utcnow()
        )
        
        self.db.add(attempt)
        self.db.commit()
        
        return {
            'id': question.id,
            'question': question.question_text,
            'type': question.question_type.value,
            'options': question.options,
            'difficulty': question.difficulty_level.value,
            'estimated_time': question.estimated_time_seconds,
            'topic_tags': question.topic_tags,
            'question_number': quiz.current_question_index + 1,
            'total_questions': quiz.total_questions,
            'quiz_id': quiz.id,
            'points': question.points
        }
        
    except Exception as e:
        logger.error(f"Error getting next question: {e}")
        return None


# Export the router
__all__ = ["courses_router"]