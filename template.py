import os
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format='[%(asctime)s]: %(message)s:')

list_of_files = [
    "backend/routes/userRoutes.js",
    "backend/routes/courseRoutes.js",
    "backend/routes/enrollmentRoutes.js",
    "backend/routes/contentRoutes.js",

    "backend/models/User.js",
    "backend/models/Course.js",
    "backend/models/Enrollment.js",
    "backend/models/Content.js",
    
    "backend/config/db.js",

    "backend/server.js",

    "backend/package.json",

    "frontend/public",

    "frontend/src/components/CourseList.js",
    "frontend/src/components/CourseContent.js",
    "frontend/src/components/Login.js",

    "frontend/src/pages/home.js",
    "frontend/src/pages/Coursepage.js",

    "frontend/src/App.js",
    "frontend/src/index.js",
    "frontend/package.json",

]

for filepath in list_of_files:
    filepath = Path(filepath)
    filedir, filename = os.path.split(filepath)

    if filedir != "":
        os.makedirs(filedir, exist_ok=True)
        logging.info(f"Creating directory: {filedir} for the file {filename}")

    if (not os.path.exists(filepath)) or (os.path.getsize(filepath) == 0):
        with open(filepath, 'w') as f:
            pass
        logging.info(f"Creating empty file: {filepath}")

    else:
        logging.info(f"{filename} is already created")
