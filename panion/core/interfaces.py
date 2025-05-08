"""
Core Interfaces
Defines interfaces for core system components.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Set, Type, TYPE_CHECKING, Protocol, runtime_checkable, Callable
from datetime import datetime
from pathlib import Path
from enum import Enum
from core.plugin.types import Plugin, PluginMetadata, PluginState
import logging
import asyncio
from core.exceptions import PluginError, PluginErrorType
import time
import inspect
import types
import json
import re

if TYPE_CHECKING:
    from core.base import BaseComponent, ComponentMetadata, ComponentState

@runtime_checkable
class IPluginManager(Protocol):
    """Interface for plugin management."""
    
    def __init__(self):
        """Initialize plugin manager."""
        self._plugins: Dict[str, Any] = {}
        self._plugin_states: Dict[str, PluginState] = {}
        self._plugin_metadata: Dict[str, PluginMetadata] = {}
        self._plugin_dependencies: Dict[str, Set[str]] = {}
        self._logger = logging.getLogger("plugin_manager")
    
    async def register_plugin(self, plugin: Any) -> None:
        """Register a new plugin.
        
        Args:
            plugin: The plugin instance to register
            
        Raises:
            ValueError: If plugin with same name already exists
            PluginError: If plugin registration fails
        """
        try:
            if not hasattr(plugin, "name"):
                raise ValueError("Plugin must have a name attribute")
                
            if plugin.name in self._plugins:
                raise ValueError(f"Plugin {plugin.name} already registered")
                
            # Store plugin instance
            self._plugins[plugin.name] = plugin
            
            # Initialize plugin state
            self._plugin_states[plugin.name] = PluginState.INITIALIZING
            
            # Store plugin metadata
            self._plugin_metadata[plugin.name] = PluginMetadata(
                name=plugin.name,
                version=getattr(plugin, "version", "0.1.0"),
                description=getattr(plugin, "description", ""),
                author=getattr(plugin, "author", "Unknown"),
                created_at=datetime.now().isoformat(),
                last_updated=datetime.now().isoformat()
            )
            
            # Store plugin dependencies
            self._plugin_dependencies[plugin.name] = set(getattr(plugin, "dependencies", []))
            
            self._logger.info(f"Registered plugin: {plugin.name}")
            
        except Exception as e:
            self._logger.error(f"Failed to register plugin: {str(e)}")
            raise PluginError(f"Plugin registration failed: {str(e)}", PluginErrorType.REGISTRATION_ERROR)
    
    async def unregister_plugin(self, plugin_name: str) -> None:
        """Unregister a plugin.
        
        Args:
            plugin_name: Name of the plugin to unregister
            
        Raises:
            ValueError: If plugin not found
            PluginError: If plugin unregistration fails
        """
        try:
            if plugin_name not in self._plugins:
                raise ValueError(f"Plugin {plugin_name} not found")
                
            # Check if other plugins depend on this one
            for name, deps in self._plugin_dependencies.items():
                if plugin_name in deps:
                    raise PluginError(
                        f"Cannot unregister {plugin_name} - required by {name}",
                        PluginErrorType.DEPENDENCY_ERROR
                    )
            
            # Cleanup plugin
            plugin = self._plugins[plugin_name]
            if hasattr(plugin, "cleanup"):
                await plugin.cleanup()
            
            # Remove plugin data
            del self._plugins[plugin_name]
            del self._plugin_states[plugin_name]
            del self._plugin_metadata[plugin_name]
            del self._plugin_dependencies[plugin_name]
            
            self._logger.info(f"Unregistered plugin: {plugin_name}")
            
        except Exception as e:
            self._logger.error(f"Failed to unregister plugin {plugin_name}: {str(e)}")
            raise PluginError(f"Plugin unregistration failed: {str(e)}", PluginErrorType.UNREGISTRATION_ERROR)
    
    async def get_plugin(self, plugin_name: str) -> Optional[Any]:
        """Get a plugin by name.
        
        Args:
            plugin_name: Name of the plugin to get
            
        Returns:
            Optional[Any]: The plugin instance if found, None otherwise
        """
        return self._plugins.get(plugin_name)
    
    async def list_plugins(self) -> List[str]:
        """List all registered plugins.
        
        Returns:
            List[str]: List of registered plugin names
        """
        return list(self._plugins.keys())

@runtime_checkable
class IDependencyManager(Protocol):
    """Interface for dependency management."""
    
    def __init__(self):
        """Initialize dependency manager."""
        self._dependencies: Dict[str, Dict[str, Any]] = {}
        self._installed: Set[str] = set()
        self._logger = logging.getLogger("dependency_manager")
    
    async def resolve_dependencies(self, plugin_name: str) -> List[str]:
        """Resolve dependencies for a plugin.
        
        Args:
            plugin_name: Name of the plugin to resolve dependencies for
            
        Returns:
            List[str]: List of resolved dependency names
            
        Raises:
            ValueError: If plugin not found
            PluginError: If dependency resolution fails
        """
        try:
            if plugin_name not in self._dependencies:
                raise ValueError(f"Plugin {plugin_name} not found")
                
            resolved = set()
            to_resolve = set(self._dependencies[plugin_name].keys())
            
            while to_resolve:
                dep = to_resolve.pop()
                if dep in resolved:
                    continue
                    
                # Get dependency info
                dep_info = self._dependencies[plugin_name][dep]
                
                # Check if dependency has sub-dependencies
                if "dependencies" in dep_info:
                    to_resolve.update(dep_info["dependencies"])
                
                resolved.add(dep)
            
            return list(resolved)
            
        except Exception as e:
            self._logger.error(f"Failed to resolve dependencies for {plugin_name}: {str(e)}")
            raise PluginError(f"Dependency resolution failed: {str(e)}", PluginErrorType.DEPENDENCY_ERROR)
    
    async def install_dependencies(self, dependencies: List[str]) -> bool:
        """Install plugin dependencies.
        
        Args:
            dependencies: List of dependency names to install
            
        Returns:
            bool: True if all dependencies were installed successfully
            
        Raises:
            PluginError: If dependency installation fails
        """
        try:
            for dep in dependencies:
                if dep in self._installed:
                    continue
                    
                # Get dependency info
                dep_info = None
                for plugin_deps in self._dependencies.values():
                    if dep in plugin_deps:
                        dep_info = plugin_deps[dep]
                        break
                
                if not dep_info:
                    raise PluginError(f"Dependency {dep} not found", PluginErrorType.DEPENDENCY_ERROR)
                
                # Install dependency
                if "install_command" in dep_info:
                    # Execute install command
                    process = await asyncio.create_subprocess_shell(
                        dep_info["install_command"],
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    stdout, stderr = await process.communicate()
                    
                    if process.returncode != 0:
                        raise PluginError(
                            f"Failed to install {dep}: {stderr.decode()}",
                            PluginErrorType.INSTALLATION_ERROR
                        )
                
                self._installed.add(dep)
                self._logger.info(f"Installed dependency: {dep}")
            
            return True
            
        except Exception as e:
            self._logger.error(f"Failed to install dependencies: {str(e)}")
            raise PluginError(f"Dependency installation failed: {str(e)}", PluginErrorType.INSTALLATION_ERROR)
    
    async def check_dependencies(self, plugin_name: str) -> Dict[str, bool]:
        """Check if plugin dependencies are satisfied.
        
        Args:
            plugin_name: Name of the plugin to check dependencies for
            
        Returns:
            Dict[str, bool]: Dictionary mapping dependency names to their satisfaction status
            
        Raises:
            ValueError: If plugin not found
            PluginError: If dependency check fails
        """
        try:
            if plugin_name not in self._dependencies:
                raise ValueError(f"Plugin {plugin_name} not found")
                
            status = {}
            for dep, info in self._dependencies[plugin_name].items():
                if dep in self._installed:
                    status[dep] = True
                    continue
                
                # Check if dependency is available
                if "check_command" in info:
                    process = await asyncio.create_subprocess_shell(
                        info["check_command"],
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    await process.communicate()
                    status[dep] = process.returncode == 0
                else:
                    status[dep] = False
            
            return status
            
        except Exception as e:
            self._logger.error(f"Failed to check dependencies for {plugin_name}: {str(e)}")
            raise PluginError(f"Dependency check failed: {str(e)}", PluginErrorType.DEPENDENCY_ERROR)

@runtime_checkable
class IPluginTester(Protocol):
    """Interface for plugin testing."""
    
    def __init__(self):
        """Initialize plugin tester."""
        self._test_results: Dict[str, Dict[str, Any]] = {}
        self._validation_results: Dict[str, bool] = {}
        self._test_metrics: Dict[str, Dict[str, Any]] = {}
        self._logger = logging.getLogger("plugin_tester")
    
    async def test_plugin(self, plugin_name: str, test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Test a plugin with given test cases.
        
        Args:
            plugin_name: Name of the plugin to test
            test_cases: List of test cases to run
            
        Returns:
            Dict[str, Any]: Test results including pass/fail status and metrics
            
        Raises:
            ValueError: If plugin not found or test cases invalid
            PluginError: If testing fails
        """
        try:
            if not test_cases:
                raise ValueError("No test cases provided")
            
            # Initialize test results
            results = {
                "plugin_name": plugin_name,
                "timestamp": datetime.now().isoformat(),
                "total_tests": len(test_cases),
                "passed_tests": 0,
                "failed_tests": 0,
                "test_cases": [],
                "metrics": {
                    "execution_time": 0.0,
                    "memory_usage": 0.0,
                    "error_count": 0,
                    "warning_count": 0
                }
            }
            
            start_time = time.time()
            
            # Run each test case
            for test_case in test_cases:
                case_result = await self._run_test_case(plugin_name, test_case)
                results["test_cases"].append(case_result)
                
                if case_result["status"] == "passed":
                    results["passed_tests"] += 1
                else:
                    results["failed_tests"] += 1
                    results["metrics"]["error_count"] += 1
                
                if case_result.get("warnings"):
                    results["metrics"]["warning_count"] += len(case_result["warnings"])
            
            # Calculate final metrics
            results["metrics"]["execution_time"] = time.time() - start_time
            results["metrics"]["memory_usage"] = self._get_memory_usage()
            
            # Store results
            self._test_results[plugin_name] = results
            self._test_metrics[plugin_name] = results["metrics"]
            
            self._logger.info(f"Completed testing plugin {plugin_name}: {results['passed_tests']}/{results['total_tests']} tests passed")
            
            return results
            
        except Exception as e:
            self._logger.error(f"Failed to test plugin {plugin_name}: {str(e)}")
            raise PluginError(f"Plugin testing failed: {str(e)}", PluginErrorType.TEST_ERROR)
    
    async def validate_plugin(self, plugin_name: str) -> bool:
        """Validate a plugin's functionality.
        
        Args:
            plugin_name: Name of the plugin to validate
            
        Returns:
            bool: True if plugin is valid, False otherwise
            
        Raises:
            ValueError: If plugin not found
            PluginError: If validation fails
        """
        try:
            # Get plugin instance
            plugin = await self._get_plugin(plugin_name)
            if not plugin:
                raise ValueError(f"Plugin {plugin_name} not found")
            
            # Run validation checks
            validation_results = {
                "interface_check": await self._check_interface(plugin),
                "dependency_check": await self._check_dependencies(plugin),
                "resource_check": await self._check_resources(plugin),
                "security_check": await self._check_security(plugin),
                "performance_check": await self._check_performance(plugin)
            }
            
            # Store validation results
            self._validation_results[plugin_name] = all(validation_results.values())
            
            # Log validation issues
            for check, result in validation_results.items():
                if not result:
                    self._logger.warning(f"Plugin {plugin_name} failed {check}")
            
            return self._validation_results[plugin_name]
            
        except Exception as e:
            self._logger.error(f"Failed to validate plugin {plugin_name}: {str(e)}")
            raise PluginError(f"Plugin validation failed: {str(e)}", PluginErrorType.VALIDATION_ERROR)
    
    async def _run_test_case(self, plugin_name: str, test_case: Dict[str, Any]) -> Dict[str, Any]:
        """Run a single test case.
        
        Args:
            plugin_name: Name of the plugin to test
            test_case: Test case to run
            
        Returns:
            Dict[str, Any]: Test case results
        """
        try:
            # Get plugin instance
            plugin = await self._get_plugin(plugin_name)
            if not plugin:
                raise ValueError(f"Plugin {plugin_name} not found")
            
            # Prepare test case
            input_data = test_case.get("input", {})
            expected_output = test_case.get("expected_output")
            timeout = test_case.get("timeout", 30)
            
            # Run test
            start_time = time.time()
            result = await asyncio.wait_for(
                plugin.execute(input_data),
                timeout=timeout
            )
            execution_time = time.time() - start_time
            
            # Validate result
            status = "passed"
            errors = []
            warnings = []
            
            if expected_output is not None:
                if not self._compare_outputs(result, expected_output):
                    status = "failed"
                    errors.append("Output does not match expected result")
            
            # Check for warnings
            if execution_time > test_case.get("max_execution_time", 5.0):
                warnings.append(f"Test execution time ({execution_time:.2f}s) exceeds threshold")
            
            return {
                "status": status,
                "input": input_data,
                "output": result,
                "expected_output": expected_output,
                "execution_time": execution_time,
                "errors": errors,
                "warnings": warnings
            }
            
        except asyncio.TimeoutError:
            return {
                "status": "failed",
                "input": test_case.get("input", {}),
                "errors": ["Test case timed out"],
                "execution_time": timeout
            }
        except Exception as e:
            return {
                "status": "failed",
                "input": test_case.get("input", {}),
                "errors": [str(e)],
                "execution_time": 0.0
            }
    
    async def _check_interface(self, plugin: Any) -> bool:
        """Check if plugin implements required interface.
        
        Args:
            plugin: Plugin instance to check
            
        Returns:
            bool: True if interface is valid
        """
        required_methods = ["initialize", "start", "stop", "execute", "cleanup"]
        return all(hasattr(plugin, method) for method in required_methods)
    
    async def _check_dependencies(self, plugin: Any) -> bool:
        """Check if plugin dependencies are satisfied.
        
        Args:
            plugin: Plugin instance to check
            
        Returns:
            bool: True if dependencies are satisfied
        """
        try:
            if not hasattr(plugin, "dependencies"):
                return True
                
            dependency_manager = await self._get_dependency_manager()
            if not dependency_manager:
                return False
                
            status = await dependency_manager.check_dependencies(plugin.name)
            return all(status.values())
            
        except Exception:
            return False
    
    async def _check_resources(self, plugin: Any) -> bool:
        """Check if plugin has required resources.
        
        Args:
            plugin: Plugin instance to check
            
        Returns:
            bool: True if resources are available
        """
        try:
            if not hasattr(plugin, "required_resources"):
                return True
                
            for resource in plugin.required_resources:
                if not await self._check_resource_availability(resource):
                    return False
                    
            return True
            
        except Exception:
            return False
    
    async def _check_security(self, plugin: Any) -> bool:
        """Check plugin security.
        
        Args:
            plugin: Plugin instance to check
            
        Returns:
            bool: True if security checks pass
        """
        try:
            # Check for dangerous operations
            if hasattr(plugin, "execute"):
                source = inspect.getsource(plugin.execute)
                dangerous_ops = ["eval", "exec", "os.system", "subprocess"]
                if any(op in source for op in dangerous_ops):
                    return False
            
            # Check for proper error handling
            if not hasattr(plugin, "handle_error"):
                return False
            
            return True
            
        except Exception:
            return False
    
    async def _check_performance(self, plugin: Any) -> bool:
        """Check plugin performance.
        
        Args:
            plugin: Plugin instance to check
            
        Returns:
            bool: True if performance checks pass
        """
        try:
            # Run performance test
            start_time = time.time()
            await plugin.initialize()
            init_time = time.time() - start_time
            
            # Check initialization time
            if init_time > 5.0:  # 5 seconds threshold
                return False
            
            return True
            
        except Exception:
            return False
    
    def _compare_outputs(self, actual: Any, expected: Any) -> bool:
        """Compare actual and expected outputs.
        
        Args:
            actual: Actual output
            expected: Expected output
            
        Returns:
            bool: True if outputs match
        """
        if isinstance(expected, dict):
            return all(
                self._compare_outputs(actual.get(k), v)
                for k, v in expected.items()
            )
        elif isinstance(expected, list):
            return len(actual) == len(expected) and all(
                self._compare_outputs(a, e)
                for a, e in zip(actual, expected)
            )
        else:
            return actual == expected
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB.
        
        Returns:
            float: Memory usage in MB
        """
        try:
            import psutil
            process = psutil.Process()
            return process.memory_info().rss / 1024 / 1024
        except ImportError:
            return 0.0
    
    async def _get_plugin(self, plugin_name: str) -> Optional[Any]:
        """Get plugin instance.
        
        Args:
            plugin_name: Name of the plugin
            
        Returns:
            Optional[Any]: Plugin instance if found
        """
        plugin_manager = await self._get_plugin_manager()
        if plugin_manager:
            return await plugin_manager.get_plugin(plugin_name)
        return None
    
    async def _get_plugin_manager(self) -> Optional[IPluginManager]:
        """Get plugin manager instance.
        
        Returns:
            Optional[IPluginManager]: Plugin manager instance if available
        """
        # This would typically be injected or retrieved from a service locator
        return None
    
    async def _get_dependency_manager(self) -> Optional[IDependencyManager]:
        """Get dependency manager instance.
        
        Returns:
            Optional[IDependencyManager]: Dependency manager instance if available
        """
        # This would typically be injected or retrieved from a service locator
        return None
    
    async def _check_resource_availability(self, resource: str) -> bool:
        """Check if a resource is available.
        
        Args:
            resource: Resource to check
            
        Returns:
            bool: True if resource is available
        """
        # This would typically check against a resource manager
        return True

@runtime_checkable
class IPluginSynthesizer(Protocol):
    """Interface for plugin synthesis."""
    
    def __init__(self):
        """Initialize plugin synthesizer."""
        self._synthesis_history: List[Dict[str, Any]] = []
        self._templates: Dict[str, str] = {}
        self._logger = logging.getLogger("plugin_synthesizer")
        self._load_templates()
    
    async def synthesize_plugin(self, spec: Dict[str, Any]) -> Plugin:
        """Synthesize a plugin from a specification.
        
        Args:
            spec: Plugin specification dictionary
            
        Returns:
            Plugin: The synthesized plugin instance
            
        Raises:
            ValueError: If specification is invalid
            PluginError: If synthesis fails
        """
        try:
            if not await self.validate_spec(spec):
                raise ValueError("Invalid plugin specification")
            
            plugin_code = await self._generate_plugin_code(spec)
            plugin = await self._create_plugin_instance(plugin_code, spec)
            self._record_synthesis(spec, plugin)
            
            self._logger.info(f"Successfully synthesized plugin: {spec.get('name', 'Unknown')}")
            return plugin
            
        except Exception as e:
            self._logger.error(f"Failed to synthesize plugin: {str(e)}")
            raise PluginError(f"Plugin synthesis failed: {str(e)}", PluginErrorType.SYNTHESIS_ERROR)
    
    async def validate_spec(self, spec: Dict[str, Any]) -> bool:
        """Validate a plugin specification.
        
        Args:
            spec: Plugin specification to validate
            
        Returns:
            bool: True if specification is valid
            
        Raises:
            PluginError: If validation fails
        """
        try:
            required_fields = ["name", "version", "description", "type"]
            if not all(field in spec for field in required_fields):
                return False
                
            if not isinstance(spec["name"], str) or not spec["name"].isidentifier():
                return False
                
            if not self._is_valid_version(spec["version"]):
                return False
                
            if spec["type"] not in ["service", "processor", "monitor", "analyzer"]:
                return False
                
            return True
            
        except Exception as e:
            self._logger.error(f"Validation failed: {str(e)}")
            return False
    
    def get_synthesis_history(self) -> List[Dict[str, Any]]:
        """Get plugin synthesis history.
        
        Returns:
            List[Dict[str, Any]]: List of synthesis history entries
        """
        return self._synthesis_history
    
    async def _generate_plugin_code(self, spec: Dict[str, Any]) -> str:
        """Generate plugin code from specification.
        
        Args:
            spec: Plugin specification
            
        Returns:
            str: Generated plugin code
        """
        try:
            # Get template for plugin type
            template = self._get_template(spec["type"])
            if not template:
                raise ValueError(f"No template found for type: {spec['type']}")
            
            # Generate imports
            imports = self._generate_imports(spec)
            
            # Generate class definition
            class_def = self._generate_class_definition(spec)
            
            # Generate methods
            methods = await self._generate_methods(spec)
            
            # Combine code
            code = f"{imports}\n\n{class_def}\n{methods}"
            
            return code
            
        except Exception as e:
            self._logger.error(f"Failed to generate plugin code: {str(e)}")
            raise PluginError(f"Code generation failed: {str(e)}", PluginErrorType.SYNTHESIS_ERROR)
    
    async def _create_plugin_instance(self, code: str, spec: Dict[str, Any]) -> Plugin:
        """Create plugin instance from generated code.
        
        Args:
            code: Generated plugin code
            spec: Plugin specification
            
        Returns:
            Plugin: Plugin instance
        """
        try:
            # Create temporary module
            module_name = f"plugin_{spec['name'].lower()}"
            module = types.ModuleType(module_name)
            
            # Execute code in module
            exec(code, module.__dict__)
            
            # Get plugin class
            plugin_class = getattr(module, spec["name"])
            
            # Create instance
            instance = plugin_class()
            
            # Initialize plugin
            if hasattr(instance, "initialize"):
                await instance.initialize()
            
            return instance
            
        except Exception as e:
            self._logger.error(f"Failed to create plugin instance: {str(e)}")
            raise PluginError(f"Instance creation failed: {str(e)}", PluginErrorType.SYNTHESIS_ERROR)
    
    def _load_templates(self) -> None:
        """Load plugin templates."""
        try:
            template_dir = Path(__file__).parent / "templates"
            for template_file in template_dir.glob("*.py"):
                template_name = template_file.stem
                with open(template_file, "r") as f:
                    self._templates[template_name] = f.read()
        except Exception as e:
            self._logger.error(f"Failed to load templates: {str(e)}")
    
    def _get_template(self, plugin_type: str) -> Optional[str]:
        """Get template for plugin type.
        
        Args:
            plugin_type: Type of plugin
            
        Returns:
            Optional[str]: Template code if found
        """
        return self._templates.get(plugin_type)
    
    def _generate_imports(self, spec: Dict[str, Any]) -> str:
        """Generate import statements.
        
        Args:
            spec: Plugin specification
            
        Returns:
            str: Import statements
        """
        imports = [
            "from typing import Any, Dict, Optional",
            "import asyncio",
            "import logging",
            "from core.plugin.base import BasePlugin",
            "from core.exceptions import PluginError"
        ]
        
        # Add type-specific imports
        if spec["type"] == "service":
            imports.extend([
                "import aiohttp",
                "from aiohttp import ClientSession"
            ])
        elif spec["type"] == "processor":
            imports.extend([
                "import json",
                "from datetime import datetime"
            ])
        
        return "\n".join(imports)
    
    def _generate_class_definition(self, spec: Dict[str, Any]) -> str:
        """Generate class definition.
        
        Args:
            spec: Plugin specification
            
        Returns:
            str: Class definition
        """
        return f"""class {spec['name']}(BasePlugin):
    \"\"\"{spec['description']}\"\"\"
    
    def __init__(self):
        super().__init__()
        self.name = "{spec['name']}"
        self.version = "{spec['version']}"
        self.description = "{spec['description']}"
        self.type = "{spec['type']}"
        self.logger = logging.getLogger(self.name)
