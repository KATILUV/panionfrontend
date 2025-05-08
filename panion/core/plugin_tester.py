"""
Enhanced Plugin Tester
Handles comprehensive plugin testing including sandbox, regression, performance, and security testing.
"""

import logging
from typing import Dict, Any, List, Optional, Tuple, TYPE_CHECKING
from pathlib import Path
import json
import yaml
import importlib.util
import sys
from datetime import datetime
import os
import asyncio
import docker
from docker.errors import DockerException
import signal
from contextlib import asynccontextmanager
import ast
import re
import psutil
import time
import hashlib
from dataclasses import dataclass, field
from functools import wraps
import statistics
import tempfile
import shutil
import networkx as nx
from packaging import version

from core.plugin.interfaces import IPluginManager, IPluginTester
from core.plugin_types import Plugin, PluginMetadata, PluginState
from core.panion_errors import PluginError, ErrorSeverity
from core.utils import with_connection_pool, cache_result
from core.base import BaseComponent, ComponentMetadata, ComponentState
from core.logging_config import get_logger, LogTimer
from core.config import plugin_config, system_config
from core.plugin.base import BasePlugin
from core.plugin.types import PluginInfo
from core.plugin.execution_monitor import execution_monitor, ExecutionMetrics
from core.plugin.cache import plugin_cache
from core.plugin.refiner import plugin_refiner
from core.events import event_bus, Event, EventType

if TYPE_CHECKING:
    from core.plugin_synthesizer import PluginSynthesizer

logger = logging.getLogger(__name__)

