"""
Centralized logging configuration for Panion.
"""

import logging
import json
from datetime import datetime
from typing import Any, Dict
import sys
from pathlib import Path

class StructuredLogFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as structured JSON."""
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'component': record.name,
            'message': record.getMessage(),
            'operation': getattr(record, 'operation', 'unknown'),
            'status': getattr(record, 'status', 'unknown'),
            'duration_ms': getattr(record, 'duration_ms', None),
            'plugin_id': getattr(record, 'plugin_id', None),
            'goal_id': getattr(record, 'goal_id', None),
            'subgoal_id': getattr(record, 'subgoal_id', None),
            'memory_id': getattr(record, 'memory_id', None),
            'test_id': getattr(record, 'test_id', None),
            'error': getattr(record, 'error', None)
        }
        
        # Add extra fields if present
        if hasattr(record, 'extra'):
            log_data.update(record.extra)
            
        return json.dumps(log_data)

def setup_logging(log_level: str = 'INFO', log_file: str = None) -> None:
    """Setup logging configuration.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional path to log file
    """
    # Create logs directory if it doesn't exist
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Clear existing handlers
    root_logger.handlers = []
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(StructuredLogFormatter())
    root_logger.addHandler(console_handler)
    
    # Create file handler if log_file specified
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(StructuredLogFormatter())
        root_logger.addHandler(file_handler)
    
    # Set logging levels for specific components
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('asyncio').setLevel(logging.WARNING)

def get_logger(name: str) -> logging.Logger:
    """Get a logger with the specified name.
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)

# Create a context manager for timing operations
class LogTimer:
    """Context manager for timing operations and logging duration."""
    
    def __init__(self, logger: logging.Logger, operation: str, **extra):
        self.logger = logger
        self.operation = operation
        self.extra = extra
        self.start_time = None
        
    def __enter__(self):
        self.start_time = datetime.now()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (datetime.now() - self.start_time).total_seconds() * 1000
        
        if exc_type is None:
            status = 'success'
            error = None
        else:
            status = 'failure'
            error = str(exc_val)
            
        self.logger.info(
            f"Completed {self.operation}",
            extra={
                'operation': self.operation,
                'status': status,
                'duration_ms': duration_ms,
                'error': error,
                **self.extra
            }
        ) 