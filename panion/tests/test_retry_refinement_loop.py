"""
Tests for the Retry and Refinement Loop.
"""

import pytest
import asyncio
from pathlib import Path
import json
from datetime import datetime
from unittest.mock import Mock, patch

from core.retry_refinement_loop import (
    RetryRefinementLoop,
    RetryStrategy,
    RetryContext,
    FailureAnalysis
)
from core.enhanced_goal_decomposer import SubGoal

@pytest.fixture
def config_path(tmp_path):
    """Create a temporary config file."""
    config = {
        "retry": {
            "default_strategy": "adaptive",
            "max_attempts": 3,
            "base_delay": 5.0
        },
        "failure_analysis": {
            "enabled": True,
            "gpt4": {
                "model": "gpt-4-turbo-preview",
                "temperature": 0.7
            }
        },
        "self_healing": {
            "enabled": True,
            "strategies": [
                {
                    "name": "plugin_synthesis",
                    "priority": 5,
                    "conditions": {
                        "error_types": ["*"],
                        "confidence_threshold": 0.7,
                        "min_attempts": 1,
                        "max_attempts": 5
                    },
                    "settings": {
                        "plugin_type": "service",
                        "sandbox_testing": True,
                        "auto_register": True,
                        "cleanup_on_failure": True
                    }
                }
            ]
        }
    }
    config_file = tmp_path / "retry_refinement.yaml"
    with open(config_file, "w") as f:
        json.dump(config, f)
    return str(config_file)

@pytest.fixture
def mock_services():
    """Mock required services."""
    goal_decomposer = Mock()
    memory_manager = Mock()
    memory_manager.store = Mock()
    memory_manager.retrieve = Mock(return_value=None)
    
    plugin_manager = Mock()
    plugin_manager.get_plugin = Mock()
    plugin_manager.test_plugin = Mock(return_value={"status": "success"})
    
    # Mock service locator with proper configuration
    service_locator = Mock()
    service_locator.get_service = Mock(side_effect=lambda name: {
        'goal_decomposer': goal_decomposer,
        'memory_manager': memory_manager,
        'plugin_manager': plugin_manager,
        'retry_refinement': None
    }.get(name))
    
    return {
        "goal_decomposer": goal_decomposer,
        "memory_manager": memory_manager,
        "plugin_manager": plugin_manager,
        "service_locator": service_locator
    }

@pytest.fixture
def retry_loop(config_path, mock_services):
    """Create a test instance of RetryRefinementLoop."""
    with patch("core.service_locator.service_locator", mock_services["service_locator"]):
        loop = RetryRefinementLoop(config_path)
        loop.plugin_manager = mock_services["plugin_manager"]  # Ensure plugin_manager is set
        return loop

@pytest.fixture
def sample_subgoal():
    """Create a sample subgoal for testing."""
    return SubGoal(
        id="test_subgoal",
        description="Test subgoal",
        parent_id="test_goal",
        dependencies=[],
        required_plugins=[],
        estimated_duration=1.0,
        priority=0.5,
        status="pending",
        created_at=datetime.now(),
        metadata={},
        test_cases=[
            {
                "name": "test_basic",
                "description": "Basic test",
                "expected_outcome": "success",
                "validation_criteria": ["criteria1"]
            }
        ],
        retry_strategy={
            "max_attempts": 3,
            "backoff_factor": 1.5,
            "timeout": 300,
            "plugin_synthesis": {
                "enabled": True,
                "confidence_threshold": 0.7
            }
        }
    )

@pytest.mark.asyncio
async def test_execute_with_retry_success(retry_loop, sample_subgoal):
    """Test successful task execution with retry."""
    task_id = "test_task"
    
    async def successful_executor():
        return "success"
    
    result = await retry_loop.execute_with_retry(
        task_id,
        sample_subgoal,
        successful_executor
    )
    
    assert result == "success"
    assert task_id in retry_loop._retry_contexts
    assert retry_loop._retry_contexts[task_id].attempt == 0

