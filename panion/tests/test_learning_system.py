"""
Tests for the learning system module.
"""

import pytest
import asyncio
from datetime import datetime
from core.learning_system import learning_system, Pattern, Adaptation

@pytest.mark.asyncio
async def test_pattern_learning():
    """Test pattern learning functionality."""
    # Learn a new pattern
    features = {
        'type': 'success',
        'duration': 1.5,
        'resources': {'cpu': 50.0, 'memory': 512.0},
        'context': {'goal_id': 'test_goal', 'plugin_id': 'test_plugin'}
    }
    pattern_id = await learning_system.learn_pattern(
        'test_pattern',
        features,
        True,
        {'context': 'test'}
    )
    assert pattern_id is not None

    # Get pattern
    pattern = await learning_system.get_pattern(pattern_id)
    assert pattern is not None
    assert pattern.type == 'test_pattern'
    assert pattern.success_rate == 1.0
    assert pattern.frequency == 1

    # Learn similar pattern
    similar_features = {
        'type': 'success',
        'duration': 1.6,
        'resources': {'cpu': 55.0, 'memory': 520.0},
        'context': {'goal_id': 'test_goal', 'plugin_id': 'test_plugin'}
    }
    similar_pattern_id = await learning_system.learn_pattern(
        'test_pattern',
        similar_features,
        True,
        {'context': 'test'}
    )
    assert similar_pattern_id == pattern_id  # Should update existing pattern
    assert pattern.frequency == 2

@pytest.mark.asyncio
async def test_pattern_similarity():
    """Test pattern similarity calculation."""
    # Create two patterns
    features1 = {
        'type': 'success',
        'duration': 1.5,
        'resources': {'cpu': 50.0, 'memory': 512.0}
    }
    features2 = {
        'type': 'success',
        'duration': 1.6,
        'resources': {'cpu': 55.0, 'memory': 520.0}
    }

    pattern_id1 = await learning_system.learn_pattern(
        'test_pattern',
        features1,
        True,
        {'context': 'test'}
    )
    pattern_id2 = await learning_system.learn_pattern(
        'test_pattern',
        features2,
        True,
        {'context': 'test'}
    )

    # Get similar patterns
    similar_patterns = await learning_system.get_similar_patterns(pattern_id1)
    assert len(similar_patterns) > 0
    assert any(pid == pattern_id2 for pid, _ in similar_patterns)

@pytest.mark.asyncio
async def test_adaptation_creation():
    """Test adaptation creation and application."""
    # Create a pattern first
    features = {
        'type': 'error',
        'error_type': 'timeout',
        'context': {'goal_id': 'test_goal'}
    }
    pattern_id = await learning_system.learn_pattern(
        'error_pattern',
        features,
        False,
        {'context': 'test'}
    )

    # Create adaptation
    strategy = {
        'type': 'parameter_adjustment',
        'parameters': {
            'timeout': 30,
            'retry_count': 3
        }
    }
    adaptation_id = await learning_system.create_adaptation(
        pattern_id,
        strategy,
        {'context': 'test'}
    )
    assert adaptation_id is not None

    # Get adaptation
    adaptation = await learning_system.get_adaptation(adaptation_id)
    assert adaptation is not None
    assert adaptation.pattern_id == pattern_id
    assert adaptation.strategy == strategy

@pytest.mark.asyncio
async def test_adaptation_application():
    """Test adaptation application and impact calculation."""
    # Create pattern and adaptation
    features = {
        'type': 'performance',
        'metrics': {'response_time': 2.5, 'throughput': 100}
    }
    pattern_id = await learning_system.learn_pattern(
        'performance_pattern',
        features,
        True,
        {'context': 'test'}
    )

    strategy = {
        'type': 'resource_allocation',
        'resources': {
            'cpu': 75.0,
            'memory': 1024.0
        }
    }
    adaptation_id = await learning_system.create_adaptation(
        pattern_id,
        strategy,
        {'context': 'test'}
    )

    # Apply adaptation
    context = {
        'current_metrics': {'response_time': 2.0, 'throughput': 120},
        'available_resources': {'cpu': 100.0, 'memory': 2048.0}
    }
    result = await learning_system.apply_adaptation(adaptation_id, context)
    assert result is not None

    # Verify adaptation metrics
    adaptation = await learning_system.get_adaptation(adaptation_id)
    assert adaptation.last_applied is not None
    assert adaptation.impact >= 0.0
    assert adaptation.impact <= 1.0