"""
    
    async def _generate_methods(self, spec: Dict[str, Any]) -> str:
        """Generate plugin methods.
        
        Args:
            spec: Plugin specification
            
        Returns:
            str: Generated methods
        """
        methods = []
        
        # Generate initialize method
        methods.append(self._generate_initialize_method(spec))
        
        # Generate start method
        methods.append(self._generate_start_method(spec))
        
        # Generate stop method
        methods.append(self._generate_stop_method(spec))
        
        # Generate execute method
        methods.append(await self._generate_execute_method(spec))
        
        # Generate cleanup method
        methods.append(self._generate_cleanup_method(spec))
        
        return "\n".join(methods)
    
    def _generate_initialize_method(self, spec: Dict[str, Any]) -> str:
        """Generate initialize method.
        
        Args:
            spec: Plugin specification
            
        Returns:
            str: Initialize method code
        """
        return """    async def initialize(self) -> None:
        \"\"\"Initialize the plugin.\"\"\"
        try:
            # Initialize plugin state
            self.state = "initializing"
            
            # Load configuration
            if hasattr(self, "config"):
                await self._load_config()
            
            # Initialize resources
            if hasattr(self, "required_resources"):
                await self._initialize_resources()
            
            self.state = "initialized"
            self.logger.info("Plugin initialized successfully")
            
        except Exception as e:
            self.state = "error"
            self.logger.error(f"Failed to initialize plugin: {str(e)}")
            raise PluginError(f"Initialization failed: {str(e)}")
