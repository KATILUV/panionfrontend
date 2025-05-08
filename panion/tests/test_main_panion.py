"""
Test the main Panion system with a Hacker News title extraction goal.
"""

import asyncio
import logging
from datetime import datetime
from pathlib import Path
import json

from core.agent_spawner import agent_spawner
from core.memory_router import memory_router
from core.reflection import reflection_system
from core.memory import memory_system
from core.plugin_executor import plugin_executor

async def test_main_panion():
    """Test the main Panion system with a Hacker News goal."""
    
    # Load goal
    goals_file = Path("data/goals.json")
    with open(goals_file, 'r') as f:
        goals_data = json.load(f)
        goal = next(g for g in goals_data["goals"] if g["id"] == "hn_titles_001")
    
    # Initialize systems
    reflection_system.initialize()
    memory_system.initialize()
    
    # Spawn planner agent
    planner = await agent_spawner.spawn_agent(
        agent_type="planner",
        goal=goal
    )
    
    # Log initial thought
    reflection_system.log_thought(
        "planner",
        f"Starting execution of goal: {goal['description']}",
        {"goal_id": goal["id"]}
    )
    
    # Execute each subgoal
    results = []
    for subgoal in goal["subgoals"]:
        try:
            # Log subgoal start
            reflection_system.log_thought(
                "planner",
                f"Executing subgoal: {subgoal['description']}",
                {"subgoal_id": subgoal["id"]}
            )
            
            # Execute subgoal
            result = await plugin_executor.run_plugin(
                plugin_id=f"hn_{subgoal['type']}",
                input_data=subgoal["parameters"]
            )
            
            # Store result in memory
            await memory_system.store_entry(
                content=f"Subgoal {subgoal['id']} completed",
                type="execution_result",
                metadata={
                    "subgoal_id": subgoal["id"],
                    "result": result
                }
            )
            
            results.append(result)
            
        except Exception as e:
            # Log failure
            reflection_system.log_thought(
                "planner",
                f"Subgoal failed: {str(e)}",
                {
                    "subgoal_id": subgoal["id"],
                    "error": str(e)
                }
            )
            
            # Spawn refiner agent
            refiner = await agent_spawner.spawn_agent(
                agent_type="refiner",
                goal=goal
            )
            
            # Get recent failures
            failures = await refiner._get_recent_failures(f"hn_{subgoal['type']}")
            
            # Generate and apply fix
            fix = await refiner._generate_fix(failures)
            await refiner._apply_fix(fix)
            
            # Retry execution
            result = await plugin_executor.run_plugin(
                plugin_id=f"hn_{subgoal['type']}",
                input_data=subgoal["parameters"]
            )
            
            results.append(result)
    
    # Get final context
    context = await memory_router.get_agent_context(goal["id"])
    
    # Print results
    print("\n=== Goal Execution Results ===")
    print(f"Goal ID: {goal['id']}")
    print(f"Description: {goal['description']}")
    print(f"Subgoals Completed: {len(results)}")
    
    print("\n=== Memory Entries ===")
    for entry in context["memory_entries"]:
        print(f"- {entry['content']}")
        if "metadata" in entry:
            print(f"  Metadata: {entry['metadata']}")
    
    print("\n=== Reflections ===")
    for reflection in context["reflections"]:
        print(f"- {reflection['thought']}")
        if "metadata" in reflection:
            print(f"  Metadata: {reflection['metadata']}")
    
    print("\n=== Test Logs ===")
    for log in context["test_logs"]:
        print(f"- {log['status']}: {log.get('error', 'No error')}")
    
    return context

if __name__ == "__main__":
    asyncio.run(test_main_panion()) 