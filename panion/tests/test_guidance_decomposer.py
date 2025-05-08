"""
Tests for the Guidance-based goal decomposer.
"""

import pytest
import json
from unittest.mock import Mock, patch, AsyncMock
from pathlib import Path

from core.guidance_decomposer import GuidanceDecomposer, DecompositionResult
from core.guidance_config import GuidanceConfig

@pytest.fixture
def mock_config():
    """Create a mock configuration."""
    return GuidanceConfig(
        api_key="test_key",
        model="gpt-4-turbo-preview",
        temperature=0.7,
        max_tokens=2000
    )

@pytest.fixture
def mock_guidance():
    """Create a mock guidance module."""
    mock = Mock()
    mock.Program = Mock()
    mock.llms = Mock()
    mock.llms.OpenAI = Mock()
    return mock

@pytest.fixture
def decomposer(mock_config, mock_guidance):
    """Create a decomposer instance with mocked dependencies."""
    with patch("core.guidance_decomposer.guidance_config", mock_config), \
         patch("core.guidance_decomposer.GuidanceConfig.safe_import_guidance", return_value=mock_guidance):
        return GuidanceDecomposer(mock_config)

def test_init_creates_template_if_not_exists(decomposer, tmp_path):
    """Test that initialization creates template if it doesn't exist."""
    # Mock the template path to a temporary directory
    template_path = tmp_path / "templates" / "decomposition_prompt.txt"
    with patch("core.guidance_decomposer.Path") as mock_path:
        mock_path.return_value.parent = tmp_path
        mock_path.return_value.exists.return_value = False
        
        # Reinitialize decomposer
        decomposer._load_prompt_template()
        
        # Check that template was created
        assert template_path.exists()
        with open(template_path) as f:
            content = f.read()
            assert "You are a goal decomposition expert" in content
            assert "Format the response as a JSON object" in content

@pytest.mark.asyncio
async def test_decompose_goal_success(decomposer, mock_guidance):
    """Test successful goal decomposition."""
    # Mock response
    mock_response = {
        "subtasks": [
            {
                "id": "task1",
                "description": "Test task",
                "estimated_duration": 30,
                "priority": 0.8
            }
        ],
        "dependencies": {
            "task1": []
        },
        "resources": [
            {
                "type": "tool",
                "name": "test_tool",
                "description": "Test tool",
                "required_for": ["task1"]
            }
        ],
        "success_criteria": [
            {
                "task_id": "task1",
                "criteria": ["Complete task"],
                "validation_method": "Verify completion"
            }
        ],
        "failure_mitigation": [
            {
                "task_id": "task1",
                "potential_failures": ["Task fails"],
                "mitigation_strategies": ["Retry task"]
            }
        ]
    }
    
    # Setup mock program
    mock_program = AsyncMock()
    mock_program.return_value = json.dumps(mock_response)
    mock_guidance.Program.return_value = mock_program
    
    # Test decomposition
    result = await decomposer.decompose_goal("Test goal", {"context": "test"})
    
    # Verify result
    assert isinstance(result, DecompositionResult)
    assert result.subtasks == mock_response["subtasks"]
    assert result.dependencies == mock_response["dependencies"]
    assert result.resources == mock_response["resources"]
    assert result.success_criteria == mock_response["success_criteria"]
    assert result.failure_mitigation == mock_response["failure_mitigation"]
    assert result.metadata["goal"] == "Test goal"
    assert result.metadata["context"] == {"context": "test"}

@pytest.mark.asyncio
async def test_decompose_goal_invalid_json(decomposer, mock_guidance):
    """Test goal decomposition with invalid JSON response."""
    # Setup mock program to return invalid JSON
    mock_program = AsyncMock()
    mock_program.return_value = "invalid json"
    mock_guidance.Program.return_value = mock_program
    
    # Test decomposition
    with pytest.raises(ValueError, match="Invalid JSON response from Guidance"):
        await decomposer.decompose_goal("Test goal")

@pytest.mark.asyncio
async def test_decompose_goal_missing_keys(decomposer, mock_guidance):
    """Test goal decomposition with missing required keys."""
    # Mock response with missing keys
    mock_response = {
        "subtasks": [],
        "dependencies": {}
    }
    
    # Setup mock program
    mock_program = AsyncMock()
    mock_program.return_value = json.dumps(mock_response)
    mock_guidance.Program.return_value = mock_program
    
    # Test decomposition
    with pytest.raises(ValueError, match="Missing required keys in decomposition result"):
        await decomposer.decompose_goal("Test goal")

def test_validate_decomposition_success():
    """Test successful decomposition validation."""
    result = DecompositionResult(
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
    
    decomposer = GuidanceDecomposer()
    assert decomposer.validate_decomposition(result)

def test_validate_decomposition_empty_subtasks():
    """Test validation with empty subtasks."""
    result = DecompositionResult(
        subtasks=[],
        dependencies={},
        resources=[],
        success_criteria=[],
        failure_mitigation=[],
        metadata={}
    )
    
    decomposer = GuidanceDecomposer()
    assert not decomposer.validate_decomposition(result)

def test_validate_decomposition_invalid_dependencies():
    """Test validation with invalid dependencies."""
    result = DecompositionResult(
        subtasks=[
            {
                "id": "task1",
                "description": "Test task",
                "estimated_duration": 30,
                "priority": 0.8
            }
        ],
        dependencies={
            "task2": ["task1"]  # task2 doesn't exist
        },
        resources=[],
        success_criteria=[],
        failure_mitigation=[],
        metadata={}
    )
    
    decomposer = GuidanceDecomposer()
    assert not decomposer.validate_decomposition(result) 