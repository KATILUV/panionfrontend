"""
Data Consistency Plugin
Provides an interface for plugins to interact with the Data Consistency Manager.
"""

import logging
from typing import Dict, Any, Optional
from core.base_plugin import BasePlugin
from core.data_consistency_manager import data_consistency_manager
from core.reflection import reflection_system

class DataConsistencyPlugin(BasePlugin):
    def __init__(self):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.name = "DataConsistencyPlugin"
        self.description = "Manages data consistency and synchronization across the system"

    async def execute(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the data consistency plugin."""
        try:
            action = request.get('action')
            if not action:
                raise ValueError("No action specified in request")

            reflection_system.log_thought(
                "data_consistency_plugin",
                f"Executing action: {action}",
                {"request": request}
            )

            if action == 'register_dependency':
                return await self._handle_register_dependency(request)
            elif action == 'acquire_lock':
                return await self._handle_acquire_lock(request)
            elif action == 'release_lock':
                return await self._handle_release_lock(request)
            elif action == 'start_transaction':
                return await self._handle_start_transaction(request)
            elif action == 'commit_transaction':
                return await self._handle_commit_transaction(request)
            elif action == 'rollback_transaction':
                return await self._handle_rollback_transaction(request)
            elif action == 'validate_data':
                return await self._handle_validate_data(request)
            elif action == 'sync_state':
                return await self._handle_sync_state(request)
            else:
                raise ValueError(f"Unknown action: {action}")

        except Exception as e:
            reflection_system.log_thought(
                "data_consistency_plugin",
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

    async def _handle_register_dependency(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle dependency registration."""
        plugin = request.get('plugin')
        data_path = request.get('data_path')
        dependency_type = request.get('dependency_type', 'read')

        if not plugin or not data_path:
            raise ValueError("Missing required parameters")

        await data_consistency_manager.register_dependency(
            plugin=plugin,
            data_path=data_path,
            dependency_type=dependency_type
        )

        return {
            'success': True,
            'message': f"Registered {dependency_type} dependency for {plugin}"
        }

    async def _handle_acquire_lock(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle lock acquisition."""
        plugin = request.get('plugin')
        data_path = request.get('data_path')
        lock_type = request.get('lock_type', 'read')

        if not plugin or not data_path:
            raise ValueError("Missing required parameters")

        success = await data_consistency_manager.acquire_lock(
            plugin=plugin,
            data_path=data_path,
            lock_type=lock_type
        )

        return {
            'success': success,
            'message': f"{'Acquired' if success else 'Failed to acquire'} {lock_type} lock for {plugin}"
        }

    async def _handle_release_lock(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle lock release."""
        plugin = request.get('plugin')
        data_path = request.get('data_path')

        if not plugin or not data_path:
            raise ValueError("Missing required parameters")

        await data_consistency_manager.release_lock(
            plugin=plugin,
            data_path=data_path
        )

        return {
            'success': True,
            'message': f"Released lock for {plugin}"
        }

    async def _handle_start_transaction(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle transaction start."""
        plugin = request.get('plugin')
        description = request.get('description', '')

        if not plugin:
            raise ValueError("Missing required parameters")

        transaction_id = await data_consistency_manager.start_transaction(
            plugin=plugin,
            description=description
        )

        return {
            'success': True,
            'transaction_id': transaction_id,
            'message': f"Started transaction for {plugin}"
        }

    async def _handle_commit_transaction(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle transaction commit."""
        transaction_id = request.get('transaction_id')

        if not transaction_id:
            raise ValueError("Missing transaction_id")

        await data_consistency_manager.commit_transaction(
            transaction_id=transaction_id
        )

        return {
            'success': True,
            'message': f"Committed transaction {transaction_id}"
        }

    async def _handle_rollback_transaction(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle transaction rollback."""
        transaction_id = request.get('transaction_id')

        if not transaction_id:
            raise ValueError("Missing transaction_id")

        await data_consistency_manager.rollback_transaction(
            transaction_id=transaction_id
        )

        return {
            'success': True,
            'message': f"Rolled back transaction {transaction_id}"
        }

    async def _handle_validate_data(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle data validation."""
        data_path = request.get('data_path')
        schema = request.get('schema')

        if not data_path or not schema:
            raise ValueError("Missing required parameters")

        validation = await data_consistency_manager.validate_data(
            data_path=data_path,
            schema=schema
        )

        return {
            'success': True,
            'validation': validation
        }

    async def _handle_sync_state(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle state synchronization."""
        sync_result = await data_consistency_manager.sync_state()

        return {
            'success': True,
            'sync_result': sync_result
        }

# Create singleton instance
data_consistency_plugin = DataConsistencyPlugin() 