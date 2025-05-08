"""
Error Handler
Manages error handling and recovery.
"""

import logging
import asyncio
import shutil
import functools
from typing import Dict, Any, List, Optional, Callable, Awaitable
from datetime import datetime, timedelta
from pathlib import Path
import json
import traceback
from injector import inject, singleton

from .error_types import ErrorSeverity, ErrorContext, PluginError, PluginErrorType
from core.base import BaseComponent, ComponentMetadata, ComponentState

@singleton
class ErrorHandler(BaseComponent):
    """Manages error handling and recovery."""
    
    @inject
    def __init__(self):
        """Initialize the error handler."""
        metadata = ComponentMetadata(
            name="ErrorHandler",
            version="1.0.0",
            description="Error handling and recovery system",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            dependencies={},
            config_schema={}
        )
        super().__init__(metadata)
        
        self.logger = logging.getLogger(__name__)
        self.error_counts: Dict[str, int] = {}
        self.error_history: List[Dict[str, Any]] = []
        self.recovery_strategies: Dict[str, Callable[[Exception, ErrorContext], Awaitable[None]]] = {}
        self.error_rates: Dict[str, float] = {}
        self.alert_thresholds: Dict[str, float] = {}
        self._history_limit = 1000
        self._rate_window = timedelta(minutes=5)
        self.max_history = 100
        self.max_errors = 1000  # Maximum number of errors to store
        
        # Initialize default recovery strategies
        self._init_default_strategies()
        
    def _init_default_strategies(self) -> None:
        """Initialize default error recovery strategies."""
        self.recovery_strategies.update({
            'IOError': self._handle_file_error,
            'OSError': self._handle_file_error,
            'PluginError': self._handle_plugin_error,
            'GoalError': self._handle_goal_error,
            'TimeoutError': self._handle_timeout_error,
            'ConnectionError': self._handle_connection_error
        })
        
        # Set default alert thresholds
        self.alert_thresholds.update({
            'IOError': 0.1,  # 10% error rate
            'OSError': 0.1,
            'PluginError': 0.2,  # 20% error rate
            'GoalError': 0.15,  # 15% error rate
            'TimeoutError': 0.3,  # 30% error rate
            'ConnectionError': 0.25  # 25% error rate
        })
    
    async def initialize(self) -> None:
        """Initialize the error handler."""
        self.logger.info("Initializing error handler")
        self._state = ComponentState.INITIALIZING
        try:
            self._state = ComponentState.ACTIVE
        except Exception as e:
            # During initialization, just log the error
            self.logger.error(f"Error during error handler initialization: {e}")
            raise
    
    async def start(self) -> None:
        """Start the error handler."""
        self.logger.info("Starting error handler")
        self._start_time = datetime.now()
        self._state = ComponentState.ACTIVE
    
    async def stop(self) -> None:
        """Stop the error handler."""
        self.logger.info("Stopping error handler")
        self._state = ComponentState.STOPPING
        self._state = ComponentState.STOPPED
    
    async def pause(self) -> None:
        """Pause the error handler."""
        self.logger.info("Pausing error handler")
        self._state = ComponentState.PAUSED
    
    async def resume(self) -> None:
        """Resume the error handler."""
        self.logger.info("Resuming error handler")
        self._state = ComponentState.ACTIVE
    
    async def update(self) -> None:
        """Update the error handler state."""
        if self._state == ComponentState.ACTIVE:
            try:
                # Clean up old errors if needed
                if len(self.error_history) > self.max_errors:
                    self.error_history = self.error_history[-self.max_errors:]
            except Exception as e:
                # During update, use handle_error
                await self.handle_error(e, {"context": "error_handler_update"})
    
    async def handle_error(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> None:
        """Handle an error.
        
        Args:
            error: The error to handle
            context: Optional context information
        """
        try:
            # Create error record
            error_record = {
                'timestamp': datetime.now(),
                'type': type(error).__name__,
                'message': str(error),
                'traceback': traceback.format_exc(),
                'context': context or {}
            }
            
            # Add to error list
            self.error_history.append(error_record)
            
            # Log error
            self.logger.error(
                f"Error: {error_record['type']} - {error_record['message']}\n"
                f"Context: {error_record['context']}\n"
                f"Traceback: {error_record['traceback']}"
            )
            
            # Try recovery if handler exists
            error_type = error_record['type']
            if error_type in self.recovery_strategies:
                try:
                    self.logger.info(f"Attempting recovery for error type: {error_type}")
                    # Note: Recovery is asynchronous but we don't await it here
                    # to avoid blocking the error handling process
                    asyncio.create_task(self._attempt_recovery(error, error_type))
                except Exception as recovery_error:
                    self.logger.error(f"Error during recovery attempt: {recovery_error}")
            
        except Exception as e:
            self.logger.error(f"Error in error handler: {e}")
    
    def _update_error_rates(self) -> None:
        """Update error rates based on recent history."""
        now = datetime.now()
        window_start = now - self._rate_window
        
        # Count errors in window
        error_counts = {}
        for entry in self.error_history:
            if entry['timestamp'] >= window_start:
                error_type = entry['type']
                error_counts[error_type] = error_counts.get(error_type, 0) + 1
        
        # Calculate rates
        total_errors = sum(error_counts.values())
        if total_errors > 0:
            for error_type, count in error_counts.items():
                self.error_rates[error_type] = count / total_errors
    
    def check_error_rates(self) -> List[Dict[str, Any]]:
        """Check error rates against thresholds."""
        alerts = []
        for error_type, rate in self.error_rates.items():
            threshold = self.alert_thresholds.get(error_type, 0.1)
            if rate > threshold:
                alerts.append({
                    'type': error_type,
                    'rate': rate,
                    'threshold': threshold,
                    'timestamp': datetime.now()
                })
        return alerts
    
    def _handle_alerts(self, alerts: List[Dict[str, Any]]) -> None:
        """Handle error rate alerts."""
        for alert in alerts:
            self.logger.warning(
                f"Error rate alert: {alert['type']} rate {alert['rate']:.2%} "
                f"exceeds threshold {alert['threshold']:.2%}"
            )
    
    async def _handle_file_error(self, error: Exception, context: ErrorContext) -> None:
        """Handle file operation errors."""
        if context.retry_count < 3:  # Max 3 retries
            # Exponential backoff
            await asyncio.sleep(2 ** context.retry_count)
            context.retry_count += 1
            
            # Restore from backup if available
            if hasattr(context, 'backup_path') and hasattr(context, 'file_path'):
                try:
                    shutil.copy2(context.backup_path, context.file_path)
                except Exception as e:
                    self.logger.error(f"Error restoring from backup: {str(e)}")
    
    async def _handle_plugin_error(self, error: Exception, context: ErrorContext) -> None:
        """Handle plugin execution errors."""
        if hasattr(context, 'plugin'):
            try:
                # Reset plugin state
                await context.plugin.reset()
                
                # Update circuit breaker if available
                if hasattr(context, 'circuit_breaker'):
                    context.circuit_breaker.record_failure()
            except Exception as e:
                self.logger.error(f"Error during plugin recovery: {str(e)}")
    
    async def _handle_goal_error(self, error: Exception, context: ErrorContext) -> None:
        """Handle goal execution errors."""
        if hasattr(context, 'goal'):
            try:
                # Save goal state
                await context.goal.save_state()
                
                # Notify dependent goals
                if hasattr(context, 'dependent_goals'):
                    for dependent in context.dependent_goals:
                        await dependent.handle_dependency_failure(context.goal)
            except Exception as e:
                self.logger.error(f"Error during goal recovery: {str(e)}")
    
    async def _handle_timeout_error(self, error: Exception, context: ErrorContext) -> None:
        """Handle timeout errors."""
        if hasattr(context, 'operation') and context.retry_count < 2:
            # Increase timeout and retry
            if hasattr(context, 'timeout'):
                context.timeout *= 2
            context.retry_count += 1
            await asyncio.sleep(1)  # Brief pause before retry
    
    async def _handle_connection_error(self, error: Exception, context: ErrorContext) -> None:
        """Handle connection errors."""
        if context.retry_count < 3:
            # Exponential backoff
            context.retry_count += 1
            
            # Attempt reconnection if available
            if hasattr(context, 'reconnect'):
                try:
                    await context.reconnect()
                except Exception as e:
                    self.logger.error(f"Error during reconnection: {str(e)}")

    async def get_error_history(self, plugin_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get error history for a plugin."""
        if plugin_id:
            return [e for e in self.error_history if e["plugin_id"] == plugin_id]
        return self.error_history.copy()
    
    async def clear_error_history(self, plugin_id: Optional[str] = None) -> None:
        """Clear error history for a plugin."""
        if plugin_id:
            self.error_history = [e for e in self.error_history if e["plugin_id"] != plugin_id]
        else:
            self.error_history.clear()
    
    async def get_error_count(self, plugin_id: Optional[str] = None) -> int:
        """Get error count for a plugin."""
        if plugin_id:
            return len([e for e in self.error_history if e["plugin_id"] == plugin_id])
        return len(self.error_history)
    
    async def get_error_types(self, plugin_id: Optional[str] = None) -> Dict[str, int]:
        """Get error type counts for a plugin."""
        error_types = {}
        for error in self.error_history:
            if plugin_id and error["plugin_id"] != plugin_id:
                continue
            
            error_type = error["error_type"]
            error_types[error_type] = error_types.get(error_type, 0) + 1
        
        return error_types
    
    async def get_recent_errors(self, count: int = 10, plugin_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get recent errors for a plugin."""
        errors = self.error_history
        if plugin_id:
            errors = [e for e in errors if e["plugin_id"] == plugin_id]
        
        return errors[-count:]
    
    async def get_error_details(self, error_id: int) -> Optional[Dict[str, Any]]:
        """Get details for a specific error."""
        try:
            return self.error_history[error_id]
        except IndexError:
            return None
    
    async def is_error_frequent(self, plugin_id: str, error_type: PluginErrorType, threshold: int = 5) -> bool:
        """Check if an error type is frequent for a plugin."""
        error_count = len([
            e for e in self.error_history
            if e["plugin_id"] == plugin_id and e["error_type"] == error_type
        ])
        
        return error_count >= threshold

    async def _attempt_recovery(self, error: Exception, error_type: str) -> None:
        """Attempt to recover from an error.
        
        Args:
            error: The error to recover from
            error_type: The type of error
        """
        try:
            handler = self.recovery_strategies[error_type]
            success = await handler(error, ErrorContext(
                function=handler.__name__,
                args=(),
                kwargs={},
                recovery_strategy=error_type
            ))
            
            if success:
                self.logger.info(f"Successfully recovered from error type: {error_type}")
            else:
                self.logger.warning(f"Recovery failed for error type: {error_type}")
                
        except Exception as e:
            self.logger.error(f"Error during recovery: {e}")
    
    def register_recovery_handler(
        self,
        error_type: str,
        handler: Callable[[Exception], Awaitable[bool]]
    ) -> None:
        """Register a recovery handler for an error type.
        
        Args:
            error_type: The type of error to handle
            handler: The recovery handler function
        """
        self.recovery_strategies[error_type] = handler
        self.logger.info(f"Registered recovery handler for error type: {error_type}")
    
    def unregister_recovery_handler(self, error_type: str) -> None:
        """Unregister a recovery handler.
        
        Args:
            error_type: The type of error
        """
        if error_type in self.recovery_strategies:
            del self.recovery_strategies[error_type]
            self.logger.info(f"Unregistered recovery handler for error type: {error_type}")
    
    def get_errors(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get recent errors.
        
        Args:
            limit: Optional limit on number of errors to return
            
        Returns:
            List[Dict[str, Any]]: List of error records
        """
        if limit is not None:
            return self.error_history[-limit:]
        return self.error_history.copy()
    
    def clear_errors(self) -> None:
        """Clear all error records."""
        self.error_history.clear()
        self.logger.info("Cleared all error records")
    
    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the error handler."""
        return {
            'state': self._state.value,
            'error_count': len(self.error_history),
            'recovery_handler_count': len(self.recovery_strategies),
            'error_info': self.get_error_info(),
            'uptime': self.uptime
        }

def with_error_recovery(recovery_strategy: Optional[str] = None):
    """Decorator for error recovery."""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                # Get instance of error handler via dependency injection
                from injector import Injector
                error_handler = Injector().get(ErrorHandler)
                
                # Create error context
                context = ErrorContext(
                    function=func.__name__,
                    args=args,
                    kwargs=kwargs,
                    recovery_strategy=recovery_strategy
                )
                
                # Handle error
                await error_handler.handle_error(e, context)
                raise  # Re-raise the error after handling
        return wrapper
    return decorator 