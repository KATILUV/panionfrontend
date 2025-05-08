"""
Agent Base Class
Base class for all agents with standardized logging and lifecycle management.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass, asdict

from .shared_types import AgentCapabilities, AgentState, RoleType
from .agent_management.role_manager import RoleManager
from .agent_management.task_assignment_manager import TaskAssignmentManager
from .agent_management.agent_context_builder import AgentContextBuilder
from .plugin.base import BasePlugin
from .plugin.manager import plugin_manager
from .panion_memory import memory_manager, MemoryCategory
from .error_handling import error_handler, with_error_recovery
from .shared_state import shared_state, ComponentState

@dataclass
class AgentLogEntry:
    """Structured log entry for agent actions"""
    timestamp: str
    agent_id: str
    action: str
    result: str
    goal_id: Optional[str] = None
    plugin_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class AgentBase:
    """Base class for all agents with standardized lifecycle management."""
    
    def __init__(self, agent_id: str, role: RoleType, capabilities: AgentCapabilities):
        """Initialize the agent.
        
        Args:
            agent_id: Unique identifier for the agent
            role: Role type of the agent
            capabilities: Agent capabilities
        """
        self.agent_id = agent_id
        self.role = role
        self.capabilities = capabilities
        self.state = AgentState(
            status="idle",
            current_tasks=[],
            resource_usage={},
            last_heartbeat=datetime.now()
        )
        
        # Initialize components
        self.role_manager = RoleManager()
        self.task_manager = TaskAssignmentManager()
        self.context_builder = AgentContextBuilder()
        
        # Setup logging
        self.logger = logging.getLogger(f"Agent.{agent_id}")
        self._setup_logging()
        
        # Initialize memory
        self.memory = memory_manager.get_agent_memory(agent_id)
        
        # Register with shared state
        shared_state.register_agent(agent_id, self)
    
    def _setup_logging(self) -> None:
        """Setup agent-specific logging."""
        log_file = Path("logs") / "agents" / f"{self.agent_id}.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    @with_error_recovery
    async def initialize(self) -> bool:
        """Initialize the agent.
        
        Returns:
            bool: True if initialization was successful
        """
        try:
            # Validate role configuration
            role_config = self.role_manager.get_role_config(self.role.value)
            if not role_config:
                raise ValueError(f"Invalid role configuration for {self.role.value}")
            
            # Initialize capabilities
            if not self._initialize_capabilities():
                raise RuntimeError("Failed to initialize capabilities")
            
            # Setup resource monitoring
            self._setup_resource_monitoring()
            
            # Update state
            self.state.status = "idle"
            self.state.last_heartbeat = datetime.now()
            
            self.logger.info(f"Agent {self.agent_id} initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize agent: {str(e)}")
            self.state.status = "error"
            return False
    
    def _initialize_capabilities(self) -> bool:
        """Initialize agent capabilities.
        
        Returns:
            bool: True if capabilities were initialized successfully
        """
        try:
            # Validate required capabilities
            role_config = self.role_manager.get_role_config(self.role.value)
            required_capabilities = role_config.required_capabilities
            
            missing_capabilities = required_capabilities - set(self.capabilities.skills.keys())
            if missing_capabilities:
                self.logger.error(f"Missing required capabilities: {missing_capabilities}")
                return False
            
            # Initialize plugins
            for plugin_id in self.capabilities.plugins:
                if not plugin_manager.register_plugin(plugin_id, {"agent_id": self.agent_id}):
                    self.logger.error(f"Failed to register plugin: {plugin_id}")
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error initializing capabilities: {str(e)}")
            return False
    
    def _setup_resource_monitoring(self) -> None:
        """Setup resource usage monitoring."""
        # Initialize resource usage tracking
        self.state.resource_usage = {
            "cpu": 0.0,
            "memory": 0.0,
            "disk": 0.0,
            "network": 0.0
        }
    
    @with_error_recovery
    async def cleanup(self) -> bool:
        """Cleanup agent resources.
        
        Returns:
            bool: True if cleanup was successful
        """
        try:
            # Cancel all tasks
            for task_id in self.state.current_tasks:
                self.task_manager.cancel_task(task_id)
            
            # Unregister plugins
            for plugin_id in self.capabilities.plugins:
                plugin_manager.unregister_plugin(plugin_id)
            
            # Clear memory
            self.memory.clear()
            
            # Update state
            self.state.status = "terminated"
            self.state.current_tasks = []
            self.state.resource_usage = {}
            
            # Unregister from shared state
            shared_state.unregister_agent(self.agent_id)
            
            self.logger.info(f"Agent {self.agent_id} cleaned up successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to cleanup agent: {str(e)}")
            return False
    
    @with_error_recovery
    async def process_task(self, task_id: str, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a task.
        
        Args:
            task_id: ID of the task to process
            task_data: Task data
            
        Returns:
            Dict[str, Any]: Task result
        """
        try:
            # Update state
            self.state.status = "busy"
            self.state.current_tasks.append(task_id)
            self.state.last_heartbeat = datetime.now()
            
            # Get task context
            context = self.context_builder.build_task_context(task_id, task_data)
            
            # Process task
            result = await self._execute_task(task_id, task_data, context)
            
            # Update state
            self.state.current_tasks.remove(task_id)
            self.state.status = "idle" if not self.state.current_tasks else "busy"
            
            # Log task completion
            self._log_task_completion(task_id, result)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error processing task {task_id}: {str(e)}")
            self.state.error_count += 1
            return {"status": "error", "error": str(e)}
    
    async def _execute_task(self, task_id: str, task_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a task.
        
        Args:
            task_id: ID of the task to execute
            task_data: Task data
            context: Task context
            
        Returns:
            Dict[str, Any]: Task result
        """
        raise NotImplementedError("Subclasses must implement _execute_task")
    
    def _log_task_completion(self, task_id: str, result: Dict[str, Any]) -> None:
        """Log task completion.
        
        Args:
            task_id: ID of the completed task
            result: Task result
        """
        log_entry = AgentLogEntry(
            timestamp=datetime.now().isoformat(),
            agent_id=self.agent_id,
            action="task_completion",
            result=result.get("status", "unknown"),
            goal_id=result.get("goal_id"),
            plugin_id=result.get("plugin_id"),
            metadata=result
        )
        
        self.memory.add_log(log_entry)
        self.logger.info(f"Task {task_id} completed with status: {result.get('status')}")
    
    @with_error_recovery
    async def update_heartbeat(self) -> None:
        """Update agent heartbeat."""
        self.state.last_heartbeat = datetime.now()
        
        # Update resource usage
        self._update_resource_usage()
        
        # Check for errors
        if self.state.error_count > 0:
            self._handle_errors()
    
    def _update_resource_usage(self) -> None:
        """Update resource usage metrics."""
        # Get current resource usage
        try:
            import psutil
            process = psutil.Process()
            
            self.state.resource_usage.update({
                "cpu": process.cpu_percent(),
                "memory": process.memory_info().rss / (1024 * 1024),  # Convert to MB
                "disk": process.io_counters().read_bytes + process.io_counters().write_bytes,
                "network": 0.0  # TODO: Implement network usage tracking
            })
            
        except Exception as e:
            self.logger.error(f"Error updating resource usage: {str(e)}")
    
    def _handle_errors(self) -> None:
        """Handle accumulated errors."""
        if self.state.error_count >= 3:
            self.logger.warning("Too many errors, attempting recovery")
            self.state.retry_count += 1
            
            if self.state.retry_count >= 3:
                self.logger.error("Recovery failed, marking agent as failed")
                self.state.status = "failed"
            else:
                self.state.error_count = 0
                self.state.status = "idle" 