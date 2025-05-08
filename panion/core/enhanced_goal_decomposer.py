"""
Enhanced Goal Decomposer with dynamic subgoal spawning, plugin recommendation, and LLM refinement.
"""

import logging
from typing import Dict, Any, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import json
import asyncio
from enum import Enum
from pathlib import Path

from core.types import (
    SubGoal,
    DecompositionResult,
    RetryStrategy
)
from core.reflection import reflection_system
from core.service_locator import service_locator
from core.retry_refinement_loop import RetryRefinementLoop

class DecompositionStrategy(Enum):
    """Strategy for decomposing goals."""
    HIERARCHICAL = "hierarchical"  # Break down into subgoals
    SEQUENTIAL = "sequential"      # Linear sequence of tasks
    PARALLEL = "parallel"         # Independent parallel tasks
    ADAPTIVE = "adaptive"         # Dynamic based on context

@dataclass
class SubGoal:
    """Represents a subgoal in the decomposition."""
    id: str
    description: str
    parent_id: str
    dependencies: List[str] = field(default_factory=list)
    required_plugins: List[str] = field(default_factory=list)
    estimated_duration: float = 0.0
    priority: float = 0.5
    status: str = "pending"
    created_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    test_cases: List[Dict[str, Any]] = field(default_factory=list)
    retry_strategy: Optional[Dict[str, Any]] = None

@dataclass
class DecompositionResult:
    """Result of goal decomposition."""
    goal_id: str
    subgoals: List[SubGoal]
    strategy: DecompositionStrategy
    confidence: float
    estimated_duration: float
    required_plugins: Set[str]
    metadata: Dict[str, Any] = field(default_factory=dict)
    test_suite: Dict[str, Any] = field(default_factory=dict)

