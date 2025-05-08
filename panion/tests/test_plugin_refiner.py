"""
Tests for the plugin refiner.
"""

import pytest
from pathlib import Path
import ast
import astor
from core.plugin_refiner import PluginRefiner, FailureAnalysis
from core.plugin_cache import plugin_cache

@pytest.fixture
def plugin_refiner():
    """Create a plugin refiner instance."""
    return PluginRefiner()

@pytest.fixture
def test_plugin_dir(tmp_path):
    """Create a test plugin directory."""
    plugin_dir = tmp_path / "test_plugin"
    plugin_dir.mkdir()
    
    # Create plugin with issues
    (plugin_dir / "plugin.py").write_text("""
import os
import time

def execute(input_data):
    # Security issue
    os.system("echo test")
    
    # Performance issue
    time.sleep(2)
    
    # Memory issue
    data = ["x" * 1024 * 1024 for _ in range(200)]
    
    return {"result": "success", "data": data}
    """)
    
    return plugin_dir

@pytest.fixture
def test_results():
    """Create test results with failures."""
    return {
        "total_tests": 3,
        "passed": 0,
        "failed": 3,
        "errors": 0,
        "security_failures": 1,
        "regression_failures": 1,
        "performance_failures": 1,
        "test_results": [
            {
                "test_id": "security_test",
                "status": "security_failure",
                "security_issues": ["Dangerous import detected: os"]
            },
            {
                "test_id": "regression_test",
                "status": "regression_failure",
                "regression_status": "failed"
            },
            {
                "test_id": "performance_test",
                "status": "performance_failure",
                "duration": 2.5,
                "memory_usage": 200
            }
        ]
    }

@pytest.mark.asyncio
async def test_refine_plugin(plugin_refiner, test_plugin_dir, test_results):
    """Test plugin refinement."""
    # Cache original plugin
    versioned_name = plugin_cache.cache_plugin(
        "test_plugin",
        test_plugin_dir,
        test_results,
        ["requests==2.28.1"],
        "Test plugin"
    )
    
    # Refine plugin
    new_version = await plugin_refiner.refine_plugin(versioned_name, test_results)
    assert new_version is not None
    assert new_version == "test_plugin_v2"
    
    # Check refined code
    refined_dir = plugin_cache.cache_dir / new_version
    with open(refined_dir / "plugin.py") as f:
        code = f.read()
        
    # Should have replaced os.system with subprocess.run
    assert "os.system" not in code
    assert "subprocess.run" in code
    
    # Should have optimized the loop
    assert "for" not in code
    assert "[" in code and "]" in code  # List comprehension

@pytest.mark.asyncio
async def test_analyze_security_failure(plugin_refiner):
    """Test security failure analysis."""
    failure = plugin_refiner._analyze_security_failure(
        "test_1",
        "Dangerous import detected: os"
    )
    
    assert failure.test_id == "test_1"
    assert failure.failure_type == "security"
    assert failure.error_message == "Dangerous import detected: os"
    assert failure.confidence > 0.5

@pytest.mark.asyncio
async def test_analyze_regression_failure(plugin_refiner):
    """Test regression failure analysis."""
    failure = plugin_refiner._analyze_regression_failure(
        "test_1",
        "Output mismatch"
    )
    
    assert failure.test_id == "test_1"
    assert failure.failure_type == "regression"
    assert failure.error_message == "Output mismatch"
    assert failure.confidence > 0.5

@pytest.mark.asyncio
async def test_analyze_performance_failure(plugin_refiner):
    """Test performance failure analysis."""
    failure = plugin_refiner._analyze_performance_failure(
        "test_1",
        2.5,  # duration
        200   # memory
    )
    
    assert failure.test_id == "test_1"
    assert failure.failure_type == "performance"
    assert "2.50s" in failure.error_message
    assert "200.00MB" in failure.error_message
    assert failure.confidence > 0.5

def test_apply_security_fix(plugin_refiner):
    """Test applying security fixes."""
    # Create AST with os.system
    code = """
def execute(input_data):
    os.system("echo test")
    return {"result": "success"}
    """
    tree = ast.parse(code)
    
    # Create failure analysis
    failure = FailureAnalysis(
        test_id="test_1",
        failure_type="security",
        error_message="Dangerous function call: os.system",
        affected_code="os.system",
        suggested_fix="subprocess.run with shell=False",
        confidence=0.9
    )
    
    # Apply fix
    modified = plugin_refiner._apply_security_fix(tree, failure)
    assert modified
    
    # Check modified code
    new_code = astor.to_source(tree)
    assert "os.system" not in new_code
    assert "subprocess.run" in new_code
    assert "shell=False" in new_code

def test_apply_performance_fix(plugin_refiner):
    """Test applying performance fixes."""
    # Create AST with for loop
    code = """
def execute(input_data):
    result = []
    for i in range(100):
        result.append(i * 2)
    return {"result": result}
    """
    tree = ast.parse(code)
    
    # Create failure analysis
    failure = FailureAnalysis(
        test_id="test_1",
        failure_type="performance",
        error_message="Slow loop operation",
        affected_code="for",
        suggested_fix="Use list comprehension",
        confidence=0.9
    )
    
    # Apply fix
    modified = plugin_refiner._apply_performance_fix(tree, failure)
    assert modified
    
    # Check modified code
    new_code = astor.to_source(tree)
    assert "for" not in new_code
    assert "[" in new_code and "]" in new_code  # List comprehension

@pytest.mark.asyncio
async def test_refine_plugin_no_failures(plugin_refiner, test_plugin_dir):
    """Test refinement with no failures."""
    # Create successful test results
    test_results = {
        "total_tests": 1,
        "passed": 1,
        "failed": 0,
        "test_results": [
            {
                "test_id": "test_1",
                "status": "success"
            }
        ]
    }
    
    # Cache plugin
    versioned_name = plugin_cache.cache_plugin(
        "test_plugin",
        test_plugin_dir,
        test_results,
        ["requests==2.28.1"],
        "Test plugin"
    )
    
    # Try to refine
    new_version = await plugin_refiner.refine_plugin(versioned_name, test_results)
    assert new_version is None  # Should not refine if no failures

@pytest.mark.asyncio
async def test_refine_plugin_low_confidence(plugin_refiner, test_plugin_dir, test_results):
    """Test refinement with low confidence fixes."""
    # Cache plugin
    versioned_name = plugin_cache.cache_plugin(
        "test_plugin",
        test_plugin_dir,
        test_results,
        ["requests==2.28.1"],
        "Test plugin"
    )
    
    # Modify test results to have low confidence
    test_results["test_results"][0]["confidence"] = 0.3
    
    # Try to refine
    new_version = await plugin_refiner.refine_plugin(versioned_name, test_results)
    assert new_version is None  # Should not refine with low confidence 