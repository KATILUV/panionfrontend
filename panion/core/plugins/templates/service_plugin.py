"""
Service Plugin Template
A template for creating service-based Panion plugins.
"""

import logging
from typing import Dict, Any, List, Optional
from core.base_plugin import BasePlugin
from core.reflection import reflection_system
from core.service_locator import service_locator
import datetime
import os
import json
import asyncio
import uuid
import time
import aiohttp
import random

# Template variables:
# PLUGIN_NAME: The name of the plugin
# PLUGIN_DESCRIPTION: A description of the plugin's functionality
# REQUIREMENTS: Implementation requirements and notes

class ServicePluginTemplate(BasePlugin):
    def __init__(self):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.name = "{{PLUGIN_NAME}}"
        self.description = "{{PLUGIN_DESCRIPTION}}"
        self.version = "0.1.0"
        self.required_parameters = []  # List of required parameter names
        self.optional_parameters = {}  # Dict of optional parameters with default values
        self._initialize_service()
        
    def _initialize_service(self) -> None:
        """Initialize the service."""
        try:
            reflection_system.log_thought(
                self.name,
                f"Initializing {self.name} service",
                {"version": self.version}
            )
            
            # Initialize service state
            self._state = {
                "initialized_at": datetime.now().isoformat(),
                "status": "initializing",
                "connections": {},
                "metrics": self._initialize_metrics(),
                "config": self._load_config()
            }
            
            # Initialize service components
            self._initialize_components()
            
            # Start service monitoring
            self._start_monitoring()
            
            # Register service with service locator
            service_locator.register_service(
                f"{self.name.lower()}_service",
                self
            )
            
            # Update service status
            self._state["status"] = "active"
            
            self.logger.info(f"Initialized {self.name} service")
            reflection_system.log_thought(
                self.name,
                f"Initialized {self.name} service successfully",
                {"status": "active"}
            )
            
        except Exception as e:
            error_msg = f"Error initializing service: {e}"
            self.logger.error(error_msg)
            reflection_system.log_thought(
                self.name,
                error_msg,
                {"error": str(e)}
            )
            raise
        
    def _initialize_metrics(self) -> Dict[str, Any]:
        """Initialize service metrics."""
        return {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "average_response_time": 0,
            "active_connections": 0,
            "error_rate": 0,
            "last_error": None,
            "start_time": datetime.now().isoformat()
        }
        
    def _load_config(self) -> Dict[str, Any]:
        """Load service configuration."""
        try:
            # Load base configuration
            config = {
                "max_connections": 100,
                "timeout": 30,
                "retry_attempts": 3,
                "log_level": "INFO",
                "monitoring_interval": 60,
                "health_check_interval": 300
            }
            
            # Load environment-specific configuration
            env = os.getenv("ENVIRONMENT", "development")
            config_path = f"config/{env}/{self.name.lower()}.json"
            
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    env_config = json.load(f)
                    config.update(env_config)
                    
            return config
            
        except Exception as e:
            self.logger.error(f"Error loading configuration: {e}")
            return {}
            
    def _initialize_components(self) -> None:
        """Initialize service components."""
        try:
            # Initialize connection pool
            self._connection_pool = {}
            
            # Initialize request queue
            self._request_queue = asyncio.Queue()
            
            # Initialize response cache
            self._response_cache = {}
            
            # Initialize event handlers
            self._event_handlers = {}
            
            # Initialize health check
            self._health_status = {
                "status": "healthy",
                "last_check": datetime.now().isoformat(),
                "components": {}
            }
            
        except Exception as e:
            self.logger.error(f"Error initializing components: {e}")
            raise
            
    def _start_monitoring(self) -> None:
        """Start service monitoring."""
        try:
            # Start metrics collection
            asyncio.create_task(self._collect_metrics())
            
            # Start health checks
            asyncio.create_task(self._run_health_checks())
            
            # Start connection management
            asyncio.create_task(self._manage_connections())
            
        except Exception as e:
            self.logger.error(f"Error starting monitoring: {e}")
            raise
            
    async def execute(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the service."""
        try:
            reflection_system.log_thought(
                self.name,
                f"Executing {self.name} service",
                {"parameters": parameters}
            )
            
            # Validate parameters
            self._validate_parameters(parameters)
            
            # Update metrics
            self._state["metrics"]["total_requests"] += 1
            
            # Get connection from pool
            connection = await self._get_connection()
            
            # Execute service operation
            start_time = time.time()
            result = await self._execute_operation(connection, parameters)
            execution_time = time.time() - start_time
            
            # Update metrics
            self._update_metrics(execution_time, True)
            
            # Release connection
            await self._release_connection(connection)
            
            # Log success
            self.logger.info(f"Service operation completed in {execution_time:.2f}s")
            
            return result
            
        except Exception as e:
            error_msg = f"Error executing service: {e}"
            self.logger.error(error_msg)
            reflection_system.log_thought(
                self.name,
                error_msg,
                {"error": str(e)}
            )
            
            # Update error metrics
            self._update_metrics(0, False)
            self._state["metrics"]["last_error"] = str(e)
            
            return {
                "status": "failure",
                "error": str(e)
            }
            
    async def _get_connection(self) -> Any:
        """Get a connection from the pool."""
        try:
            # Check for available connections
            if len(self._connection_pool) < self._state["config"]["max_connections"]:
                # Create new connection
                connection = await self._create_connection()
                self._connection_pool[connection.id] = connection
                return connection
                
            # Wait for available connection
            while True:
                for conn in self._connection_pool.values():
                    if not conn.in_use:
                        conn.in_use = True
                        return conn
                        
                await asyncio.sleep(0.1)
                
        except Exception as e:
            self.logger.error(f"Error getting connection: {e}")
            raise
            
    async def _create_connection(self) -> Any:
        """Create a new service connection."""
        try:
            # Create connection object
            connection = {
                "id": str(uuid.uuid4()),
                "created_at": datetime.now().isoformat(),
                "in_use": False,
                "last_used": None,
                "error_count": 0
            }
            
            # Initialize connection
            await self._initialize_connection(connection)
            
            return connection
            
        except Exception as e:
            self.logger.error(f"Error creating connection: {e}")
            raise
            
    async def _initialize_connection(self, connection: Dict[str, Any]) -> None:
        """Initialize a service connection."""
        try:
            # Set up connection parameters
            connection["parameters"] = {
                "timeout": self._state["config"]["timeout"],
                "retry_attempts": self._state["config"]["retry_attempts"]
            }
            
            # Initialize connection state
            connection["state"] = "initialized"
            
        except Exception as e:
            self.logger.error(f"Error initializing connection: {e}")
            raise
            
    async def _release_connection(self, connection: Dict[str, Any]) -> None:
        """Release a connection back to the pool."""
        try:
            connection["in_use"] = False
            connection["last_used"] = datetime.now().isoformat()
            
        except Exception as e:
            self.logger.error(f"Error releasing connection: {e}")
            
    async def _execute_operation(
        self,
        connection: Dict[str, Any],
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a service operation."""
        try:
            # Process request
            request = self._process_request(parameters)
            
            # Send request
            response = await self._send_request(request["url"], request["method"], request["data"], request["headers"], request["timeout"], request["retry_attempts"])
            
            # Process response
            result = self._process_response(response)
            
            return {
                "status": "success",
                "data": result,
                "metadata": {
                    "processed_at": datetime.now().isoformat(),
                    "service_version": self.version,
                    "connection_id": connection["id"]
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error in service operation: {e}")
            raise
            
    def _process_request(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Process service request parameters."""
        try:
            # Validate and transform request data
            request = {
                "url": parameters.get("url", ""),
                "method": parameters.get("method", "GET"),
                "data": parameters.get("data", {}),
                "headers": parameters.get("headers", {}),
                "timeout": parameters.get("timeout", 30),
                "retry_attempts": parameters.get("retry_attempts", 3)
            }
            
            # Add request metadata
            request["metadata"] = {
                "request_id": str(uuid.uuid4()),
                "timestamp": datetime.now().isoformat(),
                "service": self.name
            }
            
            return request
            
        except Exception as e:
            self.logger.error(f"Error processing request: {e}")
            raise
            
    async def _send_request(
        self,
        url: str,
        method: str = 'GET',
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 30,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """Send HTTP request to service endpoint.
        
        Args:
            url: Service endpoint URL
            method: HTTP method (GET, POST, PUT, DELETE)
            data: Request payload
            headers: Request headers
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            
        Returns:
            Dict containing response data and metadata
            
        Raises:
            ServiceError: If request fails after retries
        """
        retry_count = 0
        last_error = None
        
        while retry_count <= max_retries:
            try:
                # Prepare request
                request_data = {
                    'url': url,
                    'method': method,
                    'headers': headers or {},
                    'timeout': timeout
                }
                
                if data:
                    if method in ['GET', 'DELETE']:
                        request_data['params'] = data
                    else:
                        request_data['json'] = data
                
                # Add authentication if configured
                if self.auth_token:
                    request_data['headers']['Authorization'] = f'Bearer {self.auth_token}'
                
                # Add request ID for tracking
                request_id = str(uuid.uuid4())
                request_data['headers']['X-Request-ID'] = request_id
                
                self.logger.info(
                    f"Sending {method} request to {url}",
                    extra={
                        'request_id': request_id,
                        'method': method,
                        'url': url,
                        'retry_count': retry_count
                    }
                )
                
                # Send request
                async with aiohttp.ClientSession() as session:
                    async with session.request(**request_data) as response:
                        # Process response
                        response_data = await response.json()
                        
                        # Check for error response
                        if not response.ok:
                            error_msg = response_data.get('error', 'Unknown error')
                            raise ServiceError(
                                f"Service returned error: {error_msg}",
                                status_code=response.status
                            )
                        
                        # Add response metadata
                        result = {
                            'data': response_data,
                            'metadata': {
                                'request_id': request_id,
                                'status_code': response.status,
                                'headers': dict(response.headers),
                                'timestamp': datetime.now().isoformat()
                            }
                        }
                        
                        self.logger.info(
                            f"Request completed successfully",
                            extra={
                                'request_id': request_id,
                                'status_code': response.status
                            }
                        )
                        
                        return result
                        
            except aiohttp.ClientError as e:
                last_error = e
                retry_count += 1
                
                if retry_count <= max_retries:
                    # Calculate exponential backoff
                    delay = (2 ** retry_count) + random.uniform(0, 1)
                    
                    self.logger.warning(
                        f"Request failed, retrying in {delay:.2f}s",
                        extra={
                            'request_id': request_id,
                            'error': str(e),
                            'retry_count': retry_count,
                            'max_retries': max_retries
                        }
                    )
                    
                    await asyncio.sleep(delay)
                else:
                    self.logger.error(
                        f"Request failed after {max_retries} retries",
                        extra={
                            'request_id': request_id,
                            'error': str(e),
                            'url': url,
                            'method': method
                        }
                    )
                    raise ServiceError(
                        f"Failed to send request after {max_retries} retries: {str(e)}",
                        status_code=500
                    )
                    
            except asyncio.TimeoutError as e:
                last_error = e
                retry_count += 1
                
                if retry_count <= max_retries:
                    self.logger.warning(
                        f"Request timed out, retrying",
                        extra={
                            'request_id': request_id,
                            'timeout': timeout,
                            'retry_count': retry_count
                        }
                    )
                else:
                    self.logger.error(
                        f"Request timed out after {max_retries} retries",
                        extra={
                            'request_id': request_id,
                            'timeout': timeout,
                            'url': url
                        }
                    )
                    raise ServiceError(
                        f"Request timed out after {max_retries} retries",
                        status_code=504
                    )
                    
            except json.JSONDecodeError as e:
                self.logger.error(
                    f"Failed to parse response JSON",
                    extra={
                        'request_id': request_id,
                        'error': str(e),
                        'url': url
                    }
                )
                raise ServiceError(
                    f"Invalid JSON response: {str(e)}",
                    status_code=500
                )
                
            except Exception as e:
                self.logger.error(
                    f"Unexpected error during request",
                    extra={
                        'request_id': request_id,
                        'error': str(e),
                        'url': url
                    }
                )
                raise ServiceError(
                    f"Unexpected error: {str(e)}",
                    status_code=500
                )
        
        # This should never be reached due to the raise in the retry loop
        raise ServiceError(
            f"Request failed after {max_retries} retries: {str(last_error)}",
            status_code=500
        )
            
    def _process_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Process service response."""
        try:
            # Validate response
            if response["status"] != "success":
                raise ValueError(f"Service error: {response.get('error', 'Unknown error')}")
                
            # Transform response data
            return {
                "result": response["data"],
                "metadata": response["metadata"]
            }
            
        except Exception as e:
            self.logger.error(f"Error processing response: {e}")
            raise
            
    def _update_metrics(self, execution_time: float, success: bool) -> None:
        """Update service metrics."""
        try:
            metrics = self._state["metrics"]
            
            if success:
                metrics["successful_requests"] += 1
            else:
                metrics["failed_requests"] += 1
                
            # Update average response time
            total_requests = metrics["total_requests"]
            current_avg = metrics["average_response_time"]
            metrics["average_response_time"] = (
                (current_avg * (total_requests - 1) + execution_time) / total_requests
            )
            
            # Update error rate
            metrics["error_rate"] = (
                metrics["failed_requests"] / metrics["total_requests"]
            )
            
        except Exception as e:
            self.logger.error(f"Error updating metrics: {e}")
            
    async def _collect_metrics(self) -> None:
        """Collect service metrics periodically."""
        while True:
            try:
                # Update active connections
                self._state["metrics"]["active_connections"] = len(self._connection_pool)
                
                # Log metrics
                self.logger.info(f"Service metrics: {self._state['metrics']}")
                
                # Wait for next collection
                await asyncio.sleep(self._state["config"]["monitoring_interval"])
                
            except Exception as e:
                self.logger.error(f"Error collecting metrics: {e}")
                await asyncio.sleep(60)  # Wait before retrying
                
    async def _run_health_checks(self) -> None:
        """Run periodic health checks."""
        while True:
            try:
                # Check service components
                components = {
                    "connection_pool": self._check_connection_pool(),
                    "request_queue": self._check_request_queue(),
                    "response_cache": self._check_response_cache()
                }
                
                # Update health status
                self._health_status.update({
                    "status": "healthy" if all(components.values()) else "degraded",
                    "last_check": datetime.now().isoformat(),
                    "components": components
                })
                
                # Wait for next check
                await asyncio.sleep(self._state["config"]["health_check_interval"])
                
            except Exception as e:
                self.logger.error(f"Error running health checks: {e}")
                await asyncio.sleep(60)  # Wait before retrying
                
    async def _manage_connections(self) -> None:
        """Manage service connections."""
        while True:
            try:
                # Clean up stale connections
                current_time = datetime.now()
                for conn_id, conn in list(self._connection_pool.items()):
                    if conn["last_used"]:
                        last_used = datetime.fromisoformat(conn["last_used"])
                        if (current_time - last_used).total_seconds() > 3600:  # 1 hour
                            await self._close_connection(conn)
                            del self._connection_pool[conn_id]
                            
                # Wait before next check
                await asyncio.sleep(60)
                
            except Exception as e:
                self.logger.error(f"Error managing connections: {e}")
                await asyncio.sleep(60)  # Wait before retrying
                
    def _check_connection_pool(self) -> bool:
        """Check connection pool health."""
        try:
            return len(self._connection_pool) <= self._state["config"]["max_connections"]
        except Exception:
            return False
            
    def _check_request_queue(self) -> bool:
        """Check request queue health."""
        try:
            return self._request_queue.qsize() < 1000  # Arbitrary limit
        except Exception:
            return False
            
    def _check_response_cache(self) -> bool:
        """Check response cache health."""
        try:
            return len(self._response_cache) < 10000  # Arbitrary limit
        except Exception:
            return False
            
    async def _close_connection(self, connection: Dict[str, Any]) -> None:
        """Close a service connection."""
        try:
            # Implement connection cleanup
            connection["state"] = "closed"
            
        except Exception as e:
            self.logger.error(f"Error closing connection: {e}")
        
    def _validate_parameters(self, parameters: Dict[str, Any]) -> None:
        """Validate input parameters."""
        errors = []
        
        # Check required parameters
        for param in self.required_parameters:
            if param not in parameters:
                errors.append(f"Missing required parameter: {param}")
        
        # Set default values for optional parameters
        for param, default in self.optional_parameters.items():
            if param not in parameters:
                parameters[param] = default
        
        # Validate parameter types and values
        if 'url' in parameters:
            if not isinstance(parameters['url'], str):
                errors.append("url must be a string")
            elif not parameters['url'].strip():
                errors.append("url cannot be empty")
                
        if 'method' in parameters:
            if not isinstance(parameters['method'], str):
                errors.append("method must be a string")
            elif not parameters['method'].strip():
                errors.append("method cannot be empty")
                
        if 'data' in parameters:
            if not isinstance(parameters['data'], (dict, list, str)):
                errors.append("data must be a dictionary, list, or string")
                
        if 'headers' in parameters:
            if not isinstance(parameters['headers'], dict):
                errors.append("headers must be a dictionary")
            else:
                for key, value in parameters['headers'].items():
                    if not isinstance(key, str) or not isinstance(value, str):
                        errors.append("header keys and values must be strings")
                        
        if 'timeout' in parameters:
            if not isinstance(parameters['timeout'], (int, float)):
                errors.append("timeout must be a number")
            elif parameters['timeout'] <= 0:
                errors.append("timeout must be positive")
                
        if 'retry_attempts' in parameters:
            if not isinstance(parameters['retry_attempts'], int):
                errors.append("retry_attempts must be an integer")
            elif parameters['retry_attempts'] < 0:
                errors.append("retry_attempts must be non-negative")
                
        if 'callback_url' in parameters:
            if not isinstance(parameters['callback_url'], str):
                errors.append("callback_url must be a string")
            elif not parameters['callback_url'].startswith(('http://', 'https://')):
                errors.append("callback_url must be a valid HTTP(S) URL")
                
        if 'deadline' in parameters:
            try:
                deadline = datetime.fromisoformat(parameters['deadline'])
                if deadline < datetime.now():
                    errors.append("deadline must be in the future")
            except ValueError:
                errors.append("deadline must be a valid ISO format datetime string")
                
        if 'tags' in parameters:
            if not isinstance(parameters['tags'], list):
                errors.append("tags must be a list")
            else:
                for tag in parameters['tags']:
                    if not isinstance(tag, str):
                        errors.append("all tags must be strings")
                        
        if 'dependencies' in parameters:
            if not isinstance(parameters['dependencies'], list):
                errors.append("dependencies must be a list")
            else:
                for dep in parameters['dependencies']:
                    if not isinstance(dep, str):
                        errors.append("all dependencies must be strings")
                        
        if 'constraints' in parameters:
            if not isinstance(parameters['constraints'], dict):
                errors.append("constraints must be a dictionary")
            else:
                for key, value in parameters['constraints'].items():
                    if not isinstance(key, str):
                        errors.append("constraint keys must be strings")
                    if not isinstance(value, (str, int, float, bool)):
                        errors.append("constraint values must be strings, numbers, or booleans")
        
        if errors:
            raise ValueError("\n".join(errors))
        
    def get_service_info(self) -> Dict[str, Any]:
        """Get service information."""
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "status": "active",
            "required_parameters": self.required_parameters,
            "optional_parameters": self.optional_parameters
        }

# Template for singleton instance:
# {{PLUGIN_NAME.lower()}}_service = {{PLUGIN_NAME}}Service() 