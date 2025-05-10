"""
Test Plugin Synthesizer
Tests the plugin synthesizer by requesting a new plugin design.
"""

import asyncio
import logging
from core.services.plugin_service import PluginService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("test_plugin_synthesizer")

async def main():
    """Test the plugin synthesizer."""
    try:
        # Initialize plugin service
        plugin_service = PluginService()
        
        # Load plugins
        logger.info("Loading plugins...")
        await plugin_service.load_plugins()
        
        # Start plugins
        logger.info("Starting plugins...")
        await plugin_service.start_plugins()
        
        # Test plugin synthesizer
        logger.info("Testing plugin synthesizer...")
        result = await plugin_service.execute_plugin(
            "plugin_synthesizer",
            "suggest_plugin",
            {
                "description": "A VS Code extension to integrate with Panion plugins",
                "requirements": [
                    "Provide a GUI for interacting with Panion plugins",
                    "Show plugin status and logs in VS Code",
                    "Allow plugin configuration through VS Code settings",
                    "Support command palette integration",
                    "Provide visual feedback for plugin operations",
                    "Enable plugin debugging through VS Code",
                    "Support workspace-specific plugin settings"
                ],
                "complexity": 6
            }
        )
        
        logger.info("Plugin suggestion result:")
        print(result)
        
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        # Stop and cleanup plugins
        logger.info("Stopping plugins...")
        await plugin_service.stop_plugins()
        await plugin_service.cleanup_plugins()

if __name__ == "__main__":
    asyncio.run(main()) 