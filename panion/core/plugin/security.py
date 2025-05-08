"""
Plugin Security
Handles plugin security validation and permissions.
"""

import logging
import os
import hashlib
import hmac
import time
import ast
import re
from typing import Dict, Any, List, Optional, Set
from datetime import datetime
from enum import Enum, auto
from core.service_locator import service_locator
from core.plugin_types import Plugin, PluginSecurityLevel
from pathlib import Path
import yaml
from .types import PluginError, PluginErrorType, PluginMetadata
from dataclasses import dataclass

class Permission(Enum):
    """Plugin permissions."""
    READ_FILE = auto()
    WRITE_FILE = auto()
    NETWORK_ACCESS = auto()
    SYSTEM_CALL = auto()
    DATABASE_ACCESS = auto()

@dataclass
class SecurityConfig:
    """Plugin security configuration."""
    unsafe_modules: Set[str] = None
    max_file_size: int = 1024 * 1024  # 1MB
    allowed_extensions: Set[str] = None
    
    def __post_init__(self):
        if self.unsafe_modules is None:
            self.unsafe_modules = {
                'os', 'sys', 'subprocess', 'socket', 'multiprocessing',
                'threading', 'ctypes', 'curses', 'dbm', 'gdbm', 'grp',
                'mmap', 'msvcrt', 'nis', 'ossaudiodev', 'pwd', 'resource',
                'spwd', 'termios', 'tty', 'winreg', 'winsound'
            }
        if self.allowed_extensions is None:
            self.allowed_extensions = {'.py', '.yaml', '.yml', '.json', '.txt'}

