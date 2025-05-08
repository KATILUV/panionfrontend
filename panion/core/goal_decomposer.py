"""
Enhanced goal decomposition with dynamic subgoal spawning.
"""

import logging
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
import asyncio
from pathlib import Path
import json
import yaml
import re
import networkx as nx
from core.logging_config import get_logger, LogTimer
from datetime import datetime

from core.guidance_decomposer import GuidanceDecomposer, DecompositionResult
from core.guidance_config import guidance_config

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class Goal:
    """Represents a goal with its decomposition."""
    id: str
    description: str
    decomposition: Dict[str, Any]
    parent_id: Optional[str] = None
    status: str = "pending"
    metadata: Dict[str, Any] = None

class GoalDecomposer:
    def __init__(self):
        self.logger = get_logger(__name__)
        self._subtask_cache = {}
        self._dependency_graph = nx.DiGraph()
        self._validation_rules = {
            'id': lambda x: isinstance(x, str) and len(x) > 0,
            'description': lambda x: isinstance(x, str) and len(x) > 0,
            'dependencies': lambda x: isinstance(x, list) and all(isinstance(d, str) for d in x),
            'priority': lambda x: isinstance(x, (int, float)) and 0 <= x <= 1,
            'estimated_duration': lambda x: isinstance(x, (int, float)) and x > 0,
            'required_skills': lambda x: isinstance(x, list) and all(isinstance(s, str) for s in x),
            'success_criteria': lambda x: isinstance(x, list) and all(isinstance(c, str) for c in x),
            'plugins': lambda x: isinstance(x, list) and all(isinstance(p, str) for p in x)
        }

    def _parse_decomposition(self, llm_response: str) -> List[Dict[str, Any]]:
        """Parse LLM response into structured subtasks with validation.
        
        Args:
            llm_response: Raw LLM response containing task decomposition in JSON or YAML format
            
        Returns:
            List of validated subtask dictionaries
            
        Raises:
            ValueError: If response cannot be parsed or validation fails
        """
        try:
            with LogTimer(self.logger, 'parse_decomposition'):
                # Try parsing as JSON first
                try:
                    parsed = json.loads(llm_response)
                except json.JSONDecodeError:
                    # If not JSON, try YAML
                    try:
                        parsed = yaml.safe_load(llm_response)
                    except yaml.YAMLError:
                        # If not YAML, try structured text
                        parsed = self._parse_structured_text(llm_response)
                
                # Handle different response formats
                if isinstance(parsed, dict) and "subtasks" in parsed:
                    subtasks = parsed["subtasks"]
                elif isinstance(parsed, list):
                    subtasks = parsed
                else:
                    raise ValueError("Invalid response format: must be a list of subtasks or dict with 'subtasks' key")
                
                # Validate and enrich each subtask
                validated_subtasks = []
                for i, subtask in enumerate(subtasks):
                    try:
                        # Ensure required fields
                        if not isinstance(subtask, dict):
                            raise ValueError(f"Subtask {i} must be a dictionary")
                        
                        # Generate ID if not present
                        if 'id' not in subtask:
                            subtask['id'] = f"subtask_{i+1}"
                        
                        # Validate all fields
                        for field, validator in self._validation_rules.items():
                            if field in subtask and not validator(subtask[field]):
                                raise ValueError(f"Invalid {field} in subtask {subtask['id']}")
                        
                        # Add default values for missing optional fields
                        subtask.setdefault('dependencies', [])
                        subtask.setdefault('priority', 0.5)
                        subtask.setdefault('estimated_duration', 60)  # Default 1 minute
                        subtask.setdefault('required_skills', [])
                        subtask.setdefault('success_criteria', [])
                        subtask.setdefault('plugins', [])
                        
                        # Add to validated list
                        validated_subtasks.append(subtask)
                        
                    except Exception as e:
                        self.logger.error(f"Error validating subtask {i}: {e}")
                        raise ValueError(f"Invalid subtask {i}: {str(e)}")
                
                # Validate dependencies
                self._validate_dependencies(validated_subtasks)
                
                return validated_subtasks
                
        except Exception as e:
            self.logger.error(f"Error parsing decomposition: {e}")
            # Return a single error subtask
            return [{
                'id': 'error_subtask',
                'description': f"Error parsing decomposition: {str(e)}",
                'dependencies': [],
                'priority': 1.0,
                'estimated_duration': 60,
                'required_skills': [],
                'success_criteria': [],
                'plugins': [],
                'error': str(e)
            }]

    def _parse_structured_text(self, text: str) -> List[Dict[str, Any]]:
        """Parse structured text format into subtasks."""
        subtasks = []
        current_subtask = None
        
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            # Check for subtask start
            if line.startswith('Subtask') or line.startswith('Task'):
                if current_subtask:
                    subtasks.append(current_subtask)
                current_subtask = {
                    'id': f"subtask_{len(subtasks)+1}",
                    'description': line.split(':', 1)[1].strip() if ':' in line else line,
                    'dependencies': [],
                    'priority': 0.5,
                    'estimated_duration': 60,
                    'required_skills': [],
                    'success_criteria': [],
                    'plugins': []
                }
            # Parse fields
            elif current_subtask is not None:
                if line.startswith('Dependencies:'):
                    current_subtask['dependencies'] = [
                        d.strip() for d in line.split(':', 1)[1].split(',')
                    ]
                elif line.startswith('Priority:'):
                    try:
                        current_subtask['priority'] = float(line.split(':', 1)[1].strip())
                    except ValueError:
                        pass
                elif line.startswith('Duration:'):
                    try:
                        current_subtask['estimated_duration'] = float(line.split(':', 1)[1].strip())
                    except ValueError:
                        pass
                elif line.startswith('Skills:'):
                    current_subtask['required_skills'] = [
                        s.strip() for s in line.split(':', 1)[1].split(',')
                    ]
                elif line.startswith('Success Criteria:'):
                    current_subtask['success_criteria'] = [
                        c.strip() for c in line.split(':', 1)[1].split(',')
                    ]
                elif line.startswith('Plugins:'):
                    current_subtask['plugins'] = [
                        p.strip() for p in line.split(':', 1)[1].split(',')
                    ]
                else:
                    # Append to description if no field marker
                    current_subtask['description'] += f"\n{line}"
        
        # Add last subtask
        if current_subtask:
            subtasks.append(current_subtask)
            
        return subtasks

    def _validate_dependencies(self, subtasks: List[Dict[str, Any]]) -> None:
        """Validate dependencies between subtasks."""
        # Create dependency graph
        graph = nx.DiGraph()
        
        # Add nodes
        for subtask in subtasks:
            graph.add_node(subtask['id'])
        
        # Add edges
        for subtask in subtasks:
            for dep in subtask['dependencies']:
                if dep not in graph:
                    raise ValueError(f"Dependency {dep} not found in subtasks")
                graph.add_edge(dep, subtask['id'])
        
        # Check for cycles
        try:
            nx.find_cycle(graph)
            raise ValueError("Circular dependencies detected")
        except nx.NetworkXNoCycle:
            pass

    def get_subtask_order(self) -> List[str]:
        """Get subtasks in dependency order."""
        try:
            return list(nx.topological_sort(self._dependency_graph))
        except nx.NetworkXUnfeasible:
            self.logger.error("Circular dependencies detected")
            return list(self._dependency_graph.nodes())

    def get_subtask_dependencies(self, subtask_id: str) -> List[str]:
        """Get all dependencies for a subtask."""
        try:
            return list(nx.ancestors(self._dependency_graph, subtask_id))
        except Exception as e:
            self.logger.error(f"Error getting dependencies for {subtask_id}: {e}")
            return []

    def get_subtask_dependents(self, subtask_id: str) -> List[str]:
        """Get all subtasks that depend on this one."""
        try:
            return list(nx.descendants(self._dependency_graph, subtask_id))
        except Exception as e:
            self.logger.error(f"Error getting dependents for {subtask_id}: {e}")
            return []

    def _validate_goal(self, goal: Dict[str, Any]) -> List[str]:
        """Validate a goal and its subtasks."""
        errors = []
        
        # Validate goal structure
        if not isinstance(goal, dict):
            errors.append("Goal must be a dictionary")
            return errors
            
        # Validate required fields
        required_fields = ['name', 'description', 'subtasks']
        for field in required_fields:
            if field not in goal:
                errors.append(f"Missing required field: {field}")
                
        # Validate name
        if 'name' in goal:
            if not isinstance(goal['name'], str):
                errors.append("Goal name must be a string")
            elif not goal['name'].strip():
                errors.append("Goal name cannot be empty")
            elif len(goal['name']) > 100:
                errors.append("Goal name must be less than 100 characters")
                
        # Validate description
        if 'description' in goal:
            if not isinstance(goal['description'], str):
                errors.append("Goal description must be a string")
            elif not goal['description'].strip():
                errors.append("Goal description cannot be empty")
            elif len(goal['description']) > 1000:
                errors.append("Goal description must be less than 1000 characters")
                
        # Validate subtasks
        if 'subtasks' in goal:
            if not isinstance(goal['subtasks'], list):
                errors.append("Subtasks must be a list")
            elif not goal['subtasks']:
                errors.append("Goal must have at least one subtask")
            else:
                for i, subtask in enumerate(goal['subtasks']):
                    subtask_errors = self._validate_subtask(subtask, i)
                    errors.extend(subtask_errors)
                    
        # Validate dependencies
        if 'dependencies' in goal:
            if not isinstance(goal['dependencies'], list):
                errors.append("Dependencies must be a list")
            else:
                for dep in goal['dependencies']:
                    if not isinstance(dep, str):
                        errors.append("Dependency must be a string")
                    elif dep not in [st['name'] for st in goal['subtasks']]:
                        errors.append(f"Invalid dependency: {dep}")
                        
        # Validate priority
        if 'priority' in goal:
            if not isinstance(goal['priority'], (int, float)):
                errors.append("Priority must be a number")
            elif goal['priority'] < 0 or goal['priority'] > 1:
                errors.append("Priority must be between 0 and 1")
                
        # Validate deadline
        if 'deadline' in goal:
            try:
                datetime.fromisoformat(goal['deadline'])
            except (ValueError, TypeError):
                errors.append("Invalid deadline format")
                
        return errors
        
    def _validate_subtask(self, subtask: Dict[str, Any], index: int) -> List[str]:
        """Validate a subtask."""
        errors = []
        
        # Validate subtask structure
        if not isinstance(subtask, dict):
            errors.append(f"Subtask {index} must be a dictionary")
            return errors
            
        # Validate required fields
        required_fields = ['name', 'description', 'action']
        for field in required_fields:
            if field not in subtask:
                errors.append(f"Subtask {index} missing required field: {field}")
                
        # Validate name
        if 'name' in subtask:
            if not isinstance(subtask['name'], str):
                errors.append(f"Subtask {index} name must be a string")
            elif not subtask['name'].strip():
                errors.append(f"Subtask {index} name cannot be empty")
            elif len(subtask['name']) > 100:
                errors.append(f"Subtask {index} name must be less than 100 characters")
                
        # Validate description
        if 'description' in subtask:
            if not isinstance(subtask['description'], str):
                errors.append(f"Subtask {index} description must be a string")
            elif not subtask['description'].strip():
                errors.append(f"Subtask {index} description cannot be empty")
            elif len(subtask['description']) > 500:
                errors.append(f"Subtask {index} description must be less than 500 characters")
                
        # Validate action
        if 'action' in subtask:
            if not isinstance(subtask['action'], str):
                errors.append(f"Subtask {index} action must be a string")
            elif not subtask['action'].strip():
                errors.append(f"Subtask {index} action cannot be empty")
                
        # Validate dependencies
        if 'dependencies' in subtask:
            if not isinstance(subtask['dependencies'], list):
                errors.append(f"Subtask {index} dependencies must be a list")
            else:
                for dep in subtask['dependencies']:
                    if not isinstance(dep, str):
                        errors.append(f"Subtask {index} dependency must be a string")
                        
        # Validate priority
        if 'priority' in subtask:
            if not isinstance(subtask['priority'], (int, float)):
                errors.append(f"Subtask {index} priority must be a number")
            elif subtask['priority'] < 0 or subtask['priority'] > 1:
                errors.append(f"Subtask {index} priority must be between 0 and 1")
                
        # Validate timeout
        if 'timeout' in subtask:
            if not isinstance(subtask['timeout'], (int, float)):
                errors.append(f"Subtask {index} timeout must be a number")
            elif subtask['timeout'] <= 0:
                errors.append(f"Subtask {index} timeout must be positive")
                
        # Validate retries
        if 'max_retries' in subtask:
            if not isinstance(subtask['max_retries'], int):
                errors.append(f"Subtask {index} max_retries must be an integer")
            elif subtask['max_retries'] < 0:
                errors.append(f"Subtask {index} max_retries must be non-negative")
                
        return errors

