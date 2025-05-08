"""
Failure Analyzer
Analyzes plugin test failures, groups similar errors, and suggests improvements.
"""

import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime
import re
from collections import defaultdict
import difflib
from core.plugin_types import FailureAnalysis
from core.reflection import reflection_system

logger = logging.getLogger(__name__)

@dataclass
class ErrorGroup:
    """Group of similar errors."""
    category: str
    pattern: str
    examples: List[str]
    count: int
    suggested_fixes: List[str]
    confidence: float

class FailureAnalyzer:
    """Analyzes plugin test failures and suggests improvements."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.error_patterns = {
            'input_format': [
                r'invalid input',
                r'missing required field',
                r'type error',
                r'validation failed'
            ],
            'missing_package': [
                r'no module named',
                r'import error',
                r'package not found'
            ],
            'timeout': [
                r'timeout',
                r'exceeded time limit',
                r'execution too slow'
            ],
            'memory': [
                r'memory limit exceeded',
                r'out of memory',
                r'memory usage too high'
            ],
            'security': [
                r'security violation',
                r'dangerous operation',
                r'unsafe import'
            ],
            'runtime': [
                r'runtime error',
                r'unhandled exception',
                r'execution failed'
            ]
        }
        
        self.suggested_fixes = {
            'input_format': [
                'Add input validation',
                'Document expected input format',
                'Add type hints'
            ],
            'missing_package': [
                'Add missing dependency',
                'Update requirements.txt',
                'Check package compatibility'
            ],
            'timeout': [
                'Optimize slow operations',
                'Add caching',
                'Increase timeout limit'
            ],
            'memory': [
                'Reduce memory usage',
                'Use generators',
                'Implement pagination'
            ],
            'security': [
                'Remove dangerous operations',
                'Use safe alternatives',
                'Add security checks'
            ],
            'runtime': [
                'Add error handling',
                'Check preconditions',
                'Add logging'
            ]
        }

    async def analyze_failures(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze test failures and group similar errors."""
        try:
            # Extract failures
            failures = []
            for result in test_results.get('test_results', []):
                if result.get('status') != 'success':
                    failures.append({
                        'test_id': result.get('test_id'),
                        'error': result.get('error', ''),
                        'type': result.get('status'),
                        'timestamp': result.get('timestamp', datetime.now().isoformat())
                    })

            # Group similar errors
            error_groups = self._group_similar_errors(failures)
            
            # Generate improvement suggestions
            suggestions = self._generate_improvement_suggestions(error_groups)
            
            # Log analysis
            await reflection_system.log_thought(
                'failure_analysis',
                f'Analyzed {len(failures)} failures, found {len(error_groups)} error groups',
                {
                    'failures': failures,
                    'error_groups': [vars(g) for g in error_groups],
                    'suggestions': suggestions
                }
            )
            
            return {
                'status': 'success',
                'failures': failures,
                'error_groups': [vars(g) for g in error_groups],
                'suggestions': suggestions
            }
            
        except Exception as e:
            self.logger.error(f'Error analyzing failures: {e}')
            return {
                'status': 'failure',
                'error': str(e)
            }

    def _group_similar_errors(self, failures: List[Dict[str, Any]]) -> List[ErrorGroup]:
        """Group similar errors based on patterns."""
        groups = defaultdict(lambda: {
            'examples': [],
            'count': 0,
            'confidence': 0.0
        })
        
        for failure in failures:
            error = failure['error'].lower()
            matched = False
            
            # Check each pattern
            for category, patterns in self.error_patterns.items():
                for pattern in patterns:
                    if re.search(pattern, error):
                        groups[category]['examples'].append(error)
                        groups[category]['count'] += 1
                        groups[category]['confidence'] = min(0.9, groups[category]['confidence'] + 0.1)
                        matched = True
                        break
                if matched:
                    break
            
            # If no pattern matched, add to runtime errors
            if not matched:
                groups['runtime']['examples'].append(error)
                groups['runtime']['count'] += 1
                groups['runtime']['confidence'] = 0.5
        
        # Convert to ErrorGroup objects
        return [
            ErrorGroup(
                category=category,
                pattern=patterns[0] if category in self.error_patterns else 'runtime error',
                examples=data['examples'][:3],  # Keep top 3 examples
                count=data['count'],
                suggested_fixes=self.suggested_fixes.get(category, ['Add error handling']),
                confidence=data['confidence']
            )
            for category, data in groups.items()
        ]

    def _generate_improvement_suggestions(self, error_groups: List[ErrorGroup]) -> List[str]:
        """Generate improvement suggestions based on error groups."""
        suggestions = []
        
        for group in error_groups:
            if group.count >= 2:  # Only suggest for recurring issues
                suggestions.extend([
                    f"Address {group.category} issues: {fix}"
                    for fix in group.suggested_fixes
                ])
        
        return suggestions

    def get_error_patterns(self) -> Dict[str, List[str]]:
        """Get current error patterns."""
        return self.error_patterns

    def add_error_pattern(self, category: str, pattern: str) -> None:
        """Add a new error pattern."""
        if category not in self.error_patterns:
            self.error_patterns[category] = []
        self.error_patterns[category].append(pattern)

    def get_suggested_fixes(self) -> Dict[str, List[str]]:
        """Get current suggested fixes."""
        return self.suggested_fixes

    def add_suggested_fix(self, category: str, fix: str) -> None:
        """Add a new suggested fix."""
        if category not in self.suggested_fixes:
            self.suggested_fixes[category] = []
        self.suggested_fixes[category].append(fix)

# Create singleton instance
failure_analyzer = FailureAnalyzer() 