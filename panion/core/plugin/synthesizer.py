"""
Plugin Synthesizer
Generates new plugins based on requirements and patterns.
"""

import ast
import logging
import os
from pathlib import Path
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
import json
import re
from datetime import datetime

from .base import BasePlugin, PluginMetadata
from ..error_handling import error_handler, with_error_recovery
from ..shared_state import shared_state

@dataclass
class PluginTemplate:
    """Template for plugin generation."""
    name: str
    description: str
    required_capabilities: Set[str] = field(default_factory=set)
    required_dependencies: Set[str] = field(default_factory=set)
    code_template: str = ""
    test_template: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

class PluginSynthesizer:
    """Generates new plugins based on requirements and patterns."""
    
    def __init__(self):
        """Initialize plugin synthesizer."""
        self.logger = logging.getLogger("PluginSynthesizer")
        self._setup_logging()
        
        # Template registry
        self._templates: Dict[str, PluginTemplate] = {}
        
        # Pattern registry
        self._patterns: Dict[str, str] = {}
        
        # Initialize synthesizer
        self._load_templates()
        self._load_patterns()
        
        # Register with shared state
        shared_state.register_component("plugin_synthesizer", self)
    
    def _setup_logging(self) -> None:
        """Setup synthesizer logging."""
        log_file = Path("logs") / "plugin_synthesizer.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    def _load_templates(self) -> None:
        """Load plugin templates."""
        try:
            template_dir = Path("templates") / "plugins"
            if not template_dir.exists():
                template_dir.mkdir(parents=True)
                return
            
            for template_file in template_dir.glob("*.json"):
                with open(template_file) as f:
                    template_data = json.load(f)
                    
                template = PluginTemplate(
                    name=template_data["name"],
                    description=template_data["description"],
                    required_capabilities=set(template_data.get("required_capabilities", [])),
                    required_dependencies=set(template_data.get("required_dependencies", [])),
                    code_template=template_data.get("code_template", ""),
                    test_template=template_data.get("test_template", ""),
                    metadata=template_data.get("metadata", {})
                )
                
                self._templates[template.name] = template
                
        except Exception as e:
            self.logger.error(f"Failed to load templates: {str(e)}")
            raise
    
    def _load_patterns(self) -> None:
        """Load code patterns."""
        try:
            pattern_dir = Path("patterns") / "plugins"
            if not pattern_dir.exists():
                pattern_dir.mkdir(parents=True)
                return
            
            for pattern_file in pattern_dir.glob("*.py"):
                with open(pattern_file) as f:
                    pattern_name = pattern_file.stem
                    self._patterns[pattern_name] = f.read()
                    
        except Exception as e:
            self.logger.error(f"Failed to load patterns: {str(e)}")
            raise
    
    @with_error_recovery
    def synthesize_plugin(self, requirements: Dict[str, Any]) -> Optional[BasePlugin]:
        """Synthesize a new plugin based on requirements.
        
        Args:
            requirements: Plugin requirements
            
        Returns:
            Optional[BasePlugin]: Generated plugin if successful
        """
        try:
            # Validate requirements
            if not self._validate_requirements(requirements):
                return None
            
            # Find matching template
            template = self._find_matching_template(requirements)
            if not template:
                self.logger.error("No matching template found")
                return None
            
            # Generate plugin code
            plugin_code = self._generate_plugin_code(template, requirements)
            if not plugin_code:
                return None
            
            # Generate test code
            test_code = self._generate_test_code(template, requirements)
            
            # Create plugin file
            plugin_path = self._create_plugin_file(requirements["name"], plugin_code)
            if not plugin_path:
                return None
            
            # Create test file
            if test_code:
                self._create_test_file(requirements["name"], test_code)
            
            # Create plugin instance
            plugin = self._create_plugin_instance(plugin_path, requirements)
            
            return plugin
            
        except Exception as e:
            self.logger.error(f"Failed to synthesize plugin: {str(e)}")
            return None
    
    def _validate_requirements(self, requirements: Dict[str, Any]) -> bool:
        """Validate plugin requirements.
        
        Args:
            requirements: Plugin requirements
            
        Returns:
            bool: True if valid
        """
        try:
            # Check required fields
            required_fields = {"name", "description", "capabilities"}
            if not all(field in requirements for field in required_fields):
                self.logger.error("Missing required fields in requirements")
                return False
            
            # Validate name
            if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", requirements["name"]):
                self.logger.error("Invalid plugin name")
                return False
            
            # Validate capabilities
            if not isinstance(requirements["capabilities"], (list, set)):
                self.logger.error("Invalid capabilities format")
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to validate requirements: {str(e)}")
            return False
    
    def _find_matching_template(self, requirements: Dict[str, Any]) -> Optional[PluginTemplate]:
        """Find matching template for requirements.
        
        Args:
            requirements: Plugin requirements
            
        Returns:
            Optional[PluginTemplate]: Matching template if found
        """
        try:
            best_match = None
            best_score = 0
            
            for template in self._templates.values():
                # Calculate match score
                score = 0
                
                # Check capabilities
                required_capabilities = set(requirements["capabilities"])
                matching_capabilities = len(
                    required_capabilities.intersection(template.required_capabilities)
                )
                score += matching_capabilities * 2
                
                # Check dependencies
                if "dependencies" in requirements:
                    required_dependencies = set(requirements["dependencies"])
                    matching_dependencies = len(
                        required_dependencies.intersection(template.required_dependencies)
                    )
                    score += matching_dependencies
                
                # Update best match
                if score > best_score:
                    best_score = score
                    best_match = template
            
            return best_match
            
        except Exception as e:
            self.logger.error(f"Failed to find matching template: {str(e)}")
            return None
    
    def _generate_plugin_code(self, template: PluginTemplate, requirements: Dict[str, Any]) -> Optional[str]:
        """Generate plugin code from template.
        
        Args:
            template: Plugin template
            requirements: Plugin requirements
            
        Returns:
            Optional[str]: Generated code if successful
        """
        try:
            # Get template code
            code = template.code_template
            
            # Replace placeholders
            replacements = {
                "{{name}}": requirements["name"],
                "{{description}}": requirements["description"],
                "{{capabilities}}": str(requirements["capabilities"]),
                "{{dependencies}}": str(requirements.get("dependencies", [])),
                "{{author}}": requirements.get("author", "Plugin Synthesizer"),
                "{{version}}": requirements.get("version", "0.1.0"),
                "{{date}}": datetime.now().strftime("%Y-%m-%d")
            }
            
            for placeholder, value in replacements.items():
                code = code.replace(placeholder, value)
            
            # Apply patterns
            for pattern_name, pattern_code in self._patterns.items():
                if pattern_name in requirements.get("patterns", []):
                    code = self._apply_pattern(code, pattern_code, requirements)
            
            return code
            
        except Exception as e:
            self.logger.error(f"Failed to generate plugin code: {str(e)}")
            return None
    
    def _generate_test_code(self, template: PluginTemplate, requirements: Dict[str, Any]) -> Optional[str]:
        """Generate test code from template.
        
        Args:
            template: Plugin template
            requirements: Plugin requirements
            
        Returns:
            Optional[str]: Generated test code if successful
        """
        try:
            if not template.test_template:
                return None
            
            # Get template code
            code = template.test_template
            
            # Replace placeholders
            replacements = {
                "{{name}}": requirements["name"],
                "{{test_cases}}": self._generate_test_cases(requirements)
            }
            
            for placeholder, value in replacements.items():
                code = code.replace(placeholder, value)
            
            return code
            
        except Exception as e:
            self.logger.error(f"Failed to generate test code: {str(e)}")
            return None
    
    def _generate_test_cases(self, requirements: Dict[str, Any]) -> str:
        """Generate test cases for plugin.
        
        Args:
            requirements: Plugin requirements
            
        Returns:
            str: Generated test cases
        """
        try:
            test_cases = []
            
            # Generate basic test cases
            test_cases.append(f"""
def test_{requirements['name']}_initialization():
    \"\"\"Test plugin initialization.\"\"\"
    plugin = {requirements['name']}()
    assert plugin is not None
    assert plugin.name == "{requirements['name']}"
    assert plugin.description == "{requirements['description']}"
""")
            
            # Generate capability test cases
            for capability in requirements["capabilities"]:
                test_cases.append(f"""
def test_{requirements['name']}_{capability}():
    \"\"\"Test {capability} capability.\"\"\"
    plugin = {requirements['name']}()
    # TODO: Implement {capability} test
    assert True
""")
            
            return "\n".join(test_cases)
            
        except Exception as e:
            self.logger.error(f"Failed to generate test cases: {str(e)}")
            return ""
    
    def _create_plugin_file(self, name: str, code: str) -> Optional[Path]:
        """Create plugin file.
        
        Args:
            name: Plugin name
            code: Plugin code
            
        Returns:
            Optional[Path]: Plugin file path if successful
        """
        try:
            # Create plugin directory
            plugin_dir = Path("plugins") / name
            plugin_dir.mkdir(parents=True, exist_ok=True)
            
            # Create plugin file
            plugin_file = plugin_dir / f"{name}.py"
            with open(plugin_file, "w") as f:
                f.write(code)
            
            return plugin_file
            
        except Exception as e:
            self.logger.error(f"Failed to create plugin file: {str(e)}")
            return None
    
    def _create_test_file(self, name: str, code: str) -> Optional[Path]:
        """Create test file.
        
        Args:
            name: Plugin name
            code: Test code
            
        Returns:
            Optional[Path]: Test file path if successful
        """
        try:
            # Create test directory
            test_dir = Path("tests") / "plugins"
            test_dir.mkdir(parents=True, exist_ok=True)
            
            # Create test file
            test_file = test_dir / f"test_{name}.py"
            with open(test_file, "w") as f:
                f.write(code)
            
            return test_file
            
        except Exception as e:
            self.logger.error(f"Failed to create test file: {str(e)}")
            return None
    
    def _create_plugin_instance(self, plugin_path: Path, requirements: Dict[str, Any]) -> Optional[BasePlugin]:
        """Create plugin instance.
        
        Args:
            plugin_path: Plugin file path
            requirements: Plugin requirements
            
        Returns:
            Optional[BasePlugin]: Plugin instance if successful
        """
        try:
            # Import plugin module
            module_name = f"plugins.{plugin_path.stem}"
            plugin_module = __import__(module_name, fromlist=[requirements["name"]])
            
            # Create plugin class
            plugin_class = getattr(plugin_module, requirements["name"])
            
            # Create plugin instance
            plugin = plugin_class()
            
            # Initialize plugin
            plugin.initialize()
            
            return plugin
            
        except Exception as e:
            self.logger.error(f"Failed to create plugin instance: {str(e)}")
            return None
    
    def _apply_pattern(self, code: str, pattern: str, requirements: Dict[str, Any]) -> str:
        """Apply code pattern.
        
        Args:
            code: Plugin code
            pattern: Pattern code
            requirements: Plugin requirements
            
        Returns:
            str: Modified code
        """
        try:
            # Parse pattern
            pattern_tree = ast.parse(pattern)
            
            # Find pattern insertion point
            code_tree = ast.parse(code)
            
            # Apply pattern
            for node in ast.walk(pattern_tree):
                if isinstance(node, ast.ClassDef):
                    # Add pattern class
                    code_tree.body.append(node)
                elif isinstance(node, ast.FunctionDef):
                    # Add pattern function
                    code_tree.body.append(node)
            
            # Convert back to code
            return ast.unparse(code_tree)
            
        except Exception as e:
            self.logger.error(f"Failed to apply pattern: {str(e)}")
            return code

# Create global plugin synthesizer instance
plugin_synthesizer = PluginSynthesizer() 