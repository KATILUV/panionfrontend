"""
Test Enhanced Scraper Module
Tests the enhanced scraper with adaptive strategy selection.
"""

import os
import logging
import json
import time
from scrapers.enhanced_scraper import EnhancedScraper

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_scraper_with_fallback():
    """Test the enhanced scraper's ability to fallback between strategies."""
    scraper = EnhancedScraper()
    
    # First, let's test with a preferred source that might fail
    logger.info("Testing with a potentially blocked source first...")
    results = scraper.scrape_business_directory(
        business_type="smoke shop",
        location="New York",
        limit=5,
        source="yelp"  # Start with Yelp as preferred source
    )
    
    # Display results
    if results:
        logger.info(f"Successfully scraped {len(results)} results")
        logger.info(f"Last successful strategy: {scraper.last_successful_strategy}")
        
        # Save results to verify
        with open("./data/scraped/test_results.json", "w") as f:
            json.dump(results, f, indent=2)
            
        # Show first result
        if results:
            logger.info(f"Sample result: {results[0]['name']} at {results[0]['address']}")
    else:
        logger.error("No results found with any strategy")
    
    # Now test the blocked strategy handling by forcing a failure
    if scraper.last_successful_strategy:
        logger.info(f"Testing strategy blocking by temporarily disabling {scraper.last_successful_strategy}")
        
        # Block the successful strategy
        scraper.blocked_strategies.add(scraper.last_successful_strategy)
        scraper.block_expiry[scraper.last_successful_strategy] = time.time() + 60  # 1 minute block
        
        # Try again - should use a different strategy
        logger.info("Trying again with primary strategy blocked...")
        results2 = scraper.scrape_business_directory(
            business_type="smoke shop",
            location="New York",
            limit=5
        )
        
        if results2:
            logger.info(f"Successfully found alternative strategy: {scraper.last_successful_strategy}")
            logger.info(f"Got {len(results2)} results from alternative strategy")
        else:
            logger.error("Failed to find workable alternative strategy")
    
    # Test with another location to demonstrate caching
    logger.info("Testing with a new location...")
    results3 = scraper.scrape_business_directory(
        business_type="smoke shop",
        location="Los Angeles",
        limit=5
    )
    
    if results3:
        logger.info(f"Successfully scraped {len(results3)} results for Los Angeles")
        
        # Now run same query again to test caching
        logger.info("Testing cache by running same query again...")
        start_time = time.time()
        results4 = scraper.scrape_business_directory(
            business_type="smoke shop",
            location="Los Angeles",
            limit=5
        )
        end_time = time.time()
        
        if results4:
            logger.info(f"Cache retrieval took {end_time - start_time:.2f} seconds")
            logger.info(f"Cache strategy used: {scraper.last_successful_strategy}")
            
    logger.info("Enhanced scraper test complete")

if __name__ == "__main__":
    logger.info("Starting test of Enhanced Scraper with adaptive strategy selection")
    test_scraper_with_fallback()