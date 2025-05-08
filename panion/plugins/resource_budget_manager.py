"""
Resource Budget Manager Plugin
Implements dynamic resource budgeting and goal management with penalties and rewards.
"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import json
import yaml
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import psutil
import numpy as np
import threading
import asyncio
from sklearn.preprocessing import MinMaxScaler
from uuid import uuid4
import os
from collections import deque
import statistics

from core.plugin.base import BasePlugin
from core.decorators import with_connection_pool, cache_result
from core.plugin.utils.security import SecurityContext, security_monitor

@dataclass
class ResourceBudget:
    """Resource allocation budget for an agent.
    
    Attributes:
        agent_id: Unique identifier of the agent
        cpu_limit: Maximum CPU percentage allowed
        memory_limit: Maximum memory in MB allowed
        goal_limit: Maximum number of concurrent goals allowed
        time_limit: Maximum time allowed per goal
        current_usage: Dictionary tracking current resource usage
        penalties: List of penalty records for resource overuse
        rewards: List of reward records for efficient resource use
        last_updated: Timestamp of last budget update
        efficiency_score: Overall resource efficiency score
        adjustment_history: History of budget adjustments
    """
    agent_id: str
    cpu_limit: float  # CPU percentage
    memory_limit: float  # Memory in MB
    goal_limit: int  # Maximum concurrent goals
    time_limit: timedelta  # Maximum time per goal
    current_usage: Dict[str, float]
    penalties: List[Dict[str, Any]]
    rewards: List[Dict[str, Any]]
    last_updated: datetime
    efficiency_score: float = 0.0
    adjustment_history: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class GoalBudget:
    """Resource budget allocation for a specific goal.
    
    Attributes:
        goal_id: Unique identifier of the goal
        agent_id: ID of the agent executing the goal
        resource_limits: Dictionary of resource limits for this goal
        time_limit: Maximum time allowed for goal completion
        start_time: When goal execution started
        current_usage: Dictionary tracking current resource usage
        status: Current status of the goal budget
        efficiency_metrics: Dictionary of efficiency metrics
    """
    goal_id: str
    agent_id: str
    resource_limits: Dict[str, float]
    time_limit: timedelta
    start_time: datetime
    current_usage: Dict[str, float]
    status: str  # 'active', 'completed', 'exceeded'
    efficiency_metrics: Dict[str, float] = field(default_factory=dict)

class ResourceBudgetManager(BasePlugin):
    def __init__(self, config_path: str = "config/resource_budget_config.yaml"):
        super().__init__(
            name="ResourceBudgetManager",
            version="1.0.0",
            description="Implements dynamic resource budgeting and goal management",
            author="Panion Team"
        )
        self.logger = logging.getLogger(__name__)
        self.config = self._load_config(config_path)
        self.data_dir = Path("data")
        self.budgets_file = self.data_dir / "resource_budgets.json"
        self.goals_file = self.data_dir / "goal_budgets.json"
        self.budgets_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize budget tracking
        self.agent_budgets: Dict[str, ResourceBudget] = {}
        self.goal_budgets: Dict[str, GoalBudget] = {}
        
        # Initialize resource monitoring
        self.scaler = MinMaxScaler()
        self.resource_history: Dict[str, deque] = {
            "cpu": deque(maxlen=1000),
            "memory": deque(maxlen=1000),
            "goals": deque(maxlen=1000)
        }
        
        # Initialize trend analysis
        self.trend_window = 100  # Number of samples for trend analysis
        self.trend_threshold = 0.1  # Threshold for significant trends
        
        # Initialize security context
        self.security_context = SecurityContext(
            plugin_id="resource_budget_manager",
            allowed_imports={'psutil', 'numpy', 'sklearn'},
            allowed_resources={'cpu', 'memory', 'disk'},
            permissions={'file_access', 'network_access'},
            resource_limits={
                'cpu': 50.0,
                'memory': 256.0,
                'time': 1800,
                'disk': 512.0
            }
        )

        # Write buffer system
        self._write_buffer = {
            "agent_budgets": {},
            "goal_budgets": {}
        }
        self._buffer_lock = threading.Lock()
        self._is_dirty = False
        self._last_save = datetime.now()
        self._save_interval = timedelta(seconds=30)
        self._save_task = None
        self._running = True
        
        # Start monitoring
        self._start_monitoring()
        
    def _start_monitoring(self):
        """Start resource monitoring."""
        self._monitor_task = asyncio.create_task(self._monitor_resources())
        
    async def _monitor_resources(self):
        """Monitor resource usage and adjust budgets."""
        while self._running:
            try:
                # Update resource history
                self._update_resource_history()
                
                # Analyze trends
                trends = self._analyze_trends()
                
                # Adjust budgets based on trends
                await self._adjust_budgets(trends)
                
                # Check for violations
                self._check_violations()
                
                await asyncio.sleep(self.config['monitoring_interval'])
                
            except Exception as e:
                self.logger.error(f"Error in resource monitoring: {e}")
                await asyncio.sleep(5)  # Wait before retrying
                
    def _update_resource_history(self):
        """Update resource usage history."""
        try:
            # Get current resource usage
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            active_goals = len([g for g in self.goal_budgets.values() if g.status == 'active'])
            
            # Update history
            self.resource_history['cpu'].append(cpu_percent)
            self.resource_history['memory'].append(memory.percent)
            self.resource_history['goals'].append(active_goals)
            
        except Exception as e:
            self.logger.error(f"Error updating resource history: {e}")
            
    def _analyze_trends(self) -> Dict[str, Any]:
        """Analyze resource usage trends.
        
        Returns:
            Dict containing trend analysis results
        """
        trends = {}
        try:
            for resource, history in self.resource_history.items():
                if len(history) < 2:
                    continue
                    
                # Calculate trend using linear regression
                x = np.arange(len(history))
                y = np.array(history)
                slope, intercept = np.polyfit(x, y, 1)
                
                # Calculate trend significance
                trend_strength = abs(slope) / np.mean(y) if np.mean(y) > 0 else 0
                
                trends[resource] = {
                    'slope': slope,
                    'intercept': intercept,
                    'trend_strength': trend_strength,
                    'is_significant': trend_strength > self.trend_threshold,
                    'direction': 'increasing' if slope > 0 else 'decreasing',
                    'current_value': history[-1],
                    'average': np.mean(history),
                    'std_dev': np.std(history)
                }
                
        except Exception as e:
            self.logger.error(f"Error analyzing trends: {e}")
            
        return trends
        
    async def _adjust_budgets(self, trends: Dict[str, Any]):
        """Adjust budgets based on usage trends.
        
        Args:
            trends: Dictionary of resource usage trends
        """
        try:
            for agent_id, budget in self.agent_budgets.items():
                adjustments = {}
                
                # Check CPU trend
                if 'cpu' in trends and trends['cpu']['is_significant']:
                    cpu_trend = trends['cpu']
                    if cpu_trend['direction'] == 'increasing':
                        # Reduce CPU limit if usage is increasing
                        new_limit = max(
                            budget.cpu_limit * 0.9,  # Reduce by 10%
                            cpu_trend['current_value'] * 1.2  # Keep 20% buffer
                        )
                        adjustments['cpu_limit'] = new_limit
                    else:
                        # Increase CPU limit if usage is decreasing
                        new_limit = min(
                            budget.cpu_limit * 1.1,  # Increase by 10%
                            self.config['default_limits']['cpu']  # Don't exceed default
                        )
                        adjustments['cpu_limit'] = new_limit
                        
                # Check memory trend
                if 'memory' in trends and trends['memory']['is_significant']:
                    memory_trend = trends['memory']
                    if memory_trend['direction'] == 'increasing':
                        # Reduce memory limit if usage is increasing
                        new_limit = max(
                            budget.memory_limit * 0.9,  # Reduce by 10%
                            memory_trend['current_value'] * 1.2  # Keep 20% buffer
                        )
                        adjustments['memory_limit'] = new_limit
                    else:
                        # Increase memory limit if usage is decreasing
                        new_limit = min(
                            budget.memory_limit * 1.1,  # Increase by 10%
                            self.config['default_limits']['memory']  # Don't exceed default
                        )
                        adjustments['memory_limit'] = new_limit
                        
                # Apply adjustments if any
                if adjustments:
                    await self._apply_budget_adjustments(agent_id, adjustments)
                    
        except Exception as e:
            self.logger.error(f"Error adjusting budgets: {e}")
            
    async def _apply_budget_adjustments(self, agent_id: str, adjustments: Dict[str, float]):
        """Apply budget adjustments.
        
        Args:
            agent_id: ID of the agent
            adjustments: Dictionary of adjustments to apply
        """
        try:
            budget = self.agent_budgets[agent_id]
            
            # Record adjustment
            adjustment_record = {
                'timestamp': datetime.now().isoformat(),
                'adjustments': adjustments.copy(),
                'reason': 'trend_based_adjustment'
            }
            budget.adjustment_history.append(adjustment_record)
            
            # Apply adjustments
            for key, value in adjustments.items():
                setattr(budget, key, value)
                
            # Update efficiency score
            budget.efficiency_score = self._calculate_efficiency_score(budget)
            
            # Save changes
            self._mark_dirty('agent_budgets', agent_id, budget)
            
            self.logger.info(f"Applied budget adjustments for agent {agent_id}: {adjustments}")
            
        except Exception as e:
            self.logger.error(f"Error applying budget adjustments: {e}")
            
    def _calculate_efficiency_score(self, budget: ResourceBudget) -> float:
        """Calculate resource efficiency score.
        
        Args:
            budget: Resource budget to calculate score for
            
        Returns:
            float: Efficiency score between 0 and 1
        """
        try:
            # Calculate resource utilization
            cpu_util = budget.current_usage.get('cpu', 0) / budget.cpu_limit
            memory_util = budget.current_usage.get('memory', 0) / budget.memory_limit
            
            # Calculate penalty impact
            penalty_score = 1.0
            if budget.penalties:
                recent_penalties = [p for p in budget.penalties 
                                 if datetime.fromisoformat(p['timestamp']) > 
                                 datetime.now() - timedelta(days=7)]
                if recent_penalties:
                    penalty_score = 1.0 - (len(recent_penalties) * 0.1)  # 10% reduction per penalty
                    
            # Calculate reward impact
            reward_score = 1.0
            if budget.rewards:
                recent_rewards = [r for r in budget.rewards 
                                if datetime.fromisoformat(r['timestamp']) > 
                                datetime.now() - timedelta(days=7)]
                if recent_rewards:
                    reward_score = 1.0 + (len(recent_rewards) * 0.05)  # 5% increase per reward
                    
            # Calculate final score
            utilization_score = (cpu_util + memory_util) / 2
            efficiency_score = utilization_score * penalty_score * reward_score
            
            return max(0.0, min(1.0, efficiency_score))
            
        except Exception as e:
            self.logger.error(f"Error calculating efficiency score: {e}")
            return 0.0
            
    def _check_violations(self):
        """Check for resource usage violations."""
        try:
            for agent_id, budget in self.agent_budgets.items():
                # Check CPU usage
                if budget.current_usage.get('cpu', 0) > budget.cpu_limit:
                    self._apply_penalty(agent_id, 'cpu_excess')
                    
                # Check memory usage
                if budget.current_usage.get('memory', 0) > budget.memory_limit:
                    self._apply_penalty(agent_id, 'memory_excess')
                    
                # Check goal count
                active_goals = len([g for g in self.goal_budgets.values() 
                                  if g.agent_id == agent_id and g.status == 'active'])
                if active_goals > budget.goal_limit:
                    self._apply_penalty(agent_id, 'goal_excess')
                    
        except Exception as e:
            self.logger.error(f"Error checking violations: {e}")
            
    def _apply_penalty(self, agent_id: str, penalty_type: str):
        """Apply a penalty for resource violation.
        
        Args:
            agent_id: ID of the agent
            penalty_type: Type of penalty to apply
        """
        try:
            budget = self.agent_budgets[agent_id]
            
            # Calculate penalty severity
            severity = self._calculate_penalty_severity(penalty_type, budget)
            
            # Create penalty record
            penalty = {
                'timestamp': datetime.now().isoformat(),
                'type': penalty_type,
                'severity': severity,
                'details': {
                    'current_usage': budget.current_usage.copy(),
                    'limits': {
                        'cpu': budget.cpu_limit,
                        'memory': budget.memory_limit,
                        'goals': budget.goal_limit
                    }
                }
            }
            
            # Add penalty to history
            budget.penalties.append(penalty)
            
            # Update efficiency score
            budget.efficiency_score = self._calculate_efficiency_score(budget)
            
            # Save changes
            self._mark_dirty('agent_budgets', agent_id, budget)
            
            self.logger.warning(f"Applied penalty to agent {agent_id}: {penalty}")
            
        except Exception as e:
            self.logger.error(f"Error applying penalty: {e}")
            
    def _calculate_penalty_severity(self, penalty_type: str, budget: ResourceBudget) -> float:
        """Calculate penalty severity.
        
        Args:
            penalty_type: Type of penalty
            budget: Resource budget
            
        Returns:
            float: Severity score between 0 and 1
        """
        try:
            if penalty_type == 'cpu_excess':
                excess = (budget.current_usage.get('cpu', 0) - budget.cpu_limit) / budget.cpu_limit
                return min(1.0, max(0.0, excess))
            elif penalty_type == 'memory_excess':
                excess = (budget.current_usage.get('memory', 0) - budget.memory_limit) / budget.memory_limit
                return min(1.0, max(0.0, excess))
            elif penalty_type == 'goal_excess':
                active_goals = len([g for g in self.goal_budgets.values() 
                                  if g.agent_id == budget.agent_id and g.status == 'active'])
                excess = (active_goals - budget.goal_limit) / budget.goal_limit
                return min(1.0, max(0.0, excess))
            else:
                return 0.5  # Default severity
                
        except Exception as e:
            self.logger.error(f"Error calculating penalty severity: {e}")
            return 0.5
            
    def apply_reward(self, agent_id: str, reward_type: str, value: float):
        """Apply a reward for efficient resource usage.
        
        Args:
            agent_id: ID of the agent
            reward_type: Type of reward
            value: Reward value
        """
        try:
            budget = self.agent_budgets[agent_id]
            
            # Create reward record
            reward = {
                'timestamp': datetime.now().isoformat(),
                'type': reward_type,
                'value': value,
                'details': {
                    'current_usage': budget.current_usage.copy(),
                    'efficiency_score': budget.efficiency_score
                }
            }
            
            # Add reward to history
            budget.rewards.append(reward)
            
            # Update efficiency score
            budget.efficiency_score = self._calculate_efficiency_score(budget)
            
            # Save changes
            self._mark_dirty('agent_budgets', agent_id, budget)
            
            self.logger.info(f"Applied reward to agent {agent_id}: {reward}")
            
        except Exception as e:
            self.logger.error(f"Error applying reward: {e}")
            
    def get_resource_trends(self) -> Dict[str, Any]:
        """Get resource usage trends and predictions.
        
        Returns:
            Dict containing trend analysis and predictions
        """
        try:
            trends = self._analyze_trends()
            predictions = {}
            
            # Generate predictions for each resource
            for resource, trend in trends.items():
                if trend['is_significant']:
                    # Predict next hour
                    next_hour = trend['slope'] * (len(self.resource_history[resource]) + 3600) + trend['intercept']
                    
                    # Predict next day
                    next_day = trend['slope'] * (len(self.resource_history[resource]) + 86400) + trend['intercept']
                    
                    predictions[resource] = {
                        'next_hour': next_hour,
                        'next_day': next_day,
                        'confidence': 1.0 - abs(trend['trend_strength']),
                        'current_trend': trend
                    }
                    
            return {
                'trends': trends,
                'predictions': predictions,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error getting resource trends: {e}")
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
            
    async def stop(self):
        """Stop the manager and cleanup resources."""
        try:
            self._running = False
            if self._monitor_task:
                self._monitor_task.cancel()
                try:
                    await self._monitor_task
                except asyncio.CancelledError:
                    pass
                    
            # Flush any pending writes
            await self._flush_buffer()
            
            # Cleanup security context
            if hasattr(self, 'security_context'):
                security_monitor.unregister_context(self.security_context.plugin_id)
                
            self.logger.info("Resource Budget Manager stopped")
            
        except Exception as e:
            self.logger.error(f"Error stopping Resource Budget Manager: {e}")
            raise

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from .YAML file."""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.logger.error(f"Error loading config: {str(e)}")
            return {
                "default_limits": {
                    "cpu": 80.0,  # 80% CPU
                    "memory": 1024,  # 1GB memory
                    "goals": 5,  # 5 concurrent goals
                    "time_per_goal": 3600  # 1 hour per goal
                },
                "penalty_weights": {
                    "cpu_excess": 0.4,
                    "memory_excess": 0.3,
                    "time_excess": 0.3
                },
                "reward_weights": {
                    "efficiency": 0.5,
                    "resource_saving": 0.3,
                    "goal_completion": 0.2
                },
                "monitoring_interval": 60  # 60 seconds
            }
    
    def load_budgets(self) -> None:
        """Load budget data from .files."""
        try:
            # Load agent budgets
            if self.budgets_file.exists():
                with open(self.budgets_file, 'r') as f:
                    budgets_data = json.load(f)
                self.agent_budgets = {
                    agent_id: ResourceBudget(
                        agent_id=agent_id,
                        cpu_limit=budget["cpu_limit"],
                        memory_limit=budget["memory_limit"],
                        goal_limit=budget["goal_limit"],
                        time_limit=timedelta(seconds=budget["time_limit"]),
                        current_usage=budget["current_usage"],
                        penalties=budget["penalties"],
                        rewards=budget["rewards"],
                        last_updated=datetime.fromisoformat(budget["last_updated"])
                    )
                    for agent_id, budget in budgets_data.items()
                }
            
            # Load goal budgets
            if self.goals_file.exists():
                with open(self.goals_file, 'r') as f:
                    goals_data = json.load(f)
                self.goal_budgets = {
                    goal_id: GoalBudget(
                        goal_id=goal_id,
                        agent_id=goal["agent_id"],
                        resource_limits=goal["resource_limits"],
                        time_limit=timedelta(seconds=goal["time_limit"]),
                        start_time=datetime.fromisoformat(goal["start_time"]),
                        current_usage=goal["current_usage"],
                        status=goal["status"]
                    )
                    for goal_id, goal in goals_data.items()
                }
        
        except Exception as e:
            self.logger.error(f"Error loading budgets: {str(e)}")
    
    async def initialize(self) -> None:
        """Initialize the manager and start the save task."""
        try:
            # Load existing budgets
            self.load_budgets()
            
            # Start save task
            self._save_task = asyncio.create_task(self._periodic_save())
            
            self.logger.info("Resource Budget Manager initialized")
        except Exception as e:
            self.logger.error(f"Error initializing Resource Budget Manager: {e}")
            raise

    async def _periodic_save(self) -> None:
        """Periodically save buffered data."""
        while self._running:
            try:
                await asyncio.sleep(self._save_interval.total_seconds())
                if self._is_dirty:
                    await self._flush_buffer()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in periodic save: {e}")

    async def _flush_buffer(self) -> None:
        """Flush the write buffer to disk."""
        with self._buffer_lock:
            if not self._is_dirty:
                return

            try:
                # Save agent budgets
                if self._write_buffer["agent_budgets"]:
                    budgets_data = {
                        agent_id: {
                            "cpu_limit": budget.cpu_limit,
                            "memory_limit": budget.memory_limit,
                            "goal_limit": budget.goal_limit,
                            "time_limit": budget.time_limit.total_seconds(),
                            "current_usage": budget.current_usage,
                            "penalties": budget.penalties,
                            "rewards": budget.rewards,
                            "last_updated": budget.last_updated.isoformat()
                        }
                        for agent_id, budget in self._write_buffer["agent_budgets"].items()
                    }
                    
                    with open(self.budgets_file, 'w') as f:
                        json.dump(budgets_data, f, indent=2)
                
                # Save goal budgets
                if self._write_buffer["goal_budgets"]:
                    goals_data = {
                        goal_id: {
                            "agent_id": goal.agent_id,
                            "resource_limits": goal.resource_limits,
                            "time_limit": goal.time_limit.total_seconds(),
                            "start_time": goal.start_time.isoformat(),
                            "current_usage": goal.current_usage,
                            "status": goal.status
                        }
                        for goal_id, goal in self._write_buffer["goal_budgets"].items()
                    }
                    
                    with open(self.goals_file, 'w') as f:
                        json.dump(goals_data, f, indent=2)
                
                self._write_buffer = {
                    "agent_budgets": {},
                    "goal_budgets": {}
                }
                self._is_dirty = False
                self._last_save = datetime.now()
                
            except Exception as e:
                self.logger.error(f"Error flushing buffer: {e}")
                raise

    def _mark_dirty(self, budget_type: str, id: str, data: Any) -> None:
        """Mark data as dirty and add to write buffer."""
        with self._buffer_lock:
            self._write_buffer[f"{budget_type}_budgets"][id] = data
            self._is_dirty = True

    def create_agent_budget(self, agent_id: str) -> ResourceBudget:
        """Create a new budget for an agent."""
        default_limits = self.config["default_limits"]
        budget = ResourceBudget(
            agent_id=agent_id,
            cpu_limit=default_limits["cpu"],
            memory_limit=default_limits["memory"],
            goal_limit=default_limits["goals"],
            time_limit=timedelta(seconds=default_limits["time_per_goal"]),
            current_usage={
                "cpu": 0.0,
                "memory": 0.0,
                "goals": 0
            },
            penalties=[],
            rewards=[],
            last_updated=datetime.now()
        )
        self.agent_budgets[agent_id] = budget
        self._mark_dirty("agent", agent_id, budget)
        return budget
    
    def create_goal_budget(self, goal_id: str, agent_id: str) -> GoalBudget:
        """Create a new budget for a goal."""
        if agent_id not in self.agent_budgets:
            self.create_agent_budget(agent_id)
        
        agent_budget = self.agent_budgets[agent_id]
        budget = GoalBudget(
            goal_id=goal_id,
            agent_id=agent_id,
            resource_limits={
                "cpu": agent_budget.cpu_limit / agent_budget.goal_limit,
                "memory": agent_budget.memory_limit / agent_budget.goal_limit,
                "time": agent_budget.time_limit.total_seconds()
            },
            time_limit=agent_budget.time_limit,
            start_time=datetime.now(),
            current_usage={
                "cpu": 0.0,
                "memory": 0.0,
                "time": 0.0
            },
            status="active"
        )
        self.goal_budgets[goal_id] = budget
        self._mark_dirty("goal", goal_id, budget)
        return budget
    
    def update_resource_usage(self, agent_id: str, goal_id: str) -> None:
        """Update resource usage for an agent and goal."""
        try:
            # Get current system resource usage
            cpu_percent = psutil.cpu_percent()
            memory_info = psutil.Process().memory_info()
            memory_mb = memory_info.rss / (1024 * 1024)
            
            # Update agent budget
            if agent_id in self.agent_budgets:
                agent_budget = self.agent_budgets[agent_id]
                agent_budget.current_usage["cpu"] = cpu_percent
                agent_budget.current_usage["memory"] = memory_mb
                agent_budget.current_usage["goals"] = len([
                    g for g in self.goal_budgets.values()
                    if g.agent_id == agent_id and g.status == "active"
                ])
                agent_budget.last_updated = datetime.now()
                
                # Check for penalties
                self._check_penalties(agent_budget)
                
                # Mark as dirty
                self._mark_dirty("agent", agent_id, agent_budget)
            
            # Update goal budget
            if goal_id in self.goal_budgets:
                goal_budget = self.goal_budgets[goal_id]
                goal_budget.current_usage["cpu"] = cpu_percent
                goal_budget.current_usage["memory"] = memory_mb
                goal_budget.current_usage["time"] = (
                    datetime.now() - goal_budget.start_time
                ).total_seconds()
                
                # Check for time limit
                if goal_budget.current_usage["time"] > goal_budget.time_limit.total_seconds():
                    goal_budget.status = "exceeded"
                    self._apply_penalty(agent_id, "time_excess")
                
                # Mark as dirty
                self._mark_dirty("goal", goal_id, goal_budget)
            
            # Update resource history
            self._update_resource_history()
        
        except Exception as e:
            self.logger.error(f"Error updating resource usage: {str(e)}")
    
    def _check_penalties(self, budget: ResourceBudget) -> None:
        """Check for resource usage penalties."""
        # Check CPU usage
        if budget.current_usage["cpu"] > budget.cpu_limit:
            self._apply_penalty(budget.agent_id, "cpu_excess")
        
        # Check memory usage
        if budget.current_usage["memory"] > budget.memory_limit:
            self._apply_penalty(budget.agent_id, "memory_excess")
        
        # Check goal limit
        if budget.current_usage["goals"] > budget.goal_limit:
            self._apply_penalty(budget.agent_id, "goal_excess")

# Create singleton instance
resource_budget_manager = ResourceBudgetManager()

# Plugin entry point
def run_plugin() -> bool:
    """Entry point for the plugin."""
    manager = ResourceBudgetManager()
    return manager.run()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = run_plugin()
    print(f"Resource Budget Manager completed {'successfully' if success else 'with errors'}") 