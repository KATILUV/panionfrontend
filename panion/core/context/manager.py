"""
Context Manager
Manages agent context and history with validation.
"""

import time
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from .validators import context_validator
import logging

logger = logging.getLogger(__name__)

@dataclass
class ContextEntry:
    """Represents a single context entry."""
    id: str
    type: str
    data: Dict[str, Any]
    metadata: Dict[str, str] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

class ContextValidator:
    """Validates context entries."""
    
    def __init__(self):
        self.required_fields = {
            'goal': {
                'id': str,
                'type': str,
                'status': str,
                'parameters': dict
            },
            'memory': {
                'type': str,
                'content': (str, dict),
                'timestamp': str
            },
            'plugins': {
                'enabled': list,
                'config': dict
            }
        }
        
        self.field_validators = {
            'goal': self._validate_goal,
            'memory': self._validate_memory,
            'plugins': self._validate_plugins
        }
    
    def validate(self, context: Dict[str, Any]) -> bool:
        """Validate a context entry.
        
        Args:
            context: Context to validate
            
        Returns:
            bool: Whether context is valid
            
        Raises:
            ValueError: If validation fails
        """
        if not isinstance(context, dict):
            raise ValueError("Context must be a dictionary")
        
        # Check required fields
        for field, field_type in self.required_fields.items():
            if field not in context:
                raise ValueError(f"Missing required field: {field}")
            
            # Check field type
            if not isinstance(context[field], field_type):
                if not (isinstance(field_type, tuple) and 
                       isinstance(context[field], field_type)):
                    raise ValueError(f"Invalid type for {field}")
            
            # Run field-specific validation
            if field in self.field_validators:
                self.field_validators[field](context[field])
        
        return True
    
    def _validate_goal(self, goal: Dict[str, Any]) -> None:
        """Validate goal context."""
        if not goal.get('id'):
            raise ValueError("Goal must have an ID")
        if not goal.get('type'):
            raise ValueError("Goal must have a type")
        if not goal.get('status'):
            raise ValueError("Goal must have a status")
        if not isinstance(goal.get('parameters', {}), dict):
            raise ValueError("Goal parameters must be a dictionary")
    
    def _validate_memory(self, memory: Dict[str, Any]) -> None:
        """Validate memory context."""
        if not memory.get('type'):
            raise ValueError("Memory must have a type")
        if not memory.get('content'):
            raise ValueError("Memory must have content")
        if not memory.get('timestamp'):
            raise ValueError("Memory must have a timestamp")
    
    def _validate_plugins(self, plugins: Dict[str, Any]) -> None:
        """Validate plugins context."""
        if not isinstance(plugins.get('enabled', []), list):
            raise ValueError("Enabled plugins must be a list")
        if not isinstance(plugins.get('config', {}), dict):
            raise ValueError("Plugin config must be a dictionary")

