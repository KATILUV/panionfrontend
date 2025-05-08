"""
Tests for the web scraper plugin.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from pathlib import Path
import asyncio
from playwright.async_api import TimeoutError

from plugins.web_scraper.plugin import WebScraperPlugin

@pytest.fixture
async def plugin():
    """Create a plugin instance."""
    plugin = WebScraperPlugin()
    yield plugin
    await plugin.cleanup()

@pytest.mark.asyncio
async def test_initialize_success(plugin):
    """Test successful plugin initialization."""
    with patch("playwright.async_api.async_playwright") as mock_playwright:
        mock_browser = AsyncMock()
        mock_playwright.return_value.chromium.launch.return_value = mock_browser
        
        await plugin.initialize()
        
        assert plugin.browser == mock_browser
        mock_playwright.return_value.chromium.launch.assert_called_once_with(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )

@pytest.mark.asyncio
async def test_initialize_failure(plugin):
    """Test plugin initialization failure."""
    with patch("playwright.async_api.async_playwright") as mock_playwright:
        mock_playwright.return_value.chromium.launch.side_effect = Exception("Test error")
        
        with pytest.raises(Exception, match="Test error"):
            await plugin.initialize()

@pytest.mark.asyncio
async def test_scrape_page_success(plugin):
    """Test successful page scraping."""
    # Mock browser and page
    mock_page = AsyncMock()
    mock_page.text_content.return_value = "Test content"
    mock_page.title.return_value = "Test Title"
    mock_page.url = "https://test.com"
    
    plugin.browser = AsyncMock()
    plugin.browser.new_page.return_value = mock_page
    
    # Test scraping
    result = await plugin.scrape_page(
        url="https://test.com",
        selector="#content",
        timeout=5000
    )
    
    # Verify result
    assert result["status"] == "success"
    assert result["content"] == "Test content"
    assert result["metadata"]["title"] == "Test Title"
    assert result["metadata"]["url"] == "https://test.com"
    assert result["metadata"]["selector"] == "#content"
    
    # Verify page operations
    mock_page.set_default_timeout.assert_called_once_with(5000)
    mock_page.goto.assert_called_once_with("https://test.com", wait_until="networkidle")
    mock_page.wait_for_selector.assert_called_once_with("#content")
    mock_page.close.assert_called_once()

@pytest.mark.asyncio
async def test_scrape_page_timeout(plugin):
    """Test page scraping timeout."""
    # Mock browser and page
    mock_page = AsyncMock()
    mock_page.wait_for_selector.side_effect = TimeoutError("Test timeout")
    
    plugin.browser = AsyncMock()
    plugin.browser.new_page.return_value = mock_page
    
    # Test scraping
    result = await plugin.scrape_page(
        url="https://test.com",
        selector="#content"
    )
    
    # Verify result
    assert result["status"] == "error"
    assert "timeout" in result["error"].lower()
    assert result["error_type"] == "timeout"
    
    # Verify page was closed
    mock_page.close.assert_called_once()

@pytest.mark.asyncio
async def test_scrape_page_error(plugin):
    """Test page scraping error."""
    # Mock browser and page
    mock_page = AsyncMock()
    mock_page.goto.side_effect = Exception("Test error")
    
    plugin.browser = AsyncMock()
    plugin.browser.new_page.return_value = mock_page
    
    # Test scraping
    result = await plugin.scrape_page(
        url="https://test.com",
        selector="#content"
    )
    
    # Verify result
    assert result["status"] == "error"
    assert result["error"] == "Test error"
    assert result["error_type"] == "general"
    
    # Verify page was closed
    mock_page.close.assert_called_once()

@pytest.mark.asyncio
async def test_execute_success(plugin):
    """Test successful plugin execution."""
    # Mock scrape_page
    plugin.scrape_page = AsyncMock(return_value={
        "status": "success",
        "content": "Test content",
        "metadata": {
            "title": "Test Title",
            "url": "https://test.com",
            "selector": "#content"
        }
    })
    
    # Test execution
    result = await plugin.execute({
        "url": "https://test.com",
        "selector": "#content",
        "timeout": 5000
    })
    
    # Verify result
    assert result["status"] == "success"
    assert result["content"] == "Test content"
    
    # Verify scrape_page was called
    plugin.scrape_page.assert_called_once_with(
        url="https://test.com",
        selector="#content",
        timeout=5000
    )

@pytest.mark.asyncio
async def test_execute_missing_url(plugin):
    """Test plugin execution with missing URL."""
    result = await plugin.execute({
        "selector": "#content"
    })
    
    assert result["status"] == "error"
    assert result["error"] == "URL parameter is required"

@pytest.mark.asyncio
async def test_execute_missing_selector(plugin):
    """Test plugin execution with missing selector."""
    result = await plugin.execute({
        "url": "https://test.com"
    })
    
    assert result["status"] == "error"
    assert result["error"] == "Selector parameter is required"

@pytest.mark.asyncio
async def test_cleanup(plugin):
    """Test plugin cleanup."""
    # Mock browser
    mock_browser = AsyncMock()
    plugin.browser = mock_browser
    
    # Test cleanup
    await plugin.cleanup()
    
    # Verify browser was closed
    mock_browser.close.assert_called_once() 