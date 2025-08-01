import os
import uuid
from PIL import Image
from fastapi import UploadFile
import shutil

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_IMAGE_SIZE = (800, 600)  # Max width x height

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_image(file: UploadFile) -> str:
    """
    Save uploaded image file with validation and resizing
    Returns: filename
    """
    if not file or not file.filename:
        raise ValueError("No file selected")
    
    if not allowed_file(file.filename):
        raise ValueError("Invalid file type. Only PNG, JPG, JPEG allowed.")
    
    # Generate unique filename
    extension = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4()}.{extension}"
    
    # Ensure upload directory exists
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    # Save file
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return filename

def delete_image(filename):
    """Delete an uploaded image file"""
    if filename:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
        except Exception as e:
            print(f"Error deleting file {filename}: {e}")
    return False