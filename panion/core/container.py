"""
Dependency Injection Container
Configures and provides dependencies for the Panion system.
"""

from injector import Injector, Module, singleton, provider
from typing import Optional

from core.plugin.interfaces import IPluginManager, IPluginTester
from core.plugin.manager import PluginManager
from core.plugin.tester import PluginTester
from core.plugin.dependency_manager import DependencyManager
from core.interfaces import IDependencyManager

class PanionModule(Module):
    """Module for configuring Panion dependencies."""
    
    @singleton
    @provider
    def provide_plugin_tester(self) -> IPluginTester:
        """Provide the plugin tester instance."""
        return PluginTester()
    
    @singleton
    @provider
    def provide_plugin_manager(self, plugin_tester: IPluginTester) -> IPluginManager:
        """Provide the plugin manager instance."""
        return PluginManager(plugin_tester)
    
    @singleton
    @provider
    def provide_dependency_manager(self, plugin_manager: IPluginManager) -> IDependencyManager:
        """Provide the dependency manager instance."""
        return DependencyManager(plugin_manager)

# Create the injector
injector = Injector([PanionModule()]) 