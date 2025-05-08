"""
Data Consistency Manager
Handles data integrity, state synchronization, and plugin data dependencies.
"""

import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime
from pathlib import Path
import json
import yaml
from core.reflection import reflection_system
from core.world_model_manager import world_model_manager
import os

class DataConsistencyManager:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._state_file = Path('data/consistency_state.json')
        self._dependencies = {}
        self._locks = {}
        self._transactions = {}
        self._load_state()

    def _load_state(self) -> None:
        """Load consistency manager state."""
        try:
            if self._state_file.exists():
                with open(self._state_file, 'r') as f:
                    state = json.load(f)
                    self._dependencies = state.get('dependencies', {})
                    self._locks = state.get('locks', {})
                    self._transactions = state.get('transactions', {})
        except Exception as e:
            self.logger.error(f"Error loading consistency state: {e}")
            reflection_system.log_thought(
                "data_consistency",
                f"Error loading consistency state: {str(e)}",
                {"error": str(e)}
            )

    def _save_state(self) -> None:
        """Save consistency manager state."""
        try:
            state = {
                'dependencies': self._dependencies,
                'locks': self._locks,
                'transactions': self._transactions,
                'last_update': datetime.now().isoformat()
            }
            self._state_file.parent.mkdir(exist_ok=True)
            with open(self._state_file, 'w') as f:
                json.dump(state, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving consistency state: {e}")
            reflection_system.log_thought(
                "data_consistency",
                f"Error saving consistency state: {str(e)}",
                {"error": str(e)}
            )

    async def register_dependency(self,
                                plugin: str,
                                data_path: str,
                                dependency_type: str = "read") -> None:
        """Register a data dependency for a plugin."""
        try:
            reflection_system.log_thought(
                "data_consistency",
                f"Registering dependency for {plugin}",
                {
                    "plugin": plugin,
                    "data_path": data_path,
                    "type": dependency_type
                }
            )
            
            if plugin not in self._dependencies:
                self._dependencies[plugin] = []
            
            self._dependencies[plugin].append({
                'path': data_path,
                'type': dependency_type,
                'registered_at': datetime.now().isoformat()
            })
            
            self._save_state()
            
            reflection_system.log_thought(
                "data_consistency",
                f"Registered dependency for {plugin}",
                {"status": "success"}
            )
            
        except Exception as e:
            reflection_system.log_thought(
                "data_consistency",
                f"Error registering dependency: {str(e)}",
                {
                    "plugin": plugin,
                    "error": str(e)
                }
            )
            raise

    async def acquire_lock(self,
                          plugin: str,
                          data_path: str,
                          lock_type: str = "read") -> bool:
        """Acquire a lock on data for a plugin."""
        try:
            reflection_system.log_thought(
                "data_consistency",
                f"Acquiring lock for {plugin}",
                {
                    "plugin": plugin,
                    "data_path": data_path,
                    "type": lock_type
                }
            )
            
            if data_path not in self._locks:
                self._locks[data_path] = []
            
            # Check for conflicting locks
            for lock in self._locks[data_path]:
                if (lock['type'] == 'write' or 
                    (lock['type'] == 'read' and lock_type == 'write')):
                    reflection_system.log_thought(
                        "data_consistency",
                        f"Lock acquisition failed for {plugin}",
                        {"reason": "conflicting lock exists"}
                    )
                    return False
            
            # Add lock
            self._locks[data_path].append({
                'plugin': plugin,
                'type': lock_type,
                'acquired_at': datetime.now().isoformat()
            })
            
            self._save_state()
            
            reflection_system.log_thought(
                "data_consistency",
                f"Acquired lock for {plugin}",
                {"status": "success"}
            )
            
            return True
            
        except Exception as e:
            reflection_system.log_thought(
                "data_consistency",
                f"Error acquiring lock: {str(e)}",
                {
                    "plugin": plugin,
                    "error": str(e)
                }
            )
            raise

    async def release_lock(self,
                          plugin: str,
                          data_path: str) -> None:
        """Release a lock on data for a plugin."""
        try:
            reflection_system.log_thought(
                "data_consistency",
                f"Releasing lock for {plugin}",
                {
                    "plugin": plugin,
                    "data_path": data_path
                }
            )
            
            if data_path in self._locks:
                self._locks[data_path] = [
                    lock for lock in self._locks[data_path]
                    if lock['plugin'] != plugin
                ]
                if not self._locks[data_path]:
                    del self._locks[data_path]
            
            self._save_state()
            
            reflection_system.log_thought(
                "data_consistency",
                f"Released lock for {plugin}",
                {"status": "success"}
            )
            
        except Exception as e:
            reflection_system.log_thought(
                "data_consistency",
                f"Error releasing lock: {str(e)}",
                {
                    "plugin": plugin,
                    "error": str(e)
                }
            )
            raise

    async def start_transaction(self,
                              plugin: str,
                              description: str) -> str:
        """Start a new transaction."""
        try:
            reflection_system.log_thought(
                "data_consistency",
                f"Starting transaction for {plugin}",
                {
                    "plugin": plugin,
                    "description": description
                }
            )
            
            transaction_id = f"{plugin}_{datetime.now().isoformat()}"
            self._transactions[transaction_id] = {
                'plugin': plugin,
                'description': description,
                'started_at': datetime.now().isoformat(),
                'status': 'active',
                'locks': []
            }
            
            self._save_state()
            
            reflection_system.log_thought(
                "data_consistency",
                f"Started transaction {transaction_id}",
                {"status": "success"}
            )
            
            return transaction_id
            
        except Exception as e:
            reflection_system.log_thought(
                "data_consistency",
                f"Error starting transaction: {str(e)}",
                {
                    "plugin": plugin,
                    "error": str(e)
                }
            )
            raise

    async def commit_transaction(self,
                               transaction_id: str) -> None:
        """Commit a transaction."""
        try:
            reflection_system.log_thought(
                "data_consistency",
                f"Committing transaction {transaction_id}",
                {"transaction": transaction_id}
            )
            
            if transaction_id not in self._transactions:
                raise ValueError(f"Transaction {transaction_id} not found")
            
            transaction = self._transactions[transaction_id]
            transaction['status'] = 'committed'
            transaction['committed_at'] = datetime.now().isoformat()
            
            # Release all locks
            for lock in transaction['locks']:
                await self.release_lock(transaction['plugin'], lock['path'])
            
            self._save_state()
            
            reflection_system.log_thought(
                "data_consistency",
                f"Committed transaction {transaction_id}",
                {"status": "success"}
            )
            
        except Exception as e:
            reflection_system.log_thought(
                "data_consistency",
                f"Error committing transaction: {str(e)}",
                {
                    "transaction": transaction_id,
                    "error": str(e)
                }
            )
            raise

    async def rollback_transaction(self,
                                 transaction_id: str) -> None:
        """Rollback a transaction."""
        try:
            reflection_system.log_thought(
                "data_consistency",
                f"Rolling back transaction {transaction_id}",
                {"transaction": transaction_id}
            )
            
            if transaction_id not in self._transactions:
                raise ValueError(f"Transaction {transaction_id} not found")
            
            transaction = self._transactions[transaction_id]
            transaction['status'] = 'rolled_back'
            transaction['rolled_back_at'] = datetime.now().isoformat()
            
            # Release all locks
            for lock in transaction['locks']:
                await self.release_lock(transaction['plugin'], lock['path'])
            
            self._save_state()
            
            reflection_system.log_thought(
                "data_consistency",
                f"Rolled back transaction {transaction_id}",
                {"status": "success"}
            )
            
        except Exception as e:
            reflection_system.log_thought(
                "data_consistency",
                f"Error rolling back transaction: {str(e)}",
                {
                    "transaction": transaction_id,
                    "error": str(e)
                }
            )
            raise

    async def validate_data(self,
                          data_path: str,
                          schema: Dict[str, Any]) -> Dict[str, Any]:
        """Validate data against a schema."""
        try:
            reflection_system.log_thought(
                "data_consistency",
                f"Validating data at {data_path}",
                {
                    "path": data_path,
                    "schema": schema
                }
            )
            
            validation = {
                'valid': True,
                'errors': [],
                'warnings': []
            }
            
            # Load data
            try:
                with open(data_path, 'r') as f:
                    if data_path.endswith('.json'):
                        data = json.load(f)
                    elif data_path.endswith(('.yaml', '.yml')):
                        data = yaml.safe_load(f)
                    else:
                        validation['errors'].append(f"Unsupported file format: {data_path}")
                        validation['valid'] = False
                        return validation
            except Exception as e:
                validation['errors'].append(f"Error loading data: {str(e)}")
                validation['valid'] = False
                return validation
            
            # Validate schema structure
            if not isinstance(schema, dict):
                validation['errors'].append("Schema must be a dictionary")
                validation['valid'] = False
                return validation
            
            # Validate required fields
            required_fields = schema.get('required', [])
            for field in required_fields:
                if field not in data:
                    validation['errors'].append(f"Missing required field: {field}")
                    validation['valid'] = False
            
            # Validate field types
            type_validations = {
                'string': str,
                'integer': int,
                'number': (int, float),
                'boolean': bool,
                'array': list,
                'object': dict
            }
            
            for field, field_schema in schema.get('properties', {}).items():
                if field not in data:
                    continue
                    
                # Type validation
                if 'type' in field_schema:
                    expected_type = field_schema['type']
                    if expected_type in type_validations:
                        if not isinstance(data[field], type_validations[expected_type]):
                            validation['errors'].append(
                                f"Field {field} must be of type {expected_type}"
                            )
                            validation['valid'] = False
                
                # Enum validation
                if 'enum' in field_schema:
                    if data[field] not in field_schema['enum']:
                        validation['errors'].append(
                            f"Field {field} must be one of {field_schema['enum']}"
                        )
                        validation['valid'] = False
                
                # Range validation for numbers
                if isinstance(data[field], (int, float)):
                    if 'minimum' in field_schema and data[field] < field_schema['minimum']:
                        validation['errors'].append(
                            f"Field {field} must be >= {field_schema['minimum']}"
                        )
                        validation['valid'] = False
                    if 'maximum' in field_schema and data[field] > field_schema['maximum']:
                        validation['errors'].append(
                            f"Field {field} must be <= {field_schema['maximum']}"
                        )
                        validation['valid'] = False
                
                # String length validation
                if isinstance(data[field], str):
                    if 'minLength' in field_schema and len(data[field]) < field_schema['minLength']:
                        validation['errors'].append(
                            f"Field {field} must be at least {field_schema['minLength']} characters"
                        )
                        validation['valid'] = False
                    if 'maxLength' in field_schema and len(data[field]) > field_schema['maxLength']:
                        validation['errors'].append(
                            f"Field {field} must be at most {field_schema['maxLength']} characters"
                        )
                        validation['valid'] = False
                
                # Array validation
                if isinstance(data[field], list):
                    if 'minItems' in field_schema and len(data[field]) < field_schema['minItems']:
                        validation['errors'].append(
                            f"Field {field} must have at least {field_schema['minItems']} items"
                        )
                        validation['valid'] = False
                    if 'maxItems' in field_schema and len(data[field]) > field_schema['maxItems']:
                        validation['errors'].append(
                            f"Field {field} must have at most {field_schema['maxItems']} items"
                        )
                        validation['valid'] = False
                    
                    # Validate array items
                    if 'items' in field_schema:
                        for i, item in enumerate(data[field]):
                            if not isinstance(item, type_validations.get(field_schema['items'].get('type', 'string'), str)):
                                validation['errors'].append(
                                    f"Item {i} in field {field} must be of type {field_schema['items']['type']}"
                                )
                                validation['valid'] = False
            
            reflection_system.log_thought(
                "data_consistency",
                f"Validated data at {data_path}",
                {"validation": validation}
            )
            
            return validation
            
        except Exception as e:
            reflection_system.log_thought(
                "data_consistency",
                f"Error validating data: {str(e)}",
                {
                    "path": data_path,
                    "error": str(e)
                }
            )
            raise

    async def sync_state(self) -> Dict[str, Any]:
        """Synchronize state across the system.
        
        This method coordinates the synchronization of state across all system components,
        ensuring data consistency and handling any conflicts or errors that arise during
        the synchronization process.
        
        Returns:
            Dict[str, Any]: Synchronization results including status, synced components,
                           and any errors encountered
        """
        try:
            reflection_system.log_thought(
                "data_consistency",
                "Starting state synchronization",
                {"stage": "begin"}
            )
            
            sync_result = {
                'status': 'success',
                'synced_components': [],
                'errors': [],
                'warnings': [],
                'details': {}
            }
            
            # 1. Sync world model state
            try:
                world_state = await world_model_manager.analyze_state()
                await world_model_manager.validate_state()
                sync_result['synced_components'].append('world_model')
                sync_result['details']['world_model'] = world_state
            except Exception as e:
                sync_result['status'] = 'partial'
                sync_result['errors'].append(f"World model sync error: {str(e)}")
            
            # 2. Sync plugin states
            try:
                plugin_states = await self._sync_plugin_states()
                sync_result['synced_components'].extend(plugin_states['synced'])
                sync_result['errors'].extend(plugin_states['errors'])
                sync_result['details']['plugins'] = plugin_states['details']
            except Exception as e:
                sync_result['status'] = 'partial'
                sync_result['errors'].append(f"Plugin sync error: {str(e)}")
            
            # 3. Sync data dependencies
            try:
                dep_states = await self._sync_dependencies()
                sync_result['synced_components'].extend(dep_states['synced'])
                sync_result['errors'].extend(dep_states['errors'])
                sync_result['details']['dependencies'] = dep_states['details']
            except Exception as e:
                sync_result['status'] = 'partial'
                sync_result['errors'].append(f"Dependency sync error: {str(e)}")
            
            # 4. Sync active transactions
            try:
                tx_states = await self._sync_transactions()
                sync_result['synced_components'].extend(tx_states['synced'])
                sync_result['errors'].extend(tx_states['errors'])
                sync_result['details']['transactions'] = tx_states['details']
            except Exception as e:
                sync_result['status'] = 'partial'
                sync_result['errors'].append(f"Transaction sync error: {str(e)}")
            
            # 5. Validate overall consistency
            try:
                consistency_check = await self._validate_consistency()
                if not consistency_check['valid']:
                    sync_result['status'] = 'inconsistent'
                    sync_result['errors'].extend(consistency_check['errors'])
                    sync_result['warnings'].extend(consistency_check['warnings'])
                sync_result['details']['consistency'] = consistency_check
            except Exception as e:
                sync_result['status'] = 'partial'
                sync_result['errors'].append(f"Consistency check error: {str(e)}")
            
            # Update final status
            if not sync_result['errors']:
                sync_result['status'] = 'success'
            elif sync_result['status'] != 'inconsistent':
                sync_result['status'] = 'partial'
            
            reflection_system.log_thought(
                "data_consistency",
                "Completed state synchronization",
                {"result": sync_result}
            )
            
            return sync_result
            
        except Exception as e:
            reflection_system.log_thought(
                "data_consistency",
                f"Error synchronizing state: {str(e)}",
                {"error": str(e)}
            )
            raise

    async def _sync_plugin_states(self) -> Dict[str, Any]:
        """Synchronize plugin states.
        
        Returns:
            Dict[str, Any]: Plugin synchronization results
        """
        result = {
            'synced': [],
            'errors': [],
            'details': {}
        }
        
        try:
            # Get all registered plugins
            plugins = list(self._dependencies.keys())
            
            for plugin in plugins:
                try:
                    # Check plugin dependencies
                    deps = self._dependencies.get(plugin, [])
                    dep_states = []
                    
                    for dep in deps:
                        try:
                            # Validate data at dependency path
                            if dep['type'] == 'read':
                                # Check if data exists and is accessible
                                path = Path(dep['path'])
                                if not path.exists():
                                    dep_states.append({
                                        'path': dep['path'],
                                        'status': 'missing',
                                        'error': 'Data file not found'
                                    })
                                else:
                                    dep_states.append({
                                        'path': dep['path'],
                                        'status': 'valid'
                                    })
                            elif dep['type'] == 'write':
                                # Check if directory exists and is writable
                                path = Path(dep['path']).parent
                                if not path.exists():
                                    path.mkdir(parents=True, exist_ok=True)
                                if not os.access(path, os.W_OK):
                                    dep_states.append({
                                        'path': dep['path'],
                                        'status': 'error',
                                        'error': 'Directory not writable'
                                    })
                                else:
                                    dep_states.append({
                                        'path': dep['path'],
                                        'status': 'valid'
                                    })
                        except Exception as e:
                            dep_states.append({
                                'path': dep['path'],
                                'status': 'error',
                                'error': str(e)
                            })
                    
                    result['details'][plugin] = {
                        'dependencies': dep_states,
                        'status': 'valid' if all(d['status'] == 'valid' for d in dep_states) else 'error'
                    }
                    
                    if result['details'][plugin]['status'] == 'valid':
                        result['synced'].append(plugin)
                    else:
                        result['errors'].append(f"Plugin {plugin} has invalid dependencies")
                        
                except Exception as e:
                    result['errors'].append(f"Error syncing plugin {plugin}: {str(e)}")
                    
        except Exception as e:
            result['errors'].append(f"Error in plugin sync: {str(e)}")
            
        return result

    async def _sync_dependencies(self) -> Dict[str, Any]:
        """Synchronize data dependencies.
        
        Returns:
            Dict[str, Any]: Dependency synchronization results
        """
        result = {
            'synced': [],
            'errors': [],
            'details': {}
        }
        
        try:
            # Track all data paths
            all_paths = set()
            for deps in self._dependencies.values():
                all_paths.update(dep['path'] for dep in deps)
            
            # Check each path
            for path in all_paths:
                try:
                    path_obj = Path(path)
                    
                    # Check if path exists
                    if not path_obj.exists():
                        result['details'][path] = {
                            'status': 'missing',
                            'error': 'Path does not exist'
                        }
                        result['errors'].append(f"Data path {path} does not exist")
                        continue
                    
                    # Check file permissions
                    if not os.access(path_obj, os.R_OK):
                        result['details'][path] = {
                            'status': 'error',
                            'error': 'File not readable'
                        }
                        result['errors'].append(f"Data path {path} is not readable")
                        continue
                    
                    # Check if file is locked
                    if path in self._locks:
                        result['details'][path] = {
                            'status': 'locked',
                            'locks': self._locks[path]
                        }
                        result['warnings'].append(f"Data path {path} is locked")
                    else:
                        result['details'][path] = {
                            'status': 'valid'
                        }
                        result['synced'].append(path)
                        
                except Exception as e:
                    result['details'][path] = {
                        'status': 'error',
                        'error': str(e)
                    }
                    result['errors'].append(f"Error checking path {path}: {str(e)}")
                    
        except Exception as e:
            result['errors'].append(f"Error in dependency sync: {str(e)}")
            
        return result

    async def _sync_transactions(self) -> Dict[str, Any]:
        """Synchronize active transactions.
        
        Returns:
            Dict[str, Any]: Transaction synchronization results
        """
        result = {
            'synced': [],
            'errors': [],
            'details': {}
        }
        
        try:
            # Check each transaction
            for tx_id, tx in self._transactions.items():
                try:
                    # Check transaction state
                    if tx['status'] == 'active':
                        # Check if transaction has timed out
                        created_at = datetime.fromisoformat(tx['started_at'])
                        if (datetime.now() - created_at).total_seconds() > 3600:  # 1 hour timeout
                            result['details'][tx_id] = {
                                'status': 'timeout',
                                'error': 'Transaction timed out'
                            }
                            result['errors'].append(f"Transaction {tx_id} timed out")
                            continue
                        
                        # Check if all locks are still valid
                        locks_valid = True
                        for lock in tx.get('locks', []):
                            if lock['path'] not in self._locks:
                                locks_valid = False
                                break
                            if not any(l['plugin'] == tx['plugin'] for l in self._locks[lock['path']]):
                                locks_valid = False
                                break
                                
                        if not locks_valid:
                            result['details'][tx_id] = {
                                'status': 'error',
                                'error': 'Transaction locks invalid'
                            }
                            result['errors'].append(f"Transaction {tx_id} has invalid locks")
                            continue
                            
                        result['details'][tx_id] = {
                            'status': 'valid',
                            'age': (datetime.now() - created_at).total_seconds()
                        }
                        result['synced'].append(tx_id)
                    else:
                        result['details'][tx_id] = {
                            'status': tx['status']
                        }
                        
                except Exception as e:
                    result['details'][tx_id] = {
                        'status': 'error',
                        'error': str(e)
                    }
                    result['errors'].append(f"Error checking transaction {tx_id}: {str(e)}")
                    
        except Exception as e:
            result['errors'].append(f"Error in transaction sync: {str(e)}")
            
        return result

    async def _validate_consistency(self) -> Dict[str, Any]:
        """Validate overall system consistency.
        
        Returns:
            Dict[str, Any]: Consistency validation results
        """
        result = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        try:
            # 1. Check for orphaned locks
            for path, locks in self._locks.items():
                for lock in locks:
                    if lock['plugin'] not in self._dependencies:
                        result['warnings'].append(
                            f"Orphaned lock found: {path} locked by {lock['plugin']}"
                        )
            
            # 2. Check for circular dependencies
            for plugin, deps in self._dependencies.items():
                visited = set()
                if await self._has_circular_dependency(plugin, visited):
                    result['errors'].append(
                        f"Circular dependency detected for plugin {plugin}"
                    )
                    result['valid'] = False
            
            # 3. Check for conflicting locks
            for path, locks in self._locks.items():
                write_locks = [l for l in locks if l['type'] == 'write']
                if len(write_locks) > 1:
                    result['errors'].append(
                        f"Multiple write locks found for {path}"
                    )
                    result['valid'] = False
                    
                if write_locks and any(l['type'] == 'read' for l in locks):
                    result['errors'].append(
                        f"Read and write locks conflict for {path}"
                    )
                    result['valid'] = False
            
            # 4. Check for stale transactions
            for tx_id, tx in self._transactions.items():
                if tx['status'] == 'active':
                    created_at = datetime.fromisoformat(tx['started_at'])
                    if (datetime.now() - created_at).total_seconds() > 3600:
                        result['warnings'].append(
                            f"Stale transaction found: {tx_id}"
                        )
            
        except Exception as e:
            result['valid'] = False
            result['errors'].append(f"Error in consistency check: {str(e)}")
            
        return result

    async def _has_circular_dependency(self, plugin: str, visited: Set[str]) -> bool:
        """Check for circular dependencies starting from a plugin.
        
        Args:
            plugin: Plugin to check
            visited: Set of visited plugins
            
        Returns:
            bool: True if circular dependency found
        """
        if plugin in visited:
            return True
            
        visited.add(plugin)
        
        for dep in self._dependencies.get(plugin, []):
            if dep['type'] == 'depends_on':
                if await self._has_circular_dependency(dep['path'], visited):
                    return True
                    
        visited.remove(plugin)
        return False

# Create singleton instance
data_consistency_manager = DataConsistencyManager() 