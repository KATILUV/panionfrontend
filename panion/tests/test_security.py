"""
Tests for the security system.
"""

import pytest
import os
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any
from datetime import datetime, timedelta
import threading
import time
import jwt
import bcrypt
from unittest.mock import patch, MagicMock

from core.security import SecurityManager, SecurityConfig, User

@pytest.fixture
def security_config():
    """Create a test security configuration."""
    return SecurityConfig(
        jwt_secret="test_secret",
        jwt_algorithm="HS256",
        jwt_expiry=3600,
        password_hash_rounds=4,
        default_role="user",
        admin_role="admin",
        role_hierarchy={
            "admin": ["moderator"],
            "moderator": ["user"]
        },
        max_input_length=1024,
        allowed_file_types=["txt", "json"],
        max_file_size=1024 * 1024,
        max_requests_per_minute=10,
        max_failed_attempts=3,
        lockout_duration=300,
        allowed_ips=["127.0.0.1/32"],
        blocked_ips=["192.168.1.1/32"],
        require_https=True,
        audit_log_file="logs/test_audit.log",
        log_sensitive_data=False,
        retention_days=7
    )

@pytest.fixture
def security_manager(security_config):
    """Create a security manager instance."""
    manager = SecurityManager(security_config)
    yield manager
    manager.cleanup()

def test_security_initialization(security_manager, security_config):
    """Test security manager initialization."""
    assert security_manager.config == security_config
    assert len(security_manager._users) == 0
    assert len(security_manager._tokens) == 0
    assert len(security_manager._rate_limits) == 0
    assert len(security_manager._ip_blocks) == 0

def test_user_registration(security_manager):
    """Test user registration."""
    # Register user
    user = security_manager.register_user(
        username="test_user",
        email="test@example.com",
        password="password123",
        roles=["user"]
    )
    
    # Check user
    assert user.username == "test_user"
    assert user.email == "test@example.com"
    assert "user" in user.roles
    assert user.is_active
    assert user.failed_attempts == 0
    assert user.locked_until is None
    
    # Check user storage
    assert "test_user" in security_manager._users
    assert security_manager._users["test_user"] == user
    
    # Test duplicate username
    with pytest.raises(ValueError):
        security_manager.register_user(
            username="test_user",
            email="test2@example.com",
            password="password123"
        )
    
    # Test duplicate email
    with pytest.raises(ValueError):
        security_manager.register_user(
            username="test_user2",
            email="test@example.com",
            password="password123"
        )

def test_authentication(security_manager):
    """Test user authentication."""
    # Register user
    security_manager.register_user(
        username="test_user",
        email="test@example.com",
        password="password123"
    )
    
    # Test successful authentication
    token = security_manager.authenticate(
        username="test_user",
        password="password123",
        ip_address="127.0.0.1"
    )
    assert token is not None
    
    # Test invalid password
    token = security_manager.authenticate(
        username="test_user",
        password="wrong_password",
        ip_address="127.0.0.1"
    )
    assert token is None
    
    # Test non-existent user
    token = security_manager.authenticate(
        username="non_existent",
        password="password123",
        ip_address="127.0.0.1"
    )
    assert token is None

def test_token_verification(security_manager):
    """Test token verification."""
    # Register and authenticate user
    security_manager.register_user(
        username="test_user",
        email="test@example.com",
        password="password123"
    )
    token = security_manager.authenticate(
        username="test_user",
        password="password123",
        ip_address="127.0.0.1"
    )
    
    # Verify token
    user = security_manager.verify_token(token)
    assert user is not None
    assert user.username == "test_user"
    
    # Test expired token
    with patch('datetime.datetime') as mock_datetime:
        mock_datetime.now.return_value = datetime.now() + timedelta(hours=2)
        user = security_manager.verify_token(token)
        assert user is None
    
    # Test invalid token
    user = security_manager.verify_token("invalid_token")
    assert user is None

def test_authorization(security_manager):
    """Test user authorization."""
    # Register users with different roles
    admin = security_manager.register_user(
        username="admin",
        email="admin@example.com",
        password="password123",
        roles=["admin"]
    )
    moderator = security_manager.register_user(
        username="moderator",
        email="moderator@example.com",
        password="password123",
        roles=["moderator"]
    )
    user = security_manager.register_user(
        username="user",
        email="user@example.com",
        password="password123",
        roles=["user"]
    )
    
    # Test role hierarchy
    assert security_manager.authorize(admin, ["admin"])
    assert security_manager.authorize(admin, ["moderator"])
    assert security_manager.authorize(admin, ["user"])
    
    assert security_manager.authorize(moderator, ["moderator"])
    assert security_manager.authorize(moderator, ["user"])
    assert not security_manager.authorize(moderator, ["admin"])
    
    assert security_manager.authorize(user, ["user"])
    assert not security_manager.authorize(user, ["moderator"])
    assert not security_manager.authorize(user, ["admin"])

