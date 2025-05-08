"""
Tests for the plugin sandboxing system.
"""

import pytest
import os
import time
import psutil
import tempfile
from pathlib import Path
from typing import Dict, Any

from core.plugin.sandbox import PluginSandbox, SandboxConfig, SandboxContext

@pytest.fixture
def plugin_sandbox():
    """Create plugin sandbox fixture."""
    return PluginSandbox()

@pytest.fixture
def sandbox_config():
    """Create sandbox config fixture."""
    return SandboxConfig(
        plugin_id="test_plugin",
        resource_limits={
            "cpu": 50.0,
            "memory": 512.0,
            "disk": 100.0,
            "network": 50.0
        },
        allowed_ports={8000},
        allowed_paths={"/tmp"},
        allowed_commands={"ls", "cat"},
        allowed_network=False,
        allowed_filesystem=True,
        allowed_processes=False,
        timeout=30.0,
        max_memory_mb=512,
        max_cpu_percent=50.0,
        max_disk_mb=100,
        max_network_mb=50
    )

def test_sandbox_creation(plugin_sandbox, sandbox_config):
    """Test sandbox creation."""
    # Create sandbox
    sandbox = plugin_sandbox.create_sandbox(sandbox_config)
    
    # Verify sandbox
    assert sandbox is not None
    assert sandbox.config == sandbox_config
    assert sandbox.temp_dir is not None
    assert os.path.exists(sandbox.temp_dir)
    
    # Verify sandbox registration
    assert plugin_sandbox.get_sandbox(sandbox_config.plugin_id) == sandbox
    
    # Cleanup
    plugin_sandbox.remove_sandbox(sandbox_config.plugin_id)

def test_sandbox_resource_limits(plugin_sandbox, sandbox_config):
    """Test sandbox resource limits."""
    # Create sandbox
    sandbox = plugin_sandbox.create_sandbox(sandbox_config)
    
    try:
        # Verify resource limits
        assert plugin_sandbox.check_resource_limits(sandbox_config.plugin_id)
        
        # Update resource usage
        plugin_sandbox.update_resource_usage(
            sandbox_config.plugin_id,
            {
                "cpu": 25.0,
                "memory": 256.0,
                "disk": 50.0,
                "network": 25.0
            }
        )
        
        # Verify resource usage
        usage = plugin_sandbox.get_resource_usage(sandbox_config.plugin_id)
        assert usage["cpu"] == 25.0
        assert usage["memory"] == 256.0
        assert usage["disk"] == 50.0
        assert usage["network"] == 25.0
        
        # Test exceeding limits
        plugin_sandbox.update_resource_usage(
            sandbox_config.plugin_id,
            {
                "cpu": 75.0,
                "memory": 1024.0,
                "disk": 200.0,
                "network": 100.0
            }
        )
        
        # Verify limit check
        assert not plugin_sandbox.check_resource_limits(sandbox_config.plugin_id)
        
    finally:
        # Cleanup
        plugin_sandbox.remove_sandbox(sandbox_config.plugin_id)

def test_sandbox_isolation(plugin_sandbox, sandbox_config):
    """Test sandbox isolation."""
    # Create sandbox
    with plugin_sandbox.create_sandbox(sandbox_config) as sandbox:
        # Verify environment variables
        assert os.environ.get("PLUGIN_SANDBOX_DIR") == sandbox.temp_dir
        assert os.environ.get("PLUGIN_SANDBOX_MODE") == "true"
        
        # Verify directory structure
        assert os.path.exists(os.path.join(sandbox.temp_dir, "data"))
        assert os.path.exists(os.path.join(sandbox.temp_dir, "logs"))
        assert os.path.exists(os.path.join(sandbox.temp_dir, "cache"))
        
        # Verify cleanup
        temp_dir = sandbox.temp_dir
    
    # Verify sandbox cleanup
    assert not os.path.exists(temp_dir)
    assert os.environ.get("PLUGIN_SANDBOX_DIR") is None
    assert os.environ.get("PLUGIN_SANDBOX_MODE") is None

