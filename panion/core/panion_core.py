"""
Panion Core Loop
Handles the main execution loop with thought logging and reflection.
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional
from core.orchestrator import orchestrator
from core.reflection import reflection_system
from core.plugin_synthesizer import plugin_synthesizer
from core.plugin_tester import plugin_tester
from core.panion_goals import Goal, GoalStatus, GoalType

class PanionCore:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._running = False
        self._current_goal: Optional[Goal] = None
        self._retry_count = 0
        self._max_retries = 3

    async def start(self):
        """Start the core loop."""
        try:
            reflection_system.log_thought(
                "core_start",
                "Starting Panion core loop",
                {"stage": "begin"}
            )
            
            self._running = True
            await self._main_loop()
            
            reflection_system.log_thought(
                "core_start",
                "Panion core loop started successfully",
                {"stage": "complete"}
            )
            
        except Exception as e:
            reflection_system.log_thought(
                "core_start",
                f"Error starting Panion core loop: {str(e)}",
                {"error": str(e)}
            )
            raise

    async def stop(self):
        """Stop the core loop."""
        try:
            reflection_system.log_thought(
                "core_stop",
                "Stopping Panion core loop",
                {"stage": "begin"}
            )
            
            self._running = False
            await orchestrator.stop()
            
            reflection_system.log_thought(
                "core_stop",
                "Panion core loop stopped successfully",
                {"stage": "complete"}
            )
            
        except Exception as e:
            reflection_system.log_thought(
                "core_stop",
                f"Error stopping Panion core loop: {str(e)}",
                {"error": str(e)}
            )
            raise

    async def _main_loop(self):
        """Main execution loop."""
        while self._running:
            try:
                # Select next goal
                self._current_goal = await self._select_next_goal()
                if not self._current_goal:
                    reflection_system.log_thought(
                        "core_loop",
                        "No goals available, waiting...",
                        {"stage": "waiting"}
                    )
                    await asyncio.sleep(1)
                    continue

                # Process goal
                success = await self._process_goal()
                
                # Handle failure
                if not success and self._retry_count < self._max_retries:
                    await self._handle_failure()
                elif not success:
                    await self._handle_permanent_failure()

            except Exception as e:
                reflection_system.log_thought(
                    "core_loop",
                    f"Error in main loop: {str(e)}",
                    {"error": str(e)}
                )
                await asyncio.sleep(1)

    async def _select_next_goal(self) -> Optional[Goal]:
        """Select the next goal to process."""
        try:
            reflection_system.log_thought(
                "goal_selection",
                "Selecting next goal",
                {"stage": "begin"}
            )
            
            goal = await orchestrator.select_next_goal()
            
            reflection_system.log_thought(
                "goal_selection",
                f"Selected goal: {goal.goal_id if goal else None}",
                {"goal": goal.goal_id if goal else None}
            )
            
            return goal
            
        except Exception as e:
            reflection_system.log_thought(
                "goal_selection",
                f"Error selecting goal: {str(e)}",
                {"error": str(e)}
            )
            return None

    async def _process_goal(self) -> bool:
        """Process the current goal."""
        try:
            reflection_system.log_thought(
                "goal_processing",
                f"Processing goal: {self._current_goal.goal_id}",
                {"goal": self._current_goal.goal_id}
            )
            
            # Match plugins to goal
            plugins = await orchestrator.match_plugins_to_goal(self._current_goal)
            if not plugins:
                reflection_system.log_thought(
                    "goal_processing",
                    f"No plugins matched for goal: {self._current_goal.goal_id}",
                    {"goal": self._current_goal.goal_id}
                )
                return False

            # Execute goal
            result = await orchestrator.execute_goal(self._current_goal, plugins)
            
            reflection_system.log_thought(
                "goal_processing",
                f"Goal execution result: {result['status']}",
                {
                    "goal": self._current_goal.goal_id,
                    "status": result["status"]
                }
            )
            
            return result["status"] == "success"
            
        except Exception as e:
            reflection_system.log_thought(
                "goal_processing",
                f"Error processing goal: {str(e)}",
                {
                    "goal": self._current_goal.goal_id,
                    "error": str(e)
                }
            )
            return False

    async def _handle_failure(self):
        """Handle goal failure with retry logic."""
        try:
            reflection_system.log_thought(
                "failure_handling",
                f"Handling failure for goal: {self._current_goal.goal_id}",
                {
                    "goal": self._current_goal.goal_id,
                    "retry_count": self._retry_count
                }
            )
            
            # Generate reflection
            reflection = await reflection_system.generate_reflection(
                "goal_failure",
                f"Goal {self._current_goal.goal_id} failed",
                {
                    "goal": self._current_goal.goal_id,
                    "retry_count": self._retry_count
                }
            )
            
            # Propose new plugin
            plugin_proposal = await plugin_synthesizer.propose_plugin(
                self._current_goal,
                reflection
            )
            
            if plugin_proposal:
                # Synthesize and test plugin
                plugin = await plugin_synthesizer.synthesize_plugin(plugin_proposal)
                test_result = await plugin_tester.test_plugin(plugin)
                
                if test_result["status"] == "success":
                    # Add plugin to orchestrator
                    await orchestrator.add_plugin(plugin)
                    
                    reflection_system.log_thought(
                        "failure_handling",
                        f"Added new plugin for goal: {self._current_goal.goal_id}",
                        {
                            "goal": self._current_goal.goal_id,
                            "plugin": plugin.name
                        }
                    )
            
            self._retry_count += 1
            
        except Exception as e:
            reflection_system.log_thought(
                "failure_handling",
                f"Error handling failure: {str(e)}",
                {
                    "goal": self._current_goal.goal_id,
                    "error": str(e)
                }
            )

    async def _handle_permanent_failure(self):
        """Handle permanent goal failure."""
        try:
            reflection_system.log_thought(
                "permanent_failure",
                f"Handling permanent failure for goal: {self._current_goal.goal_id}",
                {"goal": self._current_goal.goal_id}
            )
            
            # Generate reflection
            await reflection_system.generate_reflection(
                "permanent_failure",
                f"Goal {self._current_goal.goal_id} failed permanently",
                {
                    "goal": self._current_goal.goal_id,
                    "retry_count": self._retry_count
                }
            )
            
            # Update goal status
            self._current_goal.status = GoalStatus.FAILED
            self._retry_count = 0
            
        except Exception as e:
            reflection_system.log_thought(
                "permanent_failure",
                f"Error handling permanent failure: {str(e)}",
                {
                    "goal": self._current_goal.goal_id,
                    "error": str(e)
                }
            )

# Create singleton instance
panion_core = PanionCore() 