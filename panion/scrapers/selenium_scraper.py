"""
Selenium Scraper
Implements browser-based scraping using Selenium for sites with complex JavaScript.
Complements the existing Playwright scraper with another approach.
"""

import os
import json
import time
import random
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

# Import selenium components
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException, 
    NoSuchElementException, 
    WebDriverException,
    ElementNotInteractableException,
    StaleElementReferenceException
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SeleniumScraper:
    """A browser-based scraper using Selenium for handling JavaScript-heavy sites and avoiding detection."""
    
    def __init__(self):
        """Initialize the SeleniumScraper."""
        self.data_dir = os.path.join('data', 'scraped')
        os.makedirs(self.data_dir, exist_ok=True)
        
    def _get_random_user_agent(self) -> str:
        """Get a random realistic user agent string."""
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0"
        ]
        return random.choice(user_agents)
    
    def _setup_driver(self, use_proxy: bool = False, proxy_url: Optional[str] = None) -> webdriver.Chrome:
        """Set up and launch a Chrome browser instance with stealth settings."""
        try:
            options = Options()
            options.add_argument("--headless")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument(f"user-agent={self._get_random_user_agent()}")
            options.add_argument("--disable-blink-features=AutomationControlled")
            
            # Add proxy if requested
            if use_proxy and proxy_url:
                options.add_argument(f'--proxy-server={proxy_url}')
                
            # Experimental options to avoid detection
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option('useAutomationExtension', False)
            
            # Create the WebDriver
            driver = webdriver.Chrome(options=options)
            
            # Execute anti-detection script
            driver.execute_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            return driver
            
        except Exception as e:
            logger.error(f"Error setting up Chrome driver: {str(e)}")
            raise
    
    def _random_sleep(self, min_sec: float = 1.0, max_sec: float = 3.0) -> None:
        """Sleep for a random time to mimic human behavior."""
        time.sleep(random.uniform(min_sec, max_sec))
    
    def _random_scroll(self, driver: webdriver.Chrome) -> None:
        """Perform random scrolling to mimic human behavior."""
        try:
            # Get page height
            page_height = driver.execute_script("return document.body.scrollHeight")
            
            # Perform 2-5 scroll actions
            num_scrolls = random.randint(2, 5)
            for _ in range(num_scrolls):
                # Scroll to random position
                scroll_position = random.randint(100, page_height - 200)
                driver.execute_script(f"window.scrollTo(0, {scroll_position});")
                self._random_sleep(0.5, 1.5)
        except Exception as e:
            logger.warning(f"Error during random scrolling: {str(e)}")
    
    async def scrape_business_directory(self, 
                                       business_type: str = "coffee shop", 
                                       location: str = "New York", 
                                       limit: int = 10,
                                       use_proxy: bool = False,
                                       proxy_url: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Scrape business information using Selenium.
        
        Args:
            business_type: Type of business to search for
            location: City/location to search in
            limit: Maximum number of results to return
            use_proxy: Whether to use a proxy server
            proxy_url: URL of the proxy server to use
        
        Returns:
            List of dictionaries containing business information
        """
        logger.info(f"Selenium scraping {business_type} in {location}")
        
        results = []
        driver = None
        
        try:
            # Initialize Chrome driver
            driver = self._setup_driver(use_proxy, proxy_url)
            
            # We'll scrape Yelp for business data
            search_url = f"https://www.yelp.com/search?find_desc={business_type.replace(' ', '+')}&find_loc={location.replace(' ', '+')}"
            driver.get(search_url)
            
            # Wait for search results to load
            self._random_sleep(2.0, 4.0)
            self._random_scroll(driver)
            
            # Find all business cards on the page
            try:
                wait = WebDriverWait(driver, 10)
                # Wait for the business listings container to load
                business_listings = wait.until(
                    EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.businessName__09f24__EYSZE")))
                
                # Extract information from each business card
                for i, business_element in enumerate(business_listings):
                    if i >= limit:
                        break
                    
                    try:
                        # Extract business name and URL
                        name_element = business_element.find_element(By.CSS_SELECTOR, "a.css-19v1rkv")
                        business_name = name_element.text
                        business_url = name_element.get_attribute("href")
                        
                        # Open the business page to get more details
                        driver.execute_script("window.open('');")
                        driver.switch_to.window(driver.window_handles[1])
                        driver.get(business_url)
                        self._random_sleep(1.5, 3.0)
                        
                        # Extract additional information
                        try:
                            address = driver.find_element(By.CSS_SELECTOR, "address").text
                        except NoSuchElementException:
                            address = "Not available"
                            
                        try:
                            phone = driver.find_element(By.CSS_SELECTOR, "p.css-1p9ibgf").text
                        except NoSuchElementException:
                            phone = "Not available"
                            
                        try:
                            rating_element = driver.find_element(By.CSS_SELECTOR, "div.css-1d8sug0")
                            rating = rating_element.text.split()[0]
                        except (NoSuchElementException, IndexError):
                            rating = "Not available"
                            
                        try:
                            review_count_element = driver.find_element(By.CSS_SELECTOR, "div.css-bq71j2")
                            review_count = review_count_element.text.split()[0].replace("(", "").replace(")", "")
                        except (NoSuchElementException, IndexError):
                            review_count = "0"
                        
                        # Add business to results
                        results.append({
                            "name": business_name,
                            "address": address,
                            "phone": phone,
                            "rating": rating,
                            "review_count": review_count,
                            "url": business_url,
                            "source": "yelp_selenium",
                            "scraped_at": datetime.now().isoformat()
                        })
                        
                        # Close the business tab and go back to search results
                        driver.close()
                        driver.switch_to.window(driver.window_handles[0])
                        self._random_sleep(0.5, 1.5)
                        
                    except Exception as e:
                        logger.warning(f"Error extracting business info: {str(e)}")
                        if len(driver.window_handles) > 1:
                            driver.close()
                            driver.switch_to.window(driver.window_handles[0])
            
            except TimeoutException:
                logger.warning("Timed out waiting for business listings to load")
                
        except Exception as e:
            logger.error(f"Error in Selenium scraping: {str(e)}")
            
        finally:
            # Clean up
            if driver:
                driver.quit()
            
        logger.info(f"Selenium scraper found {len(results)} businesses")
        return results
    
    def scrape_google_maps(self, 
                          business_type: str = "coffee shop", 
                          location: str = "New York", 
                          limit: int = 10,
                          use_proxy: bool = False,
                          proxy_url: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Scrape business information from Google Maps.
        
        Args:
            business_type: Type of business to search for
            location: City/location to search in
            limit: Maximum number of results to return
            use_proxy: Whether to use a proxy server
            proxy_url: URL of the proxy server to use
        
        Returns:
            List of dictionaries containing business information
        """
        logger.info(f"Selenium scraping Google Maps for {business_type} in {location}")
        
        results = []
        driver = None
        
        try:
            # Initialize Chrome driver
            driver = self._setup_driver(use_proxy, proxy_url)
            
            # Format Google Maps search URL
            search_query = f"{business_type} in {location}"
            search_url = f"https://www.google.com/maps/search/{search_query.replace(' ', '+')}"
            driver.get(search_url)
            
            # Wait for search results to load
            self._random_sleep(3.0, 5.0)
            
            # Accept cookies if the dialog appears
            try:
                cookie_button = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(@aria-label, 'Accept')]")))
                cookie_button.click()
                self._random_sleep(1.0, 2.0)
            except (TimeoutException, NoSuchElementException):
                pass  # No cookie dialog
            
            # Find business listings
            try:
                # Wait for results to load
                wait = WebDriverWait(driver, 15)
                result_elements = wait.until(
                    EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.Nv2PK")))
                
                # Sometimes we need to scroll to load more results
                self._random_scroll(driver)
                self._random_sleep(1.0, 2.0)
                
                # Try to get results again after scrolling
                result_elements = driver.find_elements(By.CSS_SELECTOR, "div.Nv2PK")
                
                for i, element in enumerate(result_elements):
                    if i >= limit:
                        break
                    
                    try:
                        # Click on the result to see details
                        element.click()
                        self._random_sleep(2.0, 3.0)
                        
                        # Extract business information
                        try:
                            business_name = driver.find_element(By.CSS_SELECTOR, "h1.DUwDvf").text
                        except NoSuchElementException:
                            business_name = "Not available"
                            
                        try:
                            address_element = driver.find_element(By.CSS_SELECTOR, "button[data-item-id='address']")
                            address = address_element.text
                        except NoSuchElementException:
                            address = "Not available"
                            
                        try:
                            phone_element = driver.find_element(By.CSS_SELECTOR, "button[data-item-id='phone:tel']")
                            phone = phone_element.text
                        except NoSuchElementException:
                            phone = "Not available"
                            
                        try:
                            rating_element = driver.find_element(By.CSS_SELECTOR, "div.F7nice")
                            rating_text = rating_element.text
                            rating = rating_text.split()[0]
                            review_count = rating_text.split("(")[1].split(")")[0] if "(" in rating_text else "0"
                        except (NoSuchElementException, IndexError):
                            rating = "Not available"
                            review_count = "0"
                            
                        try:
                            website_element = driver.find_element(By.CSS_SELECTOR, "a[data-item-id='authority']")
                            website = website_element.get_attribute("href")
                        except NoSuchElementException:
                            website = "Not available"
                        
                        # Add business to results
                        results.append({
                            "name": business_name,
                            "address": address,
                            "phone": phone,
                            "rating": rating,
                            "review_count": review_count,
                            "website": website,
                            "source": "google_maps_selenium",
                            "scraped_at": datetime.now().isoformat()
                        })
                        
                        # Go back to results
                        back_button = driver.find_element(By.CSS_SELECTOR, "button.hYBOP")
                        back_button.click()
                        self._random_sleep(1.0, 2.0)
                        
                    except Exception as e:
                        logger.warning(f"Error extracting Google Maps business info: {str(e)}")
                        
            except TimeoutException:
                logger.warning("Timed out waiting for Google Maps results to load")
                
        except Exception as e:
            logger.error(f"Error in Google Maps scraping: {str(e)}")
            
        finally:
            # Clean up
            if driver:
                driver.quit()
            
        logger.info(f"Google Maps scraper found {len(results)} businesses")
        return results
    
    def save_to_json(self, businesses: List[Dict[str, Any]], filename: str = "businesses.json") -> str:
        """Save the scraped businesses to a JSON file."""
        
        # Ensure filename has .json extension
        if not filename.endswith('.json'):
            filename += '.json'
            
        # Create full path in data directory
        filepath = os.path.join(self.data_dir, filename)
        
        # Save the data
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(businesses, f, indent=2)
            
        logger.info(f"Saved {len(businesses)} businesses to {filepath}")
        return filepath
    
    def combine_results(self, 
                      yelp_results: List[Dict[str, Any]], 
                      google_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Combine and deduplicate results from multiple sources.
        
        This method tries to identify the same business across different data sources
        and merge the information to create more complete business records.
        """
        combined_results = []
        seen_businesses = set()
        
        # Process Yelp results first
        for yelp_business in yelp_results:
            business_name = yelp_business["name"].lower()
            if business_name not in seen_businesses:
                seen_businesses.add(business_name)
                combined_results.append(yelp_business)
        
        # Process Google results, merging with Yelp results if possible
        for google_business in google_results:
            google_name = google_business["name"].lower()
            
            # Check if we already have this business from Yelp
            match_found = False
            for i, existing_business in enumerate(combined_results):
                existing_name = existing_business["name"].lower()
                
                # Simple name matching (could be improved with fuzzy matching)
                if google_name == existing_name or google_name in existing_name or existing_name in google_name:
                    # Merge the records
                    match_found = True
                    merged_business = existing_business.copy()
                    
                    # Keep the better data from either source
                    for key, value in google_business.items():
                        if key not in merged_business or merged_business[key] == "Not available":
                            merged_business[key] = value
                    
                    # Update sources
                    merged_business["source"] = f"{merged_business['source']},google_maps_selenium"
                    
                    # Replace the existing record with the merged one
                    combined_results[i] = merged_business
                    break
            
            # If no match was found, add the Google result
            if not match_found:
                seen_businesses.add(google_name)
                combined_results.append(google_business)
                
        return combined_results