@pytest.mark.asyncio
async def test_execute_with_retry_failure(retry_loop, sample_subgoal):
    """Test task execution with retries after failures."""
    task_id = "test_task"
    attempt_count = 0
    
    async def failing_executor():
        nonlocal attempt_count
        attempt_count += 1
        if attempt_count < 3:
            raise ValueError("Temporary failure")
        return "success"
    
    result = await retry_loop.execute_with_retry(
        task_id,
        sample_subgoal,
        failing_executor
    )
    
    assert result == "success"
    assert retry_loop._retry_contexts[task_id].attempt == 2
    assert len(retry_loop._failure_history[task_id]) == 2

@pytest.mark.asyncio
async def test_execute_with_retry_max_attempts(retry_loop, sample_subgoal):
    """Test task execution with maximum attempts reached."""
    task_id = "test_task"
    
    async def always_failing_executor():
        raise ValueError("Permanent failure")
    
    with pytest.raises(ValueError):
        await retry_loop.execute_with_retry(
            task_id,
            sample_subgoal,
            always_failing_executor
        )
    
    assert retry_loop._retry_contexts[task_id].attempt == 3
    assert len(retry_loop._failure_history[task_id]) == 3

@pytest.mark.asyncio
async def test_retry_strategies(retry_loop, sample_subgoal):
    """Test different retry strategies."""
    task_id = "test_task"
    
    # Test linear strategy
    context = retry_loop._get_or_create_context(task_id, sample_subgoal.id)
    context.strategy = RetryStrategy.LINEAR
    delay = retry_loop._calculate_retry_delay(context)
    assert delay == context.retry_delay
    
    # Test exponential strategy
    context.strategy = RetryStrategy.EXPONENTIAL
    context.attempt = 2
    delay = retry_loop._calculate_retry_delay(context)
    assert delay == context.retry_delay * 2
    
    # Test adaptive strategy
    context.strategy = RetryStrategy.ADAPTIVE
    context.attempt = 1
    retry_loop._failure_history[task_id] = [
        FailureAnalysis(
            task_id=task_id,
            subgoal_id=sample_subgoal.id,
            error_type="ValueError",
            error_message="Test error",
            timestamp=datetime.now(),
            context={}
        )
    ]
    delay = retry_loop._calculate_retry_delay(context)
    assert isinstance(delay, float)

@pytest.mark.asyncio
async def test_failure_analysis(retry_loop, sample_subgoal):
    """Test failure analysis."""
    task_id = "test_task"
    error = ValueError("Test error")
    
    analysis = await retry_loop._analyze_failure(task_id, sample_subgoal, error)
    
    assert isinstance(analysis, FailureAnalysis)
    assert analysis.task_id == task_id
    assert analysis.subgoal_id == sample_subgoal.id
    assert analysis.error_type == "ValueError"
    assert analysis.error_message == "Test error"
    assert isinstance(analysis.timestamp, datetime)

def test_healing_strategy_registration(retry_loop):
    """Test registration of healing strategies."""
    def mock_healing_strategy():
        pass
    
    retry_loop.register_healing_strategy("ValueError", mock_healing_strategy)
    assert "ValueError" in retry_loop._healing_strategies
    assert retry_loop._healing_strategies["ValueError"] == mock_healing_strategy

def test_failure_history_retrieval(retry_loop):
    """Test retrieval of failure history."""
    task_id = "test_task"
    analysis = FailureAnalysis(
        task_id=task_id,
        subgoal_id="test_subgoal",
        error_type="ValueError",
        error_message="Test error",
        timestamp=datetime.now(),
        context={}
    )
    
    retry_loop._record_failure(analysis)
    
    history = retry_loop.get_failure_history(task_id)
    assert task_id in history
    assert len(history[task_id]) == 1
    assert history[task_id][0] == analysis

def test_retry_context_retrieval(retry_loop):
    """Test retrieval of retry contexts."""
    task_id = "test_task"
    subgoal_id = "test_subgoal"
    
    context = retry_loop._get_or_create_context(task_id, subgoal_id)
    
    contexts = retry_loop.get_retry_contexts()
    assert task_id in contexts
    assert contexts[task_id] == context

