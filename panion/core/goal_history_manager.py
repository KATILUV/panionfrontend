"""
Goal History Manager
Manages versioned goal history with tracking and search capabilities.
"""

import logging
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Set
from datetime import datetime
from dataclasses import dataclass, field
import uuid
from enum import Enum

from .base import BaseComponent, ComponentMetadata, ComponentState
from .service_locator import service_locator
from .reflection import reflection_system
from .error_handling import error_handler, with_error_recovery

class GoalAttemptStatus(Enum):
    """Status of a goal attempt."""
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"

@dataclass
class GoalAttempt:
    """Represents a single attempt at executing a goal."""
    attempt_id: str
    goal_id: str
    version: int
    start_time: datetime
    end_time: Optional[datetime] = None
    status: GoalAttemptStatus = GoalAttemptStatus.FAILURE
    error: Optional[str] = None
    retry_count: int = 0
    execution_time: float = 0.0
    plugin_results: Dict[str, Any] = field(default_factory=dict)
    validation_results: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class GoalHistory:
    """Represents the complete history of a goal."""
    goal_id: str
    attempts: List[GoalAttempt] = field(default_factory=list)
    total_attempts: int = 0
    success_count: int = 0
    failure_count: int = 0
    average_execution_time: float = 0.0
    last_attempt: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

