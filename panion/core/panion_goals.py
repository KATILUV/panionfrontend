"""
Panion Goals System
Handles goal processing, plugin selection, and execution chaining.
"""

import logging
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field
import asyncio
import json
from pathlib import Path
from enum import Enum
from core.service_locator import service_locator
from core.reflection import reflection_system
from datetime import datetime
from core.world_model import world_model_manager
import networkx as nx

class GoalStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"
    BLOCKED = "blocked"

class GoalType(Enum):
    ROOT = "root"
    SUBTASK = "subtask"
    ATOMIC = "atomic"

@dataclass
class Goal:
    id: str
    description: str
    priority: float
    status: GoalStatus
    required_plugins: List[str]
    parameters: Dict[str, Any]
    dependencies: List[str] = field(default_factory=list)
    dependent_goals: List[str] = field(default_factory=list)
    type: GoalType = GoalType.ATOMIC
    subtasks: List['Goal'] = field(default_factory=list)
    parent_id: Optional[str] = None
    progress: float = 0.0
    retry_count: int = 0
    max_retries: int = 3
    execution_plan: List[Dict[str, Any]] = field(default_factory=list)
    validation_rules: List[Dict[str, Any]] = field(default_factory=list)

    def add_subtask(self, subtask: 'Goal') -> None:
        """Add a subtask to this goal."""
        subtask.parent_id = self.id
        subtask.type = GoalType.SUBTASK
        self.subtasks.append(subtask)
        self._update_execution_plan()

    def _update_execution_plan(self) -> None:
        """Update the execution plan based on subtasks and dependencies."""
        self.execution_plan = []
        
        # Add subtask execution steps
        for subtask in self.subtasks:
            self.execution_plan.append({
                "type": "subtask",
                "goal_id": subtask.id,
                "description": subtask.description,
                "required_plugins": subtask.required_plugins
            })
        
        # Add validation steps
        for rule in self.validation_rules:
            self.execution_plan.append({
                "type": "validation",
                "rule": rule
            })

    def update_progress(self) -> None:
        """Update the goal's progress based on subtask completion."""
        if not self.subtasks:
            return
        
        completed = sum(1 for st in self.subtasks if st.status == GoalStatus.COMPLETED)
        self.progress = (completed / len(self.subtasks)) * 100
        
        # Update status based on progress
        if self.progress == 100:
            self.status = GoalStatus.COMPLETED
        elif self.progress > 0:
            self.status = GoalStatus.PARTIAL
        elif self.status == GoalStatus.BLOCKED:
            self.status = GoalStatus.PENDING

