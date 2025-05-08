"""
Smokeshop Scraper
A utility to scrape information about smoke shops including phone numbers.
"""

import os
import json
import time
import logging
import requests
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup
import random

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# User agents to rotate through to avoid being blocked
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:90.0) Gecko/20100101 Firefox/90.0'
]

class SmokeshopScraper:
    """Scraper for smoke shop information from various online sources."""
    
    def __init__(self):
        self.shops = []
        self.session = requests.Session()
        
    def _get_random_user_agent(self) -> str:
        """Get a random user agent string to avoid detection."""
        return random.choice(USER_AGENTS)
    
    def _make_request(self, url: str) -> Optional[str]:
        """Make an HTTP request with error handling and retries."""
        headers = {
            'User-Agent': self._get_random_user_agent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        
        retries = 3
        while retries > 0:
            try:
                response = self.session.get(url, headers=headers, timeout=10)
                response.raise_for_status()
                return response.text
            except requests.exceptions.RequestException as e:
                logger.error(f"Error fetching {url}: {str(e)}")
                retries -= 1
                time.sleep(2)  # Wait before retrying
                
        return None
    
    def scrape_yelp(self, location: str = "New York", limit: int = 20) -> List[Dict[str, Any]]:
        """Scrape smoke shop data from Yelp."""
        shops = []
        
        # Format the search URL
        search_term = "smoke+shop"
        formatted_location = location.replace(" ", "+")
        base_url = f"https://www.yelp.com/search?find_desc={search_term}&find_loc={formatted_location}"
        
        logger.info(f"Scraping Yelp for smoke shops in {location}")
        
        # Make the request
        html_content = self._make_request(base_url)
        if not html_content:
            logger.error("Failed to fetch Yelp search results")
            return shops
        
        # Parse the HTML
        soup = BeautifulSoup(html_content, 'lxml')
        
        # Find business listings
        business_elements = soup.find_all("div", class_="container__09f24__mpR8_")
        
        count = 0
        for element in business_elements:
            if count >= limit:
                break
                
            try:
                # Extract name
                name_element = element.find("a", class_="css-19v1rkv")
                if not name_element:
                    continue
                    
                name = name_element.text.strip()
                
                # Extract business URL
                business_url = name_element.get('href')
                if business_url and not business_url.startswith('http'):
                    business_url = f"https://www.yelp.com{business_url}"
                
                # Extract address
                address_element = element.find("span", class_="css-1e4fdj9")
                address = address_element.text.strip() if address_element else "Address not found"
                
                # Extract phone (requires visiting the business page)
                phone = "Phone not available"
                if business_url:
                    business_html = self._make_request(business_url)
                    if business_html:
                        business_soup = BeautifulSoup(business_html, 'lxml')
                        phone_element = business_soup.find("p", text=lambda t: t and "(" in t and ")" in t and "-" in t)
                        if phone_element:
                            phone = phone_element.text.strip()
                
                # Add to results
                shops.append({
                    "name": name,
                    "address": address,
                    "phone": phone,
                    "source": "yelp",
                    "url": business_url
                })
                
                count += 1
                logger.info(f"Scraped shop: {name}")
                
                # Be nice to the server
                time.sleep(random.uniform(1.0, 3.0))
                
            except Exception as e:
                logger.error(f"Error parsing business listing: {str(e)}")
        
        return shops
    
    def scrape_google_maps(self, location: str = "New York", limit: int = 20) -> List[Dict[str, Any]]:
        """
        Note: Actual Google Maps scraping requires more complex handling.
        This is a simplified version for demonstration purposes.
        """
        shops = []
        
        logger.info(f"Simulating Google Maps scraping for {location} (demo mode)")
        
        # In a real implementation, we would use a proper Google Maps scraping approach
        # For now, we'll use a simulated approach with sample data
        for i in range(min(limit, 10)):
            shops.append({
                "name": f"Smoke Shop {i+1}",
                "address": f"{100+i} Main St, {location}",
                "phone": f"(555) 555-{1000+i}",
                "source": "google_maps_simulation",
                "url": None
            })
            time.sleep(0.5)  # Simulate scraping delay
        
        return shops
    
    def scrape_multiple_sources(self, location: str = "New York", limit: int = 100) -> List[Dict[str, Any]]:
        """Scrape multiple sources and combine results."""
        shops = []
        
        # Determine how many to scrape from each source
        per_source_limit = limit // 2
        
        logger.info(f"Starting scraping for up to {limit} smoke shops...")
        
        # Scrape from Yelp
        yelp_shops = self.scrape_yelp(location, per_source_limit)
        shops.extend(yelp_shops)
        
        # Scrape from Google Maps (simulated)
        remaining = max(0, limit - len(shops))
        if remaining > 0:
            google_shops = self.scrape_google_maps(location, remaining)
            shops.extend(google_shops)
        
        # Deduplicate by name and address
        unique_shops = []
        seen = set()
        
        for shop in shops:
            key = (shop['name'], shop['address'])
            if key not in seen:
                seen.add(key)
                unique_shops.append(shop)
        
        logger.info(f"Scraped {len(unique_shops)} unique smoke shops")
        return unique_shops[:limit]
    
    def save_to_json(self, shops: List[Dict[str, Any]], filename: str = "smokeshops.json") -> str:
        """Save scraped data to a JSON file."""
        # Ensure the directory exists
        os.makedirs("./data", exist_ok=True)
        
        filepath = f"./data/{filename}"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(shops, f, indent=2)
        
        logger.info(f"Saved {len(shops)} shops to {filepath}")
        return filepath

# Example usage
if __name__ == "__main__":
    scraper = SmokeshopScraper()
    shops = scraper.scrape_multiple_sources(limit=10)
    scraper.save_to_json(shops)