@pytest.mark.asyncio
async def test_learning_data_persistence():
    """Test learning data persistence across restarts."""
    # Create pattern and adaptation
    features = {
        'type': 'test',
        'value': 42
    }
    pattern_id = await learning_system.learn_pattern(
        'test_pattern',
        features,
        True,
        {'context': 'test'}
    )

    strategy = {
        'type': 'parameter_adjustment',
        'parameters': {'value': 43}
    }
    adaptation_id = await learning_system.create_adaptation(
        pattern_id,
        strategy,
        {'context': 'test'}
    )

    # Create new learning system instance
    new_learning_system = learning_system.__class__()
    await new_learning_system._load_state()

    # Verify pattern persistence
    pattern = await new_learning_system.get_pattern(pattern_id)
    assert pattern is not None
    assert pattern.type == 'test_pattern'
    assert pattern.features == features

    # Verify adaptation persistence
    adaptation = await new_learning_system.get_adaptation(adaptation_id)
    assert adaptation is not None
    assert adaptation.pattern_id == pattern_id
    assert adaptation.strategy == strategy

@pytest.mark.asyncio
async def test_concurrent_operations():
    """Test concurrent operations on patterns and adaptations."""
    async def learn_pattern():
        features = {
            'type': 'test',
            'value': 42
        }
        return await learning_system.learn_pattern(
            'test_pattern',
            features,
            True,
            {'context': 'test'}
        )

    async def create_adaptation(pattern_id):
        strategy = {
            'type': 'parameter_adjustment',
            'parameters': {'value': 43}
        }
        return await learning_system.create_adaptation(
            pattern_id,
            strategy,
            {'context': 'test'}
        )

    # Run concurrent operations
    pattern_ids = await asyncio.gather(
        learn_pattern(),
        learn_pattern(),
        learn_pattern()
    )

    adaptation_ids = await asyncio.gather(
        create_adaptation(pattern_ids[0]),
        create_adaptation(pattern_ids[1]),
        create_adaptation(pattern_ids[2])
    )

    # Verify results
    for pattern_id in pattern_ids:
        pattern = await learning_system.get_pattern(pattern_id)
        assert pattern is not None

    for adaptation_id in adaptation_ids:
        adaptation = await learning_system.get_adaptation(adaptation_id)
        assert adaptation is not None

@pytest.mark.asyncio
async def test_execution_learning():
    """Test learning from execution results."""
    # Test successful execution
    execution_result = {
        'success': True,
        'duration': 1.5,
        'resource_usage': {'cpu': 50.0, 'memory': 512.0},
        'context': {'goal_id': 'test_goal', 'plugin_id': 'test_plugin'}
    }
    
    await learning_system.learn_from_execution('test_goal', execution_result)
    
    # Get execution insights
    insights = await learning_system.get_execution_insights('test_goal')
    assert insights is not None
    assert insights['success_rate'] == 1.0
    assert insights['total_executions'] == 1
    assert 'cpu' in insights['resource_usage']
    assert 'memory' in insights['resource_usage']
    
    # Test failed execution
    failed_result = {
        'success': False,
        'duration': 2.0,
        'resource_usage': {'cpu': 75.0, 'memory': 768.0},
        'error_type': 'timeout',
        'context': {'goal_id': 'test_goal', 'plugin_id': 'test_plugin'}
    }
    
    await learning_system.learn_from_execution('test_goal', failed_result)
    
    # Verify insights updated
    insights = await learning_system.get_execution_insights('test_goal')
    assert insights['success_rate'] == 0.5
    assert insights['total_executions'] == 2
    assert 'timeout' in insights['error_distribution']
    assert insights['error_distribution']['timeout'] == 1.0

