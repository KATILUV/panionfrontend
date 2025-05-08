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

class PluginErrorType(str, Enum):
    """Plugin error types."""
    INIT_ERROR = "init_error"
    VALIDATION_ERROR = "validation_error"
    RUNTIME_ERROR = "runtime_error"
    NOT_FOUND = "not_found"
    DEPENDENCY_ERROR = "dependency_error"
    CONFIG_ERROR = "config_error"
    SECURITY_ERROR = "security_error"
    VERSION_ERROR = "version_error"

class VersionMismatchError(Exception):
    """Raised when plugin versions are incompatible."""
    def __init__(self, plugin_id: str, required_version: str, available_version: str):
        self.plugin_id = plugin_id
        self.required_version = required_version
        self.available_version = available_version
        super().__init__(
            f"Version mismatch for plugin {plugin_id}: "
            f"required {required_version}, but {available_version} is available"
        )

@dataclass
class PluginInfo:
    """Plugin information."""
    plugin_id: str
    name: str
    version: str
    state: PluginState = PluginState.INITIALIZING
    load_attempts: int = 0
    error_count: int = 0
    last_error: Optional[str] = None
    dependencies: Dict[str, str] = None
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = {}

@dataclass
class PluginDependencies:
    """Plugin dependencies."""
    packages: Dict[str, str] = None  # package name -> version requirement
    plugins: List[str] = None  # plugin names
    
    def __post_init__(self):
        self.packages = self.packages or {}
        self.plugins = self.plugins or []

@dataclass
class PluginScore:
    """Plugin quality score."""
    reliability: float = 0.0
    performance: float = 0.0
    security: float = 0.0
    maintainability: float = 0.0
    documentation: float = 0.0
    test_coverage: float = 0.0

class PluginMetadata(BaseModel):
    """Plugin metadata."""
    model_config = {"arbitrary_types_allowed": True}
    
    name: str
    version: str
    description: str
    author: str
    dependencies: Optional[PluginDependencies] = None
    security_level: str = "low"
    rate_limit: Optional[float] = None
    config_schema: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    tags: List[str] = Field(default_factory=list)
    documentation_url: Optional[str] = None
    repository_url: Optional[str] = None
    license: Optional[str] = None
    min_panion_version: Optional[str] = None
    max_panion_version: Optional[str] = None
    config: Dict[str, Any] = Field(default_factory=dict)
    score: PluginScore = Field(default_factory=PluginScore)
    python_version: Optional[str] = None
    entry_point: Optional[str] = None
    type: Optional[str] = None

    @validator('name')
    def validate_name(cls, v):
        if not v:
            raise ValueError("Plugin name is required")
        return v

    @validator('version')
    def validate_version(cls, v):
        if not v:
            raise ValueError("Plugin version is required")
        if not re.match(r'^\d+\.\d+\.\d+$', v):
            raise ValueError("Version must follow semantic versioning (e.g. 1.0.0)")
        return v

    @validator('description')
    def validate_description(cls, v):
        if not v:
            raise ValueError("Plugin description is required")
        return v

    @validator('author')
    def validate_author(cls, v):
        if not v:
            raise ValueError("Plugin author is required")
        return v

@dataclass
class PluginMetrics:
    """Plugin metrics."""
    start_time: float
    last_update: float
    request_count: int
    error_count: int
    state: PluginState
    memory_usage: float
    cpu_usage: float
    
    @classmethod
    def create(cls, state: PluginState) -> 'PluginMetrics':
        """Create a new metrics instance."""
        process = psutil.Process()
        
        return cls(
            start_time=time.time(),
            last_update=time.time(),
            request_count=0,
            error_count=0,
            state=state,
            memory_usage=process.memory_info().rss / 1024 / 1024,  # MB
            cpu_usage=process.cpu_percent()
        )
    
    def update(self) -> None:
        """Update metrics."""
        process = psutil.Process()
        
        self.last_update = time.time()
        self.memory_usage = process.memory_info().rss / 1024 / 1024
        self.cpu_usage = process.cpu_percent()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary."""
        return {
            'start_time': self.start_time,
            'last_update': self.last_update,
            'request_count': self.request_count,
            'error_count': self.error_count,
            'state': self.state.value,
            'memory_usage_mb': self.memory_usage,
            'cpu_usage_percent': self.cpu_usage
        }

class PluginError(Exception):
    """Base class for plugin errors."""
    def __init__(self, message: str, error_type: PluginErrorType):
        super().__init__(message)
        self.error_type = error_type 

@runtime_checkable
class Plugin(Protocol):
    """Protocol defining the interface for plugins."""
    metadata: PluginMetadata
    
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