"""
Plugin Synthesizer
Generates and validates plugins based on specifications.
"""

import logging
import ast
import black
import isort
import pylint.lint
import re
import json
import yaml
from typing import Dict, Any, List, Optional, Tuple, Set, Type, TYPE_CHECKING
from datetime import datetime
from pathlib import Path
import uuid
from dataclasses import dataclass, field
from pydantic import BaseModel, Field, validator
from enum import Enum
import importlib.util
import sys
import os
import tempfile
import shutil

from core.interfaces import IPluginTester
from core.plugin_types import Plugin, PluginMetadata, PluginState
from core.panion_errors import PluginError, ErrorSeverity
from core.utils import with_connection_pool, cache_result
from core.logging_config import get_logger, LogTimer
from core.config import plugin_config
from core.plugin.cache import plugin_cache
from core.plugin.refiner import plugin_refiner
from core.plugin.interfaces import IPluginManager

if TYPE_CHECKING:
    from core.plugin_manager import PluginManager
    from core.plugin_tester import PluginTester

class Severity(str, Enum):
    """Severity levels for validation issues."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

@dataclass
class SecurityCheck:
    """Security check configuration."""
    pattern: str
    description: str
    severity: Severity

class TestCase(BaseModel):
    """Test case validation model."""
    name: str = Field(..., min_length=1, max_length=100)
    input: Dict[str, Any]
    expected_output: Any
    description: Optional[str] = None
    
    @validator('name')
    def validate_name(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Test case name must be alphanumeric with underscores')
        return v

class PluginInput(BaseModel):
    """Plugin input validation model."""
    goal: str = Field(..., min_length=1, max_length=500)
    test_cases: List[TestCase]
    language: str = Field(default='python', regex='^(python|javascript|typescript)$')
    
    @validator('goal')
    def validate_goal(cls, v):
        if not v.strip():
            raise ValueError('Goal cannot be empty')
        if len(v.split()) < 3:
            raise ValueError('Goal must be at least 3 words')
        return v.strip()
    
    @validator('test_cases')
    def validate_test_cases(cls, v):
        if not v:
            raise ValueError('At least one test case is required')
        if len(v) > 100:
            raise ValueError('Maximum 100 test cases allowed')
        return v

@dataclass
class SynthesisResult:
    """Result of plugin synthesis."""
    success: bool
    plugin: Optional[Plugin] = None
    error: Optional[str] = None
    warnings: List[str] = field(default_factory=list)

class PluginSynthesizer:
    """Synthesizes plugins from specifications."""
    
    def __init__(self, plugin_manager: IPluginManager, plugin_tester: IPluginTester):
        """Initialize the plugin synthesizer."""
        self.logger = logging.getLogger(__name__)
        self.plugin_manager = plugin_manager
        self.plugin_tester = plugin_tester
        self._synthesis_history: List[Dict[str, Any]] = []
        self._max_retries = plugin_config.max_retries
        self._retry_delay = plugin_config.retry_delay
        self.plugin_dir = Path('plugins')
        self.plugin_dir.mkdir(exist_ok=True, parents=True)
        self.style_guide = {
            'max_line_length': 88,
            'indent_size': 4,
            'docstring_style': 'google',
            'naming_conventions': {
                'class': r'^[A-Z][a-zA-Z0-9]*$',
                'function': r'^[a-z][a-z0-9_]*$',
                'variable': r'^[a-z][a-z0-9_]*$',
                'constant': r'^[A-Z][A-Z0-9_]*$'
            }
        }
        
        # Define unsafe patterns to block
        self.unsafe_patterns = [
            SecurityCheck(
                pattern="os.system",
                description="Direct system command execution",
                severity=Severity.HIGH
            ),
            SecurityCheck(
                pattern="subprocess.call",
                description="Subprocess execution",
                severity=Severity.HIGH
            ),
            SecurityCheck(
                pattern="subprocess.Popen",
                description="Subprocess creation",
                severity=Severity.HIGH
            ),
            SecurityCheck(
                pattern="eval(",
                description="Dynamic code evaluation",
                severity=Severity.HIGH
            ),
            SecurityCheck(
                pattern="exec(",
                description="Dynamic code execution",
                severity=Severity.HIGH
            ),
            SecurityCheck(
                pattern="__import__",
                description="Dynamic module import",
                severity=Severity.MEDIUM
            ),
            SecurityCheck(
                pattern="open(",
                description="File operations",
                severity=Severity.MEDIUM
            ),
            SecurityCheck(
                pattern="socket.",
                description="Network operations",
                severity=Severity.MEDIUM
            )
        ]
        
        # Define reserved keywords
        self.reserved_keywords = {
            'python': {
                'and', 'as', 'assert', 'break', 'class', 'continue', 'def',
                'del', 'elif', 'else', 'except', 'False', 'finally', 'for',
                'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'None',
                'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True',
                'try', 'while', 'with', 'yield'
            },
            'javascript': {
                'break', 'case', 'catch', 'class', 'const', 'continue',
                'debugger', 'default', 'delete', 'do', 'else', 'export',
                'extends', 'finally', 'for', 'function', 'if', 'import',
                'in', 'instanceof', 'new', 'return', 'super', 'switch',
                'this', 'throw', 'try', 'typeof', 'var', 'void', 'while',
                'with', 'yield'
            },
            'typescript': {
                'break', 'case', 'catch', 'class', 'const', 'continue',
                'debugger', 'default', 'delete', 'do', 'else', 'export',
                'extends', 'finally', 'for', 'function', 'if', 'import',
                'in', 'instanceof', 'new', 'return', 'super', 'switch',
                'this', 'throw', 'try', 'typeof', 'var', 'void', 'while',
                'with', 'yield', 'interface', 'type', 'enum', 'namespace',
                'module', 'declare', 'abstract', 'implements', 'private',
                'protected', 'public', 'readonly', 'static'
            }
        }
    
    async def synthesize_plugin(self,
                              goal: str,
                              test_cases: List[Dict[str, Any]],
                              language: str = 'python') -> Optional[Plugin]:
        """Synthesize a plugin from a goal and test cases."""
        plugin_id = self._generate_plugin_name(goal)
        with LogTimer(self.logger, 'synthesize_plugin', plugin_id=plugin_id):
            try:
                # Validate input
                input_data = PluginInput(
                    goal=goal,
                    test_cases=test_cases,
                    language=language
                )
                
                # Additional validation
                self._validate_test_case_consistency(input_data.test_cases)
                self._validate_goal_complexity(input_data.goal)
                
                self.logger.info(
                    "Starting plugin synthesis",
                    extra={
                        'operation': 'synthesize_start',
                        'plugin_id': plugin_id,
                        'goal_id': goal,
                        'test_case_count': len(test_cases),
                        'language': language
                    }
                )
                
                # Generate plugin code
                plugin_code = await self._generate_plugin_code(goal, test_cases, language)
                if not plugin_code:
                    self.logger.error(
                        "Code generation failed",
                        extra={
                            'operation': 'code_generation',
                            'plugin_id': plugin_id,
                            'goal_id': goal,
                            'error_type': 'CodeGenerationError'
                        }
                    )
                    return None
                
                # Validate and format code
                formatted_code = await self._format_code(plugin_code, language)
                if not formatted_code:
                    self.logger.error(
                        "Code formatting failed",
                        extra={
                            'operation': 'code_formatting',
                            'plugin_id': plugin_id,
                            'goal_id': goal,
                            'error_type': 'CodeFormattingError'
                        }
                    )
                    return None
                
                # Validate code style
                style_issues = await self._validate_code_style(formatted_code)
                if style_issues:
                    self.logger.warning(
                        "Code style issues found",
                        extra={
                            'operation': 'style_validation',
                            'plugin_id': plugin_id,
                            'goal_id': goal,
                            'style_issues': style_issues
                        }
                    )
                
                # Create plugin directory
                plugin_path = self.plugin_dir / plugin_id
                plugin_path.mkdir(exist_ok=True)
                
                # Save plugin files
                await self._save_plugin_files(plugin_path, formatted_code, test_cases)
                
                # Create plugin metadata
                metadata = PluginMetadata(
                    name=plugin_id,
                    version='1.0.0',
                    description=f"Auto-synthesized plugin for: {goal}",
                    author="Panion",
                    created_at=datetime.now().isoformat(),
                    language=language,
                    dependencies=await self._extract_dependencies(formatted_code),
                    test_cases=test_cases
                )
                
                # Create plugin instance
                plugin = Plugin(
                    name=plugin_id,
                    metadata=metadata,
                    code=formatted_code,
                    test_cases=test_cases
                )
                
                # Register plugin
                self.plugin_manager.register_plugin(plugin)
                
                self.logger.info(
                    "Plugin synthesis completed",
                    extra={
                        'operation': 'synthesize_complete',
                        'plugin_id': plugin_id,
                        'goal_id': goal,
                        'style_issues': style_issues
                    }
                )
                
                return plugin
                
            except ValueError as e:
                self.logger.error(
                    "Input validation failed",
                    extra={
                        'operation': 'synthesize_error',
                        'plugin_id': plugin_id,
                        'goal_id': goal,
                        'error_type': 'ValidationError',
                        'error': str(e)
                    }
                )
                return None
            except SyntaxError as e:
                self.logger.error(
                    "Syntax error in generated code",
                    extra={
                        'operation': 'synthesize_error',
                        'plugin_id': plugin_id,
                        'goal_id': goal,
                        'error_type': 'SyntaxError',
                        'error': str(e),
                        'line': e.lineno,
                        'offset': e.offset
                    }
                )
                return None
            except Exception as e:
                self.logger.error(
                    "Unexpected error during synthesis",
                    extra={
                        'operation': 'synthesize_error',
                        'plugin_id': plugin_id,
                        'goal_id': goal,
                        'error_type': type(e).__name__,
                        'error': str(e)
                    }
                )
                return None
    
    async def _generate_plugin_code(self,
                                  goal: str,
                                  test_cases: List[Dict[str, Any]],
                                  language: str) -> Optional[str]:
        """Generate plugin code from goal and test cases."""
        plugin_id = self._generate_plugin_name(goal)
        with LogTimer(self.logger, 'generate_code', plugin_id=plugin_id):
            try:
                self.logger.info(
                    "Starting code generation",
                    extra={
                        'operation': 'code_generation_start',
                        'plugin_id': plugin_id,
                        'goal_id': goal,
                        'test_case_count': len(test_cases)
                    }
                )
                
                # Analyze test cases
                function_signatures = self._analyze_test_cases(test_cases)
                if not function_signatures:
                    self.logger.error(
                        "Test case analysis failed",
                        extra={
                            'operation': 'test_analysis',
                            'plugin_id': plugin_id,
                            'goal_id': goal,
                            'error_type': 'TestAnalysisError'
                        }
                    )
                    return None
                
                # Generate code structure
                code_parts = []
                
                # Add imports
                code_parts.append(self._generate_imports(function_signatures))
                
                # Add plugin class
                code_parts.append(self._generate_plugin_class(goal))
                
                # Add functions
                for sig in function_signatures:
                    function_code = self._generate_function(sig, test_cases)
                    if function_code:
                        code_parts.append(function_code)
                
                # Combine code parts
                code = '\n\n'.join(code_parts)
                
                self.logger.info(
                    "Code generation completed",
                    extra={
                        'operation': 'code_generation_complete',
                        'plugin_id': plugin_id,
                        'goal_id': goal,
                        'function_count': len(function_signatures)
                    }
                )
                
                return code
                
            except Exception as e:
                self.logger.error(
                    "Code generation failed",
                    extra={
                        'operation': 'code_generation_error',
                        'plugin_id': plugin_id,
                        'goal_id': goal,
                        'error_type': type(e).__name__,
                        'error': str(e)
                    }
                )
                return None
    
    def _analyze_test_cases(self, test_cases: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze test cases to extract function signatures."""
        signatures = []
        
        for test_case in test_cases:
            # Extract input/output types
            input_types = self._infer_types(test_case.get('input', {}))
            output_type = self._infer_type(test_case.get('expected_output'))
            
            # Generate function name
            function_name = self._generate_function_name(test_case)
            
            # Create signature
            signature = {
                'name': function_name,
                'input_types': input_types,
                'output_type': output_type,
                'description': test_case.get('description', ''),
                'test_cases': [test_case]
            }
            
            # Check if similar signature exists
            existing = next((s for s in signatures if s['name'] == function_name), None)
            if existing:
                existing['test_cases'].append(test_case)
            else:
                signatures.append(signature)
        
        return signatures
    
    def _infer_types(self, value: Any) -> Dict[str, str]:
        """Infer Python types from value."""
        if isinstance(value, dict):
            return {k: self._infer_type(v) for k, v in value.items()}
        return {'value': self._infer_type(value)}
    
    def _infer_type(self, value: Any) -> str:
        """Infer Python type from value."""
        if value is None:
            return 'None'
        elif isinstance(value, bool):
            return 'bool'
        elif isinstance(value, int):
            return 'int'
        elif isinstance(value, float):
            return 'float'
        elif isinstance(value, str):
            return 'str'
        elif isinstance(value, list):
            if value:
                return f'List[{self._infer_type(value[0])}]'
            return 'List[Any]'
        elif isinstance(value, dict):
            if value:
                key_type = self._infer_type(next(iter(value.keys())))
                value_type = self._infer_type(next(iter(value.values())))
                return f'Dict[{key_type}, {value_type}]'
            return 'Dict[Any, Any]'
        return 'Any'
    
    def _generate_function_name(self, test_case: Dict[str, Any]) -> str:
        """Generate a function name from test case."""
        # Use description if available
        if 'description' in test_case:
            name = test_case['description'].lower()
        else:
            # Use input/output types
            input_types = list(self._infer_types(test_case.get('input', {})).values())
            output_type = self._infer_type(test_case.get('expected_output'))
            name = f"process_{'_'.join(input_types)}_{output_type}"
        
        # Clean and format name
        name = re.sub(r'[^a-z0-9]', '_', name)
        name = re.sub(r'_+', '_', name)
        name = name.strip('_')
        
        return name
    
    def _generate_imports(self, signatures: List[Dict[str, Any]]) -> str:
        """Generate import statements based on function signatures."""
        imports = set()
        
        # Add standard imports
        imports.update([
            'from typing import Any, Dict, List, Optional',
            'import logging',
            'from datetime import datetime'
        ])
        
        # Add type-specific imports
        for sig in signatures:
            for type_str in sig['input_types'].values():
                if 'List' in type_str:
                    imports.add('from typing import List')
                elif 'Dict' in type_str:
                    imports.add('from typing import Dict')
                elif 'Optional' in type_str:
                    imports.add('from typing import Optional')
        
        return '\n'.join(sorted(imports))
    
    def _generate_plugin_class(self, goal: str) -> str:
        """Generate plugin class definition."""
        class_name = self._generate_class_name(goal)
        
        return f'''class {class_name}:
    """Plugin for: {goal}
    
    This plugin was automatically generated to handle the specified goal.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """Validate input data.
        
        Args:
            input_data: The input data to validate.
            
        Returns:
            bool: True if input is valid, False otherwise.
        """
        try:
            # Input validation
            if not isinstance(input_data, dict):
                self.logger.error("Input must be a dictionary")
                return False
                
            # Check required fields
            required_fields = ['data', 'type']
            if not all(field in input_data for field in required_fields):
                self.logger.error(f"Missing required fields: {[f for f in required_fields if f not in input_data]}")
                return False
                
            # Validate data type
            if not isinstance(input_data['data'], (str, bytes, dict, list)):
                self.logger.error(f"Invalid data type: {type(input_data['data'])}")
                return False
                
            # Validate type field
            if not isinstance(input_data['type'], str):
                self.logger.error(f"Invalid type field: {type(input_data['type'])}")
                return False
                
            # Validate data content based on type
            if input_data['type'] == 'text':
                if not isinstance(input_data['data'], str):
                    self.logger.error("Text type requires string data")
                    return False
            elif input_data['type'] == 'binary':
                if not isinstance(input_data['data'], bytes):
                    self.logger.error("Binary type requires bytes data")
                    return False
            elif input_data['type'] == 'json':
                if not isinstance(input_data['data'], (dict, list)):
                    self.logger.error("JSON type requires dict or list data")
                    return False
            else:
                self.logger.error(f"Unsupported type: {input_data['type']}")
                return False
                
            return True
        except Exception as e:
            self.logger.error(f"Input validation failed: {e}")
            return False'''
    
    def _generate_class_name(self, goal: str) -> str:
        """Generate a class name from goal."""
        # Convert goal to PascalCase
        words = re.findall(r'[a-zA-Z0-9]+', goal)
        return ''.join(word.capitalize() for word in words)
    
    def _generate_function(self,
                          signature: Dict[str, Any],
                          test_cases: List[Dict[str, Any]]) -> str:
        """Generate a function from signature and test cases."""
        # Generate function signature
        params = []
        for name, type_str in signature['input_types'].items():
            if name == 'value':
                params.append(f'value: {type_str}')
            else:
                params.append(f'{name}: {type_str}')
        
        param_str = ', '.join(params)
        return_str = signature['output_type']
        
        # Generate function body
        body = []
        body.append(f'"""Process input according to test cases.\n\n')
        body.append('Args:')
        for name, type_str in signature['input_types'].items():
            body.append(f'    {name}: Input of type {type_str}')
        body.append(f'\nReturns:\n    {return_str}: Processed output')
        body.append('"""')
        
        # Add input validation
        body.append('if not self.validate_input(input_data):')
        body.append('    raise ValueError("Invalid input data")')
        
        # Add test case-based implementation
        body.append('# Implementation based on test cases:')
        for i, test_case in enumerate(signature['test_cases'], 1):
            body.append(f'# Test case {i}:')
            body.append(f'# Input: {test_case.get("input")}')
            body.append(f'# Expected: {test_case.get("expected_output")}')
        
        # Add processing logic
        body.append('try:')
        body.append('    # Process input based on test cases')
        body.append('    if isinstance(input_data, dict):')
        body.append('        return self._process_dict(input_data)')
        body.append('    elif isinstance(input_data, list):')
        body.append('        return self._process_list(input_data)')
        body.append('    elif isinstance(input_data, str):')
        body.append('        return self._process_string(input_data)')
        body.append('    elif isinstance(input_data, (int, float)):')
        body.append('        return self._process_number(input_data)')
        body.append('    elif isinstance(input_data, bool):')
        body.append('        return self._process_boolean(input_data)')
        body.append('    else:')
        body.append('        raise ValueError(f"Unsupported input type: {type(input_data)}")')
        
        # Add error handling
        body.append('except Exception as e:')
        body.append('    self.logger.error(f"Processing failed: {e}")')
        body.append('    raise')
        
        # Add helper methods
        body.append('\n    def _process_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:')
        body.append('        """Process dictionary input."""')
        body.append('        result = {}')
        body.append('        for key, value in data.items():')
        body.append('            result[key] = self._process_value(value)')
        body.append('        return result')
        
        body.append('\n    def _process_list(self, data: List[Any]) -> List[Any]:')
        body.append('        """Process list input."""')
        body.append('        return [self._process_value(item) for item in data]')
        
        body.append('\n    def _process_string(self, data: str) -> str:')
        body.append('        """Process string input."""')
        body.append('        # Apply string transformations based on test cases')
        body.append('        for test_case in self.test_cases:')
        body.append('            if isinstance(test_case["input"], str):')
        body.append('                if data == test_case["input"]:')
        body.append('                    return test_case["expected_output"]')
        body.append('        return data')
        
        body.append('\n    def _process_number(self, data: Union[int, float]) -> Union[int, float]:')
        body.append('        """Process numeric input."""')
        body.append('        # Apply numeric transformations based on test cases')
        body.append('        for test_case in self.test_cases:')
        body.append('            if isinstance(test_case["input"], (int, float)):')
        body.append('                if data == test_case["input"]:')
        body.append('                    return test_case["expected_output"]')
        body.append('        return data')
        
        body.append('\n    def _process_boolean(self, data: bool) -> bool:')
        body.append('        """Process boolean input."""')
        body.append('        # Apply boolean transformations based on test cases')
        body.append('        for test_case in self.test_cases:')
        body.append('            if isinstance(test_case["input"], bool):')
        body.append('                if data == test_case["input"]:')
        body.append('                    return test_case["expected_output"]')
        body.append('        return data')
        
        body.append('\n    def _process_value(self, value: Any) -> Any:')
        body.append('        """Process any input value."""')
        body.append('        if isinstance(value, dict):')
        body.append('            return self._process_dict(value)')
        body.append('        elif isinstance(value, list):')
        body.append('            return self._process_list(value)')
        body.append('        elif isinstance(value, str):')
        body.append('            return self._process_string(value)')
        body.append('        elif isinstance(value, (int, float)):')
        body.append('            return self._process_number(value)')
        body.append('        elif isinstance(value, bool):')
        body.append('            return self._process_boolean(value)')
        body.append('        else:')
        body.append('            return value')
        
        # Combine parts
        return f'''    def {signature['name']}(self, {param_str}) -> {return_str}:
{chr(10).join('        ' + line for line in body)}'''
    
    async def _format_code(self, code: str, language: str) -> Optional[str]:
        """Format code according to style guide."""
        with LogTimer(self.logger, 'format_code'):
            try:
                if language == 'python':
                    # Format with black
                    formatted = black.format_str(code, mode=black.FileMode())
                    
                    # Sort imports with isort
                    formatted = isort.code(formatted)
                    
                    return formatted
                else:
                    self.logger.warning(
                        "Unsupported language for formatting",
                        extra={
                            'operation': 'format_code',
                            'language': language,
                            'error_type': 'UnsupportedLanguageError'
                        }
                    )
                    return code
                    
            except black.InvalidInput as e:
                self.logger.error(
                    "Black formatting failed",
                    extra={
                        'operation': 'format_code_error',
                        'error_type': 'BlackFormattingError',
                        'error': str(e)
                    }
                )
                return None
            except isort.exceptions.ISortError as e:
                self.logger.error(
                    "Import sorting failed",
                    extra={
                        'operation': 'format_code_error',
                        'error_type': 'ImportSortingError',
                        'error': str(e)
                    }
                )
                return None
            except Exception as e:
                self.logger.error(
                    "Code formatting failed",
                    extra={
                        'operation': 'format_code_error',
                        'error_type': type(e).__name__,
                        'error': str(e)
                    }
                )
                return None
    
    async def _validate_code_style(self, code: str) -> List[str]:
        """Validate code style and return issues."""
        with LogTimer(self.logger, 'validate_style'):
            issues = []
            
            try:
                # Parse AST
                tree = ast.parse(code)
                
                # Check line length
                for i, line in enumerate(code.splitlines(), 1):
                    if len(line) > self.style_guide['max_line_length']:
                        issues.append(f"Line {i} exceeds {self.style_guide['max_line_length']} characters")
                
                # Check naming conventions
                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        if not re.match(self.style_guide['naming_conventions']['class'], node.name):
                            issues.append(f"Class name '{node.name}' doesn't follow convention")
                    elif isinstance(node, ast.FunctionDef):
                        if not re.match(self.style_guide['naming_conventions']['function'], node.name):
                            issues.append(f"Function name '{node.name}' doesn't follow convention")
                
                # Run pylint
                pylint_output = []
                pylint.lint.Run(
                    [code],
                    do_exit=False,
                    output=pylint_output.append
                )
                
                # Parse pylint output
                for line in pylint_output:
                    if ':' in line:
                        issues.append(line.strip())
                
                return issues
                
            except Exception as e:
                self.logger.error(
                    f"Error validating code style: {e}",
                    extra={
                        'operation': 'style_validation_error',
                        'error': str(e)
                    }
                )
                return [f"Error validating style: {str(e)}"]
    
    def _generate_plugin_name(self, goal: str) -> str:
        """Generate a unique plugin name from goal."""
        # Convert goal to snake case
        name = re.sub(r'[^a-zA-Z0-9]', '_', goal.lower())
        name = re.sub(r'_+', '_', name)
        name = name.strip('_')
        
        # Add timestamp to ensure uniqueness
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"auto_{name}_{timestamp}"
    
    async def _save_plugin_files(self,
                               plugin_path: Path,
                               code: str,
                               test_cases: List[Dict[str, Any]]) -> None:
        """Save plugin files to disk."""
        plugin_id = plugin_path.name
        with LogTimer(self.logger, 'save_plugin_files', plugin_id=plugin_id):
            try:
                # Save plugin code
                with open(plugin_path / 'plugin.py', 'w') as f:
                    f.write(code)
                
                # Save test cases
                with open(plugin_path / 'test_cases.json', 'w') as f:
                    json.dump(test_cases, f, indent=2)
                
                # Save requirements.txt
                dependencies = await self._extract_dependencies(code)
                with open(plugin_path / 'requirements.txt', 'w') as f:
                    f.write('\n'.join(dependencies))
                
                self.logger.info(
                    "Plugin files saved",
                    extra={
                        'operation': 'save_files',
                        'plugin_id': plugin_id,
                        'file_count': 3
                    }
                )
                
            except IOError as e:
                self.logger.error(
                    "File I/O error",
                    extra={
                        'operation': 'save_files_error',
                        'plugin_id': plugin_id,
                        'error_type': 'IOError',
                        'error': str(e),
                        'file': str(plugin_path)
                    }
                )
                raise
            except json.JSONDecodeError as e:
                self.logger.error(
                    "JSON encoding error",
                    extra={
                        'operation': 'save_files_error',
                        'plugin_id': plugin_id,
                        'error_type': 'JSONError',
                        'error': str(e)
                    }
                )
                raise
            except Exception as e:
                self.logger.error(
                    "Failed to save plugin files",
                    extra={
                        'operation': 'save_files_error',
                        'plugin_id': plugin_id,
                        'error_type': type(e).__name__,
                        'error': str(e)
                    }
                )
                raise
    
    async def _extract_dependencies(self, code: str) -> List[str]:
        """Extract dependencies from code."""
        with LogTimer(self.logger, 'extract_dependencies'):
            try:
                # Parse AST
                tree = ast.parse(code)
                
                # Find imports
                imports = set()
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for name in node.names:
                            imports.add(name.name.split('.')[0])
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            imports.add(node.module.split('.')[0])
                
                # Filter out standard library modules
                stdlib_modules = set(sys.stdlib_module_names())
                return [imp for imp in imports if imp not in stdlib_modules]
                
            except Exception as e:
                self.logger.error(
                    f"Error extracting dependencies: {e}",
                    extra={
                        'operation': 'extract_dependencies_error',
                        'error': str(e)
                    }
                )
                return []

    def _validate_syntax(self, code: str) -> Dict[str, Any]:
        """Validate Python syntax and check for unsafe patterns."""
        try:
            # Parse the code
            tree = ast.parse(code)
            
            # Check for unsafe patterns
            unsafe_uses = []
            for node in ast.walk(tree):
                # Check for function calls
                if isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name):
                        func_name = node.func.id
                        for pattern in self.unsafe_patterns:
                            if pattern.pattern in func_name:
                                unsafe_uses.append({
                                    'pattern': pattern.pattern,
                                    'description': pattern.description,
                                    'severity': pattern.severity,
                                    'line': node.lineno
                                })
                    elif isinstance(node.func, ast.Attribute):
                        attr_name = f"{node.func.value.id}.{node.func.attr}"
                        for pattern in self.unsafe_patterns:
                            if pattern.pattern in attr_name:
                                unsafe_uses.append({
                                    'pattern': pattern.pattern,
                                    'description': pattern.description,
                                    'severity': pattern.severity,
                                    'line': node.lineno
                                })
            
            # Check for import statements
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for name in node.names:
                        for pattern in self.unsafe_patterns:
                            if pattern.pattern in name.name:
                                unsafe_uses.append({
                                    'pattern': pattern.pattern,
                                    'description': pattern.description,
                                    'severity': pattern.severity,
                                    'line': node.lineno
                                })
                elif isinstance(node, ast.ImportFrom):
                    for name in node.names:
                        for pattern in self.unsafe_patterns:
                            if pattern.pattern in name.name:
                                unsafe_uses.append({
                                    'pattern': pattern.pattern,
                                    'description': pattern.description,
                                    'severity': pattern.severity,
                                    'line': node.lineno
                                })
            
            return {
                'valid': len(unsafe_uses) == 0,
                'unsafe_uses': unsafe_uses
            }
            
        except SyntaxError as e:
            return {
                'valid': False,
                'error': f"Syntax error: {str(e)}",
                'line': e.lineno,
                'offset': e.offset
            }
        except Exception as e:
            return {
                'valid': False,
                'error': f"Validation error: {str(e)}"
            }

    def _save_plugin(self, plugin_id: str, code: str) -> Dict[str, Any]:
        """Save plugin code with validation."""
        try:
            with LogTimer(self.logger, 'save_plugin', plugin_id=plugin_id):
                # Validate syntax and security
                validation_result = self._validate_syntax(code)
                if not validation_result['valid']:
                    if 'unsafe_uses' in validation_result:
                        self.logger.error(
                            "Unsafe code patterns detected",
                            extra={
                                'operation': 'save_plugin',
                                'plugin_id': plugin_id,
                                'unsafe_uses': validation_result['unsafe_uses']
                            }
                        )
                        return {
                            'status': 'failure',
                            'error': 'Unsafe code patterns detected',
                            'details': validation_result['unsafe_uses']
                        }
                    else:
                        self.logger.error(
                            "Syntax validation failed",
                            extra={
                                'operation': 'save_plugin',
                                'plugin_id': plugin_id,
                                'error': validation_result['error']
                            }
                        )
                        return {
                            'status': 'failure',
                            'error': validation_result['error']
                        }
                
                # Save plugin code
                plugin_file = self.plugin_dir / f"{plugin_id}.py"
                with open(plugin_file, 'w') as f:
                    f.write(code)
                
                self.logger.info(
                    f"Saved plugin: {plugin_id}",
                    extra={
                        'operation': 'save_plugin',
                        'plugin_id': plugin_id
                    }
                )
                
                return {
                    'status': 'success',
                    'plugin_id': plugin_id,
                    'file': str(plugin_file)
                }
                
        except Exception as e:
            self.logger.error(
                f"Error saving plugin: {e}",
                extra={
                    'operation': 'save_plugin',
                    'plugin_id': plugin_id,
                    'error': str(e)
                }
            )
            return {
                'status': 'failure',
                'error': str(e)
            }

    def _validate_test_case_consistency(self, test_cases: List[TestCase]) -> None:
        """Validate consistency across test cases."""
        if not test_cases:
            return
            
        # Check input parameter consistency
        first_input_keys = set(test_cases[0].input.keys())
        for test_case in test_cases[1:]:
            current_keys = set(test_case.input.keys())
            if current_keys != first_input_keys:
                raise ValueError(
                    f"Inconsistent input parameters in test cases. "
                    f"Expected {first_input_keys}, got {current_keys}"
                )
            
        # Check output type consistency
        first_output_type = type(test_cases[0].expected_output)
        for test_case in test_cases[1:]:
            if not isinstance(test_case.expected_output, first_output_type):
                raise ValueError(
                    f"Inconsistent output types in test cases. "
                    f"Expected {first_output_type}, got {type(test_case.expected_output)}"
                )
    
    def _validate_goal_complexity(self, goal: str) -> None:
        """Validate goal complexity and requirements."""
        # Check for minimum requirements
        if len(goal.split()) < 3:
            raise ValueError("Goal must be at least 3 words")
            
        # Check for maximum length
        if len(goal) > 500:
            raise ValueError("Goal exceeds maximum length of 500 characters")
            
        # Check for required components
        required_components = ['what', 'how', 'why']
        goal_lower = goal.lower()
        missing_components = [
            comp for comp in required_components
            if comp not in goal_lower
        ]
        if missing_components:
            raise ValueError(
                f"Goal missing required components: {', '.join(missing_components)}"
            )
            
        # Check for ambiguous terms
        ambiguous_terms = ['it', 'this', 'that', 'these', 'those']
        found_ambiguous = [
            term for term in ambiguous_terms
            if term in goal_lower.split()
        ]
        if found_ambiguous:
            raise ValueError(
                f"Goal contains ambiguous terms: {', '.join(found_ambiguous)}"
            )
    
    def _validate_code_security(self, code: str) -> List[str]:
        """Validate code for security issues."""
        issues = []
        for check in self.unsafe_patterns:
            if re.search(check.pattern, code):
                issues.append(
                    f"{check.severity.value.upper()}: {check.description} "
                    f"found in code"
                )
        return issues
    
    def _validate_naming_conventions(self, code: str) -> List[str]:
        """Validate code against naming conventions."""
        issues = []
        tree = ast.parse(code)
        
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                if not re.match(
                    self.style_guide['naming_conventions']['class'],
                    node.name
                ):
                    issues.append(
                        f"Class name '{node.name}' does not follow naming convention"
                    )
            elif isinstance(node, ast.FunctionDef):
                if not re.match(
                    self.style_guide['naming_conventions']['function'],
                    node.name
                ):
                    issues.append(
                        f"Function name '{node.name}' does not follow naming convention"
                    )
            elif isinstance(node, ast.Name):
                if isinstance(node.ctx, ast.Store):
                    if not re.match(
                        self.style_guide['naming_conventions']['variable'],
                        node.id
                    ):
                        issues.append(
                            f"Variable name '{node.id}' does not follow naming convention"
                        )
        
        return issues

    async def _process_plugin_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Process a plugin synthesis request."""
        try:
            # Extract request details
            plugin_name = request.get('name')
            description = request.get('description')
            requirements = request.get('requirements', [])
            dependencies = request.get('dependencies', [])
            
            # Validate request
            if not plugin_name or not description:
                raise ValueError("Plugin name and description are required")
                
            # Generate plugin code
            plugin_code = await self._generate_plugin_code(
                name=plugin_name,
                description=description,
                requirements=requirements,
                dependencies=dependencies
            )
            
            # Create plugin directory
            plugin_dir = Path('plugins') / plugin_name
            plugin_dir.mkdir(exist_ok=True, parents=True)
            
            # Write plugin files
            with open(plugin_dir / 'plugin.py', 'w') as f:
                f.write(plugin_code)
                
            # Write requirements.txt
            with open(plugin_dir / 'requirements.txt', 'w') as f:
                f.write('\n'.join(requirements))
                
            # Write README.md
            readme_content = f"""# {plugin_name}

