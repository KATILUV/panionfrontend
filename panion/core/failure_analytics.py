"""
Failure Pattern Analysis System
Tracks, analyzes, and suggests fixes for plugin failures.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import defaultdict
import traceback
import hashlib
from core.logging_config import get_logger, LogTimer

@dataclass
class FailureSignature:
    """Represents a unique failure pattern."""
    signature_id: str
    plugin_id: str
    error_type: str
    error_message: str
    stack_trace: str
    input_data: Dict[str, Any]
    timestamp: datetime
    frequency: int = 1
    last_occurrence: datetime = None
    suggested_fixes: List[str] = None
    related_failures: Set[str] = None

@dataclass
class FailureGroup:
    """Groups related failures by pattern."""
    pattern_id: str
    error_type: str
    base_message: str
    occurrences: int
    first_seen: datetime
    last_seen: datetime
    affected_plugins: Set[str]
    signatures: List[FailureSignature]
    suggested_fixes: List[str]
    success_rate: float  # Rate of successful retries

class FailureAnalytics:
    def __init__(self, data_dir: str = "data/failure_analytics"):
        """Initialize failure analytics system.
        
        Args:
            data_dir: Directory to store failure data
        """
        self.logger = get_logger(__name__)
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # In-memory caches
        self._signatures: Dict[str, FailureSignature] = {}
        self._groups: Dict[str, FailureGroup] = {}
        self._plugin_stats: Dict[str, Dict[str, int]] = defaultdict(lambda: {
            "total_failures": 0,
            "unique_failures": 0,
            "successful_retries": 0
        })
        
        # Load existing data
        self._load_data()
        
    def _load_data(self):
        """Load existing failure data from disk."""
        try:
            # Load signatures
            sig_file = self.data_dir / "signatures.json"
            if sig_file.exists():
                with open(sig_file) as f:
                    data = json.load(f)
                    for sig_id, sig_data in data.items():
                        self._signatures[sig_id] = FailureSignature(
                            signature_id=sig_id,
                            **sig_data
                        )
            
            # Load groups
            group_file = self.data_dir / "groups.json"
            if group_file.exists():
                with open(group_file) as f:
                    data = json.load(f)
                    for group_id, group_data in data.items():
                        self._groups[group_id] = FailureGroup(
                            pattern_id=group_id,
                            **group_data
                        )
                        
            self.logger.info(f"Loaded {len(self._signatures)} signatures and {len(self._groups)} groups")
            
        except Exception as e:
            self.logger.error(f"Error loading failure data: {e}")
            
    def _save_data(self):
        """Save failure data to disk."""
        try:
            # Save signatures
            sig_file = self.data_dir / "signatures.json"
            with open(sig_file, "w") as f:
                json.dump({
                    sig_id: {
                        "plugin_id": sig.plugin_id,
                        "error_type": sig.error_type,
                        "error_message": sig.error_message,
                        "stack_trace": sig.stack_trace,
                        "input_data": sig.input_data,
                        "timestamp": sig.timestamp.isoformat(),
                        "frequency": sig.frequency,
                        "last_occurrence": sig.last_occurrence.isoformat() if sig.last_occurrence else None,
                        "suggested_fixes": sig.suggested_fixes,
                        "related_failures": list(sig.related_failures) if sig.related_failures else None
                    }
                    for sig_id, sig in self._signatures.items()
                }, f, indent=2)
            
            # Save groups
            group_file = self.data_dir / "groups.json"
            with open(group_file, "w") as f:
                json.dump({
                    group_id: {
                        "error_type": group.error_type,
                        "base_message": group.base_message,
                        "occurrences": group.occurrences,
                        "first_seen": group.first_seen.isoformat(),
                        "last_seen": group.last_seen.isoformat(),
                        "affected_plugins": list(group.affected_plugins),
                        "signatures": [sig.signature_id for sig in group.signatures],
                        "suggested_fixes": group.suggested_fixes,
                        "success_rate": group.success_rate
                    }
                    for group_id, group in self._groups.items()
                }, f, indent=2)
                
            self.logger.info("Saved failure data to disk")
            
        except Exception as e:
            self.logger.error(f"Error saving failure data: {e}")
            
    def track_failure_signature(
        self,
        plugin_id: str,
        error: Exception,
        input_data: Dict[str, Any],
        stack_trace: Optional[str] = None
    ) -> FailureSignature:
        """Track a new failure signature.
        
        Args:
            plugin_id: ID of the plugin that failed
            error: The exception that occurred
            input_data: Input data that caused the failure
            stack_trace: Optional stack trace string
            
        Returns:
            FailureSignature object for the failure
        """
        with LogTimer(self.logger, "track_failure_signature"):
            # Generate signature ID
            error_msg = str(error)
            stack = stack_trace or "".join(traceback.format_tb(error.__traceback__))
            sig_data = f"{plugin_id}:{type(error).__name__}:{error_msg}:{stack}"
            sig_id = hashlib.sha256(sig_data.encode()).hexdigest()[:16]
            
            # Update plugin stats
            self._plugin_stats[plugin_id]["total_failures"] += 1
            
            # Check if we've seen this signature before
            if sig_id in self._signatures:
                sig = self._signatures[sig_id]
                sig.frequency += 1
                sig.last_occurrence = datetime.now()
            else:
                # Create new signature
                sig = FailureSignature(
                    signature_id=sig_id,
                    plugin_id=plugin_id,
                    error_type=type(error).__name__,
                    error_message=error_msg,
                    stack_trace=stack,
                    input_data=input_data,
                    timestamp=datetime.now(),
                    last_occurrence=datetime.now(),
                    suggested_fixes=[],
                    related_failures=set()
                )
                self._signatures[sig_id] = sig
                self._plugin_stats[plugin_id]["unique_failures"] += 1
                
                # Generate suggested fixes
                sig.suggested_fixes = self._generate_suggested_fixes(sig)
                
                # Group with similar failures
                self._group_failure(sig)
            
            # Save updated data
            self._save_data()
            
            return sig
            
    def _generate_suggested_fixes(self, signature: FailureSignature) -> List[str]:
        """Generate suggested fixes for a failure signature.
        
        Args:
            signature: The failure signature to analyze
            
        Returns:
            List of suggested fixes
        """
        fixes = []
        
        # Common error patterns and fixes
        error_patterns = {
            r"timeout": [
                "Increase plugin timeout",
                "Optimize plugin performance",
                "Add request caching"
            ],
            r"memory": [
                "Increase memory limit",
                "Optimize memory usage",
                "Add garbage collection"
            ],
            r"permission": [
                "Check file permissions",
                "Verify API access",
                "Update security settings"
            ],
            r"connection": [
                "Check network connectivity",
                "Verify endpoint availability",
                "Add retry logic"
            ],
            r"validation": [
                "Validate input data",
                "Add type checking",
                "Update schema"
            ]
        }
        
        # Check for known patterns
        error_msg = signature.error_message.lower()
        for pattern, suggestions in error_patterns.items():
            if re.search(pattern, error_msg):
                fixes.extend(suggestions)
                
        # Add stack trace analysis
        if "AttributeError" in signature.error_type:
            fixes.append("Check object attribute access")
        elif "TypeError" in signature.error_type:
            fixes.append("Verify data types")
        elif "ValueError" in signature.error_type:
            fixes.append("Validate input values")
        elif "ImportError" in signature.error_type:
            fixes.append("Check dependency installation")
            
        return list(set(fixes))  # Remove duplicates
        
    def _group_failure(self, signature: FailureSignature):
        """Group a failure with similar ones.
        
        Args:
            signature: The failure signature to group
        """
        # Create pattern ID from error type and base message
        base_msg = re.sub(r'\d+', 'N', signature.error_message)  # Normalize numbers
        pattern_id = f"{signature.error_type}:{base_msg}"
        
        if pattern_id in self._groups:
            group = self._groups[pattern_id]
            group.occurrences += 1
            group.last_seen = datetime.now()
            group.affected_plugins.add(signature.plugin_id)
            group.signatures.append(signature)
        else:
            # Create new group
            group = FailureGroup(
                pattern_id=pattern_id,
                error_type=signature.error_type,
                base_message=base_msg,
                occurrences=1,
                first_seen=datetime.now(),
                last_seen=datetime.now(),
                affected_plugins={signature.plugin_id},
                signatures=[signature],
                suggested_fixes=signature.suggested_fixes,
                success_rate=0.0
            )
            self._groups[pattern_id] = group
            
    def group_by_exception_trace(self) -> Dict[str, List[FailureSignature]]:
        """Group failures by their exception trace.
        
        Returns:
            Dictionary mapping exception types to lists of signatures
        """
        groups = defaultdict(list)
        for sig in self._signatures.values():
            groups[sig.error_type].append(sig)
        return dict(groups)
        
    def suggest_common_fix(self, plugin_id: str) -> List[str]:
        """Suggest common fixes for a plugin's failures.
        
        Args:
            plugin_id: ID of the plugin to analyze
            
        Returns:
            List of suggested fixes
        """
        if plugin_id not in self._plugin_stats:
            return []
            
        # Get all failures for the plugin
        plugin_failures = [
            sig for sig in self._signatures.values()
            if sig.plugin_id == plugin_id
        ]
        
        if not plugin_failures:
            return []
            
        # Count fix frequencies
        fix_counts = defaultdict(int)
        for sig in plugin_failures:
            for fix in sig.suggested_fixes:
                fix_counts[fix] += 1
                
        # Sort by frequency
        sorted_fixes = sorted(
            fix_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [fix for fix, _ in sorted_fixes[:5]]  # Top 5 fixes
        
    def get_failure_stats(self, plugin_id: Optional[str] = None) -> Dict[str, Any]:
        """Get failure statistics.
        
        Args:
            plugin_id: Optional plugin ID to filter by
            
        Returns:
            Dictionary of failure statistics
        """
        if plugin_id:
            if plugin_id not in self._plugin_stats:
                return {}
            return self._plugin_stats[plugin_id]
            
        # Aggregate stats
        total_failures = sum(stats["total_failures"] for stats in self._plugin_stats.values())
        unique_failures = sum(stats["unique_failures"] for stats in self._plugin_stats.values())
        successful_retries = sum(stats["successful_retries"] for stats in self._plugin_stats.values())
        
        return {
            "total_failures": total_failures,
            "unique_failures": unique_failures,
            "successful_retries": successful_retries,
            "retry_success_rate": successful_retries / total_failures if total_failures > 0 else 0,
            "plugins_affected": len(self._plugin_stats),
            "failure_groups": len(self._groups)
        }
        
    def get_recent_failures(
        self,
        hours: int = 24,
        plugin_id: Optional[str] = None
    ) -> List[FailureSignature]:
        """Get recent failures.
        
        Args:
            hours: Number of hours to look back
            plugin_id: Optional plugin ID to filter by
            
        Returns:
            List of recent failure signatures
        """
        cutoff = datetime.now() - timedelta(hours=hours)
        
        failures = [
            sig for sig in self._signatures.values()
            if sig.timestamp >= cutoff
        ]
        
        if plugin_id:
            failures = [sig for sig in failures if sig.plugin_id == plugin_id]
            
        return sorted(failures, key=lambda x: x.timestamp, reverse=True)
        
    def get_failure_heatmap_data(self) -> Dict[str, Any]:
        """Get data for failure heatmap visualization.
        
        Returns:
            Dictionary containing heatmap data
        """
        # Group failures by hour and plugin
        hourly_data = defaultdict(lambda: defaultdict(int))
        
        for sig in self._signatures.values():
            hour = sig.timestamp.strftime("%Y-%m-%d %H:00")
            hourly_data[hour][sig.plugin_id] += 1
            
        return {
            "hours": sorted(hourly_data.keys()),
            "plugins": sorted(set(
                plugin_id
                for hour_data in hourly_data.values()
                for plugin_id in hour_data.keys()
            )),
            "data": {
                hour: {
                    plugin_id: count
                    for plugin_id, count in hour_data.items()
                }
                for hour, hour_data in hourly_data.items()
            }
        }

# Create singleton instance
failure_analytics = FailureAnalytics() 