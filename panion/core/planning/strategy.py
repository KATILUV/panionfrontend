"""
Strategy Planner
Provides strategic planning capabilities for goal decomposition and execution.
"""

import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import json
from pathlib import Path
from collections import defaultdict
import re
import networkx as nx
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

logger = logging.getLogger(__name__)

@dataclass
class Strategy:
    """Represents a strategic plan for goal execution."""
    strategy_id: str
    goal_id: str
    steps: List[Dict[str, Any]]
    dependencies: Dict[str, List[str]]
    estimated_duration: timedelta
    priority: int
    status: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

class StrategyPlanner:
    """Plans and manages strategic execution of goals."""
    
    def __init__(self, data_dir: str = "data/strategies"):
        self.logger = logging.getLogger(__name__)
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize storage
        self.strategies: Dict[str, Strategy] = {}
        self.execution_history: List[Dict[str, Any]] = []
        
        # Load existing strategies
        self._load_strategies()
        
        # Initialize text analysis components
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
    
    def _load_strategies(self) -> None:
        """Load existing strategies from disk."""
        try:
            strategies_file = self.data_dir / "strategies.json"
            if strategies_file.exists():
                with open(strategies_file, 'r') as f:
                    strategies_data = json.load(f)
                    
                for strategy_id, strategy_data in strategies_data.items():
                    self.strategies[strategy_id] = Strategy(
                        strategy_id=strategy_id,
                        goal_id=strategy_data["goal_id"],
                        steps=strategy_data["steps"],
                        dependencies=strategy_data["dependencies"],
                        estimated_duration=timedelta(seconds=strategy_data["estimated_duration"]),
                        priority=strategy_data["priority"],
                        status=strategy_data["status"],
                        metadata=strategy_data["metadata"],
                        created_at=datetime.fromisoformat(strategy_data["created_at"]),
                        updated_at=datetime.fromisoformat(strategy_data["updated_at"])
                    )
            
            self.logger.info(f"Loaded {len(self.strategies)} strategies")
            
        except Exception as e:
            self.logger.error(f"Error loading strategies: {e}")
    
    def create_strategy(self, goal: Dict[str, Any], context: Dict[str, Any]) -> Strategy:
        """Create a new strategy for a goal.
        
        Args:
            goal: Goal to create strategy for
            context: Additional context for strategy creation
            
        Returns:
            Created strategy
        """
        try:
            # Decompose goal into steps
            steps = self._decompose_goal(goal, context)
            
            # Identify dependencies
            dependencies = self._identify_dependencies(steps)
            
            # Estimate duration
            duration = self._estimate_duration(steps)
            
            # Create strategy
            strategy = Strategy(
                strategy_id=f"strategy_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                goal_id=goal["id"],
                steps=steps,
                dependencies=dependencies,
                estimated_duration=duration,
                priority=goal.get("priority", 3),
                status="created",
                metadata={
                    "goal_type": goal.get("type"),
                    "context": context
                }
            )
            
            # Store strategy
            self.strategies[strategy.strategy_id] = strategy
            self._save_strategies()
            
            return strategy
            
        except Exception as e:
            self.logger.error(f"Error creating strategy: {e}")
            raise
    
    def _decompose_goal(self, goal: Dict[str, Any], context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Decompose goal into executable steps.
        
        Args:
            goal: Goal to decompose
            context: Additional context
            
        Returns:
            List of steps
        """
        steps = []
        
        # Extract goal components
        goal_type = goal.get("type")
        goal_params = goal.get("parameters", {})
        
        # Create steps based on goal type
        if goal_type == "data_collection":
            steps.extend(self._create_data_collection_steps(goal_params))
        elif goal_type == "analysis":
            steps.extend(self._create_analysis_steps(goal_params))
        elif goal_type == "optimization":
            steps.extend(self._create_optimization_steps(goal_params))
        else:
            # Generic step creation
            steps.append({
                "id": f"step_{len(steps)}",
                "type": "generic",
                "description": f"Execute {goal_type} goal",
                "parameters": goal_params,
                "estimated_duration": timedelta(minutes=30)
            })
        
        return steps
    
    def _create_data_collection_steps(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create steps for data collection goals.
        
        Args:
            params: Goal parameters
            
        Returns:
            List of steps
        """
        steps = []
        
        # Add data source validation step
        steps.append({
            "id": "validate_sources",
            "type": "validation",
            "description": "Validate data sources",
            "parameters": {
                "sources": params.get("sources", []),
                "validation_rules": params.get("validation_rules", {})
            },
            "estimated_duration": timedelta(minutes=15)
        })
        
        # Add data collection step
        steps.append({
            "id": "collect_data",
            "type": "collection",
            "description": "Collect data from sources",
            "parameters": {
                "sources": params.get("sources", []),
                "collection_method": params.get("collection_method", "api")
            },
            "estimated_duration": timedelta(minutes=45)
        })
        
        # Add data validation step
        steps.append({
            "id": "validate_data",
            "type": "validation",
            "description": "Validate collected data",
            "parameters": {
                "validation_rules": params.get("validation_rules", {}),
                "quality_metrics": params.get("quality_metrics", {})
            },
            "estimated_duration": timedelta(minutes=30)
        })
        
        return steps
    
    def _create_analysis_steps(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create steps for analysis goals.
        
        Args:
            params: Goal parameters
            
        Returns:
            List of steps
        """
        steps = []
        
        # Add data preparation step
        steps.append({
            "id": "prepare_data",
            "type": "preparation",
            "description": "Prepare data for analysis",
            "parameters": {
                "preprocessing_rules": params.get("preprocessing_rules", {}),
                "feature_engineering": params.get("feature_engineering", {})
            },
            "estimated_duration": timedelta(minutes=30)
        })
        
        # Add analysis step
        steps.append({
            "id": "perform_analysis",
            "type": "analysis",
            "description": "Perform analysis",
            "parameters": {
                "analysis_type": params.get("analysis_type", "statistical"),
                "analysis_params": params.get("analysis_params", {})
            },
            "estimated_duration": timedelta(minutes=60)
        })
        
        # Add result validation step
        steps.append({
            "id": "validate_results",
            "type": "validation",
            "description": "Validate analysis results",
            "parameters": {
                "validation_rules": params.get("validation_rules", {}),
                "quality_metrics": params.get("quality_metrics", {})
            },
            "estimated_duration": timedelta(minutes=30)
        })
        
        return steps
    
    def _create_optimization_steps(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create steps for optimization goals.
        
        Args:
            params: Goal parameters
            
        Returns:
            List of steps
        """
        steps = []
        
        # Add baseline measurement step
        steps.append({
            "id": "measure_baseline",
            "type": "measurement",
            "description": "Measure current performance",
            "parameters": {
                "metrics": params.get("metrics", []),
                "measurement_period": params.get("measurement_period", "1d")
            },
            "estimated_duration": timedelta(minutes=30)
        })
        
        # Add optimization step
        steps.append({
            "id": "optimize",
            "type": "optimization",
            "description": "Perform optimization",
            "parameters": {
                "optimization_type": params.get("optimization_type", "parameter"),
                "optimization_params": params.get("optimization_params", {})
            },
            "estimated_duration": timedelta(minutes=60)
        })
        
        # Add validation step
        steps.append({
            "id": "validate_improvement",
            "type": "validation",
            "description": "Validate optimization results",
            "parameters": {
                "improvement_threshold": params.get("improvement_threshold", 0.1),
                "validation_period": params.get("validation_period", "1d")
            },
            "estimated_duration": timedelta(minutes=30)
        })
        
        return steps
    
    def _identify_dependencies(self, steps: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """Identify dependencies between steps.
        
        Args:
            steps: List of steps
            
        Returns:
            Dictionary mapping step IDs to their dependencies
        """
        dependencies = defaultdict(list)
        
        # Create graph of steps
        G = nx.DiGraph()
        for step in steps:
            G.add_node(step["id"])
        
        # Add edges based on step types and parameters
        for i, step in enumerate(steps):
            # Add dependencies based on step type
            if step["type"] == "validation":
                # Validation steps depend on their target steps
                target = step["parameters"].get("target_step")
                if target:
                    G.add_edge(target, step["id"])
            
            elif step["type"] == "analysis":
                # Analysis steps depend on preparation steps
                for prev_step in steps[:i]:
                    if prev_step["type"] == "preparation":
                        G.add_edge(prev_step["id"], step["id"])
            
            elif step["type"] == "optimization":
                # Optimization steps depend on measurement steps
                for prev_step in steps[:i]:
                    if prev_step["type"] == "measurement":
                        G.add_edge(prev_step["id"], step["id"])
        
        # Convert graph to dependency dictionary
        for step in steps:
            dependencies[step["id"]] = list(G.predecessors(step["id"]))
        
        return dict(dependencies)
    
    def _estimate_duration(self, steps: List[Dict[str, Any]]) -> timedelta:
        """Estimate total duration of steps.
        
        Args:
            steps: List of steps
            
        Returns:
            Estimated total duration
        """
        total_duration = timedelta()
        
        for step in steps:
            if "estimated_duration" in step:
                total_duration += step["estimated_duration"]
            else:
                # Default duration for steps without estimate
                total_duration += timedelta(minutes=30)
        
        return total_duration
    
    def _save_strategies(self) -> None:
        """Save strategies to disk."""
        try:
            strategies_file = self.data_dir / "strategies.json"
            with open(strategies_file, 'w') as f:
                json.dump({
                    strategy_id: {
                        "goal_id": strategy.goal_id,
                        "steps": strategy.steps,
                        "dependencies": strategy.dependencies,
                        "estimated_duration": strategy.estimated_duration.total_seconds(),
                        "priority": strategy.priority,
                        "status": strategy.status,
                        "metadata": strategy.metadata,
                        "created_at": strategy.created_at.isoformat(),
                        "updated_at": strategy.updated_at.isoformat()
                    }
                    for strategy_id, strategy in self.strategies.items()
                }, f, indent=2)
            
        except Exception as e:
            self.logger.error(f"Error saving strategies: {e}")
    
    def get_strategy(self, strategy_id: str) -> Optional[Strategy]:
        """Get strategy by ID.
        
        Args:
            strategy_id: Strategy ID
            
        Returns:
            Strategy if found, None otherwise
        """
        return self.strategies.get(strategy_id)
    
    def get_strategies_for_goal(self, goal_id: str) -> List[Strategy]:
        """Get strategies for a goal.
        
        Args:
            goal_id: Goal ID
            
        Returns:
            List of strategies for the goal
        """
        return [
            strategy for strategy in self.strategies.values()
            if strategy.goal_id == goal_id
        ]
    
    def update_strategy_status(self, strategy_id: str, status: str) -> None:
        """Update strategy status.
        
        Args:
            strategy_id: Strategy ID
            status: New status
        """
        if strategy_id in self.strategies:
            strategy = self.strategies[strategy_id]
            strategy.status = status
            strategy.updated_at = datetime.now()
            self._save_strategies()
    
    def get_execution_order(self, strategy_id: str) -> List[str]:
        """Get ordered list of steps for execution.
        
        Args:
            strategy_id: Strategy ID
            
        Returns:
            List of step IDs in execution order
        """
        if strategy_id not in self.strategies:
            return []
        
        strategy = self.strategies[strategy_id]
        
        # Create graph
        G = nx.DiGraph()
        for step in strategy.steps:
            G.add_node(step["id"])
        
        # Add edges
        for step_id, deps in strategy.dependencies.items():
            for dep in deps:
                G.add_edge(dep, step_id)
        
        # Get topological sort
        try:
            return list(nx.topological_sort(G))
        except nx.NetworkXUnfeasible:
            self.logger.error(f"Circular dependency detected in strategy {strategy_id}")
            return []

# Create global instance
strategy_planner = StrategyPlanner() 