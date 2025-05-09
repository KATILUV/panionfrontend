"""
Basic Plugin Template
A template for creating basic Panion plugins.
"""

import logging
from typing import Dict, Any, List, Optional
from core.base_plugin import BasePlugin
from core.reflection import reflection_system
from datetime import datetime

# Template variables:
# PLUGIN_NAME: The name of the plugin
# PLUGIN_DESCRIPTION: A description of the plugin's functionality
# REQUIREMENTS: Implementation requirements and notes

class PluginTemplate(BasePlugin):
    def __init__(self):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.name = "{{PLUGIN_NAME}}"
        self.description = "{{PLUGIN_DESCRIPTION}}"
        self.version = "0.1.0"
        self.required_parameters = []  # List of required parameter names
        self.optional_parameters = {}  # Dict of optional parameters with default values
        
    async def execute(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the plugin's main functionality."""
        try:
            reflection_system.log_thought(
                self.name,
                f"Executing {self.name}",
                {"parameters": parameters}
            )
            
            # Validate parameters
            self._validate_parameters(parameters)
            
            # Process input data
            input_data = parameters.get('input_data', {})
            if not input_data:
                raise ValueError("No input data provided")
                
            # Apply transformations
            processed_data = self._process_data(input_data)
            
            # Generate output
            output = self._generate_output(processed_data)
            
            result = {
                "status": "success",
                "result": output,
                "metadata": {
                    "processed_at": datetime.now().isoformat(),
                    "input_size": len(str(input_data)),
                    "output_size": len(str(output))
                }
            }
            
            reflection_system.log_thought(
                self.name,
                f"Completed {self.name} execution",
                {"result": result}
            )
            
            return result
            
        except Exception as e:
            error_msg = f"Error executing plugin: {e}"
            self.logger.error(error_msg)
            reflection_system.log_thought(
                self.name,
                error_msg,
                {"error": str(e)}
            )
            return {
                "status": "failure",
                "error": str(e)
            }
            
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
            if not isinstance(parameters['input_data'], (dict, list, str)):
                errors.append("input_data must be a dictionary, list, or string")
                
        if 'max_retries' in parameters:
            if not isinstance(parameters['max_retries'], int):
                errors.append("max_retries must be an integer")
            elif parameters['max_retries'] < 0:
                errors.append("max_retries must be non-negative")
                
        if 'timeout' in parameters:
            if not isinstance(parameters['timeout'], (int, float)):
                errors.append("timeout must be a number")
            elif parameters['timeout'] <= 0:
                errors.append("timeout must be positive")
                
        if 'options' in parameters:
            if not isinstance(parameters['options'], dict):
                errors.append("options must be a dictionary")
                
        if errors:
            raise ValueError("\n".join(errors))
            
    def _process_data(self, data: Any) -> Any:
        """Process input data according to plugin requirements."""
        try:
            # Apply data transformations
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
        
    def _generate_output(self, processed_data: Any) -> Any:
        """Generate output from processed data."""
        try:
            # Format output based on data type
            if isinstance(processed_data, dict):
                return self._format_dict_output(processed_data)
            elif isinstance(processed_data, list):
                return self._format_list_output(processed_data)
            else:
                return processed_data
                
        except Exception as e:
            self.logger.error(f"Error generating output: {e}")
            raise
            
    def _format_dict_output(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Format dictionary output."""
        return {
            "data": data,
            "type": "dictionary",
            "count": len(data)
        }
        
    def _format_list_output(self, data: List[Any]) -> Dict[str, Any]:
        """Format list output."""
        return {
            "data": data,
            "type": "list",
            "count": len(data)
        }

# Template for singleton instance:
# {{PLUGIN_NAME.lower()}} = {{PLUGIN_NAME}}() 