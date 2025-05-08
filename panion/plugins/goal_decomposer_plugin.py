"""
Goal Decomposer Plugin
Provides an interface for plugins to interact with the Goal Decomposer.
"""

import logging
from typing import Dict, Any, Optional
from core.base_plugin import BasePlugin
from core.goal_decomposer import goal_decomposer
from core.reflection import reflection_system

class GoalDecomposerPlugin(BasePlugin):
    def __init__(self):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.name = "GoalDecomposerPlugin"
        self.description = "Manages goal decomposition and planning"

    async def execute(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the goal decomposer plugin."""
        try:
            action = request.get('action')
            if not action:
                raise ValueError("No action specified in request")

            reflection_system.log_thought(
                "goal_decomposer_plugin",
                f"Executing action: {action}",
                {"request": request}
            )

            if action == 'decompose_goal':
                return await self._handle_decompose_goal(request)
            elif action == 'update_plan':
                return await self._handle_update_plan(request)
            elif action == 'validate_plan':
                return await self._handle_validate_plan(request)
            elif action == 'get_plan':
                return await self._handle_get_plan(request)
            elif action == 'get_all_plans':
                return await self._handle_get_all_plans(request)
            else:
                raise ValueError(f"Unknown action: {action}")

        except Exception as e:
            reflection_system.log_thought(
                "goal_decomposer_plugin",
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

    async def _handle_decompose_goal(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle goal decomposition."""
        goal_id = request.get('goal_id')
        description = request.get('description')
        context = request.get('context')

        if not goal_id or not description:
            raise ValueError("Missing required parameters")

        plan = await goal_decomposer.decompose_goal(
            goal_id=goal_id,
            goal_description=description,
            context=context
        )

        return {
            'success': True,
            'plan': plan,
            'message': f"Decomposed goal: {goal_id}"
        }

    async def _handle_update_plan(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle plan updates."""
        goal_id = request.get('goal_id')
        updates = request.get('updates')

        if not goal_id or not updates:
            raise ValueError("Missing required parameters")

        plan = await goal_decomposer.update_plan(
            goal_id=goal_id,
            updates=updates
        )

        return {
            'success': True,
            'plan': plan,
            'message': f"Updated plan for goal: {goal_id}"
        }

    async def _handle_validate_plan(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle plan validation."""
        goal_id = request.get('goal_id')

        if not goal_id:
            raise ValueError("Missing goal_id")

        validation = await goal_decomposer.validate_plan(
            goal_id=goal_id
        )

        return {
            'success': True,
            'validation': validation,
            'message': f"Validated plan for goal: {goal_id}"
        }

    async def _handle_get_plan(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle plan retrieval."""
        goal_id = request.get('goal_id')

        if not goal_id:
            raise ValueError("Missing goal_id")

        plan = goal_decomposer.get_plan(goal_id)
        if not plan:
            raise ValueError(f"Plan not found for goal: {goal_id}")

        return {
            'success': True,
            'plan': plan,
            'message': f"Retrieved plan for goal: {goal_id}"
        }

    async def _handle_get_all_plans(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle retrieval of all plans."""
        plans = goal_decomposer.get_all_plans()

        return {
            'success': True,
            'plans': plans,
            'message': "Retrieved all plans"
        }

# Create singleton instance
goal_decomposer_plugin = GoalDecomposerPlugin() 