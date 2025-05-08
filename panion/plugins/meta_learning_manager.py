"""
Meta Learning Manager Plugin
Implements experience replay and self-scoring loops for continuous learning and strategy improvement.
"""

import logging
from typing import List, Dict, Any, Optional, Set, Tuple
from pathlib import Path
import json
import yaml
from dataclasses import dataclass, field
from datetime import datetime
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import pandas as pd
from collections import deque, defaultdict
import uuid

from core.plugin.base import BasePlugin
from core.panion_errors import PluginError

@dataclass
class LearningEpisode:
    """Record of a learning episode with its strategy and outcomes.
    
    Attributes:
        episode_id: Unique identifier for the episode
        timestamp: When the episode occurred
        agent_id: ID of the agent that executed the episode
        strategy: Strategy used during the episode
        context: Contextual information about the episode
        actions: List of actions taken during the episode
        outcomes: Dictionary of outcome metrics
        success_score: Overall success score (0.0 to 1.0)
        efficiency_score: Efficiency score (0.0 to 1.0)
        learning_points: Key insights learned from the episode
    """
    episode_id: str
    timestamp: datetime
    agent_id: str
    strategy: Dict[str, Any]
    context: Dict[str, Any]
    actions: List[Dict[str, Any]]
    outcomes: Dict[str, float]
    success_score: float
    efficiency_score: float
    learning_points: List[str]

@dataclass
class StrategyPattern:
    """Pattern identified from analyzing multiple learning episodes.
    
    Attributes:
        pattern_id: Unique identifier for the pattern
        context_features: List of relevant context features
        strategy_components: Components that make up the strategy
        success_rate: Rate of successful applications
        efficiency_score: Average efficiency score
        usage_count: Number of times pattern was used
        last_used: When pattern was last used
        confidence: Confidence in the pattern's effectiveness
    """
    pattern_id: str
    context_features: List[str]
    strategy_components: Dict[str, Any]
    success_rate: float
    efficiency_score: float
    usage_count: int
    last_used: datetime
    confidence: float

@dataclass
class KnowledgeGap:
    """Gap identified in the agent's knowledge or capabilities.
    
    Attributes:
        domain: Domain where the gap exists
        description: Description of the knowledge gap
        priority: Priority level for addressing the gap
        evidence: Evidence supporting the existence of the gap
        created_at: When the gap was identified
        status: Current status (open, addressed, resolved)
        resolution_attempts: List of attempts to resolve the gap
        id: Unique identifier for the gap
    """
    domain: str
    description: str
    priority: float
    evidence: List[Dict[str, Any]]
    created_at: datetime = field(default_factory=datetime.now)
    status: str = "open"  # "open", "addressed", "resolved"
    resolution_attempts: List[str] = field(default_factory=list)
    id: str = field(default_factory=lambda: str(uuid.uuid4()))

