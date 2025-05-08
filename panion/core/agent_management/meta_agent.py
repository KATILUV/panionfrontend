"""
Meta-Agent Monitor
Supervises and analyzes agent actions, detecting anomalies and patterns.
"""

import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass
from datetime import datetime, timedelta
import threading
from collections import defaultdict
import numpy as np
from core.logging_config import get_logger, LogTimer
from core.memory_system import memory_system

@dataclass
class AgentAction:
    """Represents an action taken by an agent."""
    id: str
    agent_id: str
    action_type: str
    timestamp: datetime
    input: Dict[str, Any]
    output: Dict[str, Any]
    duration: float
    success: bool
    error: Optional[str]
    metadata: Dict[str, Any]

@dataclass
class Anomaly:
    """Represents a detected anomaly in agent behavior."""
    id: str
    agent_id: str
    action_id: str
    timestamp: datetime
    anomaly_type: str
    severity: float  # 0.0 to 1.0
    description: str
    context: Dict[str, Any]
    resolved: bool
    resolution: Optional[str]

class MetaAgentMonitor:
    def __init__(
        self,
        data_dir: str = "data/meta_agent",
        anomaly_threshold: float = 0.8,
        review_interval: int = 300  # 5 minutes
    ):
        """Initialize meta-agent monitor.
        
        Args:
            data_dir: Directory for storing monitor data
            anomaly_threshold: Threshold for anomaly detection (0.0 to 1.0)
            review_interval: Interval between reviews in seconds
        """
        self.logger = get_logger(__name__)
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Configuration
        self.anomaly_threshold = anomaly_threshold
        self.review_interval = review_interval
        
        # Storage
        self._actions: Dict[str, AgentAction] = {}
        self._anomalies: Dict[str, Anomaly] = {}
        self._agent_stats: Dict[str, Dict[str, Any]] = defaultdict(dict)
        
        # Load existing data
        self._load_data()
        
        # Start review thread
        self._review_thread = threading.Thread(target=self._review_loop)
        self._review_thread.daemon = True
        self._review_thread.start()
        
    def _load_data(self):
        """Load monitor data from disk."""
        try:
            # Load actions
            actions_file = self.data_dir / "actions.json"
            if actions_file.exists():
                with open(actions_file) as f:
                    data = json.load(f)
                    for action_id, action_data in data.items():
                        action = AgentAction(
                            id=action_id,
                            agent_id=action_data["agent_id"],
                            action_type=action_data["action_type"],
                            timestamp=datetime.fromisoformat(action_data["timestamp"]),
                            input=action_data["input"],
                            output=action_data["output"],
                            duration=action_data["duration"],
                            success=action_data["success"],
                            error=action_data.get("error"),
                            metadata=action_data.get("metadata", {})
                        )
                        self._actions[action_id] = action
                        
            # Load anomalies
            anomalies_file = self.data_dir / "anomalies.json"
            if anomalies_file.exists():
                with open(anomalies_file) as f:
                    data = json.load(f)
                    for anomaly_id, anomaly_data in data.items():
                        anomaly = Anomaly(
                            id=anomaly_id,
                            agent_id=anomaly_data["agent_id"],
                            action_id=anomaly_data["action_id"],
                            timestamp=datetime.fromisoformat(anomaly_data["timestamp"]),
                            anomaly_type=anomaly_data["anomaly_type"],
                            severity=anomaly_data["severity"],
                            description=anomaly_data["description"],
                            context=anomaly_data["context"],
                            resolved=anomaly_data["resolved"],
                            resolution=anomaly_data.get("resolution")
                        )
                        self._anomalies[anomaly_id] = anomaly
                        
            self.logger.info(f"Loaded {len(self._actions)} actions and {len(self._anomalies)} anomalies")
            
        except Exception as e:
            self.logger.error(f"Error loading monitor data: {e}")
            
    def _save_data(self):
        """Save monitor data to disk."""
        try:
            # Save actions
            actions_file = self.data_dir / "actions.json"
            with open(actions_file, "w") as f:
                json.dump({
                    action_id: {
                        "agent_id": action.agent_id,
                        "action_type": action.action_type,
                        "timestamp": action.timestamp.isoformat(),
                        "input": action.input,
                        "output": action.output,
                        "duration": action.duration,
                        "success": action.success,
                        "error": action.error,
                        "metadata": action.metadata
                    }
                    for action_id, action in self._actions.items()
                }, f, indent=2)
                
            # Save anomalies
            anomalies_file = self.data_dir / "anomalies.json"
            with open(anomalies_file, "w") as f:
                json.dump({
                    anomaly_id: {
                        "agent_id": anomaly.agent_id,
                        "action_id": anomaly.action_id,
                        "timestamp": anomaly.timestamp.isoformat(),
                        "anomaly_type": anomaly.anomaly_type,
                        "severity": anomaly.severity,
                        "description": anomaly.description,
                        "context": anomaly.context,
                        "resolved": anomaly.resolved,
                        "resolution": anomaly.resolution
                    }
                    for anomaly_id, anomaly in self._anomalies.items()
                }, f, indent=2)
                
            self.logger.info("Saved monitor data to disk")
            
        except Exception as e:
            self.logger.error(f"Error saving monitor data: {e}")
            
    def track_action(
        self,
        agent_id: str,
        action_type: str,
        input_data: Dict[str, Any],
        output_data: Dict[str, Any],
        duration: float,
        success: bool,
        error: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Track an agent action.
        
        Args:
            agent_id: ID of the agent
            action_type: Type of action
            input_data: Input data
            output_data: Output data
            duration: Duration in seconds
            success: Whether action succeeded
            error: Optional error message
            metadata: Optional additional metadata
            
        Returns:
            Action ID
        """
        with LogTimer(self.logger, "track_action"):
            # Generate action ID
            action_id = f"act_{int(time.time())}_{hash(str(input_data))}"
            
            # Create action
            action = AgentAction(
                id=action_id,
                agent_id=agent_id,
                action_type=action_type,
                timestamp=datetime.now(),
                input=input_data,
                output=output_data,
                duration=duration,
                success=success,
                error=error,
                metadata=metadata or {}
            )
            
            # Store action
            self._actions[action_id] = action
            
            # Update agent stats
            self._update_agent_stats(agent_id, action)
            
            # Save to disk
            self._save_data()
            
            # Store in memory system
            memory_system.add_memory(
                content={
                    "action_id": action_id,
                    "agent_id": agent_id,
                    "action_type": action_type,
                    "success": success,
                    "error": error
                },
                importance=0.7 if not success else 0.3,
                context={
                    "agent_id": agent_id,
                    "action_type": action_type
                },
                metadata={
                    "duration": duration,
                    "timestamp": action.timestamp.isoformat()
                }
            )
            
            return action_id
            
    def _update_agent_stats(self, agent_id: str, action: AgentAction):
        """Update agent statistics.
        
        Args:
            agent_id: ID of the agent
            action: Action to update stats with
        """
        stats = self._agent_stats[agent_id]
        
        # Initialize if needed
        if "action_count" not in stats:
            stats.update({
                "action_count": 0,
                "success_count": 0,
                "error_count": 0,
                "total_duration": 0.0,
                "action_types": defaultdict(int),
                "last_action": None,
                "error_rate": 0.0,
                "avg_duration": 0.0
            })
            
        # Update stats
        stats["action_count"] += 1
        if action.success:
            stats["success_count"] += 1
        else:
            stats["error_count"] += 1
        stats["total_duration"] += action.duration
        stats["action_types"][action.action_type] += 1
        stats["last_action"] = action.timestamp
        
        # Calculate derived stats
        stats["error_rate"] = stats["error_count"] / stats["action_count"]
        stats["avg_duration"] = stats["total_duration"] / stats["action_count"]
        
    def _review_loop(self):
        """Background thread for reviewing agent actions."""
        while True:
            try:
                self._review_actions()
                time.sleep(self.review_interval)
            except Exception as e:
                self.logger.error(f"Error in review loop: {e}")
                
    def _review_actions(self):
        """Review recent agent actions for anomalies."""
        now = datetime.now()
        recent_actions = [
            action for action in self._actions.values()
            if (now - action.timestamp) < timedelta(hours=1)
        ]
        
        for action in recent_actions:
            # Check for anomalies
            anomalies = self._detect_anomalies(action)
            
            # Record anomalies
            for anomaly in anomalies:
                self._record_anomaly(anomaly)
                
    def _detect_anomalies(self, action: AgentAction) -> List[Anomaly]:
        """Detect anomalies in an action.
        
        Args:
            action: Action to analyze
            
        Returns:
            List of detected anomalies
        """
        anomalies = []
        stats = self._agent_stats[action.agent_id]
        
        # Check error rate
        if stats["error_rate"] > 0.5:  # More than 50% errors
            anomalies.append(Anomaly(
                id=f"ano_{int(time.time())}_{hash(str(action.id))}",
                agent_id=action.agent_id,
                action_id=action.id,
                timestamp=datetime.now(),
                anomaly_type="high_error_rate",
                severity=stats["error_rate"],
                description=f"Agent has high error rate: {stats['error_rate']:.2%}",
                context={
                    "error_count": stats["error_count"],
                    "total_actions": stats["action_count"]
                },
                resolved=False,
                resolution=None
            ))
            
        # Check duration
        avg_duration = stats["avg_duration"]
        if action.duration > avg_duration * 3:  # 3x average
            anomalies.append(Anomaly(
                id=f"ano_{int(time.time())}_{hash(str(action.id))}_duration",
                agent_id=action.agent_id,
                action_id=action.id,
                timestamp=datetime.now(),
                anomaly_type="long_duration",
                severity=min(1.0, action.duration / (avg_duration * 5)),
                description=f"Action duration {action.duration:.2f}s is much longer than average {avg_duration:.2f}s",
                context={
                    "duration": action.duration,
                    "avg_duration": avg_duration
                },
                resolved=False,
                resolution=None
            ))
            
        # Check action type frequency
        action_type_count = stats["action_types"][action.action_type]
        total_actions = stats["action_count"]
        if action_type_count / total_actions > 0.8:  # More than 80% of actions
            anomalies.append(Anomaly(
                id=f"ano_{int(time.time())}_{hash(str(action.id))}_frequency",
                agent_id=action.agent_id,
                action_id=action.id,
                timestamp=datetime.now(),
                anomaly_type="high_frequency",
                severity=action_type_count / total_actions,
                description=f"Action type {action.action_type} is used too frequently: {action_type_count/total_actions:.2%}",
                context={
                    "action_type": action.action_type,
                    "count": action_type_count,
                    "total": total_actions
                },
                resolved=False,
                resolution=None
            ))
            
        return anomalies
        
    def _record_anomaly(self, anomaly: Anomaly):
        """Record a detected anomaly.
        
        Args:
            anomaly: Anomaly to record
        """
        # Store anomaly
        self._anomalies[anomaly.id] = anomaly
        
        # Save to disk
        self._save_data()
        
        # Store in memory system
        memory_system.add_memory(
            content={
                "anomaly_id": anomaly.id,
                "agent_id": anomaly.agent_id,
                "action_id": anomaly.action_id,
                "anomaly_type": anomaly.anomaly_type,
                "severity": anomaly.severity,
                "description": anomaly.description
            },
            importance=anomaly.severity,
            context={
                "agent_id": anomaly.agent_id,
                "anomaly_type": anomaly.anomaly_type
            },
            metadata={
                "timestamp": anomaly.timestamp.isoformat(),
                "resolved": anomaly.resolved
            }
        )
        
        # Log anomaly
        self.logger.warning(
            f"Detected anomaly: {anomaly.description}",
            extra={
                "anomaly_id": anomaly.id,
                "agent_id": anomaly.agent_id,
                "action_id": anomaly.action_id,
                "anomaly_type": anomaly.anomaly_type,
                "severity": anomaly.severity
            }
        )
        
    def resolve_anomaly(self, anomaly_id: str, resolution: str):
        """Resolve an anomaly.
        
        Args:
            anomaly_id: ID of the anomaly
            resolution: Resolution description
        """
        if anomaly_id in self._anomalies:
            anomaly = self._anomalies[anomaly_id]
            anomaly.resolved = True
            anomaly.resolution = resolution
            
            # Save to disk
            self._save_data()
            
            # Update memory
            memory_system.add_memory(
                content={
                    "anomaly_id": anomaly_id,
                    "resolution": resolution
                },
                importance=0.5,
                context={
                    "agent_id": anomaly.agent_id,
                    "anomaly_type": anomaly.anomaly_type
                },
                metadata={
                    "timestamp": datetime.now().isoformat(),
                    "resolved": True
                }
            )
            
            self.logger.info(
                f"Resolved anomaly: {anomaly.description}",
                extra={
                    "anomaly_id": anomaly_id,
                    "resolution": resolution
                }
            )
            
    def get_agent_stats(self, agent_id: str) -> Dict[str, Any]:
        """Get statistics for an agent.
        
        Args:
            agent_id: ID of the agent
            
        Returns:
            Dictionary of agent statistics
        """
        return dict(self._agent_stats.get(agent_id, {}))
        
    def get_anomalies(
        self,
        agent_id: Optional[str] = None,
        anomaly_type: Optional[str] = None,
        resolved: Optional[bool] = None,
        min_severity: float = 0.0
    ) -> List[Anomaly]:
        """Get anomalies matching criteria.
        
        Args:
            agent_id: Optional agent ID to filter by
            anomaly_type: Optional anomaly type to filter by
            resolved: Optional resolved status to filter by
            min_severity: Minimum severity score
            
        Returns:
            List of matching anomalies
        """
        return [
            anomaly for anomaly in self._anomalies.values()
            if (agent_id is None or anomaly.agent_id == agent_id) and
               (anomaly_type is None or anomaly.anomaly_type == anomaly_type) and
               (resolved is None or anomaly.resolved == resolved) and
               anomaly.severity >= min_severity
        ]

# Create singleton instance
meta_agent = MetaAgentMonitor() 