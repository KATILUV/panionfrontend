"""
Tests for the plugin discovery system.
"""

import pytest
import os
import tempfile
from pathlib import Path
from typing import Dict, Any
from datetime import datetime
from core.plugin.discovery import PluginDiscovery, PluginInfo
from core.plugin.base import BasePlugin, PluginMetadata

class TestPlugin(BasePlugin):
    """Test plugin for discovery."""
    metadata = PluginMetadata(
        name="test_plugin",
        version="1.0.0",
        description="Test plugin for discovery",
        author="Test Author",
        capabilities=["test_capability"],
        dependencies={"dependency1": ">=1.0.0"}
    )
    
    def initialize(self):
        """Initialize plugin."""
        pass
    
    def execute(self, data):
        """Execute plugin."""
        return data

class TestPlugin2(BasePlugin):
    """Another test plugin for discovery."""
    metadata = PluginMetadata(
        name="test_plugin2",
        version="2.0.0",
        description="Another test plugin",
        author="Test Author",
        capabilities=["test_capability", "another_capability"],
        dependencies={"test_plugin": ">=1.0.0"}
    )
    
    def initialize(self):
        """Initialize plugin."""
        pass
    
    def execute(self, data):
        """Execute plugin."""
        return data

@pytest.fixture
def temp_dir():
    """Create a temporary directory with test plugins."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create plugin directory
        plugin_dir = Path(temp_dir) / "plugins"
        plugin_dir.mkdir(parents=True)
        
        # Create test plugin files
        plugin_files = {
            "test_plugin.py": TestPlugin,
            "test_plugin2.py": TestPlugin2
        }
        
        for filename, plugin_class in plugin_files.items():
            with open(plugin_dir / filename, "w") as f:
                f.write(f"""
\"\"\"Test plugin module.\"\"\"

from core.plugin.base import BasePlugin, PluginMetadata

class {plugin_class.__name__}(BasePlugin):
    \"\"\"{plugin_class.__doc__}\"\"\"
    metadata = PluginMetadata(
        name="{plugin_class.metadata.name}",
        version="{plugin_class.metadata.version}",
        description="{plugin_class.metadata.description}",
        author="{plugin_class.metadata.author}",
        capabilities={plugin_class.metadata.capabilities},
        dependencies={plugin_class.metadata.dependencies}
    )
    
    def initialize(self):
        \"\"\"Initialize plugin.\"\"\"
        pass
    
    def execute(self, data):
        \"\"\"Execute plugin.\"\"\"
        return data
