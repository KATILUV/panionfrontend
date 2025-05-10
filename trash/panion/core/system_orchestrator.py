"""
System Orchestrator
Coordinates all system components and manages their lifecycle.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List, Set, TYPE_CHECKING
from datetime import datetime
from pathlib import Path
import json
import yaml

from core.plugin.interfaces import IPluginManager
from core.plugin_types import Plugin, PluginMetadata, PluginState
from core.panion_errors import PluginError, ErrorSeverity
from core.utils import with_connection_pool, cache_result
from core.base import BaseComponent, ComponentMetadata, ComponentState
from core.logging_config import get_logger, LogTimer
from core.config import plugin_config, system_config
from core.events import event_bus, Event, EventType
from core.memory_manager import memory_manager
from core.goal_decomposer import goal_decomposer
from core.goal_scheduler import goal_scheduler
from core.reflection import reflection_system
from core.security_manager import security_manager
from core.service_locator import service_locator

logger = logging.getLogger(__name__)

class SystemOrchestrator(BaseComponent):
    """Coordinates all system components and manages their lifecycle."""
    
    def __init__(self, plugin_manager: IPluginManager, config_path: str = "config/system.yaml"):
        """Initialize the system orchestrator.
        
        Args:
            plugin_manager: The plugin manager instance
            config_path: Path to the system configuration file
        """
        metadata = ComponentMetadata(
            name="SystemOrchestrator",
            version="1.0.0",
            description="System orchestration service",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            dependencies={},
            config_schema={}
        )
        super().__init__(metadata)
        
        self._plugin_manager = plugin_manager
        self.config_path = Path(config_path)
        self.config = self._load_config()
        
        # System state
        self._is_initialized = False
        self._is_running = False
        self._start_time = None
        self._system_metrics = {}
        
        # Component states
        self._component_states = {}
        self._component_errors = {}
        
        # Event handlers
        self._event_handlers = {}
        
        # Register with service locator
        service_locator.register_service('system_orchestrator', self)

    def _load_config(self) -> Dict[str, Any]:
        """Load system configuration."""
        try:
            if not self.config_path.exists():
                raise FileNotFoundError(f"Config file not found: {self.config_path}")
            
            with open(self.config_path) as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.logger.error(f"Error loading config: {e}")
            return {}

    async def initialize(self) -> None:
        """Initialize the system and all components."""
        try:
            reflection_system.log_thought(
                "system_initialization",
                "Starting system initialization",
                {"stage": "begin"}
            )
            
            # Initialize security first
            await security_manager.initialize()
            
            # Initialize core components
            await self._initialize_components()
            
            # Initialize plugins
            await self._plugin_manager.initialize()
            
            # Initialize memory system
            await memory_manager.initialize()
            
            # Initialize goal system
            await goal_decomposer.initialize()
            await goal_scheduler.initialize()
            
            # Register event handlers
            self._register_event_handlers()
            
            self._is_initialized = True
            
            reflection_system.log_thought(
                "system_initialization",
                "System initialization complete",
                {"stage": "complete"}
            )
            
        except Exception as e:
            reflection_system.log_thought(
                "system_initialization",
                f"Error during initialization: {str(e)}",
                {"error": str(e)}
            )
            raise

    async def _initialize_components(self) -> None:
        """Initialize all system components."""
        components = {
            'plugin_manager': self._plugin_manager,
            'memory_manager': memory_manager,
            'goal_decomposer': goal_decomposer,
            'goal_scheduler': goal_scheduler,
            'security_manager': security_manager
        }
        
        for name, component in components.items():
            try:
                await component.initialize()
                self._component_states[name] = 'initialized'
                reflection_system.log_thought(
                    "component_initialization",
                    f"Initialized {name}",
                    {"component": name, "status": "success"}
                )
            except Exception as e:
                self._component_states[name] = 'error'
                self._component_errors[name] = str(e)
                reflection_system.log_thought(
                    "component_initialization",
                    f"Error initializing {name}: {str(e)}",
                    {"component": name, "error": str(e)}
                )
                raise

    def _register_event_handlers(self) -> None:
        """Register system event handlers."""
        self._event_handlers = {
            'plugin_loaded': self._handle_plugin_loaded,
            'plugin_error': self._handle_plugin_error,
            'goal_completed': self._handle_goal_completed,
            'goal_failed': self._handle_goal_failed,
            'memory_updated': self._handle_memory_updated,
            'security_violation': self._handle_security_violation
        }

    async def start(self) -> None:
        """Start the system."""
        if not self._is_initialized:
            raise RuntimeError("System not initialized")
        
        try:
            reflection_system.log_thought(
                "system_start",
                "Starting system",
                {"stage": "begin"}
            )
            
            # Start security monitoring
            await security_manager.start_monitoring()
            
            # Start plugins
            await self._plugin_manager.start_plugins()
            
            # Start goal processing
            await goal_scheduler.start_processing()
            
            self._is_running = True
            self._start_time = datetime.now()
            
            reflection_system.log_thought(
                "system_start",
                "System started successfully",
                {"stage": "complete"}
            )
            
        except Exception as e:
            reflection_system.log_thought(
                "system_start",
                f"Error starting system: {str(e)}",
                {"error": str(e)}
            )
            raise

    async def stop(self) -> None:
        """Stop the system."""
        if not self._is_running:
            return
        
        try:
            reflection_system.log_thought(
                "system_stop",
                "Stopping system",
                {"stage": "begin"}
            )
            
            # Stop goal processing
            await goal_scheduler.stop_processing()
            
            # Stop plugins
            await self._plugin_manager.stop_plugins()
            
            # Stop security monitoring
            await security_manager.stop_monitoring()
            
            self._is_running = False
            
            reflection_system.log_thought(
                "system_stop",
                "System stopped successfully",
                {"stage": "complete"}
            )
            
        except Exception as e:
            reflection_system.log_thought(
                "system_stop",
                f"Error stopping system: {str(e)}",
                {"error": str(e)}
            )
            raise

    async def get_system_state(self) -> Dict[str, Any]:
        """Get current system state."""
        return {
            'is_initialized': self._is_initialized,
            'is_running': self._is_running,
            'start_time': self._start_time.isoformat() if self._start_time else None,
            'component_states': self._component_states,
            'component_errors': self._component_errors,
            'system_metrics': self._system_metrics
        }

    async def handle_event(self, event_type: str, event_data: Dict[str, Any]) -> None:
        """Handle system events."""
        handler = self._event_handlers.get(event_type)
        if handler:
            await handler(event_data)

    async def _handle_plugin_loaded(self, event_data: Dict[str, Any]) -> None:
        """Handle plugin loaded event."""
        plugin_name = event_data.get('plugin_name')
        reflection_system.log_thought(
            "plugin_event",
            f"Plugin loaded: {plugin_name}",
            event_data
        )

    async def _handle_plugin_error(self, event_data: Dict[str, Any]) -> None:
        """Handle plugin error event."""
        plugin_name = event_data.get('plugin_name')
        error = event_data.get('error')
        reflection_system.log_thought(
            "plugin_event",
            f"Plugin error in {plugin_name}: {error}",
            event_data
        )

    async def _handle_goal_completed(self, event_data: Dict[str, Any]) -> None:
        """Handle goal completed event."""
        goal_id = event_data.get('goal_id')
        reflection_system.log_thought(
            "goal_event",
            f"Goal completed: {goal_id}",
            event_data
        )

    async def _handle_goal_failed(self, event_data: Dict[str, Any]) -> None:
        """Handle goal failed event."""
        goal_id = event_data.get('goal_id')
        error = event_data.get('error')
        reflection_system.log_thought(
            "goal_event",
            f"Goal failed: {goal_id} - {error}",
            event_data
        )

    async def _handle_memory_updated(self, event_data: Dict[str, Any]) -> None:
        """Handle memory updated event."""
        memory_id = event_data.get('memory_id')
        reflection_system.log_thought(
            "memory_event",
            f"Memory updated: {memory_id}",
            event_data
        )

    async def _handle_security_violation(self, event_data: Dict[str, Any]) -> None:
        """Handle security violation event."""
        violation_type = event_data.get('violation_type')
        reflection_system.log_thought(
            "security_event",
            f"Security violation: {violation_type}",
            event_data
        )

# Create singleton instance
system_orchestrator = SystemOrchestrator(plugin_manager) 