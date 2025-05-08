"""
Validation schemas for the Panion system.
"""

from typing import Dict, Any, List, Optional, Union
from abc import ABC, abstractmethod
import json
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime

@dataclass
class BaseValidator:
    """Base class for all validators."""
    def validate(self, data: Any) -> bool:
        """Validate data.
        
        Args:
            data: Data to validate
            
        Returns:
            bool: True if data is valid
        """
        raise NotImplementedError

@dataclass
class StringValidator(BaseValidator):
    """Validator for string values."""
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    pattern: Optional[str] = None
    
    def validate(self, data: Any) -> bool:
        """Validate string data.
        
        Args:
            data: String to validate
            
        Returns:
            bool: True if string is valid
        """
        if not isinstance(data, str):
            return False
            
        if self.min_length is not None and len(data) < self.min_length:
            return False
            
        if self.max_length is not None and len(data) > self.max_length:
            return False
            
        if self.pattern is not None:
            import re
            if not re.match(self.pattern, data):
                return False
                
        return True

@dataclass
class NumberValidator(BaseValidator):
    """Validator for numeric values."""
    min_value: Optional[Union[int, float]] = None
    max_value: Optional[Union[int, float]] = None
    
    def validate(self, data: Any) -> bool:
        """Validate numeric data.
        
        Args:
            data: Number to validate
            
        Returns:
            bool: True if number is valid
        """
        if not isinstance(data, (int, float)):
            return False
            
        if self.min_value is not None and data < self.min_value:
            return False
            
        if self.max_value is not None and data > self.max_value:
            return False
            
        return True

@dataclass
class ListValidator(BaseValidator):
    """Validator for list values."""
    item_validator: Optional[BaseValidator] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    
    def validate(self, data: Any) -> bool:
        """Validate list data.
        
        Args:
            data: List to validate
            
        Returns:
            bool: True if list is valid
        """
        if not isinstance(data, list):
            return False
            
        if self.min_length is not None and len(data) < self.min_length:
            return False
            
        if self.max_length is not None and len(data) > self.max_length:
            return False
            
        if self.item_validator is not None:
            for item in data:
                if not self.item_validator.validate(item):
                    return False
                    
        return True

@dataclass
class DictValidator(BaseValidator):
    """Validator for dictionary values."""
    required_keys: Optional[List[str]] = None
    key_validator: Optional[BaseValidator] = None
    value_validator: Optional[BaseValidator] = None
    
    def validate(self, data: Any) -> bool:
        """Validate dictionary data.
        
        Args:
            data: Dictionary to validate
            
        Returns:
            bool: True if dictionary is valid
        """
        if not isinstance(data, dict):
            return False
            
        if self.required_keys is not None:
            for key in self.required_keys:
                if key not in data:
                    return False
                    
        if self.key_validator is not None:
            for key in data:
                if not self.key_validator.validate(key):
                    return False
                    
        if self.value_validator is not None:
            for value in data.values():
                if not self.value_validator.validate(value):
                    return False
                    
        return True

@dataclass
class DateTimeValidator(BaseValidator):
    """Validator for datetime values."""
    min_date: Optional[datetime] = None
    max_date: Optional[datetime] = None
    
    def validate(self, data: Any) -> bool:
        """Validate datetime data.
        
        Args:
            data: Datetime to validate
            
        Returns:
            bool: True if datetime is valid
        """
        if not isinstance(data, datetime):
            return False
            
        if self.min_date is not None and data < self.min_date:
            return False
            
        if self.max_date is not None and data > self.max_date:
            return False
            
        return True

class JsonSchemaValidator(BaseValidator):
    """JSON Schema validator."""
    
    def __init__(self, schema: Dict[str, Any]):
        """Initialize validator.
        
        Args:
            schema: JSON Schema
        """
        self.schema = schema
        self.errors: List[str] = []
    
    def validate(self, data: Any) -> bool:
        """Validate data against JSON Schema.
        
        Args:
            data: Data to validate
            
        Returns:
            bool: True if data is valid
        """
        try:
            from jsonschema import validate, ValidationError
            validate(instance=data, schema=self.schema)
            return True
        except ValidationError as e:
            self.errors.append(str(e))
            return False
        except Exception as e:
            self.errors.append(f"Validation error: {str(e)}")
            return False
    
    def get_errors(self) -> List[str]:
        """Get validation errors.
        
        Returns:
            List[str]: List of validation errors
        """
        return self.errors

class ConfigValidator(BaseValidator):
    """Configuration validator."""
    
    def __init__(self, required_fields: Optional[List[str]] = None):
        """Initialize validator.
        
        Args:
            required_fields: List of required fields
        """
        self.required_fields = required_fields or []
        self.errors: List[str] = []
    
    def validate(self, data: Any) -> bool:
        """Validate configuration data.
        
        Args:
            data: Configuration data to validate
            
        Returns:
            bool: True if data is valid
        """
        if not isinstance(data, dict):
            self.errors.append("Configuration must be a dictionary")
            return False
        
        # Check required fields
        for field in self.required_fields:
            if field not in data:
                self.errors.append(f"Missing required field: {field}")
                return False
        
        return True
    
    def get_errors(self) -> List[str]:
        """Get validation errors.
        
        Returns:
            List[str]: List of validation errors
        """
        return self.errors

class PluginValidator(BaseValidator):
    """Plugin validator."""
    
    def __init__(self):
        """Initialize validator."""
        self.errors: List[str] = []
    
    def validate(self, data: Any) -> bool:
        """Validate plugin data.
        
        Args:
            data: Plugin data to validate
            
        Returns:
            bool: True if data is valid
        """
        if not isinstance(data, dict):
            self.errors.append("Plugin data must be a dictionary")
            return False
        
        required_fields = ["name", "version", "description", "author"]
        for field in required_fields:
            if field not in data:
                self.errors.append(f"Missing required field: {field}")
                return False
        
        return True
    
    def get_errors(self) -> List[str]:
        """Get validation errors.
        
        Returns:
            List[str]: List of validation errors
        """
        return self.errors

# Export validators
__all__ = [
    'BaseValidator',
    'JsonSchemaValidator',
    'ConfigValidator',
    'PluginValidator'
] 