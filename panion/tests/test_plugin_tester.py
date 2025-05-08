"""
Tests for the enhanced plugin tester.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from pathlib import Path
import docker
from docker.errors import DockerException
import json
import ast
import time
from datetime import datetime
import psutil
import gc

from core.plugin_tester import (
    PluginTester,
    TestResult,
    run_plugin_in_docker,
    test_plugin_safety,
    DockerTestError
)

@pytest.fixture
def plugin_tester():
    """Create a plugin tester instance."""
    return PluginTester()

@pytest.fixture
def mock_plugin():
    """Create a mock plugin for testing."""
    class MockPlugin:
        def __init__(self):
            self.__name__ = "test_plugin"
            self.__file__ = "/tmp/test_plugin.py"
            
        async def execute(self, input_data):
            return {"result": "success", "data": input_data}
            
    return MockPlugin()

@pytest.fixture
def test_case():
    """Create a test case."""
    return {
        "id": "test_case_1",
        "input": {"test": "data"},
        "expected_output": {"result": "success", "data": {"test": "data"}}
    }

@pytest.fixture
def mock_docker_client():
    """Create a mock Docker client."""
    mock = Mock()
    mock.containers = Mock()
    mock.containers.run = Mock()
    return mock

@pytest.fixture
def mock_container():
    """Create a mock Docker container."""
    mock = Mock()
    mock.wait = Mock(return_value={"StatusCode": 0})
    mock.logs = Mock(return_value=b"test output")
    mock.stop = Mock()
    mock.remove = Mock()
    return mock

@pytest.mark.asyncio
async def test_plugin_testing_success(plugin_tester, mock_plugin, test_case):
    """Test successful plugin testing."""
    results = await plugin_tester.test_plugin(
        "test_plugin",
        [test_case],
        sandbox=True,
        regression=True,
        performance=True,
        security=True
    )
    
    assert results["status"] == "success"
    report = results["report"]
    assert report["total_tests"] == 1
    assert report["passed"] == 1
    assert report["failed"] == 0
    assert report["errors"] == 0
    assert report["security_failures"] == 0
    assert report["regression_failures"] == 0
    assert report["performance_failures"] == 0

@pytest.mark.asyncio
async def test_plugin_testing_security_failure(plugin_tester, tmp_path):
    """Test plugin testing with security failure."""
    # Create plugin with dangerous import
    plugin_file = tmp_path / "dangerous_plugin.py"
    plugin_file.write_text("""
import os
def execute(input_data):
    os.system("rm -rf /")
    return {"result": "success"}
    """)
    
    # Create test case
    test_case = {
        "id": "security_test",
        "input": {},
        "expected_output": {"result": "success"}
    }
    
    # Test plugin
    results = await plugin_tester.test_plugin(
        "dangerous_plugin",
        [test_case],
        security=True
    )
    
    assert results["status"] == "success"  # Test itself succeeds
    report = results["report"]
    assert report["security_failures"] == 1
    assert "Dangerous import detected: os" in str(report["test_results"][0]["security_issues"])

@pytest.mark.asyncio
async def test_plugin_testing_regression_failure(plugin_tester, mock_plugin, test_case):
    """Test plugin testing with regression failure."""
    # Create baseline
    baseline_dir = plugin_tester.baseline_dir
    baseline_dir.mkdir(exist_ok=True)
    
    # Run first test to create baseline
    await plugin_tester.test_plugin(
        "test_plugin",
        [test_case],
        regression=True
    )
    
    # Modify plugin behavior
    async def modified_execute(input_data):
        return {"result": "modified", "data": input_data}
    mock_plugin.execute = modified_execute
    
    # Run test again
    results = await plugin_tester.test_plugin(
        "test_plugin",
        [test_case],
        regression=True
    )
    
    assert results["status"] == "success"  # Test itself succeeds
    report = results["report"]
    assert report["regression_failures"] == 1

@pytest.mark.asyncio
async def test_plugin_testing_performance_failure(plugin_tester, mock_plugin, test_case):
    """Test plugin testing with performance failure."""
    # Create slow plugin
    async def slow_execute(input_data):
        time.sleep(2)  # Exceed 1 second threshold
        return {"result": "success", "data": input_data}
    mock_plugin.execute = slow_execute
    
    # Test plugin
    results = await plugin_tester.test_plugin(
        "test_plugin",
        [test_case],
        performance=True
    )
    
    assert results["status"] == "success"  # Test itself succeeds
    report = results["report"]
    assert report["performance_failures"] == 1
    assert report["average_duration"] > 1.0

@pytest.mark.asyncio
async def test_plugin_testing_memory_failure(plugin_tester, mock_plugin, test_case):
    """Test plugin testing with memory failure."""
    # Create memory-intensive plugin
    async def memory_intensive_execute(input_data):
        # Create large data structure
        data = ["x" * 1024 * 1024 for _ in range(200)]  # ~200MB
        return {"result": "success", "data": data}
    mock_plugin.execute = memory_intensive_execute
    
    # Test plugin
    results = await plugin_tester.test_plugin(
        "test_plugin",
        [test_case],
        performance=True
    )
    
    assert results["status"] == "success"  # Test itself succeeds
    report = results["report"]
    assert report["performance_failures"] == 1
    assert report["average_memory"] > 100  # Exceed 100MB threshold

@pytest.mark.asyncio
async def test_plugin_testing_multiple_failures(plugin_tester, tmp_path):
    """Test plugin testing with multiple types of failures."""
    # Create problematic plugin
    plugin_file = tmp_path / "problematic_plugin.py"
    plugin_file.write_text("""
