"""
Plugin Testing Framework
Provides a sandboxed environment for testing plugins with comprehensive error handling and retry mechanisms.
"""

import logging
import asyncio
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any, Optional, List, Set, Callable
from datetime import datetime
import json
import traceback
from dataclasses import dataclass, field

from .base import BasePlugin
from .manager import plugin_manager
from ..error_handling import error_handler, with_error_recovery
from ..shared_state import shared_state, ComponentState

@dataclass
class TestResult:
    """Result of a plugin test."""
    test_id: str
    plugin_id: str
    status: str  # passed, failed, error
    start_time: datetime
    end_time: datetime
    duration: float
    error_message: Optional[str] = None
    error_type: Optional[str] = None
    error_traceback: Optional[str] = None
    retry_count: int = 0
    resource_usage: Dict[str, float] = field(default_factory=dict)
    test_data: Dict[str, Any] = field(default_factory=dict)

@dataclass
class TestCase:
    """Test case for a plugin."""
    name: str
    description: str
    input_data: Dict[str, Any]
    expected_output: Dict[str, Any]
    timeout: float = 30.0
    max_retries: int = 3
    required_capabilities: Set[str] = field(default_factory=set)
    resource_limits: Dict[str, float] = field(default_factory=dict)

class PluginTester:
    """Manages plugin testing in a sandboxed environment."""
    
    def __init__(self):
        """Initialize the plugin tester."""
        self.logger = logging.getLogger("PluginTester")
        self._setup_logging()
        
        # Test registry
        self._test_cases: Dict[str, List[TestCase]] = {}
        self._test_results: Dict[str, List[TestResult]] = {}
        
        # Resource monitoring
        self._resource_monitors: Dict[str, Dict[str, float]] = {}
        
        # Initialize shared state
        shared_state.register_component("plugin_tester", self)
    
    def _setup_logging(self) -> None:
        """Setup plugin tester logging."""
        log_file = Path("logs") / "plugin_tester.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    @with_error_recovery
    async def run_tests(self, plugin_id: str, test_cases: Optional[List[TestCase]] = None) -> List[TestResult]:
        """Run tests for a plugin.
        
        Args:
            plugin_id: Plugin identifier
            test_cases: Optional list of test cases to run
            
        Returns:
            List[TestResult]: Test results
        """
        try:
            if plugin_id not in plugin_manager._plugins:
                raise ValueError(f"Plugin {plugin_id} not found")
            
            # Get test cases
            if test_cases is None:
                test_cases = self._test_cases.get(plugin_id, [])
            
            if not test_cases:
                self.logger.warning(f"No test cases found for plugin {plugin_id}")
                return []
            
            # Create sandbox environment
            with self._create_sandbox(plugin_id) as sandbox:
                results = []
                for test_case in test_cases:
                    result = await self._run_test_case(plugin_id, test_case, sandbox)
                    results.append(result)
                    
                    # Store result
                    if plugin_id not in self._test_results:
                        self._test_results[plugin_id] = []
                    self._test_results[plugin_id].append(result)
                
                return results
            
        except Exception as e:
            self.logger.error(f"Failed to run tests for plugin {plugin_id}: {str(e)}")
            return []
    
    def _create_sandbox(self, plugin_id: str) -> 'SandboxContext':
        """Create a sandbox environment for testing.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            SandboxContext: Sandbox context manager
        """
        return SandboxContext(plugin_id, self)
    
    async def _run_test_case(
        self,
        plugin_id: str,
        test_case: TestCase,
        sandbox: 'SandboxContext'
    ) -> TestResult:
        """Run a single test case.
        
        Args:
            plugin_id: Plugin identifier
            test_case: Test case to run
            sandbox: Sandbox context
            
        Returns:
            TestResult: Test result
        """
        start_time = datetime.now()
        result = TestResult(
            test_id=f"{plugin_id}_{test_case.name}_{start_time.isoformat()}",
            plugin_id=plugin_id,
            status="error",
            start_time=start_time,
            end_time=start_time,
            duration=0.0
        )
        
        try:
            # Check capabilities
            if not self._check_capabilities(plugin_id, test_case.required_capabilities):
                raise ValueError("Plugin does not meet required capabilities")
            
            # Set resource limits
            self._set_resource_limits(plugin_id, test_case.resource_limits)
            
            # Run test with retries
            for attempt in range(test_case.max_retries):
                try:
                    # Execute test
                    output = await self._execute_test(plugin_id, test_case, sandbox)
                    
                    # Validate output
                    if self._validate_output(output, test_case.expected_output):
                        result.status = "passed"
                    else:
                        result.status = "failed"
                        result.error_message = "Output validation failed"
                    
                    break
                    
                except Exception as e:
                    result.retry_count = attempt + 1
                    if attempt == test_case.max_retries - 1:
                        raise
                    await asyncio.sleep(1)  # Wait before retry
            
        except Exception as e:
            result.status = "error"
            result.error_message = str(e)
            result.error_type = type(e).__name__
            result.error_traceback = traceback.format_exc()
            
        finally:
            # Update result
            result.end_time = datetime.now()
            result.duration = (result.end_time - result.start_time).total_seconds()
            result.resource_usage = self._get_resource_usage(plugin_id)
            result.test_data = {
                "input": test_case.input_data,
                "expected": test_case.expected_output
            }
            
            # Log result
            self._log_test_result(result)
            
        return result
    
    def _check_capabilities(self, plugin_id: str, required_capabilities: Set[str]) -> bool:
        """Check if plugin meets required capabilities.
        
        Args:
            plugin_id: Plugin identifier
            required_capabilities: Set of required capabilities
            
        Returns:
            bool: True if plugin meets requirements
        """
        try:
            plugin = plugin_manager._plugins[plugin_id]
            plugin_capabilities = set(plugin.metadata.tags)
            return required_capabilities.issubset(plugin_capabilities)
            
        except Exception as e:
            self.logger.error(f"Failed to check capabilities: {str(e)}")
            return False
    
    def _set_resource_limits(self, plugin_id: str, limits: Dict[str, float]) -> None:
        """Set resource limits for plugin testing.
        
        Args:
            plugin_id: Plugin identifier
            limits: Resource limits
        """
        try:
            self._resource_monitors[plugin_id] = limits
            
        except Exception as e:
            self.logger.error(f"Failed to set resource limits: {str(e)}")
    
    async def _execute_test(
        self,
        plugin_id: str,
        test_case: TestCase,
        sandbox: 'SandboxContext'
    ) -> Dict[str, Any]:
        """Execute a test case.
        
        Args:
            plugin_id: Plugin identifier
            test_case: Test case to execute
            sandbox: Sandbox context
            
        Returns:
            Dict[str, Any]: Test output
        """
        try:
            # Get plugin instance
            plugin = plugin_manager._plugins[plugin_id]
            
            # Execute test
            async with asyncio.timeout(test_case.timeout):
                output = await plugin.execute(test_case.input_data)
            
            return output
            
        except asyncio.TimeoutError:
            raise TimeoutError(f"Test case {test_case.name} timed out after {test_case.timeout} seconds")
            
        except Exception as e:
            raise RuntimeError(f"Test execution failed: {str(e)}")
    
    def _validate_output(self, output: Dict[str, Any], expected: Dict[str, Any]) -> bool:
        """Validate test output against expected output.
        
        Args:
            output: Actual output
            expected: Expected output
            
        Returns:
            bool: True if output matches expected
        """
        try:
            # Check status
            if output.get("status") != expected.get("status"):
                return False
            
            # Check result
            if "result" in expected:
                if "result" not in output:
                    return False
                if not self._compare_values(output["result"], expected["result"]):
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Output validation failed: {str(e)}")
            return False
    
    def _compare_values(self, actual: Any, expected: Any) -> bool:
        """Compare actual and expected values.
        
        Args:
            actual: Actual value
            expected: Expected value
            
        Returns:
            bool: True if values match
        """
        try:
            # Handle dictionaries
            if isinstance(expected, dict):
                if not isinstance(actual, dict):
                    return False
                return all(
                    self._compare_values(actual.get(k), v)
                    for k, v in expected.items()
                )
            
            # Handle lists
            if isinstance(expected, list):
                if not isinstance(actual, list):
                    return False
                if len(actual) != len(expected):
                    return False
                return all(
                    self._compare_values(a, e)
                    for a, e in zip(actual, expected)
                )
            
            # Handle other types
            return actual == expected
            
        except Exception as e:
            self.logger.error(f"Value comparison failed: {str(e)}")
            return False
    
    def _get_resource_usage(self, plugin_id: str) -> Dict[str, float]:
        """Get resource usage for a plugin.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Dict[str, float]: Resource usage
        """
        try:
            return plugin_manager._resource_usage.get(plugin_id, {})
            
        except Exception as e:
            self.logger.error(f"Failed to get resource usage: {str(e)}")
            return {}
    
    def _log_test_result(self, result: TestResult) -> None:
        """Log test result.
        
        Args:
            result: Test result to log
        """
        try:
            # Log to file
            log_file = Path("logs") / "test_results" / f"{result.plugin_id}.json"
            log_file.parent.mkdir(exist_ok=True)
            
            with open(log_file, "a") as f:
                json.dump(asdict(result), f)
                f.write("\n")
            
            # Log to console
            if result.status == "passed":
                self.logger.info(f"Test {result.test_id} passed")
            elif result.status == "failed":
                self.logger.warning(f"Test {result.test_id} failed: {result.error_message}")
            else:
                self.logger.error(f"Test {result.test_id} error: {result.error_message}")
            
        except Exception as e:
            self.logger.error(f"Failed to log test result: {str(e)}")
    
    def add_test_case(self, plugin_id: str, test_case: TestCase) -> None:
        """Add a test case for a plugin.
        
        Args:
            plugin_id: Plugin identifier
            test_case: Test case to add
        """
        try:
            if plugin_id not in self._test_cases:
                self._test_cases[plugin_id] = []
            self._test_cases[plugin_id].append(test_case)
            
        except Exception as e:
            self.logger.error(f"Failed to add test case: {str(e)}")
    
    def get_test_results(self, plugin_id: str) -> List[TestResult]:
        """Get test results for a plugin.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            List[TestResult]: Test results
        """
        try:
            return self._test_results.get(plugin_id, [])
            
        except Exception as e:
            self.logger.error(f"Failed to get test results: {str(e)}")
            return []

