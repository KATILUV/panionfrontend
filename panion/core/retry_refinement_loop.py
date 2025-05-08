"""
Retry and Refinement Loop for handling task failures and self-healing.
"""

import logging
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
import json
import asyncio
from pathlib import Path
import shutil
import os

from core.types import (
    SubGoal,
    RetryStrategy,
    RetryContext,
    FailureAnalysis
)
from core.reflection import reflection_system
from core.service_locator import service_locator
from plugins.plugin_synthesizer import plugin_synthesizer

class RetryRefinementLoop:
    """Handles task retries with failure analysis and self-healing."""
    
    def __init__(self, config_path: str = "config/retry_refinement.yaml"):
        """Initialize the retry refinement loop."""
        self.logger = logging.getLogger(__name__)
        self.config_path = Path(config_path)
        self.config = self._load_config()
        
        # Initialize components
        self.goal_decomposer = service_locator.get_service('goal_decomposer')
        self.memory_manager = service_locator.get_service('memory_manager')
        self.plugin_manager = service_locator.get_service('plugin_manager')
        
        # State
        self._retry_contexts: Dict[str, RetryContext] = {}
        self._failure_history: Dict[str, List[FailureAnalysis]] = {}
        self._healing_strategies: Dict[str, Callable] = {}
        self._synthesis_attempts: Dict[str, int] = {}  # Track synthesis attempts per goal
        self._max_synthesis_attempts = 3  # Maximum number of synthesis attempts per goal
        self._cleanup_threshold = 100  # Maximum number of failed plugins before cleanup
        self._failed_plugins: List[str] = []  # Track failed plugin IDs
        
        # Register with service locator
        service_locator.register_service('retry_refinement', self)

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration."""
        try:
            if not self.config_path.exists():
                raise FileNotFoundError(f"Config file not found: {self.config_path}")
            
            with open(self.config_path) as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"Error loading config: {e}")
            return {}

    async def execute_with_retry(
        self,
        task_id: str,
        subgoal: SubGoal,
        executor: Callable,
        *args,
        **kwargs
    ) -> Any:
        """Execute a task with retry logic."""
        context = self._get_or_create_context(task_id, subgoal.id)
        
        while context.attempt < context.max_attempts:
            try:
                reflection_system.log_thought(
                    "retry_refinement",
                    f"Attempting task {task_id} (attempt {context.attempt + 1}/{context.max_attempts})",
                    {"task_id": task_id, "subgoal": subgoal.id}
                )
                
                result = await executor(*args, **kwargs)
                
                # Task succeeded
                reflection_system.log_thought(
                    "retry_refinement",
                    f"Task {task_id} succeeded on attempt {context.attempt + 1}",
                    {"task_id": task_id, "subgoal": subgoal.id}
                )
                
                return result
                
            except Exception as e:
                context.attempt += 1
                context.last_error = str(e)
                context.last_error_time = datetime.now()
                
                # Analyze failure
                analysis = await self._analyze_failure(task_id, subgoal, e)
                self._record_failure(analysis)
                
                if context.attempt >= context.max_attempts:
                    reflection_system.log_thought(
                        "retry_refinement",
                        f"Task {task_id} failed after {context.max_attempts} attempts",
                        {
                            "task_id": task_id,
                            "subgoal": subgoal.id,
                            "error": str(e),
                            "analysis": analysis.__dict__
                        }
                    )
                    
                    # Try plugin synthesis as a last resort
                    if self._should_trigger_plugin_synthesis(analysis):
                        try:
                            plugin_id = await self._synthesize_plugin(analysis, subgoal)
                            if plugin_id:
                                context.synthesized_plugin = plugin_id
                                reflection_system.log_thought(
                                    "retry_refinement",
                                    f"Synthesized plugin {plugin_id} for task {task_id}",
                                    {
                                        "task_id": task_id,
                                        "plugin_id": plugin_id,
                                        "analysis": analysis.__dict__
                                    }
                                )
                                # Retry with the new plugin
                                return await self._retry_with_synthesized_plugin(
                                    task_id,
                                    subgoal,
                                    plugin_id,
                                    executor,
                                    *args,
                                    **kwargs
                                )
                        except Exception as synthesis_error:
                            self.logger.error(f"Plugin synthesis failed: {synthesis_error}")
                    
                    raise
                
                # Calculate delay
                delay = self._calculate_retry_delay(context)
                
                reflection_system.log_thought(
                    "retry_refinement",
                    f"Retrying task {task_id} after {delay} seconds",
                    {
                        "task_id": task_id,
                        "subgoal": subgoal.id,
                        "attempt": context.attempt,
                        "delay": delay
                    }
                )
                
                await asyncio.sleep(delay)

    def _get_or_create_context(self, task_id: str, subgoal_id: str) -> RetryContext:
        """Get or create retry context."""
        if task_id not in self._retry_contexts:
            self._retry_contexts[task_id] = RetryContext(
                task_id=task_id,
                subgoal_id=subgoal_id,
                max_attempts=self.config.get("max_attempts", 3),
                strategy=RetryStrategy[self.config.get("default_strategy", "LINEAR").upper()]
            )
        return self._retry_contexts[task_id]

    async def _analyze_failure(
        self,
        task_id: str,
        subgoal: SubGoal,
        error: Exception
    ) -> FailureAnalysis:
        """Analyze task failure."""
        try:
            # Use GPT-4 to analyze failure
            prompt = f"""
            Analyze the following task failure:
            
            Task ID: {task_id}
            Subgoal: {subgoal.description}
            Error: {str(error)}
            
            Consider:
            1. Root cause analysis
            2. Potential fixes
            3. Impact on overall goal
            4. Required changes to prevent recurrence
            
            Return the analysis as JSON with the following structure:
            {{
                "root_cause": "description of root cause",
                "suggested_fixes": ["list", "of", "fixes"],
                "confidence": confidence_score_0_to_1
            }}
            """
            
            response = await self._call_gpt4(prompt)
            analysis_data = json.loads(response)
            
            return FailureAnalysis(
                task_id=task_id,
                subgoal_id=subgoal.id,
                error_type=type(error).__name__,
                error_message=str(error),
                timestamp=datetime.now(),
                context={
                    "subgoal": subgoal.__dict__,
                    "attempt": self._retry_contexts[task_id].attempt
                },
                root_cause=analysis_data.get("root_cause"),
                suggested_fixes=analysis_data.get("suggested_fixes", []),
                confidence=analysis_data.get("confidence", 0.0)
            )
            
        except Exception as e:
            self.logger.error(f"Error analyzing failure: {e}")
            return FailureAnalysis(
                task_id=task_id,
                subgoal_id=subgoal.id,
                error_type=type(error).__name__,
                error_message=str(error),
                timestamp=datetime.now(),
                context={},
                confidence=0.0
            )

    def _record_failure(self, analysis: FailureAnalysis) -> None:
        """Record failure analysis."""
        if analysis.task_id not in self._failure_history:
            self._failure_history[analysis.task_id] = []
        self._failure_history[analysis.task_id].append(analysis)

    def _calculate_retry_delay(self, context: RetryContext) -> float:
        """Calculate delay before next retry."""
        if context.strategy == RetryStrategy.LINEAR:
            return context.retry_delay
            
        elif context.strategy == RetryStrategy.EXPONENTIAL:
            return context.retry_delay * (2 ** (context.attempt - 1))
            
        elif context.strategy == RetryStrategy.ADAPTIVE:
            # Analyze failure patterns to determine delay
            failures = self._failure_history.get(context.task_id, [])
            if len(failures) > 1:
                # Calculate average time between failures
                intervals = [
                    (f2.timestamp - f1.timestamp).total_seconds()
                    for f1, f2 in zip(failures[:-1], failures[1:])
                ]
                if intervals:
                    return sum(intervals) / len(intervals)
            return context.retry_delay
            
        elif context.strategy == RetryStrategy.SMART:
            # Use ML to predict optimal delay
            # For now, use exponential backoff
            return context.retry_delay * (2 ** (context.attempt - 1))
            
        return context.retry_delay

    async def _call_gpt4(self, prompt: str) -> str:
        """Call GPT-4 API."""
        # Implementation would use OpenAI API
        # For now, return mock response
        return json.dumps({
            "root_cause": "Mock root cause",
            "suggested_fixes": ["Mock fix 1", "Mock fix 2"],
            "confidence": 0.8
        })

    def register_healing_strategy(self, error_type: str, strategy: Callable) -> None:
        """Register a healing strategy for a specific error type."""
        self._healing_strategies[error_type] = strategy

    def get_failure_history(self, task_id: Optional[str] = None) -> Dict[str, List[FailureAnalysis]]:
        """Get failure history."""
        if task_id:
            return {task_id: self._failure_history.get(task_id, [])}
        return self._failure_history

    def get_retry_contexts(self) -> Dict[str, RetryContext]:
        """Get retry contexts."""
        return self._retry_contexts

    async def cleanup_failed_plugins(self):
        """Clean up failed plugins that exceed the threshold."""
        try:
            if len(self._failed_plugins) > self._cleanup_threshold:
                self.logger.info(f"Cleaning up {len(self._failed_plugins)} failed plugins")
                
                # Group plugins by goal
                plugins_by_goal = {}
                for plugin_id in self._failed_plugins:
                    goal_id = plugin_id.split('_')[1]  # Extract goal ID from plugin name
                    if goal_id not in plugins_by_goal:
                        plugins_by_goal[goal_id] = []
                    plugins_by_goal[goal_id].append(plugin_id)
                
                # Keep only the most recent plugin per goal
                for goal_id, plugins in plugins_by_goal.items():
                    # Sort by creation time (assuming plugin_id contains timestamp)
                    plugins.sort(reverse=True)
                    # Keep only the most recent one
                    for plugin_id in plugins[1:]:
                        try:
                            # Remove plugin files
                            plugin_dir = Path('plugins') / plugin_id
                            if plugin_dir.exists():
                                shutil.rmtree(plugin_dir)
                            # Remove from failed plugins list
                            self._failed_plugins.remove(plugin_id)
                        except Exception as e:
                            self.logger.error(f"Error cleaning up plugin {plugin_id}: {e}")
                
                self.logger.info("Plugin cleanup completed")
                
        except Exception as e:
            self.logger.error(f"Error during plugin cleanup: {e}")
            
    def _should_trigger_plugin_synthesis(self, analysis: FailureAnalysis) -> bool:
        """Determine if plugin synthesis should be triggered."""
        try:
            # Check if we've exceeded synthesis attempts for this goal
            goal_id = analysis.task_id.split('_')[0]  # Extract goal ID
            if goal_id not in self._synthesis_attempts:
                self._synthesis_attempts[goal_id] = 0
                
            if self._synthesis_attempts[goal_id] >= self._max_synthesis_attempts:
                self.logger.warning(f"Max synthesis attempts reached for goal {goal_id}")
                return False
                
            # Get synthesis strategies from subgoal
            synthesis_strategies = analysis.context.get("synthesis_strategies", [])
            if not synthesis_strategies:
                return False
                
            error_type = analysis.error_type
            
            for strategy in synthesis_strategies:
                if strategy.get("name") == "plugin_synthesis":
                    conditions = strategy.get("conditions", {})
                    error_types = conditions.get("error_types", [])
                    
                    # Check if error type matches
                    if "*" in error_types or error_type in error_types:
                        # Check confidence threshold
                        confidence_threshold = conditions.get("confidence_threshold", 0.7)
                        if analysis.confidence >= confidence_threshold:
                            # Check attempt count
                            min_attempts = conditions.get("min_attempts", 1)
                            max_attempts = conditions.get("max_attempts", 5)
                            context = self._retry_contexts.get(analysis.task_id)
                            if context and min_attempts <= context.attempt <= max_attempts:
                                # Increment synthesis attempts
                                self._synthesis_attempts[goal_id] += 1
                                return True
                            
            return False
            
        except Exception as e:
            self.logger.error(f"Error checking synthesis trigger: {e}")
            return False
            
    async def _synthesize_plugin(self, analysis: FailureAnalysis, subgoal: SubGoal) -> Optional[str]:
        """Synthesize a new plugin based on failure analysis."""
        try:
            # Prepare plugin synthesis parameters
            plugin_params = {
                "name": f"auto_{analysis.task_id}_{analysis.subgoal_id}",
                "description": f"Auto-generated plugin for {subgoal.description}",
                "type": "service",  # Default to service plugin
                "requirements": [
                    f"Handle {analysis.error_type} errors"
                ] + [f"Implement {fix}" for fix in analysis.suggested_fixes],
                "context": {
                    "error_type": analysis.error_type,
                    "root_cause": analysis.root_cause,
                    "confidence": analysis.confidence
                }
            }
            
            # Synthesize plugin
            result = await plugin_synthesizer.execute(plugin_params)
            
            if result["status"] == "success":
                # Test the new plugin
                test_result = await self.plugin_manager.test_plugin(
                    result["plugin_name"],
                    sandbox=True
                )
                
                if test_result["status"] == "success":
                    # Log successful synthesis
                    reflection_system.log_thought(
                        "retry_refinement",
                        f"Successfully synthesized plugin {result['plugin_name']}",
                        {
                            "task_id": analysis.task_id,
                            "plugin_name": result["plugin_name"],
                            "confidence": analysis.confidence
                        }
                    )
                    return result["plugin_name"]
                else:
                    # Add to failed plugins
                    self._failed_plugins.append(result["plugin_name"])
                    # Trigger cleanup if needed
                    await self.cleanup_failed_plugins()
                    
                    # Log test failure
                    reflection_system.log_thought(
                        "retry_refinement",
                        f"Plugin synthesis test failed for {result['plugin_name']}",
                        {
                            "task_id": analysis.task_id,
                            "plugin_name": result["plugin_name"],
                            "test_result": test_result
                        }
                    )
                    
            return None
            
        except Exception as e:
            self.logger.error(f"Error synthesizing plugin: {e}")
            reflection_system.log_thought(
                "retry_refinement",
                f"Plugin synthesis failed: {str(e)}",
                {
                    "task_id": analysis.task_id,
                    "error": str(e)
                }
            )
            return None

    async def _retry_with_synthesized_plugin(
        self,
        task_id: str,
        subgoal: SubGoal,
        plugin_id: str,
        original_executor: Callable,
        *args,
        **kwargs
    ) -> Any:
        """Retry the task using the synthesized plugin."""
        try:
            # Get the synthesized plugin
            plugin = self.plugin_manager.get_plugin(plugin_id)
            if not plugin:
                raise ValueError(f"Synthesized plugin {plugin_id} not found")
                
            # Execute with the new plugin
            result = await plugin.execute({
                "task_id": task_id,
                "subgoal": subgoal.__dict__,
                "original_error": self._retry_contexts[task_id].last_error,
                "context": kwargs
            })
            
            if result["status"] == "success":
                reflection_system.log_thought(
                    "retry_refinement",
                    f"Task {task_id} succeeded with synthesized plugin {plugin_id}",
                    {
                        "task_id": task_id,
                        "plugin_id": plugin_id,
                        "result": result
                    }
                )
                return result
                
            # If plugin fails, try original executor as fallback
            return await original_executor(*args, **kwargs)
            
        except Exception as e:
            self.logger.error(f"Error using synthesized plugin: {e}")
            # Fall back to original executor
            return await original_executor(*args, **kwargs)

    async def _cleanup_resources(self, plugin_id: str, resources: Dict[str, Any]) -> None:
        """Clean up resources after refinement attempts."""
        try:
            self.logger.info(f"Cleaning up resources for plugin {plugin_id}")
            
            # Clean up temporary files
            if 'temp_files' in resources:
                for file_path in resources['temp_files']:
                    try:
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            self.logger.debug(f"Removed temporary file: {file_path}")
                    except Exception as e:
                        self.logger.warning(f"Failed to remove temporary file {file_path}: {e}")
            
            # Clean up Docker containers
            if 'docker_containers' in resources:
                for container_id in resources['docker_containers']:
                    try:
                        container = self.docker_client.containers.get(container_id)
                        container.stop(timeout=5)
                        container.remove(force=True)
                        self.logger.debug(f"Removed Docker container: {container_id}")
                    except Exception as e:
                        self.logger.warning(f"Failed to remove Docker container {container_id}: {e}")
            
            # Clean up test artifacts
            if 'test_artifacts' in resources:
                test_dir = Path('data/test_artifacts') / plugin_id
                if test_dir.exists():
                    try:
                        shutil.rmtree(test_dir)
                        self.logger.debug(f"Removed test artifacts directory: {test_dir}")
                    except Exception as e:
                        self.logger.warning(f"Failed to remove test artifacts directory {test_dir}: {e}")
            
            # Clean up cache entries
            if 'cache_entries' in resources:
                for cache_key in resources['cache_entries']:
                    try:
                        self.cache_manager.remove(cache_key)
                        self.logger.debug(f"Removed cache entry: {cache_key}")
                    except Exception as e:
                        self.logger.warning(f"Failed to remove cache entry {cache_key}: {e}")
            
            # Clean up memory
            if 'memory_allocations' in resources:
                for alloc_id in resources['memory_allocations']:
                    try:
                        self.memory_manager.free(alloc_id)
                        self.logger.debug(f"Freed memory allocation: {alloc_id}")
                    except Exception as e:
                        self.logger.warning(f"Failed to free memory allocation {alloc_id}: {e}")
            
            # Clean up database connections
            if 'db_connections' in resources:
                for conn_id in resources['db_connections']:
                    try:
                        self.db_manager.close_connection(conn_id)
                        self.logger.debug(f"Closed database connection: {conn_id}")
                    except Exception as e:
                        self.logger.warning(f"Failed to close database connection {conn_id}: {e}")
            
            # Clean up locks
            if 'locks' in resources:
                for lock_id in resources['locks']:
                    try:
                        self.lock_manager.release(lock_id)
                        self.logger.debug(f"Released lock: {lock_id}")
                    except Exception as e:
                        self.logger.warning(f"Failed to release lock {lock_id}: {e}")
            
            # Clean up metrics
            if 'metrics' in resources:
                try:
                    self.metrics_manager.clear_plugin_metrics(plugin_id)
                    self.logger.debug(f"Cleared metrics for plugin: {plugin_id}")
                except Exception as e:
                    self.logger.warning(f"Failed to clear metrics for plugin {plugin_id}: {e}")
            
            self.logger.info(f"Resource cleanup completed for plugin {plugin_id}")
            
        except Exception as e:
            self.logger.error(
                f"Error during resource cleanup for plugin {plugin_id}: {e}",
                exc_info=True,
                extra={
                    'plugin_id': plugin_id,
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            )
            # Don't re-raise the exception to ensure cleanup continues

# Create singleton instance
retry_refinement_loop = RetryRefinementLoop() 