def test_input_validation(security_manager):
    """Test input validation."""
    # Define schema
    schema = {
        "username": {
            "type": str,
            "required": True,
            "min_length": 3,
            "max_length": 20,
            "pattern": r"^[a-zA-Z0-9_]+$"
        },
        "age": {
            "type": int,
            "required": False,
            "min": 0,
            "max": 150
        }
    }
    
    # Test valid input
    valid_data = {
        "username": "test_user",
        "age": 25
    }
    assert security_manager.validate_input(valid_data, schema)
    
    # Test invalid type
    invalid_type = {
        "username": 123,
        "age": "25"
    }
    assert not security_manager.validate_input(invalid_type, schema)
    
    # Test invalid length
    invalid_length = {
        "username": "ab",
        "age": 25
    }
    assert not security_manager.validate_input(invalid_length, schema)
    
    # Test invalid pattern
    invalid_pattern = {
        "username": "test-user",
        "age": 25
    }
    assert not security_manager.validate_input(invalid_pattern, schema)
    
    # Test invalid range
    invalid_range = {
        "username": "test_user",
        "age": 200
    }
    assert not security_manager.validate_input(invalid_range, schema)

def test_file_validation(security_manager):
    """Test file validation."""
    # Create test file
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
        f.write(b"test content")
        test_file = f.name
    
    # Test valid file
    assert security_manager.validate_file(test_file)
    
    # Test non-existent file
    assert not security_manager.validate_file("non_existent.txt")
    
    # Test invalid file type
    with tempfile.NamedTemporaryFile(suffix=".exe", delete=False) as f:
        f.write(b"test content")
        invalid_file = f.name
    assert not security_manager.validate_file(invalid_file)
    
    # Test file size limit
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
        f.write(b"x" * (security_manager.config.max_file_size + 1))
        large_file = f.name
    assert not security_manager.validate_file(large_file)
    
    # Cleanup
    os.unlink(test_file)
    os.unlink(invalid_file)
    os.unlink(large_file)

def test_rate_limiting(security_manager):
    """Test rate limiting."""
    ip_address = "127.0.0.1"
    
    # Test within limit
    for _ in range(security_manager.config.max_requests_per_minute):
        assert security_manager.check_rate_limit(ip_address)
    
    # Test exceeding limit
    assert not security_manager.check_rate_limit(ip_address)
    
    # Test limit reset
    with patch('datetime.datetime') as mock_datetime:
        mock_datetime.now.return_value = datetime.now() + timedelta(minutes=2)
        assert security_manager.check_rate_limit(ip_address)

def test_ip_access(security_manager):
    """Test IP access control."""
    # Test allowed IP
    assert security_manager.check_ip_access("127.0.0.1")
    
    # Test blocked IP
    assert not security_manager.check_ip_access("192.168.1.1")
    
    # Test unknown IP
    assert security_manager.check_ip_access("10.0.0.1")
    
    # Test invalid IP
    assert not security_manager.check_ip_access("invalid_ip")

def test_failed_attempts(security_manager):
    """Test failed authentication attempts."""
    ip_address = "127.0.0.1"
    
    # Test failed attempts
    for _ in range(security_manager.config.max_failed_attempts):
        security_manager._handle_failed_attempt(ip_address)
    
    # Test IP block
    assert ip_address in security_manager._ip_blocks
    block_time = security_manager._ip_blocks[ip_address]
    assert block_time > datetime.now()
    
    # Test block expiration
    with patch('datetime.datetime') as mock_datetime:
        mock_datetime.now.return_value = datetime.now() + timedelta(seconds=security_manager.config.lockout_duration + 1)
        security_manager.cleanup()
        assert ip_address not in security_manager._ip_blocks

def test_audit_logging(security_manager):
    """Test audit logging."""
    # Register user
    security_manager.register_user(
        username="test_user",
        email="test@example.com",
        password="password123"
    )
    
    # Check audit log
    log_file = Path(security_manager.config.audit_log_file)
    assert log_file.exists()
    
    with open(log_file) as f:
        log_content = f.read()
        assert "register" in log_content
        assert "test_user" in log_content
        assert "test@example.com" in log_content
        assert "password123" not in log_content

def test_cleanup(security_manager):
    """Test cleanup operations."""
    # Add test data
    ip_address = "127.0.0.1"
    security_manager._rate_limits[ip_address] = [datetime.now()]
    security_manager._ip_blocks[ip_address] = datetime.now()
    
    # Create old audit log
    log_file = Path(security_manager.config.audit_log_file)
    log_file.parent.mkdir(exist_ok=True)
    with open(log_file, "w") as f:
        f.write("2020-01-01 00:00:00,000 - INFO - test - action - details\n")
    
    # Run cleanup
    security_manager.cleanup()
    
    # Check cleanup
    assert ip_address not in security_manager._rate_limits
    assert ip_address not in security_manager._ip_blocks
    assert not log_file.exists()

def test_concurrent_operations(security_manager):
    """Test concurrent operations."""
    # Create multiple threads
    threads = []
    results = []
    
    def register_user():
        try:
            user = security_manager.register_user(
                username=f"user_{threading.get_ident()}",
                email=f"user_{threading.get_ident()}@example.com",
                password="password123"
            )
            results.append(user)
        except Exception as e:
            results.append(e)
    
    # Start threads
    for _ in range(3):
        thread = threading.Thread(target=register_user)
        threads.append(thread)
        thread.start()
    
    # Wait for threads
    for thread in threads:
        thread.join()
    
    # Check results
    assert len(results) == 3
    assert all(isinstance(r, User) for r in results)
    assert len(security_manager._users) == 3 