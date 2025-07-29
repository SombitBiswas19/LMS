from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import json
from database import get_db
from models import (
    User, Course, Lesson, Quiz, Enrollment, QuizAttempt, 
    LessonProgress, StudentAnalytics, CourseReview
)
from auth import get_current_active_user

logger = logging.getLogger(__name__)
analytics_router = APIRouter()

# Pydantic models for analytics
class ProgressUpdate(BaseModel):
    course_id: int
    lesson_id: int
    watch_time_minutes: float
    completed: bool = False

class VideoProgressUpdate(BaseModel):
    course_id: int
    lesson_id: int
    current_position: float
    total_duration: float
    watch_time_seconds: int
    completion_percentage: float
    playback_rate: float = 1.0
    is_completed: bool = False

class StudentDashboardResponse(BaseModel):
    total_enrollments: int
    completed_courses: int
    total_watch_time: float  # in hours
    avg_quiz_score: float
    current_courses: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]
    recommendations: Optional[List[Dict[str, Any]]] = None
    ai_insights: Optional[str] = None
    achievements: List[Dict[str, Any]] = []
    learning_streak: int = 0

class AdminDashboardResponse(BaseModel):
    total_students: int
    total_courses: int
    total_enrollments: int
    active_users_today: int
    recent_enrollments: List[Dict[str, Any]]
    course_performance: List[Dict[str, Any]]
    student_performance: List[Dict[str, Any]]
    dropout_alerts: List[Dict[str, Any]]
    popular_courses: List[Dict[str, Any]]
    quiz_analytics: Dict[str, Any]
    engagement_metrics: Dict[str, Any]

class CourseAnalyticsResponse(BaseModel):
    course_id: int
    course_title: str
    total_enrollments: int
    completion_rate: float
    avg_progress: float
    avg_quiz_score: float
    total_watch_time: float
    dropout_rate: float
    student_feedback: Dict[str, Any]
    lesson_analytics: List[Dict[str, Any]]
    quiz_analytics: List[Dict[str, Any]]

def calculate_learning_streak(user_id: int, db: Session) -> int:
    """Calculate current learning streak for a user"""
    try:
        # Get recent lesson progress
        recent_activity = db.query(LessonProgress).filter(
            LessonProgress.student_id == user_id
        ).order_by(desc(LessonProgress.last_accessed)).limit(30).all()
        
        if not recent_activity:
            return 0
        
        # Group by date and calculate streak
        dates = set()
        for activity in recent_activity:
            dates.add(activity.last_accessed.date())
        
        # Calculate consecutive days
        sorted_dates = sorted(dates, reverse=True)
        streak = 0
        current_date = datetime.now().date()
        
        for date in sorted_dates:
            if date == current_date or (current_date - date).days == streak:
                streak += 1
                current_date = date
            else:
                break
        
        return streak
    except Exception as e:
        logger.error(f"Error calculating learning streak: {e}")
        return 0

def generate_ai_insights(user_id: int, db: Session) -> str:
    """Generate AI-powered insights for a student"""
    try:
        # Get user analytics
        analytics = db.query(StudentAnalytics).filter(
            StudentAnalytics.student_id == user_id
        ).all()
        
        if not analytics:
            return "Start learning to get personalized insights!"
        
        # Aggregate data
        total_watch_time = sum(a.total_watch_time_minutes for a in analytics)
        avg_score = sum(a.avg_quiz_score for a in analytics) / len(analytics) if analytics else 0
        total_quizzes = sum(a.quizzes_attempted for a in analytics)
        
        # Generate insights based on patterns
        insights = []
        
        if avg_score >= 85:
            insights.append("🎯 You're excelling in your studies!")
        elif avg_score >= 70:
            insights.append("📈 You're making good progress. Keep it up!")
        else:
            insights.append("💪 Focus on practice to improve your scores.")
        
        if total_watch_time < 60:
            insights.append("⏰ Try to increase your study time for better retention.")
        elif total_watch_time > 300:
            insights.append("🏆 Great dedication to learning!")
        
        if total_quizzes > 10:
            insights.append("🧠 Regular quiz practice is boosting your knowledge!")
        
        return " ".join(insights)
        
    except Exception as e:
        logger.error(f"Error generating AI insights: {e}")
        return "Keep learning to unlock personalized insights!"

