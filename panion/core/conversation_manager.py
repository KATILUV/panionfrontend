"""
Conversation Manager
Manages conversations and their flow in Clara v2.
"""

import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List, Callable, Union, Set, Tuple, Pattern
from dataclasses import dataclass
from datetime import datetime, timedelta
import json
import uuid
import traceback
from queue import Queue
import os
import re
from collections import defaultdict
from enum import Enum, auto

from .queue_system import QueueFactory, QueueConfig, QueueInterface
from .state_manager import StateManager
from .clara_os import clara_os
from core.panion_plugins import plugin_manager
from core.ai_service import ai_service
from core.capabilities import capability_manager, CapabilityCategory, Capability

class MemoryCategory(Enum):
    """Predefined memory categories for organizing conversations."""
    PERSONAL = "personal"  # Personal information about the user
    PREFERENCE = "preference"  # User preferences and likes/dislikes
    FACT = "fact"  # Factual information shared by the user
    INTEREST = "interest"  # User interests and hobbies
    GOAL = "goal"  # User goals and aspirations
    EXPERIENCE = "experience"  # User experiences and stories
    CONTACT = "contact"  # Contact information or people mentioned
    OTHER = "other"  # Default category for miscellaneous memories

    @classmethod
    def get_description(cls, category: str) -> str:
        """Get the description for a memory category."""
        descriptions = {
            cls.PERSONAL.value: "Personal information about the user (name, age, demographic details)",
            cls.PREFERENCE.value: "User preferences and likes/dislikes (favorite colors, foods, music)",
            cls.FACT.value: "Factual information shared by the user (historical facts, scientific information)",
            cls.INTEREST.value: "User interests and hobbies (sports, arts, collecting)",
            cls.GOAL.value: "User goals and aspirations (career plans, life goals)",
            cls.EXPERIENCE.value: "User experiences and stories (trips, events, memories)",
            cls.CONTACT.value: "Contact information or people mentioned (friends, family, relationships)",
            cls.OTHER.value: "Default category for miscellaneous memories that don't fit elsewhere"
        }
        return descriptions.get(category, "No description available")

class MemoryValidationStatus(Enum):
    """Status of memory validation."""
    UNVERIFIED = "unverified"
    VERIFIED = "verified"
    NEEDS_CLARIFICATION = "needs_clarification"
    CONFLICTING = "conflicting"
    OUTDATED = "outdated"

class SystemCapabilityCategory(Enum):
    """Categories for Clara's system capabilities."""
    CORE = "core"              # Core functionalities
    PLUGIN = "plugin"          # Plugin capabilities
    MEMORY = "memory"          # Memory-related features
    UI = "ui"                  # UI/Interface features
    CONVERSATION = "conversation"  # Conversation abilities
    ISSUE = "issue"            # Known issues/limitations
    STATUS = "status"          # System status information

@dataclass
class Memory:
    """Represents a memory extracted from a conversation."""
    content: str
    category: MemoryCategory
    timestamp: datetime
    source_message: str
    conversation_id: str
    confidence: float = 1.0
    importance_score: float = 0.5
    keywords: List[str] = None
    context: Dict[str, Any] = None
    validation_status: MemoryValidationStatus = MemoryValidationStatus.UNVERIFIED
    verification_count: int = 0
    last_verified: Optional[datetime] = None
    conflicting_memories: List[str] = None
    verification_history: List[Dict[str, Any]] = None
    expiration_date: Optional[datetime] = None

    def __post_init__(self):
        if self.keywords is None:
            self.keywords = []
        if self.context is None:
            self.context = {}
        if self.conflicting_memories is None:
            self.conflicting_memories = []
        if self.verification_history is None:
            self.verification_history = []

    def to_dict(self) -> Dict[str, Any]:
        data = {
            "content": self.content,
            "category": self.category.value,
            "timestamp": self.timestamp.isoformat(),
            "source_message": self.source_message,
            "conversation_id": self.conversation_id,
            "confidence": self.confidence,
            "importance_score": self.importance_score,
            "keywords": self.keywords,
            "context": self.context,
            "validation_status": self.validation_status.value,
            "verification_count": self.verification_count,
            "conflicting_memories": self.conflicting_memories,
            "verification_history": self.verification_history
        }
        if self.last_verified:
            data["last_verified"] = self.last_verified.isoformat()
        if self.expiration_date:
            data["expiration_date"] = self.expiration_date.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Memory":
        memory = cls(
            content=data["content"],
            category=MemoryCategory(data["category"]),
            timestamp=datetime.fromisoformat(data["timestamp"]),
            source_message=data["source_message"],
            conversation_id=data["conversation_id"],
            confidence=data.get("confidence", 1.0),
            importance_score=data.get("importance_score", 0.5)
        )
        memory.keywords = data.get("keywords", [])
        memory.context = data.get("context", {})
        memory.validation_status = MemoryValidationStatus(data.get("validation_status", "unverified"))
        memory.verification_count = data.get("verification_count", 0)
        memory.conflicting_memories = data.get("conflicting_memories", [])
        memory.verification_history = data.get("verification_history", [])
        
        if "last_verified" in data:
            memory.last_verified = datetime.fromisoformat(data["last_verified"])
        if "expiration_date" in data:
            memory.expiration_date = datetime.fromisoformat(data["expiration_date"])
            
        return memory

