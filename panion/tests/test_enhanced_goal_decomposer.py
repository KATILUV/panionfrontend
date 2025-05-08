"""
Tests for the Enhanced Goal Decomposer.
"""

import pytest
import asyncio
from pathlib import Path
import json
import networkx as nx
from unittest.mock import Mock, patch

from core.enhanced_goal_decomposer import (
    EnhancedGoalDecomposer,
    DecompositionStrategy,
    SubGoal,
    DecompositionResult
)

@pytest.fixture
def config_path(tmp_path):
    """Create a temporary config file."""
    config = {
        "gpt4": {
            "model": "gpt-4-turbo-preview",
            "temperature": 0.7,
            "max_tokens": 2000,
            "timeout": 30
        },
        "cache": {
            "enabled": True,
            "ttl": 3600,
            "max_size": 1000
        }
    }
    config_file = tmp_path / "goal_decomposer.yaml"
    with open(config_file, "w") as f:
        json.dump(config, f)
    return str(config_file)

@pytest.fixture
def mock_services():
    """Mock required services."""
    plugin_manager = Mock()
    plugin_manager.get_available_plugins = Mock(return_value=[
        {"id": "plugin1", "capabilities": ["task1", "task2"]},
        {"id": "plugin2", "capabilities": ["task3", "task4"]}
    ])
    
    memory_manager = Mock()
    memory_manager.store = Mock()
    memory_manager.retrieve = Mock(return_value=None)
    
    return {
        "plugin_manager": plugin_manager,
        "memory_manager": memory_manager
    }

@pytest.fixture
def decomposer(config_path, mock_services):
    """Create a test instance of EnhancedGoalDecomposer."""
    with patch("core.service_locator.service_locator") as mock_locator:
        mock_locator.get_service.side_effect = lambda name: mock_services.get(name)
        return EnhancedGoalDecomposer(config_path)

@pytest.mark.asyncio
async def test_decompose_goal_hierarchical(decomposer):
    """Test goal decomposition with hierarchical strategy."""
    goal = "Build a web application with user authentication"
    
    # Mock GPT-4 response
    mock_response = {
        "goal_id": "test_goal_1",
        "subgoals": [
            {
                "description": "Set up frontend framework",
                "dependencies": [],
                "required_plugins": ["plugin1"],
                "estimated_duration": 2.0,
                "priority": 0.8,
                "metadata": {"type": "frontend"}
            },
            {
                "description": "Implement authentication system",
                "dependencies": ["test_goal_1_sub_0"],
                "required_plugins": ["plugin2"],
                "estimated_duration": 3.0,
                "priority": 0.9,
                "metadata": {"type": "backend"}
            }
        ],
        "strategy_specific": {"levels": 2},
        "metadata": {"complexity": "medium"}
    }
    
    with patch.object(decomposer, "_call_gpt4", return_value=json.dumps(mock_response)):
        result = await decomposer.decompose_goal(goal, DecompositionStrategy.HIERARCHICAL)
        
        assert isinstance(result, DecompositionResult)
        assert result.goal_id == "test_goal_1"
        assert len(result.subgoals) == 2
        assert result.strategy == DecompositionStrategy.HIERARCHICAL
        assert isinstance(result.dependency_graph, nx.DiGraph)
        assert result.estimated_total_duration == 5.0

@pytest.mark.asyncio
async def test_decompose_goal_sequential(decomposer):
    """Test goal decomposition with sequential strategy."""
    goal = "Process and analyze customer data"
    
    # Mock GPT-4 response
    mock_response = {
        "goal_id": "test_goal_2",
        "subgoals": [
            {
                "description": "Collect customer data",
                "dependencies": [],
                "required_plugins": ["plugin1"],
                "estimated_duration": 1.0,
                "priority": 0.7,
                "metadata": {"step": 1}
            },
            {
                "description": "Clean and validate data",
                "dependencies": ["test_goal_2_sub_0"],
                "required_plugins": ["plugin1"],
                "estimated_duration": 2.0,
                "priority": 0.8,
                "metadata": {"step": 2}
            },
            {
                "description": "Perform analysis",
                "dependencies": ["test_goal_2_sub_1"],
                "required_plugins": ["plugin2"],
                "estimated_duration": 3.0,
                "priority": 0.9,
                "metadata": {"step": 3}
            }
        ],
        "strategy_specific": {"steps": 3},
        "metadata": {"type": "data_processing"}
    }
    
    with patch.object(decomposer, "_call_gpt4", return_value=json.dumps(mock_response)):
        result = await decomposer.decompose_goal(goal, DecompositionStrategy.SEQUENTIAL)
        
        assert isinstance(result, DecompositionResult)
        assert result.goal_id == "test_goal_2"
        assert len(result.subgoals) == 3
        assert result.strategy == DecompositionStrategy.SEQUENTIAL
        assert result.estimated_total_duration == 6.0