class EnhancedGoalDecomposer:
    """Enhanced goal decomposition with dynamic subgoal spawning."""
    
    def __init__(self, config_path: Optional[str] = None):
        """Initialize the decomposer."""
        self.config_path = config_path
        self.guidance_decomposer = GuidanceDecomposer(guidance_config)
        self.active_goals: Dict[str, Goal] = {}
        self.goal_counter = 0
        
    async def decompose_goal(
        self,
        description: str,
        parent_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Goal:
        """Decompose a goal into subtasks."""
        try:
            # Generate unique goal ID
            goal_id = f"goal_{self.goal_counter}"
            self.goal_counter += 1
            
            # Decompose goal using Guidance
            decomposition = await self.guidance_decomposer.decompose_goal(
                description,
                context
            )
            
            # Validate decomposition
            if not self.guidance_decomposer.validate_decomposition(decomposition):
                raise ValueError("Invalid goal decomposition")
                
            # Create goal object
            goal = Goal(
                id=goal_id,
                description=description,
                decomposition=decomposition,
                parent_id=parent_id,
                metadata=context or {}
            )
            
            # Store goal
            self.active_goals[goal_id] = goal
            
            # Log decomposition
            logger.info(f"Decomposed goal {goal_id}: {description}")
            logger.debug(f"Decomposition details: {decomposition}")
            
            return goal
            
        except Exception as e:
            logger.error(f"Error decomposing goal: {e}")
            raise
            
    async def spawn_subgoal(
        self,
        parent_id: str,
        description: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Goal:
        """Spawn a subgoal from a parent goal."""
        try:
            # Verify parent goal exists
            if parent_id not in self.active_goals:
                raise ValueError(f"Parent goal {parent_id} not found")
                
            # Get parent goal context
            parent_goal = self.active_goals[parent_id]
            parent_context = parent_goal.metadata.copy() if parent_goal.metadata else {}
            
            # Merge contexts
            if context:
                parent_context.update(context)
                
            # Decompose subgoal
            return await self.decompose_goal(
                description,
                parent_id,
                parent_context
            )
            
        except Exception as e:
            logger.error(f"Error spawning subgoal: {e}")
            raise
            
    def get_goal(self, goal_id: str) -> Optional[Goal]:
        """Get a goal by ID."""
        return self.active_goals.get(goal_id)
        
    def get_subgoals(self, parent_id: str) -> List[Goal]:
        """Get all subgoals of a parent goal."""
        return [
            goal for goal in self.active_goals.values()
            if goal.parent_id == parent_id
        ]
        
    def update_goal_status(self, goal_id: str, status: str) -> None:
        """Update the status of a goal."""
        if goal_id in self.active_goals:
            self.active_goals[goal_id].status = status
            logger.info(f"Updated goal {goal_id} status to {status}")
        else:
            raise ValueError(f"Goal {goal_id} not found")
            
    def get_goal_dependencies(self, goal_id: str) -> List[str]:
        """Get the dependencies of a goal."""
        goal = self.get_goal(goal_id)
        if not goal:
            raise ValueError(f"Goal {goal_id} not found")
            
        return goal.decomposition.dependencies.get(goal_id, [])
        
    def get_goal_resources(self, goal_id: str) -> List[Dict[str, Any]]:
        """Get the resources required for a goal."""
        goal = self.get_goal(goal_id)
        if not goal:
            raise ValueError(f"Goal {goal_id} not found")
            
        return [
            resource for resource in goal.decomposition.resources
            if goal_id in resource["required_for"]
        ]
        
    def get_goal_success_criteria(self, goal_id: str) -> List[Dict[str, Any]]:
        """Get the success criteria for a goal."""
        goal = self.get_goal(goal_id)
        if not goal:
            raise ValueError(f"Goal {goal_id} not found")
            
        return [
            criteria for criteria in goal.decomposition.success_criteria
            if criteria["task_id"] == goal_id
        ]
        
    def get_goal_failure_mitigation(self, goal_id: str) -> List[Dict[str, Any]]:
        """Get the failure mitigation strategies for a goal."""
        goal = self.get_goal(goal_id)
        if not goal:
            raise ValueError(f"Goal {goal_id} not found")
            
        return [
            mitigation for mitigation in goal.decomposition.failure_mitigation
            if mitigation["task_id"] == goal_id
        ] 