class GoalProcessor:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.active_goals: Dict[str, Goal] = {}
        self.plugin_chains: Dict[str, List[str]] = {}
        self.plugin_manager = service_locator.get_service('plugin_manager')
        self._dependency_graph: Dict[str, Set[str]] = {}
        self._file_editor = None  # Will be initialized when needed
        self._plugin_tester = None  # Will be initialized when needed

    async def initialize(self) -> None:
        """Initialize the goal processor."""
        try:
            self.logger.info("Initializing goal processor...")
            reflection_system.log_thought(
                "initialization",
                "Starting goal processor initialization",
                {"stage": "begin"}
            )
            
            self.active_goals = {}
            self.plugin_chains = {}
            self._dependency_graph = {}
            
            # Load goals from goal state file
            goal_state_path = Path('data/goal_state.json')
            if goal_state_path.exists():
                with open(goal_state_path, 'r') as f:
                    goal_state = json.load(f)
                    for goal_data in goal_state.get('goals', []):
                        goal = self._load_goal_from_data(goal_data)
                        self.active_goals[goal.id] = goal
                        self._update_dependency_graph(goal)
                        reflection_system.log_thought(
                            "goal_loading",
                            f"Loaded goal: {goal.id}",
                            {"goal_id": goal.id, "type": goal.type.value}
                        )
            
            reflection_system.log_thought(
                "initialization",
                "Goal processor initialized successfully",
                {"stage": "complete"}
            )
            self.logger.info("Goal processor initialized successfully")
        except Exception as e:
            reflection_system.log_thought(
                "initialization",
                f"Error initializing goal processor: {str(e)}",
                {"stage": "error", "error": str(e)}
            )
            self.logger.error(f"Error initializing goal processor: {e}")
            raise

    def _load_goal_from_data(self, goal_data: Dict[str, Any]) -> Goal:
        """Load a goal from its data representation."""
        # Load subtasks recursively
        subtasks = []
        for subtask_data in goal_data.get('subtasks', []):
            subtask = self._load_goal_from_data(subtask_data)
            subtasks.append(subtask)
        
        # Create the goal
        goal = Goal(
            id=goal_data['id'],
            description=goal_data['description'],
            priority=goal_data.get('priority', {}).get('urgency', 0.5),
            status=GoalStatus(goal_data['status']),
            required_plugins=goal_data.get('required_plugins', []),
            parameters=goal_data.get('parameters', {}),
            dependencies=goal_data.get('dependencies', []),
            dependent_goals=goal_data.get('dependent_goals', []),
            type=GoalType(goal_data.get('type', 'atomic')),
            subtasks=subtasks,
            parent_id=goal_data.get('parent_id'),
            progress=goal_data.get('progress', 0.0),
            retry_count=goal_data.get('retry_count', 0),
            max_retries=goal_data.get('max_retries', 3),
            execution_plan=goal_data.get('execution_plan', []),
            validation_rules=goal_data.get('validation_rules', [])
        )
        return goal

    def _update_dependency_graph(self, goal: Goal) -> None:
        """Update the dependency graph with a new goal."""
        # Add goal to graph
        if goal.id not in self._dependency_graph:
            self._dependency_graph[goal.id] = set()
        
        # Add dependencies
        for dep_id in goal.dependencies:
            if dep_id not in self._dependency_graph:
                self._dependency_graph[dep_id] = set()
            self._dependency_graph[dep_id].add(goal.id)

    def _check_dependency_cycle(self, goal_id: str, visited: Set[str], path: Set[str]) -> bool:
        """Check for cycles in the dependency graph using DFS."""
        visited.add(goal_id)
        path.add(goal_id)
        
        for dependent in self._dependency_graph.get(goal_id, set()):
            if dependent not in visited:
                if self._check_dependency_cycle(dependent, visited, path):
                    return True
            elif dependent in path:
                return True
                
        path.remove(goal_id)
        return False

    def _has_cycle(self) -> bool:
        """Check if the dependency graph has any cycles."""
        visited = set()
        path = set()
        
        for goal_id in self._dependency_graph:
            if goal_id not in visited:
                if self._check_dependency_cycle(goal_id, visited, path):
                    return True
        return False

    def _get_ready_goals(self) -> List[Goal]:
        """Get goals that have all dependencies satisfied."""
        ready_goals = []
        
        for goal in self.active_goals.values():
            if goal.status != "pending":
                continue
                
            # Check if all dependencies are completed
            all_deps_completed = True
            for dep_id in goal.dependencies:
                dep_goal = self.active_goals.get(dep_id)
                if not dep_goal or dep_goal.status != "completed":
                    all_deps_completed = False
                    break
            
            if all_deps_completed:
                ready_goals.append(goal)
        
        return ready_goals

    async def process_pending_goals(self) -> None:
        """Process any pending goals respecting dependencies."""
        try:
            # Check for cycles
            if self._has_cycle():
                self.logger.error("Dependency cycle detected in goals")
                return
            
            # Get ready goals
            ready_goals = self._get_ready_goals()
            
            # Sort by priority
            ready_goals.sort(key=lambda g: g.priority, reverse=True)
            
            # Process ready goals
            for goal in ready_goals:
                await self.process_goal(goal)
                
        except Exception as e:
            self.logger.error(f"Error processing pending goals: {e}")
            raise

    async def add_goal(self, goal: Goal) -> None:
        """Add a new goal to the processor."""
        try:
            # Check for cycles before adding
            self._update_dependency_graph(goal)
            if self._has_cycle():
                self.logger.error(f"Adding goal {goal.id} would create a dependency cycle")
                self._dependency_graph.pop(goal.id, None)
                raise ValueError("Dependency cycle detected")
            
            self.active_goals[goal.id] = goal
            self.logger.info(f"Added goal: {goal.id}")
            
        except Exception as e:
            self.logger.error(f"Error adding goal: {e}")
            raise

    async def start(self) -> None:
        """Start the goal processor."""
        try:
            self.logger.info("Starting goal processor...")
            self.logger.info("Goal processor started successfully")
        except Exception as e:
            self.logger.error(f"Error starting goal processor: {e}")
            raise

    async def stop(self) -> None:
        """Stop the goal processor."""
        try:
            self.logger.info("Stopping goal processor...")
            self.active_goals = {}
            self.plugin_chains = {}
            self.logger.info("Goal processor stopped successfully")
        except Exception as e:
            self.logger.error(f"Error stopping goal processor: {e}")
            raise

    async def process_goal(self, goal: Goal) -> Dict[str, Any]:
        """Process a goal.
        
        Args:
            goal: Goal to process
            
        Returns:
            Dictionary containing processing results
        """
        try:
            self.logger.info(f"Processing goal: {goal.id}")
            reflection_system.log_thought(
                "goal_processing",
                f"Starting goal processing: {goal.id}",
                {"goal_id": goal.id, "type": goal.type.value}
            )
            
            result = {
                'status': 'success',
                'goal_id': goal.id,
                'execution_time': 0,
                'plugin_results': {},
                'validation_results': {},
                'errors': [],
                'warnings': []
            }
            
            start_time = datetime.now()
            
            # Update goal status
            goal.status = GoalStatus.IN_PROGRESS
            
            # Run validations
            for rule in goal.validation_rules:
                try:
                    validation_result = await self._run_validation(rule)
                    result['validation_results'][rule.get('id', 'unknown')] = validation_result
                    
                    if not validation_result.get('valid', False):
                        result['errors'].append(
                            f"Validation failed: {validation_result.get('error', 'Unknown error')}"
                        )
                        goal.status = GoalStatus.FAILED
                        break
                except Exception as e:
                    result['errors'].append(f"Validation error: {str(e)}")
                    goal.status = GoalStatus.FAILED
                    break
            
            # Execute plugins if validations passed
            if goal.status != GoalStatus.FAILED:
                try:
                    # Select and chain plugins
                    selected_plugins = await self._select_plugins(goal)
                    if not selected_plugins:
                        result['errors'].append("No suitable plugins found")
                        goal.status = GoalStatus.FAILED
                    else:
                        plugin_chain = await self._create_plugin_chain(selected_plugins, goal)
                        
                        # Execute plugin chain
                        plugin_results = await self._execute_plugin_chain(plugin_chain, goal)
                        result['plugin_results'] = plugin_results
                        
                        # Check for plugin execution errors
                        for plugin_id, plugin_result in plugin_results.items():
                            if not plugin_result.get('success', False):
                                result['errors'].append(
                                    f"Plugin {plugin_id} failed: {plugin_result.get('error', 'Unknown error')}"
                                )
                                goal.status = GoalStatus.FAILED
                                break
                except Exception as e:
                    result['errors'].append(f"Plugin execution error: {str(e)}")
                    goal.status = GoalStatus.FAILED
            
            # Update goal status based on results
            if goal.status != GoalStatus.FAILED:
                if result['errors']:
                    goal.status = GoalStatus.PARTIAL
                else:
                    goal.status = GoalStatus.COMPLETED
                    
            # Calculate execution time
            result['execution_time'] = (datetime.now() - start_time).total_seconds()
            
            # Update goal progress
            goal.update_progress()
            
            reflection_system.log_thought(
                "goal_processing",
                f"Completed goal processing: {goal.id}",
                {
                    "goal_id": goal.id,
                    "status": goal.status.value,
                    "execution_time": result['execution_time']
                }
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error processing goal {goal.id}: {e}")
            reflection_system.log_thought(
                "goal_processing",
                f"Error processing goal {goal.id}: {str(e)}",
                {"error": str(e)}
            )
            goal.status = GoalStatus.FAILED
            return {
                'status': 'error',
                'goal_id': goal.id,
                'error': str(e)
            }

    async def _run_validation(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Run a validation rule.
        
        Args:
            rule: Dictionary containing validation rule definition
                {
                    'id': str,  # Unique identifier for the rule
                    'type': str,  # Type of validation (state, resource, dependency, etc.)
                    'parameters': Dict[str, Any],  # Validation parameters
                    'error_message': str,  # Custom error message
                    'severity': str  # 'error' or 'warning'
                }
                
        Returns:
            Dictionary containing validation results:
            {
                'valid': bool,
                'rule_id': str,
                'error': Optional[str],
                'details': Dict[str, Any]
            }
        """
        try:
            if not isinstance(rule, dict):
                return {
                    'valid': False,
                    'rule_id': 'unknown',
                    'error': 'Invalid rule format',
                    'details': {'rule': rule}
                }
                
            rule_id = rule.get('id', 'unknown')
            rule_type = rule.get('type')
            parameters = rule.get('parameters', {})
            error_message = rule.get('error_message', 'Validation failed')
            severity = rule.get('severity', 'error')
            
            if not rule_type:
                return {
                    'valid': False,
                    'rule_id': rule_id,
                    'error': 'Missing rule type',
                    'details': {'rule': rule}
                }
                
            # Type-specific validation
            if rule_type == 'state':
                return await self._validate_state(rule_id, parameters, error_message)
            elif rule_type == 'resource':
                return await self._validate_resource(rule_id, parameters, error_message)
            elif rule_type == 'dependency':
                return await self._validate_dependency(rule_id, parameters, error_message)
            elif rule_type == 'temporal':
                return await self._validate_temporal(rule_id, parameters, error_message)
            elif rule_type == 'plugin':
                return await self._validate_plugin(rule_id, parameters, error_message)
            else:
                return {
                    'valid': False,
                    'rule_id': rule_id,
                    'error': f'Unknown validation type: {rule_type}',
                    'details': {'rule': rule}
                }
                
        except Exception as e:
            return {
                'valid': False,
                'rule_id': rule.get('id', 'unknown'),
                'error': f'Validation error: {str(e)}',
                'details': {'rule': rule, 'exception': str(e)}
            }
            
    async def _validate_state(self, rule_id: str, parameters: Dict[str, Any], error_message: str) -> Dict[str, Any]:
        """Validate state-based rules."""
        try:
            required_state = parameters.get('required_state')
            if not required_state:
                return {
                    'valid': False,
                    'rule_id': rule_id,
                    'error': 'Missing required state',
                    'details': {'parameters': parameters}
                }
                
            # Get current state from world model
            current_state = await world_model_manager.get_state()
            
            # Check if required state exists
            if required_state not in current_state:
                return {
                    'valid': False,
                    'rule_id': rule_id,
                    'error': f'Required state not found: {required_state}',
                    'details': {
                        'required': required_state,
                        'current_state': current_state
                    }
                }
                
            # Check state value if specified
            expected_value = parameters.get('expected_value')
            if expected_value is not None:
                if current_state[required_state] != expected_value:
                    return {
                        'valid': False,
                        'rule_id': rule_id,
                        'error': error_message,
                        'details': {
                            'required': required_state,
                            'expected': expected_value,
                            'actual': current_state[required_state]
                        }
                    }
                    
            return {
                'valid': True,
                'rule_id': rule_id,
                'details': {'state': current_state[required_state]}
            }
            
        except Exception as e:
            return {
                'valid': False,
                'rule_id': rule_id,
                'error': f'State validation error: {str(e)}',
                'details': {'parameters': parameters, 'exception': str(e)}
            }
            
    async def _validate_resource(self, rule_id: str, parameters: Dict[str, Any], error_message: str) -> Dict[str, Any]:
        """Validate resource-based rules."""
        try:
            resource_type = parameters.get('resource_type')
            required_amount = parameters.get('required_amount')
            
            if not resource_type or required_amount is None:
                return {
                    'valid': False,
                    'rule_id': rule_id,
                    'error': 'Missing resource type or amount',
                    'details': {'parameters': parameters}
                }
                
            # Get current resource usage
            current_usage = await self._get_current_resource_usage()
            
            # Check if resource type exists
            if resource_type not in current_usage:
                return {
                    'valid': False,
                    'rule_id': rule_id,
                    'error': f'Resource type not found: {resource_type}',
                    'details': {'parameters': parameters}
                }
                
            # Check if enough resources are available
            available = current_usage[resource_type].get('available', 0)
            if available < required_amount:
                return {
                    'valid': False,
                    'rule_id': rule_id,
                    'error': error_message,
                    'details': {
                        'resource_type': resource_type,
                        'required': required_amount,
                        'available': available
                    }
                }
                
            return {
                'valid': True,
                'rule_id': rule_id,
                'details': {
                    'resource_type': resource_type,
                    'available': available
                }
            }
            
        except Exception as e:
            return {
                'valid': False,
                'rule_id': rule_id,
                'error': f'Resource validation error: {str(e)}',
                'details': {'parameters': parameters, 'exception': str(e)}
            }
            
    async def _validate_dependency(self, rule_id: str, parameters: Dict[str, Any], error_message: str) -> Dict[str, Any]:
        """Validate dependency-based rules."""
        try:
            required_goals = parameters.get('required_goals', [])
            if not required_goals:
                return {
                    'valid': False,
                    'rule_id': rule_id,
                    'error': 'No required goals specified',
                    'details': {'parameters': parameters}
                }
                
            # Check each required goal
            for goal_id in required_goals:
                goal = self.active_goals.get(goal_id)
                if not goal:
                    return {
                        'valid': False,
                        'rule_id': rule_id,
                        'error': f'Required goal not found: {goal_id}',
                        'details': {'parameters': parameters}
                    }
                    
                if goal.status != GoalStatus.COMPLETED:
                    return {
                        'valid': False,
                        'rule_id': rule_id,
                        'error': error_message,
                        'details': {
                            'goal_id': goal_id,
                            'status': goal.status.value
                        }
                    }
                    
            return {
                'valid': True,
                'rule_id': rule_id,
                'details': {'required_goals': required_goals}
            }
            
        except Exception as e:
            return {
                'valid': False,
                'rule_id': rule_id,
                'error': f'Dependency validation error: {str(e)}',
                'details': {'parameters': parameters, 'exception': str(e)}
            }
            
    async def _validate_temporal(self, rule_id: str, parameters: Dict[str, Any], error_message: str) -> Dict[str, Any]:
        """Validate temporal-based rules."""
        try:
            start_time = parameters.get('start_time')
            end_time = parameters.get('end_time')
            current_time = datetime.now()
            
            if start_time:
                try:
                    start = datetime.fromisoformat(start_time)
                    if current_time < start:
                        return {
                            'valid': False,
                            'rule_id': rule_id,
                            'error': error_message,
                            'details': {
                                'start_time': start_time,
                                'current_time': current_time.isoformat()
                            }
                        }
                except ValueError:
                    return {
                        'valid': False,
                        'rule_id': rule_id,
                        'error': f'Invalid start time format: {start_time}',
                        'details': {'parameters': parameters}
                    }
                    
            if end_time:
                try:
                    end = datetime.fromisoformat(end_time)
                    if current_time > end:
                        return {
                            'valid': False,
                            'rule_id': rule_id,
                            'error': error_message,
                            'details': {
                                'end_time': end_time,
                                'current_time': current_time.isoformat()
                            }
                        }
                except ValueError:
                    return {
                        'valid': False,
                        'rule_id': rule_id,
                        'error': f'Invalid end time format: {end_time}',
                        'details': {'parameters': parameters}
                    }
                    
            return {
                'valid': True,
                'rule_id': rule_id,
                'details': {
                    'start_time': start_time,
                    'end_time': end_time,
                    'current_time': current_time.isoformat()
                }
            }
            
        except Exception as e:
            return {
                'valid': False,
                'rule_id': rule_id,
                'error': f'Temporal validation error: {str(e)}',
                'details': {'parameters': parameters, 'exception': str(e)}
            }
            
    async def _validate_plugin(self, rule_id: str, parameters: Dict[str, Any], error_message: str) -> Dict[str, Any]:
        """Validate plugin-based rules."""
        try:
            plugin_id = parameters.get('plugin_id')
            if not plugin_id:
                return {
                    'valid': False,
                    'rule_id': rule_id,
                    'error': 'Missing plugin ID',
                    'details': {'parameters': parameters}
                }
                
            # Check if plugin exists
            plugin = self.plugin_manager.get_plugin(plugin_id)
            if not plugin:
                return {
                    'valid': False,
                    'rule_id': rule_id,
                    'error': f'Plugin not found: {plugin_id}',
                    'details': {'parameters': parameters}
                }
                
            # Check plugin status if specified
            required_status = parameters.get('required_status')
            if required_status:
                plugin_status = await plugin.get_status()
                if plugin_status != required_status:
                    return {
                        'valid': False,
                        'rule_id': rule_id,
                        'error': error_message,
                        'details': {
                            'plugin_id': plugin_id,
                            'required_status': required_status,
                            'actual_status': plugin_status
                        }
                    }
                    
            # Check plugin version if specified
            required_version = parameters.get('required_version')
            if required_version:
                plugin_version = plugin.get_version()
                if plugin_version != required_version:
                    return {
                        'valid': False,
                        'rule_id': rule_id,
                        'error': error_message,
                        'details': {
                            'plugin_id': plugin_id,
                            'required_version': required_version,
                            'actual_version': plugin_version
                        }
                    }
                    
            return {
                'valid': True,
                'rule_id': rule_id,
                'details': {
                    'plugin_id': plugin_id,
                    'status': await plugin.get_status(),
                    'version': plugin.get_version()
                }
            }
            
        except Exception as e:
            return {
                'valid': False,
                'rule_id': rule_id,
                'error': f'Plugin validation error: {str(e)}',
                'details': {'parameters': parameters, 'exception': str(e)}
            }
            
    async def _get_current_resource_usage(self) -> Dict[str, Dict[str, Any]]:
        """Get current resource usage across all goals."""
        try:
            usage = {}
            
            # Get resource usage from active goals
            for goal in self.active_goals.values():
                if goal.status == GoalStatus.IN_PROGRESS:
                    for constraint in goal.validation_rules:
                        if constraint.get('type') == 'resource':
                            params = constraint.get('parameters', {})
                            resource_type = params.get('resource_type')
                            amount = params.get('amount', 0)
                            
                            if resource_type:
                                if resource_type not in usage:
                                    usage[resource_type] = {
                                        'total': 0,
                                        'used': 0,
                                        'available': 0
                                    }
                                usage[resource_type]['used'] += amount
                                
            # Calculate available resources
            for resource_type, data in usage.items():
                data['available'] = data['total'] - data['used']
                
            return usage
            
        except Exception as e:
            self.logger.error(f"Error getting resource usage: {e}")
            return {}

    async def _execute_plugins(self, goal: Goal) -> Dict[str, Any]:
        """Execute the plugins required by the goal."""
        try:
            # Select plugins
            selected_plugins = await self._select_plugins(goal)
            if not selected_plugins:
                return {
                    "status": "failure",
                    "error": "No suitable plugins found"
                }
            
            # Create and execute plugin chain
            chain = await self._create_plugin_chain(selected_plugins, goal)
            result = await self._execute_plugin_chain(chain, goal)
            
            return {
                "status": "success",
                "result": result
            }
            
        except Exception as e:
            return {
                "status": "failure",
                "error": str(e)
            }

    async def _select_plugins(self, goal: Goal) -> List[str]:
        """Select appropriate plugins for the goal."""
        try:
            # Get available plugins from plugin manager
            selected = []
            self.logger.info(f"Required plugins for goal {goal.id}: {goal.required_plugins}")
            
            # Get all available plugins
            available_plugins = self.plugin_manager._plugins
            self.logger.info(f"Available plugins: {list(available_plugins.keys())}")
            
            for plugin_id in goal.required_plugins:
                self.logger.info(f"Looking for plugin: {plugin_id}")
                if plugin_id in available_plugins:
                    selected.append(plugin_id)
                    self.logger.info(f"Selected plugin: {plugin_id}")
                else:
                    self.logger.warning(f"Required plugin not found: {plugin_id}")

            if not selected:
                self.logger.warning(f"No suitable plugins found for goal {goal.id}")
                return []

            self.logger.info(f"Selected plugins: {selected}")
            return selected

        except Exception as e:
            self.logger.error(f"Error selecting plugins: {e}")
            return []

    async def _create_plugin_chain(self, plugins: List[str], goal: Goal) -> List[str]:
        """Create an optimized plugin chain based on dependencies and requirements.
        
        Args:
            plugins: List of available plugins
            goal: Goal to create chain for
            
        Returns:
            List[str]: Optimized plugin chain
        """
        try:
            # Build plugin dependency graph
            plugin_graph = nx.DiGraph()
            plugin_metadata = {}
            
            # Add plugins to graph
            for plugin_id in plugins:
                plugin = await self.plugin_manager.get_plugin(plugin_id)
                if not plugin:
                    continue
                    
                # Get plugin metadata
                metadata = {
                    'type': plugin.type,
                    'dependencies': plugin.dependencies or [],
                    'capabilities': plugin.capabilities or [],
                    'performance': plugin.performance_metrics or {},
                    'reliability': plugin.reliability_metrics or {},
                    'resource_usage': plugin.resource_usage or {}
                }
                plugin_metadata[plugin_id] = metadata
                
                # Add to graph
                plugin_graph.add_node(plugin_id, **metadata)
                
                # Add dependencies
                for dep in metadata['dependencies']:
                    if dep in plugins:
                        plugin_graph.add_edge(dep, plugin_id)
            
            # Check for cycles
            if not nx.is_directed_acyclic_graph(plugin_graph):
                self.logger.error("Plugin dependency cycle detected")
                return []
            
            # Calculate plugin scores
            plugin_scores = {}
            for plugin_id in plugins:
                metadata = plugin_metadata[plugin_id]
                
                # Calculate base score
                base_score = 0
                
                # Add capability match score
                capability_matches = sum(1 for cap in metadata['capabilities'] 
                                      if cap in goal.required_plugins)
                base_score += capability_matches * 10
                
                # Add performance score
                perf_score = metadata['performance'].get('success_rate', 0) * 5
                base_score += perf_score
                
                # Add reliability score
                rel_score = metadata['reliability'].get('uptime', 0) * 3
                base_score += rel_score
                
                # Add resource efficiency score
                resource_score = sum(1 for usage in metadata['resource_usage'].values() 
                                   if usage < 0.7)  # Prefer plugins using < 70% resources
                base_score += resource_score
                
                plugin_scores[plugin_id] = base_score
            
            # Create initial chain using topological sort
            initial_chain = list(nx.topological_sort(plugin_graph))
            
            # Optimize chain based on scores and dependencies
            optimized_chain = []
            remaining_plugins = set(initial_chain)
            
            while remaining_plugins:
                # Find plugins with no remaining dependencies
                available = {p for p in remaining_plugins 
                           if not any(dep in remaining_plugins 
                                    for dep in plugin_graph.predecessors(p))}
                
                if not available:
                    break
                
                # Select best plugin based on score
                best_plugin = max(available, key=lambda p: plugin_scores[p])
                optimized_chain.append(best_plugin)
                remaining_plugins.remove(best_plugin)
            
            # Validate chain
            if not self._validate_plugin_chain(optimized_chain, goal):
                self.logger.warning("Plugin chain validation failed, falling back to initial chain")
                return initial_chain
            
            return optimized_chain

        except Exception as e:
            self.logger.error(f"Error creating plugin chain: {e}")
            return []
    
    def _validate_plugin_chain(self, chain: List[str], goal: Goal) -> bool:
        """Validate a plugin chain for a goal.
        
        Args:
            chain: Plugin chain to validate
            goal: Goal to validate against
            
        Returns:
            bool: True if chain is valid
        """
        try:
            # Check if all required plugins are in chain
            if not all(plugin in chain for plugin in goal.required_plugins):
                return False
            
            # Check if chain satisfies all dependencies
            for i, plugin_id in enumerate(chain):
                plugin = self.plugin_manager.get_plugin(plugin_id)
                if not plugin:
                    continue
                    
                # Check if all dependencies are satisfied
                for dep in plugin.dependencies or []:
                    if dep not in chain[:i]:
                        return False
            
            # Check resource requirements
            total_resources = {'cpu': 0, 'memory': 0, 'disk': 0}
            for plugin_id in chain:
                plugin = self.plugin_manager.get_plugin(plugin_id)
                if not plugin or not plugin.resource_usage:
                    continue
                    
                for resource, usage in plugin.resource_usage.items():
                    total_resources[resource] += usage
                    
                    # Check if resource usage exceeds limits
                    if total_resources[resource] > 1.0:  # 100% resource limit
                        return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error validating plugin chain: {e}")
            return False

    async def _execute_plugin_chain(self, chain: List[str], goal: Goal) -> Dict[str, Any]:
        """Execute the plugin chain for the goal."""
        try:
            result = {}

            for plugin_id in chain:
                plugin = self.plugin_manager.get_plugin(plugin_id)
                if not plugin:
                    continue

                # Execute plugin with goal parameters
                plugin_result = await plugin.execute(goal.parameters)
                result[plugin_id] = plugin_result

            return result

        except Exception as e:
            self.logger.error(f"Error executing plugin chain: {e}")
            raise

    def get_goal_status(self, goal_id: str) -> Optional[str]:
        """Get the status of a goal."""
        if goal_id in self.active_goals:
            return self.active_goals[goal_id].status
        return None

    def get_active_goals(self) -> List[Goal]:
        """Get all active goals."""
        return list(self.active_goals.values())

    def _validate_goal(self, goal: Dict[str, Any]) -> List[str]:
        """Validate a goal definition.
        
        Args:
            goal: Goal dictionary containing goal definition
            
        Returns:
            List of validation error messages
        """
        errors = []
        
        # Check required fields
        required_fields = ['id', 'description', 'priority', 'status']
        for field in required_fields:
            if field not in goal:
                errors.append(f"Goal missing required field: {field}")
        
        if 'id' not in goal:
            return errors
            
        # Validate ID format
        if not isinstance(goal['id'], str):
            errors.append("Goal ID must be a string")
        elif not goal['id'].strip():
            errors.append("Goal ID cannot be empty")
            
        # Validate description
        if 'description' in goal:
            if not isinstance(goal['description'], str):
                errors.append("Goal description must be a string")
            elif not goal['description'].strip():
                errors.append("Goal description cannot be empty")
                
        # Validate priority
        if 'priority' in goal:
            if not isinstance(goal['priority'], (int, float)):
                errors.append("Goal priority must be a number")
            elif goal['priority'] < 0 or goal['priority'] > 1:
                errors.append("Goal priority must be between 0 and 1")
                
        # Validate status
        if 'status' in goal:
            valid_statuses = [status.value for status in GoalStatus]
            if goal['status'] not in valid_statuses:
                errors.append(f"Goal status must be one of: {', '.join(valid_statuses)}")
                
        # Validate dependencies
        if 'dependencies' in goal:
            if not isinstance(goal['dependencies'], list):
                errors.append("Goal dependencies must be a list")
            else:
                for dep in goal['dependencies']:
                    if not isinstance(dep, str):
                        errors.append("All dependency IDs must be strings")
                    elif not dep.strip():
                        errors.append("Dependency ID cannot be empty")
                    elif dep == goal['id']:
                        errors.append("Goal cannot depend on itself")
                        
        # Validate constraints
        if 'constraints' in goal:
            if not isinstance(goal['constraints'], list):
                errors.append("Goal constraints must be a list")
            else:
                for constraint in goal['constraints']:
                    if not isinstance(constraint, dict):
                        errors.append("Each constraint must be a dictionary")
                        continue
                        
                    # Validate constraint type
                    if 'type' not in constraint:
                        errors.append("Constraint missing type field")
                        continue
                        
                    # Validate constraint parameters
                    if 'parameters' not in constraint:
                        errors.append(f"Constraint of type {constraint['type']} missing parameters")
                        continue
                        
                    # Type-specific validation
                    if constraint['type'] == 'resource':
                        params = constraint['parameters']
                        if 'resource_type' not in params:
                            errors.append("Resource constraint missing resource_type")
                        if 'amount' not in params:
                            errors.append("Resource constraint missing amount")
                        elif not isinstance(params['amount'], (int, float)):
                            errors.append("Resource amount must be a number")
                            
                    elif constraint['type'] == 'temporal':
                        params = constraint['parameters']
                        if 'start_time' in params:
                            try:
                                datetime.fromisoformat(params['start_time'])
                            except (ValueError, TypeError):
                                errors.append("Invalid start_time format")
                        if 'end_time' in params:
                            try:
                                datetime.fromisoformat(params['end_time'])
                            except (ValueError, TypeError):
                                errors.append("Invalid end_time format")
                                
                    elif constraint['type'] == 'dependency':
                        params = constraint['parameters']
                        if 'required_goals' not in params:
                            errors.append("Dependency constraint missing required_goals")
                        elif not isinstance(params['required_goals'], list):
                            errors.append("Required goals must be a list")
                            
        # Validate metrics
        if 'metrics' in goal:
            if not isinstance(goal['metrics'], dict):
                errors.append("Goal metrics must be a dictionary")
            else:
                for metric_name, metric_value in goal['metrics'].items():
                    if not isinstance(metric_name, str):
                        errors.append("Metric names must be strings")
                    if not isinstance(metric_value, (int, float)):
                        errors.append(f"Metric {metric_name} value must be a number")
                        
        # Validate deadlines
        if 'deadline' in goal:
            try:
                deadline = datetime.fromisoformat(goal['deadline'])
                if deadline < datetime.now():
                    errors.append("Goal deadline must be in the future")
            except (ValueError, TypeError):
                errors.append("Goal deadline must be a valid ISO format datetime string")
                
        # Validate tags
        if 'tags' in goal:
            if not isinstance(goal['tags'], list):
                errors.append("Goal tags must be a list")
            else:
                for tag in goal['tags']:
                    if not isinstance(tag, str):
                        errors.append("All tags must be strings")
                    elif not tag.strip():
                        errors.append("Tag cannot be empty")
                        
        # Validate plugin requirements
        if 'required_plugins' in goal:
            if not isinstance(goal['required_plugins'], list):
                errors.append("Required plugins must be a list")
            else:
                for plugin_id in goal['required_plugins']:
                    if not isinstance(plugin_id, str):
                        errors.append("Plugin IDs must be strings")
                    elif not plugin_id.strip():
                        errors.append("Plugin ID cannot be empty")
                    elif not self.plugin_manager.get_plugin(plugin_id):
                        errors.append(f"Required plugin not found: {plugin_id}")
                        
        return errors

    def _chain_goals(self, goals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Chain goals based on plugin dependencies and constraints.
        
        Args:
            goals: List of goal dictionaries to chain
            
        Returns:
            Ordered list of goals based on dependencies
        """
        # Create dependency graph
        graph = nx.DiGraph()
        
        # Add all goals to graph
        for goal in goals:
            graph.add_node(goal['id'], goal=goal)
            
        # Add edges based on explicit dependencies
        for goal in goals:
            if 'dependencies' in goal:
                for dep_id in goal['dependencies']:
                    if dep_id in graph:
                        graph.add_edge(dep_id, goal['id'])
                        
        # Add edges based on plugin dependencies
        plugin_manager = service_locator.get_service('plugin_manager')
        for goal in goals:
            if 'required_plugins' in goal:
                for plugin_id in goal['required_plugins']:
                    plugin_deps = plugin_manager.get_plugin_dependencies(plugin_id)
                    for dep_plugin in plugin_deps:
                        # Find goals that require the dependent plugin
                        for other_goal in goals:
                            if other_goal['id'] != goal['id'] and 'required_plugins' in other_goal:
                                if dep_plugin in other_goal['required_plugins']:
                                    graph.add_edge(other_goal['id'], goal['id'])
                                    
        # Add edges based on resource constraints
        for goal in goals:
            if 'constraints' in goal:
                for constraint in goal['constraints']:
                    if constraint['type'] == 'resource':
                        resource_type = constraint['parameters'].get('resource_type')
                        if resource_type:
                            # Find goals that use the same resource
                            for other_goal in goals:
                                if other_goal['id'] != goal['id'] and 'constraints' in other_goal:
                                    for other_constraint in other_goal['constraints']:
                                        if (other_constraint['type'] == 'resource' and
                                            other_constraint['parameters'].get('resource_type') == resource_type):
                                            # Add edge based on priority
                                            if goal.get('priority', 0) > other_goal.get('priority', 0):
                                                graph.add_edge(other_goal['id'], goal['id'])
                                            else:
                                                graph.add_edge(goal['id'], other_goal['id'])
                                                
        # Add edges based on temporal constraints
        for goal in goals:
            if 'constraints' in goal:
                for constraint in goal['constraints']:
                    if constraint['type'] == 'temporal':
                        start_time = constraint['parameters'].get('start_time')
                        if start_time:
                            try:
                                goal_start = datetime.fromisoformat(start_time)
                                # Find goals that should start after this one
                                for other_goal in goals:
                                    if other_goal['id'] != goal['id'] and 'constraints' in other_goal:
                                        for other_constraint in other_goal['constraints']:
                                            if other_constraint['type'] == 'temporal':
                                                other_start = other_constraint['parameters'].get('start_time')
                                                if other_start:
                                                    try:
                                                        other_goal_start = datetime.fromisoformat(other_start)
                                                        if other_goal_start > goal_start:
                                                            graph.add_edge(goal['id'], other_goal['id'])
                                                    except ValueError:
                                                        continue
                            except ValueError:
                                continue
                                
        # Check for cycles
        try:
            cycle = nx.find_cycle(graph)
            raise ValueError(f"Circular dependency detected: {' -> '.join(cycle)}")
        except nx.NetworkXNoCycle:
            pass
            
        # Get topological sort
        try:
            ordered_goals = []
            for node in nx.topological_sort(graph):
                ordered_goals.append(graph.nodes[node]['goal'])
            return ordered_goals
        except nx.NetworkXUnfeasible:
            raise ValueError("Could not resolve goal dependencies")

# Create a singleton instance
goal_processor = GoalProcessor() 