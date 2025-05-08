"""
Panion Capability System
Unified capability management and evolution system.
"""

import logging
from typing import Dict, Any, List, Optional, Set, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import json
from pathlib import Path
import uuid
from enum import Enum
import threading
import time

from .panion_errors import PluginError, ErrorSeverity
from .panion_config import config_manager
from .base import BaseComponent, ComponentMetadata, ComponentState
from .manager import BaseManager, ManagerMetadata
from .plugin.base import Plugin
from .utils import with_connection_pool, cache_result

class CapabilityCategory(Enum):
    """Categories for system capabilities."""
    CORE = "core"              # Core functionalities
    PLUGIN = "plugin"          # Plugin capabilities
    MEMORY = "memory"          # Memory-related features
    UI = "ui"                  # UI/Interface features
    CONVERSATION = "conversation"  # Conversation abilities
    ISSUE = "issue"            # Known issues/limitations
    STATUS = "status"          # System status information

@dataclass
class Capability:
    """Represents a system capability."""
    name: str
    category: CapabilityCategory
    description: str
    version: str
    dependencies: List[str] = field(default_factory=list)
    required_skills: List[str] = field(default_factory=list)
    status: str = "active"  # active, deprecated, planned
    added_date: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)
    examples: List[str] = field(default_factory=list)
    limitations: List[str] = field(default_factory=list)
    id: str = field(default_factory=lambda: str(uuid.uuid4()))

@dataclass
class CapabilityGap:
    """Identified capability gap."""
    name: str
    description: str
    required_skills: List[str]
    priority: float
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    discovered_at: datetime = field(default_factory=datetime.now)
    status: str = "identified"  # identified, composing, testing, registered, failed
    plugin_id: Optional[str] = None
    error: Optional[str] = None

@dataclass
class CapabilityProposal:
    """Agent-proposed capability upgrade."""
    agent_id: str
    name: str
    description: str
    benefits: List[str]
    required_skills: List[str]
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    proposed_at: datetime = field(default_factory=datetime.now)
    status: str = "proposed"  # proposed, approved, rejected, implemented
    feedback: Optional[str] = None