class MemoryPattern:
    """Represents a pattern for memory extraction."""
    def __init__(self, 
                 category: MemoryCategory,
                 patterns: List[str],
                 importance_base: float = 0.5,
                 context_patterns: Optional[Dict[str, List[str]]] = None):
        self.category = category
        self.patterns = [re.compile(p, re.IGNORECASE) for p in patterns]
        self.importance_base = importance_base
        self.context_patterns = context_patterns or {}

@dataclass
class ConversationConfig:
    """Configuration for conversation management."""
    name: str = "clara_conversations"
    max_concurrent_conversations: int = 10
    state_persistence: bool = True
    state_sync_interval: int = 10
    storage_dir: Optional[str] = None
    max_history: int = 10
    command_prefix: str = "/"
    context_window: int = 5

class Message:
    def __init__(self, content: str, msg_type: str = "chat", timestamp: Optional[datetime] = None):
        self.content = content
        self.type = msg_type
        self.timestamp = timestamp or datetime.now()
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "content": self.content,
            "type": self.type,
            "timestamp": self.timestamp.isoformat()
        }
        
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Message":
        return cls(
            content=data["content"],
            msg_type=data["type"],
            timestamp=datetime.fromisoformat(data["timestamp"])
        )

@dataclass
class SystemCapability:
    """Represents a system capability or feature."""
    name: str
    category: SystemCapabilityCategory
    description: str
    status: str = "active"  # active, deprecated, planned
    added_date: datetime = None
    last_updated: datetime = None
    dependencies: List[str] = None
    examples: List[str] = None
    limitations: List[str] = None

    def __post_init__(self):
        if self.added_date is None:
            self.added_date = datetime.now()
        if self.last_updated is None:
            self.last_updated = datetime.now()
        if self.dependencies is None:
            self.dependencies = []
        if self.examples is None:
            self.examples = []
        if self.limitations is None:
            self.limitations = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "category": self.category.value,
            "description": self.description,
            "status": self.status,
            "added_date": self.added_date.isoformat(),
            "last_updated": self.last_updated.isoformat(),
            "dependencies": self.dependencies,
            "examples": self.examples,
            "limitations": self.limitations
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SystemCapability":
        return cls(
            name=data["name"],
            category=SystemCapabilityCategory(data["category"]),
            description=data["description"],
            status=data["status"],
            added_date=datetime.fromisoformat(data["added_date"]),
            last_updated=datetime.fromisoformat(data["last_updated"]),
            dependencies=data.get("dependencies", []),
            examples=data.get("examples", []),
            limitations=data.get("limitations", [])
        )

