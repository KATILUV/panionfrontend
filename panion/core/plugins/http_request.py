"""
HTTP request plugin for the Panion system.
"""

import aiohttp
import asyncio
from typing import Dict, Any, Optional
import logging
from datetime import datetime

from .base import BasePlugin

class HttpRequestPlugin(BasePlugin):
    """Plugin for making HTTP requests."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize the plugin.
        
        Args:
            config: Plugin configuration
        """
        super().__init__(
            name="http_request",
            version="1.0.0",
            description="Makes HTTP requests",
            author="Panion"
        )
        
        self.timeout = config.get("timeout", 30)
        self.retry_delay = config.get("retry_delay", 1)
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _initialize_resources(self) -> bool:
        """Initialize plugin resources.
        
        Returns:
            bool: True if initialization successful
        """
        try:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )
            return True
        except Exception as e:
            self.logger.error(f"Failed to initialize HTTP session: {str(e)}")
            return False
    
    async def _cleanup_resources(self) -> bool:
        """Cleanup plugin resources.
        
        Returns:
            bool: True if cleanup successful
        """
        try:
            if self._session:
                await self._session.close()
            return True
        except Exception as e:
            self.logger.error(f"Failed to cleanup HTTP session: {str(e)}")
            return False
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an HTTP request.
        
        Args:
            input_data: Request parameters
            
        Returns:
            Dict[str, Any]: Response data
        """
        if not self._session:
            raise RuntimeError("HTTP session not initialized")
            
        method = input_data.get("method", "GET")
        url = input_data.get("url")
        headers = input_data.get("headers", {})
        params = input_data.get("params", {})
        data = input_data.get("data")
        json_data = input_data.get("json")
        
        if not url:
            raise ValueError("URL is required")
            
        try:
            async with self._session.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                data=data,
                json=json_data
            ) as response:
                # Get response data
                try:
                    response_data = await response.json()
                except:
                    response_data = await response.text()
                
                return {
                    "status": response.status,
                    "headers": dict(response.headers),
                    "data": response_data,
                    "timestamp": datetime.now().isoformat()
                }
                
        except aiohttp.ClientError as e:
            self.logger.error(f"HTTP request error: {str(e)}")
            await asyncio.sleep(self.retry_delay)
            raise
            
        except Exception as e:
            self.logger.error(f"Unexpected error: {str(e)}")
            raise 