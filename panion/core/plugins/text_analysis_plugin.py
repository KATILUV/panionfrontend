"""
Text Analysis Plugin
Handles text analysis tasks including key phrase extraction, entity identification, and sentiment analysis.
"""

import logging
from dataclasses import dataclass
from typing import Dict, Any, List, Optional
import re
from collections import Counter

@dataclass
class PluginResult:
    """Result of plugin execution."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class TextAnalysisPlugin:
    """Plugin for text analysis tasks."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize text analysis plugin.
        
        Args:
            config: Plugin configuration
        """
        self.config = config
        self.logger = logging.getLogger(__name__)
    
    async def execute(self, input_data: Dict[str, Any]) -> PluginResult:
        """Execute text analysis.
        
        Args:
            input_data: Input data containing text to analyze
            
        Returns:
            PluginResult: Analysis results
        """
        try:
            content = input_data.get("content")
            if not content:
                raise ValueError("No content provided")
            
            parameters = input_data.get("parameters", {})
            results = {}
            
            if parameters.get("extract_key_phrases"):
                results["key_phrases"] = self._extract_key_phrases(content)
            
            if parameters.get("identify_entities"):
                results["entities"] = self._identify_entities(content)
            
            if parameters.get("analyze_sentiment"):
                results["sentiment"] = self._analyze_sentiment(content)
            
            return PluginResult(
                success=True,
                data=results
            )
            
        except Exception as e:
            self.logger.error(f"Text analysis failed: {str(e)}")
            return PluginResult(
                success=False,
                error=str(e)
            )
    
    def _extract_key_phrases(self, text: str) -> List[str]:
        """Extract key phrases from text.
        
        Args:
            text: Input text
            
        Returns:
            List[str]: Key phrases
        """
        # Simple implementation using word frequency
        words = re.findall(r'\b\w+\b', text.lower())
        word_freq = Counter(words)
        
        # Filter out common words and short words
        common_words = {'the', 'and', 'is', 'in', 'to', 'of', 'a', 'an', 'for', 'with'}
        key_phrases = [
            word for word, freq in word_freq.items()
            if word not in common_words and len(word) > 3
        ]
        
        return sorted(key_phrases, key=lambda x: word_freq[x], reverse=True)[:10]
    
    def _identify_entities(self, text: str) -> Dict[str, List[str]]:
        """Identify entities in text.
        
        Args:
            text: Input text
            
        Returns:
            Dict[str, List[str]]: Identified entities by type
        """
        entities = {
            "organizations": [],
            "technologies": [],
            "concepts": []
        }
        
        # Simple pattern matching for demonstration
        org_pattern = r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b'
        tech_pattern = r'\b(?:AI|ML|algorithm|system|platform|technology)\b'
        concept_pattern = r'\b(?:data|insight|pattern|analysis|processing)\b'
        
        entities["organizations"] = re.findall(org_pattern, text)
        entities["technologies"] = re.findall(tech_pattern, text, re.IGNORECASE)
        entities["concepts"] = re.findall(concept_pattern, text, re.IGNORECASE)
        
        return entities
    
    def _analyze_sentiment(self, text: str) -> Dict[str, float]:
        """Analyze text sentiment.
        
        Args:
            text: Input text
            
        Returns:
            Dict[str, float]: Sentiment scores
        """
        # Simple sentiment analysis using word lists
        positive_words = {'advanced', 'designed', 'meaningful', 'modern', 'best'}
        negative_words = {'complex', 'difficult', 'challenging', 'error', 'issue'}
        
        words = set(re.findall(r'\b\w+\b', text.lower()))
        
        positive_count = len(words.intersection(positive_words))
        negative_count = len(words.intersection(negative_words))
        total_count = positive_count + negative_count
        
        if total_count == 0:
            return {
                "positive": 0.5,
                "negative": 0.5,
                "neutral": 1.0
            }
        
        positive_score = positive_count / total_count
        negative_score = negative_count / total_count
        neutral_score = 1.0 - (positive_score + negative_score)
        
        return {
            "positive": positive_score,
            "negative": negative_score,
            "neutral": neutral_score
        } 