class MetaLearningManager(BasePlugin):
    def __init__(self, config_path: Optional[str] = None):
        super().__init__(
            name="MetaLearningManager",
            version="1.0.0",
            description="Implements experience replay and self-scoring loops for continuous learning",
            author="Panion Team"
        )
        self.logger = logging.getLogger(__name__)
        self.config = self._load_config(config_path or "config/meta_learning_config.yaml")
        self.data_dir = Path("data/meta_learning")
        self.episodes_file = self.data_dir / "learning_episodes.json"
        self.patterns_file = self.data_dir / "strategy_patterns.json"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize experience replay buffer
        self.replay_buffer = deque(maxlen=self.config["replay_buffer_size"])
        
        # Initialize pattern clusters
        self.pattern_clusters = None
        self.scaler = StandardScaler()
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from .YAML file."""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.logger.error(f"Error loading config: {str(e)}")
            return {
                "replay_buffer_size": 1000,
                "min_episodes_for_learning": 50,
                "pattern_update_interval": 100,
                "success_threshold": 0.7,
                "efficiency_threshold": 0.6,
                "learning_weights": {
                    "success": 0.6,
                    "efficiency": 0.3,
                    "novelty": 0.1
                }
            }
    
    def record_episode(self, episode: LearningEpisode) -> bool:
        """Record a learning episode."""
        try:
            # Add to replay buffer
            self.replay_buffer.append(episode)
            
            # Save to file
            episodes = []
            if self.episodes_file.exists():
                with open(self.episodes_file, 'r') as f:
                    episodes = json.load(f)
            
            episodes.append({
                "episode_id": episode.episode_id,
                "timestamp": episode.timestamp.isoformat(),
                "agent_id": episode.agent_id,
                "strategy": episode.strategy,
                "context": episode.context,
                "actions": episode.actions,
                "outcomes": episode.outcomes,
                "success_score": episode.success_score,
                "efficiency_score": episode.efficiency_score,
                "learning_points": episode.learning_points
            })
            
            with open(self.episodes_file, 'w') as f:
                json.dump(episodes, f, indent=2)
            
            # Check if we have enough episodes for learning
            if len(self.replay_buffer) >= self.config["min_episodes_for_learning"]:
                self._update_strategy_patterns()
            
            return True
        except Exception as e:
            self.logger.error(f"Error recording episode: {str(e)}")
            return False
    
    def _update_strategy_patterns(self) -> None:
        """Update strategy patterns based on recent episodes."""
        try:
            # Convert episodes to feature vectors
            features = self._extract_features(self.replay_buffer)
            
            if len(features) < self.config["min_episodes_for_learning"]:
                return
            
            # Scale features
            scaled_features = self.scaler.fit_transform(features)
            
            # Cluster episodes
            n_clusters = min(10, len(features) // 5)  # Adjust number of clusters
            kmeans = KMeans(n_clusters=n_clusters, random_state=42)
            clusters = kmeans.fit_predict(scaled_features)
            
            # Extract patterns from .clusters
            patterns = []
            for cluster_id in range(n_clusters):
                cluster_episodes = [
                    ep for ep, c in zip(self.replay_buffer, clusters)
                    if c == cluster_id
                ]
                
                if not cluster_episodes:
                    continue
                
                # Calculate pattern statistics
                success_rates = [ep.success_score for ep in cluster_episodes]
                efficiency_scores = [ep.efficiency_score for ep in cluster_episodes]
                
                pattern = StrategyPattern(
                    pattern_id=f"pattern_{cluster_id}_{datetime.now().strftime('%Y%m%d')}",
                    context_features=self._extract_common_features(cluster_episodes),
                    strategy_components=self._extract_common_strategies(cluster_episodes),
                    success_rate=np.mean(success_rates),
                    efficiency_score=np.mean(efficiency_scores),
                    usage_count=len(cluster_episodes),
                    last_used=datetime.now(),
                    confidence=min(1.0, len(cluster_episodes) / 100)  # Cap confidence at 1.0
                )
                
                patterns.append(pattern)
            
            # Save patterns
            self._save_patterns(patterns)
            
        except Exception as e:
            self.logger.error(f"Error updating strategy patterns: {str(e)}")
    
    def _extract_features(self, episodes: List[LearningEpisode]) -> np.ndarray:
        """Extract features from .episodes for clustering."""
        features = []
        for episode in episodes:
            # Extract numerical features from .context and outcomes
            feature_vector = [
                episode.success_score,
                episode.efficiency_score,
                len(episode.actions),
                len(episode.learning_points)
            ]
            
            # Add context features
            for key in ["complexity", "urgency", "importance"]:
                feature_vector.append(episode.context.get(key, 0))
            
            features.append(feature_vector)
        
        return np.array(features)
    
    def _extract_common_features(self, episodes: List[LearningEpisode]) -> List[str]:
        """Extract common features from .a cluster of episodes."""
        feature_counts = {}
        for episode in episodes:
            for key in episode.context.keys():
                feature_counts[key] = feature_counts.get(key, 0) + 1
        
        # Return features that appear in at least 50% of episodes
        threshold = len(episodes) * 0.5
        return [
            feature for feature, count in feature_counts.items()
            if count >= threshold
        ]
    
    def _extract_common_strategies(self, episodes: List[LearningEpisode]) -> Dict[str, Any]:
        """Extract common strategy components from .a cluster of episodes."""
        strategy_components = {}
        for episode in episodes:
            for key, value in episode.strategy.items():
                if key not in strategy_components:
                    strategy_components[key] = []
                strategy_components[key].append(value)
        
        # Calculate most common values for each component
        common_strategies = {}
        for key, values in strategy_components.items():
            if len(values) > len(episodes) * 0.5:  # Appears in majority of episodes
                if isinstance(values[0], (int, float)):
                    common_strategies[key] = np.mean(values)
                else:
                    common_strategies[key] = max(set(values), key=values.count)
        
        return common_strategies
    
    def _save_patterns(self, patterns: List[StrategyPattern]) -> None:
        """Save strategy patterns to file."""
        try:
            pattern_data = [
                {
                    "pattern_id": pattern.pattern_id,
                    "context_features": pattern.context_features,
                    "strategy_components": pattern.strategy_components,
                    "success_rate": pattern.success_rate,
                    "efficiency_score": pattern.efficiency_score,
                    "usage_count": pattern.usage_count,
                    "last_used": pattern.last_used.isoformat(),
                    "confidence": pattern.confidence
                }
                for pattern in patterns
            ]
            
            with open(self.patterns_file, 'w') as f:
                json.dump(pattern_data, f, indent=2)
        
        except Exception as e:
            self.logger.error(f"Error saving patterns: {str(e)}")
    
    def get_recommended_strategy(self, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get recommended strategy based on context and learned patterns."""
        try:
            if not self.patterns_file.exists():
                return None
            
            with open(self.patterns_file, 'r') as f:
                patterns = json.load(f)
            
            if not patterns:
                return None
            
            # Find matching patterns
            matching_patterns = []
            for pattern in patterns:
                # Check if context matches pattern features
                matches = all(
                    feature in context
                    for feature in pattern["context_features"]
                )
                
                if matches:
                    matching_patterns.append(pattern)
            
            if not matching_patterns:
                return None
            
            # Select best pattern based on success rate and confidence
            best_pattern = max(
                matching_patterns,
                key=lambda p: (
                    p["success_rate"] * 0.7 +
                    p["confidence"] * 0.3
                )
            )
            
            return best_pattern["strategy_components"]
        
        except Exception as e:
            self.logger.error(f"Error getting recommended strategy: {str(e)}")
            return None
    
    def evaluate_strategy(self, strategy: Dict[str, Any], outcomes: Dict[str, float]) -> Tuple[float, float]:
        """Evaluate a strategy's success and efficiency."""
        try:
            # Calculate success score
            success_score = min(1.0, outcomes.get("success", 0))
            
            # Calculate efficiency score
            time_efficiency = 1.0 - min(1.0, outcomes.get("time_spent", 0) / outcomes.get("time_budget", 1))
            resource_efficiency = 1.0 - min(1.0, outcomes.get("resources_used", 0) / outcomes.get("resource_budget", 1))
            efficiency_score = (time_efficiency + resource_efficiency) / 2
            
            return success_score, efficiency_score
        
        except Exception as e:
            self.logger.error(f"Error evaluating strategy: {str(e)}")
            return 0.0, 0.0
    
    def run(self) -> bool:
        """Main execution method for the plugin."""
        try:
            # Load existing episodes
            if self.episodes_file.exists():
                with open(self.episodes_file, 'r') as f:
                    episodes = json.load(f)
                
                # Add to replay buffer
                for episode_data in episodes[-self.config["replay_buffer_size"]:]:
                    episode = LearningEpisode(
                        episode_id=episode_data["episode_id"],
                        timestamp=datetime.fromisoformat(episode_data["timestamp"]),
                        agent_id=episode_data["agent_id"],
                        strategy=episode_data["strategy"],
                        context=episode_data["context"],
                        actions=episode_data["actions"],
                        outcomes=episode_data["outcomes"],
                        success_score=episode_data["success_score"],
                        efficiency_score=episode_data["efficiency_score"],
                        learning_points=episode_data["learning_points"]
                    )
                    self.replay_buffer.append(episode)
            
            # Update patterns if we have enough episodes
            if len(self.replay_buffer) >= self.config["min_episodes_for_learning"]:
                self._update_strategy_patterns()
            
            return True
        except Exception as e:
            self.logger.error(f"Error in meta learning manager: {str(e)}")
            return False

# Plugin entry point
def run_plugin() -> bool:
    """Entry point for the plugin."""
    manager = MetaLearningManager()
    return manager.run()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = run_plugin()
    print(f"Meta Learning Manager completed {'successfully' if success else 'with errors'}") 