@pytest.mark.asyncio
async def test_error_handling(retry_loop, sample_subgoal):
    """Test error handling in retry loop."""
    task_id = "test_task"
    
    async def error_raising_executor():
        raise Exception("Test error")
    
    with pytest.raises(Exception):
        await retry_loop.execute_with_retry(
            task_id,
            sample_subgoal,
            error_raising_executor
        )
    
    assert task_id in retry_loop._failure_history
    assert len(retry_loop._failure_history[task_id]) > 0

def test_config_loading(retry_loop):
    """Test configuration loading."""
    assert isinstance(retry_loop.config, dict)
    assert "retry" in retry_loop.config
    assert "failure_analysis" in retry_loop.config

@pytest.mark.asyncio
async def test_plugin_synthesis_triggered(retry_loop, sample_subgoal):
    """Test that plugin synthesis is triggered after max attempts."""
    task_id = "test_task"
    
    async def failing_executor():
        raise ValueError("Test error")
    
    # Mock plugin synthesizer with proper configuration
    with patch("plugins.plugin_synthesizer.plugin_synthesizer") as mock_synthesizer:
        mock_synthesizer.execute.return_value = {
            "status": "success",
            "plugin_name": "auto_test_plugin"
        }
        
        # Mock plugin with proper configuration
        mock_plugin = Mock()
        mock_plugin.execute.return_value = {"status": "success", "result": "success"}
        retry_loop.plugin_manager.get_plugin.return_value = mock_plugin
        retry_loop.plugin_manager.test_plugin.return_value = {"status": "success"}
        
        # Mock failure analysis with proper confidence
        with patch("core.retry_refinement_loop.RetryRefinementLoop._analyze_failure") as mock_analyze:
            mock_analyze.return_value = FailureAnalysis(
                task_id=task_id,
                subgoal_id=sample_subgoal.id,
                error_type="ValueError",
                error_message="Test error",
                timestamp=datetime.now(),
                context={},
                confidence=0.8,  # Above threshold
                root_cause="Test root cause",
                suggested_fixes=["Test fix"]
            )
            
            # Execute with retry
            result = await retry_loop.execute_with_retry(
                task_id,
                sample_subgoal,
                failing_executor
            )
            
            # Verify plugin synthesis was triggered
            assert mock_synthesizer.execute.called
            assert retry_loop._retry_contexts[task_id].synthesized_plugin == "auto_test_plugin"
            assert result["status"] == "success"

@pytest.mark.asyncio
async def test_plugin_synthesis_failure(retry_loop, sample_subgoal):
    """Test handling of plugin synthesis failure."""
    task_id = "test_task"
    
    async def failing_executor():
        raise ValueError("Test error")
    
    # Mock plugin synthesizer to fail
    with patch("plugins.plugin_synthesizer.plugin_synthesizer") as mock_synthesizer:
        mock_synthesizer.execute.return_value = {
            "status": "failure",
            "error": "Synthesis failed"
        }
        
        # Mock failure analysis with proper confidence
        with patch("core.retry_refinement_loop.RetryRefinementLoop._analyze_failure") as mock_analyze:
            mock_analyze.return_value = FailureAnalysis(
                task_id=task_id,
                subgoal_id=sample_subgoal.id,
                error_type="ValueError",
                error_message="Test error",
                timestamp=datetime.now(),
                context={},
                confidence=0.8,  # Above threshold
                root_cause="Test root cause",
                suggested_fixes=["Test fix"]
            )
            
            # Execute with retry
            with pytest.raises(ValueError):
                await retry_loop.execute_with_retry(
                    task_id,
                    sample_subgoal,
                    failing_executor
                )
            
            # Verify plugin synthesis was attempted
            assert mock_synthesizer.execute.called
            assert retry_loop._retry_contexts[task_id].synthesized_plugin is None

@pytest.mark.asyncio
async def test_plugin_synthesis_conditions(retry_loop, sample_subgoal):
    """Test plugin synthesis trigger conditions."""
    task_id = "test_task"
    
    async def failing_executor():
        raise ValueError("Test error")
    
    # Test with low confidence
    with patch("core.retry_refinement_loop.RetryRefinementLoop._analyze_failure") as mock_analyze:
        mock_analyze.return_value = FailureAnalysis(
            task_id=task_id,
            subgoal_id=sample_subgoal.id,
            error_type="ValueError",
            error_message="Test error",
            timestamp=datetime.now(),
            context={},
            confidence=0.5  # Below threshold
        )
        
        with pytest.raises(ValueError):
            await retry_loop.execute_with_retry(
                task_id,
                sample_subgoal,
                failing_executor
            )
        
        # Verify plugin synthesis was not triggered
        assert not hasattr(retry_loop._retry_contexts[task_id], "synthesized_plugin")

