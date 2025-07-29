import google.generativeai as genai
import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import User, Enrollment, QuizAttempt, LessonProgress, StudentAnalytics, Course, Quiz

logger = logging.getLogger(__name__)

# Configure Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyC2AS04KAr1EgbQAeGSgDFAZnUCfyn3Ml8")
genai.configure(api_key=GEMINI_API_KEY)

class GeminiAnalytics:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-pro')
    
    def generate_student_insights(self, user_id: int, db: Session) -> str:
        """Generate personalized AI insights for a student using Gemini"""
        try:
            # Gather student data
            student_data = self._get_student_data(user_id, db)
            
            if not student_data:
                return "Start learning to get personalized insights!"
            
            # Create prompt for Gemini
            prompt = self._create_student_insights_prompt(student_data)
            
            # Generate insights using Gemini
            response = self.model.generate_content(prompt)
            insights = response.text
            
            # Clean and format the response
            insights = self._format_insights(insights)
            
            logger.info(f"Generated AI insights for user {user_id}")
            return insights
            
        except Exception as e:
            logger.error(f"Error generating student insights: {e}")
            return "Keep learning to unlock personalized insights powered by AI! 🚀"
    
    def analyze_quiz_performance(self, quiz_attempt_data: List[Dict], quiz_questions: List[Dict]) -> Dict[str, Any]:
        """Analyze quiz performance and identify weak areas using Gemini"""
        try:
            # Create prompt for quiz analysis
            prompt = self._create_quiz_analysis_prompt(quiz_attempt_data, quiz_questions)
            
            # Generate analysis using Gemini
            response = self.model.generate_content(prompt)
            analysis_text = response.text
            
            # Parse the response and structure it
            analysis = self._parse_quiz_analysis(analysis_text, quiz_attempt_data, quiz_questions)
            
            logger.info("Generated quiz performance analysis")
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing quiz performance: {e}")
            return self._default_quiz_analysis(quiz_attempt_data, quiz_questions)
    
    def generate_learning_recommendations(self, user_id: int, db: Session) -> List[Dict[str, Any]]:
        """Generate personalized learning recommendations using Gemini"""
        try:
            # Get student learning pattern data
            learning_data = self._get_learning_pattern_data(user_id, db)
            
            # Create prompt for recommendations
            prompt = self._create_recommendations_prompt(learning_data)
            
            # Generate recommendations using Gemini
            response = self.model.generate_content(prompt)
            recommendations_text = response.text
            
            # Parse and structure recommendations
            recommendations = self._parse_recommendations(recommendations_text, db)
            
            logger.info(f"Generated learning recommendations for user {user_id}")
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return self._default_recommendations(user_id, db)
    
    def analyze_course_effectiveness(self, course_id: int, db: Session) -> Dict[str, Any]:
        """Analyze course effectiveness and provide improvement suggestions"""
        try:
            # Get course performance data
            course_data = self._get_course_performance_data(course_id, db)
            
            # Create prompt for course analysis
            prompt = self._create_course_analysis_prompt(course_data)
            
            # Generate analysis using Gemini
            response = self.model.generate_content(prompt)
            analysis_text = response.text
            
            # Parse and structure the analysis
            analysis = self._parse_course_analysis(analysis_text, course_data)
            
            logger.info(f"Generated course effectiveness analysis for course {course_id}")
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing course effectiveness: {e}")
            return self._default_course_analysis(course_data)
    
    def predict_dropout_risk(self, user_id: int, db: Session) -> Dict[str, Any]:
        """Predict student dropout risk using AI analysis"""
        try:
            # Get student engagement data
            engagement_data = self._get_engagement_data(user_id, db)
            
            # Create prompt for dropout prediction
            prompt = self._create_dropout_prediction_prompt(engagement_data)
            
            # Generate prediction using Gemini
            response = self.model.generate_content(prompt)
            prediction_text = response.text
            
            # Parse and structure the prediction
            prediction = self._parse_dropout_prediction(prediction_text, engagement_data)
            
            logger.info(f"Generated dropout risk prediction for user {user_id}")
            return prediction
            
        except Exception as e:
            logger.error(f"Error predicting dropout risk: {e}")
            return self._default_dropout_prediction(engagement_data)
    
    def _get_student_data(self, user_id: int, db: Session) -> Dict[str, Any]:
        """Gather comprehensive student data for analysis"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return None
            
            enrollments = db.query(Enrollment).filter(Enrollment.student_id == user_id).all()
            quiz_attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == user_id).all()
            lesson_progress = db.query(LessonProgress).filter(LessonProgress.student_id == user_id).all()
            analytics = db.query(StudentAnalytics).filter(StudentAnalytics.student_id == user_id).all()
            
            return {
                "user_info": {
                    "name": user.full_name,
                    "email": user.email,
                    "created_at": user.created_at.isoformat()
                },
                "enrollments": [
                    {
                        "course_id": e.course_id,
                        "progress": e.progress_percentage,
                        "completed": e.is_completed,
                        "enrolled_date": e.enrolled_at.isoformat(),
                        "watch_time": e.total_watch_time
                    } for e in enrollments
                ],
                "quiz_performance": [
                    {
                        "quiz_id": qa.quiz_id,
                        "score": qa.percentage,
                        "passed": qa.is_passed,
                        "attempt_date": qa.attempted_at.isoformat(),
                        "time_taken": qa.time_taken_minutes
                    } for qa in quiz_attempts
                ],
                "learning_activity": [
                    {
                        "lesson_id": lp.lesson_id,
                        "completed": lp.is_completed,
                        "watch_time": lp.watch_time_seconds,
                        "completion_percentage": lp.completion_percentage,
                        "last_accessed": lp.last_accessed.isoformat()
                    } for lp in lesson_progress
                ],
                "analytics_summary": {
                    "total_courses": len(enrollments),
                    "completed_courses": len([e for e in enrollments if e.is_completed]),
                    "avg_quiz_score": sum(qa.percentage for qa in quiz_attempts) / len(quiz_attempts) if quiz_attempts else 0,
                    "total_watch_time": sum(e.total_watch_time for e in enrollments),
                    "active_days": len(set(lp.last_accessed.date() for lp in lesson_progress if lp.last_accessed))
                }
            }
        except Exception as e:
            logger.error(f"Error gathering student data: {e}")
            return None
    
    def _create_student_insights_prompt(self, student_data: Dict[str, Any]) -> str:
        """Create a comprehensive prompt for student insights"""
        analytics = student_data["analytics_summary"]
        recent_activity = len([lp for lp in student_data["learning_activity"] 
                             if datetime.fromisoformat(lp["last_accessed"]) > datetime.now() - timedelta(days=7)])
        
        prompt = f"""
        Analyze the following student learning data and provide personalized, encouraging insights in 2-3 sentences:

        Student Performance Summary:
        - Total Courses Enrolled: {analytics['total_courses']}
        - Completed Courses: {analytics['completed_courses']}
        - Average Quiz Score: {analytics['avg_quiz_score']:.1f}%
        - Total Watch Time: {analytics['total_watch_time']} minutes
        - Active Learning Days: {analytics['active_days']}
        - Recent Activity (last 7 days): {recent_activity} lessons accessed

        Quiz Performance Trend:
        {json.dumps([qp["score"] for qp in student_data["quiz_performance"][-5:]], indent=2)}

        Course Progress:
        {json.dumps([{"progress": e["progress"], "completed": e["completed"]} for e in student_data["enrollments"]], indent=2)}

        Generate insights that:
        1. Acknowledge their achievements and progress
        2. Identify patterns in their learning behavior
        3. Provide specific, actionable recommendations
        4. Keep a positive, motivating tone
        5. Use emojis appropriately

        Focus on what they're doing well and how they can improve. Be specific about their strengths and areas for growth.
        """
        
        return prompt
    
    def _create_quiz_analysis_prompt(self, quiz_attempt_data: List[Dict], quiz_questions: List[Dict]) -> str:
        """Create prompt for detailed quiz analysis"""
        incorrect_answers = [q for q in quiz_attempt_data if not q.get("is_correct", False)]
        
        prompt = f"""
        Analyze this quiz performance and provide detailed feedback:

        Quiz Results:
        - Total Questions: {len(quiz_questions)}
        - Correct Answers: {len(quiz_attempt_data) - len(incorrect_answers)}
        - Incorrect Answers: {len(incorrect_answers)}
        - Score: {(len(quiz_attempt_data) - len(incorrect_answers)) / len(quiz_questions) * 100:.1f}%

        Incorrect Answers Analysis:
        {json.dumps(incorrect_answers, indent=2)}

        Question Topics and Difficulty:
        {json.dumps([{"topic": q.get("topic", "General"), "difficulty": q.get("difficulty", "medium")} for q in quiz_questions], indent=2)}

        Provide analysis in JSON format with:
        {{
            "weak_areas": ["topic1", "topic2"],
            "strength_areas": ["topic3", "topic4"],
            "detailed_feedback": "comprehensive feedback text",
            "study_recommendations": ["specific recommendation 1", "recommendation 2"],
            "next_steps": "what the student should focus on next"
        }}
        """
        
        return prompt
    
    def _create_recommendations_prompt(self, learning_data: Dict[str, Any]) -> str:
        """Create prompt for learning recommendations"""
        prompt = f"""
        Based on this student's learning patterns, recommend 3-5 specific courses or learning paths:

        Learning Data:
        {json.dumps(learning_data, indent=2)}

        Provide recommendations in JSON format:
        {{
            "recommendations": [
                {{
                    "title": "Course Title",
                    "reason": "Why this course is recommended",
                    "difficulty": "beginner/intermediate/advanced",
                    "estimated_duration": "X hours",
                    "key_benefits": ["benefit1", "benefit2"]
                }}
            ]
        }}

        Base recommendations on:
        1. Their current skill level and progress
        2. Topics they've shown interest in
        3. Areas where they need improvement
        4. Natural progression from completed courses
        """
        
        return prompt
    
    def _format_insights(self, insights: str) -> str:
        """Clean and format AI-generated insights"""
        # Remove any unwanted formatting or artifacts
        insights = insights.strip()
        
        # Ensure it's not too long (limit to ~200 characters)
        if len(insights) > 200:
            insights = insights[:197] + "..."
        
        return insights
    
    def _parse_quiz_analysis(self, analysis_text: str, quiz_attempt_data: List[Dict], quiz_questions: List[Dict]) -> Dict[str, Any]:
        """Parse and structure quiz analysis from Gemini response"""
        try:
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\{.*\}', analysis_text, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
            else:
                # Fallback to default analysis
                return self._default_quiz_analysis(quiz_attempt_data, quiz_questions)
            
            # Validate and enhance the analysis
            if "weak_areas" not in analysis:
                analysis["weak_areas"] = self._identify_weak_areas(quiz_attempt_data, quiz_questions)
            
            if "detailed_feedback" not in analysis:
                analysis["detailed_feedback"] = "Focus on reviewing the topics where you had incorrect answers."
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error parsing quiz analysis: {e}")
            return self._default_quiz_analysis(quiz_attempt_data, quiz_questions)
    
    def _default_quiz_analysis(self, quiz_attempt_data: List[Dict], quiz_questions: List[Dict]) -> Dict[str, Any]:
        """Provide default quiz analysis when AI fails"""
        incorrect_answers = [q for q in quiz_attempt_data if not q.get("is_correct", False)]
        correct_count = len(quiz_attempt_data) - len(incorrect_answers)
        score = (correct_count / len(quiz_questions)) * 100
        
        weak_areas = self._identify_weak_areas(quiz_attempt_data, quiz_questions)
        
        return {
            "weak_areas": weak_areas,
            "strength_areas": ["Areas where you answered correctly"],
            "detailed_feedback": f"You scored {score:.1f}% on this quiz. Focus on reviewing the topics where you had difficulty.",
            "study_recommendations": [
                "Review the course materials for topics you missed",
                "Take practice quizzes to reinforce learning",
                "Ask questions about concepts you found challenging"
            ],
            "next_steps": "Continue practicing and review weak areas before moving to the next topic."
        }
    
    def _identify_weak_areas(self, quiz_attempt_data: List[Dict], quiz_questions: List[Dict]) -> List[str]:
        """Identify weak areas from quiz performance"""
        weak_topics = set()
        
        for i, attempt in enumerate(quiz_attempt_data):
            if not attempt.get("is_correct", False) and i < len(quiz_questions):
                topic = quiz_questions[i].get("topic", f"Question {i+1}")
                weak_topics.add(topic)
        
        return list(weak_topics)
    
    def _default_recommendations(self, user_id: int, db: Session) -> List[Dict[str, Any]]:
        """Provide default recommendations when AI fails"""
        try:
            # Get available courses not enrolled by user
            enrolled_course_ids = db.query(Enrollment.course_id).filter(
                Enrollment.student_id == user_id
            ).subquery()
            
            available_courses = db.query(Course).filter(
                Course.is_active == True,
                ~Course.id.in_(enrolled_course_ids)
            ).limit(3).all()
            
            recommendations = []
            for course in available_courses:
                recommendations.append({
                    "id": course.id,
                    "title": course.title,
                    "reason": "Recommended based on your learning progress",
                    "difficulty": course.difficulty_level,
                    "estimated_duration": f"{course.duration_hours} hours",
                    "key_benefits": ["Expand your knowledge", "Build new skills"]
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating default recommendations: {e}")
            return []
    
    def _get_learning_pattern_data(self, user_id: int, db: Session) -> Dict[str, Any]:
        """Get learning pattern data for recommendations"""
        try:
            enrollments = db.query(Enrollment).filter(Enrollment.student_id == user_id).all()
            quiz_attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == user_id).all()
            
            return {
                "completed_courses": [e.course_id for e in enrollments if e.is_completed],
                "current_courses": [e.course_id for e in enrollments if not e.is_completed],
                "strong_subjects": [],  # TODO: Implement subject analysis
                "preferred_difficulty": "intermediate",  # TODO: Calculate from data
                "avg_quiz_score": sum(qa.percentage for qa in quiz_attempts) / len(quiz_attempts) if quiz_attempts else 0,
                "learning_pace": "steady"  # TODO: Calculate from engagement data
            }
        except Exception as e:
            logger.error(f"Error getting learning pattern data: {e}")
            return {}
    
    def _parse_recommendations(self, recommendations_text: str, db: Session) -> List[Dict[str, Any]]:
        """Parse recommendations from Gemini response"""
        try:
            import re
            json_match = re.search(r'\{.*\}', recommendations_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                return parsed.get("recommendations", [])
            else:
                return []
        except Exception as e:
            logger.error(f"Error parsing recommendations: {e}")
            return []
    
    def _get_course_performance_data(self, course_id: int, db: Session) -> Dict[str, Any]:
        """Get course performance data for analysis"""
        # Implementation for course performance data gathering
        return {}
    
    def _create_course_analysis_prompt(self, course_data: Dict[str, Any]) -> str:
        """Create prompt for course analysis"""
        return "Analyze this course performance data..."
    
    def _parse_course_analysis(self, analysis_text: str, course_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse course analysis from Gemini"""
        return {}
    
    def _default_course_analysis(self, course_data: Dict[str, Any]) -> Dict[str, Any]:
        """Default course analysis"""
        return {}
    
    def _get_engagement_data(self, user_id: int, db: Session) -> Dict[str, Any]:
        """Get engagement data for dropout prediction"""
        return {}
    
    def _create_dropout_prediction_prompt(self, engagement_data: Dict[str, Any]) -> str:
        """Create prompt for dropout prediction"""
        return "Predict dropout risk based on this data..."
    
    def _parse_dropout_prediction(self, prediction_text: str, engagement_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse dropout prediction"""
        return {}
    
    def _default_dropout_prediction(self, engagement_data: Dict[str, Any]) -> Dict[str, Any]:
        """Default dropout prediction"""
        return {"risk_level": "low", "confidence": 0.5}

# Global instance
gemini_analytics = GeminiAnalytics()