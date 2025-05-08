"""
Resource Service
Centralizes resource management and monitoring.
"""

import logging
import psutil
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import json

from ..core.base import BaseComponent, ComponentState

class ResourceMetrics:
    """Resource usage metrics."""
    def __init__(
        self,
        cpu_percent: float,
        memory_percent: float,
        disk_percent: float,
        network_io: Tuple[int, int],  # (bytes_sent, bytes_recv)
        timestamp: datetime
    ):
        self.cpu_percent = cpu_percent
        self.memory_percent = memory_percent
        self.disk_percent = disk_percent
        self.network_io = network_io
        self.timestamp = timestamp

class ResourceService(BaseComponent):
    """Service for centralized resource management."""
    
    def __init__(self):
        super().__init__(
            name="ResourceService",
            version="1.0.0",
            description="Centralized resource service",
            author="Panion Team"
        )
        
        self.logger = logging.getLogger(__name__)
        self._metrics_history: List[ResourceMetrics] = []
        self._max_history_size = 1000
        self._check_interval = 60  # 1 minute
        self._warning_thresholds = {
            'cpu_percent': 80.0,
            'memory_percent': 80.0,
            'disk_percent': 80.0
        }
        self._critical_thresholds = {
            'cpu_percent': 90.0,
            'memory_percent': 90.0,
            'disk_percent': 90.0
        }
    
    async def initialize(self) -> bool:
        """Initialize the resource service."""
        try:
            self.logger.info("Initializing resource service")
            self.state = ComponentState.INITIALIZING
            
            # Schedule periodic resource checks
            self.schedule_task(
                self._collect_metrics,
                interval=self._check_interval
            )
            
            self.state = ComponentState.ACTIVE
            self.logger.info("Resource service initialized")
            return True
            
        except Exception as e:
            self.logger.error(f"Error initializing resource service: {e}")
            self.state = ComponentState.ERROR
            return False
    
    async def _collect_metrics(self):
        """Collect current resource metrics."""
        try:
            # Get CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Get memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Get disk usage
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            
            # Get network I/O
            net_io = psutil.net_io_counters()
            network_io = (net_io.bytes_sent, net_io.bytes_recv)
            
            # Create metrics object
            metrics = ResourceMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory_percent,
                disk_percent=disk_percent,
                network_io=network_io,
                timestamp=datetime.now()
            )
            
            # Add to history
            self._metrics_history.append(metrics)
            
            # Trim history if needed
            if len(self._metrics_history) > self._max_history_size:
                self._metrics_history = self._metrics_history[-self._max_history_size:]
            
            # Check for warnings
            await self._check_thresholds(metrics)
            
        except Exception as e:
            self.logger.error(f"Error collecting metrics: {e}")
    
    async def _check_thresholds(self, metrics: ResourceMetrics):
        """Check if any metrics exceed thresholds."""
        try:
            # Check CPU
            if metrics.cpu_percent >= self._critical_thresholds['cpu_percent']:
                self.logger.critical(f"Critical CPU usage: {metrics.cpu_percent}%")
            elif metrics.cpu_percent >= self._warning_thresholds['cpu_percent']:
                self.logger.warning(f"High CPU usage: {metrics.cpu_percent}%")
            
            # Check memory
            if metrics.memory_percent >= self._critical_thresholds['memory_percent']:
                self.logger.critical(f"Critical memory usage: {metrics.memory_percent}%")
            elif metrics.memory_percent >= self._warning_thresholds['memory_percent']:
                self.logger.warning(f"High memory usage: {metrics.memory_percent}%")
            
            # Check disk
            if metrics.disk_percent >= self._critical_thresholds['disk_percent']:
                self.logger.critical(f"Critical disk usage: {metrics.disk_percent}%")
            elif metrics.disk_percent >= self._warning_thresholds['disk_percent']:
                self.logger.warning(f"High disk usage: {metrics.disk_percent}%")
            
        except Exception as e:
            self.logger.error(f"Error checking thresholds: {e}")
    
    async def get_current_metrics(self) -> Optional[ResourceMetrics]:
        """Get the most recent resource metrics."""
        try:
            if not self._metrics_history:
                return None
            return self._metrics_history[-1]
        except Exception as e:
            self.logger.error(f"Error getting current metrics: {e}")
            return None
    
    async def get_metrics_history(
        self,
        duration: timedelta = timedelta(hours=1)
    ) -> List[ResourceMetrics]:
        """Get resource metrics history for a time period."""
        try:
            if not self._metrics_history:
                return []
            
            cutoff = datetime.now() - duration
            return [
                metrics for metrics in self._metrics_history
                if metrics.timestamp >= cutoff
            ]
            
        except Exception as e:
            self.logger.error(f"Error getting metrics history: {e}")
            return []
    
    async def get_resource_status(self) -> Dict:
        """Get current resource status."""
        try:
            metrics = await self.get_current_metrics()
            if not metrics:
                return {
                    "is_healthy": False,
                    "issues": ["No metrics available"]
                }
            
            issues = []
            
            # Check CPU
            if metrics.cpu_percent >= self._critical_thresholds['cpu_percent']:
                issues.append(f"Critical CPU usage: {metrics.cpu_percent}%")
            elif metrics.cpu_percent >= self._warning_thresholds['cpu_percent']:
                issues.append(f"High CPU usage: {metrics.cpu_percent}%")
            
            # Check memory
            if metrics.memory_percent >= self._critical_thresholds['memory_percent']:
                issues.append(f"Critical memory usage: {metrics.memory_percent}%")
            elif metrics.memory_percent >= self._warning_thresholds['memory_percent']:
                issues.append(f"High memory usage: {metrics.memory_percent}%")
            
            # Check disk
            if metrics.disk_percent >= self._critical_thresholds['disk_percent']:
                issues.append(f"Critical disk usage: {metrics.disk_percent}%")
            elif metrics.disk_percent >= self._warning_thresholds['disk_percent']:
                issues.append(f"High disk usage: {metrics.disk_percent}%")
            
            return {
                "is_healthy": len(issues) == 0,
                "issues": issues,
                "metrics": {
                    "cpu_percent": metrics.cpu_percent,
                    "memory_percent": metrics.memory_percent,
                    "disk_percent": metrics.disk_percent,
                    "network_io": {
                        "bytes_sent": metrics.network_io[0],
                        "bytes_recv": metrics.network_io[1]
                    },
                    "timestamp": metrics.timestamp.isoformat()
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error getting resource status: {e}")
            return {
                "is_healthy": False,
                "issues": [f"Error getting status: {str(e)}"]
            }
    
    async def set_thresholds(
        self,
        warning: Dict[str, float] = None,
        critical: Dict[str, float] = None
    ):
        """Update resource thresholds."""
        try:
            if warning:
                self._warning_thresholds.update(warning)
            if critical:
                self._critical_thresholds.update(critical)
            
            self.logger.info("Resource thresholds updated")
            
        except Exception as e:
            self.logger.error(f"Error setting thresholds: {e}")

# Create singleton instance
resource_service = ResourceService() 