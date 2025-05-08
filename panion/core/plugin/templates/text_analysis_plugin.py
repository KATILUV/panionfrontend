"""
Text Analysis Plugin Template
A template for creating text analysis plugins.
"""

import logging
from typing import Dict, Any, List, Optional
from core.base_plugin import BasePlugin
from core.reflection import reflection_system

class TextAnalysisPlugin(BasePlugin):
    def __init__(self):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.name = "{{PLUGIN_NAME}}"
        self.description = "{{PLUGIN_DESCRIPTION}}"
        self.version = "0.1.0"
        self.required_parameters = ["text"]  # Text to analyze
        self.optional_parameters = {
            "min_length": 0,  # Minimum text length
            "max_length": None,  # Maximum text length
            "language": "en",  # Text language
            "output_format": "dict"  # Output format (dict/json/text)
        }

    async def execute(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the text analysis."""
        try:
            # Validate parameters
            self._validate_parameters(parameters)
            
            # Extract text
            text = parameters["text"]
            
            # Perform analysis
            result = await self._analyze_text(text, parameters)
            
            # Format output
            output = self._format_output(result, parameters.get("output_format", "dict"))
            
            return {
                "status": "success",
                "result": output
            }
            
        except Exception as e:
            self.logger.error(f"Error in text analysis: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def _analyze_text(self, text: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze the text and return results.
        
        Override this method in your plugin implementation.
        """
        raise NotImplementedError("Subclasses must implement _analyze_text")

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
        
        # Validate text parameter
        if "text" in parameters:
            text = parameters["text"]
            if not isinstance(text, str):
                errors.append("text must be a string")
            elif parameters.get("min_length") and len(text) < parameters["min_length"]:
                errors.append(f"text must be at least {parameters['min_length']} characters")
            elif parameters.get("max_length") and len(text) > parameters["max_length"]:
                errors.append(f"text must be at most {parameters['max_length']} characters")
        
        if errors:
            raise ValueError("\n".join(errors))

    def _format_output(self, result: Dict[str, Any], format_type: str) -> Any:
        """Format the analysis result."""
        if format_type == "json":
            return json.dumps(result)
        elif format_type == "text":
            return "\n".join(f"{k}: {v}" for k, v in result.items())
        else:  # dict
            return result 