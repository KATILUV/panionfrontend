"""
Strategic Orchestrator Module

Provides high-level goal planning, strategic thinking, and orchestration 
of multiple approaches to accomplish complex tasks.

This module leverages LLM-based reasoning to:
1. Understand high-level goals and intentions
2. Break down complex goals into actionable steps
3. Evaluate different approaches through internal debate
4. Select optimal strategies based on context
5. Monitor execution and adapt strategies as needed
"""

import os
import json
import logging
import time
import asyncio
from typing import List, Dict, Any, Optional, Tuple, Union, Callable
from datetime import datetime
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StrategyStep:
    """Represents a single step in a strategic plan."""
    
    def __init__(self, 
                description: str, 
                action: str,
                params: Dict[str, Any] = None,
                expected_outcome: str = None):
        """
        Initialize a strategy step.
        
        Args:
            description: Human-readable description of the step
            action: Technical action identifier (e.g., "scrape_yelp", "compare_results")
            params: Parameters for the action
            expected_outcome: What we expect this step to produce
        """
        self.description = description
        self.action = action
        self.params = params or {}
        self.expected_outcome = expected_outcome
        self.result = None
        self.success = None
        self.error = None
        self.metrics = {}
        self.start_time = None
        self.end_time = None
        
    def __str__(self) -> str:
        """String representation of the step."""
        return f"Step: {self.description} (Action: {self.action})"
        
    def start(self) -> None:
        """Mark the step as started."""
        self.start_time = time.time()
        
    def complete(self, result: Any, success: bool = True) -> None:
        """Mark the step as completed."""
        self.end_time = time.time()
        self.result = result
        self.success = success
        self.metrics["execution_time"] = self.end_time - self.start_time
        
    def fail(self, error: str) -> None:
        """Mark the step as failed."""
        self.end_time = time.time()
        self.success = False
        self.error = error
        self.metrics["execution_time"] = self.end_time - self.start_time

