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
    # Chrome on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    
    # Chrome on Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    
    # Firefox on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/111.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
    
    # Firefox on Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0',
    
    # Safari on Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    
    # Edge on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 Edg/116.0.1938.69',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    
    # Mobile browsers
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
]

class ScrapingStrategy:
    """Base class for different scraping strategies."""
    
    def __init__(self, name, priority=1):
        self.name = name
        self.priority = priority  # Higher priority strategies are tried first
        self.success_rate = 1.0   # Success rate for adaptive learning (1.0 = 100%)
        self.last_used = 0        # Timestamp of last usage
        self.consecutive_failures = 0  # Count of consecutive failures
    
    def execute(self, scraper, business_type, location, limit):
        """Execute this strategy to get data. Must be implemented by subclasses."""
        raise NotImplementedError("Strategy must implement execute method")
    
    def record_success(self):
        """Record a successful execution of this strategy."""
        self.consecutive_failures = 0
        # Improve success rate by a small amount for each success
        self.success_rate = min(1.0, self.success_rate + 0.05)
        self.last_used = time.time()
        
    def record_failure(self):
        """Record a failed execution of this strategy."""
        self.consecutive_failures += 1
        # Decrease success rate more significantly with consecutive failures
        self.success_rate = max(0.1, self.success_rate - (0.1 * self.consecutive_failures))
        self.last_used = time.time()
    
    def get_effective_priority(self):
        """Get the effective priority considering success rate and cooling period."""
        # Apply cooling period if we've had many consecutive failures
        if self.consecutive_failures > 3:
            cooling_factor = 0.2  # Significantly reduce priority
        else:
            cooling_factor = 1.0
            
        # Calculate effective priority
        return self.priority * self.success_rate * cooling_factor


class DirectYelpStrategy(ScrapingStrategy):
    """Direct scraping of Yelp with enhanced browser emulation."""
    
    def __init__(self):
        super().__init__("direct_yelp", priority=10)
    
    def execute(self, scraper, business_type, location, limit):
        """Execute direct Yelp scraping strategy."""
        logger.info(f"Trying DirectYelpStrategy for {business_type} in {location}")
        
        # Format the search URL
        search_term = business_type.replace(" ", "+")
        formatted_location = location.replace(" ", "+")
        base_url = f"https://www.yelp.com/search?find_desc={search_term}&find_loc={formatted_location}"
        
        try:
            # Enhanced headers to appear more like a real browser
            enhanced_headers = {
                'User-Agent': scraper._get_random_user_agent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0',
                'TE': 'Trailers',
                'Referer': 'https://www.google.com/',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'cross-site',
                'Sec-Fetch-User': '?1',
                'Pragma': 'no-cache'
            }
            
            # First attempt - direct web scraping
            html_content = scraper._make_request(base_url, headers=enhanced_headers, timeout=15)
            
            if not html_content:
                self.record_failure()
                return []
                
            # Parse the HTML
            soup = BeautifulSoup(html_content, 'lxml')
            
            # Find business listings (try multiple selectors for resilience)
            business_elements = soup.find_all("div", class_="container__09f24__mpR8_")
            
            # If we can't find businesses with the expected class, try alternative selectors
            if not business_elements:
                business_elements = soup.select("div.businessName__09f24__CGSAT")
                
            # If we still can't find businesses, try a broader approach
            if not business_elements:
                business_elements = soup.select("div[data-testid='serp-biz-attribute']")
            
            # Last resort - try to find any <h3> elements that might be business names
            if not business_elements:
                business_elements = soup.select("h3 a")
                
            if not business_elements:
                logger.warning("No business elements found with any selector pattern")
                self.record_failure()
                return []
                
            businesses = []
            count = 0
            
            for element in business_elements:
                if count >= limit:
                    break
                    
                try:
                    # Extract name (try multiple possible selectors)
                    name_element = element.find("a", class_="css-19v1rkv")
                    if not name_element:
                        name_element = element.find("a", class_="businessName__09f24__CGSAT")
                    if not name_element:
                        name_element = element.select_one("h3 a")
                    if not name_element and element.name == 'a':
                        name_element = element
                        
                    if not name_element:
                        continue
                        
                    name = name_element.text.strip()
                    if not name:
                        continue
                    
                    # Extract business URL
                    business_url = name_element.get('href')
                    if business_url and not business_url.startswith('http'):
                        business_url = f"https://www.yelp.com{business_url}"
                    
                    # Extract address (try multiple possible selectors)
                    address_element = element.find("span", class_="css-1e4fdj9")
                    if not address_element:
                        address_element = element.select_one("address p")
                    if not address_element:
                        address_element = element.select_one("[data-testid='address']")
                        
                    address = address_element.text.strip() if address_element else "Address not found"
                    
                    # Skip detailed page scraping to avoid too many requests
                    phone = "Phone not available"
                    categories = []
                    hours = []
                    rating = None
                    
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
                    
                    # Be nice to the server - use longer random delays
                    time.sleep(random.uniform(2.0, 5.0))
                    
                except Exception as e:
                    logger.error(f"Error parsing business listing: {str(e)}")
            
            # Record success if we got any businesses
            if businesses:
                self.record_success()
                return businesses
            else:
                self.record_failure()
                return []
                
        except Exception as e:
            logger.error(f"Error in DirectYelpStrategy: {str(e)}")
            self.record_failure()
            return []


