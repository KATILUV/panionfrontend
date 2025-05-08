"""
Tests for the plugin synthesizer.
"""

import pytest
import os
import tempfile
from pathlib import Path
from typing import Dict, Any
from core.plugin.synthesizer import PluginSynthesizer, PluginTemplate

@pytest.fixture
def temp_dir():
    """Create a temporary directory with test templates and patterns."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create template directory
        template_dir = Path(temp_dir) / "templates" / "plugins"
        template_dir.mkdir(parents=True)
        
        # Create pattern directory
        pattern_dir = Path(temp_dir) / "patterns" / "plugins"
        pattern_dir.mkdir(parents=True)
        
        # Create test template
        template_data = {
            "name": "test_template",
            "description": "Test template for plugin synthesis",
            "required_capabilities": ["capability1", "capability2"],
            "required_dependencies": ["dependency1", "dependency2"],
            "code_template": """
class {{name}}:
    \"\"\"{{description}}\"\"\"
    
    def __init__(self):
        self.name = "{{name}}"
        self.description = "{{description}}"
        self.capabilities = {{capabilities}}
        self.dependencies = {{dependencies}}
        self.author = "{{author}}"
        self.version = "{{version}}"
        self.created_at = "{{date}}"
    
    def initialize(self):
        \"\"\"Initialize plugin.\"\"\"
        pass
    
    def execute(self, data):
        \"\"\"Execute plugin.\"\"\"
        return data
""",
            "test_template": """
import pytest
from plugins.{{name}} import {{name}}

{{test_cases}}
"""
        }
        
        # Write template file
        template_file = template_dir / "test_template.json"
        with open(template_file, "w") as f:
            f.write(str(template_data))
        
        # Create test pattern
        pattern_code = """
def pattern_function(self, data):
    \"\"\"Pattern function.\"\"\"
    return data
