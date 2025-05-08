"""
Task Assignment Manager
Tracks task claims, progress, and completion status.
"""

import logging
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    """Task status enumeration"""
    UNASSIGNED = "unassigned"
    CLAIMED = "claimed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class Task:
    """Represents a task (goal or subtask)"""
    id: str
    type: str  # "goal" or "subtask"
    parent_id: Optional[str]  # For subtasks, the goal ID
    status: TaskStatus
    claimed_by: Optional[str]  # Agent ID
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

class TaskAssignmentManager:
    """Manages task assignments and tracking"""
    
    def __init__(self):
        self.tasks: Dict[str, Task] = {}
        self.agent_tasks: Dict[str, Set[str]] = {}  # agent_id -> set of task_ids
        
    def register_task(
        self,
        task_id: str,
        task_type: str,
        parent_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Task:
        """
        Register a new task
        
        Args:
            task_id: Unique task identifier
            task_type: Type of task ("goal" or "subtask")
            parent_id: Optional parent goal ID for subtasks
            metadata: Optional task metadata
            
        Returns:
            Created Task object
        """
        if task_id in self.tasks:
            raise ValueError(f"Task {task_id} already exists")
            
        task = Task(
            id=task_id,
            type=task_type,
            parent_id=parent_id,
            status=TaskStatus.UNASSIGNED,
            claimed_by=None,
            created_at=datetime.now(),
            metadata=metadata or {}
        )
        
        self.tasks[task_id] = task
        logger.info(f"Registered task {task_id}")
        
        return task
    
    def claim_task(self, task_id: str, agent_id: str) -> Task:
        """
        Claim a task for an agent
        
        Args:
            task_id: ID of task to claim
            agent_id: ID of claiming agent
            
        Returns:
            Updated Task object
        """
        if task_id not in self.tasks:
            raise ValueError(f"Task {task_id} not found")
            
        task = self.tasks[task_id]
        
        if task.status != TaskStatus.UNASSIGNED:
            raise ValueError(f"Task {task_id} is not available for claiming")
            
        task.status = TaskStatus.CLAIMED
        task.claimed_by = agent_id
        
        # Update agent's task set
        if agent_id not in self.agent_tasks:
            self.agent_tasks[agent_id] = set()
        self.agent_tasks[agent_id].add(task_id)
        
        logger.info(f"Agent {agent_id} claimed task {task_id}")
        
        return task
    
    def start_task(self, task_id: str) -> Task:
        """
        Mark a task as in progress
        
        Args:
            task_id: ID of task to start
            
        Returns:
            Updated Task object
        """
        if task_id not in self.tasks:
            raise ValueError(f"Task {task_id} not found")
            
        task = self.tasks[task_id]
        
        if task.status != TaskStatus.CLAIMED:
            raise ValueError(f"Task {task_id} must be claimed before starting")
            
        task.status = TaskStatus.IN_PROGRESS
        task.started_at = datetime.now()
        
        logger.info(f"Started task {task_id}")
        
        return task
    
    def complete_task(self, task_id: str) -> Task:
        """
        Mark a task as completed
        
        Args:
            task_id: ID of task to complete
            
        Returns:
            Updated Task object
        """
        if task_id not in self.tasks:
            raise ValueError(f"Task {task_id} not found")
            
        task = self.tasks[task_id]
        
        if task.status != TaskStatus.IN_PROGRESS:
            raise ValueError(f"Task {task_id} must be in progress before completing")
            
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.now()
        
        logger.info(f"Completed task {task_id}")
        
        return task
    
    def fail_task(self, task_id: str) -> Task:
        """
        Mark a task as failed
        
        Args:
            task_id: ID of task to mark as failed
            
        Returns:
            Updated Task object
        """
        if task_id not in self.tasks:
            raise ValueError(f"Task {task_id} not found")
            
        task = self.tasks[task_id]
        
        if task.status not in [TaskStatus.CLAIMED, TaskStatus.IN_PROGRESS]:
            raise ValueError(f"Task {task_id} must be claimed or in progress before failing")
            
        task.status = TaskStatus.FAILED
        task.completed_at = datetime.now()
        
        logger.info(f"Failed task {task_id}")
        
        return task
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """Get task by ID"""
        return self.tasks.get(task_id)
    
    def get_agent_tasks(self, agent_id: str) -> List[Task]:
        """Get all tasks assigned to an agent"""
        task_ids = self.agent_tasks.get(agent_id, set())
        return [self.tasks[task_id] for task_id in task_ids]
    
    def get_goal_subtasks(self, goal_id: str) -> List[Task]:
        """Get all subtasks for a goal"""
        return [
            task for task in self.tasks.values()
            if task.type == "subtask" and task.parent_id == goal_id
        ]
    
    def get_available_tasks(self) -> List[Task]:
        """Get all unassigned tasks"""
        return [
            task for task in self.tasks.values()
            if task.status == TaskStatus.UNASSIGNED
        ]
    
    def complete_goal(self, goal_id: str) -> Task:
        """
        Mark a goal and all its subtasks as complete
        
        Args:
            goal_id: ID of goal to complete
            
        Returns:
            Updated goal Task object
            
        Raises:
            ValueError: If goal is invalid or has unfinished subtasks
        """
        goal = self.get_task(goal_id)
        if not goal or goal.type != "goal":
            raise ValueError(f"Invalid goal ID: {goal_id}")
            
        # Check all subtasks are complete
        subtasks = self.get_goal_subtasks(goal_id)
        incomplete = [
            task for task in subtasks 
            if task.status not in [TaskStatus.COMPLETED, TaskStatus.FAILED]
        ]
        if incomplete:
            raise ValueError(
                f"Cannot complete goal {goal_id}: "
                f"Found {len(incomplete)} incomplete subtasks"
            )
            
        # Check if any subtasks failed
        failed = [task for task in subtasks if task.status == TaskStatus.FAILED]
        if failed:
            logger.warning(
                f"Completing goal {goal_id} with {len(failed)} failed subtasks"
            )
            
        # Complete the goal
        goal.status = TaskStatus.COMPLETED
        goal.completed_at = datetime.now()
        
        logger.info(f"Completed goal {goal_id}")
        return goal
    
    def get_goal_status(self, goal_id: str) -> Dict[str, Any]:
        """
        Get detailed status of a goal and its subtasks
        
        Args:
            goal_id: ID of goal to check
            
        Returns:
            Dictionary with goal status details
        """
        goal = self.get_task(goal_id)
        if not goal or goal.type != "goal":
            raise ValueError(f"Invalid goal ID: {goal_id}")
            
        subtasks = self.get_goal_subtasks(goal_id)
        
        return {
            "goal_id": goal_id,
            "status": goal.status.value,
            "created_at": goal.created_at.isoformat(),
            "completed_at": goal.completed_at.isoformat() if goal.completed_at else None,
            "subtasks": {
                "total": len(subtasks),
                "completed": len([t for t in subtasks if t.status == TaskStatus.COMPLETED]),
                "failed": len([t for t in subtasks if t.status == TaskStatus.FAILED]),
                "in_progress": len([t for t in subtasks if t.status == TaskStatus.IN_PROGRESS]),
                "unassigned": len([t for t in subtasks if t.status == TaskStatus.UNASSIGNED])
            },
            "agents": {
                task.claimed_by: len([t for t in subtasks if t.claimed_by == task.claimed_by])
                for task in subtasks
                if task.claimed_by
            }
        } 