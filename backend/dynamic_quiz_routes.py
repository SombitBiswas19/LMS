# dynamic_quiz_routes.py - API Routes for Dynamic Quiz System

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from database import get_db
from auth import get_current_active_user
from models import (
    User, Course, Lesson, QuestionBank, StudentPerformance, DynamicQuiz, 
    QuestionAttempt, AdaptiveAlgorithmConfig, DifficultyLevel, CapabilityLevel, QuestionType
)
from dynamic_quiz_service import DynamicQuizService

logger = logging.getLogger(__name__)
dynamic_quiz_router = APIRouter()

# Pydantic Models for API

class QuestionBankCreate(BaseModel):
    question_text: str = Field(..., min_length=10, max_length=2000)
    question_type: QuestionType
    options: Optional[List[str]] = None
    correct_answer: str = Field(..., max_length=500)
    explanation: Optional[str] = None
    difficulty_level: DifficultyLevel
    topic_tags: List[str] = Field(default=[])
    estimated_time_seconds: int = Field(default=60, ge=10, le=600)
    points: int = Field(default=1, ge=1, le=10)

class QuestionBankResponse(BaseModel):
    id: int
    question_text: str
    question_type: QuestionType
    options: Optional[List[str]]
    correct_answer: str
    explanation: Optional[str]
    difficulty_level: DifficultyLevel
    topic_tags: List[str]
    estimated_time_seconds: int
    points: int
    times_used: int
    success_rate: float
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

class DynamicQuizCreate(BaseModel):
    lesson_id: int
    total_questions: int = Field(default=10, ge=5, le=50)
    time_limit_minutes: int = Field(default=15, ge=5, le=120)
    is_adaptive: bool = True

class DynamicQuizResponse(BaseModel):
    id: int
    lesson_id: int
    total_questions: int
    time_limit_minutes: int
    is_adaptive: bool
    starting_capability: CapabilityLevel
    planned_easy: int
    planned_medium: int
    planned_hard: int
    current_question_index: int
    is_completed: bool
    final_score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True

class QuestionData(BaseModel):
    id: int
    question: str
    type: QuestionType
    options: Optional[List[str]]
    difficulty: str
    estimated_time: int
    topic_tags: List[str]
    question_number: int
    total_questions: int
    quiz_id: int

class AnswerSubmission(BaseModel):
    selected_answer: str
    time_taken_seconds: float = Field(ge=0)

class AnswerResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: Optional[str]
    time_taken: float
    question_completed: bool
    quiz_completed: bool
    final_results: Optional[Dict[str, Any]] = None

class StudentPerformanceResponse(BaseModel):
    student_id: int
    lesson_id: int
    current_capability: str
    mastery_score: float
    confidence_level: float
    learning_velocity: float
    consistency_score: float
    current_streak: int
    best_streak: int
    overall_accuracy: float
    difficulty_breakdown: Dict[str, Any]
    recent_quiz_history: List[Dict[str, Any]]
    recommended_difficulty: str
    last_updated: Optional[datetime]

    class Config:
        from_attributes = True

class AlgorithmConfigUpdate(BaseModel):
    beginner_distribution: Optional[Dict[str, float]] = None
    intermediate_distribution: Optional[Dict[str, float]] = None
    advanced_distribution: Optional[Dict[str, float]] = None
    thresholds: Optional[Dict[str, float]] = None

# Question Bank Management Routes (Admin/Instructor)

@dynamic_quiz_router.post("/questions", response_model=QuestionBankResponse)
async def create_question(
    course_id: int,
    lesson_id: Optional[int] = None,
    question_data: QuestionBankCreate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new question for the question bank"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can create questions"
        )
    
    try:
        # Validate course and lesson access
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        if lesson_id:
            lesson = db.query(Lesson).filter(
                Lesson.id == lesson_id, 
                Lesson.course_id == course_id
            ).first()
            if not lesson:
                raise HTTPException(status_code=404, detail="Lesson not found")
        
        # Validate question data
        if question_data.question_type == QuestionType.MULTIPLE_CHOICE:
            if not question_data.options or len(question_data.options) < 2:
                raise HTTPException(
                    status_code=400,
                    detail="Multiple choice questions must have at least 2 options"
                )
            if question_data.correct_answer not in question_data.options:
                raise HTTPException(
                    status_code=400,
                    detail="Correct answer must be one of the provided options"
                )
        
        # Create question
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
            created_by=current_user.id
        )
        
        db.add(question)
        db.commit()
        db.refresh(question)
        
        logger.info(f"Question created by {current_user.email} for course {course_id}")
        return question
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating question: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create question: {str(e)}")

