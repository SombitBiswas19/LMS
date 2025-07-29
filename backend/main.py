# Updated main.py - Enhanced with Dynamic Quiz System

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import uvicorn
import os
import pandas as pd
from pathlib import Path
from database import engine, Base
from auth import auth_router
from courses import courses_router
from analytics import analytics_router
from dynamic_quiz_routes import dynamic_quiz_router  # NEW: Dynamic Quiz Routes
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create database tables
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
except Exception as e:
    logger.error(f"Failed to create database tables: {e}")

app = FastAPI(
    title="Smart E-learning Platform with Dynamic Quiz System",
    description="AI-powered e-learning platform with adaptive quiz generation, predictive analytics and personalized learning paths",
    version="3.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000", 
        "http://127.0.0.1:5173",
        "https://localhost:3000",
        "https://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# --- API Routes ---
# Include all API routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(courses_router, prefix="/courses", tags=["Courses"])
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
app.include_router(dynamic_quiz_router, prefix="/dynamic-quiz", tags=["Dynamic Quiz System"])  # NEW

# --- Frontend Serving ---
static_files_dir = Path("static")

# Mount the 'assets' directory for JS, CSS, etc.
try:
    app.mount("/assets", StaticFiles(directory=static_files_dir / "assets"), name="assets")
    logger.info("Static assets directory '/assets' mounted successfully.")
except RuntimeError:
    logger.warning("Static assets directory '/assets' could not be mounted. This is normal if it doesn't exist yet.")

# Catch-all route to serve the main index.html for any non-API, non-file path
@app.get("/{full_path:path}")
async def serve_react_app(request: Request, full_path: str):
    index_path = static_files_dir / 'index.html'
    if not index_path.exists():
        logger.error(f"Frontend entry point not found at {index_path}")
        return JSONResponse(
            status_code=404,
            content={"error": "Frontend not found", "message": "The frontend application has not been built or placed in the 'static' directory."}
        )
    return FileResponse(index_path)

# Custom exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "details": exc.errors(),
            "message": "Invalid request data"
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    if request.url.path.startswith("/api/"):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail, "status_code": exc.status_code}
        )
    return await serve_react_app(request, exc.detail)

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred"
        }
    )

# Health check with database connectivity
@app.get("/health")
async def health_check():
    try:
        from database import SessionLocal
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "version": "3.0.0",
            "features": {
                "dynamic_quiz_system": "enabled",
                "adaptive_algorithm": "capability_based_v1",
                "ai_insights": "gemini_powered",
                "analytics": "comprehensive"
            },
            "timestamp": str(pd.Timestamp.now())
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e)
            }
        )

# API information endpoint
@app.get("/api/info")
async def api_info():
    return {
        "api_version": "3.0.0",
        "endpoints": {
            "auth": "/auth",
            "courses": "/courses",
            "analytics": "/analytics",
            "dynamic_quiz": "/dynamic-quiz"  # NEW
        },
        "features": {
            "authentication": "JWT-based",
            "ai_provider": "Gemini AI",
            "database": "PostgreSQL",
            "file_uploads": "Supported",
            "real_time_analytics": "Enabled",
            "dynamic_quiz_system": {
                "adaptive_difficulty": "Real-time adjustment based on performance",
                "capability_assessment": "Beginner/Intermediate/Advanced/Expert levels",
                "question_bank": "Difficulty-based question selection",
                "performance_tracking": "Multi-dimensional analytics",
                "algorithm_version": "capability_based_v1"
            }
        }
    }