"""
    
    def _generate_start_method(self, spec: Dict[str, Any]) -> str:
        """Generate start method.
        
        Args:
            spec: Plugin specification
            
        Returns:
            str: Start method code
        """
        return """    async def start(self) -> None:
        \"\"\"Start the plugin.\"\"\"
        try:
            if self.state != "initialized":
                raise PluginError("Plugin must be initialized before starting")
            
            self.state = "starting"
            
            # Start plugin operations
            if hasattr(self, "_start_operations"):
                await self._start_operations()
            
            self.state = "running"
            self.logger.info("Plugin started successfully")
            
        except Exception as e:
            self.state = "error"
            self.logger.error(f"Failed to start plugin: {str(e)}")
            raise PluginError(f"Start failed: {str(e)}")
"""
    
    def _generate_stop_method(self, spec: Dict[str, Any]) -> str:
        """Generate stop method.
        
        Args:
            spec: Plugin specification
            
        Returns:
            str: Stop method code
        """
        return """    async def stop(self) -> None:
        \"\"\"Stop the plugin.\"\"\"
        try:
            if self.state != "running":
                return
            
            self.state = "stopping"
            
            # Stop plugin operations
            if hasattr(self, "_stop_operations"):
                await self._stop_operations()
            
            self.state = "stopped"
            self.logger.info("Plugin stopped successfully")
            
        except Exception as e:
            self.state = "error"
            self.logger.error(f"Failed to stop plugin: {str(e)}")
            raise PluginError(f"Stop failed: {str(e)}")
