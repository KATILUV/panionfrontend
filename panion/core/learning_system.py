"""
Learning System
Handles pattern recognition, learning, and optimization.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
import json
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass
class Pattern:
    """A learned pattern."""
    pattern_type: str
    features: Dict[str, Any]
    success_rate: float
    last_updated: datetime
    usage_count: int = 0

@dataclass
class LearningSystem:
    """Learning system for pattern recognition and optimization."""
    patterns: Dict[str, List[Pattern]] = field(default_factory=dict)
    data_file: Path = Path("data/learning_data.json")
    
    def __post_init__(self):
        """Initialize learning system."""
        self.data_file.parent.mkdir(exist_ok=True)
        self._load_patterns()
    
    def _load_patterns(self) -> None:
        """Load patterns from file."""
        try:
            if self.data_file.exists():
                with open(self.data_file) as f:
                    data = json.load(f)
                    for pattern_type, patterns in data.items():
                        self.patterns[pattern_type] = [
                            Pattern(
                                pattern_type=pattern_type,
                                last_updated=datetime.fromisoformat(p["last_updated"]),
                                **{k: v for k, v in p.items() 
                                   if k not in ["pattern_type", "last_updated"]}
                            )
                            for p in patterns
                        ]
        except Exception as e:
            logger.error(f"Error loading patterns: {e}")
    
    def _save_patterns(self) -> None:
        """Save patterns to file."""
        try:
            with open(self.data_file, "w") as f:
                json.dump(
                    {
                        pattern_type: [
                            {
                                **pattern.__dict__,
                                "last_updated": pattern.last_updated.isoformat()
                            }
                            for pattern in patterns
                        ]
                        for pattern_type, patterns in self.patterns.items()
                    },
                    f,
                    indent=2
                )
        except Exception as e:
            logger.error(f"Error saving patterns: {e}")
    
    def learn_pattern(
        self,
        pattern_type: str,
        features: Dict[str, Any],
        success: bool
    ) -> None:
        """Learn a new pattern.
        
        Args:
            pattern_type: Type of pattern
            features: Pattern features
            success: Whether pattern was successful
        """
        if pattern_type not in self.patterns:
            self.patterns[pattern_type] = []
        
        # Find similar pattern
        similar_pattern = None
        for pattern in self.patterns[pattern_type]:
            if self._compare_features(pattern.features, features):
                similar_pattern = pattern
                break
        
        if similar_pattern:
            # Update existing pattern
            similar_pattern.usage_count += 1
            similar_pattern.success_rate = (
                (similar_pattern.success_rate * (similar_pattern.usage_count - 1) + 
                 (1.0 if success else 0.0)) / similar_pattern.usage_count
            )
            similar_pattern.last_updated = datetime.now()
        else:
            # Create new pattern
            pattern = Pattern(
                pattern_type=pattern_type,
                features=features,
                success_rate=1.0 if success else 0.0,
                last_updated=datetime.now(),
                usage_count=1
            )
            self.patterns[pattern_type].append(pattern)
        
        self._save_patterns()
    
    def get_best_pattern(
        self,
        pattern_type: str,
        features: Dict[str, Any]
    ) -> Optional[Pattern]:
        """Get best matching pattern.
        
        Args:
            pattern_type: Type of pattern
            features: Pattern features
            
        Returns:
            Optional[Pattern]: Best matching pattern if found
        """
        if pattern_type not in self.patterns:
            return None
        
        best_pattern = None
        best_score = 0.0
        
        for pattern in self.patterns[pattern_type]:
            score = self._compare_features(pattern.features, features)
            if score > best_score:
                best_score = score
                best_pattern = pattern
        
        return best_pattern
    
    def _compare_features(
        self,
        pattern_features: Dict[str, Any],
        input_features: Dict[str, Any]
    ) -> float:
        """Compare feature sets.
        
        Args:
            pattern_features: Pattern features
            input_features: Input features
            
        Returns:
            float: Similarity score between 0 and 1
        """
        if not pattern_features or not input_features:
            return 0.0
        
        matches = 0
        total = 0
        
        for key, value in pattern_features.items():
            if key in input_features:
                total += 1
                if input_features[key] == value:
                    matches += 1
        
        return matches / total if total > 0 else 0.0

# Create global learning system instance
learning_system = LearningSystem() 