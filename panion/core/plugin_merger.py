"""
Plugin merger system for combining successful features from different versions.
"""

import logging
import ast
import astor
from pathlib import Path
from typing import List, Dict, Set, Optional, Tuple
from dataclasses import dataclass
import difflib
from datetime import datetime

from core.plugin_cache import plugin_cache
from core.plugin_tester import plugin_tester

logger = logging.getLogger(__name__)

@dataclass
class Feature:
    """A feature extracted from a plugin version."""
    name: str
    code: str
    success_rate: float
    test_results: Dict
    dependencies: List[str]
    version: str

class PluginMerger:
    """Merges successful features from different plugin versions."""
    
    def __init__(self, min_success_rate: float = 0.7):
        """Initialize the merger.
        
        Args:
            min_success_rate: Minimum success rate to consider a feature
        """
        self.min_success_rate = min_success_rate
        
    def extract_features(self, versioned_name: str) -> List[Feature]:
        """Extract features from a plugin version.
        
        Args:
            versioned_name: Versioned name of the plugin
            
        Returns:
            List of extracted features
        """
        plugin_dir = plugin_cache.cache_dir / versioned_name
        if not plugin_dir.exists():
            return []
            
        # Get metadata
        metadata = plugin_cache.metadata.get(versioned_name)
        if not metadata:
            return []
            
        # Parse plugin code
        plugin_file = plugin_dir / "plugin.py"
        if not plugin_file.exists():
            return []
            
        with open(plugin_file) as f:
            code = f.read()
            
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            logger.error(f"Failed to parse {versioned_name}: {e}")
            return []
            
        features = []
        
        # Extract functions
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                feature = Feature(
                    name=node.name,
                    code=astor.to_source(node),
                    success_rate=metadata["success_rate"],
                    test_results=metadata["test_results"],
                    dependencies=metadata["dependencies"],
                    version=versioned_name
                )
                features.append(feature)
                
        return features
        
    def find_similar_features(self, features: List[Feature]) -> List[Tuple[Feature, Feature]]:
        """Find similar features across different versions.
        
        Args:
            features: List of features to compare
            
        Returns:
            List of similar feature pairs
        """
        similar_pairs = []
        
        for i, feat1 in enumerate(features):
            for feat2 in features[i+1:]:
                # Skip features from same version
                if feat1.version == feat2.version:
                    continue
                    
                # Calculate similarity
                similarity = difflib.SequenceMatcher(
                    None,
                    feat1.code,
                    feat2.code
                ).ratio()
                
                if similarity > 0.8:  # High similarity threshold
                    similar_pairs.append((feat1, feat2))
                    
        return similar_pairs
        
    def merge_features(self, features: List[Feature]) -> str:
        """Merge features into a new plugin.
        
        Args:
            features: List of features to merge
            
        Returns:
            Merged plugin code
        """
        # Sort features by success rate
        features.sort(key=lambda x: x.success_rate, reverse=True)
        
        # Start with imports
        imports = set()
        for feature in features:
            tree = ast.parse(feature.code)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for name in node.names:
                        imports.add(f"import {name.name}")
                elif isinstance(node, ast.ImportFrom):
                    module = node.module or ""
                    for name in node.names:
                        imports.add(f"from {module} import {name.name}")
                        
        # Combine imports
        code = "\n".join(sorted(imports)) + "\n\n"
        
        # Add features
        added_names = set()
        for feature in features:
            if feature.success_rate < self.min_success_rate:
                continue
                
            tree = ast.parse(feature.code)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    if node.name not in added_names:
                        code += astor.to_source(node) + "\n"
                        added_names.add(node.name)
                        
        return code
        
    async def merge_versions(self, plugin_name: str) -> Optional[str]:
        """Merge successful features from different versions of a plugin.
        
        Args:
            plugin_name: Name of the plugin to merge
            
        Returns:
            Versioned name of the merged plugin if successful
        """
        # Get all versions
        versions = []
        for version, metadata in plugin_cache.metadata.items():
            if version.startswith(f"{plugin_name}_v"):
                versions.append(version)
                
        if len(versions) < 2:
            logger.info(f"Not enough versions of {plugin_name} to merge")
            return None
            
        # Extract features
        all_features = []
        for version in versions:
            features = self.extract_features(version)
            all_features.extend(features)
            
        if not all_features:
            logger.error(f"No features found in {plugin_name} versions")
            return None
            
        # Find similar features
        similar_pairs = self.find_similar_features(all_features)
        if not similar_pairs:
            logger.info(f"No similar features found in {plugin_name} versions")
            return None
            
        # Merge features
        merged_code = self.merge_features(all_features)
        
        # Create new version
        versioned_name = plugin_cache._get_next_version(plugin_name)
        plugin_dir = plugin_cache.cache_dir / versioned_name
        plugin_dir.mkdir()
        
        # Write merged code
        with open(plugin_dir / "plugin.py", "w") as f:
            f.write(merged_code)
            
        # Test merged plugin
        test_results = await plugin_tester.test_plugin(plugin_dir)
        if not test_results["passed"]:
            logger.error(f"Merged plugin {versioned_name} failed tests")
            shutil.rmtree(plugin_dir)
            return None
            
        # Cache merged plugin
        plugin_cache.cache_plugin(
            plugin_name,
            plugin_dir,
            test_results,
            list(set(dep for f in all_features for dep in f.dependencies)),
            f"Merged version of {plugin_name} combining successful features"
        )
        
        logger.info(f"Successfully merged {plugin_name} versions into {versioned_name}")
        return versioned_name

# Create singleton instance
plugin_merger = PluginMerger() 