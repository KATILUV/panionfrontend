"""
Tests for the resource optimization system.
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
import gc
from unittest.mock import patch, MagicMock

from core.resource_optimizer import ResourceOptimizer, OptimizationConfig
from core.resource_manager import ResourceManager, ResourceUsage

@pytest.fixture
def optimization_config():
    """Create a test optimization configuration."""
    return OptimizationConfig(
        target_cpu_percent=70.0,
        target_memory_percent=80.0,
        target_disk_percent=85.0,
        check_interval=1,
        optimization_interval=2,
        enable_memory_optimization=True,
        enable_cpu_optimization=True,
        enable_disk_optimization=True,
        enable_cache_optimization=True,
        max_cache_size=1024,
        cache_ttl=3600,
        max_idle_time=1800,
        min_process_priority=10
    )

@pytest.fixture
def optimizer(optimization_config):
    """Create a resource optimizer instance."""
    optimizer = ResourceOptimizer(optimization_config)
    yield optimizer
    optimizer.stop()

def test_optimizer_initialization(optimizer, optimization_config):
    """Test optimizer initialization."""
    assert optimizer.config == optimization_config
    assert not optimizer._is_running
    assert optimizer._last_optimization is None
    assert optimizer._optimization_thread is None
    assert not optimizer._stop_optimization.is_set()
    assert len(optimizer._cache) == 0
    assert len(optimizer._cache_timestamps) == 0
    assert len(optimizer._process_usage) == 0

def test_optimizer_start_stop(optimizer):
    """Test optimizer start and stop."""
    # Start optimizer
    optimizer.start()
    assert optimizer._is_running
    assert optimizer._optimization_thread is not None
    assert optimizer._optimization_thread.is_alive()
    
    # Stop optimizer
    optimizer.stop()
    assert not optimizer._is_running
    assert optimizer._optimization_thread is None
    assert optimizer._stop_optimization.is_set()

def test_optimization_trigger(optimizer):
    """Test optimization trigger conditions."""
    # Start optimizer
    optimizer.start()
    
    # Mock high resource usage
    with patch.object(optimizer.resource_manager, 'get_usage') as mock_usage:
        mock_usage.return_value = ResourceUsage(
            cpu_percent=80.0,
            memory_percent=85.0,
            disk_percent=90.0,
            thread_count=10,
            connection_count=5,
            file_handle_count=50
        )
        
        # Wait for optimization check
        time.sleep(2)
        
        # Check if optimization was triggered
        assert optimizer._last_optimization is not None
    
    # Stop optimizer
    optimizer.stop()

def test_memory_optimization(optimizer):
    """Test memory optimization."""
    # Start optimizer
    optimizer.start()
    
    # Mock memory usage
    with patch('gc.collect') as mock_gc, \
         patch.object(optimizer, '_clear_unused_caches') as mock_clear, \
         patch.object(optimizer, '_adjust_process_memory') as mock_adjust:
        
        # Trigger optimization
        optimizer._optimize_memory()
        
        # Check if optimization methods were called
        mock_gc.assert_called_once()
        mock_clear.assert_called_once()
        mock_adjust.assert_called_once()
    
    # Stop optimizer
    optimizer.stop()

def test_cpu_optimization(optimizer):
    """Test CPU optimization."""
    # Start optimizer
    optimizer.start()
    
    # Mock CPU optimization
    with patch.object(optimizer, '_adjust_process_priorities') as mock_priorities, \
         patch.object(optimizer, '_optimize_threads') as mock_threads:
        
        # Trigger optimization
        optimizer._optimize_cpu()
        
        # Check if optimization methods were called
        mock_priorities.assert_called_once()
        mock_threads.assert_called_once()
    
    # Stop optimizer
    optimizer.stop()

def test_disk_optimization(optimizer):
    """Test disk optimization."""
    # Start optimizer
    optimizer.start()
    
    # Create temporary files
    temp_dir = tempfile.mkdtemp()
    temp_file = os.path.join(temp_dir, "panion_test.txt")
    with open(temp_file, "w") as f:
        f.write("test")
    
    # Mock disk optimization
    with patch.object(optimizer, '_optimize_file_handles') as mock_handles:
        # Trigger optimization
        optimizer._optimize_disk()
        
        # Check if optimization methods were called
        mock_handles.assert_called_once()
    
    # Check if temporary files were cleaned up
    assert not os.path.exists(temp_file)
    assert not os.path.exists(temp_dir)
    
    # Stop optimizer
    optimizer.stop()

def test_cache_optimization(optimizer):
    """Test cache optimization."""
    # Start optimizer
    optimizer.start()
    
    # Add test cache entries
    optimizer.set_cache("test1", "value1")
    optimizer.set_cache("test2", "value2")
    
    # Mock old timestamp
    old_time = datetime.now() - timedelta(seconds=optimizer.config.cache_ttl + 1)
    optimizer._cache_timestamps["test1"] = old_time
    
    # Trigger optimization
    optimizer._optimize_cache()
    
    # Check if expired cache was removed
    assert "test1" not in optimizer._cache
    assert "test2" in optimizer._cache
    
    # Stop optimizer
    optimizer.stop()

def test_cache_operations(optimizer):
    """Test cache operations."""
    # Test setting cache
    optimizer.set_cache("test", "value")
    assert optimizer._cache["test"] == "value"
    assert "test" in optimizer._cache_timestamps
    
    # Test getting cache
    value = optimizer.get_cache("test")
    assert value == "value"
    
    # Test cache expiration
    old_time = datetime.now() - timedelta(seconds=optimizer.config.cache_ttl + 1)
    optimizer._cache_timestamps["test"] = old_time
    value = optimizer.get_cache("test")
    assert value is None
    
    # Test clearing cache
    optimizer.set_cache("test", "value")
    optimizer.clear_cache()
    assert len(optimizer._cache) == 0
    assert len(optimizer._cache_timestamps) == 0

def test_process_optimization(optimizer):
    """Test process optimization."""
    # Start optimizer
    optimizer.start()
    
    # Mock process
    mock_process = MagicMock()
    mock_process.is_running.return_value = True
    
    # Add process to tracking
    optimizer._process_usage[123] = {
        'memory_limit': 1024 * 1024,
        'idle_time': optimizer.config.max_idle_time + 1
    }
    
    # Mock process optimization
    with patch('psutil.Process', return_value=mock_process):
        # Trigger optimization
        optimizer._adjust_process_memory()
        optimizer._adjust_process_priorities()
        
        # Check if process was optimized
        mock_process.memory_limit.assert_called_once()
        mock_process.nice.assert_called_once_with(optimizer.config.min_process_priority)
    
    # Stop optimizer
    optimizer.stop()

def test_thread_optimization(optimizer):
    """Test thread optimization."""
    # Start optimizer
    optimizer.start()
    
    # Create thread pool
    optimizer._thread_pool = ThreadPoolExecutor(max_workers=4)
    
    # Mock thread optimization
    with patch('threading.active_count', return_value=8), \
         patch('os.cpu_count', return_value=4):
        
        # Trigger optimization
        optimizer._optimize_threads()
        
        # Check if thread pool was adjusted
        assert optimizer._thread_pool._max_workers == 4
    
    # Stop optimizer
    optimizer.stop()

def test_file_handle_optimization(optimizer):
    """Test file handle optimization."""
    # Start optimizer
    optimizer.start()
    
    # Create test file
    test_file = tempfile.NamedTemporaryFile(delete=False)
    test_file.close()
    
    # Mock process
    mock_process = MagicMock()
    mock_process.is_running.return_value = True
    mock_process.open_files.return_value = [
        MagicMock(path=test_file.name, fd=test_file.fileno())
    ]
    
    # Add process to tracking
    optimizer._process_usage[123] = {}
    
    # Mock file handle optimization
    with patch('psutil.Process', return_value=mock_process), \
         patch('os.close') as mock_close:
        
        # Trigger optimization
        optimizer._optimize_file_handles()
        
        # Check if file handle was closed
        mock_close.assert_called_once_with(test_file.fileno())
    
    # Cleanup
    os.unlink(test_file.name)
    
    # Stop optimizer
    optimizer.stop()

def test_optimizer_status(optimizer):
    """Test optimizer status reporting."""
    # Start optimizer
    optimizer.start()
    
    # Get status
    status = optimizer.get_status()
    
    # Check status structure
    assert "running" in status
    assert "last_optimization" in status
    assert "cache_size" in status
    assert "process_count" in status
    assert "config" in status
    
    # Check config
    config = status["config"]
    assert config["target_cpu_percent"] == 70.0
    assert config["target_memory_percent"] == 80.0
    assert config["target_disk_percent"] == 85.0
    assert config["check_interval"] == 1
    assert config["optimization_interval"] == 2
    
    # Stop optimizer
    optimizer.stop()

def test_optimizer_error_handling(optimizer):
    """Test optimizer error handling."""
    # Start optimizer
    optimizer.start()
    
    # Mock optimization error
    with patch.object(optimizer, '_optimize_memory', side_effect=Exception("Test error")):
        # Trigger optimization
        optimizer._optimize_resources()
        
        # Check if error was logged
        assert optimizer._last_optimization is not None
    
    # Stop optimizer
    optimizer.stop()

def test_concurrent_optimization(optimizer):
    """Test concurrent optimization."""
    # Start optimizer
    optimizer.start()
    
    # Create multiple threads
    threads = []
    
    def optimize_in_thread():
        try:
            optimizer._optimize_resources()
        except Exception as e:
            threads.append(e)
    
    # Start threads
    for _ in range(3):
        thread = threading.Thread(target=optimize_in_thread)
        threads.append(thread)
        thread.start()
    
    # Wait for threads
    for thread in threads:
        thread.join()
    
    # Check if optimization completed
    assert optimizer._last_optimization is not None
    
    # Stop optimizer
    optimizer.stop() 