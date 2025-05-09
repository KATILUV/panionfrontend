"""
Echo Agent Plugin
A simple echo agent that returns the input message.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from panion.core.plugin.plugin_base import BasePlugin, PluginResult
from panion.core.plugin.interfaces import PluginState

class EchoAgent(BasePlugin):
    """A simple echo agent that returns the input message."""
    
    def __init__(self, metadata=None):
        """Initialize the echo agent."""
        if metadata is None:
            from panion.core.plugin.plugin_base import PluginMetadata
            metadata = PluginMetadata(
                id="echo_agent",
                name="EchoAgent",
                version="1.0.0",
                description="A simple echo agent that returns the input message",
                author="Panion Team",
                type="agent"
            )
        super().__init__(metadata)
        self.logger = logging.getLogger("EchoAgent")
        self.is_running = False
        self.context = {}
        self.state = "inactive"
    
    async def initialize(self) -> PluginResult:
        """Initialize the agent."""
        try:
            self.logger.info("Initializing echo agent")
            self.is_running = True
            self.logger.info("Echo agent initialized successfully")
            return PluginResult.success_result(message="Echo agent initialized successfully")
        except Exception as e:
            self.logger.error(f"Error initializing echo agent: {str(e)}")
            return PluginResult.failure(message=f"Failed to initialize Echo agent: {str(e)}")
    
    async def start(self) -> PluginResult:
        """Start the agent."""
        try:
            self.logger.info("Starting echo agent")
            self.is_running = True
            return PluginResult.success_result(message="Echo agent started successfully")
        except Exception as e:
            self.logger.error(f"Error starting echo agent: {str(e)}")
            return PluginResult.failure(message=f"Failed to start Echo agent: {str(e)}")
    
    async def stop(self) -> PluginResult:
        """Stop the agent."""
        try:
            self.logger.info("Stopping echo agent")
            self.is_running = False
            return PluginResult.success_result(message="Echo agent stopped successfully")
        except Exception as e:
            self.logger.error(f"Error stopping echo agent: {str(e)}")
            return PluginResult.failure(message=f"Failed to stop Echo agent: {str(e)}")
    
    async def pause(self) -> PluginResult:
        """Pause the agent."""
        try:
            self.logger.info("Pausing echo agent")
            self.is_running = False
            return PluginResult.success_result(message="Echo agent paused successfully")
        except Exception as e:
            self.logger.error(f"Error pausing echo agent: {str(e)}")
            return PluginResult.failure(message=f"Failed to pause Echo agent: {str(e)}")
    
    async def resume(self) -> PluginResult:
        """Resume the agent."""
        try:
            self.logger.info("Resuming echo agent")
            self.is_running = True
            return PluginResult.success_result(message="Echo agent resumed successfully")
        except Exception as e:
            self.logger.error(f"Error resuming echo agent: {str(e)}")
            return PluginResult.failure(message=f"Failed to resume Echo agent: {str(e)}")
    
    async def update(self) -> PluginResult:
        """Update the agent state."""
        try:
            if self.is_running:
                self.logger.debug("Echo agent is running")
            return PluginResult.success_result(
                message="Echo agent updated successfully",
                data={"status": "running" if self.is_running else "idle"}
            )
        except Exception as e:
            self.logger.error(f"Error updating echo agent: {str(e)}")
            return PluginResult.failure(message=f"Failed to update Echo agent: {str(e)}")
    
    async def get_metrics(self) -> PluginResult:
        """Get agent metrics."""
        try:
            metrics = {
                'is_running': self.is_running,
                'last_update': datetime.now().isoformat()
            }
            return PluginResult.success_result(
                message="Echo agent metrics retrieved successfully",
                data=metrics
            )
        except Exception as e:
            self.logger.error(f"Error getting echo agent metrics: {str(e)}")
            return PluginResult.failure(message=f"Failed to get Echo agent metrics: {str(e)}")
    
    def update_context(self, context: Dict[str, Any]) -> PluginResult:
        """Update the agent's context."""
        try:
            self.context = context
            return PluginResult.success_result(message="Context updated successfully")
        except Exception as e:
            self.logger.error(f"Error updating context: {str(e)}")
            return PluginResult.failure(message=f"Failed to update context: {str(e)}")
    
    async def process_message(self, message: Dict[str, Any]) -> PluginResult:
        """Process a message and echo it back."""
        try:
            if not message or "content" not in message:
                return PluginResult.failure(message="Invalid message format: 'content' field is required")
            
            self.logger.info(f"Processing message: {message}")
            
            # Echo the message back
            response_data = {
                "content": f"Echo: {message.get('content', '')}",
                "timestamp": datetime.now().isoformat(),
            }
            
            return PluginResult.success_result(
                message="Message processed successfully",
                data=response_data
            )
            
        except Exception as e:
            self.logger.error(f"Error processing message: {str(e)}")
            return PluginResult.failure(
                message=f"Error processing message: {str(e)}",
                error=str(e)
            )
    
    async def shutdown(self) -> PluginResult:
        """Shutdown the agent."""
        try:
            self.logger.info("Shutting down echo agent")
            self.is_running = False
            return PluginResult.success_result(message="Echo agent shut down successfully")
        except Exception as e:
            self.logger.error(f"Error shutting down echo agent: {str(e)}")
            return PluginResult.failure(
                message=f"Failed to shut down Echo agent: {str(e)}",
                error=str(e)
            )
            
    async def execute(self, parameters: Dict[str, Any]) -> PluginResult:
        """Execute the plugin functionality.
        
        This is the main entry point for plugin execution required by BasePlugin.
        
        Args:
            parameters: Parameters for execution.
            
        Returns:
            Result of execution.
        """
        try:
            if "action" not in parameters:
                return PluginResult.failure(message="Missing required parameter: 'action'")
                
            action = parameters.get("action")
            
            if action == "process_message":
                if "message" not in parameters:
                    return PluginResult.failure(message="Missing required parameter: 'message'")
                message_param = parameters.get("message")
                if not isinstance(message_param, dict):
                    return PluginResult.failure(message="Message parameter must be a dictionary")
                return await self.process_message(message_param)
            elif action == "start":
                return await self.start()
            elif action == "stop":
                return await self.stop()
            elif action == "pause":
                return await self.pause()
            elif action == "resume":
                return await self.resume()
            elif action == "update":
                return await self.update()
            else:
                return PluginResult.failure(message=f"Unknown action: {action}")
        except Exception as e:
            self.logger.error(f"Error executing plugin: {str(e)}")
            return PluginResult.failure(
                message=f"Failed to execute Echo agent: {str(e)}",
                error=str(e)
            )
            
    async def cleanup(self) -> PluginResult:
        """Cleanup resources used by the plugin.
        
        Required by BasePlugin.
        
        Returns:
            PluginResult with success status and any cleanup information.
        """
        try:
            self.logger.info("Cleaning up echo agent resources")
            # No specific resources to clean up
            return PluginResult.success_result(message="Echo agent resources cleaned up successfully")
        except Exception as e:
            self.logger.error(f"Error cleaning up echo agent resources: {str(e)}")
            return PluginResult.failure(
                message=f"Failed to clean up Echo agent resources: {str(e)}",
                error=str(e)
            )