"""
        
        # Write pattern file
        pattern_file = pattern_dir / "test_pattern.py"
        with open(pattern_file, "w") as f:
            f.write(pattern_code)
        
        yield temp_dir

@pytest.fixture
def synthesizer(temp_dir):
    """Create a plugin synthesizer instance."""
    return PluginSynthesizer()

@pytest.fixture
def plugin_requirements():
    """Create plugin requirements fixture."""
    return {
        "name": "TestPlugin",
        "description": "Test plugin for synthesis",
        "capabilities": ["capability1", "capability2"],
        "dependencies": ["dependency1", "dependency2"],
        "author": "Test Author",
        "version": "1.0.0",
        "patterns": ["test_pattern"]
    }

def test_template_loading(synthesizer):
    """Test template loading functionality."""
    # Check if templates were loaded
    assert len(synthesizer._templates) > 0
    assert "test_template" in synthesizer._templates
    
    # Check template content
    template = synthesizer._templates["test_template"]
    assert isinstance(template, PluginTemplate)
    assert template.name == "test_template"
    assert template.description == "Test template for plugin synthesis"
    assert "capability1" in template.required_capabilities
    assert "dependency1" in template.required_dependencies

def test_pattern_loading(synthesizer):
    """Test pattern loading functionality."""
    # Check if patterns were loaded
    assert len(synthesizer._patterns) > 0
    assert "test_pattern" in synthesizer._patterns
    
    # Check pattern content
    pattern = synthesizer._patterns["test_pattern"]
    assert "pattern_function" in pattern

def test_requirement_validation(synthesizer, plugin_requirements):
    """Test requirement validation."""
    # Test valid requirements
    assert synthesizer._validate_requirements(plugin_requirements)
    
    # Test missing required fields
    invalid_requirements = plugin_requirements.copy()
    del invalid_requirements["name"]
    assert not synthesizer._validate_requirements(invalid_requirements)
    
    # Test invalid name
    invalid_requirements = plugin_requirements.copy()
    invalid_requirements["name"] = "123invalid"
    assert not synthesizer._validate_requirements(invalid_requirements)
    
    # Test invalid capabilities
    invalid_requirements = plugin_requirements.copy()
    invalid_requirements["capabilities"] = "not a list"
    assert not synthesizer._validate_requirements(invalid_requirements)

def test_template_matching(synthesizer, plugin_requirements):
    """Test template matching functionality."""
    # Find matching template
    template = synthesizer._find_matching_template(plugin_requirements)
    
    # Check template
    assert template is not None
    assert template.name == "test_template"
    
    # Test with different capabilities
    different_requirements = plugin_requirements.copy()
    different_requirements["capabilities"] = ["different_capability"]
    template = synthesizer._find_matching_template(different_requirements)
    assert template is None

def test_plugin_code_generation(synthesizer, plugin_requirements):
    """Test plugin code generation."""
    # Get template
    template = synthesizer._templates["test_template"]
    
    # Generate code
    code = synthesizer._generate_plugin_code(template, plugin_requirements)
    
    # Check code
    assert code is not None
    assert "class TestPlugin" in code
    assert "Test plugin for synthesis" in code
    assert "capability1" in code
    assert "dependency1" in code
    assert "Test Author" in code
    assert "1.0.0" in code
    assert "pattern_function" in code

def test_test_code_generation(synthesizer, plugin_requirements):
    """Test test code generation."""
    # Get template
    template = synthesizer._templates["test_template"]
    
    # Generate code
    code = synthesizer._generate_test_code(template, plugin_requirements)
    
    # Check code
    assert code is not None
    assert "import pytest" in code
    assert "from plugins.TestPlugin import TestPlugin" in code
    assert "test_TestPlugin_initialization" in code
    assert "test_TestPlugin_capability1" in code
    assert "test_TestPlugin_capability2" in code

def test_plugin_file_creation(synthesizer, plugin_requirements):
    """Test plugin file creation."""
    # Generate code
    template = synthesizer._templates["test_template"]
    code = synthesizer._generate_plugin_code(template, plugin_requirements)
    
    # Create file
    plugin_path = synthesizer._create_plugin_file(plugin_requirements["name"], code)
    
    # Check file
    assert plugin_path is not None
    assert plugin_path.exists()
    assert plugin_path.name == "TestPlugin.py"
    
    # Check content
    with open(plugin_path) as f:
        content = f.read()
        assert "class TestPlugin" in content

def test_test_file_creation(synthesizer, plugin_requirements):
    """Test test file creation."""
    # Generate code
    template = synthesizer._templates["test_template"]
    code = synthesizer._generate_test_code(template, plugin_requirements)
    
    # Create file
    test_path = synthesizer._create_test_file(plugin_requirements["name"], code)
    
    # Check file
    assert test_path is not None
    assert test_path.exists()
    assert test_path.name == "test_TestPlugin.py"
    
    # Check content
    with open(test_path) as f:
        content = f.read()
        assert "import pytest" in content
        assert "test_TestPlugin_initialization" in content

def test_plugin_synthesis(synthesizer, plugin_requirements):
    """Test complete plugin synthesis."""
    # Synthesize plugin
    plugin = synthesizer.synthesize_plugin(plugin_requirements)
    
    # Check plugin
    assert plugin is not None
    assert plugin.name == "TestPlugin"
    assert plugin.description == "Test plugin for synthesis"
    assert "capability1" in plugin.capabilities
    assert "dependency1" in plugin.dependencies

def test_invalid_synthesis(synthesizer):
    """Test plugin synthesis with invalid requirements."""
    # Test with invalid requirements
    invalid_requirements = {
        "name": "123invalid",
        "description": "Test plugin",
        "capabilities": "not a list"
    }
    
    # Try to synthesize
    plugin = synthesizer.synthesize_plugin(invalid_requirements)
    
    # Check result
    assert plugin is None

def test_pattern_application(synthesizer, plugin_requirements):
    """Test pattern application."""
    # Get template
    template = synthesizer._templates["test_template"]
    
    # Generate code
    code = synthesizer._generate_plugin_code(template, plugin_requirements)
    
    # Apply pattern
    pattern = synthesizer._patterns["test_pattern"]
    modified_code = synthesizer._apply_pattern(code, pattern, plugin_requirements)
    
    # Check code
    assert modified_code is not None
    assert "pattern_function" in modified_code 