"""
Error types and enums for the Panion system.
"""

from enum import Enum
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path

class ErrorSeverity(Enum):
    """Severity levels for errors."""
    CRITICAL = 0
    HIGH = 1
    MEDIUM = 2
    LOW = 3
    INFO = 4

class PluginErrorType(Enum):
    """Types of plugin errors."""
    INITIALIZATION = "initialization"
    EXECUTION = "execution"
    CLEANUP = "cleanup"
    DEPENDENCY = "dependency"
    RESOURCE = "resource"
    TIMEOUT = "timeout"
    VALIDATION = "validation"

class PluginError(Exception):
    """Base class for plugin errors."""
    def __init__(self, message: str, error_type: PluginErrorType, details: Dict[str, Any] = None):
        super().__init__(message)
        self.error_type = error_type
        self.details = details or {}
        self.timestamp = datetime.now()

class ErrorContext:
    """Context information for error handling."""
    def __init__(
        self,
        function: str = "",
        args: tuple = (),
        kwargs: Dict[str, Any] = None,
        recovery_strategy: Optional[str] = None,
        plugin: Optional[Any] = None,
        goal: Optional[Any] = None,
        dependent_goals: Optional[List[Any]] = None,
        operation: Optional[str] = None,
        timeout: Optional[float] = None,
        reconnect: Optional[callable] = None,
        circuit_breaker: Optional[Any] = None,
        backup_path: Optional[Path] = None,
        file_path: Optional[Path] = None,
        **extra_kwargs
    ):
        self.timestamp = datetime.now()
        self.retry_count = 0
        self.severity = ErrorSeverity.MEDIUM
        self.recovery_attempted = False
        
        # Function context
        self.function = function
        self.args = args
        self.kwargs = kwargs or {}
        
        # Recovery context
        self.recovery_strategy = recovery_strategy
        
        # Plugin context
        self.plugin = plugin
        
        # Goal context
        self.goal = goal
        self.dependent_goals = dependent_goals or []
        
        # Operation context
        self.operation = operation
        self.timeout = timeout
        
        # Connection context
        self.reconnect = reconnect
        self.circuit_breaker = circuit_breaker
        
        # File context
        self.backup_path = backup_path
        self.file_path = file_path
        
        # Additional context
        self.__dict__.update(extra_kwargs) 