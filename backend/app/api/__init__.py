"""
API routes package
"""

from flask import Blueprint

# Create API blueprint
api = Blueprint('api', __name__, url_prefix='/api')

# Import route modules to register them
from . import auth, items, negotiations, users

__all__ = ['api']