def get_course_recommendations(user_id: int, db: Session) -> List[Dict[str, Any]]:
    """Get course recommendations for a user"""
    try:
        # Get user's enrolled courses
        enrolled_courses = db.query(Enrollment.course_id).filter(
            Enrollment.student_id == user_id
        ).subquery()
        
        # Get courses user hasn't enrolled in
        available_courses = db.query(Course).filter(
            Course.is_active == True,
            ~Course.id.in_(enrolled_courses)
        ).limit(5).all()
        
        recommendations = []
        for course in available_courses:
            recommendations.append({
                "id": course.id,
                "title": course.title,
                "description": course.description[:100] + "..." if len(course.description) > 100 else course.description,
                "difficulty": course.difficulty_level,
                "instructor": course.instructor,
                "rating": course.rating or 0,
                "enrollment_count": course.enrollment_count
            })
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        return []

def detect_dropout_risk(db: Session) -> List[Dict[str, Any]]:
    """Detect students at risk of dropping out"""
    try:
        # Get students with low engagement
        risk_threshold = 30  # days
        cutoff_date = datetime.utcnow() - timedelta(days=risk_threshold)
        
        at_risk_students = db.query(
            User.id,
            User.full_name,
            User.email,
            func.max(LessonProgress.last_accessed).label('last_activity')
        ).join(
            LessonProgress, User.id == LessonProgress.student_id
        ).filter(
            User.role == 'student'
        ).group_by(
            User.id, User.full_name, User.email
        ).having(
            func.max(LessonProgress.last_accessed) < cutoff_date
        ).all()
        
        alerts = []
        for student in at_risk_students:
            # Calculate risk score
            days_inactive = (datetime.utcnow() - student.last_activity).days
            risk_score = min(100, (days_inactive / risk_threshold) * 100)
            
            alerts.append({
                "student_id": student.id,
                "student_name": student.full_name,
                "student_email": student.email,
                "last_activity": student.last_activity.isoformat(),
                "days_inactive": days_inactive,
                "risk_score": round(risk_score, 2)
            })
        
        return sorted(alerts, key=lambda x: x['risk_score'], reverse=True)
        
    except Exception as e:
        logger.error(f"Error detecting dropout risk: {e}")
        return []

