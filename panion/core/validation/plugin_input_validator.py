"""
Plugin Input Validator
Validates plugin input data for required fields and types.
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

class PluginInputValidator:
    """Validates plugin input data."""
    
    def __init__(self):
        self.required_fields = {
            'http_request': {
                'url': str,
                'method': str,
                'headers': dict,
                'body': (str, dict, type(None))
            },
            'content_extraction': {
                'content': str,
                'extraction_type': str,
                'parameters': dict
            },
            'text_analysis': {
                'text': str,
                'analysis_type': str,
                'options': dict
            }
        }
        
        self.field_validators = {
            'url': self._validate_url,
            'method': self._validate_http_method,
            'headers': self._validate_headers,
            'body': self._validate_body,
            'content': self._validate_content,
            'extraction_type': self._validate_extraction_type,
            'parameters': self._validate_parameters,
            'text': self._validate_text,
            'analysis_type': self._validate_analysis_type,
            'options': self._validate_options
        }
    
    def validate(self, plugin_type: str, data: Dict[str, Any]) -> bool:
        """Validate plugin input data.
        
        Args:
            plugin_type: Type of plugin
            data: Input data to validate
            
        Returns:
            bool: Whether data is valid
            
        Raises:
            ValidationError: If validation fails
        """
        if plugin_type not in self.required_fields:
            raise ValidationError(f"Unknown plugin type: {plugin_type}")
        
        required = self.required_fields[plugin_type]
        
        # Check required fields
        for field, field_type in required.items():
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
    
    def _validate_url(self, url: str) -> None:
        """Validate URL format."""
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain
            r'localhost|'  # localhost
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # IP
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        
        if not url_pattern.match(url):
            raise ValidationError("Invalid URL format", field="url")
    
    def _validate_http_method(self, method: str) -> None:
        """Validate HTTP method."""
        valid_methods = {'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'}
        if method.upper() not in valid_methods:
            raise ValidationError(
                f"Invalid HTTP method: {method}",
                field="method",
                details={"valid_methods": list(valid_methods)}
            )
    
    def _validate_headers(self, headers: Dict[str, str]) -> None:
        """Validate HTTP headers."""
        for key, value in headers.items():
            if not isinstance(key, str) or not isinstance(value, str):
                raise ValidationError(
                    "Headers must be string key-value pairs",
                    field="headers"
                )
    
    def _validate_body(self, body: Union[str, Dict[str, Any], None]) -> None:
        """Validate request body."""
        if body is not None and not isinstance(body, (str, dict)):
            raise ValidationError(
                "Body must be string or dictionary",
                field="body"
            )
    
    def _validate_content(self, content: str) -> None:
        """Validate content for extraction."""
        if not content or not isinstance(content, str):
            raise ValidationError(
                "Content must be non-empty string",
                field="content"
            )
    
    def _validate_extraction_type(self, extraction_type: str) -> None:
        """Validate extraction type."""
        valid_types = {'text', 'html', 'json', 'xml', 'table'}
        if extraction_type.lower() not in valid_types:
            raise ValidationError(
                f"Invalid extraction type: {extraction_type}",
                field="extraction_type",
                details={"valid_types": list(valid_types)}
            )
    
    def _validate_parameters(self, parameters: Dict[str, Any]) -> None:
        """Validate extraction parameters."""
        if not isinstance(parameters, dict):
            raise ValidationError(
                "Parameters must be a dictionary",
                field="parameters"
            )
    
    def _validate_text(self, text: str) -> None:
        """Validate text for analysis."""
        if not text or not isinstance(text, str):
            raise ValidationError(
                "Text must be non-empty string",
                field="text"
            )
    
    def _validate_analysis_type(self, analysis_type: str) -> None:
        """Validate analysis type."""
        valid_types = {'sentiment', 'entities', 'keywords', 'summary', 'classification'}
        if analysis_type.lower() not in valid_types:
            raise ValidationError(
                f"Invalid analysis type: {analysis_type}",
                field="analysis_type",
                details={"valid_types": list(valid_types)}
            )
    
    def _validate_options(self, options: Dict[str, Any]) -> None:
        """Validate analysis options."""
        if not isinstance(options, dict):
            raise ValidationError(
                "Options must be a dictionary",
                field="options"
            )

# Create global validator instance
plugin_input_validator = PluginInputValidator() 