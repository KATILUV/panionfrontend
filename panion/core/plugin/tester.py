"""
Plugin Tester Implementation
Provides comprehensive testing capabilities for plugins including validation,
test execution, performance monitoring, and resource tracking.
"""

import logging
from typing import Dict, Any, List, Optional, TYPE_CHECKING, Set, Tuple
from pathlib import Path
import asyncio
import time
from datetime import datetime
import traceback
import psutil
import gc
import json
from dataclasses import dataclass, field
from enum import Enum
import uuid

from .interfaces import IPluginTester
from .base import BasePlugin, PluginMetadata
from .manager import plugin_manager
from .validator import PluginValidator
from ..error_handling import error_handler, with_error_recovery
from ..reflection import reflection_system
from ..shared_state import shared_state, ComponentState
from ..panion_memory import memory_manager, MemoryCategory
from ..panion_errors import PluginError, ErrorSeverity

if TYPE_CHECKING:
    from .types import Plugin

class TestStatus(Enum):
    """Test execution status."""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    SKIPPED = "skipped"
    TIMEOUT = "timeout"

@dataclass
class TestResult:
    """Test execution result."""
    test_id: str
    status: TestStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: float = 0.0
    memory_usage: float = 0.0
    error: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    output: Optional[Any] = None
    expected_output: Optional[Any] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

