"""
Scaling Manager
Handles horizontal scaling and performance monitoring.
"""

from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import threading
import time
import psutil
import os

@dataclass
class ScalingMetrics:
    """Represents system scaling metrics."""
    timestamp: datetime = field(default_factory=datetime.utcnow)
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    io_usage: float = 0.0
    network_usage: float = 0.0
    active_workers: int = 0
    queue_size: int = 0
    response_time: float = 0.0
    error_rate: float = 0.0

class ScalingManager:
    """Manages horizontal scaling and performance monitoring."""
    
    def __init__(self):
        self.metrics_history: List[ScalingMetrics] = []
        self.max_history_size = 1000
        self.collection_interval = 60  # seconds
        self.scaling_thresholds = {
            'cpu_usage': 0.8,  # 80% CPU usage triggers scaling
            'memory_usage': 0.8,  # 80% memory usage triggers scaling
            'queue_size': 1000,  # Queue size threshold
            'response_time': 1.0,  # Response time threshold in seconds
            'error_rate': 0.05  # 5% error rate threshold
        }
        self.scaling_limits = {
            'min_workers': 1,
            'max_workers': 10,
            'scale_up_step': 1,
            'scale_down_step': 1,
            'cooldown_period': 300  # 5 minutes cooldown between scaling actions
        }
        self.last_scale_time: Optional[datetime] = None
        self._collection_thread: Optional[threading.Thread] = None
        self._stop_collection = threading.Event()
    
    def start_metrics_collection(self):
        """Start collecting system metrics."""
        if self._collection_thread and self._collection_thread.is_alive():
            return
        
        self._stop_collection.clear()
        self._collection_thread = threading.Thread(
            target=self._collect_metrics_loop,
            daemon=True
        )
        self._collection_thread.start()
    
    def stop_metrics_collection(self):
        """Stop collecting system metrics."""
        if self._collection_thread and self._collection_thread.is_alive():
            self._stop_collection.set()
            self._collection_thread.join()
    
    def _collect_metrics_loop(self):
        """Background thread for collecting metrics."""
        while not self._stop_collection.is_set():
            metrics = self._collect_current_metrics()
            self.metrics_history.append(metrics)
            
            # Trim history if needed
            if len(self.metrics_history) > self.max_history_size:
                self.metrics_history = self.metrics_history[-self.max_history_size:]
            
            # Check if scaling is needed
            self._check_scaling_needs(metrics)
            
            time.sleep(self.collection_interval)
    
    def _collect_current_metrics(self) -> ScalingMetrics:
        """Collect current system metrics."""
        metrics = ScalingMetrics()
        
        # CPU usage
        metrics.cpu_usage = psutil.cpu_percent() / 100.0
        
        # Memory usage
        memory = psutil.virtual_memory()
        metrics.memory_usage = memory.percent / 100.0
        
        # IO usage
        io_counters = psutil.disk_io_counters()
        metrics.io_usage = (io_counters.read_bytes + io_counters.write_bytes) / (1024 * 1024 * 1024)  # GB
        
        # Network usage
        net_counters = psutil.net_io_counters()
        metrics.network_usage = (net_counters.bytes_sent + net_counters.bytes_recv) / (1024 * 1024 * 1024)  # GB
        
        # Active workers (placeholder - implement based on your worker system)
        metrics.active_workers = self._get_active_worker_count()
        
        # Queue size (placeholder - implement based on your queue system)
        metrics.queue_size = self._get_queue_size()
        
        # Response time (placeholder - implement based on your monitoring system)
        metrics.response_time = self._get_average_response_time()
        
        # Error rate (placeholder - implement based on your error tracking)
        metrics.error_rate = self._get_error_rate()
        
        return metrics
    
    def _get_active_worker_count(self) -> int:
        """Get the number of active workers."""
        # Implement based on your worker system
        return 1
    
    def _get_queue_size(self) -> int:
        """Get the current queue size."""
        # Implement based on your queue system
        return 0
    
    def _get_average_response_time(self) -> float:
        """Get the average response time."""
        # Implement based on your monitoring system
        return 0.0
    
    def _get_error_rate(self) -> float:
        """Get the current error rate."""
        # Implement based on your error tracking
        return 0.0
    
    def _check_scaling_needs(self, metrics: ScalingMetrics):
        """Check if scaling is needed based on current metrics."""
        if not self._can_scale():
            return
        
        should_scale_up = (
            metrics.cpu_usage > self.scaling_thresholds['cpu_usage'] or
            metrics.memory_usage > self.scaling_thresholds['memory_usage'] or
            metrics.queue_size > self.scaling_thresholds['queue_size'] or
            metrics.response_time > self.scaling_thresholds['response_time'] or
            metrics.error_rate > self.scaling_thresholds['error_rate']
        )
        
        should_scale_down = (
            metrics.cpu_usage < self.scaling_thresholds['cpu_usage'] * 0.5 and
            metrics.memory_usage < self.scaling_thresholds['memory_usage'] * 0.5 and
            metrics.queue_size < self.scaling_thresholds['queue_size'] * 0.5 and
            metrics.response_time < self.scaling_thresholds['response_time'] * 0.5 and
            metrics.error_rate < self.scaling_thresholds['error_rate'] * 0.5
        )
        
        if should_scale_up:
            self._scale_up()
        elif should_scale_down:
            self._scale_down()
    
    def _can_scale(self) -> bool:
        """Check if scaling is allowed based on cooldown period."""
        if not self.last_scale_time:
            return True
        
        cooldown = timedelta(seconds=self.scaling_limits['cooldown_period'])
        return datetime.utcnow() - self.last_scale_time > cooldown
    
    def _scale_up(self):
        """Scale up the system by adding workers."""
        current_workers = self._get_active_worker_count()
        if current_workers >= self.scaling_limits['max_workers']:
            return
        
        new_workers = min(
            current_workers + self.scaling_limits['scale_up_step'],
            self.scaling_limits['max_workers']
        )
        
        self._update_worker_count(new_workers)
        self.last_scale_time = datetime.utcnow()
    
    def _scale_down(self):
        """Scale down the system by removing workers."""
        current_workers = self._get_active_worker_count()
        if current_workers <= self.scaling_limits['min_workers']:
            return
        
        new_workers = max(
            current_workers - self.scaling_limits['scale_down_step'],
            self.scaling_limits['min_workers']
        )
        
        self._update_worker_count(new_workers)
        self.last_scale_time = datetime.utcnow()
    
    def _update_worker_count(self, new_count: int):
        """Update the number of workers."""
        # Implement based on your worker system
        pass
    
    def get_scaling_stats(self) -> Dict[str, Any]:
        """Get statistics about system scaling."""
        if not self.metrics_history:
            return {}
        
        latest = self.metrics_history[-1]
        return {
            'current_workers': latest.active_workers,
            'cpu_usage': latest.cpu_usage,
            'memory_usage': latest.memory_usage,
            'queue_size': latest.queue_size,
            'response_time': latest.response_time,
            'error_rate': latest.error_rate,
            'last_scale_time': self.last_scale_time,
            'scaling_thresholds': self.scaling_thresholds,
            'scaling_limits': self.scaling_limits
        }
    
    def update_scaling_thresholds(self, thresholds: Dict[str, float]):
        """Update scaling thresholds."""
        self.scaling_thresholds.update(thresholds)
    
    def update_scaling_limits(self, limits: Dict[str, int]):
        """Update scaling limits."""
        self.scaling_limits.update(limits)

# Create global scaling manager instance
scaling_manager = ScalingManager() 