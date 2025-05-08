"""
Reflection Archiver
Groups and analyzes reflections by plugin, error type, and goal.
"""

import logging
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import asyncio
from dataclasses import dataclass
from collections import defaultdict
import statistics
from core.logging_config import get_logger, LogTimer

@dataclass
class ReflectionSummary:
    """Summary of reflections."""
    error_patterns: Dict[str, Any]
    plugin_performance: Dict[str, Any]
    goal_completion: Dict[str, Any]
    system_health: Dict[str, Any]

class ReflectionArchiver:
    def __init__(self):
        self.logger = get_logger(__name__)
        self.archive_dir = Path('data/reflection_archives')
        self.archive_dir.mkdir(exist_ok=True, parents=True)
        self._summary_file = self.archive_dir / 'reflections_summary.json'
        self._reflections: List[Dict[str, Any]] = []
        self._cache_ttl = timedelta(hours=1)
        self._last_cache_update = datetime.now()

    async def archive_reflection(self, reflection: Dict[str, Any]) -> Dict[str, Any]:
        """Archive a reflection and update summaries."""
        try:
            with LogTimer(self.logger, 'archive_reflection'):
                self._reflections.append(reflection)
                await self._save_reflections()
                
                return {
                    'status': 'success',
                    'reflection_id': reflection['id']
                }
                
        except Exception as e:
            self.logger.error(f"Error archiving reflection: {e}")
            return {
                'status': 'failure',
                'error': str(e)
            }

    def get_summary(self) -> Dict[str, Any]:
        """Get overall summary of reflections."""
        try:
            error_patterns = self.get_error_patterns()
            plugin_performance = self.get_plugin_performance()
            goal_completion = self.get_goal_completion()
            system_health = self.get_system_health()
            
            summary = ReflectionSummary(
                error_patterns=error_patterns,
                plugin_performance=plugin_performance,
                goal_completion=goal_completion,
                system_health=system_health
            )
            
            return vars(summary)
            
        except Exception as e:
            self.logger.error(f"Error getting summary: {e}")
            return {}

    def get_plugin_performance(self) -> Dict[str, Any]:
        """Get plugin performance metrics."""
        try:
            plugin_stats = defaultdict(lambda: {
                'total_executions': 0,
                'successful_executions': 0,
                'total_duration': 0.0,
                'success_rate': 0.0,
                'avg_duration': 0.0
            })
            
            for reflection in self._reflections:
                plugin_id = reflection.get('metadata', {}).get('plugin_id')
                if not plugin_id:
                    continue
                    
                stats = plugin_stats[plugin_id]
                stats['total_executions'] += 1
                
                if reflection.get('metadata', {}).get('success', False):
                    stats['successful_executions'] += 1
                    
                duration = reflection.get('metadata', {}).get('duration', 0.0)
                stats['total_duration'] += duration
            
            # Calculate rates and averages
            for plugin_id, stats in plugin_stats.items():
                total = stats['total_executions']
                if total > 0:
                    stats['success_rate'] = stats['successful_executions'] / total
                    stats['avg_duration'] = stats['total_duration'] / total
            
            return dict(plugin_stats)
            
        except Exception as e:
            self.logger.error(f"Error getting plugin performance: {e}")
            return {}

    def get_error_patterns(self) -> Dict[str, Any]:
        """Get error patterns analysis."""
        try:
            error_stats = {
                'most_common_errors': defaultdict(int),
                'highest_impact_errors': defaultdict(float)
            }
            
            for reflection in self._reflections:
                if reflection.get('type') == 'ERROR':
                    error_type = reflection.get('metadata', {}).get('error_type')
                    if error_type:
                        error_stats['most_common_errors'][error_type] += 1
                        impact = reflection.get('metadata', {}).get('impact', 0.0)
                        error_stats['highest_impact_errors'][error_type] = max(
                            error_stats['highest_impact_errors'][error_type],
                            impact
                        )
            
            return {
                'most_common_errors': dict(error_stats['most_common_errors']),
                'highest_impact_errors': dict(error_stats['highest_impact_errors'])
            }
            
        except Exception as e:
            self.logger.error(f"Error getting error patterns: {e}")
            return {}

    def get_goal_completion(self) -> Dict[str, Any]:
        """Get goal completion statistics."""
        try:
            goal_stats = defaultdict(lambda: {
                'total_attempts': 0,
                'successful_attempts': 0,
                'completion_rate': 0.0
            })
            
            for reflection in self._reflections:
                goal_id = reflection.get('metadata', {}).get('goal_id')
                if not goal_id:
                    continue
                    
                stats = goal_stats[goal_id]
                stats['total_attempts'] += 1
                
                if reflection.get('metadata', {}).get('success', False):
                    stats['successful_attempts'] += 1
            
            # Calculate completion rates
            for stats in goal_stats.values():
                total = stats['total_attempts']
                if total > 0:
                    stats['completion_rate'] = stats['successful_attempts'] / total
            
            return dict(goal_stats)
            
        except Exception as e:
            self.logger.error(f"Error getting goal completion stats: {e}")
            return {}

    def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health metrics."""
        try:
            total_reflections = len(self._reflections)
            error_count = sum(1 for r in self._reflections if r.get('type') == 'ERROR')
            success_count = sum(1 for r in self._reflections if r.get('metadata', {}).get('success', False))
            
            active_plugins = len({
                r.get('metadata', {}).get('plugin_id')
                for r in self._reflections
                if r.get('metadata', {}).get('plugin_id')
            })
            
            active_goals = len({
                r.get('metadata', {}).get('goal_id')
                for r in self._reflections
                if r.get('metadata', {}).get('goal_id')
            })
            
            return {
                'total_reflections': total_reflections,
                'error_rate': error_count / total_reflections if total_reflections > 0 else 0.0,
                'success_rate': success_count / total_reflections if total_reflections > 0 else 0.0,
                'active_plugins': active_plugins,
                'active_goals': active_goals
            }
            
        except Exception as e:
            self.logger.error(f"Error getting system health: {e}")
            return {}

    async def _save_reflections(self) -> None:
        """Save reflections to disk."""
        try:
            data = {
                'summaries': self.get_summary(),
                'reflections': self._reflections,
                'goals': self.get_goal_completion(),
                'plugins': self.get_plugin_performance()
            }
            
            self._summary_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self._summary_file, 'w') as f:
                json.dump(data, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Error saving reflections: {e}")
            raise

# Create singleton instance
reflection_archiver = ReflectionArchiver() 