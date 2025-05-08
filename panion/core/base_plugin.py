"""
Base Plugin
Defines the base class for all Panion plugins.
"""

import logging
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod
from datetime import datetime

class BasePlugin(ABC):
    """Base class for all Panion plugins."""
    
    def __init__(self):
        """Initialize the base plugin."""
        self.logger = logging.getLogger(self.__class__.__name__)
        self.name = self.__class__.__name__
        self.version = "0.1.0"
        self.description = "Base plugin class"
        self.created_at = datetime.now().isoformat()
        self.last_updated = datetime.now().isoformat()
        self.status = "initialized"
        self.metadata = {}
        
    @abstractmethod
    async def execute(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the plugin's main functionality.
        
        This method must be implemented by all plugin subclasses to define their core functionality.
        The implementation should handle the plugin's main logic, including input validation,
        error handling, and result formatting.
        
        Args:
            parameters: Dictionary of parameters for the plugin execution. The specific
                       parameters required will depend on the plugin implementation.
            
        Returns:
            Dictionary containing the execution results. The structure should include:
                - status: Execution status (success/failure)
                - result: The main execution output
                - errors: Any errors encountered (if applicable)
                - metrics: Performance metrics (if applicable)
            
        Raises:
            NotImplementedError: This method must be implemented by concrete subclasses
        """
        raise NotImplementedError("Plugin subclasses must implement execute method")
        
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """Validate the input parameters.
        
        Args:
            parameters: Dictionary of parameters to validate
            
        Returns:
            True if parameters are valid, False otherwise
        """
        return True
        
    def update_status(self, status: str) -> None:
        """Update the plugin's status.
        
        Args:
            status: New status string
        """
        self.status = status
        self.last_updated = datetime.now().isoformat()
        
    def update_metadata(self, metadata: Dict[str, Any]) -> None:
        """Update the plugin's metadata.
        
        Args:
            metadata: Dictionary of metadata to update
        """
        self.metadata.update(metadata)
        self.last_updated = datetime.now().isoformat()
        
    def get_info(self) -> Dict[str, Any]:
        """Get plugin information.
        
        Returns:
            Dictionary containing plugin information
        """
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "created_at": self.created_at,
            "last_updated": self.last_updated,
            "status": self.status,
            "metadata": self.metadata
        } 