class GoalHistoryManager(BaseComponent):
    """Manages versioned goal history with tracking and search capabilities."""
    
    def __init__(self):
        """Initialize the goal history manager."""
        metadata = ComponentMetadata(
            name="GoalHistoryManager",
            version="1.0.0",
            description="Goal history tracking and management",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            dependencies={},
            config_schema={}
        )
        super().__init__(metadata)
        
        self.logger = logging.getLogger(__name__)
        self._setup_logging()
        
        # History storage
        self.history_dir = Path("data/goal_history")
        self.history_dir.mkdir(parents=True, exist_ok=True)
        self._histories: Dict[str, GoalHistory] = {}
        
        # Register with service locator
        service_locator.register_service("goal_history_manager", self)

    def _setup_logging(self) -> None:
        """Setup logging for the history manager."""
        log_file = Path("logs") / "goal_history.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)

    async def initialize(self) -> None:
        """Initialize the history manager and load saved histories."""
        try:
            self.logger.info("Initializing goal history manager...")
            await self._load_histories()
            self.logger.info("Goal history manager initialized successfully")
        except Exception as e:
            self.logger.error(f"Error initializing goal history manager: {e}")
            raise

    async def _load_histories(self) -> None:
        """Load goal histories from storage."""
        try:
            for history_file in self.history_dir.glob("*.json"):
                try:
                    with open(history_file, 'r') as f:
                        history_data = json.load(f)
                    
                    # Convert attempts to GoalAttempt objects
                    attempts = []
                    for attempt_data in history_data.get('attempts', []):
                        attempt = GoalAttempt(
                            attempt_id=attempt_data['attempt_id'],
                            goal_id=attempt_data['goal_id'],
                            version=attempt_data['version'],
                            start_time=datetime.fromisoformat(attempt_data['start_time']),
                            end_time=datetime.fromisoformat(attempt_data['end_time']) if attempt_data.get('end_time') else None,
                            status=GoalAttemptStatus(attempt_data['status']),
                            error=attempt_data.get('error'),
                            retry_count=attempt_data.get('retry_count', 0),
                            execution_time=attempt_data.get('execution_time', 0.0),
                            plugin_results=attempt_data.get('plugin_results', {}),
                            validation_results=attempt_data.get('validation_results', {}),
                            metadata=attempt_data.get('metadata', {})
                        )
                        attempts.append(attempt)
                    
                    # Create GoalHistory object
                    history = GoalHistory(
                        goal_id=history_data['goal_id'],
                        attempts=attempts,
                        total_attempts=history_data.get('total_attempts', 0),
                        success_count=history_data.get('success_count', 0),
                        failure_count=history_data.get('failure_count', 0),
                        average_execution_time=history_data.get('average_execution_time', 0.0),
                        last_attempt=datetime.fromisoformat(history_data['last_attempt']) if history_data.get('last_attempt') else None,
                        created_at=datetime.fromisoformat(history_data['created_at']),
                        updated_at=datetime.fromisoformat(history_data['updated_at'])
                    )
                    
                    self._histories[history.goal_id] = history
                    
                except Exception as e:
                    self.logger.error(f"Error loading history file {history_file}: {e}")
                    
        except Exception as e:
            self.logger.error(f"Error loading histories: {e}")
            raise

    async def record_attempt(self, goal_id: str, attempt_data: Dict[str, Any]) -> GoalAttempt:
        """Record a new goal attempt."""
        try:
            # Get or create history
            history = self._histories.get(goal_id)
            if not history:
                history = GoalHistory(goal_id=goal_id)
                self._histories[goal_id] = history
            
            # Create attempt
            attempt = GoalAttempt(
                attempt_id=str(uuid.uuid4()),
                goal_id=goal_id,
                version=history.total_attempts + 1,
                start_time=datetime.now(),
                status=GoalAttemptStatus(attempt_data.get('status', 'failure')),
                error=attempt_data.get('error'),
                retry_count=attempt_data.get('retry_count', 0),
                execution_time=attempt_data.get('execution_time', 0.0),
                plugin_results=attempt_data.get('plugin_results', {}),
                validation_results=attempt_data.get('validation_results', {}),
                metadata=attempt_data.get('metadata', {})
            )
            
            # Update history
            history.attempts.append(attempt)
            history.total_attempts += 1
            if attempt.status == GoalAttemptStatus.SUCCESS:
                history.success_count += 1
            elif attempt.status == GoalAttemptStatus.FAILURE:
                history.failure_count += 1
            
            # Update execution time stats
            if attempt.execution_time > 0:
                total_time = history.average_execution_time * (history.total_attempts - 1)
                total_time += attempt.execution_time
                history.average_execution_time = total_time / history.total_attempts
            
            history.last_attempt = attempt.start_time
            history.updated_at = datetime.now()
            
            # Save history
            await self._save_history(history)
            
            return attempt
            
        except Exception as e:
            self.logger.error(f"Error recording attempt for goal {goal_id}: {e}")
            raise

    async def get_goal_history(self, goal_id: str) -> Optional[GoalHistory]:
        """Get history for a specific goal."""
        return self._histories.get(goal_id)

    async def search_histories(
        self,
        status: Optional[GoalAttemptStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        min_attempts: Optional[int] = None,
        max_attempts: Optional[int] = None,
        success_rate: Optional[float] = None
    ) -> List[GoalHistory]:
        """Search goal histories based on criteria."""
        results = []
        
        for history in self._histories.values():
            # Apply filters
            if status and not any(attempt.status == status for attempt in history.attempts):
                continue
                
            if start_date and history.last_attempt and history.last_attempt < start_date:
                continue
                
            if end_date and history.last_attempt and history.last_attempt > end_date:
                continue
                
            if min_attempts and history.total_attempts < min_attempts:
                continue
                
            if max_attempts and history.total_attempts > max_attempts:
                continue
                
            if success_rate is not None:
                current_rate = history.success_count / history.total_attempts if history.total_attempts > 0 else 0
                if current_rate < success_rate:
                    continue
            
            results.append(history)
        
        return results

    async def _save_history(self, history: GoalHistory) -> None:
        """Save a goal history to storage."""
        try:
            history_file = self.history_dir / f"{history.goal_id}.json"
            
            # Convert history to dict
            history_data = {
                'goal_id': history.goal_id,
                'attempts': [
                    {
                        'attempt_id': attempt.attempt_id,
                        'goal_id': attempt.goal_id,
                        'version': attempt.version,
                        'start_time': attempt.start_time.isoformat(),
                        'end_time': attempt.end_time.isoformat() if attempt.end_time else None,
                        'status': attempt.status.value,
                        'error': attempt.error,
                        'retry_count': attempt.retry_count,
                        'execution_time': attempt.execution_time,
                        'plugin_results': attempt.plugin_results,
                        'validation_results': attempt.validation_results,
                        'metadata': attempt.metadata
                    }
                    for attempt in history.attempts
                ],
                'total_attempts': history.total_attempts,
                'success_count': history.success_count,
                'failure_count': history.failure_count,
                'average_execution_time': history.average_execution_time,
                'last_attempt': history.last_attempt.isoformat() if history.last_attempt else None,
                'created_at': history.created_at.isoformat(),
                'updated_at': history.updated_at.isoformat()
            }
            
            with open(history_file, 'w') as f:
                json.dump(history_data, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Error saving history for goal {history.goal_id}: {e}")
            raise

    async def get_attempt(self, goal_id: str, version: int) -> Optional[GoalAttempt]:
        """Get a specific attempt version for a goal."""
        history = self._histories.get(goal_id)
        if history:
            for attempt in history.attempts:
                if attempt.version == version:
                    return attempt
        return None

    async def get_latest_attempt(self, goal_id: str) -> Optional[GoalAttempt]:
        """Get the latest attempt for a goal."""
        history = self._histories.get(goal_id)
        if history and history.attempts:
            return history.attempts[-1]
        return None

    async def get_successful_attempts(self, goal_id: str) -> List[GoalAttempt]:
        """Get all successful attempts for a goal."""
        history = self._histories.get(goal_id)
        if history:
            return [attempt for attempt in history.attempts if attempt.status == GoalAttemptStatus.SUCCESS]
        return []

    async def get_failed_attempts(self, goal_id: str) -> List[GoalAttempt]:
        """Get all failed attempts for a goal."""
        history = self._histories.get(goal_id)
        if history:
            return [attempt for attempt in history.attempts if attempt.status == GoalAttemptStatus.FAILURE]
        return []

# Create global instance
goal_history_manager = GoalHistoryManager() 