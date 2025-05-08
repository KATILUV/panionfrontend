"""
Plugin Validation Utilities
Provides validation functions for plugin metadata and configuration.
"""

import logging
import re
from typing import Dict, Any, Optional
from datetime import datetime

from ..types import PluginMetadata, PluginErrorType
from core.panion_errors import PluginError

logger = logging.getLogger(__name__)

def validate_plugin_metadata(metadata: PluginMetadata) -> None:
    """Validate plugin metadata.
    
    Args:
        metadata: Plugin metadata to validate
        
    Raises:
        PluginError: If metadata validation fails
    """
    try:
        # Validate required fields
        if not metadata.name:
            raise PluginError("Plugin name is required", PluginErrorType.VALIDATION_ERROR)
            
        if not metadata.version:
            raise PluginError("Plugin version is required", PluginErrorType.VALIDATION_ERROR)
            
        if not metadata.description:
            raise PluginError("Plugin description is required", PluginErrorType.VALIDATION_ERROR)
            
        if not metadata.author:
            raise PluginError("Plugin author is required", PluginErrorType.VALIDATION_ERROR)
            
        # Validate version format (semantic versioning)
        if not re.match(r'^\d+\.\d+\.\d+$', metadata.version):
            raise PluginError(
                "Version must follow semantic versioning (e.g. 1.0.0)",
                PluginErrorType.VALIDATION_ERROR
            )
            
        # Validate dependencies format
        if metadata.dependencies:
            if not isinstance(metadata.dependencies, dict):
                raise PluginError(
                    "Dependencies must be a dictionary",
                    PluginErrorType.VALIDATION_ERROR
                )
                
            for name, version in metadata.dependencies.items():
                if not isinstance(name, str) or not isinstance(version, str):
                    raise PluginError(
                        "Dependency names and versions must be strings",
                        PluginErrorType.VALIDATION_ERROR
                    )
                    
                if not re.match(r'^[a-zA-Z0-9_-]+$', name):
                    raise PluginError(
                        f"Invalid dependency name format: {name}",
                        PluginErrorType.VALIDATION_ERROR
                    )
                    
                if not re.match(r'^(>=|<=|==|!=|>|<)\s*\d+\.\d+\.\d+$', version):
                    raise PluginError(
                        f"Invalid dependency version format: {version}",
                        PluginErrorType.VALIDATION_ERROR
                    )
                    
        # Validate timestamps
        if metadata.created_at and not isinstance(metadata.created_at, datetime):
            raise PluginError(
                "created_at must be a datetime object",
                PluginErrorType.VALIDATION_ERROR
            )
            
        if metadata.updated_at and not isinstance(metadata.updated_at, datetime):
            raise PluginError(
                "updated_at must be a datetime object",
                PluginErrorType.VALIDATION_ERROR
            )
            
        # Validate URLs if present
        if metadata.documentation_url and not re.match(r'^https?://', metadata.documentation_url):
            raise PluginError(
                "Documentation URL must start with http:// or https://",
                PluginErrorType.VALIDATION_ERROR
            )
            
        if metadata.repository_url and not re.match(r'^https?://', metadata.repository_url):
            raise PluginError(
                "Repository URL must start with http:// or https://",
                PluginErrorType.VALIDATION_ERROR
            )
            
        logger.info(f"Plugin metadata validation successful for {metadata.name}")
        
    except Exception as e:
        logger.error(f"Plugin metadata validation failed: {e}")
        raise PluginError(f"Metadata validation failed: {e}", PluginErrorType.VALIDATION_ERROR) 