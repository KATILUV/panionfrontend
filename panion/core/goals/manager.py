"""
Goal Manager
Manages goals and their lifecycle.
"""

import logging
from typing import Dict, Any, List, Optional, Set, TYPE_CHECKING
from datetime import datetime
from pathlib import Path
import uuid
from dataclasses import dataclass, field
from enum import Enum
import json
import asyncio
from functools import wraps

from core.interfaces import IPluginManager
from core.plugin_types import Plugin, PluginMetadata, PluginState
from core.panion_errors import PluginError, ErrorSeverity
from core.utils import with_connection_pool, cache_result
from core.base import BaseComponent, ComponentMetadata, ComponentState
from core.logging_config import get_logger, LogTimer
from core.config import goal_config, system_config

if TYPE_CHECKING:
    from core.plugin_manager import PluginManager
    from core.memory_manager import MemoryManager

def with_retry(max_retries: int = 3, delay: float = 1.0):
    """Decorator for retrying operations with exponential backoff."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_retries - 1:
                        wait_time = delay * (2 ** attempt)  # Exponential backoff
                        await asyncio.sleep(wait_time)
            raise last_error
        return wrapper
    return decorator

class GoalState(Enum):
    """Goal states."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class Goal:
    """Goal definition."""
    id: str
    name: str
    description: str
    state: GoalState = GoalState.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

