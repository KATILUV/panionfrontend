"""
Auto Test Task Test Subgoal Plugin
Handles automated testing of task subgoals with comprehensive test case management.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
import json
import asyncio
from core.base_plugin import BasePlugin
from core.reflection import reflection_system
from core.service_locator import service_locator
from core.plugin_tester import plugin_tester
from core.plugin_executor import plugin_executor

class AutoTestTaskTestSubgoalPlugin(BasePlugin):
    def __init__(self):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.name = "auto_test_task_test_subgoal"
        self.description = "Automated testing and validation of task subgoals"
        self.version = "0.1.0"
        self.required_parameters = [
            "plugin_id",
            "test_cases"
        ]
        self.optional_parameters = {
            "max_retries": 3,
            "timeout": 30,
            "parallel_tests": False
        }
        self.test_results_dir = Path("data/plugin_test_logs")
        self.test_results_dir.mkdir(parents=True, exist_ok=True)
        self._initialize_service()
        
    def _initialize_service(self) -> None:
        """Initialize the service with required components."""
        try:
            reflection_system.log_thought(
                self.name,
                f"Initializing {self.name} service",
                {"version": self.version}
            )
            
            # Initialize test results directory
            self.test_results_dir.mkdir(parents=True, exist_ok=True)
            
            # Initialize test tracking
            self.active_tests = set()
            self.test_history = {}
            
            # Initialize test execution queue
            self.test_queue = asyncio.Queue()
            
            # Register service with service locator
            service_locator.register_service(
                f"{self.name.lower()}_service",
                self
            )
            
            self.logger.info(f"Initialized {self.name} service")
            reflection_system.log_thought(
                self.name,
                f"Initialized {self.name} service successfully",
                {
                    "status": "active",
                    "test_results_dir": str(self.test_results_dir),
                    "max_retries": self.optional_parameters["max_retries"],
                    "timeout": self.optional_parameters["timeout"]
                }
            )
            
        except Exception as e:
            error_msg = f"Error initializing service: {e}"
            self.logger.error(error_msg)
            reflection_system.log_thought(
                self.name,
                error_msg,
                {"error": str(e)}
            )
            raise
        
    async def execute(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the test subgoal service."""
        try:
            reflection_system.log_thought(
                self.name,
                f"Executing {self.name} service",
                {"parameters": parameters}
            )
            
            # Validate parameters
            self._validate_parameters(parameters)
            
            plugin_id = parameters["plugin_id"]
            test_cases = parameters["test_cases"]
            max_retries = parameters.get("max_retries", self.optional_parameters["max_retries"])
            timeout = parameters.get("timeout", self.optional_parameters["timeout"])
            parallel = parameters.get("parallel_tests", self.optional_parameters["parallel_tests"])
            
            # Run tests
            test_results = await self._run_tests(
                plugin_id,
                test_cases,
                max_retries,
                timeout,
                parallel
            )
            
            # Save test results
            await self._save_test_results(plugin_id, test_results)
            
            # Analyze results
            analysis = self._analyze_test_results(test_results)
            
            result = {
                "status": "success",
                "plugin_id": plugin_id,
                "test_count": len(test_cases),
                "passed_count": analysis["passed_count"],
                "failed_count": analysis["failed_count"],
                "test_results": test_results,
                "analysis": analysis
            }
            
            reflection_system.log_thought(
                self.name,
                f"Completed {self.name} service execution",
                {"result": result}
            )
            
            return result
            
        except Exception as e:
            error_msg = f"Error executing service: {e}"
            self.logger.error(error_msg)
            reflection_system.log_thought(
                self.name,
                error_msg,
                {"error": str(e)}
            )
            return {
                "status": "failure",
                "error": str(e)
            }
    
    async def _run_tests(
        self,
        plugin_id: str,
        test_cases: List[Dict[str, Any]],
        max_retries: int,
        timeout: int,
        parallel: bool
    ) -> List[Dict[str, Any]]:
        """Run test cases for a plugin."""
        results = []
        
        if parallel:
            # Run tests in parallel
            tasks = []
            for test_case in test_cases:
                task = asyncio.create_task(
                    self._execute_test_case(
                        plugin_id,
                        test_case,
                        max_retries,
                        timeout
                    )
                )
                tasks.append(task)
            
            results = await asyncio.gather(*tasks)
        else:
            # Run tests sequentially
            for test_case in test_cases:
                result = await self._execute_test_case(
                    plugin_id,
                    test_case,
                    max_retries,
                    timeout
                )
                results.append(result)
        
        return results
    
    async def _execute_test_case(
        self,
        plugin_id: str,
        test_case: Dict[str, Any],
        max_retries: int,
        timeout: int
    ) -> Dict[str, Any]:
        """Execute a single test case."""
        test_id = f"{plugin_id}_{test_case['name']}"
        
        try:
            # Add to active tests
            self.active_tests.add(test_id)
            
            # Execute test
            result = await plugin_tester.test_plugin(
                plugin_id,
                test_case,
                max_retries=max_retries,
                timeout=timeout
            )
            
            # Update test history
            self.test_history[test_id] = {
                "last_run": datetime.now().isoformat(),
                "result": result
            }
            
            return {
                "test_id": test_id,
                "status": result["status"],
                "duration": result["duration"],
                "output": result["output"],
                "error": result.get("error")
            }
            
        except Exception as e:
            return {
                "test_id": test_id,
                "status": "error",
                "error": str(e)
            }
        finally:
            # Remove from active tests
            self.active_tests.discard(test_id)
    
    async def _save_test_results(
        self,
        plugin_id: str,
        results: List[Dict[str, Any]]
    ) -> None:
        """Save test results to file."""
        result_file = self.test_results_dir / f"{plugin_id}.json"
        
        # Load existing results
        existing_results = []
        if result_file.exists():
            with open(result_file, 'r') as f:
                existing_results = json.load(f)
        
        # Add new results
        existing_results.extend(results)
        
        # Keep only last 100 results
        if len(existing_results) > 100:
            existing_results = existing_results[-100:]
        
        # Save results
        with open(result_file, 'w') as f:
            json.dump(existing_results, f, indent=2)
    
    def _analyze_test_results(
        self,
        results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze test results."""
        total = len(results)
        passed = sum(1 for r in results if r["status"] == "success")
        failed = total - passed
        
        # Group failures by type
        failure_types = {}
        for result in results:
            if result["status"] != "success":
                error_type = type(result["error"]).__name__ if result.get("error") else "Unknown"
                failure_types[error_type] = failure_types.get(error_type, 0) + 1
        
        return {
            "total_count": total,
            "passed_count": passed,
            "failed_count": failed,
            "success_rate": (passed / total) * 100 if total > 0 else 0,
            "failure_types": failure_types
        }
            
    def _validate_parameters(self, parameters: Dict[str, Any]) -> None:
        """Validate input parameters."""
        errors = []
        
        # Check required parameters
        for param in self.required_parameters:
            if param not in parameters:
                errors.append(f"Missing required parameter: {param}")
        
        # Set default values for optional parameters
        for param, default in self.optional_parameters.items():
            if param not in parameters:
                parameters[param] = default
        
        # Validate parameter types and values
        if "plugin_id" in parameters and not isinstance(parameters["plugin_id"], str):
            errors.append("plugin_id must be a string")
            
        if "test_cases" in parameters:
            if not isinstance(parameters["test_cases"], list):
                errors.append("test_cases must be a list")
            else:
                for i, test_case in enumerate(parameters["test_cases"]):
                    if not isinstance(test_case, dict):
                        errors.append(f"test_case at index {i} must be a dictionary")
                    elif "name" not in test_case:
                        errors.append(f"test_case at index {i} missing required 'name' field")
                    elif "input" not in test_case:
                        errors.append(f"test_case at index {i} missing required 'input' field")
                    elif "expected_output" not in test_case:
                        errors.append(f"test_case at index {i} missing required 'expected_output' field")
        
        if "max_retries" in parameters and not isinstance(parameters["max_retries"], int):
            errors.append("max_retries must be an integer")
            
        if "timeout" in parameters and not isinstance(parameters["timeout"], (int, float)):
            errors.append("timeout must be a number")
            
        if "parallel_tests" in parameters and not isinstance(parameters["parallel_tests"], bool):
            errors.append("parallel_tests must be a boolean")
        
        if errors:
            raise ValueError("\n".join(errors))
        
    def get_service_info(self) -> Dict[str, Any]:
        """Get service information."""
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "status": "active",
            "required_parameters": self.required_parameters,
            "optional_parameters": self.optional_parameters,
            "active_tests": len(self.active_tests),
            "test_history_size": len(self.test_history)
        }

# Create singleton instance
auto_test_task_test_subgoal_service = AutoTestTaskTestSubgoalPlugin() 