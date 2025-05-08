"""
Panion Error Handling System
Provides custom exceptions, retry mechanisms, and circuit breakers.
"""

import logging
import time
import functools
from typing import Type, Callable, Any, Optional, TypeVar, cast
from enum import Enum
from dataclasses import dataclass
from datetime import datetime, timedelta
from core.common_types import PluginErrorType

# Type variable for generic function type
T = TypeVar('T')

class ErrorSeverity(Enum):
    """Severity levels for errors."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ErrorCategory(Enum):
    """Categories of errors."""
    CONFIGURATION = "configuration"
    MEMORY = "memory"
    PLUGIN = "plugin"
    GOAL = "goal"
    SYSTEM = "system"
    EXTERNAL = "external"
    NETWORK = "network"
    DATABASE = "database"

class PanionError(Exception):
    """Base class for all Panion errors."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class ConfigurationError(PanionError):
    """Error related to configuration issues."""
    def __init__(self, message: str, config_key: Optional[str] = None):
        self.config_key = config_key
        if config_key:
            super().__init__(f"{config_key}: {message}")
        else:
            super().__init__(message)

class MemoryError(PanionError):
    """Memory system related errors."""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.MEDIUM):
        super().__init__(message)

class PluginError(PanionError):
    """Error related to plugin operations."""
    def __init__(self, message: str, error_type: PluginErrorType):
        self.error_type = error_type
        super().__init__(message)

class GoalError(PanionError):
    """Goal processing related errors."""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.MEDIUM):
        super().__init__(message)

class SystemError(PanionError):
    """System level errors."""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.HIGH):
        super().__init__(message)

class ExternalServiceError(PanionError):
    """External service related errors."""
    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.MEDIUM):
        super().__init__(message)

class ServiceError(PanionError):
    """Error related to service operations."""
    def __init__(self, message: str, service_name: str):
        self.service_name = service_name
        super().__init__(f"{service_name}: {message}")

class ValidationError(PanionError):
    """Error related to validation failures."""
    def __init__(self, message: str, field: Optional[str] = None):
        self.field = field
        if field:
            super().__init__(f"{field}: {message}")
        else:
            super().__init__(message)

class SecurityError(PanionError):
    """Error related to security violations."""
    def __init__(self, message: str, severity: str = "high"):
        self.severity = severity
        super().__init__(f"[{severity}] {message}")

class DependencyError(PanionError):
    """Error related to dependency resolution."""
    def __init__(self, message: str, dependency: Optional[str] = None):
        self.dependency = dependency
        if dependency:
            super().__init__(f"{dependency}: {message}")
        else:
            super().__init__(message)

class ResourceError(PanionError):
    """Error related to resource management."""
    def __init__(self, message: str, resource_type: str):
        self.resource_type = resource_type
        super().__init__(f"{resource_type}: {message}")

class StateError(PanionError):
    """Error related to invalid state transitions."""
    def __init__(self, message: str, current_state: str, target_state: str):
        self.current_state = current_state
        self.target_state = target_state
        super().__init__(f"Cannot transition from {current_state} to {target_state}: {message}")

@dataclass
class RetryConfig:
    """Configuration for retry mechanism."""
    max_attempts: int = 3
    initial_delay: float = 1.0
    max_delay: float = 10.0
    backoff_factor: float = 2.0
    exceptions: tuple[Type[Exception], ...] = (Exception,)

def retry(config: Optional[RetryConfig] = None) -> Callable:
    """
    Decorator for retrying functions with exponential backoff.
    
    Args:
        config: Optional retry configuration. If not provided, uses default values.
    
    Returns:
        Decorated function with retry capability.
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            retry_config = config or RetryConfig()
            delay = retry_config.initial_delay
            
            for attempt in range(retry_config.max_attempts):
                try:
                    return func(*args, **kwargs)
                except retry_config.exceptions as e:
                    if attempt == retry_config.max_attempts - 1:
                        raise
                    
                    logging.warning(
                        f"Attempt {attempt + 1} failed: {str(e)}. "
                        f"Retrying in {delay} seconds..."
                    )
                    
                    time.sleep(delay)
                    delay = min(delay * retry_config.backoff_factor, retry_config.max_delay)
            
            raise RuntimeError("Retry mechanism failed unexpectedly")
        
        return cast(Callable[..., T], wrapper)
    return decorator

class CircuitBreaker:
    """
    Circuit breaker pattern implementation.
    Prevents repeated calls to failing services.
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        reset_timeout: int = 60,
        half_open_timeout: int = 30
    ):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.half_open_timeout = half_open_timeout
        self.failures = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = "closed"  # closed, open, half-open
    
    def __call__(self, func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            if self.state == "open":
                if self._should_reset():
                    self.state = "half-open"
                else:
                    raise ExternalServiceError(
                        "Circuit breaker is open",
                        ErrorSeverity.HIGH
                    )
            
            try:
                result = func(*args, **kwargs)
                if self.state == "half-open":
                    self._reset()
                return result
            except Exception as e:
                self._record_failure()
                raise
        
        return cast(Callable[..., T], wrapper)
    
    def _should_reset(self) -> bool:
        """Check if the circuit breaker should reset."""
        if not self.last_failure_time:
            return True
        
        time_since_failure = datetime.now() - self.last_failure_time
        return time_since_failure.total_seconds() >= self.reset_timeout
    
    def _record_failure(self) -> None:
        """Record a failure and update circuit breaker state."""
        self.failures += 1
        self.last_failure_time = datetime.now()
        
        if self.failures >= self.failure_threshold:
            self.state = "open"
    
    def _reset(self) -> None:
        """Reset the circuit breaker."""
        self.failures = 0
        self.last_failure_time = None
        self.state = "closed"

class ErrorHandler:
    """
    Central error handling system.
    Manages error logging, reporting, and recovery strategies.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.error_counts: dict[ErrorCategory, int] = {
            category: 0 for category in ErrorCategory
        }
        self.last_errors: dict[ErrorCategory, list[PanionError]] = {
            category: [] for category in ErrorCategory
        }
    
    def handle_error(self, error: PanionError) -> None:
        """
        Handle an error by logging it and updating error statistics.
        
        Args:
            error: The error to handle
        """
        self.logger.error(
            f"Error occurred: {error.message} "
            f"(Category: {error.category.value}, "
            f"Severity: {error.severity.value})"
        )
        
        self.error_counts[error.category] += 1
        self.last_errors[error.category].append(error)
        
        # Keep only the last 10 errors per category
        if len(self.last_errors[error.category]) > 10:
            self.last_errors[error.category].pop(0)
    
    def get_error_stats(self) -> dict[str, Any]:
        """
        Get error statistics.
        
        Returns:
            Dictionary containing error statistics
        """
        return {
            'counts': {
                category.value: count 
                for category, count in self.error_counts.items()
            },
            'last_errors': {
                category.value: [
                    {
                        'message': error.message,
                        'severity': error.severity.value,
                        'timestamp': error.timestamp.isoformat()
                    }
                    for error in errors
                ]
                for category, errors in self.last_errors.items()
            }
        }
    
    def reset_stats(self) -> None:
        """Reset error statistics."""
        self.error_counts = {category: 0 for category in ErrorCategory}
        self.last_errors = {category: [] for category in ErrorCategory}

# Create singleton instance
error_handler = ErrorHandler() 