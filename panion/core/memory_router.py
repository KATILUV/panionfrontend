"""
Memory Router
Aggregates and routes context from various memory systems to agents.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from pathlib import Path
import json
from core.reflection import reflection_system
from core.memory import memory_system
from core.logging_config import get_logger, LogTimer

class MemoryRouter:
    """Routes and aggregates context from various memory systems."""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        self.test_logs_dir = Path("data/plugin_test_logs")
        self.context_window = timedelta(days=7)  # Default context window
        
    async def get_agent_context(self, goal_id: str) -> Dict[str, Any]:
        """Get aggregated context for an agent based on goal_id.
        
        Args:
            goal_id: The ID of the goal to get context for
            
        Returns:
            Dict containing:
            - reflections: List of relevant reflections
            - memory_entries: List of relevant memory entries
            - test_logs: List of relevant test logs
            - metadata: Context metadata (timestamps, counts, etc.)
        """
        with LogTimer(self.logger, 'get_agent_context', goal_id=goal_id):
            try:
                # Get reflections
                reflections = await self._get_reflections(goal_id)
                
                # Get memory entries
                memory_entries = await self._get_memory_entries(goal_id)
                
                # Get test logs
                test_logs = await self._get_test_logs(goal_id)
                
                # Aggregate context
                context = {
                    "reflections": reflections,
                    "memory_entries": memory_entries,
                    "test_logs": test_logs,
                    "metadata": {
                        "goal_id": goal_id,
                        "timestamp": datetime.now().isoformat(),
                        "reflection_count": len(reflections),
                        "memory_entry_count": len(memory_entries),
                        "test_log_count": len(test_logs),
                        "context_window_days": self.context_window.days
                    }
                }
                
                self.logger.info(
                    f"Retrieved context for goal: {goal_id}",
                    extra={
                        "operation": "get_context",
                        "goal_id": goal_id,
                        "reflection_count": len(reflections),
                        "memory_entry_count": len(memory_entries),
                        "test_log_count": len(test_logs)
                    }
                )
                
                return context
                
            except Exception as e:
                self.logger.error(
                    f"Error getting agent context: {e}",
                    extra={
                        "operation": "get_context_error",
                        "goal_id": goal_id,
                        "error": str(e)
                    }
                )
                return {
                    "error": str(e),
                    "metadata": {
                        "goal_id": goal_id,
                        "timestamp": datetime.now().isoformat(),
                        "error": True
                    }
                }
    
    async def _get_reflections(self, goal_id: str) -> List[Dict[str, Any]]:
        """Get reflections related to the goal."""
        try:
            # Get reflections from reflection system
            reflections = await reflection_system.get_reflections(
                goal_id=goal_id,
                start_time=datetime.now() - self.context_window
            )
            
            # Format reflections
            formatted_reflections = []
            for reflection in reflections:
                formatted_reflections.append({
                    "id": reflection.get("id"),
                    "timestamp": reflection.get("timestamp"),
                    "thought": reflection.get("thought"),
                    "metadata": reflection.get("metadata", {}),
                    "type": "reflection"
                })
            
            return formatted_reflections
            
        except Exception as e:
            self.logger.error(f"Error getting reflections: {e}")
            return []
    
    async def _get_memory_entries(self, goal_id: str) -> List[Dict[str, Any]]:
        """Get memory entries related to the goal."""
        try:
            # Get memory entries from memory system
            entries = await memory_system.get_entries(
                goal_id=goal_id,
                start_time=datetime.now() - self.context_window
            )
            
            # Format memory entries
            formatted_entries = []
            for entry in entries:
                formatted_entries.append({
                    "id": entry.get("id"),
                    "timestamp": entry.get("timestamp"),
                    "content": entry.get("content"),
                    "type": entry.get("type"),
                    "metadata": entry.get("metadata", {}),
                    "type": "memory"
                })
            
            return formatted_entries
            
        except Exception as e:
            self.logger.error(f"Error getting memory entries: {e}")
            return []
    
    async def _get_test_logs(self, goal_id: str) -> List[Dict[str, Any]]:
        """Get test logs related to the goal."""
        try:
            test_logs = []
            
            # Get all test log files
            for log_file in self.test_logs_dir.glob("*.json"):
                try:
                    with open(log_file, 'r') as f:
                        logs = json.load(f)
                        
                        # Filter logs by goal_id and time window
                        relevant_logs = [
                            log for log in logs
                            if self._is_log_relevant(log, goal_id)
                        ]
                        
                        if relevant_logs:
                            test_logs.extend(relevant_logs)
                            
                except Exception as e:
                    self.logger.warning(
                        f"Error reading test log file {log_file}: {e}"
                    )
                    continue
            
            # Format test logs
            formatted_logs = []
            for log in test_logs:
                formatted_logs.append({
                    "id": log.get("test_id"),
                    "timestamp": log.get("timestamp"),
                    "status": log.get("status"),
                    "output": log.get("output"),
                    "error": log.get("error"),
                    "duration": log.get("duration"),
                    "type": "test_log"
                })
            
            return formatted_logs
            
        except Exception as e:
            self.logger.error(f"Error getting test logs: {e}")
            return []
    
    def _is_log_relevant(self, log: Dict[str, Any], goal_id: str) -> bool:
        """Check if a test log is relevant to the goal."""
        try:
            # Check timestamp
            log_time = datetime.fromisoformat(log.get("timestamp", ""))
            if log_time < datetime.now() - self.context_window:
                return False
            
            # Check if log is related to goal
            test_id = log.get("test_id", "")
            return goal_id in test_id
            
        except Exception:
            return False
    
    def set_context_window(self, days: int) -> None:
        """Set the context window in days."""
        self.context_window = timedelta(days=days)

# Create singleton instance
memory_router = MemoryRouter() 