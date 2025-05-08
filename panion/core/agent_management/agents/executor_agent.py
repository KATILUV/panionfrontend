"""
Executor Agent Implementation
Handles task execution and monitoring.
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

from .plugin_manager import PluginManager
from .goal_scheduler import GoalScheduler
from .plugin_types import PluginError, Memory, MemoryType
from .reflection_engine import ReflectionEngine

logger = logging.getLogger(__name__)

@dataclass
class VersionConstraints:
    """Version compatibility constraints."""
    min_version: Optional[str] = None
    max_version: Optional[str] = None
    allowed_versions: List[str] = field(default_factory=list)
    excluded_versions: List[str] = field(default_factory=list)
    require_exact_match: bool = False
    allow_prerelease: bool = False
    allow_build: bool = False

class ExecutionResult:
    """Structured execution result data"""
    def __init__(
        self,
        subtask_id: str,
        plugin_id: str,
        status: str,
        output: Any,
        error: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.subtask_id = subtask_id
        self.plugin_id = plugin_id
        self.status = status
        self.output = output
        self.error = error
        self.start_time = start_time or datetime.now()
        self.end_time = end_time or datetime.now()
        self.metadata = metadata or {}
        
    @property
    def duration(self) -> float:
        """Calculate execution duration in seconds"""
        return (self.end_time - self.start_time).total_seconds()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary format"""
        return {
            "subtask_id": self.subtask_id,
            "plugin_id": self.plugin_id,
            "status": self.status,
            "output": self.output,
            "error": self.error,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "duration": self.duration,
            "metadata": self.metadata
        }

