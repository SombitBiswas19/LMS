# auth.py - Enhanced Authentication with Admin Support

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, validator
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
import re
from typing import Optional
from database import get_db
from models import User
import logging

logger = logging.getLogger(__name__)

# Enhanced security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

auth_router = APIRouter()

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "student"

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('Password must contain at least one letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v

    @validator('full_name')
    def validate_full_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Full name must be at least 2 characters long')
        return v.strip()

    @validator('role')
    def validate_role(cls, v):
        if v not in ["student", "admin", "instructor"]:
            raise ValueError('Role must be either "student", "admin", or "instructor"')
        return v

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    try:
        return db.query(User).filter(User.email == email.lower()).first()
    except Exception as e:
        logger.error(f"Database error while fetching user: {e}")
        return None

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user:
        logger.warning(f"User not found: {email}")
        return None
    if not verify_password(password, user.password_hash):
        logger.warning(f"Invalid password for user: {email}")
        return None
    if not user.is_active:
        logger.warning(f"Inactive user attempted login: {email}")
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    try:
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Token creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create access token"
        )

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if email is None or token_type != "access":
            raise credentials_exception
            
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise credentials_exception

    user = get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
        
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inactive user account"
        )
    return current_user

# Enhanced signup endpoint
@auth_router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        # Check if user already exists
        existing_user = get_user_by_email(db, user.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user with all required fields
        hashed_password = get_password_hash(user.password)
        
        db_user = User(
            email=user.email.lower(),
            password_hash=hashed_password,
            full_name=user.full_name,
            role=user.role,
            is_active=True,
            is_verified=False,
            profile_image_url=None,
            bio=None,
            preferences={},
            created_at=datetime.utcnow(),
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        logger.info(f"New user created: {user.email} with role: {user.role}")
        
        return db_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create user account"
        )

# Enhanced login endpoint
@auth_router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    try:
        user = authenticate_user(db, form_data.username, form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, 
            expires_delta=access_token_expires
        )
        
        logger.info(f"User logged in: {user.email} (Role: {user.role})")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@auth_router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

# Admin-only endpoint to get all users
@auth_router.get("/users", response_model=list[UserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    try:
        users = db.query(User).offset(skip).limit(limit).all()
        return users
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch users"
        )

# Enhanced courses.py with Complete Course Management

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import shutil
import os
import logging
from database import get_db
from models import User, Course, Lesson, Quiz, Enrollment, QuizAttempt, LessonProgress, StudentAnalytics
from auth import get_current_active_user

logger = logging.getLogger(__name__)
courses_router = APIRouter()

# Enhanced Course Models
class CourseCreate(BaseModel):
    title: str
    description: str
    short_description: Optional[str] = None
    instructor: str
    duration_hours: float
    difficulty_level: str
    category: str
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
        if v not in ["video", "text", "quiz", "assignment"]:
            raise ValueError('Lesson type must be video, text, quiz, or assignment')
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

class CourseResponse(BaseModel):
    id: int
    title: str
    description: str
    short_description: Optional[str] = None
    instructor: str
    duration_hours: float
    difficulty_level: str
    category: str
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

# Enhanced Course Management
@courses_router.post("/", response_model=CourseResponse)
async def create_course(
    course: CourseCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can create courses"
        )
    
    try:
        db_course = Course(
            title=course.title,
            description=course.description,
            short_description=course.short_description,
            instructor=course.instructor,
            duration_hours=course.duration_hours,
            difficulty_level=course.difficulty_level,
            category=course.category,
            tags=course.tags,
            prerequisites=course.prerequisites,
            learning_objectives=course.learning_objectives,
            price=course.price,
            is_featured=course.is_featured,
            is_free=course.is_free,
            language=course.language,
            certificate_available=course.certificate_available,
            estimated_completion_time=course.estimated_completion_time,
            created_by=current_user.id,
            created_at=datetime.utcnow(),
            is_active=True
        )
        
        db.add(db_course)
        db.commit()
        db.refresh(db_course)
        
        logger.info(f"Course created: {course.title} by {current_user.email}")
        
        response = CourseResponse.from_orm(db_course)
        response.is_enrolled = False
        response.user_progress = 0.0
        
        return response
        
    except Exception as e:
        logger.error(f"Error creating course: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create course"
        )

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
    try:
        query = db.query(Course).filter(Course.is_active == True)
        
        if search:
            query = query.filter(
                Course.title.ilike(f"%{search}%") |
                Course.description.ilike(f"%{search}%") |
                Course.instructor.ilike(f"%{search}%")
            )
        
        if category:
            query = query.filter(Course.category == category)
            
        if difficulty:
            query = query.filter(Course.difficulty_level == difficulty)
        
        courses = query.offset(skip).limit(limit).all()
        
        # Get user enrollments
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
            
            # Set enrollment status and progress
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
        logger.error(f"Error fetching courses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch courses"
        )

# Enhanced Lesson Management
@courses_router.post("/{course_id}/lessons", response_model=LessonResponse)
async def create_lesson(
    course_id: int,
    lesson: LessonCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
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
        
        logger.info(f"Lesson created: {lesson.title} for course {course_id}")
        
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
            detail="Could not create lesson"
        )

@courses_router.put("/{course_id}/lessons/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    course_id: int,
    lesson_id: int,
    lesson_update: LessonUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
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
        
        logger.info(f"Lesson updated: {lesson.title}")
        
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

def calculate_course_rating(course_id: int, db: Session) -> float:
    """Calculate average rating for a course"""
    try:
        from models import CourseReview
        avg_rating = db.query(func.avg(CourseReview.rating)).filter(
            CourseReview.course_id == course_id
        ).scalar()
        return round(avg_rating or 0.0, 1)
    except:
        return 0.0