"""
Resource Optimization System
Provides intelligent resource optimization and management strategies.
"""

import os
import sys
import logging
import threading
import time
import psutil
import gc
from pathlib import Path
from typing import Dict, List, Set, Optional, Any, Tuple
from dataclasses import dataclass, field
import json
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor

from .error_handling import error_handler, with_error_recovery
from .resource_manager import ResourceManager, ResourceQuota, ResourceUsage

@dataclass
class OptimizationConfig:
    """Resource optimization configuration."""
    # Optimization targets
    target_cpu_percent: float = 70.0
    target_memory_percent: float = 80.0
    target_disk_percent: float = 85.0
    
    # Optimization intervals
    check_interval: int = 60  # seconds
    optimization_interval: int = 300  # seconds
    
    # Optimization strategies
    enable_memory_optimization: bool = True
    enable_cpu_optimization: bool = True
    enable_disk_optimization: bool = True
    enable_cache_optimization: bool = True
    
    # Cache settings
    max_cache_size: int = 1024  # MB
    cache_ttl: int = 3600  # seconds
    
    # Process settings
    max_idle_time: int = 1800  # seconds
    min_process_priority: int = 10

class ResourceOptimizer:
    """Resource optimization manager."""
    
    def __init__(self, config: Optional[OptimizationConfig] = None):
        """Initialize resource optimizer.
        
        Args:
            config: Optimization configuration
        """
        self.logger = logging.getLogger("ResourceOptimizer")
        self._setup_logging()
        
        self.config = config or OptimizationConfig()
        self.resource_manager = ResourceManager()
        
        # State tracking
        self._is_running = False
        self._last_optimization = None
        self._optimization_thread = None
        self._stop_optimization = threading.Event()
        
        # Cache management
        self._cache: Dict[str, Any] = {}
        self._cache_timestamps: Dict[str, datetime] = {}
        
        # Process tracking
        self._process_usage: Dict[int, Dict[str, Any]] = {}
    
    def _setup_logging(self) -> None:
        """Setup optimizer logging."""
        log_file = Path("logs") / "optimizer.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    def start(self) -> None:
        """Start resource optimization."""
        if self._is_running:
            return
        
        try:
            self._is_running = True
            self._start_optimization()
            self.logger.info("Resource optimization started")
            
        except Exception as e:
            self.logger.error(f"Failed to start optimization: {str(e)}")
            self._is_running = False
            raise
    
    def stop(self) -> None:
        """Stop resource optimization."""
        if not self._is_running:
            return
        
        try:
            self._stop_optimization.set()
            if self._optimization_thread:
                self._optimization_thread.join()
            self._is_running = False
            self.logger.info("Resource optimization stopped")
            
        except Exception as e:
            self.logger.error(f"Failed to stop optimization: {str(e)}")
            raise
    
    def _start_optimization(self) -> None:
        """Start optimization thread."""
        self._stop_optimization.clear()
        self._optimization_thread = threading.Thread(
            target=self._optimization_loop,
            daemon=True
        )
        self._optimization_thread.start()
    
    def _optimization_loop(self) -> None:
        """Main optimization loop."""
        while not self._stop_optimization.is_set():
            try:
                # Check if optimization is needed
                if self._should_optimize():
                    self._optimize_resources()
                
                # Sleep for check interval
                time.sleep(self.config.check_interval)
                
            except Exception as e:
                self.logger.error(f"Error in optimization loop: {str(e)}")
    
    def _should_optimize(self) -> bool:
        """Check if optimization is needed."""
        if not self._last_optimization:
            return True
        
        # Check time since last optimization
        elapsed = (datetime.now() - self._last_optimization).total_seconds()
        if elapsed < self.config.optimization_interval:
            return False
        
        # Check resource usage
        usage = self.resource_manager.get_usage()
        
        return (
            usage.cpu_percent > self.config.target_cpu_percent or
            usage.memory_percent > self.config.target_memory_percent or
            usage.disk_percent > self.config.target_disk_percent
        )
    
    def _optimize_resources(self) -> None:
        """Optimize system resources."""
        try:
            # Optimize memory
            if self.config.enable_memory_optimization:
                self._optimize_memory()
            
            # Optimize CPU
            if self.config.enable_cpu_optimization:
                self._optimize_cpu()
            
            # Optimize disk
            if self.config.enable_disk_optimization:
                self._optimize_disk()
            
            # Optimize cache
            if self.config.enable_cache_optimization:
                self._optimize_cache()
            
            self._last_optimization = datetime.now()
            self.logger.info("Resource optimization completed")
            
        except Exception as e:
            self.logger.error(f"Error optimizing resources: {str(e)}")
    
    def _optimize_memory(self) -> None:
        """Optimize memory usage."""
        try:
            # Force garbage collection
            gc.collect()
            
            # Clear unused caches
            self._clear_unused_caches()
            
            # Adjust process memory limits
            self._adjust_process_memory()
            
        except Exception as e:
            self.logger.error(f"Error optimizing memory: {str(e)}")
    
    def _optimize_cpu(self) -> None:
        """Optimize CPU usage."""
        try:
            # Adjust process priorities
            self._adjust_process_priorities()
            
            # Optimize thread usage
            self._optimize_threads()
            
        except Exception as e:
            self.logger.error(f"Error optimizing CPU: {str(e)}")
    
    def _optimize_disk(self) -> None:
        """Optimize disk usage."""
        try:
            # Clear temporary files
            self._clear_temp_files()
            
            # Optimize file handles
            self._optimize_file_handles()
            
        except Exception as e:
            self.logger.error(f"Error optimizing disk: {str(e)}")
    
    def _optimize_cache(self) -> None:
        """Optimize cache usage."""
        try:
            # Remove expired cache entries
            self._remove_expired_cache()
            
            # Limit cache size
            self._limit_cache_size()
            
        except Exception as e:
            self.logger.error(f"Error optimizing cache: {str(e)}")
    
    def _clear_unused_caches(self) -> None:
        """Clear unused caches."""
        current_time = datetime.now()
        expired_keys = []
        
        for key, timestamp in self._cache_timestamps.items():
            if (current_time - timestamp).total_seconds() > self.config.cache_ttl:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self._cache[key]
            del self._cache_timestamps[key]
    
    def _adjust_process_memory(self) -> None:
        """Adjust process memory limits."""
        for pid, usage in self._process_usage.items():
            try:
                process = psutil.Process(pid)
                if process.is_running():
                    # Set memory limit based on usage
                    memory_limit = min(
                        usage.get('memory_limit', 0),
                        self.config.max_cache_size * 1024 * 1024
                    )
                    process.memory_limit(memory_limit)
            except Exception as e:
                self.logger.error(f"Error adjusting process memory: {str(e)}")
    
    def _adjust_process_priorities(self) -> None:
        """Adjust process priorities."""
        for pid, usage in self._process_usage.items():
            try:
                process = psutil.Process(pid)
                if process.is_running():
                    # Lower priority for idle processes
                    if usage.get('idle_time', 0) > self.config.max_idle_time:
                        process.nice(self.config.min_process_priority)
            except Exception as e:
                self.logger.error(f"Error adjusting process priority: {str(e)}")
    
    def _optimize_threads(self) -> None:
        """Optimize thread usage."""
        try:
            # Get current thread count
            thread_count = threading.active_count()
            
            # Adjust thread pool size
            if hasattr(self, '_thread_pool'):
                self._thread_pool._max_workers = min(
                    thread_count,
                    os.cpu_count() or 4
                )
        except Exception as e:
            self.logger.error(f"Error optimizing threads: {str(e)}")
    
    def _clear_temp_files(self) -> None:
        """Clear temporary files."""
        try:
            temp_dir = Path(tempfile.gettempdir())
            for file in temp_dir.glob("panion_*"):
                try:
                    if file.is_file():
                        file.unlink()
                except Exception as e:
                    self.logger.error(f"Error clearing temp file: {str(e)}")
        except Exception as e:
            self.logger.error(f"Error clearing temp files: {str(e)}")
    
    def _optimize_file_handles(self) -> None:
        """Optimize file handle usage."""
        try:
            for pid, usage in self._process_usage.items():
                try:
                    process = psutil.Process(pid)
                    if process.is_running():
                        # Close unused file handles
                        for file in process.open_files():
                            if not file.path.startswith(str(Path.cwd())):
                                try:
                                    os.close(file.fd)
                                except Exception:
                                    pass
                except Exception as e:
                    self.logger.error(f"Error optimizing file handles: {str(e)}")
        except Exception as e:
            self.logger.error(f"Error optimizing file handles: {str(e)}")
    
    def _remove_expired_cache(self) -> None:
        """Remove expired cache entries."""
        current_time = datetime.now()
        expired_keys = []
        
        for key, timestamp in self._cache_timestamps.items():
            if (current_time - timestamp).total_seconds() > self.config.cache_ttl:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self._cache[key]
            del self._cache_timestamps[key]
    
    def _limit_cache_size(self) -> None:
        """Limit cache size."""
        current_size = sum(
            sys.getsizeof(value)
            for value in self._cache.values()
        ) / (1024 * 1024)  # Convert to MB
        
        if current_size > self.config.max_cache_size:
            # Remove oldest entries
            sorted_keys = sorted(
                self._cache_timestamps.items(),
                key=lambda x: x[1]
            )
            
            for key, _ in sorted_keys:
                if current_size <= self.config.max_cache_size:
                    break
                
                current_size -= sys.getsizeof(self._cache[key]) / (1024 * 1024)
                del self._cache[key]
                del self._cache_timestamps[key]
    
    def get_cache(self, key: str) -> Optional[Any]:
        """Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Optional[Any]: Cached value
        """
        if key in self._cache:
            # Update timestamp
            self._cache_timestamps[key] = datetime.now()
            return self._cache[key]
        return None
    
    def set_cache(self, key: str, value: Any) -> None:
        """Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
        """
        self._cache[key] = value
        self._cache_timestamps[key] = datetime.now()
    
    def clear_cache(self) -> None:
        """Clear all cached values."""
        self._cache.clear()
        self._cache_timestamps.clear()
    
    def get_status(self) -> Dict[str, Any]:
        """Get optimizer status.
        
        Returns:
            Dict[str, Any]: Optimizer status
        """
        return {
            "running": self._is_running,
            "last_optimization": self._last_optimization.isoformat() if self._last_optimization else None,
            "cache_size": len(self._cache),
            "process_count": len(self._process_usage),
            "config": {
                "target_cpu_percent": self.config.target_cpu_percent,
                "target_memory_percent": self.config.target_memory_percent,
                "target_disk_percent": self.config.target_disk_percent,
                "check_interval": self.config.check_interval,
                "optimization_interval": self.config.optimization_interval
            }
        }

# Create global optimizer instance
optimizer = ResourceOptimizer() 