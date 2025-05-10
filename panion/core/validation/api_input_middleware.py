"""
API Input Middleware
Flask middleware for validating API request bodies.
"""

from typing import Dict, Any, List, Optional, Union, Callable
from functools import wraps
from flask import request, jsonify
import json

from .plugin_input_validator import ValidationError as PluginValidationError
from .goal_submission_validator import ValidationError as GoalValidationError
from .plugin_input_validator import plugin_input_validator
from .goal_submission_validator import goal_submission_validator

class ValidationError(Exception):
    """Combined validation error for API middleware."""
    def __init__(self, message: str, status_code: int = 400, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)

def validate_request_body(schema: str):
    """Decorator for validating request bodies against schemas.
    
    Args:
        schema: Schema to validate against ('plugin_input' or 'goal_submission')
        
    Returns:
        Decorated function that validates request body before execution
    """
    def decorator(f: Callable):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                raise ValidationError(
                    "Request must be JSON",
                    status_code=415
                )
            
            try:
                data = request.get_json()
            except json.JSONDecodeError:
                raise ValidationError(
                    "Invalid JSON in request body",
                    status_code=400
                )
            
            try:
                if schema == 'plugin_input':
                    if 'type' not in data:
                        raise ValidationError(
                            "Missing plugin type in request",
                            status_code=400
                        )
                    plugin_input_validator.validate(data['type'], data)
                elif schema == 'goal_submission':
                    goal_submission_validator.validate(data)
                else:
                    raise ValidationError(
                        f"Unknown validation schema: {schema}",
                        status_code=500
                    )
            except (PluginValidationError, GoalValidationError) as e:
                raise ValidationError(
                    str(e),
                    status_code=400,
                    details={
                        'field': e.field,
                        'details': e.details
                    }
                )
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def handle_validation_error(error: ValidationError):
    """Error handler for validation errors.
    
    Args:
        error: ValidationError instance
        
    Returns:
        JSON response with error details
    """
    response = {
        'error': error.message,
        'status_code': error.status_code
    }
    
    if error.details:
        response['details'] = error.details
    
    return jsonify(response), error.status_code

def register_error_handlers(app):
    """Register validation error handlers with Flask app.
    
    Args:
        app: Flask application instance
    """
    app.register_error_handler(ValidationError, handle_validation_error)
    
    @app.errorhandler(415)
    def handle_unsupported_media_type(error):
        return jsonify({
            'error': 'Request must be JSON',
            'status_code': 415
        }), 415
    
    @app.errorhandler(400)
    def handle_bad_request(error):
        return jsonify({
            'error': str(error),
            'status_code': 400
        }), 400

# Example usage:
"""
from flask import Flask
from core.validation.api_input_middleware import validate_request_body, register_error_handlers

app = Flask(__name__)
register_error_handlers(app)

# Empty API endpoints removed - these were non-functional stubs
# If you need to implement these endpoints in the future, add real functionality
# and connect them to the appropriate handlers.