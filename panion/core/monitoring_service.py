"""
Panion Monitoring Service
Tracks and analyzes system performance metrics.
"""

import logging
import json
import asyncio
from typing import Dict, Any, Optional, List, Deque
from datetime import datetime, timedelta
from collections import deque
from pathlib import Path
from pydantic import BaseModel, Field
import statistics
from dataclasses import dataclass, field
import psutil
import threading
import time
import numpy as np
import yaml

from .base import BaseComponent, ComponentMetadata, ComponentState
from .manager import BaseManager, ManagerMetadata
from .performance_optimizations import (
    with_connection_pool,
    cache_result,
    asyncify,
    with_circuit_breaker
)
from core.plugin.base import BasePlugin
from core.decorators import with_connection_pool, cache_result

@dataclass
class MetricWindow:
    """Sliding window for metric calculations."""
    window_size: int
    values: Deque[float] = field(default_factory=lambda: deque(maxlen=window_size))
    
    def add(self, value: float) -> None:
        """Add a value to the window."""
        self.values.append(value)
    
    def get_average(self) -> float:
        """Get average of values in window."""
        return statistics.mean(self.values) if self.values else 0.0
    
    def get_percentile(self, percentile: float) -> float:
        """Get percentile of values in window."""
        if not self.values:
            return 0.0
        return statistics.quantiles(self.values, n=100)[int(percentile * 100) - 1]

@dataclass
class UptimeStats:
    """Uptime statistics tracking."""
    start_time: datetime = field(default_factory=datetime.now)
    last_restart: datetime = field(default_factory=datetime.now)
    total_uptime: timedelta = field(default_factory=lambda: timedelta())
    last_downtime: Optional[datetime] = None
    downtime_duration: timedelta = field(default_factory=lambda: timedelta())
    restart_count: int = 0
    
    def update_uptime(self) -> None:
        """Update total uptime."""
        self.total_uptime = datetime.now() - self.start_time
    
    def record_restart(self) -> None:
        """Record a system restart."""
        self.last_restart = datetime.now()
        self.restart_count += 1
    
    def record_downtime(self) -> None:
        """Record system downtime."""
        self.last_downtime = datetime.now()
    
    def record_recovery(self) -> None:
        """Record system recovery from downtime."""
        if self.last_downtime:
            self.downtime_duration += datetime.now() - self.last_downtime
            self.last_downtime = None

class PerformanceMetrics(BaseModel):
    """System performance metrics."""
    memory_recall_time: float = 0.0  # Average time in seconds
    plugin_runtime: float = 0.0  # Average time in seconds
    goal_throughput: float = 0.0  # Goals per hour
    system_load: float = 0.0  # 0-100 scale
    timestamp: datetime = Field(default_factory=datetime.now)

@dataclass
class SystemMetrics:
    """System performance metrics.
    
    Attributes:
        timestamp: When metrics were collected
        cpu_usage: CPU usage percentage
        memory_usage: Memory usage percentage
        disk_usage: Disk usage percentage
        network_io: Network I/O statistics
        process_count: Number of running processes
        load_average: System load average
    """
    timestamp: datetime
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_io: Dict[str, int]
    process_count: int
    load_average: List[float]