class SandboxContext:
    """Context manager for plugin testing sandbox."""
    
    def __init__(self, plugin_id: str, tester: PluginTester):
        """Initialize sandbox context.
        
        Args:
            plugin_id: Plugin identifier
            tester: Plugin tester instance
        """
        self.plugin_id = plugin_id
        self.tester = tester
        self.temp_dir = None
    
    def __enter__(self):
        """Enter sandbox context."""
        try:
            # Create temporary directory
            self.temp_dir = tempfile.mkdtemp(prefix=f"plugin_test_{self.plugin_id}_")
            
            # Setup sandbox environment
            self._setup_sandbox()
            
            return self
            
        except Exception as e:
            self.tester.logger.error(f"Failed to create sandbox: {str(e)}")
            raise
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit sandbox context."""
        try:
            # Cleanup sandbox
            if self.temp_dir:
                shutil.rmtree(self.temp_dir)
            
        except Exception as e:
            self.tester.logger.error(f"Failed to cleanup sandbox: {str(e)}")
    
    def _setup_sandbox(self) -> None:
        """Setup sandbox environment."""
        try:
            # Create necessary directories
            (Path(self.temp_dir) / "data").mkdir()
            (Path(self.temp_dir) / "logs").mkdir()
            (Path(self.temp_dir) / "cache").mkdir()
            
            # Set environment variables
            import os
            os.environ["PLUGIN_TEST_DIR"] = self.temp_dir
            os.environ["PLUGIN_TEST_MODE"] = "true"
            
        except Exception as e:
            self.tester.logger.error(f"Failed to setup sandbox: {str(e)}")
            raise

# Create global plugin tester instance
plugin_tester = PluginTester() 