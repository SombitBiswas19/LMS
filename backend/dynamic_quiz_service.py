# dynamic_quiz_service.py - Complete Dynamic Quiz Service Implementation

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc, asc
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import random
import logging
from models import (
    QuestionBank, StudentPerformance, DynamicQuiz, QuestionAttempt,
    AdaptiveAlgorithmConfig, DifficultyLevel, CapabilityLevel, User, Course, Lesson
)

logger = logging.getLogger(__name__)

class DynamicQuizService:
    """Service for generating and managing adaptive quizzes based on student capability"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def assess_student_capability(self, student_id: int, lesson_id: int) -> CapabilityLevel:
        """
        Assess student's current capability level for a specific lesson
        Returns appropriate capability level based on historical performance
        """
        try:
            # Get student performance record
            performance = self.db.query(StudentPerformance).filter(
                StudentPerformance.student_id == student_id,
                StudentPerformance.lesson_id == lesson_id
            ).first()
            
            if not performance:
                # For new students, check if they have any performance in the same course
                lesson = self.db.query(Lesson).filter(Lesson.id == lesson_id).first()
                if lesson:
                    course_performance = self.db.query(StudentPerformance).filter(
                        StudentPerformance.student_id == student_id,
                        StudentPerformance.course_id == lesson.course_id
                    ).first()
                    
                    if course_performance:
                        # Use course-level performance as starting point
                        performance = self._create_initial_performance_record(student_id, lesson_id)
                        performance.current_capability = course_performance.current_capability
                        self.db.commit()
                        return performance.current_capability
                
                # Create new performance record with beginner level
                performance = self._create_initial_performance_record(student_id, lesson_id)
                return CapabilityLevel.BEGINNER
            
            # Calculate overall accuracy
            overall_accuracy = performance.get_overall_accuracy()
            
            # Calculate consistency and learning velocity factors
            consistency_factor = performance.consistency_score
            velocity_factor = performance.learning_velocity
            
            # Determine capability based on multiple factors
            if overall_accuracy >= 90 and consistency_factor >= 0.8 and velocity_factor >= 1.2:
                capability = CapabilityLevel.EXPERT
            elif overall_accuracy >= 75 and consistency_factor >= 0.6:
                capability = CapabilityLevel.ADVANCED
            elif overall_accuracy >= 50 and consistency_factor >= 0.4:
                capability = CapabilityLevel.INTERMEDIATE
            else:
                capability = CapabilityLevel.BEGINNER
            
            # Update performance record
            performance.current_capability = capability
            performance.last_updated = datetime.utcnow()
            self.db.commit()
            
            logger.info(f"Student {student_id} assessed as {capability.value} for lesson {lesson_id} (accuracy: {overall_accuracy:.1f}%)")
            return capability
            
        except Exception as e:
            logger.error(f"Error assessing student capability: {e}")
            return CapabilityLevel.BEGINNER
    
    def generate_dynamic_quiz(
        self, 
        student_id: int, 
        lesson_id: int, 
        total_questions: int = 10,
        time_limit_minutes: int = 15,
        is_adaptive: bool = True
    ) -> DynamicQuiz:
        """
        Generate a dynamic quiz tailored to student's capability level
        """
        try:
            logger.info(f"Generating dynamic quiz for student {student_id}, lesson {lesson_id}")
            
            # Get lesson and course info
            lesson = self.db.query(Lesson).filter(Lesson.id == lesson_id).first()
            if not lesson:
                raise ValueError(f"Lesson {lesson_id} not found")
            
            # Assess student capability
            capability = self.assess_student_capability(student_id, lesson_id)
            
            # Get algorithm configuration
            config = self._get_algorithm_config(lesson.course_id, lesson_id)
            
            # Determine question distribution based on capability
            distribution = self._calculate_question_distribution(capability, total_questions, config)
            
            # Select questions based on distribution
            selected_questions = self._select_questions_by_distribution(
                lesson_id, lesson.course_id, distribution
            )
            
            if len(selected_questions) < total_questions:
                logger.warning(f"Could only find {len(selected_questions)} questions out of {total_questions} requested")
            
            # Create dynamic quiz record
            quiz = DynamicQuiz(
                student_id=student_id,
                course_id=lesson.course_id,
                lesson_id=lesson_id,
                total_questions=len(selected_questions),
                time_limit_minutes=time_limit_minutes,
                is_adaptive=is_adaptive,
                planned_easy=distribution['easy'],
                planned_medium=distribution['medium'],
                planned_hard=distribution['hard'],
                selected_questions=[q.id for q in selected_questions],
                starting_capability=capability,
                algorithm_version=config.algorithm_name,
                created_at=datetime.utcnow()
            )
            self.db.add(quiz)
            self.db.commit()
            self.db.refresh(quiz)
            
            logger.info(f"Dynamic quiz {quiz.id} created with {len(selected_questions)} questions for capability {capability.value}")
            return quiz
            
        except Exception as e:
            logger.error(f"Error generating dynamic quiz: {e}")
            self.db.rollback()
            raise
    
    def get_next_question(self, quiz_id: int) -> Optional[Dict[str, Any]]:
        """
        Get the next question for an ongoing quiz
        Applies adaptive difficulty if enabled
        """
        try:
            quiz = self.db.query(DynamicQuiz).filter(DynamicQuiz.id == quiz_id).first()
            if not quiz or quiz.is_completed:
                return None
            
            # Check if quiz is finished
            if quiz.current_question_index >= len(quiz.selected_questions):
                self._complete_quiz(quiz)
                return None
            
            # Get current question ID
            question_id = quiz.selected_questions[quiz.current_question_index]
            
            # Apply adaptive logic if enabled
            if quiz.is_adaptive and quiz.current_question_index > 0:
                adapted_question_id = self._apply_adaptive_logic(quiz, question_id)
                if adapted_question_id != question_id:
                    question_id = adapted_question_id
                    # Update the selected questions list
                    quiz.selected_questions[quiz.current_question_index] = question_id
                    quiz.adaptive_changes_made += 1
                    self.db.commit()
            
            # Get question details
            question = self.db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
            if not question:
                logger.error(f"Question {question_id} not found")
                return None
            
            # Format question for frontend
            question_data = {
                'id': question.id,
                'question': question.question_text,
                'type': question.question_type.value,
                'options': question.options,
                'difficulty': question.difficulty_level.value,
                'estimated_time': question.estimated_time_seconds,
                'topic_tags': question.topic_tags,
                'question_number': quiz.current_question_index + 1,
                'total_questions': quiz.total_questions,
                'quiz_id': quiz.id
            }
            
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
            
            return question_data
            
        except Exception as e:
            logger.error(f"Error getting next question: {e}")
            return None
    
    def submit_answer(
        self, 
        quiz_id: int, 
        question_id: int, 
        selected_answer: str,
        time_taken_seconds: float
    ) -> Dict[str, Any]:
        """
        Submit an answer and update performance tracking
        Returns feedback and next question info
        """
        try:
            quiz = self.db.query(DynamicQuiz).filter(DynamicQuiz.id == quiz_id).first()
            if not quiz:
                raise ValueError(f"Quiz {quiz_id} not found")
            
            question = self.db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
            if not question:
                raise ValueError(f"Question {question_id} not found")
            
            # Check if answer is correct
            is_correct = selected_answer == question.correct_answer
            
            # Find and update the question attempt
            attempt = self.db.query(QuestionAttempt).filter(
                QuestionAttempt.dynamic_quiz_id == quiz_id,
                QuestionAttempt.question_id == question_id,
                QuestionAttempt.answered_at.is_(None)
            ).first()
            
            if attempt:
                attempt.selected_answer = selected_answer
                attempt.is_correct = is_correct
                attempt.time_taken_seconds = time_taken_seconds
                attempt.answered_at = datetime.utcnow()
                attempt.points_earned = question.points if is_correct else 0
            
            # Update student performance
            self._update_student_performance(
                quiz.student_id, quiz.lesson_id, question.difficulty_level, is_correct, time_taken_seconds
            )
            
            # Update quiz progress
            quiz.current_question_index += 1
            
            # Update question analytics
            question.times_used += 1
            if is_correct:
                question.times_correct += 1
            question.success_rate = (question.times_correct / question.times_used) * 100
            question.average_time_taken = (
                (question.average_time_taken * (question.times_used - 1) + time_taken_seconds) / question.times_used
            )
            
            self.db.commit()
            
            # Prepare response
            response = {
                'is_correct': is_correct,
                'correct_answer': question.correct_answer,
                'explanation': question.explanation,
                'time_taken': time_taken_seconds,
                'points_earned': question.points if is_correct else 0,
                'question_completed': True,
                'quiz_completed': quiz.current_question_index >= quiz.total_questions
            }
            
            if response['quiz_completed']:
                self._complete_quiz(quiz)
                response['final_results'] = self._calculate_quiz_results(quiz)
            
            logger.info(f"Answer submitted for quiz {quiz_id}, question {question_id}: {'correct' if is_correct else 'incorrect'}")
            return response
            
        except Exception as e:
            logger.error(f"Error submitting answer: {e}")
            self.db.rollback()
            raise
    
    def _create_initial_performance_record(self, student_id: int, lesson_id: int) -> StudentPerformance:
        """Create initial performance record for new student"""
        lesson = self.db.query(Lesson).filter(Lesson.id == lesson_id).first()
        
        performance = StudentPerformance(
            student_id=student_id,
            course_id=lesson.course_id,
            lesson_id=lesson_id,
            current_capability=CapabilityLevel.BEGINNER,
            mastery_score=0.0,
            confidence_level=0.5,
            learning_velocity=1.0,
            consistency_score=0.0,
            recommended_difficulty=DifficultyLevel.EASY
        )
        
        self.db.add(performance)
        self.db.commit()
        return performance
    
    def _get_algorithm_config(self, course_id: int, lesson_id: int) -> AdaptiveAlgorithmConfig:
        """Get or create algorithm configuration"""
        config = self.db.query(AdaptiveAlgorithmConfig).filter(
            AdaptiveAlgorithmConfig.course_id == course_id,
            AdaptiveAlgorithmConfig.lesson_id == lesson_id
        ).first()
        
        if not config:
            # Try course-wide config
            config = self.db.query(AdaptiveAlgorithmConfig).filter(
                AdaptiveAlgorithmConfig.course_id == course_id,
                AdaptiveAlgorithmConfig.lesson_id.is_(None)
            ).first()
        
        if not config:
            # Create default configuration
            config = AdaptiveAlgorithmConfig(
                course_id=course_id,
                lesson_id=lesson_id,
                algorithm_name="capability_based_v1"
            )
            self.db.add(config)
            self.db.commit()
        
        return config
    
    def _calculate_question_distribution(
        self, 
        capability: CapabilityLevel, 
        total_questions: int, 
        config: AdaptiveAlgorithmConfig
    ) -> Dict[str, int]:
        """Calculate how many questions of each difficulty to include"""
        
        if capability == CapabilityLevel.BEGINNER:
            easy_ratio = config.beginner_easy_ratio
            medium_ratio = config.beginner_medium_ratio
            hard_ratio = config.beginner_hard_ratio
        elif capability == CapabilityLevel.INTERMEDIATE:
            easy_ratio = config.intermediate_easy_ratio
            medium_ratio = config.intermediate_medium_ratio
            hard_ratio = config.intermediate_hard_ratio
        elif capability in [CapabilityLevel.ADVANCED, CapabilityLevel.EXPERT]:
            easy_ratio = config.advanced_easy_ratio
            medium_ratio = config.advanced_medium_ratio
            hard_ratio = config.advanced_hard_ratio
        else:
            # Default to intermediate
            easy_ratio = 0.3
            medium_ratio = 0.5
            hard_ratio = 0.2
        
        # Calculate actual numbers
        easy_count = int(total_questions * easy_ratio)
        medium_count = int(total_questions * medium_ratio)
        hard_count = int(total_questions * hard_ratio)
        
        # Adjust for rounding errors
        total_planned = easy_count + medium_count + hard_count
        if total_planned < total_questions:
            # Add remaining to medium difficulty
            medium_count += (total_questions - total_planned)
        
        return {
            'easy': easy_count,
            'medium': medium_count,
            'hard': hard_count
        }
    
    def _select_questions_by_distribution(
        self, 
        lesson_id: int, 
        course_id: int, 
        distribution: Dict[str, int]
    ) -> List[QuestionBank]:
        """Select questions based on difficulty distribution"""
        selected_questions = []
        
        # Get questions for each difficulty level
        for difficulty_str, count in distribution.items():
            if count == 0:
                continue
                
            difficulty = DifficultyLevel(difficulty_str)
            
            # First try lesson-specific questions
            questions = self.db.query(QuestionBank).filter(
                and_(
                    QuestionBank.lesson_id == lesson_id,
                    QuestionBank.difficulty_level == difficulty,
                    QuestionBank.is_active == True
                )
            ).order_by(func.random()).limit(count).all()
            
            # If not enough questions for this difficulty, try course-wide pool
            if len(questions) < count:
                additional_questions = self.db.query(QuestionBank).filter(
                    and_(
                        QuestionBank.course_id == course_id,
                        QuestionBank.difficulty_level == difficulty,
                        QuestionBank.is_active == True,
                        QuestionBank.id.notin_([q.id for q in questions])
                    )
                ).order_by(func.random()).limit(count - len(questions)).all()
                
                questions.extend(additional_questions)
            
            selected_questions.extend(questions)
        
        # Shuffle the final question order to avoid predictable patterns
        random.shuffle(selected_questions)
        return selected_questions
    
    def _apply_adaptive_logic(self, quiz: DynamicQuiz, current_question_id: int) -> int:
        """
        Apply adaptive logic to potentially modify question difficulty based on recent performance
        Returns question_id (original or replacement)
        """
        try:
            # Get recent attempts for this quiz
            recent_attempts = self.db.query(QuestionAttempt).filter(
                and_(
                    QuestionAttempt.dynamic_quiz_id == quiz.id,
                    QuestionAttempt.answered_at.isnot(None)
                )
            ).order_by(desc(QuestionAttempt.question_order)).limit(3).all()
            
            if len(recent_attempts) < 2:
                return current_question_id  # Not enough data for adaptation
            
            # Calculate recent performance metrics
            recent_accuracy = sum(1 for attempt in recent_attempts if attempt.is_correct) / len(recent_attempts)
            avg_time_ratio = sum(
                attempt.time_taken_seconds / attempt.question.estimated_time_seconds 
                for attempt in recent_attempts if attempt.question.estimated_time_seconds > 0
            ) / len(recent_attempts)
            
            # Get current question difficulty
            current_question = self.db.query(QuestionBank).filter(
                QuestionBank.id == current_question_id
            ).first()
            
            if not current_question:
                return current_question_id
            
            current_difficulty = current_question.difficulty_level
            
            # Adaptive decision logic
            should_increase_difficulty = (
                recent_accuracy >= 0.8 and 
                avg_time_ratio <= 1.2 and 
                current_difficulty != DifficultyLevel.HARD
            )
            
            should_decrease_difficulty = (
                recent_accuracy <= 0.4 and 
                avg_time_ratio >= 1.5 and 
                current_difficulty != DifficultyLevel.EASY
            )
            
            if should_increase_difficulty:
                target_difficulty = DifficultyLevel.HARD if current_difficulty == DifficultyLevel.MEDIUM else DifficultyLevel.MEDIUM
                replacement_question = self._find_replacement_question(
                    quiz.lesson_id, quiz.course_id, target_difficulty, quiz.selected_questions
                )
                if replacement_question:
                    logger.info(f"Adaptive: Increasing difficulty from {current_difficulty.value} to {target_difficulty.value}")
                    return replacement_question.id
            
            elif should_decrease_difficulty:
                target_difficulty = DifficultyLevel.EASY if current_difficulty == DifficultyLevel.MEDIUM else DifficultyLevel.MEDIUM
                replacement_question = self._find_replacement_question(
                    quiz.lesson_id, quiz.course_id, target_difficulty, quiz.selected_questions
                )
                if replacement_question:
                    logger.info(f"Adaptive: Decreasing difficulty from {current_difficulty.value} to {target_difficulty.value}")
                    return replacement_question.id
            
            return current_question_id
            
        except Exception as e:
            logger.error(f"Error in adaptive logic: {e}")
            return current_question_id
    
    def _find_replacement_question(
        self, 
        lesson_id: int, 
        course_id: int, 
        target_difficulty: DifficultyLevel, 
        excluded_ids: List[int]
    ) -> Optional[QuestionBank]:
        """Find a replacement question of target difficulty not already used"""
        
        # First try lesson-specific questions
        question = self.db.query(QuestionBank).filter(
            and_(
                QuestionBank.lesson_id == lesson_id,
                QuestionBank.difficulty_level == target_difficulty,
                QuestionBank.is_active == True,
                QuestionBank.id.notin_(excluded_ids)
            )
        ).order_by(func.random()).first()
        
        # If not found, try course-wide questions
        if not question:
            question = self.db.query(QuestionBank).filter(
                and_(
                    QuestionBank.course_id == course_id,
                    QuestionBank.difficulty_level == target_difficulty,
                    QuestionBank.is_active == True,
                    QuestionBank.id.notin_(excluded_ids)
                )
            ).order_by(func.random()).first()
        
        return question
    
    def _update_student_performance(
        self, 
        student_id: int, 
        lesson_id: int, 
        question_difficulty: DifficultyLevel, 
        is_correct: bool, 
        time_taken: float
    ):
        """Update student performance metrics based on question attempt"""
        performance = self.db.query(StudentPerformance).filter(
            StudentPerformance.student_id == student_id,
            StudentPerformance.lesson_id == lesson_id
        ).first()
        
        if not performance:
            return  # Should not happen, but handle gracefully
        
        # Update attempt counts and scores
        if question_difficulty == DifficultyLevel.EASY:
            performance.easy_attempts += 1
            if is_correct:
                performance.easy_correct += 1
        elif question_difficulty == DifficultyLevel.MEDIUM:
            performance.medium_attempts += 1
            if is_correct:
                performance.medium_correct += 1
        else:  # HARD
            performance.hard_attempts += 1
            if is_correct:
                performance.hard_correct += 1
        
        # Update streaks
        if is_correct:
            performance.current_streak += 1
            performance.best_streak = max(performance.best_streak, performance.current_streak)
        else:
            performance.current_streak = 0
        
        # Calculate and update derived metrics
        performance._update_derived_metrics()
        performance.last_updated = datetime.utcnow()
        
        self.db.commit()
    
    def _complete_quiz(self, quiz: DynamicQuiz):
        """Mark quiz as completed and calculate final metrics"""
        quiz.is_completed = True
        quiz.completed_at = datetime.utcnow()
        
        # Calculate quiz duration
        if quiz.started_at:
            quiz.actual_duration_minutes = (quiz.completed_at - quiz.started_at).total_seconds() / 60
        
        # Calculate final scores
        attempts = self.db.query(QuestionAttempt).filter(
            QuestionAttempt.dynamic_quiz_id == quiz.id
        ).all()
        
        if attempts:
            total_points = sum(attempt.points_earned for attempt in attempts if attempt.points_earned)
            max_points = sum(attempt.question.points for attempt in attempts)
            quiz.final_score = (total_points / max_points * 100) if max_points > 0 else 0
            quiz.questions_answered = len([a for a in attempts if a.answered_at is not None])
            
            # Calculate difficulty breakdown
            quiz.actual_easy = len([a for a in attempts if a.question_difficulty == DifficultyLevel.EASY])
            quiz.actual_medium = len([a for a in attempts if a.question_difficulty == DifficultyLevel.MEDIUM])
            quiz.actual_hard = len([a for a in attempts if a.question_difficulty == DifficultyLevel.HARD])
            
            # Update ending capability if performance changed significantly
            recent_accuracy = sum(1 for attempt in attempts if attempt.is_correct) / len(attempts)
            if recent_accuracy >= 0.9:
                if quiz.starting_capability == CapabilityLevel.BEGINNER:
                    quiz.ending_capability = CapabilityLevel.INTERMEDIATE
                elif quiz.starting_capability == CapabilityLevel.INTERMEDIATE:
                    quiz.ending_capability = CapabilityLevel.ADVANCED
            elif recent_accuracy <= 0.3:
                if quiz.starting_capability == CapabilityLevel.ADVANCED:
                    quiz.ending_capability = CapabilityLevel.INTERMEDIATE
                elif quiz.starting_capability == CapabilityLevel.INTERMEDIATE:
                    quiz.ending_capability = CapabilityLevel.BEGINNER
        
        self.db.commit()
        logger.info(f"Quiz {quiz.id} completed with score {quiz.final_score:.1f}%")
    
    def _calculate_quiz_results(self, quiz: DynamicQuiz) -> Dict[str, Any]:
        """Calculate comprehensive quiz results for display"""
        attempts = self.db.query(QuestionAttempt).filter(
            QuestionAttempt.dynamic_quiz_id == quiz.id
        ).all()
        
        if not attempts:
            return {}
        
        answered_attempts = [a for a in attempts if a.answered_at is not None]
        correct_attempts = [a for a in answered_attempts if a.is_correct]
        
        # Basic statistics
        total_questions = len(attempts)
        questions_answered = len(answered_attempts)
        correct_answers = len(correct_attempts)
        
        # Performance by difficulty
        difficulty_stats = {}
        for difficulty in DifficultyLevel:
            difficulty_attempts = [a for a in answered_attempts if a.question_difficulty == difficulty]
            if difficulty_attempts:
                correct_in_difficulty = sum(1 for a in difficulty_attempts if a.is_correct)
                difficulty_stats[difficulty.value] = {
                    'attempted': len(difficulty_attempts),
                    'correct': correct_in_difficulty,
                    'accuracy': (correct_in_difficulty / len(difficulty_attempts)) * 100,
                    'avg_time': sum(a.time_taken_seconds for a in difficulty_attempts) / len(difficulty_attempts)
                }
        
        # Time analysis
        total_time = sum(a.time_taken_seconds for a in answered_attempts)
        avg_time_per_question = total_time / questions_answered if questions_answered > 0 else 0
        
        # Learning insights
        insights = self._generate_learning_insights(answered_attempts, quiz.starting_capability)
        
        return {
            'quiz_id': quiz.id,
            'total_questions': total_questions,
            'questions_answered': questions_answered,
            'correct_answers': correct_answers,
            'final_score': quiz.final_score,
            'accuracy_percentage': (correct_answers / questions_answered * 100) if questions_answered > 0 else 0,
            'total_time_seconds': total_time,
            'average_time_per_question': avg_time_per_question,
            'difficulty_breakdown': difficulty_stats,
            'starting_capability': quiz.starting_capability.value,
            'ending_capability': quiz.ending_capability.value if quiz.ending_capability else quiz.starting_capability.value,
            'adaptive_changes_made': quiz.adaptive_changes_made,
            'learning_insights': insights,
            'completed_at': quiz.completed_at.isoformat() if quiz.completed_at else None
        }
    
    def _generate_learning_insights(
        self, 
        attempts: List[QuestionAttempt], 
        starting_capability: CapabilityLevel
    ) -> List[str]:
        """Generate personalized learning insights based on quiz performance"""
        insights = []
        
        if not attempts:
            return insights
        
        # Overall performance insight
        accuracy = sum(1 for a in attempts if a.is_correct) / len(attempts)
        if accuracy >= 0.9:
            insights.append("🎉 Excellent performance! You've mastered this topic.")
        elif accuracy >= 0.7:
            insights.append("👍 Good work! You have a solid understanding of the material.")
        elif accuracy >= 0.5:
            insights.append("📈 You're making progress. Review the areas where you struggled.")
        else:
            insights.append("📚 This topic needs more practice. Consider reviewing the lesson materials.")
        
        # Time management insight
        valid_attempts = [a for a in attempts if a.question.estimated_time_seconds > 0]
        if valid_attempts:
            avg_time_ratio = sum(
                a.time_taken_seconds / a.question.estimated_time_seconds 
                for a in valid_attempts
            ) / len(valid_attempts)
            
            if avg_time_ratio < 0.7:
                insights.append("⚡ You answered quickly and efficiently. Great time management!")
            elif avg_time_ratio > 1.5:
                insights.append("🐌 Take your time to read questions carefully, but try to work a bit faster.")
        
        # Difficulty-specific insights
        easy_attempts = [a for a in attempts if a.question_difficulty == DifficultyLevel.EASY]
        hard_attempts = [a for a in attempts if a.question_difficulty == DifficultyLevel.HARD]
        
        if easy_attempts:
            easy_accuracy = sum(1 for a in easy_attempts if a.is_correct) / len(easy_attempts)
            if easy_accuracy < 0.8:
                insights.append("🏗️ Focus on strengthening your foundation with basic concepts.")
        
        if hard_attempts:
            hard_accuracy = sum(1 for a in hard_attempts if a.is_correct) / len(hard_attempts)
            if hard_accuracy > 0.7:
                insights.append("🚀 You're ready for more challenging material!")
        
        # Capability progression insight
        if starting_capability == CapabilityLevel.BEGINNER and accuracy > 0.8:
            insights.append("📈 You're progressing well beyond beginner level!")
        elif starting_capability == CapabilityLevel.INTERMEDIATE and accuracy > 0.85:
            insights.append("🎯 You're approaching advanced level understanding!")
        
        return insights
    
    def get_quiz_analytics(self, quiz_id: int) -> Dict[str, Any]:
        """Get detailed analytics for a completed quiz"""
        quiz = self.db.query(DynamicQuiz).filter(DynamicQuiz.id == quiz_id).first()
        if not quiz:
            raise ValueError(f"Quiz {quiz_id} not found")
        
        return self._calculate_quiz_results(quiz)
    
    def get_student_performance_summary(self, student_id: int, lesson_id: int) -> Dict[str, Any]:
        """Get comprehensive performance summary for a student in a lesson"""
        performance = self.db.query(StudentPerformance).filter(
            StudentPerformance.student_id == student_id,
            StudentPerformance.lesson_id == lesson_id
        ).first()
        
        if not performance:
            return {"message": "No performance data found"}
        
        # Get recent quiz history
        lesson = self.db.query(Lesson).filter(Lesson.id == lesson_id).first()
        recent_quizzes = self.db.query(DynamicQuiz).filter(
            and_(
                DynamicQuiz.student_id == student_id,
                DynamicQuiz.lesson_id == lesson_id,
                DynamicQuiz.is_completed == True
            )
        ).order_by(desc(DynamicQuiz.completed_at)).limit(5).all()
        
        quiz_history = []
        for quiz in recent_quizzes:
            quiz_history.append({
                'quiz_id': quiz.id,
                'score': quiz.final_score,
                'completed_at': quiz.completed_at.isoformat() if quiz.completed_at else None,
                'questions_answered': quiz.questions_answered,
                'total_questions': quiz.total_questions,
                'adaptive_changes': quiz.adaptive_changes_made
            })
        
        return {
            'student_id': student_id,
            'lesson_id': lesson_id,
            'current_capability': performance.current_capability.value,
            'mastery_score': performance.mastery_score,
            'confidence_level': performance.confidence_level,
            'learning_velocity': performance.learning_velocity,
            'consistency_score': performance.consistency_score,
            'current_streak': performance.current_streak,
            'best_streak': performance.best_streak,
            'overall_accuracy': performance.get_overall_accuracy(),
            'difficulty_breakdown': {
                'easy': {
                    'attempts': performance.easy_attempts,
                    'correct': performance.easy_correct,
                    'accuracy': (performance.easy_correct / performance.easy_attempts * 100) if performance.easy_attempts > 0 else 0
                },
                'medium': {
                    'attempts': performance.medium_attempts,
                    'correct': performance.medium_correct,
                    'accuracy': (performance.medium_correct / performance.medium_attempts * 100) if performance.medium_attempts > 0 else 0
                },
                'hard': {
                    'attempts': performance.hard_attempts,
                    'correct': performance.hard_correct,
                    'accuracy': (performance.hard_correct / performance.hard_attempts * 100) if performance.hard_attempts > 0 else 0
                }
            },
            'recent_quiz_history': quiz_history,
            'recommended_difficulty': performance.recommended_difficulty.value,
            'last_updated': performance.last_updated.isoformat() if performance.last_updated else None
        }