import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from passlib.context import CryptContext
import os
from typing import List
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

# Email configuration
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "your-email@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "your-app-password")

def send_email(to_emails: List[str], subject: str, body: str, is_html: bool = False):
    """Send email to recipients"""
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = ", ".join(to_emails)
        msg['Subject'] = subject
        
        # Add body
        msg.attach(MIMEText(body, 'html' if is_html else 'plain'))
        
        # Send email
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Email sent successfully to {to_emails}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False

def send_enrollment_confirmation(student_email: str, student_name: str, course_title: str):
    """Send enrollment confirmation email"""
    subject = f"Enrollment Confirmation - {course_title}"
    body = f"""
    Hi {student_name},
    
    Congratulations! You have successfully enrolled in "{course_title}".
    
    You can now access your course materials and start learning.
    
    Happy learning!
    
    Best regards,
    Smart E-learning Platform Team
    """
    
    return send_email([student_email], subject, body)

def send_dropout_alert(admin_emails: List[str], student_name: str, course_title: str, risk_score: float):
    """Send dropout risk alert to admins"""
    subject = f"Dropout Risk Alert - {student_name}"
    body = f"""
    Alert: High Dropout Risk Detected
    
    Student: {student_name}
    Course: {course_title}
    Risk Score: {risk_score:.2f}
    
    This student shows signs of potential dropout based on their learning patterns.
    Consider reaching out to provide additional support.
    
    Best regards,
    Smart E-learning Platform
    """
    
    return send_email(admin_emails, subject, body)

def send_course_completion_certificate(student_email: str, student_name: str, course_title: str):
    """Send course completion certificate email"""
    subject = f"Course Completion Certificate - {course_title}"
    body = f"""
    Congratulations {student_name}!
    
    You have successfully completed the course "{course_title}".
    
    Your dedication to learning is commendable. Keep up the great work!
    
    You can download your certificate from your dashboard.
    
    Best regards,
    Smart E-learning Platform Team
    """
    
    return send_email([student_email], subject, body)

def format_duration(minutes: float) -> str:
    """Format duration in minutes to human readable format"""
    if minutes < 60:
        return f"{int(minutes)} minutes"
    elif minutes < 1440:  # Less than 24 hours
        hours = int(minutes // 60)
        mins = int(minutes % 60)
        return f"{hours}h {mins}m"
    else:
        days = int(minutes // 1440)
        hours = int((minutes % 1440) // 60)
        return f"{days}d {hours}h"

def calculate_progress_percentage(completed_lessons: int, total_lessons: int) -> float:
    """Calculate progress percentage"""
    if total_lessons == 0:
        return 0.0
    return (completed_lessons / total_lessons) * 100

def generate_quiz_report(quiz_attempts: List) -> dict:
    """Generate quiz performance report"""
    if not quiz_attempts:
        return {
            "total_attempts": 0,
            "average_score": 0,
            "best_score": 0,
            "improvement_trend": "No data"
        }
    
    scores = [attempt.score / attempt.max_score * 100 for attempt in quiz_attempts]
    
    return {
        "total_attempts": len(quiz_attempts),
        "average_score": round(sum(scores) / len(scores), 2),
        "best_score": round(max(scores), 2),
        "improvement_trend": "Improving" if len(scores) > 1 and scores[-1] > scores[0] else "Stable"
    }

def validate_file_type(filename: str, allowed_types: List[str]) -> bool:
    """Validate file type based on extension"""
    if not filename:
        return False
    
    file_extension = filename.lower().split('.')[-1]
    return file_extension in [ext.lower() for ext in allowed_types]

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage"""
    import re
    # Remove special characters and replace spaces with underscores
    filename = re.sub(r'[^\w\s.-]', '', filename)
    filename = re.sub(r'\s+', '_', filename)
    return filename

def calculate_recommendation_score(student_interests: List[str], course_tags: List[str]) -> float:
    """Calculate recommendation score based on interest overlap"""
    if not student_interests or not course_tags:
        return 0.0
    
    # Convert to lowercase for comparison
    student_interests = [interest.lower() for interest in student_interests]
    course_tags = [tag.lower() for tag in course_tags]
    
    # Calculate overlap
    common_tags = set(student_interests).intersection(set(course_tags))
    
    # Score based on overlap percentage
    overlap_score = len(common_tags) / len(set(student_interests + course_tags))
    
    return round(overlap_score, 3)

def get_difficulty_level_score(level: str) -> int:
    """Convert difficulty level to numeric score"""
    difficulty_mapping = {
        "beginner": 1,
        "intermediate": 2,
        "advanced": 3
    }
    return difficulty_mapping.get(level.lower(), 1)

def format_analytics_data(data: dict) -> dict:
    """Format analytics data for frontend consumption"""
    formatted_data = {}
    
    for key, value in data.items():
        if isinstance(value, float):
            formatted_data[key] = round(value, 2)
        elif isinstance(value, list):
            formatted_data[key] = value[:10]  # Limit to 10 items
        else:
            formatted_data[key] = value
    
    return formatted_data

def create_error_response(error_code: str, message: str, details: str = None) -> dict:
    """Create standardized error response"""
    response = {
        "error_code": error_code,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if details:
        response["details"] = details
    
    return response

def log_user_activity(user_id: int, activity_type: str, details: dict = None):
    """Log user activity for analytics"""
    try:
        log_entry = {
            "user_id": user_id,
            "activity_type": activity_type,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {}
        }
        
        logger.info(f"User Activity: {log_entry}")
        
        # Here you could save to a separate activity log table
        # or send to an analytics service
        
    except Exception as e:
        logger.error(f"Failed to log activity: {str(e)}")

# Constants
ALLOWED_VIDEO_TYPES = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm']
ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
ALLOWED_DOCUMENT_TYPES = ['pdf', 'doc', 'docx', 'txt', 'rtf']

MAX_FILE_SIZE_MB = 100  # Maximum file size in MB
MAX_VIDEO_SIZE_MB = 500  # Maximum video file size in MB

def get_file_size_mb(file_path: str) -> float:
    """Get file size in MB"""
    try:
        size_bytes = os.path.getsize(file_path)
        return size_bytes / (1024 * 1024)
    except:
        return 0.0

def validate_file_size(file_path: str, max_size_mb: int = MAX_FILE_SIZE_MB) -> bool:
    """Validate file size"""
    file_size = get_file_size_mb(file_path)
    return file_size <= max_size_mb