class EnhancedGoalDecomposer:
    """Enhanced goal decomposition with dynamic spawning and LLM refinement."""
    
    def __init__(self, config_path: str = "config/goal_decomposer.yaml"):
        """Initialize the enhanced goal decomposer."""
        self.logger = logging.getLogger(__name__)
        self.config_path = Path(config_path)
        self.config = self._load_config()
        
        # Initialize components
        self.retry_loop = service_locator.get_service('retry_refinement')
        self.memory_manager = service_locator.get_service('memory_manager')
        self.plugin_manager = service_locator.get_service('plugin_manager')
        
        # State
        self._active_decompositions: Dict[str, DecompositionResult] = {}
        self._subgoal_history: Dict[str, List[SubGoal]] = {}
        
        # Register with service locator
        service_locator.register_service('goal_decomposer', self)

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

    async def decompose_goal(
        self,
        goal_id: str,
        description: str,
        context: Dict[str, Any] = None
    ) -> DecompositionResult:
        """Decompose a goal into subgoals with dynamic spawning."""
        try:
            # Initial decomposition
            result = await self._analyze_goal(goal_id, description, context)
            
            # LLM refinement loop
            for _ in range(self.config.get("refinement_iterations", 3)):
                refinement = await self._refine_decomposition(result)
                if refinement["confidence"] > result.confidence:
                    result = refinement["result"]
                else:
                    break
            
            # Dynamic subgoal spawning
            await self._spawn_dynamic_subgoals(result)
            
            # Plugin recommendation
            await self._recommend_plugins(result)
            
            # Store result
            self._active_decompositions[goal_id] = result
            self._subgoal_history[goal_id] = result.subgoals
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error decomposing goal: {e}")
            raise

    async def _analyze_goal(
        self,
        goal_id: str,
        description: str,
        context: Dict[str, Any]
    ) -> DecompositionResult:
        """Analyze goal using GPT-4."""
        try:
            prompt = f"""
            Analyze the following goal and decompose it into subgoals:
            
            Goal ID: {goal_id}
            Description: {description}
            Context: {json.dumps(context or {})}
            
            Consider:
            1. Required capabilities
            2. Dependencies between subgoals
            3. Estimated durations
            4. Priority levels
            5. Required plugins
            
            Return the analysis as JSON with the following structure:
            {{
                "strategy": "hierarchical|sequential|parallel|adaptive",
                "subgoals": [
                    {{
                        "id": "subgoal_id",
                        "description": "subgoal description",
                        "dependencies": ["dependency_ids"],
                        "estimated_duration": duration_in_seconds,
                        "priority": priority_0_to_1
                    }}
                ],
                "confidence": confidence_0_to_1,
                "estimated_duration": total_duration_in_seconds,
                "required_plugins": ["plugin_names"]
            }}
            """
            
            response = await self._call_gpt4(prompt)
            analysis = json.loads(response)
            
            # Create subgoals
            subgoals = [
                SubGoal(
                    id=sg["id"],
                    description=sg["description"],
                    parent_id=goal_id,
                    dependencies=sg.get("dependencies", []),
                    estimated_duration=sg.get("estimated_duration", 0.0),
                    priority=sg.get("priority", 0.5)
                )
                for sg in analysis["subgoals"]
            ]
            
            return DecompositionResult(
                goal_id=goal_id,
                subgoals=subgoals,
                strategy=DecompositionStrategy[analysis["strategy"].upper()],
                confidence=analysis["confidence"],
                estimated_duration=analysis["estimated_duration"],
                required_plugins=set(analysis["required_plugins"]),
                metadata={"context": context}
            )
            
        except Exception as e:
            self.logger.error(f"Error analyzing goal: {e}")
            raise

    async def _refine_decomposition(
        self,
        result: DecompositionResult
    ) -> Dict[str, Any]:
        """Refine decomposition using LLM."""
        try:
            prompt = f"""
            Review and refine the following goal decomposition:
            
            Goal ID: {result.goal_id}
            Strategy: {result.strategy.value}
            Subgoals: {json.dumps([sg.__dict__ for sg in result.subgoals])}
            
            Consider:
            1. Are all dependencies correctly identified?
            2. Are durations and priorities reasonable?
            3. Are there missing subgoals?
            4. Could the strategy be improved?
            
            Return the refined analysis as JSON with the same structure as before.
            """
            
            response = await self._call_gpt4(prompt)
            refinement = json.loads(response)
            
            # Create new subgoals
            subgoals = [
                SubGoal(
                    id=sg["id"],
                    description=sg["description"],
                    parent_id=result.goal_id,
                    dependencies=sg.get("dependencies", []),
                    estimated_duration=sg.get("estimated_duration", 0.0),
                    priority=sg.get("priority", 0.5)
                )
                for sg in refinement["subgoals"]
            ]
            
            return {
                "result": DecompositionResult(
                    goal_id=result.goal_id,
                    subgoals=subgoals,
                    strategy=DecompositionStrategy[refinement["strategy"].upper()],
                    confidence=refinement["confidence"],
                    estimated_duration=refinement["estimated_duration"],
                    required_plugins=set(refinement["required_plugins"]),
                    metadata=result.metadata
                ),
                "confidence": refinement["confidence"]
            }
            
        except Exception as e:
            self.logger.error(f"Error refining decomposition: {e}")
            return {"result": result, "confidence": result.confidence}

    async def _spawn_dynamic_subgoals(self, result: DecompositionResult) -> None:
        """Spawn additional subgoals based on analysis."""
        try:
            # Analyze existing subgoals
            prompt = f"""
            Analyze the following subgoals and suggest additional subgoals that might be needed:
            
            Subgoals: {json.dumps([sg.__dict__ for sg in result.subgoals])}
            
            Consider:
            1. Missing intermediate steps
            2. Error handling requirements
            3. Validation steps
            4. Cleanup tasks
            
            Return additional subgoals as JSON array with the same structure as before.
            """
            
            response = await self._call_gpt4(prompt)
            additional_subgoals = json.loads(response)
            
            # Add new subgoals
            for sg in additional_subgoals:
                new_subgoal = SubGoal(
                    id=f"{result.goal_id}_dynamic_{len(result.subgoals)}",
                    description=sg["description"],
                    parent_id=result.goal_id,
                    dependencies=sg.get("dependencies", []),
                    estimated_duration=sg.get("estimated_duration", 0.0),
                    priority=sg.get("priority", 0.5)
                )
                result.subgoals.append(new_subgoal)
                
        except Exception as e:
            self.logger.error(f"Error spawning dynamic subgoals: {e}")

    async def _recommend_plugins(self, result: DecompositionResult) -> None:
        """Recommend plugins for each subgoal."""
        try:
            for subgoal in result.subgoals:
                prompt = f"""
                Recommend plugins for the following subgoal:
                
                Subgoal: {subgoal.description}
                Dependencies: {subgoal.dependencies}
                
                Consider:
                1. Required functionality
                2. Performance requirements
                3. Error handling needs
                4. Integration requirements
                
                Return recommended plugins as JSON array of plugin names.
                """
                
                response = await self._call_gpt4(prompt)
                recommended_plugins = json.loads(response)
                
                # Update subgoal with recommended plugins
                subgoal.required_plugins = recommended_plugins
                
        except Exception as e:
            self.logger.error(f"Error recommending plugins: {e}")

    async def _call_gpt4(self, prompt: str) -> str:
        """Call GPT-4 API."""
        # Implementation would use OpenAI API
        # For now, return mock response
        return json.dumps({
            "strategy": "hierarchical",
            "subgoals": [
                {
                    "id": "mock_subgoal",
                    "description": "Mock subgoal",
                    "dependencies": [],
                    "estimated_duration": 1.0,
                    "priority": 0.5
                }
            ],
            "confidence": 0.8,
            "estimated_duration": 1.0,
            "required_plugins": ["mock_plugin"]
        })

    def get_active_decompositions(self) -> Dict[str, DecompositionResult]:
        """Get active decompositions."""
        return self._active_decompositions

    def get_subgoal_history(self, goal_id: Optional[str] = None) -> Dict[str, List[SubGoal]]:
        """Get subgoal history."""
        if goal_id:
            return {goal_id: self._subgoal_history.get(goal_id, [])}
        return self._subgoal_history

    async def _parse_decomposition(self, decomposition: str, goal_id: str) -> DecompositionResult:
        """Parse LLM-generated decomposition into structured format with enhanced features.
        
        Args:
            decomposition: Raw LLM response containing task decomposition
            goal_id: ID of the goal being decomposed
            
        Returns:
            DecompositionResult containing structured plan with:
            - subgoals: List of SubGoal objects with enhanced metadata
            - strategy: DecompositionStrategy for the plan
            - confidence: Confidence score for the decomposition
            - estimated_duration: Total estimated duration
            - required_plugins: Set of required plugin IDs
            - test_suite: Test cases for validating the plan
        """
        try:
            # Parse the raw decomposition
            parsed = json.loads(decomposition)
            
            # Extract strategy and confidence
            strategy = DecompositionStrategy[parsed.get("strategy", "ADAPTIVE").upper()]
            confidence = float(parsed.get("confidence", 0.5))
            
            # Create subgoals with enhanced metadata
            subgoals = []
            for sg in parsed.get("subgoals", []):
                # Generate unique ID if not provided
                subgoal_id = sg.get("id", f"{goal_id}_sub_{len(subgoals)}")
                
                # Extract test cases if provided
                test_cases = sg.get("test_cases", [])
                if not test_cases:
                    # Generate basic test cases
                    test_cases = [
                        {
                            "name": f"test_{subgoal_id}_basic",
                            "description": f"Basic validation for {sg['description']}",
                            "expected_outcome": "success",
                            "validation_criteria": sg.get("success_criteria", [])
                        }
                    ]
                
                # Extract retry strategy if provided
                retry_strategy = sg.get("retry_strategy", {
                    "max_attempts": 3,
                    "backoff_factor": 1.5,
                    "timeout": 300,
                    "plugin_synthesis": {
                        "enabled": True,
                        "confidence_threshold": 0.7
                    }
                })
                
                # Create SubGoal object
                subgoal = SubGoal(
                    id=subgoal_id,
                    description=sg["description"],
                    parent_id=goal_id,
                    dependencies=sg.get("dependencies", []),
                    required_plugins=sg.get("required_plugins", []),
                    estimated_duration=float(sg.get("estimated_duration", 0.0)),
                    priority=float(sg.get("priority", 0.5)),
                    metadata=sg.get("metadata", {}),
                    test_cases=test_cases,
                    retry_strategy=retry_strategy
                )
                subgoals.append(subgoal)
            
            # Generate test suite
            test_suite = {
                "goal_id": goal_id,
                "test_cases": [],
                "integration_tests": [],
                "performance_tests": []
            }
            
            # Add individual subgoal test cases
            for subgoal in subgoals:
                test_suite["test_cases"].extend(subgoal.test_cases)
            
            # Generate integration tests
            integration_tests = await self._generate_integration_tests(subgoals)
            test_suite["integration_tests"] = integration_tests
            
            # Generate performance tests
            performance_tests = await self._generate_performance_tests(subgoals)
            test_suite["performance_tests"] = performance_tests
            
            # Create result
            result = DecompositionResult(
                goal_id=goal_id,
                subgoals=subgoals,
                strategy=strategy,
                confidence=confidence,
                estimated_duration=float(parsed.get("estimated_duration", 0.0)),
                required_plugins=set(parsed.get("required_plugins", [])),
                metadata=parsed.get("metadata", {}),
                test_suite=test_suite
            )
            
            # Log reflection
            await reflection_system.generate_reflection(
                "goal_decomposition",
                f"Parsed decomposition for goal {goal_id}",
                {
                    "goal_id": goal_id,
                    "strategy": strategy.value,
                    "confidence": confidence,
                    "subgoal_count": len(subgoals),
                    "test_case_count": len(test_suite["test_cases"])
                }
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error parsing decomposition: {e}")
            await reflection_system.generate_reflection(
                "goal_decomposition_error",
                f"Error parsing decomposition for goal {goal_id}",
                {
                    "goal_id": goal_id,
                    "error": str(e)
                }
            )
            raise

    async def _generate_integration_tests(self, subgoals: List[SubGoal]) -> List[Dict[str, Any]]:
        """Generate integration tests for subgoals."""
        try:
            # Get LLM service
            llm_service = service_locator.get_service('llm_service')
            
            # Prepare prompt
            prompt = f"""
            Generate integration tests for the following subgoals:
            {json.dumps([sg.__dict__ for sg in subgoals], indent=2)}
            
            Focus on:
            1. Dependencies between subgoals
            2. Data flow between subgoals
            3. Error propagation
            4. State management
            
            Return tests as JSON array with the following structure:
            [
                {{
                    "name": "test_name",
                    "description": "test_description",
                    "subgoals": ["subgoal_ids"],
                    "expected_outcome": "success|failure",
                    "validation_criteria": ["criteria"]
                }}
            ]
            """
            
            # Generate tests
            response = await llm_service.generate_text(prompt)
            return json.loads(response)
            
        except Exception as e:
            self.logger.error(f"Error generating integration tests: {e}")
            return []

    async def _generate_performance_tests(self, subgoals: List[SubGoal]) -> List[Dict[str, Any]]:
        """Generate performance tests for subgoals."""
        try:
            # Get LLM service
            llm_service = service_locator.get_service('llm_service')
            
            # Prepare prompt
            prompt = f"""
            Generate performance tests for the following subgoals:
            {json.dumps([sg.__dict__ for sg in subgoals], indent=2)}
            
            Focus on:
            1. Response time requirements
            2. Resource utilization
            3. Scalability
            4. Load handling
            
            Return tests as JSON array with the following structure:
            [
                {{
                    "name": "test_name",
                    "description": "test_description",
                    "subgoal_id": "subgoal_id",
                    "metrics": {{
                        "response_time": float,
                        "resource_usage": {{
                            "cpu": float,
                            "memory": float
                        }}
                    }},
                    "load_conditions": {{
                        "concurrent_users": int,
                        "data_volume": int
                    }}
                }}
            ]
            """
            
            # Generate tests
            response = await llm_service.generate_text(prompt)
            return json.loads(response)
            
        except Exception as e:
            self.logger.error(f"Error generating performance tests: {e}")
            return []

# Create singleton instance
enhanced_goal_decomposer = EnhancedGoalDecomposer() 