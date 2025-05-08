"""
Memory Cleanup Plugin
Manages cleanup and maintenance of system memory.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import psutil
import gc
import os
from dataclasses import dataclass
from enum import Enum

from core.plugin.base import BasePlugin
from core.plugin.manager import plugin_manager
from core.panion_memory import memory_manager, MemoryCategory
from core.shared_state import ComponentState

class ActionStatus(Enum):
    """Status of memory cleanup actions."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class MemoryAction:
    """Represents a memory cleanup action."""
    id: str
    type: str
    status: ActionStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    memory_freed: int = 0  # in bytes
    error: Optional[str] = None
    details: Dict[str, Any] = None

class MemoryCleanup(BasePlugin):
    def __init__(self):
        super().__init__(
            name="MemoryCleanup",
            version="1.0.0",
            description="Manages cleanup and maintenance of system memory",
            author="Panion Team"
        )
        self.logger = logging.getLogger(__name__)
        self._actions: Dict[str, MemoryAction] = {}
        self._last_cleanup = None
        self._memory_threshold = 0.85  # 85% memory usage threshold
        self._cleanup_interval = 3600  # 1 hour in seconds

    async def cleanup(self) -> Dict[str, Any]:
        """Perform memory cleanup operations.
        
        Returns:
            Dict[str, Any]: Results of cleanup operation
        """
        try:
            results = {
                'memory_freed': 0,
                'actions_taken': [],
                'errors': []
            }
            
            # Check if cleanup is needed
            if not self._should_cleanup():
                return {'status': 'skipped', 'reason': 'Memory usage below threshold'}
            
            # Run garbage collection
            gc.collect()
            
            # Clear memory cache
            memory_freed = await self._clear_memory_cache()
            results['memory_freed'] += memory_freed
            results['actions_taken'].append('cache_clear')
            
            # Clean up temporary files
            temp_files_cleared = await self._cleanup_temp_files()
            results['actions_taken'].append('temp_files_cleanup')
            
            # Update last cleanup time
            self._last_cleanup = datetime.now()
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error during cleanup: {str(e)}")
            return {'status': 'error', 'error': str(e)}

    async def maintenance(self) -> Dict[str, Any]:
        """Perform memory maintenance operations.
        
        Returns:
            Dict[str, Any]: Results of maintenance operation
        """
        try:
            results = {
                'memory_usage': self._get_memory_usage(),
                'recommendations': await self.get_recommendations(),
                'actions_taken': []
            }
            
            # Perform routine maintenance
            if results['memory_usage'] > self._memory_threshold:
                cleanup_results = await self.cleanup()
                results['actions_taken'].append(cleanup_results)
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error during maintenance: {str(e)}")
            return {'status': 'error', 'error': str(e)}

    async def get_status(self) -> Dict[str, Any]:
        """Get current memory status.
        
        Returns:
            Dict[str, Any]: Current memory status
        """
        try:
            return {
                'memory_usage': self._get_memory_usage(),
                'last_cleanup': self._last_cleanup.isoformat() if self._last_cleanup else None,
                'active_actions': len([a for a in self._actions.values() if a.status == ActionStatus.IN_PROGRESS]),
                'total_actions': len(self._actions),
                'memory_threshold': self._memory_threshold
            }
        except Exception as e:
            self.logger.error(f"Error getting status: {str(e)}")
            return {'status': 'error', 'error': str(e)}

    async def get_report(self) -> Dict[str, Any]:
        """Get detailed memory report.
        
        Returns:
            Dict[str, Any]: Detailed memory report
        """
        try:
            memory = psutil.virtual_memory()
            return {
                'total_memory': memory.total,
                'available_memory': memory.available,
                'used_memory': memory.used,
                'memory_percent': memory.percent,
                'swap_total': psutil.swap_memory().total,
                'swap_used': psutil.swap_memory().used,
                'swap_percent': psutil.swap_memory().percent,
                'last_cleanup': self._last_cleanup.isoformat() if self._last_cleanup else None,
                'cleanup_actions': [
                    {
                        'id': action.id,
                        'type': action.type,
                        'status': action.status.value,
                        'memory_freed': action.memory_freed,
                        'start_time': action.start_time.isoformat(),
                        'end_time': action.end_time.isoformat() if action.end_time else None
                    }
                    for action in self._actions.values()
                ]
            }
        except Exception as e:
            self.logger.error(f"Error generating report: {str(e)}")
            return {'status': 'error', 'error': str(e)}

    async def get_recommendations(self) -> List[Dict[str, Any]]:
        """Get memory optimization recommendations.
        
        Returns:
            List[Dict[str, Any]]: List of recommendations
        """
        try:
            recommendations = []
            memory = psutil.virtual_memory()
            
            if memory.percent > self._memory_threshold * 100:
                recommendations.append({
                    'type': 'high_usage',
                    'severity': 'high',
                    'message': 'Memory usage is above threshold',
                    'suggestion': 'Consider increasing system memory or optimizing memory usage'
                })
            
            if psutil.swap_memory().percent > 80:
                recommendations.append({
                    'type': 'high_swap',
                    'severity': 'medium',
                    'message': 'High swap usage detected',
                    'suggestion': 'Consider reducing memory pressure or increasing swap space'
                })
            
            return recommendations
            
        except Exception as e:
            self.logger.error(f"Error getting recommendations: {str(e)}")
            return []

    async def get_actions(self) -> List[Dict[str, Any]]:
        """Get available memory cleanup actions.
        
        Returns:
            List[Dict[str, Any]]: List of available actions
        """
        return [
            {
                'id': 'gc_collect',
                'type': 'garbage_collection',
                'description': 'Run garbage collection',
                'impact': 'low'
            },
            {
                'id': 'clear_cache',
                'type': 'cache_clear',
                'description': 'Clear memory cache',
                'impact': 'medium'
            },
            {
                'id': 'cleanup_temp',
                'type': 'temp_cleanup',
                'description': 'Clean up temporary files',
                'impact': 'low'
            }
        ]

    async def get_action_status(self, action_id: str) -> Dict[str, Any]:
        """Get status of a specific action.
        
        Args:
            action_id: ID of the action
            
        Returns:
            Dict[str, Any]: Action status
        """
        action = self._actions.get(action_id)
        if not action:
            return {'status': 'not_found'}
            
        return {
            'id': action.id,
            'type': action.type,
            'status': action.status.value,
            'start_time': action.start_time.isoformat(),
            'end_time': action.end_time.isoformat() if action.end_time else None,
            'memory_freed': action.memory_freed,
            'error': action.error
        }

    async def get_action_report(self, action_id: str) -> Dict[str, Any]:
        """Get detailed report for a specific action.
        
        Args:
            action_id: ID of the action
            
        Returns:
            Dict[str, Any]: Action report
        """
        action = self._actions.get(action_id)
        if not action:
            return {'status': 'not_found'}
            
        return {
            'id': action.id,
            'type': action.type,
            'status': action.status.value,
            'start_time': action.start_time.isoformat(),
            'end_time': action.end_time.isoformat() if action.end_time else None,
            'memory_freed': action.memory_freed,
            'error': action.error,
            'details': action.details or {}
        }

    async def get_action_recommendations(self, action_id: str) -> List[Dict[str, Any]]:
        """Get recommendations for a specific action.
        
        Args:
            action_id: ID of the action
            
        Returns:
            List[Dict[str, Any]]: Action recommendations
        """
        action = self._actions.get(action_id)
        if not action:
            return []
            
        recommendations = []
        
        if action.status == ActionStatus.FAILED:
            recommendations.append({
                'type': 'error_recovery',
                'severity': 'high',
                'message': f'Action failed: {action.error}',
                'suggestion': 'Review error and retry action'
            })
        
        return recommendations

    async def get_action_actions(self, action_id: str) -> List[Dict[str, Any]]:
        """Get available follow-up actions for a specific action.
        
        Args:
            action_id: ID of the action
            
        Returns:
            List[Dict[str, Any]]: Available follow-up actions
        """
        action = self._actions.get(action_id)
        if not action:
            return []
            
        follow_up_actions = []
        
        if action.status == ActionStatus.FAILED:
            follow_up_actions.append({
                'id': f'retry_{action_id}',
                'type': 'retry',
                'description': 'Retry failed action',
                'impact': 'medium'
            })
        
        return follow_up_actions

    def _should_cleanup(self) -> bool:
        """Check if memory cleanup is needed.
        
        Returns:
            bool: True if cleanup is needed
        """
        try:
            # Check memory usage
            if self._get_memory_usage() > self._memory_threshold:
                return True
            
            # Check if cleanup interval has passed
            if self._last_cleanup:
                time_since_cleanup = (datetime.now() - self._last_cleanup).total_seconds()
                if time_since_cleanup > self._cleanup_interval:
                    return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error checking cleanup need: {str(e)}")
            return False

    def _get_memory_usage(self) -> float:
        """Get current memory usage as a percentage.
        
        Returns:
            float: Memory usage percentage
        """
        try:
            return psutil.virtual_memory().percent / 100
        except Exception as e:
            self.logger.error(f"Error getting memory usage: {str(e)}")
            return 0.0

    async def _clear_memory_cache(self) -> int:
        """Clear memory cache.
        
        Returns:
            int: Amount of memory freed in bytes
        """
        try:
            # Get initial memory usage
            initial_memory = psutil.virtual_memory().used
            
            # Clear memory cache
            if os.name == 'posix':  # Linux/Unix
                os.system('sync')
                with open('/proc/sys/vm/drop_caches', 'w') as f:
                    f.write('1')
            elif os.name == 'nt':  # Windows
                os.system('powershell -Command "Clear-RecycleBin -Force"')
            
            # Calculate memory freed
            final_memory = psutil.virtual_memory().used
            return max(0, initial_memory - final_memory)
            
        except Exception as e:
            self.logger.error(f"Error clearing memory cache: {str(e)}")
            return 0

    async def _cleanup_temp_files(self) -> int:
        """Clean up temporary files.
        
        Returns:
            int: Amount of space freed in bytes
        """
        try:
            initial_space = psutil.disk_usage('/').used
            
            # Clean up temp directories
            temp_dirs = [
                '/tmp',
                os.path.join(os.environ.get('TEMP', ''), 'panion'),
                os.path.join(os.environ.get('TMP', ''), 'panion')
            ]
            
            for temp_dir in temp_dirs:
                if os.path.exists(temp_dir):
                    for file in os.listdir(temp_dir):
                        try:
                            file_path = os.path.join(temp_dir, file)
                            if os.path.isfile(file_path):
                                os.remove(file_path)
                        except Exception as e:
                            self.logger.warning(f"Error removing temp file {file}: {str(e)}")
            
            final_space = psutil.disk_usage('/').used
            return max(0, initial_space - final_space)
            
        except Exception as e:
            self.logger.error(f"Error cleaning up temp files: {str(e)}")
            return 0 