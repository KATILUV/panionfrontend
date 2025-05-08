"""
System State Manager
Handles system-wide state restoration and recovery on startup.
"""

import logging
import asyncio
import json
from pathlib import Path
from typing import Dict, Any, Optional, List, Set
from datetime import datetime
from dataclasses import dataclass, field
import shutil

from .base import BaseComponent, ComponentMetadata, ComponentState
from .service_locator import service_locator
from .reflection import reflection_system
from .error_handling import error_handler, with_error_recovery

@dataclass
class SystemState:
    """Represents the complete system state."""
    goals: Dict[str, Any] = field(default_factory=dict)
    active_goals: Set[str] = field(default_factory=set)
    completed_goals: Set[str] = field(default_factory=set)
    failed_goals: Set[str] = field(default_factory=set)
    plugin_states: Dict[str, Any] = field(default_factory=dict)
    agent_states: Dict[str, Any] = field(default_factory=dict)
    memory_states: Dict[str, Any] = field(default_factory=dict)
    last_save_time: datetime = field(default_factory=datetime.now)
    version: str = "1.0.0"

class SystemStateManager(BaseComponent):
    """Manages system-wide state restoration and recovery."""
    
    def __init__(self):
        """Initialize the system state manager."""
        metadata = ComponentMetadata(
            name="SystemStateManager",
            version="1.0.0",
            description="System-wide state management and restoration",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            dependencies={},
            config_schema={}
        )
        super().__init__(metadata)
        
        self.logger = logging.getLogger(__name__)
        self._setup_logging()
        
        # State storage
        self.state_dir = Path("data/system_state")
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.current_state: Optional[SystemState] = None
        self._state_lock = asyncio.Lock()
        
        # Auto-save settings
        self._auto_save_interval = 300  # 5 minutes
        self._auto_save_task: Optional[asyncio.Task] = None
        
        # Register with service locator
        service_locator.register_service("system_state_manager", self)

    def _setup_logging(self) -> None:
        """Setup logging for the state manager."""
        log_file = Path("logs") / "system_state.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)

    async def initialize(self) -> None:
        """Initialize the state manager and restore system state."""
        try:
            self.logger.info("Initializing system state manager...")
            
            # Create backup of current state if exists
            await self._backup_current_state()
            
            # Restore system state
            await self.restore_system_state()
            
            # Start auto-save task
            self._auto_save_task = asyncio.create_task(self._auto_save_loop())
            
            self.logger.info("System state manager initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Error initializing system state manager: {e}")
            raise

    async def _backup_current_state(self) -> None:
        """Create backup of current system state."""
        try:
            state_file = self.state_dir / "current_state.json"
            if state_file.exists():
                backup_dir = self.state_dir / "backups"
                backup_dir.mkdir(exist_ok=True)
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_file = backup_dir / f"state_backup_{timestamp}.json"
                
                shutil.copy2(state_file, backup_file)
                self.logger.info(f"Created state backup: {backup_file}")
                
        except Exception as e:
            self.logger.error(f"Error creating state backup: {e}")

    async def save_system_state(self) -> None:
        """Save current system state."""
        try:
            async with self._state_lock:
                # Collect state from all components
                state = SystemState(
                    goals=await self._collect_goal_states(),
                    active_goals=await self._collect_active_goals(),
                    completed_goals=await self._collect_completed_goals(),
                    failed_goals=await self._collect_failed_goals(),
                    plugin_states=await self._collect_plugin_states(),
                    agent_states=await self._collect_agent_states(),
                    memory_states=await self._collect_memory_states(),
                    last_save_time=datetime.now()
                )
                
                # Save state to file
                state_file = self.state_dir / "current_state.json"
                with open(state_file, 'w') as f:
                    json.dump(state.__dict__, f, indent=2, default=str)
                
                self.current_state = state
                self.logger.info("System state saved successfully")
                
        except Exception as e:
            self.logger.error(f"Error saving system state: {e}")
            raise

    async def restore_system_state(self) -> None:
        """Restore system state from saved state."""
        try:
            state_file = self.state_dir / "current_state.json"
            if not state_file.exists():
                self.logger.info("No saved state found, starting fresh")
                return
            
            async with self._state_lock:
                # Load state from file
                with open(state_file, 'r') as f:
                    state_data = json.load(f)
                
                self.current_state = SystemState(**state_data)
                
                # Restore goals
                await self._restore_goal_states()
                
                # Restore plugins
                await self._restore_plugin_states()
                
                # Restore agents
                await self._restore_agent_states()
                
                # Restore memory
                await self._restore_memory_states()
                
                self.logger.info("System state restored successfully")
                
        except Exception as e:
            self.logger.error(f"Error restoring system state: {e}")
            raise

    async def _auto_save_loop(self) -> None:
        """Periodically save system state."""
        while True:
            try:
                await asyncio.sleep(self._auto_save_interval)
                await self.save_system_state()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in auto-save loop: {e}")

    async def _collect_goal_states(self) -> Dict[str, Any]:
        """Collect goal states from goal processor."""
        goal_processor = service_locator.get_service("goal_processor")
        if goal_processor:
            return await goal_processor.get_goal_states()
        return {}

    async def _collect_active_goals(self) -> Set[str]:
        """Collect active goals from goal processor."""
        goal_processor = service_locator.get_service("goal_processor")
        if goal_processor:
            return await goal_processor.get_active_goals()
        return set()

    async def _collect_completed_goals(self) -> Set[str]:
        """Collect completed goals from goal processor."""
        goal_processor = service_locator.get_service("goal_processor")
        if goal_processor:
            return await goal_processor.get_completed_goals()
        return set()

    async def _collect_failed_goals(self) -> Set[str]:
        """Collect failed goals from goal processor."""
        goal_processor = service_locator.get_service("goal_processor")
        if goal_processor:
            return await goal_processor.get_failed_goals()
        return set()

    async def _collect_plugin_states(self) -> Dict[str, Any]:
        """Collect plugin states from plugin manager."""
        plugin_manager = service_locator.get_service("plugin_manager")
        if plugin_manager:
            return await plugin_manager.get_plugin_states()
        return {}

    async def _collect_agent_states(self) -> Dict[str, Any]:
        """Collect agent states from agent manager."""
        agent_manager = service_locator.get_service("agent_manager")
        if agent_manager:
            return await agent_manager.get_agent_states()
        return {}

    async def _collect_memory_states(self) -> Dict[str, Any]:
        """Collect memory states from memory manager."""
        memory_manager = service_locator.get_service("memory_manager")
        if memory_manager:
            return await memory_manager.get_memory_states()
        return {}

    async def _restore_goal_states(self) -> None:
        """Restore goal states to goal processor."""
        if not self.current_state:
            return
            
        goal_processor = service_locator.get_service("goal_processor")
        if goal_processor:
            await goal_processor.restore_goal_states(
                self.current_state.goals,
                self.current_state.active_goals,
                self.current_state.completed_goals,
                self.current_state.failed_goals
            )

    async def _restore_plugin_states(self) -> None:
        """Restore plugin states to plugin manager."""
        if not self.current_state:
            return
            
        plugin_manager = service_locator.get_service("plugin_manager")
        if plugin_manager:
            await plugin_manager.restore_plugin_states(self.current_state.plugin_states)

    async def _restore_agent_states(self) -> None:
        """Restore agent states to agent manager."""
        if not self.current_state:
            return
            
        agent_manager = service_locator.get_service("agent_manager")
        if agent_manager:
            await agent_manager.restore_agent_states(self.current_state.agent_states)

    async def _restore_memory_states(self) -> None:
        """Restore memory states to memory manager."""
        if not self.current_state:
            return
            
        memory_manager = service_locator.get_service("memory_manager")
        if memory_manager:
            await memory_manager.restore_memory_states(self.current_state.memory_states)

    async def stop(self) -> None:
        """Stop the state manager."""
        try:
            if self._auto_save_task:
                self._auto_save_task.cancel()
                try:
                    await self._auto_save_task
                except asyncio.CancelledError:
                    pass
            
            # Save final state
            await self.save_system_state()
            
            self.logger.info("System state manager stopped")
            
        except Exception as e:
            self.logger.error(f"Error stopping system state manager: {e}")
            raise

# Create global instance
system_state_manager = SystemStateManager() 