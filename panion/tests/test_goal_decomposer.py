"""
Tests for the enhanced goal decomposer.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from pathlib import Path
from datetime import datetime
import json
import yaml

from core.goal_decomposer import EnhancedGoalDecomposer, Goal, GoalDecomposer
from core.guidance_decomposer import DecompositionResult
from core.enhanced_goal_decomposer import (
    DecompositionStrategy,
    SubGoal
)

@pytest.fixture
def mock_guidance_decomposer():
    """Create a mock guidance decomposer."""
    mock = Mock()
    mock.decompose_goal = AsyncMock()
    mock.validate_decomposition = Mock(return_value=True)
    return mock

@pytest.fixture
def decomposer(mock_guidance_decomposer):
    """Create a decomposer instance with mocked dependencies."""
    with patch("core.goal_decomposer.GuidanceDecomposer", return_value=mock_guidance_decomposer):
        return EnhancedGoalDecomposer()

@pytest.fixture
def sample_llm_response():
    """Create a sample LLM response for decomposition."""
    return """
    {
        "strategy": "hierarchical",
        "subgoals": [
            {
                "id": "task_1",
                "description": "Initialize database connection",
                "dependencies": [],
                "estimated_duration": 5.0,
                "priority": 0.8,
                "required_plugins": ["database_plugin"],
                "test_cases": [
                    {
                        "name": "test_db_connection",
                        "description": "Verify database connection",
                        "expected_outcome": "success",
                        "validation_criteria": ["connection_established"]
                    }
                ],
                "retry_strategy": {
                    "max_attempts": 3,
                    "backoff_factor": 1.5,
                    "timeout": 300
                }
            },
            {
                "id": "task_2",
                "description": "Load configuration",
                "dependencies": ["task_1"],
                "estimated_duration": 2.0,
                "priority": 0.7,
                "required_plugins": ["config_plugin"],
                "test_cases": [
                    {
                        "name": "test_config_load",
                        "description": "Verify configuration loading",
                        "expected_outcome": "success",
                        "validation_criteria": ["config_loaded"]
                    }
                ]
            }
        ],
        "confidence": 0.85,
        "estimated_duration": 7.0,
        "required_plugins": ["database_plugin", "config_plugin"],
        "metadata": {
            "environment": "production",
            "version": "1.0"
        }
    }
    """

@pytest.mark.asyncio
async def test_decompose_goal_success(decomposer, mock_guidance_decomposer):
    """Test successful goal decomposition."""
    # Mock decomposition result
    mock_decomposition = DecompositionResult(
        subtasks=[
            {
                "id": "task1",
                "description": "Test task",
                "estimated_duration": 30,
                "priority": 0.8
            }
        ],
        dependencies={
            "task1": []
        },
        resources=[
            {
                "type": "tool",
                "name": "test_tool",
                "description": "Test tool",
                "required_for": ["task1"]
            }
        ],
        success_criteria=[
            {
                "task_id": "task1",
                "criteria": ["Complete task"],
                "validation_method": "Verify completion"
            }
        ],
        failure_mitigation=[
            {
                "task_id": "task1",
                "potential_failures": ["Task fails"],
                "mitigation_strategies": ["Retry task"]
            }
        ],
        metadata={}
    )
    
    # Setup mock
    mock_guidance_decomposer.decompose_goal.return_value = mock_decomposition
    
    # Test decomposition
    goal = await decomposer.decompose_goal("Test goal", context={"test": "context"})
    
    # Verify result
    assert isinstance(goal, Goal)
    assert goal.description == "Test goal"
    assert goal.decomposition == mock_decomposition
    assert goal.parent_id is None
    assert goal.status == "pending"
    assert goal.metadata == {"test": "context"}
    
    # Verify goal was stored
    assert goal.id in decomposer.active_goals
    assert decomposer.active_goals[goal.id] == goal

@pytest.mark.asyncio
async def test_decompose_goal_invalid_decomposition(decomposer, mock_guidance_decomposer):
    """Test goal decomposition with invalid result."""
    # Setup mock to return invalid decomposition
    mock_guidance_decomposer.validate_decomposition.return_value = False
    
    # Test decomposition
    with pytest.raises(ValueError, match="Invalid goal decomposition"):
        await decomposer.decompose_goal("Test goal")

@pytest.mark.asyncio
async def test_spawn_subgoal_success(decomposer, mock_guidance_decomposer):
    """Test successful subgoal spawning."""
    # Create parent goal
    parent_goal = await decomposer.decompose_goal("Parent goal")
    
    # Mock decomposition result for subgoal
    mock_decomposition = DecompositionResult(
        subtasks=[
            {
                "id": "subtask1",
                "description": "Sub task",
                "estimated_duration": 15,
                "priority": 0.9
            }
        ],
        dependencies={
            "subtask1": []
        },
        resources=[],
        success_criteria=[],
        failure_mitigation=[],
        metadata={}
    )
    
    # Setup mock
    mock_guidance_decomposer.decompose_goal.return_value = mock_decomposition
    
    # Test subgoal spawning
    subgoal = await decomposer.spawn_subgoal(
        parent_goal.id,
        "Sub goal",
        context={"sub": "context"}
    )
    
    # Verify result
    assert isinstance(subgoal, Goal)
    assert subgoal.description == "Sub goal"
    assert subgoal.decomposition == mock_decomposition
    assert subgoal.parent_id == parent_goal.id
    assert subgoal.status == "pending"
    assert subgoal.metadata == {"sub": "context"}

@pytest.mark.asyncio
async def test_spawn_subgoal_parent_not_found(decomposer):
    """Test subgoal spawning with non-existent parent."""
    with pytest.raises(ValueError, match="Parent goal parent_id not found"):
        await decomposer.spawn_subgoal("parent_id", "Sub goal")

def test_get_goal(decomposer):
    """Test getting a goal by ID."""
    # Create test goal
    goal = Goal(
        id="test_goal",
        description="Test goal",
        decomposition=DecompositionResult(
            subtasks=[],
            dependencies={},
            resources=[],
            success_criteria=[],
            failure_mitigation=[],
            metadata={}
        )
    )
    decomposer.active_goals[goal.id] = goal
    
    # Test getting goal
    result = decomposer.get_goal(goal.id)
    assert result == goal
    
    # Test getting non-existent goal
    assert decomposer.get_goal("non_existent") is None

def test_get_subgoals(decomposer):
    """Test getting subgoals of a parent goal."""
    # Create parent goal
    parent = Goal(
        id="parent",
        description="Parent goal",
        decomposition=DecompositionResult(
            subtasks=[],
            dependencies={},
            resources=[],
            success_criteria=[],
            failure_mitigation=[],
            metadata={}
        )
    )
    
    # Create subgoals
    subgoal1 = Goal(
        id="subgoal1",
        description="Sub goal 1",
        decomposition=DecompositionResult(
            subtasks=[],
            dependencies={},
            resources=[],
            success_criteria=[],
            failure_mitigation=[],
            metadata={}
        ),
        parent_id="parent"
    )
    
    subgoal2 = Goal(
        id="subgoal2",
        description="Sub goal 2",
        decomposition=DecompositionResult(
            subtasks=[],
            dependencies={},
            resources=[],
            success_criteria=[],
            failure_mitigation=[],
            metadata={}
        ),
        parent_id="parent"
    )
    
    # Add goals to decomposer
    decomposer.active_goals.update({
        "parent": parent,
        "subgoal1": subgoal1,
        "subgoal2": subgoal2
    })
    
    # Test getting subgoals
    subgoals = decomposer.get_subgoals("parent")
    assert len(subgoals) == 2
    assert subgoal1 in subgoals
    assert subgoal2 in subgoals

def test_update_goal_status(decomposer):
    """Test updating goal status."""
    # Create test goal
    goal = Goal(
        id="test_goal",
        description="Test goal",
        decomposition=DecompositionResult(
            subtasks=[],
            dependencies={},
            resources=[],
            success_criteria=[],
            failure_mitigation=[],
            metadata={}
        )
    )
    decomposer.active_goals[goal.id] = goal
    
    # Test updating status
    decomposer.update_goal_status(goal.id, "completed")
    assert goal.status == "completed"
    
    # Test updating non-existent goal
    with pytest.raises(ValueError, match="Goal non_existent not found"):
        decomposer.update_goal_status("non_existent", "completed")

def test_get_goal_dependencies(decomposer):
    """Test getting goal dependencies."""
    # Create test goal with dependencies
    goal = Goal(
        id="test_goal",
        description="Test goal",
        decomposition=DecompositionResult(
            subtasks=[],
            dependencies={
                "test_goal": ["dep1", "dep2"]
            },
            resources=[],
            success_criteria=[],
            failure_mitigation=[],
            metadata={}
        )
    )
    decomposer.active_goals[goal.id] = goal
    
    # Test getting dependencies
    deps = decomposer.get_goal_dependencies(goal.id)
    assert deps == ["dep1", "dep2"]
    
    # Test getting dependencies for non-existent goal
    with pytest.raises(ValueError, match="Goal non_existent not found"):
        decomposer.get_goal_dependencies("non_existent")

def test_get_goal_resources(decomposer):
    """Test getting goal resources."""
    # Create test goal with resources
    goal = Goal(
        id="test_goal",
        description="Test goal",
        decomposition=DecompositionResult(
            subtasks=[],
            dependencies={},
            resources=[
                {
                    "type": "tool",
                    "name": "test_tool",
                    "description": "Test tool",
                    "required_for": ["test_goal"]
                }
            ],
            success_criteria=[],
            failure_mitigation=[],
            metadata={}
        )
    )
    decomposer.active_goals[goal.id] = goal
    
    # Test getting resources
    resources = decomposer.get_goal_resources(goal.id)
    assert len(resources) == 1
    assert resources[0]["name"] == "test_tool"
    
    # Test getting resources for non-existent goal
    with pytest.raises(ValueError, match="Goal non_existent not found"):
        decomposer.get_goal_resources("non_existent")

def test_get_goal_success_criteria(decomposer):
    """Test getting goal success criteria."""
    # Create test goal with success criteria
    goal = Goal(
        id="test_goal",
        description="Test goal",
        decomposition=DecompositionResult(
            subtasks=[],
            dependencies={},
            resources=[],
            success_criteria=[
                {
                    "task_id": "test_goal",
                    "criteria": ["Complete task"],
                    "validation_method": "Verify completion"
                }
            ],
            failure_mitigation=[],
            metadata={}
        )
    )
    decomposer.active_goals[goal.id] = goal
    
    # Test getting success criteria
    criteria = decomposer.get_goal_success_criteria(goal.id)
    assert len(criteria) == 1
    assert criteria[0]["criteria"] == ["Complete task"]
    
    # Test getting criteria for non-existent goal
    with pytest.raises(ValueError, match="Goal non_existent not found"):
        decomposer.get_goal_success_criteria("non_existent")

def test_get_goal_failure_mitigation(decomposer):
    """Test getting goal failure mitigation strategies."""
    # Create test goal with failure mitigation
    goal = Goal(
        id="test_goal",
        description="Test goal",
        decomposition=DecompositionResult(
            subtasks=[],
            dependencies={},
            resources=[],
            success_criteria=[],
            failure_mitigation=[
                {
                    "task_id": "test_goal",
                    "potential_failures": ["Task fails"],
                    "mitigation_strategies": ["Retry task"]
                }
            ],
            metadata={}
        )
    )
    decomposer.active_goals[goal.id] = goal
    
    # Test getting failure mitigation
    mitigation = decomposer.get_goal_failure_mitigation(goal.id)
    assert len(mitigation) == 1
    assert mitigation[0]["potential_failures"] == ["Task fails"]
    
    # Test getting mitigation for non-existent goal
    with pytest.raises(ValueError, match="Goal non_existent not found"):
        decomposer.get_goal_failure_mitigation("non_existent")

@pytest.mark.asyncio
async def test_parse_decomposition(decomposer, sample_llm_response):
    """Test parsing LLM response into structured decomposition."""
    # Parse decomposition
    result = await decomposer._parse_decomposition(sample_llm_response, "goal_1")
    
    # Verify result structure
    assert isinstance(result, DecompositionResult)
    assert result.goal_id == "goal_1"
    assert result.strategy == DecompositionStrategy.HIERARCHICAL
    assert result.confidence == 0.85
    assert result.estimated_duration == 7.0
    assert result.required_plugins == {"database_plugin", "config_plugin"}
    assert result.metadata["environment"] == "production"
    
    # Verify subgoals
    assert len(result.subgoals) == 2
    
    # Check first subgoal
    task1 = result.subgoals[0]
    assert isinstance(task1, SubGoal)
    assert task1.id == "task_1"
    assert task1.description == "Initialize database connection"
    assert task1.dependencies == []
    assert task1.estimated_duration == 5.0
    assert task1.priority == 0.8
    assert task1.required_plugins == ["database_plugin"]
    assert len(task1.test_cases) == 1
    assert task1.test_cases[0]["name"] == "test_db_connection"
    assert task1.retry_strategy["max_attempts"] == 3
    
    # Check second subgoal
    task2 = result.subgoals[1]
    assert isinstance(task2, SubGoal)
    assert task2.id == "task_2"
    assert task2.description == "Load configuration"
    assert task2.dependencies == ["task_1"]
    assert task2.estimated_duration == 2.0
    assert task2.priority == 0.7
    assert task2.required_plugins == ["config_plugin"]
    assert len(task2.test_cases) == 1
    assert task2.test_cases[0]["name"] == "test_config_load"
    
    # Verify test suite
    assert "test_suite" in result.__dict__
    assert len(result.test_suite["test_cases"]) == 2
    assert len(result.test_suite["integration_tests"]) > 0
    assert len(result.test_suite["performance_tests"]) > 0

@pytest.mark.asyncio
async def test_parse_decomposition_malformed(decomposer):
    """Test handling of malformed LLM response."""
    # Test with invalid JSON
    with pytest.raises(Exception):
        await decomposer._parse_decomposition("invalid json", "goal_1")
    
    # Test with missing required fields
    malformed_response = """
    {
        "strategy": "hierarchical",
        "subgoals": [
            {
                "description": "Missing ID"
            }
        ]
    }
    """
    with pytest.raises(Exception):
        await decomposer._parse_decomposition(malformed_response, "goal_1")
    
    # Test with invalid strategy
    invalid_strategy = """
    {
        "strategy": "invalid_strategy",
        "subgoals": []
    }
    """
    with pytest.raises(Exception):
        await decomposer._parse_decomposition(invalid_strategy, "goal_1")

@pytest.mark.asyncio
async def test_parse_decomposition_defaults(decomposer):
    """Test default values in decomposition parsing."""
    minimal_response = """
    {
        "strategy": "sequential",
        "subgoals": [
            {
                "id": "task_1",
                "description": "Basic task"
            }
        ]
    }
    """
    result = await decomposer._parse_decomposition(minimal_response, "goal_1")
    
    # Verify defaults
    assert result.confidence == 0.5  # Default confidence
    assert result.estimated_duration == 0.0  # Default duration
    assert result.required_plugins == set()  # Default empty set
    
    # Verify subgoal defaults
    task = result.subgoals[0]
    assert task.dependencies == []  # Default empty list
    assert task.estimated_duration == 0.0  # Default duration
    assert task.priority == 0.5  # Default priority
    assert task.required_plugins == []  # Default empty list
    assert len(task.test_cases) == 1  # Default test case generated
    assert task.retry_strategy is not None  # Default retry strategy

def test_parse_decomposition_json():
    """Test parsing JSON-formatted decomposition."""
    decomposer = GoalDecomposer()
    
    # Test valid JSON
    valid_json = '''[
        {
            "id": "task1",
            "description": "First task",
            "dependencies": [],
            "priority": 0.8,
            "estimated_duration": 120,
            "required_skills": ["python", "testing"],
            "success_criteria": ["tests pass", "docs updated"]
        },
        {
            "id": "task2",
            "description": "Second task",
            "dependencies": ["task1"],
            "priority": 0.6,
            "estimated_duration": 60,
            "required_skills": ["python"],
            "success_criteria": ["code reviewed"]
        }
    ]'''
    
    subtasks = decomposer._parse_decomposition(valid_json)
    assert len(subtasks) == 2
    assert subtasks[0]['id'] == 'task1'
    assert subtasks[1]['id'] == 'task2'
    assert subtasks[1]['dependencies'] == ['task1']
    
    # Test invalid JSON
    invalid_json = '{"not": "a list"}'
    subtasks = decomposer._parse_decomposition(invalid_json)
    assert len(subtasks) == 1
    assert subtasks[0]['id'] == 'error_subtask'
    assert 'Error parsing decomposition' in subtasks[0]['description']

def test_parse_structured_text():
    """Test parsing structured text format."""
    decomposer = GoalDecomposer()
    
    text = '''Task 1: Implement core functionality
    Dependencies: 
    Priority: 0.8
    Duration: 120
    Skills: python, testing
    Success Criteria: tests pass, docs updated
    
    Task 2: Add error handling
    Dependencies: Task 1
    Priority: 0.6
    Duration: 60
    Skills: python
    Success Criteria: code reviewed'''
    
    subtasks = decomposer._parse_structured_text(text)
    assert len(subtasks) == 2
    assert subtasks[0]['id'] == 'subtask_1'
    assert 'Implement core functionality' in subtasks[0]['description']
    assert subtasks[0]['priority'] == 0.8
    assert subtasks[0]['estimated_duration'] == 120
    assert 'python' in subtasks[0]['required_skills']
    assert 'tests pass' in subtasks[0]['success_criteria']
    
    assert subtasks[1]['id'] == 'subtask_2'
    assert 'Add error handling' in subtasks[1]['description']
    assert subtasks[1]['dependencies'] == ['Task 1']

def test_dependency_validation():
    """Test dependency validation and cycle detection."""
    decomposer = GoalDecomposer()
    
    # Test valid dependencies
    valid_json = '''[
        {
            "id": "task1",
            "description": "First task",
            "dependencies": []
        },
        {
            "id": "task2",
            "description": "Second task",
            "dependencies": ["task1"]
        }
    ]'''
    
    subtasks = decomposer._parse_decomposition(valid_json)
    assert len(subtasks) == 2
    assert decomposer.get_subtask_order() == ['task1', 'task2']
    
    # Test circular dependencies
    circular_json = '''[
        {
            "id": "task1",
            "description": "First task",
            "dependencies": ["task2"]
        },
        {
            "id": "task2",
            "description": "Second task",
            "dependencies": ["task1"]
        }
    ]'''
    
    subtasks = decomposer._parse_decomposition(circular_json)
    assert len(subtasks) == 1
    assert 'Circular dependencies detected' in subtasks[0]['description']

def test_field_validation():
    """Test validation of subtask fields."""
    decomposer = GoalDecomposer()
    
    # Test invalid priority
    invalid_priority = '''[
        {
            "id": "task1",
            "description": "First task",
            "priority": 2.0
        }
    ]'''
    
    subtasks = decomposer._parse_decomposition(invalid_priority)
    assert len(subtasks) == 1
    assert 'Invalid priority' in subtasks[0]['description']
    
    # Test invalid duration
    invalid_duration = '''[
        {
            "id": "task1",
            "description": "First task",
            "estimated_duration": -1
        }
    ]'''
    
    subtasks = decomposer._parse_decomposition(invalid_duration)
    assert len(subtasks) == 1
    assert 'Invalid estimated_duration' in subtasks[0]['description']
    
    # Test invalid dependencies
    invalid_deps = '''[
        {
            "id": "task1",
            "description": "First task",
            "dependencies": "not a list"
        }
    ]'''
    
    subtasks = decomposer._parse_decomposition(invalid_deps)
    assert len(subtasks) == 1
    assert 'Invalid dependencies' in subtasks[0]['description']

def test_dependency_graph():
    """Test dependency graph operations."""
    decomposer = GoalDecomposer()
    
    json_input = '''[
        {
            "id": "task1",
            "description": "First task",
            "dependencies": []
        },
        {
            "id": "task2",
            "description": "Second task",
            "dependencies": ["task1"]
        },
        {
            "id": "task3",
            "description": "Third task",
            "dependencies": ["task1", "task2"]
        }
    ]'''
    
    decomposer._parse_decomposition(json_input)
    
    # Test dependency order
    order = decomposer.get_subtask_order()
    assert order == ['task1', 'task2', 'task3']
    
    # Test getting dependencies
    deps = decomposer.get_subtask_dependencies('task3')
    assert set(deps) == {'task1', 'task2'}
    
    # Test getting dependents
    dependents = decomposer.get_subtask_dependents('task1')
    assert set(dependents) == {'task2', 'task3'}

# Sample LLM outputs in different formats
SAMPLE_JSON = {
    "subtasks": [
        {
            "id": "step_1",
            "description": "Scrape data from website",
            "dependencies": [],
            "priority": 0.8,
            "estimated_duration": 300,
            "required_skills": ["web_scraping", "python"],
            "success_criteria": ["data extracted", "no errors"],
            "plugins": ["web_scraper"]
        },
        {
            "id": "step_2",
            "description": "Process raw data",
            "dependencies": ["step_1"],
            "priority": 0.6,
            "estimated_duration": 180,
            "required_skills": ["data_processing"],
            "success_criteria": ["data cleaned", "format correct"],
            "plugins": ["data_processor"]
        }
    ]
}

SAMPLE_YAML = """
subtasks:
  - id: step_1
    description: Scrape data from website
    dependencies: []
    priority: 0.8
    estimated_duration: 300
    required_skills: [web_scraping, python]
    success_criteria: [data extracted, no errors]
    plugins: [web_scraper]
  - id: step_2
    description: Process raw data
    dependencies: [step_1]
    priority: 0.6
    estimated_duration: 180
    required_skills: [data_processing]
    success_criteria: [data cleaned, format correct]
    plugins: [data_processor]
