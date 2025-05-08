"""
Main entry point for the Panion system.
"""

import asyncio
import logging
import json
from datetime import datetime
from pathlib import Path
from injector import Injector, Module, singleton, inject

from core.service_locator import ServiceLocator
from core.error_handling import ErrorHandler
from core.plugin_manager import PluginManager
from core.plugin.dependency_manager import DependencyManager
from core.orchestrator import Orchestrator
from core.plugin.interfaces import IPluginManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_config() -> dict:
    """Load system configuration."""
    config_path = Path('config/config.json')
    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    with open(config_path, 'r') as f:
        return json.load(f)

class PanionModule(Module):
    """Dependency injection module for Panion system."""
    
    def configure(self, binder):
        """Configure dependency injection bindings."""
        # Load configuration
        config = load_config()
        
        # Bind configuration
        binder.bind(dict, to=config, scope=singleton)
        
        # Bind services
        binder.bind(ServiceLocator, to=ServiceLocator, scope=singleton)
        binder.bind(ErrorHandler, to=ErrorHandler, scope=singleton)
        binder.bind(DependencyManager, to=DependencyManager, scope=singleton)
        binder.bind(PluginManager, to=PluginManager, scope=singleton)
        binder.bind(IPluginManager, to=PluginManager, scope=singleton)
        binder.bind(Orchestrator, to=Orchestrator, scope=singleton)

async def initialize_system() -> None:
    """Initialize the Panion system."""
    logger.info("Initializing Panion system...")
    
    # Create dependency injection container
    logger.info("Creating dependency injection container...")
    injector = Injector([PanionModule()])
    logger.info("Dependency injection container created")
    
    # Begin system initialization
    logger.info("Beginning system initialization...")
    
    # Step 1: Initialize ErrorHandler first (no dependencies)
    logger.info("Step 1: Initializing ErrorHandler...")
    error_handler = injector.get(ErrorHandler)
    await error_handler.initialize()
    logger.info("ErrorHandler initialized successfully")
    
    # Step 2: Initialize ServiceLocator (depends on ErrorHandler)
    logger.info("Step 2: Initializing ServiceLocator...")
    service_locator = injector.get(ServiceLocator)
    await service_locator.initialize()
    await service_locator.start()  # Start ServiceLocator before other components
    logger.info("ServiceLocator initialized successfully")
    
    # Step 3: Initialize DependencyManager (depends on ServiceLocator and ErrorHandler)
    logger.info("Step 3: Initializing DependencyManager...")
    dependency_manager = injector.get(DependencyManager)
    await dependency_manager.initialize()
    logger.info("DependencyManager initialized successfully")
    
    # Step 4: Initialize PluginManager (depends on DependencyManager, ServiceLocator, and ErrorHandler)
    logger.info("Step 4: Initializing PluginManager...")
    plugin_manager = injector.get(PluginManager)
    await plugin_manager.initialize()
    logger.info("PluginManager initialized successfully")
    
    # Step 5: Initialize Orchestrator (depends on all above)
    logger.info("Step 5: Initializing Orchestrator...")
    config = injector.get(dict)
    orchestrator = injector.get(Orchestrator)
    await orchestrator.initialize(config)
    logger.info("Orchestrator initialized successfully")
    
    logger.info("System initialization complete")
    return orchestrator

async def main():
    """Main entry point."""
    try:
        # Initialize system
        orchestrator = await initialize_system()
        
        # Start system
        logger.info("Starting Panion system...")
        await orchestrator.start()
        
        # Run main loop
        await orchestrator.run()
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise
    finally:
        # Cleanup
        logger.info("Shutting down Panion system...")
        if 'orchestrator' in locals():
            await orchestrator.stop()

if __name__ == "__main__":
    logger.info("Starting Panion system...")
    asyncio.run(main()) 