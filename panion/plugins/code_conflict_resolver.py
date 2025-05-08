"""
Code Conflict Resolver Plugin
Identifies and resolves duplicate files and redundant code definitions.
"""

import logging
from typing import List, Dict, Any, Optional, Set
from pathlib import Path
import json
import yaml
import hashlib
import ast
from dataclasses import dataclass, field
from datetime import datetime
import shutil

from core.plugin.base import BasePlugin

@dataclass
class CodeConflict:
    file_path: str
    conflict_type: str
    description: str
    severity: str
    affected_code: List[str]
    recommended_action: str

class CodeConflictResolver(BasePlugin):
    def __init__(self, config_path: str = "config/conflict_resolver_config.yaml"):
        super().__init__(
            name="CodeConflictResolver",
            version="1.0.0",
            description="Identifies and resolves code conflicts",
            author="Panion Team"
        )
        self.logger = logging.getLogger(__name__)
        self.config = self._load_config(config_path)
        self.core_dir = Path("core")
        self.conflicts_file = self.core_dir / "data" / "code_conflicts.json"
        self.conflicts_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Define known redundant definitions
        self.redundant_definitions = {
            "AgentTemplate": "agent_template.py",
            "GoalStatus": "goal_utils.py",
            "MissionStatus": "mission_utils.py"
        }
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from .YAML file."""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.logger.error(f"Error loading config: {str(e)}")
            return {
                "min_file_size": 1024,  # 1KB
                "similarity_threshold": 0.95,
                "backup_before_resolve": True
            }
    
    def find_duplicate_files(self) -> List[CodeConflict]:
        """Find duplicate files in the codebase."""
        conflicts = []
        file_hashes = {}
        
        # Walk through all files in core directory
        for file_path in self.core_dir.rglob("*"):
            if not file_path.is_file():
                continue
            
            # Skip small files and non-Python files
            if file_path.stat().st_size < self.config["min_file_size"] or file_path.suffix != ".py":
                continue
            
            # Calculate file hash
            file_hash = self._calculate_file_hash(file_path)
            
            # Check for duplicates
            if file_hash in file_hashes:
                original_file = file_hashes[file_hash]
                conflicts.append(CodeConflict(
                    file_path=str(file_path),
                    conflict_type="duplicate_file",
                    description=f"Duplicate of {original_file}",
                    severity="high",
                    affected_code=[str(file_path), original_file],
                    recommended_action="Remove duplicate file and update references"
                ))
            else:
                file_hashes[file_hash] = str(file_path)
        
        return conflicts
    
    def find_redundant_code(self) -> List[CodeConflict]:
        """Find redundant code definitions."""
        conflicts = []
        
        # Check each Python file
        for file_path in self.core_dir.rglob("*.py"):
            if not file_path.is_file():
                continue
            
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                    tree = ast.parse(content)
                
                # Check for class and enum definitions
                for node in ast.walk(tree):
                    if isinstance(node, (ast.ClassDef, ast.Enum)):
                        name = node.name
                        if name in self.redundant_definitions:
                            conflicts.append(CodeConflict(
                                file_path=str(file_path),
                                conflict_type="redundant_definition",
                                description=f"Redundant definition of {name}",
                                severity="medium",
                                affected_code=[name],
                                recommended_action=f"Import {name} from .{self.redundant_definitions[name]} instead"
                            ))
            
            except Exception as e:
                self.logger.error(f"Error analyzing {file_path}: {str(e)}")
        
        return conflicts
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate hash of file contents."""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception as e:
            self.logger.error(f"Error calculating hash for {file_path}: {str(e)}")
            return ""
    
    def resolve_conflicts(self, conflicts: List[CodeConflict]) -> bool:
        """Resolve identified conflicts."""
        try:
            for conflict in conflicts:
                if conflict.conflict_type == "duplicate_file":
                    self._resolve_duplicate_file(conflict)
                elif conflict.conflict_type == "redundant_definition":
                    self._resolve_redundant_code(conflict)
            
            return True
        except Exception as e:
            self.logger.error(f"Error resolving conflicts: {str(e)}")
            return False
    
    def _resolve_duplicate_file(self, conflict: CodeConflict) -> None:
        """Resolve duplicate file conflict."""
        try:
            duplicate_path = Path(conflict.file_path)
            original_path = Path(conflict.affected_code[1])
            
            # Create backup if configured
            if self.config["backup_before_resolve"]:
                backup_dir = self.core_dir / "backups" / datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy2(duplicate_path, backup_dir / duplicate_path.name)
            
            # Remove duplicate file
            duplicate_path.unlink()
            
            # Update references in other files
            self._update_file_references(duplicate_path, original_path)
        
        except Exception as e:
            self.logger.error(f"Error resolving duplicate file {conflict.file_path}: {str(e)}")
    
    def _resolve_redundant_code(self, conflict: CodeConflict) -> None:
        """Resolve redundant code definition."""
        try:
            file_path = Path(conflict.file_path)
            definition_name = conflict.affected_code[0]
            source_file = self.redundant_definitions[definition_name]
            
            # Create backup if configured
            if self.config["backup_before_resolve"]:
                backup_dir = self.core_dir / "backups" / datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy2(file_path, backup_dir / file_path.name)
            
            # Read file content
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Parse AST
            tree = ast.parse(content)
            
            # Find and remove redundant definition
            for node in ast.walk(tree):
                if isinstance(node, (ast.ClassDef, ast.Enum)) and node.name == definition_name:
                    # Get the line numbers
                    start_line = node.lineno
                    end_line = node.end_lineno
                    
                    # Split content into lines
                    lines = content.split('\n')
                    
                    # Remove the definition
                    del lines[start_line-1:end_line]
                    
                    # Add import statement if not present
                    import_stmt = f"from .{source_file.replace('.py', '')} import {definition_name}\n"
                    if import_stmt not in content:
                        lines.insert(0, import_stmt)
                    
                    # Write modified content back
                    with open(file_path, 'w') as f:
                        f.write('\n'.join(lines))
                    
                    break
        
        except Exception as e:
            self.logger.error(f"Error resolving redundant code in {conflict.file_path}: {str(e)}")
    
    def _update_file_references(self, old_path: Path, new_path: Path) -> None:
        """Update references to a file that has been moved or removed."""
        try:
            # Convert paths to import-style strings
            old_import = str(old_path).replace('/', '.').replace('.py', '')
            new_import = str(new_path).replace('/', '.').replace('.py', '')
            
            # Update references in all Python files
            for file_path in self.core_dir.rglob("*.py"):
                if not file_path.is_file():
                    continue
                
                with open(file_path, 'r') as f:
                    content = f.read()
                
                # Replace import statements
                new_content = content.replace(old_import, new_import)
                
                if new_content != content:
                    with open(file_path, 'w') as f:
                        f.write(new_content)
        
        except Exception as e:
            self.logger.error(f"Error updating file references: {str(e)}")
    
    def save_conflicts(self, conflicts: List[CodeConflict]) -> bool:
        """Save identified conflicts to file."""
        try:
            # Convert conflicts to serializable format
            serializable_conflicts = [
                {
                    "file_path": conflict.file_path,
                    "conflict_type": conflict.conflict_type,
                    "description": conflict.description,
                    "severity": conflict.severity,
                    "affected_code": conflict.affected_code,
                    "recommended_action": conflict.recommended_action,
                    "timestamp": datetime.now().isoformat()
                }
                for conflict in conflicts
            ]
            
            # Save to file
            with open(self.conflicts_file, 'w') as f:
                json.dump(serializable_conflicts, f, indent=2)
            
            return True
        except Exception as e:
            self.logger.error(f"Error saving conflicts: {str(e)}")
            return False
    
    def run(self) -> bool:
        """Main execution method for the plugin."""
        try:
            # Find conflicts
            conflicts = []
            conflicts.extend(self.find_duplicate_files())
            conflicts.extend(self.find_redundant_code())
            
            # Save conflicts
            if conflicts:
                self.save_conflicts(conflicts)
            
            # Resolve conflicts
            return self.resolve_conflicts(conflicts)
        except Exception as e:
            self.logger.error(f"Error in code conflict resolver: {str(e)}")
            return False

# Plugin entry point
def run_plugin() -> bool:
    """Entry point for the plugin."""
    resolver = CodeConflictResolver()
    return resolver.run()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = run_plugin()
    print(f"Code Conflict Resolver completed {'successfully' if success else 'with errors'}") 