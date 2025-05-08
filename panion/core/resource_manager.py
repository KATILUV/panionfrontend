"""
Resource Management System
Handles resource optimization, quotas, tracking, and recovery.
"""

import logging
import os
import psutil
import threading
import time
from pathlib import Path
from typing import Dict, List, Set, Optional, Any, Tuple
from dataclasses import dataclass, field
import json
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor

from .error_handling import error_handler, with_error_recovery
from .shared_state import shared_state

@dataclass
class ResourceQuota:
    """Resource quota configuration."""
    cpu_percent: float = 100.0  # Maximum CPU usage percentage
    memory_mb: int = 1024  # Maximum memory usage in MB
    disk_mb: int = 1024  # Maximum disk usage in MB
    max_threads: int = 10  # Maximum number of threads
    max_connections: int = 100  # Maximum number of connections
    max_file_handles: int = 1000  # Maximum number of file handles

@dataclass
class ResourceUsage:
    """Current resource usage."""
    cpu_percent: float = 0.0
    memory_mb: float = 0.0
    disk_mb: float = 0.0
    thread_count: int = 0
    connection_count: int = 0
    file_handle_count: int = 0
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class ResourceMetrics:
    """Resource usage metrics."""
    usage_history: List[ResourceUsage] = field(default_factory=list)
    peak_usage: ResourceUsage = field(default_factory=ResourceUsage)
    average_usage: ResourceUsage = field(default_factory=ResourceUsage)
    quota_violations: int = 0
    last_optimization: Optional[datetime] = None

@dataclass
class ResourcePool:
    """Resource pool with capacity and usage tracking."""
    name: str
    capacity: float
    used: float = 0.0
    reserved: float = 0.0
    
    @property
    def available(self) -> float:
        """Get available capacity."""
        return self.capacity - self.used - self.reserved

