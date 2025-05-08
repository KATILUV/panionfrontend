"""
Core exceptions for the Panion system.
"""

from enum import Enum
from typing import Optional, Dict, Any

class ErrorSeverity(str, Enum):
    """Error severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class PluginErrorType(str, Enum):
    """Plugin error types."""
    INIT_ERROR = "init_error"
    VALIDATION_ERROR = "validation_error"
    RUNTIME_ERROR = "runtime_error"
    NOT_FOUND = "not_found"
    DEPENDENCY_ERROR = "dependency_error"
    CONFIG_ERROR = "config_error"
    SECURITY_ERROR = "security_error"
    VERSION_ERROR = "version_error"

class PanionError(Exception):
    """Base class for all Panion errors."""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.MEDIUM):
        super().__init__(message)
        self.severity = severity

class PluginError(PanionError):
    """Plugin-related errors."""
    def __init__(
        self,
        message: str,
        error_type: PluginErrorType,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        plugin_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, severity)
        self.error_type = error_type
        self.plugin_id = plugin_id
        self.details = details or {}

class ConfigError(PanionError):
    """Configuration-related errors."""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.MEDIUM):
        super().__init__(message, severity)

class ResourceError(PanionError):
    """Resource-related errors."""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.MEDIUM):
        super().__init__(message, severity)

class SecurityError(PanionError):
    """Security-related errors."""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.HIGH):
        super().__init__(message, severity)

class ValidationError(PanionError):
    """Validation-related errors."""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.MEDIUM):
        super().__init__(message, severity)

class DependencyError(PanionError):
    """Dependency-related errors."""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.MEDIUM):
        super().__init__(message, severity)

class StateError(PanionError):
    """State-related errors."""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.MEDIUM):
        super().__init__(message, severity)

class MemoryError(PanionError):
    """Memory-related errors."""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.MEDIUM):
        super().__init__(message, severity)

class GoalError(PanionError):
    """Goal-related errors."""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.MEDIUM):
        super().__init__(message, severity) 