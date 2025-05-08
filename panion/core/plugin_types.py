"""
Plugin Types
Type definitions for the plugin system.
"""

from typing import Dict, Any, Optional, List, Set, Protocol, runtime_checkable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import time
import psutil
import re
from pydantic import BaseModel, Field, validator

@runtime_checkable
class Plugin(Protocol):
    """Protocol defining the interface for plugins."""
    metadata: 'PluginMetadata'
    
    async def initialize(self) -> bool:
        """Initialize the plugin."""
        ...
    
    async def cleanup(self) -> bool:
        """Cleanup plugin resources."""
        ...
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the plugin."""
        ...
    
    async def validate(self) -> bool:
        """Validate the plugin."""
        ...
    
    def get_status(self) -> Dict[str, Any]:
        """Get plugin status."""
        ...

class PluginState(str, Enum):
    """Plugin states."""
    UNLOADED = "unloaded"
    LOADING = "loading"
    LOADED = "loaded"
    INITIALIZING = "initializing"
    INITIALIZED = "initialized"
    STARTING = "starting"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error"
    INSTALLED = "installed"
    TESTED = "tested"
    TEST_FAILED = "test_failed"
    SYNTHESIZED = "synthesized"
    SYNTHESIS_FAILED = "synthesis_failed"
    REFINED = "refined"
    REFINEMENT_FAILED = "refinement_failed"

@dataclass
class PluginMetadata:
    """Plugin metadata."""
    name: str
    version: str
    description: str
    author: str
    dependencies: Dict[str, str] = field(default_factory=dict)
    security_level: str = "low"
    rate_limit: Optional[float] = None
    config_schema: Optional[Dict[str, Any]] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    tags: List[str] = field(default_factory=list)
    documentation_url: Optional[str] = None
    repository_url: Optional[str] = None
    license: Optional[str] = None
    min_panion_version: Optional[str] = None
    max_panion_version: Optional[str] = None
    config: Dict[str, Any] = field(default_factory=dict)
    python_version: Optional[str] = None
    entry_point: Optional[str] = None
    type: Optional[str] = None 