import os
import time

def execute(input_data):
    time.sleep(2)  # Performance issue
    data = ["x" * 1024 * 1024 for _ in range(200)]  # Memory issue
    os.system("echo test")  # Security issue
    return {"result": "modified", "data": data}  # Regression issue
    """)
    
    # Create test case
    test_case = {
        "id": "multiple_failures_test",
        "input": {},
        "expected_output": {"result": "success"}
    }
    
    # Test plugin
    results = await plugin_tester.test_plugin(
        "problematic_plugin",
        [test_case],
        sandbox=True,
        regression=True,
        performance=True,
        security=True
    )
    
    assert results["status"] == "success"  # Test itself succeeds
    report = results["report"]
    assert report["security_failures"] == 1
    assert report["regression_failures"] == 1
    assert report["performance_failures"] == 1

@pytest.mark.asyncio
async def test_plugin_testing_reflection(plugin_tester, mock_plugin, test_case):
    """Test that plugin testing results are stored in reflection system."""
    # Run test
    results = await plugin_tester.test_plugin(
        "test_plugin",
        [test_case]
    )
    
    # Get reflection
    reflections = await plugin_tester.reflection_system.search_reflections(
        context="plugin_testing",
        tags=["plugin_test"]
    )
    
    assert len(reflections) > 0
    latest = reflections[0]
    assert latest.context == "plugin_testing"
    assert latest.type == "plugin_analysis"
    assert "test_plugin" in latest.content["plugin_name"]
    assert latest.content["total_tests"] == 1

@pytest.mark.asyncio
async def test_plugin_testing_error_handling(plugin_tester, mock_plugin, test_case):
    """Test plugin testing error handling."""
    # Create plugin that raises exception
    async def error_execute(input_data):
        raise ValueError("Test error")
    mock_plugin.execute = error_execute
    
    # Test plugin
    results = await plugin_tester.test_plugin(
        "test_plugin",
        [test_case]
    )
    
    assert results["status"] == "success"  # Test itself succeeds
    report = results["report"]
    assert report["errors"] == 1
    assert "Test error" in report["test_results"][0]["error"]

@pytest.mark.asyncio
async def test_plugin_testing_invalid_plugin(plugin_tester, test_case):
    """Test plugin testing with invalid plugin."""
    results = await plugin_tester.test_plugin(
        "nonexistent_plugin",
        [test_case]
    )
    
    assert results["status"] == "failure"
    assert "Failed to load plugin" in results["error"]

@pytest.mark.asyncio
async def test_plugin_testing_empty_test_cases(plugin_tester, mock_plugin):
    """Test plugin testing with empty test cases."""
    results = await plugin_tester.test_plugin(
        "test_plugin",
        []
    )
    
    assert results["status"] == "success"
    report = results["report"]
    assert report["total_tests"] == 0
    assert report["passed"] == 0
    assert report["failed"] == 0
    assert report["errors"] == 0

@pytest.mark.asyncio
async def test_run_plugin_in_docker_success(mock_docker_client, mock_container, tmp_path):
    """Test successful plugin execution in Docker."""
    # Setup mock container
    mock_docker_client.containers.run.return_value = mock_container
    
    # Create test plugin directory
    plugin_dir = tmp_path / "test_plugin"
    plugin_dir.mkdir()
    (plugin_dir / "test.py").write_text("print('test')")
    
    # Test plugin execution
    with patch("docker.from_env", return_value=mock_docker_client):
        stdout, stderr, exit_code = await run_plugin_in_docker(
            str(plugin_dir),
            "python test.py"
        )
        
    # Verify result
    assert stdout == "test output"
    assert stderr == ""
    assert exit_code == 0
    
    # Verify Docker client calls
    mock_docker_client.containers.run.assert_called_once()
    mock_container.wait.assert_called_once()
    mock_container.logs.assert_called()
    mock_container.remove.assert_called_once()

@pytest.mark.asyncio
async def test_run_plugin_in_docker_timeout(mock_docker_client, mock_container, tmp_path):
    """Test plugin execution timeout."""
    # Setup mock container to simulate hanging
    mock_docker_client.containers.run.return_value = mock_container
    mock_container.wait = AsyncMock(side_effect=asyncio.TimeoutError())
    
    # Create test plugin directory
    plugin_dir = tmp_path / "test_plugin"
    plugin_dir.mkdir()
    (plugin_dir / "test.py").write_text("print('test')")
    
    # Test plugin execution with short timeout
    with patch("docker.from_env", return_value=mock_docker_client):
        with pytest.raises(TimeoutError):
            await run_plugin_in_docker(
                str(plugin_dir),
                "python test.py",
                timeout=1
            )
            
    # Verify container was stopped and removed
    mock_container.stop.assert_called_once()
    mock_container.remove.assert_called_once()

@pytest.mark.asyncio
async def test_run_plugin_in_docker_error(mock_docker_client, tmp_path):
    """Test Docker error handling."""
    # Setup mock to raise Docker error
    mock_docker_client.containers.run.side_effect = DockerException("Test error")
    
    # Create test plugin directory
    plugin_dir = tmp_path / "test_plugin"
    plugin_dir.mkdir()
    
    # Test plugin execution
    with patch("docker.from_env", return_value=mock_docker_client):
        with pytest.raises(DockerTestError, match="Container creation failed"):
            await run_plugin_in_docker(
                str(plugin_dir),
                "python test.py"
            )

@pytest.mark.asyncio
async def test_run_plugin_in_docker_invalid_dir():
    """Test plugin execution with invalid directory."""
    with pytest.raises(DockerTestError, match="Plugin directory not found"):
        await run_plugin_in_docker(
            "/nonexistent/dir",
            "python test.py"
        )

def test_test_plugin_safety_success(tmp_path):
    """Test successful plugin safety check."""
    # Create test plugin directory
    plugin_dir = tmp_path / "test_plugin"
    plugin_dir.mkdir()
    
    # Create requirements.txt
    (plugin_dir / "requirements.txt").write_text("requests==2.28.1")
    
    # Create safe plugin file
    (plugin_dir / "plugin.py").write_text("""
