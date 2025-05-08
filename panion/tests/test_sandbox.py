"""
Tests for the plugin sandbox system.
"""

import pytest
import os
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any
from datetime import datetime, timedelta
import threading
import time
import psutil
import docker
from unittest.mock import patch, MagicMock

from core.plugin.sandbox import Sandbox, SandboxConfig
from core.plugin.base import Plugin

class TestPlugin(Plugin):
    """Test plugin for sandbox testing."""
    
    def __init__(self):
        super().__init__()
        self.id = "test_plugin"
        self.name = "Test Plugin"
        self.version = "1.0.0"
        self.description = "Test plugin for sandbox testing"
        self.author = "Test Author"
        self.capabilities = ["test"]
        self.dependencies = []
    
    def test_function(self, *args, **kwargs):
        """Test function that returns input."""
        return {"args": args, "kwargs": kwargs}

@pytest.fixture
def test_plugin():
    """Create a test plugin."""
    return TestPlugin()

@pytest.fixture
def sandbox_config():
    """Create a test sandbox configuration."""
    return SandboxConfig(
        cpu_percent=50.0,
        memory_mb=512,
        disk_mb=1024,
        max_threads=5,
        max_connections=10,
        max_file_handles=100,
        allow_network=False,
        allow_filesystem=False,
        use_container=True
    )

@pytest.fixture
def sandbox(test_plugin, sandbox_config):
    """Create a sandbox instance."""
    sandbox = Sandbox(test_plugin, sandbox_config)
    yield sandbox
    sandbox.stop()

def test_sandbox_initialization(sandbox, test_plugin, sandbox_config):
    """Test sandbox initialization."""
    assert sandbox.plugin == test_plugin
    assert sandbox.config == sandbox_config
    assert not sandbox._is_running
    assert sandbox._start_time is None
    assert sandbox._violations == 0
    assert sandbox._monitor_thread is None
    assert not sandbox._stop_monitoring.is_set()

def test_sandbox_start_stop(sandbox):
    """Test sandbox start and stop."""
    # Start sandbox
    sandbox.start()
    assert sandbox._is_running
    assert sandbox._start_time is not None
    assert sandbox._monitor_thread is not None
    assert sandbox._monitor_thread.is_alive()
    
    # Stop sandbox
    sandbox.stop()
    assert not sandbox._is_running
    assert sandbox._monitor_thread is None
    assert sandbox._stop_monitoring.is_set()

def test_sandbox_execution(sandbox):
    """Test sandbox execution."""
    # Start sandbox
    sandbox.start()
    
    # Execute function
    result = sandbox.execute("test_function", "arg1", "arg2", kwarg1="value1")
    assert result["args"] == ("arg1", "arg2")
    assert result["kwargs"] == {"kwarg1": "value1"}
    
    # Stop sandbox
    sandbox.stop()

def test_sandbox_resource_limits(sandbox):
    """Test sandbox resource limits."""
    # Start sandbox
    sandbox.start()
    
    # Mock high resource usage
    with patch('psutil.cpu_percent', return_value=75.0), \
         patch('psutil.virtual_memory') as mock_memory, \
         patch('psutil.disk_usage') as mock_disk:
        
        # Configure mock memory
        mock_memory.return_value.used = 1024 * 1024 * 1024  # 1GB
        
        # Configure mock disk
        mock_disk.return_value.used = 2 * 1024 * 1024 * 1024  # 2GB
        
        # Wait for monitoring to detect violations
        time.sleep(2)
        
        # Check violations
        assert sandbox._violations > 0
        
        # Stop sandbox
        sandbox.stop()

def test_sandbox_execution_time(sandbox):
    """Test sandbox execution time limit."""
    # Start sandbox
    sandbox.start()
    
    # Mock execution time
    with patch.object(sandbox, '_check_execution_time', return_value=True):
        # Wait for monitoring to detect timeout
        time.sleep(2)
        
        # Check if sandbox stopped
        assert not sandbox._is_running
        
        # Stop sandbox
        sandbox.stop()