@pytest.mark.asyncio
async def test_retry_with_synthesized_plugin(retry_loop, sample_subgoal):
    """Test retrying with a synthesized plugin."""
    task_id = "test_task"
    plugin_id = "auto_test_plugin"
    
    # Mock plugin
    mock_plugin = Mock()
    mock_plugin.execute.return_value = {"status": "success", "result": "success"}
    retry_loop.plugin_manager.get_plugin.return_value = mock_plugin
    
    async def original_executor():
        raise ValueError("Original error")
    
    # Test retry with synthesized plugin
    result = await retry_loop._retry_with_synthesized_plugin(
        task_id,
        sample_subgoal,
        plugin_id,
        original_executor
    )
    
    # Verify plugin was used
    assert mock_plugin.execute.called
    assert result["status"] == "success"

@pytest.mark.asyncio
async def test_plugin_synthesis_metrics(retry_loop, sample_subgoal):
    """Test plugin synthesis metrics recording."""
    task_id = "test_task"
    
    async def failing_executor():
        raise ValueError("Test error")
    
    # Mock plugin synthesizer
    with patch("plugins.plugin_synthesizer.plugin_synthesizer") as mock_synthesizer:
        mock_synthesizer.execute.return_value = {
            "status": "success",
            "plugin_name": "auto_test_plugin"
        }
        
        # Mock plugin
        mock_plugin = Mock()
        mock_plugin.execute.return_value = {"status": "success", "result": "success"}
        retry_loop.plugin_manager.get_plugin.return_value = mock_plugin
        
        # Execute with retry
        await retry_loop.execute_with_retry(
            task_id,
            sample_subgoal,
            failing_executor
        )
        
        # Verify metrics were recorded
        # Note: In a real implementation, we would verify the metrics were recorded
        # This is just a placeholder for the test structure
        pass 

@pytest.mark.asyncio
async def test_plugin_synthesis_success(retry_loop, sample_subgoal):
    """Test successful plugin synthesis and execution."""
    task_id = "test_task"
    
    async def failing_executor():
        raise ValueError("Test error")
    
    # Mock plugin synthesizer to succeed
    with patch("plugins.plugin_synthesizer.plugin_synthesizer") as mock_synthesizer:
        mock_synthesizer.execute.return_value = {
            "status": "success",
            "plugin_name": "test_plugin"
        }
        
        # Mock plugin manager
        mock_plugin = Mock()
        mock_plugin.execute.return_value = {"status": "success", "result": "test_result"}
        retry_loop.plugin_manager.get_plugin.return_value = mock_plugin
        retry_loop.plugin_manager.test_plugin.return_value = {"status": "success"}
        
        # Execute with retry
        result = await retry_loop.execute_with_retry(
            task_id,
            sample_subgoal,
            failing_executor
        )
        
        # Verify plugin synthesis was attempted
        assert mock_synthesizer.execute.called
        assert retry_loop._retry_contexts[task_id].synthesized_plugin == "test_plugin"
        assert result["status"] == "success"
        assert result["result"] == "test_result"

@pytest.mark.asyncio
async def test_plugin_synthesis_test_failure(retry_loop, sample_subgoal):
    """Test plugin synthesis with test failure."""
    task_id = "test_task"
    
    async def failing_executor():
        raise ValueError("Test error")
    
    # Mock plugin synthesizer to succeed
    with patch("plugins.plugin_synthesizer.plugin_synthesizer") as mock_synthesizer:
        mock_synthesizer.execute.return_value = {
            "status": "success",
            "plugin_name": "test_plugin"
        }
        
        # Mock plugin manager to fail test
        retry_loop.plugin_manager.test_plugin.return_value = {
            "status": "failure",
            "error": "Test failed"
        }
        
        # Execute with retry
        with pytest.raises(ValueError):
            await retry_loop.execute_with_retry(
                task_id,
                sample_subgoal,
                failing_executor
            )
        
        # Verify plugin synthesis was attempted but not used
        assert mock_synthesizer.execute.called
        assert retry_loop._retry_contexts[task_id].synthesized_plugin is None

