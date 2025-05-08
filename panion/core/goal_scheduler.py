"""
Goal Scheduler
Handles task scheduling, resource allocation, and timeline management.
"""

import logging
from typing import Dict, Any, List, Optional, Set, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import json
import yaml
from core.reflection import reflection_system
from core.goal_decomposer import goal_decomposer
from core.world_model_manager import world_model_manager
from core.agent_context_builder import AgentContextBuilder
from core.memory_router import MemoryRouter
from core.task_manager import TaskManager
import os
import statistics
import networkx as nx
import psutil
import pandas as pd
import numpy as np
import asyncio
import threading
from dataclasses import dataclass, field
from collections import deque
from core.plugin.base import BasePlugin
from core.decorators import with_connection_pool, cache_result

@dataclass
class Goal:
    """Goal to be scheduled and executed.
    
    Attributes:
        goal_id: Unique identifier for the goal
        priority: Goal priority (1-10)
        deadline: When the goal should be completed
        dependencies: List of goal IDs this goal depends on
        resource_requirements: Dictionary of required resources
        status: Current status of the goal
        start_time: When goal execution started
        completion_time: When goal was completed
        assigned_agent: ID of agent assigned to goal
    """
    goal_id: str
    priority: int
    deadline: datetime
    dependencies: List[str]
    resource_requirements: Dict[str, float]
    status: str  # 'pending', 'running', 'completed', 'failed'
    start_time: Optional[datetime] = None
    completion_time: Optional[datetime] = None
    assigned_agent: Optional[str] = None

