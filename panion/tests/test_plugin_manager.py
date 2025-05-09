"""
Test Plugin Manager

Integration tests for the plugin manager system, ensuring it can properly
discover, register, initialize, start, and execute plugins.
"""

import asyncio
import os
import tempfile
import unittest
from pathlib import Path

from panion.core.plugin.discovery import PluginDiscovery
from panion.core.plugin.manager import PluginManager
from panion.core.plugin.base import BasePlugin
from panion.core.plugin.templates.basic_plugin import BasicPlugin
from panion.core.plugin.templates.service_plugin import ServicePlugin
from panion.core.plugin.templates.utility_plugin import UtilityPlugin

# Helper to create test plugin files
def create_test_plugin_file(directory, filename, plugin_class_code):
    """Create a test plugin file in the specified directory."""
    file_path = os.path.join(directory, filename)
    with open(file_path, 'w') as f:
        f.write(plugin_class_code)
    return file_path

class TestPluginManager(unittest.IsolatedAsyncioTestCase):
    """Test cases for the PluginManager class."""
    
    async def asyncSetUp(self):
        """Set up the test environment."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.plugin_dir = self.temp_dir.name
        self.discovery = PluginDiscovery()
        self.manager = PluginManager(self.discovery)
        
        # Create test plugin files
        self.basic_plugin_code = """
from panion.core.plugin.templates.basic_plugin import BasicPlugin

class TestBasicPlugin(BasicPlugin):
    PLUGIN_NAME = "test_basic_plugin"
    
    def __init__(self):
        super().__init__(
            name="Test Basic Plugin",
            version="1.0.0",
            description="A test basic plugin",
            author="Test Author"
        )
        
    async def execute(self, action, parameters=None):
        if action == "test_action":
            return self.create_result(
                success=True,
                message="Test action executed",
                data={"action": action, "parameters": parameters}
            )
        return await super().execute(action, parameters)
"""
        
        self.service_plugin_code = """
from panion.core.plugin.templates.service_plugin import ServicePlugin
from panion.core.plugin.plugin_base import PluginResult

class TestServicePlugin(ServicePlugin):
    PLUGIN_NAME = "test_service_plugin"
    
    def __init__(self):
        super().__init__(
            name="Test Service Plugin",
            version="1.0.0",
            description="A test service plugin",
            author="Test Author",
            service_type="background",
            update_interval=10.0
        )
        self.update_count = 0
        
    async def _service_update(self):
        self.update_count += 1
        return PluginResult(
            success=True,
            message="Service update completed",
            data={"update_count": self.update_count}
        )
        
    async def execute(self, action, parameters=None):
        if action == "get_update_count":
            return self.create_result(
                success=True,
                message="Update count retrieved",
                data={"count": self.update_count}
            )
        return await super().execute(action, parameters)
"""
        
        self.utility_plugin_code = """
from panion.core.plugin.templates.utility_plugin import UtilityPlugin

class TestUtilityPlugin(UtilityPlugin):
    PLUGIN_NAME = "test_utility_plugin"
    
    def __init__(self):
        super().__init__(
            name="Test Utility Plugin",
            version="1.0.0",
            description="A test utility plugin",
            author="Test Author"
        )
        
        # Register a test function
        def test_function(param1, param2=None):
            return {"param1": param1, "param2": param2}
            
        self.register_function(
            test_function,
            name="test_function",
            description="A test function",
            parameters={"param1": {"type": "str", "required": True}, 
                       "param2": {"type": "str", "required": False}}
        )
"""
        
        # Create dependency plugin
        self.dependency_plugin_code = """
from panion.core.plugin.templates.basic_plugin import BasicPlugin