class ContextManager:
    """Manages agent context and history."""
    
    def __init__(self, data_dir: str = "data/contexts"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.contexts: Dict[str, ContextEntry] = {}
        self.history: Dict[str, List[ContextEntry]] = {}
        self.max_history_size = 100
        self.default_expiry = timedelta(hours=24)
        self.validator = ContextValidator()
    
    def generate_context(self, goal_id: str) -> ContextEntry:
        """Generate a new context for a goal.
        
        Args:
            goal_id: ID of the goal
            
        Returns:
            ContextEntry: Generated context
        """
        # Create base context
        context = self.create_context(
            context_type="goal",
            data={
                "goal_id": goal_id,
                "state": "initialized",
                "steps": [],
                "artifacts": {},
                "metrics": {}
            },
            metadata={
                "goal_id": goal_id,
                "created_by": "system"
            }
        )
        
        # Persist context
        self.persist_context(goal_id, context)
        
        return context
    
    def persist_context(self, agent_id: str, context: ContextEntry) -> bool:
        """Persist a context to disk.
        
        Args:
            agent_id: ID of the agent
            context: Context to persist
            
        Returns:
            bool: Whether persistence was successful
        """
        try:
            # Create agent directory if it doesn't exist
            agent_dir = self.data_dir / agent_id
            agent_dir.mkdir(exist_ok=True)
            
            # Convert context to serializable format
            context_data = {
                "id": context.id,
                "type": context.type,
                "data": context.data,
                "metadata": context.metadata,
                "created_at": context.created_at.isoformat(),
                "updated_at": context.updated_at.isoformat(),
                "expires_at": context.expires_at.isoformat() if context.expires_at else None
            }
            
            # Save to file
            context_file = agent_dir / f"{context.id}.json"
            with open(context_file, 'w') as f:
                json.dump(context_data, f, indent=2)
            
            return True
            
        except Exception as e:
            logger.error(f"Error persisting context: {e}")
            return False
    
    def restore_context(self, agent_id: str) -> Optional[ContextEntry]:
        """Restore the latest context for an agent.
        
        Args:
            agent_id: ID of the agent
            
        Returns:
            Optional[ContextEntry]: Restored context if found
        """
        try:
            agent_dir = self.data_dir / agent_id
            if not agent_dir.exists():
                return None
            
            # Find latest context file
            context_files = list(agent_dir.glob("*.json"))
            if not context_files:
                return None
            
            latest_file = max(context_files, key=lambda x: x.stat().st_mtime)
            
            # Load context
            with open(latest_file, 'r') as f:
                context_data = json.load(f)
            
            # Convert to ContextEntry
            context = ContextEntry(
                id=context_data["id"],
                type=context_data["type"],
                data=context_data["data"],
                metadata=context_data["metadata"],
                created_at=datetime.fromisoformat(context_data["created_at"]),
                updated_at=datetime.fromisoformat(context_data["updated_at"]),
                expires_at=datetime.fromisoformat(context_data["expires_at"]) if context_data["expires_at"] else None
            )
            
            # Validate restored context
            validation_result = self.validator.validate(context.__dict__)
            if not validation_result:
                raise ValueError(f"Invalid restored context")
            
            # Add to active contexts
            self.contexts[context.id] = context
            self.history[agent_id].append(context)
            
            return context
            
        except Exception as e:
            logger.error(f"Error restoring context: {e}")
            return None
    
    def create_context(self, agent_id: str, context_type: str, data: Dict[str, Any], 
                      metadata: Optional[Dict[str, Any]] = None) -> str:
        """Create a new context entry.
        
        Args:
            agent_id: ID of the agent
            context_type: Type of context
            data: Context data
            metadata: Additional metadata
            
        Returns:
            str: ID of created context
            
        Raises:
            ValueError: If context is invalid
        """
        # Validate context
        self.validator.validate(data)
        
        # Create context entry
        context_id = f"{agent_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        entry = ContextEntry(
            id=context_id,
            type=context_type,
            data=data,
            metadata=metadata or {},
            created_at=datetime.now(),
            updated_at=datetime.now(),
            expires_at=datetime.now() + self.default_expiry
        )
        
        # Store context
        self.contexts[context_id] = entry
        
        # Update history
        if agent_id not in self.history:
            self.history[agent_id] = []
        self.history[agent_id].append(entry)
        
        # Trim history if needed
        if len(self.history[agent_id]) > self.max_history_size:
            self.history[agent_id] = self.history[agent_id][-self.max_history_size:]
        
        # Persist context
        self._persist_context(agent_id, entry)
        
        return context_id
    
    def get_context(self, context_id: str) -> Optional[ContextEntry]:
        """Get a context entry by ID.
        
        Args:
            context_id: ID of context to get
            
        Returns:
            Optional[ContextEntry]: Context entry if found and not expired
        """
        entry = self.contexts.get(context_id)
        if not entry:
            return None
        
        # Check expiration
        if entry.expires_at and entry.expires_at < datetime.now():
            self.delete_context(context_id)
            return None
        
        return entry
    
    def update_context(self, context_id: str, data: Dict[str, Any], 
                      metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Update a context entry.
        
        Args:
            context_id: ID of context to update
            data: New context data
            metadata: New metadata
            
        Returns:
            bool: Whether update was successful
            
        Raises:
            ValueError: If context is invalid
        """
        entry = self.get_context(context_id)
        if not entry:
            return False
        
        # Validate updated context
        self.validator.validate(data)
        
        # Update entry
        entry.data = data
        if metadata:
            entry.metadata.update(metadata)
        entry.updated_at = datetime.now()
        
        # Persist changes
        self._persist_context(entry.id.split('_')[0], entry)
        
        return True
    
    def delete_context(self, context_id: str) -> bool:
        """Delete a context entry.
        
        Args:
            context_id: ID of context to delete
            
        Returns:
            bool: Whether deletion was successful
        """
        if context_id not in self.contexts:
            return False
        
        # Remove from contexts
        del self.contexts[context_id]
        
        # Remove from history
        agent_id = context_id.split('_')[0]
        if agent_id in self.history:
            self.history[agent_id] = [
                entry for entry in self.history[agent_id]
                if entry.id != context_id
            ]
        
        # Remove persisted file
        context_file = self.data_dir / agent_id / f"{context_id}.json"
        if context_file.exists():
            context_file.unlink()
        
        return True
    
    def get_contexts_by_type(self, agent_id: str, context_type: str) -> List[ContextEntry]:
        """Get all contexts of a specific type for an agent.
        
        Args:
            agent_id: ID of the agent
            context_type: Type of contexts to get
            
        Returns:
            List[ContextEntry]: List of matching contexts
        """
        return [
            entry for entry in self.history.get(agent_id, [])
            if entry.type == context_type and not (
                entry.expires_at and entry.expires_at < datetime.now()
            )
        ]
    
    def get_recent_contexts(self, agent_id: str, limit: int = 10) -> List[ContextEntry]:
        """Get most recent contexts for an agent.
        
        Args:
            agent_id: ID of the agent
            limit: Maximum number of contexts to return
            
        Returns:
            List[ContextEntry]: List of recent contexts
        """
        contexts = [
            entry for entry in self.history.get(agent_id, [])
            if not (entry.expires_at and entry.expires_at < datetime.now())
        ]
        contexts.sort(key=lambda x: x.updated_at, reverse=True)
        return contexts[:limit]
    
    def cleanup_expired_contexts(self) -> int:
        """Remove expired contexts.
        
        Returns:
            int: Number of contexts removed
        """
        now = datetime.now()
        expired = [
            context_id for context_id, entry in self.contexts.items()
            if entry.expires_at and entry.expires_at < now
        ]
        
        for context_id in expired:
            self.delete_context(context_id)
        
        return len(expired)
    
    def get_context_history(self, agent_id: str) -> List[ContextEntry]:
        """Get full context history for an agent.
        
        Args:
            agent_id: ID of the agent
            
        Returns:
            List[ContextEntry]: List of all contexts
        """
        return self.history.get(agent_id, [])
    
    def merge_contexts(self, agent_id: str, context_ids: List[str]) -> Optional[str]:
        """Merge multiple contexts into a new one.
        
        Args:
            agent_id: ID of the agent
            context_ids: IDs of contexts to merge
            
        Returns:
            Optional[str]: ID of new merged context if successful
        """
        # Get contexts to merge
        contexts = []
        for context_id in context_ids:
            entry = self.get_context(context_id)
            if entry:
                contexts.append(entry)
        
        if not contexts:
            return None
        
        # Merge data
        merged_data = {}
        for entry in contexts:
            merged_data.update(entry.data)
        
        # Create new context
        return self.create_context(
            agent_id=agent_id,
            context_type="merged",
            data=merged_data,
            metadata={"merged_from": context_ids}
        )
    
    def get_context_stats(self) -> Dict[str, Any]:
        """Get statistics about contexts.
        
        Returns:
            Dict[str, Any]: Context statistics
        """
        return {
            "total_contexts": len(self.contexts),
            "total_history_entries": sum(len(entries) for entries in self.history.values()),
            "agents_with_context": len(self.history),
            "context_types": {
                context_type: len([
                    entry for entry in self.contexts.values()
                    if entry.type == context_type
                ])
                for context_type in set(entry.type for entry in self.contexts.values())
            }
        }
    
    def _persist_context(self, agent_id: str, entry: ContextEntry) -> None:
        """Persist a context entry to disk.
        
        Args:
            agent_id: ID of the agent
            entry: Context entry to persist
        """
        try:
            # Create agent directory
            agent_dir = self.data_dir / agent_id
            agent_dir.mkdir(exist_ok=True)
            
            # Write context file
            context_file = agent_dir / f"{entry.id}.json"
            with open(context_file, 'w') as f:
                json.dump({
                    "id": entry.id,
                    "type": entry.type,
                    "data": entry.data,
                    "metadata": entry.metadata,
                    "created_at": entry.created_at.isoformat(),
                    "updated_at": entry.updated_at.isoformat(),
                    "expires_at": entry.expires_at.isoformat() if entry.expires_at else None
                }, f, indent=2)
            
        except Exception as e:
            logger.error(f"Error persisting context: {str(e)}")
            raise

class AgentContextBuilder:
    """Builds and validates agent contexts."""
    
    def __init__(self):
        self.validator = ContextValidator()
    
    def validate_context(self, context: Dict[str, Any]) -> bool:
        """Validate a context before running.
        
        Args:
            context: Context to validate
            
        Returns:
            bool: Whether context is valid
            
        Raises:
            ValueError: If validation fails
        """
        return self.validator.validate(context)
    
    def build_context(self, goal_id: str, initial_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Build a new validated context.
        
        Args:
            goal_id: ID of the goal
            initial_data: Optional initial data
            
        Returns:
            Dict[str, Any]: Validated context
            
        Raises:
            ValueError: If context is invalid
        """
        # Create base context
        context = {
            'goal': {
                'id': goal_id,
                'type': 'task',
                'status': 'pending',
                'parameters': {}
            },
            'memory': {
                'type': 'working',
                'content': {},
                'timestamp': datetime.now().isoformat()
            },
            'plugins': {
                'enabled': [],
                'config': {}
            }
        }
        
        # Add initial data if provided
        if initial_data:
            context.update(initial_data)
        
        # Validate context
        self.validate_context(context)
        
        return context

# Create global instance
context_manager = ContextManager()
agent_context_builder = AgentContextBuilder() 