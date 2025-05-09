# Plugin Templates

This directory contains plugin templates that can be used as a foundation for creating new plugins. Each template extends the BasePlugin class with specialized functionality.

## Available Templates

### BasicPlugin

`basic_plugin.py` - A standard template for simple plugins that don't require complex functionality.

**Features:**
- Standard initialization
- Basic lifecycle methods (start, stop, pause, resume)
- Metrics collection
- Simple execution patterns

**When to use:**
- For simple plugins with basic functionality
- As a base for other plugin types
- For plugins that don't need background processes or complex state

### ServicePlugin

`service_plugin.py` - A template for plugins that provide ongoing services or background tasks.

**Features:**
- Service lifecycle management (start_service, stop_service)
- Background task handling with asyncio
- Service state tracking and health monitoring
- Update interval management

**When to use:**
- For plugins that need to run continuous background processes
- For services that need periodic updates or monitoring
- For long-running tasks that should continue even when not directly used

### UtilityPlugin

`utility_plugin.py` - A template for plugins that provide utility functions and operations.

**Features:**
- Function registration system
- Function execution with parameter validation
- Usage statistics tracking
- Function documentation

**When to use:**
- For plugins that provide a collection of utility functions
- For tools or utility libraries that need to be accessible through the plugin system
- For grouping related functionality into a single plugin

## Usage Guidelines

### Creating a New Plugin

1. Choose the appropriate template based on your plugin's needs
2. Import the template class from the templates directory:
   ```python
   from panion.core.plugin.templates.basic_plugin import BasicPlugin
   # OR
   from panion.core.plugin.templates.service_plugin import ServicePlugin
   # OR
   from panion.core.plugin.templates.utility_plugin import UtilityPlugin
   ```
3. Create a new class that extends the chosen template:
   ```python
   class MyPlugin(BasicPlugin):
       def __init__(self):
           super().__init__(
               name="My Plugin",
               version="1.0.0",
               description="A description of my plugin",
               author="Your Name",
               tags=["tag1", "tag2"],
               dependencies=["another-plugin"]
           )
   ```
4. Override the necessary methods for your plugin's functionality

### Plugin Lifecycle

All plugins follow the same basic lifecycle:

1. **Initialization**: `initialize()` - Set up resources and initial state
2. **Start**: `start()` - Begin operation
3. **Execution**: `execute()` - Perform actions as requested
4. **Stop**: `stop()` - Cease operation
5. **Cleanup**: `cleanup()` - Release resources

Each template may add additional lifecycle methods specific to its purpose.

### Registration with Plugin Manager

To make a plugin available to the system, register it with the PluginManager:

```python
from panion.core.plugin.manager import PluginManager

# Create plugin instance
my_plugin = MyPlugin()

# Register with plugin manager
plugin_manager = PluginManager()
plugin_manager.register_plugin(my_plugin)
```

## Best Practices

1. **Handle exceptions properly**: Catch and handle exceptions within your plugin to prevent them from affecting the larger system
2. **Use the provided logger**: The BasePlugin provides a logger; use it for consistent logging
3. **Return appropriate PluginResult objects**: Always return PluginResult objects with appropriate success/failure status and messages
4. **Document your plugin thoroughly**: Include comprehensive docstrings and comments to make your plugin easy to understand and use
5. **Implement proper cleanup**: Ensure that your plugin properly cleans up any resources it uses when stopped or unloaded