"""

SAMPLE_TEXT = """
Subtask 1: Scrape data from website
Dependencies: 
Priority: 0.8
Duration: 300
Skills: web_scraping, python
Success Criteria: data extracted, no errors
Plugins: web_scraper

Subtask 2: Process raw data
Dependencies: step_1
Priority: 0.6
Duration: 180
Skills: data_processing
Success Criteria: data cleaned, format correct
Plugins: data_processor
"""

# Invalid samples
INVALID_JSON = {
    "subtasks": [
        {
            "id": "step_1",
            "description": "Invalid task",
            "dependencies": ["nonexistent"],
            "priority": 2.0,  # Invalid priority
            "plugins": [123]  # Invalid plugin type
        }
    ]
}

INVALID_CIRCULAR = {
    "subtasks": [
        {
            "id": "step_1",
            "description": "Task 1",
            "dependencies": ["step_2"]
        },
        {
            "id": "step_2",
            "description": "Task 2",
            "dependencies": ["step_1"]
        }
    ]
}

def test_parse_json_decomposition(decomposer):
    """Test parsing JSON format decomposition."""
    result = decomposer._parse_decomposition(json.dumps(SAMPLE_JSON))
    
    assert len(result) == 2
    assert result[0]["id"] == "step_1"
    assert result[0]["description"] == "Scrape data from website"
    assert result[0]["dependencies"] == []
    assert result[0]["priority"] == 0.8
    assert result[0]["estimated_duration"] == 300
    assert result[0]["required_skills"] == ["web_scraping", "python"]
    assert result[0]["success_criteria"] == ["data extracted", "no errors"]
    assert result[0]["plugins"] == ["web_scraper"]
    
    assert result[1]["id"] == "step_2"
    assert result[1]["dependencies"] == ["step_1"]

def test_parse_yaml_decomposition(decomposer):
    """Test parsing YAML format decomposition."""
    result = decomposer._parse_decomposition(SAMPLE_YAML)
    
    assert len(result) == 2
    assert result[0]["id"] == "step_1"
    assert result[1]["id"] == "step_2"
    assert result[1]["dependencies"] == ["step_1"]

def test_parse_text_decomposition(decomposer):
    """Test parsing structured text format decomposition."""
    result = decomposer._parse_decomposition(SAMPLE_TEXT)
    
    assert len(result) == 2
    assert result[0]["id"] == "subtask_1"
    assert result[0]["description"] == "Scrape data from website"
    assert result[1]["id"] == "subtask_2"
    assert result[1]["dependencies"] == ["step_1"]

def test_invalid_json_decomposition(decomposer):
    """Test handling of invalid JSON decomposition."""
    with pytest.raises(ValueError) as exc_info:
        decomposer._parse_decomposition(json.dumps(INVALID_JSON))
    
    error_msg = str(exc_info.value)
    assert "Invalid" in error_msg
    assert any(msg in error_msg for msg in ["priority", "plugins", "nonexistent"])

def test_circular_dependencies(decomposer):
    """Test detection of circular dependencies."""
    with pytest.raises(ValueError) as exc_info:
        decomposer._parse_decomposition(json.dumps(INVALID_CIRCULAR))
    
    assert "Circular dependencies" in str(exc_info.value)

def test_missing_required_fields(decomposer):
    """Test handling of missing required fields."""
    invalid_input = {
        "subtasks": [
            {
                "description": "Missing ID field"
            }
        ]
    }
    
    result = decomposer._parse_decomposition(json.dumps(invalid_input))
    assert len(result) == 1
    assert result[0]["id"] == "subtask_1"  # Auto-generated ID
    assert result[0]["description"] == "Missing ID field"

def test_default_values(decomposer):
    """Test default values for optional fields."""
    minimal_input = {
        "subtasks": [
            {
                "id": "step_1",
                "description": "Minimal task"
            }
        ]
    }
    
    result = decomposer._parse_decomposition(json.dumps(minimal_input))
    assert len(result) == 1
    assert result[0]["dependencies"] == []
    assert result[0]["priority"] == 0.5
    assert result[0]["estimated_duration"] == 60
    assert result[0]["required_skills"] == []
    assert result[0]["success_criteria"] == []
    assert result[0]["plugins"] == []

def test_dependency_validation(decomposer):
    """Test validation of dependencies."""
    invalid_deps = {
        "subtasks": [
            {
                "id": "step_1",
                "description": "Task 1",
                "dependencies": ["nonexistent_task"]
            }
        ]
    }
    
    with pytest.raises(ValueError) as exc_info:
        decomposer._parse_decomposition(json.dumps(invalid_deps))
    
    assert "Dependency nonexistent_task not found" in str(exc_info.value)

def test_get_subtask_order(decomposer):
    """Test getting subtasks in dependency order."""
    # First parse a valid decomposition
    result = decomposer._parse_decomposition(json.dumps(SAMPLE_JSON))
    
    # Get ordered subtasks
    ordered = decomposer.get_subtask_order()
    assert len(ordered) == 2
    assert ordered[0] == "step_1"  # First task has no dependencies
    assert ordered[1] == "step_2"  # Second task depends on first

def test_get_subtask_dependencies(decomposer):
    """Test getting subtask dependencies."""
    result = decomposer._parse_decomposition(json.dumps(SAMPLE_JSON))
    
    # Get dependencies for step_2
    deps = decomposer.get_subtask_dependencies("step_2")
    assert len(deps) == 1
    assert "step_1" in deps

def test_get_subtask_dependents(decomposer):
    """Test getting subtask dependents."""
    result = decomposer._parse_decomposition(json.dumps(SAMPLE_JSON))
    
    # Get dependents for step_1
    dependents = decomposer.get_subtask_dependents("step_1")
    assert len(dependents) == 1
    assert "step_2" in dependents 