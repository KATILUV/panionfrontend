"""
Proxy Manager
Provides rotating proxy functionality for web scraping operations.
"""

import os
import logging
import time
import random
import json
from typing import Dict, List, Optional, Union
from datetime import datetime, timedelta

try:
    from fp.fp import FreeProxy
except ImportError:
    FreeProxy = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ProxyManager:
    """Manager for proxy rotation and health checking."""
    
    def __init__(self, proxy_file_path: str = "data/proxies.json", max_fail_count: int = 3, check_interval: int = 3600):
        """Initialize the proxy manager.
        
        Args:
            proxy_file_path: Path to store cached proxies
            max_fail_count: Maximum failures before removing a proxy
            check_interval: How often to refresh proxy list in seconds
        """
        self.proxy_file_path = proxy_file_path
        self.max_fail_count = max_fail_count
        self.check_interval = check_interval
        
        # Proxy storage
        self.proxies = []
        self.failed_proxies = {}
        self.last_updated = None
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.proxy_file_path), exist_ok=True)
        
        # Load proxies if they exist
        self._load_proxies()
        
    def _load_proxies(self) -> None:
        """Load proxies from file if it exists."""
        try:
            if os.path.exists(self.proxy_file_path):
                with open(self.proxy_file_path, 'r') as f:
                    data = json.load(f)
                    self.proxies = data.get('proxies', [])
                    self.failed_proxies = data.get('failed_proxies', {})
                    last_updated_str = data.get('last_updated')
                    
                    if last_updated_str:
                        self.last_updated = datetime.fromisoformat(last_updated_str)
                    
                    logger.info(f"Loaded {len(self.proxies)} proxies from cache")
        except Exception as e:
            logger.error(f"Error loading proxies: {str(e)}")
            self.proxies = []
            self.failed_proxies = {}
    
    def _save_proxies(self) -> None:
        """Save proxies to file."""
        try:
            data = {
                'proxies': self.proxies,
                'failed_proxies': self.failed_proxies,
                'last_updated': datetime.now().isoformat()
            }
            
            with open(self.proxy_file_path, 'w') as f:
                json.dump(data, f)
                
            logger.info(f"Saved {len(self.proxies)} proxies to cache")
        except Exception as e:
            logger.error(f"Error saving proxies: {str(e)}")
    
    def _needs_refresh(self) -> bool:
        """Check if proxy list needs to be refreshed."""
        if not self.last_updated:
            return True
            
        time_diff = datetime.now() - self.last_updated
        return time_diff.total_seconds() > self.check_interval or len(self.proxies) < 5
    
    def _fetch_new_proxies(self, count: int = 10) -> List[str]:
        """Fetch new proxies using FreeProxy."""
        if not FreeProxy:
            logger.warning("FreeProxy not available, cannot fetch new proxies")
            return []
            
        new_proxies = []
        countries = ['US', 'CA', 'GB', 'DE', 'FR']  # Countries with generally good proxies
        
        for _ in range(count):
            try:
                # Try to get a proxy from one of the specified countries
                country = random.choice(countries)
                proxy = FreeProxy(country_id=country, timeout=1).get()
                
                if proxy and proxy not in new_proxies and proxy not in self.proxies:
                    new_proxies.append(proxy)
            except Exception as e:
                logger.error(f"Error fetching proxy: {str(e)}")
                
            # Small delay to avoid hammering the proxy service
            time.sleep(0.5)
                
        return new_proxies
    
    def get_proxy(self) -> Optional[str]:
        """Get a random working proxy."""
        # Check if we need to refresh the proxy list
        if self._needs_refresh():
            logger.info("Refreshing proxy list")
            
            # Fetch new proxies
            new_proxies = self._fetch_new_proxies(10)
            
            if new_proxies:
                # Add new proxies to our list
                for proxy in new_proxies:
                    if proxy not in self.proxies:
                        self.proxies.append(proxy)
                
                # Update last updated time
                self.last_updated = datetime.now()
                
                # Save updated proxy list
                self._save_proxies()
        
        # Return a random proxy if we have any
        if self.proxies:
            return random.choice(self.proxies)
        
        return None
    
    def get_proxy_dict(self) -> Optional[Dict[str, str]]:
        """Get a proxy in dictionary format for requests."""
        proxy = self.get_proxy()
        
        if not proxy:
            return None
            
        if proxy.startswith('http'):
            # Already formatted properly
            return {
                'http': proxy,
                'https': proxy
            }
        else:
            # Format as needed
            return {
                'http': f'http://{proxy}',
                'https': f'https://{proxy}'
            }
    
    def mark_proxy_failed(self, proxy: str) -> None:
        """Mark a proxy as failed."""
        # Remove http:// or https:// if present
        clean_proxy = proxy.replace('http://', '').replace('https://', '')
        
        # Increment fail count
        self.failed_proxies[clean_proxy] = self.failed_proxies.get(clean_proxy, 0) + 1
        
        # Remove if too many failures
        if self.failed_proxies[clean_proxy] >= self.max_fail_count:
            logger.info(f"Removing failed proxy: {proxy}")
            
            if proxy in self.proxies:
                self.proxies.remove(proxy)
                
            # Also check without protocol
            if clean_proxy in self.proxies:
                self.proxies.remove(clean_proxy)
                
            # Remove from failed dict to clean up
            del self.failed_proxies[clean_proxy]
            
            # Save updated proxy list
            self._save_proxies()
    
    def mark_proxy_success(self, proxy: str) -> None:
        """Mark a proxy as successful (reset fail count)."""
        # Remove http:// or https:// if present
        clean_proxy = proxy.replace('http://', '').replace('https://', '')
        
        # Reset fail count if it was tracked
        if clean_proxy in self.failed_proxies:
            del self.failed_proxies[clean_proxy]
            
            # Save updated proxy list if we made changes
            self._save_proxies()

# Create a singleton proxy manager instance
proxy_manager = ProxyManager()