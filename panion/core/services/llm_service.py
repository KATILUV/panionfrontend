"""
LLM Service
Provides text generation capabilities using language models.
"""

import logging
import os
import json
import asyncio
from typing import Dict, Any, Optional
from pathlib import Path
import yaml
import aiohttp
from datetime import datetime

from core.service_locator import service_locator
from core.reflection import reflection_system

class LLMService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.config = self._load_config()
        self.model = self.config.get('model', 'gpt-4')
        self.temperature = self.config.get('temperature', 0.7)
        self.max_tokens = self.config.get('max_tokens', 1000)
        self.timeout = self.config.get('timeout', 30)
        self.retry_attempts = self.config.get('retry_attempts', 3)
        self.retry_delay = self.config.get('retry_delay', 1)
        
        # Load API key from environment
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            self.logger.warning("OPENAI_API_KEY not found in environment variables")
            
        # Initialize session
        self.session = None
        
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        try:
            config_path = Path('config/llm_config.yaml')
            if not config_path.exists():
                self.logger.warning(f"Config file not found at {config_path}")
                return {}
                
            with open(config_path) as f:
                config = yaml.safe_load(f)
                
            # Replace environment variables
            if isinstance(config.get('api_key'), str) and config['api_key'].startswith('${'):
                env_var = config['api_key'][2:-1]
                config['api_key'] = os.getenv(env_var)
                
            return config
        except Exception as e:
            self.logger.error(f"Error loading config: {e}")
            return {}
            
    async def initialize(self) -> None:
        """Initialize the service."""
        try:
            if not self.api_key:
                raise ValueError("OpenAI API key not configured")
                
            self.session = aiohttp.ClientSession(
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            self.logger.info(f"Initialized LLM service with model {self.model}")
            
        except Exception as e:
            self.logger.error(f"Error initializing LLM service: {e}")
            raise
            
    async def generate_text(self, prompt: str) -> str:
        """Generate text using the language model.
        
        Args:
            prompt: The input prompt for text generation
            
        Returns:
            Generated text response
            
        Raises:
            ValueError: If service is not initialized
            Exception: For other errors
        """
        if not self.session:
            raise ValueError("LLM service not initialized")
            
        # Get model-specific settings
        model_config = self.config.get(self.model.replace('-', ''), {})
        temperature = model_config.get('temperature', self.temperature)
        max_tokens = model_config.get('max_tokens', self.max_tokens)
        
        # Prepare request
        request_data = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        # Add model-specific parameters
        if 'presence_penalty' in model_config:
            request_data['presence_penalty'] = model_config['presence_penalty']
        if 'frequency_penalty' in model_config:
            request_data['frequency_penalty'] = model_config['frequency_penalty']
            
        # Log request
        reflection_system.log_thought(
            "llm_service",
            "Generating text with LLM",
            {
                "model": self.model,
                "prompt_length": len(prompt),
                "temperature": temperature,
                "max_tokens": max_tokens
            }
        )
        
        # Retry loop
        for attempt in range(self.retry_attempts):
            try:
                async with self.session.post(
                    "https://api.openai.com/v1/chat/completions",
                    json=request_data,
                    timeout=self.timeout
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        generated_text = result['choices'][0]['message']['content']
                        
                        # Log success
                        reflection_system.log_thought(
                            "llm_service",
                            "Successfully generated text",
                            {
                                "model": self.model,
                                "response_length": len(generated_text),
                                "attempt": attempt + 1
                            }
                        )
                        
                        return generated_text
                        
                    else:
                        error_data = await response.json()
                        error_msg = error_data.get('error', {}).get('message', 'Unknown error')
                        self.logger.error(f"API error (attempt {attempt + 1}): {error_msg}")
                        
                        if response.status == 429:  # Rate limit
                            await asyncio.sleep(self.retry_delay * (attempt + 1))
                            continue
                            
                        raise Exception(f"API error: {error_msg}")
                        
            except asyncio.TimeoutError:
                self.logger.error(f"Timeout (attempt {attempt + 1})")
                if attempt < self.retry_attempts - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))
                    continue
                raise
                
            except Exception as e:
                self.logger.error(f"Error generating text (attempt {attempt + 1}): {e}")
                if attempt < self.retry_attempts - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))
                    continue
                raise
                
        raise Exception("Failed to generate text after all retry attempts")
        
    def configure(self, config: Dict[str, Any]) -> None:
        """Configure the LLM service.
        
        Args:
            config: Configuration dictionary
        """
        try:
            self.model = config.get('model', self.model)
            self.temperature = config.get('temperature', self.temperature)
            self.max_tokens = config.get('max_tokens', self.max_tokens)
            self.timeout = config.get('timeout', self.timeout)
            self.retry_attempts = config.get('retry_attempts', self.retry_attempts)
            self.retry_delay = config.get('retry_delay', self.retry_delay)
            
            # Update API key if provided
            if 'api_key' in config:
                self.api_key = config['api_key']
                
            self.logger.info(f"Updated LLM service configuration: {config}")
            
        except Exception as e:
            self.logger.error(f"Error configuring LLM service: {e}")
            raise
            
    async def cleanup(self) -> None:
        """Clean up resources."""
        if self.session:
            await self.session.close()
            self.session = None

# Create and register service instance
llm_service = LLMService()
service_locator.register_service('llm_service', llm_service) 