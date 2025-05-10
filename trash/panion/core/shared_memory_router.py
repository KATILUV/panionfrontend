"""
Shared Memory Router
Manages memory storage and retrieval across different agents.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict

from .plugin_types import Memory, MemoryType, PluginError

logger = logging.getLogger(__name__)

@dataclass
class MemoryPacket:
    """Structured memory packet for agent communication"""
    id: str
    content: Any
    type: MemoryType
    source_agent: str
    target_agents: Set[str]
    created_at: datetime
    expires_at: Optional[datetime] = None
    priority: int = 0
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
            
    def to_dict(self) -> Dict[str, Any]:
        """Convert packet to dictionary format"""
        return {
            "id": self.id,
            "content": self.content,
            "type": self.type.value,
            "source_agent": self.source_agent,
            "target_agents": list(self.target_agents),
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "priority": self.priority,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MemoryPacket':
        """Create packet from dictionary"""
        return cls(
            id=data["id"],
            content=data["content"],
            type=MemoryType(data["type"]),
            source_agent=data["source_agent"],
            target_agents=set(data["target_agents"]),
            created_at=datetime.fromisoformat(data["created_at"]),
            expires_at=datetime.fromisoformat(data["expires_at"]) if data.get("expires_at") else None,
            priority=data.get("priority", 0),
            metadata=data.get("metadata", {})
        )

class SharedMemoryRouter:
    """Routes memory packets between agents and manages memory storage"""
    
    def __init__(
        self,
        memory_dir: Path = Path("data/memory"),
        default_ttl: timedelta = timedelta(days=7),
        max_packets_per_agent: int = 1000,
        cache_size: int = 1000,
        cache_ttl: timedelta = timedelta(minutes=5)
    ):
        self.memory_dir = memory_dir
        self.default_ttl = default_ttl
        self.max_packets_per_agent = max_packets_per_agent
        self.cache_size = cache_size
        self.cache_ttl = cache_ttl
        self._cache: Dict[str, Tuple[Any, datetime]] = {}
        
        # Initialize directories
        self.memory_dir.mkdir(parents=True, exist_ok=True)
        self.goal_memory_dir = self.memory_dir / "goals"
        self.plugin_memory_dir = self.memory_dir / "plugins"
        self.agent_memory_dir = self.memory_dir / "agents"
        
        for dir_path in [self.goal_memory_dir, self.plugin_memory_dir, self.agent_memory_dir]:
            dir_path.mkdir(exist_ok=True)
            
    def _get_from_cache(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired."""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if datetime.now() - timestamp < self.cache_ttl:
                return value
            del self._cache[key]
        return None
        
    def _add_to_cache(self, key: str, value: Any) -> None:
        """Add value to cache with timestamp."""
        # Remove oldest entry if cache is full
        if len(self._cache) >= self.cache_size:
            oldest_key = min(
                self._cache.keys(),
                key=lambda k: self._cache[k][1]
            )
            del self._cache[oldest_key]
            
        self._cache[key] = (value, datetime.now())
        
    def store_memory(
        self,
        packet: MemoryPacket,
        goal_id: Optional[str] = None,
        plugin_id: Optional[str] = None
    ) -> None:
        """
        Store a memory packet
        
        Args:
            packet: Memory packet to store
            goal_id: Optional goal ID for goal-related memory
            plugin_id: Optional plugin ID for plugin-related memory
        """
        # Determine storage location
        if goal_id:
            storage_dir = self.goal_memory_dir / goal_id
        elif plugin_id:
            storage_dir = self.plugin_memory_dir / plugin_id
        else:
            storage_dir = self.agent_memory_dir / packet.source_agent
            
        storage_dir.mkdir(exist_ok=True)
        
        # Store packet
        packet_file = storage_dir / f"{packet.id}.json"
        with open(packet_file, 'w') as f:
            json.dump(packet.to_dict(), f, indent=2)
            
        logger.info(f"Stored memory packet {packet.id} from {packet.source_agent}")
        
    def fetch_related_memories(
        self,
        goal_id: Optional[str] = None,
        plugin_id: Optional[str] = None,
        memory_type: Optional[MemoryType] = None,
        after: Optional[datetime] = None,
        before: Optional[datetime] = None,
        limit: Optional[int] = None
    ) -> List[MemoryPacket]:
        """Fetch memories related to a goal or plugin."""
        # Try cache first
        cache_key = f"{goal_id or plugin_id}_{memory_type.value if memory_type else 'all'}"
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached
            
        # Determine search directory
        if goal_id:
            search_dir = self.goal_memory_dir / goal_id
        elif plugin_id:
            search_dir = self.plugin_memory_dir / plugin_id
        else:
            raise PluginError("Must specify either goal_id or plugin_id")
            
        if not search_dir.exists():
            return []
            
        # Collect matching packets
        packets = []
        for packet_file in search_dir.glob("*.json"):
            try:
                with open(packet_file, 'r') as f:
                    packet_data = json.load(f)
                    packet = MemoryPacket.from_dict(packet_data)
                    
                    # Apply filters
                    if memory_type and packet.type != memory_type:
                        continue
                    if after and packet.created_at < after:
                        continue
                    if before and packet.created_at > before:
                        continue
                        
                    packets.append(packet)
                    
            except Exception as e:
                logger.error(f"Error reading memory packet {packet_file}: {str(e)}")
                continue
                
        # Sort by priority and creation time
        packets.sort(key=lambda p: (-p.priority, p.created_at))
        
        # Apply limit
        if limit:
            packets = packets[:limit]
            
        # Cache result
        self._add_to_cache(cache_key, packets)
            
        return packets
    
    def cleanup_expired_memories(self) -> None:
        """Remove expired memory packets"""
        now = datetime.now()
        
        for memory_dir in [self.goal_memory_dir, self.plugin_memory_dir, self.agent_memory_dir]:
            for packet_file in memory_dir.rglob("*.json"):
                try:
                    with open(packet_file, 'r') as f:
                        packet_data = json.load(f)
                        packet = MemoryPacket.from_dict(packet_data)
                        
                        if packet.expires_at and packet.expires_at < now:
                            packet_file.unlink()
                            logger.info(f"Removed expired memory packet {packet.id}")
                            
                except Exception as e:
                    logger.error(f"Error processing memory packet {packet_file}: {str(e)}")
                    
    def get_agent_memory_stats(self, agent_id: str) -> Dict[str, Any]:
        """Get memory statistics for an agent"""
        agent_dir = self.agent_memory_dir / agent_id
        if not agent_dir.exists():
            return {
                "total_packets": 0,
                "memory_types": {},
                "oldest_packet": None,
                "newest_packet": None
            }
            
        stats = {
            "total_packets": 0,
            "memory_types": {},
            "oldest_packet": None,
            "newest_packet": None
        }
        
        for packet_file in agent_dir.glob("*.json"):
            try:
                with open(packet_file, 'r') as f:
                    packet_data = json.load(f)
                    packet = MemoryPacket.from_dict(packet_data)
                    
                    stats["total_packets"] += 1
                    stats["memory_types"][packet.type.value] = stats["memory_types"].get(packet.type.value, 0) + 1
                    
                    if not stats["oldest_packet"] or packet.created_at < stats["oldest_packet"]:
                        stats["oldest_packet"] = packet.created_at
                    if not stats["newest_packet"] or packet.created_at > stats["newest_packet"]:
                        stats["newest_packet"] = packet.created_at
                        
            except Exception as e:
                logger.error(f"Error processing memory packet {packet_file}: {str(e)}")
                
        return stats 
    
    def store_reflection(
        self,
        goal_id: str,
        reflection: Dict[str, Any],
        agent_id: str,
        priority: int = 0
    ) -> None:
        """
        Store a reflection about a goal
        
        Args:
            goal_id: ID of the goal being reflected on
            reflection: Reflection content dictionary
            agent_id: ID of agent creating reflection
            priority: Optional priority level (higher = more important)
        """
        # Create reflection packet
        packet = MemoryPacket(
            id=f"reflection_{goal_id}_{datetime.now().isoformat()}",
            content=reflection,
            type=MemoryType.REFLECTION,
            source_agent=agent_id,
            target_agents={"system"},
            created_at=datetime.now(),
            priority=priority,
            metadata={
                "goal_id": goal_id,
                "reflection_type": reflection.get("type", "general"),
                "subtask_count": len(reflection.get("subtask_results", [])),
                "plugin_updates": len(reflection.get("plugin_updates", []))
            }
        )
        
        # Store in goal-specific memory
        self.store_memory(packet, goal_id=goal_id)
        
        logger.info(
            f"Stored reflection for goal {goal_id} "
            f"from agent {agent_id}"
        )
    
    def get_goal_reflections(
        self,
        goal_id: str,
        limit: Optional[int] = None,
        after: Optional[datetime] = None
    ) -> List[MemoryPacket]:
        """
        Get reflections for a goal
        
        Args:
            goal_id: ID of goal to get reflections for
            limit: Optional maximum number of reflections to return
            after: Optional start time filter
            
        Returns:
            List of reflection memory packets
        """
        return self.fetch_related_memories(
            goal_id=goal_id,
            memory_type=MemoryType.REFLECTION,
            after=after,
            limit=limit
        )
    
    def get_agent_reflections(
        self,
        agent_id: str,
        limit: Optional[int] = None,
        after: Optional[datetime] = None
    ) -> List[MemoryPacket]:
        """
        Get reflections created by an agent
        
        Args:
            agent_id: ID of agent to get reflections for
            limit: Optional maximum number of reflections to return
            after: Optional start time filter
            
        Returns:
            List of reflection memory packets
        """
        agent_dir = self.agent_memory_dir / agent_id
        if not agent_dir.exists():
            return []
            
        packets = []
        for packet_file in agent_dir.glob("*.json"):
            try:
                with open(packet_file, 'r') as f:
                    packet_data = json.load(f)
                    packet = MemoryPacket.from_dict(packet_data)
                    
                    if packet.type != MemoryType.REFLECTION:
                        continue
                    if after and packet.created_at < after:
                        continue
                        
                    packets.append(packet)
                    
            except Exception as e:
                logger.error(f"Error reading reflection {packet_file}: {str(e)}")
                continue
                
        # Sort by priority and creation time
        packets.sort(key=lambda p: (-p.priority, p.created_at))
        
        # Apply limit
        if limit:
            packets = packets[:limit]
            
        return packets 