@dynamic_quiz_router.get("/questions", response_model=List[QuestionBankResponse])
async def get_questions(
    course_id: int,
    lesson_id: Optional[int] = None,
    difficulty: Optional[DifficultyLevel] = None,
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get questions from question bank with filtering"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can view question bank"
        )
    
    try:
        query = db.query(QuestionBank).filter(
            QuestionBank.course_id == course_id,
            QuestionBank.is_active == True
        )
        
        if lesson_id:
            query = query.filter(QuestionBank.lesson_id == lesson_id)
        
        if difficulty:
            query = query.filter(QuestionBank.difficulty_level == difficulty)
        
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",")]
            # Filter questions that contain any of the specified tags
            for tag in tag_list:
                query = query.filter(QuestionBank.topic_tags.contains([tag]))
        
        # Pagination
        offset = (page - 1) * limit
        questions = query.offset(offset).limit(limit).all()
        
        return questions
        
    except Exception as e:
        logger.error(f"Error fetching questions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch questions")

@dynamic_quiz_router.put("/questions/{question_id}", response_model=QuestionBankResponse)
async def update_question(
    question_id: int,
    question_data: QuestionBankCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an existing question"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can update questions"
        )
    
    try:
        question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Update fields
        question.question_text = question_data.question_text
        question.question_type = question_data.question_type
        question.options = question_data.options
        question.correct_answer = question_data.correct_answer
        question.explanation = question_data.explanation
        question.difficulty_level = question_data.difficulty_level
        question.topic_tags = question_data.topic_tags
        question.estimated_time_seconds = question_data.estimated_time_seconds
        question.points = question_data.points
        question.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(question)
        
        logger.info(f"Question {question_id} updated by {current_user.email}")
        return question
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating question: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update question")

@dynamic_quiz_router.delete("/questions/{question_id}")
async def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Soft delete a question (mark as inactive)"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can delete questions"
        )
    
    try:
        question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        question.is_active = False
        question.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Question {question_id} deleted by {current_user.email}")
        return {"message": "Question deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting question: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete question")

# Dynamic Quiz Routes (Students)

@dynamic_quiz_router.post("/generate", response_model=DynamicQuizResponse)
async def generate_dynamic_quiz(
    quiz_request: DynamicQuizCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate a new dynamic quiz for a student"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can generate quizzes"
        )
    
    try:
        # Validate lesson access
        lesson = db.query(Lesson).filter(Lesson.id == quiz_request.lesson_id).first()
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        # Check if student is enrolled in the course
        from models import Enrollment
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == lesson.course_id
        ).first()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be enrolled in this course to take quizzes"
            )
        
        # Generate the dynamic quiz
        quiz_service = DynamicQuizService(db)
        quiz = quiz_service.generate_dynamic_quiz(
            student_id=current_user.id,
            lesson_id=quiz_request.lesson_id,
            total_questions=quiz_request.total_questions,
            time_limit_minutes=quiz_request.time_limit_minutes,
            is_adaptive=quiz_request.is_adaptive
        )
        
        logger.info(f"Dynamic quiz {quiz.id} generated for student {current_user.id}")
        return quiz
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating dynamic quiz: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

