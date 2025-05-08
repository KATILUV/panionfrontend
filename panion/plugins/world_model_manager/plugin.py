"""
World Model Manager Plugin
Manages the world model and relationships between entities.
"""

import logging
from typing import List, Dict, Any, Optional, Set, Tuple
from pathlib import Path
import json
import yaml
from dataclasses import dataclass, field
from datetime import datetime
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import networkx as nx
from collections import defaultdict

from core.plugin.base import BasePlugin, PluginError
from core.plugin.types import PluginMetadata, PluginState, PluginDependencies

class Plugin(BasePlugin):
    """Plugin for managing the world model and entity relationships."""
    
    __version__ = "1.0.0"
    __dependencies__ = PluginDependencies(
        packages={
            "networkx": ">=2.5.0",
            "numpy": ">=1.19.0",
            "scikit-learn": ">=0.24.0"
        }
    )
    
    def __init__(self, plugin_id: str, name: str, version: str, dependencies: Dict[str, str] = None):
        super().__init__(plugin_id, name, version, dependencies)
        self._graph = nx.DiGraph()
        self._entity_types = set()
        self._relation_types = set()
        self._internal_state = {
            'entity_count': 0,
            'relation_count': 0,
            'entity_types': [],
            'relation_types': [],
            'last_updated': None
        }
        
    async def _initialize(self) -> None:
        """Initialize the world model manager."""
        try:
            # Initialize graph
            self._graph = nx.DiGraph()
            self._entity_types = set()
            self._relation_types = set()
            
            self.logger.info("World model manager initialized")
            
        except Exception as e:
            self.logger.error(f"Error initializing world model manager: {e}")
            raise PluginError(f"Initialization failed: {e}")
            
    async def _start(self) -> None:
        """Start the world model manager."""
        self.logger.info("World model manager started")
        
    async def _stop(self) -> None:
        """Stop the world model manager."""
        self.logger.info("World model manager stopped")
        
    async def _execute(self, command: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a world model operation."""
        if not self._graph:
            raise PluginError("World model not initialized")
            
        try:
            if command == "add_entity":
                return self._add_entity(**args)
            elif command == "add_relation":
                return self._add_relation(**args)
            elif command == "get_entity":
                return self._get_entity(**args)
            elif command == "get_relations":
                return self._get_relations(**args)
            elif command == "query":
                return self._query(**args)
            else:
                raise PluginError(f"Unknown operation: {command}")
                
        except Exception as e:
            self.logger.error(f"Error executing operation {command}: {e}")
            raise PluginError(f"Operation failed: {e}")
            
    def _add_entity(self, entity_id: str, entity_type: str, properties: Dict[str, Any] = None) -> Dict[str, Any]:
        """Add an entity to the world model."""
        try:
            # Add entity to graph
            self._graph.add_node(entity_id, type=entity_type, properties=properties or {})
            self._entity_types.add(entity_type)
            
            # Update internal state
            self._internal_state['entity_count'] += 1
            self._internal_state['entity_types'] = list(self._entity_types)
            self._internal_state['last_updated'] = datetime.now().isoformat()
            
            return {
                'entity_id': entity_id,
                'entity_type': entity_type,
                'properties': properties or {}
            }
            
        except Exception as e:
            raise PluginError(f"Failed to add entity: {e}")
            
    def _add_relation(self, source_id: str, target_id: str, relation_type: str, properties: Dict[str, Any] = None) -> Dict[str, Any]:
        """Add a relation between entities."""
        try:
            # Check if entities exist
            if not self._graph.has_node(source_id):
                raise PluginError(f"Source entity {source_id} not found")
            if not self._graph.has_node(target_id):
                raise PluginError(f"Target entity {target_id} not found")
                
            # Add relation to graph
            self._graph.add_edge(source_id, target_id, type=relation_type, properties=properties or {})
            self._relation_types.add(relation_type)
            
            # Update internal state
            self._internal_state['relation_count'] += 1
            self._internal_state['relation_types'] = list(self._relation_types)
            self._internal_state['last_updated'] = datetime.now().isoformat()
            
            return {
                'source_id': source_id,
                'target_id': target_id,
                'relation_type': relation_type,
                'properties': properties or {}
            }
            
        except Exception as e:
            raise PluginError(f"Failed to add relation: {e}")
            
    def _get_entity(self, entity_id: str) -> Dict[str, Any]:
        """Get entity information."""
        try:
            if not self._graph.has_node(entity_id):
                raise PluginError(f"Entity {entity_id} not found")
                
            node_data = self._graph.nodes[entity_id]
            return {
                'entity_id': entity_id,
                'entity_type': node_data['type'],
                'properties': node_data['properties']
            }
            
        except Exception as e:
            raise PluginError(f"Failed to get entity: {e}")
            
    def _get_relations(self, entity_id: str, relation_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get relations for an entity."""
        try:
            if not self._graph.has_node(entity_id):
                raise PluginError(f"Entity {entity_id} not found")
                
            relations = []
            for source, target, data in self._graph.edges(data=True):
                if source == entity_id and (relation_type is None or data['type'] == relation_type):
                    relations.append({
                        'source_id': source,
                        'target_id': target,
                        'relation_type': data['type'],
                        'properties': data['properties']
                    })
                    
            return relations
            
        except Exception as e:
            raise PluginError(f"Failed to get relations: {e}")
            
    def _query(self, query_type: str, **kwargs) -> Any:
        """Execute a graph query."""
        try:
            if query_type == "shortest_path":
                return self._shortest_path(**kwargs)
            elif query_type == "connected_components":
                return self._connected_components()
            elif query_type == "subgraph":
                return self._subgraph(**kwargs)
            else:
                raise PluginError(f"Unknown query type: {query_type}")
                
        except Exception as e:
            raise PluginError(f"Query failed: {e}")
            
    def _shortest_path(self, source_id: str, target_id: str) -> List[str]:
        """Find shortest path between entities."""
        try:
            if not self._graph.has_node(source_id):
                raise PluginError(f"Source entity {source_id} not found")
            if not self._graph.has_node(target_id):
                raise PluginError(f"Target entity {target_id} not found")
                
            return nx.shortest_path(self._graph, source_id, target_id)
            
        except nx.NetworkXNoPath:
            raise PluginError(f"No path found between {source_id} and {target_id}")
        except Exception as e:
            raise PluginError(f"Shortest path query failed: {e}")
            
    def _connected_components(self) -> List[Set[str]]:
        """Get connected components in the graph."""
        try:
            return list(nx.weakly_connected_components(self._graph))
        except Exception as e:
            raise PluginError(f"Connected components query failed: {e}")
            
    def _subgraph(self, entity_ids: List[str]) -> nx.DiGraph:
        """Get subgraph containing specified entities."""
        try:
            return self._graph.subgraph(entity_ids)
        except Exception as e:
            raise PluginError(f"Subgraph query failed: {e}")
            
    def cleanup(self) -> None:
        """Clean up plugin resources."""
        try:
            self._graph.clear()
            self._entity_types.clear()
            self._relation_types.clear()
            super().cleanup()
        except Exception as e:
            self.logger.error(f"Error during cleanup: {e}")
            raise PluginError(f"Cleanup failed: {e}") 