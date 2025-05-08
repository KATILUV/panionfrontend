"""
Plugin Security Utilities
Provides security-related utilities for plugin management.
"""

import ast
import logging
import sys
import os
import psutil
import threading
import time
from typing import Dict, Any, Optional, List, Set
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

class CodeSecurityError(Exception):
    """Error raised when code fails security checks."""
    pass

class ResourceAccessError(Exception):
    """Error raised when resource access is denied."""
    pass

class PermissionError(Exception):
    """Error raised when permission is denied."""
    pass

@dataclass
class SecurityContext:
    """Security context for plugin execution."""
    plugin_id: str
    allowed_imports: Set[str]
    allowed_resources: Set[str]
    permissions: Set[str]
    resource_limits: Dict[str, float]
    start_time: datetime = None
    monitored: bool = False

class SecurityMonitor:
    """Monitors runtime security and resource usage."""
    
    def __init__(self):
        self._contexts: Dict[str, SecurityContext] = {}
        self._monitoring = False
        self._monitor_thread = None
        self._lock = threading.Lock()
        
    def start_monitoring(self):
        """Start the security monitoring thread."""
        if not self._monitoring:
            self._monitoring = True
            self._monitor_thread = threading.Thread(target=self._monitor_loop)
            self._monitor_thread.daemon = True
            self._monitor_thread.start()
            
    def stop_monitoring(self):
        """Stop the security monitoring thread."""
        self._monitoring = False
        if self._monitor_thread:
            self._monitor_thread.join()
            
    def _monitor_loop(self):
        """Main monitoring loop."""
        while self._monitoring:
            try:
                with self._lock:
                    for plugin_id, context in self._contexts.items():
                        if context.monitored:
                            self._check_resource_usage(plugin_id, context)
                time.sleep(1)  # Check every second
            except Exception as e:
                logger.error(f"Error in security monitor: {e}")
                
    def _check_resource_usage(self, plugin_id: str, context: SecurityContext):
        """Check resource usage against limits."""
        try:
            process = psutil.Process()
            
            # Check CPU usage
            cpu_percent = process.cpu_percent()
            if cpu_percent > context.resource_limits.get('cpu', 100):
                self.terminate_plugin(plugin_id, f"CPU usage exceeded: {cpu_percent}%")
                
            # Check memory usage
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / (1024 * 1024)
            if memory_mb > context.resource_limits.get('memory', 1024):
                self.terminate_plugin(plugin_id, f"Memory usage exceeded: {memory_mb}MB")
                
            # Check execution time
            if context.start_time:
                duration = datetime.now() - context.start_time
                if duration > timedelta(seconds=context.resource_limits.get('time', 3600)):
                    self.terminate_plugin(plugin_id, f"Execution time exceeded: {duration}")
                    
        except Exception as e:
            logger.error(f"Error checking resource usage for plugin {plugin_id}: {e}")
            
    def terminate_plugin(self, plugin_id: str, reason: str):
        """Terminate a plugin for security violations."""
        logger.warning(f"Terminating plugin {plugin_id}: {reason}")
        with self._lock:
            if plugin_id in self._contexts:
                context = self._contexts[plugin_id]
                context.monitored = False
                # Additional cleanup can be added here
                
    def register_context(self, context: SecurityContext):
        """Register a security context for monitoring."""
        with self._lock:
            self._contexts[context.plugin_id] = context
            
    def unregister_context(self, plugin_id: str):
        """Unregister a security context."""
        with self._lock:
            self._contexts.pop(plugin_id, None)

# Global security monitor instance
security_monitor = SecurityMonitor()
security_monitor.start_monitoring()

def validate_code(code: str, context: SecurityContext) -> None:
    """Validate code for security concerns.
    
    Args:
        code: Code string to validate
        context: Security context for validation
        
    Raises:
        CodeSecurityError: If code fails security checks
    """
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        raise CodeSecurityError(f"Invalid syntax: {e}")
        
    for node in ast.walk(tree):
        # Check for dangerous imports
        if isinstance(node, ast.Import):
            for name in node.names:
                if name.name not in context.allowed_imports:
                    raise CodeSecurityError(f"Import of {name.name} not allowed")
                    
        elif isinstance(node, ast.ImportFrom):
            if node.module not in context.allowed_imports:
                raise CodeSecurityError(f"Import from {node.module} not allowed")
                
        # Check for dangerous builtins
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id in ['eval', 'exec', 'compile', '__import__']:
                    raise CodeSecurityError(f"Use of {node.func.id}() not allowed")
                    
        # Check for file operations
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            if node.func.attr in ['open', 'write', 'delete']:
                # Verify file access permission
                if 'file_access' not in context.permissions:
                    raise ResourceAccessError("File operations not allowed")
                    
        # Check for network operations
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id in ['socket', 'urllib', 'requests']:
                if 'network_access' not in context.permissions:
                    raise ResourceAccessError("Network operations not allowed")

