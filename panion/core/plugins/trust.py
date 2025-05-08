"""
Plugin Trust System
Manages plugin trust scores and adaptation.
"""

from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import math

@dataclass
class TrustScore:
    """Represents a plugin's trust score."""
    plugin_id: str
    score: float = 1.0  # Initial trust score
    reliability: float = 1.0  # Reliability factor
    performance: float = 1.0  # Performance factor
    security: float = 1.0  # Security factor
    last_updated: datetime = field(default_factory=datetime.utcnow)
    history: List[Dict[str, Any]] = field(default_factory=list)
    max_history_size: int = 100

class TrustManager:
    """Manages plugin trust scores and adaptation."""
    
    def __init__(self):
        self.trust_scores: Dict[str, TrustScore] = {}
        self.adaptation_rules: Dict[str, Dict[str, Any]] = {}
        self.min_trust_score = 0.1
        self.max_trust_score = 1.0
        self.decay_factor = 0.95  # Trust score decay per day
        self.reliability_weight = 0.4
        self.performance_weight = 0.3
        self.security_weight = 0.3
    
    def register_plugin(self, plugin_id: str) -> TrustScore:
        """Register a new plugin with initial trust score."""
        if plugin_id in self.trust_scores:
            return self.trust_scores[plugin_id]
        
        score = TrustScore(plugin_id=plugin_id)
        self.trust_scores[plugin_id] = score
        return score
    
    def update_trust_score(self, plugin_id: str, 
                          reliability_delta: float = 0,
                          performance_delta: float = 0,
                          security_delta: float = 0) -> Optional[TrustScore]:
        """Update a plugin's trust score based on various factors."""
        score = self.trust_scores.get(plugin_id)
        if not score:
            return None
        
        # Apply time decay
        days_since_update = (datetime.utcnow() - score.last_updated).days
        if days_since_update > 0:
            decay = math.pow(self.decay_factor, days_since_update)
            score.score *= decay
            score.reliability *= decay
            score.performance *= decay
            score.security *= decay
        
        # Update individual factors
        score.reliability = max(0.0, min(1.0, score.reliability + reliability_delta))
        score.performance = max(0.0, min(1.0, score.performance + performance_delta))
        score.security = max(0.0, min(1.0, score.security + security_delta))
        
        # Calculate new trust score
        score.score = (
            score.reliability * self.reliability_weight +
            score.performance * self.performance_weight +
            score.security * self.security_weight
        )
        
        # Ensure score is within bounds
        score.score = max(self.min_trust_score, min(self.max_trust_score, score.score))
        
        # Update timestamp
        score.last_updated = datetime.utcnow()
        
        # Record history
        score.history.append({
            'timestamp': datetime.utcnow(),
            'score': score.score,
            'reliability': score.reliability,
            'performance': score.performance,
            'security': score.security
        })
        
        # Trim history if needed
        if len(score.history) > score.max_history_size:
            score.history = score.history[-score.max_history_size:]
        
        return score
    
    def get_trust_score(self, plugin_id: str) -> Optional[TrustScore]:
        """Get a plugin's current trust score."""
        return self.trust_scores.get(plugin_id)
    
    def register_adaptation_rule(self, plugin_id: str, 
                               rule: Dict[str, Any]) -> bool:
        """Register an adaptation rule for a plugin."""
        if plugin_id not in self.trust_scores:
            return False
        
        self.adaptation_rules[plugin_id] = rule
        return True
    
    def get_adaptation_rule(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get the adaptation rule for a plugin."""
        return self.adaptation_rules.get(plugin_id)
    
    def should_adapt(self, plugin_id: str) -> bool:
        """Determine if a plugin should be adapted based on trust score."""
        score = self.get_trust_score(plugin_id)
        if not score:
            return False
        
        rule = self.get_adaptation_rule(plugin_id)
        if not rule:
            return False
        
        # Check if trust score is below adaptation threshold
        return score.score < rule.get('adaptation_threshold', 0.5)
    
    def get_adaptation_strategy(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get the adaptation strategy for a plugin."""
        if not self.should_adapt(plugin_id):
            return None
        
        rule = self.get_adaptation_rule(plugin_id)
        if not rule:
            return None
        
        return {
            'strategy': rule.get('strategy', 'fallback'),
            'parameters': rule.get('parameters', {}),
            'fallback_plugin': rule.get('fallback_plugin'),
            'retry_count': rule.get('retry_count', 3),
            'timeout': rule.get('timeout', 30)
        }
    
    def get_trust_stats(self) -> Dict[str, Any]:
        """Get statistics about plugin trust scores."""
        return {
            'total_plugins': len(self.trust_scores),
            'average_trust_score': sum(s.score for s in self.trust_scores.values()) / len(self.trust_scores),
            'low_trust_plugins': len([s for s in self.trust_scores.values() if s.score < 0.5]),
            'high_trust_plugins': len([s for s in self.trust_scores.values() if s.score >= 0.8]),
            'plugins_needing_adaptation': len([p for p in self.trust_scores.keys() if self.should_adapt(p)])
        }

# Create global trust manager instance
trust_manager = TrustManager() 