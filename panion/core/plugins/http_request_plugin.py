"""
HTTP Request Plugin
Handles HTTP requests and responses.
"""

import logging
import aiohttp
import ssl
from typing import Dict, Any, Optional
from dataclasses import dataclass
from .base_plugin import BasePlugin

logger = logging.getLogger(__name__)

@dataclass
class PluginResult:
    """Result from plugin execution."""
    success: bool
    data: Dict[str, Any]
    error: Optional[str] = None

class HttpRequestPlugin(BasePlugin):
    """Plugin for making HTTP requests."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize plugin.
        
        Args:
            config: Plugin configuration
        """
        super().__init__(config)
        self.session = None
    
    async def execute(self, input_data: Dict[str, Any]) -> PluginResult:
        """Execute plugin.
        
        Args:
            input_data: Input data containing request details
            
        Returns:
            PluginResult: Result of plugin execution
        """
        try:
            # Create session if needed
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            # Extract request details
            method = input_data.get('method', 'GET')
            url = input_data.get('url')
            headers = input_data.get('headers', {})
            data = input_data.get('data')
            timeout = input_data.get('timeout', 30)
            
            if not url:
                raise ValueError("URL is required")
            
            # Create SSL context that doesn't verify certificates
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            # Make request
            async with self.session.request(
                method=method,
                url=url,
                headers=headers,
                data=data,
                timeout=timeout,
                ssl=ssl_context
            ) as response:
                # Get response
                content = await response.text()
                
                return PluginResult(
                    success=response.status < 400,
                    data={
                        'status': response.status,
                        'headers': dict(response.headers),
                        'content': content
                    }
                )
                
        except Exception as e:
            logger.error(f"HTTP request failed: {e}")
            return PluginResult(
                success=False,
                data={},
                error=str(e)
            )
    
    async def cleanup(self) -> None:
        """Clean up plugin resources."""
        if self.session:
            await self.session.close()
            self.session = None 