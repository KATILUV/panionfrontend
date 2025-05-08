"""
Reflection Analyzer
Provides advanced reflection analysis and summarization capabilities.
"""

import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import json
from pathlib import Path
from collections import defaultdict
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import DBSCAN
import numpy as np

logger = logging.getLogger(__name__)

@dataclass
class ReflectionPattern:
    """Represents a pattern found in reflections."""
    pattern_id: str
    pattern_type: str
    confidence: float
    occurrences: List[Dict[str, Any]]
    summary: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

class ReflectionAnalyzer:
    """Analyzes reflections to extract patterns and insights."""
    
    def __init__(self, data_dir: str = "data/reflections"):
        self.logger = logging.getLogger(__name__)
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize storage
        self.patterns: Dict[str, ReflectionPattern] = {}
        self.insights: List[Dict[str, Any]] = []
        
        # Load existing patterns
        self._load_patterns()
        
        # Initialize text analysis components
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
    
    def _load_patterns(self) -> None:
        """Load existing patterns from disk."""
        try:
            patterns_file = self.data_dir / "patterns.json"
            if patterns_file.exists():
                with open(patterns_file, 'r') as f:
                    patterns_data = json.load(f)
                    
                for pattern_id, pattern_data in patterns_data.items():
                    self.patterns[pattern_id] = ReflectionPattern(
                        pattern_id=pattern_id,
                        pattern_type=pattern_data["pattern_type"],
                        confidence=pattern_data["confidence"],
                        occurrences=pattern_data["occurrences"],
                        summary=pattern_data["summary"],
                        metadata=pattern_data["metadata"],
                        created_at=datetime.fromisoformat(pattern_data["created_at"]),
                        updated_at=datetime.fromisoformat(pattern_data["updated_at"])
                    )
            
            self.logger.info(f"Loaded {len(self.patterns)} patterns")
            
        except Exception as e:
            self.logger.error(f"Error loading patterns: {e}")
    
    def analyze_reflections(self, reflections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze a set of reflections to extract patterns and insights.
        
        Args:
            reflections: List of reflections to analyze
            
        Returns:
            Dictionary containing analysis results
        """
        try:
            # Extract text content
            texts = [r.get("thought", "") for r in reflections]
            
            # Convert to TF-IDF vectors
            vectors = self.vectorizer.fit_transform(texts)
            
            # Cluster similar reflections
            clusters = self._cluster_reflections(vectors)
            
            # Extract patterns from clusters
            patterns = self._extract_patterns(reflections, clusters)
            
            # Generate insights
            insights = self._generate_insights(patterns)
            
            # Update stored patterns
            self._update_patterns(patterns)
            
            return {
                "patterns": [p.__dict__ for p in patterns],
                "insights": insights,
                "cluster_count": len(clusters),
                "pattern_count": len(patterns)
            }
            
        except Exception as e:
            self.logger.error(f"Error analyzing reflections: {e}")
            return {
                "error": str(e),
                "patterns": [],
                "insights": []
            }
    
    def _cluster_reflections(self, vectors) -> List[List[int]]:
        """Cluster similar reflections using DBSCAN.
        
        Args:
            vectors: TF-IDF vectors of reflections
            
        Returns:
            List of clusters, each containing indices of similar reflections
        """
        # Convert to dense matrix
        dense_vectors = vectors.toarray()
        
        # Cluster using DBSCAN
        clustering = DBSCAN(
            eps=0.3,
            min_samples=2,
            metric='cosine'
        ).fit(dense_vectors)
        
        # Group indices by cluster
        clusters = defaultdict(list)
        for idx, label in enumerate(clustering.labels_):
            if label != -1:  # Skip noise points
                clusters[label].append(idx)
        
        return list(clusters.values())
    
    def _extract_patterns(self, reflections: List[Dict[str, Any]], clusters: List[List[int]]) -> List[ReflectionPattern]:
        """Extract patterns from reflection clusters.
        
        Args:
            reflections: List of reflections
            clusters: List of clusters containing reflection indices
            
        Returns:
            List of extracted patterns
        """
        patterns = []
        
        for cluster_idx, cluster in enumerate(clusters):
            # Get reflections in cluster
            cluster_reflections = [reflections[i] for i in cluster]
            
            # Extract common themes
            themes = self._extract_themes(cluster_reflections)
            
            # Calculate pattern confidence
            confidence = min(len(cluster) / 5.0, 1.0)  # Cap at 5 occurrences
            
            # Create pattern
            pattern = ReflectionPattern(
                pattern_id=f"pattern_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{cluster_idx}",
                pattern_type="theme",
                confidence=confidence,
                occurrences=cluster_reflections,
                summary=self._generate_pattern_summary(cluster_reflections, themes),
                metadata={
                    "themes": themes,
                    "cluster_size": len(cluster),
                    "time_span": self._calculate_time_span(cluster_reflections)
                }
            )
            
            patterns.append(pattern)
        
        return patterns
    
    def _extract_themes(self, reflections: List[Dict[str, Any]]) -> List[str]:
        """Extract common themes from reflections.
        
        Args:
            reflections: List of reflections
            
        Returns:
            List of identified themes
        """
        # Combine all text
        combined_text = " ".join(r.get("thought", "") for r in reflections)
        
        # Extract key phrases
        key_phrases = self._extract_key_phrases(combined_text)
        
        # Group similar phrases
        themes = self._group_similar_phrases(key_phrases)
        
        return themes
    
    def _extract_key_phrases(self, text: str) -> List[str]:
        """Extract key phrases from text.
        
        Args:
            text: Text to analyze
            
        Returns:
            List of key phrases
        """
        # Convert to TF-IDF
        vectors = self.vectorizer.fit_transform([text])
        
        # Get feature names
        feature_names = self.vectorizer.get_feature_names_out()
        
        # Get top phrases
        scores = vectors.toarray()[0]
        top_indices = np.argsort(scores)[-10:]  # Get top 10 phrases
        
        return [feature_names[i] for i in top_indices]
    
    def _group_similar_phrases(self, phrases: List[str]) -> List[str]:
        """Group similar phrases into themes.
        
        Args:
            phrases: List of phrases to group
            
        Returns:
            List of grouped themes
        """
        # Convert to vectors
        vectors = self.vectorizer.fit_transform(phrases)
        
        # Cluster similar phrases
        clustering = DBSCAN(
            eps=0.3,
            min_samples=1,
            metric='cosine'
        ).fit(vectors)
        
        # Group phrases by cluster
        clusters = defaultdict(list)
        for idx, label in enumerate(clustering.labels_):
            clusters[label].append(phrases[idx])
        
        # Select representative phrase for each cluster
        themes = []
        for cluster in clusters.values():
            # Use longest phrase as representative
            themes.append(max(cluster, key=len))
        
        return themes
    
    def _generate_pattern_summary(self, reflections: List[Dict[str, Any]], themes: List[str]) -> str:
        """Generate summary for a pattern.
        
        Args:
            reflections: List of reflections in pattern
            themes: Identified themes
            
        Returns:
            Pattern summary
        """
        # Get common metadata
        common_metadata = self._find_common_metadata(reflections)
        
        # Generate summary
        summary_parts = [
            f"Pattern identified with {len(reflections)} occurrences",
            f"Themes: {', '.join(themes)}"
        ]
        
        if common_metadata:
            summary_parts.append(f"Common elements: {', '.join(common_metadata)}")
        
        return " | ".join(summary_parts)
    
    def _find_common_metadata(self, reflections: List[Dict[str, Any]]) -> List[str]:
        """Find common metadata elements across reflections.
        
        Args:
            reflections: List of reflections
            
        Returns:
            List of common metadata elements
        """
        # Count metadata occurrences
        metadata_counts = defaultdict(int)
        for reflection in reflections:
            metadata = reflection.get("metadata", {})
            for key, value in metadata.items():
                if isinstance(value, (str, int, float, bool)):
                    metadata_counts[f"{key}={value}"] += 1
        
        # Find common elements (appear in >50% of reflections)
        threshold = len(reflections) * 0.5
        return [
            element for element, count in metadata_counts.items()
            if count > threshold
        ]
    
    def _calculate_time_span(self, reflections: List[Dict[str, Any]]) -> str:
        """Calculate time span of reflections.
        
        Args:
            reflections: List of reflections
            
        Returns:
            Time span description
        """
        timestamps = []
        for reflection in reflections:
            timestamp = reflection.get("timestamp")
            if timestamp:
                if isinstance(timestamp, str):
                    timestamp = datetime.fromisoformat(timestamp)
                timestamps.append(timestamp)
        
        if not timestamps:
            return "unknown"
        
        min_time = min(timestamps)
        max_time = max(timestamps)
        span = max_time - min_time
        
        if span.days > 0:
            return f"{span.days} days"
        elif span.seconds > 3600:
            return f"{span.seconds // 3600} hours"
        else:
            return f"{span.seconds // 60} minutes"
    
    def _generate_insights(self, patterns: List[ReflectionPattern]) -> List[Dict[str, Any]]:
        """Generate insights from patterns.
        
        Args:
            patterns: List of patterns
            
        Returns:
            List of insights
        """
        insights = []
        
        for pattern in patterns:
            if pattern.confidence >= 0.7:  # Only use high-confidence patterns
                insight = {
                    "pattern_id": pattern.pattern_id,
                    "summary": pattern.summary,
                    "confidence": pattern.confidence,
                    "themes": pattern.metadata.get("themes", []),
                    "occurrence_count": len(pattern.occurrences),
                    "time_span": pattern.metadata.get("time_span"),
                    "created_at": datetime.now().isoformat()
                }
                insights.append(insight)
        
        return insights
    
    def _update_patterns(self, new_patterns: List[ReflectionPattern]) -> None:
        """Update stored patterns with new ones.
        
        Args:
            new_patterns: List of new patterns
        """
        # Add new patterns
        for pattern in new_patterns:
            self.patterns[pattern.pattern_id] = pattern
        
        # Save to disk
        try:
            patterns_file = self.data_dir / "patterns.json"
            with open(patterns_file, 'w') as f:
                json.dump({
                    pattern_id: {
                        "pattern_type": pattern.pattern_type,
                        "confidence": pattern.confidence,
                        "occurrences": pattern.occurrences,
                        "summary": pattern.summary,
                        "metadata": pattern.metadata,
                        "created_at": pattern.created_at.isoformat(),
                        "updated_at": pattern.updated_at.isoformat()
                    }
                    for pattern_id, pattern in self.patterns.items()
                }, f, indent=2)
            
        except Exception as e:
            self.logger.error(f"Error saving patterns: {e}")
    
    def get_patterns(self, min_confidence: float = 0.0) -> List[Dict[str, Any]]:
        """Get stored patterns.
        
        Args:
            min_confidence: Minimum confidence threshold
            
        Returns:
            List of patterns meeting confidence threshold
        """
        return [
            pattern.__dict__
            for pattern in self.patterns.values()
            if pattern.confidence >= min_confidence
        ]
    
    def get_insights(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent insights.
        
        Args:
            limit: Maximum number of insights to return
            
        Returns:
            List of recent insights
        """
        return sorted(
            self.insights,
            key=lambda x: x["created_at"],
            reverse=True
        )[:limit]

# Create global instance
reflection_analyzer = ReflectionAnalyzer() 