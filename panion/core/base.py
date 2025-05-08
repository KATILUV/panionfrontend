"""
Base Component Interface
Defines standard interfaces for all Panion components.
"""

import logging
from typing import Dict, Any, Optional, List
from enum import Enum
from datetime import datetime
from dataclasses import dataclass
from abc import ABC, abstractmethod

class ComponentState(Enum):
    """Component lifecycle states."""
    UNINITIALIZED = "uninitialized"
    INITIALIZING = "initializing"
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"
    STOPPING = "stopping"
    STOPPED = "stopped"

@dataclass
class ComponentMetadata:
    """Base metadata for all components."""
    name: str
    version: str
    description: str
    author: str
    created_at: datetime
    updated_at: datetime
    dependencies: Dict[str, str]
    config_schema: Dict[str, Any]

class BaseComponent(ABC):
    """Base class for all Panion components."""
    
    def __init__(self, metadata: ComponentMetadata):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.metadata = metadata
        self._state = ComponentState.UNINITIALIZED
        self._error_count = 0
        self._max_errors = 3
        self._last_error: Optional[Exception] = None
        self._last_error_time: Optional[datetime] = None
        self._start_time: Optional[datetime] = None
        self._config: Dict[str, Any] = {}
    
    @property
    def state(self) -> ComponentState:
        """Get the current state of the component."""
        return self._state
    
    @property
    def is_active(self) -> bool:
        """Check if the component is active."""
        return self._state == ComponentState.ACTIVE
    
    @property
    def error_count(self) -> int:
        """Get the current error count."""
        return self._error_count
    
    @property
    def uptime(self) -> Optional[float]:
        """Get the component uptime in seconds."""
        if self._start_time:
            return (datetime.now() - self._start_time).total_seconds()
        return None
    
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the component."""
        pass
    
    @abstractmethod
    async def start(self) -> None:
        """Start the component."""
        pass
    
    @abstractmethod
    async def stop(self) -> None:
        """Stop the component."""
        pass
    
    @abstractmethod
    async def pause(self) -> None:
        """Pause the component."""
        pass
    
    @abstractmethod
    async def resume(self) -> None:
        """Resume the component."""
        pass
    
    @abstractmethod
    async def update(self) -> None:
        """Update the component state."""
        pass
    
    @abstractmethod
    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the component."""
        pass
    
    def _handle_error(self, error: Exception) -> None:
        """Handle component errors."""
        self._error_count += 1
        self._last_error = error
        self._last_error_time = datetime.now()
        
        if self._error_count >= self._max_errors:
            self._state = ComponentState.ERROR
            self.logger.error(
                f"Component {self.metadata.name} exceeded maximum error count. "
                f"Setting state to ERROR."
            )
        else:
            self._state = ComponentState.PAUSED
            self.logger.warning(
                f"Component {self.metadata.name} encountered error. "
                f"Setting state to PAUSED. "
                f"Error count: {self._error_count}/{self._max_errors}"
            )
    
    def _validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate component configuration."""
        try:
            # Check required fields
            for key, schema in self.metadata.config_schema.items():
                if schema.get('required', False) and key not in config:
                    self.logger.error(f"Missing required config field: {key}")
                    return False
                
                if key in config:
                    value = config[key]
                    expected_type = schema.get('type')
                    if expected_type and not isinstance(value, expected_type):
                        self.logger.error(
                            f"Invalid type for config field {key}: "
                            f"expected {expected_type}, got {type(value)}"
                        )
                        return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error validating config: {e}")
            return False
    
    def set_config(self, config: Dict[str, Any]) -> bool:
        """Set component configuration."""
        if not self._validate_config(config):
            return False
        
        self._config = config
        return True
    
    def get_config(self) -> Dict[str, Any]:
        """Get component configuration."""
        return self._config.copy()
    
    def get_error_info(self) -> Dict[str, Any]:
        """Get error information."""
        return {
            'count': self._error_count,
            'last_error': str(self._last_error) if self._last_error else None,
            'last_error_time': self._last_error_time.isoformat() if self._last_error_time else None
        }
    
    def reset_errors(self) -> None:
        """Reset error tracking."""
        self._error_count = 0
        self._last_error = None
        self._last_error_time = None 