@pytest.mark.asyncio
async def test_decompose_goal_parallel(decomposer):
    """Test goal decomposition with parallel strategy."""
    goal = "Optimize system performance"
    
    # Mock GPT-4 response
    mock_response = {
        "goal_id": "test_goal_3",
        "subgoals": [
            {
                "description": "Optimize database queries",
                "dependencies": [],
                "required_plugins": ["plugin1"],
                "estimated_duration": 2.0,
                "priority": 0.8,
                "metadata": {"component": "database"}
            },
            {
                "description": "Improve caching",
                "dependencies": [],
                "required_plugins": ["plugin1"],
                "estimated_duration": 1.5,
                "priority": 0.7,
                "metadata": {"component": "cache"}
            },
            {
                "description": "Optimize frontend assets",
                "dependencies": [],
                "required_plugins": ["plugin2"],
                "estimated_duration": 1.0,
                "priority": 0.6,
                "metadata": {"component": "frontend"}
            }
        ],
        "strategy_specific": {"parallel_tasks": 3},
        "metadata": {"type": "optimization"}
    }
    
    with patch.object(decomposer, "_call_gpt4", return_value=json.dumps(mock_response)):
        result = await decomposer.decompose_goal(goal, DecompositionStrategy.PARALLEL)
        
        assert isinstance(result, DecompositionResult)
        assert result.goal_id == "test_goal_3"
        assert len(result.subgoals) == 3
        assert result.strategy == DecompositionStrategy.PARALLEL
        assert result.estimated_total_duration == 2.0  # Longest parallel task

@pytest.mark.asyncio
async def test_determine_strategy(decomposer):
    """Test strategy determination."""
    goals = [
        ("Build a complex system", DecompositionStrategy.HIERARCHICAL),
        ("Follow a step-by-step process", DecompositionStrategy.SEQUENTIAL),
        ("Run multiple tasks simultaneously", DecompositionStrategy.PARALLEL),
        ("Unknown goal type", DecompositionStrategy.ADAPTIVE)
    ]
    
    for goal, expected_strategy in goals:
        with patch.object(decomposer, "_call_gpt4", return_value=expected_strategy.value):
            strategy = decomposer._determine_strategy(goal)
            assert strategy == expected_strategy

@pytest.mark.asyncio
async def test_plugin_mapping(decomposer):
    """Test plugin mapping to subgoals."""
    subgoal = SubGoal(
        id="test_subgoal",
        description="Process data using plugin1",
        parent_id="test_goal",
        dependencies=[],
        required_plugins=[],
        estimated_duration=1.0,
        priority=0.8
    )
    
    # Mock GPT-4 response for plugin matching
    mock_response = json.dumps(["plugin1"])
    
    with patch.object(decomposer, "_call_gpt4", return_value=mock_response):
        await decomposer._map_plugins_to_subgoals([subgoal])
        
        assert subgoal.required_plugins == ["plugin1"]
        assert "test_subgoal" in decomposer._plugin_mapping_cache

def test_dependency_graph_cycle_detection(decomposer):
    """Test detection of circular dependencies."""
    subgoals = [
        SubGoal(
            id="sub1",
            description="Task 1",
            parent_id="goal",
            dependencies=["sub2"],
            required_plugins=[],
            estimated_duration=1.0
        ),
        SubGoal(
            id="sub2",
            description="Task 2",
            parent_id="goal",
            dependencies=["sub1"],
            required_plugins=[],
            estimated_duration=1.0
        )
    ]
    
    with pytest.raises(ValueError, match="Circular dependencies detected"):
        decomposer._build_dependency_graph(subgoals)

@pytest.mark.asyncio
async def test_error_handling(decomposer):
    """Test error handling in goal decomposition."""
    goal = "Test error handling"
    
    # Mock GPT-4 to raise an error
    with patch.object(decomposer, "_call_gpt4", side_effect=Exception("API Error")):
        with pytest.raises(Exception):
            await decomposer.decompose_goal(goal)

def test_config_loading(decomposer):
    """Test configuration loading."""
    assert isinstance(decomposer.config, dict)
    assert "gpt4" in decomposer.config
    assert "cache" in decomposer.config

def test_decomposition_history(decomposer):
    """Test decomposition history tracking."""
    assert isinstance(decomposer.get_decomposition_history(), dict)
    assert isinstance(decomposer.get_plugin_mapping_cache(), dict) 