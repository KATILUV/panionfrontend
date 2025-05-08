import os
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Optional
from enum import Enum

from ..panion_core.common_types import PluginConfig, TrustLevel
from .resource_manager import ResourceManager
from .system_manager import SystemManager
from .capability_registry import CapabilityRegistry

@dataclass
class TrustMetrics:
    """Metrics used to calculate plugin trust level."""
    execution_success_rate: float = 0.0
    error_rate: float = 0.0
    resource_usage_compliance: float = 0.0
    capability_verification: float = 0.0
    security_score: float = 0.0
    user_rating: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)

class PluginTrust:
    """Manages trust levels and verification of plugins."""
    
    def __init__(self):
        self.logger = logging.getLogger("PluginTrust")
        self._setup_logging()
        
        # Initialize managers
        self.resource_manager = ResourceManager()
        self.system_manager = SystemManager()
        self.capability_registry = CapabilityRegistry()
        
        # Plugin trust data
        self.plugin_metrics: Dict[str, TrustMetrics] = {}
        self.trust_thresholds = {
            TrustLevel.VERIFIED: 0.95,
            TrustLevel.HIGH: 0.8,
            TrustLevel.MEDIUM: 0.6,
            TrustLevel.LOW: 0.4,
            TrustLevel.UNTRUSTED: 0.0
        }
    
    def _setup_logging(self) -> None:
        """Setup logging for Plugin Trust Manager."""
        log_file = os.path.join("logs", "plugin_trust.log")
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    def evaluate_plugin(self, plugin: PluginConfig) -> TrustLevel:
        """Evaluate plugin and determine trust level."""
        try:
            # Get or create metrics
            metrics = self.plugin_metrics.get(plugin.name, TrustMetrics())
            
            # Calculate trust score
            trust_score = self._calculate_trust_score(metrics)
            
            # Determine trust level
            for level in TrustLevel:
                if trust_score >= self.trust_thresholds[level]:
                    return level
            
            return TrustLevel.UNTRUSTED
            
        except Exception as e:
            self.logger.error(f"Error evaluating plugin {plugin.name}: {str(e)}")
            return TrustLevel.UNTRUSTED
    
    def _calculate_trust_score(self, metrics: TrustMetrics) -> float:
        """Calculate overall trust score from metrics."""
        weights = {
            'execution_success_rate': 0.25,
            'error_rate': 0.20,
            'resource_usage_compliance': 0.15,
            'capability_verification': 0.15,
            'security_score': 0.15,
            'user_rating': 0.10
        }
        
        score = (
            weights['execution_success_rate'] * metrics.execution_success_rate +
            weights['error_rate'] * (1 - metrics.error_rate) +
            weights['resource_usage_compliance'] * metrics.resource_usage_compliance +
            weights['capability_verification'] * metrics.capability_verification +
            weights['security_score'] * metrics.security_score +
            weights['user_rating'] * metrics.user_rating
        )
        
        return max(0.0, min(1.0, score))
    
    def update_metrics(self, plugin_name: str, metric_updates: Dict[str, float]) -> None:
        """Update trust metrics for a plugin."""
        try:
            metrics = self.plugin_metrics.get(plugin_name, TrustMetrics())
            
            for metric, value in metric_updates.items():
                if hasattr(metrics, metric):
                    setattr(metrics, metric, value)
            
            metrics.last_updated = datetime.now()
            self.plugin_metrics[plugin_name] = metrics
            
        except Exception as e:
            self.logger.error(f"Error updating metrics for {plugin_name}: {str(e)}")
    
    def verify_capabilities(self, plugin: PluginConfig) -> bool:
        """Verify plugin capabilities against registry."""
        try:
            for capability in plugin.capabilities:
                if not self.capability_registry.verify_capability(capability):
                    return False
            return True
            
        except Exception as e:
            self.logger.error(f"Error verifying capabilities for {plugin.name}: {str(e)}")
            return False
    
    def check_resource_usage(self, plugin: PluginConfig) -> bool:
        """Check if plugin's resource usage is within acceptable limits."""
        try:
            return self.resource_manager.check_plugin_resources(plugin.name)
        except Exception as e:
            self.logger.error(f"Error checking resource usage for {plugin.name}: {str(e)}")
            return False
    
    def get_plugin_metrics(self, plugin_name: str) -> Optional[TrustMetrics]:
        """Get trust metrics for a plugin."""
        return self.plugin_metrics.get(plugin_name)
    
    def reset_metrics(self, plugin_name: str) -> None:
        """Reset trust metrics for a plugin."""
        if plugin_name in self.plugin_metrics:
            self.plugin_metrics[plugin_name] = TrustMetrics()
            self.logger.info(f"Reset trust metrics for plugin: {plugin_name}") 