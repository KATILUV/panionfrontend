"""
Configuration
Configuration settings for the Panion system.
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
from pathlib import Path
import json

@dataclass
class PluginConfig:
    """Plugin configuration settings."""
    max_retries: int = 3
    retry_delay: float = 1.0
    plugin_dir: str = "plugins"
    plugin_cache_dir: str = "cache/plugins"
    plugin_data_dir: str = "data/plugins"
    plugin_log_dir: str = "logs/plugins"
    plugin_config_dir: str = "config/plugins"
    plugin_test_dir: str = "tests/plugins"
    plugin_docs_dir: str = "docs/plugins"
    plugin_temp_dir: str = "temp/plugins"
    plugin_backup_dir: str = "backup/plugins"
    plugin_archive_dir: str = "archive/plugins"
    plugin_metrics_dir: str = "metrics/plugins"
    plugin_state_dir: str = "state/plugins"

@dataclass
class SystemConfig:
    """System configuration settings."""
    debug: bool = False
    log_level: str = "INFO"
    log_file: str = "logs/panion.log"
    data_dir: str = "data"
    cache_dir: str = "cache"
    temp_dir: str = "temp"
    backup_dir: str = "backup"
    archive_dir: str = "archive"
    metrics_dir: str = "metrics"
    state_dir: str = "state"
    config_dir: str = "config"
    docs_dir: str = "docs"
    test_dir: str = "tests"
    max_workers: int = 4
    worker_timeout: float = 60.0
    shutdown_timeout: float = 30.0
    health_check_interval: float = 60.0
    metrics_interval: float = 60.0
    backup_interval: float = 3600.0
    cleanup_interval: float = 3600.0
    max_memory_usage: float = 0.8
    max_cpu_usage: float = 0.8
    max_disk_usage: float = 0.8

def load_config(config_file: str = "config/config.json") -> Dict[str, Any]:
    """Load configuration from file.
    
    Args:
        config_file: Path to configuration file
        
    Returns:
        dict: Configuration data
    """
    try:
        config_path = Path(config_file)
        if not config_path.exists():
            return {}
            
        with open(config_path) as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading configuration: {e}")
        return {}

# Create configuration instances
plugin_config = PluginConfig()
system_config = SystemConfig()

# Load configuration
config_data = load_config()

# Update configuration from file
if config_data:
    if "plugins" in config_data:
        for key, value in config_data["plugins"].items():
            if hasattr(plugin_config, key):
                setattr(plugin_config, key, value)
                
    if "system" in config_data:
        for key, value in config_data["system"].items():
            if hasattr(system_config, key):
                setattr(system_config, key, value)

# Make sure these are available for import
__all__ = ['plugin_config', 'system_config', 'PluginConfig', 'SystemConfig', 'load_config'] 