"""
Reflection System
Handles logging and analysis of system reflections.
"""

import json
import logging
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict

class ReflectionCategory(Enum):
    """Categories for reflections."""
    GOAL = "goal"
    PLUGIN = "plugin"
    ERROR = "error"
    SYSTEM = "system"
    PERFORMANCE = "performance"
    THOUGHT = "thought"

@dataclass
class Reflection:
    """A single reflection entry."""
    category: ReflectionCategory
    message: str
    timestamp: datetime
    metadata: Dict[str, Any]
    severity: str = "info"
    tags: List[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert reflection to dictionary."""
        return {
            **asdict(self),
            "category": self.category.value,
            "timestamp": self.timestamp.isoformat()
        }

class ReflectionLogger:
    """Handles reflection logging and analysis."""
    
    def __init__(self, log_dir: Path):
        """Initialize reflection logger.
        
        Args:
            log_dir: Directory to store reflection logs
        """
        self.log_dir = log_dir
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.reflections: List[Reflection] = []
        self._load_reflections()
    
    def _load_reflections(self) -> None:
        """Load existing reflections from file."""
        reflections_file = self.log_dir / "reflections.json"
        if reflections_file.exists():
            with open(reflections_file) as f:
                data = json.load(f)
                self.reflections = [
                    Reflection(
                        category=ReflectionCategory(entry["category"]),
                        timestamp=datetime.fromisoformat(entry["timestamp"]),
                        **{k: v for k, v in entry.items() 
                           if k not in ["category", "timestamp"]}
                    )
                    for entry in data
                ]
    
    def _save_reflections(self) -> None:
        """Save reflections to file."""
        reflections_file = self.log_dir / "reflections.json"
        with open(reflections_file, "w") as f:
            json.dump(
                [reflection.to_dict() for reflection in self.reflections],
                f,
                indent=2
            )
    
    def _update_summary(self) -> None:
        """Update reflection summary."""
        summary = {
            "total_reflections": len(self.reflections),
            "categories": {
                category.value: len([
                    r for r in self.reflections
                    if r.category == category
                ])
                for category in ReflectionCategory
            },
            "severities": {
                severity: len([
                    r for r in self.reflections
                    if r.severity == severity
                ])
                for severity in {"info", "warning", "error", "critical"}
            },
            "tags": {
                tag: len([
                    r for r in self.reflections
                    if r.tags and tag in r.tags
                ])
                for reflection in self.reflections
                if reflection.tags
                for tag in reflection.tags
            },
            "latest_reflection": max(
                (r.timestamp for r in self.reflections),
                default=datetime.now()
            ).isoformat()
        }
        
        summary_file = self.log_dir / "reflections_summary.json"
        with open(summary_file, "w") as f:
            json.dump(summary, f, indent=2)
    
    def log(
        self,
        category: ReflectionCategory,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        severity: str = "info",
        tags: Optional[List[str]] = None
    ) -> None:
        """Log a reflection.
        
        Args:
            category: Category of the reflection
            message: Reflection message
            metadata: Additional metadata
            severity: Severity level
            tags: List of tags
        """
        reflection = Reflection(
            category=category,
            message=message,
            timestamp=datetime.now(),
            metadata=metadata or {},
            severity=severity,
            tags=tags or []
        )
        
        self.reflections.append(reflection)
        self._save_reflections()
        self._update_summary()
        
        # Also log to standard logging
        log_message = f"[{category.value}] {message}"
        if metadata:
            log_message += f" {json.dumps(metadata)}"
        
        if severity == "error":
            logging.error(log_message)
        elif severity == "warning":
            logging.warning(log_message)
        else:
            logging.info(log_message)
    
    def log_thought(
        self,
        source: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        severity: str = "info",
        tags: Optional[List[str]] = None
    ) -> None:
        """Log a thought reflection.
        
        Args:
            source: Source of the thought
            message: Thought message
            metadata: Additional metadata
            severity: Severity level
            tags: List of tags
        """
        if metadata is None:
            metadata = {}
        metadata["source"] = source
        
        self.log(
            category=ReflectionCategory.THOUGHT,
            message=message,
            metadata=metadata,
            severity=severity,
            tags=tags
        )
    
    def get_reflections(
        self,
        category: Optional[ReflectionCategory] = None,
        severity: Optional[str] = None,
        tags: Optional[List[str]] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[Reflection]:
        """Get filtered reflections.
        
        Args:
            category: Filter by category
            severity: Filter by severity
            tags: Filter by tags
            start_time: Filter by start time
            end_time: Filter by end time
            
        Returns:
            List[Reflection]: Filtered reflections
        """
        filtered = self.reflections
        
        if category:
            filtered = [r for r in filtered if r.category == category]
        if severity:
            filtered = [r for r in filtered if r.severity == severity]
        if tags:
            filtered = [
                r for r in filtered
                if r.tags and all(tag in r.tags for tag in tags)
            ]
        if start_time:
            filtered = [r for r in filtered if r.timestamp >= start_time]
        if end_time:
            filtered = [r for r in filtered if r.timestamp <= end_time]
        
        return filtered
    
    def get_summary(self) -> Dict[str, Any]:
        """Get reflection summary.
        
        Returns:
            Dict[str, Any]: Summary statistics
        """
        summary_file = self.log_dir / "reflections_summary.json"
        if summary_file.exists():
            with open(summary_file) as f:
                return json.load(f)
        return {}
    
    def clear(self) -> None:
        """Clear all reflections."""
        self.reflections = []
        self._save_reflections()
        self._update_summary()

# Create global reflection system instance
reflection_system = ReflectionLogger(Path("logs/reflections")) 