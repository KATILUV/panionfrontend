"""
Data Consistency Manager Plugin
Manages data consistency and validation across the system.
"""

import logging
from typing import Dict, Any, Optional, List, Set
from datetime import datetime
import threading
import queue
import time

from core.plugin.base import BasePlugin, PluginError
from core.plugin.types import PluginMetadata, PluginState, PluginDependencies

class Plugin(BasePlugin):
    """Plugin for managing data consistency and validation."""
    
    __version__ = "1.0.0"
    __dependencies__ = PluginDependencies(
        packages={}
    )
    
    def __init__(self, plugin_id: str, name: str, version: str, dependencies: Dict[str, str] = None):
        super().__init__(plugin_id, name, version, dependencies)
        self._validation_queue = queue.Queue()
        self._validation_thread = None
        self._is_validating = False
        self._validation_rules = {}
        self._validation_results = {}
        self._internal_state = {
            'validation_count': 0,
            'error_count': 0,
            'last_validation': None,
            'queue_size': 0,
            'is_validating': False
        }
        
    async def _initialize(self) -> None:
        """Initialize the data consistency manager."""
        try:
            # Initialize validation rules
            self._validation_rules = {}
            self._validation_results = {}
            
            self.logger.info("Data consistency manager initialized")
            
        except Exception as e:
            self.logger.error(f"Error initializing data consistency manager: {e}")
            raise PluginError(f"Initialization failed: {e}")
            
    async def _start(self) -> None:
        """Start the data consistency manager."""
        try:
            self._is_validating = True
            self._validation_thread = threading.Thread(target=self._validation_worker)
            self._validation_thread.daemon = True
            self._validation_thread.start()
            
            self.logger.info("Data consistency manager started")
            
        except Exception as e:
            self.logger.error(f"Error starting data consistency manager: {e}")
            raise PluginError(f"Start failed: {e}")
            
    async def _stop(self) -> None:
        """Stop the data consistency manager."""
        try:
            self._is_validating = False
            if self._validation_thread:
                self._validation_thread.join(timeout=5.0)
                
            self.logger.info("Data consistency manager stopped")
            
        except Exception as e:
            self.logger.error(f"Error stopping data consistency manager: {e}")
            raise PluginError(f"Stop failed: {e}")
            
    async def _execute(self, command: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a data consistency operation."""
        try:
            if command == "add_rule":
                return self._add_validation_rule(**args)
            elif command == "validate":
                return self._validate_data(**args)
            elif command == "get_status":
                return self._get_validation_status()
            elif command == "get_results":
                return self._get_validation_results(**args)
            else:
                raise PluginError(f"Unknown operation: {command}")
                
        except Exception as e:
            self.logger.error(f"Error executing operation {command}: {e}")
            raise PluginError(f"Operation failed: {e}")
            
    def _add_validation_rule(self, rule_id: str, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Add a validation rule."""
        try:
            self._validation_rules[rule_id] = rule
            
            # Update internal state
            self._internal_state['rule_count'] = len(self._validation_rules)
            
            return {
                'rule_id': rule_id,
                'status': 'added'
            }
            
        except Exception as e:
            raise PluginError(f"Failed to add validation rule: {e}")
            
    def _validate_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Queue data for validation."""
        try:
            # Add to validation queue
            self._validation_queue.put(data)
            
            # Update internal state
            self._internal_state['queue_size'] = self._validation_queue.qsize()
            
            return {
                'status': 'queued',
                'queue_size': self._validation_queue.qsize()
            }
            
        except Exception as e:
            raise PluginError(f"Failed to queue data for validation: {e}")
            
    def _get_validation_status(self) -> Dict[str, Any]:
        """Get the current validation status."""
        return {
            'is_validating': self._is_validating,
            'queue_size': self._validation_queue.qsize(),
            'validation_count': self._internal_state['validation_count'],
            'error_count': self._internal_state['error_count'],
            'last_validation': self._internal_state['last_validation']
        }
        
    def _get_validation_results(self, data_id: Optional[str] = None) -> Dict[str, Any]:
        """Get validation results."""
        try:
            if data_id:
                if data_id not in self._validation_results:
                    raise PluginError(f"No results found for data ID: {data_id}")
                return self._validation_results[data_id]
                
            return self._validation_results
            
        except Exception as e:
            raise PluginError(f"Failed to get validation results: {e}")
            
    def _validation_worker(self) -> None:
        """Worker thread for processing validation queue."""
        while self._is_validating:
            try:
                # Get data from queue
                data = self._validation_queue.get(timeout=1.0)
                
                # Validate data
                results = self._apply_validation_rules(data)
                
                # Store results
                data_id = data.get('id', str(time.time()))
                self._validation_results[data_id] = results
                
                # Update internal state
                self._internal_state['validation_count'] += 1
                if not results['is_valid']:
                    self._internal_state['error_count'] += 1
                self._internal_state['last_validation'] = datetime.now().isoformat()
                self._internal_state['queue_size'] = self._validation_queue.qsize()
                
                # Mark task as done
                self._validation_queue.task_done()
                
            except queue.Empty:
                continue
            except Exception as e:
                self.logger.error(f"Error in validation worker: {e}")
                continue
                
    def _apply_validation_rules(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply validation rules to data."""
        results = {
            'is_valid': True,
            'errors': [],
            'timestamp': datetime.now().isoformat()
        }
        
        for rule_id, rule in self._validation_rules.items():
            try:
                if not self._check_rule(rule, data):
                    results['is_valid'] = False
                    results['errors'].append({
                        'rule_id': rule_id,
                        'message': rule.get('error_message', 'Validation failed')
                    })
            except Exception as e:
                results['is_valid'] = False
                results['errors'].append({
                    'rule_id': rule_id,
                    'message': f"Rule execution error: {str(e)}"
                })
                
        return results
        
    def _check_rule(self, rule: Dict[str, Any], data: Dict[str, Any]) -> bool:
        """Check if data satisfies a validation rule."""
        try:
            field = rule.get('field')
            condition = rule.get('condition')
            value = rule.get('value')
            
            if not all([field, condition]):
                return False
                
            data_value = data.get(field)
            
            if condition == 'required':
                return data_value is not None
            elif condition == 'equals':
                return data_value == value
            elif condition == 'not_equals':
                return data_value != value
            elif condition == 'greater_than':
                return data_value > value
            elif condition == 'less_than':
                return data_value < value
            elif condition == 'contains':
                return value in data_value
            elif condition == 'not_contains':
                return value not in data_value
            else:
                return False
                
        except Exception:
            return False
            
    def cleanup(self) -> None:
        """Clean up plugin resources."""
        try:
            self._stop()
            self._validation_rules.clear()
            self._validation_results.clear()
            super().cleanup()
        except Exception as e:
            self.logger.error(f"Error during cleanup: {e}")
            raise PluginError(f"Cleanup failed: {e}") 