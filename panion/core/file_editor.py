"""
Enhanced File Editor
Handles file operations with safety checks, validation, and atomic operations.
"""

import logging
from typing import Dict, Any, Optional, List, Set
from pathlib import Path
import json
import yaml
import shutil
from datetime import datetime
import os
import fcntl
import tempfile
import hashlib
from contextlib import contextmanager
import asyncio
from dataclasses import dataclass
import aiofiles
import aiofiles.os
import ast
from enum import Enum

class EditOperation(Enum):
    """Types of edit operations."""
    INSERT = "insert"
    REPLACE = "replace"
    DELETE = "delete"

@dataclass
class Edit:
    """Represents a single edit operation."""
    operation: EditOperation
    line_num: int
    text: Optional[str] = None

@dataclass
class BackupInfo:
    """Backup file information."""
    path: Path
    timestamp: str
    size: int
    hash: str
    metadata: Dict[str, Any]

class FileEditor:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.backup_dir = Path('data/backups')
        self.backup_dir.mkdir(exist_ok=True, parents=True)
        self._file_locks: Dict[str, asyncio.Lock] = {}
        self._backup_metadata: Dict[str, List[BackupInfo]] = {}
        self._max_backups = 10
        self._max_file_size = 10 * 1024 * 1024  # 10MB
        self._allowed_extensions = {'.py', '.json', '.yaml', '.yml', '.txt'}
        self._load_backup_metadata()
        
    def _load_backup_metadata(self) -> None:
        """Load backup metadata from file."""
        try:
            metadata_file = self.backup_dir / 'backup_metadata.json'
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    data = json.load(f)
                    self._backup_metadata = {
                        k: [BackupInfo(**info) for info in v]
                        for k, v in data.items()
                    }
        except Exception as e:
            self.logger.error(f"Error loading backup metadata: {e}")
            
    def _save_backup_metadata(self) -> None:
        """Save backup metadata to file."""
        try:
            metadata_file = self.backup_dir / 'backup_metadata.json'
            with open(metadata_file, 'w') as f:
                json.dump({
                    k: [vars(info) for info in v]
                    for k, v in self._backup_metadata.items()
                }, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving backup metadata: {e}")
            
    def _validate_path(self, path: Path) -> Dict[str, Any]:
        """Validate file path."""
        try:
            # Check for path traversal
            if '..' in str(path):
                return {
                    'valid': False,
                    'error': "Path traversal not allowed"
                }
                
            # Check file extension
            if path.suffix not in self._allowed_extensions:
                return {
                    'valid': False,
                    'error': f"File extension not allowed: {path.suffix}"
                }
                
            # Check file size if exists
            if path.exists():
                size = path.stat().st_size
                if size > self._max_file_size:
                    return {
                        'valid': False,
                        'error': f"File too large: {size} bytes"
                    }
                    
            # Check permissions
            if path.exists():
                if not os.access(path, os.R_OK | os.W_OK):
                    return {
                        'valid': False,
                        'error': "Insufficient file permissions"
                    }
                    
            return {'valid': True}
            
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }
            
    @contextmanager
    async def _file_lock(self, path: str):
        """Acquire file lock."""
        lock = self._file_locks.setdefault(path, asyncio.Lock())
        try:
            await lock.acquire()
            yield
        finally:
            lock.release()
            
    async def _create_backup(self, file_path: Path) -> Optional[BackupInfo]:
        """Create a backup of a file with metadata."""
        try:
            # Generate backup info
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_path = self.backup_dir / f"{file_path.name}.{timestamp}.bak"
            
            # Copy file
            shutil.copy2(file_path, backup_path)
            
            # Calculate file hash
            with open(backup_path, 'rb') as f:
                file_hash = hashlib.sha256(f.read()).hexdigest()
                
            # Create backup info
            backup_info = BackupInfo(
                path=backup_path,
                timestamp=timestamp,
                size=backup_path.stat().st_size,
                hash=file_hash,
                metadata={
                    'original_path': str(file_path),
                    'created_at': datetime.now().isoformat()
                }
            )
            
            # Update metadata
            self._backup_metadata.setdefault(str(file_path), []).append(backup_info)
            self._save_backup_metadata()
            
            # Rotate old backups
            await self._rotate_backups(file_path)
            
            return backup_info
            
        except Exception as e:
            self.logger.error(f"Error creating backup: {e}")
            return None
            
    async def _rotate_backups(self, file_path: Path) -> None:
        """Rotate old backups keeping only the most recent ones."""
        try:
            backups = self._backup_metadata.get(str(file_path), [])
            if len(backups) > self._max_backups:
                # Sort by timestamp
                backups.sort(key=lambda x: x.timestamp, reverse=True)
                
                # Remove old backups
                for backup in backups[self._max_backups:]:
                    try:
                        backup.path.unlink()
                    except Exception as e:
                        self.logger.error(f"Error removing old backup: {e}")
                        
                # Update metadata
                self._backup_metadata[str(file_path)] = backups[:self._max_backups]
                self._save_backup_metadata()
                
        except Exception as e:
            self.logger.error(f"Error rotating backups: {e}")
            
    async def create_file(self,
                         file_path: str,
                         content: str,
                         validate: bool = True) -> Dict[str, Any]:
        """Create a new file with content."""
        try:
            path = Path(file_path)
            
            # Validate path
            validation = self._validate_path(path)
            if not validation['valid']:
                return {
                    'status': 'failure',
                    'error': validation['error']
                }
            
            # Create backup if file exists
            if path.exists():
                backup_info = await self._create_backup(path)
                if not backup_info:
                    return {
                        'status': 'failure',
                        'error': "Failed to create backup"
                    }
            
            # Write file atomically
            async with self._file_lock(str(path)):
                # Create temp file
                with tempfile.NamedTemporaryFile(mode='w', delete=False) as temp:
                    temp.write(content)
                    temp_path = temp.name
                
                try:
                    # Move temp file to target
                    await aiofiles.os.rename(temp_path, path)
                except Exception as e:
                    # Clean up temp file on error
                    await aiofiles.os.remove(temp_path)
                    raise e
            
            # Validate if requested
            if validate:
                validation_result = await self._validate_file(path)
                if not validation_result['valid']:
                    return {
                        'status': 'failure',
                        'error': f"Validation failed: {validation_result['errors']}"
                    }
            
            return {
                'status': 'success',
                'file_path': str(path)
            }
            
        except Exception as e:
            self.logger.error(f"Error creating file: {e}")
            return {
                'status': 'failure',
                'error': str(e)
            }
            
    async def read_file(self,
                       file_path: str,
                       validate: bool = True) -> Dict[str, Any]:
        """Read file content."""
        try:
            path = Path(file_path)
            
            if not path.exists():
                return {
                    'status': 'failure',
                    'error': f"File not found: {file_path}"
                }
            
            with open(path, 'r') as f:
                content = f.read()
            
            # Validate if requested
            if validate:
                validation_result = await self._validate_file(path)
                if not validation_result['valid']:
                    return {
                        'status': 'failure',
                        'error': f"Validation failed: {validation_result['errors']}"
                    }
            
            return {
                'status': 'success',
                'content': content
            }
            
        except Exception as e:
            self.logger.error(f"Error reading file: {e}")
            return {
                'status': 'failure',
                'error': str(e)
            }
            
    async def update_file(self,
                         file_path: str,
                         content: str,
                         validate: bool = True) -> Dict[str, Any]:
        """Update file content."""
        try:
            path = Path(file_path)
            
            if not path.exists():
                return {
                    'status': 'failure',
                    'error': f"File not found: {file_path}"
                }
            
            # Create backup
            await self._create_backup(path)
            
            # Write file
            with open(path, 'w') as f:
                f.write(content)
            
            # Validate if requested
            if validate:
                validation_result = await self._validate_file(path)
                if not validation_result['valid']:
                    return {
                        'status': 'failure',
                        'error': f"Validation failed: {validation_result['errors']}"
                    }
            
            return {
                'status': 'success',
                'file_path': str(path)
            }
            
        except Exception as e:
            self.logger.error(f"Error updating file: {e}")
            return {
                'status': 'failure',
                'error': str(e)
            }
            
    async def delete_file(self,
                         file_path: str,
                         create_backup: bool = True) -> Dict[str, Any]:
        """Delete a file."""
        try:
            path = Path(file_path)
            
            if not path.exists():
                return {
                    'status': 'failure',
                    'error': f"File not found: {file_path}"
                }
            
            # Create backup if requested
            if create_backup:
                await self._create_backup(path)
            
            # Delete file
            path.unlink()
            
            return {
                'status': 'success',
                'file_path': str(path)
            }
            
        except Exception as e:
            self.logger.error(f"Error deleting file: {e}")
            return {
                'status': 'failure',
                'error': str(e)
            }
            
    async def _apply_edits(self,
                          file_path: str,
                          edits: List[Edit],
                          validate: bool = True) -> Dict[str, Any]:
        """Apply a series of edits to a file with validation."""
        try:
            path = Path(file_path)
            
            # Validate path
            validation = self._validate_path(path)
            if not validation['valid']:
                return {
                    'status': 'failure',
                    'error': validation['error']
                }
            
            if not path.exists():
                return {
                    'status': 'failure',
                    'error': f"File not found: {file_path}"
                }
            
            # Create backup
            backup_info = await self._create_backup(path)
            if not backup_info:
                return {
                    'status': 'failure',
                    'error': "Failed to create backup"
                }
            
            # Read current content
            async with self._file_lock(str(path)):
                async with aiofiles.open(path, 'r') as f:
                    content = await f.read()
                
                # Split content into lines
                lines = content.split('\n')
                
                # Sort edits by line number
                edits.sort(key=lambda x: x.line_num)
                
                # Validate edit ranges
                for edit in edits:
                    if edit.line_num < 0 or edit.line_num > len(lines):
                        return {
                            'status': 'failure',
                            'error': f"Invalid line number: {edit.line_num}"
                        }
                
                # Apply edits
                new_lines = []
                current_line = 0
                
                for edit in edits:
                    # Add unchanged lines before edit
                    new_lines.extend(lines[current_line:edit.line_num])
                    
                    # Apply edit
                    if edit.operation == EditOperation.INSERT:
                        if edit.text:
                            new_lines.append(edit.text)
                        current_line = edit.line_num
                    elif edit.operation == EditOperation.REPLACE:
                        if edit.text:
                            new_lines.append(edit.text)
                        current_line = edit.line_num + 1
                    elif edit.operation == EditOperation.DELETE:
                        current_line = edit.line_num + 1
                
                # Add remaining lines
                new_lines.extend(lines[current_line:])
                
                # Write updated content
                new_content = '\n'.join(new_lines)
                
                # Write atomically
                with tempfile.NamedTemporaryFile(mode='w', delete=False) as temp:
                    temp.write(new_content)
                    temp_path = temp.name
                
                try:
                    await aiofiles.os.rename(temp_path, path)
                except Exception as e:
                    await aiofiles.os.remove(temp_path)
                    raise e
            
            # Validate if requested
            if validate:
                validation_result = await self._validate_file(path)
                if not validation_result['valid']:
                    # Restore from backup
                    await self._restore_from_backup(backup_info)
                    return {
                        'status': 'failure',
                        'error': f"Validation failed: {validation_result['errors']}"
                    }
            
            return {
                'status': 'success',
                'file_path': str(path)
            }
            
        except Exception as e:
            self.logger.error(f"Error applying edits: {e}")
            return {
                'status': 'failure',
                'error': str(e)
            }
            
    async def _restore_from_backup(self, backup_info: BackupInfo) -> bool:
        """Restore file from backup."""
        try:
            path = Path(backup_info.metadata['original_path'])
            
            # Copy backup to original location
            shutil.copy2(backup_info.path, path)
            
            # Verify restore
            with open(path, 'rb') as f:
                current_hash = hashlib.sha256(f.read()).hexdigest()
                
            if current_hash != backup_info.hash:
                raise ValueError("Backup verification failed")
                
            return True
            
        except Exception as e:
            self.logger.error(f"Error restoring from backup: {e}")
            return False

    async def _validate_file(self, file_path: Path) -> Dict[str, Any]:
        """Validate a file."""
        try:
            errors = []
            
            # Check file size
            if file_path.stat().st_size == 0:
                errors.append("File is empty")
            
            # Check file extension
            if file_path.suffix == '.py':
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                    ast.parse(content)  # Validate Python syntax
                except SyntaxError as e:
                    errors.append(f"Python syntax error: {e}")
                except Exception as e:
                    errors.append(f"Error parsing Python file: {e}")
            elif file_path.suffix == '.json':
                try:
                    with open(file_path, 'r') as f:
                        json.load(f)
                except json.JSONDecodeError as e:
                    errors.append(f"Invalid JSON: {e}")
            elif file_path.suffix in ['.yaml', '.yml']:
                try:
                    with open(file_path, 'r') as f:
                        yaml.safe_load(f)
                except yaml.YAMLError as e:
                    errors.append(f"Invalid YAML: {e}")
            
            return {
                'valid': len(errors) == 0,
                'errors': errors
            }
            
        except Exception as e:
            self.logger.error(f"Error validating file: {e}")
            return {
                'valid': False,
                'errors': [str(e)]
            }

    async def insert_line(self, file_path: str, line_num: int, text: str) -> Dict[str, Any]:
        """Insert a line at the specified position."""
        return await self._apply_edits(
            file_path,
            [Edit(EditOperation.INSERT, line_num, text)]
        )

    async def replace_line(self, file_path: str, line_num: int, text: str) -> Dict[str, Any]:
        """Replace a line at the specified position."""
        return await self._apply_edits(
            file_path,
            [Edit(EditOperation.REPLACE, line_num, text)]
        )

    async def delete_line(self, file_path: str, line_num: int) -> Dict[str, Any]:
        """Delete a line at the specified position."""
        return await self._apply_edits(
            file_path,
            [Edit(EditOperation.DELETE, line_num)]
        )

# Create singleton instance
file_editor = FileEditor() 