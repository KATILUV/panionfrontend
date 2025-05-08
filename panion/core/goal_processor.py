"""
Goal Processor
Processes goals and manages their execution.
"""

import logging
from typing import Dict, Any, List, Optional, Set, TYPE_CHECKING
from datetime import datetime
from pathlib import Path
import json
import asyncio
from dataclasses import dataclass, field

from core.interfaces import IPluginManager, IGoalProcessor
from core.plugin.types import Plugin, PluginMetadata, PluginState
from core.panion_errors import PluginError, ErrorSeverity
from core.utils import with_connection_pool, cache_result
from core.base import BaseComponent, ComponentMetadata, ComponentState
from core.logging_config import get_logger, LogTimer
from core.config import goal_config, system_config
from core.plugin.interfaces import IPluginManager
from core.goal_history_manager import goal_history_manager, GoalAttemptStatus

if TYPE_CHECKING:
    from core.plugin_manager import PluginManager

class GoalProcessor(BaseComponent, IGoalProcessor):
    """Processes goals and manages their execution."""
    
    def __init__(self, plugin_manager: IPluginManager):
        """Initialize the goal processor."""
        metadata = ComponentMetadata(
            name="GoalProcessor",
            version="1.0.0",
            description="Goal processing system",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            dependencies={},
            config_schema={}
        )
        super().__init__(metadata)
        
        self.logger = logging.getLogger(__name__)
        self.plugin_manager = plugin_manager
        self._goals: Dict[str, Any] = {}
        self._active_goals: Set[str] = set()
        self._completed_goals: Set[str] = set()
        self._failed_goals: Set[str] = set()
        self._max_retries = goal_config.max_retries
        self._retry_delay = goal_config.retry_delay
        self._goal_state_file = Path('data/goals.json')
        self._state_lock = asyncio.Lock()

    async def initialize(self) -> None:
        """Initialize the goal processor and load saved state."""
        try:
            self.logger.info("Initializing goal processor...")
            await self._load_state()
            self.logger.info("Goal processor initialized successfully")
        except Exception as e:
            self.logger.error(f"Error initializing goal processor: {e}")
            raise

    async def _load_state(self) -> None:
        """Load goal state from file."""
        if not self._goal_state_file.exists():
            return

        try:
            async with self._state_lock:
                with open(self._goal_state_file, 'r') as f:
                    state = json.load(f)
                    
                # Load goals
                for goal_data in state.get('goals', []):
                    goal_id = goal_data['id']
                    self._goals[goal_id] = goal_data
                    
                    # Set goal status based on state
                    status = goal_data.get('status', 'pending')
                    if status == 'active':
                        self._active_goals.add(goal_id)
                    elif status == 'completed':
                        self._completed_goals.add(goal_id)
                    elif status == 'failed':
                        self._failed_goals.add(goal_id)
                        
                # Load active goals
                for goal_id in state.get('active_goals', []):
                    if goal_id in self._goals:
                        self._active_goals.add(goal_id)
                        
                # Load completed goals
                for goal_id in state.get('completed_goals', []):
                    if goal_id in self._goals:
                        self._completed_goals.add(goal_id)
                        
                # Load failed goals
                for goal_id in state.get('failed_goals', []):
                    if goal_id in self._goals:
                        self._failed_goals.add(goal_id)
                        
                # Validate state consistency
                await self._validate_state()
                
                self.logger.info(f"Loaded {len(self._goals)} goals: {len(self._active_goals)} active, {len(self._completed_goals)} completed, {len(self._failed_goals)} failed")
                
        except Exception as e:
            self.logger.error(f"Error loading goal state: {e}")
            raise

    async def _save_state(self) -> None:
        """Save goal state to file."""
        try:
            async with self._state_lock:
                state = {
                    'goals': list(self._goals.values()),
                    'active_goals': list(self._active_goals),
                    'completed_goals': list(self._completed_goals),
                    'failed_goals': list(self._failed_goals),
                    'last_updated': datetime.now().isoformat()
                }
                
                with open(self._goal_state_file, 'w') as f:
                    json.dump(state, f, indent=2)
                    
                self.logger.info(f"Saved goal state: {len(self._goals)} goals, {len(self._active_goals)} active, {len(self._completed_goals)} completed, {len(self._failed_goals)} failed")
                
        except Exception as e:
            self.logger.error(f"Error saving goal state: {e}")
            raise

    async def _validate_state(self) -> None:
        """Validate goal state consistency."""
        try:
            # Check for duplicate goal IDs
            goal_ids = set()
            for goal_id in self._goals:
                if goal_id in goal_ids:
                    self.logger.warning(f"Duplicate goal ID found: {goal_id}")
                    continue
                goal_ids.add(goal_id)
            
            # Validate active goals
            for goal_id in list(self._active_goals):
                if goal_id not in self._goals:
                    self.logger.warning(f"Active goal {goal_id} not found in goals list")
                    self._active_goals.remove(goal_id)
                elif self._goals[goal_id].get('status') != 'active':
                    self.logger.warning(f"Active goal {goal_id} has incorrect status: {self._goals[goal_id].get('status')}")
                    self._active_goals.remove(goal_id)
            
            # Validate completed goals
            for goal_id in list(self._completed_goals):
                if goal_id not in self._goals:
                    self.logger.warning(f"Completed goal {goal_id} not found in goals list")
                    self._completed_goals.remove(goal_id)
                elif self._goals[goal_id].get('status') != 'completed':
                    self.logger.warning(f"Completed goal {goal_id} has incorrect status: {self._goals[goal_id].get('status')}")
                    self._completed_goals.remove(goal_id)
            
            # Validate failed goals
            for goal_id in list(self._failed_goals):
                if goal_id not in self._goals:
                    self.logger.warning(f"Failed goal {goal_id} not found in goals list")
                    self._failed_goals.remove(goal_id)
                elif self._goals[goal_id].get('status') != 'failed':
                    self.logger.warning(f"Failed goal {goal_id} has incorrect status: {self._goals[goal_id].get('status')}")
                    self._failed_goals.remove(goal_id)
            
            # Ensure goals are in exactly one state
            for goal_id in self._goals:
                status = self._goals[goal_id].get('status', 'pending')
                if status == 'active' and goal_id not in self._active_goals:
                    self._active_goals.add(goal_id)
                elif status == 'completed' and goal_id not in self._completed_goals:
                    self._completed_goals.add(goal_id)
                elif status == 'failed' and goal_id not in self._failed_goals:
                    self._failed_goals.add(goal_id)
            
            self.logger.info("Goal state validation completed")
            
        except Exception as e:
            self.logger.error(f"Error validating goal state: {e}")
            raise

    async def update_goal_status(self, goal_id: str, new_status: str) -> None:
        """Update a goal's status.
        
        Args:
            goal_id: The ID of the goal to update
            new_status: The new status ('pending', 'active', 'completed', 'failed')
        """
        try:
            if goal_id not in self._goals:
                raise ValueError(f"Goal {goal_id} not found")
                
            async with self._state_lock:
                # Update goal data
                self._goals[goal_id]['status'] = new_status
                self._goals[goal_id]['updated_at'] = datetime.now().isoformat()
                
                # Update state sets
                if new_status == 'active':
                    self._active_goals.add(goal_id)
                    self._completed_goals.discard(goal_id)
                    self._failed_goals.discard(goal_id)
                elif new_status == 'completed':
                    self._active_goals.discard(goal_id)
                    self._completed_goals.add(goal_id)
                    self._failed_goals.discard(goal_id)
                elif new_status == 'failed':
                    self._active_goals.discard(goal_id)
                    self._completed_goals.discard(goal_id)
                    self._failed_goals.add(goal_id)
                else:  # pending
                    self._active_goals.discard(goal_id)
                    self._completed_goals.discard(goal_id)
                    self._failed_goals.discard(goal_id)
                
                # Save state
                await self._save_state()
                
                self.logger.info(f"Updated goal {goal_id} status to {new_status}")
                
        except Exception as e:
            self.logger.error(f"Error updating goal status: {e}")
            raise

    async def _store_results(self, goal_id: str, result: Dict[str, Any]) -> None:
        """Store goal execution results.
        
        Args:
            goal_id: The ID of the goal
            result: The execution result
        """
        try:
            # Store in results.json
            results_file = Path('data/results.json')
            if results_file.exists():
                with open(results_file, 'r') as f:
                    results = json.load(f)
            else:
                results = {
                    'content': {'text': []},
                    'analysis': {'summary': ''}
                }
            
            # Update results
            results['content']['text'].append({
                'text': str(result.get('output', '')),
                'html': str(result.get('output', ''))
            })
            results['analysis']['summary'] = f"Goal {goal_id}: {result.get('status', 'unknown')}"
            
            with open(results_file, 'w') as f:
                json.dump(results, f, indent=2)
            
            # Store in plugin execution logs
            logs_dir = Path('data/plugin_execution_logs')
            logs_dir.mkdir(parents=True, exist_ok=True)
            
            log_file = logs_dir / f"{goal_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(log_file, 'w') as f:
                json.dump({
                    'goal_id': goal_id,
                    'timestamp': datetime.now().isoformat(),
                    'result': result
                }, f, indent=2)
            
            self.logger.info(f"Stored results for goal {goal_id}")
            
        except Exception as e:
            self.logger.error(f"Error storing results: {e}")
            raise

    async def process_goal(self, goal: Dict[str, Any]) -> Dict[str, Any]:
        """Process a goal and update its status."""
        goal_id = goal['id']
        start_time = datetime.now()
        
        try:
            # Update status to active
            await self.update_goal_status(goal_id, 'active')
            
            # Process subtasks
            if 'subtasks' in goal:
                for subtask in goal['subtasks']:
                    subtask_result = await self.process_goal(subtask)
                    if subtask_result.get('status') == 'failure':
                        await self.update_goal_status(goal_id, 'failed')
                        # Record failed attempt
                        await goal_history_manager.record_attempt(goal_id, {
                            'status': GoalAttemptStatus.FAILURE,
                            'error': f"Subtask {subtask['id']} failed: {subtask_result.get('error')}",
                            'execution_time': (datetime.now() - start_time).total_seconds(),
                            'plugin_results': {},
                            'validation_results': {}
                        })
                        # Store results
                        await self._store_results(goal_id, subtask_result)
                        return {
                            'status': 'failure',
                            'error': f"Subtask {subtask['id']} failed: {subtask_result.get('error')}"
                        }
            
            # Execute goal logic
            result = await self._execute_goal_logic(goal)
            
            # Record attempt
            await goal_history_manager.record_attempt(goal_id, {
                'status': GoalAttemptStatus.SUCCESS if result.get('status') == 'success' else GoalAttemptStatus.FAILURE,
                'error': result.get('error'),
                'execution_time': (datetime.now() - start_time).total_seconds(),
                'plugin_results': result.get('plugin_results', {}),
                'validation_results': result.get('validation_results', {})
            })
            
            if result.get('status') == 'success':
                await self.update_goal_status(goal_id, 'completed')
            else:
                await self.update_goal_status(goal_id, 'failed')
            
            # Store results
            await self._store_results(goal_id, result)
            return result
            
        except Exception as e:
            self.logger.error(f"Error processing goal {goal_id}: {e}")
            await self.update_goal_status(goal_id, 'failed')
            # Record failed attempt
            await goal_history_manager.record_attempt(goal_id, {
                'status': GoalAttemptStatus.FAILURE,
                'error': str(e),
                'execution_time': (datetime.now() - start_time).total_seconds(),
                'plugin_results': {},
                'validation_results': {}
            })
            # Store results
            await self._store_results(goal_id, {
                'status': 'failure',
                'error': str(e)
            })
            return {
                'status': 'failure',
                'error': str(e)
            }

    async def _execute_goal_logic(self, goal: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the actual logic for a goal."""
        try:
            plugin_results = {}
            validation_results = {}
            
            # Execute plugins if needed
            if 'required_plugins' in goal:
                plugin_result = await self._execute_plugins(goal)
                if plugin_result.get('status') == 'failure':
                    return {
                        'status': 'failure',
                        'error': plugin_result.get('error'),
                        'plugin_results': plugin_results,
                        'validation_results': validation_results
                    }
                plugin_results = plugin_result.get('result', {})
                    
            # Run validations if needed
            if 'validation_rules' in goal:
                for rule in goal['validation_rules']:
                    validation_result = await self._run_validation(rule)
                    validation_results[rule.get('id', 'unknown')] = validation_result
                    if not validation_result['success']:
                        return {
                            'status': 'failure',
                            'error': f"Validation failed: {validation_result.get('error')}",
                            'plugin_results': plugin_results,
                            'validation_results': validation_results
                        }
            
            return {
                'status': 'success',
                'plugin_results': plugin_results,
                'validation_results': validation_results
            }
            
        except Exception as e:
            return {
                'status': 'failure',
                'error': str(e),
                'plugin_results': {},
                'validation_results': {}
            }
