import os
import shutil
import uuid
from fastapi import UploadFile

UPLOAD_DIR = "uploads"

def save_uploaded_file(file: UploadFile, subfolder: str) -> str:
    # Ensure folder exists
    folder = os.path.join(UPLOAD_DIR, subfolder)
    os.makedirs(folder, exist_ok=True)
    
    # Generate unique filename
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(folder, filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Return accessible relative URL
    return f"/static/{subfolder}/{filename}"
