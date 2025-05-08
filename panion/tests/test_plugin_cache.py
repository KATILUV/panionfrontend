"""
Tests for the plugin cache manager.
"""

import pytest
from pathlib import Path
import json
import shutil
from datetime import datetime
from core.plugin.types import PluginMetadata

@pytest.fixture
def plugin_cache():
    """Create a plugin cache instance."""
    cache = PluginCache()
    cache.cache_dir = Path("tests/plugins/auto")
    cache.cache_dir.mkdir(exist_ok=True, parents=True)
    cache.metadata_file = cache.cache_dir / "metadata.json"
    yield cache
    # Cleanup
    if cache.cache_dir.exists():
        shutil.rmtree(cache.cache_dir)

@pytest.fixture
def test_plugin_dir(tmp_path):
    """Create a test plugin directory."""
    plugin_dir = tmp_path / "test_plugin"
    plugin_dir.mkdir()
    
    # Create plugin file
    (plugin_dir / "plugin.py").write_text("""
def execute(input_data):
    return {"result": "success", "data": input_data}
    """)
    
    # Create requirements
    (plugin_dir / "requirements.txt").write_text("""
requests==2.28.1
beautifulsoup4==4.12.0
    """)
    
    return plugin_dir

@pytest.fixture
def test_results():
    """Create test results."""
    return {
        "total_tests": 2,
        "passed": 2,
        "failed": 0,
        "errors": 0,
        "security_failures": 0,
        "regression_failures": 0,
        "performance_failures": 0,
        "test_results": [
            {
                "test_id": "test_1",
                "status": "success",
                "duration": 0.1,
                "memory_usage": 10
            },
            {
                "test_id": "test_2",
                "status": "success",
                "duration": 0.2,
                "memory_usage": 20
            }
        ]
    }

def test_cache_plugin(plugin_cache, test_plugin_dir, test_results):
    """Test caching a plugin."""
    versioned_name = plugin_cache.cache_plugin(
        "test_plugin",
        test_plugin_dir,
        test_results,
        ["requests==2.28.1", "beautifulsoup4==4.12.0"],
        "Test plugin"
    )
    
    assert versioned_name == "test_plugin_v1"
    assert (plugin_cache.cache_dir / versioned_name).exists()
    assert (plugin_cache.cache_dir / versioned_name / "plugin.py").exists()
    assert (plugin_cache.cache_dir / versioned_name / "requirements.txt").exists()
    
    # Check metadata
    metadata = plugin_cache.get_plugin_metadata(versioned_name)
    assert metadata.name == "test_plugin"
    assert metadata.version == versioned_name
    assert metadata.success_rate == 1.0
    assert metadata.dependencies == ["requests==2.28.1", "beautifulsoup4==4.12.0"]
    assert metadata.description == "Test plugin"

def test_get_plugin(plugin_cache, test_plugin_dir, test_results):
    """Test retrieving a plugin from cache."""
    # Cache plugin
    versioned_name = plugin_cache.cache_plugin(
        "test_plugin",
        test_plugin_dir,
        test_results,
        ["requests==2.28.1"],
        "Test plugin"
    )
    
    # Get plugin
    plugin_dir = plugin_cache.get_plugin("test_plugin")
    assert plugin_dir is not None
    assert plugin_dir.name == versioned_name
    assert (plugin_dir / "plugin.py").exists()
    
    # Get non-existent plugin
    assert plugin_cache.get_plugin("nonexistent") is None

def test_update_plugin(plugin_cache, test_plugin_dir, test_results):
    """Test updating plugin metadata."""
    # Cache plugin
    versioned_name = plugin_cache.cache_plugin(
        "test_plugin",
        test_plugin_dir,
        test_results,
        ["requests==2.28.1"],
        "Test plugin"
    )
    
    # Update with new results
    new_results = test_results.copy()
    new_results["passed"] = 1
    new_results["failed"] = 1
    new_results["test_results"][1]["status"] = "failure"
    
    assert plugin_cache.update_plugin(versioned_name, new_results)
    
    # Check updated metadata
    metadata = plugin_cache.get_plugin_metadata(versioned_name)
    assert metadata.success_rate == 0.5
    assert metadata.test_results["passed"] == 1
    assert metadata.test_results["failed"] == 1

def test_delete_plugin(plugin_cache, test_plugin_dir, test_results):
    """Test deleting a plugin from cache."""
    # Cache plugin
    versioned_name = plugin_cache.cache_plugin(
        "test_plugin",
        test_plugin_dir,
        test_results,
        ["requests==2.28.1"],
        "Test plugin"
    )
    
    # Delete plugin
    assert plugin_cache.delete_plugin(versioned_name)
    assert not (plugin_cache.cache_dir / versioned_name).exists()
    assert versioned_name not in plugin_cache.metadata
    
    # Delete non-existent plugin
    assert not plugin_cache.delete_plugin("nonexistent")

def test_list_plugins(plugin_cache, test_plugin_dir, test_results):
    """Test listing cached plugins."""
    # Cache multiple plugins
    plugin_cache.cache_plugin(
        "test_plugin_1",
        test_plugin_dir,
        test_results,
        ["requests==2.28.1"],
        "Test plugin 1"
    )
    
    plugin_cache.cache_plugin(
        "test_plugin_2",
        test_plugin_dir,
        test_results,
        ["beautifulsoup4==4.12.0"],
        "Test plugin 2"
    )
    
    # List plugins
    plugins = plugin_cache.list_plugins()
    assert len(plugins) == 2
    assert any(p.name == "test_plugin_1" for p in plugins)
    assert any(p.name == "test_plugin_2" for p in plugins)

def test_versioning(plugin_cache, test_plugin_dir, test_results):
    """Test plugin versioning."""
    # Cache first version
    v1 = plugin_cache.cache_plugin(
        "test_plugin",
        test_plugin_dir,
        test_results,
        ["requests==2.28.1"],
        "Test plugin v1"
    )
    
    # Cache second version
    v2 = plugin_cache.cache_plugin(
        "test_plugin",
        test_plugin_dir,
        test_results,
        ["requests==2.28.1"],
        "Test plugin v2"
    )
    
    assert v1 == "test_plugin_v1"
    assert v2 == "test_plugin_v2"
    
    # Get best version
    best = plugin_cache.get_plugin("test_plugin")
    assert best.name == v2  # Should get latest version 