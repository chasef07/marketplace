"""
Marketplace FastAPI Application
"""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import get_config
from .core.database import initialize_database
from .api import router


def create_app():
    """Create FastAPI application."""
    app = FastAPI(
        title="AI-Powered Furniture Marketplace",
        description="A modern marketplace with AI image analysis",
        version="2.0.0"
    )
    
    # Load configuration
    config = get_config()
    
    # Initialize database
    database_url = os.getenv('DATABASE_URL', 'sqlite:///./marketplace.db')
    initialize_database(database_url)
    
    # Enable CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(router, prefix="/api")
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {"status": "healthy", "message": "FastAPI marketplace is running"}
    
    return app