def test_sandbox_container_execution(sandbox):
    """Test sandbox container execution."""
    # Mock Docker client
    with patch('docker.from_env') as mock_docker:
        # Configure mock container
        mock_container = MagicMock()
        mock_container.exec_run.return_value = MagicMock(
            exit_code=0,
            output='{"args": ["arg1"], "kwargs": {"kwarg1": "value1"}}'
        )
        mock_docker.return_value.containers.run.return_value = mock_container
        
        # Start sandbox
        sandbox.start()
        
        # Execute function
        result = sandbox.execute("test_function", "arg1", kwarg1="value1")
        assert result["args"] == ["arg1"]
        assert result["kwargs"] == {"kwarg1": "value1"}
        
        # Stop sandbox
        sandbox.stop()

def test_sandbox_process_execution(sandbox):
    """Test sandbox process execution."""
    # Disable container
    sandbox.config.use_container = False
    
    # Start sandbox
    sandbox.start()
    
    # Execute function
    result = sandbox.execute("test_function", "arg1", kwarg1="value1")
    assert result["args"] == ("arg1",)
    assert result["kwargs"] == {"kwarg1": "value1"}
    
    # Stop sandbox
    sandbox.stop()

def test_sandbox_status(sandbox):
    """Test sandbox status reporting."""
    # Start sandbox
    sandbox.start()
    
    # Get status
    status = sandbox.get_status()
    
    # Check status structure
    assert "running" in status
    assert "start_time" in status
    assert "violations" in status
    assert "config" in status
    
    # Check config
    config = status["config"]
    assert config["cpu_percent"] == 50.0
    assert config["memory_mb"] == 512
    assert config["disk_mb"] == 1024
    assert config["max_threads"] == 5
    assert config["max_connections"] == 10
    assert config["max_file_handles"] == 100
    assert config["use_container"] is True
    
    # Stop sandbox
    sandbox.stop()

def test_sandbox_error_handling(sandbox):
    """Test sandbox error handling."""
    # Start sandbox
    sandbox.start()
    
    # Test execution with invalid function
    with pytest.raises(AttributeError):
        sandbox.execute("invalid_function")
    
    # Test execution with invalid arguments
    with pytest.raises(TypeError):
        sandbox.execute("test_function", invalid_arg=object())
    
    # Stop sandbox
    sandbox.stop()

def test_sandbox_concurrent_execution(sandbox):
    """Test sandbox concurrent execution."""
    # Start sandbox
    sandbox.start()
    
    # Create multiple threads
    threads = []
    results = []
    
    def execute_in_thread():
        try:
            result = sandbox.execute("test_function", "arg1")
            results.append(result)
        except Exception as e:
            results.append(e)
    
    # Start threads
    for _ in range(3):
        thread = threading.Thread(target=execute_in_thread)
        threads.append(thread)
        thread.start()
    
    # Wait for threads
    for thread in threads:
        thread.join()
    
    # Check results
    assert len(results) == 3
    assert all(isinstance(r, dict) for r in results)
    
    # Stop sandbox
    sandbox.stop()

def test_sandbox_cleanup(sandbox):
    """Test sandbox cleanup."""
    # Start sandbox
    sandbox.start()
    
    # Create temporary files
    temp_dir = tempfile.mkdtemp()
    temp_file = os.path.join(temp_dir, "test.txt")
    with open(temp_file, "w") as f:
        f.write("test")
    
    # Stop sandbox
    sandbox.stop()
    
    # Check cleanup
    assert not os.path.exists(temp_file)
    assert not os.path.exists(temp_dir)

def test_sandbox_network_restrictions(sandbox):
    """Test sandbox network restrictions."""
    # Enable network
    sandbox.config.allow_network = True
    sandbox.config.allowed_ports = [80, 443]
    
    # Start sandbox
    sandbox.start()
    
    # Test network access
    if sandbox.config.use_container:
        # Check container network mode
        assert sandbox.container.attrs["HostConfig"]["NetworkMode"] == "bridge"
        
        # Check port mappings
        ports = sandbox._get_container_ports()
        assert "80/tcp" in ports
        assert "443/tcp" in ports
    
    # Stop sandbox
    sandbox.stop()

def test_sandbox_filesystem_restrictions(sandbox):
    """Test sandbox filesystem restrictions."""
    # Enable filesystem
    sandbox.config.allow_filesystem = True
    sandbox.config.allowed_paths = ["/tmp"]
    
    # Start sandbox
    sandbox.start()
    
    # Test filesystem access
    if sandbox.config.use_container:
        # Check volume mappings
        volumes = sandbox._get_container_volumes()
        assert "/tmp" in volumes
        assert volumes["/tmp"]["mode"] == "ro"
    
    # Stop sandbox
    sandbox.stop() 