@pytest.mark.asyncio
async def test_plugin_execution_fallback(retry_loop, sample_subgoal):
    """Test fallback to original executor when plugin fails."""
    task_id = "test_task"
    
    async def original_executor():
        return "original_success"
    
    # Mock plugin synthesizer to succeed
    with patch("plugins.plugin_synthesizer.plugin_synthesizer") as mock_synthesizer:
        mock_synthesizer.execute.return_value = {
            "status": "success",
            "plugin_name": "test_plugin"
        }
        
        # Mock plugin manager
        mock_plugin = Mock()
        mock_plugin.execute.return_value = {"status": "failure", "error": "Plugin failed"}
        retry_loop.plugin_manager.get_plugin.return_value = mock_plugin
        retry_loop.plugin_manager.test_plugin.return_value = {"status": "success"}
        
        # Execute with retry
        result = await retry_loop.execute_with_retry(
            task_id,
            sample_subgoal,
            original_executor
        )
        
        # Verify fallback to original executor
        assert result == "original_success"

@pytest.mark.asyncio
async def test_plugin_synthesis_confidence_threshold(retry_loop, sample_subgoal):
    """Test plugin synthesis confidence threshold."""
    task_id = "test_task"
    
    async def failing_executor():
        raise ValueError("Test error")
    
    # Test with different confidence levels
    confidence_levels = [0.6, 0.7, 0.8]
    for confidence in confidence_levels:
        with patch("core.retry_refinement_loop.RetryRefinementLoop._analyze_failure") as mock_analyze:
            mock_analyze.return_value = FailureAnalysis(
                task_id=task_id,
                subgoal_id=sample_subgoal.id,
                error_type="ValueError",
                error_message="Test error",
                timestamp=datetime.now(),
                context={},
                confidence=confidence,
                root_cause="Test root cause",
                suggested_fixes=["Test fix"]
            )
            
            with patch("plugins.plugin_synthesizer.plugin_synthesizer") as mock_synthesizer:
                mock_synthesizer.execute.return_value = {
                    "status": "success",
                    "plugin_name": "test_plugin"
                }
                
                # Execute with retry
                with pytest.raises(ValueError):
                    await retry_loop.execute_with_retry(
                        task_id,
                        sample_subgoal,
                        failing_executor
                    )
                
                # Verify plugin synthesis was triggered only for high confidence
                if confidence >= 0.7:
                    assert mock_synthesizer.execute.called
                else:
                    assert not mock_synthesizer.execute.called

@pytest.mark.asyncio
async def test_plugin_synthesis_reflection(retry_loop, sample_subgoal):
    """Test reflection logging during plugin synthesis."""
    task_id = "test_task"
    
    async def failing_executor():
        raise ValueError("Test error")
    
    # Mock reflection system
    with patch("core.reflection.reflection_system") as mock_reflection:
        # Mock plugin synthesis
        with patch("plugins.plugin_synthesizer.plugin_synthesizer") as mock_synthesizer:
            mock_synthesizer.execute.return_value = {
                "status": "success",
                "plugin_name": "test_plugin"
            }
            
            # Mock plugin manager
            mock_plugin = Mock()
            mock_plugin.execute.return_value = {"status": "success", "result": "test_result"}
            retry_loop.plugin_manager.get_plugin.return_value = mock_plugin
            retry_loop.plugin_manager.test_plugin.return_value = {"status": "success"}
            
            # Execute with retry
            await retry_loop.execute_with_retry(
                task_id,
                sample_subgoal,
                failing_executor
            )
            
            # Verify reflections were logged
            assert mock_reflection.log_thought.called
            reflection_calls = [
                call for call in mock_reflection.log_thought.call_args_list
                if call[0][0] == "retry_refinement"
            ]
            assert len(reflection_calls) > 0
            assert any("synthesized plugin" in call[0][1].lower() for call in reflection_calls) 