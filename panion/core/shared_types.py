"""
Shared Types and Interfaces
Contains shared types and interfaces used across the codebase to break circular dependencies.
"""

from typing import Dict, List, Optional, Set, Any, Protocol, runtime_checkable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

class GoalType(Enum):
    """Types of goals that can be processed."""
    PLUGIN_CREATION = "plugin_creation"
    PLUGIN_TESTING = "plugin_testing"
    PLUGIN_UPDATE = "plugin_update"
    SYSTEM_MAINTENANCE = "system_maintenance"
    RESOURCE_MANAGEMENT = "resource_management"

class RoleType(Enum):
    """Types of agent roles."""
    PLANNER = "planner"
    EXECUTOR = "executor"
    REFINER = "refiner"
    TESTER = "tester"
    SUPERVISOR = "supervisor"

@dataclass
class AgentCapabilities:
    """Capabilities of an agent."""
    skills: Dict[str, float]  # skill -> confidence score
    plugins: Set[str]  # Set of plugin IDs the agent can use
    max_concurrent_tasks: int
    resource_limits: Dict[str, float]  # resource type -> limit

@dataclass
class AgentState:
    """Current state of an agent."""
    status: str  # idle, busy, error
    current_tasks: List[str]
    resource_usage: Dict[str, float]
    last_heartbeat: datetime
    error_count: int = 0
    retry_count: int = 0

@runtime_checkable
class IAgentSpawner(Protocol):
    """Interface for agent spawning operations."""
    
    async def spawn_agent(self, agent_type: str, config: Dict[str, Any]) -> str:
        """Spawn a new agent."""
        raise NotImplementedError()
    
    async def terminate_agent(self, agent_id: str) -> bool:
        """Terminate an agent."""
        raise NotImplementedError()

@runtime_checkable
class IPluginManager(Protocol):
    """Interface for plugin management operations."""
    
    def register_plugin(self, plugin_id: str, plugin_data: Dict[str, Any]) -> bool:
        """Register a new plugin."""
        raise NotImplementedError()
    
    def unregister_plugin(self, plugin_id: str) -> bool:
        """Unregister a plugin."""
        raise NotImplementedError()
    
    def get_plugin(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get plugin data."""
        raise NotImplementedError()

@runtime_checkable
class IGoalScheduler(Protocol):
    """Interface for goal scheduling operations."""
    
    def schedule_goal(self, goal_id: str, priority: int) -> bool:
        """Schedule a goal for execution."""
        raise NotImplementedError()
    
    def cancel_goal(self, goal_id: str) -> bool:
        """Cancel a scheduled goal."""
        raise NotImplementedError()
    
    def get_goal_status(self, goal_id: str) -> Optional[str]:
        """Get the status of a goal."""
        raise NotImplementedError() 