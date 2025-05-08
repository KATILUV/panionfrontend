"""
Base Plugin
Defines the interface for all Panion plugins.
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class PluginResult:
    """Result of a plugin execution."""
    success: bool
    data: Dict[str, Any]
    error: Optional[str] = None

class BasePlugin(ABC):
    """Base class for all Panion plugins."""
    
    def __init__(self, config: Dict[str, Any]):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.config = config
        
    @abstractmethod
    async def execute(self, input_data: Dict[str, Any]) -> PluginResult:
        """Execute the plugin's main functionality."""
        pass
    
    async def validate(self, input_data: Dict[str, Any]) -> bool:
        """Validate input data before execution."""
        return True
    
    async def cleanup(self) -> None:
        """Clean up any resources used by the plugin."""
        pass 