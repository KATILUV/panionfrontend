"""
Performance Optimization Helpers
Provides utilities for optimizing system performance.
"""

import logging
import functools
import asyncio
from typing import Any, Callable, Dict, Optional, TypeVar, cast
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
import threading
from contextlib import contextmanager

# Type variables for generic functions
T = TypeVar('T')
R = TypeVar('R')

# Global thread pool for async operations
_thread_pool = ThreadPoolExecutor(max_workers=4)

# Connection pool for database access
_connection_pool: Dict[str, Any] = {}
_connection_lock = threading.Lock()

# Circuit breaker state
_circuit_breakers: Dict[str, Dict[str, Any]] = {}
_circuit_breaker_lock = threading.Lock()

# Cache for expensive operations
_result_cache: Dict[str, Dict[str, Any]] = {}
_cache_lock = threading.Lock()

def with_connection_pool(pool_name: str):
    """
    Decorator for managing database connection pooling.
    
    Args:
        pool_name: Name of the connection pool to use
    """
    def decorator(func: Callable[..., R]) -> Callable[..., R]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> R:
            with _connection_lock:
                if pool_name not in _connection_pool:
                    _connection_pool[pool_name] = {
                        'connections': [],
                        'max_size': 10,
                        'timeout': 30
                    }
                
                pool = _connection_pool[pool_name]
                
                # Get or create connection
                if pool['connections']:
                    conn = pool['connections'].pop()
                else:
                    conn = await _create_connection(pool_name)
                
                try:
                    # Add connection to function args
                    if 'conn' not in kwargs:
                        kwargs['conn'] = conn
                    return await func(*args, **kwargs)
                finally:
                    # Return connection to pool
                    if len(pool['connections']) < pool['max_size']:
                        pool['connections'].append(conn)
                    else:
                        await _close_connection(conn)
        
        return cast(Callable[..., R], wrapper)
    return decorator

def cache_result(ttl_seconds: int = 300, max_size: int = 1000):
    """
    Decorator for caching expensive function results.
    
    Args:
        ttl_seconds: Time-to-live for cache entries in seconds
        max_size: Maximum number of cache entries
    """
    def decorator(func: Callable[..., R]) -> Callable[..., R]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> R:
            # Generate cache key
            key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            with _cache_lock:
                # Check cache
                if key in _result_cache:
                    entry = _result_cache[key]
                    if datetime.now() - entry['timestamp'] < timedelta(seconds=ttl_seconds):
                        return entry['result']
                    del _result_cache[key]
                
                # Execute function
                result = await func(*args, **kwargs)
                
                # Cache result
                if len(_result_cache) >= max_size:
                    # Remove oldest entry
                    oldest_key = min(
                        _result_cache.keys(),
                        key=lambda k: _result_cache[k]['timestamp']
                    )
                    del _result_cache[oldest_key]
                
                _result_cache[key] = {
                    'result': result,
                    'timestamp': datetime.now()
                }
                
                return result
        
        return cast(Callable[..., R], wrapper)
    return decorator

def asyncify(func: Callable[..., R]) -> Callable[..., R]:
    """
    Decorator for running synchronous functions in a thread pool.
    
    Args:
        func: Synchronous function to run asynchronously
    """
    @functools.wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> R:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            lambda: func(*args, **kwargs)
        )
    return cast(Callable[..., R], wrapper)

def with_circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    reset_timeout: int = 60,
    fallback: Optional[Callable[..., R]] = None
):
    """
    Decorator for implementing circuit breaker pattern.
    
    Args:
        name: Name of the circuit breaker
        failure_threshold: Number of failures before opening circuit
        reset_timeout: Seconds to wait before attempting reset
        fallback: Fallback function to call when circuit is open
    """
    def decorator(func: Callable[..., R]) -> Callable[..., R]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> R:
            with _circuit_breaker_lock:
                if name not in _circuit_breakers:
                    _circuit_breakers[name] = {
                        'failures': 0,
                        'last_failure': None,
                        'state': 'closed'
                    }
                
                breaker = _circuit_breakers[name]
                
                # Check circuit state
                if breaker['state'] == 'open':
                    if (datetime.now() - breaker['last_failure']).total_seconds() >= reset_timeout:
                        breaker['state'] = 'half-open'
                    elif fallback:
                        return await fallback(*args, **kwargs)
                    else:
                        raise Exception(f"Circuit breaker '{name}' is open")
                
                try:
                    result = await func(*args, **kwargs)
                    
                    # Reset on success
                    if breaker['state'] == 'half-open':
                        breaker['state'] = 'closed'
                        breaker['failures'] = 0
                    
                    return result
                    
                except Exception as e:
                    breaker['failures'] += 1
                    breaker['last_failure'] = datetime.now()
                    
                    if breaker['failures'] >= failure_threshold:
                        breaker['state'] = 'open'
                    
                    if fallback:
                        return await fallback(*args, **kwargs)
                    raise
        
        return cast(Callable[..., R], wrapper)
    return decorator

async def _create_connection(pool_name: str) -> Any:
    """Create a new database connection."""
    # Implementation depends on database type
    pass

async def _close_connection(conn: Any) -> None:
    """Close a database connection."""
    # Implementation depends on database type
    pass 