# Analytics endpoints
@analytics_router.get("/dashboard", response_model=StudentDashboardResponse)
async def get_student_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get student dashboard analytics"""
    try:
        # Basic metrics
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id
        ).all()
        
        total_enrollments = len(enrollments)
        completed_courses = len([e for e in enrollments if e.is_completed])
        total_watch_time = sum(e.total_watch_time for e in enrollments) / 60  # Convert to hours
        
        # Quiz performance
        quiz_attempts = db.query(QuizAttempt).filter(
            QuizAttempt.student_id == current_user.id
        ).all()
        
        avg_quiz_score = sum(qa.percentage for qa in quiz_attempts) / len(quiz_attempts) if quiz_attempts else 0
        
        # Current courses with progress
        current_courses = []
        for enrollment in enrollments:
            if not enrollment.is_completed:
                course = db.query(Course).filter(Course.id == enrollment.course_id).first()
                if course:
                    current_courses.append({
                        "id": course.id,
                        "title": course.title,
                        "instructor": course.instructor,
                        "difficulty": course.difficulty_level,
                        "progress": enrollment.progress_percentage,
                        "last_accessed": enrollment.last_accessed.isoformat() if enrollment.last_accessed else None
                    })
        
        # Recent activity
        recent_progress = db.query(LessonProgress).filter(
            LessonProgress.student_id == current_user.id
        ).order_by(desc(LessonProgress.last_accessed)).limit(10).all()
        
        recent_activity = []
        for progress in recent_progress:
            lesson = db.query(Lesson).filter(Lesson.id == progress.lesson_id).first()
            course = db.query(Course).filter(Course.id == progress.course_id).first()
            
            if lesson and course:
                recent_activity.append({
                    "title": f"Completed: {lesson.title}",
                    "course": course.title,
                    "date": progress.completed_at.isoformat() if progress.completed_at else progress.last_accessed.isoformat(),
                    "score": "100%" if progress.is_completed else f"{int(progress.completion_percentage)}%"
                })
        
        # Get recommendations and insights
        recommendations = get_course_recommendations(current_user.id, db)
        ai_insights = generate_ai_insights(current_user.id, db)
        learning_streak = calculate_learning_streak(current_user.id, db)
        
        return StudentDashboardResponse(
            total_enrollments=total_enrollments,
            completed_courses=completed_courses,
            total_watch_time=total_watch_time,
            avg_quiz_score=avg_quiz_score,
            current_courses=current_courses,
            recent_activity=recent_activity,
            recommendations=recommendations,
            ai_insights=ai_insights,
            learning_streak=learning_streak,
            achievements=[]  # TODO: Implement achievements
        )
        
    except Exception as e:
        logger.error(f"Error getting student dashboard: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch dashboard data"
        )

@analytics_router.get("/admin/dashboard", response_model=AdminDashboardResponse)
async def get_admin_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get admin dashboard analytics"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        # Basic metrics
        total_students = db.query(User).filter(User.role == "student").count()
        total_courses = db.query(Course).filter(Course.is_active == True).count()
        total_enrollments = db.query(Enrollment).count()
        
        # Active users today
        today = datetime.utcnow().date()
        active_users_today = db.query(LessonProgress.student_id).filter(
            func.date(LessonProgress.last_accessed) == today
        ).distinct().count()
        
        # Recent enrollments
        recent_enrollments_query = db.query(
            Enrollment, User.full_name, Course.title
        ).join(
            User, Enrollment.student_id == User.id
        ).join(
            Course, Enrollment.course_id == Course.id
        ).order_by(desc(Enrollment.enrolled_at)).limit(10).all()
        
        recent_enrollments = []
        for enrollment, student_name, course_title in recent_enrollments_query:
            recent_enrollments.append({
                "student_name": student_name,
                "course_title": course_title,
                "enrolled_at": enrollment.enrolled_at.isoformat(),
                "progress": enrollment.progress_percentage
            })
        
        # Course performance
        course_performance = []
        courses = db.query(Course).filter(Course.is_active == True).limit(10).all()
        
        for course in courses:
            enrollments_count = db.query(Enrollment).filter(
                Enrollment.course_id == course.id
            ).count()
            
            completed_count = db.query(Enrollment).filter(
                Enrollment.course_id == course.id,
                Enrollment.is_completed == True
            ).count()
            
            completion_rate = (completed_count / enrollments_count * 100) if enrollments_count > 0 else 0
            
            # Average quiz score for this course
            avg_quiz_score = db.query(func.avg(QuizAttempt.percentage)).join(
                Quiz, QuizAttempt.quiz_id == Quiz.id
            ).filter(Quiz.course_id == course.id).scalar() or 0
            
            course_performance.append({
                "course_id": course.id,
                "course_title": course.title,
                "total_enrollments": enrollments_count,
                "completion_rate": round(completion_rate, 2),
                "avg_quiz_score": round(avg_quiz_score, 2)
            })
        
        # Student performance overview
        student_performance = []
        students = db.query(User).filter(User.role == "student").limit(20).all()
        
        for student in students:
            student_enrollments = db.query(Enrollment).filter(
                Enrollment.student_id == student.id
            ).count()
            
            student_quiz_attempts = db.query(QuizAttempt).filter(
                QuizAttempt.student_id == student.id
            ).all()
            
            avg_score = sum(qa.percentage for qa in student_quiz_attempts) / len(student_quiz_attempts) if student_quiz_attempts else 0
            total_watch_time = sum(e.total_watch_time for e in db.query(Enrollment).filter(Enrollment.student_id == student.id).all())
            
            student_performance.append({
                "student_id": student.id,
                "student_name": student.full_name,
                "total_enrollments": student_enrollments,
                "avg_quiz_score": round(avg_score, 2),
                "total_watch_time": total_watch_time
            })
        
        # Dropout alerts
        dropout_alerts = detect_dropout_risk(db)
        
        # Popular courses
        popular_courses_query = db.query(
            Course.id,
            Course.title,
            func.count(Enrollment.id).label('enrollment_count')
        ).join(
            Enrollment, Course.id == Enrollment.course_id
        ).filter(
            Course.is_active == True
        ).group_by(
            Course.id, Course.title
        ).order_by(desc('enrollment_count')).limit(5).all()
        
        popular_courses = []
        for course_id, title, enrollment_count in popular_courses_query:
            popular_courses.append({
                "course_id": course_id,
                "title": title,
                "enrollment_count": enrollment_count
            })
        
        # Quiz analytics
        total_quiz_attempts = db.query(QuizAttempt).count()
        avg_quiz_score = db.query(func.avg(QuizAttempt.percentage)).scalar() or 0
        pass_rate = db.query(QuizAttempt).filter(QuizAttempt.is_passed == True).count()
        pass_rate_percentage = (pass_rate / total_quiz_attempts * 100) if total_quiz_attempts > 0 else 0
        
        quiz_analytics = {
            "total_attempts": total_quiz_attempts,
            "average_score": round(avg_quiz_score, 2),
            "pass_rate": round(pass_rate_percentage, 2)
        }
        
        # Engagement metrics
        engagement_metrics = {
            "daily_active_users": active_users_today,
            "weekly_active_users": db.query(LessonProgress.student_id).filter(
                LessonProgress.last_accessed >= datetime.utcnow() - timedelta(days=7)
            ).distinct().count(),
            "monthly_active_users": db.query(LessonProgress.student_id).filter(
                LessonProgress.last_accessed >= datetime.utcnow() - timedelta(days=30)
            ).distinct().count(),
            "avg_session_duration": 45,  # TODO: Calculate from actual data
            "retention_rate": 75  # TODO: Calculate from actual data
        }
        
        return AdminDashboardResponse(
            total_students=total_students,
            total_courses=total_courses,
            total_enrollments=total_enrollments,
            active_users_today=active_users_today,
            recent_enrollments=recent_enrollments,
            course_performance=course_performance,
            student_performance=student_performance,
            dropout_alerts=dropout_alerts,
            popular_courses=popular_courses,
            quiz_analytics=quiz_analytics,
            engagement_metrics=engagement_metrics
        )
        
    except Exception as e:
        logger.error(f"Error getting admin dashboard: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch admin dashboard data"
        )

@analytics_router.post("/update-progress")
async def update_progress(
    progress: ProgressUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update lesson progress for a student"""
    try:
        # Check if student is enrolled
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == progress.course_id
        ).first()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enrolled in this course"
            )
        
        # Update or create lesson progress
        lesson_progress = db.query(LessonProgress).filter(
            LessonProgress.student_id == current_user.id,
            LessonProgress.lesson_id == progress.lesson_id
        ).first()
        
        if not lesson_progress:
            lesson_progress = LessonProgress(
                student_id=current_user.id,
                lesson_id=progress.lesson_id,
                course_id=progress.course_id
            )
            db.add(lesson_progress)
        
        # Update progress
        lesson_progress.watch_time_seconds += int(progress.watch_time_minutes * 60)
        lesson_progress.last_accessed = datetime.utcnow()
        
        if progress.completed and not lesson_progress.is_completed:
            lesson_progress.is_completed = True
            lesson_progress.completed_at = datetime.utcnow()
            lesson_progress.completion_percentage = 100.0
        
        # Update enrollment watch time
        enrollment.total_watch_time += int(progress.watch_time_minutes)
        enrollment.last_accessed = datetime.utcnow()
        
        # Calculate overall course progress
        total_lessons = db.query(Lesson).filter(Lesson.course_id == progress.course_id).count()
        completed_lessons = db.query(LessonProgress).filter(
            LessonProgress.student_id == current_user.id,
            LessonProgress.course_id == progress.course_id,
            LessonProgress.is_completed == True
        ).count()
        
        if total_lessons > 0:
            enrollment.progress_percentage = (completed_lessons / total_lessons) * 100
            
            # Mark course as completed if all lessons are done
            if completed_lessons == total_lessons and not enrollment.is_completed:
                enrollment.is_completed = True
                enrollment.completed_at = datetime.utcnow()
        
        # Update student analytics
        analytics = db.query(StudentAnalytics).filter(
            StudentAnalytics.student_id == current_user.id,
            StudentAnalytics.course_id == progress.course_id
        ).first()
        
        if not analytics:
            analytics = StudentAnalytics(
                student_id=current_user.id,
                course_id=progress.course_id
            )
            db.add(analytics)
        
        analytics.total_watch_time_minutes += progress.watch_time_minutes
        if progress.completed:
            analytics.lessons_completed += 1
        analytics.last_activity = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Progress updated for user {current_user.id}, lesson {progress.lesson_id}")
        return {"message": "Progress updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating progress: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update progress"
        )

