"""
File Service
Centralizes file operations and validations.
"""

import logging
import hashlib
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
import aiofiles
import json

from ..core.base import BaseComponent, ComponentState

class FileService(BaseComponent):
    """Service for centralized file operations."""
    
    def __init__(self):
        super().__init__(
            name="FileService",
            version="1.0.0",
            description="Centralized file service",
            author="Panion Team"
        )
        
        self.logger = logging.getLogger(__name__)
        self._hash_cache: Dict[str, Tuple[str, datetime]] = {}
        self._cache_duration = 300  # 5 minutes
        self._max_file_size = 10 * 1024 * 1024  # 10MB
        self._allowed_extensions = {
            '.py', '.json', '.yaml', '.yml', '.txt', '.md',
            '.html', '.css', '.js', '.ts', '.tsx', '.jsx'
        }
    
    async def initialize(self) -> bool:
        """Initialize the file service."""
        try:
            self.logger.info("Initializing file service")
            self.state = ComponentState.INITIALIZING
            
            # Create necessary directories
            self._ensure_directories()
            
            self.state = ComponentState.ACTIVE
            self.logger.info("File service initialized")
            return True
            
        except Exception as e:
            self.logger.error(f"Error initializing file service: {e}")
            self.state = ComponentState.ERROR
            return False
    
    def _ensure_directories(self):
        """Ensure required directories exist."""
        directories = [
            "data",
            "data/memories",
            "data/plugins",
            "data/backups",
            "logs"
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
    
    async def calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA-256 hash of a file."""
        try:
            # Check cache first
            if file_path in self._hash_cache:
                hash_value, timestamp = self._hash_cache[file_path]
                if (datetime.now() - timestamp).total_seconds() < self._cache_duration:
                    return hash_value
            
            # Calculate new hash
            sha256_hash = hashlib.sha256()
            async with aiofiles.open(file_path, 'rb') as f:
                for chunk in iter(lambda: await f.read(4096), b''):
                    sha256_hash.update(chunk)
            
            hash_value = sha256_hash.hexdigest()
            
            # Update cache
            self._hash_cache[file_path] = (hash_value, datetime.now())
            
            return hash_value
            
        except Exception as e:
            self.logger.error(f"Error calculating file hash: {e}")
            raise
    
    async def validate_file(self, file_path: str) -> Tuple[bool, List[str]]:
        """Validate a file for security and integrity."""
        try:
            issues = []
            
            # Check if file exists
            if not os.path.exists(file_path):
                issues.append("File does not exist")
                return False, issues
            
            # Check file extension
            ext = os.path.splitext(file_path)[1].lower()
            if ext not in self._allowed_extensions:
                issues.append(f"Unsupported file extension: {ext}")
            
            # Check file size
            size = os.path.getsize(file_path)
            if size > self._max_file_size:
                issues.append(f"File too large: {size} bytes")
            
            # Check file permissions
            if not os.access(file_path, os.R_OK):
                issues.append("File not readable")
            
            return len(issues) == 0, issues
            
        except Exception as e:
            self.logger.error(f"Error validating file: {e}")
            return False, [f"Validation error: {str(e)}"]
    
    async def read_file(self, file_path: str) -> str:
        """Read file contents safely."""
        try:
            # Validate file first
            is_valid, issues = await self.validate_file(file_path)
            if not is_valid:
                raise ValueError(f"Invalid file: {', '.join(issues)}")
            
            async with aiofiles.open(file_path, 'r') as f:
                return await f.read()
                
        except Exception as e:
            self.logger.error(f"Error reading file: {e}")
            raise
    
    async def write_file(self, file_path: str, content: str) -> bool:
        """Write content to file safely."""
        try:
            # Create directory if needed
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Write file
            async with aiofiles.open(file_path, 'w') as f:
                await f.write(content)
            
            # Clear hash cache for this file
            self._hash_cache.pop(file_path, None)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error writing file: {e}")
            return False
    
    async def backup_file(self, file_path: str) -> Optional[str]:
        """Create a backup of a file."""
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Create backup path
            backup_dir = "data/backups"
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"{os.path.basename(file_path)}.{timestamp}.bak"
            backup_path = os.path.join(backup_dir, backup_name)
            
            # Copy file
            async with aiofiles.open(file_path, 'rb') as src:
                async with aiofiles.open(backup_path, 'wb') as dst:
                    await dst.write(await src.read())
            
            return backup_path
            
        except Exception as e:
            self.logger.error(f"Error backing up file: {e}")
            return None
    
    async def find_duplicate_files(self, directory: str) -> Dict[str, List[str]]:
        """Find duplicate files in a directory based on content hash."""
        try:
            hash_map: Dict[str, List[str]] = {}
            
            for root, _, files in os.walk(directory):
                for file in files:
                    file_path = os.path.join(root, file)
                    
                    # Skip non-text files
                    if not file_path.endswith(tuple(self._allowed_extensions)):
                        continue
                    
                    # Calculate hash
                    file_hash = await self.calculate_file_hash(file_path)
                    
                    # Add to hash map
                    if file_hash in hash_map:
                        hash_map[file_hash].append(file_path)
                    else:
                        hash_map[file_hash] = [file_path]
            
            # Filter out non-duplicates
            return {
                hash_value: paths
                for hash_value, paths in hash_map.items()
                if len(paths) > 1
            }
            
        except Exception as e:
            self.logger.error(f"Error finding duplicate files: {e}")
            return {}
    
    async def cleanup_old_backups(self, max_age_days: int = 30) -> int:
        """Clean up old backup files."""
        try:
            backup_dir = "data/backups"
            if not os.path.exists(backup_dir):
                return 0
            
            count = 0
            now = datetime.now()
            
            for file in os.listdir(backup_dir):
                if not file.endswith('.bak'):
                    continue
                
                file_path = os.path.join(backup_dir, file)
                file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                
                if (now - file_time).days > max_age_days:
                    os.remove(file_path)
                    count += 1
            
            return count
            
        except Exception as e:
            self.logger.error(f"Error cleaning up old backups: {e}")
            return 0

# Create singleton instance
file_service = FileService() 