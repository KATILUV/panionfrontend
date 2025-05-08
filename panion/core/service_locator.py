"""
Service Locator
Manages service registration and retrieval.
"""

import logging
from typing import Dict, Any, Optional, Type, TypeVar
from datetime import datetime
from injector import inject, singleton

from core.base import BaseComponent, ComponentMetadata, ComponentState
from core.error_handling import ErrorHandler

T = TypeVar('T')

@singleton
class ServiceLocator(BaseComponent):
    """Manages service registration and retrieval."""
    
    @inject
    def __init__(self, error_handler: ErrorHandler):
        """Initialize the service locator.
        
        Args:
            error_handler: The error handler instance
        """
        metadata = ComponentMetadata(
            name="ServiceLocator",
            version="1.0.0",
            description="Service registration and retrieval system",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            dependencies={},
            config_schema={}
        )
        super().__init__(metadata)
        
        self.logger = logging.getLogger(__name__)
        self.error_handler = error_handler
        self.services: Dict[str, Any] = {}
        self.service_types: Dict[str, Type] = {}
        self.service_metrics: Dict[str, Dict[str, Any]] = {}
    
    async def initialize(self) -> None:
        """Initialize the service locator."""
        self.logger.info("Initializing service locator")
        self._state = ComponentState.INITIALIZING
        try:
            self._state = ComponentState.ACTIVE
        except Exception as e:
            # During initialization, just log the error
            self.logger.error(f"Error during service locator initialization: {e}")
            raise
    
    async def start(self) -> None:
        """Start the service locator."""
        self.logger.info("Starting service locator")
        self._start_time = datetime.now()
        self._state = ComponentState.ACTIVE
    
    async def stop(self) -> None:
        """Stop the service locator."""
        self.logger.info("Stopping service locator")
        self._state = ComponentState.STOPPING
        self._state = ComponentState.STOPPED
    
    async def pause(self) -> None:
        """Pause the service locator."""
        self.logger.info("Pausing service locator")
        self._state = ComponentState.PAUSED
    
    async def resume(self) -> None:
        """Resume the service locator."""
        self.logger.info("Resuming service locator")
        self._state = ComponentState.ACTIVE
    
    async def update(self) -> None:
        """Update the service locator state."""
        if self._state == ComponentState.ACTIVE:
            try:
                # Update service metrics
                for service_id, service in self.services.items():
                    try:
                        # Only update metrics if service has get_metrics method
                        if hasattr(service, 'get_metrics') and callable(getattr(service, 'get_metrics')):
                            metrics = await service.get_metrics()
                            if metrics:
                                self.service_metrics[service_id].update(metrics)
                    except Exception as e:
                        self.logger.error(f"Error updating metrics for service {service_id}: {e}")
            except Exception as e:
                # After initialization, use error handler
                await self.error_handler.handle_error(e, {"context": "service_locator_update"})
    
    def register_service(self, service_id: str, service: Any) -> None:
        """Register a service.
        
        Args:
            service_id: Service identifier
            service: Service instance or class
        """
        try:
            self.logger.info(f"Registering service: {service_id}")
            
            # Store service
            self.services[service_id] = service
            
            # Store service type
            self.service_types[service_id] = type(service)
            
            # Initialize metrics
            self.service_metrics[service_id] = {
                'registration_time': datetime.now(),
                'access_count': 0,
                'last_access': None
            }
            
            self.logger.info(f"Service {service_id} registered successfully")
            
        except Exception as e:
            self.logger.error(f"Error registering service {service_id}: {str(e)}")
            raise
    
    async def unregister_service(self, service_id: str) -> bool:
        """Unregister a service.
        
        Args:
            service_id: Service identifier
            
        Returns:
            bool: Whether unregistration was successful
        """
        try:
            # Check if service exists
            if service_id not in self.services:
                self.logger.warning(f"Service {service_id} not found")
                return False
            
            # Unregister service
            del self.services[service_id]
            del self.service_types[service_id]
            del self.service_metrics[service_id]
            
            self.logger.info(f"Unregistered service: {service_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error unregistering service {service_id}: {e}")
            return False
    
    def get_service(self, service_id: str) -> Any:
        """Get a service.
        
        Args:
            service_id: Service identifier
            
        Returns:
            Any: Service instance or class
        """
        try:
            # Get service
            service = self.services.get(service_id)
            if not service:
                raise ValueError(f"Service not found: {service_id}")
            
            # Update metrics
            self.service_metrics[service_id]['access_count'] += 1
            self.service_metrics[service_id]['last_access'] = datetime.now()
            
            return service
            
        except Exception as e:
            self.logger.error(f"Error getting service {service_id}: {str(e)}")
            raise
    
    def get_service_type(self, service_id: str) -> Optional[Type]:
        """Get a service's type.
        
        Args:
            service_id: Service identifier
            
        Returns:
            Optional[Type]: Service type if found
        """
        return self.service_types.get(service_id)
    
    def get_service_metrics(self, service_id: str) -> Optional[Dict[str, Any]]:
        """Get a service's metrics.
        
        Args:
            service_id: Service identifier
            
        Returns:
            Optional[Dict[str, Any]]: Service metrics if found
        """
        return self.service_metrics.get(service_id)
    
    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the service locator."""
        return {
            'state': self._state.value,
            'service_count': len(self.services),
            'uptime': self.uptime
        } 