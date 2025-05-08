"""
Service Plugin Template
A template for creating service-based plugins.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio
import json
from pathlib import Path

from core.plugin.base import BasePlugin
from core.plugin.types import PluginState, PluginError, PluginErrorType, PluginMetrics

class ServicePlugin(BasePlugin):
    """Base class for service-based plugins."""
    
    def __init__(self, plugin_id: str, name: str, version: str, service_config: Dict[str, Any], dependencies: Optional[Dict[str, Any]] = None):
        """Initialize service plugin.
        
        Args:
            plugin_id: Unique plugin identifier
            name: Plugin name
            version: Plugin version
            service_config: Service configuration
            dependencies: Plugin dependencies
        """
        super().__init__(plugin_id, name, version, dependencies)
        self.service_config = service_config
        self.service = None
        self.service_state = None
        self.service_metrics = {}
        self.service_health = {}
        self.service_connections = {}
        self.service_handlers = {}
        self.service_cache = {}
        self.service_locks = {}
        
    async def _initialize(self) -> None:
        """Initialize service plugin.
        
        This method:
        1. Validates service configuration
        2. Initializes service connections
        3. Sets up service handlers
        4. Initializes service state
        5. Sets up service monitoring
        """
        try:
            # Validate service configuration
            if not self._validate_service_config():
                raise PluginError("Invalid service configuration", PluginErrorType.CONFIGURATION_ERROR)
            
            # Initialize service connections
            await self._initialize_service_connections()
            
            # Setup service handlers
            await self._setup_service_handlers()
            
            # Initialize service state
            await self._initialize_service_state()
            
            # Setup service monitoring
            await self._setup_service_monitoring()
            
            self.logger.info(f"Service plugin {self.name} initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize service plugin {self.name}: {str(e)}")
            raise PluginError(f"Service initialization failed: {str(e)}", PluginErrorType.INIT_ERROR)
    
    async def _start(self) -> None:
        """Start service plugin.
        
        This method:
        1. Starts the service
        2. Establishes connections
        3. Starts monitoring
        4. Validates service state
        """
        try:
            # Start service
            await self._start_service()
            
            # Establish connections
            await self._establish_service_connections()
            
            # Start monitoring
            await self._start_service_monitoring()
            
            # Validate service state
            if not await self._validate_service_state():
                raise PluginError("Invalid service state", PluginErrorType.STATE_ERROR)
            
            self.logger.info(f"Service plugin {self.name} started successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to start service plugin {self.name}: {str(e)}")
            raise PluginError(f"Service startup failed: {str(e)}", PluginErrorType.RUNTIME_ERROR)
    
    async def _stop(self) -> None:
        """Stop service plugin.
        
        This method:
        1. Stops the service
        2. Closes connections
        3. Stops monitoring
        4. Saves service state
        """
        try:
            # Stop service
            await self._stop_service()
            
            # Close connections
            await self._close_service_connections()
            
            # Stop monitoring
            await self._stop_service_monitoring()
            
            # Save service state
            await self._save_service_state()
            
            self.logger.info(f"Service plugin {self.name} stopped successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to stop service plugin {self.name}: {str(e)}")
            raise PluginError(f"Service shutdown failed: {str(e)}", PluginErrorType.RUNTIME_ERROR)
    
    async def _execute(self, command: str, args: Dict[str, Any]) -> Any:
        """Execute service command.
        
        This method:
        1. Validates command and arguments
        2. Executes service command
        3. Updates service metrics
        4. Returns formatted result
        
        Args:
            command: Command to execute
            args: Command arguments
            
        Returns:
            Any: Command execution result
        """
        try:
            # Validate command
            if not self._is_valid_service_command(command):
                raise PluginError(f"Invalid service command: {command}", PluginErrorType.INVALID_COMMAND)
            
            # Validate arguments
            if not self._validate_service_arguments(command, args):
                raise PluginError(f"Invalid service arguments for command {command}", PluginErrorType.INVALID_ARGUMENTS)
            
            # Execute command
            start_time = time.time()
            result = await self._execute_service_command(command, args)
            execution_time = time.time() - start_time
            
            # Update metrics
            self._update_service_metrics(command, execution_time)
            
            # Format result
            return self._format_service_result(result)
            
        except Exception as e:
            self.logger.error(f"Service command execution failed: {str(e)}")
            raise PluginError(f"Service command execution failed: {str(e)}", PluginErrorType.COMMAND_ERROR)
    
    def _validate_service_config(self) -> bool:
        """Validate service configuration.
        
        Returns:
            bool: True if configuration is valid, False otherwise
        """
        try:
            # Check required fields
            required_fields = ["service_type", "service_endpoint", "service_timeout"]
            for field in required_fields:
                if field not in self.service_config:
                    self.logger.error(f"Missing required field in service configuration: {field}")
                    return False
            
            # Validate service type
            if not isinstance(self.service_config["service_type"], str):
                self.logger.error("Service type must be a string")
                return False
            
            # Validate service endpoint
            if not isinstance(self.service_config["service_endpoint"], str):
                self.logger.error("Service endpoint must be a string")
                return False
            
            # Validate service timeout
            if not isinstance(self.service_config["service_timeout"], (int, float)):
                self.logger.error("Service timeout must be a number")
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Service configuration validation failed: {str(e)}")
            return False
    
    async def _initialize_service_connections(self) -> None:
        """Initialize service connections."""
        try:
            # Initialize connection pool
            self.service_connections = {
                "main": None,
                "backup": None,
                "cache": None,
                "metrics": None
            }
            
            # Setup connection retry logic
            self.connection_retries = self.service_config.get("connection_retries", 3)
            self.connection_timeout = self.service_config.get("service_timeout", 30)
            
            self.logger.info("Service connections initialized")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize service connections: {str(e)}")
            raise PluginError(f"Service connection initialization failed: {str(e)}", PluginErrorType.CONNECTION_ERROR)
    
    async def _setup_service_handlers(self) -> None:
        """Setup service handlers."""
        try:
            # Initialize event handlers
            self.service_handlers = {
                "on_service_error": self._handle_service_error,
                "on_service_warning": self._handle_service_warning,
                "on_service_health_check": self._handle_service_health_check,
                "on_service_metrics_update": self._handle_service_metrics_update,
                "on_service_state_change": self._handle_service_state_change
            }
            
            # Setup event queue
            self.service_event_queue = asyncio.Queue()
            
            # Start event processor
            self.service_event_processor = asyncio.create_task(self._process_service_events())
            
            self.logger.info("Service handlers initialized")
            
        except Exception as e:
            self.logger.error(f"Failed to setup service handlers: {str(e)}")
            raise PluginError(f"Service handler setup failed: {str(e)}", PluginErrorType.SETUP_ERROR)
    
    async def _initialize_service_state(self) -> None:
        """Initialize service state."""
        try:
            # Initialize state
            self.service_state = {
                "status": "initializing",
                "last_updated": datetime.now().isoformat(),
                "metrics": {},
                "health": {},
                "connections": {},
                "errors": []
            }
            
            # Load saved state if exists
            state_file = Path(self.plugin_id) / "state.json"
            if state_file.exists():
                with open(state_file, "r") as f:
                    saved_state = json.load(f)
                    self.service_state.update(saved_state)
            
            self.logger.info("Service state initialized")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize service state: {str(e)}")
            raise PluginError(f"Service state initialization failed: {str(e)}", PluginErrorType.STATE_ERROR)
    
    async def _setup_service_monitoring(self) -> None:
        """Setup service monitoring."""
        try:
            # Initialize monitoring
            self.service_monitoring = {
                "health": self._setup_health_monitor(),
                "performance": self._setup_performance_monitor(),
                "errors": self._setup_error_monitor()
            }
            
            # Start monitoring
            for monitor in self.service_monitoring.values():
                await monitor.start()
            
            self.logger.info("Service monitoring initialized")
            
        except Exception as e:
            self.logger.error(f"Failed to setup service monitoring: {str(e)}")
            raise PluginError(f"Service monitoring setup failed: {str(e)}", PluginErrorType.MONITORING_ERROR)
    
    async def _start_service(self) -> None:
        """Start the service."""
        try:
            # Initialize service
            service_type = self.service_config["service_type"]
            service_endpoint = self.service_config["service_endpoint"]
            
            # Create service instance
            # This would be implemented by specific service plugins
            self.service = None  # Placeholder for service instance
            
            # Update state
            self.service_state["status"] = "starting"
            self.service_state["last_updated"] = datetime.now().isoformat()
            
            self.logger.info(f"Service {service_type} started at {service_endpoint}")
            
        except Exception as e:
            self.logger.error(f"Failed to start service: {str(e)}")
            raise PluginError(f"Service startup failed: {str(e)}", PluginErrorType.SERVICE_ERROR)
    
    async def _establish_service_connections(self) -> None:
        """Establish service connections."""
        try:
            # Connect to service
            for name, conn in self.service_connections.items():
                if conn is None:
                    # Create connection
                    # This would be implemented by specific service plugins
                    self.service_connections[name] = None  # Placeholder for connection
                    
                    # Update state
                    self.service_state["connections"][name] = "connected"
            
            self.logger.info("Service connections established")
            
        except Exception as e:
            self.logger.error(f"Failed to establish service connections: {str(e)}")
            raise PluginError(f"Service connection establishment failed: {str(e)}", PluginErrorType.CONNECTION_ERROR)
    
    async def _start_service_monitoring(self) -> None:
        """Start service monitoring."""
        try:
            # Start monitors
            for monitor in self.service_monitoring.values():
                await monitor.start()
            
            self.logger.info("Service monitoring started")
            
        except Exception as e:
            self.logger.error(f"Failed to start service monitoring: {str(e)}")
            raise PluginError(f"Service monitoring startup failed: {str(e)}", PluginErrorType.MONITORING_ERROR)
    
    async def _validate_service_state(self) -> bool:
        """Validate service state.
        
        Returns:
            bool: True if state is valid, False otherwise
        """
        try:
            # Check service status
            if self.service_state["status"] not in ["starting", "running"]:
                self.logger.error(f"Invalid service status: {self.service_state['status']}")
                return False
            
            # Check connections
            for name, status in self.service_state["connections"].items():
                if status != "connected":
                    self.logger.error(f"Invalid connection status for {name}: {status}")
                    return False
            
            # Check health
            if not self.service_state["health"].get("healthy", False):
                self.logger.error("Service health check failed")
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Service state validation failed: {str(e)}")
            return False
    
    async def _stop_service(self) -> None:
        """Stop the service."""
        try:
            # Stop service
            if self.service:
                # This would be implemented by specific service plugins
                self.service = None
            
            # Update state
            self.service_state["status"] = "stopped"
            self.service_state["last_updated"] = datetime.now().isoformat()
            
            self.logger.info("Service stopped")
            
        except Exception as e:
            self.logger.error(f"Failed to stop service: {str(e)}")
            raise PluginError(f"Service shutdown failed: {str(e)}", PluginErrorType.SERVICE_ERROR)
    
    async def _close_service_connections(self) -> None:
        """Close service connections."""
        try:
            # Close connections
            for name, conn in self.service_connections.items():
                if conn:
                    # This would be implemented by specific service plugins
                    self.service_connections[name] = None
                    
                    # Update state
                    self.service_state["connections"][name] = "disconnected"
            
            self.logger.info("Service connections closed")
            
        except Exception as e:
            self.logger.error(f"Failed to close service connections: {str(e)}")
            raise PluginError(f"Service connection closure failed: {str(e)}", PluginErrorType.CONNECTION_ERROR)
    
    async def _stop_service_monitoring(self) -> None:
        """Stop service monitoring."""
        try:
            # Stop monitors
            for monitor in self.service_monitoring.values():
                await monitor.stop()
            
            self.logger.info("Service monitoring stopped")
            
        except Exception as e:
            self.logger.error(f"Failed to stop service monitoring: {str(e)}")
            raise PluginError(f"Service monitoring shutdown failed: {str(e)}", PluginErrorType.MONITORING_ERROR)
    
    async def _save_service_state(self) -> None:
        """Save service state."""
        try:
            # Update state
            self.service_state["last_updated"] = datetime.now().isoformat()
            
            # Save state
            state_file = Path(self.plugin_id) / "state.json"
            with open(state_file, "w") as f:
                json.dump(self.service_state, f, indent=2)
            
            self.logger.info("Service state saved")
            
        except Exception as e:
            self.logger.error(f"Failed to save service state: {str(e)}")
            raise PluginError(f"Service state save failed: {str(e)}", PluginErrorType.STATE_ERROR)
    
    def _is_valid_service_command(self, command: str) -> bool:
        """Check if service command is valid.
        
        Args:
            command: Command to check
            
        Returns:
            bool: True if command is valid, False otherwise
        """
        try:
            # Check if command is a string
            if not isinstance(command, str):
                return False
            
            # Check if command is empty
            if not command.strip():
                return False
            
            # Check if command exists in service
            if not hasattr(self, f"_handle_service_{command}"):
                return False
            
            # Check if command is allowed in current state
            if self.service_state["status"] != "running":
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Service command validation failed: {str(e)}")
            return False
    
    def _validate_service_arguments(self, command: str, args: Dict[str, Any]) -> bool:
        """Validate service command arguments.
        
        Args:
            command: Command to validate arguments for
            args: Arguments to validate
            
        Returns:
            bool: True if arguments are valid, False otherwise
        """
        try:
            # Check if args is a dictionary
            if not isinstance(args, dict):
                return False
            
            # Get command handler
            handler = getattr(self, f"_handle_service_{command}", None)
            if not handler:
                return False
            
            # Get handler signature
            sig = inspect.signature(handler)
            
            # Check required parameters
            for param_name, param in sig.parameters.items():
                if param.default == inspect.Parameter.empty and param_name not in args:
                    return False
            
            # Check argument types
            for arg_name, arg_value in args.items():
                if arg_name in sig.parameters:
                    param = sig.parameters[arg_name]
                    if not isinstance(arg_value, param.annotation):
                        return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Service argument validation failed: {str(e)}")
            return False
    
    async def _execute_service_command(self, command: str, args: Dict[str, Any]) -> Any:
        """Execute service command.
        
        Args:
            command: Command to execute
            args: Command arguments
            
        Returns:
            Any: Command execution result
        """
        try:
            # Get command handler
            handler = getattr(self, f"_handle_service_{command}")
            
            # Execute command
            result = await handler(**args)
            
            # Update metrics
            self._update_service_metrics(command, 0)  # Timing handled by caller
            
            return result
            
        except Exception as e:
            self.logger.error(f"Service command execution failed: {str(e)}")
            raise PluginError(f"Service command execution failed: {str(e)}", PluginErrorType.COMMAND_ERROR)
    
    def _update_service_metrics(self, command: str, execution_time: float) -> None:
        """Update service metrics.
        
        Args:
            command: Command that was executed
            execution_time: Command execution time
        """
        try:
            # Update command metrics
            if "commands" not in self.service_metrics:
                self.service_metrics["commands"] = {}
            
            if command not in self.service_metrics["commands"]:
                self.service_metrics["commands"][command] = {
                    "count": 0,
                    "total_time": 0,
                    "avg_time": 0,
                    "errors": 0
                }
            
            metrics = self.service_metrics["commands"][command]
            metrics["count"] += 1
            metrics["total_time"] += execution_time
            metrics["avg_time"] = metrics["total_time"] / metrics["count"]
            
            # Update service state
            self.service_state["metrics"] = self.service_metrics
            
        except Exception as e:
            self.logger.error(f"Failed to update service metrics: {str(e)}")
    
    def _format_service_result(self, result: Any) -> Dict[str, Any]:
        """Format service command result.
        
        Args:
            result: Raw result to format
            
        Returns:
            Dict[str, Any]: Formatted result
        """
        try:
            # If result is None, return empty dict
            if result is None:
                return {}
            
            # If result is already a dict, ensure it has required fields
            if isinstance(result, dict):
                if "status" not in result:
                    result["status"] = "success"
                if "timestamp" not in result:
                    result["timestamp"] = datetime.now().isoformat()
                return result
            
            # Convert other types to dict
            return {
                "status": "success",
                "result": result,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Service result formatting failed: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _handle_service_error(self, error: Exception) -> None:
        """Handle service error.
        
        Args:
            error: The error to handle
        """
        self.logger.error(f"Service error: {str(error)}")
        self.service_state["errors"].append({
            "type": type(error).__name__,
            "message": str(error),
            "timestamp": datetime.now().isoformat()
        })
    
    async def _handle_service_warning(self, warning: str) -> None:
        """Handle service warning.
        
        Args:
            warning: The warning message
        """
        self.logger.warning(f"Service warning: {warning}")
    
    async def _handle_service_health_check(self, status: Dict[str, Any]) -> None:
        """Handle service health check result.
        
        Args:
            status: Health check status
        """
        self.service_state["health"] = status
        if not status["healthy"]:
            self.logger.warning(f"Service health check failed: {status['reason']}")
    
    async def _handle_service_metrics_update(self, metrics: Dict[str, Any]) -> None:
        """Handle service metrics update.
        
        Args:
            metrics: Updated metrics
        """
        self.service_metrics.update(metrics)
        self.service_state["metrics"] = self.service_metrics
    
    async def _handle_service_state_change(self, old_state: str, new_state: str) -> None:
        """Handle service state change.
        
        Args:
            old_state: Previous state
            new_state: New state
        """
        self.logger.info(f"Service state changed: {old_state} -> {new_state}")
        self.service_state["status"] = new_state
        self.service_state["last_updated"] = datetime.now().isoformat()
    
    async def _process_service_events(self) -> None:
        """Process service events."""
        try:
            while True:
                # Get event from queue
                event = await self.service_event_queue.get()
                
                try:
                    # Process event
                    event_type = event.get("type")
                    event_data = event.get("data")
                    
                    if event_type in self.service_handlers:
                        await self.service_handlers[event_type](event_data)
                    
                except Exception as e:
                    self.logger.error(f"Failed to process service event: {str(e)}")
                
                finally:
                    # Mark event as processed
                    self.service_event_queue.task_done()
                
        except asyncio.CancelledError:
            self.logger.info("Service event processor stopped")
        except Exception as e:
            self.logger.error(f"Service event processor failed: {str(e)}") 