def handle_exceptions(logger: logging.Logger):
    """Decorator for handling exceptions with proper logging."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                logger.error(
                    f"Error in {func.__name__}",
                    extra={
                        'operation': f'{func.__name__}_error',
                        'error_type': type(e).__name__,
                        'error': str(e),
                        'args': str(args),
                        'kwargs': str(kwargs)
                    },
                    exc_info=True
                )
                raise
        return wrapper
    return decorator

@dataclass
class TestCase:
    """Test case for plugin testing."""
    name: str
    input_data: Dict[str, Any]
    expected_output: Optional[Dict[str, Any]] = None
    expected_error: Optional[str] = None
    timeout: Optional[int] = None
    memory_limit: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class TestResult:
    """Result of a plugin test case execution."""
    test_name: str
    status: str  # "success", "error", "timeout"
    duration: float  # Execution time in seconds
    output: Any  # Plugin output
    error: Optional[str] = None  # Error message if any
    memory_usage: Optional[float] = None  # Peak memory usage in MB
    cpu_usage: Optional[float] = None  # Average CPU usage percentage
    warnings: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    test_case: Optional[TestCase] = None
    regression_status: Optional[str] = None
    security_issues: List[str] = field(default_factory=list)
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    exit_code: Optional[int] = None

@dataclass
class TestMetrics:
    """Aggregated metrics for a plugin's test results."""
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    total_duration: float = 0.0
    average_duration: float = 0.0
    min_duration: float = float('inf')
    max_duration: float = 0.0
    average_memory_usage: float = 0.0
    max_memory_usage: float = 0.0
    average_cpu_usage: float = 0.0
    max_cpu_usage: float = 0.0
    error_rate: float = 0.0
    regression_count: int = 0
    security_issues: List[str] = field(default_factory=list)
    _duration_samples: List[float] = field(default_factory=list)
    _memory_samples: List[float] = field(default_factory=list)
    _cpu_samples: List[float] = field(default_factory=list)

    def update_metrics(self, result: TestResult) -> None:
        """Update metrics with a new test result using running averages."""
        self.total_tests += 1
        
        if result.status == "success":
            self.passed_tests += 1
        else:
            self.failed_tests += 1

        # Update duration metrics
        if result.duration is not None:
            self.total_duration += result.duration
            self.min_duration = min(self.min_duration, result.duration)
            self.max_duration = max(self.max_duration, result.duration)
            self._duration_samples.append(result.duration)
            self.average_duration = self.total_duration / self.total_tests

        # Update memory metrics
        if result.memory_usage is not None:
            self._memory_samples.append(result.memory_usage)
            self.average_memory_usage = sum(self._memory_samples) / len(self._memory_samples)
            self.max_memory_usage = max(self.max_memory_usage, result.memory_usage)

        # Update CPU metrics
        if result.cpu_usage is not None:
            self._cpu_samples.append(result.cpu_usage)
            self.average_cpu_usage = sum(self._cpu_samples) / len(self._cpu_samples)
            self.max_cpu_usage = max(self.max_cpu_usage, result.cpu_usage)

        # Update error rate
        self.error_rate = self.failed_tests / self.total_tests if self.total_tests > 0 else 0.0

        # Update regression count
        if result.regression_status == 'failed':
            self.regression_count += 1

        # Update security issues
        if result.security_issues:
            self.security_issues.extend(result.security_issues)

    def get_percentiles(self) -> Dict[str, float]:
        """Calculate percentile metrics for durations."""
        if not self._duration_samples:
            return {}
            
        sorted_durations = sorted(self._duration_samples)
        return {
            'p50': sorted_durations[int(len(sorted_durations) * 0.5)],
            'p90': sorted_durations[int(len(sorted_durations) * 0.9)],
            'p95': sorted_durations[int(len(sorted_durations) * 0.95)],
            'p99': sorted_durations[int(len(sorted_durations) * 0.99)]
        }

    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary with additional statistics."""
        return {
            'total_tests': self.total_tests,
            'passed_tests': self.passed_tests,
            'failed_tests': self.failed_tests,
            'total_duration': self.total_duration,
            'average_duration': self.average_duration,
            'min_duration': self.min_duration if self.min_duration != float('inf') else 0.0,
            'max_duration': self.max_duration,
            'average_memory_usage': self.average_memory_usage,
            'max_memory_usage': self.max_memory_usage,
            'average_cpu_usage': self.average_cpu_usage,
            'max_cpu_usage': self.max_cpu_usage,
            'error_rate': self.error_rate,
            'regression_count': self.regression_count,
            'security_issues': self.security_issues,
            'percentiles': self.get_percentiles()
        }

@dataclass
class DockerConfig:
    """Docker container configuration."""
    image: str = "python:3.9-slim"
    memory_limit: str = "512m"
    cpu_limit: float = 0.5
    network_disabled: bool = True
    read_only: bool = True
    timeout: int = 30

@dataclass
class PerformanceThresholds:
    """Configuration for performance thresholds."""
    execution_time: float = field(default_factory=lambda: float(os.getenv('PLUGIN_EXECUTION_TIME_LIMIT', '1.0')))
    memory_usage: int = field(default_factory=lambda: int(os.getenv('PLUGIN_MEMORY_LIMIT', str(100 * 1024 * 1024))))
    cpu_usage: float = field(default_factory=lambda: float(os.getenv('PLUGIN_CPU_LIMIT', '50.0')))
    response_time: float = field(default_factory=lambda: float(os.getenv('PLUGIN_RESPONSE_TIME_LIMIT', '0.5')))
    throughput: int = field(default_factory=lambda: int(os.getenv('PLUGIN_THROUGHPUT_LIMIT', '100')))
    max_input_size: int = field(default_factory=lambda: int(os.getenv('PLUGIN_MAX_INPUT_SIZE', str(1000000))))
    max_concurrent_requests: int = field(default_factory=lambda: int(os.getenv('PLUGIN_MAX_CONCURRENT_REQUESTS', '10')))
    max_retries: int = field(default_factory=lambda: int(os.getenv('PLUGIN_MAX_RETRIES', '3')))
    retry_delay: float = field(default_factory=lambda: float(os.getenv('PLUGIN_RETRY_DELAY', '1.0')))

class PluginTester(BaseComponent, IPluginTester):
    """Tests plugins for correctness, performance, and reliability."""
    
    def __init__(self):
        """Initialize the plugin tester."""
        metadata = ComponentMetadata(
            name="PluginTester",
            version="1.0.0",
            description="Plugin testing system",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            dependencies={},
            config_schema={}
        )
        super().__init__(metadata)
        
        self.logger = logging.getLogger(__name__)
        self._test_results: Dict[str, TestResult] = {}
        self._test_queue: List[str] = []
        self._running_tests: Set[str] = set()
        self._max_concurrent_tests = plugin_config.max_concurrent_tests
        self._test_timeout = plugin_config.test_timeout
        self._retry_count = plugin_config.test_retry_count
        self._retry_delay = plugin_config.test_retry_delay
        
        # Subscribe to events
        event_bus.subscribe(EventType.PLUGIN_LOADED, self._handle_plugin_loaded)
        event_bus.subscribe(EventType.PLUGIN_UPDATED, self._handle_plugin_updated)
        event_bus.subscribe(EventType.PLUGIN_DELETED, self._handle_plugin_deleted)
        
    def _handle_plugin_loaded(self, event: Event) -> None:
        """Handle plugin loaded event."""
        plugin_id = event.data.get("plugin_id")
        if plugin_id:
            self._test_queue.append(plugin_id)
            asyncio.create_task(self._process_test_queue())
            
    def _handle_plugin_updated(self, event: Event) -> None:
        """Handle plugin updated event."""
        plugin_id = event.data.get("plugin_id")
        if plugin_id:
            self._test_queue.append(plugin_id)
            asyncio.create_task(self._process_test_queue())
            
    def _handle_plugin_deleted(self, event: Event) -> None:
        """Handle plugin deleted event."""
        plugin_id = event.data.get("plugin_id")
        if plugin_id:
            self._test_results.pop(plugin_id, None)
            
    async def _process_test_queue(self) -> None:
        """Process the test queue."""
        while self._test_queue and len(self._running_tests) < self._max_concurrent_tests:
            plugin_id = self._test_queue.pop(0)
            if plugin_id not in self._running_tests:
                self._running_tests.add(plugin_id)
                asyncio.create_task(self._run_tests(plugin_id))
                
    async def _run_tests(self, plugin_id: str) -> None:
        """Run tests for a plugin."""
        try:
            start_time = datetime.now()
            
            # Get plugin instance
            plugin = await self._get_plugin(plugin_id)
            if not plugin:
                raise PluginError(f"Plugin {plugin_id} not found")
                
            # Run tests
            test_result = await self._execute_tests(plugin)
            
            # Calculate duration
            duration = (datetime.now() - start_time).total_seconds()
            
            # Create test result
            result = TestResult(
                status="success" if not test_result.get("errors") else "failure",
                message=test_result.get("message", ""),
                metrics=test_result.get("metrics", {}),
                errors=test_result.get("errors", []),
                warnings=test_result.get("warnings", []),
                duration=duration
            )
            
            # Store result
            self._test_results[plugin_id] = result
            
            # Publish event
            event_bus.publish(Event(
                type=EventType.PLUGIN_TEST_COMPLETED,
                data={
                    "plugin_id": plugin_id,
                    "result": {
                        "status": result.status,
                        "message": result.message,
                        "metrics": result.metrics,
                        "errors": result.errors,
                        "warnings": result.warnings,
                        "duration": result.duration
                    }
                },
                source="PluginTester"
            ))
            
            self.logger.info(
                f"Tests completed for plugin: {plugin_id}",
                extra={
                    'operation': 'run_tests',
                    'plugin_id': plugin_id,
                    'status': result.status,
                    'duration': result.duration,
                    'error_count': len(result.errors),
                    'warning_count': len(result.warnings)
                }
            )
            
        except Exception as e:
            self.logger.error(
                f"Error running tests for plugin: {plugin_id}",
                extra={
                    'operation': 'run_tests',
                    'plugin_id': plugin_id,
                    'error': str(e)
                }
            )
            
            # Publish error event
            event_bus.publish(Event(
                type=EventType.PLUGIN_TEST_FAILED,
                data={
                    "plugin_id": plugin_id,
                    "error": str(e)
                },
                source="PluginTester"
            ))
            
        finally:
            self._running_tests.remove(plugin_id)
            asyncio.create_task(self._process_test_queue())
            
    async def _execute_tests(self, plugin: Plugin) -> Dict[str, Any]:
        """Execute tests for a plugin."""
        result = {
            "message": "",
            "metrics": {},
            "errors": [],
            "warnings": []
        }
        
        try:
            # Run validation tests
            validation_result = await self._run_validation_tests(plugin)
            result["errors"].extend(validation_result.get("errors", []))
            result["warnings"].extend(validation_result.get("warnings", []))
            
            # Run performance tests
            performance_result = await self._run_performance_tests(plugin)
            result["metrics"].update(performance_result.get("metrics", {}))
            result["errors"].extend(performance_result.get("errors", []))
            result["warnings"].extend(performance_result.get("warnings", []))
            
            # Run reliability tests
            reliability_result = await self._run_reliability_tests(plugin)
            result["errors"].extend(reliability_result.get("errors", []))
            result["warnings"].extend(reliability_result.get("warnings", []))
            
            # Set message
            if result["errors"]:
                result["message"] = f"Tests failed with {len(result['errors'])} errors"
            elif result["warnings"]:
                result["message"] = f"Tests passed with {len(result['warnings'])} warnings"
            else:
                result["message"] = "All tests passed"
                
        except Exception as e:
            result["errors"].append(str(e))
            result["message"] = f"Test execution failed: {str(e)}"
            
        return result
        
    async def _run_validation_tests(self, plugin: Plugin) -> Dict[str, Any]:
        """Run validation tests for a plugin."""
        result = {
            "errors": [],
            "warnings": []
        }
        
        try:
            # Test plugin initialization
            try:
                await plugin.initialize()
            except Exception as e:
                result["errors"].append(f"Initialization failed: {str(e)}")
                
            # Test plugin start/stop
            try:
                await plugin.start()
                await plugin.stop()
            except Exception as e:
                result["errors"].append(f"Start/stop failed: {str(e)}")
                
            # Test plugin pause/resume
            try:
                await plugin.start()
                await plugin.pause()
                await plugin.resume()
                await plugin.stop()
            except Exception as e:
                result["errors"].append(f"Pause/resume failed: {str(e)}")
                
            # Test plugin cleanup
            try:
                await plugin.cleanup()
            except Exception as e:
                result["warnings"].append(f"Cleanup failed: {str(e)}")
                
        except Exception as e:
            result["errors"].append(f"Validation test execution failed: {str(e)}")
            
        return result
        
    async def _run_performance_tests(self, plugin: Plugin) -> Dict[str, Any]:
        """Run performance tests for a plugin."""
        result = {
            "metrics": {},
            "errors": [],
            "warnings": []
        }
        
        try:
            # Test execution time
            start_time = datetime.now()
            try:
                await plugin.execute({})
            except Exception as e:
                result["errors"].append(f"Execution failed: {str(e)}")
            execution_time = (datetime.now() - start_time).total_seconds()
            
            result["metrics"]["execution_time"] = execution_time
            
            # Test memory usage
            try:
                import psutil
                process = psutil.Process()
                memory_info = process.memory_info()
                result["metrics"]["memory_usage"] = memory_info.rss
            except Exception as e:
                result["warnings"].append(f"Memory usage measurement failed: {str(e)}")
                
            # Test CPU usage
            try:
                import psutil
                process = psutil.Process()
                cpu_percent = process.cpu_percent(interval=1)
                result["metrics"]["cpu_usage"] = cpu_percent
            except Exception as e:
                result["warnings"].append(f"CPU usage measurement failed: {str(e)}")
                
        except Exception as e:
            result["errors"].append(f"Performance test execution failed: {str(e)}")
            
        return result
        
    async def _run_reliability_tests(self, plugin: Plugin) -> Dict[str, Any]:
        """Run reliability tests for a plugin."""
        result = {
            "errors": [],
            "warnings": []
        }
        
        try:
            # Test error handling
            try:
                await plugin.execute({"invalid": "input"})
            except Exception as e:
                if not isinstance(e, (ValueError, PluginError)):
                    result["errors"].append(f"Invalid error type: {type(e).__name__}")
            else:
                result["errors"].append("Failed to handle invalid input")
                
            # Test retry mechanism
            retry_count = 0
            while retry_count < self._retry_count:
                try:
                    await plugin.execute({})
                    break
                except Exception as e:
                    retry_count += 1
                    if retry_count == self._retry_count:
                        result["errors"].append(f"Retry mechanism failed: {str(e)}")
                    await asyncio.sleep(self._retry_delay)
                    
            # Test resource cleanup
            try:
                await plugin.start()
                await plugin.stop()
                await plugin.cleanup()
            except Exception as e:
                result["errors"].append(f"Resource cleanup failed: {str(e)}")
                
        except Exception as e:
            result["errors"].append(f"Reliability test execution failed: {str(e)}")
            
        return result
        
    async def _get_plugin(self, plugin_id: str) -> Optional[Plugin]:
        """Get a plugin instance."""
        try:
            # This would be replaced with actual plugin loading logic
            return None
        except Exception as e:
            self.logger.error(f"Error getting plugin: {e}")
            return None
            
    async def get_test_result(self, plugin_id: str) -> Optional[TestResult]:
        """Get test result for a plugin."""
        return self._test_results.get(plugin_id)
        
    async def get_test_results(self) -> Dict[str, TestResult]:
        """Get all test results."""
        return self._test_results.copy()
        
    async def clear_test_results(self, plugin_id: Optional[str] = None) -> None:
        """Clear test results."""
        if plugin_id:
            self._test_results.pop(plugin_id, None)
        else:
            self._test_results.clear()

# Create singleton instance
plugin_tester = PluginTester()

class DockerTestError(Exception):
    """Exception raised for Docker testing errors."""
    pass

@asynccontextmanager
async def timeout_context(seconds: int):
    """Context manager for timeout handling."""
    try:
        # Set up timeout
        loop = asyncio.get_running_loop()
        timeout_handle = loop.call_later(seconds, lambda: None)
        yield
    finally:
        # Cancel timeout
        timeout_handle.cancel()

async def run_plugin_in_docker(
    plugin_dir: str,
    test_command: str,
    timeout: int = 300,
    docker_image: str = "python:3.9-slim",
    env_vars: Optional[Dict[str, str]] = None
) -> Tuple[str, str, int]:
    """
    Run a plugin test command in an isolated Docker container.
    
    Args:
        plugin_dir: Path to the plugin directory
        test_command: Command to run (e.g., "pytest" or "python plugin.py")
        timeout: Maximum execution time in seconds (default: 300)
        docker_image: Base Docker image to use (default: python:3.9-slim)
        env_vars: Optional environment variables to set in container
        
    Returns:
        Tuple of (stdout, stderr, exit_code)
        
    Raises:
        DockerTestError: If Docker operations fail
        TimeoutError: If test execution exceeds timeout
    """
    try:
        # Validate inputs
        plugin_path = Path(plugin_dir)
        if not plugin_path.exists():
            raise DockerTestError(f"Plugin directory not found: {plugin_dir}")
            
        # Initialize Docker client
        try:
            client = docker.from_env()
        except DockerException as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            raise DockerTestError("Docker client initialization failed")
            
        # Prepare container configuration
        container_config = {
            "image": docker_image,
            "command": f"/bin/bash -c '{test_command}'",
            "volumes": {
                str(plugin_path.absolute()): {
                    "bind": "/plugin",
                    "mode": "ro"
                }
            },
            "working_dir": "/plugin",
            "environment": env_vars or {},
            "detach": True,
            "remove": True,
            "mem_limit": "512m",  # Memory limit
            "cpu_period": 100000,  # CPU time period
            "cpu_quota": 50000,    # CPU time quota (50% of one core)
            "network_disabled": True  # Disable network access
        }
        
        logger.info(f"Starting Docker container for plugin test: {plugin_dir}")
        logger.debug(f"Container config: {container_config}")
        
        # Create and start container
        try:
            container = client.containers.run(**container_config)
        except DockerException as e:
            logger.error(f"Failed to create Docker container: {e}")
            raise DockerTestError("Container creation failed")
            
        try:
            # Set up timeout
            async with timeout_context(timeout):
                # Wait for container to finish
                result = container.wait()
                exit_code = result["StatusCode"]
                
                # Get logs
                stdout = container.logs(stdout=True, stderr=False).decode()
                stderr = container.logs(stdout=False, stderr=True).decode()
                
                logger.info(f"Plugin test completed with exit code: {exit_code}")
                if stderr:
                    logger.warning(f"Plugin test produced stderr: {stderr}")
                    
                return stdout, stderr, exit_code
                
        except asyncio.TimeoutError:
            logger.error(f"Plugin test timed out after {timeout} seconds")
            # Force stop container
            container.stop(timeout=1)
            raise TimeoutError(f"Plugin test exceeded timeout of {timeout} seconds")
            
        finally:
            # Clean up container
            try:
                container.remove(force=True)
            except DockerException as e:
                logger.warning(f"Failed to remove container: {e}")
                
    except Exception as e:
        logger.error(f"Unexpected error in plugin testing: {e}")
        raise DockerTestError(f"Plugin testing failed: {str(e)}")
        
    finally:
        # Clean up Docker client
        try:
            client.close()
        except Exception as e:
            logger.warning(f"Failed to close Docker client: {e}")

async def test_plugin_safety(plugin_dir: str) -> bool:
    """
    Run basic safety checks on a plugin.
    
    Args:
        plugin_dir: Path to the plugin directory
        
    Returns:
        bool: True if plugin passes safety checks
    """
    try:
        # Check for required files
        plugin_path = Path(plugin_dir)
        if not (plugin_path / "requirements.txt").exists():
            logger.warning("Plugin missing requirements.txt")
            return False
            
        # Check for malicious imports
        for py_file in plugin_path.glob("**/*.py"):
            with open(py_file) as f:
                content = f.read().lower()
                dangerous_imports = [
                    "os.system", "subprocess", "eval", "exec",
                    "socket", "shutil.rmtree", "rm -rf"
                ]
                if any(imp in content for imp in dangerous_imports):
                    logger.warning(f"Potentially dangerous import in {py_file}")
                    return False
                    
        return True
        
    except Exception as e:
        logger.error(f"Error in safety check: {e}")
        return False 