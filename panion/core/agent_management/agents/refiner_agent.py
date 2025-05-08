"""
Refiner Agent Implementation
Handles task refinement and optimization.
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

from core.reflection import reflection_system
from core.memory_system import memory_system
from core.meta_agent import meta_agent
from core.file_editor import FileEditor
from core.plugin_tester import PluginTester
from core.service_locator import service_locator

class RefinerAgent:
    """Agent responsible for refining plugins based on test failures."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = logging.getLogger("RefinerAgent")
        self.memory_limit = config.get('memory_limit', 800)
        self.retry_cap = config.get('retry_cap', 2)
        self.timeout = config.get('timeout', 180)
        self.capabilities = config.get('capabilities', [])
        self.metadata = config.get('metadata', {})
        self.created_at = datetime.now()
        self.file_editor = FileEditor()
        self.plugin_tester = PluginTester()
        self.llm_service = service_locator.get_service('llm_service')
        
    async def run(self, plugin_id: str) -> Dict[str, Any]:
        """Run the refinement process for a plugin.
        
        Args:
            plugin_id: ID of the plugin to refine
            
        Returns:
            Dictionary containing refinement results
        """
        try:
            self.logger.info(f"Starting refinement process for plugin {plugin_id}")
            
            # Log start to reflection system
            reflection_system.log_thought(
                "refiner_agent",
                f"Starting refinement for plugin {plugin_id}",
                {
                    "plugin_id": plugin_id,
                    "agent_id": self.id,
                    "capabilities": self.capabilities
                }
            )
            
            # Track action start
            start_time = datetime.now()
            
            # Get last 5 test failures
            failures = await self._get_recent_failures(plugin_id)
            if not failures:
                return {
                    "success": True,
                    "plugin_id": plugin_id,
                    "message": "No recent failures found"
                }
            
            # Analyze failures
            analysis = await self._analyze_failures(failures)
            
            # Generate fix
            fix = await self._generate_fix(analysis)
            
            # Apply fix
            backup_path = await self.file_editor.backup_file(fix['file_path'])
            await self.file_editor.apply_changes(fix['file_path'], fix['changes'])
            
            # Retest plugin
            test_result = await self.plugin_tester.test_plugin(
                plugin_id,
                test_cases=analysis['test_cases']
            )
            
            # Track action completion
            duration = (datetime.now() - start_time).total_seconds()
            meta_agent.track_action(
                agent_id=self.id,
                action_type="refine_plugin",
                input_data={"plugin_id": plugin_id},
                output_data={
                    "analysis": analysis,
                    "fix": fix,
                    "test_result": test_result
                },
                duration=duration,
                success=test_result['status'] == 'success',
                metadata={
                    "plugin_id": plugin_id,
                    "backup_path": str(backup_path)
                }
            )
            
            # Store in memory system
            memory_system.add_memory(
                content={
                    "plugin_id": plugin_id,
                    "analysis": analysis,
                    "fix": fix,
                    "test_result": test_result
                },
                importance=0.8,
                context={
                    "plugin_id": plugin_id,
                    "agent_id": self.id
                },
                metadata={
                    "duration": duration,
                    "timestamp": datetime.now().isoformat()
                }
            )
            
            # Log result to reflection system
            reflection_system.log_thought(
                "refiner_agent",
                f"Completed refinement for plugin {plugin_id}",
                {
                    "plugin_id": plugin_id,
                    "test_result": test_result,
                    "fix": fix
                }
            )
            
            return {
                "success": test_result['status'] == 'success',
                "plugin_id": plugin_id,
                "analysis": analysis,
                "fix": fix,
                "test_result": test_result,
                "duration": duration,
                "backup_path": str(backup_path)
            }
            
        except Exception as e:
            self.logger.error(f"Error refining plugin {plugin_id}: {e}")
            
            # Track failure
            duration = (datetime.now() - start_time).total_seconds()
            meta_agent.track_action(
                agent_id=self.id,
                action_type="refine_plugin",
                input_data={"plugin_id": plugin_id},
                output_data={"error": str(e)},
                duration=duration,
                success=False,
                metadata={
                    "plugin_id": plugin_id,
                    "error": str(e)
                }
            )
            
            # Log failure to reflection system
            reflection_system.log_thought(
                "refiner_agent",
                f"Failed to refine plugin {plugin_id}",
                {
                    "plugin_id": plugin_id,
                    "error": str(e),
                    "duration": duration
                }
            )
            
            return {
                "success": False,
                "plugin_id": plugin_id,
                "error": str(e),
                "duration": duration
            }
            
    async def _get_recent_failures(self, plugin_id: str) -> List[Dict[str, Any]]:
        """Get the last 5 test failures for a plugin.
        
        Args:
            plugin_id: ID of the plugin
            
        Returns:
            List of failure records
        """
        try:
            log_file = Path('data/plugin_test_logs') / f"{plugin_id}.json"
            if not log_file.exists():
                return []
                
            with open(log_file) as f:
                logs = json.load(f)
                
            # Filter failures and get last 5
            failures = [
                log for log in logs
                if log.get('status') != 'success'
            ][-5:]
            
            return failures
            
        except Exception as e:
            self.logger.error(f"Error getting recent failures: {e}")
            return []
            
    async def _analyze_failures(self, failures: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze test failures to identify patterns and root causes.
        
        Args:
            failures: List of failure records
            
        Returns:
            Analysis results
        """
        try:
            # Group failures by type
            failure_types = {}
            for failure in failures:
                failure_type = failure.get('error', 'unknown')
                if failure_type not in failure_types:
                    failure_types[failure_type] = []
                failure_types[failure_type].append(failure)
                
            # Identify most common failure type
            most_common = max(
                failure_types.items(),
                key=lambda x: len(x[1])
            )
            
            # Extract test cases from failures
            test_cases = [
                failure.get('test_case', {})
                for failure in most_common[1]
            ]
            
            return {
                'failure_type': most_common[0],
                'failure_count': len(most_common[1]),
                'test_cases': test_cases,
                'failure_details': most_common[1]
            }
            
        except Exception as e:
            self.logger.error(f"Error analyzing failures: {e}")
            return {
                'error': str(e)
            }
            
    async def _generate_fix(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a fix for the identified issues.
        
        Args:
            analysis: Failure analysis results
            
        Returns:
            Fix details including file path and changes
        """
        try:
            # Prepare prompt for LLM
            prompt = f"""Please analyze the following test failures and suggest a fix:

Failure Type: {analysis['failure_type']}
Failure Count: {analysis['failure_count']}

Test Cases:
{json.dumps(analysis['test_cases'], indent=2)}

Failure Details:
{json.dumps(analysis['failure_details'], indent=2)}

Please provide a fix in the following JSON format:
{{
    "file_path": "path/to/file.py",
    "changes": [
        {{
            "type": "replace|insert|delete",
            "start_line": int,
            "end_line": int,
            "content": "code to add/replace"
        }}
    ],
    "confidence": float,
    "explanation": "Explanation of the fix"
}}

Focus on:
1. Root cause of the failures
2. Most efficient fix
3. Maintaining code quality
4. Avoiding regressions
"""

            # Generate fix using LLM
            response = await self.llm_service.generate_text(prompt)
            
            # Parse response
            try:
                fix = json.loads(response)
                
                # Validate fix structure
                required_fields = ['file_path', 'changes', 'confidence', 'explanation']
                if not all(field in fix for field in required_fields):
                    raise ValueError("Missing required fields in fix")
                    
                if not isinstance(fix['changes'], list):
                    raise ValueError("Changes must be a list")
                    
                for change in fix['changes']:
                    if not all(field in change for field in ['type', 'start_line', 'end_line', 'content']):
                        raise ValueError("Invalid change structure")
                        
                return fix
                
            except json.JSONDecodeError as e:
                self.logger.error(f"Error parsing LLM response: {e}")
                return {
                    'error': f"Invalid JSON response: {str(e)}"
                }
                
        except Exception as e:
            self.logger.error(f"Error generating fix: {e}")
            return {
                'error': str(e)
            } 