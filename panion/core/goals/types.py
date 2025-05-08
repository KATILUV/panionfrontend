"""
Goal Types
Defines types and enums for the goals system.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime

class GoalStatus(Enum):
    """Goal execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"

class GoalPriority(Enum):
    """Goal priority levels."""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class GoalMetadata:
    """Goal metadata."""
    name: str
    description: str
    priority: GoalPriority = GoalPriority.MEDIUM
    timeout: int = 300  # 5 minutes
    retries: int = 3
    dependencies: List[str] = None
    created_at: datetime = None
    updated_at: datetime = None
    last_executed: datetime = None
    execution_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    average_execution_time: float = 0.0

@dataclass
class GoalResult:
    """Goal execution result."""
    goal_id: str
    status: GoalStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    error: Optional[str] = None
    output: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None 