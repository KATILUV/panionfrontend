"""
Core Decorators
Common decorators for core functionality.
"""

import functools
import asyncio
from typing import Any, Callable, TypeVar, Dict, Optional
from contextlib import asynccontextmanager
import logging
from datetime import datetime, timedelta
import weakref

T = TypeVar('T')

class ConnectionPool:
    """Manages a pool of connections with automatic cleanup."""
    
    def __init__(self, max_size: int = 10, timeout: int = 30):
        self.max_size = max_size
        self.timeout = timeout
        self.pool: Dict[str, Any] = {}
        self.in_use: Dict[str, datetime] = {}
        self.lock = asyncio.Lock()
        self.logger = logging.getLogger(__name__)
        
    async def acquire(self, key: str) -> Any:
        """Acquire a connection from the pool."""
        async with self.lock:
            # Check for existing connection
            if key in self.pool:
                conn = self.pool[key]
                if not self._is_connection_valid(conn):
                    await self._close_connection(conn)
                    del self.pool[key]
                else:
                    self.in_use[key] = datetime.now()
                    return conn
                    
            # Create new connection if pool not full
            if len(self.pool) < self.max_size:
                conn = await self._create_connection(key)
                self.pool[key] = conn
                self.in_use[key] = datetime.now()
                return conn
                
            # Wait for connection to become available
            while True:
                # Clean up expired connections
                await self._cleanup_expired()
                
                if len(self.pool) < self.max_size:
                    conn = await self._create_connection(key)
                    self.pool[key] = conn
                    self.in_use[key] = datetime.now()
                    return conn
                    
                await asyncio.sleep(0.1)
                
    async def release(self, key: str) -> None:
        """Release a connection back to the pool."""
        async with self.lock:
            if key in self.in_use:
                del self.in_use[key]
                
    async def _create_connection(self, key: str) -> Any:
        """Create a new connection."""
        try:
            # This is a placeholder - in practice, you would:
            # 1. Parse connection string from key
            # 2. Create appropriate connection (DB, HTTP, etc.)
            # 3. Configure connection settings
            # 4. Return connection object
            return {"id": key, "created_at": datetime.now()}
        except Exception as e:
            self.logger.error(f"Error creating connection: {e}")
            raise
            
    async def _close_connection(self, conn: Any) -> None:
        """Close a connection."""
        try:
            # This is a placeholder - in practice, you would:
            # 1. Close the connection properly
            # 2. Clean up any resources
            # 3. Log the closure
            pass
        except Exception as e:
            self.logger.error(f"Error closing connection: {e}")
            
    def _is_connection_valid(self, conn: Any) -> bool:
        """Check if a connection is still valid."""
        try:
            # This is a placeholder - in practice, you would:
            # 1. Check connection state
            # 2. Verify connection is responsive
            # 3. Return True if valid, False otherwise
            return True
        except Exception:
            return False
            
    async def _cleanup_expired(self) -> None:
        """Clean up expired connections."""
        now = datetime.now()
        expired = [
            key for key, timestamp in self.in_use.items()
            if now - timestamp > timedelta(seconds=self.timeout)
        ]
        
        for key in expired:
            if key in self.pool:
                await self._close_connection(self.pool[key])
                del self.pool[key]
            if key in self.in_use:
                del self.in_use[key]

# Global connection pools
_connection_pools: Dict[str, ConnectionPool] = weakref.WeakValueDictionary()

def get_connection_pool(pool_name: str, max_size: int = 10, timeout: int = 30) -> ConnectionPool:
    """Get or create a connection pool."""
    if pool_name not in _connection_pools:
        _connection_pools[pool_name] = ConnectionPool(max_size, timeout)
    return _connection_pools[pool_name]

def with_connection_pool(
    pool_name: str = "default",
    max_size: int = 10,
    timeout: int = 30
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Decorator to ensure a function is executed with a connection pool.
    
    Args:
        pool_name: Name of the connection pool to use
        max_size: Maximum number of connections in the pool
        timeout: Connection timeout in seconds
        
    Returns:
        Decorated function that uses the connection pool
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            # Get connection pool
            pool = get_connection_pool(pool_name, max_size, timeout)
            
            # Generate connection key from function and args
            key = f"{func.__name__}:{str(args)}:{str(sorted(kwargs.items()))}"
            
            try:
                # Acquire connection
                conn = await pool.acquire(key)
                
                # Add connection to kwargs
                kwargs['connection'] = conn
                
                # Execute function
                return await func(*args, **kwargs)
                
            finally:
                # Release connection
                await pool.release(key)
                
        return wrapper
    return decorator

def cache_result(func: Callable[..., T]) -> Callable[..., T]:
    """Decorator to cache function results."""
    cache = {}
    
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> T:
        key = str(args) + str(sorted(kwargs.items()))
        if key not in cache:
            cache[key] = func(*args, **kwargs)
        return cache[key]
    return wrapper 