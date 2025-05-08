"""
World Model Manager
Manages the system's understanding of the world state.
"""

import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime
from pathlib import Path
import json
from core.service_locator import service_locator

class WorldModelManager:
    """Manages the system's world model and state tracking."""
    
    def __init__(self):
        """Initialize the world model manager."""
        self.logger = logging.getLogger(__name__)
        self._state_file = Path('data/world_state.json')
        self._knowledge_base = {}
        self._relationships = {}
        self._constraints = set()
        self._observations = []
        self._last_update = None
        self._load_state()

    def _load_state(self) -> None:
        """Load world state from file."""
        try:
            if self._state_file.exists():
                with open(self._state_file, 'r') as f:
                    state = json.load(f)
                    self._knowledge_base = state.get('knowledge_base', {})
                    self._relationships = state.get('relationships', {})
                    self._constraints = set(state.get('constraints', []))
                    self._observations = state.get('observations', [])
                    self._last_update = state.get('last_update')
        except Exception as e:
            self.logger.error(f"Error loading world state: {e}")

    def _save_state(self) -> None:
        """Save world state to file."""
        try:
            state = {
                'knowledge_base': self._knowledge_base,
                'relationships': self._relationships,
                'constraints': list(self._constraints),
                'observations': self._observations,
                'last_update': datetime.now().isoformat()
            }
            self._state_file.parent.mkdir(exist_ok=True)
            with open(self._state_file, 'w') as f:
                json.dump(state, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving world state: {e}")

    async def update_knowledge(self, 
                             entity: str, 
                             attributes: Dict[str, Any],
                             source: str = "system") -> None:
        """Update knowledge about an entity."""
        try:
            self.logger.info(f"Updating knowledge for entity: {entity}")
            
            if entity not in self._knowledge_base:
                self._knowledge_base[entity] = {}
            
            self._knowledge_base[entity].update(attributes)
            self._knowledge_base[entity]['last_updated'] = datetime.now().isoformat()
            self._knowledge_base[entity]['source'] = source
            
            self._save_state()
            
            self.logger.info(f"Updated knowledge for entity: {entity}")
            
        except Exception as e:
            self.logger.error(f"Error updating knowledge: {e}")
            raise

    async def add_relationship(self,
                             source: str,
                             target: str,
                             relationship_type: str,
                             attributes: Dict[str, Any] = None) -> None:
        """Add a relationship between entities."""
        try:
            self.logger.info(f"Adding relationship: {source} -> {target}")
            
            if source not in self._relationships:
                self._relationships[source] = {}
            
            if target not in self._relationships[source]:
                self._relationships[source][target] = []
            
            relationship = {
                'type': relationship_type,
                'attributes': attributes or {},
                'created_at': datetime.now().isoformat()
            }
            
            self._relationships[source][target].append(relationship)
            self._save_state()
            
            self.logger.info(f"Added relationship: {source} -> {target}")
            
        except Exception as e:
            self.logger.error(f"Error adding relationship: {e}")
            raise

    async def add_constraint(self, constraint: str) -> None:
        """Add a system constraint."""
        try:
            self.logger.info(f"Adding constraint: {constraint}")
            
            self._constraints.add(constraint)
            self._save_state()
            
            self.logger.info(f"Added constraint: {constraint}")
            
        except Exception as e:
            self.logger.error(f"Error adding constraint: {e}")
            raise

    async def add_observation(self,
                            observation: str,
                            context: Dict[str, Any] = None) -> None:
        """Add an observation about the world."""
        try:
            self.logger.info(f"Adding observation: {observation}")
            
            self._observations.append({
                'observation': observation,
                'context': context or {},
                'timestamp': datetime.now().isoformat()
            })
            self._save_state()
            
            self.logger.info(f"Added observation: {observation}")
            
        except Exception as e:
            self.logger.error(f"Error adding observation: {e}")
            raise

    async def query_knowledge(self,
                            entity: str = None,
                            relationship_type: str = None,
                            attributes: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Query the knowledge base."""
        try:
            self.logger.info("Querying knowledge base")
            
            results = []
            
            if entity:
                if entity in self._knowledge_base:
                    results.append({
                        'entity': entity,
                        'knowledge': self._knowledge_base[entity]
                    })
            else:
                for e, knowledge in self._knowledge_base.items():
                    if attributes:
                        if all(knowledge.get(k) == v for k, v in attributes.items()):
                            results.append({
                                'entity': e,
                                'knowledge': knowledge
                            })
                    else:
                        results.append({
                            'entity': e,
                            'knowledge': knowledge
                        })
            
            if relationship_type:
                filtered_results = []
                for result in results:
                    entity = result['entity']
                    if entity in self._relationships:
                        for target, relationships in self._relationships[entity].items():
                            for rel in relationships:
                                if rel['type'] == relationship_type:
                                    filtered_results.append({
                                        'source': entity,
                                        'target': target,
                                        'relationship': rel
                                    })
                results = filtered_results
            
            self.logger.info(f"Query returned {len(results)} results")
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error querying knowledge: {e}")
            raise

    async def analyze_state(self) -> Dict[str, Any]:
        """Analyze the current world state."""
        try:
            self.logger.info("Analyzing world state")
            
            analysis = {
                'entity_count': len(self._knowledge_base),
                'relationship_count': sum(
                    len(relationships)
                    for relationships in self._relationships.values()
                ),
                'constraint_count': len(self._constraints),
                'observation_count': len(self._observations),
                'last_update': self._last_update,
                'constraints': list(self._constraints),
                'recent_observations': self._observations[-5:] if self._observations else []
            }
            
            self.logger.info("Completed world state analysis")
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"Error analyzing state: {e}")
            raise

    async def validate_state(self) -> Dict[str, Any]:
        """Validate the current world state against constraints.
        
        Returns:
            Dict[str, Any]: Validation results including violations and warnings
        """
        try:
            self.logger.info("Validating world state")
            
            validation = {
                'valid': True,
                'violations': [],
                'warnings': [],
                'constraint_results': {},
                'relationship_results': {},
                'entity_results': {}
            }
            
            # Check constraints
            for constraint in self._constraints:
                constraint_result = await self._validate_constraint(constraint)
                validation['constraint_results'][constraint] = constraint_result
                
                if not constraint_result['valid']:
                    validation['valid'] = False
                    validation['violations'].extend(constraint_result['violations'])
                validation['warnings'].extend(constraint_result['warnings'])
            
            # Check relationships
            for source, targets in self._relationships.items():
                relationship_result = await self._validate_relationships(source, targets)
                validation['relationship_results'][source] = relationship_result
                
                if not relationship_result['valid']:
                    validation['valid'] = False
                    validation['violations'].extend(relationship_result['violations'])
                validation['warnings'].extend(relationship_result['warnings'])
            
            # Check entities
            for entity, knowledge in self._knowledge_base.items():
                entity_result = await self._validate_entity(entity, knowledge)
                validation['entity_results'][entity] = entity_result
                
                if not entity_result['valid']:
                    validation['valid'] = False
                    validation['violations'].extend(entity_result['violations'])
                validation['warnings'].extend(entity_result['warnings'])
            
            self.logger.info(f"Completed world state validation: {validation['valid']}")
            
            return validation
            
        except Exception as e:
            self.logger.error(f"Error validating state: {e}")
            raise

    async def _validate_constraint(self, constraint: str) -> Dict[str, Any]:
        """Validate a single constraint.
        
        Args:
            constraint: Constraint string to validate
            
        Returns:
            Dict[str, Any]: Validation results for the constraint
        """
        result = {
            'valid': True,
            'violations': [],
            'warnings': []
        }
        
        try:
            # Parse constraint
            constraint_parts = constraint.split(':')
            if len(constraint_parts) != 2:
                result['valid'] = False
                result['violations'].append("Invalid constraint format")
                return result
                
            constraint_type, constraint_value = constraint_parts
            
            # Validate based on constraint type
            if constraint_type == 'temporal':
                await self._validate_temporal_constraint(constraint_value, result)
            elif constraint_type == 'resource':
                await self._validate_resource_constraint(constraint_value, result)
            elif constraint_type == 'dependency':
                await self._validate_dependency_constraint(constraint_value, result)
            elif constraint_type == 'state':
                await self._validate_state_constraint(constraint_value, result)
            elif constraint_type == 'location':
                await self._validate_location_constraint(constraint_value, result)
            else:
                result['valid'] = False
                result['violations'].append(f"Unknown constraint type: {constraint_type}")
                
        except Exception as e:
            result['valid'] = False
            result['violations'].append(f"Error validating constraint: {str(e)}")
            
        return result

    async def _validate_temporal_constraint(self, value: str, result: Dict[str, Any]) -> None:
        """Validate a temporal constraint.
        
        Args:
            value: Constraint value
            result: Validation result dictionary to update
        """
        try:
            # Parse time range
            time_parts = value.split('->')
            if len(time_parts) != 2:
                result['violations'].append("Invalid temporal constraint format")
                return
                
            start_time, end_time = time_parts
            
            # Validate time format
            try:
                start = datetime.fromisoformat(start_time.strip())
                end = datetime.fromisoformat(end_time.strip())
                
                if end < start:
                    result['violations'].append("End time before start time")
                    
                # Check if constraint is in the past
                if end < datetime.now():
                    result['warnings'].append("Constraint is in the past")
                    
            except ValueError:
                result['violations'].append("Invalid datetime format")
                
        except Exception as e:
            result['violations'].append(f"Error validating temporal constraint: {str(e)}")

    async def _validate_resource_constraint(self, value: str, result: Dict[str, Any]) -> None:
        """Validate a resource constraint.
        
        Args:
            value: Constraint value
            result: Validation result dictionary to update
        """
        try:
            # Parse resource specification
            resource_parts = value.split('=')
            if len(resource_parts) != 2:
                result['violations'].append("Invalid resource constraint format")
                return
                
            resource_type, amount = resource_parts
            
            # Validate resource type
            if resource_type not in ['cpu', 'memory', 'disk', 'network']:
                result['violations'].append(f"Invalid resource type: {resource_type}")
                return
                
            # Validate amount
            try:
                amount_value = float(amount.strip())
                if amount_value <= 0:
                    result['violations'].append("Resource amount must be positive")
                elif amount_value > 100 and resource_type == 'cpu':
                    result['violations'].append("CPU usage cannot exceed 100%")
            except ValueError:
                result['violations'].append("Invalid resource amount format")
                
        except Exception as e:
            result['violations'].append(f"Error validating resource constraint: {str(e)}")

    async def _validate_dependency_constraint(self, value: str, result: Dict[str, Any]) -> None:
        """Validate a dependency constraint.
        
        Args:
            value: Constraint value
            result: Validation result dictionary to update
        """
        try:
            # Parse dependencies
            dependencies = [dep.strip() for dep in value.split(',')]
            
            # Validate each dependency
            for dep in dependencies:
                if not dep:
                    result['violations'].append("Empty dependency found")
                    continue
                    
                # Check if dependency exists in knowledge base
                if dep not in self._knowledge_base:
                    result['warnings'].append(f"Dependency {dep} not found in knowledge base")
                    
                # Check for circular dependencies
                if dep in self._relationships:
                    for target, relationships in self._relationships[dep].items():
                        for rel in relationships:
                            if rel['type'] == 'depends_on' and target in dependencies:
                                result['violations'].append(f"Circular dependency detected: {dep} <-> {target}")
                                
        except Exception as e:
            result['violations'].append(f"Error validating dependency constraint: {str(e)}")

    async def _validate_state_constraint(self, value: str, result: Dict[str, Any]) -> None:
        """Validate a state constraint.
        
        Args:
            value: Constraint value
            result: Validation result dictionary to update
        """
        try:
            # Parse state requirements
            state_parts = value.split(';')
            for part in state_parts:
                if not part.strip():
                    continue
                    
                key_value = part.split('=')
                if len(key_value) != 2:
                    result['violations'].append(f"Invalid state format: {part}")
                    continue
                    
                key, val = key_value
                key = key.strip()
                val = val.strip()
                
                # Validate key format
                if not key or ' ' in key:
                    result['violations'].append(f"Invalid state key: {key}")
                    continue
                    
                # Validate value format
                if not val:
                    result['violations'].append(f"Invalid state value for {key}")
                    continue
                    
                # Check if state exists in knowledge base
                if key not in self._knowledge_base:
                    result['warnings'].append(f"State key {key} not found in knowledge base")
                    
        except Exception as e:
            result['violations'].append(f"Error validating state constraint: {str(e)}")

    async def _validate_location_constraint(self, value: str, result: Dict[str, Any]) -> None:
        """Validate a location constraint.
        
        Args:
            value: Constraint value
            result: Validation result dictionary to update
        """
        try:
            # Parse location coordinates
            coords = value.split(',')
            if len(coords) != 3:
                result['violations'].append("Invalid location format: must have x,y,z coordinates")
                return
                
            # Validate each coordinate
            for i, coord in enumerate(['x', 'y', 'z']):
                try:
                    value = float(coords[i].strip())
                    if not (-1000 <= value <= 1000):  # Example bounds
                        result['warnings'].append(f"{coord} coordinate out of expected range")
                except ValueError:
                    result['violations'].append(f"Invalid {coord} coordinate format")
                    
        except Exception as e:
            result['violations'].append(f"Error validating location constraint: {str(e)}")

    async def _validate_relationships(self, source: str, targets: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Validate relationships for an entity.
        
        Args:
            source: Source entity
            targets: Dictionary of target entities and their relationships
            
        Returns:
            Dict[str, Any]: Validation results
        """
        result = {
            'valid': True,
            'violations': [],
            'warnings': []
        }
        
        # Check if source exists
        if source not in self._knowledge_base:
            result['valid'] = False
            result['violations'].append(f"Source entity {source} not found in knowledge base")
            
        # Validate each target and its relationships
        for target, relationships in targets.items():
            # Check if target exists
            if target not in self._knowledge_base:
                result['warnings'].append(f"Target entity {target} not found in knowledge base")
                
            # Validate each relationship
            for rel in relationships:
                if 'type' not in rel:
                    result['valid'] = False
                    result['violations'].append(f"Relationship missing type: {source} -> {target}")
                    continue
                    
                # Check relationship attributes
                if 'attributes' in rel:
                    for attr, value in rel['attributes'].items():
                        if not isinstance(attr, str):
                            result['valid'] = False
                            result['violations'].append(
                                f"Invalid relationship attribute key: {attr}"
                            )
                            
        return result

    async def _validate_entity(self, entity: str, knowledge: Dict[str, Any]) -> Dict[str, Any]:
        """Validate an entity and its knowledge.
        
        Args:
            entity: Entity identifier
            knowledge: Entity knowledge dictionary
            
        Returns:
            Dict[str, Any]: Validation results
        """
        result = {
            'valid': True,
            'violations': [],
            'warnings': []
        }
        
        # Check required fields
        required_fields = ['type', 'created_at']
        for field in required_fields:
            if field not in knowledge:
                result['valid'] = False
                result['violations'].append(f"Entity {entity} missing required field: {field}")
                
        # Validate timestamps
        if 'created_at' in knowledge:
            try:
                datetime.fromisoformat(knowledge['created_at'])
            except ValueError:
                result['valid'] = False
                result['violations'].append(f"Entity {entity} has invalid created_at timestamp")
                
        if 'last_updated' in knowledge:
            try:
                datetime.fromisoformat(knowledge['last_updated'])
            except ValueError:
                result['valid'] = False
                result['violations'].append(f"Entity {entity} has invalid last_updated timestamp")
                
        # Validate attributes
        for attr, value in knowledge.items():
            if not isinstance(attr, str):
                result['valid'] = False
                result['violations'].append(f"Entity {entity} has invalid attribute key: {attr}")
                
        return result

# Create singleton instance
world_model_manager = WorldModelManager() 