"""
Agent Collaboration System
Provides mechanisms for agents to communicate, collaborate and share knowledge.
"""

import os
import json
import logging
import uuid
import time
import threading
from typing import List, Dict, Any, Optional, Union, Callable, Set
from datetime import datetime
from enum import Enum
from collections import deque

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CollaborationMessageType(Enum):
    """Types of messages exchanged between agents."""
    TASK_REQUEST = "task_request"              # Request for another agent to perform a task
    TASK_RESPONSE = "task_response"            # Response to a task request
    KNOWLEDGE_SHARE = "knowledge_share"        # Sharing of knowledge/information
    KNOWLEDGE_REQUEST = "knowledge_request"    # Request for knowledge/information
    STATUS_UPDATE = "status_update"            # Update on agent status or progress
    COORDINATION = "coordination"              # Coordination of multi-agent activities
    ALERT = "alert"                            # Important alert that requires attention
    FEEDBACK = "feedback"                      # Feedback on another agent's performance

class CollaborationPriority(Enum):
    """Priority levels for collaboration messages."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class CollaborationMessage:
    """Message exchanged between agents in the collaboration system."""
    
    def __init__(self, 
                message_id: str,
                message_type: CollaborationMessageType,
                sender_id: str,
                receiver_id: str,
                content: Dict[str, Any],
                priority: CollaborationPriority = CollaborationPriority.MEDIUM,
                reference_id: Optional[str] = None,
                expires_at: Optional[datetime] = None):
        """
        Initialize a collaboration message.
        
        Args:
            message_id: Unique identifier for the message
            message_type: Type of message
            sender_id: ID of the sending agent
            receiver_id: ID of the receiving agent
            content: Message content and payload
            priority: Message priority level
            reference_id: ID of a message this is in response to
            expires_at: When this message expires/is no longer relevant
        """
        self.message_id = message_id
        self.message_type = message_type
        self.sender_id = sender_id
        self.receiver_id = receiver_id
        self.content = content
        self.priority = priority
        self.reference_id = reference_id
        self.expires_at = expires_at
        
        self.created_at = datetime.now()
        self.delivered = False
        self.delivered_at = None
        self.read = False
        self.read_at = None
        self.processed = False
        self.processed_at = None
        self.response_ids = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "message_id": self.message_id,
            "message_type": self.message_type.value,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "content": self.content,
            "priority": self.priority.value,
            "reference_id": self.reference_id,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat(),
            "delivered": self.delivered,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
            "read": self.read,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "processed": self.processed,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
            "response_ids": self.response_ids
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CollaborationMessage':
        """Create a CollaborationMessage instance from a dictionary."""
        message = cls(
            message_id=data["message_id"],
            message_type=CollaborationMessageType(data["message_type"]),
            sender_id=data["sender_id"],
            receiver_id=data["receiver_id"],
            content=data["content"],
            priority=CollaborationPriority(data["priority"]),
            reference_id=data.get("reference_id"),
            expires_at=datetime.fromisoformat(data["expires_at"]) if data.get("expires_at") else None
        )
        
        message.created_at = datetime.fromisoformat(data["created_at"])
        message.delivered = data.get("delivered", False)
        message.delivered_at = datetime.fromisoformat(data["delivered_at"]) if data.get("delivered_at") else None
        message.read = data.get("read", False)
        message.read_at = datetime.fromisoformat(data["read_at"]) if data.get("read_at") else None
        message.processed = data.get("processed", False)
        message.processed_at = datetime.fromisoformat(data["processed_at"]) if data.get("processed_at") else None
        message.response_ids = data.get("response_ids", [])
        
        return message
    
    def mark_delivered(self):
        """Mark the message as delivered."""
        self.delivered = True
        self.delivered_at = datetime.now()
    
    def mark_read(self):
        """Mark the message as read."""
        self.read = True
        self.read_at = datetime.now()
        
        if not self.delivered:
            self.mark_delivered()
    
    def mark_processed(self):
        """Mark the message as processed."""
        self.processed = True
        self.processed_at = datetime.now()
        
        if not self.read:
            self.mark_read()
    
    def add_response(self, response_id: str):
        """Add a response message ID to this message."""
        if response_id not in self.response_ids:
            self.response_ids.append(response_id)
    
    def is_expired(self) -> bool:
        """Check if the message has expired."""
        if not self.expires_at:
            return False
            
        return datetime.now() > self.expires_at

class KnowledgeItem:
    """A piece of knowledge in the shared knowledge base."""
    
    def __init__(self, 
                item_id: str,
                content: Dict[str, Any],
                source_agent_id: str,
                category: str,
                confidence: float = 1.0,
                tags: List[str] = None,
                expires_at: Optional[datetime] = None):
        """
        Initialize a knowledge item.
        
        Args:
            item_id: Unique identifier for the item
            content: The knowledge content
            source_agent_id: ID of the agent that provided this knowledge
            category: Category of the knowledge
            confidence: Confidence score (0.0-1.0)
            tags: List of tags for categorization
            expires_at: When this knowledge expires
        """
        self.item_id = item_id
        self.content = content
        self.source_agent_id = source_agent_id
        self.category = category
        self.confidence = confidence
        self.tags = tags or []
        self.expires_at = expires_at
        
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.access_count = 0
        self.last_accessed = None
        self.dependents = []  # IDs of knowledge items that depend on this one
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "item_id": self.item_id,
            "content": self.content,
            "source_agent_id": self.source_agent_id,
            "category": self.category,
            "confidence": self.confidence,
            "tags": self.tags,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "access_count": self.access_count,
            "last_accessed": self.last_accessed.isoformat() if self.last_accessed else None,
            "dependents": self.dependents
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'KnowledgeItem':
        """Create a KnowledgeItem instance from a dictionary."""
        item = cls(
            item_id=data["item_id"],
            content=data["content"],
            source_agent_id=data["source_agent_id"],
            category=data["category"],
            confidence=data["confidence"],
            tags=data.get("tags", []),
            expires_at=datetime.fromisoformat(data["expires_at"]) if data.get("expires_at") else None
        )
        
        item.created_at = datetime.fromisoformat(data["created_at"])
        item.updated_at = datetime.fromisoformat(data["updated_at"])
        item.access_count = data.get("access_count", 0)
        item.last_accessed = datetime.fromisoformat(data["last_accessed"]) if data.get("last_accessed") else None
        item.dependents = data.get("dependents", [])
        
        return item
    
    def access(self):
        """Record that this knowledge item was accessed."""
        self.access_count += 1
        self.last_accessed = datetime.now()
    
    def update_content(self, content: Dict[str, Any], confidence: float = None):
        """Update the knowledge content."""
        self.content = content
        if confidence is not None:
            self.confidence = confidence
        self.updated_at = datetime.now()
    
    def add_dependent(self, dependent_id: str):
        """Add a dependent knowledge item."""
        if dependent_id not in self.dependents:
            self.dependents.append(dependent_id)
    
    def is_expired(self) -> bool:
        """Check if the knowledge has expired."""
        if not self.expires_at:
            return False
            
        return datetime.now() > self.expires_at

class AgentCollaborationSystem:
    """System for managing agent collaboration and knowledge sharing."""
    
    def __init__(self):
        """Initialize the agent collaboration system."""
        self.data_dir = "./data/collaboration"
        self.messages_file = os.path.join(self.data_dir, "messages.json")
        self.knowledge_file = os.path.join(self.data_dir, "knowledge.json")
        
        # Create directories if they don't exist
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Message queues for each agent
        self.message_queues = {}  # agent_id -> deque of message_ids
        
        # Messages and knowledge
        self.messages = {}  # message_id -> CollaborationMessage
        self.knowledge_base = {}  # item_id -> KnowledgeItem
        
        # Registered agents and their capabilities
        self.agents = {}  # agent_id -> agent_info
        
        # Message handlers registered by agents
        self.message_handlers = {}  # agent_id -> {message_type -> handler_function}
        
        # Load data
        self.load_data()
        
        # Start background threads
        self.running = True
        self.cleanup_thread = threading.Thread(target=self._cleanup_expired_items)
        self.cleanup_thread.daemon = True
        self.cleanup_thread.start()
    
    def load_data(self):
        """Load messages and knowledge from disk."""
        # Load messages
        if os.path.exists(self.messages_file):
            try:
                with open(self.messages_file, 'r') as f:
                    messages_data = json.load(f)
                
                for message_data in messages_data:
                    message = CollaborationMessage.from_dict(message_data)
                    self.messages[message.message_id] = message
                    
                    # Initialize message queue for receiver if needed
                    if message.receiver_id not in self.message_queues:
                        self.message_queues[message.receiver_id] = deque()
                    
                    # Add unprocessed messages to the queue
                    if not message.processed and not message.is_expired():
                        self.message_queues[message.receiver_id].append(message.message_id)
                
                logger.info(f"Loaded {len(self.messages)} messages")
            except Exception as e:
                logger.error(f"Error loading messages: {str(e)}")
        
        # Load knowledge base
        if os.path.exists(self.knowledge_file):
            try:
                with open(self.knowledge_file, 'r') as f:
                    knowledge_data = json.load(f)
                
                for item_data in knowledge_data:
                    item = KnowledgeItem.from_dict(item_data)
                    if not item.is_expired():
                        self.knowledge_base[item.item_id] = item
                
                logger.info(f"Loaded {len(self.knowledge_base)} knowledge items")
            except Exception as e:
                logger.error(f"Error loading knowledge base: {str(e)}")
    
    def save_data(self):
        """Save messages and knowledge to disk."""
        # Save messages
        try:
            messages_data = [message.to_dict() for message in self.messages.values()]
            with open(self.messages_file, 'w') as f:
                json.dump(messages_data, f, indent=2)
            
            logger.info(f"Saved {len(self.messages)} messages")
        except Exception as e:
            logger.error(f"Error saving messages: {str(e)}")
        
        # Save knowledge base
        try:
            knowledge_data = [item.to_dict() for item in self.knowledge_base.values()]
            with open(self.knowledge_file, 'w') as f:
                json.dump(knowledge_data, f, indent=2)
            
            logger.info(f"Saved {len(self.knowledge_base)} knowledge items")
        except Exception as e:
            logger.error(f"Error saving knowledge base: {str(e)}")
    
    def register_agent(self, agent_id: str, agent_name: str, 
                      capabilities: List[str], 
                      message_handler: Optional[Callable] = None) -> bool:
        """
        Register an agent with the collaboration system.
        
        Args:
            agent_id: Unique ID for the agent
            agent_name: Name of the agent
            capabilities: List of capabilities provided by the agent
            message_handler: Optional function to handle incoming messages
            
        Returns:
            True if registration was successful, False otherwise
        """
        # Check if agent is already registered
        if agent_id in self.agents:
            logger.warning(f"Agent {agent_id} is already registered")
            return False
        
        # Register the agent
        self.agents[agent_id] = {
            "agent_id": agent_id,
            "name": agent_name,
            "capabilities": capabilities,
            "registered_at": datetime.now().isoformat(),
            "last_active": datetime.now().isoformat()
        }
        
        # Initialize message queue
        self.message_queues[agent_id] = deque()
        
        # Register message handler if provided
        if message_handler:
            self.register_message_handler(agent_id, None, message_handler)
        
        logger.info(f"Registered agent {agent_name} (ID: {agent_id})")
        return True
    
    def register_message_handler(self, agent_id: str, 
                                message_type: Optional[CollaborationMessageType],
                                handler: Callable):
        """
        Register a message handler for an agent.
        
        Args:
            agent_id: ID of the agent
            message_type: Specific message type to handle, or None for all types
            handler: Function to call when a message is received
        """
        if agent_id not in self.message_handlers:
            self.message_handlers[agent_id] = {}
        
        if message_type:
            self.message_handlers[agent_id][message_type] = handler
        else:
            self.message_handlers[agent_id]["__default__"] = handler
    
    def unregister_agent(self, agent_id: str) -> bool:
        """
        Unregister an agent from the collaboration system.
        
        Args:
            agent_id: ID of the agent to unregister
            
        Returns:
            True if unregistration was successful, False otherwise
        """
        if agent_id not in self.agents:
            logger.warning(f"Agent {agent_id} is not registered")
            return False
        
        # Remove agent
        agent_name = self.agents[agent_id]["name"]
        del self.agents[agent_id]
        
        # Clean up message queue
        if agent_id in self.message_queues:
            del self.message_queues[agent_id]
        
        # Clean up message handlers
        if agent_id in self.message_handlers:
            del self.message_handlers[agent_id]
        
        logger.info(f"Unregistered agent {agent_name} (ID: {agent_id})")
        return True
    
    def send_message(self, sender_id: str, receiver_id: str, 
                    message_type: Union[CollaborationMessageType, str],
                    content: Dict[str, Any],
                    priority: Union[CollaborationPriority, str] = CollaborationPriority.MEDIUM,
                    reference_id: Optional[str] = None,
                    expires_at: Optional[datetime] = None) -> str:
        """
        Send a message from one agent to another.
        
        Args:
            sender_id: ID of the sending agent
            receiver_id: ID of the receiving agent
            message_type: Type of message
            content: Message content
            priority: Message priority
            reference_id: ID of a message this is in response to
            expires_at: When this message expires
            
        Returns:
            ID of the created message
        """
        # Validate sender and receiver
        if sender_id not in self.agents:
            raise ValueError(f"Sender agent {sender_id} is not registered")
        
        if receiver_id not in self.agents:
            raise ValueError(f"Receiver agent {receiver_id} is not registered")
        
        # Convert string enums to enum values if needed
        if isinstance(message_type, str):
            message_type = CollaborationMessageType(message_type)
        
        if isinstance(priority, str):
            priority = CollaborationPriority(priority)
        
        # Create message ID
        message_id = str(uuid.uuid4())
        
        # Create the message
        message = CollaborationMessage(
            message_id=message_id,
            message_type=message_type,
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content,
            priority=priority,
            reference_id=reference_id,
            expires_at=expires_at
        )
        
        # Add to messages dictionary
        self.messages[message_id] = message
        
        # Add to receiver's message queue
        if receiver_id not in self.message_queues:
            self.message_queues[receiver_id] = deque()
        self.message_queues[receiver_id].append(message_id)
        
        # Update reference message if provided
        if reference_id and reference_id in self.messages:
            self.messages[reference_id].add_response(message_id)
        
        # Update agent's last active timestamp
        if sender_id in self.agents:
            self.agents[sender_id]["last_active"] = datetime.now().isoformat()
        
        # Try to deliver immediately if there's a registered handler
        self._try_deliver_message(message_id)
        
        # Save data
        self.save_data()
        
        logger.info(f"Message sent: {sender_id} -> {receiver_id}, type: {message_type.value}")
        return message_id
    
    def _try_deliver_message(self, message_id: str) -> bool:
        """
        Try to deliver a message to its recipient.
        
        Args:
            message_id: ID of the message to deliver
            
        Returns:
            True if the message was delivered, False otherwise
        """
        if message_id not in self.messages:
            return False
        
        message = self.messages[message_id]
        
        # Skip if already processed or expired
        if message.processed or message.is_expired():
            return False
        
        # Mark as delivered
        message.mark_delivered()
        
        # Check if there's a handler for this agent and message type
        receiver_id = message.receiver_id
        message_type = message.message_type
        
        if receiver_id in self.message_handlers:
            handlers = self.message_handlers[receiver_id]
            
            # Try type-specific handler first
            if message_type in handlers:
                try:
                    handlers[message_type](message)
                    message.mark_processed()
                    return True
                except Exception as e:
                    logger.error(f"Error in message handler: {str(e)}")
            
            # Try default handler
            elif "__default__" in handlers:
                try:
                    handlers["__default__"](message)
                    message.mark_processed()
                    return True
                except Exception as e:
                    logger.error(f"Error in default message handler: {str(e)}")
        
        return False
    
    def get_agent_messages(self, agent_id: str, processed: bool = False, 
                         limit: int = None) -> List[Dict[str, Any]]:
        """
        Get messages for an agent.
        
        Args:
            agent_id: ID of the agent
            processed: Whether to include processed messages
            limit: Maximum number of messages to return
            
        Returns:
            List of message dictionaries
        """
        if agent_id not in self.agents:
            raise ValueError(f"Agent {agent_id} is not registered")
        
        messages = []
        
        # First, get unprocessed messages from the queue
        unprocessed_count = 0
        queue = self.message_queues.get(agent_id, deque())
        
        for message_id in list(queue):
            if message_id in self.messages:
                message = self.messages[message_id]
                
                # Skip expired messages
                if message.is_expired():
                    queue.remove(message_id)
                    continue
                
                # Include unprocessed messages
                if not message.processed:
                    messages.append(message.to_dict())
                    unprocessed_count += 1
                    
                    # Mark as read (but not processed)
                    if not message.read:
                        message.mark_read()
        
        # If we want processed messages too, or didn't reach the limit,
        # scan all messages for those sent to or from this agent
        if processed or (limit and unprocessed_count < limit):
            for message in self.messages.values():
                # Skip messages already added and expired messages
                if message.message_id in [m["message_id"] for m in messages] or message.is_expired():
                    continue
                
                # Include messages to/from this agent
                if (message.receiver_id == agent_id or message.sender_id == agent_id) and \
                   (processed or not message.processed):
                    messages.append(message.to_dict())
        
        # Sort by priority and creation time
        messages.sort(key=lambda m: (
            CollaborationPriority(m["priority"]).value,
            m["created_at"]
        ), reverse=True)
        
        # Apply limit if specified
        if limit:
            messages = messages[:limit]
        
        return messages
    
    def process_message(self, message_id: str, response_content: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """
        Mark a message as processed and optionally send a response.
        
        Args:
            message_id: ID of the message to process
            response_content: Optional content for a response message
            
        Returns:
            ID of the response message if one was created, None otherwise
        """
        if message_id not in self.messages:
            raise ValueError(f"Message {message_id} not found")
        
        message = self.messages[message_id]
        
        # Mark the message as processed
        message.mark_processed()
        
        # Remove from queue if present
        receiver_id = message.receiver_id
        if receiver_id in self.message_queues and message_id in self.message_queues[receiver_id]:
            self.message_queues[receiver_id].remove(message_id)
        
        # Send response if content provided
        response_id = None
        if response_content:
            response_id = self.send_message(
                sender_id=message.receiver_id,
                receiver_id=message.sender_id,
                message_type=CollaborationMessageType.TASK_RESPONSE 
                    if message.message_type == CollaborationMessageType.TASK_REQUEST
                    else CollaborationMessageType.KNOWLEDGE_SHARE,
                content=response_content,
                priority=message.priority,
                reference_id=message_id
            )
        
        # Update agent's last active timestamp
        if receiver_id in self.agents:
            self.agents[receiver_id]["last_active"] = datetime.now().isoformat()
        
        # Save data
        self.save_data()
        
        return response_id
    
    def add_knowledge(self, agent_id: str, content: Dict[str, Any], 
                     category: str, confidence: float = 1.0,
                     tags: List[str] = None, 
                     expires_at: Optional[datetime] = None) -> str:
        """
        Add an item to the knowledge base.
        
        Args:
            agent_id: ID of the agent providing the knowledge
            content: Knowledge content
            category: Knowledge category
            confidence: Confidence score (0.0-1.0)
            tags: List of tags for categorization
            expires_at: When this knowledge expires
            
        Returns:
            ID of the created knowledge item
        """
        if agent_id not in self.agents:
            raise ValueError(f"Agent {agent_id} is not registered")
        
        # Create knowledge ID
        item_id = str(uuid.uuid4())
        
        # Create the knowledge item
        item = KnowledgeItem(
            item_id=item_id,
            content=content,
            source_agent_id=agent_id,
            category=category,
            confidence=confidence,
            tags=tags,
            expires_at=expires_at
        )
        
        # Add to knowledge base
        self.knowledge_base[item_id] = item
        
        # Update agent's last active timestamp
        self.agents[agent_id]["last_active"] = datetime.now().isoformat()
        
        # Save data
        self.save_data()
        
        logger.info(f"Knowledge added: agent {agent_id}, category: {category}, id: {item_id}")
        return item_id
    
    def get_knowledge(self, item_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a knowledge item by ID.
        
        Args:
            item_id: ID of the knowledge item
            
        Returns:
            Knowledge item dictionary, or None if not found
        """
        if item_id not in self.knowledge_base:
            return None
        
        item = self.knowledge_base[item_id]
        
        # Skip if expired
        if item.is_expired():
            return None
        
        # Record access
        item.access()
        
        # Save data
        self.save_data()
        
        return item.to_dict()
    
    def search_knowledge(self, query: str = None, category: str = None, 
                        tags: List[str] = None, 
                        min_confidence: float = 0.0) -> List[Dict[str, Any]]:
        """
        Search the knowledge base.
        
        Args:
            query: Search query
            category: Filter by category
            tags: Filter by tags
            min_confidence: Minimum confidence score
            
        Returns:
            List of knowledge item dictionaries
        """
        results = []
        
        for item in self.knowledge_base.values():
            # Skip expired items
            if item.is_expired():
                continue
            
            # Skip low confidence items
            if item.confidence < min_confidence:
                continue
            
            # Filter by category
            if category and item.category != category:
                continue
            
            # Filter by tags (all specified tags must be present)
            if tags and not all(tag in item.tags for tag in tags):
                continue
            
            # Filter by query
            if query:
                # Simple text search in content values
                content_values = str(item.content).lower()
                if query.lower() not in content_values:
                    continue
            
            # Item matches all criteria
            results.append(item.to_dict())
        
        # Sort by confidence (descending) and access count (descending)
        results.sort(key=lambda i: (i["confidence"], i["access_count"]), reverse=True)
        
        return results
    
    def update_knowledge(self, item_id: str, content: Dict[str, Any], 
                        confidence: float = None) -> bool:
        """
        Update a knowledge item.
        
        Args:
            item_id: ID of the knowledge item
            content: Updated content
            confidence: Updated confidence score
            
        Returns:
            True if update was successful, False otherwise
        """
        if item_id not in self.knowledge_base:
            return False
        
        # Update the item
        self.knowledge_base[item_id].update_content(content, confidence)
        
        # Save data
        self.save_data()
        
        logger.info(f"Knowledge updated: id: {item_id}")
        return True
    
    def delete_knowledge(self, item_id: str) -> bool:
        """
        Delete a knowledge item.
        
        Args:
            item_id: ID of the knowledge item
            
        Returns:
            True if deletion was successful, False otherwise
        """
        if item_id not in self.knowledge_base:
            return False
        
        # Remove the item
        del self.knowledge_base[item_id]
        
        # Save data
        self.save_data()
        
        logger.info(f"Knowledge deleted: id: {item_id}")
        return True
    
    def find_agents_with_capability(self, capability: str) -> List[Dict[str, Any]]:
        """
        Find agents that have a specific capability.
        
        Args:
            capability: Capability to search for
            
        Returns:
            List of agent dictionaries
        """
        matching_agents = []
        
        for agent_id, agent_info in self.agents.items():
            if capability in agent_info.get("capabilities", []):
                matching_agents.append(agent_info)
        
        return matching_agents
    
    def _cleanup_expired_items(self):
        """Background thread to clean up expired messages and knowledge items."""
        while self.running:
            try:
                # Check every minute
                time.sleep(60)
                
                # Clean up expired messages
                expired_messages = []
                for message_id, message in self.messages.items():
                    if message.is_expired():
                        expired_messages.append(message_id)
                
                # Remove expired messages from queues and dictionary
                for message_id in expired_messages:
                    message = self.messages[message_id]
                    receiver_id = message.receiver_id
                    
                    if receiver_id in self.message_queues and message_id in self.message_queues[receiver_id]:
                        self.message_queues[receiver_id].remove(message_id)
                    
                    del self.messages[message_id]
                
                if expired_messages:
                    logger.info(f"Cleaned up {len(expired_messages)} expired messages")
                
                # Clean up expired knowledge items
                expired_items = []
                for item_id, item in self.knowledge_base.items():
                    if item.is_expired():
                        expired_items.append(item_id)
                
                # Remove expired knowledge items
                for item_id in expired_items:
                    del self.knowledge_base[item_id]
                
                if expired_items:
                    logger.info(f"Cleaned up {len(expired_items)} expired knowledge items")
                
                # Save data if anything was cleaned up
                if expired_messages or expired_items:
                    self.save_data()
                    
            except Exception as e:
                logger.error(f"Error in cleanup thread: {str(e)}")
    
    def shutdown(self):
        """Shutdown the collaboration system."""
        logger.info("Shutting down agent collaboration system")
        
        # Stop background thread
        self.running = False
        if self.cleanup_thread and self.cleanup_thread.is_alive():
            self.cleanup_thread.join(timeout=5)
        
        # Save final state
        self.save_data()

