"""
Dependency Analyzer
Analyzes module dependencies and helps eliminate circular dependencies.
"""

import ast
import logging
import os
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field
import networkx as nx
from collections import defaultdict

@dataclass
class ModuleInfo:
    """Information about a module."""
    name: str
    path: Path
    imports: Set[str] = field(default_factory=set)
    imported_by: Set[str] = field(default_factory=set)
    classes: Set[str] = field(default_factory=set)
    functions: Set[str] = field(default_factory=set)
    variables: Set[str] = field(default_factory=set)

class DependencyAnalyzer:
    """Analyzes module dependencies and helps eliminate circular dependencies."""
    
    def __init__(self, root_dir: str):
        """Initialize dependency analyzer.
        
        Args:
            root_dir: Root directory to analyze
        """
        self.logger = logging.getLogger("DependencyAnalyzer")
        self._setup_logging()
        
        self.root_dir = Path(root_dir)
        self.modules: Dict[str, ModuleInfo] = {}
        self.dependency_graph = nx.DiGraph()
        
        # Initialize analyzer
        self._scan_modules()
        self._build_dependency_graph()
    
    def _setup_logging(self) -> None:
        """Setup analyzer logging."""
        log_file = Path("logs") / "dependency_analyzer.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    def _scan_modules(self) -> None:
        """Scan all Python modules in the root directory."""
        try:
            for path in self.root_dir.rglob("*.py"):
                # Skip test files and __init__.py
                if "test" in path.name or path.name == "__init__.py":
                    continue
                
                # Get module name
                module_name = self._get_module_name(path)
                
                # Parse module
                module_info = self._parse_module(path, module_name)
                
                # Store module info
                self.modules[module_name] = module_info
                
        except Exception as e:
            self.logger.error(f"Failed to scan modules: {str(e)}")
            raise
    
    def _get_module_name(self, path: Path) -> str:
        """Get module name from path.
        
        Args:
            path: Module path
            
        Returns:
            str: Module name
        """
        try:
            # Get relative path from root
            rel_path = path.relative_to(self.root_dir)
            
            # Convert to module name
            module_name = str(rel_path).replace("/", ".").replace("\\", ".")
            module_name = module_name[:-3]  # Remove .py
            
            return module_name
            
        except Exception as e:
            self.logger.error(f"Failed to get module name for {path}: {str(e)}")
            raise
    
    def _parse_module(self, path: Path, module_name: str) -> ModuleInfo:
        """Parse a Python module.
        
        Args:
            path: Module path
            module_name: Module name
            
        Returns:
            ModuleInfo: Module information
        """
        try:
            # Read module content
            with open(path) as f:
                content = f.read()
            
            # Parse module
            tree = ast.parse(content)
            
            # Create module info
            module_info = ModuleInfo(
                name=module_name,
                path=path
            )
            
            # Analyze module
            for node in ast.walk(tree):
                # Handle imports
                if isinstance(node, ast.Import):
                    for name in node.names:
                        module_info.imports.add(name.name)
                
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        module_info.imports.add(node.module)
                
                # Handle class definitions
                elif isinstance(node, ast.ClassDef):
                    module_info.classes.add(node.name)
                
                # Handle function definitions
                elif isinstance(node, ast.FunctionDef):
                    module_info.functions.add(node.name)
                
                # Handle variable assignments
                elif isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            module_info.variables.add(target.id)
            
            return module_info
            
        except Exception as e:
            self.logger.error(f"Failed to parse module {path}: {str(e)}")
            raise
    
    def _build_dependency_graph(self) -> None:
        """Build dependency graph from module information."""
        try:
            # Create graph
            self.dependency_graph = nx.DiGraph()
            
            # Add nodes
            for module_name in self.modules:
                self.dependency_graph.add_node(module_name)
            
            # Add edges
            for module_name, module_info in self.modules.items():
                for import_name in module_info.imports:
                    # Find imported module
                    imported_module = self._find_imported_module(import_name)
                    if imported_module:
                        # Add edge
                        self.dependency_graph.add_edge(module_name, imported_module)
                        
                        # Update module info
                        self.modules[imported_module].imported_by.add(module_name)
            
        except Exception as e:
            self.logger.error(f"Failed to build dependency graph: {str(e)}")
            raise
    
    def _find_imported_module(self, import_name: str) -> Optional[str]:
        """Find module name for an import.
        
        Args:
            import_name: Import name
            
        Returns:
            Optional[str]: Module name if found
        """
        try:
            # Check exact match
            if import_name in self.modules:
                return import_name
            
            # Check prefix match
            for module_name in self.modules:
                if module_name.endswith(import_name):
                    return module_name
            
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to find imported module for {import_name}: {str(e)}")
            return None
    
    def find_circular_dependencies(self) -> List[List[str]]:
        """Find circular dependencies in the codebase.
        
        Returns:
            List[List[str]]: List of circular dependency cycles
        """
        try:
            # Find cycles
            cycles = list(nx.simple_cycles(self.dependency_graph))
            
            # Log cycles
            if cycles:
                self.logger.warning(f"Found {len(cycles)} circular dependencies:")
                for cycle in cycles:
                    self.logger.warning(f"Cycle: {' -> '.join(cycle)}")
            
            return cycles
            
        except Exception as e:
            self.logger.error(f"Failed to find circular dependencies: {str(e)}")
            return []
    
    def get_module_dependencies(self, module_name: str) -> Tuple[Set[str], Set[str]]:
        """Get module dependencies.
        
        Args:
            module_name: Module name
            
        Returns:
            Tuple[Set[str], Set[str]]: (imports, imported_by)
        """
        try:
            if module_name not in self.modules:
                raise ValueError(f"Module {module_name} not found")
            
            module_info = self.modules[module_name]
            return module_info.imports, module_info.imported_by
            
        except Exception as e:
            self.logger.error(f"Failed to get module dependencies for {module_name}: {str(e)}")
            raise
    
    def suggest_dependency_fixes(self, module_name: str) -> List[str]:
        """Suggest fixes for module dependencies.
        
        Args:
            module_name: Module name
            
        Returns:
            List[str]: List of suggested fixes
        """
        try:
            if module_name not in self.modules:
                raise ValueError(f"Module {module_name} not found")
            
            suggestions = []
            module_info = self.modules[module_name]
            
            # Check for circular dependencies
            cycles = self.find_circular_dependencies()
            for cycle in cycles:
                if module_name in cycle:
                    # Find other modules in cycle
                    other_modules = [m for m in cycle if m != module_name]
                    
                    # Suggest moving shared code to a new module
                    suggestions.append(
                        f"Move shared code between {module_name} and {', '.join(other_modules)} "
                        f"to a new module"
                    )
            
            # Check for too many dependencies
            if len(module_info.imports) > 10:
                suggestions.append(
                    f"Module {module_name} has too many imports ({len(module_info.imports)}). "
                    f"Consider splitting into smaller modules."
                )
            
            # Check for too many dependents
            if len(module_info.imported_by) > 5:
                suggestions.append(
                    f"Module {module_name} is imported by too many modules "
                    f"({len(module_info.imported_by)}). Consider using dependency injection."
                )
            
            return suggestions
            
        except Exception as e:
            self.logger.error(f"Failed to suggest dependency fixes for {module_name}: {str(e)}")
            raise
    
    def generate_dependency_report(self) -> str:
        """Generate dependency analysis report.
        
        Returns:
            str: Dependency report
        """
        try:
            report = []
            report.append("Dependency Analysis Report")
            report.append("=" * 50)
            report.append("")
            
            # Module statistics
            report.append("Module Statistics:")
            report.append("-" * 20)
            report.append(f"Total modules: {len(self.modules)}")
            report.append(f"Total dependencies: {self.dependency_graph.number_of_edges()}")
            report.append("")
            
            # Circular dependencies
            cycles = self.find_circular_dependencies()
            if cycles:
                report.append("Circular Dependencies:")
                report.append("-" * 20)
                for cycle in cycles:
                    report.append(f"Cycle: {' -> '.join(cycle)}")
                report.append("")
            
            # Module details
            report.append("Module Details:")
            report.append("-" * 20)
            for module_name, module_info in sorted(self.modules.items()):
                report.append(f"\nModule: {module_name}")
                report.append(f"Path: {module_info.path}")
                report.append(f"Imports: {', '.join(sorted(module_info.imports))}")
                report.append(f"Imported by: {', '.join(sorted(module_info.imported_by))}")
                report.append(f"Classes: {', '.join(sorted(module_info.classes))}")
                report.append(f"Functions: {', '.join(sorted(module_info.functions))}")
                report.append(f"Variables: {', '.join(sorted(module_info.variables))}")
                
                # Suggestions
                suggestions = self.suggest_dependency_fixes(module_name)
                if suggestions:
                    report.append("\nSuggestions:")
                    for suggestion in suggestions:
                        report.append(f"- {suggestion}")
            
            return "\n".join(report)
            
        except Exception as e:
            self.logger.error(f"Failed to generate dependency report: {str(e)}")
            raise

# Create global dependency analyzer instance
dependency_analyzer = DependencyAnalyzer("core") 