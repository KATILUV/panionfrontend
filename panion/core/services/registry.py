"""
Service Registry
Manages and provides access to all system services.
"""

import logging
from typing import Dict, Optional, Type
from datetime import datetime

from ..core.base import BaseComponent, ComponentState

class ServiceRegistry:
    """Registry for system services."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._services: Dict[str, BaseComponent] = {}
        self._initialized = False
        self._initialization_time: Optional[datetime] = None
    
    async def initialize(self) -> bool:
        """Initialize all registered services."""
        try:
            if self._initialized:
                return True
            
            self.logger.info("Initializing service registry")
            
            # Initialize each service
            for name, service in self._services.items():
                try:
                    self.logger.info(f"Initializing service: {name}")
                    if not await service.initialize():
                        self.logger.error(f"Failed to initialize service: {name}")
                        return False
                except Exception as e:
                    self.logger.error(
                        f"Error initializing service {name}: {e}"
                    )
                    return False
            
            self._initialized = True
            self._initialization_time = datetime.now()
            
            self.logger.info("Service registry initialized")
            return True
            
        except Exception as e:
            self.logger.error(f"Error initializing service registry: {e}")
            return False
    
    def register_service(self, service: BaseComponent):
        """Register a service."""
        try:
            name = service.name
            if name in self._services:
                self.logger.warning(
                    f"Service {name} already registered, overwriting"
                )
            
            self._services[name] = service
            self.logger.info(f"Registered service: {name}")
            
        except Exception as e:
            self.logger.error(f"Error registering service: {e}")
    
    def get_service(self, name: str) -> Optional[BaseComponent]:
        """Get a service by name."""
        try:
            return self._services.get(name)
        except Exception as e:
            self.logger.error(f"Error getting service: {e}")
            return None
    
    def get_all_services(self) -> Dict[str, BaseComponent]:
        """Get all registered services."""
        return self._services.copy()
    
    async def get_service_status(self) -> Dict:
        """Get status of all services."""
        try:
            status = {
                "initialized": self._initialized,
                "initialization_time": self._initialization_time.isoformat() if self._initialization_time else None,
                "services": {}
            }
            
            for name, service in self._services.items():
                service_status = {
                    "name": service.name,
                    "version": service.version,
                    "state": service.state.name,
                    "is_healthy": service.state == ComponentState.ACTIVE
                }
                
                # Get service-specific status if available
                if hasattr(service, 'get_status'):
                    try:
                        service_status.update(await service.get_status())
                    except Exception as e:
                        self.logger.error(
                            f"Error getting status for service {name}: {e}"
                        )
                
                status["services"][name] = service_status
            
            return status
            
        except Exception as e:
            self.logger.error(f"Error getting service status: {e}")
            return {
                "error": str(e)
            }
    
    async def shutdown(self):
        """Shutdown all services."""
        try:
            self.logger.info("Shutting down service registry")
            
            # Shutdown each service
            for name, service in self._services.items():
                try:
                    self.logger.info(f"Shutting down service: {name}")
                    if hasattr(service, 'shutdown'):
                        await service.shutdown()
                except Exception as e:
                    self.logger.error(
                        f"Error shutting down service {name}: {e}"
                    )
            
            self._initialized = False
            self.logger.info("Service registry shut down")
            
        except Exception as e:
            self.logger.error(f"Error shutting down service registry: {e}")

# Create singleton instance
service_registry = ServiceRegistry()

# Register core services
from .health_service import health_service
from .file_service import file_service
from .resource_service import resource_service
from .plugin_service import plugin_service
from .memory_service import memory_service

service_registry.register_service(health_service)
service_registry.register_service(file_service)
service_registry.register_service(resource_service)
service_registry.register_service(plugin_service)
service_registry.register_service(memory_service) 