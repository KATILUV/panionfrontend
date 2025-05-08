"""
Validation Middleware
Handles input validation for API endpoints.
"""

import logging
from typing import Dict, Any, Callable, Optional, List
from functools import wraps
from .schemas import BaseValidator, ValidationError, ValidationResult

logger = logging.getLogger(__name__)

class ValidationMiddleware:
    """Middleware for validating API requests."""
    
    def __init__(self):
        self._validators: Dict[str, Dict[str, BaseValidator]] = {}
        self._global_validators: List[BaseValidator] = []

    def register_endpoint(
        self,
        endpoint: str,
        method: str,
        validators: Dict[str, BaseValidator]
    ) -> None:
        """Register validators for an endpoint.
        
        Args:
            endpoint: API endpoint path
            method: HTTP method
            validators: Dictionary of validators for request components
        """
        key = f"{method}:{endpoint}"
        self._validators[key] = validators

    def register_global_validator(self, validator: BaseValidator) -> None:
        """Register a global validator.
        
        Args:
            validator: Validator to apply to all requests
        """
        self._global_validators.append(validator)

    def validate_request(
        self,
        endpoint: str,
        method: str,
        data: Dict[str, Any]
    ) -> List[ValidationResult]:
        """Validate a request.
        
        Args:
            endpoint: API endpoint path
            method: HTTP method
            data: Request data
            
        Returns:
            List[ValidationResult]: Validation results
        """
        results = []
        
        # Apply global validators
        for validator in self._global_validators:
            result = validator.validate(data)
            results.append(result)
            if not result.is_valid:
                logger.warning(f"Global validation failed: {result.message}")
        
        # Apply endpoint-specific validators
        key = f"{method}:{endpoint}"
        if key in self._validators:
            validators = self._validators[key]
            for field, validator in validators.items():
                if field in data:
                    result = validator.validate(data[field])
                    result.field = field
                    results.append(result)
                    if not result.is_valid:
                        logger.warning(f"Validation failed for {field}: {result.message}")
                elif field in validators:
                    results.append(ValidationResult(
                        is_valid=False,
                        message=f"Missing required field: {field}",
                        severity="error",
                        field=field
                    ))
        
        return results

def validate_request(
    endpoint: str,
    method: str,
    validators: Optional[Dict[str, BaseValidator]] = None
) -> Callable:
    """Decorator for validating request data.
    
    Args:
        endpoint: API endpoint path
        method: HTTP method
        validators: Optional validators for request components
        
    Returns:
        Callable: Decorated function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get request data from kwargs
            data = kwargs.get('data', {})
            
            # Create middleware instance
            middleware = ValidationMiddleware()
            
            # Register validators if provided
            if validators:
                middleware.register_endpoint(endpoint, method, validators)
            
            # Validate request
            results = middleware.validate_request(endpoint, method, data)
            
            # Check for validation errors
            errors = [r for r in results if not r.is_valid]
            if errors:
                raise ValidationError(
                    message="Request validation failed",
                    details={
                        'errors': [
                            {
                                'field': e.field,
                                'message': e.message,
                                'severity': e.severity
                            }
                            for e in errors
                        ]
                    }
                )
            
            # Call original function
            return await func(*args, **kwargs)
        
        return wrapper
    
    return decorator

# Example usage:
"""
@validate_request(
    endpoint="/api/users",
    method="POST",
    validators={
        'username': USERNAME_VALIDATOR,
        'password': PASSWORD_VALIDATOR,
        'email': EMAIL_VALIDATOR
    }
)
async def create_user(data: Dict[str, Any]) -> Dict[str, Any]:
    # Function implementation
    pass
""" 