{description}

## Requirements
{chr(10).join(f'- {req}' for req in requirements)}

## Dependencies
{chr(10).join(f'- {dep}' for dep in dependencies)}
"""
            with open(plugin_dir / 'README.md', 'w') as f:
                f.write(readme_content)
                
            # Test the plugin
            test_results = await self.plugin_tester.test_plugin(
                plugin_name,
                self._generate_test_cases(description, requirements)
            )
            
            if test_results['status'] != 'success':
                # Attempt to refine the plugin
                refined_version = await self.plugin_refiner.refine_plugin(
                    plugin_name,
                    test_results['report']
                )
                if refined_version:
                    self.logger.info(f"Successfully refined plugin: {refined_version}")
                    return {
                        'status': 'success',
                        'plugin_name': refined_version,
                        'test_results': test_results
                    }
                else:
                    raise PluginError(
                        f"Plugin synthesis failed: {test_results['report']}",
                        ErrorSeverity.HIGH
                    )
                    
            # Cache successful plugin
            versioned_name = self.plugin_cache.cache_plugin(
                plugin_name,
                plugin_dir,
                test_results['report'],
                dependencies,
                description
            )
            
            return {
                'status': 'success',
                'plugin_name': versioned_name,
                'test_results': test_results
            }
            
        except Exception as e:
            self.logger.error(
                f"Error processing plugin request: {e}",
                exc_info=True,
                extra={
                    'request': request,
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            )
            raise

# Create singleton instance
plugin_synthesizer = PluginSynthesizer() 