""")
        
        yield temp_dir

@pytest.fixture
def discovery(temp_dir):
    """Create a plugin discovery instance."""
    # Add plugin directory to Python path
    sys.path.insert(0, str(temp_dir))
    
    # Create discovery instance
    discovery = PluginDiscovery()
    
    # Discover plugins
    discovery.discover_plugins(Path(temp_dir) / "plugins")
    
    yield discovery
    
    # Clean up
    sys.path.pop(0)

def test_plugin_discovery(discovery):
    """Test plugin discovery functionality."""
    # Check if plugins were discovered
    assert len(discovery._plugins) == 2
    assert "test_plugin" in discovery._plugins
    assert "test_plugin2" in discovery._plugins
    
    # Check plugin info
    plugin_info = discovery._plugins["test_plugin"]
    assert isinstance(plugin_info, PluginInfo)
    assert plugin_info.name == "test_plugin"
    assert plugin_info.version == "1.0.0"
    assert plugin_info.description == "Test plugin for discovery"
    assert plugin_info.author == "Test Author"
    assert "test_capability" in plugin_info.capabilities
    assert "dependency1" in plugin_info.dependencies

def test_plugin_info_retrieval(discovery):
    """Test plugin info retrieval."""
    # Get plugin info
    plugin_info = discovery.get_plugin_info("test_plugin")
    
    # Check info
    assert plugin_info is not None
    assert plugin_info.name == "test_plugin"
    assert plugin_info.version == "1.0.0"
    
    # Test non-existent plugin
    assert discovery.get_plugin_info("non_existent") is None

def test_dependency_management(discovery):
    """Test dependency management."""
    # Get dependencies
    deps = discovery.get_plugin_dependencies("test_plugin2")
    assert "test_plugin" in deps
    assert deps["test_plugin"] == ">=1.0.0"
    
    # Check dependencies
    satisfied, missing = discovery.check_dependencies("test_plugin2")
    assert satisfied
    assert not missing
    
    # Test with missing dependency
    discovery._plugins.pop("test_plugin")
    satisfied, missing = discovery.check_dependencies("test_plugin2")
    assert not satisfied
    assert "Dependency test_plugin not found" in missing

def test_version_management(discovery):
    """Test version management."""
    # Get versions
    versions = discovery.get_plugin_versions()
    assert versions["test_plugin"] == "1.0.0"
    assert versions["test_plugin2"] == "2.0.0"
    
    # Check version compatibility
    assert discovery._check_version_compatibility("1.0.0", ">=1.0.0")
    assert not discovery._check_version_compatibility("0.9.0", ">=1.0.0")

def test_capability_management(discovery):
    """Test capability management."""
    # Get capabilities
    capabilities = discovery.get_plugin_capabilities()
    assert "test_capability" in capabilities["test_plugin"]
    assert "another_capability" in capabilities["test_plugin2"]
    
    # Find plugins by capability
    plugins = discovery.find_plugins_by_capability("test_capability")
    assert "test_plugin" in plugins
    assert "test_plugin2" in plugins
    
    plugins = discovery.find_plugins_by_capability("another_capability")
    assert "test_plugin2" in plugins
    assert "test_plugin" not in plugins

def test_plugin_validation(discovery):
    """Test plugin validation."""
    # Validate plugin
    valid, issues = discovery.validate_plugin("test_plugin")
    assert valid
    assert not issues
    
    # Test with invalid version
    discovery._plugins["test_plugin"].version = "invalid"
    valid, issues = discovery.validate_plugin("test_plugin")
    assert not valid
    assert "Invalid version format" in issues[0]
    
    # Test with missing capabilities
    discovery._plugins["test_plugin"].capabilities.clear()
    valid, issues = discovery.validate_plugin("test_plugin")
    assert not valid
    assert "No capabilities defined" in issues

def test_plugin_status(discovery):
    """Test plugin status reporting."""
    # Get status
    status = discovery.get_plugin_status()
    
    # Check status
    assert "test_plugin" in status
    assert "test_plugin2" in status
    
    plugin_status = status["test_plugin"]
    assert plugin_status["version"] == "1.0.0"
    assert plugin_status["enabled"]
    assert plugin_status["valid"]
    assert not plugin_status["issues"]
    assert plugin_status["dependencies_satisfied"]
    assert not plugin_status["missing_dependencies"]
    assert "test_capability" in plugin_status["capabilities"]

def test_empty_directory(discovery, temp_dir):
    """Test discovery with empty directory."""
    # Create empty directory
    empty_dir = Path(temp_dir) / "empty"
    empty_dir.mkdir()
    
    # Discover plugins
    plugins = discovery.discover_plugins(empty_dir)
    
    # Check result
    assert not plugins

def test_invalid_plugin(discovery, temp_dir):
    """Test discovery of invalid plugin."""
    # Create invalid plugin
    invalid_dir = Path(temp_dir) / "plugins"
    with open(invalid_dir / "invalid_plugin.py", "w") as f:
        f.write("""
\"\"\"Invalid plugin module.\"\"\"

# Missing plugin class
""")
    
    # Discover plugins
    discovery.discover_plugins(invalid_dir)
    
    # Check result
    assert "invalid_plugin" not in discovery._plugins 