class PluginSecurity:
    """Handles plugin security and permissions."""
    
    def __init__(self, config: Optional[SecurityConfig] = None):
        """Initialize plugin security."""
        self.logger = logging.getLogger(__name__)
        self.config = config or SecurityConfig()
        self.allowed_plugins: Set[str] = set()
        self.blocked_plugins: Set[str] = set()
        self.plugin_permissions: Dict[str, Set[str]] = {}
        self.api_keys: Dict[str, str] = {}
        self._plugin_permissions: Dict[str, PluginSecurityLevel] = {}
        self._allowed_imports: List[str] = [
            'os.path',
            'logging',
            'json',
            'yaml',
            'datetime',
            'typing',
            'core.plugin',
            'core.utils',
        ]
        self._forbidden_imports: List[str] = [
            'subprocess',
            'socket',
            'sys',
            'os.system',
            'eval',
            'exec',
        ]
        service_locator.register_service('plugin_security', self)

    async def validate_plugin(self, plugin_path: Path, metadata: PluginMetadata) -> None:
        """Validate plugin security."""
        try:
            # Check if plugin is blocked
            if metadata.name in self.blocked_plugins:
                raise PluginError(f"Plugin {metadata.name} is blocked", PluginErrorType.SECURITY_ERROR)
            
            # Check security level
            if metadata.security_level not in ["low", "medium", "high"]:
                raise PluginError(f"Invalid security level: {metadata.security_level}", PluginErrorType.SECURITY_ERROR)
            
            # Validate plugin file
            await self._validate_plugin_file(plugin_path / "plugin.py")
            
            # Set default permissions
            self.plugin_permissions[metadata.name] = self._get_default_permissions(metadata.security_level)
            
            self.logger.info(f"Validated security for plugin {metadata.name}")
        except Exception as e:
            raise PluginError(f"Security validation failed: {e}", PluginErrorType.SECURITY_ERROR)
    
    async def _validate_plugin_file(self, plugin_file: Path) -> None:
        """Validate plugin file security."""
        if not plugin_file.exists():
            raise PluginError("Plugin file not found", PluginErrorType.NOT_FOUND)
        
        try:
            # Check file permissions
            if not self._check_file_permissions(plugin_file):
                raise PluginError("Invalid file permissions", PluginErrorType.SECURITY_ERROR)
            
            # Check file content
            with open(plugin_file) as f:
                content = f.read()
            
            # Check for dangerous imports
            dangerous_imports = ["os", "subprocess", "sys", "socket"]
            for imp in dangerous_imports:
                if f"import {imp}" in content or f"from {imp}" in content:
                    raise PluginError(f"Dangerous import detected: {imp}", PluginErrorType.SECURITY_ERROR)
            
            # Check for dangerous functions
            dangerous_functions = ["eval", "exec", "input"]
            for func in dangerous_functions:
                if func in content:
                    raise PluginError(f"Dangerous function detected: {func}", PluginErrorType.SECURITY_ERROR)
        except Exception as e:
            raise PluginError(f"Failed to validate plugin file: {e}", PluginErrorType.SECURITY_ERROR)
    
    def _check_file_permissions(self, file_path: Path) -> bool:
        """Check if file has safe permissions."""
        try:
            # Check if file is readable
            if not os.access(file_path, os.R_OK):
                return False
            
            # Check if file is writable by others
            if os.access(file_path, os.W_OK):
                return False
            
            # Check if file is executable by others
            if os.access(file_path, os.X_OK):
                return False
            
            return True
        except Exception:
            return False
    
    def _get_default_permissions(self, security_level: str) -> Set[str]:
        """Get default permissions for security level."""
        if security_level == "low":
            return {"read", "write", "execute"}
        elif security_level == "medium":
            return {"read", "execute"}
        else:  # high
            return {"read"}
    
    async def allow_plugin(self, plugin_id: str) -> None:
        """Allow a plugin to run."""
        try:
            self.allowed_plugins.add(plugin_id)
            self.blocked_plugins.discard(plugin_id)
            self.logger.info(f"Allowed plugin {plugin_id}")
        except Exception as e:
            raise PluginError(f"Failed to allow plugin {plugin_id}: {e}", PluginErrorType.SECURITY_ERROR)
    
    async def block_plugin(self, plugin_id: str) -> None:
        """Block a plugin from running."""
        try:
            self.blocked_plugins.add(plugin_id)
            self.allowed_plugins.discard(plugin_id)
            self.logger.info(f"Blocked plugin {plugin_id}")
        except Exception as e:
            raise PluginError(f"Failed to block plugin {plugin_id}: {e}", PluginErrorType.SECURITY_ERROR)
    
    async def set_plugin_permissions(self, plugin_id: str, permissions: Set[str]) -> None:
        """Set permissions for a plugin."""
        try:
            if plugin_id not in self.plugin_permissions:
                raise PluginError(f"Plugin {plugin_id} not found", PluginErrorType.NOT_FOUND)
            
            self.plugin_permissions[plugin_id] = permissions
            self.logger.info(f"Set permissions for plugin {plugin_id}: {permissions}")
        except Exception as e:
            raise PluginError(f"Failed to set permissions for plugin {plugin_id}: {e}", PluginErrorType.SECURITY_ERROR)
    
    async def get_plugin_permissions(self, plugin_id: str) -> Optional[Set[str]]:
        """Get permissions for a plugin."""
        return self.plugin_permissions.get(plugin_id)
    
    async def generate_api_key(self, plugin_id: str) -> str:
        """Generate an API key for a plugin."""
        try:
            # Generate key
            key = hmac.new(
                str(time.time()).encode(),
                plugin_id.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # Store key
            self.api_keys[plugin_id] = key
            self.logger.info(f"Generated API key for plugin {plugin_id}")
            
            return key
        except Exception as e:
            raise PluginError(f"Failed to generate API key for plugin {plugin_id}: {e}", PluginErrorType.SECURITY_ERROR)
    
    async def validate_api_key(self, plugin_id: str, key: str) -> bool:
        """Validate an API key for a plugin."""
        try:
            stored_key = self.api_keys.get(plugin_id)
            if not stored_key:
                return False
            
            return hmac.compare_digest(stored_key, key)
        except Exception as e:
            raise PluginError(f"Failed to validate API key for plugin {plugin_id}: {e}", PluginErrorType.SECURITY_ERROR)
    
    async def revoke_api_key(self, plugin_id: str) -> None:
        """Revoke an API key for a plugin."""
        try:
            if plugin_id in self.api_keys:
                del self.api_keys[plugin_id]
                self.logger.info(f"Revoked API key for plugin {plugin_id}")
        except Exception as e:
            raise PluginError(f"Failed to revoke API key for plugin {plugin_id}: {e}", PluginErrorType.SECURITY_ERROR)

    def validate_plugin_security(self, plugin: Plugin) -> None:
        """Validate a plugin's security."""
        try:
            plugin_dir = os.path.dirname(plugin.__file__)
            self._validate_plugin_dir(plugin_dir)
            self._validate_plugin_imports(plugin)
            self._validate_plugin_paths(plugin)
            self.logger.info(f"Validated plugin security: {plugin.metadata.name}")
        except Exception as e:
            self.logger.error(f"Failed to validate plugin security: {str(e)}")
            raise

    def _validate_plugin_dir(self, plugin_dir: str) -> None:
        """Validate plugin directory structure."""
        required_files = ['__init__.py', 'plugin.py', 'metadata.yaml']
        for file in required_files:
            if not os.path.exists(os.path.join(plugin_dir, file)):
                raise ValueError(f"Missing required file: {file}")

    def _validate_plugin_imports(self, plugin: Plugin) -> None:
        """Validate plugin imports."""
        try:
            # Get plugin source code
            with open(plugin.__file__, 'r') as f:
                source = f.read()
            
            # Parse AST
            tree = ast.parse(source)
            
            # Check for unsafe imports
            unsafe_imports = set()
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for name in node.names:
                        if name.name in self.config.unsafe_modules:
                            unsafe_imports.add(name.name)
                elif isinstance(node, ast.ImportFrom):
                    if node.module in self.config.unsafe_modules:
                        unsafe_imports.add(node.module)
            
            if unsafe_imports:
                raise ValueError(
                    f"Plugin contains unsafe imports: {', '.join(unsafe_imports)}"
                )
                
        except Exception as e:
            self.logger.error(f"Error validating plugin imports: {e}")
            raise

    def _validate_plugin_paths(self, plugin: Plugin) -> None:
        """Validate plugin file paths."""
        try:
            plugin_dir = os.path.dirname(plugin.__file__)
            
            # Check for absolute paths
            for root, _, files in os.walk(plugin_dir):
                for file in files:
                    if file.endswith('.py'):
                        with open(os.path.join(root, file), 'r') as f:
                            content = f.read()
                            if re.search(r'/[a-zA-Z]:/', content) or re.search(r'^[a-zA-Z]:/', content):
                                raise ValueError(
                                    f"Plugin contains absolute paths in {file}"
                                )
            
            # Check for path traversal attempts
            for root, _, files in os.walk(plugin_dir):
                for file in files:
                    if file.endswith('.py'):
                        with open(os.path.join(root, file), 'r') as f:
                            content = f.read()
                            if '../' in content or '..\\' in content:
                                raise ValueError(
                                    f"Plugin contains path traversal attempts in {file}"
                                )
            
            # Check for system path modifications
            for root, _, files in os.walk(plugin_dir):
                for file in files:
                    if file.endswith('.py'):
                        with open(os.path.join(root, file), 'r') as f:
                            content = f.read()
                            if 'sys.path' in content:
                                raise ValueError(
                                    f"Plugin modifies system path in {file}"
                                )
                                
        except Exception as e:
            self.logger.error(f"Error validating plugin paths: {e}")
            raise

    def set_plugin_permissions(self, plugin_name: str, level: PluginSecurityLevel) -> None:
        """Set plugin security level."""
        self._plugin_permissions[plugin_name] = level
        self.logger.info(f"Set security level for {plugin_name}: {level}")

    def get_plugin_permissions(self, plugin_name: str) -> PluginSecurityLevel:
        """Get plugin security level."""
        return self._plugin_permissions.get(plugin_name, PluginSecurityLevel.UNTRUSTED)

    def check_plugin_permission(self, plugin_name: str, permission: Permission) -> bool:
        """Check if a plugin has a specific permission."""
        level = self.get_plugin_permissions(plugin_name)
        if level == PluginSecurityLevel.SYSTEM:
            return True
        elif level == PluginSecurityLevel.TRUSTED:
            return permission not in [Permission.SYSTEM_CALL]
        elif level == PluginSecurityLevel.RESTRICTED:
            return permission in [Permission.READ_FILE]
        return False

# Create singleton instance
plugin_security = PluginSecurity() 