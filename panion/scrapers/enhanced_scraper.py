"""
Enhanced Scraper Module
A versatile web scraping utility that can extract information from various sources.
"""

import os
import json
import time
import logging
import requests
import re
import csv
import random
from typing import List, Dict, Any, Optional, Union, Tuple
from bs4 import BeautifulSoup
from datetime import datetime

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

class EnhancedScraper:
    """Advanced web scraping utility that can extract data from various sources."""
    
    def __init__(self):
        self.session = requests.Session()
        self.data_dir = "./data/scraped"
        os.makedirs(self.data_dir, exist_ok=True)
        
    def _get_random_user_agent(self) -> str:
        """Get a random user agent string to avoid detection."""
        return random.choice(USER_AGENTS)
    
    def _make_request(self, url: str, method: str = "GET", 
                      params: Dict[str, Any] = None, 
                      headers: Dict[str, str] = None,
                      timeout: int = 10) -> Optional[str]:
        """Make an HTTP request with error handling and retries."""
        default_headers = {
            'User-Agent': self._get_random_user_agent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        
        # Merge default headers with any custom headers
        if headers:
            for key, value in headers.items():
                default_headers[key] = value
        
        retries = 3
        while retries > 0:
            try:
                if method.upper() == "GET":
                    response = self.session.get(
                        url, 
                        headers=default_headers, 
                        params=params,
                        timeout=timeout
                    )
                elif method.upper() == "POST":
                    response = self.session.post(
                        url, 
                        headers=default_headers, 
                        data=params,
                        timeout=timeout
                    )
                else:
                    logger.error(f"Unsupported HTTP method: {method}")
                    return None
                
                response.raise_for_status()
                return response.text
            except requests.exceptions.RequestException as e:
                logger.error(f"Error fetching {url}: {str(e)}")
                retries -= 1
                time.sleep(2)  # Wait before retrying
                
        return None
    
    def scrape_business_directory(self, 
                                 business_type: str, 
                                 location: str, 
                                 limit: int = 20,
                                 source: str = "yelp") -> List[Dict[str, Any]]:
        """
        Scrape business information from a directory.
        
        Args:
            business_type: Type of business to search for (e.g., "restaurant", "plumber")
            location: Location to search in (e.g., "New York", "Los Angeles")
            limit: Maximum number of businesses to return
            source: Source to scrape from ("yelp", "google", "yellowpages")
            
        Returns:
            List of business records
        """
        if source.lower() == "yelp":
            return self._scrape_yelp(business_type, location, limit)
        elif source.lower() == "yellowpages":
            return self._scrape_yellowpages(business_type, location, limit)
        elif source.lower() == "google":
            logger.warning("Google scraping is limited to simulated data")
            return self._simulate_google_data(business_type, location, limit)
        else:
            logger.error(f"Unsupported source: {source}")
            return []
    
    def _scrape_yelp(self, business_type: str, location: str, limit: int) -> List[Dict[str, Any]]:
        """Scrape business data from Yelp."""
        businesses = []
        
        # Format the search URL
        search_term = business_type.replace(" ", "+")
        formatted_location = location.replace(" ", "+")
        base_url = f"https://www.yelp.com/search?find_desc={search_term}&find_loc={formatted_location}"
        
        logger.info(f"Scraping Yelp for {business_type} in {location}")
        
        # Make the request
        html_content = self._make_request(base_url)
        if not html_content:
            logger.error("Failed to fetch Yelp search results")
            return businesses
        
        # Parse the HTML
        soup = BeautifulSoup(html_content, 'lxml')
        
        # Find business listings (this may need updates as Yelp changes their HTML structure)
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
                
                # Extract phone and additional details (requires visiting the business page)
                phone = "Phone not available"
                categories = []
                hours = []
                rating = None
                
                if business_url:
                    business_html = self._make_request(business_url)
                    if business_html:
                        business_soup = BeautifulSoup(business_html, 'lxml')
                        
                        # Phone number
                        phone_element = business_soup.find("p", string=lambda t: t and re.search(r'\(\d{3}\)\s*\d{3}-\d{4}', t))
                        if phone_element:
                            phone = phone_element.text.strip()
                            
                        # Categories
                        category_elements = business_soup.select("a.css-19v1rkv span")
                        categories = [cat.text.strip() for cat in category_elements if cat.text.strip()]
                        
                        # Rating
                        rating_element = business_soup.select_one("div[aria-label*='star rating']")
                        if rating_element:
                            rating_text = rating_element.get('aria-label', '')
                            rating_match = re.search(r'([\d.]+)\s*star', rating_text)
                            if rating_match:
                                rating = float(rating_match.group(1))
                
                # Add to results
                businesses.append({
                    "name": name,
                    "address": address,
                    "phone": phone,
                    "categories": categories,
                    "rating": rating,
                    "hours": hours,
                    "source": "yelp",
                    "url": business_url,
                    "scraped_at": datetime.now().isoformat()
                })
                
                count += 1
                logger.info(f"Scraped business: {name}")
                
                # Be nice to the server
                time.sleep(random.uniform(1.0, 3.0))
                
            except Exception as e:
                logger.error(f"Error parsing business listing: {str(e)}")
        
        return businesses
    
    def _scrape_yellowpages(self, business_type: str, location: str, limit: int) -> List[Dict[str, Any]]:
        """Scrape business data from Yellow Pages."""
        businesses = []
        
        # Format the search URL
        search_term = business_type.replace(" ", "+")
        formatted_location = location.replace(" ", "+")
        base_url = f"https://www.yellowpages.com/search?search_terms={search_term}&geo_location_terms={formatted_location}"
        
        logger.info(f"Scraping Yellow Pages for {business_type} in {location}")
        
        # Make the request
        html_content = self._make_request(base_url)
        if not html_content:
            logger.error("Failed to fetch Yellow Pages search results")
            return businesses
        
        # Parse the HTML
        soup = BeautifulSoup(html_content, 'lxml')
        
        # Find business listings
        business_elements = soup.find_all("div", class_="result")
        
        count = 0
        for element in business_elements:
            if count >= limit:
                break
                
            try:
                # Extract name
                name_element = element.find("a", class_="business-name")
                if not name_element:
                    continue
                    
                name = name_element.text.strip()
                
                # Extract business URL
                business_url = name_element.get('href')
                if business_url and not business_url.startswith('http'):
                    business_url = f"https://www.yellowpages.com{business_url}"
                
                # Extract address
                address_element = element.find("div", class_="street-address")
                address_locality = element.find("div", class_="locality")
                
                address = ""
                if address_element:
                    address = address_element.text.strip()
                if address_locality:
                    if address:
                        address += ", "
                    address += address_locality.text.strip()
                
                if not address:
                    address = "Address not found"
                
                # Extract phone
                phone_element = element.find("div", class_="phones")
                phone = phone_element.text.strip() if phone_element else "Phone not available"
                
                # Extract categories
                categories_element = element.find("div", class_="categories")
                categories = []
                if categories_element:
                    category_links = categories_element.find_all("a")
                    categories = [link.text.strip() for link in category_links]
                
                # Add to results
                businesses.append({
                    "name": name,
                    "address": address,
                    "phone": phone,
                    "categories": categories,
                    "source": "yellowpages",
                    "url": business_url,
                    "scraped_at": datetime.now().isoformat()
                })
                
                count += 1
                logger.info(f"Scraped business: {name}")
                
                # Be nice to the server
                time.sleep(random.uniform(1.0, 3.0))
                
            except Exception as e:
                logger.error(f"Error parsing business listing: {str(e)}")
        
        return businesses
    
    def _simulate_google_data(self, business_type: str, location: str, limit: int) -> List[Dict[str, Any]]:
        """
        Simulate Google Maps data (for demonstration purposes).
        In a production environment, you would use a proper Google Places API or similar.
        """
        businesses = []
        
        streets = ["Main St", "Broadway", "Park Ave", "1st Ave", "Market St", 
                   "Oak St", "Center St", "Washington St", "Lincoln Ave"]
        
        ratings = [3.0, 3.5, 4.0, 4.5, 5.0]
        
        business_name_prefix = business_type.title().split()[0]
        
        for i in range(min(limit, 20)):
            street = random.choice(streets)
            
            business = {
                "name": f"{business_name_prefix} {chr(65+i)} {'& Co' if random.random() > 0.5 else ''}",
                "address": f"{100+i} {street}, {location}",
                "phone": f"({random.randint(100, 999)}) {random.randint(100, 999)}-{random.randint(1000, 9999)}",
                "categories": [business_type],
                "rating": random.choice(ratings),
                "hours": ["9:00 AM - 5:00 PM" for _ in range(7)],
                "source": "google_simulated",
                "url": None,
                "scraped_at": datetime.now().isoformat()
            }
            
            businesses.append(business)
            time.sleep(0.1)  # Simulate scraping delay
        
        return businesses
    
    def scrape_news(self, topic: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Scrape news articles related to a specific topic.
        
        Args:
            topic: News topic to search for
            limit: Maximum number of articles to return
            
        Returns:
            List of news article records
        """
        articles = []
        
        # Format the search URL (using a generic news search engine)
        search_term = topic.replace(" ", "+")
        base_url = f"https://news.google.com/search?q={search_term}"
        
        logger.info(f"Scraping news for topic: {topic}")
        
        # Make the request
        html_content = self._make_request(base_url)
        if not html_content:
            logger.error("Failed to fetch news search results")
            return articles
        
        # Parse the HTML
        soup = BeautifulSoup(html_content, 'lxml')
        
        # Find article listings
        article_elements = soup.find_all("article")
        
        count = 0
        for element in article_elements:
            if count >= limit:
                break
                
            try:
                # Extract title
                title_element = element.find("h3")
                if not title_element:
                    continue
                    
                title = title_element.text.strip()
                
                # Extract article URL
                link_element = title_element.find("a")
                article_url = link_element.get('href') if link_element else None
                if article_url and article_url.startswith('./'):
                    article_url = f"https://news.google.com{article_url[1:]}"
                
                # Extract source and time
                info_element = element.find("div", {"class": "SVJrMe"})
                source = None
                published_time = None
                
                if info_element:
                    source_element = info_element.find("a")
                    source = source_element.text.strip() if source_element else None
                    
                    time_element = info_element.find("time")
                    published_time = time_element.get('datetime') if time_element else None
                
                # Add to results
                articles.append({
                    "title": title,
                    "url": article_url,
                    "source": source,
                    "published_time": published_time,
                    "topic": topic,
                    "scraped_at": datetime.now().isoformat()
                })
                
                count += 1
                logger.info(f"Scraped article: {title}")
                
                # Be nice to the server
                time.sleep(random.uniform(0.5, 1.5))
                
            except Exception as e:
                logger.error(f"Error parsing article: {str(e)}")
        
        return articles
    
    def scrape_product_info(self, product_name: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Scrape product information from e-commerce sites.
        
        Args:
            product_name: Product to search for
            limit: Maximum number of products to return
            
        Returns:
            List of product records
        """
        # This is a simplistic implementation. In a real application, you'd 
        # want to target specific e-commerce sites and handle their unique structures.
        products = []
        
        # For demonstration purposes, we'll simulate e-commerce data
        price_range = (9.99, 499.99)
        stores = ["Amazon", "Walmart", "Target", "Best Buy", "eBay", "Etsy"]
        ratings = [3.5, 4.0, 4.2, 4.5, 4.7, 4.8]
        
        for i in range(limit):
            variant = chr(65 + (i % 26))
            product = {
                "name": f"{product_name} {variant}",
                "price": round(random.uniform(*price_range), 2),
                "store": random.choice(stores),
                "rating": random.choice(ratings),
                "reviews": random.randint(10, 5000),
                "in_stock": random.random() > 0.2,
                "url": f"https://example.com/product/{i}",
                "scraped_at": datetime.now().isoformat()
            }
            
            products.append(product)
            time.sleep(0.1)  # Simulate scraping delay
        
        logger.info(f"Simulated scraping for {limit} {product_name} products")
        return products
    
    def save_to_json(self, data: List[Dict[str, Any]], filename: str) -> str:
        """Save scraped data to a JSON file."""
        filepath = os.path.join(self.data_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"Saved {len(data)} records to {filepath}")
        return filepath
    
    def save_to_csv(self, data: List[Dict[str, Any]], filename: str) -> str:
        """Save scraped data to a CSV file."""
        if not data:
            logger.error("No data to save")
            return ""
            
        filepath = os.path.join(self.data_dir, filename)
        
        # Get all possible fields from the data
        fieldnames = set()
        for item in data:
            fieldnames.update(item.keys())
        
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=sorted(fieldnames))
            writer.writeheader()
            writer.writerows(data)
        
        logger.info(f"Saved {len(data)} records to {filepath}")
        return filepath

# For testing
if __name__ == "__main__":
    scraper = EnhancedScraper()
    
    # Test business directory scraping
    businesses = scraper.scrape_business_directory("restaurant", "Chicago", 5)
    scraper.save_to_json(businesses, "chicago_restaurants.json")
    
    # Test news scraping
    news = scraper.scrape_news("technology", 5)
    scraper.save_to_json(news, "tech_news.json")
    
    # Test product scraping
    products = scraper.scrape_product_info("laptop", 5)
    scraper.save_to_json(products, "laptops.json")