@analytics_router.post("/video-progress")
async def track_video_progress(
    progress: VideoProgressUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Track detailed video progress"""
    try:
        # Update lesson progress with video-specific data
        lesson_progress = db.query(LessonProgress).filter(
            LessonProgress.student_id == current_user.id,
            LessonProgress.lesson_id == progress.lesson_id
        ).first()
        
        if lesson_progress:
            lesson_progress.last_position_seconds = int(progress.current_position)
            lesson_progress.completion_percentage = progress.completion_percentage
            lesson_progress.watch_time_seconds += progress.watch_time_seconds
            lesson_progress.last_accessed = datetime.utcnow()
            
            if progress.is_completed and not lesson_progress.is_completed:
                lesson_progress.is_completed = True
                lesson_progress.completed_at = datetime.utcnow()
            
            db.commit()
        
        return {"message": "Video progress tracked"}
        
    except Exception as e:
        logger.error(f"Error tracking video progress: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not track video progress"
        )

@analytics_router.get("/admin/course/{course_id}", response_model=CourseAnalyticsResponse)
async def get_course_analytics(
    course_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed analytics for a specific course"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or instructor access required"
        )
    
    try:
        # Get course
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Basic metrics
        enrollments = db.query(Enrollment).filter(Enrollment.course_id == course_id).all()
        total_enrollments = len(enrollments)
        completed_enrollments = len([e for e in enrollments if e.is_completed])
        completion_rate = (completed_enrollments / total_enrollments * 100) if total_enrollments > 0 else 0
        
        avg_progress = sum(e.progress_percentage for e in enrollments) / len(enrollments) if enrollments else 0
        total_watch_time = sum(e.total_watch_time for e in enrollments) / 60  # Convert to hours
        
        # Quiz analytics
        quiz_attempts = db.query(QuizAttempt).join(
            Quiz, QuizAttempt.quiz_id == Quiz.id
        ).filter(Quiz.course_id == course_id).all()
        
        avg_quiz_score = sum(qa.percentage for qa in quiz_attempts) / len(quiz_attempts) if quiz_attempts else 0
        
        # Dropout rate (students who haven't accessed in 30 days)
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        inactive_enrollments = len([e for e in enrollments if e.last_accessed and e.last_accessed < cutoff_date])
        dropout_rate = (inactive_enrollments / total_enrollments * 100) if total_enrollments > 0 else 0
        
        # Student feedback
        reviews = db.query(CourseReview).filter(CourseReview.course_id == course_id).all()
        avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0
        
        student_feedback = {
            "average_rating": round(avg_rating, 2),
            "total_reviews": len(reviews),
            "rating_distribution": {
                "5": len([r for r in reviews if r.rating == 5]),
                "4": len([r for r in reviews if r.rating == 4]),
                "3": len([r for r in reviews if r.rating == 3]),
                "2": len([r for r in reviews if r.rating == 2]),
                "1": len([r for r in reviews if r.rating == 1])
            }
        }
        
        # Lesson analytics
        lessons = db.query(Lesson).filter(Lesson.course_id == course_id).all()
        lesson_analytics = []
        
        for lesson in lessons:
            lesson_progress_count = db.query(LessonProgress).filter(
                LessonProgress.lesson_id == lesson.id
            ).count()
            
            completed_count = db.query(LessonProgress).filter(
                LessonProgress.lesson_id == lesson.id,
                LessonProgress.is_completed == True
            ).count()
            
            completion_rate = (completed_count / lesson_progress_count * 100) if lesson_progress_count > 0 else 0
            
            avg_watch_time = db.query(func.avg(LessonProgress.watch_time_seconds)).filter(
                LessonProgress.lesson_id == lesson.id
            ).scalar() or 0
            
            lesson_analytics.append({
                "lesson_id": lesson.id,
                "lesson_title": lesson.title,
                "views": lesson_progress_count,
                "completion_rate": round(completion_rate, 2),
                "avg_watch_time": round(avg_watch_time / 60, 2)  # Convert to minutes
            })
        
        # Quiz analytics
        quizzes = db.query(Quiz).filter(Quiz.course_id == course_id).all()
        quiz_analytics_list = []
        
        for quiz in quizzes:
            quiz_attempts_count = db.query(QuizAttempt).filter(
                QuizAttempt.quiz_id == quiz.id
            ).count()
            
            avg_score = db.query(func.avg(QuizAttempt.percentage)).filter(
                QuizAttempt.quiz_id == quiz.id
            ).scalar() or 0
            
            pass_count = db.query(QuizAttempt).filter(
                QuizAttempt.quiz_id == quiz.id,
                QuizAttempt.is_passed == True
            ).count()
            
            pass_rate = (pass_count / quiz_attempts_count * 100) if quiz_attempts_count > 0 else 0
            
            quiz_analytics_list.append({
                "quiz_id": quiz.id,
                "quiz_title": quiz.title,
                "attempts": quiz_attempts_count,
                "avg_score": round(avg_score, 2),
                "pass_rate": round(pass_rate, 2)
            })
        
        return CourseAnalyticsResponse(
            course_id=course_id,
            course_title=course.title,
            total_enrollments=total_enrollments,
            completion_rate=round(completion_rate, 2),
            avg_progress=round(avg_progress, 2),
            avg_quiz_score=round(avg_quiz_score, 2),
            total_watch_time=round(total_watch_time, 2),
            dropout_rate=round(dropout_rate, 2),
            student_feedback=student_feedback,
            lesson_analytics=lesson_analytics,
            quiz_analytics=quiz_analytics_list
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting course analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch course analytics"
        )

@analytics_router.get("/engagement")
async def get_engagement_metrics(
    timeframe: str = "7d",
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get engagement metrics"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        # Parse timeframe
        if timeframe == "7d":
            days = 7
        elif timeframe == "30d":
            days = 30
        elif timeframe == "90d":
            days = 90
        else:
            days = 7
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Active users
        active_users = db.query(LessonProgress.student_id).filter(
            LessonProgress.last_accessed >= cutoff_date
        ).distinct().count()
        
        # New enrollments
        new_enrollments = db.query(Enrollment).filter(
            Enrollment.enrolled_at >= cutoff_date
        ).count()
        
        # Lesson completions
        lesson_completions = db.query(LessonProgress).filter(
            LessonProgress.completed_at >= cutoff_date,
            LessonProgress.is_completed == True
        ).count()
        
        # Quiz attempts
        quiz_attempts = db.query(QuizAttempt).filter(
            QuizAttempt.attempted_at >= cutoff_date
        ).count()
        
        return {
            "timeframe": timeframe,
            "active_users": active_users,
            "new_enrollments": new_enrollments,
            "lesson_completions": lesson_completions,
            "quiz_attempts": quiz_attempts,
            "period_start": cutoff_date.isoformat(),
            "period_end": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting engagement metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch engagement metrics"
        )

# Additional endpoints for comprehensive analytics

@analytics_router.get("/student/{student_id}")
async def get_student_analytics(
    student_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get analytics for a specific student (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        student = db.query(User).filter(
            User.id == student_id,
            User.role == "student"
        ).first()
        
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        # Get student's analytics
        analytics = db.query(StudentAnalytics).filter(
            StudentAnalytics.student_id == student_id
        ).all()
        
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == student_id
        ).all()
        
        quiz_attempts = db.query(QuizAttempt).filter(
            QuizAttempt.student_id == student_id
        ).all()
        
        return {
            "student_id": student_id,
            "student_name": student.full_name,
            "student_email": student.email,
            "total_enrollments": len(enrollments),
            "completed_courses": len([e for e in enrollments if e.is_completed]),
            "total_watch_time": sum(e.total_watch_time for e in enrollments),
            "avg_quiz_score": sum(qa.percentage for qa in quiz_attempts) / len(quiz_attempts) if quiz_attempts else 0,
            "learning_streak": calculate_learning_streak(student_id, db),
            "risk_score": 0,  # TODO: Calculate dropout risk
            "enrollments": [
                {
                    "course_id": e.course_id,
                    "progress": e.progress_percentage,
                    "enrolled_at": e.enrolled_at.isoformat(),
                    "is_completed": e.is_completed
                } for e in enrollments
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch student analytics"
        )