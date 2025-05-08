"""
Utility Plugin Template
A template for creating utility-based Panion plugins.
"""

import logging
from typing import Dict, Any, List, Optional
from core.base_plugin import BasePlugin
from core.reflection import reflection_system
from core.service_locator import service_locator
import datetime
import time
import json
import hashlib
import os

# Template variables:
# PLUGIN_NAME: The name of the plugin
# PLUGIN_DESCRIPTION: A description of the plugin's functionality
# REQUIREMENTS: Implementation requirements and notes

class UtilityPluginTemplate(BasePlugin):
    def __init__(self):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.name = "{{PLUGIN_NAME}}"
        self.description = "{{PLUGIN_DESCRIPTION}}"
        self.version = "0.1.0"
        self.required_parameters = []  # List of required parameter names
        self.optional_parameters = {}  # Dict of optional parameters with default values
        self._initialize_utility()
        
    def _initialize_utility(self) -> None:
        """Initialize the utility."""
        try:
            reflection_system.log_thought(
                self.name,
                f"Initializing {self.name} utility",
                {"version": self.version}
            )
            
            # Initialize utility state
            self._state = {
                "initialized_at": datetime.now().isoformat(),
                "last_used": None,
                "usage_count": 0,
                "error_count": 0,
                "cache": {},
                "settings": self._load_settings()
            }
            
            # Initialize utility components
            self._initialize_components()
            
            # Register utility with service locator
            service_locator.register_service(
                f"{self.name.lower()}_utility",
                self
            )
            
            self.logger.info(f"Initialized {self.name} utility")
            reflection_system.log_thought(
                self.name,
                f"Initialized {self.name} utility successfully",
                {"status": "active"}
            )
            
        except Exception as e:
            error_msg = f"Error initializing utility: {e}"
            self.logger.error(error_msg)
            reflection_system.log_thought(
                self.name,
                error_msg,
                {"error": str(e)}
            )
            raise
        
    def _initialize_components(self) -> None:
        """Initialize utility components."""
        try:
            # Initialize cache
            self._cache = {}
            
            # Initialize metrics
            self._metrics = {
                "total_operations": 0,
                "successful_operations": 0,
                "failed_operations": 0,
                "average_operation_time": 0
            }
            
            # Initialize resource pool
            self._resource_pool = {}
            
            # Initialize event handlers
            self._event_handlers = {}
            
        except Exception as e:
            self.logger.error(f"Error initializing components: {e}")
            raise
        
    def _load_settings(self) -> Dict[str, Any]:
        """Load utility settings."""
        try:
            # Load settings from configuration
            settings = {
                "cache_size": 1000,
                "timeout": 30,
                "max_retries": 3,
                "log_level": "INFO",
                "performance_mode": False
            }
            
            # Override with environment variables if available
            for key in settings:
                env_key = f"{self.name.upper()}_{key.upper()}"
                if env_key in os.environ:
                    settings[key] = os.environ[env_key]
                    
            return settings
            
        except Exception as e:
            self.logger.error(f"Error loading settings: {e}")
            return {}
        
    async def execute(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the utility."""
        try:
            reflection_system.log_thought(
                self.name,
                f"Executing {self.name} utility",
                {"parameters": parameters}
            )
            
            # Validate parameters
            self._validate_parameters(parameters)
            
            # Update state
            self._state["last_used"] = datetime.now().isoformat()
            self._state["usage_count"] += 1
            
            # Check cache
            cache_key = self._generate_cache_key(parameters)
            if cache_key in self._cache:
                return self._cache[cache_key]
                
            # Execute utility operation
            start_time = time.time()
            result = await self._execute_operation(parameters)
            execution_time = time.time() - start_time
            
            # Update metrics
            self._update_metrics(execution_time, True)
            
            # Cache result
            self._cache_result(cache_key, result)
            
            # Log success
            self.logger.info(f"Utility operation completed in {execution_time:.2f}s")
            
            return result
            
        except Exception as e:
            error_msg = f"Error executing utility: {e}"
            self.logger.error(error_msg)
            reflection_system.log_thought(
                self.name,
                error_msg,
                {"error": str(e)}
            )
            
            # Update error metrics
            self._state["error_count"] += 1
            self._update_metrics(0, False)
            
            return {
                "status": "failure",
                "error": str(e)
            }
            
    def _generate_cache_key(self, parameters: Dict[str, Any]) -> str:
        """Generate cache key from parameters."""
        return hashlib.md5(
            json.dumps(parameters, sort_keys=True).encode()
        ).hexdigest()
        
    async def _execute_operation(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the actual utility operation."""
        try:
            # Process input
            input_data = parameters.get('input_data', {})
            
            # Apply utility-specific processing
            processed_data = self._process_data(input_data)
            
            # Generate result
            result = {
                "status": "success",
                "data": processed_data,
                "metadata": {
                    "processed_at": datetime.now().isoformat(),
                    "utility_version": self.version,
                    "cache_hit": False
                }
            }
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error in utility operation: {e}")
            raise
            
    def _process_data(self, data: Any) -> Any:
        """Process input data."""
        try:
            if isinstance(data, dict):
                return self._process_dict(data)
            elif isinstance(data, list):
                return self._process_list(data)
            elif isinstance(data, str):
                return self._process_string(data)
            else:
                return data
                
        except Exception as e:
            self.logger.error(f"Error processing data: {e}")
            raise
            
    def _process_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process dictionary data."""
        result = {}
        for key, value in data.items():
            result[key] = self._process_data(value)
        return result
        
    def _process_list(self, data: List[Any]) -> List[Any]:
        """Process list data."""
        return [self._process_data(item) for item in data]
        
    def _process_string(self, data: str) -> str:
        """Process string data."""
        return data.strip()
        
    def _cache_result(self, key: str, result: Dict[str, Any]) -> None:
        """Cache operation result."""
        try:
            # Check cache size
            if len(self._cache) >= self._state["settings"]["cache_size"]:
                # Remove oldest entry
                oldest_key = min(
                    self._cache.keys(),
                    key=lambda k: self._cache[k]["timestamp"]
                )
                del self._cache[oldest_key]
                
            # Add to cache
            self._cache[key] = {
                "result": result,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error caching result: {e}")
            
    def _update_metrics(self, execution_time: float, success: bool) -> None:
        """Update utility metrics."""
        try:
            self._metrics["total_operations"] += 1
            
            if success:
                self._metrics["successful_operations"] += 1
            else:
                self._metrics["failed_operations"] += 1
                
            # Update average operation time
            current_avg = self._metrics["average_operation_time"]
            total_ops = self._metrics["total_operations"]
            self._metrics["average_operation_time"] = (
                (current_avg * (total_ops - 1) + execution_time) / total_ops
            )
            
        except Exception as e:
            self.logger.error(f"Error updating metrics: {e}")
        
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
        if 'input_data' in parameters:
            if not isinstance(parameters['input_data'], (dict, list, str, int, float, bool)):
                errors.append("input_data must be a dictionary, list, string, number, or boolean")
                
        if 'options' in parameters:
            if not isinstance(parameters['options'], dict):
                errors.append("options must be a dictionary")
            else:
                # Validate specific options
                if 'cache_enabled' in parameters['options']:
                    if not isinstance(parameters['options']['cache_enabled'], bool):
                        errors.append("cache_enabled must be a boolean")
                        
                if 'cache_ttl' in parameters['options']:
                    ttl = parameters['options']['cache_ttl']
                    if not isinstance(ttl, (int, float)):
                        errors.append("cache_ttl must be a number")
                    elif ttl <= 0:
                        errors.append("cache_ttl must be positive")
                        
                if 'timeout' in parameters['options']:
                    timeout = parameters['options']['timeout']
                    if not isinstance(timeout, (int, float)):
                        errors.append("timeout must be a number")
                    elif timeout <= 0:
                        errors.append("timeout must be positive")
                        
                if 'max_retries' in parameters['options']:
                    retries = parameters['options']['max_retries']
                    if not isinstance(retries, int):
                        errors.append("max_retries must be an integer")
                    elif retries < 0:
                        errors.append("max_retries must be non-negative")
                        
                if 'performance_mode' in parameters['options']:
                    if not isinstance(parameters['options']['performance_mode'], bool):
                        errors.append("performance_mode must be a boolean")
                        
        if 'transformations' in parameters:
            if not isinstance(parameters['transformations'], list):
                errors.append("transformations must be a list")
            else:
                for transform in parameters['transformations']:
                    if not isinstance(transform, dict):
                        errors.append("each transformation must be a dictionary")
                    else:
                        if 'type' not in transform:
                            errors.append("each transformation must have a type")
                        elif not isinstance(transform['type'], str):
                            errors.append("transformation type must be a string")
                            
        if 'filters' in parameters:
            if not isinstance(parameters['filters'], list):
                errors.append("filters must be a list")
            else:
                for filter_item in parameters['filters']:
                    if not isinstance(filter_item, dict):
                        errors.append("each filter must be a dictionary")
                    else:
                        if 'field' not in filter_item:
                            errors.append("each filter must have a field")
                        elif not isinstance(filter_item['field'], str):
                            errors.append("filter field must be a string")
                            
        if 'sort' in parameters:
            if not isinstance(parameters['sort'], dict):
                errors.append("sort must be a dictionary")
            else:
                for field, direction in parameters['sort'].items():
                    if not isinstance(field, str):
                        errors.append("sort field must be a string")
                    if not isinstance(direction, str) or direction not in ['asc', 'desc']:
                        errors.append("sort direction must be 'asc' or 'desc'")
                        
        if 'limit' in parameters:
            if not isinstance(parameters['limit'], int):
                errors.append("limit must be an integer")
            elif parameters['limit'] <= 0:
                errors.append("limit must be positive")
                
        if 'offset' in parameters:
            if not isinstance(parameters['offset'], int):
                errors.append("offset must be an integer")
            elif parameters['offset'] < 0:
                errors.append("offset must be non-negative")
                
        if 'format' in parameters:
            if not isinstance(parameters['format'], str):
                errors.append("format must be a string")
            elif parameters['format'] not in ['json', 'xml', 'yaml', 'csv']:
                errors.append("format must be one of: json, xml, yaml, csv")
                
        if 'encoding' in parameters:
            if not isinstance(parameters['encoding'], str):
                errors.append("encoding must be a string")
            elif parameters['encoding'] not in ['utf-8', 'ascii', 'latin-1']:
                errors.append("encoding must be one of: utf-8, ascii, latin-1")
                
        if 'compression' in parameters:
            if not isinstance(parameters['compression'], str):
                errors.append("compression must be a string")
            elif parameters['compression'] not in ['none', 'gzip', 'deflate']:
                errors.append("compression must be one of: none, gzip, deflate")
        
        if errors:
            raise ValueError("\n".join(errors))
        
    def get_utility_info(self) -> Dict[str, Any]:
        """Get utility information."""
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "status": "active",
            "required_parameters": self.required_parameters,
            "optional_parameters": self.optional_parameters
        }

# Template for singleton instance:
# {{PLUGIN_NAME.lower()}}_utility = {{PLUGIN_NAME}}Utility() 