class ExecutorAgent(AgentBase):
    """Agent responsible for executing subtasks using appropriate plugins"""
    
    def __init__(
        self,
        plugin_manager: PluginManager,
        goal_scheduler: GoalScheduler,
        reflection_engine: Optional[ReflectionEngine] = None
    ):
        agent_id = f"executor_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        super().__init__(agent_id, "executor")
        self.plugin_manager = plugin_manager
        self.goal_scheduler = goal_scheduler
        self.reflection_engine = reflection_engine
        self.results_dir = Path("data/execution_results")
        self.results_dir.mkdir(parents=True, exist_ok=True)
        
    def run(self, subtask_id: str) -> ExecutionResult:
        """
        Execute a subtask using the appropriate plugin
        
        Args:
            subtask_id: ID of subtask to execute
            
        Returns:
            ExecutionResult containing output and metadata
        
        Raises:
            PluginError: If no suitable plugin is found or execution fails
        """
        try:
            self.log_action(
                action="run_subtask",
                result="started",
                goal_id=subtask_id,
                metadata={"subtask_id": subtask_id}
            )
            
            # Get subtask details
            subtask = self.goal_scheduler.get_subtask(subtask_id)
            if not subtask:
                raise PluginError(f"Subtask {subtask_id} not found")
                
            # Find matching plugin
            plugin = self.plugin_manager.get_plugin_for_task(
                task_type=subtask.type,
                config=subtask.config
            )
            if not plugin:
                # Try to find plugin by capabilities
                plugin = self._find_plugin_by_capabilities(subtask)
                if not plugin:
                    raise PluginError(f"No suitable plugin found for subtask {subtask_id}")
            
            # Verify plugin compatibility
            if not self._verify_plugin_compatibility(plugin, subtask):
                raise PluginError(f"Plugin {plugin.metadata.name} is not compatible with subtask {subtask_id}")
                
            # Initialize result tracking
            result = ExecutionResult(
                subtask_id=subtask_id,
                plugin_id=plugin.metadata.name,
                status="running",
                output=None,
                start_time=datetime.now()
            )
            
            # Execute plugin
            try:
                output = plugin.execute(subtask.config)
                result.status = "success"
                result.output = output
                
                self.log_action(
                    action="run_subtask",
                    result="success",
                    goal_id=subtask_id,
                    plugin_id=plugin.metadata.name,
                    metadata={
                        "duration": result.duration,
                        "output": output
                    }
                )
                
            except Exception as e:
                result.status = "failed"
                result.error = str(e)
                
                self.log_action(
                    action="run_subtask",
                    result="failure",
                    goal_id=subtask_id,
                    plugin_id=plugin.metadata.name,
                    metadata={"error": str(e)}
                )
                
            finally:
                result.end_time = datetime.now()
                
            # Store result
            self._store_result(result)
            
            # Create memory
            self._create_memory(result)
            
            # Generate reflection
            if self.reflection_engine:
                self._reflect_on_execution(result)
            
            return result
            
        except Exception as e:
            self.log_action(
                action="run_subtask",
                result="error",
                goal_id=subtask_id,
                metadata={"error": str(e)}
            )
            raise
            
    def _store_result(self, result: ExecutionResult) -> None:
        """Store execution result to file"""
        try:
            result_file = self.results_dir / f"{result.subtask_id}.json"
            with open(result_file, 'w') as f:
                json.dump(result.to_dict(), f, indent=2)
                
            self.log_action(
                action="store_result",
                result="success",
                goal_id=result.subtask_id,
                plugin_id=result.plugin_id,
                metadata={"file": str(result_file)}
            )
            
        except Exception as e:
            self.log_action(
                action="store_result",
                result="failure",
                goal_id=result.subtask_id,
                plugin_id=result.plugin_id,
                metadata={"error": str(e)}
            )

    def _create_memory(self, result: ExecutionResult):
        """Create execution memory from result"""
        memory = Memory(
            content=json.dumps(result.to_dict()),
            type=MemoryType.EXECUTION_RESULT,
            metadata={
                "subtask_id": result.subtask_id,
                "plugin_id": result.plugin_id,
                "status": result.status,
                "duration": result.duration
            }
        )
        self.plugin_manager.memory_manager.add_memory(memory)
    
    def _reflect_on_execution(self, result: ExecutionResult):
        """Generate reflection on execution result"""
        reflection = self.reflection_engine.reflect_on_execution(
            subtask_id=result.subtask_id,
            execution_result=result.to_dict()
        )
        logger.info(f"Generated reflection for subtask {result.subtask_id}")
        return reflection

    def _find_plugin_by_capabilities(self, subtask) -> Optional[Any]:
        """Find plugin by matching capabilities."""
        try:
            required_capabilities = set(subtask.config.get('required_capabilities', []))
            if not required_capabilities:
                return None
                
            best_match = None
            best_score = 0
            
            for plugin in self.plugin_manager.list_plugins():
                plugin_capabilities = set(plugin.metadata.capabilities)
                match_score = len(required_capabilities.intersection(plugin_capabilities))
                
                if match_score > best_score:
                    best_match = plugin
                    best_score = match_score
                    
            return best_match if best_score > 0 else None
            
        except Exception as e:
            self.log_action(
                action="find_plugin",
                result="error",
                goal_id=subtask.id,
                metadata={"error": str(e)}
            )
            return None
            
    def _verify_plugin_compatibility(self, plugin, subtask) -> bool:
        """Verify plugin compatibility with subtask."""
        try:
            # Check version compatibility
            if not self._check_version_compatibility(plugin, subtask):
                return False
                
            # Check resource requirements
            if not self._check_resource_requirements(plugin, subtask):
                return False
                
            # Check performance history
            if not self._check_performance_history(plugin):
                return False
                
            return True
            
        except Exception as e:
            self.log_action(
                action="verify_compatibility",
                result="error",
                goal_id=subtask.id,
                metadata={"error": str(e)}
            )
            return False
            
    def _check_version_compatibility(self, plugin, subtask) -> bool:
        """Check if plugin version is compatible with subtask requirements."""
        try:
            # Get version constraints from subtask config
            version_config = subtask.config.get('version_constraints', {})
            constraints = VersionConstraints(
                min_version=version_config.get('min_version'),
                max_version=version_config.get('max_version'),
                allowed_versions=version_config.get('allowed_versions', []),
                excluded_versions=version_config.get('excluded_versions', []),
                require_exact_match=version_config.get('require_exact_match', False),
                allow_prerelease=version_config.get('allow_prerelease', False),
                allow_build=version_config.get('allow_build', False)
            )
            
            plugin_version = plugin.metadata.version
            
            # Check excluded versions
            if plugin_version in constraints.excluded_versions:
                logger.warning(f"Plugin version {plugin_version} is explicitly excluded")
                return False
                
            # Check allowed versions if specified
            if constraints.allowed_versions and plugin_version not in constraints.allowed_versions:
                logger.warning(f"Plugin version {plugin_version} not in allowed versions")
                return False
                
            # Check version range
            if constraints.min_version:
                if semver.compare(plugin_version, constraints.min_version) < 0:
                    logger.warning(f"Plugin version {plugin_version} below minimum {constraints.min_version}")
                    return False
                    
            if constraints.max_version:
                if semver.compare(plugin_version, constraints.max_version) > 0:
                    logger.warning(f"Plugin version {plugin_version} above maximum {constraints.max_version}")
                    return False
                    
            # Check exact match if required
            if constraints.require_exact_match:
                required_version = subtask.config.get('required_plugin_version')
                if required_version and plugin_version != required_version:
                    logger.warning(f"Plugin version {plugin_version} does not match required {required_version}")
                    return False
                    
            # Check prerelease and build metadata
            if not constraints.allow_prerelease and '-' in plugin_version:
                logger.warning(f"Plugin version {plugin_version} contains prerelease metadata")
                return False
                
            if not constraints.allow_build and '+' in plugin_version:
                logger.warning(f"Plugin version {plugin_version} contains build metadata")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Error checking version compatibility: {e}")
            return False
            
    def _check_resource_requirements(self, plugin, subtask) -> bool:
        """Check if plugin meets resource requirements."""
        required_resources = subtask.config.get('required_resources', {})
        if not required_resources:
            return True
            
        plugin_resources = plugin.metadata.resources
        return all(
            plugin_resources.get(key, 0) >= value
            for key, value in required_resources.items()
        )
        
    def _check_performance_history(self, plugin) -> bool:
        """Check plugin's performance history."""
        try:
            history = self.plugin_manager.get_plugin_metrics(plugin.metadata.name)
            if not history:
                return True
                
            # Check success rate
            success_rate = history.get('success_rate', 1.0)
            if success_rate < 0.7:  # 70% success rate threshold
                return False
                
            # Check average execution time
            avg_time = history.get('average_execution_time', 0)
            if avg_time > 300:  # 5 minute threshold
                return False
                
            return True
            
        except Exception:
            return True  # Default to True if can't check history 

    async def check_performance_history(self, task_id: str) -> Dict[str, Any]:
        """Check performance history for a task with proper error handling."""
        try:
            self.logger.info(f"Checking performance history for task: {task_id}")
            
            # Get task history
            history = await self._get_task_history(task_id)
            if not history:
                self.logger.warning(f"No performance history found for task: {task_id}")
                return {
                    'status': 'no_history',
                    'message': f"No performance history found for task: {task_id}"
                }
                
            # Calculate performance metrics
            try:
                metrics = self._calculate_performance_metrics(history)
                self.logger.info(
                    f"Performance metrics calculated for task: {task_id}",
                    extra={'metrics': metrics}
                )
                return {
                    'status': 'success',
                    'metrics': metrics
                }
            except Exception as e:
                self.logger.error(
                    f"Error calculating performance metrics: {e}",
                    exc_info=True,
                    extra={
                        'task_id': task_id,
                        'error_type': type(e).__name__,
                        'error_details': str(e)
                    }
                )
                return {
                    'status': 'error',
                    'error': f"Failed to calculate performance metrics: {str(e)}"
                }
                
        except Exception as e:
            self.logger.error(
                f"Error checking performance history: {e}",
                exc_info=True,
                extra={
                    'task_id': task_id,
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            )
            return {
                'status': 'error',
                'error': f"Failed to check performance history: {str(e)}"
            }

    async def _get_task_history(self, task_id: str) -> List[Dict[str, Any]]:
        """Get task execution history with proper error handling."""
        try:
            # Query database for task history
            async with self.db_pool.acquire() as conn:
                query = """
                    SELECT execution_time, memory_usage, cpu_usage, status, error
                    FROM task_executions
                    WHERE task_id = $1
                    ORDER BY execution_time DESC
                    LIMIT 100
                """
                rows = await conn.fetch(query, task_id)
                
                if not rows:
                    self.logger.warning(f"No execution history found for task: {task_id}")
                    return []
                    
                history = []
                for row in rows:
                    try:
                        history.append({
                            'execution_time': row['execution_time'],
                            'memory_usage': row['memory_usage'],
                            'cpu_usage': row['cpu_usage'],
                            'status': row['status'],
                            'error': row['error']
                        })
                    except Exception as e:
                        self.logger.error(
                            f"Error processing history row: {e}",
                            exc_info=True,
                            extra={
                                'task_id': task_id,
                                'row': dict(row),
                                'error_type': type(e).__name__,
                                'error_details': str(e)
                            }
                        )
                        continue
                        
                return history
                
        except Exception as e:
            self.logger.error(
                f"Error fetching task history: {e}",
                exc_info=True,
                extra={
                    'task_id': task_id,
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            )
            raise

    def _calculate_performance_metrics(self, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate performance metrics from history with proper error handling."""
        try:
            if not history:
                raise ValueError("Empty history provided for metrics calculation")
                
            # Extract metrics
            execution_times = [h['execution_time'] for h in history if h['execution_time'] is not None]
            memory_usages = [h['memory_usage'] for h in history if h['memory_usage'] is not None]
            cpu_usages = [h['cpu_usage'] for h in history if h['cpu_usage'] is not None]
            
            if not execution_times:
                raise ValueError("No valid execution times found in history")
                
            # Calculate statistics
            metrics = {
                'execution_time': {
                    'mean': statistics.mean(execution_times),
                    'median': statistics.median(execution_times),
                    'min': min(execution_times),
                    'max': max(execution_times),
                    'std_dev': statistics.stdev(execution_times) if len(execution_times) > 1 else 0
                }
            }
            
            if memory_usages:
                metrics['memory_usage'] = {
                    'mean': statistics.mean(memory_usages),
                    'median': statistics.median(memory_usages),
                    'min': min(memory_usages),
                    'max': max(memory_usages),
                    'std_dev': statistics.stdev(memory_usages) if len(memory_usages) > 1 else 0
                }
                
            if cpu_usages:
                metrics['cpu_usage'] = {
                    'mean': statistics.mean(cpu_usages),
                    'median': statistics.median(cpu_usages),
                    'min': min(cpu_usages),
                    'max': max(cpu_usages),
                    'std_dev': statistics.stdev(cpu_usages) if len(cpu_usages) > 1 else 0
                }
                
            # Calculate success rate
            success_count = sum(1 for h in history if h['status'] == 'success')
            metrics['success_rate'] = success_count / len(history)
            
            # Calculate error rate
            error_count = sum(1 for h in history if h['error'] is not None)
            metrics['error_rate'] = error_count / len(history)
            
            return metrics
            
        except Exception as e:
            self.logger.error(
                f"Error calculating performance metrics: {e}",
                exc_info=True,
                extra={
                    'history_length': len(history),
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            )
            raise 