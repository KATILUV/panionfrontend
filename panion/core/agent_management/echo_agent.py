"""
Echo Agent
A simple agent that echoes back messages.
"""

import logging
from typing import Dict, Any
from datetime import datetime

class EchoAgent:
    """A simple agent that echoes back messages."""
    
    def __init__(self):
        """Initialize the echo agent."""
        self.logger = logging.getLogger("EchoAgent")
        self.name = "echo_agent"
        self.state = "INITIALIZING"
        self.start_time = datetime.now()
        self.messages_processed = 0
        
    async def start(self) -> None:
        """Start the echo agent."""
        try:
            self.logger.info("Starting echo agent")
            self.state = "RUNNING"
            self.logger.info("Echo agent started successfully")
        except Exception as e:
            self.state = "ERROR"
            self.logger.error(f"Error starting echo agent: {str(e)}")
            raise
    
    async def stop(self) -> None:
        """Stop the echo agent."""
        try:
            self.logger.info("Stopping echo agent")
            self.state = "STOPPED"
            self.logger.info("Echo agent stopped successfully")
        except Exception as e:
            self.state = "ERROR"
            self.logger.error(f"Error stopping echo agent: {str(e)}")
            raise
    
    async def process_message(self, msg: Dict[str, Any]) -> Dict[str, Any]:
        """Process a message and generate a response.
        
        Args:
            msg: The message to process
            
        Returns:
            The response message
        """
        try:
            self.messages_processed += 1
            
            # Get message content
            content = msg.get("content", "")
            
            # Generate response
            response = {
                "id": msg.get("id", ""),
                "type": "response",
                "content": f"I heard you say: {content}",
                "timestamp": datetime.now().isoformat(),
                "status": "success"
            }
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error processing message: {str(e)}")
            return {
                "id": msg.get("id", ""),
                "type": "error",
                "content": f"Error processing message: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "status": "error"
            }
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get agent metrics."""
        return {
            "name": self.name,
            "state": self.state,
            "uptime": (datetime.now() - self.start_time).total_seconds(),
            "messages_processed": self.messages_processed
        } 