import os
import uuid
from werkzeug.utils import secure_filename
from PIL import Image

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_IMAGE_SIZE = (800, 600)  # Max width x height

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_image(file):
    """
    Save uploaded image file with validation and resizing
    Returns: (success: bool, filename: str or error_message: str)
    """
    if not file or file.filename == '':
        return False, "No file selected"
    
    if not allowed_file(file.filename):
        return False, "Invalid file type. Only PNG, JPG, JPEG allowed."
    
    # Check file size
    file.seek(0, os.SEEK_END)
    file_length = file.tell()
    file.seek(0)
    
    if file_length > MAX_FILE_SIZE:
        return False, "File too large. Maximum size is 5MB."
    
    try:
        # Generate unique filename
        filename = str(uuid.uuid4()) + '.' + file.filename.rsplit('.', 1)[1].lower()
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        # Ensure upload directory exists
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        # Open and resize image
        image = Image.open(file)
        
        # Convert RGBA to RGB if necessary
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        
        # Resize if too large
        image.thumbnail(MAX_IMAGE_SIZE, Image.Resampling.LANCZOS)
        
        # Save optimized image
        image.save(filepath, optimize=True, quality=85)
        
        return True, filename
        
    except Exception as e:
        return False, f"Error processing image: {str(e)}"

def delete_image(filename):
    """Delete image file from uploads directory"""
    if filename:
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
                return True
            except:
                pass
    return False