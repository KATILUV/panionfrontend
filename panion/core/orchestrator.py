"""
Orchestrator
Coordinates system components and manages the main execution loop.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio
from pathlib import Path
import json
from injector import inject, singleton

from core.plugin.interfaces import IPluginManager, IPluginTester
from core.plugin.dependency_manager import DependencyManager
from core.base import BaseComponent, ComponentMetadata, ComponentState
from core.config import plugin_config, system_config
from core.events import event_bus, Event, EventType
from core.error_handling import ErrorHandler, with_error_recovery
from core.service_locator import ServiceLocator
from core.plugin_manager import PluginManager

@singleton
class Orchestrator(BaseComponent):
    """Coordinates system components and manages the main execution loop."""
    
    @inject
    def __init__(
        self,
        plugin_manager: IPluginManager,
        dependency_manager: DependencyManager,
        service_locator: ServiceLocator,
        error_handler: ErrorHandler
    ):
        """Initialize the orchestrator.
        
        Args:
            plugin_manager: The plugin manager instance
            dependency_manager: The dependency manager instance
            service_locator: The service locator instance
            error_handler: The error handler instance
        """
        metadata = ComponentMetadata(
            name="Orchestrator",
            version="1.0.0",
            description="System orchestrator",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            dependencies={},
            config_schema={}
        )
        super().__init__(metadata)
        
        self.logger = logging.getLogger(__name__)
        self.plugin_manager = plugin_manager
        self.dependency_manager = dependency_manager
        self.service_locator = service_locator
        self.error_handler = error_handler
            
    async def initialize(self, config: Optional[Dict[str, Any]] = None) -> None:
        """Initialize the orchestrator.
        
        Args:
            config: Optional configuration dictionary
        """
        self.logger.info("Initializing orchestrator")
        self._state = ComponentState.INITIALIZING
        try:
            # Store config
            self.config = config or {}
            
            # Register service
            self.service_locator.register_service("orchestrator", self)
            
            # Initialize components
            await self.plugin_manager.start()
            await self.dependency_manager.start()
            
            self._state = ComponentState.ACTIVE
            self.logger.info("Orchestrator initialized successfully")
            
        except Exception as e:
            await self.error_handler.handle_error(e, {"context": "orchestrator_initialize"})
            raise
            
    async def start(self) -> None:
        """Start the orchestrator."""
        self.logger.info("Starting orchestrator")
        self._start_time = datetime.now()
        self._state = ComponentState.ACTIVE
        
        # Start components
        await self.plugin_manager.start()
        await self.dependency_manager.start()
    
    async def stop(self) -> None:
        """Stop the orchestrator."""
        self.logger.info("Stopping orchestrator")
        self._state = ComponentState.STOPPING
        
        # Stop components
        await self.plugin_manager.stop()
        await self.dependency_manager.stop()
        
        self._state = ComponentState.STOPPED
    
    async def pause(self) -> None:
        """Pause the orchestrator."""
        self.logger.info("Pausing orchestrator")
        self._state = ComponentState.PAUSED
        
        # Pause components
        await self.plugin_manager.pause()
        await self.dependency_manager.pause()
    
    async def resume(self) -> None:
        """Resume the orchestrator."""
        self.logger.info("Resuming orchestrator")
        self._state = ComponentState.ACTIVE
        
        # Resume components
        await self.plugin_manager.resume()
        await self.dependency_manager.resume()
    
    async def update(self) -> None:
        """Update the orchestrator state."""
        if self._state == ComponentState.ACTIVE:
            try:
                # Update components
                await self.plugin_manager.update()
                await self.dependency_manager.update()
                
                # Update metrics
                await self.plugin_manager.update_metrics()
            except Exception as e:
                await self.error_handler.handle_error(e, {"context": "orchestrator_update"})
    
    async def check_health(self) -> Dict[str, Any]:
        """Check the health of the system components.
        
        Returns:
            Dict[str, Any]: Health check results including overall status and component-specific issues
        """
        try:
            issues = []
            
            # Check plugin manager health
            plugin_status = await self.plugin_manager.get_status()
            if plugin_status.get('state') != 'active':
                issues.append(f"Plugin manager state: {plugin_status.get('state')}")
            
            # Check dependency manager health
            dep_status = await self.dependency_manager.get_status()
            if dep_status.get('state') != 'active':
                issues.append(f"Dependency manager state: {dep_status.get('state')}")
            
            # Check orchestrator state
            if self._state != ComponentState.ACTIVE:
                issues.append(f"Orchestrator state: {self._state.value}")
            
            return {
                'healthy': len(issues) == 0,
                'issues': issues,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error during health check: {e}")
            return {
                'healthy': False,
                'issues': [f"Health check error: {str(e)}"],
                'timestamp': datetime.now().isoformat()
            }
    
    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the orchestrator."""
        return {
            'state': self._state.value,
            'plugin_manager_status': await self.plugin_manager.get_status(),
            'dependency_manager_status': await self.dependency_manager.get_status(),
            'error_info': self.get_error_info(),
            'uptime': self.uptime
        }

    async def run(self) -> None:
        """Run the orchestrator's main execution loop."""
        self.logger.info("Starting orchestrator main loop")
        self._state = ComponentState.ACTIVE
        
        try:
            while self._state == ComponentState.ACTIVE:
                # Update system state
                await self.update()
                
                # Check health
                health = await self.check_health()
                if not health['healthy']:
                    self.logger.warning(f"Health check failed: {health['issues']}")
                
                # Process active goals
                await self.process_goals()
                
                # Sleep briefly
                await asyncio.sleep(1)
                
        except Exception as e:
            self.logger.error(f"Error in main loop: {e}")
            await self.error_handler.handle_error(e, {"context": "orchestrator_run"})
            raise
        finally:
            self._state = ComponentState.STOPPED
            self.logger.info("Orchestrator main loop stopped")

    async def process_goals(self) -> None:
        """Process active goals."""
        try:
            # Get active goals from goals.json
            goals_file = Path('data/goals.json')
            if goals_file.exists():
                with open(goals_file, 'r') as f:
                    goals_data = json.load(f)
                    
                active_goals = goals_data.get('active_goals', [])
                for goal_id in active_goals:
                    goal = next((g for g in goals_data['goals'] if g['id'] == goal_id), None)
                    if goal:
                        await self.process_goal(goal)
                        
        except Exception as e:
            self.logger.error(f"Error processing goals: {e}")
            await self.error_handler.handle_error(e, {"context": "process_goals"})

    async def process_goal(self, goal: Dict[str, Any]) -> None:
        """Process a single goal.
        
        Args:
            goal: The goal to process
        """
        try:
            self.logger.info(f"Processing goal: {goal['id']}")
            
            # Process each subtask
            for subtask in goal.get('subtasks', []):
                await self.process_subtask(goal['id'], subtask)
                
            # Update goal status
            await self.update_goal_status(goal['id'], 'completed')
            
        except Exception as e:
            self.logger.error(f"Error processing goal {goal['id']}: {e}")
            await self.error_handler.handle_error(e, {"context": f"process_goal_{goal['id']}"})
            await self.update_goal_status(goal['id'], 'failed')

    async def process_subtask(self, goal_id: str, subtask: Dict[str, Any]) -> None:
        """Process a single subtask.
        
        Args:
            goal_id: The ID of the parent goal
            subtask: The subtask to process
        """
        try:
            self.logger.info(f"Processing subtask {subtask['id']} for goal {goal_id}")
            
            # Get appropriate plugin for subtask type
            plugin = await self.plugin_manager.get_plugin_for_type(subtask['type'])
            if plugin:
                # Execute plugin
                result = await plugin.execute(subtask['parameters'])
                
                # Store results
                await self.store_subtask_results(goal_id, subtask['id'], result)
            else:
                raise ValueError(f"No plugin found for subtask type: {subtask['type']}")
                
        except Exception as e:
            self.logger.error(f"Error processing subtask {subtask['id']}: {e}")
            await self.error_handler.handle_error(e, {"context": f"process_subtask_{subtask['id']}"})
            raise

    async def store_subtask_results(self, goal_id: str, subtask_id: str, result: Dict[str, Any]) -> None:
        """Store subtask execution results.
        
        Args:
            goal_id: The ID of the parent goal
            subtask_id: The ID of the subtask
            result: The execution results
        """
        try:
            # Create results directory if it doesn't exist
            results_dir = Path('data/goals') / goal_id
            results_dir.mkdir(parents=True, exist_ok=True)
            
            # Store results
            results_file = results_dir / f"{subtask_id}_results.json"
            with open(results_file, 'w') as f:
                json.dump(result, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Error storing results for subtask {subtask_id}: {e}")
            await self.error_handler.handle_error(e, {"context": f"store_subtask_results_{subtask_id}"})

    async def update_goal_status(self, goal_id: str, status: str) -> None:
        """Update the status of a goal.
        
        Args:
            goal_id: The ID of the goal
            status: The new status
        """
        try:
            goals_file = Path('data/goals.json')
            if goals_file.exists():
                with open(goals_file, 'r') as f:
                    goals_data = json.load(f)
                    
                # Update goal status
                for goal in goals_data['goals']:
                    if goal['id'] == goal_id:
                        goal['status'] = status
                        
                # Update active_goals list
                if status == 'completed':
                    goals_data['active_goals'].remove(goal_id)
                    goals_data['completed_goals'].append(goal_id)
                elif status == 'failed':
                    goals_data['active_goals'].remove(goal_id)
                    goals_data['failed_goals'].append(goal_id)
                    
                # Save updated goals
                with open(goals_file, 'w') as f:
                    json.dump(goals_data, f, indent=2)
                    
        except Exception as e:
            self.logger.error(f"Error updating goal status for {goal_id}: {e}")
            await self.error_handler.handle_error(e, {"context": f"update_goal_status_{goal_id}"}) 