class ConversationManager:
    """Manages conversations and their flow."""
    
    def __init__(self, config: ConversationConfig = ConversationConfig(), storage_dir: Optional[str] = None):
        """Initialize the conversation manager."""
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.state = "INITIALIZING"
        self.storage_dir = storage_dir or "data/conversations"
        self.conversations_file = os.path.join(self.storage_dir, "conversations.json")
        self.tags_file = os.path.join(self.storage_dir, "tags.json")
        self.groups_file = os.path.join(self.storage_dir, "groups.json")
        self.memories_file = os.path.join(self.storage_dir, "memories.json")
        
        # Create storage directory if it doesn't exist
        os.makedirs(self.storage_dir, exist_ok=True)
        
        # Initialize state
        self.conversation_history = self._load_conversations()
        self.tags = self._load_tags()
        self.groups = self._load_groups()
        self.memories = self._load_memories()
        
        # Initialize runtime state
        self.active_conversations = {}
        self.current_conversation = []
        self.conversations_completed = 0
        self.conversations_failed = 0
        self.messages_processed = 0
        self.start_time = datetime.now()
        
        # Initialize components
        self.state_manager = None
        self.conversation_queue = None
        self.message_queue = None
        self.result_queue = None
        self.capability_manager = CapabilityManager()
        
        # Initialize handlers
        self._on_new_message_handlers = []
        self._on_conversation_end_handlers = []
        
        self.is_initialized = False

    def _setup_queue(self, purpose: str, queue_type: str) -> QueueInterface:
        """Setup a queue with standard configuration."""
        config = QueueConfig(
            queue_type=queue_type,
            name=f"{self.config.name}_{purpose}",
            persistence_enabled=self.config.state_persistence,
            persistence_path=Path(f"data/conversations/{purpose}")
        )
        return QueueFactory.create_queue(config)

    def _load_conversations(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load conversation history from storage."""
        try:
            if os.path.exists(self.conversations_file):
                with open(self.conversations_file, "r") as f:
                    return json.load(f)
            return {}
        except Exception as e:
            self.logger.error(f"Error loading conversations: {str(e)}")
            return {}

    def _load_tags(self) -> Dict[str, List[str]]:
        """Load conversation tags from storage."""
        try:
            if os.path.exists(self.tags_file):
                with open(self.tags_file, "r") as f:
                    return json.load(f)
            return {}
        except Exception as e:
            self.logger.error(f"Error loading tags: {str(e)}")
            return {}

    def _load_groups(self) -> Dict[str, List[str]]:
        """Load conversation groups from storage."""
        try:
            if os.path.exists(self.groups_file):
                with open(self.groups_file, "r") as f:
                    return json.load(f)
            return {}
        except Exception as e:
            self.logger.error(f"Error loading groups: {str(e)}")
            return {}

    def _load_memories(self) -> Dict[str, Any]:
        """Load conversation memories from storage."""
        try:
            if os.path.exists(self.memories_file):
                with open(self.memories_file, "r") as f:
                    return json.load(f)
            return {}
        except Exception as e:
            self.logger.error(f"Error loading memories: {str(e)}")
            return {}

    def _save_conversations(self) -> None:
        """Save conversation history to storage."""
        try:
            with open(self.conversations_file, "w") as f:
                json.dump(self.conversation_history, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving conversations: {str(e)}")

    def _save_tags(self) -> None:
        """Save conversation tags to storage."""
        try:
            with open(self.tags_file, "w") as f:
                json.dump(self.tags, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving tags: {str(e)}")

    def _save_groups(self) -> None:
        """Save conversation groups to storage."""
        try:
            with open(self.groups_file, "w") as f:
                json.dump(self.groups, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving groups: {str(e)}")

    def _save_memories(self) -> None:
        """Save conversation memories to storage."""
        try:
            with open(self.memories_file, "w") as f:
                json.dump(self.memories, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving memories: {str(e)}")

    async def initialize(self) -> None:
        """Initialize the conversation manager."""
        try:
            self.logger.info("Initializing conversation manager")
            
            # Initialize state manager
            self.state_manager = StateManager(state_dir=Path("data/conversations/state"))
            await self.state_manager.start()
            
            # Initialize queues
            self.conversation_queue = self._setup_queue("conversations", "priority")
            self.message_queue = self._setup_queue("messages", "standard")
            self.result_queue = self._setup_queue("results", "redis")
            
            await self.conversation_queue.initialize()
            await self.message_queue.initialize()
            await self.result_queue.initialize()
            
            # Initialize capability manager
            await self.capability_manager.initialize()
            
            # Start the system
            await self.start()
            
            self.logger.info("Conversation manager initialized successfully")
            self.is_initialized = True
        except Exception as e:
            self.state = "ERROR"
            self.logger.error(f"Error initializing conversation manager: {str(e)}")
            raise

    async def start(self) -> None:
        """Start the conversation manager."""
        try:
            self.logger.info("Starting conversation manager")
            
            # Start processing tasks
            asyncio.create_task(self._process_conversation_queue())
            asyncio.create_task(self._process_message_queue())
            asyncio.create_task(self._sync_state())
            
            self.state = "RUNNING"
            self.logger.info("Conversation manager started successfully")
        except Exception as e:
            self.state = "ERROR"
            self.logger.error(f"Error starting conversation manager: {str(e)}")
            raise

    async def stop(self) -> None:
        """Stop the conversation manager."""
        try:
            self.logger.info("Stopping conversation manager")
            
            # Wait for active conversations to complete
            if self.active_conversations:
                self.logger.info(f"Waiting for {len(self.active_conversations)} active conversations to complete")
                await asyncio.gather(*self.active_conversations.values())
            
            # Save final state
            self._save_conversations()
            self._save_tags()
            self._save_groups()
            self._save_memories()
            
            self.state = "STOPPED"
            self.logger.info("Conversation manager stopped successfully")
        except Exception as e:
            self.state = "ERROR"
            self.logger.error(f"Error stopping conversation manager: {str(e)}")
            raise

    async def _process_conversation_queue(self) -> None:
        """Process the conversation queue."""
        while self.state == "RUNNING":
            try:
                if len(self.active_conversations) >= self.config.max_concurrent_conversations:
                    await asyncio.sleep(1)
                    continue
                if not await self.conversation_queue.empty():
                    conversation = await self.conversation_queue.get()
                    conversation_coroutine = self._handle_conversation(conversation)
                    self.active_conversations[conversation["id"]] = asyncio.create_task(conversation_coroutine)
                await asyncio.sleep(0.1)
            except Exception as e:
                self.logger.error(f"Error processing conversation queue: {str(e)}")
                await asyncio.sleep(1)

    async def _process_message_queue(self) -> None:
        """Process the message queue."""
        while self.state == "RUNNING":
            try:
                if not await self.message_queue.empty():
                    message = await self.message_queue.get()
                    await self._handle_message(message)
                await asyncio.sleep(0.1)
            except Exception as e:
                self.logger.error(f"Error processing message queue: {str(e)}")
                await asyncio.sleep(1)

    async def _sync_state(self) -> None:
        """Sync conversation state periodically."""
        while self.state == "RUNNING":
            try:
                if self.state_manager:
                    state = {
                        "state": self.state,
                        "active_conversations": len(self.active_conversations),
                        "conversations_completed": self.conversations_completed,
                        "conversations_failed": self.conversations_failed,
                        "messages_processed": self.messages_processed,
                        "uptime": (datetime.now() - self.start_time).total_seconds()
                    }
                    await self.state_manager.set("conversations", "status", state)
                await asyncio.sleep(self.config.state_sync_interval)
            except Exception as e:
                self.logger.error(f"Error syncing state: {str(e)}")
                await asyncio.sleep(1)

    async def _handle_conversation(self, conversation: Dict[str, Any]) -> None:
        """Handle a conversation."""
        try:
            # Process conversation
            self.current_conversation = conversation.get("messages", [])
            self.conversation_history[conversation["id"]] = conversation
            
            # Save state
            self._save_conversations()
            
            self.conversations_completed += 1
            
            # Notify handlers
            for handler in self._on_conversation_end_handlers:
                try:
                    await handler(conversation)
                except Exception as e:
                    self.logger.error(f"Error in conversation end handler: {str(e)}")
            
        except Exception as e:
            self.conversations_failed += 1
            self.logger.error(f"Error handling conversation: {str(e)}")
        finally:
            if conversation["id"] in self.active_conversations:
                del self.active_conversations[conversation["id"]]

    async def _handle_message(self, message: Dict[str, Any]) -> None:
        """Handle a message."""
        try:
            # Process message
            self.current_conversation.append(message)
            self.messages_processed += 1
            
            # Notify handlers
            for handler in self._on_new_message_handlers:
                try:
                    await handler(message)
                except Exception as e:
                    self.logger.error(f"Error in message handler: {str(e)}")
            
        except Exception as e:
            self.logger.error(f"Error handling message: {str(e)}")

    def on_new_message(self, handler: Callable[[Dict[str, Any]], None]) -> None:
        """Register a new message handler."""
        self._on_new_message_handlers.append(handler)

    def on_conversation_end(self, handler: Callable[[Dict[str, Any]], None]) -> None:
        """Register a conversation end handler."""
        self._on_conversation_end_handlers.append(handler)

    async def process_message(self, message: Dict[str, Any]) -> str:
        """Process a message and return a response."""
        try:
            # Add message to conversation history
            self.current_conversation.append(message)
            
            # Format messages for AI service
            formatted_messages = ai_service.format_messages(self.current_conversation)
            
            # Generate response using AI service
            try:
                response = await ai_service.generate_response(formatted_messages)
            except Exception as e:
                self.logger.error(f"Error generating AI response: {e}")
                return "I apologize, but I'm having trouble generating a response right now. Please try again later."
            
            # Create response message
            response_message = {
                "content": response,
                "type": "system",
                "timestamp": datetime.now().isoformat(),
                "conversation_id": message.get("conversation_id"),
                "sender": "clara"
            }
            
            # Add response to conversation history
            self.current_conversation.append(response_message)
            
            # Save conversation state
            self._save_conversations()
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error processing message: {str(e)}")
            return "I apologize, but I encountered an error processing your message. How else can I assist you?"

# Create a module-level instance of ConversationManager
conversation_manager = None

async def initialize_conversation_manager() -> ConversationManager:
    """Initialize the global conversation manager instance."""
    global conversation_manager
    if conversation_manager is None:
        conversation_manager = ConversationManager()
        await conversation_manager.initialize()
    return conversation_manager 