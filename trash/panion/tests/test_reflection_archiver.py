"""
Tests for the reflection archiver.
"""

import pytest
from datetime import datetime, timedelta
from core.reflection_archiver import reflection_archiver
from core.reflection import ReflectionType
import json

@pytest.fixture(autouse=True)
def reset_archiver():
    """Reset the archiver state before each test."""
    reflection_archiver._reflections = []
    yield

@pytest.fixture
def sample_reflection():
    """Create a sample reflection for testing."""
    return {
        'id': 'test_reflection_1',
        'timestamp': datetime.now().isoformat(),
        'context': 'test_context',
        'event': 'test_event',
        'type': ReflectionType.SUCCESS.value,
        'content': {'test': 'content'},
        'metadata': {
            'goal_id': 'test_goal',
            'plugin_id': 'test_plugin',
            'success': True,
            'duration': 1.5
        },
        'tags': ['test'],
        'importance': 0.8,
        'related_reflections': [],
        'version': 1
    }

@pytest.fixture
def error_reflection():
    """Create a sample error reflection for testing."""
    return {
        'id': 'test_reflection_2',
        'timestamp': datetime.now().isoformat(),
        'context': 'test_context',
        'event': 'test_error',
        'type': ReflectionType.ERROR.value,
        'content': {'error': 'test error'},
        'metadata': {
            'goal_id': 'test_goal',
            'plugin_id': 'test_plugin',
            'error_type': 'TestError',
            'error_message': 'Test error message',
            'impact': 0.7
        },
        'tags': ['test', 'error'],
        'importance': 0.9,
        'related_reflections': [],
        'version': 1
    }

@pytest.mark.asyncio
async def test_archive_reflection(sample_reflection):
    """Test archiving a single reflection."""
    result = await reflection_archiver.archive_reflection(sample_reflection)
    assert result['status'] == 'success'
    assert result['reflection_id'] == sample_reflection['id']
    
    # Check plugin performance
    plugin_perf = reflection_archiver.get_plugin_performance()
    assert 'test_plugin' in plugin_perf
    assert plugin_perf['test_plugin']['success_rate'] == 1.0
    assert plugin_perf['test_plugin']['avg_duration'] == 1.5

@pytest.mark.asyncio
async def test_archive_error_reflection(error_reflection):
    """Test archiving an error reflection."""
    result = await reflection_archiver.archive_reflection(error_reflection)
    assert result['status'] == 'success'
    assert result['reflection_id'] == error_reflection['id']
    
    # Check error patterns
    error_patterns = reflection_archiver.get_error_patterns()
    assert 'TestError' in error_patterns['most_common_errors']
    assert error_patterns['most_common_errors']['TestError'] >= 1
    assert error_patterns['highest_impact_errors']['TestError'] >= 0.7

@pytest.mark.asyncio
async def test_goal_completion_analysis(sample_reflection, error_reflection):
    """Test goal completion analysis."""
    await reflection_archiver.archive_reflection(sample_reflection)
    await reflection_archiver.archive_reflection(error_reflection)
    
    # Check goal completion stats
    goal_stats = reflection_archiver.get_goal_completion()
    assert 'test_goal' in goal_stats
    assert goal_stats['test_goal']['total_attempts'] == 2
    assert goal_stats['test_goal']['successful_attempts'] == 1
    assert goal_stats['test_goal']['completion_rate'] == 0.5

@pytest.mark.asyncio
async def test_system_health_analysis(sample_reflection, error_reflection):
    """Test system health analysis."""
    await reflection_archiver.archive_reflection(sample_reflection)
    await reflection_archiver.archive_reflection(error_reflection)
    
    # Check system health
    health = reflection_archiver.get_system_health()
    assert health['total_reflections'] == 2
    assert health['error_rate'] == 0.5
    assert health['success_rate'] == 0.5
    assert health['active_goals'] == 1
    assert health['active_plugins'] == 1

@pytest.mark.asyncio
async def test_archive_persistence(sample_reflection, tmp_path):
    """Test that archives are properly persisted."""
    # Set temporary path for testing
    reflection_archiver._summary_file = tmp_path / 'reflections_summary.json'
    
    # Archive reflection
    await reflection_archiver.archive_reflection(sample_reflection)
    
    # Check file exists
    assert reflection_archiver._summary_file.exists()
    
    # Load and verify content
    with open(reflection_archiver._summary_file, 'r') as f:
        saved_data = json.load(f)
    
    assert 'summaries' in saved_data
    assert 'reflections' in saved_data
    assert 'goals' in saved_data
    assert 'plugins' in saved_data

@pytest.mark.asyncio
async def test_multiple_reflections_analysis():
    """Test analysis with multiple reflections."""
    # Create multiple reflections
    reflections = []
    for i in range(5):
        reflection = {
            'id': f'test_reflection_{i}',
            'timestamp': datetime.now().isoformat(),
            'context': 'test_context',
            'event': f'test_event_{i}',
            'type': ReflectionType.SUCCESS.value if i % 2 == 0 else ReflectionType.ERROR.value,
            'content': {'test': f'content_{i}'},
            'metadata': {
                'goal_id': 'test_goal',
                'plugin_id': 'test_plugin',
                'success': i % 2 == 0,
                'duration': 1.0,
                'error_type': 'TestError' if i % 2 == 1 else None
            },
            'tags': ['test'],
            'importance': 0.8,
            'related_reflections': [],
            'version': 1
        }
        reflections.append(reflection)
    
    # Archive all reflections
    for reflection in reflections:
        await reflection_archiver.archive_reflection(reflection)
    
    # Check summaries
    summary = reflection_archiver.get_summary()
    assert summary['error_patterns']['most_common_errors']['TestError'] == 2
    assert summary['plugin_performance']['test_plugin']['success_rate'] == 0.6
    
    # Check system health
    health = reflection_archiver.get_system_health()
    assert health['error_rate'] == 0.4
    assert health['success_rate'] == 0.6 