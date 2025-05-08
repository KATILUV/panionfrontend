"""
Plugin Index Management
Manages plugin capabilities and trust scores for efficient goal processing.
"""

import logging
from typing import Dict, Set, List, Optional
from datetime import datetime, timedelta
import json
from pathlib import Path
from dataclasses import dataclass, field
import threading

@dataclass
class PluginCapability:
    """Plugin capability information."""
    name: str
    tags: Set[str] = field(default_factory=set)
    trust_score: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)

class PluginIndex:
    """Manages plugin capabilities and trust scores."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.index_file = Path("data/plugin_index.json")
        self.index_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Core data structures
        self._capabilities: Dict[str, PluginCapability] = {}
        self._tag_index: Dict[str, Set[str]] = {}  # tag -> set of plugin names
        self._trust_scores: Dict[str, float] = {}
        
        # Cache settings
        self._cache_duration = timedelta(minutes=5)
        self._last_update = datetime.now()
        self._lock = threading.Lock()
        
        # Load existing index
        self._load_index()
    
    def _load_index(self) -> None:
        """Load the plugin index from disk."""
        try:
            if self.index_file.exists():
                with open(self.index_file, 'r') as f:
                    data = json.load(f)
                
                # Load capabilities
                self._capabilities = {
                    name: PluginCapability(
                        name=name,
                        tags=set(cap["tags"]),
                        trust_score=cap["trust_score"],
                        last_updated=datetime.fromisoformat(cap["last_updated"])
                    )
                    for name, cap in data.get("capabilities", {}).items()
                }
                
                # Load tag index
                self._tag_index = {
                    tag: set(plugins)
                    for tag, plugins in data.get("tag_index", {}).items()
                }
                
                # Load trust scores
                self._trust_scores = data.get("trust_scores", {})
                
                self.logger.info("Plugin index loaded successfully")
        except Exception as e:
            self.logger.error(f"Error loading plugin index: {e}")
            self._capabilities = {}
            self._tag_index = {}
            self._trust_scores = {}
    
    def _save_index(self) -> None:
        """Save the plugin index to disk."""
        try:
            data = {
                "capabilities": {
                    name: {
                        "tags": list(cap.tags),
                        "trust_score": cap.trust_score,
                        "last_updated": cap.last_updated.isoformat()
                    }
                    for name, cap in self._capabilities.items()
                },
                "tag_index": {
                    tag: list(plugins)
                    for tag, plugins in self._tag_index.items()
                },
                "trust_scores": self._trust_scores
            }
            
            with open(self.index_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            self.logger.info("Plugin index saved successfully")
        except Exception as e:
            self.logger.error(f"Error saving plugin index: {e}")
    
    def update_plugin(self, name: str, tags: Set[str], trust_score: float) -> None:
        """Update plugin information in the index."""
        with self._lock:
            # Update capabilities
            if name in self._capabilities:
                old_tags = self._capabilities[name].tags
                # Remove old tag associations
                for tag in old_tags:
                    if tag in self._tag_index:
                        self._tag_index[tag].discard(name)
                        if not self._tag_index[tag]:
                            del self._tag_index[tag]
            
            # Add new capability
            self._capabilities[name] = PluginCapability(
                name=name,
                tags=tags,
                trust_score=trust_score,
                last_updated=datetime.now()
            )
            
            # Update tag index
            for tag in tags:
                if tag not in self._tag_index:
                    self._tag_index[tag] = set()
                self._tag_index[tag].add(name)
            
            # Update trust score
            self._trust_scores[name] = trust_score
            
            # Save changes
            self._save_index()
    
    def get_plugins_by_tags(self, tags: Set[str]) -> Set[str]:
        """Get plugins that match all given tags."""
        if not tags:
            return set()
        
        with self._lock:
            # Start with plugins matching the first tag
            matching_plugins = self._tag_index.get(next(iter(tags)), set())
            
            # Intersect with plugins matching other tags
            for tag in tags:
                if tag in self._tag_index:
                    matching_plugins &= self._tag_index[tag]
            
            return matching_plugins
    
    def get_plugin_trust_score(self, name: str) -> float:
        """Get the trust score for a plugin."""
        with self._lock:
            return self._trust_scores.get(name, 0.0)
    
    def get_plugin_capability(self, name: str) -> Optional[PluginCapability]:
        """Get capability information for a plugin."""
        with self._lock:
            return self._capabilities.get(name)
    
    def get_all_tags(self) -> Set[str]:
        """Get all available tags."""
        with self._lock:
            return set(self._tag_index.keys())
    
    def get_plugins_by_trust(self, min_trust: float = 0.0) -> List[str]:
        """Get plugins with trust score above minimum."""
        with self._lock:
            return [
                name for name, score in self._trust_scores.items()
                if score >= min_trust
            ]

# Create singleton instance
plugin_index = PluginIndex() 