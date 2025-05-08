"""
Tests for the dependency analyzer.
"""

import pytest
import os
import tempfile
from pathlib import Path
from typing import List, Set
from core.dependency_analyzer import DependencyAnalyzer, ModuleInfo

@pytest.fixture
def temp_dir():
    """Create a temporary directory with test modules."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create test modules
        modules = {
            "module_a.py": """
import module_b
from module_c import ClassC

class ClassA:
    def method_a(self):
        pass

def function_a():
    pass

variable_a = 1
""",
            "module_b.py": """
import module_c
from module_a import ClassA

class ClassB:
    def method_b(self):
        pass

def function_b():
    pass

variable_b = 2
""",
            "module_c.py": """
import module_a
from module_b import ClassB

class ClassC:
    def method_c(self):
        pass

def function_c():
    pass

variable_c = 3
"""
        }
        
        # Write modules to files
        for name, content in modules.items():
            path = Path(temp_dir) / name
            with open(path, "w") as f:
                f.write(content)
        
        yield temp_dir

@pytest.fixture
def analyzer(temp_dir):
    """Create a dependency analyzer instance."""
    return DependencyAnalyzer(temp_dir)

def test_module_scanning(analyzer):
    """Test module scanning functionality."""
    # Check if all modules were found
    assert len(analyzer.modules) == 3
    assert "module_a" in analyzer.modules
    assert "module_b" in analyzer.modules
    assert "module_c" in analyzer.modules
    
    # Check module info
    module_a = analyzer.modules["module_a"]
    assert isinstance(module_a, ModuleInfo)
    assert module_a.name == "module_a"
    assert "module_b" in module_a.imports
    assert "module_c" in module_a.imports
    assert "ClassA" in module_a.classes
    assert "function_a" in module_a.functions
    assert "variable_a" in module_a.variables

def test_dependency_graph(analyzer):
    """Test dependency graph construction."""
    # Check graph structure
    assert analyzer.dependency_graph.number_of_nodes() == 3
    assert analyzer.dependency_graph.number_of_edges() == 6  # 3 modules with 2 imports each
    
    # Check edges
    assert analyzer.dependency_graph.has_edge("module_a", "module_b")
    assert analyzer.dependency_graph.has_edge("module_a", "module_c")
    assert analyzer.dependency_graph.has_edge("module_b", "module_c")
    assert analyzer.dependency_graph.has_edge("module_b", "module_a")
    assert analyzer.dependency_graph.has_edge("module_c", "module_a")
    assert analyzer.dependency_graph.has_edge("module_c", "module_b")

def test_circular_dependencies(analyzer):
    """Test circular dependency detection."""
    # Find circular dependencies
    cycles = analyzer.find_circular_dependencies()
    
    # Check if cycles were found
    assert len(cycles) > 0
    
    # Check cycle structure
    for cycle in cycles:
        assert len(cycle) == 3  # All modules form a cycle
        assert "module_a" in cycle
        assert "module_b" in cycle
        assert "module_c" in cycle

def test_module_dependencies(analyzer):
    """Test module dependency retrieval."""
    # Get dependencies for module_a
    imports, imported_by = analyzer.get_module_dependencies("module_a")
    
    # Check imports
    assert "module_b" in imports
    assert "module_c" in imports
    
    # Check imported_by
    assert "module_b" in imported_by
    assert "module_c" in imported_by

def test_dependency_fixes(analyzer):
    """Test dependency fix suggestions."""
    # Get suggestions for module_a
    suggestions = analyzer.suggest_dependency_fixes("module_a")
    
    # Check if suggestions were generated
    assert len(suggestions) > 0
    
    # Check suggestion content
    for suggestion in suggestions:
        assert "module_a" in suggestion
        assert any(module in suggestion for module in ["module_b", "module_c"])

def test_dependency_report(analyzer):
    """Test dependency report generation."""
    # Generate report
    report = analyzer.generate_dependency_report()
    
    # Check report content
    assert "Dependency Analysis Report" in report
    assert "Module Statistics" in report
    assert "Circular Dependencies" in report
    assert "Module Details" in report
    
    # Check module information
    assert "module_a" in report
    assert "module_b" in report
    assert "module_c" in report
    
    # Check statistics
    assert "Total modules: 3" in report
    assert "Total dependencies: 6" in report

def test_invalid_module(analyzer):
    """Test handling of invalid module names."""
    # Try to get dependencies for non-existent module
    with pytest.raises(ValueError):
        analyzer.get_module_dependencies("non_existent_module")
    
    # Try to get suggestions for non-existent module
    with pytest.raises(ValueError):
        analyzer.suggest_dependency_fixes("non_existent_module")

def test_empty_directory():
    """Test analyzer with empty directory."""
    with tempfile.TemporaryDirectory() as empty_dir:
        analyzer = DependencyAnalyzer(empty_dir)
        
        # Check if no modules were found
        assert len(analyzer.modules) == 0
        assert analyzer.dependency_graph.number_of_nodes() == 0
        assert analyzer.dependency_graph.number_of_edges() == 0
        
        # Check if no circular dependencies were found
        assert len(analyzer.find_circular_dependencies()) == 0
        
        # Check if report is generated correctly
        report = analyzer.generate_dependency_report()
        assert "Total modules: 0" in report
        assert "Total dependencies: 0" in report 