class Strategy:
    """Represents a complete strategic plan with multiple steps."""
    
    def __init__(self, 
                name: str, 
                description: str, 
                goal: str,
                reasoning: str = None):
        """
        Initialize a strategy.
        
        Args:
            name: Short name for the strategy
            description: Detailed description of the strategy
            goal: The high-level goal this strategy aims to achieve
            reasoning: Explanation of why this strategy was chosen
        """
        self.name = name
        self.description = description
        self.goal = goal
        self.reasoning = reasoning
        self.steps: List[StrategyStep] = []
        self.current_step_index = -1
        self.success = None
        self.metrics = {
            "created_at": datetime.now().isoformat(),
            "total_execution_time": 0,
            "successful_steps": 0,
            "failed_steps": 0
        }
        
    def add_step(self, step: StrategyStep) -> None:
        """Add a step to the strategy."""
        self.steps.append(step)
        
    def get_current_step(self) -> Optional[StrategyStep]:
        """Get the current step in execution."""
        if 0 <= self.current_step_index < len(self.steps):
            return self.steps[self.current_step_index]
        return None
        
    def next_step(self) -> Optional[StrategyStep]:
        """Move to the next step and return it."""
        if self.current_step_index + 1 < len(self.steps):
            self.current_step_index += 1
            return self.steps[self.current_step_index]
        return None
        
    def get_execution_summary(self) -> Dict[str, Any]:
        """Get a summary of the strategy execution."""
        completed_steps = [s for s in self.steps if s.end_time is not None]
        successful_steps = [s for s in self.steps if s.success is True]
        failed_steps = [s for s in self.steps if s.success is False]
        
        return {
            "name": self.name,
            "description": self.description,
            "goal": self.goal,
            "total_steps": len(self.steps),
            "completed_steps": len(completed_steps),
            "successful_steps": len(successful_steps),
            "failed_steps": len(failed_steps),
            "current_step_index": self.current_step_index,
            "execution_progress": f"{len(completed_steps)}/{len(self.steps)}"
        }
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert the strategy to a dictionary for serialization."""
        return {
            "name": self.name,
            "description": self.description,
            "goal": self.goal,
            "reasoning": self.reasoning,
            "steps": [
                {
                    "description": step.description,
                    "action": step.action,
                    "params": step.params,
                    "expected_outcome": step.expected_outcome,
                    "success": step.success,
                    "error": step.error,
                    "metrics": step.metrics
                } for step in self.steps
            ],
            "metrics": self.metrics,
            "success": self.success
        }
        
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Strategy':
        """Create a strategy from a dictionary."""
        strategy = cls(
            name=data["name"],
            description=data["description"],
            goal=data["goal"],
            reasoning=data.get("reasoning")
        )
        
        for step_data in data["steps"]:
            step = StrategyStep(
                description=step_data["description"],
                action=step_data["action"],
                params=step_data["params"],
                expected_outcome=step_data.get("expected_outcome")
            )
            if step_data.get("success") is not None:
                step.success = step_data["success"]
                step.error = step_data.get("error")
                step.metrics = step_data.get("metrics", {})
            
            strategy.steps.append(step)
            
        strategy.metrics = data.get("metrics", {})
        strategy.success = data.get("success")
        
        return strategy

class StrategicOrchestrator:
    """
    Main orchestrator for strategic planning and execution.
    
    This class provides high-level goal planning, strategic thinking,
    and orchestration of multiple approaches to accomplish complex tasks.
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        """
        Initialize the strategic orchestrator.
        
        Args:
            openai_api_key: API key for OpenAI (or from environment variable)
        """
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.strategies_dir = os.path.join('data', 'strategies')
        os.makedirs(self.strategies_dir, exist_ok=True)
        
        # Register available actions
        self.available_actions = {}
        self._register_default_actions()
        
        # Load LLM client if API key is available
        self.llm_client = None
        if self.openai_api_key:
            try:
                import openai
                self.llm_client = openai.OpenAI(api_key=self.openai_api_key)
                logger.info("OpenAI client initialized successfully")
            except ImportError:
                logger.warning("OpenAI package not available. Strategic reasoning will be limited.")
            except Exception as e:
                logger.error(f"Error initializing OpenAI client: {str(e)}")
        else:
            logger.warning("No OpenAI API key provided. Strategic reasoning will be limited.")
    
    def _register_default_actions(self) -> None:
        """Register the default available actions."""
        # Web scraping actions
        self.register_action("yelp_scrape", self._action_yelp_scrape)
        self.register_action("google_maps_scrape", self._action_google_maps_scrape)
        self.register_action("playwright_scrape", self._action_playwright_scrape)
        self.register_action("selenium_scrape", self._action_selenium_scrape)
        
        # Data processing actions
        self.register_action("combine_results", self._action_combine_results)
        self.register_action("filter_results", self._action_filter_results)
        self.register_action("sort_results", self._action_sort_results)
        self.register_action("save_results", self._action_save_results)
        
        # Analysis actions
        self.register_action("evaluate_results", self._action_evaluate_results)
        self.register_action("compare_strategies", self._action_compare_strategies)
    
    def register_action(self, action_name: str, action_func: Callable) -> None:
        """
        Register a new action that can be used in strategies.
        
        Args:
            action_name: Name of the action
            action_func: Function that implements the action
        """
        self.available_actions[action_name] = action_func
        logger.info(f"Registered action: {action_name}")
    
    async def generate_strategies(self, goal: str, context: Dict[str, Any] = None) -> List[Strategy]:
        """
        Generate multiple potential strategies to achieve a goal.
        
        Args:
            goal: The high-level goal to achieve
            context: Additional context information
            
        Returns:
            List of generated strategies
        """
        # Default context
        context = context or {}
        
        # If we have an LLM client, use it for advanced strategy generation
        if self.llm_client:
            return await self._generate_strategies_with_llm(goal, context)
        
        # Otherwise, use heuristic-based strategy generation
        return self._generate_strategies_heuristic(goal, context)
    
    async def _generate_strategies_with_llm(self, goal: str, context: Dict[str, Any]) -> List[Strategy]:
        """Generate strategies using LLM reasoning."""
        logger.info(f"Generating strategies for goal: {goal} using LLM")
        
        # Prepare prompt for strategy generation
        prompt = self._build_strategy_generation_prompt(goal, context)
        
        try:
            # Call OpenAI API for strategy generation
            response = await self._call_llm_async(prompt)
            
            # Parse strategies from the response
            strategies = self._parse_strategies_from_llm(response, goal)
            
            logger.info(f"Generated {len(strategies)} strategies using LLM")
            return strategies
            
        except Exception as e:
            logger.error(f"Error generating strategies with LLM: {str(e)}")
            # Fall back to heuristic method
            return self._generate_strategies_heuristic(goal, context)
    
    def _build_strategy_generation_prompt(self, goal: str, context: Dict[str, Any]) -> str:
        """Build a prompt for LLM strategy generation."""
        
        action_descriptions = "\n".join([
            f"- {action}: Available for use in strategies" 
            for action in self.available_actions.keys()
        ])
        
        context_str = "\n".join([
            f"{key}: {value}" for key, value in context.items()
        ])
        
        prompt = f"""
You are a strategic planning assistant tasked with generating multiple approaches
to achieve a goal. Please generate 2-3 different strategies to accomplish this goal:

GOAL: {goal}

CONTEXT:
{context_str}

AVAILABLE ACTIONS:
{action_descriptions}

For each strategy, provide:
1. Strategy name
2. Strategy description (2-3 sentences)
3. Reasoning for why this strategy is effective
4. A detailed step-by-step plan with:
   - Step description
   - Action to use
   - Parameters for the action
   - Expected outcome

Format your response as valid JSON with this structure:
{{
  "strategies": [
    {{
      "name": "Strategy name",
      "description": "Strategy description",
      "reasoning": "Why this strategy is effective",
      "steps": [
        {{
          "description": "Step description",
          "action": "action_name",
          "params": {{ "param1": "value1", "param2": "value2" }},
          "expected_outcome": "What this step should produce"
        }}
      ]
    }}
  ]
}}

Be strategic and creative in your approaches, considering multiple methods to achieve the goal.
"""
        return prompt
    
    async def _call_llm_async(self, prompt: str) -> str:
        """Call LLM API asynchronously."""
        if not self.llm_client:
            raise ValueError("No LLM client available")
            
        response = self.llm_client.chat.completions.create(
            model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2000
        )
        
        return response.choices[0].message.content
    
    def _parse_strategies_from_llm(self, response: str, goal: str) -> List[Strategy]:
        """Parse LLM response into Strategy objects."""
        strategies = []
        
        try:
            # Extract JSON from the response
            json_pattern = r'```json\s*([\s\S]*?)\s*```'
            json_match = re.search(json_pattern, response)
            
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try without the markdown code blocks
                json_pattern = r'(\{\s*"strategies"\s*:[\s\S]*\})'
                json_match = re.search(json_pattern, response)
                if json_match:
                    json_str = json_match.group(1)
                else:
                    # Just use the whole response and hope it's JSON
                    json_str = response
            
            data = json.loads(json_str)
            
            # Create Strategy objects
            for strategy_data in data.get("strategies", []):
                strategy = Strategy(
                    name=strategy_data.get("name", "Unnamed Strategy"),
                    description=strategy_data.get("description", ""),
                    goal=goal,
                    reasoning=strategy_data.get("reasoning", "")
                )
                
                # Add steps
                for step_data in strategy_data.get("steps", []):
                    step = StrategyStep(
                        description=step_data.get("description", ""),
                        action=step_data.get("action", ""),
                        params=step_data.get("params", {}),
                        expected_outcome=step_data.get("expected_outcome", "")
                    )
                    strategy.add_step(step)
                
                strategies.append(strategy)
                
        except Exception as e:
            logger.error(f"Error parsing strategies from LLM response: {str(e)}")
            logger.error(f"Response was: {response}")
            # Create a simple fallback strategy
            strategy = Strategy(
                name="Fallback Strategy",
                description="A simple fallback strategy created due to parsing error",
                goal=goal
            )
            strategies.append(strategy)
            
        return strategies
    
    def _generate_strategies_heuristic(self, goal: str, context: Dict[str, Any]) -> List[Strategy]:
        """Generate strategies using heuristic rules."""
        logger.info(f"Generating strategies for goal: {goal} using heuristics")
        
        # Parse the goal to determine what kind of task we're dealing with
        strategies = []
        
        # For web scraping goals (simple keyword detection - would be more sophisticated in production)
        if any(keyword in goal.lower() for keyword in ["scrape", "data", "business", "information", "search"]):
            # Strategy 1: Multi-source scraping with result combination
            strategy1 = Strategy(
                name="Multi-source Scraping",
                description="Collect data from multiple sources and combine results for comprehensive coverage",
                goal=goal,
                reasoning="Using multiple data sources increases coverage and data completeness"
            )
            
            # Extract search parameters from goal
            business_type = "business"
            location = "New York"
            
            # Try to extract business type
            business_matches = re.search(r"(restaurant|cafe|coffee shop|bar|shop|store|business)", goal.lower())
            if business_matches:
                business_type = business_matches.group(1)
                
            # Try to extract location
            location_matches = re.search(r"in\s+([A-Za-z\s]+)(?:,|\.|$|\s)", goal.lower())
            if location_matches:
                location = location_matches.group(1)
            
            # Step 1: Scrape from Yelp
            strategy1.add_step(StrategyStep(
                description="Scrape business data from Yelp",
                action="yelp_scrape",
                params={"business_type": business_type, "location": location, "limit": 10},
                expected_outcome="List of businesses from Yelp"
            ))
            
            # Step 2: Scrape from Google Maps
            strategy1.add_step(StrategyStep(
                description="Scrape business data from Google Maps",
                action="google_maps_scrape",
                params={"business_type": business_type, "location": location, "limit": 10},
                expected_outcome="List of businesses from Google Maps"
            ))
            
            # Step 3: Combine results
            strategy1.add_step(StrategyStep(
                description="Combine and deduplicate results from multiple sources",
                action="combine_results",
                expected_outcome="Combined list of unique businesses"
            ))
            
            # Step 4: Filter results (if needed)
            strategy1.add_step(StrategyStep(
                description="Filter results to most relevant",
                action="filter_results",
                params={"min_rating": 3.5},
                expected_outcome="Filtered list of high-quality businesses"
            ))
            
            # Step 5: Save results
            strategy1.add_step(StrategyStep(
                description="Save final results to file",
                action="save_results",
                params={"filename": f"{business_type}_{location.replace(' ', '_')}.json"},
                expected_outcome="Saved JSON file with results"
            ))
            
            strategies.append(strategy1)
            
            # Strategy 2: Playwright-based scraping
            strategy2 = Strategy(
                name="Browser Automation Scraping",
                description="Use browser automation to handle JavaScript-heavy sites",
                goal=goal,
                reasoning="Browser automation can access content that requires JavaScript execution"
            )
            
            # Step 1: Scrape using Playwright
            strategy2.add_step(StrategyStep(
                description="Scrape using Playwright browser automation",
                action="playwright_scrape",
                params={"business_type": business_type, "location": location, "limit": 15},
                expected_outcome="List of businesses from Playwright scraping"
            ))
            
            # Step 2: Save results
            strategy2.add_step(StrategyStep(
                description="Save results to file",
                action="save_results",
                params={"filename": f"{business_type}_{location}_playwright.json"},
                expected_outcome="Saved JSON file with results"
            ))
            
            strategies.append(strategy2)
            
            # Strategy 3: Selenium-based scraping
            strategy3 = Strategy(
                name="Selenium Deep Scraping",
                description="Use Selenium to perform deep scraping with detailed business pages",
                goal=goal,
                reasoning="Selenium can navigate multiple pages and extract detailed information"
            )
            
            # Step 1: Scrape using Selenium
            strategy3.add_step(StrategyStep(
                description="Scrape business listings with Selenium",
                action="selenium_scrape",
                params={"business_type": business_type, "location": location, "limit": 10},
                expected_outcome="List of businesses with detailed information"
            ))
            
            # Step 2: Save results
            strategy3.add_step(StrategyStep(
                description="Save detailed results to file",
                action="save_results",
                params={"filename": f"{business_type}_{location}_detailed.json"},
                expected_outcome="Saved JSON file with detailed results"
            ))
            
            strategies.append(strategy3)
            
        # Add other types of strategies as needed
        
        logger.info(f"Generated {len(strategies)} strategies using heuristics")
        return strategies
    
    async def analyze_and_select_strategy(self, strategies: List[Strategy], context: Dict[str, Any] = None) -> Strategy:
        """
        Analyze multiple strategies and select the best one.
        
        Args:
            strategies: List of potential strategies
            context: Additional context for decision making
            
        Returns:
            The selected strategy
        """
        # Return the first strategy if there's only one
        if len(strategies) <= 1:
            return strategies[0] if strategies else None
            
        # Use LLM for strategy selection if available
        if self.llm_client:
            return await self._select_strategy_with_llm(strategies, context)
            
        # Otherwise, use heuristic-based selection
        return self._select_strategy_heuristic(strategies, context)
    
    async def _select_strategy_with_llm(self, strategies: List[Strategy], context: Dict[str, Any]) -> Strategy:
        """Select the best strategy using LLM reasoning."""
        logger.info(f"Selecting best strategy from {len(strategies)} options using LLM")
        
        # Prepare prompt for strategy selection
        prompt = self._build_strategy_selection_prompt(strategies, context)
        
        try:
            # Call OpenAI API for strategy selection
            response = await self._call_llm_async(prompt)
            
            # Parse selected strategy from the response
            selected_index = self._parse_strategy_selection(response, len(strategies))
            
            if 0 <= selected_index < len(strategies):
                selected_strategy = strategies[selected_index]
                logger.info(f"Selected strategy: {selected_strategy.name}")
                return selected_strategy
            else:
                logger.warning(f"Invalid strategy index: {selected_index}, falling back to first strategy")
                return strategies[0]
                
        except Exception as e:
            logger.error(f"Error selecting strategy with LLM: {str(e)}")
            # Fall back to heuristic method
            return self._select_strategy_heuristic(strategies, context)
    
    def _build_strategy_selection_prompt(self, strategies: List[Strategy], context: Dict[str, Any]) -> str:
        """Build a prompt for LLM strategy selection."""
        
        strategies_text = ""
        for i, strategy in enumerate(strategies):
            steps_text = "\n".join([
                f"   - Step {j+1}: {step.description} (Action: {step.action})"
                for j, step in enumerate(strategy.steps)
            ])
            
            strategies_text += f"""
Strategy {i+1}: {strategy.name}
Description: {strategy.description}
Reasoning: {strategy.reasoning}
Steps:
{steps_text}

"""
        
        context_str = "\n".join([
            f"{key}: {value}" for key, value in (context or {}).items()
        ])
        
        prompt = f"""
You are a strategic planning assistant tasked with selecting the best approach
to achieve a goal. Please analyze these strategies and select the one that is 
most likely to succeed based on efficiency, reliability, and coverage.

GOAL: {strategies[0].goal}

CONTEXT:
{context_str}

AVAILABLE STRATEGIES:
{strategies_text}

After carefully analyzing these strategies, select the best one.
Explain your reasoning in detail, comparing the pros and cons of each strategy.
Then clearly indicate your selection by stating "Selected Strategy: X" where X is 
the number of the strategy (1, 2, 3, etc.).
"""
        return prompt
    
    def _parse_strategy_selection(self, response: str, num_strategies: int) -> int:
        """Parse the selected strategy index from LLM response."""
        try:
            # Look for the "Selected Strategy: X" pattern
            pattern = r"Selected Strategy:\s*(\d+)"
            match = re.search(pattern, response, re.IGNORECASE)
            
            if match:
                selected_index = int(match.group(1)) - 1  # Convert to 0-based index
                if 0 <= selected_index < num_strategies:
                    return selected_index
            
            # If nothing found or out of range, return the first strategy
            return 0
            
        except Exception as e:
            logger.error(f"Error parsing strategy selection: {str(e)}")
            return 0
    
    def _select_strategy_heuristic(self, strategies: List[Strategy], context: Dict[str, Any]) -> Strategy:
        """Select the best strategy using heuristic rules."""
        logger.info(f"Selecting best strategy from {len(strategies)} options using heuristics")
        
        # Simple heuristic: prefer strategies with more steps (assuming more comprehensive)
        strategies_with_scores = [(strategy, len(strategy.steps)) for strategy in strategies]
        sorted_strategies = sorted(strategies_with_scores, key=lambda x: x[1], reverse=True)
        
        selected_strategy = sorted_strategies[0][0]
        logger.info(f"Selected strategy: {selected_strategy.name}")
        return selected_strategy
    
    async def execute_strategy(self, strategy: Strategy) -> Dict[str, Any]:
        """
        Execute a strategy step by step.
        
        Args:
            strategy: The strategy to execute
            
        Returns:
            The final result of the strategy execution
        """
        logger.info(f"Executing strategy: {strategy.name} for goal: {strategy.goal}")
        
        # Initialize all steps
        strategy.current_step_index = -1
        
        # Execute steps sequentially
        step_results = {}
        current_step = strategy.next_step()
        
        while current_step is not None:
            try:
                logger.info(f"Executing step: {current_step.description}")
                current_step.start()
                
                # Get the action function
                action_func = self.available_actions.get(current_step.action)
                if not action_func:
                    raise ValueError(f"Unknown action: {current_step.action}")
                
                # Execute the action with parameters and previous results
                result = await self._execute_action(action_func, current_step.params, step_results)
                
                # Store the result
                current_step.complete(result)
                step_results[current_step.action] = result
                
                logger.info(f"Step completed successfully: {current_step.description}")
                
            except Exception as e:
                logger.error(f"Error executing step: {current_step.description} - {str(e)}")
                current_step.fail(str(e))
                
                # Decide whether to continue or abort the strategy
                if self._should_abort_strategy(strategy, current_step):
                    logger.warning(f"Aborting strategy: {strategy.name} due to critical step failure")
                    strategy.success = False
                    strategy.metrics["aborted_at_step"] = strategy.current_step_index
                    break
            
            # Move to next step
            current_step = strategy.next_step()
        
        # Calculate final metrics
        end_time = time.time()
        start_time = strategy.steps[0].start_time if strategy.steps else end_time
        strategy.metrics["total_execution_time"] = end_time - start_time
        
        # Count successful and failed steps
        strategy.metrics["successful_steps"] = len([s for s in strategy.steps if s.success is True])
        strategy.metrics["failed_steps"] = len([s for s in strategy.steps if s.success is False])
        
        # Determine overall strategy success (at least 50% of steps succeeded)
        if strategy.success is None:  # Only set if not already determined by abort
            strategy.success = strategy.metrics["successful_steps"] > 0 and \
                              (strategy.metrics["successful_steps"] >= strategy.metrics["failed_steps"])
        
        # Save the strategy execution record
        self._save_strategy_execution(strategy)
        
        logger.info(f"Strategy execution completed. Success: {strategy.success}")
        
        # Return the final results
        return {
            "strategy": strategy.name,
            "goal": strategy.goal,
            "success": strategy.success,
            "results": step_results,
            "metrics": strategy.metrics,
            "summary": strategy.get_execution_summary()
        }
    
    async def _execute_action(self, action_func: Callable, params: Dict[str, Any], 
                             previous_results: Dict[str, Any]) -> Any:
        """Execute an action function with parameters and previous results."""
        # Check if the function is async
        if asyncio.iscoroutinefunction(action_func):
            return await action_func(params, previous_results)
        else:
            return action_func(params, previous_results)
    
    def _should_abort_strategy(self, strategy: Strategy, failed_step: StrategyStep) -> bool:
        """Determine if a strategy should be aborted after a step failure."""
        # Abort if it's one of the first steps (likely critical setup)
        if strategy.current_step_index <= 1:
            return True
            
        # Abort if too many consecutive failures
        consecutive_failures = 0
        for i in range(strategy.current_step_index, -1, -1):
            if strategy.steps[i].success is False:
                consecutive_failures += 1
            else:
                break
                
        if consecutive_failures >= 2:
            return True
            
        # Otherwise, continue with the strategy
        return False
    
    def _save_strategy_execution(self, strategy: Strategy) -> None:
        """Save the strategy execution record to a file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{strategy.name.replace(' ', '_')}_{timestamp}.json"
        filepath = os.path.join(self.strategies_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(strategy.to_dict(), f, indent=2)
            
        logger.info(f"Saved strategy execution record to {filepath}")
    
    async def orchestrate_goal(self, goal: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Complete orchestration flow for achieving a goal.
        
        This is the main entry point for using the strategic orchestrator.
        
        Args:
            goal: High-level goal to achieve
            context: Additional context for planning
            
        Returns:
            Results and execution information
        """
        logger.info(f"Starting strategic orchestration for goal: {goal}")
        
        # Generate potential strategies
        strategies = await self.generate_strategies(goal, context)
        
        if not strategies:
            logger.error(f"No strategies could be generated for goal: {goal}")
            return {
                "success": False,
                "error": "No valid strategies could be generated"
            }
        
        # Select the best strategy
        selected_strategy = await self.analyze_and_select_strategy(strategies, context)
        
        # Execute the selected strategy
        result = await self.execute_strategy(selected_strategy)
        
        logger.info(f"Completed strategic orchestration for goal: {goal}")
        return result
    
    # Default action implementations
    
    async def _action_yelp_scrape(self, params: Dict[str, Any], previous_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Action to scrape data from Yelp."""
        from scrapers.enhanced_scraper import EnhancedScraper
        
        business_type = params.get("business_type", "business")
        location = params.get("location", "New York")
        limit = params.get("limit", 10)
        
        logger.info(f"Scraping Yelp for {business_type} in {location}")
        
        scraper = EnhancedScraper()
        results = scraper.scrape_business_directory(
            business_type=business_type,
            location=location,
            limit=limit,
            source="yelp"
        )
        
        logger.info(f"Yelp scraping found {len(results)} results")
        return results
    
    async def _action_google_maps_scrape(self, params: Dict[str, Any], previous_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Action to scrape data from Google Maps."""
        from scrapers.selenium_scraper import SeleniumScraper
        
        business_type = params.get("business_type", "business")
        location = params.get("location", "New York")
        limit = params.get("limit", 10)
        
        logger.info(f"Scraping Google Maps for {business_type} in {location}")
        
        scraper = SeleniumScraper()
        results = scraper.scrape_google_maps(
            business_type=business_type,
            location=location,
            limit=limit
        )
        
        logger.info(f"Google Maps scraping found {len(results)} results")
        return results
    
    async def _action_playwright_scrape(self, params: Dict[str, Any], previous_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Action to scrape data using Playwright."""
        from scrapers.playwright_scraper import PlaywrightScraper
        
        business_type = params.get("business_type", "business")
        location = params.get("location", "New York")
        limit = params.get("limit", 10)
        
        logger.info(f"Scraping with Playwright for {business_type} in {location}")
        
        scraper = PlaywrightScraper()
        results = await scraper.scrape_business_directory(
            business_type=business_type,
            location=location,
            limit=limit
        )
        
        logger.info(f"Playwright scraping found {len(results)} results")
        return results
    
    async def _action_selenium_scrape(self, params: Dict[str, Any], previous_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Action to scrape data using Selenium."""
        from scrapers.selenium_scraper import SeleniumScraper
        
        business_type = params.get("business_type", "business")
        location = params.get("location", "New York")
        limit = params.get("limit", 10)
        
        logger.info(f"Scraping with Selenium for {business_type} in {location}")
        
        scraper = SeleniumScraper()
        results = await scraper.scrape_business_directory(
            business_type=business_type,
            location=location,
            limit=limit
        )
        
        logger.info(f"Selenium scraping found {len(results)} results")
        return results
    
    def _action_combine_results(self, params: Dict[str, Any], previous_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Action to combine results from multiple sources."""
        logger.info("Combining results from multiple sources")
        
        combined_results = []
        seen_names = set()
        
        # Collect all results from previous steps
        for key, results in previous_results.items():
            if isinstance(results, list):
                for item in results:
                    if isinstance(item, dict) and "name" in item:
                        name = item["name"].lower()
                        if name not in seen_names:
                            seen_names.add(name)
                            combined_results.append(item)
                        elif params.get("merge_duplicates", True):
                            # Find and merge with existing item
                            for i, existing in enumerate(combined_results):
                                if existing["name"].lower() == name:
                                    # Merge data, preferring non-empty values
                                    for k, v in item.items():
                                        if k not in existing or not existing[k] or existing[k] == "Not available":
                                            existing[k] = v
                                    # Update sources list
                                    if "source" in existing and "source" in item:
                                        sources = set((existing["source"] + "," + item["source"]).split(","))
                                        existing["source"] = ",".join(sources)
                                    break
        
        logger.info(f"Combined {len(combined_results)} unique results")
        return combined_results
    
    def _action_filter_results(self, params: Dict[str, Any], previous_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Action to filter results based on criteria."""
        logger.info("Filtering results")
        
        # Find the results to filter (typically the combined results or latest scraping results)
        results_to_filter = None
        for key in ["combine_results", "yelp_scrape", "google_maps_scrape", "playwright_scrape", "selenium_scrape"]:
            if key in previous_results and isinstance(previous_results[key], list):
                results_to_filter = previous_results[key]
                break
                
        if not results_to_filter:
            logger.warning("No results found to filter")
            return []
            
        # Apply filters
        filtered_results = results_to_filter.copy()
        
        # Filter by minimum rating
        min_rating = params.get("min_rating")
        if min_rating is not None:
            filtered_results = [
                r for r in filtered_results 
                if "rating" in r and r["rating"] != "Not available" and float(str(r["rating"]).split()[0]) >= min_rating
            ]
            
        # Filter by keywords in name
        name_keywords = params.get("name_keywords", [])
        if name_keywords:
            filtered_results = [
                r for r in filtered_results
                if "name" in r and any(keyword.lower() in r["name"].lower() for keyword in name_keywords)
            ]
            
        # Add more filters as needed
        
        logger.info(f"Filtered from {len(results_to_filter)} to {len(filtered_results)} results")
        return filtered_results
    
    def _action_sort_results(self, params: Dict[str, Any], previous_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Action to sort results based on criteria."""
        logger.info("Sorting results")
        
        # Find the results to sort
        results_to_sort = None
        for key in ["filter_results", "combine_results", "yelp_scrape", "google_maps_scrape", "playwright_scrape", "selenium_scrape"]:
            if key in previous_results and isinstance(previous_results[key], list):
                results_to_sort = previous_results[key]
                break
                
        if not results_to_sort:
            logger.warning("No results found to sort")
            return []
            
        # Apply sorting
        sort_by = params.get("sort_by", "rating")
        reverse = params.get("reverse", True)  # Default to descending order
        
        # Define a key function for sorting
        def sort_key(item):
            if sort_by not in item:
                return "" if reverse else "zzz"  # Place items without the key at the end
                
            value = item[sort_by]
            if sort_by == "rating" and isinstance(value, str):
                try:
                    return float(value.split()[0])
                except (ValueError, IndexError):
                    return 0
            elif sort_by == "review_count" and isinstance(value, str):
                try:
                    return int(value.replace(",", ""))
                except ValueError:
                    return 0
            else:
                return value
                
        sorted_results = sorted(results_to_sort, key=sort_key, reverse=reverse)
        
        logger.info(f"Sorted {len(sorted_results)} results by {sort_by}")
        return sorted_results
    
    def _action_save_results(self, params: Dict[str, Any], previous_results: Dict[str, Any]) -> str:
        """Action to save results to a file."""
        from scrapers.enhanced_scraper import EnhancedScraper
        
        # Find the results to save
        results_to_save = None
        for key in ["sort_results", "filter_results", "combine_results", "yelp_scrape", "google_maps_scrape", "playwright_scrape", "selenium_scrape"]:
            if key in previous_results and isinstance(previous_results[key], list):
                results_to_save = previous_results[key]
                break
                
        if not results_to_save:
            logger.warning("No results found to save")
            return "No results to save"
            
        # Get filename from parameters
        filename = params.get("filename", "search_results.json")
        
        # Save to file
        scraper = EnhancedScraper()  # Using the EnhancedScraper's save method
        filepath = scraper.save_to_json(results_to_save, filename)
        
        logger.info(f"Saved {len(results_to_save)} results to {filepath}")
        return filepath
    
    def _action_evaluate_results(self, params: Dict[str, Any], previous_results: Dict[str, Any]) -> Dict[str, Any]:
        """Action to evaluate the quality of results."""
        logger.info("Evaluating results quality")
        
        # Find the results to evaluate
        results_to_evaluate = None
        for key in ["sort_results", "filter_results", "combine_results", "yelp_scrape", "google_maps_scrape", "playwright_scrape", "selenium_scrape"]:
            if key in previous_results and isinstance(previous_results[key], list):
                results_to_evaluate = previous_results[key]
                break
                
        if not results_to_evaluate:
            logger.warning("No results found to evaluate")
            return {"quality": "unknown", "count": 0, "completeness": 0}
            
        # Count results
        count = len(results_to_evaluate)
        
        # Calculate completeness (percent of items with all fields)
        expected_fields = ["name", "address", "phone", "rating", "review_count"]
        completeness_scores = []
        
        for item in results_to_evaluate:
            fields_present = sum(1 for field in expected_fields if field in item and item[field] != "Not available")
            score = fields_present / len(expected_fields)
            completeness_scores.append(score)
            
        avg_completeness = sum(completeness_scores) / len(completeness_scores) if completeness_scores else 0
        
        # Determine quality based on count and completeness
        quality = "poor"
        if count >= 10 and avg_completeness >= 0.8:
            quality = "excellent"
        elif count >= 5 and avg_completeness >= 0.6:
            quality = "good"
        elif count >= 3 and avg_completeness >= 0.4:
            quality = "fair"
            
        evaluation = {
            "quality": quality,
            "count": count,
            "completeness": avg_completeness,
            "sources": set()
        }
        
        # Count sources
        for item in results_to_evaluate:
            if "source" in item:
                sources = item["source"].split(",")
                for source in sources:
                    evaluation["sources"].add(source.strip())
                    
        evaluation["sources"] = list(evaluation["sources"])
        
        logger.info(f"Evaluated results: quality={quality}, count={count}, completeness={avg_completeness:.2f}")
        return evaluation
    
    def _action_compare_strategies(self, params: Dict[str, Any], previous_results: Dict[str, Any]) -> Dict[str, Any]:
        """Action to compare results from different strategies."""
        logger.info("Comparing strategy results")
        
        # Implementation specific to your comparison needs
        return {"comparison": "Strategy comparison details would go here"}