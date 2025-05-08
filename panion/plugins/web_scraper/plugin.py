"""
Web Scraper Plugin
Safely scrapes web content using Playwright with proper error handling and timeouts.
"""

import asyncio
import logging
from typing import Dict, Any, Optional
from playwright.async_api import async_playwright, Browser, Page, TimeoutError
from pathlib import Path
from core.plugin.base import BasePlugin

logger = logging.getLogger(__name__)

class WebScraperPlugin(BasePlugin):
    def __init__(self):
        super().__init__()
        self.timeout = 30000  # 30 seconds default timeout
        self.browser: Optional[Browser] = None
        self.playwright = None
        
    async def initialize(self) -> None:
        """Initialize the plugin and browser."""
        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            await super().initialize()
        except Exception as e:
            logger.error(f"Failed to initialize browser: {e}")
            raise
            
    async def cleanup(self) -> None:
        """Clean up browser resources."""
        try:
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
        finally:
            await super().cleanup()
                
    async def scrape_page(
        self,
        url: str,
        selector: str,
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Scrape content from a webpage.
        
        Args:
            url: URL to scrape
            selector: CSS selector to wait for and extract
            timeout: Optional timeout in milliseconds
            
        Returns:
            Dict containing scraped content and metadata
        """
        if not self.browser:
            await self.initialize()
            
        page = None
        try:
            # Create new page
            page = await self.browser.new_page()
            
            # Set timeout
            page.set_default_timeout(timeout or self.timeout)
            
            # Navigate to URL
            logger.info(f"Navigating to {url}")
            await page.goto(url, wait_until="networkidle")
            
            # Wait for selector
            logger.info(f"Waiting for selector: {selector}")
            await page.wait_for_selector(selector)
            
            # Extract content
            content = await page.text_content(selector)
            
            # Get metadata
            title = await page.title()
            url = page.url
            
            return {
                "status": "success",
                "content": content,
                "metadata": {
                    "title": title,
                    "url": url,
                    "selector": selector
                }
            }
            
        except TimeoutError as e:
            logger.error(f"Timeout waiting for selector: {e}")
            return {
                "status": "error",
                "error": f"Timeout waiting for selector: {selector}",
                "error_type": "timeout"
            }
            
        except Exception as e:
            logger.error(f"Error scraping page: {e}")
            return {
                "status": "error",
                "error": str(e),
                "error_type": "general"
            }
            
        finally:
            if page:
                try:
                    await page.close()
                except Exception as e:
                    logger.error(f"Error closing page: {e}")
                    
    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the web scraper plugin.
        
        Args:
            params: Dictionary containing:
                - url: URL to scrape
                - selector: CSS selector to wait for
                - timeout: Optional timeout in milliseconds
                
        Returns:
            Dict containing scraped content and metadata
        """
        try:
            # Validate parameters
            if not params.get("url"):
                return {
                    "status": "error",
                    "error": "URL parameter is required"
                }
                
            if not params.get("selector"):
                return {
                    "status": "error",
                    "error": "Selector parameter is required"
                }
                
            # Scrape page
            result = await self.scrape_page(
                url=params["url"],
                selector=params["selector"],
                timeout=params.get("timeout")
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error in execute: {e}")
            return {
                "status": "error",
                "error": str(e)
            }

# Create plugin instance
web_scraper = WebScraperPlugin() 