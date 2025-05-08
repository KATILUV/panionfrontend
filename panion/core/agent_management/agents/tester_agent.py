"""
Tester Agent Implementation
Handles plugin testing and validation.
"""

import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime
import asyncio
import json
from pathlib import Path

from ..agent_base import AgentBase, AgentLogEntry
from ..role_manager import RoleManager
from ..task_assignment_manager import TaskAssignmentManager
from ..agent_context_builder import AgentContextBuilder
from ...plugin.base import BasePlugin
from ...plugin.manager import plugin_manager
from ...panion_memory import memory_manager, MemoryCategory
from ...error_handling import error_handler, with_error_recovery
from ...shared_state import shared_state, ComponentState
from ...panion_errors import PluginError, ErrorSeverity

from .plugin_types import TestResult, FailureAnalysis, PluginError
from .plugin_tester import PluginTester
from .plugin_manager import PluginManager

logger = logging.getLogger(__name__)

@dataclass
class TestHealth:
    """Plugin test health metrics"""
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    pass_rate: float = 0.0
    avg_duration: float = 0.0
    last_run: Optional[datetime] = None
    status: str = "unknown"  # healthy, unstable, broken
    failure_types: Dict[str, int] = None

    def __post_init__(self):
        if self.failure_types is None:
            self.failure_types = {}

class TesterAgent:
    """Agent responsible for running plugin tests and tracking health metrics"""
    
    def __init__(self, plugin_manager: PluginManager):
        self.plugin_manager = plugin_manager
        self.plugin_tester = PluginTester()
        self.logs_dir = Path("data/plugin_test_logs")
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        
    def run(self, plugin_id: str) -> TestHealth:
        """
        Run all tests for a plugin and track results
        
        Args:
            plugin_id: ID of plugin to test
            
        Returns:
            TestHealth metrics for the plugin
        """
        logger.info(f"Starting test run for plugin {plugin_id}")
        
        # Load test cases
        test_cases = self.plugin_tester.load_test_cases(plugin_id)
        if not test_cases:
            raise PluginError(f"No test cases found for plugin {plugin_id}")
            
        # Initialize health metrics
        health = TestHealth(
            total_tests=len(test_cases),
            last_run=datetime.now()
        )
        
        results: List[TestResult] = []
        total_duration = 0
        
        # Run each test case
        for test_case in test_cases:
            start_time = time.time()
            try:
                # Execute test
                result = self.plugin_tester.run_test(plugin_id, test_case)
                duration = time.time() - start_time
                
                # Record results
                test_result = TestResult(
                    test_id=test_case.id,
                    status="pass" if result.success else "fail",
                    duration=duration,
                    memory_usage=result.memory_usage,
                    stdout=result.stdout,
                    stderr=result.stderr,
                    exit_code=result.exit_code,
                    error=str(result.error) if result.error else None
                )
                
                if result.success:
                    health.passed_tests += 1
                else:
                    health.failed_tests += 1
                    # Analyze failure
                    analysis = self._analyze_failure(test_result)
                    if analysis:
                        failure_type = analysis.failure_type
                        health.failure_types[failure_type] = health.failure_types.get(failure_type, 0) + 1
                        
                total_duration += duration
                results.append(test_result)
                
            except Exception as e:
                logger.error(f"Error running test {test_case.id}: {str(e)}")
                health.failed_tests += 1
                
        # Calculate metrics
        health.pass_rate = (health.passed_tests / health.total_tests) * 100 if health.total_tests > 0 else 0
        health.avg_duration = total_duration / len(results) if results else 0
        
        # Determine health status
        if health.pass_rate >= 90:
            health.status = "healthy"
        elif health.pass_rate >= 50:
            health.status = "unstable"
        else:
            health.status = "broken"
            
        # Save results
        self._save_results(plugin_id, results, health)
        
        # Update plugin manager
        self.plugin_manager.update_plugin_health(plugin_id, health)
        
        return health
    
    def _analyze_failure(self, result: TestResult) -> Optional[FailureAnalysis]:
        """Analyze a test failure to determine type and potential fixes"""
        if result.status != "fail":
            return None
            
        # Basic failure type detection
        if "SecurityError" in (result.error or ""):
            failure_type = "security"
        elif "MemoryError" in (result.error or ""):
            failure_type = "resource"
        elif "AssertionError" in (result.error or ""):
            failure_type = "regression"
        else:
            failure_type = "unknown"
            
        return FailureAnalysis(
            test_id=result.test_id,
            failure_type=failure_type,
            error_message=result.error or "",
            affected_code="",  # Would need code analysis to determine
            suggested_fix="",  # Would need more sophisticated analysis
            confidence=0.5
        )
    
    def _save_results(self, plugin_id: str, results: List[TestResult], health: TestHealth):
        """Save test results and health metrics to log file"""
        log_file = self.logs_dir / f"{plugin_id}.json"
        
        log_data = {
            "plugin_id": plugin_id,
            "timestamp": datetime.now().isoformat(),
            "health": asdict(health),
            "results": [asdict(r) for r in results]
        }
        
        with open(log_file, 'w') as f:
            json.dump(log_data, f, indent=2)
            
        logger.info(f"Test results saved to {log_file}") 