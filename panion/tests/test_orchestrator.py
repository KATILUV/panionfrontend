"""
Tests for the orchestrator module.
"""

import pytest
import asyncio
from datetime import datetime
from core.orchestrator import orchestrator, LoopMetrics

@pytest.mark.asyncio
async def test_global_state_operations():
    """Test global state operations."""
    # Test setting and getting values
    await orchestrator.state.set('test_key', 'test_value')
    value = await orchestrator.state.get('test_key')
    assert value == 'test_value'

    # Test updating values
    await orchestrator.state.update('test_dict', lambda x: {**x, 'new_key': 'new_value'})
    value = await orchestrator.state.get('test_dict')
    assert value == {'new_key': 'new_value'}

    # Test default value
    value = await orchestrator.state.get('nonexistent_key', 'default')
    assert value == 'default'

@pytest.mark.asyncio
async def test_resource_management():
    """Test resource management."""
    # Set resource capacity
    await orchestrator.resources.set_capacity('cpu', 100.0)
    await orchestrator.resources.set_capacity('memory', 1024.0)

    # Test allocation
    success = await orchestrator.resources.allocate('cpu', 50.0)
    assert success is True

    # Test allocation beyond capacity
    success = await orchestrator.resources.allocate('cpu', 100.0)
    assert success is False

    # Test resource release
    await orchestrator.resources.release('cpu', 25.0)
    usage = await orchestrator.resources.get_usage('cpu')
    assert usage == 25.0

@pytest.mark.asyncio
async def test_loop_metrics():
    """Test loop metrics tracking."""
    # Update metrics for a loop
    metrics = {
        'success_rate': 0.8,
        'avg_duration': 1.5,
        'error_rate': 0.2,
        'resource_usage': {'cpu': 50.0, 'memory': 512.0}
    }
    await orchestrator.update_metrics('test_loop', metrics)

    # Get metrics
    loop_metrics = await orchestrator.get_loop_metrics('test_loop')
    assert loop_metrics is not None
    assert loop_metrics.success_rate == 0.8
    assert loop_metrics.avg_duration == 1.5
    assert loop_metrics.error_rate == 0.2
    assert loop_metrics.resource_usage == {'cpu': 50.0, 'memory': 512.0}

@pytest.mark.asyncio
async def test_loop_optimization():
    """Test loop optimization."""
    # Update metrics first
    metrics = {
        'success_rate': 0.8,
        'avg_duration': 1.5,
        'error_rate': 0.2,
        'resource_usage': {'cpu': 50.0, 'memory': 512.0}
    }
    await orchestrator.update_metrics('test_loop', metrics)

    # Get optimization parameters
    optimization = await orchestrator.optimize_loop('test_loop')
    assert optimization is not None
    assert 'success_threshold' in optimization
    assert 'error_threshold' in optimization
    assert 'resource_limits' in optimization
    assert 'adaptation_rate' in optimization

@pytest.mark.asyncio
async def test_pattern_learning():
    """Test pattern learning."""
    # Learn a pattern
    pattern = {
        'type': 'success',
        'success': True,
        'duration': 1.5,
        'resources': {'cpu': 50.0, 'memory': 512.0}
    }
    await orchestrator.learn_pattern('test_loop', pattern)

    # Get learning data
    learning_data = await orchestrator.get_learning_data('test_loop')
    assert learning_data is not None
    assert 'patterns' in learning_data
    assert 'success_rate' in learning_data
    assert 'total_events' in learning_data
    assert learning_data['success_rate'] == 1.0
    assert learning_data['total_events'] == 1

@pytest.mark.asyncio
async def test_concurrent_operations():
    """Test concurrent operations on state and resources."""
    async def update_state():
        await orchestrator.state.update('concurrent_test', lambda x: {**x, 'value': 1})

    async def update_resources():
        await orchestrator.resources.allocate('cpu', 10.0)

    # Run concurrent operations
    await asyncio.gather(
        update_state(),
        update_state(),
        update_resources(),
        update_resources()
    )

    # Verify state
    value = await orchestrator.state.get('concurrent_test')
    assert value == {'value': 1}

    # Verify resources
    usage = await orchestrator.resources.get_usage('cpu')
    assert usage == 20.0

@pytest.mark.asyncio
async def test_metrics_persistence():
    """Test metrics persistence across restarts."""
    # Update metrics
    metrics = {
        'success_rate': 0.8,
        'avg_duration': 1.5,
        'error_rate': 0.2,
        'resource_usage': {'cpu': 50.0, 'memory': 512.0}
    }
    await orchestrator.update_metrics('test_loop', metrics)

    # Create new orchestrator instance
    new_orchestrator = orchestrator.__class__()
    await new_orchestrator._load_state()

    # Verify metrics persistence
    loop_metrics = await new_orchestrator.get_loop_metrics('test_loop')
    assert loop_metrics is not None
    assert loop_metrics.success_rate == 0.8
    assert loop_metrics.avg_duration == 1.5
    assert loop_metrics.error_rate == 0.2
    assert loop_metrics.resource_usage == {'cpu': 50.0, 'memory': 512.0}

