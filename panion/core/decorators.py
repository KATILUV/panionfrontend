"""
Decorators for error handling and other cross-cutting concerns.
"""

import logging
import functools
from typing import Any, Callable, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

def with_error_recovery(func: Callable) -> Callable:
    """Decorator for handling errors and recovery in plugin operations.
    
    Args:
        func: The function to wrap with error recovery
        
    Returns:
        Callable: The wrapped function
    """
    @functools.wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        try:
            # Get the plugin instance (self) from args
            plugin_instance = args[0] if args else None
            if not plugin_instance:
                raise ValueError("Plugin instance not found")
            
            # Execute the function
            result = await func(*args, **kwargs)
            
            # Update plugin state on success
            plugin_instance._state["error_count"] = 0
            plugin_instance._state["retry_count"] = 0
            plugin_instance._state["last_success"] = datetime.now()
            
            return result
            
        except Exception as e:
            # Log the error
            logger.error(f"Error in {func.__name__}: {str(e)}")
            
            # Update plugin state
            if plugin_instance:
                plugin_instance._state["error_count"] += 1
                plugin_instance._state["last_error"] = str(e)
                plugin_instance._state["last_error_time"] = datetime.now()
                
                # Handle retries if needed
                if plugin_instance._state["retry_count"] < 3:
                    plugin_instance._state["retry_count"] += 1
                    logger.info(f"Retrying {func.__name__} (attempt {plugin_instance._state['retry_count']})")
                    return await wrapper(*args, **kwargs)
                
                # Update plugin status if max retries reached
                plugin_instance._state["status"] = "error"
            
            raise
            
    return wrapper 