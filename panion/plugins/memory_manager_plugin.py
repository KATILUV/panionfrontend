"""
Memory Manager Plugin
Provides an interface for plugins to interact with the Memory Manager.
"""

import logging
from typing import Dict, Any, Optional
from core.base_plugin import BasePlugin
from core.memory_manager import memory_manager
from core.reflection import reflection_system

class MemoryManagerPlugin(BasePlugin):
    def __init__(self):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.name = "MemoryManagerPlugin"
        self.description = "Manages semantic memory and memory retrieval"

    async def execute(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the memory manager plugin."""
        try:
            action = request.get('action')
            if not action:
                raise ValueError("No action specified in request")

            reflection_system.log_thought(
                "memory_manager_plugin",
                f"Executing action: {action}",
                {"request": request}
            )

            if action == 'store_memory':
                return await self._handle_store_memory(request)
            elif action == 'search_memories':
                return await self._handle_search_memories(request)
            elif action == 'get_memory_chain':
                return await self._handle_get_memory_chain(request)
            elif action == 'update_memory_importance':
                return await self._handle_update_memory_importance(request)
            elif action == 'get_memory_stats':
                return await self._handle_get_memory_stats(request)
            else:
                raise ValueError(f"Unknown action: {action}")

        except Exception as e:
            reflection_system.log_thought(
                "memory_manager_plugin",
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

    async def _handle_store_memory(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle memory storage."""
        content = request.get('content')
        metadata = request.get('metadata')
        category = request.get('category', 'general')
        importance = request.get('importance', 0.5)

        if not content:
            raise ValueError("Missing content")

        memory_id = await memory_manager.store_memory(
            content=content,
            metadata=metadata,
            category=category,
            importance=importance
        )

        return {
            'success': True,
            'memory_id': memory_id,
            'message': f"Stored memory: {memory_id}"
        }

    async def _handle_search_memories(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle memory search."""
        query = request.get('query')
        limit = request.get('limit', 5)
        category = request.get('category')
        min_importance = request.get('min_importance', 0.0)

        if not query:
            raise ValueError("Missing query")

        results = await memory_manager.search_memories(
            query=query,
            limit=limit,
            category=category,
            min_importance=min_importance
        )

        return {
            'success': True,
            'results': results,
            'message': f"Found {len(results)} memories"
        }

    async def _handle_get_memory_chain(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle memory chain retrieval."""
        memory_id = request.get('memory_id')

        if not memory_id:
            raise ValueError("Missing memory_id")

        chain = await memory_manager.get_memory_chain(memory_id)

        return {
            'success': True,
            'chain': chain,
            'message': f"Retrieved memory chain with {len(chain)} memories"
        }

    async def _handle_update_memory_importance(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle memory importance updates."""
        memory_id = request.get('memory_id')
        importance = request.get('importance')

        if not memory_id or importance is None:
            raise ValueError("Missing required parameters")

        memory = await memory_manager.update_memory_importance(
            memory_id=memory_id,
            importance=importance
        )

        return {
            'success': True,
            'memory': memory,
            'message': f"Updated memory importance: {memory_id}"
        }

    async def _handle_get_memory_stats(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle memory statistics retrieval."""
        stats = await memory_manager.get_memory_stats()

        return {
            'success': True,
            'stats': stats,
            'message': "Retrieved memory statistics"
        }

# Create singleton instance
memory_manager_plugin = MemoryManagerPlugin() 