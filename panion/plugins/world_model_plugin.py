"""
World Model Plugin
Helps Panion understand and interact with its environment.
"""

import logging
from typing import Dict, Any, List, Optional
from core.base_plugin import BasePlugin
from core.reflection import reflection_system
from core.world_model_manager import world_model_manager

class WorldModelPlugin(BasePlugin):
    def __init__(self):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self._internal_state = {}

    async def execute(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the world model plugin."""
        try:
            reflection_system.log_thought(
                "world_model_plugin",
                "Starting world model plugin execution",
                {"parameters": parameters}
            )
            
            action = parameters.get('action')
            if not action:
                raise ValueError("No action specified")
            
            result = None
            
            if action == 'update_knowledge':
                result = await self._handle_update_knowledge(parameters)
            elif action == 'add_relationship':
                result = await self._handle_add_relationship(parameters)
            elif action == 'add_constraint':
                result = await self._handle_add_constraint(parameters)
            elif action == 'add_observation':
                result = await self._handle_add_observation(parameters)
            elif action == 'query_knowledge':
                result = await self._handle_query_knowledge(parameters)
            elif action == 'analyze_state':
                result = await self._handle_analyze_state(parameters)
            elif action == 'validate_state':
                result = await self._handle_validate_state(parameters)
            else:
                raise ValueError(f"Unknown action: {action}")
            
            reflection_system.log_thought(
                "world_model_plugin",
                "Completed world model plugin execution",
                {"action": action, "result": result}
            )
            
            return {
                "status": "success",
                "result": result
            }
            
        except Exception as e:
            reflection_system.log_thought(
                "world_model_plugin",
                f"Error in world model plugin: {str(e)}",
                {"error": str(e)}
            )
            return {
                "status": "failure",
                "error": str(e)
            }

    async def _handle_update_knowledge(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle knowledge update request."""
        entity = parameters.get('entity')
        attributes = parameters.get('attributes', {})
        source = parameters.get('source', 'system')
        
        if not entity:
            raise ValueError("No entity specified")
        
        await world_model_manager.update_knowledge(entity, attributes, source)
        return {"message": f"Updated knowledge for {entity}"}

    async def _handle_add_relationship(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle relationship addition request."""
        source = parameters.get('source')
        target = parameters.get('target')
        relationship_type = parameters.get('type')
        attributes = parameters.get('attributes')
        
        if not all([source, target, relationship_type]):
            raise ValueError("Missing required parameters")
        
        await world_model_manager.add_relationship(
            source, target, relationship_type, attributes
        )
        return {
            "message": f"Added relationship {source} -> {target}"
        }

    async def _handle_add_constraint(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle constraint addition request."""
        constraint = parameters.get('constraint')
        if not constraint:
            raise ValueError("No constraint specified")
        
        await world_model_manager.add_constraint(constraint)
        return {"message": f"Added constraint: {constraint}"}

    async def _handle_add_observation(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle observation addition request."""
        observation = parameters.get('observation')
        context = parameters.get('context')
        
        if not observation:
            raise ValueError("No observation specified")
        
        await world_model_manager.add_observation(observation, context)
        return {"message": "Added observation"}

    async def _handle_query_knowledge(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle knowledge query request."""
        entity = parameters.get('entity')
        relationship_type = parameters.get('relationship_type')
        attributes = parameters.get('attributes')
        
        results = await world_model_manager.query_knowledge(
            entity, relationship_type, attributes
        )
        return {"results": results}

    async def _handle_analyze_state(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle state analysis request."""
        analysis = await world_model_manager.analyze_state()
        return {"analysis": analysis}

    async def _handle_validate_state(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle state validation request."""
        validation = await world_model_manager.validate_state()
        return {"validation": validation}

# Create singleton instance
world_model_plugin = WorldModelPlugin() 