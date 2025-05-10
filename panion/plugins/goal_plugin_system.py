import logging
import json
import ast
import importlib
import unittest
from typing import Dict, List, Optional, Set, Tuple, Any
from pathlib import Path
from dataclasses import dataclass, asdict, field
import openai
import time
import threading
from enum import Enum
from datetime import datetime, timedelta

from core.plugin.base import BasePlugin
from core.plugin.composer import PluginComposer
from core.panion_errors import PluginError
from core.plugin.utils.security import safe_exec, safe_eval, CodeSecurityError

class AgentType(Enum):
    MANAGER = "manager"
    DIPLOMAT = "diplomat"
    SCIENTIST = "scientist"
    GENERAL = "general"

class PriorityLevel(Enum):
    CRITICAL = 0
    HIGH = 1
    MEDIUM = 2
    LOW = 3

@dataclass
class Agent:
    """Represents an agent in the goal plugin system with specific capabilities and roles.
    
    Attributes:
        id: Unique identifier for the agent
        type: Type of agent (MANAGER, DIPLOMAT, SCIENTIST, GENERAL)
        capabilities: List of capabilities this agent possesses
        status: Current status of the agent (idle, busy, etc.)
        current_goals: List of goals the agent is currently working on
        collaboration_history: Dictionary mapping agent IDs to lists of collaboration events
    """
    id: str
    type: AgentType
    capabilities: List[str]
    status: str = "idle"
    current_goals: List[str] = field(default_factory=list)
    collaboration_history: Dict[str, List[str]] = field(default_factory=dict)

@dataclass
class GoalAnalysis:
    """Analysis of a goal including required capabilities, implementation plan, and status.
    
    Attributes:
        goal: The goal being analyzed
        required_capabilities: List of capabilities needed to achieve the goal
        missing_capabilities: List of required capabilities that are not available
        existing_capabilities: List of required capabilities that are available
        implementation_plan: Step-by-step plan to achieve the goal
        priority: Priority level of the goal (CRITICAL, HIGH, MEDIUM, LOW)
        deadline: Optional deadline for goal completion
        dependencies: List of other goals this goal depends on
        status: Current status of the goal (pending, in_progress, completed, failed)
        progress: Progress towards goal completion (0.0 to 1.0)
        assigned_agents: List of agent IDs assigned to this goal
        estimated_duration: Estimated time to complete the goal in hours
        risk_level: Risk assessment level (0-10)
        success_criteria: List of criteria to determine goal success
        collaboration_requirements: List of required agent collaborations
    """
    goal: str
    required_capabilities: List[str]
    missing_capabilities: List[str]
    existing_capabilities: List[str]
    implementation_plan: List[str]
    priority: PriorityLevel = PriorityLevel.MEDIUM
    deadline: Optional[str] = None
    dependencies: List[str] = field(default_factory=list)
    status: str = "pending"
    progress: float = 0.0
    assigned_agents: List[str] = field(default_factory=list)
    estimated_duration: Optional[float] = None
    risk_level: int = 0
    success_criteria: List[str] = field(default_factory=list)
    collaboration_requirements: List[str] = field(default_factory=list)

@dataclass
class ExecutionResult:
    """Result of executing a step in the implementation plan.
    
    Attributes:
        step: Description of the executed step
        action: Dictionary containing action details
        status: Status of the execution (success, failure, etc.)
        start_time: When the execution started
        end_time: When the execution ended
        duration: Duration of execution in seconds
        error: Optional error message if execution failed
        output: Optional dictionary containing execution output
        agent_id: Optional ID of the agent that executed the step
        resource_usage: Optional dictionary of resources used during execution
    """
    step: str
    action: Dict
    status: str
    start_time: str
    end_time: str
    duration: float
    error: Optional[str] = None
    output: Optional[Dict] = None
    agent_id: Optional[str] = None
    resource_usage: Optional[Dict] = None

