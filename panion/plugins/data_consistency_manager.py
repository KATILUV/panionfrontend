"""
Data Consistency Manager Plugin
Ensures data consistency across various state files and handles data cleanup.
"""

import logging
from typing import List, Dict, Any, Optional, Set
from pathlib import Path
import json
import yaml
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import hashlib

from core.plugin.base import BasePlugin

@dataclass
class DataIssue:
    """Represents an identified data consistency issue.
    
    Attributes:
        file_path: Path to the file containing the issue
        issue_type: Type of consistency issue (e.g., 'incomplete_data', 'duplicate_entries')
        description: Detailed description of the issue
        severity: Severity level of the issue ('low', 'medium', 'high')
        affected_entries: List of entries affected by the issue
        recommended_action: Suggested action to resolve the issue
    """
    file_path: str
    issue_type: str
    description: str
    severity: str
    affected_entries: List[str]
    recommended_action: str

class DataConsistencyManager(BasePlugin):
    def __init__(self, config_path: str = "config/data_consistency_config.yaml"):
        super().__init__(
            name="DataConsistencyManager",
            version="1.0.0",
            description="Ensures data consistency across various state files",
            author="Panion Team"
        )
        self.logger = logging.getLogger(__name__)
        self.config = self._load_config(config_path)
        self.data_dir = Path("data")
        self.issues_file = self.data_dir / "data_issues.json"
        self.issues_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Define required fields for different file types
        self.required_fields = {
            "plugin_memory.json": {
                "summary": str,
                "tags": list,
                "last_updated": str,
                "usage_count": int
            },
            "panion_memory.json": {
                "required_fields": ["version", "data"],
                "schema": {
                    "type": "object",
                    "properties": {
                        "version": {"type": "string"},
                        "data": {"type": "object"}
                    },
                    "required": ["version", "data"]
                }
            }
        }
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from .YAML file."""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.logger.error(f"Error loading config: {str(e)}")
            return {
                "max_empty_entries": 3,
                "cleanup_threshold_days": 30,
                "min_required_fields": ["summary", "tags", "last_updated"]
            }
    
    def validate_data_files(self) -> List[DataIssue]:
        """Validate all data files for consistency."""
        issues = []
        
        # Check plugin memory
        plugin_memory_path = self.data_dir / "plugin_memory.json"
        if plugin_memory_path.exists():
            issues.extend(self._validate_plugin_memory(plugin_memory_path))
        
        # Check Panion memory
        panion_memory_path = self.data_dir / "panion_memory.json"
        if panion_memory_path.exists():
            issues.extend(self._validate_panion_memory(panion_memory_path))
        
        return issues
    
    def _validate_plugin_memory(self, file_path: Path) -> List[DataIssue]:
        """Validate plugin memory file."""
        issues = []
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Check for empty summaries/tags
            empty_entries = []
            for plugin, entries in data.items():
                for entry in entries:
                    if not entry.get("summary") or not entry.get("tags"):
                        empty_entries.append(f"{plugin}:{entry.get('timestamp', 'unknown')}")
            
            if empty_entries:
                issues.append(DataIssue(
                    file_path=str(file_path),
                    issue_type="incomplete_data",
                    description="Found entries with empty summaries or tags",
                    severity="medium",
                    affected_entries=empty_entries,
                    recommended_action="Clean up or complete empty entries"
                ))
            
            # Check for duplicate entries
            seen_hashes = set()
            duplicates = []
            for plugin, entries in data.items():
                for entry in entries:
                    entry_hash = self._hash_entry(entry)
                    if entry_hash in seen_hashes:
                        duplicates.append(f"{plugin}:{entry.get('timestamp', 'unknown')}")
                    seen_hashes.add(entry_hash)
            
            if duplicates:
                issues.append(DataIssue(
                    file_path=str(file_path),
                    issue_type="duplicate_entries",
                    description="Found duplicate entries",
                    severity="low",
                    affected_entries=duplicates,
                    recommended_action="Remove duplicate entries"
                ))
        
        except Exception as e:
            self.logger.error(f"Error validating plugin memory: {str(e)}")
        
        return issues
    
    def _validate_panion_memory(self, file_path: Path) -> List[DataIssue]:
        """Validate Panion memory file."""
        issues = []
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Check for missing required fields
            missing_fields = []
            for field in self.required_fields["panion_memory.json"]["required_fields"]:
                if field not in data:
                    missing_fields.append(field)
            
            if missing_fields:
                issues.append(DataIssue(
                    file_path=str(file_path),
                    issue_type="missing_fields",
                    description=f"Found missing required fields: {', '.join(missing_fields)}",
                    severity="high",
                    affected_entries=missing_fields,
                    recommended_action="Add missing fields"
                ))
            
            # Check for invalid schema
            if not self._validate_schema(data):
                issues.append(DataIssue(
                    file_path=str(file_path),
                    issue_type="invalid_schema",
                    description="Found data that does not match the expected schema",
                    severity="high",
                    affected_entries=[],
                    recommended_action="Fix the schema"
                ))
        
        except Exception as e:
            self.logger.error(f"Error validating Panion memory: {str(e)}")
        
        return issues
    
    def _validate_schema(self, data: Dict[str, Any]) -> bool:
        """Validate the schema of the data."""
        schema = self.required_fields["panion_memory.json"]["schema"]
        return self._validate_json_schema(data, schema)
    
    def _validate_json_schema(self, data: Dict[str, Any], schema: Dict[str, Any]) -> bool:
        """Validate JSON data against a schema."""
        if isinstance(data, dict):
            for key, value in data.items():
                if key not in schema["properties"]:
                    return False
                if isinstance(value, dict):
                    if not self._validate_json_schema(value, schema["properties"][key]):
                        return False
                elif not isinstance(value, schema["properties"][key]["type"]):
                    return False
            return True
        elif isinstance(data, list):
            for item in data:
                if not self._validate_json_schema(item, schema):
                    return False
            return True
        else:
            return False
    
    def _hash_entry(self, entry: Dict[str, Any]) -> str:
        """Generate a hash for an entry to detect duplicates."""
        # Create a stable string representation
        stable_str = json.dumps(entry, sort_keys=True)
        return hashlib.md5(stable_str.encode()).hexdigest()
    
    def cleanup_data(self, issues: List[DataIssue]) -> bool:
        """Clean up data based on identified issues."""
        try:
            for issue in issues:
                if issue.file_path.endswith("plugin_memory.json"):
                    self._cleanup_plugin_memory(issue)
                elif issue.file_path.endswith("panion_memory.json"):
                    self._cleanup_panion_memory(issue)
            
            return True
        except Exception as e:
            self.logger.error(f"Error during cleanup: {str(e)}")
            return False
    
    def _cleanup_plugin_memory(self, issue: DataIssue) -> None:
        """Clean up plugin memory file."""
        try:
            with open(issue.file_path, 'r') as f:
                data = json.load(f)
            
            if issue.issue_type == "incomplete_data":
                # Remove entries with empty summaries/tags
                for plugin in list(data.keys()):
                    data[plugin] = [
                        entry for entry in data[plugin]
                        if entry.get("summary") and entry.get("tags")
                    ]
                    if not data[plugin]:
                        del data[plugin]
            
            elif issue.issue_type == "duplicate_entries":
                # Remove duplicate entries
                seen_hashes = set()
                for plugin in list(data.keys()):
                    unique_entries = []
                    for entry in data[plugin]:
                        entry_hash = self._hash_entry(entry)
                        if entry_hash not in seen_hashes:
                            unique_entries.append(entry)
                            seen_hashes.add(entry_hash)
                    data[plugin] = unique_entries
            
            # Save cleaned data
            with open(issue.file_path, 'w') as f:
                json.dump(data, f, indent=2)
        
        except Exception as e:
            self.logger.error(f"Error cleaning up plugin memory: {str(e)}")
    
    def _cleanup_panion_memory(self, issue: DataIssue) -> None:
        """Clean up Panion memory file."""
        try:
            with open(issue.file_path, 'r') as f:
                data = json.load(f)
            
            # Check for missing required fields
            missing_fields = []
            for field in self.required_fields["panion_memory.json"]["required_fields"]:
                if field not in data:
                    missing_fields.append(field)
            
            if missing_fields:
                # Add missing fields
                for field in self.required_fields["panion_memory.json"]["required_fields"]:
                    if field not in data:
                        data[field] = None
            
            # Check for invalid schema
            if not self._validate_schema(data):
                # Fix the schema
                data = self._fix_schema(data)
            
            # Save cleaned data
            with open(issue.file_path, 'w') as f:
                json.dump(data, f, indent=2)
        
        except Exception as e:
            self.logger.error(f"Error cleaning up Panion memory: {str(e)}")
    
    def save_issues(self, issues: List[DataIssue]) -> bool:
        """Save identified issues to file."""
        try:
            # Convert issues to serializable format
            serializable_issues = [
                {
                    "file_path": issue.file_path,
                    "issue_type": issue.issue_type,
                    "description": issue.description,
                    "severity": issue.severity,
                    "affected_entries": issue.affected_entries,
                    "recommended_action": issue.recommended_action,
                    "timestamp": datetime.now().isoformat()
                }
                for issue in issues
            ]
            
            # Save to file
            with open(self.issues_file, 'w') as f:
                json.dump(serializable_issues, f, indent=2)
            
            return True
        except Exception as e:
            self.logger.error(f"Error saving issues: {str(e)}")
            return False
    
    def run(self) -> bool:
        """Main execution method for the plugin."""
        try:
            # Validate data files
            issues = self.validate_data_files()
            
            # Save issues
            if issues:
                self.save_issues(issues)
            
            # Clean up data
            return self.cleanup_data(issues)
        except Exception as e:
            self.logger.error(f"Error in data consistency manager: {str(e)}")
            return False

# Plugin entry point
def run_plugin() -> bool:
    """Entry point for the plugin."""
    manager = DataConsistencyManager()
    return manager.run()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = run_plugin()
    print(f"Data Consistency Manager completed {'successfully' if success else 'with errors'}") 