class CapabilityManager(BaseManager[Capability]):
    """Manages system capabilities and their evolution."""
    
    def __init__(self):
        metadata = ManagerMetadata(
            name="CapabilityManager",
            version="1.0.0",
            description="Manages Panion capabilities",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            dependencies={},
            config_schema={},
            managed_type=Capability,
            max_items=None,  # No limit on number of capabilities
            auto_cleanup=True,
            cleanup_interval=3600.0  # Cleanup every hour
        )
        super().__init__(metadata)
        
        self.logger = logging.getLogger(__name__)
        self.data_dir = Path("data/capabilities")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Capability storage
        self.capability_gaps: Dict[str, CapabilityGap] = {}
        self.capability_proposals: Dict[str, CapabilityProposal] = {}
        
        # Write buffer system
        self._write_buffer: Dict[str, Dict[str, Any]] = {}
        self._buffer_lock = threading.Lock()
        self._is_dirty = False
        self._last_save = datetime.now()
        self._save_interval = timedelta(seconds=30)  # 30 seconds
        self._save_task = None
        self._running = True
        
        # Performance tracking
        self._capability_operations: Dict[str, List[Dict[str, Any]]] = {}
        self._execution_times: Dict[str, List[float]] = {}
        self._last_operation: Dict[str, datetime] = {}
        
        # Circuit breaker settings
        self._failure_threshold = 5
        self._reset_timeout = timedelta(minutes=5)
        self._circuit_states: Dict[str, CircuitState] = {}
        
        # Caching
        self._capability_cache: Dict[str, Tuple[Capability, datetime]] = {}
        self._gap_cache: Dict[str, Tuple[CapabilityGap, datetime]] = {}
        self._proposal_cache: Dict[str, Tuple[CapabilityProposal, datetime]] = {}
        self._cache_ttl = timedelta(minutes=5)
        self._cache_size = 1000

    def _mark_dirty(self, capability_id: str, capability_data: Dict[str, Any]) -> None:
        """Mark capability data as dirty and add to write buffer."""
        with self._buffer_lock:
            self._write_buffer[capability_id] = capability_data
            self._is_dirty = True
            
            # Invalidate caches
            if capability_id in self._capability_cache:
                del self._capability_cache[capability_id]
            if capability_id in self._gap_cache:
                del self._gap_cache[capability_id]
            if capability_id in self._proposal_cache:
                del self._proposal_cache[capability_id]

    async def _flush_buffer(self) -> None:
        """Flush the write buffer to disk."""
        if not self._is_dirty:
            return
            
        async with self._operation_lock:
            try:
                with self._buffer_lock:
                    # Save buffered changes
                    for capability_id, capability_data in self._write_buffer.items():
                        file_path = self.data_dir / f"{capability_id}.json"
                        with open(file_path, 'w') as f:
                            json.dump(capability_data, f)
                    
                    self._write_buffer.clear()
                    self._is_dirty = False
                    self._last_save = datetime.now()
            except Exception as e:
                self.logger.error(f"Error saving capability data: {e}")
                # Keep buffer if save fails
                self._is_dirty = True

    @with_connection_pool("capability_db")
    @cache_result(ttl_seconds=300)
    async def get_capability(self, capability_id: str) -> Optional[Capability]:
        """Get capability information with caching."""
        # Check cache first
        if capability_id in self._capability_cache:
            capability, timestamp = self._capability_cache[capability_id]
            if datetime.now() - timestamp < self._cache_ttl:
                return capability
        
        # Get from storage
        file_path = self.data_dir / f"{capability_id}.json"
        if file_path.exists():
            with open(file_path, 'r') as f:
                data = json.load(f)
                capability = Capability(**data)
                
                # Update cache
                self._capability_cache[capability_id] = (capability, datetime.now())
                
                # Trim cache if needed
                if len(self._capability_cache) > self._cache_size:
                    oldest_key = min(
                        self._capability_cache.keys(),
                        key=lambda k: self._capability_cache[k][1]
                    )
                    del self._capability_cache[oldest_key]
                
                return capability
        
        return None

    @with_connection_pool("capability_db")
    @cache_result(ttl_seconds=300)
    async def get_capability_gap(self, gap_id: str) -> Optional[CapabilityGap]:
        """Get capability gap with caching."""
        # Check cache first
        if gap_id in self._gap_cache:
            gap, timestamp = self._gap_cache[gap_id]
            if datetime.now() - timestamp < self._cache_ttl:
                return gap
        
        # Get from storage
        gap = self.capability_gaps.get(gap_id)
        
        # Update cache
        if gap:
            self._gap_cache[gap_id] = (gap, datetime.now())
            
            # Trim cache if needed
            if len(self._gap_cache) > self._cache_size:
                oldest_key = min(
                    self._gap_cache.keys(),
                    key=lambda k: self._gap_cache[k][1]
                )
                del self._gap_cache[oldest_key]
        
        return gap

    @with_connection_pool("capability_db")
    @cache_result(ttl_seconds=300)
    async def get_capability_proposal(self, proposal_id: str) -> Optional[CapabilityProposal]:
        """Get capability proposal with caching."""
        # Check cache first
        if proposal_id in self._proposal_cache:
            proposal, timestamp = self._proposal_cache[proposal_id]
            if datetime.now() - timestamp < self._cache_ttl:
                return proposal
        
        # Get from storage
        proposal = self.capability_proposals.get(proposal_id)
        
        # Update cache
        if proposal:
            self._proposal_cache[proposal_id] = (proposal, datetime.now())
            
            # Trim cache if needed
            if len(self._proposal_cache) > self._cache_size:
                oldest_key = min(
                    self._proposal_cache.keys(),
                    key=lambda k: self._proposal_cache[k][1]
                )
                del self._proposal_cache[oldest_key]
        
        return proposal

    async def add_capability(self, capability: Capability) -> bool:
        """Add a capability with performance tracking and circuit breaker."""
        start_time = time.time()
        
        try:
            # Check circuit breaker
            if self._circuit_states.get(capability.id) == CircuitState.OPEN:
                if datetime.now() - self._last_operation.get(capability.id, datetime.min) > self._reset_timeout:
                    self._circuit_states[capability.id] = CircuitState.HALF_OPEN
                else:
                    raise CapabilityError(f"Circuit breaker open for capability {capability.id}")
            
            # Record operation start
            operation = {
                'type': 'add_capability',
                'capability': capability.dict(),
                'timestamp': datetime.now().isoformat(),
                'start_time': start_time
            }
            self._capability_operations.setdefault(capability.id, []).append(operation)
            
            try:
                # Add capability
                self._items[capability.id] = capability
                
                # Record operation end
                operation_time = time.time() - start_time
                operation['duration'] = operation_time
                operation['end_time'] = time.time()
                operation['success'] = True
                
                self._execution_times.setdefault(capability.id, []).append(operation_time)
                self._last_operation[capability.id] = datetime.now()
                
                # Reset circuit breaker on success
                if self._circuit_states.get(capability.id) == CircuitState.HALF_OPEN:
                    self._circuit_states[capability.id] = CircuitState.CLOSED
                
                # Add to write buffer
                self._mark_dirty(capability.id, capability.dict())
                
                # Only save if enough time has passed
                if datetime.now() - self._last_save >= self._save_interval:
                    await self._flush_buffer()
                
                return True
                
            except Exception as e:
                # Update failure metrics
                if capability.id in self._circuit_states:
                    self._circuit_states[capability.id] = CircuitState.OPEN
                
                self.logger.error(f"Error adding capability {capability.id}: {e}")
                raise CapabilityError(f"Error adding capability {capability.id}: {str(e)}")
            
        except Exception as e:
            self.logger.error(f"Error in capability addition for {capability.id}: {e}")
            raise CapabilityError(f"Error in capability addition for {capability.id}: {str(e)}")

    @cache_result(ttl_seconds=300)
    async def get_capability_metrics(self, capability_id: str) -> Dict[str, Any]:
        """Get metrics about capability operations."""
        if capability_id not in self._execution_times:
            return {
                'total_operations': 0,
                'average_duration': 0.0,
                'min_duration': 0.0,
                'max_duration': 0.0,
                'last_operation': None
            }
        
        times = self._execution_times[capability_id]
        return {
            'total_operations': len(times),
            'average_duration': sum(times) / len(times),
            'min_duration': min(times),
            'max_duration': max(times),
            'last_operation': self._last_operation.get(capability_id)
        }

    async def cleanup_old_capabilities(self, max_age: timedelta = timedelta(days=30)) -> None:
        """Clean up old capabilities."""
        cutoff = datetime.now() - max_age
        for capability_id, capability in list(self._items.items()):
            if capability.created_at < cutoff:
                del self._items[capability_id]
                self._mark_dirty(capability_id, None)  # Mark for deletion
                
                # Clean up related files
                file_path = self.data_dir / f"{capability_id}.json"
                if file_path.exists():
                    file_path.unlink()

# Create singleton instance
capability_manager = CapabilityManager() 