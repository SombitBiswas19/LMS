import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import os
import requests
import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import User, Course, Enrollment, QuizAttempt, StudentAnalytics

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "your-gemini-api-key")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={GEMINI_API_KEY}"

class MLModels:
    def __init__(self):
        self.tfidf_vectorizer = None
        self.course_similarity = None
        self.course_ids = []
        # Initialize TF-IDF for course similarity (lightweight, no file needed)
        self.initialize_vectorizers()
    
    def initialize_vectorizers(self):
        """Initialize vectorizers for text analysis"""
        # These are lightweight and don't need to be saved
        self.tfidf_vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
        self.question_vectorizer = None  # Will be initialized when needed
    
    def call_gemini_api(self, prompt: str) -> str:
        """Make API call to Gemini"""
        try:
            payload = {
                "contents": [{
                    "parts": [{
                        "text": prompt
                    }]
                }]
            }
            
            headers = {
                "Content-Type": "application/json"
            }
            
            response = requests.post(GEMINI_API_URL, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                return result['candidates'][0]['content']['parts'][0]['text']
            else:
                print(f"Gemini API error: {response.status_code} - {response.text}")
                return "AI analysis temporarily unavailable. Please try again later."
                
        except Exception as e:
            print(f"Error calling Gemini API: {str(e)}")
            return f"Error generating AI insights: {str(e)}"
    
    def prepare_student_data(self, db: Session, student_id: int) -> Dict:
        """Prepare student data for AI analysis"""
        
        # Get student info
        student = db.query(User).filter(User.id == student_id).first()
        if not student:
            return {}
        
        # Get enrollments
        enrollments = db.query(Enrollment).filter(Enrollment.student_id == student_id).all()
        
        # Get analytics
        analytics = db.query(StudentAnalytics).filter(StudentAnalytics.student_id == student_id).all()
        
        # Get quiz attempts
        quiz_attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == student_id).all()
        
        # Aggregate data
        total_watch_time = sum([a.total_watch_time_minutes for a in analytics])
        total_videos_watched = sum([a.videos_watched for a in analytics])
        total_quizzes_attempted = sum([a.quizzes_attempted for a in analytics])
        avg_quiz_score = np.mean([a.avg_quiz_score for a in analytics if a.avg_quiz_score > 0]) if analytics else 0
        total_login_count = sum([a.login_count for a in analytics])
        
        # Calculate completion rate
        completed_courses = len([e for e in enrollments if e.is_completed])
        completion_rate = (completed_courses / len(enrollments) * 100) if enrollments else 0
        
        # Recent quiz performance
        recent_quiz_scores = [attempt.score / attempt.max_score * 100 for attempt in quiz_attempts[-5:]]
        
        return {
            "student_name": student.full_name,
            "total_enrollments": len(enrollments),
            "completed_courses": completed_courses,
            "completion_rate": completion_rate,
            "total_watch_time": total_watch_time,
            "videos_watched": total_videos_watched,
            "quizzes_attempted": total_quizzes_attempted,
            "avg_quiz_score": avg_quiz_score if not np.isnan(avg_quiz_score) else 0,
            "login_count": total_login_count,
            "recent_quiz_scores": recent_quiz_scores,
            "quiz_attempts_count": len(quiz_attempts)
        }
    
    def predict_dropout_risk(self, db: Session, student_id: int) -> float:
        """Use Gemini AI to predict dropout risk"""
        
        student_data = self.prepare_student_data(db, student_id)
        
        if not student_data:
            return 0.5  # Default medium risk
        
        prompt = f"""
        Analyze this student's learning behavior and predict their dropout risk on a scale of 0.0 to 1.0:
        
        Student Learning Data:
        - Total enrollments: {student_data['total_enrollments']}
        - Completed courses: {student_data['completed_courses']}
        - Completion rate: {student_data['completion_rate']:.1f}%
        - Total watch time: {student_data['total_watch_time']} minutes
        - Videos watched: {student_data['videos_watched']}
        - Quizzes attempted: {student_data['quizzes_attempted']}
        - Average quiz score: {student_data['avg_quiz_score']:.1f}%
        - Login frequency: {student_data['login_count']} times
        - Recent quiz scores: {student_data['recent_quiz_scores']}
        
        Consider these risk factors:
        - Low engagement (watch time, login frequency)
        - Poor performance (quiz scores, completion rate)
        - Declining activity patterns
        - Course abandonment patterns
        
        Please respond with ONLY a single number between 0.0 and 1.0 representing dropout risk:
        - 0.0-0.3: Low risk
        - 0.3-0.7: Medium risk  
        - 0.7-1.0: High risk
        
        Return only the numerical value (e.g., 0.25):
        """
        
        response = self.call_gemini_api(prompt)
        
        try:
            # Extract numerical value from response
            risk_score = float(response.strip())
            return max(0.0, min(1.0, risk_score))  # Clamp between 0 and 1
        except:
            # Fallback calculation if Gemini doesn't return a valid number
            if student_data['total_watch_time'] < 30 and student_data['login_count'] < 5:
                return 0.8
            elif student_data['avg_quiz_score'] < 50:
                return 0.7
            elif student_data['completion_rate'] < 30:
                return 0.6
            else:
                return 0.3
    
    def predict_capability(self, db: Session, student_id: int) -> float:
        """Use Gemini AI to predict student capability"""
        
        student_data = self.prepare_student_data(db, student_id)
        
        if not student_data:
            return 0.5  # Default average capability
        
        prompt = f"""
        Analyze this student's learning performance and predict their learning capability on a scale of 0.0 to 1.0:
        
        Student Performance Data:
        - Average quiz score: {student_data['avg_quiz_score']:.1f}%
        - Course completion rate: {student_data['completion_rate']:.1f}%
        - Total quizzes attempted: {student_data['quizzes_attempted']}
        - Total watch time: {student_data['total_watch_time']} minutes
        - Videos watched: {student_data['videos_watched']}
        - Recent quiz scores: {student_data['recent_quiz_scores']}
        
        Consider these capability indicators:
        - Consistent high performance in quizzes
        - High course completion rates
        - Steady engagement and improvement
        - Learning velocity and retention
        
        Please respond with ONLY a single number between 0.0 and 1.0 representing learning capability:
        - 0.0-0.3: Below average
        - 0.3-0.7: Average
        - 0.7-1.0: Above average
        
        Return only the numerical value (e.g., 0.75):
        """
        
        response = self.call_gemini_api(prompt)
        
        try:
            capability_score = float(response.strip())
            return max(0.0, min(1.0, capability_score))
        except:
            # Fallback calculation
            score = student_data['avg_quiz_score'] / 100 * 0.6
            completion = student_data['completion_rate'] / 100 * 0.4
            return max(0.0, min(1.0, score + completion))
    
    def build_course_similarity_matrix(self, db: Session):
        """Build TF-IDF similarity matrix for courses (in-memory, no file storage)"""
        
        courses = db.query(Course).filter(Course.is_active == True).all()
        
        if not courses:
            return
        
        # Combine course title, description, and tags for similarity
        course_texts = []
        for course in courses:
            text = f"{course.title} {course.description} {' '.join(course.tags or [])}"
            course_texts.append(text)
        
        # Build TF-IDF matrix (in-memory)
        if not self.tfidf_vectorizer:
            self.tfidf_vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
        
        tfidf_matrix = self.tfidf_vectorizer.fit_transform(course_texts)
        
        # Calculate similarity matrix
        self.course_similarity = cosine_similarity(tfidf_matrix)
        
        # Store course IDs for reference
        self.course_ids = [course.id for course in courses]
        
        print(f"Course similarity matrix built for {len(courses)} courses")
    
    def get_course_recommendations(self, db: Session, student_id: int, num_recommendations: int = 5) -> List[int]:
        """Use Gemini AI to generate personalized course recommendations"""
        
        student_data = self.prepare_student_data(db, student_id)
        
        # Get student's enrolled courses
        enrollments = db.query(Enrollment).filter(Enrollment.student_id == student_id).all()
        enrolled_course_ids = [e.course_id for e in enrollments]
        
        # Get all available courses
        all_courses = db.query(Course).filter(Course.is_active == True).all()
        available_courses = [c for c in all_courses if c.id not in enrolled_course_ids]
        
        if not available_courses:
            return []
        
        # Prepare course information for Gemini
        course_info = []
        for course in available_courses:
            course_info.append({
                "id": course.id,
                "title": course.title,
                "description": course.description[:100],
                "difficulty": course.difficulty_level,
                "tags": course.tags or [],
                "instructor": course.instructor
            })
        
        # Get enrolled course details for context
        enrolled_courses = []
        for enrollment in enrollments:
            course = db.query(Course).filter(Course.id == enrollment.course_id).first()
            if course:
                enrolled_courses.append({
                    "title": course.title,
                    "difficulty": course.difficulty_level,
                    "tags": course.tags or [],
                    "progress": enrollment.progress_percentage
                })
        
        prompt = f"""
        Based on this student's learning profile, recommend the top {num_recommendations} courses from the available options:
        
        Student Profile:
        - Current enrolled courses: {enrolled_courses}
        - Average quiz score: {student_data['avg_quiz_score']:.1f}%
        - Completion rate: {student_data['completion_rate']:.1f}%
        - Learning engagement level: {"High" if student_data['total_watch_time'] > 100 else "Medium" if student_data['total_watch_time'] > 50 else "Low"}
        
        Available Courses:
        {json.dumps(course_info, indent=2)}
        
        Consider:
        1. Student's current skill level and progress
        2. Natural learning progression (difficulty levels)
        3. Topic relevance to enrolled courses
        4. Student's demonstrated interests and strengths
        
        Please respond with ONLY a JSON array of course IDs in order of recommendation priority.
        Example format: [1, 3, 5, 2, 4]
        
        Return only the JSON array:
        """
        
        response = self.call_gemini_api(prompt)
        
        try:
            # Parse JSON response
            recommended_ids = json.loads(response.strip())
            return recommended_ids[:num_recommendations]
        except:
            # Fallback: return popular courses
            popular_courses = db.query(Course.id).join(Enrollment).group_by(Course.id).order_by(func.count(Enrollment.id).desc()).limit(num_recommendations).all()
            return [course[0] for course in popular_courses]
    
    def search_questions_ir(self, query: str, questions_bank: List[Dict]) -> List[Dict]:
        """Information Retrieval based question search using TF-IDF (in-memory)"""
        
        if not questions_bank:
            return []
        
        # Extract question texts
        question_texts = [q.get('question', '') for q in questions_bank]
        
        # Create TF-IDF vectorizer for questions (in-memory)
        if not self.question_vectorizer:
            self.question_vectorizer = TfidfVectorizer(stop_words='english')
        
        try:
            self.question_tfidf = self.question_vectorizer.fit_transform(question_texts)
            
            # Vectorize query
            query_vector = self.question_vectorizer.transform([query])
            
            # Calculate similarity
            similarities = cosine_similarity(query_vector, self.question_tfidf).flatten()
            
            # Get top similar questions
            top_indices = np.argsort(similarities)[::-1][:5]
            
            return [questions_bank[i] for i in top_indices if similarities[i] > 0.1]
        except Exception as e:
            print(f"Error in question search: {e}")
            return questions_bank[:5]  # Return first 5 as fallback
    
    def get_ai_insights(self, student_data: Dict) -> str:
        """Generate comprehensive AI insights using Gemini"""
        
        prompt = f"""
        Analyze this student's learning data and provide personalized insights and recommendations:
        
        Student Learning Analytics:
        - Total watch time: {student_data.get('watch_time', 0)} minutes
        - Videos watched: {student_data.get('videos_watched', 0)}
        - Quizzes attempted: {student_data.get('quizzes_attempted', 0)}
        - Average quiz score: {student_data.get('avg_quiz_score', 0):.1f}%
        - Login frequency: {student_data.get('login_count', 0)} sessions
        - Course completion rate: {student_data.get('completion_rate', 0):.1f}%
        
        Please provide a comprehensive analysis including:
        
        1. **Learning Pattern Analysis**: Identify the student's learning behaviors and engagement patterns
        
        2. **Strengths and Areas for Improvement**: Highlight what the student is doing well and where they can improve
        
        3. **Personalized Learning Recommendations**: Suggest specific actions to enhance learning outcomes
        
        4. **Motivation and Engagement Tips**: Provide advice to maintain or increase motivation
        
        5. **Risk Assessment**: Evaluate if the student is at risk of falling behind
        
        Keep the response conversational, encouraging, and actionable. Limit to 3-4 paragraphs.
        """
        
        return self.call_gemini_api(prompt)
    
    def get_course_difficulty_recommendation(self, db: Session, student_id: int) -> str:
        """Recommend appropriate course difficulty level using Gemini AI"""
        
        student_data = self.prepare_student_data(db, student_id)
        
        prompt = f"""
        Based on this student's performance data, recommend the most appropriate course difficulty level:
        
        Performance Metrics:
        - Average quiz score: {student_data['avg_quiz_score']:.1f}%
        - Course completion rate: {student_data['completion_rate']:.1f}%
        - Total courses completed: {student_data['completed_courses']}
        - Learning engagement: {student_data['total_watch_time']} minutes watch time
        
        Available difficulty levels:
        - beginner: For students new to the subject
        - intermediate: For students with some experience
        - advanced: For experienced students seeking challenge
        
        Please respond with ONLY one word: beginner, intermediate, or advanced
        """
        
        response = self.call_gemini_api(prompt)
        
        difficulty = response.strip().lower()
        if difficulty in ['beginner', 'intermediate', 'advanced']:
            return difficulty
        else:
            # Fallback logic
            if student_data['avg_quiz_score'] > 80 and student_data['completion_rate'] > 80:
                return 'advanced'
            elif student_data['avg_quiz_score'] > 60 and student_data['completion_rate'] > 50:
                return 'intermediate'
            else:
                return 'beginner'
    
    def update_student_analytics(self, db: Session, student_id: int, course_id: int, activity_data: Dict):
        """Update student analytics with new activity data"""
        
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
        
        # Update analytics based on activity
        if 'watch_time' in activity_data:
            analytics.total_watch_time_minutes += activity_data['watch_time']
        
        if 'video_watched' in activity_data:
            analytics.videos_watched += 1
        
        if 'quiz_score' in activity_data:
            analytics.quizzes_attempted += 1
            # Update average quiz score
            current_avg = analytics.avg_quiz_score or 0
            current_count = analytics.quizzes_attempted
            new_avg = ((current_avg * (current_count - 1)) + activity_data['quiz_score']) / current_count
            analytics.avg_quiz_score = new_avg
        
        if 'login' in activity_data:
            analytics.login_count += 1
        
        # Update AI-powered risk scores
        analytics.dropout_risk_score = self.predict_dropout_risk(db, student_id)
        analytics.capability_score = self.predict_capability(db, student_id)
        
        db.commit()

# Global ML instance
ml_models = MLModels()