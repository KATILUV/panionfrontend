"""
Plugin Interfaces

This module defines the interfaces that plugins can implement to provide
specific functionality to the Panion system. These interfaces formalize
the contracts between the system and plugins.
"""

import abc
from typing import Any, Dict, List, Optional, Protocol, TypeVar, Union

from .plugin_base import PluginResult

# For backward compatibility with existing code
class IPlugin(Protocol):
    """Legacy interface for plugins used by existing code."""
    
    def initialize(self) -> Any:
        """Initialize the plugin."""
        ...
        
    def execute(self, action: str, parameters: Dict[str, Any]) -> Any:
        """Execute a plugin action.
        
        Args:
            action: Name of the action to execute.
            parameters: Parameters for the action.
            
        Returns:
            Result of the action.
        """
        ...
        
class PluginState:
    """Legacy enum for plugin states."""
    UNINITIALIZED = "uninitialized"
    INITIALIZING = "initializing"
    INITIALIZED = "initialized"
    STARTING = "starting"
    STARTED = "started"
    STOPPING = "stopping"
    STOPPED = "stopped"
    FAILED = "failed"

# Type variables for generics
T = TypeVar('T')

class DataProcessor(Protocol):
    """Interface for plugins that process data."""
    
    async def process_data(self, data: Any) -> PluginResult:
        """Process the provided data.
        
        Args:
            data: The data to process.
            
        Returns:
            PluginResult: The result of the processing.
        """
        ...
        
    async def get_supported_formats(self) -> PluginResult:
        """Get the list of data formats supported by this processor.
        
        Returns:
            PluginResult: The supported data formats.
        """
        ...


class AgentPlugin(Protocol):
    """Interface for plugins that act as autonomous agents."""
    
    async def handle_task(self, task: Dict[str, Any]) -> PluginResult:
        """Handle a task assigned to this agent.
        
        Args:
            task: The task to handle.
            
        Returns:
            PluginResult: The result of handling the task.
        """
        ...
        
    async def get_capabilities(self) -> PluginResult:
        """Get the capabilities of this agent.
        
        Returns:
            PluginResult: The agent's capabilities.
        """
        ...
        
    async def get_status(self) -> PluginResult:
        """Get the current status of this agent.
        
        Returns:
            PluginResult: The agent's status.
        """
        ...


class DataSourcePlugin(Protocol):
    """Interface for plugins that provide data from external sources."""
    
    async def fetch_data(self, query: Dict[str, Any]) -> PluginResult:
        """Fetch data based on the provided query.
        
        Args:
            query: The query parameters.
            
        Returns:
            PluginResult: The fetched data.
        """
        ...
        
    async def get_source_info(self) -> PluginResult:
        """Get information about this data source.
        
        Returns:
            PluginResult: Information about the data source.
        """
        ...


class UIComponentPlugin(Protocol):
    """Interface for plugins that provide UI components."""
    
    async def get_component_definition(self, component_id: str) -> PluginResult:
        """Get the definition of a UI component.
        
        Args:
            component_id: The ID of the component to get.
            
        Returns:
            PluginResult: The component definition.
        """
        ...
        
    async def list_components(self) -> PluginResult:
        """List all available UI components.
        
        Returns:
            PluginResult: The list of available components.
        """
        ...


class StoragePlugin(Protocol):
    """Interface for plugins that provide storage functionality."""
    
    async def save(self, key: str, data: Any) -> PluginResult:
        """Save data to storage.
        
        Args:
            key: The key to save the data under.
            data: The data to save.
            
        Returns:
            PluginResult: The result of the save operation.
        """
        ...
        
    async def load(self, key: str) -> PluginResult:
        """Load data from storage.
        
        Args:
            key: The key to load data from.
            
        Returns:
            PluginResult: The loaded data.
        """
        ...
        
    async def delete(self, key: str) -> PluginResult:
        """Delete data from storage.
        
        Args:
            key: The key to delete.
            
        Returns:
            PluginResult: The result of the delete operation.
        """
        ...
        
    async def list_keys(self, prefix: Optional[str] = None) -> PluginResult:
        """List all keys in storage.
        
        Args:
            prefix: Optional prefix to filter keys by.
            
        Returns:
            PluginResult: The list of keys.
        """
        ...


class AnalyticsPlugin(Protocol):
    """Interface for plugins that provide analytics capabilities."""
    
    async def analyze(self, data: Any, options: Optional[Dict[str, Any]] = None) -> PluginResult:
        """Analyze the provided data.
        
        Args:
            data: The data to analyze.
            options: Optional analysis options.
            
        Returns:
            PluginResult: The analysis results.
        """
        ...
        
    async def get_available_analyses(self) -> PluginResult:
        """Get the list of available analyses.
        
        Returns:
            PluginResult: The available analyses.
        """
        ...


class AuthenticationPlugin(Protocol):
    """Interface for plugins that provide authentication functionality."""
    
    async def authenticate(self, credentials: Dict[str, Any]) -> PluginResult:
        """Authenticate using the provided credentials.
        
        Args:
            credentials: The credentials to authenticate with.
            
        Returns:
            PluginResult: The authentication result.
        """
        ...
        
    async def validate_token(self, token: str) -> PluginResult:
        """Validate an authentication token.
        
        Args:
            token: The token to validate.
            
        Returns:
            PluginResult: The validation result.
        """
        ...
        
    async def revoke_token(self, token: str) -> PluginResult:
        """Revoke an authentication token.
        
        Args:
            token: The token to revoke.
            
        Returns:
            PluginResult: The revocation result.
        """
        ...


class NotificationPlugin(Protocol):
    """Interface for plugins that provide notification functionality."""
    
    async def send_notification(self, 
                                recipient: str, 
                                message: str, 
                                options: Optional[Dict[str, Any]] = None) -> PluginResult:
        """Send a notification.
        
        Args:
            recipient: The recipient of the notification.
            message: The notification message.
            options: Optional notification options.
            
        Returns:
            PluginResult: The result of sending the notification.
        """
        ...
        
    async def get_notification_channels(self) -> PluginResult:
        """Get the available notification channels.
        
        Returns:
            PluginResult: The available notification channels.
        """
        ...