"""
Validators for the context module.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

from core.validation.schemas import (
    BaseValidator,
    StringValidator,
    DictValidator,
    DateTimeValidator
)

class ContextValidator(BaseValidator):
    """Validator for context data."""
    
    def __init__(self):
        self.id_validator = StringValidator(min_length=1, max_length=50)
        self.type_validator = StringValidator(min_length=1, max_length=50)
        self.data_validator = DictValidator(
            key_validator=StringValidator(),
            value_validator=StringValidator()
        )
        self.metadata_validator = DictValidator(
            key_validator=StringValidator(),
            value_validator=StringValidator()
        )
        self.datetime_validator = DateTimeValidator()
    
    def validate(self, data: Dict[str, Any]) -> bool:
        """Validate context data.
        
        Args:
            data: Context data to validate
            
        Returns:
            bool: True if context data is valid
        """
        if not isinstance(data, dict):
            return False
            
        # Validate required fields
        required_fields = ["id", "type", "data"]
        for field in required_fields:
            if field not in data:
                return False
        
        # Validate id
        if not self.id_validator.validate(data["id"]):
            return False
            
        # Validate type
        if not self.type_validator.validate(data["type"]):
            return False
            
        # Validate data
        if not self.data_validator.validate(data["data"]):
            return False
            
        # Validate optional fields
        if "metadata" in data and not self.metadata_validator.validate(data["metadata"]):
            return False
            
        # Validate timestamps
        for field in ["created_at", "updated_at", "expires_at"]:
            if field in data:
                try:
                    timestamp = datetime.fromisoformat(data[field])
                    if not self.datetime_validator.validate(timestamp):
                        return False
                except (ValueError, TypeError):
                    return False
            
        return True

# Create validator instance
context_validator = ContextValidator() 