class GoalManager(BaseComponent):
    """Manages goals and their lifecycle."""
    
    def __init__(self, plugin_manager: IPluginManager):
        """Initialize the goal manager."""
        metadata = ComponentMetadata(
            name="GoalManager",
            version="1.0.0",
            description="Goal management system",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            dependencies={},
            config_schema={}
        )
        super().__init__(metadata)
        
        self.logger = logging.getLogger(__name__)
        self.goals_file = goal_config.goals_file
        self.goals_file.parent.mkdir(parents=True, exist_ok=True)
        
        self.plugin_manager = plugin_manager
        self._goals: Dict[str, Goal] = {}
        self._max_retries = goal_config.max_retries
        self._retry_delay = goal_config.retry_delay
        
        # Goal storage
        self._active_goals: Dict[str, datetime] = {}
        
        # Execution settings
        self._max_concurrent_goals = goal_config.max_concurrent_goals
        self._default_timeout = goal_config.default_timeout
        self._execution_semaphore = asyncio.Semaphore(self._max_concurrent_goals)
        
        # Dependencies
        self._memory_manager = None

    @with_retry(max_retries=3, delay=1.0)
    async def initialize(self) -> None:
        """Initialize the goal manager."""
        try:
            self.logger.info(
                "Initializing goal manager",
                extra={
                    'operation': 'initialize',
                    'component': 'GoalManager'
                }
            )
            await self._load_goals()
            self.logger.info(
                "Goal manager initialized",
                extra={
                    'operation': 'initialize_complete',
                    'component': 'GoalManager',
                    'goal_count': len(self._goals)
                }
            )
        except Exception as e:
            self.logger.error(
                "Failed to initialize goal manager",
                extra={
                    'operation': 'initialize_error',
                    'component': 'GoalManager',
                    'error_type': type(e).__name__,
                    'error': str(e)
                }
            )
            raise

    async def start(self) -> None:
        """Start the goal manager."""
        try:
            self.logger.info(
                "Starting goal manager",
                extra={
                    'operation': 'start',
                    'component': 'GoalManager'
                }
            )
            self._state = ComponentState.ACTIVE
            self._start_time = datetime.now()
            self.logger.info(
                "Goal manager started",
                extra={
                    'operation': 'start_complete',
                    'component': 'GoalManager',
                    'state': self._state.value
                }
            )
        except Exception as e:
            self.logger.error(
                "Failed to start goal manager",
                extra={
                    'operation': 'start_error',
                    'component': 'GoalManager',
                    'error_type': type(e).__name__,
                    'error': str(e)
                }
            )
            raise

    async def stop(self) -> None:
        """Stop the goal manager."""
        try:
            self.logger.info(
                "Stopping goal manager",
                extra={
                    'operation': 'stop',
                    'component': 'GoalManager'
                }
            )
            await self._save_goals()
            self._state = ComponentState.STOPPED
            self.logger.info(
                "Goal manager stopped",
                extra={
                    'operation': 'stop_complete',
                    'component': 'GoalManager',
                    'state': self._state.value
                }
            )
        except Exception as e:
            self.logger.error(
                "Failed to stop goal manager",
                extra={
                    'operation': 'stop_error',
                    'component': 'GoalManager',
                    'error_type': type(e).__name__,
                    'error': str(e)
                }
            )
            raise

    async def pause(self) -> None:
        """Pause the goal manager."""
        try:
            self.logger.info("Pausing goal manager...")
            self._state = ComponentState.PAUSED
            self.logger.info("Goal manager paused successfully")
        except Exception as e:
            self.logger.error(f"Error pausing goal manager: {e}")
            raise

    async def resume(self) -> None:
        """Resume the goal manager."""
        try:
            self.logger.info("Resuming goal manager...")
            self._state = ComponentState.ACTIVE
            self.logger.info("Goal manager resumed successfully")
        except Exception as e:
            self.logger.error(f"Error resuming goal manager: {e}")
            raise

    async def update(self) -> None:
        """Update the goal manager state."""
        try:
            self.logger.info("Updating goal manager...")
            # Perform any necessary updates
            self.logger.info("Goal manager updated successfully")
        except Exception as e:
            self.logger.error(f"Error updating goal manager: {e}")
            raise

    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the goal manager."""
        return {
            'state': self._state.value,
            'total_goals': len(self._goals),
            'active_goals': len(self._active_goals),
            'uptime': self.uptime,
            'error_info': self.get_error_info()
        }

    async def add_goal(self, goal: Goal) -> None:
        """Add a new goal."""
        try:
            self.logger.info(
                "Adding new goal",
                extra={
                    'operation': 'add_goal',
                    'goal_id': goal.id,
                    'goal_name': goal.name
                }
            )
            self._goals[goal.name] = goal
            await self._save_goals()
            self.logger.info(
                "Goal added successfully",
                extra={
                    'operation': 'add_goal_complete',
                    'goal_id': goal.id,
                    'goal_name': goal.name
                }
            )
        except ValueError as e:
            self.logger.error(
                "Invalid goal data",
                extra={
                    'operation': 'add_goal_error',
                    'goal_id': goal.id,
                    'goal_name': goal.name,
                    'error_type': 'ValidationError',
                    'error': str(e)
                }
            )
            raise
        except Exception as e:
            self.logger.error(
                "Failed to add goal",
                extra={
                    'operation': 'add_goal_error',
                    'goal_id': goal.id,
                    'goal_name': goal.name,
                    'error_type': type(e).__name__,
                    'error': str(e)
                }
            )
            raise

    async def remove_goal(self, goal_name: str) -> None:
        """Remove a goal."""
        try:
            if goal_name in self._goals:
                del self._goals[goal_name]
                await self._save_goals()
        except Exception as e:
            self.logger.error(f"Error removing goal: {e}")
            raise

    async def get_goal(self, goal_name: str) -> Optional[Goal]:
        """Get a goal by name."""
        return self._goals.get(goal_name)

    async def get_all_goals(self) -> Dict[str, Goal]:
        """Get all goals."""
        return self._goals

    @with_retry(max_retries=3, delay=1.0)
    async def execute_goal(self, goal_name: str) -> Dict[str, Any]:
        """Execute a goal."""
        try:
            goal = await self.get_goal(goal_name)
            if not goal:
                raise ValueError(f"Goal not found: {goal_name}")

            async with self._execution_semaphore:
                self.logger.info(
                    "Starting goal execution",
                    extra={
                        'operation': 'execute_goal_start',
                        'goal_id': goal.id,
                        'goal_name': goal_name
                    }
                )
                self._active_goals[goal_name] = datetime.now()
                try:
                    # Execute goal logic here
                    result = {"status": "success", "goal": goal_name}
                    self.logger.info(
                        "Goal execution completed",
                        extra={
                            'operation': 'execute_goal_complete',
                            'goal_id': goal.id,
                            'goal_name': goal_name,
                            'result': result
                        }
                    )
                    return result
                finally:
                    del self._active_goals[goal_name]

        except Exception as e:
            self.logger.error(
                "Failed to execute goal",
                extra={
                    'operation': 'execute_goal_error',
                    'goal_name': goal_name,
                    'error_type': type(e).__name__,
                    'error': str(e)
                }
            )
            raise

    async def _save_goals(self) -> None:
        """Save goals to disk."""
        try:
            goals_data = {
                name: {
                    "name": goal.name,
                    "description": goal.description,
                    "state": goal.state.value,
                    "created_at": goal.created_at.isoformat(),
                    "updated_at": goal.updated_at.isoformat(),
                    "metadata": goal.metadata
                }
                for name, goal in self._goals.items()
            }
            
            with open(self.goals_file, 'w') as f:
                json.dump(goals_data, f, indent=2)

            self.logger.info(
                "Goals saved successfully",
                extra={
                    'operation': 'save_goals',
                    'goal_count': len(self._goals),
                    'file': str(self.goals_file)
                }
            )

        except IOError as e:
            self.logger.error(
                "Failed to write goals file",
                extra={
                    'operation': 'save_goals_error',
                    'error_type': 'IOError',
                    'error': str(e),
                    'file': str(self.goals_file)
                }
            )
            raise
        except json.JSONDecodeError as e:
            self.logger.error(
                "Failed to encode goals data",
                extra={
                    'operation': 'save_goals_error',
                    'error_type': 'JSONError',
                    'error': str(e)
                }
            )
            raise
        except Exception as e:
            self.logger.error(
                "Failed to save goals",
                extra={
                    'operation': 'save_goals_error',
                    'error_type': type(e).__name__,
                    'error': str(e)
                }
            )
            raise

    async def _load_goals(self) -> None:
        """Load goals from disk."""
        try:
            if self.goals_file.exists():
                with open(self.goals_file, 'r') as f:
                    goals_data = json.load(f)
                
                for name, data in goals_data.items():
                    self._goals[name] = Goal(
                        id=str(uuid.uuid4()),
                        name=data["name"],
                        description=data["description"],
                        state=GoalState(data["state"]),
                        created_at=datetime.fromisoformat(data["created_at"]),
                        updated_at=datetime.fromisoformat(data["updated_at"]),
                        metadata=data["metadata"]
                    )

                self.logger.info(
                    "Goals loaded successfully",
                    extra={
                        'operation': 'load_goals',
                        'goal_count': len(self._goals),
                        'file': str(self.goals_file)
                    }
                )

        except IOError as e:
            self.logger.error(
                "Failed to read goals file",
                extra={
                    'operation': 'load_goals_error',
                    'error_type': 'IOError',
                    'error': str(e),
                    'file': str(self.goals_file)
                }
            )
            self._goals = {}
        except json.JSONDecodeError as e:
            self.logger.error(
                "Failed to parse goals data",
                extra={
                    'operation': 'load_goals_error',
                    'error_type': 'JSONError',
                    'error': str(e),
                    'file': str(self.goals_file)
                }
            )
            self._goals = {}
        except Exception as e:
            self.logger.error(
                "Failed to load goals",
                extra={
                    'operation': 'load_goals_error',
                    'error_type': type(e).__name__,
                    'error': str(e)
                }
            )
            self._goals = {}

# Create singleton instance
goal_manager = GoalManager()