@pytest.mark.asyncio
async def test_loop_coordination():
    """Test cross-loop coordination."""
    # Set up test data
    goal_id = "test_goal"
    
    # Update metrics for different loops
    goal_metrics = {
        'success_rate': 0.8,
        'avg_duration': 1.5,
        'error_rate': 0.2,
        'resource_usage': {'cpu': 50.0, 'memory': 512.0}
    }
    await orchestrator.update_metrics(f"goal_{goal_id}", goal_metrics)
    
    plugin_metrics = {
        'success_rate': 0.7,
        'avg_duration': 2.0,
        'error_rate': 0.3,
        'resource_usage': {'cpu': 75.0, 'memory': 768.0}
    }
    await orchestrator.update_metrics(f"plugin_{goal_id}", plugin_metrics)
    
    # Add memory insights
    memory_insights = {
        'reuse_rate': 0.6,
        'memory_count': 500
    }
    await orchestrator.learn_pattern(
        f"memory_{goal_id}",
        memory_insights,
        True,
        {'context': 'test'}
    )
    
    # Test coordination
    optimization = await orchestrator.coordinate_loops(goal_id)
    assert optimization is not None
    assert 'goal_priority' in optimization
    assert 'resource_allocation' in optimization
    assert 'memory_reuse' in optimization
    assert 'adaptation_strategy' in optimization
    
    # Verify optimization values
    assert 0.0 <= optimization['goal_priority'] <= 1.0
    assert 'cpu' in optimization['resource_allocation']
    assert 'memory' in optimization['resource_allocation']
    assert 'prune_threshold' in optimization['memory_reuse']
    assert 'type' in optimization['adaptation_strategy']

@pytest.mark.asyncio
async def test_resource_optimization():
    """Test resource allocation optimization."""
    # Set up test data
    goal_id = "test_goal"
    
    # Add resource usage patterns
    usage_patterns = {
        'cpu': [
            {'usage': 50.0, 'timestamp': '2024-01-01T00:00:00'},
            {'usage': 60.0, 'timestamp': '2024-01-02T00:00:00'},
            {'usage': 55.0, 'timestamp': '2024-01-03T00:00:00'}
        ],
        'memory': [
            {'usage': 512.0, 'timestamp': '2024-01-01T00:00:00'},
            {'usage': 600.0, 'timestamp': '2024-01-02T00:00:00'},
            {'usage': 550.0, 'timestamp': '2024-01-03T00:00:00'}
        ]
    }
    
    await orchestrator.learn_pattern(
        f"resources_{goal_id}",
        usage_patterns,
        True,
        {'context': 'test'}
    )
    
    # Test optimization
    allocation = await orchestrator.optimize_resource_allocation(goal_id)
    assert allocation is not None
    assert 'cpu' in allocation
    assert 'memory' in allocation
    
    # Verify allocation values
    assert allocation['cpu'] > 0.0
    assert allocation['memory'] > 0.0
    
    # Verify resource limits were updated
    usage = await orchestrator.resources.get_usage(goal_id)
    assert usage is not None

@pytest.mark.asyncio
async def test_goal_priority_calculation():
    """Test goal priority calculation."""
    # Test with good metrics
    good_metrics = LoopMetrics(
        success_rate=0.9,
        avg_duration=0.5,
        error_rate=0.1,
        resource_usage={'cpu': 50.0, 'memory': 512.0}
    )
    priority = orchestrator._calculate_goal_priority(good_metrics)
    assert 0.0 <= priority <= 1.0
    assert priority > 0.7  # Should be high priority
    
    # Test with poor metrics
    poor_metrics = LoopMetrics(
        success_rate=0.3,
        avg_duration=2.0,
        error_rate=0.7,
        resource_usage={'cpu': 50.0, 'memory': 512.0}
    )
    priority = orchestrator._calculate_goal_priority(poor_metrics)
    assert 0.0 <= priority <= 1.0
    assert priority < 0.3  # Should be low priority
    
    # Test with None metrics
    priority = orchestrator._calculate_goal_priority(None)
    assert priority == 0.5  # Should return default value

@pytest.mark.asyncio
async def test_memory_optimization():
    """Test memory usage optimization."""
    # Test with no insights
    optimization = orchestrator._optimize_memory_usage({})
    assert optimization is not None
    assert 'prune_threshold' in optimization
    assert 'reuse_threshold' in optimization
    assert 'max_memories' in optimization
    
    # Test with insights
    insights = {
        'reuse_rate': 0.8,
        'memory_count': 800
    }
    optimization = orchestrator._optimize_memory_usage(insights)
    assert optimization is not None
    assert optimization['reuse_threshold'] > 0.7
    assert optimization['max_memories'] > 800

@pytest.mark.asyncio
async def test_adaptation_strategy_selection():
    """Test adaptation strategy selection."""
    # Test with high error rate
    high_error_metrics = LoopMetrics(
        success_rate=0.4,
        avg_duration=1.0,
        error_rate=0.6,
        resource_usage={'cpu': 50.0, 'memory': 512.0}
    )
    strategy = orchestrator._select_adaptation_strategy(high_error_metrics)
    assert strategy is not None
    assert strategy['type'] == 'aggressive'
    assert strategy['parameters']['retry_count'] > 3
    
    # Test with low error rate
    low_error_metrics = LoopMetrics(
        success_rate=0.9,
        avg_duration=1.0,
        error_rate=0.1,
        resource_usage={'cpu': 50.0, 'memory': 512.0}
    )
    strategy = orchestrator._select_adaptation_strategy(low_error_metrics)
    assert strategy is not None
    assert strategy['type'] == 'conservative'
    assert strategy['parameters']['retry_count'] < 3
    
    # Test with None metrics
    strategy = orchestrator._select_adaptation_strategy(None)
    assert strategy is not None
    assert strategy['type'] == 'default'
    assert strategy['parameters']['retry_count'] == 3 