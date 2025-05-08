"""
Tests for the audit logging system.
"""

import pytest
from datetime import datetime, timedelta
from pathlib import Path
import json
from core.security.audit import AuditLogger, AuditEventType, AuditEvent

@pytest.fixture
def audit_logger(tmp_path):
    """Test audit logger instance."""
    return AuditLogger(tmp_path / "audit")

@pytest.fixture
def test_event_data():
    """Test event data."""
    return {
        "event_type": AuditEventType.USER_LOGIN,
        "username": "testuser",
        "source_ip": "127.0.0.1",
        "details": {"browser": "Chrome", "os": "Linux"},
        "success": True,
        "severity": "info"
    }

def test_log_event(audit_logger, test_event_data):
    """Test logging a single event."""
    audit_logger.log_event(**test_event_data)
    
    events = audit_logger.get_events()
    assert len(events) == 1
    
    event = events[0]
    assert event.event_type == test_event_data["event_type"]
    assert event.username == test_event_data["username"]
    assert event.source_ip == test_event_data["source_ip"]
    assert event.details == test_event_data["details"]
    assert event.success == test_event_data["success"]
    assert event.severity == test_event_data["severity"]

def test_log_multiple_events(audit_logger):
    """Test logging multiple events."""
    event_types = [
        AuditEventType.USER_LOGIN,
        AuditEventType.USER_LOGOUT,
        AuditEventType.AUTH_FAILED
    ]
    
    for event_type in event_types:
        audit_logger.log_event(
            event_type=event_type,
            username="testuser",
            source_ip="127.0.0.1"
        )
    
    events = audit_logger.get_events()
    assert len(events) == len(event_types)
    assert [e.event_type for e in events] == event_types

def test_get_events_filtering(audit_logger):
    """Test event filtering."""
    # Create events with different attributes
    audit_logger.log_event(
        event_type=AuditEventType.USER_LOGIN,
        username="user1",
        source_ip="127.0.0.1",
        success=True
    )
    audit_logger.log_event(
        event_type=AuditEventType.AUTH_FAILED,
        username="user2",
        source_ip="192.168.1.1",
        success=False,
        severity="warning"
    )
    audit_logger.log_event(
        event_type=AuditEventType.SECURITY_VIOLATION,
        username="user1",
        source_ip="10.0.0.1",
        success=False,
        severity="error"
    )
    
    # Test filtering by username
    events = audit_logger.get_events(username="user1")
    assert len(events) == 2
    assert all(e.username == "user1" for e in events)
    
    # Test filtering by event type
    events = audit_logger.get_events(
        event_types=[AuditEventType.AUTH_FAILED]
    )
    assert len(events) == 1
    assert events[0].event_type == AuditEventType.AUTH_FAILED
    
    # Test filtering by success
    events = audit_logger.get_events(success=False)
    assert len(events) == 2
    assert all(not e.success for e in events)
    
    # Test filtering by severity
    events = audit_logger.get_events(severity="error")
    assert len(events) == 1
    assert events[0].severity == "error"

def test_get_events_date_filtering(audit_logger):
    """Test event filtering by date."""
    now = datetime.now()
    
    # Create events with different timestamps
    audit_logger.log_event(
        event_type=AuditEventType.USER_LOGIN,
        username="user1",
        timestamp=now - timedelta(days=2)
    )
    audit_logger.log_event(
        event_type=AuditEventType.USER_LOGOUT,
        username="user1",
        timestamp=now - timedelta(days=1)
    )
    audit_logger.log_event(
        event_type=AuditEventType.USER_LOGIN,
        username="user1",
        timestamp=now
    )
    
    # Test filtering by start date
    events = audit_logger.get_events(
        start_date=now - timedelta(days=1)
    )
    assert len(events) == 2
    
    # Test filtering by end date
    events = audit_logger.get_events(
        end_date=now - timedelta(days=1)
    )
    assert len(events) == 2
    
    # Test filtering by date range
    events = audit_logger.get_events(
        start_date=now - timedelta(days=2),
        end_date=now - timedelta(days=1)
    )
    assert len(events) == 2

def test_generate_summary(audit_logger):
    """Test summary generation."""
    # Create various events
    audit_logger.log_event(
        event_type=AuditEventType.USER_LOGIN,
        username="user1",
        success=True
    )
    audit_logger.log_event(
        event_type=AuditEventType.AUTH_FAILED,
        username="user2",
        success=False,
        severity="warning"
    )
    audit_logger.log_event(
        event_type=AuditEventType.SECURITY_VIOLATION,
        username="user1",
        success=False,
        severity="error"
    )
    
    summary = audit_logger.generate_summary()
    
    assert summary["total_events"] == 3
    assert summary["event_types"][AuditEventType.USER_LOGIN.value] == 1
    assert summary["event_types"][AuditEventType.AUTH_FAILED.value] == 1
    assert summary["users"]["user1"] == 2
    assert summary["users"]["user2"] == 1
    assert summary["severities"]["error"] == 1
    assert summary["severities"]["warning"] == 1
    assert summary["success_rate"] == 1/3

def test_event_persistence(audit_logger, test_event_data, tmp_path):
    """Test event persistence across logger instances."""
    # Log event with first logger
    audit_logger.log_event(**test_event_data)
    
    # Create new logger instance with same directory
    new_logger = AuditLogger(tmp_path / "audit")
    events = new_logger.get_events()
    
    assert len(events) == 1
    event = events[0]
    assert event.event_type == test_event_data["event_type"]
    assert event.username == test_event_data["username"]

def test_invalid_event_handling(audit_logger):
    """Test handling of invalid events."""
    # Test with missing required fields
    with pytest.raises(TypeError):
        audit_logger.log_event(
            username="testuser"  # Missing event_type
        )
    
    # Test with invalid event type
    with pytest.raises(ValueError):
        audit_logger.log_event(
            event_type="INVALID_TYPE",
            username="testuser"
        )
    
    # Test with invalid severity
    audit_logger.log_event(
        event_type=AuditEventType.USER_LOGIN,
        username="testuser",
        severity="invalid_severity"  # Should accept but log warning
    )
    
    events = audit_logger.get_events()
    assert len(events) == 1  # Only the last event should be logged 