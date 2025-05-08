"""
Guidance-based goal decomposition with structured output.
"""

import json
from typing import Dict, Any, List, Optional
import logging
from dataclasses import dataclass
from pathlib import Path

from core.guidance_config import guidance_config, GuidanceConfig

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class DecompositionResult:
    """Structured result of goal decomposition."""
    subtasks: List[Dict[str, Any]]
    dependencies: Dict[str, List[str]]
    resources: List[Dict[str, Any]]
    success_criteria: List[Dict[str, Any]]
    failure_mitigation: List[Dict[str, Any]]
    metadata: Dict[str, Any]

class GuidanceDecomposer:
    """Goal decomposition using Guidance for structured output."""
    
    def __init__(self, config: Optional[GuidanceConfig] = None):
        """Initialize the decomposer."""
        self.config = config or guidance_config
        self.guidance = self.config.safe_import_guidance()
        if not self.guidance:
            raise ImportError("Failed to import guidance module")
            
        # Load prompt template
        self.prompt_template = self._load_prompt_template()
        
    def _load_prompt_template(self) -> str:
        """Load the prompt template for goal decomposition."""
        template_path = Path(__file__).parent / "templates" / "decomposition_prompt.txt"
        if not template_path.exists():
            # Create default template if not found
            template = """You are a goal decomposition expert. Break down the following goal into structured components:

Goal: {{goal}}
Context: {{context}}

Generate a structured decomposition with the following components:
1. Subtasks: List of specific tasks needed to achieve the goal
2. Dependencies: Map of task dependencies
3. Resources: Required resources for each task
4. Success Criteria: Measurable criteria for task completion
5. Failure Mitigation: Strategies to handle potential failures

Format the response as a JSON object with the following structure:
{
    "subtasks": [
        {
            "id": "task_id",
            "description": "task description",
            "estimated_duration": duration_in_minutes,
            "priority": priority_0_to_1
        }
    ],
    "dependencies": {
        "task_id": ["dependent_task_ids"]
    },
    "resources": [
        {
            "type": "resource_type",
            "name": "resource_name",
            "description": "resource description",
            "required_for": ["task_ids"]
        }
    ],
    "success_criteria": [
        {
            "task_id": "task_id",
            "criteria": ["list", "of", "criteria"],
            "validation_method": "how to validate"
        }
    ],
    "failure_mitigation": [
        {
            "task_id": "task_id",
            "potential_failures": ["list", "of", "failures"],
            "mitigation_strategies": ["list", "of", "strategies"]
        }
    ]
}

Ensure the response is valid JSON and follows the specified structure exactly."""
            
            # Create templates directory if it doesn't exist
            template_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write template to file
            with open(template_path, "w") as f:
                f.write(template)
                
        # Read template from file
        with open(template_path) as f:
            return f.read()
            
    async def decompose_goal(
        self,
        goal: str,
        context: Optional[Dict[str, Any]] = None
    ) -> DecompositionResult:
        """Decompose a goal using Guidance."""
        try:
            # Initialize guidance program
            program = self.guidance.Program(
                self.prompt_template,
                llm=self.guidance.llms.OpenAI(
                    model=self.config.model,
                    temperature=self.config.temperature,
                    max_tokens=self.config.max_tokens
                )
            )
            
            # Execute program
            result = await program(
                goal=goal,
                context=json.dumps(context or {})
            )
            
            # Parse result
            try:
                parsed = json.loads(result)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Guidance response: {e}")
                raise ValueError("Invalid JSON response from Guidance")
                
            # Validate structure
            required_keys = ["subtasks", "dependencies", "resources", "success_criteria", "failure_mitigation"]
            if not all(key in parsed for key in required_keys):
                raise ValueError("Missing required keys in decomposition result")
                
            # Create result object
            return DecompositionResult(
                subtasks=parsed["subtasks"],
                dependencies=parsed["dependencies"],
                resources=parsed["resources"],
                success_criteria=parsed["success_criteria"],
                failure_mitigation=parsed["failure_mitigation"],
                metadata={
                    "goal": goal,
                    "context": context,
                    "model": self.config.model,
                    "temperature": self.config.temperature
                }
            )
            
        except Exception as e:
            logger.error(f"Error in goal decomposition: {e}")
            raise
            
    def validate_decomposition(self, result: DecompositionResult) -> bool:
        """Validate the decomposition result."""
        try:
            # Check subtasks
            if not result.subtasks:
                return False
                
            # Check dependencies
            task_ids = {task["id"] for task in result.subtasks}
            for task_id, deps in result.dependencies.items():
                if task_id not in task_ids:
                    return False
                if not all(dep in task_ids for dep in deps):
                    return False
                    
            # Check resources
            if not result.resources:
                return False
                
            # Check success criteria
            if not result.success_criteria:
                return False
                
            # Check failure mitigation
            if not result.failure_mitigation:
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Error validating decomposition: {e}")
            return False 