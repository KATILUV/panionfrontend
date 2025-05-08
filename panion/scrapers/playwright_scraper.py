"""
Playwright Scraper
Implements browser-based scraping using Playwright for sites with complex JavaScript.
"""

import os
import json
import time
import logging
import random
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime

# Import Playwright
try:
    from playwright.async_api import async_playwright, Page, BrowserType, Browser
except ImportError:
    async_playwright = None
    Page = None
    BrowserType = None
    Browser = None

# Import our proxy manager
from scrapers.proxy_manager import proxy_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PlaywrightScraper:
    """A browser-based scraper using Playwright for handling JavaScript-heavy sites and avoiding detection."""
    
    def __init__(self):
        """Initialize the PlaywrightScraper."""
        self.available = async_playwright is not None
        if not self.available:
            logger.error("Playwright is not available. Make sure it's installed.")
        
        # Keep track of cache directory
        self.cache_dir = os.path.join("data", "scraped", "playwright_cache")
        os.makedirs(self.cache_dir, exist_ok=True)
    
    async def _setup_browser(self, use_proxy: bool = True) -> Optional[Browser]:
        """Set up and launch a browser instance."""
        if not self.available:
            return None
            
        try:
            # Start playwright
            playwright = await async_playwright().start()
            
            # Get proxy if required
            proxy_info = None
            if use_proxy:
                proxy = proxy_manager.get_proxy()
                if proxy:
                    # Format for Playwright
                    if proxy.startswith('http://'):
                        proxy = proxy[7:]
                    elif proxy.startswith('https://'):
                        proxy = proxy[8:]
                        
                    proxy_info = {
                        'server': proxy
                    }
            
            # Browser options
            browser_options = {
                'headless': True,
                'timeout': 60000,  # 60 seconds
            }
            
            if proxy_info:
                browser_options['proxy'] = proxy_info
            
            # Launch the browser (using chromium)
            browser = await playwright.chromium.launch(**browser_options)
            
            return browser
        except Exception as e:
            logger.error(f"Error setting up browser: {str(e)}")
            return None
    
    async def _create_page(self, browser: Browser) -> Optional[Page]:
        """Create a new page in the browser with stealth settings."""
        if not browser:
            return None
            
        try:
            # Create a new browser context to have isolated cookies/storage
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent=self._get_random_user_agent(),
                locale='en-US',
                timezone_id='America/New_York',
                color_scheme='light',
            )
            
            # Enable JavaScript
            await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => false})")
            
            # Create a new page
            page = await context.new_page()
            
            # Set default timeout
            page.set_default_timeout(30000)  # 30 seconds
            
            return page
        except Exception as e:
            logger.error(f"Error creating page: {str(e)}")
            return None
    
    def _get_random_user_agent(self) -> str:
        """Get a random realistic user agent string."""
        user_agents = [
            # Chrome on Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
            # Chrome on Mac
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
            # Firefox on Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
            # Safari on Mac
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
        ]
        return random.choice(user_agents)
        
    async def scrape_business_directory(self, 
                                        business_type: str = "coffee shop", 
                                        location: str = "New York", 
                                        limit: int = 10) -> List[Dict[str, Any]]:
        """
        Scrape business information using Playwright.
        
        Args:
            business_type: Type of business to search for
            location: City/location to search in
            limit: Maximum number of results to return
        
        Returns:
            List of dictionaries containing business information
        """
        if not self.available:
            logger.error("Playwright is not available, cannot scrape")
            return []
            
        # Create a cache key for this search
        cache_key = f"{business_type.replace(' ', '_')}_{location.replace(' ', '_')}".lower()
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        
        # Check if we have cached results
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                    
                    # Check if cache is still valid (less than 24 hours old)
                    if cached_data.get('timestamp'):
                        cache_time = datetime.fromisoformat(cached_data['timestamp'])
                        cache_age = (datetime.now() - cache_time).total_seconds()
                        
                        if cache_age < 86400:  # 24 hours
                            logger.info(f"Using cached results for {business_type} in {location}")
                            return cached_data.get('businesses', [])[:limit]
            except Exception as e:
                logger.error(f"Error reading cache: {str(e)}")
        
        # Setup browser
        browser = await self._setup_browser(use_proxy=True)
        if not browser:
            return []
            
        try:
            # Create a new page
            page = await self._create_page(browser)
            if not page:
                await browser.close()
                return []
                
            # Set up result list
            results = []
            
            # Try Google Maps first
            try:
                logger.info(f"Scraping Google Maps for {business_type} in {location}")
                
                # Navigate to Google Maps
                await page.goto('https://www.google.com/maps', wait_until='networkidle')
                
                # Wait for the search box
                await page.wait_for_selector('input[aria-label="Search Google Maps"]', state='visible')
                
                # Type our search query
                search_query = f"{business_type} in {location}"
                await page.fill('input[aria-label="Search Google Maps"]', search_query)
                
                # Press Enter to search
                await page.keyboard.press('Enter')
                
                # Wait for results to load
                await page.wait_for_load_state('networkidle')
                await asyncio.sleep(3)  # Extra wait for dynamic content
                
                # Scroll through results to load more
                for _ in range(3):
                    # Find the results panel and scroll it
                    results_panel = await page.query_selector('div[role="feed"]')
                    if results_panel:
                        await results_panel.scroll_into_view_if_needed()
                        await page.mouse.wheel(0, 500)  # Scroll down
                        await asyncio.sleep(1)
                
                # Extract business data
                business_cards = await page.query_selector_all('div[role="article"]')
                
                for card in business_cards[:limit]:
                    try:
                        # Click the card to load details
                        await card.click()
                        await asyncio.sleep(2)  # Wait for details to load
                        
                        # Extract business name
                        name_elem = await page.query_selector('h1')
                        name = await name_elem.text_content() if name_elem else "Unknown"
                        
                        # Extract address
                        address = None
                        address_button = await page.query_selector('button[data-item-id="address"]')
                        if address_button:
                            address = await address_button.text_content()
                        
                        # Extract phone
                        phone = None
                        phone_button = await page.query_selector('button[data-item-id="phone"]')
                        if phone_button:
                            phone = await phone_button.text_content()
                            
                        # Extract website
                        website = None
                        website_button = await page.query_selector('a[data-item-id="authority"]')
                        if website_button:
                            website = await website_button.get_attribute('href')
                            
                        # Extract rating
                        rating = None
                        rating_elem = await page.query_selector('span[aria-hidden="true"][role="img"]')
                        if rating_elem:
                            rating_text = await rating_elem.text_content()
                            if rating_text:
                                try:
                                    rating = float(rating_text.split()[0].replace(',', '.'))
                                except:
                                    pass
                        
                        # Add to results if we have a name
                        if name and name != "Unknown":
                            results.append({
                                'name': name,
                                'address': address,
                                'phone': phone,
                                'website': website,
                                'rating': rating,
                                'source': 'google_maps'
                            })
                            
                            # Break if we've reached our limit
                            if len(results) >= limit:
                                break
                                
                    except Exception as e:
                        logger.error(f"Error extracting business details: {str(e)}")
            
            except Exception as e:
                logger.error(f"Error scraping Google Maps: {str(e)}")
            
            # If we don't have enough results, try Yelp
            if len(results) < limit:
                try:
                    logger.info(f"Scraping Yelp for {business_type} in {location}")
                    
                    # Navigate to Yelp
                    await page.goto(f'https://www.yelp.com/search?find_desc={business_type}&find_loc={location}', wait_until='networkidle')
                    
                    # Wait for results to load
                    await page.wait_for_selector('h3[class*="css-"]', state='visible')
                    
                    # Scroll through results to load more
                    for _ in range(2):
                        await page.evaluate('window.scrollBy(0, 800)')
                        await asyncio.sleep(1)
                    
                    # Extract business data
                    business_cards = await page.query_selector_all('div[class*="arrange-unit__"]')
                    
                    for card in business_cards[:limit]:
                        try:
                            # Extract business name
                            name_elem = await card.query_selector('h3[class*="css-"]')
                            name = await name_elem.text_content() if name_elem else "Unknown"
                            
                            # Extract rating
                            rating = None
                            rating_elem = await card.query_selector('div[aria-label*="star rating"]')
                            if rating_elem:
                                rating_text = await rating_elem.get_attribute('aria-label')
                                if rating_text:
                                    try:
                                        rating = float(rating_text.split()[0])
                                    except:
                                        pass
                            
                            # Extract address
                            address_elem = await card.query_selector('address')
                            address = await address_elem.text_content() if address_elem else None
                            
                            # Click to get more details
                            name_link = await card.query_selector('a[href*="/biz/"]')
                            if name_link:
                                href = await name_link.get_attribute('href')
                                if href:
                                    # Open in a new tab
                                    detail_page = await browser.new_page()
                                    await detail_page.goto(f"https://www.yelp.com{href}" if href.startswith('/') else href)
                                    await detail_page.wait_for_load_state('networkidle')
                                    
                                    # Extract phone
                                    phone = None
                                    phone_elem = await detail_page.query_selector('p:has(> svg[aria-label="Phone"]) ~ p')
                                    if phone_elem:
                                        phone = await phone_elem.text_content()
                                    
                                    # Extract website
                                    website = None
                                    website_elem = await detail_page.query_selector('a[href*="biz_redir"][href*="website"]')
                                    if website_elem:
                                        website = await website_elem.get_attribute('href')
                                    
                                    # Close the tab
                                    await detail_page.close()
                            
                            # Add to results if we have a name
                            if name and name != "Unknown" and not any(r['name'] == name for r in results):
                                results.append({
                                    'name': name,
                                    'address': address,
                                    'phone': phone,
                                    'website': website,
                                    'rating': rating,
                                    'source': 'yelp'
                                })
                                
                                # Break if we've reached our limit
                                if len(results) >= limit:
                                    break
                        
                        except Exception as e:
                            logger.error(f"Error extracting Yelp business details: {str(e)}")
                
                except Exception as e:
                    logger.error(f"Error scraping Yelp: {str(e)}")
            
            # Cache the results
            if results:
                try:
                    with open(cache_file, 'w') as f:
                        json.dump({
                            'timestamp': datetime.now().isoformat(),
                            'businesses': results
                        }, f)
                except Exception as e:
                    logger.error(f"Error saving cache: {str(e)}")
            
            return results
        
        finally:
            # Ensure browser is closed
            await browser.close()
            
    def save_to_json(self, businesses: List[Dict[str, Any]], filename: str = "businesses.json") -> str:
        """Save the scraped businesses to a JSON file."""
        # Ensure the directory exists
        output_dir = os.path.join("data", "scraped")
        os.makedirs(output_dir, exist_ok=True)
        
        # Create the full path
        filepath = os.path.join(output_dir, filename)
        
        # Save the data
        try:
            with open(filepath, 'w') as f:
                json.dump(businesses, f, indent=2)
            logger.info(f"Saved {len(businesses)} businesses to {filepath}")
            return filepath
        except Exception as e:
            logger.error(f"Error saving to JSON: {str(e)}")
            return ""