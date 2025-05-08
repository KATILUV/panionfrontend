"""
Plugin Executor
Handles plugin execution with timeout, logging, and error handling.
"""

import logging
from typing import Dict, Any, Optional, List, TYPE_CHECKING
from pathlib import Path
import json
import asyncio
from datetime import datetime
import time
import signal
from contextlib import asynccontextmanager
import psutil
from dataclasses import dataclass
from core.logging_config import get_logger, LogTimer
from core.plugin.interfaces import IPluginManager
from core.plugin.types import Plugin, PluginMetadata, PluginState
from core.panion_errors import PluginError, ErrorSeverity
from core.utils import with_connection_pool, cache_result
from core.base import BaseComponent, ComponentMetadata, ComponentState
from core.config import plugin_config, system_config
from core.events import event_bus, Event, EventType
from core.reflection_archiver import reflection_archiver
from core.reflection import reflection_system
from core.plugin.execution_monitor import execution_monitor, ExecutionMetrics

@dataclass
class ExecutionResult:
    """Result of plugin execution."""
    status: str
    output: Any
    duration: float
    memory_usage: float
    cpu_usage: float
    error: Optional[str] = None
    metadata: Dict[str, Any] = None

@dataclass
class TestResult:
    """Result of a plugin test case execution."""
    status: str  # "success", "error", "timeout"
    duration: float  # Execution time in seconds
    output: Any  # Plugin output
    error: Optional[str] = None  # Error message if any
    memory_usage: Optional[float] = None  # Peak memory usage in MB
    cpu_usage: Optional[float] = None  # Average CPU usage percentage

class PluginExecutor(BaseComponent):
    """Handles plugin execution and lifecycle management."""
    
    def __init__(self, plugin_manager: IPluginManager):
        """Initialize the plugin executor.
        
        Args:
            plugin_manager: The plugin manager instance
        """
        metadata = ComponentMetadata(
            name="PluginExecutor",
            version="1.0.0",
            description="Plugin execution system",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            dependencies={},
            config_schema={}
        )
        super().__init__(metadata)
        
        self._plugin_manager = plugin_manager
        self.logger = logging.getLogger(__name__)
        self.timeout = 30
        self.memory_limit = 512
        self._ensure_log_dir()
        
    def _ensure_log_dir(self):
        """Ensure log directory exists."""
        log_dir = Path("data/plugin_execution_logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        
    async def run_plugin(
        self,
        plugin_id: str,
        input_data: Dict[str, Any],
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """Run a plugin with timeout and error handling."""
        try:
            with LogTimer(self.logger, 'run_plugin', plugin_id=plugin_id):
                # Get plugin instance
                plugin = await self._plugin_manager.get_plugin(plugin_id)
                if not plugin:
                    return {
                        'status': 'failure',
                        'error': f"Plugin not found: {plugin_id}"
                    }

                # Set timeout
                timeout = timeout or self.timeout

                try:
                    # Run plugin with monitoring and timeout
                    async with asyncio.timeout(timeout):
                        result = await execution_monitor.execute_with_monitoring(
                            plugin_id=plugin_id,
                            execute_func=plugin.execute,
                            input_data=input_data
                        )

                        # Archive reflection
                        await reflection_archiver.archive_reflection({
                            'type': 'plugin_execution',
                            'status': result['status'],
                            'timestamp': datetime.now().isoformat(),
                            'metadata': {
                                'plugin_id': plugin_id,
                                'duration': result['duration'],
                                'memory_usage': result['memory_usage'],
                                'cpu_usage': result['cpu_usage'],
                                'error': result['error']
                            }
                        })

                        return result

                except asyncio.TimeoutError:
                    self.logger.error(f"Plugin {plugin_id} execution timed out after {timeout} seconds")
                    return {
                        'status': 'failure',
                        'error': f"Plugin execution timed out after {timeout} seconds",
                        'duration': timeout,
                        'memory_usage': 0.0,
                        'cpu_usage': 0.0,
                        'metadata': {'plugin_id': plugin_id}
                    }

        except Exception as e:
            self.logger.error(f"Error running plugin: {e}")
            return {
                'status': 'failure',
                'error': str(e),
                'duration': 0.0,
                'memory_usage': 0.0,
                'cpu_usage': 0.0,
                'metadata': {'plugin_id': plugin_id}
            }

    @asynccontextmanager
    async def _timeout_context(self, seconds: int):
        """Context manager for timeout handling."""
        try:
            # Set up timeout
            loop = asyncio.get_running_loop()
            timeout_handle = loop.call_later(seconds, lambda: None)
            yield
        finally:
            # Cancel timeout
            timeout_handle.cancel()

    async def _log_execution(self, result: ExecutionResult) -> None:
        """Log plugin execution result."""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            log_file = Path('data/plugin_execution_logs') / f"{result.metadata['plugin_id']}_{timestamp}.json"
            
            data = {
                'status': result.status,
                'output': result.output,
                'duration': result.duration,
                'memory_usage': result.memory_usage,
                'cpu_usage': result.cpu_usage,
                'error': result.error,
                'metadata': result.metadata
            }
            
            with open(log_file, 'w') as f:
                json.dump(data, f, indent=2)
                
            self.logger.info(f"Execution log saved to {log_file}")
            
        except Exception as e:
            self.logger.error(f"Error logging execution: {e}")

    async def run_plugin_test_case(
        self,
        plugin_id: str,
        input_data: Dict[str, Any]
    ) -> ExecutionResult:
        """Run a plugin test case with timeout and resource monitoring.
        
        Args:
            plugin_id: ID of the plugin to run
            input_data: Input data for the plugin
            
        Returns:
            ExecutionResult containing execution status and metrics
        """
        try:
            # Run plugin with monitoring
            result = await execution_monitor.execute_with_monitoring(
                plugin_id=plugin_id,
                execute_func=self._plugin_manager.get_plugin(plugin_id).execute,
                input_data=input_data
            )

            return ExecutionResult(
                status=result['status'],
                output=result['output'],
                duration=result['duration'],
                memory_usage=result['memory_usage'],
                cpu_usage=result['cpu_usage'],
                error=result['error'],
                metadata=result['metadata']
            )

        except Exception as e:
            return ExecutionResult(
                status='error',
                output=None,
                duration=0.0,
                memory_usage=0.0,
                cpu_usage=0.0,
                error=str(e),
                metadata={'plugin_id': plugin_id}
            )

# Create singleton instance
plugin_executor = PluginExecutor() 