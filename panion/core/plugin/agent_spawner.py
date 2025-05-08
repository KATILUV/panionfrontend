"""
Agent Spawner Implementation
Handles agent spawning, lifecycle management, and resource allocation.
Combines features from core/agent_spawner.py and core/agent_management/agent_spawner.py
"""

import logging
import asyncio
from typing import Dict, Any, Optional, Set
from datetime import datetime
import uuid
import psutil
from pathlib import Path
import json
import yaml

from .interfaces import IAgentSpawner
from .base import BasePlugin
from .manager import plugin_manager
from ..error_handling import error_handler, with_error_recovery
from ..config import agent_config
from ..reflection import reflection_system
from ..memory_system import memory_system
from ..meta_agent import meta_agent
from ..messaging_system import MessagingSystem
from ..agent_base import AgentBase
from ..plugin_types import GoalType, PluginError
from ..agent_management.agents import (
    PlannerAgent,
    RefinerAgent,
    ExecutorAgent,
    TesterAgent
)
from ..panion_memory import memory_manager, MemoryCategory
from ..shared_state import shared_state, ComponentState
from ..panion_errors import ErrorSeverity

class AgentSpawner(IAgentSpawner):
    """Handles agent spawning and lifecycle management."""
    
    def __init__(self, config_path: str = "config/agent_configs.yaml"):
        """Initialize the agent spawner."""
        self.logger = logging.getLogger(__name__)
        self._active_agents: Dict[str, Dict[str, Any]] = {}
        self._agent_resources: Dict[str, Dict[str, Any]] = {}
        self._agent_states: Dict[str, str] = {}
        self._spawn_history: Dict[str, Dict[str, Any]] = {}
        self.config_path = Path(config_path)
        self.configs = self._load_configs()
        self.messaging_system = MessagingSystem()
        
        # Resource limits
        self._max_agents = agent_config.max_agents
        self._max_memory_per_agent = agent_config.max_memory_per_agent
        self._max_cpu_per_agent = agent_config.max_cpu_per_agent
        
        # Load spawn history
        self._load_spawn_history()
    
    def _load_configs(self) -> Dict[str, Any]:
        """Load agent configurations from YAML file."""
        try:
            if not self.config_path.exists():
                self.logger.warning(f"Config file not found at {self.config_path}")
                return {}
                
            with open(self.config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.logger.error(f"Error loading agent configs: {e}")
            return {}
    
    @with_error_recovery
    async def spawn_agent(self, agent_type: str, config: Dict[str, Any]) -> str:
        """Spawn a new agent.
        
        Args:
            agent_type: Type of agent to spawn
            config: Agent configuration
            
        Returns:
            str: ID of the spawned agent
            
        Raises:
            ValueError: If agent type is invalid or resource limits exceeded
            RuntimeError: If agent spawning fails
        """
        try:
            # Check resource limits
            if len(self._active_agents) >= self._max_agents:
                raise ValueError(f"Maximum number of agents ({self._max_agents}) reached")
            
            # Validate agent type
            if not self._is_valid_agent_type(agent_type):
                raise ValueError(f"Invalid agent type: {agent_type}")
            
            # Generate agent ID
            agent_id = str(uuid.uuid4())
            
            # Check resource availability
            if not await self._check_resource_availability():
                raise ValueError("Insufficient system resources")
            
            # Get agent config
            agent_config = self.configs.get(f"{agent_type}_agent", {})
            if not agent_config:
                raise ValueError(f"No configuration found for agent type: {agent_type}")
            
            # Create agent instance
            agent = await self._create_agent_instance(agent_type, agent_id, agent_config)
            if not agent:
                raise RuntimeError(f"Failed to create {agent_type} agent")
            
            # Initialize agent
            await agent.initialize()
            
            # Create process
            process = await self._create_agent_process(agent_type, config)
            if not process:
                raise RuntimeError("Failed to create agent process")
            
            # Initialize agent state
            self._active_agents[agent_id] = {
                "type": agent_type,
                "config": config,
                "process": process,
                "instance": agent,
                "start_time": datetime.now(),
                "status": "running"
            }
            
            # Monitor resources
            self._agent_resources[agent_id] = {
                "memory_usage": 0.0,
                "cpu_usage": 0.0,
                "last_update": datetime.now()
            }
            
            # Start resource monitoring
            asyncio.create_task(self._monitor_agent_resources(agent_id))
            
            # Record spawn
            self._record_agent_spawn(agent_id, agent_type, config)
            
            # Log to reflection system
            reflection_system.log_thought(
                "agent_spawner",
                f"Spawned {agent_type} agent",
                {
                    "agent_id": agent_id,
                    "type": agent_type,
                    "capabilities": agent.capabilities,
                    "config": config
                }
            )
            
            # Track in meta agent
            meta_agent.track_action(
                agent_id=agent_id,
                action_type="spawn",
                input_data={"type": agent_type, "config": config},
                output_data={"success": True},
                duration=0.0,
                success=True,
                metadata={"type": agent_type}
            )
            
            # Store in memory system
            memory_system.add_memory(
                content={
                    "agent_id": agent_id,
                    "type": agent_type,
                    "capabilities": agent.capabilities
                },
                importance=0.7,
                context={"type": agent_type},
                metadata={
                    "created_at": datetime.now().isoformat(),
                    "memory_limit": agent.memory_limit,
                    "retry_cap": agent.retry_cap,
                    "timeout": agent.timeout
                }
            )
            
            self.logger.info(f"Spawned agent {agent_id} of type {agent_type}")
            return agent_id
            
        except Exception as e:
            self.logger.error(f"Failed to spawn agent: {str(e)}")
            raise
    
    async def _create_agent_instance(self, agent_type: str, agent_id: str, config: Dict[str, Any]) -> Optional[AgentBase]:
        """Create an agent instance based on type."""
        try:
            if agent_type == "planner":
                return PlannerAgent(config, agent_id)
            elif agent_type == "refiner":
                return RefinerAgent(config, agent_id)
            elif agent_type == "executor":
                return ExecutorAgent(config, agent_id)
            elif agent_type == "tester":
                return TesterAgent(config, agent_id)
            else:
                self.logger.error(f"Unsupported agent type: {agent_type}")
                return None
        except Exception as e:
            self.logger.error(f"Error creating agent instance: {str(e)}")
            return None
    
    @with_error_recovery
    async def terminate_agent(self, agent_id: str) -> bool:
        """Terminate an agent.
        
        Args:
            agent_id: ID of the agent to terminate
            
        Returns:
            bool: True if termination was successful
            
        Raises:
            ValueError: If agent ID is invalid
        """
        try:
            if agent_id not in self._active_agents:
                raise ValueError(f"Agent {agent_id} not found")
            
            agent_info = self._active_agents[agent_id]
            process = agent_info["process"]
            agent = agent_info["instance"]
            
            # Terminate process
            try:
                process.terminate()
                await asyncio.sleep(1)  # Give process time to terminate
                
                if process.is_running():
                    process.kill()  # Force kill if still running
                
            except Exception as e:
                self.logger.error(f"Error terminating agent {agent_id}: {str(e)}")
                return False
            
            # Clean up agent instance
            try:
                await agent.cleanup()
            except Exception as e:
                self.logger.error(f"Error cleaning up agent {agent_id}: {str(e)}")
            
            # Clean up resources
            self._active_agents.pop(agent_id, None)
            self._agent_resources.pop(agent_id, None)
            self._agent_states.pop(agent_id, None)
            
            # Update spawn history
            if agent_id in self._spawn_history:
                self._spawn_history[agent_id]["end_time"] = datetime.now().isoformat()
                self._spawn_history[agent_id]["status"] = "terminated"
                self._save_spawn_history()
            
            # Log to reflection system
            reflection_system.log_thought(
                "agent_spawner",
                f"Terminated agent {agent_id}",
                {
                    "agent_id": agent_id,
                    "type": agent_info["type"],
                    "duration": (datetime.now() - agent_info["start_time"]).total_seconds()
                }
            )
            
            self.logger.info(f"Terminated agent {agent_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to terminate agent {agent_id}: {str(e)}")
            return False
    
    async def _create_agent_process(self, agent_type: str, config: Dict[str, Any]) -> Optional[asyncio.subprocess.Process]:
        """Create an agent process.
        
        Args:
            agent_type: Type of agent to create
            config: Agent configuration
            
        Returns:
            Optional[asyncio.subprocess.Process]: Created process if successful
        """
        try:
            # Get agent script path
            script_path = self._get_agent_script_path(agent_type)
            if not script_path:
                return None
            
            # Create process
            process = await asyncio.create_subprocess_exec(
                "python",
                str(script_path),
                "--config", json.dumps(config),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            return process
            
        except Exception as e:
            self.logger.error(f"Failed to create agent process: {str(e)}")
            return None
    
    async def _monitor_agent_resources(self, agent_id: str) -> None:
        """Monitor agent resource usage.
        
        Args:
            agent_id: ID of the agent to monitor
        """
        try:
            while agent_id in self._active_agents:
                agent_info = self._active_agents[agent_id]
                process = agent_info["process"]
                
                # Get resource usage
                try:
                    memory_info = process.memory_info()
                    cpu_percent = process.cpu_percent()
                    
                    self._agent_resources[agent_id].update({
                        "memory_usage": memory_info.rss / 1024 / 1024,  # Convert to MB
                        "cpu_usage": cpu_percent,
                        "last_update": datetime.now()
                    })
                    
                    # Check resource limits
                    if (self._agent_resources[agent_id]["memory_usage"] > self._max_memory_per_agent or
                        self._agent_resources[agent_id]["cpu_usage"] > self._max_cpu_per_agent):
                        self.logger.warning(f"Agent {agent_id} exceeding resource limits")
                        await self.terminate_agent(agent_id)
                        break
                    
                except Exception as e:
                    self.logger.error(f"Error monitoring agent {agent_id} resources: {str(e)}")
                
                await asyncio.sleep(1)  # Update every second
                
        except Exception as e:
            self.logger.error(f"Resource monitoring failed for agent {agent_id}: {str(e)}")
    
    def _is_valid_agent_type(self, agent_type: str) -> bool:
        """Check if agent type is valid.
        
        Args:
            agent_type: Type to check
            
        Returns:
            bool: True if type is valid
        """
        return agent_type in agent_config.supported_agent_types
    
    async def _check_resource_availability(self) -> bool:
        """Check if system has sufficient resources.
        
        Returns:
            bool: True if resources are available
        """
        try:
            # Check memory
            memory = psutil.virtual_memory()
            if memory.available < self._max_memory_per_agent * 1024 * 1024:  # Convert to bytes
                return False
            
            # Check CPU
            cpu_percent = psutil.cpu_percent()
            if cpu_percent > (100 - self._max_cpu_per_agent):
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error checking resource availability: {str(e)}")
            return False
    
    def _get_agent_script_path(self, agent_type: str) -> Optional[Path]:
        """Get path to agent script.
        
        Args:
            agent_type: Type of agent
            
        Returns:
            Optional[Path]: Path to script if found
        """
        try:
            script_path = Path(agent_config.agent_scripts_dir) / f"{agent_type}.py"
            return script_path if script_path.exists() else None
        except Exception as e:
            self.logger.error(f"Error getting agent script path: {str(e)}")
            return None
    
    def _record_agent_spawn(self, agent_id: str, agent_type: str, config: Dict[str, Any]) -> None:
        """Record agent spawn in history.
        
        Args:
            agent_id: ID of spawned agent
            agent_type: Type of agent
            config: Agent configuration
        """
        self._spawn_history[agent_id] = {
            "type": agent_type,
            "config": config,
            "start_time": datetime.now().isoformat(),
            "status": "running"
        }
        self._save_spawn_history()
    
    def _load_spawn_history(self) -> None:
        """Load agent spawn history from file."""
        try:
            history_file = Path(agent_config.spawn_history_file)
            if history_file.exists():
                with open(history_file, "r") as f:
                    self._spawn_history = json.load(f)
        except Exception as e:
            self.logger.error(f"Error loading spawn history: {str(e)}")
    
    def _save_spawn_history(self) -> None:
        """Save agent spawn history to file."""
        try:
            history_file = Path(agent_config.spawn_history_file)
            with open(history_file, "w") as f:
                json.dump(self._spawn_history, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving spawn history: {str(e)}")

# Global instance
agent_spawner = AgentSpawner() 