"""
Tests for the failure analyzer.
"""

import pytest
from datetime import datetime
from core.failure_analyzer import failure_analyzer, ErrorGroup

@pytest.fixture
def sample_test_results():
    """Create sample test results with various failures."""
    return {
        'test_results': [
            {
                'test_id': 'test_1',
                'status': 'failure',
                'error': 'Invalid input: required_field must be a string',
                'timestamp': datetime.now().isoformat()
            },
            {
                'test_id': 'test_2',
                'status': 'failure',
                'error': 'No module named "nonexistent_package"',
                'timestamp': datetime.now().isoformat()
            },
            {
                'test_id': 'test_3',
                'status': 'failure',
                'error': 'Test exceeded timeout of 1.0s',
                'timestamp': datetime.now().isoformat()
            },
            {
                'test_id': 'test_4',
                'status': 'failure',
                'error': 'Memory limit exceeded: 200MB used',
                'timestamp': datetime.now().isoformat()
            },
            {
                'test_id': 'test_5',
                'status': 'success',
                'timestamp': datetime.now().isoformat()
            }
        ]
    }

@pytest.mark.asyncio
async def test_analyze_failures(sample_test_results):
    """Test failure analysis with various error types."""
    result = await failure_analyzer.analyze_failures(sample_test_results)
    
    assert result['status'] == 'success'
    assert len(result['failures']) == 4  # 4 failures, 1 success
    assert len(result['error_groups']) >= 4  # At least one group per error type
    
    # Check error groups
    groups = {g['category']: g for g in result['error_groups']}
    
    assert 'input_format' in groups
    assert 'missing_package' in groups
    assert 'timeout' in groups
    assert 'memory' in groups
    
    # Check suggestions
    assert len(result['suggestions']) > 0
    assert any('input_format' in s for s in result['suggestions'])
    assert any('missing_package' in s for s in result['suggestions'])

@pytest.mark.asyncio
async def test_error_grouping():
    """Test grouping of similar errors."""
    test_results = {
        'test_results': [
            {
                'test_id': 'test_1',
                'status': 'failure',
                'error': 'Invalid input: field1 must be a string',
                'timestamp': datetime.now().isoformat()
            },
            {
                'test_id': 'test_2',
                'status': 'failure',
                'error': 'Invalid input: field2 must be an integer',
                'timestamp': datetime.now().isoformat()
            },
            {
                'test_id': 'test_3',
                'status': 'failure',
                'error': 'Invalid input: field3 must be a boolean',
                'timestamp': datetime.now().isoformat()
            }
        ]
    }
    
    result = await failure_analyzer.analyze_failures(test_results)
    
    # Check that similar errors are grouped
    input_format_group = next(
        g for g in result['error_groups']
        if g['category'] == 'input_format'
    )
    
    assert input_format_group['count'] == 3
    assert len(input_format_group['examples']) == 3
    assert input_format_group['confidence'] > 0.5

def test_error_patterns():
    """Test error pattern management."""
    # Get current patterns
    patterns = failure_analyzer.get_error_patterns()
    assert 'input_format' in patterns
    assert 'missing_package' in patterns
    
    # Add new pattern
    failure_analyzer.add_error_pattern('custom', 'custom error pattern')
    patterns = failure_analyzer.get_error_patterns()
    assert 'custom' in patterns
    assert 'custom error pattern' in patterns['custom']

def test_suggested_fixes():
    """Test suggested fixes management."""
    # Get current fixes
    fixes = failure_analyzer.get_suggested_fixes()
    assert 'input_format' in fixes
    assert 'missing_package' in fixes
    
    # Add new fix
    failure_analyzer.add_suggested_fix('custom', 'custom fix suggestion')
    fixes = failure_analyzer.get_suggested_fixes()
    assert 'custom' in fixes
    assert 'custom fix suggestion' in fixes['custom']

@pytest.mark.asyncio
async def test_improvement_suggestions():
    """Test generation of improvement suggestions."""
    test_results = {
        'test_results': [
            {
                'test_id': 'test_1',
                'status': 'failure',
                'error': 'Invalid input: field1 must be a string',
                'timestamp': datetime.now().isoformat()
            },
            {
                'test_id': 'test_2',
                'status': 'failure',
                'error': 'Invalid input: field2 must be a string',
                'timestamp': datetime.now().isoformat()
            }
        ]
    }
    
    result = await failure_analyzer.analyze_failures(test_results)
    
    # Check that suggestions are generated for recurring issues
    assert len(result['suggestions']) > 0
    assert any('input_format' in s for s in result['suggestions'])
    
    # Check that no suggestions are generated for one-time issues
    test_results['test_results'].append({
        'test_id': 'test_3',
        'status': 'failure',
        'error': 'Unique error that never occurs again',
        'timestamp': datetime.now().isoformat()
    })
    
    result = await failure_analyzer.analyze_failures(test_results)
    assert not any('Unique error' in s for s in result['suggestions']) 