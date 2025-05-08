"""
Core Utilities
Common utility functions and decorators.
"""

import logging
import functools
import asyncio
from typing import Any, Callable, Dict, Optional, TypeVar, List
from datetime import datetime, timedelta
import json
from pathlib import Path

logger = logging.getLogger(__name__)

T = TypeVar('T')

def with_connection_pool(pool_name: str):
    """Decorator for managing database connection pool access.
    
    Args:
        pool_name: Name of the connection pool
        
    Returns:
        Callable: The wrapped function
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            from core.db.connection_manager import connection_manager
            
            try:
                # Get connection from pool
                async with connection_manager.get_pool(pool_name).acquire() as conn:
                    # Add connection to kwargs
                    kwargs['connection'] = conn
                    return await func(*args, **kwargs)
                    
            except Exception as e:
                logger.error(f"Error in database operation: {str(e)}")
                raise
                
        return wrapper
    return decorator

def cache_result(ttl_seconds: int = 300):
    """Decorator for caching function results.
    
    Args:
        ttl_seconds: Time to live in seconds for cached results
        
    Returns:
        Callable: The wrapped function
    """
    cache: Dict[str, Dict[str, Any]] = {}
    
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Create cache key from function name and arguments
            key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Check if result is cached and not expired
            if key in cache:
                entry = cache[key]
                if datetime.now() < entry['expires']:
                    return entry['result']
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            cache[key] = {
                'result': result,
                'expires': datetime.now() + timedelta(seconds=ttl_seconds)
            }
            
            # Cleanup expired entries
            for k in list(cache.keys()):
                if datetime.now() >= cache[k]['expires']:
                    del cache[k]
            
            return result
            
        return wrapper
    return decorator

def with_retry(max_retries: int = 3, delay: float = 1.0):
    """Decorator for retrying failed operations.
    
    Args:
        max_retries: Maximum number of retry attempts
        delay: Delay between retries in seconds
        
    Returns:
        Callable: The wrapped function
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_retries - 1:
                        logger.warning(
                            f"Attempt {attempt + 1} failed, retrying in {delay} seconds: {str(e)}"
                        )
                        await asyncio.sleep(delay)
            
            logger.error(f"All {max_retries} attempts failed: {str(last_error)}")
            raise last_error
            
        return wrapper
    return decorator

def with_logging(logger_name: Optional[str] = None):
    """Decorator for adding logging to functions.
    
    Args:
        logger_name: Optional logger name
        
    Returns:
        Callable: The wrapped function
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            log = logger.getChild(logger_name or func.__name__)
            
            try:
                log.debug(f"Calling {func.__name__} with args={args}, kwargs={kwargs}")
                result = await func(*args, **kwargs)
                log.debug(f"{func.__name__} completed successfully")
                return result
                
            except Exception as e:
                log.error(f"Error in {func.__name__}: {str(e)}")
                raise
                
        return wrapper
    return decorator

def load_json_file(file_path: Path) -> Dict[str, Any]:
    """Load and parse a JSON file.
    
    Args:
        file_path: Path to JSON file
        
    Returns:
        Dict[str, Any]: Parsed JSON data
    """
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading JSON file {file_path}: {str(e)}")
        raise

def save_json_file(data: Dict[str, Any], file_path: Path) -> None:
    """Save data to a JSON file.
    
    Args:
        data: Data to save
        file_path: Path to save file to
    """
    try:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving JSON file {file_path}: {str(e)}")
        raise

def chunk_list(lst: List[T], chunk_size: int) -> List[List[T]]:
    """Split a list into chunks.
    
    Args:
        lst: List to split
        chunk_size: Size of each chunk
        
    Returns:
        List[List[T]]: List of chunks
    """
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)] 