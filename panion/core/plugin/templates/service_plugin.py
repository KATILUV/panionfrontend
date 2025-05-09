"""
Service Plugin Template

This template provides a foundation for creating plugins that provide ongoing services
or background tasks. It extends the BasicPlugin with service-specific functionality.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime

from .basic_plugin import BasicPlugin
from ..plugin_base import PluginResult

class ServicePlugin(BasicPlugin):
    """
    Service Plugin Template
    
    A template for plugins that provide ongoing services or background tasks.
    This template includes methods for managing service lifecycle and state.
    
    Features:
    - Service lifecycle management (start_service, stop_service)
    - Background task handling
    - Service state tracking
    - Health monitoring
    """
    
    def __init__(
        self,
        name: str,
        version: str,
        description: str,
        author: str,
        service_type: str = "background",
        update_interval: float = 60.0,
        tags: Optional[List[str]] = None,
        dependencies: Optional[List[str]] = None
    ):
        """Initialize the service plugin.
        
        Args:
            name: Plugin name
            version: Plugin version
            description: Plugin description
            author: Plugin author
            service_type: Type of service (background, scheduled, event-driven)
            update_interval: Interval between service updates in seconds
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
        
        # Service-specific initialization
        self._service_type = service_type
        self._update_interval = update_interval
        self._service_running = False
        self._last_update = None
        self._task = None
        self._on_update_callback = None
        self._service_state = {
            "status": "idle",
            "last_error": None,
            "start_time": None,
            "updates_count": 0,
            "health": "unknown"
        }
    
    async def initialize(self) -> PluginResult:
        """Initialize the service plugin.
        
        Returns:
            PluginResult: Result of initialization
        """
        try:
            self.logger.info(f"Initializing {self.metadata.name} service plugin")
            # Service-specific initialization logic
            
            return PluginResult(
                success=True,
                message=f"{self.metadata.name} service plugin initialized successfully"
            )
        except Exception as e:
            self.logger.error(f"Error initializing {self.metadata.name} service plugin: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to initialize {self.metadata.name} service plugin",
                error=str(e)
            )
    
    async def start(self) -> PluginResult:
        """Start the plugin and its service.
        
        Returns:
            PluginResult: Result of start operation
        """
        try:
            # Start the plugin
            result = await super().start()
            if not result.success:
                return result
                
            # Start the service
            service_result = await self.start_service()
            if not service_result.success:
                await super().stop()  # Rollback plugin start
                return service_result
                
            return PluginResult(
                success=True,
                message=f"{self.metadata.name} service plugin started successfully"
            )
        except Exception as e:
            self.logger.error(f"Error starting {self.metadata.name} service plugin: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to start {self.metadata.name} service plugin",
                error=str(e)
            )
    
    async def stop(self) -> PluginResult:
        """Stop the plugin and its service.
        
        Returns:
            PluginResult: Result of stop operation
        """
        try:
            # Stop the service
            service_result = await self.stop_service()
            
            # Stop the plugin regardless of service stop result
            plugin_result = await super().stop()
            
            if not service_result.success:
                return service_result
                
            return plugin_result
        except Exception as e:
            self.logger.error(f"Error stopping {self.metadata.name} service plugin: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to stop {self.metadata.name} service plugin",
                error=str(e)
            )
    
    async def start_service(self) -> PluginResult:
        """Start the service.
        
        Returns:
            PluginResult: Result of service start operation
        """
        if self._service_running:
            return PluginResult(
                success=False,
                message=f"{self.metadata.name} service is already running"
            )
            
        try:
            self.logger.info(f"Starting {self.metadata.name} service")
            self._service_running = True
            self._service_state["status"] = "starting"
            self._service_state["start_time"] = datetime.now().isoformat()
            
            # Start the background task
            if self._service_type == "background":
                self._task = asyncio.create_task(self._background_service_loop())
            
            self._service_state["status"] = "running"
            self._service_state["health"] = "healthy"
            
            return PluginResult(
                success=True,
                message=f"{self.metadata.name} service started successfully"
            )
        except Exception as e:
            self._service_running = False
            self._service_state["status"] = "failed"
            self._service_state["last_error"] = str(e)
            self._service_state["health"] = "unhealthy"
            
            self.logger.error(f"Error starting {self.metadata.name} service: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to start {self.metadata.name} service",
                error=str(e)
            )
    
    async def stop_service(self) -> PluginResult:
        """Stop the service.
        
        Returns:
            PluginResult: Result of service stop operation
        """
        if not self._service_running:
            return PluginResult(
                success=False,
                message=f"{self.metadata.name} service is not running"
            )
            
        try:
            self.logger.info(f"Stopping {self.metadata.name} service")
            self._service_state["status"] = "stopping"
            
            # Cancel the background task
            if self._task and not self._task.done():
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    self.logger.info(f"{self.metadata.name} service task cancelled")
            
            self._service_running = False
            self._task = None
            self._service_state["status"] = "stopped"
            
            return PluginResult(
                success=True,
                message=f"{self.metadata.name} service stopped successfully"
            )
        except Exception as e:
            self._service_state["status"] = "error"
            self._service_state["last_error"] = str(e)
            self._service_state["health"] = "unhealthy"
            
            self.logger.error(f"Error stopping {self.metadata.name} service: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to stop {self.metadata.name} service",
                error=str(e)
            )
    
    async def _service_update(self) -> PluginResult:
        """Perform a service update.
        
        This method should be overridden by service implementations.
        
        Returns:
            PluginResult: Result of service update
        """
        # Default implementation does nothing
        return PluginResult(
            success=True,
            message=f"{self.metadata.name} service update completed"
        )
    
    async def _background_service_loop(self) -> None:
        """Background service loop that runs continuously."""
        try:
            while self._service_running:
                start_time = datetime.now()
                
                try:
                    # Perform service update
                    result = await self._service_update()
                    
                    # Update service state
                    self._last_update = datetime.now().isoformat()
                    self._service_state["updates_count"] += 1
                    
                    # Call update callback if set
                    if self._on_update_callback and result.success:
                        await self._on_update_callback(result)
                    
                    # Update health status
                    if result.success:
                        self._service_state["health"] = "healthy"
                    else:
                        self._service_state["health"] = "degraded"
                        self._service_state["last_error"] = result.error
                    
                except Exception as e:
                    self._service_state["health"] = "unhealthy"
                    self._service_state["last_error"] = str(e)
                    self.logger.error(f"Error in {self.metadata.name} service update: {str(e)}")
                
                # Calculate sleep time
                elapsed = (datetime.now() - start_time).total_seconds()
                sleep_time = max(0.1, self._update_interval - elapsed)
                
                # Sleep until next update
                await asyncio.sleep(sleep_time)
        except asyncio.CancelledError:
            self.logger.info(f"{self.metadata.name} service loop cancelled")
            raise
        except Exception as e:
            self._service_state["status"] = "error"
            self._service_state["health"] = "unhealthy"
            self._service_state["last_error"] = str(e)
            self.logger.error(f"Unhandled error in {self.metadata.name} service loop: {str(e)}")
    
    def set_update_callback(self, callback: Callable[[PluginResult], Any]) -> None:
        """Set a callback to be called after each service update.
        
        Args:
            callback: Function to call with update result.
                     Can be either a regular function or an async function.
        """
        self._on_update_callback = callback
    
    async def get_service_state(self) -> PluginResult:
        """Get the current service state.
        
        Returns:
            PluginResult: Service state
        """
        try:
            state = {
                **self._service_state,
                "is_running": self._service_running,
                "service_type": self._service_type,
                "update_interval": self._update_interval,
                "last_update": self._last_update,
            }
            
            return PluginResult(
                success=True,
                message=f"{self.metadata.name} service state retrieved successfully",
                data=state
            )
        except Exception as e:
            self.logger.error(f"Error getting {self.metadata.name} service state: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to get {self.metadata.name} service state",
                error=str(e)
            )
    
    async def update_now(self) -> PluginResult:
        """Trigger an immediate service update.
        
        Returns:
            PluginResult: Result of service update
        """
        if not self._service_running:
            return PluginResult(
                success=False,
                message=f"{self.metadata.name} service is not running",
                error="Service not running"
            )
            
        try:
            self.logger.info(f"Triggering immediate update for {self.metadata.name} service")
            return await self._service_update()
        except Exception as e:
            self.logger.error(f"Error updating {self.metadata.name} service: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to update {self.metadata.name} service",
                error=str(e)
            )
    
    async def set_update_interval(self, interval: float) -> PluginResult:
        """Set the service update interval.
        
        Args:
            interval: New update interval in seconds
            
        Returns:
            PluginResult: Result of operation
        """
        if interval <= 0:
            return PluginResult(
                success=False,
                message="Update interval must be positive",
                error="Invalid update interval"
            )
            
        try:
            self.logger.info(f"Setting {self.metadata.name} service update interval to {interval} seconds")
            self._update_interval = interval
            
            return PluginResult(
                success=True,
                message=f"{self.metadata.name} service update interval set to {interval} seconds"
            )
        except Exception as e:
            self.logger.error(f"Error setting {self.metadata.name} service update interval: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to set {self.metadata.name} service update interval",
                error=str(e)
            )
    
    async def _process_action(self, action: str, parameters: Dict[str, Any]) -> PluginResult:
        """Process a service plugin action.
        
        Args:
            action: Name of the action to perform
            parameters: Parameters for the action
            
        Returns:
            PluginResult: Result of the action
        """
        # Handle service-specific actions
        if action == "start_service":
            return await self.start_service()
        elif action == "stop_service":
            return await self.stop_service()
        elif action == "get_service_state":
            return await self.get_service_state()
        elif action == "update_now":
            return await self.update_now()
        elif action == "set_update_interval":
            interval = parameters.get("interval")
            if interval is None:
                return PluginResult(
                    success=False,
                    message="Missing interval parameter",
                    error="Missing required parameter: 'interval'"
                )
            return await self.set_update_interval(float(interval))
        
        # Fall back to basic plugin action handling
        return await super()._process_action(action, parameters)
    
    async def cleanup(self) -> PluginResult:
        """Clean up service plugin resources.
        
        Returns:
            PluginResult: Result of cleanup
        """
        try:
            # Stop the service if running
            if self._service_running:
                await self.stop_service()
            
            # Clean up other resources
            result = await super().cleanup()
            
            return result
        except Exception as e:
            self.logger.error(f"Error cleaning up {self.metadata.name} service plugin resources: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to clean up {self.metadata.name} service plugin resources",
                error=str(e)
            )