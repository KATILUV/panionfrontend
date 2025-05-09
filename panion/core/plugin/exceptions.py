"""
Plugin System Exceptions Module

This module defines exceptions specific to the plugin system.
These exceptions help with error handling and debugging in the plugin framework.
"""

from typing import Optional, Dict, Any
from enum import Enum

class PluginErrorType(Enum):
    """Types of errors that can occur in the plugin system."""
    INITIALIZATION = "initialization"  # Error during plugin initialization
    DEPENDENCY = "dependency"       # Error with plugin dependencies
    EXECUTION = "execution"         # Error during plugin execution
    VALIDATION = "validation"       # Error during parameter validation
    RESOURCE = "resource"           # Error with resource allocation/usage
    SECURITY = "security"           # Security-related error
    PERMISSION = "permission"       # Permission-related error
    REGISTRATION = "registration"   # Error during plugin registration
    DISCOVERY = "discovery"         # Error during plugin discovery
    UNKNOWN = "unknown"             # Unknown error type

class PluginError(Exception):
    """Base exception for plugin system errors."""
    
    def __init__(
        self, 
        message: str, 
        plugin_id: Optional[str] = None,
        error_type: PluginErrorType = PluginErrorType.UNKNOWN,
        details: Optional[Dict[str, Any]] = None
    ):
        """Initialize a plugin error.
        
        Args:
            message: Error message
            plugin_id: ID of the plugin that caused the error
            error_type: Type of error
            details: Additional error details
        """
        super().__init__(message)
        self.message = message
        self.plugin_id = plugin_id
        self.error_type = error_type
        self.details = details or {}
        
    def __str__(self) -> str:
        """Get string representation of the error."""
        if self.plugin_id:
            return f"[{self.error_type.value}] Plugin {self.plugin_id}: {self.message}"
        return f"[{self.error_type.value}] {self.message}"
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert the error to a dictionary.
        
        Returns:
            Dictionary representation of the error
        """
        return {
            "message": self.message,
            "plugin_id": self.plugin_id,
            "error_type": self.error_type.value,
            "details": self.details
        }

class PluginNotFoundError(PluginError):
    """Exception raised when a plugin cannot be found."""
    
    def __init__(self, plugin_id: str, message: Optional[str] = None):
        """Initialize a plugin not found error.
        
        Args:
            plugin_id: ID of the plugin that couldn't be found
            message: Optional custom error message
        """
        super().__init__(
            message or f"Plugin {plugin_id} not found",
            plugin_id=plugin_id,
            error_type=PluginErrorType.DISCOVERY
        )
        
class PluginValidationError(PluginError):
    """Exception raised when plugin parameters fail validation."""
    
    def __init__(
        self, 
        message: str, 
        plugin_id: Optional[str] = None,
        parameter: Optional[str] = None,
        expected: Optional[Any] = None,
        received: Optional[Any] = None
    ):
        """Initialize a plugin validation error.
        
        Args:
            message: Error message
            plugin_id: ID of the plugin that caused the error
            parameter: Name of the parameter that failed validation
            expected: Expected value or type
            received: Received value
        """
        details = {}
        if parameter:
            details["parameter"] = parameter
        if expected is not None:
            details["expected"] = str(expected)
        if received is not None:
            details["received"] = str(received)
            
        super().__init__(
            message,
            plugin_id=plugin_id,
            error_type=PluginErrorType.VALIDATION,
            details=details
        )
        
class PluginExecutionError(PluginError):
    """Exception raised when a plugin execution fails."""
    
    def __init__(
        self, 
        message: str, 
        plugin_id: Optional[str] = None,
        original_error: Optional[Exception] = None
    ):
        """Initialize a plugin execution error.
        
        Args:
            message: Error message
            plugin_id: ID of the plugin that caused the error
            original_error: Original exception that caused this error
        """
        details = {}
        if original_error:
            details["original_error"] = str(original_error)
            details["original_error_type"] = type(original_error).__name__
            
        super().__init__(
            message,
            plugin_id=plugin_id,
            error_type=PluginErrorType.EXECUTION,
            details=details
        )
        
class PluginDependencyError(PluginError):
    """Exception raised when there's an issue with plugin dependencies."""
    
    def __init__(
        self, 
        message: str, 
        plugin_id: Optional[str] = None,
        dependency_id: Optional[str] = None
    ):
        """Initialize a plugin dependency error.
        
        Args:
            message: Error message
            plugin_id: ID of the plugin that caused the error
            dependency_id: ID of the dependency that caused the issue
        """
        details = {}
        if dependency_id:
            details["dependency_id"] = dependency_id
            
        super().__init__(
            message,
            plugin_id=plugin_id,
            error_type=PluginErrorType.DEPENDENCY,
            details=details
        )