"""
    
    async def _generate_execute_method(self, spec: Dict[str, Any]) -> str:
        """Generate execute method.
        
        Args:
            spec: Plugin specification
            
        Returns:
            str: Execute method code
        """
        if spec["type"] == "service":
            return """    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        \"\"\"Execute the plugin with input data.
        
        Args:
            input_data: Input data for execution
            
        Returns:
            Dict[str, Any]: Execution results
        \"\"\"
        try:
            if self.state != "running":
                raise PluginError("Plugin must be running to execute")
            
            # Validate input
            if not self._validate_input(input_data):
                raise PluginError("Invalid input data")
            
            # Process request
            async with aiohttp.ClientSession() as session:
                response = await self._send_request(session, input_data)
            
            # Process response
            result = await self._process_response(response)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Execution failed: {str(e)}")
            raise PluginError(f"Execution failed: {str(e)}")
"""
        else:
            return """    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        \"\"\"Execute the plugin with input data.
        
        Args:
            input_data: Input data for execution
            
        Returns:
            Dict[str, Any]: Execution results
        \"\"\"
        try:
            if self.state != "running":
                raise PluginError("Plugin must be running to execute")
            
            # Validate input
            if not self._validate_input(input_data):
                raise PluginError("Invalid input data")
            
            # Process input
            result = await self._process_input(input_data)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Execution failed: {str(e)}")
            raise PluginError(f"Execution failed: {str(e)}")
"""
    
    def _generate_cleanup_method(self, spec: Dict[str, Any]) -> str:
        """Generate cleanup method.
        
        Args:
            spec: Plugin specification
            
        Returns:
            str: Cleanup method code
        """
        return """    async def cleanup(self) -> None:
        \"\"\"Clean up plugin resources.\"\"\"
        try:
            # Stop plugin if running
            if self.state == "running":
                await self.stop()
            
            # Clean up resources
            if hasattr(self, "_cleanup_resources"):
                await self._cleanup_resources()
            
            self.state = "cleaned"
            self.logger.info("Plugin cleaned up successfully")
            
        except Exception as e:
            self.logger.error(f"Cleanup failed: {str(e)}")
            raise PluginError(f"Cleanup failed: {str(e)}")
