"""
Plugin Metrics
Handles plugin metrics and monitoring.
"""

import logging
import time
import psutil
from typing import Dict, Any, Optional, List
from datetime import datetime
from .plugin.types import PluginState

class MetricsCollector:
    """Collects and manages plugin metrics."""
    
    def __init__(self):
        """Initialize metrics collector."""
        self.logger = logging.getLogger("metrics_collector")
        self.metrics_history: Dict[str, List[Dict[str, Any]]] = {}
        self.max_history = 1000
        self.collection_interval = 60  # seconds
    
    async def collect_metrics(self, plugin_id: str, state: PluginState) -> Dict[str, Any]:
        """Collect metrics for a plugin."""
        try:
            # Get process info
            process = psutil.Process()
            
            # Collect metrics
            metrics = {
                "timestamp": datetime.now().isoformat(),
                "plugin_id": plugin_id,
                "state": state,
                "cpu_percent": process.cpu_percent(),
                "memory_percent": process.memory_percent(),
                "memory_rss": process.memory_info().rss / 1024 / 1024,  # MB
                "thread_count": process.num_threads(),
                "open_files": len(process.open_files()),
                "connections": len(process.connections())
            }
            
            # Store metrics
            if plugin_id not in self.metrics_history:
                self.metrics_history[plugin_id] = []
            
            self.metrics_history[plugin_id].append(metrics)
            
            # Trim history
            if len(self.metrics_history[plugin_id]) > self.max_history:
                self.metrics_history[plugin_id] = self.metrics_history[plugin_id][-self.max_history:]
            
            return metrics
        except Exception as e:
            self.logger.error(f"Error collecting metrics for plugin {plugin_id}: {e}")
            return {}
    
    async def get_metrics_history(self, plugin_id: str) -> List[Dict[str, Any]]:
        """Get metrics history for a plugin."""
        return self.metrics_history.get(plugin_id, [])
    
    async def get_latest_metrics(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get latest metrics for a plugin."""
        history = self.metrics_history.get(plugin_id, [])
        return history[-1] if history else None
    
    async def get_metrics_summary(self, plugin_id: str) -> Dict[str, Any]:
        """Get metrics summary for a plugin."""
        history = self.metrics_history.get(plugin_id, [])
        if not history:
            return {}
        
        # Calculate averages
        cpu_percent = sum(m["cpu_percent"] for m in history) / len(history)
        memory_percent = sum(m["memory_percent"] for m in history) / len(history)
        memory_rss = sum(m["memory_rss"] for m in history) / len(history)
        thread_count = sum(m["thread_count"] for m in history) / len(history)
        
        return {
            "plugin_id": plugin_id,
            "metrics_count": len(history),
            "time_span": {
                "start": history[0]["timestamp"],
                "end": history[-1]["timestamp"]
            },
            "averages": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory_percent,
                "memory_rss_mb": memory_rss,
                "thread_count": thread_count
            },
            "latest_state": history[-1]["state"]
        }
    
    async def clear_metrics_history(self, plugin_id: Optional[str] = None) -> None:
        """Clear metrics history for a plugin."""
        if plugin_id:
            self.metrics_history.pop(plugin_id, None)
        else:
            self.metrics_history.clear()
    
    async def get_all_metrics_summaries(self) -> Dict[str, Dict[str, Any]]:
        """Get metrics summaries for all plugins."""
        return {
            plugin_id: await self.get_metrics_summary(plugin_id)
            for plugin_id in self.metrics_history
        }
    
    async def get_metrics_trend(self, plugin_id: str, metric: str, window: int = 10) -> List[float]:
        """Get trend for a specific metric."""
        history = self.metrics_history.get(plugin_id, [])
        if not history:
            return []
        
        # Get recent values
        recent = history[-window:]
        return [m[metric] for m in recent]
    
    async def is_metrics_healthy(self, plugin_id: str) -> bool:
        """Check if plugin metrics are healthy."""
        try:
            latest = await self.get_latest_metrics(plugin_id)
            if not latest:
                return False
            
            # Check CPU usage
            if latest["cpu_percent"] > 90:
                return False
            
            # Check memory usage
            if latest["memory_percent"] > 90:
                return False
            
            # Check thread count
            if latest["thread_count"] > 100:
                return False
            
            return True
        except Exception as e:
            self.logger.error(f"Error checking metrics health for plugin {plugin_id}: {e}")
            return False

metrics = MetricsCollector() 