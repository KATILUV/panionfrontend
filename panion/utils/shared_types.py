"""Shared type definitions to prevent circular imports."""
from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime

class GoalStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ActionStatus(Enum):
    PENDING = "pending"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TeamState(Enum):
    FORMING = "forming"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    DISBANDED = "disbanded"
    VOTING = "voting"

class AgentRole(Enum):
    LEADER = "leader"
    SPECIALIST = "specialist"
    SUPPORT = "support"
    OBSERVER = "observer"
    VOTER = "voter"

class MissionType(Enum):
    DEVELOPMENT = "development"
    RESEARCH = "research"
    ANALYSIS = "analysis"
    CREATIVE = "creative"
    OPERATIONAL = "operational"
    EMERGENCY = "emergency"

@dataclass
class Goal:
    """Goal definition shared across systems."""
    goal_id: str
    description: str
    priority: int  # 1-5, higher is more important
    status: GoalStatus
    created_at: str
    deadline: Optional[str] = None
    dependencies: List[str] = field(default_factory=list)
    actions: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Action:
    """Action definition shared across systems."""
    action_id: str
    goal_id: str
    description: str
    status: ActionStatus
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict) 