# Example task request function that agents can use
def request_task(collaboration_system: AgentCollaborationSystem, 
                sender_id: str, receiver_id: str,
                task_type: str, task_data: Dict[str, Any],
                priority: CollaborationPriority = CollaborationPriority.MEDIUM,
                deadline: Optional[datetime] = None) -> str:
    """
    Request another agent to perform a task.
    
    Args:
        collaboration_system: The collaboration system instance
        sender_id: ID of the requesting agent
        receiver_id: ID of the agent to perform the task
        task_type: Type of task
        task_data: Task data and parameters
        priority: Task priority
        deadline: When the task must be completed by
        
    Returns:
        ID of the message
    """
    content = {
        "task_type": task_type,
        "task_data": task_data,
        "deadline": deadline.isoformat() if deadline else None
    }
    
    return collaboration_system.send_message(
        sender_id=sender_id,
        receiver_id=receiver_id,
        message_type=CollaborationMessageType.TASK_REQUEST,
        content=content,
        priority=priority,
        expires_at=deadline
    )

# Helper function to share knowledge
def share_knowledge(collaboration_system: AgentCollaborationSystem,
                   agent_id: str, knowledge_content: Dict[str, Any],
                   category: str, receivers: List[str] = None,
                   confidence: float = 1.0, tags: List[str] = None,
                   expires_at: Optional[datetime] = None) -> Dict[str, str]:
    """
    Share knowledge with other agents.
    
    Args:
        collaboration_system: The collaboration system instance
        agent_id: ID of the agent sharing the knowledge
        knowledge_content: The knowledge content
        category: Knowledge category
        receivers: List of agent IDs to share with, or None for all agents
        confidence: Confidence score (0.0-1.0)
        tags: List of tags for categorization
        expires_at: When this knowledge expires
        
    Returns:
        Dictionary mapping receiver IDs to message IDs
    """
    # Add to knowledge base
    item_id = collaboration_system.add_knowledge(
        agent_id=agent_id,
        content=knowledge_content,
        category=category,
        confidence=confidence,
        tags=tags,
        expires_at=expires_at
    )
    
    # Determine recipients
    if receivers is None:
        # Share with all other agents
        receivers = [a_id for a_id in collaboration_system.agents.keys() if a_id != agent_id]
    
    # Send knowledge share message to each recipient
    message_ids = {}
    for receiver_id in receivers:
        message_id = collaboration_system.send_message(
            sender_id=agent_id,
            receiver_id=receiver_id,
            message_type=CollaborationMessageType.KNOWLEDGE_SHARE,
            content={
                "knowledge_item_id": item_id,
                "category": category,
                "summary": str(knowledge_content)[:100] + ("..." if len(str(knowledge_content)) > 100 else ""),
                "tags": tags
            }
        )
        message_ids[receiver_id] = message_id
    
    return message_ids

