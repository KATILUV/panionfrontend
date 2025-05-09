"""
Basic Plugin Template

This template provides a foundation for creating simple plugins with standard
functionality. It extends the BasePlugin with common methods and patterns.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from ..base import BasePlugin
from ..plugin_base import PluginResult

class BasicPlugin(BasePlugin):
    """
    Basic Plugin Template
    
    A standard template for simple plugins that don't require complex functionality.
    This template includes common methods and patterns that most plugins will need.
    
    Features:
    - Standard initialization
    - Basic lifecycle methods (start, stop, pause, resume)
    - Metrics collection
    - Simple execution patterns
    """
    
    def __init__(
        self,
        name: str,
        version: str,
        description: str,
        author: str,
        tags: Optional[List[str]] = None,
        dependencies: Optional[List[str]] = None
    ):
        """Initialize the basic plugin.
        
        Args:
            name: Plugin name
            version: Plugin version
            description: Plugin description
            author: Plugin author
            tags: Optional list of tags/categories
            dependencies: Optional list of dependencies
        """
        super().__init__(
            name=name,
            version=version,
            description=description,
            author=author,
            tags=tags,
            dependencies=dependencies
        )
        
        # Plugin-specific initialization
        self._is_running = False
        self._metrics = {
            "executions": 0,
            "successful_executions": 0,
            "failed_executions": 0,
            "average_execution_time": 0.0,
            "total_execution_time": 0.0,
            "last_execution": None,
        }
    
    async def initialize(self) -> PluginResult:
        """Initialize the plugin.
        
        Returns:
            PluginResult: Result of initialization
        """
        try:
            self.logger.info(f"Initializing {self.metadata.name} plugin")
            # Plugin-specific initialization logic
            
            return PluginResult(
                success=True,
                message=f"{self.metadata.name} plugin initialized successfully"
            )
        except Exception as e:
            self.logger.error(f"Error initializing {self.metadata.name} plugin: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to initialize {self.metadata.name} plugin",
                error=str(e)
            )
    
    async def start(self) -> PluginResult:
        """Start the plugin.
        
        Returns:
            PluginResult: Result of start operation
        """
        try:
            self.logger.info(f"Starting {self.metadata.name} plugin")
            self._is_running = True
            
            return PluginResult(
                success=True,
                message=f"{self.metadata.name} plugin started successfully"
            )
        except Exception as e:
            self.logger.error(f"Error starting {self.metadata.name} plugin: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to start {self.metadata.name} plugin",
                error=str(e)
            )
    
    async def stop(self) -> PluginResult:
        """Stop the plugin.
        
        Returns:
            PluginResult: Result of stop operation
        """
        try:
            self.logger.info(f"Stopping {self.metadata.name} plugin")
            self._is_running = False
            
            return PluginResult(
                success=True,
                message=f"{self.metadata.name} plugin stopped successfully"
            )
        except Exception as e:
            self.logger.error(f"Error stopping {self.metadata.name} plugin: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to stop {self.metadata.name} plugin",
                error=str(e)
            )
    
    async def pause(self) -> PluginResult:
        """Pause the plugin.
        
        Returns:
            PluginResult: Result of pause operation
        """
        try:
            if not self._is_running:
                return PluginResult(
                    success=False,
                    message=f"{self.metadata.name} plugin is not running"
                )
                
            self.logger.info(f"Pausing {self.metadata.name} plugin")
            self._is_running = False
            
            return PluginResult(
                success=True,
                message=f"{self.metadata.name} plugin paused successfully"
            )
        except Exception as e:
            self.logger.error(f"Error pausing {self.metadata.name} plugin: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to pause {self.metadata.name} plugin",
                error=str(e)
            )
    
    async def resume(self) -> PluginResult:
        """Resume the plugin.
        
        Returns:
            PluginResult: Result of resume operation
        """
        try:
            self.logger.info(f"Resuming {self.metadata.name} plugin")
            self._is_running = True
            
            return PluginResult(
                success=True,
                message=f"{self.metadata.name} plugin resumed successfully"
            )
        except Exception as e:
            self.logger.error(f"Error resuming {self.metadata.name} plugin: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to resume {self.metadata.name} plugin",
                error=str(e)
            )
    
    async def get_metrics(self) -> PluginResult:
        """Get plugin metrics.
        
        Returns:
            PluginResult: Plugin metrics
        """
        try:
            metrics = {
                **self._metrics,
                "is_running": self._is_running,
                "last_updated": datetime.now().isoformat()
            }
            
            return PluginResult(
                success=True,
                message=f"{self.metadata.name} plugin metrics retrieved successfully",
                data=metrics
            )
        except Exception as e:
            self.logger.error(f"Error getting {self.metadata.name} plugin metrics: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to get {self.metadata.name} plugin metrics",
                error=str(e)
            )
    
    async def _process_action(self, action: str, parameters: Dict[str, Any]) -> PluginResult:
        """Process a specific plugin action.
        
        Args:
            action: Name of the action to perform
            parameters: Parameters for the action
            
        Returns:
            PluginResult: Result of the action
        """
        # Override in subclasses with specific action handling
        return PluginResult(
            success=False,
            message=f"Action {action} not implemented in {self.metadata.name} plugin",
            error=f"Action {action} not implemented"
        )
    
    async def execute(self, parameters: Dict[str, Any]) -> PluginResult:
        """Execute the plugin.
        
        Args:
            parameters: Parameters for execution, including action
            
        Returns:
            PluginResult: Result of execution
        """
        if not self._is_running:
            return PluginResult(
                success=False,
                message=f"{self.metadata.name} plugin is not running",
                error="Plugin not running"
            )
        
        action = parameters.get("action", "")
        if not action:
            return PluginResult(
                success=False,
                message="No action specified",
                error="Missing required parameter: 'action'"
            )
        
        start_time = datetime.now()
        self._metrics["executions"] += 1
        self._metrics["last_execution"] = start_time.isoformat()
        
        try:
            # Handle standard actions
            if action == "start":
                result = await self.start()
            elif action == "stop":
                result = await self.stop()
            elif action == "pause":
                result = await self.pause()
            elif action == "resume":
                result = await self.resume()
            elif action == "get_metrics":
                result = await self.get_metrics()
            else:
                # Process plugin-specific actions
                result = await self._process_action(action, parameters)
            
            # Update metrics
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            self._metrics["total_execution_time"] += execution_time
            
            if result.success:
                self._metrics["successful_executions"] += 1
            else:
                self._metrics["failed_executions"] += 1
                
            self._metrics["average_execution_time"] = (
                self._metrics["total_execution_time"] / self._metrics["executions"]
            )
            
            return result
            
        except Exception as e:
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            self._metrics["total_execution_time"] += execution_time
            self._metrics["failed_executions"] += 1
            self._metrics["average_execution_time"] = (
                self._metrics["total_execution_time"] / self._metrics["executions"]
            )
            
            self.logger.error(f"Error executing {self.metadata.name} plugin: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Error executing {self.metadata.name} plugin: {str(e)}",
                error=str(e)
            )
    
    async def cleanup(self) -> PluginResult:
        """Clean up plugin resources.
        
        Returns:
            PluginResult: Result of cleanup
        """
        try:
            self.logger.info(f"Cleaning up {self.metadata.name} plugin resources")
            # Plugin-specific cleanup logic
            self._is_running = False
            
            return PluginResult(
                success=True,
                message=f"{self.metadata.name} plugin resources cleaned up successfully"
            )
        except Exception as e:
            self.logger.error(f"Error cleaning up {self.metadata.name} plugin resources: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to clean up {self.metadata.name} plugin resources",
                error=str(e)
            )