import requests
def process_data(data):
    return data.upper()
    """)
    
    # Test safety check
    assert test_plugin_safety(str(plugin_dir))

def test_test_plugin_safety_missing_requirements(tmp_path):
    """Test plugin safety check with missing requirements.txt."""
    # Create test plugin directory without requirements.txt
    plugin_dir = tmp_path / "test_plugin"
    plugin_dir.mkdir()
    
    # Test safety check
    assert not test_plugin_safety(str(plugin_dir))

def test_test_plugin_safety_dangerous_imports(tmp_path):
    """Test plugin safety check with dangerous imports."""
    # Create test plugin directory
    plugin_dir = tmp_path / "test_plugin"
    plugin_dir.mkdir()
    
    # Create requirements.txt
    (plugin_dir / "requirements.txt").write_text("requests==2.28.1")
    
    # Create plugin with dangerous import
    (plugin_dir / "plugin.py").write_text("""
import os
os.system("rm -rf /")  # Dangerous!
    """)
    
    # Test safety check
    assert not test_plugin_safety(str(plugin_dir))

def test_test_plugin_safety_invalid_dir():
    """Test plugin safety check with invalid directory."""
    assert not test_plugin_safety("/nonexistent/dir")

@pytest.mark.asyncio
async def test_plugin_testing_failure_categories(plugin_tester, tmp_path):
    """Test plugin testing with different types of failures and error categorization."""
    # Create test plugin with various failure scenarios
    plugin_file = tmp_path / "failing_plugin.py"
    plugin_file.write_text("""
