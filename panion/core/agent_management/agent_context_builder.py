"""
Agent Context Builder
Gathers and structures context information for LLM prompts.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from .plugin_types import Memory, MemoryType
from .goal_scheduler import GoalScheduler
from .plugin_manager import PluginManager

logger = logging.getLogger(__name__)

class AgentContextBuilder:
    """Builds rich context for agent operations by gathering relevant information"""
    
    def __init__(
        self,
        goal_scheduler: GoalScheduler,
        plugin_manager: PluginManager,
        max_memories: int = 10,
        max_reflections: int = 5,
        memory_time_window: timedelta = timedelta(days=7)
    ):
        self.goal_scheduler = goal_scheduler
        self.plugin_manager = plugin_manager
        self.max_memories = max_memories
        self.max_reflections = max_reflections
        self.memory_time_window = memory_time_window
        
        # Initialize paths
        self.test_logs_dir = Path("data/plugin_test_logs")
        self.reflection_dir = Path("data/reflection_archives")
        
    def get_context(self, goal_id: str) -> Dict[str, Any]:
        """
        Build comprehensive context for a goal
        
        Args:
            goal_id: ID of the goal to build context for
            
        Returns:
            Dictionary containing structured context information
        """
        logger.info(f"Building context for goal {goal_id}")
        
        # Get goal details
        goal = self.goal_scheduler.get_goal(goal_id)
        if not goal:
            logger.warning(f"Goal {goal_id} not found")
            return {}
            
        context = {
            "goal": {
                "id": goal_id,
                "description": goal.description,
                "type": goal.type,
                "status": goal.status,
                "created_at": goal.created_at.isoformat(),
            },
            "subgoals": self._get_subgoal_context(goal_id),
            "memories": self._get_relevant_memories(goal_id),
            "test_logs": self._get_test_logs(goal_id),
            "reflections": self._get_relevant_reflections(goal_id),
            "plugins": self._get_plugin_context(goal_id),
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "context_version": "1.0"
            }
        }
        
        return context
    
    def _get_subgoal_context(self, goal_id: str) -> List[Dict[str, Any]]:
        """Gather context about subgoals"""
        subgoals = self.goal_scheduler.get_subgoals(goal_id)
        
        return [{
            "id": subgoal.id,
            "description": subgoal.description,
            "type": subgoal.type,
            "status": subgoal.status,
            "dependencies": subgoal.dependencies,
            "config": subgoal.config
        } for subgoal in subgoals]
    
    def _get_relevant_memories(self, goal_id: str) -> List[Dict[str, Any]]:
        """Get relevant memory entries"""
        cutoff_time = datetime.now() - self.memory_time_window
        
        # Query memories related to goal
        memories = self.plugin_manager.memory_manager.query_memories(
            type=MemoryType.EXECUTION_RESULT,
            metadata={"goal_id": goal_id},
            after=cutoff_time,
            limit=self.max_memories
        )
        
        return [{
            "id": memory.id,
            "type": memory.type.value,
            "content": json.loads(memory.content),
            "created_at": memory.created_at.isoformat(),
            "metadata": memory.metadata
        } for memory in memories]
    
    def _get_test_logs(self, goal_id: str) -> Dict[str, Any]:
        """Get relevant plugin test logs"""
        test_logs = {}
        
        # Get plugins used in goal
        plugins = self._get_goal_plugins(goal_id)
        
        for plugin_id in plugins:
            log_file = self.test_logs_dir / f"{plugin_id}.json"
            if log_file.exists():
                with open(log_file, 'r') as f:
                    test_logs[plugin_id] = json.load(f)
                    
        return test_logs
    
    def _get_relevant_reflections(self, goal_id: str) -> List[Dict[str, Any]]:
        """Get relevant reflection entries"""
        reflections = []
        reflection_file = self.reflection_dir / f"{goal_id}_reflections.json"
        
        if reflection_file.exists():
            with open(reflection_file, 'r') as f:
                all_reflections = json.load(f)
                # Get most recent reflections up to max_reflections
                reflections = sorted(
                    all_reflections,
                    key=lambda x: x.get('timestamp', ''),
                    reverse=True
                )[:self.max_reflections]
                
        return reflections
    
    def _get_plugin_context(self, goal_id: str) -> Dict[str, Any]:
        """Get context about relevant plugins"""
        plugins = {}
        
        # Get plugins used in goal
        plugin_ids = self._get_goal_plugins(goal_id)
        
        for plugin_id in plugin_ids:
            plugin = self.plugin_manager.get_plugin(plugin_id)
            if plugin:
                plugins[plugin_id] = {
                    "name": plugin.metadata.name,
                    "version": plugin.metadata.version,
                    "description": plugin.metadata.description,
                    "capabilities": plugin.metadata.tags,
                    "health": plugin.metadata.score.to_dict()
                }
                
        return plugins
    
    def _get_goal_plugins(self, goal_id: str) -> List[str]:
        """Get list of plugin IDs used in a goal"""
        plugins = set()
        
        # Get plugins from subgoals
        subgoals = self.goal_scheduler.get_subgoals(goal_id)
        for subgoal in subgoals:
            if plugin := self.plugin_manager.get_plugin_for_task(
                task_type=subgoal.type,
                config=subgoal.config
            ):
                plugins.add(plugin.metadata.name)
                
        return list(plugins)
    
    def format_for_prompt(self, context: Dict[str, Any]) -> str:
        """
        Format context dictionary into a string suitable for LLM prompts
        
        Args:
            context: Context dictionary from get_context()
            
        Returns:
            Formatted string for LLM consumption
        """
        prompt_parts = [
            f"Goal: {context['goal']['description']}",
            f"Type: {context['goal']['type']}",
            f"Status: {context['goal']['status']}\n"
        ]
        
        # Add subgoals
        prompt_parts.append("Subgoals:")
        for subgoal in context['subgoals']:
            prompt_parts.append(
                f"- {subgoal['description']} ({subgoal['status']})"
            )
        prompt_parts.append("")
        
        # Add relevant memories
        if context['memories']:
            prompt_parts.append("Recent Execution History:")
            for memory in context['memories']:
                content = memory['content']
                prompt_parts.append(
                    f"- {content['status']}: {content.get('output', 'No output')}"
                )
            prompt_parts.append("")
            
        # Add relevant reflections
        if context['reflections']:
            prompt_parts.append("Recent Insights:")
            for reflection in context['reflections']:
                prompt_parts.append(f"- {reflection.get('content', '')}")
            prompt_parts.append("")
            
        # Add plugin health
        prompt_parts.append("Plugin Health:")
        for plugin_id, plugin in context['plugins'].items():
            health = plugin['health']
            prompt_parts.append(
                f"- {plugin_id}: {health['status']} "
                f"({health['pass_rate']}% pass rate)"
            )
            
        return "\n".join(prompt_parts) 