class GoalScheduler(BasePlugin):
    def __init__(self, config_path: str = "config/goal_scheduler_config.yaml"):
        super().__init__(
            name="GoalScheduler",
            version="1.0.0",
            description="Goal scheduling and execution management",
            author="Panion Team"
        )
        self.logger = logging.getLogger(__name__)
        self.config = self._load_config(config_path)
        self.data_dir = Path("data")
        self.goals_file = self.data_dir / "goals.json"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize goal tracking
        self.goals: Dict[str, Goal] = {}
        self.scheduled_goals: List[str] = []
        self.running_goals: List[str] = []
        self.completed_goals: List[str] = []
        
        # Initialize resource tracking
        self.available_resources: Dict[str, float] = {
            'cpu': 100.0,  # 100% CPU
            'memory': 1024.0,  # 1GB memory
            'disk': 1024.0  # 1GB disk
        }
        
        # Initialize scheduling
        self._scheduling = False
        self._scheduler_thread = None
        self._scheduler_lock = threading.Lock()
        
        self._schedule_file = Path('data/goal_schedules.json')
        self._schedules = {}
        self._resource_pool = {}
        self.task_manager = TaskManager()
        self.memory_router = MemoryRouter()
        self._load_state()

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.logger.error(f"Error loading config: {e}")
            return {
                'scheduling_interval': 60,  # 60 seconds
                'max_concurrent_goals': 5,
                'resource_limits': {
                    'cpu': 80.0,  # 80% CPU
                    'memory': 512.0,  # 512MB memory
                    'disk': 512.0  # 512MB disk
                }
            }
            
    def start_scheduling(self):
        """Start goal scheduling."""
        if not self._scheduling:
            self._scheduling = True
            self._scheduler_thread = threading.Thread(target=self._scheduler_loop)
            self._scheduler_thread.daemon = True
            self._scheduler_thread.start()
            
    def stop_scheduling(self):
        """Stop goal scheduling."""
        self._scheduling = False
        if self._scheduler_thread:
            self._scheduler_thread.join()
            
    def _scheduler_loop(self):
        """Main scheduling loop."""
        while self._scheduling:
            try:
                with self._scheduler_lock:
                    # Update available resources
                    self._update_available_resources()
                    
                    # Schedule pending goals
                    self._schedule_goals()
                    
                    # Check for completed goals
                    self._check_completed_goals()
                    
                # Sleep until next check
                time.sleep(self.config['scheduling_interval'])
                
            except Exception as e:
                self.logger.error(f"Error in scheduler loop: {e}")
                time.sleep(5)  # Wait before retrying
                
    def _update_available_resources(self):
        """Update available system resources."""
        try:
            # Get CPU usage
            cpu_percent = psutil.cpu_percent()
            self.available_resources['cpu'] = 100.0 - cpu_percent
            
            # Get memory usage
            memory = psutil.virtual_memory()
            self.available_resources['memory'] = memory.available / (1024 * 1024)  # MB
            
            # Get disk usage
            disk = psutil.disk_usage('/')
            self.available_resources['disk'] = disk.free / (1024 * 1024)  # MB
            
        except Exception as e:
            self.logger.error(f"Error updating available resources: {e}")
            
    def _schedule_goals(self):
        """Schedule pending goals."""
        try:
            # Get pending goals
            pending_goals = [
                goal_id for goal_id, goal in self.goals.items()
                if goal.status == 'pending' and goal_id not in self.scheduled_goals
            ]
            
            # Sort by priority and deadline
            pending_goals.sort(key=lambda g: (
                -self.goals[g].priority,  # Higher priority first
                self.goals[g].deadline  # Earlier deadline first
            ))
            
            # Try to schedule each goal
            for goal_id in pending_goals:
                goal = self.goals[goal_id]
                
                # Check dependencies
                if not self._check_dependencies(goal):
                    continue
                    
                # Check resource availability
                if not self._check_resource_availability(goal):
                    continue
                    
                # Assign agent
                agent_id = self._assign_agent(goal)
                if not agent_id:
                    continue
                    
                # Start goal
                self._start_goal(goal_id, agent_id)
                
        except Exception as e:
            self.logger.error(f"Error scheduling goals: {e}")
            
    def _check_dependencies(self, goal: Goal) -> bool:
        """Check if goal dependencies are satisfied.
        
        Args:
            goal: Goal to check dependencies for
            
        Returns:
            bool: True if all dependencies are satisfied
        """
        try:
            for dep_id in goal.dependencies:
                if dep_id not in self.goals:
                    self.logger.warning(f"Dependency {dep_id} not found for goal {goal.goal_id}")
                    return False
                    
                dep_goal = self.goals[dep_id]
                if dep_goal.status != 'completed':
                    return False
                    
            return True
            
        except Exception as e:
            self.logger.error(f"Error checking dependencies: {e}")
            return False
            
    def _check_resource_availability(self, goal: Goal) -> bool:
        """Check if required resources are available.
        
        Args:
            goal: Goal to check resources for
            
        Returns:
            bool: True if all required resources are available
        """
        try:
            for resource, amount in goal.resource_requirements.items():
                if resource not in self.available_resources:
                    self.logger.warning(f"Resource {resource} not available")
                    return False
                    
                if self.available_resources[resource] < amount:
                    return False
                    
            return True
            
        except Exception as e:
            self.logger.error(f"Error checking resource availability: {e}")
            return False
            
    def _assign_agent(self, goal: Goal) -> Optional[str]:
        """Assign an agent to the goal.
        
        Args:
            goal: Goal to assign agent to
            
        Returns:
            Optional[str]: ID of assigned agent, or None if no agent available
        """
        try:
            # Get available agents
            available_agents = [
                agent_id for agent_id, agent in self.agents.items()
                if agent.status == 'active' and agent_id not in self.assigned_agents
            ]
            
            if not available_agents:
                self.logger.warning(f"No available agents for goal {goal.goal_id}")
                return None
                
            # Score each agent based on capabilities and performance
            agent_scores = {}
            for agent_id in available_agents:
                agent = self.agents[agent_id]
                score = 0.0
                
                # Check if agent has required capabilities
                if hasattr(agent, 'capabilities'):
                    matching_capabilities = len([
                        cap for cap in goal.resource_requirements.get('capabilities', [])
                        if cap in agent.capabilities
                    ])
                    score += matching_capabilities * 10
                    
                # Consider agent's performance history
                if hasattr(agent, 'metrics'):
                    success_rate = agent.metrics.get('success_rate', 0.0)
                    avg_response_time = agent.metrics.get('avg_response_time', float('inf'))
                    score += success_rate * 5
                    score -= min(avg_response_time / 1000, 10)  # Penalize slow response times
                    
                # Consider agent's current load
                current_goals = len([
                    g for g in self.goals.values()
                    if g.assigned_agent == agent_id and g.status == 'running'
                ])
                score -= current_goals * 2  # Penalize heavily loaded agents
                
                agent_scores[agent_id] = score
                
            # Select agent with highest score
            if agent_scores:
                best_agent = max(agent_scores.items(), key=lambda x: x[1])
                if best_agent[1] > 0:  # Only assign if score is positive
                    self.logger.info(f"Assigned agent {best_agent[0]} to goal {goal.goal_id}")
                    return best_agent[0]
                    
            self.logger.warning(f"No suitable agent found for goal {goal.goal_id}")
            return None
            
        except Exception as e:
            self.logger.error(f"Error assigning agent: {e}")
            return None
            
    def _start_goal(self, goal_id: str, agent_id: str):
        """Start goal execution.
        
        Args:
            goal_id: ID of goal to start
            agent_id: ID of agent to execute goal
        """
        try:
            goal = self.goals[goal_id]
            
            # Update goal status
            goal.status = 'running'
            goal.start_time = datetime.now()
            goal.assigned_agent = agent_id
            
            # Update tracking lists
            self.scheduled_goals.remove(goal_id)
            self.running_goals.append(goal_id)
            
            # Save changes
            self._save_goals()
            
            self.logger.info(f"Started goal {goal_id} with agent {agent_id}")
            
        except Exception as e:
            self.logger.error(f"Error starting goal: {e}")
            
    def _check_completed_goals(self):
        """Check for completed goals."""
        try:
            for goal_id in self.running_goals[:]:  # Copy list to allow modification
                goal = self.goals[goal_id]
                
                # Check if goal is complete
                if self._is_goal_complete(goal):
                    self._complete_goal(goal_id)
                    
        except Exception as e:
            self.logger.error(f"Error checking completed goals: {e}")
            
    def _is_goal_complete(self, goal: Goal) -> bool:
        """Check if a goal is complete.
        
        Args:
            goal: Goal to check
            
        Returns:
            bool: True if goal is complete, False otherwise
        """
        try:
            # Check if goal is already marked as complete
            if goal.status == 'completed':
                return True
                
            # Check if all dependencies are complete
            for dep_id in goal.dependencies:
                if dep_id not in self.goals:
                    self.logger.warning(f"Dependency {dep_id} not found for goal {goal.goal_id}")
                    continue
                if self.goals[dep_id].status != 'completed':
                    return False
                    
            # Check if goal has exceeded its deadline
            if goal.deadline and datetime.now() > goal.deadline:
                self.logger.warning(f"Goal {goal.goal_id} exceeded deadline")
                goal.status = 'failed'
                return True
                
            # Check if goal has exceeded resource limits
            if goal_id in self.goal_budgets:
                budget = self.goal_budgets[goal_id]
                if budget.status == 'exceeded':
                    self.logger.warning(f"Goal {goal.goal_id} exceeded resource limits")
                    goal.status = 'failed'
                    return True
                    
            # Check if goal has been running for too long
            if goal.start_time:
                duration = datetime.now() - goal.start_time
                if duration > timedelta(hours=24):  # 24 hour timeout
                    self.logger.warning(f"Goal {goal.goal_id} timed out")
                    goal.status = 'failed'
                    return True
                    
            return False
            
        except Exception as e:
            self.logger.error(f"Error checking goal completion: {e}")
            return False
            
    def _complete_goal(self, goal_id: str):
        """Mark goal as complete.
        
        Args:
            goal_id: ID of goal to complete
        """
        try:
            goal = self.goals[goal_id]
            
            # Update goal status
            goal.status = 'completed'
            goal.completion_time = datetime.now()
            
            # Update tracking lists
            self.running_goals.remove(goal_id)
            self.completed_goals.append(goal_id)
            
            # Save changes
            self._save_goals()
            
            self.logger.info(f"Completed goal {goal_id}")
            
        except Exception as e:
            self.logger.error(f"Error completing goal: {e}")
            
    def _save_goals(self):
        """Save goals to file."""
        try:
            data = {
                goal_id: {
                    'priority': goal.priority,
                    'deadline': goal.deadline.isoformat(),
                    'dependencies': goal.dependencies,
                    'resource_requirements': goal.resource_requirements,
                    'status': goal.status,
                    'start_time': goal.start_time.isoformat() if goal.start_time else None,
                    'completion_time': goal.completion_time.isoformat() if goal.completion_time else None,
                    'assigned_agent': goal.assigned_agent
                }
                for goal_id, goal in self.goals.items()
            }
            with open(self.goals_file, 'w') as f:
                json.dump(data, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Error saving goals: {e}")
            
    def add_goal(self, goal: Goal):
        """Add a new goal to the scheduler.
        
        Args:
            goal: Goal to add
        """
        try:
            self.goals[goal.goal_id] = goal
            self.scheduled_goals.append(goal.goal_id)
            self._save_goals()
            self.logger.info(f"Added goal {goal.goal_id}")
            
        except Exception as e:
            self.logger.error(f"Error adding goal: {e}")
            
    def get_goal_status(self, goal_id: str) -> Dict[str, Any]:
        """Get status of a goal.
        
        Args:
            goal_id: ID of goal to get status for
            
        Returns:
            Dict containing goal status
        """
        try:
            if goal_id not in self.goals:
                return {'error': f'Goal {goal_id} not found'}
                
            goal = self.goals[goal_id]
            return {
                'goal_id': goal.goal_id,
                'priority': goal.priority,
                'deadline': goal.deadline.isoformat(),
                'dependencies': goal.dependencies,
                'resource_requirements': goal.resource_requirements,
                'status': goal.status,
                'start_time': goal.start_time.isoformat() if goal.start_time else None,
                'completion_time': goal.completion_time.isoformat() if goal.completion_time else None,
                'assigned_agent': goal.assigned_agent
            }
            
        except Exception as e:
            self.logger.error(f"Error getting goal status: {e}")
            return {'error': str(e)}
            
    def get_scheduler_status(self) -> Dict[str, Any]:
        """Get current scheduler status.
        
        Returns:
            Dict containing scheduler status
        """
        try:
            return {
                'total_goals': len(self.goals),
                'pending_goals': len(self.scheduled_goals),
                'running_goals': len(self.running_goals),
                'completed_goals': len(self.completed_goals),
                'available_resources': self.available_resources,
                'scheduler_active': self._scheduling
            }
            
        except Exception as e:
            self.logger.error(f"Error getting scheduler status: {e}")
            return {'error': str(e)}
            
    async def stop(self):
        """Stop the scheduler and cleanup resources."""
        try:
            self.stop_scheduling()
            self._save_goals()
            self.logger.info("Goal Scheduler stopped")
        except Exception as e:
            self.logger.error(f"Error stopping Goal Scheduler: {e}")
            raise

    def _load_state(self) -> None:
        """Load scheduler state."""
        try:
            if self.goals_file.exists():
                with open(self.goals_file, 'r') as f:
                    state = json.load(f)
                    self.goals = {goal_id: Goal(**goal_data) for goal_id, goal_data in state.items()}
                    self.scheduled_goals = list(self.goals.keys())
        except Exception as e:
            self.logger.error(f"Error loading scheduler state: {e}")
            reflection_system.log_thought(
                "goal_scheduler",
                f"Error loading scheduler state: {str(e)}",
                {"error": str(e)}
            )

    def _save_state(self) -> None:
        """Save scheduler state."""
        try:
            state = {goal_id: goal.__dict__ for goal_id, goal in self.goals.items()}
            with open(self.goals_file, 'w') as f:
                json.dump(state, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving scheduler state: {e}")
            reflection_system.log_thought(
                "goal_scheduler",
                f"Error saving scheduler state: {str(e)}",
                {"error": str(e)}
            )

    async def schedule_goal(self,
                          goal_id: str,
                          priority: int = 0,
                          deadline: Optional[str] = None) -> Dict[str, Any]:
        """Schedule a goal for execution."""
        try:
            reflection_system.log_thought(
                "goal_scheduler",
                f"Scheduling goal: {goal_id}",
                {
                    "goal_id": goal_id,
                    "priority": priority,
                    "deadline": deadline
                }
            )

            # Get goal plan
            plan = goal_decomposer.get_plan(goal_id)
            if not plan:
                raise ValueError(f"Plan not found for goal: {goal_id}")

            # Create schedule
            schedule = self._create_schedule(plan, priority, deadline)
            
            # Allocate resources
            resource_allocation = await self._allocate_resources(schedule)
            
            # Update schedule with resource allocation
            schedule['resource_allocation'] = resource_allocation
            
            # Store schedule
            self._schedules[goal_id] = schedule
            self._save_state()

            reflection_system.log_thought(
                "goal_scheduler",
                f"Scheduled goal: {goal_id}",
                {
                    "schedule": schedule,
                    "status": "success"
                }
            )

            return schedule

        except Exception as e:
            reflection_system.log_thought(
                "goal_scheduler",
                f"Error scheduling goal: {str(e)}",
                {
                    "goal_id": goal_id,
                    "error": str(e)
                }
            )
            raise

    def _create_schedule(self,
                        plan: Dict[str, Any],
                        priority: int,
                        deadline: Optional[str]) -> Dict[str, Any]:
        """Create a schedule for a goal plan."""
        schedule = {
            'goal_id': plan['goal_id'],
            'priority': priority,
            'deadline': deadline,
            'created_at': datetime.now().isoformat(),
            'status': 'scheduled',
            'tasks': [],
            'timeline': []
        }

        # Process subtasks
        for subtask in plan['plan']['subtasks']:
            task = {
                'subtask_id': subtask['id'],
                'description': subtask['description'],
                'dependencies': subtask['dependencies'],
                'estimated_duration': self._estimate_duration(subtask),
                'status': 'pending',
                'start_time': None,
                'end_time': None
            }
            schedule['tasks'].append(task)

        # Create timeline
        schedule['timeline'] = self._create_timeline(schedule['tasks'])

        return schedule

    def _estimate_duration(self, goal: Dict[str, Any]) -> float:
        """Estimate the duration of a goal.
        
        Args:
            goal: Goal dictionary
            
        Returns:
            Estimated duration in seconds
        """
        # Base duration from goal metadata
        base_duration = goal.get('estimated_duration', 0)
        
        # Adjust based on complexity
        complexity_factor = self._get_complexity_factor(goal)
        
        # Adjust based on resource constraints
        resource_factor = self._get_resource_factor(goal)
        
        # Adjust based on dependencies
        dependency_factor = self._get_dependency_factor(goal)
        
        # Adjust based on historical data
        historical_factor = self._get_historical_factor(goal)
        
        # Calculate final duration
        duration = base_duration * complexity_factor * resource_factor * dependency_factor * historical_factor
        
        # Add buffer for uncertainty
        uncertainty_buffer = duration * 0.2  # 20% buffer
        
        return duration + uncertainty_buffer
        
    def _get_complexity_factor(self, goal: Dict[str, Any]) -> float:
        """Calculate complexity factor based on goal attributes."""
        factor = 1.0
        
        # Adjust based on number of constraints
        if 'constraints' in goal:
            factor *= (1 + len(goal['constraints']) * 0.1)
            
        # Adjust based on number of dependencies
        if 'dependencies' in goal:
            factor *= (1 + len(goal['dependencies']) * 0.05)
            
        # Adjust based on number of required plugins
        if 'required_plugins' in goal:
            factor *= (1 + len(goal['required_plugins']) * 0.15)
            
        # Adjust based on priority
        if 'priority' in goal:
            # Higher priority goals may take longer due to more careful execution
            factor *= (1 + (goal['priority'] - 1) * 0.1)
            
        return factor
        
    def _get_resource_factor(self, goal: Dict[str, Any]) -> float:
        """Calculate resource factor based on resource constraints."""
        factor = 1.0
        
        if 'constraints' not in goal:
            return factor
            
        for constraint in goal['constraints']:
            if constraint['type'] == 'resource':
                resource_type = constraint['parameters'].get('resource_type')
                amount = constraint['parameters'].get('amount', 0)
                
                if not resource_type or amount <= 0:
                    continue
                    
                # Get resource limit
                limit = self._get_resource_limit(resource_type)
                
                # Calculate resource utilization
                utilization = amount / limit
                
                # Higher utilization may lead to longer duration
                factor *= (1 + utilization * 0.3)
                
        return factor
        
    def _get_dependency_factor(self, goal: Dict[str, Any]) -> float:
        """Calculate dependency factor based on goal dependencies."""
        factor = 1.0
        
        if 'dependencies' not in goal:
            return factor
            
        # Get all dependent goals
        dependent_goals = []
        for dep_id in goal['dependencies']:
            dep_goal = self._get_goal(dep_id)
            if dep_goal:
                dependent_goals.append(dep_goal)
                
        if not dependent_goals:
            return factor
            
        # Calculate average duration of dependencies
        total_duration = 0
        for dep_goal in dependent_goals:
            total_duration += dep_goal.get('estimated_duration', 0)
            
        avg_duration = total_duration / len(dependent_goals)
        
        # Adjust factor based on dependency duration
        factor *= (1 + avg_duration * 0.01)
        
        return factor
        
    def _get_historical_factor(self, goal: Dict[str, Any]) -> float:
        """Calculate factor based on historical goal execution data."""
        factor = 1.0
        
        try:
            metrics_manager = service_locator.get_service('metrics_manager')
            historical_data = metrics_manager.get_goal_metrics(goal['id'])
            
            if not historical_data:
                return factor
                
            # Calculate average duration from history
            durations = []
            for data in historical_data:
                if 'duration' in data:
                    durations.append(data['duration'])
                    
            if durations:
                avg_duration = sum(durations) / len(durations)
                std_duration = statistics.stdev(durations) if len(durations) > 1 else 0
                
                # Adjust factor based on historical average and variation
                factor *= (1 + (std_duration / avg_duration) * 0.5)
                
        except Exception as e:
            reflection_system.log_thought(
                "goal_scheduler",
                f"Error getting historical data: {str(e)}",
                {
                    "goal_id": goal['id'],
                    "error": str(e)
                }
            )
            
        return factor

    def _create_timeline(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Create a timeline for tasks based on dependencies."""
        timeline = []
        current_time = datetime.now()

        # Sort tasks by dependencies
        sorted_tasks = self._topological_sort(tasks)

        for task in sorted_tasks:
            # Calculate start time based on dependencies
            start_time = self._calculate_start_time(task, timeline, current_time)
            
            # Calculate end time based on duration
            end_time = start_time + timedelta(minutes=task['estimated_duration'])
            
            timeline_entry = {
                'task_id': task['subtask_id'],
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'duration': task['estimated_duration']
            }
            timeline.append(timeline_entry)

        return timeline

    def _topological_sort(self, goals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Perform topological sort on goals based on dependencies.
        
        Args:
            goals: List of goal dictionaries
            
        Returns:
            Sorted list of goals
        """
        # Create directed graph
        graph = nx.DiGraph()
        
        # Add all goals to graph
        for goal in goals:
            graph.add_node(goal['id'], goal=goal)
            
        # Add edges based on dependencies
        for goal in goals:
            if 'dependencies' in goal:
                for dep_id in goal['dependencies']:
                    if dep_id in graph:
                        graph.add_edge(dep_id, goal['id'])
                        
        # Check for cycles
        try:
            cycle = nx.find_cycle(graph)
            raise ValueError(f"Circular dependency detected: {' -> '.join(cycle)}")
        except nx.NetworkXNoCycle:
            pass
            
        # Get topological sort
        try:
            ordered_nodes = list(nx.topological_sort(graph))
            return [graph.nodes[node]['goal'] for node in ordered_nodes]
        except nx.NetworkXUnfeasible:
            raise ValueError("Could not resolve goal dependencies")
            
    def _calculate_start_times(self, goals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Calculate start times for goals based on dependencies and constraints.
        
        Args:
            goals: List of goal dictionaries
            
        Returns:
            List of goals with calculated start times
        """
        # Sort goals topologically
        sorted_goals = self._topological_sort(goals)
        
        # Track resource usage over time
        resource_usage = {}
        
        # Calculate start times
        for goal in sorted_goals:
            # Get earliest possible start time based on dependencies
            earliest_start = datetime.now()
            
            if 'dependencies' in goal:
                for dep_id in goal['dependencies']:
                    dep_goal = self._get_goal(dep_id)
                    if dep_goal and 'end_time' in dep_goal:
                        dep_end = datetime.fromisoformat(dep_goal['end_time'])
                        if dep_end > earliest_start:
                            earliest_start = dep_end
                            
            # Adjust for resource constraints
            if 'constraints' in goal:
                for constraint in goal['constraints']:
                    if constraint['type'] == 'resource':
                        resource_type = constraint['parameters'].get('resource_type')
                        amount = constraint['parameters'].get('amount', 0)
                        
                        if not resource_type or amount <= 0:
                            continue
                            
                        # Initialize resource tracking
                        if resource_type not in resource_usage:
                            resource_usage[resource_type] = []
                            
                        # Find earliest time when resource is available
                        current_time = earliest_start
                        while True:
                            # Check if resource is available at current time
                            available = True
                            for usage in resource_usage[resource_type]:
                                if (current_time >= usage['start'] and
                                    current_time < usage['end']):
                                    if usage['amount'] + amount > self._get_resource_limit(resource_type):
                                        available = False
                                        break
                                        
                            if available:
                                break
                                
                            # Move to next time slot
                            current_time += timedelta(minutes=1)
                            
                        if current_time > earliest_start:
                            earliest_start = current_time
                            
            # Set start time
            goal['start_time'] = earliest_start.isoformat()
            
            # Calculate end time
            duration = self._estimate_duration(goal)
            goal['end_time'] = (earliest_start + timedelta(seconds=duration)).isoformat()
            
            # Update resource usage
            if 'constraints' in goal:
                for constraint in goal['constraints']:
                    if constraint['type'] == 'resource':
                        resource_type = constraint['parameters'].get('resource_type')
                        amount = constraint['parameters'].get('amount', 0)
                        
                        if not resource_type or amount <= 0:
                            continue
                            
                        resource_usage[resource_type].append({
                            'start': earliest_start,
                            'end': datetime.fromisoformat(goal['end_time']),
                            'amount': amount,
                            'goal_id': goal['id']
                        })
                        
        return sorted_goals

    def _calculate_start_time(self,
                            task: Dict[str, Any],
                            timeline: List[Dict[str, Any]],
                            current_time: datetime) -> datetime:
        """Calculate the optimal start time for a task.
        
        Args:
            task: Task dictionary
            timeline: Current timeline of tasks
            current_time: Current system time
            
        Returns:
            datetime: Calculated start time
        """
        # Get task dependencies
        dependencies = task.get('dependencies', [])
        if not dependencies:
            return current_time
            
        # Find latest end time of dependencies
        latest_end_time = current_time
        for dep_id in dependencies:
            for timeline_task in timeline:
                if timeline_task['subtask_id'] == dep_id:
                    if timeline_task['end_time']:
                        dep_end_time = datetime.fromisoformat(timeline_task['end_time'])
                        latest_end_time = max(latest_end_time, dep_end_time)
                    break
                    
        # Add buffer time between tasks
        buffer_time = timedelta(minutes=5)  # 5-minute buffer between tasks
        
        # Check resource availability
        required_resources = self._get_required_resources(task)
        available_time = self._find_next_resource_availability(
            required_resources,
            latest_end_time + buffer_time,
            timeline
        )
        
        return available_time
        
    def _find_next_resource_availability(
        self,
        required_resources: Dict[str, Any],
        start_time: datetime,
        timeline: List[Dict[str, Any]]
    ) -> datetime:
        """Find the next time when all required resources are available.
        
        Args:
            required_resources: Dictionary of required resources
            start_time: Time to start looking from
            timeline: Current timeline of tasks
            
        Returns:
            datetime: Next available time slot
        """
        current_time = start_time
        while True:
            # Check if resources are available at current time
            if self._check_resource_availability_at_time(
                required_resources,
                current_time,
                timeline
            ):
                return current_time
                
            # Move to next time slot (15-minute intervals)
            current_time += timedelta(minutes=15)
            
    def _check_resource_availability_at_time(
        self,
        required_resources: Dict[str, Any],
        time: datetime,
        timeline: List[Dict[str, Any]]
    ) -> bool:
        """Check if resources are available at a specific time.
        
        Args:
            required_resources: Dictionary of required resources
            time: Time to check
            timeline: Current timeline of tasks
            
        Returns:
            bool: True if resources are available
        """
        # Get current resource usage at the specified time
        current_usage = self._get_resource_usage_at_time(time, timeline)
        
        # Check each required resource
        for resource_type, amount in required_resources.items():
            current_amount = current_usage.get(resource_type, 0)
            limit = self._get_resource_limit(resource_type)
            
            if current_amount + amount > limit:
                return False
                
        return True
        
    def _get_resource_usage_at_time(
        self,
        time: datetime,
        timeline: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Get resource usage at a specific time.
        
        Args:
            time: Time to check
            timeline: Current timeline of tasks
            
        Returns:
            Dict[str, float]: Resource usage at the specified time
        """
        usage = {}
        
        for task in timeline:
            if task['start_time'] and task['end_time']:
                start = datetime.fromisoformat(task['start_time'])
                end = datetime.fromisoformat(task['end_time'])
                
                if start <= time <= end:
                    task_resources = self._get_required_resources(task)
                    for resource_type, amount in task_resources.items():
                        usage[resource_type] = usage.get(resource_type, 0) + amount
                        
        return usage

    def _get_required_resources(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze and determine required resources for a task.
        
        Args:
            task: Task dictionary
            
        Returns:
            Dict[str, Any]: Required resources
        """
        resources = {
            'cpu': 0.0,
            'memory': 0.0,
            'disk': 0.0,
            'network': 0.0
        }
        
        # Base resource requirements
        resources['cpu'] = 0.1  # 10% CPU
        resources['memory'] = 100  # 100MB
        resources['disk'] = 10  # 10MB
        resources['network'] = 1  # 1Mbps
        
        # Adjust based on task complexity
        if 'complexity' in task:
            complexity = task['complexity']
            resources['cpu'] *= (1 + complexity * 0.5)
            resources['memory'] *= (1 + complexity * 0.3)
            
        # Adjust based on task type
        if 'type' in task:
            task_type = task['type']
            if task_type == 'computation':
                resources['cpu'] *= 2
            elif task_type == 'data_processing':
                resources['memory'] *= 2
                resources['disk'] *= 2
            elif task_type == 'network':
                resources['network'] *= 2
                
        # Adjust based on estimated duration
        if 'estimated_duration' in task:
            duration = task['estimated_duration']
            if duration > 3600:  # More than 1 hour
                resources['memory'] *= 1.5  # Increase memory for long-running tasks
                
        # Ensure minimum values
        for resource_type in resources:
            resources[resource_type] = max(resources[resource_type], 0.01)
            
        return resources

    def _check_resource_availability(
        self,
        required_resources: Dict[str, Any],
        timeline: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Check if required resources are available.
        
        Args:
            required_resources: Dictionary of required resources
            timeline: Current timeline of tasks
            
        Returns:
            Dict[str, Any]: Resource availability status
        """
        result = {
            'available': True,
            'constraints': [],
            'suggestions': []
        }
        
        # Get current resource usage
        current_usage = self._get_current_resource_usage(timeline)
        
        # Check each required resource
        for resource_type, amount in required_resources.items():
            current_amount = current_usage.get(resource_type, 0)
            limit = self._get_resource_limit(resource_type)
            
            if current_amount + amount > limit:
                result['available'] = False
                result['constraints'].append({
                    'resource': resource_type,
                    'required': amount,
                    'available': limit - current_amount,
                    'total': limit
                })
                
                # Add suggestions for resource optimization
                if resource_type == 'cpu':
                    result['suggestions'].append(
                        "Consider scheduling CPU-intensive tasks during off-peak hours"
                    )
                elif resource_type == 'memory':
                    result['suggestions'].append(
                        "Consider implementing memory cleanup between tasks"
                    )
                elif resource_type == 'disk':
                    result['suggestions'].append(
                        "Consider implementing disk space cleanup"
                    )
                elif resource_type == 'network':
                    result['suggestions'].append(
                        "Consider implementing network bandwidth throttling"
                    )
                    
        return result
        
    def _get_current_resource_usage(self, timeline: List[Dict[str, Any]]) -> Dict[str, float]:
        """Get current resource usage across all tasks.
        
        Args:
            timeline: Current timeline of tasks
            
        Returns:
            Dict[str, float]: Current resource usage
        """
        usage = {}
        current_time = datetime.now()
        
        for task in timeline:
            if task['start_time'] and task['end_time']:
                start = datetime.fromisoformat(task['start_time'])
                end = datetime.fromisoformat(task['end_time'])
                
                if start <= current_time <= end:
                    task_resources = self._get_required_resources(task)
                    for resource_type, amount in task_resources.items():
                        usage[resource_type] = usage.get(resource_type, 0) + amount
                        
        return usage

    async def _allocate_resources(self,
                                schedule: Dict[str, Any]) -> Dict[str, Any]:
        """Allocate resources for a schedule."""
        try:
            reflection_system.log_thought(
                "goal_scheduler",
                "Allocating resources",
                {"schedule": schedule}
            )

            allocation = {
                'allocated_resources': {},
                'resource_conflicts': []
            }

            # Check resource availability
            for task in schedule['tasks']:
                required_resources = self._get_required_resources(task)
                available_resources = self._check_resource_availability(
                    required_resources,
                    schedule['timeline']
                )

                if not available_resources['available']:
                    allocation['resource_conflicts'].append({
                        'task_id': task['subtask_id'],
                        'conflicts': available_resources['constraints']
                    })
                else:
                    allocation['allocated_resources'][task['subtask_id']] = \
                        available_resources['resources']

            reflection_system.log_thought(
                "goal_scheduler",
                "Resource allocation complete",
                {"allocation": allocation}
            )

            return allocation

        except Exception as e:
            reflection_system.log_thought(
                "goal_scheduler",
                f"Error allocating resources: {str(e)}",
                {"error": str(e)}
            )
            raise

    async def update_schedule(self,
                            goal_id: str,
                            updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update a goal schedule."""
        try:
            reflection_system.log_thought(
                "goal_scheduler",
                f"Updating schedule for goal: {goal_id}",
                {
                    "goal_id": goal_id,
                    "updates": updates
                }
            )

            if goal_id not in self._schedules:
                raise ValueError(f"Schedule for goal {goal_id} not found")

            schedule = self._schedules[goal_id]
            schedule.update(updates)
            schedule['updated_at'] = datetime.now().isoformat()

            # Reallocate resources if needed
            if 'resource_allocation' in updates:
                schedule['resource_allocation'] = await self._allocate_resources(schedule)

            self._save_state()

            reflection_system.log_thought(
                "goal_scheduler",
                f"Updated schedule for goal: {goal_id}",
                {"status": "success"}
            )

            return schedule

        except Exception as e:
            reflection_system.log_thought(
                "goal_scheduler",
                f"Error updating schedule: {str(e)}",
                {
                    "goal_id": goal_id,
                    "error": str(e)
                }
            )
            raise

    async def get_schedule(self, goal_id: str) -> Optional[Dict[str, Any]]:
        """Get a goal schedule by ID."""
        return self._schedules.get(goal_id)

    async def get_all_schedules(self) -> Dict[str, Any]:
        """Get all goal schedules."""
        return self._schedules

    async def get_resource_usage(self,
                               start_time: str,
                               end_time: str) -> Dict[str, Any]:
        """Get resource usage for a time period."""
        try:
            reflection_system.log_thought(
                "goal_scheduler",
                "Getting resource usage",
                {
                    "start_time": start_time,
                    "end_time": end_time
                }
            )

            usage = {
                'period': {
                    'start': start_time,
                    'end': end_time
                },
                'resource_usage': {},
                'conflicts': []
            }

            # Get timeline for the period
            timeline = []
            for schedule in self._schedules.values():
                for task in schedule.get('tasks', []):
                    if task['start_time'] and task['end_time']:
                        start = datetime.fromisoformat(task['start_time'])
                        end = datetime.fromisoformat(task['end_time'])
                        if start >= datetime.fromisoformat(start_time) and end <= datetime.fromisoformat(end_time):
                            timeline.append(task)

            # Calculate resource usage metrics
            usage['resource_usage'] = {
                'cpu': {
                    'current': self._get_current_resource_usage(timeline).get('cpu', 0),
                    'peak': max(self._get_resource_usage_at_time(t, timeline).get('cpu', 0) 
                              for t in pd.date_range(start_time, end_time, freq='1min')),
                    'average': np.mean([self._get_resource_usage_at_time(t, timeline).get('cpu', 0) 
                                      for t in pd.date_range(start_time, end_time, freq='1min')])
                },
                'memory': {
                    'current': self._get_current_resource_usage(timeline).get('memory', 0),
                    'peak': max(self._get_resource_usage_at_time(t, timeline).get('memory', 0) 
                              for t in pd.date_range(start_time, end_time, freq='1min')),
                    'average': np.mean([self._get_resource_usage_at_time(t, timeline).get('memory', 0) 
                                      for t in pd.date_range(start_time, end_time, freq='1min')])
                },
                'disk': {
                    'current': self._get_current_resource_usage(timeline).get('disk', 0),
                    'peak': max(self._get_resource_usage_at_time(t, timeline).get('disk', 0) 
                              for t in pd.date_range(start_time, end_time, freq='1min')),
                    'average': np.mean([self._get_resource_usage_at_time(t, timeline).get('disk', 0) 
                                      for t in pd.date_range(start_time, end_time, freq='1min')])
                }
            }

            # Add resource efficiency metrics
            usage['efficiency'] = {
                'cpu': self._calculate_resource_efficiency('cpu', 
                    usage['resource_usage']['cpu']['average'],
                    (datetime.fromisoformat(end_time) - datetime.fromisoformat(start_time)).total_seconds()),
                'memory': self._calculate_resource_efficiency('memory',
                    usage['resource_usage']['memory']['average'],
                    (datetime.fromisoformat(end_time) - datetime.fromisoformat(start_time)).total_seconds()),
                'disk': self._calculate_resource_efficiency('disk',
                    usage['resource_usage']['disk']['average'],
                    (datetime.fromisoformat(end_time) - datetime.fromisoformat(start_time)).total_seconds())
            }

            # Add resource cost analysis
            usage['costs'] = {
                'cpu': self._calculate_resource_cost('cpu', usage['resource_usage']['cpu']),
                'memory': self._calculate_resource_cost('memory', usage['resource_usage']['memory']),
                'disk': self._calculate_resource_cost('disk', usage['resource_usage']['disk'])
            }

            # Add performance impact analysis
            usage['performance_impact'] = {
                'cpu': self._calculate_performance_impact('cpu', 
                    [{'time': t, 'usage': self._get_resource_usage_at_time(t, timeline).get('cpu', 0)}
                     for t in pd.date_range(start_time, end_time, freq='1min')],
                    usage['resource_usage']),
                'memory': self._calculate_performance_impact('memory',
                    [{'time': t, 'usage': self._get_resource_usage_at_time(t, timeline).get('memory', 0)}
                     for t in pd.date_range(start_time, end_time, freq='1min')],
                    usage['resource_usage']),
                'disk': self._calculate_performance_impact('disk',
                    [{'time': t, 'usage': self._get_resource_usage_at_time(t, timeline).get('disk', 0)}
                     for t in pd.date_range(start_time, end_time, freq='1min')],
                    usage['resource_usage'])
            }

            # Add optimization suggestions
            usage['optimization_suggestions'] = self._generate_optimization_suggestions(usage)

            # Add trends and predictions
            usage['trends'] = self._analyze_trends_and_predictions(usage, {
                'cpu': [{'time': t, 'usage': self._get_resource_usage_at_time(t, timeline).get('cpu', 0)}
                       for t in pd.date_range(start_time, end_time, freq='1min')],
                'memory': [{'time': t, 'usage': self._get_resource_usage_at_time(t, timeline).get('memory', 0)}
                          for t in pd.date_range(start_time, end_time, freq='1min')],
                'disk': [{'time': t, 'usage': self._get_resource_usage_at_time(t, timeline).get('disk', 0)}
                        for t in pd.date_range(start_time, end_time, freq='1min')]
            })

            reflection_system.log_thought(
                "goal_scheduler",
                "Resource usage analysis complete",
                {"usage": usage}
            )

            return usage

        except Exception as e:
            reflection_system.log_thought(
                "goal_scheduler",
                f"Error getting resource usage: {str(e)}",
                {"error": str(e)}
            )
            raise

    def process_goal_completion(
        self,
        goal_id: str,
        context_builder: Optional[AgentContextBuilder] = None
    ) -> Dict[str, Any]:
        """
        Handle goal completion and cleanup
        
        Args:
            goal_id: ID of goal to process
            context_builder: Optional context builder for gathering goal info
            
        Returns:
            Dictionary with completion details
        """
        # Get goal context if builder provided
        context = {}
        if context_builder:
            context = context_builder.get_context(goal_id)
            
        # Get goal status
        status = self.task_manager.get_goal_status(goal_id)
        
        # Create completion reflection
        reflection = {
            "goal_id": goal_id,
            "completion_time": datetime.now().isoformat(),
            "type": "completion",
            "status": status,
            "subtask_results": [
                {
                    "id": subtask["id"],
                    "status": subtask["status"],
                    "agent": subtask.get("claimed_by")
                }
                for subtask in context.get("subgoals", [])
            ],
            "plugin_updates": [
                {
                    "plugin_id": plugin_id,
                    "updates": plugin_data
                }
                for plugin_id, plugin_data in context.get("plugins", {}).items()
            ],
            "memories": [
                {
                    "id": memory.id,
                    "type": memory.type.value,
                    "content": memory.content
                }
                for memory in context.get("memories", [])
            ]
        }
        
        # Store reflection
        self.memory_router.store_reflection(
            goal_id=goal_id,
            reflection=reflection,
            agent_id="system",
            priority=10  # High priority for completion reflections
        )
        
        # Mark goal complete
        self.task_manager.complete_goal(goal_id)
        
        # Clean up any temporary resources
        self._cleanup_goal_resources(goal_id)
        
        self.logger.info(f"Processed completion for goal {goal_id}")
        
        return {
            "goal_id": goal_id,
            "status": "completed",
            "completion_time": reflection["completion_time"],
            "subtask_summary": status["subtasks"],
            "agent_summary": status["agents"]
        }
    
    def _cleanup_goal_resources(self, goal_id: str) -> None:
        """Clean up resources allocated to a goal.
        
        Args:
            goal_id: ID of the goal to clean up
        """
        try:
            # Get goal schedule
            schedule = self._schedules.get(goal_id)
            if not schedule:
                return
                
            # Release resources for each task
            for task in schedule.get('tasks', []):
                resources = self._get_required_resources(task)
                for resource_type in resources:
                    self._release_resource(resource_type, goal_id)
                    
            # Clean up temporary files
            self._cleanup_temporary_files(goal_id)
            
            # Update resource pool
            self._update_resource_pool()
            
            # Log cleanup
            self.logger.info(f"Cleaned up resources for goal: {goal_id}")
            reflection_system.log_thought(
                "goal_scheduler",
                f"Cleaned up resources for goal: {goal_id}",
                {"goal_id": goal_id}
            )
            
        except Exception as e:
            self.logger.error(f"Error cleaning up resources for goal {goal_id}: {e}")
            reflection_system.log_thought(
                "goal_scheduler",
                f"Error cleaning up resources for goal {goal_id}: {str(e)}",
                {"goal_id": goal_id, "error": str(e)}
            )
            
    def _cleanup_temporary_files(self, goal_id: str) -> None:
        """Clean up temporary files created by a goal.
        
        Args:
            goal_id: ID of the goal
        """
        try:
            # Get goal's temporary directory
            temp_dir = Path('data/temp') / goal_id
            if temp_dir.exists():
                # Remove all files in the directory
                for file in temp_dir.glob('*'):
                    try:
                        file.unlink()
                    except Exception as e:
                        self.logger.warning(f"Error removing file {file}: {e}")
                        
                # Remove the directory itself
                temp_dir.rmdir()
                
        except Exception as e:
            self.logger.error(f"Error cleaning up temporary files for goal {goal_id}: {e}")
            
    def _update_resource_pool(self) -> None:
        """Update the resource pool with current system state."""
        try:
            # Get current system resource usage
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Update resource pool
            self._resource_pool.update({
                'cpu': {
                    'total': 100.0,
                    'used': cpu_percent,
                    'available': 100.0 - cpu_percent
                },
                'memory': {
                    'total': memory.total,
                    'used': memory.used,
                    'available': memory.available
                },
                'disk': {
                    'total': disk.total,
                    'used': disk.used,
                    'available': disk.free
                }
            })
            
            # Save updated state
            self._save_state()
            
        except Exception as e:
            self.logger.error(f"Error updating resource pool: {e}")
            reflection_system.log_thought(
                "goal_scheduler",
                f"Error updating resource pool: {str(e)}",
                {"error": str(e)}
            )

    def _release_resource(self, resource_type: str, goal_id: str) -> None:
        """Release a resource allocated to a goal."""
        if resource_type in self._resource_allocations:
            if goal_id in self._resource_allocations[resource_type]:
                del self._resource_allocations[resource_type][goal_id]
                
    def _update_dependent_goal(self, dependent_goal: Dict[str, Any], completed_goal: Dict[str, Any]) -> None:
        """Update a dependent goal when a prerequisite goal is completed."""
        if 'dependencies' in dependent_goal:
            # Remove completed goal from dependencies
            if completed_goal['id'] in dependent_goal['dependencies']:
                dependent_goal['dependencies'].remove(completed_goal['id'])
                
            # If no more dependencies, update status
            if not dependent_goal['dependencies']:
                if dependent_goal['status'] == 'pending':
                    dependent_goal['status'] = 'in_progress'
                    
        # Update goal in storage
        self._update_goal(dependent_goal)

    def _analyze_resource_usage(self, goals: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze resource usage patterns and provide insights.
        
        Args:
            goals: List of goals to analyze
            
        Returns:
            Dict containing resource usage analysis
        """
        try:
            analysis = {
                'timestamp': datetime.now().isoformat(),
                'resources': {},
                'overall': {
                    'total_goals': len(goals),
                    'active_goals': 0,
                    'completed_goals': 0,
                    'resource_efficiency': 0.0,
                    'cost_analysis': {},
                    'performance_impact': {},
                    'optimization_suggestions': [],
                    'trends_and_predictions': {}
                }
            }
            
            # Track resource usage over time
            usage_over_time = {}
            goal_resource_usage = {}
            
            # Analyze each goal's resource usage
            for goal in goals:
                status = goal.get('status', 'unknown')
                if status == 'active':
                    analysis['overall']['active_goals'] += 1
                elif status == 'completed':
                    analysis['overall']['completed_goals'] += 1
                    
                # Get resource constraints
                if 'constraints' in goal:
                    for constraint in goal['constraints']:
                        if constraint['type'] == 'resource':
                            resource_type = constraint['parameters'].get('resource_type')
                            amount = constraint['parameters'].get('amount', 0)
                            
                            if not resource_type or amount <= 0:
                                continue
                                
                            # Initialize resource tracking
                            if resource_type not in analysis['resources']:
                                analysis['resources'][resource_type] = {
                                    'current_usage': 0.0,
                                    'peak_usage': 0.0,
                                    'average_usage': 0.0,
                                    'efficiency': 0.0,
                                    'cost': {},
                                    'performance_impact': {},
                                    'optimization_suggestions': [],
                                    'trends': {}
                                }
                                
                            # Track usage over time
                            if resource_type not in usage_over_time:
                                usage_over_time[resource_type] = []
                                
                            # Record usage data
                            start_time = datetime.fromisoformat(goal.get('start_time', datetime.now().isoformat()))
                            end_time = datetime.fromisoformat(goal.get('end_time', datetime.now().isoformat()))
                            duration = (end_time - start_time).total_seconds()
                            
                            usage_data = {
                                'goal_id': goal['id'],
                                'amount': amount,
                                'start_time': start_time.isoformat(),
                                'end_time': end_time.isoformat(),
                                'duration': duration
                            }
                            
                            usage_over_time[resource_type].append(usage_data)
                            
                            # Track per-goal usage
                            if goal['id'] not in goal_resource_usage:
                                goal_resource_usage[goal['id']] = {}
                            goal_resource_usage[goal['id']][resource_type] = usage_data
                            
                            # Update current usage
                            if status == 'active':
                                analysis['resources'][resource_type]['current_usage'] += amount
                                
                            # Update peak usage
                            analysis['resources'][resource_type]['peak_usage'] = max(
                                analysis['resources'][resource_type]['peak_usage'],
                                amount
                            )
                            
            # Calculate averages and analyze patterns for each resource
            for resource_type, resource_data in analysis['resources'].items():
                usage_data = usage_over_time.get(resource_type, [])
                if not usage_data:
                    continue
                    
                # Calculate average usage
                total_amount = sum(data['amount'] for data in usage_data)
                resource_data['average_usage'] = total_amount / len(usage_data)
                
                # Calculate resource efficiency
                resource_data['efficiency'] = self._calculate_resource_efficiency(
                    resource_type,
                    resource_data['current_usage'],
                    resource_data['peak_usage']
                )
                
                # Calculate overall efficiency metrics
                efficiency_data = self._calculate_overall_efficiency(
                    resource_type,
                    usage_data,
                    goal_resource_usage
                )
                resource_data.update(efficiency_data)
                
                # Calculate resource cost
                cost_data = self._calculate_resource_cost(
                    resource_type,
                    resource_data
                )
                resource_data['cost'] = cost_data
                
                # Calculate performance impact
                impact_data = self._calculate_performance_impact(
                    resource_type,
                    usage_data,
                    goal_resource_usage
                )
                resource_data['performance_impact'] = impact_data
                
                # Generate optimization suggestions
                self._generate_optimization_suggestions(resource_data)
                
                # Analyze trends and make predictions
                self._analyze_trends_and_predictions(
                    resource_data,
                    {resource_type: usage_data}
                )
                
            # Calculate overall metrics
            total_efficiency = sum(
                r['efficiency'] for r in analysis['resources'].values()
            )
            if analysis['resources']:
                analysis['overall']['resource_efficiency'] = total_efficiency / len(analysis['resources'])
                
            # Aggregate cost analysis
            for resource_type, resource_data in analysis['resources'].items():
                analysis['overall']['cost_analysis'][resource_type] = resource_data['cost']
                
            # Aggregate performance impact
            for resource_type, resource_data in analysis['resources'].items():
                analysis['overall']['performance_impact'][resource_type] = resource_data['performance_impact']
                
            # Aggregate optimization suggestions
            for resource_data in analysis['resources'].values():
                analysis['overall']['optimization_suggestions'].extend(
                    resource_data['optimization_suggestions']
                )
                
            # Aggregate trends and predictions
            for resource_type, resource_data in analysis['resources'].items():
                analysis['overall']['trends_and_predictions'][resource_type] = resource_data['trends']
                
            return analysis
            
        except Exception as e:
            self.logger.error(
                f"Error analyzing resource usage: {e}",
                exc_info=True,
                extra={
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            )
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def _calculate_resource_efficiency(
        self,
        resource_type: str,
        amount: float,
        duration: float
    ) -> float:
        """Calculate resource efficiency for a single usage instance."""
        try:
            # Get resource limits and costs
            limit = self._get_resource_limit(resource_type)
            cost_per_unit = self._get_resource_cost(resource_type)
            
            # Calculate efficiency based on resource type
            if resource_type == 'cpu':
                # CPU efficiency based on utilization and duration
                return (amount / limit) * (1 / duration)
            elif resource_type == 'memory':
                # Memory efficiency based on allocation and usage
                return (amount / limit) * (1 / duration)
            elif resource_type == 'disk':
                # Disk efficiency based on IOPS and space usage
                return (amount / limit) * (1 / duration)
            elif resource_type == 'network':
                # Network efficiency based on bandwidth usage
                return (amount / limit) * (1 / duration)
            else:
                # Generic efficiency calculation
                return (amount / limit) * (1 / duration)
                
        except Exception as e:
            self.logger.error(f"Error calculating resource efficiency: {e}")
            return 0.0
            
    def _calculate_overall_efficiency(
        self,
        resource_type: str,
        usage_data: List[Dict[str, Any]],
        goal_resource_usage: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate overall resource efficiency metrics."""
        try:
            # Calculate average efficiency
            efficiencies = [entry['efficiency'] for entry in usage_data]
            avg_efficiency = statistics.mean(efficiencies) if efficiencies else 0.0
            
            # Calculate efficiency by goal
            goal_efficiencies = {}
            for goal_id, usage in goal_resource_usage.items():
                if resource_type in usage['total_usage']:
                    goal_efficiencies[goal_id] = usage['total_usage'][resource_type]
                    
            # Calculate efficiency trends
            efficiency_trend = self._calculate_efficiency_trend(usage_data)
            
            return {
                'average': avg_efficiency,
                'by_goal': goal_efficiencies,
                'trend': efficiency_trend,
                'optimization_potential': 1.0 - avg_efficiency
            }
            
        except Exception as e:
            self.logger.error(f"Error calculating overall efficiency: {e}")
            return {
                'average': 0.0,
                'by_goal': {},
                'trend': 'unknown',
                'optimization_potential': 0.0
            }
            
    def _calculate_resource_cost(
        self,
        resource_type: str,
        usage_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate resource cost analysis."""
        try:
            cost_per_unit = self._get_resource_cost(resource_type)
            total_usage = usage_data['total_usage']
            duration = usage_data['total_duration']
            
            return {
                'cost_per_unit': cost_per_unit,
                'total_cost': cost_per_unit * total_usage * duration,
                'cost_per_hour': (cost_per_unit * total_usage * duration) / 3600,
                'cost_optimization_potential': self._calculate_cost_optimization_potential(
                    resource_type, usage_data
                )
            }
            
        except Exception as e:
            self.logger.error(f"Error calculating resource cost: {e}")
            return {
                'cost_per_unit': 0.0,
                'total_cost': 0.0,
                'cost_per_hour': 0.0,
                'cost_optimization_potential': 0.0
            }
            
    def _calculate_performance_impact(
        self,
        resource_type: str,
        usage_data: List[Dict[str, Any]],
        goal_resource_usage: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate performance impact analysis."""
        try:
            # Calculate impact on goal completion times
            completion_impacts = {}
            for goal_id, usage in goal_resource_usage.items():
                if resource_type in usage['peak_usage']:
                    peak_usage = usage['peak_usage'][resource_type]
                    limit = self._get_resource_limit(resource_type)
                    completion_impacts[goal_id] = {
                        'impact_factor': peak_usage / limit if limit > 0 else 0,
                        'estimated_delay': self._estimate_resource_delay(
                            resource_type, peak_usage, limit
                        )
                    }
                    
            # Calculate overall performance metrics
            return {
                'completion_impacts': completion_impacts,
                'average_impact': statistics.mean(
                    [impact['impact_factor'] for impact in completion_impacts.values()]
                ) if completion_impacts else 0.0,
                'critical_goals': self._identify_critical_goals(completion_impacts)
            }
            
        except Exception as e:
            self.logger.error(f"Error calculating performance impact: {e}")
            return {
                'completion_impacts': {},
                'average_impact': 0.0,
                'critical_goals': []
            }
            
    def _generate_optimization_suggestions(self, analysis: Dict[str, Any]) -> None:
        """Generate optimization suggestions based on analysis."""
        try:
            for resource_type, usage in analysis['resource_usage'].items():
                if usage['utilization'] > 0.8:
                    # Resource-specific optimization suggestions
                    if resource_type == 'cpu':
                        analysis['optimization_suggestions'].extend([
                            "Implement CPU throttling for non-critical tasks",
                            "Consider task parallelization for CPU-intensive operations",
                            "Optimize task scheduling to reduce CPU contention"
                        ])
                    elif resource_type == 'memory':
                        analysis['optimization_suggestions'].extend([
                            "Implement aggressive memory cleanup between tasks",
                            "Consider memory pooling for frequently used objects",
                            "Optimize data structures to reduce memory footprint"
                        ])
                    elif resource_type == 'disk':
                        analysis['optimization_suggestions'].extend([
                            "Implement disk space cleanup and compression",
                            "Consider using memory-mapped files for large datasets",
                            "Optimize file access patterns to reduce disk I/O"
                        ])
                    elif resource_type == 'network':
                        analysis['optimization_suggestions'].extend([
                            "Implement network bandwidth throttling and prioritization",
                            "Consider data compression for network transfers",
                            "Optimize network request batching"
                        ])
                        
                # Cost-based optimization suggestions
                cost_data = analysis['cost_analysis'].get(resource_type, {})
                if cost_data.get('cost_optimization_potential', 0) > 0.2:
                    analysis['optimization_suggestions'].append(
                        f"Consider resource scaling for {resource_type} to reduce costs"
                    )
                    
                # Efficiency-based optimization suggestions
                efficiency_data = analysis['efficiency_metrics'].get(resource_type, {})
                if efficiency_data.get('optimization_potential', 0) > 0.2:
                    analysis['optimization_suggestions'].append(
                        f"Implement resource usage optimization for {resource_type}"
                    )
                    
        except Exception as e:
            self.logger.error(f"Error generating optimization suggestions: {e}")
            
    def _analyze_trends_and_predictions(
        self,
        analysis: Dict[str, Any],
        usage_over_time: Dict[str, List[Dict[str, Any]]]
    ) -> None:
        """Analyze usage trends and make predictions."""
        try:
            for resource_type, usage_data in usage_over_time.items():
                if len(usage_data) < 2:
                    continue
                    
                # Calculate trend using linear regression
                x = [i for i in range(len(usage_data))]
                y = [entry['amount'] for entry in usage_data]
                
                if len(x) > 1:
                    slope, intercept, r_value = statistics.linear_regression(x, y)
                    
                    # Store trend information
                    analysis['trends'][resource_type] = {
                        'direction': 'increasing' if slope > 0 else 'decreasing',
                        'rate': abs(slope),
                        'confidence': r_value ** 2
                    }
                    
                    # Make predictions
                    analysis['predictions'][resource_type] = {
                        'next_hour': slope * (len(x) + 1) + intercept,
                        'next_day': slope * (len(x) + 24) + intercept,
                        'next_week': slope * (len(x) + 168) + intercept,
                        'confidence': r_value ** 2
                    }
                    
        except Exception as e:
            self.logger.error(f"Error analyzing trends and predictions: {e}")
            
    def _get_impacted_goals(
        self,
        resource_type: str,
        goal_resource_usage: Dict[str, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Get list of goals impacted by resource bottlenecks."""
        impacted_goals = []
        for goal_id, usage in goal_resource_usage.items():
            if resource_type in usage['peak_usage']:
                peak_usage = usage['peak_usage'][resource_type]
                limit = self._get_resource_limit(resource_type)
                if peak_usage / limit > 0.8:  # 80% threshold
                    impacted_goals.append({
                        'goal_id': goal_id,
                        'peak_usage': peak_usage,
                        'limit': limit,
                        'impact_factor': peak_usage / limit
                    })
        return impacted_goals
        
    def _calculate_efficiency_trend(
        self,
        usage_data: List[Dict[str, Any]]
    ) -> str:
        """Calculate efficiency trend direction."""
        try:
            efficiencies = [entry['efficiency'] for entry in usage_data]
            if len(efficiencies) < 2:
                return 'unknown'
                
            # Calculate trend using linear regression
            x = [i for i in range(len(efficiencies))]
            slope = statistics.linear_regression(x, efficiencies)[0]
            
            if abs(slope) < 0.01:
                return 'stable'
            elif slope > 0:
                return 'improving'
            else:
                return 'degrading'
                
        except Exception as e:
            self.logger.error(f"Error calculating efficiency trend: {e}")
            return 'unknown'
            
    def _calculate_cost_optimization_potential(
        self,
        resource_type: str,
        usage_data: Dict[str, Any]
    ) -> float:
        """Calculate potential for cost optimization."""
        try:
            utilization = usage_data['utilization']
            efficiency = usage_data.get('efficiency', 0.0)
            
            # Calculate optimization potential based on utilization and efficiency
            if utilization > 0.9:  # High utilization
                return 0.2  # 20% potential
            elif utilization > 0.7:  # Medium utilization
                return 0.1  # 10% potential
            elif efficiency < 0.5:  # Low efficiency
                return 0.15  # 15% potential
            else:
                return 0.05  # 5% potential
                
        except Exception as e:
            self.logger.error(f"Error calculating cost optimization potential: {e}")
            return 0.0
            
    def _estimate_resource_delay(
        self,
        resource_type: str,
        peak_usage: float,
        limit: float
    ) -> float:
        """Estimate delay caused by resource constraints."""
        try:
            if limit <= 0:
                return 0.0
                
            # Calculate delay based on resource type and usage
            utilization = peak_usage / limit
            if utilization > 0.9:
                return 0.3  # 30% delay
            elif utilization > 0.8:
                return 0.2  # 20% delay
            elif utilization > 0.7:
                return 0.1  # 10% delay
            else:
                return 0.0
                
        except Exception as e:
            self.logger.error(f"Error estimating resource delay: {e}")
            return 0.0
            
    def _identify_critical_goals(
        self,
        completion_impacts: Dict[str, Dict[str, Any]]
    ) -> List[str]:
        """Identify goals with critical performance impacts."""
        try:
            critical_goals = []
            for goal_id, impact in completion_impacts.items():
                if impact['impact_factor'] > 0.8:  # 80% impact threshold
                    critical_goals.append(goal_id)
            return critical_goals
            
        except Exception as e:
            self.logger.error(f"Error identifying critical goals: {e}")
            return []

    def _get_resource_limit(self, resource_type: str) -> float:
        """Get the limit for a specific resource type.
        
        Args:
            resource_type: Type of resource (cpu, memory, disk, network)
            
        Returns:
            float: Resource limit value
        """
        try:
            # Get limits from config
            limits = self.config.get('resource_limits', {})
            
            # Default limits if not specified
            default_limits = {
                'cpu': 80.0,  # 80% CPU
                'memory': 512.0,  # 512MB
                'disk': 512.0,  # 512MB
                'network': 100.0  # 100Mbps
            }
            
            # Get system-specific limits
            if resource_type == 'cpu':
                return min(limits.get('cpu', default_limits['cpu']), psutil.cpu_count() * 100.0)
            elif resource_type == 'memory':
                memory = psutil.virtual_memory()
                return min(limits.get('memory', default_limits['memory']), memory.total / (1024 * 1024))
            elif resource_type == 'disk':
                disk = psutil.disk_usage('/')
                return min(limits.get('disk', default_limits['disk']), disk.free / (1024 * 1024))
            elif resource_type == 'network':
                return limits.get('network', default_limits['network'])
            else:
                return limits.get(resource_type, 0.0)
                
        except Exception as e:
            self.logger.error(f"Error getting resource limit: {e}")
            return 0.0
            
    def _get_resource_cost(self, resource_type: str) -> float:
        """Get the cost per unit for a specific resource type.
        
        Args:
            resource_type: Type of resource (cpu, memory, disk, network)
            
        Returns:
            float: Cost per unit
        """
        try:
            # Get costs from config
            costs = self.config.get('resource_costs', {})
            
            # Default costs if not specified (costs per hour)
            default_costs = {
                'cpu': 0.05,  # $0.05 per CPU core per hour
                'memory': 0.01,  # $0.01 per MB per hour
                'disk': 0.001,  # $0.001 per MB per hour
                'network': 0.02  # $0.02 per Mbps per hour
            }
            
            return costs.get(resource_type, default_costs.get(resource_type, 0.0))
            
        except Exception as e:
            self.logger.error(f"Error getting resource cost: {e}")
            return 0.0

    def _calculate_efficiency_trend(self, usage_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate efficiency trend over time.
        
        Args:
            usage_data: List of resource usage data points
            
        Returns:
            Dict containing trend analysis
        """
        try:
            if len(usage_data) < 2:
                return {
                    'trend': 'insufficient_data',
                    'direction': 'unknown',
                    'rate': 0.0,
                    'confidence': 0.0
                }
                
            # Extract efficiency values
            efficiencies = [entry.get('efficiency', 0.0) for entry in usage_data]
            timestamps = [datetime.fromisoformat(entry.get('timestamp', datetime.now().isoformat()))
                         for entry in usage_data]
            
            # Calculate time differences in hours
            time_diffs = [(t - timestamps[0]).total_seconds() / 3600 for t in timestamps]
            
            # Perform linear regression
            slope, intercept, r_value, p_value, std_err = statistics.linregress(time_diffs, efficiencies)
            
            # Determine trend direction
            if abs(slope) < 0.01:
                direction = 'stable'
            elif slope > 0:
                direction = 'improving'
            else:
                direction = 'degrading'
                
            # Calculate confidence based on R-squared value
            confidence = r_value ** 2
            
            # Calculate moving average
            window_size = min(5, len(efficiencies))
            moving_avg = []
            for i in range(len(efficiencies) - window_size + 1):
                window = efficiencies[i:i + window_size]
                moving_avg.append(sum(window) / len(window))
                
            # Calculate volatility
            volatility = statistics.stdev(efficiencies) if len(efficiencies) > 1 else 0.0
            
            return {
                'trend': direction,
                'direction': direction,
                'rate': abs(slope),
                'confidence': confidence,
                'moving_average': moving_avg,
                'volatility': volatility,
                'p_value': p_value,
                'std_error': std_err,
                'latest_efficiency': efficiencies[-1] if efficiencies else 0.0,
                'average_efficiency': statistics.mean(efficiencies) if efficiencies else 0.0
            }
            
        except Exception as e:
            self.logger.error(f"Error calculating efficiency trend: {e}")
            return {
                'trend': 'error',
                'direction': 'unknown',
                'rate': 0.0,
                'confidence': 0.0
            }
            
    def _enhance_performance_monitoring(self) -> Dict[str, Any]:
        """Enhance performance monitoring with detailed metrics."""
        try:
            metrics = {
                'timestamp': datetime.now().isoformat(),
                'system_metrics': {},
                'goal_metrics': {},
                'resource_metrics': {},
                'performance_indicators': {}
            }
            
            # System metrics
            metrics['system_metrics'] = {
                'cpu': {
                    'usage': psutil.cpu_percent(interval=1),
                    'load': psutil.getloadavg(),
                    'frequency': psutil.cpu_freq().current if psutil.cpu_freq() else 0
                },
                'memory': {
                    'total': psutil.virtual_memory().total,
                    'available': psutil.virtual_memory().available,
                    'used': psutil.virtual_memory().used,
                    'percent': psutil.virtual_memory().percent
                },
                'disk': {
                    'total': psutil.disk_usage('/').total,
                    'used': psutil.disk_usage('/').used,
                    'free': psutil.disk_usage('/').free,
                    'percent': psutil.disk_usage('/').percent
                },
                'network': {
                    'bytes_sent': psutil.net_io_counters().bytes_sent,
                    'bytes_recv': psutil.net_io_counters().bytes_recv,
                    'packets_sent': psutil.net_io_counters().packets_sent,
                    'packets_recv': psutil.net_io_counters().packets_recv
                }
            }
            
            # Goal metrics
            metrics['goal_metrics'] = {
                'total_goals': len(self.goals),
                'active_goals': len(self.running_goals),
                'completed_goals': len(self.completed_goals),
                'failed_goals': len([g for g in self.goals.values() if g.status == 'failed']),
                'average_completion_time': self._calculate_average_completion_time(),
                'goal_success_rate': self._calculate_goal_success_rate()
            }
            
            # Resource metrics
            metrics['resource_metrics'] = {
                resource_type: {
                    'limit': self._get_resource_limit(resource_type),
                    'current_usage': self._get_current_resource_usage(resource_type),
                    'efficiency': self._calculate_resource_efficiency(
                        resource_type,
                        self._get_current_resource_usage(resource_type),
                        self._get_resource_limit(resource_type)
                    )
                }
                for resource_type in ['cpu', 'memory', 'disk', 'network']
            }
            
            # Performance indicators
            metrics['performance_indicators'] = {
                'system_health': self._calculate_system_health(),
                'resource_efficiency': self._calculate_overall_resource_efficiency(),
                'goal_throughput': self._calculate_goal_throughput(),
                'response_time': self._calculate_average_response_time()
            }
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Error enhancing performance monitoring: {e}")
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
            
    def _calculate_system_health(self) -> float:
        """Calculate overall system health score (0-100)."""
        try:
            # Get system metrics
            cpu_usage = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Calculate individual health scores
            cpu_health = 100 - cpu_usage
            memory_health = 100 - memory.percent
            disk_health = 100 - disk.percent
            
            # Calculate weighted average
            weights = {'cpu': 0.4, 'memory': 0.3, 'disk': 0.3}
            health_score = (
                cpu_health * weights['cpu'] +
                memory_health * weights['memory'] +
                disk_health * weights['disk']
            )
            
            return max(0.0, min(100.0, health_score))
            
        except Exception as e:
            self.logger.error(f"Error calculating system health: {e}")
            return 0.0
            
    def _calculate_overall_resource_efficiency(self) -> float:
        """Calculate overall resource efficiency score (0-100)."""
        try:
            efficiencies = []
            for resource_type in ['cpu', 'memory', 'disk', 'network']:
                current_usage = self._get_current_resource_usage(resource_type)
                limit = self._get_resource_limit(resource_type)
                if limit > 0:
                    efficiency = (current_usage / limit) * 100
                    efficiencies.append(efficiency)
                    
            return statistics.mean(efficiencies) if efficiencies else 0.0
            
        except Exception as e:
            self.logger.error(f"Error calculating overall resource efficiency: {e}")
            return 0.0
            
    def _calculate_goal_throughput(self) -> float:
        """Calculate goals completed per hour."""
        try:
            completed_goals = [g for g in self.goals.values() if g.status == 'completed']
            if not completed_goals:
                return 0.0
                
            # Get completion times
            completion_times = [
                g.completion_time for g in completed_goals
                if g.completion_time is not None
            ]
            
            if not completion_times:
                return 0.0
                
            # Calculate time span
            time_span = max(completion_times) - min(completion_times)
            hours = time_span.total_seconds() / 3600
            
            return len(completion_times) / hours if hours > 0 else 0.0
            
        except Exception as e:
            self.logger.error(f"Error calculating goal throughput: {e}")
            return 0.0
            
    def _calculate_average_response_time(self) -> float:
        """Calculate average response time for goal scheduling."""
        try:
            response_times = []
            for goal in self.goals.values():
                if goal.start_time and goal.completion_time:
                    response_time = (goal.completion_time - goal.start_time).total_seconds()
                    response_times.append(response_time)
                    
            return statistics.mean(response_times) if response_times else 0.0
            
        except Exception as e:
            self.logger.error(f"Error calculating average response time: {e}")
            return 0.0

    def _handle_scheduler_error(self, error: Exception, context: Dict[str, Any]) -> None:
        """Handle scheduler errors and implement recovery strategies.
        
        Args:
            error: The exception that occurred
            context: Additional context about the error
        """
        try:
            error_type = type(error).__name__
            error_msg = str(error)
            
            # Log error
            self.logger.error(
                f"Scheduler error: {error_type} - {error_msg}",
                extra={
                    'error_type': error_type,
                    'error_msg': error_msg,
                    'context': context
                }
            )
            
            # Record error in metrics
            self._record_error_metric(error_type, context)
            
            # Implement recovery based on error type
            if isinstance(error, ResourceError):
                self._handle_resource_error(error, context)
            elif isinstance(error, GoalError):
                self._handle_goal_error(error, context)
            elif isinstance(error, AgentError):
                self._handle_agent_error(error, context)
            else:
                self._handle_unknown_error(error, context)
                
            # Update system state
            self._update_error_state(error_type, context)
            
        except Exception as e:
            self.logger.error(f"Error in error handler: {e}")
            
    def _handle_resource_error(self, error: Exception, context: Dict[str, Any]) -> None:
        """Handle resource-related errors."""
        try:
            # Get affected resources
            affected_resources = context.get('affected_resources', [])
            
            # Release affected resources
            for resource in affected_resources:
                self._release_resource(resource, context.get('goal_id'))
                
            # Update resource pool
            self._update_resource_pool()
            
            # Notify affected goals
            self._notify_affected_goals(context)
            
            # Implement resource recovery
            self._recover_resources(affected_resources)
            
        except Exception as e:
            self.logger.error(f"Error handling resource error: {e}")
            
    def _handle_goal_error(self, error: Exception, context: Dict[str, Any]) -> None:
        """Handle goal-related errors."""
        try:
            goal_id = context.get('goal_id')
            if not goal_id:
                return
                
            # Get goal
            goal = self.goals.get(goal_id)
            if not goal:
                return
                
            # Check retry count
            retry_count = context.get('retry_count', 0)
            max_retries = self.config.get('max_retries', 3)
            
            if retry_count < max_retries:
                # Retry goal
                self._retry_goal(goal, retry_count + 1)
            else:
                # Mark goal as failed
                goal.status = 'failed'
                self._handle_failed_goal(goal)
                
            # Update goal dependencies
            self._update_dependent_goals(goal)
            
        except Exception as e:
            self.logger.error(f"Error handling goal error: {e}")

# Create singleton instance
goal_scheduler = GoalScheduler()

# Plugin entry point
def run_plugin() -> bool:
    """Entry point for the plugin."""
    scheduler = GoalScheduler()
    return scheduler.run()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = run_plugin()
    print(f"Goal Scheduler completed {'successfully' if success else 'with errors'}") 