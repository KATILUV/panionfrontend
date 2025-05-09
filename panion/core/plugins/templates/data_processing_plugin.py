"""
Data Processing Plugin Template
A template for creating data processing plugins.
"""

import logging
from typing import Dict, Any, List, Optional, Union
import pandas as pd
import numpy as np
from core.base_plugin import BasePlugin
from core.reflection import reflection_system

class DataProcessingPlugin(BasePlugin):
    def __init__(self):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.name = "{{PLUGIN_NAME}}"
        self.description = "{{PLUGIN_DESCRIPTION}}"
        self.version = "0.1.0"
        self.required_parameters = ["data"]  # Data to process
        self.optional_parameters = {
            "input_format": "json",  # Input data format (json/csv/tsv)
            "output_format": "json",  # Output data format (json/csv/tsv)
            "operations": [],  # List of operations to perform
            "group_by": None,  # Column(s) to group by
            "sort_by": None,  # Column(s) to sort by
            "filter_conditions": None,  # Filter conditions
            "aggregations": None  # Aggregation functions
        }

    async def execute(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the data processing."""
        try:
            # Validate parameters
            self._validate_parameters(parameters)
            
            # Load data
            df = self._load_data(parameters["data"], parameters.get("input_format", "json"))
            
            # Apply operations
            df = await self._process_data(df, parameters)
            
            # Format output
            result = self._format_output(df, parameters.get("output_format", "json"))
            
            return {
                "status": "success",
                "result": result
            }
            
        except Exception as e:
            self.logger.error(f"Error in data processing: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }

    def _load_data(self, data: Union[str, Dict, List], format_type: str) -> pd.DataFrame:
        """Load data into a pandas DataFrame."""
        if format_type == "json":
            if isinstance(data, str):
                return pd.read_json(data)
            return pd.DataFrame(data)
        elif format_type == "csv":
            return pd.read_csv(data)
        elif format_type == "tsv":
            return pd.read_csv(data, sep="\t")
        else:
            raise ValueError(f"Unsupported input format: {format_type}")

    async def _process_data(self, df: pd.DataFrame, parameters: Dict[str, Any]) -> pd.DataFrame:
        """Process the data according to specified operations."""
        # Apply grouping if specified
        if parameters.get("group_by"):
            df = df.groupby(parameters["group_by"])
        
        # Apply aggregations if specified
        if parameters.get("aggregations"):
            df = df.agg(parameters["aggregations"])
        
        # Apply filtering if specified
        if parameters.get("filter_conditions"):
            df = df.query(parameters["filter_conditions"])
        
        # Apply sorting if specified
        if parameters.get("sort_by"):
            df = df.sort_values(parameters["sort_by"])
        
        # Apply custom operations
        for operation in parameters.get("operations", []):
            df = await self._apply_operation(df, operation)
        
        return df

    async def _apply_operation(self, df: pd.DataFrame, operation: Dict[str, Any]) -> pd.DataFrame:
        """Apply a single operation to the DataFrame."""
        op_type = operation.get("type")
        op_params = operation.get("parameters", {})
        
        if op_type == "fill_na":
            return df.fillna(op_params.get("value"))
        elif op_type == "drop_na":
            return df.dropna(**op_params)
        elif op_type == "rename":
            return df.rename(columns=op_params.get("columns", {}))
        elif op_type == "drop_columns":
            return df.drop(columns=op_params.get("columns", []))
        elif op_type == "select_columns":
            return df[op_params.get("columns", [])]
        else:
            raise ValueError(f"Unsupported operation type: {op_type}")

    def _format_output(self, df: pd.DataFrame, format_type: str) -> Any:
        """Format the processed data."""
        if format_type == "json":
            return df.to_dict(orient="records")
        elif format_type == "csv":
            return df.to_csv(index=False)
        elif format_type == "tsv":
            return df.to_csv(index=False, sep="\t")
        else:
            raise ValueError(f"Unsupported output format: {format_type}")

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
        
        # Validate input format
        if "input_format" in parameters and parameters["input_format"] not in ["json", "csv", "tsv"]:
            errors.append("input_format must be one of: json, csv, tsv")
        
        # Validate output format
        if "output_format" in parameters and parameters["output_format"] not in ["json", "csv", "tsv"]:
            errors.append("output_format must be one of: json, csv, tsv")
        
        # Validate operations
        if "operations" in parameters and not isinstance(parameters["operations"], list):
            errors.append("operations must be a list")
        
        # Validate group_by
        if "group_by" in parameters and not isinstance(parameters["group_by"], (str, list)):
            errors.append("group_by must be a string or list")
        
        # Validate sort_by
        if "sort_by" in parameters and not isinstance(parameters["sort_by"], (str, list)):
            errors.append("sort_by must be a string or list")
        
        # Validate filter_conditions
        if "filter_conditions" in parameters and not isinstance(parameters["filter_conditions"], str):
            errors.append("filter_conditions must be a string")
        
        # Validate aggregations
        if "aggregations" in parameters and not isinstance(parameters["aggregations"], dict):
            errors.append("aggregations must be a dictionary")
        
        if errors:
            raise ValueError("\n".join(errors)) 