def test_sandbox_resource_monitoring(plugin_sandbox, sandbox_config):
    """Test sandbox resource monitoring."""
    # Create sandbox
    with plugin_sandbox.create_sandbox(sandbox_config) as sandbox:
        # Wait for monitoring to start
        time.sleep(1)
        
        # Verify resource monitoring
        usage = plugin_sandbox.get_resource_usage(sandbox_config.plugin_id)
        assert "cpu" in usage
        assert "memory" in usage
        assert "disk" in usage
        assert "network" in usage
        
        # Verify monitoring thread
        assert sandbox._monitor_thread is not None
        assert sandbox._monitor_thread.is_alive()
    
    # Verify monitoring cleanup
    assert not sandbox._monitor_thread.is_alive()

def test_sandbox_error_handling(plugin_sandbox, sandbox_config):
    """Test sandbox error handling."""
    # Test invalid plugin ID
    with pytest.raises(ValueError):
        plugin_sandbox.get_resource_usage("invalid_plugin")
    
    # Test resource limit errors
    with pytest.raises(ValueError):
        plugin_sandbox.update_resource_usage("invalid_plugin", {})
    
    # Test sandbox creation with invalid config
    invalid_config = SandboxConfig(
        plugin_id="test_plugin",
        max_memory_mb=-1  # Invalid memory limit
    )
    with pytest.raises(ValueError):
        plugin_sandbox.create_sandbox(invalid_config)

def test_sandbox_container_support(plugin_sandbox, sandbox_config):
    """Test sandbox container support."""
    # Create sandbox
    with plugin_sandbox.create_sandbox(sandbox_config) as sandbox:
        # Verify container creation if Docker is available
        if plugin_sandbox._docker_client:
            assert sandbox.container is not None
            assert sandbox.container.status == "running"
            
            # Verify container limits
            stats = sandbox.container.stats(stream=False)
            assert stats["memory_stats"]["limit"] == sandbox_config.max_memory_mb * 1024 * 1024
            
            # Verify container cleanup
            container_id = sandbox.container.id
    
    # Verify container cleanup
    if plugin_sandbox._docker_client:
        try:
            container = plugin_sandbox._docker_client.containers.get(container_id)
            assert container.status == "exited"
        except docker.errors.NotFound:
            pass  # Container was removed

def test_sandbox_concurrent_usage(plugin_sandbox):
    """Test concurrent sandbox usage."""
    # Create multiple sandboxes
    sandboxes = []
    for i in range(3):
        config = SandboxConfig(
            plugin_id=f"test_plugin_{i}",
            max_memory_mb=100,
            max_cpu_percent=25.0
        )
        sandbox = plugin_sandbox.create_sandbox(config)
        sandboxes.append(sandbox)
    
    try:
        # Verify all sandboxes are created
        for i in range(3):
            assert plugin_sandbox.get_sandbox(f"test_plugin_{i}") is not None
        
        # Verify resource isolation
        for i in range(3):
            usage = plugin_sandbox.get_resource_usage(f"test_plugin_{i}")
            assert usage["memory"] <= 100.0
            assert usage["cpu"] <= 25.0
    
    finally:
        # Cleanup all sandboxes
        for sandbox in sandboxes:
            plugin_sandbox.remove_sandbox(sandbox.config.plugin_id)

def test_sandbox_persistence(plugin_sandbox, sandbox_config):
    """Test sandbox persistence."""
    # Create sandbox
    sandbox = plugin_sandbox.create_sandbox(sandbox_config)
    
    # Update resource usage
    plugin_sandbox.update_resource_usage(
        sandbox_config.plugin_id,
        {
            "cpu": 25.0,
            "memory": 256.0,
            "disk": 50.0,
            "network": 25.0
        }
    )
    
    # Get sandbox again
    sandbox2 = plugin_sandbox.get_sandbox(sandbox_config.plugin_id)
    
    # Verify persistence
    assert sandbox2 is not None
    assert sandbox2.config == sandbox_config
    assert sandbox2.temp_dir == sandbox.temp_dir
    
    # Verify resource usage persistence
    usage = plugin_sandbox.get_resource_usage(sandbox_config.plugin_id)
    assert usage["cpu"] == 25.0
    assert usage["memory"] == 256.0
    assert usage["disk"] == 50.0
    assert usage["network"] == 25.0
    
    # Cleanup
    plugin_sandbox.remove_sandbox(sandbox_config.plugin_id) 