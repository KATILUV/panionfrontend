"""
Role Manager
Defines and manages agent roles, their capabilities, and configurations.
"""

import logging
from typing import Dict, List, Optional, Set
from dataclasses import dataclass
from enum import Enum

from .plugin_types import GoalType, PluginError

logger = logging.getLogger(__name__)

class RoleType(Enum):
    """Standard agent roles"""
    PLANNER = "planner"
    EXECUTOR = "executor"
    REFINER = "refiner"
    TESTER = "tester"
    SUPERVISOR = "supervisor"

@dataclass
class RoleConfig:
    """Configuration for an agent role"""
    role_type: RoleType
    max_retries: int
    allowed_goal_types: Set[GoalType]
    allowed_plugins: Set[str]
    required_capabilities: Set[str]
    priority: int
    can_spawn_agents: bool
    can_modify_goals: bool
    can_override_plugins: bool

class RoleManager:
    """Manages agent roles and their configurations"""
    
    def __init__(self):
        self._role_configs = self._initialize_role_configs()
        
    def get_role_config(self, role: str) -> RoleConfig:
        """
        Get configuration for a specific role
        
        Args:
            role: Role identifier
            
        Returns:
            RoleConfig object with role settings
            
        Raises:
            PluginError: If role is not found
        """
        try:
            role_type = RoleType(role.lower())
            return self._role_configs[role_type]
        except (ValueError, KeyError) as e:
            raise PluginError(f"Invalid role: {role}")
            
    def get_allowed_goal_types(self, role: str) -> Set[GoalType]:
        """Get goal types allowed for a role"""
        return self.get_role_config(role).allowed_goal_types
        
    def get_allowed_plugins(self, role: str) -> Set[str]:
        """Get plugins allowed for a role"""
        return self.get_role_config(role).allowed_plugins
        
    def can_handle_goal_type(self, role: str, goal_type: GoalType) -> bool:
        """Check if role can handle a specific goal type"""
        return goal_type in self.get_allowed_goal_types(role)
        
    def can_use_plugin(self, role: str, plugin_id: str) -> bool:
        """Check if role can use a specific plugin"""
        return plugin_id in self.get_allowed_plugins(role)
        
    def _initialize_role_configs(self) -> Dict[RoleType, RoleConfig]:
        """Initialize standard role configurations"""
        return {
            RoleType.PLANNER: RoleConfig(
                role_type=RoleType.PLANNER,
                max_retries=3,
                allowed_goal_types={
                    GoalType.PLUGIN_CREATION,
                    GoalType.PLUGIN_TESTING,
                    GoalType.PLUGIN_UPDATE
                },
                allowed_plugins={"goal_processor", "goal_decomposer"},
                required_capabilities={"planning", "decomposition"},
                priority=1,
                can_spawn_agents=True,
                can_modify_goals=True,
                can_override_plugins=False
            ),
            
            RoleType.EXECUTOR: RoleConfig(
                role_type=RoleType.EXECUTOR,
                max_retries=5,
                allowed_goal_types={
                    GoalType.PLUGIN_CREATION,
                    GoalType.PLUGIN_TESTING,
                    GoalType.PLUGIN_UPDATE
                },
                allowed_plugins={"plugin_manager", "file_editor"},
                required_capabilities={"execution", "plugin_management"},
                priority=2,
                can_spawn_agents=False,
                can_modify_goals=False,
                can_override_plugins=False
            ),
            
            RoleType.REFINER: RoleConfig(
                role_type=RoleType.REFINER,
                max_retries=3,
                allowed_goal_types={GoalType.PLUGIN_CREATION},
                allowed_plugins={"plugin_synthesis", "file_editor"},
                required_capabilities={"refinement", "code_analysis"},
                priority=2,
                can_spawn_agents=False,
                can_modify_goals=True,
                can_override_plugins=True
            ),
            
            RoleType.TESTER: RoleConfig(
                role_type=RoleType.TESTER,
                max_retries=3,
                allowed_goal_types={GoalType.PLUGIN_TESTING},
                allowed_plugins={"plugin_tester", "failure_analyzer"},
                required_capabilities={"testing", "analysis"},
                priority=2,
                can_spawn_agents=False,
                can_modify_goals=False,
                can_override_plugins=False
            ),
            
            RoleType.SUPERVISOR: RoleConfig(
                role_type=RoleType.SUPERVISOR,
                max_retries=0,  # No retries needed for supervisor
                allowed_goal_types=set(GoalType),  # Can handle all goal types
                allowed_plugins=set(),  # No direct plugin usage
                required_capabilities={"supervision", "coordination"},
                priority=0,  # Highest priority
                can_spawn_agents=True,
                can_modify_goals=True,
                can_override_plugins=True
            )
        } 