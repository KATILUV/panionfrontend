import logging
import logging.config
import sys
from pathlib import Path
from typing import Optional, Dict, Any
import yaml

def setup_logging(
    config_path: Optional[str] = None,
    log_dir: str = "logs",
    default_level: int = logging.INFO
) -> None:
    """
    Setup logging configuration for the application.
    
    Args:
        config_path: Path to YAML logging configuration file
        log_dir: Directory to store log files
        default_level: Default logging level if no config file is provided
    """
    # Create log directory if it doesn't exist
    log_path = Path(log_dir)
    log_path.mkdir(exist_ok=True)
    
    if config_path and Path(config_path).exists():
        # Load logging config from .YAML file
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
            logging.config.dictConfig(config)
    else:
        # Default configuration
        config = {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'standard': {
                    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                }
            },
            'handlers': {
                'console': {
                    'class': 'logging.StreamHandler',
                    'level': default_level,
                    'formatter': 'standard',
                    'stream': 'ext://sys.stdout'
                },
                'file': {
                    'class': 'logging.FileHandler',
                    'level': default_level,
                    'formatter': 'standard',
                    'filename': str(log_path / 'panion.log'),
                    'mode': 'a'
                }
            },
            'loggers': {
                '': {  # root logger
                    'handlers': ['console', 'file'],
                    'level': default_level,
                    'propagate': True
                }
            }
        }
        logging.config.dictConfig(config)

def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name.
    
    Args:
        name: Name of the logger (usually __name__)
        
    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)

def update_logging_config(config: Dict[str, Any]) -> None:
    """
    Update the logging configuration at runtime.
    
    Args:
        config: Dictionary containing logging configuration
    """
    logging.config.dictConfig(config) 