"""
Content Extraction Plugin
Handles content extraction from text.
"""

import logging
import re
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class PluginResult:
    """Result from plugin execution."""
    success: bool
    data: Dict[str, Any]
    error: Optional[str] = None

class ContentExtractionPlugin:
    """Plugin for extracting content from text."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize plugin.
        
        Args:
            config: Plugin configuration
        """
        self.config = config
    
    async def execute(self, input_data: Dict[str, Any]) -> PluginResult:
        """Execute plugin.
        
        Args:
            input_data: Input data containing text to extract from
            
        Returns:
            PluginResult: Result of plugin execution
        """
        try:
            # Get content
            content = input_data.get('content', '')
            if not content:
                raise ValueError("No content provided")
            
            # Extract content based on configuration
            extracted = {}
            
            # Extract URLs
            if self.config.get('extract_urls', True):
                extracted['urls'] = self._extract_urls(content)
            
            # Extract emails
            if self.config.get('extract_emails', True):
                extracted['emails'] = self._extract_emails(content)
            
            # Extract phone numbers
            if self.config.get('extract_phones', True):
                extracted['phones'] = self._extract_phones(content)
            
            # Extract dates
            if self.config.get('extract_dates', True):
                extracted['dates'] = self._extract_dates(content)
            
            # Extract key phrases
            if self.config.get('extract_key_phrases', True):
                extracted['key_phrases'] = self._extract_key_phrases(content)
            
            return PluginResult(
                success=True,
                data=extracted
            )
            
        except Exception as e:
            logger.error(f"Content extraction failed: {e}")
            return PluginResult(
                success=False,
                data={},
                error=str(e)
            )
    
    def _extract_urls(self, content: str) -> List[str]:
        """Extract URLs from content."""
        url_pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+'
        return re.findall(url_pattern, content)
    
    def _extract_emails(self, content: str) -> List[str]:
        """Extract email addresses from content."""
        email_pattern = r'[\w\.-]+@[\w\.-]+\.\w+'
        return re.findall(email_pattern, content)
    
    def _extract_phones(self, content: str) -> List[str]:
        """Extract phone numbers from content."""
        phone_pattern = r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'
        return re.findall(phone_pattern, content)
    
    def _extract_dates(self, content: str) -> List[str]:
        """Extract dates from content."""
        date_pattern = r'\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b'
        return re.findall(date_pattern, content)
    
    def _extract_key_phrases(self, content: str) -> List[str]:
        """Extract key phrases from content."""
        # Simple implementation - can be enhanced with NLP
        sentences = re.split(r'[.!?]+', content)
        return [s.strip() for s in sentences if len(s.strip()) > 20] 