class YellowPagesStrategy(ScrapingStrategy):
    """Scrape business data from Yellow Pages as an alternative source."""
    
    def __init__(self):
        super().__init__("yellowpages", priority=5)
    
    def execute(self, scraper, business_type, location, limit):
        """Execute YellowPages scraping strategy."""
        logger.info(f"Trying YellowPagesStrategy for {business_type} in {location}")
        
        # Format the search URL
        search_term = business_type.replace(" ", "+")
        formatted_location = location.replace(" ", "+")
        base_url = f"https://www.yellowpages.com/search?search_terms={search_term}&geo_location_terms={formatted_location}"
        
        try:
            # Make the request
            html_content = scraper._make_request(base_url)
            if not html_content:
                self.record_failure()
                return []
            
            # Parse the HTML
            soup = BeautifulSoup(html_content, 'lxml')
            
            # Find business listings
            business_elements = soup.find_all("div", class_="result")
            
            if not business_elements:
                # Try alternative selectors if standard ones fail
                business_elements = soup.select(".info")
                
            if not business_elements:
                # Last resort
                business_elements = soup.select(".business-card")
                
            if not business_elements:
                logger.warning("No business elements found in Yellow Pages results")
                self.record_failure()
                return []
            
            businesses = []
            count = 0
            for element in business_elements:
                if count >= limit:
                    break
                    
                try:
                    # Extract name
                    name_element = element.find("a", class_="business-name")
                    if not name_element:
                        name_element = element.select_one(".business-name")
                    if not name_element:
                        name_element = element.find("h2")
                        
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
                    logger.info(f"Scraped business from Yellow Pages: {name}")
                    
                    # Be nice to the server
                    time.sleep(random.uniform(1.0, 3.0))
                    
                except Exception as e:
                    logger.error(f"Error parsing Yellow Pages listing: {str(e)}")
            
            # Record success if we got any businesses
            if businesses:
                self.record_success()
                return businesses
            else:
                self.record_failure()
                return []
                
        except Exception as e:
            logger.error(f"Error in YellowPagesStrategy: {str(e)}")
            self.record_failure()
            return []