class PluginTestRunner(unittest.TestCase):
    def __init__(self, plugin_code: str, capability: BasePlugin):
        super().__init__()
        self.plugin_code = plugin_code
        self.capability = capability
        self.module = self._load_plugin()
    
    def _load_plugin(self):
        """Dynamically load the plugin code safely."""
        spec = importlib.util.spec_from_loader("plugin", loader=None)
        module = importlib.util.module_from_spec(spec)
        try:
            safe_exec(self.plugin_code, module.__dict__)
        except CodeSecurityError as e:
            self.logger.error(f"Security error loading plugin: {e}")
            raise PluginError(f"Plugin code failed security validation: {str(e)}")
        return module
    
    def test_required_functions(self):
        """Test that all required functions exist."""
        for skill in self.capability.required_skills:
            self.assertTrue(
                hasattr(self.module, skill),
                f"Required function {skill} not found in plugin"
            )
    
    def test_function_signatures(self):
        """Test function signatures match requirements."""
        for func_name, signature in self.capability.function_signatures.items():
            func = getattr(self.module, func_name, None)
            self.assertIsNotNone(func, f"Function {func_name} not found")
            
            # Check parameter count
            expected_params = len(signature.get("parameters", []))
            actual_params = len(func.__code__.co_varnames)
            self.assertEqual(
                expected_params, actual_params,
                f"Function {func_name} has incorrect number of parameters"
            )
    
    def test_performance(self):
        """Test performance requirements."""
        for func_name, requirements in self.capability.performance_requirements.items():
            func = getattr(self.module, func_name, None)
            if func:
                # Measure execution time
                start_time = time.time()
                func()  # Call with default parameters
                duration = time.time() - start_time
                
                # Check if within acceptable limits
                self.assertLess(
                    duration, 1.0,  # 1 second default limit
                    f"Function {func_name} exceeds performance requirements"
                )
    
    def test_error_handling(self):
        """Test error handling requirements."""
        for func_name, error_cases in self.capability.error_handling.items():
            func = getattr(self.module, func_name, None)
            if func:
                for error_case in error_cases:
                    try:
                        func(**error_case["parameters"])
                    except Exception as e:
                        try:
                            expected_error = safe_eval(error_case["expected_error"])
                            self.assertIsInstance(
                                e, expected_error,
                                f"Function {func_name} raised unexpected error type"
                            )
                        except CodeSecurityError as sec_e:
                            self.logger.error(f"Security error in error handling test: {sec_e}")
                            raise PluginError(f"Error case validation failed: {str(sec_e)}")