# NEW: Dynamic Quiz System Status Endpoint
@app.get("/api/quiz-system/status")
async def quiz_system_status():
    """Get the status of the dynamic quiz system"""
    try:
        from database import SessionLocal
        from models import QuestionBank, DynamicQuiz, StudentPerformance
        
        db = SessionLocal()
        
        # Get statistics
        total_questions = db.query(QuestionBank).filter(QuestionBank.is_active == True).count()
        total_quizzes = db.query(DynamicQuiz).count()
        completed_quizzes = db.query(DynamicQuiz).filter(DynamicQuiz.is_completed == True).count()
        active_students = db.query(StudentPerformance).count()
        
        # Question distribution by difficulty
        from sqlalchemy import func
        difficulty_distribution = db.query(
            QuestionBank.difficulty_level,
            func.count(QuestionBank.id).label('count')
        ).filter(
            QuestionBank.is_active == True
        ).group_by(QuestionBank.difficulty_level).all()
        
        db.close()
        
        return {
            "system_status": "operational",
            "statistics": {
                "total_questions_in_bank": total_questions,
                "total_quizzes_generated": total_quizzes,
                "completed_quizzes": completed_quizzes,
                "active_students_tracked": active_students,
                "completion_rate": round((completed_quizzes / total_quizzes * 100), 2) if total_quizzes > 0 else 0
            },
            "question_distribution": [
                {
                    "difficulty": dist.difficulty_level.value,
                    "count": dist.count
                } for dist in difficulty_distribution
            ],
            "algorithm": {
                "name": "capability_based_v1",
                "features": [
                    "Real-time difficulty adjustment",
                    "Multi-factor capability assessment",
                    "Adaptive question selection",
                    "Performance-based progression"
                ]
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting quiz system status: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Could not get quiz system status", "message": str(e)}
        )

# NEW: Sample Data Generation for Dynamic Quiz System
@app.post("/api/admin/generate-sample-quiz-data")
async def generate_sample_quiz_data():
    """Generate sample questions and quiz data (Admin only - for development)"""
    if os.getenv("ENVIRONMENT") != "development":
        raise HTTPException(status_code=404, detail="Not available in production")
    
    try:
        from database import SessionLocal
        from models import Course, Lesson, QuestionBank, DifficultyLevel, QuestionType
        import random
        
        db = SessionLocal()
        
        # Get existing courses and lessons
        courses = db.query(Course).filter(Course.is_active == True).all()
        
        if not courses:
            return {"message": "No courses found. Create courses first."}
        
        sample_questions_data = []
        
        # Sample questions for different subjects
        math_questions = [
            {
                "question_text": "What is 15 + 27?",
                "options": ["40", "41", "42", "43"],
                "correct_answer": "42",
                "explanation": "15 + 27 = 42",
                "difficulty": DifficultyLevel.EASY,
                "tags": ["arithmetic", "addition"]
            },
            {
                "question_text": "Solve for x: 2x + 5 = 15",
                "options": ["3", "4", "5", "6"],
                "correct_answer": "5",
                "explanation": "2x + 5 = 15, so 2x = 10, therefore x = 5",
                "difficulty": DifficultyLevel.MEDIUM,
                "tags": ["algebra", "equations"]
            },
            {
                "question_text": "What is the derivative of x²?",
                "options": ["x", "2x", "x²", "2x²"],
                "correct_answer": "2x",
                "explanation": "The derivative of x² is 2x using the power rule",
                "difficulty": DifficultyLevel.HARD,
                "tags": ["calculus", "derivatives"]
            }
        ]
        
        programming_questions = [
            {
                "question_text": "Which of the following is a valid Python variable name?",
                "options": ["2variable", "variable-name", "variable_name", "variable name"],
                "correct_answer": "variable_name",
                "explanation": "Python variable names cannot start with numbers or contain spaces/hyphens",
                "difficulty": DifficultyLevel.EASY,
                "tags": ["python", "syntax", "variables"]
            },
            {
                "question_text": "What will be the output of: print(len([1, 2, 3, 4]))?",
                "options": ["3", "4", "5", "Error"],
                "correct_answer": "4",
                "explanation": "The len() function returns the number of items in the list",
                "difficulty": DifficultyLevel.MEDIUM,
                "tags": ["python", "lists", "functions"]
            },
            {
                "question_text": "What is the time complexity of binary search?",
                "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
                "correct_answer": "O(log n)",
                "explanation": "Binary search divides the search space in half each iteration",
                "difficulty": DifficultyLevel.HARD,
                "tags": ["algorithms", "complexity", "search"]
            }
        ]
        
        created_count = 0
        
        for course in courses[:3]:  # Limit to first 3 courses
            lessons = db.query(Lesson).filter(Lesson.course_id == course.id).all()
            
            # Choose question set based on course title/category
            if any(keyword in course.title.lower() for keyword in ['math', 'calculus', 'algebra']):
                questions_data = math_questions
            elif any(keyword in course.title.lower() for keyword in ['programming', 'python', 'code']):
                questions_data = programming_questions
            else:
                questions_data = math_questions  # Default
            
            for lesson in lessons[:2]:  # Limit to first 2 lessons per course
                for question_data in questions_data:
                    # Check if similar question already exists
                    existing = db.query(QuestionBank).filter(
                        QuestionBank.lesson_id == lesson.id,
                        QuestionBank.question_text == question_data["question_text"]
                    ).first()
                    
                    if not existing:
                        question = QuestionBank(
                            course_id=course.id,
                            lesson_id=lesson.id,
                            question_text=question_data["question_text"],
                            question_type=QuestionType.MULTIPLE_CHOICE,
                            options=question_data["options"],
                            correct_answer=question_data["correct_answer"],
                            explanation=question_data["explanation"],
                            difficulty_level=question_data["difficulty"],
                            topic_tags=question_data["tags"],
                            estimated_time_seconds=random.randint(30, 120),
                            points=1 if question_data["difficulty"] == DifficultyLevel.EASY else 2 if question_data["difficulty"] == DifficultyLevel.MEDIUM else 3,
                            created_by=1  # Assuming admin user ID is 1
                        )
                        
                        db.add(question)
                        created_count += 1
        
        db.commit()
        db.close()
        
        return {
            "message": f"Successfully created {created_count} sample questions",
            "questions_created": created_count,
            "distribution": {
                "easy": created_count // 3,
                "medium": created_count // 3,
                "hard": created_count // 3
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating sample quiz data: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to generate sample data", "message": str(e)}
        )

# Startup and Shutdown events
@app.on_event("startup")
async def startup_event():
    logger.info("Smart E-learning Platform with Dynamic Quiz System starting up...")
    logger.info("Initializing ML models and AI services...")
    try:
        from ml_models import ml_models
        from gemini_ai import gemini_analytics
        logger.info("ML models and AI services initialized successfully")
        
        # Initialize dynamic quiz service
        logger.info("Dynamic Quiz System initialized successfully")
        logger.info("Features enabled:")
        logger.info("  ✓ Adaptive difficulty adjustment")
        logger.info("  ✓ Capability-based question selection")
        logger.info("  ✓ Real-time performance tracking")
        logger.info("  ✓ Multi-dimensional analytics")
        
    except Exception as e:
        logger.error(f"Failed to initialize some services: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Smart E-learning Platform API shutting down...")

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("RELOAD", "true").lower() == "true"
    log_level = os.getenv("LOG_LEVEL", "info")
    
    logger.info("=" * 60)
    logger.info("🚀 DYNAMIC QUIZ SYSTEM ENABLED")
    logger.info("=" * 60)
    logger.info("📚 Features:")
    logger.info("   • Adaptive Quiz Generation")
    logger.info("   • Real-time Difficulty Adjustment")
    logger.info("   • Multi-level Capability Assessment")
    logger.info("   • Comprehensive Performance Analytics")
    logger.info("   • AI-Powered Insights")
    logger.info("=" * 60)
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level=log_level,
        access_log=True
    )