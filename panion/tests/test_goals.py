"""
Tests for the goals system.
"""

import pytest
from datetime import datetime, timedelta
from pathlib import Path
import json
import asyncio

from core.goals.manager import GoalManager, TestGoal
from core.goals.types import GoalStatus, GoalPriority
from core.service_locator import service_locator

@pytest.fixture
async def goal_manager():
    """Create a goal manager instance."""
    manager = GoalManager()
    await manager.initialize()
    yield manager
    # Cleanup
    manager._goals.clear()
    manager._active_goals.clear()

@pytest.mark.asyncio
async def test_goal_creation(goal_manager):
    """Test creating a new goal."""
    # Create test goal
    goal = TestGoal(
        id="test_goal",
        description="Test goal for unit testing",
        priority=GoalPriority.HIGH,
        status=GoalStatus.PENDING,
        required_plugins=["test_plugin"],
        parameters={"test_param": "value"}
    )
    
    # Add goal
    await goal_manager.add_goal(goal)
    
    # Verify goal was added
    assert goal.id in goal_manager._goals
    assert goal_manager._goals[goal.id] == goal

@pytest.mark.asyncio
async def test_goal_execution(goal_manager):
    """Test goal execution."""
    # Create test goal
    goal = TestGoal(
        id="test_goal",
        description="Test goal for unit testing",
        priority=GoalPriority.HIGH,
        status=GoalStatus.PENDING,
        required_plugins=["test_plugin"],
        parameters={"test_param": "value"}
    )
    
    # Add goal
    await goal_manager.add_goal(goal)
    
    # Execute goal
    result = await goal_manager.execute_goal(goal.id)
    
    # Verify execution
    assert result["status"] == "success"
    assert goal.status == GoalStatus.COMPLETED

@pytest.mark.asyncio
async def test_goal_dependencies(goal_manager):
    """Test goal dependencies."""
    # Create dependent goals
    goal1 = TestGoal(
        id="goal1",
        description="First goal",
        priority=GoalPriority.HIGH,
        status=GoalStatus.PENDING,
        required_plugins=["test_plugin"],
        parameters={}
    )
    
    goal2 = TestGoal(
        id="goal2",
        description="Second goal",
        priority=GoalPriority.HIGH,
        status=GoalStatus.PENDING,
        required_plugins=["test_plugin"],
        parameters={},
        dependencies=["goal1"]
    )
    
    # Add goals
    await goal_manager.add_goal(goal1)
    await goal_manager.add_goal(goal2)
    
    # Execute dependent goal
    result = await goal_manager.execute_goal(goal2.id)
    
    # Verify execution order
    assert goal1.status == GoalStatus.COMPLETED
    assert goal2.status == GoalStatus.COMPLETED
    assert result["status"] == "success"

@pytest.mark.asyncio
async def test_goal_cleanup(goal_manager):
    """Test goal cleanup."""
    # Create test goal
    goal = TestGoal(
        id="test_goal",
        description="Test goal for unit testing",
        priority=GoalPriority.HIGH,
        status=GoalStatus.COMPLETED,
        required_plugins=["test_plugin"],
        parameters={}
    )
    
    # Add goal
    await goal_manager.add_goal(goal)
    
    # Set completion time to old date
    goal.completed_at = datetime.now() - timedelta(days=31)
    
    # Run cleanup
    await goal_manager.cleanup_old_goals()
    
    # Verify goal was removed
    assert goal.id not in goal_manager._goals

@pytest.mark.asyncio
async def test_goal_serialization(goal_manager):
    """Test goal serialization and deserialization."""
    # Create test goal
    goal = TestGoal(
        id="test_goal",
        description="Test goal for unit testing",
        priority=GoalPriority.HIGH,
        status=GoalStatus.PENDING,
        required_plugins=["test_plugin"],
        parameters={"test_param": "value"}
    )
    
    # Serialize goal
    goal_data = goal.to_dict()
    
    # Create new goal from data
    new_goal = TestGoal.from_dict(goal_data)
    
    # Verify goal data
    assert new_goal.id == goal.id
    assert new_goal.description == goal.description
    assert new_goal.priority == goal.priority
    assert new_goal.status == goal.status
    assert new_goal.required_plugins == goal.required_plugins
    assert new_goal.parameters == goal.parameters 