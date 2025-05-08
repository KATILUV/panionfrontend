"""
Tests for the plugin updater.
"""

import pytest
import os
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any
from datetime import datetime
import zipfile
import hashlib
from unittest.mock import patch, MagicMock

from core.plugin.updater import PluginUpdater, UpdateInfo, UpdateHistory
from core.plugin.discovery import PluginDiscovery, PluginInfo
from core.plugin.base import BasePlugin, PluginMetadata

class TestPlugin(BasePlugin):
    """Test plugin for updates."""
    metadata = PluginMetadata(
        name="test_plugin",
        version="1.0.0",
        description="Test plugin for updates",
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

@pytest.fixture
def temp_dir():
    """Create a temporary directory with test plugins."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create plugin directory
        plugin_dir = Path(temp_dir) / "plugins"
        plugin_dir.mkdir(parents=True)
        
        # Create test plugin file
        with open(plugin_dir / "test_plugin.py", "w") as f:
            f.write("""
\"\"\"Test plugin module.\"\"\"

from core.plugin.base import BasePlugin, PluginMetadata

class TestPlugin(BasePlugin):
    \"\"\"Test plugin for updates.\"\"\"
    metadata = PluginMetadata(
        name="test_plugin",
        version="1.0.0",
        description="Test plugin for updates",
        author="Test Author",
        capabilities=["test_capability"],
        dependencies={"dependency1": ">=1.0.0"}
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

@pytest.fixture
def updater(discovery):
    """Create a plugin updater instance."""
    return PluginUpdater()

@pytest.fixture
def update_info():
    """Create update information fixture."""
    return UpdateInfo(
        plugin_name="test_plugin",
        current_version="1.0.0",
        target_version="2.0.0",
        update_url="http://example.com/update.zip",
        checksum="test_checksum",
        release_notes="Test update",
        dependencies={"dependency1": ">=1.0.0"},
        requires_restart=False
    )

def test_update_check(updater, update_info):
    """Test update checking functionality."""
    # Add update to registry
    updater._updates["test_plugin"] = update_info
    
    # Check for updates
    result = updater.check_for_updates("test_plugin")
    
    # Check result
    assert result is not None
    assert result.plugin_name == "test_plugin"
    assert result.target_version == "2.0.0"
    
    # Test non-existent plugin
    assert updater.check_for_updates("non_existent") is None

def test_plugin_update(updater, update_info, temp_dir):
    """Test plugin update functionality."""
    # Mock update download
    with patch("requests.get") as mock_get:
        # Create mock response
        mock_response = MagicMock()
        mock_response.iter_content.return_value = [b"test_data"]
        mock_get.return_value = mock_response
        
        # Create test update file
        update_path = Path(temp_dir) / "update.zip"
        with zipfile.ZipFile(update_path, "w") as zip_file:
            zip_file.writestr("test_plugin.py", "updated_plugin_code")
        
        # Calculate checksum
        with open(update_path, "rb") as f:
            checksum = hashlib.sha256(f.read()).hexdigest()
        
        update_info.checksum = checksum
        
        # Update plugin
        result = updater.update_plugin("test_plugin", update_info)
        
        # Check result
        assert result
        
        # Check backup
        backup_dir = Path("backups") / "plugins"
        assert any(backup_dir.iterdir())
        
        # Check update history
        history = updater.get_update_history("test_plugin")
        assert len(history) == 1
        assert history[0].version == "2.0.0"
        assert history[0].previous_version == "1.0.0"
        assert history[0].update_type == "update"
        assert history[0].success

def test_plugin_rollback(updater, update_info, temp_dir):
    """Test plugin rollback functionality."""
    # First update the plugin
    with patch("requests.get") as mock_get:
        # Create mock response
        mock_response = MagicMock()
        mock_response.iter_content.return_value = [b"test_data"]
        mock_get.return_value = mock_response
        
        # Create test update file
        update_path = Path(temp_dir) / "update.zip"
        with zipfile.ZipFile(update_path, "w") as zip_file:
            zip_file.writestr("test_plugin.py", "updated_plugin_code")
        
        # Calculate checksum
        with open(update_path, "rb") as f:
            checksum = hashlib.sha256(f.read()).hexdigest()
        
        update_info.checksum = checksum
        
        # Update plugin
        updater.update_plugin("test_plugin", update_info)
    
    # Now rollback
    result = updater.rollback_plugin("test_plugin")
    
    # Check result
    assert result
    
    # Check update history
    history = updater.get_update_history("test_plugin")
    assert len(history) == 2
    assert history[1].update_type == "rollback"
    assert history[1].success

def test_backup_creation(updater, discovery):
    """Test backup creation functionality."""
    # Get plugin info
    plugin_info = discovery.get_plugin_info("test_plugin")
    
    # Create backup
    backup_path = updater._create_backup(plugin_info)
    
    # Check backup
    assert backup_path is not None
    assert backup_path.exists()
    assert (backup_path / "test_plugin").exists()
    assert (backup_path / "test_plugin" / "test_plugin.py").exists()

def test_backup_restore(updater, discovery):
    """Test backup restore functionality."""
    # Get plugin info
    plugin_info = discovery.get_plugin_info("test_plugin")
    
    # Create backup
    backup_path = updater._create_backup(plugin_info)
    
    # Modify plugin
    with open(plugin_info.path, "w") as f:
        f.write("modified_plugin_code")
    
    # Restore backup
    result = updater._restore_backup(backup_path, plugin_info)
    
    # Check result
    assert result
    
    # Check plugin content
    with open(plugin_info.path) as f:
        content = f.read()
        assert "modified_plugin_code" not in content

def test_update_verification(updater, temp_dir):
    """Test update verification functionality."""
    # Create test file
    test_file = Path(temp_dir) / "test.txt"
    with open(test_file, "w") as f:
        f.write("test_data")
    
    # Calculate checksum
    with open(test_file, "rb") as f:
        checksum = hashlib.sha256(f.read()).hexdigest()
    
    # Verify update
    assert updater._verify_update(test_file, checksum)
    
    # Test invalid checksum
    assert not updater._verify_update(test_file, "invalid_checksum")

def test_update_history(updater):
    """Test update history functionality."""
    # Add test updates
    updater._record_update(
        "test_plugin",
        "2.0.0",
        "1.0.0",
        "update",
        True
    )
    
    updater._record_update(
        "test_plugin",
        "1.0.0",
        "2.0.0",
        "rollback",
        True
    )
    
    # Get history
    history = updater.get_update_history()
    assert len(history) == 2
    
    # Get filtered history
    filtered_history = updater.get_update_history("test_plugin")
    assert len(filtered_history) == 2
    
    # Get non-existent plugin history
    assert not updater.get_update_history("non_existent")

def test_available_updates(updater, update_info):
    """Test available updates functionality."""
    # Add update to registry
    updater._updates["test_plugin"] = update_info
    
    # Get available updates
    updates = updater.get_available_updates()
    
    # Check result
    assert "test_plugin" in updates
    assert updates["test_plugin"].target_version == "2.0.0"

def test_update_failure(updater, update_info):
    """Test update failure handling."""
    # Mock failed update
    with patch.object(updater, "_download_update", return_value=None):
        # Try to update
        result = updater.update_plugin("test_plugin", update_info)
        
        # Check result
        assert not result
        
        # Check history
        history = updater.get_update_history("test_plugin")
        assert not history

def test_rollback_failure(updater):
    """Test rollback failure handling."""
    # Try to rollback without any updates
    result = updater.rollback_plugin("test_plugin")
    
    # Check result
    assert not result
    
    # Check history
    history = updater.get_update_history("test_plugin")
    assert not history 