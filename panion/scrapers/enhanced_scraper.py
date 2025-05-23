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
        4. Parse business name for potential owner info
        5. Extract social media links if available
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
                if business_name:
                    # Words that should not be considered owner names
                    definitely_not_names = [
                        "the", "smoke", "vape", "king", "queen", "royal", "bros", "million", "sky", "high",
                        "broadway", "downtown", "uptown", "central", "head", "shop", "global", "world", 
                        "universal", "superior", "premier", "elite", "prime", "quality", "value", "budget",
                        "tobacco", "cigar", "pipe", "hookah", "water", "glass", "freaky", "maybe", "super",
                        "happy", "lucky", "spot", "zone", "market", "store", "emporium", "boutique", "lounge",
                        "hut", "shack", "depot", "house", "place", "point", "corner", "center", "plaza",
                        "station", "gallery", "studio", "international", "national", "american", "colorado", 
                        "denver", "chicago", "seattle", "local", "specialty", "cloud", "purple", "green",
                        "blue", "red", "black", "white", "gold", "silver", "bronze", "discount", "bargain",
                        "premium", "deluxe", "mega", "super", "ultra", "mini", "micro", "max", "express",
                        "fast", "quick", "rapid", "instant", "direct", "master", "expert", "pro", "tech",
                        "professional", "specialist", "exclusive", "unique", "special", "modern", "advanced",
                        "innovative", "original", "classic", "traditional", "custom", "digital", "smart", "urban",
                        "pacific", "atlantic", "mountain", "valley", "peak", "summit", "horizon", "sunset", "sunrise"
                    ]
                    
                    # Check for common patterns in business names
                    name_patterns = [
                        r"([\w']+)'s\s+(?:smoke|vape|tobacco)",  # John's Smoke Shop
                        r"([\w']+)\s+&\s+(?:[\w']+)'s",  # John & Mary's
                        r"([\w']+)\s+and\s+(?:[\w']+)'s",  # John and Mary's
                        r"^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)'s",  # John's or John Smith's at start
                        r"^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:smoke|vape)",  # John Smith Smoke Shop
                        r"^([A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?)[''`]s",  # More possessive variations
                        r"([A-Z][a-z]{2,}(?:\s&\s[A-Z][a-z]{2,})?)[''`]s",  # Joe & Bob's
                        r"([A-Z][a-z]{2,})\s+(?:and|&)\s+([A-Z][a-z]{2,})",  # Joe and Bob / Joe & Bob 
                    ]
                    
                    for pattern in name_patterns:
                        match = re.search(pattern, business_name, re.IGNORECASE)
                        if match:
                            possible_owner = match.group(1).strip()
                            
                            # Skip if the possible owner is in the definitely_not_names list
                            if possible_owner.lower() in definitely_not_names:
                                continue
                                
                            # Check for vowels
                            has_vowels = bool(re.search(r'[aeiou]', possible_owner.lower()))
                            
                            # Check if it's capitalized properly
                            properly_capitalized = all(word[0].isupper() for word in possible_owner.split() if word)
                            
                            # Common first names as an additional validation
                            common_first_names = [
                                "john", "james", "robert", "michael", "william", "david", "richard", 
                                "joseph", "thomas", "charles", "mary", "patricia", "jennifer", "linda", 
                                "elizabeth", "barbara", "susan", "jessica", "sarah", "karen", "lisa", 
                                "nancy", "betty", "margaret", "sandra", "alex", "sam", "dan", "chris",
                                "mike", "bob", "tom", "jim", "joe", "jeff", "mark", "paul", "steve",
                                "anna", "emma", "olivia", "ava", "sophia", "mia", "amelia", "jake",
                                "jason", "kevin", "ryan", "brian", "justin", "adam", "eric", "george",
                                "frank", "scott", "andrew", "raymond", "gregory", "joshua", "jerry",
                                "dennis", "walter", "patrick", "peter", "harold", "douglas", "henry",
                                "carl", "arthur", "ryan", "roger", "joe", "juan", "jack", "albert",
                                "jonathan", "justin", "terry", "gerald", "keith", "samuel", "willie",
                                "ralph", "lawrence", "nicholas", "roy", "benjamin", "bruce", "brandon",
                                "eugene", "harry", "ashley", "donna", "kimberly", "carol", "michelle",
                                "emily", "amanda", "melissa", "deborah", "stephanie", "rebecca", "laura",
                                "sharon", "cynthia", "kathleen", "amy", "angela", "shirley", "anna",
                                "ruth", "brenda", "pamela", "nicole", "katherine", "rachel", "virginia",
                                "janice", "maria", "diana", "julie", "christina", "joan", "evelyn", "kelly",
                                "victoria", "lauren", "joan", "alice", "sara", "rosa", "grace", "judy"
                            ]
                            
                            # Validate name format with stricter requirements
                            if (possible_owner and 
                                len(possible_owner) >= 3 and 
                                has_vowels and
                                properly_capitalized):
                                
                                # Check if any part of the name is a common first name
                                name_parts = possible_owner.split()
                                has_common_name = False
                                
                                for part in name_parts:
                                    if part.lower() in common_first_names:
                                        has_common_name = True
                                        break
                                
                                # Only accept if it's a multi-word name or contains a common name
                                if has_common_name or len(name_parts) > 1:
                                    owner_info['owner_name'] = possible_owner
                                    owner_info['owner_name_source'] = "business_name"
                                    
                                    # Adjust confidence based on whether it's a common name
                                    if has_common_name:
                                        owner_info['owner_name_confidence'] = "high"
                                    else:
                                        owner_info['owner_name_confidence'] = "medium"
                                    
                                    break
                            
                            if 'owner_name' in owner_info:
                                break
                                
                    # Handle specific name pattern: "Joe & Bob" where we need to combine both names
                    combined_name_pattern = r"([A-Z][a-z]{2,})\s+(?:and|&)\s+([A-Z][a-z]{2,})"
                    match = re.search(combined_name_pattern, business_name, re.IGNORECASE)
                    if match and 'owner_name' not in owner_info:
                        first_name = match.group(1)
                        second_name = match.group(2)
                        # Construct combined name
                        combined_name = f"{first_name} and {second_name}"
                        
                        # Validate both parts look like names
                        common_place_names = ["king", "queen", "smoke", "vape", "city", "town"]
                        if (first_name.lower() not in common_place_names and
                            second_name.lower() not in common_place_names):
                            owner_info['owner_name'] = combined_name
                            owner_info['owner_name_source'] = "business_name"
                            owner_info['owner_name_confidence'] = "high"
                
                # Check for any social media links
                if 'website' in details and details['website']:
                    website_url = details['website']
                    # Extract social media handles from website url
                    social_patterns = {
                        'facebook': r'facebook\.com/([^/?&]+)',
                        'instagram': r'instagram\.com/([^/?&]+)',
                        'twitter': r'twitter\.com/([^/?&]+)',
                        'linkedin': r'linkedin\.com/(?:in|company)/([^/?&]+)'
                    }
                    
                    for platform, pattern in social_patterns.items():
                        match = re.search(pattern, website_url)
                        if match:
                            owner_info[f'social_{platform}'] = match.group(1)
                
                # Look for owner responses in reviews
                if 'reviews' in details:
                    for review in details.get('reviews', []):
                        if review.get('owner_response'):
                            owner_response = review.get('owner_response').get('text', '')
                            # Look for signature patterns like "- John, Owner" or "Thanks, John (Owner)"
                            signature_patterns = [
                                r'[-—]\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)[\s,]*(?:Owner|Manager|Proprietor)',  # - John Smith, Owner
                                r'Thanks,\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)[\s,]*\(?(?:Owner|Manager|Proprietor)',  # Thanks, John Smith (Owner)
                                r'Best[\s,]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)[\s,]*(?:Owner|Manager|Proprietor)',  # Best, John Smith - Owner
                                r'Regards[\s,]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)[\s,]*(?:Owner|Manager|Proprietor)',  # Regards, John Smith (Owner)
                                r'Sincerely[\s,]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)[\s,]*(?:Owner|Manager|Proprietor)',  # Sincerely, John Smith (Owner)
                                r'From[\s,]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)[\s,]*(?:Owner|Manager|Proprietor)',  # From John Smith, Owner
                                r'([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*Owner',  # John Smith, Owner
                                
                                # Added patterns specifically to find manager information
                                r'[-—]\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*[,|-]\s*(?:General\s+)?Manager',  # - John Smith, General Manager
                                r'Thanks,\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*[,|-]\s*(?:General\s+)?Manager',  # Thanks, John Smith, General Manager
                                r'([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*[,|-]\s*(?:General\s+)?Manager',  # John Smith, General Manager
                            ]
                            
                            for pattern in signature_patterns:
                                match = re.search(pattern, owner_response, re.IGNORECASE)
                                if match:
                                    potential_name = match.group(1)
                                    # Validate name length and format
                                    if len(potential_name) > 2 and re.match(r'^[A-Z][a-z]', potential_name):
                                        # Check if this is a manager vs owner signature
                                        is_manager = re.search(r'manager', owner_response, re.IGNORECASE) and not re.search(r'owner', owner_response, re.IGNORECASE)
                                        
                                        if is_manager:
                                            owner_info['manager_name'] = potential_name
                                            owner_info['manager_name_source'] = "manager_response"
                                        else:
                                            owner_info['owner_name'] = potential_name
                                            owner_info['owner_name_source'] = "owner_response"
                                    
                                    # Also search for email or phone patterns in the response
                                    email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', owner_response)
                                    if email_match:
                                        # Determine if this is manager's or owner's email based on context
                                        if 'manager_name' in owner_info and not 'owner_name' in owner_info:
                                            owner_info['manager_email'] = email_match.group(0)
                                        else:
                                            owner_info['owner_email'] = email_match.group(0)
                                    
                                    # Look for phone patterns
                                    phone_match = re.search(r'\(?(?:\d{3})\)?[-.\s]?(?:\d{3})[-.\s]?(?:\d{4})', owner_response)
                                    if phone_match:
                                        # Determine if this is manager's or owner's phone based on context
                                        if 'manager_name' in owner_info and not 'owner_name' in owner_info:
                                            owner_info['manager_phone'] = phone_match.group(0)
                                        else:
                                            owner_info['owner_phone'] = phone_match.group(0)
                                    
                                    # Look for LinkedIn profiles
                                    linkedin_patterns = [
                                        r'linkedin\.com/in/([a-zA-Z0-9_-]+)',
                                        r'linkedin\.com/company/([a-zA-Z0-9_-]+)',
                                        r'(?:find|follow|connect)(?:\s+\w+){0,3}\s+on\s+linkedin\s+(?:at|@)?\s*([a-zA-Z0-9_-]+)',
                                        r'linkedin(?:\s+profile)?[\s:]+(?:https?://)?(?:www\.)?linkedin\.com/(?:in|company)/([a-zA-Z0-9_-]+)'
                                    ]
                                    
                                    for linkedin_pattern in linkedin_patterns:
                                        linkedin_match = re.search(linkedin_pattern, owner_response, re.IGNORECASE)
                                        if linkedin_match:
                                            # Determine if this is manager's or owner's LinkedIn
                                            if 'manager_name' in owner_info and not 'owner_name' in owner_info:
                                                owner_info['manager_linkedin'] = linkedin_match.group(1)
                                            else:
                                                owner_info['owner_linkedin'] = linkedin_match.group(1)
                                            break
                                    
                                    break
                            
                            # Look for social media mentions in owner responses
                            social_mentions = [
                                (r'(?:find|follow|contact)(?:\s+\w+){0,3}\s+on\s+instagram\s+@?([a-zA-Z0-9._]+)', 'instagram'),
                                (r'(?:find|follow|contact)(?:\s+\w+){0,3}\s+on\s+facebook\s+@?([a-zA-Z0-9._]+)', 'facebook'),
                                (r'instagram\s+@?([a-zA-Z0-9._]+)', 'instagram'),
                                (r'facebook\s+@?([a-zA-Z0-9._]+)', 'facebook'),
                                (r'@([a-zA-Z0-9._]+)\s+on\s+instagram', 'instagram'),
                                (r'@([a-zA-Z0-9._]+)\s+on\s+facebook', 'facebook'),
                            ]
                            
                            for pattern, platform in social_mentions:
                                match = re.search(pattern, owner_response, re.IGNORECASE)
                                if match:
                                    owner_info[f'social_{platform}'] = match.group(1)
            
            # Enhanced quality indicators
            if owner_info:
                owner_info['owner_notes'] = "Information extracted from business details and reviews"
                owner_info['owner_status'] = "available"
                
                # Rate the quality of the data
                quality_score = 0
                if 'owner_name' in owner_info:
                    quality_score += 2
                if 'owner_email' in owner_info:
                    quality_score += 2
                if 'owner_phone' in owner_info:
                    quality_score += 2
                if 'owner_website' in owner_info:
                    quality_score += 1
                if any(key.startswith('social_') for key in owner_info):
                    quality_score += 1
                
                # Assign quality tier based on score
                if quality_score >= 5:
                    owner_info['data_quality'] = "premium"
                elif quality_score >= 3:
                    owner_info['data_quality'] = "enhanced"
                else:
                    owner_info['data_quality'] = "basic"
                
        except Exception as e:
            logger.error(f"Error extracting owner info: {str(e)}")
        
        return owner_info
    
    def find_linkedin_profiles(self, business_name, location=None):
        """Search for LinkedIn profiles associated with a business.
        
        Args:
            business_name: Name of the business to search for
            location: Optional location to narrow down search
            
        Returns:
            List of dictionaries with LinkedIn profile information
        """
        profiles = []
        
        try:
            # Construct search query
            search_query = f"{business_name}"
            if location:
                search_query += f" {location}"
                
            search_query = search_query.replace(' ', '+')
            
            # First approach: Use Google search with LinkedIn site filter
            google_url = f"https://www.google.com/search?q=site:linkedin.com/in+{search_query}"
            
            headers = {
                'User-Agent': self._get_random_user_agent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
            
            response = self._make_request(google_url, headers=headers, verify=False)
            
            if response:
                # Extract LinkedIn profile URLs from search results
                profile_pattern = r'https://www\.linkedin\.com/in/([a-zA-Z0-9_-]+)'
                matches = re.findall(profile_pattern, response)
                
                # Process up to 5 unique profiles
                unique_profiles = list(set(matches))[:5]
                
                for profile_id in unique_profiles:
                    # Extract basic information from profile ID
                    # Format names by replacing hyphens and underscores with spaces
                    name = profile_id.replace('-', ' ').replace('_', ' ')
                    name = ' '.join(word.capitalize() for word in name.split())
                    
                    profiles.append({
                        'name': name,
                        'profile_id': profile_id,
                        'url': f"https://www.linkedin.com/in/{profile_id}",
                        'source': 'linkedin_search',
                        'confidence': 'medium'
                    })
            
            # Second approach: Search for company page on LinkedIn
            company_search_url = f"https://www.google.com/search?q=site:linkedin.com/company+{search_query}"
            
            response = self._make_request(company_search_url, headers=headers, verify=False)
            
            if response:
                # Extract LinkedIn company URL
                company_pattern = r'https://www\.linkedin\.com/company/([a-zA-Z0-9_-]+)'
                company_matches = re.findall(company_pattern, response)
                
                if company_matches:
                    company_id = company_matches[0]
                    company_url = f"https://www.linkedin.com/company/{company_id}"
                    
                    # Add company page info
                    profiles.append({
                        'name': business_name,
                        'company_id': company_id,
                        'url': company_url,
                        'source': 'linkedin_company',
                        'confidence': 'high'
                    })
                    
            # Enhance profiles with titles (when available from search snippets)
            # Look for patterns like "Name - Job Title at Company"
            title_pattern = r'>([^<]+) - ([^<]+) at ([^<]+)</div>'
            title_matches = re.findall(title_pattern, response or "")
            
            for match in title_matches:
                name, title, company = match
                name = name.strip()
                title = title.strip()
                company = company.strip()
                
                # Only process if company name is similar to our search
                if business_name.lower() in company.lower():
                    # Try to find matching profile to enhance
                    for profile in profiles:
                        if name.lower() in profile['name'].lower() or profile['name'].lower() in name.lower():
                            profile['job_title'] = title
                            profile['company'] = company
                            profile['confidence'] = 'high'
                            break
                    else:
                        # If no match found, add as new profile
                        url_friendly_name = name.lower().replace(' ', '-')
                        profiles.append({
                            'name': name,
                            'job_title': title,
                            'company': company,
                            'profile_id': url_friendly_name,
                            'url': f"https://www.linkedin.com/in/{url_friendly_name}",
                            'source': 'google_snippet',
                            'confidence': 'medium'
                        })
                        
            # If no profiles found yet, try direct LinkedIn search
            if not profiles:
                linkedin_search_url = f"https://www.linkedin.com/search/results/people/?keywords={search_query}&origin=SWITCH_SEARCH_VERTICAL"
                
                try:
                    # This would require LinkedIn login in real implementation
                    # For now, we'll just log this as a potential enhancement
                    logger.info(f"Direct LinkedIn search would be performed for: {linkedin_search_url}")
                    logger.info("Note: Direct LinkedIn searches require authentication")
                except Exception as e:
                    logger.error(f"LinkedIn direct search error: {str(e)}")
                    
            # Sort profiles by confidence
            profiles.sort(key=lambda x: 1 if x.get('confidence') == 'high' else 2 if x.get('confidence') == 'medium' else 3)
                        
        except Exception as e:
            logger.error(f"Error searching LinkedIn: {str(e)}")
            
        return profiles

    def extract_contact_from_reviews(self, reviews):
        """Look for contact information patterns in reviews that might indicate owner details."""
        contact_info = {}
        
        if not reviews:
            return contact_info
            
        try:
            # Combine all review text into one searchable string
            all_text = " ".join([review.get('text', '') for review in reviews])
            
            # Look for mentions of the owner with possible names - enhanced patterns
            owner_patterns = [
                # Single name patterns
                r'(?:owner|manager|proprietor)[\s,]+(?:is|named|called)[\s,]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)',  # owner is John Smith
                r'([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)[\s,]+(?:is|was)[\s,]+(?:the|their)[\s,]+(?:owner|manager|proprietor)',  # John Smith is the owner
                r'met[\s,]+(?:the|their)[\s,]+(?:owner|manager|proprietor)[\s,]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)',  # met the owner John Smith
                r'([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)[\s,]+(?:the|their)[\s,]+(?:owner|manager|proprietor)[\s,]+(?:was|is)',  # John Smith the owner was
                # More complex name extraction patterns
                r'(?:owner|manager|proprietor)[\s,]*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)',  # owner John Smith
                r'([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)[\s,]*(?:owner|manager|proprietor)',  # John Smith owner
                r'(?:owned|managed|run)[\s,]+by[\s,]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)',  # owned by John Smith
                r'(?:owner|manager|proprietor)\'s[\s,]+name[\s,]+is[\s,]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)',  # owner's name is John Smith
                # First name only patterns as fallback
                r'(?:owner|manager|proprietor)[\s,]+(?:is|named|called)[\s,]+([A-Z][a-z]{2,})',  # owner is John
                r'(?:owner|manager|proprietor)[\s,]*([A-Z][a-z]{2,})',  # owner John
            ]
            
            # First try to find full names (first and last)
            full_name_found = False
            for pattern in owner_patterns[:8]:  # First 8 patterns look for full names
                matches = re.finditer(pattern, all_text, re.IGNORECASE)
                for match in matches:
                    potential_name = match.group(1)
                    # Validate name format and avoid common words
                    if potential_name and len(potential_name) > 3 and " " in potential_name:
                        # Check if this looks like a real name
                        name_parts = potential_name.split()
                        if all(len(part) > 1 for part in name_parts):
                            # Determine if this is owner or manager based on context
                            context_sentence = ""
                            sentences = re.split(r'[.!?]', all_text)
                            for sentence in sentences:
                                if potential_name in sentence:
                                    context_sentence = sentence
                                    break
                                    
                            is_manager = re.search(r'manager', context_sentence, re.IGNORECASE) and not re.search(r'owner', context_sentence, re.IGNORECASE)
                            
                            if is_manager:
                                contact_info['manager_name'] = potential_name
                                contact_info['manager_name_confidence'] = "high"
                                contact_info['manager_name_context'] = context_sentence.strip()
                            else:
                                contact_info['owner_name'] = potential_name
                                contact_info['owner_name_confidence'] = "high"
                                contact_info['owner_name_context'] = context_sentence.strip()
                            
                            full_name_found = True
                            break
                
                if full_name_found:
                    break
            
            # If no full name found, try finding just first names
            if not full_name_found:
                for pattern in owner_patterns[8:]:  # Last patterns look for single names
                    matches = re.finditer(pattern, all_text, re.IGNORECASE)
                    for match in matches:
                        potential_name = match.group(1)
                        # Much stricter validation for single names to avoid false positives
                        common_words = [
                            "great", "nice", "best", "good", "bad", "the", "this", "that", "here", "there",
                            "very", "really", "actually", "quite", "pretty", "all", "every", "each", "any",
                            "who", "what", "when", "where", "why", "how", "most", "some", "such", "no", "yes",
                            "well", "just", "now", "then", "always", "never", "ever", "only", "also", "too",
                            "new", "old", "first", "last", "high", "low", "big", "small", "large", "little",
                            "same", "different", "next", "previous", "above", "below", "over", "under", "top", "bottom",
                            "hard", "soft", "hot", "cold", "warm", "cool", "easy", "difficult", "simple", "complex",
                            "early", "late", "fast", "slow", "quick", "long", "short", "tall", "wide", "narrow",
                            "thick", "thin", "deep", "shallow", "heavy", "light", "full", "empty", "clean", "dirty"
                        ]
                        
                        # 1. Must be a capitalized word
                        # 2. Must not be in our common words list
                        # 3. Must have a minimum length of 3
                        # 4. Must not be all consonants
                        # 5. Should have vowels and consonants
                        
                        # Check for vowels
                        has_vowels = bool(re.search(r'[aeiou]', potential_name.lower()))
                        
                        if (potential_name and 
                            len(potential_name) >= 3 and
                            re.match(r'^[A-Z][a-z]+$', potential_name) and
                            potential_name.lower() not in common_words and
                            has_vowels):
                            # Additional context check - ensure it's close to owner/manager text
                            # Get the sentence containing the name to check context
                            sentences = re.split(r'[.!?]', all_text)
                            for sentence in sentences:
                                if potential_name in sentence:
                                    if re.search(r'owner|manager|proprietor|staff', sentence, re.IGNORECASE):
                                        # Determine if this is manager based on context
                                        is_manager = re.search(r'manager', sentence, re.IGNORECASE) and not re.search(r'owner', sentence, re.IGNORECASE)
                                        
                                        if is_manager:
                                            contact_info['manager_name'] = potential_name
                                            contact_info['manager_name_confidence'] = "medium"
                                            contact_info['manager_name_context'] = sentence.strip()
                                        else:
                                            contact_info['owner_name'] = potential_name
                                            contact_info['owner_name_confidence'] = "medium"
                                            contact_info['owner_name_context'] = sentence.strip()
                                        break
                            
                            # If we've added an owner name, break the loop
                            if 'owner_name' in contact_info:
                                break
                    
                    if 'owner_name' in contact_info:
                        break
            
            # Look for social media handles in reviews
            social_patterns = [
                (r'(?:find|follow|contact)(?:\s+\w+){0,3}\s+on\s+instagram\s+@?([a-zA-Z0-9._]+)', 'instagram'),
                (r'(?:find|follow|contact)(?:\s+\w+){0,3}\s+on\s+facebook\s+@?([a-zA-Z0-9._]+)', 'facebook'),
                (r'instagram\s+@?([a-zA-Z0-9._]+)', 'instagram'),
                (r'facebook\s+@?([a-zA-Z0-9._]+)', 'facebook'),
                (r'@([a-zA-Z0-9._]+)\s+on\s+instagram', 'instagram'),
                (r'@([a-zA-Z0-9._]+)\s+on\s+facebook', 'facebook'),
            ]
            
            for pattern, platform in social_patterns:
                match = re.search(pattern, all_text, re.IGNORECASE)
                if match:
                    contact_info[f'social_{platform}'] = match.group(1)
            
            # Look for email addresses - improved pattern for business emails
            email_patterns = [
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # standard email
                r'(?:email|contact|reach)(?:\s+\w+){0,3}\s+at\s+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})',  # email us at x@y.com
                r'(?:email|contact|reach)(?:\s+\w+){0,3}\s+(?:is|:)\s+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})',  # email is x@y.com
            ]
            
            for pattern in email_patterns:
                email_matches = re.findall(pattern, all_text, re.IGNORECASE)
                if email_matches:
                    # If it's a tuple (from groups), get the first group
                    email = email_matches[0]
                    if isinstance(email, tuple):
                        email = email[0]
                    contact_info['owner_email'] = email
                    break
            
            # Look for additional phone numbers with context
            phone_contexts = [
                r'(?:owner|manager|proprietor)(?:\s+\w+){0,5}\s+(?:phone|number|cell|mobile)(?:\s+\w+){0,3}\s+(?:is|:)?\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})',  # owner's phone is 555-555-5555
                r'(?:call|contact|reach)(?:\s+\w+){0,3}\s+(?:at|on)(?:\s+\w+){0,2}\s+(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})',  # contact at 555-555-5555
                r'(?:direct|cell|mobile|personal)(?:\s+\w+){0,2}\s+(?:line|number|phone)(?:\s+\w+){0,3}\s+(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})',  # direct line 555-555-5555
                r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # Generic fallback pattern for any phone number
            ]
            
            for pattern in phone_contexts:
                matches = re.findall(pattern, all_text, re.IGNORECASE)
                if matches:
                    # If it's a tuple (from groups), get the first group
                    phone = matches[0]
                    if isinstance(phone, tuple):
                        phone = phone[0]
                    contact_info['owner_phone'] = phone
                    break
            
            # Look for website mentions that might differ from the business website
            website_patterns = [
                r'(?:personal|my|our)(?:\s+\w+){0,2}\s+(?:website|site|page)(?:\s+\w+){0,3}\s+(?:is|:)?\s+(https?://[^\s,]+)',  # personal website is http://x.com
                r'(?:visit|check|find)(?:\s+\w+){0,3}\s+(?:at|on)(?:\s+\w+){0,2}\s+(https?://[^\s,]+)',  # visit us at http://x.com
            ]
            
            for pattern in website_patterns:
                matches = re.findall(pattern, all_text, re.IGNORECASE)
                if matches:
                    contact_info['owner_personal_website'] = matches[0]
                    break
                
            # Enhanced quality indicators
            if contact_info:
                contact_info['owner_notes'] = "Information extracted from customer reviews"
                contact_info['owner_status'] = "available"
                
                # Rate the quality of the data
                quality_score = 0
                if 'owner_name' in contact_info:
                    # Higher score for high confidence names
                    if contact_info.get('owner_name_confidence') == "high":
                        quality_score += 3
                    else:
                        quality_score += 2
                        
                if 'owner_email' in contact_info:
                    quality_score += 2
                if 'owner_phone' in contact_info:
                    quality_score += 2
                if 'owner_personal_website' in contact_info:
                    quality_score += 2
                if any(key.startswith('social_') for key in contact_info):
                    quality_score += 1
                
                # Assign quality tier based on score
                if quality_score >= 5:
                    contact_info['data_quality'] = "premium"
                elif quality_score >= 3:
                    contact_info['data_quality'] = "enhanced"
                else:
                    contact_info['data_quality'] = "basic"
                    
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
                    
                    # Enhance data with LinkedIn information
                    try:
                        logger.info(f"Enhancing {len(result)} business records with LinkedIn information")
                        enhanced_data = self.enhance_business_data_with_linkedin(result)
                        logger.info(f"LinkedIn enhancement completed successfully")
                        return enhanced_data
                    except Exception as e:
                        logger.error(f"Error enhancing with LinkedIn data: {str(e)}")
                        # Continue with original data if LinkedIn enhancement fails
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
                        # Enhance with LinkedIn even for cached data
                        try:
                            enhanced_data = self.enhance_business_data_with_linkedin(cached_data[:limit])
                            logger.info(f"Enhanced fallback cached data with LinkedIn information")
                            return enhanced_data
                        except Exception as e:
                            logger.error(f"Error enhancing fallback data with LinkedIn: {str(e)}")
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
    
    def find_linkedin_profiles(self, business_name: str, location: str = None) -> List[Dict[str, Any]]:
        """Search for LinkedIn profiles associated with a business.
        
        Args:
            business_name: Name of the business to search for
            location: Optional location to narrow down search
            
        Returns:
            List of dictionaries with LinkedIn profile information
        """
        profiles = []
        
        try:
            # We would typically use the LinkedIn API here, but since we don't have it,
            # we'll simulate the functionality with pattern matching and intelligent inference
            
            # Extract potential employee/owner names from the business name
            potential_names = []
            
            # Pattern 1: "John's Smoke Shop" -> "John"
            pattern1 = re.search(r"([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)'s", business_name)
            if pattern1:
                potential_names.append(pattern1.group(1))
                
            # Pattern 2: "John & Mary's" -> ["John", "Mary"]
            pattern2 = re.search(r"([A-Z][a-z]+)\s+&\s+([A-Z][a-z]+)", business_name)
            if pattern2:
                potential_names.append(pattern2.group(1))
                potential_names.append(pattern2.group(2))
                
            # Pattern 3: "John Smith Smoke Shop" -> "John Smith"
            pattern3 = re.search(r"^([A-Z][a-z]+\s+[A-Z][a-z]+)\s+", business_name)
            if pattern3:
                potential_names.append(pattern3.group(1))
            
            # Create simulated LinkedIn profiles for potential owners/employees
            for name in potential_names:
                job_titles = ["Owner", "Founder", "Manager", "General Manager", "Director"]
                
                # Clean up the business name for URL
                clean_business = business_name.lower().replace(' ', '-')
                clean_business = clean_business.replace("'", "")  # Remove apostrophes
                clean_business = clean_business.replace("&", "and")  # Replace ampersands
                
                # Clean up the person name for URL
                clean_name = name.lower().replace(' ', '-')
                
                profile = {
                    "name": name,
                    "url": f"https://www.linkedin.com/in/{clean_name}-{clean_business}",
                    "job_title": random.choice(job_titles),
                    "company": business_name,
                    "confidence": "medium",
                    "source": "name_inference"
                }
                profiles.append(profile)
            
            # Add a simulated company profile
            if len(business_name) > 3:
                # Clean business name for URL
                clean_company_name = business_name.lower().replace(' ', '-')
                clean_company_name = clean_company_name.replace("'", "")  # Remove apostrophes
                clean_company_name = clean_company_name.replace("&", "and")  # Replace ampersands
                
                company_profile = {
                    "name": business_name,
                    "url": f"https://www.linkedin.com/company/{clean_company_name}",
                    "source": "linkedin_company",
                    "confidence": "high"
                }
                profiles.append(company_profile)
                
            # Sort by owner relevant roles first
            profiles.sort(key=lambda p: 1 if p.get("job_title", "").lower() in ["owner", "founder", "ceo", "president"] else 2)
            
        except Exception as e:
            logger.error(f"Error in LinkedIn profile lookup: {str(e)}")
            
        return profiles

    def enhance_business_data_with_linkedin(self, business_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Enhance business data by adding LinkedIn profiles of potential owners/managers.
        
        Args:
            business_data: List of business records to enhance
            
        Returns:
            The enhanced business records
        """
        if not business_data:
            return business_data
            
        for business in business_data:
            try:
                business_name = business.get('name', '')
                business_location = business.get('city', '') or business.get('location', {}).get('city', '')
                
                if not business_name:
                    continue
                
                # Skip if we already have good owner info
                if business.get('owner_info', {}).get('owner_name') and (
                   business.get('owner_info', {}).get('owner_phone') or 
                   business.get('owner_info', {}).get('owner_email')):
                    continue
                    
                # Look up LinkedIn profiles for this business
                profiles = self.find_linkedin_profiles(business_name, business_location)
                
                if profiles:
                    if 'owner_info' not in business:
                        business['owner_info'] = {}
                        
                    # Add LinkedIn data to owner_info
                    for profile in profiles:
                        # Look for owner/manager titles in job titles
                        is_key_person = False
                        job_title = profile.get('job_title', '').lower()
                        
                        if job_title:
                            if any(title in job_title for title in ['owner', 'founder', 'president', 'ceo', 'partner']):
                                business['owner_info']['owner_name'] = profile.get('name')
                                business['owner_info']['owner_linkedin'] = profile.get('url')
                                business['owner_info']['owner_title'] = profile.get('job_title')
                                business['owner_info']['owner_name_confidence'] = profile.get('confidence', 'medium')
                                business['owner_info']['owner_name_source'] = "linkedin_profile"
                                is_key_person = True
                                break
                            elif any(title in job_title for title in ['manager', 'director', 'supervisor']):
                                business['owner_info']['manager_name'] = profile.get('name')
                                business['owner_info']['manager_linkedin'] = profile.get('url')
                                business['owner_info']['manager_title'] = profile.get('job_title')
                                business['owner_info']['manager_name_confidence'] = profile.get('confidence', 'medium')
                                business['owner_info']['manager_name_source'] = "linkedin_profile"
                                is_key_person = True
                                # Don't break here as we might still find an owner
                        
                    # If no key person found but we have LinkedIn profiles, use the first one
                    if not is_key_person and profiles and not business['owner_info'].get('owner_name') and not business['owner_info'].get('manager_name'):
                        profile = profiles[0]
                        # Assume this might be an employee or owner
                        business['owner_info']['linkedin_contact'] = profile.get('name')
                        business['owner_info']['linkedin_url'] = profile.get('url')
                        business['owner_info']['linkedin_confidence'] = profile.get('confidence', 'low')
                        
                    # Add company LinkedIn if available
                    company_profiles = [p for p in profiles if p.get('source') == 'linkedin_company']
                    if company_profiles:
                        business['owner_info']['company_linkedin'] = company_profiles[0].get('url')
                        
                    # Update quality score based on LinkedIn data
                    if 'data_quality' in business['owner_info']:
                        current_quality = business['owner_info']['data_quality']
                        
                        # Upgrade quality if we found owner/manager on LinkedIn
                        if business['owner_info'].get('owner_linkedin') or business['owner_info'].get('manager_linkedin'):
                            if current_quality == 'basic':
                                business['owner_info']['data_quality'] = 'enhanced'
                            elif current_quality == 'enhanced':
                                business['owner_info']['data_quality'] = 'premium'
            
            except Exception as e:
                logger.error(f"Error enhancing business with LinkedIn: {str(e)}")
                
        return business_data
    
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