"""
Mediator Agent
Handles task failures, retries, and escalations between agents.
"""

import logging
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

from .task_assignment_manager import TaskAssignmentManager, Task, TaskStatus
from .plugin_types import PluginError
from .agent_base import AgentBase

logger = logging.getLogger(__name__)

class EscalationLevel(Enum):
    """Escalation level for failed tasks"""
    RETRY = "retry"  # Simple retry with same agent
    REASSIGN = "reassign"  # Assign to different agent
    ESCALATE = "escalate"  # Escalate to human or specialized agent
    ABANDON = "abandon"  # Give up on task

@dataclass
class FailureRecord:
    """Record of task failure and retry attempts"""
    task_id: str
    agent_id: str
    failure_time: datetime
    failure_reason: str
    retry_count: int = 0
    last_retry_time: Optional[datetime] = None
    escalation_level: EscalationLevel = EscalationLevel.RETRY
    resolution: Optional[str] = None

class MediatorAgent(AgentBase):
    """Mediates between agents and handles task failures"""
    
    def __init__(
        self,
        task_manager: TaskAssignmentManager,
        max_retries: int = 3,
        retry_delay: timedelta = timedelta(minutes=5),
        escalation_threshold: int = 3
    ):
        agent_id = f"mediator_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        super().__init__(agent_id, "mediator")
        self.task_manager = task_manager
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.escalation_threshold = escalation_threshold
        self.failure_records: Dict[str, FailureRecord] = {}
        self.agent_failures: Dict[str, int] = {}
        
    def handle_task_failure(
        self,
        task_id: str,
        agent_id: str,
        failure_reason: str
    ) -> Dict[str, Any]:
        """
        Handle a task failure and determine next steps
        
        Args:
            task_id: ID of failed task
            agent_id: ID of agent that failed
            failure_reason: Reason for failure
            
        Returns:
            Dictionary with resolution plan
        """
        try:
            self.log_action(
                action="handle_failure",
                result="started",
                goal_id=task_id,
                metadata={
                    "agent_id": agent_id,
                    "reason": failure_reason
                }
            )
            
            # Get or create failure record
            record = self.failure_records.get(task_id)
            if not record:
                record = FailureRecord(
                    task_id=task_id,
                    agent_id=agent_id,
                    failure_time=datetime.now(),
                    failure_reason=failure_reason
                )
                self.failure_records[task_id] = record
            else:
                record.retry_count += 1
                record.last_retry_time = datetime.now()
                
            # Update agent failure count
            self.agent_failures[agent_id] = self.agent_failures.get(agent_id, 0) + 1
            
            # Determine escalation level
            escalation = self._determine_escalation(record)
            record.escalation_level = escalation
            
            # Create resolution plan
            plan = self._create_resolution_plan(record)
            
            self.log_action(
                action="handle_failure",
                result="success",
                goal_id=task_id,
                metadata={
                    "escalation": escalation.value,
                    "plan": plan
                }
            )
            
            return plan
            
        except Exception as e:
            self.log_action(
                action="handle_failure",
                result="failure",
                goal_id=task_id,
                metadata={"error": str(e)}
            )
            raise
            
    def _determine_escalation(self, record: FailureRecord) -> EscalationLevel:
        """Determine appropriate escalation level"""
        try:
            self.log_action(
                action="determine_escalation",
                result="started",
                goal_id=record.task_id,
                metadata={"retry_count": record.retry_count}
            )
            
            # Check retry count
            if record.retry_count >= self.max_retries:
                level = EscalationLevel.ABANDON
                
            # Check agent failure history
            elif self.agent_failures.get(record.agent_id, 0) >= self.escalation_threshold:
                level = EscalationLevel.REASSIGN
                
            # Check if enough time has passed for retry
            elif record.last_retry_time:
                time_since_last = datetime.now() - record.last_retry_time
                if time_since_last < self.retry_delay:
                    level = EscalationLevel.ESCALATE
                else:
                    level = EscalationLevel.RETRY
            else:
                level = EscalationLevel.RETRY
                
            self.log_action(
                action="determine_escalation",
                result="success",
                goal_id=record.task_id,
                metadata={"level": level.value}
            )
            
            return level
            
        except Exception as e:
            self.log_action(
                action="determine_escalation",
                result="failure",
                goal_id=record.task_id,
                metadata={"error": str(e)}
            )
            return EscalationLevel.ESCALATE
            
    def _create_resolution_plan(self, record: FailureRecord) -> Dict[str, Any]:
        """Create a resolution plan based on escalation level"""
        try:
            self.log_action(
                action="create_resolution_plan",
                result="started",
                goal_id=record.task_id,
                metadata={"escalation": record.escalation_level.value}
            )
            
            plan = {
                "task_id": record.task_id,
                "agent_id": record.agent_id,
                "escalation_level": record.escalation_level.value,
                "actions": []
            }
            
            if record.escalation_level == EscalationLevel.RETRY:
                plan["actions"].append({
                    "type": "retry",
                    "agent_id": record.agent_id,
                    "delay": self.retry_delay.total_seconds()
                })
                
            elif record.escalation_level == EscalationLevel.REASSIGN:
                plan["actions"].append({
                    "type": "reassign",
                    "from_agent": record.agent_id,
                    "to_agent": None  # Will be assigned by task manager
                })
                
            elif record.escalation_level == EscalationLevel.ESCALATE:
                plan["actions"].append({
                    "type": "escalate",
                    "level": "human",
                    "reason": record.failure_reason
                })
                
            else:  # ABANDON
                plan["actions"].append({
                    "type": "abandon",
                    "reason": "Max retries exceeded"
                })
                
            self.log_action(
                action="create_resolution_plan",
                result="success",
                goal_id=record.task_id,
                metadata={"plan": plan}
            )
            
            return plan
            
        except Exception as e:
            self.log_action(
                action="create_resolution_plan",
                result="failure",
                goal_id=record.task_id,
                metadata={"error": str(e)}
            )
            raise
            
    def record_resolution(
        self,
        task_id: str,
        resolution: str,
        success: bool
    ) -> None:
        """Record the resolution of a task failure"""
        try:
            self.log_action(
                action="record_resolution",
                result="started",
                goal_id=task_id,
                metadata={
                    "resolution": resolution,
                    "success": success
                }
            )
            
            record = self.failure_records.get(task_id)
            if record:
                record.resolution = resolution
                
            self.log_action(
                action="record_resolution",
                result="success",
                goal_id=task_id
            )
            
        except Exception as e:
            self.log_action(
                action="record_resolution",
                result="failure",
                goal_id=task_id,
                metadata={"error": str(e)}
            )
    
    def get_failure_stats(self) -> Dict[str, Any]:
        """Get statistics about task failures"""
        return {
            "total_failures": len(self.failure_records),
            "agent_failures": self.agent_failures,
            "escalation_counts": {
                level.value: sum(
                    1 for r in self.failure_records.values()
                    if r.escalation_level == level
                )
                for level in EscalationLevel
            }
        } 