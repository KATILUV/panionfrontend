"""
Plugin Execution Monitor
Unified system for monitoring plugin execution, including resource usage, timeouts, and logging.
"""

import logging
from typing import Dict, Any, Optional, List, Callable, Awaitable
from pathlib import Path
import json
import asyncio
from datetime import datetime
import time
import psutil
from dataclasses import dataclass, field
from contextlib import asynccontextmanager

from core.logging_config import get_logger, LogTimer
from core.panion_errors import PluginError, PluginErrorType

@dataclass
class ExecutionMetrics:
    """Metrics collected during plugin execution."""
    start_time: float
    end_time: Optional[float] = None
    duration: Optional[float] = None
    memory_usage: Optional[float] = None  # MB
    cpu_usage: Optional[float] = None  # Percentage
    cpu_samples: List[float] = field(default_factory=list)
    error: Optional[str] = None
    status: str = "running"
    metadata: Dict[str, Any] = field(default_factory=dict)

    def update(self) -> None:
        """Update metrics with current values."""
        if self.end_time is None:
            self.end_time = time.time()
            self.duration = self.end_time - self.start_time

    def finalize(self, error: Optional[str] = None) -> None:
        """Finalize metrics with error if any."""
        self.update()
        if error:
            self.error = error
            self.status = "error"
        else:
            self.status = "success"

    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary."""
        return {
            "status": self.status,
            "duration": self.duration,
            "memory_usage": self.memory_usage,
            "cpu_usage": self.cpu_usage,
            "error": self.error,
            "metadata": self.metadata
        }

class ExecutionMonitor:
    """Monitors plugin execution with resource tracking and timeout handling."""

    def __init__(
        self,
        timeout: int = 30,
        memory_limit: int = 512,
        log_dir: str = "data/execution_logs"
    ):
        """Initialize execution monitor.
        
        Args:
            timeout: Maximum execution time in seconds
            memory_limit: Maximum memory usage in MB
            log_dir: Directory for execution logs
        """
        self.timeout = timeout
        self.memory_limit = memory_limit
        self.log_dir = Path(log_dir)
        self.logger = get_logger(__name__)
        self._ensure_log_dir()

    def _ensure_log_dir(self) -> None:
        """Ensure log directory exists."""
        self.log_dir.mkdir(parents=True, exist_ok=True)

    @asynccontextmanager
    async def monitor_execution(
        self,
        plugin_id: str,
        input_data: Optional[Dict[str, Any]] = None
    ):
        """Context manager for monitoring plugin execution.
        
        Args:
            plugin_id: ID of the plugin being executed
            input_data: Optional input data for logging
            
        Yields:
            ExecutionMetrics object for tracking execution
        """
        metrics = ExecutionMetrics(
            start_time=time.time(),
            metadata={
                "plugin_id": plugin_id,
                "input_data": input_data,
                "timestamp": datetime.now().isoformat()
            }
        )

        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        monitor_task = None

        try:
            # Start resource monitoring
            async def monitor_resources():
                while True:
                    metrics.cpu_samples.append(process.cpu_percent())
                    current_memory = process.memory_info().rss / 1024 / 1024
                    metrics.memory_usage = current_memory - initial_memory
                    
                    if metrics.memory_usage > self.memory_limit:
                        raise MemoryError(
                            f"Memory limit exceeded: {metrics.memory_usage:.1f}MB"
                        )
                    await asyncio.sleep(0.1)

            # Start monitoring task
            monitor_task = asyncio.create_task(monitor_resources())

            # Set up timeout
            try:
                async with asyncio.timeout(self.timeout):
                    yield metrics
            except asyncio.TimeoutError:
                metrics.finalize(f"Execution timed out after {self.timeout}s")
                raise

        except Exception as e:
            metrics.finalize(str(e))
            raise

        finally:
            # Clean up monitoring task
            if monitor_task:
                monitor_task.cancel()
                try:
                    await monitor_task
                except asyncio.CancelledError:
                    pass

            # Calculate final metrics
            metrics.update()
            if metrics.cpu_samples:
                metrics.cpu_usage = sum(metrics.cpu_samples) / len(metrics.cpu_samples)

            # Log execution
            await self._log_execution(metrics)

    async def _log_execution(self, metrics: ExecutionMetrics) -> None:
        """Log execution metrics to file."""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            log_file = self.log_dir / f"{metrics.metadata['plugin_id']}_{timestamp}.json"
            
            with open(log_file, 'w') as f:
                json.dump(metrics.to_dict(), f, indent=2)
                
            self.logger.info(f"Execution log saved to {log_file}")
            
        except Exception as e:
            self.logger.error(f"Error logging execution: {e}")

    async def execute_with_monitoring(
        self,
        plugin_id: str,
        execute_func: Callable[..., Awaitable[Any]],
        *args,
        **kwargs
    ) -> Dict[str, Any]:
        """Execute a function with monitoring.
        
        Args:
            plugin_id: ID of the plugin being executed
            execute_func: Async function to execute
            *args: Positional arguments for execute_func
            **kwargs: Keyword arguments for execute_func
            
        Returns:
            Dictionary containing execution result and metrics
        """
        try:
            async with self.monitor_execution(plugin_id, kwargs.get('input_data')) as metrics:
                output = await execute_func(*args, **kwargs)
                metrics.finalize()
                return {
                    'status': metrics.status,
                    'output': output,
                    'duration': metrics.duration,
                    'memory_usage': metrics.memory_usage,
                    'cpu_usage': metrics.cpu_usage,
                    'error': metrics.error,
                    'metadata': metrics.metadata
                }

        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'duration': metrics.duration if metrics else None,
                'memory_usage': metrics.memory_usage if metrics else None,
                'cpu_usage': metrics.cpu_usage if metrics else None,
                'metadata': metrics.metadata if metrics else {'plugin_id': plugin_id}
            }

# Create singleton instance
execution_monitor = ExecutionMonitor() 