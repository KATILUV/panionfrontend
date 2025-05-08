"""
Testing Framework
Provides comprehensive testing capabilities for the system.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List, Set, Callable, Awaitable
from datetime import datetime
from pathlib import Path
import json
import yaml
import time
import traceback
from dataclasses import dataclass, field
from enum import Enum

from core.reflection import reflection_system
from core.service_locator import service_locator

class TestStatus(Enum):
    """Test execution status."""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    SKIPPED = "skipped"

@dataclass
class TestResult:
    """Test execution result."""
    test_id: str
    status: TestStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[float] = None
    error: Optional[str] = None
    error_traceback: Optional[str] = None
    metrics: Dict[str, Any] = field(default_factory=dict)

@dataclass
class TestCase:
    """Test case definition."""
    test_id: str
    name: str
    description: str
    component: str
    test_func: Callable[..., Awaitable[Any]]
    setup_func: Optional[Callable[..., Awaitable[None]]] = None
    teardown_func: Optional[Callable[..., Awaitable[None]]] = None
    dependencies: List[str] = field(default_factory=list)
    timeout: float = 30.0
    retries: int = 0
    tags: List[str] = field(default_factory=list)

class TestingFramework:
    """Provides comprehensive testing capabilities."""
    
    def __init__(self, config_path: str = "config/testing.yaml"):
        """Initialize the testing framework."""
        self.logger = logging.getLogger(__name__)
        self.config_path = Path(config_path)
        self.config = self._load_config()
        
        # Test state
        self._is_initialized = False
        self._test_cases: Dict[str, TestCase] = {}
        self._test_results: Dict[str, List[TestResult]] = {}
        self._running_tests: Set[str] = set()
        
        # Performance metrics
        self._performance_metrics = {}
        
        # Register with service locator
        service_locator.register_service('testing_framework', self)

    def _load_config(self) -> Dict[str, Any]:
        """Load testing configuration."""
        try:
            if not self.config_path.exists():
                raise FileNotFoundError(f"Config file not found: {self.config_path}")
            
            with open(self.config_path) as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.logger.error(f"Error loading testing config: {e}")
            return {}

    async def initialize(self) -> None:
        """Initialize the testing framework."""
        try:
            reflection_system.log_thought(
                "testing_initialization",
                "Initializing testing framework",
                {"stage": "begin"}
            )
            
            # Load test cases
            await self._load_test_cases()
            
            # Initialize performance metrics
            self._performance_metrics = {}
            
            self._is_initialized = True
            
            reflection_system.log_thought(
                "testing_initialization",
                "Testing framework initialized",
                {"stage": "complete"}
            )
            
        except Exception as e:
            reflection_system.log_thought(
                "testing_initialization",
                f"Error initializing testing framework: {str(e)}",
                {"error": str(e)}
            )
            raise

    async def _load_test_cases(self) -> None:
        """Load test cases from storage."""
        try:
            test_cases_path = Path("data/testing/test_cases.json")
            if test_cases_path.exists():
                with open(test_cases_path) as f:
                    test_cases_data = json.load(f)
                    for test_data in test_cases_data:
                        test_case = TestCase(
                            test_id=test_data['test_id'],
                            name=test_data['name'],
                            description=test_data['description'],
                            component=test_data['component'],
                            test_func=eval(test_data['test_func']),  # In a real system, use a safer method
                            setup_func=eval(test_data['setup_func']) if test_data.get('setup_func') else None,
                            teardown_func=eval(test_data['teardown_func']) if test_data.get('teardown_func') else None,
                            dependencies=test_data.get('dependencies', []),
                            timeout=test_data.get('timeout', 30.0),
                            retries=test_data.get('retries', 0),
                            tags=test_data.get('tags', [])
                        )
                        self._test_cases[test_case.test_id] = test_case
        except Exception as e:
            self.logger.error(f"Error loading test cases: {e}")

    async def _save_test_cases(self) -> None:
        """Save test cases to storage."""
        try:
            test_cases_path = Path("data/testing/test_cases.json")
            test_cases_path.parent.mkdir(parents=True, exist_ok=True)
            
            test_cases_data = []
            for test_case in self._test_cases.values():
                test_data = {
                    'test_id': test_case.test_id,
                    'name': test_case.name,
                    'description': test_case.description,
                    'component': test_case.component,
                    'test_func': test_case.test_func.__name__,
                    'dependencies': test_case.dependencies,
                    'timeout': test_case.timeout,
                    'retries': test_case.retries,
                    'tags': test_case.tags
                }
                if test_case.setup_func:
                    test_data['setup_func'] = test_case.setup_func.__name__
                if test_case.teardown_func:
                    test_data['teardown_func'] = test_case.teardown_func.__name__
                test_cases_data.append(test_data)
            
            with open(test_cases_path, 'w') as f:
                json.dump(test_cases_data, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving test cases: {e}")

    def register_test(self, test_case: TestCase) -> None:
        """Register a new test case."""
        self._test_cases[test_case.test_id] = test_case
        self._test_results[test_case.test_id] = []
        asyncio.create_task(self._save_test_cases())

    async def run_test(self, test_id: str) -> TestResult:
        """Run a single test case."""
        if test_id not in self._test_cases:
            raise ValueError(f"Test case not found: {test_id}")
        
        test_case = self._test_cases[test_id]
        
        # Check dependencies
        for dep_id in test_case.dependencies:
            if dep_id not in self._test_cases:
                raise ValueError(f"Dependency not found: {dep_id}")
            dep_results = self._test_results.get(dep_id, [])
            if not dep_results or dep_results[-1].status != TestStatus.PASSED:
                raise ValueError(f"Dependency not passed: {dep_id}")
        
        # Create test result
        result = TestResult(
            test_id=test_id,
            status=TestStatus.RUNNING,
            start_time=datetime.now()
        )
        self._test_results[test_id].append(result)
        self._running_tests.add(test_id)
        
        try:
            reflection_system.log_thought(
                "test_execution",
                f"Running test: {test_case.name}",
                {"test_id": test_id, "component": test_case.component}
            )
            
            # Run setup if exists
            if test_case.setup_func:
                await test_case.setup_func()
            
            # Run test with timeout
            start_time = time.time()
            try:
                async with asyncio.timeout(test_case.timeout):
                    await test_case.test_func()
            except asyncio.TimeoutError:
                result.status = TestStatus.ERROR
                result.error = f"Test timed out after {test_case.timeout} seconds"
            except Exception as e:
                result.status = TestStatus.FAILED
                result.error = str(e)
                result.error_traceback = traceback.format_exc()
            else:
                result.status = TestStatus.PASSED
            
            # Run teardown if exists
            if test_case.teardown_func:
                try:
                    await test_case.teardown_func()
                except Exception as e:
                    self.logger.error(f"Error in test teardown: {e}")
            
            # Update result
            result.end_time = datetime.now()
            result.duration = time.time() - start_time
            
            # Update performance metrics
            self._update_performance_metrics(test_case.component, result)
            
            reflection_system.log_thought(
                "test_execution",
                f"Test completed: {test_case.name}",
                {
                    "test_id": test_id,
                    "status": result.status.value,
                    "duration": result.duration
                }
            )
            
        except Exception as e:
            result.status = TestStatus.ERROR
            result.error = str(e)
            result.error_traceback = traceback.format_exc()
            result.end_time = datetime.now()
            result.duration = time.time() - start_time
            
            reflection_system.log_thought(
                "test_execution",
                f"Test error: {test_case.name}",
                {
                    "test_id": test_id,
                    "error": str(e)
                }
            )
        
        finally:
            self._running_tests.remove(test_id)
        
        return result

    async def run_tests(self, test_ids: Optional[List[str]] = None, tags: Optional[List[str]] = None) -> Dict[str, List[TestResult]]:
        """Run multiple test cases."""
        if not test_ids and not tags:
            test_ids = list(self._test_cases.keys())
        elif tags:
            test_ids = [
                test_id for test_id, test_case in self._test_cases.items()
                if any(tag in test_case.tags for tag in tags)
            ]
        
        results = {}
        for test_id in test_ids:
            try:
                result = await self.run_test(test_id)
                results[test_id] = [result]
            except Exception as e:
                self.logger.error(f"Error running test {test_id}: {e}")
        
        return results

    def _update_performance_metrics(self, component: str, result: TestResult) -> None:
        """Update performance metrics for a component."""
        if component not in self._performance_metrics:
            self._performance_metrics[component] = {
                'total_tests': 0,
                'passed_tests': 0,
                'failed_tests': 0,
                'error_tests': 0,
                'total_duration': 0.0,
                'avg_duration': 0.0
            }
        
        metrics = self._performance_metrics[component]
        metrics['total_tests'] += 1
        metrics['total_duration'] += result.duration or 0.0
        metrics['avg_duration'] = metrics['total_duration'] / metrics['total_tests']
        
        if result.status == TestStatus.PASSED:
            metrics['passed_tests'] += 1
        elif result.status == TestStatus.FAILED:
            metrics['failed_tests'] += 1
        elif result.status == TestStatus.ERROR:
            metrics['error_tests'] += 1

    async def get_test_results(self, test_id: Optional[str] = None) -> Dict[str, List[TestResult]]:
        """Get test results."""
        if test_id:
            return {test_id: self._test_results.get(test_id, [])}
        return self._test_results

    async def get_performance_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Get performance metrics."""
        return self._performance_metrics

    async def get_test_coverage(self) -> Dict[str, float]:
        """Get test coverage metrics."""
        coverage = {}
        for component in set(test_case.component for test_case in self._test_cases.values()):
            component_tests = [
                test_case for test_case in self._test_cases.values()
                if test_case.component == component
            ]
            passed_tests = sum(
                1 for test_case in component_tests
                if self._test_results.get(test_case.test_id, []) and
                self._test_results[test_case.test_id][-1].status == TestStatus.PASSED
            )
            coverage[component] = passed_tests / len(component_tests) if component_tests else 0.0
        return coverage

# Create singleton instance
testing_framework = TestingFramework() 