from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Union, TypeVar, Generic
from enum import Enum
from datetime import datetime

@dataclass
class AgentTemplate:
    """Template for agent configuration."""
    name: str
    capabilities: List[str]
    template_files: List[str]
    metadata: Dict[str, Any] = field(default_factory=dict)

class AlertType(Enum):
    """Type of alert."""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"
    SUCCESS = "success"
    VOTE = "vote"
    SYSTEM = "system"
    PLUGIN = "plugin"
    MEMORY = "memory"
    CAPABILITY = "capability"
    GOAL = "goal"
    MISSION = "mission"
    TEAM = "team"
    RESOURCE = "resource"
    SECURITY = "security"
    PERFORMANCE = "performance"
    HEALTH = "health"

class AlertLevel(Enum):
    """Level of alert severity."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class GoalStatus(Enum):
    """Status of a goal."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class MissionStatus(Enum):
    """Status of a mission."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class SkillDependency:
    """Dependency between skills."""
    source_skill: str
    target_skill: str
    dependency_type: str
    strength: float
    evidence: List[str] = field(default_factory=list)
    last_verified: datetime = field(default_factory=datetime.now)

@dataclass
class SkillImpact:
    """Impact of a skill."""
    direct_impact: float
    indirect_impact: float
    usage_frequency: float
    criticality: float
    last_updated: datetime = field(default_factory=datetime.now)

@dataclass
class SkillGap:
    """Identified skill gap."""
    skill_name: str
    current_level: float
    required_level: float
    gap_size: float
    priority: int
    dependencies: List[str]
    impact: float
    recommendations: List[str] = field(default_factory=list)

@dataclass
class TrainingRecommendation:
    """Training recommendation for a skill gap."""
    skill_name: str
    current_level: float
    target_level: float
    training_path: List[str]
    estimated_duration: int
    resources: List[str]
    priority: int
    dependencies: List[str] = field(default_factory=list)

@dataclass
class SkillConfig:
    """Configuration for a skill.
    
    Attributes:
        name: Name of the skill
        description: Description of the skill
        level: Current skill level (0.0 to 1.0)
        confidence: Confidence in skill level (0.0 to 1.0)
        dependencies: List of required skills
        learning_resources: List of learning resources
        last_updated: Timestamp of last update
        metadata: Additional metadata
    """
    name: str
    description: str
    level: float
    confidence: float
    dependencies: List[str] = field(default_factory=list)
    learning_resources: List[str] = field(default_factory=list)
    last_updated: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class CapabilityConfig:
    """Configuration for a capability.
    
    Attributes:
        name: Name of the capability
        description: Description of the capability
        required_skills: List of required skills
        optional_skills: List of optional skills
        performance_metrics: Dictionary of performance metrics
        status: Current status of the capability
        created_at: Timestamp of creation
        last_updated: Timestamp of last update
        metadata: Additional metadata
    """
    name: str
    description: str
    required_skills: List[str] = field(default_factory=list)
    optional_skills: List[str] = field(default_factory=list)
    performance_metrics: Dict[str, float] = field(default_factory=dict)
    status: str = "active"
    created_at: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AlertConfig:
    """Configuration for an alert.
    
    Attributes:
        id: Unique identifier for the alert
        type: Type of alert (from AlertType enum)
        level: Severity level of alert (from AlertLevel enum)
        title: Short title describing the alert
        message: Detailed alert message
        source: Component/system that generated the alert
        timestamp: When the alert was created
        metadata: Additional metadata about the alert
        acknowledged: Whether the alert has been acknowledged
        resolved: Whether the alert has been resolved
        resolution_notes: Notes about how the alert was resolved
        related_alerts: List of related alert IDs
    """
    id: str
    type: AlertType
    level: AlertLevel
    title: str
    message: str
    source: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    acknowledged: bool = False
    resolved: bool = False
    resolution_notes: str = ""
    related_alerts: List[str] = field(default_factory=list)

class TrustLevel(Enum):
    """Trust level for plugins."""
    UNTRUSTED = "untrusted"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERIFIED = "verified"

@dataclass
class PluginConfig:
    """Configuration for a plugin.
    
    Attributes:
        name: Name of the plugin
        version: Version of the plugin
        description: Description of the plugin
        author: Author of the plugin
        trust_level: Trust level of the plugin
        enabled: Whether the plugin is enabled
        auto_update: Whether to automatically update the plugin
        dependencies: List of plugin dependencies
        capabilities: List of plugin capabilities
        settings: Plugin-specific settings
        metadata: Additional metadata
    """
    name: str
    version: str
    description: str
    author: str
    trust_level: TrustLevel = TrustLevel.UNTRUSTED
    enabled: bool = True
    auto_update: bool = False
    dependencies: List[str] = field(default_factory=list)
    capabilities: List[str] = field(default_factory=list)
    settings: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

# Plugin states
class PluginState(Enum):
    """Plugin lifecycle states."""
    UNLOADED = "unloaded"
    LOADED = "loaded"
    INITIALIZED = "initialized"
    STARTED = "started"
    PAUSED = "paused"
    STOPPED = "stopped"
    ERROR = "error"

# Plugin metadata
class PluginMetadata:
    """Plugin metadata structure."""
    def __init__(
        self,
        name: str,
        version: str,
        description: str,
        author: str,
        dependencies: Optional[List[str]] = None,
        config: Optional[Dict[str, Any]] = None
    ):
        self.name = name
        self.version = version
        self.description = description
        self.author = author
        self.dependencies = dependencies or []
        self.config = config or {}

# Plugin error types
class PluginErrorType(Enum):
    """Types of plugin errors."""
    LOAD_ERROR = "load_error"
    INIT_ERROR = "init_error"
    START_ERROR = "start_error"
    STOP_ERROR = "stop_error"
    RUNTIME_ERROR = "runtime_error"
    VALIDATION_ERROR = "validation_error"
    SECURITY_ERROR = "security_error"

# Generic type variables
T = TypeVar('T')
PluginT = TypeVar('PluginT', bound='Plugin')  # Will be defined in plugin base

# Service types
class ServiceType(Enum):
    """Types of services in the system."""
    PLUGIN = "plugin"
    MEMORY = "memory"
    CONFIG = "config"
    SECURITY = "security"
    AI = "ai"
    OS = "os" 