class GoogleMapsAPIStrategy(ScrapingStrategy):
    """Use Google Maps API if available."""
    
    def __init__(self):
        super().__init__("google_maps_api", priority=8)
        self.api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
        
    def execute(self, scraper, business_type, location, limit):
        """Try to use Google Maps API if available."""
        if not self.api_key:
            # Check if API key is available in environment - it might have been added since initialization
            self.api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
            
            if not self.api_key:
                logger.warning("GoogleMapsAPIStrategy needs a GOOGLE_MAPS_API_KEY environment variable")
                self.record_failure()
                return []
                
        logger.info(f"Using Google Maps API to find {business_type} in {location}")
        
        try:
            # Format the search query
            query = f"{business_type} in {location}"
            
            # Build the API request URL
            base_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
            params = {
                'query': query,
                'key': self.api_key,
                'type': 'business'
            }
            
            # Make the request with SSL verification disabled for Replit
            response = requests.get(base_url, params=params, timeout=10, verify=False)
            response.raise_for_status()
            
            # Parse results
            data = response.json()
            
            # Check if the request was successful
            if data.get('status') != 'OK':
                logger.error(f"Google Maps API error: {data.get('status')}: {data.get('error_message', 'No error message')}")
                self.record_failure()
                return []
                
            # Process results
            results = data.get('results', [])
            if not results:
                logger.warning(f"No results found for {query}")
                return []
                
            businesses = []
            count = 0
            
            # Check if we should get detailed business information (including owner info)
            get_details = True  # Always try to get details with our new implementation
            
            # Process results with enhanced details extraction
            for place in results[:limit]:
                try:
                    name = place.get('name', 'No name available')
                    address = place.get('formatted_address', 'No address available')
                    
                    # Get place_id for more details if needed
                    place_id = place.get('place_id')
                    
                    # Get rating if available
                    rating = place.get('rating')
                    
                    # Basic business record
                    business_record = {
                        "name": name,
                        "address": address,
                        "phone": None,
                        "categories": [business_type],  # Basic category from search
                        "rating": rating,
                        "source": "google_maps_api",
                        "url": f"https://www.google.com/maps/place/?q=place_id:{place_id}" if place_id else None,
                        "scraped_at": datetime.now().isoformat(),
                        "place_id": place_id  # Store this for potential future use
                    }
                    
                    # Get additional details if requested (for owner information)
                    if get_details and place_id:
                        logger.info(f"Getting detailed information for {name}")
                        details = self.get_place_details(place_id)
                        
                        if details:
                            # Update with additional details
                            business_record["phone"] = details.get("formatted_phone_number")
                            business_record["website"] = details.get("website")
                            
                            # Try to extract potential owner information from detailed data
                            # Note: Google doesn't provide direct owner data but we can extract what's available
                            owner_info = self.extract_owner_info(details, name)
                            
                            # Add owner information if found
                            if owner_info:
                                business_record.update(owner_info)
                                
                            # Search for contact information in reviews if available
                            reviews_info = self.get_place_reviews(place_id)
                            if reviews_info:
                                contact_from_reviews = self.extract_contact_from_reviews(reviews_info)
                                if contact_from_reviews:
                                    business_record.update(contact_from_reviews)
                    
                    businesses.append(business_record)
                    count += 1
                    
                    # Be nice to the API - avoid rate limiting
                    time.sleep(0.5)
                    
                except Exception as e:
                    logger.error(f"Error processing Google Maps result: {str(e)}")
                    
            # Record success if we got any businesses
            if businesses:
                self.record_success()
                return businesses
            else:
                self.record_failure()
                return []
                
        except Exception as e:
            logger.error(f"Error in GoogleMapsAPIStrategy: {str(e)}")
            self.record_failure()
            return []
            
    def get_place_details(self, place_id):
        """Get additional details for a place by its ID.
        
        This is implemented as a separate method to allow for selective usage
        to avoid hitting API rate limits unnecessarily.
        """
        if not self.api_key or not place_id:
            return {}
            
        try:
            # Build the API request URL
            base_url = "https://maps.googleapis.com/maps/api/place/details/json"
            params = {
                'place_id': place_id,
                'key': self.api_key,
                # Request all available fields for maximum data
                'fields': 'name,formatted_address,formatted_phone_number,website,opening_hours,url,address_components,business_status,reviews,price_level,rating,user_ratings_total'
            }
            
            # Make the request with SSL verification disabled for Replit
            response = requests.get(base_url, params=params, timeout=10, verify=False)
            response.raise_for_status()
            
            # Parse results
            data = response.json()
            
            # Check if the request was successful
            if data.get('status') != 'OK':
                logger.error(f"Google Maps Details API error: {data.get('status')}")
                return {}
                
            # Return the result
            return data.get('result', {})
        except Exception as e:
            logger.error(f"Error getting place details: {str(e)}")
            return {}
    
    def get_place_reviews(self, place_id):
        """Get reviews for a place which might contain contact information."""
        if not self.api_key or not place_id:
            return {}
            
        try:
            # Build the API request URL - use the details endpoint but only request reviews
            base_url = "https://maps.googleapis.com/maps/api/place/details/json"
            params = {
                'place_id': place_id,
                'key': self.api_key,
                'fields': 'reviews'
            }
            
            # Make the request with SSL verification disabled for Replit
            response = requests.get(base_url, params=params, timeout=10, verify=False)
            response.raise_for_status()
            
            # Parse results
            data = response.json()
            
            # Check if the request was successful
            if data.get('status') != 'OK':
                logger.error(f"Google Maps Reviews API error: {data.get('status')}")
                return {}
                
            # Return the reviews
            return data.get('result', {}).get('reviews', [])
            
        except Exception as e:
            logger.error(f"Error getting place reviews: {str(e)}")
            return []
    
    def extract_owner_info(self, details, business_name):
        """Extract potential owner information from place details.
        
        Google doesn't provide direct owner information, but we can look for hints:
        1. Check if there's an owner response in reviews
        2. Look for contact info in the website description or title
        3. Check the business description for owner mentions
        """
        owner_info = {}
        
        try:
            # Check for any potential owner references in the place details
            if details:
                # Check if the website contains relevant information
                website = details.get('website')
                if website:
                    # Add website to owner_info in case it has contact forms
                    owner_info['owner_website'] = website
                
                # Extract possible owner name from the business name if it looks like a person's name
                if business_name and " - " in business_name:
                    parts = business_name.split(" - ")
                    if len(parts) == 2:
                        possible_owner = parts[0].strip()
                        # Simple check if this looks like a person's name
                        if " " in possible_owner and possible_owner.count(" ") < 3:
                            owner_info['owner_name'] = possible_owner
                
                # Look for owner responses in reviews
                if 'reviews' in details:
                    for review in details.get('reviews', []):
                        if review.get('owner_response'):
                            owner_response = review.get('owner_response').get('text', '')
                            # Look for signature patterns like "- John, Owner" or "Thanks, John (Owner)"
                            signature_patterns = [
                                r'[-—]\s*(\w+)[\s,]*(?:Owner|Manager)',  # - John, Owner
                                r'Thanks,\s*(\w+)[\s,]*\(?(?:Owner|Manager)',  # Thanks, John (Owner)
                                r'Best[\s,]+(\w+)[\s,]*(?:Owner|Manager)',  # Best, John - Owner
                                r'Regards[\s,]+(\w+)[\s,]*(?:Owner|Manager)',  # Regards, John (Owner)
                            ]
                            
                            for pattern in signature_patterns:
                                match = re.search(pattern, owner_response, re.IGNORECASE)
                                if match:
                                    owner_info['owner_name'] = match.group(1)
                                    # Also search for email or phone patterns in the response
                                    email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', owner_response)
                                    if email_match:
                                        owner_info['owner_email'] = email_match.group(0)
                                    
                                    # Look for phone patterns
                                    phone_match = re.search(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', owner_response)
                                    if phone_match:
                                        owner_info['owner_phone'] = phone_match.group(0)
                                    
                                    break
            
            if owner_info:
                owner_info['owner_notes'] = "Information extracted from business details and reviews"
                owner_info['owner_status'] = "available"
                owner_info['data_quality'] = "enhanced"
                
        except Exception as e:
            logger.error(f"Error extracting owner info: {str(e)}")
        
        return owner_info
    
    def extract_contact_from_reviews(self, reviews):
        """Look for contact information patterns in reviews that might indicate owner details."""
        contact_info = {}
        
        if not reviews:
            return contact_info
            
        try:
            # Combine all review text into one searchable string
            all_text = " ".join([review.get('text', '') for review in reviews])
            
            # Look for mentions of the owner with possible names
            owner_patterns = [
                r'(?:owner|manager)[\s,]+(?:is|named|called)[\s,]+([A-Z][a-z]+)',  # owner is John
                r'([A-Z][a-z]+)[\s,]+(?:is|was)[\s,]+(?:the|their)[\s,]+(?:owner|manager)',  # John is the owner
                r'met[\s,]+(?:the|their)[\s,]+(?:owner|manager)[\s,]+([A-Z][a-z]+)',  # met the owner John
                r'([A-Z][a-z]+)[\s,]+(?:the|their)[\s,]+(?:owner|manager)[\s,]+(?:was|is)',  # John the owner was
            ]
            
            for pattern in owner_patterns:
                matches = re.finditer(pattern, all_text, re.IGNORECASE)
                for match in matches:
                    potential_name = match.group(1)
                    if potential_name and len(potential_name) > 2:  # Avoid abbreviations
                        contact_info['owner_name'] = potential_name
                        break
                
                if 'owner_name' in contact_info:
                    break
            
            # Look for email addresses
            email_matches = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', all_text)
            if email_matches:
                contact_info['owner_email'] = email_matches[0]  # Use the first email found
            
            # Look for additional phone numbers not matching the business number
            phone_matches = re.findall(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', all_text)
            if phone_matches:
                contact_info['owner_phone'] = phone_matches[0]  # Use the first phone found
                
            if contact_info:
                contact_info['owner_notes'] = "Information extracted from customer reviews"
                if 'owner_name' in contact_info:
                    contact_info['owner_status'] = "available"
                    contact_info['data_quality'] = "enhanced"
                    
        except Exception as e:
            logger.error(f"Error extracting contact from reviews: {str(e)}")
            
        return contact_info


class CachedDataStrategy(ScrapingStrategy):
    """Use cached data if available."""
    
    def __init__(self):
        super().__init__("cached_data", priority=15)  # Highest priority - always try cache first
        
    def execute(self, scraper, business_type, location, limit):
        """Try to load data from cache."""
        cache_file = os.path.join(scraper.data_dir, f"smokeshop_{location.replace(' ', '_')}.json")
        
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                    if cached_data and len(cached_data) > 0:
                        # Check if data is less than 24 hours old
                        first_record = cached_data[0]
                        scraped_at = datetime.fromisoformat(first_record.get('scraped_at', '2000-01-01'))
                        if (datetime.now() - scraped_at).days < 1:
                            logger.info(f"Using cached data for {business_type} in {location} ({len(cached_data)} records)")
                            self.record_success()
                            return cached_data[:limit]  # Return only up to the limit
            except (json.JSONDecodeError, KeyError, ValueError) as e:
                logger.error(f"Error reading cached data: {str(e)}")
        
        # Cache miss
        self.record_failure()
        return []


class EnhancedScraper:
    """Advanced web scraping utility that can extract data from various sources."""
    
    def __init__(self):
        self.session = requests.Session()
        self.data_dir = "./data/scraped"
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Initialize strategy registry
        self.strategies = {
            "cached_data": CachedDataStrategy(),
            "direct_yelp": DirectYelpStrategy(),
            "yellowpages": YellowPagesStrategy(),
            "google_maps_api": GoogleMapsAPIStrategy()
        }
        
        # Track strategy success/failure patterns
        self.last_successful_strategy = None
        self.blocked_strategies = set()  # Temporarily blocked strategies
        self.block_expiry = {}  # When blocks expire
        
        # Block duration increases with consecutive failures
        self.block_duration_base = 300  # 5 minutes initial block
        self.max_block_duration = 86400  # 24 hours maximum block
        
    def _get_random_user_agent(self) -> str:
        """Get a random user agent string to avoid detection."""
        return random.choice(USER_AGENTS)
    
    def _make_request(self, url: str, method: str = "GET", 
                      params: Dict[str, Any] = None, 
                      headers: Dict[str, str] = None,
                      timeout: int = 15,
                      verify: bool = False,  # Set to False to bypass SSL verification in Replit
                      use_proxy: bool = True) -> Optional[str]:
        """Make an HTTP request with error handling and retries."""
        # Import proxy manager (only when needed to avoid circular imports)
        try:
            from scrapers.proxy_manager import proxy_manager
        except ImportError:
            proxy_manager = None
            logger.warning("Proxy manager not available, proceeding without proxies")
            use_proxy = False
            
        # Generate a realistic browser-like user agent
        chrome_version = f"{random.randint(90, 120)}.0.{random.randint(1000, 9999)}.{random.randint(10, 999)}"
        default_user_agent = f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome_version} Safari/537.36"
        
        default_headers = {
            'User-Agent': headers.get('User-Agent', default_user_agent) if headers else self._get_random_user_agent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
        }
        
        # Merge default headers with any custom headers
        if headers:
            for key, value in headers.items():
                default_headers[key] = value
                
        # Set a realistic referer if not provided
        if 'Referer' not in default_headers:
            referers = [
                'https://www.google.com/',
                'https://www.bing.com/',
                'https://search.yahoo.com/',
                'https://duckduckgo.com/'
            ]
            default_headers['Referer'] = random.choice(referers)
        
        # Init session for each request to avoid cookie tracking
        local_session = requests.Session()
        
        # Configure session
        local_session.headers.update(default_headers)
        
        # Add cookies to appear like a regular browser session
        local_session.cookies.set('visitor', f"v{random.randint(1, 9999999)}", domain=url.split('/')[2] if '://' in url else url)
        
        # Setup retry strategy with exponential backoff
        retries = 5
        backoff_factor = 1.5
        
        # Setup proxy if requested and available
        current_proxy = None
        if use_proxy and proxy_manager:
            proxy_dict = proxy_manager.get_proxy_dict()
            if proxy_dict:
                logger.info(f"Using proxy: {proxy_dict}")
                local_session.proxies.update(proxy_dict)
                current_proxy = proxy_dict.get('http', '')
        
        # Keep track of current attempt
        attempt = 0
        
        while attempt < retries:
            try:
                # Calculate wait time for exponential backoff (but randomize it a bit)
                wait_time = (backoff_factor ** attempt) * (0.5 + random.random())
                
                # On later attempts, try different approaches
                if attempt > 0:
                    # Rotate user agent on retry
                    local_session.headers['User-Agent'] = self._get_random_user_agent()
                    
                    # Rotate proxy on retry
                    if use_proxy and proxy_manager and attempt > 1:
                        # Mark current proxy as failed
                        if current_proxy:
                            proxy_manager.mark_proxy_failed(current_proxy)
                            
                        # Get a new proxy
                        proxy_dict = proxy_manager.get_proxy_dict()
                        if proxy_dict:
                            logger.info(f"Switching to new proxy: {proxy_dict}")
                            local_session.proxies.update(proxy_dict)
                            current_proxy = proxy_dict.get('http', '')
                    
                    # Add some jitter to the request timing to appear more human-like
                    time.sleep(random.uniform(0.5, 1.5))
                
                # Execute the request with the appropriate method
                if method.upper() == "GET":
                    response = local_session.get(
                        url, 
                        params=params,
                        timeout=timeout,
                        verify=verify
                    )
                elif method.upper() == "POST":
                    response = local_session.post(
                        url, 
                        data=params,
                        timeout=timeout,
                        verify=verify
                    )
                else:
                    logger.error(f"Unsupported HTTP method: {method}")
                    return None
                
                # Check for rate limiting or blocking
                if response.status_code == 403:
                    logger.warning(f"Received 403 Forbidden - we may be blocked. Attempt {attempt+1}/{retries}")
                    
                    # Mark proxy as failed if we're using one
                    if current_proxy and proxy_manager:
                        proxy_manager.mark_proxy_failed(current_proxy)
                        current_proxy = None
                    
                    # Wait longer between retries if we're being rate limited
                    time.sleep(wait_time * 2)
                    attempt += 1
                    continue
                    
                # Proceed if successful
                response.raise_for_status()
                
                # Mark proxy as successful if we're using one
                if current_proxy and proxy_manager:
                    proxy_manager.mark_proxy_success(current_proxy)
                
                # Return response with encoding properly set
                if response.encoding is None:
                    response.encoding = 'utf-8'
                    
                return response.text
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Error fetching {url} (attempt {attempt+1}/{retries}): {str(e)}")
                
                # Mark proxy as failed if we're using one
                if current_proxy and proxy_manager:
                    proxy_manager.mark_proxy_failed(current_proxy)
                    current_proxy = None
                
                attempt += 1
                time.sleep(wait_time)  # Wait before retrying with exponential backoff
        
        logger.error(f"Failed to fetch {url} after {retries} attempts")
        return None
    
    def _unblock_strategy(self, strategy_name: str) -> None:
        """Unblock a strategy if its block period has expired."""
        if strategy_name in self.blocked_strategies:
            if strategy_name in self.block_expiry:
                if time.time() > self.block_expiry[strategy_name]:
                    logger.info(f"Unblocking strategy {strategy_name} as block period expired")
                    self.blocked_strategies.remove(strategy_name)
                    self.block_expiry.pop(strategy_name)
    
    def _block_strategy(self, strategy_name: str) -> None:
        """Block a strategy temporarily after repeated failures."""
        strategy = self.strategies.get(strategy_name)
        if not strategy:
            return
            
        # Calculate block duration based on consecutive failures
        block_duration = min(
            self.block_duration_base * (2 ** (strategy.consecutive_failures - 1)),
            self.max_block_duration
        )
        
        logger.warning(f"Blocking strategy {strategy_name} for {block_duration} seconds after {strategy.consecutive_failures} consecutive failures")
        
        self.blocked_strategies.add(strategy_name)
        self.block_expiry[strategy_name] = time.time() + block_duration
    
    def _get_ranked_strategies(self, preferred_source: str = None) -> List[str]:
        """Get strategies ordered by effective priority."""
        # Check for unblocking of strategies
        for strategy_name in list(self.blocked_strategies):
            self._unblock_strategy(strategy_name)
            
        # Get all available strategies (not blocked)
        available_strategies = {
            name: strategy 
            for name, strategy in self.strategies.items() 
            if name not in self.blocked_strategies
        }
        
        # If preferred source is specified and available, try it first
        if preferred_source and preferred_source in available_strategies:
            # Move preferred source to the front
            ranked = [preferred_source]
            ranked.extend([
                name for name in sorted(
                    available_strategies.keys(),
                    key=lambda x: available_strategies[x].get_effective_priority(),
                    reverse=True
                ) if name != preferred_source
            ])
        else:
            # Rank by effective priority
            ranked = sorted(
                available_strategies.keys(),
                key=lambda x: available_strategies[x].get_effective_priority(),
                reverse=True
            )
            
        return ranked
    
    def _save_to_cache(self, business_type: str, location: str, data: List[Dict[str, Any]]) -> None:
        """Save data to cache file."""
        if not data:
            return
            
        cache_file = os.path.join(self.data_dir, f"smokeshop_{location.replace(' ', '_')}.json")
        try:
            with open(cache_file, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved {len(data)} records to {cache_file}")
        except Exception as e:
            logger.error(f"Error saving data to cache: {str(e)}")
            
    def scrape_business_directory(self, 
                                 business_type: str, 
                                 location: str, 
                                 limit: int = 20,
                                 source: str = "adaptive") -> List[Dict[str, Any]]:
        """
        Scrape business information from a directory using adaptive strategy selection.
        
        Args:
            business_type: Type of business to search for (e.g., "restaurant", "plumber")
            location: Location to search in (e.g., "New York", "Los Angeles")
            limit: Maximum number of businesses to return
            source: Preferred source to scrape from ("adaptive", "yelp", "google", "yellowpages",
                   "cached_data", "playwright")
            
        Returns:
            List of business records
        """
        # Modify source to use adaptive strategy when Playwright is requested
        # to avoid installation issues temporarily
        if source.lower() == "playwright":
            logger.info("Playwright scraping requested but using adaptive strategy for stability")
            source = "adaptive"
            # First try cached results if available
            cache_file = os.path.join(self.data_dir, f"{business_type.replace(' ', '_')}_{location.replace(' ', '_')}.json")
            if os.path.exists(cache_file):
                try:
                    with open(cache_file, 'r') as f:
                        cached_data = json.load(f)
                        if cached_data and len(cached_data) > 0:
                            logger.info(f"Using cached data for {business_type} in {location} ({len(cached_data)} records)")
                            return cached_data[:limit]
                except Exception as e:
                    logger.error(f"Error reading cache: {str(e)}")
            
        # Check cache first if we're using adaptive mode
        if source.lower() in ["adaptive", "cached_data"]:
            cache_file = os.path.join(self.data_dir, f"{business_type.replace(' ', '_')}_{location.replace(' ', '_')}.json")
            
            if os.path.exists(cache_file):
                try:
                    # Check if cache is recent enough (less than 24 hours old)
                    if time.time() - os.path.getmtime(cache_file) < 86400:  # 24 hours
                        with open(cache_file, 'r') as f:
                            cached_data = json.load(f)
                            
                        if cached_data and len(cached_data) > 0:
                            logger.info(f"Using cached data for {business_type} in {location} ({len(cached_data)} records)")
                            self.last_successful_strategy = "cached_data"
                            return cached_data[:limit]  # Respect the limit parameter
                        
                except Exception as e:
                    logger.error(f"Error reading cache: {str(e)}")
        
        # Get ranked strategies with the preferred source prioritized if specified
        ranked_strategies = self._get_ranked_strategies(source.lower())
        
        if not ranked_strategies:
            logger.error("No available scraping strategies - all are blocked")
            # Use yellowpages as a last resort if all other strategies are blocked
            logger.info("Falling back to YellowPages as all other strategies are blocked")
            return self._scrape_yellowpages(business_type, location, limit)
            
        logger.info(f"Attempting to scrape with strategies (in order): {', '.join(ranked_strategies)}")
        
        # Try strategies in order until we get data
        for strategy_name in ranked_strategies:
            strategy = self.strategies[strategy_name]
            
            # Skip if the strategy is in cooling-off period after many failures
            if strategy.consecutive_failures > 5 and time.time() - strategy.last_used < 3600:
                logger.info(f"Skipping strategy {strategy_name} in cooling-off period after {strategy.consecutive_failures} failures")
                continue
                
            logger.info(f"Trying strategy: {strategy_name} (priority: {strategy.get_effective_priority():.2f})")
            try:
                # Execute strategy
                result = strategy.execute(self, business_type, location, limit)
                
                # If successful, save to cache and return
                if result and len(result) > 0:
                    logger.info(f"Strategy {strategy_name} succeeded with {len(result)} results")
                    
                    # Record as last successful strategy
                    self.last_successful_strategy = strategy_name
                    
                    # Save to cache (if not already from cache)
                    if strategy_name != "cached_data":
                        self._save_to_cache(business_type, location, result)
                        
                    return result
                else:
                    logger.warning(f"Strategy {strategy_name} returned no results")
                    
                    # If strategy fails consistently, block it temporarily
                    if strategy.consecutive_failures >= 3:
                        self._block_strategy(strategy_name)
            except Exception as e:
                logger.error(f"Error executing strategy {strategy_name}: {str(e)}")
                strategy.record_failure()
                
                # Block the strategy if it had an exception
                if strategy.consecutive_failures >= 2:
                    self._block_strategy(strategy_name)
                    
        # Use YellowPages as a fallback instead of Playwright for now
        logger.info("All standard scraping strategies failed, falling back to YellowPages directly")
        yellowpages_results = self._scrape_yellowpages(business_type, location, limit)
        
        if yellowpages_results and len(yellowpages_results) > 0:
            return yellowpages_results
            
        # If we still have no results, look for any cached data as absolute last resort
        logger.error("All scraping strategies failed")
        
        # Look for any cached data as absolute last resort
        cache_file = os.path.join(self.data_dir, f"smokeshop_{location.replace(' ', '_')}.json")
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                    if cached_data:
                        logger.warning(f"Falling back to potentially stale cached data ({len(cached_data)} records)")
                        return cached_data[:limit]
            except Exception as e:
                logger.error(f"Error reading fallback cached data: {str(e)}")
                
        return []
        
    def _try_playwright_scraping(self, business_type: str, location: str, limit: int) -> List[Dict[str, Any]]:
        """Try scraping using Playwright browser automation."""
        try:
            # Import the Playwright scraper dynamically to avoid circular imports
            from scrapers.playwright_scraper import PlaywrightScraper
            
            # Create a new instance
            playwright_scraper = PlaywrightScraper()
            
            # Check if Playwright is available
            if not playwright_scraper.available:
                logger.error("Playwright is not available, cannot use as fallback")
                return []
                
            logger.info(f"Attempting to scrape with Playwright for {business_type} in {location}")
            
            # Run the Playwright scraper (it's async, so we need to run it in an event loop)
            import asyncio
            
            # Use existing event loop if available, otherwise create a new one
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            # Run the scraper
            results = loop.run_until_complete(
                playwright_scraper.scrape_business_directory(
                    business_type=business_type,
                    location=location,
                    limit=limit
                )
            )
            
            # If we got results, mark it as the successful strategy and save to cache
            if results and len(results) > 0:
                self.last_successful_strategy = "playwright"
                self._save_to_cache(business_type, location, results)
                
            return results
            
        except Exception as e:
            logger.error(f"Error using Playwright scraper: {str(e)}")
            return []
    
    def _scrape_yelp(self, business_type: str, location: str, limit: int) -> List[Dict[str, Any]]:
        """Scrape business data from Yelp."""
        businesses = []
        
        # Try to load existing data first (don't re-scrape if we have recent data)
        cache_file = os.path.join(self.data_dir, f"smokeshop_{location.replace(' ', '_')}.json")
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                    if cached_data and len(cached_data) > 0:
                        # Check if data is less than 24 hours old
                        first_record = cached_data[0]
                        scraped_at = datetime.fromisoformat(first_record.get('scraped_at', '2000-01-01'))
                        if (datetime.now() - scraped_at).days < 1:
                            logger.info(f"Using cached data for {business_type} in {location} ({len(cached_data)} records)")
                            return cached_data[:limit]  # Return only up to the limit
            except (json.JSONDecodeError, KeyError, ValueError) as e:
                logger.error(f"Error reading cached data: {str(e)}")
        
        # Format the search URL
        search_term = business_type.replace(" ", "+")
        formatted_location = location.replace(" ", "+")
        base_url = f"https://www.yelp.com/search?find_desc={search_term}&find_loc={formatted_location}"
        
        logger.info(f"Scraping Yelp for {business_type} in {location}")
        
        # Enhanced headers to appear more like a real browser
        enhanced_headers = {
            'User-Agent': self._get_random_user_agent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
            'TE': 'Trailers',
            'Referer': 'https://www.google.com/',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-User': '?1',
            'Pragma': 'no-cache'
        }
        
        # If Yelp scraping fails, try an alternative approach or fallback to existing data
        try:
            # First attempt - direct web scraping
            html_content = self._make_request(base_url, headers=enhanced_headers, timeout=15)
            
            if not html_content:
                # If direct scraping fails, try to use existing data if available
                if os.path.exists(cache_file):
                    try:
                        with open(cache_file, 'r') as f:
                            logger.info(f"Using cached data as fallback for {business_type} in {location}")
                            return json.load(f)[:limit]
                    except (json.JSONDecodeError, KeyError) as e:
                        logger.error(f"Error reading fallback data: {str(e)}")
                
                # If we still don't have data, fall back to Yellow Pages
                logger.info("Falling back to Yellow Pages as Yelp scraping failed")
                return self._scrape_yellowpages(business_type, location, limit)
            
            # Parse the HTML
            soup = BeautifulSoup(html_content, 'lxml')
            
            # Find business listings (this may need updates as Yelp changes their HTML structure)
            business_elements = soup.find_all("div", class_="container__09f24__mpR8_")
            
            # If we can't find businesses with the expected class, try alternative selectors
            if not business_elements:
                business_elements = soup.select("div.businessName__09f24__CGSAT")
                
            # If we still can't find businesses, try a broader approach
            if not business_elements:
                business_elements = soup.select("div[data-testid='serp-biz-attribute']")
            
            # Last resort - try to find any <h3> elements that might be business names
            if not business_elements:
                business_elements = soup.select("h3 a")
            
            count = 0
            for element in business_elements:
                if count >= limit:
                    break
                    
                try:
                    # Extract name (try multiple possible selectors)
                    name_element = element.find("a", class_="css-19v1rkv")
                    if not name_element:
                        name_element = element.find("a", class_="businessName__09f24__CGSAT")
                    if not name_element:
                        name_element = element.select_one("h3 a")
                    if not name_element and element.name == 'a':
                        name_element = element
                        
                    if not name_element:
                        continue
                        
                    name = name_element.text.strip()
                    if not name:
                        continue
                    
                    # Extract business URL
                    business_url = name_element.get('href')
                    if business_url and not business_url.startswith('http'):
                        business_url = f"https://www.yelp.com{business_url}"
                    
                    # Extract address (try multiple possible selectors)
                    address_element = element.find("span", class_="css-1e4fdj9")
                    if not address_element:
                        address_element = element.select_one("address p")
                    if not address_element:
                        address_element = element.select_one("[data-testid='address']")
                        
                    address = address_element.text.strip() if address_element else "Address not found"
                    
                    # Extract phone and additional details (requires visiting the business page)
                    phone = "Phone not available"
                    categories = []
                    hours = []
                    rating = None
                    
                    # Skip detailed page scraping to avoid too many requests
                    # This reduces the chance of getting blocked
                    
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
                    
                    # Be nice to the server - use longer random delays
                    time.sleep(random.uniform(2.0, 5.0))
                    
                except Exception as e:
                    logger.error(f"Error parsing business listing: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error during Yelp scraping: {str(e)}")
            # If we have a catastrophic error, try to fall back to Yellow Pages
            if not businesses:
                logger.info("Falling back to Yellow Pages due to Yelp scraping error")
                return self._scrape_yellowpages(business_type, location, limit)
        
        # If we got some data from Yelp, save it to the cache
        if businesses:
            try:
                with open(cache_file, 'w') as f:
                    json.dump(businesses, f, indent=2)
                logger.info(f"Saved {len(businesses)} records to {cache_file}")
            except Exception as e:
                logger.error(f"Error saving scraped data to cache: {str(e)}")
        else:
            # If we couldn't get any data from Yelp and there's no fallback,
            # try Yellow Pages as a last resort
            logger.warning("No businesses found from Yelp, trying Yellow Pages")
            return self._scrape_yellowpages(business_type, location, limit)
        
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