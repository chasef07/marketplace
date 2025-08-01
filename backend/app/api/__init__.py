"""
FastAPI routes package
"""

from fastapi import APIRouter

# Create main router
router = APIRouter()

# Import and include route modules
from .auth import router as auth_router
from .items import router as items_router
from .users import router as users_router

router.include_router(auth_router, prefix="/auth", tags=["authentication"])
router.include_router(items_router, prefix="/items", tags=["items"])
router.include_router(users_router, prefix="/users", tags=["users"])

__all__ = ['router']