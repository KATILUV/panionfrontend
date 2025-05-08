"""
Common code shared between plugin cache and cleanup modules.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

@dataclass
class PluginMetadata:
    """Metadata for a cached plugin."""
    name: str
    version: str
    created_at: datetime
    last_used: datetime
    success_rate: float
    test_results: Dict
    dependencies: List[str]
    description: str
    author: str = "auto"
    tags: List[str] = None

@dataclass
class CleanupStats:
    """Statistics about the cleanup operation."""
    total_plugins: int
    removed_plugins: int
    freed_space: int  # in bytes
    oldest_kept: datetime
    newest_removed: datetime 