"""
Goal Submission Validator
Validates goal submission payloads for required fields and structure.
"""

from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
from datetime import datetime
import re

@dataclass
class ValidationError(Exception):
    """Validation error with details."""
    message: str
    field: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class GoalSubmissionValidator:
    """Validates goal submission payloads."""
    
    def __init__(self):
        self.required_fields = {
            'id': str,
            'type': str,
            'description': str,
            'priority': int,
            'deadline': (str, type(None)),
            'dependencies': list,
            'parameters': dict
        }
        
        self.field_validators = {
            'id': self._validate_id,
            'type': self._validate_type,
            'description': self._validate_description,
            'priority': self._validate_priority,
            'deadline': self._validate_deadline,
            'dependencies': self._validate_dependencies,
            'parameters': self._validate_parameters
        }
        
        self.valid_goal_types = {
            'data_collection',
            'analysis',
            'optimization',
            'monitoring',
            'automation',
            'integration'
        }
    
    def validate(self, data: Dict[str, Any]) -> bool:
        """Validate goal submission data.
        
        Args:
            data: Goal submission data to validate
            
        Returns:
            bool: Whether data is valid
            
        Raises:
            ValidationError: If validation fails
        """
        # Check required fields
        for field, field_type in self.required_fields.items():
            if field not in data:
                raise ValidationError(
                    f"Missing required field: {field}",
                    field=field
                )
            
            # Check field type
            if not isinstance(data[field], field_type):
                if not (isinstance(field_type, tuple) and 
                       isinstance(data[field], field_type)):
                    raise ValidationError(
                        f"Invalid type for {field}: expected {field_type.__name__}",
                        field=field
                    )
            
            # Run field-specific validation
            if field in self.field_validators:
                self.field_validators[field](data[field])
        
        return True
    
    def _validate_id(self, goal_id: str) -> None:
        """Validate goal ID format."""
        if not re.match(r'^[a-zA-Z0-9_-]{3,50}$', goal_id):
            raise ValidationError(
                "Goal ID must be 3-50 characters and contain only letters, numbers, underscores, and hyphens",
                field="id"
            )
    
    def _validate_type(self, goal_type: str) -> None:
        """Validate goal type."""
        if goal_type.lower() not in self.valid_goal_types:
            raise ValidationError(
                f"Invalid goal type: {goal_type}",
                field="type",
                details={"valid_types": list(self.valid_goal_types)}
            )
    
    def _validate_description(self, description: str) -> None:
        """Validate goal description."""
        if not description or len(description.strip()) < 10:
            raise ValidationError(
                "Description must be at least 10 characters long",
                field="description"
            )
    
    def _validate_priority(self, priority: int) -> None:
        """Validate goal priority."""
        if not isinstance(priority, int) or priority < 1 or priority > 5:
            raise ValidationError(
                "Priority must be an integer between 1 and 5",
                field="priority"
            )
    
    def _validate_deadline(self, deadline: Optional[str]) -> None:
        """Validate goal deadline."""
        if deadline is not None:
            try:
                datetime.strptime(deadline, "%Y-%m-%dT%H:%M:%S")
            except ValueError:
                raise ValidationError(
                    "Deadline must be in ISO 8601 format (YYYY-MM-DDThh:mm:ss)",
                    field="deadline"
                )
    
    def _validate_dependencies(self, dependencies: List[str]) -> None:
        """Validate goal dependencies."""
        if not isinstance(dependencies, list):
            raise ValidationError(
                "Dependencies must be a list",
                field="dependencies"
            )
        
        for dep in dependencies:
            if not isinstance(dep, str):
                raise ValidationError(
                    "Dependencies must be a list of strings",
                    field="dependencies"
                )
            if not re.match(r'^[a-zA-Z0-9_-]{3,50}$', dep):
                raise ValidationError(
                    "Invalid dependency ID format",
                    field="dependencies"
                )
    
    def _validate_parameters(self, parameters: Dict[str, Any]) -> None:
        """Validate goal parameters."""
        if not isinstance(parameters, dict):
            raise ValidationError(
                "Parameters must be a dictionary",
                field="parameters"
            )
        
        # Validate parameter types
        for key, value in parameters.items():
            if not isinstance(key, str):
                raise ValidationError(
                    "Parameter keys must be strings",
                    field="parameters"
                )
            if not isinstance(value, (str, int, float, bool, list, dict)):
                raise ValidationError(
                    "Parameter values must be strings, numbers, booleans, lists, or dictionaries",
                    field="parameters"
                )

# Create global validator instance
goal_submission_validator = GoalSubmissionValidator() 