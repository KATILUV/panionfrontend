"""
Panion API
Main API implementation for the Panion system.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import asyncio
from pathlib import Path
import json
import yaml
from dataclasses import dataclass, field
import psutil
import threading
from collections import deque

from core.plugin.base import BasePlugin
from core.decorators import with_connection_pool, cache_result

@dataclass
class UptimeRecord:
    """Record of system uptime and performance metrics.
    
    Attributes:
        start_time: When the system started
        last_check: Last uptime check timestamp
        total_uptime: Total uptime in seconds
        downtime_periods: List of downtime periods
        performance_metrics: Dictionary of performance metrics
        alerts: List of uptime alerts
    """
    start_time: datetime
    last_check: datetime
    total_uptime: float = 0.0
    downtime_periods: List[Dict[str, Any]] = field(default_factory=list)
    performance_metrics: Dict[str, Any] = field(default_factory=dict)
    alerts: List[Dict[str, Any]] = field(default_factory=list)

class PanionAPI(BasePlugin):
    def __init__(self, config_path: str = "config/api_config.yaml"):
        super().__init__(
            name="PanionAPI",
            version="1.0.0",
            description="Main API implementation for the Panion system",
            author="Panion Team"
        )
        self.logger = logging.getLogger(__name__)
        self.config = self._load_config(config_path)
        self.data_dir = Path("data")
        self.uptime_file = self.data_dir / "uptime.json"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize uptime tracking
        self.uptime_record = self._load_uptime_record()
        self.performance_history = {
            'cpu': deque(maxlen=1000),
            'memory': deque(maxlen=1000),
            'disk': deque(maxlen=1000),
            'network': deque(maxlen=1000)
        }
        
        # Initialize monitoring
        self._monitoring = False
        self._monitor_thread = None
        self._alert_thresholds = self.config.get('alert_thresholds', {
            'cpu': 90.0,  # 90% CPU usage
            'memory': 85.0,  # 85% memory usage
            'disk': 90.0,  # 90% disk usage
            'response_time': 1.0  # 1 second response time
        })
        
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
                    'response_time': 1.0
                }
            }
            
    def _load_uptime_record(self) -> UptimeRecord:
        """Load uptime record from file."""
        try:
            if self.uptime_file.exists():
                with open(self.uptime_file, 'r') as f:
                    data = json.load(f)
                return UptimeRecord(
                    start_time=datetime.fromisoformat(data['start_time']),
                    last_check=datetime.fromisoformat(data['last_check']),
                    total_uptime=data['total_uptime'],
                    downtime_periods=data['downtime_periods'],
                    performance_metrics=data['performance_metrics'],
                    alerts=data['alerts']
                )
        except Exception as e:
            self.logger.error(f"Error loading uptime record: {e}")
            
        # Create new record if loading fails
        return UptimeRecord(
            start_time=datetime.now(),
            last_check=datetime.now()
        )
        
    def _save_uptime_record(self):
        """Save uptime record to file."""
        try:
            data = {
                'start_time': self.uptime_record.start_time.isoformat(),
                'last_check': self.uptime_record.last_check.isoformat(),
                'total_uptime': self.uptime_record.total_uptime,
                'downtime_periods': self.uptime_record.downtime_periods,
                'performance_metrics': self.uptime_record.performance_metrics,
                'alerts': self.uptime_record.alerts
            }
            with open(self.uptime_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving uptime record: {e}")
            
    def start_monitoring(self):
        """Start uptime monitoring."""
        if not self._monitoring:
            self._monitoring = True
            self._monitor_thread = threading.Thread(target=self._monitor_loop)
            self._monitor_thread.daemon = True
            self._monitor_thread.start()
            
    def stop_monitoring(self):
        """Stop uptime monitoring."""
        self._monitoring = False
        if self._monitor_thread:
            self._monitor_thread.join()
            
    def _monitor_loop(self):
        """Main monitoring loop."""
        while self._monitoring:
            try:
                # Update uptime
                self._update_uptime()
                
                # Check performance
                self._check_performance()
                
                # Save record
                self._save_uptime_record()
                
                # Sleep until next check
                time.sleep(self.config['monitoring_interval'])
                
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                time.sleep(5)  # Wait before retrying
                
    def _update_uptime(self):
        """Update uptime statistics."""
        try:
            now = datetime.now()
            time_diff = (now - self.uptime_record.last_check).total_seconds()
            
            # Check if system was down
            if time_diff > self.config['monitoring_interval'] * 2:
                # Record downtime
                downtime = {
                    'start': self.uptime_record.last_check.isoformat(),
                    'end': now.isoformat(),
                    'duration': time_diff
                }
                self.uptime_record.downtime_periods.append(downtime)
                
                # Create alert
                self._create_alert('system_downtime', {
                    'duration': time_diff,
                    'start': downtime['start'],
                    'end': downtime['end']
                })
            else:
                # Update total uptime
                self.uptime_record.total_uptime += time_diff
                
            # Update last check time
            self.uptime_record.last_check = now
            
        except Exception as e:
            self.logger.error(f"Error updating uptime: {e}")
            
    def _check_performance(self):
        """Check system performance metrics."""
        try:
            # Get CPU usage
            cpu_percent = psutil.cpu_percent()
            self.performance_history['cpu'].append(cpu_percent)
            
            # Get memory usage
            memory = psutil.virtual_memory()
            self.performance_history['memory'].append(memory.percent)
            
            # Get disk usage
            disk = psutil.disk_usage('/')
            self.performance_history['disk'].append(disk.percent)
            
            # Get network usage
            net_io = psutil.net_io_counters()
            self.performance_history['network'].append({
                'bytes_sent': net_io.bytes_sent,
                'bytes_recv': net_io.bytes_recv
            })
            
            # Update performance metrics
            self.uptime_record.performance_metrics = {
                'cpu': {
                    'current': cpu_percent,
                    'average': sum(self.performance_history['cpu']) / len(self.performance_history['cpu']),
                    'max': max(self.performance_history['cpu'])
                },
                'memory': {
                    'current': memory.percent,
                    'average': sum(self.performance_history['memory']) / len(self.performance_history['memory']),
                    'max': max(self.performance_history['memory'])
                },
                'disk': {
                    'current': disk.percent,
                    'average': sum(self.performance_history['disk']) / len(self.performance_history['disk']),
                    'max': max(self.performance_history['disk'])
                }
            }
            
            # Check for performance alerts
            self._check_performance_alerts()
            
        except Exception as e:
            self.logger.error(f"Error checking performance: {e}")
            
    def _check_performance_alerts(self):
        """Check for performance threshold violations."""
        try:
            metrics = self.uptime_record.performance_metrics
            
            # Check CPU usage
            if metrics['cpu']['current'] > self._alert_thresholds['cpu']:
                self._create_alert('high_cpu_usage', {
                    'current': metrics['cpu']['current'],
                    'threshold': self._alert_thresholds['cpu']
                })
                
            # Check memory usage
            if metrics['memory']['current'] > self._alert_thresholds['memory']:
                self._create_alert('high_memory_usage', {
                    'current': metrics['memory']['current'],
                    'threshold': self._alert_thresholds['memory']
                })
                
            # Check disk usage
            if metrics['disk']['current'] > self._alert_thresholds['disk']:
                self._create_alert('high_disk_usage', {
                    'current': metrics['disk']['current'],
                    'threshold': self._alert_thresholds['disk']
                })
                
        except Exception as e:
            self.logger.error(f"Error checking performance alerts: {e}")
            
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
            self.uptime_record.alerts.append(alert)
            self.logger.warning(f"Created alert: {alert}")
            
        except Exception as e:
            self.logger.error(f"Error creating alert: {e}")
            
    def get_uptime_stats(self) -> Dict[str, Any]:
        """Get uptime statistics.
        
        Returns:
            Dict containing uptime statistics
        """
        try:
            now = datetime.now()
            total_time = (now - self.uptime_record.start_time).total_seconds()
            uptime_percentage = (self.uptime_record.total_uptime / total_time) * 100 if total_time > 0 else 0
            
            return {
                'total_uptime': self.uptime_record.total_uptime,
                'uptime_percentage': uptime_percentage,
                'start_time': self.uptime_record.start_time.isoformat(),
                'last_check': self.uptime_record.last_check.isoformat(),
                'downtime_periods': self.uptime_record.downtime_periods,
                'performance_metrics': self.uptime_record.performance_metrics,
                'recent_alerts': self.uptime_record.alerts[-10:] if self.uptime_record.alerts else []
            }
            
        except Exception as e:
            self.logger.error(f"Error getting uptime stats: {e}")
            return {
                'error': str(e)
            }
            
    async def stop(self):
        """Stop the API and cleanup resources."""
        try:
            self.stop_monitoring()
            self._save_uptime_record()
            self.logger.info("Panion API stopped")
        except Exception as e:
            self.logger.error(f"Error stopping Panion API: {e}")
            raise

# Create singleton instance
panion_api = PanionAPI()

# Plugin entry point
def run_plugin() -> bool:
    """Entry point for the plugin."""
    api = PanionAPI()
    return api.run()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = run_plugin()
    print(f"Panion API completed {'successfully' if success else 'with errors'}") 