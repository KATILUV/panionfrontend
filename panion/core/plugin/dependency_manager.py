"""
Dependency Manager
Manages plugin dependencies and their lifecycle.
"""

import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime
from pathlib import Path
import json
from injector import inject, singleton

from core.base import BaseComponent, ComponentMetadata, ComponentState
from core.plugin.interfaces import IPlugin
from core.service_locator import ServiceLocator
from core.error_handling import ErrorHandler

@singleton
class DependencyManager(BaseComponent):
    """Manages plugin dependencies and their lifecycle."""
    
    @inject
    def __init__(
        self,
        service_locator: ServiceLocator,
        error_handler: ErrorHandler
    ):
        """Initialize the dependency manager.
        
        Args:
            service_locator: The service locator instance
            error_handler: The error handler instance
        """
        metadata = ComponentMetadata(
            name="DependencyManager",
            version="1.0.0",
            description="Plugin dependency management system",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            dependencies={},
            config_schema={}
        )
        super().__init__(metadata)
        
        self.logger = logging.getLogger(__name__)
        self.service_locator = service_locator
        self.error_handler = error_handler
        
        self.dependencies: Dict[str, Set[str]] = {}  # plugin_id -> set of dependency_ids
        self.dependency_states: Dict[str, ComponentState] = {}  # plugin_id -> state
        self.dependency_metrics: Dict[str, Dict[str, Any]] = {}  # plugin_id -> metrics
    
    async def initialize(self) -> None:
        """Initialize the dependency manager."""
        self.logger.info("Initializing dependency manager")
        self._state = ComponentState.INITIALIZING
        try:
            # Register service
            self.service_locator.register_service("dependency_manager", self)
            self._state = ComponentState.ACTIVE
        except Exception as e:
            await self.error_handler.handle_error(e, {"context": "dependency_manager_initialize"})
            raise
    
    async def start(self) -> None:
        """Start the dependency manager."""
        self.logger.info("Starting dependency manager")
        self._start_time = datetime.now()
        self._state = ComponentState.ACTIVE
    
    async def stop(self) -> None:
        """Stop the dependency manager."""
        self.logger.info("Stopping dependency manager")
        self._state = ComponentState.STOPPING
        self._state = ComponentState.STOPPED
    
    async def pause(self) -> None:
        """Pause the dependency manager."""
        self.logger.info("Pausing dependency manager")
        self._state = ComponentState.PAUSED
    
    async def resume(self) -> None:
        """Resume the dependency manager."""
        self.logger.info("Resuming dependency manager")
        self._state = ComponentState.ACTIVE
    
    async def update(self) -> None:
        """Update the dependency manager state."""
        if self._state == ComponentState.ACTIVE:
            try:
                # Update dependency states
                for plugin_id, deps in self.dependencies.items():
                    try:
                        # Check if all dependencies are active
                        all_active = all(
                            self.dependency_states.get(dep_id) == ComponentState.ACTIVE
                            for dep_id in deps
                        )
                        
                        # Update state
                        if all_active:
                            self.dependency_states[plugin_id] = ComponentState.ACTIVE
                        else:
                            self.dependency_states[plugin_id] = ComponentState.PAUSED
                            
                    except Exception as e:
                        self.logger.error(f"Error updating dependencies for plugin {plugin_id}: {e}")
                        self.dependency_states[plugin_id] = ComponentState.ERROR
                        
            except Exception as e:
                await self.error_handler.handle_error(e, {"context": "dependency_manager_update"})
    
    async def add_dependencies(self, plugin_id: str, dependency_ids: List[str]) -> bool:
        """Add dependencies for a plugin.
        
        Args:
            plugin_id: Plugin identifier
            dependency_ids: List of dependency identifiers
            
        Returns:
            bool: Whether adding dependencies was successful
        """
        try:
            # Initialize plugin dependencies if needed
            if plugin_id not in self.dependencies:
                self.dependencies[plugin_id] = set()
                self.dependency_states[plugin_id] = ComponentState.INITIALIZED
                self.dependency_metrics[plugin_id] = {
                    'dependency_count': 0,
                    'active_dependencies': 0,
                    'last_update': datetime.now()
                }
            
            # Add dependencies
            self.dependencies[plugin_id].update(dependency_ids)
            self.dependency_metrics[plugin_id]['dependency_count'] = len(self.dependencies[plugin_id])
            
            # Update state
            await self.update()
            
            self.logger.info(f"Added dependencies for plugin {plugin_id}: {dependency_ids}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error adding dependencies for plugin {plugin_id}: {e}")
            return False
    
    async def remove_dependencies(self, plugin_id: str, dependency_ids: List[str]) -> bool:
        """Remove dependencies for a plugin.
        
        Args:
            plugin_id: Plugin identifier
            dependency_ids: List of dependency identifiers
            
        Returns:
            bool: Whether removing dependencies was successful
        """
        try:
            # Check if plugin exists
            if plugin_id not in self.dependencies:
                self.logger.warning(f"Plugin {plugin_id} not found")
                return False
            
            # Remove dependencies
            self.dependencies[plugin_id].difference_update(dependency_ids)
            self.dependency_metrics[plugin_id]['dependency_count'] = len(self.dependencies[plugin_id])
            
            # Update state
            await self.update()
            
            self.logger.info(f"Removed dependencies for plugin {plugin_id}: {dependency_ids}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error removing dependencies for plugin {plugin_id}: {e}")
            return False
    
    async def get_dependencies(self, plugin_id: str) -> Optional[Set[str]]:
        """Get dependencies for a plugin.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Optional[Set[str]]: Set of dependency identifiers if found
        """
        return self.dependencies.get(plugin_id)
    
    async def get_dependency_state(self, plugin_id: str) -> Optional[ComponentState]:
        """Get dependency state for a plugin.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Optional[ComponentState]: Dependency state if found
        """
        return self.dependency_states.get(plugin_id)
    
    async def get_dependency_metrics(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get dependency metrics for a plugin.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Optional[Dict[str, Any]]: Dependency metrics if found
        """
        return self.dependency_metrics.get(plugin_id)
    
    async def create_plugin(self, plugin_id: str, config: Optional[Dict[str, Any]] = None) -> Any:
        """Create a plugin instance."""
        try:
            # Get the plugin class from the service locator
            plugin_class = self.service_locator.get_service(f"plugin.class.{plugin_id}")
            if not plugin_class:
                raise ValueError(f"Plugin class not found: {plugin_id}")
            
            # Create plugin instance
            plugin = plugin_class()
            
            # Initialize plugin
            await plugin.initialize()
            
            # Configure plugin if config is provided
            if config and hasattr(plugin, 'configure'):
                await plugin.configure(config)
            
            return plugin
            
        except Exception as e:
            self.logger.error(f"Error creating plugin {plugin_id}: {str(e)}")
            raise
    
    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the dependency manager."""
        return {
            'state': self._state.value,
            'plugin_count': len(self.dependencies),
            'active_plugins': sum(1 for state in self.dependency_states.values() if state == ComponentState.ACTIVE),
            'error_info': self.get_error_info(),
            'uptime': self.uptime
        } 