class AgentTeamCoordinator:
    """Coordinates collaboration between multiple agents on a team."""
    
    def __init__(self, collaboration_system: AgentCollaborationSystem):
        """
        Initialize the team coordinator.
        
        Args:
            collaboration_system: The collaboration system to use
        """
        self.collaboration_system = collaboration_system
        self.teams = {}  # team_id -> team_info
        self.team_assignments = {}  # agent_id -> list of team_ids
    
    def create_team(self, team_id: str, name: str, description: str = "",
                   coordinator_id: Optional[str] = None) -> bool:
        """
        Create a new team.
        
        Args:
            team_id: Unique ID for the team
            name: Team name
            description: Team description
            coordinator_id: ID of the coordinating agent
            
        Returns:
            True if team creation was successful
        """
        if team_id in self.teams:
            return False
        
        # Create team
        self.teams[team_id] = {
            "team_id": team_id,
            "name": name,
            "description": description,
            "created_at": datetime.now().isoformat(),
            "coordinator_id": coordinator_id,
            "members": [],
            "active_tasks": []
        }
        
        return True
    
    def add_team_member(self, team_id: str, agent_id: str, role: str = "member") -> bool:
        """
        Add an agent to a team.
        
        Args:
            team_id: Team ID
            agent_id: Agent ID
            role: Agent's role in the team
            
        Returns:
            True if agent was added successfully
        """
        if team_id not in self.teams:
            return False
        
        if agent_id not in self.collaboration_system.agents:
            return False
        
        # Check if agent is already in team
        if any(m["agent_id"] == agent_id for m in self.teams[team_id]["members"]):
            return False
        
        # Add agent to team
        self.teams[team_id]["members"].append({
            "agent_id": agent_id,
            "role": role,
            "joined_at": datetime.now().isoformat()
        })
        
        # Add team to agent's assignments
        if agent_id not in self.team_assignments:
            self.team_assignments[agent_id] = []
        
        if team_id not in self.team_assignments[agent_id]:
            self.team_assignments[agent_id].append(team_id)
        
        return True
    
    def remove_team_member(self, team_id: str, agent_id: str) -> bool:
        """
        Remove an agent from a team.
        
        Args:
            team_id: Team ID
            agent_id: Agent ID
            
        Returns:
            True if agent was removed successfully
        """
        if team_id not in self.teams:
            return False
        
        # Find and remove the agent
        team = self.teams[team_id]
        for i, member in enumerate(team["members"]):
            if member["agent_id"] == agent_id:
                team["members"].pop(i)
                
                # Remove team from agent's assignments
                if agent_id in self.team_assignments and team_id in self.team_assignments[agent_id]:
                    self.team_assignments[agent_id].remove(team_id)
                
                return True
        
        return False
    
    def get_agent_teams(self, agent_id: str) -> List[Dict[str, Any]]:
        """
        Get all teams an agent is a member of.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            List of team dictionaries
        """
        team_ids = self.team_assignments.get(agent_id, [])
        return [self.teams[team_id] for team_id in team_ids if team_id in self.teams]
    
    def broadcast_to_team(self, team_id: str, sender_id: str, 
                         message_type: CollaborationMessageType,
                         content: Dict[str, Any],
                         priority: CollaborationPriority = CollaborationPriority.MEDIUM,
                         exclude_agents: List[str] = None) -> Dict[str, str]:
        """
        Broadcast a message to all members of a team.
        
        Args:
            team_id: Team ID
            sender_id: ID of the sending agent
            message_type: Type of message
            content: Message content
            priority: Message priority
            exclude_agents: List of agent IDs to exclude
            
        Returns:
            Dictionary mapping receiver IDs to message IDs
        """
        if team_id not in self.teams:
            raise ValueError(f"Team {team_id} not found")
        
        team = self.teams[team_id]
        exclude_agents = exclude_agents or []
        
        # Send message to each team member
        message_ids = {}
        for member in team["members"]:
            agent_id = member["agent_id"]
            
            # Skip excluded agents and the sender
            if agent_id == sender_id or agent_id in exclude_agents:
                continue
            
            # Send the message
            message_id = self.collaboration_system.send_message(
                sender_id=sender_id,
                receiver_id=agent_id,
                message_type=message_type,
                content=content,
                priority=priority
            )
            
            message_ids[agent_id] = message_id
        
        return message_ids
    
    def assign_team_task(self, team_id: str, coordinator_id: str,
                        task_type: str, task_data: Dict[str, Any],
                        assignments: Dict[str, Dict[str, Any]],
                        priority: CollaborationPriority = CollaborationPriority.MEDIUM,
                        deadline: Optional[datetime] = None) -> Dict[str, str]:
        """
        Assign a task to multiple members of a team.
        
        Args:
            team_id: Team ID
            coordinator_id: ID of the coordinating agent
            task_type: Type of task
            task_data: Common task data
            assignments: Dictionary mapping agent IDs to their specific subtask data
            priority: Task priority
            deadline: When the task must be completed by
            
        Returns:
            Dictionary mapping agent IDs to message IDs
        """
        if team_id not in self.teams:
            raise ValueError(f"Team {team_id} not found")
        
        team = self.teams[team_id]
        
        # Generate a task ID for tracking
        task_id = str(uuid.uuid4())
        
        # Add task to team's active tasks
        team["active_tasks"].append({
            "task_id": task_id,
            "task_type": task_type,
            "coordinator_id": coordinator_id,
            "assigned_at": datetime.now().isoformat(),
            "deadline": deadline.isoformat() if deadline else None,
            "assignments": list(assignments.keys()),
            "status": "assigned"
        })
        
        # Send task request to each assigned agent
        message_ids = {}
        for agent_id, subtask_data in assignments.items():
            # Skip agents not in the team
            if not any(m["agent_id"] == agent_id for m in team["members"]):
                continue
            
            # Combine common task data with agent-specific data
            full_task_data = {
                "task_id": task_id,
                "team_id": team_id,
                "common": task_data,
                "specific": subtask_data
            }
            
            # Send the task request
            message_id = request_task(
                collaboration_system=self.collaboration_system,
                sender_id=coordinator_id,
                receiver_id=agent_id,
                task_type=task_type,
                task_data=full_task_data,
                priority=priority,
                deadline=deadline
            )
            
            message_ids[agent_id] = message_id
        
        return message_ids
    
    def update_task_status(self, team_id: str, task_id: str, status: str) -> bool:
        """
        Update the status of a team task.
        
        Args:
            team_id: Team ID
            task_id: Task ID
            status: New status
            
        Returns:
            True if update was successful
        """
        if team_id not in self.teams:
            return False
        
        team = self.teams[team_id]
        
        # Find and update the task
        for task in team["active_tasks"]:
            if task["task_id"] == task_id:
                task["status"] = status
                task["updated_at"] = datetime.now().isoformat()
                
                # If completed or cancelled, send notifications to team
                if status in ["completed", "cancelled"] and "coordinator_id" in task:
                    coordinator_id = task["coordinator_id"]
                    
                    if coordinator_id:
                        # Broadcast status update to team
                        self.broadcast_to_team(
                            team_id=team_id,
                            sender_id=coordinator_id,
                            message_type=CollaborationMessageType.STATUS_UPDATE,
                            content={
                                "task_id": task_id,
                                "status": status,
                                "message": f"Task '{task['task_type']}' has been {status}"
                            }
                        )
                
                return True
        
        return False
    
    def disband_team(self, team_id: str, notify_members: bool = True) -> bool:
        """
        Disband a team and notify all members.
        
        Args:
            team_id: Team ID
            notify_members: Whether to send notifications to members
            
        Returns:
            True if team was disbanded successfully
        """
        if team_id not in self.teams:
            return False
        
        team = self.teams[team_id]
        
        # Notify members if requested
        if notify_members and team["members"]:
            coordinator_id = team.get("coordinator_id")
            
            if not coordinator_id and team["members"]:
                # Use first member as sender if no coordinator
                coordinator_id = team["members"][0]["agent_id"]
            
            if coordinator_id:
                # Broadcast team disbanding notification
                self.broadcast_to_team(
                    team_id=team_id,
                    sender_id=coordinator_id,
                    message_type=CollaborationMessageType.ALERT,
                    content={
                        "team_id": team_id,
                        "message": f"Team '{team['name']}' has been disbanded"
                    }
                )
        
        # Remove team from all agent assignments
        for agent_id in self.team_assignments:
            if team_id in self.team_assignments[agent_id]:
                self.team_assignments[agent_id].remove(team_id)
        
        # Remove the team
        del self.teams[team_id]
        
        return True

