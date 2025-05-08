"""
Tests for the plugin testing framework.
"""

import pytest
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from core.plugin.testing import PluginTester, TestCase, TestResult
from core.plugin.base import BasePlugin, PluginMetadata

class TestPlugin(BasePlugin):
    """Test plugin for testing the testing framework."""
    
    def __init__(self):
        """Initialize test plugin."""
        super().__init__(
            metadata=PluginMetadata(
                name="test_plugin",
                version="1.0.0",
                description="Test plugin for testing framework",
                author="Test Author",
                tags=["test", "example"],
                dependencies=[],
                score=1.0,
                last_updated=datetime.now()
            )
        )
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute test plugin.
        
        Args:
            input_data: Input data
            
        Returns:
            Dict[str, Any]: Output data
        """
        # Simulate processing
        await asyncio.sleep(0.1)
        
        # Return result
        return {
            "status": "success",
            "result": {
                "input": input_data,
                "processed": True
            }
        }

@pytest.fixture
def plugin_tester():
    """Create plugin tester fixture."""
    return PluginTester()

@pytest.fixture
def test_plugin():
    """Create test plugin fixture."""
    return TestPlugin()

@pytest.mark.asyncio
async def test_plugin_testing_basic(plugin_tester, test_plugin):
    """Test basic plugin testing functionality."""
    # Add test case
    test_case = TestCase(
        name="basic_test",
        description="Basic test case",
        input_data={"test": "data"},
        expected_output={
            "status": "success",
            "result": {
                "input": {"test": "data"},
                "processed": True
            }
        }
    )
    
    # Register plugin
    plugin_id = "test_plugin"
    plugin_tester.add_test_case(plugin_id, test_case)
    
    # Run test
    results = await plugin_tester.run_tests(plugin_id)
    
    # Verify results
    assert len(results) == 1
    result = results[0]
    assert result.status == "passed"
    assert result.plugin_id == plugin_id
    assert result.test_id.startswith(plugin_id)
    assert result.duration > 0
    assert result.error_message is None

@pytest.mark.asyncio
async def test_plugin_testing_timeout(plugin_tester, test_plugin):
    """Test plugin testing timeout handling."""
    # Add test case with short timeout
    test_case = TestCase(
        name="timeout_test",
        description="Test case with timeout",
        input_data={"test": "data"},
        expected_output={
            "status": "success",
            "result": {
                "input": {"test": "data"},
                "processed": True
            }
        },
        timeout=0.01  # Very short timeout
    )
    
    # Register plugin
    plugin_id = "test_plugin"
    plugin_tester.add_test_case(plugin_id, test_case)
    
    # Run test
    results = await plugin_tester.run_tests(plugin_id)
    
    # Verify results
    assert len(results) == 1
    result = results[0]
    assert result.status == "error"
    assert result.error_type == "TimeoutError"
    assert "timed out" in result.error_message

@pytest.mark.asyncio
async def test_plugin_testing_retry(plugin_tester, test_plugin):
    """Test plugin testing retry mechanism."""
    # Add test case with retries
    test_case = TestCase(
        name="retry_test",
        description="Test case with retries",
        input_data={"test": "data"},
        expected_output={
            "status": "success",
            "result": {
                "input": {"test": "data"},
                "processed": True
            }
        },
        max_retries=3
    )
    
    # Register plugin
    plugin_id = "test_plugin"
    plugin_tester.add_test_case(plugin_id, test_case)
    
    # Run test
    results = await plugin_tester.run_tests(plugin_id)
    
    # Verify results
    assert len(results) == 1
    result = results[0]
    assert result.status == "passed"
    assert result.retry_count == 0  # No retries needed

@pytest.mark.asyncio
async def test_plugin_testing_capabilities(plugin_tester, test_plugin):
    """Test plugin testing capabilities check."""
    # Add test case with required capabilities
    test_case = TestCase(
        name="capabilities_test",
        description="Test case with capabilities",
        input_data={"test": "data"},
        expected_output={
            "status": "success",
            "result": {
                "input": {"test": "data"},
                "processed": True
            }
        },
        required_capabilities={"test", "example"}
    )
    
    # Register plugin
    plugin_id = "test_plugin"
    plugin_tester.add_test_case(plugin_id, test_case)
    
    # Run test
    results = await plugin_tester.run_tests(plugin_id)
    
    # Verify results
    assert len(results) == 1
    result = results[0]
    assert result.status == "passed"
    assert result.error_message is None

@pytest.mark.asyncio
async def test_plugin_testing_resource_limits(plugin_tester, test_plugin):
    """Test plugin testing resource limits."""
    # Add test case with resource limits
    test_case = TestCase(
        name="resource_test",
        description="Test case with resource limits",
        input_data={"test": "data"},
        expected_output={
            "status": "success",
            "result": {
                "input": {"test": "data"},
                "processed": True
            }
        },
        resource_limits={
            "cpu": 0.5,
            "memory": 100.0
        }
    )
    
    # Register plugin
    plugin_id = "test_plugin"
    plugin_tester.add_test_case(plugin_id, test_case)
    
    # Run test
    results = await plugin_tester.run_tests(plugin_id)
    
    # Verify results
    assert len(results) == 1
    result = results[0]
    assert result.status == "passed"
    assert result.resource_usage is not None

@pytest.mark.asyncio
async def test_plugin_testing_sandbox(plugin_tester, test_plugin):
    """Test plugin testing sandbox environment."""
    # Add test case
    test_case = TestCase(
        name="sandbox_test",
        description="Test case in sandbox",
        input_data={"test": "data"},
        expected_output={
            "status": "success",
            "result": {
                "input": {"test": "data"},
                "processed": True
            }
        }
    )
    
    # Register plugin
    plugin_id = "test_plugin"
    plugin_tester.add_test_case(plugin_id, test_case)
    
    # Run test
    results = await plugin_tester.run_tests(plugin_id)
    
    # Verify results
    assert len(results) == 1
    result = results[0]
    assert result.status == "passed"
    assert result.error_message is None
    
    # Verify sandbox cleanup
    import os
    assert not os.path.exists(os.environ.get("PLUGIN_TEST_DIR", "")) 