class PluginTester(IPluginTester):
    """Handles plugin testing and validation."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._test_results: Dict[str, Dict[str, Any]] = {}
        self._validation_results: Dict[str, bool] = {}
        self._test_metrics: Dict[str, Dict[str, Any]] = {}
        self._running_tests: Set[str] = set()
        self._test_history: Dict[str, List[TestResult]] = {}
        self._resource_limits: Dict[str, float] = {
            "max_memory_mb": 512.0,
            "max_cpu_percent": 80.0,
            "max_execution_time": 30.0
        }
        
    @with_error_recovery
    async def test_plugin(self, plugin: 'Plugin', test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Run tests on a plugin.
        
        Args:
            plugin: The plugin to test
            test_cases: List of test cases to run
            
        Returns:
            Dict[str, Any]: Test results including pass/fail status and metrics
        """
        start_time = time.time()
        results = {
            "plugin_name": plugin.__class__.__name__,
            "timestamp": datetime.now().isoformat(),
            "total_tests": len(test_cases),
            "passed_tests": 0,
            "failed_tests": 0,
            "skipped_tests": 0,
            "test_cases": [],
            "metrics": {
                "execution_time": 0.0,
                "memory_usage": 0.0,
                "error_count": 0,
                "warning_count": 0,
                "resource_usage": {
                    "peak_memory_mb": 0.0,
                    "average_cpu_percent": 0.0
                }
            }
        }
        
        try:
            # Initialize plugin if needed
            if not hasattr(plugin, "initialized") or not plugin.initialized:
                await plugin.initialize()
            
            # Run each test case
            for test_case in test_cases:
                case_result = await self._run_test_case(plugin, test_case)
                results["test_cases"].append(case_result)
                
                if case_result["status"] == TestStatus.PASSED:
                    results["passed_tests"] += 1
                elif case_result["status"] == TestStatus.SKIPPED:
                    results["skipped_tests"] += 1
                else:
                    results["failed_tests"] += 1
                    results["metrics"]["error_count"] += 1
                
                if case_result.get("warnings"):
                    results["metrics"]["warning_count"] += len(case_result["warnings"])
                
                # Update resource metrics
                results["metrics"]["resource_usage"]["peak_memory_mb"] = max(
                    results["metrics"]["resource_usage"]["peak_memory_mb"],
                    case_result.get("memory_usage", 0.0)
                )
            
            # Calculate final metrics
            results["metrics"]["execution_time"] = time.time() - start_time
            results["metrics"]["memory_usage"] = self._get_memory_usage()
            
            # Store results
            self._test_results[plugin.__class__.__name__] = results
            self._test_metrics[plugin.__class__.__name__] = results["metrics"]
            
            # Log to reflection system
            reflection_system.log_thought(
                "plugin_tester",
                f"Completed testing plugin {plugin.__class__.__name__}",
                {
                    "results": results,
                    "metrics": results["metrics"]
                }
            )
            
            self.logger.info(
                f"Completed testing plugin {plugin.__class__.__name__}: "
                f"{results['passed_tests']}/{results['total_tests']} tests passed"
            )
            
            return results
            
        except Exception as e:
            self.logger.error(f"Test execution failed: {str(e)}")
            results["error"] = str(e)
            results["traceback"] = traceback.format_exc()
            return results
    
    async def validate_plugin(self, plugin: 'Plugin') -> bool:
        """Validate a plugin's functionality.
        
        Args:
            plugin: The plugin to validate
            
        Returns:
            bool: True if validation passed
        """
        try:
            # Check required methods
            required_methods = ["initialize", "start", "stop", "execute", "cleanup"]
            for method in required_methods:
                if not hasattr(plugin, method):
                    self.logger.error(f"Missing required method: {method}")
                    return False
                if not asyncio.iscoroutinefunction(getattr(plugin, method)):
                    self.logger.error(f"Method {method} must be async")
                    return False
            
            # Check error handling
            if not hasattr(plugin, "handle_error"):
                self.logger.warning("Plugin missing error handling method")
            
            # Check documentation
            if not plugin.__doc__:
                self.logger.warning("Plugin missing documentation")
            
            # Test initialization
            try:
                await plugin.initialize()
            except Exception as e:
                self.logger.error(f"Initialization failed: {str(e)}")
                return False
            
            # Test cleanup
            try:
                await plugin.cleanup()
            except Exception as e:
                self.logger.error(f"Cleanup failed: {str(e)}")
                return False
            
            # Check resource management
            if not await self._check_resource_management(plugin):
                self.logger.error("Resource management validation failed")
                return False
            
            self._validation_results[plugin.__class__.__name__] = True
            return True
            
        except Exception as e:
            self.logger.error(f"Validation failed: {str(e)}")
            self._validation_results[plugin.__class__.__name__] = False
            return False
    
    async def _run_test_case(self, plugin: 'Plugin', test_case: Dict[str, Any]) -> Dict[str, Any]:
        """Run a single test case.
        
        Args:
            plugin: The plugin to test
            test_case: Test case to run
            
        Returns:
            Dict[str, Any]: Test case results
        """
        test_id = test_case.get("id", str(uuid.uuid4()))
        result = TestResult(
            test_id=test_id,
            status=TestStatus.RUNNING,
            start_time=datetime.now()
        )
        
        try:
            # Check resource availability
            if not await self._check_resource_availability():
                result.status = TestStatus.SKIPPED
                result.warnings.append("Insufficient system resources")
                return result.__dict__
            
            # Prepare test case
            input_data = test_case.get("input", {})
            expected_output = test_case.get("expected_output")
            timeout = test_case.get("timeout", self._resource_limits["max_execution_time"])
            
            # Run test
            start_time = time.time()
            output = await asyncio.wait_for(
                plugin.execute(input_data),
                timeout=timeout
            )
            execution_time = time.time() - start_time
            
            # Update result
            result.end_time = datetime.now()
            result.duration = execution_time
            result.memory_usage = self._get_memory_usage()
            result.output = output
            result.expected_output = expected_output
            
            # Validate result
            if expected_output is not None:
                if not self._compare_outputs(output, expected_output):
                    result.status = TestStatus.FAILED
                    result.error = "Output does not match expected result"
                else:
                    result.status = TestStatus.PASSED
            else:
                result.status = TestStatus.PASSED
            
            # Check for warnings
            if execution_time > test_case.get("max_execution_time", 5.0):
                result.warnings.append(f"Test execution time ({execution_time:.2f}s) exceeds threshold")
            
            if result.memory_usage > self._resource_limits["max_memory_mb"]:
                result.warnings.append(f"Memory usage ({result.memory_usage:.2f}MB) exceeds limit")
            
            return result.__dict__
            
        except asyncio.TimeoutError:
            result.status = TestStatus.TIMEOUT
            result.error = "Test case timed out"
            return result.__dict__
        except Exception as e:
            result.status = TestStatus.ERROR
            result.error = str(e)
            return result.__dict__
    
    async def _check_resource_management(self, plugin: 'Plugin') -> bool:
        """Check plugin's resource management capabilities.
        
        Args:
            plugin: Plugin to check
            
        Returns:
            bool: True if resource management is adequate
        """
        try:
            # Test memory cleanup
            initial_memory = self._get_memory_usage()
            
            # Create some load
            for _ in range(1000):
                await plugin.execute({"test": "data"})
            
            # Force garbage collection
            gc.collect()
            
            # Check memory usage
            final_memory = self._get_memory_usage()
            if final_memory > initial_memory * 1.5:  # Allow 50% growth
                self.logger.warning("Plugin may have memory leaks")
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Resource management check failed: {str(e)}")
            return False
    
    async def _check_resource_availability(self) -> bool:
        """Check if system has sufficient resources for testing.
        
        Returns:
            bool: True if resources are available
        """
        try:
            # Check memory
            memory = psutil.virtual_memory()
            if memory.available < self._resource_limits["max_memory_mb"] * 1024 * 1024:
                return False
            
            # Check CPU
            cpu_percent = psutil.cpu_percent()
            if cpu_percent > (100 - self._resource_limits["max_cpu_percent"]):
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Resource availability check failed: {str(e)}")
            return False
    
    def _compare_outputs(self, actual: Any, expected: Any) -> bool:
        """Compare actual and expected outputs.
        
        Args:
            actual: Actual output
            expected: Expected output
            
        Returns:
            bool: True if outputs match
        """
        if isinstance(expected, dict):
            if not isinstance(actual, dict):
                return False
            return all(
                self._compare_outputs(actual.get(k), v)
                for k, v in expected.items()
            )
        elif isinstance(expected, list):
            if not isinstance(actual, list):
                return False
            if len(actual) != len(expected):
                return False
            return all(
                self._compare_outputs(a, e)
                for a, e in zip(actual, expected)
            )
        return actual == expected
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB.
        
        Returns:
            float: Memory usage in MB
        """
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            return memory_info.rss / 1024 / 1024  # Convert to MB
        except Exception as e:
            self.logger.error(f"Failed to get memory usage: {str(e)}")
            return 0.0

# Global instance
plugin_tester = PluginTester() 