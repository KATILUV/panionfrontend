"""
Tests for the resource manager.
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
from unittest.mock import patch, MagicMock

from core.resource_manager import (
    ResourceManager,
    ResourceQuota,
    ResourceUsage,
    ResourceMetrics
)

@pytest.fixture
def resource_manager():
    """Create a resource manager instance."""
    manager = ResourceManager()
    yield manager
    manager.stop_monitoring()

@pytest.fixture
def test_quota():
    """Create a test quota."""
    return ResourceQuota(
        cpu_percent=50.0,
        memory_mb=512,
        disk_mb=1024,
        max_threads=5,
        max_connections=10,
        max_file_handles=100
    )

def test_resource_manager_initialization(resource_manager):
    """Test resource manager initialization."""
    assert resource_manager._quotas == {}
    assert resource_manager._usage == {}
    assert resource_manager._metrics == {}
    assert resource_manager._monitor_thread is None
    assert not resource_manager._stop_monitoring.is_set()

def test_quota_management(resource_manager, test_quota):
    """Test quota management functionality."""
    # Set quota
    resource_manager.set_quota("test_component", test_quota)
    
    # Get quota
    quota = resource_manager.get_quota("test_component")
    assert quota is not None
    assert quota.cpu_percent == 50.0
    assert quota.memory_mb == 512
    assert quota.disk_mb == 1024
    assert quota.max_threads == 5
    assert quota.max_connections == 10
    assert quota.max_file_handles == 100
    
    # Get non-existent quota
    assert resource_manager.get_quota("non_existent") is None

def test_resource_monitoring(resource_manager):
    """Test resource monitoring functionality."""
    # Start monitoring
    resource_manager.start_monitoring()
    assert resource_manager._monitor_thread is not None
    assert resource_manager._monitor_thread.is_alive()
    
    # Wait for some monitoring data
    time.sleep(2)
    
    # Check system usage
    usage = resource_manager.get_usage("system")
    assert usage is not None
    assert isinstance(usage.cpu_percent, float)
    assert isinstance(usage.memory_mb, float)
    assert isinstance(usage.disk_mb, float)
    assert isinstance(usage.thread_count, int)
    assert isinstance(usage.connection_count, int)
    assert isinstance(usage.file_handle_count, int)
    
    # Stop monitoring
    resource_manager.stop_monitoring()
    assert resource_manager._monitor_thread is None

def test_metrics_tracking(resource_manager):
    """Test resource metrics tracking."""
    # Start monitoring
    resource_manager.start_monitoring()
    
    # Wait for some metrics to be collected
    time.sleep(2)
    
    # Get metrics
    metrics = resource_manager.get_metrics("system")
    assert metrics is not None
    assert len(metrics.usage_history) > 0
    assert isinstance(metrics.peak_usage, ResourceUsage)
    assert isinstance(metrics.average_usage, ResourceUsage)
    assert isinstance(metrics.quota_violations, int)
    
    # Check usage history
    history = metrics.usage_history
    assert all(isinstance(usage, ResourceUsage) for usage in history)
    assert all(hasattr(usage, 'timestamp') for usage in history)
    
    # Stop monitoring
    resource_manager.stop_monitoring()

def test_quota_violation_handling(resource_manager, test_quota):
    """Test quota violation handling."""
    # Set quota
    resource_manager.set_quota("test_component", test_quota)
    
    # Mock high resource usage
    with patch('psutil.cpu_percent', return_value=75.0), \
         patch('psutil.virtual_memory') as mock_memory, \
         patch('psutil.disk_usage') as mock_disk:
        
        # Configure mock memory
        mock_memory.return_value.used = 1024 * 1024 * 1024  # 1GB
        
        # Configure mock disk
        mock_disk.return_value.used = 2 * 1024 * 1024 * 1024  # 2GB
        
        # Start monitoring
        resource_manager.start_monitoring()
        
        # Wait for monitoring to detect violations
        time.sleep(2)
        
        # Check metrics
        metrics = resource_manager.get_metrics("test_component")
        assert metrics is not None
        assert metrics.quota_violations > 0
        
        # Stop monitoring
        resource_manager.stop_monitoring()

def test_resource_optimization(resource_manager, test_quota):
    """Test resource optimization."""
    # Set quota
    resource_manager.set_quota("test_component", test_quota)
    
    # Mock high resource usage
    with patch('psutil.cpu_percent', return_value=75.0), \
         patch('psutil.virtual_memory') as mock_memory, \
         patch('psutil.disk_usage') as mock_disk:
        
        # Configure mock memory
        mock_memory.return_value.used = 1024 * 1024 * 1024  # 1GB
        
        # Configure mock disk
        mock_disk.return_value.used = 2 * 1024 * 1024 * 1024  # 2GB
        
        # Start monitoring
        resource_manager.start_monitoring()
        
        # Wait for optimization to occur
        time.sleep(2)
        
        # Check metrics
        metrics = resource_manager.get_metrics("test_component")
        assert metrics is not None
        assert metrics.last_optimization is not None
        
        # Stop monitoring
        resource_manager.stop_monitoring()

def test_resource_recovery(resource_manager, test_quota):
    """Test resource recovery."""
    # Set quota
    resource_manager.set_quota("test_component", test_quota)
    
    # Mock high resource usage
    with patch('psutil.cpu_percent', return_value=75.0), \
         patch('psutil.virtual_memory') as mock_memory, \
         patch('psutil.disk_usage') as mock_disk:
        
        # Configure mock memory
        mock_memory.return_value.used = 1024 * 1024 * 1024  # 1GB
        
        # Configure mock disk
        mock_disk.return_value.used = 2 * 1024 * 1024 * 1024  # 2GB
        
        # Start monitoring
        resource_manager.start_monitoring()
        
        # Wait for recovery attempts
        time.sleep(2)
        
        # Check metrics
        metrics = resource_manager.get_metrics("test_component")
        assert metrics is not None
        
        # Stop monitoring
        resource_manager.stop_monitoring()

def test_resource_report(resource_manager, test_quota):
    """Test resource report generation."""
    # Set quota
    resource_manager.set_quota("test_component", test_quota)
    
    # Start monitoring
    resource_manager.start_monitoring()
    
    # Wait for some data
    time.sleep(2)
    
    # Get report
    report = resource_manager.get_resource_report()
    
    # Check report structure
    assert "timestamp" in report
    assert "components" in report
    assert "test_component" in report["components"]
    
    component_report = report["components"]["test_component"]
    assert "quota" in component_report
    assert "current_usage" in component_report
    assert "metrics" in component_report
    
    # Stop monitoring
    resource_manager.stop_monitoring()

def test_concurrent_monitoring(resource_manager):
    """Test concurrent resource monitoring."""
    # Start multiple monitoring threads
    threads = []
    for _ in range(3):
        thread = threading.Thread(target=resource_manager.start_monitoring)
        threads.append(thread)
        thread.start()
    
    # Wait for threads to start
    time.sleep(1)
    
    # Verify only one monitoring thread is active
    assert resource_manager._monitor_thread is not None
    assert resource_manager._monitor_thread.is_alive()
    
    # Stop monitoring
    resource_manager.stop_monitoring()
    
    # Wait for threads to finish
    for thread in threads:
        thread.join()

def test_error_handling(resource_manager):
    """Test error handling in resource manager."""
    # Mock resource monitoring to raise an error
    with patch.object(resource_manager, '_update_resource_usage', side_effect=Exception("Test error")):
        # Start monitoring
        resource_manager.start_monitoring()
        
        # Wait for error to occur
        time.sleep(2)
        
        # Verify monitoring continues despite error
        assert resource_manager._monitor_thread is not None
        assert resource_manager._monitor_thread.is_alive()
        
        # Stop monitoring
        resource_manager.stop_monitoring()

def test_resource_cleanup(resource_manager):
    """Test resource cleanup on shutdown."""
    # Start monitoring
    resource_manager.start_monitoring()
    
    # Wait for some data
    time.sleep(2)
    
    # Stop monitoring
    resource_manager.stop_monitoring()
    
    # Verify cleanup
    assert resource_manager._monitor_thread is None
    assert resource_manager._stop_monitoring.is_set() 