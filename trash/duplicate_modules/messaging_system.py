"""
Messaging System
Handles inter-agent communication and message logging.
"""

import logging
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
import json

from .plugin_types import PluginError

logger = logging.getLogger(__name__)

class MessageTopic(Enum):
    """Standard message topics"""
    HELP_REQUEST = "help_request"
    TASK_HANDOFF = "task_handoff"
    PLUGIN_SUGGESTION = "plugin_suggestion"
    STATUS_UPDATE = "status_update"
    RESOURCE_REQUEST = "resource_request"
    COORDINATION = "coordination"

@dataclass
class Message:
    """Structured message for agent communication"""
    id: str
    sender: str
    receiver: str
    topic: MessageTopic
    content: Dict[str, Any]
    timestamp: datetime
    priority: int = 0
    requires_response: bool = False
    response_to: Optional[str] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary format"""
        return {
            "id": self.id,
            "sender": self.sender,
            "receiver": self.receiver,
            "topic": self.topic.value,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "priority": self.priority,
            "requires_response": self.requires_response,
            "response_to": self.response_to,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Message':
        """Create message from dictionary"""
        return cls(
            id=data["id"],
            sender=data["sender"],
            receiver=data["receiver"],
            topic=MessageTopic(data["topic"]),
            content=data["content"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            priority=data.get("priority", 0),
            requires_response=data.get("requires_response", False),
            response_to=data.get("response_to"),
            metadata=data.get("metadata", {})
        )

class MessagingSystem:
    """Manages inter-agent communication and message logging"""
    
    def __init__(self, log_dir: Path = Path("data/agent_logs")):
        self.log_dir = log_dir
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self._message_log = log_dir / "message_log.jsonl"
        self._message_log.touch(exist_ok=True)
        
    def send_message(
        self,
        sender: str,
        receiver: str,
        topic: MessageTopic,
        content: Dict[str, Any],
        priority: int = 0,
        requires_response: bool = False,
        response_to: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Send a message between agents
        
        Args:
            sender: ID of sending agent
            receiver: ID of receiving agent
            topic: Message topic
            content: Message content
            priority: Message priority (higher = more important)
            requires_response: Whether message requires a response
            response_to: ID of message this is responding to
            metadata: Additional message metadata
            
        Returns:
            ID of created message
            
        Raises:
            PluginError: If message creation fails
        """
        try:
            # Create message
            message = Message(
                id=f"msg_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}",
                sender=sender,
                receiver=receiver,
                topic=topic,
                content=content,
                timestamp=datetime.now(),
                priority=priority,
                requires_response=requires_response,
                response_to=response_to,
                metadata=metadata or {}
            )
            
            # Log message
            self._log_message(message)
            
            logger.info(
                f"Message sent from {sender} to {receiver} "
                f"on topic {topic.value}"
            )
            
            return message.id
            
        except Exception as e:
            error_msg = f"Failed to send message: {str(e)}"
            logger.error(error_msg)
            raise PluginError(error_msg)
            
    def request_help(
        self,
        sender: str,
        receiver: str,
        task_id: str,
        issue: str,
        context: Dict[str, Any]
    ) -> str:
        """
        Send a help request message
        
        Args:
            sender: ID of requesting agent
            receiver: ID of agent to help
            task_id: ID of task needing help
            issue: Description of the issue
            context: Additional context about the issue
            
        Returns:
            ID of created message
        """
        return self.send_message(
            sender=sender,
            receiver=receiver,
            topic=MessageTopic.HELP_REQUEST,
            content={
                "task_id": task_id,
                "issue": issue,
                "context": context
            },
            priority=2,  # High priority for help requests
            requires_response=True
        )
        
    def handoff_task(
        self,
        sender: str,
        receiver: str,
        task_id: str,
        reason: str,
        progress: Dict[str, Any]
    ) -> str:
        """
        Send a task handoff message
        
        Args:
            sender: ID of current task owner
            receiver: ID of new task owner
            task_id: ID of task being handed off
            reason: Reason for handoff
            progress: Current task progress
            
        Returns:
            ID of created message
        """
        return self.send_message(
            sender=sender,
            receiver=receiver,
            topic=MessageTopic.TASK_HANDOFF,
            content={
                "task_id": task_id,
                "reason": reason,
                "progress": progress
            },
            priority=1,
            requires_response=True
        )
        
    def suggest_plugin(
        self,
        sender: str,
        receiver: str,
        task_id: str,
        plugin_id: str,
        reason: str,
        capabilities: List[str]
    ) -> str:
        """
        Send a plugin suggestion message
        
        Args:
            sender: ID of suggesting agent
            receiver: ID of receiving agent
            task_id: ID of relevant task
            plugin_id: ID of suggested plugin
            reason: Reason for suggestion
            capabilities: Plugin capabilities
            
        Returns:
            ID of created message
        """
        return self.send_message(
            sender=sender,
            receiver=receiver,
            topic=MessageTopic.PLUGIN_SUGGESTION,
            content={
                "task_id": task_id,
                "plugin_id": plugin_id,
                "reason": reason,
                "capabilities": capabilities
            },
            priority=1,
            requires_response=True
        )
        
    def get_messages(
        self,
        agent_id: str,
        topic: Optional[MessageTopic] = None,
        after: Optional[datetime] = None,
        limit: Optional[int] = None
    ) -> List[Message]:
        """
        Get messages for an agent
        
        Args:
            agent_id: ID of agent to get messages for
            topic: Optional topic filter
            after: Optional start time filter
            limit: Optional maximum number of messages
            
        Returns:
            List of matching messages
        """
        messages = []
        with open(self._message_log, 'r') as f:
            for line in f:
                try:
                    message = Message.from_dict(json.loads(line))
                    if message.receiver != agent_id:
                        continue
                    if topic and message.topic != topic:
                        continue
                    if after and message.timestamp < after:
                        continue
                    messages.append(message)
                except Exception as e:
                    logger.error(f"Error reading message: {str(e)}")
                    continue
                    
        # Sort by priority and timestamp
        messages.sort(key=lambda m: (-m.priority, m.timestamp))
        
        # Apply limit
        if limit:
            messages = messages[:limit]
            
        return messages
        
    def _log_message(self, message: Message) -> None:
        """Log a message to the message log file"""
        try:
            with open(self._message_log, 'a') as f:
                f.write(json.dumps(message.to_dict()) + '\n')
        except Exception as e:
            logger.error(f"Failed to log message: {str(e)}")
            raise PluginError(f"Failed to log message: {str(e)}") 