import time
import sys
import json

def execute(input_data):
    error_type = input_data.get('error_type', 'unknown')
    
    if error_type == 'timeout':
        time.sleep(5)  # Exceed timeout
        return {"result": "success"}
        
    elif error_type == 'memory':
        # Create large data structure
        data = ["x" * 1024 * 1024 for _ in range(500)]  # ~500MB
        return {"result": "success", "data": data}
        
    elif error_type == 'invalid_input':
        if not isinstance(input_data.get('required_field'), str):
            raise ValueError("Invalid input: required_field must be a string")
        return {"result": "success"}
        
    elif error_type == 'runtime':
        raise RuntimeError("Unexpected runtime error")
        
    elif error_type == 'import':
        import nonexistent_module
        
    elif error_type == 'output':
        return {"result": "unexpected"}  # Different from expected
        
    else:
        raise Exception("Unknown error type")
    """)
    
    # Test cases for different failure types
    test_cases = [
        {
            "id": "timeout_test",
            "input": {"error_type": "timeout"},
            "expected_output": {"result": "success"},
            "timeout": 1  # 1 second timeout
        },
        {
            "id": "memory_test",
            "input": {"error_type": "memory"},
            "expected_output": {"result": "success"},
            "max_memory": 100  # 100MB limit
        },
        {
            "id": "invalid_input_test",
            "input": {"error_type": "invalid_input", "required_field": 123},
            "expected_output": {"result": "success"}
        },
        {
            "id": "runtime_test",
            "input": {"error_type": "runtime"},
            "expected_output": {"result": "success"}
        },
        {
            "id": "import_test",
            "input": {"error_type": "import"},
            "expected_output": {"result": "success"}
        },
        {
            "id": "output_test",
            "input": {"error_type": "output"},
            "expected_output": {"result": "success"}
        }
    ]
    
    # Test plugin
    results = await plugin_tester.test_plugin(
        "failing_plugin",
        test_cases,
        sandbox=True,
        performance=True
    )
    
    # Verify results
    assert results["status"] == "success"  # Test itself succeeds
    report = results["report"]
    
    # Check failure categorization
    assert report["timeout_failures"] == 1
    assert report["memory_failures"] == 1
    assert report["input_validation_failures"] == 1
    assert report["runtime_failures"] == 1
    assert report["import_failures"] == 1
    assert report["output_validation_failures"] == 1
    
    # Verify error details in test results
    test_results = report["test_results"]
    
    # Check timeout test
    timeout_test = next(t for t in test_results if t["test_id"] == "timeout_test")
    assert timeout_test["status"] == "timeout_failure"
    assert "exceeded timeout" in timeout_test["error"].lower()
    
    # Check memory test
    memory_test = next(t for t in test_results if t["test_id"] == "memory_test")
    assert memory_test["status"] == "memory_failure"
    assert memory_test["memory_usage"] > 100
    
    # Check invalid input test
    input_test = next(t for t in test_results if t["test_id"] == "invalid_input_test")
    assert input_test["status"] == "input_validation_failure"
    assert "invalid input" in input_test["error"].lower()
    
    # Check runtime test
    runtime_test = next(t for t in test_results if t["test_id"] == "runtime_test")
    assert runtime_test["status"] == "runtime_failure"
    assert "unexpected runtime error" in runtime_test["error"]
    
    # Check import test
    import_test = next(t for t in test_results if t["test_id"] == "import_test")
    assert import_test["status"] == "import_failure"
    assert "nonexistent_module" in import_test["error"]
    
    # Check output test
    output_test = next(t for t in test_results if t["test_id"] == "output_test")
    assert output_test["status"] == "output_validation_failure"
    assert "unexpected output" in output_test["error"].lower()

def test_plugin_performance(self):
    """Test plugin performance metrics and thresholds."""
    # Create test plugin
    plugin = self._create_test_plugin()
    
    # Define performance thresholds
    performance_thresholds = {
        'execution_time': 1.0,  # seconds
        'memory_usage': 100 * 1024 * 1024,  # 100MB
        'cpu_usage': 50.0,  # percentage
        'response_time': 0.5,  # seconds
        'throughput': 100  # requests per second
    }
    
    # Run performance tests
    test_cases = [
        {
            'name': 'basic_operation',
            'input': {'data': 'test'},
            'expected_metrics': {
                'execution_time': {'max': 0.1},
                'memory_usage': {'max': 50 * 1024 * 1024},
                'cpu_usage': {'max': 30.0}
            }
        },
        {
            'name': 'large_data_operation',
            'input': {'data': 'x' * 1000000},
            'expected_metrics': {
                'execution_time': {'max': 0.5},
                'memory_usage': {'max': 200 * 1024 * 1024},
                'cpu_usage': {'max': 50.0}
            }
        },
        {
            'name': 'concurrent_operations',
            'input': {'data': 'test', 'concurrent': True},
            'expected_metrics': {
                'throughput': {'min': 50},
                'response_time': {'max': 0.2}
            }
        }
    ]
    
    results = []
    for test_case in test_cases:
        # Run test case
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss
        start_cpu = psutil.Process().cpu_percent()
        
        result = plugin.execute(test_case['input'])
        
        end_time = time.time()
        end_memory = psutil.Process().memory_info().rss
        end_cpu = psutil.Process().cpu_percent()
        
        # Calculate metrics
        execution_time = end_time - start_time
        memory_usage = end_memory - start_memory
        cpu_usage = end_cpu - start_cpu
        
        # Verify metrics against thresholds
        metrics = {
            'execution_time': execution_time,
            'memory_usage': memory_usage,
            'cpu_usage': cpu_usage
        }
        
        # Check each metric
        for metric, value in metrics.items():
            if metric in test_case['expected_metrics']:
                threshold = test_case['expected_metrics'][metric]
                if 'max' in threshold:
                    self.assertLessEqual(
                        value,
                        threshold['max'],
                        f"{metric} exceeded maximum threshold: {value} > {threshold['max']}"
                    )
                if 'min' in threshold:
                    self.assertGreaterEqual(
                        value,
                        threshold['min'],
                        f"{metric} below minimum threshold: {value} < {threshold['min']}"
                    )
        
        results.append({
            'name': test_case['name'],
            'metrics': metrics,
            'success': result['status'] == 'success'
        })
    
    # Verify overall performance
    self.assertTrue(
        all(r['success'] for r in results),
        "Not all performance tests passed"
    )
    
    # Log performance results
    self.logger.info(
        "Performance test results",
        extra={
            'results': results,
            'thresholds': performance_thresholds
        }
    )

def test_memory_management(self):
    """Test plugin memory management and cleanup."""
    # Create test plugin
    plugin = self._create_test_plugin()
    
    # Track memory usage
    initial_memory = psutil.Process().memory_info().rss
    
    # Run memory-intensive operations
    for i in range(10):
        # Execute plugin with increasing data size
        data = 'x' * (1024 * 1024 * i)  # 1MB increments
        result = plugin.execute({'data': data})
        self.assertEqual(result['status'], 'success')
        
        # Force garbage collection
        gc.collect()
        
        # Check memory usage
        current_memory = psutil.Process().memory_info().rss
        memory_increase = current_memory - initial_memory
        
        # Verify memory is being managed
        self.assertLess(
            memory_increase,
            200 * 1024 * 1024,  # 200MB max increase
            f"Memory usage too high after iteration {i}: {memory_increase / 1024 / 1024}MB"
        )
    
    # Final cleanup
    plugin.cleanup()
    gc.collect()
    
    # Verify memory is released
    final_memory = psutil.Process().memory_info().rss
    memory_difference = final_memory - initial_memory
    
    self.assertLess(
        memory_difference,
        50 * 1024 * 1024,  # 50MB max difference
        f"Memory not properly cleaned up: {memory_difference / 1024 / 1024}MB difference"
    )
    
    # Log memory test results
    self.logger.info(
        "Memory test results",
        extra={
            'initial_memory': initial_memory,
            'final_memory': final_memory,
            'memory_difference': memory_difference
        }
    ) 