class MonitoringService(BasePlugin):
    """Service for monitoring system health and performance."""
    
    def __init__(self, config_path: str = "config/monitoring_config.yaml"):
        super().__init__(
            name="MonitoringService",
            version="1.0.0",
            description="System-wide monitoring and metrics collection",
            author="Panion Team"
        )
        self.logger = logging.getLogger(__name__)
        self.config = self._load_config(config_path)
        self.data_dir = Path("data")
        self.metrics_file = self.data_dir / "system_metrics.json"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize metrics tracking
        self.metrics_history: deque = deque(maxlen=1000)
        self.current_metrics: Optional[SystemMetrics] = None
        
        # Initialize monitoring
        self._monitoring = False
        self._monitor_thread = None
        self._alert_thresholds = self.config.get('alert_thresholds', {
            'cpu': 90.0,  # 90% CPU usage
            'memory': 85.0,  # 85% memory usage
            'disk': 90.0,  # 90% disk usage
            'load': 5.0  # Load average of 5
        })
        
        metadata = ComponentMetadata(
            name="MonitoringService",
            version="1.0.0",
            description="System monitoring service",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        super().__init__(metadata)
        
        # Initialize uptime tracking
        self._uptime_stats = UptimeStats()
        self._last_health_check = datetime.now()
        self._health_check_interval = timedelta(seconds=60)
        self._health_check_task = None
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.logger.error(f"Error loading config: {e}")
            return {
                'monitoring_interval': 60,  # 60 seconds
                'alert_thresholds': {
                    'cpu': 90.0,
                    'memory': 85.0,
                    'disk': 90.0,
                    'load': 5.0
                }
            }
            
    def start_monitoring(self):
        """Start system monitoring."""
        if not self._monitoring:
            self._monitoring = True
            self._monitor_thread = threading.Thread(target=self._monitor_loop)
            self._monitor_thread.daemon = True
            self._monitor_thread.start()
            self.logger.info("Started system monitoring")
            
    def stop_monitoring(self):
        """Stop system monitoring."""
        self._monitoring = False
        if self._monitor_thread:
            self._monitor_thread.join()
            self.logger.info("Stopped system monitoring")
            
    def _monitor_loop(self):
        """Main monitoring loop."""
        while self._monitoring:
            try:
                # Collect metrics
                metrics = self._collect_metrics()
                
                # Update history
                self.metrics_history.append(metrics)
                self.current_metrics = metrics
                
                # Check for alerts
                self._check_alerts(metrics)
                
                # Save metrics
                self._save_metrics()
                
                # Sleep until next check
                time.sleep(self.config['monitoring_interval'])
                
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                time.sleep(5)  # Wait before retrying
                
    def _collect_metrics(self) -> SystemMetrics:
        """Collect current system metrics.
        
        Returns:
            SystemMetrics object containing current metrics
        """
        try:
            # Get CPU usage
            cpu_percent = psutil.cpu_percent()
            
            # Get memory usage
            memory = psutil.virtual_memory()
            
            # Get disk usage
            disk = psutil.disk_usage('/')
            
            # Get network I/O
            net_io = psutil.net_io_counters()
            
            # Get process count
            process_count = len(psutil.pids())
            
            # Get load average
            load_avg = psutil.getloadavg()
            
            return SystemMetrics(
                timestamp=datetime.now(),
                cpu_usage=cpu_percent,
                memory_usage=memory.percent,
                disk_usage=disk.percent,
                network_io={
                    'bytes_sent': net_io.bytes_sent,
                    'bytes_recv': net_io.bytes_recv,
                    'packets_sent': net_io.packets_sent,
                    'packets_recv': net_io.packets_recv
                },
                process_count=process_count,
                load_average=list(load_avg)
            )
            
        except Exception as e:
            self.logger.error(f"Error collecting metrics: {e}")
            raise
            
    def _check_alerts(self, metrics: SystemMetrics):
        """Check for alert conditions.
        
        Args:
            metrics: Current system metrics
        """
        try:
            # Check CPU usage
            if metrics.cpu_usage > self._alert_thresholds['cpu']:
                self._create_alert('high_cpu_usage', {
                    'current': metrics.cpu_usage,
                    'threshold': self._alert_thresholds['cpu']
                })
                
            # Check memory usage
            if metrics.memory_usage > self._alert_thresholds['memory']:
                self._create_alert('high_memory_usage', {
                    'current': metrics.memory_usage,
                    'threshold': self._alert_thresholds['memory']
                })
                
            # Check disk usage
            if metrics.disk_usage > self._alert_thresholds['disk']:
                self._create_alert('high_disk_usage', {
                    'current': metrics.disk_usage,
                    'threshold': self._alert_thresholds['disk']
                })
                
            # Check load average
            if metrics.load_average[0] > self._alert_thresholds['load']:
                self._create_alert('high_load', {
                    'current': metrics.load_average[0],
                    'threshold': self._alert_thresholds['load']
                })
                
        except Exception as e:
            self.logger.error(f"Error checking alerts: {e}")
            
    def _create_alert(self, alert_type: str, details: Dict[str, Any]):
        """Create a new alert.
        
        Args:
            alert_type: Type of alert
            details: Alert details
        """
        try:
            alert = {
                'type': alert_type,
                'timestamp': datetime.now().isoformat(),
                'details': details
            }
            self.logger.warning(f"Created alert: {alert}")
            
        except Exception as e:
            self.logger.error(f"Error creating alert: {e}")
            
    def _save_metrics(self):
        """Save current metrics to file."""
        try:
            if self.current_metrics:
                data = {
                    'timestamp': self.current_metrics.timestamp.isoformat(),
                    'cpu_usage': self.current_metrics.cpu_usage,
                    'memory_usage': self.current_metrics.memory_usage,
                    'disk_usage': self.current_metrics.disk_usage,
                    'network_io': self.current_metrics.network_io,
                    'process_count': self.current_metrics.process_count,
                    'load_average': self.current_metrics.load_average
                }
                with open(self.metrics_file, 'w') as f:
                    json.dump(data, f, indent=2)
                    
        except Exception as e:
            self.logger.error(f"Error saving metrics: {e}")
            
    def get_metrics(self) -> Dict[str, Any]:
        """Get current system metrics.
        
        Returns:
            Dict containing current metrics and statistics
        """
        try:
            if not self.current_metrics:
                return {'error': 'No metrics available'}
                
            # Calculate statistics
            cpu_values = [m.cpu_usage for m in self.metrics_history]
            memory_values = [m.memory_usage for m in self.metrics_history]
            disk_values = [m.disk_usage for m in self.metrics_history]
            
            return {
                'current': {
                    'timestamp': self.current_metrics.timestamp.isoformat(),
                    'cpu_usage': self.current_metrics.cpu_usage,
                    'memory_usage': self.current_metrics.memory_usage,
                    'disk_usage': self.current_metrics.disk_usage,
                    'network_io': self.current_metrics.network_io,
                    'process_count': self.current_metrics.process_count,
                    'load_average': self.current_metrics.load_average
                },
                'statistics': {
                    'cpu': {
                        'average': sum(cpu_values) / len(cpu_values),
                        'max': max(cpu_values),
                        'min': min(cpu_values)
                    },
                    'memory': {
                        'average': sum(memory_values) / len(memory_values),
                        'max': max(memory_values),
                        'min': min(memory_values)
                    },
                    'disk': {
                        'average': sum(disk_values) / len(disk_values),
                        'max': max(disk_values),
                        'min': min(disk_values)
                    }
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error getting metrics: {e}")
            return {'error': str(e)}
            
    async def stop(self):
        """Stop the monitoring service and cleanup resources."""
        try:
            self.stop_monitoring()
            self._save_metrics()
            self.logger.info("Monitoring Service stopped")
        except Exception as e:
            self.logger.error(f"Error stopping Monitoring Service: {e}")
            raise

    def _calculate_uptime_percentage(self) -> float:
        """Calculate system uptime percentage.
        
        Returns:
            float: Uptime percentage (0-100)
        """
        try:
            now = datetime.now()
            total_time = (now - self._uptime_stats.start_time).total_seconds()
            
            if total_time <= 0:
                return 0.0
                
            # Calculate total downtime
            total_downtime = self._uptime_stats.downtime_duration.total_seconds()
            
            # Calculate uptime percentage
            uptime = total_time - total_downtime
            uptime_percentage = (uptime / total_time) * 100
            
            return max(0.0, min(100.0, uptime_percentage))
            
        except Exception as e:
            self.logger.error(f"Error calculating uptime percentage: {e}")
            return 0.0

# Create singleton instance
monitoring_service = MonitoringService()

# Plugin entry point
def run_plugin() -> bool:
    """Entry point for the plugin."""
    service = MonitoringService()
    return service.run()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = run_plugin()
    print(f"Monitoring Service completed {'successfully' if success else 'with errors'}") 