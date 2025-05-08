"""
Utility Plugin Template
A template for creating utility-based plugins.
"""

import logging
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
import json
from pathlib import Path
import asyncio
import time

from core.plugin.base import BasePlugin
from core.plugin.types import PluginState, PluginError, PluginErrorType, PluginMetrics

class UtilityPlugin(BasePlugin):
    """Base class for utility plugins."""
    
    def __init__(self, plugin_id: str, name: str, version: str, utility_config: Dict[str, Any], dependencies: Optional[Dict[str, Any]] = None):
        """Initialize utility plugin.
        
        Args:
            plugin_id: Unique plugin identifier
            name: Plugin name
            version: Plugin version
            utility_config: Utility configuration
            dependencies: Plugin dependencies
        """
        super().__init__(plugin_id, name, version, dependencies)
        self.utility_config = utility_config
        self.utility_state = None
        self.utility_metrics = {}
        self.utility_cache = {}
        self.utility_locks = {}
        self.utility_pool = None
        self.utility_events = asyncio.Queue()
        self.utility_handlers = {}
        self.initialized_at = None
        self.last_used = None
        self.usage_count = 0
        self.error_count = 0
        
    async def _initialize(self) -> None:
        """Initialize utility plugin.
        
        This method:
        1. Validates utility configuration
        2. Initializes utility components
        3. Sets up utility state
        4. Configures utility metrics
        5. Creates utility resource pool
        """
        try:
            # Validate configuration
            if not self._validate_utility_config():
                raise PluginError("Invalid utility configuration", PluginErrorType.CONFIGURATION_ERROR)
            
            # Initialize components
            await self._initialize_components()
            
            # Setup state
            self.utility_state = {
                "status": "initialized",
                "components": {},
                "resources": {},
                "metrics": {},
                "errors": []
            }
            
            # Configure metrics
            self.utility_metrics = {
                "usage": {
                    "count": 0,
                    "success": 0,
                    "failure": 0,
                    "last_used": None
                },
                "performance": {
                    "avg_time": 0,
                    "total_time": 0,
                    "min_time": float("inf"),
                    "max_time": 0
                },
                "resources": {
                    "memory": 0,
                    "cpu": 0,
                    "disk": 0
                }
            }
            
            # Create resource pool
            self.utility_pool = {
                "workers": [],
                "resources": {},
                "locks": {}
            }
            
            # Set initialization time
            self.initialized_at = datetime.now().isoformat()
            
            self.logger.info(f"Utility plugin {self.name} initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize utility plugin {self.name}: {str(e)}")
            raise PluginError(f"Utility initialization failed: {str(e)}", PluginErrorType.INIT_ERROR)
    
    def _validate_utility_config(self) -> bool:
        """Validate utility configuration.
        
        Returns:
            bool: True if configuration is valid, False otherwise
        """
        try:
            # Check required fields
            required_fields = ["utility_type", "max_workers", "timeout"]
            for field in required_fields:
                if field not in self.utility_config:
                    self.logger.error(f"Missing required field in utility configuration: {field}")
                    return False
            
            # Validate utility type
            if not isinstance(self.utility_config["utility_type"], str):
                self.logger.error("Utility type must be a string")
                return False
            
            # Validate max workers
            if not isinstance(self.utility_config["max_workers"], int) or self.utility_config["max_workers"] <= 0:
                self.logger.error("Max workers must be a positive integer")
                return False
            
            # Validate timeout
            if not isinstance(self.utility_config["timeout"], (int, float)) or self.utility_config["timeout"] <= 0:
                self.logger.error("Timeout must be a positive number")
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Utility configuration validation failed: {str(e)}")
            return False
    
    async def _initialize_components(self) -> None:
        """Initialize utility components.
        
        This method:
        1. Initializes cache
        2. Sets up metrics tracking
        3. Creates resource pool
        4. Configures event handlers
        """
        try:
            # Initialize cache with settings
            self.utility_cache = {
                "data": {},
                "metadata": {},
                "settings": {
                    "max_size": self.utility_config.get("cache_size", 1000),
                    "ttl": self.utility_config.get("cache_ttl", 3600),
                    "cleanup_interval": self.utility_config.get("cache_cleanup", 300)
                }
            }
            
            # Setup metrics tracking
            self.utility_metrics.update({
                "cache": {
                    "hits": 0,
                    "misses": 0,
                    "size": 0
                },
                "operations": {
                    "total": 0,
                    "successful": 0,
                    "failed": 0
                }
            })
            
            # Create resource pool
            max_workers = self.utility_config["max_workers"]
            for _ in range(max_workers):
                worker = {
                    "id": len(self.utility_pool["workers"]),
                    "status": "ready",
                    "last_used": None,
                    "tasks_completed": 0
                }
                self.utility_pool["workers"].append(worker)
            
            # Configure event handlers
            self.utility_handlers = {
                "on_error": self._handle_error,
                "on_success": self._handle_success,
                "on_resource_limit": self._handle_resource_limit,
                "on_timeout": self._handle_timeout
            }
            
            # Start background tasks
            asyncio.create_task(self._cleanup_cache())
            asyncio.create_task(self._monitor_resources())
            
            self.logger.info("Utility components initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize utility components: {str(e)}")
            raise PluginError(f"Component initialization failed: {str(e)}", PluginErrorType.INIT_ERROR)
    
    async def _cleanup_cache(self) -> None:
        """Cleanup utility cache periodically."""
        try:
            while True:
                await asyncio.sleep(self.utility_cache["settings"]["cleanup_interval"])
                
                current_time = time.time()
                expired_keys = []
                
                # Find expired entries
                for key, metadata in self.utility_cache["metadata"].items():
                    if current_time - metadata["timestamp"] > self.utility_cache["settings"]["ttl"]:
                        expired_keys.append(key)
                
                # Remove expired entries
                for key in expired_keys:
                    del self.utility_cache["data"][key]
                    del self.utility_cache["metadata"][key]
                
                # Update cache size
                self.utility_metrics["cache"]["size"] = len(self.utility_cache["data"])
                
                self.logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.logger.error(f"Cache cleanup failed: {str(e)}")
    
    async def _monitor_resources(self) -> None:
        """Monitor utility resource usage."""
        try:
            while True:
                await asyncio.sleep(60)  # Check every minute
                
                try:
                    import psutil
                    process = psutil.Process()
                    
                    # Update resource metrics
                    self.utility_metrics["resources"].update({
                        "memory": process.memory_info().rss,
                        "cpu": process.cpu_percent(),
                        "disk": process.io_counters().read_bytes + process.io_counters().write_bytes
                    })
                    
                    # Check resource limits
                    if process.memory_info().rss > self.utility_config.get("max_memory", float("inf")):
                        await self._handle_resource_limit("memory")
                    
                    if process.cpu_percent() > self.utility_config.get("max_cpu", float("inf")):
                        await self._handle_resource_limit("cpu")
                    
                except ImportError:
                    self.logger.warning("psutil not available for resource monitoring")
                    break
                    
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.logger.error(f"Resource monitoring failed: {str(e)}")
    
    async def execute(self, command: str, args: Optional[Dict[str, Any]] = None) -> Any:
        """Execute utility command.
        
        Args:
            command: Command to execute
            args: Command arguments
            
        Returns:
            Any: Command execution result
        """
        try:
            # Update usage metrics
            self.last_used = datetime.now().isoformat()
            self.usage_count += 1
            self.utility_metrics["usage"]["count"] += 1
            
            # Validate command and args
            if not self._validate_command(command, args):
                raise PluginError(f"Invalid command or arguments: {command}", PluginErrorType.INVALID_COMMAND)
            
            # Check cache
            cache_key = self._generate_cache_key(command, args)
            if cache_key in self.utility_cache["data"]:
                self.utility_metrics["cache"]["hits"] += 1
                return self.utility_cache["data"][cache_key]
            
            # Execute command
            start_time = time.time()
            result = await self._execute_utility_command(command, args or {})
            execution_time = time.time() - start_time
            
            # Update performance metrics
            self._update_performance_metrics(execution_time)
            
            # Cache result
            self._cache_result(cache_key, result)
            
            # Update success metrics
            self.utility_metrics["usage"]["success"] += 1
            await self._handle_success(command)
            
            return result
            
        except Exception as e:
            # Update error metrics
            self.error_count += 1
            self.utility_metrics["usage"]["failure"] += 1
            await self._handle_error(e)
            raise
    
    def _validate_command(self, command: str, args: Optional[Dict[str, Any]]) -> bool:
        """Validate utility command and arguments.
        
        Args:
            command: Command to validate
            args: Command arguments
            
        Returns:
            bool: True if command and arguments are valid
        """
        try:
            # Check command
            if not isinstance(command, str) or not command.strip():
                self.logger.error("Invalid command format")
                return False
            
            # Check if command exists
            if not hasattr(self, f"_handle_{command}"):
                self.logger.error(f"Command not found: {command}")
                return False
            
            # Validate arguments if provided
            if args is not None:
                if not isinstance(args, dict):
                    self.logger.error("Arguments must be a dictionary")
                    return False
                
                # Get command handler
                handler = getattr(self, f"_handle_{command}")
                
                # Check required parameters
                params = handler.__annotations__
                for param_name, param_type in params.items():
                    if param_name == "return":
                        continue
                    if param_name not in args:
                        self.logger.error(f"Missing required argument: {param_name}")
                        return False
                    if not isinstance(args[param_name], param_type):
                        self.logger.error(f"Invalid type for argument {param_name}")
                        return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Command validation failed: {str(e)}")
            return False
    
    def _generate_cache_key(self, command: str, args: Optional[Dict[str, Any]]) -> str:
        """Generate cache key for command and arguments.
        
        Args:
            command: Command name
            args: Command arguments
            
        Returns:
            str: Cache key
        """
        try:
            # Create key components
            key_parts = [command]
            
            if args:
                # Sort arguments for consistent keys
                sorted_args = dict(sorted(args.items()))
                key_parts.append(json.dumps(sorted_args))
            
            # Join and hash
            key_string = "|".join(key_parts)
            
            import hashlib
            return hashlib.md5(key_string.encode()).hexdigest()
            
        except Exception as e:
            self.logger.error(f"Cache key generation failed: {str(e)}")
            return str(time.time())
    
    async def _execute_utility_command(self, command: str, args: Dict[str, Any]) -> Any:
        """Execute utility command with timeout and resource management.
        
        Args:
            command: Command to execute
            args: Command arguments
            
        Returns:
            Any: Command execution result
        """
        try:
            # Get command handler
            handler = getattr(self, f"_handle_{command}")
            
            # Get available worker
            worker = await self._get_worker()
            
            # Execute with timeout
            timeout = self.utility_config["timeout"]
            try:
                async with asyncio.timeout(timeout):
                    result = await handler(**args)
            except asyncio.TimeoutError:
                await self._handle_timeout(command)
                raise PluginError(f"Command timed out: {command}", PluginErrorType.TIMEOUT)
            finally:
                # Release worker
                await self._release_worker(worker)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Command execution failed: {str(e)}")
            raise PluginError(f"Command execution failed: {str(e)}", PluginErrorType.EXECUTION_ERROR)
    
    async def _get_worker(self) -> Dict[str, Any]:
        """Get available worker from pool.
        
        Returns:
            Dict[str, Any]: Worker information
        """
        try:
            # Find ready worker
            for worker in self.utility_pool["workers"]:
                if worker["status"] == "ready":
                    worker["status"] = "busy"
                    worker["last_used"] = datetime.now().isoformat()
                    return worker
            
            # No workers available
            raise PluginError("No workers available", PluginErrorType.RESOURCE_ERROR)
            
        except Exception as e:
            self.logger.error(f"Failed to get worker: {str(e)}")
            raise
    
    async def _release_worker(self, worker: Dict[str, Any]) -> None:
        """Release worker back to pool.
        
        Args:
            worker: Worker to release
        """
        try:
            worker["status"] = "ready"
            worker["tasks_completed"] += 1
            
        except Exception as e:
            self.logger.error(f"Failed to release worker: {str(e)}")
    
    def _update_performance_metrics(self, execution_time: float) -> None:
        """Update performance metrics.
        
        Args:
            execution_time: Command execution time
        """
        try:
            metrics = self.utility_metrics["performance"]
            
            # Update timing metrics
            metrics["total_time"] += execution_time
            metrics["avg_time"] = metrics["total_time"] / self.utility_metrics["usage"]["count"]
            metrics["min_time"] = min(metrics["min_time"], execution_time)
            metrics["max_time"] = max(metrics["max_time"], execution_time)
            
        except Exception as e:
            self.logger.error(f"Failed to update performance metrics: {str(e)}")
    
    def _cache_result(self, key: str, result: Any) -> None:
        """Cache command result.
        
        Args:
            key: Cache key
            result: Result to cache
        """
        try:
            # Check cache size
            if len(self.utility_cache["data"]) >= self.utility_cache["settings"]["max_size"]:
                # Remove oldest entry
                oldest_key = min(
                    self.utility_cache["metadata"],
                    key=lambda k: self.utility_cache["metadata"][k]["timestamp"]
                )
                del self.utility_cache["data"][oldest_key]
                del self.utility_cache["metadata"][oldest_key]
            
            # Add new entry
            self.utility_cache["data"][key] = result
            self.utility_cache["metadata"][key] = {
                "timestamp": time.time(),
                "type": type(result).__name__
            }
            
            # Update metrics
            self.utility_metrics["cache"]["size"] = len(self.utility_cache["data"])
            self.utility_metrics["cache"]["misses"] += 1
            
        except Exception as e:
            self.logger.error(f"Failed to cache result: {str(e)}")
    
    async def _handle_error(self, error: Exception) -> None:
        """Handle utility error.
        
        Args:
            error: Error to handle
        """
        try:
            # Log error
            self.logger.error(f"Utility error: {str(error)}")
            
            # Update error metrics
            self.error_count += 1
            
            # Add to error history
            self.utility_state["errors"].append({
                "timestamp": datetime.now().isoformat(),
                "type": type(error).__name__,
                "message": str(error)
            })
            
            # Trim error history
            max_errors = 100
            if len(self.utility_state["errors"]) > max_errors:
                self.utility_state["errors"] = self.utility_state["errors"][-max_errors:]
            
        except Exception as e:
            self.logger.error(f"Error handler failed: {str(e)}")
    
    async def _handle_success(self, command: str) -> None:
        """Handle successful command execution.
        
        Args:
            command: Executed command
        """
        try:
            # Update metrics
            self.utility_metrics["operations"]["successful"] += 1
            
            # Log success
            self.logger.debug(f"Command executed successfully: {command}")
            
        except Exception as e:
            self.logger.error(f"Success handler failed: {str(e)}")
    
    async def _handle_resource_limit(self, resource_type: str) -> None:
        """Handle resource limit reached.
        
        Args:
            resource_type: Type of resource that reached limit
        """
        try:
            # Log warning
            self.logger.warning(f"Resource limit reached: {resource_type}")
            
            # Update metrics
            self.utility_metrics["resources"][f"{resource_type}_limit_reached"] = True
            
            # Trigger cleanup if needed
            if resource_type == "memory":
                self.utility_cache["data"].clear()
                self.utility_cache["metadata"].clear()
                self.utility_metrics["cache"]["size"] = 0
            
        except Exception as e:
            self.logger.error(f"Resource limit handler failed: {str(e)}")
    
    async def _handle_timeout(self, command: str) -> None:
        """Handle command timeout.
        
        Args:
            command: Command that timed out
        """
        try:
            # Log warning
            self.logger.warning(f"Command timed out: {command}")
            
            # Update metrics
            self.utility_metrics["operations"]["failed"] += 1
            
            # Add to error history
            self.utility_state["errors"].append({
                "timestamp": datetime.now().isoformat(),
                "type": "TimeoutError",
                "message": f"Command timed out: {command}"
            })
            
        except Exception as e:
            self.logger.error(f"Timeout handler failed: {str(e)}")
    
    async def cleanup(self) -> None:
        """Cleanup utility resources."""
        try:
            # Clear cache
            self.utility_cache["data"].clear()
            self.utility_cache["metadata"].clear()
            
            # Reset metrics
            self.utility_metrics = {
                "usage": {"count": 0, "success": 0, "failure": 0},
                "performance": {"avg_time": 0, "total_time": 0},
                "resources": {"memory": 0, "cpu": 0, "disk": 0},
                "cache": {"hits": 0, "misses": 0, "size": 0},
                "operations": {"total": 0, "successful": 0, "failed": 0}
            }
            
            # Reset state
            self.utility_state["status"] = "cleaned"
            self.utility_state["errors"] = []
            
            # Reset workers
            for worker in self.utility_pool["workers"]:
                worker["status"] = "ready"
                worker["tasks_completed"] = 0
            
            self.logger.info(f"Utility plugin {self.name} cleaned up successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to cleanup utility plugin {self.name}: {str(e)}")
            raise PluginError(f"Cleanup failed: {str(e)}", PluginErrorType.CLEANUP_ERROR) 