class DependencyPlugin(BasicPlugin):
    PLUGIN_NAME = "dependency_plugin"
    
    def __init__(self):
        super().__init__(
            name="Dependency Plugin",
            version="1.0.0",
            description="A dependency plugin",
            author="Test Author"
        )
        self.initialized = False
        self.started = False
        
    async def initialize(self):
        self.initialized = True
        return await super().initialize()
        
    async def start(self):
        self.started = True
        return await super().start()
        
    async def execute(self, action, parameters=None):
        if action == "check_status":
            return self.create_result(
                success=True,
                message="Status checked",
                data={"initialized": self.initialized, "started": self.started}
            )
        return await super().execute(action, parameters)
"""
        
        # Create dependent plugin
        self.dependent_plugin_code = """
from panion.core.plugin.templates.basic_plugin import BasicPlugin

class DependentPlugin(BasicPlugin):
    PLUGIN_NAME = "dependent_plugin"
    
    def __init__(self):
        super().__init__(
            name="Dependent Plugin",
            version="1.0.0",
            description="A plugin with dependencies",
            author="Test Author",
            dependencies=["dependency_plugin"]
        )
"""
        
        # Create the plugin files
        create_test_plugin_file(self.plugin_dir, "test_basic_plugin.py", self.basic_plugin_code)
        create_test_plugin_file(self.plugin_dir, "test_service_plugin.py", self.service_plugin_code)
        create_test_plugin_file(self.plugin_dir, "test_utility_plugin.py", self.utility_plugin_code)
        create_test_plugin_file(self.plugin_dir, "dependency_plugin.py", self.dependency_plugin_code)
        create_test_plugin_file(self.plugin_dir, "dependent_plugin.py", self.dependent_plugin_code)
        
    async def asyncTearDown(self):
        """Clean up the test environment."""
        # Stop all plugins
        await self.manager.stop_all_plugins()
        self.temp_dir.cleanup()
        
    async def test_discover_plugins(self):
        """Test discovering plugins."""
        # Discover plugins
        result = await self.manager.discover_plugins([self.plugin_dir])
        
        # Check discovery result
        self.assertTrue(result.success)
        self.assertIn("discovered", result.data)
        self.assertIn("registered", result.data)
        self.assertEqual(result.data["discovered"], 5)  # 5 test plugins
        self.assertEqual(result.data["registered"], 5)
        
        # Check if plugins are registered
        plugins = self.manager.list_plugins()
        self.assertEqual(len(plugins), 5)
        self.assertIn("test_basic_plugin", plugins)
        self.assertIn("test_service_plugin", plugins)
        self.assertIn("test_utility_plugin", plugins)
        self.assertIn("dependency_plugin", plugins)
        self.assertIn("dependent_plugin", plugins)
        
    async def test_initialize_plugin(self):
        """Test initializing a plugin."""
        # Discover plugins first
        await self.manager.discover_plugins([self.plugin_dir])
        
        # Initialize a plugin
        result = await self.manager.initialize_plugin("test_basic_plugin")
        self.assertTrue(result.success)
        
        # Check if the plugin is initialized
        self.assertTrue(self.manager.is_plugin_initialized("test_basic_plugin"))
        
    async def test_initialize_all_plugins(self):
        """Test initializing all plugins."""
        # Discover plugins first
        await self.manager.discover_plugins([self.plugin_dir])
        
        # Initialize all plugins
        result = await self.manager.initialize_all_plugins()
        self.assertTrue(result.success)
        
        # Check if all plugins are initialized
        for name in ["test_basic_plugin", "test_service_plugin", "test_utility_plugin", 
                     "dependency_plugin", "dependent_plugin"]:
            self.assertTrue(self.manager.is_plugin_initialized(name))
            
    async def test_start_plugin(self):
        """Test starting a plugin."""
        # Discover plugins first
        await self.manager.discover_plugins([self.plugin_dir])
        
        # Start a plugin
        result = await self.manager.start_plugin("test_basic_plugin")
        self.assertTrue(result.success)
        
        # Check if the plugin is started
        self.assertTrue(self.manager.is_plugin_started("test_basic_plugin"))
        
    async def test_start_all_plugins(self):
        """Test starting all plugins."""
        # Discover plugins first
        await self.manager.discover_plugins([self.plugin_dir])
        
        # Start all plugins
        result = await self.manager.start_all_plugins()
        self.assertTrue(result.success)
        
        # Check if all plugins are started
        for name in ["test_basic_plugin", "test_service_plugin", "test_utility_plugin", 
                     "dependency_plugin", "dependent_plugin"]:
            self.assertTrue(self.manager.is_plugin_started(name))
            
    async def test_execute_plugin_action(self):
        """Test executing a plugin action."""
        # Discover plugins first
        await self.manager.discover_plugins([self.plugin_dir])
        
        # Execute an action on a plugin
        result = await self.manager.execute("test_basic_plugin", "test_action", {"test_param": "test_value"})
        
        # Check the result
        self.assertTrue(result.success)
        self.assertEqual(result.message, "Test action executed")
        self.assertEqual(result.data["action"], "test_action")
        self.assertEqual(result.data["parameters"]["test_param"], "test_value")
        
    async def test_service_plugin(self):
        """Test service plugin functionality."""
        # Discover plugins first
        await self.manager.discover_plugins([self.plugin_dir])
        
        # Start the service plugin
        result = await self.manager.start_plugin("test_service_plugin")
        self.assertTrue(result.success)
        
        # Wait for a few updates
        await asyncio.sleep(0.5)
        
        # Check the update count
        result = await self.manager.execute("test_service_plugin", "get_update_count")
        self.assertTrue(result.success)
        self.assertIn("count", result.data)
        self.assertGreater(result.data["count"], 0)
        
    async def test_utility_plugin(self):
        """Test utility plugin functionality."""
        # Discover plugins first
        await self.manager.discover_plugins([self.plugin_dir])
        
        # Start the utility plugin
        result = await self.manager.start_plugin("test_utility_plugin")
        self.assertTrue(result.success)
        
        # Execute the test function
        result = await self.manager.execute("test_utility_plugin", "execute_function", {
            "func_name": "test_function",
            "parameters": {"param1": "test_value", "param2": "optional_value"}
        })
        
        # Check the result
        self.assertTrue(result.success)
        self.assertEqual(result.data["param1"], "test_value")
        self.assertEqual(result.data["param2"], "optional_value")
        
    async def test_dependencies(self):
        """Test plugin dependencies."""
        # Discover plugins first
        await self.manager.discover_plugins([self.plugin_dir])
        
        # Start the dependent plugin
        result = await self.manager.start_plugin("dependent_plugin")
        self.assertTrue(result.success)
        
        # Check if both plugins are started
        self.assertTrue(self.manager.is_plugin_started("dependent_plugin"))
        self.assertTrue(self.manager.is_plugin_started("dependency_plugin"))
        
        # Check dependency plugin status
        result = await self.manager.execute("dependency_plugin", "check_status")
        self.assertTrue(result.success)
        self.assertTrue(result.data["initialized"])
        self.assertTrue(result.data["started"])
        
    async def test_plugin_lifecycle(self):
        """Test complete plugin lifecycle."""
        # Discover plugins
        await self.manager.discover_plugins([self.plugin_dir])
        
        # Initialize a plugin
        await self.manager.initialize_plugin("test_basic_plugin")
        
        # Start the plugin
        await self.manager.start_plugin("test_basic_plugin")
        
        # Execute an action
        await self.manager.execute("test_basic_plugin", "test_action")
        
        # Stop the plugin
        result = await self.manager.stop_plugin("test_basic_plugin")
        self.assertTrue(result.success)
        
        # Check if the plugin is stopped
        self.assertFalse(self.manager.is_plugin_started("test_basic_plugin"))
        
        # Unregister the plugin
        result = await self.manager.unregister_plugin("test_basic_plugin")
        self.assertTrue(result.success)
        
        # Check if the plugin is unregistered
        self.assertNotIn("test_basic_plugin", self.manager.list_plugins())

if __name__ == "__main__":
    unittest.main()