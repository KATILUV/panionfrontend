"""
Memory Service
Centralizes memory management and operations.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Any
import json
import asyncio
from difflib import SequenceMatcher
from pathlib import Path
from ..plugin.types import PluginError, PluginErrorType

from ..core.base import BaseComponent, ComponentState
from ..core.memory import (
    MemoryManager, MemoryEntry, MemoryCategory,
    MemoryQuery, ReflectionType
)

class MemoryService(BaseComponent):
    """Service for centralized memory management."""
    
    def __init__(self, data_dir: str = "data"):
        """Initialize memory service."""
        super().__init__(
            name="MemoryService",
            version="1.0.0",
            description="Centralized memory service",
            author="Panion Team"
        )
        
        self.logger = logging.getLogger(__name__)
        self._memory_manager: Optional[MemoryManager] = None
        self._compression_threshold = 0.8
        self._max_memories = 10000
        self._cleanup_interval = timedelta(hours=1)
        self._last_cleanup: Optional[datetime] = None
        self.data_dir = Path(data_dir)
        self.memory: Dict[str, Dict[str, Any]] = {}
        self._ensure_data_dir()
    
    def _ensure_data_dir(self) -> None:
        """Ensure data directory exists."""
        try:
            self.data_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            self.logger.error(f"Failed to create data directory: {e}")
            raise PluginError("Failed to create data directory", PluginErrorType.INIT_ERROR)
    
    async def initialize(self) -> bool:
        """Initialize the memory service."""
        try:
            self.logger.info("Initializing memory service")
            self.state = ComponentState.INITIALIZING
            
            # Get memory manager reference
            self._memory_manager = self.get_manager("MemoryManager")
            if not self._memory_manager:
                self.logger.error("Memory manager not found")
                return False
            
            # Schedule periodic cleanup
            self.schedule_task(
                self._cleanup_memories,
                interval=self._cleanup_interval
            )
            
            self.state = ComponentState.ACTIVE
            self.logger.info("Memory service initialized")
            return True
            
        except Exception as e:
            self.logger.error(f"Error initializing memory service: {e}")
            self.state = ComponentState.ERROR
            return False
    
    async def _cleanup_memories(self):
        """Clean up old and redundant memories."""
        try:
            if not self._memory_manager:
                return
            
            self.logger.info("Starting memory cleanup")
            
            # Check if cleanup is needed
            if (self._last_cleanup and 
                datetime.now() - self._last_cleanup < self._cleanup_interval):
                return
            
            # Get memory status
            status = await self._memory_manager.get_status()
            
            # Check memory count
            if status.get("total_memories", 0) > self._max_memories:
                # Remove oldest memories
                await self._remove_oldest_memories(
                    status.get("total_memories", 0) - self._max_memories
                )
            
            # Compress similar memories
            await self._compress_similar_memories()
            
            # Update last cleanup time
            self._last_cleanup = datetime.now()
            
            self.logger.info("Memory cleanup completed")
            
        except Exception as e:
            self.logger.error(f"Error cleaning up memories: {e}")
    
    async def _remove_oldest_memories(self, count: int):
        """Remove oldest memories."""
        try:
            if not self._memory_manager:
                return
            
            # Get memories sorted by timestamp
            memories = await self._memory_manager.recall(
                MemoryQuery(
                    category=None,
                    tags=None,
                    start_time=None,
                    end_time=None,
                    limit=count,
                    offset=0,
                    sort_by="timestamp",
                    sort_order="asc"
                )
            )
            
            # Remove memories
            for memory in memories:
                await self._memory_manager.forget(memory.id)
            
            self.logger.info(f"Removed {len(memories)} oldest memories")
            
        except Exception as e:
            self.logger.error(f"Error removing oldest memories: {e}")
    
    async def _compress_similar_memories(self):
        """Compress similar memories."""
        try:
            if not self._memory_manager:
                return
            
            # Get all memories
            memories = await self._memory_manager.recall(
                MemoryQuery(
                    category=None,
                    tags=None,
                    start_time=None,
                    end_time=None,
                    limit=None,
                    offset=0
                )
            )
            
            # Group memories by category
            memories_by_category: Dict[MemoryCategory, List[MemoryEntry]] = {}
            for memory in memories:
                if memory.category not in memories_by_category:
                    memories_by_category[memory.category] = []
                memories_by_category[memory.category].append(memory)
            
            # Process each category
            for category, category_memories in memories_by_category.items():
                # Skip reflections
                if category == MemoryCategory.REFLECTIONS:
                    continue
                
                # Find similar memories
                similar_groups = await self._find_similar_memories(
                    category_memories
                )
                
                # Compress each group
                for group in similar_groups:
                    if len(group) > 1:
                        await self._compress_memory_group(group)
            
        except Exception as e:
            self.logger.error(f"Error compressing similar memories: {e}")
    
    async def _find_similar_memories(
        self,
        memories: List[MemoryEntry]
    ) -> List[List[MemoryEntry]]:
        """Find groups of similar memories."""
        try:
            similar_groups: List[List[MemoryEntry]] = []
            processed = set()
            
            for i, memory1 in enumerate(memories):
                if memory1.id in processed:
                    continue
                
                current_group = [memory1]
                processed.add(memory1.id)
                
                for memory2 in memories[i+1:]:
                    if memory2.id in processed:
                        continue
                    
                    # Calculate similarity
                    similarity = await self._calculate_similarity(
                        memory1, memory2
                    )
                    
                    if similarity >= self._compression_threshold:
                        current_group.append(memory2)
                        processed.add(memory2.id)
                
                if len(current_group) > 1:
                    similar_groups.append(current_group)
            
            return similar_groups
            
        except Exception as e:
            self.logger.error(f"Error finding similar memories: {e}")
            return []
    
    async def _calculate_similarity(
        self,
        memory1: MemoryEntry,
        memory2: MemoryEntry
    ) -> float:
        """Calculate similarity between two memories."""
        try:
            # Compare content
            content_similarity = SequenceMatcher(
                None,
                memory1.content,
                memory2.content
            ).ratio()
            
            # Compare metadata
            metadata_similarity = 0.0
            if memory1.metadata and memory2.metadata:
                common_keys = set(memory1.metadata.keys()) & set(memory2.metadata.keys())
                if common_keys:
                    metadata_similarity = sum(
                        1 for key in common_keys
                        if memory1.metadata[key] == memory2.metadata[key]
                    ) / len(common_keys)
            
            # Compare tags
            tag_similarity = 0.0
            if memory1.tags and memory2.tags:
                common_tags = set(memory1.tags) & set(memory2.tags)
                if common_tags:
                    tag_similarity = len(common_tags) / max(
                        len(memory1.tags),
                        len(memory2.tags)
                    )
            
            # Calculate weighted average
            return (
                content_similarity * 0.6 +
                metadata_similarity * 0.2 +
                tag_similarity * 0.2
            )
            
        except Exception as e:
            self.logger.error(f"Error calculating memory similarity: {e}")
            return 0.0
    
    async def _compress_memory_group(self, group: List[MemoryEntry]):
        """Compress a group of similar memories."""
        try:
            if not self._memory_manager or len(group) < 2:
                return
            
            # Sort by timestamp
            group.sort(key=lambda m: m.timestamp)
            
            # Create compressed memory
            compressed = MemoryEntry(
                category=group[0].category,
                content=group[0].content,  # Use first memory's content
                metadata={
                    "compressed_from": [m.id for m in group],
                    "original_count": len(group),
                    "compression_date": datetime.now().isoformat()
                },
                tags=set().union(*(m.tags or set() for m in group)),
                timestamp=group[0].timestamp  # Use first memory's timestamp
            )
            
            # Store compressed memory
            await self._memory_manager.remember(compressed)
            
            # Remove original memories
            for memory in group:
                await self._memory_manager.forget(memory.id)
            
            self.logger.info(
                f"Compressed {len(group)} memories into one"
            )
            
        except Exception as e:
            self.logger.error(f"Error compressing memory group: {e}")
    
    async def get_memory_status(self) -> Dict:
        """Get memory system status."""
        try:
            if not self._memory_manager:
                return {
                    "is_healthy": False,
                    "issues": ["Memory manager not available"]
                }
            
            # Get memory status
            status = await self._memory_manager.get_status()
            
            # Add service-specific metrics
            status.update({
                "compression_threshold": self._compression_threshold,
                "max_memories": self._max_memories,
                "last_cleanup": self._last_cleanup.isoformat() if self._last_cleanup else None,
                "next_cleanup": (
                    self._last_cleanup + self._cleanup_interval
                ).isoformat() if self._last_cleanup else None
            })
            
            return status
            
        except Exception as e:
            self.logger.error(f"Error getting memory status: {e}")
            return {
                "is_healthy": False,
                "issues": [f"Error getting status: {str(e)}"]
            }
    
    async def set_compression_threshold(self, threshold: float):
        """Set memory compression threshold."""
        try:
            if not 0 <= threshold <= 1:
                raise ValueError("Threshold must be between 0 and 1")
            
            self._compression_threshold = threshold
            self.logger.info(f"Compression threshold set to {threshold}")
            
        except Exception as e:
            self.logger.error(f"Error setting compression threshold: {e}")
    
    async def set_max_memories(self, max_memories: int):
        """Set maximum number of memories."""
        try:
            if max_memories < 0:
                raise ValueError("Maximum memories must be positive")
            
            self._max_memories = max_memories
            self.logger.info(f"Maximum memories set to {max_memories}")
            
        except Exception as e:
            self.logger.error(f"Error setting maximum memories: {e}")
    
    async def save_memory(self, plugin_id: str, data: Dict[str, Any]) -> None:
        """Save plugin memory to disk."""
        try:
            # Update in-memory data
            self.memory[plugin_id] = data
            
            # Save to disk
            file_path = self.data_dir / f"{plugin_id}.json"
            with open(file_path, "w") as f:
                json.dump(data, f, indent=2)
            
            self.logger.info(f"Saved memory for plugin {plugin_id}")
        except Exception as e:
            self.logger.error(f"Failed to save memory for plugin {plugin_id}: {e}")
            raise PluginError(f"Failed to save memory: {e}", PluginErrorType.RUNTIME_ERROR)
    
    async def load_memory(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Load plugin memory from disk."""
        try:
            # Check in-memory first
            if plugin_id in self.memory:
                return self.memory[plugin_id]
            
            # Load from disk
            file_path = self.data_dir / f"{plugin_id}.json"
            if not file_path.exists():
                return None
            
            with open(file_path) as f:
                data = json.load(f)
            
            # Update in-memory data
            self.memory[plugin_id] = data
            
            self.logger.info(f"Loaded memory for plugin {plugin_id}")
            return data
        except Exception as e:
            self.logger.error(f"Failed to load memory for plugin {plugin_id}: {e}")
            raise PluginError(f"Failed to load memory: {e}", PluginErrorType.RUNTIME_ERROR)
    
    async def delete_memory(self, plugin_id: str) -> None:
        """Delete plugin memory."""
        try:
            # Remove from memory
            self.memory.pop(plugin_id, None)
            
            # Remove from disk
            file_path = self.data_dir / f"{plugin_id}.json"
            if file_path.exists():
                file_path.unlink()
            
            self.logger.info(f"Deleted memory for plugin {plugin_id}")
        except Exception as e:
            self.logger.error(f"Failed to delete memory for plugin {plugin_id}: {e}")
            raise PluginError(f"Failed to delete memory: {e}", PluginErrorType.RUNTIME_ERROR)
    
    async def list_memories(self) -> List[str]:
        """List all plugin memories."""
        try:
            return [
                f.stem for f in self.data_dir.iterdir()
                if f.is_file() and f.suffix == ".json"
            ]
        except Exception as e:
            self.logger.error(f"Failed to list memories: {e}")
            raise PluginError(f"Failed to list memories: {e}", PluginErrorType.RUNTIME_ERROR)
    
    async def get_memory_size(self, plugin_id: str) -> int:
        """Get size of plugin memory in bytes."""
        try:
            file_path = self.data_dir / f"{plugin_id}.json"
            if not file_path.exists():
                return 0
            
            return file_path.stat().st_size
        except Exception as e:
            self.logger.error(f"Failed to get memory size for plugin {plugin_id}: {e}")
            raise PluginError(f"Failed to get memory size: {e}", PluginErrorType.RUNTIME_ERROR)
    
    async def get_total_memory_size(self) -> int:
        """Get total size of all plugin memories in bytes."""
        try:
            total_size = 0
            for file_path in self.data_dir.iterdir():
                if file_path.is_file() and file_path.suffix == ".json":
                    total_size += file_path.stat().st_size
            return total_size
        except Exception as e:
            self.logger.error(f"Failed to get total memory size: {e}")
            raise PluginError(f"Failed to get total memory size: {e}", PluginErrorType.RUNTIME_ERROR)
    
    async def backup_memory(self, plugin_id: str) -> None:
        """Create a backup of plugin memory."""
        try:
            file_path = self.data_dir / f"{plugin_id}.json"
            if not file_path.exists():
                return
            
            # Create backup with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = self.data_dir / f"{plugin_id}_{timestamp}.json"
            
            # Copy file
            with open(file_path) as src, open(backup_path, "w") as dst:
                dst.write(src.read())
            
            self.logger.info(f"Created backup for plugin {plugin_id}")
        except Exception as e:
            self.logger.error(f"Failed to backup memory for plugin {plugin_id}: {e}")
            raise PluginError(f"Failed to backup memory: {e}", PluginErrorType.RUNTIME_ERROR)
    
    async def restore_memory(self, plugin_id: str, backup_timestamp: str) -> None:
        """Restore plugin memory from backup."""
        try:
            backup_path = self.data_dir / f"{plugin_id}_{backup_timestamp}.json"
            if not backup_path.exists():
                raise PluginError("Backup not found", PluginErrorType.NOT_FOUND)
            
            # Restore from backup
            file_path = self.data_dir / f"{plugin_id}.json"
            with open(backup_path) as src, open(file_path, "w") as dst:
                dst.write(src.read())
            
            # Update in-memory data
            with open(file_path) as f:
                self.memory[plugin_id] = json.load(f)
            
            self.logger.info(f"Restored memory for plugin {plugin_id}")
        except Exception as e:
            self.logger.error(f"Failed to restore memory for plugin {plugin_id}: {e}")
            raise PluginError(f"Failed to restore memory: {e}", PluginErrorType.RUNTIME_ERROR)
    
    async def list_backups(self, plugin_id: str) -> List[str]:
        """List all backups for a plugin."""
        try:
            backups = []
            for file_path in self.data_dir.iterdir():
                if (file_path.is_file() and 
                    file_path.stem.startswith(f"{plugin_id}_") and 
                    file_path.suffix == ".json"):
                    timestamp = file_path.stem.split("_")[-1]
                    backups.append(timestamp)
            return sorted(backups)
        except Exception as e:
            self.logger.error(f"Failed to list backups for plugin {plugin_id}: {e}")
            raise PluginError(f"Failed to list backups: {e}", PluginErrorType.RUNTIME_ERROR)

# Create singleton instance
memory_service = MemoryService() 