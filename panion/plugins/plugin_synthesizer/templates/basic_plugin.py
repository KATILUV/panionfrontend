"""
Basic Plugin Template
A template for creating basic plugins.
"""

import logging
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
import json
from pathlib import Path

from core.plugin.base import BasePlugin
from core.plugin.types import PluginState, PluginError, PluginErrorType, PluginMetrics

class BasicPlugin(BasePlugin):
    """Base class for basic plugins."""
    
    def __init__(self, plugin_id: str, name: str, version: str, config: Dict[str, Any], dependencies: Optional[Dict[str, Any]] = None):
        """Initialize basic plugin.
        
        Args:
            plugin_id: Unique plugin identifier
            name: Plugin name
            version: Plugin version
            config: Plugin configuration
            dependencies: Plugin dependencies
        """
        super().__init__(plugin_id, name, version, dependencies)
        self.config = config
        self.cache = {}
        self.metrics = PluginMetrics.create(self.state)
        self.logger = logging.getLogger(f"plugin.{plugin_id}")
        
    async def _initialize(self) -> None:
        """Initialize basic plugin.
        
        This method:
        1. Validates configuration
        2. Sets up cache
        3. Initializes metrics
        4. Sets up logging
        """
        try:
            # Validate configuration
            if not self._validate_configuration():
                raise PluginError("Invalid plugin configuration", PluginErrorType.CONFIGURATION_ERROR)
            
            # Setup cache
            self.cache = {
                "data": {},
                "metadata": {},
                "stats": {
                    "hits": 0,
                    "misses": 0,
                    "size": 0
                }
            }
            
            # Initialize metrics
            self.metrics.update({
                "cache_hits": 0,
                "cache_misses": 0,
                "processing_time": 0,
                "error_count": 0,
                "success_count": 0
            })
            
            self.logger.info(f"Basic plugin {self.name} initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize basic plugin {self.name}: {str(e)}")
            raise PluginError(f"Plugin initialization failed: {str(e)}", PluginErrorType.INIT_ERROR)
    
    async def _execute(self, command: str, args: Dict[str, Any]) -> Any:
        """Execute plugin command.
        
        This method:
        1. Validates input
        2. Processes data
        3. Updates metrics
        4. Returns result
        
        Args:
            command: Command to execute
            args: Command arguments
            
        Returns:
            Any: Command execution result
        """
        try:
            # Validate input
            if not self._validate_input(args):
                raise PluginError("Invalid input data", PluginErrorType.INVALID_INPUT)
            
            # Process data
            start_time = datetime.now()
            result = await self._process_data(args.get("data"))
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Update metrics
            self.metrics.update({
                "processing_time": processing_time,
                "success_count": self.metrics.success_count + 1
            })
            
            # Format and return result
            return self._format_result(result)
            
        except Exception as e:
            self.metrics.error_count += 1
            self.logger.error(f"Command execution failed: {str(e)}")
            raise PluginError(f"Command execution failed: {str(e)}", PluginErrorType.EXECUTION_ERROR)
    
    def _validate_input(self, args: Dict[str, Any]) -> bool:
        """Validate input data.
        
        Args:
            args: Input arguments to validate
            
        Returns:
            bool: True if input is valid, False otherwise
        """
        try:
            # Check if args is a dictionary
            if not isinstance(args, dict):
                self.logger.error("Input must be a dictionary")
                return False
            
            # Check required fields
            required_fields = ["data"]
            for field in required_fields:
                if field not in args:
                    self.logger.error(f"Missing required field: {field}")
                    return False
            
            # Validate data type
            data = args["data"]
            valid_types = (dict, list, str, int, float, bool)
            if not isinstance(data, valid_types):
                self.logger.error(f"Invalid data type: {type(data)}")
                return False
            
            # Validate optional fields
            if "options" in args:
                if not isinstance(args["options"], dict):
                    self.logger.error("Options must be a dictionary")
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Input validation failed: {str(e)}")
            return False
    
    async def _process_data(self, data: Any) -> Any:
        """Process input data.
        
        Args:
            data: Data to process
            
        Returns:
            Any: Processed data
        """
        try:
            # Check cache
            cache_key = self._generate_cache_key(data)
            if cache_key in self.cache["data"]:
                self.cache["stats"]["hits"] += 1
                self.metrics.cache_hits += 1
                return self.cache["data"][cache_key]
            
            # Process based on data type
            if isinstance(data, dict):
                result = await self._process_dict(data)
            elif isinstance(data, list):
                result = await self._process_list(data)
            elif isinstance(data, str):
                result = await self._process_string(data)
            else:
                result = data
            
            # Update cache
            self.cache["data"][cache_key] = result
            self.cache["metadata"][cache_key] = {
                "timestamp": datetime.now().isoformat(),
                "type": type(data).__name__
            }
            self.cache["stats"]["size"] += 1
            self.cache["stats"]["misses"] += 1
            self.metrics.cache_misses += 1
            
            return result
            
        except Exception as e:
            self.logger.error(f"Data processing failed: {str(e)}")
            raise PluginError(f"Data processing failed: {str(e)}", PluginErrorType.PROCESSING_ERROR)
    
    async def _process_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process dictionary data.
        
        Args:
            data: Dictionary to process
            
        Returns:
            Dict[str, Any]: Processed dictionary
        """
        try:
            result = {}
            for key, value in data.items():
                if isinstance(value, (dict, list)):
                    result[key] = await self._process_data(value)
                else:
                    result[key] = value
            return result
        except Exception as e:
            self.logger.error(f"Dictionary processing failed: {str(e)}")
            raise PluginError(f"Dictionary processing failed: {str(e)}", PluginErrorType.PROCESSING_ERROR)
    
    async def _process_list(self, data: List[Any]) -> List[Any]:
        """Process list data.
        
        Args:
            data: List to process
            
        Returns:
            List[Any]: Processed list
        """
        try:
            result = []
            for item in data:
                if isinstance(item, (dict, list)):
                    result.append(await self._process_data(item))
                else:
                    result.append(item)
            return result
        except Exception as e:
            self.logger.error(f"List processing failed: {str(e)}")
            raise PluginError(f"List processing failed: {str(e)}", PluginErrorType.PROCESSING_ERROR)
    
    async def _process_string(self, data: str) -> str:
        """Process string data.
        
        Args:
            data: String to process
            
        Returns:
            str: Processed string
        """
        try:
            # Example string processing
            # This should be overridden by specific plugins
            return data.strip()
        except Exception as e:
            self.logger.error(f"String processing failed: {str(e)}")
            raise PluginError(f"String processing failed: {str(e)}", PluginErrorType.PROCESSING_ERROR)
    
    def _generate_cache_key(self, data: Any) -> str:
        """Generate cache key for data.
        
        Args:
            data: Data to generate key for
            
        Returns:
            str: Cache key
        """
        try:
            # Convert data to string representation
            if isinstance(data, (dict, list)):
                key = json.dumps(data, sort_keys=True)
            else:
                key = str(data)
            
            # Generate hash
            import hashlib
            return hashlib.md5(key.encode()).hexdigest()
            
        except Exception as e:
            self.logger.error(f"Cache key generation failed: {str(e)}")
            return str(datetime.now().timestamp())
    
    def _format_result(self, result: Any) -> Dict[str, Any]:
        """Format command result.
        
        Args:
            result: Result to format
            
        Returns:
            Dict[str, Any]: Formatted result
        """
        try:
            return {
                "status": "success",
                "data": result,
                "metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "type": type(result).__name__,
                    "size": len(str(result)),
                    "metrics": {
                        "processing_time": self.metrics.processing_time,
                        "cache_hits": self.metrics.cache_hits,
                        "cache_misses": self.metrics.cache_misses
                    }
                }
            }
        except Exception as e:
            self.logger.error(f"Result formatting failed: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _cleanup(self) -> None:
        """Cleanup plugin resources.
        
        This method:
        1. Clears cache
        2. Resets metrics
        3. Closes any open resources
        """
        try:
            # Clear cache
            self.cache = {
                "data": {},
                "metadata": {},
                "stats": {
                    "hits": 0,
                    "misses": 0,
                    "size": 0
                }
            }
            
            # Reset metrics
            self.metrics = PluginMetrics.create(self.state)
            
            self.logger.info(f"Basic plugin {self.name} cleaned up successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to cleanup basic plugin {self.name}: {str(e)}")
            raise PluginError(f"Plugin cleanup failed: {str(e)}", PluginErrorType.CLEANUP_ERROR) 