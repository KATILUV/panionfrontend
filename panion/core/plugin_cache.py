"""
Plugin Cache Manager
Handles versioning, storage, and evolution of synthesized plugins.
"""

import logging
import json
import shutil
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
import hashlib
import yaml

from core.plugin.types import PluginMetadata
from core.plugin_common import CleanupStats

logger = logging.getLogger(__name__)

class PluginCache:
    def __init__(self, 
                 cache_dir: str = "plugins/auto",
                 max_versions: int = 3,
                 max_age_days: int = 30,
                 min_success_rate: float = 0.7):
        """Initialize the plugin cache.
        
        Args:
            cache_dir: Directory to store cached plugins
            max_versions: Maximum number of versions to keep per plugin
            max_age_days: Maximum age in days before considering a version for cleanup
            min_success_rate: Minimum success rate to keep a version
        """
        self.cache_dir = Path(cache_dir)
        self.max_versions = max_versions
        self.max_age_days = max_age_days
        self.min_success_rate = min_success_rate
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_file = self.cache_dir / "metadata.json"
        self._load_metadata()
        
    def _load_metadata(self):
        """Load plugin metadata from disk."""
        if self.metadata_file.exists():
            with open(self.metadata_file) as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {}
            
    def _save_metadata(self):
        """Save plugin metadata to disk."""
        with open(self.metadata_file, "w") as f:
            json.dump(self.metadata, f, indent=2)
            
    def _get_next_version(self, plugin_name: str) -> str:
        """Get the next version number for a plugin."""
        versions = [v for v in self.metadata.keys() if v.startswith(f"{plugin_name}_v")]
        if not versions:
            return f"{plugin_name}_v1"
        latest = max(int(v.split("_v")[1]) for v in versions)
        return f"{plugin_name}_v{latest + 1}"
        
    def cache_plugin(self,
                    plugin_name: str,
                    plugin_dir: Path,
                    test_results: Dict,
                    dependencies: List[str],
                    description: str) -> str:
        """
        Cache a synthesized plugin.
        
        Args:
            plugin_name: Base name of the plugin
            plugin_dir: Directory containing the plugin files
            test_results: Results from plugin testing
            dependencies: List of plugin dependencies
            description: Plugin description
            
        Returns:
            str: Versioned plugin name
        """
        try:
            # Generate version
            versioned_name = self._get_next_version(plugin_name)
            
            # Create plugin directory
            target_dir = self.cache_dir / versioned_name
            target_dir.mkdir(exist_ok=True)
            
            # Copy plugin files
            shutil.copytree(plugin_dir, target_dir)
            
            # Calculate success rate
            total_tests = test_results["total_tests"]
            passed_tests = test_results["passed"]
            success_rate = passed_tests / total_tests if total_tests > 0 else 0
            
            # Create metadata
            metadata = PluginMetadata(
                name=plugin_name,
                version=versioned_name,
                created_at=datetime.now(),
                last_used=datetime.now(),
                success_rate=success_rate,
                test_results=test_results,
                dependencies=dependencies,
                description=description
            )
            
            # Save metadata
            self.metadata[versioned_name] = {
                "name": metadata.name,
                "version": metadata.version,
                "created_at": metadata.created_at.isoformat(),
                "last_used": metadata.last_used.isoformat(),
                "success_rate": metadata.success_rate,
                "test_results": metadata.test_results,
                "dependencies": metadata.dependencies,
                "description": metadata.description,
                "author": metadata.author,
                "tags": metadata.tags or []
            }
            self._save_metadata()
            
            # Run cleanup to remove old versions
            cleanup_stats = self.cleanup_plugin(plugin_name)
            logger.info(f"Cleaned up {cleanup_stats.removed_plugins} old versions of {plugin_name}")
            
            logger.info(f"Cached plugin {versioned_name} with success rate {success_rate:.2%}")
            return versioned_name
            
        except Exception as e:
            logger.error(f"Error caching plugin: {e}")
            raise
            
    def get_plugin(self, plugin_name: str) -> Optional[Path]:
        """
        Get the best matching plugin from cache.
        
        Args:
            plugin_name: Base name of the plugin
            
        Returns:
            Optional[Path]: Path to cached plugin directory if found
        """
        try:
            # Find matching plugins
            versions = []
            for version, metadata in self.metadata.items():
                if version.startswith(f"{plugin_name}_v"):
                    versions.append((version, metadata))
            
            if not versions:
                return None
                
            # Sort by success rate and last used
            versions.sort(key=lambda x: (
                x[1]["success_rate"],
                x[1]["last_used"]
            ), reverse=True)
            
            # Get best match
            best_version = versions[0][0]
            
            # Update last used
            self.metadata[best_version]["last_used"] = datetime.now().isoformat()
            self._save_metadata()
            
            return self.cache_dir / best_version
            
        except Exception as e:
            logger.error(f"Error retrieving plugin: {e}")
            return None
            
    def get_plugin_metadata(self, versioned_name: str) -> Optional[PluginMetadata]:
        """Get metadata for a specific plugin version."""
        try:
            if versioned_name in self.metadata:
                return PluginMetadata(**self.metadata[versioned_name])
            return None
        except Exception as e:
            logger.error(f"Error retrieving plugin metadata: {e}")
            return None
            
    def list_plugins(self) -> List[Dict]:
        """List all cached plugins."""
        try:
            return [
                {
                    "name": metadata["name"],
                    "version": metadata["version"],
                    "created_at": metadata["created_at"],
                    "last_used": metadata["last_used"],
                    "success_rate": metadata["success_rate"],
                    "dependencies": metadata["dependencies"],
                    "description": metadata["description"]
                }
                for metadata in self.metadata.values()
            ]
        except Exception as e:
            logger.error(f"Error listing plugins: {e}")
            return []
            
    def update_plugin(self,
                     versioned_name: str,
                     test_results: Dict) -> bool:
        """
        Update plugin metadata with new test results.
        
        Args:
            versioned_name: Versioned plugin name
            test_results: New test results
            
        Returns:
            bool: True if update successful
        """
        try:
            if versioned_name not in self.metadata:
                return False
                
            # Update metadata
            meta = self.metadata[versioned_name]
            meta["last_used"] = datetime.now().isoformat()
            meta["test_results"] = test_results
            
            # Update success rate
            total_tests = test_results["total_tests"]
            passed_tests = test_results["passed"]
            meta["success_rate"] = passed_tests / total_tests if total_tests > 0 else 0
            
            self._save_metadata()
            return True
            
        except Exception as e:
            logger.error(f"Error updating plugin: {e}")
            return False
            
    def delete_plugin(self, versioned_name: str) -> bool:
        """
        Delete a cached plugin.
        
        Args:
            versioned_name: Versioned plugin name
            
        Returns:
            bool: True if deletion successful
        """
        try:
            if versioned_name not in self.metadata:
                return False
                
            # Delete plugin directory
            plugin_dir = self.cache_dir / versioned_name
            if plugin_dir.exists():
                shutil.rmtree(plugin_dir)
                
            # Remove metadata
            del self.metadata[versioned_name]
            self._save_metadata()
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting plugin: {e}")
            return False

    def _should_cleanup_version(self, version: Dict) -> bool:
        """Determine if a version should be cleaned up."""
        now = datetime.now()
        created_at = datetime.fromisoformat(version["created_at"])
        last_used = datetime.fromisoformat(version["last_used"])
        age = now - created_at
        time_since_use = now - last_used
        
        return (
            age.days > self.max_age_days or
            version["success_rate"] < self.min_success_rate or
            time_since_use.days > self.max_age_days
        )

    def cleanup_plugin(self, plugin_name: str) -> CleanupStats:
        """Clean up old versions of a plugin."""
        versions = []
        for version, metadata in self.metadata.items():
            if version.startswith(f"{plugin_name}_v"):
                versions.append((version, metadata))
                
        if not versions:
            return CleanupStats(0, 0, 0, datetime.now(), datetime.now())
            
        # Sort by creation date
        versions.sort(key=lambda x: datetime.fromisoformat(x[1]["created_at"]), reverse=True)
        
        # Keep recent versions that meet criteria
        to_keep = []
        to_remove = []
        
        for version, metadata in versions:
            if len(to_keep) < self.max_versions and not self._should_cleanup_version(metadata):
                to_keep.append((version, metadata))
            else:
                to_remove.append((version, metadata))
                
        # Remove old versions
        freed_space = 0
        for version, _ in to_remove:
            version_dir = self.cache_dir / version
            try:
                freed_space += sum(f.stat().st_size for f in version_dir.rglob("*") if f.is_file())
                shutil.rmtree(version_dir)
                del self.metadata[version]
                logger.info(f"Removed old version {version} of {plugin_name}")
            except Exception as e:
                logger.error(f"Failed to remove {version}: {e}")
                
        self._save_metadata()
        
        return CleanupStats(
            total_plugins=len(versions),
            removed_plugins=len(to_remove),
            freed_space=freed_space,
            oldest_kept=datetime.fromisoformat(to_keep[-1][1]["created_at"]) if to_keep else datetime.now(),
            newest_removed=datetime.fromisoformat(to_remove[0][1]["created_at"]) if to_remove else datetime.now()
        )

    def cleanup_all_plugins(self) -> Dict[str, CleanupStats]:
        """Clean up all plugins in the cache."""
        stats = {}
        plugins = set()
        for version in self.metadata:
            plugin_name = "_".join(version.split("_")[:-1])  # Remove version
            plugins.add(plugin_name)
            
        for plugin_name in plugins:
            stats[plugin_name] = self.cleanup_plugin(plugin_name)
        return stats

# Create singleton instance
plugin_cache = PluginCache() 