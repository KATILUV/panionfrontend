"""
Health Check Service
Centralizes system health checks and monitoring.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path
import psutil
import asyncio

from ..core.base import BaseComponent, ComponentState
from ..core.memory import MemoryManager
from ..core.plugin import PluginManager
from ..core.resource import ResourceManager

class HealthCheckResult:
    """Result of a health check."""
    def __init__(
        self,
        is_healthy: bool,
        issues: List[str] = None,
        metrics: Dict[str, Any] = None
    ):
        self.is_healthy = is_healthy
        self.issues = issues or []
        self.metrics = metrics or {}
        self.timestamp = datetime.now()

class HealthCheckService(BaseComponent):
    """Service for centralized health checks."""
    
    def __init__(self):
        super().__init__(
            name="HealthCheckService",
            version="1.0.0",
            description="Centralized health check service",
            author="Panion Team"
        )
        
        self.logger = logging.getLogger(__name__)
        self._last_check: Optional[datetime] = None
        self._check_results: Dict[str, HealthCheckResult] = {}
        self._check_interval = timedelta(minutes=5)
        self._cache_duration = timedelta(minutes=1)
        
        # Component references
        self.memory_manager: Optional[MemoryManager] = None
        self.plugin_manager: Optional[PluginManager] = None
        self.resource_manager: Optional[ResourceManager] = None
    
    async def initialize(self) -> bool:
        """Initialize the health check service."""
        try:
            self.logger.info("Initializing health check service")
            self.state = ComponentState.INITIALIZING
            
            # Get component references
            self.memory_manager = self.get_manager("MemoryManager")
            self.plugin_manager = self.get_manager("PluginManager")
            self.resource_manager = self.get_manager("ResourceManager")
            
            if not all([self.memory_manager, self.plugin_manager, self.resource_manager]):
                self.logger.error("Required managers not found")
                return False
            
            # Schedule periodic health checks
            self.schedule_task(
                self.run_health_check,
                interval=self._check_interval
            )
            
            self.state = ComponentState.ACTIVE
            self.logger.info("Health check service initialized")
            return True
            
        except Exception as e:
            self.logger.error(f"Error initializing health check service: {e}")
            self.state = ComponentState.ERROR
            return False
    
    async def run_health_check(self) -> Dict[str, HealthCheckResult]:
        """Run comprehensive health check."""
        try:
            # Check if we can use cached results
            if (self._last_check and 
                datetime.now() - self._last_check < self._cache_duration):
                return self._check_results
            
            # Run all checks
            results = {
                "system": await self._check_system(),
                "resources": await self._check_resources(),
                "plugins": await self._check_plugins(),
                "memory": await self._check_memory()
            }
            
            # Update cache
            self._last_check = datetime.now()
            self._check_results = results
            
            # Log issues if any
            for component, result in results.items():
                if not result.is_healthy:
                    self.logger.warning(
                        f"Health check failed for {component}: {result.issues}"
                    )
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error running health check: {e}")
            return {
                "system": HealthCheckResult(
                    is_healthy=False,
                    issues=[f"Health check error: {str(e)}"]
                )
            }
    
    async def _check_system(self) -> HealthCheckResult:
        """Check overall system health."""
        try:
            issues = []
            metrics = {}
            
            # Check CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            metrics["cpu_percent"] = cpu_percent
            if cpu_percent > 90:
                issues.append(f"High CPU usage: {cpu_percent}%")
            
            # Check memory usage
            memory = psutil.virtual_memory()
            metrics["memory_percent"] = memory.percent
            if memory.percent > 90:
                issues.append(f"High memory usage: {memory.percent}%")
            
            # Check disk usage
            disk = psutil.disk_usage('/')
            metrics["disk_percent"] = disk.percent
            if disk.percent > 90:
                issues.append(f"Low disk space: {disk.percent}% used")
            
            return HealthCheckResult(
                is_healthy=len(issues) == 0,
                issues=issues,
                metrics=metrics
            )
            
        except Exception as e:
            self.logger.error(f"Error checking system health: {e}")
            return HealthCheckResult(
                is_healthy=False,
                issues=[f"System check error: {str(e)}"]
            )
    
    async def _check_resources(self) -> HealthCheckResult:
        """Check resource manager health."""
        try:
            if not self.resource_manager:
                return HealthCheckResult(
                    is_healthy=False,
                    issues=["Resource manager not available"]
                )
            
            # Get resource status
            status = await self.resource_manager.get_status()
            
            issues = []
            if not status.get("is_healthy", True):
                issues.extend(status.get("issues", []))
            
            return HealthCheckResult(
                is_healthy=len(issues) == 0,
                issues=issues,
                metrics=status.get("metrics", {})
            )
            
        except Exception as e:
            self.logger.error(f"Error checking resources: {e}")
            return HealthCheckResult(
                is_healthy=False,
                issues=[f"Resource check error: {str(e)}"]
            )
    
    async def _check_plugins(self) -> HealthCheckResult:
        """Check plugin system health."""
        try:
            if not self.plugin_manager:
                return HealthCheckResult(
                    is_healthy=False,
                    issues=["Plugin manager not available"]
                )
            
            # Get plugin status
            status = await self.plugin_manager.get_status()
            
            issues = []
            for plugin_name, plugin_status in status.get("plugins", {}).items():
                if not plugin_status.get("is_healthy", True):
                    issues.append(f"Plugin {plugin_name}: {plugin_status.get('issue', 'Unknown issue')}")
            
            return HealthCheckResult(
                is_healthy=len(issues) == 0,
                issues=issues,
                metrics=status.get("metrics", {})
            )
            
        except Exception as e:
            self.logger.error(f"Error checking plugins: {e}")
            return HealthCheckResult(
                is_healthy=False,
                issues=[f"Plugin check error: {str(e)}"]
            )
    
    async def _check_memory(self) -> HealthCheckResult:
        """Check memory system health."""
        try:
            if not self.memory_manager:
                return HealthCheckResult(
                    is_healthy=False,
                    issues=["Memory manager not available"]
                )
            
            # Get memory status
            status = await self.memory_manager.get_status()
            
            issues = []
            # Check memory age
            if status.get("memory_age_stats", {}).get("max_days", 0) > 90:
                issues.append("Old memories detected")
            
            # Check memory count
            if status.get("total_memories", 0) > 10000:
                issues.append("High memory count")
            
            return HealthCheckResult(
                is_healthy=len(issues) == 0,
                issues=issues,
                metrics=status
            )
            
        except Exception as e:
            self.logger.error(f"Error checking memory: {e}")
            return HealthCheckResult(
                is_healthy=False,
                issues=[f"Memory check error: {str(e)}"]
            )
    
    async def get_component_health(self, component: str) -> Optional[HealthCheckResult]:
        """Get health status for a specific component."""
        try:
            results = await self.run_health_check()
            return results.get(component)
        except Exception as e:
            self.logger.error(f"Error getting component health: {e}")
            return None
    
    async def get_system_health(self) -> bool:
        """Get overall system health status."""
        try:
            results = await self.run_health_check()
            return all(result.is_healthy for result in results.values())
        except Exception as e:
            self.logger.error(f"Error getting system health: {e}")
            return False

# Create singleton instance
health_service = HealthCheckService() 