"""
    
    def _record_synthesis(self, spec: Dict[str, Any], plugin: Plugin) -> None:
        """Record plugin synthesis.
        
        Args:
            spec: Plugin specification
            plugin: Synthesized plugin
        """
        self._synthesis_history.append({
            "timestamp": datetime.now().isoformat(),
            "spec": spec,
            "plugin_name": plugin.name,
            "plugin_version": plugin.version,
            "plugin_type": plugin.type
        })
    
    def _is_valid_version(self, version: str) -> bool:
        """Check if version string is valid.
        
        Args:
            version: Version string to check
            
        Returns:
            bool: True if version is valid
        """
        try:
            parts = version.split(".")
            if len(parts) != 3:
                return False
            return all(part.isdigit() for part in parts)
        except Exception:
            return False

@runtime_checkable
class IMemoryManager(Protocol):
    """Interface for memory management."""
    
    def __init__(self):
        """Initialize memory manager."""
        self._storage: Dict[str, Dict[str, Any]] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self._logger = logging.getLogger("memory_manager")
        self._max_size = 1024 * 1024 * 100  # 100MB default
        self._cleanup_threshold = 0.9  # 90% threshold
        self._last_cleanup = datetime.now()
        self._cleanup_interval = 300  # 5 minutes
    
    async def store(self, key: str, value: Any, category: str = "default") -> None:
        """Store a value in memory.
        
        Args:
            key: The key to store the value under
            value: The value to store
            category: The category to store the value in (default: "default")
            
        Raises:
            ValueError: If key is invalid
            MemoryError: If storage limit exceeded
        """
        try:
            if not key or not isinstance(key, str):
                raise ValueError("Invalid key")
            
            # Initialize category if needed
            if category not in self._storage:
                self._storage[category] = {}
                self._locks[category] = asyncio.Lock()
            
            # Get size of value
            value_size = self._get_size(value)
            
            # Check if storing would exceed limit
            current_size = self._get_current_size()
            if current_size + value_size > self._max_size:
                # Try cleanup if above threshold
                if current_size / self._max_size > self._cleanup_threshold:
                    await self._cleanup()
                
                # Check again after cleanup
                if current_size + value_size > self._max_size:
                    raise MemoryError("Storage limit exceeded")
            
            # Store value with lock
            async with self._locks[category]:
                self._storage[category][key] = {
                    "value": value,
                    "timestamp": datetime.now().isoformat(),
                    "size": value_size,
                    "access_count": 0
                }
            
            self._logger.debug(f"Stored value for key '{key}' in category '{category}'")
            
        except Exception as e:
            self._logger.error(f"Failed to store value: {str(e)}")
            raise
    
    async def retrieve(self, key: str, category: str = "default") -> Optional[Any]:
        """Retrieve a value from memory.
        
        Args:
            key: The key to retrieve
            category: The category to retrieve from (default: "default")
            
        Returns:
            Optional[Any]: The stored value if found, None otherwise
        """
        try:
            if category not in self._storage:
                return None
            
            async with self._locks[category]:
                entry = self._storage[category].get(key)
                if entry:
                    entry["access_count"] += 1
                    return entry["value"]
            
            return None
            
        except Exception as e:
            self._logger.error(f"Failed to retrieve value: {str(e)}")
            return None
    
    async def delete(self, key: str, category: str = "default") -> None:
        """Delete a value from memory.
        
        Args:
            key: The key to delete
            category: The category to delete from (default: "default")
        """
        try:
            if category not in self._storage:
                return
            
            async with self._locks[category]:
                if key in self._storage[category]:
                    del self._storage[category][key]
                    self._logger.debug(f"Deleted key '{key}' from category '{category}'")
            
        except Exception as e:
            self._logger.error(f"Failed to delete value: {str(e)}")
            raise
    
    async def list_keys(self, category: str = "default") -> List[str]:
        """List all keys in a category.
        
        Args:
            category: The category to list keys from (default: "default")
            
        Returns:
            List[str]: List of keys in the category
        """
        try:
            if category not in self._storage:
                return []
            
            async with self._locks[category]:
                return list(self._storage[category].keys())
            
        except Exception as e:
            self._logger.error(f"Failed to list keys: {str(e)}")
            return []
    
    async def clear_category(self, category: str = "default") -> None:
        """Clear all values in a category.
        
        Args:
            category: The category to clear (default: "default")
        """
        try:
            if category not in self._storage:
                return
            
            async with self._locks[category]:
                self._storage[category].clear()
                self._logger.info(f"Cleared category '{category}'")
            
        except Exception as e:
            self._logger.error(f"Failed to clear category: {str(e)}")
            raise
    
    async def get_category_stats(self, category: str = "default") -> Dict[str, Any]:
        """Get statistics for a category.
        
        Args:
            category: The category to get stats for (default: "default")
            
        Returns:
            Dict[str, Any]: Category statistics
        """
        try:
            if category not in self._storage:
                return {
                    "size": 0,
                    "entry_count": 0,
                    "avg_access_count": 0
                }
            
            async with self._locks[category]:
                entries = self._storage[category].values()
                total_size = sum(entry["size"] for entry in entries)
                total_access = sum(entry["access_count"] for entry in entries)
                entry_count = len(entries)
                
                return {
                    "size": total_size,
                    "entry_count": entry_count,
                    "avg_access_count": total_access / entry_count if entry_count > 0 else 0
                }
            
        except Exception as e:
            self._logger.error(f"Failed to get category stats: {str(e)}")
            return {}
    
    def _get_size(self, value: Any) -> int:
        """Get approximate size of a value in bytes.
        
        Args:
            value: Value to get size of
            
        Returns:
            int: Approximate size in bytes
        """
        try:
            import sys
            return sys.getsizeof(value)
        except Exception:
            # Fallback to conservative estimate
            return 1024  # 1KB default
    
    def _get_current_size(self) -> int:
        """Get current total storage size in bytes.
        
        Returns:
            int: Total size in bytes
        """
        total = 0
        for category in self._storage.values():
            for entry in category.values():
                total += entry["size"]
        return total
    
    async def _cleanup(self) -> None:
        """Clean up old entries to free memory."""
        try:
            # Check if cleanup is needed
            now = datetime.now()
            if (now - self._last_cleanup).total_seconds() < self._cleanup_interval:
                return
            
            self._last_cleanup = now
            
            # Get entries sorted by timestamp and access count
            all_entries = []
            for category, entries in self._storage.items():
                for key, entry in entries.items():
                    all_entries.append((category, key, entry))
            
            # Sort by access count (least accessed first) and timestamp (oldest first)
            all_entries.sort(key=lambda x: (x[2]["access_count"], x[2]["timestamp"]))
            
            # Remove entries until below threshold
            current_size = self._get_current_size()
            target_size = self._max_size * 0.8  # Aim for 80% usage
            
            for category, key, entry in all_entries:
                if current_size <= target_size:
                    break
                
                async with self._locks[category]:
                    if key in self._storage[category]:
                        del self._storage[category][key]
                        current_size -= entry["size"]
                        self._logger.debug(f"Cleaned up key '{key}' from category '{category}'")
            
        except Exception as e:
            self._logger.error(f"Failed to cleanup storage: {str(e)}")
            raise

@runtime_checkable
class IConfigManager(Protocol):
    """Interface for configuration management."""
    
    def __init__(self):
        """Initialize configuration manager."""
        self._config: Dict[str, Any] = {}
        self._defaults: Dict[str, Any] = {}
        self._schema: Dict[str, Dict[str, Any]] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self._logger = logging.getLogger("config_manager")
        self._load_defaults()
        self._load_schema()
    
    async def get(self, key: str, default: Any = None) -> Any:
        """Get a configuration value.
        
        Args:
            key: The configuration key to get
            default: Default value if key not found
            
        Returns:
            Any: The configuration value or default if not found
        """
        try:
            # Handle nested keys
            parts = key.split(".")
            value = self._config
            
            for part in parts:
                if not isinstance(value, dict):
                    return default
                value = value.get(part, default)
                if value is None:
                    return default
            
            return value
            
        except Exception as e:
            self._logger.error(f"Failed to get config value for key '{key}': {str(e)}")
            return default
    
    async def set(self, key: str, value: Any) -> None:
        """Set a configuration value.
        
        Args:
            key: The configuration key to set
            value: The value to set
            
        Raises:
            ValueError: If key is invalid or value fails validation
        """
        try:
            if not key or not isinstance(key, str):
                raise ValueError("Invalid key")
            
            # Validate value if schema exists
            if key in self._schema:
                self._validate_value(key, value)
            
            # Handle nested keys
            parts = key.split(".")
            config = self._config
            
            # Create/traverse path
            for part in parts[:-1]:
                if part not in config:
                    config[part] = {}
                elif not isinstance(config[part], dict):
                    config[part] = {}
                config = config[part]
            
            # Set value
            async with self._get_lock(key):
                config[parts[-1]] = value
                self._logger.debug(f"Set config value for key '{key}'")
            
        except Exception as e:
            self._logger.error(f"Failed to set config value for key '{key}': {str(e)}")
            raise
    
    async def load(self, config_path: Path) -> None:
        """Load configuration from a file.
        
        Args:
            config_path: Path to the configuration file
            
        Raises:
            FileNotFoundError: If config file not found
            ValueError: If config file is invalid
        """
        try:
            if not config_path.exists():
                raise FileNotFoundError(f"Config file not found: {config_path}")
            
            # Load file based on extension
            config = {}
            if config_path.suffix == ".json":
                with open(config_path) as f:
                    config = json.load(f)
            elif config_path.suffix in (".yaml", ".yml"):
                import yaml
                with open(config_path) as f:
                    config = yaml.safe_load(f)
            else:
                raise ValueError(f"Unsupported config file format: {config_path.suffix}")
            
            # Validate config
            if not isinstance(config, dict):
                raise ValueError("Invalid config file format")
            
            # Update config
            async with self._get_lock(""):
                self._config.update(config)
                self._logger.info(f"Loaded configuration from {config_path}")
            
        except Exception as e:
            self._logger.error(f"Failed to load config file: {str(e)}")
            raise
    
    async def save(self, config_path: Path) -> None:
        """Save configuration to a file.
        
        Args:
            config_path: Path to save the configuration file
            
        Raises:
            ValueError: If path is invalid or save fails
        """
        try:
            # Create parent directories if needed
            config_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Save based on extension
            async with self._get_lock(""):
                if config_path.suffix == ".json":
                    with open(config_path, "w") as f:
                        json.dump(self._config, f, indent=2)
                elif config_path.suffix in (".yaml", ".yml"):
                    import yaml
                    with open(config_path, "w") as f:
                        yaml.safe_dump(self._config, f)
                else:
                    raise ValueError(f"Unsupported config file format: {config_path.suffix}")
                
            self._logger.info(f"Saved configuration to {config_path}")
            
        except Exception as e:
            self._logger.error(f"Failed to save config file: {str(e)}")
            raise
    
    def get_all(self) -> Dict[str, Any]:
        """Get all configuration values.
        
        Returns:
            Dict[str, Any]: Dictionary of all configuration values
        """
        return self._config.copy()
    
    def get_defaults(self) -> Dict[str, Any]:
        """Get all default configuration values.
        
        Returns:
            Dict[str, Any]: Dictionary of default configuration values
        """
        return self._defaults.copy()
    
    def get_schema(self) -> Dict[str, Dict[str, Any]]:
        """Get configuration schema.
        
        Returns:
            Dict[str, Dict[str, Any]]: Configuration schema
        """
        return self._schema.copy()
    
    def _load_defaults(self) -> None:
        """Load default configuration values."""
        try:
            defaults_path = Path(__file__).parent / "config" / "defaults.yaml"
            if defaults_path.exists():
                import yaml
                with open(defaults_path) as f:
                    self._defaults = yaml.safe_load(f)
                    self._config.update(self._defaults)
            
        except Exception as e:
            self._logger.error(f"Failed to load defaults: {str(e)}")
    
    def _load_schema(self) -> None:
        """Load configuration schema."""
        try:
            schema_path = Path(__file__).parent / "config" / "schema.yaml"
            if schema_path.exists():
                import yaml
                with open(schema_path) as f:
                    self._schema = yaml.safe_load(f)
            
        except Exception as e:
            self._logger.error(f"Failed to load schema: {str(e)}")
    
    def _validate_value(self, key: str, value: Any) -> None:
        """Validate a configuration value against schema.
        
        Args:
            key: Configuration key
            value: Value to validate
            
        Raises:
            ValueError: If validation fails
        """
        schema = self._schema.get(key, {})
        
        # Check type
        expected_type = schema.get("type")
        if expected_type:
            actual_type = type(value).__name__
            if expected_type != actual_type:
                raise ValueError(f"Invalid type for key '{key}': expected {expected_type}, got {actual_type}")
        
        # Check constraints
        constraints = schema.get("constraints", {})
        
        # Range check for numbers
        if isinstance(value, (int, float)):
            min_val = constraints.get("min")
            max_val = constraints.get("max")
            if min_val is not None and value < min_val:
                raise ValueError(f"Value for key '{key}' below minimum: {min_val}")
            if max_val is not None and value > max_val:
                raise ValueError(f"Value for key '{key}' above maximum: {max_val}")
        
        # Length check for strings/lists
        if isinstance(value, (str, list)):
            min_len = constraints.get("min_length")
            max_len = constraints.get("max_length")
            if min_len is not None and len(value) < min_len:
                raise ValueError(f"Value for key '{key}' below minimum length: {min_len}")
            if max_len is not None and len(value) > max_len:
                raise ValueError(f"Value for key '{key}' above maximum length: {max_len}")
        
        # Pattern check for strings
        if isinstance(value, str):
            pattern = constraints.get("pattern")
            if pattern and not re.match(pattern, value):
                raise ValueError(f"Value for key '{key}' does not match pattern: {pattern}")
        
        # Enum check
        if "enum" in constraints:
            if value not in constraints["enum"]:
                raise ValueError(f"Value for key '{key}' not in allowed values: {constraints['enum']}")
        
        # Custom validation
        if "validator" in schema:
            validator = schema["validator"]
            if not validator(value):
                raise ValueError(f"Value for key '{key}' failed custom validation")
    
    async def _get_lock(self, key: str) -> asyncio.Lock:
        """Get or create a lock for a config key.
        
        Args:
            key: Configuration key
            
        Returns:
            asyncio.Lock: Lock for the key
        """
        if key not in self._locks:
            self._locks[key] = asyncio.Lock()
        return self._locks[key]

@runtime_checkable
class IPluginValidator(Protocol):
    """Interface for plugin validation."""
    
    def __init__(self):
        """Initialize plugin validator."""
        self._validation_rules: Dict[str, List[Callable]] = {}
        self._logger = logging.getLogger("plugin_validator")
        self._load_validation_rules()
    
    def validate_plugin(self, plugin_path: Path) -> List[str]:
        """Validate a plugin directory.
        
        Args:
            plugin_path: Path to the plugin directory
            
        Returns:
            List[str]: List of validation errors, empty if valid
        """
        try:
            errors = []
            
            # Check if directory exists
            if not plugin_path.exists():
                return [f"Plugin directory not found: {plugin_path}"]
            
            # Check required files
            required_files = ["__init__.py", "plugin.py", "requirements.txt"]
            for file in required_files:
                if not (plugin_path / file).exists():
                    errors.append(f"Missing required file: {file}")
            
            # Validate plugin file
            plugin_file = plugin_path / "plugin.py"
            if plugin_file.exists():
                errors.extend(self.validate_plugin_file(plugin_file))
            
            # Validate requirements
            req_file = plugin_path / "requirements.txt"
            if req_file.exists():
                errors.extend(self.validate_requirements(req_file))
            
            # Validate metadata
            metadata_file = plugin_path / "metadata.yaml"
            if metadata_file.exists():
                import yaml
                with open(metadata_file) as f:
                    metadata = yaml.safe_load(f)
                    errors.extend(self.validate_metadata(metadata))
            
            # Run custom validation rules
            for rule_name, rules in self._validation_rules.items():
                for rule in rules:
                    try:
                        rule(plugin_path)
                    except Exception as e:
                        errors.append(f"Validation rule '{rule_name}' failed: {str(e)}")
            
            return errors
            
        except Exception as e:
            self._logger.error(f"Plugin validation failed: {str(e)}")
            return [f"Validation error: {str(e)}"]
    
    def validate_metadata(self, metadata: Dict[str, Any]) -> List[str]:
        """Validate plugin metadata.
        
        Args:
            metadata: Plugin metadata dictionary
            
        Returns:
            List[str]: List of validation errors, empty if valid
        """
        try:
            errors = []
            
            # Check required fields
            required_fields = ["name", "version", "description", "author"]
            for field in required_fields:
                if field not in metadata:
                    errors.append(f"Missing required metadata field: {field}")
            
            # Validate name
            if "name" in metadata:
                name = metadata["name"]
                if not isinstance(name, str) or not name.isidentifier():
                    errors.append("Invalid plugin name")
            
            # Validate version
            if "version" in metadata:
                version = metadata["version"]
                if not isinstance(version, str) or not self._is_valid_version(version):
                    errors.append("Invalid version format")
            
            # Validate dependencies
            if "dependencies" in metadata:
                deps = metadata["dependencies"]
                if not isinstance(deps, list) or not all(isinstance(d, str) for d in deps):
                    errors.append("Invalid dependencies format")
            
            # Validate configuration
            if "config" in metadata:
                config = metadata["config"]
                if not isinstance(config, dict):
                    errors.append("Invalid configuration format")
            
            return errors
            
        except Exception as e:
            self._logger.error(f"Metadata validation failed: {str(e)}")
            return [f"Metadata validation error: {str(e)}"]
    
    def validate_plugin_file(self, plugin_file: Path) -> List[str]:
        """Validate a plugin file.
        
        Args:
            plugin_file: Path to the plugin file
            
        Returns:
            List[str]: List of validation errors, empty if valid
        """
        try:
            errors = []
            
            # Check file exists
            if not plugin_file.exists():
                return [f"Plugin file not found: {plugin_file}"]
            
            # Read file content
            with open(plugin_file) as f:
                content = f.read()
            
            # Check for required imports
            required_imports = ["BasePlugin", "PluginError"]
            for imp in required_imports:
                if imp not in content:
                    errors.append(f"Missing required import: {imp}")
            
            # Check for required class
            if "class" not in content:
                errors.append("No class definition found")
            
            # Check for required methods
            required_methods = ["initialize", "start", "stop", "execute", "cleanup"]
            for method in required_methods:
                if f"async def {method}" not in content:
                    errors.append(f"Missing required method: {method}")
            
            # Check for dangerous operations
            dangerous_ops = ["eval", "exec", "os.system", "subprocess"]
            for op in dangerous_ops:
                if op in content:
                    errors.append(f"Found dangerous operation: {op}")
            
            # Check for proper error handling
            if "try:" not in content or "except" not in content:
                errors.append("Missing error handling")
            
            return errors
            
        except Exception as e:
            self._logger.error(f"Plugin file validation failed: {str(e)}")
            return [f"Plugin file validation error: {str(e)}"]
    
    def validate_requirements(self, requirements_file: Path) -> List[str]:
        """Validate requirements file.
        
        Args:
            requirements_file: Path to the requirements file
            
        Returns:
            List[str]: List of validation errors, empty if valid
        """
        try:
            errors = []
            
            # Check file exists
            if not requirements_file.exists():
                return [f"Requirements file not found: {requirements_file}"]
            
            # Read requirements
            with open(requirements_file) as f:
                requirements = f.readlines()
            
            # Validate each requirement
            for req in requirements:
                req = req.strip()
                if not req or req.startswith("#"):
                    continue
                
                # Check format
                if not self._is_valid_requirement(req):
                    errors.append(f"Invalid requirement format: {req}")
                
                # Check for version conflicts
                if self._has_version_conflict(req):
                    errors.append(f"Version conflict in requirement: {req}")
            
            return errors
            
        except Exception as e:
            self._logger.error(f"Requirements validation failed: {str(e)}")
            return [f"Requirements validation error: {str(e)}"]
    
    def _load_validation_rules(self) -> None:
        """Load custom validation rules."""
        try:
            rules_path = Path(__file__).parent / "validation" / "rules.yaml"
            if rules_path.exists():
                import yaml
                with open(rules_path) as f:
                    rules = yaml.safe_load(f)
                    for rule_name, rule_config in rules.items():
                        self._validation_rules[rule_name] = self._compile_rules(rule_config)
            
        except Exception as e:
            self._logger.error(f"Failed to load validation rules: {str(e)}")
    
    def _compile_rules(self, rule_config: Dict[str, Any]) -> List[Callable]:
        """Compile validation rules from configuration.
        
        Args:
            rule_config: Rule configuration dictionary
            
        Returns:
            List[Callable]: List of compiled rule functions
        """
        rules = []
        
        # Add file existence check
        if "required_files" in rule_config:
            files = rule_config["required_files"]
            rules.append(lambda path: self._check_required_files(path, files))
        
        # Add import check
        if "required_imports" in rule_config:
            imports = rule_config["required_imports"]
            rules.append(lambda path: self._check_required_imports(path, imports))
        
        # Add method check
        if "required_methods" in rule_config:
            methods = rule_config["required_methods"]
            rules.append(lambda path: self._check_required_methods(path, methods))
        
        return rules
    
    def _check_required_files(self, plugin_path: Path, files: List[str]) -> None:
        """Check for required files.
        
        Args:
            plugin_path: Plugin directory path
            files: List of required files
            
        Raises:
            ValueError: If required file is missing
        """
        for file in files:
            if not (plugin_path / file).exists():
                raise ValueError(f"Missing required file: {file}")
    
    def _check_required_imports(self, plugin_path: Path, imports: List[str]) -> None:
        """Check for required imports.
        
        Args:
            plugin_path: Plugin directory path
            imports: List of required imports
            
        Raises:
            ValueError: If required import is missing
        """
        plugin_file = plugin_path / "plugin.py"
        if not plugin_file.exists():
            raise ValueError("Plugin file not found")
        
        with open(plugin_file) as f:
            content = f.read()
            for imp in imports:
                if imp not in content:
                    raise ValueError(f"Missing required import: {imp}")
    
    def _check_required_methods(self, plugin_path: Path, methods: List[str]) -> None:
        """Check for required methods.
        
        Args:
            plugin_path: Plugin directory path
            methods: List of required methods
            
        Raises:
            ValueError: If required method is missing
        """
        plugin_file = plugin_path / "plugin.py"
        if not plugin_file.exists():
            raise ValueError("Plugin file not found")
        
        with open(plugin_file) as f:
            content = f.read()
            for method in methods:
                if f"async def {method}" not in content:
                    raise ValueError(f"Missing required method: {method}")
    
    def _is_valid_version(self, version: str) -> bool:
        """Check if version string is valid.
        
        Args:
            version: Version string to check
            
        Returns:
            bool: True if version is valid
        """
        try:
            parts = version.split(".")
            if len(parts) != 3:
                return False
            return all(part.isdigit() for part in parts)
        except Exception:
            return False
    
    def _is_valid_requirement(self, requirement: str) -> bool:
        """Check if requirement string is valid.
        
        Args:
            requirement: Requirement string to check
            
        Returns:
            bool: True if requirement is valid
        """
        try:
            # Basic format check
            if "==" in requirement:
                name, version = requirement.split("==")
                return bool(name.strip()) and self._is_valid_version(version.strip())
            elif ">=" in requirement:
                name, version = requirement.split(">=")
                return bool(name.strip()) and self._is_valid_version(version.strip())
            elif "<=" in requirement:
                name, version = requirement.split("<=")
                return bool(name.strip()) and self._is_valid_version(version.strip())
            else:
                return bool(requirement.strip())
        except Exception:
            return False
    
    def _has_version_conflict(self, requirement: str) -> bool:
        """Check if requirement has version conflicts.
        
        Args:
            requirement: Requirement string to check
            
        Returns:
            bool: True if version conflict exists
        """
        try:
            # This would typically check against installed packages
            # For now, just return False
            return False
        except Exception:
            return False

@runtime_checkable
class IPluginLoader(Protocol):
    """Interface for plugin loading."""
    
    def __init__(self):
        """Initialize plugin loader."""
        self._loaded_plugins: Dict[str, Plugin] = {}
        self._plugin_states: Dict[str, PluginState] = {}
        self._plugin_errors: Dict[str, List[str]] = {}
        self._load_times: Dict[str, datetime] = {}
        self._init_times: Dict[str, datetime] = {}
        self._logger = logging.getLogger("plugin_loader")
    
    async def discover_plugins(self, plugins_dir: Path) -> Dict[str, Path]:
        """Discover plugins in a directory.
        
        Args:
            plugins_dir: Directory to search for plugins
            
        Returns:
            Dict[str, Path]: Dictionary mapping plugin names to their paths
        """
        try:
            if not plugins_dir.exists():
                self._logger.warning(f"Plugins directory not found: {plugins_dir}")
                return {}
            
            plugins = {}
            
            # Search for plugin directories
            for item in plugins_dir.iterdir():
                if not item.is_dir():
                    continue
                
                # Check for plugin files
                plugin_file = item / "plugin.py"
                if not plugin_file.exists():
                    continue
                
                # Get plugin name from metadata or directory
                name = item.name
                metadata_file = item / "metadata.yaml"
                if metadata_file.exists():
                    import yaml
                    with open(metadata_file) as f:
                        metadata = yaml.safe_load(f)
                        if "name" in metadata:
                            name = metadata["name"]
                
                plugins[name] = item
                self._logger.info(f"Discovered plugin: {name} at {item}")
            
            return plugins
            
        except Exception as e:
            self._logger.error(f"Plugin discovery failed: {str(e)}")
            return {}
    
    async def load_plugin(self, plugin_dir: Path) -> Optional[Plugin]:
        """Load a plugin from a directory.
        
        Args:
            plugin_dir: Directory containing the plugin
            
        Returns:
            Optional[Plugin]: The loaded plugin instance if successful, None otherwise
        """
        try:
            if not plugin_dir.exists():
                self._logger.error(f"Plugin directory not found: {plugin_dir}")
                return None
            
            # Get plugin name
            name = plugin_dir.name
            metadata_file = plugin_dir / "metadata.yaml"
            if metadata_file.exists():
                import yaml
                with open(metadata_file) as f:
                    metadata = yaml.safe_load(f)
                    if "name" in metadata:
                        name = metadata["name"]
            
            # Check if already loaded
            if name in self._loaded_plugins:
                self._logger.warning(f"Plugin already loaded: {name}")
                return self._loaded_plugins[name]
            
            # Load plugin module
            plugin_file = plugin_dir / "plugin.py"
            if not plugin_file.exists():
                self._logger.error(f"Plugin file not found: {plugin_file}")
                return None
            
            # Add plugin directory to Python path
            import sys
            sys.path.insert(0, str(plugin_dir.parent))
            
            # Import plugin module
            import importlib.util
            spec = importlib.util.spec_from_file_location(name, plugin_file)
            if not spec or not spec.loader:
                self._logger.error(f"Failed to load plugin module: {name}")
                return None
            
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Find plugin class
            plugin_class = None
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (isinstance(attr, type) and 
                    issubclass(attr, Plugin) and 
                    attr != Plugin):
                    plugin_class = attr
                    break
            
            if not plugin_class:
                self._logger.error(f"No plugin class found in module: {name}")
                return None
            
            # Create plugin instance
            plugin = plugin_class()
            
            # Store plugin
            self._loaded_plugins[name] = plugin
            self._plugin_states[name] = PluginState.UNINITIALIZED
            self._load_times[name] = datetime.now()
            
            self._logger.info(f"Loaded plugin: {name}")
            return plugin
            
        except Exception as e:
            self._logger.error(f"Failed to load plugin: {str(e)}")
            if name:
                self._plugin_errors[name] = [str(e)]
            return None
    
    async def initialize_plugin(self, plugin_name: str) -> bool:
        """Initialize a plugin and its dependencies.
        
        Args:
            plugin_name: Name of the plugin to initialize
            
        Returns:
            bool: True if initialization was successful
        """
        try:
            if plugin_name not in self._loaded_plugins:
                self._logger.error(f"Plugin not found: {plugin_name}")
                return False
            
            plugin = self._loaded_plugins[plugin_name]
            
            # Check current state
            if self._plugin_states[plugin_name] != PluginState.UNINITIALIZED:
                self._logger.warning(f"Plugin already initialized: {plugin_name}")
                return True
            
            # Initialize dependencies first
            if hasattr(plugin, "dependencies"):
                for dep in plugin.dependencies:
                    if not await self.initialize_plugin(dep):
                        self._logger.error(f"Failed to initialize dependency: {dep}")
                        return False
            
            # Initialize plugin
            self._plugin_states[plugin_name] = PluginState.INITIALIZING
            await plugin.initialize()
            self._plugin_states[plugin_name] = PluginState.INITIALIZED
            self._init_times[plugin_name] = datetime.now()
            
            self._logger.info(f"Initialized plugin: {plugin_name}")
            return True
            
        except Exception as e:
            self._logger.error(f"Failed to initialize plugin {plugin_name}: {str(e)}")
            self._plugin_states[plugin_name] = PluginState.ERROR
            self._plugin_errors[plugin_name] = [str(e)]
            return False
    
    def get_plugin_state(self, plugin_name: str) -> Optional[PluginState]:
        """Get the current state of a plugin.
        
        Args:
            plugin_name: Name of the plugin
            
        Returns:
            Optional[PluginState]: Current state of the plugin if found
        """
        return self._plugin_states.get(plugin_name)
    
    def get_plugin_errors(self, plugin_name: str) -> List[str]:
        """Get the errors for a plugin.
        
        Args:
            plugin_name: Name of the plugin
            
        Returns:
            List[str]: List of error messages for the plugin
        """
        return self._plugin_errors.get(plugin_name, [])
    
    def get_plugin_load_time(self, plugin_name: str) -> Optional[datetime]:
        """Get the load time for a plugin.
        
        Args:
            plugin_name: Name of the plugin
            
        Returns:
            Optional[datetime]: Time when the plugin was loaded if found
        """
        return self._load_times.get(plugin_name)
    
    def get_plugin_init_time(self, plugin_name: str) -> Optional[datetime]:
        """Get the initialization time for a plugin.
        
        Args:
            plugin_name: Name of the plugin
            
        Returns:
            Optional[datetime]: Time when the plugin was initialized if found
        """
        return self._init_times.get(plugin_name)

class ComponentState(Enum):
    """Component lifecycle states."""
    UNINITIALIZED = "uninitialized"
    INITIALIZING = "initializing"
    INITIALIZED = "initialized"
    STARTING = "starting"
    ACTIVE = "active"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error" 