def create_safe_globals(context: SecurityContext) -> Dict[str, Any]:
    """Create a safe globals dictionary for code execution.
    
    Args:
        context: Security context for execution
        
    Returns:
        Dict[str, Any]: Safe globals dictionary
    """
    safe_globals = {
        '__builtins__': {
            'print': print,
            'len': len,
            'str': str,
            'int': int,
            'float': float,
            'bool': bool,
            'list': list,
            'dict': dict,
            'set': set,
            'tuple': tuple,
            'range': range,
            'enumerate': enumerate,
            'zip': zip,
            'min': min,
            'max': max,
            'sum': sum,
            'abs': abs,
            'round': round,
            'pow': pow,
            'Exception': Exception,
            'TypeError': TypeError,
            'ValueError': ValueError,
            'AttributeError': AttributeError,
            'IndexError': IndexError,
            'KeyError': KeyError,
            'RuntimeError': RuntimeError,
        }
    }
    
    # Add allowed imports
    for module_name in context.allowed_imports:
        try:
            module = __import__(module_name)
            safe_globals[module_name] = module
        except ImportError as e:
            logger.warning(f"Could not import {module_name}: {e}")
            
    return safe_globals

def create_sandbox(plugin_id: str, permissions: Set[str] = None) -> SecurityContext:
    """Create a sandboxed security context for plugin execution.
    
    Args:
        plugin_id: Unique identifier for the plugin
        permissions: Set of allowed permissions
        
    Returns:
        SecurityContext: Configured security context
    """
    context = SecurityContext(
        plugin_id=plugin_id,
        allowed_imports={'sys', 'os', 'logging', 'json', 'yaml'},
        allowed_resources={'cpu', 'memory', 'disk'},
        permissions=permissions or set(),
        resource_limits={
            'cpu': 80.0,  # 80% CPU limit
            'memory': 512.0,  # 512MB memory limit
            'time': 3600,  # 1 hour time limit
            'disk': 1024.0  # 1GB disk limit
        }
    )
    
    # Register context with security monitor
    security_monitor.register_context(context)
    
    return context

def safe_exec(code: str, context: SecurityContext, globals_dict: Optional[Dict[str, Any]] = None) -> None:
    """Safely execute code with security checks.
    
    Args:
        code: Code string to execute
        context: Security context for execution
        globals_dict: Optional globals dictionary
        
    Raises:
        CodeSecurityError: If code fails security checks
    """
    try:
        # Validate code
        validate_code(code, context)
        
        # Create safe globals
        safe_globals = create_safe_globals(context)
        if globals_dict:
            safe_globals.update(globals_dict)
            
        # Start monitoring
        context.start_time = datetime.now()
        context.monitored = True
        
        # Execute code
        exec(code, safe_globals)
        
    except Exception as e:
        logger.error(f"Error executing code: {e}")
        raise CodeSecurityError(f"Code execution failed: {e}")
    finally:
        # Stop monitoring
        context.monitored = False

def safe_eval(expression: str, context: SecurityContext, globals_dict: Optional[Dict[str, Any]] = None) -> Any:
    """Safely evaluate an expression after validation.
    
    Args:
        expression: The expression to evaluate
        context: Security context for evaluation
        globals_dict: Optional globals dictionary
        
    Returns:
        The result of the evaluation
        
    Raises:
        CodeSecurityError: If expression validation fails
    """
    try:
        # Validate expression
        validate_code(expression, context)
        
        # Create safe globals
        safe_globals = create_safe_globals(context)
        if globals_dict:
            safe_globals.update(globals_dict)
            
        # Start monitoring
        context.start_time = datetime.now()
        context.monitored = True
        
        # Evaluate expression
        result = eval(expression, safe_globals)
        
        return result
        
    except Exception as e:
        logger.error(f"Error during safe expression evaluation: {e}")
        raise CodeSecurityError(f"Evaluation error: {str(e)}")
    finally:
        # Stop monitoring
        context.monitored = False

def cleanup_sandbox(context: SecurityContext):
    """Clean up sandbox resources.
    
    Args:
        context: Security context to clean up
    """
    try:
        # Unregister from security monitor
        security_monitor.unregister_context(context.plugin_id)
        
        # Clean up any temporary files
        if 'file_access' in context.permissions:
            temp_dir = Path(f'data/temp/{context.plugin_id}')
            if temp_dir.exists():
                for file in temp_dir.glob('*'):
                    try:
                        file.unlink()
                    except Exception as e:
                        logger.warning(f"Error removing temp file {file}: {e}")
                temp_dir.rmdir()
                
    except Exception as e:
        logger.error(f"Error cleaning up sandbox: {e}") 