class ResourceManager:
    """Manages system resources and their allocation."""
    
    def __init__(self):
        """Initialize resource manager."""
        self.logger = logging.getLogger("ResourceManager")
        self._setup_logging()
        
        # Resource quotas
        self._quotas: Dict[str, ResourceQuota] = {}
        
        # Resource usage tracking
        self._usage: Dict[str, ResourceUsage] = {}
        
        # Resource metrics
        self._metrics: Dict[str, ResourceMetrics] = {}
        
        # Optimization settings
        self._optimization_interval = 300  # 5 minutes
        self._optimization_threshold = 0.8  # 80% of quota
        
        # Recovery settings
        self._recovery_attempts = 3
        self._recovery_cooldown = 60  # 1 minute
        
        # Resource pools
        self._thread_pool = ThreadPoolExecutor(max_workers=10)
        self._connection_pool: Dict[str, List[Any]] = {}
        
        # Monitoring thread
        self._monitor_thread = None
        self._stop_monitoring = threading.Event()
        
        # Register with shared state
        shared_state.register_component("resource_manager", self)
        
        self._pools: Dict[str, ResourcePool] = {}
        self._lock = asyncio.Lock()
    
    def _setup_logging(self) -> None:
        """Setup resource manager logging."""
        log_file = Path("logs") / "resource_manager.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    def start_monitoring(self) -> None:
        """Start resource monitoring."""
        if self._monitor_thread is None:
            self._stop_monitoring.clear()
            self._monitor_thread = threading.Thread(
                target=self._monitor_resources,
                daemon=True
            )
            self._monitor_thread.start()
    
    def stop_monitoring(self) -> None:
        """Stop resource monitoring."""
        if self._monitor_thread is not None:
            self._stop_monitoring.set()
            self._monitor_thread.join()
            self._monitor_thread = None
    
    def _monitor_resources(self) -> None:
        """Monitor system resources."""
        while not self._stop_monitoring.is_set():
            try:
                # Update resource usage
                self._update_resource_usage()
                
                # Check for quota violations
                self._check_quotas()
                
                # Optimize resources if needed
                self._optimize_resources()
                
                # Sleep for a short interval
                time.sleep(1)
                
            except Exception as e:
                self.logger.error(f"Error monitoring resources: {str(e)}")
    
    def _update_resource_usage(self) -> None:
        """Update current resource usage."""
        process = psutil.Process()
        
        # Update system-wide usage
        self._usage["system"] = ResourceUsage(
            cpu_percent=psutil.cpu_percent(),
            memory_mb=psutil.virtual_memory().used / (1024 * 1024),
            disk_mb=psutil.disk_usage('/').used / (1024 * 1024),
            thread_count=threading.active_count(),
            connection_count=len(self._connection_pool),
            file_handle_count=len(process.open_files())
        )
        
        # Update metrics
        self._update_metrics("system")
    
    def _update_metrics(self, component: str) -> None:
        """Update resource metrics for a component."""
        if component not in self._metrics:
            self._metrics[component] = ResourceMetrics()
        
        metrics = self._metrics[component]
        current_usage = self._usage[component]
        
        # Update usage history
        metrics.usage_history.append(current_usage)
        if len(metrics.usage_history) > 1000:  # Keep last 1000 measurements
            metrics.usage_history.pop(0)
        
        # Update peak usage
        if current_usage.cpu_percent > metrics.peak_usage.cpu_percent:
            metrics.peak_usage = current_usage
        
        # Update average usage
        metrics.average_usage = ResourceUsage(
            cpu_percent=sum(u.cpu_percent for u in metrics.usage_history) / len(metrics.usage_history),
            memory_mb=sum(u.memory_mb for u in metrics.usage_history) / len(metrics.usage_history),
            disk_mb=sum(u.disk_mb for u in metrics.usage_history) / len(metrics.usage_history),
            thread_count=sum(u.thread_count for u in metrics.usage_history) / len(metrics.usage_history),
            connection_count=sum(u.connection_count for u in metrics.usage_history) / len(metrics.usage_history),
            file_handle_count=sum(u.file_handle_count for u in metrics.usage_history) / len(metrics.usage_history)
        )
    
    def _check_quotas(self) -> None:
        """Check for quota violations."""
        for component, quota in self._quotas.items():
            if component not in self._usage:
                continue
            
            usage = self._usage[component]
            metrics = self._metrics[component]
            
            # Check CPU quota
            if usage.cpu_percent > quota.cpu_percent:
                self.logger.warning(f"CPU quota exceeded for {component}")
                metrics.quota_violations += 1
                self._handle_quota_violation(component, "cpu")
            
            # Check memory quota
            if usage.memory_mb > quota.memory_mb:
                self.logger.warning(f"Memory quota exceeded for {component}")
                metrics.quota_violations += 1
                self._handle_quota_violation(component, "memory")
            
            # Check disk quota
            if usage.disk_mb > quota.disk_mb:
                self.logger.warning(f"Disk quota exceeded for {component}")
                metrics.quota_violations += 1
                self._handle_quota_violation(component, "disk")
            
            # Check thread quota
            if usage.thread_count > quota.max_threads:
                self.logger.warning(f"Thread quota exceeded for {component}")
                metrics.quota_violations += 1
                self._handle_quota_violation(component, "threads")
            
            # Check connection quota
            if usage.connection_count > quota.max_connections:
                self.logger.warning(f"Connection quota exceeded for {component}")
                metrics.quota_violations += 1
                self._handle_quota_violation(component, "connections")
            
            # Check file handle quota
            if usage.file_handle_count > quota.max_file_handles:
                self.logger.warning(f"File handle quota exceeded for {component}")
                metrics.quota_violations += 1
                self._handle_quota_violation(component, "file_handles")
    
    def _handle_quota_violation(self, component: str, resource_type: str) -> None:
        """Handle quota violation."""
        try:
            # Attempt recovery
            self._recover_resources(component, resource_type)
            
            # If recovery fails, optimize resources
            if not self._is_quota_satisfied(component, resource_type):
                self._optimize_resources()
            
        except Exception as e:
            self.logger.error(f"Failed to handle quota violation: {str(e)}")
    
    def _recover_resources(self, component: str, resource_type: str) -> None:
        """Recover resources for a component."""
        for attempt in range(self._recovery_attempts):
            try:
                if resource_type == "cpu":
                    self._recover_cpu(component)
                elif resource_type == "memory":
                    self._recover_memory(component)
                elif resource_type == "disk":
                    self._recover_disk(component)
                elif resource_type == "threads":
                    self._recover_threads(component)
                elif resource_type == "connections":
                    self._recover_connections(component)
                elif resource_type == "file_handles":
                    self._recover_file_handles(component)
                
                # Check if recovery was successful
                if self._is_quota_satisfied(component, resource_type):
                    return
                
                # Wait before next attempt
                time.sleep(self._recovery_cooldown)
                
            except Exception as e:
                self.logger.error(f"Recovery attempt {attempt + 1} failed: {str(e)}")
    
    def _is_quota_satisfied(self, component: str, resource_type: str) -> bool:
        """Check if quota is satisfied for a resource type."""
        if component not in self._usage or component not in self._quotas:
            return True
        
        usage = self._usage[component]
        quota = self._quotas[component]
        
        if resource_type == "cpu":
            return usage.cpu_percent <= quota.cpu_percent
        elif resource_type == "memory":
            return usage.memory_mb <= quota.memory_mb
        elif resource_type == "disk":
            return usage.disk_mb <= quota.disk_mb
        elif resource_type == "threads":
            return usage.thread_count <= quota.max_threads
        elif resource_type == "connections":
            return usage.connection_count <= quota.max_connections
        elif resource_type == "file_handles":
            return usage.file_handle_count <= quota.max_file_handles
        
        return True
    
    def _optimize_resources(self) -> None:
        """Optimize system resources."""
        for component, metrics in self._metrics.items():
            # Check if optimization is needed
            if (metrics.last_optimization and
                (datetime.now() - metrics.last_optimization).total_seconds() < self._optimization_interval):
                continue
            
            # Check if usage is above threshold
            if component not in self._usage or component not in self._quotas:
                continue
            
            usage = self._usage[component]
            quota = self._quotas[component]
            
            if (usage.cpu_percent / quota.cpu_percent > self._optimization_threshold or
                usage.memory_mb / quota.memory_mb > self._optimization_threshold or
                usage.disk_mb / quota.disk_mb > self._optimization_threshold):
                
                try:
                    # Optimize CPU usage
                    self._optimize_cpu(component)
                    
                    # Optimize memory usage
                    self._optimize_memory(component)
                    
                    # Optimize disk usage
                    self._optimize_disk(component)
                    
                    # Update last optimization time
                    metrics.last_optimization = datetime.now()
                    
                except Exception as e:
                    self.logger.error(f"Failed to optimize resources: {str(e)}")
    
    def _recover_cpu(self, component: str) -> None:
        """Recover CPU resources."""
        # Implement CPU recovery strategies
        pass
    
    def _recover_memory(self, component: str) -> None:
        """Recover memory resources."""
        # Implement memory recovery strategies
        pass
    
    def _recover_disk(self, component: str) -> None:
        """Recover disk resources."""
        # Implement disk recovery strategies
        pass
    
    def _recover_threads(self, component: str) -> None:
        """Recover thread resources."""
        # Implement thread recovery strategies
        pass
    
    def _recover_connections(self, component: str) -> None:
        """Recover connection resources."""
        # Implement connection recovery strategies
        pass
    
    def _recover_file_handles(self, component: str) -> None:
        """Recover file handle resources."""
        # Implement file handle recovery strategies
        pass
    
    def _optimize_cpu(self, component: str) -> None:
        """Optimize CPU usage."""
        # Implement CPU optimization strategies
        pass
    
    def _optimize_memory(self, component: str) -> None:
        """Optimize memory usage."""
        # Implement memory optimization strategies
        pass
    
    def _optimize_disk(self, component: str) -> None:
        """Optimize disk usage."""
        # Implement disk optimization strategies
        pass
    
    def set_quota(self, component: str, quota: ResourceQuota) -> None:
        """Set resource quota for a component.
        
        Args:
            component: Component name
            quota: Resource quota configuration
        """
        self._quotas[component] = quota
    
    def get_quota(self, component: str) -> Optional[ResourceQuota]:
        """Get resource quota for a component.
        
        Args:
            component: Component name
            
        Returns:
            Optional[ResourceQuota]: Resource quota if set
        """
        return self._quotas.get(component)
    
    def get_usage(self, component: str) -> Optional[ResourceUsage]:
        """Get current resource usage for a component.
        
        Args:
            component: Component name
            
        Returns:
            Optional[ResourceUsage]: Current resource usage if available
        """
        return self._usage.get(component)
    
    def get_metrics(self, component: str) -> Optional[ResourceMetrics]:
        """Get resource metrics for a component.
        
        Args:
            component: Component name
            
        Returns:
            Optional[ResourceMetrics]: Resource metrics if available
        """
        return self._metrics.get(component)
    
    def get_resource_report(self) -> Dict[str, Any]:
        """Get resource usage report.
        
        Returns:
            Dict[str, Any]: Resource usage report
        """
        report = {
            "timestamp": datetime.now().isoformat(),
            "components": {}
        }
        
        for component in set(self._quotas.keys()) | set(self._usage.keys()):
            component_report = {
                "quota": self._quotas.get(component),
                "current_usage": self._usage.get(component),
                "metrics": self._metrics.get(component)
            }
            report["components"][component] = component_report
        
        return report

    async def set_capacity(self, resource_type: str, capacity: float, reserved: float = 0.0) -> None:
        """Set capacity for a resource type.
        
        Args:
            resource_type: Type of resource
            capacity: Total capacity
            reserved: Reserved capacity
        """
        async with self._lock:
            if resource_type in self._pools:
                pool = self._pools[resource_type]
                if pool.used > capacity:
                    self.logger.warning(
                        f"Cannot reduce capacity of {resource_type} below current usage"
                    )
                    return
                pool.capacity = capacity
                pool.reserved = reserved
            else:
                self._pools[resource_type] = ResourcePool(
                    name=resource_type,
                    capacity=capacity,
                    reserved=reserved
                )
    
    async def create_pool(self, resource_type: str, capacity: float, reserved: float = 0.0) -> None:
        """Create a new resource pool.
        
        Args:
            resource_type: Type of resource
            capacity: Total capacity
            reserved: Reserved capacity
        """
        async with self._lock:
            if resource_type in self._pools:
                self.logger.warning(f"Resource pool {resource_type} already exists")
                return
                
            self._pools[resource_type] = ResourcePool(
                name=resource_type,
                capacity=capacity,
                reserved=reserved
            )
    
    async def allocate(self, resource_type: str, amount: float) -> bool:
        """Allocate resources.
        
        Args:
            resource_type: Type of resource
            amount: Amount to allocate
            
        Returns:
            bool: True if allocation successful
        """
        async with self._lock:
            if resource_type not in self._pools:
                self.logger.error(f"Resource pool {resource_type} does not exist")
                return False
                
            pool = self._pools[resource_type]
            if amount > pool.available:
                self.logger.warning(
                    f"Insufficient {resource_type} resources: "
                    f"requested={amount}, available={pool.available}"
                )
                return False
                
            pool.used += amount
            return True
    
    async def release(self, resource_type: str, amount: float) -> None:
        """Release allocated resources.
        
        Args:
            resource_type: Type of resource
            amount: Amount to release
        """
        async with self._lock:
            if resource_type not in self._pools:
                self.logger.error(f"Resource pool {resource_type} does not exist")
                return
                
            pool = self._pools[resource_type]
            pool.used = max(0, pool.used - amount)
    
    async def get_usage(self, resource_type: str) -> Optional[Dict[str, float]]:
        """Get resource usage information.
        
        Args:
            resource_type: Type of resource
            
        Returns:
            Optional[Dict[str, float]]: Usage information if pool exists
        """
        async with self._lock:
            if resource_type not in self._pools:
                return None
                
            pool = self._pools[resource_type]
            return {
                "capacity": pool.capacity,
                "used": pool.used,
                "reserved": pool.reserved,
                "available": pool.available
            }
    
    async def get_all_usage(self) -> Dict[str, Dict[str, float]]:
        """Get usage information for all resource pools.
        
        Returns:
            Dict[str, Dict[str, float]]: Usage information for all pools
        """
        async with self._lock:
            return {
                name: {
                    "capacity": pool.capacity,
                    "used": pool.used,
                    "reserved": pool.reserved,
                    "available": pool.available
                }
                for name, pool in self._pools.items()
            }
    
    async def check_availability(self, requirements: Dict[str, float]) -> bool:
        """Check if resources are available.
        
        Args:
            requirements: Resource requirements
            
        Returns:
            bool: True if all required resources are available
        """
        async with self._lock:
            for resource_type, amount in requirements.items():
                if resource_type not in self._pools:
                    self.logger.error(f"Resource pool {resource_type} does not exist")
                    return False
                    
                pool = self._pools[resource_type]
                if amount > pool.available:
                    return False
                    
            return True

# Create global resource manager instance
resource_manager = ResourceManager() 