class GoalPluginSystem(BasePlugin):
    def __init__(self):
        super().__init__(
            name="GoalPluginSystem",
            version="1.0.0",
            description="Manages goal-oriented plugin system with autonomous agents",
            author="Panion Team"
        )
        self.logger = logging.getLogger("GoalPluginSystem")
        self._setup_logging()
        self.goal_history: Dict[str, GoalAnalysis] = {}
        self.execution_history: Dict[str, List[ExecutionResult]] = {}
        self._running = False
        self._autonomous_thread = None
        self.agents: Dict[str, Agent] = {}
        self._initialize_agents()
    
    def _initialize_agents(self):
        """Initialize specialized agents."""
        self.agents = {
            "manager_1": Agent(
                id="manager_1",
                type=AgentType.MANAGER,
                capabilities=["goal_prioritization", "resource_allocation", "team_coordination"]
            ),
            "diplomat_1": Agent(
                id="diplomat_1",
                type=AgentType.DIPLOMAT,
                capabilities=["conflict_resolution", "negotiation", "communication"]
            ),
            "scientist_1": Agent(
                id="scientist_1",
                type=AgentType.SCIENTIST,
                capabilities=["research", "analysis", "experimentation"]
            )
        }
    
    def _setup_logging(self) -> None:
        log_file = Path("logs") / "goal_plugin_system.log"
        log_file.parent.mkdir(exist_ok=True)
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    def analyze_goal(self, goal: str) -> GoalAnalysis:
        """Analyze a goal with enhanced prioritization and agent assignment."""
        try:
            # Enhanced GPT-4 analysis with more context
            prompt = f"""
            Analyze the following goal in detail:
            
            Goal: {goal}
            
            Consider:
            1. Required capabilities and their dependencies
            2. Implementation steps with time estimates
            3. Priority level (CRITICAL, HIGH, MEDIUM, LOW)
            4. Potential risks and mitigation strategies
            5. Success criteria
            6. Required agent types (MANAGER, DIPLOMAT, SCIENTIST)
            7. Collaboration requirements
            
            Return the analysis as JSON with the following structure:
            {{
                "required_capabilities": ["list", "of", "capabilities"],
                "implementation_plan": ["step", "by", "step", "plan"],
                "priority": "CRITICAL/HIGH/MEDIUM/LOW",
                "deadline": "optional deadline",
                "dependencies": ["list", "of", "dependencies"],
                "risks": ["list", "of", "risks"],
                "success_criteria": ["list", "of", "criteria"],
                "estimated_duration": "estimated duration in hours",
                "risk_level": 1-10,
                "required_agent_types": ["list", "of", "required", "agent", "types"],
                "collaboration_requirements": ["list", "of", "collaboration", "requirements"]
            }}
            """
            
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert at analyzing goals and determining required capabilities."},
                    {"role": "user", "content": prompt}
                ]
            )
            
            analysis = json.loads(response.choices[0].message.content)
            
            # Compare with existing capabilities
            existing_capabilities = []
            missing_capabilities = []
            
            for capability in analysis["required_capabilities"]:
                if capability_registry.get_capability(capability):
                    existing_capabilities.append(capability)
                else:
                    missing_capabilities.append(capability)
            
            # Assign appropriate agents
            assigned_agents = self._assign_agents(analysis["required_agent_types"])
            
            goal_analysis = GoalAnalysis(
                goal=goal,
                required_capabilities=analysis["required_capabilities"],
                missing_capabilities=missing_capabilities,
                existing_capabilities=existing_capabilities,
                implementation_plan=analysis["implementation_plan"],
                priority=PriorityLevel[analysis["priority"]],
                deadline=analysis.get("deadline"),
                dependencies=analysis.get("dependencies", []),
                status="analyzed",
                assigned_agents=assigned_agents,
                estimated_duration=analysis.get("estimated_duration"),
                risk_level=analysis.get("risk_level", 0),
                success_criteria=analysis.get("success_criteria", []),
                collaboration_requirements=analysis.get("collaboration_requirements", [])
            )
            
            self.goal_history[goal] = goal_analysis
            self.logger.info(f"Analyzed goal: {goal}")
            return goal_analysis
        
        except Exception as e:
            self.logger.error(f"Error analyzing goal: {str(e)}")
            raise
    
    def _assign_agents(self, required_types: List[str]) -> List[str]:
        """Assign appropriate agents based on required types."""
        assigned_agents = []
        
        for agent_type in required_types:
            for agent_id, agent in self.agents.items():
                if agent.type.value == agent_type.lower() and agent.status == "idle":
                    assigned_agents.append(agent_id)
                    agent.status = "assigned"
                    break
        
        return assigned_agents
    
    def compose_missing_capabilities(self, goal_analysis: GoalAnalysis) -> List[str]:
        """Compose and validate plugins for missing capabilities."""
        composed_plugins = []
        
        for capability_name in goal_analysis.missing_capabilities:
            try:
                # Create enhanced capability definition
                capability = self._create_capability_definition(capability_name, goal_analysis.goal)
                
                # Compose plugin
                plugin_code = plugin_composer.compose_plugin(capability)
                if plugin_code:
                    # Test plugin
                    if self._test_plugin(plugin_code, capability):
                        # Save plugin
                        plugin_path = Path("plugins") / f"{capability_name}.py"
                        plugin_path.parent.mkdir(exist_ok=True)
                        
                        with open(plugin_path, 'w') as f:
                            f.write(plugin_code)
                        
                        # Register capability
                        capability_registry.register_capability(capability)
                        
                        composed_plugins.append(capability_name)
                        self.logger.info(f"Composed and validated plugin for capability: {capability_name}")
                    else:
                        self.logger.error(f"Plugin validation failed for capability: {capability_name}")
            
            except Exception as e:
                self.logger.error(f"Error composing capability {capability_name}: {str(e)}")
        
        return composed_plugins
    
    def _test_plugin(self, plugin_code: str, capability: BasePlugin) -> bool:
        """Test a plugin using unittest."""
        try:
            suite = unittest.TestSuite()
            suite.addTest(PluginTestRunner(plugin_code, capability))
            runner = unittest.TextTestRunner()
            result = runner.run(suite)
            return result.wasSuccessful()
        except Exception as e:
            self.logger.error(f"Error testing plugin: {str(e)}")
            return False
    
    def _create_capability_definition(self, capability_name: str, goal: str) -> BasePlugin:
        """Create an enhanced capability definition using GPT-4."""
        prompt = f"""
        Create a detailed capability definition for: {capability_name}
        This capability is needed to achieve the goal: {goal}
        
        Consider:
        1. Required functions and their signatures
        2. Input/output specifications
        3. Error handling requirements
        4. Performance considerations
        5. Security requirements
        
        Return the definition as JSON with the following structure:
        {{
            "name": "capability_name",
            "description": "detailed description",
            "required_skills": ["list", "of", "required", "skills"],
            "dependencies": ["list", "of", "dependencies"],
            "function_signatures": {{
                "function_name": {{
                    "parameters": ["param1", "param2"],
                    "return_type": "return_type",
                    "description": "function description"
                }}
            }},
            "error_handling": ["list", "of", "error", "cases"],
            "performance_requirements": {{
                "time_complexity": "O(n)",
                "space_complexity": "O(1)"
            }},
            "security_requirements": ["list", "of", "security", "requirements"]
        }}
        """
        
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert at defining agent capabilities."},
                {"role": "user", "content": prompt}
            ]
        )
        
        definition = json.loads(response.choices[0].message.content)
        return BasePlugin(**definition)
    
    def execute_implementation_plan(self, goal_analysis: GoalAnalysis) -> Dict:
        """Execute the implementation plan with detailed tracking."""
        results = []
        self.execution_history[goal_analysis.goal] = []
        
        for step in goal_analysis.implementation_plan:
            try:
                start_time = time.time()
                
                # Determine action
                action = self._determine_action(step, goal_analysis)
                
                if action:
                    # Execute action
                    output = self._execute_action(action)
                    
                    result = ExecutionResult(
                        step=step,
                        action=action,
                        status='success',
                        start_time=time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(start_time)),
                        end_time=time.strftime("%Y-%m-%d %H:%M:%S"),
                        duration=time.time() - start_time,
                        output=output
                    )
                else:
                    result = ExecutionResult(
                        step=step,
                        action={},
                        status='error',
                        start_time=time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(start_time)),
                        end_time=time.strftime("%Y-%m-%d %H:%M:%S"),
                        duration=time.time() - start_time,
                        error='Could not determine action'
                    )
                
                results.append(result)
                self.execution_history[goal_analysis.goal].append(result)
                
                # Update goal progress
                goal_analysis.progress = (len(results) / len(goal_analysis.implementation_plan)) * 100
                if goal_analysis.progress == 100:
                    goal_analysis.status = "completed"
            
            except Exception as e:
                result = ExecutionResult(
                    step=step,
                    action={},
                    status='error',
                    start_time=time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(start_time)),
                    end_time=time.strftime("%Y-%m-%d %H:%M:%S"),
                    duration=time.time() - start_time,
                    error=str(e)
                )
                results.append(result)
                self.execution_history[goal_analysis.goal].append(result)
        
        return {
            'goal': goal_analysis.goal,
            'results': [asdict(r) for r in results],
            'progress': goal_analysis.progress,
            'status': goal_analysis.status
        }
    
    def _execute_action(self, action: Dict) -> Optional[Dict]:
        """Execute an action with enhanced types."""
        action_type = action.get('type')
        parameters = action.get('parameters', {})
        
        if action_type == 'web_navigation':
            return action_handlers.handle_web_navigation(
                parameters.get('url'),
                parameters.get('actions', [])
            )
        elif action_type == 'vision_analysis':
            return action_handlers.handle_vision_analysis(
                parameters.get('image_data'),
                parameters.get('prompt')
            )
        elif action_type == 'data_analysis':
            return self._handle_data_analysis(parameters)
        elif action_type == 'agent_collaboration':
            return self._handle_agent_collaboration(parameters)
        elif action_type == 'resource_management':
            return self._handle_resource_management(parameters)
        # Add more action types as needed
        
        return None
    
    def _handle_data_analysis(self, parameters: Dict) -> Dict:
        """Handle data analysis actions."""
        # Implement data analysis logic
        return {"status": "success", "result": "Analysis completed"}
    
    def _handle_agent_collaboration(self, parameters: Dict) -> Dict:
        """Handle agent collaboration actions."""
        agent_id = parameters.get('agent_id')
        message = parameters.get('message')
        
        if agent_id in self.agents:
            agent = self.agents[agent_id]
            # Implement collaboration logic
            return {"status": "success", "response": "Collaboration initiated"}
        
        return {"status": "error", "error": "Agent not found"}
    
    def _handle_resource_management(self, parameters: Dict) -> Dict:
        """Handle resource management actions."""
        # Implement resource management logic
        return {"status": "success", "result": "Resources managed"}
    
    def run_independent_loop(self) -> None:
        """Run the autonomous goal processing loop with agent collaboration."""
        self._running = True
        self._autonomous_thread = threading.Thread(target=self._autonomous_loop)
        self._autonomous_thread.daemon = True
        self._autonomous_thread.start()
    
    def _autonomous_loop(self) -> None:
        """Main autonomous loop with agent collaboration."""
        while self._running:
            try:
                # Check for new goals
                new_goals = self._get_new_goals()
                
                for goal in new_goals:
                    # Analyze goal
                    goal_analysis = self.analyze_goal(goal)
                    
                    # Coordinate with assigned agents
                    self._coordinate_agents(goal_analysis)
                    
                    # Compose missing capabilities
                    if goal_analysis.missing_capabilities:
                        self.compose_missing_capabilities(goal_analysis)
                    
                    # Execute implementation plan
                    self.execute_implementation_plan(goal_analysis)
                
                time.sleep(1)  # Prevent busy waiting
            
            except Exception as e:
                self.logger.error(f"Error in autonomous loop: {str(e)}")
                time.sleep(5)  # Wait before retrying
    
    def _coordinate_agents(self, goal_analysis: GoalAnalysis) -> None:
        """Coordinate collaboration between assigned agents."""
        for agent_id in goal_analysis.assigned_agents:
            agent = self.agents.get(agent_id)
            if agent:
                # Update agent's current goals
                agent.current_goals.append(goal_analysis.goal)
                
                # Record collaboration
                if goal_analysis.goal not in agent.collaboration_history:
                    agent.collaboration_history[goal_analysis.goal] = []
                
                # Add other assigned agents to collaboration history
                for other_agent_id in goal_analysis.assigned_agents:
                    if other_agent_id != agent_id:
                        agent.collaboration_history[goal_analysis.goal].append(other_agent_id)
    
    def _get_new_goals(self) -> List[str]:
        """Get new goals from various sources."""
        # This would be enhanced to check multiple sources
        return []
    
    def ask_panion(self, query: str) -> Dict:
        """Process natural language queries with multi-command support."""
        try:
            prompt = f"""
            Process the following natural language query:
            {query}
            
            This may contain multiple commands or questions. Break it down into individual components.
            
            For each component, determine if it is a:
            1. Goal to be achieved
            2. Question to be answered
            3. Command to be executed
            
            Return the analysis as JSON with the following structure:
            {{
                "components": [
                    {{
                        "type": "goal/question/command",
                        "content": "original content",
                        "action": "specific action to take",
                        "parameters": {{
                            "param1": "value1",
                            "param2": "value2"
                        }}
                    }}
                ],
                "dependencies": ["list", "of", "component", "dependencies"],
                "execution_order": ["ordered", "list", "of", "component", "indices"]
            }}
            """
            
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert at processing natural language queries."},
                    {"role": "user", "content": prompt}
                ]
            )
            
            analysis = json.loads(response.choices[0].message.content)
            results = []
            
            # Process components in specified order
            for idx in analysis["execution_order"]:
                component = analysis["components"][idx]
                
                if component["type"] == "goal":
                    goal_analysis = self.analyze_goal(component["content"])
                    results.append({
                        "type": "goal",
                        "analysis": asdict(goal_analysis)
                    })
                elif component["type"] == "command":
                    result = self._execute_action(component)
                    results.append({
                        "type": "command",
                        "result": result
                    })
                else:
                    results.append({
                        "type": "question",
                        "answer": "This would be enhanced with a proper QA system"
                    })
            
            return {
                "type": "multi_component",
                "results": results,
                "dependencies": analysis["dependencies"]
            }
        
        except Exception as e:
            self.logger.error(f"Error processing query: {str(e)}")
            return {
                "type": "error",
                "error": str(e)
            }
    
    def stop_autonomous_loop(self) -> None:
        """Stop the autonomous loop."""
        self._running = False
        if self._autonomous_thread:
            self._autonomous_thread.join()
    
    def get_goal_history(self) -> Dict[str, GoalAnalysis]:
        """Get the history of analyzed goals."""
        return self.goal_history
    
    def get_execution_history(self, goal: str) -> List[ExecutionResult]:
        """Get execution history for a goal."""
        return self.execution_history.get(goal, [])

# Create global instance
goal_plugin_system = GoalPluginSystem() 