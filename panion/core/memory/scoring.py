"""
Memory Scoring System
Manages memory importance scoring, decay, and forgetting mechanisms.
"""

import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import math
import json
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class MemoryScore:
    """Represents a memory's importance score and metadata."""
    memory_id: str
    base_score: float
    current_score: float
    last_accessed: datetime
    access_count: int = 0
    tags: Set[str] = field(default_factory=set)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

class MemoryScoringSystem:
    """Manages memory importance scoring and forgetting."""
    
    def __init__(self, config_path: str = "config/episodic_memory_config.yaml"):
        self.logger = logging.getLogger(__name__)
        self.scores: Dict[str, MemoryScore] = {}
        self.archive_dir = Path("data/memory_archives")
        self.archive_dir.mkdir(parents=True, exist_ok=True)
        
        # Load configuration
        self.config = self._load_config(config_path)
        
        # Scoring weights
        self.weights = {
            "recency": 0.3,
            "frequency": 0.3,
            "relevance": 0.2,
            "impact": 0.2
        }
        
        # Decay parameters
        self.decay_rate = 0.1  # Score decay per day
        self.min_score = 0.1   # Minimum score before forgetting
        self.max_age_days = self.config.get("memory_retention_days", 30)
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load scoring configuration."""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"Error loading config: {e}")
            return {}
    
    def calculate_score(self, memory: Dict[str, Any]) -> float:
        """Calculate importance score for a memory.
        
        Args:
            memory: Memory data to score
            
        Returns:
            float: Calculated importance score
        """
        # Get base components
        recency = self._calculate_recency_score(memory)
        frequency = self._calculate_frequency_score(memory)
        relevance = self._calculate_relevance_score(memory)
        impact = self._calculate_impact_score(memory)
        
        # Calculate weighted score
        score = (
            self.weights["recency"] * recency +
            self.weights["frequency"] * frequency +
            self.weights["relevance"] * relevance +
            self.weights["impact"] * impact
        )
        
        return min(max(score, 0.0), 1.0)
    
    def _calculate_recency_score(self, memory: Dict[str, Any]) -> float:
        """Calculate recency component of score."""
        last_accessed = memory.get("last_accessed", memory.get("created_at"))
        if isinstance(last_accessed, str):
            last_accessed = datetime.fromisoformat(last_accessed)
        
        age_days = (datetime.now() - last_accessed).days
        return math.exp(-self.decay_rate * age_days)
    
    def _calculate_frequency_score(self, memory: Dict[str, Any]) -> float:
        """Calculate frequency component of score."""
        access_count = memory.get("access_count", 0)
        return min(access_count / 10.0, 1.0)  # Cap at 10 accesses
    
    def _calculate_relevance_score(self, memory: Dict[str, Any]) -> float:
        """Calculate relevance component of score."""
        tags = memory.get("tags", [])
        metadata = memory.get("metadata", {})
        
        # Check for important tags
        important_tags = {"critical", "important", "key", "core"}
        tag_score = len(set(tags) & important_tags) / len(important_tags)
        
        # Check metadata relevance
        relevance_score = metadata.get("relevance", 0.5)
        
        return (tag_score + relevance_score) / 2
    
    def _calculate_impact_score(self, memory: Dict[str, Any]) -> float:
        """Calculate impact component of score."""
        metadata = memory.get("metadata", {})
        
        # Get impact factors
        connected_goals = len(metadata.get("connected_goals", []))
        memory_importance = metadata.get("importance", 0.5)
        time_recency = self._calculate_recency_score(memory)
        
        # Calculate weighted impact
        impact_weights = self.config.get("impact_score_weights", {
            "connected_goals": 0.4,
            "memory_importance": 0.3,
            "time_recency": 0.3
        })
        
        return (
            impact_weights["connected_goals"] * min(connected_goals / 5.0, 1.0) +
            impact_weights["memory_importance"] * memory_importance +
            impact_weights["time_recency"] * time_recency
        )
    
    def update_score(self, memory_id: str, memory: Dict[str, Any]) -> None:
        """Update score for a memory.
        
        Args:
            memory_id: ID of the memory
            memory: Memory data
        """
        # Calculate new score
        new_score = self.calculate_score(memory)
        
        # Update or create score entry
        if memory_id in self.scores:
            self.scores[memory_id].current_score = new_score
            self.scores[memory_id].last_accessed = datetime.now()
            self.scores[memory_id].access_count += 1
            self.scores[memory_id].updated_at = datetime.now()
        else:
            self.scores[memory_id] = MemoryScore(
                memory_id=memory_id,
                base_score=new_score,
                current_score=new_score,
                last_accessed=datetime.now(),
                access_count=1,
                tags=set(memory.get("tags", [])),
                metadata=memory.get("metadata", {})
            )
    
    def apply_decay(self) -> None:
        """Apply time-based decay to all memory scores."""
        now = datetime.now()
        
        for memory_id, score in self.scores.items():
            # Calculate days since last update
            days = (now - score.updated_at).days
            
            if days > 0:
                # Apply decay
                decay_factor = math.exp(-self.decay_rate * days)
                score.current_score = score.base_score * decay_factor
                score.updated_at = now
                
                # Check if memory should be forgotten
                if score.current_score < self.min_score:
                    self._forget_memory(memory_id)
    
    def _forget_memory(self, memory_id: str) -> None:
        """Archive a memory that has fallen below importance threshold.
        
        Args:
            memory_id: ID of the memory to forget
        """
        if memory_id not in self.scores:
            return
        
        try:
            # Get memory data
            score = self.scores[memory_id]
            
            # Create archive entry
            archive_entry = {
                "memory_id": memory_id,
                "base_score": score.base_score,
                "final_score": score.current_score,
                "access_count": score.access_count,
                "tags": list(score.tags),
                "metadata": score.metadata,
                "created_at": score.created_at.isoformat(),
                "archived_at": datetime.now().isoformat()
            }
            
            # Save to archive
            archive_file = self.archive_dir / f"{memory_id}.json"
            with open(archive_file, 'w') as f:
                json.dump(archive_entry, f, indent=2)
            
            # Remove from active scores
            del self.scores[memory_id]
            
            self.logger.info(f"Archived memory {memory_id} with final score {score.current_score}")
            
        except Exception as e:
            self.logger.error(f"Error archiving memory {memory_id}: {e}")
    
    def get_important_memories(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most important memories.
        
        Args:
            limit: Maximum number of memories to return
            
        Returns:
            List of important memories with their scores
        """
        # Sort memories by score
        sorted_memories = sorted(
            self.scores.items(),
            key=lambda x: x[1].current_score,
            reverse=True
        )
        
        return [
            {
                "memory_id": memory_id,
                "score": score.current_score,
                "access_count": score.access_count,
                "tags": list(score.tags),
                "last_accessed": score.last_accessed.isoformat()
            }
            for memory_id, score in sorted_memories[:limit]
        ]
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """Get statistics about memory scoring.
        
        Returns:
            Dictionary containing memory statistics
        """
        return {
            "total_memories": len(self.scores),
            "average_score": sum(s.current_score for s in self.scores.values()) / len(self.scores) if self.scores else 0,
            "score_distribution": {
                "high": len([s for s in self.scores.values() if s.current_score > 0.7]),
                "medium": len([s for s in self.scores.values() if 0.3 <= s.current_score <= 0.7]),
                "low": len([s for s in self.scores.values() if s.current_score < 0.3])
            },
            "archived_count": len(list(self.archive_dir.glob("*.json")))
        }

# Create global instance
memory_scoring_system = MemoryScoringSystem() 