@pytest.mark.asyncio
async def test_adaptation_strategy_generation():
    """Test adaptation strategy generation."""
    # Test timeout error
    timeout_result = {
        'success': False,
        'error_type': 'timeout',
        'context': {'timeout': 30, 'retry_count': 3}
    }
    
    strategy = await learning_system._generate_adaptation_strategy(
        'test_pattern',
        timeout_result
    )
    assert strategy['type'] == 'parameter_adjustment'
    assert strategy['parameters']['timeout'] == 60
    assert strategy['parameters']['retry_count'] == 4
    
    # Test resource exhaustion
    resource_result = {
        'success': False,
        'error_type': 'resource_exhaustion',
        'context': {'cpu': 50.0, 'memory': 512.0}
    }
    
    strategy = await learning_system._generate_adaptation_strategy(
        'test_pattern',
        resource_result
    )
    assert strategy['type'] == 'resource_allocation'
    assert strategy['resources']['cpu'] == 75.0
    assert strategy['resources']['memory'] == 768.0
    
    # Test validation error
    validation_result = {
        'success': False,
        'error_type': 'validation_error',
        'context': {}
    }
    
    strategy = await learning_system._generate_adaptation_strategy(
        'test_pattern',
        validation_result
    )
    assert strategy['type'] == 'input_validation'
    assert strategy['parameters']['strict_validation'] is True
    assert strategy['parameters']['retry_with_relaxed'] is True

@pytest.mark.asyncio
async def test_learning_data_updates():
    """Test learning data updates."""
    # Add multiple executions
    executions = [
        {
            'success': True,
            'duration': 1.0,
            'resource_usage': {'cpu': 50.0, 'memory': 512.0}
        },
        {
            'success': False,
            'duration': 2.0,
            'resource_usage': {'cpu': 75.0, 'memory': 768.0},
            'error_type': 'timeout'
        },
        {
            'success': True,
            'duration': 1.5,
            'resource_usage': {'cpu': 60.0, 'memory': 640.0}
        }
    ]
    
    for execution in executions:
        await learning_system.learn_from_execution('test_goal', execution)
    
    # Get insights
    insights = await learning_system.get_execution_insights('test_goal')
    assert insights['success_rate'] == 2/3
    assert insights['total_executions'] == 3
    assert 'timeout' in insights['error_distribution']
    assert insights['error_distribution']['timeout'] == 1.0
    
    # Verify resource usage tracking
    assert 'cpu' in insights['resource_usage']
    assert 'memory' in insights['resource_usage']
    assert insights['resource_usage']['cpu'] > 0
    assert insights['resource_usage']['memory'] > 0
    
    # Verify recent trends
    assert 'success_rate' in insights['recent_trends']
    assert 'cpu_trend' in insights['recent_trends']
    assert 'memory_trend' in insights['recent_trends']

@pytest.mark.asyncio
async def test_execution_history_limits():
    """Test execution history size limits."""
    # Add more than 100 executions
    for i in range(150):
        execution = {
            'success': i % 2 == 0,
            'duration': 1.0,
            'resource_usage': {'cpu': 50.0, 'memory': 512.0}
        }
        await learning_system.learn_from_execution('test_goal', execution)
    
    # Get insights
    insights = await learning_system.get_execution_insights('test_goal')
    assert insights['total_executions'] == 150
    
    # Verify only last 100 executions are kept
    learning_data = await learning_system.get_learning_data('test_goal')
    assert len(learning_data['executions']) == 100
    
    # Verify resource usage history limits
    for resource in ['cpu', 'memory']:
        assert len(learning_data['resource_usage'][resource]) <= 50 