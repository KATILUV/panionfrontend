"""
Goal Queue
Manages goal and subtask assignments, tracking agent ownership and task status.
"""

import logging
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from collections import defaultdict
import re

from .plugin_types import PluginError

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    """Status of a task or subtask"""
    PENDING = "pending"
    CLAIMED = "claimed"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RELEASED = "released"
    TIMEOUT = "timeout"
    BLOCKED = "blocked"

class TaskPriority(Enum):
    """Priority levels for tasks"""
    LOW = 0
    MEDIUM = 1
    HIGH = 2
    CRITICAL = 3

@dataclass
class TaskAssignment:
    """Assignment of a task to an agent"""
    task_id: str
    agent_id: str
    role: str
    status: TaskStatus
    priority: TaskPriority
    claimed_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    timeout: Optional[timedelta] = None
    dependencies: Set[str] = None
    retry_count: int = 0
    max_retries: int = 3

    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = set()

    @property
    def is_timed_out(self) -> bool:
        """Check if task has timed out"""
        if not self.timeout or not self.started_at:
            return False
        return datetime.now() - self.started_at > self.timeout

    @property
    def can_retry(self) -> bool:
        """Check if task can be retried"""
        return self.retry_count < self.max_retries

class GoalQueue:
    """Manages goal and subtask assignments"""
    
    def __init__(self, default_timeout: timedelta = timedelta(minutes=30)):
        self._goal_assignments: Dict[str, Dict[str, TaskAssignment]] = {}  # goal_id -> {task_id -> assignment}
        self._agent_assignments: Dict[str, Set[str]] = {}  # agent_id -> set of task_ids
        self._task_dependencies: Dict[str, Set[str]] = defaultdict(set)  # task_id -> set of dependent tasks
        self._default_timeout = default_timeout
        
    def claim_goal(
        self,
        goal_id: str,
        agent_id: str,
        role: str,
        priority: TaskPriority = TaskPriority.MEDIUM
    ) -> List[str]:
        """
        Claim all unassigned subtasks for a goal
        
        Args:
            goal_id: ID of the goal to claim
            agent_id: ID of the claiming agent
            role: Role of the claiming agent
            priority: Priority level for claimed tasks
            
        Returns:
            List of claimed task IDs
            
        Raises:
            PluginError: If goal is not found or no tasks available
        """
        if goal_id not in self._goal_assignments:
            raise PluginError(f"Goal {goal_id} not found")
            
        claimed_tasks = []
        for task_id, assignment in self._goal_assignments[goal_id].items():
            if (assignment.status == TaskStatus.PENDING and
                not self._is_task_blocked(task_id)):
                # Create new assignment
                self._goal_assignments[goal_id][task_id] = TaskAssignment(
                    task_id=task_id,
                    agent_id=agent_id,
                    role=role,
                    status=TaskStatus.CLAIMED,
                    priority=priority,
                    claimed_at=datetime.now(),
                    timeout=self._default_timeout,
                    dependencies=assignment.dependencies.copy()
                )
                
                # Track agent's assignments
                if agent_id not in self._agent_assignments:
                    self._agent_assignments[agent_id] = set()
                self._agent_assignments[agent_id].add(task_id)
                
                claimed_tasks.append(task_id)
                
                logger.info(f"Task {task_id} claimed by agent {agent_id} ({role})")
                
        if not claimed_tasks:
            raise PluginError(f"No available tasks for goal {goal_id}")
            
        return claimed_tasks

    def add_task_dependency(self, task_id: str, depends_on: str) -> None:
        """
        Add a dependency between tasks
        
        Args:
            task_id: ID of the dependent task
            depends_on: ID of the task this depends on
            
        Raises:
            PluginError: If either task is not found
        """
        # Find tasks in goals
        task_found = False
        for goal_id, assignments in self._goal_assignments.items():
            if task_id in assignments and depends_on in assignments:
                task_found = True
                assignments[task_id].dependencies.add(depends_on)
                self._task_dependencies[depends_on].add(task_id)
                logger.info(f"Added dependency: {task_id} depends on {depends_on}")
                break
                
        if not task_found:
            raise PluginError(f"Tasks {task_id} and/or {depends_on} not found")

    def _is_task_blocked(self, task_id: str) -> bool:
        """Check if a task is blocked by dependencies"""
        for goal_id, assignments in self._goal_assignments.items():
            if task_id in assignments:
                assignment = assignments[task_id]
                for dep_id in assignment.dependencies:
                    if dep_id in assignments:
                        dep_status = assignments[dep_id].status
                        if dep_status not in {TaskStatus.COMPLETED}:
                            return True
        return False

    def reassign_task(
        self,
        goal_id: str,
        task_id: str,
        new_agent_id: str,
        new_role: str
    ) -> None:
        """
        Reassign a task to a different agent
        
        Args:
            goal_id: ID of the goal
            task_id: ID of the task to reassign
            new_agent_id: ID of the new agent
            new_role: Role of the new agent
            
        Raises:
            PluginError: If goal or task is not found
        """
        if goal_id not in self._goal_assignments:
            raise PluginError(f"Goal {goal_id} not found")
            
        if task_id not in self._goal_assignments[goal_id]:
            raise PluginError(f"Task {task_id} not found in goal {goal_id}")
            
        assignment = self._goal_assignments[goal_id][task_id]
        old_agent_id = assignment.agent_id
        
        # Update assignment
        self._goal_assignments[goal_id][task_id] = TaskAssignment(
            task_id=task_id,
            agent_id=new_agent_id,
            role=new_role,
            status=TaskStatus.CLAIMED,
            priority=assignment.priority,
            claimed_at=datetime.now(),
            timeout=assignment.timeout,
            dependencies=assignment.dependencies.copy(),
            retry_count=assignment.retry_count + 1,
            max_retries=assignment.max_retries
        )
        
        # Update agent assignments
        if old_agent_id in self._agent_assignments:
            self._agent_assignments[old_agent_id].discard(task_id)
        if new_agent_id not in self._agent_assignments:
            self._agent_assignments[new_agent_id] = set()
        self._agent_assignments[new_agent_id].add(task_id)
        
        logger.info(f"Task {task_id} reassigned from {old_agent_id} to {new_agent_id}")

    def check_timeouts(self) -> List[Tuple[str, str]]:
        """
        Check for timed out tasks
        
        Returns:
            List of (goal_id, task_id) tuples for timed out tasks
        """
        timed_out = []
        for goal_id, assignments in self._goal_assignments.items():
            for task_id, assignment in assignments.items():
                if (assignment.status in {TaskStatus.CLAIMED, TaskStatus.RUNNING} and
                    assignment.is_timed_out):
                    self.update_task_status(
                        goal_id,
                        task_id,
                        TaskStatus.TIMEOUT,
                        "Task timed out"
                    )
                    timed_out.append((goal_id, task_id))
        return timed_out

    def get_available_tasks(
        self,
        goal_id: str,
        priority: Optional[TaskPriority] = None
    ) -> List[str]:
        """
        Get list of available tasks for a goal
        
        Args:
            goal_id: ID of the goal
            priority: Optional priority filter
            
        Returns:
            List of available task IDs
            
        Raises:
            PluginError: If goal is not found
        """
        if goal_id not in self._goal_assignments:
            raise PluginError(f"Goal {goal_id} not found")
            
        available = []
        for task_id, assignment in self._goal_assignments[goal_id].items():
            if (assignment.status == TaskStatus.PENDING and
                not self._is_task_blocked(task_id) and
                (priority is None or assignment.priority == priority)):
                available.append(task_id)
                
        return sorted(
            available,
            key=lambda tid: self._goal_assignments[goal_id][tid].priority.value,
            reverse=True
        )

    def get_task_dependencies(self, task_id: str) -> Set[str]:
        """
        Get all tasks that depend on this task
        
        Args:
            task_id: ID of the task
            
        Returns:
            Set of dependent task IDs
        """
        return self._task_dependencies[task_id].copy()

    def get_blocked_tasks(self, goal_id: str) -> List[str]:
        """
        Get list of tasks blocked by dependencies
        
        Args:
            goal_id: ID of the goal
            
        Returns:
            List of blocked task IDs
            
        Raises:
            PluginError: If goal is not found
        """
        if goal_id not in self._goal_assignments:
            raise PluginError(f"Goal {goal_id} not found")
            
        return [
            task_id
            for task_id, assignment in self._goal_assignments[goal_id].items()
            if assignment.status == TaskStatus.PENDING and self._is_task_blocked(task_id)
        ]

    def release_goal(self, goal_id: str, agent_id: str) -> None:
        """
        Release all tasks for a goal assigned to an agent
        
        Args:
            goal_id: ID of the goal to release
            agent_id: ID of the agent releasing tasks
            
        Raises:
            PluginError: If goal is not found
        """
        if goal_id not in self._goal_assignments:
            raise PluginError(f"Goal {goal_id} not found")
            
        for task_id, assignment in self._goal_assignments[goal_id].items():
            if assignment.agent_id == agent_id and assignment.status not in {
                TaskStatus.COMPLETED,
                TaskStatus.FAILED
            }:
                # Update task status
                self._goal_assignments[goal_id][task_id] = TaskAssignment(
                    task_id=task_id,
                    agent_id=agent_id,
                    role=assignment.role,
                    status=TaskStatus.RELEASED,
                    claimed_at=assignment.claimed_at,
                    started_at=assignment.started_at,
                    completed_at=datetime.now()
                )
                
                # Remove from agent's assignments
                if agent_id in self._agent_assignments:
                    self._agent_assignments[agent_id].discard(task_id)
                    
                logger.info(f"Task {task_id} released by agent {agent_id}")
                
    def get_active_agents(self, goal_id: str) -> Dict[str, List[str]]:
        """
        Get all active agents and their tasks for a goal
        
        Args:
            goal_id: ID of the goal to check
            
        Returns:
            Dictionary mapping agent IDs to their active task IDs
            
        Raises:
            PluginError: If goal is not found
        """
        if goal_id not in self._goal_assignments:
            raise PluginError(f"Goal {goal_id} not found")
            
        active_agents = {}
        for task_id, assignment in self._goal_assignments[goal_id].items():
            if assignment.status in {TaskStatus.CLAIMED, TaskStatus.RUNNING}:
                if assignment.agent_id not in active_agents:
                    active_agents[assignment.agent_id] = []
                active_agents[assignment.agent_id].append(task_id)
                
        return active_agents
        
    def update_task_status(
        self,
        goal_id: str,
        task_id: str,
        status: TaskStatus,
        error: Optional[str] = None
    ) -> None:
        """
        Update the status of a task
        
        Args:
            goal_id: ID of the goal
            task_id: ID of the task
            status: New status
            error: Optional error message for failed tasks
            
        Raises:
            PluginError: If goal or task is not found
        """
        if goal_id not in self._goal_assignments:
            raise PluginError(f"Goal {goal_id} not found")
            
        if task_id not in self._goal_assignments[goal_id]:
            raise PluginError(f"Task {task_id} not found in goal {goal_id}")
            
        assignment = self._goal_assignments[goal_id][task_id]
        
        # Update assignment
        self._goal_assignments[goal_id][task_id] = TaskAssignment(
            task_id=task_id,
            agent_id=assignment.agent_id,
            role=assignment.role,
            status=status,
            claimed_at=assignment.claimed_at,
            started_at=assignment.started_at or (datetime.now() if status == TaskStatus.RUNNING else None),
            completed_at=datetime.now() if status in {TaskStatus.COMPLETED, TaskStatus.FAILED} else None,
            error=error if status == TaskStatus.FAILED else None
        )
        
        logger.info(f"Task {task_id} status updated to {status.value}")
        
    def get_task_status(self, goal_id: str, task_id: str) -> TaskStatus:
        """
        Get the current status of a task
        
        Args:
            goal_id: ID of the goal
            task_id: ID of the task
            
        Returns:
            Current task status
            
        Raises:
            PluginError: If goal or task is not found
        """
        if goal_id not in self._goal_assignments:
            raise PluginError(f"Goal {goal_id} not found")
            
        if task_id not in self._goal_assignments[goal_id]:
            raise PluginError(f"Task {task_id} not found in goal {goal_id}")
            
        return self._goal_assignments[goal_id][task_id].status
        
    def add_goal(self, goal_id: str, task_ids: List[str]) -> None:
        """
        Add a new goal with its subtasks
        
        Args:
            goal_id: ID of the goal
            task_ids: List of task IDs
            
        Raises:
            PluginError: If goal already exists
        """
        if goal_id in self._goal_assignments:
            raise PluginError(f"Goal {goal_id} already exists")
            
        self._goal_assignments[goal_id] = {
            task_id: TaskAssignment(
                task_id=task_id,
                agent_id="",
                role="",
                status=TaskStatus.PENDING,
                claimed_at=datetime.now()
            )
            for task_id in task_ids
        }
        
        logger.info(f"Added goal {goal_id} with {len(task_ids)} tasks")

    async def _process_goal(self, goal_id: str) -> None:
        """Process a single goal from the queue."""
        try:
            # Get goal from queue
            goal = self._goals.get(goal_id)
            if not goal:
                self.logger.warning(f"Goal {goal_id} not found in queue")
                return
                
            # Log goal processing start
            self.logger.info(
                f"Processing goal: {goal_id}",
                extra={
                    'goal_id': goal_id,
                    'priority': goal.priority,
                    'status': goal.status
                }
            )
            
            # Update goal status
            goal.status = GoalStatus.PROCESSING
            goal.last_updated = datetime.now()
            
            # Process goal
            try:
                result = await self.goal_processor.process_goal(goal)
                goal.status = GoalStatus.COMPLETED if result.success else GoalStatus.FAILED
                goal.result = result
            except Exception as e:
                goal.status = GoalStatus.FAILED
                goal.error = str(e)
                self.logger.error(
                    f"Error processing goal {goal_id}: {e}",
                    exc_info=True,
                    extra={
                        'goal_id': goal_id,
                        'error_type': type(e).__name__,
                        'error_details': str(e)
                    }
                )
            
            # Update goal in queue
            self._goals[goal_id] = goal
            
            # Log goal completion
            self.logger.info(
                f"Goal {goal_id} completed with status: {goal.status}",
                extra={
                    'goal_id': goal_id,
                    'status': goal.status,
                    'duration': (datetime.now() - goal.created_at).total_seconds()
                }
            )
            
        except Exception as e:
            self.logger.error(
                f"Error in goal processing: {e}",
                exc_info=True,
                extra={
                    'goal_id': goal_id,
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            )
            # Update goal status to failed
            if goal_id in self._goals:
                self._goals[goal_id].status = GoalStatus.FAILED
                self._goals[goal_id].error = str(e)

    def _check_dependencies(self, goal_id: str) -> Tuple[bool, List[str]]:
        """Check if all dependencies for a goal are satisfied.
        
        Args:
            goal_id: The ID of the goal to check dependencies for
            
        Returns:
            Tuple of (dependencies_satisfied, missing_dependencies)
        """
        try:
            goal = self.get_goal(goal_id)
            if not goal:
                raise ValueError(f"Goal {goal_id} not found")
            
            # Get all dependencies
            dependencies = goal.decomposition.get('dependencies', [])
            if not dependencies:
                return True, []
            
            missing_deps = []
            for dep_id in dependencies:
                # Check if dependency exists
                dep_goal = self.get_goal(dep_id)
                if not dep_goal:
                    self.logger.error(
                        f"Dependency {dep_id} not found for goal {goal_id}",
                        extra={
                            'goal_id': goal_id,
                            'dependency_id': dep_id
                        }
                    )
                    missing_deps.append(dep_id)
                    continue
                
                # Check dependency status
                if dep_goal.status != 'completed':
                    self.logger.debug(
                        f"Dependency {dep_id} not completed for goal {goal_id}",
                        extra={
                            'goal_id': goal_id,
                            'dependency_id': dep_id,
                            'dependency_status': dep_goal.status
                        }
                    )
                    missing_deps.append(dep_id)
                    continue
                
                # Check dependency success criteria
                success_criteria = dep_goal.decomposition.get('success_criteria', [])
                if success_criteria:
                    criteria_met = all(
                        self._check_success_criterion(dep_id, criterion)
                        for criterion in success_criteria
                    )
                    if not criteria_met:
                        self.logger.debug(
                            f"Success criteria not met for dependency {dep_id}",
                            extra={
                                'goal_id': goal_id,
                                'dependency_id': dep_id
                            }
                        )
                        missing_deps.append(dep_id)
                        continue
                
                # Check dependency output
                if hasattr(dep_goal, 'output') and dep_goal.output is None:
                    self.logger.debug(
                        f"No output available for dependency {dep_id}",
                        extra={
                            'goal_id': goal_id,
                            'dependency_id': dep_id
                        }
                    )
                    missing_deps.append(dep_id)
                    continue
                
                # Check dependency resources
                required_resources = dep_goal.decomposition.get('required_resources', [])
                if required_resources:
                    resources_available = all(
                        self.resource_manager.check_resource_availability(resource)
                        for resource in required_resources
                    )
                    if not resources_available:
                        self.logger.debug(
                            f"Required resources not available for dependency {dep_id}",
                            extra={
                                'goal_id': goal_id,
                                'dependency_id': dep_id
                            }
                        )
                        missing_deps.append(dep_id)
                        continue
            
            # Check for circular dependencies
            if self._has_circular_dependency(goal_id):
                self.logger.error(
                    f"Circular dependency detected for goal {goal_id}",
                    extra={'goal_id': goal_id}
                )
                missing_deps.append('circular_dependency')
            
            # Check for resource conflicts
            resource_conflicts = self._check_resource_conflicts(goal_id)
            if resource_conflicts:
                self.logger.debug(
                    f"Resource conflicts detected for goal {goal_id}",
                    extra={
                        'goal_id': goal_id,
                        'conflicts': resource_conflicts
                    }
                )
                missing_deps.extend(resource_conflicts)
            
            return len(missing_deps) == 0, missing_deps
            
        except Exception as e:
            self.logger.error(
                f"Error checking dependencies for goal {goal_id}: {e}",
                exc_info=True,
                extra={
                    'goal_id': goal_id,
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            )
            return False, [str(e)]
    
    def _has_circular_dependency(self, goal_id: str) -> bool:
        """Check if a goal has circular dependencies."""
        try:
            visited = set()
            path = set()
            
            def visit(node):
                if node in path:
                    return True
                if node in visited:
                    return False
                
                visited.add(node)
                path.add(node)
                
                goal = self.get_goal(node)
                if goal:
                    for dep_id in goal.decomposition.get('dependencies', []):
                        if visit(dep_id):
                            return True
                
                path.remove(node)
                return False
            
            return visit(goal_id)
            
        except Exception as e:
            self.logger.error(
                f"Error checking circular dependencies: {e}",
                extra={
                    'goal_id': goal_id,
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            )
            return False
    
    def _check_resource_conflicts(self, goal_id: str) -> List[str]:
        """Check for resource conflicts with other goals."""
        try:
            goal = self.get_goal(goal_id)
            if not goal:
                return []
            
            required_resources = goal.decomposition.get('required_resources', [])
            if not required_resources:
                return []
            
            conflicts = []
            for resource in required_resources:
                # Check if resource is already allocated to another goal
                allocated_to = self.resource_manager.get_resource_allocation(resource)
                if allocated_to and allocated_to != goal_id:
                    conflicts.append(f"resource_conflict:{resource}:{allocated_to}")
                
                # Check if resource has capacity constraints
                if not self.resource_manager.check_resource_capacity(resource):
                    conflicts.append(f"resource_capacity:{resource}")
            
            return conflicts
            
        except Exception as e:
            self.logger.error(
                f"Error checking resource conflicts: {e}",
                extra={
                    'goal_id': goal_id,
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            )
            return []
    
    def _check_success_criterion(self, goal_id: str, criterion: Dict[str, Any]) -> bool:
        """Check if a success criterion is met for a goal."""
        try:
            goal = self.get_goal(goal_id)
            if not goal or not hasattr(goal, 'output'):
                return False
            
            criterion_type = criterion.get('type')
            if not criterion_type:
                return False
            
            if criterion_type == 'threshold':
                value = criterion.get('value')
                threshold = criterion.get('threshold')
                if value is None or threshold is None:
                    return False
                return value >= threshold
            
            elif criterion_type == 'exact_match':
                expected = criterion.get('expected')
                if expected is None:
                    return False
                return goal.output == expected
            
            elif criterion_type == 'pattern_match':
                pattern = criterion.get('pattern')
                if not pattern:
                    return False
                return bool(re.search(pattern, str(goal.output)))
            
            elif criterion_type == 'custom':
                validator = criterion.get('validator')
                if not validator or not callable(validator):
                    return False
                return validator(goal.output)
            
            return False
            
        except Exception as e:
            self.logger.error(
                f"Error checking success criterion: {e}",
                extra={
                    'goal_id': goal_id,
                    'criterion': criterion,
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            )
            return False 