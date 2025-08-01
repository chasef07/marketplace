#!/usr/bin/env python3

"""
Main entry point for the Marketplace FastAPI application
"""

import uvicorn
from app import create_app

# Create the FastAPI application
app = create_app()

if __name__ == '__main__':
    print("🚀 Starting FastAPI Marketplace Backend")
    print("Access the app at:")
    print("  - http://localhost:8000")
    print("  - API Documentation: http://localhost:8000/docs")
    print("  - Alternative docs: http://localhost:8000/redoc")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )