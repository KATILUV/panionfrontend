"""
Memory Manager
Manages system memory with scoring and forgetting capabilities.
"""

import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
from pathlib import Path
import json
import asyncio

from .scoring import memory_scoring_system, MemoryScore

logger = logging.getLogger(__name__)

class MemoryManager:
    """Manages system memory with scoring and forgetting."""
    
    def __init__(self, data_dir: str = "data/memories"):
        self.logger = logging.getLogger(__name__)
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize memory storage
        self.memories: Dict[str, Dict[str, Any]] = {}
        self.memory_index: Dict[str, Set[str]] = {}  # tag -> memory_ids
        
        # Load existing memories
        self._load_memories()
        
        # Start decay task
        self._start_decay_task()
    
    def _load_memories(self) -> None:
        """Load existing memories from disk."""
        try:
            for memory_file in self.data_dir.glob("*.json"):
                with open(memory_file, 'r') as f:
                    memory = json.load(f)
                    memory_id = memory_file.stem
                    self.memories[memory_id] = memory
                    
                    # Update index
                    for tag in memory.get("tags", []):
                        if tag not in self.memory_index:
                            self.memory_index[tag] = set()
                        self.memory_index[tag].add(memory_id)
                    
                    # Initialize score if not exists
                    if memory_id not in memory_scoring_system.scores:
                        memory_scoring_system.update_score(memory_id, memory)
            
            self.logger.info(f"Loaded {len(self.memories)} memories")
            
        except Exception as e:
            self.logger.error(f"Error loading memories: {e}")
    
    def _start_decay_task(self) -> None:
        """Start background task for memory decay."""
        async def decay_task():
            while True:
                try:
                    # Apply decay
                    memory_scoring_system.apply_decay()
                    
                    # Wait for next decay cycle (1 hour)
                    await asyncio.sleep(3600)
                    
                except Exception as e:
                    self.logger.error(f"Error in decay task: {e}")
                    await asyncio.sleep(60)  # Wait before retry
        
        asyncio.create_task(decay_task())
    
    def add_memory(self, content: Dict[str, Any], tags: Optional[List[str]] = None) -> str:
        """Add a new memory.
        
        Args:
            content: Memory content
            tags: Optional list of tags
            
        Returns:
            str: ID of created memory
        """
        try:
            # Generate memory ID
            memory_id = f"mem_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Create memory entry
            memory = {
                "id": memory_id,
                "content": content,
                "tags": tags or [],
                "created_at": datetime.now().isoformat(),
                "last_accessed": datetime.now().isoformat(),
                "access_count": 0,
                "metadata": {
                    "importance": content.get("importance", 0.5),
                    "relevance": content.get("relevance", 0.5)
                }
            }
            
            # Store memory
            self.memories[memory_id] = memory
            
            # Update index
            for tag in memory["tags"]:
                if tag not in self.memory_index:
                    self.memory_index[tag] = set()
                self.memory_index[tag].add(memory_id)
            
            # Save to disk
            memory_file = self.data_dir / f"{memory_id}.json"
            with open(memory_file, 'w') as f:
                json.dump(memory, f, indent=2)
            
            # Update score
            memory_scoring_system.update_score(memory_id, memory)
            
            self.logger.info(f"Added memory {memory_id}")
            
            return memory_id
            
        except Exception as e:
            self.logger.error(f"Error adding memory: {e}")
            raise
    
    def get_memory(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """Get a memory by ID.
        
        Args:
            memory_id: ID of memory to get
            
        Returns:
            Optional[Dict[str, Any]]: Memory if found
        """
        memory = self.memories.get(memory_id)
        if memory:
            # Update access count and timestamp
            memory["access_count"] += 1
            memory["last_accessed"] = datetime.now().isoformat()
            
            # Update score
            memory_scoring_system.update_score(memory_id, memory)
            
            # Save changes
            memory_file = self.data_dir / f"{memory_id}.json"
            with open(memory_file, 'w') as f:
                json.dump(memory, f, indent=2)
        
        return memory
    
    def search_memories(self, query: str, tags: Optional[List[str]] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Search memories by query and tags.
        
        Args:
            query: Search query
            tags: Optional list of tags to filter by
            limit: Maximum number of results
            
        Returns:
            List of matching memories
        """
        # Get candidate memory IDs
        candidate_ids = set()
        
        if tags:
            # Filter by tags
            for tag in tags:
                if tag in self.memory_index:
                    candidate_ids.update(self.memory_index[tag])
        else:
            # Use all memories
            candidate_ids = set(self.memories.keys())
        
        # Search memories
        results = []
        for memory_id in candidate_ids:
            memory = self.memories[memory_id]
            
            # Check if memory matches query
            if self._matches_query(memory, query):
                # Get score
                score = memory_scoring_system.scores.get(memory_id)
                if score:
                    results.append({
                        "memory": memory,
                        "score": score.current_score
                    })
        
        # Sort by score and limit results
        results.sort(key=lambda x: x["score"], reverse=True)
        return [r["memory"] for r in results[:limit]]
    
    def _matches_query(self, memory: Dict[str, Any], query: str) -> bool:
        """Check if memory matches search query.
        
        Args:
            memory: Memory to check
            query: Search query
            
        Returns:
            bool: Whether memory matches query
        """
        # Convert query to lowercase
        query = query.lower()
        
        # Check content
        content = memory.get("content", {})
        if isinstance(content, dict):
            for value in content.values():
                if isinstance(value, str) and query in value.lower():
                    return True
        elif isinstance(content, str) and query in content.lower():
            return True
        
        # Check tags
        for tag in memory.get("tags", []):
            if query in tag.lower():
                return True
        
        return False
    
    def get_important_memories(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most important memories.
        
        Args:
            limit: Maximum number of memories to return
            
        Returns:
            List of important memories
        """
        # Get important memories from scoring system
        important = memory_scoring_system.get_important_memories(limit)
        
        # Get full memory data
        return [
            self.memories[mem["memory_id"]]
            for mem in important
            if mem["memory_id"] in self.memories
        ]
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """Get memory statistics.
        
        Returns:
            Dictionary containing memory statistics
        """
        # Get scoring stats
        scoring_stats = memory_scoring_system.get_memory_stats()
        
        # Add memory manager stats
        stats = {
            "total_memories": len(self.memories),
            "total_tags": len(self.memory_index),
            "tag_distribution": {
                tag: len(memory_ids)
                for tag, memory_ids in self.memory_index.items()
            },
            "scoring_stats": scoring_stats
        }
        
        return stats

# Create global instance
memory_manager = MemoryManager() 