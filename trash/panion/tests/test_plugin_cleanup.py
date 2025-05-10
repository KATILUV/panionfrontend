"""
Tests for plugin cleanup functionality.
"""

import pytest
from datetime import datetime, timedelta
from pathlib import Path
import json
import shutil

from core.plugin_cache import PluginCache
from core.plugin_common import CleanupStats

@pytest.fixture
def cache_dir(tmp_path):
    """Create a temporary cache directory."""
    cache_dir = tmp_path / "plugins"
    cache_dir.mkdir()
    return cache_dir

@pytest.fixture
def plugin_cache(cache_dir):
    """Create a plugin cache instance."""
    return PluginCache(cache_dir=str(cache_dir))

def test_cleanup_old_versions(plugin_cache, cache_dir):
    """Test cleanup of old plugin versions."""
    # Create test plugin versions
    plugin_name = "test_plugin"
    versions = []
    
    for i in range(5):
        version = f"{plugin_name}_v{i+1}"
        version_dir = cache_dir / version
        version_dir.mkdir()
        
        # Create metadata
        metadata = {
            "name": plugin_name,
            "version": version,
            "created_at": (datetime.now() - timedelta(days=i*10)).isoformat(),
            "last_used": (datetime.now() - timedelta(days=i*10)).isoformat(),
            "success_rate": 0.8,
            "test_results": {"total_tests": 10, "passed": 8},
            "dependencies": [],
            "description": f"Test plugin version {i+1}"
        }
        
        with open(version_dir / "metadata.json", "w") as f:
            json.dump(metadata, f)
            
        versions.append(version)
        
    # Run cleanup
    stats = plugin_cache.cleanup_plugin(plugin_name)
    
    # Check results
    assert stats.total_plugins == 5
    assert stats.removed_plugins == 2  # Should keep 3 versions
    assert isinstance(stats.freed_space, int)
    assert isinstance(stats.oldest_kept, datetime)
    assert isinstance(stats.newest_removed, datetime)
    
    # Check remaining versions
    remaining = [d.name for d in cache_dir.glob(f"{plugin_name}_v*")]
    assert len(remaining) == 3
    assert all(v in remaining for v in versions[:3])  # Should keep oldest versions

def test_cleanup_low_success_rate(plugin_cache, cache_dir):
    """Test cleanup of plugins with low success rate."""
    # Create test plugin versions
    plugin_name = "test_plugin"
    version = f"{plugin_name}_v1"
    version_dir = cache_dir / version
    version_dir.mkdir()
    
    # Create metadata with low success rate
    metadata = {
        "name": plugin_name,
        "version": version,
        "created_at": datetime.now().isoformat(),
        "last_used": datetime.now().isoformat(),
        "success_rate": 0.5,  # Below threshold
        "test_results": {"total_tests": 10, "passed": 5},
        "dependencies": [],
        "description": "Test plugin with low success rate"
    }
    
    with open(version_dir / "metadata.json", "w") as f:
        json.dump(metadata, f)
        
    # Run cleanup
    stats = plugin_cache.cleanup_plugin(plugin_name)
    
    # Check results
    assert stats.total_plugins == 1
    assert stats.removed_plugins == 1
    assert not list(cache_dir.glob(f"{plugin_name}_v*"))

def test_cleanup_unused_plugins(plugin_cache, cache_dir):
    """Test cleanup of unused plugins."""
    # Create test plugin versions
    plugin_name = "test_plugin"
    version = f"{plugin_name}_v1"
    version_dir = cache_dir / version
    version_dir.mkdir()
    
    # Create metadata with old last_used
    metadata = {
        "name": plugin_name,
        "version": version,
        "created_at": datetime.now().isoformat(),
        "last_used": (datetime.now() - timedelta(days=31)).isoformat(),  # Over 30 days old
        "success_rate": 0.8,
        "test_results": {"total_tests": 10, "passed": 8},
        "dependencies": [],
        "description": "Test plugin that hasn't been used"
    }
    
    with open(version_dir / "metadata.json", "w") as f:
        json.dump(metadata, f)
        
    # Run cleanup
    stats = plugin_cache.cleanup_plugin(plugin_name)
    
    # Check results
    assert stats.total_plugins == 1
    assert stats.removed_plugins == 1
    assert not list(cache_dir.glob(f"{plugin_name}_v*"))

def test_cleanup_all_plugins(plugin_cache, cache_dir):
    """Test cleanup of all plugins."""
    # Create test plugins
    plugins = ["plugin1", "plugin2", "plugin3"]
    
    for plugin_name in plugins:
        for i in range(3):
            version = f"{plugin_name}_v{i+1}"
            version_dir = cache_dir / version
            version_dir.mkdir()
            
            # Create metadata
            metadata = {
                "name": plugin_name,
                "version": version,
                "created_at": (datetime.now() - timedelta(days=i*10)).isoformat(),
                "last_used": (datetime.now() - timedelta(days=i*10)).isoformat(),
                "success_rate": 0.8,
                "test_results": {"total_tests": 10, "passed": 8},
                "dependencies": [],
                "description": f"Test plugin {plugin_name} version {i+1}"
            }
            
            with open(version_dir / "metadata.json", "w") as f:
                json.dump(metadata, f)
                
    # Run cleanup
    stats = plugin_cache.cleanup_all_plugins()
    
    # Check results
    assert len(stats) == 3
    for plugin_name, plugin_stats in stats.items():
        assert plugin_stats.total_plugins == 3
        assert plugin_stats.removed_plugins == 0  # All versions are recent
        assert len(list(cache_dir.glob(f"{plugin_name}_v*"))) == 3 