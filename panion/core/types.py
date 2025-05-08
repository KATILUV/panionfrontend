"""
Common types used across the codebase.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Set
from datetime import datetime
from enum import Enum

@dataclass
class SubGoal:
    """Represents a subgoal in the decomposition."""
    id: str
    description: str
    parent_id: str
    dependencies: List[str] = field(default_factory=list)
    required_plugins: List[str] = field(default_factory=list)
    estimated_duration: float = 0.0
    priority: float = 0.5
    status: str = "pending"
    created_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    test_cases: List[Dict[str, Any]] = field(default_factory=list)
    retry_strategy: Optional[Dict[str, Any]] = None

@dataclass
class DecompositionResult:
    """Result of goal decomposition."""
    goal_id: str
    subgoals: List[SubGoal]
    strategy: str  # Using string to avoid circular imports
    confidence: float
    estimated_duration: float
    required_plugins: Set[str]
    metadata: Dict[str, Any] = field(default_factory=dict)
    test_suite: Dict[str, Any] = field(default_factory=dict)

class RetryStrategy(Enum):
    """Strategy for retrying failed tasks."""
    LINEAR = "linear"           # Fixed delay between retries
    EXPONENTIAL = "exponential" # Exponential backoff
    ADAPTIVE = "adaptive"       # Adjust based on failure patterns
    SMART = "smart"            # Use ML to predict optimal retry timing

@dataclass
class RetryContext:
    """Context for retry operations."""
    task_id: str
    subgoal_id: str
    attempt: int = 0
    max_attempts: int = 3
    last_error: Optional[str] = None
    last_error_time: Optional[datetime] = None
    retry_delay: float = 5.0  # seconds
    strategy: RetryStrategy = RetryStrategy.LINEAR
    metadata: Dict[str, Any] = field(default_factory=dict)
    synthesized_plugin: Optional[str] = None  # ID of synthesized plugin if any

@dataclass
class FailureAnalysis:
    """Analysis of task failures."""
    task_id: str
    subgoal_id: str
    error_type: str
    error_message: str
    timestamp: datetime
    context: Dict[str, Any]
    root_cause: Optional[str] = None
    suggested_fixes: List[str] = field(default_factory=list)
    confidence: float = 0.0
    plugin_synthesis_triggered: bool = False 