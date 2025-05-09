"""
Test Plugin Discovery

Integration tests for the plugin discovery system, ensuring it can properly
discover, load, and instantiate plugins.
"""

import os
import tempfile
import unittest
from pathlib import Path

from panion.core.plugin.discovery import PluginDiscovery
from panion.core.plugin.base import BasePlugin
from panion.core.plugin.templates.basic_plugin import BasicPlugin
from panion.core.plugin.templates.service_plugin import ServicePlugin
from panion.core.plugin.templates.utility_plugin import UtilityPlugin

# Helper function to create test plugins
def create_test_plugin_file(directory, filename, plugin_class_code):
    """Create a test plugin file in the specified directory."""
    file_path = os.path.join(directory, filename)
    with open(file_path, 'w') as f:
        f.write(plugin_class_code)
    return file_path

class TestPluginDiscovery(unittest.TestCase):
    """Test cases for the PluginDiscovery class."""
    
    def setUp(self):
        """Set up the test environment."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.plugin_dir = self.temp_dir.name
        self.discovery = PluginDiscovery()
        
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
        
    async def _service_update(self):
        return PluginResult(
            success=True,
            message="Service update completed",
            data={"updated": True}
        )
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
        
        # Create the plugin files
        create_test_plugin_file(self.plugin_dir, "test_basic_plugin.py", self.basic_plugin_code)
        create_test_plugin_file(self.plugin_dir, "test_service_plugin.py", self.service_plugin_code)
        create_test_plugin_file(self.plugin_dir, "test_utility_plugin.py", self.utility_plugin_code)
        
        # Add the plugin directory
        self.discovery.add_plugin_directory(self.plugin_dir)
        
    def tearDown(self):
        """Clean up the test environment."""
        self.temp_dir.cleanup()
        
    def test_add_plugin_directory(self):
        """Test adding a plugin directory."""
        # Create a new temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            # Add it to the discovery system
            result = self.discovery.add_plugin_directory(temp_dir)
            self.assertTrue(result)
            
            # Try to add it again (should fail)
            result = self.discovery.add_plugin_directory(temp_dir)
            self.assertFalse(result)
            
            # Try to add a non-existent directory (should fail)
            result = self.discovery.add_plugin_directory("/non/existent/directory")
            self.assertFalse(result)
            
    def test_remove_plugin_directory(self):
        """Test removing a plugin directory."""
        # Create a new temporary directory and add it
        with tempfile.TemporaryDirectory() as temp_dir:
            self.discovery.add_plugin_directory(temp_dir)
            
            # Remove it
            result = self.discovery.remove_plugin_directory(temp_dir)
            self.assertTrue(result)
            
            # Try to remove it again (should fail)
            result = self.discovery.remove_plugin_directory(temp_dir)
            self.assertFalse(result)
            
    def test_discover_plugins(self):
        """Test discovering plugins."""
        # Discover plugins
        plugins = self.discovery.discover_plugins()
        
        # Check that we found all the test plugins
        self.assertIn("test_basic_plugin", plugins)
        self.assertIn("test_service_plugin", plugins)
        self.assertIn("test_utility_plugin", plugins)
        
        # Check that the plugins have the right types
        self.assertTrue(issubclass(plugins["test_basic_plugin"], BasicPlugin))
        self.assertTrue(issubclass(plugins["test_service_plugin"], ServicePlugin))
        self.assertTrue(issubclass(plugins["test_utility_plugin"], UtilityPlugin))
        
    def test_get_plugin_class(self):
        """Test getting a plugin class by name."""
        # Discover plugins first
        self.discovery.discover_plugins()
        
        # Get a plugin class
        plugin_class = self.discovery.get_plugin_class("test_basic_plugin")
        self.assertIsNotNone(plugin_class)
        # Only check if plugin_class is not None
        if plugin_class is not None:
            self.assertTrue(issubclass(plugin_class, BasicPlugin))
        
        # Try to get a non-existent plugin class
        non_existent_plugin = self.discovery.get_plugin_class("non_existent_plugin")
        self.assertIsNone(non_existent_plugin)
        
    def test_instantiate_plugins(self):
        """Test instantiating plugins."""
        # Discover plugins first
        self.discovery.discover_plugins()
        
        # Instantiate plugins
        instances = self.discovery.instantiate_plugins()
        
        # Check that we have all the plugins
        self.assertIn("test_basic_plugin", instances)
        self.assertIn("test_service_plugin", instances)
        self.assertIn("test_utility_plugin", instances)
        
        # Check that the instances have the right types
        self.assertIsInstance(instances["test_basic_plugin"], BasicPlugin)
        self.assertIsInstance(instances["test_service_plugin"], ServicePlugin)
        self.assertIsInstance(instances["test_utility_plugin"], UtilityPlugin)
        
        # Check specific properties and methods
        self.assertEqual(instances["test_basic_plugin"].metadata.name, "Test Basic Plugin")
        self.assertEqual(instances["test_service_plugin"].metadata.name, "Test Service Plugin")
        self.assertEqual(instances["test_utility_plugin"].metadata.name, "Test Utility Plugin")
        
    def test_discover_and_instantiate(self):
        """Test discovering and instantiating plugins in one step."""
        # Create a new PluginDiscovery instance
        discovery = PluginDiscovery()
        
        # Discover and instantiate plugins
        classes, instances = discovery.discover_and_instantiate([self.plugin_dir])
        
        # Check the results
        self.assertIn("test_basic_plugin", classes)
        self.assertIn("test_basic_plugin", instances)
        self.assertIsInstance(instances["test_basic_plugin"], BasicPlugin)

if __name__ == "__main__":
    unittest.main()