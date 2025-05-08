"""
Configuration and setup for Guidance LLM interactions.
"""

import os
from typing import Optional, Dict, Any
from pathlib import Path
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

class GuidanceConfig:
    """Configuration for Guidance LLM interactions."""
    
    def __init__(self):
        """Initialize Guidance configuration."""
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("GUIDANCE_MODEL", "gpt-4-turbo-preview")
        self.temperature = float(os.getenv("GUIDANCE_TEMPERATURE", "0.7"))
        self.max_tokens = int(os.getenv("GUIDANCE_MAX_TOKENS", "2000"))
        self.cache_dir = Path(os.getenv("GUIDANCE_CACHE_DIR", ".guidance_cache"))
        
        # Create cache directory if it doesn't exist
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Validate configuration
        self._validate_config()
        
    def _validate_config(self) -> None:
        """Validate the configuration."""
        if not self.api_key:
            logger.warning("No OpenAI API key found. Set OPENAI_API_KEY environment variable.")
            
        if not self.model:
            raise ValueError("No model specified. Set GUIDANCE_MODEL environment variable.")
            
        if not 0 <= self.temperature <= 1:
            raise ValueError("Temperature must be between 0 and 1")
            
        if self.max_tokens <= 0:
            raise ValueError("max_tokens must be positive")
            
    def get_config(self) -> Dict[str, Any]:
        """Get the configuration as a dictionary."""
        return {
            "api_key": self.api_key,
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "cache_dir": str(self.cache_dir)
        }
        
    @staticmethod
    def safe_import_guidance() -> Optional[Any]:
        """Safely import guidance module with error handling."""
        try:
            import guidance
            return guidance
        except ImportError as e:
            logger.error(f"Failed to import guidance: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error importing guidance: {e}")
            return None

# Create singleton instance
guidance_config = GuidanceConfig() 