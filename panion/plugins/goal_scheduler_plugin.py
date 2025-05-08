"""
Goal Scheduler Plugin
Provides an interface for plugins to interact with the Goal Scheduler.
"""

import logging
from typing import Dict, Any, Optional
from core.base_plugin import BasePlugin
from core.goal_scheduler import goal_scheduler
from core.reflection import reflection_system

class GoalSchedulerPlugin(BasePlugin):
    def __init__(self):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.name = "GoalSchedulerPlugin"
        self.description = "Manages goal scheduling and resource allocation"

    async def execute(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the goal scheduler plugin."""
        try:
            action = request.get('action')
            if not action:
                raise ValueError("No action specified in request")

            reflection_system.log_thought(
                "goal_scheduler_plugin",
                f"Executing action: {action}",
                {"request": request}
            )

            if action == 'schedule_goal':
                return await self._handle_schedule_goal(request)
            elif action == 'update_schedule':
                return await self._handle_update_schedule(request)
            elif action == 'get_schedule':
                return await self._handle_get_schedule(request)
            elif action == 'get_all_schedules':
                return await self._handle_get_all_schedules(request)
            elif action == 'get_resource_usage':
                return await self._handle_get_resource_usage(request)
            else:
                raise ValueError(f"Unknown action: {action}")

        except Exception as e:
            reflection_system.log_thought(
                "goal_scheduler_plugin",
                f"Error executing action: {str(e)}",
                {
                    "action": action,
                    "error": str(e)
                }
            )
            return {
                'success': False,
                'error': str(e)
            }

    async def _handle_schedule_goal(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle goal scheduling."""
        goal_id = request.get('goal_id')
        priority = request.get('priority', 0)
        deadline = request.get('deadline')

        if not goal_id:
            raise ValueError("Missing goal_id")

        schedule = await goal_scheduler.schedule_goal(
            goal_id=goal_id,
            priority=priority,
            deadline=deadline
        )

        return {
            'success': True,
            'schedule': schedule,
            'message': f"Scheduled goal: {goal_id}"
        }

    async def _handle_update_schedule(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle schedule updates."""
        goal_id = request.get('goal_id')
        updates = request.get('updates')

        if not goal_id or not updates:
            raise ValueError("Missing required parameters")

        schedule = await goal_scheduler.update_schedule(
            goal_id=goal_id,
            updates=updates
        )

        return {
            'success': True,
            'schedule': schedule,
            'message': f"Updated schedule for goal: {goal_id}"
        }

    async def _handle_get_schedule(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle schedule retrieval."""
        goal_id = request.get('goal_id')

        if not goal_id:
            raise ValueError("Missing goal_id")

        schedule = await goal_scheduler.get_schedule(goal_id)
        if not schedule:
            raise ValueError(f"Schedule not found for goal: {goal_id}")

        return {
            'success': True,
            'schedule': schedule,
            'message': f"Retrieved schedule for goal: {goal_id}"
        }

    async def _handle_get_all_schedules(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle retrieval of all schedules."""
        schedules = await goal_scheduler.get_all_schedules()

        return {
            'success': True,
            'schedules': schedules,
            'message': "Retrieved all schedules"
        }

    async def _handle_get_resource_usage(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle resource usage retrieval."""
        start_time = request.get('start_time')
        end_time = request.get('end_time')

        if not start_time or not end_time:
            raise ValueError("Missing time parameters")

        usage = await goal_scheduler.get_resource_usage(
            start_time=start_time,
            end_time=end_time
        )

        return {
            'success': True,
            'usage': usage,
            'message': "Retrieved resource usage"
        }

# Create singleton instance
goal_scheduler_plugin = GoalSchedulerPlugin() 