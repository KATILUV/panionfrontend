"""
Planner Agent Implementation
Handles goal planning and decomposition.
"""

import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime
import asyncio
import json
from pathlib import Path

from ..agent_base import AgentBase, AgentLogEntry
from ..role_manager import RoleManager
from ..task_assignment_manager import TaskAssignmentManager
from ..agent_context_builder import AgentContextBuilder
from ...plugin.base import BasePlugin
from ...plugin.manager import plugin_manager
from ...panion_memory import memory_manager, MemoryCategory
from ...error_handling import error_handler, with_error_recovery
from ...shared_state import shared_state, ComponentState
from ...panion_errors import PluginError, ErrorSeverity

from core.reflection import reflection_system
from core.memory_system import memory_system
from core.meta_agent import meta_agent
from core.goal_decomposer import goal_decomposer
from core.goal_scheduler import GoalScheduler

class PlannerAgent(AgentBase):
    """Agent responsible for planning and decomposing goals."""
    
    def __init__(self, config: Dict[str, Any], goal_id: str):
        agent_id = f"planner_{goal_id}"
        super().__init__(agent_id, "planner")
        self.goal_id = goal_id
        self.config = config
        self.memory_limit = config.get('memory_limit', 1000)
        self.retry_cap = config.get('retry_cap', 3)
        self.timeout = config.get('timeout', 300)
        self.capabilities = config.get('capabilities', [])
        self.metadata = config.get('metadata', {})
        self.created_at = datetime.now()
        self.scheduler = GoalScheduler()
        
    async def initialize(self) -> None:
        """Initialize the planner agent."""
        try:
            self.log_action(
                action="initialize",
                result="started",
                goal_id=self.goal_id,
                metadata={"capabilities": self.capabilities}
            )
            
            # Add initialization logic here
            
            self.log_action(
                action="initialize",
                result="success",
                goal_id=self.goal_id
            )
            
        except Exception as e:
            self.log_action(
                action="initialize",
                result="failure",
                goal_id=self.goal_id,
                metadata={"error": str(e)}
            )
            raise
            
    async def plan_goal(self) -> Dict[str, Any]:
        """Create a plan for the goal."""
        try:
            self.log_action(
                action="plan_goal",
                result="started",
                goal_id=self.goal_id
            )
            
            # Get goal plan
            plan = goal_decomposer.get_plan(self.goal_id)
            if not plan:
                raise ValueError(f"Plan not found for goal: {self.goal_id}")
                
            # Log success
            self.log_action(
                action="plan_goal",
                result="success",
                goal_id=self.goal_id,
                metadata={"plan": plan}
            )
            
            return plan
            
        except Exception as e:
            self.log_action(
                action="plan_goal",
                result="failure",
                goal_id=self.goal_id,
                metadata={"error": str(e)}
            )
            raise

    async def run(self, goal_id: str) -> Dict[str, Any]:
        """Run the planning process for a goal.
        
        Args:
            goal_id: ID of the goal to plan for
            
        Returns:
            Dictionary containing planning results
        """
        try:
            self.log_action(
                action="run",
                result="started",
                goal_id=goal_id
            )
            
            # Log start to reflection system
            reflection_system.log_thought(
                "planner_agent",
                f"Starting planning for goal {goal_id}",
                {
                    "goal_id": goal_id,
                    "agent_id": self.id,
                    "capabilities": self.capabilities
                }
            )
            
            # Track action start
            start_time = datetime.now()
            
            # Get goal decomposition
            decomposition = await goal_decomposer.decompose_goal(
                description=f"Plan for goal {goal_id}",
                parent_id=goal_id
            )
            
            # Calculate planning confidence
            confidence = self._calculate_planning_confidence(decomposition)
            
            # Schedule the decomposed tasks
            schedule = await self.scheduler.schedule_goal(
                goal_id=goal_id,
                priority=self.metadata.get('priority', 0.5),
                deadline=None  # Let scheduler determine deadline
            )
            
            # Track action completion
            duration = (datetime.now() - start_time).total_seconds()
            meta_agent.track_action(
                agent_id=self.id,
                action_type="plan_goal",
                input_data={"goal_id": goal_id},
                output_data={
                    "decomposition": decomposition,
                    "schedule": schedule,
                    "confidence": confidence
                },
                duration=duration,
                success=True,
                metadata={
                    "goal_id": goal_id,
                    "confidence": confidence
                }
            )
            
            # Store in memory system
            memory_system.add_memory(
                content={
                    "goal_id": goal_id,
                    "decomposition": decomposition,
                    "schedule": schedule,
                    "confidence": confidence
                },
                importance=0.8,
                context={
                    "goal_id": goal_id,
                    "agent_id": self.id
                },
                metadata={
                    "duration": duration,
                    "timestamp": datetime.now().isoformat()
                }
            )
            
            # Log success to reflection system
            reflection_system.log_thought(
                "planner_agent",
                f"Successfully planned goal {goal_id}",
                {
                    "goal_id": goal_id,
                    "confidence": confidence,
                    "decomposition": decomposition,
                    "schedule": schedule
                }
            )
            
            self.log_action(
                action="run",
                result="success",
                goal_id=goal_id,
                metadata={
                    "duration": duration,
                    "confidence": confidence
                }
            )
            
            return {
                "success": True,
                "goal_id": goal_id,
                "decomposition": decomposition,
                "schedule": schedule,
                "confidence": confidence,
                "duration": duration
            }
            
        except Exception as e:
            self.log_action(
                action="run",
                result="failure",
                goal_id=goal_id,
                metadata={"error": str(e)}
            )
            
            # Track failure
            duration = (datetime.now() - start_time).total_seconds()
            meta_agent.track_action(
                agent_id=self.id,
                action_type="plan_goal",
                input_data={"goal_id": goal_id},
                output_data={"error": str(e)},
                duration=duration,
                success=False,
                metadata={
                    "goal_id": goal_id,
                    "error": str(e)
                }
            )
            
            # Log failure to reflection system
            reflection_system.log_thought(
                "planner_agent",
                f"Failed to plan goal {goal_id}",
                {
                    "goal_id": goal_id,
                    "error": str(e),
                    "duration": duration
                }
            )
            
            return {
                "success": False,
                "goal_id": goal_id,
                "error": str(e),
                "duration": duration
            }
            
    def _calculate_planning_confidence(self, decomposition: Dict[str, Any]) -> float:
        """Calculate confidence score for the planning result.
        
        Args:
            decomposition: Goal decomposition result
            
        Returns:
            Confidence score between 0 and 1
        """
        try:
            # Base confidence
            confidence = 0.5
            
            # Adjust based on decomposition quality
            if decomposition.get('subtasks'):
                confidence += 0.2
                
            if decomposition.get('dependencies'):
                confidence += 0.1
                
            if decomposition.get('resources'):
                confidence += 0.1
                
            if decomposition.get('success_criteria'):
                confidence += 0.1
                
            # Cap at 1.0
            return min(confidence, 1.0)
            
        except Exception as e:
            self.log_action(
                action="calculate_confidence",
                result="failure",
                goal_id=self.goal_id,
                metadata={"error": str(e)}
            )
            return 0.0 