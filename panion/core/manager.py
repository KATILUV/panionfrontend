"""
Base Manager Interface
Defines standard interfaces for all Panion managers.
"""

import logging
from typing import Dict, Any, Optional, List, TypeVar, Generic, Type
from enum import Enum
from datetime import datetime
from dataclasses import dataclass
import asyncio
from abc import ABC, abstractmethod

from .base import BaseComponent, ComponentMetadata, ComponentState

T = TypeVar('T')

class ManagerState(Enum):
    """Manager lifecycle states."""
    UNINITIALIZED = "uninitialized"
    INITIALIZING = "initializing"
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"
    STOPPING = "stopping"
    STOPPED = "stopped"

@dataclass
class ManagerMetadata(ComponentMetadata):
    """Manager metadata."""
    managed_type: Type[T]
    max_items: Optional[int]
    auto_cleanup: bool
    cleanup_interval: Optional[float]

class BaseManager(BaseComponent, Generic[T]):
    """Base class for all Panion managers."""
    
    def __init__(self, metadata: ManagerMetadata):
        super().__init__(metadata)
        self._items: Dict[str, T] = {}
        self._item_states: Dict[str, ComponentState] = {}
        self._item_metadata: Dict[str, Dict[str, Any]] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
    
    @property
    def item_count(self) -> int:
        """Get the number of managed items."""
        return len(self._items)
    
    @property
    def items(self) -> Dict[str, T]:
        """Get all managed items."""
        return self._items.copy()
    
    async def initialize(self) -> None:
        """Initialize the manager."""
        try:
            self._state = ComponentState.INITIALIZING
            await self.on_initialize()
            
            if self.metadata.auto_cleanup and self.metadata.cleanup_interval:
                self._cleanup_task = asyncio.create_task(
                    self._cleanup_loop()
                )
            
            self._state = ComponentState.ACTIVE
            self._start_time = datetime.now()
            self.logger.info(f"Manager {self.metadata.name} initialized")
            
        except Exception as e:
            self._handle_error(e)
            raise
    
    async def start(self) -> None:
        """Start the manager."""
        try:
            if self._state != ComponentState.ACTIVE:
                self._state = ComponentState.ACTIVE
                await self.on_start()
                self.logger.info(f"Manager {self.metadata.name} started")
        except Exception as e:
            self._handle_error(e)
            raise
    
    async def stop(self) -> None:
        """Stop the manager."""
        try:
            if self._state != ComponentState.STOPPED:
                self._state = ComponentState.STOPPING
                
                if self._cleanup_task:
                    self._cleanup_task.cancel()
                    try:
                        await self._cleanup_task
                    except asyncio.CancelledError:
                        pass
                
                await self.on_stop()
                self._state = ComponentState.STOPPED
                self.logger.info(f"Manager {self.metadata.name} stopped")
        except Exception as e:
            self._handle_error(e)
            raise
    
    async def pause(self) -> None:
        """Pause the manager."""
        try:
            if self._state == ComponentState.ACTIVE:
                self._state = ComponentState.PAUSED
                await self.on_pause()
                self.logger.info(f"Manager {self.metadata.name} paused")
        except Exception as e:
            self._handle_error(e)
            raise
    
    async def resume(self) -> None:
        """Resume the manager."""
        try:
            if self._state == ComponentState.PAUSED:
                self._state = ComponentState.ACTIVE
                await self.on_resume()
                self.logger.info(f"Manager {self.metadata.name} resumed")
        except Exception as e:
            self._handle_error(e)
            raise
    
    async def update(self) -> None:
        """Update the manager state."""
        try:
            if self._state == ComponentState.ACTIVE:
                await self.on_update()
        except Exception as e:
            self._handle_error(e)
            raise
    
    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the manager."""
        return {
            'name': self.metadata.name,
            'version': self.metadata.version,
            'state': self._state.value,
            'is_active': self.is_active,
            'uptime': self.uptime,
            'error_count': self._error_count,
            'item_count': self.item_count,
            'managed_type': self.metadata.managed_type.__name__,
            'auto_cleanup': self.metadata.auto_cleanup,
            'cleanup_interval': self.metadata.cleanup_interval
        }
    
    async def add_item(self, name: str, item: T, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Add an item to the manager."""
        try:
            if name in self._items:
                self.logger.warning(f"Item {name} already exists")
                return False
            
            if (self.metadata.max_items and 
                len(self._items) >= self.metadata.max_items):
                self.logger.warning("Maximum item count reached")
                return False
            
            if not await self._validate_item(item):
                self.logger.warning(f"Item {name} validation failed")
                return False
            
            self._items[name] = item
            self._item_states[name] = ComponentState.ACTIVE
            self._item_metadata[name] = metadata or {}
            
            await self.on_item_added(name, item)
            self.logger.info(f"Item {name} added")
            return True
            
        except Exception as e:
            self._handle_error(e)
            return False
    
    async def remove_item(self, name: str) -> bool:
        """Remove an item from the manager."""
        try:
            if name not in self._items:
                self.logger.warning(f"Item {name} not found")
                return False
            
            await self.on_item_removed(name, self._items[name])
            
            del self._items[name]
            del self._item_states[name]
            del self._item_metadata[name]
            
            self.logger.info(f"Item {name} removed")
            return True
            
        except Exception as e:
            self._handle_error(e)
            return False
    
    async def get_item(self, name: str) -> Optional[T]:
        """Get an item from the manager."""
        return self._items.get(name)
    
    async def get_item_state(self, name: str) -> Optional[ComponentState]:
        """Get the state of an item."""
        return self._item_states.get(name)
    
    async def get_item_metadata(self, name: str) -> Optional[Dict[str, Any]]:
        """Get metadata for an item."""
        return self._item_metadata.get(name)
    
    async def _cleanup_loop(self) -> None:
        """Background task for automatic cleanup."""
        while True:
            try:
                await asyncio.sleep(self.metadata.cleanup_interval)
                await self.cleanup()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in cleanup loop: {e}")
    
    async def cleanup(self) -> None:
        """Clean up managed items."""
        try:
            await self.on_cleanup()
        except Exception as e:
            self.logger.error(f"Error during cleanup: {e}")
    
    # Manager lifecycle hooks
    async def on_initialize(self) -> None:
        """Called when the manager is initialized."""
        pass
    
    async def on_start(self) -> None:
        """Called when the manager is started."""
        pass
    
    async def on_stop(self) -> None:
        """Called when the manager is stopped."""
        pass
    
    async def on_pause(self) -> None:
        """Called when the manager is paused."""
        pass
    
    async def on_resume(self) -> None:
        """Called when the manager is resumed."""
        pass
    
    async def on_update(self) -> None:
        """Called during manager updates."""
        pass
    
    async def on_cleanup(self) -> None:
        """Called during cleanup."""
        pass
    
    async def on_item_added(self, name: str, item: T) -> None:
        """Called when an item is added."""
        pass
    
    async def on_item_removed(self, name: str, item: T) -> None:
        """Called when an item is removed."""
        pass
    
    @abstractmethod
    async def _validate_item(self, item: T) -> bool:
        """Validate an item before adding it."""
        pass 