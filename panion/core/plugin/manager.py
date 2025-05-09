"""
Plugin Manager

The plugin manager is responsible for discovering, registering, and executing
plugins in the Panion system. It acts as the central hub for all plugin-related
operations.
"""

import logging
from typing import Dict, List, Optional, Any, Set, Type, Union

from .base import BasePlugin
from .discovery import PluginDiscovery
from .plugin_base import PluginResult, PluginMetadata

logger = logging.getLogger(__name__)

class PluginManager:
    """
    Plugin Manager
    
    The central hub for plugin management in the Panion system. Responsible for:
    - Discovering plugins from directories
    - Registering plugins
    - Managing plugin lifecycle
    - Executing plugin actions
    - Handling plugin dependencies
    
    This manager ensures plugins can be easily integrated into the system and
    provides a unified interface for working with them.
    """
    
    def __init__(self, discovery: Optional[PluginDiscovery] = None):
        """Initialize the plugin manager.
        
        Args:
            discovery: Optional plugin discovery system. If not provided, a new one will be created.
        """
        self._discovery = discovery or PluginDiscovery()
        self._plugins: Dict[str, BasePlugin] = {}
        self._plugins_by_type: Dict[str, List[BasePlugin]] = {}
        self._plugin_classes: Dict[str, Type[BasePlugin]] = {}
        self._initialized_plugins: Set[str] = set()
        self._started_plugins: Set[str] = set()
        
    async def register_plugin(self, plugin: BasePlugin) -> PluginResult:
        """Register a plugin with the manager.
        
        Args:
            plugin: The plugin to register.
            
        Returns:
            PluginResult: Result of the registration.
        """
        try:
            name = plugin.metadata.name
            if name in self._plugins:
                return PluginResult(
                    success=False,
                    message=f"Plugin '{name}' is already registered",
                    error="DuplicatePlugin"
                )
                
            self._plugins[name] = plugin
            
            # Register by type (for capability-based lookup)
            plugin_type = plugin.metadata.type
            if plugin_type not in self._plugins_by_type:
                self._plugins_by_type[plugin_type] = []
            self._plugins_by_type[plugin_type].append(plugin)
            
            logger.info(f"Registered plugin: {name} (type: {plugin_type})")
            return PluginResult(
                success=True,
                message=f"Plugin '{name}' registered successfully"
            )
        except Exception as e:
            logger.error(f"Error registering plugin: {str(e)}")
            return PluginResult(
                success=False,
                message="Failed to register plugin",
                error=str(e)
            )
            
    async def unregister_plugin(self, plugin_name: str) -> PluginResult:
        """Unregister a plugin from the manager.
        
        Args:
            plugin_name: Name of the plugin to unregister.
            
        Returns:
            PluginResult: Result of the unregistration.
        """
        try:
            if plugin_name not in self._plugins:
                return PluginResult(
                    success=False,
                    message=f"Plugin '{plugin_name}' is not registered",
                    error="PluginNotFound"
                )
                
            plugin = self._plugins[plugin_name]
            
            # Clean up plugin if started
            if plugin_name in self._started_plugins:
                await plugin.stop()
                self._started_plugins.remove(plugin_name)
                
            # Remove from initialization tracking
            if plugin_name in self._initialized_plugins:
                self._initialized_plugins.remove(plugin_name)
                
            # Remove from type mapping
            plugin_type = plugin.metadata.type
            if plugin_type in self._plugins_by_type:
                if plugin in self._plugins_by_type[plugin_type]:
                    self._plugins_by_type[plugin_type].remove(plugin)
                    
            # Remove from plugins dict
            del self._plugins[plugin_name]
            
            logger.info(f"Unregistered plugin: {plugin_name}")
            return PluginResult(
                success=True,
                message=f"Plugin '{plugin_name}' unregistered successfully"
            )
        except Exception as e:
            logger.error(f"Error unregistering plugin '{plugin_name}': {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to unregister plugin '{plugin_name}'",
                error=str(e)
            )
            
    async def discover_plugins(self, directories: List[str]) -> PluginResult:
        """Discover plugins in the specified directories.
        
        Args:
            directories: List of directories to search for plugins.
            
        Returns:
            PluginResult: Result of the discovery operation.
        """
        try:
            classes, instances = self._discovery.discover_and_instantiate(directories)
            
            # Register the discovered plugins
            registered_count = 0
            for name, plugin in instances.items():
                result = await self.register_plugin(plugin)
                if result.success:
                    registered_count += 1
                    self._plugin_classes[name] = classes[name]
                    
            return PluginResult(
                success=True,
                message=f"Discovered and registered {registered_count} plugins",
                data={"discovered": len(instances), "registered": registered_count}
            )
        except Exception as e:
            logger.error(f"Error discovering plugins: {str(e)}")
            return PluginResult(
                success=False,
                message="Failed to discover plugins",
                error=str(e)
            )
            
    async def initialize_plugin(self, plugin_name: str) -> PluginResult:
        """Initialize a specific plugin.
        
        Args:
            plugin_name: Name of the plugin to initialize.
            
        Returns:
            PluginResult: Result of the initialization.
        """
        try:
            if plugin_name not in self._plugins:
                return PluginResult(
                    success=False,
                    message=f"Plugin '{plugin_name}' is not registered",
                    error="PluginNotFound"
                )
                
            if plugin_name in self._initialized_plugins:
                return PluginResult(
                    success=True,
                    message=f"Plugin '{plugin_name}' is already initialized"
                )
                
            plugin = self._plugins[plugin_name]
            
            # Check for dependencies
            for dep_name in plugin.metadata.dependencies:
                if dep_name not in self._plugins:
                    return PluginResult(
                        success=False,
                        message=f"Plugin '{plugin_name}' depends on '{dep_name}' which is not registered",
                        error="MissingDependency"
                    )
                    
                # Initialize dependency if needed
                if dep_name not in self._initialized_plugins:
                    dep_result = await self.initialize_plugin(dep_name)
                    if not dep_result.success:
                        return PluginResult(
                            success=False,
                            message=f"Failed to initialize dependency '{dep_name}' for plugin '{plugin_name}'",
                            error=f"DependencyInitError: {dep_result.error}"
                        )
                        
            # Initialize the plugin
            result = await plugin.initialize()
            
            if result.success:
                self._initialized_plugins.add(plugin_name)
                logger.info(f"Initialized plugin: {plugin_name}")
                
            return result
        except Exception as e:
            logger.error(f"Error initializing plugin '{plugin_name}': {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to initialize plugin '{plugin_name}'",
                error=str(e)
            )
            
    async def initialize_all_plugins(self) -> PluginResult:
        """Initialize all registered plugins.
        
        Returns:
            PluginResult: Result of the initialization.
        """
        try:
            success_count = 0
            failure_count = 0
            error_details = {}
            
            for name in self._plugins.keys():
                if name not in self._initialized_plugins:
                    result = await self.initialize_plugin(name)
                    if result.success:
                        success_count += 1
                    else:
                        failure_count += 1
                        error_details[name] = result.error or "Unknown error"
                        
            if failure_count == 0:
                return PluginResult(
                    success=True,
                    message=f"Successfully initialized {success_count} plugins",
                    data={"initialized": success_count}
                )
            else:
                return PluginResult(
                    success=False,
                    message=f"Initialized {success_count} plugins, failed to initialize {failure_count} plugins",
                    error="PartialInitializationFailure",
                    data={"initialized": success_count, "failed": failure_count, "errors": error_details}
                )
        except Exception as e:
            logger.error(f"Error initializing plugins: {str(e)}")
            return PluginResult(
                success=False,
                message="Failed to initialize plugins",
                error=str(e)
            )
            
    async def start_plugin(self, plugin_name: str) -> PluginResult:
        """Start a specific plugin.
        
        Args:
            plugin_name: Name of the plugin to start.
            
        Returns:
            PluginResult: Result of the start operation.
        """
        try:
            if plugin_name not in self._plugins:
                return PluginResult(
                    success=False,
                    message=f"Plugin '{plugin_name}' is not registered",
                    error="PluginNotFound"
                )
                
            if plugin_name in self._started_plugins:
                return PluginResult(
                    success=True,
                    message=f"Plugin '{plugin_name}' is already started"
                )
                
            if plugin_name not in self._initialized_plugins:
                init_result = await self.initialize_plugin(plugin_name)
                if not init_result.success:
                    return PluginResult(
                        success=False,
                        message=f"Failed to initialize plugin '{plugin_name}' before starting",
                        error=f"InitializationError: {init_result.error}"
                    )
                    
            plugin = self._plugins[plugin_name]
            
            # Check for dependencies
            for dep_name in plugin.metadata.dependencies:
                if dep_name not in self._started_plugins:
                    dep_result = await self.start_plugin(dep_name)
                    if not dep_result.success:
                        return PluginResult(
                            success=False,
                            message=f"Failed to start dependency '{dep_name}' for plugin '{plugin_name}'",
                            error=f"DependencyStartError: {dep_result.error}"
                        )
                        
            # Start the plugin
            result = await plugin.start()
            
            if result.success:
                self._started_plugins.add(plugin_name)
                logger.info(f"Started plugin: {plugin_name}")
                
            return result
        except Exception as e:
            logger.error(f"Error starting plugin '{plugin_name}': {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to start plugin '{plugin_name}'",
                error=str(e)
            )
            
    async def start_all_plugins(self) -> PluginResult:
        """Start all registered plugins.
        
        Returns:
            PluginResult: Result of the start operation.
        """
        try:
            success_count = 0
            failure_count = 0
            error_details = {}
            
            for name in self._plugins.keys():
                if name not in self._started_plugins:
                    result = await self.start_plugin(name)
                    if result.success:
                        success_count += 1
                    else:
                        failure_count += 1
                        error_details[name] = result.error or "Unknown error"
                        
            if failure_count == 0:
                return PluginResult(
                    success=True,
                    message=f"Successfully started {success_count} plugins",
                    data={"started": success_count}
                )
            else:
                return PluginResult(
                    success=False,
                    message=f"Started {success_count} plugins, failed to start {failure_count} plugins",
                    error="PartialStartFailure",
                    data={"started": success_count, "failed": failure_count, "errors": error_details}
                )
        except Exception as e:
            logger.error(f"Error starting plugins: {str(e)}")
            return PluginResult(
                success=False,
                message="Failed to start plugins",
                error=str(e)
            )
            
    async def stop_plugin(self, plugin_name: str) -> PluginResult:
        """Stop a specific plugin.
        
        Args:
            plugin_name: Name of the plugin to stop.
            
        Returns:
            PluginResult: Result of the stop operation.
        """
        try:
            if plugin_name not in self._plugins:
                return PluginResult(
                    success=False,
                    message=f"Plugin '{plugin_name}' is not registered",
                    error="PluginNotFound"
                )
                
            if plugin_name not in self._started_plugins:
                return PluginResult(
                    success=True,
                    message=f"Plugin '{plugin_name}' is not started"
                )
                
            plugin = self._plugins[plugin_name]
            
            # Check for dependent plugins
            dependent_plugins = []
            for name, p in self._plugins.items():
                if plugin_name in p.metadata.dependencies and name in self._started_plugins:
                    dependent_plugins.append(name)
                    
            # Stop all dependent plugins first
            for dep_name in dependent_plugins:
                dep_result = await self.stop_plugin(dep_name)
                if not dep_result.success:
                    return PluginResult(
                        success=False,
                        message=f"Failed to stop plugin '{dep_name}' which depends on '{plugin_name}'",
                        error=f"DependentPluginError: {dep_result.error}"
                    )
                    
            # Stop the plugin
            result = await plugin.stop()
            
            if result.success:
                self._started_plugins.remove(plugin_name)
                logger.info(f"Stopped plugin: {plugin_name}")
                
            return result
        except Exception as e:
            logger.error(f"Error stopping plugin '{plugin_name}': {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to stop plugin '{plugin_name}'",
                error=str(e)
            )
            
    async def stop_all_plugins(self) -> PluginResult:
        """Stop all started plugins.
        
        Returns:
            PluginResult: Result of the stop operation.
        """
        try:
            success_count = 0
            failure_count = 0
            error_details = {}
            
            # Create a copy of the set to avoid modification during iteration
            started_plugins = list(self._started_plugins)
            
            # Stop plugins in the reverse order of dependencies
            # (dependent plugins first, then their dependencies)
            for name in reversed(started_plugins):
                result = await self.stop_plugin(name)
                if result.success:
                    success_count += 1
                else:
                    failure_count += 1
                    error_details[name] = result.error or "Unknown error"
                    
            if failure_count == 0:
                return PluginResult(
                    success=True,
                    message=f"Successfully stopped {success_count} plugins",
                    data={"stopped": success_count}
                )
            else:
                return PluginResult(
                    success=False,
                    message=f"Stopped {success_count} plugins, failed to stop {failure_count} plugins",
                    error="PartialStopFailure",
                    data={"stopped": success_count, "failed": failure_count, "errors": error_details}
                )
        except Exception as e:
            logger.error(f"Error stopping plugins: {str(e)}")
            return PluginResult(
                success=False,
                message="Failed to stop plugins",
                error=str(e)
            )
            
    async def execute(self, plugin_name: str, action: str, parameters: Optional[Dict[str, Any]] = None) -> PluginResult:
        """Execute an action on a specific plugin.
        
        Args:
            plugin_name: Name of the plugin to execute the action on.
            action: Name of the action to execute.
            parameters: Optional parameters for the action.
            
        Returns:
            PluginResult: Result of the action execution.
        """
        try:
            if plugin_name not in self._plugins:
                return PluginResult(
                    success=False,
                    message=f"Plugin '{plugin_name}' is not registered",
                    error="PluginNotFound"
                )
                
            plugin = self._plugins[plugin_name]
            
            # Ensure the plugin is started
            if plugin_name not in self._started_plugins:
                start_result = await self.start_plugin(plugin_name)
                if not start_result.success:
                    return PluginResult(
                        success=False,
                        message=f"Failed to start plugin '{plugin_name}' before executing action '{action}'",
                        error=f"StartError: {start_result.error}"
                    )
                    
            # Execute the action
            return await plugin.execute(action, parameters or {})
        except Exception as e:
            logger.error(f"Error executing action '{action}' on plugin '{plugin_name}': {str(e)}")
            return PluginResult(
                success=False,
                message=f"Failed to execute action '{action}' on plugin '{plugin_name}'",
                error=str(e)
            )
            
    def get_plugin(self, plugin_name: str) -> Optional[BasePlugin]:
        """Get a plugin by name.
        
        Args:
            plugin_name: Name of the plugin to get.
            
        Returns:
            Optional[BasePlugin]: The plugin if found, None otherwise.
        """
        return self._plugins.get(plugin_name)
        
    def get_plugin_for_type(self, plugin_type: str) -> List[BasePlugin]:
        """Get all plugins of a specific type.
        
        Args:
            plugin_type: Type of plugins to get.
            
        Returns:
            List[BasePlugin]: List of plugins of the specified type.
        """
        return self._plugins_by_type.get(plugin_type, []).copy()
        
    def get_plugin_class(self, plugin_name: str) -> Optional[Type[BasePlugin]]:
        """Get the class of a plugin by name.
        
        Args:
            plugin_name: Name of the plugin to get the class for.
            
        Returns:
            Optional[Type[BasePlugin]]: The plugin class if found, None otherwise.
        """
        return self._plugin_classes.get(plugin_name)
        
    def list_plugins(self) -> Dict[str, PluginMetadata]:
        """Get a dictionary of all registered plugins.
        
        Returns:
            Dict[str, PluginMetadata]: Dictionary of plugin names to metadata.
        """
        return {name: plugin.metadata for name, plugin in self._plugins.items()}
        
    def list_plugin_types(self) -> List[str]:
        """Get a list of all plugin types.
        
        Returns:
            List[str]: List of plugin types.
        """
        return list(self._plugins_by_type.keys())
        
    def get_plugin_metadata(self, plugin_name: str) -> Optional[PluginMetadata]:
        """Get the metadata of a plugin by name.
        
        Args:
            plugin_name: Name of the plugin to get the metadata for.
            
        Returns:
            Optional[PluginMetadata]: The plugin metadata if found, None otherwise.
        """
        plugin = self.get_plugin(plugin_name)
        return plugin.metadata if plugin else None
        
    def is_plugin_started(self, plugin_name: str) -> bool:
        """Check if a plugin is started.
        
        Args:
            plugin_name: Name of the plugin to check.
            
        Returns:
            bool: True if the plugin is started, False otherwise.
        """
        return plugin_name in self._started_plugins
        
    def is_plugin_initialized(self, plugin_name: str) -> bool:
        """Check if a plugin is initialized.
        
        Args:
            plugin_name: Name of the plugin to check.
            
        Returns:
            bool: True if the plugin is initialized, False otherwise.
        """
        return plugin_name in self._initialized_plugins

# Global instance for convenience
plugin_manager = PluginManager()