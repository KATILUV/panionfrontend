"""
Echo Agent Plugin
A simple echo agent that returns the input message.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from core.plugin.base import BasePlugin
from core.plugin.interfaces import IPlugin

class EchoAgent(BasePlugin, IPlugin):
    """A simple echo agent that returns the input message."""
    
    def __init__(self):
        """Initialize the echo agent."""
        super().__init__(
            name="EchoAgent",
            version="1.0.0",
            description="A simple echo agent that returns the input message",
            author="Panion Team"
        )
        self.logger = logging.getLogger("EchoAgent")
        self.name = "echo_agent"
        self.description = "A simple echo agent that returns the input message"
        self.is_running = False
        self.context = {}
    
    async def initialize(self) -> None:
        """Initialize the agent."""
        try:
            self.logger.info("Initializing echo agent")
            self.is_running = True
            self.logger.info("Echo agent initialized successfully")
        except Exception as e:
            self.logger.error(f"Error initializing echo agent: {str(e)}")
            raise
    
    async def start(self) -> None:
        """Start the agent."""
        self.logger.info("Starting echo agent")
        self.is_running = True
    
    async def stop(self) -> None:
        """Stop the agent."""
        self.logger.info("Stopping echo agent")
        self.is_running = False
    
    async def pause(self) -> None:
        """Pause the agent."""
        self.logger.info("Pausing echo agent")
        self.is_running = False
    
    async def resume(self) -> None:
        """Resume the agent."""
        self.logger.info("Resuming echo agent")
        self.is_running = True
    
    async def update(self) -> None:
        """Update the agent state."""
        if self.is_running:
            self.logger.debug("Echo agent is running")
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Get agent metrics."""
        return {
            'is_running': self.is_running,
            'last_update': datetime.now().isoformat()
        }
    
    def update_context(self, context: Dict[str, Any]) -> None:
        """Update the agent's context."""
        self.context = context
    
    async def process_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Process a message and echo it back."""
        try:
            if not message or "content" not in message:
                raise ValueError("Invalid message format")
            
            self.logger.info(f"Processing message: {message}")
            
            # Echo the message back
            return {
                "type": "response",
                "content": f"Echo: {message.get('content', '')}",
                "timestamp": datetime.now().isoformat(),
                "status": "success"
            }
            
        except Exception as e:
            self.logger.error(f"Error processing message: {str(e)}")
            return {
                "type": "error",
                "content": f"Error processing message: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "status": "error"
            }
    
    async def shutdown(self) -> None:
        """Shutdown the agent."""
        try:
            self.logger.info("Shutting down echo agent")
            self.is_running = False
        except Exception as e:
            self.logger.error(f"Error shutting down echo agent: {str(e)}")
            raise 