# Example usage
if __name__ == "__main__":
    # Create agent collaboration system
    collaboration_system = AgentCollaborationSystem()
    
    # Register some test agents
    collaboration_system.register_agent(
        agent_id="research_agent",
        agent_name="Research Agent",
        capabilities=["research", "data_collection", "analysis"]
    )
    
    collaboration_system.register_agent(
        agent_id="planning_agent",
        agent_name="Planning Agent",
        capabilities=["planning", "scheduling", "coordination"]
    )
    
    # Send a test message
    message_id = collaboration_system.send_message(
        sender_id="research_agent",
        receiver_id="planning_agent",
        message_type=CollaborationMessageType.TASK_REQUEST,
        content={
            "task_type": "research",
            "topic": "agent collaboration",
            "depth": "detailed"
        }
    )
    
    # Process the message
    collaboration_system.process_message(
        message_id=message_id,
        response_content={
            "status": "accepted",
            "estimated_completion": "2 hours"
        }
    )
    
    # Create a team coordinator
    team_coordinator = AgentTeamCoordinator(collaboration_system)
    
    # Create a team
    team_coordinator.create_team(
        team_id="research_team",
        name="Research Team",
        coordinator_id="planning_agent"
    )
    
    # Add members to the team
    team_coordinator.add_team_member(
        team_id="research_team",
        agent_id="research_agent",
        role="researcher"
    )
    
    # Clean up
    collaboration_system.shutdown()