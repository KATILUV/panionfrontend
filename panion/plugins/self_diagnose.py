"""
Self Diagnose Plugin
Performs system health checks and validates critical methods in core managers.
"""

import logging
import inspect
import importlib
from typing import Dict, List, Any, Optional, Set
from pathlib import Path
from datetime import datetime
import json
import yaml
from dataclasses import dataclass, field

from core.plugin.base import BasePlugin

@dataclass
class HealthCheck:
    """Data class for health check results."""
    component: str
    status: str  # "healthy", "warning", "critical"
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

class SelfDiagnose(BasePlugin):
    def __init__(self, config_path: str = "config/diagnose_config.yaml"):
        """Initialize the self-diagnose plugin.
        
        Args:
            config_path: Path to configuration file
        """
        super().__init__(
            name="SelfDiagnose",
            version="1.0.0",
            description="Performs system health checks and validates critical methods",
            author="Panion Team"
        )
        self.logger = logging.getLogger(__name__)
        self.config = self._load_config(config_path)
        self.results_file = Path("data/health_checks.json")
        self.results_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Define critical methods that must exist in core managers
        self.critical_methods = {
            "conversation_manager": ["process_message", "initialize", "shutdown"],
            "plugin_manager": ["scan_plugins", "load_plugin", "unload_plugin"],
            "resource_manager": ["allocate", "release", "get_status"],
            "memory_system": ["store", "retrieve", "process_updates"],
            "team_coordinator": ["process", "initialize", "shutdown"],
            "autonomy_loop": ["start", "stop", "process_goals"]
        }
        
        # Define health check categories
        self.check_categories = {
            "core_managers": "Critical manager components",
            "plugin_system": "Plugin loading and execution",
            "resource_management": "System resource allocation",
            "memory_system": "Memory and state management",
            "team_coordination": "Agent team management",
            "autonomy": "Autonomous operation"
        }
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.logger.error(f"Error loading config: {str(e)}")
            return {
                "check_interval_minutes": 60,
                "max_history_entries": 100,
                "critical_threshold": 0.7
            }
    
    def run_diagnostic(self) -> List[HealthCheck]:
        """Run comprehensive system diagnostic.
        
        Returns:
            List of HealthCheck objects with diagnostic results
        """
        try:
            checks = []
            
            # Check core managers
            checks.extend(self._check_core_managers())
            
            # Check plugin system
            checks.extend(self._check_plugin_system())
            
            # Check resource management
            checks.extend(self._check_resource_management())
            
            # Check memory system
            checks.extend(self._check_memory_system())
            
            # Check team coordination
            checks.extend(self._check_team_coordination())
            
            # Check autonomy system
            checks.extend(self._check_autonomy_system())
            
            # Save results
            self._save_results(checks)
            
            return checks
            
        except Exception as e:
            self.logger.error(f"Error running diagnostic: {str(e)}")
            return [HealthCheck(
                component="diagnostic_system",
                status="critical",
                message=f"Diagnostic system error: {str(e)}"
            )]
    
    def _check_core_managers(self) -> List[HealthCheck]:
        """Check critical methods in core managers."""
        checks = []
        
        for manager_name, required_methods in self.critical_methods.items():
            try:
                # Try to import the manager
                module = importlib.import_module(f"core.{manager_name}")
                manager_class = getattr(module, manager_name.title().replace("_", ""))
                
                # Check for required methods
                missing_methods = []
                for method in required_methods:
                    if not hasattr(manager_class, method):
                        missing_methods.append(method)
                
                if missing_methods:
                    checks.append(HealthCheck(
                        component=manager_name,
                        status="critical",
                        message=f"Missing critical methods: {', '.join(missing_methods)}",
                        details={"missing_methods": missing_methods}
                    ))
                else:
                    checks.append(HealthCheck(
                        component=manager_name,
                        status="healthy",
                        message="All critical methods present",
                        details={"methods_checked": required_methods}
                    ))
                    
            except Exception as e:
                checks.append(HealthCheck(
                    component=manager_name,
                    status="critical",
                    message=f"Error checking manager: {str(e)}"
                ))
        
        return checks
    
    def _check_plugin_system(self) -> List[HealthCheck]:
        """Check plugin system health."""
        checks = []
        
        try:
            # Check plugin directory
            plugin_dir = Path("plugins")
            if not plugin_dir.exists():
                checks.append(HealthCheck(
                    component="plugin_system",
                    status="critical",
                    message="Plugin directory not found"
                ))
            else:
                # Count Python files
                py_files = list(plugin_dir.glob("*.py"))
                if not py_files:
                    checks.append(HealthCheck(
                        component="plugin_system",
                        status="warning",
                        message="No Python plugin files found"
                    ))
                else:
                    checks.append(HealthCheck(
                        component="plugin_system",
                        status="healthy",
                        message=f"Found {len(py_files)} plugin files",
                        details={"plugin_count": len(py_files)}
                    ))
                    
        except Exception as e:
            checks.append(HealthCheck(
                component="plugin_system",
                status="critical",
                message=f"Error checking plugin system: {str(e)}"
            ))
        
        return checks
    
    def _check_resource_management(self) -> List[HealthCheck]:
        """Check resource management system."""
        checks = []
        
        try:
            # Import resource manager
            from core.resource_manager import resource_manager
            
            # Check resource status
            status = resource_manager.get_status()
            if status == "error":
                checks.append(HealthCheck(
                    component="resource_manager",
                    status="critical",
                    message="Resource manager in error state"
                ))
            else:
                checks.append(HealthCheck(
                    component="resource_manager",
                    status="healthy",
                    message=f"Resource manager status: {status}"
                ))
                
        except Exception as e:
            checks.append(HealthCheck(
                component="resource_manager",
                status="critical",
                message=f"Error checking resource manager: {str(e)}"
            ))
        
        return checks
    
    def _check_memory_system(self) -> List[HealthCheck]:
        """Check memory system health."""
        checks = []
        
        try:
            # Import memory system
            from core.memory_system import memory_system
            
            # Check memory operations
            test_key = "health_check_" + datetime.now().isoformat()
            test_value = {"test": True}
            
            # Test store
            memory_system.store(test_key, test_value)
            
            # Test retrieve
            retrieved = memory_system.retrieve(test_key)
            if retrieved != test_value:
                checks.append(HealthCheck(
                    component="memory_system",
                    status="critical",
                    message="Memory system data integrity check failed"
                ))
            else:
                checks.append(HealthCheck(
                    component="memory_system",
                    status="healthy",
                    message="Memory system operational"
                ))
                
        except Exception as e:
            checks.append(HealthCheck(
                component="memory_system",
                status="critical",
                message=f"Error checking memory system: {str(e)}"
            ))
        
        return checks
    
    def _check_team_coordination(self) -> List[HealthCheck]:
        """Check team coordination system."""
        checks = []
        
        try:
            # Import team coordinator
            from core.team_coordinator import team_coordinator
            
            # Check if process method exists
            if not hasattr(team_coordinator, "process"):
                checks.append(HealthCheck(
                    component="team_coordinator",
                    status="critical",
                    message="Missing process method in team coordinator"
                ))
            else:
                checks.append(HealthCheck(
                    component="team_coordinator",
                    status="healthy",
                    message="Team coordinator operational"
                ))
                
        except Exception as e:
            checks.append(HealthCheck(
                component="team_coordinator",
                status="critical",
                message=f"Error checking team coordinator: {str(e)}"
            ))
        
        return checks
    
    def _check_autonomy_system(self) -> List[HealthCheck]:
        """Check autonomy system health."""
        checks = []
        
        try:
            # Import autonomy loop
            from core.autonomy_loop import autonomy_loop
            
            # Check critical methods
            required_methods = ["start", "stop", "process_goals"]
            missing_methods = [
                method for method in required_methods
                if not hasattr(autonomy_loop, method)
            ]
            
            if missing_methods:
                checks.append(HealthCheck(
                    component="autonomy_loop",
                    status="critical",
                    message=f"Missing methods: {', '.join(missing_methods)}"
                ))
            else:
                checks.append(HealthCheck(
                    component="autonomy_loop",
                    status="healthy",
                    message="Autonomy loop operational"
                ))
                
        except Exception as e:
            checks.append(HealthCheck(
                component="autonomy_loop",
                status="critical",
                message=f"Error checking autonomy system: {str(e)}"
            ))
        
        return checks
    
    def _save_results(self, checks: List[HealthCheck]) -> None:
        """Save diagnostic results to file."""
        try:
            # Convert checks to serializable format
            serializable_checks = [
                {
                    "component": check.component,
                    "status": check.status,
                    "message": check.message,
                    "details": check.details,
                    "timestamp": check.timestamp
                }
                for check in checks
            ]
            
            # Save to file
            with open(self.results_file, 'w') as f:
                json.dump(serializable_checks, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Error saving diagnostic results: {str(e)}")
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get a summary of system health.
        
        Returns:
            Dictionary with health summary statistics
        """
        try:
            if not self.results_file.exists():
                return {"status": "unknown", "message": "No diagnostic results available"}
            
            with open(self.results_file, 'r') as f:
                checks = json.load(f)
            
            # Count statuses
            status_counts = {
                "healthy": 0,
                "warning": 0,
                "critical": 0
            }
            
            for check in checks:
                status_counts[check["status"]] += 1
            
            # Calculate health score
            total_checks = len(checks)
            if total_checks == 0:
                health_score = 0
            else:
                health_score = (
                    status_counts["healthy"] +
                    status_counts["warning"] * 0.5
                ) / total_checks
            
            # Determine overall status
            if health_score >= 0.9:
                overall_status = "healthy"
            elif health_score >= 0.7:
                overall_status = "warning"
            else:
                overall_status = "critical"
            
            return {
                "status": overall_status,
                "health_score": health_score,
                "checks": status_counts,
                "total_checks": total_checks,
                "last_check": checks[-1]["timestamp"] if checks else None
            }
            
        except Exception as e:
            self.logger.error(f"Error getting health summary: {str(e)}")
            return {"status": "error", "message": str(e)}

# Plugin entry point
def run_plugin() -> Dict[str, Any]:
    """Entry point for the plugin.
    
    Returns:
        Dictionary with diagnostic results
    """
    diagnostic = SelfDiagnose()
    checks = diagnostic.run_diagnostic()
    return diagnostic.get_health_summary()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    results = run_plugin()
    print(f"System Health Status: {results['status']}")
    print(f"Health Score: {results['health_score']:.2f}")
    print(f"Checks: {results['checks']}") 