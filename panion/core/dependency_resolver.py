"""
Dependency Resolver
Handles dependency resolution and initialization order.
"""

from typing import Dict, Set, List, Any, Callable, Optional, Type, TypeVar
from collections import defaultdict
import logging
from threading import Lock

T = TypeVar('T')

class DependencyResolver:
    """Resolves dependencies and manages initialization order."""
    
    def __init__(self):
        """Initialize the dependency resolver."""
        self._dependencies: Dict[str, Set[str]] = defaultdict(set)
        self._factories: Dict[str, Callable[[], Any]] = {}
        self._instances: Dict[str, Any] = {}
        self._lock = Lock()
        self._logger = logging.getLogger(__name__)
    
    def register_dependency(self, name: str, factory: Callable[[], Any], dependencies: Optional[List[str]] = None) -> None:
        """Register a dependency with its factory and dependencies."""
        with self._lock:
            self._factories[name] = factory
            if dependencies:
                self._dependencies[name].update(dependencies)
    
    def resolve(self, name: str) -> Any:
        """Resolve a dependency and its dependencies."""
        with self._lock:
            if name in self._instances:
                return self._instances[name]
            
            if name not in self._factories:
                raise ValueError(f"Dependency {name} not registered")
            
            # Resolve dependencies first
            for dep in self._dependencies[name]:
                if dep not in self._instances:
                    self.resolve(dep)
            
            # Create instance
            try:
                instance = self._factories[name]()
                self._instances[name] = instance
                return instance
            except Exception as e:
                self._logger.error(f"Error resolving dependency {name}: {e}")
                raise
    
    def resolve_all(self) -> Dict[str, Any]:
        """Resolve all registered dependencies."""
        with self._lock:
            resolved = {}
            for name in self._factories:
                resolved[name] = self.resolve(name)
            return resolved
    
    def get_dependencies(self, name: str) -> Set[str]:
        """Get dependencies for a registered component."""
        return self._dependencies[name].copy()
    
    def has_dependency(self, name: str) -> bool:
        """Check if a dependency is registered."""
        return name in self._factories
    
    def remove_dependency(self, name: str) -> None:
        """Remove a dependency registration."""
        with self._lock:
            self._factories.pop(name, None)
            self._dependencies.pop(name, None)
            self._instances.pop(name, None)
    
    def clear(self) -> None:
        """Clear all dependency registrations."""
        with self._lock:
            self._dependencies.clear()
            self._factories.clear()
            self._instances.clear()
    
    def get_initialization_order(self) -> List[str]:
        """Get the order in which dependencies should be initialized."""
        visited = set()
        temp = set()
        order = []
        
        def visit(name: str) -> None:
            if name in temp:
                raise ValueError(f"Circular dependency detected: {name}")
            if name in visited:
                return
            
            temp.add(name)
            for dep in self._dependencies[name]:
                visit(dep)
            temp.remove(name)
            visited.add(name)
            order.append(name)
        
        for name in self._factories:
            if name not in visited:
                visit(name)
        
        return order

# Create global instance
dependency_resolver = DependencyResolver() 