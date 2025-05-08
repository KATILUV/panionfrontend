"""
Audit Logging System
Handles security event logging and audit trail management.
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from pathlib import Path
from enum import Enum

class AuditEventType(Enum):
    """Types of audit events."""
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    USER_CREATED = "user_created"
    USER_MODIFIED = "user_modified"
    USER_DELETED = "user_deleted"
    ROLE_CREATED = "role_created"
    ROLE_MODIFIED = "role_modified"
    ROLE_DELETED = "role_deleted"
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_REVOKED = "permission_revoked"
    AUTH_FAILED = "auth_failed"
    TOKEN_CREATED = "token_created"
    TOKEN_VALIDATED = "token_validated"
    TOKEN_EXPIRED = "token_expired"
    TOKEN_REVOKED = "token_revoked"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    SECURITY_VIOLATION = "security_violation"
    CONFIG_CHANGED = "config_changed"
    SYSTEM_ERROR = "system_error"

@dataclass
class AuditEvent:
    """A single audit event."""
    event_type: AuditEventType
    timestamp: datetime
    username: str
    source_ip: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    success: bool = True
    severity: str = "info"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary."""
        return {
            "event_type": self.event_type.value,
            "timestamp": self.timestamp.isoformat(),
            "username": self.username,
            "source_ip": self.source_ip,
            "details": self.details,
            "success": self.success,
            "severity": self.severity
        }

class AuditLogger:
    """Handles audit logging and analysis."""
    
    def __init__(self, log_dir: Path):
        """Initialize audit logger.
        
        Args:
            log_dir: Directory to store audit logs
        """
        self.log_dir = log_dir
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.logger = logging.getLogger(__name__)
        self.current_log_file = None
        self.current_log_date = None
        self._setup_log_file()
    
    def _setup_log_file(self) -> None:
        """Set up current log file."""
        current_date = datetime.now().date()
        if self.current_log_date != current_date:
            self.current_log_date = current_date
            self.current_log_file = self.log_dir / f"audit_{current_date.isoformat()}.jsonl"
    
    def log_event(
        self,
        event_type: AuditEventType,
        username: str,
        source_ip: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        success: bool = True,
        severity: str = "info"
    ) -> None:
        """Log an audit event.
        
        Args:
            event_type: Type of event
            username: Username associated with event
            source_ip: Source IP address
            details: Additional event details
            success: Whether the event was successful
            severity: Event severity level
        """
        try:
            self._setup_log_file()
            
            event = AuditEvent(
                event_type=event_type,
                timestamp=datetime.now(),
                username=username,
                source_ip=source_ip,
                details=details or {},
                success=success,
                severity=severity
            )
            
            with open(self.current_log_file, "a") as f:
                json.dump(event.to_dict(), f)
                f.write("\n")
            
            # Also log to standard logging
            log_message = f"[AUDIT] {event_type.value}: {username}"
            if source_ip:
                log_message += f" from {source_ip}"
            if details:
                log_message += f" - {json.dumps(details)}"
            
            if severity == "error":
                self.logger.error(log_message)
            elif severity == "warning":
                self.logger.warning(log_message)
            else:
                self.logger.info(log_message)
                
        except Exception as e:
            self.logger.error(f"Failed to log audit event: {str(e)}")
    
    def get_events(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_types: Optional[List[AuditEventType]] = None,
        username: Optional[str] = None,
        source_ip: Optional[str] = None,
        success: Optional[bool] = None,
        severity: Optional[str] = None
    ) -> List[AuditEvent]:
        """Get filtered audit events.
        
        Args:
            start_date: Filter by start date
            end_date: Filter by end date
            event_types: Filter by event types
            username: Filter by username
            source_ip: Filter by source IP
            success: Filter by success status
            severity: Filter by severity level
            
        Returns:
            List[AuditEvent]: Filtered audit events
        """
        events = []
        log_files = sorted(self.log_dir.glob("audit_*.jsonl"))
        
        for log_file in log_files:
            try:
                with open(log_file) as f:
                    for line in f:
                        try:
                            data = json.loads(line)
                            event = AuditEvent(
                                event_type=AuditEventType(data["event_type"]),
                                timestamp=datetime.fromisoformat(data["timestamp"]),
                                username=data["username"],
                                source_ip=data["source_ip"],
                                details=data["details"],
                                success=data["success"],
                                severity=data["severity"]
                            )
                            
                            # Apply filters
                            if start_date and event.timestamp < start_date:
                                continue
                            if end_date and event.timestamp > end_date:
                                continue
                            if event_types and event.event_type not in event_types:
                                continue
                            if username and event.username != username:
                                continue
                            if source_ip and event.source_ip != source_ip:
                                continue
                            if success is not None and event.success != success:
                                continue
                            if severity and event.severity != severity:
                                continue
                            
                            events.append(event)
                            
                        except (json.JSONDecodeError, ValueError) as e:
                            self.logger.warning(f"Failed to parse audit event: {str(e)}")
                            
            except Exception as e:
                self.logger.error(f"Failed to read audit log file {log_file}: {str(e)}")
        
        return sorted(events, key=lambda e: e.timestamp)
    
    def generate_summary(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Generate audit log summary.
        
        Args:
            start_date: Start date for summary
            end_date: End date for summary
            
        Returns:
            Dict[str, Any]: Summary statistics
        """
        events = self.get_events(start_date=start_date, end_date=end_date)
        
        return {
            "total_events": len(events),
            "event_types": {
                event_type.value: len([
                    e for e in events
                    if e.event_type == event_type
                ])
                for event_type in AuditEventType
            },
            "users": {
                username: len([
                    e for e in events
                    if e.username == username
                ])
                for username in {e.username for e in events}
            },
            "severities": {
                severity: len([
                    e for e in events
                    if e.severity == severity
                ])
                for severity in {"info", "warning", "error", "critical"}
            },
            "success_rate": sum(1 for e in events if e.success) / len(events)
            if events else 0,
            "time_range": {
                "start": min((e.timestamp for e in events), default=datetime.now()).isoformat(),
                "end": max((e.timestamp for e in events), default=datetime.now()).isoformat()
            }
        }

# Create global audit logger instance
audit_logger = AuditLogger(Path("logs/audit")) 