@dynamic_quiz_router.post("/start/{quiz_id}")
async def start_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Start a generated quiz"""
    try:
        quiz = db.query(DynamicQuiz).filter(
            DynamicQuiz.id == quiz_id,
            DynamicQuiz.student_id == current_user.id
        ).first()
        
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        if quiz.is_completed:
            raise HTTPException(status_code=400, detail="Quiz already completed")
        
        if not quiz.started_at:
            quiz.started_at = datetime.utcnow()
            db.commit()
        
        logger.info(f"Quiz {quiz_id} started by student {current_user.id}")
        return {"message": "Quiz started", "quiz_id": quiz_id, "started_at": quiz.started_at}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting quiz: {e}")
        raise HTTPException(status_code=500, detail="Failed to start quiz")

@dynamic_quiz_router.get("/question/{quiz_id}", response_model=QuestionData)
async def get_next_question(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get the next question in the quiz"""
    try:
        # Verify quiz ownership
        quiz = db.query(DynamicQuiz).filter(
            DynamicQuiz.id == quiz_id,
            DynamicQuiz.student_id == current_user.id
        ).first()
        
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        if quiz.is_completed:
            raise HTTPException(status_code=400, detail="Quiz already completed")
        
        # Get next question using quiz service
        quiz_service = DynamicQuizService(db)
        question_data = quiz_service.get_next_question(quiz_id)
        
        if not question_data:
            raise HTTPException(status_code=404, detail="No more questions available")
        
        return QuestionData(**question_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting next question: {e}")
        raise HTTPException(status_code=500, detail="Failed to get question")

@dynamic_quiz_router.post("/answer/{quiz_id}/{question_id}", response_model=AnswerResponse)
async def submit_answer(
    quiz_id: int,
    question_id: int,
    answer: AnswerSubmission,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Submit an answer for a quiz question"""
    try:
        # Verify quiz ownership
        quiz = db.query(DynamicQuiz).filter(
            DynamicQuiz.id == quiz_id,
            DynamicQuiz.student_id == current_user.id
        ).first()
        
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        if quiz.is_completed:
            raise HTTPException(status_code=400, detail="Quiz already completed")
        
        # Submit answer using quiz service
        quiz_service = DynamicQuizService(db)
        result = quiz_service.submit_answer(
            quiz_id=quiz_id,
            question_id=question_id,
            selected_answer=answer.selected_answer,
            time_taken_seconds=answer.time_taken_seconds
        )
        
        # Schedule background tasks if quiz is completed
        if result.get('quiz_completed'):
            background_tasks.add_task(
                update_student_analytics_background,
                current_user.id,
                quiz.lesson_id,
                quiz.course_id,
                db
            )
        
        logger.info(f"Answer submitted for quiz {quiz_id}, question {question_id}")
        return AnswerResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting answer: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit answer")

@dynamic_quiz_router.get("/results/{quiz_id}")
async def get_quiz_results(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed results for a completed quiz"""
    try:
        # Verify quiz ownership
        quiz = db.query(DynamicQuiz).filter(
            DynamicQuiz.id == quiz_id,
            DynamicQuiz.student_id == current_user.id
        ).first()
        
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        if not quiz.is_completed:
            raise HTTPException(status_code=400, detail="Quiz not yet completed")
        
        # Get detailed results
        quiz_service = DynamicQuizService(db)
        results = quiz_service.get_quiz_analytics(quiz_id)
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting quiz results: {e}")
        raise HTTPException(status_code=500, detail="Failed to get quiz results")

# Student Performance Routes

@dynamic_quiz_router.get("/performance/{lesson_id}", response_model=StudentPerformanceResponse)
async def get_student_performance(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get comprehensive performance summary for a student in a lesson"""
    try:
        quiz_service = DynamicQuizService(db)
        summary = quiz_service.get_student_performance_summary(current_user.id, lesson_id)
        
        if "message" in summary:
            raise HTTPException(status_code=404, detail=summary["message"])
        
        return StudentPerformanceResponse(**summary)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student performance: {e}")
        raise HTTPException(status_code=500, detail="Failed to get performance data")

@dynamic_quiz_router.get("/quiz-history")
async def get_quiz_history(
    course_id: Optional[int] = None,
    lesson_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get quiz history for a student"""
    try:
        query = db.query(DynamicQuiz).filter(
            DynamicQuiz.student_id == current_user.id,
            DynamicQuiz.is_completed == True
        )
        
        if course_id:
            query = query.filter(DynamicQuiz.course_id == course_id)
        
        if lesson_id:
            query = query.filter(DynamicQuiz.lesson_id == lesson_id)
        
        # Pagination
        offset = (page - 1) * limit
        quizzes = query.order_by(desc(DynamicQuiz.completed_at)).offset(offset).limit(limit).all()
        
        quiz_history = []
        for quiz in quizzes:
            quiz_history.append({
                "quiz_id": quiz.id,
                "lesson_id": quiz.lesson_id,
                "course_id": quiz.course_id,
                "score": quiz.final_score,
                "questions_answered": quiz.questions_answered,
                "total_questions": quiz.total_questions,
                "duration_minutes": quiz.actual_duration_minutes,
                "starting_capability": quiz.starting_capability.value,
                "ending_capability": quiz.ending_capability.value if quiz.ending_capability else None,
                "completed_at": quiz.completed_at.isoformat() if quiz.completed_at else None,
                "was_adaptive": quiz.is_adaptive,
                "adaptive_changes": quiz.adaptive_changes_made
            })
        
        return {
            "quiz_history": quiz_history,
            "total_quizzes": len(quiz_history),
            "page": page,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Error getting quiz history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get quiz history")

# Analytics Routes (Admin/Instructor)

@dynamic_quiz_router.get("/analytics/student/{student_id}")
async def get_student_analytics(
    student_id: int,
    course_id: Optional[int] = None,
    lesson_id: Optional[int] = None,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed analytics for a specific student (instructor/admin only)"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can view student analytics"
        )
    
    try:
        from datetime import timedelta
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get student's quiz performance
        query = db.query(DynamicQuiz).filter(
            DynamicQuiz.student_id == student_id,
            DynamicQuiz.is_completed == True,
            DynamicQuiz.completed_at >= start_date
        )
        
        if course_id:
            query = query.filter(DynamicQuiz.course_id == course_id)
        
        if lesson_id:
            query = query.filter(DynamicQuiz.lesson_id == lesson_id)
        
        quizzes = query.all()
        
        # Calculate analytics
        total_quizzes = len(quizzes)
        if total_quizzes == 0:
            return {
                "student_id": student_id,
                "message": "No quiz data found for the specified period"
            }
        
        avg_score = sum(q.final_score for q in quizzes) / total_quizzes
        best_score = max(q.final_score for q in quizzes)
        worst_score = min(q.final_score for q in quizzes)
        
        # Capability progression
        capability_progression = []
        for quiz in sorted(quizzes, key=lambda x: x.completed_at):
            capability_progression.append({
                "quiz_date": quiz.completed_at.isoformat(),
                "starting_capability": quiz.starting_capability.value,
                "ending_capability": quiz.ending_capability.value if quiz.ending_capability else None,
                "score": quiz.final_score,
                "adaptive_changes": quiz.adaptive_changes_made
            })
        
        # Get current performance status
        current_performance = db.query(StudentPerformance).filter(
            StudentPerformance.student_id == student_id
        )
        
        if lesson_id:
            current_performance = current_performance.filter(
                StudentPerformance.lesson_id == lesson_id
            )
        
        performance_records = current_performance.all()
        
        return {
            "student_id": student_id,
            "period_days": days,
            "overall_stats": {
                "total_quizzes": total_quizzes,
                "average_score": round(avg_score, 2),
                "best_score": round(best_score, 2),
                "worst_score": round(worst_score, 2)
            },
            "capability_progression": capability_progression,
            "current_performance": [
                {
                    "lesson_id": perf.lesson_id,
                    "current_capability": perf.current_capability.value,
                    "mastery_score": perf.mastery_score,
                    "consistency_score": perf.consistency_score,
                    "overall_accuracy": perf.get_overall_accuracy()
                } for perf in performance_records
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting student analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get student analytics")

@dynamic_quiz_router.get("/analytics/course/{course_id}")
async def get_course_analytics(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get course-wide quiz analytics (instructor/admin only)"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can view course analytics"
        )
    
    try:
        # Overall course statistics
        course_stats = db.query(
            func.count(func.distinct(DynamicQuiz.student_id)).label('unique_students'),
            func.count(DynamicQuiz.id).label('total_quizzes'),
            func.avg(DynamicQuiz.final_score).label('avg_score'),
            func.count(func.nullif(DynamicQuiz.is_completed, False)).label('completed_quizzes')
        ).filter(DynamicQuiz.course_id == course_id).first()
        
        # Performance distribution by capability
        capability_distribution = db.query(
            StudentPerformance.current_capability,
            func.count(StudentPerformance.id).label('count')
        ).join(Lesson).filter(
            Lesson.course_id == course_id
        ).group_by(StudentPerformance.current_capability).all()
        
        # Question difficulty effectiveness
        question_effectiveness = db.query(
            QuestionAttempt.question_difficulty,
            func.count(QuestionAttempt.id).label('total_attempts'),
            func.avg(func.cast(QuestionAttempt.is_correct, db.Float)).label('success_rate'),
            func.avg(QuestionAttempt.time_taken_seconds).label('avg_time')
        ).join(DynamicQuiz).filter(
            DynamicQuiz.course_id == course_id,
            QuestionAttempt.answered_at.isnot(None)
        ).group_by(QuestionAttempt.question_difficulty).all()
        
        # Adaptive algorithm effectiveness
        adaptive_stats = db.query(
            func.avg(DynamicQuiz.adaptive_changes_made).label('avg_changes'),
            func.count(func.nullif(DynamicQuiz.is_adaptive, False)).label('adaptive_quizzes')
        ).filter(DynamicQuiz.course_id == course_id).first()
        
        return {
            "course_id": course_id,
            "overall_stats": {
                "unique_students": course_stats.unique_students or 0,
                "total_quizzes": course_stats.total_quizzes or 0,
                "completed_quizzes": course_stats.completed_quizzes or 0,
                "completion_rate": round((course_stats.completed_quizzes / course_stats.total_quizzes * 100), 2) if course_stats.total_quizzes else 0,
                "average_score": round(course_stats.avg_score or 0, 2)
            },
            "capability_distribution": [
                {
                    "capability": dist.current_capability.value,
                    "count": dist.count
                } for dist in capability_distribution
            ],
            "question_effectiveness": [
                {
                    "difficulty": eff.question_difficulty.value,
                    "total_attempts": eff.total_attempts,
                    "success_rate": round(eff.success_rate * 100, 2),
                    "average_time": round(eff.avg_time, 2)
                } for eff in question_effectiveness
            ],
            "adaptive_algorithm_stats": {
                "adaptive_quizzes": adaptive_stats.adaptive_quizzes or 0,
                "average_adaptations_per_quiz": round(adaptive_stats.avg_changes or 0, 2)
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting course analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get course analytics")

# Configuration Management Routes

@dynamic_quiz_router.get("/config/{course_id}")
async def get_algorithm_config(
    course_id: int,
    lesson_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get adaptive algorithm configuration"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can view configuration"
        )
    
    try:
        config = db.query(AdaptiveAlgorithmConfig).filter(
            AdaptiveAlgorithmConfig.course_id == course_id,
            AdaptiveAlgorithmConfig.lesson_id == lesson_id
        ).first()
        
        if not config:
            # Return default configuration
            return {
                "course_id": course_id,
                "lesson_id": lesson_id,
                "algorithm_name": "capability_based_v1",
                "beginner_distribution": {"easy": 0.7, "medium": 0.25, "hard": 0.05},
                "intermediate_distribution": {"easy": 0.3, "medium": 0.5, "hard": 0.2},
                "advanced_distribution": {"easy": 0.1, "medium": 0.4, "hard": 0.5},
                "thresholds": {
                    "increase_difficulty": 0.8,
                    "decrease_difficulty": 0.4,
                    "time_efficiency": 1.2
                }
            }
        
        return {
            "course_id": config.course_id,
            "lesson_id": config.lesson_id,
            "algorithm_name": config.algorithm_name,
            "beginner_distribution": {
                "easy": config.beginner_easy_ratio,
                "medium": config.beginner_medium_ratio,
                "hard": config.beginner_hard_ratio
            },
            "intermediate_distribution": {
                "easy": config.intermediate_easy_ratio,
                "medium": config.intermediate_medium_ratio,
                "hard": config.intermediate_hard_ratio
            },
            "advanced_distribution": {
                "easy": config.advanced_easy_ratio,
                "medium": config.advanced_medium_ratio,
                "hard": config.advanced_hard_ratio
            },
            "thresholds": {
                "increase_difficulty": config.increase_difficulty_threshold,
                "decrease_difficulty": config.decrease_difficulty_threshold,
                "time_efficiency": config.time_efficiency_threshold
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting algorithm config: {e}")
        raise HTTPException(status_code=500, detail="Failed to get configuration")

@dynamic_quiz_router.put("/config/{course_id}")
async def update_algorithm_config(
    course_id: int,
    config_data: AlgorithmConfigUpdate,
    lesson_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update adaptive algorithm configuration"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can update configuration"
        )
    
    try:
        config = db.query(AdaptiveAlgorithmConfig).filter(
            AdaptiveAlgorithmConfig.course_id == course_id,
            AdaptiveAlgorithmConfig.lesson_id == lesson_id
        ).first()
        
        if not config:
            # Create new configuration
            config = AdaptiveAlgorithmConfig(
                course_id=course_id,
                lesson_id=lesson_id
            )
            db.add(config)
        
        # Update configuration values
        if config_data.beginner_distribution:
            dist = config_data.beginner_distribution
            config.beginner_easy_ratio = dist.get("easy", 0.7)
            config.beginner_medium_ratio = dist.get("medium", 0.25)
            config.beginner_hard_ratio = dist.get("hard", 0.05)
        
        if config_data.intermediate_distribution:
            dist = config_data.intermediate_distribution
            config.intermediate_easy_ratio = dist.get("easy", 0.3)
            config.intermediate_medium_ratio = dist.get("medium", 0.5)
            config.intermediate_hard_ratio = dist.get("hard", 0.2)
        
        if config_data.advanced_distribution:
            dist = config_data.advanced_distribution
            config.advanced_easy_ratio = dist.get("easy", 0.1)
            config.advanced_medium_ratio = dist.get("medium", 0.4)
            config.advanced_hard_ratio = dist.get("hard", 0.5)
        
        if config_data.thresholds:
            thresholds = config_data.thresholds
            config.increase_difficulty_threshold = thresholds.get("increase_difficulty", 0.8)
            config.decrease_difficulty_threshold = thresholds.get("decrease_difficulty", 0.4)
            config.time_efficiency_threshold = thresholds.get("time_efficiency", 1.2)
        
        config.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Algorithm config updated for course {course_id} by {current_user.email}")
        return {"message": "Configuration updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating algorithm config: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update configuration")

# Utility Routes

@dynamic_quiz_router.get("/capability-assessment/{lesson_id}")
async def assess_student_capability(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current capability assessment for a student in a lesson"""
    try:
        quiz_service = DynamicQuizService(db)
        capability = quiz_service.assess_student_capability(current_user.id, lesson_id)
        
        # Get detailed performance data
        performance = db.query(StudentPerformance).filter(
            StudentPerformance.student_id == current_user.id,
            StudentPerformance.lesson_id == lesson_id
        ).first()
        
        if performance:
            return {
                "student_id": current_user.id,
                "lesson_id": lesson_id,
                "current_capability": capability.value,
                "mastery_score": performance.mastery_score,
                "confidence_level": performance.confidence_level,
                "learning_velocity": performance.learning_velocity,
                "consistency_score": performance.consistency_score,
                "overall_accuracy": performance.get_overall_accuracy(),
                "recommended_difficulty": performance.recommended_difficulty.value,
                "assessment_date": performance.last_updated.isoformat()
            }
        else:
            return {
                "student_id": current_user.id,
                "lesson_id": lesson_id,
                "current_capability": capability.value,
                "message": "New student - initial assessment based on default settings"
            }
        
    except Exception as e:
        logger.error(f"Error assessing student capability: {e}")
        raise HTTPException(status_code=500, detail="Failed to assess capability")

@dynamic_quiz_router.get("/question-bank-stats/{course_id}")
async def get_question_bank_stats(
    course_id: int,
    lesson_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get statistics about the question bank"""
    if current_user.role not in ["admin", "instructor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and instructors can view question bank stats"
        )
    
    try:
        query = db.query(QuestionBank).filter(
            QuestionBank.course_id == course_id,
            QuestionBank.is_active == True
        )
        
        if lesson_id:
            query = query.filter(QuestionBank.lesson_id == lesson_id)
        
        # Overall stats
        total_questions = query.count()
        
        # By difficulty
        difficulty_stats = db.query(
            QuestionBank.difficulty_level,
            func.count(QuestionBank.id).label('count'),
            func.avg(QuestionBank.success_rate).label('avg_success_rate'),
            func.avg(QuestionBank.average_time_taken).label('avg_time')
        ).filter(
            QuestionBank.course_id == course_id,
            QuestionBank.is_active == True
        )
        
        if lesson_id:
            difficulty_stats = difficulty_stats.filter(QuestionBank.lesson_id == lesson_id)
        
        difficulty_breakdown = difficulty_stats.group_by(QuestionBank.difficulty_level).all()
        
        # By topic tags
        all_questions = query.all()
        topic_counts = {}
        for question in all_questions:
            if question.topic_tags:
                for tag in question.topic_tags:
                    topic_counts[tag] = topic_counts.get(tag, 0) + 1
        
        return {
            "course_id": course_id,
            "lesson_id": lesson_id,
            "total_questions": total_questions,
            "difficulty_breakdown": [
                {
                    "difficulty": stat.difficulty_level.value,
                    "count": stat.count,
                    "avg_success_rate": round(stat.avg_success_rate or 0, 2),
                    "avg_time_seconds": round(stat.avg_time or 0, 2)
                } for stat in difficulty_breakdown
            ],
            "topic_distribution": [
                {"topic": topic, "count": count}
                for topic, count in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)
            ][:10]  # Top 10 topics
        }
        
    except Exception as e:
        logger.error(f"Error getting question bank stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get question bank statistics")

# Background Tasks

async def update_student_analytics_background(
    student_id: int,
    lesson_id: int,
    course_id: int,
    db: Session
):
    """Background task to update student analytics after quiz completion"""
    try:
        # Update student analytics
        from models import StudentAnalytics
        
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
        
        # Update quiz-related metrics
        analytics.quizzes_attempted += 1
        analytics.last_activity = datetime.utcnow()
        
        # Get latest quiz score
        latest_quiz = db.query(DynamicQuiz).filter(
            DynamicQuiz.student_id == student_id,
            DynamicQuiz.course_id == course_id,
            DynamicQuiz.is_completed == True
        ).order_by(desc(DynamicQuiz.completed_at)).first()
        
        if latest_quiz and latest_quiz.final_score >= 70:  # Assuming 70% is passing
            analytics.quizzes_passed += 1
        
        # Update average quiz score
        all_quiz_scores = db.query(DynamicQuiz.final_score).filter(
            DynamicQuiz.student_id == student_id,
            DynamicQuiz.course_id == course_id,
            DynamicQuiz.is_completed == True
        ).all()
        
        if all_quiz_scores:
            analytics.avg_quiz_score = sum(score[0] for score in all_quiz_scores) / len(all_quiz_scores)
            analytics.best_quiz_score = max(score[0] for score in all_quiz_scores)
        
        db.commit()
        logger.info(f"Background analytics update completed for student {student_id}")
        
    except Exception as e:
        logger.error(f"Error in background analytics update: {e}")
        db.rollback()

# Export router
__all__ = ["dynamic_quiz_router"]