"""
Plugin Sandbox System
Provides secure isolation and resource control for plugins.
"""

import os
import sys
import logging
import threading
import tempfile
import shutil
import signal
import resource
import ctypes
import platform
from pathlib import Path
from typing import Dict, List, Set, Optional, Any, Tuple
from dataclasses import dataclass, field
import json
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
import docker
import psutil

from .base import Plugin
from ..error_handling import error_handler, with_error_recovery
from ..resource_manager import ResourceManager, ResourceQuota

@dataclass
class SandboxConfig:
    """Sandbox configuration."""
    # Resource limits
    cpu_percent: float = 50.0
    memory_mb: int = 512
    disk_mb: int = 1024
    max_threads: int = 5
    max_connections: int = 10
    max_file_handles: int = 100
    
    # Security settings
    allow_network: bool = False
    allow_filesystem: bool = False
    allowed_paths: List[str] = field(default_factory=list)
    allowed_ports: List[int] = field(default_factory=list)
    allowed_hosts: List[str] = field(default_factory=list)
    
    # Container settings
    use_container: bool = True
    container_image: str = "python:3.9-slim"
    container_timeout: int = 30
    
    # Monitoring settings
    monitor_interval: int = 1
    max_execution_time: int = 300

class Sandbox:
    """Plugin sandbox for secure execution."""
    
    def __init__(self, plugin: Plugin, config: Optional[SandboxConfig] = None):
        """Initialize sandbox.
        
        Args:
            plugin: Plugin to sandbox
            config: Sandbox configuration
        """
        self.logger = logging.getLogger("Sandbox")
        self._setup_logging()
        
        self.plugin = plugin
        self.config = config or SandboxConfig()
        
        # Resource management
        self.resource_manager = ResourceManager()
        self._setup_resource_limits()
        
        # Container management
        self.container = None
        self._docker_client = None
        if self.config.use_container:
            self._setup_docker()
        
        # State tracking
        self._is_running = False
        self._start_time = None
        self._last_check = None
        self._violations = 0
        
        # Monitoring
        self._monitor_thread = None
        self._stop_monitoring = threading.Event()
    
    def _setup_logging(self) -> None:
        """Setup sandbox logging."""
        log_file = Path("logs") / "sandbox.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    def _setup_resource_limits(self) -> None:
        """Setup resource limits."""
        quota = ResourceQuota(
            cpu_percent=self.config.cpu_percent,
            memory_mb=self.config.memory_mb,
            disk_mb=self.config.disk_mb,
            max_threads=self.config.max_threads,
            max_connections=self.config.max_connections,
            max_file_handles=self.config.max_file_handles
        )
        self.resource_manager.set_quota(self.plugin.id, quota)
    
    def _setup_docker(self) -> None:
        """Setup Docker container."""
        try:
            self._docker_client = docker.from_env()
            self.logger.info("Docker client initialized")
        except Exception as e:
            self.logger.error(f"Failed to initialize Docker client: {str(e)}")
            self.config.use_container = False
    
    def start(self) -> None:
        """Start sandboxed execution."""
        if self._is_running:
            return
        
        try:
            self._is_running = True
            self._start_time = datetime.now()
            
            if self.config.use_container:
                self._start_container()
            else:
                self._start_process()
            
            self._start_monitoring()
            
        except Exception as e:
            self.logger.error(f"Failed to start sandbox: {str(e)}")
            self._is_running = False
            raise
    
    def stop(self) -> None:
        """Stop sandboxed execution."""
        if not self._is_running:
            return
        
        try:
            self._stop_monitoring()
            
            if self.config.use_container:
                self._stop_container()
            else:
                self._stop_process()
            
            self._is_running = False
            
        except Exception as e:
            self.logger.error(f"Failed to stop sandbox: {str(e)}")
            raise
    
    def _start_container(self) -> None:
        """Start Docker container."""
        try:
            # Create container
            self.container = self._docker_client.containers.run(
                self.config.container_image,
                command=["python", "-c", "import time; time.sleep(3600)"],
                detach=True,
                mem_limit=f"{self.config.memory_mb}m",
                cpu_period=100000,
                cpu_quota=int(self.config.cpu_percent * 1000),
                network_mode="none" if not self.config.allow_network else "bridge",
                volumes=self._get_container_volumes(),
                ports=self._get_container_ports(),
                environment=self._get_container_env(),
                remove=True
            )
            
            self.logger.info(f"Container started: {self.container.id}")
            
        except Exception as e:
            self.logger.error(f"Failed to start container: {str(e)}")
            raise
    
    def _stop_container(self) -> None:
        """Stop Docker container."""
        if self.container:
            try:
                self.container.stop(timeout=self.config.container_timeout)
                self.container.remove()
                self.logger.info(f"Container stopped: {self.container.id}")
            except Exception as e:
                self.logger.error(f"Failed to stop container: {str(e)}")
                raise
    
    def _start_process(self) -> None:
        """Start sandboxed process."""
        try:
            # Create temporary directory
            self._temp_dir = tempfile.mkdtemp()
            
            # Set resource limits
            self._set_process_limits()
            
            # Start process
            self._process = psutil.Process()
            self._process.nice(10)  # Lower priority
            
            self.logger.info(f"Process started: {self._process.pid}")
            
        except Exception as e:
            self.logger.error(f"Failed to start process: {str(e)}")
            raise
    
    def _stop_process(self) -> None:
        """Stop sandboxed process."""
        if hasattr(self, '_process'):
            try:
                self._process.terminate()
                self._process.wait(timeout=5)
                self.logger.info(f"Process stopped: {self._process.pid}")
            except Exception as e:
                self.logger.error(f"Failed to stop process: {str(e)}")
                raise
        
        if hasattr(self, '_temp_dir'):
            try:
                shutil.rmtree(self._temp_dir)
            except Exception as e:
                self.logger.error(f"Failed to remove temp directory: {str(e)}")
    
    def _set_process_limits(self) -> None:
        """Set process resource limits."""
        try:
            # CPU time limit
            resource.setrlimit(resource.RLIMIT_CPU, (
                self.config.max_execution_time,
                self.config.max_execution_time
            ))
            
            # Memory limit
            memory_limit = self.config.memory_mb * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_AS, (memory_limit, memory_limit))
            
            # File descriptors
            resource.setrlimit(resource.RLIMIT_NOFILE, (
                self.config.max_file_handles,
                self.config.max_file_handles
            ))
            
            # Stack size
            resource.setrlimit(resource.RLIMIT_STACK, (8 * 1024 * 1024, 8 * 1024 * 1024))
            
        except Exception as e:
            self.logger.error(f"Failed to set process limits: {str(e)}")
            raise
    
    def _start_monitoring(self) -> None:
        """Start resource monitoring."""
        self._stop_monitoring.clear()
        self._monitor_thread = threading.Thread(
            target=self._monitor_resources,
            daemon=True
        )
        self._monitor_thread.start()
    
    def _stop_monitoring(self) -> None:
        """Stop resource monitoring."""
        if self._monitor_thread:
            self._stop_monitoring.set()
            self._monitor_thread.join()
            self._monitor_thread = None
    
    def _monitor_resources(self) -> None:
        """Monitor resource usage."""
        while not self._stop_monitoring.is_set():
            try:
                if self.config.use_container:
                    self._check_container_resources()
                else:
                    self._check_process_resources()
                
                # Check execution time
                if self._check_execution_time():
                    self.logger.warning("Execution time limit exceeded")
                    self.stop()
                    break
                
                # Sleep for monitoring interval
                time.sleep(self.config.monitor_interval)
                
            except Exception as e:
                self.logger.error(f"Error monitoring resources: {str(e)}")
    
    def _check_container_resources(self) -> None:
        """Check container resource usage."""
        if not self.container:
            return
        
        try:
            stats = self.container.stats(stream=False)
            
            # Check CPU usage
            cpu_percent = stats['cpu_stats']['cpu_usage']['total_usage'] / \
                         stats['cpu_stats']['system_cpu_usage'] * 100
            if cpu_percent > self.config.cpu_percent:
                self._handle_violation("CPU")
            
            # Check memory usage
            memory_usage = stats['memory_stats']['usage'] / (1024 * 1024)
            if memory_usage > self.config.memory_mb:
                self._handle_violation("Memory")
            
        except Exception as e:
            self.logger.error(f"Error checking container resources: {str(e)}")
    
    def _check_process_resources(self) -> None:
        """Check process resource usage."""
        if not hasattr(self, '_process'):
            return
        
        try:
            # Check CPU usage
            cpu_percent = self._process.cpu_percent()
            if cpu_percent > self.config.cpu_percent:
                self._handle_violation("CPU")
            
            # Check memory usage
            memory_info = self._process.memory_info()
            memory_mb = memory_info.rss / (1024 * 1024)
            if memory_mb > self.config.memory_mb:
                self._handle_violation("Memory")
            
            # Check thread count
            if self._process.num_threads() > self.config.max_threads:
                self._handle_violation("Threads")
            
            # Check file handles
            if len(self._process.open_files()) > self.config.max_file_handles:
                self._handle_violation("FileHandles")
            
        except Exception as e:
            self.logger.error(f"Error checking process resources: {str(e)}")
    
    def _check_execution_time(self) -> bool:
        """Check if execution time limit is exceeded."""
        if not self._start_time:
            return False
        
        elapsed = (datetime.now() - self._start_time).total_seconds()
        return elapsed > self.config.max_execution_time
    
    def _handle_violation(self, resource_type: str) -> None:
        """Handle resource violation."""
        self._violations += 1
        self.logger.warning(f"Resource violation: {resource_type}")
        
        if self._violations >= 3:
            self.logger.error("Too many resource violations, stopping sandbox")
            self.stop()
    
    def _get_container_volumes(self) -> Dict[str, Dict[str, str]]:
        """Get container volume mappings."""
        volumes = {}
        
        if self.config.allow_filesystem:
            for path in self.config.allowed_paths:
                volumes[path] = {"bind": path, "mode": "ro"}
        
        return volumes
    
    def _get_container_ports(self) -> Dict[str, int]:
        """Get container port mappings."""
        ports = {}
        
        if self.config.allow_network:
            for port in self.config.allowed_ports:
                ports[f"{port}/tcp"] = port
        
        return ports
    
    def _get_container_env(self) -> Dict[str, str]:
        """Get container environment variables."""
        return {
            "PYTHONPATH": "/app",
            "PLUGIN_ID": self.plugin.id,
            "SANDBOXED": "1"
        }
    
    def execute(self, func: str, *args, **kwargs) -> Any:
        """Execute function in sandbox.
        
        Args:
            func: Function name to execute
            *args: Function arguments
            **kwargs: Function keyword arguments
            
        Returns:
            Any: Function result
        """
        if not self._is_running:
            raise RuntimeError("Sandbox is not running")
        
        try:
            if self.config.use_container:
                return self._execute_in_container(func, *args, **kwargs)
            else:
                return self._execute_in_process(func, *args, **kwargs)
            
        except Exception as e:
            self.logger.error(f"Error executing function: {str(e)}")
            raise
    
    def _execute_in_container(self, func: str, *args, **kwargs) -> Any:
        """Execute function in container."""
        if not self.container:
            raise RuntimeError("Container is not running")
        
        try:
            # Prepare execution command
            cmd = f"""
import json
import sys
from {self.plugin.__module__} import {self.plugin.__class__.__name__}
plugin = {self.plugin.__class__.__name__}()
result = plugin.{func}(*{args}, **{kwargs})
print(json.dumps(result))
"""
            
            # Execute command
            exec_result = self.container.exec_run(
                ["python", "-c", cmd],
                environment=self._get_container_env()
            )
            
            if exec_result.exit_code != 0:
                raise RuntimeError(f"Container execution failed: {exec_result.output}")
            
            # Parse result
            return json.loads(exec_result.output)
            
        except Exception as e:
            self.logger.error(f"Error executing in container: {str(e)}")
            raise
    
    def _execute_in_process(self, func: str, *args, **kwargs) -> Any:
        """Execute function in process."""
        if not hasattr(self, '_process'):
            raise RuntimeError("Process is not running")
        
        try:
            # Get function
            func_obj = getattr(self.plugin, func)
            
            # Execute function
            return func_obj(*args, **kwargs)
            
        except Exception as e:
            self.logger.error(f"Error executing in process: {str(e)}")
            raise
    
    def get_status(self) -> Dict[str, Any]:
        """Get sandbox status.
        
        Returns:
            Dict[str, Any]: Sandbox status
        """
        status = {
            "running": self._is_running,
            "start_time": self._start_time.isoformat() if self._start_time else None,
            "violations": self._violations,
            "config": {
                "cpu_percent": self.config.cpu_percent,
                "memory_mb": self.config.memory_mb,
                "disk_mb": self.config.disk_mb,
                "max_threads": self.config.max_threads,
                "max_connections": self.config.max_connections,
                "max_file_handles": self.config.max_file_handles,
                "use_container": self.config.use_container
            }
        }
        
        if self.config.use_container and self.container:
            status["container"] = {
                "id": self.container.id,
                "status": self.container.status
            }
        
        if hasattr(self, '_process'):
            status["process"] = {
                "pid": self._process.pid,
                "status": self._process.status()
            }
        
        return status

# Create global sandbox manager
sandbox_manager = Sandbox(None)  # Will be initialized with actual plugin 