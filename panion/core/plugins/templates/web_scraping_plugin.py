"""
Web Scraping Plugin Template
A template for creating web scraping plugins.
"""

import logging
from typing import Dict, Any, List, Optional
import aiohttp
from bs4 import BeautifulSoup
from core.base_plugin import BasePlugin
from core.reflection import reflection_system

class WebScrapingPlugin(BasePlugin):
    def __init__(self):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.name = "{{PLUGIN_NAME}}"
        self.description = "{{PLUGIN_DESCRIPTION}}"
        self.version = "0.1.0"
        self.required_parameters = ["url"]  # URL to scrape
        self.optional_parameters = {
            "timeout": 30,  # Request timeout in seconds
            "headers": {},  # Custom HTTP headers
            "extract_links": False,  # Whether to extract links
            "extract_images": False,  # Whether to extract images
            "extract_text": True,  # Whether to extract text
            "selector": None,  # CSS selector for specific content
            "max_retries": 3  # Maximum number of retry attempts
        }

    async def execute(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the web scraping."""
        try:
            # Validate parameters
            self._validate_parameters(parameters)
            
            # Extract URL
            url = parameters["url"]
            
            # Fetch and parse content
            content = await self._fetch_content(url, parameters)
            
            # Extract requested data
            result = await self._extract_data(content, parameters)
            
            return {
                "status": "success",
                "result": result
            }
            
        except Exception as e:
            self.logger.error(f"Error in web scraping: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def _fetch_content(self, url: str, parameters: Dict[str, Any]) -> BeautifulSoup:
        """Fetch and parse web content."""
        async with aiohttp.ClientSession() as session:
            for attempt in range(parameters.get("max_retries", 3)):
                try:
                    async with session.get(
                        url,
                        headers=parameters.get("headers", {}),
                        timeout=parameters.get("timeout", 30)
                    ) as response:
                        if response.status == 200:
                            html = await response.text()
                            return BeautifulSoup(html, 'html.parser')
                        else:
                            raise ValueError(f"HTTP {response.status}: {response.reason}")
                except Exception as e:
                    if attempt == parameters.get("max_retries", 3) - 1:
                        raise
                    self.logger.warning(f"Retry {attempt + 1} after error: {str(e)}")
                    continue

    async def _extract_data(self, soup: BeautifulSoup, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Extract data from parsed content."""
        result = {}
        
        # Extract text if requested
        if parameters.get("extract_text", True):
            if parameters.get("selector"):
                elements = soup.select(parameters["selector"])
                result["text"] = [elem.get_text(strip=True) for elem in elements]
            else:
                result["text"] = soup.get_text(strip=True)
        
        # Extract links if requested
        if parameters.get("extract_links", False):
            result["links"] = [
                {
                    "text": a.get_text(strip=True),
                    "href": a.get("href")
                }
                for a in soup.find_all("a", href=True)
            ]
        
        # Extract images if requested
        if parameters.get("extract_images", False):
            result["images"] = [
                {
                    "src": img.get("src"),
                    "alt": img.get("alt", ""),
                    "title": img.get("title", "")
                }
                for img in soup.find_all("img", src=True)
            ]
        
        return result

    def _validate_parameters(self, parameters: Dict[str, Any]) -> None:
        """Validate input parameters."""
        errors = []
        
        # Check required parameters
        for param in self.required_parameters:
            if param not in parameters:
                errors.append(f"Missing required parameter: {param}")
        
        # Set default values for optional parameters
        for param, default in self.optional_parameters.items():
            if param not in parameters:
                parameters[param] = default
        
        # Validate URL
        if "url" in parameters:
            url = parameters["url"]
            if not isinstance(url, str):
                errors.append("url must be a string")
            elif not url.startswith(("http://", "https://")):
                errors.append("url must start with http:// or https://")
        
        # Validate timeout
        if "timeout" in parameters and not isinstance(parameters["timeout"], (int, float)):
            errors.append("timeout must be a number")
        
        # Validate headers
        if "headers" in parameters and not isinstance(parameters["headers"], dict):
            errors.append("headers must be a dictionary")
        
        if errors:
            raise ValueError("\n".join(errors)) 