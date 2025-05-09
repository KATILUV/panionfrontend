"""
Utility Plugin Template

This template provides a foundation for creating utility plugins that perform
simple functions or operations. It extends the BasicPlugin with utility-specific 
functionality.
"""

import logging
from typing import Dict, Any, Optional, List, Callable, Set
from datetime import datetime

from .basic_plugin import BasicPlugin
from ..plugin_base import PluginResult

class UtilityPlugin(BasicPlugin):
    """
    Utility Plugin Template
    
    A template for plugins that provide utility functions and operations.
    This template includes methods for registering and executing utility functions.
    
    Features:
    - Function registration system
    - Function execution with parameter validation
    - Usage statistics tracking
    - Function documentation
    """
    
    def __init__(
        self,
        name: str,
        version: str,
        description: str,
        author: str,
        tags: Optional[List[str]] = None,
        dependencies: Optional[List[str]] = None
    ):
        """Initialize the utility plugin.
        
        Args:
            name: Plugin name
            version: Plugin version
            description: Plugin description
            author: Plugin author
            tags: Optional list of tags/categories
            dependencies: Optional list of dependencies
        """
        super().__init__(
            name=name,
            version=version,
            description=description,
            author=author,
            tags=tags,
            dependencies=dependencies
        )
        
        # Utility-specific initialization
        self._functions: Dict[str, Callable] = {}
        self._function_descriptions: Dict[str, str] = {}
        self._function_parameters: Dict[str, Dict[str, Any]] = {}
        self._function_usage: Dict[str, int] = {}
        self._function_success_count: Dict[str, int] = {}
        self._function_failure_count: Dict[str, int] = {}
        self._function_execution_times: Dict[str, float] = {}
        self._registered_functions: Set[str] = set()
    
    def register_function(
        self, 
        func: Callable,
        name: Optional[str] = None,
        description: str = "",
        parameters: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Register a function with the utility plugin.
        
        Args:
            func: The function to register
            name: Optional name for the function (defaults to function name)
            description: Optional description of the function
            parameters: Optional dictionary describing expected parameters
            
        Returns:
            bool: True if registration successful, False otherwise
        """
        try:
            func_name = name or func.__name__
            
            if func_name in self._functions:
                self.logger.warning(f"Function {func_name} already registered with {self.metadata.name} plugin")
                return False
                
            self._functions[func_name] = func
            self._function_descriptions[func_name] = description or func.__doc__ or ""
            self._function_parameters[func_name] = parameters or {}
            self._function_usage[func_name] = 0
            self._function_success_count[func_name] = 0
            self._function_failure_count[func_name] = 0
            self._function_execution_times[func_name] = 0.0
            self._registered_functions.add(func_name)
            
            self.logger.info(f"Function {func_name} registered with {self.metadata.name} plugin")
            return True
        except Exception as e:
            self.logger.error(f"Error registering function with {self.metadata.name} plugin: {str(e)}")
            return False
    
    def unregister_function(self, func_name: str) -> bool:
        """Unregister a function from the utility plugin.
        
        Args:
            func_name: Name of the function to unregister
            
        Returns:
            bool: True if unregistration successful, False otherwise
        """
        try:
            if func_name not in self._functions:
                self.logger.warning(f"Function {func_name} not registered with {self.metadata.name} plugin")
                return False
                
            del self._functions[func_name]
            del self._function_descriptions[func_name]
            del self._function_parameters[func_name]
            del self._function_usage[func_name]
            del self._function_success_count[func_name]
            del self._function_failure_count[func_name]
            del self._function_execution_times[func_name]
            self._registered_functions.remove(func_name)
            
            self.logger.info(f"Function {func_name} unregistered from {self.metadata.name} plugin")
            return True
        except Exception as e:
            self.logger.error(f"Error unregistering function from {self.metadata.name} plugin: {str(e)}")
            return False
    
    async def _validate_parameters(self, func_name: str, parameters: Dict[str, Any]) -> Optional[str]:
        """Validate parameters for a function.
        
        Args:
            func_name: Name of the function
            parameters: Parameters to validate
            
        Returns:
            Optional[str]: Error message if validation fails, None otherwise
        """
        required_params = self._function_parameters.get(func_name, {}).get("required", [])
        
        for param in required_params:
            if param not in parameters:
                return f"Missing required parameter: {param}"
                
        return None
    
    async def execute_function(self, func_name: str, parameters: Dict[str, Any]) -> PluginResult:
        """Execute a registered function.
        
        Args:
            func_name: Name of the function to execute
            parameters: Parameters to pass to the function
            
        Returns:
            PluginResult: Result of the function execution
        """
        if not self._is_running:
            return PluginResult(
                success=False,
                message=f"{self.metadata.name} plugin is not running",
                error="Plugin not running"
            )
            
        if func_name not in self._functions:
            return PluginResult(
                success=False,
                message=f"Function {func_name} not found in {self.metadata.name} plugin",
                error=f"Unknown function: {func_name}"
            )
            
        # Validate parameters
        validation_error = await self._validate_parameters(func_name, parameters)
        if validation_error:
            return PluginResult(
                success=False,
                message=f"Parameter validation failed for {func_name}: {validation_error}",
                error=validation_error
            )
            
        # Execute function
        start_time = datetime.now()
        self._function_usage[func_name] += 1
        
        try:
            func = self._functions[func_name]
            
            # Check if function is async
            if hasattr(func, "__await__"):
                result = await func(**parameters)
            else:
                result = func(**parameters)
                
            # Process result
            execution_time = (datetime.now() - start_time).total_seconds()
            self._function_execution_times[func_name] += execution_time
            self._function_success_count[func_name] += 1
            
            # Handle result wrapping
            if isinstance(result, PluginResult):
                return result
            else:
                return PluginResult(
                    success=True,
                    message=f"Function {func_name} executed successfully",
                    data=result
                )
                
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            self._function_execution_times[func_name] += execution_time
            self._function_failure_count[func_name] += 1
            
            self.logger.error(f"Error executing function {func_name}: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Error executing function {func_name}",
                error=str(e)
            )
    
    async def get_function_info(self, func_name: str) -> PluginResult:
        """Get information about a registered function.
        
        Args:
            func_name: Name of the function
            
        Returns:
            PluginResult: Function information
        """
        if func_name not in self._functions:
            return PluginResult(
                success=False,
                message=f"Function {func_name} not found in {self.metadata.name} plugin",
                error=f"Unknown function: {func_name}"
            )
            
        function_info = {
            "name": func_name,
            "description": self._function_descriptions[func_name],
            "parameters": self._function_parameters.get(func_name, {}),
            "usage_count": self._function_usage.get(func_name, 0),
            "success_count": self._function_success_count.get(func_name, 0),
            "failure_count": self._function_failure_count.get(func_name, 0),
            "total_execution_time": self._function_execution_times.get(func_name, 0.0),
            "average_execution_time": (
                self._function_execution_times.get(func_name, 0.0) / 
                max(1, self._function_usage.get(func_name, 0))
            )
        }
        
        return PluginResult(
            success=True,
            message=f"Function {func_name} information retrieved successfully",
            data=function_info
        )
    
    async def list_functions(self) -> PluginResult:
        """List all registered functions.
        
        Returns:
            PluginResult: List of registered functions
        """
        functions = []
        
        for func_name in self._registered_functions:
            functions.append({
                "name": func_name,
                "description": self._function_descriptions[func_name],
                "usage_count": self._function_usage.get(func_name, 0)
            })
            
        return PluginResult(
            success=True,
            message=f"{len(functions)} functions registered with {self.metadata.name} plugin",
            data={"functions": functions}
        )
    
    async def get_function_statistics(self) -> PluginResult:
        """Get statistics for all registered functions.
        
        Returns:
            PluginResult: Function statistics
        """
        statistics = {
            "total_functions": len(self._registered_functions),
            "total_usage": sum(self._function_usage.values()),
            "total_successes": sum(self._function_success_count.values()),
            "total_failures": sum(self._function_failure_count.values()),
            "total_execution_time": sum(self._function_execution_times.values()),
            "functions": {}
        }
        
        for func_name in self._registered_functions:
            usage = self._function_usage.get(func_name, 0)
            statistics["functions"][func_name] = {
                "usage_count": usage,
                "success_count": self._function_success_count.get(func_name, 0),
                "failure_count": self._function_failure_count.get(func_name, 0),
                "success_rate": (
                    self._function_success_count.get(func_name, 0) / max(1, usage) * 100
                ),
                "average_execution_time": (
                    self._function_execution_times.get(func_name, 0.0) / max(1, usage)
                )
            }
            
        return PluginResult(
            success=True,
            message=f"Function statistics retrieved successfully for {self.metadata.name} plugin",
            data=statistics
        )
    
    async def _process_action(self, action: str, parameters: Dict[str, Any]) -> PluginResult:
        """Process a utility plugin action.
        
        Args:
            action: Name of the action to perform
            parameters: Parameters for the action
            
        Returns:
            PluginResult: Result of the action
        """
        # Handle utility-specific actions
        if action == "execute_function":
            func_name = parameters.get("function_name")
            func_params = parameters.get("parameters", {})
            
            if not func_name:
                return PluginResult(
                    success=False,
                    message="Missing function_name parameter",
                    error="Missing required parameter: 'function_name'"
                )
                
            return await self.execute_function(func_name, func_params)
            
        elif action == "get_function_info":
            func_name = parameters.get("function_name")
            
            if not func_name:
                return PluginResult(
                    success=False,
                    message="Missing function_name parameter",
                    error="Missing required parameter: 'function_name'"
                )
                
            return await self.get_function_info(func_name)
            
        elif action == "list_functions":
            return await self.list_functions()
            
        elif action == "get_function_statistics":
            return await self.get_function_statistics()
            
        # Fall back to basic plugin action handling
        return await super()._process_action(action, parameters)
    
    async def cleanup(self) -> PluginResult:
        """Clean up utility plugin resources.
        
        Returns:
            PluginResult: Result of cleanup
        """
        try:
            # Clear function registrations
            self._functions.clear()
            self._function_descriptions.clear()
            self._function_parameters.clear()
            self._function_usage.clear()
            self._function_success_count.clear()
            self._function_failure_count.clear()
            self._function_execution_times.clear()
            self._registered_functions.clear()
            
            # Clean up other resources
            result = await super().cleanup()
            
            return result
        except Exception as e:
            self.logger.error(f"Error cleaning up {self.metadata.name} utility plugin resources: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to clean up {self.metadata.name} utility plugin resources",
                error=str(e)
            )